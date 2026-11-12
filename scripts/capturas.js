// Genera las capturas de pantalla del reporte (docs/capturas) con un Chrome headless.
// Uso: node scripts/capturas.js
const fs = require('fs');
const os = require('os');
const path = require('path');
process.env.RESENAS_FILE = path.join(os.tmpdir(), `resenas-capturas-${process.pid}.json`);
const { iniciarServidor, abrirNavegador, esperarSW } = require('../tests/ayudantes');

const SALIDA = path.join(__dirname, '..', 'docs', 'capturas');
fs.mkdirSync(SALIDA, { recursive: true });
const espera = (ms) => new Promise((r) => setTimeout(r, ms));

(async () => {
  let { servidor, base } = await iniciarServidor();
  const puerto = servidor.address().port;
  const nav = await abrirNavegador();
  await nav.defaultBrowserContext().overridePermissions(new URL(base).origin, ['geolocation', 'notifications']);
  const p = await nav.newPage();
  await p.setViewport({ width: 390, height: 844, deviceScaleFactor: 2, isMobile: true, hasTouch: true });
  const foto = async (nombre) => { await espera(500); await p.screenshot({ path: path.join(SALIDA, `${nombre}.png`) }); console.log('✔', nombre); };
  const ir = async (hash, selector) => { await p.evaluate((h) => { location.hash = h; }, hash); await p.waitForSelector(selector); };

  try {
    await p.goto(base, { waitUntil: 'networkidle0' });
    await esperarSW(p);
    await p.reload({ waitUntil: 'domcontentloaded' });
    await foto('01-splash');
    await p.waitForFunction(() => !document.getElementById('splash'), { timeout: 4000 });
    await foto('02-home');
    await ir('#/catalogo', '#lista .cafe-card');
    await foto('03-catalogo');
    await ir('#/cafe/1', '#form-resena');
    await p.type('#r-autor', 'Ana');
    await p.type('#r-texto', 'Excelente V60, muy buena atención.');
    await p.click('#form-resena button[type=submit]');
    await espera(1500);
    await p.evaluate(() => document.querySelectorAll('.aviso').forEach((a) => a.remove()));
    await foto('04-detalle-csr');

    // Sin conexión
    servidor.close(); servidor.closeAllConnections();
    await p.setOfflineMode(true);
    await espera(300);
    await p.evaluate(() => document.querySelectorAll('.aviso').forEach((a) => a.remove()));
    await p.type('#r-texto', 'Escrita sin conexión: se enviará después.');
    await p.click('#form-resena button[type=submit]');
    await p.waitForSelector('.resena--pendiente');
    await p.evaluate(() => document.querySelector('.resena--pendiente').scrollIntoView({ block: 'center' }));
    await foto('05-resena-pendiente-offline');
    await p.goto(base + 'cafe/8', { waitUntil: 'domcontentloaded' });
    await foto('06-offline-html');
    await p.setOfflineMode(false);
    servidor = require('../server.js').listen(puerto);

    await p.goto(base + 'cafe/2', { waitUntil: 'networkidle0' });
    await p.waitForSelector('#ficha[data-hidratada="true"]');
    await foto('07-ficha-ssr-hidratada');

    await p.goto(base + '#/cerca', { waitUntil: 'networkidle0' });
    await p.setGeolocation({ latitude: 9.93, longitude: -84.08 });
    await p.waitForSelector('#usar-gps');
    await p.click('#usar-gps');
    await p.waitForSelector('#resultado-cerca .cafe-card', { timeout: 8000 }).catch(async () => { throw new Error('GPS: ' + await p.$eval('#estado-gps', (e) => e.textContent)); });
    await foto('08-cerca-de-mi');

    await ir('#/ajustes', '#n-local');
    await espera(800);
    await p.screenshot({ path: path.join(SALIDA, '09-ajustes.png'), fullPage: true });
    console.log('✔ 09-ajustes');
  } finally {
    await nav.close();
    servidor.close();
    fs.rmSync(process.env.RESENAS_FILE, { force: true });
  }
})();
