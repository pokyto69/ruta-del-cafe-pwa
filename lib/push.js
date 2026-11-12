// Fase 10.3 · Servidor de notificaciones push.
// Guarda las suscripciones de los navegadores y les envía mensajes firmados con VAPID.
const fs = require('fs');
const path = require('path');
const webpush = require('web-push');

const RAIZ = path.join(__dirname, '..');
const ARCHIVO_VAPID = path.join(RAIZ, 'vapid.json');
const ARCHIVO_SUS = process.env.SUSCRIPCIONES_FILE || path.join(RAIZ, 'data', 'suscripciones.json');

function cargarClaves() {
  if (process.env.VAPID_PUBLIC_KEY && process.env.VAPID_PRIVATE_KEY) {
    return { publicKey: process.env.VAPID_PUBLIC_KEY, privateKey: process.env.VAPID_PRIVATE_KEY };
  }
  if (fs.existsSync(ARCHIVO_VAPID)) return JSON.parse(fs.readFileSync(ARCHIVO_VAPID, 'utf8'));
  // Primera ejecución: se generan y se guardan para que las suscripciones sigan valiendo
  const claves = webpush.generateVAPIDKeys();
  fs.writeFileSync(ARCHIVO_VAPID, JSON.stringify(claves, null, 2));
  console.log('[Push] Se generaron claves VAPID nuevas en vapid.json');
  return claves;
}

const claves = cargarClaves();
webpush.setVapidDetails(process.env.VAPID_SUBJECT || 'mailto:admin@example.com', claves.publicKey, claves.privateKey);

const leer = () => { try { return JSON.parse(fs.readFileSync(ARCHIVO_SUS, 'utf8')); } catch { return []; } };
const escribir = (lista) => {
  fs.mkdirSync(path.dirname(ARCHIVO_SUS), { recursive: true });
  fs.writeFileSync(ARCHIVO_SUS, JSON.stringify(lista, null, 2));
};

const esSuscripcionValida = (s) => s && typeof s.endpoint === 'string' && /^https:\/\//.test(s.endpoint)
  && s.keys && typeof s.keys.p256dh === 'string' && typeof s.keys.auth === 'string';

function guardarSuscripcion(sus) {
  const lista = leer().filter((s) => s.endpoint !== sus.endpoint);
  lista.push({ endpoint: sus.endpoint, keys: sus.keys, creadaEn: Date.now() });
  escribir(lista);
  return lista.length;
}

function borrarSuscripcion(endpoint) {
  const lista = leer();
  const nueva = lista.filter((s) => s.endpoint !== endpoint);
  escribir(nueva);
  return lista.length - nueva.length;
}

/** Envía `mensaje` ({titulo, cuerpo, url, etiqueta}) a todas las suscripciones. */
async function enviarATodos(mensaje) {
  const lista = leer();
  const carga = JSON.stringify(mensaje);
  const resultados = await Promise.allSettled(lista.map((s) => webpush.sendNotification(s, carga, { TTL: 60 * 60 })));
  const caducadas = [];
  let enviados = 0;
  resultados.forEach((r, i) => {
    if (r.status === 'fulfilled') enviados++;
    // 404/410: el navegador anuló la suscripción → se elimina
    else if ([404, 410].includes(r.reason?.statusCode)) caducadas.push(lista[i].endpoint);
    else console.warn('[Push] Error al enviar:', r.reason?.statusCode, r.reason?.body || r.reason?.message);
  });
  if (caducadas.length) escribir(leer().filter((s) => !caducadas.includes(s.endpoint)));
  return { total: lista.length, enviados, eliminadas: caducadas.length };
}

module.exports = {
  clavePublica: claves.publicKey,
  esSuscripcionValida,
  guardarSuscripcion,
  borrarSuscripcion,
  enviarATodos,
  contarSuscripciones: () => leer().length,
};
