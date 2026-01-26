
-- DADES DE PROVA PARKLIVE - SEED DATA COMPLET


USE parklive_db;

-- Desactivar comprovació de claus forànies temporalment
SET FOREIGN_KEY_CHECKS = 0;

-- Netejar taules (només per desenvolupament!)
TRUNCATE TABLE usuaris_recompenses;
TRUNCATE TABLE recompenses;
TRUNCATE TABLE contribucions;
TRUNCATE TABLE respostes_valoracions;
TRUNCATE TABLE valoracions;
TRUNCATE TABLE factures;
TRUNCATE TABLE pagaments;
TRUNCATE TABLE reserves;
TRUNCATE TABLE fotografies_aparcaments;
TRUNCATE TABLE historic_disponibilitat;
TRUNCATE TABLE aparcaments;
TRUNCATE TABLE notificacions;
TRUNCATE TABLE missatges_suport;
TRUNCATE TABLE articles_blog;
TRUNCATE TABLE faqs;
TRUNCATE TABLE sessions;
TRUNCATE TABLE subscripcions;
TRUNCATE TABLE usuaris;
TRUNCATE TABLE logs_sistema;
TRUNCATE TABLE configuracio_sistema;

-- Reactivar comprovació de claus forànies
SET FOREIGN_KEY_CHECKS = 1;


-- 1. USUARIS (20 usuaris de diferents tipus)

-- Nota: Contrasenyes són totes "Password123!" amb hash bcrypt
-- Hash generat: $2y$10$92IXUNpkjO0rOQ5byMi.Ye4oKoEa3Ro9llC/.og/at2.uheWG/igi

INSERT INTO usuaris (id, nom, cognoms, email, contrasenya_hash, telefon, tipus_usuari, estat, email_verificat, punts_gamificacio, data_registre, ultima_connexio) VALUES
-- Administradors
(1, 'Admin', 'Sistema', 'admin@parklive.cat', '$2y$10$92IXUNpkjO0rOQ5byMi.Ye4oKoEa3Ro9llC/.og/at2.uheWG/igi', '934567890', 'admin', 'actiu', TRUE, 0, '2024-01-01 10:00:00', NOW()),
(2, 'Maria', 'Administradora', 'maria.admin@parklive.cat', '$2y$10$92IXUNpkjO0rOQ5byMi.Ye4oKoEa3Ro9llC/.og/at2.uheWG/igi', '934567891', 'admin', 'actiu', TRUE, 0, '2024-01-15 10:00:00', NOW()),

-- Operadors de pàrquings
(3, 'Operador', 'Parking BCN', 'operador@parkingbcn.com', '$2y$10$92IXUNpkjO0rOQ5byMi.Ye4oKoEa3Ro9llC/.og/at2.uheWG/igi', '935678901', 'operador', 'actiu', TRUE, 0, '2024-02-01 10:00:00', NOW()),
(4, 'Carles', 'Gestió Aparcaments', 'carles@saba.es', '$2y$10$92IXUNpkjO0rOQ5byMi.Ye4oKoEa3Ro9llC/.og/at2.uheWG/igi', '935678902', 'operador', 'actiu', TRUE, 0, '2024-02-15 10:00:00', NOW()),

-- Usuaris Premium
(5, 'Joan', 'García López', 'joan.garcia@gmail.com', '$2y$10$92IXUNpkjO0rOQ5byMi.Ye4oKoEa3Ro9llC/.og/at2.uheWG/igi', '666123456', 'premium', 'actiu', TRUE, 450, '2024-06-01 10:00:00', NOW()),
(6, 'Laura', 'Martínez Sanz', 'laura.martinez@hotmail.com', '$2y$10$92IXUNpkjO0rOQ5byMi.Ye4oKoEa3Ro9llC/.og/at2.uheWG/igi', '666234567', 'premium', 'actiu', TRUE, 780, '2024-07-10 10:00:00', NOW()),
(7, 'David', 'Fernández Costa', 'david.fernandez@outlook.com', '$2y$10$92IXUNpkjO0rOQ5byMi.Ye4oKoEa3Ro9llC/.og/at2.uheWG/igi', '666345678', 'premium', 'actiu', TRUE, 1200, '2024-05-20 10:00:00', NOW()),
(8, 'Anna', 'Rodríguez Pons', 'anna.rodriguez@gmail.com', '$2y$10$92IXUNpkjO0rOQ5byMi.Ye4oKoEa3Ro9llC/.og/at2.uheWG/igi', '666456789', 'premium', 'actiu', TRUE, 320, '2024-08-15 10:00:00', NOW()),

-- Usuaris Bàsics
(9, 'Marc', 'Sánchez Vila', 'marc.sanchez@gmail.com', '$2y$10$92IXUNpkjO0rOQ5byMi.Ye4oKoEa3Ro9llC/.og/at2.uheWG/igi', '677123456', 'basic', 'actiu', TRUE, 150, '2024-09-01 10:00:00', NOW()),
(10, 'Marta', 'López Ortiz', 'marta.lopez@yahoo.es', '$2y$10$92IXUNpkjO0rOQ5byMi.Ye4oKoEa3Ro9llC/.og/at2.uheWG/igi', '677234567', 'basic', 'actiu', TRUE, 90, '2024-09-15 10:00:00', NOW()),
(11, 'Pere', 'González Ruiz', 'pere.gonzalez@gmail.com', '$2y$10$92IXUNpkjO0rOQ5byMi.Ye4oKoEa3Ro9llC/.og/at2.uheWG/igi', '677345678', 'basic', 'actiu', TRUE, 210, '2024-10-01 10:00:00', NOW()),
(12, 'Sara', 'Pérez Molina', 'sara.perez@hotmail.com', '$2y$10$92IXUNpkjO0rOQ5byMi.Ye4oKoEa3Ro9llC/.og/at2.uheWG/igi', '677456789', 'basic', 'actiu', TRUE, 60, '2024-10-20 10:00:00', NOW()),
(13, 'Jordi', 'Martí Soler', 'jordi.marti@gmail.com', '$2y$10$92IXUNpkjO0rOQ5byMi.Ye4oKoEa3Ro9llC/.og/at2.uheWG/igi', '688123456', 'basic', 'actiu', TRUE, 340, '2024-08-05 10:00:00', NOW()),
(14, 'Cristina', 'Romero Vidal', 'cristina.romero@gmail.com', '$2y$10$92IXUNpkjO0rOQ5byMi.Ye4oKoEa3Ro9llC/.og/at2.uheWG/igi', '688234567', 'basic', 'actiu', TRUE, 180, '2024-11-01 10:00:00', NOW()),
(15, 'Albert', 'Torres Navarro', 'albert.torres@outlook.com', '$2y$10$92IXUNpkjO0rOQ5byMi.Ye4oKoEa3Ro9llC/.og/at2.uheWG/igi', '688345678', 'basic', 'actiu', TRUE, 420, '2024-07-25 10:00:00', NOW()),
(16, 'Núria', 'Giménez Ramos', 'nuria.gimenez@gmail.com', '$2y$10$92IXUNpkjO0rOQ5byMi.Ye4oKoEa3Ro9llC/.og/at2.uheWG/igi', '688456789', 'basic', 'actiu', FALSE, 30, '2025-01-10 10:00:00', NOW()),
(17, 'Pau', 'Vázquez Ibáñez', 'pau.vazquez@gmail.com', '$2y$10$92IXUNpkjO0rOQ5byMi.Ye4oKoEa3Ro9llC/.og/at2.uheWG/igi', '699123456', 'basic', 'actiu', TRUE, 110, '2024-12-01 10:00:00', NOW()),
(18, 'Elena', 'Jiménez Castro', 'elena.jimenez@yahoo.es', '$2y$10$92IXUNpkjO0rOQ5byMi.Ye4oKoEa3Ro9llC/.og/at2.uheWG/igi', '699234567', 'basic', 'actiu', TRUE, 270, '2024-09-20 10:00:00', NOW()),
(19, 'Raül', 'Moreno Serrano', 'raul.moreno@gmail.com', '$2y$10$92IXUNpkjO0rOQ5byMi.Ye4oKoEa3Ro9llC/.og/at2.uheWG/igi', '699345678', 'basic', 'inactiu', TRUE, 50, '2024-06-15 10:00:00', '2024-12-01 10:00:00'),
(20, 'Montse', 'Rubio Gil', 'montse.rubio@hotmail.com', '$2y$10$92IXUNpkjO0rOQ5byMi.Ye4oKoEa3Ro9llC/.og/at2.uheWG/igi', '699456789', 'basic', 'actiu', TRUE, 390, '2024-08-28 10:00:00', NOW());


-- 2. SUBSCRIPCIONS (pels usuaris premium)


INSERT INTO subscripcions (usuari_id, tipus, estat, data_inici, data_final, preu, metode_pagament, auto_renovacio) VALUES
(5, 'mensual', 'activa', '2025-01-01', '2025-02-01', 9.99, 'targeta', TRUE),
(6, 'trimestral', 'activa', '2024-11-01', '2025-02-01', 25.99, 'paypal', TRUE),
(7, 'anual', 'activa', '2024-05-20', '2025-05-20', 89.99, 'targeta', TRUE),
(8, 'mensual', 'activa', '2024-12-15', '2025-01-15', 9.99, 'targeta', FALSE);


-- 3. APARCAMENTS (15 aparcaments a Barcelona)


INSERT INTO aparcaments (id, nom, tipus, adreca, ciutat, codi_postal, latitud, longitud, capacitat_total, places_disponibles, tarifa_hora, tarifa_dia, horari_obertura, horari_tancament, obert_24h, caracteristiques, accessibilitat, carrega_electrica, videovigilancia, altura_maxima, estat, operador_id, valoracio_mitjana, total_valoracions, verificat) VALUES
-- Centre de Barcelona
(1, 'Parking Plaça Catalunya', 'cobert', 'Plaça Catalunya, 9', 'Barcelona', '08002', 41.387428, 2.169919, 500, 125, 3.50, 25.00, NULL, NULL, TRUE, '{"wifi": true, "lavabo": true, "assist_24h": true}', TRUE, TRUE, TRUE, 2.10, 'actiu', 3, 4.50, 0, TRUE),
(2, 'Aparcament Rambla Catalunya', 'subterrani', 'Rambla de Catalunya, 15', 'Barcelona', '08007', 41.390205, 2.163774, 300, 89, 3.80, 28.00, NULL, NULL, TRUE, '{"wifi": true, "assist_24h": true}', TRUE, TRUE, TRUE, 2.00, 'actiu', 3, 4.20, 0, TRUE),
(3, 'Parking Passeig de Gràcia', 'cobert', 'Passeig de Gràcia, 63', 'Barcelona', '08008', 41.394699, 2.163162, 250, 67, 4.50, 32.00, NULL, NULL, TRUE, '{"wifi": true, "lavabo": true, "premium": true}', TRUE, TRUE, TRUE, 2.10, 'actiu', 3, 4.70, 0, TRUE),

-- Sagrada Família
(4, 'Aparcament Sagrada Família', 'subterrani', 'Carrer de Mallorca, 401', 'Barcelona', '08013', 41.403569, 2.174355, 350, 102, 3.00, 22.00, '07:00:00', '23:00:00', FALSE, '{"wifi": false, "assist_horary": true}', TRUE, FALSE, TRUE, 2.10, 'actiu', 4, 4.30, 0, TRUE),
(5, 'Parking Temple Expiatori', 'aire_lliure', 'Carrer de Sardenya, 311', 'Barcelona', '08025', 41.404824, 2.175503, 150, 45, 2.50, 18.00, '08:00:00', '20:00:00', FALSE, '{"descobert": true}', FALSE, FALSE, FALSE, NULL, 'actiu', 4, 3.80, 0, TRUE),

-- Port Olímpic i Platja
(6, 'Parking Port Olímpic', 'aire_lliure', 'Moll de Gregal, 15', 'Barcelona', '08005', 41.387134, 2.198091, 400, 156, 2.50, 18.00, NULL, NULL, TRUE, '{"prop_platja": true, "wifi": false}', TRUE, TRUE, TRUE, 2.00, 'actiu', 3, 4.10, 0, TRUE),
(7, 'Aparcament Barceloneta', 'carrer', 'Passeig de Joan de Borbó, 88', 'Barcelona', '08003', 41.381542, 2.189750, 200, 78, 2.00, 15.00, '09:00:00', '21:00:00', FALSE, '{"zona_blava": true, "prop_platja": true}', FALSE, FALSE, FALSE, NULL, 'actiu', NULL, 3.50, 0, TRUE),

-- Montjuïc i Fira
(8, 'Parking Fira de Barcelona', 'cobert', 'Avinguda de la Reina Maria Cristina, s/n', 'Barcelona', '08004', 41.371985, 2.148568, 800, 423, 2.80, 20.00, NULL, NULL, TRUE, '{"wifi": true, "esdeveniments": true}', TRUE, TRUE, TRUE, 2.50, 'actiu', 4, 4.40, 0, TRUE),
(9, 'Aparcament Plaça Espanya', 'subterrani', 'Plaça Espanya, 1', 'Barcelona', '08014', 41.375350, 2.149050, 450, 189, 3.20, 24.00, NULL, NULL, TRUE, '{"wifi": true, "lavabo": true}', TRUE, TRUE, TRUE, 2.00, 'actiu', 3, 4.00, 0, TRUE),

-- Eixample
(10, 'Parking Hospital Clínic', 'cobert', 'Carrer Villarroel, 170', 'Barcelona', '08036', 41.390394, 2.152899, 300, 91, 3.50, 26.00, NULL, NULL, TRUE, '{"hospital": true, "wifi": true}', TRUE, FALSE, TRUE, 2.00, 'actiu', 4, 4.60, 0, TRUE),
(11, 'Aparcament Diagonal', 'subterrani', 'Avinguda Diagonal, 442', 'Barcelona', '08037', 41.396350, 2.153550, 250, 67, 4.00, 30.00, NULL, NULL, TRUE, '{"wifi": true, "premium": true}', TRUE, TRUE, TRUE, 2.10, 'actiu', 3, 4.50, 0, TRUE),

-- Gràcia
(12, 'Parking Vila de Gràcia', 'cobert', 'Carrer de la Mare de Déu dels Desemparats, 5', 'Barcelona', '08012', 41.401750, 2.156850, 200, 56, 3.00, 22.00, '07:00:00', '22:00:00', FALSE, '{"wifi": false, "barri": true}', TRUE, FALSE, TRUE, 2.00, 'actiu', 4, 3.90, 0, TRUE),

-- Sants
(13, 'Parking Sants Estació', 'cobert', 'Plaça dels Països Catalans, s/n', 'Barcelona', '08014', 41.379020, 2.140310, 600, 234, 2.80, 20.00, NULL, NULL, TRUE, '{"wifi": true, "estacio_tren": true, "lavabo": true}', TRUE, TRUE, TRUE, 2.20, 'actiu', 3, 4.30, 0, TRUE),

-- Les Corts
(14, 'Parking Camp Nou', 'aire_lliure', 'Carrer d Aristides Maillol, s/n', 'Barcelona', '08028', 41.380896, 2.122820, 1000, 567, 5.00, 40.00, '08:00:00', '23:00:00', FALSE, '{"esdeveniments_esportius": true, "gran_capacitat": true}', TRUE, FALSE, FALSE, NULL, 'actiu', 4, 3.60, 0, TRUE),

-- Zona Universitària
(15, 'Aparcament Zona Universitària', 'aire_lliure', 'Avinguda de la Diagonal, 686', 'Barcelona', '08034', 41.387550, 2.115350, 300, 145, 2.00, 12.00, '07:00:00', '21:00:00', FALSE, '{"universitat": true, "estudiants": true}', FALSE, FALSE, FALSE, NULL, 'actiu', NULL, 3.70, 0, TRUE);


-- 4. HISTÒRIC DE DISPONIBILITAT (últimes 24h)


INSERT INTO historic_disponibilitat (aparcament_id, places_disponibles, timestamp, font) VALUES
-- Parking Plaça Catalunya (últimes 12 hores)
(1, 145, DATE_SUB(NOW(), INTERVAL 12 HOUR), 'sensor'),
(1, 132, DATE_SUB(NOW(), INTERVAL 10 HOUR), 'sensor'),
(1, 98, DATE_SUB(NOW(), INTERVAL 8 HOUR), 'sensor'),
(1, 76, DATE_SUB(NOW(), INTERVAL 6 HOUR), 'sensor'),
(1, 105, DATE_SUB(NOW(), INTERVAL 4 HOUR), 'sensor'),
(1, 120, DATE_SUB(NOW(), INTERVAL 2 HOUR), 'sensor'),
(1, 125, DATE_SUB(NOW(), INTERVAL 1 HOUR), 'sensor'),
(1, 120, DATE_SUB(NOW(), INTERVAL 30 MINUTE), 'usuari'),

-- Parking Sagrada Família
(4, 145, DATE_SUB(NOW(), INTERVAL 8 HOUR), 'sensor'),
(4, 120, DATE_SUB(NOW(), INTERVAL 6 HOUR), 'sensor'),
(4, 95, DATE_SUB(NOW(), INTERVAL 4 HOUR), 'sensor'),
(4, 102, DATE_SUB(NOW(), INTERVAL 2 HOUR), 'sensor'),

-- Parking Port Olímpic
(6, 200, DATE_SUB(NOW(), INTERVAL 10 HOUR), 'sensor'),
(6, 167, DATE_SUB(NOW(), INTERVAL 6 HOUR), 'sensor'),
(6, 156, DATE_SUB(NOW(), INTERVAL 2 HOUR), 'sensor');


-- 5. FOTOGRAFIES D'APARCAMENTS


INSERT INTO fotografies_aparcaments (aparcament_id, usuari_id, url, descripcio, verificada, ordre) VALUES
(1, 3, 'https://cdn.parklive.cat/img/parking_1_entrada.jpg', 'Entrada principal', TRUE, 1),
(1, 3, 'https://cdn.parklive.cat/img/parking_1_interior.jpg', 'Interior amb places', TRUE, 2),
(1, 5, 'https://cdn.parklive.cat/img/parking_1_carrega.jpg', 'Punt de càrrega elèctrica', TRUE, 3),
(4, 4, 'https://cdn.parklive.cat/img/parking_4_entrada.jpg', 'Entrada Sagrada Família', TRUE, 1),
(6, 6, 'https://cdn.parklive.cat/img/parking_6_vista.jpg', 'Vista al Port Olímpic', TRUE, 1),
(13, 3, 'https://cdn.parklive.cat/img/parking_13_estacio.jpg', 'Accés des de l estació', TRUE, 1);


-- 6. RESERVES (usuaris premium)


INSERT INTO reserves (id, usuari_id, aparcament_id, data_entrada, data_sortida, estat, preu_total, descompte_aplicat, codi_reserva, notes) VALUES
-- Reserves completades (passat)
(1, 5, 1, '2025-01-20 10:00:00', '2025-01-20 14:00:00', 'finalitzada', 14.00, 0.00, 'PLV-2025-000001', 'Reserva completada satisfactòriament'),
(2, 6, 4, '2025-01-22 09:00:00', '2025-01-22 18:00:00', 'finalitzada', 27.00, 3.00, 'PLV-2025-000002', 'Descompte aplicat per ser usuari premium'),
(3, 7, 6, '2025-01-23 15:00:00', '2025-01-23 20:00:00', 'finalitzada', 12.50, 0.00, 'PLV-2025-000003', NULL),

-- Reserves confirmades (futur)
(4, 5, 1, '2025-01-27 08:00:00', '2025-01-27 12:00:00', 'confirmada', 14.00, 0.00, 'PLV-2025-000004', 'Matí de demà'),
(5, 6, 13, '2025-01-28 10:00:00', '2025-01-28 14:00:00', 'confirmada', 11.20, 0.00, 'PLV-2025-000005', 'Prop de Sants Estació'),
(6, 7, 8, '2025-01-29 16:00:00', '2025-01-29 20:00:00', 'confirmada', 11.20, 0.00, 'PLV-2025-000006', 'Event a la Fira'),
(7, 8, 3, '2025-01-30 09:00:00', '2025-01-30 13:00:00', 'confirmada', 18.00, 0.00, 'PLV-2025-000007', 'Reunió a Passeig de Gràcia'),

-- Reserves en curs
(8, 5, 6, NOW(), DATE_ADD(NOW(), INTERVAL 3 HOUR), 'en_curs', 7.50, 0.00, 'PLV-2025-000008', 'Actualment al parking'),

-- Reserves cancel·lades
(9, 6, 1, '2025-01-25 10:00:00', '2025-01-25 14:00:00', 'cancel·lada', 14.00, 0.00, 'PLV-2025-000009', 'Cancel·lada per l usuari');


-- 7. PAGAMENTS


INSERT INTO pagaments (reserva_id, usuari_id, import, metode, estat, referencia_externa, data_pagament) VALUES
(1, 5, 14.00, 'targeta_credit', 'completat', 'ch_3P1a2B3c4D5e6F7g', '2025-01-20 09:55:00'),
(2, 6, 27.00, 'paypal', 'completat', 'PAYID-M234567890', '2025-01-22 08:50:00'),
(3, 7, 12.50, 'targeta_credit', 'completat', 'ch_3P2b3C4d5E6f7G8h', '2025-01-23 14:55:00'),
(4, 5, 14.00, 'targeta_credit', 'completat', 'ch_3P3c4D5e6F7g8H9i', '2025-01-26 20:30:00'),
(5, 6, 11.20, 'paypal', 'completat', 'PAYID-M234567891', '2025-01-26 21:15:00'),
(6, 7, 11.20, 'targeta_credit', 'completat', 'ch_3P4d5E6f7G8h9I0j', '2025-01-27 10:00:00'),
(7, 8, 18.00, 'apple_pay', 'completat', 'ap_3P5e6F7g8H9i0J1k', '2025-01-27 11:30:00'),
(8, 5, 7.50, 'targeta_credit', 'processat', 'ch_3P6f7G8h9I0j1K2l', NOW());


-- 8. FACTURES


INSERT INTO factures (pagament_id, usuari_id, numero_factura, import_subtotal, iva, import_total, data_emissio, pdf_url) VALUES
(1, 5, 'PLV-2025-F-0001', 11.57, 2.43, 14.00, '2025-01-20', 'https://cdn.parklive.cat/factures/PLV-2025-F-0001.pdf'),
(2, 6, 'PLV-2025-F-0002', 22.31, 4.69, 27.00, '2025-01-22', 'https://cdn.parklive.cat/factures/PLV-2025-F-0002.pdf'),
(3, 7, 'PLV-2025-F-0003', 10.33, 2.17, 12.50, '2025-01-23', 'https://cdn.parklive.cat/factures/PLV-2025-F-0003.pdf'),
(4, 5, 'PLV-2025-F-0004', 11.57, 2.43, 14.00, '2025-01-26', 'https://cdn.parklive.cat/factures/PLV-2025-F-0004.pdf'),
(5, 6, 'PLV-2025-F-0005', 9.26, 1.94, 11.20, '2025-01-26', 'https://cdn.parklive.cat/factures/PLV-2025-F-0005.pdf'),
(6, 7, 'PLV-2025-F-0006', 9.26, 1.94, 11.20, '2025-01-27', 'https://cdn.parklive.cat/factures/PLV-2025-F-0006.pdf'),
(7, 8, 'PLV-2025-F-0007', 14.88, 3.12, 18.00, '2025-01-27', 'https://cdn.parklive.cat/factures/PLV-2025-F-0007.pdf');


-- 9. VALORACIONS


INSERT INTO valoracions (usuari_id, aparcament_id, puntuacio, comentari, aspectes_valorats, verificada, util_count) VALUES
(5, 1, 5, 'Excel·lent aparcament al centre de Barcelona. Molt net i ben senyalitzat. Les places són amples i té càrrega elèctrica.', '{"neteja": 5, "seguretat": 5, "facilitat_acces": 4, "relacio_qualitat_preu": 4}', TRUE, 12),
(6, 1, 4, 'Molt bona ubicació però una mica car. El personal és amable i servicial.', '{"neteja": 4, "seguretat": 5, "facilitat_acces": 5, "relacio_qualitat_preu": 3}', TRUE, 8);