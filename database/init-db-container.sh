#!/bin/sh
# database/init-db-container.sh - S'executa dins del contenidor MySQL
# Utilitza les variables d'entorn MYSQL_* (provinents de .env via docker-compose)

set -e

echo "[init-db] Iniciant inicialització de la base de dades..."

DB_NAME="${MYSQL_DATABASE:-parklive_db}"
DB_ROOT_PASS="${MYSQL_ROOT_PASSWORD}"
INIT_DIR="/docker-init"

if [ -z "$DB_ROOT_PASS" ]; then
  echo "[init-db] ERROR: MYSQL_ROOT_PASSWORD no està definit. Abortant inicialització."
  exit 1
fi

# Esperar que MySQL estigui llest dins del contenidor
echo "[init-db] Esperant que MySQL respongui..."
MAX_RETRIES=30
COUNTER=0
until mysqladmin ping -h "localhost" --silent; do
  COUNTER=$((COUNTER+1))
  if [ "$COUNTER" -ge "$MAX_RETRIES" ]; then
    echo "[init-db] Timeout esperant MySQL. Abortant."
    exit 1
  fi
  sleep 2
done

echo "[init-db] MySQL està llest. Continuant amb la inicialització."

# Funció auxiliar per executar tots els .sql d'un directori
run_sql_dir() {
  DIR="$1"
  LABEL="$2"

  if [ ! -d "$INIT_DIR/$DIR" ]; then
    return
  fi

  echo "[init-db] Executant $LABEL des de $INIT_DIR/$DIR"

  for f in "$INIT_DIR/$DIR"/*.sql; do
    [ -e "$f" ] || continue
    base_name="$(basename "$f")"

    # Evitar duplicar l'esquema base: ja s'executa des de schemas/schema.sql
    if [ "$DIR" = "migrations" ] && [ "$base_name" = "001_create_initial_schema.sql" ]; then
      echo "[init-db]  -> Ometent $base_name (schema ja aplicat des de schemas/)"
      continue
    fi

    echo "[init-db]  -> $base_name"
    mysql -u root -p"$DB_ROOT_PASS" "$DB_NAME" < "$f"
  done
}

# Assegurar que la base de dades existeix
if [ -n "$DB_NAME" ]; then
  echo "[init-db] Assegurant que existeix la base de dades '$DB_NAME'..."
  mysql -u root -p"$DB_ROOT_PASS" -e "CREATE DATABASE IF NOT EXISTS \`$DB_NAME\`;"
fi

# Ordre: schemas -> migrations -> procedures -> seeds
run_sql_dir "schemas" "schemas (estructura base)"
run_sql_dir "migrations" "migrations (canvis d'esquema)"
run_sql_dir "procedures" "stored procedures"
run_sql_dir "seeds" "seeds (dades inicials)"

echo "[init-db] Inicialització de la base de dades completada."
