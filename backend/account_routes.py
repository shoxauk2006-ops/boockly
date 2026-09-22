from __future__ import annotations

import base64
import hashlib
import hmac 
import json
import os
import secrets
import time as time_module
from datetime import datetime, timedelta, time
from typing import Optional
from zoneinfo import ZoneInfo, ZoneInfoNotFoundError

from fastapi import Header, HTTPException
from pydantic import BaseModel, Field
from sqlalchemy import (
    BigInteger,
    Boolean,
    DateTime,
    Integer,
    String,
    inspect,
    text,
)
from sqlalchemy.orm import Mapped, mapped_column

from .app import (
    Base,
    Business,
    Subscription,
    SavedBusiness,
    Booking,
    BlockedSlot,
    WorkingHour,
    Service,
    SessionLocal,
    app,
    engine,
    telegram_user,
)


class BooklyAccount(Base):
    __tablename__ = "bookly_accounts"

    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    email: Mapped[str] = mapped_column(String(255), unique=True, index=True)
    free_trial_used: Mapped[bool] = mapped_column(
        Boolean,
        default=False,
        nullable=False,
    )
    password_hash: Mapped[str] = mapped_column(String(255))
    telegram_user_id: Mapped[int | None] = mapped_column(BigInteger, unique=True, nullable=True, index=True)
    business_id: Mapped[int | None] = mapped_column(Integer, nullable=True, index=True)
    created_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow)
    terms_accepted_at: Mapped[datetime | None] = mapped_column(DateTime, nullable=True)
    terms_version: Mapped[str | None] = mapped_column(String(32), nullable=True)
    privacy_version: Mapped[str | None] = mapped_column(String(32), nullable=True)


class BooklyTelegramLink(Base):
    __tablename__ = "bookly_telegram_links"

    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    token_hash: Mapped[str] = mapped_column(String(64), unique=True, index=True)
    account_id: Mapped[int] = mapped_column(Integer, index=True)
    business_id: Mapped[int] = mapped_column(Integer, index=True)
    expires_at: Mapped[datetime] = mapped_column(DateTime, index=True)
    used_at: Mapped[datetime | None] = mapped_column(DateTime, nullable=True)
    created_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow)


class BooklySession(Base):
    __tablename__ = "bookly_account_sessions"

    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    account_id: Mapped[int] = mapped_column(Integer, index=True)
    token_hash: Mapped[str] = mapped_column(String(64), unique=True, index=True)
    expires_at: Mapped[datetime] = mapped_column(DateTime, index=True)
    created_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow)


Base.metadata.create_all(engine)

with engine.begin() as conn:
    inspector = inspect(conn)
    tables = set(inspector.get_table_names())

    # Repair the legacy PostgreSQL link table if its id column has no default.
    if "bookly_telegram_links" in tables and engine.dialect.name == "postgresql":
        id_info = conn.execute(text("""
            SELECT column_default, is_identity
            FROM information_schema.columns
            WHERE table_schema = current_schema()
              AND table_name = 'bookly_telegram_links'
              AND column_name = 'id'
        """)).mappings().first()

        if id_info and not id_info["column_default"] and id_info["is_identity"] != "YES":
            conn.execute(text("CREATE SEQUENCE IF NOT EXISTS bookly_telegram_links_id_seq"))

            next_id = conn.execute(text(
                "SELECT COALESCE(MAX(id), 0) + 1 FROM bookly_telegram_links"
            )).scalar_one()

            conn.execute(text(
                "SELECT setval('bookly_telegram_links_id_seq', :next_id, false)"
            ), {"next_id": int(next_id)})

            conn.execute(text(
                "ALTER SEQUENCE bookly_telegram_links_id_seq "
                "OWNED BY bookly_telegram_links.id"
            ))

            conn.execute(text(
                "ALTER TABLE bookly_telegram_links "
                "ALTER COLUMN id SET DEFAULT nextval('bookly_telegram_links_id_seq')"
            ))

    if "bookly_accounts" in tables:
        columns = {
            c["name"]
            for c in inspector.get_columns(
                "bookly_accounts"
            )
        }

        if "free_trial_used" not in columns:
            conn.execute(
                text(
                    """
                    ALTER TABLE bookly_accounts
                    ADD COLUMN free_trial_used BOOLEAN
                    DEFAULT FALSE
                    NOT NULL
                    """
                )
            )

        if "terms_accepted_at" not in columns:
            conn.execute(text("ALTER TABLE bookly_accounts ADD COLUMN terms_accepted_at TIMESTAMP"))
        if "terms_version" not in columns:
            conn.execute(text("ALTER TABLE bookly_accounts ADD COLUMN terms_version VARCHAR(32)"))
        if "privacy_version" not in columns:
            conn.execute(text("ALTER TABLE bookly_accounts ADD COLUMN privacy_version VARCHAR(32)"))

        conn.execute(
            text(
                """
                UPDATE bookly_accounts
                SET free_trial_used = TRUE
                WHERE free_trial_used = FALSE
                  AND EXISTS (
                      SELECT 1
                      FROM telegram_user_languages
                      WHERE telegram_user_languages.telegram_user_id = -bookly_accounts.id
                        AND telegram_user_languages.free_trial_used = TRUE
                  )
                """
            )
        )

    if "businesses" in tables:
        columns = {
            c["name"]
            for c in inspector.get_columns(
                "businesses"
            )
        }

        if "account_id" not in columns:
            conn.execute(
                text(
                    "ALTER TABLE businesses ADD COLUMN account_id INTEGER"
                )
            )

        conn.execute(
            text(
                "CREATE INDEX IF NOT EXISTS ix_businesses_account_id "
                "ON businesses (account_id)"
            )
        )

    if "businesses" in tables:
        columns = {c["name"] for c in inspector.get_columns("businesses")}
        if "account_id" not in columns:
            conn.execute(text("ALTER TABLE businesses ADD COLUMN account_id INTEGER"))
        conn.execute(text("CREATE INDEX IF NOT EXISTS ix_businesses_account_id ON businesses (account_id)"))


SESSION_DAYS = 30
CHECKOUT_TOKEN_SECONDS = 600
TERMS_VERSION = "2026-09-18"
PRIVACY_VERSION = "2026-09-18"


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
        raise HTTPException(401, "Skedwoo account authentication required")
    token_hash = hashlib.sha256(token.encode("utf-8")).hexdigest()
    session = (
        db.query(BooklySession)
        .filter(BooklySession.token_hash == token_hash)
        .filter(BooklySession.expires_at > datetime.utcnow())
        .first()
    )
    if not session:
        raise HTTPException(401, "Invalid or expired Skedwoo session")
    account = db.get(BooklyAccount, session.account_id)
    if not account:
        raise HTTPException(401, "Skedwoo account not found")
    return account


def _sync_account_telegram_businesses(
    db,
    account: BooklyAccount,
) -> int:
    """Attach every website business to the account's connected Telegram user."""
    if account.telegram_user_id is None:
        return 0

    telegram_id = int(account.telegram_user_id)

    businesses = (
        db.query(Business)
        .filter(Business.account_id == account.id)
        .all()
    )

    changed = 0
    business_ids = []

    for business in businesses:
        business_ids.append(int(business.id))

        if int(business.owner_telegram_id) != telegram_id:
            business.owner_telegram_id = telegram_id
            changed += 1

    if business_ids:
        subscriptions = (
            db.query(Subscription)
            .filter(
                Subscription.business_id.in_(business_ids)
            )
            .all()
        )

        for subscription in subscriptions:
            if int(subscription.owner_telegram_id) != telegram_id:
                subscription.owner_telegram_id = telegram_id
                changed += 1

    return changed


def _validated_business_timezone(value: str) -> str:
    timezone_name = (
        str(value or "").strip()
        or "Asia/Tashkent"
    )

    try:
        ZoneInfo(timezone_name)
    except (ZoneInfoNotFoundError, ValueError):
        raise HTTPException(400, "Invalid timezone")

    return timezone_name


def _active_service_count(
    db,
    business_id: int,
) -> int:
    return int(
        db.query(Service)
        .filter(
            Service.business_id == int(business_id),
            Service.active == True,
        )
        .count()
    )


def _ensure_service_limit_can_shrink(
    db,
    business_id: int,
    requested_limit: int,
) -> None:
    active_services = _active_service_count(
        db,
        business_id,
    )

    if active_services > int(requested_limit):
        extra = active_services - int(requested_limit)
        raise HTTPException(
            409,
            (
                f"This business has {active_services} active services. "
                f"Remove {extra} service(s) before changing the limit "
                f"to {int(requested_limit)}."
            ),
        )


def _account_checkout_token(
    account_id: int,
    business_id: int,
    owner_telegram_id: int,
) -> str:
    from . import paddle_original

    secret = paddle_original.PADDLE_WEBHOOK_SECRET
    if not secret:
        raise HTTPException(500, "Paddle webhook secret is not configured")

    payload = {
        "business_id": int(business_id),
        "owner_telegram_id": int(owner_telegram_id),
        "account_id": int(account_id),
        "exp": int(time_module.time()) + CHECKOUT_TOKEN_SECONDS,
    }
    raw = json.dumps(payload, separators=(",", ":")).encode("utf-8")
    encoded = base64.urlsafe_b64encode(raw).rstrip(b"=").decode("ascii")
    signature = hmac.new(
        secret.encode("utf-8"),
        encoded.encode("ascii"),
        hashlib.sha256,
    ).hexdigest()
    return f"{encoded}.{signature}"


class AccountRegisterIn(BaseModel):
    email: str = Field(min_length=3, max_length=255)
    password: str = Field(min_length=8, max_length=128)
    legal_accept: bool = False


class AccountLoginIn(BaseModel):
    email: str = Field(min_length=3, max_length=255)
    password: str = Field(min_length=1, max_length=128)

class BusinessCreateIn(BaseModel):
    name: str = Field(min_length=1, max_length=120)
    description: str = Field(default="", max_length=500)
    phone: str = Field(default="", max_length=40)
    address: str = Field(default="", max_length=255)
    latitude: Optional[float] = None
    longitude: Optional[float] = None
    timezone: str = Field(default="Asia/Tashkent", max_length=64)

class BusinessUpdateIn(BaseModel):
    name: str = Field(min_length=1, max_length=120)
    description: str = Field(default="", max_length=500)
    phone: str = Field(default="", max_length=40)
    address: str = Field(default="", max_length=255)
    latitude: Optional[float] = None
    longitude: Optional[float] = None


@app.post("/account/register")
def account_register(x: AccountRegisterIn):
    email = x.email.strip().lower()
    if "@" not in email:
        raise HTTPException(400, "Invalid email")
    if not x.legal_accept:
        raise HTTPException(400, "You must accept the Terms of Use and acknowledge the Privacy Policy")

    with SessionLocal() as db:
        if db.query(BooklyAccount).filter(BooklyAccount.email == email).first():
            raise HTTPException(409, "An account with this email already exists")

        account = BooklyAccount(
            email=email,
            password_hash=_hash_password(x.password),
            terms_accepted_at=datetime.utcnow(),
            terms_version=TERMS_VERSION,
            privacy_version=PRIVACY_VERSION,
        )
        db.add(account)
        db.flush()

        token = _new_session(db, account.id)
        db.commit()

        return {
            "ok": True,
            "token": token,
            "account": {
                "id": account.id,
                "email": account.email,
                "business_id": None,
            },
            "next": "setup_business",
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
@app.post("/account/businesses")
def account_create_business(
    x: BusinessCreateIn,
    authorization: str = Header(default=""),
):
    with SessionLocal() as db:
        account = _account_from_header(db, authorization)

        name = x.name.strip()

        if not name:
            raise HTTPException(400, "Business name is required")

        slug = f"account-{account.id}-{secrets.token_hex(6)}"

        business_timezone = _validated_business_timezone(
            x.timezone
        )

        owner_telegram_id = (
            int(account.telegram_user_id)
            if account.telegram_user_id is not None
            else -int(account.id)
        )

        is_first_business = (
            db.query(Business)
            .filter(Business.account_id == account.id)
            .count()
            == 0
        )

        business = Business(
            account_id=account.id,
            owner_telegram_id=owner_telegram_id,
            name=name,
            description=x.description.strip(),
            phone=x.phone.strip(),
            address=x.address.strip(),
            latitude=x.latitude,
            longitude=x.longitude,
            timezone=business_timezone,
            slug=slug,
            subscription_active=False,
            subscription_status="inactive",
        )

        db.add(business)
        db.flush()

        if account.business_id is None:
            account.business_id = business.id

        for weekday in range(7):
            db.add(
                WorkingHour(
                    business_id=business.id,
                    weekday=weekday,
                    start=time(9, 0),
                    end=time(18, 0),
                    active=True,
                )
            )

        db.commit()

        return {
            "ok": True,
            "business": {
                "id": business.id,
                "name": business.name,
                "description": business.description,
                "phone": business.phone,
                "address": business.address,
                "timezone": business.timezone,
                "latitude": business.latitude,
                "longitude": business.longitude,
                "slug": business.slug,
                "subscription_active": False,
                "subscription_status": "inactive",
            },
            "next": (
                "choose_plan"
                if is_first_business
                else "account"
            ),
        }

@app.put("/account/businesses/{business_id}")
def account_update_business(
    business_id: int,
    x: BusinessUpdateIn,
    authorization: str = Header(default=""),
):
    with SessionLocal() as db:
        account = _account_from_header(db, authorization)

        business = (
            db.query(Business)
            .filter(
                Business.id == business_id,
                Business.account_id == account.id,
            )
            .first()
        )

        if not business:
            raise HTTPException(
                404,
                "Business not found"
            )

        name = x.name.strip()

        if not name:
            raise HTTPException(
                400,
                "Business name is required"
            )

        business.name = name
        business.description = x.description.strip()
        business.phone = x.phone.strip()
        business.address = x.address.strip()
        business.latitude = x.latitude
        business.longitude = x.longitude

        db.commit()

        return {
            "ok": True,
"business": {
    "id": business.id,
    "name": business.name,
    "description": business.description,
    "phone": business.phone,
    "address": business.address,
    "timezone": business.timezone,
    "latitude": business.latitude,
    "longitude": business.longitude,
    "slug": business.slug,
},
}
@app.get("/account/businesses")
def account_businesses(authorization: str = Header(default="")):
    with SessionLocal() as db:
        account = _account_from_header(db, authorization)

        if _sync_account_telegram_businesses(db, account):
            db.commit()

        businesses = (
            db.query(Business)
            .filter(Business.account_id == account.id)
            .order_by(Business.id.asc())
            .all()
        )

        result = []

        for business in businesses:
            subscription = (
                db.query(Subscription)
                .filter(Subscription.business_id == business.id)
                .first()
            )

            result.append({
                "id": business.id,
                "name": business.name,
                "description": business.description,
                "business_image": business.business_image,
                "address": business.address,
                "phone": business.phone,
                "timezone": business.timezone,
                "slug": business.slug,
                "subscription_active": (
                    bool(subscription.active)
                    if subscription
                    else False
                ),
                "subscription_status": (
                    subscription.status
                    if subscription
                    else "inactive"
                ),
                "subscription_expires_at": (
                    subscription.expires_at
                    if subscription
                    else None
                ),
                "services_limit": (
                    subscription.current_services_limit
                    if subscription and subscription.active
                    else 0
                ),
                "current_price": (
                    float(subscription.current_price)
                    if subscription
                    and subscription.current_price is not None
                    else 0.0
                ),
                "is_current": (
                    business.id == account.business_id
                ),
            })

        return {
            "ok": True,
            "businesses": result,
        }


@app.post("/account/businesses/{business_id}/select")
def account_select_business(
    business_id: int,
    authorization: str = Header(default=""),
):
    with SessionLocal() as db:
        account = _account_from_header(db, authorization)

        business = (
            db.query(Business)
            .filter(
                Business.id == business_id,
                Business.account_id == account.id,
            )
            .first()
        )

        if not business:
            raise HTTPException(
                404,
                "Business not found"
            )

        account.business_id = business.id
        db.commit()

        return {
            "ok": True,
            "business_id": business.id,
        }


@app.delete("/account/businesses/{business_id}")
def account_delete_business(
    business_id: int,
    authorization: str = Header(default=""),
):
    with SessionLocal() as db:
        account = _account_from_header(db, authorization)

        business = (
            db.query(Business)
            .filter(
                Business.id == business_id,
                Business.account_id == account.id,
            )
            .first()
        )

        if not business:
            raise HTTPException(
                404,
                "Business not found"
            )

        subscription = (
            db.query(Subscription)
            .filter(
                Subscription.business_id == business.id
            )
            .first()
        )

        if subscription:
            external_id = str(
                subscription.external_subscription_id
                or ""
            ).strip()

            status = str(
                subscription.status
                or ""
            ).strip().lower()

            if (
                subscription.active
                or (
                    external_id.startswith("sub_")
                    and status not in {
                        "canceled",
                        "cancelled",
                    }
                )
            ):
                raise HTTPException(
                    409,
                    "Cancel the active subscription and wait until it ends before deleting this business"
                )

        if account.business_id == business.id:
            other_business = (
                db.query(Business)
                .filter(
                    Business.account_id == account.id,
                    Business.id != business.id,
                )
                .order_by(Business.id.asc())
                .first()
            )

            account.business_id = (
                other_business.id
                if other_business
                else None
            )

        db.query(Subscription).filter(
            Subscription.business_id == business.id
        ).delete(
            synchronize_session=False
        )

        db.query(SavedBusiness).filter(
            SavedBusiness.business_id == business.id
        ).delete(
            synchronize_session=False
        )

        db.query(Booking).filter(
            Booking.business_id == business.id
        ).delete(
            synchronize_session=False
        )

        db.query(BlockedSlot).filter(
            BlockedSlot.business_id == business.id
        ).delete(
            synchronize_session=False
        )

        db.query(WorkingHour).filter(
            WorkingHour.business_id == business.id
        ).delete(
            synchronize_session=False
        )

        db.query(Service).filter(
            Service.business_id == business.id
        ).delete(
            synchronize_session=False
        )

        db.delete(business)
        db.commit()

        return {
            "ok": True,
            "business_id": business_id,
        }


@app.get("/account/me")
def account_me(authorization: str = Header(default="")):
    with SessionLocal() as db:
        account = _account_from_header(db, authorization)

        if _sync_account_telegram_businesses(db, account):
            db.commit()

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
                "trial_available": _account_trial_available(
                    db,
                    account.id,
                ),
            },
        }


@app.post("/account/connect-telegram")
def account_connect_telegram(
    authorization: str = Header(default=""),
    x_telegram_init_data: str = Header(default=""),
):
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
            raise HTTPException(409, "This Telegram account is already connected to another Skedwoo account")

        business = db.get(Business, account.business_id) if account.business_id else None
        if not business:
            raise HTTPException(400, "Skedwoo business not found")

        from . import paddle_original
        web_owner_id = -int(account.id)
        if paddle_original._profile_trial_used(db, web_owner_id):
            paddle_original._mark_profile_trial_used(db, telegram_id)

        account.telegram_user_id = telegram_id

        _sync_account_telegram_businesses(
            db,
            account,
        )

        db.commit()

        return {
            "ok": True,
            "telegram_user_id": telegram_id,
            "business_id": business.id,
            "next": "open_bookly_in_telegram",
        }
def _account_trial_available(
    db,
    account_id: int,
) -> bool:
    account = db.get(
        BooklyAccount,
        int(account_id),
    )

    if not account:
        return False

    return not bool(
        account.free_trial_used
    )


def _mark_account_trial_used(
    db,
    account_id: int,
) -> None:
    account = db.get(
        BooklyAccount,
        int(account_id),
    )

    if not account:
        return

    account.free_trial_used = True
    db.commit()

class TelegramLinkIn(BaseModel):
    token: str = Field(min_length=20, max_length=80)


@app.get("/account/telegram-link")
def account_telegram_link(authorization: str = Header(default="")):
    with SessionLocal() as db:
        account = _account_from_header(db, authorization)
        business = db.get(Business, account.business_id) if account.business_id else None
        if not business:
            raise HTTPException(400, "Skedwoo business not found")

        raw = secrets.token_urlsafe(32)
        db.add(BooklyTelegramLink(
            token_hash=hashlib.sha256(raw.encode("utf-8")).hexdigest(),
            account_id=account.id,
            business_id=business.id,
            expires_at=datetime.utcnow() + timedelta(minutes=10),
        ))
        db.commit()

        bot_username = os.getenv("BOT_USERNAME", "skedwoo_bot").lstrip("@").strip()
        start_parameter = "bookly-connect-" + raw
        if len(start_parameter) > 64:
            raise HTTPException(500, "Telegram connection parameter is too long")

        # Main Mini App deep links carry startapp into the Mini App as
        # Telegram.WebApp.initDataUnsafe.start_param / tgWebAppStartParam.
        return {
            "ok": True,
            "business_id": business.id,
            "telegram_url": f"https://t.me/{bot_username}?startapp={start_parameter}",
            "expires_in": 600,
        }


@app.post("/account/connect-telegram-from-web")
def account_connect_telegram_from_web(
    x: TelegramLinkIn,
    x_telegram_init_data: str = Header(default=""),
):
    user = telegram_user(x_telegram_init_data)
    telegram_id = int(user["id"])
    prefix = "bookly-connect-"
    if not x.token.startswith(prefix):
        raise HTTPException(400, "Invalid Telegram connection token")

    raw = x.token[len(prefix):]
    token_hash = hashlib.sha256(raw.encode("utf-8")).hexdigest()

    with SessionLocal() as db:
        link = (
            db.query(BooklyTelegramLink)
            .filter(BooklyTelegramLink.token_hash == token_hash)
            .filter(BooklyTelegramLink.used_at.is_(None))
            .filter(BooklyTelegramLink.expires_at > datetime.utcnow())
            .first()
        )
        if not link:
            raise HTTPException(400, "Telegram connection link is invalid or expired")

        account = db.get(BooklyAccount, link.account_id)
        business = db.get(Business, link.business_id)
        if not account or not business or account.business_id != business.id:
            raise HTTPException(400, "Skedwoo account or business not found")

        existing = (
            db.query(BooklyAccount)
            .filter(BooklyAccount.telegram_user_id == telegram_id)
            .filter(BooklyAccount.id != account.id)
            .first()
        )
        if existing:
            raise HTTPException(409, "This Telegram account is already connected to another Skedwoo account")

        from . import paddle_original
        web_owner_id = -int(account.id)
        if paddle_original._profile_trial_used(db, web_owner_id):
            paddle_original._mark_profile_trial_used(db, telegram_id)

        account.telegram_user_id = telegram_id

        _sync_account_telegram_businesses(
            db,
            account,
        )

        link.used_at = datetime.utcnow()
        db.commit()

        return {
            "ok": True,
            "telegram_user_id": telegram_id,
            "business_id": business.id,
            "next": "open_admin",
        }

@app.get("/account/billing")
def account_billing(authorization: str = Header(default="")):
    from . import paddle_original
    from . import paddle_app

    with SessionLocal() as db:
        account = _account_from_header(
            db,
            authorization
        )

        business = (
            db.query(Business)
            .filter(
                Business.id == account.business_id,
                Business.account_id == account.id,
            )
            .first()
        )

        if not business:
            raise HTTPException(
                400,
                "Skedwoo business not found"
            )

        subscription = (
            db.query(Subscription)
            .filter(
                Subscription.business_id == business.id
            )
            .first()
        )

        # Synchronize lifecycle state from Paddle so Skedwoo cannot
        # keep showing a trialing subscription as paid/active after webhook
        # events arrive out of order. Package items are synchronized only
        # when there is no pending downgrade.
        if (
            subscription
            and subscription.external_subscription_id
        ):
            subscription_id = (
                subscription.external_subscription_id
                .strip()
            )

            if subscription_id.startswith("sub_"):
                try:
                    paddle_response = (
                        paddle_original._paddle_request(
                            "GET",
                            f"/subscriptions/{subscription_id}",
                        )
                    )

                    paddle_subscription = (
                        paddle_response.get("data")
                        or {}
                    )

                    paddle_status = str(
                        paddle_subscription.get("status")
                        or ""
                    ).strip().lower()

                    scheduled_change = (
                        paddle_subscription.get("scheduled_change")
                        or {}
                    )

                    scheduled_action = str(
                        scheduled_change.get("action")
                        or ""
                    ).strip().lower()

                    next_billed_at = (
                        paddle_subscription.get("next_billed_at")
                        or (
                            paddle_subscription.get(
                                "current_billing_period"
                            )
                            or {}
                        ).get("ends_at")
                    )

                    state_changed = False

                    # Preserve Skedwoo's "cancelled" marker while Paddle has a
                    # scheduled cancel/pause, otherwise trust Paddle's live
                    # lifecycle status.
                    if scheduled_action not in {"cancel", "pause"}:
                        if paddle_status:
                            if subscription.status != paddle_status:
                                subscription.status = paddle_status
                                state_changed = True

                            live_active = (
                                paddle_status
                                not in {
                                    "canceled",
                                    "cancelled",
                                    "paused",
                                }
                            )

                            if bool(subscription.active) != bool(live_active):
                                subscription.active = live_active
                                state_changed = True

                    live_expires_at = (
                        paddle_original._dt(
                            next_billed_at
                        )
                        if next_billed_at
                        else None
                    )

                    if (
                        live_expires_at
                        and subscription.expires_at
                        != live_expires_at
                    ):
                        subscription.expires_at = (
                            live_expires_at
                        )
                        state_changed = True

                    if (
                        subscription.active
                        and subscription.pending_services_limit
                        is None
                    ):
                        detected_limit = (
                            paddle_original._limit_from_items(
                                paddle_subscription.get("items")
                                or []
                            )
                        )

                        billing_interval = (
                            paddle_app._subscription_interval(
                                subscription_id
                            )
                        )

                        if billing_interval == "year":
                            annual_total = 0.0

                            for item in (
                                paddle_subscription.get("items")
                                or []
                            ):
                                price = (
                                    item.get("price")
                                    or {}
                                )

                                unit_price = (
                                    price.get("unit_price")
                                    or {}
                                )

                                amount = unit_price.get(
                                    "amount"
                                )

                                quantity = item.get(
                                    "quantity",
                                    1
                                )

                                if amount is not None:
                                    annual_total += (
                                        float(amount)
                                        / 100.0
                                    ) * float(quantity)

                            detected_price = round(
                                annual_total,
                                2
                            )

                        else:
                            detected_price = (
                                paddle_original.calculate_subscription_price(
                                    detected_limit
                                )
                            )

                        if (
                            subscription.current_services_limit
                            != detected_limit
                        ):
                            subscription.current_services_limit = (
                                detected_limit
                            )
                            state_changed = True

                        if (
                            float(
                                subscription.current_price or 0
                            )
                            != float(detected_price)
                        ):
                            subscription.current_price = (
                                detected_price
                            )
                            state_changed = True

                    if state_changed:
                        paddle_original._sync_business_from_subscription(
                            business,
                            subscription,
                        )
                        db.commit()

                except Exception as exc:
                    print(
                        "SKEDWOO BILLING PADDLE SYNC SKIPPED:",
                        repr(exc),
                    )

        return {
            "ok": True,
            "trial_available": _account_trial_available(
                db,
                account.id,
            ),
            "business": {
                "id": business.id,
                "name": business.name,
            },
            "subscription": {
                "active": (
                    bool(subscription.active)
                    if subscription
                    else False
                ),
                "status": (
                    subscription.status
                    if subscription
                    else "inactive"
                ),
                "expires_at": (
                    subscription.expires_at
                    if subscription
                    else None
                ),
                "services_limit": (
                    subscription.current_services_limit
                    if subscription and subscription.active
                    else 0
                ),
                "current_price": (
                    float(subscription.current_price)
                    if subscription
                    and subscription.current_price is not None
                    else 0.0
                ),
                "pending_services_limit": (
                    subscription.pending_services_limit
                    if subscription
                    else None
                ),
                "pending_price": (
                    float(subscription.pending_price)
                    if subscription
                    and subscription.pending_price is not None
                    else None
                ),
                "cancel_at": (
                    subscription.cancel_at.isoformat()
                    if subscription
                    and subscription.cancel_at
                    else None
                ),
                "active_services_count": (
                    _active_service_count(
                        db,
                        business.id,
                    )
                ),
            },
        }

class AccountSubscriptionLimitIn(BaseModel):
    services_limit: int = Field(ge=10, le=100)
@app.post("/account/subscription/preview-limit")
def account_preview_subscription_limit(
    x: AccountSubscriptionLimitIn,
    authorization: str = Header(default=""),
):
    from . import paddle_original
    from . import paddle_app

    limit = int(x.services_limit)

    if limit not in paddle_original.LIMITS:
        raise HTTPException(
            400,
            "Invalid services limit"
        )

    with SessionLocal() as db:
        account = _account_from_header(
            db,
            authorization
        )

        business, subscription, subscription_id = (
            _account_subscription(
                db,
                account
            )
        )

        current = (
            subscription.current_services_limit
            or 10
        )

        paddle_response = (
            paddle_original._paddle_request(
                "GET",
                f"/subscriptions/{subscription_id}",
            )
        )

        paddle_subscription = (
            paddle_response.get("data")
            or {}
        )

        paddle_status = str(
            paddle_subscription.get("status")
            or subscription.status
            or ""
        ).strip().lower()

        is_trialing = (
            paddle_status == "trialing"
        )

        billing_interval = (
            paddle_app._subscription_interval(
                subscription_id
            )
        )

        paddle_app._billing_interval.set(
            billing_interval
        )

        items = paddle_app._items_for_limit(
            limit
        )

        mode = (
            "do_not_bill"
            if is_trialing
            else (
                "prorated_immediately"
                if limit > current
                else "prorated_next_billing_period"
            )
        )

        trial_ends_at = (
            paddle_original._dt(
                paddle_subscription.get(
                    "next_billed_at"
                )
                or (
                    paddle_subscription.get(
                        "current_billing_period"
                    )
                    or {}
                ).get("ends_at")
            )
            if is_trialing
            else None
        )

        # Repair any stale local lifecycle state while we already have the
        # authoritative Paddle subscription in hand.
        if (
            is_trialing
            and (
                subscription.status != "trialing"
                or not subscription.active
            )
        ):
            subscription.status = "trialing"
            subscription.active = True

            if trial_ends_at:
                subscription.expires_at = (
                    trial_ends_at
                )

            paddle_original._sync_business_from_subscription(
                business,
                subscription,
            )
            db.commit()

        active_services_count = (
            _active_service_count(
                db,
                business.id,
            )
        )

    preview_payload = {
        "items": items,
        "proration_billing_mode": mode,
    }

    if not is_trialing:
        preview_payload[
            "on_payment_failure"
        ] = "prevent_change"

    preview_response = (
        paddle_original._paddle_request(
            "PATCH",
            f"/subscriptions/{subscription_id}/preview",
            preview_payload,
        )
    )

    data = (
        preview_response.get("data")
        or {}
    )

    update_summary = (
        data.get("update_summary")
        or {}
    )

    result = (
        update_summary.get("result")
        or {}
    )

    due_today = 0.0
    due_today_tax = 0.0

    if (
        mode == "prorated_immediately"
        and result.get("action") == "charge"
    ):
        amount = result.get("amount")

        if amount is not None:
            due_today = (
                float(amount) / 100.0
            )

        immediate_transaction = (
            data.get("immediate_transaction")
            or {}
        )

        immediate_details = (
            immediate_transaction.get("details")
            or {}
        )

        immediate_totals = (
            immediate_details.get("totals")
            or {}
        )

        tax_amount = (
            immediate_totals.get("tax")
        )

        if tax_amount is not None:
            due_today_tax = (
                float(tax_amount) / 100.0
            )

    price_ids = (
        paddle_app.ANNUAL_PRICE_IDS
        if billing_interval == "year"
        else paddle_original.PRICE_IDS
    )

    base_price_id = (
        price_ids.get(10)
    )

    if not base_price_id:
        raise HTTPException(
            500,
            "Base Price ID is not configured"
        )

    base_price, _ = (
        paddle_app._price_amount(
            base_price_id
        )
    )

    current_addon_price = 0.0
    new_addon_price = 0.0

    if current != 10:
        current_addon_id = (
            price_ids.get(current)
        )

        if not current_addon_id:
            raise HTTPException(
                500,
                f"Price ID for {current} services is not configured"
            )

        current_addon_price, _ = (
            paddle_app._price_amount(
                current_addon_id
            )
        )

    if limit != 10:
        new_addon_id = (
            price_ids.get(limit)
        )

        if not new_addon_id:
            raise HTTPException(
                500,
                f"Price ID for {limit} services is not configured"
            )

        new_addon_price, _ = (
            paddle_app._price_amount(
                new_addon_id
            )
        )

    current_total = round(
        base_price + current_addon_price,
        2
    )

    new_total = round(
        base_price + new_addon_price,
        2
    )

    billing_period = (
        data.get("next_transaction")
        or {}
    ).get("billing_period") or {}

    effective_at = (
        billing_period.get("starts_at")
        if mode ==
        "prorated_next_billing_period"
        else None
    )

    return {
        "ok": True,

        "current_services_limit":
            current,

        "new_services_limit":
            limit,

        "current_price":
            current_total,

        "new_price":
            new_total,

        "current_base_price":
            round(base_price, 2),

        "current_addon_price":
            round(current_addon_price, 2),

        "new_base_price":
            round(base_price, 2),

        "new_addon_price":
            round(new_addon_price, 2),

        "due_today":
            round(due_today, 2),

        "due_today_tax":
            round(due_today_tax, 2),

        "billing_interval":
            billing_interval,

        "trialing":
            is_trialing,

        "trial_ends_at": (
            trial_ends_at.isoformat()
            if trial_ends_at
            else None
        ),

        "effective": (
            "next_billing_period"
            if mode ==
            "prorated_next_billing_period"
            else "immediately"
        ),

        "effective_at":
            effective_at,

        "active_services_count":
            active_services_count,

        "services_over_new_limit":
            max(
                0,
                active_services_count - limit,
            ),

        "currency_code":
            (
                result.get("currency_code")
                or "USD"
            ),
    }



def _account_subscription(db, account):
    business = (
        db.query(Business)
        .filter(
            Business.id == account.business_id,
            Business.account_id == account.id,
        )
        .first()
    )

    if not business:
        raise HTTPException(
            400,
            "Skedwoo business not found"
        )

    subscription = (
        db.query(Subscription)
        .filter(
            Subscription.business_id == business.id
        )
        .first()
    )

    if not subscription:
        raise HTTPException(
            400,
            "Subscription not found"
        )

    if not subscription.active:
        raise HTTPException(
            400,
            "Active subscription required"
        )

    subscription_id = (
        subscription.external_subscription_id or ""
    ).strip()

    if not subscription_id.startswith("sub_"):
        raise HTTPException(
            400,
            "Paddle subscription ID is missing"
        )

    return business, subscription, subscription_id


@app.post("/account/subscription/change-limit")
def account_change_subscription_limit(
    x: AccountSubscriptionLimitIn,
    authorization: str = Header(default=""),
):
    from . import paddle_original
    from . import paddle_app

    limit = int(x.services_limit)

    if limit not in paddle_original.LIMITS:
        raise HTTPException(
            400,
            "Invalid services limit"
        )

    with SessionLocal() as db:
        account = _account_from_header(
            db,
            authorization
        )

        business, subscription, subscription_id = (
            _account_subscription(
                db,
                account
            )
        )

        current = int(
            subscription.current_services_limit
            or 10
        )

        paddle_response = (
            paddle_original._paddle_request(
                "GET",
                f"/subscriptions/{subscription_id}",
            )
        )

        paddle_subscription = (
            paddle_response.get("data")
            or {}
        )

        paddle_items = (
            paddle_subscription.get("items")
            or []
        )

        is_trialing = (
            str(
                paddle_subscription.get("status")
                or subscription.status
                or ""
            ).strip().lower()
            == "trialing"
        )

        billing_interval = "month"
        annual_price_ids = (
            paddle_app._all_annual_price_ids()
        )

        for item in paddle_items:
            price = (
                item.get("price")
                or {}
            )

            cycle = (
                price.get("billing_cycle")
                or item.get("billing_cycle")
                or {}
            )

            interval = str(
                cycle.get("interval")
                or ""
            ).lower()

            price_id = str(
                item.get("price_id")
                or price.get("id")
                or ""
            ).strip()

            if (
                interval == "year"
                or (
                    price_id
                    and price_id in annual_price_ids
                )
            ):
                billing_interval = "year"
                break

        paddle_app._billing_interval.set(
            billing_interval
        )

        if limit == current:
            return {
                "ok": True,
                "current_services_limit": current,
                "current_price": float(
                    subscription.current_price
                    or 7.99
                ),
                "pending_services_limit":
                    subscription.pending_services_limit,
                "pending_price": (
                    float(
                        subscription.pending_price
                    )
                    if subscription.pending_price
                    is not None
                    else None
                ),
            }

        if billing_interval == "year":
            annual_prices = (
                paddle_app.ANNUAL_PRICE_IDS
            )

            base_price_id = (
                annual_prices.get(10)
            )

            if not base_price_id:
                raise HTTPException(
                    500,
                    "Annual base Price ID is not configured"
                )

            base_price, _ = (
                paddle_app._price_amount(
                    base_price_id
                )
            )

            if limit == 10:
                new_price = base_price
            else:
                addon_price_id = (
                    annual_prices.get(limit)
                )

                if not addon_price_id:
                    raise HTTPException(
                        500,
                        f"Annual Price ID for {limit} services is not configured"
                    )

                addon_price, _ = (
                    paddle_app._price_amount(
                        addon_price_id
                    )
                )

                new_price = (
                    base_price
                    + addon_price
                )

            new_price = round(
                new_price,
                2
            )
        else:
            new_price = (
                paddle_original.calculate_subscription_price(
                    limit
                )
            )

        mode = (
            "do_not_bill"
            if is_trialing
            else (
                "prorated_immediately"
                if limit > current
                else "prorated_next_billing_period"
            )
        )

        # A normal paid downgrade starts next billing period.
        # During a free trial, Paddle allows item changes only with
        # do_not_bill, so package changes take effect immediately in
        # Skedwoo while the trial itself continues unchanged.
        if limit < current and not is_trialing:
            subscription.pending_services_limit = (
                limit
            )
            subscription.pending_price = (
                new_price
            )
            db.commit()

    update_payload = {
        "items":
            paddle_app._items_for_limit(
                limit
            ),
        "proration_billing_mode": mode,
    }

    if not is_trialing:
        update_payload[
            "on_payment_failure"
        ] = "prevent_change"

    try:
        paddle_original._paddle_request(
            "PATCH",
            f"/subscriptions/{subscription_id}",
            update_payload,
        )
    except Exception:
        if limit < current and not is_trialing:
            with SessionLocal() as db:
                account = _account_from_header(
                    db,
                    authorization
                )

                _, subscription, _ = (
                    _account_subscription(
                        db,
                        account
                    )
                )

                subscription.pending_services_limit = (
                    None
                )
                subscription.pending_price = None
                db.commit()

        raise

    with SessionLocal() as db:
        account = _account_from_header(
            db,
            authorization
        )

        business, subscription, _ = (
            _account_subscription(
                db,
                account
            )
        )

        if is_trialing or limit > current:
            subscription.current_services_limit = (
                limit
            )
            subscription.current_price = (
                new_price
            )
            subscription.pending_services_limit = (
                None
            )
            subscription.pending_price = None

            paddle_original._sync_business_from_subscription(
                business,
                subscription
            )

            db.commit()

        return {
            "ok": True,
            "current_services_limit":
                subscription.current_services_limit,
            "current_price": float(
                subscription.current_price
                or 7.99
            ),
            "pending_services_limit":
                subscription.pending_services_limit,
            "pending_price": (
                float(
                    subscription.pending_price
                )
                if subscription.pending_price
                is not None
                else None
            ),
        }


@app.post("/account/subscription/resume-package")
def account_resume_subscription_package(
    authorization: str = Header(default=""),
):
    from . import paddle_original
    from . import paddle_app

    with SessionLocal() as db:
        account = _account_from_header(
            db,
            authorization
        )

        business, subscription, subscription_id = (
            _account_subscription(
                db,
                account
            )
        )

        current = (
            subscription.current_services_limit
            or 10
        )

        pending = (
            subscription.pending_services_limit
        )

        if pending is None:
            return {
                "ok": True,
                "current_services_limit": current,
                "pending_services_limit": None,
                "pending_price": None,
            }

        billing_interval = (
            paddle_app._subscription_interval(
                subscription_id
            )
        )

        paddle_app._billing_interval.set(
            billing_interval
        )

    paddle_original._paddle_request(
        "PATCH",
        f"/subscriptions/{subscription_id}",
        {
            "items":
                paddle_app._items_for_limit(
                    current
                ),
            "proration_billing_mode":
                "do_not_bill",
            "on_payment_failure":
                "prevent_change",
        },
    )

    with SessionLocal() as db:
        account = _account_from_header(
            db,
            authorization
        )

        business, subscription, subscription_id = (
            _account_subscription(
                db,
                account
            )
        )

        subscription.pending_services_limit = None
        subscription.pending_price = None

        db.commit()

        return {
            "ok": True,
            "current_services_limit":
                subscription.current_services_limit,
            "pending_services_limit": None,
            "pending_price": None,
        }

@app.post("/account/subscription/cancel")
def account_cancel_subscription(
    authorization: str = Header(default=""),
):
    from . import paddle_original

    with SessionLocal() as db:
        account = _account_from_header(
            db,
            authorization
        )

        business, subscription, subscription_id = (
            _account_subscription(
                db,
                account
            )
        )

    # Убираем возможное старое
    # запланированное изменение.
    paddle_original._paddle_request(
        "PATCH",
        f"/subscriptions/{subscription_id}",
        {
            "scheduled_change": None,
        },
    )

    data = paddle_original._paddle_request(
        "POST",
        f"/subscriptions/{subscription_id}/cancel",
        {
            "effective_from":
                "next_billing_period"
        },
    )

    paddle = data.get("data") or {}

    expires = paddle_original._dt(
        (
            paddle.get("scheduled_change")
            or {}
        ).get("effective_at")
    )

    with SessionLocal() as db:
        account = _account_from_header(
            db,
            authorization
        )

        business = (
            db.query(Business)
            .filter(
                Business.id == account.business_id,
                Business.account_id == account.id,
            )
            .first()
        )

        subscription = (
            db.query(Subscription)
            .filter(
                Subscription.business_id == business.id
            )
            .first()
            if business
            else None
        )

        if not business or not subscription:
            raise HTTPException(
                404,
                "Subscription not found"
            )

        subscription.status = "cancelled"
        subscription.active = True

        if expires:
            subscription.expires_at = expires
            subscription.cancel_at = expires
            
        subscription.pending_services_limit = None
        subscription.pending_price = None

        paddle_original._sync_business_from_subscription(
            business,
            subscription
        )

        db.commit()

        return {
            "ok": True,
            "cancelled": True,
            "access_until":
                (
                    subscription.expires_at.isoformat()
                    if subscription.expires_at
                    else None
                ),
        }


@app.post("/account/subscription/resume")
def account_resume_subscription(
    authorization: str = Header(default=""),
):
    from . import paddle_original

    with SessionLocal() as db:
        account = _account_from_header(
            db,
            authorization
        )

        business, subscription, subscription_id = (
            _account_subscription(
                db,
                account
            )
        )

    data = paddle_original._paddle_request(
        "PATCH",
        f"/subscriptions/{subscription_id}",
        {
            "scheduled_change": None,
        },
    )

    paddle = data.get("data") or {}

    next_billed_at = paddle.get(
        "next_billed_at"
    )

    with SessionLocal() as db:
        account = _account_from_header(
            db,
            authorization
        )

        business = (
            db.query(Business)
            .filter(
                Business.id == account.business_id,
                Business.account_id == account.id,
            )
            .first()
        )

        subscription = (
            db.query(Subscription)
            .filter(
                Subscription.business_id == business.id
            )
            .first()
            if business
            else None
        )

        if not business or not subscription:
            raise HTTPException(
                404,
                "Subscription not found"
            )

        subscription.status = "active"
        subscription.active = True
        subscription.cancel_at = None

        if next_billed_at:
            subscription.expires_at = (
                paddle_original._dt(
                    next_billed_at
                )
            )

        paddle_original._sync_business_from_subscription(
            business,
            subscription
        )

        db.commit()

        return {
            "ok": True,
            "resumed": True,
        }
@app.get("/account/paddle/checkout-token")
def account_paddle_checkout_token(authorization: str = Header(default="")):
    with SessionLocal() as db:
        account = _account_from_header(db, authorization)
        business = db.get(Business, account.business_id) if account.business_id else None
        if not business:
            raise HTTPException(400, "Skedwoo business not found")

        account_id = db.execute(
            text("SELECT account_id FROM businesses WHERE id = :business_id"),
            {"business_id": business.id},
        ).scalar_one_or_none()
        if int(account_id or 0) != int(account.id):
            raise HTTPException(403, "Skedwoo business is not linked to this account")

        subscription = (
            db.query(Subscription)
            .filter(
                Subscription.business_id == business.id
            )
            .first()
        )

        if subscription:
            external_id = str(
                subscription.external_subscription_id
                or ""
            ).strip()

            status = str(
                subscription.status
                or ""
            ).strip().lower()

            if (
                subscription.active
                or (
                    external_id.startswith("sub_")
                    and status not in {
                        "canceled",
                        "cancelled",
                    }
                )
            ):
                raise HTTPException(
                    409,
                    "This business already has a Paddle subscription. Manage it from Billing."
                )

        return {
            "ok": True,
            "checkout_token": _account_checkout_token(
                account.id,
                business.id,
                business.owner_telegram_id,
            ),
            "business_id": business.id,
        }
