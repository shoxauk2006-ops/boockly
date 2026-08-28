from __future__

import hashlib
import hmac
import json
import os
import time
from datetime import datetime
from typing import Optional
from urllib import request as urllib_request
from urllib.error import HTTPError, URLError

from fastapi import Header, HTTPException, Request
from sqlalchemy import text

from .app import (
    app,
    Business,
    Subscription,
    SessionLocal,
    engine,
    owner_business,
    owner_subscription,
    telegram_user,
    calculate_subscription_price,
    SubscriptionLimitChangeIn,
)


# One switch selects the active Paddle environment. Credentials and price IDs
# can be stored separately for Sandbox and Live so switching environments does
# not require replacing individual secrets.
PADDLE_ENV = os.getenv("PADDLE_ENV", "sandbox").strip().lower()
if PADDLE_ENV not in {"sandbox", "live"}:
    raise RuntimeError("PADDLE_ENV must be 'sandbox' or 'live'")

_ENV_PREFIX = "PADDLE_SANDBOX_" if PADDLE_ENV == "sandbox" else "PADDLE_LIVE_"


def _env(name: str) -> str:
    return os.getenv(_ENV_PREFIX + name, "").strip()


PADDLE_API_BASE = (
    "https://sandbox-api.paddle.com"
    if PADDLE_ENV == "sandbox"
    else "https://api.paddle.com"
)
PADDLE_API_KEY = _env("API_KEY")
PADDLE_WEBHOOK_SECRET = _env("WEBHOOK_SECRET")

PRICE_IDS = {
    10: _env("BOOKLY_BASE_PRICE_ID"),
    20: _env("SERVICE_ADDON_20_PRICE_ID"),
    30: _env("SERVICE_ADDON_30_PRICE_ID"),
    50: _env("SERVICE_ADDON_50_PRICE_ID"),
    100: _env("SERVICE_ADDON_100_PRICE_ID"),
}

LIMITS = {10, 20, 30, 50, 100}

SUPPORTED_PADDLE_EVENTS = {
    "transaction.completed",
    "transaction.payment_failed",

    "subscription.created",
    "subscription.updated",
    "subscription.activated",
    "subscription.resumed",
    "subscription.paused",
    "subscription.past_due",
    "subscription.canceled",
}


# Idempotency: Paddle retries non-2xx webhook deliveries. We record each event
# only after signature verification and before applying business state.
with engine.begin() as _conn:
    _conn.execute(
        text(
            """
            CREATE TABLE IF NOT EXISTS paddle_webhook_events (
                event_id VARCHAR(120) PRIMARY KEY,
                event_type VARCHAR(120) NOT NULL,
                received_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
            )
            """
        )
    )


def _remove_routes(paths: set[str]) -> None:
    app.router.routes = [
        route
        for route in app.router.routes
        if getattr(route, "path", None) not in paths
    ]


# Replace the old Paddle handlers without touching the rest of the application.
_remove_routes(
    {
        "/payments/webhook/paddle",
        "/admin/subscription/preview-limit",
        "/admin/subscription/change-limit",
        "/admin/subscription/resume-package",
        "/admin/subscription/cancel",
        "/admin/subscription/resume",
    }
)


def _require_config() -> None:
    missing = []
    if not PADDLE_API_KEY:
        missing.append("API_KEY")
    if not PADDLE_WEBHOOK_SECRET:
        missing.append("WEBHOOK_SECRET")
    if not PRICE_IDS[10]:
        missing.append("BOOKLY_BASE_PRICE_ID")
    if any(not PRICE_IDS[x] for x in (20, 30, 50, 100)):
        missing.append("SERVICE_ADDON_PRICE_IDS")
    if missing:
        raise HTTPException(
            500,
            f"Paddle {PADDLE_ENV} configuration is incomplete: {', '.join(missing)}",
        )


def _paddle_request(method: str, path: str, payload: Optional[dict] = None) -> dict:
    _require_config()
    body = json.dumps(payload).encode("utf-8") if payload is not None else None
    req = urllib_request.Request(
        PADDLE_API_BASE + path,
        data=body,
        method=method,
        headers={
            "Authorization": f"Bearer {PADDLE_API_KEY}",
            "Content-Type": "application/json",
            "Accept": "application/json",
            "Paddle-Version": "1",
        },
    )
    try:
        with urllib_request.urlopen(req, timeout=20) as response:
            raw = response.read().decode("utf-8")
            return json.loads(raw) if raw else {}
    except HTTPError as exc:
        try:
            raw = exc.read().decode("utf-8")
        except Exception:
            raw = ""
        raise HTTPException(502, f"Paddle API error {exc.code}: {raw[:4000]}")
    except URLError as exc:
        raise HTTPException(502, f"Paddle connection error: {exc.reason}")


def _items_for_limit(limit: int) -> list[dict]:
    if limit not in LIMITS:
        raise HTTPException(400, "Недопустимый лимит услуг")
    if not PRICE_IDS[10]:
        raise HTTPException(500, "Bookly Pro base Price ID is not configured")

    items = [{"price_id": PRICE_IDS[10], "quantity": 1}]
    if limit != 10:
        addon = PRICE_IDS[limit]
        if not addon:
            raise HTTPException(500, f"Paddle Price ID for {limit} services is not configured")
        items.append({"price_id": addon, "quantity": 1})
    return items


def _limit_from_items(items) -> int:
    price_to_limit = {v: k for k, v in PRICE_IDS.items() if v}
    detected = 10
    for item in items or []:
        price = item.get("price") or {}
        price_id = str(item.get("price_id") or price.get("id") or "")
        if price_id in price_to_limit:
            detected = max(detected, price_to_limit[price_id])
    return detected


def _dt(value: Optional[str]):
    if not value:
        return None
    try:
        return datetime.fromisoformat(value.replace("Z", "+00:00")).replace(tzinfo=None)
    except (TypeError, ValueError):
        return None


def _sync_business_from_subscription(business, subscription) -> None:
    business.subscription_active = bool(subscription.active)
    business.subscription_expires_at = subscription.expires_at
    business.subscription_status = subscription.status or "inactive"
    business.payment_provider = "paddle"
    business.external_subscription_id = subscription.external_subscription_id or ""


def _find_business(db, custom: dict, subscription_id: str = ""):
    business_id = custom.get("business_id")
    owner_id = custom.get("telegram_user_id")

    # Для Paddle webhook бизнес должен определяться точно.
    # Нельзя выбирать "первый бизнес" владельца:
    # у одного Telegram-пользователя может быть несколько бизнесов.
    if business_id:
        try:
            business = db.get(Business, int(business_id))
        except (TypeError, ValueError):
            business = None

        if not business:
            return None

        # Если Telegram ID присутствует в custom_data,
        # используем его как дополнительную проверку владельца.
        if owner_id:
            try:
                if int(business.owner_telegram_id) != int(owner_id):
                    return None
            except (TypeError, ValueError):
                return None

        return business

    # Для событий, пришедших без business_id/custom_data,
    # разрешаем надёжный fallback только через уже сохранённый
    # Paddle subscription ID.
    if subscription_id:
        row = (
            db.query(Subscription)
            .filter(
                Subscription.external_subscription_id
                == subscription_id
            )
            .first()
        )
        if row:
            return db.get(Business, row.business_id)

    return None


def _get_or_create_subscription(db, business):
    subscription = owner_subscription(db, business.id)
    if subscription:
        return subscription

    subscription = Subscription(
        business_id=business.id,
        owner_telegram_id=business.owner_telegram_id,
        plan="pro",
        active=False,
        status="inactive",
        current_services_limit=10,
        current_price=7.99,
        payment_provider="paddle",
    )
    db.add(subscription)
    db.flush()
    return subscription


def _event_already_processed(db, event_id: str) -> bool:
    if not event_id:
        return False

    exists = db.execute(
        text(
            """
            SELECT event_id
            FROM paddle_webhook_events
            WHERE event_id = :event_id
            """
        ),
        {"event_id": event_id},
    ).first()

    return bool(exists)


def _mark_event_processed(
    db,
    event_id: str,
    event_type: str,
) -> None:
    if not event_id:
        return

    db.execute(
        text(
            """
            INSERT INTO paddle_webhook_events(
                event_id,
                event_type
            )
            VALUES (
                :event_id,
                :event_type
            )
            """
        ),
        {
            "event_id": event_id,
            "event_type": event_type,
        },
    )

def _apply_paddle_event(payload: dict) -> None:
    event_id = str(payload.get("event_id") or "")
    event_type = str(payload.get("event_type") or "")
    data = payload.get("data") or {}
    custom = data.get("custom_data") or {}

        occurred_at = _dt(
        payload.get("occurred_at")
    )

    if not occurred_at:
        raise ValueError(
            "Paddle occurred_at is missing or invalid"
        )

    if not event_type:
        raise ValueError("Paddle event_type is missing")

    if event_type in {
        "subscription.created",
        "subscription.updated",
        "subscription.resumed",
        "subscription.paused",
        "subscription.canceled",
    }:
        subscription_id = str(data.get("id") or "")
    else:
        subscription_id = str(data.get("subscription_id") or "")

        with SessionLocal() as db:
        if _event_already_processed(db, event_id):
            db.rollback()
            return

        if event_type not in SUPPORTED_PADDLE_EVENTS:
            _mark_event_processed(
                db,
                event_id,
                event_type,
            )
            db.commit()
            return

        business = _find_business(
            db,
            custom,
            subscription_id,
        )

        if not business:
            print(
                "BOOKLY PADDLE: unmapped event",
                event_id,
                event_type,
                "subscription_id=",
                subscription_id,
                "custom_data=",
                custom,
            )
            raise ValueError(
                f"Paddle event cannot be mapped to Bookly business: {event_id}"
            )

                subscription = _get_or_create_subscription(
            db,
            business,
        )

        if (
            subscription.paddle_last_event_at
            and occurred_at
            < subscription.paddle_last_event_at
        ):
            _mark_event_processed(
                db,
                event_id,
                event_type,
            )
            db.commit()
            return

        if subscription_id.startswith("sub_"):
            subscription.external_subscription_id = (
                subscription_id
            )

        subscription.payment_provider = "paddle"

        status = str(data.get("status") or "")
        billing_period = (
            data.get("current_billing_period")
            or data.get("billing_period")
            or {}
        )
        next_billed_at = (
            data.get("next_billed_at")
            or billing_period.get("ends_at")
        )

        if event_type == "transaction.completed":
            subscription.active = True
            subscription.status = "active"
            subscription.expires_at = (
                _dt(next_billed_at)
                or subscription.expires_at
            )

            detected_limit = _limit_from_items(
                data.get("items")
                or data.get("line_items")
                or []
            )

            subscription.current_services_limit = (
                detected_limit
            )
            subscription.current_price = (
                calculate_subscription_price(
                    detected_limit
                )
            )
            subscription.pending_services_limit = None
            subscription.pending_price = None

        elif event_type == "transaction.payment_failed":
            subscription.status = (
                status
                or "past_due"
            )

            subscription.active = bool(
                subscription.expires_at
                and subscription.expires_at
                > datetime.utcnow()
            )

        elif event_type == "subscription.created":
            subscription.status = (
                status
                or "active"
            )

            subscription.active = (
                subscription.status
                not in {
                    "canceled",
                    "cancelled",
                    "paused",
                }
            )

            subscription.expires_at = (
                _dt(next_billed_at)
                or subscription.expires_at
            )

            detected = _limit_from_items(
                data.get("items")
                or []
            )

            subscription.current_services_limit = (
                detected
            )
            subscription.current_price = (
                calculate_subscription_price(
                    detected
                )
            )

        elif event_type == "subscription.updated":
            subscription.status = (
                status
                or subscription.status
                or "active"
            )

            subscription.active = (
                subscription.status
                not in {
                    "canceled",
                    "cancelled",
                    "paused",
                }
            )

            subscription.expires_at = (
                _dt(next_billed_at)
                or subscription.expires_at
            )

            if subscription.pending_services_limit is None:
                detected = _limit_from_items(
                    data.get("items")
                    or []
                )

                subscription.current_services_limit = (
                    detected
                )
                subscription.current_price = (
                    calculate_subscription_price(
                        detected
                    )
                )

              elif event_type == "subscription.activated":
            subscription.status = "active"
            subscription.active = True
            subscription.expires_at = (
                _dt(next_billed_at)
                or subscription.expires_at
            )

        elif event_type == "subscription.past_due":
            subscription.status = "past_due"
            subscription.active = bool(
                subscription.expires_at
                and subscription.expires_at
                > datetime.utcnow()
            )
        elif event_type == "subscription.resumed":
            subscription.status = "active"
            subscription.active = True
            subscription.expires_at = (
                _dt(next_billed_at)
                or subscription.expires_at
            )

        elif event_type == "subscription.canceled":
            effective_dt = _dt(
                (
                    data.get("scheduled_change")
                    or {}
                ).get("effective_at")
            )

            if (
                effective_dt
                and effective_dt > datetime.utcnow()
            ):
                subscription.status = "cancelled"
                subscription.active = True
                subscription.expires_at = effective_dt
            else:
                subscription.status = "cancelled"
                subscription.active = False
                subscription.expires_at = (
                    effective_dt
                    or subscription.expires_at
                )

        elif event_type == "subscription.paused":
            subscription.status = "paused"
            subscription.active = False

              subscription.paddle_last_event_at = occurred_at

        _sync_business_from_subscription(
            business,
            subscription,
        )

        _mark_event_processed(
            db,
            event_id,
            event_type,
        )

        db.commit()


@app.post("/payments/webhook/paddle")
async def paddle_webhook(request: Request):
    raw = await request.body()
    signature_header = request.headers.get("Paddle-Signature", "")

    if not PADDLE_WEBHOOK_SECRET:
        raise HTTPException(500, "Paddle webhook secret is not configured")

    parts = {}
    for part in signature_header.split(";"):
        if "=" in part:
            key, value = part.split("=", 1)
            parts.setdefault(key.strip(), []).append(value.strip())

    ts = (parts.get("ts") or [""])[0]
    signatures = parts.get("h1") or []
    if not ts or not signatures:
        raise HTTPException(401, "Invalid Paddle signature header")

    try:
        age = abs(int(time.time()) - int(ts))
    except ValueError:
        raise HTTPException(401, "Invalid Paddle timestamp")

    if age > 5:
        raise HTTPException(401, "Expired Paddle webhook")

    signed_payload = f"{ts}:{raw.decode('utf-8')}".encode("utf-8")
    expected = hmac.new(
        PADDLE_WEBHOOK_SECRET.encode("utf-8"),
        signed_payload,
        hashlib.sha256,
    ).hexdigest()

    if not any(hmac.compare_digest(expected, signature) for signature in signatures):
        raise HTTPException(401, "Invalid Paddle webhook signature")

    try:
        payload = json.loads(raw.decode("utf-8"))
        _apply_paddle_event(payload)
    except HTTPException:
        raise
    except Exception as exc:
        print("BOOKLY PADDLE WEBHOOK ERROR:", repr(exc))
        raise HTTPException(500, "Paddle webhook processing failed")

    return {"received": True}


def _current_subscription(x_telegram_init_data: str):
    user = telegram_user(x_telegram_init_data)
    owner_id = int(user["id"])
    with SessionLocal() as db:
        business = owner_business(db, owner_id)
        if not business:
            raise HTTPException(404, "Business not found")
        subscription = owner_subscription(db, business.id)
        if not subscription:
            raise HTTPException(400, "Subscription not found")
        subscription_id = (subscription.external_subscription_id or "").strip()
        if not subscription_id.startswith("sub_"):
            raise HTTPException(400, "Paddle subscription ID is missing")
        return user, owner_id, business.id, subscription_id


@app.post("/admin/subscription/preview-limit")
def preview_subscription_limit(
    x: SubscriptionLimitChangeIn,
    x_telegram_init_data: str = Header(default=""),
):
    _, _, business_id, subscription_id = _current_subscription(x_telegram_init_data)
    if x.services_limit not in LIMITS or x.services_limit == 10:
        raise HTTPException(400, "Preview доступен только для пакетов 20/30/50/100")
    with SessionLocal() as db:
        subscription = owner_subscription(db, business_id)
        if not subscription or not subscription.active:
            raise HTTPException(400, "Active subscription required")
        current = subscription.current_services_limit or 10
        if x.services_limit <= current:
            raise HTTPException(400, "Новый лимит должен быть больше текущего")

    return _paddle_request(
        "PATCH",
        f"/subscriptions/{subscription_id}/preview",
        {
            "items": _items_for_limit(x.services_limit),
            "proration_billing_mode": "prorated_immediately",
            "on_payment_failure": "prevent_change",
        },
    )


@app.post("/admin/subscription/change-limit")
def change_subscription_limit(
    x: SubscriptionLimitChangeIn,
    x_telegram_init_data: str = Header(default=""),
):
    _, _, business_id, subscription_id = _current_subscription(x_telegram_init_data)
    limit = int(x.services_limit)
    if limit not in LIMITS:
        raise HTTPException(400, "Недопустимый лимит услуг")

    with SessionLocal() as db:
        subscription = owner_subscription(db, business_id)
        if not subscription or not subscription.active:
            raise HTTPException(400, "Active subscription required")
        current = subscription.current_services_limit or 10
        if limit == current:
            return {
                "ok": True,
                "current_services_limit": current,
                "current_price": float(subscription.current_price or 7.99),
                "pending_services_limit": subscription.pending_services_limit,
                "pending_price": subscription.pending_price,
            }

    mode = "prorated_immediately" if limit > current else "prorated_next_billing_period"
    _paddle_request(
        "PATCH",
        f"/subscriptions/{subscription_id}",
        {
            "items": _items_for_limit(limit),
            "proration_billing_mode": mode,
            "on_payment_failure": "prevent_change",
        },
    )

    new_price = calculate_subscription_price(limit)
    with SessionLocal() as db:
        subscription = owner_subscription(db, business_id)
        business = db.get(Business, business_id)
        if not subscription or not business:
            raise HTTPException(404, "Subscription not found")

        if limit > current:
            subscription.current_services_limit = limit
            subscription.current_price = new_price
            subscription.pending_services_limit = None
            subscription.pending_price = None
        else:
            subscription.pending_services_limit = limit
            subscription.pending_price = new_price

        _sync_business_from_subscription(business, subscription)
        db.commit()

        return {
            "ok": True,
            "current_services_limit": subscription.current_services_limit,
            "current_price": float(subscription.current_price or 7.99),
            "pending_services_limit": subscription.pending_services_limit,
            "pending_price": float(subscription.pending_price) if subscription.pending_price is not None else None,
        }


@app.post("/admin/subscription/resume-package")
def resume_subscription_package(x_telegram_init_data: str = Header(default="")):
    _, _, business_id, subscription_id = _current_subscription(x_telegram_init_data)
    with SessionLocal() as db:
        subscription = owner_subscription(db, business_id)
        if not subscription:
            raise HTTPException(404, "Subscription not found")
        current = subscription.current_services_limit or 10
        if current <= 10 or subscription.pending_services_limit is None:
            return {
                "ok": True,
                "current_services_limit": current,
                "pending_services_limit": None,
                "pending_price": None,
            }

    _paddle_request(
        "PATCH",
        f"/subscriptions/{subscription_id}",
        {
            "items": _items_for_limit(current),
            "proration_billing_mode": "do_not_bill",
            "on_payment_failure": "prevent_change",
        },
    )

    with SessionLocal() as db:
        subscription = owner_subscription(db, business_id)
        subscription.pending_services_limit = None
        subscription.pending_price = None
        db.commit()
    return {"ok": True, "current_services_limit": current, "pending_services_limit": None, "pending_price": None}


@app.post("/admin/subscription/cancel")
def cancel_subscription(x_telegram_init_data: str = Header(default="")):
    _, _, business_id, subscription_id = _current_subscription(x_telegram_init_data)
    data = _paddle_request(
        "POST",
        f"/subscriptions/{subscription_id}/cancel",
        {"effective_from": "next_billing_period"},
    )
    paddle = data.get("data") or {}
    expires = _dt((paddle.get("scheduled_change") or {}).get("effective_at"))

    with SessionLocal() as db:
        subscription = owner_subscription(db, business_id)
        business = db.get(Business, business_id)
        subscription.status = "cancelled"
        subscription.active = True
        if expires:
            subscription.expires_at = expires
        _sync_business_from_subscription(business, subscription)
        db.commit()
        return {
            "ok": True,
            "cancelled": True,
            "access_until": subscription.expires_at.isoformat() if subscription.expires_at else None,
        }


@app.post("/admin/subscription/resume")
def resume_subscription(
    x_telegram_init_data: str = Header(default="")
):
    _, _, business_id, subscription_id = (
        _current_subscription(
            x_telegram_init_data
        )
    )

    data = _paddle_request(
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
        subscription = owner_subscription(
            db,
            business_id,
        )
        business = db.get(
            Business,
            business_id,
        )

        if not subscription or not business:
            raise HTTPException(
                404,
                "Subscription not found",
            )

        subscription.status = "active"
        subscription.active = True

        if next_billed_at:
            subscription.expires_at = _dt(
                next_billed_at
            )

        _sync_business_from_subscription(
            business,
            subscription,
        )

        db.commit()

        return {
            "ok": True,
            "resumed": True,
        }
