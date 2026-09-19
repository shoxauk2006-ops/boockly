from __future__ import annotations

import hashlib
import os
import secrets
from datetime import datetime, timedelta
from typing import Optional

from fastapi import Header, HTTPException
from pydantic import BaseModel, Field
from sqlalchemy import DateTime, Integer, String
from sqlalchemy.orm import Mapped, mapped_column

from .app import (
    Base,
    Booking,
    Business,
    Service,
    SessionLocal,
    Specialist,
    SpecialistService,
    SpecialistWorkingHour,
    app,
    engine,
    owner_business,
    telegram_user,
)


class SpecialistTelegramLink(Base):
    __tablename__ = "specialist_telegram_links"

    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    token_hash: Mapped[str] = mapped_column(String(64), unique=True, index=True)
    specialist_id: Mapped[int] = mapped_column(Integer, index=True)
    business_id: Mapped[int] = mapped_column(Integer, index=True)
    expires_at: Mapped[datetime] = mapped_column(DateTime, index=True)
    used_at: Mapped[datetime | None] = mapped_column(DateTime, nullable=True)
    created_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow)


Base.metadata.create_all(engine)


class SpecialistIn(BaseModel):
    name: str = Field(min_length=1, max_length=120)
    position: str = Field(default="", max_length=120)
    description: str = Field(default="", max_length=500)
    photo: str = Field(default="", max_length=4_000_000)
    active: bool = True
    service_ids: list[int] = Field(default_factory=list)


class SpecialistHourIn(BaseModel):
    weekday: int = Field(ge=0, le=6)
    start: str
    end: str
    active: bool = True


def _selected_business(
    db,
    telegram_id: int,
    business_header: str,
) -> Business:
    selected_id: Optional[int] = None
    try:
        if business_header:
            selected_id = int(business_header)
    except (TypeError, ValueError):
        selected_id = None

    business = owner_business(
        db,
        telegram_id,
        selected_id,
    )
    if not business:
        raise HTTPException(403, "Business owner access required")
    return business


def _serialize_specialist(db, specialist: Specialist) -> dict:
    service_ids = [
        int(row[0])
        for row in (
            db.query(SpecialistService.service_id)
            .filter(SpecialistService.specialist_id == specialist.id)
            .order_by(SpecialistService.service_id.asc())
            .all()
        )
    ]

    working_hours = [
        {
            "id": row.id,
            "weekday": row.weekday,
            "start": row.start.strftime("%H:%M"),
            "end": row.end.strftime("%H:%M"),
            "active": bool(row.active),
        }
        for row in (
            db.query(SpecialistWorkingHour)
            .filter(SpecialistWorkingHour.specialist_id == specialist.id)
            .order_by(SpecialistWorkingHour.weekday.asc(), SpecialistWorkingHour.start.asc())
            .all()
        )
    ]

    return {
        "id": specialist.id,
        "business_id": specialist.business_id,
        "name": specialist.name,
        "position": specialist.position or "",
        "description": specialist.description or "",
        "photo": specialist.photo or "",
        "active": bool(specialist.active),
        "service_ids": service_ids,
        "working_hours": working_hours,
        "telegram_connected": bool(specialist.telegram_user_id),
        "telegram_user_id": specialist.telegram_user_id,
        "notifications_enabled": bool(specialist.notifications_enabled),
    }


def _replace_services(
    db,
    specialist: Specialist,
    service_ids: list[int],
) -> None:
    ids = sorted(set(int(x) for x in service_ids))
    if ids:
        valid = {
            int(row[0])
            for row in (
                db.query(Service.id)
                .filter(
                    Service.business_id == specialist.business_id,
                    Service.id.in_(ids),
                )
                .all()
            )
        }
        if valid != set(ids):
            raise HTTPException(400, "One or more services do not belong to this business")

    db.query(SpecialistService).filter(
        SpecialistService.specialist_id == specialist.id
    ).delete(synchronize_session=False)

    for service_id in ids:
        db.add(
            SpecialistService(
                specialist_id=specialist.id,
                service_id=service_id,
            )
        )


@app.get("/admin/specialists")
def admin_specialists(
    x_telegram_init_data: str = Header(default=""),
    x_bookly_business_id: str = Header(default=""),
):
    user = telegram_user(x_telegram_init_data)
    with SessionLocal() as db:
        business = _selected_business(
            db,
            int(user["id"]),
            x_bookly_business_id,
        )
        rows = (
            db.query(Specialist)
            .filter(Specialist.business_id == business.id)
            .order_by(Specialist.id.asc())
            .all()
        )
        return [_serialize_specialist(db, item) for item in rows]


@app.post("/admin/specialists")
def admin_create_specialist(
    x: SpecialistIn,
    x_telegram_init_data: str = Header(default=""),
    x_bookly_business_id: str = Header(default=""),
):
    user = telegram_user(x_telegram_init_data)
    with SessionLocal() as db:
        business = _selected_business(
            db,
            int(user["id"]),
            x_bookly_business_id,
        )
        specialist = Specialist(
            business_id=business.id,
            name=x.name.strip(),
            position=x.position.strip(),
            description=x.description.strip(),
            photo=x.photo,
            active=x.active,
            notifications_enabled=True,
        )
        db.add(specialist)
        db.flush()
        _replace_services(db, specialist, x.service_ids)
        db.commit()
        db.refresh(specialist)
        return _serialize_specialist(db, specialist)


@app.patch("/admin/specialists/{specialist_id}")
def admin_update_specialist(
    specialist_id: int,
    x: SpecialistIn,
    x_telegram_init_data: str = Header(default=""),
    x_bookly_business_id: str = Header(default=""),
):
    user = telegram_user(x_telegram_init_data)
    with SessionLocal() as db:
        business = _selected_business(
            db,
            int(user["id"]),
            x_bookly_business_id,
        )
        specialist = (
            db.query(Specialist)
            .filter(
                Specialist.id == specialist_id,
                Specialist.business_id == business.id,
            )
            .first()
        )
        if not specialist:
            raise HTTPException(404, "Specialist not found")

        specialist.name = x.name.strip()
        specialist.position = x.position.strip()
        specialist.description = x.description.strip()
        specialist.photo = x.photo
        specialist.active = x.active
        _replace_services(db, specialist, x.service_ids)
        db.commit()
        db.refresh(specialist)
        return _serialize_specialist(db, specialist)


@app.delete("/admin/specialists/{specialist_id}")
def admin_delete_specialist(
    specialist_id: int,
    x_telegram_init_data: str = Header(default=""),
    x_bookly_business_id: str = Header(default=""),
):
    user = telegram_user(x_telegram_init_data)
    with SessionLocal() as db:
        business = _selected_business(
            db,
            int(user["id"]),
            x_bookly_business_id,
        )
        specialist = (
            db.query(Specialist)
            .filter(
                Specialist.id == specialist_id,
                Specialist.business_id == business.id,
            )
            .first()
        )
        if not specialist:
            raise HTTPException(404, "Specialist not found")

        # Keep historical bookings valid if a team member is removed.
        db.query(Booking).filter(
            Booking.specialist_id == specialist.id
        ).update(
            {Booking.specialist_id: None},
            synchronize_session=False,
        )
        db.query(SpecialistService).filter(
            SpecialistService.specialist_id == specialist.id
        ).delete(synchronize_session=False)
        db.query(SpecialistWorkingHour).filter(
            SpecialistWorkingHour.specialist_id == specialist.id
        ).delete(synchronize_session=False)
        db.query(SpecialistTelegramLink).filter(
            SpecialistTelegramLink.specialist_id == specialist.id
        ).delete(synchronize_session=False)
        db.delete(specialist)
        db.commit()
        return {"ok": True}


@app.put("/admin/specialists/{specialist_id}/working-hours")
def admin_specialist_working_hours(
    specialist_id: int,
    hours: list[SpecialistHourIn],
    x_telegram_init_data: str = Header(default=""),
    x_bookly_business_id: str = Header(default=""),
):
    from datetime import time as time_value

    user = telegram_user(x_telegram_init_data)
    with SessionLocal() as db:
        business = _selected_business(
            db,
            int(user["id"]),
            x_bookly_business_id,
        )
        specialist = (
            db.query(Specialist)
            .filter(
                Specialist.id == specialist_id,
                Specialist.business_id == business.id,
            )
            .first()
        )
        if not specialist:
            raise HTTPException(404, "Specialist not found")

        db.query(SpecialistWorkingHour).filter(
            SpecialistWorkingHour.specialist_id == specialist.id
        ).delete(synchronize_session=False)

        for item in hours:
            try:
                sh, sm = [int(part) for part in item.start.split(":", 1)]
                eh, em = [int(part) for part in item.end.split(":", 1)]
                start = time_value(sh, sm)
                end = time_value(eh, em)
            except Exception:
                raise HTTPException(400, "Invalid specialist working hours")

            if start >= end:
                raise HTTPException(400, "Working hour start must be before end")

            db.add(
                SpecialistWorkingHour(
                    specialist_id=specialist.id,
                    weekday=item.weekday,
                    start=start,
                    end=end,
                    active=item.active,
                )
            )

        db.commit()
        return {"ok": True}


@app.post("/admin/specialists/{specialist_id}/telegram-link")
def admin_specialist_telegram_link(
    specialist_id: int,
    x_telegram_init_data: str = Header(default=""),
    x_bookly_business_id: str = Header(default=""),
):
    user = telegram_user(x_telegram_init_data)
    with SessionLocal() as db:
        business = _selected_business(
            db,
            int(user["id"]),
            x_bookly_business_id,
        )
        specialist = (
            db.query(Specialist)
            .filter(
                Specialist.id == specialist_id,
                Specialist.business_id == business.id,
            )
            .first()
        )
        if not specialist:
            raise HTTPException(404, "Specialist not found")

        raw = secrets.token_urlsafe(24)
        db.add(
            SpecialistTelegramLink(
                token_hash=hashlib.sha256(raw.encode("utf-8")).hexdigest(),
                specialist_id=specialist.id,
                business_id=business.id,
                expires_at=datetime.utcnow() + timedelta(hours=24),
            )
        )
        db.commit()

        prefix = "staff-connect-"
        start_parameter = prefix + raw
        if len(start_parameter) > 64:
            raise HTTPException(500, "Telegram staff connection parameter is too long")

        bot_username = os.getenv("BOT_USERNAME", "Boockly_bot").lstrip("@").strip()
        return {
            "ok": True,
            "specialist_id": specialist.id,
            "telegram_url": f"https://t.me/{bot_username}?startapp={start_parameter}",
            "expires_in": 86400,
        }


@app.delete("/admin/specialists/{specialist_id}/telegram")
def admin_disconnect_specialist_telegram(
    specialist_id: int,
    x_telegram_init_data: str = Header(default=""),
    x_bookly_business_id: str = Header(default=""),
):
    user = telegram_user(x_telegram_init_data)
    with SessionLocal() as db:
        business = _selected_business(
            db,
            int(user["id"]),
            x_bookly_business_id,
        )
        specialist = (
            db.query(Specialist)
            .filter(
                Specialist.id == specialist_id,
                Specialist.business_id == business.id,
            )
            .first()
        )
        if not specialist:
            raise HTTPException(404, "Specialist not found")

        specialist.telegram_user_id = None
        specialist.telegram_connected_at = None
        db.commit()
        return {"ok": True}


@app.post("/staff/connect")
def staff_connect(
    token: str,
    x_telegram_init_data: str = Header(default=""),
):
    user = telegram_user(x_telegram_init_data)
    telegram_id = int(user["id"])

    prefix = "staff-connect-"
    if not token.startswith(prefix):
        raise HTTPException(400, "Invalid staff connection token")

    raw = token[len(prefix):]
    token_hash = hashlib.sha256(raw.encode("utf-8")).hexdigest()

    with SessionLocal() as db:
        # Look up the token first without filtering on used_at. Telegram Mini Apps
        # can initialize the same start parameter more than once (for example
        # after a WebView reload). Replaying a token from the *same* Telegram
        # account should therefore be harmless instead of showing an error.
        link = (
            db.query(SpecialistTelegramLink)
            .filter(SpecialistTelegramLink.token_hash == token_hash)
            .first()
        )
        if not link:
            raise HTTPException(400, "Staff connection link is invalid or expired")

        specialist = db.get(Specialist, link.specialist_id)
        business = db.get(Business, link.business_id)
        if (
            not specialist
            or not business
            or specialist.business_id != business.id
        ):
            raise HTTPException(404, "Staff member not found")

        if link.used_at is not None:
            if specialist.telegram_user_id != telegram_id:
                raise HTTPException(400, "Staff connection link is invalid or expired")
            return {
                "ok": True,
                "business_id": business.id,
                "specialist_id": specialist.id,
                "specialist_name": specialist.name,
                "business_name": business.name,
                "next": "staff_workspace",
                "already_connected": True,
            }

        if link.expires_at <= datetime.utcnow():
            raise HTTPException(400, "Staff connection link is invalid or expired")

        specialist.telegram_user_id = telegram_id
        specialist.telegram_connected_at = datetime.utcnow()
        specialist.notifications_enabled = True
        link.used_at = datetime.utcnow()
        db.commit()

        return {
            "ok": True,
            "business_id": business.id,
            "specialist_id": specialist.id,
            "specialist_name": specialist.name,
            "business_name": business.name,
            "next": "staff_workspace",
            "already_connected": False,
        }


def _staff_memberships(db, telegram_id: int):
    return (
        db.query(Specialist, Business)
        .join(Business, Business.id == Specialist.business_id)
        .filter(
            Specialist.telegram_user_id == telegram_id,
            Specialist.active == True,
        )
        .order_by(Business.name.asc(), Specialist.name.asc())
        .all()
    )


@app.get("/staff/me")
def staff_me(
    x_telegram_init_data: str = Header(default=""),
):
    user = telegram_user(x_telegram_init_data)
    telegram_id = int(user["id"])

    with SessionLocal() as db:
        rows = _staff_memberships(db, telegram_id)
        return {
            "ok": True,
            "memberships": [
                {
                    "specialist_id": specialist.id,
                    "specialist_name": specialist.name,
                    "position": specialist.position or "",
                    "business_id": business.id,
                    "business_name": business.name,
                    "business_timezone": business.timezone or "Asia/Tashkent",
                    "notifications_enabled": bool(specialist.notifications_enabled),
                }
                for specialist, business in rows
            ],
        }


def _require_staff(
    db,
    telegram_id: int,
    specialist_id: int,
) -> Specialist:
    specialist = (
        db.query(Specialist)
        .filter(
            Specialist.id == specialist_id,
            Specialist.telegram_user_id == telegram_id,
            Specialist.active == True,
        )
        .first()
    )
    if not specialist:
        raise HTTPException(403, "Staff access required")
    return specialist


@app.get("/staff/bookings")
def staff_bookings(
    specialist_id: int,
    x_telegram_init_data: str = Header(default=""),
):
    user = telegram_user(x_telegram_init_data)
    telegram_id = int(user["id"])

    with SessionLocal() as db:
        specialist = _require_staff(
            db,
            telegram_id,
            specialist_id,
        )

        rows = (
            db.query(Booking, Service, Business)
            .join(Service, Service.id == Booking.service_id)
            .join(Business, Business.id == Booking.business_id)
            .filter(
                Booking.specialist_id == specialist.id,
                Booking.status == "confirmed",
            )
            .order_by(Booking.day.asc(), Booking.start.asc())
            .limit(100)
            .all()
        )

        return [
            {
                "id": booking.id,
                "business_id": booking.business_id,
                "business_name": business.name,
                "service_id": booking.service_id,
                "service_name": service.name,
                "specialist_id": specialist.id,
                "client_name": booking.client_name,
                "client_phone": booking.client_phone,
                "day": booking.day.isoformat(),
                "start": booking.start.strftime("%H:%M"),
                "end": booking.end.strftime("%H:%M"),
                "start_at_utc": booking.start_at_utc.isoformat() if booking.start_at_utc else None,
                "end_at_utc": booking.end_at_utc.isoformat() if booking.end_at_utc else None,
                "business_timezone": business.timezone or "Asia/Tashkent",
                "status": booking.status,
            }
            for booking, service, business in rows
        ]


@app.get("/staff/working-hours")
def staff_working_hours(
    specialist_id: int,
    x_telegram_init_data: str = Header(default=""),
):
    user = telegram_user(x_telegram_init_data)
    telegram_id = int(user["id"])

    with SessionLocal() as db:
        specialist = _require_staff(
            db,
            telegram_id,
            specialist_id,
        )
        rows = (
            db.query(SpecialistWorkingHour)
            .filter(
                SpecialistWorkingHour.specialist_id == specialist.id,
                SpecialistWorkingHour.active == True,
            )
            .order_by(
                SpecialistWorkingHour.weekday.asc(),
                SpecialistWorkingHour.start.asc(),
            )
            .all()
        )
        return [
            {
                "weekday": row.weekday,
                "start": row.start.strftime("%H:%M"),
                "end": row.end.strftime("%H:%M"),
                "active": bool(row.active),
            }
            for row in rows
        ]
