import os
import json
import hmac
import io
import qrcode
import hashlib
import secrets
from datetime import date, time, datetime, timedelta
from decimal import Decimal
from typing import Optional
from contextvars import ContextVar
from urllib.parse import parse_qsl
from urllib import request as urllib_request
from urllib.error import URLError, HTTPError

from fastapi import (
    FastAPI,
    HTTPException,
    Header,
    Request,
    Response
)
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel, Field
from sqlalchemy import (
    create_engine,
    String,
    Integer,
    BigInteger,
    Boolean,
    Float,
    Date,
    Time,
    DateTime,
    ForeignKey,
    Numeric,
    Text,
    inspect,
    text
)
from sqlalchemy.orm import DeclarativeBase, Mapped, mapped_column, sessionmaker

BASE_DIR = os.path.dirname(os.path.abspath(__file__))
DB_URL = os.getenv("DATABASE_URL", f"sqlite:///{os.path.join(BASE_DIR, '..', 'data', 'app.db')}")
os.makedirs(os.path.join(BASE_DIR, '..', 'data'), exist_ok=True)
engine = create_engine(DB_URL, connect_args={"check_same_thread": False} if DB_URL.startswith("sqlite") else {})
SessionLocal = sessionmaker(bind=engine, expire_on_commit=False)
BOT_TOKEN = os.getenv("BOT_TOKEN", "")
PRO_PRICE = 7.99
PADDLE_WEBHOOK_SECRET = os.getenv(
    "PADDLE_WEBHOOK_SECRET",
    ""
)

SERVICE_ADDONS = {
    20: 4.99,
    30: 7.99,
    50: 11.99,
    100: 19.99,
}

PADDLE_BOOKLY_BASE_PRICE_ID = os.getenv(
    "PADDLE_BOOKLY_BASE_PRICE_ID",
    "pri_01kzwxx7zeytn8sqxfvpt0a8ys"
)

PADDLE_SERVICE_ADDON_PRICE_IDS = {
    20: os.getenv(
        "PADDLE_SERVICE_ADDON_10_PRICE_ID",
        "pri_01m0sy8kj4zw2ag1qe907zhdns"
    ),
    30: os.getenv(
        "PADDLE_SERVICE_ADDON_20_PRICE_ID",
        "pri_01m0mhf9rdee684tyd3mg3xp8p"
    ),
    50: os.getenv(
        "PADDLE_SERVICE_ADDON_40_PRICE_ID",
        "pri_01m0mhhh2k5cts13j9h3agt7bj"
    ),
    100: os.getenv(
        "PADDLE_SERVICE_ADDON_90_PRICE_ID",
        "pri_01m0mhk1wq5brdkew92q3gvk9r"
    ),
}

PADDLE_SERVICE_ADDON_IDS = set(
    PADDLE_SERVICE_ADDON_PRICE_IDS.values()
)

BOOKLY_REQUEST_LANGUAGE: ContextVar[Optional[str]] = ContextVar("BOOKLY_REQUEST_LANGUAGE", default=None)
BOOKLY_REQUEST_USER_ID: ContextVar[Optional[int]] = ContextVar("BOOKLY_REQUEST_USER_ID", default=None)

class Base(DeclarativeBase): pass
class Subscription(Base):
    __tablename__ = "subscriptions"

    id: Mapped[int] = mapped_column(
        Integer,
        primary_key=True
    )

    # Подписка принадлежит конкретному бизнесу
    business_id: Mapped[int] = mapped_column(
        Integer,
        unique=True,
        index=True
    )

    # Telegram ID владельца сохраняем для совместимости
    owner_telegram_id: Mapped[int] = mapped_column(
        BigInteger,
        index=True
    )

    # Текущий тариф
    plan: Mapped[str] = mapped_column(
        String(30),
        default="pro"
    )

    active: Mapped[bool] = mapped_column(
        Boolean,
        default=False
    )

    expires_at: Mapped[Optional[datetime]] = mapped_column(
        DateTime,
        nullable=True
    )

    status: Mapped[str] = mapped_column(
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

    # Текущий лимит услуг
    current_services_limit: Mapped[int] = mapped_column(
        Integer,
        default=10
    )

    # Будущий лимит услуг.
    # None = изменение не запланировано.
    pending_services_limit: Mapped[Optional[int]] = mapped_column(
        Integer,
        nullable=True
    )

    # Текущая ежемесячная цена
    current_price: Mapped[float] = mapped_column(
        Float,
        default=7.99
    )

    # Цена после следующего продления
    pending_price: Mapped[Optional[float]] = mapped_column(
        Float,
        nullable=True
    )
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
       
    business_image: Mapped[str] = mapped_column(
        Text,
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
   
    timezone: Mapped[str] = mapped_column(
        String(64),
        default="Asia/Tashkent"
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


Base.metadata.create_all(engine)

def ensure_subscription_schema():
    """
    Создаёт/обновляет таблицу подписок.

    Подписка принадлежит конкретному бизнесу.
    Старые данные из businesses сохраняются.
    """
    with engine.begin() as conn:
        inspector = inspect(conn)
        tables = inspector.get_table_names()

        # ---------------------------------------------------------
        # Создание новой таблицы, если её ещё нет
        # ---------------------------------------------------------

        if "subscriptions" not in tables:
            conn.execute(
                text(
                    """
                    CREATE TABLE subscriptions (
                        id INTEGER PRIMARY KEY,
                        business_id INTEGER UNIQUE NOT NULL,
                        owner_telegram_id BIGINT NOT NULL,
                        plan VARCHAR(30) DEFAULT 'pro',
                        active BOOLEAN DEFAULT FALSE,
                        expires_at TIMESTAMP,
                        status VARCHAR(30) DEFAULT 'inactive',
                        payment_provider VARCHAR(30) DEFAULT '',
                        external_subscription_id VARCHAR(120) DEFAULT '',
                        payment_method_url VARCHAR(1000) DEFAULT '',
                        current_services_limit INTEGER DEFAULT 10,
                        pending_services_limit INTEGER,
                        current_price REAL DEFAULT 7.99,
                        pending_price REAL
                    )
                    """
                )
            )

            return

        # ---------------------------------------------------------
        # Получаем существующие колонки
        # ---------------------------------------------------------

        existing_columns = {
            column["name"]
            for column in inspect(conn).get_columns(
                "subscriptions"
            )
        }

        # ---------------------------------------------------------
        # Добавляем новые колонки в старую таблицу
        # ---------------------------------------------------------

        columns_to_add = {
            "business_id":
                "INTEGER",

            "current_services_limit":
                "INTEGER DEFAULT 10",

            "pending_services_limit":
                "INTEGER",

            "current_price":
                "REAL DEFAULT 7.99",

            "pending_price":
                "REAL"
        }

        for column_name, column_definition in columns_to_add.items():

            if column_name not in existing_columns:

                conn.execute(
                    text(
                        f"""
                        ALTER TABLE subscriptions
                        ADD COLUMN {column_name}
                        {column_definition}
                        """
                    )
                )

        # ---------------------------------------------------------
        # Обновляем inspector после ALTER TABLE
        # ---------------------------------------------------------

        existing_columns = {
            column["name"]
            for column in inspect(conn).get_columns(
                "subscriptions"
            )
        }

        # ---------------------------------------------------------
        # Старые подписки были owner-level.
        #
        # Сейчас мы не можем автоматически безопасно определить,
        # какому из нескольких бизнесов владельца должна принадлежать
        # старая подписка.
        #
        # Поэтому переносим подписку только если у владельца
        # существует ровно один бизнес.
        # ---------------------------------------------------------

        if "businesses" not in inspect(conn).get_table_names():
            return

        owners = conn.execute(
            text(
                """
                SELECT
                    owner_telegram_id,
                    COUNT(*) AS business_count,
                    MIN(id) AS business_id
                FROM businesses
                GROUP BY owner_telegram_id
                """
            )
        ).mappings().all()

        for owner in owners:

            owner_id = owner["owner_telegram_id"]

            business_count = owner["business_count"]
            business_id = owner["business_id"]

            if business_count != 1:
                continue

            # Ищем старую подписку владельца
            subscription = conn.execute(
                text(
                    """
                    SELECT
                        id,
                        owner_telegram_id,
                        plan,
                        active,
                        expires_at,
                        status,
                        payment_provider,
                        external_subscription_id,
                        payment_method_url
                    FROM subscriptions
                    WHERE owner_telegram_id = :owner_id
                    ORDER BY id ASC
                    LIMIT 1
                    """
                ),
                {
                    "owner_id": owner_id
                }
            ).mappings().first()

            if not subscription:
                continue

            # Если бизнес уже указан — ничего не меняем
            if subscription.get("business_id"):
                continue

            conn.execute(
                text(
                    """
                    UPDATE subscriptions
                    SET
                        business_id = :business_id,
                        plan = CASE
                            WHEN plan = 'standard'
                            THEN 'pro'
                            ELSE plan
                        END,
                        current_services_limit = 10,
                        current_price = 7.99
                    WHERE id = :subscription_id
                    """
                ),
                {
                    "business_id": business_id,
                    "subscription_id": subscription["id"]
                }
            )

        # ---------------------------------------------------------
        # Для новых/существующих записей:
        # если лимит или цена NULL — устанавливаем базовые значения.
        # ---------------------------------------------------------

        conn.execute(
            text(
                """
                UPDATE subscriptions
                SET current_services_limit = 10
                WHERE current_services_limit IS NULL
                """
            )
        )

        conn.execute(
            text(
                """
                UPDATE subscriptions
                SET current_price = 7.99
                WHERE current_price IS NULL
                """
            )
        )




ensure_subscription_schema()
def ensure_business_schema():
    """
    Добавляет новые колонки в существующую БД,
    не удаляя существующие бизнесы.
    """
    with engine.begin() as conn:
        inspector = inspect(conn)

        if "businesses" not in inspector.get_table_names():
            return

        existing = {
            column["name"]
            for column in inspector.get_columns("businesses")
        }

        dialect = engine.dialect.name

        float_type = (
            "DOUBLE PRECISION"
            if dialect == "postgresql"
            else "REAL"
        )

        columns_to_add = {
            "description":
                "VARCHAR(500) DEFAULT ''",

            "business_image":
                "TEXT DEFAULT ''",

            "address":
                "VARCHAR(255) DEFAULT ''",

            "phone":
                "VARCHAR(40) DEFAULT ''",

            "latitude":
                float_type,

            "longitude":
                float_type,

            "timezone":
                "VARCHAR(64) DEFAULT 'Asia/Tashkent'",

            "subscription_active":
                "BOOLEAN DEFAULT FALSE",

            "subscription_expires_at":
                "TIMESTAMP",

            "subscription_status":
                "VARCHAR(30) DEFAULT 'inactive'",

            "payment_provider":
                "VARCHAR(30) DEFAULT ''",

            "external_subscription_id":
                "VARCHAR(120) DEFAULT ''",

            "payment_method_url":
                "VARCHAR(1000) DEFAULT ''"
        }

        for column_name, column_definition in columns_to_add.items():

            if column_name not in existing:

                conn.execute(
                    text(
                        f"""
                        ALTER TABLE businesses
                        ADD COLUMN {column_name}
                        {column_definition}
                        """
                    )
                )


ensure_business_schema()


app = FastAPI(
    title="Bookly API",
    version="0.2.0"
)

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
        try:
            BOOKLY_REQUEST_USER_ID.set(None)
        except Exception:
            pass
app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "https://boockly.vercel.app",
        "http://localhost:5173",
    ],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)
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
    try:
        request_user_id_token = BOOKLY_REQUEST_USER_ID.set(int(user.get("id")))
    except (TypeError, ValueError):
        request_user_id_token = None
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
    """Telegram Bot API helper using the language selected in Bookly."""
    if not BOT_TOKEN:
        return None

    if method == "sendMessage" and isinstance(payload, dict) and payload.get("chat_id"):
        payload = dict(payload)
        chat_id = int(payload["chat_id"])
        request_lang = BOOKLY_REQUEST_LANGUAGE.get()
        effective_lang = (
            _bookly_normalize_language(request_lang)
            if request_lang
            else _bookly_user_language(chat_id)
        )
        payload["text"] = _bookly_localize_outgoing_text(
            str(payload.get("text", "")),
            effective_lang
        )

    data = json.dumps(payload).encode("utf-8")
    req = urllib_request.Request(
        f"https://api.telegram.org/bot{BOT_TOKEN}/{method}",
        data=data,
        headers={"Content-Type": "application/json"},
        method="POST",
    )
    try:
        with urllib_request.urlopen(req, timeout=8) as response:
            body = response.read().decode("utf-8")
            result = json.loads(body)
            if not result.get("ok", True):
                print("TELEGRAM API ERROR:", result)
            return result
    except Exception as exc:
        print("TELEGRAM SEND ERROR:", repr(exc))
        return None

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
def owner_subscription(db, business_id: int):
    return (
        db.query(Subscription)
        .filter(
            Subscription.business_id == business_id
        )
        .first()
    )


def subscription_limits(subscription):
    """
    Возвращает текущие возможности подписки
    конкретного бизнеса.
    """

    if not subscription or not subscription.active:
        return {
        "plan": "free",
        "max_services": 10,
        "current_price": 0.0,
        "pending_services": None,
        "pending_price": None
    }

    return {
        "plan": subscription.plan or "pro",

        "max_services": (
            subscription.current_services_limit
            or 10
        ),

        "current_price": (
            float(subscription.current_price)
            if subscription.current_price is not None
            else 7.99
        ),

        "pending_services": (
            subscription.pending_services_limit
        ),

        "pending_price": (
            float(subscription.pending_price)
            if subscription.pending_price is not None
            else None
        )
    }
def calculate_subscription_price(services_limit: int) -> float:
    """
    Возвращает общую ежемесячную стоимость подписки.

    10 услуг включены в Pro за $7.99.
    Дополнительные лимиты оплачиваются отдельно.
    """

    if services_limit <= 10:
        return PRO_PRICE

    addon_price = SERVICE_ADDONS.get(
        services_limit
    )

    if addon_price is None:
        raise ValueError(
            f"Недопустимый лимит услуг: {services_limit}"
        )

    return round(
        PRO_PRICE + addon_price,
        2
    )
def ensure_owner(db, business_id: int, owner_id: int):
    b = db.get(Business, business_id)
    if not b or b.owner_telegram_id != owner_id:
        raise HTTPException(403, "Not your business")
    return b

# ---------- schemas ----------
class BusinessIn(BaseModel):
    name: str = Field(min_length=1, max_length=120)
    business_image: str = ""
    description: str = ""
    address: str = ""
    phone: str = ""
    latitude: Optional[float] = None
    longitude: Optional[float] = None
    timezone: str = "Asia/Tashkent"

class ServiceIn(BaseModel):
    name: str = Field(min_length=1, max_length=120)
    description: str = ""
    price: Decimal = Field(
    ge=Decimal("0"),
    decimal_places=3,
    max_digits=18
)
    currency: str = "UZS"
    duration_min: int = Field(gt=0, le=1440)
    active: bool = True

class SubscriptionLimitChangeIn(BaseModel):
    services_limit: int

class WorkingHourIn(BaseModel):
    weekday: int = Field(ge=0, le=6)
    start: time
    end: time
    active: bool = True
    
class BusinessCreateIn(BusinessIn):
    hours: list[WorkingHourIn] = []

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

        businesses = (
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

        result = []

        for business in businesses:

            subscription = (
                db.query(Subscription)
                .filter(
                    Subscription.business_id ==
                    business.id
                )
                .first()
            )

            business_data = {
                column.name: getattr(
                    business,
                    column.name
                )
                for column
                in Business.__table__.columns
            }

            business_data["services_limit"] = (
                subscription.current_services_limit
                if subscription
                and subscription.active
                else 0
            )

            business_data["pending_services_limit"] = (
                subscription.pending_services_limit
                if subscription
                else None
            )

            business_data["current_price"] = (
                float(
                    subscription.current_price
                )
                if subscription
                and subscription.current_price is not None
                else 0.0
            )

            business_data["pending_price"] = (
                float(
                    subscription.pending_price
                )
                if subscription
                and subscription.pending_price is not None
                else None
            )

            result.append(
                business_data
            )

        return result
        


@app.post("/admin/businesses")
def admin_create_business(
    x: BusinessCreateIn,
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

        try:
            business_data = x.model_dump(
                exclude={"hours"}
            )

            business = Business(
                owner_telegram_id=owner_id,
                slug=slug,
                **business_data
            )

            db.add(business)

            db.flush()

            for hour in x.hours:

                if not hour.active:
                    continue

                if hour.start >= hour.end:
                    raise HTTPException(
                        400,
                        f"Некорректный график для дня {hour.weekday}"
                    )

                working_hour = WorkingHour(
                    business_id=business.id,
                    **hour.model_dump()
                )

                db.add(
                    working_hour
                )

            db.commit()

            db.refresh(
                business
            )

            return business

        except HTTPException:
            db.rollback()
            raise

        except Exception as exc:

            db.rollback()

            print(
                "CREATE BUSINESS ERROR:",
                repr(exc)
            )

            raise HTTPException(
                500,
                "Не удалось создать бизнес"
            )
@app.delete("/admin/business/{business_id}")
def admin_delete_business(
    business_id: int,
    x_telegram_init_data: str = Header(default="")
):
    user = telegram_user(
        x_telegram_init_data
    )

    owner_id = int(
        user["id"]
    )

    with SessionLocal() as db:

        business = db.query(Business).filter(
            Business.id == business_id,
            Business.owner_telegram_id == owner_id
        ).first()

        if not business:
            raise HTTPException(
                404,
                "Business not found"
            )

        # ---------------------------------------------------------
        # Удаляем подписку этого конкретного бизнеса
        # ---------------------------------------------------------

        db.query(Subscription).filter(
            Subscription.business_id == business.id
        ).delete(
            synchronize_session=False
        )

        # ---------------------------------------------------------
        # Удаляем связанные данные
        # ---------------------------------------------------------

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

        db.delete(
            business
        )

        db.commit()

        return {
            "ok": True
        }
@app.get("/admin/business")
def admin_business(
    x_telegram_init_data: str = Header(default="")
):
    user = telegram_user(
        x_telegram_init_data
    )

    owner_id = int(
        user["id"]
    )

    with SessionLocal() as db:

        b = owner_business(
            db,
            owner_id
        )

        if not b:
            return None

        # Подписка принадлежит именно этому бизнесу
        subscription = owner_subscription(
            db,
            b.id
        )

        result = {
            "id": b.id,
            "owner_telegram_id": b.owner_telegram_id,
            "name": b.name,
            "slug": b.slug,
            "description": b.description,
            "business_image": b.business_image,
            "address": b.address,
            "phone": b.phone,
            "latitude": b.latitude,
            "longitude": b.longitude,
            "timezone": b.timezone,

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

            "subscription_plan": (
                subscription.plan
                if subscription
                else "free"
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

            "pending_services_limit": (
                subscription.pending_services_limit
                if subscription
                else None
            ),

            "current_price": (
                float(subscription.current_price)
                if subscription
                and subscription.current_price is not None
                else 0.0
            ),

            "pending_price": (
                float(subscription.pending_price)
                if subscription
                and subscription.pending_price is not None
                else None
            )
        }

        return result
@app.get("/admin/services")
def admin_services(
    x_telegram_init_data: str = Header(default="")
):
    user = telegram_user(
        x_telegram_init_data
    )

    owner_id = int(
        user["id"]
    )

    with SessionLocal() as db:

        b = owner_business(
            db,
            owner_id
        )

        if not b:
            return []

        return (
            db.query(Service)
            .filter(
                Service.business_id == b.id,
                Service.active == True
            )
            .order_by(
                Service.id.desc()
            )
            .all()
        )


@app.post("/admin/services")
def admin_add_service(
    x: ServiceIn,
    x_telegram_init_data: str = Header(default="")
):
    user = telegram_user(
        x_telegram_init_data
    )

    owner_id = int(
        user["id"]
    )

    with SessionLocal() as db:

        b = owner_business(
            db,
            owner_id
        )

        if not b:
            raise HTTPException(
                400,
                "Create business first"
            )

        # ---------------------------------------------------------
        # Подписка принадлежит именно этому бизнесу
        # ---------------------------------------------------------

        subscription = owner_subscription(
            db,
            b.id
        )

        limits = subscription_limits(
            subscription
        )

        max_services = limits[
            "max_services"
        ]

        # ---------------------------------------------------------
        # Считаем только активные услуги
        # ---------------------------------------------------------

        services_count = (
            db.query(Service)
            .filter(
                Service.business_id == b.id,
                Service.active == True
            )
            .count()
        )

        
        # ---------------------------------------------------------
        # Проверяем текущий лимит
        # ---------------------------------------------------------

        if services_count >= max_services:
            raise HTTPException(
                403,
                (
                    f"Достигнут лимит услуг: "
                    f"{max_services}"
                )
            )

        # ---------------------------------------------------------
        # Создаём услугу
        # ---------------------------------------------------------

        s = Service(
            business_id=b.id,
            **x.model_dump()
        )

        db.add(s)

        db.commit()

        db.refresh(s)

        return s

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
def admin_add_hour(
    x: WorkingHourIn,
    x_telegram_init_data: str = Header(default="")
):
    user = telegram_user(
        x_telegram_init_data
    )

    if x.start >= x.end:
        raise HTTPException(
            400,
            "Start must be before end"
        )

    with SessionLocal() as db:
        b = owner_business(
            db,
            int(user["id"])
        )

        if not b:
            raise HTTPException(
                400,
                "Create business first"
            )

        existing = (
            db.query(WorkingHour)
            .filter(
                WorkingHour.business_id == b.id,
                WorkingHour.weekday == x.weekday
            )
            .all()
        )

        for item in existing:
            db.delete(item)

        h = WorkingHour(
            business_id=b.id,
            **x.model_dump()
        )

        db.add(h)
        db.commit()
        db.refresh(h)

        return h

@app.delete("/admin/hours/{hour_id}")
def admin_delete_hour(hour_id:int,x_telegram_init_data:str=Header(default="")):
    user=telegram_user(x_telegram_init_data)
    with SessionLocal() as db:
        b=owner_business(db,int(user["id"]));h=db.get(WorkingHour,hour_id)
        if not b or not h or h.business_id!=b.id:raise HTTPException(404,"Hour not found")
        db.delete(h);db.commit();return {"ok":True}

@app.get("/admin/blocks")
def admin_blocks(
    day: Optional[date] = None,
    x_telegram_init_data: str = Header(default="")
):
    user = telegram_user(
        x_telegram_init_data
    )

    with SessionLocal() as db:
        b = owner_business(
            db,
            int(user["id"])
        )

        if not b:
            return []

        # Автоматически удаляем блокировки,
        # которые относятся к предыдущим дням.
        today = datetime.now().date()

        db.query(BlockedSlot).filter(
            BlockedSlot.business_id == b.id,
            BlockedSlot.day < today
        ).delete(
            synchronize_session=False
        )

        db.commit()

        q = db.query(BlockedSlot).filter_by(
            business_id=b.id
        )

        if day:
            q = q.filter_by(day=day)

        return q.order_by(
            BlockedSlot.day,
            BlockedSlot.start
        ).all()

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
def get_business(slug: str):
    with SessionLocal() as db:
        b = db.query(Business).filter_by(slug=slug).first()

        if not b:
            raise HTTPException(
                404,
                "Business not found"
            )

        if not b.subscription_active:
            raise HTTPException(
                403,
                "Business is not active"
            )

        services = db.query(Service).filter_by(
            business_id=b.id,
            active=True
        ).all()

        return {
            "business": b,
            "services": services
        }


@app.get("/businesses/{slug}/qr.png")
def business_qr(
    slug: str,
    bot_username: str = "BooklyBot"
):
    with SessionLocal() as db:
        b = db.query(Business).filter_by(
            slug=slug
        ).first()

        if not b:
            raise HTTPException(
                404,
                "Business not found"
            )

        if not b.subscription_active:
            raise HTTPException(
                403,
                "Business is not active"
            )

    bot_username = bot_username.strip().lstrip("@")

    client_link = (
        f"https://t.me/"
        f"{bot_username}"
        f"?startapp={slug}"
    )

    qr = qrcode.QRCode(
        version=None,
        error_correction=qrcode.constants.ERROR_CORRECT_H,
        box_size=10,
        border=4
    )

    qr.add_data(client_link)
    qr.make(fit=True)

    image = qr.make_image(
        fill_color="black",
        back_color="white"
    )

    buffer = io.BytesIO()
    image.save(
        buffer,
        format="PNG"
    )

    return Response(
        content=buffer.getvalue(),
        media_type="image/png",
        headers={
            "Content-Disposition": (
                f'attachment; filename="{slug}-bookly-qr.png"'
            ),
            "Access-Control-Allow-Origin": "*"
        }
    )
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
# ---------- subscription management ----------

PADDLE_API_KEY = os.getenv(
    "PADDLE_API_KEY",
    ""
)

PADDLE_API_BASE = os.getenv(
    "PADDLE_API_BASE",
    "https://api.paddle.com"
)

def _paddle_request(
    method: str,
    path: str,
    payload: Optional[dict] = None
):
    if not PADDLE_API_KEY:
        raise HTTPException(
            500,
            "Paddle API key is not configured"
        )

    body = (
        json.dumps(payload).encode("utf-8")
        if payload is not None
        else None
    )

    req = urllib_request.Request(
        f"{PADDLE_API_BASE}{path}",
        data=body,
        method=method,
        headers={
            "Authorization": f"Bearer {PADDLE_API_KEY}",
            "Content-Type": "application/json",
            "Accept": "application/json",
            "Paddle-Version": "1"
        }
    )

    try:
        with urllib_request.urlopen(
            req,
            timeout=20
        ) as response:
            raw = response.read().decode("utf-8")
            return json.loads(raw) if raw else {}

    except HTTPError as exc:
        try:
            raw = exc.read().decode("utf-8")
        except Exception:
            raw = ""

        raise HTTPException(
            502,
            f"Paddle API error {exc.code}: {raw[:3000]}"
        )

    except URLError as exc:
        raise HTTPException(
            502,
            f"Paddle connection error: {exc.reason}"
        )
def _paddle_update_bookly_subscription(
    subscription_id: str,
    new_limit: int,
    old_limit: int
):
    if not subscription_id.startswith("sub_"):
        raise HTTPException(
            400,
            "Paddle subscription ID is missing"
        )

    # Всегда строим подписку заново:
    # Bookly Pro + нужный Extra Services.
    # Старую цену $9.99 таким образом заменяем
    # на новую базовую цену $7.99.

    new_items = [
        {
            "price_id": PADDLE_BOOKLY_BASE_PRICE_ID,
            "quantity": 1
        }
    ]

    addon_price_id = (
        PADDLE_SERVICE_ADDON_PRICE_IDS.get(
            new_limit
        )
    )

    if addon_price_id:
        new_items.append(
            {
                "price_id": addon_price_id,
                "quantity": 1
            }
        )

    # Повышение лимита — берём разницу сразу.
    # Понижение — переносим перерасчёт на следующий
    # billing period.
    if new_limit > old_limit:
        proration_mode = (
            "prorated_immediately"
        )
    else:
        proration_mode = (
            "prorated_next_billing_period"
        )

    return _paddle_request(
        "PATCH",
        f"/subscriptions/{subscription_id}",
        {
            "items": new_items,
            "proration_billing_mode":
                proration_mode,
            "on_payment_failure":
                "prevent_change"
        }
    )
@app.post("/admin/subscription/preview-limit")
def preview_subscription_limit(
    x: SubscriptionLimitChangeIn,
    x_telegram_init_data: str = Header(
        default="",
        alias="X-Telegram-Init-Data"
    )
):
    user = telegram_user(
        x_telegram_init_data
    )

    with SessionLocal() as db:

        business = (
            db.query(Business)
            .filter(
                Business.owner_telegram_id
                == int(user["id"])
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
                Subscription.business_id
                == business.id
            )
            .first()
        )

        if not subscription:
            raise HTTPException(
                404,
                "Subscription not found"
            )

        if not subscription.external_subscription_id:
            raise HTTPException(
                400,
                "Paddle subscription ID is missing"
            )

        new_limit = x.services_limit

        new_items = [
            {
                "price_id":
                    PADDLE_BOOKLY_BASE_PRICE_ID,
                "quantity": 1
            }
        ]

        addon_price_id = (
            PADDLE_SERVICE_ADDON_PRICE_IDS.get(
                new_limit
            )
        )

        if addon_price_id:
            new_items.append(
                {
                    "price_id":
                        addon_price_id,
                    "quantity": 1
                }
            )

        proration_mode = (
            "prorated_immediately"
            if new_limit >
            subscription.current_services_limit
            else
            "prorated_next_billing_period"
        )

        price_check = _paddle_request(
            "GET",
            f"/prices/{PADDLE_BOOKLY_BASE_PRICE_ID}"
        )

        print("=== PADDLE PRICE CHECK ===")
        print(price_check)

        result = _paddle_request(
            "PATCH",
            (
                "/subscriptions/"
                f"{subscription.external_subscription_id}"
                "/preview"
            ),
            {
                "items": new_items,
                "proration_billing_mode":
                    proration_mode
            }
        )

        print("=== PADDLE PREVIEW RESULT ===")
        print(result)

        print("=== PREVIEW ITEMS ===")
        print(new_items)

        return result
@app.post("/admin/subscription/change-limit")
def change_subscription_limit(
    x: SubscriptionLimitChangeIn,
    x_telegram_init_data: str = Header(default="")
):
    user = telegram_user(
        x_telegram_init_data
    )

    owner_id = int(
        user["id"]
    )

    allowed_limits = {
        10,
        20,
        30,
        50,
        100
    }

    if x.services_limit not in allowed_limits:
        raise HTTPException(
            400,
            "Недопустимый лимит услуг"
        )

    with SessionLocal() as db:
        business = owner_business(
            db,
            owner_id
        )

        if not business:
            business = (
                db.query(Business)
                .filter(
                    Business.owner_telegram_id == owner_id
                )
                .order_by(Business.id.asc())
                .first()
            )

        if not business:
            raise HTTPException(
                404,
                "Business not found"
            )

        subscription = owner_subscription(
            db,
            business.id
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

        current_limit = (
            subscription.current_services_limit
            or 10
        )

        if x.services_limit == current_limit:
            return {
                "ok": True,
                "current_services_limit": current_limit,
                "current_price": float(
                    subscription.current_price
                    or 7.99
                ),
                "pending_services_limit": None,
                "pending_price": None
            }

        price_by_limit = {
            10: 7.99,
            20: 12.98,
            30: 15.98,
            50: 19.98,
            100: 27.98
        }

        new_price = price_by_limit[
            x.services_limit
        ]

        _paddle_update_bookly_subscription(
            subscription.external_subscription_id,
            x.services_limit,
            current_limit
        )

        subscription.current_services_limit = (
            x.services_limit
        )
        subscription.current_price = new_price
        subscription.pending_services_limit = None
        subscription.pending_price = None

        db.commit()

        return {
            "ok": True,
            "current_services_limit": (
                subscription.current_services_limit
            ),
            "current_price": float(
                subscription.current_price
            ),
            "pending_services_limit": None,
            "pending_price": None
        }
@app.post("/admin/subscription/cancel")
def cancel_subscription(
    x_telegram_init_data: str = Header(default="")
):
    user = telegram_user(
        x_telegram_init_data
    )

    owner_id = int(
        user["id"]
    )

    with SessionLocal() as db:

        business = owner_business(
            db,
            owner_id
        )

        if not business:
            raise HTTPException(
                404,
                "Business not found"
            )

        subscription = owner_subscription(
            db,
            business.id
        )

        if not subscription:
            raise HTTPException(
                400,
                "Subscription not found"
            )

        subscription_id = (
            subscription.external_subscription_id or ""
        ).strip()

        if not subscription_id.startswith("sub_"):
            raise HTTPException(
                400,
                "Invalid Paddle subscription ID"
            )

        payload = json.dumps({
            "scheduled_change": {
                "action": "cancel",
                "effective_at": "next_billing_period"
            }
        }).encode("utf-8")

        req = urllib_request.Request(
            f"{PADDLE_API_BASE}/subscriptions/{subscription_id}",
            data=payload,
            headers={
                "Authorization":
                    f"Bearer {PADDLE_API_KEY}",
                "Content-Type":
                    "application/json",
                "Paddle-Version":
                    "1"
            },
            method="PATCH"
        )

        try:
            with urllib_request.urlopen(
                req,
                timeout=20
            ) as response:

                data = json.loads(
                    response.read().decode("utf-8")
                )

        except Exception as e:

            error_body = ""

            if hasattr(e, "read"):
                try:
                    error_body = (
                        e.read().decode("utf-8")
                    )
                except Exception:
                    pass

            raise HTTPException(
                502,
                f"Paddle cancellation failed: {error_body[:1000]}"
            )

        paddle_data = data.get(
            "data",
            {}
        )

        scheduled_change = (
            paddle_data.get(
                "scheduled_change"
            )
            or {}
        )

        effective_at = (
            scheduled_change.get(
                "effective_at"
            )
        )

        subscription.status = "cancelled"

        # Доступ сохраняется до конца оплаченного периода
        subscription.active = True

        if effective_at:
            try:
                subscription.expires_at = (
                    datetime.fromisoformat(
                        effective_at.replace(
                            "Z",
                            "+00:00"
                        )
                    ).replace(
                        tzinfo=None
                    )
                )
            except ValueError:
                pass

        db.commit()

        return {
            "ok": True,
            "cancelled": True,
            "already_scheduled": False,
            "subscription_id":
                subscription_id,
            "access_until":
                subscription.expires_at.isoformat()
                if subscription.expires_at
                else None
        }
@app.post("/admin/subscription/resume")
def resume_subscription(
    x_telegram_init_data: str = Header(default="")
):
    user = telegram_user(
        x_telegram_init_data
    )

    owner_id = int(
        user["id"]
    )

    with SessionLocal() as db:

        business = owner_business(
            db,
            owner_id
        )

        if not business:
            raise HTTPException(
                404,
                "Business not found"
            )

        subscription = owner_subscription(
            db,
            business.id
        )

        if not subscription:
            raise HTTPException(
                400,
                "Subscription not found"
            )

        subscription_id = (
            subscription.external_subscription_id or ""
        ).strip()

        if not subscription_id.startswith("sub_"):
            raise HTTPException(
                400,
                "Invalid Paddle subscription ID"
            )

        payload = json.dumps({
            "scheduled_change": None
        }).encode("utf-8")

        req = urllib_request.Request(
            f"{PADDLE_API_BASE}/subscriptions/{subscription_id}",
            data=payload,
            headers={
                "Authorization":
                    f"Bearer {PADDLE_API_KEY}",
                "Content-Type":
                    "application/json",
                "Paddle-Version":
                    "1"
            },
            method="PATCH"
        )

        try:
            with urllib_request.urlopen(
                req,
                timeout=20
            ) as response:

                data = json.loads(
                    response.read().decode("utf-8")
                )

        except Exception as e:

            error_body = ""

            if hasattr(e, "read"):
                try:
                    error_body = (
                        e.read().decode("utf-8")
                    )
                except Exception:
                    pass

            raise HTTPException(
                502,
                f"Paddle resume failed: {error_body[:1000]}"
            )

        paddle_data = data.get(
            "data",
            {}
        )

        subscription.status = "active"
        subscription.active = True

        next_billed_at = (
            paddle_data.get(
                "next_billed_at"
            )
        )

        if next_billed_at:
            try:
                subscription.expires_at = (
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

        db.commit()

        return {
            "ok": True,
            "resumed": True
        }
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
    try:
        if abs(
            int(datetime.utcnow().timestamp()) -
            int(ts)
        ) > 5:
            raise HTTPException(
                401,
                "Expired Paddle webhook"
            )
    except ValueError:
        raise HTTPException(
            401,
            "Invalid Paddle timestamp"
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

    # В subscription events ID самой data —
    # это sub_....
    #
    # В transaction events data.id —
    # это txn_...., поэтому берем
    # отдельное data.subscription_id.
    subscription_id = ""

    if event_type in {
        "subscription.created",
        "subscription.updated",
        "subscription.resumed",
        "subscription.paused",
        "subscription.canceled"
    }:
        subscription_id = str(
            data.get(
                "id",
                ""
            )
            or ""
        )

    elif event_type.startswith(
        "transaction."
    ):
        subscription_id = str(
            data.get(
                "subscription_id",
                ""
            )
            or ""
        )

    billing_period = data.get(
        "current_billing_period",
        {}
    ) or {}

    next_billed_at = (
        data.get(
            "next_billed_at"
        )
        or
        billing_period.get(
            "ends_at"
        )
    )

    with SessionLocal() as db:

        b = None

        # Для новых оплат сначала пытаемся
        # найти конкретный выбранный бизнес.
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

        # Совместимость со старыми платежами.
        if not b and owner_id:
            b = owner_business(
                db,
                int(owner_id)
            )

        if not b:
            return {
                "received": True
            }

                # ---------------------------------------------------------
        # Подписка принадлежит конкретному бизнесу
        # ---------------------------------------------------------

        subscription = (
            db.query(Subscription)
            .filter(
                Subscription.business_id == b.id
            )
            .first()
        )

        # Если подписки ещё нет — создаём её
        if not subscription:

            subscription = Subscription(
                business_id=b.id,
                owner_telegram_id=b.owner_telegram_id,
                plan="pro",
                active=False,
                status="inactive",
                current_services_limit=10,
                current_price=7.99
            )

            db.add(subscription)
            db.flush()

        # ---------------------------------------------------------
        # Paddle subscription ID
        # ---------------------------------------------------------

        if subscription_id.startswith("sub_"):

            subscription.external_subscription_id = (
                subscription_id
            )

        subscription.payment_provider = "paddle"

        # ---------------------------------------------------------
        # Запланированная отмена
        # ---------------------------------------------------------

        scheduled_change = (
            data.get(
                "scheduled_change",
                {}
            )
            or {}
        )

        scheduled_action = (
            scheduled_change.get(
                "action"
            )
        )

        scheduled_effective_at = (
            scheduled_change.get(
                "effective_at"
            )
        )

        if scheduled_action == "cancel":

            subscription.status = "cancelled"

            # Подписка остаётся активной
            # до окончания оплаченного периода.
            subscription.active = True

            if scheduled_effective_at:

                try:

                    subscription.expires_at = (
                        datetime.fromisoformat(
                            scheduled_effective_at.replace(
                                "Z",
                                "+00:00"
                            )
                        ).replace(
                            tzinfo=None
                        )
                    )

                except ValueError:
                    pass

        # ---------------------------------------------------------
        # Успешная подписка / успешное продление
        # ---------------------------------------------------------

        elif event_type in {
            "transaction.completed",
            "subscription.created",
            "subscription.updated",
            "subscription.resumed"
        }:

            if status:

                subscription.status = status

            subscription.active = (
                status
                not in {
                    "canceled",
                    "cancelled",
                    "paused"
                }
            )

            if next_billed_at:

                try:

                    subscription.expires_at = (
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

            # -----------------------------------------------------
            # Применяем запланированное изменение тарифа
            #
            # Например:
            #
            # current = 10 / $7.99
            # pending = 30 / $15.98
            #
            # После успешного продления:
            #
            # current = 30 / $15.98
            # pending = None
            # -----------------------------------------------------

            if subscription.pending_services_limit is not None:

                subscription.current_services_limit = (
                    subscription.pending_services_limit
                )

                subscription.pending_services_limit = None

            if subscription.pending_price is not None:

                subscription.current_price = (
                    subscription.pending_price
                )

                subscription.pending_price = None

        # ---------------------------------------------------------
        # Отмена / пауза
        # ---------------------------------------------------------

        elif event_type in {
            "subscription.canceled",
            "subscription.paused"
        }:

            if (
                subscription.expires_at
                and
                subscription.expires_at
                > datetime.utcnow()
            ):

                subscription.active = True

            else:

                subscription.active = False

        # ---------------------------------------------------------
        # Неуспешный платёж
        # ---------------------------------------------------------

        elif event_type == (
            "transaction.payment_failed"
        ):

            if (
                subscription.expires_at
                and
                subscription.expires_at
                > datetime.utcnow()
            ):

                subscription.active = True

            else:

                subscription.active = False

                # ---------------------------------------------------------
        # Синхронизируем статус подписки с Business
        # ---------------------------------------------------------

        b.subscription_active = bool(
            subscription.active
        )

        b.subscription_expires_at = (
            subscription.expires_at
        )

        b.subscription_status = (
            "active"
            if subscription.active
            else (
                subscription.status
                or "inactive"
            )
        )

        b.payment_provider = (
            subscription.payment_provider
            or "paddle"
        )

        b.external_subscription_id = (
            subscription.external_subscription_id
        )

        db.commit()

    return {
        "received": True
    }

# ---------------------------------------------------------
# Неуспешный платёж
# ---------------------------------------------------------

@app.post("/payments/webhook/{provider}")
def payment_webhook(
    provider: str,
    payload: dict
):
    if provider not in {
        "uzum"
    }:
        raise HTTPException(
            400,
            "Use the provider-specific webhook"
        )

    return {
        "received": True,
        "provider": provider,
        "status":
            "awaiting merchant callback mapping"
    }
@app.post("/payments/webhook/{provider}")
def payment_webhook(provider:str,payload:dict):
    if provider not in {"uzum"}:raise HTTPException(400,"Use the provider-specific webhook")
    return {"received":True,"provider":provider,"status":"awaiting merchant callback mapping"}
