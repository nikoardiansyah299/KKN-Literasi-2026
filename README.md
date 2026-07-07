# Library Catalog Portal

A full-stack website for managing a library catalog for users and admins.

## Implemented Features

1. Basic website features:
- Header, homepage, footer
- User register and login
- Admin login

2. Catalog browsing:
- Browse books sorted by catalog number `000-999`
- Search by title/author
- Pagination and range filters

3. Admin book management:
- List books with availability
- Add, edit, delete books
- Import sample books and export JSON data

4. Borrow approval workflow:
- Users submit borrow requests
- Admin approves/rejects requests
- Due dates managed on approval
- Loan return flow with late fee calculation

5. Book availability:
- Availability shown in catalog and admin pages
- Status includes available, borrowed, reserved

6. Additional suggested features included:
- Reservations for unavailable books
- Notifications for approvals/rejections/returns/reservation fulfillment
- User borrow history and fee history
- Admin analytics dashboard (totals, overdue, most borrowed, fees)

## Tech Stack

- Backend: Node.js, Express, better-sqlite3, JWT auth
- Frontend: React + Vite
- Database: SQLite (`server/data/library.db`)

## Project Structure

- `server` - backend API and SQLite data
- `client` - React frontend UI

## Quick Start

Install dependencies:

```bash
npm --prefix server install
npm --prefix client install
```

Seed initial data:

```bash
npm run seed:server
```

Run backend:

```bash
npm run dev:server
```

Run frontend:

```bash
npm run dev:client
```

Frontend URL (default): `http://localhost:5173`
Backend URL (default): `http://localhost:4000`

## Seed Accounts

- Admin: `admin@library.local` / `admin123`
- User: `user@library.local` / `user123`

## Validation Commands

Backend smoke test:

```bash
npm run smoke:server
```

Frontend production build:

```bash
npm run build:client
```

Combined test command:

```bash
npm test
```

## Environment Variables

Backend optional env vars:

- `PORT` (default `4000`)
- `JWT_SECRET` (default `library-dev-secret`)
- `DAILY_LATE_FEE` (default `2000`)
- `BORROW_DAYS_DEFAULT` (default `14`)

Frontend optional env var:

- `VITE_API_BASE` (default `http://localhost:4000/api`)
