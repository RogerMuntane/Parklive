-- 1. RECOMPENSES (catàleg d'insignies i premis)
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

-- 2. USUARIS-RECOMPENSES (recompenses obtingudes)
INSERT INTO usuaris_recompenses (
        usuari_id,
        recompensa_id,
        data_obtencio,
        utilitzada,
        data_utilitzacio
    )
VALUES (5, 1, '2025-03-02 10:15:00', FALSE, NULL),
    (5, 2, '2025-08-10 14:30:00', FALSE, NULL),
    (5, 5, '2025-10-05 09:20:00', TRUE, '2025-10-12 11:00:00'),
    (6, 1, '2026-02-01 12:00:00', FALSE, NULL),
    (6, 5, '2026-02-15 16:30:00', FALSE, NULL),
    (9, 1, '2025-12-20 08:45:00', FALSE, NULL),
    (9, 4, '2026-01-18 17:10:00', FALSE, NULL),
    (9, 6, '2026-02-10 10:50:00', FALSE, NULL),
    (12, 1, '2025-06-15 11:20:00', FALSE, NULL),
    (12, 2, '2025-11-22 15:40:00', FALSE, NULL),
    (12, 7, '2026-01-05 09:00:00', TRUE, '2026-01-06 10:30:00');
