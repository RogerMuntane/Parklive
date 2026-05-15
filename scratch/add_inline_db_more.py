import os

# 1. PROCEDURES: 01-user-procedures.sql
filepath = 'database/procedures/01-user-procedures.sql'
if os.path.exists(filepath):
    with open(filepath, 'r', encoding='utf-8') as f:
        content = f.read()

    # Comentari per entendre perquè declarem un EXIT HANDLER als Stored Procedures
    if 'DECLARE EXIT HANDLER FOR SQLEXCEPTION' in content and 'Rollback automàtic' not in content:
        content = content.replace(
            'DECLARE EXIT HANDLER FOR SQLEXCEPTION\n    BEGIN',
            '-- Si falla qualsevol query de la transacció salta aquest handler:\n    -- 1. Fa un Rollback automàtic per desfer tot els canvis a mitges\n    -- 2. Passa un missatge d\'error a la variable de sortida perque Node/Python pugui printar-ho\n    DECLARE EXIT HANDLER FOR SQLEXCEPTION\n    BEGIN'
        )

    # Explicació per a les transaccions de punts
    if 'START TRANSACTION;' in content and 'Bloc transaccional per assegurar l\'atomicidad' not in content:
        content = content.replace(
            'START TRANSACTION;',
            '-- Bloc transaccional per assegurar l\'atomicidad (que o s\'aplica tot, o no s\'aplica res)\n    START TRANSACTION;'
        )

    with open(filepath, 'w', encoding='utf-8') as f:
        f.write(content)


# 2. SEEDS: 00_cleanup.sql
filepath = 'database/seeds/00_cleanup.sql'
if os.path.exists(filepath):
    with open(filepath, 'r', encoding='utf-8') as f:
        content = f.read()

    if 'SET FOREIGN_KEY_CHECKS = 0;' in content and 'Això s\'apaga momentàniament' not in content:
        content = content.replace(
            'SET FOREIGN_KEY_CHECKS = 0;',
            '-- Això s\'apaga momentàniament per evitar errors al fer TRUNCATE de taules que tenen restriccions referencials amb d\'altres\nSET FOREIGN_KEY_CHECKS = 0;'
        )

    with open(filepath, 'w', encoding='utf-8') as f:
        f.write(content)

print("Més comentaris afegits a procediments i seeds.")
