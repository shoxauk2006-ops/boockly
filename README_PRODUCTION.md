# Bookly v0.5 — production deployment

## What changed
- Docker images for API, bot, worker and frontend.
- PostgreSQL via Docker Compose.
- Caddy HTTPS reverse proxy for `app.` and `api.` subdomains.
- Production `.env` template.
- Clear separation of frontend/API domains.

## Recommended deployment
Use a VPS with Ubuntu 24.04, a domain, and two DNS records:
- `app.example.com` -> VPS IP
- `api.example.com` -> VPS IP

Copy `.env.production.example` to `.env`, set the values, then:

```bash
cd deploy
docker compose up -d --build
```

Caddy obtains HTTPS certificates automatically after DNS points to the server.

## Telegram setup
1. Open @BotFather.
2. `/mybots` -> Bookly bot -> Bot Settings.
3. Configure a Main Mini App with `https://app.example.com`.
4. Set the bot username in `BOT_USERNAME`.
5. Keep `BOT_TOKEN` only in `.env`; never commit it to Git.

## Important before production
- Run database migrations instead of relying on `create_all` for future schema changes.
- Configure Lemon Squeezy webhook at `https://api.example.com/payments/webhook/lemonsqueezy`.
- Configure Uzum merchant callbacks after receiving their production credentials/API documentation.
- Replace the placeholder bot username in generated customer links with `BOT_USERNAME`.
