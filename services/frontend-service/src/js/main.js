/**
 * ParkLive – main.js  (ES Module)
 *
 * Punt d'entrada de l'aplicació frontend.
 * 1. CarregaComponents reutilitzables (header, footer, sidebar…)
 * 2. Inicialitza el toggle de tema clar/fosc
 * 3. Carrega dinàmicament el controlador adequat segons la pàgina
 */

/*  1. CÀRREGA DE TEMPLATES                                            */

/**
 * Busca tots els <div class="template-slot" data-template="ruta.html">
 * i hi injecta el HTML corresponent.
 */
async function loadTemplates() {
  const slots = document.querySelectorAll('.template-slot[data-template]');

  const fetches = Array.from(slots).map(async (slot) => {
    const url = slot.getAttribute('data-template');

    try {
      const response = await fetch(url);

      if (!response.ok) {
        console.error(`[ParkLive] Error carregant plantilla "${url}": ${response.status}`);
        return;
      }

      const html = await response.text();
      slot.innerHTML = html;
    } catch (err) {
      console.error(`[ParkLive] No s'ha pogut carregar la plantilla "${url}":`, err);
    }
  });

  await Promise.all(fetches);
}

/*  2. TEMA CLAR / FOSC                                                */

function getPreferredTheme() {
  const storedTheme = localStorage.getItem('theme');
  if (storedTheme === 'light' || storedTheme === 'dark') return storedTheme;
  return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
}

function applyTheme(theme) {
  document.documentElement.setAttribute('data-bs-theme', theme);
  localStorage.setItem('theme', theme);
}

function initThemeToggle() {
  // Sempre aplicar el tema, encara que no hi hagi botons de toggle
  applyTheme(getPreferredTheme());

  const darkButton = document.querySelector('[data-theme-toggle="dark"]');
  const lightButton = document.querySelector('[data-theme-toggle="light"]');

  // Si no hi ha botons de toggle (pàgines auth sense header), sortim
  if (!darkButton || !lightButton) return;

  // Actualitzar visibilitat dels botons segons el tema actual
  const theme = getPreferredTheme();
  if (theme === 'light') {
    darkButton.classList.remove('d-none');
    lightButton.classList.add('d-none');
  } else {
    darkButton.classList.add('d-none');
    lightButton.classList.remove('d-none');
  }

  darkButton.addEventListener('click', () => {
    applyTheme('dark');
    darkButton.classList.add('d-none');
    lightButton.classList.remove('d-none');
  });

  lightButton.addEventListener('click', () => {
    applyTheme('light');
    darkButton.classList.remove('d-none');
    lightButton.classList.add('d-none');
  });
}

/*  3. BOTÓ AUTH DEL HEADER (SESSIÓ)                                   */

import { isAuthenticated, clearUserSession } from './utils.js';

/**
 * Comprova si l'usuari té la sessió iniciada.
 * - Si SÍ  → mostra icona logout (box-arrow-in-right) i tanca sessió al clic.
 * - Si NO  → mostra icona persona (person) i enllaça al dashboard/login.
 */
function initAuthToggle() {
  const btn = document.querySelector('[data-role="auth-toggle"]');
  if (!btn) return;

  const icon = btn.querySelector('i');
  if (!icon) return;

  // Encapsular el botó en un contenidor dropdown si no existeix
  let dropdownWrapper = btn.closest('.dropdown');
  if (!dropdownWrapper) {
    dropdownWrapper = document.createElement('div');
    dropdownWrapper.className = 'dropdown';
    btn.parentNode.insertBefore(dropdownWrapper, btn);
    dropdownWrapper.appendChild(btn);
  }

  // Eliminar events anteriors per evitar duplicats
  const newBtn = btn.cloneNode(true);
  dropdownWrapper.replaceChild(newBtn, btn);

  // Afegir icona fletxa si no existeix
  let arrowIcon = newBtn.querySelector('.user-dropdown-arrow');
  if (!arrowIcon) {
    arrowIcon = document.createElement('i');
    arrowIcon.className = 'bi bi-caret-down-fill user-dropdown-arrow ms-2';
    newBtn.appendChild(arrowIcon);
  }

  if (isAuthenticated()) {
    // Manté la icona original (bi-person)
    icon.className = 'bi bi-person';
    newBtn.setAttribute('aria-label', 'Opcions d\'usuari');
    newBtn.setAttribute('href', '#');
    newBtn.setAttribute('role', 'button');
    newBtn.classList.add('dropdown-toggle');
    newBtn.setAttribute('data-bs-toggle', 'dropdown');
    newBtn.setAttribute('aria-expanded', 'false');

    // Crear menú desplegable Bootstrap
    let dropdownMenu = document.createElement('ul');
    dropdownMenu.classList.add('dropdown-menu',"bg-secondary");

    // Element: Perfil d'usuari
    let profileItem = document.createElement('li');
    let profileLink = document.createElement('a');
    profileLink.classList.add('dropdown-item', "text-primary");
    profileLink.href = '/perfil.html';
    profileLink.textContent = 'Perfil d\'usuari';

    profileItem.appendChild(profileLink);
    dropdownMenu.appendChild(profileItem);

    // Element: Tancar sessió
    let logoutItem = document.createElement('li');
    let logoutLink = document.createElement('a');
    logoutLink.className = 'dropdown-item text-danger';
    logoutLink.href = '#';
    logoutLink.textContent = 'Tancar sessió';
    logoutLink.addEventListener('click', (e) => {
      e.preventDefault();
      clearUserSession();
      window.location.href = '/index.html';
    });
    logoutItem.appendChild(logoutLink);
    dropdownMenu.appendChild(logoutItem);

    // Eliminar menú antic si existeix
    const oldMenu = dropdownWrapper.querySelector('ul.dropdown-menu');
    if (oldMenu) oldMenu.remove();

    // Inserir el menú com a fill del contenidor dropdown
    dropdownWrapper.appendChild(newBtn);
    dropdownWrapper.appendChild(dropdownMenu);


// Animació icona dropdown
    // Animació fletxa: canvia quan el menú s'obre/tanca
    dropdownWrapper.addEventListener('show.bs.dropdown', () => {
      arrowIcon.className = 'bi bi-caret-up-fill user-dropdown-arrow ms-2';
    });
    dropdownWrapper.addEventListener('hide.bs.dropdown', () => {
      arrowIcon.className = 'bi bi-caret-down-fill user-dropdown-arrow ms-2';
    });
  }
}

/*  4. CÀRREGA DINÀMICA DE CONTROLADORS                                */

/**
 * Toggle de visibilitat de contrasenyes.
 * Busca botons amb data-action="toggle-password" i alterna
 * el type del input adjacent entre "password" i "text".
 */
function initPasswordToggles() {
  document.querySelectorAll('[data-action="toggle-password"]').forEach((btn) => {
    btn.addEventListener('click', () => {
      const input = btn.closest('.input-group')?.querySelector('input[type="password"], input[type="text"]');
      if (!input) return;

      const isHidden = input.type === 'password';
      input.type = isHidden ? 'text' : 'password';

      const icon = btn.querySelector('i');
      if (icon) {
        icon.className = isHidden ? 'bi bi-eye text-body-tertiary' : 'bi bi-eye-slash text-body-tertiary';
      }
    });
  });
}


/**
 * Importa i inicialitza els controladors JS necessaris
 * segons les classes del <body> de la pàgina actual.
 *
 * Utilitza import() dinàmic per carregar només el codi necessari
 * (code-splitting natiu sense bundler).
 */
async function initControllers() {
  const bodyClass = document.body.className;

  try {
    // ── Pàgines d'autenticació (login, registre, reset) ────────
    if (bodyClass.includes('page-auth')) {
      const { initAuth } = await import('./controllers/auth.controller.js');
      initAuth();
    }

    // ── Dashboard (aparcaments, reserves, contribucions) ────────
    if (bodyClass.includes('page-dashboard')) {
      // Carregar els tres controladors en paral·lel
      const [
        { initAparcaments },
        { initReserves },
        { initContribucions },
      ] = await Promise.all([
        import('./controllers/aparcament.controller.js'),
        import('./controllers/reserves.controller.js'),
        import('./controllers/contribucions.controller.js'),
      ]);

      initAparcaments();
      initReserves();
      initContribucions();
    }

    // ── Pàgina Landing (index) – sense controladors addicionals ──
    // Si en el futur cal funcionalitat a la landing, afegir aquí.

  } catch (err) {
    console.error('[ParkLive] Error al carregar controladors:', err);
  }
}

/*  Carregem els elements                                                          */

document.addEventListener('DOMContentLoaded', async () => {
  // 1. Carregar components HTML (header, footer, sidebar)
  await loadTemplates();

  // 2. Inicialitzar toggle de tema (depèn del header carregat)
  initThemeToggle();

  // 3. Actualitzar botó auth del header (login / logout)
  initAuthToggle();

  // 4. Toggle mostrar/amagar contrasenya als formularis
  initPasswordToggles();

  // 5. Inicialitzar controladors de la pàgina
  await initControllers();
});
