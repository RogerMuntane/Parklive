import { isPremiumUser } from '../../utils.js';

export function initFilterPanelControls() {
  const updateRangeValues = () => {
    const priceRange = document.getElementById('priceRange');
    const distanceRange = document.getElementById('distanceRange');
    const priceRangeValue = document.getElementById('priceRangeValue');
    const distanceRangeValue = document.getElementById('distanceRangeValue');

    if (priceRange && priceRangeValue) {
      priceRangeValue.textContent = `Fins a ${priceRange.value} €/dia`;
    }

    if (distanceRange && distanceRangeValue) {
      distanceRangeValue.textContent = `Fins a ${distanceRange.value} km`;
    }
  };

  const setupQuickChoices = () => {
    const quickChoices = document.querySelectorAll('.quick-choice[data-target][data-value]');

    quickChoices.forEach((button) => {
      button.addEventListener('click', () => {
        const target = document.getElementById(button.dataset.target);
        if (!target) return;

        target.value = button.dataset.value;
        target.dispatchEvent(new Event('input', { bubbles: true }));
      });
    });
  };

  const setupVehicleOptions = () => {
    const vehicleOptions = document.querySelectorAll('.vehicle-option[data-vehicle]');
    vehicleOptions.forEach((option) => {
      option.addEventListener('click', () => {
        const wasActive = option.classList.contains('active');

        // Remove active from all
        vehicleOptions.forEach(opt => {
          opt.classList.remove('active');
          opt.setAttribute('aria-pressed', 'false');
        });

        // Toggle current
        if (!wasActive) {
          option.classList.add('active');
          option.setAttribute('aria-pressed', 'true');
        }
      });
    });
  };

  const setupFormReset = () => {
    const filterForm = document.getElementById('filtresContainer');
    const vehicleOptions = document.querySelectorAll('.vehicle-option[data-vehicle]');
    if (!filterForm) return;

    filterForm.addEventListener('reset', () => {
      globalThis.setTimeout(() => {
        vehicleOptions.forEach((option) => {
          option.classList.remove('active');
          option.setAttribute('aria-pressed', 'false');
        });

        const toggles = [
          { cardId: 'electric-toggle', switchId: 'electric-switch', inputId: 'electricCharging' },
          { cardId: 'accessibility-toggle', switchId: 'accessibility-switch', inputId: 'accessibility' },
          { cardId: 'videovigilancia-toggle', switchId: 'videovigilancia-switch', inputId: 'videovigilancia' },
          { cardId: 'favorites-toggle', switchId: 'favoritesOnly-switch', inputId: 'favoritesOnly' }
        ];
        toggles.forEach(({ cardId, switchId, inputId }) => {
          const card = document.getElementById(cardId);
          const sw = document.getElementById(switchId);
          const input = document.getElementById(inputId);
          if (card && sw && input) {
            card.classList.remove('active');
            sw.classList.remove('on');
          }
        });
        
        // Reset parking category
        const typeAll = document.getElementById('typeAll');
        if (typeAll) typeAll.checked = true;

        updateRangeValues();
      }, 0);
    });
  };

  const priceRange = document.getElementById('priceRange');
  const distanceRange = document.getElementById('distanceRange');

  if (priceRange) {
    priceRange.addEventListener('input', updateRangeValues);
  }

  if (distanceRange) {
    distanceRange.addEventListener('input', updateRangeValues);
  }

  const setupCustomToggles = () => {
    const toggles = [
      { cardId: 'electric-toggle', switchId: 'electric-switch', inputId: 'electricCharging' },
      { cardId: 'accessibility-toggle', switchId: 'accessibility-switch', inputId: 'accessibility' },
      { cardId: 'videovigilancia-toggle', switchId: 'videovigilancia-switch', inputId: 'videovigilancia' },
      { cardId: 'favorites-toggle', switchId: 'favoritesOnly-switch', inputId: 'favoritesOnly' }
    ];

    toggles.forEach(({ cardId, switchId, inputId }) => {
      const card = document.getElementById(cardId);
      const sw = document.getElementById(switchId);
      const input = document.getElementById(inputId);

      if (!card || !sw || !input) return;

      const updateUI = () => {
        if (input.checked) {
          card.classList.add('active');
          sw.classList.add('on');
        } else {
          card.classList.remove('active');
          sw.classList.remove('on');
        }
      };

      card.addEventListener('click', () => {
        input.checked = !input.checked;
        updateUI();
        input.dispatchEvent(new Event('change', { bubbles: true }));
      });

      // Initial state
      updateUI();
    });
  };

  updateRangeValues();
  setupQuickChoices();
  setupVehicleOptions();
  setupFormReset();
  setupCustomToggles();

  // Hide premium-only features if user is not premium
  if (!isPremiumUser()) {
    const premiumOnly = document.querySelectorAll('.premium-only');
    premiumOnly.forEach(el => el.classList.add('d-none'));
  }
}

export function setupSearchBar({ closeFilters }) {
  const mapSearchBar = document.getElementById('mapSearchBar');
  const backdrop = document.getElementById('filtersBackdrop');
  if (!mapSearchBar) return;

  mapSearchBar.addEventListener('submit', (event) => {
    event.preventDefault();
  });

  if (backdrop) {
    backdrop.addEventListener('click', () => {
      closeFilters(false);
    });
  }
}

export function createFiltersController({ map, updateOpenPopupsLayout }) {
  const toggleFilters = (forceState) => {
    const sidepanel = document.getElementById('filtresSidepanel');
    const filtersButton = document.getElementById('mapFiltersBtn');
    const backdrop = document.getElementById('filtersBackdrop');
    if (!sidepanel) return;

    const shouldOpen =
      typeof forceState === 'boolean'
        ? forceState
        : !sidepanel.classList.contains('filters-visible');

    sidepanel.classList.toggle('filters-visible', shouldOpen);
    sidepanel.setAttribute('aria-hidden', String(!shouldOpen));
    document.body.classList.toggle('filters-open', shouldOpen);

    if (backdrop) {
      backdrop.classList.toggle('is-visible', shouldOpen);
      backdrop.setAttribute('aria-hidden', String(!shouldOpen));
    }

    if (filtersButton) {
      filtersButton.setAttribute('aria-expanded', String(shouldOpen));
    }

    globalThis.setTimeout(() => {
      if (map && typeof map.invalidateSize === 'function') {
        map.invalidateSize();
        updateOpenPopupsLayout();
      }
    }, 320);
  };

  const openFiltersBtn = document.getElementById('mapFiltersBtn');
  const closeFiltersBtn = document.querySelector('.filters-close');

  if (openFiltersBtn) {
    openFiltersBtn.addEventListener('click', () => {
      toggleFilters();
    });
  }

  if (closeFiltersBtn) {
    closeFiltersBtn.addEventListener('click', () => {
      toggleFilters(false);
    });
  }

  return toggleFilters;
}
