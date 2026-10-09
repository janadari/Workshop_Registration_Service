# Workshop Registration Service

Workshop registration and capacity management for a small training centre: a manager publishes
workshops, the front desk registers attendees and cancels them, and the system never sells the
same seat twice. Built for the `FullStack_Challenge_WORKSHOP.pdf` brief.

## 🚀 OVERVIEW & STACK

**Backend**: NestJS 12 + Prisma 6 + PostgreSQL (JWT auth, role guards, audit trail)  
**Frontend**: Next.js 16 (React 19) + plain CSS — dark, developer-tool aesthetic, static export  

| Where | What |
| --- | --- |
| `backend/` | NestJS API on `:3001` — auth, users, workshops, registrations, audit log |
| `frontend/` | Next.js dashboard on `:3000` — overview, workshops, users, activity |
| `docs/` | The two submitted PDFs plus the HTML sources they were rendered from |
| `scripts/` | `concurrency-check.py` — the over-registration probe (see below) |

## 📄 Documentation

Both documents are committed as PDFs (and as HTML source, so they are diffable):

| Document | Covers |
| --- | --- |
| [`docs/Local_Setup_Instructions.pdf`](docs/Local_Setup_Instructions.pdf) | Running the backend and the frontend locally: prerequisites, database options, environment variables, migrations, seeding, logins, troubleshooting |
| [`docs/Technology_Choices_Design_and_Tradeoffs.pdf`](docs/Technology_Choices_Design_and_Tradeoffs.pdf) | Technology choices, design decisions, trade-offs, assumptions, and how over-registration is prevented (with measurements) |

## ✅ What is implemented

- **Roles & access control** — `ADMIN` creates accounts, `MANAGER` publishes/edits workshops,
  `MANAGER` + `STAFF` register and cancel attendees. Enforced on the server by
  `JwtAuthGuard` + `RolesGuard`; the UI only hides what a role cannot use.
- **Capacity rule** — a workshop can never hold more active registrations than its capacity,
  including when requests arrive simultaneously.
- **Waitlist** — a full workshop puts the next attendee in a queue (`WAITLISTED`) and promotes
  the oldest one automatically when a seat is freed.
- **Permanent history** — cancelling never deletes a row: it records `status`,
  `cancelledById` and `cancelledAt`, and frees the seat exactly once.
- **Audit trail** — `AuditLog` rows for account creation, workshop create/edit, registration,
  cancellation and waitlist promotion, with actor and timestamp.
- **Filtering** — the overview filters by date range, workshop status and "seats available only".
- **Seed data** — 3 users and 4 workshops (one full + waitlisted, one with a cancellation,
  one completed) so every feature is demonstrable immediately. Re-running it is safe.

## 🔐 Seeded logins

| Role | Email | Password |
| --- | --- | --- |
| ADMIN | `admin@test.com` | `admin123` |
| MANAGER | `manager@test.com` | `manager123` |
| STAFF | `staff@test.com` | `staff123` |

Development-only credentials. Create the ADMIN you need, then change or remove these before any
real deployment, and set `JWT_SECRET` in the environment.


## 🐞 Issues found and how they were solved

Everything below was found while building the project and is fixed in the committed code.

### 1. Over-registration - the race the client described

The capacity check was a read-then-write: count the active registrations, then insert. Under
PostgreSQL's default `READ COMMITTED` the `COUNT` takes no lock, so two simultaneous requests both
read "0 of 1" and both inserted an `ACTIVE` row.

**Measured:** a probe created a workshop with capacity 1 and fired 10 registrations at the same
instant (all threads released by a `threading.Barrier`) - **7 rows ended up `ACTIVE`**. That is the
client's "two of us promised the last seat at the same time", reproduced in a few milliseconds.

**Fix:** lock the workshop row before counting, inside the same transaction:

```ts
// backend/src/registrations/registrations.service.ts - first statement in the transaction
await tx.$queryRaw`SELECT id FROM "Workshop" WHERE id = ${workshopId} FOR UPDATE`;
const activeCount = await tx.registration.count({ where: { workshopId, status: 'ACTIVE' } });
```

**After:** the same probe, run three times - **1 `ACTIVE` / 9 `WAITLISTED`** every time. Reproduce
it with the API running and seeded:

```bash
python3 scripts/concurrency-check.py
# RESULT: PASS - capacity respected
```

The cancel path was hardened in the same way:

- the workshop row is locked **before** the registration status is re-read;
- cancelling an already-cancelled registration is a **no-op** (before, it could free a second seat
  and overwrite the original `cancelledById` / `cancelledAt`, losing who really cancelled it);
- a waitlisted attendee is promoted **only if an `ACTIVE` seat was actually freed**, and only while
  the count is still below capacity.

### 2. Hardcoded JWT secret

`'super-secret'` was hardcoded in the signing *and* the verifying code. Everything worked, which is
exactly why it was dangerous: anyone who can read the repository could sign themselves an ADMIN
token. Fixed with a single source of truth (`backend/src/auth/jwt.constants.ts`) that reads
`JWT_SECRET` from the environment, keeping a development-only fallback so local runs stay easy.

### 3. Validation gaps in the DTOs

`role`, `status` and `capacity` accepted any value, and the update DTOs had no decorators at all, so
`{"capacity": "many"}` reached Prisma and surfaced as a 500 instead of a 400. Fixed with shared
`ROLES` / `WORKSHOP_STATUSES` constants, `@IsIn(...)`, `@IsInt() @Min(1)` and real decorators on the
update DTOs.

### 4. Duplicate workshop code answered 500

Creating a workshop with an existing `code` returned "Internal server error". Now checked explicitly
and answered with **409** and the offending code.

### 5. This README described a different application

It documented SQLite, a full workshop being *rejected* with `BadRequestException`, no waitlist and a
single seeded user. Rewritten to match the code, with the longer explanations in `docs/`.

### 6. `NEXT_PUBLIC_API_URL` missing on Netlify

The static export then calls `http://localhost:3001`, so the deploy works on the developer's machine
and is broken for everyone else. `frontend/next.config.ts` now fails the build with a clear message
when the variable is missing or still points at localhost.

### 7. Tests and checks

```bash
cd backend && npm test        # 6 tests: capacity rule, lock ordering, waitlist, double-cancel
cd backend && npm run lint    # oxlint: 0 warnings, 0 errors
cd backend && npm run build   # TypeScript type-checks clean
```

---

## 💻 Running it locally

```bash
# backend (terminal 1)
cd backend && npm install && npx prisma generate
# create .env next to package.json, then:
npx prisma migrate deploy && npm run db:seed
npm run start:dev                             # -> http://localhost:3001

# frontend (terminal 2)
cd frontend && npm install && npm run dev     # -> http://localhost:3000
```

`.env` for the backend needs `DATABASE_URL`, `DIRECT_URL` and `JWT_SECRET` (`PORT` defaults to
3001). The frontend falls back to `http://localhost:3001` when `NEXT_PUBLIC_API_URL` is not set.

Seeded logins: `admin@test.com` / `admin123`, `manager@test.com` / `manager123`,
`staff@test.com` / `staff123`.

Full instructions - the three ways to get a PostgreSQL database, every environment variable,
migrations, seeding, the click-through smoke test and troubleshooting - are in
[`docs/Local_Setup_Instructions.pdf`](docs/Local_Setup_Instructions.pdf).

---

## 🚀 DEPLOYMENT (Netlify + Render + Neon)

| Piece | Host | Why |
| --- | --- | --- |
| Frontend (Next.js) | **Netlify** (free) | Static export — no SSR runtime, no functions, no credit burn |
| API (NestJS + Prisma) | **Render** Web Service (free) | Blueprint defined in `render.yaml` |
| PostgreSQL | **Neon** (free, 1 GB) | Render's own free Postgres is deleted after 30 days |

### Step 1 — Neon (free PostgreSQL)

1. neon.com → **New Project**.
2. Choose the region closest to you. Pair it with the Render region in `render.yaml` (currently
   `singapore`) so the API and the database sit in the same part of the world — e.g. Neon
   **Singapore (ap-southeast-1)** + Render **singapore**.
3. Click **Connect** and copy **both** connection strings — they differ only by `-pooler` in the host:

| Goes into | Which string | Example host |
| --- | --- | --- |
| `DATABASE_URL` (used at runtime) | **Pooled** connection | `ep-cool-name-123456-pooler.ap-southeast-1.aws.neon.tech` |
| `DIRECT_URL` (used by migrations) | **Direct** (unpooled) | `ep-cool-name-123456.ap-southeast-1.aws.neon.tech` |

Both end with `?sslmode=require`; append `&connect_timeout=15`. Neon suspends idle computes, and without
that parameter Prisma can throw `Can't reach database server` the first time it touches a sleeping Neon
database.

### Step 2 — Render (free API)

1. render.com → **New → Blueprint** → connect this GitHub repo. Render reads `render.yaml` from the repo
   root and proposes the `workshop-registration-api` web service (`rootDir: backend`).
2. Paste the two Neon strings when the form asks for the secret env vars (`sync: false` in
   `render.yaml`): `DATABASE_URL` = pooled, `DIRECT_URL` = direct.
   `JWT_SECRET` is generated by the blueprint and Render injects `PORT` itself (read in
   `backend/src/main.ts`).
3. Click **Create** and watch the first deploy. What actually runs:

| Phase | Command | Purpose |
| --- | --- | --- |
| Build | `npm ci --include=dev && npx prisma generate && npm run build` | devDeps are needed by `nest build`; generates the Prisma client; compiles to `dist/` |
| Start | `npx prisma migrate deploy && node dist/main` | applies `backend/prisma/migrations/*` to Neon via `DIRECT_URL`, then starts Nest on `$PORT` |

   Running `migrate deploy` at boot is what creates the tables on Render's free plan, where you have no
   Shell access. Render only sets `NODE_ENV=production` at **runtime**, so the build still gets devDeps.
4. Render polls **`/health`** (set in `render.yaml`) → `{"status":"ok"}`. A passing health check is
   required before traffic is routed to the new instance.
5. Your API is at `https://workshop-registration-api.onrender.com` (the `name` in `render.yaml`).
   Verify: `curl https://workshop-registration-api.onrender.com/health`.

> #### How to find your Render URL (don't guess it)
>
> Render derives the subdomain from the service **name**, and appends a short suffix when that name is
> already taken by another Render user — so `workshop-registration-api.onrender.com` is the *expected*
> URL, not a guaranteed one. Read the real value from one of these:
>
> 1. **Dashboard (easiest)** — open the service at dashboard.render.com: the `*.onrender.com` URL is shown
>    at the top of the service page (clickable). Use it verbatim.
> 2. **Deploy log** — service → **Logs**: the build output ends with the URL of the live service; grep the
>    log for `onrender.com`.
> 3. **CLI / REST API** — from your machine:
>
>    ```bash
>    brew install render && render login          # or: export RENDER_API_KEY=rnd_...
>    render services -o json | grep -o '"url":"[^"]*"' | sort -u
>
>    # or straight from the REST API:
>    curl -s -H "Authorization: Bearer $RENDER_API_KEY" \
>      'https://api.render.com/v1/services?limit=100' | grep -o '"url":"[^"]*"' | sort -u
>    ```
>
>    In the API response the public URL is `service.serviceDetails.url`; `service.dashboardUrl` is the link
>    back to the dashboard. (API keys: Render Dashboard → **Account Settings → API Keys**.)
>
> Copy that exact URL — it is the `NEXT_PUBLIC_API_URL` value in Step 4 and the origin for `CORS_ORIGIN`.
> No trailing slash. Renaming the service later changes the URL, so update Netlify + `CORS_ORIGIN` if you do.

### Step 3 — Seed the admin user (once, from your machine)

Render's free tier has no Shell, so seed locally against Neon. Use the **direct** string for both
variables so the seed does not run through PgBouncer:

```bash
cd backend
DATABASE_URL="<neon direct url>" DIRECT_URL="<neon direct url>" npm run db:seed
# → Seeded Admin: admin@test.com
```

The seed `upsert`s, so re-running it is safe. It creates three accounts
(`backend/prisma/seed.ts`): `admin@test.com` / `admin123`, `manager@test.com` / `manager123` and
`staff@test.com` / `staff123` (dev-only).

### Step 4 — Netlify (frontend)

The frontend is exported to plain static files: `frontend/next.config.ts` sets `output: "export"` and
`trailingSlash: true`, so `next build` emits `frontend/out/**/index.html` and Netlify just serves them.
That is why there is no `@netlify/plugin-nextjs` / SSR runtime in the deploy.

Build settings (both `netlify.toml` and the UI must agree — `netlify.toml` wins when they differ):

| Setting | Value |
| --- | --- |
| Base directory | `frontend` |
| Package directory | *(leave empty)* |
| Build command | `npm run build` |
| Publish directory | `out` |
| Functions directory | *(leave empty)* |

#### The one environment variable you must add

| Item | Value |
| --- | --- |
| Where | Netlify → **Project configuration → Environment variables → Add a variable** |
| Key | `NEXT_PUBLIC_API_URL` |
| Value | `https://<your-render-service>.onrender.com` (no trailing slash, no `/api`) |
| Scopes | tick **Builds** only (a static export needs it while building, not at runtime) |

(The classic UI calls this **Site settings → Build & deploy → Environment**.) Copy the URL from the Render
dashboard — the top of the service page shows **Your service URL**. `render.yaml` requests the name
`workshop-registration-api`, but Render appends a short suffix if that name is already taken, so trust the
dashboard value.

**Why it must be set *before* the build:** `NEXT_PUBLIC_*` values are inlined into the JS bundle by
`next build` — `frontend/src/lib/api.ts` reads it and otherwise falls back to `http://localhost:3001`. A
deploy built without it can only reach a backend running on the *visitor's* own machine, which is exactly
why the site looks fine while your laptop is serving the API.

Then **Deploys → Trigger deploy → Clear cache and deploy site**. Saving the variable alone changes nothing
on the live site: the value is baked into the files at build time.

**How to see whether it worked** (any of these):

```bash
# 1) The Netlify deploy log prints the value it baked, as the first [next.config] line:
#    [next.config] API base URL baked into this bundle: https://<service>.onrender.com

# 2) Grep the live bundle for the URL
SITE=https://<your-site>.netlify.app
for f in $(curl -sL "$SITE"/ | grep -oE '/_next/static/chunks/[^"]+\.js' | sort -u); do
  curl -s "$SITE$f" | grep -q 'onrender.com'    && echo "OK   $f"
  curl -s "$SITE$f" | grep -q 'localhost:3001'  && echo "BAD, localhost baked in: $f"
done

# 3) List the variables Netlify stores for the site (secret values shown, so treat with care)
npx netlify-cli login && npx netlify-cli link   # pick the existing site once
npx netlify-cli env:list                        # key + value + scopes
```

In the browser: **F12 → Network → click any login/API request → Request URL** must point at
`<service>.onrender.com`.

If the variable is missing or still points at localhost during a build that runs on Netlify,
`frontend/next.config.ts` **fails that build on purpose** and prints the value it saw, so a localhost
bundle cannot reach production by accident. Local builds are unaffected — they read
`frontend/.env.local` (which keeps `http://localhost:3001` for your local backend).

<details>
<summary><b>Troubleshooting: <code>Current value: (not set at all)</code></b></summary>

That message means the build process really had no `NEXT_PUBLIC_API_URL` in its environment. The guard
also lists the names of every env var it *can* see that looks related, which usually identifies the
problem in one line:

| Log says | Cause | Fix |
| --- | --- | --- |
| A near-miss name, e.g. `NEXT_PUBLIC_API_URI` | Key typo (or an old name) | Rename/delete it so the key is exactly `NEXT_PUBLIC_API_URL` |
| `(none)` | The variable never reached this build | See the three causes below |

1. **Scope does not include Builds.** Netlify variables have scopes (`Builds`, `Functions`, `Runtime`)
   *and* per-deploy-context values; a variable ticked only for Functions/Runtime is simply not exported
   to `npm run build`. Tick **Builds**.
2. **Wrong deploy context.** A value saved for *Deploy previews* or *Branch deploys* is not used by a
   production deploy. Choose **All deploy contexts** (or set it for **Production**).
3. **Different project / never saved / sensitive policy.** The variable may live on another Netlify
   site (or team-level *shared* variables), the "Add a variable" form may never have been saved, or a
   variable marked **Contains secret values** was stripped because the deploy was untrusted under the
   site's *Sensitive variable policy*. `NEXT_PUBLIC_API_URL` is public — don't mark it secret.

Verify what the build will actually receive, then redeploy (clear cache):

```bash
npx netlify-cli env:list --context production --scope builds --plain  # what a production build gets
npx netlify-cli env:get NEXT_PUBLIC_API_URL --context production      # resolves netlify.toml too
npx netlify-cli env:set NEXT_PUBLIC_API_URL "https://<service>.onrender.com" \
  --scope builds --context production                                 # or just fix it in the UI
```

</details>

*Alternative to the UI:* because the URL is public anyway, you may instead commit it as
`NEXT_PUBLIC_API_URL = "https://<service>.onrender.com"` inside `[build.environment]` in `netlify.toml`.
Never put real secrets there — that file is in git.

Common pitfalls that produce Netlify's "Page not found":

- **Publish directory pointing at a folder with no `index.html`** (e.g. `frontend/` or `.next/`). With a
  base directory of `frontend`, `publish = "out"` resolves to `frontend/out` — that folder holds the
  real `index.html`.
- **Package directory set to `frontend/`.** Netlify looks for `netlify.toml` in the package directory
  first, then the base directory, then the repo root; leaving it empty means the committed
  `netlify.toml` at the repo root is always used.
- **Missing `NEXT_PUBLIC_API_URL`** during the build — the site loads but every API call hits
  `http://localhost:3001`. Since this repo guards against that, the Netlify build now fails with
  `Netlify build stopped: NEXT_PUBLIC_API_URL is not usable`; add the variable and clear-cache-redeploy.
- **Variable saved but the site unchanged** — `NEXT_PUBLIC_*` is inlined at build time, so you must
  trigger a new deploy (Clear cache and deploy site) for it to take effect.
- **Cold starts** — Render free instances spin down after ~15 minutes of inactivity; the next request
  takes 30–60 s and the UI may briefly show "Unable to reach the server". Warm the API up with
  `curl https://<api>/health` before a demo.
- **CORS** — open by default, which works for any `*.netlify.app` URL. To lock the API to your site, set
  `CORS_ORIGIN="https://<your-site>.netlify.app"` on Render (comma-separate multiple origins).

### Step 5 — Post-deploy smoke test

Free web services sleep after 15 minutes without traffic and need ~1 minute to wake, so the first
request can hang — `--max-time 90` on the first call covers the cold start.

```bash
API=https://workshop-registration-api.onrender.com   # exact URL from Step 2 above

curl -s --max-time 90 -o /dev/null -w 'warm-up: %{http_code}\n' "$API/health"
curl -s "$API/health"                       # {"status":"ok"}
curl -s -o /dev/null -w '%{http_code}\n' "$API/users"   # 401 - JWT guard is active

TOKEN=$(curl -s -X POST "$API/auth/login" -H 'Content-Type: application/json' \
  -d '{"email":"admin@test.com","password":"admin123"}' \
  | python3 -c 'import sys,json;print(json.load(sys.stdin)["access_token"])')

curl -s -H "Authorization: Bearer $TOKEN" "$API/users" | head -c 200
```

Then open the Netlify URL and sign in with `admin@test.com` / `admin123`. (Verified locally against a
throwaway Postgres with the same commands Render runs: `/health` 200, `/auth/login` 201, `/users` 200 with
a JWT and 401 without, CORS preflight 204. `GET /workshops` and `GET /registrations` correctly return 403
for an ADMIN token — those routes are `@Roles('MANAGER','STAFF')`.)

If the Netlify build log shows the auto-installed Next.js adapter interfering with the static export
(`Export directory not found` / `publish directory does not contain expected Next.js build output`),
uncomment `NETLIFY_NEXT_PLUGIN_SKIP = "true"` in `netlify.toml` to bypass it — the `out` folder is then
published verbatim:

```bash
# reproduce the exact Netlify build locally
cd frontend && rm -rf .next out && npm run build && npx serve out -l 3000
```

