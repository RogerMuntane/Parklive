FROM nginx:alpine

# Copiar configuració personalitzada de Nginx (opcional)
# COPY nginx.conf /etc/nginx/nginx.conf

# Crear directori per a l'aplicació
RUN mkdir -p /usr/share/nginx/html/src

# Exposar port
EXPOSE 80

# Iniciar Nginx
CMD ["nginx", "-g", "daemon off;"]