export function initResultsPanelToggle({ map, updateOpenPopupsLayout, compactBreakpoint = 991.98 }) {
  const toggleBtn = document.getElementById('toggleResultsPanelBtn');
  if (!toggleBtn || !map) return;

  let mapTransitionRafId = null;

  const syncToggleUi = () => {
    const isCollapsed = document.body.classList.contains('results-collapsed');
    toggleBtn.setAttribute('aria-expanded', String(!isCollapsed));
    toggleBtn.setAttribute(
      'aria-label',
      isCollapsed ? 'Expandir panel de resultados' : 'Encoger panel de resultados',
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
