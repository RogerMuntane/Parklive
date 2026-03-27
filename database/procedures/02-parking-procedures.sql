-- STORED PROCEDURES PARKLIVE - GESTIÓ DE APARCAMENTS
USE parklive_db;
-- Eliminar procedures si existeixen (per poder recrear-los)
DROP PROCEDURE IF EXISTS sp_llistar_aparcaments;
DROP PROCEDURE IF EXISTS sp_obtenir_aparcament_detall;
DROP PROCEDURE IF EXISTS sp_cercar_aparcaments;
DROP PROCEDURE IF EXISTS sp_crear_reserva;
DROP PROCEDURE IF EXISTS sp_obtenir_historial_reserves;
DROP PROCEDURE IF EXISTS sp_crear_contribucio;

-- ===========================================
-- 1. GET /api/aparcaments (llistar tots)
-- ===========================================
-- Retorna tots els aparcaments actius amb la seva informació bàsica
-- Exemple: CALL sp_llistar_aparcaments(10, 0);

DELIMITER //

CREATE PROCEDURE sp_llistar_aparcaments(
    IN p_limit INT,
    IN p_offset INT
)
BEGIN
    SELECT
        a.id,
        a.nom,
        a.tipus,
        a.adreca,
        a.ciutat,
        a.codi_postal,
        a.latitud,
        a.longitud,
        a.capacitat_total,
        a.places_disponibles,
        ROUND((a.places_disponibles / a.capacitat_total) * 100, 2) as percentatge_disponibilitat,
        a.tarifa_hora,
        a.tarifa_dia,
        a.horari_obertura,
        a.horari_tancament,
        a.obert_24h,
        a.accessibilitat,
        a.carrega_electrica,
        a.videovigilancia,
        a.altura_maxima,
        a.estat,
        COALESCE((
            SELECT ROUND(AVG(v.puntuacio), 2)
            FROM valoracions v
            WHERE v.aparcament_id = a.id
        ), 0) AS valoracio_mitjana,
        COALESCE((
            SELECT COUNT(*)
            FROM valoracions v
            WHERE v.aparcament_id = a.id
        ), 0) AS total_valoracions,
        a.verificat,
        a.created_at,
        a.updated_at
    FROM aparcaments a
    WHERE a.estat = 'actiu'
    ORDER BY a.created_at DESC
    LIMIT p_limit OFFSET p_offset;
END//

DELIMITER ;

-- ===========================================
-- 2. GET /api/aparcaments/:id (detall)
-- ===========================================
-- Retorna la informació completa d'un aparcament específic
-- Exemple: CALL sp_obtenir_aparcament_detall(1);

DELIMITER //

CREATE PROCEDURE sp_obtenir_aparcament_detall(
    IN p_aparcament_id INT
)
BEGIN
    -- Seleccionar informació de l'aparcament amb dades de l'operador
    SELECT
        a.id,
        a.nom,
        a.tipus,
        a.adreca,
        a.ciutat,
        a.codi_postal,
        a.latitud,
        a.longitud,
        a.capacitat_total,
        a.places_disponibles,
        ROUND((a.places_disponibles / a.capacitat_total) * 100, 2) as percentatge_disponibilitat,
        a.tarifa_hora,
        a.tarifa_dia,
        a.horari_obertura,
        a.horari_tancament,
        a.obert_24h,
        a.caracteristiques,
        a.accessibilitat,
        a.carrega_electrica,
        a.videovigilancia,
        a.altura_maxima,
        a.estat,
        COALESCE((
            SELECT ROUND(AVG(v.puntuacio), 2)
            FROM valoracions v
            WHERE v.aparcament_id = a.id
        ), 0) AS valoracio_mitjana,
        COALESCE((
            SELECT COUNT(*)
            FROM valoracions v
            WHERE v.aparcament_id = a.id
        ), 0) AS total_valoracions,
        a.verificat,
        a.created_at,
        a.updated_at,
        u.nom as operador_nom,
        u.email as operador_email,
        u.telefon as operador_telefon,
        -- Subquery per obtenir fotos
        (SELECT COUNT(*) FROM fotografies_aparcaments WHERE aparcament_id = a.id) as total_fotos
    FROM aparcaments a
    LEFT JOIN usuaris u ON a.operador_id = u.id
    WHERE a.id = p_aparcament_id;

    -- Seleccionar les fotografies de l'aparcament
    SELECT
        id,
        url,
        descripcio,
        verificada,
        ordre,
        created_at
    FROM fotografies_aparcaments
    WHERE aparcament_id = p_aparcament_id
    ORDER BY ordre ASC, created_at DESC;

    -- Seleccionar valoracions recents de l'aparcament
    SELECT
        v.id,
        v.puntuacio,
        v.comentari,
        v.aspectes_valorats,
        v.util_count,
        v.created_at,
        u.nom as usuari_nom
    FROM valoracions v
    JOIN usuaris u ON v.usuari_id = u.id
    WHERE v.aparcament_id = p_aparcament_id
    ORDER BY v.created_at DESC
    LIMIT 10;
END//

DELIMITER ;

-- ===========================================
-- 3. GET /api/aparcaments/cerca (filtres)
-- ===========================================
-- Cerca aparcaments amb diversos filtres
-- Exemple: CALL sp_cercar_aparcaments('Barcelona', 'cobert', 1, 1, NULL, NULL, 50, 0);

DELIMITER //

CREATE PROCEDURE sp_cercar_aparcaments(
    IN p_ciutat VARCHAR(100),
    IN p_tipus VARCHAR(50),
    IN p_accessibilitat BOOLEAN,
    IN p_carrega_electrica BOOLEAN,
    IN p_latitud DECIMAL(10,8),
    IN p_longitud DECIMAL(11,8),
    IN p_limit INT,
    IN p_offset INT
)
BEGIN
    SELECT
        a.id,
        a.nom,
        a.tipus,
        a.adreca,
        a.ciutat,
        a.codi_postal,
        a.latitud,
        a.longitud,
        a.capacitat_total,
        a.places_disponibles,
        ROUND((a.places_disponibles / a.capacitat_total) * 100, 2) as percentatge_disponibilitat,
        a.tarifa_hora,
        a.tarifa_dia,
        a.horari_obertura,
        a.horari_tancament,
        a.obert_24h,
        a.accessibilitat,
        a.carrega_electrica,
        a.videovigilancia,
        a.altura_maxima,
        a.estat,
        COALESCE((
            SELECT ROUND(AVG(v.puntuacio), 2)
            FROM valoracions v
            WHERE v.aparcament_id = a.id
        ), 0) AS valoracio_mitjana,
        COALESCE((
            SELECT COUNT(*)
            FROM valoracions v
            WHERE v.aparcament_id = a.id
        ), 0) AS total_valoracions,
        a.verificat,
        -- Calcular distància si es proporcionen coordenades
        CASE
            WHEN p_latitud IS NOT NULL AND p_longitud IS NOT NULL THEN
                ROUND(
                    6371 * ACOS(
                        COS(RADIANS(p_latitud)) *
                        COS(RADIANS(a.latitud)) *
                        COS(RADIANS(a.longitud) - RADIANS(p_longitud)) +
                        SIN(RADIANS(p_latitud)) *
                        SIN(RADIANS(a.latitud))
                    ),
                    2
                )
            ELSE NULL
        END as distancia_km
    FROM aparcaments a
    WHERE a.estat = 'actiu'
        AND (p_ciutat IS NULL OR a.ciutat LIKE CONCAT('%', p_ciutat, '%'))
        AND (p_tipus IS NULL OR a.tipus = p_tipus)
        AND (p_accessibilitat IS NULL OR a.accessibilitat = p_accessibilitat)
        AND (p_carrega_electrica IS NULL OR a.carrega_electrica = p_carrega_electrica)
    ORDER BY
        CASE
            WHEN p_latitud IS NOT NULL AND p_longitud IS NOT NULL THEN distancia_km
            ELSE valoracio_mitjana
        END ASC
    LIMIT p_limit OFFSET p_offset;
END//

DELIMITER ;