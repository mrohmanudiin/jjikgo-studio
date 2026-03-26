# Requirements Document

## Introduction

Migrate the JJIKGO-STUDIO backend and database from Railway (Express.js + PostgreSQL) to Supabase (hosted Postgres) and Vercel (serverless deployment), while preserving the existing monorepo structure, Drizzle ORM, custom auth system, and Socket.io real-time functionality. The three frontend apps (cashier-app, staff-app, admin-dashboard) are already on Vercel and must continue to work after the migration.

## Glossary

- **Backend**: The Express.js Node.js API server located in `backend/`
- **Supabase_Postgres**: The hosted PostgreSQL database provided by Supabase, accessed via a standard PostgreSQL connection string
- **Vercel**: The serverless deployment platform used to host both the Backend and the three frontend apps
- **Drizzle_ORM**: The existing TypeScript/JavaScript ORM used for all database queries in the Backend
- **Socket_Server**: The Socket.io server instance attached to the Backend HTTP server for real-time queue updates
- **Auth_System**: The custom session-based authentication system using JWT tokens stored in the `auth_sessions` table
- **Monorepo**: The single Git repository containing `backend/`, `apps/cashier-app/`, `apps/staff-app/`, and `apps/admin-dashboard/`
- **Serverless_Entry**: A Vercel-compatible serverless function entry point that wraps the Express app
- **Frontend_App**: Any of the three React/Vite applications: cashier-app, staff-app, or admin-dashboard
- **VITE_API_URL**: The environment variable used by all Frontend_Apps to point to the Backend base URL
- **DATABASE_URL**: The PostgreSQL connection string environment variable used by the Backend and Drizzle_ORM

---

## Requirements

### Requirement 1: Database Migration to Supabase

**User Story:** As a developer, I want to migrate the PostgreSQL database to Supabase, so that the database is hosted on a managed platform with a standard Postgres connection string.

#### Acceptance Criteria

1. THE Supabase_Postgres instance SHALL contain all existing tables: Branch, User, auth_sessions, Theme, Package, Addon, CafeSnack, Promo, Shift, Expense, Booth, Transaction, Queue, Setting.
2. THE Supabase_Postgres instance SHALL preserve all existing column definitions, data types, constraints, and indexes as defined in `backend/src/db/schema.js`.
3. WHEN the Drizzle_ORM `db:push` command is run against the Supabase_Postgres DATABASE_URL, THE Backend SHALL apply the schema without errors.
4. THE Supabase_Postgres instance SHALL be accessible via a standard `postgresql://` connection string assigned to the DATABASE_URL environment variable.
5. IF the DATABASE_URL points to Supabase_Postgres, THEN THE Drizzle_ORM SHALL execute all existing queries without modification to query logic.

---

### Requirement 2: Backend Database Connection Update

**User Story:** As a developer, I want the backend to connect to Supabase Postgres using the existing Drizzle ORM setup, so that no query logic needs to change.

#### Acceptance Criteria

1. THE Backend SHALL read the DATABASE_URL environment variable to establish a connection to Supabase_Postgres.
2. THE Backend SHALL use the `postgres` npm driver and Drizzle_ORM for all database operations, unchanged from the current implementation.
3. WHEN DATABASE_URL is set to a Supabase_Postgres connection string, THE Backend SHALL connect successfully and serve all API routes.
4. IF DATABASE_URL is missing at startup, THEN THE Backend SHALL log a warning and continue booting without crashing.
5. THE Backend SHALL support Supabase's connection pooling URL format (port 6543, `?pgbouncer=true`) for the serverless environment to prevent connection exhaustion.

---

### Requirement 3: Vercel Serverless Backend Deployment

**User Story:** As a developer, I want the backend to deploy as a Vercel serverless function, so that it runs on Vercel without requiring a persistent server process.

#### Acceptance Criteria

1. THE Backend SHALL include a `vercel.json` configuration file at `backend/vercel.json` that routes all requests to a serverless entry point.
2. THE Serverless_Entry SHALL export the Express app as the default export compatible with Vercel's Node.js runtime.
3. WHEN Vercel invokes the Serverless_Entry, THE Backend SHALL handle all existing API routes under `/api/*`.
4. THE Backend SHALL include a `/health` endpoint that returns a 200 response when invoked by Vercel.
5. IF the Backend is deployed to Vercel, THEN THE Socket_Server SHALL remain functional by using a compatible Socket.io adapter or by documenting the limitation and providing a fallback deployment strategy.
6. THE `backend/vercel.json` SHALL specify `"version": 2` and route all traffic through the serverless function.

---

### Requirement 4: Socket.io Compatibility on Vercel

**User Story:** As a developer, I want Socket.io to remain functional after migration, so that real-time queue updates continue to work for all connected clients.

#### Acceptance Criteria

1. THE Socket_Server SHALL continue to emit `queueUpdated` and `printRequested` events to branch-scoped rooms after migration.
2. WHEN a Frontend_App connects to the Backend via Socket.io, THE Socket_Server SHALL accept the connection and assign the client to the correct branch room.
3. IF Vercel's serverless environment does not support persistent WebSocket connections, THEN THE requirements document SHALL document this constraint and the recommended solution (e.g., separate Socket.io deployment or Vercel's fluid compute).
4. THE Socket_Server CORS configuration SHALL allow connections from all three Frontend_App Vercel deployment URLs.

---

### Requirement 5: Monorepo GitHub Repository Setup

**User Story:** As a developer, I want the entire monorepo pushed to a new GitHub repository, so that Vercel can deploy each app from a single source of truth.

#### Acceptance Criteria

1. THE Monorepo SHALL contain `backend/`, `apps/cashier-app/`, `apps/staff-app/`, and `apps/admin-dashboard/` at the repository root.
2. THE Monorepo root `.gitignore` SHALL exclude `node_modules/`, `dist/`, `.env`, and `.env.local` from all subdirectories.
3. THE Monorepo SHALL include a root-level `README.md` describing the repository structure and deployment instructions.
4. WHEN the repository is pushed to GitHub, THE Monorepo SHALL not contain any secrets, API keys, or DATABASE_URL values in committed files.

---

### Requirement 6: Vercel Project Configuration per App

**User Story:** As a developer, I want each app in the monorepo configured as a separate Vercel project, so that each app deploys independently from the same repository.

#### Acceptance Criteria

1. THE Backend SHALL be configured as a Vercel project with root directory set to `backend/`.
2. THE cashier-app SHALL be configured as a Vercel project with root directory set to `apps/cashier-app/`.
3. THE staff-app SHALL be configured as a Vercel project with root directory set to `apps/staff-app/`.
4. THE admin-dashboard SHALL be configured as a Vercel project with root directory set to `apps/admin-dashboard/`.
5. WHEN Vercel builds a Frontend_App, THE build command SHALL be `npm run build` and the output directory SHALL be `dist`.
6. EACH Frontend_App `vercel.json` SHALL include a rewrite rule routing all paths to `index.html` to support client-side routing.

---

### Requirement 7: Environment Variable Configuration

**User Story:** As a developer, I want all required environment variables configured on Vercel for each app, so that each deployment connects to the correct services.

#### Acceptance Criteria

1. THE Backend Vercel project SHALL have the following environment variables set: `DATABASE_URL`, `JWT_SECRET`, `NODE_ENV`, `FRONTEND_URLS`.
2. EACH Frontend_App Vercel project SHALL have `VITE_API_URL` set to the deployed Backend Vercel URL.
3. THE `VITE_API_URL` value SHALL NOT contain a trailing slash.
4. IF `VITE_API_URL` is not set at build time, THEN THE Frontend_App SHALL fall back to `http://localhost:3000` for local development.
5. THE Backend `DATABASE_URL` on Vercel SHALL use the Supabase connection pooling URL (port 6543 with `?pgbouncer=true`) to handle serverless cold starts.

---

### Requirement 8: Existing Auth System Preservation

**User Story:** As a developer, I want the custom session-based auth system to remain unchanged, so that existing login flows and session tokens continue to work.

#### Acceptance Criteria

1. THE Auth_System SHALL continue to use the `auth_sessions` table in Supabase_Postgres for session storage.
2. THE Auth_System SHALL continue to issue and validate JWT tokens using the `JWT_SECRET` environment variable.
3. WHEN a Frontend_App sends a `Bearer` token in the `Authorization` header, THE Backend SHALL validate it against the `auth_sessions` table in Supabase_Postgres.
4. THE Auth_System SHALL NOT use Supabase Auth, Supabase client SDK, or any Supabase-specific authentication mechanism.

---

### Requirement 9: Frontend App CORS and API Connectivity

**User Story:** As a developer, I want all three frontend apps to connect to the migrated backend on Vercel, so that all API calls succeed after migration.

#### Acceptance Criteria

1. THE Backend CORS configuration SHALL allow requests from all three Frontend_App Vercel deployment URLs.
2. WHEN a Frontend_App makes an API request, THE Backend SHALL respond with the correct `Access-Control-Allow-Origin` header matching the requesting origin.
3. THE Backend SHALL accept `Authorization` headers and `Content-Type: application/json` from cross-origin requests.
4. EACH Frontend_App `VITE_API_URL` SHALL point to the Backend's Vercel deployment URL after migration.
5. THE cashier-app Socket.io client SHALL connect to the Backend Vercel URL using the value of `VITE_API_URL`.

---

### Requirement 10: Drizzle ORM Migration Tooling

**User Story:** As a developer, I want Drizzle ORM migration commands to work against Supabase Postgres, so that schema changes can be applied without manual SQL.

#### Acceptance Criteria

1. WHEN `npm run db:push` is executed with DATABASE_URL pointing to Supabase_Postgres, THE Drizzle_ORM SHALL apply the schema from `backend/src/db/schema.js` without errors.
2. THE `backend/drizzle.config.js` SHALL read DATABASE_URL from the environment without hardcoded credentials.
3. WHEN `npm run db:studio` is executed, THE Drizzle_ORM SHALL connect to Supabase_Postgres and display the schema browser.
4. THE Drizzle_ORM `db:push` command SHALL be the primary method for applying schema changes to Supabase_Postgres.
