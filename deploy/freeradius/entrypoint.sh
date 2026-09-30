#!/bin/sh
set -eu

SQL=/etc/raddb/mods-available/sql
if [ -f "$SQL" ]; then
  sed -i \
    -e "s|@RADIUS_DB_HOST@|${RADIUS_DB_HOST:-db}|g" \
    -e "s|@RADIUS_DB_USER@|${RADIUS_DB_USER:-lipawifi}|g" \
    -e "s|@RADIUS_DB_PASSWORD@|${RADIUS_DB_PASSWORD:-lipawifi_dev}|g" \
    -e "s|@RADIUS_DB_NAME@|${RADIUS_DB_NAME:-lipawifi}|g" \
    "$SQL"
fi

if [ ! -e /etc/raddb/mods-enabled/sql ]; then
  ln -sf /etc/raddb/mods-available/sql /etc/raddb/mods-enabled/sql
fi

if [ "$#" -eq 0 ]; then
  set -- radiusd -f -l stdout
fi

exec "$@"
