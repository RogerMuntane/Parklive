-- STORED PROCEDURES PARKLIVE - GESTIÓ D'USUARIS
USE parklive_db;
-- Eliminar procedures si existeixen (per poder recrear-los)
DROP PROCEDURE IF EXISTS sp_comprovar_email_existeix;
DROP PROCEDURE IF EXISTS sp_insertar_usuari;
DROP PROCEDURE IF EXISTS sp_actualitzar_contrasenya;
DROP PROCEDURE IF EXISTS sp_obtenir_usuari_per_email;
DROP PROCEDURE IF EXISTS sp_obtenir_usuari_per_id;
DROP PROCEDURE IF EXISTS sp_actualitzar_ultima_connexio;
-- 1. COMPROVAR SI EXISTEIX EL EMAIL
-- Retorna 1 si l'email existeix, 0 si no existeix
-- Exemple: CALL sp_comprovar_email_existeix('joan@example.com', @existeix);
DELIMITER //

CREATE PROCEDURE sp_comprovar_email_existeix(
    IN p_email VARCHAR(255),
    OUT p_existeix BOOLEAN
)
BEGIN
DECLARE v_count INT;
-- Comprovar si l'email existeix (només usuaris actius o inactius)
SELECT COUNT(*) INTO v_count
FROM usuaris
WHERE email = p_email
    AND estat IN ('actiu', 'inactiu', 'suspès');
-- Retornar resultat
SET p_existeix = (v_count > 0);
END//

DELIMITER ;
-- 2. INSERTAR NOU USUARI
-- Retorna l'ID del nou usuari creat o NULL si hi ha error
-- Exemple: CALL sp_insertar_usuari('Joan', 'García', 'joan@test.com', '$2y$10$...', '666777888', 'basic', @nou_id, @error_msg);
DELIMITER //

CREATE PROCEDURE sp_insertar_usuari(
    IN p_nom VARCHAR(100),
    IN p_cognoms VARCHAR(150),
    IN p_email VARCHAR(255),
    IN p_contrasenya_hash VARCHAR(255),
    IN p_telefon VARCHAR(20),
    IN p_tipus_usuari ENUM('basic', 'premium', 'operador', 'admin'),
    OUT p_nou_id INT,
    OUT p_error_msg VARCHAR(500)
)
BEGIN
DECLARE v_email_existeix BOOLEAN DEFAULT FALSE;
DECLARE EXIT HANDLER FOR SQLEXCEPTION BEGIN -- Si hi ha error, fer rollback i retornar missatge
    ROLLBACK;
SET p_nou_id = NULL;
SET p_error_msg = 'Error al insertar usuari: Excepcio SQL';
END;
-- Iniciar transacció
START TRANSACTION;
-- Validar que l'email no estigui buit
IF p_email IS NULL
OR TRIM(p_email) = '' THEN
SET p_nou_id = NULL;
SET p_error_msg = 'Email no pot estar buit';
ROLLBACK;
ELSE -- Comprovar si l'email ja existeix
CALL sp_comprovar_email_existeix(p_email, v_email_existeix);
IF v_email_existeix THEN
SET p_nou_id = NULL;
SET p_error_msg = 'Aquest email ja està registrat';
ROLLBACK;
ELSE -- Insertar nou usuari
INSERT INTO usuaris (
        nom,
        cognoms,
        email,
        contrasenya_hash,
        telefon,
        tipus_usuari,
        estat,
        email_verificat,
        punts_gamificacio,
        data_registre,
        ultima_connexio
    )
VALUES (
        TRIM(p_nom),
        TRIM(p_cognoms),
        TRIM(LOWER(p_email)),
        p_contrasenya_hash,
        p_telefon,
        COALESCE(p_tipus_usuari, 'basic'),
        'actiu',
        FALSE,
        0,
        NOW(),
        NOW()
    );
-- Obtenir l'ID del nou usuari
SET p_nou_id = LAST_INSERT_ID();
SET p_error_msg = NULL;
-- Confirmar transacció
COMMIT;
END IF;
END IF;
END//

DELIMITER ;
-- 3. ACTUALITZAR CONTRASENYA
-- Actualitza la contrasenya d'un usuari per email
-- Retorna 1 si s'ha actualitzat correctament, 0 si no s'ha trobat l'usuari
-- Exemple: CALL sp_actualitzar_contrasenya('joan@test.com', '$2y$10$...', @actualitzat, @error_msg);
DELIMITER //

CREATE PROCEDURE sp_actualitzar_contrasenya(
    IN p_email VARCHAR(255),
    IN p_nova_contrasenya_hash VARCHAR(255),
    OUT p_actualitzat BOOLEAN,
    OUT p_error_msg VARCHAR(500)
)
BEGIN
DECLARE v_usuari_id INT;
DECLARE EXIT HANDLER FOR SQLEXCEPTION BEGIN ROLLBACK;
SET p_actualitzat = FALSE;
SET p_error_msg = 'Error al actualitzar contrasenya: Excepció SQL';
END;
START TRANSACTION;
-- Validar que l'email no estigui buit
IF p_email IS NULL
OR TRIM(p_email) = '' THEN
SET p_actualitzat = FALSE;
SET p_error_msg = 'Email no pot estar buit';
ROLLBACK;
ELSE -- Comprovar si l'usuari existeix
SELECT id INTO v_usuari_id
FROM usuaris
WHERE email = TRIM(LOWER(p_email))
    AND estat IN ('actiu', 'inactiu', 'suspès')
LIMIT 1;
IF v_usuari_id IS NULL THEN
SET p_actualitzat = FALSE;
SET p_error_msg = 'Usuari no trobat o compte eliminat';
ROLLBACK;
ELSE -- Actualitzar contrasenya
UPDATE usuaris
SET contrasenya_hash = p_nova_contrasenya_hash,
    updated_at = NOW()
WHERE id = v_usuari_id;
SET p_actualitzat = TRUE;
SET p_error_msg = NULL;
COMMIT;
END IF;
END IF;
END//

DELIMITER ;
-- 4. OBTENIR USUARI PER EMAIL
-- Retorna tota la informació d'un usuari per email
-- Exemple: CALL sp_obtenir_usuari_per_email('joan@test.com');
DELIMITER //

CREATE PROCEDURE sp_obtenir_usuari_per_email(IN p_email VARCHAR(255))
BEGIN -- Retornar informació completa de l'usuari
SELECT id,
    nom,
    cognoms,
    email,
    contrasenya_hash,
    telefon,
    data_registre,
    ultima_connexio,
    tipus_usuari,
    estat,
    email_verificat,
    punts_gamificacio,
    preferencies,
    created_at,
    updated_at
FROM usuaris
WHERE email = TRIM(LOWER(p_email))
    AND estat != 'eliminat'
LIMIT 1;
END//

DELIMITER ;
-- 5. OBTENIR USUARI PER ID
-- Retorna tota la informació d'un usuari per ID
-- Exemple: CALL sp_obtenir_usuari_per_id(1);
DELIMITER //

CREATE PROCEDURE sp_obtenir_usuari_per_id(IN p_usuari_id INT)
BEGIN
SELECT id,
    nom,
    cognoms,
    email,
    contrasenya_hash,
    telefon,
    data_registre,
    ultima_connexio,
    tipus_usuari,
    estat,
    email_verificat,
    punts_gamificacio,
    preferencies,
    created_at,
    updated_at
FROM usuaris
WHERE id = p_usuari_id
    AND estat != 'eliminat'
LIMIT 1;
END//

DELIMITER ;
-- 6. ACTUALITZAR ÚLTIMA CONNEXIÓ
-- Actualitza la data d'última connexió quan un usuari fa login
-- Exemple: CALL sp_actualitzar_ultima_connexio('joan@test.com');
DELIMITER //

CREATE PROCEDURE sp_actualitzar_ultima_connexio(IN p_email VARCHAR(255))
BEGIN
UPDATE usuaris
SET ultima_connexio = NOW()
WHERE email = TRIM(LOWER(p_email))
    AND estat IN ('actiu', 'premium');
END//

DELIMITER ;
-- EXEMPLES D'ÚS
/*
 
 -- 1. COMPROVAR SI EMAIL EXISTEIX
 CALL sp_comprovar_email_existeix('joan@example.com', @existeix);
 SELECT @existeix as email_existeix;
 
 -- 2. INSERTAR NOU USUARI
 CALL sp_insertar_usuari(
 'Maria',                              -- nom
 'López Fernández',                    -- cognoms
 'maria.lopez@example.com',           -- email
 '$2y$10$abcdefghijklmnopqrstuvwxyz', -- contrasenya_hash
 '666555444',                         -- telefon
 'basic',                             -- tipus_usuari
 @nou_id,                             -- OUT: ID del nou usuari
 @error                               -- OUT: missatge d'error si n'hi ha
 );
 SELECT @nou_id as usuari_id, @error as error_message;
 
 -- 3. ACTUALITZAR CONTRASENYA
 CALL sp_actualitzar_contrasenya(
 'maria.lopez@example.com',           -- email
 '$2y$10$NOVA_CONTRASENYA_HASH',     -- nova contrasenya
 @actualitzat,                        -- OUT: TRUE si s'ha actualitzat
 @error                               -- OUT: missatge d'error
 );
 SELECT @actualitzat as contrasenya_actualitzada, @error as error_message;
 
 -- 4. OBTENIR USUARI PER EMAIL
 CALL sp_obtenir_usuari_per_email('maria.lopez@example.com');
 
 -- 5. OBTENIR USUARI PER ID
 CALL sp_obtenir_usuari_per_id(1);
 
 -- 6. ACTUALITZAR ÚLTIMA CONNEXIÓ
 CALL sp_actualitzar_ultima_connexio('maria.lopez@example.com');
 
 */
-- VERIFICACIÓ: Mostrar tots els procedures creats
SELECT ROUTINE_NAME as 'Procedure',
    ROUTINE_COMMENT as 'Comentari'
FROM information_schema.ROUTINES
WHERE ROUTINE_SCHEMA = 'parklive_db'
    AND ROUTINE_TYPE = 'PROCEDURE'
ORDER BY ROUTINE_NAME;