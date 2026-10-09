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

### 1. Neon (database)

1. Create a project at neon.tech.
2. Copy **two** connection strings:
   - **Pooled** (`...-pooler.<region>.aws.neon.tech/...?sslmode=require`) → `DATABASE_URL`
   - **Direct** (same host without `-pooler`) → `DIRECT_URL` (used by `prisma migrate`)

### 2. Render (API)

1. Render → **New → Blueprint** → pick this repo (`render.yaml` is at the root).
2. Set the two secret env vars when prompted: `DATABASE_URL` (pooled) and `DIRECT_URL` (direct).
3. `JWT_SECRET` is generated by the blueprint; `PORT` is injected by Render and read in `backend/src/main.ts`.
4. Render's free tier has **no Shell**, so seed the admin account from your machine against the Neon
   **direct** URL:

   ```bash
   cd backend
   DATABASE_URL="<neon direct url>" DIRECT_URL="<neon direct url>" npm run db:seed
   ```

5. Confirm the API is awake: `curl https://<your-service>.onrender.com/workshops` (free instances sleep
   after ~15 min of inactivity — the first request after a sleep takes ~30–60 s).

### 3. Netlify (frontend)

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

Environment variable (**must be set before the build** — `NEXT_PUBLIC_*` values are inlined into the JS
bundle at build time, see `frontend/.env.example`):

```
NEXT_PUBLIC_API_URL = https://<your-render-service>.onrender.com
```

Then: **Deploys → Trigger deploy → Clear cache and deploy site**.

Common pitfalls that produce Netlify's "Page not found":

- **Publish directory pointing at a folder with no `index.html`** (e.g. `frontend/` or `.next/`). With a
  base directory of `frontend`, `publish = "out"` resolves to `frontend/out` — that folder holds the
  real `index.html`.
- **Package directory set to `frontend/`.** Netlify looks for `netlify.toml` in the package directory
  first, then the base directory, then the repo root; leaving it empty means the committed
  `netlify.toml` at the repo root is always used.
- **Missing `NEXT_PUBLIC_API_URL`** during the build — the site loads but every API call hits
  `http://localhost:3001`.
- **Backend asleep / CORS** — Render free instances sleep; `backend/src/main.ts` currently calls
  `app.enableCors()` with no origin restriction.

