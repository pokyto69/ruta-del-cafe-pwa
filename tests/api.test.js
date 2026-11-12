// Fase 12 · Pruebas del servidor (API, SSR, reseñas y push) con el runner nativo node:test.
const os = require('os');
const fs = require('fs');
const path = require('path');
process.env.RESENAS_FILE = path.join(os.tmpdir(), `resenas-test-${process.pid}.json`);
process.env.SUSCRIPCIONES_FILE = path.join(os.tmpdir(), `sus-test-${process.pid}.json`);

const { test, before, after } = require('node:test');
const assert = require('node:assert/strict');
const { iniciarServidor } = require('./ayudantes');

let servidor, base;
before(async () => ({ servidor, base } = await iniciarServidor()));
after(() => {
  servidor.close();
  fs.rmSync(process.env.RESENAS_FILE, { force: true });
  fs.rmSync(process.env.SUSCRIPCIONES_FILE, { force: true });
});

const post = (ruta, cuerpo) => fetch(base + ruta, {
  method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(cuerpo),
});

test('API-01 · GET /api/cafes devuelve el catálogo completo', async () => {
  const r = await fetch(base + 'api/cafes');
  assert.equal(r.status, 200);
  const datos = await r.json();
  assert.equal(datos.length, 8);
  assert.ok(datos.every((c) => c.id && c.nombre && typeof c.lat === 'number'));
});

test('API-02 · GET /api/cafes?q= filtra por texto', async () => {
  const datos = await (await fetch(base + 'api/cafes?q=wifi')).json();
  assert.ok(datos.length > 0);
  assert.ok(datos.every((c) => c.etiquetas.some((e) => e.toLowerCase().includes('wifi'))));
});

test('API-03 · GET /api/cafes/:id inexistente responde 404', async () => {
  assert.equal((await fetch(base + 'api/cafes/999')).status, 404);
});

test('SSR-01 · /cafe/:id devuelve HTML completo generado en el servidor', async () => {
  const r = await fetch(base + 'cafe/3');
  assert.equal(r.status, 200);
  assert.match(r.headers.get('content-type'), /html/);
  const html = await r.text();
  assert.match(html, /<h1>Grano de Oro<\/h1>/);
  assert.match(html, /id="datos-ficha"/);
  assert.match(html, /<base href="\.\.\/">/);
});

test('SSR-02 · /cafe/:id inexistente responde 404 en HTML', async () => {
  const r = await fetch(base + 'cafe/abc');
  assert.equal(r.status, 404);
  assert.match(await r.text(), /no encontrada/i);
});

test('SSR-03 · el SSR escapa el contenido (sin inyección de HTML)', async () => {
  const html = await (await fetch(base + 'cafe/%3Cscript%3E')).text();
  assert.ok(!html.includes('<script>'));
});

test('RES-01 · POST /api/resenas válido crea la reseña (201)', async () => {
  const r = await post('api/resenas', { idLocal: 'test-1', cafeId: 1, autor: 'Ana', texto: 'Muy rico', puntuacion: 5, creadaEn: Date.now() });
  assert.equal(r.status, 201);
  const lista = await (await fetch(base + 'api/resenas?cafeId=1')).json();
  assert.equal(lista.length, 1);
});

test('RES-02 · reenviar el mismo idLocal no duplica (idempotencia del sync)', async () => {
  const r = await post('api/resenas', { idLocal: 'test-1', cafeId: 1, autor: 'Ana', texto: 'Muy rico', puntuacion: 5 });
  assert.equal(r.status, 200);
  const lista = await (await fetch(base + 'api/resenas?cafeId=1')).json();
  assert.equal(lista.length, 1);
});

test('RES-03 · reseña inválida responde 400', async () => {
  assert.equal((await post('api/resenas', { idLocal: 'x', cafeId: 1, texto: '', puntuacion: 9 })).status, 400);
  assert.equal((await post('api/resenas', { idLocal: 'y', cafeId: 999, texto: 'hola', puntuacion: 3 })).status, 400);
});

test('PUSH-01 · GET /api/push/clave-publica entrega una clave VAPID', async () => {
  const { clavePublica } = await (await fetch(base + 'api/push/clave-publica')).json();
  assert.match(clavePublica, /^[A-Za-z0-9_-]{80,}$/);
});

test('PUSH-02 · una suscripción mal formada se rechaza (400)', async () => {
  assert.equal((await post('api/push/suscribir', { endpoint: 'http://inseguro' })).status, 400);
});

test('EST-01 · manifest.json, sw.js y offline.html se sirven', async () => {
  for (const ruta of ['manifest.json', 'sw.js', 'offline.html', 'icons/icon-512.png', 'icons/maskable-512.png']) {
    assert.equal((await fetch(base + ruta)).status, 200, ruta);
  }
  const m = await (await fetch(base + 'manifest.json')).json();
  assert.equal(m.display, 'standalone');
  assert.ok(m.icons.some((i) => i.sizes === '512x512' && i.purpose === 'maskable'));
});
