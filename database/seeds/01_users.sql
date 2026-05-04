-- 1. USUARIS (20 usuaris de diferents tipus)
-- Nota: Contrasenyes són totes "Password123!"
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
        stripe_customer_id,
        data_registre,
        ultima_connexio
    )
VALUES -- Administradors
    (
        1,
        'Admin',
        'Sistema',
        'admin@parklive.cat',
        '$2y$10$kXkjFHEsOPrQLwJq1lYs7uBuSaY3Fn0s4QVscqMcVNXG/TwwHocb.',
        '934567890',
        'admin',
        'actiu',
        TRUE,
        0,
        'cus_test_001',
        '2024-01-01 10:00:00',
        NOW()
    ),
    (
        2,
        'Maria',
        'Administradora',
        'maria.admin@parklive.cat',
        '$2y$10$kXkjFHEsOPrQLwJq1lYs7uBuSaY3Fn0s4QVscqMcVNXG/TwwHocb.',
        '934567891',
        'admin',
        'actiu',
        TRUE,
        0,
        'cus_test_002',
        '2024-01-15 10:00:00',
        NOW()
    ),
    -- Operadors de pàrquings
    (
        3,
        'Operador',
        'Parking BCN',
        'operador@parkingbcn.com',
        '$2y$10$kXkjFHEsOPrQLwJq1lYs7uBuSaY3Fn0s4QVscqMcVNXG/TwwHocb.',
        '935678901',
        'operador',
        'actiu',
        TRUE,
        0,
        'cus_test_003',
        '2024-02-01 10:00:00',
        NOW()
    ),
    (
        4,
        'Carles',
        'Gestió Aparcaments',
        'carles@saba.es',
        '$2y$10$kXkjFHEsOPrQLwJq1lYs7uBuSaY3Fn0s4QVscqMcVNXG/TwwHocb.',
        '935678902',
        'operador',
        'actiu',
        TRUE,
        0,
        'cus_test_004',
        '2024-02-15 10:00:00',
        NOW()
    ),
    -- Usuaris Premium
    (
        5,
        'Joan',
        'García López',
        'joan.garcia@gmail.com',
        '$2y$10$kXkjFHEsOPrQLwJq1lYs7uBuSaY3Fn0s4QVscqMcVNXG/TwwHocb.',
        '666123456',
        'premium',
        'actiu',
        TRUE,
        450,
        'cus_test_005',
        '2024-06-01 10:00:00',
        NOW()
    ),
    (
        6,
        'Laura',
        'Martínez Sanz',
        'laura.martinez@hotmail.com',
        '$2y$10$kXkjFHEsOPrQLwJq1lYs7uBuSaY3Fn0s4QVscqMcVNXG/TwwHocb.',
        '666234567',
        'premium',
        'actiu',
        TRUE,
        780,
        'cus_test_006',
        '2024-07-10 10:00:00',
        NOW()
    ),
    (
        7,
        'David',
        'Fernández Costa',
        'david.fernandez@outlook.com',
        '$2y$10$kXkjFHEsOPrQLwJq1lYs7uBuSaY3Fn0s4QVscqMcVNXG/TwwHocb.',
        '666345678',
        'premium',
        'actiu',
        TRUE,
        1200,
        'cus_test_007',
        '2024-05-20 10:00:00',
        NOW()
    ),
    (
        8,
        'Anna',
        'Rodríguez Pons',
        'anna.rodriguez@gmail.com',
        '$2y$10$kXkjFHEsOPrQLwJq1lYs7uBuSaY3Fn0s4QVscqMcVNXG/TwwHocb.',
        '666456789',
        'premium',
        'actiu',
        TRUE,
        320,
        'cus_test_008',
        '2024-08-15 10:00:00',
        NOW()
    ),
    -- Usuaris Bàsics
    (
        9,
        'Marc',
        'Sánchez Vila',
        'marc.sanchez@gmail.com',
        '$2y$10$kXkjFHEsOPrQLwJq1lYs7uBuSaY3Fn0s4QVscqMcVNXG/TwwHocb.',
        '677123456',
        'basic',
        'actiu',
        TRUE,
        150,
        'cus_test_009',
        '2024-09-01 10:00:00',
        NOW()
    ),
    (
        10,
        'Marta',
        'López Ortiz',
        'marta.lopez@yahoo.es',
        '$2y$10$kXkjFHEsOPrQLwJq1lYs7uBuSaY3Fn0s4QVscqMcVNXG/TwwHocb.',
        '677234567',
        'basic',
        'actiu',
        TRUE,
        90,
        'cus_test_010',
        '2024-09-15 10:00:00',
        NOW()
    ),
    (
        11,
        'Pere',
        'González Ruiz',
        'pere.gonzalez@gmail.com',
        '$2y$10$kXkjFHEsOPrQLwJq1lYs7uBuSaY3Fn0s4QVscqMcVNXG/TwwHocb.',
        '677345678',
        'basic',
        'actiu',
        TRUE,
        210,
        'cus_test_011',
        '2024-10-01 10:00:00',
        NOW()
    ),
    (
        12,
        'Sara',
        'Pérez Molina',
        'sara.perez@hotmail.com',
        '$2y$10$kXkjFHEsOPrQLwJq1lYs7uBuSaY3Fn0s4QVscqMcVNXG/TwwHocb.',
        '677456789',
        'basic',
        'actiu',
        TRUE,
        60,
        'cus_test_012',
        '2024-10-20 10:00:00',
        NOW()
    ),
    (
        13,
        'Jordi',
        'Martí Soler',
        'jordi.marti@gmail.com',
        '$2y$10$kXkjFHEsOPrQLwJq1lYs7uBuSaY3Fn0s4QVscqMcVNXG/TwwHocb.',
        '688123456',
        'basic',
        'actiu',
        TRUE,
        340,
        'cus_test_013',
        '2024-08-05 10:00:00',
        NOW()
    ),
    (
        14,
        'Cristina',
        'Romero Vidal',
        'cristina.romero@gmail.com',
        '$2y$10$kXkjFHEsOPrQLwJq1lYs7uBuSaY3Fn0s4QVscqMcVNXG/TwwHocb.',
        '688234567',
        'basic',
        'actiu',
        TRUE,
        180,
        'cus_test_014',
        '2024-11-01 10:00:00',
        NOW()
    ),
    (
        15,
        'Albert',
        'Torres Navarro',
        'albert.torres@outlook.com',
        '$2y$10$kXkjFHEsOPrQLwJq1lYs7uBuSaY3Fn0s4QVscqMcVNXG/TwwHocb.',
        '688345678',
        'basic',
        'actiu',
        TRUE,
        420,
        'cus_test_015',
        '2024-07-25 10:00:00',
        NOW()
    ),
    (
        16,
        'Núria',
        'Giménez Ramos',
        'nuria.gimenez@gmail.com',
        '$2y$10$kXkjFHEsOPrQLwJq1lYs7uBuSaY3Fn0s4QVscqMcVNXG/TwwHocb.',
        '688456789',
        'basic',
        'actiu',
        FALSE,
        30,
        'cus_test_016',
        '2025-01-10 10:00:00',
        NOW()
    ),
    (
        17,
        'Pau',
        'Vázquez Ibáñez',
        'pau.vazquez@gmail.com',
        '$2y$10$kXkjFHEsOPrQLwJq1lYs7uBuSaY3Fn0s4QVscqMcVNXG/TwwHocb.',
        '699123456',
        'basic',
        'actiu',
        TRUE,
        110,
        'cus_test_017',
        '2024-12-01 10:00:00',
        NOW()
    ),
    (
        18,
        'Elena',
        'Jiménez Castro',
        'elena.jimenez@yahoo.es',
        '$2y$10$kXkjFHEsOPrQLwJq1lYs7uBuSaY3Fn0s4QVscqMcVNXG/TwwHocb.',
        '699234567',
        'basic',
        'actiu',
        TRUE,
        270,
        'cus_test_018',
        '2024-09-20 10:00:00',
        NOW()
    ),
    (
        19,
        'Raül',
        'Moreno Serrano',
        'raul.moreno@gmail.com',
        '$2y$10$kXkjFHEsOPrQLwJq1lYs7uBuSaY3Fn0s4QVscqMcVNXG/TwwHocb.',
        '699345678',
        'basic',
        'inactiu',
        TRUE,
        50,
        'cus_test_019',
        '2024-06-15 10:00:00',
        '2024-12-01 10:00:00'
    ),
    (
        20,
        'Montse',
        'Rubio Gil',
        'montse.rubio@hotmail.com',
        '$2y$10$kXkjFHEsOPrQLwJq1lYs7uBuSaY3Fn0s4QVscqMcVNXG/TwwHocb.',
        '699456789',
        'basic',
        'actiu',
        TRUE,
        390,
        'cus_test_020',
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
        auto_renovacio,
        stripe_subscription_id
    )
VALUES (
        5,
        'mensual',
        'activa',
        '2025-01-01',
        '2025-02-01',
        9.99,
        'targeta',
        TRUE,
        'sub_test_001'
    ),
    (
        6,
        'trimestral',
        'activa',
        '2024-11-01',
        '2025-02-01',
        25.99,
        'paypal',
        TRUE,
        'sub_test_002'
    ),
    (
        7,
        'anual',
        'activa',
        '2024-05-20',
        '2025-05-20',
        89.99,
        'targeta',
        TRUE,
        'sub_test_003'
    ),
    (
        8,
        'mensual',
        'activa',
        '2024-12-15',
        '2025-01-15',
        9.99,
        'targeta',
        FALSE,
        'sub_test_004'
    );

-- 3. SESSIONS (exemples de sessions actives)
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

-- 4. CODIS DE RESET CONTRASENYA
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

-- 5. SUBSCRIPCIONS PREMIUM (Batch 2)
INSERT INTO subscripcions (
        usuari_id,
        tipus,
        estat,
        data_inici,
        data_final,
        preu,
        metode_pagament,
        auto_renovacio,
        stripe_subscription_id
    )
VALUES (
        5,
        'anual',
        'activa',
        '2025-03-01',
        '2026-03-01',
        59.99,
        'targeta',
        TRUE,
        'sub_test_005'
    ),
    (
        6,
        'mensual',
        'activa',
        '2026-02-01',
        '2026-03-01',
        6.99,
        'paypal',
        TRUE,
        'sub_test_006'
    ),
    (
        9,
        'trimestral',
        'activa',
        '2025-12-15',
        '2026-03-15',
        17.99,
        'targeta',
        FALSE,
        'sub_test_007'
    ),
    (
        12,
        'anual',
        'activa',
        '2025-06-10',
        '2026-06-10',
        59.99,
        'targeta',
        TRUE,
        'sub_test_008'
    ),
    (
        14,
        'mensual',
        'cancelada',
        '2026-01-05',
        '2026-02-05',
        6.99,
        'paypal',
        FALSE,
        'sub_test_009'
    );
