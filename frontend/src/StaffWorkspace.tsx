import React, { useEffect, useMemo, useState } from 'react';
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

type StaffView = 'today' | 'bookings' | 'schedule';

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
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const membership =
    memberships.find(
      item => item.specialist_id === selectedId
    ) || memberships[0] || null;

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
        const [bookingsResponse, hoursResponse] =
          await Promise.all([
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
            )
          ]);

        const bookingsData =
          await bookingsResponse
            .json()
            .catch(() => []);

        const hoursData =
          await hoursResponse
            .json()
            .catch(() => []);

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
  }, [membership?.specialist_id]);

  const timezone =
    membership?.business_timezone ||
    'Asia/Tashkent';

  const today =
    getDateKeyForTimeZone(timezone);

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
      </div>

      {error && (
        <div className="error staff-error">
          ❌ {error}
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
            className="staff-tabs"
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
        </>
      )}
    </section>
  );
}
