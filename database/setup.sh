#!/bin/bash
# database/setup. sh

DB_USER="root"
DB_PASS="password"
DB_NAME="parklive"

echo "Executant scripts SQL..."
docker-compose exec -T db mysql -u $DB_USER -p$DB_PASS $DB_NAME < database/01-schema.sql
docker-compose exec -T db mysql -u $DB_USER -p$DB_PASS $DB_NAME < database/02-seed.sql

echo "Creant backup..."
docker-compose exec -T db mysqldump -u $DB_USER -p$DB_PASS $DB_NAME > database/backup. sql

echo " Fet"