"""Valida coherencia entre JSON, Excel e informes. Ejecutar junto al generador."""
import json
from pathlib import Path
from html.parser import HTMLParser
import openpyxl
root=Path(__file__).resolve().parents[1]
d=json.loads((root/'datos/descriptiva_brasil.json').read_text())
class Parser(HTMLParser):
    def __init__(self): super().__init__(); self.rows=0; self.images=0
    def handle_starttag(self,tag,attrs):
        if tag=='tr':self.rows+=1
        if tag=='img':self.images+=1
v=openpyxl.load_workbook(root/'documentos/Tabla_Variables_Brasil.xlsx',data_only=True)
i=openpyxl.load_workbook(root/'documentos/Tabla_Indicadores_Brasil.xlsx',data_only=True)
assert len(d['variables'])==17
for idx,r in enumerate(d['variables']):
    st=r['indicadores']; freq=r['frecuencias']
    assert st['validos']+st['nulos']==d['pozos']
    assert sum(x['fi'] for x in freq)==st['validos']
    assert abs(sum(x['hi'] for x in freq)-1)<1e-10
    assert abs(freq[-1]['Hi']-1)<1e-10
    assert v.worksheets[0].cell(idx+2,2).value==r['nombre']
    assert v.worksheets[0].cell(idx+2,11).value==st['validos']
    assert i.worksheets[0].cell(idx+3,1).value==r['nombre']
    if r['escala']!='Razón': assert st.get('cv_pct') is None
    p=Parser(); p.feed((root/r['ruta']).read_text()); assert p.images>=1 and p.rows>=len(freq)
    assert len(list(i[r['clave']].values))==len(freq)+1
    if 'media' in st: assert abs(i.worksheets[0].cell(idx+3,3).value-st['media'])<1e-8
print('OK: 17 informes, 2 Excel, frecuencias suman n, proporciones suman 1; media, n, rutas y escalas coherentes.')
