"""Genera los JSON de la descriptiva (4.1) y la ampliación inferencial (4.2.15-4.2.18).

Requiere pandas, numpy y scipy. Ejecutar desde la raíz del repositorio:

    .venv/bin/python scripts/2_descriptiva_inferencial.py data/2023_01_producao_Terra.csv \
        [--anual carpeta_con_los_12_csv_de_2023]

Escribe directamente en data/. La validación anual descarga los ZIP mensuales de la ANP
si la carpeta indicada no contiene los CSV 2023_MM_producao_Terra.csv.
"""

import argparse
import importlib.util
import io
import json
import math
import urllib.request
import zipfile
from pathlib import Path

import numpy as np
import pandas as pd
from scipy import optimize, stats

BASE = Path(__file__).resolve().parent
DATA = BASE.parent / "data"
SEMILLA = 2023
URL_ANP = ("https://www.gov.br/anp/pt-br/centrais-de-conteudo/dados-abertos/arquivos/"
           "arquivos-producao-de-petroleo-e-gas-natural-por-poco/2023/producao-{mes}.zip")

# Se reutiliza la prueba chi-cuadrado (agrupación E >= 5) del script de inferencial.
_spec = importlib.util.spec_from_file_location("prep", BASE / "1_preprocesamiento_mapa.py")
prep = importlib.util.module_from_spec(_spec)
_spec.loader.exec_module(prep)
chi_cuadrado = prep._chi_cuadrado

# Columnas del CSV. El encabezado de Gás Natural se parte en tres subcolumnas:
# Associado, Não Associado (Unnamed: 12) y Gás Total (Unnamed: 13).
OLEO, AGUA, COND = "Óleo (bbl/dia)", "Água (bbl/dia)", "Condensado (bbl/dia)"
GAS_A, GAS_NA, GAS_T = "Gás Natural (Mm³/dia)", "Unnamed: 12", "Unnamed: 13"
HORAS, API = "Tempo de Produção (hs por mês)", "Grau API"
VOLUMENES = [OLEO, COND, GAS_A, GAS_NA, GAS_T, AGUA]

# Clasificación del crudo por grado API (convención API/ANP).
API_PESADO, API_LIGERO = 22.3, 31.1
CLASES_API = ["Pesado", "Mediano", "Ligero"]


def numerico(serie):
    if pd.api.types.is_numeric_dtype(serie):
        return serie
    texto = serie.astype("string").str.strip()
    return pd.to_numeric(texto.str.replace(".", "", regex=False).str.replace(",", ".", regex=False),
                         errors="coerce")


def leer_registros(csv_path):
    datos = pd.read_csv(csv_path, sep=";", decimal=",", thousands=".", encoding="utf-8-sig",
                        on_bad_lines="skip", low_memory=False)
    # Las dos filas de subencabezado no tienen Estado.
    datos = datos[datos["Estado"].notna() & datos["Estado"].astype(str).str.strip().ne("")].copy()
    datos["Nome Poço"] = datos["Nome Poço"].astype(str).str.strip()
    for columna in VOLUMENES + [HORAS, API]:
        datos[columna] = numerico(datos[columna])
    return datos


def clase_api(valor):
    if pd.isna(valor):
        return None
    if valor < API_PESADO:
        return "Pesado"
    return "Mediano" if valor <= API_LIGERO else "Ligero"


def consolidar_pozos(datos):
    """Un registro por pozo.

    Los pozos repetidos aparecen una vez por cada campo al que aportan (mismo contrato y
    Estado), así que sus volúmenes son partes del total del pozo y se suman. Las horas pueden
    repetirse entre filas: se toma el máximo para no superar las 744 h de enero.
    """
    principal = datos.sort_values(OLEO, ascending=False).groupby("Nome Poço")
    pozos = datos.groupby("Nome Poço").agg(
        **{c: (c, "sum") for c in VOLUMENES},
        horas=(HORAS, "max"),
        campos=("Campo", "nunique"),
    )
    for columna in ["Estado", "Bacia", "Operador", "Campo", "Tipo Instalação"]:
        pozos[columna] = principal[columna].first()
    # Grado API de la fila con más óleo (20 pozos repetidos tienen corrientes distintas).
    pozos["api"] = principal[API].first()
    pozos["clase_api"] = pozos["api"].map(clase_api)
    pozos["dias"] = (pozos["horas"].fillna(0) // 24).astype(int).clip(0, 31)
    return pozos.reset_index()


def sturges(n):
    return math.ceil(1 + 3.322 * math.log10(n))


def fmt_rango(minimo, maximo, decimales=4):
    return f"{minimo:.{decimales}f} – {maximo:.{decimales}f}".replace(".", ",")


# ---------------------------------------------------------------- 4.1.3 Variables

def construir_variables(datos, pozos):
    n = len(pozos)
    filas = []

    def cualitativa(columna, traduccion, descripcion, subtipo, dominio, escala, instrumento, rango=None):
        serie = pozos[columna]
        validos = int(serie.notna().sum())
        filas.append({
            "columna": columna if columna != "clase_api" else "— (derivada de Grau API)",
            "traduccion": traduccion, "descripcion": descripcion, "tipo": "Cualitativa",
            "subtipo": subtipo, "dominio": dominio,
            "rango": rango or f"{serie.nunique()} categorías observadas", "escala": escala,
            "instrumento": instrumento, "unidad": "—", "validos": validos, "nulos": n - validos, "ceros": None,
        })

    def cuantitativa(columna, nombre_csv, traduccion, descripcion, subtipo, dominio, escala, instrumento,
                     unidad, decimales=4):
        serie = pozos[columna]
        validos = int(serie.notna().sum())
        filas.append({
            "columna": nombre_csv, "traduccion": traduccion, "descripcion": descripcion,
            "tipo": "Cuantitativa", "subtipo": subtipo, "dominio": dominio,
            "rango": fmt_rango(float(serie.min()), float(serie.max()), decimales), "escala": escala,
            "instrumento": instrumento, "unidad": unidad, "validos": validos, "nulos": n - validos,
            "ceros": int((serie == 0).sum()),
        })

    registro = "Registro administrativo de la ANP"
    medicion = "Medición fiscal del operador declarada a la ANP"
    cualitativa("Estado", "Estado", "Unidad federativa donde se ubica el pozo", "Nominal",
                "27 unidades federativas de Brasil", "Nominal", registro,
                f"{pozos['Estado'].nunique()} estados")
    cualitativa("Bacia", "Cuenca", "Cuenca sedimentaria del pozo", "Nominal",
                "Cuencas sedimentarias terrestres", "Nominal", registro,
                f"{pozos['Bacia'].nunique()} cuencas")
    campos = datos["Campo"].nunique()
    cualitativa("Campo", "Campo", "Campo de producción (el de mayor óleo si el pozo aporta a varios)",
                "Nominal", "Campos con contrato de concesión", "Nominal", registro,
                f"{campos} campos")
    cualitativa("Operador", "Operador", "Empresa que opera el pozo", "Nominal",
                "Empresas autorizadas por la ANP", "Nominal", registro,
                f"{pozos['Operador'].nunique()} operadores")
    cualitativa("Tipo Instalação", "Tipo de instalación de destino",
                "Tipo de instalación que recibe la producción", "Nominal",
                "Tipos de instalación de la ANP", "Nominal", registro)
    cualitativa("clase_api", "Clase de crudo",
                f"Pesado < {API_PESADO:.1f}°; mediano {API_PESADO:.1f}°–{API_LIGERO:.1f}°; ligero > {API_LIGERO:.1f}°".replace(".", ","),
                "Ordinal", "{Pesado < Mediano < Ligero}", "Ordinal",
                "Clasificación a partir del grado API", "Pesado < Mediano < Ligero")
    cuantitativa("horas", HORAS, "Tiempo de producción", "Horas en que el pozo produjo durante el mes",
                 "Continua (registrada en horas enteras)", "0 – 744 (horas enteras)", "Razón", medicion, "h/mes", 0)
    cuantitativa("dias", "— (derivada de Tempo de Produção)", "Días completos de producción",
                 "⌊horas / 24⌋", "Discreta", "{0, 1, …, 31}", "Razón", "Cálculo a partir de las horas", "días", 0)
    cuantitativa(OLEO, OLEO, "Óleo", "Volumen medio diario de petróleo (sin condensado)", "Continua",
                 "[0; +∞)", "Razón", medicion, "bbl/día")
    cuantitativa(COND, COND, "Condensado", "Volumen medio diario de condensado", "Continua",
                 "[0; +∞)", "Razón", medicion, "bbl/día")
    cuantitativa(GAS_A, "Gás Natural · Associado", "Gas natural asociado",
                 "Gas producido junto con el petróleo", "Continua", "[0; +∞)", "Razón", medicion, "Mm³/día")
    cuantitativa(GAS_NA, "Gás Natural · Não Associado", "Gas natural no asociado",
                 "Gas de yacimientos de gas", "Continua", "[0; +∞)", "Razón", medicion, "Mm³/día")
    cuantitativa(GAS_T, "Gás Natural · Gás Total", "Gas natural total",
                 "Gas asociado + no asociado", "Continua", "[0; +∞)", "Razón", medicion, "Mm³/día")
    cuantitativa(AGUA, AGUA, "Agua", "Volumen medio diario de agua producida", "Continua",
                 "[0; +∞)", "Razón", medicion, "bbl/día")
    cuantitativa("api", API, "Grado API",
                 "Densidad del crudo; 141,5/densidad relativa − 131,5. El cero no indica ausencia",
                 "Continua", "(−∞; +∞), en la práctica 10°–70°", "Intervalo",
                 "Análisis de laboratorio de la corriente", "°API", 2)

    def distintos(columna):
        return int(datos[columna].nunique()) if columna in datos else 0

    excluidas = [
        ("Nome Poço", "identificador del pozo: define la unidad estadística", distintos("Nome Poço")),
        ("Nome Poço · Operador", "código del pozo usado por el operador; duplica el identificador", distintos("Unnamed: 3")),
        ("Número do Contrato", "código del contrato de concesión", distintos("Número do Contrato")),
        ("Período", "constante: 2023/01", distintos("Período")),
        ("Data de atualização", "constante: fecha de publicación del archivo", distintos("Data de atualização")),
        ("Período da Carga", "fecha de la carga administrativa; no describe la producción", distintos("Período da Carga")),
        ("Instalação Destino", "nombre propio de la instalación; casi un valor por pozo", distintos("Instalação Destino")),
        ("Corrente", "nombre de la corriente de crudo; se resume en la clase API", distintos("Corrente")),
        ("Petróleo (bbl/dia)", "redundante: óleo + condensado", distintos("Petróleo (bbl/dia)")),
        ("Volume Gás Royalties", "base de cálculo de regalías, derivada del gas", distintos("Volume Gás Royalties (Mm³/dia)")),
        ("Fração de Destilados y composición del gas", "análisis de laboratorio por corriente, con muchos nulos", None),
    ]
    return {
        "fuente": "2023_01_producao_Terra.csv",
        "unidad": "pozo",
        "n": n,
        "registros": len(datos),
        "variables": filas,
        "excluidas": [{"variable": v, "motivo": m, "valores_distintos": d} for v, m, d in excluidas],
    }


# ---------------------------------------------------------------- 4.1.4 / 4.1.5 TDF

def tdf_categorica(serie, orden=None):
    validos = serie.dropna()
    n = len(validos)
    conteo = validos.value_counts()
    if orden:
        conteo = conteo.reindex(orden, fill_value=0)
    else:
        conteo = conteo.sort_index().sort_values(ascending=False, kind="stable")
    filas, acumulada = [], 0
    for categoria, fi in conteo.items():
        acumulada += int(fi)
        filas.append({"categoria": str(categoria), "fi": int(fi), "hi": int(fi) / n,
                      "Fi": acumulada, "Hi": acumulada / n})
    return {"n": n, "nulos": int(serie.isna().sum()), "filas": filas}


def tdf_log(serie):
    """Clase {0} para los ceros + k clases de Sturges de igual ancho en log10 para x > 0.

    Con los positivos usa el mismo algoritmo que vac_oleo.json (4.2.6), por lo que las clases
    del óleo coinciden con las de la inferencial. hᵢ se calcula sobre todos los pozos.
    """
    x = serie.to_numpy(dtype=float)
    n = len(x)
    positivos = x[x > 0]
    ceros = int((x == 0).sum())
    t = np.log10(positivos)
    k = sturges(len(positivos))
    amplitud = (t.max() - t.min()) / k
    bordes = t.min() + amplitud * np.arange(k + 1)
    bordes[-1] = t.max()
    indice = np.minimum(((t - t.min()) / amplitud).astype(int), k - 1)
    conteo = np.bincount(indice, minlength=k)

    filas = [{"clase": 0, "cero": True, "li": 0.0, "ls": 0.0, "marca": 0.0, "fi": ceros,
              "hi": ceros / n, "Fi": ceros, "Hi": ceros / n}]
    acumulada = ceros
    for i in range(k):
        fi = int(conteo[i])
        acumulada += fi
        li, ls = 10 ** bordes[i], 10 ** bordes[i + 1]
        filas.append({"clase": i + 1, "cero": False, "li": float(li), "ls": float(ls),
                      "t_li": float(bordes[i]), "t_ls": float(bordes[i + 1]),
                      "marca": float(math.sqrt(li * ls)), "fi": fi, "hi": fi / n,
                      "Fi": acumulada, "Hi": acumulada / n})
    modal = max(filas, key=lambda f: f["fi"])
    return {"n": n, "ceros": ceros, "positivos": int(len(positivos)), "k": int(k),
            "amplitud_log10": float(amplitud), "clase_modal": modal["clase"], "filas": filas}


def tdf_lineal(serie):
    x = serie.dropna().to_numpy(dtype=float)
    n = len(x)
    k = sturges(n)
    amplitud = (x.max() - x.min()) / k
    bordes = x.min() + amplitud * np.arange(k + 1)
    indice = np.minimum(((x - x.min()) / amplitud).astype(int), k - 1)
    conteo = np.bincount(indice, minlength=k)
    filas, acumulada = [], 0
    for i in range(k):
        fi = int(conteo[i])
        acumulada += fi
        filas.append({"clase": i + 1, "li": float(bordes[i]), "ls": float(bordes[i + 1]),
                      "marca": float((bordes[i] + bordes[i + 1]) / 2), "fi": fi, "hi": fi / n,
                      "Fi": acumulada, "Hi": acumulada / n})
    modal = max(filas, key=lambda f: f["fi"])
    return {"n": n, "k": int(k), "amplitud": float(amplitud), "clase_modal": modal["clase"], "filas": filas}


def construir_frecuencias(pozos):
    dias = tdf_categorica(pozos["dias"], orden=list(range(32)))
    return {
        "fuente": "2023_01_producao_Terra.csv",
        "unidad": "pozo (Nome Poço); volúmenes de filas repetidas sumados",
        "n": len(pozos),
        "estado": tdf_categorica(pozos["Estado"]),
        "clase_api": tdf_categorica(pozos["clase_api"], orden=CLASES_API),
        "dias": dias,
        "oleo": tdf_log(pozos[OLEO]),
    }


# ---------------------------------------------------------------- 4.1.6 Indicadores

def indicadores_variable(serie, nombre, unidad, escala, tdf=None, discreta=False):
    x = serie.dropna().astype(float)
    n = len(x)
    q1, q3 = float(x.quantile(0.25)), float(x.quantile(0.75))
    ric = q3 - q1
    lim_inf, lim_sup = q1 - 1.5 * ric, q3 + 1.5 * ric
    media = float(x.mean())
    s = float(x.std(ddof=1))
    resultado = {
        "nombre": nombre, "unidad": unidad, "escala": escala, "n": n,
        "nulos": int(serie.isna().sum()),
        "media": media, "mediana": float(x.median()),
        "minimo": float(x.min()), "maximo": float(x.max()), "rango": float(x.max() - x.min()),
        "q1": q1, "q3": q3, "ric": ric, "lim_inf": lim_inf, "lim_sup": lim_sup,
        "outliers_bajo": int((x < lim_inf).sum()), "outliers_alto": int((x > lim_sup).sum()),
        "varianza": float(x.var(ddof=1)), "desviacion_estandar": s,
        # El CV solo tiene sentido con un cero absoluto (escala de razón).
        "coeficiente_variacion": s / media if escala == "Razón" and media else None,
        "asimetria": float(x.skew()), "curtosis": float(x.kurt()),
        "ceros": int((x == 0).sum()),
    }
    resultado["outliers"] = resultado["outliers_bajo"] + resultado["outliers_alto"]
    resultado["porcentaje_outliers"] = resultado["outliers"] / n
    if discreta:
        conteo = x.value_counts()
        resultado["moda"] = {"valor": float(conteo.index[0]), "fi": int(conteo.iloc[0])}
    if tdf:
        modal = next(f for f in tdf["filas"] if f["clase"] == tdf["clase_modal"])
        resultado["clase_modal"] = {"clase": modal["clase"], "li": modal["li"], "ls": modal["ls"],
                                    "cero": modal.get("cero", False), "fi": modal["fi"], "hi": modal["hi"]}
    return resultado


def _resumen(serie, total_global):
    media = float(serie.mean())
    desviacion = float(serie.std(ddof=1)) if len(serie) > 1 else 0.0
    total = float(serie.sum())
    return {
        "n": int(len(serie)), "media": media, "mediana": float(serie.median()),
        "desviacion_estandar": desviacion,
        "coeficiente_variacion": desviacion / media if media else None,
        "minimo": float(serie.min()), "maximo": float(serie.max()),
        "total": total, "participacion": total / total_global if total_global else 0.0,
    }


def construir_indicadores(pozos):
    variables = {
        "oleo": indicadores_variable(pozos[OLEO], "Óleo", "bbl/día", "Razón", tdf_log(pozos[OLEO])),
        "gas": indicadores_variable(pozos[GAS_T], "Gas natural total", "Mm³/día", "Razón", tdf_log(pozos[GAS_T])),
        "agua": indicadores_variable(pozos[AGUA], "Agua", "bbl/día", "Razón", tdf_log(pozos[AGUA])),
        "dias": indicadores_variable(pozos["dias"], "Días completos de producción", "días", "Razón", discreta=True),
        "api": indicadores_variable(pozos["api"], "Grado API", "°API", "Intervalo", tdf_lineal(pozos["api"])),
    }
    clases = pozos["clase_api"].dropna()
    orden = {c: i for i, c in enumerate(CLASES_API)}
    ordinal = sorted(clases.map(orden))
    conteo = clases.value_counts()
    ordinal_resumen = {
        "n": len(ordinal), "nulos": int(pozos["clase_api"].isna().sum()),
        "moda": conteo.index[0], "fi_moda": int(conteo.iloc[0]),
        "mediana": CLASES_API[ordinal[(len(ordinal) - 1) // 2]],
    }
    x = pozos[OLEO]
    total_global = float(x.sum())
    por_estado = [{"estado": e, **_resumen(g[OLEO], total_global)} for e, g in pozos.groupby("Estado")]
    por_estado.sort(key=lambda f: f["total"], reverse=True)
    return {
        "fuente": "2023_01_producao_Terra.csv",
        "n": len(pozos),
        "variables": variables,
        "clase_api": ordinal_resumen,
        "por_estado": por_estado,
        "total": _resumen(x, total_global),
    }


# ---------------------------------------------------------------- 4.2.15 Segunda VAC: agua

def ajustar_continua(y, nombre, unidad):
    n = len(y)
    t = np.log10(y)
    k = sturges(n)
    amplitud = (t.max() - t.min()) / k
    bordes = t.min() + amplitud * np.arange(k + 1)
    bordes[-1] = t.max()
    indice = np.minimum(((t - t.min()) / amplitud).astype(int), k - 1)
    observadas = np.bincount(indice, minlength=k).astype(float)
    x_bordes = 10 ** bordes

    def probabilidades(cdf):
        acumulada = cdf(x_bordes)
        prob = np.diff(acumulada)
        prob[0] += acumulada[0]
        prob[-1] += 1 - acumulada[-1]
        return prob

    ln_y = np.log(y)
    mu, sigma = float(ln_y.mean()), float(ln_y.std(ddof=0))
    modelos = [("Lognormal", [mu, sigma], probabilidades(lambda v: stats.norm.cdf(np.log(v), mu, sigma)))]
    for nombre_modelo, dist in (("Gamma", stats.gamma), ("Weibull", stats.weibull_min)):
        parametros = dist.fit(y, floc=0)
        modelos.append((nombre_modelo, [float(v) for v in parametros if v != 0],
                        probabilidades(lambda v, d=dist, a=parametros: d.cdf(v, *a))))
    candidatos = []
    for nombre_modelo, parametros, prob in modelos:
        prueba = chi_cuadrado(observadas, n * prob, 2)
        candidatos.append({"modelo": nombre_modelo, "parametros": parametros,
                           "pearson_r": float(np.corrcoef(observadas / n, prob)[0, 1]),
                           "chi_cuadrado": prueba["estadistico"], "grados_libertad": prueba["grados_libertad"],
                           "valor_critico": prueba["valor_critico"], "p_valor": prueba["p_valor"],
                           "rechaza": prueba["rechaza"]})
    mejor = min(candidatos, key=lambda c: c["chi_cuadrado"])
    p_mejor = next(p for nm, _, p in modelos if nm == mejor["modelo"])
    clases = [{"clase": i + 1, "li": float(x_bordes[i]), "ls": float(x_bordes[i + 1]),
               "t_li": float(bordes[i]), "t_ls": float(bordes[i + 1]), "fi": int(observadas[i]),
               "hi": float(observadas[i] / n), "densidad_t": float(observadas[i] / n / amplitud),
               "p_modelo": float(p_mejor[i]), "esperada": float(n * p_mejor[i])} for i in range(k)]

    tcrit = float(stats.t.ppf(0.975, n - 1))
    z = float(stats.norm.ppf(0.975))
    media, s = float(y.mean()), float(y.std(ddof=1))
    e_media = tcrit * s / math.sqrt(n)
    mediana = float(np.median(y))
    # IC de la mediana sin suponer modelo (estadísticos de orden, aproximación normal a la binomial).
    ordenados = np.sort(y)
    j = max(int(math.floor(n / 2 - z * math.sqrt(n) / 2)), 1)
    k_sup = min(int(math.ceil(n / 2 + z * math.sqrt(n) / 2)) + 1, n)
    return {
        "variable": nombre, "unidad": unidad, "n": n, "media": media, "mediana": mediana,
        "desviacion_estandar": s, "asimetria": float(stats.skew(y, bias=False)),
        "asimetria_log10": float(stats.skew(t, bias=False)), "k": int(k), "amplitud_log10": float(amplitud),
        "mu": mu, "sigma": sigma, "t": tcrit, "z": z,
        "candidatos": candidatos, "mejor": mejor["modelo"],
        "prueba": chi_cuadrado(observadas, n * p_mejor, 2), "clases": clases,
        "intervalos": [
            {"parametro": f"Media ({unidad})", "metodo": "ȳ ± t·s/√n", "estimacion": media,
             "inferior": media - e_media, "superior": media + e_media},
            {"parametro": f"Mediana ({unidad})", "metodo": "estadísticos de orden y(j), y(k)",
             "estimacion": mediana, "inferior": float(ordenados[j - 1]), "superior": float(ordenados[k_sup - 1])},
        ],
    }


# ---------------------------------------------------------------- 4.2.16 Segunda VAD: pozos por campo

def ajustar_pozos_por_campo(datos):
    # Unidad: campo. X = número de pozos distintos del campo (X >= 1); se modela X − 1.
    x = datos.groupby("Campo")["Nome Poço"].nunique().to_numpy()
    z = x - 1
    n = len(z)
    media, varianza = float(z.mean()), float(z.var(ddof=1))
    maximo = int(z.max())
    valores = np.arange(maximo + 1)
    observadas = np.bincount(z, minlength=maximo + 1).astype(float)

    def con_cola(pmf, sf):
        prob = pmf.copy()
        prob[-1] += sf
        return prob

    p_pois = con_cola(stats.poisson.pmf(valores, media), stats.poisson.sf(maximo, media))
    nll = lambda th: -stats.nbinom.logpmf(z, np.exp(th[0]), 1 / (1 + np.exp(-th[1]))).sum()
    r0 = media ** 2 / max(varianza - media, 1e-6)
    inicio = [math.log(r0), math.log((r0 / (r0 + media)) / (1 - r0 / (r0 + media)))]
    th = optimize.minimize(nll, inicio, method="Nelder-Mead").x
    r_nb, p_nb = float(np.exp(th[0])), float(1 / (1 + np.exp(-th[1])))
    p_bn = con_cola(stats.nbinom.pmf(valores, r_nb, p_nb), stats.nbinom.sf(maximo, r_nb, p_nb))

    grupos = [(0, 0), (1, 1), (2, 2), (3, 3), (4, 4), (5, 9), (10, 19), (20, 49), (50, 99), (100, maximo)]
    tdf, acumulada = [], 0
    for desde, hasta in grupos:
        fi = int(observadas[desde:hasta + 1].sum())
        acumulada += fi
        tdf.append({"desde": desde + 1, "hasta": hasta + 1, "fi": fi, "hi": fi / n, "Fi": acumulada,
                    "Hi": acumulada / n, "p_poisson": float(p_pois[desde:hasta + 1].sum()),
                    "p_binomial_negativa": float(p_bn[desde:hasta + 1].sum())})
    return {
        "variable": "Pozos por campo", "unidad_estadistica": "campo", "n": n,
        "media": float(x.mean()), "varianza": varianza, "mediana": float(np.median(x)),
        "maximo": int(x.max()), "minimo": int(x.min()),
        "poisson": {"lambda": media, "prueba": chi_cuadrado(observadas, n * p_pois, 1)},
        "binomial_negativa": {"r": r_nb, "p": p_nb, "prueba": chi_cuadrado(observadas, n * p_bn, 2)},
        "tdf": tdf,
    }


# ---------------------------------------------------------------- 4.2.17 Submuestras aleatorias

def pruebas_discretas(dias):
    f = np.bincount(dias, minlength=32).astype(float)
    n = f.sum()
    x = np.arange(32)
    media, varianza = dias.mean(), dias.var(ddof=1)
    p = media / 31
    binom = stats.binom.pmf(x, 31, p)
    rho = max((varianza / (31 * p * (1 - p)) - 1) / 30, 1e-3)
    suma = (1 - rho) / rho
    inicio = np.log([p * suma, (1 - p) * suma])
    nll = lambda t: -(f * stats.betabinom.logpmf(x, 31, *np.exp(t))).sum()
    a, b = np.exp(optimize.minimize(nll, inicio, method="Nelder-Mead").x)
    return chi_cuadrado(f, n * binom, 1), chi_cuadrado(f, n * stats.betabinom.pmf(x, 31, a, b), 2)


def prueba_lognormal(y, bordes_t):
    ln_y = np.log(y)
    mu, sigma = ln_y.mean(), ln_y.std(ddof=0)
    acumulada = stats.norm.cdf(bordes_t * np.log(10), mu, sigma)
    prob = np.diff(acumulada)
    prob[0] += acumulada[0]
    prob[-1] += 1 - acumulada[-1]
    t = np.log10(y)
    indice = np.clip(np.searchsorted(bordes_t, t, side="right") - 1, 0, len(prob) - 1)
    observadas = np.bincount(indice, minlength=len(prob)).astype(float)
    return chi_cuadrado(observadas, len(y) * prob, 2)


def resumen_prueba(p):
    return {k: p[k] for k in ("estadistico", "grados_libertad", "valor_critico", "p_valor", "rechaza")}


def construir_submuestras(pozos, bordes_t, tamano=300, replicas=500):
    rng = np.random.default_rng(SEMILLA)
    dias = pozos["dias"].to_numpy()
    oleo = pozos[OLEO].to_numpy()

    def evaluar(indices):
        binom, bb = pruebas_discretas(dias[indices])
        y = oleo[indices]
        return binom, bb, prueba_lognormal(y[y > 0], bordes_t), int((y > 0).sum())

    completo = evaluar(np.arange(len(pozos)))
    muestra = evaluar(rng.choice(len(pozos), size=tamano, replace=False))
    rechazos = np.zeros(3)
    for _ in range(replicas):
        resultado = evaluar(rng.choice(len(pozos), size=tamano, replace=False))
        rechazos += [resultado[0]["rechaza"], resultado[1]["rechaza"], resultado[2]["rechaza"]]
    modelos = ["Binomial (X)", "Beta-binomial (X)", "Lognormal (Y)"]
    return {
        "semilla": SEMILLA, "tamano": tamano, "replicas": replicas,
        "n_productores_submuestra": muestra[3],
        "filas": [{"modelo": m, "completa": resumen_prueba(completo[i]), "submuestra": resumen_prueba(muestra[i]),
                   "porcentaje_rechazo": float(rechazos[i] / replicas)} for i, m in enumerate(modelos)],
    }


# ---------------------------------------------------------------- 4.2.18 Validación con 2023 completo

def csv_mensual(carpeta, mes):
    ruta = carpeta / f"2023_{mes}_producao_Terra.csv"
    if not ruta.exists():
        carpeta.mkdir(parents=True, exist_ok=True)
        with urllib.request.urlopen(urllib.request.Request(URL_ANP.format(mes=mes),
                                                           headers={"User-Agent": "Mozilla/5.0"})) as r:
            with zipfile.ZipFile(io.BytesIO(r.read())) as z:
                ruta.write_bytes(z.read(f"2023_{mes}_producao_Terra.csv"))
    return ruta


def leer_mensual(ruta):
    # Desde abril la columna se llama «Nome Poço ANP» y de octubre a diciembre el CSV viene en Latin-1.
    for codificacion in ("utf-8-sig", "latin-1"):
        try:
            datos = pd.read_csv(ruta, sep=";", decimal=",", thousands=".", encoding=codificacion,
                                on_bad_lines="skip", low_memory=False)
            break
        except UnicodeDecodeError:
            continue
    datos = datos.rename(columns={"Nome Poço ANP": "Nome Poço"})
    datos = datos[datos["Estado"].notna() & datos["Estado"].astype(str).str.strip().ne("")].copy()
    datos["Nome Poço"] = datos["Nome Poço"].astype(str).str.strip()
    datos[OLEO] = numerico(datos[OLEO])
    return datos


def construir_validacion(carpeta):
    continuo = json.loads((DATA / "modelo_continuo.json").read_text(encoding="utf-8"))
    ic = {i["simbolo"]: i for i in continuo["intervalos"]}
    meses, todos = [], []
    for numero in range(1, 13):
        mes = f"{numero:02d}"
        oleo = leer_mensual(csv_mensual(carpeta, mes)).groupby("Nome Poço")[OLEO].sum()
        y = oleo[oleo > 0].to_numpy()
        todos.append(y)
        meses.append({"mes": mes, "pozos": int(len(oleo)), "productores": int(len(y)),
                      "media": float(y.mean()), "mediana": float(np.median(y))})
    anual = np.concatenate(todos)
    media, mediana = float(anual.mean()), float(np.median(anual))
    dentro = lambda v, i: i["inferior"] <= v <= i["superior"]
    for m in meses:
        m["media_en_ic"] = dentro(m["media"], ic["E[Y]"])
        m["mediana_en_ic"] = dentro(m["mediana"], ic["e^μ"])
        m["mediana_en_ic_orden"] = dentro(m["mediana"], ic["Me"])
    return {
        "fuente": "ANP · 2023_MM_producao_Terra.csv (enero a diciembre de 2023)",
        "ic_media": [ic["E[Y]"]["inferior"], ic["E[Y]"]["superior"]],
        "ic_mediana": [ic["e^μ"]["inferior"], ic["e^μ"]["superior"]],
        "ic_mediana_orden": [ic["Me"]["inferior"], ic["Me"]["superior"]],
        "anual": {"observaciones": int(len(anual)), "media": media, "mediana": mediana,
                  "media_en_ic": dentro(media, ic["E[Y]"]),
                  "mediana_en_ic": dentro(mediana, ic["e^μ"]),
                  "mediana_en_ic_orden": dentro(mediana, ic["Me"])},
        "meses": meses,
        "meses_media_en_ic": sum(m["media_en_ic"] for m in meses),
        "meses_mediana_en_ic": sum(m["mediana_en_ic"] for m in meses),
        "meses_mediana_en_ic_orden": sum(m["mediana_en_ic_orden"] for m in meses),
    }


def escribir(nombre, contenido):
    ruta = DATA / nombre
    ruta.write_text(json.dumps(contenido, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")
    print(f"Generado {ruta.relative_to(BASE.parent)}")


def main():
    parser = argparse.ArgumentParser(description=__doc__.splitlines()[0])
    parser.add_argument("csv", type=Path)
    parser.add_argument("--anual", type=Path, help="carpeta con (o para descargar) los 12 CSV de 2023")
    args = parser.parse_args()

    datos = leer_registros(args.csv)
    pozos = consolidar_pozos(datos)
    escribir("variables_estadistica.json", construir_variables(datos, pozos))
    escribir("distribucion_frecuencias.json", construir_frecuencias(pozos))
    escribir("indicadores_descriptivos.json", construir_indicadores(pozos))

    vac = json.loads((DATA / "vac_oleo.json").read_text(encoding="utf-8"))
    bordes_t = np.array([c["t_li"] for c in vac["clases"]] + [vac["clases"][-1]["t_ls"]])
    agua = pozos[AGUA].to_numpy()
    escribir("inferencial_ampliacion.json", {
        "fuente": "2023_01_producao_Terra.csv",
        "agua": {**ajustar_continua(agua[agua > 0], "Agua por pozo", "bbl/día"),
                 "excluidos_cero": int((agua == 0).sum())},
        "pozos_por_campo": ajustar_pozos_por_campo(datos),
        "submuestras": construir_submuestras(pozos, bordes_t),
    })
    if args.anual:
        escribir("validacion_anual.json", construir_validacion(args.anual))


if __name__ == "__main__":
    main()
