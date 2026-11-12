// Fase 11.1 · Acceso a elementos físicos del dispositivo.
// Cada función comprueba si la API existe (detección de características) y degrada con elegancia.

export const capacidades = () => ({
  geolocalizacion: 'geolocation' in navigator,
  vibracion: 'vibrate' in navigator,
  compartir: 'share' in navigator,
  portapapeles: !!navigator.clipboard?.writeText,
  bateria: 'getBattery' in navigator,
  red: 'connection' in navigator,
  pantallaActiva: 'wakeLock' in navigator,
  orientacion: 'DeviceOrientationEvent' in window,
});

/** GPS / ubicación. Requiere HTTPS (o localhost) y permiso del usuario. */
export function obtenerUbicacion({ precisa = false, tiempoMax = 10000 } = {}) {
  return new Promise((resolve, reject) => {
    if (!('geolocation' in navigator)) return reject(new Error('Tu dispositivo no ofrece geolocalización'));
    navigator.geolocation.getCurrentPosition(
      (pos) => resolve({ lat: pos.coords.latitude, lng: pos.coords.longitude, precision: pos.coords.accuracy }),
      (err) => reject(new Error({
        1: 'Permiso de ubicación denegado',
        2: 'No se pudo determinar la ubicación',
        3: 'La ubicación tardó demasiado',
      }[err.code] || err.message)),
      { enableHighAccuracy: precisa, timeout: tiempoMax, maximumAge: 5 * 60 * 1000 },
    );
  });
}

/** Distancia en km entre dos coordenadas (fórmula del haversine). */
export function distanciaKm(a, b) {
  const R = 6371;
  const rad = (g) => (g * Math.PI) / 180;
  const dLat = rad(b.lat - a.lat);
  const dLng = rad(b.lng - a.lng);
  const h = Math.sin(dLat / 2) ** 2 + Math.cos(rad(a.lat)) * Math.cos(rad(b.lat)) * Math.sin(dLng / 2) ** 2;
  return 2 * R * Math.asin(Math.sqrt(h));
}

/** Motor de vibración (Android). En iOS/escritorio no hace nada. */
export function vibrar(patron = 80) {
  if ('vibrate' in navigator) return navigator.vibrate(patron);
  return false;
}

/** Hoja de compartir nativa; si no existe, copia el enlace al portapapeles. */
export async function compartir({ title, text, url }) {
  if (navigator.share) {
    try {
      await navigator.share({ title, text, url });
      return 'compartido';
    } catch (e) {
      if (e.name === 'AbortError') return 'cancelado';
    }
  }
  if (navigator.clipboard?.writeText) {
    await navigator.clipboard.writeText(url);
    return 'copiado';
  }
  return 'no-soportado';
}

export async function estadoBateria() {
  if (!('getBattery' in navigator)) return null;
  const b = await navigator.getBattery();
  return { nivel: Math.round(b.level * 100), cargando: b.charging };
}

export function estadoRed() {
  const c = navigator.connection;
  return c ? { tipo: c.effectiveType, bajada: c.downlink, ahorroDatos: c.saveData } : null;
}
