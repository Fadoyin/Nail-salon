# Dollhouse Lounge — Backend API

REST API for the Dollhouse Lounge salon booking website. Handles services, availability, bookings, Stripe deposits, and confirmation emails.

## Quick Start

```bash
cd backend
npm install
cp .env.example .env
npm run db:setup
npm run dev
```

API runs at **http://localhost:3001**

## Environment Variables

Copy `.env.example` to `.env` and fill in:

| Variable | Required | Description |
|----------|----------|-------------|
| `PORT` | No | Server port (default: 3001) |
| `FRONTEND_URL` | No | CORS origin (default: http://localhost:3000) |
| `DATABASE_URL` | Yes | SQLite path or PostgreSQL connection string |
| `STRIPE_SECRET_KEY` | For payments | Stripe secret key |
| `STRIPE_WEBHOOK_SECRET` | For webhooks | Stripe webhook signing secret |
| `SMTP_*` | For emails | SMTP credentials for confirmation emails |
| `TRUSTPILOT_REVIEW_URL` | No | Link included in confirmation emails |
| `JWT_SECRET` | Yes (prod) | Secret for signing auth tokens |
| `JWT_EXPIRES_IN` | No | Token expiry (default: 7d) |

## API Endpoints

### Health
- `GET /api/health` — Service status

### Services
- `GET /api/services` — All services grouped by category
- `GET /api/services?category=LASHES` — Filter by category
- `GET /api/services/categories` — Category list for filters
- `GET /api/services/add-ons` — All add-on services

**Categories:** `NAILS`, `TOE_NAILS`, `LASHES`, `EYEBROWS`, `PEDICURE`, `MANICURE`, `ADD_ONS`

### Availability
- `GET /api/availability/calendar?month=2026-06&durationMin=60` — Available dates in a month
- `GET /api/availability/slots?date=2026-06-15&durationMin=60` — Time slots for a date
- `GET /api/availability/hours` — Business hours

### Auth (Login / Create Account)
- `POST /api/auth/register` — Create account (auto-login, welcome notification)
- `POST /api/auth/login` — Login with email + password
- `GET /api/auth/me` — Current user (requires `Authorization: Bearer <token>`)
- `PATCH /api/auth/profile` — Update profile / change password

### Dashboard (requires auth)
- `GET /api/dashboard/overview` — Stats, next appointment, recent activity
- `GET /api/dashboard/appointments` — Upcoming & past appointments
- `GET /api/dashboard/history` — Full booking history table
- `GET /api/dashboard/notifications` — Notifications with unread count
- `PATCH /api/dashboard/notifications/read-all` — Mark all as read
- `PATCH /api/dashboard/notifications/:id/read` — Mark one as read
- `GET /api/dashboard/profile` — Profile for My Profile section

### Bookings
- `GET /api/bookings/policy` — Cancellation policy text
- `POST /api/bookings` — Create booking + Stripe PaymentIntent
- `GET /api/bookings/:reference` — Get booking by reference (e.g. `DL-A3K9M2`)
- `POST /api/bookings/:reference/cancel` — Cancel booking (applies refund policy)
- `POST /api/bookings/confirm-payment` — Manually confirm after Stripe payment

### Webhooks
- `POST /api/webhooks/stripe` — Stripe payment events

## Booking Flow

1. **Frontend** fetches services → `GET /api/services`
2. User selects service + add-ons, picks date → `GET /api/availability/calendar`
3. User picks time → `GET /api/availability/slots`
4. User enters details + accepts policy → `POST /api/bookings` (send auth header to link booking to account)
5. Response includes `payment.clientSecret` for Stripe Elements
6. User pays 50% deposit via Stripe (card / Apple Pay / Google Pay)
7. Stripe webhook fires → booking confirmed + confirmation email sent
8. Frontend shows confirmation screen with booking summary

## Payment & Cancellation

- **Deposit:** 50% of total at booking (configurable via `DEPOSIT_PERCENTAGE`)
- **Cancellation window:** 48 hours (configurable via `CANCELLATION_HOURS`)
- **48+ hours notice:** Full deposit refunded via Stripe
- **Within 48 hours:** Deposit non-refundable

## Database

Uses Prisma with SQLite by default. For production, switch `schema.prisma` datasource to PostgreSQL:

```prisma
datasource db {
  provider = "postgresql"
  url      = env("DATABASE_URL")
}
```

```bash
npm run db:push    # Apply schema
npm run db:seed    # Seed services & business hours
npm run db:studio  # Open Prisma Studio
```

## Stripe Setup

1. Create a Stripe account and get test keys
2. Set `STRIPE_SECRET_KEY` in `.env`
3. For local webhooks: `stripe listen --forward-to localhost:3001/api/webhooks/stripe`
4. Copy the webhook signing secret to `STRIPE_WEBHOOK_SECRET`

## Scripts

| Command | Description |
|---------|-------------|
| `npm run dev` | Start dev server with hot reload |
| `npm run build` | Compile TypeScript |
| `npm start` | Run production build |
| `npm run db:setup` | Push schema + seed data |
