#!/bin/bash
# database/setup. sh

DB_USER="root"
DB_PASS="root_password_123"
DB_NAME="parklive_db"

echo "Executant scripts SQL..."
docker-compose exec -T db mysql -u $DB_USER -p$DB_PASS $DB_NAME < database/schemas/schema.sql
docker-compose exec -T db mysql -u $DB_USER -p$DB_PASS $DB_NAME < database/seeds/seed.sql

echo "Creant backup..."
docker-compose exec -T db mysqldump -u $DB_USER -p$DB_PASS $DB_NAME > database/backup/backup.sql

echo " Fet"