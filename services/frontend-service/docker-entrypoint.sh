#!/bin/sh
#
# ParkLive – Frontend entrypoint
# Genera /usr/share/nginx/html/src/js/env.js amb les variables d'entorn
# injectades des de docker-compose, abans d'iniciar Nginx.
#

ENV_JS_PATH="/usr/share/nginx/html/src/js/env.js"

cat > "$ENV_JS_PATH" <<EOF
/**
 * ParkLive – env.js (generat automàticament per docker-entrypoint.sh)
 * NO editar manualment — es regenera cada cop que el contenidor s'inicia.
 */
export const ENV = Object.freeze({
  APP_ENV: '${APP_ENV:-development}',
  API_HOST: '${API_HOST}',
  PHP_SERVICE_PORT: '${PHP_SERVICE_PORT:-8080}',
  PYTHON_SERVICE_PORT: '${PYTHON_SERVICE_PORT:-5000}',
  STRIPE_PUBLIC_KEY: '${STRIPE_PUBLIC_KEY}',
  GOOGLE_CLIENT_ID: '${GOOGLE_CLIENT_ID}',
  IVA_PERCENTAGE: '${IVA_PERCENTAGE:-0.21}',
  PREMIUM_DISCOUNT: '${PREMIUM_DISCOUNT:-0.10}',
});
EOF

echo "[entrypoint] env.js generat amb PHP_SERVICE_PORT=${PHP_SERVICE_PORT:-8080}, PYTHON_SERVICE_PORT=${PYTHON_SERVICE_PORT:-5000}"

# Iniciar Nginx
exec nginx -g 'daemon off;'
