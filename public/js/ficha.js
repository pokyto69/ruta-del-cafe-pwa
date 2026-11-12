// Fase 11.3 · Hidratación de la ficha SSR.
// El servidor ya envió el HTML completo (visible aunque JavaScript falle o tarde).
// Aquí NO volvemos a pintar la ficha: leemos los datos incrustados en la página
// (<script id="datos-ficha">) y conectamos la interactividad al DOM existente.
import { iniciarIndicadorConexion } from './conexion.js';
import { esFavorito, alternarFavorito } from './favoritos.js';
import { montarResenas, iniciarSincronizacionResenas } from './resenas.js';
import { compartir, vibrar } from './dispositivo.js';
import { aplicarTema } from './prefs.js';
import { guardar } from './db.js';
import { avisar } from './utils.js';
import { registrarServiceWorker } from './actualizacion.js';

const t0 = performance.now();
const cafe = JSON.parse(document.getElementById('datos-ficha').textContent);

aplicarTema();
iniciarIndicadorConexion();
iniciarSincronizacionResenas();

// Guardar la cafetería en IndexedDB para tenerla disponible sin conexión en la app CSR
guardar('cafes', cafe).catch(() => {});

// 1) Botones que solo tienen sentido con JavaScript: se añaden al HTML del servidor
const acciones = document.getElementById('ficha-acciones');
const btnFav = document.createElement('button');
btnFav.className = 'btn';
btnFav.type = 'button';
const pintarFav = (fav) => {
  btnFav.textContent = fav ? '♥ En favoritas' : '♡ Añadir a favoritas';
  btnFav.setAttribute('aria-pressed', fav);
};
pintarFav(await esFavorito(cafe.id));
btnFav.addEventListener('click', async () => {
  const fav = await alternarFavorito(cafe);
  pintarFav(fav);
  vibrar(40);
  avisar(fav ? 'Guardada en favoritas' : 'Quitada de favoritas');
});

const btnCompartir = document.createElement('button');
btnCompartir.className = 'btn btn--sec';
btnCompartir.type = 'button';
btnCompartir.textContent = '↗ Compartir';
btnCompartir.addEventListener('click', async () => {
  const r = await compartir({ title: cafe.nombre, text: cafe.descripcion, url: location.href });
  if (r === 'copiado') avisar('Enlace copiado al portapapeles');
});

acciones.append(btnFav, btnCompartir);

// 2) La sección de reseñas pasa de texto estático a componente interactivo
await montarResenas(document.getElementById('ficha-resenas'), cafe.id);

document.getElementById('ficha').dataset.hidratada = 'true';
console.log(`[Ficha SSR] Hidratada en ${Math.round(performance.now() - t0)} ms:`, cafe.nombre);

registrarServiceWorker().catch(() => {});
