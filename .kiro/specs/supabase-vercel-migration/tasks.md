# Implementation Plan: Supabase + Vercel Migration

## Overview

Migrate JJIKGO-STUDIO from Railway to Supabase (DB) + Vercel (backend + 3 frontends). All changes are infrastructural — no business logic, query logic, or auth system changes. The key tasks are: wiring the backend as a Vercel serverless function, switching Socket.io to polling-only, updating DB config for PgBouncer, and cleaning up Railway artifacts from all frontend apps.

## Tasks

- [x] 1. Update backend DB config for Supabase PgBouncer
  - [x] 1.1 Refactor `backend/src/config/db.js` to detect `pgbouncer=true` in `DATABASE_URL` and set `prepare: false`, `max: 1` when detected; use `prepare: true`, `max: 10` otherwise
    - Extract a `buildPostgresConfig(url)` helper function that returns the config object — this is needed for property testing
    - _Requirements: 2.1, 2.2, 2.5, 7.5_
  - [ ]* 1.2 Write property test for PgBouncer config detection (Property 3)
    - **Property 3: PgBouncer mode disables prepared statements**
    - Use `fast-check` — add it as a dev dependency to `backend/package.json` if not present
    - Generate arbitrary hostnames and assert `buildPostgresConfig` returns `{ prepare: false, max: 1 }` for any URL containing `pgbouncer=true`
    - **Validates: Requirements 2.5, 7.5**

- [x] 2. Clean up `backend/src/config/env.js`
  - [x] 2.1 Remove the `ATABASE_URL` typo fallback from `env.js` (keep `DATABASE_URL` and `DB_URL` only); remove any Railway-specific env var references
    - _Requirements: 2.1, 7.1_

- [x] 3. Refactor `backend/src/app.js` for serverless compatibility
  - [x] 3.1 Guard `startServer()` with `if (require.main === module)` so `server.listen()` is not called when the file is imported as a module; add `module.exports = app` at the bottom
    - _Requirements: 3.2, 3.3_
  - [x] 3.2 Update the `new Server(server, {...})` Socket.io constructor in `app.js` to add `transports: ['polling']`
    - _Requirements: 4.1, 4.2, 4.3_

- [x] 4. Create Vercel serverless entry point for backend
  - [x] 4.1 Create `backend/api/index.js` that requires and exports the Express app: `module.exports = require('../src/app')`
    - _Requirements: 3.1, 3.2_
  - [x] 4.2 Create `backend/vercel.json` with `version: 2`, `functions` setting `maxDuration: 60` for `api/index.js`, and a catch-all route to `api/index.js`
    - _Requirements: 3.1, 3.4, 3.6_

- [x] 5. Update frontend apps — remove Railway fallback, add polling transport
  - [x] 5.1 Update `apps/cashier-app/src/utils/api.js`: remove the Railway hostname detection block and hardcoded Railway URL; update the `socket` export to add `transports: ['polling']`
    - _Requirements: 7.3, 7.4, 9.4, 9.5_
  - [x] 5.2 Update `apps/staff-app/src/utils/api.js`: same changes — remove Railway fallback block, add `transports: ['polling']` to the `socket` export
    - _Requirements: 7.3, 7.4, 9.4_
  - [x] 5.3 Update `apps/admin-dashboard/src/utils/api.js`: remove Railway fallback block
    - _Requirements: 7.3, 7.4, 9.4_
  - [x] 5.4 Update `apps/admin-dashboard/src/utils/socket.js`: add `transports: ['polling']` to the `io()` call
    - _Requirements: 4.2, 9.4_
  - [ ]* 5.5 Write property test for VITE_API_URL trailing slash normalization (Property 7)
    - **Property 7: VITE_API_URL has no trailing slash**
    - Generate arbitrary web URLs with a trailing slash appended; assert the normalization logic (`replace(/\/$/, '') || 'http://localhost:3000'`) never produces a string ending in `/`
    - **Validates: Requirements 7.3**

- [x] 6. Checkpoint — verify backend wiring
  - Ensure all tests pass, ask the user if questions arise.

- [x] 7. Update backend CORS to use `FRONTEND_URLS` env var
  - [x] 7.1 Update the CORS `origin` function in `backend/src/app.js` to check against `env.FRONTEND_URLS` array in production (`NODE_ENV === 'production'`); keep the permissive `callback(null, origin || true)` fallback for development
    - _Requirements: 4.4, 9.1, 9.2_
  - [x] 7.2 Apply the same origin check to the Socket.io `cors` config in `backend/src/app.js`
    - _Requirements: 4.4, 9.1_
  - [ ]* 7.3 Write property test for CORS origin acceptance (Property 5)
    - **Property 5: CORS accepts all configured frontend origins**
    - Extract the CORS origin function so it can be tested in isolation; use `fc.constantFrom(...FRONTEND_URLS)` and assert the callback receives the origin (not null/false) for each configured URL
    - **Validates: Requirements 4.4, 9.1, 9.2**

- [x] 8. Verify frontend `vercel.json` SPA rewrites
  - [x] 8.1 Confirm `apps/cashier-app/vercel.json`, `apps/staff-app/vercel.json`, and `apps/admin-dashboard/vercel.json` each contain the `rewrites` rule `{ "source": "/(.*)", "destination": "/index.html" }`; update any that are missing it
    - _Requirements: 6.5, 6.6_

- [x] 9. Set up monorepo root files
  - [x] 9.1 Update the root `.gitignore` to cover all subdirectories — ensure it includes `node_modules/`, `dist/`, `.env`, `.env.local`, `*.env`, and `supabase/.branches/` patterns
    - _Requirements: 5.2, 5.4_
  - [x] 9.2 Create a root `README.md` describing the repo structure, the 4 Vercel projects (root directories), required environment variables per project, Supabase setup steps (`db:push` with direct URL port 5432), and the Socket.io polling-only constraint
    - _Requirements: 5.3_

- [x] 10. Final checkpoint — all tests pass
  - Ensure all tests pass, ask the user if questions arise.

## Notes

- Tasks marked with `*` are optional and can be skipped for a faster MVP
- `backend/api/index.js` must export `app` (not `server`) — Vercel wraps it in its own HTTP layer
- `db:push` must use the **direct** Supabase URL (port 5432), not the pooled URL (port 6543), because Drizzle migrations use prepared statements
- `FRONTEND_URLS` on the backend Vercel project should be a comma-separated list of the three frontend Vercel URLs
- No `VITE_SOCKET_URL` is needed — Socket.io connects to the same `VITE_API_URL` as the REST API
- Property tests require `fast-check` as a dev dependency in `backend/`
