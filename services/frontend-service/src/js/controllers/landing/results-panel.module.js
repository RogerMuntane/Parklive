/**
 * ParkLive – results-panel.module.js
 *
 * Mòdul que gestiona el toggle d'expandir/encongir el panell de resultats
 * de la landing page. Sincronitza la mida del mapa Leaflet durant
 * la transició CSS per evitar artefactes de renderització.
 */

/**
 * Inicialitza el toggle del panell de resultats de cerca.
 * En expandir o encongir el panell, invalida la mida del mapa durant
 * la duració de la transició CSS (320ms) per mantenır el mapa correcte.
 *
 * @param {Object}   options                      - Opcions de configuració.
 * @param {L.Map}    options.map                   - La instància del mapa Leaflet.
 * @param {Function} options.updateOpenPopupsLayout - Funció per refrescar els popups oberts.
 * @param {number}   [options.compactBreakpoint=991.98] - Amplada màxima per a la vista mòbil (px).
 * @returns {void}
 */
export function initResultsPanelToggle({ map, updateOpenPopupsLayout, compactBreakpoint = 991.98 }) {
  const toggleBtn = document.getElementById('toggleResultsPanelBtn');
  if (!toggleBtn || !map) return;

  let mapTransitionRafId = null;

  const syncToggleUi = () => {
    const isCollapsed = document.body.classList.contains('results-collapsed');
    toggleBtn.setAttribute('aria-expanded', String(!isCollapsed));
    toggleBtn.setAttribute(
      'aria-label',
      isCollapsed ? 'Expandir panell de resultats' : 'Encongir panell de resultats',
    );
    toggleBtn.innerHTML = isCollapsed
      ? '<i class="bi bi-layout-sidebar"></i>'
      : '<i class="bi bi-layout-sidebar-inset"></i>';
  };

  const refreshMapDuringPanelTransition = () => {
    if (typeof map.invalidateSize !== 'function') return;

    if (mapTransitionRafId !== null) {
      globalThis.cancelAnimationFrame(mapTransitionRafId);
      mapTransitionRafId = null;
    }

    const transitionDurationMs = 320;
    const startTs = globalThis.performance.now();

    const tick = (nowTs) => {
      map.invalidateSize({ pan: false, debounceMoveend: true });
      updateOpenPopupsLayout();

      if (nowTs - startTs < transitionDurationMs) {
        mapTransitionRafId = globalThis.requestAnimationFrame(tick);
        return;
      }

      mapTransitionRafId = null;
      map.invalidateSize({ pan: false, debounceMoveend: true });
      updateOpenPopupsLayout();
    };

    mapTransitionRafId = globalThis.requestAnimationFrame(tick);
  };

  const syncViewport = () => {
    if (globalThis.innerWidth <= compactBreakpoint) {
      document.body.classList.remove('results-collapsed');
    }
    syncToggleUi();
  };

  toggleBtn.addEventListener('click', () => {
    document.body.classList.toggle('results-collapsed');
    syncToggleUi();
    refreshMapDuringPanelTransition();
  });

  globalThis.addEventListener('resize', syncViewport);
  syncViewport();
}
