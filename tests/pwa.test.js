// Fase 12 · Pruebas de extremo a extremo en Chrome/Edge real (headless) con puppeteer-core.
// Cubren instalabilidad, service worker, offline, IndexedDB, Background Sync, actualización,
// notificaciones, geolocalización e hidratación SSR.
const os = require('os');
const fs = require('fs');
const path = require('path');
process.env.RESENAS_FILE = path.join(os.tmpdir(), `resenas-e2e-${process.pid}.json`);
process.env.SUSCRIPCIONES_FILE = path.join(os.tmpdir(), `sus-e2e-${process.pid}.json`);

const { test, before, after, beforeEach, afterEach } = require('node:test');
const assert = require('node:assert/strict');
const express = require('express');
const { abrirNavegador, esperarSW } = require('./ayudantes');

const espera = (ms) => new Promise((r) => setTimeout(r, ms));
const app = require('../server.js');

// Envoltorio que permite servir un sw.js con otra versión (para probar actualizaciones)
let versionFalsa = null;
const raiz = express();
raiz.get('/sw.js', (req, res, next) => {
  if (!versionFalsa) return next();
  const src = fs.readFileSync(path.join(__dirname, '..', 'public', 'sw.js'), 'utf8')
    .replace(/const VERSION = '[^']+'/, `const VERSION = '${versionFalsa}'`);
  res.type('js').send(src);
});
raiz.use(app);

let servidor, base, puerto, navegador, pagina, errores;

const arrancar = () => new Promise((r) => { servidor = raiz.listen(puerto || 0, () => { puerto = servidor.address().port; r(); }); });
const detener = () => { servidor.close(); servidor.closeAllConnections(); };
/** Corta la red de verdad: el servidor se apaga y el navegador pasa a modo offline. */
async function sinConexion() { detener(); await pagina.setOfflineMode(true); }
async function conConexion() { await arrancar(); await pagina.setOfflineMode(false); }
const irA = async (hash) => {
  await pagina.evaluate((h) => { location.hash = h; }, hash);
  await espera(150);
};

before(async () => {
  await arrancar();
  base = `http://localhost:${puerto}/`;
});
after(() => {
  detener();
  fs.rmSync(process.env.RESENAS_FILE, { force: true });
  fs.rmSync(process.env.SUSCRIPCIONES_FILE, { force: true });
});
beforeEach(async () => {
  versionFalsa = null;
  navegador = await abrirNavegador();
  pagina = await navegador.newPage();
  errores = [];
  pagina.on('pageerror', (e) => errores.push(e.message));
  await pagina.goto(base, { waitUntil: 'networkidle0' });
  await esperarSW(pagina);
});
afterEach(async () => {
  await navegador.close();
  if (!servidor.listening) await arrancar();
});

test('PWA-01 · el manifiesto es válido y la app es instalable', async () => {
  const cdp = await pagina.createCDPSession();
  const { errors: erroresManifiesto } = await cdp.send('Page.getAppManifest');
  assert.deepEqual(erroresManifiesto, []);
  const { installabilityErrors } = await cdp.send('Page.getInstallabilityErrors');
  assert.deepEqual(installabilityErrors, [], JSON.stringify(installabilityErrors));
});

test('PWA-02 · el service worker se activa, controla la página y precachea el shell', async () => {
  const info = await pagina.evaluate(async () => {
    const reg = await navigator.serviceWorker.ready;
    const shell = (await caches.keys()).find((c) => c.startsWith('shell-'));
    const n = (await (await caches.open(shell)).keys()).length;
    return { estado: reg.active.state, controlada: !!navigator.serviceWorker.controller, enCache: n };
  });
  assert.equal(info.estado, 'activated');
  assert.ok(info.controlada);
  assert.ok(info.enCache >= 20, `solo ${info.enCache} recursos en caché`);
});

test('PWA-03 · splash dentro de la app se retira y el Home muestra contenido', async () => {
  await pagina.reload({ waitUntil: 'domcontentloaded' });
  assert.ok(await pagina.$('#splash'), 'el splash debe verse al arrancar');
  await pagina.waitForSelector('.hero h1');
  // mínimo 700 ms + transición de salida de 400 ms
  await pagina.waitForFunction(() => !document.getElementById('splash'), { timeout: 3000 });
  assert.ok((await pagina.$$('.rejilla .cafe-card')).length >= 3);
});

test('PWA-04 · CSR: el enrutador pinta catálogo, búsqueda y detalle', async () => {
  await irA('#/catalogo');
  await pagina.waitForSelector('#lista .cafe-card');
  assert.equal((await pagina.$$('#lista .cafe-card')).length, 8);
  await pagina.type('#buscar', 'lima');
  assert.equal((await pagina.$$('#lista .cafe-card')).length, 1);
  await irA('#/cafe/4');
  await pagina.waitForFunction(() => document.querySelector('#app h1')?.textContent === 'Café del Puerto');
});

test('PWA-05 · favoritos en IndexedDB y tema en localStorage persisten tras recargar', async () => {
  await irA('#/cafe/2');
  await pagina.waitForSelector('#btn-fav');
  await pagina.click('#btn-fav');
  await espera(300);
  await irA('#/ajustes');
  await pagina.waitForSelector('#tema');
  await pagina.select('#tema', 'oscuro');
  await pagina.reload({ waitUntil: 'networkidle0' });
  await irA('#/');
  await pagina.waitForSelector('.hero');
  await espera(300);
  const favoritas = await pagina.$$eval('h2', (hs) => {
    const h = hs.find((x) => x.textContent === 'Tus favoritas');
    return [...h.nextElementSibling.querySelectorAll('h3')].map((x) => x.textContent);
  });
  assert.deepEqual(favoritas, ['La Molienda']);
  assert.equal(await pagina.evaluate(() => document.documentElement.dataset.tema), 'oscuro');
});

test('PWA-06 · sin conexión: el shell, el catálogo y el detalle siguen funcionando', async () => {
  await irA('#/catalogo');
  await pagina.waitForSelector('#lista .cafe-card');
  await sinConexion();
  await pagina.reload({ waitUntil: 'domcontentloaded' });
  await pagina.waitForSelector('#lista .cafe-card', { timeout: 8000 });
  assert.equal((await pagina.$$('#lista .cafe-card')).length, 8);
  assert.equal(await pagina.$eval('#estado-red', (e) => e.textContent), 'Sin conexión');
  await irA('#/cafe/5');
  await pagina.waitForFunction(() => document.querySelector('#app h1')?.textContent === 'Altura 2600', { timeout: 8000 });
  await conConexion();
});

test('PWA-07 · sin conexión: ficha SSR visitada sale de caché; no visitada muestra offline.html', async () => {
  await pagina.goto(base + 'cafe/3', { waitUntil: 'networkidle0' });
  await sinConexion();
  await pagina.goto(base + 'cafe/3', { waitUntil: 'domcontentloaded' });
  assert.equal(await pagina.$eval('h1', (e) => e.textContent), 'Grano de Oro');
  await pagina.goto(base + 'cafe/7', { waitUntil: 'domcontentloaded' });
  assert.equal(await pagina.$eval('h1', (e) => e.textContent), 'Estás sin conexión');
  await conConexion();
});

test('PWA-08 · reseña sin conexión queda pendiente y Background Sync la envía', async () => {
  await irA('#/cafe/6');
  await pagina.waitForSelector('#form-resena');
  await sinConexion();
  await pagina.type('#r-texto', 'Escrita sin red (prueba e2e)');
  await pagina.click('#form-resena button[type=submit]');
  await pagina.waitForSelector('.resena--pendiente');
  await conConexion();
  // En headless la red real nunca se corta, así que el primer intento de sync ya falló y Chrome
  // lo reprograma con espera. Forzamos el evento como lo hace DevTools (Application → Sync).
  const cdp = await pagina.createCDPSession();
  const reg = await new Promise((r) => {
    cdp.on('ServiceWorker.workerRegistrationUpdated', (e) => e.registrations.length && r(e.registrations[0]));
    cdp.send('ServiceWorker.enable');
  });
  await cdp.send('ServiceWorker.dispatchSyncEvent', {
    origin: new URL(base).origin, registrationId: reg.registrationId, tag: 'enviar-resenas', lastChance: false,
  });
  await pagina.waitForFunction(() => !document.querySelector('.resena--pendiente'), { timeout: 8000 });
  const enServidor = await (await fetch(base + 'api/resenas?cafeId=6')).json();
  assert.ok(enServidor.some((r) => r.texto === 'Escrita sin red (prueba e2e)'));
});

test('PWA-09 · una versión nueva del SW se anuncia y se aplica al aceptar', async () => {
  versionFalsa = 'v-prueba-actualizacion';
  await pagina.evaluate(() => navigator.serviceWorker.getRegistration().then((r) => r.update()));
  await pagina.waitForSelector('.aviso .btn', { timeout: 15000 });
  await Promise.all([pagina.waitForNavigation({ waitUntil: 'networkidle0' }), pagina.click('.aviso .btn')]);
  const claves = await pagina.evaluate(() => caches.keys());
  assert.ok(claves.includes('shell-v-prueba-actualizacion'));
  assert.ok(!claves.some((c) => c.startsWith('shell-') && c !== 'shell-v-prueba-actualizacion'));
});

test('PWA-10 · notificación local y evento push del service worker', async () => {
  await navegador.defaultBrowserContext().overridePermissions(new URL(base).origin, ['notifications']);
  await irA('#/ajustes');
  await pagina.waitForSelector('#n-local');
  await pagina.click('#n-local');
  await espera(500);
  const cdp = await pagina.createCDPSession();
  const reg = await new Promise((r) => {
    cdp.on('ServiceWorker.workerRegistrationUpdated', (e) => e.registrations.length && r(e.registrations[0]));
    cdp.send('ServiceWorker.enable');
  });
  await cdp.send('ServiceWorker.deliverPushMessage', {
    origin: new URL(base).origin, registrationId: reg.registrationId,
    data: JSON.stringify({ titulo: 'Push de prueba', cuerpo: 'e2e', url: './#/cafe/1' }),
  });
  await espera(800);
  const titulos = await pagina.evaluate(async () =>
    (await (await navigator.serviceWorker.ready).getNotifications()).map((n) => n.title));
  assert.ok(titulos.includes('Ruta del Café'), 'falta la notificación local');
  assert.ok(titulos.includes('Push de prueba'), 'falta la notificación push');
});

test('PWA-11 · «Cerca de mí» ordena por distancia usando la geolocalización', async () => {
  await navegador.defaultBrowserContext().overridePermissions(new URL(base).origin, ['geolocation']);
  await pagina.setGeolocation({ latitude: -12.12, longitude: -77.03 }); // Lima
  await irA('#/cerca');
  await pagina.waitForSelector('#usar-gps');
  await pagina.click('#usar-gps');
  await pagina.waitForSelector('#resultado-cerca .cafe-card');
  const primera = await pagina.$eval('#resultado-cerca .cafe-card h3', (e) => e.textContent);
  assert.equal(primera, 'Tostadero Miraflores');
});

test('PWA-12 · la ficha SSR se ve sin JavaScript y se hidrata con JavaScript', async () => {
  const sinJS = await navegador.newPage();
  await sinJS.setJavaScriptEnabled(false);
  await sinJS.goto(base + 'cafe/2', { waitUntil: 'networkidle0' });
  assert.equal(await sinJS.$eval('h1', (e) => e.textContent), 'La Molienda');
  await sinJS.close();
  await pagina.goto(base + 'cafe/2', { waitUntil: 'networkidle0' });
  await pagina.waitForSelector('#ficha[data-hidratada="true"]');
  const botones = await pagina.$$eval('#ficha-acciones > *', (b) => b.length);
  assert.equal(botones, 3);
  assert.ok(await pagina.$('#ficha-resenas #form-resena'));
});

test('PWA-13 · ninguna vista produce errores de JavaScript', async () => {
  for (const h of ['#/', '#/catalogo', '#/cafe/1', '#/cerca', '#/ajustes']) {
    await irA(h);
    await espera(300);
  }
  assert.deepEqual(errores, []);
});
