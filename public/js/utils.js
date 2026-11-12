// Utilidades compartidas.

export const escapar = (s) => String(s ?? '').replace(/[&<>"']/g, (c) => (
  { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]
));

export const estrellas = (n) => '★'.repeat(Math.round(n)) + '☆'.repeat(5 - Math.round(n));

export const fecha = (ms) => new Date(ms).toLocaleString('es', { dateStyle: 'medium', timeStyle: 'short' });

/** Muestra un aviso flotante. `accion` = { texto, alPulsar } opcional. */
export function avisar(mensaje, { accion, duracion = 4000 } = {}) {
  let cont = document.querySelector('.avisos');
  if (!cont) {
    cont = document.createElement('div');
    cont.className = 'avisos';
    cont.setAttribute('aria-live', 'polite');
    document.body.append(cont);
  }
  const el = document.createElement('div');
  el.className = 'aviso';
  el.innerHTML = `<span>${escapar(mensaje)}</span>`;
  if (accion) {
    const btn = document.createElement('button');
    btn.className = 'btn';
    btn.textContent = accion.texto;
    btn.addEventListener('click', () => { el.remove(); accion.alPulsar(); });
    el.append(btn);
  }
  cont.append(el);
  if (duracion) setTimeout(() => el.remove(), duracion);
  return el;
}
