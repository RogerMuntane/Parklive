/**
 * ParkLive – estadistiques.controller.js
 * Controlador per al component de perfil d'estadístiques.
 * Carrega dades reals desde /api/usuari/estadistiques i renderitza
 * gràfiques ApexCharts + KPIs + llistes dinàmiques.
 */

import { pythonApi } from '../api.js';
import { getUserId } from '../utils.js';

const COLORS = {
  primary: '#2b2d42',
  secondary: '#8d99ae',
  success: '#198754',
  danger: '#c1121f',
  warning: '#ffc107',
  info: '#0dcaf0',
  deepRed: '#780000',
};

// Mapa de tipus d'aparcament → color
const TIPUS_COLORS = {
  cobert: COLORS.success,
  subterrani: COLORS.primary,
  carrer: COLORS.warning,
  aire_lliure: COLORS.info,
  parking_public: COLORS.danger,
  parking_privat: COLORS.deepRed,
};

// Mapa de tipus d'aparcament → etiqueta
const TIPUS_LABELS = {
  cobert: 'Cobert',
  subterrani: 'Subterrani',
  carrer: 'Carrer',
  aire_lliure: 'Aire lliure',
  parking_public: 'Pàrquing públic',
  parking_privat: 'Pàrquing privat',
};

// Mapa d'estat de reserva → etiqueta + color
const ESTAT_MAP = {
  completada: { label: 'Completada', color: COLORS.success },
  confirmada: { label: 'Confirmada', color: COLORS.primary },
  'cancelada': { label: 'Cancel·lada', color: COLORS.danger },
  pendent: { label: 'Pendent', color: COLORS.warning },
  en_curs: { label: 'En curs', color: COLORS.info },
};

// Registre de gràfiques per destruir-les en reinicialitzar
const _charts = {};

/** 
 * Destrueix una gràfica existent si hi és. 
 * 
 * @param {string} id - ID de la gràfica.
 * @returns {void}
 */
function destroyChart(id) {
  if (_charts[id]) {
    _charts[id].destroy();
    delete _charts[id];
  }
}

/**
 * Mostra un skeleton shimmer dins d'un contenidor de gràfica.
 * @param {string} elId   - ID del div contenidor.
 * @param {'area'|'donut'|'bar'|'spark'} variant
 * @param {number} height - Alçada en píxels.
 * @returns {void}
 */
function showChartSkeleton(elId, variant = 'bar', height = 190) {
  const el = document.getElementById(elId);
  if (!el || el.dataset.skeletonActive) return;
  el.dataset.skeletonActive = '1';

  let inner = '';
  if (variant === 'donut') {
    inner = `<div class="skel-circle"></div>
      <div class="skel-legend">
        <div class="skel-line"></div>
        <div class="skel-line"></div>
        <div class="skel-line"></div>
      </div>`;
  } else if (variant === 'spark') {
    inner = '<div class="skel-col"></div>'.repeat(7);
  } else if (variant === 'area') {
    inner = '<div class="skel-area-shape"></div>';
  } else {
    inner = '<div class="skel-col"></div>'.repeat(5);
  }

  const wrapper = document.createElement('div');
  wrapper.className = `chart-skeleton chart-skeleton--${variant}`;
  wrapper.style.height = `${height}px`;
  wrapper.dataset.skeletonWrapper = '1';
  wrapper.innerHTML = inner;

  el.innerHTML = '';
  el.appendChild(wrapper);
}

/**
 * Elimina el skeleton i prepara el contenidor per a la gràfica.
 * @param {string} elId - ID del div contenidor.
 * @returns {void}
 */
function clearChartSkeleton(elId) {
  const el = document.getElementById(elId);
  if (!el) return;
  delete el.dataset.skeletonActive;
  // ApexCharts escriurà el SVG, però primer netegem el skeleton
  const skeleton = el.querySelector('[data-skeleton-wrapper]');
  if (skeleton) skeleton.remove();
}

// ─── Helpers ─────────────────────────────────────────────────────────────────

/**
 * Detecta si el tema actiu és fosc (data-bs-theme="dark" a <html>).
 * 
 * @returns {boolean} True si és fosc, false altrament.
 */
function isDarkTheme() {
  return document.documentElement.getAttribute('data-bs-theme') === 'dark';
}

/**
 * Retorna les opcions comunes d'ApexCharts adaptades al tema.
 * 
 * @returns {Object} Configuració base.
 */
function baseChartOptions() {
  const dark = isDarkTheme();
  return {
    chart: {
      fontFamily: "'Inter', 'Segoe UI', sans-serif",
      foreColor: dark ? '#adb5bd' : COLORS.secondary,
      toolbar: { show: false },
      animations: {
        enabled: true,
        easing: 'easeout',
        speed: 600,
        animateGradually: {
          enabled: true,
          delay: 120,
        },
        dynamicAnimation: {
          enabled: true,
          speed: 450,
        },
      },
    },
    grid: {
      borderColor: dark ? 'rgba(255,255,255,.06)' : 'rgba(43,45,66,.07)',
      strokeDashArray: 4,
    },
    tooltip: {
      theme: dark ? 'dark' : 'light',
    },
  };
}

/**
 * Formata un valor monetari en format "12,50 €".
 * 
 * @param {number|string} value - El valor a formatar.
 * @returns {string} El text formatat.
 */
function fmtEur(value) {
  return new Intl.NumberFormat('ca-ES', { style: 'currency', currency: 'EUR' }).format(value);
}

/**
 * Formata hores: "3,5h" → "3h 30min"
 * 
 * @param {number} hores - Hores en format decimal.
 * @returns {string} El text formatat.
 */
function fmtHores(hores) {
  const h = Math.floor(hores);
  const min = Math.round((hores - h) * 60);
  return min > 0 ? `${h}h ${min}min` : `${h}h`;
}

// ─── KPI Cards ────────────────────────────────────────────────────────────────

/**
 * Renderitza les targetes de KPIs (indicadors clau de rendiment).
 * 
 * @param {Object} kpis - Dades dels KPIs.
 * @returns {void}
 */
function renderKpis(kpis) {
  // Total reserves
  const elTotal = document.getElementById('stat-total-reserves');
  if (elTotal) elTotal.textContent = kpis.total_reserves;

  const elTrend = document.getElementById('stat-reserves-trend');
  if (elTrend) {
    const delta = kpis.reserves_trend;
    const isPos = delta >= 0;
    elTrend.className = `fw-medium small ${isPos ? 'text-success' : 'text-danger'}`;
    elTrend.innerHTML = `<i class="bi bi-arrow-${isPos ? 'up' : 'down'}-short"></i> ${delta >= 0 ? '+' : ''}${delta} vs. mes anterior`;
  }

  // Despesa total
  const elDespesa = document.getElementById('stat-total-despesa');
  if (elDespesa) elDespesa.textContent = fmtEur(kpis.total_despesa);

  const elDespesaTrend = document.getElementById('stat-despesa-trend');
  if (elDespesaTrend) {
    const delta = kpis.despesa_trend;
    const isPos = delta <= 0; // despesa més baixa és positiu
    elDespesaTrend.className = `fw-medium small ${isPos ? 'text-success' : 'text-danger'}`;
    elDespesaTrend.innerHTML = `<i class="bi bi-arrow-${delta >= 0 ? 'up' : 'down'}-short"></i> ${delta >= 0 ? '+' : ''}${fmtEur(delta)} vs. mes anterior`;
  }

  // Temps aparcat
  const elTemps = document.getElementById('stat-temps-aparcat');
  if (elTemps) elTemps.textContent = fmtHores(kpis.temps_aparcat_hores);

  // Punts de gamificació
  const elPunts = document.getElementById('stat-punts');
  if (elPunts) elPunts.textContent = kpis.punts_gamificacio.toLocaleString('ca-ES');
}

// ─── Gràfica 1: Despesa mensual (Area Chart) ─────────────────────────────────

/**
 * Renderitza la gràfica d'àrea de despesa mensual.
 * 
 * @param {Array<Object>} dades - Dades de despesa mensual.
 * @returns {void}
 */
function renderDespesaMensual(dades) {
  clearChartSkeleton('chart-despesa-mensual');
  const el = document.getElementById('chart-despesa-mensual');
  if (!el) return;

  const base = baseChartOptions();
  const series = [{ name: 'Despesa (€)', data: dades.map(d => parseFloat(d.total.toFixed(2))) }];
  const categories = dades.map(d => d.mes_label);

  // Si la gràfica ja existeix i l'element encara la conté: actualitzar
  if (_charts['despesa-mensual'] && el.querySelector('.apexcharts-canvas')) {
    _charts['despesa-mensual'].updateOptions({ xaxis: { categories } }, false, false);
    _charts['despesa-mensual'].updateSeries(series, true);
    return;
  }

  // Si l'element és buit (p.ex. canvi de tab) però teníem instància, la destruïm
  if (_charts['despesa-mensual']) {
    _charts['despesa-mensual'].destroy();
  }

  el.innerHTML = '';
  const options = {
    ...base,
    chart: { ...base.chart, type: 'area', height: 200, id: 'despesa-mensual' },
    series,
    xaxis: {
      categories,
      labels: { style: { fontSize: '11px' } },
      axisBorder: { show: false },
      axisTicks: { show: false },
    },
    yaxis: { labels: { formatter: v => `${v.toFixed(0)}€`, style: { fontSize: '11px' } } },
    colors: [COLORS.success],
    fill: {
      type: 'gradient',
      gradient: { shadeIntensity: 1, opacityFrom: 0.35, opacityTo: 0.02, stops: [0, 100] },
    },
    stroke: { curve: 'smooth', width: 2 },
    markers: { size: 0 },
    dataLabels: { enabled: false },
    grid: base.grid,
    tooltip: { ...base.tooltip, y: { formatter: v => fmtEur(v) } },
  };

  _charts['despesa-mensual'] = new ApexCharts(el, options);
  _charts['despesa-mensual'].render();
}

// ─── Gràfica 2: Distribució per tipus (Donut) ────────────────────────────────

/**
 * Renderitza la gràfica de donut de distribució per tipus d'aparcament.
 * 
 * @param {Array<Object>} distribucio - Dades de distribució.
 * @returns {void}
 */
function renderTipusAparcament(distribucio) {
  clearChartSkeleton('chart-tipus-aparcament');
  const el = document.getElementById('chart-tipus-aparcament');
  if (!el) return;

  const base = baseChartOptions();
  const labels = distribucio.map(d => TIPUS_LABELS[d.tipus] || d.tipus);
  const series = distribucio.map(d => d.count);
  const colorsArr = distribucio.map(d => TIPUS_COLORS[d.tipus] || COLORS.secondary);

  // Actualitzar la llegenda del HTML
  const legendEl = document.getElementById('legend-tipus-aparcament');
  if (legendEl) {
    legendEl.innerHTML = distribucio.map(d => `
      <span class="d-flex align-items-center gap-1" style="font-size:.75rem;">
        <span class="rounded-circle d-inline-block" style="width:10px;height:10px;background:${TIPUS_COLORS[d.tipus] || COLORS.secondary}"></span>
        ${TIPUS_LABELS[d.tipus] || d.tipus} <span class="text-secondary">(${d.percentatge}%)</span>
      </span>`).join('');
  }

  if (_charts['tipus-aparcament'] && el.querySelector('.apexcharts-canvas')) {
    _charts['tipus-aparcament'].updateOptions({ labels, colors: colorsArr }, false, false);
    _charts['tipus-aparcament'].updateSeries(series, true);
    return;
  }

  if (_charts['tipus-aparcament']) {
    _charts['tipus-aparcament'].destroy();
  }

  el.innerHTML = '';
  const options = {
    ...base,
    chart: { ...base.chart, type: 'donut', height: 175, id: 'tipus-aparcament' },
    series,
    labels,
    colors: colorsArr,
    plotOptions: {
      pie: {
        donut: {
          size: '75%',
          labels: {
            show: true,
            total: {
              show: true,
              label: 'Total',
              formatter: () => distribucio.reduce((a, d) => a + d.count, 0),
            },
          },
        },
      },
    },
    legend: { show: false },
    dataLabels: { enabled: false },
    stroke: { width: 0 },
    tooltip: { ...base.tooltip, y: { formatter: v => `${v} reserves` } },
  };

  _charts['tipus-aparcament'] = new ApexCharts(el, options);
  _charts['tipus-aparcament'].render();
}

// ─── Gràfica 3: Reserves per estat (Bar radial) ──────────────────────────────

/**
 * Renderitza la gràfica de barres de reserves per estat.
 * 
 * @param {Array<Object>} estats - Dades de reserves per estat.
 * @returns {void}
 */
function renderReservesEstat(estats) {
  clearChartSkeleton('chart-reserves-estat');
  const el = document.getElementById('chart-reserves-estat');
  if (!el) return;

  const base = baseChartOptions();
  const labels = estats.map(e => ESTAT_MAP[e.estat]?.label || e.estat);
  const series = estats.map(e => e.count);
  const colorsArr = estats.map(e => ESTAT_MAP[e.estat]?.color || COLORS.secondary);

  if (_charts['reserves-estat'] && el.querySelector('.apexcharts-canvas')) {
    _charts['reserves-estat'].updateOptions(
      { xaxis: { categories: labels }, colors: colorsArr },
      false, false
    );
    _charts['reserves-estat'].updateSeries([{ name: 'Reserves', data: series }], true);
    return;
  }

  if (_charts['reserves-estat']) {
    _charts['reserves-estat'].destroy();
  }

  el.innerHTML = '';
  const options = {
    ...base,
    chart: { ...base.chart, type: 'bar', height: 190, id: 'reserves-estat' },
    series: [{ name: 'Reserves', data: series }],
    xaxis: {
      categories: labels,
      labels: { style: { fontSize: '11px' } },
      axisBorder: { show: false },
      axisTicks: { show: false },
    },
    yaxis: { labels: { formatter: v => Math.round(v), style: { fontSize: '11px' } } },
    colors: colorsArr,
    plotOptions: { bar: { distributed: true, borderRadius: 5, columnWidth: '55%' } },
    legend: { show: false },
    dataLabels: { enabled: false },
    grid: base.grid,
    tooltip: { ...base.tooltip, y: { formatter: v => `${v} reserve${v !== 1 ? 's' : ''}` } },
  };

  _charts['reserves-estat'] = new ApexCharts(el, options);
  _charts['reserves-estat'].render();
}

// ─── Gràfica 4: Contribucions per tipus (Grouped Bar) ────────────────────────

/**
 * Renderitza la gràfica de barres de contribucions per tipus.
 * 
 * @param {Array<Object>} contribucions - Dades de contribucions.
 * @returns {void}
 */
function renderContribucions(contribucions) {
  clearChartSkeleton('chart-contribucions-tipus');
  const el = document.getElementById('chart-contribucions-tipus');
  if (!el) return;

  const base = baseChartOptions();
  const tipusSet = [...new Set(contribucions.map(c => c.tipus))];
  const totals = tipusSet.map(t => {
    const row = contribucions.find(c => c.tipus === t);
    return row ? row.count : 0;
  });
  const labels = tipusSet.map(t => t.charAt(0).toUpperCase() + t.slice(1, 5) + '.');
  const colorsArr = tipusSet.map(t => (t === 'ocupat' ? '#ef4444' : '#22c55e'));

  if (_charts['contribucions-tipus'] && el.querySelector('.apexcharts-canvas')) {
    _charts['contribucions-tipus'].updateOptions(
      { xaxis: { categories: labels }, colors: colorsArr },
      false, false
    );
    _charts['contribucions-tipus'].updateSeries([{ name: 'Contribucions', data: totals }], true);
    return;
  }

  if (_charts['contribucions-tipus']) {
    _charts['contribucions-tipus'].destroy();
  }

  el.innerHTML = '';
  const options = {
    ...base,
    chart: { ...base.chart, type: 'bar', height: 190, id: 'contribucions-tipus' },
    series: [{ name: 'Contribucions', data: totals }],
    xaxis: {
      categories: labels,
      labels: { style: { fontSize: '11px' } },
      axisBorder: { show: false },
      axisTicks: { show: false },
    },
    yaxis: { labels: { formatter: v => Math.round(v), style: { fontSize: '11px' } } },
    colors: colorsArr,
    plotOptions: { bar: { distributed: true, borderRadius: 4, columnWidth: '60%' } },
    legend: { show: false },
    dataLabels: { enabled: false },
    grid: base.grid,
  };

  _charts['contribucions-tipus'] = new ApexCharts(el, options);
  _charts['contribucions-tipus'].render();
}

// ─── Gràfica 5: Reserves per dia de la setmana (Bar petit) ──────────────────

/**
 * Renderitza la gràfica (sparkline) de reserves per dia de la setmana.
 * 
 * @param {Array<Object>} dies - Dades de reserves per dia.
 * @returns {void}
 */
function renderDiesSetmana(dies) {
  clearChartSkeleton('chart-dies-setmana');
  const el = document.getElementById('chart-dies-setmana');
  if (!el) return;

  const base = baseChartOptions();
  const series = [{ name: 'Reserves', data: dies.map(d => d.count) }];
  const categories = dies.map(d => d.dia_label);

  if (_charts['dies-setmana'] && el.querySelector('.apexcharts-canvas')) {
    _charts['dies-setmana'].updateOptions({ xaxis: { categories } }, false, false);
    _charts['dies-setmana'].updateSeries(series, true);
    return;
  }

  if (_charts['dies-setmana']) {
    _charts['dies-setmana'].destroy();
  }

  el.innerHTML = '';
  const options = {
    ...base,
    chart: { ...base.chart, type: 'bar', height: 90, id: 'dies-setmana', sparkline: { enabled: false } },
    series,
    xaxis: {
      categories,
      labels: { style: { fontSize: '9px' } },
      axisBorder: { show: false },
      axisTicks: { show: false },
    },
    yaxis: { show: false, min: 0 },
    colors: [COLORS.danger],
    plotOptions: { bar: { borderRadius: 2, columnWidth: '65%' } },
    dataLabels: { enabled: false },
    legend: { show: false },
    grid: { show: false },
    tooltip: { ...base.tooltip, y: { formatter: v => `${v} reserva${v !== 1 ? 'es' : ''}` } },
  };

  _charts['dies-setmana'] = new ApexCharts(el, options);
  _charts['dies-setmana'].render();
}

// ─── Top aparcaments ──────────────────────────────────────────────────────────

/**
 * Renderitza el llistat dels aparcaments més utilitzats.
 * 
 * @param {Array<Object>} topParking - Llista dels aparcaments principals.
 * @returns {void}
 */
function renderTopAparcaments(topParking) {
  const container = document.getElementById('stat-top-aparcaments');
  if (!container) return;

  if (!topParking || topParking.length === 0) {
    container.innerHTML = `<p class="text-secondary small text-center py-3">Cap aparcament usat encara.</p>`;
    return;
  }

  container.innerHTML = topParking.map((p, i) => `
    <div class="d-flex align-items-center gap-3 p-2 rounded-3 bg-body-tertiary">
      <span class="fw-bold text-secondary small">${i + 1}</span>
      <div class="flex-grow-1 overflow-hidden">
        <div class="fw-semibold text-primary text-truncate" style="font-size:.85rem;">${p.nom}</div>
        <div class="text-secondary" style="font-size:.72rem;">${p.ciutat} · ${p.count} reserve${p.count !== 1 ? 's' : ''}</div>
      </div>
      <span class="fw-bold text-primary flex-shrink-0" style="font-size:.85rem;">${fmtEur(p.despesa_total)}</span>
    </div>`).join('');
}

// ─── Dades de detall ─────────────────────────────────────────────────────────

/**
 * Renderitza altres dades de detall estadístic.
 * 
 * @param {Object} detall - Objecte amb les dades de detall.
 * @returns {void}
 */
function renderDadesDetall(detall) {
  const map = {
    'stat-despesa-mitja': fmtEur(detall.despesa_mitja),
    'stat-durada-mitja': detall.durada_mitja_fmt,
    'stat-contribucions-totals': detall.total_contribucions,
    'stat-valoracio-mitja': detall.valoracio_mitja > 0 ? `${detall.valoracio_mitja} / 5` : '—',
  };

  for (const [id, value] of Object.entries(map)) {
    const el = document.getElementById(id);
    if (el) el.textContent = value;
  }
}

// ─── Gamificació ─────────────────────────────────────────────────────────────

/**
 * Renderitza l'estat actual de la gamificació (punts, progressió i recompenses).
 * 
 * @param {Object} gamificacio - Dades de gamificació.
 * @returns {void}
 */
function renderGamificacio(gamificacio) {
  // Punts centrals
  const elPunts = document.getElementById('stat-gamificacio-punts');
  if (elPunts) elPunts.textContent = gamificacio.punts.toLocaleString('ca-ES');

  // Propera recompensa
  const propera = gamificacio.propera_recompensa;
  const elRestants = document.getElementById('stat-punts-restants');
  const elPropera = document.getElementById('stat-propera-recompensa');
  const elBar = document.getElementById('stat-progres-bar');

  if (propera) {
    if (elRestants) elRestants.textContent = propera.punts_restants.toLocaleString('ca-ES');
    if (elPropera) elPropera.textContent = propera.nom;
    if (elBar) {
      const pct = Math.min(propera.progres_percentatge, 100);
      elBar.style.width = `${pct}%`;
      elBar.setAttribute('aria-valuenow', pct);
    }
  } else {
    // No hi ha propera recompensa: màxim
    if (elRestants) elRestants.textContent = '0';
    if (elPropera) elPropera.textContent = 'Totes les recompenses obtingudes';
    if (elBar) { elBar.style.width = '100%'; elBar.setAttribute('aria-valuenow', 100); }
  }

  // Insígnies
  renderInsignies(gamificacio.insignies_obtingudes, propera);
}

/**
 * Insígnies per defecte basades en activitat quan no hi ha recompenses a la BD.
 * Permet que la secció no quedi buida en nous entorns.
 */
const INSIGNIES_DEFAULT = [
  { nom: 'Primer aparcament', descripcio: '1a reserva', icon: 'bi-car-front', color: 'text-danger', requisit_punts: 0 },
  { nom: 'Col·laborador', descripcio: '10 contribucions', icon: 'bi-geo-alt', color: 'text-danger', requisit_punts: 100 },
  { nom: 'Streak 7 dies', descripcio: '7 dies seguits', icon: 'bi-fire', color: 'text-danger', requisit_punts: 200 },
  { nom: 'Expert', descripcio: '1.500 punts', icon: 'bi-trophy', color: 'text-secondary', requisit_punts: 1500 },
  { nom: 'Premium', descripcio: 'Subscripció', icon: 'bi-patch-check', color: 'text-secondary', requisit_punts: 2000 },
  { nom: 'Explorador', descripcio: '5 ciutats', icon: 'bi-map', color: 'text-secondary', requisit_punts: 500 },
];

/**
 * Renderitza les insígnies obtingudes i bloquejades a la secció de gamificació.
 * 
 * @param {Array<Object>} insignies - Llista d'insígnies de l'usuari.
 * @param {Object} propera - Dades de la propera recompensa.
 * @returns {void}
 */
function renderInsignies(insignies, propera) {
  const container = document.getElementById('stat-insignies-container');
  if (!container) return;

  // Si la BD té insígnies reals, les renderitzem; si no, fem servir les de display
  if (insignies && insignies.length > 0) {
    container.innerHTML = insignies.map(ins => `
      <div class="col-4">
        <div class="card border border-light-subtle rounded-3 text-center p-2 h-100 shadow-none">
          <div class="fs-3 mb-1"><i class="bi bi-patch-check text-success"></i></div>
          <div class="fw-semibold text-primary" style="font-size:.7rem;">${ins.nom}</div>
          <div class="text-secondary mt-1" style="font-size:.65rem;">${ins.descripcio || ''}</div>
        </div>
      </div>`).join('');
    return;
  }

  // Fallback: mostrar insígnies de display (obtingudes les 3 primeres, rest bloquejades)
  container.innerHTML = INSIGNIES_DEFAULT.map((ins, i) => {
    const locked = i >= 3;
    return `
      <div class="col-4 ${locked ? 'opacity-50' : ''}">
        <div class="card border border-light-subtle rounded-3 text-center p-2 h-100 shadow-none ${locked ? 'bg-body-tertiary' : ''}">
          <div class="fs-3 mb-1"><i class="bi ${ins.icon} ${locked ? 'text-secondary' : ins.color}"></i></div>
          <div class="fw-semibold ${locked ? 'text-secondary' : 'text-primary'}" style="font-size:.7rem;">${ins.nom}</div>
          <div class="text-secondary mt-1" style="font-size:.65rem;">${ins.descripcio}</div>
        </div>
      </div>`;
  }).join('');
}

// ─── Tipus preferits (progress bars a Dades de detall) ───────────────────────

/**
 * Renderitza les barres de progrés dels tipus d'aparcament preferits.
 * 
 * @param {Array<Object>} distribucio - Distribució per tipus.
 * @returns {void}
 */
function renderTipusPreferits(distribucio) {
  const container = document.getElementById('stat-tipus-preferits');
  if (!container) return;

  if (!distribucio || distribucio.length === 0) {
    container.innerHTML = `<p class="text-secondary small">Sense dades.</p>`;
    return;
  }

  const top = distribucio.slice(0, 4); // Màxim 4 barres

  container.innerHTML = top.map(d => {
    const color = TIPUS_COLORS[d.tipus] || COLORS.secondary;
    const label = TIPUS_LABELS[d.tipus] || d.tipus;
    return `
      <div>
        <div class="d-flex justify-content-between mb-1 small text-secondary">
          <span>${label}</span><span class="fw-semibold">${d.percentatge}%</span>
        </div>
        <div class="progress" style="height:4px;">
          <div class="progress-bar" style="width:${d.percentatge}%;background:${color};"></div>
        </div>
      </div>`;
  }).join('');
}

// ─── Estat de càrrega / error ─────────────────────────────────────────────────

/**
 * Configura la interfície en estat de càrrega mentre s'obtenen les dades.
 * 
 * @returns {void}
 */
function showLoadingState() {
  // KPI cards: spinner petit
  ['stat-total-reserves', 'stat-total-despesa', 'stat-temps-aparcat', 'stat-punts'].forEach(id => {
    const el = document.getElementById(id);
    if (el) el.innerHTML = '<span class="spinner-border spinner-border-sm text-secondary opacity-50" role="status"></span>';
  });

  // Chart skeletons: NOMÉS en el primer carregament (quan la gràfica no existeix).
  // En recàrregues, la gràfica existent roman visible i s'actualitza amb updateSeries.
  const chartConfigs = [
    { id: 'despesa-mensual',      variant: 'area',  height: 200 },
    { id: 'tipus-aparcament',     variant: 'donut', height: 175 },
    { id: 'reserves-estat',       variant: 'bar',   height: 190 },
    { id: 'contribucions-tipus',  variant: 'bar',   height: 190 },
    { id: 'dies-setmana',         variant: 'spark', height: 90 }
  ];

  chartConfigs.forEach(conf => {
    const containerId = `chart-${conf.id}`;
    // Si la gràfica existeix però volem forçar skeleton (per exemple si el DOM és nou),
    // hauríem de destruir-la primer. Però aquí prioritzem mantenir-la si hi és.
    if (!_charts[conf.id]) {
      showChartSkeleton(containerId, conf.variant, conf.height);
    }
  });
}

/**
 * Mostra un banner d'error si falla la càrrega de dades.
 * 
 * @param {string} msg - El missatge d'error.
 * @returns {void}
 */
function showErrorBanner(msg) {
  const section = document.getElementById('section-stadistics');
  if (!section) return;

  // Evitar duplicats
  if (section.querySelector('.stats-error-banner')) return;

  const banner = document.createElement('div');
  banner.className = 'alert alert-danger border-0 rounded-3 mb-3 d-flex align-items-center gap-2 stats-error-banner';
  banner.innerHTML = `<i class="bi bi-exclamation-triangle-fill flex-shrink-0"></i> <span>${msg}</span>`;
  section.prepend(banner);

  // Alerta sonora/visual per al desenvolupador si cal (opcional)
  // alert(msg);
}

// ─── Entrada principal ────────────────────────────────────────────────────────

/**
 * Inicialitza el component d'estadístiques.
 * Crida a l'API Python, obté totes les dades i renderitza els gràfics i KPIs.
 * Si ApexCharts no és disponible, espera fins que estigui carregat (CDN async).
 * 
 * @returns {Promise<void>}
 */
export async function initEstadistiques() {
  const section = document.getElementById('section-stadistics');
  if (!section) return;

  const userId = getUserId();
  if (!userId) {
    showErrorBanner('No s\'ha pogut identificar l\'usuari. Torna a iniciar sessió.');
    return;
  }

  showLoadingState();

  try {
    const data = await pythonApi.get('/api/usuari/estadistiques', { user_id: userId });

    // Esperar ApexCharts si el CDN encara no ha carregat
    await waitForApexCharts();

    renderKpis(data.kpis);
    renderDespesaMensual(data.despesa_mensual);
    renderTipusAparcament(data.distribucio_tipus);
    renderReservesEstat(data.reserves_per_estat);
    renderContribucions(data.contribucions_per_tipus);
    renderDiesSetmana(data.dies_setmana);
    renderTopAparcaments(data.top_aparcaments);
    renderDadesDetall(data.dades_detall);
    renderGamificacio(data.gamificacio);
    renderTipusPreferits(data.distribucio_tipus);

  } catch (err) {
    console.error('[ParkLive] Error carregant estadístiques:', err);
    // Restaurar text original als KPI
    ['stat-total-reserves', 'stat-total-despesa', 'stat-temps-aparcat', 'stat-punts'].forEach(id => {
      const el = document.getElementById(id);
      if (el) el.textContent = '—';
    });

    const errorMsg = err.message || 'Error de connexió o de servidor';
    showErrorBanner(`Error al carregar estadístiques: ${errorMsg}`);
  }
}

/**
 * Torna a disparar les animacions de les gràfiques sense duplicar elements.
 * 
 * @returns {void}
 */
export function refreshEstadistiques() {
  Object.keys(_charts).forEach(id => {
    const chart = _charts[id];
    if (chart && typeof chart.updateSeries === 'function') {
      try {
        // En lloc de render(), fem un updateSeries amb les mateixes dades per re-animar.
        // Això és molt més segur i evita duplicats.
        chart.updateSeries(chart.w.config.series, true);
      } catch (e) {
        console.warn(`[ParkLive] No s'ha pogut refrescar la gràfica ${id}:`, e);
      }
    }
  });
}

/**
 * Torna una Promise que es resol quan window.ApexCharts estigui disponible.
 * Permet que el CDN es carregui de manera asíncrona sense errors.
 * 
 * @param {number} timeoutMs - Temps màxim d'espera en mil·lisegons.
 * @returns {Promise<void>}
 */
function waitForApexCharts(timeoutMs = 5000) {
  return new Promise((resolve, reject) => {
    if (typeof window.ApexCharts !== 'undefined') {
      resolve();
      return;
    }
    const start = Date.now();
    const interval = setInterval(() => {
      if (typeof window.ApexCharts !== 'undefined') {
        clearInterval(interval);
        resolve();
      } else if (Date.now() - start > timeoutMs) {
        clearInterval(interval);
        reject(new Error('ApexCharts no disponible (timeout)'));
      }
    }, 100);
  });
}
