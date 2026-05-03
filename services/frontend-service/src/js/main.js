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
      const response = await fetch(`${url}?v=${Date.now()}`);

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

import { isAuthenticated, clearUserSession, getUserId } from './utils.js';
import { phpApi } from './api.js';
import { logoutUser } from './controllers/auth.controller.js';
import { PHP_API_URL } from './config.js';

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

    // Només a landing, obre el menú cap a l'esquerra per evitar overflow lateral.
    if (document.body.classList.contains('page-landing')) {
      dropdownMenu.classList.add('dropdown-menu-end');
    }

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

/**
 * Actualitza el nom i el pla de l'usuari al sidebar si existeix.
 */
function initSidebarData() {
  const nameEl = document.getElementById('sidebar-user-name');
  const planEl = document.getElementById('sidebar-user-plan');
  if (!nameEl || !planEl) return;

  try {
    const raw = sessionStorage.getItem('parklive_user_data');
    if (!raw) return;

    const user = JSON.parse(raw);

    // El nom pot venir en diferents formats segons si és OAuth o normal
    const firstName = user.nom || user.given_name || (user.name ? user.name.split(' ')[0] : '');
    const lastName = user.cognom || user.cognoms || user.family_name || (user.name ? user.name.split(' ').slice(1).join(' ') : '');

    nameEl.textContent = `${firstName} ${lastName}`.trim() || 'Usuari';

    // Mapeig de noms de plans per a la interfície
    const plans = {
      'basic': 'Bàsic',
      'premium': 'Premium',
      'operador': 'Operador',
      'admin': 'Admin'
    };

    const rawPlan = (user.tipus_usuari || 'basic').toLowerCase();
    planEl.textContent = plans[rawPlan] || rawPlan.charAt(0).toUpperCase() + rawPlan.slice(1);

    // Actualitzar estils del badge segons el pla
    const badge = document.getElementById('sidebar-user-plan-badge');
    const badgeIcon = badge?.querySelector('i');

    if (rawPlan === 'premium') {
      badge?.classList.remove('text-danger');
      badge?.classList.add('text-warning');
      badge.style.background = 'rgba(255, 193, 7, 0.15)'; // Or similar gold color
      if (badgeIcon) badgeIcon.className = 'bi bi-star-fill';
    } else if (rawPlan === 'admin' || rawPlan === 'operador') {
      badge?.classList.remove('text-danger');
      badge?.classList.add('text-info');
      badge.style.background = 'rgba(13, 202, 240, 0.15)';
      if (badgeIcon) badgeIcon.className = 'bi bi-shield-check';
    } else {
      // Bàsic / per defecte
      badge?.classList.add('text-danger');
      badge.style.background = 'rgba(193, 18, 31, 0.15)';
      if (badgeIcon) badgeIcon.className = 'bi bi-person-badge';
    }

    // Actualitzar avatar si existeix
    if (user.foto_perfil) {
      const avatarContainer = document.getElementById('sidebar-avatar-container');
      if (avatarContainer) {
        const imageUrl = `${PHP_API_URL}/uploads/profiles/${user.foto_perfil}`;
        avatarContainer.innerHTML = `<img src="${imageUrl}" alt="Avatar" class="w-100 h-100 object-fit-cover">`;
      }
    }

  } catch (err) {
    console.warn('[ParkLive] Error al carregar dades del sidebar:', err);
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
      const { initAuth } = await import(new URL('./controllers/auth.controller.js', import.meta.url).href);
      initAuth();
    }

    // ── Dashboard (aparcaments, reserves) ────────
    if (bodyClass.includes('page-dashboard')) {
      // Carregar els dos controladors en paral·lel
      const [
        { initAparcaments },
        { initReserves },
      ] = await Promise.all([
        import(new URL('./controllers/aparcament.controller.js', import.meta.url).href),
        import(new URL('./controllers/reserves.controller.js', import.meta.url).href),
      ]);

      initAparcaments();
      initReserves();
    }

    // ── Pàgina Landing (mapa, filtres, responsive map view) ─────
    if (bodyClass.includes('page-landing')) {
      const { initLanding } = await import(new URL('./controllers/landing.controller.js', import.meta.url).href);
      initLanding();
    }

    // ── Detall d'aparcament ───────────────────────────────────
    if (bodyClass.includes('page-detall-aparcament')) {
      const { initDetallAparcament } = await import(new URL(`./controllers/detall.controller.js?v=${Date.now()}`, import.meta.url).href);
      initDetallAparcament();
    }

    // ── Reseva d'aparcament ───────────────────────────────────
    if (bodyClass.includes('page-reserva-aparcament')) {
      const { initReservaAparcament } = await import(new URL(`./controllers/reserva_aparcament.controller.js?v=${Date.now()}`, import.meta.url).href);
      initReservaAparcament();
    }

    // ── Tiquet d'Aparcament ───────────────────────────────────
    if (bodyClass.includes('page-tiquet')) {
      const { initTiquetAparcament } = await import(new URL(`./controllers/tiquet.controller.js?v=${Date.now()}`, import.meta.url).href);
      initTiquetAparcament();
    }

    // ── Report de plaça en carrer ───────────────────────────────
    if (bodyClass.includes('page-report-disponibilitat')) {
      const { initReportDisponibilitat } = await import(new URL('./controllers/report-disponibilitat.controller.js', import.meta.url).href);
      initReportDisponibilitat();
    }

    // ── Contacte ────────────────────────────────────────────────
    if (bodyClass.includes('page-contacte')) {
      const { initContacte } = await import(new URL(`./controllers/contacte.controller.js?v=${Date.now()}`, import.meta.url).href);
      initContacte();
    }

    // ── FAQ ────────────────────────────────────────────────
    if (bodyClass.includes('page-faq')) {
      const { initFaq } = await import(new URL(`./controllers/faq.controller.js?v=${Date.now()}`, import.meta.url).href);
      initFaq();
    }

    // ── Blog ───────────────────────────────────────────────
    if (bodyClass.includes('page-blog')) {
      const { initBlogList } = await import(new URL(`./controllers/blog.controller.js?v=${Date.now()}`, import.meta.url).href);
      initBlogList();
    }
    if (bodyClass.includes('page-blog-detall')) {
      const { initBlogDetail } = await import(new URL(`./controllers/blog.controller.js?v=${Date.now()}`, import.meta.url).href);
      initBlogDetail();
    }

  } catch (err) {
    console.error('[ParkLive] Error al carregar controladors:', err);
  }
}

/*  Carreguem els elements                                                          */

document.addEventListener('DOMContentLoaded', async () => {
  await loadTemplates();
  initSidebarData();

  // Crida initAuthToggle després de carregar templates (header)
  initAuthToggle();
  window.initAuthToggle = initAuthToggle;

  initThemeToggle();
  initPasswordToggles();
  await initControllers();

  // Inicialitza el controlador de perfil només a la pàgina de perfil
    if (document.body.classList.contains('page-profile')) {
    const {
      initProfilePasswordForm,
      initProfileInfoForm,
      initProfileInfoSaveForm,
      initProfilePlanSection,
      initProfileHistorySection,
      initProfileFavoritesSection,
      initProfileImageUpload,
      initProfilePointsSection
    } = await import(new URL('./controllers/profile.controller.js', import.meta.url).href);
    const { initReserves } = await import(new URL('./controllers/reserves.controller.js', import.meta.url).href);
    const { initAdminUserCRUD } = await import(new URL('./controllers/profile-admin.controller.js', import.meta.url).href);
    const { initAdminParkingCRUD } = await import(new URL('./controllers/profile-admin-aparcaments.controller.js', import.meta.url).href);
    const { initEstadistiques } = await import(new URL('./controllers/estadistiques.controller.js', import.meta.url).href);
    const { initAdminBlog } = await import(new URL('./controllers/profile-admin-blog.controller.js', import.meta.url).href);

    initProfilePasswordForm();
    initProfileInfoForm();
    initProfileImageUpload();
    initProfileInfoSaveForm();
    initProfilePlanSection();
    initProfileHistorySection();
    initProfileFavoritesSection();
    initReserves();
    initAdminUserCRUD();
    initAdminParkingCRUD();
    initEstadistiques();
    initProfilePointsSection();
    initAdminBlog();

    // Integració Stripe
    const userId = getUserId();  // sessionStorage → 'parklive_user_id'
    if (userId) {
      import(new URL('./controllers/stripe.controller.js', import.meta.url).href).then(async (module) => {
        // Inicialitzar instància de Stripe
        await module.initStripe(userId);
        // Carregar targetes existents
        const methods = await module.loadPaymentMethods(userId);
        // Vincular botó "Afegir nova targeta"
        module.initStripeButton(userId);
        // Actualitzar resum del pla passant les targetes ja carregades
        await module.updatePlanSummary(userId, methods);
      }).catch(err => console.error('[ParkLive] Error carregant stripe-integration:', err));
    }
  }

  // Wait for sidebar to be loaded
  setTimeout(() => {
    const sidebarBtns = document.querySelectorAll('.sidebar-nav-item[data-section]');
    const sections = document.querySelectorAll('.profile-section');
    const sectionTitle = document.getElementById('section-title');
    const sectionTitles = {
      info: 'Informació personal',
      password: 'Canviar contrasenya',
      reservations: 'Les Teves Reserves Actives',
      history: 'Historial',
      favorites: 'Aparcaments favorits',
      payment: 'Mètode de pagament',
      plan: 'Millorar el pla',
      manage: 'Gestionar subscripció',
      // notifications: 'Notificacions',
      'admin-users': 'Admin: Gestió d\'Usuaris',
      'admin-parkings': 'Admin: Gestió d\'Aparcaments',
      'admin-blog': 'Admin: Gestió del Blog',
      stadistics: 'Les teves estadístiques',
      points: 'Canviar punts per recompenses'
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

    // Oculta la pestanya "Millorar el pla" o "Gestionar subscripció" depenent si s'és premium
    const planBtn = document.querySelector('.sidebar-nav-item[data-section="plan"]');
    const manageBtn = document.querySelector('.sidebar-nav-item[data-section="manage"]');
    const stadisticsBtn = document.querySelector('.sidebar-nav-item[data-section="stadistics"]');

    try {
      const storedUserData = sessionStorage.getItem('parklive_user_data');
      if (storedUserData) {
        const userData = JSON.parse(storedUserData);
        if (userData.tipus_usuari === 'premium') {
          if (planBtn) planBtn.style.display = 'none';
        } else {
          if (manageBtn) manageBtn.style.display = 'none';
          if (stadisticsBtn) stadisticsBtn.style.display = 'none';
        }

        // Amagar botó de punts per a administradors (només per a usuaris)
        const pointsBtn = document.querySelector('.sidebar-nav-item[data-section="points"]');
        if (userData.tipus_usuari === 'admin' && pointsBtn) {
          pointsBtn.style.display = 'none';
        }

        // Mostrar opcions d'administrador i ocultar coses d'usuari
        if (userData.tipus_usuari === 'admin') {
          document.querySelectorAll('.admin-only').forEach(el => {
            el.classList.remove('d-none');
          });

          // Ocultar seccions que l'admin no necessita (reserves, historial, pagaments, estadístiques, favorits, etc.)
          const sectionsToHide = ['reservations', 'history', 'payment', 'plan', 'manage', 'notifications', 'stadistics', 'favorites', 'points'];
          sectionsToHide.forEach(sec => {
            const btn = document.querySelector(`.sidebar-nav-item[data-section="${sec}"]`);
            if (btn) btn.style.display = 'none';
          });
        }
      } else {
        if (manageBtn) manageBtn.style.display = 'none';
      }
    } catch (e) {
      console.error('[ParkLive] Error parsejant dades usuari per ocultar pla:', e);
    }
  }, 100);
});
