#!/bin/bash
# database/setup.sh - Script de configuració de base de dades per Parklive

set -e  # Aturar si hi ha errors

# Colors per la terminal
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color
BOLD='\033[1m'

# Emojis
INFO="ℹ️ "
WARNING="⚠️ "
ARROW="▶"

echo ""
echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo -e "${BOLD}${ARROW} Carregant configuració des de .env${NC}"
echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"

# Carregar variables d'entorn des del fitxer .env
if [ -f .env ]; then
    export $(cat .env | grep -v '^#' | xargs)
    echo -e "${GREEN}$ Arxiu .env carregat correctament${NC}"
else
    echo -e "${RED}  No s'ha trobat l'arxiu .env${NC}"
    echo -e "${YELLOW}${INFO} Copia .env.example a .env i configura'l${NC}"
    exit 1
fi

# Variables de base de dades
DB_USER="${MYSQL_USER:-parklive_user}"
DB_PASS="${MYSQL_PASSWORD}"
DB_NAME="${MYSQL_DATABASE:-parklive_db}"
DB_ROOT_PASS="${MYSQL_ROOT_PASSWORD}"
CONTAINER_NAME="parklive_mysql"

echo -e "${INFO} Base de dades: ${BOLD}${DB_NAME}${NC}"
echo -e "${INFO} Usuari: ${BOLD}${DB_USER}${NC}"

echo ""
echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo -e "${BOLD} Verificant que Docker està en marxa${NC}"
echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"

# Verificar que docker-compose està en marxa
if ! docker-compose ps | grep -q "mysql"; then
    echo -e "${RED}  El contenidor MySQL no està en marxa${NC}"
    echo -e "${INFO} Executant: docker-compose up -d mysql${NC}"
    docker-compose up -d mysql
fi

# Esperar que MySQL estigui llest
echo -e "${INFO} Esperant que MySQL estigui llest..."
timeout=60
counter=0
while ! docker-compose exec -T mysql mysqladmin ping -h localhost --silent > /dev/null 2>&1; do
    echo -n "."
    sleep 1
    counter=$((counter + 1))
    if [ $counter -ge $timeout ]; then
        echo ""
        echo -e "${RED}  Timeout esperant MySQL${NC}"
        exit 1
    fi
done
echo ""
echo -e "${GREEN}  MySQL està llest${NC}"

echo ""
echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo -e "${BOLD}${ARROW} Verificant estat de la base de dades${NC}"
echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"

# Comprovar si ja existeixen taules
TABLES_COUNT=$(docker-compose exec -T mysql mysql -u root -p"${DB_ROOT_PASS}" -D "${DB_NAME}" -e "SHOW TABLES;" 2>/dev/null | wc -l)

if [ "$TABLES_COUNT" -gt 1 ]; then
    echo -e "${GREEN}  La base de dades ja està inicialitzada${NC}"
    echo -e "${INFO} Nombre de taules: $((TABLES_COUNT - 1))"
    
    # Mostrar stored procedures
    echo ""
    echo -e "${INFO} Stored Procedures disponibles:"
    docker-compose exec -T mysql mysql -u root -p"${DB_ROOT_PASS}" -D "${DB_NAME}" -e "SHOW PROCEDURE STATUS WHERE Db = '${DB_NAME}';" 2>/dev/null | tail -n +2 | awk '{print "   - " $2}'
    
else
    echo -e "${YELLOW}${WARNING} La base de dades està buida${NC}"
    echo -e "${INFO} Els scripts s'executaran automàticament en el següent reinici${NC}"
    echo -e "${INFO} Executant: docker-compose restart mysql${NC}"
    docker-compose restart mysql
    
    # Esperar novament
    echo -e "${INFO} Esperant reinicialització..."
    sleep 10
    
    timeout=60
    counter=0
    while ! docker-compose exec -T mysql mysqladmin ping -h localhost --silent > /dev/null 2>&1; do
        echo -n "."
        sleep 1
        counter=$((counter + 1))
        if [ $counter -ge $timeout ]; then
            echo ""
            echo -e "${RED}  Timeout esperant MySQL${NC}"
            exit 1
        fi
    done
    echo ""
    echo -e "${GREEN}  MySQL reiniciat${NC}"
fi

echo ""
echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo -e "${BOLD}${ARROW} Verificant connexió${NC}"
echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"

# Testejar connexió amb l'usuari de l'aplicació
if docker-compose exec -T mysql mysql -u "${DB_USER}" -p"${DB_PASS}" -D "${DB_NAME}" -e "SELECT 1;" > /dev/null 2>&1; then
    echo -e "${GREEN}  Connexió exitosa amb l'usuari ${DB_USER}${NC}"
else
    echo -e "${RED}  No es pot connectar amb l'usuari ${DB_USER}${NC}"
    exit 1
fi

# Carregar dades de seed.sql (només per desenvolupament)
echo ""
echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo -e "${BOLD}${ARROW} Carregant dades de prova (database/seeds/seed.sql)${NC}"
echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"

if [ -f "database/seeds/seed.sql" ]; then
    echo -e "${INFO} Aplicant seed.sql sobre la base de dades ${BOLD}${DB_NAME}${NC}"
    docker-compose exec -T mysql \
        mysql -u root -p"${DB_ROOT_PASS}" "${DB_NAME}" < database/seeds/seed.sql
    echo -e "${GREEN}  Dades de seed.sql carregades correctament${NC}"
else
    echo -e "${YELLOW}${WARNING} No s'ha trobat database/seeds/seed.sql, s'omet la càrrega de dades inicials${NC}"
fi

echo ""
echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo -e "${GREEN}${BOLD}  Configuració completada amb èxit!${NC}"
echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo ""
echo -e "${INFO} Pots accedir a la base de dades amb:"
echo -e "   ${BOLD}docker-compose exec mysql mysql -u ${DB_USER} -p${DB_PASS} ${DB_NAME}${NC}"
echo -e "${INFO} O via phpMyAdmin a:"
echo -e "   ${BOLD}http://localhost:8081${NC}"
echo ""
