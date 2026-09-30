FROM nginx:1.27-alpine
RUN apk add --no-cache openssl wget
COPY nginx.conf /etc/nginx/nginx.conf
COPY cloudflare-realip.conf /etc/nginx/cloudflare-realip.conf
COPY 15-selfsigned.sh /docker-entrypoint.d/15-selfsigned.sh
RUN chmod +x /docker-entrypoint.d/15-selfsigned.sh
EXPOSE 80 443
