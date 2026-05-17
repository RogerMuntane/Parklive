/**
 * ParkLive – date-sheet.module.js
 *
 * Mòdul que gestiona el mini-full (bottom sheet) de selecció de dates
 * per a la cerca de la landing page en dispositius mòbils.
 * Sincronitza els inputs de cerca principals amb els del full.
 */

/**
 * Inicialitza el mini-full de selecció de dates.
 * Vincula els events d'apertura, tancament i aplicació de dates,
 * i inicialitza Flatpickr en tots els inputs de data de la landing.
 *
 * @returns {void}
 */
export function setupDateMiniSheet() {
  const openBtn = document.getElementById('mapDateSheetBtn');
  const sheet = document.getElementById('dateMiniSheet');
  const sheetBackdrop = document.getElementById('dateSheetBackdrop');
  const closeBtn = document.getElementById('dateSheetCloseBtn');
  const applyBtn = document.getElementById('dateSheetApplyBtn');

  const entryDate = document.getElementById('entryDate');
  const entryTime = document.getElementById('entryTime');
  const exitDate = document.getElementById('exitDate');
  const exitTime = document.getElementById('exitTime');

  const sheetEntryDate = document.getElementById('dateSheetEntryDate');
  const sheetEntryTime = document.getElementById('dateSheetEntryTime');
  const sheetExitDate = document.getElementById('dateSheetExitDate');
  const sheetExitTime = document.getElementById('dateSheetExitTime');

  if (
    !openBtn ||
    !sheet ||
    !sheetBackdrop ||
    !closeBtn ||
    !applyBtn ||
    !entryDate ||
    !entryTime ||
    !exitDate ||
    !exitTime ||
    !sheetEntryDate ||
    !sheetEntryTime ||
    !sheetExitDate ||
    !sheetExitTime
  ) {
    return;
  }

  const syncToSheet = () => {
    sheetEntryDate.value = entryDate.value;
    sheetEntryTime.value = entryTime.value;
    sheetExitDate.value = exitDate.value;
    sheetExitTime.value = exitTime.value;
  };

  const syncToSearch = () => {
    entryDate.value = sheetEntryDate.value;
    entryTime.value = sheetEntryTime.value;
    exitDate.value = sheetExitDate.value;
    exitTime.value = sheetExitTime.value;
  };

  // Inicialització de Flatpickr per a tots els inputs de data
  const fpConfig = {
    minDate: "today",
    dateFormat: "Y-m-d",
    disableMobile: "true", // Força l'ús de la interfície de Flatpickr en mòbils
  };

  const fpEntry = flatpickr("#entryDate", fpConfig);
  const fpSheetEntry = flatpickr("#dateSheetEntryDate", fpConfig);
  const fpExit = flatpickr("#exitDate", fpConfig);
  const fpSheetExit = flatpickr("#dateSheetExitDate", fpConfig);

  const openSheet = () => {
    syncToSheet();
    sheet.classList.add('is-visible');
    sheetBackdrop.classList.add('is-visible');
    sheet.setAttribute('aria-hidden', 'false');
    sheetBackdrop.setAttribute('aria-hidden', 'false');
    openBtn.setAttribute('aria-expanded', 'true');
  };

  const closeSheet = () => {
    sheet.classList.remove('is-visible');
    sheetBackdrop.classList.remove('is-visible');
    sheet.setAttribute('aria-hidden', 'true');
    sheetBackdrop.setAttribute('aria-hidden', 'true');
    openBtn.setAttribute('aria-expanded', 'false');
  };

  openBtn.addEventListener('click', openSheet);
  closeBtn.addEventListener('click', closeSheet);
  sheetBackdrop.addEventListener('click', closeSheet);

  applyBtn.addEventListener('click', () => {
    syncToSearch();
    closeSheet();

    // Trigger search automatically
    const mapSearchBar = document.getElementById('mapSearchBar');
    if (mapSearchBar) {
      mapSearchBar.dispatchEvent(new Event('submit', { bubbles: true, cancelable: true }));
    }
  });

  document.addEventListener('keydown', (event) => {
    if (event.key === 'Escape' && sheet.classList.contains('is-visible')) {
      closeSheet();
    }
  });
}
