# FreeRADIUS

LipaWiFi owns the SQL schema (`nas`, `radcheck`, `radreply`, `radusergroup`, `radacct`, `radpostauth`, group tables). daloRADIUS is not installed.

## What the app writes

On activation:

- `radcheck`: `Cleartext-Password`, `Expiration` (UTC), `Simultaneous-Use`
- `radreply`: `Session-Timeout`, `Mikrotik-Rate-Limit`, `Idle-Timeout`

On expiry or revoke those rows are deleted.

Each `mikrotik_devices` host is upserted into `nas` (`read_clients = yes`).

## Compose

`deploy/freeradius/mods-available-sql` points at the same Postgres as the app. `dictionary.mikrotik` includes `Mikrotik-Rate-Limit`.

Enable the SQL module in the image (symlink `mods-enabled/sql` → `mods-available/sql`, and authorize/accounting sections must call `sql`). The stock `freeradius/freeradius-server` image still needs `sites-enabled/default` to include `sql` in authorize/accounting — treat the shipped files as the contract and verify with `radtest` against a provisioned user.

## Testing a user

After a mock payment in the portal:

```bash
radtest wf2547… password RADIUS_HOST 0 testing123
```

Username/password are shown on the portal success screen and stored on `subscriptions` (admin can read username; treat passwords as secrets).

## Accounting

MikroTik interim-update should be on (2 minutes is enough). `radacct` is the session history used for “activated not confirmed” operational checks.
