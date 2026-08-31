from __future__ import annotations

import contextvars

from . import paddle_original as _original

app = _original.app

_event_context = contextvars.ContextVar("bookly_paddle_event_context", default=None)
_original_sync = _original._sync_business_from_subscription
_original_apply = _original._apply_paddle_event


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


_original._sync_business_from_subscription = _sync_business_from_subscription
_original._apply_paddle_event = _apply_paddle_event
