import React, { useEffect, useMemo, useState } from 'react';
import PhoneInput, { isPhoneValid } from './PhoneInput';
import {
  API,
  getDateKeyForTimeZone,
  getLocale,
  headers,
  localizedDays
} from './shared';

type Membership = {
  specialist_id: number;
  specialist_name: string;
  position?: string;
  business_id: number;
  business_name: string;
  business_timezone?: string;
  notifications_enabled?: boolean;
};

type Props = {
  memberships: Membership[];
  t: (key: string, fallback?: string) => string;
  onBack: () => void;
};

type StaffView = 'today' | 'bookings' | 'schedule' | 'blocks';

export function StaffWorkspace({
  memberships,
  t,
  onBack
}: Props) {
  const [selectedId, setSelectedId] = useState<number>(() => {
    try {
      const saved = Number(
        localStorage.getItem('bookly_staff_specialist_id') || 0
      );

      if (
        saved &&
        memberships.some(
          item => item.specialist_id === saved
        )
      ) {
        return saved;
      }
    } catch {}

    return memberships[0]?.specialist_id || 0;
  });

  const [view, setView] = useState<StaffView>('today');
  const [bookings, setBookings] = useState<any[]>([]);
  const [hours, setHours] = useState<any[]>([]);
  const [services, setServices] = useState<any[]>([]);
  const [blocks, setBlocks] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [reloadKey, setReloadKey] = useState(0);

  const [showBookingForm, setShowBookingForm] = useState(false);
  const [bookingSaving, setBookingSaving] = useState(false);
  const [bookingError, setBookingError] = useState('');
  const [bookingSlots, setBookingSlots] = useState<string[]>([]);
  const [bookingSlotsLoading, setBookingSlotsLoading] = useState(false);
  const [bookingForm, setBookingForm] = useState({
    service_id: '',
    day: '',
    start: '',
    client_name: '',
    client_phone: ''
  });

  const [showBlockForm, setShowBlockForm] = useState(false);
  const [blockSaving, setBlockSaving] = useState(false);
  const [blockError, setBlockError] = useState('');
  const [blockForm, setBlockForm] = useState({
    day: '',
    start: '13:00',
    end: '14:00',
    reason: ''
  });

  const membership =
    memberships.find(
      item => item.specialist_id === selectedId
    ) || memberships[0] || null;

  const timezone =
    membership?.business_timezone ||
    'Asia/Tashkent';

  const today =
    getDateKeyForTimeZone(timezone);

  useEffect(() => {
    if (!membership) {
      return;
    }

    setBookingForm({
      service_id: '',
      day: getDateKeyForTimeZone(
        membership.business_timezone ||
        'Asia/Tashkent'
      ),
      start: '',
      client_name: '',
      client_phone: ''
    });

    setBlockForm({
      day: getDateKeyForTimeZone(
        membership.business_timezone ||
        'Asia/Tashkent'
      ),
      start: '13:00',
      end: '14:00',
      reason: ''
    });

    setShowBookingForm(false);
    setShowBlockForm(false);
    setBookingSlots([]);
    setBookingError('');
    setBlockError('');
  }, [membership?.specialist_id]);

  useEffect(() => {
    if (!membership) {
      return;
    }

    try {
      localStorage.setItem(
        'bookly_staff_specialist_id',
        String(membership.specialist_id)
      );
    } catch {}

    let cancelled = false;

    const load = async () => {
      setLoading(true);
      setError('');

      try {
        const [
          bookingsResponse,
          hoursResponse,
          servicesResponse,
          blocksResponse
        ] = await Promise.all([
          fetch(
            API +
              '/staff/bookings?specialist_id=' +
              encodeURIComponent(
                String(membership.specialist_id)
              ),
            { headers: headers() }
          ),
          fetch(
            API +
              '/staff/working-hours?specialist_id=' +
              encodeURIComponent(
                String(membership.specialist_id)
              ),
            { headers: headers() }
          ),
          fetch(
            API +
              '/staff/services?specialist_id=' +
              encodeURIComponent(
                String(membership.specialist_id)
              ),
            { headers: headers() }
          ),
          fetch(
            API +
              '/staff/blocks?specialist_id=' +
              encodeURIComponent(
                String(membership.specialist_id)
              ),
            { headers: headers() }
          )
        ]);

        const bookingsData =
          await bookingsResponse.json().catch(() => []);
        const hoursData =
          await hoursResponse.json().catch(() => []);
        const servicesData =
          await servicesResponse.json().catch(() => []);
        const blocksData =
          await blocksResponse.json().catch(() => []);

        if (!bookingsResponse.ok) {
          throw new Error(
            bookingsData?.detail ||
              t(
                'staff.bookingsLoadError',
                'Не удалось загрузить записи'
              )
          );
        }

        if (!hoursResponse.ok) {
          throw new Error(
            hoursData?.detail ||
              t(
                'staff.scheduleLoadError',
                'Не удалось загрузить график'
              )
          );
        }

        if (!servicesResponse.ok) {
          throw new Error(
            servicesData?.detail ||
              t(
                'staff.servicesLoadError',
                'Не удалось загрузить услуги'
              )
          );
        }

        if (!blocksResponse.ok) {
          throw new Error(
            blocksData?.detail ||
              t(
                'staff.blocksLoadError',
                'Не удалось загрузить блокировки'
              )
          );
        }

        if (!cancelled) {
          setBookings(
            Array.isArray(bookingsData)
              ? bookingsData
              : []
          );
          setHours(
            Array.isArray(hoursData)
              ? hoursData
              : []
          );
          const nextServices =
            Array.isArray(servicesData)
              ? servicesData
              : [];
          setServices(nextServices);
          setBlocks(
            Array.isArray(blocksData)
              ? blocksData
              : []
          );

          setBookingForm(current => ({
            ...current,
            service_id:
              current.service_id ||
              (
                nextServices.length === 1
                  ? String(nextServices[0].id)
                  : ''
              )
          }));
        }
      } catch (e: any) {
        if (!cancelled) {
          setError(
            e?.message ||
              t(
                'staff.loadError',
                'Не удалось загрузить рабочий экран'
              )
          );
        }
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    };

    load();

    return () => {
      cancelled = true;
    };
  }, [
    membership?.specialist_id,
    reloadKey
  ]);

  useEffect(() => {
    if (
      !showBookingForm ||
      !membership ||
      !bookingForm.service_id ||
      !bookingForm.day
    ) {
      setBookingSlots([]);
      setBookingForm(current => ({
        ...current,
        start: ''
      }));
      return;
    }

    let cancelled = false;

    const loadSlots = async () => {
      setBookingSlotsLoading(true);
      setBookingError('');

      try {
        const response = await fetch(
          API +
            `/businesses/${membership.business_id}/availability` +
            `?service_id=${encodeURIComponent(bookingForm.service_id)}` +
            `&day=${encodeURIComponent(bookingForm.day)}` +
            `&time_zone=${encodeURIComponent(timezone)}` +
            `&specialist_id=${encodeURIComponent(
              String(membership.specialist_id)
            )}`
        );

        const data =
          await response.json().catch(() => ({}));

        if (!response.ok) {
          throw new Error(
            data?.detail ||
              t(
                'staff.availabilityError',
                'Не удалось загрузить свободное время'
              )
          );
        }

        if (!cancelled) {
          setBookingSlots(
            Array.isArray(data?.slots)
              ? data.slots
              : []
          );
          setBookingForm(current => ({
            ...current,
            start: ''
          }));
        }
      } catch (e: any) {
        if (!cancelled) {
          setBookingSlots([]);
          setBookingError(
            e?.message ||
              t(
                'staff.availabilityError',
                'Не удалось загрузить свободное время'
              )
          );
        }
      } finally {
        if (!cancelled) {
          setBookingSlotsLoading(false);
        }
      }
    };

    loadSlots();

    return () => {
      cancelled = true;
    };
  }, [
    showBookingForm,
    membership?.specialist_id,
    bookingForm.service_id,
    bookingForm.day,
    timezone
  ]);

  const activeBookings = useMemo(
    () =>
      bookings.filter(
        booking =>
          booking.status === 'confirmed' &&
          booking.day >= today
      ),
    [bookings, today]
  );

  const todayBookings =
    activeBookings.filter(
      booking => booking.day === today
    );

  const upcomingBookings =
    activeBookings.filter(
      booking => booking.day > today
    );

  const days = localizedDays(t);

  const formatDate = (value: string) => {
    try {
      return new Intl.DateTimeFormat(
        getLocale(),
        {
          day: 'numeric',
          month: 'short',
          weekday: 'short'
        }
      ).format(
        new Date(value + 'T12:00:00')
      );
    } catch {
      return value;
    }
  };

  const bookingCard = (
    booking: any,
    showDate = false
  ) => (
    <div
      className="staff-booking-card"
      key={booking.id}
    >
      {showDate && (
        <span className="staff-booking-date">
          {formatDate(booking.day)}
        </span>
      )}

      <strong className="staff-booking-main">
        {booking.start}–{booking.end}
        {' · '}
        {booking.service_name}
      </strong>

      <span className="staff-booking-client">
        {booking.client_name}
        {booking.client_phone
          ? ' · ' + booking.client_phone
          : ''}
      </span>
    </div>
  );

  const createBooking = async () => {
    if (!membership) return;

    if (
      !bookingForm.service_id ||
      !bookingForm.start ||
      !bookingForm.client_name.trim()
    ) {
      setBookingError(
        t(
          'staff.fillBookingFields',
          'Выберите услугу, время и укажите имя клиента.'
        )
      );
      return;
    }

    if (
      bookingForm.client_phone.trim() &&
      !isPhoneValid(
        bookingForm.client_phone
      )
    ) {
      setBookingError(
        t(
          'owner.invalidPhone',
          'Введите корректный номер телефона'
        )
      );
      return;
    }

    setBookingSaving(true);
    setBookingError('');

    try {
      const response = await fetch(
        API + '/staff/bookings',
        {
          method: 'POST',
          headers: headers(),
          body: JSON.stringify({
            specialist_id:
              membership.specialist_id,
            service_id:
              Number(bookingForm.service_id),
            client_name:
              bookingForm.client_name.trim(),
            client_phone:
              bookingForm.client_phone.trim(),
            day: bookingForm.day,
            start: bookingForm.start
          })
        }
      );

      const data =
        await response.json().catch(() => ({}));

      if (!response.ok) {
        throw new Error(
          response.status === 409
            ? t(
                'staff.timeUnavailable',
                'Это время уже занято.'
              )
            : (
                data?.detail ||
                t(
                  'staff.createBookingError',
                  'Не удалось добавить запись'
                )
              )
        );
      }

      setShowBookingForm(false);
      setBookingSlots([]);
      setBookingForm({
        service_id:
          services.length === 1
            ? String(services[0].id)
            : '',
        day: today,
        start: '',
        client_name: '',
        client_phone: ''
      });
      setView('today');
      setReloadKey(value => value + 1);
    } catch (e: any) {
      setBookingError(
        e?.message ||
          t(
            'staff.createBookingError',
            'Не удалось добавить запись'
          )
      );
    } finally {
      setBookingSaving(false);
    }
  };

  const createBlock = async () => {
    if (!membership) return;

    if (
      !blockForm.day ||
      !blockForm.start ||
      !blockForm.end
    ) {
      setBlockError(
        t(
          'staff.fillBlockFields',
          'Укажите дату и время блокировки.'
        )
      );
      return;
    }

    setBlockSaving(true);
    setBlockError('');

    try {
      const response = await fetch(
        API + '/staff/blocks',
        {
          method: 'POST',
          headers: headers(),
          body: JSON.stringify({
            specialist_id:
              membership.specialist_id,
            day: blockForm.day,
            start: blockForm.start,
            end: blockForm.end,
            reason: blockForm.reason.trim()
          })
        }
      );

      const data =
        await response.json().catch(() => ({}));

      if (!response.ok) {
        throw new Error(
          response.status === 409
            ? t(
                'staff.timeUnavailable',
                'Это время уже занято.'
              )
            : (
                data?.detail ||
                t(
                  'staff.createBlockError',
                  'Не удалось добавить блокировку'
                )
              )
        );
      }

      setShowBlockForm(false);
      setBlockForm({
        day: today,
        start: '13:00',
        end: '14:00',
        reason: ''
      });
      setView('blocks');
      setReloadKey(value => value + 1);
    } catch (e: any) {
      setBlockError(
        e?.message ||
          t(
            'staff.createBlockError',
            'Не удалось добавить блокировку'
          )
      );
    } finally {
      setBlockSaving(false);
    }
  };

  const deleteBlock = async (
    block: any
  ) => {
    if (
      !membership ||
      !block?.can_delete
    ) {
      return;
    }

    try {
      const response = await fetch(
        API +
          `/staff/blocks/${block.id}` +
          `?specialist_id=${membership.specialist_id}`,
        {
          method: 'DELETE',
          headers: headers()
        }
      );

      const data =
        await response.json().catch(() => ({}));

      if (!response.ok) {
        throw new Error(
          data?.detail ||
            t(
              'staff.deleteBlockError',
              'Не удалось удалить блокировку'
            )
        );
      }

      setReloadKey(value => value + 1);
    } catch (e: any) {
      setBlockError(
        e?.message ||
          t(
            'staff.deleteBlockError',
            'Не удалось удалить блокировку'
          )
      );
    }
  };

  if (!membership) {
    return (
      <section>
        <button
          className="back"
          onClick={onBack}
        >
          ← {t('common.back', 'Назад')}
        </button>

        <div className="card">
          <h2>
            {t(
              'staff.noAccessTitle',
              'Нет рабочего доступа'
            )}
          </h2>

          <p className="muted">
            {t(
              'staff.noAccessText',
              'Владелец бизнеса должен сначала подключить ваш Telegram к профилю сотрудника.'
            )}
          </p>
        </div>
      </section>
    );
  }

  return (
    <section className="personal-page staff-workspace">
      <button
        className="back staff-back"
        onClick={onBack}
      >
        ← {t('common.back', 'Назад')}
      </button>

      <div className="card staff-profile-card">
        <span className="personal-eyebrow">
          {t(
            'staff.workspaceEyebrow',
            'МОЯ РАБОТА'
          )}
        </span>

        <h2>
          {membership.business_name}
        </h2>

        <p className="muted">
          {membership.specialist_name}
          {membership.position
            ? ' · ' + membership.position
            : ''}
        </p>

        {memberships.length > 1 && (
          <select
            className="staff-business-select"
            value={membership.specialist_id}
            onChange={e => {
              setSelectedId(
                Number(e.target.value)
              );
              setView('today');
            }}
          >
            {memberships.map(item => (
              <option
                key={item.specialist_id}
                value={item.specialist_id}
              >
                {item.business_name} —{' '}
                {item.specialist_name}
              </option>
            ))}
          </select>
        )}

        <div className="staff-primary-actions">
          <button
            type="button"
            className="personal-black-button"
            onClick={() => {
              setShowBookingForm(value => !value);
              setShowBlockForm(false);
              setBookingError('');
            }}
          >
            + {t(
              'staff.addBooking',
              'Новая запись'
            )}
          </button>

          <button
            type="button"
            className="staff-secondary-action"
            onClick={() => {
              setShowBlockForm(value => !value);
              setShowBookingForm(false);
              setBlockError('');
            }}
          >
            {t(
              'staff.blockTime',
              'Заблокировать время'
            )}
          </button>
        </div>
      </div>

      {error && (
        <div className="error staff-error">
          ❌ {error}
        </div>
      )}

      {showBookingForm && (
        <div className="card staff-action-form">
          <div className="staff-panel-head">
            <h3>
              {t(
                'staff.addBooking',
                'Новая запись'
              )}
            </h3>
            <button
              type="button"
              className="staff-form-close"
              onClick={() =>
                setShowBookingForm(false)
              }
            >
              ×
            </button>
          </div>

          <select
            value={bookingForm.service_id}
            onChange={e =>
              setBookingForm(current => ({
                ...current,
                service_id: e.target.value,
                start: ''
              }))
            }
          >
            <option value="">
              {t(
                'owner.chooseService',
                'Выберите услугу'
              )}
            </option>

            {services.map(service => (
              <option
                key={service.id}
                value={String(service.id)}
              >
                {service.name}
                {' · '}
                {service.duration_min}{' '}
                {t('owner.minutes', 'мин')}
              </option>
            ))}
          </select>

          <input
            type="date"
            min={today}
            value={bookingForm.day}
            onChange={e =>
              setBookingForm(current => ({
                ...current,
                day: e.target.value,
                start: ''
              }))
            }
          />

          <div className="staff-slot-area">
            <strong>
              {t(
                'owner.chooseTime',
                'Выберите время'
              )}
            </strong>

            {bookingSlotsLoading ? (
              <p className="muted">
                {t(
                  'owner.loadingSlots',
                  'Загружаем свободное время...'
                )}
              </p>
            ) : bookingSlots.length > 0 ? (
              <div className="slots">
                {bookingSlots.map(slot => (
                  <button
                    type="button"
                    key={slot}
                    className={
                      bookingForm.start === slot
                        ? 'selected'
                        : ''
                    }
                    onClick={() =>
                      setBookingForm(current => ({
                        ...current,
                        start: slot
                      }))
                    }
                  >
                    {slot}
                  </button>
                ))}
              </div>
            ) : (
              <p className="muted">
                {t(
                  'owner.noAvailableTime',
                  'Свободного времени нет.'
                )}
              </p>
            )}
          </div>

          <input
            type="text"
            placeholder={t(
              'owner.clientName',
              'Имя клиента'
            )}
            value={bookingForm.client_name}
            onChange={e =>
              setBookingForm(current => ({
                ...current,
                client_name: e.target.value
              }))
            }
          />

          <PhoneInput
            value={bookingForm.client_phone}
            onChange={value =>
              setBookingForm(current => ({
                ...current,
                client_phone: value
              }))
            }
            placeholder={t(
              'owner.clientPhone',
              'Номер телефона'
            )}
          />

          {bookingError && (
            <div className="error">
              ❌ {bookingError}
            </div>
          )}

          <button
            type="button"
            className="primary full"
            disabled={
              bookingSaving ||
              !bookingForm.service_id ||
              !bookingForm.start ||
              !bookingForm.client_name.trim()
            }
            onClick={createBooking}
          >
            {bookingSaving
              ? t(
                  'common.loading',
                  'Загрузка...'
                )
              : t(
                  'staff.addBooking',
                  'Добавить запись'
                )}
          </button>
        </div>
      )}

      {showBlockForm && (
        <div className="card staff-action-form">
          <div className="staff-panel-head">
            <h3>
              {t(
                'staff.blockTime',
                'Заблокировать время'
              )}
            </h3>
            <button
              type="button"
              className="staff-form-close"
              onClick={() =>
                setShowBlockForm(false)
              }
            >
              ×
            </button>
          </div>

          <input
            type="date"
            min={today}
            value={blockForm.day}
            onChange={e =>
              setBlockForm(current => ({
                ...current,
                day: e.target.value
              }))
            }
          />

          <div className="staff-time-grid">
            <input
              type="time"
              value={blockForm.start}
              onChange={e =>
                setBlockForm(current => ({
                  ...current,
                  start: e.target.value
                }))
              }
            />

            <input
              type="time"
              value={blockForm.end}
              onChange={e =>
                setBlockForm(current => ({
                  ...current,
                  end: e.target.value
                }))
              }
            />
          </div>

          <input
            type="text"
            placeholder={t(
              'owner.reasonOptional',
              'Причина (необязательно)'
            )}
            value={blockForm.reason}
            onChange={e =>
              setBlockForm(current => ({
                ...current,
                reason: e.target.value
              }))
            }
          />

          {blockError && (
            <div className="error">
              ❌ {blockError}
            </div>
          )}

          <button
            type="button"
            className="primary full"
            disabled={blockSaving}
            onClick={createBlock}
          >
            {blockSaving
              ? t(
                  'common.loading',
                  'Загрузка...'
                )
              : t(
                  'staff.blockTime',
                  'Заблокировать время'
                )}
          </button>
        </div>
      )}

      {loading ? (
        <div className="card staff-loading-card">
          <p className="muted">
            {t(
              'common.loading',
              'Загрузка...'
            )}
          </p>
        </div>
      ) : (
        <>
          <div className="staff-summary-grid">
            <button
              type="button"
              className={
                'card staff-summary-card' +
                (view === 'today' ? ' active' : '')
              }
              onClick={() => setView('today')}
            >
              <span>
                {t(
                  'staff.today',
                  'Сегодня'
                )}
              </span>
              <strong>
                {todayBookings.length}
              </strong>
            </button>

            <button
              type="button"
              className={
                'card staff-summary-card' +
                (view === 'bookings' ? ' active' : '')
              }
              onClick={() => setView('bookings')}
            >
              <span>
                {t(
                  'staff.upcoming',
                  'Предстоящие'
                )}
              </span>
              <strong>
                {upcomingBookings.length}
              </strong>
            </button>
          </div>

          <div
            className="staff-tabs staff-tabs-four"
            role="tablist"
            aria-label={t(
              'staff.workspaceTitle',
              'Рабочий кабинет'
            )}
          >
            <button
              type="button"
              className={
                view === 'today'
                  ? 'active'
                  : ''
              }
              onClick={() => setView('today')}
            >
              {t('staff.today', 'Сегодня')}
            </button>

            <button
              type="button"
              className={
                view === 'bookings'
                  ? 'active'
                  : ''
              }
              onClick={() => setView('bookings')}
            >
              {t('nav.bookings', 'Записи')}
            </button>

            <button
              type="button"
              className={
                view === 'schedule'
                  ? 'active'
                  : ''
              }
              onClick={() => setView('schedule')}
            >
              {t('nav.schedule', 'График')}
            </button>

            <button
              type="button"
              className={
                view === 'blocks'
                  ? 'active'
                  : ''
              }
              onClick={() => setView('blocks')}
            >
              {t(
                'staff.blocks',
                'Блокировки'
              )}
            </button>
          </div>

          {view === 'today' && (
            <div className="card staff-panel">
              <div className="staff-panel-head">
                <h3>
                  {t(
                    'staff.todayBookings',
                    'Записи на сегодня'
                  )}
                </h3>
                <span>
                  {todayBookings.length}
                </span>
              </div>

              {todayBookings.length === 0 ? (
                <p className="muted staff-empty">
                  {t(
                    'staff.noTodayBookings',
                    'На сегодня записей нет.'
                  )}
                </p>
              ) : (
                <div className="staff-booking-list">
                  {todayBookings.map(
                    booking =>
                      bookingCard(
                        booking
                      )
                  )}
                </div>
              )}
            </div>
          )}

          {view === 'bookings' && (
            <div className="card staff-panel">
              <div className="staff-panel-head">
                <h3>
                  {t(
                    'staff.upcomingBookings',
                    'Следующие записи'
                  )}
                </h3>
                <span>
                  {upcomingBookings.length}
                </span>
              </div>

              {upcomingBookings.length === 0 ? (
                <p className="muted staff-empty">
                  {t(
                    'staff.noUpcomingBookings',
                    'Предстоящих записей нет.'
                  )}
                </p>
              ) : (
                <div className="staff-booking-list">
                  {upcomingBookings
                    .slice(0, 50)
                    .map(
                      booking =>
                        bookingCard(
                          booking,
                          true
                        )
                    )}
                </div>
              )}
            </div>
          )}

          {view === 'schedule' && (
            <div className="card staff-panel">
              <div className="staff-panel-head">
                <h3>
                  {t(
                    'staff.schedule',
                    'Мой график'
                  )}
                </h3>
              </div>

              {hours.length === 0 ? (
                <p className="muted staff-empty">
                  {t(
                    'staff.noSchedule',
                    'График пока не настроен.'
                  )}
                </p>
              ) : (
                <div className="staff-schedule-list">
                  {hours.map(
                    (row, index) => (
                      <div
                        className="staff-schedule-row"
                        key={
                          String(
                            row.weekday
                          ) +
                          '-' +
                          index
                        }
                      >
                        <span>
                          {days[
                            row.weekday
                          ] ||
                            String(
                              row.weekday
                            )}
                        </span>

                        <strong>
                          {row.start}–
                          {row.end}
                        </strong>
                      </div>
                    )
                  )}
                </div>
              )}
            </div>
          )}

          {view === 'blocks' && (
            <div className="card staff-panel">
              <div className="staff-panel-head">
                <h3>
                  {t(
                    'staff.blocks',
                    'Блокировки'
                  )}
                </h3>
                <span>{blocks.length}</span>
              </div>

              {blockError && (
                <div
                  className="error"
                  style={{ marginBottom: 10 }}
                >
                  ❌ {blockError}
                </div>
              )}

              {blocks.length === 0 ? (
                <p className="muted staff-empty">
                  {t(
                    'staff.noBlocks',
                    'Персональных блокировок нет.'
                  )}
                </p>
              ) : (
                <div className="staff-booking-list">
                  {blocks.map(block => (
                    <div
                      className={
                        'staff-booking-card staff-block-card' +
                        (block.is_past ? ' past' : '')
                      }
                      key={block.id}
                    >
                      <span className="staff-booking-date">
                        {formatDate(block.day)}
                        {block.is_past
                          ? ' · ' +
                            t(
                              'owner.pastBlock',
                              'Прошедшее'
                            )
                          : ''}
                      </span>

                      <strong className="staff-booking-main">
                        {block.start}–{block.end}
                      </strong>

                      <span className="staff-booking-client">
                        {block.reason ||
                          t(
                            'staff.blockWithoutReason',
                            'Без причины'
                          )}
                        {' · '}
                        {block.created_by === 'staff'
                          ? t(
                              'staff.createdByYou',
                              'Создано вами'
                            )
                          : t(
                              'staff.createdByOwner',
                              'Создано владельцем'
                            )}
                      </span>

                      {block.can_delete && (
                        <button
                          type="button"
                          className="staff-block-delete"
                          onClick={() =>
                            deleteBlock(block)
                          }
                        >
                          {t(
                            'common.delete',
                            'Удалить'
                          )}
                        </button>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </>
      )}
    </section>
  );
}
