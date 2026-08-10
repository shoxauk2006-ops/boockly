import os, asyncio
from aiogram import Bot, Dispatcher
from aiogram.filters import CommandStart
from aiogram.types import Message, InlineKeyboardMarkup, InlineKeyboardButton

TOKEN=os.getenv("BOT_TOKEN")
WEBAPP_URL=os.getenv("WEBAPP_URL","https://YOUR-DOMAIN.example")
BOT_USERNAME=os.getenv("BOT_USERNAME","BooklyBot")

async def main():
    if not TOKEN: raise RuntimeError("Set BOT_TOKEN")
    bot=Bot(TOKEN); dp=Dispatcher()
    @dp.message(CommandStart())
    async def start(message: Message):
        args=(message.text or '').split(maxsplit=1)
        slug=args[1] if len(args)>1 else ''
        url=WEBAPP_URL + (f"?startapp={slug}" if slug else '')
        kb=InlineKeyboardMarkup(inline_keyboard=[[InlineKeyboardButton(text="Открыть Bookly", web_app=WebAppInfo(url=url))]])
        await message.answer("Bookly — бронирование внутри Telegram.\n\nОткройте приложение:", reply_markup=kb)
    await dp.start_polling(bot)

if __name__=="__main__": asyncio.run(main())
