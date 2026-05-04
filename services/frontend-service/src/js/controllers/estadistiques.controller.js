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

/** Destrueix una gràfica existent si hi és. */
function destroyChart(id) {
  if (_charts[id]) {
    _charts[id].destroy();
    delete _charts[id];
  }
}

// ─── Helpers ─────────────────────────────────────────────────────────────────

/**
 * Detecta si el tema actiu és fosc (data-bs-theme="dark" a <html>).
 */
function isDarkTheme() {
  return document.documentElement.getAttribute('data-bs-theme') === 'dark';
}

/**
 * Retorna les opcions comunes d'ApexCharts adaptades al tema.
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
        easing: 'easeinout',
        speed: 800,
        animateGradually: {
          enabled: true,
          delay: 150
        },
        dynamicAnimation: {
          enabled: true,
          speed: 350
        }
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
 */
function fmtEur(value) {
  return new Intl.NumberFormat('ca-ES', { style: 'currency', currency: 'EUR' }).format(value);
}

/**
 * Formata hores: "3,5h" → "3h 30min"
 */
function fmtHores(hores) {
  const h = Math.floor(hores);
  const min = Math.round((hores - h) * 60);
  return min > 0 ? `${h}h ${min}min` : `${h}h`;
}

// ─── KPI Cards ────────────────────────────────────────────────────────────────

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

function renderDespesaMensual(dades) {
  destroyChart('despesa-mensual');
  const el = document.getElementById('chart-despesa-mensual');
  if (!el) return;

  // ApexCharts necessita un <div> contenidor, no <canvas>
  el.innerHTML = '';

  const base = baseChartOptions();

  const options = {
    ...base,
    chart: {
      ...base.chart,
      type: 'area',
      height: 200,
      id: 'despesa-mensual',
    },
    series: [{
      name: 'Despesa (€)',
      data: dades.map(d => parseFloat(d.total.toFixed(2))),
    }],
    xaxis: {
      categories: dades.map(d => d.mes_label),
      labels: { style: { fontSize: '11px' } },
      axisBorder: { show: false },
      axisTicks: { show: false },
    },
    yaxis: {
      labels: {
        formatter: v => `${v.toFixed(0)}€`,
        style: { fontSize: '11px' },
      },
    },
    colors: [COLORS.success],
    fill: {
      type: 'gradient',
      gradient: {
        shadeIntensity: 1,
        opacityFrom: 0.35,
        opacityTo: 0.02,
        stops: [0, 100],
      },
    },
    stroke: { curve: 'smooth', width: 2 },
    markers: { size: 0 },
    dataLabels: { enabled: false },
    grid: base.grid,
    tooltip: {
      ...base.tooltip,
      y: { formatter: v => fmtEur(v) },
    },
  };

  _charts['despesa-mensual'] = new ApexCharts(el, options);
  _charts['despesa-mensual'].render();
}

// ─── Gràfica 2: Distribució per tipus (Donut) ────────────────────────────────

function renderTipusAparcament(distribucio) {
  destroyChart('tipus-aparcament');
  const el = document.getElementById('chart-tipus-aparcament');
  if (!el) return;
  el.innerHTML = '';

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

  const options = {
    ...base,
    chart: {
      ...base.chart,
      type: 'donut',
      height: 175,
      id: 'tipus-aparcament',
    },
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
    tooltip: {
      ...base.tooltip,
      y: { formatter: v => `${v} reserves` },
    },
  };

  _charts['tipus-aparcament'] = new ApexCharts(el, options);
  _charts['tipus-aparcament'].render();
}

// ─── Gràfica 3: Reserves per estat (Bar radial) ──────────────────────────────

function renderReservesEstat(estats) {
  destroyChart('reserves-estat');
  const el = document.getElementById('chart-reserves-estat');
  if (!el) return;
  el.innerHTML = '';

  const base = baseChartOptions();
  const labels = estats.map(e => ESTAT_MAP[e.estat]?.label || e.estat);
  const series = estats.map(e => e.count);
  const colorsArr = estats.map(e => ESTAT_MAP[e.estat]?.color || COLORS.secondary);

  const options = {
    ...base,
    chart: {
      ...base.chart,
      type: 'bar',
      height: 190,
      id: 'reserves-estat',
    },
    series: [{ name: 'Reserves', data: series }],
    xaxis: {
      categories: labels,
      labels: { style: { fontSize: '11px' } },
      axisBorder: { show: false },
      axisTicks: { show: false },
    },
    yaxis: {
      labels: {
        formatter: v => Math.round(v),
        style: { fontSize: '11px' },
      },
    },
    colors: colorsArr,
    plotOptions: {
      bar: {
        distributed: true,
        borderRadius: 5,
        columnWidth: '55%',
      },
    },
    legend: { show: false },
    dataLabels: { enabled: false },
    grid: base.grid,
    tooltip: {
      ...base.tooltip,
      y: { formatter: v => `${v} reserve${v !== 1 ? 's' : ''}` },
    },
  };

  _charts['reserves-estat'] = new ApexCharts(el, options);
  _charts['reserves-estat'].render();
}

// ─── Gràfica 4: Contribucions per tipus (Grouped Bar) ────────────────────────

function renderContribucions(contribucions) {
  destroyChart('contribucions-tipus');
  const el = document.getElementById('chart-contribucions-tipus');
  if (!el) return;
  el.innerHTML = '';

  const base = baseChartOptions();

  // Agrupar per tipus
  const tipusSet = [...new Set(contribucions.map(c => c.tipus))];
  const totals = tipusSet.map(t => {
    const row = contribucions.find(c => c.tipus === t);
    return row ? row.count : 0;
  });

  const labels = tipusSet.map(t => t.charAt(0).toUpperCase() + t.slice(1, 5) + '.');
  const colorsArr = tipusSet.map(t => (t === 'ocupat' ? '#ef4444' : '#22c55e'));

  const options = {
    ...base,
    chart: {
      ...base.chart,
      type: 'bar',
      height: 190,
      id: 'contribucions-tipus',
    },
    series: [
      {
        name: 'Contribucions',
        data: totals,
      },
    ],
    xaxis: {
      categories: labels,
      labels: { style: { fontSize: '11px' } },
      axisBorder: { show: false },
      axisTicks: { show: false },
    },
    yaxis: {
      labels: {
        formatter: v => Math.round(v),
        style: { fontSize: '11px' },
      },
    },
    colors: colorsArr,
    plotOptions: {
      bar: { distributed: true, borderRadius: 4, columnWidth: '60%' },
    },
    legend: {
      show: false
    },
    dataLabels: { enabled: false },
    grid: base.grid,
  };

  _charts['contribucions-tipus'] = new ApexCharts(el, options);
  _charts['contribucions-tipus'].render();
}

// ─── Gràfica 5: Reserves per dia de la setmana (Bar petit) ──────────────────

function renderDiesSetmana(dies) {
  destroyChart('dies-setmana');
  const el = document.getElementById('chart-dies-setmana');
  if (!el) return;
  el.innerHTML = '';

  const base = baseChartOptions();

  const options = {
    ...base,
    chart: {
      ...base.chart,
      type: 'bar',
      height: 90,
      id: 'dies-setmana',
      sparkline: { enabled: false },
    },
    series: [{ name: 'Reserves', data: dies.map(d => d.count) }],
    xaxis: {
      categories: dies.map(d => d.dia_label),
      labels: { style: { fontSize: '9px' } },
      axisBorder: { show: false },
      axisTicks: { show: false },
    },
    yaxis: { show: false, min: 0 },
    colors: [COLORS.danger],
    plotOptions: {
      bar: { borderRadius: 2, columnWidth: '65%' },
    },
    dataLabels: { enabled: false },
    legend: { show: false },
    grid: { show: false },
    tooltip: {
      ...base.tooltip,
      y: { formatter: v => `${v} reserva${v !== 1 ? 'es' : ''}` },
    },
  };

  _charts['dies-setmana'] = new ApexCharts(el, options);
  _charts['dies-setmana'].render();
}

// ─── Top aparcaments ──────────────────────────────────────────────────────────

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

function showLoadingState() {
  // Substitueix els "—" per spinners petits als KPI cards
  ['stat-total-reserves', 'stat-total-despesa', 'stat-temps-aparcat', 'stat-punts'].forEach(id => {
    const el = document.getElementById(id);
    if (el) el.innerHTML = '<span class="spinner-border spinner-border-sm text-secondary opacity-50" role="status"></span>';
  });
}

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
 * Torna a renderitzar totes les gràfiques actives per disparar les animacions d'entrada.
 */
export function refreshEstadistiques() {
  Object.values(_charts).forEach(chart => {
    if (chart && typeof chart.render === 'function') {
      chart.render();
    }
  });
}

/**
 * Torna una Promise que es resol quan window.ApexCharts estigui disponible.
 * Permet que el CDN es carregui de manera asíncrona sense errors.
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
