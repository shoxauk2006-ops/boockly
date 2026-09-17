from __future__ import annotations

import hashlib
import hmac
import json
import os
import secrets
import time
import urllib.parse
import urllib.request
from datetime import datetime, timedelta

import jwt
from fastapi import Form, HTTPException, Request
from fastapi.responses import RedirectResponse
from pydantic import BaseModel, Field
from sqlalchemy import DateTime, Integer, String, UniqueConstraint
from sqlalchemy.orm import Mapped, mapped_column

from .app import Base, Business, SessionLocal, app, engine
from .account_routes import BooklyAccount, _hash_password, _new_session


class BooklyOAuthIdentity(Base):
    __tablename__ = "bookly_oauth_identities"
    __table_args__ = (UniqueConstraint("provider", "subject", name="uq_bookly_oauth_provider_subject"),)

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
FRONTEND_URL = os.getenv(
    "BOOKLY_FRONTEND_URL",
    "https://boockly-73y5ili9l-shoxauk2006-4950s-projects.vercel.app",
).rstrip("/")
PUBLIC_API_URL = os.getenv("BOOKLY_PUBLIC_API_URL", "https://boockly-3.onrender.com").rstrip("/")


def _redirect(provider: str) -> str:
    return f"{PUBLIC_API_URL}/account/oauth/{provider}/callback"


def _error_redirect() -> RedirectResponse:
    return RedirectResponse(f"{FRONTEND_URL}/account.html?oauth_error=1", status_code=303)


def _post_form(url: str, data: dict[str, str]) -> dict:
    body = urllib.parse.urlencode(data).encode("utf-8")
    req = urllib.request.Request(
        url,
        data=body,
        headers={"Content-Type": "application/x-www-form-urlencoded"},
        method="POST",
    )
    try:
        with urllib.request.urlopen(req, timeout=20) as response:
            return json.loads(response.read().decode("utf-8"))
    except Exception as exc:
        raise HTTPException(502, f"OAuth provider request failed: {exc}")


def _get_json(url: str, headers: dict[str, str] | None = None) -> dict:
    req = urllib.request.Request(url, headers=headers or {}, method="GET")
    try:
        with urllib.request.urlopen(req, timeout=20) as response:
            return json.loads(response.read().decode("utf-8"))
    except Exception as exc:
        raise HTTPException(502, f"OAuth provider request failed: {exc}")


def _create_default_business(db, account: BooklyAccount) -> Business:
    business = Business(
        account_id=account.id,
        owner_telegram_id=-int(account.id),
        name="My Business",
        slug=f"account-{account.id}-{secrets.token_hex(4)}",
        subscription_active=False,
        subscription_status="inactive",
    )
    db.add(business)
    db.flush()
    account.business_id = business.id
    return business


def _finish(provider: str, subject: str, email: str | None) -> str:
    subject = (subject or "").strip()
    email = (email or "").strip().lower()
    if not subject:
        raise HTTPException(400, "OAuth provider did not return a subject")

    with SessionLocal() as db:
        identity = (
            db.query(BooklyOAuthIdentity)
            .filter(BooklyOAuthIdentity.provider == provider)
            .filter(BooklyOAuthIdentity.subject == subject)
            .first()
        )

        is_new = False
        if identity:
            account = db.get(BooklyAccount, identity.account_id)
            if not account:
                raise HTTPException(500, "OAuth account mapping is invalid")
            if email:
                identity.email = email
        else:
            if not email or "@" not in email:
                raise HTTPException(400, "OAuth provider did not return a valid email")
            account = db.query(BooklyAccount).filter(BooklyAccount.email == email).first()
            if not account:
                account = BooklyAccount(
                    email=email,
                    password_hash=_hash_password(secrets.token_urlsafe(32)),
                )
                db.add(account)
                db.flush()
                _create_default_business(db, account)
                is_new = True
            identity = BooklyOAuthIdentity(
                provider=provider,
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
def google_start():
    client_id = os.getenv("GOOGLE_CLIENT_ID", "").strip()
    client_secret = os.getenv("GOOGLE_CLIENT_SECRET", "").strip()
    if not client_id or not client_secret:
        raise HTTPException(503, "Google OAuth is not configured")

    state = secrets.token_urlsafe(32)
    params = {
        "client_id": client_id,
        "redirect_uri": _redirect("google"),
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
    return response


@app.get("/account/oauth/google/callback")
def google_callback(request: Request):
    client_id = os.getenv("GOOGLE_CLIENT_ID", "").strip()
    client_secret = os.getenv("GOOGLE_CLIENT_SECRET", "").strip()
    state = request.query_params.get("state", "")
    code = request.query_params.get("code", "")
    saved_state = request.cookies.get("bookly_oauth_state_google", "")
    if not client_id or not client_secret or not code or not saved_state or not hmac.compare_digest(state, saved_state):
        return _error_redirect()

    tokens = _post_form("https://oauth2.googleapis.com/token", {
        "client_id": client_id,
        "client_secret": client_secret,
        "code": code,
        "grant_type": "authorization_code",
        "redirect_uri": _redirect("google"),
    })
    access_token = tokens.get("access_token")
    if not access_token:
        return _error_redirect()

    profile = _get_json(
        "https://openidconnect.googleapis.com/v1/userinfo",
        {"Authorization": f"Bearer {access_token}"},
    )
    if not profile.get("sub") or not profile.get("email") or profile.get("email_verified") is not True:
        return _error_redirect()

    raw = _finish("google", str(profile["sub"]), str(profile["email"]))
    response = RedirectResponse(
        f"{FRONTEND_URL}/account.html?oauth_code={urllib.parse.quote(raw)}",
        status_code=303,
    )
    response.delete_cookie("bookly_oauth_state_google")
    return response


@app.get("/account/oauth/apple/start")
def apple_start():
    client_id = os.getenv("APPLE_CLIENT_ID", "").strip()
    if not client_id:
        raise HTTPException(503, "Apple OAuth is not configured")

    state = secrets.token_urlsafe(32)
    nonce = secrets.token_urlsafe(32)
    params = {
        "client_id": client_id,
        "redirect_uri": _redirect("apple"),
        "response_type": "code",
        "response_mode": "form_post",
        "scope": "name email",
        "state": state,
        "nonce": nonce,
    }
    target = "https://appleid.apple.com/auth/authorize?" + urllib.parse.urlencode(params)
    response = RedirectResponse(target, status_code=303)
    response.set_cookie("bookly_oauth_state_apple", state, max_age=STATE_SECONDS, httponly=True, secure=True, samesite="lax")
    response.set_cookie("bookly_oauth_nonce_apple", nonce, max_age=STATE_SECONDS, httponly=True, secure=True, samesite="lax")
    return response


@app.post("/account/oauth/apple/callback")
def apple_callback(
    request: Request,
    code: str = Form(default=""),
    state: str = Form(default=""),
    id_token: str = Form(default=""),
    user: str = Form(default=""),
):
    client_id = os.getenv("APPLE_CLIENT_ID", "").strip()
    team_id = os.getenv("APPLE_TEAM_ID", "").strip()
    key_id = os.getenv("APPLE_KEY_ID", "").strip()
    private_key = os.getenv("APPLE_PRIVATE_KEY", "").replace("\\n", "\n").strip()
    saved_state = request.cookies.get("bookly_oauth_state_apple", "")
    if not client_id or not team_id or not key_id or not private_key or not code or not saved_state or not hmac.compare_digest(state, saved_state):
        return _error_redirect()

    now = int(time.time())
    client_secret = jwt.encode(
        {
            "iss": team_id,
            "iat": now,
            "exp": now + 15552000,
            "aud": "https://appleid.apple.com",
            "sub": client_id,
        },
        private_key,
        algorithm="ES256",
        headers={"kid": key_id},
    )

    tokens = _post_form("https://appleid.apple.com/auth/token", {
        "client_id": client_id,
        "client_secret": client_secret,
        "code": code,
        "grant_type": "authorization_code",
        "redirect_uri": _redirect("apple"),
    })
    id_token = tokens.get("id_token") or id_token
    if not id_token:
        return _error_redirect()

    try:
        jwks = jwt.PyJWKClient("https://appleid.apple.com/auth/keys")
        signing_key = jwks.get_signing_key_from_jwt(id_token)
        claims = jwt.decode(
            id_token,
            signing_key.key,
            algorithms=["RS256"],
            audience=client_id,
            issuer="https://appleid.apple.com",
            options={"require": ["sub", "iss", "aud", "exp", "iat"]},
        )
        expected_nonce = request.cookies.get("bookly_oauth_nonce_apple", "")
        if expected_nonce and claims.get("nonce") != expected_nonce:
            return _error_redirect()
    except Exception:
        return _error_redirect()

    email = str(claims.get("email") or "").strip().lower()
    if not email and user:
        try:
            email = str(json.loads(user).get("email") or "").strip().lower()
        except Exception:
            pass

    raw = _finish("apple", str(claims["sub"]), email or None)
    response = RedirectResponse(
        f"{FRONTEND_URL}/account.html?oauth_code={urllib.parse.quote(raw)}",
        status_code=303,
    )
    response.delete_cookie("bookly_oauth_state_apple")
    response.delete_cookie("bookly_oauth_nonce_apple")
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
            raise HTTPException(400, "Invalid or expired OAuth handoff")
        handoff.used_at = datetime.utcnow()
        token = _new_session(db, handoff.account_id)
        account = db.get(BooklyAccount, handoff.account_id)
        db.commit()
        return {
            "ok": True,
            "token": token,
            "account": {"id": account.id, "email": account.email, "business_id": account.business_id},
            "next": "choose_plan" if handoff.is_new_account else "account",
        }
