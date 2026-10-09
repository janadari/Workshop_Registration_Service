# Workshop Registration Service - Project Status

## 🚀 OVERVIEW & STACK
**Frontend**: Next.js (React) + Vanilla CSS (Developer Tool Aesthetic, Dark Mode)  
**Backend**: NestJS + Prisma ORM (SQLite DB)  

This document outlines the current progress against the requirements from the `FullStack_Challenge_WORKSHOP.pdf` brief, explicitly detailing what has been implemented so far and what remaining steps need to be completed.

---

## ✅ WHAT HAS BEEN COMPLETED (DONE)

### 1. Database & Schema Architecture
- [x] **SQLite Database Setup**: Bootstrapped via Prisma for zero-friction local setup.
- [x] **User Models**: Support for Admin, Manager, and Staff roles.
- [x] **Workshop Models**: Tracking `code`, `title`, `instructor`, `date`, `capacity`, and `status`.
- [x] **Registration Models**: Captures `attendeeName`, `attendeeEmail`, `status` (ACTIVE/CANCELLED). Includes fields for `createdById`, `cancelledById`, `createdAt`, and `cancelledAt` to maintain a permanent history as required.
- [x] **Audit Trail (Bonus)**: Created an `AuditLog` table to record when workshops are edited or roles/accounts are created.
- [x] **Seed Script**: Successfully seeds the first Admin account (`admin@test.com` / password: `admin123`).

### 2. Backend Security & Role-Based Auth (RBAC)
- [x] **JWT Authentication**: Implemented `passport-jwt` and `JwtAuthGuard` to protect all internal endpoints.
- [x] **Strict Role Enforcement**: Built a `RolesGuard` and `@Roles()` decorator.
  - *Admin*: Protected `/users` endpoint for creating new accounts.
  - *Manager*: Protected `POST /workshops` and `PATCH /workshops/:id` for adding/editing workshops.
  - *Manager/Staff*: Protected `/registrations` endpoints for registering and cancelling attendees.

### 3. Concurrency Safety (Over-Registration Prevention)
- [x] **Capacity Logic**: Built a transactional lock within Prisma (`backend/src/registrations/registrations.service.ts`). 
- [x] When a registration request arrives, the backend queries the workshop's *current active registrations count*. If the count equals or exceeds the capacity limit, it instantly rejects the request with a `BadRequestException` (`Workshop is full`). Because it executes within a Prisma `$transaction` on SQLite, race conditions are mitigated.

### 4. Frontend Foundation
- [x] **Next.js Foundation**: Established the app directory routing.
- [x] **Developer-Tool Aesthetics**: Built a robust CSS variables system (`globals.css`) for strict spacing, dark mode, typography, button states, and shimmer skeleton loaders without using Tailwind.
- [x] **API Client**: Implemented a generic `fetchApi` wrapper (`lib/api.ts`) that automatically handles JWT tokens stored in local storage.
- [x] **Login Page UI**: Functional login flow at `/login` that connects to the backend and fetches the JWT.
- [x] **Dashboard Scaffold**: A foundational dashboard on `/` that automatically loads and displays the workshops fetched from the API with skeleton loaders.

---

## 🛠 WHAT STILL NEEDS TO BE DONE (TODO)

While the backend is structurally complete and enforces all rules, the *Frontend UI* needs to be fully wired up to these endpoints to complete the end-to-end experience.

### Step 1: Complete the UI Role Workflows
- [ ] **Admin View (Account Creation)**: Add a modal/page for Admins to create new accounts for Managers and Staff. The backend endpoint `POST /users` is ready.
- [ ] **Manager View (Workshop Management)**: Add a modal/page for Managers to create and edit workshops. The backend endpoints `POST /workshops` and `PATCH /workshops/:id` are ready.
- [ ] **Registration Flow (Staff/Manager)**: Add the "Register Attendee" modal on the dashboard where Staff/Managers can input an attendee's Name & Email. Wire this to the `POST /registrations` endpoint.
- [ ] **Cancellation Flow**: Add a "Cancel Registration" button next to attendees. Wire this to `PATCH /registrations/:id/cancel` which frees the seat but keeps the record.

### Step 2: Implement Workshop Finding / Filtering
- [ ] **Backend Filtering**: Update the `findAll()` method in `workshops.controller.ts` to accept Query parameters (e.g., `?dateRange=...&status=...&availableSeats=true`).
- [ ] **Frontend Search**: Wire the dummy search inputs in `page.tsx` to pass these query parameters and filter the workshop list down without scrolling.

### Step 3: Polish Registration History & Views
- [ ] **Attendee List UI**: Create an interface (perhaps an accordion or a separate route `/workshops/:id`) to display all attendees for a workshop, distinguishing between ACTIVE and CANCELLED registrations, and showing exactly which Staff member created/cancelled them.

### Step 4: Add "Waitlist" (Optional Bonus)
- [ ] Create a `WAITLISTED` status. Update the Prisma transaction to queue users into a waitlist when capacity is reached, and automatically promote them when a cancellation occurs.

---

## 💻 RUNNING THE PROJECT locally

The servers are already running in your terminal:
1. **Frontend**: `http://localhost:3000` (or `3002`/`3003` depending on port availability - check your active terminal tab)
2. **Backend**: `http://localhost:3001`

**Login Credentials**:
- **Email**: `admin@test.com`
- **Password**: `admin123`

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

### Step 3 — Seed the admin user (once, from your machine)

Render's free tier has no Shell, so seed locally against Neon. Use the **direct** string for both
variables so the seed does not run through PgBouncer:

```bash
cd backend
DATABASE_URL="<neon direct url>" DIRECT_URL="<neon direct url>" npm run db:seed
# → Seeded Admin: admin@test.com
```

The seed `upsert`s, so re-running it is safe. Log in with `admin@test.com` / `admin123`
(`backend/prisma/seed.ts`).

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

```bash
API=https://workshop-registration-api.onrender.com

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

