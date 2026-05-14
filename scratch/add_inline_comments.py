import os
import re

filepath = 'services/frontend-service/src/js/controllers/landing.controller.js'
with open(filepath, 'r', encoding='utf-8') as f:
    content = f.read()

content = content.replace(
    'const mapState = initLandingMap();',
    '// 1. Inicialitzem el component central del mapa amb Leaflet (o similar)\n  // Això ens retorna l\'estat del mapa i les referències de control\n  const mapState = initLandingMap();'
)

content = content.replace(
    'const initialCategory = document.querySelector(',
    '// 2. Comprovem l\'estat inicial del filtre per veure si hem de carregar aparcaments estructurals o alertes de carrer\n  const initialCategory = document.querySelector('
)

content = content.replace(
    'const toggleFilters = createFiltersController({ map, updateOpenPopupsLayout });',
    '// 3. Configurem el controlador global de filtres de cerca avançada\n  const toggleFilters = createFiltersController({ map, updateOpenPopupsLayout });'
)

content = content.replace(
    'const { runSearch, setUserLocation, setSearchAnchor } = initLandingSearch({',
    '// 4. Inicialitzem el servei de cerques interconnectant els controls i l\'autocompletar amb el mapa\n  const { runSearch, setUserLocation, setSearchAnchor } = initLandingSearch({'
)

content = content.replace(
    'setLocateMeAction(() => {',
    '// 5. Associem el botó "Localitza\'m" per fixar les coordenades geolocalitzades del dispositiu i llançar cerca\n  setLocateMeAction(() => {'
)

with open(filepath, 'w', encoding='utf-8') as f:
    f.write(content)

print("Comentaris inline afegits a landing.controller.js")
