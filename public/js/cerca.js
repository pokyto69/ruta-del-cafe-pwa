// Fase 11.2 · Vista «Cerca de mí»: GPS + distancia a cada cafetería.
import { listarCafes } from './api.js';
import { obtenerUbicacion, distanciaKm, vibrar } from './dispositivo.js';
import { tarjetaCafe } from './vistas.js';
import { escapar } from './utils.js';

const formatoKm = (km) => (km < 1 ? `${Math.round(km * 1000)} m` : `${km.toLocaleString('es', { maximumFractionDigits: km < 100 ? 1 : 0 })} km`);

function pintarLista(contenedor, cafes, origen, etiqueta) {
  const ordenados = cafes
    .map((c) => ({ ...c, km: distanciaKm(origen, c) }))
    .sort((a, b) => a.km - b.km);
  contenedor.innerHTML = `
    <p class="meta">Distancias desde ${escapar(etiqueta)}.</p>
    <div class="rejilla">${ordenados.map((c) => tarjetaCafe(c, `<strong>📍 a ${formatoKm(c.km)}</strong>`)).join('')}</div>`;
}

export async function vistaCerca(el) {
  const cafes = await listarCafes();
  const ciudades = [...new Map(cafes.map((c) => [c.ciudad, c])).values()];
  el.innerHTML = `
    <h1>Cerca de mí</h1>
    <section class="tarjeta">
      <p>Usa el GPS de tu dispositivo para ordenar las cafeterías por distancia.</p>
      <div class="acciones">
        <button class="btn" type="button" id="usar-gps">📍 Usar mi ubicación</button>
      </div>
      <label for="ciudad-manual">…o elige una ciudad</label>
      <select id="ciudad-manual">
        <option value="">— Selecciona —</option>
        ${ciudades.map((c) => `<option value="${c.id}">${escapar(c.ciudad)}</option>`).join('')}
      </select>
      <p class="meta" id="estado-gps" role="status"></p>
    </section>
    <div id="resultado-cerca"></div>`;

  const estado = el.querySelector('#estado-gps');
  const resultado = el.querySelector('#resultado-cerca');

  const btnGps = el.querySelector('#usar-gps');
  btnGps.addEventListener('click', async () => {
    btnGps.disabled = true;
    estado.textContent = 'Obteniendo ubicación…';
    try {
      const pos = await obtenerUbicacion();
      estado.textContent = `Ubicación obtenida (precisión ±${Math.round(pos.precision)} m).`;
      vibrar([60, 40, 60]); // confirmación háptica
      pintarLista(resultado, cafes, pos, 'tu ubicación');
    } catch (err) {
      estado.textContent = `${err.message}. Puedes elegir una ciudad manualmente.`;
    } finally {
      btnGps.disabled = false;
    }
  });

  el.querySelector('#ciudad-manual').addEventListener('change', (e) => {
    const ref = cafes.find((c) => String(c.id) === e.target.value);
    if (ref) pintarLista(resultado, cafes, ref, ref.ciudad);
  });
}
