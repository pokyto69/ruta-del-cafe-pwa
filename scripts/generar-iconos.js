// Genera los íconos PNG de la PWA sin dependencias externas (solo zlib de Node).
// Uso: npm run iconos
const fs = require('fs');
const path = require('path');
const zlib = require('zlib');

const SALIDA = path.join(__dirname, '..', 'public', 'icons');
fs.mkdirSync(SALIDA, { recursive: true });

const COLOR = {
  cafe: [0x6f, 0x4e, 0x37, 255],
  crema: [0xf6, 0xef, 0xe7, 255],
  acento: [0xc8, 0x81, 0x4a, 255],
  nada: [0, 0, 0, 0],
};

// ---- Geometría del dibujo en coordenadas normalizadas (0..1) ----
const dentroElipse = (x, y, cx, cy, rx, ry) => ((x - cx) / rx) ** 2 + ((y - cy) / ry) ** 2 <= 1;

function taza(u, v) {
  // Vapor: tres líneas onduladas
  for (const cx of [0.36, 0.46, 0.56]) {
    if (v >= 0.12 && v <= 0.34) {
      const x = cx + 0.028 * Math.sin((v - 0.12) * Math.PI * 9);
      if (Math.abs(u - x) < 0.022) return COLOR.crema;
    }
  }
  // Superficie del café
  if (dentroElipse(u, v, 0.46, 0.43, 0.205, 0.04)) return COLOR.acento;
  // Asa
  const d = Math.hypot(u - 0.68, v - 0.56);
  if (u > 0.64 && d <= 0.105 && d >= 0.055) return COLOR.crema;
  // Cuerpo
  if (u >= 0.24 && u <= 0.68 && v >= 0.42 && v <= 0.62) return COLOR.crema;
  if (v > 0.62 && dentroElipse(u, v, 0.46, 0.62, 0.22, 0.15)) return COLOR.crema;
  // Plato
  if (dentroElipse(u, v, 0.46, 0.81, 0.36, 0.045)) return COLOR.crema;
  return null;
}

function pixel(x, y, maskable) {
  // Fondo: cuadrado completo (maskable) o cuadrado redondeado (any)
  if (!maskable) {
    const r = 0.22;
    const qx = Math.max(Math.abs(x - 0.5) - (0.5 - r), 0);
    const qy = Math.max(Math.abs(y - 0.5) - (0.5 - r), 0);
    if (Math.hypot(qx, qy) > r) return COLOR.nada;
  }
  // Contenido escalado a la zona segura (maskable: círculo del 80%)
  const escala = maskable ? 0.62 : 0.84;
  const u = (x - 0.5) / escala + 0.5;
  const v = (y - 0.5) / escala + 0.5;
  return taza(u, v) || COLOR.cafe;
}

// ---- Rasterizado con suavizado (supermuestreo 4x4) ----
function rasterizar(tam, maskable) {
  const S = 4;
  const datos = Buffer.alloc((tam * 4 + 1) * tam);
  for (let py = 0; py < tam; py++) {
    const fila = py * (tam * 4 + 1);
    datos[fila] = 0; // filtro PNG «None»
    for (let px = 0; px < tam; px++) {
      let r = 0, g = 0, b = 0, a = 0;
      for (let sy = 0; sy < S; sy++) {
        for (let sx = 0; sx < S; sx++) {
          const c = pixel((px + (sx + 0.5) / S) / tam, (py + (sy + 0.5) / S) / tam, maskable);
          r += c[0] * c[3]; g += c[1] * c[3]; b += c[2] * c[3]; a += c[3];
        }
      }
      const o = fila + 1 + px * 4;
      datos[o] = a ? Math.round(r / a) : 0;
      datos[o + 1] = a ? Math.round(g / a) : 0;
      datos[o + 2] = a ? Math.round(b / a) : 0;
      datos[o + 3] = Math.round(a / (S * S));
    }
  }
  return datos;
}

// ---- Codificación PNG ----
function bloque(tipo, datos) {
  const largo = Buffer.alloc(4);
  largo.writeUInt32BE(datos.length);
  const tipoYDatos = Buffer.concat([Buffer.from(tipo, 'ascii'), datos]);
  const crc = Buffer.alloc(4);
  crc.writeUInt32BE(zlib.crc32(tipoYDatos) >>> 0);
  return Buffer.concat([largo, tipoYDatos, crc]);
}

function png(tam, maskable) {
  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(tam, 0);
  ihdr.writeUInt32BE(tam, 4);
  ihdr[8] = 8;  // profundidad de bits
  ihdr[9] = 6;  // RGBA
  return Buffer.concat([
    Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]),
    bloque('IHDR', ihdr),
    bloque('IDAT', zlib.deflateSync(rasterizar(tam, maskable), { level: 9 })),
    bloque('IEND', Buffer.alloc(0)),
  ]);
}

const iconos = [
  { archivo: 'icon-192.png', tam: 192, maskable: false },
  { archivo: 'icon-512.png', tam: 512, maskable: false },
  { archivo: 'maskable-192.png', tam: 192, maskable: true },
  { archivo: 'maskable-512.png', tam: 512, maskable: true },
  { archivo: 'apple-touch-icon.png', tam: 180, maskable: true },
  { archivo: 'favicon-32.png', tam: 32, maskable: false },
  { archivo: 'badge-72.png', tam: 72, maskable: false },
];

for (const { archivo, tam, maskable } of iconos) {
  fs.writeFileSync(path.join(SALIDA, archivo), png(tam, maskable));
  console.log(`✔ ${archivo} (${tam}x${tam}${maskable ? ', maskable' : ''})`);
}
