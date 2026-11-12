// Fase 10.2 · Genera el par de claves VAPID y lo guarda en vapid.json (NO se sube al repositorio).
// Uso: npm run vapid
// La clave pública se entrega al navegador; la privada firma los envíos y nunca sale del servidor.
const fs = require('fs');
const path = require('path');
const webpush = require('web-push');

const ARCHIVO = path.join(__dirname, '..', 'vapid.json');

if (fs.existsSync(ARCHIVO) && !process.argv.includes('--forzar')) {
  console.log('Ya existe vapid.json. Usa «npm run vapid -- --forzar» para regenerarlo');
  console.log('(las suscripciones existentes dejarían de funcionar).');
  process.exit(0);
}

const claves = webpush.generateVAPIDKeys();
fs.writeFileSync(ARCHIVO, JSON.stringify(claves, null, 2));
console.log('✔ Claves VAPID guardadas en vapid.json');
console.log('Pública :', claves.publicKey);
console.log('Privada : (oculta, ver vapid.json)');
