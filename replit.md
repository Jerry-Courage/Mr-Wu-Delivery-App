# Mr Wu's Delivery App

A full-stack Chinese food delivery application with customer ordering, kitchen management, and rider delivery tracking.

## Architecture

**Frontend**: React + Vite (port 5000)
**Backend**: Express.js (port 3001, proxied via Vite)
**Database**: PostgreSQL (Replit built-in, via Drizzle ORM)

## User Roles

| Role | Portal | Access |
|---|---|---|
| `customer` | Main app (/) | Browse menu, place orders, track delivery |
| `kitchen` | /management | View all orders, update status, assign riders |
| `rider` | /rider | See assigned orders, mark picked up/delivered |

## Key Files

- `shared/schema.ts` — Drizzle schema (users, orders, order_items, menu_items)
- `server/index.ts` — Express entry point + menu seed
- `server/routes.ts` — All API routes
- `server/storage.ts` — Database access layer
- `server/db.ts` — Drizzle/pg connection
- `src/context/AuthContext.tsx` — JWT auth (stored in localStorage)
- `src/lib/api.ts` — Fetch wrapper with auth headers
- `src/pages/ManagementPage.tsx` — Kitchen dashboard
- `src/pages/RiderPage.tsx` — Rider dashboard
- `src/pages/LoginPage.tsx` — Login/register page

## Workflows

- **Start application**: `npm run dev` (Vite frontend on :5000)
- **Backend**: `npx tsx server/index.ts` (Express API on :3001)

## API Routes

```
POST /api/auth/register   — Create account (customer/kitchen/rider)
POST /api/auth/login      — Login, returns JWT
GET  /api/auth/me         — Get current user

GET  /api/menu            — All menu items

POST /api/orders          — Place order (customer)
GET  /api/orders/my       — Customer's orders
GET  /api/orders/:id      — Single order

GET  /api/management/orders              — All orders (kitchen)
PATCH /api/management/orders/:id/status  — Update order status
PATCH /api/management/orders/:id/assign  — Assign rider
GET  /api/management/riders              — List all riders

GET  /api/rider/orders              — Rider's assigned orders
PATCH /api/rider/orders/:id/status  — Mark picked_up or delivered
```

## Order Status Flow

`pending` → `confirmed` → `preparing` → `ready` → `assigned` → `picked_up` → `delivered`

- Kitchen advances: pending → confirmed → preparing → ready
- Kitchen assigns rider: ready → assigned
- Rider marks: assigned → picked_up → delivered

## Test Accounts (auto-created)

- Customer: `test@mrwus.com` / `test1234`
- Kitchen: `kitchen@mrwus.com` / `kitchen123`
- Rider: `rider@mrwus.com` / `rider1234`

## Deployment

- Build: `npm run build`
- Run: `node ./dist/index.cjs`

Note: For production, the Express server needs to be configured to serve the built frontend files. Currently this is a development setup.

## AI Features (Planned)

OpenRouter API key will be provided for AI recommendations and ETA predictions.
