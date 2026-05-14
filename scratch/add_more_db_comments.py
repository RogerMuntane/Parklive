import os

proc_dir = 'database/procedures'

# 1. Aplicar els mateixos comentaris transaccionals a TOTS els procedures
for file in os.listdir(proc_dir):
    if file.endswith('.sql'):
        filepath = os.path.join(proc_dir, file)
        with open(filepath, 'r', encoding='utf-8') as f:
            content = f.read()

        # Exit handler genèric
        if 'DECLARE EXIT HANDLER FOR SQLEXCEPTION' in content and 'Rollback automàtic per desfer tot els canvis a mitges' not in content:
            content = content.replace(
                'DECLARE EXIT HANDLER FOR SQLEXCEPTION\n    BEGIN',
                '-- Si falla qualsevol query de la transacció salta aquest handler:\n    -- 1. Fa un Rollback automàtic per desfer tot els canvis a mitges\n    -- 2. Evita inconsistències en taules creuades (ex: pagaments vs reserves)\n    DECLARE EXIT HANDLER FOR SQLEXCEPTION\n    BEGIN'
            )

        # Transaccions
        if 'START TRANSACTION;' in content and 'Bloc transaccional per assegurar l\'atomicidad' not in content:
            content = content.replace(
                'START TRANSACTION;',
                '-- Bloc transaccional per assegurar l\'atomicidad (garanteix operacions segures en cas de caiguda)\n    START TRANSACTION;'
            )
            
        with open(filepath, 'w', encoding='utf-8') as f:
            f.write(content)

# 2. Comentaris específics a reservas
res_file = os.path.join(proc_dir, '03-reservation-procedures.sql')
with open(res_file, 'r', encoding='utf-8') as f:
    res_content = f.read()
    
# Comentari per bloqueig actiu o concurrència
res_content = res_content.replace(
    '    -- Validar si l\'aparcament permet reserves',
    '    -- IMPORTANT: Validem si l\'aparcament permet reserves abans de descomptar dades per evitar l\'overbooking\n    -- Validar si l\'aparcament permet reserves'
)
with open(res_file, 'w', encoding='utf-8') as f:
    f.write(res_content)

# 3. Comentaris específics a pagaments
pay_file = os.path.join(proc_dir, '04-payment-procedures.sql')
with open(pay_file, 'r', encoding='utf-8') as f:
    pay_content = f.read()
    
pay_content = pay_content.replace(
    'INSERT INTO pagaments (',
    '    -- Registrem l\'històric immutabile a la nostra DB vinculat a l\'Intent d\'Stripe\n    INSERT INTO pagaments ('
)
with open(pay_file, 'w', encoding='utf-8') as f:
    f.write(pay_content)

print("Documentació inline extra als procediments complexes completada!")
