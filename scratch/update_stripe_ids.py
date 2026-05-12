"""
Script d'actualització de IDs de Stripe per al Seed de la Base de Dades.

Aquest script llegeix el fitxer SQL de llavor (seed) d'usuaris, identifica els
IDs de client de Stripe temporals (ex: 'cus_XXX') i crea clients reals a Stripe
mitjançant l'API oficial. Finalment, sobreescriu el fitxer SQL amb els IDs
reals per garantir que el seed de producció/dev sigui funcional.

Requisits:
    - Variable d'entorn STRIPE_APIPrivada configurada al fitxer .env.
    - Fitxer SQL existent a 'database/seeds/01_users.sql'.
"""

import os
import re
# pyrefly: ignore [missing-import]
import stripe
from dotenv import load_dotenv

# Load environment variables
load_dotenv('.env')

stripe.api_key = os.getenv('STRIPE_APIPrivada')

sql_path = 'database/seeds/01_users.sql'

with open(sql_path, 'r') as f:
    sql_content = f.read()

# Pattern to find users: (id, nom, cognoms, email, ..., stripe_customer_id, ...)
# Note: The SQL structure is a bit spread out across lines.
# We'll use a more flexible regex or parse it line by line.

# Finding the INSERT INTO usuaris block
users_block_match = re.search(r'INSERT INTO usuaris.*?VALUES\s*(.*?);', sql_content, re.DOTALL | re.IGNORECASE)
if not users_block_match:
    print("Could not find users block")
    exit(1)

users_values = users_block_match.group(1)

# Pattern to match each user tuple in the VALUES block.
# Structure: (id, 'nom', 'cognoms', 'email', 'hash', 'telefon', 'rol', 'estat', verificat, punts, 'cus_XXX', 'data', ...)
user_pattern = re.compile(
    r'\(\s*(\d+),\s*'             # id
    r'\'([^\']*)\',\s*'           # nom
    r'\'([^\']*)\',\s*'           # cognoms
    r'\'([^\']*)\',.*?'           # email
    r'\'(cus_[^\']*)\',',          # stripe_customer_id
    re.DOTALL
)

matches = user_pattern.findall(users_values)

mapping = {}

for user_id, nom, cognoms, email, fake_id in matches:
    print(f"Creating Stripe customer for {nom} {cognoms} ({email})...")
    try:
        customer = stripe.Customer.create(
            email=email,
            name=f"{nom} {cognoms}",
            metadata={'user_id': user_id, 'source': 'seed_script'}
        )
        real_id = customer.id
        mapping[fake_id] = real_id
        print(f"  Mapped {fake_id} -> {real_id}")
    except Exception as e:
        print(f"  Error creating customer for {email}: {e}")

# Now replace in the full SQL content
new_sql_content = sql_content
for fake, real in mapping.items():
    new_sql_content = new_sql_content.replace(f"'{fake}'", f"'{real}'")

# Also handle subscriptions if any
# Subscriptions have 'sub_test_XXX'
# We could create real subscriptions too, but the user only asked for user ID.
# However, if we want a "correct" seed, we should probably at least have real customer IDs in subscriptions too.
# Wait, the subscriptions table uses `usuari_id`, not `stripe_customer_id`.
# But it has `stripe_subscription_id`.

with open(sql_path, 'w') as f:
    f.write(new_sql_content)

print("\nFinished updating 01_users.sql with real Stripe Customer IDs.")
