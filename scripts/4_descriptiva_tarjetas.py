"""Genera el bloque de tarjetas "Análisis por tipo de variable" de Estadistica.html.

Lee el JSON del paquete de entregables (recursos/descriptiva_brasil/datos/descriptiva_brasil.json)
y reescribe, dentro de Estadistica.html, el bloque delimitado por los comentarios

    <!-- TARJETAS-VARIABLES:INICIO --> ... <!-- TARJETAS-VARIABLES:FIN -->

Cada tarjeta es intencionalmente breve: tipo de medición, nombre de la variable y enlace
al informe. Las 17 variables con informe individual salen del JSON del paquete y enlazan a
su análisis. Las 10 variables que solo están documentadas en la tabla de variables salen de
data/variables_estadistica.json (campo "tarjeta"), se marcan con su subtipo y no llevan
enlace porque no tienen informe propio.

El HTML es estático a propósito: las 27 tarjetas existen aunque el navegador no ejecute
JavaScript.

Uso desde la raíz del repositorio (no requiere pandas ni scipy):

    python3 scripts/4_descriptiva_tarjetas.py

Argumentos opcionales: --json RUTA_JSON, --tabla RUTA_JSON y --pagina RUTA_HTML.
"""

import argparse
import html
import json
import re
from pathlib import Path

BASE = Path(__file__).resolve().parent
RAIZ = BASE.parent
JSON_POR_DEFECTO = RAIZ / "recursos" / "descriptiva_brasil" / "datos" / "descriptiva_brasil.json"
TABLA_POR_DEFECTO = RAIZ / "data" / "variables_estadistica.json"
PAGINA_POR_DEFECTO = RAIZ / "Estadistica.html"
BASE_RECURSOS = "recursos/descriptiva_brasil"

INICIO = "<!-- TARJETAS-VARIABLES:INICIO -->"
FIN = "<!-- TARJETAS-VARIABLES:FIN -->"

# Orden de los grupos y descripción del método de cada uno.
GRUPOS = [
    {
        "id": "grupo-nominal",
        "titulo": "Cualitativas nominales",
        "clave": "Nominal",
        "tipo": "Cualitativa",
        "descripcion": "Categorías sin orden natural. Se cuenta cuántos pozos hay en cada una: "
                       "no se calculan medias, medianas ni desviaciones, porque promediar nombres "
                       "no significa nada.",
    },
    {
        "id": "grupo-ordinal",
        "titulo": "Cualitativas ordinales",
        "clave": "Ordinal",
        "tipo": "Cualitativa",
        "descripcion": "Categorías con un orden natural (pesado → mediano → ligero; inactivo → parcial → "
                       "continuo). Se informa la moda y la mediana categórica; nunca el promedio de los "
                       "códigos de las clases.",
    },
    {
        "id": "grupo-discreta",
        "titulo": "Cuantitativas discretas",
        "clave": "Discreta",
        "tipo": "Cuantitativa",
        "descripcion": "Valores que se cuentan. Los días son la parte entera de las horas entre 24; los "
                       "pozos por campo cuentan cuántos pozos producen en cada campo, y allí la unidad es "
                       "el campo (n = 221), no el pozo.",
    },
    {
        "id": "grupo-continua",
        "titulo": "Cuantitativas continuas",
        "clave": "Continua",
        "tipo": "Cuantitativa",
        "descripcion": "Mediciones. Se resumen con tendencia central, dispersión y forma. El tiempo de "
                       "producción es continuo: se mide, y el archivo solo lo registra en horas enteras. "
                       "Los histogramas usan clases de igual ancho en log₁₀ para los pozos con producción, "
                       "porque la distribución está muy sesgada.",
    },
]


def texto(valor):
    return html.escape(str(valor))


def enlace(ruta, nombre):
    return (
        f'                  <a class="tarjeta-variable-enlace" href="{texto(ruta)}" target="_blank" rel="noopener">'
        f'Ver análisis<span class="sr-only"> de {texto(nombre)} (se abre en una pestaña nueva)</span>'
        '<svg class="tarjeta-variable-flecha" viewBox="0 0 24 24" aria-hidden="true" focusable="false">'
        '<path d="M7 17 17 7M9 7h8v8"/></svg></a>'
    )


def tarjeta(variable, grupo):
    """Tarjeta breve: subtipo, nombre y enlace al informe individual."""
    ruta = f"{BASE_RECURSOS}/{variable['ruta']}"
    return [
        '                <article class="tarjeta-variable">',
        f'                  <p class="tarjeta-variable-tipo">{texto(variable["subtipo"])}</p>',
        f'                  <h4 class="tarjeta-variable-nombre">{texto(variable["nombre"])}</h4>',
        enlace(ruta, variable["nombre"]),
        '                </article>',
    ]


def tarjeta_extra(variable):
    """Tarjeta breve de una variable documentada solo en la tabla, sin informe."""
    return [
        '                <article class="tarjeta-variable">',
        f'                  <p class="tarjeta-variable-tipo">{texto(variable["subtipo"])}</p>',
        f'                  <h4 class="tarjeta-variable-nombre">{texto(variable["traduccion"])}</h4>',
        '                </article>',
    ]


def generar(datos, tabla=None):
    extras = []
    if tabla:
        nombres = {v["nombre"] for v in datos["variables"]}
        extras = [v for v in tabla["variables"]
                  if v.get("tarjeta") and v["traduccion"] not in nombres]

    lineas = []
    for grupo in GRUPOS:
        variables = [v for v in datos["variables"]
                     if v.get("subtipo") == grupo["clave"] and v.get("tipo") == grupo["tipo"]]
        nuevas = [v for v in extras
                  if v.get("subtipo") == grupo["clave"] and v.get("tipo") == grupo["tipo"]]
        total = len(variables) + len(nuevas)
        if not total:
            continue
        lineas += [
            f'            <div class="grupo-variables" id="{grupo["id"]}">',
            '              <div class="grupo-variables-encabezado">',
            f'                <h3 class="grupo-variables-titulo">{texto(grupo["titulo"])}</h3>',
            f'                <p class="grupo-variables-conteo">{total} variables</p>',
            '              </div>',
            f'              <p class="grupo-variables-descripcion">{texto(grupo["descripcion"])}</p>',
            '              <div class="tarjetas-variables">',
        ]
        for variable in variables:
            lineas += tarjeta(variable, grupo)
        for variable in nuevas:
            lineas += tarjeta_extra(variable)
        lineas += [
            '              </div>',
            '            </div>',
            '',
        ]
    return "\n".join(lineas).rstrip() + "\n"


def main():
    parser = argparse.ArgumentParser(description=__doc__.splitlines()[0])
    parser.add_argument("--json", type=Path, default=JSON_POR_DEFECTO)
    parser.add_argument("--tabla", type=Path, default=TABLA_POR_DEFECTO)
    parser.add_argument("--pagina", type=Path, default=PAGINA_POR_DEFECTO)
    args = parser.parse_args()

    datos = json.loads(args.json.read_text(encoding="utf-8"))
    tabla = json.loads(args.tabla.read_text(encoding="utf-8"))
    bloque = generar(datos, tabla)

    pagina = args.pagina.read_text(encoding="utf-8")
    if INICIO not in pagina or FIN not in pagina:
        raise SystemExit(f"{args.pagina} no tiene los marcadores {INICIO} / {FIN}.")

    patron = re.compile(re.escape(INICIO) + r".*?" + re.escape(FIN), re.S)
    pagina = patron.sub(lambda _match: f"{INICIO}\n{bloque}            {FIN}", pagina, count=1)
    args.pagina.write_text(pagina, encoding="utf-8")

    nombres = {v["nombre"] for v in datos["variables"]}
    extras = [v for v in tabla["variables"]
              if v.get("tarjeta") and v["traduccion"] not in nombres]
    tarjetas = len(datos["variables"]) + len(extras)
    print(f"Escritas {tarjetas} tarjetas de análisis en {args.pagina.relative_to(RAIZ)}")
    for grupo in GRUPOS:
        total = sum(1 for v in datos["variables"] + extras
                    if v.get("subtipo") == grupo["clave"] and v.get("tipo") == grupo["tipo"])
        print(f"  {grupo['titulo']}: {total}")


if __name__ == "__main__":
    main()
