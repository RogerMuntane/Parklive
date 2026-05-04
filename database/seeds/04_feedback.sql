-- 1. VALORACIONS
INSERT INTO valoracions (
        usuari_id,
        aparcament_id,
        puntuacio,
        comentari,
        aspectes_valorats,
        verificada,
        util_count
    )
VALUES (5, 1, 5, 'Excel·lent aparcament al centre de Barcelona. Molt net i ben senyalitzat. Les places són amples i té càrrega elèctrica.', '{"neteja": 5, "seguretat": 5, "facilitat_acces": 4, "relacio_qualitat_preu": 4}', TRUE, 12),
    (6, 1, 4, 'Molt bona ubicació però una mica car. El personal és amable i servicial.', '{"neteja": 4, "seguretat": 5, "facilitat_acces": 5, "relacio_qualitat_preu": 3}', TRUE, 8),
    (7, 1, 5, 'Fantàstic, ho recomano molt. Hi tornaria a anar segur, les places són d''una mida perfecta.', '{"neteja": 5, "seguretat": 5, "facilitat_acces": 5, "relacio_qualitat_preu": 4}', TRUE, 2),
    (8, 1, 3, 'L''aparcament està bé però a la tarda costa sortir, hi ha força embús a la sortida.', '{"neteja": 4, "seguretat": 4, "facilitat_acces": 2, "relacio_qualitat_preu": 3}', TRUE, 1),
    (9, 1, 4, 'Bona experiència en general. Útil per anar al centre ràpidament.', '{"neteja": 4, "seguretat": 4, "facilitat_acces": 4, "relacio_qualitat_preu": 4}', TRUE, 0),
    (7, 2, 3, 'Correcte per aparcar unes hores. Entrada una mica estreta si portes un SUV.', '{"neteja": 3, "seguretat": 4, "facilitat_acces": 2, "relacio_qualitat_preu": 3}', TRUE, 2),
    (8, 2, 4, 'Bona relació qualitat-preu i fàcil d’arribar. Senyalització interior milloraria.', '{"neteja": 4, "seguretat": 4, "facilitat_acces": 4, "relacio_qualitat_preu": 4}', FALSE, 0),
    (9, 3, 5, 'Molt segur, càmeres i bona il·luminació. Reserva i entrada molt ràpides.', '{"neteja": 5, "seguretat": 5, "facilitat_acces": 5, "relacio_qualitat_preu": 4}', TRUE, 6),
    (10, 3, 2, 'Vaig trobar-me la rampa saturada i vaig perdre temps. Preu elevat pel servei ofert.', '{"neteja": 3, "seguretat": 3, "facilitat_acces": 2, "relacio_qualitat_preu": 2}', TRUE, 1),
    (11, 4, 4, 'Molt pràctic per visitar la Sagrada Família. Recomano reservar amb antelació.', '{"neteja": 4, "seguretat": 4, "facilitat_acces": 4, "relacio_qualitat_preu": 4}', TRUE, 3),
    (12, 4, 5, 'Excel·lent, molt a prop del temple i fàcil de trobar.', '{"neteja": 5, "seguretat": 5, "facilitat_acces": 5, "relacio_qualitat_preu": 4}', TRUE, 1),
    (13, 5, 3, 'A l''aire lliure, una mica polsós però complia la seva funció per unes hores.', '{"neteja": 2, "seguretat": 3, "facilitat_acces": 4, "relacio_qualitat_preu": 4}', TRUE, 0),
    (14, 6, 5, 'Excel·lent ubicació al costat del Port Olímpic. Molt recomanable per anar als restaurants de la zona.', '{"neteja": 5, "seguretat": 5, "facilitat_acces": 5, "relacio_qualitat_preu": 4}', TRUE, 5),
    (15, 6, 4, 'Bona experiència, places àmplies i segur. Potser el preu una mica elevat el cap de setmana.', '{"neteja": 4, "seguretat": 5, "facilitat_acces": 4, "relacio_qualitat_preu": 3}', TRUE, 2),
    (16, 7, 2, 'Molt difícil de maniobrar, zona molt congestionada.', '{"neteja": 3, "seguretat": 3, "facilitat_acces": 1, "relacio_qualitat_preu": 2}', TRUE, 1),
    (14, 5, 3, 'Aparcament correcte però cal millorar la sortida en hores punta.', '{"neteja": 3, "seguretat": 4, "facilitat_acces": 3, "relacio_qualitat_preu": 3}', TRUE, 1),
    (16, 2, 4, 'Molt cèntric, ideal si trobes lloc, però sol estar ple.', '{"neteja": 4, "seguretat": 4, "facilitat_acces": 3, "relacio_qualitat_preu": 4}', TRUE, 3),
    (17, 3, 3, 'Bé de preu per ser Mataró centre, però estava ple quan vaig arribar.', '{"neteja": 3, "seguretat": 4, "facilitat_acces": 3, "relacio_qualitat_preu": 4}', TRUE, 1);

-- 2. RESPOSTES A VALORACIONS
INSERT INTO respostes_valoracions (valoracio_id, usuari_id, text)
VALUES (1, 3, 'Moltes gràcies per la teva valoració! Ens alegra saber que l''experiència ha estat excel·lent.'),
    (2, 3, 'Agraïm els teus comentaris. Treballem per mantenir el millor equilibri qualitat-preu de la zona.'),
    (6, 3, 'Sentim les molèsties ocasionades. Estem millorant el sistema de gestió de flux en hores punta.'),
    (9, 3, 'Ho lamentem molt. Hem revisat el sistema de lectura i ja està operatiu. Disculpa les molèsties.');

-- 3. CONTRIBUCIONS D'USUARIS
INSERT INTO contribucions (
        usuari_id,
        estat_reportat,
        dades,
        punts_guanyats,
        latitud,
        longitud
    )
VALUES (5, 'ocupat', '{"places_lliures_aproximades": 45, "comentari": "Planta -2 gairebé plena"}', 10, 41.3851, 2.1734),
    (6, 'ocupat', '{"url": "/uploads/contribucions/user6_parking2.jpg", "descripcio": "Foto actualitzada de l''entrada"}', 15, 41.3879, 2.1699),
    (7, 'ocupat', '{"camp": "horari_tancament", "valor_nou": "23:00", "comentari": "Tanquen a les 23h, no 24h"}', 0, 41.3917, 2.1649),
    (8, 'lliure', '{"places_lliures_aproximades": 30}', 10, 41.3888, 2.1590),
    (9, 'ocupat', '{"camp": "altura_maxima", "valor_actual": "2.00", "valor_correcte": "2.10", "comentari": "He mesurat l''altura amb el meu vehicle"}', 20, 41.3797, 2.1769),
    (10, 'ocupat', '{"comentari": "Completament ple a les 14h"}', 10, 41.3851, 2.1734),
    (11, 'ocupat', '{"url": "/uploads/contribucions/user11_parking3_seguretat.jpg", "descripcio": "Nova càmera de seguretat instal·lada"}', 15, 41.3917, 2.1649);
