/* ═══════════════════════════════════════════
   parser.js — Lee DASH.xlsx (ventas + ope + admon)
   Expone: window.Dash  { ventas, ope, admon }
   ═══════════════════════════════════════════ */
(function () {

  const MES_ABREV = {
    ENERO:'Ene',FEBRERO:'Feb',MARZO:'Mar',ABRIL:'Abr',
    MAYO:'May',JUNIO:'Jun',JULIO:'Jul',AGOSTO:'Ago',
    SEPTIEMBRE:'Sep',OCTUBRE:'Oct',NOVIEMBRE:'Nov',DICIEMBRE:'Dic'
  };

  function parseNum(v) {
    if (v === null || v === undefined) return 0;
    if (typeof v === 'number' && isNaN(v)) return 0;
    try { return parseFloat(String(v).replace(/,/g,'').replace(/\$/g,'').trim()) || 0; }
    catch { return 0; }
  }

  function parseNumFirst(v) {
    try {
      const s = String(v).replace(/,/g,'').split('/')[0].replace(/[^\d.-]/g,'');
      return parseFloat(s) || 0;
    } catch { return 0; }
  }

  function dateLabel(mes, raw) {
    const abr = MES_ABREV[String(mes).trim().toUpperCase()] || String(mes).slice(0,3);
    if (raw && typeof raw === 'number' && raw > 40000) {
      const d = XLSX.SSF.parse_date_code(raw);
      if (d) {
        const m = ['','Ene','Feb','Mar','Abr','May','Jun','Jul','Ago','Sep','Oct','Nov','Dic'][d.m];
        return m+'/'+String(d.d).padStart(2,'0');
      }
    }
    if (raw && typeof raw === 'number' && raw < 100) return abr+'/'+String(Math.round(raw)).padStart(2,'0');
    if (raw instanceof Date) {
      const mm = ['Ene','Feb','Mar','Abr','May','Jun','Jul','Ago','Sep','Oct','Nov','Dic'][raw.getMonth()];
      return mm+'/'+String(raw.getDate()).padStart(2,'0');
    }
    if (typeof raw === 'string') {
      const s = raw.replace(/[/\s]/g,'');
      const m = s.match(/^(\d{1,2})(\d{2})\d{4}$/);
      if (m) { const mn=['','Ene','Feb','Mar','Abr','May','Jun','Jul','Ago','Sep','Oct','Nov','Dic'][+m[2]]; return mn+'/'+m[1].padStart(2,'0'); }
      return s.slice(0,8);
    }
    return abr;
  }

  function buildCortes(mesRow, fechaRow, s, e) {
    const cortes = []; let mes = '';
    for (let c = s; c <= e; c++) {
      const mv = mesRow[c];
      if (mv && String(mv).trim() && String(mv).trim() !== 'nan') mes = String(mv).trim().toUpperCase();
      if (!mes) continue;
      const fv = fechaRow[c];
      if (fv === null || fv === undefined || fv === '') continue;
      cortes.push({ col: c, mes, label: dateLabel(mes, fv) });
    }
    return cortes;
  }

  function sheetToArr(wb, name) {
    const ws = wb.Sheets[name];
    if (!ws) throw new Error('Hoja "'+name+'" no encontrada en el Excel.');
    return XLSX.utils.sheet_to_json(ws, { header:1, defval:null, raw:true });
  }

  function parseVentas(wb) {
    const raw    = sheetToArr(wb, 'ventas');
    const cortes = buildCortes(raw[2], raw[3], 2, 20);
    const meses  = [...new Set(cortes.map(c => c.mes))];
    const CROW   = {'PUNTO DE VENTA':4,'CALL CENTER':7,'PLATAFORMA':10,'ASESORES':13,'VENTAS TOTALES':16};
    const PROW   = {'PEDIDOS PV':6,'PEDIDOS CC':9,'PEDIDOS PLAT':12,'PEDIDOS ASESORES':15,'PEDIDOS TOTALES':18};
    const data = {}, metas = {}, pedidos = {};
    Object.entries(CROW).forEach(([k,r]) => {
      metas[k] = parseNum(raw[r]?.[1]);
      data[k]  = cortes.map(c => parseNum(raw[r]?.[c.col]));
    });
    Object.entries(PROW).forEach(([k,r]) => {
      pedidos[k] = cortes.map(c => { const n = parseNumFirst(raw[r]?.[c.col]); return isNaN(n)?null:n; });
    });
    const acumuladoMes = {};
    meses.forEach(mes => {
      const idx = cortes.map((c,i)=>c.mes===mes?i:-1).filter(i=>i>=0);
      const last = idx[idx.length-1];
      acumuladoMes[mes] = {};
      Object.keys(data).forEach(k => { acumuladoMes[mes][k] = data[k][last]||0; });
    });
    return { cortes, meses, data, metas, pedidos, acumuladoMes,
      canalesVenta: ['PUNTO DE VENTA','CALL CENTER','PLATAFORMA','ASESORES'],
      canalConfig: {
        'PUNTO DE VENTA':{ color:'#4f8ef7', cls:'blue',   icon:'🏪' },
        'CALL CENTER':   { color:'#22c55e', cls:'green',  icon:'📞' },
        'PLATAFORMA':    { color:'#f59e0b', cls:'amber',  icon:'💻' },
        'ASESORES':      { color:'#a78bfa', cls:'purple', icon:'👥' },
        'VENTAS TOTALES':{ color:'#f87171', cls:'red',    icon:'💰' },
      },
    };
  }

  function parseOpe(wb) {
    const raw    = sheetToArr(wb, 'ope');
    const cortes = buildCortes(raw[0], raw[1], 2, 18);
    const meses  = [...new Set(cortes.map(c => c.mes))];
    const INDS = [
      {key:'COMPRA',         row:2, label:'Compras ($)',            tipo:'$',   metaOp:'>=', color:'#4f8ef7'},
      {key:'DEVOLUCIONES',   row:3, label:'Devoluciones',          tipo:'num', metaOp:'<',  color:'#22c55e'},
      {key:'NIVEL_SERVICIO', row:6, label:'Nivel de Servicio ($)', tipo:'$',   metaOp:'>=', color:'#f59e0b'},
      {key:'MAQUINAS',       row:7, label:'Máquinas Reparadas',    tipo:'num', metaOp:'>=', color:'#a78bfa'},
      {key:'DIAS_REPARACION',row:8, label:'Días Prom. Reparación', tipo:'num', metaOp:'<=', color:'#f87171'},
    ];
    const data = {}, metas = {};
    INDS.forEach(ind => {
      metas[ind.key] = parseNumFirst(raw[ind.row]?.[1]);
      data[ind.key]  = cortes.map(c => {
        const v = raw[ind.row]?.[c.col];
        if (v===null||v===undefined||v==='') return null;
        const n = parseNumFirst(v); return isNaN(n)?null:n;
      });
    });
    data['NIVEL_SERVICIO_PCT'] = cortes.map(c => {
      try { const p = String(raw[6]?.[c.col]).replace(/\$/g,'').replace(/%/g,'').split('/'); return p.length>1?parseFloat(p[1]):null; }
      catch { return null; }
    });
    return { cortes, meses, data, metas, indicadores: INDS };
  }

  function parseAdmon(wb) {
    const raw    = sheetToArr(wb, 'admon');
    const cortes = buildCortes(raw[3], raw[4], 3, 13);
    const meses  = [...new Set(cortes.map(c => c.mes))];
    const INDS = [
      {key:'INGRESOS',        row:5,  label:'Ingresos ($)',          tipo:'$',    metaOp:'>=', color:'#4f8ef7'},
      {key:'PLAZO_COBRO',     row:6,  label:'Plazo de Cobro (días)', tipo:'dias', metaOp:'<',  color:'#22c55e'},
      {key:'RECUPERACION',    row:7,  label:'% Recuperación',        tipo:'pct',  metaOp:'<',  color:'#f59e0b'},
      {key:'EGRESOS',         row:8,  label:'Egresos ($)',            tipo:'$',    metaOp:'<=', color:'#a78bfa'},
      {key:'GASTOS_OPERACION',row:9,  label:'Gastos Operación ($)',   tipo:'$',    metaOp:'<=', color:'#f87171'},
      {key:'FLUJO',           row:10, label:'Flujo de Efectivo',      tipo:'$',    metaOp:'>0', color:'#22d3ee'},
    ];
    const data = {}, metas = {};
    INDS.forEach(ind => {
      try { metas[ind.key] = parseFloat(String(raw[ind.row]?.[2]).replace(/[$,<>]/g,'').trim())||0; }
      catch { metas[ind.key] = 0; }
      data[ind.key] = cortes.map(c => {
        const v = raw[ind.row]?.[c.col];
        if (v===null||v===undefined) return null;
        const n = parseNum(v); return isNaN(n)?null:n;
      });
    });
    return { cortes, meses, data, metas, indicadores: INDS };
  }

  async function loadDash() {
    const loader  = document.getElementById('loader');
    const loaderP = loader.querySelector('p');
    try {
      loaderP.textContent = 'Cargando archivo Excel…';
      const resp = await fetch('./data/DASH.xlsx');
      if (!resp.ok) throw new Error('No se pudo cargar data/DASH.xlsx (HTTP '+resp.status+')');
      loaderP.textContent = 'Procesando hojas…';
      const buf = await resp.arrayBuffer();
      const wb  = XLSX.read(buf, { type:'array', cellDates:false, raw:true });
      window.Dash = {
        ventas: parseVentas(wb),
        ope:    parseOpe(wb),
        admon:  parseAdmon(wb),
      };
      await new Promise(r => setTimeout(r, 200));
      loader.style.display = 'none';
      document.getElementById('app').style.display = 'block';
      document.dispatchEvent(new Event('dashready'));
    } catch (err) {
      loaderP.textContent = '';
      const d = document.createElement('div');
      d.className = 'err';
      d.innerHTML = '<strong>⚠️ Error al cargar el Excel</strong><br><br>'+err.message+'<br><br><em>Usa un servidor web (GitHub Pages, python -m http.server 8080, o Live Server en VS Code). Firefox bloquea archivos locales — usa Chrome o Edge.</em>';
      loader.appendChild(d);
    }
  }

  if (document.readyState==='loading') document.addEventListener('DOMContentLoaded', loadDash);
  else loadDash();
})();
