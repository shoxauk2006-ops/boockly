import React, { useEffect, useMemo, useState } from 'react';
import {
  API,
  getDateKeyForTimeZone,
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
    <section className="personal-page">
      <button
        className="back"
        onClick={onBack}
      >
        ← {t('common.back', 'Назад')}
      </button>

      <div className="card">
        <span className="personal-eyebrow">
          {t(
            'staff.workspaceEyebrow',
            'МОЯ РАБОТА'
          )}
        </span>

        <h2 style={{ marginBottom: 4 }}>
          {membership.business_name}
        </h2>

        <p
          className="muted"
          style={{ marginTop: 0 }}
        >
          {membership.specialist_name}
          {membership.position
            ? ' · ' + membership.position
            : ''}
        </p>

        {memberships.length > 1 && (
          <select
            value={membership.specialist_id}
            onChange={e =>
              setSelectedId(
                Number(e.target.value)
              )
            }
            style={{
              width: '100%',
              marginTop: 12
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
        <div
          className="error"
          style={{ marginBottom: 12 }}
        >
          ❌ {error}
        </div>
      )}

      {loading ? (
        <div className="card">
          <p className="muted">
            {t(
              'common.loading',
              'Загрузка...'
            )}
          </p>
        </div>
      ) : (
        <>
          <div
            style={{
              display: 'grid',
              gridTemplateColumns:
                'repeat(2, minmax(0, 1fr))',
              gap: 10,
              marginBottom: 12
            }}
          >
            <div className="card">
              <span className="muted">
                {t(
                  'staff.today',
                  'Сегодня'
                )}
              </span>

              <h2 style={{ margin: '6px 0 0' }}>
                {todayBookings.length}
              </h2>
            </div>

            <div className="card">
              <span className="muted">
                {t(
                  'staff.upcoming',
                  'Предстоящие'
                )}
              </span>

              <h2 style={{ margin: '6px 0 0' }}>
                {upcomingBookings.length}
              </h2>
            </div>
          </div>

          <div className="card">
            <h3>
              {t(
                'staff.todayBookings',
                'Записи на сегодня'
              )}
            </h3>

            {todayBookings.length === 0 ? (
              <p className="muted">
                {t(
                  'staff.noTodayBookings',
                  'На сегодня записей нет.'
                )}
              </p>
            ) : (
              <div
                style={{
                  display: 'grid',
                  gap: 8
                }}
              >
                {todayBookings.map(
                  booking => (
                    <div
                      key={booking.id}
                      style={{
                        padding: 12,
                        border:
                          '1px solid #e7e9ed',
                        borderRadius: 13,
                        background: '#fafbfc'
                      }}
                    >
                      <strong>
                        {booking.start}–
                        {booking.end} ·{' '}
                        {booking.service_name}
                      </strong>

                      <p
                        className="muted"
                        style={{
                          margin:
                            '5px 0 0'
                        }}
                      >
                        {booking.client_name}
                        {booking.client_phone
                          ? ' · ' +
                            booking.client_phone
                          : ''}
                      </p>
                    </div>
                  )
                )}
              </div>
            )}
          </div>

          <div className="card">
            <h3>
              {t(
                'staff.upcomingBookings',
                'Следующие записи'
              )}
            </h3>

            {upcomingBookings.length === 0 ? (
              <p className="muted">
                {t(
                  'staff.noUpcomingBookings',
                  'Предстоящих записей нет.'
                )}
              </p>
            ) : (
              <div
                style={{
                  display: 'grid',
                  gap: 8
                }}
              >
                {upcomingBookings
                  .slice(0, 20)
                  .map(booking => (
                    <div
                      key={booking.id}
                      style={{
                        padding: 12,
                        border:
                          '1px solid #e7e9ed',
                        borderRadius: 13,
                        background: '#fafbfc'
                      }}
                    >
                      <strong>
                        {booking.day} ·{' '}
                        {booking.start}–
                        {booking.end}
                      </strong>

                      <p
                        style={{
                          margin:
                            '5px 0 0'
                        }}
                      >
                        {booking.service_name}
                      </p>

                      <p
                        className="muted"
                        style={{
                          margin:
                            '3px 0 0'
                        }}
                      >
                        {booking.client_name}
                        {booking.client_phone
                          ? ' · ' +
                            booking.client_phone
                          : ''}
                      </p>
                    </div>
                  ))}
              </div>
            )}
          </div>

          <div className="card">
            <h3>
              {t(
                'staff.schedule',
                'Мой график'
              )}
            </h3>

            {hours.length === 0 ? (
              <p className="muted">
                {t(
                  'staff.noSchedule',
                  'График пока не настроен.'
                )}
              </p>
            ) : (
              <div
                style={{
                  display: 'grid',
                  gap: 8
                }}
              >
                {hours.map(
                  (row, index) => (
                    <div
                      key={
                        String(
                          row.weekday
                        ) +
                        '-' +
                        index
                      }
                      style={{
                        display: 'flex',
                        justifyContent:
                          'space-between',
                        gap: 12,
                        padding:
                          '8px 0',
                        borderBottom:
                          index <
                          hours.length - 1
                            ? '1px solid #eee'
                            : 'none'
                      }}
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
        </>
      )}
    </section>
  );
}
