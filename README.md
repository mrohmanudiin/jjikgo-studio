# JJIKGO Studio — Monorepo

Photo booth management system. Monorepo containing the backend API and three frontend apps.

## Structure

```
/
├── backend/              → Express.js API (Vercel serverless)
├── apps/
│   ├── cashier-app/      → Cashier POS (Vercel static)
│   ├── staff-app/        → Staff queue management (Vercel static)
│   └── admin-dashboard/  → Admin panel (Vercel static)
```

## Stack

- **Database**: Supabase (PostgreSQL via Drizzle ORM)
- **Backend**: Express.js deployed as Vercel serverless function
- **Frontend**: React + Vite, deployed as Vercel static sites
- **Real-time**: Socket.io with HTTP long-polling (Vercel compatible)
- **Auth**: Custom session tokens stored in `auth_sessions` table

---

## Vercel Projects Setup

Create 4 separate Vercel projects from this GitHub repo, each with a different root directory:

| Project | Root Directory | Type |
|---|---|---|
| jjikgo-backend | `backend` | Serverless |
| jjikgo-cashier | `apps/cashier-app` | Static (Vite) |
| jjikgo-staff | `apps/staff-app` | Static (Vite) |
| jjikgo-admin | `apps/admin-dashboard` | Static (Vite) |

### Backend Environment Variables (Vercel)

```
DATABASE_URL=postgresql://postgres:[password]@aws-0-[region].pooler.supabase.com:6543/postgres?pgbouncer=true
JWT_SECRET=<your-secret>
NODE_ENV=production
FRONTEND_URLS=https://your-cashier.vercel.app,https://your-staff.vercel.app,https://your-admin.vercel.app
```

> Use the **pooled** Supabase URL (port 6543, `?pgbouncer=true`) for Vercel production.

### Frontend Environment Variables (Vercel — each app)

```
VITE_API_URL=https://your-backend.vercel.app
```

No trailing slash. Socket.io connects to the same URL.

---

## Local Development

```bash
# Backend
cd backend
cp .env.example .env   # fill in DATABASE_URL (direct port 5432)
npm install
npm run dev

# Any frontend app
cd apps/cashier-app
npm install
npm run dev
```

## Database Setup (Supabase)

```bash
cd backend

# Push schema to Supabase (use direct URL port 5432, NOT pooled)
DATABASE_URL="postgresql://postgres:[password]@db.[ref].supabase.co:5432/postgres" npm run db:push

# Seed initial admin user
npm run db:ensure-admin
```

> Never use the pooled URL (port 6543) for `db:push` — Drizzle migrations require prepared statements which PgBouncer transaction mode doesn't support.

## Socket.io Note

Socket.io is configured with `transports: ['polling']` only. This is required for Vercel serverless compatibility. WebSocket upgrades are disabled. Real-time queue updates work via HTTP long-polling with ~1–2s latency.
