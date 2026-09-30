FROM freeradius/freeradius-server:3.2.3

USER root
COPY clients.conf /etc/raddb/clients.conf
COPY dictionary.mikrotik /etc/raddb/dictionary.mikrotik
COPY sql.conf /etc/raddb/mods-available/sql
COPY entrypoint.sh /usr/local/bin/lipawifi-radius-entrypoint.sh

RUN set -eux; \
  echo '$INCLUDE dictionary.mikrotik' >> /etc/raddb/dictionary; \
  ln -sf /etc/raddb/mods-available/sql /etc/raddb/mods-enabled/sql; \
  chmod +x /usr/local/bin/lipawifi-radius-entrypoint.sh

ENTRYPOINT ["/usr/local/bin/lipawifi-radius-entrypoint.sh"]
CMD ["radiusd", "-f", "-l", "stdout"]
