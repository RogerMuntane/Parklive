import os
import re

directory = '/home/roger/Projecte/Parklive/services/frontend-service'
extensions_to_remove = ['termes_condicions.html', 'politica_privacitat.html', 'politica_cookies.html', 'faq.html']

for root, dirs, files in os.walk(directory):
    if 'node_modules' in root:
        continue
    for file in files:
        if file.endswith('.html') or file.endswith('.js'):
            filepath = os.path.join(root, file)
            with open(filepath, 'r', encoding='utf-8') as f:
                content = f.read()
            
            modified = False
            for ext in extensions_to_remove:
                if ext in content:
                    base_name = ext.replace('.html', '')
                    pattern = r'\b' + re.escape(ext) + r'\b'
                    content, num_subs = re.subn(pattern, base_name, content)
                    if num_subs > 0:
                        modified = True
            
            if modified:
                with open(filepath, 'w', encoding='utf-8') as f:
                    f.write(content)
                print(f"Updated {filepath}")
