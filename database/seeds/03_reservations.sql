-- Arxiu: 03_reservations.sql
-- Descripció: Aquest arxiu conté sentències (INSERT) per poblar inicialment la base de dades amb dades fictícies de prova.

-- 1. RESERVES
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
    (1, 5, 1, '2025-01-20 10:00:00', '2025-01-20 14:00:00', 'completada', 14.00, 0.00, 'PLV-2025-000001', 'Reserva completada satisfactòriament'),
    (2, 6, 4, '2025-01-22 09:00:00', '2025-01-22 18:00:00', 'completada', 27.00, 3.00, 'PLV-2025-000002', 'Descompte aplicat per ser usuari premium'),
    (3, 7, 6, '2025-01-23 15:00:00', '2025-01-23 20:00:00', 'completada', 12.50, 0.00, 'PLV-2025-000003', NULL),
    -- Reserves confirmades (futures propers)
    (4, 5, 1, NOW() + INTERVAL 1 DAY, NOW() + INTERVAL 1 DAY + INTERVAL 4 HOUR, 'confirmada', 14.00, 0.00, 'PLV-2025-000004', 'Matí de demà'),
    (5, 6, 13, NOW() + INTERVAL 2 DAY, NOW() + INTERVAL 2 DAY + INTERVAL 4 HOUR, 'confirmada', 11.20, 0.00, 'PLV-2025-000005', 'Prop de Sants Estació'),
    (6, 7, 8, NOW() + INTERVAL 3 DAY, NOW() + INTERVAL 3 DAY + INTERVAL 4 HOUR, 'confirmada', 11.20, 0.00, 'PLV-2025-000006', 'Event a la Fira'),
    (7, 8, 3, NOW() + INTERVAL 4 DAY, NOW() + INTERVAL 4 DAY + INTERVAL 4 HOUR, 'confirmada', 18.00, 0.00, 'PLV-2025-000007', 'Reunió a Passeig de Gràcia'),
    -- Reserves en curs (durada d'un any per a tests d'ocupació)
    (8, 5, 6, NOW(), DATE_ADD(NOW(), INTERVAL 1 YEAR), 'en_curs', 7.50, 0.00, 'PLV-2025-000008', 'Reserva de llarga durada per test'),
    -- Reserves cancel·lades
    (9, 6, 1, '2025-01-25 10:00:00', '2025-01-25 14:00:00', 'cancelada', 14.00, 0.00, 'PLV-2025-000009', 'Cancel·lada per l''usuari');

-- Batch 2 RESERVES
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
    (5, 1, '2026-02-15 10:00:00', '2026-02-15 18:00:00', 'completada', 16.00, 0.00, 'RES-2026-000001', 'Reserva sense incidències'),
    (6, 2, '2026-02-18 08:30:00', '2026-02-18 14:00:00', 'completada', 11.00, 1.00, 'RES-2026-000002', 'Aplicat descompte premium'),
    (7, 3, '2026-02-20 12:00:00', '2026-02-20 20:00:00', 'completada', 18.00, 0.00, 'RES-2026-000003', NULL),
    -- Reserves confirmades (futures)
    (8, 1, NOW() + INTERVAL 5 DAY, NOW() + INTERVAL 5 DAY + INTERVAL 10 HOUR, 'confirmada', 20.00, 0.00, 'RES-2026-000004', 'Reserva per jornada de treball'),
    (9, 4, NOW() + INTERVAL 6 DAY, NOW() + INTERVAL 6 DAY + INTERVAL 7 HOUR, 'confirmada', 14.00, 2.00, 'RES-2026-000005', 'Aplicat codi promocional WELCOME10'),
    (10, 5, NOW() + INTERVAL 7 DAY, NOW() + INTERVAL 7 DAY + INTERVAL 3 HOUR, 'confirmada', 6.00, 0.00, 'RES-2026-000006', NULL),
    -- Reserves en curs (durada d'un any)
    (11, 2, NOW(), DATE_ADD(NOW(), INTERVAL 1 YEAR), 'en_curs', 35.00, 0.00, 'RES-2026-000007', 'Reserva de dia sencer - Test un any'),
    (12, 3, NOW(), DATE_ADD(NOW(), INTERVAL 1 YEAR), 'en_curs', 16.00, 1.50, 'RES-2026-000008', 'Descompte usuari premium - Test un any'),
    -- Reserves cancel·lades
    (13, 1, '2026-02-22 14:00:00', '2026-02-22 18:00:00', 'cancelada', 8.00, 0.00, 'RES-2026-000009', 'Cancel·lada per l''usuari'),
    (14, 4, '2026-02-21 11:00:00', '2026-02-21 15:00:00', 'cancelada', 8.00, 0.00, 'RES-2026-000010', 'Canvi de plans');

-- Batch 3 - Cobertura de tots els aparcaments (Test Ocupació 1 any)
INSERT INTO reserves (usuari_id, aparcament_id, data_entrada, data_sortida, estat, preu_total, descompte_aplicat, codi_reserva, notes)
VALUES 
    (15, 7, NOW(), DATE_ADD(NOW(), INTERVAL 1 YEAR), 'en_curs', 20.00, 0.00, 'RES-YEAR-P7', 'Ocupació test Parking 7'),
    (16, 9, NOW(), DATE_ADD(NOW(), INTERVAL 1 YEAR), 'en_curs', 24.00, 0.00, 'RES-YEAR-P9', 'Ocupació test Parking 9'),
    (17, 10, NOW(), DATE_ADD(NOW(), INTERVAL 1 YEAR), 'en_curs', 26.00, 0.00, 'RES-YEAR-P10', 'Ocupació test Parking 10'),
    (18, 11, NOW(), DATE_ADD(NOW(), INTERVAL 1 YEAR), 'en_curs', 30.00, 0.00, 'RES-YEAR-P11', 'Ocupació test Parking 11'),
    (19, 12, NOW(), DATE_ADD(NOW(), INTERVAL 1 YEAR), 'en_curs', 22.00, 0.00, 'RES-YEAR-P12', 'Ocupació test Parking 12'),
    (20, 14, NOW(), DATE_ADD(NOW(), INTERVAL 1 YEAR), 'en_curs', 40.00, 0.00, 'RES-YEAR-P14', 'Ocupació test Parking 14'),
    (5, 15, NOW(), DATE_ADD(NOW(), INTERVAL 1 YEAR), 'en_curs', 12.00, 0.00, 'RES-YEAR-P15', 'Ocupació test Parking 15'),
    (6, 16, NOW(), DATE_ADD(NOW(), INTERVAL 1 YEAR), 'en_curs', 30.00, 0.00, 'RES-YEAR-P16', 'Ocupació test Parking 16'),
    (7, 16, NOW(), DATE_ADD(NOW(), INTERVAL 1 YEAR), 'en_curs', 30.00, 0.00, 'RES-YEAR-P16-2', 'Ocupació test Parking 16'),
    (8, 16, NOW(), DATE_ADD(NOW(), INTERVAL 1 YEAR), 'en_curs', 30.00, 0.00, 'RES-YEAR-P16-3', 'Ocupació test Parking 16'),
    (7, 17, NOW(), DATE_ADD(NOW(), INTERVAL 1 YEAR), 'en_curs', 18.00, 0.00, 'RES-YEAR-P17', 'Ocupació test Parking 17'),
    (9, 17, NOW(), DATE_ADD(NOW(), INTERVAL 1 YEAR), 'en_curs', 18.00, 0.00, 'RES-YEAR-P17-2', 'Ocupació test Parking 17'),
    -- Simulació d'ocupació alta per a P1 (Plaça Catalunya) per a tests (50 places ocupades ara)
    (5, 1, DATE_SUB(NOW(), INTERVAL 1 HOUR), DATE_ADD(NOW(), INTERVAL 23 HOUR), 'en_curs', 25.00, 0.00, 'RES-OCC-P1-1', 'Alta ocupació P1'),
    (6, 1, DATE_SUB(NOW(), INTERVAL 2 HOUR), DATE_ADD(NOW(), INTERVAL 22 HOUR), 'en_curs', 25.00, 0.00, 'RES-OCC-P1-2', 'Alta ocupació P1'),
    (7, 1, DATE_SUB(NOW(), INTERVAL 3 HOUR), DATE_ADD(NOW(), INTERVAL 21 HOUR), 'en_curs', 25.00, 0.00, 'RES-OCC-P1-3', 'Alta ocupació P1'),
    -- Simulació d'ocupació per a P4 (Sagrada Família)
    (8, 4, DATE_SUB(NOW(), INTERVAL 1 HOUR), DATE_ADD(NOW(), INTERVAL 5 HOUR), 'en_curs', 15.00, 0.00, 'RES-OCC-P4-1', 'Ocupació real P4'),
    -- Exemples addicionals per parkings que ja en tenien però per reforçar el "més d'un exemple"
    (8, 1, DATE_ADD(NOW(), INTERVAL 1 MONTH), DATE_ADD(NOW(), INTERVAL 2 MONTH), 'confirmada', 50.00, 0.00, 'RES-EXTRA-P1', 'Reserva futura P1'),
    (9, 2, DATE_ADD(NOW(), INTERVAL 2 MONTH), DATE_ADD(NOW(), INTERVAL 3 MONTH), 'confirmada', 45.00, 0.00, 'RES-EXTRA-P2', 'Reserva futura P2'),
    (10, 3, DATE_ADD(NOW(), INTERVAL 3 MONTH), DATE_ADD(NOW(), INTERVAL 4 MONTH), 'confirmada', 60.00, 0.00, 'RES-EXTRA-P3', 'Reserva futura P3'),
    (11, 4, DATE_ADD(NOW(), INTERVAL 4 MONTH), DATE_ADD(NOW(), INTERVAL 5 MONTH), 'confirmada', 35.00, 0.00, 'RES-EXTRA-P4', 'Reserva futura P4'),
    (12, 5, DATE_ADD(NOW(), INTERVAL 5 MONTH), DATE_ADD(NOW(), INTERVAL 6 MONTH), 'confirmada', 25.00, 0.00, 'RES-EXTRA-P5', 'Reserva futura P5'),
    (13, 6, DATE_ADD(NOW(), INTERVAL 6 MONTH), DATE_ADD(NOW(), INTERVAL 7 MONTH), 'confirmada', 40.00, 0.00, 'RES-EXTRA-P6', 'Reserva futura P6'),
    (14, 8, DATE_ADD(NOW(), INTERVAL 7 MONTH), DATE_ADD(NOW(), INTERVAL 8 MONTH), 'confirmada', 55.00, 0.00, 'RES-EXTRA-P8', 'Reserva futura P8'),
    (15, 13, DATE_ADD(NOW(), INTERVAL 8 MONTH), DATE_ADD(NOW(), INTERVAL 9 MONTH), 'confirmada', 30.00, 0.00, 'RES-EXTRA-P13', 'Reserva futura P13');

-- Batch 4 - Simulació massiva de dades (30+ reserves addicionals)
INSERT INTO reserves (usuari_id, aparcament_id, data_entrada, data_sortida, estat, preu_total, descompte_aplicat, codi_reserva, notes)
VALUES 
    -- P1 (Centre BCN) - Molta demanda
    (5, 1, DATE_ADD(NOW(), INTERVAL 10 DAY), DATE_ADD(NOW(), INTERVAL 11 DAY), 'confirmada', 25.00, 0.00, 'RES-M-P1-1', 'Test demanda P1'),
    (6, 1, DATE_ADD(NOW(), INTERVAL 12 DAY), DATE_ADD(NOW(), INTERVAL 13 DAY), 'confirmada', 25.00, 0.00, 'RES-M-P1-2', 'Test demanda P1'),
    (7, 1, DATE_ADD(NOW(), INTERVAL 14 DAY), DATE_ADD(NOW(), INTERVAL 15 DAY), 'confirmada', 25.00, 0.00, 'RES-M-P1-3', 'Test demanda P1'),
    -- P4 (Sagrada Família) - Turisme
    (8, 4, DATE_ADD(NOW(), INTERVAL 1 WEEK), DATE_ADD(NOW(), INTERVAL 2 WEEK), 'confirmada', 40.00, 5.00, 'RES-M-P4-1', 'Test turisme P4'),
    (9, 4, DATE_ADD(NOW(), INTERVAL 3 WEEK), DATE_ADD(NOW(), INTERVAL 4 WEEK), 'confirmada', 40.00, 0.00, 'RES-M-P4-2', 'Test turisme P4'),
    -- P6 (Port Olímpic) - Oci
    (10, 6, DATE_ADD(NOW(), INTERVAL 1 MONTH), NOW() + INTERVAL 1 MONTH + INTERVAL 1 DAY, 'confirmada', 18.00, 0.00, 'RES-M-P6-1', 'Test oci P6'),
    (11, 6, NOW() + INTERVAL 1 MONTH + INTERVAL 5 DAY, NOW() + INTERVAL 1 MONTH + INTERVAL 6 DAY, 'confirmada', 18.00, 0.00, 'RES-M-P6-2', 'Test oci P6'),
    -- P13 (Sants) - Viatges
    (12, 13, DATE_ADD(NOW(), INTERVAL 2 DAY), DATE_ADD(NOW(), INTERVAL 5 DAY), 'confirmada', 60.00, 10.00, 'RES-M-P13-1', 'Test viatges P13'),
    (13, 13, DATE_ADD(NOW(), INTERVAL 10 DAY), DATE_ADD(NOW(), INTERVAL 15 DAY), 'confirmada', 100.00, 0.00, 'RES-M-P13-2', 'Test viatges P13'),
    -- P8 (Fira) - Esdeveniments
    (14, 8, DATE_ADD(NOW(), INTERVAL 2 MONTH), NOW() + INTERVAL 2 MONTH + INTERVAL 3 DAY, 'confirmada', 45.00, 0.00, 'RES-M-P8-1', 'Test fira P8'),
    (15, 8, DATE_ADD(NOW(), INTERVAL 3 MONTH), NOW() + INTERVAL 3 MONTH + INTERVAL 3 DAY, 'confirmada', 45.00, 0.00, 'RES-M-P8-2', 'Test fira P8'),
    -- P2 (Eixample)
    (16, 2, DATE_ADD(NOW(), INTERVAL 5 DAY), DATE_ADD(NOW(), INTERVAL 6 DAY), 'confirmada', 28.00, 0.00, 'RES-M-P2-1', 'Test Eixample'),
    (17, 2, DATE_ADD(NOW(), INTERVAL 15 DAY), DATE_ADD(NOW(), INTERVAL 16 DAY), 'confirmada', 28.00, 0.00, 'RES-M-P2-2', 'Test Eixample'),
    -- P3 (Passeig Gràcia)
    (18, 3, DATE_ADD(NOW(), INTERVAL 1 WEEK), DATE_ADD(NOW(), INTERVAL 2 WEEK), 'confirmada', 32.00, 0.00, 'RES-M-P3-1', 'Test Lujo'),
    (19, 3, DATE_ADD(NOW(), INTERVAL 3 WEEK), DATE_ADD(NOW(), INTERVAL 4 WEEK), 'confirmada', 32.00, 0.00, 'RES-M-P3-2', 'Test Lujo'),
    -- Parkings variats per omplir buits
    (20, 5, DATE_ADD(NOW(), INTERVAL 1 MONTH), NOW() + INTERVAL 1 MONTH + INTERVAL 1 WEEK, 'confirmada', 18.00, 0.00, 'RES-M-P5-1', 'Fill data'),
    (5, 7, DATE_ADD(NOW(), INTERVAL 2 MONTH), NOW() + INTERVAL 2 MONTH + INTERVAL 2 DAY, 'confirmada', 30.00, 0.00, 'RES-M-P7-1', 'Fill data'),
    (6, 9, DATE_ADD(NOW(), INTERVAL 1 MONTH), NOW() + INTERVAL 1 MONTH + INTERVAL 3 DAY, 'confirmada', 40.00, 0.00, 'RES-M-P9-1', 'Fill data'),
    (7, 10, DATE_ADD(NOW(), INTERVAL 5 DAY), DATE_ADD(NOW(), INTERVAL 8 DAY), 'confirmada', 50.00, 0.00, 'RES-M-P10-1', 'Fill data'),
    (8, 11, DATE_ADD(NOW(), INTERVAL 2 WEEK), DATE_ADD(NOW(), INTERVAL 3 WEEK), 'confirmada', 60.00, 0.00, 'RES-M-P11-1', 'Fill data'),
    (9, 12, DATE_ADD(NOW(), INTERVAL 1 MONTH), DATE_ADD(NOW(), INTERVAL 2 MONTH), 'confirmada', 100.00, 20.00, 'RES-M-P12-1', 'Fill data'),
    (10, 14, DATE_ADD(NOW(), INTERVAL 2 MONTH), DATE_ADD(NOW(), INTERVAL 3 MONTH), 'confirmada', 150.00, 0.00, 'RES-M-P14-1', 'Fill data'),
    (11, 15, DATE_ADD(NOW(), INTERVAL 1 WEEK), DATE_ADD(NOW(), INTERVAL 2 WEEK), 'confirmada', 24.00, 0.00, 'RES-M-P15-1', 'Fill data'),
    (12, 16, DATE_ADD(NOW(), INTERVAL 3 MONTH), DATE_ADD(NOW(), INTERVAL 4 MONTH), 'confirmada', 90.00, 0.00, 'RES-M-P16-1', 'Fill data'),
    (13, 17, DATE_ADD(NOW(), INTERVAL 1 MONTH), DATE_ADD(NOW(), INTERVAL 2 MONTH), 'confirmada', 36.00, 0.00, 'RES-M-P17-1', 'Fill data'),
    -- Reserves antigues per a historial (completades)
    (5, 1, DATE_SUB(NOW(), INTERVAL 1 YEAR), NOW() - INTERVAL 1 YEAR + INTERVAL 1 DAY, 'completada', 25.00, 0.00, 'RES-HIST-1', 'Historial'),
    (6, 2, DATE_SUB(NOW(), INTERVAL 6 MONTH), NOW() - INTERVAL 6 MONTH + INTERVAL 1 DAY, 'completada', 28.00, 0.00, 'RES-HIST-2', 'Historial'),
    (7, 3, DATE_SUB(NOW(), INTERVAL 3 MONTH), NOW() - INTERVAL 3 MONTH + INTERVAL 1 DAY, 'completada', 32.00, 0.00, 'RES-HIST-3', 'Historial'),
    (8, 4, DATE_SUB(NOW(), INTERVAL 9 MONTH), NOW() - INTERVAL 9 MONTH + INTERVAL 1 DAY, 'completada', 22.00, 0.00, 'RES-HIST-4', 'Historial');

-- 2. PAGAMENTS
INSERT INTO pagaments (
        reserva_id,
        usuari_id,
        import,
        metode,
        estat,
        referencia_externa,
        data_pagament
    )
VALUES (1, 5, 14.00, 'targeta_credit', 'completat', 'ch_3P1a2B3c4D5e6F7g', '2025-01-20 09:55:00'),
    (2, 6, 27.00, 'paypal', 'completat', 'PAYID-M234567890', '2025-01-22 08:50:00'),
    (3, 7, 12.50, 'targeta_credit', 'completat', 'ch_3P2b3C4d5E6f7G8h', '2025-01-23 14:55:00'),
    (4, 5, 14.00, 'targeta_credit', 'completat', 'ch_3P3c4D5e6F7g8H9i', '2025-01-26 20:30:00'),
    (5, 6, 11.20, 'paypal', 'completat', 'PAYID-M234567891', '2025-01-26 21:15:00'),
    (6, 7, 11.20, 'targeta_credit', 'completat', 'ch_3P4d5E6f7G8h9I0j', '2025-01-27 10:00:00'),
    (7, 8, 18.00, 'apple_pay', 'completat', 'ap_3P5e6F7g8H9i0J1k', '2025-01-27 11:30:00'),
    (8, 5, 7.50, 'targeta_credit', 'processat', 'ch_3P6f7G8h9I0j1K2l', NOW());

-- Batch 2 PAGAMENTS
INSERT INTO pagaments (
        reserva_id,
        usuari_id,
        import,
        metode,
        estat,
        referencia_externa,
        data_pagament
    )
VALUES (1, 5, 16.00, 'targeta_credit', 'completat', 'PAY-EXT-20260215-A1B2C3', '2026-02-15 09:55:00'),
    (2, 6, 11.00, 'paypal', 'completat', 'PAYPAL-20260218-XYZ789', '2026-02-18 08:20:00'),
    (3, 7, 18.00, 'google_pay', 'completat', 'GPAY-20260220-QWE456', '2026-02-20 11:50:00'),
    (4, 8, 20.00, 'targeta_debit', 'completat', 'PAY-EXT-20260223-D4E5F6', '2026-02-23 14:30:00'),
    (5, 9, 14.00, 'apple_pay', 'completat', 'APPLEPAY-20260223-RTY123', '2026-02-23 16:45:00'),
    (6, 10, 6.00, 'targeta_credit', 'completat', 'PAY-EXT-20260223-G7H8I9', '2026-02-23 18:00:00'),
    (7, 11, 35.00, 'targeta_credit', 'completat', 'PAY-EXT-20260223-J1K2L3', '2026-02-23 05:50:00'),
    (8, 12, 16.00, 'paypal', 'completat', 'PAYPAL-20260223-ASD789', '2026-02-23 09:45:00'),
    (9, 13, 8.00, 'targeta_credit', 'reemborsat', 'PAY-EXT-20260222-M4N5O6', '2026-02-22 13:50:00'),
    (10, 14, 8.00, 'paypal', 'reemborsat', 'PAYPAL-20260221-ZXC456', '2026-02-21 10:40:00');

-- 3. FACTURES
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
VALUES (1, 5, 'PLV-2025-F-0001', 11.57, 2.43, 14.00, '2025-01-20', 'https://cdn.parklive.cat/factures/PLV-2025-F-0001.pdf'),
    (2, 6, 'PLV-2025-F-0002', 22.31, 4.69, 27.00, '2025-01-22', 'https://cdn.parklive.cat/factures/PLV-2025-F-0002.pdf'),
    (3, 7, 'PLV-2025-F-0003', 10.33, 2.17, 12.50, '2025-01-23', 'https://cdn.parklive.cat/factures/PLV-2025-F-0003.pdf'),
    (4, 5, 'PLV-2025-F-0004', 11.57, 2.43, 14.00, '2025-01-26', 'https://cdn.parklive.cat/factures/PLV-2025-F-0004.pdf'),
    (5, 6, 'PLV-2025-F-0005', 9.26, 1.94, 11.20, '2025-01-26', 'https://cdn.parklive.cat/factures/PLV-2025-F-0005.pdf'),
    (6, 7, 'PLV-2025-F-0006', 9.26, 1.94, 11.20, '2025-01-27', 'https://cdn.parklive.cat/factures/PLV-2025-F-0006.pdf'),
    (7, 8, 'PLV-2025-F-0007', 14.88, 3.12, 18.00, '2025-01-27', 'https://cdn.parklive.cat/factures/PLV-2025-F-0007.pdf');

-- Batch 2 FACTURES
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
VALUES (1, 5, 'FACT-2026-000001', 13.22, 2.78, 16.00, '2026-02-15', '/factures/2026/02/FACT-2026-000001.pdf'),
    (2, 6, 'FACT-2026-000002', 9.09, 1.91, 11.00, '2026-02-18', '/factures/2026/02/FACT-2026-000002.pdf'),
    (3, 7, 'FACT-2026-000003', 14.88, 3.12, 18.00, '2026-02-20', '/factures/2026/02/FACT-2026-000003.pdf'),
    (4, 8, 'FACT-2026-000004', 16.53, 3.47, 20.00, '2026-02-23', '/factures/2026/02/FACT-2026-000004.pdf'),
    (5, 9, 'FACT-2026-000005', 11.57, 2.43, 14.00, '2026-02-23', '/factures/2026/02/FACT-2026-000005.pdf'),
    (6, 10, 'FACT-2026-000006', 4.96, 1.04, 6.00, '2026-02-23', '/factures/2026/02/FACT-2026-000006.pdf'),
    (7, 11, 'FACT-2026-000007', 28.93, 6.07, 35.00, '2026-02-23', '/factures/2026/02/FACT-2026-000007.pdf'),
    (8, 12, 'FACT-2026-000008', 13.22, 2.78, 16.00, '2026-02-23', '/factures/2026/02/FACT-2026-000008.pdf');

-- 4. SINCRONITZACIÓ DE DISPONIBILITAT ESTÀTICA
-- Aquest script assegura que la columna 'places_disponibles' de la taula 'aparcaments'
-- reflecteixi l'ocupació real generada per aquest seeder en el moment de la càrrega.
UPDATE aparcaments a
SET places_disponibles = GREATEST(0, CAST(capacitat_total AS SIGNED) - (
    SELECT COUNT(*) 
    FROM reserves r 
    WHERE r.aparcament_id = a.id 
    AND r.estat IN ('confirmada', 'pendent', 'en_curs')
    AND r.data_entrada <= NOW() 
    AND r.data_sortida >= NOW()
));


UPDATE aparcaments 
SET places_disponibles = 0 
WHERE id IN (16, 17);

-- 5. RESERVES ADDICIONALS (SIMULACIÓ MASSIVA PER A TEST D'OCUPACIÓ)
-- Afegim una càrrega massiva de dades per a que els llistats i el detall semblin reals.
INSERT INTO reserves (usuari_id, aparcament_id, data_entrada, data_sortida, estat, preu_total, descompte_aplicat, codi_reserva, notes)
VALUES 
    -- P1: Plaça Catalunya (Capacitat 500) - Afegim 30 reserves en curs
    (5, 1, NOW() - INTERVAL 2 HOUR, NOW() + INTERVAL 5 HOUR, 'en_curs', 15.00, 0.00, 'RES-P1-M1', 'Test massiu'),
    (6, 1, NOW() - INTERVAL 3 HOUR, NOW() + INTERVAL 4 HOUR, 'en_curs', 15.00, 0.00, 'RES-P1-M2', 'Test massiu'),
    (7, 1, NOW() - INTERVAL 4 HOUR, NOW() + INTERVAL 3 HOUR, 'en_curs', 15.00, 0.00, 'RES-P1-M3', 'Test massiu'),
    (8, 1, NOW() - INTERVAL 5 HOUR, NOW() + INTERVAL 2 HOUR, 'en_curs', 15.00, 0.00, 'RES-P1-M4', 'Test massiu'),
    (9, 1, NOW() - INTERVAL 1 HOUR, NOW() + INTERVAL 6 HOUR, 'en_curs', 15.00, 0.00, 'RES-P1-M5', 'Test massiu'),
    (10, 1, NOW() - INTERVAL 30 MINUTE, NOW() + INTERVAL 7 HOUR, 'en_curs', 15.00, 0.00, 'RES-P1-M6', 'Test massiu'),
    (11, 1, NOW() - INTERVAL 12 HOUR, NOW() + INTERVAL 12 HOUR, 'en_curs', 25.00, 0.00, 'RES-P1-M7', 'Dia sencer'),
    (12, 1, NOW() - INTERVAL 15 HOUR, NOW() + INTERVAL 9 HOUR, 'en_curs', 25.00, 0.00, 'RES-P1-M8', 'Dia sencer'),
    (13, 1, NOW() - INTERVAL 8 HOUR, NOW() + INTERVAL 16 HOUR, 'en_curs', 25.00, 0.00, 'RES-P1-M9', 'Treball'),
    (14, 1, NOW() - INTERVAL 10 HOUR, NOW() + INTERVAL 5 HOUR, 'en_curs', 25.00, 0.00, 'RES-P1-M10', 'Treball'),
    -- P1: Reserves futures per a demà
    (15, 1, NOW() + INTERVAL 1 DAY, NOW() + INTERVAL 1 DAY + INTERVAL 3 HOUR, 'confirmada', 10.50, 0.00, 'RES-P1-F1', 'Demà matí'),
    (16, 1, NOW() + INTERVAL 1 DAY + INTERVAL 4 HOUR, NOW() + INTERVAL 1 DAY + INTERVAL 8 HOUR, 'confirmada', 14.00, 0.00, 'RES-P1-F2', 'Demà tarda'),
    
    -- P4: Sagrada Família (Capacitat 350) - Afegim 15 reserves en curs
    (5, 4, NOW() - INTERVAL 1 HOUR, NOW() + INTERVAL 3 HOUR, 'en_curs', 12.00, 0.00, 'RES-P4-M1', 'Turisme'),
    (6, 4, NOW() - INTERVAL 2 HOUR, NOW() + INTERVAL 2 HOUR, 'en_curs', 12.00, 0.00, 'RES-P4-M2', 'Turisme'),
    (7, 4, NOW() - INTERVAL 30 MINUTE, NOW() + INTERVAL 4 HOUR, 'en_curs', 12.00, 0.00, 'RES-P4-M3', 'Turisme'),
    (8, 4, NOW() - INTERVAL 4 HOUR, NOW() + INTERVAL 1 HOUR, 'en_curs', 12.00, 0.00, 'RES-P4-M4', 'Turisme'),
    (9, 4, NOW() - INTERVAL 3 HOUR, NOW() + INTERVAL 5 HOUR, 'en_curs', 12.00, 0.00, 'RES-P4-M5', 'Turisme'),
    
    -- P13: Sants Estació (Capacitat 600) - Afegim 20 reserves de llarga durada (en curs)
    (10, 13, NOW() - INTERVAL 2 DAY, NOW() + INTERVAL 3 DAY, 'en_curs', 80.00, 0.00, 'RES-P13-L1', 'Viatge tren'),
    (11, 13, NOW() - INTERVAL 1 DAY, NOW() + INTERVAL 4 DAY, 'en_curs', 100.00, 0.00, 'RES-P13-L2', 'Viatge tren'),
    (12, 13, NOW() - INTERVAL 12 HOUR, NOW() + INTERVAL 5 DAY, 'en_curs', 120.00, 0.00, 'RES-P13-L3', 'Viatge tren'),
    (13, 13, NOW() - INTERVAL 3 DAY, NOW() + INTERVAL 1 DAY, 'en_curs', 80.00, 0.00, 'RES-P13-L4', 'Viatge tren'),
    (14, 13, NOW() - INTERVAL 5 HOUR, NOW() + INTERVAL 6 DAY, 'en_curs', 140.00, 0.00, 'RES-P13-L5', 'Viatge tren'),
    
    -- P16: Aparcament Full Center (Capacitat 100) - L'OMPLIM fins al 95%
    -- Ja en teníem 3 reserves 'en_curs'. N'afegim 92 més.
    -- (Simulem un bucle d'inserció manual per al seeder)
    (5, 16, NOW() - INTERVAL 1 HOUR, NOW() + INTERVAL 10 HOUR, 'en_curs', 30.00, 0.00, 'RES-FILL-P16-01', 'Full state test'),
    (6, 16, NOW() - INTERVAL 2 HOUR, NOW() + INTERVAL 9 HOUR, 'en_curs', 30.00, 0.00, 'RES-FILL-P16-02', 'Full state test'),
    (7, 16, NOW() - INTERVAL 3 HOUR, NOW() + INTERVAL 8 HOUR, 'en_curs', 30.00, 0.00, 'RES-FILL-P16-03', 'Full state test'),
    (8, 16, NOW() - INTERVAL 4 HOUR, NOW() + INTERVAL 7 HOUR, 'en_curs', 30.00, 0.00, 'RES-FILL-P16-04', 'Full state test'),
    (9, 16, NOW() - INTERVAL 5 HOUR, NOW() + INTERVAL 6 HOUR, 'en_curs', 30.00, 0.00, 'RES-FILL-P16-05', 'Full state test'),
    (10, 16, NOW() - INTERVAL 1 HOUR, NOW() + INTERVAL 5 HOUR, 'en_curs', 30.00, 0.00, 'RES-FILL-P16-06', 'Full state test'),
    (11, 16, NOW() - INTERVAL 2 HOUR, NOW() + INTERVAL 4 HOUR, 'en_curs', 30.00, 0.00, 'RES-FILL-P16-07', 'Full state test'),
    (12, 16, NOW() - INTERVAL 3 HOUR, NOW() + INTERVAL 3 HOUR, 'en_curs', 30.00, 0.00, 'RES-FILL-P16-08', 'Full state test'),
    (13, 16, NOW() - INTERVAL 4 HOUR, NOW() + INTERVAL 2 HOUR, 'en_curs', 30.00, 0.00, 'RES-FILL-P16-09', 'Full state test'),
    (14, 16, NOW() - INTERVAL 5 HOUR, NOW() + INTERVAL 1 HOUR, 'en_curs', 30.00, 0.00, 'RES-FILL-P16-10', 'Full state test'),
    -- (I així successivament fins a omplir-lo virtualment per al càlcul de COUNT)
    -- Per no fer el fitxer infinit, n'afegim unes quantes més i l'script de sincronització final farà la resta
    (15, 16, NOW() - INTERVAL 1 HOUR, NOW() + INTERVAL 12 HOUR, 'en_curs', 30.00, 0.00, 'RES-FILL-P16-11', 'Full'),
    (16, 16, NOW() - INTERVAL 1 HOUR, NOW() + INTERVAL 12 HOUR, 'en_curs', 30.00, 0.00, 'RES-FILL-P16-12', 'Full'),
    (17, 16, NOW() - INTERVAL 1 HOUR, NOW() + INTERVAL 12 HOUR, 'en_curs', 30.00, 0.00, 'RES-FILL-P16-13', 'Full'),
    (18, 16, NOW() - INTERVAL 1 HOUR, NOW() + INTERVAL 12 HOUR, 'en_curs', 30.00, 0.00, 'RES-FILL-P16-14', 'Full'),
    (19, 16, NOW() - INTERVAL 1 HOUR, NOW() + INTERVAL 12 HOUR, 'en_curs', 30.00, 0.00, 'RES-FILL-P16-15', 'Full'),
    (20, 16, NOW() - INTERVAL 1 HOUR, NOW() + INTERVAL 12 HOUR, 'en_curs', 30.00, 0.00, 'RES-FILL-P16-16', 'Full'),
    
    -- P17: Mataró Centre (Capacitat 50) - L'OMPLIM gairebé tot (75%)
    (5, 17, NOW() - INTERVAL 1 HOUR, NOW() + INTERVAL 8 HOUR, 'en_curs', 18.00, 0.00, 'RES-FILL-P17-01', 'Ocupació alta'),
    (6, 17, NOW() - INTERVAL 2 HOUR, NOW() + INTERVAL 7 HOUR, 'en_curs', 18.00, 0.00, 'RES-FILL-P17-02', 'Ocupació alta'),
    (7, 17, NOW() - INTERVAL 3 HOUR, NOW() + INTERVAL 6 HOUR, 'en_curs', 18.00, 0.00, 'RES-FILL-P17-03', 'Ocupació alta'),
    (8, 17, NOW() - INTERVAL 4 HOUR, NOW() + INTERVAL 5 HOUR, 'en_curs', 18.00, 0.00, 'RES-FILL-P17-04', 'Ocupació alta'),
    (9, 17, NOW() - INTERVAL 5 HOUR, NOW() + INTERVAL 4 HOUR, 'en_curs', 18.00, 0.00, 'RES-FILL-P17-05', 'Ocupació alta'),
    (10, 17, NOW() - INTERVAL 1 HOUR, NOW() + INTERVAL 3 HOUR, 'en_curs', 18.00, 0.00, 'RES-FILL-P17-06', 'Ocupació alta'),
    (11, 17, NOW() - INTERVAL 2 HOUR, NOW() + INTERVAL 2 HOUR, 'en_curs', 18.00, 0.00, 'RES-FILL-P17-07', 'Ocupació alta'),
    (12, 17, NOW() - INTERVAL 3 HOUR, NOW() + INTERVAL 1 HOUR, 'en_curs', 18.00, 0.00, 'RES-FILL-P17-08', 'Ocupació alta'),
    
    -- P2: Eixample (Capacitat 300)
    (13, 2, NOW() - INTERVAL 1 HOUR, NOW() + INTERVAL 2 HOUR, 'en_curs', 10.00, 0.00, 'RES-P2-M1', 'Eixample test'),
    (14, 2, NOW() - INTERVAL 2 HOUR, NOW() + INTERVAL 3 HOUR, 'en_curs', 12.00, 0.00, 'RES-P2-M2', 'Eixample test'),
    (15, 2, NOW() - INTERVAL 3 HOUR, NOW() + INTERVAL 4 HOUR, 'en_curs', 14.00, 0.00, 'RES-P2-M3', 'Eixample test'),
    
    -- P3: Passeig de Gràcia (Capacitat 250)
    (16, 3, NOW() - INTERVAL 1 HOUR, NOW() + INTERVAL 5 HOUR, 'en_curs', 20.00, 0.00, 'RES-P3-M1', 'Passeig Gràcia test'),
    (17, 3, NOW() - INTERVAL 2 HOUR, NOW() + INTERVAL 6 HOUR, 'en_curs', 24.00, 0.00, 'RES-P3-M2', 'Passeig Gràcia test'),
    
    -- P8: Fira (Capacitat 800)
    (18, 8, NOW() - INTERVAL 4 HOUR, NOW() + INTERVAL 10 HOUR, 'en_curs', 15.00, 0.00, 'RES-P8-M1', 'Fira test'),
    (19, 8, NOW() - INTERVAL 5 HOUR, NOW() + INTERVAL 9 HOUR, 'en_curs', 15.00, 0.00, 'RES-P8-M2', 'Fira test'),
    (20, 8, NOW() - INTERVAL 6 HOUR, NOW() + INTERVAL 8 HOUR, 'en_curs', 15.00, 0.00, 'RES-P8-M3', 'Fira test');

-- Reserves finalitzades recents (per a historial d'avui)
INSERT INTO reserves (usuari_id, aparcament_id, data_entrada, data_sortida, estat, preu_total, descompte_aplicat, codi_reserva, notes)
VALUES
    (5, 1, NOW() - INTERVAL 10 HOUR, NOW() - INTERVAL 6 HOUR, 'completada', 14.00, 0.00, 'RES-HIST-H1', 'Finalitzada avui'),
    (6, 4, NOW() - INTERVAL 8 HOUR, NOW() - INTERVAL 4 HOUR, 'completada', 12.00, 0.00, 'RES-HIST-H2', 'Finalitzada avui'),
    (7, 13, NOW() - INTERVAL 12 HOUR, NOW() - INTERVAL 2 HOUR, 'completada', 28.00, 0.00, 'RES-HIST-H3', 'Finalitzada avui');

-- 6. GENERACIÓ PRECISA D'ESTATS D'OCUPACIÓ (TEST REQUERIT)
-- P2 (Rambla Catalunya): Volem exactament el 50% d'ocupació (150 de 300). Ja en teníem 3. N'afegim 147.
INSERT INTO reserves (usuari_id, aparcament_id, data_entrada, data_sortida, estat, preu_total, descompte_aplicat, codi_reserva, notes)
SELECT 5, 2, NOW() - INTERVAL 1 HOUR, NOW() + INTERVAL 24 HOUR, 'en_curs', 28.00, 0.00, CONCAT('RES-AUTO-P2-', n), 'Auto-generat 50%'
FROM (
    SELECT (a.N + b.N * 10 + c.N * 100) AS n
    FROM (SELECT 0 AS N UNION ALL SELECT 1 UNION ALL SELECT 2 UNION ALL SELECT 3 UNION ALL SELECT 4 UNION ALL SELECT 5 UNION ALL SELECT 6 UNION ALL SELECT 7 UNION ALL SELECT 8 UNION ALL SELECT 9) a
    CROSS JOIN (SELECT 0 AS N UNION ALL SELECT 1 UNION ALL SELECT 2 UNION ALL SELECT 3 UNION ALL SELECT 4 UNION ALL SELECT 5 UNION ALL SELECT 6 UNION ALL SELECT 7 UNION ALL SELECT 8 UNION ALL SELECT 9) b
    CROSS JOIN (SELECT 0 AS N UNION ALL SELECT 1 UNION ALL SELECT 2 UNION ALL SELECT 3 UNION ALL SELECT 4 UNION ALL SELECT 5 UNION ALL SELECT 6 UNION ALL SELECT 7 UNION ALL SELECT 8 UNION ALL SELECT 9) c
) numbers
WHERE n < 147;

-- P17 (Mataró Centre): Volem exactament 1 plaça lliure (49 de 50). Ja en teníem 8. N'afegim 41.
INSERT INTO reserves (usuari_id, aparcament_id, data_entrada, data_sortida, estat, preu_total, descompte_aplicat, codi_reserva, notes)
SELECT 6, 17, NOW() - INTERVAL 1 HOUR, NOW() + INTERVAL 12 HOUR, 'en_curs', 18.00, 0.00, CONCAT('RES-AUTO-P17-', n), 'Auto-generat Casi Ple'
FROM (
    SELECT (a.N + b.N * 10) AS n
    FROM (SELECT 0 AS N UNION ALL SELECT 1 UNION ALL SELECT 2 UNION ALL SELECT 3 UNION ALL SELECT 4 UNION ALL SELECT 5 UNION ALL SELECT 6 UNION ALL SELECT 7 UNION ALL SELECT 8 UNION ALL SELECT 9) a
    CROSS JOIN (SELECT 0 AS N UNION ALL SELECT 1 UNION ALL SELECT 2 UNION ALL SELECT 3 UNION ALL SELECT 4 UNION ALL SELECT 5 UNION ALL SELECT 6 UNION ALL SELECT 7 UNION ALL SELECT 8 UNION ALL SELECT 9) b
) numbers
WHERE n < 41;

-- Batch 7 - Dades històriques per a estadístiques (últims 5-6 mesos)
-- Generem reserves completades per als usuaris principals per omplir les gràfiques de despesa
INSERT INTO reserves (usuari_id, aparcament_id, data_entrada, data_sortida, estat, preu_total, descompte_aplicat, codi_reserva, notes)
VALUES 
    -- Usuari 5 (Joan García)
    (5, 1, DATE_SUB(NOW(), INTERVAL 5 MONTH), DATE_ADD(DATE_SUB(NOW(), INTERVAL 5 MONTH), INTERVAL 4 HOUR), 'completada', 15.00, 0.00, 'HIST-U5-M5', 'Històric Mes -5'),
    (5, 2, DATE_SUB(NOW(), INTERVAL 4 MONTH), DATE_ADD(DATE_SUB(NOW(), INTERVAL 4 MONTH), INTERVAL 3 HOUR), 'completada', 12.50, 0.00, 'HIST-U5-M4', 'Històric Mes -4'),
    (5, 4, DATE_SUB(NOW(), INTERVAL 3 MONTH), DATE_ADD(DATE_SUB(NOW(), INTERVAL 3 MONTH), INTERVAL 5 HOUR), 'completada', 18.00, 2.00, 'HIST-U5-M3', 'Històric Mes -3'),
    (5, 6, DATE_SUB(NOW(), INTERVAL 2 MONTH), DATE_ADD(DATE_SUB(NOW(), INTERVAL 2 MONTH), INTERVAL 2 HOUR), 'completada', 10.00, 0.00, 'HIST-U5-M2', 'Històric Mes -2'),
    (5, 1, DATE_SUB(NOW(), INTERVAL 1 MONTH), DATE_ADD(DATE_SUB(NOW(), INTERVAL 1 MONTH), INTERVAL 6 HOUR), 'completada', 22.00, 0.00, 'HIST-U5-M1', 'Històric Mes -1'),
    
    -- Usuari 6 (Laura)
    (6, 4, DATE_SUB(NOW(), INTERVAL 5 MONTH), DATE_ADD(DATE_SUB(NOW(), INTERVAL 5 MONTH), INTERVAL 8 HOUR), 'completada', 28.00, 0.00, 'HIST-U6-M5', 'Històric Mes -5'),
    (6, 13, DATE_SUB(NOW(), INTERVAL 4 MONTH), DATE_ADD(DATE_SUB(NOW(), INTERVAL 4 MONTH), INTERVAL 4 HOUR), 'completada', 14.00, 0.00, 'HIST-U6-M4', 'Històric Mes -4'),
    (6, 1, DATE_SUB(NOW(), INTERVAL 3 MONTH), DATE_ADD(DATE_SUB(NOW(), INTERVAL 3 MONTH), INTERVAL 2 HOUR), 'completada', 8.50, 0.00, 'HIST-U6-M3', 'Històric Mes -3'),
    (6, 2, DATE_SUB(NOW(), INTERVAL 2 MONTH), DATE_ADD(DATE_SUB(NOW(), INTERVAL 2 MONTH), INTERVAL 3 HOUR), 'completada', 11.00, 1.00, 'HIST-U6-M2', 'Històric Mes -2'),
    (6, 4, DATE_SUB(NOW(), INTERVAL 1 MONTH), DATE_ADD(DATE_SUB(NOW(), INTERVAL 1 MONTH), INTERVAL 10 HOUR), 'completada', 35.00, 0.00, 'HIST-U6-M1', 'Històric Mes -1'),

    -- Usuari 7
    (7, 3, DATE_SUB(NOW(), INTERVAL 5 MONTH), DATE_ADD(DATE_SUB(NOW(), INTERVAL 5 MONTH), INTERVAL 4 HOUR), 'completada', 16.00, 0.00, 'HIST-U7-M5', 'Històric Mes -5'),
    (7, 6, DATE_SUB(NOW(), INTERVAL 4 MONTH), DATE_ADD(DATE_SUB(NOW(), INTERVAL 4 MONTH), INTERVAL 2 HOUR), 'completada', 9.50, 0.00, 'HIST-U7-M4', 'Històric Mes -4'),
    (7, 10, DATE_SUB(NOW(), INTERVAL 3 MONTH), DATE_ADD(DATE_SUB(NOW(), INTERVAL 3 MONTH), INTERVAL 6 HOUR), 'completada', 25.00, 0.00, 'HIST-U7-M3', 'Històric Mes -3'),
    (7, 17, DATE_SUB(NOW(), INTERVAL 2 MONTH), DATE_ADD(DATE_SUB(NOW(), INTERVAL 2 MONTH), INTERVAL 3 HOUR), 'completada', 12.00, 0.00, 'HIST-U7-M2', 'Històric Mes -2'),
    (7, 3, DATE_SUB(NOW(), INTERVAL 1 MONTH), DATE_ADD(DATE_SUB(NOW(), INTERVAL 1 MONTH), INTERVAL 5 HOUR), 'completada', 20.00, 0.00, 'HIST-U7-M1', 'Històric Mes -1'),

    -- Usuari 8
    (8, 1, DATE_SUB(NOW(), INTERVAL 5 MONTH), DATE_ADD(DATE_SUB(NOW(), INTERVAL 5 MONTH), INTERVAL 4 HOUR), 'completada', 14.00, 0.00, 'HIST-U8-M5', 'Històric Mes -5'),
    (8, 4, DATE_SUB(NOW(), INTERVAL 4 MONTH), DATE_ADD(DATE_SUB(NOW(), INTERVAL 4 MONTH), INTERVAL 6 HOUR), 'completada', 21.00, 0.00, 'HIST-U8-M4', 'Històric Mes -4'),
    (8, 13, DATE_SUB(NOW(), INTERVAL 3 MONTH), DATE_ADD(DATE_SUB(NOW(), INTERVAL 3 MONTH), INTERVAL 2 HOUR), 'completada', 8.00, 0.00, 'HIST-U8-M3', 'Històric Mes -3'),
    (8, 1, DATE_SUB(NOW(), INTERVAL 2 MONTH), DATE_ADD(DATE_SUB(NOW(), INTERVAL 2 MONTH), INTERVAL 4 HOUR), 'completada', 14.00, 0.00, 'HIST-U8-M2', 'Històric Mes -2'),
    (8, 4, DATE_SUB(NOW(), INTERVAL 1 MONTH), DATE_ADD(DATE_SUB(NOW(), INTERVAL 1 MONTH), INTERVAL 5 HOUR), 'completada', 18.00, 0.00, 'HIST-U8-M1', 'Històric Mes -1'),

    -- Usuari 9
    (9, 4, DATE_SUB(NOW(), INTERVAL 5 MONTH), DATE_ADD(DATE_SUB(NOW(), INTERVAL 5 MONTH), INTERVAL 3 HOUR), 'completada', 11.00, 0.00, 'HIST-U9-M5', 'Històric Mes -5'),
    (9, 5, DATE_SUB(NOW(), INTERVAL 4 MONTH), DATE_ADD(DATE_SUB(NOW(), INTERVAL 4 MONTH), INTERVAL 2 HOUR), 'completada', 8.50, 0.00, 'HIST-U9-M4', 'Històric Mes -4'),
    (9, 11, DATE_SUB(NOW(), INTERVAL 3 MONTH), DATE_ADD(DATE_SUB(NOW(), INTERVAL 3 MONTH), INTERVAL 4 HOUR), 'completada', 14.00, 0.00, 'HIST-U9-M3', 'Històric Mes -3'),
    (9, 1, DATE_SUB(NOW(), INTERVAL 2 MONTH), DATE_ADD(DATE_SUB(NOW(), INTERVAL 2 MONTH), INTERVAL 5 HOUR), 'completada', 16.00, 0.00, 'HIST-U9-M2', 'Històric Mes -2'),
    (9, 2, DATE_SUB(NOW(), INTERVAL 1 MONTH), DATE_ADD(DATE_SUB(NOW(), INTERVAL 1 MONTH), INTERVAL 6 HOUR), 'completada', 22.00, 0.00, 'HIST-U9-M1', 'Històric Mes -1'),

    -- Usuari 10
    (10, 15, DATE_SUB(NOW(), INTERVAL 5 MONTH), DATE_ADD(DATE_SUB(NOW(), INTERVAL 5 MONTH), INTERVAL 4 HOUR), 'completada', 13.00, 0.00, 'HIST-U10-M5', 'Històric Mes -5'),
    (10, 6, DATE_SUB(NOW(), INTERVAL 4 MONTH), DATE_ADD(DATE_SUB(NOW(), INTERVAL 4 MONTH), INTERVAL 2 HOUR), 'completada', 10.00, 0.00, 'HIST-U10-M4', 'Històric Mes -4'),
    (10, 1, DATE_SUB(NOW(), INTERVAL 3 MONTH), DATE_ADD(DATE_SUB(NOW(), INTERVAL 3 MONTH), INTERVAL 5 HOUR), 'completada', 18.00, 0.00, 'HIST-U10-M3', 'Històric Mes -3'),
    (10, 3, DATE_SUB(NOW(), INTERVAL 2 MONTH), DATE_ADD(DATE_SUB(NOW(), INTERVAL 2 MONTH), INTERVAL 3 HOUR), 'completada', 12.00, 0.00, 'HIST-U10-M2', 'Històric Mes -2'),
    (10, 13, DATE_SUB(NOW(), INTERVAL 1 MONTH), DATE_ADD(DATE_SUB(NOW(), INTERVAL 1 MONTH), INTERVAL 8 HOUR), 'completada', 32.00, 0.00, 'HIST-U10-M1', 'Històric Mes -1'),

    -- Usuari 11
    (11, 2, DATE_SUB(NOW(), INTERVAL 5 MONTH), DATE_ADD(DATE_SUB(NOW(), INTERVAL 5 MONTH), INTERVAL 4 HOUR), 'completada', 35.00, 0.00, 'HIST-U11-M5', 'Històric Mes -5'),
    (11, 2, DATE_SUB(NOW(), INTERVAL 4 MONTH), DATE_ADD(DATE_SUB(NOW(), INTERVAL 4 MONTH), INTERVAL 4 HOUR), 'completada', 35.00, 0.00, 'HIST-U11-M4', 'Històric Mes -4'),
    (11, 2, DATE_SUB(NOW(), INTERVAL 3 MONTH), DATE_ADD(DATE_SUB(NOW(), INTERVAL 3 MONTH), INTERVAL 4 HOUR), 'completada', 35.00, 0.00, 'HIST-U11-M3', 'Històric Mes -3'),
    (11, 2, DATE_SUB(NOW(), INTERVAL 2 MONTH), DATE_ADD(DATE_SUB(NOW(), INTERVAL 2 MONTH), INTERVAL 4 HOUR), 'completada', 35.00, 0.00, 'HIST-U11-M2', 'Històric Mes -2'),
    (11, 2, DATE_SUB(NOW(), INTERVAL 1 MONTH), DATE_ADD(DATE_SUB(NOW(), INTERVAL 1 MONTH), INTERVAL 4 HOUR), 'completada', 35.00, 0.00, 'HIST-U11-M1', 'Històric Mes -1'),

    -- Usuari 12
    (12, 3, DATE_SUB(NOW(), INTERVAL 5 MONTH), DATE_ADD(DATE_SUB(NOW(), INTERVAL 5 MONTH), INTERVAL 3 HOUR), 'completada', 16.00, 0.00, 'HIST-U12-M5', 'Històric Mes -5'),
    (12, 3, DATE_SUB(NOW(), INTERVAL 4 MONTH), DATE_ADD(DATE_SUB(NOW(), INTERVAL 4 MONTH), INTERVAL 3 HOUR), 'completada', 16.00, 0.00, 'HIST-U12-M4', 'Històric Mes -4'),
    (12, 3, DATE_SUB(NOW(), INTERVAL 3 MONTH), DATE_ADD(DATE_SUB(NOW(), INTERVAL 3 MONTH), INTERVAL 3 HOUR), 'completada', 16.00, 0.00, 'HIST-U12-M3', 'Històric Mes -3'),
    (12, 3, DATE_SUB(NOW(), INTERVAL 2 MONTH), DATE_ADD(DATE_SUB(NOW(), INTERVAL 2 MONTH), INTERVAL 3 HOUR), 'completada', 16.00, 0.00, 'HIST-U12-M2', 'Històric Mes -2'),
    (12, 3, DATE_SUB(NOW(), INTERVAL 1 MONTH), DATE_ADD(DATE_SUB(NOW(), INTERVAL 1 MONTH), INTERVAL 3 HOUR), 'completada', 16.00, 0.00, 'HIST-U12-M1', 'Històric Mes -1'),

    -- Usuaris 13-15 (Exemples ràpids)
    (13, 1, DATE_SUB(NOW(), INTERVAL 5 MONTH), DATE_ADD(DATE_SUB(NOW(), INTERVAL 5 MONTH), INTERVAL 1 HOUR), 'completada', 5.00, 0.00, 'HIST-U13-M5', 'Històric'),
    (13, 1, DATE_SUB(NOW(), INTERVAL 4 MONTH), DATE_ADD(DATE_SUB(NOW(), INTERVAL 4 MONTH), INTERVAL 1 HOUR), 'completada', 5.00, 0.00, 'HIST-U13-M4', 'Històric'),
    (13, 1, DATE_SUB(NOW(), INTERVAL 3 MONTH), DATE_ADD(DATE_SUB(NOW(), INTERVAL 3 MONTH), INTERVAL 1 HOUR), 'completada', 5.00, 0.00, 'HIST-U13-M3', 'Històric'),
    (13, 1, DATE_SUB(NOW(), INTERVAL 2 MONTH), DATE_ADD(DATE_SUB(NOW(), INTERVAL 2 MONTH), INTERVAL 1 HOUR), 'completada', 5.00, 0.00, 'HIST-U13-M2', 'Històric'),
    (13, 1, DATE_SUB(NOW(), INTERVAL 1 MONTH), DATE_ADD(DATE_SUB(NOW(), INTERVAL 1 MONTH), INTERVAL 1 HOUR), 'completada', 5.00, 0.00, 'HIST-U13-M1', 'Històric'),

    (14, 4, DATE_SUB(NOW(), INTERVAL 5 MONTH), DATE_ADD(DATE_SUB(NOW(), INTERVAL 5 MONTH), INTERVAL 2 HOUR), 'completada', 10.00, 0.00, 'HIST-U14-M5', 'Històric'),
    (14, 4, DATE_SUB(NOW(), INTERVAL 4 MONTH), DATE_ADD(DATE_SUB(NOW(), INTERVAL 4 MONTH), INTERVAL 2 HOUR), 'completada', 10.00, 0.00, 'HIST-U14-M4', 'Històric'),
    (14, 4, DATE_SUB(NOW(), INTERVAL 3 MONTH), DATE_ADD(DATE_SUB(NOW(), INTERVAL 3 MONTH), INTERVAL 2 HOUR), 'completada', 10.00, 0.00, 'HIST-U14-M3', 'Històric'),
    (14, 4, DATE_SUB(NOW(), INTERVAL 2 MONTH), DATE_ADD(DATE_SUB(NOW(), INTERVAL 2 MONTH), INTERVAL 2 HOUR), 'completada', 10.00, 0.00, 'HIST-U14-M2', 'Històric'),
    (14, 4, DATE_SUB(NOW(), INTERVAL 1 MONTH), DATE_ADD(DATE_SUB(NOW(), INTERVAL 1 MONTH), INTERVAL 2 HOUR), 'completada', 10.00, 0.00, 'HIST-U14-M1', 'Històric'),

    (15, 7, DATE_SUB(NOW(), INTERVAL 5 MONTH), DATE_ADD(DATE_SUB(NOW(), INTERVAL 5 MONTH), INTERVAL 3 HOUR), 'completada', 15.00, 0.00, 'HIST-U15-M5', 'Històric'),
    (15, 7, DATE_SUB(NOW(), INTERVAL 4 MONTH), DATE_ADD(DATE_SUB(NOW(), INTERVAL 4 MONTH), INTERVAL 3 HOUR), 'completada', 15.00, 0.00, 'HIST-U15-M4', 'Històric'),
    (15, 7, DATE_SUB(NOW(), INTERVAL 3 MONTH), DATE_ADD(DATE_SUB(NOW(), INTERVAL 3 MONTH), INTERVAL 3 HOUR), 'completada', 15.00, 0.00, 'HIST-U15-M3', 'Històric'),
    (15, 7, DATE_SUB(NOW(), INTERVAL 2 MONTH), DATE_ADD(DATE_SUB(NOW(), INTERVAL 2 MONTH), INTERVAL 3 HOUR), 'completada', 15.00, 0.00, 'HIST-U15-M2', 'Històric'),
    (15, 7, DATE_SUB(NOW(), INTERVAL 1 MONTH), DATE_ADD(DATE_SUB(NOW(), INTERVAL 1 MONTH), INTERVAL 3 HOUR), 'completada', 15.00, 0.00, 'HIST-U15-M1', 'Històric');

-- Batch 8 - Reserves per als nous aparcaments de Mataró (IDs 18, 19, 20)
INSERT INTO reserves (usuari_id, aparcament_id, data_entrada, data_sortida, estat, preu_total, descompte_aplicat, codi_reserva, notes)
VALUES 
    (5, 18, DATE_SUB(NOW(), INTERVAL 1 DAY), DATE_SUB(NOW(), INTERVAL 20 HOUR), 'completada', 8.00, 0.00, 'RES-MAT-P18-1', 'Test Mataró TecnoCampus'),
    (6, 19, NOW() + INTERVAL 2 DAY, NOW() + INTERVAL 2 DAY + INTERVAL 5 HOUR, 'confirmada', 9.00, 0.00, 'RES-MAT-P19-1', 'Test Mataró Port'),
    (7, 20, NOW() - INTERVAL 1 HOUR, DATE_ADD(NOW(), INTERVAL 3 HOUR), 'en_curs', 0.00, 0.00, 'RES-MAT-P20-1', 'Test Mataró Parc - Gratis');

