
-- STORED PROCEDURES PARKLIVE - GESTIÓ DE CONTRIBUCIONS
USE parklive_db;
-- Eliminar procedures si existeixen (per poder recrear-los)
DROP PROCEDURE IF EXISTS sp_crear_contribucio;
DROP PROCEDURE IF EXISTS sp_votar_contribucio;
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
            estat_validacio,
            validada,
            punts_guanyats,
            latitud,
            longitud
        ) VALUES (
            p_usuari_id,
            p_estat_reportat,
            p_dades,
            'pendent',
            FALSE,  -- Les contribucions necessiten validació
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
-- 2. POST /api/contribucions/{id}/vots
-- ===========================================
-- Registra vot comunitari i resol l'estat quan hi ha quòrum.
-- Quòrum mínim: 3 vots, i almenys 2 en el mateix sentit amb >=66%.
-- Exemple: CALL sp_votar_contribucio(10, 22, 'confirma', @estat, @error);

CREATE PROCEDURE sp_votar_contribucio(
    IN p_contribucio_id BIGINT,
    IN p_validador_id INT,
    IN p_vot VARCHAR(20),
    OUT p_estat_final VARCHAR(20),
    OUT p_error_msg VARCHAR(500)
)
BEGIN
    DECLARE v_reporter_id INT;
    DECLARE v_estat_actual VARCHAR(20);
    DECLARE v_confirma INT DEFAULT 0;
    DECLARE v_refuta INT DEFAULT 0;
    DECLARE v_total INT DEFAULT 0;

    DECLARE EXIT HANDLER FOR SQLEXCEPTION
    BEGIN
        ROLLBACK;
        SET p_estat_final = NULL;
        SET p_error_msg = 'Error al votar contribució: Excepció SQL';
    END;

    START TRANSACTION;
    SET p_error_msg = NULL;

    IF p_vot NOT IN ('confirma', 'refuta') THEN
        SET p_error_msg = 'El vot ha de ser confirma o refuta';
        ROLLBACK;
    END IF;

    IF p_error_msg IS NULL THEN
        SELECT usuari_id, estat_validacio
        INTO v_reporter_id, v_estat_actual
        FROM contribucions
        WHERE id = p_contribucio_id
        FOR UPDATE;

        IF v_reporter_id IS NULL THEN
            SET p_error_msg = 'Contribució no trobada';
            ROLLBACK;
        END IF;
    END IF;

    IF p_error_msg IS NULL AND v_reporter_id = p_validador_id THEN
        SET p_error_msg = 'No pots validar la teva pròpia contribució';
        ROLLBACK;
    END IF;

    IF p_error_msg IS NULL AND v_estat_actual IN ('validada', 'rebutjada') THEN
        SET p_error_msg = 'La contribució ja està resolta';
        ROLLBACK;
    END IF;

    IF p_error_msg IS NULL THEN
        INSERT INTO validacions_contribucions (contribucio_id, validador_id, vot)
        VALUES (p_contribucio_id, p_validador_id, p_vot)
        ON DUPLICATE KEY UPDATE
            vot = VALUES(vot),
            updated_at = CURRENT_TIMESTAMP;

        SELECT
            COALESCE(SUM(CASE WHEN vot = 'confirma' THEN 1 ELSE 0 END), 0),
            COALESCE(SUM(CASE WHEN vot = 'refuta' THEN 1 ELSE 0 END), 0),
            COUNT(*)
        INTO v_confirma, v_refuta, v_total
        FROM validacions_contribucions
        WHERE contribucio_id = p_contribucio_id;

        UPDATE contribucions
        SET
            validacions_confirma = v_confirma,
            validacions_refuta = v_refuta
        WHERE id = p_contribucio_id;

        IF v_total >= 3 AND v_confirma >= 2 AND (v_confirma / v_total) >= 0.66 THEN
            UPDATE contribucions
            SET
                estat_validacio = 'validada',
                validada = TRUE
            WHERE id = p_contribucio_id;
            SET p_estat_final = 'validada';
        ELSEIF v_total >= 3 AND v_refuta >= 2 AND (v_refuta / v_total) >= 0.66 THEN
            UPDATE contribucions
            SET
                estat_validacio = 'rebutjada',
                validada = FALSE
            WHERE id = p_contribucio_id;
            SET p_estat_final = 'rebutjada';
        ELSE
            SET p_estat_final = 'pendent';
        END IF;

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
    ORDER BY c.created_at DESC
    LIMIT p_limit OFFSET p_offset;
END//

DELIMITER ;