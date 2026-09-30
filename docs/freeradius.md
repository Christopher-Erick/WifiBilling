# FreeRADIUS

LipaWiFi owns the SQL schema (`nas`, `radcheck`, `radreply`, `radusergroup`, `radacct`, `radpostauth`, group tables). daloRADIUS is not installed.

## What the app writes

On activation:

- `radcheck`: `Cleartext-Password`, `Expiration` (UTC), `Simultaneous-Use`
- `radreply`: `Session-Timeout`, `Mikrotik-Rate-Limit`, `Idle-Timeout`

On expiry or revoke those rows are deleted.

Each registered site is upserted into `nas` (`read_clients = yes`).

## Compose image

`deploy/freeradius/Dockerfile` is **Debian** (`freeradius` + `freeradius-postgresql`). Configs are **copied into the image** so Windows Docker bind-mounts cannot mark them world-writable (a common restart loop). The entrypoint:

1. Writes `mods-available/sql` from `RADIUS_DB_*` env
2. Enables the SQL module and uncomments `sql` in the default site
3. Waits for the `radcheck` table (after Compose `migrate`)
4. Runs `freeradius -f -l stdout`

Do not bind-mount `/etc/freeradius`. Rebuild the image after client changes, or rely on SQL `nas` for production routers.

## Testing a user

After a demo payment in the portal:

```bash
radtest <login-name> <password> RADIUS_HOST 0 testing123
```

Login name is shown on the portal success screen (treat the password as a secret).

## Accounting

MikroTik interim-update should be on (2 minutes is enough). `radacct` is the session history used for “activated not confirmed” operational checks.
