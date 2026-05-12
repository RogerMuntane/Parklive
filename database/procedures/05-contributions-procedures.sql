
-- STORED PROCEDURES PARKLIVE - GESTIÓ DE CONTRIBUCIONS
USE parklive_db;
-- Eliminar procedures si existeixen (per poder recrear-los)
DROP PROCEDURE IF EXISTS sp_crear_contribucio;
DROP PROCEDURE IF EXISTS sp_llistar_contribucions_disponibilitat;

-- ===========================================
-- 1. POST /api/contribucions (reportar)
-- ===========================================
-- Crea una nova contribució d'un usuari
-- Exemple: CALL sp_crear_contribucio(1, 'ocupat', NULL, 5, 41.3851, 2.1734, @contribucio_id, @error_msg);

DELIMITER //

CREATE PROCEDURE sp_crear_contribucio(
    IN p_usuari_id INT,
    IN p_estat_reportat VARCHAR(50),
    IN p_dades JSON,
    IN p_punts_guanyats INT,
    IN p_latitud DECIMAL(10,8),
    IN p_longitud DECIMAL(11,8),
    OUT p_contribucio_id BIGINT,
    OUT p_error_msg VARCHAR(500)
)
BEGIN
    DECLARE EXIT HANDLER FOR SQLEXCEPTION
    BEGIN
        ROLLBACK;
        SET p_contribucio_id = NULL;
        SET p_error_msg = 'Error al crear la contribució: Excepció SQL';
    END;

    -- Iniciar transacció
    START TRANSACTION;
    SET p_error_msg = NULL;

    IF p_estat_reportat NOT IN ('lliure', 'ocupat') THEN
        SET p_contribucio_id = NULL;
        SET p_error_msg = 'estat_reportat ha de ser lliure o ocupat';
        ROLLBACK;
    END IF;

    IF p_error_msg IS NULL THEN
        -- Insertar la contribució
        INSERT INTO contribucions (
            usuari_id,
            estat_reportat,
            dades,
            punts_guanyats,
            latitud,
            longitud
        ) VALUES (
            p_usuari_id,
            p_estat_reportat,
            p_dades,
            IFNULL(p_punts_guanyats, 5),
            p_latitud,
            p_longitud
        );

        SET p_contribucio_id = LAST_INSERT_ID();
        SET p_error_msg = NULL;

        COMMIT;
    END IF;
END//


-- ===========================================
-- 3. GET /api/reports/disponibilitat
-- ===========================================
-- Llista contribucions de disponibilitat per mostrar-les al mapa.
-- Exemple: CALL sp_llistar_contribucions_disponibilitat(100, 0);

CREATE PROCEDURE sp_llistar_contribucions_disponibilitat(
    IN p_limit INT,
    IN p_offset INT
)
BEGIN
    SELECT
        c.id,
        c.usuari_id,
        c.estat_reportat,
        c.dades,
        c.latitud,
        c.longitud,
        c.created_at
    FROM contribucions c
    WHERE c.created_at >= NOW() - INTERVAL 30 MINUTE
    ORDER BY c.created_at DESC
    LIMIT p_limit OFFSET p_offset;
END//

DELIMITER ;