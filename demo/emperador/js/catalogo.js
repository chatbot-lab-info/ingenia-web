/* ==========================================================
   EMPERADOR VINOTECA · catálogo
   Filtro por categoría (enlace directo: catalogo.html#vinos),
   tarjetas de producto y botón para sumar al pedido.
   ========================================================== */
(function () {
  'use strict';
  var Emp = window.Emp;
  if (!Emp) return;
  var $ = Emp.$, $$ = Emp.$$, esc = Emp.esc;

  var PRODUCTOS = window.PRODUCTOS || [];
  var CATS = window.CATEGORIAS || [];
  var TABS = [];
  function buildTabs() { TABS = [{ id: 'todos', label: 'Todos' }].concat(CATS); }
  buildTabs();
  var tabsEl = $('#tabs'), gridEl = $('#grid');
  var tab = 'todos', sub = '';

  // Fila de subcategorías (aparece debajo de las categorías)
  var subsEl = document.createElement('div');
  subsEl.className = 'subtabs';
  subsEl.id = 'subtabs';
  subsEl.setAttribute('aria-label', 'Subcategorías');
  tabsEl.parentNode.insertBefore(subsEl, gridEl);

  function validTab(id) { return TABS.some(function (t) { return t.id === id; }); }
  function catOf(id) { return CATS.filter(function (c) { return c.id === id; })[0]; }
  function validSub(c, s) { var ct = catOf(c); return !!(ct && ct.subs && ct.subs.some(function (x) { return x.id === s; })); }
  // Enlaces: catalogo.html#vinos  o  catalogo.html#vinos/tintos
  function fromHash() {
    var h = decodeURIComponent((location.hash || '').slice(1)).split('/');
    var t = validTab(h[0]) ? h[0] : 'todos';
    return { tab: t, sub: t !== 'todos' && validSub(t, h[1]) ? h[1] : '' };
  }

  function art(p) {
    if (p.img) return '<img src="' + esc(p.img) + '" alt="' + esc(p.name) + '" loading="lazy">';
    var tint = esc(p.tint), cap = esc(p.cap), body = '';
    if (p.shape === 'beer') {
      body = '<path d="M35 10h10v42c0 8 14 12 14 30v68a6 6 0 0 1-6 6H27a6 6 0 0 1-6-6V82c0-18 14-22 14-30z" fill="' + tint + '" stroke="rgba(240,221,176,0.28)" stroke-width="0.6"/>' +
        '<rect x="34" y="7" width="12" height="6" rx="2" fill="' + cap + '"/><rect x="24" y="92" width="32" height="44" rx="4" fill="#F7F0E4" opacity="0.9"/>' +
        '<circle cx="40" cy="108" r="6" fill="none" stroke="#B8914A" stroke-width="1.2"/><rect x="29" y="122" width="22" height="1.3" fill="#B8914A"/>' +
        '<path d="M25 84c-1 12-1 36 0 62" stroke="rgba(255,255,255,0.28)" stroke-width="1.5" fill="none" stroke-linecap="round"/>';
    } else if (p.shape === 'squat') {
      body = '<path d="M32 24h16v28c0 6 18 10 18 24v70a6 6 0 0 1-6 6H20a6 6 0 0 1-6-6V76c0-14 18-18 18-24z" fill="' + tint + '" stroke="rgba(240,221,176,0.28)" stroke-width="0.6"/>' +
        '<rect x="30" y="14" width="20" height="14" rx="3" fill="' + cap + '"/><rect x="20" y="92" width="40" height="44" rx="4" fill="#F7F0E4" opacity="0.92"/>' +
        '<rect x="26" y="106" width="28" height="1.4" fill="#B8914A"/><rect x="30" y="113" width="20" height="1.4" fill="#B8914A" opacity="0.7"/>' +
        '<path d="M19 80c-1 14-1 40 0 66" stroke="rgba(255,255,255,0.3)" stroke-width="1.5" fill="none" stroke-linecap="round"/>';
    } else if (p.shape === 'gift') {
      body = '<rect x="12" y="86" width="56" height="62" rx="8" fill="' + tint + '" stroke="rgba(240,221,176,0.3)" stroke-width="0.8"/>' +
        '<rect x="8" y="70" width="64" height="22" rx="7" fill="' + tint + '" stroke="rgba(240,221,176,0.4)" stroke-width="0.8"/>' +
        '<rect x="36" y="70" width="8" height="78" fill="' + cap + '"/>' +
        '<path d="M40 70c-14 2-22-4-19-12s16-4 19 12zM40 70c14 2 22-4 19-12s-16-4-19 12z" fill="' + cap + '" opacity="0.85"/>';
    } else {
      body = '<path d="M34 6h12v36c0 11 14 18 14 40v70a6 6 0 0 1-6 6H26a6 6 0 0 1-6-6V82c0-22 14-29 14-40z" fill="' + tint + '" stroke="rgba(240,221,176,0.28)" stroke-width="0.6"/>' +
        '<rect x="33" y="4" width="14" height="24" rx="2" fill="' + cap + '"/><rect x="26" y="98" width="28" height="36" rx="3" fill="#F7F0E4" opacity="0.92"/>' +
        '<rect x="30" y="112" width="20" height="1.3" fill="#B8914A"/><rect x="33" y="118" width="14" height="1.3" fill="#B8914A" opacity="0.7"/>' +
        '<path d="M25 86c-1 14-1 38 0 64" stroke="rgba(255,255,255,0.28)" stroke-width="1.5" fill="none" stroke-linecap="round"/>';
    }
    return '<svg viewBox="0 0 80 160" aria-hidden="true">' + body + '</svg>';
  }

  function card(p, i) {
    var q = Emp.cart.qty(p.id);
    var out = p.disponible === false;
    return '<article class="prod glass lift in' + (out ? ' agotado' : '') + '" data-id="' + esc(p.id) + '" style="animation-delay:' + (i * 0.05).toFixed(2) + 's">' +
      '<div class="prod-img" style="--glow:' + esc(p.glow) + '">' + art(p) +
      '<span class="tag">' + esc(p.tipo) + '</span>' + (out ? '<span class="sold">' + (p.proximamente ? 'Próximamente' : 'Sin stock') + '</span>' : '') +
      '<span class="qty"' + (q ? '' : ' hidden') + '>' + q + '</span></div>' +
      '<div class="prod-info"><h3>' + esc(p.name) + '</h3><p>' + esc(p.note) + '</p></div>' +
      '<div class="prod-foot"><span class="price">' + Emp.fmt(p.price) + '</span>' +
      '<button type="button" class="add press" data-add="' + esc(p.id) + '"' + (out ? ' disabled' : '') + ' aria-label="' + (out ? 'Sin stock: ' : 'Añadir ') + esc(p.name) + (out ? '' : ' al pedido') + '">' +
      '<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" aria-hidden="true"><path d="M12 5v14M5 12h14"/></svg></button></div>' +
      '</article>';
  }

  function renderTabs() {
    tabsEl.innerHTML = TABS.map(function (t) {
      return '<button type="button" role="tab" class="tab' + (t.id === tab ? ' on' : '') + '" aria-selected="' + (t.id === tab) + '" data-tab="' + t.id + '">' + esc(t.label) + '</button>';
    }).join('');
  }
  function count(cat, s) {
    return PRODUCTOS.filter(function (p) { return p.cat === cat && (!s || p.sub === s); }).length;
  }
  function renderSubs() {
    var ct = catOf(tab);
    if (!ct || !ct.subs || !ct.subs.length) { subsEl.innerHTML = ''; subsEl.hidden = true; return; }
    subsEl.hidden = false;
    var items = [{ id: '', label: 'Todo ' + ct.label }].concat(ct.subs);
    subsEl.innerHTML = items.map(function (s, i) {
      var n = count(ct.id, s.id);
      return '<button type="button" class="chip' + (s.id === sub ? ' on' : '') + '" data-sub="' + esc(s.id) + '" style="animation-delay:' + (i * 0.04).toFixed(2) + 's">' +
        esc(s.label) + (s.id && !n ? '' : '') + '</button>';
    }).join('');
  }
  function renderGrid() {
    var P = window.Panel || {};
    if (!PRODUCTOS.length) {
      var cfg0 = window.EMPERADOR_CONFIG || {};
      var l0 = Emp.waLink ? Emp.waLink((cfg0.saludo || 'Hola!') + ' Quiero consultar por sus productos.') : '';
      if (P.state === 'error') {
        gridEl.innerHTML = '<div class="empty-sub glass"><b>No pudimos cargar el catálogo</b><p>Revisá tu conexión e intentá de nuevo. Mientras tanto, escribinos y te asesoramos.</p>' +
          '<button type="button" class="btn-glass glass press" data-reload>Reintentar</button>' +
          (l0 ? '<a class="btn-glass glass press" target="_blank" rel="noopener" href="' + esc(l0) + '">Consultar por WhatsApp</a>' : '') + '</div>';
      } else if (P.state === 'loading') {
        gridEl.innerHTML = '<div class="empty-sub glass"><b>Preparando la carta…</b><p>Estamos trayendo los productos y precios actualizados.</p></div>';
      } else {
        gridEl.innerHTML = '<div class="empty-sub glass"><b>Estamos cargando productos</b><p>Muy pronto vas a ver acá toda la carta. Escribinos y te recomendamos lo mejor que tenemos.</p>' +
          (l0 ? '<a class="btn-glass glass press" target="_blank" rel="noopener" href="' + esc(l0) + '">Consultar por WhatsApp</a>' : '') + '</div>';
      }
      return;
    }
    var list = PRODUCTOS.filter(function (p) { return (tab === 'todos' || p.cat === tab) && (!sub || p.sub === sub); });
    if (!list.length && sub) {
      var ct = catOf(tab), s = ct.subs.filter(function (x) { return x.id === sub; })[0];
      var cfg = window.EMPERADOR_CONFIG || {};
      var link = Emp.waLink ? Emp.waLink((cfg.saludo || 'Hola!') + ' Quiero consultar por ' + s.label.toLowerCase() + '.') : '';
      gridEl.innerHTML = '<div class="empty-sub glass"><b>' + esc(s.label) + '</b><p>Estamos sumando productos a esta sección. Escribinos y te recomendamos lo mejor que tenemos.</p>' +
        (link ? '<a class="btn-glass glass press" target="_blank" rel="noopener" href="' + esc(link) + '">Consultar por WhatsApp</a>' : '') + '</div>';
      return;
    }
    gridEl.innerHTML = list.map(card).join('');
  }
  function setTab(id, s) {
    tab = validTab(id) ? id : 'todos';
    sub = tab !== 'todos' && validSub(tab, s) ? s : '';
    renderTabs();
    renderSubs();
    renderGrid();
  }
  function hashFor() { return '#' + tab + (sub ? '/' + sub : ''); }

  tabsEl.addEventListener('click', function (e) {
    var b = e.target.closest('[data-tab]');
    if (!b) return;
    gridEl.classList.remove('quiet'); subsEl.classList.remove('quiet');
    setTab(b.getAttribute('data-tab'));
    try { history.replaceState(null, '', hashFor()); } catch (err) {}
  });
  subsEl.addEventListener('click', function (e) {
    var b = e.target.closest('[data-sub]');
    if (!b) return;
    gridEl.classList.remove('quiet'); subsEl.classList.remove('quiet');
    setTab(tab, b.getAttribute('data-sub'));
    try { history.replaceState(null, '', hashFor()); } catch (err) {}
  });

  gridEl.addEventListener('click', function (e) {
    var rl = e.target.closest('[data-reload]');
    if (rl && window.Panel) { window.Panel.state = 'loading'; renderGrid(); window.Panel.reload(); return; }
    var b = e.target.closest('[data-add]');
    if (!b || b.disabled) return;
    var id = b.getAttribute('data-add');
    var p = PRODUCTOS.filter(function (x) { return x.id === id; })[0];
    if (!p || p.disponible === false) return;
    var antes = Emp.cart.qty(id);
    Emp.cart.add(id);
    if (Emp.cart.qty(id) > antes) Emp.toast('Sumaste ' + p.name + ' al pedido');
  });

  // Actualizar las burbujas de cantidad cuando cambia el pedido
  document.addEventListener('emp:cart', function () {
    $$('.prod', gridEl).forEach(function (el) {
      var q = Emp.cart.qty(el.getAttribute('data-id'));
      var badge = $('.qty', el);
      if (!badge) return;
      badge.textContent = q;
      badge.hidden = q === 0;
    });
  });

  // Desde el menú desplegable estando ya en el catálogo
  window.addEventListener('hashchange', function () {
    var h = fromHash();
    setTab(h.tab, h.sub);
    Emp.scrollTo(0);
  });

  // Llegó (o se actualizó) el catálogo del panel
  var first = true;
  document.addEventListener('emp:productos', function () {
    // Primer dibujo con animación; las actualizaciones posteriores (llegó el catálogo fresco) se hacen sin animar ni saltar
    if (gridEl.querySelector('.prod')) { gridEl.classList.add('quiet'); subsEl.classList.add('quiet'); }
    var y = window.scrollY;
    buildTabs();
    var h = fromHash();
    if (first && !(window.Panel && window.Panel.desdeCache)) { first = false; }
    var keepTab = validTab(tab) ? tab : h.tab;
    var keepSub = validSub(keepTab, sub) ? sub : (h.tab === keepTab ? h.sub : '');
    setTab(keepTab, keepSub);
    if (gridEl.classList.contains('quiet')) window.scrollTo(0, y);
  });

  var start = fromHash();
  setTab(start.tab, start.sub);
})();
