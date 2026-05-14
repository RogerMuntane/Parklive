import os

db_dir = 'database'

for root, _, files in os.walk(db_dir):
    for file in files:
        filepath = os.path.join(root, file)
        
        ext = os.path.splitext(file)[1]
        if ext not in ['.sql', '.sh']:
            continue
            
        with open(filepath, 'r', encoding='utf-8') as f:
            content = f.read()

        if ext == '.sql':
            if '-- Arxiu:' in content or '/*' in content[:50]:
                continue
            folder_name = os.path.basename(root)
            desc = f'Aquest arxiu SQL pertany a la l\'àrea de {folder_name}.'
            if folder_name == 'procedures':
                desc = 'Aquest arxiu defineix els procediments emmagatzemats (Stored Procedures) per la lògica de base de dades.'
            elif folder_name == 'schemas':
                desc = 'Aquest arxiu defineix l\'estructura i creació de les taules (DDL - Data Definition Language).'
            elif folder_name == 'seeds':
                desc = 'Aquest arxiu conté sentències (INSERT) per poblar inicialment la base de dades amb dades fictícies de prova.'
            elif folder_name == 'backup':
                desc = 'Aquest arxiu és una còpia de seguretat (backup) estructurada de la base de dades.'
            
            comment = f'-- Arxiu: {file}\n-- Descripció: {desc}\n\n'
            
            with open(filepath, 'w', encoding='utf-8') as f:
                f.write(comment + content)
                
        elif ext == '.sh':
            if '# Arxiu:' in content:
                continue
            lines = content.split('\n')
            desc = 'Script de terminal per a tasques d\'inicialització o configuració de l\'entorn de base de dades.'
            comment_lines = [f'# Arxiu: {file}', f'# Descripció: {desc}', '']
            
            if len(lines) > 0 and lines[0].startswith('#!'):
                new_lines = [lines[0]] + comment_lines + lines[1:]
            else:
                new_lines = comment_lines + lines
                
            with open(filepath, 'w', encoding='utf-8') as f:
                f.write('\n'.join(new_lines))

print("Comentaris de Base de dades afegits!")
