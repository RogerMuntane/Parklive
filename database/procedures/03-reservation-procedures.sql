USE parklive_db;
-- Eliminar procedures si existeixen (per poder recrear-los)
DROP PROCEDURE IF EXISTS sp_crear_reserva;
DROP PROCEDURE IF EXISTS sp_obtenir_historial_reserves;
DROP PROCEDURE IF EXISTS sp_actualitzar_estat_reserva;

-- ===========================================
-- 1. POST /api/reserves (crear reserva)
-- ===========================================
-- Crea una nova reserva per a un usuari
-- Exemple: CALL sp_crear_reserva(1, 1, '2026-02-20 10:00:00', '2026-02-20 18:00:00', 25.50, 0.00, 'Notes opcionals', @reserva_id, @codi_reserva, @error_msg);

DELIMITER //

CREATE PROCEDURE sp_crear_reserva(
    IN p_usuari_id INT,
    IN p_aparcament_id INT,
    IN p_data_entrada DATETIME,
    IN p_data_sortida DATETIME,
    IN p_preu_total DECIMAL(10,2),
    IN p_descompte_aplicat DECIMAL(10,2),
    IN p_notes TEXT,
    OUT p_reserva_id INT,
    OUT p_codi_reserva VARCHAR(20),
    OUT p_error_msg VARCHAR(500)
)
BEGIN
    DECLARE v_places_disponibles INT;
    DECLARE v_aparcament_estat VARCHAR(50);
    DECLARE v_codi_unic VARCHAR(20);
    DECLARE v_existeix INT DEFAULT 1;

    DECLARE EXIT HANDLER FOR SQLEXCEPTION
    BEGIN
        ROLLBACK;
        SET p_reserva_id = NULL;
        SET p_codi_reserva = NULL;
        SET p_error_msg = 'Error al crear la reserva: Excepció SQL';
    END;

    -- Iniciar transacció
    START TRANSACTION;

    -- Validar que les dates siguin correctes
    IF p_data_entrada >= p_data_sortida THEN
        SET p_reserva_id = NULL;
        SET p_codi_reserva = NULL;
        SET p_error_msg = 'La data de sortida ha de ser posterior a la data d''entrada';
        ROLLBACK;
    ELSE
        -- Verificar disponibilitat de l'aparcament
        SELECT places_disponibles, estat
        INTO v_places_disponibles, v_aparcament_estat
        FROM aparcaments
        WHERE id = p_aparcament_id;

        IF v_places_disponibles IS NULL THEN
            SET p_reserva_id = NULL;
            SET p_codi_reserva = NULL;
            SET p_error_msg = 'Aparcament no trobat';
            ROLLBACK;
        ELSEIF v_aparcament_estat != 'actiu' THEN
            SET p_reserva_id = NULL;
            SET p_codi_reserva = NULL;
            SET p_error_msg = 'L''aparcament no està disponible';
            ROLLBACK;
        ELSEIF v_places_disponibles <= 0 THEN
            SET p_reserva_id = NULL;
            SET p_codi_reserva = NULL;
            SET p_error_msg = 'No hi ha places disponibles';
            ROLLBACK;
        ELSE
            -- Generar codi únic de reserva
            WHILE v_existeix > 0 DO
                SET v_codi_unic = CONCAT(
                    'RES',
                    LPAD(p_aparcament_id, 4, '0'),
                    LPAD(FLOOR(RAND() * 999999), 6, '0')
                );

                SELECT COUNT(*) INTO v_existeix
                FROM reserves
                WHERE codi_reserva = v_codi_unic;
            END WHILE;

            -- Insertar la nova reserva
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
            ) VALUES (
                p_usuari_id,
                p_aparcament_id,
                p_data_entrada,
                p_data_sortida,
                'pendent',
                p_preu_total,
                IFNULL(p_descompte_aplicat, 0.00),
                v_codi_unic,
                p_notes
            );

            SET p_reserva_id = LAST_INSERT_ID();
            SET p_codi_reserva = v_codi_unic;
            SET p_error_msg = NULL;

            -- Actualitzar places disponibles
            UPDATE aparcaments
            SET places_disponibles = places_disponibles - 1
            WHERE id = p_aparcament_id;

            COMMIT;
        END IF;
    END IF;
END//

DELIMITER ;

-- ===========================================
-- 3. Actualitzar estat de reserva (intern)
-- ===========================================
-- Canvia l'estat d'una reserva i allibera plaça si es cancel·la
-- Exemple: CALL sp_actualitzar_estat_reserva(7, 'confirmada', @error_msg);

DELIMITER //

CREATE PROCEDURE sp_actualitzar_estat_reserva(
    IN p_reserva_id INT,
    IN p_nou_estat VARCHAR(50),
    OUT p_error_msg VARCHAR(500)
)
BEGIN
    DECLARE v_estat_actual VARCHAR(50);
    DECLARE v_aparcament_id INT;

    DECLARE EXIT HANDLER FOR SQLEXCEPTION
    BEGIN
        ROLLBACK;
        SET p_error_msg = 'Error al actualitzar la reserva: Excepció SQL';
    END;

    START TRANSACTION;

    SELECT estat, aparcament_id INTO v_estat_actual, v_aparcament_id
    FROM reserves
    WHERE id = p_reserva_id;

    IF v_estat_actual IS NULL THEN
        SET p_error_msg = 'Reserva no trobada';
        ROLLBACK;
    ELSE
        -- Si estem cancel·lant una reserva que no estava ja cancel·lada, alliberem plaça
        IF p_nou_estat = 'cancelada' AND v_estat_actual != 'cancelada' THEN
            UPDATE aparcaments
            SET places_disponibles = places_disponibles + 1
            WHERE id = v_aparcament_id;
        END IF;

        UPDATE reserves
        SET estat = p_nou_estat,
            updated_at = CURRENT_TIMESTAMP
        WHERE id = p_reserva_id;

        SET p_error_msg = NULL;
        COMMIT;
    END IF;
END//

DELIMITER ;

-- ===========================================
-- 2. GET /api/usuari/reserves (historial)
-- ===========================================
-- Obté l'historial de reserves d'un usuari
-- Exemple: CALL sp_obtenir_historial_reserves(1, NULL, 20, 0);

DELIMITER //

CREATE PROCEDURE sp_obtenir_historial_reserves(
    IN p_usuari_id INT,
    IN p_estat VARCHAR(50),
    IN p_limit INT,
    IN p_offset INT
)
BEGIN
    SELECT
        r.id,
        r.codi_reserva,
        r.data_entrada,
        r.data_sortida,
        r.estat,
        r.preu_total,
        r.descompte_aplicat,
        r.notes,
        r.created_at,
        r.updated_at,
        a.id as aparcament_id,
        a.nom as aparcament_nom,
        a.adreca as aparcament_adreca,
        a.ciutat as aparcament_ciutat,
        a.tipus as aparcament_tipus,
        a.latitud as aparcament_latitud,
        a.longitud as aparcament_longitud,
        p.id as pagament_id,
        p.estat as pagament_estat,
        p.metode as pagament_metode,
        p.data_pagament
    FROM reserves r
    JOIN aparcaments a ON r.aparcament_id = a.id
    LEFT JOIN pagaments p ON r.id = p.reserva_id
    WHERE r.usuari_id = p_usuari_id
        AND (p_estat IS NULL OR r.estat = p_estat)
    ORDER BY r.created_at DESC
    LIMIT p_limit OFFSET p_offset;
END//

DELIMITER ;