"""Bookly reminder worker. Run alongside the API in production."""
import os, asyncio, json
from datetime import datetime, timedelta
from urllib import request as urllib_request
from urllib.error import URLError
from backend.app import SessionLocal, Booking, Business, Service

BOT_TOKEN=os.getenv("BOT_TOKEN","")

def send(chat_id, text):
    if not BOT_TOKEN: return
    req=urllib_request.Request(
        f"https://api.telegram.org/bot{BOT_TOKEN}/sendMessage",
        data=json.dumps({"chat_id":chat_id,"text":text}).encode(),
        headers={"Content-Type":"application/json"}, method="POST")
    try:
        urllib_request.urlopen(req,timeout=8).read()
    except (URLError, TimeoutError):
        pass

async def tick():
    now=datetime.now()
    with SessionLocal() as db:
        bookings=db.query(Booking).filter(Booking.status=="confirmed").all()
        for b in bookings:
            when=datetime.combine(b.day,b.start)
            delta=when-now
            if timedelta(hours=23, minutes=0) <= delta <= timedelta(hours=25) and not b.reminder_24_sent:
                send(b.client_telegram_id, f"🔔 Напоминание о записи в Bookly\n\n📅 {b.day.isoformat()}\n🕐 {b.start.strftime('%H:%M')}–{b.end.strftime('%H:%M')}")
                business=db.get(Business,b.business_id)
                if business: send(business.owner_telegram_id, f"🔔 Напоминание: запись #{b.id} завтра в {b.start.strftime('%H:%M')}")
                b.reminder_24_sent=True
            if timedelta(minutes=90) <= delta <= timedelta(hours=2, minutes=30) and not b.reminder_2_sent:
                send(b.client_telegram_id, f"⏰ Ваша запись сегодня в {b.start.strftime('%H:%M')}")
                b.reminder_2_sent=True
        db.commit()

async def main():
    while True:
        await tick()
        await asyncio.sleep(60)

if __name__=="__main__": asyncio.run(main())
