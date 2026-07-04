# Deploying the backend to Railway (live, public server)

This gets your backend running on a real public URL, with managed Postgres
and Redis, in about 15 minutes. Total cost: $0 to start (Railway's free
trial credit), then a few dollars/month once you're past it.

## 0. Generate your first database migration (do this locally, once)

Prisma's production start command (`prisma migrate deploy`) only applies
migration files that already exist — it doesn't generate them. So before
deploying, create the initial migration on your machine:

```bash
cd backend
cp .env.example .env
# Quickest option: spin up a temporary local Postgres to generate the migration against.
# If you have Docker installed:
docker run --name temp-pg -e POSTGRES_PASSWORD=pass -p 5432:5432 -d postgres:16
# Edit .env: DATABASE_URL="postgresql://postgres:pass@localhost:5432/postgres"

npm install
npx prisma migrate dev --name init
```

This creates a `prisma/migrations/` folder. **Commit this folder to git** —
it's what Railway will run against your real production database.

```bash
docker stop temp-pg && docker rm temp-pg   # done with the temp DB
```

## 1. Push your code to GitHub

```bash
cd messenger-app
git init
git add .
git commit -m "Initial messenger backend"
# Create a new repo on github.com, then:
git remote add origin https://github.com/YOUR_USERNAME/messenger-app.git
git branch -M main
git push -u origin main
```

## 2. Create a Railway project

1. Go to https://railway.app and sign up (GitHub login is easiest).
2. Click **New Project → Deploy from GitHub repo** → select your repo.
3. When it asks for a root directory, set it to `backend` (since your repo
   has both `backend/` and `mobile/` folders).
4. Railway will detect the `Dockerfile` and build automatically.

## 3. Add managed Postgres and Redis

Still inside your Railway project:

1. Click **New → Database → Add PostgreSQL**. Railway creates it and
   exposes a `DATABASE_URL` variable automatically.
2. Click **New → Database → Add Redis**. Railway exposes `REDIS_URL`.

## 4. Wire up environment variables

Click on your backend service → **Variables** tab, and add:

| Variable | Value |
|---|---|
| `DATABASE_URL` | Click "Add Reference" → select the Postgres `DATABASE_URL` |
| `REDIS_URL` | Click "Add Reference" → select the Redis `REDIS_URL` |
| `JWT_SECRET` | Generate one: run `openssl rand -hex 32` locally, paste the result |
| `JWT_EXPIRES_IN` | `30d` |
| `PORT` | `4000` |
| `NODE_ENV` | `production` |
| `REGION` | e.g. `us-east` (just a label for your logs) |

Referencing the database variables (rather than pasting values) means if
Railway ever rotates credentials, your app keeps working automatically.

## 5. Deploy and get your public URL

Railway auto-deploys on every push to `main`. Once the build finishes:

1. Go to **Settings → Networking → Generate Domain**.
2. You'll get a URL like `https://messenger-backend-production.up.railway.app`.
3. Test it: `curl https://your-url.up.railway.app/health` should return
   `{"status":"ok","region":"us-east"}`.

## 6. Point the mobile app at it

In `mobile/src/services/api.ts`, update:
```ts
export const API_BASE_URL = "https://messenger-backend-production.up.railway.app";
```

## 7. Going multi-region (for real cross-continent low latency)

Railway itself doesn't yet offer multi-region deploys of the *same*
service. Once you outgrow a single region, the straightforward upgrade
path is:
- Deploy the same Docker image to Fly.io instead (it natively supports
  running the same app in multiple regions, e.g. `fly regions add nrt syd fra`),
  pointing all instances at the same managed Postgres/Redis.
- Or deploy separate instances to Railway in effect by creating a second
  project per continent, with all instances sharing one Redis (so
  Socket.io can relay across them) and one Postgres.

Either way, your code doesn't need to change — the Redis adapter already
set up in `socketServer.ts` handles cross-instance message relay.

## Alternatives to Railway

- **Render.com** — similar free-tier flow, also detects Dockerfiles automatically.
- **Fly.io** — better if you want multi-region from day one; steeper CLI-based setup.
- **AWS/GCP** — most control, most setup work; worth it once you have real scale.
