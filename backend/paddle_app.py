from __future__ import annotations

import contextvars
import os
from . import paddle_original as _original

app = _original.app
_event_context = contextvars.ContextVar("bookly_paddle_event_context", default=None)
_original_sync = _original._sync_business_from_subscription
_original_apply = _original._apply_paddle_event
_original_limit_from_items = _original._limit_from_items


def _limit_from_items(items) -> int:
    no_trial_base = str(
        getattr(_original, "NO_TRIAL_BASE_PRICE_ID", "")
        or ""
    ).strip()

    if no_trial_base:
        addon_price_to_limit = {
            _original.PRICE_IDS[20]: 20,
            _original.PRICE_IDS[30]: 30,
            _original.PRICE_IDS[50]: 50,
            _original.PRICE_IDS[100]: 100,
        }

        base_price_ids = {
            str(_original.PRICE_IDS[10] or "").strip(),
            no_trial_base,
        }
        base_price_ids.discard("")

        detected_base = set()
        detected_addons = set()

        for item in items or []:
            price = item.get("price") or {}
            price_id = str(
                item.get("price_id")
                or price.get("id")
                or ""
            ).strip()

            if price_id in base_price_ids:
                detected_base.add(price_id)
            if price_id in addon_price_to_limit:
                detected_addons.add(price_id)

        if len(detected_base) == 1 and not detected_addons:
            return 10

        if len(detected_base) == 1 and len(detected_addons) == 1:
            return addon_price_to_limit[next(iter(detected_addons))]

    return _original_limit_from_items(items)


def _sync_business_from_subscription(business, subscription) -> None:
    _original_sync(business, subscription)
    event_context = _event_context.get()
    if not event_context:
        return
    event_type = event_context.get("event_type")
    scheduled_action = event_context.get("scheduled_action")
    if event_type == "subscription.updated" and scheduled_action == "cancel":
        subscription.status = "cancelled"
        subscription.active = True
        business.subscription_status = "cancelled"
        business.subscription_active = True
    elif event_type == "subscription.updated" and scheduled_action == "resume":
        subscription.cancel_at = None
        business.subscription_status = subscription.status or "active"
    elif event_type == "subscription.resumed":
        subscription.cancel_at = None
        business.subscription_status = subscription.status or "active"


def _apply_paddle_event(payload: dict) -> None:
    data = payload.get("data") or {}
    scheduled_change = data.get("scheduled_change") or {}
    context = {
        "event_type": str(payload.get("event_type") or ""),
        "scheduled_action": str(scheduled_change.get("action") or ""),
    }
    token = _event_context.set(context)
    try:
        return _original_apply(payload)
    finally:
        _event_context.reset(token)

_original._limit_from_items = _limit_from_items
_original._sync_business_from_subscription = _sync_business_from_subscription
_original._apply_paddle_event = _apply_paddle_event
