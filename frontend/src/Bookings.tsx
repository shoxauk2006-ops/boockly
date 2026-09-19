import React,{useEffect,useMemo,useRef,useState} from 'react';
import {
  Language,
  SUPPORTED_LANGUAGES,
  createTranslator,
  getStoredLanguage,
  setStoredLanguage,
  applyLanguageDirection,
} from './i18n';
import PhoneInput, {
  isPhoneValid
} from './PhoneInput';
import QRCode from 'qrcode';
import Specialists from './Specialists';
import { BooklyAlertModal, BooklyConfirmModal } from './modals';
import {
  API,
  BOT_USERNAME,
  tg,
  confirmAsync,
  initData,
  getClientTimeZone,
  getClientLocalDateKey,
  getDateKeyForTimeZone,
  formatUtcForTimeZone,
  headers,
  LOCALE_MAP,
  getLocale,
  money,
  localizedDays,
  TIMEZONE_OPTIONS,
  ALL_TIMEZONES,
  getTimeZoneLabel,
  getTimeZoneOffsetMinutes,
  formatGMTOffset,
  TIMEZONE_BY_OFFSET
} from './shared';
import { BookingRow } from './BookingRow';

export function Bookings({
  bookings,
  reload,
  t,
  business,
  teamMembers
}: {
  bookings: any[];
  reload: () => Promise<void>;
  t: (key: string, fallback?: string) => string;
  business: any;
  teamMembers: any[];
}) {
  const [showForm, setShowForm] =
    useState(false);

  const [services, setServices] =
    useState<any[]>([]);

  const [businessId, setBusinessId] =
  useState<number | null>(null);

  const [serviceId, setServiceId] =
    useState('');

  const [specialists, setSpecialists] =
    useState<any[]>([]);

  const [specialistId, setSpecialistId] =
    useState('');

  const [staffFilter, setStaffFilter] =
    useState('all');

  const [day, setDay] =
    useState(getDateKeyForTimeZone(business?.timezone || 'Asia/Tashkent'));

  const [slots, setSlots] =
    useState<string[]>([]);
  
  const [selectedSlot, setSelectedSlot] =
  useState('');

  const [slotsLoading, setSlotsLoading] =
    useState(false);

  const [clientName, setClientName] =
    useState('');

  const [clientPhone, setClientPhone] =
    useState('');

  const [saving, setSaving] =
    useState(false);

  const [deletingBusiness, setDeletingBusiness] =
  useState(false);
  
  const [error, setError] =
    useState('');

  const [filter, setFilter] =
    useState<
      'today' |
      'upcoming' |
      'date' |
      'all'
    >('today');

  const [selectedDate, setSelectedDate] =
    useState(getDateKeyForTimeZone(business?.timezone || 'Asia/Tashkent'));

  useEffect(() => {
  if (!showForm) {
    return;
  }

  const loadBookingData =
    async () => {
      try {
        const [
          servicesResponse,
          businessResponse
        ] = await Promise.all([
          fetch(
            API + '/admin/services',
            {
              headers: headers()
            }
          ),
          fetch(
            API + '/admin/business',
            {
              headers: headers()
            }
          )
        ]);

        const servicesData =
          servicesResponse.ok
            ? await servicesResponse.json()
            : [];

        const businessData =
          businessResponse.ok
            ? await businessResponse.json()
            : null;

        const nextServices =
          Array.isArray(
            servicesData
          )
            ? servicesData
            : [];

        setServices(
          nextServices
        );

        if (businessData?.id) {
          setBusinessId(
            Number(businessData.id)
          );
        }

        if (
          nextServices.length &&
          !serviceId
        ) {
          setServiceId(
            String(
              nextServices[0].id
            )
          );
        }
      } catch {
        setServices([]);
        setBusinessId(null);
      }
    };

  loadBookingData();
}, [showForm]);

  useEffect(() => {
    if (
      !showForm ||
      !businessId ||
      !serviceId
    ) {
      setSpecialists([]);
      setSpecialistId('');
      return;
    }

    let cancelled = false;

    fetch(
      API +
        `/businesses/${businessId}/specialists?service_id=${encodeURIComponent(serviceId)}`,
      { headers: headers() }
    )
      .then(async response => {
        const data =
          await response
            .json()
            .catch(() => []);

        if (!response.ok) {
          throw new Error(
            data?.detail ||
              t(
                'specialists.loadError',
                'Не удалось загрузить специалистов'
              )
          );
        }

        return Array.isArray(data)
          ? data
          : [];
      })
      .then(data => {
        if (cancelled) return;

        setSpecialists(data);

        setSpecialistId(current => {
          if (
            current &&
            data.some(
              (item: any) =>
                String(item.id) ===
                String(current)
            )
          ) {
            return current;
          }

          return data.length === 1
            ? String(data[0].id)
            : '';
        });
      })
      .catch(() => {
        if (!cancelled) {
          setSpecialists([]);
          setSpecialistId('');
        }
      });

    return () => {
      cancelled = true;
    };
  }, [
    showForm,
    businessId,
    serviceId
  ]);

  const loadSlots = async (
  selectedServiceId: string,
  selectedDay: string
) => {
  setSelectedSlot('');
    if (!selectedServiceId) {
      return;
    }

    setSlots([]);
    setSlotsLoading(true);
    setError('');

    try {
      
if (!businessId) {
  return;
}
      const availabilityResponse =
        await fetch(
          API +
            `/businesses/${businessId}/availability?service_id=${selectedServiceId}&day=${selectedDay}&time_zone=${encodeURIComponent(business?.timezone || getClientTimeZone())}${specialistId ? `&specialist_id=${encodeURIComponent(specialistId)}` : ''}`
        );

      const data =
        await availabilityResponse.json();

      if (!availabilityResponse.ok) {
        throw new Error(
          data?.detail ||
          t(
            'owner.availabilityError'
          )
        );
      }

      setSlots(
        data?.slots || []
      );

    } catch (e: any) {
      console.error(
        'ADMIN AVAILABILITY ERROR:',
        e
      );

      setSlots([]);

      setError(
        e?.message ||
        t(
          'owner.availabilityError'
        )
      );

    } finally {
      setSlotsLoading(false);
    }
  };

  useEffect(() => {
    if (
      showForm &&
      serviceId &&
      day &&
      (
        specialists.length === 0 ||
        specialistId
      )
    ) {
      loadSlots(
        serviceId,
        day
      );
    }
  }, [
  serviceId,
  day,
  showForm,
  businessId,
  specialists.length,
  specialistId
]);

  const createBooking =
    async (
      start: string
    ) => {
      if (!serviceId) {
        setError(
          t(
            'owner.chooseServiceError'
          )
        );
        return;
      }

      if (!clientName.trim()) {
        setError(
          t(
            'owner.enterClientName'
          )
        );
        return;
      }

      if (!clientPhone.trim()) {
  setError(
    t(
      'client.enterPhone',
      'Введите номер телефона клиента'
    )
  );
  return;
}

if (!isPhoneValid(clientPhone)) {
  setError(
    t(
      'owner.invalidPhone',
      'Введите корректный номер телефона'
    )
  );
  return;
}

      setSaving(true);
      setError('');

      try {
        const response =
          await fetch(
            API +
              '/admin/bookings',
            {
              method: 'POST',
              headers:
                headers(),
              body:
                JSON.stringify({
                  service_id:
                    Number(
                      serviceId
                    ),
                  specialist_id:
                    specialistId
                      ? Number(specialistId)
                      : null,
                  client_name:
                    clientName.trim(),
                  client_phone:
                    clientPhone.trim(),
                  day,
                  start
                })
            }
          );

        const data =
          await response.json();

        if (!response.ok) {
          throw new Error(
            data?.detail ||
            t(
              'owner.createBookingError'
            )
          );
        }

        await reload();

alert(
  t(
    'owner.bookingAdded'
  )
);

setClientName('');
setClientPhone('');
setSelectedSlot('');
setSpecialistId('');
setShowForm(false);
setSlots([]);

      } catch (e: any) {
        console.error(
          'ADMIN CREATE BOOKING ERROR:',
          e
        );

        setError(
          e?.message ||
          t(
            'owner.createBookingError'
          )
        );

      } finally {
        setSaving(false);
      }
    };

 const [now, setNow] = useState(new Date());

useEffect(() => {
  const timer = window.setInterval(() => {
    setNow(new Date());
  }, 30_000);

  return () => {
    window.clearInterval(timer);
  };
}, []);

const businessTimezone =
  business?.timezone ||
  Intl.DateTimeFormat().resolvedOptions().timeZone;

const nowDateTime =
  new Intl.DateTimeFormat('sv-SE', {
    timeZone: businessTimezone,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    hour12: false
  })
    .format(now)
    .slice(0, 16);

const todayBusiness =
  nowDateTime.slice(0, 10);

  const filteredBookings =
  bookings
    .filter(booking => {
      if (
        staffFilter !== 'all' &&
        String(booking.specialist_id || '') !==
          staffFilter
      ) {
        return false;
      }

      const bookingDateTime =
        `${booking.day} ${booking.start}`;

      if (filter === 'today') {
        return booking.day === todayBusiness;
      }

      if (filter === 'upcoming') {
        return bookingDateTime >= nowDateTime;
      }

      if (filter === 'date') {
        return booking.day === selectedDate;
      }

      return true;
    })
    .sort((a, b) => {
      const first =
        `${a.day} ${a.start}`;

      const second =
        `${b.day} ${b.start}`;

      return first.localeCompare(second);
    });

  return (
    <div>

      <div className="card">
        <div
          style={{
            display:
              'flex',
            justifyContent:
              'space-between',
            alignItems:
              'center',
            gap: 10
          }}
        >
          <h2
            style={{
              margin: 0
            }}
          >
            {t(
              'owner.bookings'
            )}
          </h2>

          <button
            className="primary"
            onClick={() =>
              setShowForm(
                !showForm
              )
            }
          >
            {showForm
              ? t(
                  'owner.close'
                )
              : `+ ${t(
                  'owner.addBooking'
                )}`}
          </button>
        </div>
      </div>

      <div className="card">

        <div
          style={{
            display:
              'flex',
            gap: 8,
            overflowX:
              'auto',
            paddingBottom: 5
          }}
        >

          <button
            style={{
              background:
                filter === 'today'
                  ? '#111'
                  : '#eee',
              color:
                filter === 'today'
                  ? '#fff'
                  : '#222',
              fontWeight:
                filter === 'today'
                  ? 700
                  : 500,
              border:
                filter === 'today'
                  ? '2px solid #111'
                  : '2px solid transparent'
            }}
            onClick={() =>
              setFilter(
                'today'
              )
            }
          >
            {t(
              'owner.today'
            )}
          </button>

          <button
            style={{
              background:
                filter === 'upcoming'
                  ? '#111'
                  : '#eee',
              color:
                filter === 'upcoming'
                  ? '#fff'
                  : '#222',
              fontWeight:
                filter === 'upcoming'
                  ? 700
                  : 500,
              border:
                filter === 'upcoming'
                  ? '2px solid #111'
                  : '2px solid transparent'
            }}
            onClick={() =>
              setFilter(
                'upcoming'
              )
            }
          >
            {t(
              'owner.upcomingBookings'
            )}
          </button>

          <button
            style={{
              background:
                filter === 'date'
                  ? '#111'
                  : '#eee',
              color:
                filter === 'date'
                  ? '#fff'
                  : '#222',
              fontWeight:
                filter === 'date'
                  ? 700
                  : 500,
              border:
                filter === 'date'
                  ? '2px solid #111'
                  : '2px solid transparent'
            }}
            onClick={() =>
              setFilter(
                'date'
              )
            }
          >
            {t(
              'owner.date'
            )}
          </button>

          <button
            style={{
              background:
                filter === 'all'
                  ? '#111'
                  : '#eee',
              color:
                filter === 'all'
                  ? '#fff'
                  : '#222',
              fontWeight:
                filter === 'all'
                  ? 700
                  : 500,
              border:
                filter === 'all'
                  ? '2px solid #111'
                  : '2px solid transparent'
            }}
            onClick={() =>
              setFilter(
                'all'
              )
            }
          >
            {t(
              'owner.all'
            )}
          </button>
        </div>

        {filter === 'date' && (
          <input
            type="date"
            value={
              selectedDate
            }
            onChange={e =>
              setSelectedDate(
                e.target.value
              )
            }
            style={{
              marginTop: 12
            }}
          />
        )}

        {teamMembers.length > 0 && (
          <select
            value={staffFilter}
            onChange={e =>
              setStaffFilter(
                e.target.value
              )
            }
            style={{
              marginTop: 12
            }}
          >
            <option value="all">
              {t(
                'owner.allSpecialists',
                'Все сотрудники'
              )}
            </option>

            {teamMembers.map(
              specialist => (
                <option
                  key={specialist.id}
                  value={String(specialist.id)}
                >
                  {specialist.name}
                  {specialist.position
                    ? ` · ${specialist.position}`
                    : ''}
                </option>
              )
            )}
          </select>
        )}
      </div>

      {showForm && (
        <div className="card">

          <h2>
            {t(
              'owner.newBooking'
            )}
          </h2>

          <select
            value={serviceId}
            onChange={e =>
              setServiceId(
                e.target.value
              )
            }
          >
            <option value="">
              {t(
                'owner.chooseService'
              )}
            </option>

            {services.map(
              service => (
                <option
                  key={
                    service.id
                  }
                  value={
                    service.id
                  }
                >
                  {service.name}
                  {' · '}
                  {
                    service.duration_min
                  }{' '}
                  {t(
                    'owner.minutes'
                  )}
                </option>
              )
            )}
          </select>

          {specialists.length > 0 && (
            <select
              value={specialistId}
              onChange={e =>
                setSpecialistId(
                  e.target.value
                )
              }
            >
              <option value="">
                {t(
                  'owner.chooseSpecialist',
                  'Выберите специалиста'
                )}
              </option>

              {specialists.map(
                specialist => (
                  <option
                    key={specialist.id}
                    value={specialist.id}
                  >
                    {specialist.name}
                    {specialist.position
                      ? ` · ${specialist.position}`
                      : ''}
                  </option>
                )
              )}
            </select>
          )}

          <input
            type="date"
            min={getDateKeyForTimeZone(business?.timezone || 'Asia/Tashkent')}
            value={day}
            onChange={e =>
              setDay(
                e.target.value
              )
            }
          />

          <h3>
            {t(
              'owner.chooseTime'
            )}
          </h3>

          {slotsLoading && (
  <p
    className="muted"
    style={{
      display: 'flex',
      alignItems: 'center',
      gap: 8
    }}
  >
    <span
      style={{
        display: 'inline-block',
        width: 14,
        height: 14,
        border: '2px solid #ddd',
        borderTopColor: '#111',
        borderRadius: '50%',
        animation:
          'bookly-spin .8s linear infinite'
      }}
    />
    {t(
      'owner.loadingSlots',
      'Загружаем свободное время...'
    )}
  </p>
)}

          {!slotsLoading &&
  serviceId &&
  !slots.length && (
    <p className="muted">
      {t(
        'owner.noAvailableTime'
      )}
    </p>
  )}
  
<div className="slots">
  {slots.map(
    time => (
      <button
  key={time}
  type="button"
  disabled={saving}
  onClick={() =>
    setSelectedSlot(time)
  }
  style={{
    background:
      selectedSlot === time
        ? '#111'
        : '#fff',
    color:
      selectedSlot === time
        ? '#fff'
        : '#111',
    border:
      selectedSlot === time
        ? '2px solid #111'
        : '1px solid #ddd',
    fontWeight:
      selectedSlot === time
        ? 700
        : 500,
    transition:
      'all .15s ease'
  }}
>
  {selectedSlot === time
    ? `✓ ${time}`
    : time}
</button>
    )
  )}
</div>
  

          <h3>
            {t(
              'owner.clientData'
            )}
          </h3>

          <input
            type="text"
            placeholder={
              t(
                'owner.clientName'
              )
            }
            value={
              clientName
            }
            onChange={e =>
              setClientName(
                e.target.value
              )
            }
          />

          <PhoneInput
  value={clientPhone}
  onChange={setClientPhone}
  placeholder={t(
    'owner.clientPhone'
  )}
/>
          <button
  type="button"
  className="primary full"
  disabled={
    saving ||
    !selectedSlot ||
    !serviceId ||
    (specialists.length > 0 && !specialistId) ||
    !clientName.trim()
  }
  onClick={() =>
    createBooking(
      selectedSlot
    )
  }
>
  {saving
    ? t(
        'common.loading',
        'Загрузка...'
      )
    : t(
        'owner.addBooking',
        'Добавить запись'
      )}
</button>

          {error && (
            <div
              className="error"
              style={{
                marginTop: 10
              }}
            >
              ❌ {error}
            </div>
          )}

          <p className="muted">
            {t(
              'owner.bookingHint'
            )}
          </p>

        </div>
      )}

      <div className="card">
        {filteredBookings.length ? (
          filteredBookings.map(
            booking => (
              <BookingRow
                x={booking}
                key={booking.id}
                t={t}
                business={business}
              />
            )
          )
        ) : (
          <p>
            {t(
              'owner.noBookingsInSection'
            )}
          </p>
        )}
      </div>

    </div>
  );
}
// Bookly booking status uses business timezone.
