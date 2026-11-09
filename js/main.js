(function () {
  'use strict';
  var $ = function (s, c) { return (c || document).querySelector(s); };
  var $$ = function (s, c) { return Array.prototype.slice.call((c || document).querySelectorAll(s)); };
  var reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  var coarse = window.matchMedia('(hover: none)').matches;
  var FEDE = '5493425969853', FLOR = '5493424497718';

  /* ---------- siempre arriba al recargar ---------- */
  if ('scrollRestoration' in history) history.scrollRestoration = 'manual';
  if (location.hash) history.replaceState(null, '', location.pathname + location.search);
  window.scrollTo(0, 0);
  window.addEventListener('pageshow', function () { window.scrollTo(0, 0); });

  /* ---------- Lenis + ScrollTrigger ---------- */
  gsap.registerPlugin(ScrollTrigger);
  ScrollTrigger.config({ ignoreMobileResize: true });
  var lenis = null;
  if (!reduce) {
    lenis = new Lenis({ lerp: 0.1, wheelMultiplier: 1, smoothWheel: true });
    lenis.on('scroll', ScrollTrigger.update);
    gsap.ticker.add(function (t) { lenis.raf(t * 1000); });
    gsap.ticker.lagSmoothing(0);
  }
  $$('a[href^="#"]').forEach(function (a) {
    a.addEventListener('click', function (e) {
      var t = $(a.getAttribute('href'));
      if (!t) return;
      e.preventDefault();
      if (lenis) lenis.scrollTo(t, { offset: -10, duration: 1.4 }); else t.scrollIntoView();
    });
  });

  /* ---------- contacto: modal ---------- */
  var modal = $('#modal');
  var baseMsg = function (n) { return 'Hola ' + n + ', vi la web de iNGENIA y quiero pedir una demo para mi negocio.'; };
  function wa(num, text) { return 'https://wa.me/' + num + '?text=' + encodeURIComponent(text); }
  $('#mF').href = wa(FEDE, baseMsg('Fede'));
  $('#mL').href = wa(FLOR, baseMsg('Flor'));
  function openModal() { modal.classList.add('open'); modal.setAttribute('aria-hidden', 'false'); if (lenis) lenis.stop(); }
  function closeModal() { modal.classList.remove('open'); modal.setAttribute('aria-hidden', 'true'); if (lenis) lenis.start(); }
  $$('[data-contact]').forEach(function (b) { b.addEventListener('click', openModal); });
  $$('[data-close]').forEach(function (b) { b.addEventListener('click', closeModal); });
  document.addEventListener('keydown', function (e) { if (e.key === 'Escape') closeModal(); });

  /* ---------- constructor de mensaje ---------- */
  var sel = { rubro: '', needs: [] };
  var msgEl = $('#msg'), typed = 0, typeTimer = null, fullMsg = '';
  function compose(name) {
    var t = 'Hola ' + name + ', vi la web de iNGENIA.';
    if (sel.rubro) t += ' Tengo ' + sel.rubro + '.';
    var n = sel.needs.filter(Boolean);
    if (n.length) {
      var list = n.length > 1 ? n.slice(0, -1).join(', ') + ' y ' + n[n.length - 1] : n[0];
      t += ' Me interesa ' + list + '.';
    }
    t += ' Quiero pedir una demo.';
    return t;
  }
  function refresh(animate) {
    fullMsg = compose('Fede').replace('Hola Fede', 'Hola');
    $('#sendF').href = wa(FEDE, compose('Fede'));
    $('#sendL').href = wa(FLOR, compose('Flor'));
    $('#mF').href = wa(FEDE, compose('Fede'));
    $('#mL').href = wa(FLOR, compose('Flor'));
    clearInterval(typeTimer_());
    if (reduce || !animate) { msgEl.textContent = fullMsg; return; }
    typed = 0;
    typeTimer = setInterval(function () {
      typed += 2;
      msgEl.textContent = fullMsg.slice(0, typed);
      if (typed >= fullMsg.length) clearInterval(typeTimer);
    }, 16);
  }
  function typeTimer_() { return typeTimer; }
  $$('#chRubro button').forEach(function (b) {
    b.addEventListener('click', function () {
      var on = b.getAttribute('aria-pressed') === 'true';
      $$('#chRubro button').forEach(function (x) { x.setAttribute('aria-pressed', 'false'); });
      b.setAttribute('aria-pressed', on ? 'false' : 'true');
      sel.rubro = on ? '' : b.dataset.v;
      refresh(true);
    });
  });
  $$('#chNeed button').forEach(function (b) {
    b.addEventListener('click', function () {
      var on = b.getAttribute('aria-pressed') === 'true';
      b.setAttribute('aria-pressed', on ? 'false' : 'true');
      sel.needs = $$('#chNeed button[aria-pressed=true]').map(function (x) { return x.dataset.v; });
      refresh(true);
    });
  });
  refresh(false);

  /* ---------- modo día / noche (revelado circular como en HOGAR) ---------- */
  var root = document.documentElement, tbtn = $('#themeBtn'), tcm = $('#tc');
  function isDark() { return root.getAttribute('data-theme') === 'dark'; }
  function paintBtn(swap) {
    var d = isDark();
    tbtn.innerHTML = '<svg><use href="#i-' + (d ? 'sun' : 'moon') + '"/></svg>';
    tbtn.setAttribute('aria-label', d ? 'Pasar a modo día' : 'Pasar a modo noche');
    tbtn.title = d ? 'Modo día' : 'Modo noche';
    tcm.setAttribute('content', d ? '#0B1120' : '#F3F6FC');
    if (swap) { tbtn.classList.remove('swap'); void tbtn.offsetWidth; tbtn.classList.add('swap'); }
  }
  function applyTheme(t) {
    root.setAttribute('data-theme', t);
    try { localStorage.setItem('ingenia_theme', t); } catch (e) { }
    paintBtn(true);
  }
  tbtn.addEventListener('click', function () {
    var t = isDark() ? 'light' : 'dark';
    if (reduce) { applyTheme(t); return; }
    if (document.startViewTransition) {
      var r = tbtn.getBoundingClientRect(), x = r.left + r.width / 2, y = r.top + r.height / 2;
      var rad = Math.hypot(Math.max(x, innerWidth - x), Math.max(y, innerHeight - y));
      root.style.backgroundColor = getComputedStyle(document.body).backgroundColor;
      setTimeout(function () { root.style.backgroundColor = ''; }, 400);
      var vt = document.startViewTransition(function () { applyTheme(t); });
      vt.ready.then(function () {
        root.animate({ clipPath: ['circle(0px at ' + x + 'px ' + y + 'px)', 'circle(' + rad + 'px at ' + x + 'px ' + y + 'px)'] },
          { duration: 650, easing: 'cubic-bezier(.65,0,.35,1)', pseudoElement: '::view-transition-new(root)' });
      }).catch(function () { });
    } else {
      root.classList.add('theme-fade'); applyTheme(t); setTimeout(function () { root.classList.remove('theme-fade'); }, 500);
    }
  });
  paintBtn(false);

  /* ---------- nav / progreso / dock ---------- */
  var nav = $('#nav'), prog = $('#prog'), dock = $('#dock'), hero = $('#inicio'), ctaSec = $('#contacto');
  ScrollTrigger.create({
    start: 0, end: 'max',
    onUpdate: function (s) {
      prog.style.transform = 'scaleX(' + s.progress + ')';
      nav.classList.toggle('solid', window.scrollY > 30);
    }
  });
  ScrollTrigger.create({ trigger: hero, start: 'bottom 70%', endTrigger: ctaSec, end: 'top 55%', toggleClass: { targets: dock, className: 'show' } });

  /* glow que sigue al cursor */
  var glow = $('#glow');
  if (!coarse) {
    var gx = gsap.quickTo(glow, 'x', { duration: .6, ease: 'power3' }), gy = gsap.quickTo(glow, 'y', { duration: .6, ease: 'power3' });
    window.addEventListener('pointermove', function (e) { gx(e.clientX); gy(e.clientY); }, { passive: true });
  }

  /* ---------- partículas del hero ---------- */
  (function () {
    var cv = $('#cv'); if (coarse) { cv.style.display = 'none'; return; }
    var ctx = cv.getContext('2d'), W, H, pts = [], on = true, dpr = Math.min(window.devicePixelRatio || 1, 2);
    function size() { W = cv.clientWidth; H = cv.clientHeight; cv.width = W * dpr; cv.height = H * dpr; ctx.setTransform(dpr, 0, 0, dpr, 0, 0); }
    size(); window.addEventListener('resize', size);
    var N = W < 700 ? 26 : 52;
    for (var i = 0; i < N; i++) pts.push({ x: Math.random() * W, y: Math.random() * H, vx: (Math.random() - .5) * .25, vy: (Math.random() - .5) * .25 });
    function draw() {
      if (!on) return;
      ctx.clearRect(0, 0, W, H);
      for (var i = 0; i < pts.length; i++) {
        var p = pts[i]; p.x += p.vx; p.y += p.vy;
        if (p.x < 0 || p.x > W) p.vx *= -1; if (p.y < 0 || p.y > H) p.vy *= -1;
        ctx.fillStyle = isDark() ? 'rgba(160,190,255,.55)' : 'rgba(37,99,235,.45)'; ctx.beginPath(); ctx.arc(p.x, p.y, 1.4, 0, 6.3); ctx.fill();
        for (var j = i + 1; j < pts.length; j++) {
          var q = pts[j], dx = p.x - q.x, dy = p.y - q.y, d = dx * dx + dy * dy;
          if (d < 14000) { ctx.strokeStyle = (isDark() ? 'rgba(100,150,255,' : 'rgba(37,99,235,') + (.16 * (1 - d / 14000)) + ')'; ctx.beginPath(); ctx.moveTo(p.x, p.y); ctx.lineTo(q.x, q.y); ctx.stroke(); }
        }
      }
      requestAnimationFrame(draw);
    }
    if (!reduce) {
      ScrollTrigger.create({ trigger: hero, start: 'top bottom', end: 'bottom top', onToggle: function (s) { var was = on; on = s.isActive; if (on && !was) draw(); } });
      draw();
    }
  })();

  /* ---------- preloader + entrada del hero ---------- */
  var heroLines = $$('.hero h1 .ln > span'), heroIn = $$('[data-in]');
  var pre = $('#pre');
  if (!reduce) {
    gsap.set(heroLines, { yPercent: 115 });
    gsap.set(heroIn, { opacity: 0, y: 26 });
    gsap.set('.hv .gal', { opacity: 0, y: 80 });
    gsap.set('.toast', { opacity: 0, scale: .8, y: 20 });
        var tl = gsap.timeline({ defaults: { ease: 'power3.out' } });
    tl.from('#pre .iso', { scale: .5, opacity: 0, duration: .7, ease: 'back.out(1.8)' })
      .to('#pre .iso', { scaleX: 1.12, scaleY: .9, duration: .14, yoyo: true, repeat: 1 }, '+=.1')
      .to(pre, { opacity: 0, duration: .45, onComplete: function () { pre.style.display = 'none'; } }, '+=.05')
      .to(heroLines, { yPercent: 0, duration: 1.1, stagger: .12, ease: 'expo.out' }, '-=.3')
      .to(heroIn, { opacity: 1, y: 0, duration: .8, stagger: .1 }, '-=.7')
      .to('.hv .gal', { opacity: 1, y: 0, duration: 1.2, ease: 'expo.out' }, '-=.9')
      .add(startToasts, '-=.4');
    setTimeout(function () { if (tl.progress() < 1) tl.progress(1); pre.style.display = 'none'; }, 3600);
  } else { pre.style.display = 'none'; }

  function startToasts() {
    var ts = $$('.toast'), loop = gsap.timeline({ repeat: -1, repeatDelay: .6 });
    ts.forEach(function (t, i) {
      loop.to(t, { opacity: 1, scale: 1, y: 0, duration: .6, ease: 'back.out(1.6)' }, i * 1.1)
          .to(t, { y: -8, duration: 1.6, yoyo: true, repeat: 1, ease: 'sine.inOut' }, i * 1.1 + .6);
    });
    loop.to(ts, { opacity: 0, scale: .9, duration: .5, stagger: .08 }, '>+.4');
  }

  /* inclinación 3D del hero con el puntero */
  var hv = $('#hv'), hp = $('#hphone');
  if (!coarse && !reduce) {
    var rx = gsap.quickTo(hp, 'rotationX', { duration: .8, ease: 'power3' }), ry = gsap.quickTo(hp, 'rotationY', { duration: .8, ease: 'power3' });
    hv.addEventListener('pointermove', function (e) {
      var r = hv.getBoundingClientRect(), x = (e.clientX - r.left) / r.width - .5, y = (e.clientY - r.top) / r.height - .5;
      ry(-8 + x * 12); rx(3 - y * 10);
    });
    hv.addEventListener('pointerleave', function () { ry(-8); rx(3); });
  }

  /* botones magnéticos */
  if (!coarse && !reduce) {
    $$('.btn-l,.btn-p').forEach(function (b) {
      var mx = gsap.quickTo(b, 'x', { duration: .4, ease: 'power3' }), my = gsap.quickTo(b, 'y', { duration: .4, ease: 'power3' });
      b.addEventListener('pointermove', function (e) { var r = b.getBoundingClientRect(); mx((e.clientX - r.left - r.width / 2) * .18); my((e.clientY - r.top - r.height / 2) * .28); });
      b.addEventListener('pointerleave', function () { mx(0); my(0); });
    });
  }

  /* ---------- texto del problema (palabra por palabra) ---------- */
  $$('[data-split]').forEach(function (p) {
    var words = p.textContent.trim().split(/\s+/);
    p.innerHTML = words.map(function (w) { return '<span class="w">' + w + '</span>'; }).join(' ');
    if (!reduce) gsap.to($$('.w', p), { opacity: 1, stagger: .5, ease: 'none', scrollTrigger: { trigger: p, start: 'top 82%', end: 'bottom 48%', scrub: true } });
  });

  /* ---------- reveals ---------- */
  if (!reduce) {
    ScrollTrigger.batch('.rv', {
      start: 'top 88%', once: true,
      onEnter: function (els) { gsap.to(els, { opacity: 1, y: 0, duration: 1, stagger: .12, ease: 'expo.out', overwrite: 'auto' }); }
    });
  }

  /* ---------- flujo pineado ---------- */
  var layers = $$('#stage .layer'), caps = $$('#caps .cap');
  function setCap(i) { caps.forEach(function (c, k) { c.classList.toggle('on', k === i); }); }
  if (!reduce) {
    gsap.set(layers.slice(1), { autoAlpha: 0, y: 36, scale: .96 });
    gsap.set('#ocard', { y: 40, opacity: 0 });
    var b1 = $('.b1'), b2 = $('.b2'), b3 = $('.b3'), n1 = $('.n1'), n2 = $('.n2'), n3 = $('.n3');
    var o = { a: 12, b: 8, c: 9, s: 0 }, bars = $$('.bars i'), big = $('#bigsales');
    gsap.set(bars, { scaleY: 0 });
    var ft = gsap.timeline({
      defaults: { ease: 'none' },
      scrollTrigger: {
        trigger: '#flowpin', start: 'top top', end: '+=360%', pin: true, scrub: .6, anticipatePin: 1,
        onUpdate: function (s) {
          setCap(Math.min(3, Math.floor(s.progress * 4 + .02)));
          var pr = s.progress, rail = $('#caps');
          if (rail) rail.style.setProperty('--rail', pr.toFixed(3));
          caps.forEach(function (c, k) {
            var q = Math.max(0, Math.min(1, pr * 4 - k));
            c.style.setProperty('--q', (q * 360).toFixed(0) + 'deg');
          });
          var h = $('#flowhint'); if (h) h.classList.toggle('off', pr > .93);
        }
      }
    });
    ft.to('#confirm', { scale: .93, duration: .25, yoyo: true, repeat: 1 }, .55)
      .to(layers[0], { autoAlpha: 0, y: -36, scale: .96, duration: .5 }, .95)
      .to(layers[1], { autoAlpha: 1, y: 0, scale: 1, duration: .5 }, 1)
      .to('#ocard', { y: 0, opacity: 1, duration: .5 }, 1.1)
      .to(layers[1], { autoAlpha: 0, y: -36, scale: .96, duration: .5 }, 1.95)
      .to(layers[2], { autoAlpha: 1, y: 0, scale: 1, duration: .5 }, 2)
      .to(o, { a: 11, b: 7, c: 6, duration: .8, onUpdate: function () {
        n1.textContent = Math.round(o.a) + ' unidades'; n2.textContent = Math.round(o.b) + ' unidades'; n3.textContent = Math.round(o.c) + ' unidades';
        gsap.set(b1, { scaleX: o.a / 12 }); gsap.set(b2, { scaleX: o.b / 8 }); gsap.set(b3, { scaleX: o.c / 9 });
      } }, 2.15)
      .to(layers[2], { autoAlpha: 0, y: -36, scale: .96, duration: .5 }, 2.95)
      .to(layers[3], { autoAlpha: 1, y: 0, scale: 1, duration: .5 }, 3)
      .to(bars, { scaleY: 1, stagger: .08, duration: .4 }, 3.1)
      .to(o, { s: 184000, duration: .9, onUpdate: function () { big.textContent = '$' + Math.round(o.s).toLocaleString('es-AR'); } }, 3.1);
  } else {
    $('#bigsales').textContent = '$184.000';
    caps.forEach(function (c) { c.classList.add('on'); });
  }

  /* ---------- servicios: efecto de apilado (escritorio y móvil) ---------- */
  if (!reduce) {
    var cards = $$('.svc'), small = window.matchMedia('(max-width:899px)').matches;
    cards.forEach(function (c, i) {
      if (i === cards.length - 1) return;
      gsap.to(c, { scale: small ? .95 : .94, ease: 'none', transformOrigin: '50% 0%', scrollTrigger: { trigger: cards[i + 1], start: 'top 85%', end: small ? 'top 18%' : 'top 22%', scrub: true } });
    });
  }

  /* comparador antes / después */
  (function () {
    var box = $('#cmp'), bef = $('#cbefore'), hnd = $('#chnd'), drag = false;
    function set(p) { p = Math.max(4, Math.min(96, p)); bef.style.clipPath = 'inset(0 ' + (100 - p) + '% 0 0)'; hnd.style.left = p + '%'; }
    function move(e) { var r = box.getBoundingClientRect(); set((e.clientX - r.left) / r.width * 100); }
    box.addEventListener('pointerdown', function (e) { drag = true; box.setPointerCapture(e.pointerId); move(e); });
    box.addEventListener('pointermove', function (e) { if (drag) move(e); });
    box.addEventListener('pointerup', function () { drag = false; });
    box.addEventListener('pointercancel', function () { drag = false; });
    if (!reduce) {
      var o = { p: 50 };
      ScrollTrigger.create({ trigger: box, start: 'top 75%', once: true, onEnter: function () {
        gsap.timeline().to(o, { p: 82, duration: .9, ease: 'power2.inOut', onUpdate: function () { set(o.p); } }).to(o, { p: 22, duration: 1.1, ease: 'power2.inOut', onUpdate: function () { set(o.p); } }).to(o, { p: 50, duration: .8, ease: 'power2.out', onUpdate: function () { set(o.p); } });
      } });
    }
  })();

  /* contador del caso */
  (function () {
    var el = $('#cnt'), o = { v: 0 };
    if (reduce) return;
    el.textContent = '1';
    ScrollTrigger.create({ trigger: el, start: 'top 85%', once: true, onEnter: function () {
      o.v = 1; gsap.to(o, { v: 10, duration: 1.6, ease: 'power3.out', onUpdate: function () { el.textContent = Math.round(o.v); } });
    } });
  })();

  /* pasos: leve entrada escalonada ya cubierta por .rv */
  window.addEventListener('load', function () { ScrollTrigger.refresh(); });
})();
