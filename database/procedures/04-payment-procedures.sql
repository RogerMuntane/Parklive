USE parklive_db;

-- ===========================================
-- 1. Registrar un pagament de reserva
-- ===========================================
-- Guarda el detall del cobrament rebut per Stripe
-- Exemple: CALL sp_registrar_pagament(7, 1, 23.50, 'targeta_credit', 'completat', 'pi_XXXX_XXXX', @pagament_id, @error_msg);

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
    DECLARE EXIT HANDLER FOR SQLEXCEPTION
    BEGIN
        ROLLBACK;
        SET p_pagament_id = NULL;
        SET p_error_msg = 'Error al registrar el pagament: Excepció SQL';
    END;

    START TRANSACTION;

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
