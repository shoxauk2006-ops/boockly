import os
import json
import hmac
import hashlib
import secrets
from datetime import date, time, datetime, timedelta
from decimal import Decimal
from typing import Optional
from contextvars import ContextVar
from urllib.parse import parse_qsl
from urllib import request as urllib_request
from urllib.error import URLError

from fastapi import FastAPI, HTTPException, Header, Request
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel, Field
from sqlalchemy import (
    create_engine,
    String,
    Integer,
    BigInteger,
    Boolean,
    Date,
    Time,
    DateTime,
    ForeignKey,
    Numeric
)
from sqlalchemy.orm import DeclarativeBase, Mapped, mapped_column, sessionmaker

BASE_DIR = os.path.dirname(os.path.abspath(__file__))
DB_URL = os.getenv("DATABASE_URL", f"sqlite:///{os.path.join(BASE_DIR, '..', 'data', 'app.db')}")
os.makedirs(os.path.join(BASE_DIR, '..', 'data'), exist_ok=True)
engine = create_engine(DB_URL, connect_args={"check_same_thread": False} if DB_URL.startswith("sqlite") else {})
SessionLocal = sessionmaker(bind=engine, expire_on_commit=False)
BOT_TOKEN = os.getenv("BOT_TOKEN", "")

BOOKLY_REQUEST_LANGUAGE: ContextVar[Optional[str]] = ContextVar("BOOKLY_REQUEST_LANGUAGE", default=None)

class Base(DeclarativeBase): pass

class Business(Base):
    __tablename__ = "businesses"

    id: Mapped[int] = mapped_column(
        Integer,
        primary_key=True
    )

    owner_telegram_id: Mapped[int] = mapped_column(
        BigInteger,
        index=True
    )

    name: Mapped[str] = mapped_column(
        String(120)
    )

    description: Mapped[str] = mapped_column(
        String(500),
        default=""
    )

    address: Mapped[str] = mapped_column(
        String(255),
        default=""
    )

    phone: Mapped[str] = mapped_column(
        String(40),
        default=""
    )

    latitude: Mapped[Optional[float]] = mapped_column(
        nullable=True
    )

    longitude: Mapped[Optional[float]] = mapped_column(
        nullable=True
    )

    slug: Mapped[str] = mapped_column(
        String(80),
        unique=True,
        index=True
    )

    subscription_active: Mapped[bool] = mapped_column(
        Boolean,
        default=False
    )

    subscription_expires_at: Mapped[Optional[datetime]] = mapped_column(
        DateTime,
        nullable=True
    )

    subscription_status: Mapped[str] = mapped_column(
        String(30),
        default="inactive"
    )

    payment_provider: Mapped[str] = mapped_column(
        String(30),
        default=""
    )

    external_subscription_id: Mapped[str] = mapped_column(
        String(120),
        default=""
    )

    payment_method_url: Mapped[str] = mapped_column(
        String(1000),
        default=""
    )

class SavedBusiness(Base):
    __tablename__ = "saved_businesses"

    id: Mapped[int] = mapped_column(
        Integer,
        primary_key=True
    )

    telegram_user_id: Mapped[int] = mapped_column(
        BigInteger,
        index=True
    )

    business_id: Mapped[int] = mapped_column(
        ForeignKey("businesses.id"),
        index=True
    )

    created_at: Mapped[datetime] = mapped_column(
        DateTime,
        default=datetime.utcnow
    )
    
class Service(Base):
    __tablename__ = "services"

    id: Mapped[int] = mapped_column(
        Integer,
        primary_key=True
    )

    business_id: Mapped[int] = mapped_column(
        ForeignKey("businesses.id"),
        index=True
    )

    name: Mapped[str] = mapped_column(
        String(120)
    )

    description: Mapped[str] = mapped_column(
        String(500),
        default=""
    )

    price: Mapped[Decimal] = mapped_column(
        Numeric(18, 3),
        default=Decimal("0")
    )

    currency: Mapped[str] = mapped_column(
        String(8),
        default="UZS"
    )

    duration_min: Mapped[int] = mapped_column(
        Integer
    )

    active: Mapped[bool] = mapped_column(
        Boolean,
        default=True
    )
class WorkingHour(Base):
    __tablename__ = "working_hours"
    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    business_id: Mapped[int] = mapped_column(ForeignKey("businesses.id"), index=True)
    weekday: Mapped[int] = mapped_column(Integer)
    start: Mapped[time] = mapped_column(Time)
    end: Mapped[time] = mapped_column(Time)
    active: Mapped[bool] = mapped_column(Boolean, default=True)

class BlockedSlot(Base):
    __tablename__ = "blocked_slots"
    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    business_id: Mapped[int] = mapped_column(ForeignKey("businesses.id"), index=True)
    day: Mapped[date] = mapped_column(Date)
    start: Mapped[time] = mapped_column(Time)
    end: Mapped[time] = mapped_column(Time)
    reason: Mapped[str] = mapped_column(String(255), default="")

class Booking(Base):
    __tablename__ = "bookings"

    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    business_id: Mapped[int] = mapped_column(ForeignKey("businesses.id"), index=True)
    service_id: Mapped[int] = mapped_column(ForeignKey("services.id"))

    client_telegram_id: Mapped[int] = mapped_column(BigInteger, index=True)
    client_name: Mapped[str] = mapped_column(String(120))
    client_phone: Mapped[str] = mapped_column(String(40), default="")

    day: Mapped[date] = mapped_column(Date)
    start: Mapped[time] = mapped_column(Time)
    end: Mapped[time] = mapped_column(Time)

    status: Mapped[str] = mapped_column(String(20), default="confirmed")
    created_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow)

    reminder_24_sent: Mapped[bool] = mapped_column(Boolean, default=False)
    reminder_2_sent: Mapped[bool] = mapped_column(Boolean, default=False)



class TelegramUserLanguage(Base):
    __tablename__ = "telegram_user_languages"
    telegram_user_id: Mapped[int] = mapped_column(BigInteger, primary_key=True)
    language: Mapped[str] = mapped_column(String(8), default="en")


def _bookly_normalize_language(value: str | None) -> str:
    value = (value or "").lower().replace("_", "-")
    if value.startswith("ru"): return "ru"
    if value.startswith("uz"): return "uz"
    if value.startswith("tr"): return "tr"
    if value.startswith("ar"): return "ar"
    return "en"


def _bookly_remember_language(user: dict, preferred_language: str | None = None) -> None:
    try:
        uid = int(user.get("id"))
    except (TypeError, ValueError):
        return
    lang = _bookly_normalize_language(preferred_language or user.get("language_code"))
    try:
        with SessionLocal() as db:
            row = db.get(TelegramUserLanguage, uid)
            if row is None:
                row = TelegramUserLanguage(telegram_user_id=uid, language=lang)
                db.add(row)
            else:
                row.language = lang
            db.commit()
    except Exception:
        pass


def _bookly_user_language(telegram_user_id: int) -> str:
    try:
        with SessionLocal() as db:
            row = db.get(TelegramUserLanguage, int(telegram_user_id))
            return _bookly_normalize_language(row.language if row else "en")
    except Exception:
        return "en"


_BOOKLY_NOTIFY_TEXT = {
  "ru": {
    "new": "Новая запись в Bookly", "phone_missing": "номер не передан", "cancelled_client": "Ваша запись отменена", "cancelled_business": "Запись отменена бизнесом", "client_booked": "Вы успешно записаны!", "contact_hint": "Пожалуйста, свяжитесь с бизнесом, если хотите выбрать другое время.", "waiting": "Ждём вас!", "client_cancelled": "Клиент отменил запись", "reminder24": "Напоминание о записи в Bookly", "reminder2": "Ваша запись сегодня в", "owner_reminder24": "Напоминание: запись",
  },
  "en": {
    "new": "New booking in Bookly", "phone_missing": "phone not provided", "cancelled_client": "Your booking has been cancelled", "cancelled_business": "Your booking was cancelled by the business", "client_booked": "You are successfully booked!", "contact_hint": "Please contact the business if you want to choose another time.", "waiting": "We look forward to seeing you!", "client_cancelled": "Client cancelled the booking", "reminder24": "Bookly booking reminder", "reminder2": "Your booking is today at", "owner_reminder24": "Reminder: booking",
  },
  "uz": {
    "new": "Bookly’da yangi bron", "phone_missing": "telefon berilmagan", "cancelled_client": "Broningiz bekor qilindi", "cancelled_business": "Bron biznes tomonidan bekor qilindi", "client_booked": "Siz muvaffaqiyatli bron qilindingiz!", "contact_hint": "Boshqa vaqt tanlamoqchi bo‘lsangiz, biznes bilan bog‘laning.", "waiting": "Sizni kutamiz!", "client_cancelled": "Mijoz bronni bekor qildi", "reminder24": "Bookly bron eslatmasi", "reminder2": "Bugungi broningiz vaqti", "owner_reminder24": "Eslatma: bron",
  },
  "tr": {
    "new": "Bookly’da yeni rezervasyon", "phone_missing": "telefon verilmedi", "cancelled_client": "Rezervasyonunuz iptal edildi", "cancelled_business": "Rezervasyon işletme tarafından iptal edildi", "client_booked": "Rezervasyonunuz başarıyla oluşturuldu!", "contact_hint": "Başka bir zaman seçmek istiyorsanız işletmeyle iletişime geçin.", "waiting": "Sizi bekliyoruz!", "client_cancelled": "Müşteri rezervasyonu iptal etti", "reminder24": "Bookly rezervasyon hatırlatması", "reminder2": "Bugünkü rezervasyon saatiniz", "owner_reminder24": "Hatırlatma: rezervasyon",
  },
  "ar": {
    "new": "حجز جديد في Bookly", "phone_missing": "رقم الهاتف غير متوفر", "cancelled_client": "تم إلغاء حجزك", "cancelled_business": "تم إلغاء الحجز من قبل النشاط", "client_booked": "تم حجز موعدك بنجاح!", "contact_hint": "يرجى التواصل مع النشاط إذا أردت اختيار وقت آخر.", "waiting": "ننتظركم!", "client_cancelled": "ألغى العميل الحجز", "reminder24": "تذكير بحجز Bookly", "reminder2": "موعد حجزك اليوم في", "owner_reminder24": "تذكير: الحجز",
  },
}


def _bookly_t(lang: str, key: str) -> str:
    return _BOOKLY_NOTIFY_TEXT[_bookly_normalize_language(lang)][key]


_BASE_TELEGRAM_USER = telegram_user

def telegram_user(x_init_data: str) -> dict:
    user = _BASE_TELEGRAM_USER(x_init_data)
    _bookly_remember_language(user)
    return user


_BASE_NOTIFY_OWNER_NEW_BOOKING = notify_owner_new_booking

def notify_owner_new_booking(db, booking, service):
    business = db.get(Business, booking.business_id)
    if not business:
        return
    lang = _bookly_user_language(business.owner_telegram_id)
    d = _BOOKLY_NOTIFY_TEXT[_bookly_normalize_language(lang)]
    text=(
        f"🔔 <b>{d['new']}</b>\n\n"
        f"👤 {booking.client_name}\n"
        f"📞 {booking.client_phone or d['phone_missing']}\n"
        f"💈 {service.name}\n"
        f"📅 {booking.day.isoformat()}\n"
        f"🕐 {booking.start.strftime('%H:%M')}–{booking.end.strftime('%H:%M')}\n"
        f"🆔 #{booking.id}"
    )
    telegram_api("sendMessage", {"chat_id":business.owner_telegram_id,"text":text,"parse_mode":"HTML"})


# Wrap direct Telegram messages in the existing routes so their fixed copy is localized too.
_BASE_TELEGRAM_API = telegram_api
def telegram_api(method: str, payload: dict):
    if method == "sendMessage" and isinstance(payload, dict):
        text = str(payload.get("text", ""))
        chat_id = payload.get("chat_id")
        if chat_id:
            lang = _bookly_user_language(int(chat_id))
            d = _BOOKLY_NOTIFY_TEXT[_bookly_normalize_language(lang)]
            replacements = [
              ("❌ <b>Ваша запись отменена</b>", f"❌ <b>{d['cancelled_client']}</b>"),
              ("Пожалуйста, свяжитесь с бизнесом, если хотите выбрать другое время.", d["contact_hint"]),
              ("✅ <b>Вы успешно записаны!</b>", f"✅ <b>{d['client_booked']}</b>"),
              ("Ждём вас!", d["waiting"]),
              ("❌ <b>Запись отменена</b>", f"❌ <b>{d['cancelled_client']}</b>"),
              ("❌ Ваша запись отменена бизнесом.", f"❌ {d['cancelled_business']}."),
              ("❌ <b>Клиент отменил запись</b>", f"❌ <b>{d['client_cancelled']}</b>"),
              ("номер не передан", d["phone_missing"]),
              ("номер не указан", d["phone_missing"]),
              ("Адрес не указан", {"ru":"Адрес не указан","en":"Address not provided","uz":"Manzil ko‘rsatilmagan","tr":"Adres belirtilmedi","ar":"العنوان غير متوفر"}[_bookly_normalize_language(lang)]),
              ("Ваш номер:", {"ru":"Ваш номер:","en":"Your number:","uz":"Raqamingiz:","tr":"Numaranız:","ar":"رقمك:"}[_bookly_normalize_language(lang)]),
              ("Связаться:", {"ru":"Связаться:","en":"Contact:","uz":"Bog‘lanish:","tr":"İletişim:","ar":"للتواصل:"}[_bookly_normalize_language(lang)]),
            ]
            for old, new in replacements:
                text = text.replace(old, new)
            payload = dict(payload)
            payload["text"] = text
    return _BASE_TELEGRAM_API(method, payload)


Base.metadata.create_all(engine)

Base.metadata.create_all(engine)
app = FastAPI(title="Bookly API", version="0.2.0")
ACTIVE_BUSINESS_ID: ContextVar[Optional[int]] = ContextVar(
    "ACTIVE_BUSINESS_ID",
    default=None
)


@app.middleware("http")
async def capture_active_business(
    request: Request,
    call_next
):
    raw_business_id = request.headers.get(
        "X-Bookly-Business-Id"
    )
    raw_language = request.headers.get("X-Bookly-Language")
    language_token = BOOKLY_REQUEST_LANGUAGE.set(_bookly_normalize_language(raw_language) if raw_language else None)


    business_id = None

    if raw_business_id:
        try:
            business_id = int(
                raw_business_id
            )
        except ValueError:
            business_id = None

    token = ACTIVE_BUSINESS_ID.set(
        business_id
    )

    try:
        response = await call_next(
            request
        )
        return response
    finally:
        ACTIVE_BUSINESS_ID.reset(
            token
        )
        BOOKLY_REQUEST_LANGUAGE.reset(language_token)
app.add_middleware(CORSMiddleware, allow_origins=["*"], allow_credentials=False, allow_methods=["*"], allow_headers=["*"])

# ---------- Telegram Mini App authentication ----------
def validate_init_data(init_data: str) -> dict:
    if not BOT_TOKEN:
        raise HTTPException(500, "BOT_TOKEN is not configured")
    try:
        pairs = dict(parse_qsl(init_data, keep_blank_values=True))
        received_hash = pairs.pop("hash", None)
        if not received_hash:
            raise ValueError("hash missing")
        data_check_string = "\n".join(f"{k}={pairs[k]}" for k in sorted(pairs))
        secret_key = hmac.new(b"WebAppData", BOT_TOKEN.encode(), hashlib.sha256).digest()
        calculated = hmac.new(secret_key, data_check_string.encode(), hashlib.sha256).hexdigest()
        if not hmac.compare_digest(calculated, received_hash):
            raise ValueError("invalid hash")
        auth_date = int(pairs.get("auth_date", "0"))
        if abs(int(datetime.utcnow().timestamp()) - auth_date) > 86400:
            raise ValueError("init data expired")
        user = json.loads(pairs.get("user", "{}"))
        return user
    except Exception as exc:
        raise HTTPException(401, f"Invalid Telegram initData: {exc}")

def telegram_user(x_init_data: str) -> dict:
    user = validate_init_data(x_init_data)
    _bookly_remember_language(user, BOOKLY_REQUEST_LANGUAGE.get())
    return user


def telegram_api(method: str, payload: dict):
    """Small synchronous Telegram Bot API helper; keeps the API service dependency-light."""
    if not BOT_TOKEN:
        return None
    data=json.dumps(payload).encode("utf-8")
    req=urllib_request.Request(
        f"https://api.telegram.org/bot{BOT_TOKEN}/{method}",
        data=data,
        headers={"Content-Type":"application/json"},
        method="POST",
    )
    try:
        with urllib_request.urlopen(req, timeout=8) as response:
            return json.loads(response.read().decode("utf-8"))
    except (URLError, TimeoutError, ValueError):
        return None


def notify_owner_new_booking(db, booking, service):
    business=db.get(Business, booking.business_id)
    if not business:
        return
    text=(
        "🔔 <b>Новая запись в Bookly</b>\n\n"
        f"👤 {booking.client_name}\n"
        f"📞 {booking.client_phone or 'номер не передан'}\n"
        f"💈 {service.name}\n"
        f"📅 {booking.day.isoformat()}\n"
        f"🕐 {booking.start.strftime('%H:%M')}–{booking.end.strftime('%H:%M')}\n"
        f"🆔 #{booking.id}"
    )
    telegram_api("sendMessage", {"chat_id":business.owner_telegram_id,"text":text,"parse_mode":"HTML"})

_BOOKLY_FINAL_NOTIFICATION_WRAPPER = True

def _bookly_localize_outgoing_text(text: str, lang: str) -> str:
    d = {
        "ru": {
            "new": "Новая запись в Bookly", "booked": "Вы успешно записаны!", "cancel_client": "Ваша запись отменена",
            "cancel_business": "Ваша запись отменена бизнесом.", "cancel_owner": "Клиент отменил запись",
            "hint": "Пожалуйста, свяжитесь с бизнесом, если хотите выбрать другое время.", "waiting": "Ждём вас!",
            "phone": "номер не передан", "phone_label": "Ваш номер:", "contact_label": "Связаться:", "address": "Адрес не указан"
        },
        "en": {
            "new": "New booking in Bookly", "booked": "You are successfully booked!", "cancel_client": "Your booking has been cancelled",
            "cancel_business": "Your booking was cancelled by the business.", "cancel_owner": "Client cancelled the booking",
            "hint": "Please contact the business if you want to choose another time.", "waiting": "We look forward to seeing you!",
            "phone": "phone not provided", "phone_label": "Your number:", "contact_label": "Contact:", "address": "Address not provided"
        },
        "uz": {
            "new": "Bookly’da yangi bron", "booked": "Siz muvaffaqiyatli bron qilindingiz!", "cancel_client": "Broningiz bekor qilindi",
            "cancel_business": "Bron biznes tomonidan bekor qilindi.", "cancel_owner": "Mijoz bronni bekor qildi",
            "hint": "Boshqa vaqt tanlamoqchi bo‘lsangiz, biznes bilan bog‘laning.", "waiting": "Sizni kutamiz!",
            "phone": "telefon berilmagan", "phone_label": "Raqamingiz:", "contact_label": "Bog‘lanish:", "address": "Manzil ko‘rsatilmagan"
        },
        "tr": {
            "new": "Bookly’da yeni rezervasyon", "booked": "Rezervasyonunuz başarıyla oluşturuldu!", "cancel_client": "Rezervasyonunuz iptal edildi",
            "cancel_business": "Rezervasyon işletme tarafından iptal edildi.", "cancel_owner": "Müşteri rezervasyonu iptal etti",
            "hint": "Başka bir zaman seçmek istiyorsanız işletmeyle iletişime geçin.", "waiting": "Sizi bekliyoruz!",
            "phone": "telefon verilmedi", "phone_label": "Numaranız:", "contact_label": "İletişim:", "address": "Adres belirtilmedi"
        },
        "ar": {
            "new": "حجز جديد في Bookly", "booked": "تم حجز موعدك بنجاح!", "cancel_client": "تم إلغاء حجزك",
            "cancel_business": "تم إلغاء الحجز من قبل النشاط.", "cancel_owner": "ألغى العميل الحجز",
            "hint": "يرجى التواصل مع النشاط إذا أردت اختيار وقت آخر.", "waiting": "ننتظركم!",
            "phone": "رقم الهاتف غير متوفر", "phone_label": "رقمك:", "contact_label": "للتواصل:", "address": "العنوان غير متوفر"
        },
    }[_bookly_normalize_language(lang)]

    replacements = [
        ("Новая запись в Bookly", d["new"]),
        ("Вы успешно записаны!", d["booked"]),
        ("Ваша запись отменена бизнесом.", d["cancel_business"]),
        ("Ваша запись отменена", d["cancel_client"]),
        ("Клиент отменил запись", d["cancel_owner"]),
        ("Пожалуйста, свяжитесь с бизнесом, если хотите выбрать другое время.", d["hint"]),
        ("Ждём вас!", d["waiting"]),
        ("номер не передан", d["phone"]),
        ("номер не указан", d["phone"]),
        ("Ваш номер:", d["phone_label"]),
        ("Связаться:", d["contact_label"]),
        ("Адрес не указан", d["address"]),
    ]
    for old, new in replacements:
        text = text.replace(old, new)
    return text

_BOOKLY_RAW_TELEGRAM_API = telegram_api

def telegram_api(method: str, payload: dict):
    if method == "sendMessage" and isinstance(payload, dict) and payload.get("chat_id"):
        payload = dict(payload)
        payload["text"] = _bookly_localize_outgoing_text(str(payload.get("text", "")), _bookly_user_language(int(payload["chat_id"])))
    return _BOOKLY_RAW_TELEGRAM_API(method, payload)


def owner_business(
    db,
    owner_id: int,
    business_id: Optional[int] = None
):
    selected_id = (
        business_id
        if business_id is not None
        else ACTIVE_BUSINESS_ID.get()
    )

    query = db.query(Business).filter(
        Business.owner_telegram_id ==
        owner_id
    )

    if selected_id is not None:
        return (
            query
            .filter(
                Business.id ==
                selected_id
            )
            .first()
        )

    return (
        query
        .order_by(
            Business.id.asc()
        )
        .first()
    )
def ensure_owner(db, business_id: int, owner_id: int):
    b = db.get(Business, business_id)
    if not b or b.owner_telegram_id != owner_id:
        raise HTTPException(403, "Not your business")
    return b

# ---------- schemas ----------
class BusinessIn(BaseModel):
    name: str = Field(min_length=1, max_length=120)
    description: str = ""
    address: str = ""
    phone: str = ""
    latitude: Optional[float] = None
    longitude: Optional[float] = None

class ServiceIn(BaseModel):
    name: str = Field(min_length=1, max_length=120)
    description: str = ""
    price: Decimal = Field(
    ge=Decimal("0"),
    decimal_places=3,
    max_digits=18
)
    currency: str = "UZS"
    duration_min: int = Field(gt=0, le=480)
    active: bool = True

class WorkingHourIn(BaseModel):
    weekday: int = Field(ge=0, le=6)
    start: time
    end: time
    active: bool = True

class BlockIn(BaseModel):
    day: date
    start: time
    end: time
    reason: str = ""

class BookingIn(BaseModel):
    business_id: int
    service_id: int
    client_telegram_id: int = 0
    client_name: str = "Telegram user"
    client_phone: str = ""
    day: date
    start: time
    
class AdminBookingIn(BaseModel):
    service_id: int
    client_name: str = Field(min_length=1, max_length=120)
    client_phone: str = ""
    day: date
    start: time

# ---------- common ----------
@app.get("/health")
def health(): return {"ok": True, "service": "bookly"}

@app.get("/me")
def me(x_telegram_init_data: str = Header(default="")):
    user = telegram_user(x_telegram_init_data)
    with SessionLocal() as db:
        b = owner_business(db, int(user["id"]))
        return {"user": user, "business": b}

# ---------- admin ----------
@app.put("/admin/business")
def upsert_business(x: BusinessIn, x_telegram_init_data: str = Header(default="")):
    user = telegram_user(x_telegram_init_data)
    owner_id = int(user["id"])
    with SessionLocal() as db:
        b = owner_business(db, owner_id)
        if not b:
            slug = secrets.token_urlsafe(8).replace("-", "").replace("_", "").lower()
            b = Business(owner_telegram_id=owner_id, slug=slug, **x.model_dump())
            db.add(b)
        else:
            for k, v in x.model_dump().items(): setattr(b, k, v)
        db.commit(); db.refresh(b)
        return b
@app.get("/admin/businesses")
def admin_businesses(
    x_telegram_init_data: str = Header(
        default=""
    )
):
    user = telegram_user(
        x_telegram_init_data
    )

    owner_id = int(
        user["id"]
    )

    with SessionLocal() as db:
        return (
            db.query(Business)
            .filter(
                Business.owner_telegram_id ==
                owner_id
            )
            .order_by(
                Business.id.asc()
            )
            .all()
        )


@app.post("/admin/businesses")
def admin_create_business(
    x: BusinessIn,
    x_telegram_init_data: str = Header(
        default=""
    )
):
    user = telegram_user(
        x_telegram_init_data
    )

    owner_id = int(
        user["id"]
    )

    slug = (
        secrets.token_urlsafe(8)
        .replace("-", "")
        .replace("_", "")
        .lower()
    )

    with SessionLocal() as db:
        business = Business(
            owner_telegram_id=owner_id,
            slug=slug,
            **x.model_dump()
        )

        db.add(business)
        db.commit()
        db.refresh(business)

        return business
@app.get("/admin/business")
def admin_business(x_telegram_init_data: str = Header(default="")):
    user = telegram_user(x_telegram_init_data)
    with SessionLocal() as db:
        b = owner_business(db, int(user["id"]))
        return b

@app.get("/admin/services")
def admin_services(x_telegram_init_data: str = Header(default="")):
    user = telegram_user(x_telegram_init_data)
    with SessionLocal() as db:
        b = owner_business(db, int(user["id"]))
        if not b:
            return []
        return db.query(Service).filter_by(
            business_id=b.id,
            active=True
        ).order_by(Service.id.desc()).all()

@app.post("/admin/services")
def admin_add_service(x: ServiceIn, x_telegram_init_data: str = Header(default="")):
    user = telegram_user(x_telegram_init_data)
    with SessionLocal() as db:
        b = owner_business(db, int(user["id"]))
        if not b: raise HTTPException(400, "Create business first")
        s = Service(business_id=b.id, **x.model_dump()); db.add(s); db.commit(); db.refresh(s); return s

@app.patch("/admin/services/{service_id}")
def admin_edit_service(service_id: int, x: ServiceIn, x_telegram_init_data: str = Header(default="")):
    user = telegram_user(x_telegram_init_data)
    with SessionLocal() as db:
        b = owner_business(db, int(user["id"])); s = db.get(Service, service_id)
        if not b or not s or s.business_id != b.id: raise HTTPException(404, "Service not found")
        for k,v in x.model_dump().items(): setattr(s,k,v)
        db.commit(); db.refresh(s); return s

@app.delete("/admin/services/{service_id}")
def admin_delete_service(service_id: int, x_telegram_init_data: str = Header(default="")):
    user = telegram_user(x_telegram_init_data)
    with SessionLocal() as db:
        b=owner_business(db,int(user["id"])); s=db.get(Service,service_id)
        if not b or not s or s.business_id != b.id: raise HTTPException(404,"Service not found")
        s.active=False; db.commit(); return {"ok":True}

@app.get("/admin/hours")
def admin_hours(x_telegram_init_data: str = Header(default="")):
    user=telegram_user(x_telegram_init_data)
    with SessionLocal() as db:
        b=owner_business(db,int(user["id"]))
        if not b:return []
        return db.query(WorkingHour).filter_by(business_id=b.id).order_by(WorkingHour.weekday,WorkingHour.start).all()

@app.post("/admin/hours")
def admin_add_hour(x: WorkingHourIn, x_telegram_init_data: str = Header(default="")):
    user=telegram_user(x_telegram_init_data)
    if x.start >= x.end: raise HTTPException(400,"Start must be before end")
    with SessionLocal() as db:
        b=owner_business(db,int(user["id"]))
        if not b: raise HTTPException(400,"Create business first")
        h=WorkingHour(business_id=b.id,**x.model_dump());db.add(h);db.commit();db.refresh(h);return h

@app.delete("/admin/hours/{hour_id}")
def admin_delete_hour(hour_id:int,x_telegram_init_data:str=Header(default="")):
    user=telegram_user(x_telegram_init_data)
    with SessionLocal() as db:
        b=owner_business(db,int(user["id"]));h=db.get(WorkingHour,hour_id)
        if not b or not h or h.business_id!=b.id:raise HTTPException(404,"Hour not found")
        db.delete(h);db.commit();return {"ok":True}

@app.get("/admin/blocks")
def admin_blocks(day: Optional[date]=None,x_telegram_init_data:str=Header(default="")):
    user=telegram_user(x_telegram_init_data)
    with SessionLocal() as db:
        b=owner_business(db,int(user["id"]))
        if not b:return []
        q=db.query(BlockedSlot).filter_by(business_id=b.id)
        if day:q=q.filter_by(day=day)
        return q.order_by(BlockedSlot.day,BlockedSlot.start).all()

@app.post("/admin/blocks")
def admin_block(x:BlockIn,x_telegram_init_data:str=Header(default="")):
    user=telegram_user(x_telegram_init_data)
    if x.start>=x.end:raise HTTPException(400,"Invalid time range")
    with SessionLocal() as db:
        b=owner_business(db,int(user["id"]))
        if not b:raise HTTPException(400,"Create business first")
        z=BlockedSlot(business_id=b.id,**x.model_dump());db.add(z);db.commit();db.refresh(z);return z

@app.delete("/admin/blocks/{block_id}")
def admin_delete_block(block_id:int,x_telegram_init_data:str=Header(default="")):
    user=telegram_user(x_telegram_init_data)
    with SessionLocal() as db:
        b=owner_business(db,int(user["id"]));z=db.get(BlockedSlot,block_id)
        if not b or not z or z.business_id!=b.id:raise HTTPException(404,"Block not found")
        db.delete(z);db.commit();return {"ok":True}

@app.get("/admin/bookings")
def admin_bookings(day:Optional[date]=None,x_telegram_init_data:str=Header(default="")):
    user=telegram_user(x_telegram_init_data)
    with SessionLocal() as db:
        b=owner_business(db,int(user["id"]))
        if not b:return []
        q=db.query(Booking).filter_by(business_id=b.id)
        if day:q=q.filter_by(day=day)
        return q.order_by(Booking.day,Booking.start).all()
@app.post("/admin/bookings/{booking_id}/cancel")
def admin_cancel_booking(
    booking_id: int,
    x_telegram_init_data: str = Header(default="")
):
    user = telegram_user(x_telegram_init_data)
    owner_id = int(user["id"])

    with SessionLocal() as db:
        business = owner_business(
            db,
            owner_id
        )

        booking = db.get(
            Booking,
            booking_id
        )

        if (
            not business
            or not booking
            or booking.business_id != business.id
        ):
            raise HTTPException(
                404,
                "Booking not found"
            )

        if booking.status == "cancelled":
            return {"ok": True}

        booking.status = "cancelled"
        db.commit()

        if booking.client_telegram_id:
            telegram_api(
                "sendMessage",
                {
                    "chat_id": booking.client_telegram_id,
                    "text": (
                        "❌ <b>Ваша запись отменена</b>\n\n"
                        f"📅 {booking.day.isoformat()}\n"
                        f"🕐 {booking.start.strftime('%H:%M')}–"
                        f"{booking.end.strftime('%H:%M')}\n\n"
                        "Пожалуйста, свяжитесь с бизнесом, "
                        "если хотите выбрать другое время."
                    ),
                    "parse_mode": "HTML"
                }
            )

        return {
            "ok": True
        }
@app.post("/admin/bookings")
def admin_create_booking(
    x: AdminBookingIn,
    x_telegram_init_data: str = Header(default="")
):
    user = telegram_user(x_telegram_init_data)
    owner_id = int(user["id"])

    with SessionLocal() as db:
        business = owner_business(db, owner_id)

        if not business:
            raise HTTPException(
                400,
                "Create business first"
            )

        service = db.get(Service, x.service_id)

        if not service or service.business_id != business.id or not service.active:
            raise HTTPException(
                404,
                "Service not found"
            )

        from zoneinfo import ZoneInfo

        now_tashkent = datetime.now(
            ZoneInfo("Asia/Tashkent")
        ).replace(tzinfo=None)

        start_dt = datetime.combine(
            x.day,
            x.start
        )

        end_dt = start_dt + timedelta(
            minutes=service.duration_min
        )

        if start_dt <= now_tashkent:
            raise HTTPException(
                400,
                "Нельзя создать запись на прошедшее время"
            )

        if not is_free(
            db,
            business.id,
            x.day,
            x.start,
            end_dt.time()
        ):
            raise HTTPException(
                400,
                "Это время уже занято или заблокировано"
            )

        booking = Booking(
            business_id=business.id,
            service_id=service.id,
            client_telegram_id=0,
            client_name=x.client_name.strip(),
            client_phone=x.client_phone.strip(),
            day=x.day,
            start=x.start,
            end=end_dt.time(),
            status="confirmed"
        )

        db.add(booking)
        db.commit()
        db.refresh(booking)

        return booking

# ---------- client ----------
def get_work_windows(db, business_id:int, day:date):
    hours=db.query(WorkingHour).filter_by(business_id=business_id,weekday=day.weekday(),active=True).order_by(WorkingHour.start).all()
    if hours:return [(h.start,h.end) for h in hours]
    # Friendly first-run default until owner configures schedule.
    return [(time(9,0),time(18,0))]

def is_free(db,business_id:int,day:date,st:time,en:time):
    overlap=db.query(Booking).filter(Booking.business_id==business_id,Booking.day==day,Booking.status=="confirmed",Booking.start<en,Booking.end>st).first()
    blocked=db.query(BlockedSlot).filter(BlockedSlot.business_id==business_id,BlockedSlot.day==day,BlockedSlot.start<en,BlockedSlot.end>st).first()
    return not overlap and not blocked

@app.get("/businesses/{slug}")
def get_business(slug:str):
    with SessionLocal() as db:
        b=db.query(Business).filter_by(slug=slug).first()
        if not b:raise HTTPException(404,"Business not found")
        if not b.subscription_active:raise HTTPException(403,"Business is not active")
        services=db.query(Service).filter_by(business_id=b.id,active=True).all()
        return {"business":b,"services":services}
@app.get("/businesses/{business_id}/availability")
def availability(business_id: int, service_id: int, day: date):
    with SessionLocal() as db:
        b = db.get(Business, business_id)
        s = db.get(Service, service_id)

        if not b or not s or s.business_id != business_id or not s.active:
            raise HTTPException(404, "Not found")

        slots = []
        step = s.duration_min

        # Render работает в UTC, поэтому переводим текущее время
        # в часовой пояс Узбекистана.
        from zoneinfo import ZoneInfo

        now_tashkent = datetime.now(
            ZoneInfo("Asia/Tashkent")
        ).replace(tzinfo=None)

        for win_start, win_end in get_work_windows(
            db,
            business_id,
            day
        ):
            cursor = datetime.combine(day, win_start)
            endday = datetime.combine(day, win_end)

            while cursor + timedelta(
                minutes=s.duration_min
            ) <= endday:

                st = cursor.time()
                en = (
                    cursor +
                    timedelta(minutes=s.duration_min)
                ).time()

                # Если выбрана сегодняшняя дата,
                # показываем только будущее время.
                if day == now_tashkent.date():
                    if cursor <= now_tashkent:
                        cursor += timedelta(minutes=step)
                        continue

                if is_free(
                    db,
                    business_id,
                    day,
                    st,
                    en
                ):
                    slots.append(
                        st.strftime("%H:%M")
                    )

                cursor += timedelta(minutes=step)

        return {"slots": slots}

@app.post("/bookings")
def create_booking(
    x: BookingIn,
    x_telegram_init_data: str = Header(default="")
):
    user = telegram_user(x_telegram_init_data)

    # Client identity always comes from signed Telegram initData.
    x.client_telegram_id = int(user["id"])

    with SessionLocal() as db:
        b = db.get(Business, x.business_id)
        s = db.get(Service, x.service_id)

        if (
            not b
            or not s
            or s.business_id != x.business_id
            or not s.active
        ):
            raise HTTPException(404, "Not found")

        if not b.subscription_active:
            raise HTTPException(403, "Business inactive")

        end = (
            datetime.combine(x.day, x.start)
            + timedelta(minutes=s.duration_min)
        ).time()

        if not is_free(
            db,
            x.business_id,
            x.day,
            x.start,
            end
        ):
            raise HTTPException(
                409,
                "This time is no longer available"
            )

        booking = Booking(
            **x.model_dump(),
            end=end
        )

        db.add(booking)
        db.commit()
        db.refresh(booking)

        # Уведомление владельцу
        notify_owner_new_booking(
            db,
            booking,
            s
        )

          # Уведомление клиенту
        telegram_api(
            "sendMessage",
            {
                "chat_id": booking.client_telegram_id,
                "text": (
                    "✅ <b>Вы успешно записаны!</b>\n\n"
                    f"💈 {s.name}\n"
                    f"📅 {booking.day.isoformat()}\n"
                    f"🕐 {booking.start.strftime('%H:%M')}–"
                    f"{booking.end.strftime('%H:%M')}\n"
                    f"📞 Ваш номер: {booking.client_phone}\n"
                    f"☎️ Связаться: {b.phone or 'номер не указан'}\n"
                    f"📍 {b.address or 'Адрес не указан'}\n\n"
                    "Ждём вас!"
                ),
                "parse_mode": "HTML"
            }
        )

        return booking

        return booking
@app.post("/bookings/{booking_id}/cancel")
def cancel_booking(booking_id:int,x_telegram_init_data:str=Header(default="")):
    user=telegram_user(x_telegram_init_data);uid=int(user["id"])
    with SessionLocal() as db:
        x=db.get(Booking,booking_id)
        if not x:raise HTTPException(404,"Booking not found")
        if x.client_telegram_id!=uid:raise HTTPException(403,"Not your booking")
        x.status="cancelled";db.commit()
        b=db.get(Business,x.business_id)
        telegram_api("sendMessage", {"chat_id":b.owner_telegram_id,"text":f"❌ <b>Запись отменена</b>\n\n👤 {x.client_name}\n📅 {x.day.isoformat()}\n🕐 {x.start.strftime('%H:%M')}–{x.end.strftime('%H:%M')}\n🆔 #{x.id}","parse_mode":"HTML"}) if b else None
        return {"ok":True}

@app.get("/my/saved-businesses")
def my_saved_businesses(
    x_telegram_init_data: str = Header(
        default=""
    )
):
    user = telegram_user(
        x_telegram_init_data
    )

    uid = int(
        user["id"]
    )

    with SessionLocal() as db:
        rows = (
            db.query(
                Business
            )
            .join(
                SavedBusiness,
                SavedBusiness.business_id ==
                Business.id
            )
            .filter(
                SavedBusiness.telegram_user_id ==
                uid
            )
            .filter(
                Business.subscription_active ==
                True
            )
            .order_by(
                SavedBusiness.created_at.desc()
            )
            .all()
        )

        return rows


@app.post("/my/saved-businesses/{business_id}")
def save_business(
    business_id: int,
    x_telegram_init_data: str = Header(
        default=""
    )
):
    user = telegram_user(
        x_telegram_init_data
    )

    uid = int(
        user["id"]
    )

    with SessionLocal() as db:
        business = db.get(
            Business,
            business_id
        )

        if not business:
            raise HTTPException(
                404,
                "Business not found"
            )

        if not business.subscription_active:
            raise HTTPException(
                403,
                "Business is inactive"
            )

        existing = (
            db.query(
                SavedBusiness
            )
            .filter(
                SavedBusiness.telegram_user_id ==
                uid
            )
            .filter(
                SavedBusiness.business_id ==
                business_id
            )
            .first()
        )

        if existing:
            return {
                "ok": True,
                "saved": True
            }

        saved = SavedBusiness(
            telegram_user_id=uid,
            business_id=business_id
        )

        db.add(saved)
        db.commit()

        return {
            "ok": True,
            "saved": True
        }


@app.delete("/my/saved-businesses/{business_id}")
def unsave_business(
    business_id: int,
    x_telegram_init_data: str = Header(
        default=""
    )
):
    user = telegram_user(
        x_telegram_init_data
    )

    uid = int(
        user["id"]
    )

    with SessionLocal() as db:
        saved = (
            db.query(
                SavedBusiness
            )
            .filter(
                SavedBusiness.telegram_user_id ==
                uid
            )
            .filter(
                SavedBusiness.business_id ==
                business_id
            )
            .first()
        )

        if saved:
            db.delete(saved)
            db.commit()

        return {
            "ok": True,
            "saved": False
        }

@app.get("/my/bookings")
def my_bookings(
    x_telegram_init_data: str = Header(default="")
):
    user = telegram_user(x_telegram_init_data)
    uid = int(user["id"])

    from zoneinfo import ZoneInfo

    now_tashkent = datetime.now(
        ZoneInfo("Asia/Tashkent")
    ).replace(tzinfo=None)

    with SessionLocal() as db:
        rows = (
            db.query(
                Booking,
                Business.name.label("business_name"),
                Service.name.label("service_name")
            )
            .join(
                Business,
                Business.id == Booking.business_id
            )
            .join(
                Service,
                Service.id == Booking.service_id
            )
            .filter(
                Booking.client_telegram_id == uid,
                Booking.status == "confirmed"
            )
            .order_by(
                Booking.day,
                Booking.start
            )
            .limit(50)
            .all()
        )

        result = []

        for booking, business_name, service_name in rows:
            booking_datetime = datetime.combine(
                booking.day,
                booking.start
            )

            # Не показываем прошедшие записи
            if booking_datetime <= now_tashkent:
                continue

            result.append({
                "id": booking.id,
                "business_id": booking.business_id,
                "service_id": booking.service_id,
                "business_name": business_name,
                "service_name": service_name,
                "client_name": booking.client_name,
                "client_phone": booking.client_phone,
                "day": booking.day.isoformat(),
                "start": booking.start.strftime("%H:%M"),
                "end": booking.end.strftime("%H:%M"),
                "status": booking.status
            })

        return result
@app.post("/my/bookings/{booking_id}/cancel")
def my_cancel_booking(
    booking_id: int,
    x_telegram_init_data: str = Header(default="")
):
    user = telegram_user(x_telegram_init_data)
    uid = int(user["id"])

    with SessionLocal() as db:
        booking = db.get(Booking, booking_id)

        if not booking:
            raise HTTPException(
                404,
                "Booking not found"
            )

        if booking.client_telegram_id != uid:
            raise HTTPException(
                403,
                "Access denied"
            )

        if booking.status == "cancelled":
            return {"ok": True}

        booking.status = "cancelled"
        db.commit()

        business = db.get(
            Business,
            booking.business_id
        )

        if business and business.owner_telegram_id:
            telegram_api(
                "sendMessage",
                {
                    "chat_id": business.owner_telegram_id,
                    "text": (
                        "❌ <b>Клиент отменил запись</b>\n\n"
                        f"👤 {booking.client_name}\n"
                        f"📅 {booking.day.isoformat()}\n"
                        f"🕐 {booking.start.strftime('%H:%M')}–"
                        f"{booking.end.strftime('%H:%M')}"
                    ),
                    "parse_mode": "HTML"
                }
            )

        return {"ok": True}
@app.post("/admin/bookings/{booking_id}/cancel")
def admin_cancel_booking(booking_id:int,x_telegram_init_data:str=Header(default="")):
    user=telegram_user(x_telegram_init_data)
    with SessionLocal() as db:
        b=owner_business(db,int(user["id"])); x=db.get(Booking,booking_id)
        if not b or not x or x.business_id!=b.id: raise HTTPException(404,"Booking not found")
        x.status="cancelled"; db.commit()
        if x.client_telegram_id:
            telegram_api("sendMessage", {"chat_id":x.client_telegram_id,"text":f"❌ Ваша запись отменена бизнесом.\n\n📅 {x.day.isoformat()}\n🕐 {x.start.strftime('%H:%M')}–{x.end.strftime('%H:%M')}"})
        return {"ok":True}

# ---------- payments ----------
LEMON_API_KEY=os.getenv("LEMON_API_KEY","")
LEMON_STORE_ID=os.getenv("LEMON_STORE_ID","")
LEMON_VARIANT_ID=os.getenv("LEMON_VARIANT_ID","")
LEMON_WEBHOOK_SECRET=os.getenv("LEMON_WEBHOOK_SECRET","")
PUBLIC_APP_URL=os.getenv("PUBLIC_APP_URL","")
PADDLE_WEBHOOK_SECRET=os.getenv("PADDLE_WEBHOOK_SECRET","")


def lemonsqueezy_checkout(owner_id: int):
    if not all([LEMON_API_KEY, LEMON_STORE_ID, LEMON_VARIANT_ID]):
        print("LEMON CONFIG ERROR: missing API key, Store ID or Variant ID")
        return None

    payload = {
        "data": {
            "type": "checkouts",
            "attributes": {
                "checkout_data": {
                    "custom": {
                       "telegram_user_id": str(owner_id)
                    }
                },
                "product_options": {
                    "redirect_url": PUBLIC_APP_URL or None,
                    "receipt_button_text": "Вернуться в Bookly",
                    "receipt_link_url": PUBLIC_APP_URL or None
                },
                "checkout_options": {
                    "subscription_preview": True
                }
            },
            "relationships": {
                "store": {
                    "data": {
                        "type": "stores",
                        "id": str(LEMON_STORE_ID)
                    }
                },
                "variant": {
                    "data": {
                        "type": "variants",
                        "id": str(LEMON_VARIANT_ID)
                    }
                }
            }
        }
    }

    raw = json.dumps(payload).encode("utf-8")

    req = urllib_request.Request(
        "https://api.lemonsqueezy.com/v1/checkouts",
        data=raw,
        headers={
            "Accept": "application/vnd.api+json",
            "Content-Type": "application/vnd.api+json",
            "Authorization": f"Bearer {LEMON_API_KEY}"
        },
        method="POST"
    )

    try:
        with urllib_request.urlopen(req, timeout=15) as response:
            body = json.loads(response.read().decode("utf-8"))
            return body["data"]["attributes"]["url"]

    except Exception as e:
        print("LEMON CHECKOUT ERROR:", repr(e))

        if hasattr(e, "read"):
            try:
                error_body = e.read().decode("utf-8")
                print("LEMON ERROR BODY:", error_body)
            except Exception:
                pass

        return None
@app.post("/payments/checkout/{provider}")
def create_checkout(provider:str,x_telegram_init_data:str=Header(default="")):
    if provider not in {"uzum","lemonsqueezy"}:raise HTTPException(400,"Unsupported provider")
    user=telegram_user(x_telegram_init_data); owner_id=int(user["id"])
    with SessionLocal() as db:
        b=owner_business(db,owner_id)
        if not b: raise HTTPException(400,"Create business first")
        if provider=="lemonsqueezy":
            url=lemonsqueezy_checkout(owner_id)
            if not url:
                return {"provider":provider,"amount":9.99,"currency":"USD","status":"not_configured"}
            b.payment_provider="lemonsqueezy"; db.commit()
            return {"provider":provider,"amount":9.99,"currency":"USD","status":"ready","url":url}
        return {"provider":"uzum","amount":9.99,"currency":"USD","status":"not_configured","message":"Uzum merchant credentials are not configured yet."}

@app.post("/payments/webhook/paddle")
async def paddle_webhook(
    request: Request
):
    raw = await request.body()

    signature_header = request.headers.get(
        "Paddle-Signature",
        ""
    )

    if not PADDLE_WEBHOOK_SECRET:
        raise HTTPException(
            500,
            "PADDLE_WEBHOOK_SECRET is not configured"
        )

    # Paddle подписывает так:
    # ts=<timestamp>;h1=<hash>
    parts = dict(
        p.split("=", 1)
        for p in signature_header.split(";")
        if "=" in p
    )

    ts = parts.get(
        "ts",
        ""
    )

    h1 = parts.get(
        "h1",
        ""
    )

    if not ts or not h1:
        raise HTTPException(
            401,
            "Invalid Paddle signature header"
        )

    signed_payload = (
        f"{ts}:{raw.decode()}"
    ).encode()

    expected_signature = hmac.new(
        PADDLE_WEBHOOK_SECRET.encode(),
        signed_payload,
        hashlib.sha256
    ).hexdigest()

    if not hmac.compare_digest(
        expected_signature,
        h1
    ):
        raise HTTPException(
            401,
            "Invalid webhook signature"
        )

    payload = json.loads(
        raw.decode() or "{}"
    )

    event_type = payload.get(
        "event_type",
        ""
    )

    data = payload.get(
        "data",
        {}
    ) or {}

    custom = data.get(
        "custom_data",
        {}
    ) or {}

    owner_id = custom.get(
        "telegram_user_id"
    )

    business_id = custom.get(
        "business_id"
    )

    status = data.get(
        "status",
        ""
    )

    subscription_id = str(
        data.get("id", "")
        or
        data.get(
            "subscription_id",
            ""
        )
    )

    billing_period = data.get(
        "current_billing_period",
        {}
    ) or {}

    next_billed_at = (
        data.get("next_billed_at")
        or
        billing_period.get(
            "ends_at"
        )
    )

    with SessionLocal() as db:

        b = None

        # Для новых оплат пытаемся найти
        # конкретный выбранный бизнес.
        if business_id:
            try:
                candidate = db.get(
                    Business,
                    int(business_id)
                )

                if (
                    candidate
                    and owner_id
                    and candidate.owner_telegram_id
                    == int(owner_id)
                ):
                    b = candidate

            except (
                TypeError,
                ValueError
            ):
                b = None

        # Совместимость со старыми платежами,
        # где business_id ещё не передавался.
        if not b and owner_id:
            b = owner_business(
                db,
                int(owner_id)
            )

        if not b:
            return {
                "received": True
            }

        b.payment_provider = "paddle"

        if subscription_id:
            b.external_subscription_id = (
                subscription_id
            )

        b.subscription_status = status

        if next_billed_at:
            try:
                b.subscription_expires_at = (
                    datetime.fromisoformat(
                        next_billed_at.replace(
                            "Z",
                            "+00:00"
                        )
                    ).replace(
                        tzinfo=None
                    )
                )
            except ValueError:
                pass

        if event_type in {
            "transaction.completed",
            "subscription.created",
            "subscription.updated",
            "subscription.resumed"
        }:
            b.subscription_active = (
                status not in {
                    "canceled",
                    "paused"
                }
            )

        elif event_type in {
            "subscription.canceled",
            "subscription.paused"
        }:
            if b.subscription_expires_at:
                b.subscription_active = (
                    b.subscription_expires_at
                    > datetime.utcnow()
                )
            else:
                b.subscription_active = False

        elif event_type == "transaction.payment_failed":
            if (
                b.subscription_expires_at
                and
                b.subscription_expires_at
                > datetime.utcnow()
            ):
                b.subscription_active = True
            else:
                b.subscription_active = False

        db.commit()

    return {
        "received": True
    }
@app.post("/payments/webhook/{provider}")
def payment_webhook(provider:str,payload:dict):
    if provider not in {"uzum"}:raise HTTPException(400,"Use the provider-specific webhook")
    return {"received":True,"provider":provider,"status":"awaiting merchant callback mapping"}
