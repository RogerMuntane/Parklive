import sys

with open('/home/roger/Projecte/Parklive/services/python-service/models/reserves_model.py', 'r') as f:
    lines = f.readlines()

new_lines = []
for i, line in enumerate(lines):
    # Lines 123 to 276 are 0-indexed 122 to 275
    if 122 <= i <= 275:
        if line.strip() == "":
            new_lines.append(line)
        elif line.startswith("    "):
            new_lines.append("    " + line)
        else:
            new_lines.append(line)
    else:
        new_lines.append(line)

with open('/home/roger/Projecte/Parklive/services/python-service/models/reserves_model.py', 'w') as f:
    f.writelines(new_lines)

print("Fixed indentation.")
