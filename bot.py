import os, asyncio, json, time, hmac, hashlib, urllib.parse, urllib.request
from aiogram import Bot, Dispatcher
from aiogram.filters import CommandStart
from aiogram.types import Message, InlineKeyboardMarkup, InlineKeyboardButton, WebAppInfo

TOKEN=os.getenv("BOT_TOKEN")
WEBAPP_URL=os.getenv("WEBAPP_URL","https://YOUR-DOMAIN.example")
BOT_USERNAME=os.getenv("BOT_USERNAME","BooklyBot")
API_URL=(os.getenv("BOOKLY_API_URL") or os.getenv("PUBLIC_API_URL") or "http://api:8000").rstrip("/")

BOOKLY_BOT_TEXTS={
  "ru": ("Открыть Bookly", "Bookly — бронирование внутри Telegram.\n\nОткройте приложение:"),
  "en": ("Open Bookly", "Bookly — booking inside Telegram.\n\nOpen the app:"),
  "uz": ("Bookly’ni ochish", "Bookly — Telegram ichida bron qilish.\n\nIlovani oching:"),
  "tr": ("Bookly’yi aç", "Bookly — Telegram içinde rezervasyon.\n\nUygulamayı açın:"),
  "ar": ("فتح Bookly", "Bookly — الحجز داخل Telegram.\n\nافتح التطبيق:"),
}

def normalize_bot_language(code):
    code=(code or "").lower()
    for x in ("ru","uz","tr","ar"):
        if code.startswith(x): return x
    return "en"


def build_telegram_init_data(user_id: int, username: str = "", first_name: str = "", last_name: str = "") -> str:
    """Create server-valid Telegram initData for the bot itself.

    This is used only server-to-server so the bot can finish the pending
    web-to-Telegram connection before the Mini App button is opened.
    """
    user = {
        "id": int(user_id),
        "first_name": first_name or "Telegram User",
    }
    if last_name:
        user["last_name"] = last_name
    if username:
        user["username"] = username

    pairs = {
        "auth_date": str(int(time.time())),
        "user": json.dumps(user, separators=(",", ":"), ensure_ascii=False),
    }
    data_check_string = "\n".join(
        f"{key}={pairs[key]}" for key in sorted(pairs)
    )
    secret_key = hmac.new(
        b"WebAppData",
        TOKEN.encode("utf-8"),
        hashlib.sha256,
    ).digest()
    pairs["hash"] = hmac.new(
        secret_key,
        data_check_string.encode("utf-8"),
        hashlib.sha256,
    ).hexdigest()
    return urllib.parse.urlencode(pairs)


def connect_pending_token(token: str, user) -> bool:
    """Consume the pending website connection token before opening Mini App."""
    if not token or not token.startswith("bookly-connect-"):
        return False
    try:
        init_data = build_telegram_init_data(
            user.id,
            getattr(user, "username", "") or "",
            getattr(user, "first_name", "") or "",
            getattr(user, "last_name", "") or "",
        )
        payload = json.dumps({"token": token}).encode("utf-8")
        request = urllib.request.Request(
            API_URL + "/account/connect-telegram-from-web",
            data=payload,
            headers={
                "Content-Type": "application/json",
                "X-Telegram-Init-Data": init_data,
            },
            method="POST",
        )
        with urllib.request.urlopen(request, timeout=8) as response:
            response.read()
        return True
    except Exception as exc:
        print(f"Bookly Telegram connection failed: {exc}", flush=True)
        return False


async def main():
    if not TOKEN: raise RuntimeError("Set BOT_TOKEN")
    bot=Bot(TOKEN); dp=Dispatcher()

    @dp.message(CommandStart())
    async def start(message: Message):
        args=(message.text or '').split(maxsplit=1)
        slug=args[1] if len(args)>1 else ''

        # Finish the web -> Telegram connection on the bot side first.
        # The Mini App button then opens the normal Bookly URL, so the
        # connection no longer depends on Telegram preserving a token inside
        # a WebAppInfo URL.
        if slug.startswith("bookly-connect-") and message.from_user:
            connected = await asyncio.to_thread(
                connect_pending_token,
                slug,
                message.from_user,
            )
            if not connected:
                print("Bookly connection token was not consumed; opening Bookly anyway.", flush=True)

        url=WEBAPP_URL
        lang=normalize_bot_language(getattr(message.from_user, "language_code", None))
        button_text, answer_text = BOOKLY_BOT_TEXTS[lang]
        kb=InlineKeyboardMarkup(inline_keyboard=[[InlineKeyboardButton(text=button_text, web_app=WebAppInfo(url=url))]])
        await message.answer(answer_text, reply_markup=kb)

    await dp.start_polling(bot)

if __name__=="__main__": asyncio.run(main())
