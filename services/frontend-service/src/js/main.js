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

function initThemeToggle() {
  const darkButton = document.querySelector('[data-theme-toggle="dark"]');
  const lightButton = document.querySelector('[data-theme-toggle="light"]');

  if (!darkButton || !lightButton) return;

  const getPreferredTheme = () => {
    const storedTheme = localStorage.getItem('theme');
    if (storedTheme === 'light' || storedTheme === 'dark') return storedTheme;
    return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
  };

  const applyTheme = (theme) => {
    document.documentElement.setAttribute('data-bs-theme', theme);
    localStorage.setItem('theme', theme);

    if (theme === 'light') {
      darkButton.classList.remove('d-none');
      lightButton.classList.add('d-none');
      return;
    }

    darkButton.classList.add('d-none');
    lightButton.classList.remove('d-none');
  };

  applyTheme(getPreferredTheme());

  darkButton.addEventListener('click', () => applyTheme('dark'));
  lightButton.addEventListener('click', () => applyTheme('light'));
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

  if (isAuthenticated()) {
    // Canviar icona i comportament a "tancar sessió"
    icon.className = 'bi bi-box-arrow-in-right';
    btn.setAttribute('aria-label', 'Tancar sessió');
    btn.setAttribute('href', '#');
    btn.setAttribute('role', 'button');

    btn.addEventListener('click', (e) => {
      e.preventDefault();
      clearUserSession();
      window.location.href = '/login.html';
    });
  }
  // Si no hi ha sessió, es manté l'icona bi-person i l'href original
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
