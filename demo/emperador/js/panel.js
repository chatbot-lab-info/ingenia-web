/* ==========================================================
   EMPERADOR VINOTECA · conexión con el panel (iNGENIA)
   - Catálogo: GET  PANEL_URL?action=tienda   (se lee por JSONP; si falla, fetch)
   - Pedidos:  POST PANEL_URL  {"action":"crearPedido","payload":{…}}
   El último catálogo recibido queda guardado en el navegador:
   la web abre al instante y se actualiza sola al llegar el nuevo.
   ========================================================== */
(function () {
  'use strict';
  var Emp = window.Emp;
  if (!Emp) return;
  var CFG = window.EMPERADOR_CONFIG || {};
  var PANEL_URL = CFG.panelUrl || '';
  var CACHE_KEY = 'emperador_catalogo_v1';
  var CATS = window.CATEGORIAS || [];
  var Panel = (window.Panel = { state: PANEL_URL ? 'loading' : 'local', url: PANEL_URL });

  /* ---------- utilidades ---------- */
  function slug(s) {
    return String(s == null ? '' : s).toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '')
      .replace(/&/g, ' y ').replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
  }
  function sing(s) { return s.replace(/-?(s|es)$/, ''); }
  function same(a, b) { a = slug(a); b = slug(b); return !!a && (a === b || sing(a) === sing(b)); }
  function jsonp(url, ms) {
    return new Promise(function (resolve, reject) {
      var cb = '__emp_cb_' + Date.now().toString(36) + Math.floor(Math.random() * 1e5);
      var el = document.createElement('script');
      var done = false;
      function end() { done = true; clearTimeout(t); try { delete window[cb]; } catch (e) { window[cb] = undefined; } if (el.parentNode) el.parentNode.removeChild(el); }
      var t = setTimeout(function () { if (!done) { end(); reject(new Error('timeout')); } }, ms || 12000);
      window[cb] = function (data) { if (!done) { end(); resolve(data); } };
      el.onerror = function () { if (!done) { end(); reject(new Error('red')); } };
      el.src = url + (url.indexOf('?') > -1 ? '&' : '?') + 'callback=' + cb;
      document.head.appendChild(el);
    });
  }

  /* ---------- categorías ---------- */
  var SEP = /\s*(?:>|\/|\||·|›|»|→|–|—)\s*/;
  function findCat(raw) { return CATS.filter(function (c) { return same(c.id, raw) || same(c.label, raw); })[0]; }
  function findSub(cat, raw) { return (cat.subs || []).filter(function (s) { return same(s.id, raw) || same(s.label, raw); })[0]; }
  function ensureCat(raw) {
    var c = findCat(raw);
    if (c) return c;
    c = { id: slug(raw) || 'otros', label: String(raw).trim() || 'Otros', subs: [], dinamica: true };
    CATS.push(c);
    return c;
  }
  function ensureSub(cat, raw) {
    var s = findSub(cat, raw);
    if (s) return s;
    s = { id: slug(raw), label: String(raw).trim() };
    cat.subs = cat.subs || [];
    cat.subs.push(s);
    return s;
  }
  // Devuelve {cat, sub} a partir de lo que mande el panel (categoria sola, categoria + subcategoria, o "Vinos > Tintos")
  function classify(rawCat, rawSub) {
    rawCat = String(rawCat == null ? '' : rawCat).trim();
    rawSub = String(rawSub == null ? '' : rawSub).trim();
    if (!rawSub && SEP.test(rawCat)) {
      var parts = rawCat.split(SEP).filter(Boolean);
      rawCat = parts[0] || ''; rawSub = parts.slice(1).join(' ');
    }
    var cat = rawCat ? findCat(rawCat) : null;
    if (!cat && rawCat) {
      // quizá "categoria" trae directamente una subcategoría (ej. "Gins")
      var hit = null;
      CATS.forEach(function (c) { var s = findSub(c, rawCat); if (s && !hit) hit = { cat: c, sub: s }; });
      if (hit) return hit;
    }
    if (!cat) cat = ensureCat(rawCat || 'Otros');
    var sub = rawSub ? ensureSub(cat, rawSub) : null;
    return { cat: cat, sub: sub };
  }

  /* ---------- dibujo de reserva (mientras no haya foto) ---------- */
  function look(catId, subId) {
    var k = catId + '/' + subId;
    if (catId === 'cervezas') return { shape: 'beer', tint: subId === 'sin-alcohol' ? '#8A6A1E' : '#8A4F12', cap: '#D8B56E', glow: 'rgba(210,140,40,0.45)' };
    if (catId === 'destilados') return { shape: 'squat', tint: subId === 'whiskys' || subId === 'rones' ? '#6B3F14' : '#1F4A52', cap: '#B8914A', glow: 'rgba(200,130,50,0.4)' };
    if (catId === 'espumantes') return { shape: 'wine', tint: subId === 'brut-rose' ? '#8E3B4C' : '#2F3A2E', cap: '#F1DCA4', glow: 'rgba(216,181,110,0.45)' };
    if (catId === 'regaleria') return { shape: 'gift', tint: '#4A1630', cap: '#D8B56E', glow: 'rgba(216,181,110,0.4)' };
    if (subId === 'blancos') return { shape: 'wine', tint: '#6F6A2A', cap: '#D8B56E', glow: 'rgba(200,185,100,0.4)' };
    if (subId === 'rosados') return { shape: 'wine', tint: '#9A4A5A', cap: '#D8B56E', glow: 'rgba(210,110,130,0.45)' };
    if (subId === 'dulces') return { shape: 'wine', tint: '#7A5420', cap: '#D8B56E', glow: 'rgba(200,150,60,0.4)' };
    return { shape: 'wine', tint: '#4A0F24', cap: '#B8914A', glow: 'rgba(160,40,70,0.55)' };
  }

  /* ---------- panel → web ---------- */
  function truthy(v) { return !(v === false || v === 0 || /^(false|no|0|n)$/i.test(String(v).trim())); }
  function num(v) {
    if (typeof v === 'number') return isFinite(v) ? v : 0;
    var t = String(v == null ? '' : v).replace(/[^\d,.-]/g, '');
    if (!t) return 0;
    if (t.indexOf(',') > -1) t = t.replace(/\./g, '').replace(',', '.'); // 18.900,50
    else if (/\.\d{3}$/.test(t)) t = t.replace(/\./g, '');              // 18.900
    var n = parseFloat(t);
    return isNaN(n) ? 0 : n;
  }
  function first() { for (var i = 0; i < arguments.length; i++) if (arguments[i] != null && arguments[i] !== '') return arguments[i]; return null; }

  // Acepta el formato v2 (precioBase + presentaciones[] + descripcion + disponible) y el clásico (una fila por presentación).
  function normalize(res) {
    var raw = res && (res.productos || (res.data && res.data.productos) || (Array.isArray(res) ? res : null));
    if (!raw) throw new Error('catálogo vacío');
    var usados = {}, out = [];
    function push(r, pres, i) {
      var pid = first(r.productoId, r.id);
      var nombre = String(first(r.nombre, r.name) || '').trim();
      if (pid == null || !nombre) return;
      if (r.alALaVenta === false || (r.visible != null && !truthy(r.visible))) return;
      pres = pres || {};
      var presTxt = String(first(pres.nombre, pres.label, pres.presentacion, pres.titulo, r.presentacion) || '').trim();
      var precio = num(first(pres.precio, pres.precioBase, r.precio, r.precioBase, r.price, r.precioVenta, r.precioFinal));
      var cantidad = first(pres.cantidad, pres.stock, r.cantidad, r.stock);
      cantidad = cantidad == null ? null : Number(cantidad);
      if (cantidad != null && isNaN(cantidad)) cantidad = null;
      var disp = true;
      var d = first(pres.disponible, r.disponible);
      if (d != null) disp = truthy(d); else if (r.activo != null) disp = truthy(r.activo);
      var est = first(pres.estadoStock, r.estadoStock);
      if (est === 'sin_stock' || est === 'proximamente') disp = false;
      if (cantidad != null && cantidad <= 0) disp = false;
      var cl = classify(r.categoria, first(r.subcategoria, r.subCategoria, r.sub));
      var sid = cl.sub ? cl.sub.id : '';
      var presId = first(pres.id, pres.presentacionId, pres.sku) || (presTxt ? slug(presTxt) : '');
      var id = String(pid) + (presId ? '::' + presId : '');
      if (usados[id]) id += '#' + i;
      usados[id] = 1;
      var l = look(cl.cat.id, sid);
      out.push({
        id: id, productoId: String(pid), presentacionId: presId ? String(presId) : '', presentacion: presTxt,
        cat: cl.cat.id, sub: sid, tipo: (cl.sub ? cl.sub.label : cl.cat.label).toUpperCase(),
        name: nombre, note: presTxt || String(r.descripcion || '').trim(), price: precio,
        img: String(first(pres.imagenUrl, r.imagenUrl, r.imagen) || '').trim(),
        shape: l.shape, tint: l.tint, cap: l.cap, glow: l.glow,
        disponible: disp, stock: cantidad, proximamente: est === 'proximamente'
      });
    }
    raw.forEach(function (r, i) {
      if (!r) return;
      if (Array.isArray(r.presentaciones) && r.presentaciones.length) {
        r.presentaciones.forEach(function (pr, j) { push(r, pr, i + '_' + j); });
      } else push(r, null, i);
    });
    return out;
  }

  function apply(res, desdeCache) {
    var list = normalize(res);
    Panel.config = res.config || Panel.config || {};
    var firma = JSON.stringify(list);
    var igual = Panel.state === 'ok' && firma === Panel.firma;
    Panel.state = 'ok';
    Panel.desdeCache = !!desdeCache;
    Panel.firma = firma;
    // Si el catálogo nuevo es idéntico al que ya se está mostrando, no se redibuja nada (evita el "parpadeo" al cargar)
    if (!igual) Emp.setProducts(list);
    return list;
  }

  /* ---------- carga ---------- */
  function cargar() {
    return jsonp(PANEL_URL + '?action=tienda', 14000).catch(function () {
      return fetch(PANEL_URL + '?action=tienda', { redirect: 'follow' }).then(function (r) { return r.json(); });
    }).then(function (res) {
      if (!res || res.ok === false) throw new Error((res && res.error) || 'respuesta inválida');
      apply(res, false);
      try { localStorage.setItem(CACHE_KEY, JSON.stringify({ t: Date.now(), res: res })); } catch (e) {}
    });
  }

  Panel.reload = function () {
    Panel.state = Panel.state === 'ok' ? 'ok' : 'loading';
    return cargar().catch(function (err) {
      if (Panel.state !== 'ok') Panel.state = 'error';
      Panel.error = String(err && err.message || err);
      document.dispatchEvent(new CustomEvent('emp:productos'));
    });
  };

  if (!PANEL_URL) {
    // Sin panel configurado: se usan los productos de muestra
    Emp.setProducts((window.PRODUCTOS_MUESTRA || []).map(function (p) { p.disponible = true; p.stock = null; return p; }));
  } else {
    try {
      var c = JSON.parse(localStorage.getItem(CACHE_KEY) || 'null');
      if (c && c.res) apply(c.res, true);
    } catch (e) {}
    Panel.reload();
    // al volver a la pestaña, se refresca (por si cambió el stock)
    document.addEventListener('visibilitychange', function () {
      if (!document.hidden && Date.now() - (Panel.last || 0) > 60000) { Panel.last = Date.now(); Panel.reload(); }
    });
    Panel.last = Date.now();
  }

  /* ---------- pedidos ---------- */
  function ref() {
    var a = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789', s = '';
    for (var i = 0; i < 6; i++) s += a.charAt(Math.floor(Math.random() * a.length));
    return 'REF-' + s;
  }

  // d: { items:[{p,q}], nombre, telefono, direccion, retira, pago }
  // Resuelve {ok, ref, numero?, error?, campos?, red?}. Si el panel RECHAZA los datos (ok:false) se muestra el motivo;
  // si no hay respuesta (sin red / timeout) se sigue por WhatsApp igual.
  Panel.enviarPedido = function (d) {
    var r = ref();
    if (!PANEL_URL) return Promise.resolve({ ref: r, ok: false, red: true });
    var payload = {
      pedidoId: r,
      origen: 'web',
      nombreCliente: d.nombre,
      telefono: d.telefono,
      modalidad: d.retira ? 'retiro' : 'envio',
      direccion: d.retira ? '' : d.direccion,
      metodoPago: d.pago || 'efectivo',
      observaciones: d.retira ? 'Retira en el local' : '',
      items: d.items.map(function (it) {
        return { productoId: it.p.productoId, presentacionId: it.p.presentacionId || '', nombre: it.p.name, cantidad: it.q };
      })
    };
    var url = PANEL_URL + '?action=crearPedido&payload=' + encodeURIComponent(JSON.stringify(payload));
    function parse(res) {
      if (res && res.ok) return { ok: true, ref: res.pedidoId || r, numero: res.numero };
      var campos = res && res.campos ? Object.keys(res.campos).map(function (k) { return res.campos[k]; }) : [];
      return { ok: false, ref: r, error: (campos.length ? campos.join(' ') : (res && (res.mensaje || res.error)) || 'No pudimos registrar el pedido.'), campos: res && res.campos };
    }
    // GET por JSONP: se puede leer la respuesta (número de pedido o errores). El mismo pedidoId evita duplicados al reintentar.
    return jsonp(url, 15000).then(parse).catch(function () {
      return jsonp(url, 15000).then(parse).catch(function () {
        // último recurso: POST (no se puede leer la respuesta)
        try {
          fetch(PANEL_URL + '?action=crearPedido', { method: 'POST', mode: 'no-cors', headers: { 'Content-Type': 'text/plain;charset=utf-8' }, body: JSON.stringify(payload), keepalive: true }).catch(function () {});
        } catch (e) {}
        return { ref: r, ok: false, red: true };
      });
    });
  };
})();
