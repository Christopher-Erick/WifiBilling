# FreeRADIUS

LipaWiFi owns the SQL schema (`nas`, `radcheck`, `radreply`, `radusergroup`, `radacct`, `radpostauth`, group tables). daloRADIUS is not installed.

## What the app writes

On activation:

- `radcheck`: `Cleartext-Password`, `Expiration` (UTC), `Simultaneous-Use`
- `radreply`: `Session-Timeout`, `Mikrotik-Rate-Limit`, `Idle-Timeout`

On expiry or revoke those rows are deleted.

Each registered site is upserted into `nas` (`read_clients = yes`).

## Compose

`deploy/freeradius` is a small image on top of `freeradius/freeradius-server:3.2.3`. It:

- Starts `radiusd -f -l stdout` (the previous Compose command `-f -l stdout` never launched radiusd and looped)
- Enables the SQL module against the same Postgres as the app
- Waits for `migrate` so RADIUS tables exist
- Loads `dictionary.mikrotik` for `Mikrotik-Rate-Limit`

## Testing a user

After a demo payment in the portal:

```bash
radtest wf2547… password RADIUS_HOST 0 testing123
```

Username is shown on the portal success screen (treat the password as a secret).

## Accounting

MikroTik interim-update should be on (2 minutes is enough). `radacct` is the session history used for “activated not confirmed” operational checks.
