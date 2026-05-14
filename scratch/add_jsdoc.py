import os
import re

js_dir = 'services/frontend-service/src/js'

func_pattern = re.compile(r'^(export )?(async )?function (\w+)\(([^)]*)\)\s*\{', re.MULTILINE)
arrow_pattern = re.compile(r'^(export )?(const|let|var) (\w+) = (async )?\(([^)]*)\) =>\s*\{', re.MULTILINE)

def generate_jsdoc(name, args, is_async, is_export):
    lines = ['/**']
    lines.append(f' * {name} - Funció {"exportada " if is_export else ""}per a {name}.')
    lines.append(' *')
    
    if args.strip():
        arg_list = [a.strip().split('=')[0].strip() for a in args.split(',')]
        for arg in arg_list:
            if arg:
                lines.append(f' * @param {{any}} {arg} - Paràmetre {arg}')
    
    if is_async:
        lines.append(' * @returns {Promise<any>} Promesa amb el resultat.')
    else:
        lines.append(' * @returns {any} Resultat de la funció.')
        
    lines.append(' */')
    return '\n'.join(lines)

for root, _, files in os.walk(js_dir):
    for file in files:
        if file.endswith('.js'):
            filepath = os.path.join(root, file)
            with open(filepath, 'r', encoding='utf-8') as f:
                content = f.read()

            new_content = []
            lines = content.split('\n')
            
            i = 0
            while i < len(lines):
                line = lines[i]
                
                # Simple function
                m_func = re.match(r'^(export )?(async )?function (\w+)\(([^)]*)\)\s*\{', line)
                if m_func and (i == 0 or '/**' not in lines[i-1]):
                    is_export = bool(m_func.group(1))
                    is_async = bool(m_func.group(2))
                    name = m_func.group(3)
                    args = m_func.group(4)
                    jsdoc = generate_jsdoc(name, args, is_async, is_export)
                    new_content.extend(jsdoc.split('\n'))
                
                # Arrow function
                m_arrow = re.match(r'^(export )?(const|let|var) (\w+) = (async )?\(([^)]*)\) =>\s*\{', line)
                if m_arrow and (i == 0 or '/**' not in lines[i-1]):
                    is_export = bool(m_arrow.group(1))
                    name = m_arrow.group(3)
                    is_async = bool(m_arrow.group(4))
                    args = m_arrow.group(5)
                    jsdoc = generate_jsdoc(name, args, is_async, is_export)
                    new_content.extend(jsdoc.split('\n'))
                    
                new_content.append(line)
                i += 1
                
            with open(filepath, 'w', encoding='utf-8') as f:
                f.write('\n'.join(new_content))

print("JSDoc aplicat.")
