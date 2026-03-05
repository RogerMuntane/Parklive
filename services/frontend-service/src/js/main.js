/**
 * ParkLive – main.js
 * Carga dinámica de componentes reutilizables (header, footer, sidebar…)
 * declarados con <div class="template-slot" data-template="ruta.html">
 */

document.addEventListener('DOMContentLoaded', () => {
  loadTemplates();
});

/**
 * Busca todos los elementos con clase "template-slot" y atributo
 * data-template, hace fetch del HTML y lo inyecta en el DOM.
 */
async function loadTemplates() {
  const slots = document.querySelectorAll('.template-slot[data-template]');

  const fetches = Array.from(slots).map(async (slot) => {
    const url = slot.getAttribute('data-template');

    try {
      const response = await fetch(url);

      if (!response.ok) {
        console.error(`[ParkLive] Error cargando plantilla "${url}": ${response.status}`);
        return;
      }

      const html = await response.text();
      slot.innerHTML = html;
    } catch (err) {
      console.error(`[ParkLive] No se pudo cargar la plantilla "${url}":`, err);
    }
  });

  await Promise.all(fetches);
  initThemeToggle();
}

function initThemeToggle() {
  const darkButton = document.querySelector('[data-theme-toggle="dark"]');
  const lightButton = document.querySelector('[data-theme-toggle="light"]');

  if (!darkButton || !lightButton) {
    return;
  }

  const getPreferredTheme = () => {
    const storedTheme = localStorage.getItem('theme');
    if (storedTheme === 'light' || storedTheme === 'dark') {
      return storedTheme;
    }

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
