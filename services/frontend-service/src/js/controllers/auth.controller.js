/**
 * ParkLive – auth.controller.js
 * Controlador d'autenticació: login, registre i reset de contrasenya.
 * Intercepta els formularis HTML i envia les dades via AJAX al servei PHP
 * i al servei Python (reset code).
 */

import { phpApi, pythonApi } from '../api.js';
import { REDIRECT_DELAY, GOOGLE_CLIENT_ID, STORAGE_KEYS } from '../config.js';
import {
  showAlert,
  hideAllAlerts,
  serializeForm,
  validateForm,
  setFormLoading,
  saveUserSession,
  clearUserSession,
  redirectAfterDelay,
  showBootstrapAlert,
} from '../utils.js';

/*  GOOGLE CLIENT ID (carregat dinàmicament del backend)                */

let _googleClientId = null;

/**
 * Obté el Google Client ID des de la configuració o el backend Python.
 * Primer intenta el valor injectat per Webpack; si no existeix, el demana al backend.
 *
 * @returns {Promise<string|null>} El Client ID de Google, o null si no es pot obtenir.
 */
async function getGoogleClientId() {
  if (_googleClientId) return _googleClientId;

  // Intentar usar el valor injectat des de l'entorn primer
  if (GOOGLE_CLIENT_ID && GOOGLE_CLIENT_ID !== 'undefined' && GOOGLE_CLIENT_ID !== '') {
    _googleClientId = GOOGLE_CLIENT_ID;
    return _googleClientId;
  }

  try {
    const result = await pythonApi.get('/api/config/google-client-id');
    if (result && result.client_id) {
      _googleClientId = result.client_id;
      return _googleClientId;
    }
  } catch {
    console.warn('No s\'ha pogut obtenir el Google Client ID del servidor.');
  }

  return null;
}

/*  LOGIN                                                               */

/**
 * Inicialitza el formulari de login (pàgina page-login).
 * Intercepta el submit, valida les dades i les envia al servei PHP.
 *
 * @returns {void}
 */
function initLogin() {
  const form = document.querySelector('.form-auth');
  if (!form) return;

  form.addEventListener('submit', async (e) => {
    e.preventDefault();
    hideAllAlerts();

    if (!validateForm(form)) return;

    const data = serializeForm(form);

    // Mapatge de camps HTML → camps esperats per PHP
    const payload = {
      mail: data.email || '',
      contrasenya: data.password || '',
    };

    setFormLoading(form, true);

    try {
      const result = await postToPhp('/api/login', payload);

      if (result && result.success) {
        if (result.user) {
          if (result.token) result.user.token = result.token;
          saveUserSession(result.user);
          if (typeof window.initAuthToggle === 'function') window.initAuthToggle();
        }
        // Neteja explícita de la sessió OAuth si NO és Google
        sessionStorage.removeItem('parklive_oauth');

        // showAlert('success', result.message || 'Sessió iniciada correctament.');
        showBootstrapAlert('success', result.message || 'Sessió iniciada correctament!');

        // Si l'Auth Guard va redirigir des d'una pàgina protegida, hi tornem
        const redirectParam = new URLSearchParams(window.location.search).get('redirect');
        const target = redirectParam ? decodeURIComponent(redirectParam) : '/';
        redirectAfterDelay(target, REDIRECT_DELAY);
      }
    } catch (err) {
      const msg = err.message || 'Error en iniciar sessió. Revisa les credencials.';
      showAlert('error', msg);
    } finally {
      setFormLoading(form, false);
    }
  });
}

/*  REGISTRE*/

/**
 * Inicialitza el formulari de registre (pàgina page-register).
 * Valida que les contrasenyes coincideixin i envia les dades al servei PHP.
 *
 * @returns {void}
 */
function initRegister() {
  const form = document.querySelector('.form-auth');
  if (!form) return;

  form.addEventListener('submit', async (e) => {
    e.preventDefault();
    hideAllAlerts();

    if (!validateForm(form)) return;

    const data = serializeForm(form);

    // Validació de contrasenyes coincidents
    //TODO eliminar duplicacions de validacions del php, com comparra contrasenyes
    if (data.password !== data.confirm_password) {
      showAlert('error', 'Les contrasenyes no coincideixen.');
      return;
    }

    // Mapatge de camps HTML → camps esperats per PHP
    const payload = {
      name: data.full_name || '',
      cognom: data.last_name || '',
      mail: data.email || '',
      contrasenya: data.password || '',
      contrasenya_confirmar: data.confirm_password || '',
      telefon: data.phone || '',
    };

    setFormLoading(form, true);

    try {
      const result = await postToPhp('/api/signin', payload);

      if (result && result.success) {
        showBootstrapAlert('success', result.message || 'Benvingut/da a ParkLive! Registre completat.');
        redirectAfterDelay('/login', REDIRECT_DELAY);
      }
    } catch (err) {
      const msg = err.message || 'No s\'ha pogut completar el registre.';
      showAlert('error', msg);
    } finally {
      setFormLoading(form, false);
    }
  });
}



/*  RESET CONTRASENYA – Pas 1: Sol·licitar codi                       */

/**
 * Mostra un pas del formulari de reset i amaga els altres.
 *
 * @param {'step-request'|'step-verify'|'step-success'} stepId - ID del pas a mostrar.
 * @returns {void}
 */
function showResetStep(stepId) {
  document.querySelectorAll('.step').forEach((s) => s.classList.add('d-none'));
  const target = document.getElementById(stepId);
  if (target) target.classList.remove('d-none');
}

/**
 * Inicialitza la sol·licitud de codi de reset via el servei Python.
 * S'utilitza en qualsevol pàgina que tingui un formulari amb id
 * "reset-request-form" o la classe "form-reset-request".
 *
 * @returns {void}
 */
function initRequestResetCode() {
  const form = document.querySelector('.form-reset-request, #reset-request-form');
  if (!form) return;

  form.addEventListener('submit', async (e) => {
    e.preventDefault();
    hideAllAlerts();

    if (!validateForm(form)) return;

    const data = serializeForm(form);
    const email = (data.email || '').trim();

    if (!email) {
      showAlert('error', 'El correu electrònic és obligatori.');
      return;
    }

    setFormLoading(form, true);

    try {
      const result = await pythonApi.post('/api/auth/send-reset-code', { email });

      // Guardar dades del reset per a la verificació posterior
      sessionStorage.setItem(
        'parklive_reset_data',
        JSON.stringify({
          email,
          verification_id: result.verification_id || null,
          expires_at: result.expires_at || null,
        })
      );

      showBootstrapAlert('info', result.message || 'Codi de verificació enviat al correu.');

      // Transició al pas 2: verificar codi
      showResetStep('step-verify');
    } catch (err) {
      const msg = err.message || 'No s\'ha pogut enviar el codi. Torna-ho a provar.';
      showAlert('error', msg);
    } finally {
      setFormLoading(form, false);
    }
  });
}

/* ================================================================== */
/*  RESET CONTRASENYA – Pas 2: Verificar codi i canviar contrasenya   */
/* ================================================================== */

/**
 * Inicialitza el formulari de verificació de codi i canvi de contrasenya.
 * Gestiona el flux de verificació i el botó de reenviar codi.
 *
 * @returns {void}
 */
function initVerifyResetCode() {
  const form = document.querySelector('.form-reset-verify, #reset-verify-form');
  if (!form) return;

  form.addEventListener('submit', async (e) => {
    e.preventDefault();
    hideAllAlerts();

    if (!validateForm(form)) return;

    const data = serializeForm(form);
    const code = (data.code || '').trim();
    const newPassword = data.new_password || '';
    const confirmPassword = data.confirm_new_password || '';

    if (!code) {
      showAlert('error', 'El codi de verificació és obligatori.');
      return;
    }

    if (!newPassword || !confirmPassword) {
      showAlert('error', 'La contrasenya i la confirmació són obligatòries.');
      return;
    }

    if (newPassword !== confirmPassword) {
      showAlert('error', 'Les contrasenyes no coincideixen.');
      return;
    }

    // Recuperar dades del pas 1
    let resetData;
    try {
      resetData = JSON.parse(sessionStorage.getItem('parklive_reset_data') || '{}');
    } catch {
      resetData = {};
    }

    if (!resetData.email) {
      showAlert('error', 'Sessió de reset caducada. Torna a sol·licitar el codi.');
      showResetStep('step-request');
      return;
    }

    setFormLoading(form, true);

    try {
      const result = await pythonApi.post('/api/auth/verify-and-change-password', {
        email: resetData.email,
        code,
        verification_id: resetData.verification_id,
        new_password: newPassword,
        confirm_password: confirmPassword,
      });

      // Netejar dades de reset
      sessionStorage.removeItem('parklive_reset_data');

      showAlert('success', result.message || 'Contrasenya canviada correctament!');

      // Transició al pas 3: confirmació d'èxit
      showResetStep('step-success');
    } catch (err) {
      const msg = err.message || 'Error en verificar el codi o canviar la contrasenya.';
      showAlert('error', msg);
    } finally {
      setFormLoading(form, false);
    }
  });

  // Botó "Torna a enviar" codi
  const resendLink = document.getElementById('resend-code');
  if (resendLink) {
    resendLink.addEventListener('click', async (e) => {
      e.preventDefault();
      hideAllAlerts();

      let resetData;
      try {
        resetData = JSON.parse(sessionStorage.getItem('parklive_reset_data') || '{}');
      } catch {
        resetData = {};
      }

      if (!resetData.email) {
        showAlert('error', 'Sessió de reset caducada. Torna a sol·licitar el codi.');
        showResetStep('step-request');
        return;
      }

      try {
        const result = await pythonApi.post('/api/auth/send-reset-code', {
          email: resetData.email,
        });

        // Actualitzar dades de sessió
        sessionStorage.setItem(
          'parklive_reset_data',
          JSON.stringify({
            email: resetData.email,
            verification_id: result.verification_id || null,
            expires_at: result.expires_at || null,
          })
        );

        showAlert('success', 'Codi reenviat al teu correu.');
      } catch (err) {
        const msg = err.message || 'No s\'ha pogut reenviar el codi.';
        showAlert('error', msg);
      }
    });
  }
}

/* ================================================================== */
/*  GOOGLE SIGN-IN                                                      */
/* ================================================================== */

/**
 * Gestiona la resposta del token d'accés de Google.
 * Envia l'access_token al backend Python per verificar-lo i
 * crear/trobar l'usuari a la BD. Sincronitza la sessió amb PHP.
 *
 * @param {Object} tokenResponse - Resposta de requestAccessToken().
 * @param {string} tokenResponse.access_token - El token d'accés de Google.
 * @returns {Promise<void>}
 */
async function handleGoogleTokenResponse(tokenResponse) {
  hideAllAlerts();

  if (!tokenResponse || !tokenResponse.access_token) {
    showAlert('error', 'No s\'ha pogut obtenir les credencials de Google.');
    return;
  }

  try {
    const result = await pythonApi.post('/api/auth/google', {
      access_token: tokenResponse.access_token,
    });

    if (result && result.success) {
      // 2. Sincronitzar sessió amb PHP (Crea PHPSESSID i el token CSRF)
      try {
        const phpResult = await phpApi.post('/api/auth/google', { access_token: tokenResponse.access_token });
        if (result.user) {
          result.user.token = result.token || phpResult.token;
        }
      } catch (err) {
        console.error('Error sincronitzant sessió amb PHP:', err);
        showAlert('error', 'Error en completar la sessió.');
        return;
      }

      saveUserSession(result.user);
      // Si és Google OAuth, crea cookie per ocultar canvi contrasenya
      if (result.user && result.user.provider === 'google') {
        sessionStorage.setItem('parklive_oauth', 'google');
      }
      showAlert('success', result.message || 'Sessió iniciada amb Google!');

      // Si l'Auth Guard va redirigir des d'una pàgina protegida, hi tornem
      const redirectParam = new URLSearchParams(window.location.search).get('redirect');
      const target = redirectParam ? decodeURIComponent(redirectParam) : '/';
      redirectAfterDelay(target, REDIRECT_DELAY);
    }
  } catch (err) {
    const msg = err.message || 'Error en l\'autenticació amb Google.';
    showAlert('error', msg);
  }
}

/**
 * Inicialitza Google OAuth 2.0 amb initTokenClient i vincula
 * els botons amb data-action="google-login" via addEventListener.
 *
 * Flux recomanat per Google per a botons personalitzats:
 * 1. google.accounts.oauth2.initTokenClient() → crea el client
 * 2. addEventListener('click') → tokenClient.requestAccessToken()
 * 3. Google obre popup real de selecció de compte
 * 4. Callback rep access_token → enviar al backend per verificar
 *
 * @returns {Promise<void>}
 */
async function initGoogleSignIn() {
  const googleBtns = document.querySelectorAll('[data-action="google-login"]');
  if (googleBtns.length === 0) return;

  // Obtenir el Client ID dinàmicament del backend
  const clientId = await getGoogleClientId();
  if (!clientId) {
    console.warn('Google Sign-In desactivat: GOOGLE_CLIENT_ID no configurat.');
    googleBtns.forEach((btn) => {
      btn.disabled = true;
      btn.title = 'Google Sign-In no disponible';
    });
    return;
  }

  // Esperar que la llibreria de Google es carregui (async defer)
  function setupGoogle() {
    if (typeof google === 'undefined' || !google.accounts || !google.accounts.oauth2) {
      setTimeout(setupGoogle, 200);
      return;
    }

    // Crear el Token Client amb els scopes necessaris
    const tokenClient = google.accounts.oauth2.initTokenClient({
      client_id: clientId,
      scope: 'openid email profile',
      callback: handleGoogleTokenResponse,
    });

    // Vincular cada botó amb un addEventListener net
    googleBtns.forEach((btn) => {
      btn.addEventListener('click', () => {
        tokenClient.requestAccessToken();
      });
    });
  }

  setupGoogle();
}

/*  HELPERS PHP                                                         */

/**
 * Envia dades al servei PHP via la capa `phpApi`.
 *
 * @param {string} endpoint - Ruta relativa del controlador PHP.
 * @param {Object} payload  - Dades clau-valor a enviar.
 * @returns {Promise<{success: boolean, message?: string}>}
 */
async function postToPhp(endpoint, payload) {
  try {
    return await phpApi.post(endpoint, payload);
  } catch (err) {
    console.error('[postToPhp] Error:', err);
    throw err;
  }
}

/*  LOGOUT                                                              */


/**
 * Fa logout de l'usuari: neteja la sessió local, crida el backend PHP
 * per invalidar la sessió del servidor i redirigeix.
 *
 * @param {string} [redirectUrl='/login'] - URL de redirecció post-logout.
 * @returns {Promise<void>}
 */
export async function logoutUser(redirectUrl = '/login') {
  clearUserSession();
  try {
    // Elimina l'estat OAuth
    sessionStorage.removeItem('parklive_oauth');
    await phpApi.post('/api/logout');
  } catch {
    // Ignorar errors de logout – la sessió client ja s'ha netejat
  }
  window.location.href = redirectUrl;
}

/**
 * Inicialitza els botons de logout a qualsevol pàgina.
 * Cerca elements amb `[data-action="logout"]` o `.btn-logout`.
 *
 * @returns {void}
 */
function initLogout() {
  const logoutBtns = document.querySelectorAll('[data-action="logout"], .btn-logout');

  logoutBtns.forEach((btn) => {
    btn.addEventListener('click', async (e) => {
      e.preventDefault();
      await logoutUser('/login');
    });
  });
}

/* ================================================================== */
/*  INICIALITZACIÓ                                                      */
/* ================================================================== */

/**
 * Punt d'entrada del controlador d'autenticació.
 * Detecta la pàgina actual per `body.className` i inicialitza
 * els gestors d'events adequats (login, registre, reset, Google OAuth, logout).
 *
 * @returns {void}
 */
export function initAuth() {
  const body = document.body.className;

  if (body.includes('page-login')) {
    initLogin();
  }

  if (body.includes('page-register')) {
    initRegister();
  }

  // Reset code pot estar en qualsevol pàgina auth
  initRequestResetCode();
  initVerifyResetCode();

  // Google Sign-In a pàgines amb botons de Google
  initGoogleSignIn();

  // Logout pot ser a qualsevol pàgina (el botó pot estar al header)
  initLogout();
}
