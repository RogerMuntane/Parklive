#!/bin/bash
# database/manual-init.sh - Executar inicialització manualment des del host

set -e

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'
BOLD='\033[1m'

echo ""
echo -e "${BLUE}===========================================${NC}"
echo -e "${BOLD}🚀 Inicialització manual de base de dades${NC}"
echo -e "${BLUE}===========================================${NC}"
echo ""

# Carregar variables d'entorn
if [ -f .env ]; then
    export $(cat .env | grep -v '^#' | xargs)
    echo -e "${GREEN}✅ Variables .env carregades${NC}"
else
    echo -e "${RED}❌ No s'ha trobat .env${NC}"
    exit 1
fi

DB_NAME="${MYSQL_DATABASE:-parklive_db}"
DB_ROOT_PASS="${MYSQL_ROOT_PASSWORD}"

echo -e "📊 Base de dades: ${BOLD}${DB_NAME}${NC}"
echo ""

# Verificar que MySQL està en marxa
if ! docker-compose ps mysql | grep -q "Up"; then
    echo -e "${RED}❌ MySQL no està en marxa${NC}"
    echo -e "${YELLOW}Executant: docker-compose up -d mysql${NC}"
    docker-compose up -d mysql
    sleep 10
fi

echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo -e "${BOLD}📋 [1/4] Executant schemas...${NC}"
echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"

for sql_file in database/schemas/*.sql; do
    if [ -f "$sql_file" ]; then
        echo -e "   ↳ Executant: $(basename $sql_file)"
        docker-compose exec -T mysql mysql -u root -p"${DB_ROOT_PASS}" "${DB_NAME}" < "$sql_file"
    fi
done
echo -e "${GREEN}✅ Schemas executats${NC}"
echo ""

echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo -e "${BOLD}🔄 [2/4] Executant migrations...${NC}"
echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"

if [ -d "database/migrations" ] && [ "$(ls -A database/migrations/*.sql 2>/dev/null)" ]; then
    for sql_file in database/migrations/*.sql; do
        if [ -f "$sql_file" ]; then
            echo -e "   ↳ Executant: $(basename $sql_file)"
            docker-compose exec -T mysql mysql -u root -p"${DB_ROOT_PASS}" "${DB_NAME}" < "$sql_file"
        fi
    done
    echo -e "${GREEN}✅ Migrations executades${NC}"
else
    echo -e "${YELLOW}⏭️  No hi ha migrations per executar${NC}"
fi
echo ""

echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo -e "${BOLD}⚙️  [3/4] Executant stored procedures...${NC}"
echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"

for sql_file in database/procedures/*.sql; do
    if [ -f "$sql_file" ]; then
        echo -e "   ↳ Executant: $(basename $sql_file)"
        docker-compose exec -T mysql mysql -u root -p"${DB_ROOT_PASS}" "${DB_NAME}" < "$sql_file"
    fi
done
echo -e "${GREEN}✅ Stored procedures creats${NC}"
echo ""

echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo -e "${BOLD}🌱 [4/4] Executant seeds...${NC}"
echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"

for sql_file in database/seeds/*.sql; do
    if [ -f "$sql_file" ]; then
        echo -e "   ↳ Executant: $(basename $sql_file)"
        docker-compose exec -T mysql mysql -u root -p"${DB_ROOT_PASS}" "${DB_NAME}" < "$sql_file"
    fi
done
echo -e "${GREEN}✅ Seeds executats${NC}"
echo ""

echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo -e "${BOLD}🔍 Verificant stored procedures...${NC}"
echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"

PROCEDURE_COUNT=$(docker-compose exec -T mysql mysql -u root -p"${DB_ROOT_PASS}" "${DB_NAME}" -se "SELECT COUNT(*) FROM information_schema.ROUTINES WHERE ROUTINE_SCHEMA = '${DB_NAME}' AND ROUTINE_TYPE = 'PROCEDURE';")
echo -e "   📊 Total procedures creats: ${BOLD}${PROCEDURE_COUNT}${NC}"

if [ "$PROCEDURE_COUNT" -gt 0 ]; then
    echo ""
    echo -e "   ${GREEN}Llista de procedures:${NC}"
    docker-compose exec -T mysql mysql -u root -p"${DB_ROOT_PASS}" "${DB_NAME}" -e "SELECT ROUTINE_NAME FROM information_schema.ROUTINES WHERE ROUTINE_SCHEMA = '${DB_NAME}' AND ROUTINE_TYPE = 'PROCEDURE' ORDER BY ROUTINE_NAME;" 2>/dev/null | tail -n +2 | while read proc; do
        echo -e "      ${GREEN}✓${NC} $proc"
    done
fi

echo ""
echo -e "${BLUE}===========================================${NC}"
echo -e "${GREEN}${BOLD}✅ Inicialització completada amb èxit!${NC}"
echo -e "${BLUE}===========================================${NC}"
echo ""