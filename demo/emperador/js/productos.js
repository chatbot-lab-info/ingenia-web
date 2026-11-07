/* ==========================================================
   EMPERADOR VINOTECA · PRODUCTOS DEL CATÁLOGO
   Cada producto es un bloque { ... }. Para agregar uno, copiá
   un bloque, cambiá los datos y recordá la coma entre bloques.

   cat:    vinos | cervezas | destilados | espumantes | regaleria
   sub:    subcategoría dentro de la categoría (los ids están arriba, en
           CATEGORIAS), ej: cat 'vinos' + sub 'tintos'
   shape:  wine | beer | squat | gift   (dibujo mientras no haya foto)
   price:  número sin puntos (18900 = $18.900)
   img:    (opcional) ruta de una foto, ej 'img/malbec.jpg'.
           Si la ponés, reemplaza al dibujo.
   Estos productos y precios son DE MUESTRA: la web real lee los productos del panel.
   ========================================================== */
window.CATEGORIAS = [
  { id: 'vinos', label: 'Vinos', subs: [
    { id: 'tintos', label: 'Vinos Tintos' },
    { id: 'blancos', label: 'Vinos Blancos' },
    { id: 'rosados', label: 'Vinos Rosados' },
    { id: 'dulces', label: 'Vinos Dulces' }
  ] },
  { id: 'cervezas', label: 'Cervezas', subs: [
    { id: 'con-alcohol', label: 'Con Alcohol' },
    { id: 'sin-alcohol', label: 'Sin Alcohol' }
  ] },
  { id: 'destilados', label: 'Destilados', subs: [
    { id: 'aperitivos', label: 'Aperitivos y Vermouths' },
    { id: 'gins', label: 'Gins' },
    { id: 'licores', label: 'Licores' },
    { id: 'whiskys', label: 'Whiskys' },
    { id: 'rones', label: 'Rones' }
  ] },
  { id: 'espumantes', label: 'Espumantes', subs: [
    { id: 'brut-nature', label: 'Brut Nature' },
    { id: 'brut-rose', label: 'Brut Rosé' },
    { id: 'extra-brut', label: 'Extra Brut' },
    { id: 'dulces', label: 'Dulces' }
  ] },
  { id: 'regaleria', label: 'Regalería', subs: [
    { id: 'copas', label: 'Copas y Cristalería' },
    { id: 'sets', label: 'Sets y Cajas de Regalo' }
  ] }
];

// Productos de muestra: solo se usan si panelUrl (js/config.js) está vacío.
window.PRODUCTOS = [];
window.PRODUCTOS_MUESTRA = [
  { id: 'p1', cat: 'vinos', sub: 'tintos', tipo: 'VINO TINTO', name: 'Malbec Reserva', note: 'Ciruela, cacao y un final largo de roble.', price: 18900, shape: 'wine', tint: '#4A0F24', cap: '#B8914A', glow: 'rgba(160,40,70,0.55)' },
  { id: 'p2', cat: 'vinos', sub: 'tintos', tipo: 'VINO TINTO', name: 'Cabernet Franc de Autor', note: 'Frutos rojos, pimiento asado y mucha elegancia.', price: 24500, shape: 'wine', tint: '#3A1020', cap: '#B8914A', glow: 'rgba(140,40,70,0.5)' },
  { id: 'p3', cat: 'vinos', sub: 'blancos', tipo: 'VINO BLANCO', name: 'Torrontés de Altura', note: 'Flores blancas, durazno y frescura al paladar.', price: 12400, shape: 'wine', tint: '#6F6A2A', cap: '#D8B56E', glow: 'rgba(200,185,100,0.4)' },
  { id: 'p4', cat: 'espumantes', sub: 'brut-nature', tipo: 'ESPUMANTE', name: 'Extra Brut Nature', note: 'Manzana verde, brioche y burbuja fina.', price: 16800, shape: 'wine', tint: '#2F3A2E', cap: '#F1DCA4', glow: 'rgba(216,181,110,0.45)' },
  { id: 'p5', cat: 'espumantes', sub: 'brut-rose', tipo: 'ESPUMANTE', name: 'Rosé Brut', note: 'Frutilla, cítricos y un final fresco y seco.', price: 17900, shape: 'wine', tint: '#8E3B4C', cap: '#F1DCA4', glow: 'rgba(210,110,130,0.45)' },
  { id: 'p6', cat: 'destilados', sub: 'gins', tipo: 'GIN', name: 'Gin de Autor', note: 'Enebro, cítricos y botánicos para un gran gin tonic.', price: 21500, shape: 'squat', tint: '#1F4A52', cap: '#B8914A', glow: 'rgba(60,150,160,0.4)' },
  { id: 'p7', cat: 'destilados', sub: 'whiskys', tipo: 'WHISKY', name: 'Single Malt', note: 'Miel, madera y un toque suave de humo.', price: 58000, shape: 'squat', tint: '#6B3F14', cap: '#D8B56E', glow: 'rgba(200,130,50,0.45)' },
  { id: 'p8', cat: 'cervezas', sub: 'con-alcohol', tipo: 'CERVEZA', name: 'IPA Artesanal', note: 'Lúpulo cítrico, amargor marcado y mucho aroma.', price: 3800, shape: 'beer', tint: '#8A4F12', cap: '#D8B56E', glow: 'rgba(210,140,40,0.45)' },
  { id: 'p9', cat: 'cervezas', sub: 'con-alcohol', tipo: 'CERVEZA', name: 'Stout de Cacao', note: 'Café tostado, chocolate y cuerpo cremoso.', price: 4200, shape: 'beer', tint: '#22120E', cap: '#B8914A', glow: 'rgba(120,70,40,0.45)' },
  { id: 'p10', cat: 'regaleria', sub: 'sets', tipo: 'REGALERÍA', name: 'Estuche Emperador', note: 'Dos botellas seleccionadas y copas, en caja de regalo.', price: 49900, shape: 'gift', tint: '#4A1630', cap: '#D8B56E', glow: 'rgba(216,181,110,0.4)' },
  { id: 'p11', cat: 'regaleria', sub: 'sets', tipo: 'REGALERÍA', name: 'Box Brindis', note: 'Un espumante y bombones para sorprender.', price: 36500, shape: 'gift', tint: '#6A1630', cap: '#F1DCA4', glow: 'rgba(200,70,100,0.4)' }
];
