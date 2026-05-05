/**
 * ParkLive – tiquet.controller.js
 *
 * Controlador de la pàgina del Tiquet de Reserva.
 * Llegeix el paràmetre `id` de la URL, descarrega les dades de la reserva de forma
 * segura emprant el controller de reserves i les pinta a l'HTML del tiquet definitiu.
 * Un cop el QR està carregat del tot, genera el PDF i el sincronitza amb el backend.
 */

import { obtenirDetallReserva } from './reserves.controller.js';
import { pythonApi } from '../api.js';
import { getQueryParam, showAlert } from '../utils.js';

function fillTiquetData(key, value) {
  document.querySelectorAll(`[data-tiquet="${key}"]`).forEach((el) => {
    el.innerHTML = value !== null && value !== undefined ? value : '—';
  });
}

function formatDateToShort(dateString) {
  if (!dateString) return '--/--/----';
  const d = new Date(dateString);
  const day   = d.getDate().toString().padStart(2, '0');
  const month = (d.getMonth() + 1).toString().padStart(2, '0');
  const year  = d.getFullYear();
  return `${day}/${month}/${year}`;
}

function formatTimeToShort(dateString) {
  if (!dateString) return '--:--';
  const d     = new Date(dateString);
  const hours = d.getHours().toString().padStart(2, '0');
  const mins  = d.getMinutes().toString().padStart(2, '0');
  return `${hours}:${mins}`;
}

/**
 * Retorna una Promise que es resol quan la imatge QR estigui completament carregada,
 * o es rebutja si hi ha un error de xarxa / timeout de 10 s.
 */
function waitForQR(imgEl) {
  return new Promise((resolve, reject) => {
    if (imgEl.complete && imgEl.naturalWidth > 0) {
      resolve();
      return;
    }
    const timeout = setTimeout(() => {
      reject(new Error('Timeout esperant el QR'));
    }, 10_000);

    imgEl.addEventListener('load', () => { clearTimeout(timeout); resolve(); }, { once: true });
    imgEl.addEventListener('error', () => { clearTimeout(timeout); reject(new Error('Error carregant el QR')); }, { once: true });
  });
}

export async function initTiquetAparcament() {
  const reservaId = getQueryParam('id');
  if (!reservaId) {
    showAlert('error', "No s'ha especificat cap reserva.");
    return;
  }

  const stateLoading = document.querySelector('[data-tiquet-state="loading"]');
  const stateContent = document.querySelector('[data-tiquet-state="content"]');

  if (stateLoading) stateLoading.style.setProperty('display', '', 'important');
  if (stateContent) stateContent.style.setProperty('display', 'none', 'important');

  // SOLUCIÓ VIA RÀPIDA: Si tenim el p_id a la URL, actualitzem el botó JA mateix
  const btnValoracio = document.getElementById('btn-valoracio-link');
  const fastParkingId = getQueryParam('p_id');
  if (btnValoracio && fastParkingId) {
    btnValoracio.href = `/nova_Valoracio.html?id=${fastParkingId}`;
    console.log(`[ParkLive] Enllaç de valoració fixat via URL: ${fastParkingId}`);
  }

  try {
    const reservaData = await obtenirDetallReserva(reservaId);

    // Omplir dades del tiquet
    fillTiquetData('nom',          reservaData.aparcament?.nom);
    fillTiquetData('adreca',       `${reservaData.aparcament?.adreca}, ${reservaData.aparcament?.ciutat}`);
    fillTiquetData('entrada-data', formatDateToShort(reservaData.data_entrada));
    fillTiquetData('entrada-hora', formatTimeToShort(reservaData.data_entrada));
    fillTiquetData('sortida-data', formatDateToShort(reservaData.data_sortida));
    fillTiquetData('sortida-hora', formatTimeToShort(reservaData.data_sortida));
    fillTiquetData('codi',         `#${reservaData.codi_reserva}`);
    fillTiquetData('total',        `${Number(reservaData.preu_total).toFixed(2).replace('.', ',')} €`);

    // Extreure matrícula de les notes
    let matricula = 'NO DISPONIBLE';
    if (reservaData.notes && reservaData.notes.includes('Matrícula:')) {
      matricula = reservaData.notes.split('Matrícula:')[1].trim();
    }
    fillTiquetData('matricula', matricula);
    
    // Actualitzar enllaç de valoració
    const btnValoracio = document.getElementById('btn-valoracio-link');
    const aparcamentId = reservaData.aparcament?.id || reservaData.aparcament_id || reservaData.aparcament?.aparcament_id;
    
    if (btnValoracio && aparcamentId) {
      btnValoracio.href = `/nova_Valoracio.html?id=${aparcamentId}`;
      console.log(`[ParkLive] Enllaç de valoració actualitzat per a l'aparcament: ${aparcamentId}`);
    } else if (btnValoracio) {
      console.warn('[ParkLive] No s\'ha trobat l\'ID de l\'aparcament a les dades de la reserva:', reservaData);
      // Opcionalment podem amagar el botó si no tenim ID
      btnValoracio.classList.add('d-none');
    }

    // Generar i injectar el QR
    const qrImg     = document.getElementById('tiquet-qr');
    const qrSpinner = document.getElementById('tiquet-qr-spinner');

    if (qrImg && reservaData.codi_reserva) {
      const qrSize = 250;
      const qrData = encodeURIComponent(reservaData.codi_reserva);
      qrImg.src    = `https://api.qrserver.com/v1/create-qr-code/?size=${qrSize}x${qrSize}&data=${qrData}`;

      qrImg.onload  = () => { qrImg.classList.remove('d-none'); if (qrSpinner) qrSpinner.classList.add('d-none'); };
      qrImg.onerror = () => { if (qrSpinner) qrSpinner.innerHTML = '<i class="bi bi-exclamation-triangle text-danger"></i>'; };
    }

    // Mostrar el tiquet
    if (stateLoading) stateLoading.style.setProperty('display', 'none', 'important');
    if (stateContent) stateContent.style.setProperty('display', '',      'important');

    // Esperar que el QR estigui del tot carregat ABANS de generar el PDF
    try {
      if (qrImg) await waitForQR(qrImg);
    } catch (qrErr) {
      console.warn('[ParkLive] El QR no s\'ha carregat a temps, el PDF es generarà sense ell.', qrErr);
    }

    // await generarIEnviarPDF(reservaId, reservaData.codi_reserva);
    
    // Configurar el botó de descàrrega cap al backend
    const btnDownload = document.getElementById('btn-download-pdf');
    if (btnDownload) {
      // Obtenim la URL de l'API de Python des de la configuració o api.js
      const apiUrl = pythonApi.baseURL; 
      btnDownload.href = `${apiUrl}/api/reserves/${reservaId}/pdf`;
      btnDownload.setAttribute('target', '_blank');
    }

  } catch (error) {
    console.error('[ParkLive] Error carregant tiquet:', error);
    showAlert('error', "Error obtenint el tiquet. Torna-ho a provar des del teu perfil.");
  }
}

/**
 * Genera un PDF del tiquet usant html2pdf i el puja al servidor per sincronitzar la BD.
 *
 * Estratègia d'aïllament:
 *  - Es clona el `.ticket-card` en un contenidor temporal fora del viewport.
 *  - S'apliquen estils inline blancs per garantir que el tema (dark/light) no afecti el render.
 *  - S'eliminen elements no pertinents (botons, no-print, etc.) del clon.
 *  - Un cop generat el PDF, el contenidor temporal s'elimina del DOM.
 */
async function generarIEnviarPDF(reservaId, codiReserva) {
  const original = document.querySelector('.ticket-card');
  if (!original) {
    console.warn('[ParkLive] No s\'ha trobat .ticket-card per generar el PDF.');
    return;
  }

  // --- Crear clon aïllat del tiquet ---
  const wrapper = document.createElement('div');
  wrapper.style.cssText = [
    'position:absolute',
    'left:-9999px',
    'top:0',
    'width:420px',
    'background:#ffffff',
    'font-family:Outfit, sans-serif',
    'color:#1a1a2e',
  ].join(';');

  const clone = original.cloneNode(true);

  // Forçar fons blanc i colors neutres al clon per evitar interferències del tema
  clone.style.cssText = [
    'background:#ffffff !important',
    'border:1px solid #dee2e6',
    'border-radius:12px',
    'overflow:hidden',
    'color:#1a1a2e',
    'box-shadow:none',
  ].join(';');

  // Eliminar elements que NO han d'aparèixer al PDF (botons, no-print…)
  clone.querySelectorAll('.no-print, button, a.btn').forEach(el => el.remove());

  // Garantir que la imatge del QR sigui visible al clon (copiar el src actual)
  const originalQr = document.getElementById('tiquet-qr');
  const clonedQr   = clone.querySelector('#tiquet-qr');
  if (originalQr && clonedQr) {
    clonedQr.src = originalQr.src;
    clonedQr.classList.remove('d-none');
    clonedQr.style.display = 'block';
    clonedQr.style.maxWidth = '130px';
    clonedQr.style.maxHeight = '130px';
    // Eliminar el spinner del clon – ja no és necessari
    const spinner = clone.querySelector('#tiquet-qr-spinner');
    if (spinner) spinner.remove();
  }

  // Aplicar fons blancs als sub-elements del tiquet al clon
  const bgWhiteSelectors = ['.ticket-body', '.ticket-footer', '.bg-body', '.bg-body-tertiary'];
  bgWhiteSelectors.forEach(sel => {
    clone.querySelectorAll(sel).forEach(el => {
      el.style.backgroundColor = '#ffffff';
      el.style.color = '#1a1a2e';
    });
  });

  // Capçalera: fons blau corporatiu fix (evitar que var(--bs-primary) quedi transparent)
  const header = clone.querySelector('.ticket-header');
  if (header) {
    header.style.backgroundColor = '#4361ee';
    header.style.color = '#ffffff';
  }

  // Footer del tiquet: gris clar
  const footer = clone.querySelector('.ticket-footer');
  if (footer) {
    footer.style.backgroundColor = '#f8f9fa';
    footer.style.color = '#6c757d';
  }

  wrapper.appendChild(clone);
  document.body.appendChild(wrapper);

  const opt = {
    margin:      8,
    filename:    `tiquet_ParkLive_${codiReserva}.pdf`,
    image:       { type: 'jpeg', quality: 0.97 },
    html2canvas: {
      scale:        2,
      useCORS:      true,
      logging:      false,
      backgroundColor: '#ffffff',
      windowWidth:  440,
    },
    jsPDF: { unit: 'mm', format: 'a5', orientation: 'portrait' },
  };

  try {
    console.log('[ParkLive] Generant PDF del tiquet...');
    const pdfBlob = await html2pdf().set(opt).from(wrapper).output('blob');

    // Netejar el DOM
    document.body.removeChild(wrapper);

    // Pujar al servidor Python
    const formData = new FormData();
    formData.append('tiquet', pdfBlob, `tiquet_${codiReserva}.pdf`);

    // Intentar URL relativa primer (/api) i fallback a la variable d'entorn
    const endpoint = `/api/reserves/${reservaId}/tiquet/pujar`;
    console.log('[ParkLive] Pujant PDF a:', endpoint);

    const data = await pythonApi.postForm(endpoint, formData);
    console.log('[ParkLive] Tiquet pujat amb èxit:', data);
    return data;
  } catch (err) {
    // Netejar el DOM fins i tot si hi ha error
    if (wrapper.parentNode) document.body.removeChild(wrapper);
    console.error('[ParkLive] Error generant o enviant el PDF:', err);
  }
}
