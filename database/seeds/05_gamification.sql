-- 1. NETEJA DE DADES PRÈVIES (per evitar conflictes de claus foranes i IDs)
SET FOREIGN_KEY_CHECKS = 0;
TRUNCATE TABLE usuaris_recompenses;
TRUNCATE TABLE bescanvis_recompenses;
TRUNCATE TABLE recompenses;
SET FOREIGN_KEY_CHECKS = 1;

-- 2. RECOMPENSES (catàleg d'insignies i premis amb lògica millorada)
INSERT INTO recompenses (
        id,
        nom,
        descripcio,
        tipus,
        requisit_punts,
        valor,
        icona_url,
        activa
    )
VALUES (
        1,
        'Benvinguda a ParkLive',
        'La teva primera fita dins de la comunitat de conductors de ParkLive.',
        'insignia',
        0,
        '{"badge_level": "bronze"}',
        'bi-hand-thumbs-up',
        TRUE
    ),
    (
        2,
        'Explorador de Ciutat',
        'Insignia per als conductors que ja coneixen els millors racons per aparcar.',
        'insignia',
        100,
        '{"badge_level": "plata"}',
        'bi-map',
        TRUE
    ),
    (
        3,
        'Guardià de la Comunitat',
        'Distinció per a aquells que col·laboren activament mantenint la xarxa actualitzada.',
        'insignia',
        250,
        '{"badge_level": "or"}',
        'bi-shield-check',
        TRUE
    ),
    (
        4,
        'Ambaixador ParkLive',
        'El reconeixement més alt per als membres més actius i compromesos de la plataforma.',
        'insignia',
        500,
        '{"badge_level": "platinum"}',
        'bi-trophy-fill',
        TRUE
    ),
    (
        5,
        'Descompte del 10%',
        'Bescanvia els teus punts per un estalvi del 10% en la teva propera reserva.',
        'descompte',
        75,
        '{"percentatge": 10, "max_us": 1}',
        'bi-tag',
        TRUE
    ),
    (
        6,
        'Descompte del 25%',
        'Aprofita la teva col·laboració per obtenir un gran descompte del 25%.',
        'descompte',
        200,
        '{"percentatge": 25, "max_us": 1}',
        'bi-stars',
        TRUE
    ),
    (
        7,
        'Premium (30 dies)',
        'Activa el mode Premium i gaudeix de tots els seus avantatges durant un mes sencer.',
        'premium_temporal',
        350,
        '{"dies": 30}',
        'bi-gem',
        TRUE
    );

-- 3. USUARIS-RECOMPENSES (Exemples inicials per a proves)
-- Usuari 5 (Usuari de proves)
INSERT INTO usuaris_recompenses (usuari_id, recompensa_id, data_obtencio, utilitzada)
VALUES 
    (5, 1, NOW(), FALSE), -- Té la insignia de benvinguda
    (5, 2, NOW(), FALSE), -- Té la insignia d'explorador
    (5, 5, NOW(), FALSE); -- Té un descompte del 10% pendent d'usar

-- Usuari 6
INSERT INTO usuaris_recompenses (usuari_id, recompensa_id, data_obtencio, utilitzada)
VALUES 
    (6, 1, NOW(), FALSE);
