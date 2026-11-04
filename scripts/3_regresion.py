"""4.3.1 Regresión clásica: genera data/regresion.json.

Requiere pandas, numpy y scipy. Ejecutar desde la raíz del repositorio:

    .venv/bin/python scripts/3_regresion.py data/2023_01_producao_Terra.csv

Unidad estadística: campo de producción con óleo > 0 en enero de 2023.
x = x₁ = número de pozos del campo, y = óleo del campo (bbl/día), x₂ = gas natural total (Mm³/día).
"""

import argparse
import importlib.util
import json
import math
from pathlib import Path

import numpy as np
from scipy import stats

BASE = Path(__file__).resolve().parent
DATA = BASE.parent / "data"
ALFA = 0.05

# Se reutiliza la lectura del CSV (encabezado partido del gas, formato brasileño).
_spec = importlib.util.spec_from_file_location("desc", BASE / "2_descriptiva_inferencial.py")
desc = importlib.util.module_from_spec(_spec)
_spec.loader.exec_module(desc)


def r2(y, ajuste):
    return float(1 - ((y - ajuste) ** 2).sum() / ((y - y.mean()) ** 2).sum())


def mco(columnas, respuesta):
    """Mínimos cuadrados ordinarios con intercepto: coeficientes, inferencia e influencia."""
    n = len(respuesta)
    X = np.column_stack([np.ones(n), *columnas])
    k = X.shape[1]
    xtx_inv = np.linalg.inv(X.T @ X)
    beta = xtx_inv @ X.T @ respuesta
    ajuste = X @ beta
    residuos = respuesta - ajuste
    gl = n - k
    s2 = float((residuos ** 2).sum() / gl)
    se = np.sqrt(np.diag(xtx_inv) * s2)
    t = beta / se
    palanca = np.einsum("ij,jk,ik->i", X, xtx_inv, X)
    cook = residuos ** 2 / (k * s2) * palanca / (1 - palanca) ** 2
    determinacion = r2(respuesta, ajuste)
    return {
        "beta": beta, "se": se, "t": t, "p": 2 * stats.t.sf(np.abs(t), gl), "gl": gl,
        "s": math.sqrt(s2), "r2": determinacion, "ajuste": ajuste, "residuos": residuos,
        "palanca": palanca, "cook": cook, "t_critico": float(stats.t.ppf(1 - ALFA / 2, gl)),
    }


def influyentes(campos, ajuste_mco, cuantos=5):
    # Criterio usual: D de Cook > 4/n señala un punto influyente; D > 1, muy influyente.
    orden = np.argsort(-ajuste_mco["cook"])[:cuantos]
    return [{"campo": campos.loc[i, "Campo"], "x": int(campos.loc[i, "x"]), "y": float(campos.loc[i, "y"]),
             "x2": float(campos.loc[i, "x2"]), "cook": float(ajuste_mco["cook"][i]),
             "palanca": float(ajuste_mco["palanca"][i])} for i in orden]


def sensibilidad(columnas, respuesta, ajuste_mco):
    """Reajusta sin los puntos con D de Cook > 1 para medir cuánto dependen de ellos los resultados."""
    fuera = ajuste_mco["cook"] > 1
    if not fuera.any():
        return {"excluidos": 0, "r2": ajuste_mco["r2"], "beta": [float(b) for b in ajuste_mco["beta"]]}
    sin = mco([c[~fuera] for c in columnas], respuesta[~fuera])
    return {"excluidos": int(fuera.sum()), "r2": sin["r2"], "beta": [float(b) for b in sin["beta"]]}


def construir_campos(datos):
    # Los pozos repetidos aparecen una vez por campo y sus volúmenes ya vienen repartidos por campo:
    # se suman las filas de cada campo y se cuentan sus pozos distintos.
    campos = datos.groupby("Campo").agg(
        estado=("Estado", "first"),
        x=("Nome Poço", "nunique"),
        y=(desc.OLEO, "sum"),
        x2=(desc.GAS_T, "sum"),
    ).reset_index()
    total = len(campos)
    campos = campos[campos["y"] > 0].sort_values("y", ascending=False).reset_index(drop=True)
    return campos, total


# Cada modelo simple: transformación de x (columnas del diseño), de y, y regreso a la escala de y.
MODELOS = [
    {"clave": "lineal", "modelo": "Lineal", "ecuacion": "y = a + b·x", "linealizacion": "y = a + b·x",
     "X": "x", "Y": "y", "formula": "b = (nΣxy − ΣxΣy) / (nΣx² − (Σx)²); a = ȳ − b·x̄"},
    {"clave": "potencial", "modelo": "Potencial", "ecuacion": "y = a·xᵇ", "linealizacion": "ln y = ln a + b·ln x",
     "X": "ln x", "Y": "ln y", "formula": "recta de ln y sobre ln x; a = e^A"},
    {"clave": "exponencial", "modelo": "Exponencial", "ecuacion": "y = a·eᵇˣ", "linealizacion": "ln y = ln a + b·x",
     "X": "x", "Y": "ln y", "formula": "recta de ln y sobre x; a = e^A"},
    {"clave": "logaritmico", "modelo": "Logarítmico", "ecuacion": "y = a + b·ln x", "linealizacion": "y = a + b·ln x",
     "X": "ln x", "Y": "y", "formula": "recta de y sobre ln x"},
    {"clave": "polinomico", "modelo": "Polinómico (grado 2)", "ecuacion": "y = a + b·x + c·x²",
     "linealizacion": "y = a + b·x + c·x²", "X": "x, x²", "Y": "y",
     "formula": "mínimos cuadrados con x y x² (ecuaciones normales)"},
]


def modelos_simples(campos):
    x = campos["x"].to_numpy(dtype=float)
    y = campos["y"].to_numpy(dtype=float)
    lx, ly = np.log(x), np.log(y)
    disenos = {"x": [x], "ln x": [lx], "x, x²": [x, x ** 2]}
    respuestas = {"y": y, "ln y": ly}

    def prediccion(clave, p, v):
        if clave == "lineal":
            return p["a"] + p["b"] * v
        if clave == "potencial":
            return p["a"] * v ** p["b"]
        if clave == "exponencial":
            return p["a"] * np.exp(p["b"] * v)
        if clave == "logaritmico":
            return p["a"] + p["b"] * np.log(v)
        return p["a"] + p["b"] * v + p["c"] * v ** 2

    resultados = []
    for m in MODELOS:
        ajuste = mco(disenos[m["X"]], respuestas[m["Y"]])
        A, b = float(ajuste["beta"][0]), float(ajuste["beta"][1])
        parametros = {"a": math.exp(A) if m["Y"] == "ln y" else A, "b": b}
        if m["clave"] == "polinomico":
            parametros["c"] = float(ajuste["beta"][2])
        yh = prediccion(m["clave"], parametros, x)
        positivo = bool((yh > 0).all())
        r = math.sqrt(ajuste["r2"]) if m["clave"] == "polinomico" else float(np.corrcoef(disenos[m["X"]][0], respuestas[m["Y"]])[0, 1])
        t_r = r * math.sqrt(len(x) - 2) / math.sqrt(1 - r ** 2)
        p_r = float(2 * stats.t.sf(abs(t_r), len(x) - 2))
        prueba_global = None
        if m["clave"] == "polinomico":
            # Con dos regresores (x, x²) la significancia global se prueba con F(2, n − 3), no con la t de r.
            f = (ajuste["r2"] / 2) / ((1 - ajuste["r2"]) / ajuste["gl"])
            p_r = float(stats.f.sf(f, 2, ajuste["gl"]))
            prueba_global = {"F": float(f), "gl": [2, ajuste["gl"]]}
        resultados.append({
            **{k: m[k] for k in ("clave", "modelo", "ecuacion", "linealizacion")},
            "formula_parametros": m["formula"], "escala_ajuste": {"X": m["X"], "Y": m["Y"]},
            "A": A, "parametros": parametros,
            # r y R² en la forma linealizada: es lo que minimiza cada ajuste.
            "r": r, "r2": ajuste["r2"], "no_determinacion": 1 - ajuste["r2"],
            "t_r": t_r, "p_r": p_r, "prueba_global": prueba_global,
            "error_estandar_lineal": ajuste["s"],
            "coeficientes": [{"simbolo": s, "valor": float(v), "error_estandar": float(e), "t": float(tv), "p_valor": float(pv)}
                             for s, v, e, tv, pv in zip(["A", "b", "c"], ajuste["beta"], ajuste["se"], ajuste["t"], ajuste["p"])],
            "gl": ajuste["gl"], "t_critico": ajuste["t_critico"],
            # Métricas en escalas comunes para comparar modelos con distinta transformación de y.
            "comparacion": {
                "r2_log": r2(ly, np.log(yh)) if positivo else None,
                "r2_y": r2(y, yh),
                "error_mediano_relativo": float(np.median(np.abs(y - yh) / y)),
                "predicciones_positivas": positivo,
                "y_minimo_estimado": float(yh.min()),
            },
            "influyentes": influyentes(campos, ajuste),
            "n_influyentes_4n": int((ajuste["cook"] > 4 / len(x)).sum()),
            "n_cook_mayor_1": int((ajuste["cook"] > 1).sum()),
            "sensibilidad": sensibilidad(disenos[m["X"]], respuestas[m["Y"]], ajuste),
            "normalidad_residuos_p": float(stats.shapiro(ajuste["residuos"]).pvalue),
            "residuos": [float(v) for v in ajuste["residuos"]],
        })
        if m["Y"] == "ln y":
            # Al volver de ln y a y el modelo estima la mediana; la media requiere el factor de Duan.
            resultados[-1]["factor_smearing"] = float(np.mean(np.exp(ajuste["residuos"])))

    rejilla = np.unique(np.round(np.geomspace(x.min(), x.max(), 120), 4))
    curvas = {"x": rejilla.tolist()}
    for m in resultados:
        with np.errstate(over="ignore"):
            valores = prediccion(m["clave"], m["parametros"], rejilla)
        curvas[m["clave"]] = [float(v) if np.isfinite(v) else None for v in valores]
    return resultados, curvas


def regresion_multiple(campos):
    x1 = campos["x"].to_numpy(dtype=float)
    x2 = campos["x2"].to_numpy(dtype=float)
    y = campos["y"].to_numpy(dtype=float)
    n = len(y)

    def resumen(columnas, respuesta, simbolos, terminos, escala):
        ajuste = mco(columnas, respuesta)
        k = len(columnas)
        f = (ajuste["r2"] / k) / ((1 - ajuste["r2"]) / ajuste["gl"])
        r12 = float(np.corrcoef(columnas[0], columnas[1])[0, 1])
        return {
            "escala": escala,
            "coeficientes": [{"simbolo": s, "termino": t, "valor": float(v), "error_estandar": float(e),
                              "t": float(tv), "p_valor": float(pv)}
                             for s, t, v, e, tv, pv in zip(simbolos, terminos, ajuste["beta"], ajuste["se"], ajuste["t"], ajuste["p"])],
            "R": math.sqrt(ajuste["r2"]), "r2": ajuste["r2"], "no_determinacion": 1 - ajuste["r2"],
            "r2_ajustado": 1 - (1 - ajuste["r2"]) * (n - 1) / ajuste["gl"],
            "error_estandar": ajuste["s"], "F": f, "gl": [k, ajuste["gl"]],
            "p_valor_F": float(stats.f.sf(f, k, ajuste["gl"])), "t_critico": ajuste["t_critico"],
            "r_x1_x2": r12, "vif": 1 / (1 - r12 ** 2),
            "r2_solo_x1": float(np.corrcoef(columnas[0], respuesta)[0, 1] ** 2),
            "influyentes": influyentes(campos, ajuste),
            "n_cook_mayor_1": int((ajuste["cook"] > 1).sum()),
            "sensibilidad": sensibilidad(columnas, respuesta, ajuste),
            "normalidad_residuos_p": float(stats.shapiro(ajuste["residuos"]).pvalue),
            "_ajuste": ajuste["ajuste"],
        }

    lineal = resumen([x1, x2], y, ["b₀", "b₁", "b₂"],
                     ["Intercepto", "Pozos del campo (x₁)", "Gas natural total (x₂)"], "y")
    logaritmica = resumen([np.log(x1), np.log(x2)], np.log(y), ["b₀", "b₁", "b₂"],
                          ["Intercepto (ln)", "ln pozos (ln x₁)", "ln gas (ln x₂)"], "ln y")
    ajuste_lineal = lineal.pop("_ajuste")
    ajuste_log = np.exp(logaritmica.pop("_ajuste"))
    lineal["ecuacion"] = "y = b₀ + b₁·x₁ + b₂·x₂"
    logaritmica["ecuacion"] = "ln y = b₀ + b₁·ln x₁ + b₂·ln x₂  ⇔  y = e^b₀ · x₁^b₁ · x₂^b₂"
    for modelo, yh in ((lineal, ajuste_lineal), (logaritmica, ajuste_log)):
        positivo = bool((yh > 0).all())
        modelo["comparacion"] = {
            "r2_log": r2(np.log(y), np.log(yh)) if positivo else None,
            "r2_y": r2(y, yh),
            "error_mediano_relativo": float(np.median(np.abs(y - yh) / y)),
        }
    return {"n": n, "lineal": lineal, "logaritmica": logaritmica, "recomendado": "logaritmica"}, ajuste_lineal, ajuste_log


def main():
    parser = argparse.ArgumentParser(description=__doc__.splitlines()[0])
    parser.add_argument("csv", type=Path)
    args = parser.parse_args()

    datos = desc.leer_registros(args.csv)
    campos, total = construir_campos(datos)
    x = campos["x"].to_numpy(dtype=float)
    y = campos["y"].to_numpy(dtype=float)
    x2 = campos["x2"].to_numpy(dtype=float)

    simples, curvas = modelos_simples(campos)
    multiple, ajuste_lineal, ajuste_log = regresion_multiple(campos)
    pot = next(m for m in simples if m["clave"] == "potencial")
    residuos = {m["clave"]: m.pop("residuos") for m in simples}

    salida = {
        "fuente": Path(args.csv).name,
        "unidad": "campo de producción con óleo > 0",
        "n": len(campos),
        "campos_totales": total,
        "campos_sin_oleo": total - len(campos),
        "variables": {
            "x": {"simbolo": "x", "nombre": "Pozos del campo", "unidad": "pozos"},
            "y": {"simbolo": "y", "nombre": "Óleo del campo", "unidad": "bbl/día"},
            "x2": {"simbolo": "x₂", "nombre": "Gas natural total del campo", "unidad": "Mm³/día"},
        },
        "resumen": {nombre: {"min": float(v.min()), "max": float(v.max()), "media": float(v.mean()),
                             "mediana": float(np.median(v))} for nombre, v in (("x", x), ("y", y), ("x2", x2))},
        "pares": [{"campo": r.Campo, "estado": r.estado, "x": int(r.x), "y": float(r.y), "x2": float(r.x2),
                   "y_potencial": float(pot["parametros"]["a"] * r.x ** pot["parametros"]["b"]),
                   "y_multiple": float(ajuste_lineal[i]), "y_multiple_log": float(ajuste_log[i]),
                   "residuos": {k: v[i] for k, v in residuos.items()}}
                  for i, r in enumerate(campos.itertuples())],
        "modelos": simples,
        "elegido": "potencial",
        "curvas": curvas,
        "multiple": multiple,
    }
    ruta = DATA / "regresion.json"
    ruta.write_text(json.dumps(salida, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")
    print(f"Generado {ruta.relative_to(BASE.parent)}: n={salida['n']} campos")


if __name__ == "__main__":
    main()
