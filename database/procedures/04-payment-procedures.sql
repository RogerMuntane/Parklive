-- Arxiu: 04-payment-procedures.sql
-- Descripció: Aquest arxiu defineix els procediments emmagatzemats (Stored Procedures) per la lògica de base de dades.

USE parklive_db;

-- ===========================================
-- 1. Registrar un pagament de reserva
-- ===========================================
-- Guarda el detall del cobrament rebut per Stripe
-- Exemple: CALL sp_registrar_pagament(7, 1, 23.50, 'targeta_credit', 'completat', 'pi_XXXX_XXXX', @pagament_id, @error_msg); -- reserva_id pot ser NULL per a subscripcions

DROP PROCEDURE IF EXISTS sp_registrar_pagament;

DELIMITER //

CREATE PROCEDURE sp_registrar_pagament(
    IN p_reserva_id INT,
    IN p_usuari_id INT,
    IN p_import DECIMAL(10,2),
    IN p_metode VARCHAR(50),
    IN p_estat VARCHAR(50),
    IN p_referencia_externa VARCHAR(255),
    OUT p_pagament_id INT,
    OUT p_error_msg VARCHAR(500)
)
BEGIN
    -- Si falla qualsevol query de la transacció salta aquest handler:
    -- 1. Fa un Rollback automàtic per desfer tot els canvis a mitges
    -- 2. Evita inconsistències en taules creuades (ex: pagaments vs reserves)
    DECLARE EXIT HANDLER FOR SQLEXCEPTION
    BEGIN
        ROLLBACK;
        SET p_pagament_id = NULL;
        SET p_error_msg = 'Error al registrar el pagament: Excepció SQL';
    END;

    -- Bloc transaccional per assegurar l'atomicidad (garanteix operacions segures en cas de caiguda)
    START TRANSACTION;

        -- Registrem l'històric immutabile a la nostra DB vinculat a l'Intent d'Stripe
    INSERT INTO pagaments (
        reserva_id,
        usuari_id,
        import,
        metode,
        estat,
        referencia_externa,
        data_pagament
    ) VALUES (
        p_reserva_id,
        p_usuari_id,
        p_import,
        p_metode,
        p_estat,
        p_referencia_externa,
        CURRENT_TIMESTAMP
    );

    SET p_pagament_id = LAST_INSERT_ID();
    SET p_error_msg = NULL;

    COMMIT;
END//

DELIMITER ;
