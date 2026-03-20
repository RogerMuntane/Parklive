/**
 * ParkLive – auth.controller.js
 * Controlador d'autenticació: login, registre i reset de contrasenya.
 * Intercepta els formularis HTML i envia les dades via AJAX al servei PHP
 * i al servei Python (reset code).
 */

import { phpApi, pythonApi } from '../api.js';
import { REDIRECT_DELAY } from '../config.js';
import {
  showAlert,
  hideAllAlerts,
  serializeForm,
  validateForm,
  setFormLoading,
  saveUserSession,
  clearUserSession,
  redirectAfterDelay,
} from '../utils.js';

/*  GOOGLE CLIENT ID (carregat dinàmicament del backend)                */

let _googleClientId = null;

/**
 * Obté el Google Client ID des del backend Python.
 * El valor es guarda en cache per no fer més d'una petició.
 */
async function getGoogleClientId() {
  if (_googleClientId) return _googleClientId;

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
      const result = await postToPhp('/controllers/login.php', payload);

      if (result && result.success) {
        if (result.user) {
          saveUserSession(result.user);
          if (typeof window.initAuthToggle === 'function') window.initAuthToggle();
        }
        // Neteja explícita de la sessió OAuth si NO és Google
        sessionStorage.removeItem('parklive_oauth');
        
        showAlert('success', result.message || 'Sessió iniciada correctament.');
        redirectAfterDelay('index.html', REDIRECT_DELAY);
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
      const result = await postToPhp('/controllers/signin.php', payload);

      if (result && result.success) {
        showAlert('success', result.message || 'Registre completat correctament.');
        redirectAfterDelay('login.html', REDIRECT_DELAY);
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
 * @param {'step-request'|'step-verify'|'step-success'} stepId
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

      showAlert('success', result.message || 'Codi enviat al teu correu.');

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
 * crear/trobar l'usuari a la BD.
 *
 * @param {Object} tokenResponse – Resposta de requestAccessToken()
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
      saveUserSession(result.user);
      // Si és Google OAuth, crea cookie per ocultar canvi contrasenya
      if (result.user && result.user.provider === 'google') {
        sessionStorage.setItem('parklive_oauth', 'google');
        console.log('[ParkLive] OAuth guardat a sessionStorage:', sessionStorage.getItem('parklive_oauth'));
      }
      showAlert('success', result.message || 'Sessió iniciada amb Google!');
      redirectAfterDelay('index.html', REDIRECT_DELAY);
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
 * Envia un formulari al servei PHP.
 * Envia les dades com a FormData amb Accept: application/json
 * perquè PHP retorni JSON en comptes de redirects.
 *
 * @param {string}   endpoint – Ruta relativa del controlador PHP
 * @param {Object}   payload  – Dades clau-valor a enviar
 * @returns {Promise<{success: boolean, message?: string}>}
 */
async function postToPhp(endpoint, payload) {
  const { PHP_API_URL } = await import('../config.js');
  const url = `${PHP_API_URL}${endpoint}`;

  const formData = new FormData();
  for (const [key, value] of Object.entries(payload)) {
    formData.append(key, value);
  }

  const response = await fetch(url, {
    method: 'POST',
    body: formData,
    headers: {
      'Accept': 'application/json',
    },
    credentials: 'include',   // Enviar cookies de sessió PHP
  });

  console.log('[postToPhp]', endpoint, '→ status:', response.status, 'type:', response.type);

  // Si retorna JSON (controlador modernitzat amb suport AJAX)
  const contentType = response.headers.get('Content-Type') || '';
  if (contentType.includes('application/json')) {
    const data = await response.json();
    console.log('[postToPhp] JSON response:', data);
    if (!response.ok || data.success === false) {
      throw new Error(data.error || data.message || `Error ${response.status}`);
    }
    return data;
  }

  // Resposta no-JSON: loguejar per debug
  const body = await response.text();
  console.warn('[postToPhp] Resposta no-JSON:', response.status, body.substring(0, 500));

  // Fallback: PHP redirigeix (302) quan no detecta Accept JSON
  if (response.type === 'opaqueredirect' || (response.status >= 300 && response.status < 400)) {
    return { success: true };
  }

  // Si retorna 200 amb HTML (redirect seguit), considerar èxit
  if (response.ok) {
    return { success: true };
  }

  throw new Error(`Error ${response.status}`);
}

/*  LOGOUT                                                              */


/**
 * Fa logout de l'usuari: neteja sessió, crida backend i redirigeix.
 */
export async function logoutUser(redirectUrl = 'login.html') {
  clearUserSession();
  try {
    // Elimina l'estat OAuth
    sessionStorage.removeItem('parklive_oauth');
    console.log('[ParkLive] Sessió OAuth eliminada en logout:', sessionStorage.getItem('parklive_oauth'));
    await phpApi.get('/controllers/logout.php');
  } catch {
    // Ignorar errors de logout – la sessió client ja s'ha netejat
  }
  window.location.href = redirectUrl;
}

/**
 * Inicialitza els botons de logout a qualsevol pàgina.
 */
function initLogout() {
  const logoutBtns = document.querySelectorAll('[data-action="logout"], .btn-logout');

  logoutBtns.forEach((btn) => {
    btn.addEventListener('click', async (e) => {
      e.preventDefault();
      await logoutUser('login.html');
    });
  });
}

/* ================================================================== */
/*  INICIALITZACIÓ                                                      */
/* ================================================================== */

/**
 * Punt d'entrada del controlador. Detecta la pàgina actual
 * i inicialitza els gestors d'events adequats.
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
