from __future__ import annotations

import hashlib
import hmac
import secrets
from datetime import datetime, timedelta

from fastapi import Header, HTTPException
from pydantic import BaseModel, Field
from sqlalchemy import BigInteger, DateTime, Integer, String, text
from sqlalchemy.orm import Mapped, mapped_column

from .app import (
    Base,
    Business,
    SessionLocal,
    app,
    engine,
    telegram_user,
)


class BooklyAccount(Base):
    __tablename__ = "bookly_accounts"

    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    email: Mapped[str] = mapped_column(String(255), unique=True, index=True)
    password_hash: Mapped[str] = mapped_column(String(255))
    telegram_user_id: Mapped[int | None] = mapped_column(BigInteger, unique=True, nullable=True, index=True)
    business_id: Mapped[int | None] = mapped_column(Integer, nullable=True, index=True)
    created_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow)


class BooklySession(Base):
    __tablename__ = "bookly_account_sessions"

    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    account_id: Mapped[int] = mapped_column(Integer, index=True)
    token_hash: Mapped[str] = mapped_column(String(64), unique=True, index=True)
    expires_at: Mapped[datetime] = mapped_column(DateTime, index=True)
    created_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow)


Base.metadata.create_all(engine)


# Business.account_id is deliberately added as a compatibility column instead
# of changing the existing Business ORM model in this first migration step.
with engine.begin() as conn:
    if "businesses" in conn.inspect(conn).get_table_names() if False else False:
        pass
    columns = {c["name"] for c in __import__("sqlalchemy").inspect(conn).get_columns("businesses")}
    if "account_id" not in columns:
        conn.execute(text("ALTER TABLE businesses ADD COLUMN account_id INTEGER"))
    conn.execute(text("CREATE INDEX IF NOT EXISTS ix_businesses_account_id ON businesses (account_id)"))


SESSION_DAYS = 30


def _hash_password(password: str, salt: bytes | None = None) -> str:
    if not 8 <= len(password) <= 128:
        raise HTTPException(400, "Password must contain 8-128 characters")
    salt = salt or secrets.token_bytes(16)
    digest = hashlib.pbkdf2_hmac("sha256", password.encode("utf-8"), salt, 310_000)
    return f"pbkdf2_sha256$310000${salt.hex()}${digest.hex()}"


def _verify_password(password: str, encoded: str) -> bool:
    try:
        algorithm, iterations, salt_hex, digest_hex = encoded.split("$", 3)
        if algorithm != "pbkdf2_sha256":
            return False
        digest = hashlib.pbkdf2_hmac(
            "sha256", password.encode("utf-8"), bytes.fromhex(salt_hex), int(iterations)
        )
        return hmac.compare_digest(digest.hex(), digest_hex)
    except (ValueError, TypeError):
        return False


def _new_session(db, account_id: int) -> str:
    raw = secrets.token_urlsafe(48)
    token_hash = hashlib.sha256(raw.encode("utf-8")).hexdigest()
    db.add(BooklySession(
        account_id=account_id,
        token_hash=token_hash,
        expires_at=datetime.utcnow() + timedelta(days=SESSION_DAYS),
    ))
    return raw


def _account_from_header(db, authorization: str) -> BooklyAccount:
    scheme, _, token = (authorization or "").partition(" ")
    if scheme.lower() != "bearer" or not token:
        raise HTTPException(401, "Bookly account authentication required")
    token_hash = hashlib.sha256(token.encode("utf-8")).hexdigest()
    session = (
        db.query(BooklySession)
        .filter(BooklySession.token_hash == token_hash)
        .filter(BooklySession.expires_at > datetime.utcnow())
        .first()
    )
    if not session:
        raise HTTPException(401, "Invalid or expired Bookly session")
    account = db.get(BooklyAccount, session.account_id)
    if not account:
        raise HTTPException(401, "Bookly account not found")
    return account


class AccountRegisterIn(BaseModel):
    email: str = Field(min_length=3, max_length=255)
    password: str = Field(min_length=8, max_length=128)


class AccountLoginIn(BaseModel):
    email: str = Field(min_length=3, max_length=255)
    password: str = Field(min_length=1, max_length=128)


@app.post("/account/register")
def account_register(x: AccountRegisterIn):
    email = x.email.strip().lower()
    if "@" not in email:
        raise HTTPException(400, "Invalid email")

    with SessionLocal() as db:
        if db.query(BooklyAccount).filter(BooklyAccount.email == email).first():
            raise HTTPException(409, "An account with this email already exists")

        account = BooklyAccount(email=email, password_hash=_hash_password(x.password))
        db.add(account)
        db.flush()

        # A web-created account gets a placeholder business. It is not visible
        # to Telegram until the owner explicitly connects Telegram.
        slug = f"account-{account.id}-{secrets.token_hex(4)}"
        business = Business(
            owner_telegram_id=0,
            name="My Business",
            slug=slug,
        )
        db.add(business)
        db.flush()
        db.execute(
            text("UPDATE businesses SET account_id = :account_id WHERE id = :business_id"),
            {"account_id": account.id, "business_id": business.id},
        )
        account.business_id = business.id
        token = _new_session(db, account.id)
        db.commit()

        return {
            "ok": True,
            "token": token,
            "account": {"id": account.id, "email": account.email, "business_id": business.id},
            "next": "connect_telegram",
        }


@app.post("/account/login")
def account_login(x: AccountLoginIn):
    email = x.email.strip().lower()
    with SessionLocal() as db:
        account = db.query(BooklyAccount).filter(BooklyAccount.email == email).first()
        if not account or not _verify_password(x.password, account.password_hash):
            raise HTTPException(401, "Invalid email or password")
        token = _new_session(db, account.id)
        db.commit()
        return {
            "ok": True,
            "token": token,
            "account": {"id": account.id, "email": account.email, "business_id": account.business_id},
        }


@app.get("/account/me")
def account_me(authorization: str = Header(default="")):
    with SessionLocal() as db:
        account = _account_from_header(db, authorization)
        business = db.get(Business, account.business_id) if account.business_id else None
        return {
            "ok": True,
            "account": {
                "id": account.id,
                "email": account.email,
                "telegram_connected": account.telegram_user_id is not None,
                "telegram_user_id": account.telegram_user_id,
                "business_id": account.business_id,
                "business_name": business.name if business else None,
            },
        }


@app.post("/account/connect-telegram")
def account_connect_telegram(
    authorization: str = Header(default=""),
    x_telegram_init_data: str = Header(default=""),
):
    # Telegram identity is always validated server-side through initData.
    user = telegram_user(x_telegram_init_data)
    telegram_id = int(user["id"])

    with SessionLocal() as db:
        account = _account_from_header(db, authorization)

        existing = (
            db.query(BooklyAccount)
            .filter(BooklyAccount.telegram_user_id == telegram_id)
            .filter(BooklyAccount.id != account.id)
            .first()
        )
        if existing:
            raise HTTPException(409, "This Telegram account is already connected to another Bookly account")

        business = db.get(Business, account.business_id) if account.business_id else None
        if not business:
            raise HTTPException(400, "Bookly business not found")

        # Preserve the existing Telegram-based authorization model: once linked,
        # the business owner is the verified Telegram user ID.
        business.owner_telegram_id = telegram_id
        account.telegram_user_id = telegram_id
        db.commit()

        return {
            "ok": True,
            "telegram_user_id": telegram_id,
            "business_id": business.id,
            "next": "open_bookly_in_telegram",
        }


@app.get("/account/paddle/checkout-token")
def account_paddle_checkout_token(authorization: str = Header(default="")):
    # Paddle checkout remains on the standalone Bookly web surface. This route
    # only issues the short-lived token used to bind the purchase to the linked
    # Bookly business; it does not expose Paddle credentials.
    from . import paddle_original

    with SessionLocal() as db:
        account = _account_from_header(db, authorization)
        if account.telegram_user_id is None:
            raise HTTPException(400, "Connect Telegram before starting checkout")
        business = db.get(Business, account.business_id) if account.business_id else None
        if not business or int(business.owner_telegram_id) != int(account.telegram_user_id):
            raise HTTPException(403, "Bookly business is not linked to this Telegram account")
        return {
            "ok": True,
            "checkout_token": paddle_original._create_checkout_token(
                business.id,
                account.telegram_user_id,
            ),
            "business_id": business.id,
        }
