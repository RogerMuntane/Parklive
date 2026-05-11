import os
import re

directory = '/home/roger/Projecte/Parklive/services/frontend-service'
pages = [
    'avis_legal.html', 'blog-detall.html', 'blog.html', 'contacte.html',
    'dashboard.html', 'detall_Aparcament.html', 'faq.html', 'index.html',
    'login.html', 'nova_Valoracio.html', 'perfil.html', 'politica_cookies.html',
    'politica_privacitat.html', 'register.html', 'report_disponibilitat.html',
    'reserva_Aparcament.html', 'reset-password.html', 'sobre-parklive.html',
    'termes_condicions.html', 'tiquet_Aparcament.html'
]

def clean_content(content):
    modified = False
    for page in pages:
        base_name = page.replace('.html', '')
        
        if base_name == 'index':
            # Replace /index.html with /
            content, count1 = re.subn(r'/index\.html\b', '/', content)
            # Replace index.html with / (in quotes)
            content, count2 = re.subn(r'([\'"`])index\.html\b', r'\1/', content)
            if count1 > 0 or count2 > 0:
                modified = True
        else:
            # Replace page.html with base_name, but only if not preceded by a word character
            # (to avoid matching things like "mysubpage.html")
            # We use a negative lookbehind for alphanumeric
            pattern = r'(?<![a-zA-Z0-9])' + re.escape(page) + r'\b'
            new_content, count = re.subn(pattern, base_name, content)
            if count > 0:
                content = new_content
                modified = True
    
    return content, modified

for root, dirs, files in os.walk(directory):
    if 'node_modules' in root or '.git' in root:
        continue
    for file in files:
        if file.endswith(('.html', '.js')):
            filepath = os.path.join(root, file)
            try:
                with open(filepath, 'r', encoding='utf-8') as f:
                    content = f.read()
                
                new_content, modified = clean_content(content)
                
                if modified:
                    with open(filepath, 'w', encoding='utf-8') as f:
                        f.write(new_content)
                    print(f"Updated: {filepath}")
            except Exception as e:
                print(f"Error processing {filepath}: {e}")
