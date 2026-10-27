"""
Instalación:
    python -m pip install pandas

Uso con el CSV en la misma carpeta:
    python 1_preprocesamiento_mapa.py

Uso con una ruta específica:
    python 1_preprocesamiento_mapa.py ruta/2023_01_producao_Terra.csv
"""

import argparse
import json
from pathlib import Path

import pandas as pd


BASE = Path(__file__).resolve().parent
RAIZ = BASE.parent  # raíz del proyecto


def _num(series: pd.Series) -> pd.Series:
    """Convierte una columna numérica del CSV (coma decimal, punto como
    separador de miles) a float y rellena los nulos con 0."""
    return (
        pd.to_numeric(
            series.astype("string").str.replace(",", ".", regex=False),
            errors="coerce",
        )
        .fillna(0)
        .astype(float)
    )


def main():
    parser = argparse.ArgumentParser(
        description="Agrupa producción de óleo y pozos únicos por Estado."
    )
    parser.add_argument(
        "csv",
        nargs="?",
        type=Path,
        default=BASE / "2023_01_producao_Terra.csv",
    )
    args = parser.parse_args()

    datos = pd.read_csv(
        args.csv,
        sep=";",
        decimal=",",
        thousands=".",
        encoding="utf-8-sig",
        on_bad_lines="skip",
        low_memory=False,
    )

    requeridas = {
        "Estado",
        "Bacia",
        "Nome Poço",
        "Campo",
        "Operador",
        "Óleo (bbl/dia)",
        "Gás Natural (Mm³/dia)",
        "Água (bbl/dia)",
    }
    faltantes = requeridas.difference(datos.columns)

    if faltantes:
        raise ValueError(
            f"Faltan columnas requeridas: {', '.join(sorted(faltantes))}"
        )

    # Los subencabezados del archivo no tienen Estado.
    datos = datos.dropna(subset=["Estado"]).copy()
    datos["Estado"] = datos["Estado"].str.strip()
    datos = datos.loc[datos["Estado"].ne(""),].copy()

    datos["Óleo (bbl/dia)"] = _num(datos["Óleo (bbl/dia)"])
    datos["Gás Natural (Mm³/dia)"] = _num(datos["Gás Natural (Mm³/dia)"])
    datos["Água (bbl/dia)"] = _num(datos["Água (bbl/dia)"])

    # ------------------------------------------------------------------
    # map_data.json — resumen por Estado. Un objeto por Estado con Óleo,
    # Gás, Agua, Pozos únicos, cuencas y campos únicos. Se conservan las
    # claves antiguas ("Estado", "Óleo (bbl/dia)", "Pozos") para no romper
    # el código existente.
    # ------------------------------------------------------------------
    por_estado = (
        datos.groupby("Estado", as_index=False)
        .agg(
            **{
                "Óleo (bbl/dia)": ("Óleo (bbl/dia)", "sum"),
                "Gás Natural (Mm³/dia)": ("Gás Natural (Mm³/dia)", "sum"),
                "Água (bbl/dia)": ("Água (bbl/dia)", "sum"),
                "Pozos": ("Nome Poço", "nunique"),
            }
        )
    )

    map_data = []
    for _, fila in por_estado.iterrows():
        nombre = str(fila["Estado"]).strip()
        dentro = datos.loc[datos["Estado"] == nombre]
        map_data.append(
            {
                "Estado": nombre,
                "Óleo (bbl/dia)": round(float(fila["Óleo (bbl/dia)"]), 4),
                "Gás Natural (Mm³/dia)": round(float(fila["Gás Natural (Mm³/dia)"]), 4),
                "Água (bbl/dia)": round(float(fila["Água (bbl/dia)"]), 4),
                "Pozos": int(fila["Pozos"]),
                "Cuencas": sorted(
                    dentro["Bacia"].dropna().astype(str).str.strip().unique().tolist()
                ),
                "Campos": sorted(
                    dentro["Campo"].dropna().astype(str).str.strip().unique().tolist()
                ),
            }
        )

    salida_mapa = RAIZ / "map_data.json"
    pd.DataFrame(map_data).to_json(salida_mapa, orient="records", force_ascii=False, indent=2)

    print(f"Generado {salida_mapa}: {len(map_data)} estados.")

    # ------------------------------------------------------------------
    # bacias_data.json — por Bacia, con Estado principal, óleo, gas, agua,
    # pozos únicos y campos únicos, ordenado por óleo (mayor → menor).
    # ------------------------------------------------------------------
    por_bacia = (
        datos.groupby("Bacia", as_index=False)
        .agg(
            **{
                "Óleo (bbl/dia)": ("Óleo (bbl/dia)", "sum"),
                "Gás Natural (Mm³/dia)": ("Gás Natural (Mm³/dia)", "sum"),
                "Água (bbl/dia)": ("Água (bbl/dia)", "sum"),
                "Pozos": ("Nome Poço", "nunique"),
            }
        )
    )

    bacias_data = []
    for _, fila in por_bacia.iterrows():
        nombre = str(fila["Bacia"]).strip()
        dentro = datos.loc[datos["Bacia"] == nombre]
        estados = dentro.groupby("Estado")["Óleo (bbl/dia)"].sum().sort_values(ascending=False)
        bacias_data.append(
            {
                "Bacia": nombre,
                "Estado principal": str(estados.index[0]) if len(estados) else "",
                "Óleo (bbl/dia)": round(float(fila["Óleo (bbl/dia)"]), 4),
                "Gás Natural (Mm³/dia)": round(float(fila["Gás Natural (Mm³/dia)"]), 4),
                "Água (bbl/dia)": round(float(fila["Água (bbl/dia)"]), 4),
                "Pozos": int(fila["Pozos"]),
                "Campos": int(dentro["Campo"].dropna().astype(str).str.strip().nunique()),
            }
        )

    bacias_data.sort(key=lambda fila: fila["Óleo (bbl/dia)"], reverse=True)

    salida_bacias = RAIZ / "bacias_data.json"
    pd.DataFrame(bacias_data).to_json(salida_bacias, orient="records", force_ascii=False, indent=2)

    print(f"Generado {salida_bacias}: {len(bacias_data)} cuencas.")

    # ------------------------------------------------------------------
    # campos_data.json — los 20 campos con mayor óleo, con Estado, Bacia,
    # Operador, óleo, gas, agua y número de pozos únicos.
    # ------------------------------------------------------------------
    por_campo = (
        datos.groupby(["Campo", "Estado", "Bacia", "Operador"], as_index=False)
        .agg(
            **{
                "Óleo (bbl/dia)": ("Óleo (bbl/dia)", "sum"),
                "Gás Natural (Mm³/dia)": ("Gás Natural (Mm³/dia)", "sum"),
                "Água (bbl/dia)": ("Água (bbl/dia)", "sum"),
                "Pozos": ("Nome Poço", "nunique"),
            }
        )
    )

    campos_data = []
    for _, fila in por_campo.sort_values(
        "Óleo (bbl/dia)", ascending=False, ignore_index=True
    ).head(20).iterrows():
        campos_data.append(
            {
                "Campo": str(fila["Campo"]).strip(),
                "Estado": str(fila["Estado"]).strip(),
                "Bacia": str(fila["Bacia"]).strip(),
                "Operador": str(fila["Operador"]).strip(),
                "Óleo (bbl/dia)": round(float(fila["Óleo (bbl/dia)"]), 4),
                "Gás Natural (Mm³/dia)": round(float(fila["Gás Natural (Mm³/dia)"]), 4),
                "Água (bbl/dia)": round(float(fila["Água (bbl/dia)"]), 4),
                "Pozos": int(fila["Pozos"]),
            }
        )

    salida_campos = RAIZ / "campos_data.json"
    pd.DataFrame(campos_data).to_json(salida_campos, orient="records", force_ascii=False, indent=2)

    print(f"Generado {salida_campos}: {len(campos_data)} campos.")

    # ------------------------------------------------------------------
    # distribucion_pozos.json — un registro por pozo consolidado.
    # Criterio de consolidación: se suman los volúmenes (óleo, agua y gas)
    # de todos los registros repetidos del mismo pozo. El pozo no se cuenta
    # dos veces: "Pozos" de los resúmenes es un nunique por grupo.
    # ------------------------------------------------------------------
    distribucion_pozos = []
    for _, fila in (
        datos.groupby("Nome Poço", as_index=False)
        .agg(
            **{
                "Óleo (bbl/dia)": ("Óleo (bbl/dia)", "sum"),
                "Água (bbl/dia)": ("Água (bbl/dia)", "sum"),
                "Gás Natural (Mm³/dia)": ("Gás Natural (Mm³/dia)", "sum"),
            }
        )
    ).iterrows():
        nombre = str(fila["Nome Poço"]).strip()
        dentro = datos.loc[datos["Nome Poço"] == nombre]
        distribucion_pozos.append(
            {
                "Nome Poço": nombre,
                "Estado": str(dentro["Estado"].iloc[0]).strip() if len(dentro) else "",
                "Bacia": str(dentro["Bacia"].iloc[0]).strip() if len(dentro) and pd.notna(dentro["Bacia"].iloc[0]) else "",
                "Óleo (bbl/dia)": round(float(fila["Óleo (bbl/dia)"]), 4),
                "Água (bbl/dia)": round(float(fila["Água (bbl/dia)"]), 4),
                "Gás Natural (Mm³/dia)": round(float(fila["Gás Natural (Mm³/dia)"]), 4),
            }
        )

    salida_dist = RAIZ / "distribucion_pozos.json"
    pd.DataFrame(distribucion_pozos).to_json(
        salida_dist, orient="records", force_ascii=False, indent=2
    )

    print(f"Generado {salida_dist}: {len(distribucion_pozos)} pozos consolidados.")

    # ------------------------------------------------------------------
    # estadistica_descriptiva.json — cifras para la sección 4.1 y la
    # calidad de datos visible en el mapa.
    # ------------------------------------------------------------------
    registros = int(len(datos))
    pozos_unicos = int(datos["Nome Poço"].nunique())
    pozos_varios = int(datos.groupby("Nome Poço")["Nome Poço"].size().gt(1).sum())
    ids_limpios = datos["Nome Poço"].notna() & (datos["Nome Poço"].astype(str).str.strip() != "")
    con_identificador = int(ids_limpios.sum())

    estados_cero = sorted(
        por_estado.loc[por_estado["Óleo (bbl/dia)"] == 0, "Estado"]
        .astype(str)
        .str.strip()
        .tolist()
    )

    estadistica = {
        "fuente": "2023_01_producao_Terra.csv",
        "periodos": ["2023/01"],
        "registros": registros,
        "pozos_unicos": pozos_unicos,
        "estados": int(por_estado.shape[0]),
        "cuencas": int(datos["Bacia"].nunique()),
        "campos": int(datos["Campo"].nunique()),
        "operadores": int(datos["Operador"].nunique()),
        "pozos_con_varios_registros": pozos_varios,
        "registros_sin_identificador": int(registros - con_identificador),
        "estados_con_oilo_cero": estados_cero,
    }

    salida_est = RAIZ / "estadistica_descriptiva.json"
    salida_est.write_text(
        json.dumps(estadistica, ensure_ascii=False, indent=2) + "\n",
        encoding="utf-8",
    )

    print(f"Generado {salida_est}: {len(estadistica)}.")


if __name__ == "__main__":
    main()
