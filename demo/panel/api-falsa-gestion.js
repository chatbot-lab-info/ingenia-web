/* Extensión de la API falsa para los módulos de gestión (Compras, Proveedores, Reportes, Ajustes, Conexión con la web).
 * SOLO DESARROLLO · datos sintéticos. Se carga DESPUÉS de api-falsa.js y NO la pisa: envuelve window.google.script.run
 * y atiende solo las acciones que necesitan datos más ricos; todo lo demás pasa a la API falsa original.
 * Parámetros por query string:
 *   parcial=1     la primera importación de web.aplicar queda "parcial" (31 de 48) y web.reanudar la completa
 *   web=no_iniciada   web.estado devuelve que todavía no hay conexión
 *   vacio=1       compras.listar / reportes.resumen devuelven listas vacías (reportes también con fechas custom anteriores a 2025) (para ver los estados vacíos)
 *   error=accion  esa acción responde con un error amable (para ver "Reintentar")
 */
(function (g) {
  'use strict';
  var Q = new URLSearchParams((g.location && g.location.search) || '');
  var orig = g.google && g.google.script && g.google.script.run;
  if (!orig) { console.warn('api-falsa-gestion: cargá api-falsa.js primero'); return; }
  var EXT = {}, lotes = {}, corte = Q.get('parcial') === '1';
  var hex = function () { return Math.random().toString(16).slice(2, 10); };
  var ISO = function () { return new Date().toISOString(); };

  /* ---- Conexión con la web: escenarios con los tres tipos de conflicto, filas inválidas y corte a la mitad.
         Mantiene su propia ConexionWeb para que el estado cambie de verdad después de importar / publicar / enlazar / desconectar. ---- */
  var conex = Q.get('web') === 'no_iniciada' ? { estado: 'no_iniciada' } : null, urlLote = '';
  function nuevaConexion(modo, estado, resultado, url) {
    conex = { conexionId: 'con-' + hex(), modo: modo, estado: estado, webUrl: url || '', schemaVersion: 2, creado: ISO(), ultimoSync: ISO(), resultado: resultado || '' };
    return conex;
  }
  function resultadoLote(l) { return JSON.stringify({ loteId: l.loteId, estado: l.estado, aplicadas: l.aplicadas, total: l.filasTotal }); }
  EXT['web.estado'] = function () { return conex ? JSON.parse(JSON.stringify(conex)) : null; };   // null = que responda la API falsa original
  EXT['web.simular'] = function (p) {
    if (p.modo === 'B') return null;
    var id = 'lote-' + hex();
    lotes[id] = { loteId: id, tipo: 'import_web', estado: 'simulado', filasTotal: 48, aplicadas: 0 }; urlLote = p.webUrl || '';
    return { loteId: id, resumen: { enWeb: 48, seCrearan: 44, yaVinculados: 2, paraRevisar: 3 }, conflictos: [
      { webId: 'w-7', nombre: 'Fideos tallarín 500 g x 2', tipo: 'posible_duplicado', detalle: 'Se parece a «Fideos tallarín 500 g», que ya está en el panel.', propuesta: 'unir:prod-1a2b3c04', opciones: ['unir:prod-1a2b3c04', 'crear_aparte', 'omitir'] },
      { webId: 'w-9', nombre: 'Yerba mate 1 kg', tipo: 'precio_distinto', detalle: 'Precio distinto: en la web $ 4.100 y en el panel $ 4.250.', propuesta: 'usar_panel', opciones: ['usar_panel', 'usar_web', 'omitir'] },
      { webId: 'w-14', nombre: 'Escoba de paja', tipo: 'dato_incompleto', detalle: 'En la web le falta: precio y unidad de venta. Si lo creás aparte queda pausado para que lo completes.', propuesta: 'omitir', opciones: ['omitir', 'crear_aparte'] }
    ], invalidos: [{ fila: 12, error: 'Falta el nombre del producto.' }, { fila: 31, error: 'El precio no es un número.' }] };
  };
  EXT['web.aplicar'] = function (p) {
    var l = lotes[p.loteId]; if (!l) return { _err: ['NO_ENCONTRADO', 'No encontramos ese lote. Hacé la vista previa de nuevo.'] };
    if (l.estado === 'completo') return { loteId: l.loteId, estado: 'completo', aplicadas: l.filasTotal, total: l.filasTotal, errores: [] };
    if (l.estado !== 'simulado') return { _err: ['CONFLICTO', 'Este lote ya empezó. Usá "Reanudar" para seguir donde quedó.'] };
    if (corte) { l.estado = 'parcial'; l.aplicadas = 31; nuevaConexion('A', 'pendiente', resultadoLote(l), urlLote);
      return { loteId: l.loteId, estado: 'parcial', aplicadas: 31, total: 48, errores: ['Se cortó la importación en el producto «Mermelada de durazno» (fila 32). Lo que ya se guardó queda guardado: tocá "Reanudar".'] }; }
    l.estado = 'completo'; l.aplicadas = 48; nuevaConexion('A', 'conectada', resultadoLote(l), urlLote);
    return { loteId: l.loteId, estado: 'completo', aplicadas: 48, total: 48, errores: [] };
  };
  EXT['web.reanudar'] = function (p) {
    var l = lotes[p.loteId]; if (!l) return { _err: ['NO_ENCONTRADO', 'No encontramos ese lote. Hacé la vista previa de nuevo.'] };
    if (l.estado === 'simulado') return { _err: ['VALIDACION', 'Este lote todavía no se aplicó. Confirmá la importación primero.'] };
    l.estado = 'completo'; l.aplicadas = 48; nuevaConexion('A', 'conectada', resultadoLote(l), urlLote);
    return { loteId: p.loteId, estado: 'completo', aplicadas: 48, total: 48, errores: [] };
  };
  EXT['web.publicarAplicar'] = function (p) { nuevaConexion('B', 'conectada', JSON.stringify({ loteId: p.loteId, estado: 'completo', aplicadas: 11, total: 11 })); return { loteId: p.loteId, estado: 'completo', aplicadas: 11, total: 11, errores: [] }; };
  EXT['web.conectarSinCatalogo'] = function (p) { if (!/^https:\/\/[^\s\/]+\.[^\s\/]+/i.test(p.webUrl || '')) return { _err: ['VALIDACION', 'La dirección de la web tiene que empezar con https:// y ser un sitio público.'] }; return nuevaConexion('C', 'conectada', 'Conectada sin catálogo.', p.webUrl); };
  EXT['web.desconectar'] = function () { if (!conex || conex.estado === 'desconectada' || conex.estado === 'no_iniciada') return conex || { estado: 'no_iniciada' }; conex.estado = 'desconectada'; conex.resultado = 'Desconectada. No se borró ningún producto ni vínculo.'; return JSON.parse(JSON.stringify(conex)); };

  /* ---- estados vacíos ---- */
  EXT['compras.listar'] = function () {
    if (Q.get('vacio') !== '1') return null;
    return { compras: [], resumen: { porRecibir: 0, porPagar: 0, compradoMes: 0, cantidadMes: 0, recibidasSemana: 0 } };
  };

  EXT['reportes.resumen'] = function (p) {
    if (Q.get('vacio') !== '1' && !(p && p.periodo === 'custom' && String(p.hasta || '') < '2025-01-01')) return null;
    var dias = [], d = new Date(); for (var i = 6; i >= 0; i--) { var x = new Date(d.getTime() - i * 864e5); dias.push({ fecha: x.toISOString().slice(0, 10), total: 0 }); }
    return { vendido: 0, ventas: 0, ticketPromedio: 0, comparado: { vendido: 0, ventas: 0, ticketPromedio: 0 }, ventasPorDia: dias, masVendidos: [], medioPago: [], canal: [], paraReponer: [], compradoAProveedores: 0, comprasRecibidas: 0 };
  };

  function envolver(r, ok, ko) {
    return {
      withSuccessHandler: function (f) { return envolver(r.withSuccessHandler(f), f, ko); },
      withFailureHandler: function (f) { return envolver(r.withFailureHandler(f), ok, f); },
      login: function () { return r.login.apply(r, arguments); },
      activarInvitacion: function () { return r.activarInvitacion.apply(r, arguments); },
      perfilesLogin: function () { return r.perfilesLogin.apply(r, arguments); },
      obtenerModulo: function () { return r.obtenerModulo.apply(r, arguments); },
      api: function (tok, accion, payload) {
        var args = arguments;
        if (Q.get('error') === accion) {
          setTimeout(function () { if (ok) ok({ ok: false, code: 'ERROR', mensaje: 'Algo falló de nuestro lado. Probá de nuevo en un momento.' }); }, 120); return;
        }
        var h = EXT[accion], v = h ? h(payload || {}) : null;
        if (!h || v === null) return r.api.apply(r, args);
        var lat = (g.ApiFalsa && g.ApiFalsa.cfg && g.ApiFalsa.cfg.latencia != null) ? g.ApiFalsa.cfg.latencia : 140;
        setTimeout(function () {
          if (v && v._err) { if (ok) ok({ ok: false, code: v._err[0], mensaje: v._err[1] }); return; }
          if (ok) ok({ ok: true, data: v });
        }, lat);
      }
    };
  }
  g.google.script.run = envolver(orig, null, null);
  if (g.ApiFalsa && g.ApiFalsa.reiniciar) { /* "Reiniciar datos" del arnés también vuelve a cero la conexión y los lotes de esta extensión */
    var reiniciarBase = g.ApiFalsa.reiniciar;
    g.ApiFalsa.reiniciar = function () { conex = Q.get('web') === 'no_iniciada' ? { estado: 'no_iniciada' } : null; lotes = {}; corte = Q.get('parcial') === '1'; return reiniciarBase.apply(this, arguments); };
  }
})(window);
