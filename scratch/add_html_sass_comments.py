import os

frontend_dir = 'services/frontend-service'

# HTML comments
for root, _, files in os.walk(os.path.join(frontend_dir, 'public')):
    for file in files:
        if file.endswith('.html'):
            filepath = os.path.join(root, file)
            with open(filepath, 'r', encoding='utf-8') as f:
                content = f.read()
            
            if '<!-- Document HTML per a' not in content:
                comment = f'<!-- Document HTML per a {file}: Estructura de la pàgina principal -->\n'
                with open(filepath, 'w', encoding='utf-8') as f:
                    f.write(comment + content)

# SASS comments
for root, _, files in os.walk(os.path.join(frontend_dir, 'src', 'sass')):
    for file in files:
        if file.endswith('.scss') or file.endswith('.sass'):
            filepath = os.path.join(root, file)
            with open(filepath, 'r', encoding='utf-8') as f:
                content = f.read()
                
            if '// Estils generals per a' not in content and '/* Estils generals per a' not in content:
                comment = f'// Estils generals per a {file} - Defineix la presentació visual\n'
                with open(filepath, 'w', encoding='utf-8') as f:
                    f.write(comment + content)

print("Comentaris afegits a HTML i SASS.")
