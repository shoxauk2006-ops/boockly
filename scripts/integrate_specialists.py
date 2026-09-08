from pathlib import Path


def replace_once(text, old, new, label):
    if old not in text:
        raise SystemExit(f"{label}: pattern not found")
    return text.replace(old, new, 1)


# ---------------- backend ----------------
app_path = Path("backend/app.py")
app = app_path.read_text()

old = '''class BookingIn(BaseModel):
    business_id: int
    service_id: int
    client_telegram_id: int = 0
    client_name: str = "Telegram user"
    client_phone: str = ""
    day: date
    start: time
    client_timezone: str = "UTC"
    
class AdminBookingIn'''
new = '''class BookingIn(BaseModel):
    business_id: int
    service_id: int
    specialist_id: Optional[int] = None
    client_telegram_id: int = 0
    client_name: str = "Telegram user"
    client_phone: str = ""
    day: date
    start: time
    client_timezone: str = "UTC"
    
class AdminBookingIn'''
app = replace_once(app, old, new, "BookingIn")

start = app.index("def get_work_windows(db, business_id:int, day:date):")
end = app.index("def is_free(", start)
work_windows = '''def get_work_windows(db, business_id:int, day:date, specialist_id: Optional[int] = None):
    if specialist_id is not None:
        specialist_hours = (
            db.query(SpecialistWorkingHour)
            .filter_by(specialist_id=specialist_id, weekday=day.weekday(), active=True)
            .order_by(SpecialistWorkingHour.start)
            .all()
        )
        if specialist_hours:
            return [(h.start, h.end) for h in specialist_hours]

    hours = (
        db.query(WorkingHour)
        .filter_by(business_id=business_id, weekday=day.weekday(), active=True)
        .order_by(WorkingHour.start)
        .all()
    )
    if hours:
        return [(h.start, h.end) for h in hours]
    return [(time(9,0),time(18,0))]

'''
app = app[:start] + work_windows + app[end:]

start = app.index("def is_free(")
end = app.index('@app.get("/businesses/{slug}")', start)
is_free = '''def is_free(
    db,
    business_id: int,
    day: date,
    st: time,
    en: time,
    timezone_name: str | None = None,
    specialist_id: Optional[int] = None
):
    zone = _bookly_zone(timezone_name or "Asia/Tashkent")
    start_at_utc = _bookly_to_utc(datetime.combine(day, st, tzinfo=zone))
    end_at_utc = _bookly_to_utc(datetime.combine(day, en, tzinfo=zone))

    booking_query = db.query(Booking).filter(
        Booking.business_id == business_id,
        Booking.status == "confirmed",
        Booking.start_at_utc.is_not(None),
        Booking.end_at_utc.is_not(None),
        Booking.start_at_utc < end_at_utc,
        Booking.end_at_utc > start_at_utc,
    )
    if specialist_id is not None:
        booking_query = booking_query.filter(
            (Booking.specialist_id == specialist_id) | Booking.specialist_id.is_(None)
        )
    if booking_query.first():
        return False

    blocked = db.query(BlockedSlot).filter(
        BlockedSlot.business_id == business_id,
        BlockedSlot.start_at_utc.is_not(None),
        BlockedSlot.end_at_utc.is_not(None),
        BlockedSlot.start_at_utc < end_at_utc,
        BlockedSlot.end_at_utc > start_at_utc,
    ).first()
    if blocked:
        return False

    legacy_booking_query = db.query(Booking).filter(
        Booking.business_id == business_id,
        Booking.day == day,
        Booking.status == "confirmed",
        Booking.start_at_utc.is_(None),
        Booking.start < en,
        Booking.end > st,
    )
    if specialist_id is not None:
        legacy_booking_query = legacy_booking_query.filter(
            (Booking.specialist_id == specialist_id) | Booking.specialist_id.is_(None)
        )
    legacy_booking = legacy_booking_query.first()

    legacy_block = db.query(BlockedSlot).filter(
        BlockedSlot.business_id == business_id,
        BlockedSlot.day == day,
        BlockedSlot.start_at_utc.is_(None),
        BlockedSlot.start < en,
        BlockedSlot.end > st,
    ).first()
    return not legacy_booking and not legacy_block

'''
app = app[:start] + is_free + app[end:]

marker = '@app.get("/businesses/{slug}")\n'
if '@app.get("/businesses/{business_id}/specialists")' not in app:
    endpoint = '''@app.get("/businesses/{business_id}/specialists")
def business_specialists(business_id: int, service_id: int):
    with SessionLocal() as db:
        business = db.get(Business, business_id)
        service = db.get(Service, service_id)
        if not business or not service or service.business_id != business_id or not service.active:
            raise HTTPException(404, "Not found")
        rows = (
            db.query(Specialist)
            .join(SpecialistService, SpecialistService.specialist_id == Specialist.id)
            .filter(
                Specialist.business_id == business_id,
                SpecialistService.service_id == service_id,
                Specialist.active == True
            )
            .order_by(Specialist.id.asc())
            .all()
        )
        return [
            {
                "id": item.id,
                "name": item.name,
                "position": item.position or "",
                "description": item.description or "",
                "photo": item.photo or "",
            }
            for item in rows
        ]

'''
    app = replace_once(app, marker, endpoint + marker, "public specialist endpoint")

start = app.index('@app.get("/businesses/{business_id}/availability")')
end = app.index('@app.post("/bookings")', start)
availability = '''@app.get("/businesses/{business_id}/availability")
def availability(
    business_id: int,
    service_id: int,
    day: date,
    time_zone: Optional[str] = None,
    specialist_id: Optional[int] = None
):
    with SessionLocal() as db:
        b = db.get(Business, business_id)
        s = db.get(Service, service_id)
        if not b or not s or s.business_id != business_id or not s.active:
            raise HTTPException(404, "Not found")

        if specialist_id is not None:
            specialist = db.get(Specialist, specialist_id)
            assigned = db.query(SpecialistService).filter(
                SpecialistService.specialist_id == specialist_id,
                SpecialistService.service_id == service_id
            ).first()
            if not specialist or specialist.business_id != business_id or not specialist.active or not assigned:
                raise HTTPException(404, "Specialist not found")

        business_zone = _bookly_zone(b.timezone)
        client_zone = _bookly_zone(time_zone or b.timezone)
        now_business = datetime.now(business_zone)

        bookings = db.query(
            Booking.start_at_utc,
            Booking.end_at_utc,
            Booking.day,
            Booking.start,
            Booking.end,
            Booking.specialist_id
        ).filter(
            Booking.business_id == business_id,
            Booking.status == "confirmed"
        ).all()

        blocked_slots = db.query(
            BlockedSlot.start_at_utc,
            BlockedSlot.end_at_utc,
            BlockedSlot.day,
            BlockedSlot.start,
            BlockedSlot.end
        ).filter(BlockedSlot.business_id == business_id).all()

        slots = []
        seen = set()
        for business_day in (day - timedelta(days=1), day, day + timedelta(days=1)):
            for win_start, win_end in get_work_windows(db, business_id, business_day, specialist_id):
                cursor = datetime.combine(business_day, win_start, tzinfo=business_zone)
                endday = datetime.combine(business_day, win_end, tzinfo=business_zone)
                while cursor + timedelta(minutes=s.duration_min) <= endday:
                    slot_end = cursor + timedelta(minutes=s.duration_min)
                    if business_day == now_business.date() and cursor <= now_business:
                        cursor += timedelta(minutes=s.duration_min)
                        continue

                    start_utc = _bookly_to_utc(cursor)
                    end_utc = _bookly_to_utc(slot_end)
                    occupied = False
                    for bs, be, legacy_day, legacy_start, legacy_end, booking_specialist_id in bookings:
                        if specialist_id is not None and booking_specialist_id not in (None, specialist_id):
                            continue
                        if bs is not None and be is not None:
                            if bs < end_utc and be > start_utc:
                                occupied = True
                                break
                        elif legacy_day == business_day and legacy_start < slot_end.time() and legacy_end > cursor.time():
                            occupied = True
                            break

                    if not occupied:
                        for bs, be, legacy_day, legacy_start, legacy_end in blocked_slots:
                            if bs is not None and be is not None:
                                if bs < end_utc and be > start_utc:
                                    occupied = True
                                    break
                            elif legacy_day == business_day and legacy_start < slot_end.time() and legacy_end > cursor.time():
                                occupied = True
                                break

                    if not occupied:
                        client_local = start_utc.replace(tzinfo=timezone.utc).astimezone(client_zone)
                        if client_local.date() == day:
                            value = client_local.strftime("%H:%M")
                            if value not in seen:
                                seen.add(value)
                                slots.append(value)
                    cursor += timedelta(minutes=s.duration_min)

        slots.sort()
        return {"slots": slots}

'''
app = app[:start] + availability + app[end:]

start = app.index('@app.post("/bookings")')
end = app.index('@app.post("/bookings/{booking_id}/cancel")', start)
block = app[start:end]
needle = '''        if not b.subscription_active:\n            raise HTTPException(403, "Business inactive")\n\n        client_zone'''
replacement = '''        if not b.subscription_active:\n            raise HTTPException(403, "Business inactive")\n\n        if x.specialist_id is not None:\n            specialist = db.get(Specialist, x.specialist_id)\n            assigned = db.query(SpecialistService).filter(\n                SpecialistService.specialist_id == x.specialist_id,\n                SpecialistService.service_id == x.service_id\n            ).first()\n            if not specialist or specialist.business_id != x.business_id or not specialist.active or not assigned:\n                raise HTTPException(404, "Specialist not found")\n\n        client_zone'''
block = replace_once(block, needle, replacement, "booking specialist validation")
needle = '''            b.timezone\n        ):'''
replacement = '''            b.timezone,\n            x.specialist_id\n        ):'''
block = replace_once(block, needle, replacement, "booking specialist availability")
needle = '''            service_id=x.service_id,\n            client_telegram_id=x.client_telegram_id,'''
replacement = '''            service_id=x.service_id,\n            specialist_id=x.specialist_id,\n            client_telegram_id=x.client_telegram_id,'''
block = replace_once(block, needle, replacement, "booking specialist persistence")
app = app[:start] + block + app[end:]
app_path.write_text(app)

# ---------------- frontend ----------------
front_path = Path("frontend/src/main.tsx")
f = front_path.read_text()

anchor = '''  const [selected, setSelected] =\n    useState<any>(null);\n\n  const clientTimeZone'''
replacement = '''  const [selected, setSelected] =\n    useState<any>(null);\n\n  const [specialists, setSpecialists] =\n    useState<any[]>([]);\n\n  const [selectedSpecialist, setSelectedSpecialist] =\n    useState<any>(null);\n\n  const clientTimeZone'''
f = replace_once(f, anchor, replacement, "client specialist state")

old = '''            `/businesses/${business.id}/availability?service_id=${service.id}&day=${selectedDay}&time_zone=${encodeURIComponent(clientTimeZone)}`'''
new = '''            `/businesses/${business.id}/availability?service_id=${service.id}&day=${selectedDay}&time_zone=${encodeURIComponent(clientTimeZone)}${specialist?.id ? `&specialist_id=${specialist.id}` : ''}`'''
f = replace_once(f, old, new, "loadSlots URL")
f = replace_once(f, '''  const loadSlots = async (\n    service: any,\n    selectedDay: string\n  ) => {''', '''  const loadSlots = async (\n    service: any,\n    selectedDay: string,\n    specialist: any = selectedSpecialist\n  ) => {''', "loadSlots signature")

cs_start = f.index('  const chooseService = async (')
cs_end = f.index('  const chooseTime = (', cs_start)
choose_block = '''  const findFirstAvailableDay = async (service: any, specialist: any = null) => {
    const startDate = new Date(`${day}T12:00:00`);
    const MAX_DAYS_TO_SEARCH = 90;
    for (let offset = 0; offset < MAX_DAYS_TO_SEARCH; offset += 1) {
      const candidate = new Date(startDate);
      candidate.setDate(startDate.getDate() + offset);
      const candidateDay = [
        candidate.getFullYear(),
        String(candidate.getMonth() + 1).padStart(2, '0'),
        String(candidate.getDate()).padStart(2, '0')
      ].join('-');
      const specialistQuery = specialist?.id ? `&specialist_id=${specialist.id}` : '';
      const response = await fetch(
        API +
          `/businesses/${business.id}/availability?service_id=${service.id}&day=${candidateDay}&time_zone=${encodeURIComponent(clientTimeZone)}${specialistQuery}`
      );
      const data = await response.json();
      if (!response.ok) {
        throw new Error(data?.detail || t('client.availabilityError'));
      }
      const candidateSlots = Array.isArray(data?.slots) ? data.slots : [];
      if (candidateSlots.length > 0) {
        setDay(candidateDay);
        setSlots(candidateSlots);
        return true;
      }
    }
    setSlots([]);
    return false;
  };

  const chooseService = async (service: any) => {
    setSelected(service);
    setSelectedTime('');
    setSlots([]);
    setSpecialists([]);
    setSelectedSpecialist(null);
    setSlotsLoading(true);
    setError('');
    try {
      const response = await fetch(
        API + `/businesses/${business.id}/specialists?service_id=${service.id}`
      );
      const data = await response.json();
      if (!response.ok) {
        throw new Error(data?.detail || t('client.specialistsError', 'Не удалось загрузить специалистов'));
      }
      const availableSpecialists = Array.isArray(data) ? data : [];
      setSpecialists(availableSpecialists);
      if (availableSpecialists.length === 0) {
        await findFirstAvailableDay(service);
      }
    } catch (e) {
      console.error('SPECIALISTS/AVAILABILITY ERROR:', e);
      setSlots([]);
      setError(t('client.availabilityError'));
    } finally {
      setSlotsLoading(false);
    }
  };

  const chooseSpecialist = async (specialist: any) => {
    if (!selected) return;
    setSelectedSpecialist(specialist);
    setSelectedTime('');
    setSlots([]);
    setSlotsLoading(true);
    setError('');
    try {
      await findFirstAvailableDay(selected, specialist);
    } catch (e) {
      console.error('SPECIALIST AVAILABILITY ERROR:', e);
      setSlots([]);
      setError(t('client.availabilityError'));
    } finally {
      setSlotsLoading(false);
    }
  };

'''
f = f[:cs_start] + choose_block + f[cs_end:]

f = replace_once(f, '''                await loadSlots(\n                  selected,\n                  newDay\n                );''', '''                await loadSlots(\n                  selected,\n                  newDay,\n                  selectedSpecialist\n                );''', "date picker loadSlots")
f = replace_once(f, '''              service_id:\n                selected.id,\n              client_name:''', '''              service_id:\n                selected.id,\n              specialist_id:\n                selectedSpecialist?.id || null,\n              client_name:''', "booking payload specialist")

marker = '''      {selected && (\n        <>\n\n          <div className="card">\n            <h2>\n              {t('client.chooseDate')}'''
insert = '''      {selected && (\n        <>\n\n          {specialists.length > 0 && (\n            <div className="card">\n              <h2>{t('client.chooseSpecialist', 'Выберите специалиста')}</h2>\n              <div style={{ display: 'grid', gap: 10 }}>\n                {specialists.map((specialist) => (\n                  <button\n                    type="button"\n                    key={specialist.id}\n                    className={selectedSpecialist?.id === specialist.id ? 'primary full' : 'full'}\n                    onClick={() => chooseSpecialist(specialist)}\n                    style={{ display: 'flex', alignItems: 'center', gap: 12, textAlign: 'left' }}\n                  >\n                    {specialist.photo ? (\n                      <img src={specialist.photo} alt={specialist.name} style={{ width: 52, height: 52, borderRadius: '50%', objectFit: 'cover', flexShrink: 0 }} />\n                    ) : (\n                      <span style={{ width: 52, height: 52, borderRadius: '50%', background: '#f0f1f3', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 700, flexShrink: 0 }}>\n                        {String(specialist.name || '?').charAt(0).toUpperCase()}\n                      </span>\n                    )}\n                    <span style={{ display: 'grid', gap: 2 }}>\n                      <strong>{specialist.name}</strong>\n                      {specialist.position && <small style={{ opacity: 0.7 }}>{specialist.position}</small>}\n                    </span>\n                  </button>\n                ))}\n              </div>\n            </div>\n          )}\n\n          {(!specialists.length || selectedSpecialist) && (\n            <div className="card">\n              <h2>\n                {t('client.chooseDate')}'''
f = replace_once(f, marker, insert, "specialist selector UI")

old_tail = '''          )}\n\n        </>\n      )}\n\n    </section>'''
new_tail = '''          )}\n          </div>\n        )}\n\n        </>\n      )}\n\n    </section>'''
f = replace_once(f, old_tail, new_tail, "specialist selector wrapper")
front_path.write_text(f)
print("specialist integration patch complete")
