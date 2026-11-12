// Fase 6.2 · Preferencias del usuario en localStorage.
// localStorage es síncrono y solo guarda texto: ideal para ajustes pequeños, no para datos.
const CLAVE = 'ruta-cafe:prefs';

const PREDETERMINADAS = {
  tema: 'auto',          // auto | claro | oscuro
  nombreAutor: '',       // nombre que se propone al escribir reseñas
  orden: 'puntuacion',   // puntuacion | nombre | ciudad
  ultimaVisita: null,
};

export function leerPrefs() {
  try {
    return { ...PREDETERMINADAS, ...JSON.parse(localStorage.getItem(CLAVE) || '{}') };
  } catch {
    return { ...PREDETERMINADAS };
  }
}

export function guardarPref(clave, valor) {
  const prefs = { ...leerPrefs(), [clave]: valor };
  try { localStorage.setItem(CLAVE, JSON.stringify(prefs)); } catch { /* modo privado o lleno */ }
  if (clave === 'tema') aplicarTema(valor);
  return prefs;
}

export function borrarPrefs() {
  try { localStorage.removeItem(CLAVE); } catch { /* sin acceso */ }
  aplicarTema('auto');
}

export function aplicarTema(tema = leerPrefs().tema) {
  const raiz = document.documentElement;
  if (tema === 'claro' || tema === 'oscuro') raiz.dataset.tema = tema;
  else delete raiz.dataset.tema;
}

/** Registra la visita actual y devuelve la fecha de la anterior. */
export function registrarVisita() {
  const anterior = leerPrefs().ultimaVisita;
  guardarPref('ultimaVisita', Date.now());
  return anterior;
}
