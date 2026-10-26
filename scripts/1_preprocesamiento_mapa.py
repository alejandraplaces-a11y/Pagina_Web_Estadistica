"""
Instalación:
    python -m pip install pandas

Uso con el CSV en la misma carpeta:
    python 1_preprocesamiento_mapa.py

Uso con una ruta específica:
    python 1_preprocesamiento_mapa.py ruta/2023_01_producao_Terra.csv
"""

import argparse
from pathlib import Path

import pandas as pd


BASE = Path(__file__).resolve().parent


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

    requeridas = {"Estado", "Óleo (bbl/dia)", "Nome Poço"}
    faltantes = requeridas.difference(datos.columns)

    if faltantes:
        raise ValueError(
            f"Faltan columnas requeridas: {', '.join(sorted(faltantes))}"
        )

    # Los subencabezados del archivo no tienen Estado.
    datos = datos.dropna(subset=["Estado"]).copy()
    datos["Estado"] = datos["Estado"].str.strip()
    datos = datos.loc[datos["Estado"].ne("")].copy()

    datos["Óleo (bbl/dia)"] = pd.to_numeric(
        datos["Óleo (bbl/dia)"]
        .astype("string")
        .str.replace(",", ".", regex=False),
        errors="coerce",
    )

    numericas = datos.select_dtypes(include="number").columns
    datos[numericas] = datos[numericas].fillna(0)

    resumen = datos.groupby("Estado", as_index=False).agg(
        **{
            "Óleo (bbl/dia)": ("Óleo (bbl/dia)", "sum"),
            "Pozos": ("Nome Poço", "nunique"),
        }
    )

    salida = BASE / "map_data.json"
    resumen.to_json(
        salida,
        orient="records",
        force_ascii=False,
        indent=2,
    )

    print(f"Generado {salida}: {len(resumen)} estados.")


if __name__ == "__main__":
    main()