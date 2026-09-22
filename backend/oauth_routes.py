from __future__ import annotations

import hashlib
import hmac
import json
import os
import secrets
import urllib.parse
import urllib.request
from datetime import datetime, timedelta

from fastapi import HTTPException, Request
from fastapi.responses import RedirectResponse
from pydantic import BaseModel, Field
from sqlalchemy import DateTime, Integer, String, UniqueConstraint
from sqlalchemy.orm import Mapped, mapped_column

from .app import Base, Business, SessionLocal, app, engine
from .account_routes import (
    BooklyAccount,
    PRIVACY_VERSION,
    TERMS_VERSION,
    _hash_password,
    _new_session,
)


class BooklyOAuthIdentity(Base):
    __tablename__ = "bookly_oauth_identities"
    __table_args__ = (
        UniqueConstraint("provider", "subject", name="uq_bookly_oauth_provider_subject"),
    )

    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    provider: Mapped[str] = mapped_column(String(20), index=True)
    subject: Mapped[str] = mapped_column(String(255), index=True)
    account_id: Mapped[int] = mapped_column(Integer, index=True)
    email: Mapped[str] = mapped_column(String(255), default="")
    created_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow)


class BooklyOAuthHandoff(Base):
    __tablename__ = "bookly_oauth_handoffs"

    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    token_hash: Mapped[str] = mapped_column(String(64), unique=True, index=True)
    account_id: Mapped[int] = mapped_column(Integer, index=True)
    is_new_account: Mapped[bool] = mapped_column(default=False)
    expires_at: Mapped[datetime] = mapped_column(DateTime, index=True)
    used_at: Mapped[datetime | None] = mapped_column(DateTime, nullable=True)
    created_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow)


Base.metadata.create_all(engine)

STATE_SECONDS = 600
HANDOFF_SECONDS = 600
CANONICAL_FRONTEND_URL = "https://skedwoo.vercel.app"
FRONTEND_URL = os.getenv(
    "BOOKLY_FRONTEND_URL",
    CANONICAL_FRONTEND_URL,
).rstrip("/")
PUBLIC_API_URL = os.getenv(
    "BOOKLY_PUBLIC_API_URL",
    "https://boockly-3.onrender.com",
).rstrip("/")


def _oauth_frontend_url() -> str:
    """
    OAuth must return users to the current Skedwoo production site.

    A stale Vercel preview URL can remain in Render environment
    variables after an old deployment. Preview deployments preserve
    old frontend code, so redirecting there can resurrect removed UI.
    Keep custom non-Vercel domains valid, but canonicalize any Skedwoo
    Vercel preview host to the stable production alias.
    """
    configured = (FRONTEND_URL or "").strip().rstrip("/")
    if not configured:
        return CANONICAL_FRONTEND_URL

    try:
        parsed = urllib.parse.urlparse(configured)
        host = (parsed.hostname or "").lower()

        if (
            host.endswith(".vercel.app")
            and host != "skedwoo.vercel.app"
        ):
            return CANONICAL_FRONTEND_URL
    except Exception:
        return CANONICAL_FRONTEND_URL

    return configured


def _redirect_uri() -> str:
    return f"{PUBLIC_API_URL}/account/oauth/google/callback"


def _frontend_error() -> RedirectResponse:
    return RedirectResponse(
        f"{_oauth_frontend_url()}/account.html?oauth_error=1",
        status_code=303,
    )


def _post_form(url: str, data: dict[str, str]) -> dict:
    body = urllib.parse.urlencode(data).encode("utf-8")
    request = urllib.request.Request(
        url,
        data=body,
        headers={"Content-Type": "application/x-www-form-urlencoded"},
        method="POST",
    )
    try:
        with urllib.request.urlopen(request, timeout=20) as response:
            return json.loads(response.read().decode("utf-8"))
    except Exception:
        raise HTTPException(502, "Google OAuth provider request failed")


def _get_json(url: str, headers: dict[str, str]) -> dict:
    request = urllib.request.Request(url, headers=headers, method="GET")
    try:
        with urllib.request.urlopen(request, timeout=20) as response:
            return json.loads(response.read().decode("utf-8"))
    except Exception:
        raise HTTPException(502, "Google OAuth provider request failed")


def _finish_google(subject: str, email: str, legal_accept: bool = False) -> str:
    subject = subject.strip()
    email = email.strip().lower()
    if not subject or "@" not in email:
        raise HTTPException(400, "Google did not return a valid account identity")

    with SessionLocal() as db:
        identity = (
            db.query(BooklyOAuthIdentity)
            .filter(BooklyOAuthIdentity.provider == "google")
            .filter(BooklyOAuthIdentity.subject == subject)
            .first()
        )

        is_new = False
        if identity:
            account = db.get(BooklyAccount, identity.account_id)
            if not account:
                raise HTTPException(500, "Google account mapping is invalid")
            identity.email = email
        else:
            account = db.query(BooklyAccount).filter(BooklyAccount.email == email).first()
            if not account:
                if not legal_accept:
                    raise HTTPException(
                        400,
                        "Terms acceptance is required for a new Skedwoo account",
                    )
                account = BooklyAccount(
                    email=email,
                    password_hash=_hash_password(secrets.token_urlsafe(32)),
                    terms_accepted_at=datetime.utcnow(),
                    terms_version=TERMS_VERSION,
                    privacy_version=PRIVACY_VERSION,
                )
                db.add(account)
                db.flush()
                is_new = True

            identity = BooklyOAuthIdentity(
                provider="google",
                subject=subject,
                account_id=account.id,
                email=email,
            )
            db.add(identity)

        raw = secrets.token_urlsafe(40)
        db.add(
            BooklyOAuthHandoff(
                token_hash=hashlib.sha256(raw.encode("utf-8")).hexdigest(),
                account_id=account.id,
                is_new_account=is_new,
                expires_at=datetime.utcnow() + timedelta(seconds=HANDOFF_SECONDS),
            )
        )
        db.commit()
        return raw


@app.get("/account/oauth/google/start")
def google_start(request: Request):
    client_id = os.getenv("GOOGLE_CLIENT_ID", "").strip()
    client_secret = os.getenv("GOOGLE_CLIENT_SECRET", "").strip()
    if not client_id or not client_secret:
        raise HTTPException(503, "Google OAuth is not configured")

    state = secrets.token_urlsafe(32)
    params = {
        "client_id": client_id,
        "redirect_uri": _redirect_uri(),
        "response_type": "code",
        "scope": "openid email profile",
        "state": state,
        "access_type": "online",
        "prompt": "select_account",
    }

    target = "https://accounts.google.com/o/oauth2/v2/auth?" + urllib.parse.urlencode(params)
    response = RedirectResponse(target, status_code=303)
    response.set_cookie(
        "bookly_oauth_state_google",
        state,
        max_age=STATE_SECONDS,
        httponly=True,
        secure=True,
        samesite="lax",
    )
    if request.query_params.get("legal_accept") == "1":
        response.set_cookie(
            "bookly_oauth_legal_accept",
            "1",
            max_age=STATE_SECONDS,
            httponly=True,
            secure=True,
            samesite="lax",
        )
    else:
        response.delete_cookie("bookly_oauth_legal_accept")
    return response


@app.get("/account/oauth/google/callback")
def google_callback(request: Request):
    client_id = os.getenv("GOOGLE_CLIENT_ID", "").strip()
    client_secret = os.getenv("GOOGLE_CLIENT_SECRET", "").strip()
    code = request.query_params.get("code", "")
    state = request.query_params.get("state", "")
    saved_state = request.cookies.get("bookly_oauth_state_google", "")

    if (
        not client_id
        or not client_secret
        or not code
        or not saved_state
        or not hmac.compare_digest(state, saved_state)
    ):
        return _frontend_error()

    tokens = _post_form(
        "https://oauth2.googleapis.com/token",
        {
            "client_id": client_id,
            "client_secret": client_secret,
            "code": code,
            "grant_type": "authorization_code",
            "redirect_uri": _redirect_uri(),
        },
    )

    access_token = str(tokens.get("access_token") or "")
    if not access_token:
        return _frontend_error()

    profile = _get_json(
        "https://openidconnect.googleapis.com/v1/userinfo",
        {"Authorization": f"Bearer {access_token}"},
    )

    if (
        not profile.get("sub")
        or not profile.get("email")
        or profile.get("email_verified") is not True
    ):
        return _frontend_error()

    try:
        handoff = _finish_google(
            str(profile["sub"]),
            str(profile["email"]),
            request.cookies.get("bookly_oauth_legal_accept", "") == "1",
        )
    except HTTPException as exc:
        if exc.status_code == 400 and "Terms acceptance" in str(exc.detail):
            response = RedirectResponse(
                f"{_oauth_frontend_url()}/account.html?terms_required=1",
                status_code=303,
            )
            response.delete_cookie("bookly_oauth_state_google")
            response.delete_cookie("bookly_oauth_legal_accept")
            return response
        raise
    response = RedirectResponse(
        f"{_oauth_frontend_url()}/account.html?oauth_code={urllib.parse.quote(handoff)}",
        status_code=303,
    )
    response.delete_cookie("bookly_oauth_state_google")
    response.delete_cookie("bookly_oauth_legal_accept")
    return response


class OAuthExchangeIn(BaseModel):
    code: str = Field(min_length=20, max_length=200)


@app.post("/account/oauth/exchange")
def oauth_exchange(x: OAuthExchangeIn):
    token_hash = hashlib.sha256(x.code.encode("utf-8")).hexdigest()

    with SessionLocal() as db:
        handoff = (
            db.query(BooklyOAuthHandoff)
            .filter(BooklyOAuthHandoff.token_hash == token_hash)
            .filter(BooklyOAuthHandoff.expires_at > datetime.utcnow())
            .filter(BooklyOAuthHandoff.used_at.is_(None))
            .first()
        )
        if not handoff:
            raise HTTPException(400, "Invalid or expired Google OAuth handoff")

        handoff.used_at = datetime.utcnow()
        token = _new_session(db, handoff.account_id)
        account = db.get(BooklyAccount, handoff.account_id)
        if not account:
            raise HTTPException(500, "Skedwoo account not found")
        db.commit()

        return {
            "ok": True,
            "token": token,
            "account": {
                "id": account.id,
                "email": account.email,
                "business_id": account.business_id,
            },
            "next": "setup_business" if handoff.is_new_account else "account",
        }
