-- STORED PROCEDURES PARKLIVE - GESTIÓ DE APARCAMENTS
USE parklive_db;
-- Eliminar procedures si existeixen (per poder recrear-los)
DROP PROCEDURE IF EXISTS sp_llistar_aparcaments;
DROP PROCEDURE IF EXISTS sp_obtenir_aparcament_detall;
DROP PROCEDURE IF EXISTS sp_cercar_aparcaments;
DROP PROCEDURE IF EXISTS sp_crear_reserva;
DROP PROCEDURE IF EXISTS sp_obtenir_historial_reserves;
DROP PROCEDURE IF EXISTS sp_crear_contribucio;
DROP PROCEDURE IF EXISTS sp_afegir_aparcament_favorit;
DROP PROCEDURE IF EXISTS sp_eliminar_aparcament_favorit;
DROP PROCEDURE IF EXISTS sp_llistar_aparcaments_favorits_usuari;

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
-- 4. POST /api/usuari/favorits (afegir)
-- ===========================================
-- Afegeix un aparcament a favorits d'un usuari
-- Exemple: CALL sp_afegir_aparcament_favorit(1, 10, @resultat, @error_msg);

DELIMITER //

CREATE PROCEDURE sp_afegir_aparcament_favorit(
    IN p_usuari_id INT,
    IN p_aparcament_id INT,
    OUT p_resultat BOOLEAN,
    OUT p_error_msg VARCHAR(500)
)
BEGIN
    DECLARE v_usuari_existeix INT DEFAULT 0;
    DECLARE v_aparcament_existeix INT DEFAULT 0;

    DECLARE EXIT HANDLER FOR SQLEXCEPTION
    BEGIN
        ROLLBACK;
        SET p_resultat = FALSE;
        SET p_error_msg = 'Error SQL en afegir l\'aparcament a favorits';
    END;

    START TRANSACTION;

    SELECT COUNT(*) INTO v_usuari_existeix
    FROM usuaris
    WHERE id = p_usuari_id;

    IF v_usuari_existeix = 0 THEN
        SET p_resultat = FALSE;
        SET p_error_msg = 'Usuari no trobat';
        ROLLBACK;
    ELSE
        SELECT COUNT(*) INTO v_aparcament_existeix
        FROM aparcaments
        WHERE id = p_aparcament_id;

        IF v_aparcament_existeix = 0 THEN
            SET p_resultat = FALSE;
            SET p_error_msg = 'Aparcament no trobat';
            ROLLBACK;
        ELSE
            INSERT IGNORE INTO usuaris_favorits_aparcaments (
                usuari_id,
                aparcament_id
            ) VALUES (
                p_usuari_id,
                p_aparcament_id
            );

            SET p_resultat = TRUE;
            SET p_error_msg = NULL;
            COMMIT;
        END IF;
    END IF;
END//

DELIMITER ;

-- ===========================================
-- 5. DELETE /api/usuari/favorits/:aparcament_id (eliminar)
-- ===========================================
-- Elimina un aparcament de favorits d'un usuari
-- Exemple: CALL sp_eliminar_aparcament_favorit(1, 10, @resultat, @files_afectades, @error_msg);

DELIMITER //

CREATE PROCEDURE sp_eliminar_aparcament_favorit(
    IN p_usuari_id INT,
    IN p_aparcament_id INT,
    OUT p_resultat BOOLEAN,
    OUT p_files_afectades INT,
    OUT p_error_msg VARCHAR(500)
)
BEGIN
    DECLARE EXIT HANDLER FOR SQLEXCEPTION
    BEGIN
        ROLLBACK;
        SET p_resultat = FALSE;
        SET p_files_afectades = 0;
        SET p_error_msg = 'Error SQL en eliminar l\'aparcament de favorits';
    END;

    START TRANSACTION;

    DELETE FROM usuaris_favorits_aparcaments
    WHERE usuari_id = p_usuari_id
      AND aparcament_id = p_aparcament_id;

    SET p_files_afectades = ROW_COUNT();
    SET p_resultat = TRUE;
    SET p_error_msg = NULL;

    COMMIT;
END//

DELIMITER ;

-- ===========================================
-- 6. GET /api/usuari/favorits (llistar)
-- ===========================================
-- Llista els aparcaments favorits d'un usuari, ordenats per data d'alta
-- Exemple: CALL sp_llistar_aparcaments_favorits_usuari(1, 20, 0);

DELIMITER //

CREATE PROCEDURE sp_llistar_aparcaments_favorits_usuari(
    IN p_usuari_id INT,
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
        ufa.created_at AS data_favorit
    FROM usuaris_favorits_aparcaments ufa
    JOIN aparcaments a ON a.id = ufa.aparcament_id
    WHERE ufa.usuari_id = p_usuari_id
    ORDER BY ufa.created_at DESC
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

USE parklive_db;
DROP PROCEDURE IF EXISTS sp_cercar_aparcaments;

DELIMITER //

CREATE PROCEDURE sp_cercar_aparcaments(
    IN p_ciutat VARCHAR(100),
    IN p_tipus VARCHAR(50),
    IN p_accessibilitat BOOLEAN,
    IN p_carrega_electrica BOOLEAN,
    IN p_videovigilancia BOOLEAN,
    IN p_obert_24h BOOLEAN,
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
        AND (p_videovigilancia IS NULL OR a.videovigilancia = p_videovigilancia)
        AND (p_obert_24h IS NULL OR a.obert_24h = p_obert_24h)
    ORDER BY
        CASE
            WHEN p_latitud IS NOT NULL AND p_longitud IS NOT NULL THEN distancia_km
            ELSE valoracio_mitjana
        END ASC
    LIMIT p_limit OFFSET p_offset;
END//

DELIMITER ;
