from __future__ import annotations

from fastapi import Header, HTTPException
from pydantic import BaseModel, Field

from .account_routes import _account_from_header
from .app import Base, Business, SessionLocal, app, engine


class BusinessSetupIn(BaseModel):
    name: str = Field(min_length=2, max_length=120)
    description: str = Field(default="", max_length=500)
    phone: str = Field(default="", max_length=40)
    address: str = Field(default="", max_length=255)
    timezone: str = Field(default="Asia/Tashkent", max_length=64)


@app.get("/account/business-setup")
def get_business_setup(authorization: str = Header(default="")):
    with SessionLocal() as db:
        account = _account_from_header(db, authorization)
        business = db.get(Business, account.business_id) if account.business_id else None
        if not business:
            raise HTTPException(404, "Bookly business not found")
        return {
            "ok": True,
            "business": {
                "id": business.id,
                "name": business.name,
                "description": business.description or "",
                "phone": business.phone or "",
                "address": business.address or "",
                "timezone": business.timezone or "Asia/Tashkent",
                "slug": business.slug,
            },
        }


@app.put("/account/business-setup")
def save_business_setup(
    x: BusinessSetupIn,
    authorization: str = Header(default=""),
):
    with SessionLocal() as db:
        account = _account_from_header(db, authorization)
        business = db.get(Business, account.business_id) if account.business_id else None
        if not business:
            raise HTTPException(404, "Bookly business not found")

        business.name = x.name.strip()
        business.description = x.description.strip()
        business.phone = x.phone.strip()
        business.address = x.address.strip()
        business.timezone = x.timezone.strip() or "Asia/Tashkent"
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
                "slug": business.slug,
            },
        }
