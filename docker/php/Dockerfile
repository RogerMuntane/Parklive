FROM php:8.1-apache

# Instal·lar extensions PHP necessàries
RUN docker-php-ext-install mysqli pdo pdo_mysql

# Habilitar mod_rewrite per URLs amigables
RUN a2enmod rewrite

# Configurar Apache per permetre .htaccess
RUN echo '<Directory /var/www/html>' > /etc/apache2/conf-available/docker-php.conf && \
    echo '    AllowOverride All' >> /etc/apache2/conf-available/docker-php.conf && \
    echo '    Require all granted' >> /etc/apache2/conf-available/docker-php.conf && \
    echo '</Directory>' >> /etc/apache2/conf-available/docker-php.conf && \
    a2enconf docker-php

# Configurar permisos
RUN chown -R www-data:www-data /var/www/html && \
    chmod -R 755 /var/www/html

# Exposar port 80
EXPOSE 80

# Iniciar Apache
CMD ["apache2-foreground"]