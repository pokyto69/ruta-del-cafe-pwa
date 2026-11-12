// Servidor de desarrollo de la PWA «Ruta del Café».
const fs = require('fs');
const path = require('path');
const express = require('express');
const { paginaFicha, pagina404 } = require('./lib/ssr');

const app = express();
const PORT = process.env.PORT || 3000;
const PUBLIC = path.join(__dirname, 'public');

// Catálogo: una única fuente de datos (también se publica como estático para GitHub Pages)
const CAFES = JSON.parse(fs.readFileSync(path.join(PUBLIC, 'data', 'cafes.json'), 'utf8'));
const buscarCafe = (id) => CAFES.find((c) => String(c.id) === String(id));

app.use(express.json());
app.use(express.static(PUBLIC));

// ---------- Fase 4.1 · API del catálogo (datos remotos) ----------
app.get('/api/cafes', (req, res) => {
  const q = String(req.query.q || '').trim().toLowerCase();
  const lista = q
    ? CAFES.filter((c) => [c.nombre, c.ciudad, c.pais, ...c.etiquetas].join(' ').toLowerCase().includes(q))
    : CAFES;
  res.json(lista);
});

app.get('/api/cafes/:id', (req, res) => {
  const cafe = buscarCafe(req.params.id);
  if (!cafe) return res.status(404).json({ error: 'No encontrado' });
  res.json(cafe);
});

// ---------- Fase 4.3 · SSR: ficha generada en el servidor ----------
app.get('/cafe/:id', (req, res) => {
  const cafe = buscarCafe(req.params.id);
  if (!cafe) return res.status(404).type('html').send(pagina404(req.params.id));
  res.type('html').send(paginaFicha(cafe));
});

// ---------- Fase 8.1 · API de reseñas ----------
// Se guardan en data/resenas.json. El cliente envía un `idLocal` único,
// así reenviar la misma reseña (reintento de Background Sync) no la duplica.
const ARCHIVO_RESENAS = process.env.RESENAS_FILE || path.join(__dirname, 'data', 'resenas.json');

function leerResenas() {
  try { return JSON.parse(fs.readFileSync(ARCHIVO_RESENAS, 'utf8')); } catch { return []; }
}
function escribirResenas(lista) {
  fs.mkdirSync(path.dirname(ARCHIVO_RESENAS), { recursive: true });
  fs.writeFileSync(ARCHIVO_RESENAS, JSON.stringify(lista, null, 2));
}

app.get('/api/resenas', (req, res) => {
  const { cafeId } = req.query;
  const lista = leerResenas()
    .filter((r) => !cafeId || String(r.cafeId) === String(cafeId))
    .sort((a, b) => b.creadaEn - a.creadaEn);
  res.json(lista);
});

app.post('/api/resenas', (req, res) => {
  const { idLocal, cafeId, autor, texto, puntuacion, creadaEn } = req.body || {};
  const p = Number(puntuacion);
  if (!idLocal || !buscarCafe(cafeId) || !String(texto || '').trim() || !(p >= 1 && p <= 5)) {
    return res.status(400).json({ error: 'Reseña inválida: se requieren idLocal, cafeId válido, texto y puntuación 1–5.' });
  }
  const lista = leerResenas();
  const existente = lista.find((r) => r.idLocal === idLocal);
  if (existente) return res.status(200).json(existente); // idempotente

  const resena = {
    id: lista.length ? Math.max(...lista.map((r) => r.id)) + 1 : 1,
    idLocal: String(idLocal).slice(0, 64),
    cafeId: Number(cafeId),
    autor: String(autor || 'Anónimo').trim().slice(0, 40) || 'Anónimo',
    texto: String(texto).trim().slice(0, 1000),
    puntuacion: Math.round(p),
    creadaEn: Number(creadaEn) || Date.now(),
    recibidaEn: Date.now(),
  };
  lista.push(resena);
  escribirResenas(lista);
  res.status(201).json(resena);
  app.emit('resena-nueva', resena); // la Fase 10 la usa para enviar un push
});

// ---------- Fase 10.3 · Push: suscripciones y envío ----------
const push = require('./lib/push');

app.get('/api/push/clave-publica', (req, res) => {
  res.json({ clavePublica: push.clavePublica });
});

app.post('/api/push/suscribir', (req, res) => {
  if (!push.esSuscripcionValida(req.body)) return res.status(400).json({ error: 'Suscripción inválida' });
  const total = push.guardarSuscripcion(req.body);
  res.status(201).json({ ok: true, total });
});

app.post('/api/push/desuscribir', (req, res) => {
  const eliminadas = push.borrarSuscripcion(req.body?.endpoint);
  res.json({ ok: true, eliminadas });
});

app.post('/api/push/enviar', async (req, res) => {
  // En un despliegue público, define PUSH_TOKEN para que solo tú puedas enviar avisos
  if (process.env.PUSH_TOKEN && req.get('x-push-token') !== process.env.PUSH_TOKEN) {
    return res.status(401).json({ error: 'No autorizado' });
  }
  const { titulo, cuerpo, url } = req.body || {};
  const resultado = await push.enviarATodos({
    titulo: String(titulo || 'Ruta del Café').slice(0, 80),
    cuerpo: String(cuerpo || '¡Hay novedades en tus cafeterías!').slice(0, 200),
    url: typeof url === 'string' && url.startsWith('./') ? url : './',
    etiqueta: 'prueba',
  });
  res.json(resultado);
});

// Cada reseña nueva genera un push para los suscriptores
app.on('resena-nueva', (resena) => {
  const cafe = buscarCafe(resena.cafeId);
  push.enviarATodos({
    titulo: `Nueva reseña en ${cafe?.nombre || 'una cafetería'}`,
    cuerpo: `${resena.autor}: ${'★'.repeat(resena.puntuacion)} «${resena.texto.slice(0, 80)}»`,
    url: `./#/cafe/${resena.cafeId}`,
    etiqueta: `resena-${resena.cafeId}`,
  }).catch((e) => console.warn('[Push] Falló el aviso de reseña:', e.message));
});

if (require.main === module) {
  app.listen(PORT, () => {
    console.log(`Ruta del Café escuchando en http://localhost:${PORT}`);
  });
}

module.exports = app;
