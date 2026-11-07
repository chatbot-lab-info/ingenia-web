# Emperador Vinoteca · web

Sitio estático (HTML + CSS + JS), sin instalar nada. Se sube tal cual a Netlify.

## Archivos
- `index.html` inicio · `catalogo.html` catálogo con carrito
- `js/config.js` ← **WhatsApp, Instagram, dirección y horarios**
- `js/imagenes.js` ← fotos del slider del inicio y del pie (subirlas a `img/hero/`, ver `img/hero/LEEME.txt`)
- `js/productos.js` ← productos y precios (hoy son de muestra)
- `css/style.css` estilos · `js/` resto de la lógica · `img/` logo e íconos

## Cambios típicos
- Datos del local: completar `js/config.js`.
- Agregar un producto: copiar un bloque en `js/productos.js`. Para foto real, agregar `img: 'img/archivo.jpg'` y subir la foto a `img/`.
- Los pedidos salen por WhatsApp (se arma el mensaje con el carrito).
