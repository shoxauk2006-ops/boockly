from __future__ import annotations

import hashlib
import os
import secrets
from datetime import datetime, timedelta

from fastapi import Header, HTTPException
from sqlalchemy import text

from .app import Business, SessionLocal, app, telegram_user
from .account_routes import BooklyAccount, _account_from_header


LINK_TTL_MINUTES = 15
BOT_USERNAME = os.getenv("BOT_USERNAME", "BooklyBot").strip().lstrip("@") or "BooklyBot"

with SessionLocal() as db:
    db.execute(text("""
        CREATE TABLE IF NOT EXISTS bookly_telegram_links (
            id INTEGER PRIMARY KEY,
            token_hash VARCHAR(64) UNIQUE NOT NULL,
            account_id INTEGER NOT NULL,
            business_id INTEGER NOT NULL,
            expires_at TIMESTAMP NOT NULL,
            used_at TIMESTAMP NULL,
            created_at TIMESTAMP NOT NULL
        )
    """))
    db.execute(text("CREATE INDEX IF NOT EXISTS ix_bookly_telegram_links_account_id ON bookly_telegram_links (account_id)"))
    db.execute(text("CREATE INDEX IF NOT EXISTS ix_bookly_telegram_links_token_hash ON bookly_telegram_links (token_hash)"))
    db.commit()


def _link_hash(token: str) -> str:
    return hashlib.sha256(token.encode("utf-8")).hexdigest()


@app.get("/account/telegram-link")
def create_telegram_link(authorization: str = Header(default="")):
    with SessionLocal() as db:
        account = _account_from_header(db, authorization)
        business = db.get(Business, account.business_id) if account.business_id else None
        if not business:
            raise HTTPException(400, "Bookly business not found")

        now = datetime.utcnow()
        db.execute(
            text("DELETE FROM bookly_telegram_links WHERE account_id = :account_id OR expires_at < :now OR used_at IS NOT NULL"),
            {"account_id": account.id, "now": now},
        )

        token = secrets.token_urlsafe(32)
        db.execute(
            text("""
                INSERT INTO bookly_telegram_links
                    (token_hash, account_id, business_id, expires_at, used_at, created_at)
                VALUES
                    (:token_hash, :account_id, :business_id, :expires_at, NULL, :created_at)
            """),
            {
                "token_hash": _link_hash(token),
                "account_id": account.id,
                "business_id": business.id,
                "expires_at": now + timedelta(minutes=LINK_TTL_MINUTES),
                "created_at": now,
            },
        )
        db.commit()

        return {
            "ok": True,
            "business_id": business.id,
            "telegram_url": f"https://t.me/{BOT_USERNAME}?start=bookly_{token}",
            "expires_in_seconds": LINK_TTL_MINUTES * 60,
        }


@app.post("/account/connect-telegram-link")
def connect_telegram_link(
    token: str,
    x_telegram_init_data: str = Header(default=""),
):
    user = telegram_user(x_telegram_init_data)
    telegram_id = int(user["id"])
    token = (token or "").strip()
    if not token:
        raise HTTPException(400, "Telegram connection token is required")

    with SessionLocal() as db:
        row = db.execute(
            text("""
                SELECT id, account_id, business_id, expires_at, used_at
                FROM bookly_telegram_links
                WHERE token_hash = :token_hash
            """),
            {"token_hash": _link_hash(token)},
        ).mappings().first()

        if not row:
            raise HTTPException(400, "Invalid Telegram connection link")
        if row["used_at"] is not None:
            raise HTTPException(400, "This Telegram connection link has already been used")

        expires_at = row["expires_at"]
        if isinstance(expires_at, str):
            expires_at = datetime.fromisoformat(expires_at.replace("Z", "+00:00")).replace(tzinfo=None)
        if expires_at < datetime.utcnow():
            raise HTTPException(400, "Telegram connection link has expired")

        account = db.get(BooklyAccount, int(row["account_id"]))
        business = db.get(Business, int(row["business_id"]))
        if not account or not business or int(account.business_id or 0) != int(business.id):
            raise HTTPException(400, "Bookly account or business not found")

        existing = (
            db.query(BooklyAccount)
            .filter(BooklyAccount.telegram_user_id == telegram_id)
            .filter(BooklyAccount.id != account.id)
            .first()
        )
        if existing:
            raise HTTPException(409, "This Telegram account is already connected to another Bookly account")

        from . import paddle_original
        web_owner_id = -int(account.id)
        if paddle_original._profile_trial_used(db, web_owner_id):
            paddle_original._mark_profile_trial_used(db, telegram_id)

        business.owner_telegram_id = telegram_id
        account.telegram_user_id = telegram_id
        db.execute(
            text("UPDATE bookly_telegram_links SET used_at = :used_at WHERE id = :id AND used_at IS NULL"),
            {"used_at": datetime.utcnow(), "id": int(row["id"])},
        )
        db.commit()

        return {
            "ok": True,
            "telegram_user_id": telegram_id,
            "business_id": business.id,
            "next": "open_bookly_in_telegram",
        }
