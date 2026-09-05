from __future__ import annotations

import contextvars
import os

from fastapi import HTTPException
from . import paddle_original as _original

app = _original.app

# Remove payment entry points that belong to abandoned providers. Paddle is
# the only payment provider exposed by the running API.
def _remove_legacy_payment_routes() -> None:
    app.router.routes = [
        route
        for route in app.router.routes
        if getattr(route, "path", None) not in {
            "/payments/checkout/{provider}",
            "/payments/webhook/{provider}",
        }
    ]


_remove_legacy_payment_routes()

# Request-local billing interval used by the existing subscription-management
# routes when they build Paddle item lists. The value is consumed once by the
# patched _items_for_limit helper so it cannot leak into another request.
_billing_interval = contextvars.ContextVar(
    "bookly_paddle_billing_interval",
    default=None,
)

_original_sync = _original._sync_business_from_subscription
_original_apply = _original._apply_paddle_event
_original_limit_from_items = _original._limit_from_items
_original_items_for_limit = _original._items_for_limit
_original_current_subscription = _original._current_subscription


def _env(name: str) -> str:
    return os.getenv(
        (
            "PADDLE_SANDBOX_"
            if _original.PADDLE_ENV == "sandbox"
            else "PADDLE_LIVE_"
        ) + name,
        "",
    ).strip()


# Annual Price IDs are configured separately from the existing monthly IDs.
# Each tier still consists of a base item plus an optional service add-on.
ANNUAL_PRICE_IDS = {
    10: _env("BOOKLY_ANNUAL_BASE_PRICE_ID"),
    20: _env("ANNUAL_SERVICE_ADDON_20_PRICE_ID"),
    30: _env("ANNUAL_SERVICE_ADDON_30_PRICE_ID"),
    50: _env("ANNUAL_SERVICE_ADDON_50_PRICE_ID"),
    100: _env("ANNUAL_SERVICE_ADDON_100_PRICE_ID"),
}


def _all_annual_price_ids() -> set[str]:
    return {
        value
        for value in ANNUAL_PRICE_IDS.values()
        if value
    }


def _limit_from_items(items) -> int:
    """Recognize both monthly and annual Bookly Paddle items."""
    annual_base = str(ANNUAL_PRICE_IDS[10] or "").strip()
    monthly_base = str(_original.PRICE_IDS[10] or "").strip()

    monthly_addons = {
        str(price_id).strip(): limit
        for limit, price_id in _original.PRICE_IDS.items()
        if limit != 10 and price_id
    }
    annual_addons = {
        str(price_id).strip(): limit
        for limit, price_id in ANNUAL_PRICE_IDS.items()
        if limit != 10 and price_id
    }

    detected = set()
    for item in items or []:
        price = item.get("price") or {}
        price_id = str(
            item.get("price_id")
            or price.get("id")
            or ""
        ).strip()
        if price_id:
            detected.add(price_id)

    if annual_base and annual_base in detected:
        matches = [
            limit
            for price_id, limit in annual_addons.items()
            if price_id in detected
        ]
        return matches[0] if len(matches) == 1 else 10

    if monthly_base and monthly_base in detected:
        matches = [
            limit
            for price_id, limit in monthly_addons.items()
            if price_id in detected
        ]
        return matches[0] if len(matches) == 1 else 10

    return _original_limit_from_items(items)


def _items_for_limit(limit: int) -> list[dict]:
    interval = _billing_interval.get()
    if interval == "year" and ANNUAL_PRICE_IDS[10]:
        if limit not in {10, 20, 30, 50, 100}:
            raise HTTPException(400, "Недопустимый лимит услуг")

        items = [
            {
                "price_id": ANNUAL_PRICE_IDS[10],
                "quantity": 1,
            }
        ]

        if limit != 10:
            addon = ANNUAL_PRICE_IDS.get(limit)
            if not addon:
                raise HTTPException(
                    500,
                    f"Paddle annual Price ID for {limit} services is not configured",
                )
            items.append(
                {
                    "price_id": addon,
                    "quantity": 1,
                }
            )

        _billing_interval.set(None)
        return items

    result = _original_items_for_limit(limit)
    _billing_interval.set(None)
    return result


def _subscription_interval(subscription_id: str) -> str:
    """Detect the billing interval from the current Paddle subscription."""
    try:
        response = _original._paddle_request(
            "GET",
            f"/subscriptions/{subscription_id}",
        )
        data = response.get("data") or {}
        items = data.get("items") or []

        annual_ids = _all_annual_price_ids()
        for item in items:
            price_id = str(
                item.get("price_id")
                or (item.get("price") or {}).get("id")
                or ""
            ).strip()
            if price_id in annual_ids:
                return "year"

            price = item.get("price") or {}
            cycle = (
                price.get("billing_cycle")
                or item.get("billing_cycle")
                or {}
            )
            interval = str(cycle.get("interval") or "").lower()
            if interval in {"year", "month"}:
                return interval
    except Exception as exc:
        print(
            "BOOKLY PADDLE INTERVAL DETECTION ERROR:",
            repr(exc),
        )

    return "month"


def _current_subscription(x_telegram_init_data: str):
    result = _original_current_subscription(
        x_telegram_init_data
    )
    _user, _owner_id, _business_id, subscription_id = result
    _billing_interval.set(
        _subscription_interval(subscription_id)
    )
    return result


def _sync_business_from_subscription(
    business,
    subscription,
) -> None:
    _original_sync(
        business,
        subscription,
    )


def _apply_paddle_event(payload: dict) -> None:
    return _original_apply(payload)


# Make the original route functions resolve these patched helpers at runtime.
_original._limit_from_items = _limit_from_items
_original._items_for_limit = _items_for_limit
_original._current_subscription = _current_subscription
_original._sync_business_from_subscription = _sync_business_from_subscription
_original._apply_paddle_event = _apply_paddle_event


def _public_client_token() -> str:
    return _env("CLIENT_TOKEN")


def _public_annual_prices() -> dict:
    return {
        str(limit): price_id
        for limit, price_id in ANNUAL_PRICE_IDS.items()
        if price_id
    }


def _public_monthly_prices() -> dict:
    return {
        str(limit): price_id
        for limit, price_id in _original.PRICE_IDS.items()
        if limit != 10 and price_id
    }


def _price_id_for_selection(
    billing: str,
    limit: int,
    trial_available: bool,
) -> str:
    billing = billing.lower().strip()
    if billing == "year":
        # Yearly plans never have a trial. Always use the normal annual base
        # price, regardless of the user's monthly trial status.
        base_id = ANNUAL_PRICE_IDS[10]
        addon_id = (
            ANNUAL_PRICE_IDS.get(limit)
            if limit != 10
            else None
        )
    elif billing == "month":
        base_id = (
            _original.PRICE_IDS[10]
            if trial_available
            else _original.NO_TRIAL_BASE_PRICE_ID
        )
        addon_id = (
            _original.PRICE_IDS.get(limit)
            if limit != 10
            else None
        )
    else:
        raise HTTPException(400, "billing must be 'month' or 'year'")

    if not base_id:
        raise HTTPException(
            500,
            "Selected Paddle base Price ID is not configured",
        )

    if limit != 10 and not addon_id:
        raise HTTPException(
            500,
            "Selected Paddle add-on Price ID is not configured",
        )

    return base_id if limit == 10 else addon_id


@app.get("/payments/external/checkout-config")
def external_checkout_config(token: str):
    """Return only public checkout data for the short-lived signed token."""
    try:
        token_data = _original._verify_checkout_token(token)
    except ValueError as exc:
        raise HTTPException(401, "Invalid or expired checkout token") from exc

    try:
        business_id = int(token_data["business_id"])
        owner_id = int(token_data["owner_telegram_id"])
    except (KeyError, TypeError, ValueError) as exc:
        raise HTTPException(401, "Invalid checkout token payload") from exc

    with _original.SessionLocal() as db:
        business = db.get(
            _original.Business,
            business_id,
        )

        if not business or int(business.owner_telegram_id) != owner_id:
            raise HTTPException(403, "Checkout token does not match business")

        trial_available = _original._trial_available_for_profile(
            db,
            owner_id,
        )
        db.commit()

    return {
        "environment": _original.PADDLE_ENV,
        "client_token": _public_client_token(),
        "app_url": os.getenv("PUBLIC_APP_URL", "").strip(),
        "bot_username": os.getenv("BOT_USERNAME", "BooklyBot").strip(),
        "business_id": business_id,
        "business_name": business.name,
        "trial_available": trial_available,
        "monthly": {
            "base": _original.PRICE_IDS[10],
            "no_trial_base": _original.NO_TRIAL_BASE_PRICE_ID,
            "addons": _public_monthly_prices(),
        },
        "yearly": {
            "base": ANNUAL_PRICE_IDS[10],
            # Kept equal to the annual base for compatibility with the current
            # external page. Yearly pricing itself never depends on trial state.
            "no_trial_base": ANNUAL_PRICE_IDS[10],
            "addons": _public_annual_prices(),
        },
    }


@app.get("/payments/external/price")
def external_price(
    token: str,
    billing: str = "month",
    limit: int = 10,
):
    """Return the combined external-plan price from Paddle."""
    if limit not in {10, 20, 30, 50, 100}:
        raise HTTPException(400, "Недопустимый лимит услуг")

    try:
        token_data = _original._verify_checkout_token(token)
    except ValueError as exc:
        raise HTTPException(401, "Invalid or expired checkout token") from exc

    try:
        business_id = int(token_data["business_id"])
        owner_id = int(token_data["owner_telegram_id"])
    except (KeyError, TypeError, ValueError) as exc:
        raise HTTPException(401, "Invalid checkout token payload") from exc

    with _original.SessionLocal() as db:
        business = db.get(
            _original.Business,
            business_id,
        )
        if not business or int(business.owner_telegram_id) != owner_id:
            raise HTTPException(403, "Checkout token does not match business")

        trial_available = _original._trial_available_for_profile(
            db,
            owner_id,
        )
        db.commit()

    base_id = _price_id_for_selection(
        billing,
        10,
        trial_available,
    )

    item_price_ids = [base_id]
    if limit != 10:
        item_price_ids.append(
            _price_id_for_selection(
                billing,
                limit,
                trial_available,
            )
        )

    total_minor = 0
    currency_code = "USD"

    for price_id in item_price_ids:
        response = _original._paddle_request(
            "GET",
            f"/prices/{price_id}",
        )
        data = response.get("data") or {}
        unit_price = data.get("unit_price") or {}
        total_minor += int(unit_price.get("amount") or 0)
        currency_code = str(
            data.get("currency_code")
            or currency_code
        )

    return {
        "billing": billing.lower(),
        "limit": limit,
        "amount": total_minor,
        "currency_code": currency_code,
        "trial_available": trial_available,
    }
