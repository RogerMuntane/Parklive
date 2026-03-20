FROM nginx:alpine

# Copiar configuració personalitzada de Nginx (opcional)
# COPY nginx.conf /etc/nginx/nginx.conf

# Crear directori per a l'aplicació
RUN mkdir -p /usr/share/nginx/html/src

# Copiar entrypoint que genera env.js amb les variables d'entorn
COPY docker-entrypoint.sh /docker-entrypoint.sh
RUN chmod +x /docker-entrypoint.sh

# Exposar port
EXPOSE 80

# Iniciar amb l'entrypoint personalitzat
ENTRYPOINT ["/docker-entrypoint.sh"]