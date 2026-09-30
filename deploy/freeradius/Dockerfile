FROM debian:bookworm-slim

RUN apt-get update && DEBIAN_FRONTEND=noninteractive apt-get install -y --no-install-recommends \
      freeradius \
      freeradius-postgresql \
      freeradius-utils \
      postgresql-client \
      ca-certificates \
    && rm -rf /var/lib/apt/lists/*

ENV FREERADIUS_DIR=/etc/freeradius/3.0

COPY clients.conf ${FREERADIUS_DIR}/clients.conf
COPY sql.conf ${FREERADIUS_DIR}/mods-available/sql
COPY dictionary.mikrotik ${FREERADIUS_DIR}/dictionary.mikrotik
COPY entrypoint.sh /usr/local/bin/radius-entrypoint.sh

RUN ln -sfn ../mods-available/sql ${FREERADIUS_DIR}/mods-enabled/sql \
  && grep -q dictionary.mikrotik ${FREERADIUS_DIR}/dictionary || echo '$INCLUDE dictionary.mikrotik' >> ${FREERADIUS_DIR}/dictionary \
  && chmod 755 /usr/local/bin/radius-entrypoint.sh \
  && chmod 640 ${FREERADIUS_DIR}/clients.conf ${FREERADIUS_DIR}/mods-available/sql \
  && chown -R freerad:freerad ${FREERADIUS_DIR}

EXPOSE 1812/udp 1813/udp
ENTRYPOINT ["/usr/local/bin/radius-entrypoint.sh"]
