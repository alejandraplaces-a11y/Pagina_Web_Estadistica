"""Recalcula los entregables: python generar_descriptiva.py archivo_ANP.csv carpeta_salida.
Dependencias: pandas numpy matplotlib openpyxl. No modifica la página web.
"""
import argparse, base64, hashlib, html, io, json, math, shutil
from pathlib import Path
import numpy as np
import pandas as pd
import matplotlib
matplotlib.use('Agg')
import matplotlib.pyplot as plt
from openpyxl import Workbook
from openpyxl.styles import Font, PatternFill, Alignment
from openpyxl.worksheet.table import Table, TableStyleInfo

p=argparse.ArgumentParser(); p.add_argument('csv',type=Path); p.add_argument('salida',type=Path); args=p.parse_args()
OUT=args.salida
for folder in ['documentos','analisis','datos']: (OUT/folder).mkdir(parents=True,exist_ok=True)
raw=pd.read_csv(args.csv,sep=';',encoding='utf-8-sig',dtype=str,keep_default_na=False)
d=raw[raw['Período'].str.fullmatch(r'2023/01')].copy()
for c in d: d[c]=d[c].str.strip().replace('',pd.NA)
assert len(d)==5471 and d['Nome Poço'].nunique()==5308
cols={'oleo':8,'condensado':9,'petroleo':10,'gas_asociado':11,'gas_no_asociado':12,'gas_total':13,'agua':15,'horas':18,'api':21}
for k,i in cols.items():
    d[k]=pd.to_numeric(d.iloc[:,i].astype('string').str.replace('.','',regex=False).str.replace(',','.',regex=False),errors='coerce')
# Elección estable: fila con mayor óleo, en empate conserva el orden del archivo.
ordered=d.sort_values('oleo',ascending=False,kind='stable')
principal=ordered.drop_duplicates('Nome Poço').set_index('Nome Poço')
g=d.groupby('Nome Poço',sort=True)
w=pd.DataFrame(index=sorted(principal.index))
for k in ['oleo','condensado','petroleo','gas_asociado','gas_no_asociado','gas_total','agua']: w[k]=g[k].sum(min_count=1)
w['horas']=g.horas.max()
w['dias']=np.floor(w.horas/24)  # días equivalentes completos, no conteo de días calendario con actividad
for k,c in {'estado':'Estado','cuenca':'Bacia','campo':'Campo','operador':'Operador','instalacion':'Tipo Instalação'}.items(): w[k]=principal[c]
# Compatibilidad con los datos publicados: primer API no nulo en orden de mayor óleo.
w['api']=ordered.groupby('Nome Poço').api.first()
w['clase_api']=w.api.map(lambda v: None if pd.isna(v) else ('Pesado' if v<22.3 else 'Mediano' if v<=31.1 else 'Ligero'))
w['produce_oleo']=w.oleo.map(lambda v: 'Sí' if v>0 else 'No' if v==0 else None)
w['produce_gas']=w.gas_total.map(lambda v: 'Sí' if v>0 else 'No' if v==0 else None)
N=len(w)
# clave, nombre, subtipo, unidad, definición, fuente, escala
SPEC=[
('estado','Estado','Nominal','—','Unidad federativa de ubicación','Estado','Nominal'),
('cuenca','Cuenca','Nominal','—','Cuenca sedimentaria','Bacia','Nominal'),
('campo','Campo principal','Nominal','—','Campo de la fila con mayor óleo del pozo; no representa todas sus asociaciones','Campo','Nominal'),
('operador','Operador principal','Nominal','—','Operador de la fila con mayor óleo','Operador','Nominal'),
('instalacion','Tipo de instalación','Nominal','—','Tipo de instalación de destino de la fila principal; no se rellena desde otra fila','Tipo Instalação','Nominal'),
('produce_oleo','Produce óleo','Nominal','—','Sí cuando el óleo consolidado es mayor que cero; No si es cero','Derivada de Óleo','Nominal'),
('produce_gas','Produce gas total','Nominal','—','Sí cuando gas asociado + no asociado es mayor que cero','Derivada de Gás Total','Nominal'),
('clase_api','Clase de crudo por API','Ordinal','—','Pesado <22,3; mediano 22,3–31,1 inclusive; ligero >31,1 (clasificación operativa del proyecto)','Derivada de Grau API','Ordinal'),
('dias','Días equivalentes completos','Discreta','días','Parte entera del máximo de horas por pozo dividido entre 24; no días calendario efectivamente trabajados','Derivada de Tempo de Produção','Razón'),
('horas','Horas de producción registradas','Continua','h/mes','Máximo de horas reportadas por pozo; el tiempo es continuo, aunque el archivo lo registre en horas enteras','Tempo de Produção (hs por mês)','Razón'),
('oleo','Óleo por pozo','Continua','bbl/día','Suma de tasas medias diarias de óleo de sus filas; incluye ceros','Óleo (bbl/dia)','Razón'),
('condensado','Condensado por pozo','Continua','bbl/día','Suma de tasas medias diarias de condensado','Condensado (bbl/dia)','Razón'),
('gas_asociado','Gas natural asociado','Continua','Mm³/día','Suma de la subcolumna Associado; no confundir con gas total','Gás Natural · Associado','Razón'),
('gas_no_asociado','Gas natural no asociado','Continua','Mm³/día','Suma de la subcolumna Não Associado','Gás Natural · Não Associado','Razón'),
('gas_total','Gas natural total','Continua','Mm³/día','Suma de Gás Total (asociado + no asociado)','Gás Natural · Gás Total','Razón'),
('agua','Agua por pozo','Continua','bbl/día','Suma de tasas medias diarias de agua','Água (bbl/dia)','Razón'),
('api','Grado API','Continua','°API','Primer grado API no nulo al ordenar las filas por óleo descendente; no se promedian grados de corrientes','Grau API','Intervalo')]
API_ORDER=['Pesado','Mediano','Ligero']
H=lambda s: html.escape(str(s))
def f(v):
    if v is None or (isinstance(v,float) and not np.isfinite(v)): return 'No aplica'
    if isinstance(v,str): return v
    return f'{v:,.6g}'.replace(',','X').replace('.',',').replace('X','.')
def interval(row):
    if row.get('cero'): return '{0}'
    return f"[{f(row['inferior'])}; {f(row['superior'])}{']' if row.get('ultimo') else ')'}"
def frequency(s,sub):
    x=s.dropna(); n=len(x)
    if sub in ['Nominal','Ordinal','Discreta']:
        c=x.value_counts().sort_index()
        if sub=='Ordinal': c=c.reindex(API_ORDER,fill_value=0)
        if sub=='Nominal': c=c.sort_values(ascending=False,kind='stable')
        rows=[{'valor':str(v),'fi':int(fi)} for v,fi in c.items()]
    else:
        arr=x.to_numpy(float); positives=arr[arr>0]
        log=(sub=='Continua' and s.name!='api')
        base=np.log10(positives) if log else arr
        k=math.ceil(1+math.log2(len(base))) if len(base)>1 else 1
        edges=np.linspace(base.min(),base.max(),k+1)
        counts,_=np.histogram(base,bins=edges)
        bounds=10**edges if log else edges
        rows=[]
        if log: rows.append({'valor':'{0}','cero':True,'inferior':0.,'superior':0.,'fi':int((arr==0).sum())})
        for i,count in enumerate(counts):
            r={'inferior':float(bounds[i]),'superior':float(bounds[i+1]),'ultimo':i==k-1,'fi':int(count)}
            r['valor']=interval(r); rows.append(r)
    acc=0
    for r in rows:
        acc+=r['fi']; r.update(hi=r['fi']/n,Fi=acc,Hi=acc/n)
    assert sum(r['fi'] for r in rows)==n
    assert abs(sum(r['hi'] for r in rows)-1)<1e-10
    return rows
records=[]; dictionaries=[]; ind_rows=[]; allfreq=[]
for key,name,sub,unit,definition,original,scale in SPEC:
    s=w[key]; x=s.dropna(); n=len(x); cat=sub in ['Nominal','Ordinal']; counts=x.value_counts(); modes=counts[counts==counts.max()].index.tolist()
    freq=frequency(s,sub); modal=max(freq,key=lambda r:r['fi'])
    stats={'validos':n,'nulos':N-n,'categorias':len(counts) if cat else None,'moda':'; '.join(map(str,modes)) if cat or sub=='Discreta' else None,'clase_modal':modal['valor'] if sub=='Continua' else None}
    if not cat:
        q1,q3=x.quantile([.25,.75]); ric=q3-q1; lo,hi=q1-1.5*ric,q3+1.5*ric
        stats.update(media=float(x.mean()),mediana=float(x.median()),minimo=float(x.min()),maximo=float(x.max()),sd=float(x.std(ddof=1)),varianza=float(x.var(ddof=1)),q1=float(q1),q3=float(q3),ric=float(ric),limite_inferior=float(lo),limite_superior=float(hi),outliers_inferiores=int((x<lo).sum()),outliers_superiores=int((x>hi).sum()),outliers=int(((x<lo)|(x>hi)).sum()),cv_pct=float(x.std(ddof=1)/x.mean()*100) if scale=='Razón' and x.mean()!=0 else None,asimetria=float(x.skew()),curtosis_exceso=float(x.kurt()),ceros=int((x==0).sum()))
    elif sub=='Ordinal':
        a=sorted(x.map(dict(zip(API_ORDER,range(3)))))
        stats['mediana']=API_ORDER[a[(n-1)//2]]; stats['cuartil_inferior']=API_ORDER[a[int((n-1)*.25)]]; stats['cuartil_superior']=API_ORDER[a[int((n-1)*.75)]]
    instrument='Registro administrativo de la ANP; instrumento físico específico no identificado en el CSV'
    if key in ['dias','clase_api','produce_oleo','produce_gas']: instrument='Cálculo reproducible a partir de los registros ANP'
    domain= 'Categorías del registro ANP' if cat else '[0; +∞)' if scale=='Razón' else 'Escala API (cero convencional)'
    if sub=='Ordinal': domain='Pesado < Mediano < Ligero'
    if key=='dias': domain='{0,1,…,31}'
    if key=='horas': domain='0 – 744 (horas enteras en el registro)'
    observed='; '.join(map(str,sorted(x.unique()))) if cat else f"{f(stats['minimo'])} a {f(stats['maximo'])}"
    dictionaries.append([original,name,definition,'Cualitativa' if cat else 'Cuantitativa',sub,domain,observed,instrument,unit,scale,n,N-n,stats.get('ceros','—')])
    ind_rows.append([name,observed,stats.get('media','No aplica'),stats.get('mediana','No aplica'),stats.get('clase_modal') or stats['moda'],stats.get('sd','No aplica'),stats.get('cv_pct') if stats.get('cv_pct') is not None else 'No aplica',stats.get('asimetria','No aplica'),stats.get('curtosis_exceso','No aplica'),stats.get('outliers','No aplica')])
    if cat:
        top=counts.index[0]; pct=counts.iloc[0]/n*100
        reading=f'La categoría más frecuente es {top}: {int(counts.iloc[0]):,} de {n:,} pozos con dato ({pct:.1f} %).'.replace(',','.')
        reading+=' Las frecuencias no describen volúmenes de producción: cuentan pozos.'
        if sub=='Ordinal': reading+=f" La categoría central es {stats['mediana']}; no corresponde promediar códigos de las clases."
    else:
        reading=f"La media es {f(stats['media'])} {unit} y la mediana {f(stats['mediana'])} {unit}. "
        reading+=('Los valores altos elevan el promedio; la mediana representa mejor el centro. ' if stats['media']>stats['mediana'] else 'La media y mediana resumen aspectos distintos del centro. ')
        reading+=f"Hay {stats['outliers']} valores fuera de [Q₁ − 1,5·RIC; Q₃ + 1,5·RIC]: {stats['outliers_inferiores']} bajos y {stats['outliers_superiores']} altos. No se eliminan por ese motivo."
        if scale=='Intervalo': reading+=' No se calcula CV porque el grado API no tiene cero absoluto.'
        if sub=='Continua': reading+=f" La clase modal es {modal['valor']} ({modal['fi']} pozos); depende de los intervalos elegidos."
    notes=['Válidos y nulos se cuentan por pozo, no por fila. Cero no significa dato ausente.']
    if sub=='Nominal': notes+=['No se calculan media, mediana, desviación ni CV para categorías nominales. Las frecuencias acumuladas no tienen interpretación natural y no se presentan.']
    if sub=='Ordinal': notes+=['Orden operativo: pesado <22,3°, mediano 22,3°–31,1° inclusive, ligero >31,1°. No se incluye una clase extrapesada adicional; no es una clasificación universal de todos los crudos.']
    if key in ['campo','operador','instalacion']: notes+=['Se usa la fila con más óleo, sin rellenar su categoría faltante desde otra fila. Campo principal no equivale al total de campos del archivo.']
    if key=='api': notes+=['API representa una corriente: se usa el primer API informado al ordenar las filas por óleo, sin promediar grados ni asumir que sea el API mezclado del pozo.']
    if key in ['dias','horas']: notes+=['Las horas toman el máximo entre filas, no la suma. Es una aproximación declarada: sin intervalos horarios no se pueden reconstruir horas únicas ni días calendario.']
    if sub=='Continua' and key!='api': notes+=['Clase {0} separada; positivos agrupados con Sturges en log₁₀. hᵢ y Hᵢ usan todos los válidos, incluidos los ceros; último intervalo cerrado. La ojiva usa límites superiores, no marcas.']
    fig,ax=plt.subplots(figsize=(9,4.5))
    if cat or sub=='Discreta':
        ff=freq if len(freq)<=15 or sub=='Ordinal' else sorted(freq,key=lambda r:r['fi'],reverse=True)[:12]
        if sub=='Discreta' and len(freq)<=40: ff=freq
        ax.barh([r['valor'] for r in ff][::-1],[r['fi'] for r in ff][::-1],color='#8C6D46'); ax.set_xlabel('Pozos (frecuencia absoluta)')
        if len(ff)<len(freq): ax.set_title(f'{name}: {len(ff)} valores más frecuentes (tabla completa debajo)')
        else: ax.set_title(name)
    else:
        xx=x.to_numpy(float)
        if key!='api':
            pos=xx[xx>0]; edges=np.linspace(np.log10(pos).min(),np.log10(pos).max(),len(freq))
            ax.hist(np.log10(pos),bins=edges,color='#8C6D46',edgecolor='white'); ax.set_xlabel(f'log₁₀({name} en {unit})'); ax.set_title(f'{name}: positivos; ceros = {stats["ceros"]}')
        else: ax.hist(xx,bins=len(freq),color='#8C6D46',edgecolor='white'); ax.set_xlabel(unit); ax.set_title(name)
        ax.set_ylabel('Pozos')
    ax.spines[['top','right']].set_visible(False); fig.tight_layout(); buffer=io.BytesIO(); fig.savefig(buffer,format='png',dpi=130); plt.close(fig)
    image=base64.b64encode(buffer.getvalue()).decode()
    image2=''
    if sub=='Continua':
        fig,ax=plt.subplots(figsize=(9,3.8)); rows=[r for r in freq if not r.get('cero')]
        ax.plot([r['superior'] for r in rows],[r['Hi'] for r in rows],marker='o',color='#1F5C52'); ax.set_xlabel(f'Límite superior ({unit})'); ax.set_ylabel('Hᵢ'); ax.set_ylim(0,1.05)
        if key!='api': ax.set_xscale('log')
        ax.set_title('Ojiva sobre límites superiores; incluye ceros en Hᵢ'); fig.tight_layout(); b=io.BytesIO(); fig.savefig(b,format='png',dpi=130); plt.close(fig)
        image2=f'<img alt="Ojiva acumulada de {H(name)}" src="data:image/png;base64,{base64.b64encode(b.getvalue()).decode()}">'
    tablecols=['valor','fi','hi'] if sub=='Nominal' else ['valor','fi','hi','Fi','Hi']
    table='<table><caption>Distribución de frecuencias · '+H(name)+'</caption><thead><tr>'+''.join('<th scope="col">'+H(c)+'</th>' for c in tablecols)+'</tr></thead><tbody>'
    for r in freq: table+='<tr>'+''.join(f'<{ "th scope="+chr(34)+"row"+chr(34) if j==0 else "td"}>{H(f(r[c]))}</{"th" if j==0 else "td"}>' for j,c in enumerate(tablecols))+'</tr>'
    table+='</tbody></table>'
    labels={'validos':'Pozos con dato','nulos':'Pozos sin dato','categorias':'Categorías observadas','moda':'Categoría o valor modal','clase_modal':'Clase modal','media':'Media','mediana':'Mediana','minimo':'Mínimo','maximo':'Máximo','sd':'Desviación estándar muestral','varianza':'Varianza muestral','q1':'Primer cuartil (Q₁)','q3':'Tercer cuartil (Q₃)','ric':'Rango intercuartílico (RIC)','limite_inferior':'Límite inferior de atípicos','limite_superior':'Límite superior de atípicos','outliers_inferiores':'Atípicos bajos','outliers_superiores':'Atípicos altos','outliers':'Total de valores atípicos','cv_pct':'Coeficiente de variación (%)','asimetria':'Asimetría ajustada','curtosis_exceso':'Curtosis en exceso','ceros':'Pozos con cero observado','cuartil_inferior':'Categoría del primer cuartil','cuartil_superior':'Categoría del tercer cuartil'}
    stats_html='<table><caption>Indicadores aplicables</caption><tbody>'+''.join(f'<tr><th scope="row">{H(labels.get(k,k))}</th><td>{H(f(v))}</td></tr>' for k,v in stats.items() if v is not None)+'</tbody></table>'
    document=f'''<!doctype html><html lang="es"><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1"><title>{H(name)} · Brasil enero 2023</title><style>body{{font:16px/1.6 system-ui;margin:0;background:#F5F0E6;color:#20342d}}main{{max-width:1000px;margin:auto;padding:24px}}section{{background:white;padding:20px;margin:16px 0;border:1px solid #ddd;border-radius:10px}}img{{max-width:100%;height:auto}}.scroll{{overflow:auto}}table{{border-collapse:collapse;width:100%;font-size:14px}}th,td{{text-align:left;padding:8px;border-bottom:1px solid #ddd}}caption{{text-align:left;font-weight:700}}a{{color:#1F5C52}}</style><main><a href="../LEEME.html">← Índice de entregables</a><h1>{H(name)}</h1><p>{sub} · {scale} · {H(unit)} · enero de 2023</p><section><h2>Qué se analiza</h2><p>{H(definition)}</p><p>Muestra: {N} pozos; válidos {n}; sin dato {N-n}.</p></section><section><h2>Resultados en palabras simples</h2><p>{H(reading)}</p></section><section><h2>Gráficas</h2><img alt="Distribución de {H(name)}" src="data:image/png;base64,{image}">{image2}</section><section class="scroll"><h2>Tabla de frecuencias</h2>{table}</section><section class="scroll"><h2>Indicadores</h2>{stats_html}</section><section><h2>Método y límites</h2><ul>{''.join('<li>'+H(t)+'</li>' for t in notes)}</ul></section><p>Fuente: ANP · {H(args.csv.name)}. Análisis descriptivo del archivo; no demuestra cobertura nacional ni causalidad.</p></main></html>'''
    path=f'analisis/{key}.html'; (OUT/path).write_text(document,encoding='utf-8')
    rec={'clave':key,'nombre':name,'tipo':'Cualitativa' if cat else 'Cuantitativa','subtipo':sub,'escala':scale,'unidad':unit,'descripcion':definition,'ruta':path,'indicadores':stats,'lectura':reading,'notas':notes,'frecuencias':freq}; records.append(rec)
    for row in freq: allfreq.append({'variable':key,**row})

META={'fuente':args.csv.name,'sha256':hashlib.sha256(args.csv.read_bytes()).hexdigest(),'periodo':'2023/01','registros':len(d),'pozos':N,'pozos_repetidos':int(g.size().gt(1).sum()),'campos_en_registros':int(d.Campo.nunique()),'campos_principales':int(w.campo.nunique()),'variables':records}
(OUT/'datos/descriptiva_brasil.json').write_text(json.dumps(META,ensure_ascii=False,indent=2,allow_nan=False),encoding='utf-8')
pd.DataFrame(allfreq).to_csv(OUT/'datos/frecuencias_brasil.csv',index=False,encoding='utf-8-sig')

NOTES=[['Fuente',args.csv.name],['SHA256',META['sha256']],['Unidad','Pozo; 5.471 filas consolidadas en 5.308 pozos'],['Alcance','Población objetivo: pozos terrestres de Brasil; muestra temporal administrativa enero 2023, no probabilística. No se garantiza cobertura nacional.'],['Agregación','Volúmenes: suma con min_count=1. Horas: máximo. Días: floor(horas/24). Categorías: fila con más óleo (empates: orden original).'],['API','Primer API no nulo en orden de óleo descendente; no promedio de grados. Clase API: operativo pesado <22,3; mediano <=31,1; ligero >31,1.'],['Campo',f"Hay {d.Campo.nunique()} campos en filas y {w.campo.nunique()} campos principales asignados a pozos. No intercambiar estos conteos."],['Nulos','Conteo por pozo; nunca se sustituye un nulo por 0 para indicadores.'],['Gas','Gas total = asociado + no asociado. 466 ceros de gas asociado no son los ceros del gas total.'],['Indicadores','sd y varianza con n−1; asimetría y curtosis ajustadas (pandas), curtosis en exceso.'],['Outliers','Valores estrictamente fuera de [Q1−1,5 RIC; Q3+1,5 RIC]; no son necesariamente errores.'],['CV','100·sd/media solo en escala de razón y media no cero; no para API, códigos ni categorías.'],['Frecuencias','hᵢ=fi/n válido. Nominales sin acumuladas. Ordinales en orden natural.'],['Continuas','Sturges en log10 de positivos con clase {0}; API en intervalos lineales. Última clase incluye el máximo; clase modal depende de clases.'],['Unidades','Se conservan las etiquetas del CSV (Mm³/día y bbl/día); no se aplican conversiones no documentadas.'],['Instrumento','La ANP es la fuente administrativa, no un instrumento; el CSV no identifica el equipo físico específico.']]

def format_sheet(ws, header=1):
    ws.freeze_panes=f'C{header+1}'; ws.auto_filter.ref=f'A{header}:{ws.cell(ws.max_row,min(ws.max_column,13)).coordinate}'
    for row in ws:
        for cell in row:
            cell.alignment=Alignment(vertical='top',wrap_text=True)
            if isinstance(cell.value,float): cell.number_format='0.0000'
    for cell in ws[header]: cell.font=Font(bold=True,color='FFFFFF'); cell.fill=PatternFill('solid',fgColor='1F5C52')
    for col in ws.columns:
        letter=col[0].column_letter; ws.column_dimensions[letter].width=24 if col[0].column<=2 else 32
    for r in range(1,ws.max_row+1): ws.row_dimensions[r].height=60 if r>header else 32
    ws.sheet_properties.pageSetUpPr.fitToPage=True; ws.page_setup.orientation='landscape'; ws.page_setup.paperSize=ws.PAPERSIZE_A3; ws.page_setup.fitToWidth=1; ws.page_setup.fitToHeight=0

wb=Workbook(); ws=wb.active; ws.title='Variables Brasil'
ws.append(['NOMBRE ORIGINAL','NOMBRE','DESCRIPCIÓN','TIPO','SUBTIPO','DOMINIO','RANGO OBSERVADO','INSTRUMENTO DE MEDIDA','UNIDAD DE MEDIDA','ESCALA DE MEDIDA','VÁLIDOS','NULOS','CEROS'])
for r in dictionaries: ws.append(r)
format_sheet(ws)
meta=wb.create_sheet('Método'); meta.append(['ASPECTO','EXPLICACIÓN']); [meta.append(r) for r in NOTES]; format_sheet(meta)
inv=wb.create_sheet('Inventario CSV'); inv.append(['COLUMNA ORIGINAL','TRATAMIENTO'])
for c in raw.columns:
    if c.startswith('Unnamed:'): desc='Subcolumna de encabezado compuesto: consultar posición en CSV (gas, destilados o composición).'
    elif c in ['Nome Poço','Número do Contrato','Unnamed: 3']: desc='Identificador nominal; no calcular indicadores cuantitativos.'
    elif c in ['Período','Data de atualização','Período da Carga']: desc='Fecha/período administrativo: contexto, no variable de producción de esta muestra.'
    else: desc='Incluida si aparece en Variables Brasil; las restantes son auxiliares, redundantes o análisis por corriente fuera de este alcance.'
    inv.append([c,desc])
format_sheet(inv)
wb.save(OUT/'documentos/Tabla_Variables_Brasil.xlsx')
wb=Workbook(); ws=wb.active; ws.title='Indicadores Brasil'
ws.append(['VARIABLE','RANGO','Tendencia Central',None,None,'Dispersión',None,'Formas',None,'Atípicos'])
ws.append([None,None,'media','mediana','moda / clase modal','sd','coef_var (%)','asimetría','curtosis en exceso','n_outliers (1,5 RIC)'])
for r in ind_rows: ws.append(r)
format_sheet(ws,2)
for rg in ['A1:A2','B1:B2','C1:E1','F1:G1','H1:I1','J1:J2']: ws.merge_cells(rg)
counts=wb.create_sheet('Válidos y dispersión'); counts.append(['VARIABLE','VÁLIDOS','NULOS','CEROS','Q1','Q3','RIC','LÍMITE INFERIOR','LÍMITE SUPERIOR','ATÍPICOS BAJOS','ATÍPICOS ALTOS','VARIANZA'])
for rec in records:
    st=rec['indicadores']; counts.append([rec['nombre']]+[st.get(k,'No aplica') for k in ['validos','nulos','ceros','q1','q3','ric','limite_inferior','limite_superior','outliers_inferiores','outliers_superiores','varianza']])
format_sheet(counts)
meta=wb.create_sheet('Método'); meta.append(['ASPECTO','EXPLICACIÓN']); [meta.append(r) for r in NOTES]; format_sheet(meta)
for rec in records:
    sheet=wb.create_sheet(rec['clave'][:31]); keys=['valor','fi','hi'] if rec['subtipo']=='Nominal' else ['valor','fi','hi','Fi','Hi']; sheet.append(keys)
    for r in rec['frecuencias']: sheet.append([r[k] for k in keys])
    format_sheet(sheet)
wb.save(OUT/'documentos/Tabla_Indicadores_Brasil.xlsx')
# Índice autónomo de lectura, no sustituye Estadistica.html.
links=''
for sub in ['Nominal','Ordinal','Discreta','Continua']:
    links+=f'<h2>{sub}</h2><ul>'+''.join(f'<li><a href="{r["ruta"]}">{H(r["nombre"])}</a></li>' for r in records if r['subtipo']==sub)+'</ul>'
(OUT/'LEEME.html').write_text(f'<!doctype html><html lang="es"><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>Análisis descriptivos de Brasil</title><main style="max-width:900px;margin:30px auto;font:17px/1.6 system-ui;padding:16px"><h1>Brasil · Estadística descriptiva</h1><p>17 informes autocontenidos, dos Excel y datos de respaldo. Enero 2023: 5.471 registros, 5.308 pozos.</p><p><a href="documentos/Tabla_Variables_Brasil.xlsx">Tabla de variables</a> · <a href="documentos/Tabla_Indicadores_Brasil.xlsx">Tabla de indicadores</a></p>{links}<p>Ver PROMPT_OPENCODE.md para la integración en la web.</p></main></html>',encoding='utf-8')
print('Generados',len(records),'informes. Variables nominales/ordinales/discretas/continuas:',pd.Series([r['subtipo'] for r in records]).value_counts().to_dict())
print('campos:',META['campos_en_registros'],META['campos_principales'])
print('Ceros óleo/gas total/asociado/agua:',[(k,int((w[k]==0).sum())) for k in ['oleo','gas_total','gas_asociado','agua']])
