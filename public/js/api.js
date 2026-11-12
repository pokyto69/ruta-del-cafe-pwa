// Fase 4.1 · Acceso a los datos remotos del catálogo.
// Rutas relativas para que funcione en localhost y bajo /<repo>/ en GitHub Pages.
// Si la API del servidor no existe (GitHub Pages), se usa el JSON estático.

async function obtenerJSON(url) {
  const r = await fetch(url, { headers: { Accept: 'application/json' } });
  if (!r.ok) throw new Error(`HTTP ${r.status} en ${url}`);
  const tipo = r.headers.get('content-type') || '';
  if (!tipo.includes('json')) throw new Error(`Respuesta no JSON en ${url}`);
  return r.json();
}

export async function listarCafes() {
  try {
    return await obtenerJSON('api/cafes');
  } catch {
    return obtenerJSON('data/cafes.json');
  }
}

export async function obtenerCafe(id) {
  try {
    return await obtenerJSON(`api/cafes/${encodeURIComponent(id)}`);
  } catch {
    const todos = await obtenerJSON('data/cafes.json');
    const cafe = todos.find((c) => String(c.id) === String(id));
    if (!cafe) throw new Error('Cafetería no encontrada');
    return cafe;
  }
}
