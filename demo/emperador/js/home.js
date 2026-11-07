/* ==========================================================
   EMPERADOR VINOTECA · inicio
   Hero con copa que cambia, parallax con el mouse,
   tarjetas de categorías y armador de regalos.
   ========================================================== */
(function () {
  'use strict';
  var Emp = window.Emp;
  if (!Emp) return;
  var $ = Emp.$, $$ = Emp.$$;
  var reduced = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  /* ---------- Hero: slider de imágenes, copa y textos ---------- */
  var hero = $('#inicio');
  var SLIDES = window.HERO_SLIDES || [
    { name: 'TINTOS', text: 'Vinos seleccionados para disfrutar sin demasiadas vueltas.' },
    { name: 'ROSÉS', text: 'Frescura para cada ocasión, del aperitivo a la sobremesa.' },
    { name: 'BLANCOS', text: 'Blancos frescos y aromáticos, para el mediodía o la cena.' },
    { name: 'ESPUMANTES', text: 'Burbujas para festejar lo que importa, sin esperar una fecha.' }
  ];
  var idx = 0, timer;
  var elText = $('#slide-text'), elName = $('#slide-name'), elNum = $('#slide-num'), bubbles = $('#bubbles'), copas = $$('.copa');
  var dots = $$('.hero-ctrl .dot');
  var track = $('#hero-slides');
  var hasImg = [];
  var fgTrack = $('#hero-fg');
  var fgLayers = [];
  /* Burbujas dentro de la copa, pegadas a la foto (misma escala y encuadre) */
  var fxList = [];
  function buildFx(layer, im, b) {
    var wrap = document.createElement('div');
    wrap.className = 'hs-fx';
    var box = document.createElement('div');
    box.className = 'fx-flute';
    box.style.cssText = 'left:' + b.x + '%;top:' + b.y + '%;width:' + b.w + '%;height:' + b.h + '%';
    for (var n = 0; n < 70; n++) {
      var sp = document.createElement('i');
      var size = 0.05 + Math.random() * 0.12;
      sp.style.cssText = 'left:' + (4 + Math.random() * 92) + '%;--sz:' + size.toFixed(2) +
        ';--d:' + (1.8 + Math.random() * 2.2).toFixed(2) + 's;--dl:-' + (Math.random() * 4).toFixed(2) +
        's;--dx:' + ((Math.random() - 0.5) * 16).toFixed(1) + 'px';
      box.appendChild(sp);
    }
    wrap.appendChild(box);
    layer.appendChild(wrap);
    function place() {
      var cw = layer.clientWidth, ch = layer.clientHeight;
      var iw = im.naturalWidth || 2400, ih = im.naturalHeight || 1340;
      var sc = Math.max(cw / iw, ch / ih), w = iw * sc, hh = ih * sc;
      wrap.style.width = w + 'px'; wrap.style.height = hh + 'px';
      wrap.style.left = (cw - w) / 2 + 'px'; wrap.style.top = (ch - hh) / 2 + 'px';
      wrap.style.setProperty('--u', (w / 100) + 'px');
    }
    place();
    window.addEventListener('resize', place);
  }

  /* El hero se muestra recién cuando la foto del primer slide está lista
     (o falló): así no aparece un instante el dibujo de la copa antes de la foto. */
  var heroEl = $('#inicio');
  var readyDone = false;
  function heroReady() {
    if (readyDone) return;
    readyDone = true;
    if (heroEl) heroEl.classList.add('ready');
    document.documentElement.classList.remove('hero-wait');
  }
  setTimeout(heroReady, 7000);
  var settled = [];

  var layers = SLIDES.map(function (s, i) {
    var d = document.createElement('div');
    d.className = 'hs';
    if (s.tint) d.style.setProperty('--hs-tint', s.tint);
    if (s.pos) d.style.setProperty('--pos', s.pos);
    d.innerHTML = '<div class="hs-bg"></div>';
    track.appendChild(d);
    hasImg[i] = false;
    // Capa delantera opcional (botella/copa recortadas) que va POR ENCIMA de EMPERADOR
    var f = document.createElement('div');
    f.className = 'hf';
    if (s.pos) f.style.setProperty('--pos', s.pos);
    fgTrack.appendChild(f);
    fgLayers[i] = f;
    // Si la foto existe se muestra; si no, queda el fondo de color con la copa
    Emp.loadFirst(Emp.pickImages(s), function (im) {
      settled[i] = true;
      if (!im) { if (i === idx) paint(); if (i === 0) heroReady(); return; }
      im.alt = '';
      d.appendChild(im);
      d.classList.add('has-img');
      hasImg[i] = true;
      if (s.bubbles) buildFx(d, im, s.bubbles);
      var usedMobile = s.imgMobile && im.getAttribute('src') === s.imgMobile;
      var fgUrl = usedMobile ? s.fgMobile : s.fg;
      if (fgUrl) {
        var fi = new Image();
        fi.alt = '';
        fi.onload = function () { f.appendChild(fi); f.classList.add('has-img'); if (i === 0) heroReady(); };
        fi.onerror = function () { if (i === 0) heroReady(); };
        fi.src = fgUrl;
      } else if (i === 0) { heroReady(); }
      if (i === idx) paint();
    });
    return d;
  });

  function paint() {
    var s = SLIDES[idx];
    layers.forEach(function (l, k) { l.classList.toggle('on', k === idx); });
    fgLayers.forEach(function (l, k) { l.classList.toggle('on', k === idx); });
    var showCopa = !hasImg[idx] && !!settled[idx];
    var copaIdx = [0, 1, -1, 2][idx];
    copas.forEach(function (c, k) { c.classList.toggle('on', k === copaIdx && showCopa); });
    bubbles.classList.toggle('on', idx === 3 && showCopa);
  }

  function show(i) {
    idx = (i + SLIDES.length) % SLIDES.length;
    var s = SLIDES[idx];
    paint();
    elText.textContent = s.text;
    elName.textContent = s.name;
    elNum.textContent = '/ 0' + (idx + 1);
    dots.forEach(function (d, k) { d.classList.toggle('on', k === idx); });
    [elText, elNum].forEach(function (el) {
      el.classList.remove('swap'); void el.offsetWidth; el.classList.add('swap');
    });
  }
  function auto() {
    clearInterval(timer);
    if (!reduced) timer = setInterval(function () { show(idx + 1); }, 6500);
  }
  dots.forEach(function (d, k) { d.addEventListener('click', function () { show(k); auto(); }); });
  $('#slide-prev').addEventListener('click', function () { show(idx - 1); auto(); });
  $('#slide-next').addEventListener('click', function () { show(idx + 1); auto(); });
  show(0);
  auto();

  /* Parallax suave con el mouse */
  if (!reduced && window.matchMedia('(hover: hover)').matches) {
    var pending = false, ev;
    hero.addEventListener('mousemove', function (e) {
      ev = e;
      if (pending) return;
      pending = true;
      requestAnimationFrame(function () {
        pending = false;
        var r = hero.getBoundingClientRect();
        var x = ev.clientX - r.left, y = ev.clientY - r.top;
        hero.style.setProperty('--mx', Math.round(x) + 'px');
        hero.style.setProperty('--my', Math.round(y) + 'px');
        hero.style.setProperty('--nx', (x / r.width - 0.5).toFixed(3));
        hero.style.setProperty('--ny', (y / r.height - 0.5).toFixed(3));
      });
    });
  }

  /* ---------- Categorías (acordeón) ---------- */
  var cats = $$('#cats .cat');
  function activate(c) {
    cats.forEach(function (x) { x.classList.toggle('is-active', x === c); });
  }
  cats.forEach(function (c) {
    c.addEventListener('mouseenter', function () {
      if (window.matchMedia('(hover: hover)').matches) activate(c);
    });
    c.addEventListener('click', function (e) {
      if (e.target.closest('a')) return;
      activate(c);
    });
    c.addEventListener('focusin', function () { activate(c); });
  });

  /* ---------- Regalos ---------- */
  var OCCS = [
    { id: 'cumple', label: 'Cumpleaños', title: 'Box Brindis', text: 'Un espumante rosé y bombones para abrir la celebración con estilo.' },
    { id: 'aniv', label: 'Aniversario', title: 'Estuche Emperador', text: 'Dos botellas elegidas con copas incluidas, en caja de regalo, para una noche especial.' },
    { id: 'corp', label: 'Corporativo', title: 'Selección a medida', text: 'Armamos cajas personalizadas para tu equipo o tus clientes, con tarjeta y entrega coordinada.' },
    { id: 'brindis', label: 'Solo porque sí', title: 'Una botella con historia', text: 'Un vino de autor recomendado por nuestro equipo, envuelto para regalar.' }
  ];
  var BUDS = [
    { id: 0, label: 'Hasta $30.000', text: 'Presupuesto cuidado: opciones con excelente relación precio calidad.' },
    { id: 1, label: '$30.000 a $60.000', text: 'El rango más elegido: estuches y combos de gran presencia.' },
    { id: 2, label: 'Más de $60.000', text: 'Piezas premium y ediciones limitadas para una ocasión inolvidable.' }
  ];
  var occ = OCCS[0], bud = BUDS[1];
  var elOccs = $('#occs'), elBuds = $('#buds');

  function pills(el, list, getOn, pick) {
    el.innerHTML = '';
    list.forEach(function (o) {
      var b = document.createElement('button');
      b.type = 'button';
      b.className = 'pill press' + (getOn(o) ? ' on' : '');
      b.textContent = o.label;
      b.setAttribute('aria-pressed', getOn(o) ? 'true' : 'false');
      b.addEventListener('click', function () { pick(o); });
      el.appendChild(b);
    });
  }
  function renderGift() {
    pills(elOccs, OCCS, function (o) { return o === occ; }, function (o) { occ = o; renderGift(); });
    pills(elBuds, BUDS, function (o) { return o === bud; }, function (o) { bud = o; renderGift(); });
    $('#gift-title').textContent = occ.title;
    $('#gift-text').textContent = occ.text;
    $('#gift-budget').textContent = bud.text;
    var cta = $('#gift-cta');
    var msg = (window.EMPERADOR_CONFIG && window.EMPERADOR_CONFIG.saludo || 'Hola!') +
      ' Quiero armar un regalo. Ocasión: ' + occ.label + '. Presupuesto: ' + bud.label + '. Me interesa: ' + occ.title + '.';
    var link = Emp.waLink(msg);
    if (link) {
      cta.setAttribute('href', link);
      cta.setAttribute('target', '_blank');
      cta.setAttribute('rel', 'noopener');
    }
  }
  renderGift();

  /* Subcategorías dentro de cada tarjeta de categoría */
  (function () {
    var CATS = window.CATEGORIAS || [];
    $$('.cat').forEach(function (card) {
      var a = card.querySelector('.cat-body .btn-glass');
      if (!a) return;
      var id = (a.getAttribute('href') || '').split('#')[1];
      var c = CATS.filter(function (x) { return x.id === id; })[0];
      if (!c || !c.subs) return;
      var box = document.createElement('div');
      box.className = 'cat-subs';
      box.innerHTML = c.subs.map(function (s) {
        return '<a class="glass press" href="catalogo.html#' + c.id + '/' + s.id + '">' + Emp.esc(s.label) + '</a>';
      }).join('');
      var tag = card.querySelector('.cat-tag');
      if (tag) tag.style.display = 'none';
      a.parentNode.insertBefore(box, a);
    });
  })();

  /* Fotos de las tarjetas de categoría */
  (function () {
    var CI = window.CAT_IMAGES || {};
    $$('.cat').forEach(function (card) {
      var a = card.querySelector('.cat-body .btn-glass');
      var id = a && (a.getAttribute('href') || '').split('#')[1];
      var list = id && CI[id];
      if (!list || !list.length) return;
      var box = document.createElement('div');
      box.className = 'cat-photo';
      box.setAttribute('aria-hidden', 'true');
      var imgs = list.map(function (it, n) {
        var im = new Image();
        im.alt = '';
        im.decoding = 'async';
        if (n === 0) im.className = 'on';
        im.onload = function () { if (n === 0) card.classList.add('has-photo'); };
        if (it.pos) im.style.objectPosition = it.pos; if (it.z) im.style.setProperty('--z', it.z); im.src = it.img;
        box.appendChild(im);
        if (it.n) {
          im.classList.add('hasnar');
          var nb = new Image(); nb.alt = ''; nb.decoding = 'async'; nb.className = 'nar' + (n === 0 ? ' on' : ''); if (it.pos) nb.style.objectPosition = it.pos; nb.src = it.n;
          box.appendChild(nb); im._nar = nb;
        }
        return im;
      });
      card.insertBefore(box, card.firstChild);
      if (list[0].zoom) card.classList.add('photo-zoom');
      function show(n) { imgs.forEach(function (im, k) { im.classList.toggle('on', k === n); if (im._nar) im._nar.classList.toggle('on', k === n); }); }
      // Al pasar por una subcategoría, la foto cambia a ese tipo de vino
      $$('.cat-subs a', card).forEach(function (chip) {
        var sub = (chip.getAttribute('href') || '').split('/')[1];
        var n = -1;
        list.forEach(function (it, k) { if (it.sub === sub) n = k; });
        if (n < 0) return;
        chip.addEventListener('mouseenter', function () { show(n); });
        chip.addEventListener('focus', function () { show(n); });
        chip.addEventListener('mouseleave', function () { show(0); });
        chip.addEventListener('blur', function () { show(0); });
      });
    });
  })();
})();

/* ==========================================================
   Experiencias en el celular: al bajar, las tarjetas se desplazan
   de lado (la sección queda fija) hasta la última y recién ahí
   sigue el scroll normal. En escritorio no hace nada.
   ========================================================== */
(function () {
  'use strict';
  var pin = document.getElementById('exps-pin');
  if (!pin) return;
  var stick = pin.querySelector('.exps-stick');
  var track = pin.querySelector('.exps');
  var cards = track ? track.querySelectorAll('.exp') : [];
  if (!stick || !track || cards.length < 2) return;
  var mq = window.matchMedia('(max-width: 760px)');
  var rm = window.matchMedia('(prefers-reduced-motion: reduce)');
  var bar = document.createElement('div');
  bar.className = 'exps-bar';
  bar.innerHTML = '<i></i>';
  var fill = bar.firstChild;
  var shift = 0, span = 0, on = false, ticking = false;

  var topOff = 0;
  function measure() {
    track.style.transform = '';
    var sh = stick.offsetHeight;
    // la sección queda centrada en la pantalla mientras las tarjetas se desplazan
    topOff = Math.max(84, Math.round((window.innerHeight - sh) / 2));
    stick.style.top = topOff + 'px';
    shift = Math.max(0, track.scrollWidth - (stick.clientWidth - 48));
    span = shift;                      // 1 px de scroll = 1 px de desplazamiento
    pin.style.height = (sh + span) + 'px';
    update();
  }
  function update() {
    ticking = false;
    if (!on) return;
    var r = pin.getBoundingClientRect();
    var p = span > 0 ? Math.min(1, Math.max(0, (topOff - r.top) / span)) : 0;
    track.style.transform = 'translate3d(' + (-shift * p).toFixed(1) + 'px,0,0)';
    fill.style.transform = 'scaleX(' + (0.12 + 0.88 * p).toFixed(3) + ')';
  }
  function onScroll() { if (!ticking) { ticking = true; requestAnimationFrame(update); } }

  function enable() {
    if (on) return;
    on = true;
    pin.classList.add('pin-on');
    Array.prototype.forEach.call(cards, function (c) { c.classList.add('is-in'); });
    stick.appendChild(bar);
    window.addEventListener('scroll', onScroll, { passive: true });
    measure();
    setTimeout(measure, 400);
  }
  function disable() {
    if (!on) return;
    on = false;
    pin.classList.remove('pin-on');
    pin.style.height = '';
    stick.style.top = '';
    track.style.transform = '';
    if (bar.parentNode) bar.parentNode.removeChild(bar);
    window.removeEventListener('scroll', onScroll);
  }
  function sync() { (mq.matches && !rm.matches) ? enable() : disable(); }
  sync();
  (mq.addEventListener ? mq.addEventListener.bind(mq, 'change') : mq.addListener.bind(mq))(sync);
  window.addEventListener('resize', function () { if (on) measure(); });
  window.addEventListener('load', function () { if (on) measure(); });
})();
