#!/bin/sh
set -eu

DIR="${FREERADIUS_DIR:-/etc/freeradius/3.0}"
HOST="${RADIUS_DB_HOST:-db}"
PORT="${RADIUS_DB_PORT:-5432}"
USER="${RADIUS_DB_USER:-lipawifi}"
NAME="${RADIUS_DB_NAME:-lipawifi}"
PASS="${RADIUS_DB_PASSWORD:-lipawifi_dev}"

# Bake env into the SQL module so we do not depend on FreeRADIUS $ENV{} expansion.
# Keep dialect queries from the Debian package.
cat > "${DIR}/mods-available/sql" <<EOF
sql {
	driver = "rlm_sql_postgresql"
	dialect = "postgresql"
	server = "${HOST}"
	port = ${PORT}
	login = "${USER}"
	password = "${PASS}"
	radius_db = "${NAME}"
	acct_table1 = "radacct"
	acct_table2 = "radacct"
	postauth_table = "radpostauth"
	authcheck_table = "radcheck"
	authreply_table = "radreply"
	groupcheck_table = "radgroupcheck"
	groupreply_table = "radgroupreply"
	usergroup_table = "radusergroup"
	read_clients = yes
	client_table = "nas"
	read_groups = yes
	delete_stale_sessions = yes
	pool {
		start = 1
		min = 0
		max = 8
		spare = 1
		idle_timeout = 60
	}
}
EOF
chmod 640 "${DIR}/mods-available/sql"
chown freerad:freerad "${DIR}/mods-available/sql" 2>/dev/null || true
ln -sfn ../mods-available/sql "${DIR}/mods-enabled/sql"

# Uncomment sql in the default virtual server (authorize / accounting / session / post-auth).
if [ -f "${DIR}/sites-available/default" ]; then
  sed -i 's/^#[[:space:]]*sql$/	sql/' "${DIR}/sites-available/default"
fi
if [ -f "${DIR}/sites-available/inner-tunnel" ]; then
  sed -i 's/^#[[:space:]]*sql$/	sql/' "${DIR}/sites-available/inner-tunnel"
fi

echo "Waiting for Postgres ${HOST}:${PORT} and radcheck table..."
i=0
while [ "$i" -lt 60 ]; do
  if PGPASSWORD="${PASS}" psql -h "${HOST}" -p "${PORT}" -U "${USER}" -d "${NAME}" -c "SELECT 1 FROM radcheck LIMIT 1" >/dev/null 2>&1; then
    break
  fi
  i=$((i + 1))
  sleep 2
done

if [ "$i" -ge 60 ]; then
  echo "Postgres RADIUS tables are not ready; starting anyway so the container can retry on next health cycle" >&2
fi

# Configs are copied into the image (not bind-mounted) so Windows Docker cannot mark them world-writable.
exec freeradius -f -l stdout -d "${DIR}"
