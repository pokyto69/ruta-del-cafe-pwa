// Script de la ficha SSR. La hidratación completa se implementa en la Fase 11.3.
const datos = JSON.parse(document.getElementById('datos-ficha')?.textContent || 'null');
console.log('[Ficha SSR] HTML recibido del servidor para:', datos?.nombre);
