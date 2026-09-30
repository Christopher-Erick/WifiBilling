#!/bin/sh
set -eu
mkdir -p /etc/nginx/certs
if [ ! -f /etc/nginx/certs/fullchain.pem ] || [ ! -f /etc/nginx/certs/privkey.pem ]; then
  echo "Generating self-signed origin certificate (replace with a Cloudflare Origin CA cert in production)"
  openssl req -x509 -nodes -newkey rsa:2048 -days 825 \
    -keyout /etc/nginx/certs/privkey.pem \
    -out /etc/nginx/certs/fullchain.pem \
    -subj "/CN=${APP_HOSTNAME:-localhost}"
fi
