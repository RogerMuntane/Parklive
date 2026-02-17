
-- STORED PROCEDURES PARKLIVE - GESTIÓ DE APARCAMENTS
USE parklive_db;
-- Eliminar procedures si existeixen (per poder recrear-los)
DROP PROCEDURE IF EXISTS sp_crear_contribucio;

-- ===========================================
-- 1. POST /api/contribucions (reportar)
-- ===========================================
-- Crea una nova contribució d'un usuari
-- Exemple: CALL sp_crear_contribucio(1, 1, 'disponibilitat', 'lliure', NULL, 5, 41.3851, 2.1734, @contribucio_id, @error_msg);

DELIMITER //

CREATE PROCEDURE sp_crear_contribucio(
    IN p_usuari_id INT,
    IN p_aparcament_id INT,
    IN p_tipus VARCHAR(50),
    IN p_estat_reportat VARCHAR(50),
    IN p_dades JSON,
    IN p_punts_guanyats INT,
    IN p_latitud DECIMAL(10,8),
    IN p_longitud DECIMAL(11,8),
    OUT p_contribucio_id BIGINT,
    OUT p_error_msg VARCHAR(500)
)
BEGIN
    DECLARE v_aparcament_existeix INT;

    DECLARE EXIT HANDLER FOR SQLEXCEPTION
    BEGIN
        ROLLBACK;
        SET p_contribucio_id = NULL;
        SET p_error_msg = 'Error al crear la contribució: Excepció SQL';
    END;

    -- Iniciar transacció
    START TRANSACTION;

    -- Validar que l'aparcament existeix
    SELECT COUNT(*) INTO v_aparcament_existeix
    FROM aparcaments
    WHERE id = p_aparcament_id;

    IF v_aparcament_existeix = 0 THEN
        SET p_contribucio_id = NULL;
        SET p_error_msg = 'Aparcament no trobat';
        ROLLBACK;
    ELSE
        -- Insertar la contribució
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
        ) VALUES (
            p_usuari_id,
            p_aparcament_id,
            p_tipus,
            p_estat_reportat,
            p_dades,
            FALSE,  -- Les contribucions necessiten validació
            IFNULL(p_punts_guanyats, 5),
            p_latitud,
            p_longitud
        );

        SET p_contribucio_id = LAST_INSERT_ID();
        SET p_error_msg = NULL;

        -- Si és una contribució de disponibilitat, afegir a l'històric
        IF p_tipus = 'disponibilitat' THEN
            INSERT INTO historic_disponibilitat (
                aparcament_id,
                places_disponibles,
                font
            )
            SELECT
                p_aparcament_id,
                CASE
                    WHEN p_estat_reportat = 'lliure' THEN capacitat_total
                    WHEN p_estat_reportat = 'ocupat' THEN 0
                    WHEN p_estat_reportat = 'parcial' THEN FLOOR(capacitat_total / 2)
                    ELSE places_disponibles
                END,
                'usuari'
            FROM aparcaments
            WHERE id = p_aparcament_id;
        END IF;

        COMMIT;
    END IF;
END//

DELIMITER ;