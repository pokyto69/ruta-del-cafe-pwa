// Genera el reporte técnico en Word: docs/Reporte-PWA-Ruta-del-Cafe.docx
// Uso: node scripts/generar-reporte.js
// - Los fragmentos de código se extraen de los archivos reales del proyecto.
// - Los commits se leen de git y los resultados de pruebas de docs/resultados-pruebas.txt.
// - Los datos del estudiante y los enlaces se leen de docs/datos-reporte.json (si existe).
const fs = require('fs');
const path = require('path');
const { execFileSync } = require('child_process');
const {
  Document, Packer, Paragraph, TextRun, HeadingLevel, AlignmentType, Table, TableRow, TableCell,
  WidthType, ShadingType, BorderStyle, ImageRun, TableOfContents, Footer, Header, PageNumber,
  LevelFormat, PageBreak, ExternalHyperlink, VerticalAlign,
} = require('docx');

const RAIZ = path.join(__dirname, '..');
const leer = (rel) => fs.readFileSync(path.join(RAIZ, rel), 'utf8');

// ---------- Datos variables ----------
const datos = {
  estudiante: '________________________________',
  curso: '________________________________',
  docente: '________________________________',
  fecha: new Date().toLocaleDateString('es', { day: 'numeric', month: 'long', year: 'numeric' }),
  repositorio: '(pendiente: se completa al publicar en GitHub)',
  pages: '(pendiente: se completa al activar GitHub Pages)',
  ...(fs.existsSync(path.join(RAIZ, 'docs/datos-reporte.json')) ? JSON.parse(leer('docs/datos-reporte.json')) : {}),
};

const commits = {};
try {
  execFileSync('git', ['log', '--reverse', '--format=%h|%s'], { cwd: RAIZ, encoding: 'utf8' }).trim().split('\n').forEach((l) => {
    const [hash, ...resto] = l.split('|');
    const msg = resto.join('|');
    const m = msg.match(/^Fase (\d+):/);
    if (m && !commits[m[1]]) commits[m[1]] = { hash, msg };
  });
} catch { /* sin git */ }

const resultados = {};
if (fs.existsSync(path.join(RAIZ, 'docs/resultados-pruebas.txt'))) {
  leer('docs/resultados-pruebas.txt').split('\n').forEach((l) => {
    const m = l.match(/^(ok|not ok) \d+ - ([A-Z]+-\d+)/);
    if (m) resultados[m[2]] = m[1] === 'ok';
  });
}

/** Extrae las líneas de `archivo` desde la que contiene `desde` hasta la que contiene `hasta` (incluidas). */
function extraer(archivo, desde, hasta, maxLineas = 40) {
  const lineas = leer(archivo).split('\n');
  const i = lineas.findIndex((l) => l.includes(desde));
  if (i < 0) throw new Error(`No se encontró «${desde}» en ${archivo}`);
  // Un marcador que empieza con salto de línea ('\n}') busca una línea idéntica (cierre de función en columna 0)
  const coincide = (l) => (hasta.startsWith('\n') ? l.trimEnd() === hasta.slice(1) : l.includes(hasta));
  let j = hasta ? lineas.findIndex((l, k) => k > i && coincide(l)) : i + maxLineas - 1;
  if (j < 0) j = i + maxLineas - 1;
  return lineas.slice(i, Math.min(j + 1, i + maxLineas)).join('\n');
}

// ---------- Estilo ----------
const CAFE = '6F4E37';
const CREMA = 'F6EFE7';
const CODIGO_FONDO = 'F4F1EC';
const ANCHO = 9360; // carta con márgenes de 1": 12240 - 2*1440
const FUENTE = 'Calibri';

const t = (text, o = {}) => new TextRun({ text, font: FUENTE, ...o });
const p = (contenido, o = {}) => new Paragraph({
  spacing: { after: 120, line: 276 },
  ...o,
  children: (Array.isArray(contenido) ? contenido : [contenido]).map((c) => (typeof c === 'string' ? t(c) : c)),
});
const h1 = (texto) => new Paragraph({ heading: HeadingLevel.HEADING_1, children: [t(texto)] });
const h2 = (texto) => new Paragraph({ heading: HeadingLevel.HEADING_2, children: [t(texto)] });
const h3 = (texto) => new Paragraph({ heading: HeadingLevel.HEADING_3, children: [t(texto)] });
const vineta = (contenido, nivel = 0) => new Paragraph({
  numbering: { reference: 'vinetas', level: nivel },
  spacing: { after: 60, line: 264 },
  children: (Array.isArray(contenido) ? contenido : [contenido]).map((c) => (typeof c === 'string' ? t(c) : c)),
});
const b = (text) => t(text, { bold: true });
const code = (text) => t(text, { font: 'Consolas', size: 19, color: '5A3A22' });
const saltoPagina = () => new Paragraph({ children: [new PageBreak()] });

function bloqueCodigo(texto, titulo) {
  const salida = [];
  if (titulo) salida.push(new Paragraph({ spacing: { before: 120, after: 40 }, keepNext: true, children: [t(titulo, { italics: true, size: 18, color: '6B5B50' })] }));
  const lineas = texto.replace(/\t/g, '  ').split('\n');
  lineas.forEach((linea, i) => salida.push(new Paragraph({
    shading: { type: ShadingType.CLEAR, color: 'auto', fill: CODIGO_FONDO },
    spacing: { before: 0, after: i === lineas.length - 1 ? 160 : 0, line: 240 },
    indent: { left: 120, right: 120 },
    keepLines: true,
    keepNext: i < lineas.length - 1 && lineas.length < 25,
    border: {
      left: { style: BorderStyle.SINGLE, size: 12, color: 'C8814A', space: 6 },
    },
    children: [new TextRun({ text: linea || ' ', font: 'Consolas', size: 16, color: '2B1D14' })],
  })));
  return salida;
}

const borde = { style: BorderStyle.SINGLE, size: 4, color: 'D9CBBE' };
const bordes = { top: borde, bottom: borde, left: borde, right: borde };
const sinBorde = { style: BorderStyle.NONE, size: 0, color: 'FFFFFF' };
const sinBordes = { top: sinBorde, bottom: sinBorde, left: sinBorde, right: sinBorde };

function celda(contenido, ancho, { encabezado = false, fondo, alinear, negrita = false, tam = 19 } = {}) {
  const parrafos = (Array.isArray(contenido) ? contenido : [contenido]).map((c) => (c instanceof Paragraph ? c : new Paragraph({
    alignment: alinear,
    spacing: { after: 0, line: 252 },
    children: [typeof c === 'string' ? t(c, { bold: encabezado || negrita, color: encabezado ? 'FFFFFF' : undefined, size: tam }) : c],
  })));
  return new TableCell({
    width: { size: ancho, type: WidthType.DXA },
    borders: bordes,
    verticalAlign: VerticalAlign.CENTER,
    margins: { top: 70, bottom: 70, left: 100, right: 100 },
    shading: encabezado ? { type: ShadingType.CLEAR, color: 'auto', fill: CAFE } : fondo ? { type: ShadingType.CLEAR, color: 'auto', fill: fondo } : undefined,
    children: parrafos,
  });
}

function tabla(anchos, encabezados, filas, opciones = {}) {
  return new Table({
    width: { size: anchos.reduce((a, x) => a + x, 0), type: WidthType.DXA },
    columnWidths: anchos,
    rows: [
      new TableRow({ tableHeader: true, children: encabezados.map((e, i) => celda(e, anchos[i], { encabezado: true, tam: opciones.tam })) }),
      ...filas.map((fila, k) => new TableRow({
        cantSplit: true,
        children: fila.map((c, i) => celda(c, anchos[i], { fondo: k % 2 ? 'FBF8F4' : undefined, tam: opciones.tam, ...(opciones.celda?.(k, i, c) || {}) })),
      })),
    ],
  });
}

function imagen(rel, anchoPx) {
  const buf = fs.readFileSync(path.join(RAIZ, rel));
  const ancho = buf.readUInt32BE(16);
  const alto = buf.readUInt32BE(20);
  return new ImageRun({ type: 'png', data: buf, transformation: { width: anchoPx, height: Math.round((alto / ancho) * anchoPx) } });
}

function parCapturas(a, b, pieA, pieB) {
  const anchoCol = ANCHO / 2;
  const col = (img, pie) => new TableCell({
    width: { size: anchoCol, type: WidthType.DXA },
    borders: sinBordes,
    children: [
      new Paragraph({ alignment: AlignmentType.CENTER, children: [imagen(img, 205)] }),
      new Paragraph({ alignment: AlignmentType.CENTER, spacing: { before: 60, after: 200 }, children: [t(pie, { italics: true, size: 18, color: '6B5B50' })] }),
    ],
  });
  return new Table({
    width: { size: ANCHO, type: WidthType.DXA },
    columnWidths: [anchoCol, anchoCol],
    rows: [new TableRow({ cantSplit: true, children: [col(a, pieA), b ? col(b, pieB) : new TableCell({ width: { size: anchoCol, type: WidthType.DXA }, borders: sinBordes, children: [new Paragraph('')] })] })],
  });
}

function cajaCommit(fase) {
  const c = commits[fase];
  return new Paragraph({
    spacing: { before: 120, after: 240 },
    shading: { type: ShadingType.CLEAR, color: 'auto', fill: CREMA },
    border: { left: { style: BorderStyle.SINGLE, size: 18, color: CAFE, space: 6 } },
    indent: { left: 120 },
    children: c
      ? [b('Commit: '), code(c.hash), t('  ·  '), t(c.msg, { italics: true })]
      : [b('Commit: '), t('pendiente', { italics: true })],
  });
}

const enlace = (texto, url) => new ExternalHyperlink({ link: url, children: [t(texto, { style: 'Hyperlink' })] });
const textoEnlace = (valor) => (/^https?:\/\//.test(valor) ? enlace(valor, valor) : t(valor, { italics: true }));

// ---------- Contenido ----------
const hijos = [];
const add = (...xs) => xs.flat().forEach((x) => hijos.push(x));

// Portada
add(
  new Paragraph({ spacing: { before: 1800 }, alignment: AlignmentType.CENTER, children: [imagen('public/icons/icon-512.png', 150)] }),
  new Paragraph({ alignment: AlignmentType.CENTER, spacing: { before: 300, after: 120 }, children: [t('Ruta del Café', { size: 64, bold: true, color: CAFE })] }),
  new Paragraph({ alignment: AlignmentType.CENTER, spacing: { after: 600 }, children: [t('Reporte técnico de la Aplicación Web Progresiva', { size: 32, color: '6B5B50' })] }),
  new Paragraph({ alignment: AlignmentType.CENTER, spacing: { after: 80 }, children: [t('App shell · Manifiesto · Service worker · Almacenamiento local · Offline · Background Sync · Push', { size: 20, color: '6B5B50' })] }),
  new Paragraph({ spacing: { before: 1400 }, children: [] }),
  new Table({
    width: { size: 6800, type: WidthType.DXA },
    alignment: AlignmentType.CENTER,
    columnWidths: [2000, 4800],
    rows: [['Estudiante', datos.estudiante], ['Curso', datos.curso], ['Docente', datos.docente], ['Fecha', datos.fecha]].map(([k, v]) => new TableRow({
      children: [
        new TableCell({ width: { size: 2000, type: WidthType.DXA }, borders: sinBordes, children: [new Paragraph({ spacing: { after: 100 }, children: [b(`${k}:`)] })] }),
        new TableCell({ width: { size: 4800, type: WidthType.DXA }, borders: sinBordes, children: [new Paragraph({ spacing: { after: 100 }, children: [t(v)] })] }),
      ],
    })),
  }),
  saltoPagina(),
);

// Índice
add(
  new Paragraph({ spacing: { after: 200 }, children: [t('Índice', { size: 32, bold: true, color: CAFE })] }),
  new TableOfContents('Índice', { hyperlink: true, headingStyleRange: '1-2' }),
);

// 1. Introducción
add(
  new Paragraph({ heading: HeadingLevel.HEADING_1, pageBreakBefore: true, children: [t('1. Introducción')] }),
  p('Este reporte documenta la construcción paso a paso de «Ruta del Café», una Aplicación Web Progresiva (PWA) para descubrir cafeterías de especialidad, guardar favoritas y publicar reseñas incluso sin conexión. El trabajo siguió la guía fase por fase, en orden; al terminar cada fase se verificó su funcionamiento y se registró un commit en el repositorio git.'),
  h2('1.1 Objetivo'),
  p('Construir una PWA completa, desde el entorno de desarrollo hasta su publicación, aplicando app shell, manifiesto, service worker, almacenamiento local, funcionamiento offline, sincronización en segundo plano y notificaciones push.'),
  h2('1.2 Resultado alcanzado'),
  vineta([b('Se instala: '), t('el manifiesto es válido y Chrome no reporta errores de instalabilidad (prueba PWA-01).')]),
  vineta([b('Funciona sin conexión: '), t('shell, catálogo, detalle y fichas visitadas se sirven desde la caché; lo demás muestra offline.html (PWA-06 y PWA-07).')]),
  vineta([b('Sincroniza reseñas: '), t('una reseña escrita sin red queda pendiente en IndexedDB y el evento sync del service worker la envía al recuperar la conexión (PWA-08).')]),
  vineta([b('Recibe notificaciones push: '), t('se verificó un push real de extremo a extremo (suscripción en el servicio push del navegador → envío firmado con VAPID desde el servidor → notificación mostrada por el service worker) y la notificación local (PWA-10).')]),
  vineta([b('Pruebas: '), t(`${Object.values(resultados).filter(Boolean).length} de ${Object.keys(resultados).length} casos automatizados aprobados.`)]),
);

// 2. Tecnologías
add(
  h1('2. Tecnologías y herramientas'),
  tabla([2600, 6760], ['Herramienta', 'Uso en el proyecto'], [
    ['Node.js 22 / npm 10', 'Entorno de ejecución del servidor y gestor de dependencias.'],
    ['Express 5', 'Servidor HTTP: archivos estáticos, API del catálogo y de reseñas, SSR de la ficha y endpoints de push.'],
    ['web-push 4', 'Firma de los mensajes push con claves VAPID y envío al servicio push del navegador.'],
    ['HTML, CSS y JavaScript (módulos ES)', 'Interfaz sin frameworks: app shell, enrutador hash y vistas renderizadas en el cliente.'],
    ['Service Worker, Cache Storage', 'Precarga del shell, estrategias de caché, offline, Background Sync y push.'],
    ['IndexedDB y localStorage', 'Datos locales (catálogo, favoritos, reseñas) y preferencias del usuario.'],
    ['Geolocation, Vibration, Web Share, Battery, Network Information', 'Elementos físicos del dispositivo (Fase 11).'],
    ['node:test y puppeteer-core', 'Pruebas automatizadas del servidor y de extremo a extremo en Chrome real.'],
    ['Chrome DevTools', 'Inspección del manifiesto, service worker, cachés, IndexedDB, modo offline, sync y push.'],
    ['Git, GitHub y GitHub Pages', 'Control de versiones (un commit por fase) y publicación.'],
  ]),
);

// 3. Arquitectura
add(
  h1('3. Arquitectura y estructura del proyecto'),
  p('La aplicación sigue el modelo app shell: el «esqueleto» (cabecera, navegación, pie, CSS y JavaScript) se guarda en caché durante la instalación del service worker y se carga al instante; el contenido se obtiene de la red o de los datos locales y se inyecta en el contenedor principal. El servidor Express sirve los archivos de public/ y expone la API.'),
  ...bloqueCodigo(`pwa/
├── server.js                 Servidor Express: estáticos, API, SSR y push
├── lib/
│   ├── ssr.js                Plantilla HTML de la ficha generada en el servidor
│   └── push.js               Claves VAPID, suscripciones y envío push
├── public/                   Lo que se publica (también en GitHub Pages)
│   ├── index.html            App shell
│   ├── offline.html          Página de respaldo sin conexión
│   ├── manifest.json         Manifiesto de la aplicación
│   ├── sw.js                 Service worker
│   ├── css/styles.css
│   ├── data/cafes.json       Catálogo (fuente de datos)
│   ├── icons/                Íconos generados (any + maskable)
│   └── js/                   Módulos: app, router, vistas, api, db, prefs,
│                             conexion, resenas, notificaciones, dispositivo,
│                             cerca, ficha, splash, instalacion, actualizacion
├── scripts/                  Generadores de íconos, claves VAPID, capturas y reporte
├── tests/                    Pruebas automatizadas (API y extremo a extremo)
└── docs/                     Reporte, capturas y resultados de las pruebas`, 'Estructura de carpetas'),
  h2('3.1 Rutas del servidor'),
  tabla([1300, 3000, 5060], ['Método', 'Ruta', 'Descripción'], [
    ['GET', '/api/cafes?q=', 'Catálogo completo o filtrado por texto.'],
    ['GET', '/api/cafes/:id', 'Una cafetería (404 si no existe).'],
    ['GET', '/cafe/:id', 'Ficha renderizada en el servidor (SSR).'],
    ['GET / POST', '/api/resenas', 'Listar reseñas por cafetería / crear reseña (idempotente por idLocal).'],
    ['GET', '/api/push/clave-publica', 'Clave pública VAPID para suscribirse.'],
    ['POST', '/api/push/suscribir', 'Guardar la suscripción push de un navegador.'],
    ['POST', '/api/push/desuscribir', 'Eliminar una suscripción.'],
    ['POST', '/api/push/enviar', 'Enviar un push a todas las suscripciones (protegible con PUSH_TOKEN).'],
  ], { tam: 18 }),
  saltoPagina(),
);

// 4. Fases
add(h1('4. Desarrollo por fases'));

// Fase 0
add(
  h2('Fase 0 · Entorno de desarrollo y repositorio'),
  h3('0.1 Verificar las herramientas'),
  p('Se comprobaron las versiones instaladas: Node.js v22.14.0, npm 10.9.2 y Git 2.51.0. Se inicializó el repositorio con la rama main.'),
  ...bloqueCodigo('node -v        # v22.14.0\nnpm -v         # 10.9.2\ngit --version  # git version 2.51.0\ngit init -b main'),
  h3('0.2 Crear el proyecto e instalar dependencias'),
  ...bloqueCodigo('npm init -y\nnpm install express web-push\nnpm install -D puppeteer-core docx   # pruebas y generación del reporte'),
  h3('0.3 package.json y .gitignore'),
  p('Se definieron los scripts start, dev, iconos, vapid y test. El .gitignore excluye node_modules, la clave privada VAPID (vapid.json) y los datos generados en tiempo de ejecución.'),
  ...bloqueCodigo(extraer('package.json', '"scripts"', '},'), 'package.json (scripts)'),
  ...bloqueCodigo(leer('.gitignore').trim(), '.gitignore'),
  h3('0.4 Servidor mínimo'),
  p('Express sirve la carpeta public/. El servidor exporta la app para poder levantarlo desde las pruebas en un puerto libre.'),
  ...bloqueCodigo(`const app = express();
app.use(express.json());
app.use(express.static(PUBLIC));
if (require.main === module) {
  app.listen(PORT, () => console.log(\`Ruta del Café escuchando en http://localhost:\${PORT}\`));
}
module.exports = app;`, 'server.js (versión inicial)'),
  p([b('Verificación: '), t('GET / → 200 con el index; una ruta inexistente → 404.')]),
  cajaCommit(0),
);

// Fase 1
add(
  h2('Fase 1 · App shell'),
  h3('1.1 index.html (el shell)'),
  p('El shell contiene únicamente la estructura permanente: barra superior con el indicador de conexión, navegación, contenedor principal <main id="app"> (donde el enrutador pinta las vistas) y pie de página.'),
  ...bloqueCodigo(extraer('public/index.html', '<header class="barra">', '</nav>'), 'public/index.html (fragmento)'),
  h3('1.2 Hoja de estilos'),
  p('styles.css define variables de color (tema café), modo oscuro automático con prefers-color-scheme y forzado mediante data-tema, diseño adaptable (rejilla auto-fill), barra fija con safe-area para móviles con notch, y estilos para tarjetas, formularios, avisos y splash. Respeta prefers-reduced-motion.'),
  ...bloqueCodigo(extraer('public/css/styles.css', ':root {', 'color-scheme: light;'), 'public/css/styles.css (variables)'),
  cajaCommit(1),
);

// Fase 2
add(
  h2('Fase 2 · Manifiesto e íconos'),
  h3('2.1 Generar los íconos'),
  p('Los íconos se generan con un script propio en Node sin dependencias externas (solo zlib): dibuja una taza de café con suavizado por supermuestreo y codifica el PNG. Se producen versiones «any» (cuadrado redondeado), «maskable» (fondo completo con el dibujo dentro de la zona segura del 80 %), apple-touch-icon, favicon y badge para notificaciones.'),
  ...bloqueCodigo('npm run iconos\n✔ icon-192.png  ✔ icon-512.png  ✔ maskable-192.png  ✔ maskable-512.png\n✔ apple-touch-icon.png  ✔ favicon-32.png  ✔ badge-72.png'),
  h3('2.2 manifest.json'),
  p('El manifiesto usa rutas relativas (start_url y scope «./») para funcionar tanto en localhost como bajo /<repositorio>/ en GitHub Pages. background_color y theme_color definen el splash del sistema; display standalone abre la app sin barra del navegador; shortcuts añade accesos directos al mantener pulsado el ícono.'),
  ...bloqueCodigo(extraer('public/manifest.json', '"id"', '"icons"'), 'public/manifest.json (fragmento)'),
  p('En el <head> del shell se enlazan el manifiesto, theme-color, favicon y las metaetiquetas para iOS.'),
  cajaCommit(2),
);

// Fase 3
add(
  h2('Fase 3 · Service worker básico'),
  h3('3.1 Registrar el service worker'),
  p('Se registra tras el evento load para no competir con la carga inicial, con alcance «./». (En la Fase 9 el registro se trasladó al módulo actualizacion.js.)'),
  ...bloqueCodigo(extraer('public/js/actualizacion.js', "const reg = await navigator.serviceWorker.register", "console.log('[App] Service worker registrado")),
  h3('3.2 sw.js con los tres eventos base'),
  vineta([b('install: '), t('abre la caché del shell y precarga todos los recursos de la lista SHELL.')]),
  vineta([b('activate: '), t('elimina las cachés de versiones anteriores.')]),
  vineta([b('fetch: '), t('intercepta las peticiones y responde desde la caché (en la Fase 7 se reemplaza por tres estrategias).')]),
  ...bloqueCodigo(extraer('public/sw.js', "self.addEventListener('install'", '});'), 'public/sw.js (install)'),
  p([b('Verificación: '), t('en DevTools → Application → Service Workers aparece sw.js «activated and running»; en Cache Storage aparece shell-vN con los recursos.')]),
  cajaCommit(3),
);

// Fase 4
add(
  h2('Fase 4 · Renderizado del lado del cliente (CSR) y del servidor (SSR)'),
  h3('4.1 Datos remotos del catálogo'),
  p('El catálogo (8 cafeterías con coordenadas, puntuación, etiquetas y horario) está en public/data/cafes.json. El servidor lo expone en /api/cafes. El cliente (api.js) pide primero la API y, si no existe —como en GitHub Pages—, usa el JSON estático.'),
  ...bloqueCodigo(extraer('server.js', "app.get('/api/cafes',", '});'), 'server.js'),
  h3('4.2 CSR: enrutador y vistas en el navegador'),
  p('router.js implementa un enrutador basado en el hash (#/catalogo, #/cafe/:id) que no necesita configuración del servidor. Cada ruta tiene una función vista que recibe el contenedor y los parámetros, y genera el HTML en el navegador.'),
  ...bloqueCodigo(extraer('public/js/router.js', 'export function ruta(', '}'), 'public/js/router.js'),
  ...bloqueCodigo(extraer('public/js/app.js', "ruta('/', ", "ruta('/cerca'"), 'public/js/app.js (rutas)'),
  h3('4.3 SSR: la ficha generada en el servidor'),
  p('La ruta /cafe/:id devuelve un documento HTML completo generado en el servidor: se ve aunque JavaScript esté desactivado y es indexable por buscadores. Todo el contenido se escapa para evitar inyección de HTML. Los datos de la cafetería se incrustan en un <script type="application/json"> para la hidratación (Fase 11.3), y <base href="../"> hace que las rutas relativas funcionen.'),
  ...bloqueCodigo(extraer('server.js', "app.get('/cafe/:id'", '});'), 'server.js'),
  cajaCommit(4),
);

// Fase 5
add(
  h2('Fase 5 · Pantallas de Splash y Home'),
  h3('5.1 Splash del sistema (sin código)'),
  p('Al abrir la app instalada, Android genera automáticamente una pantalla de bienvenida a partir del manifiesto: name, background_color (#6f4e37) e ícono de 512 px. No requiere código.'),
  h3('5.2 Splash dentro de la app'),
  p('Un <div id="splash"> en el shell cubre la pantalla mientras arranca la app. El enrutador devuelve una promesa al pintar la primera vista; entonces splash.js lo desvanece (con un mínimo de 700 ms para evitar parpadeos) y lo elimina del DOM.'),
  ...bloqueCodigo(extraer('public/js/splash.js', 'export function ocultarSplash', '}, espera);'), 'public/js/splash.js'),
  h3('5.3 Home con botón de instalación'),
  p('instalacion.js captura el evento beforeinstallprompt, evita el banner automático y muestra el botón «Instalar app» en el Home. Al pulsarlo se llama a prompt() y se registra la decisión del usuario; appinstalled confirma la instalación. En iOS se muestran instrucciones para «Añadir a pantalla de inicio».'),
  ...bloqueCodigo(extraer('public/js/instalacion.js', "window.addEventListener('beforeinstallprompt'", '});'), 'public/js/instalacion.js'),
  cajaCommit(5),
);

// Fase 6
add(
  h2('Fase 6 · Datos locales: localStorage e IndexedDB'),
  h3('6.1 Capa IndexedDB'),
  p('db.js envuelve la API de IndexedDB en promesas. La base «ruta-cafe» tiene tres almacenes: cafes (copia del catálogo), favoritos y resenas (con índices por cafeId y estado, usado en la Fase 8).'),
  ...bloqueCodigo(extraer('public/js/db.js', 'req.onupgradeneeded', '};'), 'public/js/db.js'),
  h3('6.2 Preferencias en localStorage'),
  p('prefs.js guarda ajustes pequeños y síncronos: tema (auto/claro/oscuro), nombre del autor de reseñas, orden del catálogo y fecha de la última visita (que se muestra en el Home).'),
  ...bloqueCodigo(extraer('public/js/prefs.js', 'export function guardarPref', '}'), 'public/js/prefs.js'),
  h3('6.3 Respaldo local de los datos remotos'),
  p('Cada vez que el catálogo llega de la red se copia a IndexedDB. Si la red falla, se leen los datos guardados y la vista muestra un aviso de que son datos locales.'),
  ...bloqueCodigo(extraer('public/js/api.js', 'export async function listarCafes', '\n}'), 'public/js/api.js'),
  cajaCommit(6),
);

// Fase 7
add(
  h2('Fase 7 · Estrategias de caché y funcionamiento offline'),
  h3('7.1 Página offline.html'),
  p('Página autónoma con estilos en línea (debe verse aunque no haya nada más en caché), con botones para ir al inicio o reintentar y recarga automática al volver la red.'),
  h3('7.2 sw.js con las tres estrategias'),
  tabla([2500, 3100, 3760], ['Estrategia', 'Se aplica a', 'Motivo'], [
    ['Cache first', 'Shell, CSS, JS, íconos; navegaciones a la app', 'Cambian solo con una versión nueva; carga instantánea y offline.'],
    ['Network first', 'api/ y data/ (catálogo, reseñas)', 'Datos frescos cuando hay red; última copia guardada si no.'],
    ['Stale-while-revalidate', 'Fichas SSR /cafe/:id', 'Respuesta inmediata desde caché y actualización en segundo plano.'],
  ]),
  ...bloqueCodigo(extraer('public/sw.js', 'async function networkFirst', '\n}'), 'public/sw.js (network first)'),
  ...bloqueCodigo(extraer('public/sw.js', 'async function staleWhileRevalidate', '\n}'), 'public/sw.js (stale-while-revalidate)'),
  p('El manejador fetch solo intercepta peticiones GET del mismo origen; los POST (reseñas, push) van directo a la red. Si una navegación no está en caché y no hay red, se responde con offline.html.'),
  h3('7.3 Indicador de conexión en el shell'),
  p('conexion.js usa navigator.onLine y los eventos online/offline para cambiar la etiqueta de la barra superior («En línea» / «Sin conexión», en rojo) y mostrar un aviso.'),
  p([b('Hallazgo durante la verificación: '), t('la estrategia network first solo buscaba en su propia caché y no encontraba data/cafes.json, que está en el precache del shell. Se corrigió usando caches.match() sobre todas las cachés.')]),
  cajaCommit(7),
);

// Fase 8
add(
  h2('Fase 8 · Reseñas sin conexión y Background Sync'),
  h3('8.1 API de reseñas en el servidor'),
  p('POST /api/resenas valida los datos y es idempotente: si llega dos veces la misma reseña (mismo idLocal, por un reintento del sync) no se duplica. Las reseñas se guardan en data/resenas.json.'),
  ...bloqueCodigo(extraer('server.js', "const existente = lista.find", 'if (existente)'), 'server.js'),
  h3('8.2 Guardar local primero, enviar después'),
  p('Al publicar, la reseña se guarda en IndexedDB con estado «pendiente» y se registra un Background Sync con la etiqueta «enviar-resenas». Se muestra con borde punteado y la insignia «Pendiente de envío». En navegadores sin Background Sync (Firefox, Safari) se envía desde la página al volver la red.'),
  ...bloqueCodigo(extraer('public/js/resenas.js', 'export async function programarEnvio', '\n}'), 'public/js/resenas.js'),
  h3('8.3 El evento sync en el service worker'),
  p('Cuando el navegador detecta conexión dispara sync. El SW lee las pendientes de IndexedDB, las envía, las marca como enviadas y avisa a las pestañas con postMessage. Si un envío falla, se lanza un error y el navegador reintenta más tarde.'),
  ...bloqueCodigo(extraer('public/sw.js', "self.addEventListener('sync'", '});'), 'public/sw.js'),
  p([b('Nota de prueba: '), t('en DevTools se puede forzar el evento desde Application → Service Workers → Sync (etiqueta enviar-resenas).')]),
  cajaCommit(8),
);

// Fase 9
add(
  h2('Fase 9 · Ciclo de vida y actualización del service worker'),
  h3('9.1 skipWaiting y clients.claim'),
  p('Un service worker nuevo se instala pero queda «en espera» mientras alguna pestaña use el anterior. clients.claim() en activate hace que el SW tome el control de las pestañas abiertas sin recargar. skipWaiting() se ejecuta solo cuando el usuario acepta actualizar (mensaje SKIP_WAITING), para no cambiar el código bajo sus pies.'),
  ...bloqueCodigo(extraer('public/sw.js', "self.addEventListener('message'", '});'), 'public/sw.js'),
  h3('9.2 Avisar al usuario que hay versión nueva'),
  p('actualizacion.js vigila updatefound y el estado installed. Si ya había un controlador, se trata de una actualización y se muestra el aviso «Hay una nueva versión» con el botón Actualizar. Al cambiar el controlador (controllerchange) la página se recarga una sola vez. Además se buscan actualizaciones al volver a la pestaña y cada hora. En Ajustes se muestra la versión activa, consultada al SW mediante MessageChannel.'),
  ...bloqueCodigo(extraer('public/js/actualizacion.js', 'function vigilarInstalacion', '\n}'), 'public/js/actualizacion.js'),
  cajaCommit(9),
);

// Fase 10
add(
  h2('Fase 10 · Notificaciones locales y push'),
  h3('10.1 Flujo completo de push'),
  vineta('El usuario pulsa «Activar notificaciones push» y concede el permiso.'),
  vineta('El cliente pide la clave pública VAPID al servidor y llama a pushManager.subscribe().'),
  vineta('El navegador devuelve una suscripción (endpoint del servicio push + claves) que se envía al servidor.'),
  vineta('El servidor firma el mensaje con la clave privada VAPID y lo envía al endpoint con web-push.'),
  vineta('El servicio push lo entrega al navegador, que despierta al service worker (evento push) aunque la app esté cerrada.'),
  vineta('El SW muestra la notificación; al pulsarla, notificationclick enfoca o abre la app en la URL indicada.'),
  h3('10.2 Claves VAPID'),
  p('npm run vapid genera el par de claves en vapid.json (excluido de git). Si el servidor arranca sin claves, las genera y guarda automáticamente. También pueden definirse con las variables VAPID_PUBLIC_KEY, VAPID_PRIVATE_KEY y VAPID_SUBJECT.'),
  h3('10.3 Servidor: guardar suscripciones y enviar push'),
  p('lib/push.js guarda las suscripciones (sin duplicar por endpoint) y envía a todas; las que el servicio responde con 404/410 (caducadas) se eliminan. Cada reseña nueva dispara un push «Nueva reseña en …».'),
  ...bloqueCodigo(extraer('lib/push.js', 'async function enviarATodos', '\n}'), 'lib/push.js'),
  h3('10.4 Cliente: notificaciones.js'),
  p('Pide permiso, muestra notificaciones locales con registration.showNotification(), suscribe y desuscribe, y permite enviar un push de prueba desde Ajustes.'),
  ...bloqueCodigo(extraer('public/js/notificaciones.js', 'sus = await reg.pushManager.subscribe', '});'), 'public/js/notificaciones.js'),
  h3('10.5 Service worker: recibir el push'),
  ...bloqueCodigo(extraer('public/sw.js', "self.addEventListener('push'", '});'), 'public/sw.js'),
  p([b('Verificación: '), t('se realizó un envío real: la suscripción se creó en el servicio push de Chrome (fcm.googleapis.com), el servidor respondió {total: 1, enviados: 1} y la notificación «Prueba real» apareció en registration.getNotifications().')]),
  cajaCommit(10),
);

// Fase 11
add(
  h2('Fase 11 · Elementos físicos del dispositivo e hidratación de la ficha SSR'),
  h3('11.1 Módulo de dispositivo'),
  p('dispositivo.js agrupa el acceso al hardware con detección de características: geolocalización (GPS), motor de vibración, hoja de compartir nativa (con copia al portapapeles como alternativa), batería e información de red. En Ajustes se listan las capacidades disponibles en el dispositivo.'),
  ...bloqueCodigo(extraer('public/js/dispositivo.js', 'export function obtenerUbicacion', '\n}'), 'public/js/dispositivo.js'),
  h3('11.2 Vista «Cerca de mí»'),
  p('Obtiene la ubicación, calcula la distancia a cada cafetería con la fórmula del haversine, ordena de la más cercana a la más lejana y confirma con una vibración. Si se deniega el permiso, se puede elegir una ciudad manualmente.'),
  h3('11.3 Hidratación de la ficha SSR'),
  p('ficha.js no vuelve a pintar la ficha: lee los datos incrustados por el servidor y conecta la interactividad al HTML existente (botón de favoritas, compartir, componente de reseñas, indicador de conexión y registro del service worker). La página marca data-hidratada="true" al terminar (en las pruebas tarda unos 40 ms).'),
  ...bloqueCodigo(extraer('public/js/ficha.js', "const cafe = JSON.parse", 'guardar(\'cafes\''), 'public/js/ficha.js'),
  p([b('Hallazgo durante la verificación: '), t('en «Cerca de mí», event.currentTarget es null después de un await; se corrigió guardando la referencia del botón.')]),
  cajaCommit(11),
  saltoPagina(),
);

// 5. Pruebas
const casos = [
  ['API-01', 'Catálogo completo', 'GET /api/cafes', '200 y 8 cafeterías con id, nombre y coordenadas'],
  ['API-02', 'Búsqueda en la API', 'GET /api/cafes?q=wifi', 'Solo cafeterías con la etiqueta Wifi'],
  ['API-03', 'Cafetería inexistente', 'GET /api/cafes/999', '404'],
  ['SSR-01', 'Ficha SSR', 'GET /cafe/3', 'HTML con <h1>Grano de Oro</h1>, datos incrustados y <base>'],
  ['SSR-02', 'Ficha SSR inexistente', 'GET /cafe/abc', '404 con página «no encontrada»'],
  ['SSR-03', 'Escapado de HTML', 'GET /cafe/<script>', 'La respuesta no contiene <script> inyectado'],
  ['RES-01', 'Crear reseña', 'POST /api/resenas válido', '201 y la reseña aparece en el listado'],
  ['RES-02', 'Idempotencia del sync', 'Reenviar el mismo idLocal', '200 y no se duplica'],
  ['RES-03', 'Validación de reseñas', 'Texto vacío, puntuación 9, cafetería 999', '400'],
  ['PUSH-01', 'Clave pública VAPID', 'GET /api/push/clave-publica', 'Clave base64url válida'],
  ['PUSH-02', 'Suscripción inválida', 'POST /api/push/suscribir con endpoint http', '400'],
  ['EST-01', 'Recursos PWA', 'GET manifest, sw.js, offline.html, íconos', '200; display standalone; ícono maskable 512'],
  ['PWA-01', 'Instalabilidad', 'CDP Page.getAppManifest / getInstallabilityErrors', 'Sin errores de manifiesto ni de instalabilidad'],
  ['PWA-02', 'Service worker y precache', 'Abrir la app', 'SW activated, controla la página, ≥ 20 recursos en caché'],
  ['PWA-03', 'Splash y Home', 'Recargar la app', 'Splash visible, se retira; Home con destacadas'],
  ['PWA-04', 'CSR', 'Ir a catálogo, buscar «lima», abrir #/cafe/4', '8 tarjetas, 1 resultado, detalle correcto'],
  ['PWA-05', 'IndexedDB y localStorage', 'Marcar favorita, tema oscuro, recargar', 'Favorita en Home y tema oscuro tras recargar'],
  ['PWA-06', 'Offline: shell y datos', 'Apagar servidor + modo offline, recargar catálogo y abrir detalle', '8 cafeterías, indicador «Sin conexión», detalle visible'],
  ['PWA-07', 'Offline: SSR y offline.html', 'Sin red: abrir ficha visitada y ficha no visitada', 'Visitada desde caché; no visitada → «Estás sin conexión»'],
  ['PWA-08', 'Background Sync', 'Sin red publicar reseña; recuperar red; evento sync', 'Pendiente → enviada; aparece en el servidor'],
  ['PWA-09', 'Actualización del SW', 'Publicar sw.js con otra versión', 'Aviso, al aceptar recarga y solo queda la caché nueva'],
  ['PWA-10', 'Notificaciones', 'Notificación local y push entregado al SW', 'Ambas notificaciones visibles'],
  ['PWA-11', 'Geolocalización', 'Ubicación simulada en Lima → «Usar mi ubicación»', 'Primera: Tostadero Miraflores'],
  ['PWA-12', 'Hidratación SSR', 'Abrir /cafe/2 sin JS y con JS', 'Sin JS se ve; con JS 3 botones y formulario de reseñas'],
  ['PWA-13', 'Errores de JavaScript', 'Recorrer todas las vistas', 'Ningún error en consola'],
];
const aprobados = casos.filter(([id]) => resultados[id]).length;

add(
  h1('5. Fase 12 · Pruebas con herramientas de software'),
  h2('12.1 Herramientas'),
  vineta([b('node:test: '), t('runner de pruebas nativo de Node.js para la API, el SSR, las reseñas y el push (tests/api.test.js).')]),
  vineta([b('puppeteer-core + Google Chrome: '), t('pruebas de extremo a extremo en un navegador real sin interfaz (tests/pwa.test.js). Para simular la falta de conexión se apaga el servidor y se activa el modo offline del navegador.')]),
  vineta([b('Chrome DevTools Protocol: '), t('instalabilidad del manifiesto, disparo del evento sync y entrega de mensajes push al service worker.')]),
  vineta([b('Chrome DevTools (manual): '), t('panel Application (Manifest, Service Workers, Cache Storage, IndexedDB, Local Storage), pestaña Network con «Offline» y Lighthouse.')]),
  ...bloqueCodigo('npm test          # todas las pruebas\nnpm run test:api  # solo servidor\nnpm run test:e2e  # solo navegador'),
  h2('12.2 Casos de prueba'),
  p([t('Resultado de la última ejecución: '), b(`${aprobados} de ${casos.length} casos aprobados`), t('. La salida completa está en docs/resultados-pruebas.txt.')]),
  tabla([900, 1700, 2350, 2610, 1000, 800], ['ID', 'Caso', 'Pasos / entrada', 'Resultado esperado', 'Obtenido', 'Estado'],
    casos.map(([id, caso, pasos, esperado]) => {
      const ok = resultados[id];
      return [id, caso, pasos, esperado, ok === undefined ? 'Sin ejecutar' : ok ? 'Igual al esperado' : 'Diferente', ok === undefined ? '—' : ok ? 'Aprobado' : 'Falló'];
    }), {
      tam: 16,
      celda: (k, i, c) => (i === 5 ? { negrita: true, fondo: c === 'Aprobado' ? 'E3F1E4' : c === 'Falló' ? 'F8DEDE' : undefined, alinear: AlignmentType.CENTER } : {}),
    }),
  h2('12.3 Pruebas manuales en dispositivo'),
  p('Estas pruebas requieren un teléfono o la interfaz gráfica del navegador; completa la columna «Resultado obtenido» al realizarlas.'),
  tabla([900, 2900, 3160, 2400], ['ID', 'Pasos', 'Resultado esperado', 'Resultado obtenido'], [
    ['MAN-01', 'Abrir la URL de GitHub Pages en Chrome Android → «Instalar app».', 'Ícono en la pantalla de inicio; abre en modo standalone con el splash del sistema.', ''],
    ['MAN-02', 'Con la app instalada, activar el modo avión y abrirla.', 'La app carga el shell, el catálogo y las favoritas.', ''],
    ['MAN-03', 'Sin red, publicar una reseña; desactivar el modo avión.', 'La reseña pasa de «Pendiente» a enviada sin abrir la app de nuevo.', ''],
    ['MAN-04', 'Activar push en Ajustes, cerrar la app y publicar una reseña desde otro dispositivo.', 'Llega la notificación «Nueva reseña en …»; al tocarla abre la ficha.', ''],
    ['MAN-05', '«Cerca de mí» → «Usar mi ubicación» en el teléfono.', 'Pide permiso, vibra y ordena por distancia real.', ''],
    ['MAN-06', 'Compartir una cafetería desde el detalle.', 'Se abre la hoja de compartir nativa del sistema.', ''],
    ['MAN-07', 'DevTools → Lighthouse (móvil) sobre la URL publicada.', 'Sin errores graves en Rendimiento, Accesibilidad y Buenas prácticas.', ''],
  ], { tam: 17 }),
  cajaCommit(12),
  saltoPagina(),
);

// 6. Publicación
add(
  h1('6. Fase 13 · Publicación'),
  h2('13.1 Subir el repositorio a GitHub'),
  p('Se creó un repositorio público vacío en GitHub y se subió el historial completo (un commit por fase):'),
  ...bloqueCodigo('git remote add origin https://github.com/<usuario>/ruta-del-cafe-pwa.git\ngit push -u origin main'),
  h2('13.2 Activar GitHub Pages'),
  p('El repositorio incluye el flujo .github/workflows/pages.yml, que publica la carpeta public/ en cada push a main. Para activarlo: Settings → Pages → Build and deployment → Source: «GitHub Actions». El progreso se ve en la pestaña Actions.'),
  h2('13.3 Qué funciona en GitHub Pages y qué necesita el servidor'),
  p('GitHub Pages solo sirve archivos estáticos por HTTPS; no ejecuta Node.js. La app está preparada para degradar con elegancia:'),
  tabla([3600, 1600, 4160], ['Funcionalidad', 'GitHub Pages', 'Observación'], [
    ['Instalación, manifiesto, íconos, splash', 'Sí', 'Rutas relativas: funciona bajo /<repositorio>/.'],
    ['Service worker, caché y offline', 'Sí', 'Pages sirve por HTTPS, requisito del SW.'],
    ['Catálogo, búsqueda, detalle (CSR)', 'Sí', 'Sin /api se usa data/cafes.json automáticamente.'],
    ['Favoritos, preferencias, IndexedDB', 'Sí', 'Todo ocurre en el navegador.'],
    ['Cerca de mí, vibración, compartir', 'Sí', 'Requieren HTTPS, que Pages ofrece.'],
    ['Notificaciones locales', 'Sí', 'Las genera el propio dispositivo.'],
    ['Ficha SSR /cafe/:id', 'No', 'Necesita el servidor Express (npm start).'],
    ['Reseñas en el servidor y Background Sync', 'Parcial', 'Se guardan en local y quedan pendientes; se envían cuando hay servidor.'],
    ['Notificaciones push', 'No', 'Requiere el servidor para guardar suscripciones y firmar con VAPID.'],
  ], { tam: 18 }),
  p('Para la versión completa se ejecuta npm start (http://localhost:3000) o se despliega server.js en un servicio con Node.js (Render, Railway, Fly.io…).'),
  h2('13.4 Publicar una actualización'),
  vineta('Hacer el cambio en el código.'),
  vineta([t('Incrementar la constante '), code('VERSION'), t(' en public/sw.js (y añadir a SHELL los archivos nuevos).')]),
  vineta('Commit y git push: GitHub Actions vuelve a publicar.'),
  vineta('Los usuarios con la app abierta ven «Hay una nueva versión» y pulsan Actualizar (Fase 9).'),
  h2('Enlaces de entrega'),
  tabla([2600, 6760], ['Elemento', 'Enlace'], [
    ['Repositorio en GitHub', new Paragraph({ children: [textoEnlace(datos.repositorio)] })],
    ['Aplicación publicada', new Paragraph({ children: [textoEnlace(datos.pages)] })],
  ]),
  cajaCommit(13),
  saltoPagina(),
);

// 7. Capturas
add(
  h1('7. Capturas de pantalla'),
  p('Capturas tomadas automáticamente en Chrome con un viewport de teléfono (390 × 844) mediante scripts/capturas.js.'),
  parCapturas('docs/capturas/01-splash.png', 'docs/capturas/02-home.png', 'Splash dentro de la app (Fase 5.2)', 'Home con botón de instalación (Fase 5.3)'),
  parCapturas('docs/capturas/03-catalogo.png', 'docs/capturas/04-detalle-csr.png', 'Catálogo renderizado en el cliente (Fase 4.2)', 'Detalle con reseñas (Fases 4 y 8)'),
  parCapturas('docs/capturas/05-resena-pendiente-offline.png', 'docs/capturas/06-offline-html.png', 'Reseña pendiente sin conexión (Fase 8.2)', 'Página offline.html (Fase 7.1)'),
  parCapturas('docs/capturas/07-ficha-ssr-hidratada.png', 'docs/capturas/08-cerca-de-mi.png', 'Ficha SSR hidratada (Fase 11.3)', 'Cerca de mí con GPS (Fase 11.2)'),
  parCapturas('docs/capturas/09-ajustes.png', null, 'Ajustes: preferencias, notificaciones y dispositivo', ''),
);

// 8. Conclusiones
add(
  h1('8. Conclusiones'),
  vineta('El modelo app shell, combinado con el precache del service worker, permite que la aplicación cargue al instante y funcione sin conexión desde la segunda visita.'),
  vineta('Elegir la estrategia de caché según el tipo de recurso (cache first, network first, stale-while-revalidate) equilibra velocidad y frescura de los datos.'),
  vineta('El patrón «local primero» con IndexedDB y Background Sync evita perder lo que escribe el usuario cuando no hay red; hacer la API idempotente es clave para que los reintentos no dupliquen datos.'),
  vineta('El ciclo de vida del service worker exige gestionar las actualizaciones de forma explícita: avisar al usuario y activar la nueva versión solo cuando acepta.'),
  vineta('Las notificaciones push requieren un servidor con claves VAPID; son la única parte que no puede ofrecer un hosting estático como GitHub Pages.'),
  vineta('Las pruebas automatizadas en un navegador real detectaron dos errores que no se veían a simple vista (búsqueda en caché del network first y currentTarget nulo tras await).'),
  h1('Anexo · Cómo ejecutar el proyecto'),
  ...bloqueCodigo('git clone https://github.com/<usuario>/ruta-del-cafe-pwa.git\ncd ruta-del-cafe-pwa\nnpm install\nnpm start            # http://localhost:3000\nnpm test             # pruebas automatizadas (requiere Chrome o Edge)'),
);

// ---------- Documento ----------
const doc = new Document({
  creator: 'Ruta del Café',
  title: 'Reporte técnico · PWA Ruta del Café',
  description: 'Construcción paso a paso de una Aplicación Web Progresiva',
  features: { updateFields: true }, // Word ofrece actualizar el índice al abrir
  styles: {
    default: { document: { run: { font: FUENTE, size: 22, color: '2B1D14' } } },
    paragraphStyles: [
      { id: 'Heading1', name: 'Heading 1', basedOn: 'Normal', next: 'Normal', quickFormat: true,
        run: { font: FUENTE, size: 34, bold: true, color: CAFE },
        paragraph: { spacing: { before: 360, after: 160 }, keepNext: true, keepLines: true, outlineLevel: 0,
          border: { bottom: { style: BorderStyle.SINGLE, size: 8, color: 'C8814A', space: 4 } } } },
      { id: 'Heading2', name: 'Heading 2', basedOn: 'Normal', next: 'Normal', quickFormat: true,
        run: { font: FUENTE, size: 28, bold: true, color: '3E2A1F' },
        paragraph: { spacing: { before: 300, after: 120 }, keepNext: true, keepLines: true, outlineLevel: 1 } },
      { id: 'Heading3', name: 'Heading 3', basedOn: 'Normal', next: 'Normal', quickFormat: true,
        run: { font: FUENTE, size: 23, bold: true, color: 'A0642F' },
        paragraph: { spacing: { before: 200, after: 80 }, keepNext: true, keepLines: true, outlineLevel: 2 } },
    ],
  },
  numbering: {
    config: [{
      reference: 'vinetas',
      levels: [
        { level: 0, format: LevelFormat.BULLET, text: '•', alignment: AlignmentType.LEFT, style: { paragraph: { indent: { left: 540, hanging: 270 } } } },
        { level: 1, format: LevelFormat.BULLET, text: '◦', alignment: AlignmentType.LEFT, style: { paragraph: { indent: { left: 1080, hanging: 270 } } } },
      ],
    }],
  },
  sections: [{
    properties: {
      page: { size: { width: 12240, height: 15840 }, margin: { top: 1440, bottom: 1440, left: 1440, right: 1440 } },
      titlePage: true,
    },
    headers: {
      default: new Header({ children: [new Paragraph({ alignment: AlignmentType.RIGHT, children: [t('Ruta del Café · Reporte técnico PWA', { size: 17, color: '8A7A6E' })] })] }),
      first: new Header({ children: [new Paragraph('')] }),
    },
    footers: {
      default: new Footer({ children: [new Paragraph({ alignment: AlignmentType.CENTER, children: [t('Página ', { size: 18, color: '8A7A6E' }), new TextRun({ children: [PageNumber.CURRENT], font: FUENTE, size: 18, color: '8A7A6E' })] })] }),
      first: new Footer({ children: [new Paragraph('')] }),
    },
    children: hijos,
  }],
});

const SALIDA = path.join(RAIZ, 'docs', 'Reporte-PWA-Ruta-del-Cafe.docx');
Packer.toBuffer(doc).then((buf) => {
  fs.writeFileSync(SALIDA, buf);
  console.log(`✔ Reporte generado: ${path.relative(RAIZ, SALIDA)} (${(buf.length / 1024).toFixed(0)} KB)`);
  console.log(`  Commits encontrados: ${Object.keys(commits).length} · Casos aprobados: ${aprobados}/${casos.length}`);
});
