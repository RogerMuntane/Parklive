-- BASE DE DADES PARKLIVE
-- Crear la base de dades
CREATE DATABASE IF NOT EXISTS parklive_db CHARACTER SET utf8mb4 COLLATE utf8mb4_0900_ai_ci;
USE parklive_db;
-- TAULES D'USUARIS I AUTENTICACIÓ
-- Taula d'usuaris
CREATE TABLE usuaris (
    id INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    nom VARCHAR(100) NOT NULL,
    cognoms VARCHAR(150) NOT NULL,
    email VARCHAR(255) NOT NULL UNIQUE,
    contrasenya_hash VARCHAR(255) NOT NULL,
    telefon VARCHAR(20),
    data_registre TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    ultima_connexio TIMESTAMP NULL,
    tipus_usuari ENUM('basic', 'premium', 'operador', 'admin') DEFAULT 'basic',
    estat ENUM('actiu', 'inactiu', 'suspès', 'eliminat') DEFAULT 'actiu',
    email_verificat BOOLEAN DEFAULT FALSE,
    punts_gamificacio INT UNSIGNED DEFAULT 0,
    preferencies JSON,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    INDEX idx_email (email),
    INDEX idx_tipus_usuari (tipus_usuari),
    INDEX idx_estat (estat)
) ENGINE = InnoDB DEFAULT CHARSET = utf8mb4 COLLATE = utf8mb4_0900_ai_ci;
-- Taula de sessions
CREATE TABLE sessions (
    id INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    usuari_id INT UNSIGNED NOT NULL,
    token VARCHAR(255) NOT NULL UNIQUE,
    ip_address VARCHAR(45),
    user_agent TEXT,
    expires_at TIMESTAMP NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (usuari_id) REFERENCES usuaris(id) ON DELETE CASCADE,
    INDEX idx_token (token),
    INDEX idx_expires (expires_at)
) ENGINE = InnoDB DEFAULT CHARSET = utf8mb4 COLLATE = utf8mb4_0900_ai_ci;
-- Taula de subscripcions premium
CREATE TABLE subscripcions (
    id INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    usuari_id INT UNSIGNED NOT NULL,
    tipus ENUM('mensual', 'trimestral', 'anual') NOT NULL,
    estat ENUM('activa', 'cancel·lada', 'caducada') DEFAULT 'activa',
    data_inici DATE NOT NULL,
    data_final DATE NOT NULL,
    preu DECIMAL(10, 2) NOT NULL,
    metode_pagament ENUM('targeta', 'paypal', 'altres') NOT NULL,
    auto_renovacio BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (usuari_id) REFERENCES usuaris(id) ON DELETE CASCADE,
    INDEX idx_usuari (usuari_id),
    INDEX idx_estat (estat)
) ENGINE = InnoDB DEFAULT CHARSET = utf8mb4 COLLATE = utf8mb4_unicode_ci;
-- TAULES D'APARCAMENTS
-- Taula d'aparcaments
CREATE TABLE aparcaments (
    id INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    nom VARCHAR(200) NOT NULL,
    tipus ENUM(
        'carrer',
        'cobert',
        'aire_lliure',
        'subterrani',
        'parking_public',
        'parking_privat'
    ) NOT NULL,
    adreca VARCHAR(300) NOT NULL,
    ciutat VARCHAR(100) NOT NULL,
    codi_postal VARCHAR(10),
    latitud DECIMAL(10, 8) NOT NULL,
    longitud DECIMAL(11, 8) NOT NULL,
    capacitat_total INT UNSIGNED NOT NULL,
    places_disponibles INT UNSIGNED DEFAULT 0,
    tarifa_hora DECIMAL(6, 2),
    tarifa_dia DECIMAL(8, 2),
    horari_obertura TIME,
    horari_tancament TIME,
    obert_24h BOOLEAN DEFAULT FALSE,
    caracteristiques JSON,
    accessibilitat BOOLEAN DEFAULT FALSE,
    carrega_electrica BOOLEAN DEFAULT FALSE,
    videovigilancia BOOLEAN DEFAULT FALSE,
    altura_maxima DECIMAL(4, 2),
    estat ENUM('actiu', 'inactiu', 'manteniment', 'complet') DEFAULT 'actiu',
    operador_id INT UNSIGNED,
    valoracio_mitjana DECIMAL(3, 2) DEFAULT 0.00,
    total_valoracions INT UNSIGNED DEFAULT 0,
    verificat BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    INDEX idx_ciutat (ciutat),
    INDEX idx_tipus (tipus),
    INDEX idx_estat (estat),
    INDEX idx_latitud_longitud (latitud, longitud),
    FOREIGN KEY (operador_id) REFERENCES usuaris(id) ON DELETE
    SET NULL
) ENGINE = InnoDB DEFAULT CHARSET = utf8mb4 COLLATE = utf8mb4_unicode_ci;
-- Taula d'històric de disponibilitat
CREATE TABLE historic_disponibilitat (
    id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    aparcament_id INT UNSIGNED NOT NULL,
    places_disponibles INT UNSIGNED NOT NULL,
    timestamp TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    font ENUM('sensor', 'usuari', 'operador', 'sistema') NOT NULL,
    FOREIGN KEY (aparcament_id) REFERENCES aparcaments(id) ON DELETE CASCADE,
    INDEX idx_aparcament (aparcament_id),
    INDEX idx_timestamp (timestamp)
) ENGINE = InnoDB DEFAULT CHARSET = utf8mb4 COLLATE = utf8mb4_0900_ai_ci;
-- Taula de fotografies d'aparcaments
CREATE TABLE fotografies_aparcaments (
    id INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    aparcament_id INT UNSIGNED NOT NULL,
    usuari_id INT UNSIGNED,
    url VARCHAR(500) NOT NULL,
    descripcio TEXT,
    verificada BOOLEAN DEFAULT FALSE,
    ordre INT UNSIGNED DEFAULT 0,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (aparcament_id) REFERENCES aparcaments(id) ON DELETE CASCADE,
    FOREIGN KEY (usuari_id) REFERENCES usuaris(id) ON DELETE
    SET NULL,
        INDEX idx_aparcament (aparcament_id)
) ENGINE = InnoDB DEFAULT CHARSET = utf8mb4 COLLATE = utf8mb4_unicode_ci;
-- TAULES DE RESERVES I PAGAMENTS
-- Taula de reserves
CREATE TABLE reserves (
    id INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    usuari_id INT UNSIGNED NOT NULL,
    aparcament_id INT UNSIGNED NOT NULL,
    data_entrada DATETIME NOT NULL,
    data_sortida DATETIME NOT NULL,
    estat ENUM(
        'pendent',
        'confirmada',
        'en_curs',
        'finalitzada',
        'cancel·lada'
    ) DEFAULT 'pendent',
    preu_total DECIMAL(10, 2) NOT NULL,
    descompte_aplicat DECIMAL(10, 2) DEFAULT 0.00,
    codi_reserva VARCHAR(20) UNIQUE NOT NULL,
    notes TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (usuari_id) REFERENCES usuaris(id) ON DELETE CASCADE,
    FOREIGN KEY (aparcament_id) REFERENCES aparcaments(id) ON DELETE CASCADE,
    INDEX idx_usuari (usuari_id),
    INDEX idx_aparcament (aparcament_id),
    INDEX idx_estat (estat),
    INDEX idx_codi (codi_reserva)
) ENGINE = InnoDB DEFAULT CHARSET = utf8mb4 COLLATE = utf8mb4_0900_ai_ci;
-- Taula de pagaments
CREATE TABLE pagaments (
    id INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    reserva_id INT UNSIGNED NOT NULL,
    usuari_id INT UNSIGNED NOT NULL,
    import DECIMAL(10, 2) NOT NULL,
    metode ENUM(
        'targeta_credit',
        'targeta_debit',
        'paypal',
        'apple_pay',
        'google_pay'
    ) NOT NULL,
    estat ENUM(
        'pendent',
        'processat',
        'completat',
        'fallit',
        'reemborsat'
    ) DEFAULT 'pendent',
    referencia_externa VARCHAR(255),
    data_pagament TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (reserva_id) REFERENCES reserves(id) ON DELETE CASCADE,
    FOREIGN KEY (usuari_id) REFERENCES usuaris(id) ON DELETE CASCADE,
    INDEX idx_reserva (reserva_id),
    INDEX idx_usuari (usuari_id),
    INDEX idx_estat (estat)
) ENGINE = InnoDB DEFAULT CHARSET = utf8mb4 COLLATE = utf8mb4_0900_ai_ci;
-- Taula de factures
CREATE TABLE factures (
    id INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    pagament_id INT UNSIGNED NOT NULL,
    usuari_id INT UNSIGNED NOT NULL,
    numero_factura VARCHAR(50) UNIQUE NOT NULL,
    import_subtotal DECIMAL(10, 2) NOT NULL,
    iva DECIMAL(10, 2) NOT NULL,
    import_total DECIMAL(10, 2) NOT NULL,
    data_emissio DATE NOT NULL,
    pdf_url VARCHAR(500),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (pagament_id) REFERENCES pagaments(id) ON DELETE CASCADE,
    FOREIGN KEY (usuari_id) REFERENCES usuaris(id) ON DELETE CASCADE,
    INDEX idx_usuari (usuari_id),
    INDEX idx_numero (numero_factura)
) ENGINE = InnoDB DEFAULT CHARSET = utf8mb4 COLLATE = utf8mb4_0900_ai_ci;
-- TAULES DE VALORACIONS I RESSENYES
-- Taula de valoracions
CREATE TABLE valoracions (
    id INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    usuari_id INT UNSIGNED NOT NULL,
    aparcament_id INT UNSIGNED NOT NULL,
    puntuacio TINYINT UNSIGNED NOT NULL CHECK (
        puntuacio BETWEEN 1 AND 5
    ),
    comentari TEXT,
    aspectes_valorats JSON,
    verificada BOOLEAN DEFAULT FALSE,
    util_count INT UNSIGNED DEFAULT 0,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (usuari_id) REFERENCES usuaris(id) ON DELETE CASCADE,
    FOREIGN KEY (aparcament_id) REFERENCES aparcaments(id) ON DELETE CASCADE,
    UNIQUE KEY unique_user_parking (usuari_id, aparcament_id),
    INDEX idx_aparcament (aparcament_id),
    INDEX idx_puntuacio (puntuacio)
) ENGINE = InnoDB DEFAULT CHARSET = utf8mb4 COLLATE = utf8mb4_0900_ai_ci;
-- Taula de respostes a valoracions
CREATE TABLE respostes_valoracions (
    id INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    valoracio_id INT UNSIGNED NOT NULL,
    usuari_id INT UNSIGNED NOT NULL,
    text TEXT NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (valoracio_id) REFERENCES valoracions(id) ON DELETE CASCADE,
    FOREIGN KEY (usuari_id) REFERENCES usuaris(id) ON DELETE CASCADE,
    INDEX idx_valoracio (valoracio_id)
) ENGINE = InnoDB DEFAULT CHARSET = utf8mb4 COLLATE = utf8mb4_0900_ai_ci;
-- TAULES DE COL·LABORACIÓ I GAMIFICACIÓ
-- Taula de contribucions d'usuaris
CREATE TABLE contribucions (
    id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    usuari_id INT UNSIGNED NOT NULL,
    aparcament_id INT UNSIGNED NOT NULL,
    tipus ENUM(
        'disponibilitat',
        'foto',
        'informacio',
        'correccio'
    ) NOT NULL,
    estat_reportat ENUM('lliure', 'ocupat', 'parcial') NULL,
    dades JSON,
    validada BOOLEAN DEFAULT FALSE,
    punts_guanyats INT UNSIGNED DEFAULT 0,
    latitud DECIMAL(10, 8),
    longitud DECIMAL(11, 8),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (usuari_id) REFERENCES usuaris(id) ON DELETE CASCADE,
    FOREIGN KEY (aparcament_id) REFERENCES aparcaments(id) ON DELETE CASCADE,
    INDEX idx_usuari (usuari_id),
    INDEX idx_aparcament (aparcament_id),
    INDEX idx_tipus (tipus)
) ENGINE = InnoDB DEFAULT CHARSET = utf8mb4 COLLATE = utf8mb4_0900_ai_ci;
-- Taula de recompenses i insignies
CREATE TABLE recompenses (
    id INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    nom VARCHAR(100) NOT NULL,
    descripcio TEXT,
    tipus ENUM(
        'insignia',
        'descompte',
        'premium_temporal',
        'punts_extra'
    ) NOT NULL,
    requisit_punts INT UNSIGNED NOT NULL,
    valor JSON,
    icona_url VARCHAR(500),
    activa BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
) ENGINE = InnoDB DEFAULT CHARSET = utf8mb4 COLLATE = utf8mb4_0900_ai_ci;
-- Taula de recompenses d'usuaris
CREATE TABLE usuaris_recompenses (
    id INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    usuari_id INT UNSIGNED NOT NULL,
    recompensa_id INT UNSIGNED NOT NULL,
    data_obtencio TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    utilitzada BOOLEAN DEFAULT FALSE,
    data_utilitzacio TIMESTAMP NULL,
    FOREIGN KEY (usuari_id) REFERENCES usuaris(id) ON DELETE CASCADE,
    FOREIGN KEY (recompensa_id) REFERENCES recompenses(id) ON DELETE CASCADE,
    INDEX idx_usuari (usuari_id),
    UNIQUE KEY unique_user_reward (usuari_id, recompensa_id)
) ENGINE = InnoDB DEFAULT CHARSET = utf8mb4 COLLATE = utf8mb4_0900_ai_ci;
-- TAULES DE CONTINGUT I BLOG
-- Taula d'articles del blog
CREATE TABLE articles_blog (
    id INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    titol VARCHAR(255) NOT NULL,
    slug VARCHAR(255) UNIQUE NOT NULL,
    contingut TEXT NOT NULL,
    resum VARCHAR(500),
    autor_id INT UNSIGNED NOT NULL,
    categoria ENUM(
        'mobilitat',
        'sostenibilitat',
        'novetats',
        'consells',
        'altres'
    ) NOT NULL,
    imatge_destacada VARCHAR(500),
    publicat BOOLEAN DEFAULT FALSE,
    data_publicacio TIMESTAMP NULL,
    visites INT UNSIGNED DEFAULT 0,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (autor_id) REFERENCES usuaris(id) ON DELETE CASCADE,
    INDEX idx_slug (slug),
    INDEX idx_publicat (publicat),
    INDEX idx_categoria (categoria)
) ENGINE = InnoDB DEFAULT CHARSET = utf8mb4 COLLATE = utf8mb4_0900_ai_ci;
-- Taula de FAQ
CREATE TABLE faqs (
    id INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    pregunta VARCHAR(500) NOT NULL,
    resposta TEXT NOT NULL,
    categoria VARCHAR(100),
    ordre INT UNSIGNED DEFAULT 0,
    activa BOOLEAN DEFAULT TRUE,
    visites INT UNSIGNED DEFAULT 0,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    INDEX idx_categoria (categoria),
    INDEX idx_activa (activa)
) ENGINE = InnoDB DEFAULT CHARSET = utf8mb4 COLLATE = utf8mb4_0900_ai_ci;
-- TAULES DE NOTIFICACIONS I COMUNICACIÓ
-- Taula de notificacions
CREATE TABLE notificacions (
    id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    usuari_id INT UNSIGNED NOT NULL,
    tipus ENUM(
        'info',
        'alerta',
        'confirmacio',
        'promocio',
        'sistema'
    ) NOT NULL,
    titol VARCHAR(255) NOT NULL,
    missatge TEXT NOT NULL,
    llegida BOOLEAN DEFAULT FALSE,
    url_accio VARCHAR(500),
    data_llegida TIMESTAMP NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (usuari_id) REFERENCES usuaris(id) ON DELETE CASCADE,
    INDEX idx_usuari (usuari_id),
    INDEX idx_llegida (llegida)
) ENGINE = InnoDB DEFAULT CHARSET = utf8mb4 COLLATE = utf8mb4_0900_ai_ci;
-- Taula de contacte/suport
CREATE TABLE missatges_suport (
    id INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    usuari_id INT UNSIGNED,
    nom VARCHAR(100) NOT NULL,
    email VARCHAR(255) NOT NULL,
    assumpte VARCHAR(255) NOT NULL,
    missatge TEXT NOT NULL,
    categoria ENUM(
        'general',
        'tecnic',
        'pagament',
        'compte',
        'altres'
    ) NOT NULL,
    estat ENUM('pendent', 'en_proces', 'resolt', 'tancat') DEFAULT 'pendent',
    prioritat ENUM('baixa', 'mitjana', 'alta', 'urgent') DEFAULT 'mitjana',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (usuari_id) REFERENCES usuaris(id) ON DELETE
    SET NULL,
        INDEX idx_estat (estat),
        INDEX idx_prioritat (prioritat)
) ENGINE = InnoDB DEFAULT CHARSET = utf8mb4 COLLATE = utf8mb4_unicode_ci;
-- TAULES DE CONFIGURACIÓ I SISTEMA
-- Taula de configuració del sistema
CREATE TABLE configuracio_sistema (
    id INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    clau VARCHAR(100) UNIQUE NOT NULL,
    valor TEXT,
    tipus ENUM('string', 'number', 'boolean', 'json') DEFAULT 'string',
    descripcio VARCHAR(500),
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
) ENGINE = InnoDB DEFAULT CHARSET = utf8mb4 COLLATE = utf8mb4_0900_ai_ci;
-- Taula de logs del sistema
CREATE TABLE logs_sistema (
    id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    nivell ENUM('debug', 'info', 'warning', 'error', 'critical') NOT NULL,
    missatge TEXT NOT NULL,
    context JSON,
    usuari_id INT UNSIGNED,
    ip_address VARCHAR(45),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (usuari_id) REFERENCES usuaris(id) ON DELETE
    SET NULL,
        INDEX idx_nivell (nivell),
        INDEX idx_created (created_at)
) ENGINE = InnoDB DEFAULT CHARSET = utf8mb4 COLLATE = utf8mb4_unicode_ci;
-- VISTES ÚTILS
-- Vista d'aparcaments amb informació completa
CREATE VIEW vista_aparcaments_complet AS
SELECT a.id,
    a.nom,
    a.tipus,
    a.adreca,
    a.ciutat,
    a.latitud,
    a.longitud,
    a.capacitat_total,
    a.places_disponibles,
    ROUND(
        (a.places_disponibles / a.capacitat_total) * 100,
        2
    ) as percentatge_disponibilitat,
    a.tarifa_hora,
    a.tarifa_dia,
    a.obert_24h,
    a.accessibilitat,
    a.carrega_electrica,
    a.videovigilancia,
    a.valoracio_mitjana,
    a.total_valoracions,
    a.estat,
    u.nom as operador_nom,
    COUNT(DISTINCT f.id) as total_fotos
FROM aparcaments a
    LEFT JOIN usuaris u ON a.operador_id = u.id
    LEFT JOIN fotografies_aparcaments f ON a.id = f.aparcament_id
GROUP BY a.id;
-- Vista de reserves actives
CREATE VIEW vista_reserves_actives AS
SELECT r.id,
    r.codi_reserva,
    u.nom as usuari_nom,
    u.email as usuari_email,
    a.nom as aparcament_nom,
    a.adreca as aparcament_adreca,
    r.data_entrada,
    r.data_sortida,
    r.estat,
    r.preu_total,
    p.estat as estat_pagament
FROM reserves r
    JOIN usuaris u ON r.usuari_id = u.id
    JOIN aparcaments a ON r.aparcament_id = a.id
    LEFT JOIN pagaments p ON r.id = p.reserva_id
WHERE r.estat IN ('confirmada', 'en_curs');
-- TRIGGERS ÚTILS
-- Trigger per actualitzar valoració mitjana de l'aparcament
DELIMITER // CREATE TRIGGER after_valoracio_insert
AFTER
INSERT ON valoracions FOR EACH ROW BEGIN
UPDATE aparcaments
SET valoracio_mitjana = (
        SELECT AVG(puntuacio)
        FROM valoracions
        WHERE aparcament_id = NEW.aparcament_id
    ),
    total_valoracions = (
        SELECT COUNT(*)
        FROM valoracions
        WHERE aparcament_id = NEW.aparcament_id
    )
WHERE id = NEW.aparcament_id;
END // DELIMITER;
-- Trigger per afegir punts quan es fa una contribució
DELIMITER // CREATE TRIGGER after_contribucio_insert
AFTER
INSERT ON contribucions FOR EACH ROW BEGIN IF NEW.validada = TRUE THEN
UPDATE usuaris
SET punts_gamificacio = punts_gamificacio + NEW.punts_guanyats
WHERE id = NEW.usuari_id;
END IF;
END // DELIMITER;
-- ÍNDEXS ADDICIONALS PER OPTIMITZACIÓ
-- Índex per cerques geoespacials d'aparcaments
CREATE INDEX idx_geo_aparcaments ON aparcaments(latitud, longitud);
-- Índex compost per reserves per usuari i dates
CREATE INDEX idx_reserves_usuari_dates ON reserves(usuari_id, data_entrada, data_sortida);
-- Índex per històric de disponibilitat per aparcament i data
CREATE INDEX idx_historic_aparcament_date ON historic_disponibilitat(aparcament_id, timestamp DESC);