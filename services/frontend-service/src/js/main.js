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
import { phpApi } from './api.js';
import { logoutUser } from './controllers/auth.controller.js';

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

  // Eliminar totes les fletxes del botó clonat
  newBtn.querySelectorAll('.user-dropdown-arrow').forEach(el => el.remove());

  if (isAuthenticated()) {
    // Comprova si l'usuari és OAuth Google
    const isOAuth = sessionStorage.getItem('parklive_oauth') === 'google';

    // Manté la icona original (bi-person)
    icon.className = 'bi bi-person';
    newBtn.setAttribute('aria-label', 'Opcions d\'usuari');
    newBtn.setAttribute('role', 'button');
    newBtn.classList.add('dropdown-toggle');
    newBtn.setAttribute('data-bs-toggle', 'dropdown');
    newBtn.setAttribute('aria-expanded', 'false');

    // // L'usuari autenticat per email ha d'anar a perfil.html, l'OAuth també
    // newBtn.setAttribute('href', '/perfil.html');

    // Afegir fletxa animada
    let arrowIcon = newBtn.querySelector('.user-dropdown-arrow');
    let arrowWrapper = newBtn.querySelector('.user-dropdown-arrow');
    if (!arrowWrapper) {
      arrowWrapper = document.createElement('span');
      arrowWrapper.className = 'user-dropdown-arrow ms-2 d-inline-block';
      arrowIcon = document.createElement('i');
      arrowIcon.className = 'bi bi-caret-down-fill';
      arrowWrapper.appendChild(arrowIcon);
      newBtn.appendChild(arrowWrapper);
    }

    // Crear menú desplegable Bootstrap
    let dropdownMenu = document.createElement('ul');
    dropdownMenu.classList.add('dropdown-menu', 'bg-secondary');

    // Element: Perfil d'usuari
    let profileItem = document.createElement('li');
    let profileLink = document.createElement('a');
    profileLink.classList.add('dropdown-item', 'text-primary');
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
    logoutLink.addEventListener('click', async (e) => {
      e.preventDefault();
      // Utilitza la funció centralitzada de logout
      await logoutUser('/index.html');
    });
    logoutItem.appendChild(logoutLink);
    dropdownMenu.appendChild(logoutItem);

    // Eliminar menú antic si existeix
    const oldMenu = dropdownWrapper.querySelector('ul.dropdown-menu');
    if (oldMenu) oldMenu.remove();

    // Inserir el menú com a fill del contenidor dropdown
    dropdownWrapper.appendChild(newBtn);
    dropdownWrapper.appendChild(dropdownMenu);

    // Animació fletxa: canvia quan el menú s'obre/tanca
    dropdownWrapper.addEventListener('show.bs.dropdown', () => {
      arrowIcon.className = 'bi bi-caret-up-fill';
      arrowWrapper.classList.remove('icon-flip-enter');
      void arrowWrapper.offsetWidth;
      arrowWrapper.classList.add('icon-flip-enter');
    });

    dropdownWrapper.addEventListener('hide.bs.dropdown', () => {
      arrowIcon.className = 'bi bi-caret-down-fill';
      arrowWrapper.classList.remove('icon-flip-enter');
      void arrowWrapper.offsetWidth;
      arrowWrapper.classList.add('icon-flip-enter');
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

/*  Carreguem els elements                                                          */

document.addEventListener('DOMContentLoaded', async () => {
  await loadTemplates();

  // Crida initAuthToggle després de carregar templates (header)
  initAuthToggle();
  window.initAuthToggle = initAuthToggle;

  initThemeToggle();
  initPasswordToggles();
  await initControllers();

  // Inicialitza el controlador de perfil només a la pàgina de perfil
  if (document.body.classList.contains('page-profile')) {
    const { initProfilePasswordForm, initProfileInfoForm, initProfileInfoSaveForm } = await import('./controllers/profile.controller.js');
    initProfilePasswordForm();
    initProfileInfoForm();
    initProfileInfoSaveForm();
  }

  // Wait for sidebar to be loaded
  setTimeout(() => {
    const sidebarBtns = document.querySelectorAll('.sidebar-nav-item[data-section]');
    const sections = document.querySelectorAll('.profile-section');
    const sectionTitle = document.getElementById('section-title');
    const sectionTitles = {
      info: 'Informació personal',
      password: 'Canviar contrasenya',
      history: 'Historial',
      payment: 'Mètode de pagament',
      plan: 'Millorar el pla',
      notifications: 'Notificacions',
    };
    sidebarBtns.forEach(btn => {
      btn.addEventListener('click', () => {
        const sec = btn.dataset.section;
        if (sec === 'logout') {
          logoutUser('/index.html');
          return;
        }
        sidebarBtns.forEach(b => b.classList.remove('active'));
        btn.classList.add('active');
        sections.forEach(s => s.classList.remove('active'));
        const target = document.getElementById('section-' + sec);
        if (target) target.classList.add('active');
        if (sectionTitle) sectionTitle.textContent = sectionTitles[sec] || '';
      });
    });

    // Oculta el botó de sidebar si la secció de contrasenya està oculta o si l'usuari és OAuth
    const passwordSection = document.getElementById('section-password');
    const passwordBtn = document.querySelector('.sidebar-nav-item[data-section="password"]');
    const isOAuth = sessionStorage.getItem('parklive_oauth') === 'google';
    console.log('[ParkLive] OAuth a sessionStorage:', sessionStorage.getItem('parklive_oauth'));
    console.log('[ParkLive] isOAuth:', isOAuth);
    if ((passwordSection && passwordSection.style.display === 'none') || isOAuth) {
      if (passwordBtn) passwordBtn.style.display = 'none';
    }
  }, 100);
});
