from typing import Optional

from fastapi import APIRouter, Header, HTTPException
from pydantic import BaseModel, Field
from sqlalchemy import delete, select

from app import (
    SessionLocal,
    Business,
    Service,
    Specialist,
    SpecialistService,
    SpecialistWorkingHour,
    telegram_user,
)

router = APIRouter(prefix="/admin/specialists", tags=["specialists"])


class SpecialistIn(BaseModel):
    name: str = Field(min_length=1, max_length=120)
    position: str = Field(default="", max_length=120)
    description: str = Field(default="", max_length=500)
    photo: str = Field(default="", max_length=500000)
    active: bool = True
    service_ids: list[int] = Field(default_factory=list)


class SpecialistUpdate(BaseModel):
    name: Optional[str] = Field(default=None, min_length=1, max_length=120)
    position: Optional[str] = Field(default=None, max_length=120)
    description: Optional[str] = Field(default=None, max_length=500)
    photo: Optional[str] = Field(default=None, max_length=500000)
    active: Optional[bool] = None
    service_ids: Optional[list[int]] = None


class SpecialistWorkingHourIn(BaseModel):
    weekday: int = Field(ge=0, le=6)
    start: str
    end: str
    active: bool = True


class SpecialistResponse(BaseModel):
    id: int
    business_id: int
    name: str
    position: str
    description: str
    photo: str
    active: bool
    service_ids: list[int]
    working_hours: list[dict]


def _owner_business(db, telegram_id: int, business_id: int) -> Business:
    business = db.scalar(
        select(Business).where(
            Business.id == business_id,
            Business.owner_telegram_id == telegram_id,
        )
    )
    if business is None:
        raise HTTPException(404, "Business not found")
    return business


def _get_business_id(db, telegram_id: int) -> int:
    business = db.scalar(
        select(Business)
        .where(Business.owner_telegram_id == telegram_id)
        .order_by(Business.id.asc())
    )
    if business is None:
        raise HTTPException(404, "Business not found")
    return business.id


def _validate_service_ids(db, business_id: int, service_ids: list[int]) -> list[int]:
    unique_ids = list(dict.fromkeys(int(value) for value in service_ids))
    if not unique_ids:
        return []
    rows = db.scalars(
        select(Service.id).where(
            Service.business_id == business_id,
            Service.id.in_(unique_ids),
        )
    ).all()
    found = {int(value) for value in rows}
    if found != set(unique_ids):
        raise HTTPException(400, "One or more services do not belong to this business")
    return unique_ids


def _parse_time(value: str):
    from datetime import time
    try:
        return time.fromisoformat(value.strip())
    except ValueError:
        raise HTTPException(400, "Invalid time format; use HH:MM")


def _serialize(db, specialist: Specialist) -> dict:
    service_ids = [
        int(value)
        for value in db.scalars(
            select(SpecialistService.service_id).where(
                SpecialistService.specialist_id == specialist.id
            )
        ).all()
    ]
    hours = db.scalars(
        select(SpecialistWorkingHour)
        .where(SpecialistWorkingHour.specialist_id == specialist.id)
        .order_by(SpecialistWorkingHour.weekday, SpecialistWorkingHour.start)
    ).all()
    return {
        "id": specialist.id,
        "business_id": specialist.business_id,
        "name": specialist.name,
        "position": specialist.position or "",
        "description": specialist.description or "",
        "photo": specialist.photo or "",
        "active": bool(specialist.active),
        "service_ids": service_ids,
        "working_hours": [
            {
                "id": hour.id,
                "weekday": hour.weekday,
                "start": hour.start.strftime("%H:%M"),
                "end": hour.end.strftime("%H:%M"),
                "active": bool(hour.active),
            }
            for hour in hours
        ],
    }


@router.get("")
def list_specialists(x_telegram_init_data: str = Header(default="")):
    user = telegram_user(x_telegram_init_data)
    telegram_id = int(user["id"])
    with SessionLocal() as db:
        business_id = _get_business_id(db, telegram_id)
        specialists = db.scalars(
            select(Specialist)
            .where(Specialist.business_id == business_id)
            .order_by(Specialist.id.asc())
        ).all()
        return [_serialize(db, specialist) for specialist in specialists]


@router.post("", status_code=201)
def create_specialist(
    payload: SpecialistIn,
    x_telegram_init_data: str = Header(default=""),
):
    user = telegram_user(x_telegram_init_data)
    telegram_id = int(user["id"])
    with SessionLocal() as db:
        business_id = _get_business_id(db, telegram_id)
        service_ids = _validate_service_ids(db, business_id, payload.service_ids)
        specialist = Specialist(
            business_id=business_id,
            name=payload.name.strip(),
            position=payload.position.strip(),
            description=payload.description.strip(),
            photo=payload.photo.strip(),
            active=payload.active,
        )
        db.add(specialist)
        db.flush()
        for service_id in service_ids:
            db.add(SpecialistService(specialist_id=specialist.id, service_id=service_id))
        db.commit()
        db.refresh(specialist)
        return _serialize(db, specialist)


@router.patch("/{specialist_id}")
def update_specialist(
    specialist_id: int,
    payload: SpecialistUpdate,
    x_telegram_init_data: str = Header(default=""),
):
    user = telegram_user(x_telegram_init_data)
    telegram_id = int(user["id"])
    with SessionLocal() as db:
        business_id = _get_business_id(db, telegram_id)
        specialist = db.scalar(
            select(Specialist).where(
                Specialist.id == specialist_id,
                Specialist.business_id == business_id,
            )
        )
        if specialist is None:
            raise HTTPException(404, "Specialist not found")

        data = payload.model_dump(exclude_unset=True)
        service_ids = data.pop("service_ids", None)
        for key, value in data.items():
            if isinstance(value, str):
                value = value.strip()
            setattr(specialist, key, value)

        if service_ids is not None:
            service_ids = _validate_service_ids(db, business_id, service_ids)
            db.execute(
                delete(SpecialistService).where(
                    SpecialistService.specialist_id == specialist.id
                )
            )
            for service_id in service_ids:
                db.add(SpecialistService(specialist_id=specialist.id, service_id=service_id))

        db.commit()
        db.refresh(specialist)
        return _serialize(db, specialist)


@router.delete("/{specialist_id}")
def delete_specialist(
    specialist_id: int,
    x_telegram_init_data: str = Header(default=""),
):
    user = telegram_user(x_telegram_init_data)
    telegram_id = int(user["id"])
    with SessionLocal() as db:
        business_id = _get_business_id(db, telegram_id)
        specialist = db.scalar(
            select(Specialist).where(
                Specialist.id == specialist_id,
                Specialist.business_id == business_id,
            )
        )
        if specialist is None:
            raise HTTPException(404, "Specialist not found")

        db.execute(delete(SpecialistService).where(SpecialistService.specialist_id == specialist.id))
        db.execute(delete(SpecialistWorkingHour).where(SpecialistWorkingHour.specialist_id == specialist.id))
        db.delete(specialist)
        db.commit()
        return {"ok": True}


@router.put("/{specialist_id}/working-hours")
def replace_specialist_working_hours(
    specialist_id: int,
    payload: list[SpecialistWorkingHourIn],
    x_telegram_init_data: str = Header(default=""),
):
    user = telegram_user(x_telegram_init_data)
    telegram_id = int(user["id"])
    with SessionLocal() as db:
        business_id = _get_business_id(db, telegram_id)
        specialist = db.scalar(
            select(Specialist).where(
                Specialist.id == specialist_id,
                Specialist.business_id == business_id,
            )
        )
        if specialist is None:
            raise HTTPException(404, "Specialist not found")

        db.execute(delete(SpecialistWorkingHour).where(SpecialistWorkingHour.specialist_id == specialist.id))
        for item in payload:
            start = _parse_time(item.start)
            end = _parse_time(item.end)
            if start >= end:
                raise HTTPException(400, "Working hour end must be after start")
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
        db.refresh(specialist)
        return _serialize(db, specialist)

