# Workshop Registration Service

Workshop registration and capacity management for a small training centre: a **manager** publishes
workshops, the **front desk** registers and cancels attendees, and the system **never sells the same
seat twice**. Built for the `FullStack_Challenge_WORKSHOP.pdf` brief.

- **Stack** — NestJS 12 + Prisma 6 + PostgreSQL 16 · Next.js 16 (React 19) + plain CSS
- **Extras** — [`docs/`](docs) (the two submitted PDFs) · [`scripts/concurrency-check.py`](scripts/concurrency-check.py) (capacity probe)

---

## 1. The problem

Straight from the brief (the client's own words in quotes):

| | Problem |
| --- | --- |
| **P1** | "24 people turned up for a workshop with 20 seats. Two of us promised the last seat at the same time." Capacity is not enforced when requests arrive **simultaneously** — nothing stops over-registration. |
| **P2** | "When someone cancels, nobody frees up the seat or records who did it." A cancellation loses the seat and the history behind it. |
| **P3** | "Three types of user, no public signup, permissions refused by the backend." Roles must be enforced **server-side** (not merely hidden in the UI), and users cannot register themselves. |
| **P4** | "I just want to see which workshops this week still have seats." There is no reliable, at-a-glance view of remaining seats. |
| **P5** | Extra credit: a **waitlist** for full workshops and an **audit trail** of who did what. |

## 2. How each problem was overcome

| | What was built | Where |
| --- | --- | --- |
| **P1** | Capacity is checked **inside a transaction that first locks the workshop row** (`SELECT id FROM "Workshop" ... FOR UPDATE`), so simultaneous requests are serialised and only one can take the final seat. A full workshop puts the next person on the **waitlist** instead of overbooking. | `registrations.service.ts` → `register()` |
| **P2** | Cancelling **never deletes** anything: it sets `status = CANCELLED` plus `cancelledById` / `cancelledAt`, frees the seat **exactly once**, and immediately promotes the oldest `WAITLISTED` attendee if the workshop is still below capacity. | `cancel()`, `promoteNextWaitlist()` |
| **P3** | No public signup — only an `ADMIN` creates accounts. Every route passes `JwtAuthGuard` + `RolesGuard` with `@Roles(...)`, so a forbidden action is a **403 from the API** even if the UI never offered the button. | `auth/guards`, `*.controller.ts` |
| **P4** | `GET /workshops` returns API-computed seat counts per workshop, and the dashboard filters by **date range**, workshop **status** and **"seats available only"**. | `workshops.service.ts`, `OverviewView` |
| **P5** | `AuditLog` rows (actor + action + timestamp) are written for account creation, workshop create/edit, registration, cancellation and waitlist promotion, and shown in an **Activity** view. `WAITLISTED` is a third registration status and is promoted automatically when a seat frees up. | `AuditLog`, `ActivityView` |

**Measured, not asserted.** 10 simultaneous registrations on a workshop with **capacity 1**:

| | Result |
| --- | --- |
| Before the fix | **7 rows `ACTIVE`** on a 1-seat workshop — the client's complaint, reproduced |
| After the fix | **1 `ACTIVE` + 9 `WAITLISTED`**, three runs in a row |

Reproduce it: `python3 scripts/concurrency-check.py` (API running and seeded → prints `PASS - capacity resolved`).

### Other defects found while building (and their fixes)

| Defect | Fix |
| --- | --- |
| Double-cancel could free a **second** seat and overwrite `cancelledById` / `cancelledAt`, erasing who really cancelled | `cancel()` now locks the workshop row before re-reading the registration, and is a **no-op** if it is already cancelled |
| **Hardcoded JWT secret** (`'super-secret'`) committed in the source | `JWT_SECRET` (and `JWT_EXPIRES_IN`) are read from the environment via `auth/jwt.constants.ts`, with a development-only fallback |
| DTO validation gaps — an unknown `role`, a negative capacity, etc. reached the database and answered **500** | `class-validator` on every DTO (`@IsIn`, `@IsInt`, `@Min`, real decorators on the update DTOs): bad input is now a **400** |
| A duplicate workshop `code` answered **500** | Pre-checked and answered as **409 Conflict** |
| The README described a different application (SQLite, no waitlist), and there were no sample workshops to demo the features | README rewritten against the real stack; the seed is idempotent and creates 3 users + 4 workshops (one full and waitlisted, one with a cancellation, one completed) |
| The frontend baked `http://localhost:3001` into a Netlify build, so production could only reach a backend on the visitor's own machine | `next.config.ts` refuses the Netlify build when `NEXT_PUBLIC_API_URL` is missing or localhost, and logs the URL it did use |

## 3. Technology used

| Layer | Choice | Why this one |
| --- | --- | --- |
| Backend | **NestJS 12 + TypeScript** | Declarative routing with `@UseGuards` / `@Roles` maps directly onto the permission model; DTO classes give validation for free; DI keeps the capacity rule in one testable service |
| Data | **PostgreSQL 16** | Row locking (`SELECT ... FOR UPDATE`) and real transactions are what make **P1** solvable; SQLite cannot express them. Relational constraints plus an `AuditLog` table fit the domain |
| ORM | **Prisma 6** | Typed client and `prisma.$transaction()` with the migrations/seed workflow kept simple |
| Auth | **JWT + bcrypt** | Stateless tokens suit a separately hosted API; passwords are stored only as bcrypt hashes |
| Validation | **class-validator / class-transformer** | Turns malformed input into 400s at the edge instead of 500s deep in the stack |
| Tests / lint | **Vitest + oxlint** | 6 tests cover the capacity rule, lock ordering, waitlist promotion and the double-cancel guard (run in ~2s) |
| Frontend | **Next.js 16 (React 19) + plain CSS** | One framework for the whole dashboard; static export (`output: "export"`) deploys as plain files, no SSR runtime needed |
| Hosting | **Netlify (UI) + Render (API) + Neon (PostgreSQL)** | All have free tiers and environment-variable configuration, so the demo can be published without cost |

Trade-offs and the alternatives that were rejected are argued in
[`docs/Technology_Choices_Design_and_Tradeoffs.pdf`](docs/Technology_Choices_Design_and_Tradeoffs.pdf).

## 4. Run it locally

```bash
# backend (terminal 1) - needs PostgreSQL; create .env with DATABASE_URL, DIRECT_URL, JWT_SECRET
cd backend && npm install && npx prisma generate
npx prisma migrate deploy && npm run db:seed
npm run start:dev                                  # -> http://localhost:3001

# frontend (terminal 2) - falls back to http://localhost:3001
cd frontend && npm install && npm run dev          # -> http://localhost:3000
```

**Seeded logins** — `admin@test.com` / `admin123` (ADMIN) · `manager@test.com` / `manager123` (MANAGER) ·
`staff@test.com` / `staff123` (STAFF). **Seed data** — workshops `POT-101`, `COD-201`,
`FIT-301` (full, with a waitlist) and `CER-110`, plus existing registrations so the overview, the
filters and the Activity log are not empty.

Checks: `cd backend && npm test && npm run lint && npm run build`.

Full instructions — three ways to get PostgreSQL, every environment variable, migrations, seeding,
a click-through smoke test and troubleshooting — are in
[`docs/Local_Setup_Instructions.pdf`](docs/Local_Setup_Instructions.pdf).

## 5. Documents

| Document | Covers |
| --- | --- |
| [`docs/Local_Setup_Instructions.pdf`](docs/Local_Setup_Instructions.pdf) | Running the backend and frontend locally: prerequisites, database options, environment variables, migrations, seeding, logins, smoke test, troubleshooting |
| [`docs/Technology_Choices_Design_and_Tradeoffs.pdf`](docs/Technology_Choices_Design_and_Tradeoffs.pdf) | Technology choices, design decisions, trade-offs, assumptions, and how over-registration is prevented (with measurements) |

> The previous, longer README — step-by-step Netlify / Render / Neon deployment guide and verbose
> issue write-ups — is still available in git history: `git show de4aebe:README.md`.
