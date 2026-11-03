"""4.3.1 Regresión clásica: genera data/regresion.json.

Requiere pandas, numpy y scipy. Ejecutar desde la raíz del repositorio:

    .venv/bin/python scripts/3_regresion.py data/2023_01_producao_Terra.csv

Unidad estadística: campo de producción con óleo > 0 en enero de 2023.
x  = número de pozos del campo, y = óleo del campo (bbl/día), x2 = gas natural total (Mm³/día).
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

# Se reutiliza la lectura del CSV (encabezado partido del gas, formato brasileño).
_spec = importlib.util.spec_from_file_location("desc", BASE / "2_descriptiva_inferencial.py")
desc = importlib.util.module_from_spec(_spec)
_spec.loader.exec_module(desc)


def pearson(a, b):
    return float(np.corrcoef(a, b)[0, 1])


def r2(y, ajuste):
    return float(1 - ((y - ajuste) ** 2).sum() / ((y - y.mean()) ** 2).sum())


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


def modelos_simples(x, y):
    """Cada modelo se ajusta por mínimos cuadrados sobre su forma linealizada.

    r y R² se reportan en la escala linealizada (la que minimiza el método) y,
    para comparar todos los modelos entre sí, también R² en la escala original de y.
    """
    lx, ly = np.log(x), np.log(y)
    resultados = []

    def agregar(clave, nombre, ecuacion, linealizacion, parametros, prediccion, r_lineal, r2_lineal, formula_param):
        ajuste = prediccion(x)
        resultados.append({
            "clave": clave, "modelo": nombre, "ecuacion": ecuacion, "linealizacion": linealizacion,
            "parametros": parametros, "formula_parametros": formula_param,
            "r": r_lineal, "r2": r2_lineal, "no_determinacion": 1 - r2_lineal,
            "r2_original": r2(y, ajuste),
            "error_estandar": float(math.sqrt(((y - ajuste) ** 2).sum() / (len(y) - len(parametros)))),
        })

    b, a = np.polyfit(x, y, 1)
    agregar("lineal", "Lineal", "y = a + b·x", "y = a + b·x",
            {"a": float(a), "b": float(b)}, lambda v: a + b * v,
            pearson(x, y), r2(y, a + b * x),
            "b = Σ(x−x̄)(y−ȳ) / Σ(x−x̄)²; a = ȳ − b·x̄")

    B, A = np.polyfit(lx, ly, 1)
    agregar("potencial", "Potencial", "y = a·xᵇ", "ln y = ln a + b·ln x",
            {"a": float(math.exp(A)), "b": float(B)}, lambda v: math.exp(A) * v ** B,
            pearson(lx, ly), r2(ly, A + B * lx),
            "regresión lineal de ln y sobre ln x; a = e^(ordenada)")

    B, A = np.polyfit(x, ly, 1)
    agregar("exponencial", "Exponencial", "y = a·eᵇˣ", "ln y = ln a + b·x",
            {"a": float(math.exp(A)), "b": float(B)}, lambda v: math.exp(A) * np.exp(B * v),
            pearson(x, ly), r2(ly, A + B * x),
            "regresión lineal de ln y sobre x; a = e^(ordenada)")

    b, a = np.polyfit(lx, y, 1)
    agregar("logaritmico", "Logarítmico", "y = a + b·ln x", "y = a + b·ln x",
            {"a": float(a), "b": float(b)}, lambda v: a + b * np.log(v),
            pearson(lx, y), r2(y, a + b * lx),
            "regresión lineal de y sobre ln x")

    c2, c1, c0 = np.polyfit(x, y, 2)
    ajuste = np.polyval([c2, c1, c0], x)
    r2_pol = r2(y, ajuste)
    # En el polinómico, r es el coeficiente de correlación múltiple R = √R².
    agregar("polinomico", "Polinómico (grado 2)", "y = a + b·x + c·x²", "y = a + b·x + c·x²",
            {"a": float(c0), "b": float(c1), "c": float(c2)}, lambda v: np.polyval([c2, c1, c0], v),
            math.sqrt(r2_pol), r2_pol,
            "mínimos cuadrados con x y x² (ecuaciones normales)")

    # Curvas para graficar, evaluadas en una rejilla logarítmica de x.
    rejilla = np.unique(np.round(np.geomspace(x.min(), x.max(), 120), 4))
    predictores = {
        "lineal": lambda v: resultados[0]["parametros"]["a"] + resultados[0]["parametros"]["b"] * v,
        "potencial": lambda v: resultados[1]["parametros"]["a"] * v ** resultados[1]["parametros"]["b"],
        "exponencial": lambda v: resultados[2]["parametros"]["a"] * np.exp(resultados[2]["parametros"]["b"] * v),
        "logaritmico": lambda v: resultados[3]["parametros"]["a"] + resultados[3]["parametros"]["b"] * np.log(v),
        "polinomico": lambda v: np.polyval([c2, c1, c0], v),
    }
    curvas = {"x": rejilla.tolist(),
              **{k: [float(v) for v in f(rejilla)] for k, f in predictores.items()}}
    return resultados, curvas


def regresion_multiple(x1, x2, y):
    n, k = len(y), 2
    X = np.column_stack([np.ones(n), x1, x2])
    beta, *_ = np.linalg.lstsq(X, y, rcond=None)
    ajuste = X @ beta
    residuos = y - ajuste
    sce = float((residuos ** 2).sum())
    stc = float(((y - y.mean()) ** 2).sum())
    r2_m = 1 - sce / stc
    gl = n - k - 1
    s2 = sce / gl
    cov = s2 * np.linalg.inv(X.T @ X)
    se = np.sqrt(np.diag(cov))
    t = beta / se
    f = (r2_m / k) / ((1 - r2_m) / gl)
    nombres = [("b₀", "Intercepto"), ("b₁", "Pozos del campo (x₁)"), ("b₂", "Gas natural total (x₂)")]
    vif = 1 / (1 - pearson(x1, x2) ** 2)
    return {
        "ecuacion": "y = b₀ + b₁·x₁ + b₂·x₂",
        "n": n,
        "coeficientes": [{"simbolo": s, "termino": nom, "valor": float(b), "error_estandar": float(e),
                          "t": float(tv), "p_valor": float(2 * stats.t.sf(abs(tv), gl))}
                         for (s, nom), b, e, tv in zip(nombres, beta, se, t)],
        "R": math.sqrt(r2_m), "r2": r2_m, "no_determinacion": 1 - r2_m,
        "r2_ajustado": 1 - (1 - r2_m) * (n - 1) / gl,
        "error_estandar": math.sqrt(s2),
        "F": f, "gl": [k, gl], "p_valor_F": float(stats.f.sf(f, k, gl)),
        "r_x1_y": pearson(x1, y), "r_x2_y": pearson(x2, y), "r_x1_x2": pearson(x1, x2), "vif": vif,
        "r2_solo_x1": pearson(x1, y) ** 2,
        "residuos_extremos": [],
        "ajuste": ajuste,
    }


def main():
    parser = argparse.ArgumentParser(description=__doc__.splitlines()[0])
    parser.add_argument("csv", type=Path)
    args = parser.parse_args()

    datos = desc.leer_registros(args.csv)
    campos, total = construir_campos(datos)
    x = campos["x"].to_numpy(dtype=float)
    y = campos["y"].to_numpy(dtype=float)
    x2 = campos["x2"].to_numpy(dtype=float)

    simples, curvas = modelos_simples(x, y)
    multiple = regresion_multiple(x, x2, y)
    ajuste = multiple.pop("ajuste")
    residuos = y - ajuste
    for i in np.argsort(-np.abs(residuos))[:3]:
        multiple["residuos_extremos"].append({"campo": campos.loc[i, "Campo"], "y": float(y[i]),
                                              "y_estimado": float(ajuste[i]), "residuo": float(residuos[i])})

    pot = next(m for m in simples if m["clave"] == "potencial")
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
        "resumen": {
            "x": {"min": float(x.min()), "max": float(x.max()), "media": float(x.mean()), "mediana": float(np.median(x))},
            "y": {"min": float(y.min()), "max": float(y.max()), "media": float(y.mean()), "mediana": float(np.median(y))},
            "x2": {"min": float(x2.min()), "max": float(x2.max()), "media": float(x2.mean()), "mediana": float(np.median(x2))},
        },
        "pares": [{"campo": r.Campo, "estado": r.estado, "x": int(r.x), "y": float(r.y), "x2": float(r.x2),
                   "y_potencial": float(pot["parametros"]["a"] * r.x ** pot["parametros"]["b"]),
                   "y_multiple": float(ajuste[i])}
                  for i, r in enumerate(campos.itertuples())],
        "modelos": simples,
        "elegido": "potencial",
        "curvas": curvas,
        "multiple": multiple,
    }
    ruta = DATA / "regresion.json"
    ruta.write_text(json.dumps(salida, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")
    print(f"Generado {ruta.relative_to(BASE.parent)}: n={salida['n']} campos, "
          f"R² múltiple={multiple['r2']:.4f}")


if __name__ == "__main__":
    main()
