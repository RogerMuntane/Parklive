/**
 * ParkLive – reserva_aparcament.controller.js
 *
 * Controlador de la pàgina de reserva d'un aparcament.
 * Llegeix el paràmetre `id` de la URL, crida a la Python API per obtenir dades,
 * carrega les targetes de Stripe guardades, fa el càlcul de costos,
 * i envia la reserva finalitzada.
 */

import { pythonApi } from '../api.js';
import { getQueryParam, getUserId, showAlert, showBootstrapAlert, setFormLoading, formatCurrency } from '../utils.js';
import { fetchPaymentMethods } from './stripe/stripe.service.js';
import { FINANCIAL_CONSTANTS } from '../config.js';
import { crearReserva } from './reserves.controller.js';

let aparcamentData = null;

function esc(str) {
  if (!str) return '';
  const div = document.createElement('div');
  div.textContent = str;
  return div.innerHTML;
}


/** Retorna la data en format YYYY-MM-DD en hora local */
function getLocalDateString(date) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

function fill(key, value) {
  document.querySelectorAll(`[data-reserva="${key}"]`).forEach((el) => {
    if (el.tagName === 'INPUT' || el.tagName === 'TEXTAREA') {
      el.value = value;
    } else {
      el.innerHTML = value;
    }
  });
}

function showSkeleton() {
  document.querySelector('[data-reserva-state="loading"]')?.style.setProperty('display', '', 'important');
  document.querySelector('[data-reserva-state="content"]')?.style.setProperty('display', 'none', 'important');
}

function showContent() {
  document.querySelector('[data-reserva-state="loading"]')?.style.setProperty('display', 'none', 'important');
  document.querySelector('[data-reserva-state="content"]')?.style.setProperty('display', '', 'important');
}

function calculateCost() {
  if (!aparcamentData) return;

  const inDateEl = document.getElementById('entrada-data');
  const inTimeEl = document.getElementById('entrada-hora');
  const outDateEl = document.getElementById('sortida-data');
  const outTimeEl = document.getElementById('sortida-hora');

  if (!inDateEl || !inTimeEl || !outDateEl || !outTimeEl) return;

  const inDateStr = inDateEl.value;
  const inTimeStr = inTimeEl.value;
  const outDateStr = outDateEl.value;
  const outTimeStr = outTimeEl.value;

  if (!inDateStr || !inTimeStr || !outDateStr || !outTimeStr) return;

  const inDateTime = new Date(`${inDateStr}T${inTimeStr}`);
  const outDateTime = new Date(`${outDateStr}T${outTimeStr}`);

  let diffHours = (outDateTime - inDateTime) / (1000 * 60 * 60);

  if (diffHours <= 0) {
    diffHours = 0;
    fill('durada', '0 hores');
    fill('subtotal', '0,00 €');
    fill('iva', '0,00 €');
    fill('total', '0,00 €');
    return;
  }

  const hoursLabel = diffHours === 1 ? '1 hora' : `${Math.ceil(diffHours)} hores`;
  fill('durada', hoursLabel);

  const tarifaHora = parseFloat(aparcamentData.tarifa_hora) || 0;
  const subtotal = diffHours * tarifaHora;
  
  const ivaPercentage = FINANCIAL_CONSTANTS.IVA_PERCENTAGE;
  const subtotalSenseIva = subtotal / (1 + ivaPercentage);
  const ivaCalculat = subtotal - subtotalSenseIva;

  fill('subtotal', formatCurrency(subtotalSenseIva));
  fill('iva', formatCurrency(ivaCalculat));
  
  // Descompte premium
  const isPremium = sessionStorage.getItem('parklive_user_data') 
    ? JSON.parse(sessionStorage.getItem('parklive_user_data')).tipus_usuari === 'premium'
    : false;
    
  let descompte = 0;
  if(isPremium) {
     descompte = subtotal * FINANCIAL_CONSTANTS.PREMIUM_DISCOUNT;
     fill('descompte', `— ${formatCurrency(descompte)}`);
  } else {
     fill('descompte', `— 0,00 €`);
  }

  const total = subtotal - descompte;
  fill('total', formatCurrency(total));
  
  // Guardem el preu total al data per utilitzar-lo en la reserva
  document.getElementById('form-reserva').dataset.total = total.toFixed(2);
}

function updateEndDateTime(hoursToAdd) {
  const inDateEl = document.getElementById('entrada-data');
  const inTimeEl = document.getElementById('entrada-hora');
  const outDateEl = document.getElementById('sortida-data');
  const outTimeEl = document.getElementById('sortida-hora');

  if (!inDateEl.value || !inTimeEl.value) return;

  const currentStartDate = new Date(`${inDateEl.value}T${inTimeEl.value}`);
  const newEndDate = new Date(currentStartDate.getTime() + hoursToAdd * 60 * 60 * 1000);

  const outD = getLocalDateString(newEndDate);
  const outT = newEndDate.getHours().toString().padStart(2, '0') + ':' + 
               newEndDate.getMinutes().toString().padStart(2, '0');

  outDateEl.value = outD;
  outTimeEl.value = outT;

  calculateCost();
  updateSummaryDates();
}

function updateSummaryDates() {
  const inDateEl = document.getElementById('entrada-data');
  const inTimeEl = document.getElementById('entrada-hora');
  const outDateEl = document.getElementById('sortida-data');
  const outTimeEl = document.getElementById('sortida-hora');

  if (inDateEl && inTimeEl) {
      fill('resum-entrada', `${inDateEl.value} · ${inTimeEl.value}`);
  }
  if (outDateEl && outTimeEl) {
      fill('resum-sortida', `${outDateEl.value} · ${outTimeEl.value}`);
  }
}

async function renderPaymentMethods() {
    const container = document.getElementById('payment-methods-container');
    if (!container) return;

    container.innerHTML = '<div class="text-center text-muted"><div class="spinner-border spinner-border-sm" role="status"></div></div>';

    const userId = getUserId();
    if (!userId) {
        container.innerHTML = `<p class="text-danger small">Si us plau, inicia sessió per veure els mètodes de pagament.</p>`;
        return;
    }

    try {
        const methods = await fetchPaymentMethods(userId);
        if(!methods || methods.length === 0) {
            container.innerHTML = `
                <div class="alert alert-warning mb-0 small">
                    No tens cap mètode de pagament guardat. 
                    <a href="/perfil.html" class="alert-link text-decoration-underline ms-1">Afegeix-ne un al teu perfil.</a>
                </div>
            `;
            return;
        }

        container.innerHTML = methods.map((m, index) => {
            const isChecked = index === 0 ? 'checked' : '';
            const isActive = index === 0 ? 'active' : '';
            const brand = (m.brand || 'Card').toUpperCase();
            const brandShort = brand === 'MASTERCARD' ? 'MC' : brand.substring(0,2);
            const brandClass = brand === 'VISA' ? 'bg-primary' : 'bg-secondary';
            
            return `
                <div class="payment-method-card ${isActive} p-3 border rounded-3 position-relative mb-3 cursor-pointer">
                    <div class="form-check d-flex align-items-center gap-3 mb-0">
                        <input class="form-check-input payment-radio" type="radio" name="paymentMethod" id="card_${m.id}" value="${m.id}" ${isChecked}>
                        <label class="form-check-label d-flex align-items-center gap-3 flex-grow-1 cursor-pointer" for="card_${m.id}">
                            <div class="${brandClass} bg-opacity-25 rounded px-2 py-1 small fw-bold">${brandShort}</div>
                            <div>
                                <div class="fw-bold small">${brand} •••• ${m.last4}</div>
                                <div class="text-muted" style="font-size: 0.75rem;">Caduca ${m.exp_month}/${m.exp_year}</div>
                            </div>
                        </label>
                    </div>
                </div>
            `;
        }).join('');

        // Listeners for active style
        container.querySelectorAll('.payment-radio').forEach(radio => {
            radio.addEventListener('change', () => {
                container.querySelectorAll('.payment-method-card').forEach(card => card.classList.remove('active'));
                radio.closest('.payment-method-card').classList.add('active');
            });
        });

    } catch (error) {
        container.innerHTML = `<p class="text-danger small">No s'han pogut carregar les targetes.</p>`;
    }
}

export async function initReservaAparcament() {
  const id = getQueryParam('id');
  if (!id) {
    showAlert('error', "No s'ha especificat l'aparcament.");
    return;
  }

  showSkeleton();

  try {
    aparcamentData = await pythonApi.get(`/api/aparcaments/${encodeURIComponent(id)}`);
    
    // Set Parking data
    fill('nom', esc(aparcamentData.nom || 'Aparcament'));
    fill('adreca', esc(`${aparcamentData.adreca || ''}, ${aparcamentData.ciutat || ''}`));
    fill('tarifa', `${formatCurrency(aparcamentData.tarifa_hora)} / hora`);
    fill('places-lliures', aparcamentData.places_disponibles || 0);
    fill('capacitat', `Capacitat: ${aparcamentData.capacitat_total || 0}`);
    
    const totals = aparcamentData.capacitat_total ?? 0;
    const lliures = aparcamentData.places_disponibles ?? 0;
    const ocupats = totals > 0 ? Math.round(((totals - lliures) / totals) * 100) : 0;
    
    fill('ocupacio', `${ocupats}% ple`);
    
    const progressBar = document.getElementById('ocupacio-bar');
    if (progressBar) {
        progressBar.style.width = `${ocupats}%`;
        progressBar.style.backgroundColor = ocupats < 50 ? 'var(--bs-success)' : ocupats < 80 ? 'var(--bs-warning)' : 'var(--bs-danger)';
    }

    // Initialize Dates safely in local time
    const today = new Date();
    const todayStr = getLocalDateString(today);
    
    const outDate = new Date(today.getTime() + 2 * 60 * 60 * 1000);
    const outStr = getLocalDateString(outDate);
    
    let nowHours = today.getHours();
    nowHours = nowHours < 10 ? '0'+nowHours : nowHours;
    let nowMinutes = today.getMinutes() >= 30 ? '30' : '00';
    const timeIn = `${nowHours}:${nowMinutes}`;
    
    let outTimeObj = new Date();
    outTimeObj.setHours(today.getHours() + 2);
    let outHoursStr = outTimeObj.getHours() < 10 ? '0'+outTimeObj.getHours() : outTimeObj.getHours();
    const timeOut = `${outHoursStr}:${nowMinutes}`;

    // Initialize Flatpickr for Dates
    const fpEntrada = flatpickr("#entrada-data", {
        minDate: "today",
        dateFormat: "Y-m-d",
        defaultDate: todayStr,
        onChange: function(selectedDates, dateStr) {
            if (fpSortida) {
                fpSortida.set("minDate", dateStr);
                // Si la nova data d'entrada és posterior a la de sortida, forcem la de sortida
                if (fpSortida.selectedDates[0] < selectedDates[0]) {
                    fpSortida.setDate(dateStr);
                }
            }
            calculateCost();
            updateSummaryDates();
        }
    });

    const fpSortida = flatpickr("#sortida-data", {
        minDate: todayStr,
        dateFormat: "Y-m-d",
        defaultDate: outStr,
        onChange: function() {
            calculateCost();
            updateSummaryDates();
        }
    });

    if(document.getElementById('entrada-hora')) document.getElementById('entrada-hora').value = timeIn;
    if(document.getElementById('sortida-hora')) document.getElementById('sortida-hora').value = timeOut;

    // Default calculations
    calculateCost();
    updateSummaryDates();

    // Event listeners per hores (les dates ja van amb Flatpickr)
    ['entrada-hora', 'sortida-hora'].forEach(inputId => {
        const el = document.getElementById(inputId);
        if (el) {
            el.addEventListener('change', () => {
                calculateCost();
                updateSummaryDates();
            });
        }
    });

    document.querySelectorAll('[data-hours-add]').forEach(btn => {
        btn.addEventListener('click', (e) => {
            e.preventDefault();
            const hours = parseFloat(btn.getAttribute('data-hours-add'));
            updateEndDateTime(hours);
            // Highlight button
            document.querySelectorAll('[data-hours-add]').forEach(b => {
                b.classList.remove('btn-danger', 'text-white');
                b.classList.add('btn-outline-secondary');
            });
            btn.classList.remove('btn-outline-secondary');
            btn.classList.add('btn-danger', 'text-white');
        });
    });

    // Form Submit (Confirm Reservation)
    const formReserva = document.getElementById('form-reserva');
    if (formReserva) {
        formReserva.addEventListener('submit', async (e) => {
            e.preventDefault();
            
            const userId = getUserId();
            if(!userId) {
                showAlert('error', 'Inicia sessió per fer una reserva.');
                return;
            }

            const inDate = document.getElementById('entrada-data').value;
            const inTime = document.getElementById('entrada-hora').value;
            const outDate = document.getElementById('sortida-data').value;
            const outTime = document.getElementById('sortida-hora').value;
            const matricula = document.getElementById('vehicle-matricula').value;
            
            if(!inDate || !inTime || !outDate || !outTime || !matricula) {
                showAlert('error', 'Sisplau omple tots els camps (matrícula inclosa).');
                return;
            }

            const selectedCard = document.querySelector('.payment-radio:checked');
            if(!selectedCard) {
                showAlert('error', 'Sisplau, selecciona un mètode de pagament per continuar.');
                return;
            }

            // Validació final de seguretat: Data de sortida ha de ser posterior a entrada
            const inDateTime = new Date(`${inDate}T${inTime}`);
            const outDateTime = new Date(`${outDate}T${outTime}`);
            const ara = new Date();

            if (inDateTime < ara) {
                showAlert('error', 'La data d\'entrada no pot ser anterior a l\'actual.');
                return;
            }

            if (outDateTime <= inDateTime) {
                showAlert('error', 'La data de sortida ha de ser posterior a la d\'entrada.');
                return;
            }

            const totalAmount = document.getElementById('form-reserva').dataset.total || 0;
            const btn = document.getElementById('btn-confirm-reserva');
            const originalText = btn.innerHTML;
            
            btn.innerHTML = '<span class="spinner-border spinner-border-sm me-2" role="status" aria-hidden="true"></span> Processant pagament...';
            btn.disabled = true;

            const reservaPayload = {
                usuari_id: userId,
                aparcament_id: id,
                data_entrada: `${inDate} ${inTime}:00`,
                data_sortida: `${outDate} ${outTime}:00`,
                preu_total: parseFloat(totalAmount),
                notes: `Matrícula: ${matricula}`,
                payment_method_id: selectedCard.value
            };

            try {
                // Confirmació de reserva i càrrec a Stripe
                const res = await crearReserva(reservaPayload);
                if (res && res.reserva && res.reserva.id) {
                    showAlert('success', 'Pagament autoritzat amb èxit! Generant tiquet...');
                    setTimeout(() => {
                        window.location.href = `/tiquet_Aparcament.html?id=${res.reserva.id}`;
                    }, 1500);
                } else {
                    throw new Error("La resposta del servidor no conté la reserva.");
                }
            } catch (err) {
                showBootstrapAlert('danger', err.message || 'El pagament ha fallat o la targeta ha estat denegada.');
                btn.innerHTML = originalText;
                btn.disabled = false;
            }
        });
    }

    // Load Cards
    await renderPaymentMethods();

    showContent();

  } catch (err) {
    console.error('[ParkLive] Error carregant reserva d\'aparcament:', err);
    showAlert('error', "No s'ha pogut carregar la informació de reserva.");
  }
}
