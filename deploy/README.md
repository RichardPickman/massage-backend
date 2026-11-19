# Deploying

Two images, two containers, one open port. The database is an Atlas cluster, so
it is not on this machine and survives rebuilding it.

| Image | What it is | Listens on |
| --- | --- | --- |
| `massage-backend` | the API, unprivileged user, uploads capped by tmpfs | 8280, compose network only |
| `massage-web` | Caddy: TLS, the built frontend, `/api` proxy | 80, 443 |

Both are built from their own repository. Nothing on the box is stateful except
the `caddy_data` volume, which holds the certificates — so there is no database
to back up here and no uploads to preserve (images live in S3, the temp staging
directory is a tmpfs that empties with the container).

## One-time, before the first boot

1. **The machine.** Docker Engine and the compose plugin. A CX22 (2 vCPU / 4 GB)
   is plenty: the two containers idle at a few hundred MB.
2. **Firewall.** Only 22, 80 and 443, and 443/udp for HTTP/3:

   ```bash
   ufw allow 22,80,443/tcp && ufw allow 443/udp && ufw enable
   ```

   8280 is never opened. The API is reachable only through Caddy, which is also why
   `TRUST_PROXY=1` is set for it in `docker-compose.yml`.
3. **DNS.** An `A` record for `DOMAIN` pointing at this machine's IPv4 (and `AAAA`
   if it has IPv6). Caddy must be able to answer a challenge for that name, or it
   retries the certificate every few minutes forever.
4. **Atlas.** Network Access → add this machine's IPv4. Skip this and the API
   starts, answers `/api/health`, and hangs on every route that touches the
   database. The allowlist error is in `docker compose logs api`.

## First boot

```bash
git clone https://github.com/RichardPickman/massage-backend
cd massage-backend/deploy
cp .env.production.example .env
$EDITOR .env                      # DOMAIN, DB_*, SECRET_KEY, INVITE_SECRET, BUCKET_*

docker compose build api          # from this repo
docker compose pull web           # or: docker build -t ghcr.io/richardpickman/massage-web:latest ~/Code/massage
docker compose up -d
docker compose logs -f web        # watch the certificate being issued, ~30s
```

Then, from anywhere:

```bash
curl -sf https://DOMAIN/api/health   # {"ok":true}
```

`/api/health` deliberately does not touch Mongo or S3: it answers whether the
process is serving, and the compose health check uses it. It going green does not
mean the database is reachable.

## First account

Registration is closed unless the address is in `ADMIN_EMAILS` or carries an
invite code. Put your own address in `ADMIN_EMAILS` before the first sign-up, or
mint a code:

```bash
docker compose exec api node build/scripts/invite.js you@example.com
```

The role is written into the account and into the token at registration. Adding
somebody to `ADMIN_EMAILS` afterwards changes nothing for an account that already
exists — use the script, then sign out and back in:

```bash
docker compose exec api node build/scripts/promote.js you@example.com
```

## Staging

`staging/` is the same two images with `name: massage-staging`, so it is a second
compose project beside the live one: its own containers, its own `caddy_data`
volume, its own database (`DB` here names a second database on the same Atlas
cluster) and its own bucket. Reached on **8443** with a certificate from Caddy's
own CA instead of Let's Encrypt, which is why the browser warns once per device.

```bash
cd massage-backend/deploy/staging
cp .env.example .env              # then fill in DB_*, SECRET_KEY, BUCKET_*
docker compose up -d --pull always
curl -k https://DOMAIN:8443/api/health
./reset.sh                        # wipe containers, volumes and the testing database
```

Both stacks read the tags they run from their own `.env`, and each image has its
own (`WEB_TAG`, `API_TAG`): the frontend and the API ship on their own schedules,
so deploying one must not move the other. Production's file also accepts a single
`TAG` for both, which is what it ran on before the tags were split.

## Updating

```bash
cd massage-backend/deploy
docker compose pull && docker compose up -d
```

Seconds of downtime. `web` waits for `api` to report healthy, so a bad image
leaves the old frontend serving rather than a Caddy that proxies into nothing.

## When something is wrong

| What you see | What it is |
| --- | --- |
| `502` from Caddy | the API container is down: `docker compose ps`, `docker compose logs api` |
| `/api/health` ok, every data route hangs | Atlas is unreachable or the IP is not allowlisted — look for `MongooseServerSelectionError` |
| The certificate never appears | DNS does not point here yet, or 80/443 are blocked |
| A route answers, images do not | `BUCKET_*` is blank or the key cannot read the object; the API hands the browser a presigned URL |

The API now survives a database it cannot reach: the failure is logged as
`Unhandled rejection:` and the process keeps serving. That is a floor, not a fix —
an async handler whose promise rejects still returns nothing to its caller, so the
client waits instead of getting a `500`.
