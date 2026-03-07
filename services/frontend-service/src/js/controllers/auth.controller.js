// /**
//  * ParkLive – auth.controller.js
//  * Controlador d'autenticació: login, registre i reset de contrasenya.
//  * Intercepta els formularis HTML i envia les dades via AJAX al servei PHP
//  * i al servei Python (reset code).
//  */

// import { phpApi, pythonApi } from '../api.js';
// import { REDIRECT_DELAY } from '../config.js';
// import {
//   showAlert,
//   hideAllAlerts,
//   serializeForm,
//   validateForm,
//   setFormLoading,
//   saveUserSession,
//   clearUserSession,
//   redirectAfterDelay,
// } from '../utils.js';

// /* ================================================================== */
// /*  LOGIN                                                               */
// /* ================================================================== */

// /**
//  * Inicialitza el formulari de login (pàgina page-login).
//  */
// function initLogin() {
//   const form = document.querySelector('.form-auth');
//   if (!form) return;

//   form.addEventListener('submit', async (e) => {
//     e.preventDefault();
//     hideAllAlerts();

//     if (!validateForm(form)) return;

//     const data = serializeForm(form);

//     // Mapatge de camps HTML → camps esperats per PHP
//     const payload = {
//       mail: data.email || '',
//       contrasenya: data.password || '',
//     };

//     setFormLoading(form, true);

//     try {
//       const result = await phpApi.post('/controllers/login.php', payload);

//       // Si PHP retorna dades d'usuari en JSON
//       if (result && (result.user || result.success)) {
//         saveUserSession(result.user || result);
//         showAlert('success', result.message || 'Sessió iniciada correctament.');
//         redirectAfterDelay('dashboard.html', REDIRECT_DELAY);
//       }
//     } catch (err) {
//       const msg = err.message || 'Error en iniciar sessió. Revisa les credencials.';
//       showAlert('error', msg);
//     } finally {
//       setFormLoading(form, false);
//     }
//   });
// }

// /* ================================================================== */
// /*  REGISTRE                                                            */
// /* ================================================================== */

// /**
//  * Inicialitza el formulari de registre (pàgina page-register).
//  */
// function initRegister() {
//   const form = document.querySelector('.form-auth');
//   if (!form) return;

//   form.addEventListener('submit', async (e) => {
//     e.preventDefault();
//     hideAllAlerts();

//     if (!validateForm(form)) return;

//     const data = serializeForm(form);

//     // Validació de contrasenyes coincidents (client-side)
//     if (data.password !== data.confirm_password) {
//       showAlert('error', 'Les contrasenyes no coincideixen.');
//       return;
//     }

//     // Mapatge de camps HTML → camps esperats per PHP
//     const payload = {
//       name: data.full_name || '',
//       cognom: '',
//       mail: data.email || '',
//       contrasenya: data.password || '',
//       contrasenya_confirmar: data.confirm_password || '',
//       telefon: data.phone || '',
//     };

//     setFormLoading(form, true);

//     try {
//       const result = await phpApi.post('/controllers/signin.php', payload);

//       if (result && (result.success || result.message)) {
//         showAlert('success', result.message || 'Registre completat correctament.');
//         redirectAfterDelay('login.html', REDIRECT_DELAY);
//       }
//     } catch (err) {
//       const msg = err.message || 'No s\'ha pogut completar el registre.';
//       showAlert('error', msg);
//     } finally {
//       setFormLoading(form, false);
//     }
//   });
// }

// /* ================================================================== */
// /*  RESET CONTRASENYA – Pas 1: Sol·licitar codi                       */
// /* ================================================================== */

// /**
//  * Inicialitza la sol·licitud de codi de reset via el servei Python.
//  * S'utilitza en qualsevol pàgina que tingui un formulari amb id
//  * "reset-request-form" o la classe "form-reset-request".
//  */
// function initRequestResetCode() {
//   const form = document.querySelector('.form-reset-request, #reset-request-form');
//   if (!form) return;

//   form.addEventListener('submit', async (e) => {
//     e.preventDefault();
//     hideAllAlerts();

//     if (!validateForm(form)) return;

//     const data = serializeForm(form);
//     const email = (data.email || '').trim();

//     if (!email) {
//       showAlert('error', 'El correu electrònic és obligatori.');
//       return;
//     }

//     setFormLoading(form, true);

//     try {
//       const result = await pythonApi.post('/api/auth/send-reset-code', { email });

//       // Guardar dades del reset per a la verificació posterior
//       sessionStorage.setItem(
//         'parklive_reset_data',
//         JSON.stringify({
//           email,
//           verification_id: result.verification_id || null,
//           expires_at: result.expires_at || null,
//         })
//       );

//       showAlert('success', result.message || 'Codi enviat al teu correu.');
//     } catch (err) {
//       const msg = err.message || 'No s\'ha pogut enviar el codi. Torna-ho a provar.';
//       showAlert('error', msg);
//     } finally {
//       setFormLoading(form, false);
//     }
//   });
// }

// /* ================================================================== */
// /*  LOGOUT                                                              */
// /* ================================================================== */

// /**
//  * Inicialitza els botons de logout a qualsevol pàgina.
//  */
// function initLogout() {
//   const logoutBtns = document.querySelectorAll('[data-action="logout"], .btn-logout');

//   logoutBtns.forEach((btn) => {
//     btn.addEventListener('click', async (e) => {
//       e.preventDefault();
//       clearUserSession();

//       try {
//         await phpApi.get('/controllers/logout.php');
//       } catch {
//         // Ignorar errors de logout – la sessió client ja s'ha netejat
//       }

//       window.location.href = 'login.html';
//     });
//   });
// }

// /* ================================================================== */
// /*  INICIALITZACIÓ                                                      */
// /* ================================================================== */

// /**
//  * Punt d'entrada del controlador. Detecta la pàgina actual
//  * i inicialitza els gestors d'events adequats.
//  */
// export function initAuth() {
//   const body = document.body.className;

//   if (body.includes('page-login')) {
//     initLogin();
//   }

//   if (body.includes('page-register')) {
//     initRegister();
//   }

//   // Reset code pot estar en qualsevol pàgina auth
//   initRequestResetCode();

//   // Logout pot ser a qualsevol pàgina (el botó pot estar al header)
//   initLogout();
// }
