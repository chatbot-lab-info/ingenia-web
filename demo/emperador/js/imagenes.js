/* ==========================================================
   EMPERADOR VINOTECA · IMÁGENES DEL INICIO
   Acá se cargan las fotos del slider del inicio (una por estilo
   de vino) y la foto del pie de página. Es lo único que hay
   que tocar para cambiarlas.

   CÓMO CARGAR UNA FOTO
   1) Subí el archivo a la carpeta img/hero/ con el nombre de abajo
      (si usás otro nombre, cambiá la ruta acá).
   2) Listo. Si el archivo todavía no existe, el slide muestra un
      fondo de color y la copa, así que nada se rompe.

   MEDIDAS RECOMENDADAS (JPG o WebP, hasta ~400 KB cada una)
   - Escritorio (img):          2400 x 1350 px, apaisada.
   - Celular (imgMobile, opc.): 1080 x 1920 px, vertical. Si no la
     cargás, en el celular se usa la de escritorio recortada.
   - Dejá la zona de abajo y la de arriba algo oscuras o vacías:
     ahí van el menú, el nombre EMPERADOR y la tarjeta de texto.

   pos: qué parte de la foto queda a la vista al recortar.
        '50% 50%' = centro. '50% 30%' = un poco más arriba.
   tint: color del fondo de reemplazo mientras no hay foto.
   ========================================================== */
window.HERO_SLIDES = [
  {
    name: 'TINTOS',
    text: 'Vinos seleccionados para disfrutar sin demasiadas vueltas.',
    img: 'img/hero/tintos.jpg',
    fg: 'img/hero/tintos-fg.webp',
    imgMobile: 'img/hero/tintos-m.jpg',
    pos: '50% 50%',
    tint: 'rgba(139, 26, 52, 0.55)'
  },
  {
    name: 'ROSÉS',
    text: 'Frescura para cada ocasión, del aperitivo a la sobremesa.',
    img: 'img/hero/roses.jpg',
    fg: 'img/hero/roses-fg.webp',
    imgMobile: 'img/hero/roses-m.jpg',
    pos: '50% 50%',
    tint: 'rgba(190, 80, 105, 0.5)'
  },
  {
    name: 'BLANCOS',
    text: 'Blancos frescos y aromáticos, para el mediodía o la cena.',
    img: 'img/hero/blancos.jpg',
    fg: 'img/hero/blancos-fg.webp',
    imgMobile: 'img/hero/blancos-m.jpg',
    pos: '50% 50%',
    tint: 'rgba(216, 196, 110, 0.45)'
  },
  {
    name: 'ESPUMANTES',
    text: 'Burbujas para festejar lo que importa, sin esperar una fecha.',
    img: 'img/hero/espumantes.jpg',
    fg: 'img/hero/espumantes-fg.webp',
    imgMobile: 'img/hero/espumantes-m.jpg',
    pos: '50% 50%',
    tint: 'rgba(200, 160, 80, 0.4)',
    // Burbujas dentro de la copa (rectángulo del líquido, en % de la foto)
    bubbles: { x: 58.46, y: 39.16, w: 7.51, h: 24.64 }
  }
];

// Fotos de las tarjetas de categoría (home). La primera de cada lista es la que se ve
// por defecto; en Vinos cambia al pasar el mouse por cada subcategoría.
// Las categorías sin foto siguen mostrando su ilustración.
window.CAT_IMAGES = {
  vinos: [
    { sub: 'tintos', img: 'img/cat/vinos-tintos.jpg', pos: '14% 78%', zoom: true },
    { sub: 'blancos', img: 'img/cat/vinos-blancos.jpg', pos: '14% 78%' },
    { sub: 'rosados', img: 'img/cat/vinos-rosados.jpg', pos: '14% 78%' },
    { sub: 'dulces', img: 'img/cat/vinos-dulces.jpg', pos: '14% 78%' }
  ],
  espumantes: [
    { sub: 'brut-nature', img: 'img/cat/espumantes-brut-nature.jpg', pos: '14% 72%', zoom: true },
    { sub: 'brut-rose', img: 'img/cat/espumantes-brut-rose.jpg', pos: '14% 72%' },
    { sub: 'extra-brut', img: 'img/cat/espumantes-extra-brut.jpg', pos: '14% 72%' },
    { sub: 'dulces', img: 'img/cat/espumantes-dulces.jpg', pos: '14% 72%' }
  ],
  destilados: [
    { sub: 'aperitivos', img: 'img/cat/destilados-aperitivos.jpg', n: 'img/cat/destilados-aperitivos-n.jpg', pos: '14% 60%', zoom: true },
    { sub: 'gins', img: 'img/cat/destilados-gins.jpg', n: 'img/cat/destilados-gins-n.jpg', pos: '14% 60%' },
    { sub: 'licores', img: 'img/cat/destilados-licores.jpg', n: 'img/cat/destilados-licores-n.jpg', pos: '14% 60%' },
    { sub: 'whiskys', img: 'img/cat/destilados-whiskys.jpg', n: 'img/cat/destilados-whiskys-n.jpg', pos: '14% 60%' },
    { sub: 'rones', img: 'img/cat/destilados-rones.jpg', n: 'img/cat/destilados-rones-n.jpg', pos: '14% 60%' }
  ],
  regaleria: [
    { sub: 'copas', img: 'img/cat/regaleria-copas.jpg', pos: '50% 72%', zoom: true, z: 1.5 },
    { sub: 'sets', img: 'img/cat/regaleria-sets.jpg', pos: '50% 84%', z: 1.1 }
  ],
  cervezas: [
    { sub: 'con-alcohol', img: 'img/cat/cervezas-con-alcohol.jpg', pos: '14% 64%', zoom: true },
    { sub: 'sin-alcohol', img: 'img/cat/cervezas-sin-alcohol.jpg', pos: '14% 64%' }
  ]
};

// Foto del pie de página (de lado a lado, abajo de todo)
window.FOOTER_IMAGE = {
  img: 'img/hero/pie.jpg',          // 2400 x 1200 px recomendado
  imgMobile: 'img/hero/pie-m.jpg',  // 1080 x 1400 px (opcional)
  pos: '50% 70%'
};
