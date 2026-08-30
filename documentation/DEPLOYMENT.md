# Deployment

This app runs on the VPS as a Docker container behind nginx, with TLS via Let's Encrypt and the SQLite database persisted to a directory on the host. The container listens on port 3001; nginx terminates TLS and reverse-proxies to it.

The repo on the VPS lives at `~/projects/td.danbock.net/`. `scripts/docker-run.sh` hardcodes that path for `--env-file`, so either keep the repo there or edit the script.

## Environment variables

Create `.env.production` in the repo root on the VPS (not checked in). Required:

| Variable          | Purpose                                                    |
| ----------------- | ----------------------------------------------------------- |
| `DATABASE_URL`    | SQLite file path inside the container. Set to `/app/data/td.sqlite`. |
| `ADMIN_PASSWORD`  | Password for admin access.                                 |
| `SESSION_SECRET`  | Secret used to sign session tokens.                        |

`NODE_ENV`, `PORT`, and `HOSTNAME` are baked into the Dockerfile — don't set them here.

## First-time setup

Do these once per VPS.

### 1. DNS

Point an A record for `td.danbock.net` at the VPS's public IP. Verify propagation before continuing — certbot will fail until DNS resolves:

```
dig +short td.danbock.net
curl ifconfig.me   # what the VPS thinks its IP is — should match
```

### 2. Clone the repo

```
mkdir -p ~/projects
cd ~/projects
git clone <repo-url> td.danbock.net
cd td.danbock.net
```

### 3. Create `.env.production`

```
nano .env.production
```

Paste in the variables from the table above with real values.

### 4. Create the host data directory

The container runs as UID/GID `1001:1001` (the `nextjs` user defined in the Dockerfile). The bind-mounted host directory must be owned by that UID or the SQLite file can't be opened.

```
sudo mkdir -p /var/lib/td.danbock.net
sudo chown 1001:1001 /var/lib/td.danbock.net
```

### 5. nginx site config

If you have an existing working site on this VPS, the fastest path is to copy it and edit the `server_name` and proxy port:

```
sudo cp /etc/nginx/sites-available/<existing-site> /etc/nginx/sites-available/td.danbock.net
sudo nano /etc/nginx/sites-available/td.danbock.net
```

Otherwise, start from this skeleton (HTTP only — certbot will add the TLS block in the next step):

```nginx
server {
    listen 80;
    server_name td.danbock.net;

    location / {
        proxy_pass http://127.0.0.1:3001;
        proxy_http_version 1.1;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection "upgrade";
    }
}
```

Enable it and reload nginx:

```
sudo ln -s /etc/nginx/sites-available/td.danbock.net /etc/nginx/sites-enabled/
sudo nginx -t
sudo systemctl reload nginx
```

### 6. TLS via certbot

```
sudo certbot --nginx -d td.danbock.net
```

Certbot rewrites the nginx config to add a `listen 443 ssl` block and reloads nginx itself. If it fails with a DNS error, re-check step 1 — propagation can take a few minutes.

### 7. Build and start the container

```
cd ~/projects/td.danbock.net
docker build -t td.danbock.net .
./scripts/docker-run.sh
journalctl CONTAINER_NAME=td.danbock.net
```

The entrypoint runs Drizzle migrations against the SQLite file before starting the server, so the database is initialized on first boot.

## Redeploy / update

For every code change after the initial setup, run `scripts/deploy.sh`. It runs the full flow — pull, build, stop, remove, and start (via `scripts/docker-run.sh`):

```
~/projects/td.danbock.net/scripts/deploy.sh
```

Migrations run automatically on container start (`docker-entrypoint.sh` → `migrate.mjs`).

### Updating env vars only

`.env.production` is passed via `--env-file` on `docker run`, and `.dockerignore` excludes `.env*` so the file never enters the build context. Changes take effect on container restart — no rebuild needed:

```
nano .env.production
docker stop td.danbock.net
docker rm td.danbock.net
./scripts/docker-run.sh
```

## Logs

`scripts/docker-run.sh` runs the container with `--log-driver journald`, so container logs go to the host's systemd journal rather than Docker's default per-container `json-file`. This matters because the redeploy flow does `docker rm`, which **deletes a container's `json-file` logs** — the journal, owned by the host, survives container removal and rebuilds.

View them with `journalctl`:

```
journalctl CONTAINER_NAME=td.danbock.net          # all history
journalctl CONTAINER_NAME=td.danbock.net -f       # follow (like `docker logs -f`)
journalctl CONTAINER_NAME=td.danbock.net --since today
journalctl CONTAINER_NAME=td.danbock.net --since "1 hour ago"
```

`docker logs td.danbock.net` no longer works with this driver — use the `journalctl` commands above instead.

## Troubleshooting

- **`docker-run.sh` fails with "container name already in use".** Stop and remove the old container first: `docker stop td.danbock.net && docker rm td.danbock.net`, then re-run.
- **Container starts then crashes; logs show a SQLite open error or `EACCES` on `/app/data`.** The host data directory isn't owned by `1001:1001`. Fix: `sudo chown -R 1001:1001 /var/lib/td.danbock.net`, then `docker rm td.danbock.net` and re-run `./scripts/docker-run.sh`.
- **`certbot --nginx` can't obtain a cert.** Usually DNS hasn't propagated yet. Confirm `dig +short td.danbock.net` returns the VPS's public IP (`curl ifconfig.me` from the VPS shows what that IP is). Re-run certbot once they match.
- **`./scripts/docker-run.sh` errors that the image doesn't exist.** Build it first: `docker build -t td.danbock.net .`.
