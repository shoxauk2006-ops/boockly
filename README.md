# Telegram Booking Mini App

Bookly v0.4 — Telegram-first booking SaaS MVP.

## Stack
- FastAPI + SQLAlchemy + SQLite (easy MVP; swap to PostgreSQL for production)
- aiogram 3
- React + Vite
- Telegram Mini App
- Payment abstraction for Uzum + Lemon Squeezy (providers are stubs until credentials/API contracts are configured)

## Run
### Backend
`cd backend && python -m venv .venv && pip install -r requirements.txt && uvicorn app:app --reload --port 8000`

### Bot
Set `BOT_TOKEN`, then `python bot.py`.

### Frontend
`cd frontend && npm install && npm run dev`

For production, serve the built frontend over HTTPS and configure the Telegram bot's Mini App URL.

## Bookly v0.4 additions
- Production-oriented client booking flow with Telegram identity.
- Past time slots are hidden for the current day.
- Telegram contact callback stores the shared phone number correctly.
- Subscription card updated for the $9.99/month product.

## Bookly v0.3 additions
- Telegram startapp parameter automatically opens the client business page.
- New booking notifications are sent to the business owner through Telegram Bot API.
- Client cancellation and owner cancellation notifications.
- Reminder worker: 24h and 2h before booking.
- Lemon Squeezy checkout is ready when credentials are provided.

### Environment
`BOT_TOKEN` — Telegram bot token.
`WEBAPP_URL` — Mini App URL used by the bot.
`VITE_API_URL` — public API URL for the frontend.
`LEMON_API_KEY` — Lemon Squeezy API key.
`LEMON_STORE_ID` — Lemon Squeezy store ID.
`LEMON_VARIANT_ID` — the $9.99/month subscription variant ID.
`LEMON_WEBHOOK_SECRET` — signing secret for the Lemon Squeezy webhook.
`PUBLIC_APP_URL` — URL to return to after checkout.

### Lemon Squeezy webhook
Create a webhook pointing to `/payments/webhook/lemonsqueezy` and subscribe to `subscription_created`, `subscription_updated`, `subscription_expired`, `subscription_cancelled`, `subscription_payment_success`, `subscription_payment_failed`, and `subscription_payment_recovered`.
