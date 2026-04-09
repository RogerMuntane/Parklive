/**
 * ParkLive – tiquet.controller.js
 *
 * Controlador de la pàgina del Tiquet de Reserva.
 * Llegeix el paràmetre `id` de la URL, descarrega les dades de la reserva de forma
 * segura emprant el controller de reserves i les pinta a l'HTML del tiquet definitiu.
 */

import { obtenirDetallReserva } from './reserves.controller.js';
import { getQueryParam, showAlert } from '../utils.js';

function fillTiquetData(key, value) {
  document.querySelectorAll(`[data-tiquet="${key}"]`).forEach((el) => {
    el.innerHTML = value !== null && value !== undefined ? value : '—';
  });
}

function formatDateToShort(dateString) {
  if (!dateString) return '--/--/----';
  const d = new Date(dateString);
  const day = d.getDate().toString().padStart(2, '0');
  const month = (d.getMonth() + 1).toString().padStart(2, '0');
  const year = d.getFullYear();
  return `${day}/${month}/${year}`;
}

function formatTimeToShort(dateString) {
  if (!dateString) return '--:--';
  const d = new Date(dateString);
  const hours = d.getHours().toString().padStart(2, '0');
  const mins = d.getMinutes().toString().padStart(2, '0');
  return `${hours}:${mins}`;
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

  try {
    const reservaData = await obtenirDetallReserva(reservaId);

    // Buidar dades
    fillTiquetData('nom', reservaData.aparcament?.nom);
    fillTiquetData('adreca', `${reservaData.aparcament?.adreca}, ${reservaData.aparcament?.ciutat}`);
    
    fillTiquetData('entrada-data', formatDateToShort(reservaData.data_entrada));
    fillTiquetData('entrada-hora', formatTimeToShort(reservaData.data_entrada));
    
    fillTiquetData('sortida-data', formatDateToShort(reservaData.data_sortida));
    fillTiquetData('sortida-hora', formatTimeToShort(reservaData.data_sortida));

    fillTiquetData('codi', `#${reservaData.codi_reserva}`);
    fillTiquetData('total', `${Number(reservaData.preu_total).toFixed(2).replace('.',',')} €`);

    // Extreure matrícula de les notes si existeix
    let matricula = 'NO DISPONIBLE';
    if(reservaData.notes && reservaData.notes.includes('Matrícula:')) {
        matricula = reservaData.notes.split('Matrícula:')[1].trim();
    }
    fillTiquetData('matricula', matricula);

    // Amagar loading, mostrar el tiquet
    if (stateLoading) stateLoading.style.setProperty('display', 'none', 'important');
    if (stateContent) stateContent.style.setProperty('display', '', 'important');

  } catch (error) {
    console.error('[ParkLive] Error carregant tiquet:', error);
    showAlert('error', "Error obtenint el tiquet. Torna-ho a provar des del teu perfil.");
  }
}
