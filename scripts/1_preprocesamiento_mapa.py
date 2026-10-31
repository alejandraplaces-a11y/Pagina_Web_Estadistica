"""Requiere pandas. Ejecutar: python 1_preprocesamiento_mapa.py [ruta_csv]."""

import argparse
import math
import json
from pathlib import Path

import pandas as pd


BASE = Path(__file__).resolve().parent


def main():
    parser = argparse.ArgumentParser(description="Agrupa producción y pozos por Estado.")
    parser.add_argument(
        "csv", nargs="?", type=Path, default=BASE / "2023_01_producao_Terra.csv"
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
    requeridas = {"Estado", "Óleo (bbl/dia)", "Nome Poço", "Período"}
    faltantes = requeridas.difference(datos.columns)
    if faltantes:
        raise ValueError(f"Faltan columnas requeridas: {', '.join(sorted(faltantes))}")

    # El CSV contiene dos filas de subencabezados sin Estado.
    datos = datos.dropna(subset=["Estado"]).copy()
    datos["Estado"] = datos["Estado"].str.strip()
    datos = datos.loc[datos["Estado"].ne("")].copy()
    datos["Óleo (bbl/dia)"] = pd.to_numeric(
        datos["Óleo (bbl/dia)"].astype("string").str.replace(",", ".", regex=False),
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
    resumen.to_json(salida, orient="records", force_ascii=False, indent=2)
    print(f"Generado {salida}: {len(resumen)} estados.")

    identificadores = datos["Nome Poço"].astype("string").str.strip().replace("", pd.NA)
    frecuencias = identificadores.value_counts()
    descriptiva = {
        "fuente": args.csv.name,
        "periodos": sorted(datos["Período"].dropna().unique().tolist()),
        "registros": len(datos),
        "pozos_unicos": int(identificadores.nunique()),
        "estados": int(datos["Estado"].nunique()),
        "pozos_con_varios_registros": int(frecuencias.gt(1).sum()),
        "registros_sin_identificador": int(identificadores.isna().sum()),
    }
    salida_descriptiva = BASE / "estadistica_descriptiva.json"
    salida_descriptiva.write_text(
        json.dumps(descriptiva, ensure_ascii=False, indent=2) + "\n", encoding="utf-8"
    )
    print(f"Generado {salida_descriptiva}: {descriptiva['pozos_unicos']} pozos únicos.")
    variables = construir_variables(args.csv)
    salida_variables = BASE / "variables_estadistica.json"
    salida_variables.write_text(json.dumps(variables, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")
    print(f"Generado {salida_variables}: {len(variables['variables'])} variables.")

    frecuencias = construir_frecuencias(args.csv)
    salida_frecuencias = BASE / "distribucion_frecuencias.json"
    salida_frecuencias.write_text(json.dumps(frecuencias, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")
    print(f"Generado {salida_frecuencias}: k={frecuencias['cuantitativa']['k']}, A={frecuencias['cuantitativa']['amplitud']}.")

    indicadores = construir_indicadores(args.csv)
    salida_indicadores = BASE / "indicadores_descriptivos.json"
    salida_indicadores.write_text(json.dumps(indicadores, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")
    print(f"Generado {salida_indicadores}: n={indicadores['n']}, media={indicadores['indicadores']['centrales']['media']:.4f}.")

    vad = construir_vad(args.csv)
    salida_vad = BASE / "data" / "vad_dias_produccion.json"
    salida_vad.parent.mkdir(parents=True, exist_ok=True)
    salida_vad.write_text(json.dumps(vad, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")
    print(f"Generado {salida_vad}: n={vad['n']}, media={vad['media']:.4f}.")

    modelo = construir_modelo_discreto(vad)
    salida_modelo = BASE / "data" / "modelo_discreto.json"
    salida_modelo.write_text(json.dumps(modelo, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")
    print(f"Generado {salida_modelo}: chi2 binomial={modelo['binomial']['prueba']['estadistico']:.2f}.")

    vac = construir_vac(args.csv)
    salida_vac = BASE / "data" / "vac_oleo.json"
    salida_vac.write_text(json.dumps(vac, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")
    print(f"Generado {salida_vac}: n={vac['n']}, k={vac['k']}.")


# Columnas de la tabla 4.1.3. "Unnamed: 13" es la subcolumna «Gás Total» del encabezado partido del CSV.
VARIABLES_TABLA = [
    ("Estado", "Estado", "Cualitativa", "Nominal", "—"),
    ("Bacia", "Bacia", "Cualitativa", "Nominal", "—"),
    ("Campo", "Campo", "Cualitativa", "Nominal", "—"),
    ("Operador", "Operador", "Cualitativa", "Nominal", "—"),
    ("Tipo Instalação", "Tipo de instalación", "Cualitativa", "Nominal", "—"),
    ("Óleo (bbl/dia)", "Óleo", "Cuantitativa", "Continua", "bbl/día"),
    ("Unnamed: 13", "Gás total", "Cuantitativa", "Continua", "Mm³/día"),
    ("Água (bbl/dia)", "Agua", "Cuantitativa", "Continua", "bbl/día"),
    ("Condensado (bbl/dia)", "Condensado", "Cuantitativa", "Continua", "bbl/día"),
    ("Tempo de Produção (hs por mês)", "Tiempo de producción", "Cuantitativa", "Discreta", "h/mes"),
    ("Grau API", "Grado API", "Cuantitativa", "Continua", "°API"),
]
VARIABLES_EXCLUIDAS = [
    ("Nome Poço", "identificador de pozo; define la unidad estadística"),
    ("Número do Contrato", "código identificador del contrato"),
    ("Instalação Destino", "código de la instalación de destino; no responde a los objetivos"),
    ("Corrente", "clasificación del crudo con valores nulos; no se analiza en esta fase"),
    ("Período", "constante: un único valor"),
    ("Data de atualização", "constante: fecha de actualización del archivo"),
]


def numerico(serie):
    # Formato brasileño: punto como separador de miles y coma decimal.
    return pd.to_numeric(serie.str.replace(".", "", regex=False).str.replace(",", ".", regex=False), errors="coerce")


def construir_variables(csv_path):
    texto = pd.read_csv(csv_path, sep=";", encoding="utf-8-sig", on_bad_lines="skip", dtype=str, low_memory=False)
    texto = texto[texto["Estado"].notna() & texto["Estado"].str.strip().ne("")]
    variables = []
    for columna, nombre, naturaleza, escala, unidad in VARIABLES_TABLA:
        serie = texto[columna].str.strip()
        base = {"variable": nombre, "naturaleza": naturaleza, "escala": escala, "unidad": unidad}
        if naturaleza == "Cualitativa":
            variables.append({**base, "validos": int(serie.notna().sum()), "nulos": int(serie.isna().sum()),
                              "categorias": int(serie.nunique()), "minimo": None, "maximo": None, "ceros": None})
        else:
            num = numerico(serie)
            variables.append({**base, "validos": int(num.notna().sum()), "nulos": int(num.isna().sum()),
                              "categorias": None, "minimo": float(num.min()), "maximo": float(num.max()),
                              "ceros": int((num == 0).sum())})
    excluidas = [{"variable": columna, "motivo": motivo, "valores_distintos": int(texto[columna].nunique())}
                 for columna, motivo in VARIABLES_EXCLUIDAS]
    return {"fuente": Path(csv_path).name, "total_registros": len(texto), "variables": variables, "excluidas": excluidas}


def construir_frecuencias(csv_path):
    # Unidad estadística: pozo. Las filas repetidas se suman para obtener un valor por pozo.
    datos = pd.read_csv(csv_path, sep=";", decimal=",", thousands=".", encoding="utf-8-sig",
                        on_bad_lines="skip", low_memory=False)
    datos = datos[datos["Estado"].notna() & datos["Estado"].astype(str).str.strip().ne("")].copy()
    datos["Nome Poço"] = datos["Nome Poço"].astype(str).str.strip()
    pozos = datos.groupby("Nome Poço", as_index=False).agg(
        estado=("Estado", "first"), oleo=("Óleo (bbl/dia)", "sum"))
    n = len(pozos)

    cualitativa = pozos["estado"].value_counts().rename_axis("categoria").reset_index(name="fi")
    cualitativa = cualitativa.sort_values(["fi", "categoria"], ascending=[False, True]).reset_index(drop=True)
    cualitativa["hi"] = cualitativa["fi"] / n
    cualitativa["Fi"] = cualitativa["fi"].cumsum()
    cualitativa["Hi"] = cualitativa["hi"].cumsum()

    oleo = pozos["oleo"]
    k = math.ceil(1 + 3.322 * math.log10(n))
    amplitud = math.ceil((oleo.max() - oleo.min()) / k)
    limites = [oleo.min() + amplitud * i for i in range(k + 1)]
    clases = pd.cut(oleo, bins=limites, right=False, include_lowest=True)
    frecuencias = clases.value_counts(sort=False).values
    cuantitativa = []
    acumulada = 0
    for i in range(k):
        fi = int(frecuencias[i])
        acumulada += fi
        cuantitativa.append({
            "clase": i + 1,
            "li": round(float(limites[i]), 4),
            "ls": round(float(limites[i + 1]), 4),
            "marca": round(float((limites[i] + limites[i + 1]) / 2), 4),
            "fi": fi,
            "hi": fi / n,
            "Fi": acumulada,
            "Hi": acumulada / n,
        })

    return {
        "fuente": Path(csv_path).name,
        "unidad": "pozo (Nome Poço); filas repetidas sumadas",
        "n": n,
        "cualitativa": {
            "variable": "Estado",
            "categorias": [{"categoria": r.categoria, "fi": int(r.fi), "hi": float(r.hi),
                            "Fi": int(r.Fi), "Hi": float(r.Hi)} for r in cualitativa.itertuples()],
        },
        "cuantitativa": {
            "variable": "Óleo por pozo (bbl/día)",
            "k": k,
            "amplitud": amplitud,
            "minimo": float(oleo.min()),
            "maximo": float(oleo.max()),
            "ceros": int((oleo == 0).sum()),
            "clases": cuantitativa,
        },
    }


def _resumen(serie, total_global):
    media = float(serie.mean())
    desviacion = float(serie.std(ddof=1)) if len(serie) > 1 else 0.0
    total = float(serie.sum())
    return {
        "n": int(len(serie)),
        "media": media,
        "mediana": float(serie.median()),
        "desviacion_estandar": desviacion,
        "coeficiente_variacion": desviacion / media if media else None,
        "minimo": float(serie.min()),
        "maximo": float(serie.max()),
        "total": total,
        "participacion": total / total_global if total_global else 0.0,
    }


def construir_indicadores(csv_path):
    # Unidad estadística: pozo, con los volúmenes de sus filas repetidas sumados.
    datos = pd.read_csv(csv_path, sep=";", decimal=",", thousands=".", encoding="utf-8-sig",
                        on_bad_lines="skip", low_memory=False)
    datos = datos[datos["Estado"].notna() & datos["Estado"].astype(str).str.strip().ne("")].copy()
    datos["Nome Poço"] = datos["Nome Poço"].astype(str).str.strip()
    pozos = datos.groupby("Nome Poço", as_index=False).agg(
        estado=("Estado", "first"), oleo=("Óleo (bbl/dia)", "sum"))
    x = pozos["oleo"]
    total_global = float(x.sum())
    conteo = x.value_counts()
    resumen_total = _resumen(x, total_global)
    ceros = int((x == 0).sum())
    q1, q3 = float(x.quantile(0.25)), float(x.quantile(0.75))
    minimo, maximo = float(x.min()), float(x.max())
    indicadores = {
        "centrales": {
            "media": resumen_total["media"],
            "mediana": resumen_total["mediana"],
            "moda": float(conteo.index[0]),
            "frecuencia_moda": int(conteo.iloc[0]),
        },
        "dispersion": {
            "minimo": minimo,
            "maximo": maximo,
            "rango": maximo - minimo,
            "q1": q1,
            "q3": q3,
            "rango_intercuartilico": q3 - q1,
            "varianza": float(x.var(ddof=1)),
            "desviacion_estandar": resumen_total["desviacion_estandar"],
            "coeficiente_variacion": resumen_total["coeficiente_variacion"],
        },
        "forma": {
            "asimetria": float(x.skew()),
            "curtosis": float(x.kurt()),
            "ceros": ceros,
            "porcentaje_ceros": ceros / len(x),
        },
    }
    por_estado = [{"estado": estado, **_resumen(grupo["oleo"], total_global)}
                  for estado, grupo in pozos.groupby("estado")]
    por_estado.sort(key=lambda fila: fila["total"], reverse=True)
    return {
        "fuente": Path(csv_path).name,
        "variable": "Óleo por pozo (bbl/día)",
        "n": int(len(x)),
        "indicadores": indicadores,
        "por_estado": por_estado,
        "total": resumen_total,
    }


def construir_vad(csv_path):
    # X = días completos producidos por el pozo en enero de 2023 (744 h = 31 días).
    datos = pd.read_csv(csv_path, sep=";", decimal=",", thousands=".", encoding="utf-8-sig",
                        on_bad_lines="skip", low_memory=False)
    datos = datos[datos["Estado"].notna() & datos["Estado"].astype(str).str.strip().ne("")].copy()
    datos["Nome Poço"] = datos["Nome Poço"].astype(str).str.strip()
    # Las filas repetidas de un pozo repiten sus horas; sumarlas superaría las 744 h del mes.
    horas = datos.groupby("Nome Poço")["Tempo de Produção (hs por mês)"].max().fillna(0)
    x = (horas // 24).astype(int).clip(0, 31)
    n = len(x)
    conteo = x.value_counts().reindex(range(32), fill_value=0)
    tdf, acumulada = [], 0
    for valor, fi in conteo.items():
        acumulada += int(fi)
        tdf.append({"x": int(valor), "fi": int(fi), "hi": int(fi) / n, "Fi": acumulada, "Hi": acumulada / n})
    moda = int(conteo.idxmax())
    return {
        "fuente": Path(csv_path).name,
        "variable": "Días completos de producción por pozo",
        "simbolo": "X",
        "unidad": "días",
        "dominio": [0, 31],
        "n": n,
        "minimo": int(x.min()),
        "maximo": int(x.max()),
        "media": float(x.mean()),
        "varianza": float(x.var(ddof=1)),
        "desviacion_estandar": float(x.std(ddof=1)),
        "mediana": float(x.median()),
        "moda": moda,
        "frecuencia_moda": int(conteo.loc[moda]),
        "ceros": int(conteo.loc[0]),
        "mes_completo": int(conteo.loc[31]),
        "pozos_varias_filas": int(datos["Nome Poço"].duplicated(keep=False).groupby(datos["Nome Poço"]).any().sum()),
        "tdf": tdf,
    }


def _chi_cuadrado(observadas, esperadas, parametros):
    # Se agrupan celdas adyacentes hasta que cada frecuencia esperada sea >= 5.
    from scipy import stats

    grupos, o, e, desde = [], 0.0, 0.0, 0
    for i, (oi, ei) in enumerate(zip(observadas, esperadas)):
        o += oi
        e += ei
        if e >= 5:
            grupos.append({"desde": desde, "hasta": i, "observada": o, "esperada": e})
            o, e, desde = 0.0, 0.0, i + 1
    if e > 0:
        grupos[-1]["hasta"] = len(observadas) - 1
        grupos[-1]["observada"] += o
        grupos[-1]["esperada"] += e
    for g in grupos:
        g["aporte"] = (g["observada"] - g["esperada"]) ** 2 / g["esperada"]
    estadistico = sum(g["aporte"] for g in grupos)
    gl = len(grupos) - 1 - parametros
    return {
        "estadistico": float(estadistico),
        "grados_libertad": int(gl),
        "alfa": 0.05,
        "valor_critico": float(stats.chi2.ppf(0.95, gl)),
        "p_valor": float(stats.chi2.sf(estadistico, gl)),
        "rechaza": bool(estadistico > stats.chi2.ppf(0.95, gl)),
        "grupos": [{k: (int(v) if k in ("desde", "hasta") else float(v)) for k, v in g.items()} for g in grupos],
    }


def construir_modelo_discreto(vad):
    # Requiere scipy. Modelos para X = días completos de producción (0..31).
    import numpy as np
    from scipy import optimize, stats

    ensayos = 31
    x = np.arange(ensayos + 1)
    f = np.array([fila["fi"] for fila in vad["tdf"]], dtype=float)
    n = f.sum()
    media = vad["media"]
    varianza = vad["varianza"]

    p = media / ensayos
    binom = stats.binom.pmf(x, ensayos, p)

    # Beta-binomial por máxima verosimilitud, partiendo de momentos.
    q = media / ensayos
    rho = (varianza / (ensayos * q * (1 - q)) - 1) / (ensayos - 1)
    suma = (1 - rho) / rho
    inicio = np.log([q * suma, (1 - q) * suma])
    nll = lambda t: -(f * stats.betabinom.logpmf(x, ensayos, *np.exp(t))).sum()
    alfa_bb, beta_bb = np.exp(optimize.minimize(nll, inicio, method="Nelder-Mead").x)
    betabinom = stats.betabinom.pmf(x, ensayos, alfa_bb, beta_bb)

    tabla = [{
        "x": int(xi),
        "observada": int(fi),
        "p_observada": float(fi / n),
        "p_binomial": float(pb),
        "esperada_binomial": float(n * pb),
        "p_betabinomial": float(pbb),
        "esperada_betabinomial": float(n * pbb),
    } for xi, fi, pb, pbb in zip(x, f, binom, betabinom)]

    return {
        "fuente": vad["fuente"],
        "variable": vad["variable"],
        "n": int(n),
        "ensayos": ensayos,
        "media_observada": media,
        "varianza_observada": varianza,
        "binomial": {
            "p": float(p),
            "media": float(ensayos * p),
            "varianza": float(ensayos * p * (1 - p)),
            "prueba": _chi_cuadrado(f, n * binom, 1),
        },
        "betabinomial": {
            "alfa": float(alfa_bb),
            "beta": float(beta_bb),
            "media": float(ensayos * alfa_bb / (alfa_bb + beta_bb)),
            "varianza": float(stats.betabinom.var(ensayos, alfa_bb, beta_bb)),
            "prueba": _chi_cuadrado(f, n * betabinom, 2),
        },
        "tabla": tabla,
    }


def construir_vac(csv_path):
    # VAC = óleo por pozo productor (x > 0); clases de igual ancho en log10(x) por su asimetría.
    import numpy as np
    from scipy import stats

    datos = pd.read_csv(csv_path, sep=";", decimal=",", thousands=".", encoding="utf-8-sig",
                        on_bad_lines="skip", low_memory=False)
    datos = datos[datos["Estado"].notna() & datos["Estado"].astype(str).str.strip().ne("")].copy()
    datos["Nome Poço"] = datos["Nome Poço"].astype(str).str.strip()
    oleo = datos.groupby("Nome Poço")["Óleo (bbl/dia)"].sum()
    x = oleo[oleo > 0].to_numpy()
    t = np.log10(x)
    n = len(x)
    k = math.ceil(1 + 3.322 * math.log10(n))
    amplitud = (t.max() - t.min()) / k
    bordes = t.min() + amplitud * np.arange(k + 1)
    bordes[-1] = t.max()
    indice = np.minimum(((t - t.min()) / amplitud).astype(int), k - 1)
    conteo = np.bincount(indice, minlength=k)

    clases, acumulada = [], 0
    for i in range(k):
        fi = int(conteo[i])
        acumulada += fi
        li, ls = 10 ** bordes[i], 10 ** bordes[i + 1]
        hi = fi / n
        clases.append({
            "clase": i + 1,
            "t_li": float(bordes[i]),
            "t_ls": float(bordes[i + 1]),
            "li": float(li),
            "ls": float(ls),
            "marca": float(math.sqrt(li * ls)),
            "fi": fi,
            "hi": hi,
            "Fi": acumulada,
            "Hi": acumulada / n,
            "densidad_t": hi / (bordes[i + 1] - bordes[i]),
            "densidad_x": hi / (ls - li),
        })

    return {
        "fuente": Path(csv_path).name,
        "variable": "Óleo por pozo productor",
        "simbolo": "Y",
        "unidad": "bbl/día",
        "n": int(n),
        "excluidos_cero": int((oleo == 0).sum()),
        "minimo": float(x.min()),
        "maximo": float(x.max()),
        "media": float(x.mean()),
        "mediana": float(np.median(x)),
        "desviacion_estandar": float(x.std(ddof=1)),
        "asimetria": float(stats.skew(x, bias=False)),
        "asimetria_log10": float(stats.skew(t, bias=False)),
        "media_log10": float(t.mean()),
        "desviacion_log10": float(t.std(ddof=1)),
        "k": int(k),
        "amplitud_log10": float(amplitud),
        "clases": clases,
    }


if __name__ == "__main__":
    main()