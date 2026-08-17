import os, asyncio
from aiogram import Bot, Dispatcher
from aiogram.filters import CommandStart
from aiogram.types import Message, InlineKeyboardMarkup, InlineKeyboardButton, WebAppInfo

TOKEN=os.getenv("BOT_TOKEN")
WEBAPP_URL=os.getenv("WEBAPP_URL","https://YOUR-DOMAIN.example")
BOT_USERNAME=os.getenv("BOT_USERNAME","BooklyBot")

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


async def main():
    if not TOKEN: raise RuntimeError("Set BOT_TOKEN")
    bot=Bot(TOKEN); dp=Dispatcher()
    @dp.message(CommandStart())
    async def start(message: Message):
        args=(message.text or '').split(maxsplit=1)
        slug=args[1] if len(args)>1 else ''
        url=WEBAPP_URL + (f"?startapp={slug}" if slug else '')
        lang=normalize_bot_language(getattr(message.from_user, "language_code", None))
        button_text, answer_text = BOOKLY_BOT_TEXTS[lang]
        kb=InlineKeyboardMarkup(inline_keyboard=[[InlineKeyboardButton(text=button_text, web_app=WebAppInfo(url=url))]])
        await message.answer(answer_text, reply_markup=kb)
    await dp.start_polling(bot)

if __name__=="__main__": asyncio.run(main())
