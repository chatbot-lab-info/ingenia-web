/* API falsa del Panel iNGENIA v2 — SOLO DESARROLLO, datos sintéticos de "Almacén Doña Norma".
 * Devuelve las formas de CONTRATO_INTERNO.md §3.1 para todas las acciones (incluidas las de otros módulos).
 * Expone:
 *   window.ApiFalsa  { llamar(token, accion, payload) -> sobre {ok,data}|{ok:false,code,mensaje}, configurar(o), reiniciar(), db }
 *   window.google.script.run  (emulación: withSuccessHandler / withFailureHandler / api / login / activarInvitacion / obtenerModulo)
 * Parámetros por query string: rol=dueño/a|encargado|cajero · marca=RRGGBB · lat=ms · demo=0|1 · dias=días de vigencia · fallar=n (próximas n llamadas fallan por red).
 * Es lógica de prueba: refleja las reglas del contrato (redondeo por línea, paso, idempotencia por pedidoId, transiciones de estado, permisos §5). */
(function (g) {
  'use strict';
  var Q = new URLSearchParams((g.location && g.location.search) || '');
  var cfg = {
    latencia: Q.get('lat') != null ? +Q.get('lat') : 140,
    rol: Q.get('rol') || 'dueño/a',
    marca: '#' + (Q.get('marca') || '4F6B2E').replace('#', ''),
    demo: Q.get('demo') !== '0',
    dias: Q.get('dias') != null ? +Q.get('dias') : 23,
    fallar: Q.get('fallar') ? +Q.get('fallar') : 0,
    serverError: false,
    tarjetas: Q.get('tarjetas') !== '0',
    resto: Q.get('variante') === 'resto'   // variante Restó: módulo Mesas y «Carta»
  };
  var db;
  var NOW = function () { return Date.now(); };
  var ISO = function (minAtras) { return new Date(NOW() - (minAtras || 0) * 60000).toISOString(); };
  var hex = function (n) { var s = ''; while (s.length < n) s += Math.floor(Math.random() * 16).toString(16); return s; };
  var nid = function (p) { return p + '-' + hex(8); };
  var rp = function (n) { return Math.round(n + 1e-9); };               // redondeo mitad hacia arriba, entero
  var clone = function (o) { return JSON.parse(JSON.stringify(o)); };
  var sinTilde = function (s) { return String(s).normalize('NFD').replace(/[̀-ͯ]/g, ''); };
  var kebab = function (s) { return sinTilde(s).toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, ''); };

  function Err(code, mensaje, campos) { var e = { code: code, mensaje: mensaje }; if (campos) e.campos = campos; return e; }

  // ---------------------------------------------------------------- permisos (§5)
  var MODS_PERM = ['inicio', 'pedidos', 'mostrador', 'productos', 'stock', 'ventas', 'clientes', 'compras', 'proveedores', 'reportes', 'usuarios', 'ajustes', 'web', 'mesas', 'reservas', 'cocina'];
  var MATRIZ = {
    'dueño/a':      { inicio: 'total', pedidos: 'total', mostrador: 'total', productos: 'total', stock: 'total', ventas: 'total', clientes: 'total', compras: 'total', proveedores: 'total', reportes: 'total', usuarios: 'total', ajustes: 'total', web: 'total', mesas: 'total', reservas: 'total', cocina: 'total' },
    encargado:  { inicio: 'total', pedidos: 'total', mostrador: 'total', productos: 'total', stock: 'total', ventas: 'ver', clientes: 'total', compras: 'total', proveedores: 'total', reportes: 'ver', usuarios: 'no', ajustes: 'no', web: 'ver', mesas: 'total', reservas: 'total', cocina: 'total' },
    cajero:     { inicio: 'ver', pedidos: 'total', mostrador: 'total', productos: 'ver', stock: 'ver', ventas: 'ver', clientes: 'ver', compras: 'no', proveedores: 'no', reportes: 'no', usuarios: 'no', ajustes: 'no', web: 'no', mesas: 'total', reservas: 'total', cocina: 'total' }
  };
  function permisosDe(rol) {
    var m = MATRIZ[rol] || MATRIZ.cajero, out = [];
    MODS_PERM.forEach(function (k) { if (m[k] === 'total') out.push(k + ':total'); else if (m[k] === 'ver') out.push(k + ':ver'); });
    return out;
  }
  function puede(rol, req) {
    var p = req.split(':'), n = (MATRIZ[rol] || {})[p[0]];
    return n === 'total' || (n === 'ver' && p[1] === 'ver');
  }

  // ---------------------------------------------------------------- datos semilla
  function seed() {
    var d = { corr: 148, pedidosPorId: {}, aud: [], movs: [], pedidoIdsVistos: {} };
    var pr = function (id, nombre, cat, uv, um, paso, dec, precio, stock, min, venta, desc) {
      return { productoId: 'prod-' + id, slugWeb: kebab(nombre), nombre: nombre, categoria: cat, descripcion: desc || '', imagenUrl: '', unidadVenta: uv, unidadMedida: um, paso: paso, decimales: dec, precioBase: precio, stockActual: stock, stockMinimo: min, alALaVenta: venta !== false, estado: 'activo', origen: 'panel', creado: ISO(60 * 24 * 40), actualizado: ISO(60 * 24 * 3) };
    };
    d.productos = [
      pr('1a2b3c01', 'Queso cremoso', 'Lácteos', 'peso', 'kg', 0.05, 3, 11800, 3.2, 4, true, 'Queso cremoso al corte.'),
      pr('1a2b3c02', 'Leche entera 1 L', 'Lácteos', 'unidad', 'u', 1, 0, 1980, 2, 6, true),
      pr('1a2b3c03', 'Yerba mate 1 kg', 'Almacén', 'unidad', 'u', 1, 0, 4250, 4, 5, true),
      pr('1a2b3c04', 'Fideos tallarín 500 g', 'Almacén', 'unidad', 'u', 1, 0, 1350, 38, 12, true),
      pr('1a2b3c05', 'Aceite de girasol 900 ml', 'Almacén', 'unidad', 'u', 1, 0, 3890, 0, 6, true),
      pr('1a2b3c06', 'Jamón cocido', 'Fiambres', 'peso', 'kg', 0.05, 3, 14900, 3.4, 2, false, 'Pausado hasta que llegue el proveedor.'),
      pr('1a2b3c07', 'Mortadela', 'Fiambres', 'peso', 'kg', 0.05, 3, 8900, 5.2, 2, true),
      pr('1a2b3c08', 'Arroz largo fino 1 kg', 'Almacén', 'unidad', 'u', 1, 0, 1890, 17, 8, true),
      pr('1a2b3c09', 'Gaseosa cola 2,25 L', 'Bebidas', 'unidad', 'u', 1, 0, 2700, 24, 10, true),
      pr('1a2b3c0a', 'Agua mineral 2 L', 'Bebidas', 'unidad', 'u', 1, 0, 1450, 30, 12, true),
      pr('1a2b3c0b', 'Detergente 750 ml', 'Limpieza', 'unidad', 'u', 1, 0, 2350, 11, 5, true),
      pr('1a2b3c0c', 'Lavandina 1 L', 'Limpieza', 'unidad', 'u', 1, 0, 980, 3, 6, true)
    ];
    d.presentaciones = [
      { presentacionId: 'pres-0000a001', productoId: 'prod-1a2b3c01', nombre: 'Pieza de 500 g', cantidadBase: 0.5, precio: 5900, activa: true }
    ];
    d.clientes = [
      ['cli-0000c001', 'Lucía Benítez', '5493425550148', 'San Martín 2450, Santa Fe', '', 'activo'],
      ['cli-0000c002', 'Diego Acosta', '5493425550146', '', 'Retira siempre por la tarde.', 'activo'],
      ['cli-0000c003', 'Carla Romero', '5493425550144', 'Las Heras 1020', '', 'activo'],
      ['cli-0000c004', 'Roberto Fassi', '5493425550143', '', '', 'activo'],
      ['cli-0000c005', 'Marta Giménez', '5493425550145', 'Urquiza 780', 'Timbre roto: llamar al llegar.', 'activo'],
      ['cli-0000c006', 'Hugo Sánchez', '5493425550141', 'Mendoza 3300', '', 'activo'],
      ['cli-0000c007', 'Lucia Benitez', '5493425559999', '', 'Posible duplicado de Lucía Benítez.', 'activo'],
      ['cli-0000c008', 'Elena Paz', '5493425551234', '', '', 'activo']
    ].map(function (c, i) { return { clienteId: c[0], nombre: c[1], telefono: c[2], direccion: c[3], nota: c[4], estado: c[5], creado: ISO(60 * 24 * (30 - i)), actualizado: ISO(60 * 24 * 2), numero: i + 1 }; });
    d.proveedores = [
      ['prov-0000d001', 'Lácteos del Litoral', 'Rosa Ocampo', '5493425550101', 'Lácteos y fiambres', 'Transferencia a 7 días'],
      ['prov-0000d002', 'Distribuidora Santa Fe', 'Andrés Cabral', '5493425550102', 'Almacén y limpieza', 'Contado'],
      ['prov-0000d003', 'Bebidas del Centro', 'Julia Fontana', '5493425550103', 'Bebidas', 'Cuenta corriente']
    ].map(function (p) { return { proveedorId: p[0], nombre: p[1], contacto: p[2], telefono: p[3], rubro: p[4], formaPago: p[5], estado: 'activo', creado: ISO(60 * 24 * 60) }; });
    d.compras = [];
    d.compraItems = [];
    var comp = function (id, num, prov, est, pago, items, dias) {
      var tot = 0;
      items.forEach(function (it, k) { var imp = rp(it[1] * it[2]); tot += imp; d.compraItems.push({ compraItemId: 'ci-' + id + k, compraId: id, productoId: it[0], cantidad: it[1], costoUnitario: it[2], importe: imp }); });
      d.compras.push({ compraId: id, numero: num, proveedorId: prov, estado: est, pago: pago, total: tot, fechaPedido: ISO(60 * 24 * dias), fechaEsperada: ISO(-60 * 24 * (est === 'Pedida' ? 2 : -1)), fechaRecibida: est === 'Recibida' ? ISO(60 * 24 * (dias - 1)) : '', stockAplicado: est === 'Recibida', creado: ISO(60 * 24 * dias) });
    };
    comp('comp-0000e001', 12, 'prov-0000d001', 'Pedida', 'Pendiente', [['prod-1a2b3c01', 8, 8200], ['prod-1a2b3c02', 24, 1350]], 1);
    comp('comp-0000e002', 11, 'prov-0000d002', 'Recibida', 'Pagado', [['prod-1a2b3c03', 12, 3100], ['prod-1a2b3c04', 48, 880]], 6);
    comp('comp-0000e003', 10, 'prov-0000d003', 'Recibida', 'Pendiente', [['prod-1a2b3c09', 24, 1900], ['prod-1a2b3c0a', 36, 980]], 9);
    comp('comp-0000e004', 9, 'prov-0000d001', 'Cancelada', 'Pendiente', [['prod-1a2b3c07', 5, 6100]], 14);
    d.usuarios = [
      { usuarioId: 'usr-0000f001', nombre: 'María Gómez', email: 'maria@donanorma.demo', rol: 'dueño/a', estado: 'activo', foto: '', ultimoIngreso: ISO(30) },
      { usuarioId: 'usr-0000f002', nombre: 'Pablo Ruiz', email: 'pablo@donanorma.demo', rol: 'encargado', estado: 'activo', foto: '', ultimoIngreso: ISO(60 * 20) },
      { usuarioId: 'usr-0000f003', nombre: 'Sofía Lema', email: 'sofia@donanorma.demo', rol: 'cajero', estado: 'activo', foto: '', ultimoIngreso: ISO(60 * 5) },
      { usuarioId: 'usr-0000f004', nombre: 'Nico Vera', email: 'nico@donanorma.demo', rol: 'cajero', estado: 'pendiente', foto: '', ultimoIngreso: '' }
    ];
    d.config = { nombreNegocio: 'Almacén Doña Norma', rubro: 'Almacén', 'marca.color': cfg.marca, 'marca.logoUrl': '', modoInstalacion: 'demo', instalacionId: 'inst-demo-0001', prospectoId: 'pros-0001', plantillaVersion: '1.0.0', vence: new Date(NOW() + cfg.dias * 864e5).toISOString(), whatsappNumero: '5493425550148', envioFijo: 1500, recargoTransferencia: 0.05, reservaStock: 'al_cerrar', webUrl: 'https://donanorma.demo/tienda' };
    d.modulos = ['inicio', 'pedidos', 'mostrador', 'productos', 'stock', 'ventas', 'clientes', 'compras', 'proveedores', 'reportes', 'ajustes', 'web'];
    d.mesas = []; d.cuentas = []; d.renglones = []; d.reservas = []; d.cfgSalon = { duracionMin: 90, noShowMin: 15, desde: '12:00', hasta: '23:00', paso: 30, diasMax: 30, autoconfirmar: false, activas: true, qrActivo: true, qrMostrarEstado: false };
    if (cfg.resto) {
      d.modulos.splice(3, 0, 'mesas', 'reservas', 'cocina'); d.config.webUrl = 'https://resto.example.com/'; d.config.variante = 'resto'; d.modulos = d.modulos.filter(function (m) { return ['stock', 'compras', 'proveedores'].indexOf(m) < 0; });
      [[1, 'Salón', 4, 'cuadrada', 14, 22], [2, 'Salón', 4, 'cuadrada', 34, 22], [3, 'Salón', 2, 'redonda', 54, 22], [4, 'Salón', 6, 'larga', 78, 24], [5, 'Salón', 4, 'redonda', 18, 62], [6, 'Salón', 8, 'larga', 50, 66],
       [7, 'Vereda', 2, 'cuadrada', 82, 60], [8, 'Vereda', 4, 'cuadrada', 86, 84]].forEach(function (m) {
        d.mesas.push({ mesaId: 'mesa-0000c0' + (10 + m[0]), numero: m[0], zona: m[1], capacidad: m[2], forma: m[3], x: m[4], y: m[5], estado: 'libre', activa: true, creado: ISO(60 * 24 * 3), actualizado: ISO(60 * 24 * 3) });
      });
    }
    d.conexion = { conexionId: 'con-0000a111', modo: 'A', estado: 'conectada', webUrl: d.config.webUrl, schemaVersion: 2, creado: ISO(60 * 24 * 10), ultimoSync: ISO(7), resultado: 'Sincronización correcta: 12 productos.' };
    d.lotes = {};
    d.vinculos = [];

    // movimientos de stock iniciales
    d.productos.forEach(function (p, i) { d.movs.push({ movId: 'mov-0000b0' + (10 + i), productoId: p.productoId, tipo: 'ajuste', cantidad: p.stockActual, stockResultante: p.stockActual, motivo: 'Stock inicial', referencia: '', usuarioId: 'usr-0000f001', creado: ISO(60 * 24 * 30) }); });
    d.movs.push({ movId: 'mov-0000b100', productoId: 'prod-1a2b3c02', tipo: 'venta', cantidad: -4, stockResultante: 2, motivo: 'Ventas del día', referencia: 'ped-seed', usuarioId: 'usr-0000f003', creado: ISO(90) });
    d.movs.push({ movId: 'mov-0000b101', productoId: 'prod-1a2b3c0c', tipo: 'salida', cantidad: -2, stockResultante: 3, motivo: 'Botellas rotas', referencia: '', usuarioId: 'usr-0000f002', creado: ISO(60 * 26) });

    // pedidos semilla (no tocan el stock actual: ya está "al día")
    var P = function (id) { return d.productos.filter(function (p) { return p.productoId === 'prod-1a2b3c' + id; })[0]; };
    function armar(num, canal, estado, cliIdx, modalidad, minAtras, pago, items, nombreLibre) {
      var cli = cliIdx == null ? null : d.clientes[cliIdx];
      var q = cotizarCrudo(d, items.map(function (x) { return { productoId: P(x[0]).productoId, cantidad: x[1] }; }), pago, modalidad, true);
      var pid = 'ped-seed-' + ('0000' + num).slice(-4);
      var ped = { pedidoId: pid, numero: num, canal: canal, estado: estado, clienteId: cli ? cli.clienteId : '', nombreCliente: cli ? cli.nombre : (nombreLibre || ''), telefono: cli ? cli.telefono : '', direccion: cli ? cli.direccion : '', modalidad: modalidad, horaPrometida: canal === 'web' ? new Date(NOW() + (estado === 'Nuevo' ? 40 : 10) * 60000).toISOString() : '', metodoPago: pago, subtotal: q.subtotal, recargo: q.recargo, envio: q.envio, total: q.total, observaciones: '', stockAplicado: estado === 'Cerrado', creadoPor: canal === 'web' ? 'web' : 'usr-0000f003', creado: ISO(minAtras), actualizado: ISO(Math.max(0, minAtras - 5)) };
      ped.items = q.lineas.map(function (l, k) { return { itemId: 'item-' + pid + k, pedidoId: pid, productoId: l.productoId, presentacionId: '', nombre: l.nombre, detalle: l.detalle, cantidad: l.cantidad, unidad: l.unidad, precioBase: l.precioBase, importe: l.importe }; });
      d.pedidosPorId[pid] = ped;
      d.aud.push({ audId: nid('aud'), creado: ISO(minAtras), usuarioId: ped.creadoPor, accion: 'pedido.crear', entidad: 'Pedidos', entidadId: pid, detalle: canal === 'web' ? 'Recibido desde la web' : 'Venta en mostrador' });
      d.aud.push({ audId: nid('aud'), creado: ISO(minAtras), usuarioId: 'sistema', accion: 'pedido.precios', entidad: 'Pedidos', entidadId: pid, detalle: 'Precios validados por el panel' });
      if (estado !== 'Nuevo') d.aud.push({ audId: nid('aud'), creado: ISO(Math.max(0, minAtras - 8)), usuarioId: 'usr-0000f002', accion: 'pedido.estado', entidad: 'Pedidos', entidadId: pid, detalle: 'Pasó a ' + estado });
    }
    armar(148, 'web', 'Nuevo', 0, 'retiro', 22, 'efectivo', [['01', 1.75], ['02', 2]]);
    armar(147, 'mostrador', 'Cerrado', null, 'local', 40, 'transferencia', [['04', 2], ['03', 1], ['0b', 1]], 'Mostrador · sin nombre');
    armar(146, 'web', 'Preparando', 1, 'retiro', 62, 'transferencia', [['01', 2.5], ['08', 3], ['09', 2]]);
    armar(145, 'web', 'Listo', 4, 'envio', 66, 'efectivo', [['07', 0.4], ['0a', 6]]);
    armar(144, 'web', 'Nuevo', 2, 'envio', 31, 'efectivo', [['02', 1], ['04', 3]]);
    armar(143, 'web', 'Nuevo', 3, 'retiro', 48, 'transferencia', [['03', 2], ['0a', 6]]);
    armar(141, 'web', 'Cancelado', 5, 'envio', 120, 'efectivo', [['09', 2], ['08', 2]]);
    var mins = [75, 90, 110, 130, 150, 175, 200, 230, 260, 290, 320];
    var packs = [[['04', 3], ['09', 1]], [['03', 1]], [['01', 0.6], ['02', 1]], [['08', 2], ['0a', 2]], [['07', 0.25]], [['0b', 2], ['0c', 1]], [['01', 1.2]], [['09', 3], ['04', 2]], [['03', 2], ['02', 2]], [['0a', 4]], [['01', 0.35], ['07', 0.3], ['08', 1]]];
    mins.forEach(function (m, i) { armar(140 - i - 1 + (i > 0 ? 0 : 0), 'mostrador', 'Cerrado', null, 'local', m, i % 3 === 0 ? 'transferencia' : (i % 3 === 1 ? 'efectivo' : 'tarjeta'), packs[i], 'Mostrador · sin nombre'); });
    return d;
  }

  // ---------------------------------------------------------------- lógica de negocio compartida
  function nivel(p) { if (p.esServicio === true) return 'ok'; var s = p.stockActual, m = p.stockMinimo; return s <= 0 ? 'sin_stock' : s <= m / 2 ? 'critico' : s <= m ? 'bajo' : 'ok'; }
  function prodVista(p) { var o = clone(p); o.presentaciones = db.presentaciones.filter(function (x) { return x.productoId === p.productoId; }); o.nivelStock = nivel(p); return o; }
  function redondearCant(q, dec) { var f = Math.pow(10, dec); return Math.round(q * f + 1e-9) / f; }

  /** Cotiza como lo haría el servidor. `crudo`=true salta validaciones de vendible/stock (solo para la semilla). */
  function cotizarCrudo(d, items, metodo, modalidad, crudo, pagoEf) {
    if (!Array.isArray(items) || !items.length) throw Err('VALIDACION', 'Agregá al menos un producto a la venta.');
    if (items.length > 40) throw Err('VALIDACION', 'Una venta puede tener hasta 40 productos.');
    var gasto = {}, lineas = [], avisosG = [], subtotal = 0;
    items.forEach(function (it, i) {
      var p = d.productos.filter(function (x) { return x.productoId === it.productoId; })[0];
      if (!p || p.estado !== 'activo') throw Err('NO_ENCONTRADO', 'Uno de los productos ya no existe. Actualizá la lista.');
      if (!crudo && p.alALaVenta === false) throw Err('VALIDACION', p.nombre + ' está pausado y no se puede vender.');
      var pres = null, q = +it.cantidad, desc, importe, unidad, precioBase, detalle = '', dec = p.decimales;
      if (it.presentacionId) {
        pres = d.presentaciones.filter(function (x) { return x.presentacionId === it.presentacionId && x.productoId === p.productoId && x.activa; })[0];
        if (!pres) throw Err('VALIDACION', 'La presentación elegida de ' + p.nombre + ' ya no está disponible.');
        dec = 0;
      }
      q = redondearCant(q, dec);
      if (!(q > 0)) throw Err('VALIDACION', 'La cantidad de ' + p.nombre + ' tiene que ser mayor a cero.');
      var paso = pres ? 1 : p.paso, r = q / paso;
      if (Math.abs(r - Math.round(r)) * paso > 1e-9) throw Err('VALIDACION', p.nombre + ' se vende de a ' + String(paso).replace('.', ',') + ' ' + p.unidadMedida + '. Ajustá la cantidad.');
      if (pres) { desc = pres.cantidadBase * q; importe = rp(pres.precio * q); unidad = 'u'; precioBase = pres.precio; detalle = pres.nombre; }
      else { desc = q; precioBase = p.precioBase; importe = rp(precioBase * q); unidad = p.unidadMedida; }
      var av = [];
      gasto[p.productoId] = (gasto[p.productoId] || 0) + desc;
      if (!crudo && p.esServicio !== true) {
        var resto = redondearCant(p.stockActual - gasto[p.productoId], 3);
        if (resto < 0) av.push('Hay solo ' + String(p.stockActual).replace('.', ',') + ' ' + p.unidadMedida + ' de ' + p.nombre + ' en stock.');
        else if (resto === 0) av.push('Con esta venta ' + p.nombre + ' queda sin stock.');
        else if (resto <= p.stockMinimo) av.push('Con esta venta ' + p.nombre + ' queda bajo el mínimo.');
      }
      subtotal += importe;
      lineas.push({ productoId: p.productoId, nombre: p.nombre, detalle: detalle, cantidad: q, unidad: unidad, precioBase: precioBase, importe: importe, avisos: av });
    });
    var efectivo = 0, recargo = 0;
    if (metodo === 'mixta') { efectivo = Number(pagoEf); if (!(efectivo > 0) || efectivo >= subtotal || efectivo !== Math.round(efectivo)) throw Err('VALIDACION', 'En el pago mixto, indicá cuánto se paga en efectivo (más de $ 0 y menos que el subtotal). El resto va por transferencia.', { pagoEfectivo: 'Monto inválido.' }); recargo = rp((subtotal - efectivo) * d.config.recargoTransferencia); }
    else if (metodo === 'transferencia') recargo = rp(subtotal * d.config.recargoTransferencia);
    var envio = modalidad === 'envio' ? d.config.envioFijo : 0;
    return { lineas: lineas, subtotal: subtotal, recargo: recargo, envio: envio, total: subtotal + recargo + envio, avisos: [], _gasto: gasto, pagoEfectivo: efectivo };
  }
  function cotizar(items, metodo, modalidad, pagoEf) {
    if (['efectivo', 'transferencia', 'mixta', 'debito', 'tarjeta'].indexOf(metodo) < 0) throw Err('VALIDACION', 'Elegí un medio de pago.', { metodoPago: 'Elegí un medio de pago.' });
    var q = cotizarCrudo(db, items, metodo, modalidad, false, pagoEf), av = [];
    q.lineas.forEach(function (l) { l.avisos.forEach(function (a) { av.push(a); }); });
    q.avisos = av; delete q._gasto; return q;
  }
  function pedidoVista(p, conItems) { var o = clone(p); if (!conItems) delete o.items; return o; }
  function aud(usr, accion, ent, id, det) { db.aud.push({ audId: nid('aud'), creado: ISO(0), usuarioId: usr.usuarioId, accion: accion, entidad: ent, entidadId: id, detalle: det }); }
  function mover(p, tipo, cant, motivo, ref, usr) {
    p.stockActual = redondearCant(p.stockActual + cant, 3); p.actualizado = ISO(0);
    var m = { movId: nid('mov'), productoId: p.productoId, tipo: tipo, cantidad: cant, stockResultante: p.stockActual, motivo: motivo, referencia: ref || '', usuarioId: usr.usuarioId, creado: ISO(0) };
    db.movs.push(m); return m;
  }
  function descuentoDeItem(it) {
    var pres = it.presentacionId ? db.presentaciones.filter(function (x) { return x.presentacionId === it.presentacionId; })[0] : null;
    return pres ? pres.cantidadBase * it.cantidad : it.cantidad;
  }
  function aplicarStock(ped, usr) {
    ped.items.forEach(function (it) { var p = db.productos.filter(function (x) { return x.productoId === it.productoId; })[0]; if (p && p.esServicio !== true) mover(p, 'venta', -descuentoDeItem(it), 'Pedido #' + ('0000' + ped.numero).slice(-4), ped.pedidoId, usr); });
    ped.stockAplicado = true;
  }
  function restituirStock(ped, usr, motivo) {
    ped.items.forEach(function (it) { var p = db.productos.filter(function (x) { return x.productoId === it.productoId; })[0]; if (p && p.esServicio !== true) mover(p, 'anulacion', descuentoDeItem(it), motivo, ped.pedidoId, usr); });
    ped.stockAplicado = false;
  }
  function pedidoObtener(id) {
    var p = db.pedidosPorId[id]; if (!p) throw Err('NO_ENCONTRADO', 'No encontramos ese pedido.');
    var o = clone(p);
    o.historial = db.aud.filter(function (a) { return a.entidadId === id; }).map(function (a) { return { creado: a.creado, texto: a.detalle }; }).sort(function (a, b) { return a.creado < b.creado ? -1 : 1; });
    o.avisos = [];
    if (p.estado === 'Nuevo' || p.estado === 'Preparando' || p.estado === 'Listo') {
      p.items.forEach(function (it) {
        var pr = db.productos.filter(function (x) { return x.productoId === it.productoId; })[0]; if (!pr) return;
        var otros = Object.keys(db.pedidosPorId).map(function (k) { return db.pedidosPorId[k]; }).filter(function (x) { return x.pedidoId !== id && ['Nuevo', 'Preparando', 'Listo'].indexOf(x.estado) > -1 && x.items.some(function (y) { return y.productoId === it.productoId; }); });
        var resto = redondearCant(pr.stockActual - descuentoDeItem(it), 3);
        if (resto < 0) o.avisos.push('No alcanza el stock de ' + pr.nombre + ': hay ' + String(pr.stockActual).replace('.', ',') + ' ' + pr.unidadMedida + ' y el pedido pide ' + String(it.cantidad).replace('.', ',') + '.');
        else if (resto === 0) o.avisos.push('Al ' + (db.config.reservaStock === 'al_aceptar' ? 'aceptar' : 'cerrar') + ' el pedido, ' + pr.nombre + ' queda sin stock.' + (otros.length ? ' Otro pedido abierto también lo pide.' : ''));
      });
    }
    return o;
  }

  // ---------------------------------------------------------------- tabla de acciones
  var A = {};
  function def(accion, permiso, fn) { A[accion] = { permiso: permiso, fn: fn }; }
  var DIA = /^\d{4}-\d{2}-\d{2}$/; /* contrato: desde/hasta son días AAAA-MM-DD, inclusivos */
  var desdeHasta = function (arr, campo, d, h) { var a = d ? Date.parse(DIA.test(d) ? d + 'T00:00:00' : d) : -Infinity, b = h ? Date.parse(DIA.test(h) ? h + 'T00:00:00' : h) + (DIA.test(h) ? 864e5 - 1 : 0) : Infinity; return arr.filter(function (x) { var t = Date.parse(x[campo]); return t >= a && t <= b; }); };
  var contiene = function (s, q) { return sinTilde(String(s || '')).toLowerCase().indexOf(sinTilde(String(q || '')).toLowerCase()) > -1; };
  var todosPedidos = function () { return Object.keys(db.pedidosPorId).map(function (k) { return db.pedidosPorId[k]; }).sort(function (a, b) { return b.numero - a.numero; }); };

  // sesión / usuarios
  def('sesion.yo', null, function (u) { return sesion(u, false); });
  def('logout', null, function () { return {}; });
  def('usuarios.listar', 'usuarios:ver', function () { return clone(db.usuarios); });
  var FOTO_RE = /^data:image\/(jpeg|png|webp);base64,[A-Za-z0-9+\/=]+$/;
  var mismoNombre = function (n, ex) { var k = sinTilde(String(n || '')).toLowerCase().replace(/\s+/g, ' ').trim(); return db.usuarios.some(function (y) { return y.usuarioId !== ex && sinTilde(y.nombre).toLowerCase().replace(/\s+/g, ' ').trim() === k; }); };
  var codigoNuevo = function () { var ALF = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789', cod = ''; for (var q = 0; q < 12; q++) cod += ALF[Math.floor(Math.random() * ALF.length)]; return cod.slice(0, 4) + '-' + cod.slice(4, 8) + '-' + cod.slice(8, 12); }; /* mismo formato que Seguridad.gs */
  def('usuarios.invitar', 'usuarios:total', function (u, p) {
    var em = String(p.email || '').trim().toLowerCase();
    if (!p.nombre) throw Err('VALIDACION', 'Poné el nombre de la persona.', { nombre: 'Falta el nombre.' });
    if (em && !/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(em)) throw Err('VALIDACION', 'Revisá el email (o dejalo vacío).', { email: 'Revisá el email.' });
    if (['dueño/a', 'encargado', 'cajero'].indexOf(p.rol) < 0) throw Err('VALIDACION', 'Elegí un rol.');
    if (p.foto && !FOTO_RE.test(p.foto)) throw Err('VALIDACION', 'La foto no sirve: probá con otra.', { foto: 'No sirve.' });
    if (mismoNombre(p.nombre, null)) throw Err('CONFLICTO', 'Ya hay una persona con ese nombre. Agregale el apellido o una inicial para distinguirlas.', { nombre: 'Ya existe.' });
    var n = { usuarioId: nid('usr'), nombre: String(p.nombre).trim(), email: em, rol: p.rol, genero: p.genero || '', estado: 'pendiente', foto: p.foto || '', ultimoIngreso: '' }; db.usuarios.push(n);
    return { usuarioId: n.usuarioId, codigoInvitacion: codigoNuevo() };
  });
  def('usuarios.editarDatos', 'usuarios:total', function (u, p) {
    if (!p.clave || p.clave === 'mal') throw Err('VALIDACION', 'Tu contraseña no es correcta.', { clave: 'No es correcta.' });
    var x = buscar(db.usuarios, 'usuarioId', p.usuarioId, 'usuario'), em = String(p.email || '').trim().toLowerCase();
    if (!p.nombre || (em && !/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(em))) throw Err('VALIDACION', 'Revisá el nombre y el email.', { email: 'Revisá el email.' });
    if (p.foto && !FOTO_RE.test(p.foto)) throw Err('VALIDACION', 'La foto no sirve: probá con otra.', { foto: 'No sirve.' });
    if (em && db.usuarios.some(function (y) { return y.usuarioId !== x.usuarioId && String(y.email).toLowerCase() === em; })) throw Err('CONFLICTO', 'Ya hay otra persona con ese email.', { email: 'Ya está en uso.' });
    if (mismoNombre(p.nombre, x.usuarioId)) throw Err('CONFLICTO', 'Ya hay una persona con ese nombre. Agregale el apellido o una inicial.', { nombre: 'Ya existe.' });
    x.nombre = String(p.nombre).trim(); x.email = em; if (p.genero !== undefined) x.genero = p.genero; if (p.foto !== undefined) x.foto = p.foto || ''; return clone(x);
  });
  def('usuarios.regenerarInvitacion', 'usuarios:total', function (u, p) {
    if (!p.clave || p.clave === 'mal') throw Err('VALIDACION', 'Tu contraseña no es correcta.', { clave: 'No es correcta.' });
    var x = buscar(db.usuarios, 'usuarioId', p.usuarioId, 'usuario');
    if (x.usuarioId === u.usuarioId) throw Err('CONFLICTO', 'Para cambiar tu propia contraseña usá "Cambiar mi contraseña".');
    if (x.estado === 'suspendido') throw Err('CONFLICTO', 'Esa persona está suspendida. Reactivala primero.');
    x.estado = 'pendiente'; return { usuarioId: x.usuarioId, codigoInvitacion: codigoNuevo() };
  });
  def('usuarios.cambiarRol', 'usuarios:total', function (u, p) { var x = buscar(db.usuarios, 'usuarioId', p.usuarioId, 'usuario'); x.rol = p.rol; return clone(x); });
  def('usuarios.suspender', 'usuarios:total', function (u, p) { var x = buscar(db.usuarios, 'usuarioId', p.usuarioId, 'usuario'); x.estado = 'suspendido'; return clone(x); });
  def('usuarios.reactivar', 'usuarios:total', function (u, p) { var x = buscar(db.usuarios, 'usuarioId', p.usuarioId, 'usuario'); x.estado = 'activo'; return clone(x); });
  def('usuarios.cambiarMiClave', null, function (u, p) {
    if (!p.nueva || p.nueva.length < 10) throw Err('VALIDACION', 'La contraseña nueva tiene que tener al menos 10 caracteres.', { nueva: 'Mínimo 10 caracteres.' });
    return {};
  });
  def('usuarios.matrizPermisos', 'usuarios:ver', function () { return { roles: ['dueño/a', 'encargado', 'cajero'], modulos: MODS_PERM.slice(), permisos: clone(MATRIZ) }; });
  // demo (solo instalaciones demo, solo la dueña)
  var demoVacia = false;
  def('demo.estado', 'ajustes:total', function () { return { demo: cfg.demo, vacia: demoVacia, vence: db.config.vence, conProductos: true, hayActividad: !demoVacia }; });
  def('demo.cargarActividad', 'ajustes:total', function (u, p) {
    if (!cfg.demo) throw Err('CONFLICTO', 'Solo se puede hacer en una instalación DEMO.');
    if (!demoVacia && String(p.confirmacion || '').trim().toUpperCase() !== 'REHACER') throw Err('VALIDACION', 'Escribí REHACER para confirmar.', { confirmacion: 'Escribí REHACER para confirmar.' });
    return { productos: 79, ventasMostrador: 61, pedidosWeb: 19, compras: 6, clientes: 14, proveedores: 4, stockBajo: 5, invitaciones: [] };
  });
  def('demo.cargar', 'ajustes:total', function () { if (!cfg.demo) throw Err('CONFLICTO', 'Solo se puede hacer en una instalación DEMO.'); if (!demoVacia) throw Err('CONFLICTO', 'La demo ya tiene datos.'); demoVacia = false; return { negocio: db.config.nombreNegocio, invitaciones: [{ email: 'pablo@donanorma.demo', rol: 'encargado', codigoInvitacion: 'AAAA-BBBB-CCCC' }] }; });
  def('demo.reiniciar', 'ajustes:total', function (u, p) {
    if (String(p.confirmacion || '').trim().toUpperCase() !== 'REINICIAR') throw Err('VALIDACION', 'Escribí REINICIAR para confirmar.', { confirmacion: 'Escribí REINICIAR para confirmar.' });
    demoVacia = false; return { negocio: db.config.nombreNegocio, invitaciones: [{ email: 'pablo@donanorma.demo', rol: 'encargado', codigoInvitacion: 'DDDD-EEEE-FFFF' }, { email: 'sofia@donanorma.demo', rol: 'cajero', codigoInvitacion: 'GGGG-HHHH-JJJJ' }] };
  });
  // config
  def('config.obtener', null, function () { var c = clone(db.config); delete c.salt_sesion; return c; });
  def('config.guardar', 'ajustes:total', function (u, p) {
    var ok = ['nombreNegocio', 'marca.color', 'marca.logoUrl', 'marca.logoData', 'whatsappNumero', 'envioFijo', 'recargoTransferencia', 'reservaStock', 'permiteSaltar', 'loginTarjetas', 'rubro'];
    if (p['marca.color'] != null && !/^#[0-9a-f]{6}$/i.test(p['marca.color'])) throw Err('VALIDACION', 'El color tiene que ser un código como #4F6B2E.', { 'marca.color': 'Código de color inválido.' });
    ok.forEach(function (k) { if (p[k] !== undefined) db.config[k] = p[k]; });
    aud(u, 'config.guardar', 'Config', 'config', Object.keys(p).join(', '));
    var c = clone(db.config); delete c.salt_sesion; return c;
  });
  def('config.modulos', 'ajustes:ver', function () {
    var nombres = { inicio: 'Resumen', pedidos: 'Pedidos', mostrador: 'Mostrador', productos: 'Productos', stock: 'Stock', ventas: 'Ventas', clientes: 'Clientes', compras: 'Compras', proveedores: 'Proveedores', reportes: 'Reportes', ajustes: 'Usuarios y ajustes', web: 'Conexión con la web' };
    nombres.mesas = 'Mesas'; nombres.reservas = 'Reservas'; nombres.cocina = 'Cocina';
    return Object.keys(nombres).filter(function (k) { return (k !== 'mesas' && k !== 'reservas' && k !== 'cocina') || db.modulos.indexOf(k) > -1; }).map(function (k) { return { id: k, nombre: nombres[k], habilitado: db.modulos.indexOf(k) > -1 }; });
  });
  // productos
  def('productos.listar', 'productos:ver', function (u, p) {
    p = p || {};
    return db.productos.filter(function (x) {
      if ((p.estado || 'activo') !== 'todos' && x.estado !== (p.estado || 'activo')) return false;
      if (p.categoria && x.categoria !== p.categoria) return false;
      if (p.q && !contiene(x.nombre, p.q)) return false;
      if (p.soloAlerta && nivel(x) === 'ok') return false;
      return true;
    }).map(prodVista);
  });
  def('productos.obtener', 'productos:ver', function (u, p) { return prodVista(buscar(db.productos, 'productoId', p.productoId, 'producto')); });
  def('productos.categorias', 'productos:ver', function () { var s = {}; db.productos.forEach(function (x) { s[x.categoria] = 1; }); return Object.keys(s).sort(); });
  def('productos.crear', 'productos:total', function (u, p) {
    var campos = {};
    if (!p.nombre || !String(p.nombre).trim()) campos.nombre = 'Poné un nombre.';
    if (!p.categoria) campos.categoria = 'Elegí una categoría.';
    if (!(+p.precioBase >= 0) || p.precioBase === '' || p.precioBase == null) campos.precioBase = 'Poné un precio.';
    if (['unidad', 'peso', 'volumen'].indexOf(p.unidadVenta) < 0) campos.unidadVenta = 'Elegí cómo se vende.';
    if (Object.keys(campos).length) throw Err('VALIDACION', 'Revisá los datos del producto.', campos);
    var slug = kebab(p.nombre), base = slug, k = 2; while (db.productos.some(function (x) { return x.slugWeb === slug; })) slug = base + '-' + (k++);
    var n = { productoId: nid('prod'), slugWeb: slug, nombre: String(p.nombre).trim().slice(0, 120), categoria: p.categoria, descripcion: (p.descripcion || '').slice(0, 600), imagenUrl: p.imagenUrl || '', unidadVenta: p.unidadVenta, unidadMedida: p.unidadMedida || 'u', paso: +p.paso || 1, decimales: +p.decimales || 0, precioBase: rp(+p.precioBase), stockActual: 0, stockMinimo: p.esServicio === true ? 0 : (+p.stockMinimo || 0), esServicio: p.esServicio === true, alALaVenta: p.alALaVenta !== false, estado: 'activo', origen: 'panel', creado: ISO(0), actualizado: ISO(0) };
    db.productos.push(n);
    (p.presentaciones || []).forEach(function (x) { db.presentaciones.push({ presentacionId: nid('pres'), productoId: n.productoId, nombre: x.nombre, cantidadBase: +x.cantidadBase, precio: rp(+x.precio), activa: true }); });
    if (+p.stockActual > 0 && p.esServicio !== true) mover(n, 'ajuste', +p.stockActual, 'Stock inicial', '', u);
    aud(u, 'productos.crear', 'Productos', n.productoId, n.nombre);
    return prodVista(n);
  });
  def('productos.subirImagen', 'productos:total', function (u, p) { return { url: p.imagen, id: 'falso', bytes: String(p.imagen || '').length }; });
  def('productos.actualizar', 'productos:total', function (u, p) {
    var x = buscar(db.productos, 'productoId', p.productoId, 'producto');
    ['nombre', 'categoria', 'descripcion', 'imagenUrl', 'unidadVenta', 'unidadMedida', 'paso', 'decimales', 'precioBase', 'stockMinimo', 'alALaVenta', 'esServicio'].forEach(function (k) { if (p[k] !== undefined) x[k] = p[k]; });
    if (p.presentaciones) { db.presentaciones = db.presentaciones.filter(function (y) { return y.productoId !== x.productoId; }); p.presentaciones.forEach(function (y) { db.presentaciones.push({ presentacionId: y.presentacionId || nid('pres'), productoId: x.productoId, nombre: y.nombre, cantidadBase: +y.cantidadBase, precio: rp(+y.precio), activa: y.activa !== false }); }); }
    x.actualizado = ISO(0); aud(u, 'productos.actualizar', 'Productos', x.productoId, x.nombre); return prodVista(x);
  });
  def('productos.cambiarDisponibilidad', 'productos:total', function (u, p) { var x = buscar(db.productos, 'productoId', p.productoId, 'producto'); x.alALaVenta = !!p.alALaVenta; x.actualizado = ISO(0); aud(u, 'productos.disponibilidad', 'Productos', x.productoId, x.alALaVenta ? 'A la venta' : 'Pausado'); return prodVista(x); });
  def('productos.archivar', 'productos:total', function (u, p) { var x = buscar(db.productos, 'productoId', p.productoId, 'producto'); x.estado = 'archivado'; aud(u, 'productos.archivar', 'Productos', x.productoId, x.nombre); return prodVista(x); });
  def('productos.restaurar', 'productos:total', function (u, p) { var x = buscar(db.productos, 'productoId', p.productoId, 'producto'); x.estado = 'activo'; return prodVista(x); });
  // stock
  def('stock.resumen', 'stock:ver', function () {
    var r = { sinStock: 0, criticos: 0, bajos: 0, ok: 0, productosParaReponer: [] };
    db.productos.filter(function (x) { return x.estado === 'activo'; }).forEach(function (x) { var n = nivel(x); if (n === 'sin_stock') r.sinStock++; else if (n === 'critico') r.criticos++; else if (n === 'bajo') r.bajos++; else r.ok++; if (n !== 'ok') r.productosParaReponer.push(prodVista(x)); });
    var orden = { sin_stock: 0, critico: 1, bajo: 2 }; r.productosParaReponer.sort(function (a, b) { return orden[a.nivelStock] - orden[b.nivelStock]; });
    return r;
  });
  def('stock.movimientos', 'stock:ver', function (u, p) {
    p = p || {}; var r = db.movs.filter(function (m) { return (!p.productoId || m.productoId === p.productoId) && (!p.tipo || m.tipo === p.tipo); });
    r = desdeHasta(r, 'creado', p.desde, p.hasta).sort(function (a, b) { return a.creado < b.creado ? 1 : -1; }).slice(0, p.limite || 200);
    return r.map(function (m) { var o = clone(m); var pr = db.productos.filter(function (x) { return x.productoId === m.productoId; })[0]; o.productoNombre = pr ? pr.nombre : ''; return o; });
  });
  def('stock.ajustar', 'stock:total', function (u, p) {
    var x = buscar(db.productos, 'productoId', p.productoId, 'producto'), c = +p.cantidad;
    if (['entrada', 'salida', 'ajuste'].indexOf(p.tipo) < 0) throw Err('VALIDACION', 'Elegí el tipo de movimiento.');
    if (!p.motivo || !String(p.motivo).trim()) throw Err('VALIDACION', 'Contanos el motivo del movimiento.', { motivo: 'El motivo es obligatorio.' });
    if (p.tipo === 'ajuste' && p.stockContado != null && p.stockContado !== '') c = redondearCant(+p.stockContado - x.stockActual, 3);
    else if (p.tipo === 'salida') c = -Math.abs(c); else if (p.tipo === 'entrada') c = Math.abs(c);
    if (!c && p.tipo !== 'ajuste') throw Err('VALIDACION', 'La cantidad tiene que ser distinta de cero.', { cantidad: 'Poné una cantidad.' });
    if (x.stockActual + c < -1e-9) throw Err('STOCK_INSUFICIENTE', 'No hay stock suficiente: hoy hay ' + String(x.stockActual).replace('.', ',') + ' ' + x.unidadMedida + '.');
    var m = mover(x, p.tipo, c, String(p.motivo).slice(0, 160), '', u); aud(u, 'stock.ajustar', 'Productos', x.productoId, p.tipo + ' ' + c);
    return { producto: prodVista(x), movimiento: clone(m) };
  });
  // pedidos / mostrador
  def('pedidos.listar', 'pedidos:ver', function (u, p) {
    p = p || {}; var r = todosPedidos();
    r = desdeHasta(r, 'creado', p.desde, p.hasta).filter(function (x) { return (!p.estado || x.estado === p.estado) && (!p.canal || x.canal === p.canal) && (!p.q || contiene(x.nombreCliente, p.q) || contiene(x.telefono, p.q) || contiene(('0000' + x.numero).slice(-4), String(p.q).replace('#', ''))); });
    return r.map(function (x) { return pedidoVista(x, true); });
  });
  def('pedidos.novedades', 'pedidos:ver', function (u) {
    var web = todosPedidos().filter(function (x) { return x.canal === 'web'; }), ult = 0, nuevos = [];
    web.forEach(function (x) { if (x.numero > ult) ult = x.numero; if (x.estado === 'Nuevo') nuevos.push({ numero: x.numero, nombreCliente: x.nombreCliente, total: x.total }); });
    nuevos.sort(function (a, b) { return b.numero - a.numero; });
    return { ultimo: ult, pendientes: nuevos.length, nuevos: nuevos.slice(0, 10) };
  });
  def('pedidos.obtener', 'pedidos:ver', function (u, p) { return pedidoObtener(p.pedidoId); });
  var TRANS = { Nuevo: ['Preparando', 'Cancelado'], Preparando: ['Listo', 'Cancelado'], Listo: ['Cerrado', 'Cancelado'], Cerrado: ['Anulado'] };
  function cambiarEstado(u, p, esVenta) {
    var x = db.pedidosPorId[p.pedidoId]; if (!x) throw Err('NO_ENCONTRADO', 'No encontramos ese pedido.');
    if (x.estado === p.estado) return pedidoObtener(x.pedidoId);       // idempotente
    if ((TRANS[x.estado] || []).indexOf(p.estado) < 0) throw Err('VALIDACION', 'Este pedido está ' + x.estado.toLowerCase() + ' y no puede pasar a ' + p.estado.toLowerCase() + '.');
    if (p.estado === 'Anulado') {
      if (!puede(u.rol, 'ventas:total')) throw Err('SIN_PERMISO', 'Solo la dueña puede anular una venta.');
      if (!p.motivo || !String(p.motivo).trim()) throw Err('VALIDACION', 'Contanos por qué se anula la venta.', { motivo: 'El motivo es obligatorio.' });
    }
    var reserva = db.config.reservaStock;
    if (p.estado === 'Cerrado' && !x.stockAplicado) {
      for (var i = 0; i < x.items.length; i++) { var pr = db.productos.filter(function (y) { return y.productoId === x.items[i].productoId; })[0]; if (pr && pr.stockActual - descuentoDeItem(x.items[i]) < -1e-9) throw Err('STOCK_INSUFICIENTE', 'No alcanza el stock de ' + pr.nombre + ' para cerrar este pedido.'); }
      aplicarStock(x, u);
    }
    if (p.estado === 'Preparando' && reserva === 'al_aceptar' && !x.stockAplicado) aplicarStock(x, u);
    if ((p.estado === 'Cancelado' || p.estado === 'Anulado') && x.stockAplicado) restituirStock(x, u, p.estado === 'Anulado' ? 'Anulación: ' + p.motivo : 'Pedido cancelado');
    x.estado = p.estado; x.actualizado = ISO(0);
    aud(u, 'pedido.estado', 'Pedidos', x.pedidoId, 'Pasó a ' + p.estado + (p.motivo ? ' · ' + String(p.motivo).slice(0, 160) : '') + ' (' + u.nombre + ')');
    return pedidoObtener(x.pedidoId);
  }
  def('pedidos.cambiarEstado', 'pedidos:total', function (u, p) { return cambiarEstado(u, p); });
  def('mostrador.catalogo', 'mostrador:ver', function (u, p) {
    p = p || {};
    return db.productos.filter(function (x) { return x.estado === 'activo' && (!p.categoria || x.categoria === p.categoria) && (!p.q || contiene(x.nombre, p.q)); })
      .sort(function (a, b) { return a.nombre < b.nombre ? -1 : 1; })
      .map(function (x) { var o = prodVista(x); var sv = x.esServicio === true; o.vendible = x.alALaVenta !== false && (sv || x.stockActual > 0); o.motivoNoVendible = x.alALaVenta === false ? 'Pausado en venta' : (!sv && x.stockActual <= 0) ? 'Sin stock' : ''; return o; });
  });
  def('mostrador.cotizar', 'mostrador:total', function (u, p) { return cotizar(p.items, p.metodoPago, p.modalidad, p.pagoEfectivo); });
  def('mostrador.confirmar', 'mostrador:total', function (u, p) {
    if (!/^[A-Za-z0-9_-]{8,64}$/.test(p.pedidoId || '')) throw Err('VALIDACION', 'No pudimos identificar la venta. Probá de nuevo.');
    var previo = db.pedidosPorId[p.pedidoId];
    if (previo) { var r0 = pedidoObtener(p.pedidoId); return { pedido: r0, duplicado: true }; }
    var q = cotizar(p.items, p.metodoPago, 'local', p.pagoEfectivo);
    var faltan = q.lineas.filter(function (l) { return l.avisos.some(function (a) { return a.indexOf('Hay solo') === 0; }); });
    if (faltan.length) throw Err('STOCK_INSUFICIENTE', faltan[0].avisos[0] + ' Bajá la cantidad y probá de nuevo.');
    var cli = p.clienteId ? db.clientes.filter(function (c) { return c.clienteId === p.clienteId; })[0] : null, c2 = p.cliente || {};
    if (!cli && c2.telefono && normTel(c2.telefono)) { var tt = normTel(c2.telefono); cli = db.clientes.filter(function (c) { return c.telefono === tt; })[0]; if (!cli) { cli = { clienteId: nid('cli'), nombre: String(c2.nombre || 'Sin nombre').slice(0, 120), telefono: tt, direccion: '', nota: '', estado: 'activo', creado: ISO(0), actualizado: ISO(0), numero: sigNumCliente() }; db.clientes.push(cli); } }
    var ped = { pedidoId: p.pedidoId, numero: ++db.corr, canal: 'mostrador', estado: 'Cerrado', clienteId: cli ? cli.clienteId : '', nombreCliente: cli ? cli.nombre : String(c2.nombre || '').slice(0, 120), telefono: cli ? cli.telefono : String(c2.telefono || '').slice(0, 24), direccion: '', modalidad: 'local', horaPrometida: '', metodoPago: p.metodoPago, pagoEfectivo: q.pagoEfectivo || 0, subtotal: q.subtotal, recargo: q.recargo, envio: 0, total: q.total, observaciones: String(p.observaciones || '').slice(0, 400), stockAplicado: false, creadoPor: u.usuarioId, creado: ISO(0), actualizado: ISO(0) };
    ped.items = q.lineas.map(function (l, k) { var it = p.items[k]; return { itemId: nid('item'), pedidoId: ped.pedidoId, productoId: l.productoId, presentacionId: it.presentacionId || '', nombre: l.nombre, detalle: l.detalle, cantidad: l.cantidad, unidad: l.unidad, precioBase: l.precioBase, importe: l.importe }; });
    db.pedidosPorId[ped.pedidoId] = ped; aplicarStock(ped, u);
    aud(u, 'pedido.crear', 'Pedidos', ped.pedidoId, 'Venta en mostrador (' + u.nombre + ')');
    return { pedido: pedidoObtener(ped.pedidoId) };
  });
  // mesas (variante Restó) — refleja Mesas.gs
  var mesaDe = function (id) { var m = db.mesas.filter(function (x) { return x.mesaId === id && x.activa; })[0]; if (!m) throw Err('NO_ENCONTRADO', 'No encontramos esa mesa.'); return m; };
  var cuentaAb = function (mesaId) { return db.cuentas.filter(function (c) { return c.mesaId === mesaId && c.estado === 'abierta'; })[0] || null; };
  var rengDe = function (cid) { return db.renglones.filter(function (r) { return r.cuentaId === cid; }); };
  var subR = function (l) { return l.reduce(function (s2, r) { return s2 + r.importe; }, 0); };
  var detMesa = function (id) { var m = mesaDe(id), c = cuentaAb(id), r = c ? rengDe(c.cuentaId) : []; return { mesa: clone(m), cuenta: c ? Object.assign(clone(c), { subtotal: subR(r) }) : null, renglones: clone(r) }; };
  var noCajero = function (u) { if (u.rol === 'cajero') throw Err('SIN_PERMISO', 'Armar el plano de mesas lo hace quien encarga o administra el local.'); };
  def('mesas.listar', 'mesas:ver', function () {
    var ms = db.mesas.filter(function (m) { return m.activa; }).sort(function (a, b) { return a.numero - b.numero; }).map(function (m) {
      var c = cuentaAb(m.mesaId), o = clone(m); o.qr = !!m.token; delete o.token; o.reserva = null; if (!c) { var a2 = ahoraL(); var rv = db.reservas.filter(function (r) { return r.mesaId === m.mesaId && r.fecha === a2.fecha && (r.estado === 'pendiente' || r.estado === 'confirmada') && aMin(r.hora) - a2.min <= 90 && aMin(r.hora) + 15 >= a2.min; })[0]; if (rv) o.reserva = { reservaId: rv.reservaId, nombre: rv.nombre, hora: rv.hora, personas: rv.personas, estado: rv.estado }; } o.cuenta = c ? { cuentaId: c.cuentaId, personas: c.personas, nota: '', abierta: c.abierta, renglones: rengDe(c.cuentaId).length, subtotal: subR(rengDe(c.cuentaId)) } : null; return o; });
    var zs = []; ms.forEach(function (m) { if (zs.indexOf(m.zona) < 0) zs.push(m.zona); });
    return { mesas: ms, zonas: zs, estados: ['libre', 'reservada', 'ocupada', 'llamo', 'pidio_carta', 'pidio_cuenta'], formas: ['cuadrada', 'redonda', 'larga'] };
  });
  def('mesas.obtener', 'mesas:ver', function (u, p) { return detMesa(p.mesaId); });
  def('mesas.carta', 'mesas:ver', function (u, p) { return A['mostrador.catalogo'].fn(u, p); });
  def('mesas.guardar', 'mesas:total', function (u, p) {
    noCajero(u);
    var num = Number(p.numero), cap = Number(p.capacidad), campos = {};
    if (!(num >= 1 && num <= 999 && num === Math.round(num))) campos.numero = 'El número de mesa tiene que ser un entero de 1 a 999.';
    if (!(cap >= 1 && cap <= 40 && cap === Math.round(cap))) campos.capacidad = 'La capacidad tiene que ser de 1 a 40 personas.';
    if (Object.keys(campos).length) throw Err('VALIDACION', 'Revisá los datos marcados y probá de nuevo.', campos);
    var m = p.mesaId ? mesaDe(p.mesaId) : null;
    if (db.mesas.some(function (x) { return x.activa && x.numero === num && (!m || x.mesaId !== m.mesaId); })) throw Err('CONFLICTO', 'Ya hay una mesa con el número ' + num + '.', { numero: 'Ese número ya está en uso.' });
    if (!m) { m = { mesaId: p.nuevoId || nid('mesa'), estado: 'libre', activa: true, creado: ISO(0), x: p.x == null ? 50 : p.x, y: p.y == null ? 50 : p.y }; db.mesas.push(m); }
    m.numero = num; m.zona = String(p.zona || 'Salón').slice(0, 40) || 'Salón'; m.capacidad = cap; m.forma = p.forma || m.forma || 'cuadrada'; m.actualizado = ISO(0);
    if (p.mesaId == null) { m.x = p.x == null ? m.x : p.x; m.y = p.y == null ? m.y : p.y; }
    return clone(m);
  });
  def('mesas.posiciones', 'mesas:total', function (u, p) { noCajero(u); (p.posiciones || []).forEach(function (q) { var m = mesaDe(q.mesaId); m.x = q.x; m.y = q.y; }); return { guardadas: (p.posiciones || []).length }; });
  def('mesas.archivar', 'mesas:total', function (u, p) { noCajero(u); var m = mesaDe(p.mesaId); if (cuentaAb(m.mesaId)) throw Err('CONFLICTO', 'La mesa tiene una cuenta abierta. Cobrala o cancelala antes de quitar la mesa.'); m.activa = false; return { mesaId: m.mesaId }; });
  def('mesas.estado', 'mesas:total', function (u, p) {
    var m = mesaDe(p.mesaId), c = cuentaAb(m.mesaId);
    if (p.estado === 'libre' && c && rengDe(c.cuentaId).length) throw Err('CONFLICTO', 'La mesa tiene pedidos cargados. Cobrá la cuenta o cancelala para liberarla.');
    if (p.estado === 'libre' && c) c.estado = 'cancelada';
    m.estado = p.estado; return detMesa(m.mesaId);
  });
  def('mesas.abrirCuenta', 'mesas:total', function (u, p) {
    var m = mesaDe(p.mesaId); if (!cuentaAb(m.mesaId)) { db.cuentas.push({ cuentaId: p.cuentaId || nid('cta'), mesaId: m.mesaId, estado: 'abierta', personas: Number(p.personas) || 0, nota: '', abierta: ISO(0), cerrada: '', abiertaPor: u.usuarioId, pedidoId: '' }); m.estado = 'ocupada'; }
    return detMesa(m.mesaId);
  });
  def('mesas.agregar', 'mesas:total', function (u, p) {
    var c = db.cuentas.filter(function (x) { return x.cuentaId === p.cuentaId; })[0]; if (!c) throw Err('NO_ENCONTRADO', 'No encontramos esa cuenta.'); if (c.estado !== 'abierta') throw Err('CONFLICTO', 'Esa cuenta ya está cerrada.');
    var avisos = [];
    (p.items || []).forEach(function (it) {
      if (db.renglones.some(function (r) { return r.cuentaItemId === it.cuentaItemId; })) return;
      var q = cotizar([{ productoId: it.productoId, presentacionId: it.presentacionId, cantidad: it.cantidad }], 'efectivo', 'local'), l = q.lineas[0], pr = db.productos.filter(function (x) { return x.productoId === l.productoId; })[0];
      q.avisos.forEach(function (a) { if (avisos.indexOf(a) < 0) avisos.push(a); });
      db.renglones.push({ cuentaItemId: it.cuentaItemId || nid('rgl'), cuentaId: c.cuentaId, productoId: l.productoId, presentacionId: it.presentacionId || '', nombre: l.nombre, detalle: l.detalle || String(l.cantidad), cantidad: l.cantidad, unidad: l.unidad, precioBase: l.precioBase, importe: l.importe, nota: String(it.nota || '').slice(0, 120), estacion: (pr && pr.estacion) || '', creado: ISO(0), creadoPor: u.usuarioId, origen: 'mozo', estadoCocina: (pr && pr.estacion) ? 'nuevo' : 'entregado', cocinaActualizado: ISO(0) });
    });
    var d = detMesa(c.mesaId); d.avisos = avisos; return d;
  });
  def('mesas.quitar', 'mesas:total', function (u, p) {
    var r = db.renglones.filter(function (x) { return x.cuentaItemId === p.cuentaItemId; })[0]; if (!r) throw Err('NO_ENCONTRADO', 'No encontramos ese renglón.');
    var c = db.cuentas.filter(function (x) { return x.cuentaId === r.cuentaId; })[0]; db.renglones = db.renglones.filter(function (x) { return x !== r; }); return detMesa(c.mesaId);
  });
  def('mesas.cancelarCuenta', 'mesas:total', function (u, p) {
    var c = db.cuentas.filter(function (x) { return x.cuentaId === p.cuentaId; })[0]; if (!c) throw Err('NO_ENCONTRADO', 'No encontramos esa cuenta.');
    if (c.estado === 'abierta') { if (rengDe(c.cuentaId).length && u.rol === 'cajero') throw Err('SIN_PERMISO', 'Cancelar una cuenta con pedidos lo hace quien encarga o administra el local.'); c.estado = 'cancelada'; mesaDe(c.mesaId).estado = 'libre'; }
    return detMesa(c.mesaId);
  });
  var itemsCuenta = function (cid) { var r = rengDe(cid); if (!r.length) throw Err('VALIDACION', 'La cuenta todavía no tiene pedidos.'); return r.map(function (x) { return { productoId: x.productoId, presentacionId: x.presentacionId, cantidad: x.cantidad }; }); };
  var propinaDe = function (v) { var n = Number(v || 0); if (!(n >= 0) || n !== Math.round(n)) throw Err('VALIDACION', 'La propina tiene que ser un monto en pesos, sin centavos.', { propina: 'Monto inválido.' }); return n; };
  def('mesas.cotizar', 'mesas:total', function (u, p) {
    var c = db.cuentas.filter(function (x) { return x.cuentaId === p.cuentaId; })[0]; if (!c) throw Err('NO_ENCONTRADO', 'No encontramos esa cuenta.');
    var q = cotizar(itemsCuenta(c.cuentaId), p.metodoPago, 'local', p.pagoEfectivo), pr = propinaDe(p.propina);
    return { subtotal: q.subtotal, recargo: q.recargo, total: q.total, propina: pr, totalConPropina: q.total + pr, pagoEfectivo: q.pagoEfectivo, avisos: q.avisos };
  });
  def('mesas.cobrar', 'mesas:total', function (u, p) {
    if (!/^[A-Za-z0-9_-]{8,64}$/.test(p.pedidoId || '')) throw Err('VALIDACION', 'Falta el identificador de la venta. Recargá la pantalla y probá de nuevo.');
    var c = db.cuentas.filter(function (x) { return x.cuentaId === p.cuentaId; })[0]; if (!c) throw Err('NO_ENCONTRADO', 'No encontramos esa cuenta.');
    if (c.estado === 'cobrada') { if (c.pedidoId !== p.pedidoId) throw Err('CONFLICTO', 'Esa cuenta ya fue cobrada.'); return { pedido: pedidoObtener(p.pedidoId), mesa: clone(db.mesas.filter(function (m) { return m.mesaId === c.mesaId; })[0]), duplicado: true }; }
    var m = mesaDe(c.mesaId), items = itemsCuenta(c.cuentaId), q = cotizar(items, p.metodoPago, 'local', p.pagoEfectivo), pr = propinaDe(p.propina);
    var faltan = q.lineas.filter(function (l) { return l.avisos.some(function (a) { return a.indexOf('Hay solo') === 0; }); });
    if (faltan.length) throw Err('STOCK_INSUFICIENTE', faltan[0].avisos[0] + ' Quitá ese pedido de la cuenta y probá de nuevo.');
    var c2 = p.cliente || {}, tt = c2.telefono ? normTel(c2.telefono) : '', cli = null;
    if (tt) { cli = db.clientes.filter(function (x) { return x.telefono === tt; })[0]; if (!cli) { cli = { clienteId: nid('cli'), nombre: String(c2.nombre || 'Sin nombre').slice(0, 120), telefono: tt, direccion: '', nota: '', estado: 'activo', creado: ISO(0), actualizado: ISO(0), numero: sigNumCliente() }; db.clientes.push(cli); } }
    var ped = { pedidoId: p.pedidoId, numero: ++db.corr, canal: 'mesa', estado: 'Cerrado', clienteId: cli ? cli.clienteId : '', nombreCliente: cli ? cli.nombre : (String(c2.nombre || '').trim() || 'Mesa ' + m.numero), telefono: tt, direccion: '', modalidad: 'local', horaPrometida: '', metodoPago: p.metodoPago, subtotal: q.subtotal, recargo: q.recargo, envio: 0, total: q.total, observaciones: 'Mesa ' + m.numero, stockAplicado: false, creadoPor: u.usuarioId, creado: ISO(0), actualizado: ISO(0), pagoEfectivo: q.pagoEfectivo || 0, mesa: String(m.numero), propina: pr };
    ped.items = q.lineas.map(function (l, k) { var it = items[k]; return { itemId: nid('item'), pedidoId: ped.pedidoId, productoId: l.productoId, presentacionId: it.presentacionId || '', nombre: l.nombre, detalle: l.detalle, cantidad: l.cantidad, unidad: l.unidad, precioBase: l.precioBase, importe: l.importe }; });
    db.pedidosPorId[ped.pedidoId] = ped; aplicarStock(ped, u);
    c.estado = 'cobrada'; c.cerrada = ISO(0); c.pedidoId = ped.pedidoId; m.estado = 'libre';
    aud(u, 'pedido.crear', 'Pedidos', ped.pedidoId, 'Venta de mesa ' + m.numero + ' (' + u.nombre + ')');
    return { pedido: pedidoObtener(ped.pedidoId), mesa: clone(m) };
  });

  // ---------------------------------------------------------------- fase 2 de Restó (Salon.gs): reservas, QR, avisos, cocina
  var AVISOS_M = ['llamo', 'pidio_carta', 'pidio_cuenta'];
  var aMin = function (h) { var m = /^([01]\d|2[0-3]):([0-5]\d)$/.exec(String(h || '')); return m ? Number(m[1]) * 60 + Number(m[2]) : null; };
  var deMin = function (n) { return (n < 600 ? '0' : '') + Math.floor(n / 60) + ':' + (n % 60 < 10 ? '0' : '') + (n % 60); };
  var ahoraL = function () { var dt = new Date(NOW() - 3 * 3600 * 1000); return { fecha: dt.toISOString().slice(0, 10), min: dt.getUTCHours() * 60 + dt.getUTCMinutes() }; };
  var sumD = function (f, n) { return new Date(Date.parse(f + 'T12:00:00Z') + n * 86400000).toISOString().slice(0, 10); };
  var cfgS = function () { return db.cfgSalon; };
  var VIVAS = ['pendiente', 'confirmada', 'llego'];
  var ocupa = function (r) { if (VIVAS.indexOf(r.estado) < 0) return false; var a = ahoraL(); if (r.fecha < a.fecha) return false; if (r.fecha === a.fecha && r.estado !== 'llego' && aMin(r.hora) + cfgS().noShowMin < a.min) return false; return true; };
  var mesasAct = function () { return db.mesas.filter(function (m) { return m.activa; }); };
  var elegir = function (ocup, personas, zona) { var mejor = null; mesasAct().forEach(function (m) { if (ocup[m.mesaId] || m.capacidad < personas || (zona && m.zona !== zona)) return; if (!mejor || m.capacidad < mejor.capacidad) mejor = m; }); return mejor; };
  var dispon = function (fecha, personas, zona) {
    var c = cfgS(), a = ahoraL(), zonas = [], out = { fecha: fecha, personas: personas, zonas: zonas, duracionMin: c.duracionMin, horarios: [], mensaje: '' };
    mesasAct().forEach(function (m) { if (zonas.indexOf(m.zona) < 0) zonas.push(m.zona); });
    var maxCap = mesasAct().reduce(function (n, m) { return Math.max(n, m.capacidad); }, 0);
    if (personas > maxCap) { out.mensaje = 'Para grupos de más de ' + maxCap + ' personas escribinos por WhatsApp y lo coordinamos.'; return out; }
    var vivas = db.reservas.filter(function (r) { return r.fecha === fecha && ocupa(r); });
    for (var t = aMin(c.desde); t <= aMin(c.hasta); t += c.paso) {
      if (fecha === a.fecha && t < a.min) continue;
      var ocup = {}, sol = vivas.filter(function (r) { var i = aMin(r.hora); return i < t + c.duracionMin && t < i + c.duracionMin; });
      sol.forEach(function (r) { if (r.mesaId) ocup[r.mesaId] = true; });
      sol.filter(function (r) { return !r.mesaId; }).sort(function (x, y) { return y.personas - x.personas; }).forEach(function (r) { var m = elegir(ocup, r.personas, r.zona); if (m) ocup[m.mesaId] = true; });
      var libres = zonas.filter(function (z) { return (!zona || z === zona) && elegir(ocup, personas, z); });
      if (libres.length) out.horarios.push({ hora: deMin(t), zonas: libres });
    }
    if (!out.horarios.length) out.mensaje = 'No hay lugar ese día para ' + personas + (personas === 1 ? ' persona' : ' personas') + '. Probá otro día o escribinos por WhatsApp.';
    return out;
  };
  var checkFecha = function (f) { var a = ahoraL(); if (!/^\d{4}-\d{2}-\d{2}$/.test(String(f || '')) || isNaN(Date.parse(f + 'T12:00:00Z'))) throw Err('VALIDACION', 'Elegí una fecha válida.', { fecha: 'Fecha inválida.' }); if (f < a.fecha) throw Err('VALIDACION', 'Esa fecha ya pasó.', { fecha: 'Fecha pasada.' }); if (f > sumD(a.fecha, cfgS().diasMax)) throw Err('VALIDACION', 'Se puede reservar hasta ' + cfgS().diasMax + ' días antes.', { fecha: 'Muy lejos.' }); };
  var resVista = function (r) {
    var m = r.mesaId ? db.mesas.filter(function (x) { return x.mesaId === r.mesaId; })[0] : null, a = ahoraL(), o = clone(r);
    o.mesaNumero = m ? m.numero : null; o.preorden = r.preorden || [];
    o.atrasada = VIVAS.indexOf(r.estado) >= 0 && r.estado !== 'llego' && r.fecha === a.fecha && aMin(r.hora) + cfgS().noShowMin < a.min; o.pasada = r.fecha < a.fecha; return o;
  };
  var listaRes = function (fecha) {
    var a = ahoraL(), f = fecha || a.fecha;
    var l = db.reservas.filter(function (r) { return r.fecha === f; }).sort(function (x, y) { return x.hora < y.hora ? -1 : x.hora > y.hora ? 1 : x.numero - y.numero; }).map(resVista);
    var vivas = l.filter(function (r) { return VIVAS.indexOf(r.estado) >= 0; }), zs = [];
    mesasAct().forEach(function (m) { if (zs.indexOf(m.zona) < 0) zs.push(m.zona); });
    return { fecha: f, hoy: a.fecha, reservas: l, config: clone(cfgS()), estados: ['pendiente', 'confirmada', 'llego', 'no_vino', 'cancelada'], zonas: zs,
      resumen: { reservas: vivas.length, personas: vivas.reduce(function (s2, r) { return s2 + r.personas; }, 0), pendientes: db.reservas.filter(function (r) { return r.estado === 'pendiente' && r.fecha >= a.fecha; }).length } };
  };
  var resDe = function (id) { var r = db.reservas.filter(function (x) { return x.reservaId === id; })[0]; if (!r) throw Err('NO_ENCONTRADO', 'No encontramos esa reserva.'); return r; };
  def('reservas.listar', 'reservas:ver', function (u, p) { p = p || {}; return listaRes(p.fecha); });
  def('reservas.disponibilidad', 'reservas:ver', function (u, p) { checkFecha(p.fecha); var n = Number(p.personas); if (!(n >= 1 && n <= 40 && n === Math.round(n))) throw Err('VALIDACION', 'Las personas tienen que ser de 1 a 40.', { personas: 'Valor inválido.' }); return dispon(p.fecha, n, p.zona || ''); });
  def('reservas.crear', 'reservas:total', function (u, p) {
    var campos = {}; if (!String(p.nombre || '').trim()) campos.nombre = 'Decinos a nombre de quién es.'; var tel = normTel(p.telefono || ''); if (!tel || tel.length < 10) campos.telefono = 'Revisá el teléfono: poné el código de área, por ejemplo 342 5123456.';
    if (Object.keys(campos).length) throw Err('VALIDACION', 'Revisá los datos de la reserva.', campos);
    checkFecha(p.fecha); var n = Number(p.personas); if (!(n >= 1 && n <= 40 && n === Math.round(n))) throw Err('VALIDACION', 'Las personas tienen que ser de 1 a 40.', { personas: 'Valor inválido.' });
    if (aMin(p.hora) === null) throw Err('VALIDACION', 'Elegí un horario.', { hora: 'Horario inválido.' });
    var ex = db.reservas.filter(function (r) { return r.reservaId === p.reservaId; })[0];
    if (!ex) {
      var d = dispon(p.fecha, n, p.zona || ''); if (!d.horarios.some(function (h2) { return h2.hora === deMin(aMin(p.hora)); }) && p.forzar !== true) throw Err('CONFLICTO', 'Ese horario se completó. Elegí otro.');
      db.reservas.push({ reservaId: p.reservaId || nid('res'), numero: db.reservas.length + 1, nombre: String(p.nombre).trim().slice(0, 120), telefono: tel, personas: n, fecha: p.fecha, hora: deMin(aMin(p.hora)), zona: p.zona || '', estado: 'confirmada', mesaId: '', nota: String(p.nota || '').slice(0, 200), preorden: [], canal: 'panel', creado: ISO(0), actualizado: ISO(0), creadoPor: u.usuarioId });
      aud(u, 'reserva.crear', 'reserva', p.reservaId, p.fecha + ' ' + p.hora);
    }
    return listaRes(p.fecha);
  });
  def('reservas.estado', 'reservas:total', function (u, p) {
    var r = resDe(p.reservaId); if (['pendiente', 'confirmada', 'no_vino', 'cancelada'].indexOf(p.estado) < 0) throw Err('VALIDACION', 'Ese estado no se puede elegir desde acá.');
    if (r.estado === 'llego') throw Err('CONFLICTO', 'Esa reserva ya llegó. Se maneja desde la mesa.');
    r.estado = p.estado; if (p.estado === 'no_vino' || p.estado === 'cancelada') r.mesaId = ''; return listaRes(r.fecha);
  });
  var libreRes = function (mesaId, r) { return !db.reservas.some(function (x) { return x !== r && x.fecha === r.fecha && x.mesaId === mesaId && VIVAS.indexOf(x.estado) >= 0 && Math.abs(aMin(x.hora) - aMin(r.hora)) < cfgS().duracionMin; }); };
  def('reservas.asignarMesa', 'reservas:total', function (u, p) {
    var r = resDe(p.reservaId), m = mesaDe(p.mesaId); if (m.capacidad < r.personas) throw Err('VALIDACION', 'La mesa ' + m.numero + ' es para ' + m.capacidad + ' y la reserva es de ' + r.personas + '.', { mesaId: 'No entran.' });
    if (!libreRes(m.mesaId, r)) throw Err('CONFLICTO', 'Esa mesa ya está reservada en ese horario.'); r.mesaId = m.mesaId; return listaRes(r.fecha);
  });
  def('reservas.llego', 'reservas:total', function (u, p) {
    var r = resDe(p.reservaId), mid = p.mesaId || r.mesaId; if (!mid) throw Err('VALIDACION', 'Elegí en qué mesa se sientan.'); var m = mesaDe(mid);
    if (cuentaAb(m.mesaId)) throw Err('CONFLICTO', 'La mesa ' + m.numero + ' tiene una cuenta abierta. Elegí otra.');
    r.estado = 'llego'; r.mesaId = m.mesaId; A['mesas.abrirCuenta'].fn(u, { mesaId: m.mesaId, personas: r.personas });
    return { mesa: detMesa(m.mesaId), reservas: listaRes(r.fecha) };
  });
  def('reservas.guardarConfig', 'reservas:total', function (u, p) {
    noCajero(u); var c = cfgS(); ['duracionMin', 'noShowMin', 'paso', 'diasMax'].forEach(function (k) { if (p[k] !== undefined) { var n = Number(p[k]); if (!(n >= 0 && n === Math.round(n))) throw Err('VALIDACION', 'Revisá los datos.', (function (o) { o[k] = 'Valor inválido.'; return o; })({})); c[k] = n; } });
    if (p.desde !== undefined) { if (aMin(p.desde) === null) throw Err('VALIDACION', 'Revisá los datos.', { desde: 'Poné el horario como HH:MM.' }); c.desde = p.desde; }
    if (p.hasta !== undefined) { if (aMin(p.hasta) === null) throw Err('VALIDACION', 'Revisá los datos.', { hasta: 'Poné el horario como HH:MM.' }); c.hasta = p.hasta; }
    ['autoconfirmar', 'activas'].forEach(function (k) { if (typeof p[k] === 'boolean') c[k] = p[k]; }); return clone(c);
  });
  def('mesas.guardarConfigQr', 'mesas:total', function (u, p) { noCajero(u); var c = cfgS(); if (typeof p.qrActivo === 'boolean') c.qrActivo = p.qrActivo; if (typeof p.qrMostrarEstado === 'boolean') c.qrMostrarEstado = p.qrMostrarEstado; return { activo: c.qrActivo, mostrarEstado: c.qrMostrarEstado }; });
  def('mesas.qr', 'mesas:total', function (u, p) {
    noCajero(u); var m = mesaDe(p.mesaId); if (!m.token || p.regenerar === true) m.token = 'sim' + Math.random().toString(16).slice(2, 14) + Math.random().toString(16).slice(2, 11);
    return { mesaId: m.mesaId, numero: m.numero, token: m.token, enlace: (db.config.webUrl || '') ? db.config.webUrl + '?mesa=' + m.token : '', activo: cfgS().qrActivo, mostrarEstado: cfgS().qrMostrarEstado };
  });
  def('mesas.atender', 'mesas:total', function (u, p) { var m = mesaDe(p.mesaId); if (AVISOS_M.indexOf(m.estado) > -1) { m.estado = cuentaAb(m.mesaId) ? 'ocupada' : 'libre'; m.avisoDesde = ''; } return detMesa(m.mesaId); });
  def('mesas.confirmarQr', 'mesas:total', function (u, p) {
    var c = db.cuentas.filter(function (x) { return x.cuentaId === p.cuentaId; })[0]; if (!c) throw Err('NO_ENCONTRADO', 'No encontramos esa cuenta.');
    rengDe(c.cuentaId).filter(function (r) { return r.estadoCocina === 'por_confirmar'; }).forEach(function (r) { if (p.aceptar === false) db.renglones = db.renglones.filter(function (x) { return x !== r; }); else { r.estadoCocina = r.estacion ? 'nuevo' : 'entregado'; r.cocinaActualizado = ISO(0); } });
    return detMesa(c.mesaId);
  });
  def('mesas.entregar', 'mesas:total', function (u, p) { var c0 = null; (p.ids || []).forEach(function (id) { var r = db.renglones.filter(function (x) { return x.cuentaItemId === id; })[0]; if (r) { r.estadoCocina = 'entregado'; c0 = r.cuentaId; } }); var c = db.cuentas.filter(function (x) { return x.cuentaId === c0; })[0]; if (!c) throw Err('NO_ENCONTRADO', 'No encontramos ese renglón.'); return detMesa(c.mesaId); });
  def('mesas.novedades', 'mesas:ver', function () {
    var avisos = mesasAct().filter(function (m) { return AVISOS_M.indexOf(m.estado) > -1; }).map(function (m) { return { mesaId: m.mesaId, numero: m.numero, tipo: m.estado, desde: m.avisoDesde || '' }; });
    var pc = {}, li = {};
    db.renglones.forEach(function (r) { var c = db.cuentas.filter(function (x) { return x.cuentaId === r.cuentaId && x.estado === 'abierta'; })[0]; if (!c) return; var m = mesaDe(c.mesaId), d2 = r.estadoCocina === 'por_confirmar' ? pc : r.estadoCocina === 'listo' ? li : null; if (!d2) return; d2[m.mesaId] = d2[m.mesaId] || { mesaId: m.mesaId, numero: m.numero, cuentaId: c.cuentaId, renglones: 0 }; d2[m.mesaId].renglones++; });
    var o = { avisos: avisos, porConfirmar: Object.keys(pc).map(function (k) { return pc[k]; }), listos: Object.keys(li).map(function (k) { return li[k]; }), reservasPendientes: db.reservas.filter(function (r) { return r.estado === 'pendiente' && r.fecha >= ahoraL().fecha; }).length };
    o.firma = JSON.stringify([mesasAct().map(function (m) { var c = cuentaAb(m.mesaId); return m.numero + m.estado + (c ? rengDe(c.cuentaId).length : 0); }).join(','), avisos.map(function (a) { return a.numero + a.tipo + a.desde; }), o.porConfirmar.map(function (a) { return a.numero + ':' + a.renglones; }), o.listos.map(function (a) { return a.numero + ':' + a.renglones; }), o.reservasPendientes]); return o;
  });
  def('cocina.listar', 'cocina:ver', function (u, p) {
    p = p || {}; var est = p.estacion === 'cocina' || p.estacion === 'barra' ? p.estacion : '';
    var items = db.renglones.filter(function (r) { var c = db.cuentas.filter(function (x) { return x.cuentaId === r.cuentaId && x.estado === 'abierta'; })[0]; return c && ['nuevo', 'preparando', 'listo'].indexOf(r.estadoCocina) > -1 && (!est || r.estacion === est); }).map(function (r) {
      var c = db.cuentas.filter(function (x) { return x.cuentaId === r.cuentaId; })[0], m = db.mesas.filter(function (x) { return x.mesaId === c.mesaId; })[0];
      return { cuentaItemId: r.cuentaItemId, cuentaId: r.cuentaId, mesaNumero: m.numero, zona: m.zona, nombre: r.nombre, detalle: r.detalle, cantidad: r.cantidad, nota: r.nota, estacion: r.estacion, estado: r.estadoCocina, origen: r.origen || 'mozo',
        minutos: Math.max(0, Math.round((NOW() - Date.parse(r.cocinaActualizado || r.creado)) / 60000)), minutosTotal: Math.max(0, Math.round((NOW() - Date.parse(r.creado)) / 60000)) };
    });
    var cu = { nuevo: 0, preparando: 0, listo: 0 }; items.forEach(function (x) { cu[x.estado]++; }); return { items: items, cuenta: cu, estacion: est };
  });
  def('cocina.estado', 'cocina:total', function (u, p) {
    if (['nuevo', 'preparando', 'listo'].indexOf(p.estado) < 0) throw Err('VALIDACION', 'Desde Cocina solo se marca nuevo, preparando o listo.');
    (p.ids || []).forEach(function (id) { var r = db.renglones.filter(function (x) { return x.cuentaItemId === id; })[0]; if (!r) throw Err('NO_ENCONTRADO', 'No encontramos ese renglón.'); r.estadoCocina = p.estado; r.cocinaActualizado = ISO(0); });
    return A['cocina.listar'].fn(u, p);
  });
  // solo del simulador: hace de «cliente que escanea el QR de la mesa y pide» (en el servidor real lo hace la acción pública qrPedir)
  def('test.qrPedido', 'inicio:ver', function (u, p) {
    var m = mesaDe(p.mesaId), c = cuentaAb(m.mesaId); if (!c) { A['mesas.abrirCuenta'].fn(u, { mesaId: m.mesaId, personas: 0 }); c = cuentaAb(m.mesaId); }
    var d = A['mesas.agregar'].fn(u, { cuentaId: c.cuentaId, items: p.items }); rengDe(c.cuentaId).filter(function (r) { return !r.estadoCocina || r.estadoCocina === 'nuevo' && p.items.some(function (i) { return i.cuentaItemId === r.cuentaItemId; }); }).forEach(function (r) { if (p.items.some(function (i) { return i.cuentaItemId === r.cuentaItemId; })) { r.estadoCocina = 'por_confirmar'; r.origen = 'qr'; } }); return detMesa(m.mesaId);
  });
  def('test.llamarMozo', 'inicio:ver', function (u, p) { var m = mesaDe(p.mesaId); m.estado = p.motivo === 'cuenta' ? 'pidio_cuenta' : 'llamo'; m.avisoDesde = ISO(0); return { ok: true }; });
  // ventas
  def('ventas.listar', 'ventas:ver', function (u, p) {
    p = p || {}; var cerr = todosPedidos().filter(function (x) { return x.estado === 'Cerrado'; });
    var v = desdeHasta(cerr, 'creado', p.desde, p.hasta).filter(function (x) { return (!p.canal || x.canal === p.canal) && (!p.metodoPago || x.metodoPago === p.metodoPago); }).slice(0, p.limite || 200);
    var tot = v.reduce(function (s, x) { return s + x.total; }, 0), n = v.length, an = Object.keys(db.pedidosPorId).map(function (k) { return db.pedidosPorId[k]; }).filter(function (x) { return x.estado === 'Anulado'; }).length;
    return { ventas: v.map(function (x) { return pedidoVista(x, true); }), resumen: { total: tot, cantidad: n, ticketPromedio: n ? rp(tot / n) : 0, devoluciones: an, comparadoConAnterior: { total: rp(tot * 0.91), cantidad: Math.max(0, n - 1), ticketPromedio: n ? rp(tot / n * 0.96) : 0 } } };
  });
  def('ventas.obtener', 'ventas:ver', function (u, p) { return pedidoObtener(p.pedidoId); });
  def('ventas.anular', 'ventas:total', function (u, p) { return cambiarEstado(u, { pedidoId: p.pedidoId, estado: 'Anulado', motivo: p.motivo }); });
  def('ventas.ticket', 'ventas:ver', function (u, p) {
    var x = pedidoObtener(p.pedidoId), fm = function (n) { return '$ ' + String(Math.round(n)).replace(/\B(?=(\d{3})+(?!\d))/g, '.'); };
    var l = ['ALMACÉN DOÑA NORMA', 'Ticket sin valor fiscal', 'Pedido #' + ('0000' + x.numero).slice(-4), ''];
    x.items.forEach(function (i) { l.push(i.nombre + (i.detalle ? ' (' + i.detalle + ')' : '')); l.push('  ' + String(i.cantidad).replace('.', ',') + ' ' + i.unidad + ' x ' + fm(i.precioBase) + ' = ' + fm(i.importe)); });
    l.push('', 'Subtotal ' + fm(x.subtotal)); if (x.recargo) l.push('Recargo ' + fm(x.recargo)); if (x.envio) l.push('Envío ' + fm(x.envio)); l.push('TOTAL ' + fm(x.total), '', 'Gracias por tu compra.');
    return { texto: l.join('\n'), lineas: l };
  });
  // clientes
  function statsCliente(c) {
    var ps = todosPedidos().filter(function (x) { return x.clienteId === c.clienteId && x.estado === 'Cerrado'; }), tot = ps.reduce(function (s, x) { return s + x.total; }, 0);
    var o = clone(c); o.pedidos = ps.length; o.totalComprado = tot; o.ticketPromedio = ps.length ? rp(tot / ps.length) : 0; o.ultimaCompra = ps.length ? ps[0].creado : '';
    o.posibleDuplicadoDe = null;
    db.clientes.forEach(function (d2) { if (d2.clienteId !== c.clienteId && kebab(d2.nombre) === kebab(c.nombre) && d2.clienteId < c.clienteId) o.posibleDuplicadoDe = d2.clienteId; });
    return o;
  }
  def('clientes.listar', 'clientes:ver', function (u, p) {
    p = p || {}; var r = db.clientes.filter(function (c) { return c.estado !== 'archivado' && (!p.q || contiene(c.nombre, p.q) || contiene(c.telefono, p.q)); }).map(statsCliente);
    if (p.filtro === 'frecuentes') r = r.filter(function (c) { return c.pedidos >= 2; });
    if (p.filtro === 'nuevos') r = r.filter(function (c) { return Date.parse(c.creado) > NOW() - 7 * 864e5; });
    if (p.filtro === 'inactivos') r = r.filter(function (c) { return !c.ultimaCompra || Date.parse(c.ultimaCompra) < NOW() - 30 * 864e5; });
    return r;
  });
  def('clientes.obtener', 'clientes:ver', function (u, p) {
    var c = buscar(db.clientes, 'clienteId', p.clienteId, 'cliente'), o = statsCliente(c);
    o.ultimosPedidos = todosPedidos().filter(function (x) { return x.clienteId === c.clienteId; }).slice(0, 5).map(function (x) { return pedidoVista(x, false); });
    o.duplicados = db.clientes.filter(function (d2) { return d2.clienteId !== c.clienteId && kebab(d2.nombre) === kebab(c.nombre); }).map(clone);
    return o;
  });
  function sigNumCliente() { var m = 0; db.clientes.forEach(function (c) { if (c.numero > m) m = c.numero; }); return m + 1; }
  function normTel(t) { var d = String(t || '').replace(/\D/g, ''); if (!d) return ''; if (d.indexOf('549') === 0) return d; if (d.indexOf('54') === 0) return '549' + d.slice(2); return '549' + d.replace(/^0/, '').replace(/^(\d{3,4})15/, '$1'); }
  def('clientes.crear', 'clientes:total', function (u, p) {
    if (!p.nombre || !String(p.nombre).trim()) throw Err('VALIDACION', 'Poné el nombre del cliente.', { nombre: 'Falta el nombre.' });
    var t = normTel(p.telefono), ex = t ? db.clientes.filter(function (c) { return c.telefono === t; })[0] : null;
    if (ex) { var e = Err('CONFLICTO', 'Ya existe un cliente con ese teléfono: ' + ex.nombre + '.'); e.existenteId = ex.clienteId; throw e; }
    var n = { clienteId: nid('cli'), nombre: String(p.nombre).trim().slice(0, 120), telefono: t, direccion: (p.direccion || '').slice(0, 200), nota: (p.nota || '').slice(0, 300), estado: 'activo', creado: ISO(0), actualizado: ISO(0), numero: sigNumCliente() };
    db.clientes.push(n); return statsCliente(n);
  });
  def('clientes.actualizar', 'clientes:total', function (u, p) {
    var c = buscar(db.clientes, 'clienteId', p.clienteId, 'cliente');
    if (p.telefono !== undefined) { var t = normTel(p.telefono), ex = t ? db.clientes.filter(function (y) { return y.telefono === t && y.clienteId !== c.clienteId; })[0] : null; if (ex) { var e = Err('CONFLICTO', 'Ese teléfono ya es de ' + ex.nombre + '.'); e.existenteId = ex.clienteId; throw e; } c.telefono = t; }
    ['nombre', 'direccion', 'nota'].forEach(function (k) { if (p[k] !== undefined) c[k] = p[k]; }); c.actualizado = ISO(0); return statsCliente(c);
  });
  def('clientes.archivar', 'clientes:total', function (u, p) { var c = buscar(db.clientes, 'clienteId', p.clienteId, 'cliente'); c.estado = 'archivado'; return statsCliente(c); });
  def('clientes.exportar', 'clientes:total', function () {
    var f = function (s) { s = String(s == null ? '' : s); if (/^[=+\-@]/.test(s)) s = "'" + s; return '"' + s.replace(/"/g, '""') + '"'; };
    return ['nombre,telefono,direccion'].concat(db.clientes.map(function (c) { return [f(c.nombre), f(c.telefono), f(c.direccion)].join(','); })).join('\n');
  });
  // proveedores / compras
  function provVista(pr) {
    var cs = db.compras.filter(function (c) { return c.proveedorId === pr.proveedorId; }), o = clone(pr);
    o.saldoAPagar = cs.filter(function (c) { return c.estado !== 'Cancelada' && c.pago === 'Pendiente'; }).reduce(function (s, c) { return s + c.total; }, 0);
    o.comprado90dias = cs.filter(function (c) { return c.estado !== 'Cancelada'; }).reduce(function (s, c) { return s + c.total; }, 0);
    o.ultimaCompra = cs.length ? cs.map(function (c) { return c.fechaPedido; }).sort().pop() : ''; return o;
  }
  def('proveedores.listar', 'proveedores:ver', function (u, p) {
    p = p || {}; var r = db.proveedores.filter(function (x) { return (p.filtro === 'archivados') ? x.estado === 'archivado' : x.estado !== 'archivado'; }).filter(function (x) { return !p.q || contiene(x.nombre, p.q); }).map(provVista);
    if (p.filtro === 'conSaldo') r = r.filter(function (x) { return x.saldoAPagar > 0; }); return r;
  });
  def('proveedores.obtener', 'proveedores:ver', function (u, p) {
    var pr = buscar(db.proveedores, 'proveedorId', p.proveedorId, 'proveedor'), o = provVista(pr);
    o.compras = db.compras.filter(function (c) { return c.proveedorId === pr.proveedorId; }).map(compraVista);
    var ids = {}; o.compras.forEach(function (c) { c.items.forEach(function (i) { ids[i.productoId] = 1; }); });
    o.productos = db.productos.filter(function (x) { return ids[x.productoId]; }).map(prodVista); return o;
  });
  def('proveedores.crear', 'proveedores:total', function (u, p) {
    if (!p.nombre || !String(p.nombre).trim()) throw Err('VALIDACION', 'Poné el nombre del proveedor.', { nombre: 'Poné el nombre del proveedor.' });
    if (db.proveedores.some(function (x) { return x.estado !== 'archivado' && x.nombre.trim().toLowerCase() === String(p.nombre).trim().toLowerCase(); })) throw Err('CONFLICTO', 'Ya tenés un proveedor con ese nombre.', { nombre: 'Ya existe.' });
    var n = { proveedorId: nid('prov'), nombre: String(p.nombre).trim().slice(0, 120), contacto: p.contacto || '', telefono: p.telefono || '', rubro: p.rubro || '', formaPago: p.formaPago || '', estado: 'activo', creado: ISO(0) }; db.proveedores.push(n); return provVista(n);
  });
  def('proveedores.actualizar', 'proveedores:total', function (u, p) { var x = buscar(db.proveedores, 'proveedorId', p.proveedorId, 'proveedor'); ['nombre', 'contacto', 'telefono', 'rubro', 'formaPago'].forEach(function (k) { if (p[k] !== undefined) x[k] = p[k]; }); return provVista(x); });
  def('proveedores.archivar', 'proveedores:total', function (u, p) { var x = buscar(db.proveedores, 'proveedorId', p.proveedorId, 'proveedor'); x.estado = 'archivado'; return provVista(x); });
  def('proveedores.eliminar', 'proveedores:total', function (u, p) { var x = buscar(db.proveedores, 'proveedorId', p.proveedorId, 'proveedor'); if (db.compras.some(function (c) { return c.proveedorId === x.proveedorId; })) throw Err('CONFLICTO', 'Este proveedor ya tiene compras registradas, por eso no se puede eliminar. Archivalo y listo: su historial se conserva.'); db.proveedores.splice(db.proveedores.indexOf(x), 1); return { proveedorId: x.proveedorId, eliminado: true }; });
  function compraVista(c) {
    var o = clone(c), pr = db.proveedores.filter(function (x) { return x.proveedorId === c.proveedorId; })[0]; o.proveedorNombre = pr ? pr.nombre : '';
    o.items = db.compraItems.filter(function (i) { return i.compraId === c.compraId; }).map(function (i) { var o2 = clone(i), p2 = db.productos.filter(function (x) { return x.productoId === i.productoId; })[0]; o2.productoNombre = p2 ? p2.nombre : ''; o2.unidad = p2 ? p2.unidadMedida : 'u'; o2.decimales = p2 ? p2.decimales : 0; return o2; }); return o;
  }
  def('compras.listar', 'compras:ver', function (u, p) {
    p = p || {}; var r = db.compras.slice().sort(function (a, b) { return b.numero - a.numero; });
    var f = p.filtro || 'todas';
    if (f === 'porRecibir') r = r.filter(function (c) { return c.estado === 'Pedida'; });
    if (f === 'recibidas') r = r.filter(function (c) { return c.estado === 'Recibida'; });
    if (f === 'porPagar') r = r.filter(function (c) { return c.estado !== 'Cancelada' && c.pago === 'Pendiente'; });
    var all = db.compras, noCanc = all.filter(function (c) { return c.estado !== 'Cancelada'; });
    return { compras: r.map(compraVista), resumen: { porRecibir: all.filter(function (c) { return c.estado === 'Pedida'; }).length, porPagar: noCanc.filter(function (c) { return c.pago === 'Pendiente'; }).reduce(function (s, c) { return s + c.total; }, 0), compradoMes: noCanc.reduce(function (s, c) { return s + c.total; }, 0), cantidadMes: noCanc.length, recibidasSemana: all.filter(function (c) { return c.estado === 'Recibida' && Date.parse(c.fechaRecibida) > NOW() - 7 * 864e5; }).length } };
  });
  def('compras.crear', 'compras:total', function (u, p) {
    buscar(db.proveedores, 'proveedorId', p.proveedorId, 'proveedor');
    if (!Array.isArray(p.items) || !p.items.length) throw Err('VALIDACION', 'Agregá al menos un producto a la compra.', { items: 'Falta al menos un producto.' });
    if (buscar(db.proveedores, 'proveedorId', p.proveedorId, 'proveedor').estado === 'archivado') throw Err('VALIDACION', 'Ese proveedor está archivado. Elegí otro o restauralo.', { proveedorId: 'Proveedor archivado.' });
    var malos = {}; /* mismas reglas que el servidor real (Compras.gs): cantidad > 0 y costo entero en pesos */
    p.items.forEach(function (it, k) {
      var pr = db.productos.filter(function (x) { return x.productoId === it.productoId; })[0];
      if (!pr) { malos['items.' + k] = 'Uno de los productos ya no está disponible.'; return; }
      if (!(+it.cantidad > 0)) malos['items.' + k] = 'La cantidad de «' + pr.nombre + '» tiene que ser mayor a 0, con hasta ' + pr.decimales + ' decimales.';
      else if (!(Math.round(+it.cantidad * Math.pow(10, pr.decimales)) / Math.pow(10, pr.decimales) === +it.cantidad)) malos['items.' + k] = 'La cantidad de «' + pr.nombre + '» tiene que ser mayor a 0, con hasta ' + pr.decimales + ' decimales.';
      else if (!(Number.isInteger(+it.costoUnitario) && +it.costoUnitario >= 0)) malos['items.' + k] = 'El costo de «' + pr.nombre + '» tiene que ser un monto en pesos, sin centavos.';
    });
    if (Object.keys(malos).length) throw Err('VALIDACION', 'Revisá los productos de la compra.', malos);
    var id = nid('comp'), tot = 0;
    p.items.forEach(function (it, k) { buscar(db.productos, 'productoId', it.productoId, 'producto'); var imp = rp(+it.cantidad * +it.costoUnitario); tot += imp; db.compraItems.push({ compraItemId: nid('ci'), compraId: id, productoId: it.productoId, cantidad: +it.cantidad, costoUnitario: +it.costoUnitario, importe: imp }); });
    var c = { compraId: id, numero: Math.max.apply(null, db.compras.map(function (x) { return x.numero; })) + 1, proveedorId: p.proveedorId, estado: 'Pedida', pago: 'Pendiente', total: tot, fechaPedido: ISO(0), fechaEsperada: p.fechaEsperada || '', fechaRecibida: '', stockAplicado: false, creado: ISO(0) };
    db.compras.push(c); return compraVista(c);
  });
  def('compras.recibir', 'compras:total', function (u, p) {
    var c = buscar(db.compras, 'compraId', p.compraId, 'compra');
    if (c.estado === 'Cancelada') throw Err('VALIDACION', 'Esta compra está cancelada: no se puede recibir.');
    if (c.stockAplicado && c.estado === 'Recibida') { var ya = compraVista(c); ya.sinCambios = true; return ya; }
    if (!c.stockAplicado) { db.compraItems.filter(function (i) { return i.compraId === c.compraId; }).forEach(function (i) { var pr = db.productos.filter(function (x) { return x.productoId === i.productoId; })[0]; if (pr) mover(pr, 'compra', i.cantidad, 'Compra #' + c.numero, c.compraId, u); }); c.stockAplicado = true; c.estado = 'Recibida'; c.fechaRecibida = ISO(0); }
    return compraVista(c);
  });
  def('compras.marcarPago', 'compras:total', function (u, p) { var c = buscar(db.compras, 'compraId', p.compraId, 'compra'); if (['Pendiente', 'Pagado'].indexOf(p.pago) < 0) throw Err('VALIDACION', 'Elegí si está pagada o pendiente.'); c.pago = p.pago; return compraVista(c); });
  def('compras.cancelar', 'compras:total', function (u, p) { var c = buscar(db.compras, 'compraId', p.compraId, 'compra'); if (c.estado !== 'Pedida') throw Err('VALIDACION', 'Solo se puede cancelar una compra que todavía no llegó.'); c.estado = 'Cancelada'; return compraVista(c); });
  // reportes / inicio
  function ritmo() {
    var h0 = 8, hN = Math.min(21, Math.max(12, new Date().getHours())), arr = [], cer = todosPedidos().filter(function (x) { return x.estado === 'Cerrado' && new Date(x.creado).toDateString() === new Date().toDateString(); });
    for (var h = h0; h <= hN; h++) arr.push({ hora: h, total: cer.filter(function (x) { return new Date(x.creado).getHours() === h; }).reduce(function (s, x) { return s + x.total; }, 0) });
    return arr;
  }
  def('inicio.resumen', 'inicio:ver', function () {
    var hoy = todosPedidos().filter(function (x) { return new Date(x.creado).toDateString() === new Date().toDateString(); }), cer = hoy.filter(function (x) { return x.estado === 'Cerrado'; });
    var vh = cer.reduce(function (s, x) { return s + x.total; }, 0), tk = cer.length ? rp(vh / cer.length) : 0;
    var pend = todosPedidos().filter(function (x) { return x.estado === 'Nuevo' || x.estado === 'Preparando'; }).sort(function (a, b) { return a.creado < b.creado ? -1 : 1; }).slice(0, 5).map(function (x) { return pedidoVista(x, true); });
    var orden = { sin_stock: 0, critico: 1, bajo: 2 };
    var alertas = db.productos.filter(function (x) { return x.estado === 'activo' && nivel(x) !== 'ok'; }).map(prodVista).sort(function (a, b) { return orden[a.nivelStock] - orden[b.nivelStock]; }).slice(0, 5);
    return { ventasHoy: vh, pedidosHoy: hoy.filter(function (x) { return x.estado !== 'Cancelado'; }).length, ticketPromedio: tk, comparadoAyer: { ventasHoy: rp(vh / 1.128), pedidosHoy: Math.max(1, hoy.length - 2), ticketPromedio: rp(tk / 1.042) }, pedidosPendientes: pend, stockAlertas: alertas, ritmoPorHora: ritmo(), conexionWeb: { estado: db.conexion.estado, modo: db.conexion.modo, ultimoSync: db.conexion.ultimoSync } };
  });
  def('reportes.resumen', 'reportes:ver', function (u, p) {
    var dias = p.periodo === 'hoy' ? 1 : p.periodo === 'mes' ? new Date().getDate() : (p.periodo === 'custom' && p.desde && p.hasta) ? Math.min(365, Math.max(1, Math.round((Date.parse(p.hasta) - Date.parse(p.desde)) / 864e5) + 1)) : 7, desde = new Date(); desde.setHours(0, 0, 0, 0); desde = desde.getTime() - (dias - 1) * 864e5;
    var cer = todosPedidos().filter(function (x) { return x.estado === 'Cerrado' && Date.parse(x.creado) >= desde; }), tot = cer.reduce(function (s, x) { return s + x.total; }, 0), n = cer.length;
    var por = function (campo) { var m = {}; cer.forEach(function (x) { m[x[campo]] = (m[x[campo]] || 0) + x.total; }); return Object.keys(m).map(function (k) { return { total: m[k], porcentaje: tot ? Math.round(m[k] / tot * 1000) / 10 : 0, k: k }; }); };
    var mv = {}; cer.forEach(function (x) { x.items.forEach(function (i) { var r = mv[i.productoId] || (mv[i.productoId] = { productoId: i.productoId, nombre: i.nombre, cantidad: 0, unidad: i.unidad, importe: 0 }); r.cantidad = redondearCant(r.cantidad + i.cantidad, 3); r.importe += i.importe; }); });
    var vpd = []; for (var k = dias - 1; k >= 0; k--) { var dd = new Date(NOW() - k * 864e5); vpd.push({ fecha: dd.toISOString().slice(0, 10), total: k === 0 ? cer.filter(function (x) { return new Date(x.creado).toDateString() === dd.toDateString(); }).reduce(function (s, x) { return s + x.total; }, 0) : 150000 + ((k * 37321) % 90000) }); }
    return { vendido: tot, ventas: n, ticketPromedio: n ? rp(tot / n) : 0, comparado: { vendido: rp(tot * 0.93), ventas: Math.max(0, n - 1), ticketPromedio: n ? rp(tot / n * 0.97) : 0 }, ventasPorDia: vpd, masVendidos: Object.keys(mv).map(function (k2) { return mv[k2]; }).sort(function (a, b) { return b.importe - a.importe; }).slice(0, 5), medioPago: por('metodoPago').map(function (r) { return { metodo: r.k, total: r.total, porcentaje: r.porcentaje }; }), canal: por('canal').map(function (r) { return { canal: r.k, total: r.total, porcentaje: r.porcentaje }; }), paraReponer: db.productos.filter(function (x) { return x.estado === 'activo' && nivel(x) !== 'ok'; }).map(prodVista), compradoAProveedores: db.compras.filter(function (c) { return c.estado !== 'Cancelada'; }).reduce(function (s, c) { return s + c.total; }, 0), comprasRecibidas: db.compras.filter(function (c) { return c.estado === 'Recibida'; }).length };
  });
  def('reportes.seccion', 'reportes:ver', function (u, p) { return { seccion: p.seccion, kpis: {}, ranking: [], porCategoria: [], sinVentas: [], top: [], recontactar: [], niveles: {}, paraReponer: [], sinRotacion: [], sinRotacionTotal: 0, mayorValor: [], movimientosPorTipo: [], porProveedor: [], estados: [], atrasadas: [] }; });
  def('reportes.exportarVentas', 'reportes:total', function (u, p) {
    var f = function (s) { s = String(s == null ? '' : s); if (/^[=+\-@]/.test(s)) s = "'" + s; return '"' + s.replace(/"/g, '""') + '"'; };
    return ['numero,fecha,canal,metodoPago,total'].concat(desdeHasta(todosPedidos().filter(function (x) { return x.estado === 'Cerrado'; }), 'creado', p.desde, p.hasta).map(function (x) { return [x.numero, x.creado, x.canal, x.metodoPago, x.total].map(f).join(','); })).join('\n');
  });
  // conexión web
  def('web.estado', 'web:ver', function () { return clone(db.conexion); });
  def('web.matrizPropiedad', 'web:ver', function () { return [['productoId', 'panel'], ['nombre', 'panel'], ['categoria', 'panel'], ['precioBase', 'panel'], ['presentaciones', 'panel'], ['unidad', 'panel'], ['paso y decimales', 'panel'], ['stock', 'panel'], ['alALaVenta', 'panel'], ['imagen principal', 'panel'], ['textos largos', 'web'], ['diseño', 'web'], ['fotos extra', 'web']].map(function (r) { return { campo: r[0], dueno: r[1] }; }); });
  def('web.simular', 'web:total', function (u, p) {
    var cat = p.catalogoWeb || [{ webId: 'w-1', slugWeb: 'queso-cremoso', nombre: 'Queso cremoso', categoria: 'Lácteos', precio: 12100, unidadVenta: 'peso', unidadMedida: 'kg' }, { webId: 'w-2', slugWeb: 'dulce-de-leche', nombre: 'Dulce de leche 400 g', categoria: 'Almacén', precio: 2800, unidadVenta: 'unidad', unidadMedida: 'u' }, { webId: 'w-3', slugWeb: 'leche-entera-1l', nombre: 'Leche entera 1 L', categoria: 'Lácteos', precio: 1980, unidadVenta: 'unidad', unidadMedida: 'u' }];
    var id = nid('lote'); db.lotes[id] = { loteId: id, tipo: 'import_web', estado: 'simulado', filasTotal: cat.length, filasAplicadas: 0, creado: ISO(0), actualizado: ISO(0), detalle: '' };
    return { loteId: id, resumen: { enWeb: cat.length, seCrearan: 1, yaVinculados: 1, paraRevisar: 1 }, conflictos: [{ webId: 'w-1', nombre: 'Queso cremoso', tipo: 'precio_distinto', detalle: 'En la web cuesta $ 12.100 por kg y en el panel $ 11.800.', propuesta: 'usar_panel', opciones: ['usar_panel', 'usar_web', 'omitir'] }], invalidos: [] };
  });
  def('web.aplicar', 'web:total', function (u, p) { var l = db.lotes[p.loteId]; if (!l) throw Err('NO_ENCONTRADO', 'No encontramos ese lote.'); l.estado = 'completo'; l.filasAplicadas = l.filasTotal; return { loteId: l.loteId, estado: 'completo', aplicadas: l.filasTotal, total: l.filasTotal, errores: [] }; });
  def('web.reanudar', 'web:total', function (u, p) { return A['web.aplicar'].fn(u, p); });
  def('web.conectarSinCatalogo', 'web:total', function (u, p) { db.conexion = { conexionId: nid('con'), modo: 'C', estado: 'conectada', webUrl: p.webUrl || '', schemaVersion: 2, creado: ISO(0), ultimoSync: ISO(0), resultado: 'Conectada sin catálogo.' }; return clone(db.conexion); });
  def('web.desconectar', 'web:total', function () { db.conexion.estado = 'desconectada'; return clone(db.conexion); });
  def('web.publicarVistaPrevia', 'web:total', function () {
    var id = nid('lote'); db.lotes[id] = { loteId: id, tipo: 'publicar_web', estado: 'simulado', filasTotal: 0, filasAplicadas: 0, creado: ISO(0), actualizado: ISO(0), detalle: '' };
    var pub = db.productos.filter(function (x) { return x.estado === 'activo' && x.alALaVenta; }).map(prodVista);
    return { loteId: id, productosPublicables: pub, excluidos: db.productos.filter(function (x) { return !x.alALaVenta; }).map(function (x) { return { productoId: x.productoId, motivo: 'Está pausado' }; }) };
  });
  def('web.publicarAplicar', 'web:total', function (u, p) { var l = db.lotes[p.loteId]; if (!l) throw Err('NO_ENCONTRADO', 'No encontramos ese lote.'); l.estado = 'completo'; db.conexion.ultimoSync = ISO(0); return { loteId: l.loteId, estado: 'completo', aplicadas: (p.productoIds || []).length, total: (p.productoIds || []).length, errores: [] }; });

  function buscar(arr, campo, val, que) { var x = arr.filter(function (y) { return y[campo] === val; })[0]; if (!x) throw Err('NO_ENCONTRADO', 'No encontramos ese ' + que + '.'); return x; }

  // ---------------------------------------------------------------- sesión / sobre
  function usuarioDeToken(tok) {
    var m = /^tok-fake-(dueño\/a|encargado|cajero)$/.exec(tok || ''); if (!m) return null;
    var u = db.usuarios.filter(function (x) { return x.rol === m[1] && x.estado === 'activo'; })[0] || db.usuarios[0];
    return { usuarioId: u.usuarioId, nombre: u.nombre, rol: m[1], email: u.email, foto: u.foto || '', genero: u.genero || '' };
  }
  function sesion(u, conToken) {
    var r = {};
    if (conToken) r.token = 'tok-fake-' + u.rol;
    r.usuario = { usuarioId: u.usuarioId, nombre: u.nombre, rol: u.rol, email: u.email || '', foto: u.foto || '', genero: u.genero || '' };
    r.permisos = permisosDe(u.rol);
    var c = clone(db.config); delete c.salt_sesion; c['marca.color'] = cfg.marca; r.config = c;
    r.modulos = db.modulos.slice();
    r.instalacion = { modo: cfg.demo ? 'demo' : 'cliente', vence: cfg.demo ? db.config.vence : '', demo: cfg.demo };
    return r;
  }
  function llamar(token, accion, payload) {
    try {
      if (cfg.serverError) throw Err('ERROR', 'El servidor tuvo un problema. Probá de nuevo en un momento.');
      var u = usuarioDeToken(token); if (!u) throw Err('NO_AUTENTICADO', 'Tu sesión venció. Ingresá de nuevo.');
      if (accion === 'lote.leer') return { ok: true, data: ((payload && payload.llamadas) || []).slice(0, 40).map(function (x) { return /\.(listar|obtener|ticket)$/.test(String(x && x.a)) ? llamar(token, x.a, x.p) : { ok: false, code: 'NO_ENCONTRADO', mensaje: 'Esa acción no existe.' }; }) };
      var a = A[accion]; if (!a) throw Err('NO_ENCONTRADO', 'Esa acción no existe: ' + accion + '.');
      if (a.permiso && !puede(u.rol, a.permiso)) throw Err('SIN_PERMISO', 'No tenés permiso para hacer esto.');
      if (cfg.demo && new Date(db.config.vence).getTime() < NOW() && a.permiso && /:total$/.test(a.permiso)) throw Err('DEMO_VENCIDA', 'La demostración venció. Escribinos para seguir probando.');
      return { ok: true, data: a.fn(u, payload || {}) };
    } catch (e) {
      if (e && e.code) { var o = { ok: false, code: e.code, mensaje: e.mensaje }; if (e.campos) o.campos = e.campos; if (e.existenteId) o.existenteId = e.existenteId; return o; }
      return { ok: false, code: 'ERROR', mensaje: 'Algo salió mal en la API falsa: ' + (e && e.message) };
    }
  }
  var intentos = 0, clavesFalsas = {};
  function perfilesImpl() {
    var tj = cfg.tarjetas && db.config.loginTarjetas !== false, orden = { 'dueño/a': 0, encargado: 1, cajero: 2 };
    if (!tj) return { ok: true, data: { tarjetas: false, perfiles: [] } };
    return { ok: true, data: { tarjetas: true, perfiles: db.usuarios.filter(function (x) { return x.estado !== 'suspendido'; }).sort(function (a, b) { return orden[a.rol] - orden[b.rol]; }).map(function (x) { return { usuarioId: x.usuarioId, nombre: x.nombre, rol: x.rol, genero: x.genero || '', foto: x.foto || '', primeraVez: x.estado === 'pendiente' }; }) } };
  }
  function ubicar(p) {
    var k = sinTilde(String(p.identificador || p.email || p.nombre || '')).toLowerCase().trim();
    if (p.usuarioId) return db.usuarios.filter(function (x) { return x.usuarioId === p.usuarioId; })[0];
    return db.usuarios.filter(function (x) { return (x.email && x.email.toLowerCase() === k) || sinTilde(x.nombre).toLowerCase() === k; })[0];
  }
  function loginImpl(p) {
    p = p || {};
    var u = ubicar(p);
    if (!u || u.estado === 'pendiente' || !p.password || p.password === 'mal') { if (++intentos >= 5) return { ok: false, code: 'BLOQUEADO', mensaje: 'Demasiados intentos. Probá de nuevo en 15 minutos.' }; return { ok: false, code: 'NO_AUTENTICADO', mensaje: 'La persona o la contraseña no son correctas.' }; }
    intentos = 0;
    return { ok: true, data: sesion({ usuarioId: u.usuarioId, nombre: u.nombre, rol: u.rol, email: u.email, foto: u.foto, genero: u.genero }, true) };
  }
  function activarImpl(p) {
    p = p || {};
    var u = ubicar(p);
    if (!u || u.estado !== 'pendiente' || !p.codigo || String(p.codigo).toUpperCase() === 'MAL') return { ok: false, code: 'NO_AUTENTICADO', mensaje: 'El código de invitación no es válido o ya venció. Pedile a quien administra el panel que te mande uno nuevo.' };
    if (!p.password || p.password.length < 10) return { ok: false, code: 'VALIDACION', mensaje: 'La contraseña tiene que tener al menos 10 caracteres.', campos: { password: 'Mínimo 10 caracteres.' } };
    u.estado = 'activo';
    return loginImpl({ usuarioId: u.usuarioId, password: p.password });
  }
  function obtenerModuloImpl(token, nombre) {
    var M = g.__MODULOS__ || {};
    if (nombre !== 'estilos' && nombre !== 'comun' && !usuarioDeToken(token)) return { ok: false, code: 'NO_AUTENTICADO', mensaje: 'Tu sesión venció. Ingresá de nuevo.' };
    if (nombre === '__tronco' || !M[nombre]) return null;
    return M[nombre];
  }

  // ---------------------------------------------------------------- emulación de google.script.run
  var IMPL = {
    api: function (t, a, p) { return llamar(t, a, p); },
    login: loginImpl, activarInvitacion: activarImpl, perfilesLogin: perfilesImpl, obtenerModulo: obtenerModuloImpl,
    logout: function () { return { ok: true, data: { salio: true } }; }
  };
  function runner(ok, ko) {
    var r = { withSuccessHandler: function (f) { return runner(f, ko); }, withFailureHandler: function (f) { return runner(ok, f); } };
    Object.keys(IMPL).forEach(function (n) {
      r[n] = function () {
        var args = arguments;
        setTimeout(function () {
          if (cfg.fallar > 0) { cfg.fallar--; if (ko) ko(new Error('Fallo de red simulado')); return; }
          var v; try { v = IMPL[n].apply(null, args); } catch (e) { if (ko) ko(e); return; }
          if (ok) ok(v);
        }, cfg.latencia);
      };
    });
    return r;
  }
  g.google = g.google || {}; g.google.script = { run: runner(null, null) };

  function reiniciar() { db = seed(); g.ApiFalsa.db = db; }
  g.ApiFalsa = { llamar: llamar, configurar: function (o) { for (var k in o) cfg[k] = o[k]; if (o.marca) db.config['marca.color'] = o.marca; }, reiniciar: reiniciar, cfg: cfg, db: null, permisosDe: permisosDe, ahora: NOW };
  reiniciar();
})(window);
