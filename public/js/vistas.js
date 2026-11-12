// Fase 4.2 · Vistas renderizadas en el navegador (CSR).
import { listarCafes, obtenerCafe } from './api.js';
import { escapar, estrellas } from './utils.js';

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

export async function vistaInicio(el) {
  const cafes = await listarCafes();
  const destacados = [...cafes].sort((a, b) => b.puntuacion - a.puntuacion).slice(0, 3);
  el.innerHTML = `
    <section class="tarjeta hero">
      <img src="icons/icon-192.png" alt="" width="96" height="96">
      <h1>Ruta del Café</h1>
      <p>Descubre cafeterías de especialidad y guarda tus favoritas.</p>
      <div class="acciones" style="justify-content:center">
        <a class="btn" href="#/catalogo">Ver catálogo</a>
      </div>
    </section>
    <h2>Mejor valoradas</h2>
    <div class="rejilla">${destacados.map((c) => tarjetaCafe(c)).join('')}</div>`;
}

export async function vistaCatalogo(el) {
  const cafes = await listarCafes();
  el.innerHTML = `
    <h1>Catálogo</h1>
    <div class="buscador">
      <input type="search" id="buscar" placeholder="Buscar por nombre, ciudad o etiqueta…" aria-label="Buscar">
    </div>
    <div class="rejilla" id="lista"></div>`;
  const lista = el.querySelector('#lista');
  const pintar = (q = '') => {
    const t = q.trim().toLowerCase();
    const filtrados = cafes.filter((c) => [c.nombre, c.ciudad, c.pais, ...c.etiquetas].join(' ').toLowerCase().includes(t));
    lista.innerHTML = filtrados.length
      ? filtrados.map((c) => tarjetaCafe(c)).join('')
      : '<p class="vacio">Sin resultados.</p>';
  };
  el.querySelector('#buscar').addEventListener('input', (e) => pintar(e.target.value));
  pintar();
}

export async function vistaDetalle(el, { id }) {
  const c = await obtenerCafe(id);
  el.innerHTML = `
    <article class="tarjeta">
      <div class="cafe-card__img" style="border-radius:10px;margin-bottom:12px" aria-hidden="true">${escapar(c.emoji)}</div>
      <h1>${escapar(c.nombre)}</h1>
      <p class="meta">${escapar(c.direccion)} · ${escapar(c.ciudad)}, ${escapar(c.pais)}</p>
      <p><span class="estrellas">${estrellas(c.puntuacion)}</span> <strong>${c.puntuacion}</strong> · ${escapar(c.precio)} · ${escapar(c.horario)}</p>
      <p>${escapar(c.descripcion)}</p>
      <div class="etiquetas">${c.etiquetas.map((e) => `<span class="etiqueta">${escapar(e)}</span>`).join('')}</div>
      <div class="acciones">
        <a class="btn btn--sec" href="#/catalogo">← Volver</a>
        <a class="btn btn--sec" href="cafe/${c.id}">Ver versión SSR</a>
      </div>
    </article>`;
}
