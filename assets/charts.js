/* ═══════════════════════════════════════════
   charts.js — Todas las gráficas Chart.js
   Depende de: window.Dash (parser.js)
   ═══════════════════════════════════════════ */
(function () {

  Chart.defaults.color = '#8b90b0';
  Chart.defaults.font.family = "'Segoe UI', system-ui, sans-serif";
  Chart.defaults.plugins.legend.labels.boxWidth = 10;
  Chart.defaults.plugins.legend.labels.font = { size: 11 };

  const G = { color:'rgba(46,51,80,0.6)' };
  const T = { color:'#8b90b0', font:{ size:10 } };
  const fmtK = v => {
    if (v === null || v === undefined || isNaN(v)) return '$0';
    const a = Math.abs(v);
    const s = v < 0 ? '-' : '';
    return a >= 1e6 ? s+'$'+(a/1e6).toFixed(2)+'M' : s+'$'+(a/1e3).toFixed(0)+'K';
  };
  const fmt = v => (v<0?'-':'')+'$'+Math.abs(Math.round(v)).toLocaleString('es-MX');
  const avg = arr => { const f=arr.filter(v=>v!==null&&!isNaN(v)); return f.length?f.reduce((s,v)=>s+v,0)/f.length:0; };

  const instances = {};
  function mk(id, cfg) {
    if (instances[id]) instances[id].destroy();
    const ctx = document.getElementById(id);
    if (!ctx) return null;
    instances[id] = new Chart(ctx, cfg);
    return instances[id];
  }

  const baseOpts = (extra={}) => ({
    responsive:true, maintainAspectRatio:false,
    plugins:{ legend:{position:'top'}, tooltip:{callbacks:{label:c=>' '+fmt(c.raw)}} },
    scales:{
      x:{ grid:{color:G.color}, ticks:{...T, maxRotation:45} },
      y:{ grid:{color:G.color}, ticks:{...T, callback:fmtK} },
    }, ...extra
  });

  const numOpts = (extra={}) => ({
    responsive:true, maintainAspectRatio:false,
    plugins:{ legend:{position:'top'}, tooltip:{callbacks:{label:c=>` ${c.raw}`}} },
    scales:{
      x:{ grid:{color:G.color}, ticks:{...T, maxRotation:45} },
      y:{ grid:{color:G.color}, ticks:T },
    }, ...extra
  });

  function metaLine(n, meta, color='#f87171') {
    return { label:'Meta', data:Array(n).fill(meta), type:'line',
      borderColor:color+'99', borderWidth:1.5, borderDash:[6,4], pointRadius:0, fill:false };
  }

  // ══════════════════════════════════════════
  //  VENTAS
  // ══════════════════════════════════════════
  function buildVentas() {
    const V = window.Dash.ventas;
    const labels = V.cortes.map(c=>c.label);
    const VT     = V.data['VENTAS TOTALES'];
    const meta   = V.metas['VENTAS TOTALES'];

    // Línea total cortes
    mk('chartTotalCortes', { type:'line', data:{ labels, datasets:[
      { label:'Ventas Netas', data:VT, borderColor:'#4f8ef7', backgroundColor:'rgba(79,142,247,0.08)', borderWidth:2, pointRadius:3, pointBackgroundColor:'#4f8ef7', tension:.35, fill:true },
      metaLine(labels.length, meta),
    ]}, options:baseOpts() });

    // Barras por mes
    const colors = ['#4f8ef7','#22c55e','#f59e0b','#a78bfa','#22d3ee'];
    mk('chartMeses', { type:'bar', data:{ labels:V.meses.map(m=>m.charAt(0)+m.slice(1).toLowerCase()),
      datasets:[
        { label:'Ventas (último corte)', data:V.meses.map(m=>V.acumuladoMes[m]?.['VENTAS TOTALES']||0), backgroundColor:V.meses.map((_,i)=>colors[i%colors.length]), borderRadius:6, borderSkipped:false },
        { label:'Meta', data:Array(V.meses.length).fill(meta), type:'line', borderColor:'rgba(248,113,113,.7)', borderWidth:2, borderDash:[5,4], pointRadius:5, pointStyle:'crossRot', pointBackgroundColor:'#f87171', fill:false },
      ]}, options:baseOpts() });

    // Dona
    const promedios = V.canalesVenta.map(c=>avg(V.data[c]));
    const total = promedios.reduce((s,v)=>s+v,0);
    mk('chartDona', { type:'doughnut', data:{
      labels: V.canalesVenta.map(c=>c.charAt(0)+c.slice(1).toLowerCase()),
      datasets:[{ data:promedios, backgroundColor:V.canalesVenta.map(c=>V.canalConfig[c].color), borderColor:'#1a1d27', borderWidth:3, hoverOffset:6 }]},
      options:{ responsive:true, cutout:'68%',
        plugins:{ legend:{position:'right'}, tooltip:{callbacks:{label:c=>` ${c.label}: ${((c.raw/total)*100).toFixed(1)}% · ${fmt(c.raw)}`}} } } });

    // Cumplimiento
    const pcts = V.canalesVenta.map(c=>+((avg(V.data[c])/(V.metas[c]||1))*100).toFixed(1));
    mk('chartCumplimiento', { type:'bar', data:{
      labels: V.canalesVenta.map(c=>c.charAt(0)+c.slice(1).toLowerCase()),
      datasets:[
        { label:'Cumplimiento %', data:pcts, backgroundColor:pcts.map(p=>p>=100?'#22c55e':p>=85?'#f59e0b':'#f87171'), borderRadius:6, borderSkipped:false },
        { label:'Meta 100%', data:Array(4).fill(100), type:'line', borderColor:'rgba(255,255,255,.2)', borderWidth:1.5, borderDash:[4,4], pointRadius:0, fill:false },
      ]},
      options:{ responsive:true, maintainAspectRatio:false,
        plugins:{ legend:{position:'top'}, tooltip:{callbacks:{label:c=>` ${c.raw}%`}} },
        scales:{ x:{grid:{display:false},ticks:T}, y:{grid:{color:G.color},ticks:{...T,callback:v=>v+'%'},suggestedMin:60,suggestedMax:130} } } });
  }

  // Canal individual
  window.buildCanalChart = function(canal, mesFilter) {
    const V  = window.Dash.ventas;
    const id = {'PUNTO DE VENTA':'chartPV','CALL CENTER':'chartCC','PLATAFORMA':'chartPLAT','ASESORES':'chartASE'}[canal];
    if (!id) return;
    const idxs   = mesFilter==='TODOS' ? V.cortes.map((_,i)=>i) : V.cortes.map((c,i)=>c.mes===mesFilter?i:-1).filter(i=>i>=0);
    const labels = idxs.map(i=>V.cortes[i].label);
    const vals   = idxs.map(i=>V.data[canal][i]);
    const color  = V.canalConfig[canal].color;
    mk(id, { type:'line', data:{ labels, datasets:[
      { label:'Ventas Netas', data:vals, borderColor:color, backgroundColor:color+'22', borderWidth:2, pointRadius:4, pointBackgroundColor:color, tension:.35, fill:true },
      metaLine(labels.length, V.metas[canal], '#f87171'),
    ]}, options:baseOpts() });
  };

  // Apilado
  window.buildChartApilado = function() {
    const V = window.Dash.ventas;
    mk('chartApilado', { type:'bar', data:{
      labels: V.cortes.map(c=>c.label),
      datasets: V.canalesVenta.map(c=>({
        label: c.charAt(0)+c.slice(1).toLowerCase(),
        data: V.data[c], backgroundColor: V.canalConfig[c].color+'cc',
        borderColor: V.canalConfig[c].color, borderWidth:0, borderRadius:2,
      }))},
      options:{ responsive:true, maintainAspectRatio:false,
        plugins:{ legend:{position:'top'}, tooltip:{mode:'index',callbacks:{label:c=>` ${c.dataset.label}: ${fmt(c.raw)}`}} },
        scales:{ x:{stacked:true,grid:{color:G.color},ticks:{...T,maxRotation:45}}, y:{stacked:true,grid:{color:G.color},ticks:{...T,callback:fmtK}} } } });
  };

  window.buildMesChart = function(canvasId, mes, color) {
    const V    = window.Dash.ventas;
    const idxs = V.cortes.map((c,i)=>c.mes===mes?i:-1).filter(i=>i>=0);
    mk(canvasId, { type:'bar', data:{
      labels: idxs.map(i=>V.cortes[i].label),
      datasets:[
        { label:'Ventas Totales', data:idxs.map(i=>V.data['VENTAS TOTALES'][i]), backgroundColor:color+'99', borderColor:color, borderWidth:1, borderRadius:5 },
        metaLine(idxs.length, V.metas['VENTAS TOTALES'], '#f87171'),
      ]}, options:{ responsive:true, maintainAspectRatio:false,
        plugins:{legend:{display:false},tooltip:{callbacks:{label:c=>' '+fmt(c.raw)}}},
        scales:{ x:{grid:{display:false},ticks:T}, y:{grid:{color:G.color},ticks:{...T,callback:fmtK}} } } });
  };

  // ══════════════════════════════════════════
  //  OPERACIONES
  // ══════════════════════════════════════════
  window.buildOpe = function() {
    const O = window.Dash.ope;
    const labels = O.cortes.map(c=>c.label);

    // Compras
    mk('chartCompras', { type:'line', data:{ labels, datasets:[
      { label:'Compras', data:O.data['COMPRA'], borderColor:'#4f8ef7', backgroundColor:'rgba(79,142,247,0.08)', borderWidth:2, pointRadius:3, pointBackgroundColor:'#4f8ef7', tension:.35, fill:true },
      metaLine(labels.length, O.metas['COMPRA']),
    ]}, options:baseOpts() });

    // Devoluciones
    mk('chartDevoluciones', { type:'bar', data:{ labels, datasets:[
      { label:'Devoluciones', data:O.data['DEVOLUCIONES'], backgroundColor:O.data['DEVOLUCIONES'].map(v=>v!==null&&v<O.metas['DEVOLUCIONES']?'#22c55e99':'#f8717199'), borderRadius:4 },
      metaLine(labels.length, O.metas['DEVOLUCIONES'], '#f59e0b'),
    ]}, options:numOpts() });

    // Nivel de servicio $
    mk('chartNivelServicio', { type:'line', data:{ labels, datasets:[
      { label:'Nivel Serv. ($)', data:O.data['NIVEL_SERVICIO'], borderColor:'#f59e0b', backgroundColor:'rgba(245,158,11,0.08)', borderWidth:2, pointRadius:3, tension:.35, fill:true },
    ]}, options:baseOpts() });

    // Nivel servicio %
    mk('chartNivelPct', { type:'line', data:{ labels, datasets:[
      { label:'% Nivel Serv.', data:O.data['NIVEL_SERVICIO_PCT'], borderColor:'#22d3ee', borderWidth:2, pointRadius:3, tension:.35, fill:false },
      { label:'Meta 8.8%', data:Array(labels.length).fill(8.8), borderColor:'#f87171aa', borderWidth:1.5, borderDash:[5,4], pointRadius:0, fill:false },
    ]}, options:{ responsive:true, maintainAspectRatio:false,
      plugins:{legend:{position:'top'},tooltip:{callbacks:{label:c=>` ${c.raw?.toFixed(2)}%`}}},
      scales:{ x:{grid:{color:G.color},ticks:{...T,maxRotation:45}}, y:{grid:{color:G.color},ticks:{...T,callback:v=>v+'%'}} } } });

    // Máquinas
    mk('chartMaquinas', { type:'bar', data:{ labels, datasets:[
      { label:'Reparadas', data:O.data['MAQUINAS'], backgroundColor:O.data['MAQUINAS'].map(v=>v!==null?'#a78bfa99':'#30363d'), borderRadius:4 },
      metaLine(labels.length, O.metas['MAQUINAS'], '#22c55e'),
    ]}, options:numOpts() });

    // Días reparación
    mk('chartDias', { type:'bar', data:{ labels, datasets:[
      { label:'Días', data:O.data['DIAS_REPARACION'], backgroundColor:O.data['DIAS_REPARACION'].map(v=>v!==null&&v<=O.metas['DIAS_REPARACION']?'#22c55e99':'#f8717199'), borderRadius:4 },
      metaLine(labels.length, O.metas['DIAS_REPARACION'], '#f59e0b'),
    ]}, options:numOpts() });
  };

  // ══════════════════════════════════════════
  //  ADMINISTRACIÓN
  // ══════════════════════════════════════════
  window.buildAdmon = function() {
    const A = window.Dash.admon;
    const labels = A.cortes.map(c=>c.label);

    // Ingresos
    mk('chartIngresos', { type:'line', data:{ labels, datasets:[
      { label:'Ingresos', data:A.data['INGRESOS'], borderColor:'#4f8ef7', backgroundColor:'rgba(79,142,247,0.08)', borderWidth:2, pointRadius:4, tension:.35, fill:true },
      metaLine(labels.length, A.metas['INGRESOS']),
    ]}, options:baseOpts() });

    // Ingresos vs Egresos agrupado
    mk('chartIngEgr', { type:'bar', data:{ labels, datasets:[
      { label:'Ingresos', data:A.data['INGRESOS'], backgroundColor:'#4f8ef799', borderRadius:4 },
      { label:'Egresos',  data:A.data['EGRESOS'],  backgroundColor:'#f8717166', borderRadius:4 },
    ]}, options:baseOpts() });

    // Flujo efectivo
    mk('chartFlujo', { type:'bar', data:{ labels, datasets:[
      { label:'Flujo de Efectivo', data:A.data['FLUJO'],
        backgroundColor:A.data['FLUJO'].map(v=>v!==null&&v>=0?'#22c55e66':'#f8717166'),
        borderColor:A.data['FLUJO'].map(v=>v!==null&&v>=0?'#22c55e':'#f87171'),
        borderWidth:1, borderRadius:4 },
    ]}, options:baseOpts() });

    // Gastos operación
    mk('chartGastos', { type:'line', data:{ labels, datasets:[
      { label:'Gastos Operación', data:A.data['GASTOS_OPERACION'], borderColor:'#f87171', backgroundColor:'rgba(248,113,113,0.08)', borderWidth:2, pointRadius:4, tension:.35, fill:true },
      metaLine(labels.length, A.metas['GASTOS_OPERACION'], '#f59e0b'),
    ]}, options:baseOpts() });

    // Plazo de cobro
    mk('chartPlazoCobro', { type:'bar', data:{ labels, datasets:[
      { label:'Días', data:A.data['PLAZO_COBRO'],
        backgroundColor:A.data['PLAZO_COBRO'].map(v=>v!==null&&v<A.metas['PLAZO_COBRO']?'#22c55e99':'#f8717199'), borderRadius:4 },
      metaLine(labels.length, A.metas['PLAZO_COBRO'], '#f59e0b'),
    ]}, options:numOpts() });

    // % Recuperación
    mk('chartRecuperacion', { type:'line', data:{ labels, datasets:[
      { label:'% Recuperación', data:A.data['RECUPERACION'].map(v=>v!==null?+(v*100).toFixed(1):null), borderColor:'#22d3ee', borderWidth:2, pointRadius:4, tension:.35, fill:false },
      { label:'Meta', data:Array(labels.length).fill(A.metas['RECUPERACION']), borderColor:'#f87171aa', borderWidth:1.5, borderDash:[5,4], pointRadius:0, fill:false },
    ]}, options:{ responsive:true, maintainAspectRatio:false,
      plugins:{legend:{position:'top'},tooltip:{callbacks:{label:c=>` ${c.raw?.toFixed(1)}%`}}},
      scales:{ x:{grid:{color:G.color},ticks:{...T,maxRotation:45}}, y:{grid:{color:G.color},ticks:{...T,callback:v=>v+'%'}} } } });
  };

  // ══════════════════════════════════════════
  //  CONSOLIDADO
  // ══════════════════════════════════════════
  window.buildConsolidado = function() {
    const V = window.Dash.ventas;
    const O = window.Dash.ope;
    const A = window.Dash.admon;

    // Ventas vs Compras por mes
    const VM = V.meses;
    const vtMes  = VM.map(m=>V.acumuladoMes[m]?.['VENTAS TOTALES']||0);
    const cmpMes = VM.map(m=>{
      const idxs = O.cortes.map((c,i)=>c.mes===m?i:-1).filter(i=>i>=0);
      if (!idxs.length) return null;
      const vals = idxs.map(i=>O.data['COMPRA'][i]).filter(v=>v!==null);
      return vals.length ? vals.reduce((s,v)=>s+v,0)/vals.length : null;
    });
    mk('chartConsVtasCmp', { type:'line', data:{ labels:VM.map(m=>m.charAt(0)+m.slice(1).toLowerCase()),
      datasets:[
        { label:'Ventas', data:vtMes, borderColor:'#4f8ef7', borderWidth:2, pointRadius:5, tension:.4, fill:false },
        { label:'Compras (prom)', data:cmpMes, borderColor:'#a78bfa', borderWidth:2, pointRadius:5, tension:.4, fill:false, borderDash:[5,3] },
      ]}, options:baseOpts() });

    // Ingresos vs Egresos Admon por mes
    const AM = A.meses;
    const ingMes = AM.map(m=>{ const i=A.cortes.map((c,j)=>c.mes===m?j:-1).filter(j=>j>=0); return i.length?avg(i.map(j=>A.data['INGRESOS'][j])):null; });
    const egrMes = AM.map(m=>{ const i=A.cortes.map((c,j)=>c.mes===m?j:-1).filter(j=>j>=0); return i.length?avg(i.map(j=>A.data['EGRESOS'][j])):null; });
    mk('chartConsIngEgr', { type:'bar', data:{
      labels: AM.map(m=>m.charAt(0)+m.slice(1).toLowerCase()),
      datasets:[
        { label:'Ingresos', data:ingMes, backgroundColor:'#4f8ef799', borderRadius:5 },
        { label:'Egresos',  data:egrMes, backgroundColor:'#f8717166', borderRadius:5 },
      ]}, options:baseOpts() });

    // Tendencia cruzada (último corte por mes, los 3 deptos)
    const allMeses = [...new Set([...VM,...AM])];
    const vt3  = allMeses.map(m=>V.acumuladoMes[m]?.['VENTAS TOTALES']||null);
    const cmp3 = allMeses.map(m=>{ const i=O.cortes.map((c,j)=>c.mes===m?j:-1).filter(j=>j>=0); if(!i.length) return null; const v=i.map(j=>O.data['COMPRA'][j]).filter(v=>v!==null); return v.length?v[v.length-1]:null; });
    const ing3 = allMeses.map(m=>{ const i=A.cortes.map((c,j)=>c.mes===m?j:-1).filter(j=>j>=0); if(!i.length) return null; const v=i.map(j=>A.data['INGRESOS'][j]).filter(v=>v!==null); return v.length?v[v.length-1]:null; });
    mk('chartConsTendencia', { type:'line', data:{
      labels: allMeses.map(m=>m.charAt(0)+m.slice(1).toLowerCase()),
      datasets:[
        { label:'Ventas',   data:vt3,  borderColor:'#4f8ef7', borderWidth:2, pointRadius:5, tension:.4, fill:false },
        { label:'Compras',  data:cmp3, borderColor:'#a78bfa', borderWidth:2, pointRadius:5, tension:.4, fill:false, borderDash:[5,3] },
        { label:'Ingresos', data:ing3, borderColor:'#22c55e', borderWidth:2, pointRadius:5, tension:.4, fill:false, borderDash:[3,3] },
      ]}, options:baseOpts() });
  };

  document.addEventListener('dashready', buildVentas);
})();
