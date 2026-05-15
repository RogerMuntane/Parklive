-- Arxiu: 00_cleanup.sql
-- Descripció: Aquest arxiu conté sentències (INSERT) per poblar inicialment la base de dades amb dades fictícies de prova.

-- DADES DE PROVA PARKLIVE - SEED DATA COMPLET
USE parklive_db;
-- Desactivar comprovació de claus forànies temporalment
-- Això s'apaga momentàniament per evitar errors al fer TRUNCATE de taules que tenen restriccions referencials amb d'altres
SET FOREIGN_KEY_CHECKS = 0;
-- Netejar taules (només per desenvolupament!)
TRUNCATE TABLE usuaris_recompenses;
TRUNCATE TABLE recompenses;
TRUNCATE TABLE contribucions;
TRUNCATE TABLE respostes_valoracions;
TRUNCATE TABLE valoracions;
TRUNCATE TABLE factures;
TRUNCATE TABLE pagaments;
TRUNCATE TABLE reserves;
TRUNCATE TABLE fotografies_aparcaments;
TRUNCATE TABLE historic_disponibilitat;
TRUNCATE TABLE aparcaments;
TRUNCATE TABLE notificacions;
TRUNCATE TABLE missatges_suport;
TRUNCATE TABLE articles_blog;
TRUNCATE TABLE faqs;
TRUNCATE TABLE sessions;
TRUNCATE TABLE subscripcions;
TRUNCATE TABLE usuaris;
TRUNCATE TABLE configuracio_sistema;
-- Reactivar comprovació de claus forànies
SET FOREIGN_KEY_CHECKS = 1;
