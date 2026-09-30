# RepFuel — Self-Hosted Deployment Guide

> Target audience: an operator agent (e.g. **Hermes**) or a human installing RepFuel on a personal physical PC acting as a 24/7 server.

This document covers everything required to deploy **RepFuel** as a private, multi-user, public-internet-accessible application using:

- **Docker** for app + PostgreSQL
- **Cloudflare Tunnel** for HTTPS access from the public internet (no port forwarding, no exposed IP)
- **PostgreSQL** running locally in a Docker container with persistent volume
- **Automatic local + optional offsite backups**

RepFuel is designed to be the only thing running on the host. It does not require Kubernetes, microservices, or any cloud provider.

---

## 1. Architecture

```
                  Public Internet
                         │
                         ▼
               Cloudflare Edge (TLS)
                         │
                         ▼
       Cloudflare Tunnel (cloudflared, outbound TCP)
                         │
       ┌─────────────────┴─────────────────┐
       │   repfuel-frontend (docker net)   │
       │  cloudflared  ──►  repfuel-app     │
       └─────────────────┬─────────────────┘
                         │   internal only
       ┌─────────────────┴─────────────────┐
       │   repfuel-backend (internal)      │
       │     repfuel-app  ──►  postgres    │
       └───────────────────────────────────┘
```

Key invariants:
- **Postgres is never published on any host port** (`internal: true` on the backend Docker network).
- **The app container is not published** either when Cloudflare Tunnel is used; cloudflared reaches the app over the `frontend` Docker network.
- **No host firewall rules need to expose 80/443/3000/5432.**
- The host's public IP is never exposed to anyone — Cloudflare Tunnel initiates outbound TCP from the host to Cloudflare's edge.

---

## 2. Host Requirements

| Requirement | Recommended |
|---|---|
| OS | Ubuntu Server 24.04 LTS (any modern Debian/Ubuntu works) |
| CPU | 2+ cores |
| RAM | 2 GB minimum, 4 GB recommended |
| Disk | 20 GB minimum (OS + Docker + DB), more for backup retention |
| Docker | Docker Engine + Compose plugin |
| Network | Outbound TCP to `*.cloudflare.com` (HTTPS) — no inbound requirements |
| DNS | A domain managed by Cloudflare (free tier works) |
| Cloudflare account | Free tier is sufficient |

Hostname verification:
```bash
docker --version
docker compose version
```

If `docker compose version` is missing, install the plugin:
```bash
sudo apt-get update
sudo apt-get install docker-compose-plugin
```

---

## 3. Layout on the Host

```
/srv/repfuel/
├── app/                # cloned RepFuel repo
├── config/
│   └── .env.production # secrets (chmod 600)
├── backups/            # PostgreSQL dumps (created by backup-postgres.sh)
└── logs/               # optional: bind-mounted container logs
```

Create this layout:
```bash
sudo mkdir -p /srv/repfuel/app /srv/repfuel/config /srv/repfuel/backups /srv/repfuel/logs
sudo chown -R $USER:$USER /srv/repfuel
```

Clone the repo:
```bash
cd /srv/repfuel
git clone https://github.com/bautistaaris/RepFuel.git app
cd app
git checkout main
```

---

## 4. Generate Secrets

**AUTH_SECRET** (32+ chars random base64):
```bash
node -e "console.log(require('crypto').randomBytes(32).toString('base64'))"
```

**POSTGRES_PASSWORD** (strong password):
```bash
openssl rand -base64 32
```

**CLOUDFLARE_TUNNEL_TOKEN** — obtained from Cloudflare dashboard (see §6).

Store them in `/srv/repfuel/config/.env.production` with `chmod 600`:
```bash
chmod 600 /srv/repfuel/config/.env.production
```

---

## 5. Configure Environment

Copy and edit:
```bash
cp .env.production.example /srv/repfuel/config/.env.production
nano /srv/repfuel/config/.env.production
```

Required variables:
- `POSTGRES_DB`, `POSTGRES_USER`, `POSTGRES_PASSWORD`
- `AUTH_SECRET`
- `APP_URL` — e.g. `https://repfuel.example.com` (no trailing slash)
- `CLOUDFLARE_TUNNEL_TOKEN`
- `EMAIL_PROVIDER=resend`, `EMAIL_FROM`, `EMAIL_API_KEY`
- `TRUST_PROXY=true`
- `RATE_LIMIT_BACKEND=postgres`

---

## 6. Cloudflare Tunnel Setup

### One-time, in Cloudflare dashboard

1. **Cloudflare account**: Sign up at [dash.cloudflare.com](https://dash.cloudflare.com) (free tier is sufficient).

2. **Add your domain** to Cloudflare (the registrar where `example.com` is hosted must allow Cloudflare nameservers). Cloudflare will assign two nameservers; update your registrar to use them. Wait for DNS propagation (5–60 minutes typically).

3. **Create a Tunnel**:
   - Cloudflare Zero Trust → Networks → Tunnels → Create a tunnel
   - Type: **Cloudflared**
   - Name: `repfuel` (or any name)
   - Click **Save tunnel**
   - Copy the **Tunnel Token** shown on the next screen — this is the value for `CLOUDFLARE_TUNNEL_TOKEN`.
     - The token looks like: `eyJhIjoixxxxxxxx...`

4. **Configure the public hostname**:
   - In the same tunnel config screen, "Public Hostname" tab
   - Subdomain: `repfuel` (or `@` for root)
   - Domain: `example.com`
   - Service Type: `HTTP`
   - URL: `repfuel-app:3000` ← **this must match the Docker Compose service name**
   - Save

5. **(Optional) Service tokens / Zero Trust**: if you want to require Cloudflare Access (Zero Trust) in front of RepFuel, add an application with `app.example.com` and a policy. For V1, leave it open to anyone with the URL.

### In the host

Paste the token into `/srv/repfuel/config/.env.production`:
```
CLOUDFLARE_TUNNEL_TOKEN=eyJhIjoixxxxx...
```

That's it. The `cloudflared` Docker container in `compose.prod.yml` reads the token and starts the tunnel automatically.

---

## 7. First-Time Deploy

```bash
cd /srv/repfuel/app
docker compose -f compose.prod.yml --env-file /srv/repfuel/config/.env.production pull
docker compose -f compose.prod.yml --env-file /srv/repfuel/config/.env.production build
docker compose -f compose.prod.yml --env-file /srv/repfuel/config/.env.production up -d
```

Then apply migrations (one-time, after `postgres` is healthy):
```bash
docker compose -f compose.prod.yml --env-file /srv/repfuel/config/.env.production exec -T app npx prisma migrate deploy
```

Then load the global exercise library (idempotent):
```bash
docker compose -f compose.prod.yml --env-file /srv/repfuel/config/.env.production exec -T app npx tsx prisma/seed.ts
```

Create the first admin user (interactive, prompts for nothing — uses env vars):
```bash
ADMIN_EMAIL=admin@example.com ADMIN_PASSWORD='ChangeMe!Now2026' \
  docker compose -f compose.prod.yml --env-file /srv/repfuel/config/.env.production exec -T app npx tsx scripts/seed-admin.ts
```

⚠ Choose a strong password. You can change it later from Settings inside the app.

---

## 8. Healthcheck & Smoke Test

```bash
# Container health
docker compose -f compose.prod.yml ps

# HTTP healthcheck (via Cloudflare)
curl -fsSL https://repfuel.example.com/api/health
# {"ok":true,"time":"..."}

# Direct app health (from host)
docker compose -f compose.prod.yml exec -T app wget -q -O - http://127.0.0.1:3000/api/health
```

If the public URL returns `ok:true`, you have a working deployment.

---

## 9. Backups

### Local backup

```bash
# Single run
BACKUP_DIR=/srv/repfuel/backups PGHOST=postgres PGUSER=repfuel PGPASSWORD=$POSTGRES_PASSWORD PGDATABASE=repfuel \
  /srv/repfuel/app/scripts/backup-postgres.sh
```

This produces:
```
/srv/repfuel/backups/repfuel-YYYY-MM-DD_HH-MM-SS.sql.gz
/srv/repfuel/backups/repfuel-YYYY-MM-DD_HH-MM-SS.sql.gz.sha256
```

Default retention (configurable via env):
- 7 daily backups
- 4 weekly backups (Sundays older than 7 days)
- 6 monthly backups (1st of month)

### Scheduled backup (cron)

```bash
sudo crontab -e
```

Add:
```
0 3 * * * \
  BACKUP_DIR=/srv/repfuel/backups \
  PGHOST=postgres PGUSER=repfuel PGPASSWORD=<paste> PGDATABASE=repfuel \
  OFFSITE_REMOTE="gdrive:repfuel-backups" \
  /srv/repfuel/app/scripts/backup-postgres.sh >> /srv/repfuel/logs/backup.log 2>&1
```

(`OFFSITE_REMOTE` is optional; requires `rclone` configured — see §10.)

### Restore

**Always restore into a temporary database first** to verify the backup is sound:

```bash
# Validate a backup (creates a temp DB, restores, checks counts, drops temp DB)
PGHOST=postgres PGUSER=repfuel PGPASSWORD=$POSTGRES_PASSWORD PGDATABASE=repfuel \
  /srv/repfuel/app/scripts/verify-backup.sh /srv/repfuel/backups/repfuel-2026-09-30_03-00-00.sql.gz
```

**Actual restore** (destructive — drops the live DB):
```bash
PGHOST=postgres PGUSER=repfuel PGPASSWORD=$POSTGRES_PASSWORD PGDATABASE=repfuel \
  /srv/repfuel/app/scripts/restore-postgres.sh /srv/repfuel/backups/repfuel-2026-09-30_03-00-00.sql.gz
```

The script terminates connections, drops the DB, recreates it, streams the backup, then prints row counts.

---

## 10. Offsite Backups (rclone, optional)

`rclone` syncs local backups to any cloud storage it supports (Google Drive, Dropbox, Backblaze B2, S3, etc.).

Install rclone on the host:
```bash
sudo apt-get install rclone
rclone config   # follow interactive setup
```

Then add to `OFFSITE_REMOTE` in cron, e.g. `OFFSITE_REMOTE="gdrive:repfuel-backups"`.

**Never commit rclone credentials to git.** They live in `~/.config/rclone/rclone.conf` on the host with `chmod 600`.

---

## 11. Update Procedure

```bash
cd /srv/repfuel/app

# 1. Backup first (always)
docker compose -f compose.prod.yml --env-file /srv/repfuel/config/.env.production \
  exec -T postgres pg_dump -U $POSTGRES_USER -d $POSTGRES_DB | gzip \
  > /srv/repfuel/backups/pre-update-$(date -u +%Y-%m-%d_%H-%M-%S).sql.gz

# 2. Pull new code
git pull

# 3. Rebuild image
docker compose -f compose.prod.yml --env-file /srv/repfuel/config/.env.production build

# 4. Apply DB migrations (forward only, never destructive)
docker compose -f compose.prod.yml --env-file /srv/repfuel/config/.env.production \
  exec -T app npx prisma migrate deploy

# 5. Restart app only (zero-downtime-ish; postgres stays up)
docker compose -f compose.prod.yml --env-file /srv/repfuel/config/.env.production up -d app

# 6. Verify health
curl -fsSL https://repfuel.example.com/api/health
docker compose -f compose.prod.yml ps
```

### Rollback (image only, DB is forward-compatible)

If a new image is broken, roll back to the previous image:
```bash
cd /srv/repfuel/app
git log --oneline -10          # find last good SHA
git checkout <last-good-sha>   # roll back the code
docker compose -f compose.prod.yml --env-file /srv/repfuel/config/.env.production build
docker compose -f compose.prod.yml --env-file /srv/repfuel/config/.env.production up -d app
```

If you also need to roll back the database schema (rare):
```bash
docker compose -f compose.prod.yml --env-file /srv/repfuel/config/.env.production \
  exec -T app npx prisma migrate resolve --rolled-back <migration-name>
```

To restore data only (without rollback):
```bash
PGHOST=postgres PGUSER=repfuel PGPASSWORD=$POSTGRES_PASSWORD PGDATABASE=repfuel \
  /srv/repfuel/app/scripts/restore-postgres.sh \
    /srv/repfuel/backups/pre-update-2026-09-30_15-32-00.sql.gz
```

---

## 12. Disaster: complete loss of host

If the host dies completely:

1. **Reprovision Ubuntu Server 24.04** on new hardware.
2. Install Docker + Compose plugin.
3. `rclone copy gdrive:repfuel-backups /tmp/recovery/` (or use any offsite copy).
4. Clone RepFuel repo: `git clone https://github.com/bautistaaris/RepFuel.git /srv/repfuel/app`.
5. Restore `/srv/repfuel/config/.env.production` from secure storage (password manager / vault).
6. `docker compose -f compose.prod.yml up -d`.
7. Apply migrations + seed global exercises.
8. Restore latest DB:
   ```bash
   PGPASSWORD=$POSTGRES_PASSWORD /srv/repfuel/app/scripts/restore-postgres.sh /tmp/recovery/latest.sql.gz
   ```

RPO = time since last scheduled backup (default: daily at 03:00 UTC = up to 24h loss).
RTO = ~30 minutes (reprovision + restore + Cloudflare tunnel re-establish).

---

## 13. Health, Logs, Debug

### Logs

```bash
# Stream all logs
docker compose -f compose.prod.yml logs -f

# Just the app
docker compose -f compose.prod.yml logs -f app

# Just postgres
docker compose -f compose.prod.yml logs -f postgres

# Just cloudflared (tunnel connection status)
docker compose -f compose.prod.yml logs -f cloudflared
```

Log rotation is configured in `compose.prod.yml` (`max-size: 10m`, `max-file: 5` per container).

### Inspecting the database

```bash
# Open psql inside the postgres container
docker compose -f compose.prod.yml exec postgres psql -U repfuel -d repfuel

# Or one-off query
docker compose -f compose.prod.yml exec postgres psql -U repfuel -d repfuel -c "SELECT COUNT(*) FROM \"User\";"
```

### Checking rate-limit table growth

```bash
docker compose -f compose.prod.yml exec postgres psql -U repfuel -d repfuel \
  -c "SELECT COUNT(*), MIN(\"createdAt\"), MAX(\"createdAt\") FROM \"RateLimitAttempt\";"
```

The app's `RATE_LIMIT_BACKEND=postgres` deletes expired attempts probabilistically (1% of requests) and via `scripts/backup-postgres.sh`'s cleanup hook in the runtime. The table should stay small (< 1000 rows under normal traffic).

### Stopping & starting

```bash
# Stop everything (preserves data volumes)
docker compose -f compose.prod.yml stop

# Start again
docker compose -f compose.prod.yml start

# Stop + remove containers (PRESERVES volumes — DB intact)
docker compose -f compose.prod.yml down

# ⚠ DESTRUCTIVE: removes volumes too
docker compose -f compose.prod.yml down -v
```

---

## 14. Troubleshooting

| Symptom | Likely cause | Fix |
|---|---|---|
| `app` unhealthy, `postgres` healthy | Bad `DATABASE_URL` or `AUTH_SECRET` missing | Check `docker compose logs app` |
| `postgres` unhealthy | Bad `POSTGRES_PASSWORD`, disk full | Check logs; `docker volume inspect repfuel_postgres-data` |
| `cloudflared` restarts in loop | Bad `CLOUDFLARE_TUNNEL_TOKEN` | Re-copy token from Cloudflare dashboard |
| Public URL returns 521/522 | Tunnel not connected OR app not reachable from `cloudflared` | Verify app is healthy and `repfuel-app:3000` resolves in Cloudflare tunnel config |
| Public URL returns 404 on `/inicio` | App is reachable, just route issue | Login first — auth pages are public, others redirect to `/login` |
| Postgres connection pool exhausted | Too many concurrent connections; not restarted | Lower `connection_limit` in `DATABASE_URL` if using PgBouncer; restart app |
| Cookies not set as Secure in production | `TRUST_PROXY` not set | Set `TRUST_PROXY=true` and restart app |
| Email verification emails never arrive | Email provider not configured or wrong API key | Test with `EMAIL_PROVIDER=console` first; check API key |

---

## 15. Security Hardening (host-level, not in repo)

These steps are outside the repo but expected:

- Disable password SSH login; use SSH keys only.
- Configure UFW: default deny, allow outbound, deny inbound except established/related.
- Enable unattended-upgrades for OS security patches.
- Restrict physical access to the host.
- Set strong passwords for the OS user and `postgres` role.
- Consider full-disk encryption (LUKS) on the host.

---

## 16. URLs cheat sheet (post-install)

| Purpose | URL |
|---|---|
| Public app | `https://repfuel.example.com` |
| Login | `https://repfuel.example.com/login` |
| Register | `https://repfuel.example.com/register` |
| Healthcheck | `https://repfuel.example.com/api/health` |

---

## 17. File map

```
/srv/repfuel/
├── app/                                # this repo (cloned)
│   ├── compose.prod.yml                # production Docker Compose
│   ├── Dockerfile                      # app image
│   ├── .env.production.example         # template (copy to /srv/repfuel/config/.env.production)
│   ├── scripts/
│   │   ├── backup-postgres.sh          # local + offsite backup
│   │   ├── restore-postgres.sh         # destructive restore with row-count verification
│   │   └── verify-backup.sh            # restore to a temp DB to prove the archive is sound
│   └── prisma/
│       └── schema.prisma
├── config/
│   └── .env.production                 # REAL secrets (chmod 600)
├── backups/                            # pg_dump output (created at runtime)
└── logs/                               # optional: bind-mount for host-side log retention
```