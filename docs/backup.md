# Backup and restore

## What to back up

- **PostgreSQL** — entire `lipawifi` database (billing + RADIUS SQL + immutable `audit_logs`)
- **Secrets** — `.env` / vault (not the git repo)
- Redis is ephemeral (locks and rate limits)

## Dump

```bash
pg_dump -Fc -d "$DATABASE_URL" -f lipawifi-$(date +%F).dump
```

Or from Compose:

```bash
docker compose exec -T db pg_dump -U lipawifi -Fc lipawifi > lipawifi.dump
```

## Restore

```bash
pg_restore --clean --if-exists -d "$DATABASE_URL" lipawifi.dump
npx prisma migrate deploy
```

After restore, FreeRADIUS will see the same `nas` and `radcheck` rows. Confirm workers are running so expiry continues.

## Secret rotation

Rotate `SESSION_SECRET` (signs out admins), Daraja keys, RADIUS secrets (update both LipaWiFi device row and MikroTik `/radius`), and Postgres password together with `DATABASE_URL`.
