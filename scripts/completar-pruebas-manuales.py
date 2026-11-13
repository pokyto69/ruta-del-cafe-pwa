# Fase 12.3 · Vuelca los resultados de las pruebas manuales en el reporte de Word.
#
#   1. Realiza las pruebas siguiendo docs/GUIA-PRUEBAS-MANUALES.md
#   2. Copia tus capturas a docs/capturas/manuales/ (MAN-01-a.png, MAN-01-b.png, ...)
#   3. Escribe lo que observaste en docs/pruebas-manuales.json
#   4. python scripts/completar-pruebas-manuales.py
#
# Edita el .docx existente (conserva la portada y los cambios hechos en Word):
#   · llena la columna «Resultado obtenido» de la tabla MAN-01 … MAN-07
#   · inserta la sección «12.4 Evidencias de las pruebas manuales» con las capturas
# Se puede ejecutar las veces que haga falta: la sección 12.4 se reemplaza, no se duplica.
# Requiere: pip install python-docx
import json
import sys
from copy import deepcopy
from pathlib import Path

from docx import Document
from docx.enum.text import WD_ALIGN_PARAGRAPH
from docx.oxml import OxmlElement
from docx.oxml.ns import qn
from docx.shared import Inches, Pt, RGBColor

RAIZ = Path(__file__).resolve().parent.parent
REPORTE = RAIZ / 'docs' / 'Reporte-PWA-Ruta-del-Cafe.docx'
DATOS = RAIZ / 'docs' / 'pruebas-manuales.json'
CAPTURAS = RAIZ / 'docs' / 'capturas' / 'manuales'
TITULO_EVIDENCIAS = '12.4 Evidencias de las pruebas manuales'
MARCA_INI, MARCA_FIN = '_evidencias_manuales_ini', '_evidencias_manuales_fin'
COLORES = {'Aprobado': 'E3F1E4', 'Falló': 'F8DEDE', 'Parcial': 'FFF3D6'}


def sombrear(celda, color):
    tcPr = celda._tc.get_or_add_tcPr()
    for viejo in tcPr.findall(qn('w:shd')):
        tcPr.remove(viejo)
    if color:
        shd = OxmlElement('w:shd')
        shd.set(qn('w:val'), 'clear'); shd.set(qn('w:color'), 'auto'); shd.set(qn('w:fill'), color)
        tcPr.append(shd)


def marcador(parrafo, nombre, id_):
    ini = OxmlElement('w:bookmarkStart'); ini.set(qn('w:id'), str(id_)); ini.set(qn('w:name'), nombre)
    fin = OxmlElement('w:bookmarkEnd'); fin.set(qn('w:id'), str(id_))
    parrafo._p.insert(0, ini); parrafo._p.append(fin)


def tiene_marcador(elem, nombre):
    return any(b.get(qn('w:name')) == nombre for b in elem.iter(qn('w:bookmarkStart')))


def escribir_celda(celda, texto, modelo, negrita=False):
    """Reemplaza el texto de la celda copiando el formato del párrafo/run modelo."""
    for p in celda.paragraphs[1:]:
        p._p.getparent().remove(p._p)
    p = celda.paragraphs[0]
    for r in list(p.runs):
        r._r.getparent().remove(r._r)
    if modelo is not None and modelo.paragraphs[0]._p.pPr is not None and p._p.pPr is None:
        p._p.insert(0, deepcopy(modelo.paragraphs[0]._p.pPr))
    run_modelo = modelo.paragraphs[0].runs[0] if modelo is not None and modelo.paragraphs[0].runs else None
    for i, linea in enumerate(texto.split('\n')):
        r = p.add_run(linea)
        if run_modelo is not None and run_modelo._r.rPr is not None:
            r._r.insert(0, deepcopy(run_modelo._r.rPr))
        if negrita and i == 0:
            r.bold = True
        if i < len(texto.split('\n')) - 1:
            r.add_break()


def main():
    sys.stdout.reconfigure(encoding='utf-8')  # consola de Windows (cp1252)
    datos = json.loads(DATOS.read_text(encoding='utf-8'))
    doc = Document(REPORTE)
    cuerpo = doc.element.body

    tabla = next((t for t in doc.tables
                  if len(t.columns) >= 4 and 'Resultado obtenido' in t.rows[0].cells[-1].text
                  and any(f.cells[0].text.strip() == 'MAN-01' for f in t.rows)), None)
    if tabla is None:
        sys.exit('No se encontró la tabla de pruebas manuales (MAN-01 … MAN-07).')

    pruebas = {p['id']: p for p in datos['pruebas']}
    vacias = []
    for fila in tabla.rows[1:]:
        id_ = fila.cells[0].text.strip()
        p = pruebas.get(id_)
        if not p or not p.get('resultado', '').strip():
            vacias.append(id_)
            continue
        estado = p.get('estado', '').strip()
        texto = f"{estado}\n{p['resultado'].strip()}" if estado else p['resultado'].strip()
        escribir_celda(fila.cells[-1], texto, fila.cells[-2], negrita=bool(estado))
        sombrear(fila.cells[-1], COLORES.get(estado))

    # Párrafo introductorio de 12.3
    for par in doc.paragraphs:
        if par.text.startswith('Estas pruebas requieren un teléfono') or par.text.startswith('Pruebas realizadas'):
            intro = (f"Pruebas realizadas el {datos.get('fecha', '').strip()} con {datos.get('dispositivo', '').strip()}"
                     f" sobre {datos.get('url', '').strip()}. Las capturas de cada prueba están en la sección 12.4.")
            for r in par.runs[1:]:
                r._r.getparent().remove(r._r)
            par.runs[0].text = intro
            break

    # Quitar una sección 12.4 insertada antes (idempotente)
    hijos = list(cuerpo)
    ini = next((i for i, e in enumerate(hijos) if tiene_marcador(e, MARCA_INI)), None)
    fin = next((i for i, e in enumerate(hijos) if tiene_marcador(e, MARCA_FIN)), None)
    if ini is not None and fin is not None:
        for e in hijos[ini:fin + 1]:
            cuerpo.remove(e)

    # Construir la sección 12.4 al final del documento y moverla justo después de la tabla
    nuevos_desde = len(cuerpo) - 1  # el último hijo es sectPr
    h = doc.add_paragraph(TITULO_EVIDENCIAS, style='Heading 2')
    marcador(h, MARCA_INI, 9101)
    doc.add_paragraph('Capturas tomadas durante la ejecución de las pruebas manuales en el dispositivo '
                      'y en Chrome DevTools.')
    faltan = []
    for p in datos['pruebas']:
        imagenes = [CAPTURAS / n for n in p.get('capturas', [])]
        existentes = [i for i in imagenes if i.exists()]
        faltan += [i.name for i in imagenes if not i.exists()]
        if not existentes:
            continue
        t = doc.add_paragraph()
        r = t.add_run(f"{p['id']} · {p.get('titulo', '')}"); r.bold = True; r.font.size = Pt(11)
        r.font.color.rgb = RGBColor(0x6F, 0x4E, 0x37)
        t.paragraph_format.keep_with_next = True
        t.paragraph_format.space_before = Pt(10)
        anchas = p.get('ancho', 'telefono') == 'completo'
        if anchas or len(existentes) == 1:
            for img in existentes:
                pi = doc.add_paragraph(); pi.alignment = WD_ALIGN_PARAGRAPH.CENTER
                pi.add_run().add_picture(str(img), width=Inches(6.0 if anchas else 2.2))
        else:  # capturas de teléfono lado a lado (hasta 3 por fila)
            for k in range(0, len(existentes), 3):
                grupo = existentes[k:k + 3]
                tb = doc.add_table(rows=1, cols=len(grupo))
                for celda, img in zip(tb.rows[0].cells, grupo):
                    celda.paragraphs[0].alignment = WD_ALIGN_PARAGRAPH.CENTER
                    celda.paragraphs[0].add_run().add_picture(str(img), width=Inches(1.95))
        if p.get('pie'):
            pie = doc.add_paragraph(p['pie']); pie.alignment = WD_ALIGN_PARAGRAPH.CENTER
            for r in pie.runs:
                r.italic = True; r.font.size = Pt(9)
    cierre = doc.add_paragraph()
    marcador(cierre, MARCA_FIN, 9102)

    sectPr = cuerpo[-1]
    bloque = list(cuerpo)[nuevos_desde:-1]
    if sectPr.tag != qn('w:sectPr'):
        bloque = list(cuerpo)[nuevos_desde:]
    ancla = tabla._tbl
    for e in bloque:
        ancla.addnext(e)
        ancla = e

    doc.save(REPORTE)
    print(f'✔ Reporte actualizado: {REPORTE.relative_to(RAIZ)}')
    if vacias:
        print('⚠ Sin resultado todavía:', ', '.join(vacias))
    if faltan:
        print('⚠ Capturas no encontradas en docs/capturas/manuales/:', ', '.join(faltan))


if __name__ == '__main__':
    main()
