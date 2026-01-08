FROM php:8.2-cli

RUN apt-get update && apt-get install -y \
    git \
    unzip \
    libpq-dev \
    libsqlite3-dev \
    && docker-php-ext-install pdo pdo_pgsql pdo_sqlite

RUN { \
      echo "file_uploads=On"; \
      echo "upload_max_filesize=10M"; \
      echo "post_max_size=12M"; \
      echo "max_file_uploads=20"; \
    } > /usr/local/etc/php/conf.d/uploads.ini

COPY --from=composer:2 /usr/bin/composer /usr/bin/composer

WORKDIR /var/www/html

COPY . .

RUN mkdir -p bootstrap/cache storage/framework/cache storage/framework/sessions storage/framework/views storage/logs \
    && chmod -R 775 bootstrap/cache storage

RUN chmod +x /var/www/html/entrypoint.sh

RUN composer install --no-dev --no-interaction --prefer-dist --optimize-autoloader

EXPOSE 8000

CMD ["/var/www/html/entrypoint.sh"]