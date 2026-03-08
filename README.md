# JJIKGO Photobooth Monorepo

This project is structured as an npm monorepo to manage multiple applications (frontend clients) and a shared backend from a single codebase.

## Project Structure

```text
JJIKGO_PHOTOBOOTH
├── apps
│   ├── admin-dashboard    # Vite + React Admin interface
│   ├── cashier-app        # Vite + React Cashier interface (main point of sale)
│   └── staff-app          # Vite + React Staff interface
├── backend                # Node.js + Express + Prisma backend and Socket.IO
│   ├── prisma
│   ├── scripts
│   └── src
│       ├── controllers
│       ├── middleware
│       ├── routes
│       ├── services
│       ├── socket
│       └── app.js
└── package.json           # Root package defining workspaces
```

## Getting Started

### Prerequisites

- Node.js (v18 or higher recommended)
- Database (defined in backend/prisma/.env)

### Installation

Install dependencies for all workspaces from the root directory:

```bash
npm install
```

### Running Applications

You can run individual applications using root npm scripts:

- **Cashier App:** `npm run dev:cashier`
- **Staff App:** `npm run dev:staff`
- **Admin Dashboard:** `npm run dev:admin`
- **Backend:** `npm run dev:backend`

### Building for Production

- **Cashier App:** `npm run build:cashier`
- **Staff App:** `npm run build:staff`
- **Admin Dashboard:** `npm run build:admin`
