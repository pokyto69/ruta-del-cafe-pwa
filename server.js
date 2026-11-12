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

if (require.main === module) {
  app.listen(PORT, () => {
    console.log(`Ruta del Café escuchando en http://localhost:${PORT}`);
  });
}

module.exports = app;
