/* ==========================================================
   EMPERADOR VINOTECA · funciones compartidas
   Scroll suave (Lenis), revelado al scroll, menú móvil,
   carrito (se guarda en el navegador) y enlaces a WhatsApp.
   ========================================================== */
(function () {
  'use strict';

  var CFG = window.EMPERADOR_CONFIG || {};
  var PRODUCTOS = window.PRODUCTOS || [];
  var KEY = 'emperador_carrito_v1';
  var reduced = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  var Emp = (window.Emp = {});

  function $(s, r) { return (r || document).querySelector(s); }
  function $$(s, r) { return Array.prototype.slice.call((r || document).querySelectorAll(s)); }

  Emp.$ = $;
  Emp.$$ = $$;
  Emp.fmt = function (n) { return '$' + String(Math.round(n)).replace(/\B(?=(\d{3})+(?!\d))/g, '.'); };
  Emp.esc = function (s) {
    return String(s).replace(/[&<>"']/g, function (c) {
      return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c];
    });
  };

  /* ---------- Scroll suave (Lenis) ---------- */
  var lenis = null;
  function initLenis() {
    if (lenis || !window.Lenis || reduced) return;
    try {
      lenis = new window.Lenis({
        duration: 1.15,
        easing: function (t) { return Math.min(1, 1.001 - Math.pow(2, -10 * t)); },
        smoothWheel: true
      });
      Emp.lenis = lenis;
      var raf = function (t) { lenis.raf(t); requestAnimationFrame(raf); };
      requestAnimationFrame(raf);
    } catch (e) { lenis = null; }
  }
  // Lenis se carga aparte, sin frenar la página (si tarda o falla, se usa el scroll normal)
  if (window.Lenis) { initLenis(); }
  else if (!reduced) {
    var ls = document.createElement('script');
    ls.src = 'https://cdn.jsdelivr.net/npm/lenis@1.1.20/dist/lenis.min.js';
    ls.async = true;
    ls.onload = function () { initLenis(); if (typeof toTop === 'function') toTop(); };
    document.head.appendChild(ls);
  }
  Emp.lenis = lenis;
  Emp.scrollTo = function (target) {
    if (target == null) return;
    if (lenis) { lenis.scrollTo(target, { offset: 0, duration: 1.4 }); }
    else if (typeof target === 'number') { window.scrollTo({ top: target, behavior: reduced ? 'auto' : 'smooth' }); }
    else if (target.scrollIntoView) { target.scrollIntoView({ behavior: reduced ? 'auto' : 'smooth', block: 'start' }); }
  };
  function lockScroll(on) {
    if (lenis) { on ? lenis.stop() : lenis.start(); }
    else { document.documentElement.style.overflow = on ? 'hidden' : ''; }
  }

  // Enlaces internos (#seccion) con scroll suave
  document.addEventListener('click', function (e) {
    var a = e.target.closest && e.target.closest('a[href^="#"]');
    if (!a) return;
    var href = a.getAttribute('href');
    if (href.length < 2) return;
    var el = document.getElementById(href.slice(1));
    if (!el) return;
    e.preventDefault();
    closeMenu();
    Emp.scrollTo(el);
  });

  /* ---------- Revelado al scroll ---------- */
  var rvs = $$('.rv');
  if ('IntersectionObserver' in window) {
    var io = new IntersectionObserver(function (entries) {
      entries.forEach(function (en) {
        if (en.isIntersecting) { en.target.classList.add('is-in'); io.unobserve(en.target); }
      });
    }, { threshold: 0.12, rootMargin: '0px 0px -6% 0px' });
    rvs.forEach(function (el) { io.observe(el); });
  } else {
    rvs.forEach(function (el) { el.classList.add('is-in'); });
  }

  /* ---------- Menús con subcategorías (desktop y móvil) ---------- */
  (function () {
    var CATS = window.CATEGORIAS || [];
    if (!CATS.length) return;
    var base = (location.pathname.split('/').pop() || '').indexOf('catalogo') === 0 ? '' : 'catalogo.html';
    base = 'catalogo.html';
    function chev(cls) { return '<svg class="' + cls + '" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M9 6l6 6-6 6"/></svg>'; }
    // Desktop: panel ancho con una columna por categoría
    var ddIn = $('.ddm-in');
    if (ddIn) {
      ddIn.classList.add('ddm-mega');
      ddIn.innerHTML = CATS.map(function (c) {
        return '<div class="ddm-col"><a class="ddm-h" href="' + base + '#' + c.id + '">' + Emp.esc(c.label) + '</a>' +
          (c.subs || []).map(function (s) { return '<a class="ddm-s" href="' + base + '#' + c.id + '/' + s.id + '">' + Emp.esc(s.label) + '</a>'; }).join('') + '</div>';
      }).join('');
    }
    // Móvil: "Productos" se despliega con categorías y subcategorías
    var mm = $('#mobile-menu');
    var item = mm && mm.querySelector('.mm-item[href$="catalogo.html"]');
    if (item) {
      var grp = document.createElement('div');
      grp.className = 'mm-group';
      var btn = document.createElement('button');
      btn.type = 'button';
      btn.className = 'mm-item mm-toggle';
      btn.setAttribute('aria-expanded', 'false');
      btn.setAttribute('style', item.getAttribute('style') || '');
      btn.innerHTML = item.innerHTML;
      var panel = document.createElement('div');
      panel.className = 'mm-sub';
      panel.innerHTML = '<div class="mm-sub-in">' + '<a class="mm-all" href="' + base + '">Ver todo el catálogo</a>' + CATS.map(function (c) {
        return '<div class="mm-cat"><a class="mm-cat-h" href="' + base + '#' + c.id + '">' + Emp.esc(c.label) + '</a><div class="mm-chips">' +
          (c.subs || []).map(function (s) { return '<a class="mm-chip" href="' + base + '#' + c.id + '/' + s.id + '">' + Emp.esc(s.label) + '</a>'; }).join('') + '</div></div>';
      }).join('') + '</div>';
      grp.appendChild(btn); grp.appendChild(panel);
      item.parentNode.replaceChild(grp, item);
      btn.addEventListener('click', function () {
        var open = grp.classList.toggle('open');
        btn.setAttribute('aria-expanded', open ? 'true' : 'false');
      });
    }
  })();

  /* ---------- Menú móvil ---------- */
  var burger = $('#burger');
  var menu = $('#mobile-menu');
  function closeMenu() {
    if (!menu || menu.hidden) return;
    menu.hidden = true;
    if (burger) {
      burger.setAttribute('aria-expanded', 'false');
      var p0 = burger.querySelector('path');
      if (p0) p0.setAttribute('d', 'M4 8h16M4 16h16');
    }
  }
  if (burger && menu) {
    burger.addEventListener('click', function () {
      var open = menu.hidden;
      menu.hidden = !open;
      burger.setAttribute('aria-expanded', open ? 'true' : 'false');
      var pth = burger.querySelector('path');
      if (pth) pth.setAttribute('d', open ? 'M6 6l12 12M18 6L6 18' : 'M4 8h16M4 16h16');
    });
    menu.addEventListener('click', function (e) {
      if (e.target.closest && e.target.closest('a')) {
        menu.hidden = true;
        burger.setAttribute('aria-expanded', 'false');
        var p2 = burger.querySelector('path');
        if (p2) p2.setAttribute('d', 'M4 8h16M4 16h16');
      }
    });
  }

  /* ---------- Aviso breve ---------- */
  var toastEl = $('#toast');
  var toastTimer;
  Emp.toast = function (msg) {
    if (!toastEl) return;
    toastEl.textContent = msg;
    toastEl.classList.add('on');
    clearTimeout(toastTimer);
    toastTimer = setTimeout(function () { toastEl.classList.remove('on'); }, 2300);
  };

  /* ---------- WhatsApp y datos del negocio ---------- */
  var wa = String(CFG.whatsapp || '').replace(/\D/g, '');
  Emp.waOk = wa.length >= 8;
  Emp.waLink = function (texto) {
    if (!Emp.waOk) return '';
    return 'https://wa.me/' + wa + '?text=' + encodeURIComponent(texto || '');
  };
  var saludo = CFG.saludo || 'Hola!';

  $$('[data-wa]').forEach(function (a) {
    var link = Emp.waLink(saludo + ' ' + a.getAttribute('data-wa'));
    if (link) {
      a.setAttribute('href', link);
      a.setAttribute('target', '_blank');
      a.setAttribute('rel', 'noopener');
    }
  });
  $$('[data-cfg]').forEach(function (el) {
    var v = CFG[el.getAttribute('data-cfg')];
    if (v) el.textContent = v;
  });
  $$('[data-cfg-link="whatsapp"]').forEach(function (a) {
    if (!Emp.waOk) return;
    a.textContent = CFG.whatsappTexto || '+' + wa;
    a.setAttribute('href', Emp.waLink(saludo));
    a.setAttribute('target', '_blank');
    a.setAttribute('rel', 'noopener');
  });
  $$('[data-cfg-link="instagram"]').forEach(function (a) {
    var u = String(CFG.instagram || '').replace(/^@/, '').trim();
    if (!u) {
      var w = a.parentNode; if (w && w.classList.contains('ig-wrap')) w.style.display = 'none';
      var l = document.querySelector('[data-ig-label]'); if (l) l.textContent = 'WhatsApp';
      return;
    }
    a.textContent = '@' + u;
    a.setAttribute('href', 'https://instagram.com/' + encodeURIComponent(u));
    a.setAttribute('target', '_blank');
    a.setAttribute('rel', 'noopener');
  });

  /* ---------- Imágenes opcionales (slider y pie) ---------- */
  var mobileQ = window.matchMedia && window.matchMedia('(max-width: 760px)');
  // Prueba las rutas en orden; llama a done(img) con la primera que carga, o done(null) si ninguna.
  Emp.loadFirst = function (urls, done) {
    var list = urls.filter(Boolean);
    (function next() {
      if (!list.length) { done(null); return; }
      var src = list.shift(), im = new Image();
      im.onload = function () { done(im); };
      im.onerror = next;
      im.decoding = 'async';
      im.src = src;
    })();
  };
  Emp.pickImages = function (o) {
    return mobileQ && mobileQ.matches ? [o.imgMobile, o.img] : [o.img];
  };

  var fb = $('#foot-bg');
  var FI = window.FOOTER_IMAGE;
  if (fb && FI && FI.img) {
    if (FI.pos) fb.style.setProperty('--pos', FI.pos);
    Emp.loadFirst(Emp.pickImages(FI), function (im) {
      if (!im) return;
      im.alt = '';
      fb.appendChild(im);
      fb.classList.add('has-img');
    });
  }

  /* ---------- Carrito ---------- */
  var byId = {};
  var catalogReady = false; // hasta que llega el catálogo no se descarta nada del carrito guardado
  function maxQty(id) {
    var p = byId[id];
    return p && p.stock != null ? Math.max(0, Math.min(99, p.stock)) : 99;
  }
  function loadCart() {
    var out = {};
    try {
      var raw = JSON.parse(localStorage.getItem(KEY) || '{}');
      Object.keys(raw).forEach(function (id) {
        var q = parseInt(raw[id], 10);
        if (!(q > 0)) return;
        if (!catalogReady) { out[id] = Math.min(q, 99); return; }
        if (byId[id] && byId[id].disponible !== false) out[id] = Math.min(q, maxQty(id) || 1);
      });
    } catch (e) {}
    return out;
  }
  var cart = {};
  function saveCart() { try { localStorage.setItem(KEY, JSON.stringify(cart)); } catch (e) {} }

  Emp.cart = {
    qty: function (id) { return cart[id] || 0; },
    count: function () { return Object.keys(cart).reduce(function (a, id) { return a + cart[id]; }, 0); },
    total: function () { return Object.keys(cart).reduce(function (a, id) { return a + (byId[id] ? cart[id] * byId[id].price : 0); }, 0); },
    items: function () {
      return Object.keys(cart).filter(function (id) { return byId[id]; }).map(function (id) { return { p: byId[id], q: cart[id] }; });
    },
    clear: function () { cart = {}; changed(); },
    add: function (id) {
      var p = byId[id];
      if (!p || p.disponible === false) return;
      var max = maxQty(id);
      if ((cart[id] || 0) >= max) { Emp.toast && Emp.toast('No hay más stock de ' + p.name); return; }
      cart[id] = (cart[id] || 0) + 1; changed();
    },
    sub: function (id) {
      if (!cart[id]) return;
      if (cart[id] <= 1) delete cart[id]; else cart[id] -= 1;
      changed();
    }
  };

  // El catálogo llega del panel (js/panel.js) y reemplaza el contenido de PRODUCTOS
  Emp.setProducts = function (list) {
    PRODUCTOS.length = 0;
    byId = {};
    list.forEach(function (p) { PRODUCTOS.push(p); byId[p.id] = p; });
    catalogReady = true;
    cart = loadCart();
    changed();
    document.dispatchEvent(new CustomEvent('emp:productos'));
  };
  cart = loadCart();

  var badge = $('#cart-badge');
  var drawer = $('#drawer');
  var veil = $('#veil');
  var elLines = $('#cart-lines');
  var elFull = $('#cart-full');
  var elEmpty = $('#cart-empty');
  var elTotal = $('#cart-total');
  var elSend = $('#cart-send');
  var elWarn = $('#cart-warn');
  var elDone = $('#cart-done');
  var doneOn = false;

  function pedidoTexto(order) {
    var rows = Emp.cart.items().map(function (it) {
      return '• ' + it.q + ' x ' + it.p.name + (it.p.note ? ' (' + it.p.note + ')' : '') + ' — ' + Emp.fmt(it.q * it.p.price);
    });
    var extra = '';
    if (order && order.ref) extra += '\n\nPedido ' + (order.numero ? '#' + String(order.numero).padStart(3, '0') + ' · ' : '') + order.ref;
    if (order && order.nombre) extra += '\nNombre: ' + order.nombre + (order.telefono ? '\nTeléfono: ' + order.telefono : '') + '\n' + (order.retira ? 'Retira en el local' : 'Envío a domicilio' + (order.direccion ? ': ' + order.direccion : '')) + (order.pago ? '\nPago: ' + order.pago : '');
    return saludo + ' Quiero hacer este pedido:\n\n' + rows.join('\n') + '\n\nTotal: ' + Emp.fmt(Emp.cart.total()) + extra;
  }
  Emp.pedidoTexto = pedidoTexto;

  function render() {
    var n = Emp.cart.count();
    if (badge) { badge.textContent = n; badge.hidden = n === 0; }
    if (!drawer) return;
    if (elFull) elFull.hidden = n === 0;
    if (elEmpty) elEmpty.hidden = n !== 0 || doneOn;
    if (elDone) elDone.hidden = !doneOn;
    if (elLines) {
      elLines.innerHTML = Emp.cart.items().map(function (it) {
        var p = it.p, id = p.id;
        return '<div class="line"><div class="line-t"><b>' + Emp.esc(p.name) + '</b><small>' + (p.note ? Emp.esc(p.note) + ' · ' : '') + Emp.fmt(p.price) + '</small></div>' +
          '<div class="line-q"><button type="button" data-act="sub" data-id="' + Emp.esc(id) + '" aria-label="Quitar uno">−</button>' +
          '<span>' + it.q + '</span>' +
          '<button type="button" data-act="add" data-id="' + Emp.esc(id) + '" aria-label="Sumar uno">+</button></div></div>';
      }).join('');
    }
    if (elTotal) elTotal.textContent = Emp.fmt(Emp.cart.total());
    if (elSend && !sending) elSend.setAttribute('href', '#');
    if (elWarn) elWarn.hidden = Emp.waOk;
  }

  function changed() {
    saveCart();
    render();
    document.dispatchEvent(new CustomEvent('emp:cart'));
  }

  if (elLines) {
    elLines.addEventListener('click', function (e) {
      var b = e.target.closest('button[data-act]');
      if (!b) return;
      Emp.cart[b.getAttribute('data-act')](b.getAttribute('data-id'));
    });
  }
  var sending = false;
  var elForm = $('#cart-form'), elStatus = $('#cart-status');
  function status(msg, bad) {
    if (!elStatus) return;
    elStatus.textContent = msg || '';
    elStatus.hidden = !msg;
    elStatus.classList.toggle('bad', !!bad);
  }
  function fval(name) { var el = elForm && elForm.elements[name]; return el ? String(el.value || '').trim() : ''; }
  function pago() {
    var r = elForm && elForm.querySelector('input[name=pago]:checked');
    return r ? r.value : 'efectivo';
  }
  function retira() {
    var r = elForm && elForm.elements.modalidad;
    var list = r && r.length ? Array.prototype.slice.call(r) : r ? [r] : [];
    var on = list.filter(function (x) { return x.checked; })[0];
    return !on || on.value === 'retiro';
  }
  // Los datos del cliente NO se guardan: cada pedido arranca con el formulario vacío (y se borra lo que haya quedado de versiones anteriores)
  try { localStorage.removeItem('emperador_cliente_v1'); } catch (e) {}
  if (elForm) {
    var rads = elForm.querySelectorAll('input[name=modalidad]');
    var toggleDir = function () { var d = $('#cart-dir'); if (d) d.hidden = retira(); };
    Array.prototype.forEach.call(rads, function (r) { r.addEventListener('change', toggleDir); });
    toggleDir();
  }

  function showDone(order, ok, win) {
    var num = order.numero ? '#' + String(order.numero).padStart(3, '0') : '';
    $('#done-title').textContent = ok ? '¡Pedido recibido!' + (num ? ' ' + num : '') : 'No pudimos registrar el pedido';
    $('#done-text').textContent = ok
      ? 'Ya lo registramos en el local. Se abre WhatsApp con tu pedido: solo tenés que enviarlo para coordinar ' + (order.retira ? 'el retiro' : 'la entrega') + '. Referencia ' + order.ref + '.'
      : 'Parece que no hay conexión con el local. Se abre WhatsApp con tu pedido: enviáselo al local para que lo tomemos igual.';
    var wa = $('#done-wa');
    wa.setAttribute('href', Emp.waLink(pedidoTexto(order)));
    wa.textContent = 'Abrir WhatsApp';
    // se abre solo con el mensaje armado; el cliente solo tiene que enviarlo
    var url = Emp.waLink(pedidoTexto(order));
    if (win && !win.closed) { try { win.location.href = url; } catch (e) { win = null; } }
    else win = null;
    if (!win) { try { if (!window.open(url, '_blank')) { /* bloqueado: queda el botón */ } } catch (e) {} }
    doneOn = true;
    if (ok) { Emp.cart.clear(); if (elForm) { elForm.reset(); var d = $('#cart-dir'); if (d) d.hidden = true; } } else render();
    status('');
    sending = false;
    if (elSend) elSend.classList.remove('busy'); elSend.textContent = 'Confirmar pedido';
  }
  var dc = $('#done-close');
  if (dc) dc.addEventListener('click', function () { doneOn = false; render(); Emp.closeCart(); });

  if (elSend) {
    elSend.addEventListener('click', function (e) {
      e.preventDefault();
      if (sending) return;
      if (!Emp.cart.count()) return;
      if (!Emp.waOk) { Emp.toast('Falta cargar el WhatsApp del local en js/config.js'); return; }
      var nombre = fval('nombre'), tel = fval('telefono'), dir = fval('direccion'), ret = retira();
      if (nombre.length < 2) { status('Escribí tu nombre para el pedido.', true); elForm.elements.nombre.focus(); return; }
      if (tel.replace(/\D/g, '').length < 8) { status('Escribí un teléfono para coordinar la entrega.', true); elForm.elements.telefono.focus(); return; }
      if (!ret && dir.length < 4) { status('Escribí la dirección de entrega.', true); elForm.elements.direccion.focus(); return; }
      sending = true;
      elSend.classList.add("busy"); elSend.textContent = "Enviando…";
      status('Registrando tu pedido…');
      // la pestaña de WhatsApp se abre ya, dentro del toque, para que el navegador no la bloquee
      var win = null;
      try { win = window.open('', '_blank'); } catch (err) {}
      var order = { nombre: nombre, telefono: tel, direccion: dir, retira: ret };
      var Panel = window.Panel;
      if (!Panel || !Panel.enviarPedido) { showDone(order, false, win); return; }
      Panel.enviarPedido({
        items: Emp.cart.items(), nombre: nombre, telefono: tel, direccion: dir, retira: ret, pago: pago()
      }).then(function (r) {
        if (!r.ok && !r.red) {
          // el panel rechazó los datos: se muestra el motivo y no se pierde el carrito
          try { if (win) win.close(); } catch (e) {}
          sending = false;
          elSend.classList.remove('busy'); elSend.textContent = 'Confirmar pedido';
          status(r.error, true);
          return;
        }
        order.ref = r.ref; order.numero = r.numero; order.pago = pago();
        showDone(order, !!r.ok, win);
      });
    });
  }

  var lastFocus = null;
  Emp.openCart = function () {
    if (!drawer) return;
    lastFocus = document.activeElement;
    drawer.hidden = false;
    veil.hidden = false;
    lockScroll(true);
    var c = $('[data-close-cart]', drawer);
    if (c) c.focus();
  };
  Emp.closeCart = function () {
    if (!drawer || drawer.hidden) return;
    if (doneOn && Emp.cart.count() === 0) { doneOn = false; render(); }
    drawer.hidden = true;
    veil.hidden = true;
    lockScroll(false);
    if (lastFocus && lastFocus.focus) lastFocus.focus();
  };
  $$('[data-open-cart]').forEach(function (b) { b.addEventListener('click', Emp.openCart); });
  $$('[data-close-cart]').forEach(function (b) { b.addEventListener('click', Emp.closeCart); });
  if (veil) veil.addEventListener('click', Emp.closeCart);
  document.addEventListener('keydown', function (e) {
    if (e.key === 'Escape') { Emp.closeCart(); closeMenu(); }
  });

  // Mantener el carrito sincronizado entre pestañas
  window.addEventListener('storage', function (e) {
    if (e.key === KEY) {
      cart = loadCart();
      render();
      document.dispatchEvent(new CustomEvent('emp:cart'));
    }
  });

  render();

  // Al cargar o recargar sin enlace a una sección, siempre arriba de todo.
  // Algunos navegadores (sobre todo en iPhone) restauran el scroll tarde,
  // así que se reintenta unos instantes, hasta que la persona toque la pantalla.
  var moved = false;
  var nav = (performance.getEntriesByType && performance.getEntriesByType('navigation')[0]) || {};
  if (nav.type === 'reload' && location.hash) {
    try { history.replaceState(null, '', location.pathname + location.search); } catch (e) {}
  }
  function toTop() {
    // en el catálogo el enlace (#vinos/rosados) elige categoría, no una zona de la página: siempre arriba
    if ((location.hash && !$('#tabs')) || moved) return;
    if (lenis) { lenis.scrollTo(0, { immediate: true, force: true }); }
    else { document.documentElement.scrollTop = 0; document.body.scrollTop = 0; }
  }
  ['wheel', 'touchstart'].forEach(function (ev) {
    window.addEventListener(ev, function () { moved = true; }, { passive: true, once: true });
  });
  // Al salir de la página se deja el scroll en 0: así el navegador no tiene qué restaurar
  function resetBeforeLeave() {
    if (lenis) { lenis.scrollTo(0, { immediate: true, force: true }); }
    else { document.documentElement.scrollTop = 0; document.body.scrollTop = 0; }
  }
  window.addEventListener('pagehide', resetBeforeLeave);
  window.addEventListener('beforeunload', resetBeforeLeave);
  toTop();
  window.addEventListener('load', toTop);
  window.addEventListener('pageshow', function (e) { if (e.persisted) moved = false; toTop(); });
  [60, 250, 600, 1200].forEach(function (t) { setTimeout(toTop, t); });
})();
