"""Telegram Mini App policy for business creation.

Business creation is now a website-only flow. Existing Telegram Mini App
businesses remain fully manageable; this guard only blocks the legacy create
endpoint when the request comes from a Telegram Mini App.
"""

from fastapi import Request
from fastapi.responses import JSONResponse

from .app import app


@app.middleware("http")
async def telegram_business_creation_policy(request: Request, call_next):
    if request.method.upper() == "POST" and request.url.path == "/admin/businesses":
        telegram_init_data = request.headers.get("X-Telegram-Init-Data", "").strip()
        if telegram_init_data:
            return JSONResponse(
                status_code=403,
                content={
                    "detail": "Business creation is available on the Bookly website.",
                    "code": "website_only_business_creation",
                    "website": "https://boockly.vercel.app/landing.html",
                },
            )

    return await call_next(request)
