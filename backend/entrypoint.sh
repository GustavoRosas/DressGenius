#!/bin/sh
set -eu

tries=0
max_tries=20

while [ "$tries" -lt "$max_tries" ]; do
  if php artisan migrate --force; then
    break
  fi

  tries=$((tries + 1))
  echo "Migration failed (attempt ${tries}/${max_tries}). Retrying in 3s..." 1>&2
  sleep 3
done

if [ "$tries" -ge "$max_tries" ]; then
  echo "Migrations failed after ${max_tries} attempts." 1>&2
  exit 1
fi

exec php artisan serve --host=0.0.0.0 --port=${PORT:-8000}
