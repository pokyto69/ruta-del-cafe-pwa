// Fase 4.2 · Vistas renderizadas en el navegador (CSR).
import { listarCafes, obtenerCafe, origenDatos } from './api.js';
import { escapar, estrellas, fecha, avisar } from './utils.js';
import { actualizarBotones } from './instalacion.js';
import { leerPrefs, guardarPref, borrarPrefs } from './prefs.js';
import { esFavorito, alternarFavorito, listarFavoritos } from './favoritos.js';
import { vaciar } from './db.js';

export function tarjetaCafe(c, extra = '') {
  return `
    <a class="tarjeta cafe-card" href="#/cafe/${c.id}">
      <div class="cafe-card__img" aria-hidden="true">${escapar(c.emoji)}</div>
      <div class="cafe-card__cuerpo">
        <h3>${escapar(c.nombre)}</h3>
        <span class="meta">${escapar(c.ciudad)}, ${escapar(c.pais)} · ${escapar(c.precio)}</span>
        <span><span class="estrellas">${estrellas(c.puntuacion)}</span> ${c.puntuacion}</span>
        ${extra}
      </div>
    </a>`;
}

const avisoOrigen = () => origenDatos === 'local'
  ? '<p class="tarjeta meta">📦 Mostrando datos guardados en tu dispositivo (IndexedDB) porque no hay conexión.</p>'
  : '';

const ordenar = (cafes, orden) => [...cafes].sort((a, b) =>
  orden === 'nombre' ? a.nombre.localeCompare(b.nombre, 'es')
    : orden === 'ciudad' ? a.ciudad.localeCompare(b.ciudad, 'es')
      : b.puntuacion - a.puntuacion);

// ---------- Inicio ----------
export async function vistaInicio(el, _params, { visitaAnterior } = {}) {
  const [cafes, favoritos] = await Promise.all([listarCafes(), listarFavoritos()]);
  const destacados = ordenar(cafes, 'puntuacion').slice(0, 3);
  el.innerHTML = `
    ${avisoOrigen()}
    <section class="tarjeta hero">
      <img src="icons/icon-192.png" alt="" width="96" height="96">
      <h1>Ruta del Café</h1>
      <p>Descubre cafeterías de especialidad y guarda tus favoritas.</p>
      <div class="acciones" style="justify-content:center">
        <a class="btn" href="#/catalogo">Ver catálogo</a>
        <button class="btn oculto-inst" type="button" data-instalar>⬇ Instalar app</button>
      </div>
      <p class="meta" data-estado-instalacion></p>
      ${visitaAnterior ? `<p class="meta">Tu última visita: ${fecha(visitaAnterior)}</p>` : ''}
    </section>
    <h2>Tus favoritas</h2>
    ${favoritos.length
      ? `<div class="rejilla">${favoritos.map((c) => tarjetaCafe(c)).join('')}</div>`
      : '<p class="tarjeta vacio">Aún no tienes favoritas. Pulsa ♡ en la ficha de una cafetería.</p>'}
    <h2 style="margin-top:16px">Mejor valoradas</h2>
    <div class="rejilla">${destacados.map((c) => tarjetaCafe(c)).join('')}</div>`;
  actualizarBotones();
}

// ---------- Catálogo ----------
export async function vistaCatalogo(el) {
  const cafes = await listarCafes();
  const { orden } = leerPrefs();
  el.innerHTML = `
    ${avisoOrigen()}
    <h1>Catálogo</h1>
    <div class="buscador">
      <input type="search" id="buscar" placeholder="Buscar por nombre, ciudad o etiqueta…" aria-label="Buscar">
      <select id="orden" aria-label="Ordenar" style="width:auto">
        <option value="puntuacion">Mejor valoradas</option>
        <option value="nombre">Nombre</option>
        <option value="ciudad">Ciudad</option>
      </select>
    </div>
    <div class="rejilla" id="lista"></div>`;
  const lista = el.querySelector('#lista');
  const buscar = el.querySelector('#buscar');
  const selOrden = el.querySelector('#orden');
  selOrden.value = orden;
  const pintar = () => {
    const t = buscar.value.trim().toLowerCase();
    const filtrados = ordenar(cafes, selOrden.value)
      .filter((c) => [c.nombre, c.ciudad, c.pais, ...c.etiquetas].join(' ').toLowerCase().includes(t));
    lista.innerHTML = filtrados.length
      ? filtrados.map((c) => tarjetaCafe(c)).join('')
      : '<p class="vacio">Sin resultados.</p>';
  };
  buscar.addEventListener('input', pintar);
  selOrden.addEventListener('change', () => { guardarPref('orden', selOrden.value); pintar(); });
  pintar();
}

// ---------- Detalle ----------
export async function vistaDetalle(el, { id }) {
  const c = await obtenerCafe(id);
  const fav = await esFavorito(c.id);
  el.innerHTML = `
    ${avisoOrigen()}
    <article class="tarjeta">
      <div class="cafe-card__img" style="border-radius:10px;margin-bottom:12px" aria-hidden="true">${escapar(c.emoji)}</div>
      <h1>${escapar(c.nombre)}</h1>
      <p class="meta">${escapar(c.direccion)} · ${escapar(c.ciudad)}, ${escapar(c.pais)}</p>
      <p><span class="estrellas">${estrellas(c.puntuacion)}</span> <strong>${c.puntuacion}</strong> · ${escapar(c.precio)} · ${escapar(c.horario)}</p>
      <p>${escapar(c.descripcion)}</p>
      <div class="etiquetas">${c.etiquetas.map((e) => `<span class="etiqueta">${escapar(e)}</span>`).join('')}</div>
      <div class="acciones">
        <a class="btn btn--sec" href="#/catalogo">← Volver</a>
        <button class="btn" id="btn-fav" type="button" aria-pressed="${fav}">${fav ? '♥ En favoritas' : '♡ Añadir a favoritas'}</button>
        <a class="btn btn--sec" href="cafe/${c.id}">Ver versión SSR</a>
      </div>
    </article>
    <div id="zona-resenas"></div>`;
  const btn = el.querySelector('#btn-fav');
  btn.addEventListener('click', async () => {
    const ahora = await alternarFavorito(c);
    btn.textContent = ahora ? '♥ En favoritas' : '♡ Añadir a favoritas';
    btn.setAttribute('aria-pressed', ahora);
    avisar(ahora ? 'Guardada en favoritas (IndexedDB)' : 'Quitada de favoritas');
  });
  return c;
}

// ---------- Ajustes ----------
export async function vistaAjustes(el) {
  const prefs = leerPrefs();
  let espacio = '';
  if (navigator.storage?.estimate) {
    const { usage, quota } = await navigator.storage.estimate();
    espacio = `${(usage / 1024 / 1024).toFixed(2)} MB usados de ${(quota / 1024 / 1024).toFixed(0)} MB disponibles`;
  }
  el.innerHTML = `
    <h1>Ajustes</h1>
    <section class="tarjeta">
      <h2>Preferencias <small class="meta">(localStorage)</small></h2>
      <label for="tema">Tema</label>
      <select id="tema">
        <option value="auto">Automático (según el sistema)</option>
        <option value="claro">Claro</option>
        <option value="oscuro">Oscuro</option>
      </select>
      <label for="autor">Tu nombre para las reseñas</label>
      <input type="text" id="autor" maxlength="40" placeholder="Anónimo" value="${escapar(prefs.nombreAutor)}">
    </section>
    <div id="zona-ajustes-extra"></div>
    <section class="tarjeta">
      <h2>Datos guardados</h2>
      <p class="meta">${escapar(espacio || 'Estimación de almacenamiento no disponible.')}</p>
      <div class="acciones">
        <button class="btn btn--peligro" id="borrar-datos" type="button">Borrar datos locales</button>
      </div>
    </section>`;
  const tema = el.querySelector('#tema');
  tema.value = prefs.tema;
  tema.addEventListener('change', () => guardarPref('tema', tema.value));
  el.querySelector('#autor').addEventListener('change', (e) => guardarPref('nombreAutor', e.target.value.trim()));
  el.querySelector('#borrar-datos').addEventListener('click', async () => {
    if (!confirm('¿Borrar favoritas, catálogo guardado y preferencias de este dispositivo?')) return;
    await Promise.all([vaciar('favoritos'), vaciar('cafes')]);
    borrarPrefs();
    avisar('Datos locales borrados');
    vistaAjustes(el);
  });
}
