// Ayudantes para las pruebas automatizadas (Fase 12).
// Arranca el servidor en un puerto libre y abre Chrome/Edge en modo headless con puppeteer-core.
const fs = require('fs');
const os = require('os');
const path = require('path');

const NAVEGADORES = [
  process.env.CHROME_PATH,
  'C:/Program Files/Google/Chrome/Application/chrome.exe',
  'C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe',
  '/usr/bin/google-chrome',
  '/usr/bin/chromium',
  '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',
].filter(Boolean);

function rutaNavegador() {
  const ruta = NAVEGADORES.find((p) => fs.existsSync(p));
  if (!ruta) throw new Error('No se encontró Chrome/Edge. Define CHROME_PATH.');
  return ruta;
}

function iniciarServidor() {
  const app = require('../server.js');
  return new Promise((resolve) => {
    const servidor = app.listen(0, () => {
      resolve({ servidor, base: `http://localhost:${servidor.address().port}/` });
    });
  });
}

async function abrirNavegador() {
  const puppeteer = require('puppeteer-core');
  const perfil = fs.mkdtempSync(path.join(os.tmpdir(), 'pwa-prueba-'));
  const navegador = await puppeteer.launch({
    executablePath: rutaNavegador(),
    headless: true,
    userDataDir: perfil,
    // En GitHub Actions (CI=true) el sandbox de Chrome no está disponible en Ubuntu 24.04.
    args: ['--no-first-run', '--no-default-browser-check', ...(process.env.CI ? ['--no-sandbox'] : [])],
  });
  navegador.on('disconnected', () => {
    // En Windows el proceso puede tardar en soltar los archivos del perfil.
    setTimeout(() => {
      try { fs.rmSync(perfil, { recursive: true, force: true, maxRetries: 5, retryDelay: 300 }); } catch { /* temporal */ }
    }, 500);
  });
  return navegador;
}

/** Espera a que el service worker controle la página. */
async function esperarSW(pagina) {
  await pagina.evaluate(() => navigator.serviceWorker.ready);
  const controlada = await pagina.evaluate(async () => {
    if (navigator.serviceWorker.controller) return true;
    // Con clients.claim() el SW toma el control sin recargar; damos un margen.
    return Promise.race([
      new Promise((r) => navigator.serviceWorker.addEventListener('controllerchange', () => r(true), { once: true })),
      new Promise((r) => setTimeout(() => r(false), 2000)),
    ]);
  });
  if (!controlada) await pagina.reload({ waitUntil: 'networkidle0' });
}

module.exports = { iniciarServidor, abrirNavegador, esperarSW };
