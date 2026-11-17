"""Genera el bloque de tarjetas "Análisis por tipo de variable" de Estadistica.html.

Lee el JSON del paquete de entregables (recursos/descriptiva_brasil/datos/descriptiva_brasil.json)
y reescribe, dentro de Estadistica.html, el bloque delimitado por los comentarios

    <!-- TARJETAS-VARIABLES:INICIO --> ... <!-- TARJETAS-VARIABLES:FIN -->

El HTML es estático a propósito: las 17 tarjetas existen aunque el navegador no ejecute
JavaScript, y el JSON del paquete sigue siendo la única fuente de las cifras.

Uso desde la raíz del repositorio (no requiere pandas ni scipy):

    python3 scripts/4_descriptiva_tarjetas.py

Argumentos opcionales: --json RUTA_JSON y --pagina RUTA_HTML.
"""

import argparse
import html
import json
import re
from pathlib import Path

BASE = Path(__file__).resolve().parent
RAIZ = BASE.parent
JSON_POR_DEFECTO = RAIZ / "recursos" / "descriptiva_brasil" / "datos" / "descriptiva_brasil.json"
PAGINA_POR_DEFECTO = RAIZ / "Estadistica.html"
BASE_RECURSOS = "recursos/descriptiva_brasil"

INICIO = "<!-- TARJETAS-VARIABLES:INICIO -->"
FIN = "<!-- TARJETAS-VARIABLES:FIN -->"

# Orden de los grupos y frases de método que los distinguen en la página.
GRUPOS = [
    {
        "id": "grupo-nominal",
        "titulo": "Cualitativas nominales",
        "clave": "Nominal",
        "tipo": "Cualitativa",
        "descripcion": "Categorías sin orden natural. Se cuenta cuántos pozos hay en cada una: "
                       "no se calculan medias, medianas ni desviaciones, porque promediar nombres "
                       "no significa nada.",
        "frases": 1,
    },
    {
        "id": "grupo-ordinal",
        "titulo": "Cualitativas ordinales",
        "clave": "Ordinal",
        "tipo": "Cualitativa",
        "descripcion": "Categorías con un orden natural (pesado → mediano → ligero). Se informa la "
                       "moda y la mediana categórica; nunca el promedio de los códigos de las clases.",
        "frases": 1,
    },
    {
        "id": "grupo-discreta",
        "titulo": "Cuantitativas discretas",
        "clave": "Discreta",
        "tipo": "Cuantitativa",
        "descripcion": "Valores que se cuentan. Las horas son discretas porque el archivo las registra "
                       "en números enteros, no porque el tiempo físico sea discreto; los días son la "
                       "parte entera de esas horas entre 24.",
        "frases": 2,
    },
    {
        "id": "grupo-continua",
        "titulo": "Cuantitativas continuas",
        "clave": "Continua",
        "tipo": "Cuantitativa",
        "descripcion": "Mediciones. Se resumen con tendencia central, dispersión y forma. Los histogramas "
                       "usan clases de igual ancho en log₁₀ para los pozos con producción, porque la "
                       "distribución está muy sesgada.",
        "frases": 2,
    },
]


def numero(valor, decimales=0):
    """Formato español: 5308 -> '5.308'; 11.9485 -> '11,95'."""
    if valor is None:
        return "—"
    entero, _, fraccion = f"{float(valor):.{decimales}f}".partition(".")
    entero = f"{int(entero):,}".replace(",", ".")
    return f"{entero},{fraccion}" if fraccion else entero


def frases(lectura, cuantas):
    """Primeras frases de la lectura del JSON, sin cortar cifras por la mitad."""
    partes = re.split(r"(?<=[a-zA-Z0-9°\)\]\}])\.\s+", lectura.strip())
    elegidas = [p.strip().rstrip(". ") for p in partes[:cuantas] if p.strip()]
    return ". ".join(elegidas) + "."


def cifra(valor):
    """Cifra legible: enteros sin decimales, magnitudes pequeñas con 4 cifras
    significativas (0,0043 Mm³/día) y el resto con dos decimales."""
    if valor is None:
        return "—"
    valor = float(valor)
    if valor == 0:
        return "0"
    if valor.is_integer():
        return numero(valor, 0)
    if abs(valor) < 1:
        return f"{valor:.4g}".replace(".", ",")
    return numero(valor, 2)


def texto(valor):
    return html.escape(str(valor))


def tarjeta(variable, grupo):
    indicadores = variable.get("indicadores") or {}
    validos = indicadores.get("validos")
    nulos = indicadores.get("nulos")
    categorias = indicadores.get("categorias")
    moda = indicadores.get("moda")
    media = indicadores.get("media")
    mediana = indicadores.get("mediana")
    ceros = indicadores.get("ceros")
    atipicos = indicadores.get("outliers")
    unidad = variable.get("unidad")
    ruta = f"{BASE_RECURSOS}/{variable['ruta']}"

    datos = [
        f"<span><b>{texto(numero(validos))}</b> con dato</span>",
        f"<span><b>{texto(numero(nulos))}</b> sin dato</span>",
    ]
    if categorias:
        datos.append(f"<span><b>{texto(numero(categorias))}</b> categorías</span>")

    cifras = []
    if grupo["clave"] == "Ordinal":
        if indicadores.get("mediana"):
            cifras.append(f"Mediana categórica: {texto(indicadores['mediana'])}")
    else:
        if media is not None:
            cifras.append(f"Media {texto(cifra(media))}" + (f" {texto(unidad)}" if unidad and unidad != "—" else ""))
        if mediana is not None:
            cifras.append(f"Mediana {texto(cifra(mediana))}" + (f" {texto(unidad)}" if unidad and unidad != "—" else ""))
        if ceros:
            cifras.append(f"{texto(numero(ceros))} con cero observado")
        if atipicos:
            cifras.append(f"{texto(numero(atipicos))} atípicos")

    partes = [
        '                <article class="tarjeta-variable">',
        f'                  <p class="tarjeta-variable-tipo">{texto(variable["subtipo"])}</p>',
        f'                  <h4 class="tarjeta-variable-nombre">{texto(variable["nombre"])}</h4>',
        f'                  <p class="tarjeta-variable-lectura">{texto(frases(variable["lectura"], grupo["frases"]))}</p>',
        f'                  <p class="tarjeta-variable-datos">{"".join(datos)}</p>',
    ]
    if cifras:
        partes.append(f'                  <p class="tarjeta-variable-cifras">{texto(" · ".join(cifras))}</p>')
    partes += [
        f'                  <a class="tarjeta-variable-enlace" href="{texto(ruta)}" target="_blank" rel="noopener">'
        f'Ver análisis<span class="sr-only"> de {texto(variable["nombre"])} (se abre en una pestaña nueva)</span>'
        '<svg class="tarjeta-variable-flecha" viewBox="0 0 24 24" aria-hidden="true" focusable="false">'
        '<path d="M7 17 17 7M9 7h8v8"/></svg></a>',
        '                </article>',
    ]
    return partes


def generar(datos):
    lineas = []
    for grupo in GRUPOS:
        variables = [v for v in datos["variables"]
                     if v.get("subtipo") == grupo["clave"] and v.get("tipo") == grupo["tipo"]]
        if not variables:
            continue
        lineas += [
            f'            <div class="grupo-variables" id="{grupo["id"]}">',
            '              <div class="grupo-variables-encabezado">',
            f'                <h3 class="grupo-variables-titulo">{texto(grupo["titulo"])}</h3>',
            f'                <p class="grupo-variables-conteo">{len(variables)} variables</p>',
            '              </div>',
            f'              <p class="grupo-variables-descripcion">{texto(grupo["descripcion"])}</p>',
            '              <div class="tarjetas-variables">',
        ]
        for variable in variables:
            lineas += tarjeta(variable, grupo)
        lineas += [
            '              </div>',
            '            </div>',
            '',
        ]
    return "\n".join(lineas).rstrip() + "\n"


def main():
    parser = argparse.ArgumentParser(description=__doc__.splitlines()[0])
    parser.add_argument("--json", type=Path, default=JSON_POR_DEFECTO)
    parser.add_argument("--pagina", type=Path, default=PAGINA_POR_DEFECTO)
    args = parser.parse_args()

    datos = json.loads(args.json.read_text(encoding="utf-8"))
    bloque = generar(datos)

    pagina = args.pagina.read_text(encoding="utf-8")
    if INICIO not in pagina or FIN not in pagina:
        raise SystemExit(f"{args.pagina} no tiene los marcadores {INICIO} / {FIN}.")

    patron = re.compile(re.escape(INICIO) + r".*?" + re.escape(FIN), re.S)
    pagina = patron.sub(lambda _match: f"{INICIO}\n{bloque}            {FIN}", pagina, count=1)
    args.pagina.write_text(pagina, encoding="utf-8")

    tarjetas = sum(1 for v in datos["variables"])
    print(f"Escritas {tarjetas} tarjetas de análisis en {args.pagina.relative_to(RAIZ)}")
    for grupo in GRUPOS:
        total = sum(1 for v in datos["variables"]
                    if v.get("subtipo") == grupo["clave"] and v.get("tipo") == grupo["tipo"])
        print(f"  {grupo['titulo']}: {total}")


if __name__ == "__main__":
    main()
