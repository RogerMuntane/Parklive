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
-- TRUNCATE TABLE logs_sistema;
TRUNCATE TABLE configuracio_sistema;
-- Reactivar comprovació de claus forànies
SET FOREIGN_KEY_CHECKS = 1;
-- 1. USUARIS (20 usuaris de diferents tipus)
-- Nota: Contrasenyes són totes "Password123!" amb hash bcrypt a la compte de apple es Password1234!
-- Hash generat: $2y$10$92IXUNpkjO0rOQ5byMi.Ye4oKoEa3Ro9llC/.og/at2.uheWG/igi
INSERT INTO usuaris (
        id,
        nom,
        cognoms,
        email,
        contrasenya_hash,
        telefon,
        tipus_usuari,
        estat,
        email_verificat,
        punts_gamificacio,
        data_registre,
        ultima_connexio
    )
VALUES -- Administradors
    (
        1,
        'Admin',
        'Sistema',
        'admin@parklive.cat',
        '$2y$10$92IXUNpkjO0rOQ5byMi.Ye4oKoEa3Ro9llC/.og/at2.uheWG/igi',
        '934567890',
        'admin',
        'actiu',
        TRUE,
        0,
        '2024-01-01 10:00:00',
        NOW()
    ),
    (
        2,
        'Maria',
        'Administradora',
        'maria.admin@parklive.cat',
        '$2y$10$92IXUNpkjO0rOQ5byMi.Ye4oKoEa3Ro9llC/.og/at2.uheWG/igi',
        '934567891',
        'admin',
        'actiu',
        TRUE,
        0,
        '2024-01-15 10:00:00',
        NOW()
    ),
    -- Operadors de pàrquings
    (
        3,
        'Operador',
        'Parking BCN',
        'operador@parkingbcn.com',
        '$2y$10$92IXUNpkjO0rOQ5byMi.Ye4oKoEa3Ro9llC/.og/at2.uheWG/igi',
        '935678901',
        'operador',
        'actiu',
        TRUE,
        0,
        '2024-02-01 10:00:00',
        NOW()
    ),
    (
        4,
        'Carles',
        'Gestió Aparcaments',
        'carles@saba.es',
        '$2y$10$92IXUNpkjO0rOQ5byMi.Ye4oKoEa3Ro9llC/.og/at2.uheWG/igi',
        '935678902',
        'operador',
        'actiu',
        TRUE,
        0,
        '2024-02-15 10:00:00',
        NOW()
    ),
    -- Usuaris Premium
    (
        5,
        'Joan',
        'García López',
        'joan.garcia@gmail.com',
        '$2y$10$92IXUNpkjO0rOQ5byMi.Ye4oKoEa3Ro9llC/.og/at2.uheWG/igi',
        '666123456',
        'premium',
        'actiu',
        TRUE,
        450,
        '2024-06-01 10:00:00',
        NOW()
    ),
    (
        6,
        'Laura',
        'Martínez Sanz',
        'laura.martinez@hotmail.com',
        '$2y$10$92IXUNpkjO0rOQ5byMi.Ye4oKoEa3Ro9llC/.og/at2.uheWG/igi',
        '666234567',
        'premium',
        'actiu',
        TRUE,
        780,
        '2024-07-10 10:00:00',
        NOW()
    ),
    (
        7,
        'David',
        'Fernández Costa',
        'david.fernandez@outlook.com',
        '$2y$10$92IXUNpkjO0rOQ5byMi.Ye4oKoEa3Ro9llC/.og/at2.uheWG/igi',
        '666345678',
        'premium',
        'actiu',
        TRUE,
        1200,
        '2024-05-20 10:00:00',
        NOW()
    ),
    (
        8,
        'Anna',
        'Rodríguez Pons',
        'anna.rodriguez@gmail.com',
        '$2y$10$92IXUNpkjO0rOQ5byMi.Ye4oKoEa3Ro9llC/.og/at2.uheWG/igi',
        '666456789',
        'premium',
        'actiu',
        TRUE,
        320,
        '2024-08-15 10:00:00',
        NOW()
    ),
    -- Usuaris Bàsics
    (
        9,
        'Marc',
        'Sánchez Vila',
        'marc.sanchez@gmail.com',
        '$2y$10$92IXUNpkjO0rOQ5byMi.Ye4oKoEa3Ro9llC/.og/at2.uheWG/igi',
        '677123456',
        'basic',
        'actiu',
        TRUE,
        150,
        '2024-09-01 10:00:00',
        NOW()
    ),
    (
        10,
        'Marta',
        'López Ortiz',
        'marta.lopez@yahoo.es',
        '$2y$10$92IXUNpkjO0rOQ5byMi.Ye4oKoEa3Ro9llC/.og/at2.uheWG/igi',
        '677234567',
        'basic',
        'actiu',
        TRUE,
        90,
        '2024-09-15 10:00:00',
        NOW()
    ),
    (
        11,
        'Pere',
        'González Ruiz',
        'pere.gonzalez@gmail.com',
        '$2y$10$92IXUNpkjO0rOQ5byMi.Ye4oKoEa3Ro9llC/.og/at2.uheWG/igi',
        '677345678',
        'basic',
        'actiu',
        TRUE,
        210,
        '2024-10-01 10:00:00',
        NOW()
    ),
    (
        12,
        'Sara',
        'Pérez Molina',
        'sara.perez@hotmail.com',
        '$2y$10$92IXUNpkjO0rOQ5byMi.Ye4oKoEa3Ro9llC/.og/at2.uheWG/igi',
        '677456789',
        'basic',
        'actiu',
        TRUE,
        60,
        '2024-10-20 10:00:00',
        NOW()
    ),
    (
        13,
        'Jordi',
        'Martí Soler',
        'jordi.marti@gmail.com',
        '$2y$10$92IXUNpkjO0rOQ5byMi.Ye4oKoEa3Ro9llC/.og/at2.uheWG/igi',
        '688123456',
        'basic',
        'actiu',
        TRUE,
        340,
        '2024-08-05 10:00:00',
        NOW()
    ),
    (
        14,
        'Cristina',
        'Romero Vidal',
        'cristina.romero@gmail.com',
        '$2y$10$92IXUNpkjO0rOQ5byMi.Ye4oKoEa3Ro9llC/.og/at2.uheWG/igi',
        '688234567',
        'basic',
        'actiu',
        TRUE,
        180,
        '2024-11-01 10:00:00',
        NOW()
    ),
    (
        15,
        'Albert',
        'Torres Navarro',
        'albert.torres@outlook.com',
        '$2y$10$92IXUNpkjO0rOQ5byMi.Ye4oKoEa3Ro9llC/.og/at2.uheWG/igi',
        '688345678',
        'basic',
        'actiu',
        TRUE,
        420,
        '2024-07-25 10:00:00',
        NOW()
    ),
    (
        16,
        'Núria',
        'Giménez Ramos',
        'nuria.gimenez@gmail.com',
        '$2y$10$92IXUNpkjO0rOQ5byMi.Ye4oKoEa3Ro9llC/.og/at2.uheWG/igi',
        '688456789',
        'basic',
        'actiu',
        FALSE,
        30,
        '2025-01-10 10:00:00',
        NOW()
    ),
    (
        17,
        'Pau',
        'Vázquez Ibáñez',
        'pau.vazquez@gmail.com',
        '$2y$10$92IXUNpkjO0rOQ5byMi.Ye4oKoEa3Ro9llC/.og/at2.uheWG/igi',
        '699123456',
        'basic',
        'actiu',
        TRUE,
        110,
        '2024-12-01 10:00:00',
        NOW()
    ),
    (
        18,
        'Elena',
        'Jiménez Castro',
        'elena.jimenez@yahoo.es',
        '$2y$10$92IXUNpkjO0rOQ5byMi.Ye4oKoEa3Ro9llC/.og/at2.uheWG/igi',
        '699234567',
        'basic',
        'actiu',
        TRUE,
        270,
        '2024-09-20 10:00:00',
        NOW()
    ),
    (
        19,
        'Raül',
        'Moreno Serrano',
        'raul.moreno@gmail.com',
        '$2y$10$92IXUNpkjO0rOQ5byMi.Ye4oKoEa3Ro9llC/.og/at2.uheWG/igi',
        '699345678',
        'basic',
        'inactiu',
        TRUE,
        50,
        '2024-06-15 10:00:00',
        '2024-12-01 10:00:00'
    ),
    (
        20,
        'Montse',
        'Rubio Gil',
        'montse.rubio@hotmail.com',
        '$2y$10$92IXUNpkjO0rOQ5byMi.Ye4oKoEa3Ro9llC/.og/at2.uheWG/igi',
        '699456789',
        'basic',
        'actiu',
        TRUE,
        390,
        '2024-08-28 10:00:00',
        NOW()
    );
-- 2. SUBSCRIPCIONS (pels usuaris premium)
INSERT INTO subscripcions (
        usuari_id,
        tipus,
        estat,
        data_inici,
        data_final,
        preu,
        metode_pagament,
        auto_renovacio
    )
VALUES (
        5,
        'mensual',
        'activa',
        '2025-01-01',
        '2025-02-01',
        9.99,
        'targeta',
        TRUE
    ),
    (
        6,
        'trimestral',
        'activa',
        '2024-11-01',
        '2025-02-01',
        25.99,
        'paypal',
        TRUE
    ),
    (
        7,
        'anual',
        'activa',
        '2024-05-20',
        '2025-05-20',
        89.99,
        'targeta',
        TRUE
    ),
    (
        8,
        'mensual',
        'activa',
        '2024-12-15',
        '2025-01-15',
        9.99,
        'targeta',
        FALSE
    );
-- 3. APARCAMENTS (15 aparcaments a Barcelona)
INSERT INTO aparcaments (
        id,
        nom,
        tipus,
        adreca,
        ciutat,
        codi_postal,
        latitud,
        longitud,
        capacitat_total,
        places_disponibles,
        tarifa_hora,
        tarifa_dia,
        horari_obertura,
        horari_tancament,
        obert_24h,
        caracteristiques,
        accessibilitat,
        carrega_electrica,
        videovigilancia,
        altura_maxima,
        estat,
        operador_id,
        verificat
    )
VALUES -- Centre de Barcelona
    (
        1,
        'Parking Plaça Catalunya',
        'cobert',
        'Plaça Catalunya, 9',
        'Barcelona',
        '08002',
        41.387428,
        2.169919,
        500,
        125,
        3.50,
        25.00,
        NULL,
        NULL,
        TRUE,
        '{"wifi": true, "lavabo": true, "assist_24h": true}',
        TRUE,
        TRUE,
        TRUE,
        2.10,
        'actiu',
        3,
        TRUE
    ),
    (
        2,
        'Aparcament Rambla Catalunya',
        'subterrani',
        'Rambla de Catalunya, 15',
        'Barcelona',
        '08007',
        41.390205,
        2.163774,
        300,
        89,
        3.80,
        28.00,
        NULL,
        NULL,
        TRUE,
        '{"wifi": true, "assist_24h": true}',
        TRUE,
        TRUE,
        TRUE,
        2.00,
        'actiu',
        3,
        TRUE
    ),
    (
        3,
        'Parking Passeig de Gràcia',
        'cobert',
        'Passeig de Gràcia, 63',
        'Barcelona',
        '08008',
        41.394699,
        2.163162,
        250,
        67,
        4.50,
        32.00,
        NULL,
        NULL,
        TRUE,
        '{"wifi": true, "lavabo": true, "premium": true}',
        TRUE,
        TRUE,
        TRUE,
        2.10,
        'actiu',
        3,
        TRUE
    ),
    -- Sagrada Família
    (
        4,
        'Aparcament Sagrada Família',
        'subterrani',
        'Carrer de Mallorca, 401',
        'Barcelona',
        '08013',
        41.403569,
        2.174355,
        350,
        102,
        3.00,
        22.00,
        '07:00:00',
        '23:00:00',
        FALSE,
        '{"wifi": false, "assist_horary": true}',
        TRUE,
        FALSE,
        TRUE,
        2.10,
        'actiu',
        4,
        TRUE
    ),
    (
        5,
        'Parking Temple Expiatori',
        'aire_lliure',
        'Carrer de Sardenya, 311',
        'Barcelona',
        '08025',
        41.404824,
        2.175503,
        150,
        45,
        2.50,
        18.00,
        '08:00:00',
        '20:00:00',
        FALSE,
        '{"descobert": true}',
        FALSE,
        FALSE,
        FALSE,
        NULL,
        'actiu',
        4,
        TRUE
    ),
    -- Port Olímpic i Platja
    (
        6,
        'Parking Port Olímpic',
        'aire_lliure',
        'Moll de Gregal, 15',
        'Barcelona',
        '08005',
        41.387134,
        2.198091,
        400,
        156,
        2.50,
        18.00,
        NULL,
        NULL,
        TRUE,
        '{"prop_platja": true, "wifi": false}',
        TRUE,
        TRUE,
        TRUE,
        2.00,
        'actiu',
        3,
        TRUE
    ),
    (
        7,
        'Aparcament Barceloneta',
        'carrer',
        'Passeig de Joan de Borbó, 88',
        'Barcelona',
        '08003',
        41.381542,
        2.189750,
        200,
        78,
        2.00,
        15.00,
        '09:00:00',
        '21:00:00',
        FALSE,
        '{"zona_blava": true, "prop_platja": true}',
        FALSE,
        FALSE,
        FALSE,
        NULL,
        'actiu',
        NULL,
        TRUE
    ),
    -- Montjuïc i Fira
    (
        8,
        'Parking Fira de Barcelona',
        'cobert',
        'Avinguda de la Reina Maria Cristina, s/n',
        'Barcelona',
        '08004',
        41.371985,
        2.148568,
        800,
        423,
        2.80,
        20.00,
        NULL,
        NULL,
        TRUE,
        '{"wifi": true, "esdeveniments": true}',
        TRUE,
        TRUE,
        TRUE,
        2.50,
        'actiu',
        4,
        TRUE
    ),
    (
        9,
        'Aparcament Plaça Espanya',
        'subterrani',
        'Plaça Espanya, 1',
        'Barcelona',
        '08014',
        41.375350,
        2.149050,
        450,
        189,
        3.20,
        24.00,
        NULL,
        NULL,
        TRUE,
        '{"wifi": true, "lavabo": true}',
        TRUE,
        TRUE,
        TRUE,
        2.00,
        'actiu',
        3,
        TRUE
    ),
    -- Eixample
    (
        10,
        'Parking Hospital Clínic',
        'cobert',
        'Carrer Villarroel, 170',
        'Barcelona',
        '08036',
        41.390394,
        2.152899,
        300,
        91,
        3.50,
        26.00,
        NULL,
        NULL,
        TRUE,
        '{"hospital": true, "wifi": true}',
        TRUE,
        FALSE,
        TRUE,
        2.00,
        'actiu',
        4,
        TRUE
    ),
    (
        11,
        'Aparcament Diagonal',
        'subterrani',
        'Avinguda Diagonal, 442',
        'Barcelona',
        '08037',
        41.396350,
        2.153550,
        250,
        67,
        4.00,
        30.00,
        NULL,
        NULL,
        TRUE,
        '{"wifi": true, "premium": true}',
        TRUE,
        TRUE,
        TRUE,
        2.10,
        'actiu',
        3,
        TRUE
    ),
    -- Gràcia
    (
        12,
        'Parking Vila de Gràcia',
        'cobert',
        'Carrer de la Mare de Déu dels Desemparats, 5',
        'Barcelona',
        '08012',
        41.401750,
        2.156850,
        200,
        56,
        3.00,
        22.00,
        '07:00:00',
        '22:00:00',
        FALSE,
        '{"wifi": false, "barri": true}',
        TRUE,
        FALSE,
        TRUE,
        2.00,
        'actiu',
        4,
        TRUE
    ),
    -- Sants
    (
        13,
        'Parking Sants Estació',
        'cobert',
        'Plaça dels Països Catalans, s/n',
        'Barcelona',
        '08014',
        41.379020,
        2.140310,
        600,
        234,
        2.80,
        20.00,
        NULL,
        NULL,
        TRUE,
        '{"wifi": true, "estacio_tren": true, "lavabo": true}',
        TRUE,
        TRUE,
        TRUE,
        2.20,
        'actiu',
        3,
        TRUE
    ),
    -- Les Corts
    (
        14,
        'Parking Camp Nou',
        'aire_lliure',
        'Carrer d Aristides Maillol, s/n',
        'Barcelona',
        '08028',
        41.380896,
        2.122820,
        1000,
        567,
        5.00,
        40.00,
        '08:00:00',
        '23:00:00',
        FALSE,
        '{"esdeveniments_esportius": true, "gran_capacitat": true}',
        TRUE,
        FALSE,
        FALSE,
        NULL,
        'actiu',
        4,
        TRUE
    ),
    -- Zona Universitària
    (
        15,
        'Aparcament Zona Universitària',
        'aire_lliure',
        'Avinguda de la Diagonal, 686',
        'Barcelona',
        '08034',
        41.387550,
        2.115350,
        300,
        145,
        2.00,
        12.00,
        '07:00:00',
        '21:00:00',
        FALSE,
        '{"universitat": true, "estudiants": true}',
        FALSE,
        FALSE,
        FALSE,
        NULL,
        'actiu',
        NULL,
        TRUE
    );
-- 4. HISTÒRIC DE DISPONIBILITAT (últimes 24h)
INSERT INTO historic_disponibilitat (
        aparcament_id,
        places_disponibles,
        timestamp,
        font
    )
VALUES -- Parking Plaça Catalunya (últimes 12 hores)
    (
        1,
        145,
        DATE_SUB(NOW(), INTERVAL 12 HOUR),
        'sensor'
    ),
    (
        1,
        132,
        DATE_SUB(NOW(), INTERVAL 10 HOUR),
        'sensor'
    ),
    (
        1,
        98,
        DATE_SUB(NOW(), INTERVAL 8 HOUR),
        'sensor'
    ),
    (
        1,
        76,
        DATE_SUB(NOW(), INTERVAL 6 HOUR),
        'sensor'
    ),
    (
        1,
        105,
        DATE_SUB(NOW(), INTERVAL 4 HOUR),
        'sensor'
    ),
    (
        1,
        120,
        DATE_SUB(NOW(), INTERVAL 2 HOUR),
        'sensor'
    ),
    (
        1,
        125,
        DATE_SUB(NOW(), INTERVAL 1 HOUR),
        'sensor'
    ),
    (
        1,
        120,
        DATE_SUB(NOW(), INTERVAL 30 MINUTE),
        'usuari'
    ),
    -- Parking Sagrada Família
    (
        4,
        145,
        DATE_SUB(NOW(), INTERVAL 8 HOUR),
        'sensor'
    ),
    (
        4,
        120,
        DATE_SUB(NOW(), INTERVAL 6 HOUR),
        'sensor'
    ),
    (
        4,
        95,
        DATE_SUB(NOW(), INTERVAL 4 HOUR),
        'sensor'
    ),
    (
        4,
        102,
        DATE_SUB(NOW(), INTERVAL 2 HOUR),
        'sensor'
    ),
    -- Parking Port Olímpic
    (
        6,
        200,
        DATE_SUB(NOW(), INTERVAL 10 HOUR),
        'sensor'
    ),
    (
        6,
        167,
        DATE_SUB(NOW(), INTERVAL 6 HOUR),
        'sensor'
    ),
    (
        6,
        156,
        DATE_SUB(NOW(), INTERVAL 2 HOUR),
        'sensor'
    );
-- 5. FOTOGRAFIES D'APARCAMENTS
INSERT INTO fotografies_aparcaments (
        aparcament_id,
        usuari_id,
        url,
        descripcio,
        verificada,
        ordre
    )
VALUES (
        1,
        3,
        'https://cdn.parklive.cat/img/parking_1_entrada.jpg',
        'Entrada principal',
        TRUE,
        1
    ),
    (
        1,
        3,
        'https://cdn.parklive.cat/img/parking_1_interior.jpg',
        'Interior amb places',
        TRUE,
        2
    ),
    (
        1,
        5,
        'https://cdn.parklive.cat/img/parking_1_carrega.jpg',
        'Punt de càrrega elèctrica',
        TRUE,
        3
    ),
    (
        4,
        4,
        'https://cdn.parklive.cat/img/parking_4_entrada.jpg',
        'Entrada Sagrada Família',
        TRUE,
        1
    ),
    (
        6,
        6,
        'https://cdn.parklive.cat/img/parking_6_vista.jpg',
        'Vista al Port Olímpic',
        TRUE,
        1
    ),
    (
        13,
        3,
        'https://cdn.parklive.cat/img/parking_13_estacio.jpg',
        'Accés des de l estació',
        TRUE,
        1
    );
-- 6. RESERVES (usuaris premium)
INSERT INTO reserves (
        id,
        usuari_id,
        aparcament_id,
        data_entrada,
        data_sortida,
        estat,
        preu_total,
        descompte_aplicat,
        codi_reserva,
        notes
    )
VALUES -- Reserves completades (passat)
    (
        1,
        5,
        1,
        '2025-01-20 10:00:00',
        '2025-01-20 14:00:00',
        'finalitzada',
        14.00,
        0.00,
        'PLV-2025-000001',
        'Reserva completada satisfactòriament'
    ),
    (
        2,
        6,
        4,
        '2025-01-22 09:00:00',
        '2025-01-22 18:00:00',
        'finalitzada',
        27.00,
        3.00,
        'PLV-2025-000002',
        'Descompte aplicat per ser usuari premium'
    ),
    (
        3,
        7,
        6,
        '2025-01-23 15:00:00',
        '2025-01-23 20:00:00',
        'finalitzada',
        12.50,
        0.00,
        'PLV-2025-000003',
        NULL
    ),
    -- Reserves confirmades (futur)
    (
        4,
        5,
        1,
        '2025-01-27 08:00:00',
        '2025-01-27 12:00:00',
        'confirmada',
        14.00,
        0.00,
        'PLV-2025-000004',
        'Matí de demà'
    ),
    (
        5,
        6,
        13,
        '2025-01-28 10:00:00',
        '2025-01-28 14:00:00',
        'confirmada',
        11.20,
        0.00,
        'PLV-2025-000005',
        'Prop de Sants Estació'
    ),
    (
        6,
        7,
        8,
        '2025-01-29 16:00:00',
        '2025-01-29 20:00:00',
        'confirmada',
        11.20,
        0.00,
        'PLV-2025-000006',
        'Event a la Fira'
    ),
    (
        7,
        8,
        3,
        '2025-01-30 09:00:00',
        '2025-01-30 13:00:00',
        'confirmada',
        18.00,
        0.00,
        'PLV-2025-000007',
        'Reunió a Passeig de Gràcia'
    ),
    -- Reserves en curs
    (
        8,
        5,
        6,
        NOW(),
        DATE_ADD(NOW(), INTERVAL 3 HOUR),
        'en_curs',
        7.50,
        0.00,
        'PLV-2025-000008',
        'Actualment al parking'
    ),
    -- Reserves cancel·lades
    (
        9,
        6,
        1,
        '2025-01-25 10:00:00',
        '2025-01-25 14:00:00',
        'cancel·lada',
        14.00,
        0.00,
        'PLV-2025-000009',
        'Cancel·lada per l usuari'
    );
-- 7. PAGAMENTS
INSERT INTO pagaments (
        reserva_id,
        usuari_id,
        import,
        metode,
        estat,
        referencia_externa,
        data_pagament
    )
VALUES (
        1,
        5,
        14.00,
        'targeta_credit',
        'completat',
        'ch_3P1a2B3c4D5e6F7g',
        '2025-01-20 09:55:00'
    ),
    (
        2,
        6,
        27.00,
        'paypal',
        'completat',
        'PAYID-M234567890',
        '2025-01-22 08:50:00'
    ),
    (
        3,
        7,
        12.50,
        'targeta_credit',
        'completat',
        'ch_3P2b3C4d5E6f7G8h',
        '2025-01-23 14:55:00'
    ),
    (
        4,
        5,
        14.00,
        'targeta_credit',
        'completat',
        'ch_3P3c4D5e6F7g8H9i',
        '2025-01-26 20:30:00'
    ),
    (
        5,
        6,
        11.20,
        'paypal',
        'completat',
        'PAYID-M234567891',
        '2025-01-26 21:15:00'
    ),
    (
        6,
        7,
        11.20,
        'targeta_credit',
        'completat',
        'ch_3P4d5E6f7G8h9I0j',
        '2025-01-27 10:00:00'
    ),
    (
        7,
        8,
        18.00,
        'apple_pay',
        'completat',
        'ap_3P5e6F7g8H9i0J1k',
        '2025-01-27 11:30:00'
    ),
    (
        8,
        5,
        7.50,
        'targeta_credit',
        'processat',
        'ch_3P6f7G8h9I0j1K2l',
        NOW()
    );
-- 8. FACTURES
INSERT INTO factures (
        pagament_id,
        usuari_id,
        numero_factura,
        import_subtotal,
        iva,
        import_total,
        data_emissio,
        pdf_url
    )
VALUES (
        1,
        5,
        'PLV-2025-F-0001',
        11.57,
        2.43,
        14.00,
        '2025-01-20',
        'https://cdn.parklive.cat/factures/PLV-2025-F-0001.pdf'
    ),
    (
        2,
        6,
        'PLV-2025-F-0002',
        22.31,
        4.69,
        27.00,
        '2025-01-22',
        'https://cdn.parklive.cat/factures/PLV-2025-F-0002.pdf'
    ),
    (
        3,
        7,
        'PLV-2025-F-0003',
        10.33,
        2.17,
        12.50,
        '2025-01-23',
        'https://cdn.parklive.cat/factures/PLV-2025-F-0003.pdf'
    ),
    (
        4,
        5,
        'PLV-2025-F-0004',
        11.57,
        2.43,
        14.00,
        '2025-01-26',
        'https://cdn.parklive.cat/factures/PLV-2025-F-0004.pdf'
    ),
    (
        5,
        6,
        'PLV-2025-F-0005',
        9.26,
        1.94,
        11.20,
        '2025-01-26',
        'https://cdn.parklive.cat/factures/PLV-2025-F-0005.pdf'
    ),
    (
        6,
        7,
        'PLV-2025-F-0006',
        9.26,
        1.94,
        11.20,
        '2025-01-27',
        'https://cdn.parklive.cat/factures/PLV-2025-F-0006.pdf'
    ),
    (
        7,
        8,
        'PLV-2025-F-0007',
        14.88,
        3.12,
        18.00,
        '2025-01-27',
        'https://cdn.parklive.cat/factures/PLV-2025-F-0007.pdf'
    );
-- 9. VALORACIONS
INSERT INTO valoracions (
        usuari_id,
        aparcament_id,
        puntuacio,
        comentari,
        aspectes_valorats,
        verificada,
        util_count
    )
VALUES (
        5,
        1,
        5,
        'Excel·lent aparcament al centre de Barcelona. Molt net i ben senyalitzat. Les places són amples i té càrrega elèctrica.',
        '{"neteja": 5, "seguretat": 5, "facilitat_acces": 4, "relacio_qualitat_preu": 4}',
        TRUE,
        12
    ),
    (
        6,
        1,
        4,
        'Molt bona ubicació però una mica car. El personal és amable i servicial.',
        '{"neteja": 4, "seguretat": 5, "facilitat_acces": 5, "relacio_qualitat_preu": 3}',
        TRUE,
        8
    ),
    (
        7,
        2,
        3,
        'Correcte per aparcar unes hores. Entrada una mica estreta si portes un SUV.',
        '{"neteja": 3, "seguretat": 4, "facilitat_acces": 2, "relacio_qualitat_preu": 3}',
        TRUE,
        2
    ),
    (
        8,
        2,
        4,
        'Bona relació qualitat-preu i fàcil d’arribar. Senyalització interior milloraria.',
        '{"neteja": 4, "seguretat": 4, "facilitat_acces": 4, "relacio_qualitat_preu": 4}',
        FALSE,
        0
    ),
    (
        9,
        3,
        5,
        'Molt segur, càmeres i bona il·luminació. Reserva i entrada molt ràpides.',
        '{"neteja": 5, "seguretat": 5, "facilitat_acces": 5, "relacio_qualitat_preu": 4}',
        TRUE,
        6
    ),
    (
        10,
        3,
        2,
        'Vaig trobar-me la rampa saturada i vaig perdre temps. Preu elevat pel servei ofert.',
        '{"neteja": 3, "seguretat": 3, "facilitat_acces": 2, "relacio_qualitat_preu": 2}',
        TRUE,
        1
    ),
    (
        11,
        4,
        4,
        'Bon aparcament per deixar el cotxe tot el dia. Personal correcte.',
        '{"neteja": 4, "seguretat": 4, "facilitat_acces": 4, "relacio_qualitat_preu": 4}',
        TRUE,
        3
    ),
    (
        12,
        4,
        5,
        'Instal·lacions noves i molt netes. Punt de càrrega va funcionar perfectament.',
        '{"neteja": 5, "seguretat": 5, "facilitat_acces": 4, "relacio_qualitat_preu": 4}',
        TRUE,
        9
    ),
    (
        13,
        5,
        1,
        'Mala experiència: el lector de matrícula no funcionava i ningú responia al timbre.',
        '{"neteja": 2, "seguretat": 2, "facilitat_acces": 1, "relacio_qualitat_preu": 1}',
        FALSE,
        0
    ),
    (
        14,
        5,
        3,
        'Aparcament correcte però cal millorar la sortida en hores punta.',
        '{"neteja": 3, "seguretat": 4, "facilitat_acces": 3, "relacio_qualitat_preu": 3}',
        TRUE,
        1
    );
-- 10. RESPOSTES A VALORACIONS
INSERT INTO respostes_valoracions (valoracio_id, usuari_id, text)
VALUES (
        1,
        3,
        'Moltes gràcies per la teva valoració! Ens alegra saber que l''experiència ha estat excel·lent.'
    ),
    (
        2,
        3,
        'Agraïm els teus comentaris. Treballem per mantenir el millor equilibri qualitat-preu de la zona.'
    ),
    (
        6,
        3,
        'Sentim les molèsties ocasionades. Estem millorant el sistema de gestió de flux en hores punta.'
    ),
    (
        9,
        3,
        'Ho lamentem molt. Hem revisat el sistema de lectura i ja està operatiu. Disculpa les molèsties.'
    );
-- 11. SESSIONS (exemples de sessions actives)
INSERT INTO sessions (
        usuari_id,
        token,
        ip_address,
        user_agent,
        expires_at
    )
VALUES (
        5,
        'tok_a8f3d9e2c1b4567890abcdef12345678',
        '192.168.1.100',
        'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
        '2026-02-24 18:30:00'
    ),
    (
        6,
        'tok_b1234567890abcdef1234567890abcde',
        '10.0.0.45',
        'Mozilla/5.0 (iPhone; CPU iPhone OS 15_0 like Mac OS X)',
        '2026-02-25 12:00:00'
    ),
    (
        7,
        'tok_c9876543210fedcba0987654321fedcb',
        '172.16.0.22',
        'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7)',
        '2026-02-24 22:15:00'
    ),
    (
        10,
        'tok_d1122334455667788990011223344556',
        '192.168.0.88',
        'Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36',
        '2026-02-26 09:00:00'
    );
-- 12. CODIS DE RESET CONTRASENYA (alguns usats, alguns pendents)
INSERT INTO codis_reset_contrasenya (usuari_id, code_hash, expires_at, used, used_at)
VALUES (
        8,
        SHA2('RESET2026ABC123', 256),
        '2026-02-23 10:00:00',
        FALSE,
        NULL
    ),
    (
        11,
        SHA2('RESET2026DEF456', 256),
        '2026-02-22 14:30:00',
        TRUE,
        '2026-02-22 14:25:00'
    ),
    (
        13,
        SHA2('RESET2026GHI789', 256),
        '2026-02-24 08:00:00',
        FALSE,
        NULL
    );
-- 13. SUBSCRIPCIONS PREMIUM
INSERT INTO subscripcions (
        usuari_id,
        tipus,
        estat,
        data_inici,
        data_final,
        preu,
        metode_pagament,
        auto_renovacio
    )
VALUES (
        5,
        'anual',
        'activa',
        '2025-03-01',
        '2026-03-01',
        59.99,
        'targeta',
        TRUE
    ),
    (
        6,
        'mensual',
        'activa',
        '2026-02-01',
        '2026-03-01',
        6.99,
        'paypal',
        TRUE
    ),
    (
        9,
        'trimestral',
        'activa',
        '2025-12-15',
        '2026-03-15',
        17.99,
        'targeta',
        FALSE
    ),
    (
        12,
        'anual',
        'activa',
        '2025-06-10',
        '2026-06-10',
        59.99,
        'targeta',
        TRUE
    ),
    (
        14,
        'mensual',
        'cancel·lada',
        '2026-01-05',
        '2026-02-05',
        6.99,
        'paypal',
        FALSE
    );
-- 14. HISTÒRIC DE DISPONIBILITAT
INSERT INTO historic_disponibilitat (
        aparcament_id,
        places_disponibles,
        timestamp,
        font
    )
VALUES -- Aparcament 1 (evolució durant el dia)
    (1, 120, '2026-02-23 06:00:00', 'sistema'),
    (1, 98, '2026-02-23 08:30:00', 'sensor'),
    (1, 65, '2026-02-23 10:00:00', 'sensor'),
    (1, 45, '2026-02-23 12:30:00', 'sensor'),
    (1, 32, '2026-02-23 14:00:00', 'usuari'),
    (1, 58, '2026-02-23 18:00:00', 'sensor'),
    (1, 95, '2026-02-23 22:00:00', 'sensor'),
    -- Aparcament 2
    (2, 75, '2026-02-23 07:00:00', 'sistema'),
    (2, 52, '2026-02-23 09:00:00', 'sensor'),
    (2, 28, '2026-02-23 13:00:00', 'sensor'),
    (2, 61, '2026-02-23 19:00:00', 'sensor'),
    -- Aparcament 3
    (3, 200, '2026-02-23 06:30:00', 'sistema'),
    (3, 145, '2026-02-23 10:30:00', 'sensor'),
    (3, 89, '2026-02-23 14:30:00', 'usuari'),
    (3, 178, '2026-02-23 21:00:00', 'sensor'),
    -- Aparcament 4
    (4, 48, '2026-02-23 08:00:00', 'sistema'),
    (4, 22, '2026-02-23 11:00:00', 'operador'),
    (4, 15, '2026-02-23 15:00:00', 'sensor'),
    (4, 39, '2026-02-23 20:00:00', 'sensor'),
    -- Aparcament 5
    (5, 310, '2026-02-23 07:30:00', 'sistema'),
    (5, 201, '2026-02-23 11:30:00', 'sensor'),
    (5, 156, '2026-02-23 16:00:00', 'usuari'),
    (5, 278, '2026-02-23 23:00:00', 'sistema');
-- 15. FOTOGRAFIES D'APARCAMENTS
INSERT INTO fotografies_aparcaments (
        aparcament_id,
        usuari_id,
        url,
        descripcio,
        verificada,
        ordre
    )
VALUES (
        1,
        5,
        '/uploads/aparcaments/1/foto_entrada_principal.jpg',
        'Entrada principal amb rampa d''accés',
        TRUE,
        1
    ),
    (
        1,
        6,
        '/uploads/aparcaments/1/foto_interior_1.jpg',
        'Interior planta -1 amb senyalització',
        TRUE,
        2
    ),
    (
        1,
        5,
        '/uploads/aparcaments/1/foto_carregadors.jpg',
        'Zona de càrrega elèctrica',
        TRUE,
        3
    ),
    (
        2,
        7,
        '/uploads/aparcaments/2/foto_fachada.jpg',
        'Façana de l''aparcament',
        TRUE,
        1
    ),
    (
        2,
        8,
        '/uploads/aparcaments/2/foto_places.jpg',
        'Places d''estacionament',
        FALSE,
        2
    ),
    (
        3,
        9,
        '/uploads/aparcaments/3/foto_entrada_nit.jpg',
        'Entrada il·luminada (nocturn)',
        TRUE,
        1
    ),
    (
        3,
        10,
        '/uploads/aparcaments/3/foto_seguretat.jpg',
        'Càmeres de videovigilància',
        TRUE,
        2
    ),
    (
        3,
        9,
        '/uploads/aparcaments/3/foto_ascensor.jpg',
        'Ascensors i accessibilitat',
        TRUE,
        3
    ),
    (
        4,
        11,
        '/uploads/aparcaments/4/foto_general.jpg',
        'Vista general de l''aparcament',
        TRUE,
        1
    ),
    (
        5,
        13,
        '/uploads/aparcaments/5/foto_panoramica.jpg',
        'Panoràmica de la zona de parking',
        FALSE,
        1
    );
-- 16. RESERVES
INSERT INTO reserves (
        usuari_id,
        aparcament_id,
        data_entrada,
        data_sortida,
        estat,
        preu_total,
        descompte_aplicat,
        codi_reserva,
        notes
    )
VALUES -- Reserves finalitzades
    (
        5,
        1,
        '2026-02-15 10:00:00',
        '2026-02-15 18:00:00',
        'finalitzada',
        16.00,
        0.00,
        'RES-2026-000001',
        'Reserva sense incidències'
    ),
    (
        6,
        2,
        '2026-02-18 08:30:00',
        '2026-02-18 14:00:00',
        'finalitzada',
        11.00,
        1.00,
        'RES-2026-000002',
        'Aplicat descompte premium'
    ),
    (
        7,
        3,
        '2026-02-20 12:00:00',
        '2026-02-20 20:00:00',
        'finalitzada',
        18.00,
        0.00,
        'RES-2026-000003',
        NULL
    ),
    -- Reserves confirmades (futures)
    (
        8,
        1,
        '2026-02-25 09:00:00',
        '2026-02-25 19:00:00',
        'confirmada',
        20.00,
        0.00,
        'RES-2026-000004',
        'Reserva per jornada de treball'
    ),
    (
        9,
        4,
        '2026-02-26 15:00:00',
        '2026-02-26 22:00:00',
        'confirmada',
        14.00,
        2.00,
        'RES-2026-000005',
        'Aplicat codi promocional WELCOME10'
    ),
    (
        10,
        5,
        '2026-02-27 07:00:00',
        '2026-02-27 10:00:00',
        'confirmada',
        6.00,
        0.00,
        'RES-2026-000006',
        NULL
    ),
    -- Reserves en curs
    (
        11,
        2,
        '2026-02-23 06:00:00',
        '2026-02-23 23:59:00',
        'en_curs',
        35.00,
        0.00,
        'RES-2026-000007',
        'Reserva de dia sencer'
    ),
    (
        12,
        3,
        '2026-02-23 10:00:00',
        '2026-02-23 18:00:00',
        'en_curs',
        16.00,
        1.50,
        'RES-2026-000008',
        'Descompte usuari premium'
    ),
    -- Reserves cancel·lades
    (
        13,
        1,
        '2026-02-22 14:00:00',
        '2026-02-22 18:00:00',
        'cancel·lada',
        8.00,
        0.00,
        'RES-2026-000009',
        'Cancel·lada per l''usuari'
    ),
    (
        14,
        4,
        '2026-02-21 11:00:00',
        '2026-02-21 15:00:00',
        'cancel·lada',
        8.00,
        0.00,
        'RES-2026-000010',
        'Canvi de plans'
    );
-- 17. PAGAMENTS
INSERT INTO pagaments (
        reserva_id,
        usuari_id,
        import,
        metode,
        estat,
        referencia_externa,
        data_pagament
    )
VALUES -- Pagaments completats (reserves finalitzades)
    (
        1,
        5,
        16.00,
        'targeta_credit',
        'completat',
        'PAY-EXT-20260215-A1B2C3',
        '2026-02-15 09:55:00'
    ),
    (
        2,
        6,
        11.00,
        'paypal',
        'completat',
        'PAYPAL-20260218-XYZ789',
        '2026-02-18 08:20:00'
    ),
    (
        3,
        7,
        18.00,
        'google_pay',
        'completat',
        'GPAY-20260220-QWE456',
        '2026-02-20 11:50:00'
    ),
    -- Pagaments completats (reserves confirmades)
    (
        4,
        8,
        20.00,
        'targeta_debit',
        'completat',
        'PAY-EXT-20260223-D4E5F6',
        '2026-02-23 14:30:00'
    ),
    (
        5,
        9,
        14.00,
        'apple_pay',
        'completat',
        'APPLEPAY-20260223-RTY123',
        '2026-02-23 16:45:00'
    ),
    (
        6,
        10,
        6.00,
        'targeta_credit',
        'completat',
        'PAY-EXT-20260223-G7H8I9',
        '2026-02-23 18:00:00'
    ),
    -- Pagaments completats (reserves en curs)
    (
        7,
        11,
        35.00,
        'targeta_credit',
        'completat',
        'PAY-EXT-20260223-J1K2L3',
        '2026-02-23 05:50:00'
    ),
    (
        8,
        12,
        16.00,
        'paypal',
        'completat',
        'PAYPAL-20260223-ASD789',
        '2026-02-23 09:45:00'
    ),
    -- Pagaments reemborsats (reserves cancel·lades)
    (
        9,
        13,
        8.00,
        'targeta_credit',
        'reemborsat',
        'PAY-EXT-20260222-M4N5O6',
        '2026-02-22 13:50:00'
    ),
    (
        10,
        14,
        8.00,
        'paypal',
        'reemborsat',
        'PAYPAL-20260221-ZXC456',
        '2026-02-21 10:40:00'
    );
-- 18. FACTURES
INSERT INTO factures (
        pagament_id,
        usuari_id,
        numero_factura,
        import_subtotal,
        iva,
        import_total,
        data_emissio,
        pdf_url
    )
VALUES (
        1,
        5,
        'FACT-2026-000001',
        13.22,
        2.78,
        16.00,
        '2026-02-15',
        '/factures/2026/02/FACT-2026-000001.pdf'
    ),
    (
        2,
        6,
        'FACT-2026-000002',
        9.09,
        1.91,
        11.00,
        '2026-02-18',
        '/factures/2026/02/FACT-2026-000002.pdf'
    ),
    (
        3,
        7,
        'FACT-2026-000003',
        14.88,
        3.12,
        18.00,
        '2026-02-20',
        '/factures/2026/02/FACT-2026-000003.pdf'
    ),
    (
        4,
        8,
        'FACT-2026-000004',
        16.53,
        3.47,
        20.00,
        '2026-02-23',
        '/factures/2026/02/FACT-2026-000004.pdf'
    ),
    (
        5,
        9,
        'FACT-2026-000005',
        11.57,
        2.43,
        14.00,
        '2026-02-23',
        '/factures/2026/02/FACT-2026-000005.pdf'
    ),
    (
        6,
        10,
        'FACT-2026-000006',
        4.96,
        1.04,
        6.00,
        '2026-02-23',
        '/factures/2026/02/FACT-2026-000006.pdf'
    ),
    (
        7,
        11,
        'FACT-2026-000007',
        28.93,
        6.07,
        35.00,
        '2026-02-23',
        '/factures/2026/02/FACT-2026-000007.pdf'
    ),
    (
        8,
        12,
        'FACT-2026-000008',
        13.22,
        2.78,
        16.00,
        '2026-02-23',
        '/factures/2026/02/FACT-2026-000008.pdf'
    );
-- 19. CONTRIBUCIONS D'USUARIS
INSERT INTO contribucions (
        usuari_id,
        aparcament_id,
        tipus,
        estat_reportat,
        dades,
        validada,
        punts_guanyats,
        latitud,
        longitud
    )
VALUES (
        5,
        1,
        'disponibilitat',
        'parcial',
        '{"places_lliures_aproximades": 45, "comentari": "Planta -2 gairebé plena"}',
        TRUE,
        10,
        41.3851,
        2.1734
    ),
    (
        6,
        2,
        'foto',
        NULL,
        '{"url": "/uploads/contribucions/user6_parking2.jpg", "descripcio": "Foto actualitzada de l''entrada"}',
        TRUE,
        15,
        41.3879,
        2.1699
    ),
    (
        7,
        3,
        'informacio',
        NULL,
        '{"camp": "horari_tancament", "valor_nou": "23:00", "comentari": "Tanquen a les 23h, no 24h"}',
        FALSE,
        0,
        41.3917,
        2.1649
    ),
    (
        8,
        4,
        'disponibilitat',
        'lliure',
        '{"places_lliures_aproximades": 30}',
        TRUE,
        10,
        41.3888,
        2.1590
    ),
    (
        9,
        5,
        'correccio',
        NULL,
        '{"camp": "altura_maxima", "valor_actual": "2.00", "valor_correcte": "2.10", "comentari": "He mesurat l''altura amb el meu vehicle"}',
        TRUE,
        20,
        41.3797,
        2.1769
    ),
    (
        10,
        1,
        'disponibilitat',
        'ocupat',
        '{"comentari": "Completament ple a les 14h"}',
        TRUE,
        10,
        41.3851,
        2.1734
    ),
    (
        11,
        3,
        'foto',
        NULL,
        '{"url": "/uploads/contribucions/user11_parking3_seguretat.jpg", "descripcio": "Nova càmera de seguretat instal·lada"}',
        TRUE,
        15,
        41.3917,
        2.1649
    );
-- 20. RECOMPENSES (catàleg d'insignies i premis)
INSERT INTO recompenses (
        nom,
        descripcio,
        tipus,
        requisit_punts,
        valor,
        icona_url,
        activa
    )
VALUES (
        'Explorador Urbà',
        'Primer aparcament reservat amb èxit',
        'insignia',
        0,
        '{"badge_level": "bronze"}',
        '/icons/badges/explorador_urba.svg',
        TRUE
    ),
    (
        'Conductor Freqüent',
        'Més de 10 reserves completades',
        'insignia',
        100,
        '{"badge_level": "plata"}',
        '/icons/badges/conductor_frequent.svg',
        TRUE
    ),
    (
        'Expert en Mobilitat',
        'Més de 50 reserves i 5 contribucions validades',
        'insignia',
        500,
        '{"badge_level": "or"}',
        '/icons/badges/expert_mobilitat.svg',
        TRUE
    ),
    (
        'Col·laborador Actiu',
        'Més de 10 contribucions validades',
        'insignia',
        200,
        '{"badge_level": "especial"}',
        '/icons/badges/colaborador_actiu.svg',
        TRUE
    ),
    (
        '10% de descompte',
        'Descompte del 10% en la propera reserva',
        'descompte',
        50,
        '{"percentatge": 10, "max_us": 1, "validesa_dies": 30}',
        '/icons/rewards/descompte_10.svg',
        TRUE
    ),
    (
        '15% de descompte',
        'Descompte del 15% en la propera reserva',
        'descompte',
        150,
        '{"percentatge": 15, "max_us": 1, "validesa_dies": 30}',
        '/icons/rewards/descompte_15.svg',
        TRUE
    ),
    (
        'Premium 1 mes gratis',
        'Prova gratuïta d''1 mes de subscripció Premium',
        'premium_temporal',
        300,
        '{"dies": 30}',
        '/icons/rewards/premium_trial.svg',
        TRUE
    ),
    (
        '+50 punts extra',
        'Bonus de 50 punts de gamificació',
        'punts_extra',
        100,
        '{"punts": 50}',
        '/icons/rewards/bonus_punts.svg',
        TRUE
    );
-- 21. USUARIS-RECOMPENSES (recompenses obtingudes)
INSERT INTO usuaris_recompenses (
        usuari_id,
        recompensa_id,
        data_obtencio,
        utilitzada,
        data_utilitzacio
    )
VALUES (5, 1, '2025-03-02 10:15:00', FALSE, NULL),
    (5, 2, '2025-08-10 14:30:00', FALSE, NULL),
    (
        5,
        5,
        '2025-10-05 09:20:00',
        TRUE,
        '2025-10-12 11:00:00'
    ),
    (6, 1, '2026-02-01 12:00:00', FALSE, NULL),
    (6, 5, '2026-02-15 16:30:00', FALSE, NULL),
    (9, 1, '2025-12-20 08:45:00', FALSE, NULL),
    (9, 4, '2026-01-18 17:10:00', FALSE, NULL),
    (9, 6, '2026-02-10 10:50:00', FALSE, NULL),
    (12, 1, '2025-06-15 11:20:00', FALSE, NULL),
    (12, 2, '2025-11-22 15:40:00', FALSE, NULL),
    (
        12,
        7,
        '2026-01-05 09:00:00',
        TRUE,
        '2026-01-06 10:30:00'
    );
-- 22. ARTICLES DEL BLOG
INSERT INTO articles_blog (
        titol,
        slug,
        contingut,
        resum,
        autor_id,
        categoria,
        imatge_destacada,
        publicat,
        data_publicacio,
        visites
    )
VALUES (
        'Com estalviar temps cercant aparcament a Barcelona',
        'estalviar-temps-aparcament-barcelona',
        'Barcelona és una ciutat vibrant però trobar aparcament pot ser un repte diari. En aquest article et donem consells pràctics per optimitzar la teva cerca i estalviar temps valuós...',
        'Descobreix estratègies efectives per trobar aparcament ràpidament al centre de Barcelona',
        3,
        'consells',
        '/blog/images/barcelona-parking-tips.jpg',
        TRUE,
        '2026-02-10 10:00:00',
        342
    ),
    (
        'L''impacte de la mobilitat elèctrica als aparcaments urbans',
        'mobilitat-electrica-aparcaments-urbans',
        'L''augment de vehicles elèctrics està transformant els aparcaments urbans. Els punts de càrrega ja no són un luxe sinó una necessitat. Analitzem la situació actual a Catalunya...',
        'Com la mobilitat elèctrica està canviant els aparcaments a les ciutats catalanes',
        3,
        'sostenibilitat',
        '/blog/images/electric-charging.jpg',
        TRUE,
        '2026-02-05 09:30:00',
        287
    ),
    (
        'Novetats de Parklive: Reserva amb un clic',
        'novetats-parklive-reserva-rapida',
        'Estem emocionats d''anunciar la nova funcionalitat de reserva ràpida que permet als usuaris reservar una plaça en menys de 30 segons. Descobreix com funciona...',
        'Presentem la nova funcionalitat de reserva express de Parklive',
        3,
        'novetats',
        '/blog/images/reserva-rapida-feature.jpg',
        TRUE,
        '2026-02-18 11:00:00',
        521
    ),
    (
        '5 errors comuns en reservar aparcament online',
        '5-errors-comuns-reserva-aparcament',
        'Evita aquestes trampes habituals quan reserves aparcament per Internet: des de no llegir la lletra petita fins a oblidar confirmar l''horari...',
        'Guia per evitar els errors més freqüents en les reserves d''aparcament',
        3,
        'consells',
        '/blog/images/errors-reserva.jpg',
        TRUE,
        '2026-01-28 14:00:00',
        198
    ),
    (
        'El futur dels aparcaments intel·ligents',
        'futur-aparcaments-intelligents',
        'Sensors IoT, IA predictiva, gestió automatitzada... El futur dels aparcaments urbans és digital. Explorem les tendències tecnològiques que revolucionaran el sector...',
        'Tecnologies emergents que transformaran els aparcaments en els propers anys',
        3,
        'mobilitat',
        '/blog/images/smart-parking-future.jpg',
        FALSE,
        NULL,
        0
    );
-- 23. FAQS (Preguntes Freqüents)
INSERT INTO faqs (
        pregunta,
        resposta,
        categoria,
        ordre,
        activa,
        visites
    )
VALUES (
        'Com puc reservar una plaça d''aparcament?',
        'Per reservar una plaça, inicia sessió al teu compte, busca l''aparcament desitjat pel mapa o cercador, selecciona l''horari d''entrada i sortida, i completa el pagament. Rebràs un codi de reserva per correu electrònic.',
        'Reserves',
        1,
        TRUE,
        856
    ),
    (
        'Puc cancel·lar la meva reserva?',
        'Sí, pots cancel·lar la teva reserva fins a 2 hores abans de l''hora d''entrada prevista. La cancel·lació es fa des del teu panell d''usuari. El reemborsament es processa en un termini de 3-5 dies laborables.',
        'Reserves',
        2,
        TRUE,
        623
    ),
    (
        'Quins mètodes de pagament accepteu?',
        'Acceptem targetes de crèdit i dèbit (Visa, Mastercard, American Express), PayPal, Apple Pay i Google Pay. Tots els pagaments es processen de forma segura amb encriptació SSL.',
        'Pagaments',
        3,
        TRUE,
        541
    ),
    (
        'Què és la subscripció Premium?',
        'La subscripció Premium ofereix descomptes exclusius en reserves, accés prioritari a places, sense comissions de cancel·lació, i punts de gamificació x2. Disponible en plans mensual, trimestral i anual.',
        'Compte',
        4,
        TRUE,
        412
    ),
    (
        'Com funciona el sistema de punts?',
        'Guanyes punts per cada reserva completada, valoració deixada, o contribució validada. Els punts desbloquegen recompenses com descomptes, insignies i períodes Premium gratuïts.',
        'Gamificació',
        5,
        TRUE,
        387
    ),
    (
        'Què faig si no trobo el meu vehicle a la sortida?',
        'Contacta immediatament amb el telèfon d''atenció de l''aparcament (apareix a la teva reserva) i també amb el nostre equip de suport des de l''app. Gestionarem la incidència amb màxima prioritat.',
        'Incidències',
        6,
        TRUE,
        156
    ),
    (
        'Els aparcaments són segurs?',
        'Tots els aparcaments de la nostra xarxa compleixen amb normatives de seguretat, i la majoria disposen de videovigilància 24h, il·luminació adequada i personal de seguretat.',
        'Seguretat',
        7,
        TRUE,
        289
    ),
    (
        'Puc aparcar vehicles elèctrics?',
        'Molts dels nostres aparcaments ofereixen punts de càrrega per a vehicles elèctrics. Pots filtrar per aquesta característica al cercador. El cost de càrrega està detallat a cada aparcament.',
        'Serveis',
        8,
        TRUE,
        334
    ),
    (
        'Com puc contribuir amb informació sobre disponibilitat?',
        'Des de l''app mòbil, pots reportar l''estat de disponibilitat dels aparcaments en temps real. Les contribucions validades et donen punts de gamificació.',
        'Col·laboració',
        9,
        TRUE,
        178
    ),
    (
        'On puc descarregar l''aplicació mòbil?',
        'L''app de Parklive està disponible a l''App Store (iOS) i Google Play (Android). Cerca "Parklive" i descarrega-la gratuïtament. També pots usar la versió web des de qualsevol navegador.',
        'General',
        10,
        TRUE,
        712
    );
-- 24. NOTIFICACIONS
INSERT INTO notificacions (
        usuari_id,
        tipus,
        titol,
        missatge,
        llegida,
        url_accio,
        data_llegida
    )
VALUES -- Usuari 5
    (
        5,
        'confirmacio',
        'Reserva confirmada',
        'La teva reserva RES-2026-000001 per al Parking Plaça Catalunya ha estat confirmada. T''esperem el 15/02/2026 a les 10:00h.',
        TRUE,
        '/reserves/1',
        '2026-02-15 09:57:00'
    ),
    (
        5,
        'info',
        'Nou article al blog',
        'Hem publicat un nou article: "Com estalviar temps cercant aparcament a Barcelona". Llegeix-lo ara!',
        FALSE,
        '/blog/estalviar-temps-aparcament-barcelona',
        NULL
    ),
    -- Usuari 6
    (
        6,
        'confirmacio',
        'Reserva confirmada',
        'Reserva RES-2026-000002 confirmada correctament. Aparcament Les Corts t''espera el 18/02/2026.',
        TRUE,
        '/reserves/2',
        '2026-02-18 08:22:00'
    ),
    (
        6,
        'promocio',
        'Descompte exclusiu: 15% OFF',
        'Com a usuari Premium, tens un 15% de descompte en la teva propera reserva. Codi: PREMIUM15. Vàlid fins al 28/02/2026.',
        FALSE,
        '/promocions',
        NULL
    ),
    -- Usuari 7
    (
        7,
        'confirmacio',
        'Reserva finalitzada',
        'Gràcies per usar Parklive! La teva reserva RES-2026-000003 s''ha finalitzat. Valora la teva experiència i guanya punts.',
        TRUE,
        '/valoracions/nova?aparcament=3',
        '2026-02-20 20:15:00'
    ),
    -- Usuari 8
    (
        8,
        'confirmacio',
        'Pagament processat',
        'El pagament de 20,00€ per la reserva RES-2026-000004 s''ha completat amb èxit.',
        TRUE,
        '/pagaments/4',
        '2026-02-23 14:32:00'
    ),
    (
        8,
        'alerta',
        'Reserva demà',
        'Recordatori: Tens una reserva demà 25/02 a les 9:00h al Parking Plaça Catalunya. Codi: RES-2026-000004.',
        FALSE,
        '/reserves/4',
        NULL
    ),
    -- Usuari 9
    (
        9,
        'confirmacio',
        'Has guanyat una recompensa!',
        'Felicitats! Has desbloquejat la insignia "Col·laborador Actiu" per les teves contribucions. +20 punts!',
        TRUE,
        '/recompenses',
        '2026-01-18 17:12:00'
    ),
    -- Usuari 11
    (
        11,
        'info',
        'Reserva en curs',
        'La teva reserva RES-2026-000007 està en curs. Recorda que finalitza avui a les 23:59h.',
        FALSE,
        '/reserves/7',
        NULL
    ),
    -- Usuari 12
    (
        12,
        'sistema',
        'Renovació Premium',
        'La teva subscripció Premium Anual es renovarà automàticament el 10/06/2026. Preu: 59,99€.',
        FALSE,
        '/subscripcions',
        NULL
    ),
    -- Usuari 13
    (
        13,
        'confirmacio',
        'Reemborsament processat',
        'El reemborsament de 8,00€ de la reserva cancel·lada RES-2026-000009 s''ha processat. Rebràs els diners en 3-5 dies.',
        TRUE,
        '/pagaments/9',
        '2026-02-22 16:00:00'
    );
-- 25. MISSATGES DE SUPORT
INSERT INTO missatges_suport (
        usuari_id,
        nom,
        email,
        assumpte,
        missatge,
        categoria,
        estat,
        prioritat
    )
VALUES (
        8,
        'Marc Solà',
        'marc.sola@email.com',
        'Problema amb el lector de matrícules',
        'Avui al matí (23/02) he tingut problemes per entrar al Parking Diagonal amb el meu codi de reserva. El lector no reconeixia la matrícula i he hagut d''esperar 10 minuts fins que algú m''ha obert manualment.',
        'tecnic',
        'en_proces',
        'alta'
    ),
    (
        NULL,
        'Laura Vidal',
        'laura.vidal@email.com',
        'Consulta sobre subscripció Premium',
        'Voldria saber si amb la subscripció Premium puc cancel·lar reserves sense penalització i quins descomptes ofereix exactament. Gràcies!',
        'general',
        'resolt',
        'baixa'
    ),
    (
        13,
        'Jordi Martínez',
        'jordi.martinez@email.com',
        'Sol·licitud de factura duplicada',
        'Necessito una còpia de la factura FACT-2026-000009 per a la meva empresa. Podeu reenviar-la al meu correu? Gràcies.',
        'pagament',
        'resolt',
        'mitjana'
    ),
    (
        10,
        'Anna Puig',
        'anna.puig@email.com',
        'No puc modificar el meu perfil',
        'Intento canviar el meu número de telèfon al perfil però em surt un error "503 Service Unavailable". Ho he provat diverses vegades.',
        'compte',
        'pendent',
        'mitjana'
    ),
    (
        NULL,
        'Carles Font',
        'carles.font@email.com',
        'Suggeriment: afegir més aparcaments a Girona',
        'Sóc usuari habitual a Barcelona però vivint a Girona. Seria genial tenir més opcions d''aparcament a la ciutat. Hi ha plans d''expansió?',
        'altres',
        'pendent',
        'baixa'
    ),
    (
        14,
        'Marta Roca',
        'marta.roca@email.com',
        'Cancel·lació de subscripció',
        'Vull cancel·lar la meva subscripció mensual. Com puc fer-ho des de l''app? No trobo l''opció al menú.',
        'compte',
        'resolt',
        'mitjana'
    );
-- 26. CONFIGURACIÓ DEL SISTEMA
INSERT INTO configuracio_sistema (clau, valor, tipus, descripcio)
VALUES (
        'app_name',
        'Parklive',
        'string',
        'Nom de l''aplicació'
    ),
    (
        'app_version',
        '2.4.1',
        'string',
        'Versió actual de l''aplicació'
    ),
    (
        'maintenance_mode',
        'false',
        'boolean',
        'Mode de manteniment activat'
    ),
    (
        'max_reserves_per_user',
        '10',
        'number',
        'Nombre màxim de reserves actives per usuari'
    ),
    (
        'cancel_hours_before',
        '2',
        'number',
        'Hores mínimes abans de l''entrada per cancel·lar sense penalització'
    ),
    (
        'punts_per_reserva',
        '10',
        'number',
        'Punts de gamificació per reserva completada'
    ),
    (
        'punts_per_valoracio',
        '5',
        'number',
        'Punts de gamificació per valoració deixada'
    ),
    (
        'punts_per_contribucio',
        '10',
        'number',
        'Punts base per contribució validada'
    ),
    (
        'iva_percentatge',
        '21',
        'number',
        'Percentatge d''IVA aplicable'
    ),
    (
        'descompte_premium',
        '10',
        'number',
        'Percentatge de descompte per a usuaris Premium'
    ),
    (
        'email_suport',
        'suport@parklive.cat',
        'string',
        'Correu electrònic de suport'
    ),
    (
        'telefon_suport',
        '+34 932 000 000',
        'string',
        'Telèfon d''atenció al client'
    ),
    (
        'max_foto_size_mb',
        '5',
        'number',
        'Mida màxima de fitxer de foto en MB'
    ),
    (
        'session_timeout_minutes',
        '120',
        'number',
        'Temps d''expiració de sessió en minuts'
    ),
    (
        'enable_gamification',
        'true',
        'boolean',
        'Sistema de gamificació activat'
    ),
    (
        'enable_notifications_push',
        'true',
        'boolean',
        'Notificacions push activades'
    ),
    (
        'google_maps_api_key',
        'AIzaSyXXXXXXXXXXXXXXXXXXXXXX',
        'string',
        'Clau API de Google Maps'
    ),
    (
        'stripe_public_key',
        'pk_test_XXXXXXXXXXXXXXXX',
        'string',
        'Clau pública de Stripe per pagaments'
    ),
    (
        'featured_parkings',
        '[1, 3, 5]',
        'json',
        'IDs dels aparcaments destacats a la pàgina principal'
    ),
    (
        'working_hours',
        '{"start": "06:00", "end": "22:00"}',
        'json',
        'Horari d''atenció al client'
    );