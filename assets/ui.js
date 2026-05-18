/* ═══════════════════════════════════════════
   ui.js — KPIs, navegación, tablas, filtros
   Depende de: window.Dash (parser.js)
   ═══════════════════════════════════════════ */
(function () {

  const fmt  = v => { if(v===null||isNaN(v)) return '—'; return (v<0?'-':'')+'$'+Math.abs(Math.round(v)).toLocaleString('es-MX'); };
  const fmtK = v => { if(v===null||isNaN(v)) return '—'; const a=Math.abs(v); const s=v<0?'-':''; return a>=1e6?s+'$'+(a/1e6).toFixed(2)+'M':s+'$'+(a/1e3).toFixed(0)+'K'; };
  const avg  = arr => { const f=arr.filter(v=>v!==null&&!isNaN(v)); return f.length?f.reduce((s,v)=>s+v,0)/f.length:0; };
  const pct  = (a,b) => b?((a/b)*100).toFixed(1):0;

  // ── Header ──────────────────────────────────────────────────
  function buildHeader() {
    const V = window.Dash.ventas;
    const O = window.Dash.ope;
    const A = window.Dash.admon;
    const allMeses = [...new Set([...V.meses,...O.meses,...A.meses])];
    const MES_ABREV = {ENERO:'Ene',FEBRERO:'Feb',MARZO:'Mar',ABRIL:'Abr',MAYO:'May',JUNIO:'Jun'};
    const first = MES_ABREV[allMeses[0]]||allMeses[0];
    const last  = MES_ABREV[allMeses[allMeses.length-1]]||allMeses[allMeses.length-1];
    document.getElementById('hdr-periodo').innerHTML  = `Período: <span>${first}–${last} 2026</span>`;
    document.getElementById('hdr-cortes').innerHTML   = `Cortes ventas: <span>${V.cortes.length}</span>`;
    document.getElementById('hdr-canales').innerHTML  = `Departamentos: <span>3</span>`;
  }

  // ── KPI Ventas ───────────────────────────────────────────────
  function buildKPIsVentas() {
    const V    = window.Dash.ventas;
    const grid = document.getElementById('kpi-grid-ventas');
    if (!grid) return;
    grid.innerHTML = '';
    [...V.canalesVenta, 'VENTAS TOTALES'].forEach(canal => {
      const cfg  = V.canalConfig[canal];
      const vals = V.data[canal] || [];
      const meta = V.metas[canal] || 1;
      const prom = avg(vals);
      const diff = ((prom-meta)/meta*100).toFixed(1);
      const pctV = Math.min((prom/meta)*100,150);
      const bCls = diff>=0?'up':diff>=-10?'warn':'down';
      grid.innerHTML += `
        <div class="kpi-card ${cfg.cls}">
          <div class="kpi-label">${cfg.icon} ${canal}</div>
          <div class="kpi-value">${fmtK(prom)}</div>
          <div class="kpi-sub">Promedio por corte</div>
          <div class="kpi-badge ${bCls}">${diff>=0?'▲':'▼'} ${Math.abs(diff)}% vs meta</div>
          <div class="kpi-meta">Meta: ${fmt(meta)}</div>
          <div class="progress-bar"><div class="progress-fill" style="width:${Math.min(pctV,100)}%;background:${cfg.color}"></div></div>
        </div>`;
    });
  }

  // ── KPI Operaciones ──────────────────────────────────────────
  function buildKPIsOpe() {
    const O    = window.Dash.ope;
    const grid = document.getElementById('kpi-grid-ope');
    if (!grid) return;
    grid.innerHTML = '';
    const cfg = [
      {key:'COMPRA',         icon:'📦', cls:'blue',   label:'Compras', tipo:'$'},
      {key:'DEVOLUCIONES',   icon:'↩️', cls:'green',  label:'Devoluciones', tipo:'num', metaOp:'<'},
      {key:'MAQUINAS',       icon:'🔧', cls:'purple', label:'Máqs. Reparadas', tipo:'num'},
      {key:'DIAS_REPARACION',icon:'⏱️', cls:'amber',  label:'Días Reparación', tipo:'num', metaOp:'<='},
    ];
    cfg.forEach(c => {
      const vals = O.data[c.key]||[];
      const meta = O.metas[c.key]||1;
      const prom = avg(vals);
      const diff = ((prom-meta)/meta*100).toFixed(1);
      const ok   = c.metaOp==='<'||c.metaOp==='<='?prom<meta:prom>=meta;
      const bCls = ok?'up':Math.abs(diff)<=15?'warn':'down';
      const valFmt = c.tipo==='$'?fmtK(prom):prom.toFixed(1);
      grid.innerHTML += `
        <div class="kpi-card ${c.cls}">
          <div class="kpi-label">${c.icon} ${c.label}</div>
          <div class="kpi-value">${valFmt}</div>
          <div class="kpi-sub">Promedio por corte</div>
          <div class="kpi-badge ${bCls}">${ok?'✓':'▼'} Meta: ${c.tipo==='$'?fmtK(meta):meta}</div>
          <div class="progress-bar"><div class="progress-fill" style="width:${Math.min(Math.abs(+diff)+70,100)}%;background:${ok?'#22c55e':'#f87171'}"></div></div>
        </div>`;
    });
  }

  // ── KPI Administración ───────────────────────────────────────
  function buildKPIsAdmon() {
    const A    = window.Dash.admon;
    const grid = document.getElementById('kpi-grid-admon');
    if (!grid) return;
    grid.innerHTML = '';
    const cfg = [
      {key:'INGRESOS',        icon:'💵', cls:'blue',   label:'Ingresos', tipo:'$', metaOp:'>='},
      {key:'PLAZO_COBRO',     icon:'📅', cls:'green',  label:'Plazo Cobro', tipo:'dias', metaOp:'<'},
      {key:'RECUPERACION',    icon:'📈', cls:'amber',  label:'% Recuperación', tipo:'pct', metaOp:'<'},
      {key:'EGRESOS',         icon:'💸', cls:'purple', label:'Egresos', tipo:'$', metaOp:'<='},
      {key:'GASTOS_OPERACION',icon:'⚙️', cls:'red',    label:'Gastos Oper.', tipo:'$', metaOp:'<='},
      {key:'FLUJO',           icon:'🌊', cls:'blue',   label:'Flujo Efectivo', tipo:'$', metaOp:'>0'},
    ];
    cfg.forEach(c => {
      const vals = A.data[c.key]||[];
      const meta = A.metas[c.key]||0;
      const prom = avg(vals);
      const ok   = c.metaOp==='>0'?prom>0:(c.metaOp==='<'||c.metaOp==='<='?prom<=(meta||Infinity):prom>=(meta||0));
      const bCls = ok?'up':c.key==='FLUJO'&&prom<0?'down':'warn';
      let valFmt = c.tipo==='$'?fmtK(prom):c.tipo==='pct'?(prom*100).toFixed(1)+'%':prom.toFixed(1);
      let metaFmt = c.tipo==='$'?fmtK(meta):meta||'—';
      grid.innerHTML += `
        <div class="kpi-card ${c.cls}">
          <div class="kpi-label">${c.icon} ${c.label}</div>
          <div class="kpi-value">${valFmt}</div>
          <div class="kpi-sub">Promedio por corte</div>
          <div class="kpi-badge ${bCls}">${ok?'✓':'⚠'} Meta: ${metaFmt}</div>
          <div class="progress-bar"><div class="progress-fill" style="width:${ok?80:45}%;background:${ok?'#22c55e':'#f59e0b'}"></div></div>
        </div>`;
    });
  }

  // ── Semáforo Consolidado ─────────────────────────────────────
  function buildSemaforo() {
    const V = window.Dash.ventas;
    const O = window.Dash.ope;
    const A = window.Dash.admon;
    const el = document.getElementById('semaforo-list');
    if (!el) return;

    const items = [
      {label:'Ventas Totales',     val:avg(V.data['VENTAS TOTALES']),  meta:V.metas['VENTAS TOTALES'], tipo:'$', op:'>='},
      {label:'Call Center',        val:avg(V.data['CALL CENTER']),     meta:V.metas['CALL CENTER'],    tipo:'$', op:'>='},
      {label:'Asesores',           val:avg(V.data['ASESORES']),        meta:V.metas['ASESORES'],       tipo:'$', op:'>='},
      {label:'Compras',            val:avg(O.data['COMPRA'].filter(v=>v!==null)),    meta:O.metas['COMPRA'],         tipo:'$', op:'>='},
      {label:'Devoluciones',       val:avg(O.data['DEVOLUCIONES'].filter(v=>v!==null)), meta:O.metas['DEVOLUCIONES'], tipo:'num',op:'<'},
      {label:'Máqs. Reparadas',    val:avg(O.data['MAQUINAS'].filter(v=>v!==null)),  meta:O.metas['MAQUINAS'],       tipo:'num',op:'>='},
      {label:'Días Reparación',    val:avg(O.data['DIAS_REPARACION'].filter(v=>v!==null)),meta:O.metas['DIAS_REPARACION'],tipo:'num',op:'<='},
      {label:'Ingresos Admon',     val:avg(A.data['INGRESOS'].filter(v=>v!==null)),  meta:A.metas['INGRESOS'],       tipo:'$', op:'>='},
      {label:'Plazo de Cobro',     val:avg(A.data['PLAZO_COBRO'].filter(v=>v!==null)),meta:A.metas['PLAZO_COBRO'],   tipo:'dias',op:'<'},
      {label:'Flujo de Efectivo',  val:avg(A.data['FLUJO'].filter(v=>v!==null)),     meta:0,                         tipo:'$', op:'>0'},
    ];

    el.innerHTML = items.map(it => {
      const ok  = it.op==='>0'?it.val>0:(it.op==='<'||it.op==='<='?it.val<=it.meta:it.val>=it.meta);
      const warn= !ok && Math.abs((it.val-it.meta)/(it.meta||1))*100 < 15;
      const dot = ok?'🟢':warn?'🟡':'🔴';
      const valFmt = it.tipo==='$'?fmtK(it.val):it.tipo==='pct'?(it.val*100).toFixed(1)+'%':it.val.toFixed(1);
      const metaFmt= it.tipo==='$'?fmtK(it.meta):it.meta||'—';
      const diffPct= it.meta?((it.val-it.meta)/it.meta*100).toFixed(1):null;
      return `<div style="display:flex;justify-content:space-between;align-items:center;padding:8px 0;border-bottom:1px solid rgba(46,51,80,.5)">
        <span style="color:var(--muted);font-size:12px">${dot} ${it.label}</span>
        <span style="font-size:12px;font-weight:600;color:${ok?'#22c55e':warn?'#f59e0b':'#f87171'}">${valFmt} <span style="font-size:10px;color:var(--muted);font-weight:400">/ meta ${metaFmt}${diffPct?` (${diffPct>0?'+':''}${diffPct}%)`:''}</span></span>
      </div>`;
    }).join('');
  }

  // ── Filtros de mes (Ventas) ──────────────────────────────────
  function buildMonthFilters() {
    const V = window.Dash.ventas;
    const row = document.getElementById('month-filter-row');
    if (!row) return;
    const MES_ABREV = {ENERO:'Enero',FEBRERO:'Febrero',MARZO:'Marzo',ABRIL:'Abril',MAYO:'Mayo',JUNIO:'Junio'};
    row.innerHTML = `<span class="filter-label">Mes:</span>
      <button class="month-btn active" onclick="filterCanal('TODOS',this)">Todos</button>`;
    V.meses.forEach(mes => {
      row.innerHTML += `<button class="month-btn" onclick="filterCanal('${mes}',this)">${MES_ABREV[mes]||mes}</button>`;
    });
  }

  // ── Sección gráficas por mes (Ventas) ───────────────────────
  function buildMesSection() {
    const V    = window.Dash.ventas;
    const cont = document.getElementById('mes-charts-container');
    if (!cont) return;
    const colors = ['#4f8ef7','#22c55e','#f59e0b','#a78bfa','#22d3ee','#f87171'];
    cont.innerHTML = `
      <div class="charts-row cols-1">
        <div class="panel">
          <div class="panel-title">Canales Apilados por Corte</div>
          <div class="panel-sub">Composición de cada corte por canal de venta</div>
          <div class="chart-box" style="min-height:260px"><canvas id="chartApilado" role="img" aria-label="Barras apiladas de canales por corte"></canvas></div>
        </div>
      </div>`;
    const n = V.meses.length;
    const cls = n<=3?'cols-3':n<=4?'cols-2e':'cols-3';
    let rows = `<div class="charts-row ${cls}">`;
    V.meses.forEach((mes,i) => {
      const nC = V.cortes.filter(c=>c.mes===mes).length;
      const lbl = mes.charAt(0)+mes.slice(1).toLowerCase();
      rows += `<div class="panel">
        <div class="panel-title">${lbl} · ${nC} corte${nC!==1?'s':''}</div>
        <canvas id="chartMes_${mes}" height="130" data-mes="${mes}" data-color="${colors[i%colors.length]}" role="img" aria-label="Ventas ${lbl}"></canvas>
      </div>`;
    });
    rows += '</div>';
    cont.innerHTML += rows;
  }

  // ── Tabla Ventas ─────────────────────────────────────────────
  function buildTablaVentas() {
    const V   = window.Dash.ventas;
    const div = document.getElementById('tabla-ventas');
    if (!div) return;
    let h = '<table><thead><tr><th>Canal</th>';
    V.cortes.forEach(c => { h += `<th>${c.label}</th>`; });
    h += '<th>Promedio</th><th>vs Meta</th></tr></thead><tbody>';
    [...V.canalesVenta,'VENTAS TOTALES'].forEach(canal => {
      const cfg  = V.canalConfig[canal];
      const vals = V.data[canal]||[];
      const meta = V.metas[canal]||1;
      const prom = avg(vals);
      const diff = ((prom-meta)/meta*100).toFixed(1);
      const pCls = diff>=0?'green':diff>=-10?'amber':'red';
      h += `<tr><td><span class="dot" style="background:${cfg.color}"></span>${canal}</td>`;
      vals.forEach(v => { h += `<td>${fmtK(v)}</td>`; });
      h += `<td><strong>${fmtK(prom)}</strong></td>`;
      h += `<td><span class="pill ${pCls}">${diff>=0?'▲':'▼'}${Math.abs(diff)}%</span></td></tr>`;
    });
    h += '</tbody></table>';
    div.innerHTML = h;
  }

  // ── Tabla Operaciones ────────────────────────────────────────
  function buildTablaOpe() {
    const O   = window.Dash.ope;
    const div = document.getElementById('tabla-ope');
    if (!div) return;
    const INDS = O.indicadores||[];
    let h = '<table><thead><tr><th>Indicador</th>';
    O.cortes.forEach(c => { h += `<th>${c.label}</th>`; });
    h += '<th>Promedio</th><th>Meta</th></tr></thead><tbody>';
    INDS.forEach(ind => {
      const vals = O.data[ind.key]||[];
      const prom = avg(vals.filter(v=>v!==null));
      const meta = O.metas[ind.key];
      const ok   = ind.metaOp==='<'||ind.metaOp==='<='?prom<=meta:prom>=meta;
      const pCls = ok?'green':'red';
      const fv   = ind.tipo==='$'?fmtK:v=>v!==null?v.toFixed(1):'—';
      h += `<tr><td><span class="dot" style="background:${ind.color}"></span>${ind.label}</td>`;
      vals.forEach(v => { h += `<td>${fv(v)}</td>`; });
      h += `<td><strong>${fv(prom)}</strong></td>`;
      h += `<td><span class="pill ${pCls}">${ind.tipo==='$'?fmtK(meta):meta}</span></td></tr>`;
    });
    h += '</tbody></table>';
    div.innerHTML = h;
  }

  // ── Tabla Administración ─────────────────────────────────────
  function buildTablaAdmon() {
    const A   = window.Dash.admon;
    const div = document.getElementById('tabla-admon');
    if (!div) return;
    const INDS = A.indicadores||[];
    let h = '<table><thead><tr><th>Indicador</th>';
    A.cortes.forEach(c => { h += `<th>${c.label}</th>`; });
    h += '<th>Promedio</th><th>Meta</th></tr></thead><tbody>';
    INDS.forEach(ind => {
      const vals = A.data[ind.key]||[];
      const prom = avg(vals.filter(v=>v!==null));
      const meta = A.metas[ind.key];
      const ok   = ind.metaOp==='>0'?prom>0:(ind.metaOp==='<'||ind.metaOp==='<='?prom<=meta:prom>=meta);
      const pCls = ok?'green':Math.abs((prom-meta)/(meta||1))*100<15?'amber':'red';
      const fv   = ind.tipo==='$'?fmtK:ind.tipo==='pct'?v=>v!==null?(v*100).toFixed(1)+'%':'—':v=>v!==null?v.toFixed(1):'—';
      const fm   = ind.tipo==='$'?fmtK(meta):ind.tipo==='pct'?(meta)+'%':meta;
      h += `<tr><td><span class="dot" style="background:${ind.color}"></span>${ind.label}</td>`;
      vals.forEach(v => { h += `<td>${fv(v)}</td>`; });
      h += `<td><strong>${fv(prom)}</strong></td>`;
      h += `<td><span class="pill ${pCls}">${fm||'—'}</span></td></tr>`;
    });
    h += '</tbody></table>';
    div.innerHTML = h;
  }

  // ── Navegación ───────────────────────────────────────────────
  window.filterCanal = function(mes, btn) {
    document.querySelectorAll('.month-btn').forEach(b => b.classList.remove('active'));
    btn.classList.add('active');
    window.Dash.ventas.canalesVenta.forEach(c => window.buildCanalChart(c, mes));
  };

  const built = {};
  window.showPage = function(id, tabEl) {
    document.querySelectorAll('.page').forEach(p => p.classList.remove('active'));
    document.querySelectorAll('.tab').forEach(t => t.classList.remove('active'));
    document.getElementById('page-'+id)?.classList.add('active');
    if (tabEl) tabEl.classList.add('active');

    if (!built[id]) {
      built[id] = true;
      const V = window.Dash.ventas;

      if (id==='canales') {
        buildMonthFilters();
        V.canalesVenta.forEach(c => window.buildCanalChart(c,'TODOS'));
      }
      if (id==='cortes') {
        buildMesSection();
        setTimeout(()=>{
          window.buildChartApilado();
          const colors = ['#4f8ef7','#22c55e','#f59e0b','#a78bfa','#22d3ee','#f87171'];
          V.meses.forEach((mes,i) => window.buildMesChart('chartMes_'+mes, mes, colors[i%colors.length]));
        }, 60);
      }
      if (id==='tabla-v') buildTablaVentas();
      if (id==='ope') { buildKPIsOpe(); window.buildOpe(); }
      if (id==='tabla-o') buildTablaOpe();
      if (id==='admon') { buildKPIsAdmon(); window.buildAdmon(); }
      if (id==='tabla-a') buildTablaAdmon();
      if (id==='consolidado') { buildSemaforo(); window.buildConsolidado(); }
    }
  };

  document.addEventListener('dashready', () => {
    buildHeader();
    buildKPIsVentas();
    built.resumen = true;
  });
})();
