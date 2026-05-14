import re

# 1. SCHEMA.SQL
filepath = 'database/schemas/schema.sql'
with open(filepath, 'r', encoding='utf-8') as f:
    content = f.read()

# Add comments explaining indexes and constraints if not present
content = content.replace(
    '    INDEX idx_email (email),',
    '    -- Índexs per accelerar les cerques en columnes molt utilitzades\n    INDEX idx_email (email),'
)

content = content.replace(
    'CREATE TABLE vehicles (',
    '-- Taula de vehicles: Relació 1 a N amb usuaris (un usuari pot tenir diversos vehicles)\nCREATE TABLE vehicles ('
)

content = content.replace(
    'CREATE TABLE reserves (',
    '-- Taula de reserves: Gestiona el cicle de vida d\'una reserva d\'aparcament (relaciona usuari, vehicle i plaça)\nCREATE TABLE reserves ('
)

content = content.replace(
    'CREATE TABLE pagaments (',
    '-- Taula de pagaments: Registra les transaccions d\'Stripe o d\'altres passarel·les relacionades amb reserves/suscripcions\nCREATE TABLE pagaments ('
)

with open(filepath, 'w', encoding='utf-8') as f:
    f.write(content)

# 2. SETUP.SH
filepath_setup = 'database/setup.sh'
try:
    with open(filepath_setup, 'r', encoding='utf-8') as f:
        setup_content = f.read()
    
    setup_content = setup_content.replace(
        'docker-compose up -d db',
        '# 1. Aixeca només el contenidor de la base de dades (MySql/MariaDB) en segon pla (detached)\n    docker-compose up -d db'
    )
    
    setup_content = setup_content.replace(
        'until docker exec',
        '# 2. Bucle d\'espera (polling): comprova cada pocs segons si MySQL ja està preparat per rebre connexions (ping)\n    until docker exec'
    )
    
    with open(filepath_setup, 'w', encoding='utf-8') as f:
        f.write(setup_content)
except:
    pass

print("Comentaris inline integrats als arxius de base de dades.")
