/* Ampliar material (lightbox) + seccion "Mirá cómo se mueve": cada trabajo se agranda con el scroll */
(function () {
  var $ = function (s, r) { return (r || document).querySelector(s); };
  var $$ = function (s, r) { return [].slice.call((r || document).querySelectorAll(s)); };
  var reduce = window.matchMedia && matchMedia('(prefers-reduced-motion: reduce)').matches;
  var G = window.gsap;

  /* ================= LIGHTBOX ================= */
  var lb = $('#lb'), stage = lb && $('.lb-stage', lb), capEl = lb && $('.lb-cap', lb), bg = lb && $('.lb-bg', lb);
  var zs = [], cur = -1, mediaEl = null, opening = false;

  function visibleMedia(el) {
    var v = $$('video', el).filter(function (x) { return x.offsetParent !== null || getComputedStyle(x).display !== 'none'; });
    v = v.filter(function (x) { return getComputedStyle(x).display !== 'none'; });
    return v[0] || $('img', el);
  }
  function capOf(el) {
    var d = el.getAttribute('data-cap'); if (d) return d;
    var it = el.closest('.reel-item'); if (it) return it.getAttribute('data-name') + ' · ' + it.getAttribute('data-desc');
    var sv = el.closest('.svc'); if (sv) { var h = $('h3', sv); return h ? h.textContent : ''; }
    return '';
  }
  function collect() {
    zs = $$('.svc .rw, .svc .rp, .hv .gal .g-cell, .reel .rf');
    zs.forEach(function (el) {
      if (el.hasAttribute('data-zoom')) return;
      el.setAttribute('data-zoom', ''); el.setAttribute('tabindex', '0'); el.setAttribute('role', 'button'); el.setAttribute('aria-label', 'Ampliar a pantalla completa');
      el.addEventListener('click', function (e) { e.preventDefault(); open(zs.indexOf(el)); });
      el.addEventListener('keydown', function (e) { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); open(zs.indexOf(el)); } });
    });
  }
  function build(i) {
    var el = zs[i], src = visibleMedia(el), m;
    var r = src.getBoundingClientRect(), ar = (r.width / r.height) || 1.6;
    if (src.tagName === 'VIDEO') {
      m = document.createElement('video'); m.muted = true; m.loop = true; m.playsInline = true; m.setAttribute('playsinline', ''); m.autoplay = true;
      m.src = src.getAttribute('src') || src.getAttribute('data-src') || src.currentSrc; m.poster = src.poster || '';
      m.addEventListener('loadedmetadata', function () { try { m.currentTime = src.currentTime || 0; } catch (_) {} fit(m, m.videoWidth / m.videoHeight); var p = m.play(); if (p && p.catch) p.catch(function () {}); });
      m.addEventListener('click', function (e) { e.stopPropagation(); if (m.paused) m.play(); else m.pause(); });
    } else {
      m = document.createElement('img'); m.src = src.currentSrc || src.src; m.alt = '';
      m.addEventListener('load', function () { fit(m, m.naturalWidth / m.naturalHeight); });
    }
    fit(m, ar); m.className = 'lb-m';
    return m;
  }
  function fit(m, ar) { if (!ar || !isFinite(ar)) return; m.style.width = 'min(96vw, calc((100svh - 130px) * ' + ar + '))'; m.style.height = 'auto'; m.style.aspectRatio = String(ar); }
  function flipFrom(m, el, inward) {
    var sr = el.getBoundingClientRect(), tr = m.getBoundingClientRect();
    if (!G || reduce || !sr.width || sr.bottom < 0 || sr.top > innerHeight) return null;
    var f = { x: sr.left - tr.left, y: sr.top - tr.top, scaleX: sr.width / tr.width, scaleY: sr.height / tr.height, transformOrigin: '0 0' };
    return f;
  }
  function open(i) {
    if (!lb || opening || i < 0) return; opening = true; cur = i;
    mediaEl = build(i); stage.innerHTML = ''; stage.appendChild(mediaEl);
    capEl.textContent = capOf(zs[i]);
    lb.hidden = false; lb.setAttribute('aria-hidden', 'false'); document.documentElement.classList.add('lb-open');
    if (window.__lenis) window.__lenis.stop();
    var f = flipFrom(mediaEl, zs[i]);
    if (G && !reduce) {
      G.fromTo(bg, { opacity: 0 }, { opacity: 1, duration: .35 });
      G.fromTo([$('.lb-x', lb), $('.lb-n.lb-p', lb), $('.lb-n.lb-nx', lb), capEl], { opacity: 0 }, { opacity: 1, duration: .4, delay: .2 });
      if (f) G.fromTo(mediaEl, f, { x: 0, y: 0, scaleX: 1, scaleY: 1, duration: .55, ease: 'power3.out', clearProps: 'transform', onComplete: function () { opening = false; } });
      else G.fromTo(mediaEl, { opacity: 0, scale: .94 }, { opacity: 1, scale: 1, duration: .4, ease: 'power2.out', clearProps: 'transform,opacity', onComplete: function () { opening = false; } });
    } else opening = false;
    $('.lb-x', lb).focus({ preventScroll: true });
  }
  function done() {
    lb.hidden = true; lb.setAttribute('aria-hidden', 'true'); stage.innerHTML = ''; mediaEl = null; opening = false;
    document.documentElement.classList.remove('lb-open'); if (window.__lenis) window.__lenis.start();
  }
  function close() {
    if (!lb || lb.hidden || !mediaEl) return;
    var el = zs[cur], m = mediaEl, f = G && !reduce ? flipFrom(m, el) : null;
    if (G && !reduce) {
      G.to([$('.lb-x', lb), $('.lb-n', lb), capEl], { opacity: 0, duration: .2 });
      G.to(bg, { opacity: 0, duration: .4, delay: .1 });
      if (f) { m.style.transformOrigin = '0 0'; G.to(m, { x: f.x, y: f.y, scaleX: f.scaleX, scaleY: f.scaleY, duration: .45, ease: 'power3.inOut', onComplete: function () { done(); try { el.focus({ preventScroll: true }); } catch (_) {} } }); }
      else G.to(m, { opacity: 0, scale: .94, duration: .3, onComplete: done });
    } else done();
  }
  function go(d) {
    if (cur < 0 || !zs.length) return; var i = (cur + d + zs.length) % zs.length;
    cur = i; var old = mediaEl; mediaEl = build(i); capEl.textContent = capOf(zs[i]); mediaEl.style.opacity = 0; stage.appendChild(mediaEl);
    if (G && !reduce) { G.to(old, { opacity: 0, x: -d * 40, duration: .25, onComplete: function () { if (old.parentNode) old.parentNode.removeChild(old); } }); G.fromTo(mediaEl, { opacity: 0, x: d * 40 }, { opacity: 1, x: 0, duration: .35, delay: .1, clearProps: 'transform,opacity' }); }
    else { if (old.parentNode) old.parentNode.removeChild(old); mediaEl.style.opacity = 1; }
  }
  if (lb) {
    collect();
    $('.lb-x', lb).addEventListener('click', close);
    $('.lb-p', lb).addEventListener('click', function () { go(-1); });
    $('.lb-nx', lb).addEventListener('click', function () { go(1); });
    bg.addEventListener('click', close); stage.addEventListener('click', function (e) { if (e.target === stage) close(); });
    document.addEventListener('keydown', function (e) {
      if (lb.hidden) return;
      if (e.key === 'Escape') close(); else if (e.key === 'ArrowLeft') go(-1); else if (e.key === 'ArrowRight') go(1);
    });
    var sx = 0, sy = 0, tr = false;
    lb.addEventListener('pointerdown', function (e) { if (e.target.closest('button')) return; sx = e.clientX; sy = e.clientY; tr = true; });
    lb.addEventListener('pointerup', function (e) {
      if (!tr) return; tr = false; var dx = e.clientX - sx, dy = e.clientY - sy;
      if (Math.abs(dy) > 90 && Math.abs(dy) > Math.abs(dx)) close(); else if (Math.abs(dx) > 70) go(dx < 0 ? 1 : -1);
    });
  }

  /* ================= REEL: agrandar con el scroll ================= */
  var reel = $('#trabajos'); if (!reel) return;
  var items = $$('.reel-item', reel), N = items.length;
  var head = $('.reel-head', reel), cap = $('.rc', reel), capB = $('b', cap), capS = $('span', cap), hint = $('.reel-hint', reel);
  var mob = function () { return innerWidth < 900; };
  function av(it) { return $(mob() ? '.v-m' : '.v-d', it); }
  function load(v) { if (v && !v.getAttribute('src')) { v.src = v.getAttribute('data-src'); v.load(); } }
  if (reduce || !G || !window.ScrollTrigger) { reel.classList.add('static'); return; }

  function cover(rf) { return Math.max(innerWidth / rf.offsetWidth, innerHeight / rf.offsetHeight) * 1.002; }
  function setActive(i) {
    items.forEach(function (it, k) {
      var v = av(it); if (!v) return;
      if (k === i) { load(v); if (v.paused) { var p = v.play(); if (p && p.catch) p.catch(function () {}); } }
      else if (!v.paused) { try { v.pause(); } catch (_) {} }
    });
    capB.textContent = items[i].getAttribute('data-name'); capS.textContent = items[i].getAttribute('data-desc');
  }
  var act = -1;
  function buildReel() {
    gsap.set(items, { autoAlpha: 0 }); gsap.set(items[0], { autoAlpha: 1 });
    var tl = gsap.timeline({
      defaults: { ease: 'none' },
      scrollTrigger: {
        trigger: reel, start: 'top top', end: function () { return '+=' + Math.round(innerHeight * N * 2.6); },
        pin: $('.reel-pin', reel), scrub: .6, anticipatePin: 1, invalidateOnRefresh: true,
        onUpdate: function (s) { var i = Math.min(N - 1, Math.floor(s.progress * N * 0.9999)); if (i !== act) { act = i; setActive(i); } },
        onEnter: function () { if (act < 0) { act = 0; setActive(0); } }
      }
    });
    var off = function () { return innerHeight * (mob() ? .085 : .075); };
    items.forEach(function (it, i) {
      var rf = $('.rf', it), t = i * 3;
      gsap.set(rf, { y: off, transformOrigin: '50% 50%' });
      if (i > 0) tl.fromTo(it, { autoAlpha: 0 }, { autoAlpha: 1, duration: .3, ease: 'power1.out' }, t - .3);
      tl.fromTo(rf, { scale: 1, y: off, borderRadius: 18 }, { scale: function () { return cover(rf); }, y: 0, borderRadius: 0, duration: 1, ease: 'power2.inOut' }, t + .3);
      tl.to(rf, { scale: 1, y: off, borderRadius: 18, duration: .8, ease: 'power2.inOut' }, t + 2.0);
      if (i < N - 1) tl.to(it, { autoAlpha: 0, duration: .3, ease: 'power1.in' }, t + 2.7);
    });
    tl.to(head, { autoAlpha: 0, duration: .3 }, .3);
    tl.to(hint, { autoAlpha: 0, duration: .2 }, .1);
    tl.to({}, { duration: .01 }, N * 3);
    setActive(0);
  }
  window.addEventListener('load', function () {
    items.forEach(function (it) { load(av(it)); });
    buildReel(); ScrollTrigger.refresh();
  });
  var lastM = mob();
  addEventListener('resize', function () { if (mob() !== lastM) { lastM = mob(); items.forEach(function (it) { load(av(it)); }); setActive(Math.max(0, act)); } });
})();
