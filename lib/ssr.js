// Fase 4.3 · Renderizado del lado del servidor (SSR) de la ficha de una cafetería.
// El servidor devuelve HTML completo: se ve sin JavaScript y es indexable.

const escapar = (s) => String(s ?? '').replace(/[&<>"']/g, (c) => (
  { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]
));

const estrellas = (n) => '★'.repeat(Math.round(n)) + '☆'.repeat(5 - Math.round(n));

function fichaHTML(cafe) {
  return `
    <article class="tarjeta" id="ficha" data-id="${cafe.id}">
      <div class="cafe-card__img" style="border-radius:10px;margin-bottom:12px" aria-hidden="true">${escapar(cafe.emoji)}</div>
      <h1>${escapar(cafe.nombre)}</h1>
      <p class="meta">${escapar(cafe.direccion)} · ${escapar(cafe.ciudad)}, ${escapar(cafe.pais)}</p>
      <p><span class="estrellas" aria-label="${cafe.puntuacion} de 5">${estrellas(cafe.puntuacion)}</span>
         <strong>${cafe.puntuacion}</strong> · ${escapar(cafe.precio)} · ${escapar(cafe.horario)}</p>
      <p>${escapar(cafe.descripcion)}</p>
      <div class="etiquetas">${cafe.etiquetas.map((e) => `<span class="etiqueta">${escapar(e)}</span>`).join('')}</div>
      <p class="meta" style="margin-top:12px">Página generada en el servidor (SSR) el ${new Date().toLocaleString('es')}.</p>
      <div class="acciones" id="ficha-acciones">
        <a class="btn btn--sec" href="./#/catalogo">← Volver al catálogo</a>
      </div>
    </article>
    <div id="ficha-resenas">
      <section class="tarjeta">
        <h2>Reseñas</h2>
        <p class="meta">Las reseñas se cargan al hidratar la página con JavaScript.</p>
      </section>
    </div>`;
}

function paginaFicha(cafe) {
  return `<!DOCTYPE html>
<html lang="es">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover">
  <base href="../">
  <title>${escapar(cafe.nombre)} · Ruta del Café</title>
  <meta name="description" content="${escapar(cafe.descripcion)}">
  <link rel="manifest" href="manifest.json">
  <meta name="theme-color" content="#6f4e37">
  <link rel="icon" type="image/png" sizes="32x32" href="icons/favicon-32.png">
  <link rel="stylesheet" href="css/styles.css">
  <script type="application/json" id="datos-ficha">${JSON.stringify(cafe).replace(/</g, '\\u003c')}</script>
</head>
<body>
  <header class="barra">
    <a class="marca" href="./#/"><span class="marca__logo" aria-hidden="true">☕</span><span class="marca__texto">Ruta del Café</span></a>
    <div class="barra__acciones"><span id="estado-red" class="estado-red" role="status" aria-live="polite">En línea</span></div>
  </header>
  <main id="app" class="contenido">${fichaHTML(cafe)}
  </main>
  <footer class="pie"><small>Ruta del Café · ficha SSR</small></footer>
  <script type="module" src="js/ficha.js"></script>
</body>
</html>`;
}

function pagina404(id) {
  return `<!DOCTYPE html><html lang="es"><head><meta charset="UTF-8"><base href="../">
<meta name="viewport" content="width=device-width, initial-scale=1"><title>No encontrado · Ruta del Café</title>
<link rel="stylesheet" href="css/styles.css"></head><body><main class="contenido"><section class="tarjeta vacio">
<h1>Cafetería no encontrada</h1><p>No existe una cafetería con id «${escapar(id)}».</p>
<a class="btn" href="./#/catalogo">Ir al catálogo</a></section></main></body></html>`;
}

module.exports = { paginaFicha, pagina404, escapar };
