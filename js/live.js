/* Maquetas en vivo: abre el panel / la web de ejemplo en una ventana, con datos de muestra (nada se guarda de verdad) */
(function () {
  var ov = document.getElementById('live'); if (!ov) return;
  var f = ov.querySelector('iframe'), t = ov.querySelector('.live-t'), ld = ov.querySelector('.live-load');
  var URLS = {
    panel: 'demo/panel/tronco.html?auto=1&variante=resto&marca=8C2D4A',
    emp: 'demo/emperador/index.html',
    web: 'https://chatbot-lab-info.github.io/pastora-demo/?demo=1',
    mesa: 'https://chatbot-lab-info.github.io/pastora-demo/mesa/?demo=1&mesa=DEMO1234567890ABCDEFGHIJ'
  };
  var last = null;
  function open(k, title, btn) {
    last = btn; ld.hidden = false; ov.dataset.k = k; t.textContent = title || '';
    f.onload = function () { ld.hidden = true; };
    f.src = URLS[k]; ov.hidden = false; ov.setAttribute('aria-hidden', 'false');
    document.documentElement.classList.add('live-open'); if (window.__lenis) window.__lenis.stop();
    ov.querySelector('.live-x').focus({ preventScroll: true });
  }
  function close() {
    ov.hidden = true; ov.setAttribute('aria-hidden', 'true'); f.src = 'about:blank';
    document.documentElement.classList.remove('live-open'); if (window.__lenis) window.__lenis.start();
    if (last) try { last.focus({ preventScroll: true }); } catch (e) {}
  }
  document.addEventListener('click', function (e) {
    var b = e.target.closest('[data-live]'); if (b) { e.preventDefault(); open(b.dataset.live, b.dataset.title, b); }
  });
  ov.querySelector('.live-x').addEventListener('click', close);
  document.addEventListener('keydown', function (e) { if (e.key === 'Escape' && !ov.hidden) close(); });
})();
