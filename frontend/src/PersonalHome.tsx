import React,{useEffect,useState} from 'react';
import {
  API,
  tg,
  headers
} from './shared';
import { MyBookings } from './MyBookings';
import { SavedBusinessesPage } from './SavedBusinessesPage';
import { StaffWorkspace } from './StaffWorkspace';

export function PersonalHome({
  onAdmin,
  slug,
  setSlug,
  open,
  t,
  setInfoModal,
  setInfoSection
}: {
  onAdmin: () => void;
  slug: string;
  setSlug: (value: string) => void;
  open: (input?: string) => void;
  t: (key: string, fallback?: string) => string;
  setInfoModal: () => void;
  setInfoSection: (section: 'help' | 'rules') => void;
}) {
  const [businesses, setBusinesses] = useState<any[]>([]);
  const [staffMemberships, setStaffMemberships] = useState<any[]>(() => {
    try {
      const cached = JSON.parse(
        localStorage.getItem(
          'bookly_staff_memberships'
        ) || '[]'
      );

      return Array.isArray(cached)
        ? cached
        : [];
    } catch {
      return [];
    }
  });
  const [page, setPage] = useState<'home' | 'bookings' | 'saved' | 'staff'>('home');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;

    const load = async () => {
      try {
        const [businessResponse, staffResponse] =
          await Promise.all([
            fetch(
              API + '/admin/businesses',
              { headers: headers() }
            ),
            fetch(
              API + '/staff/me',
              { headers: headers() }
            )
          ]);

        const businessData =
          businessResponse.ok
            ? await businessResponse.json()
            : [];

        const staffData =
          staffResponse.ok
            ? await staffResponse.json()
            : null;

        if (!cancelled) {
          setBusinesses(
            Array.isArray(businessData)
              ? businessData
              : []
          );

          if (staffResponse.ok) {
            const memberships =
              Array.isArray(
                staffData?.memberships
              )
                ? staffData.memberships
                : [];

            setStaffMemberships(
              memberships
            );

            try {
              localStorage.setItem(
                'bookly_staff_memberships',
                JSON.stringify(memberships)
              );
            } catch {}

            try {
              if (
                memberships.length &&
                sessionStorage.getItem(
                  'bookly_open_staff'
                ) === '1'
              ) {
                sessionStorage.removeItem(
                  'bookly_open_staff'
                );
                setPage('staff');
              }
            } catch {}
          }
        }
      } catch {
        if (!cancelled) {
          setBusinesses([]);
          // Keep the last verified staff membership cached locally.
          // A temporary backend/network failure must not make the
          // employee workspace disappear from the home screen.
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
  }, []);

  const firstName =
    tg()?.initDataUnsafe?.user?.first_name || '';

  const hasStaffHint =
    staffMemberships.length > 0 ||
    (() => {
      try {
        return Boolean(
          localStorage.getItem(
            'bookly_staff_specialist_id'
          )
        );
      } catch {
        return false;
      }
    })();

  return (
    <section className="personal-home">
      {page === 'home' && (
        <div className="personal-home-main">
          <div className="personal-home-hero">
            <span className="personal-eyebrow">
              SKEDWOO
            </span>

            <h1>
              {firstName
                ? `${t('home.greeting', 'С возвращением')}, ${firstName}`
                : t('home.greeting', 'С возвращением')}
            </h1>

            <p>
              {t(
                'home.description',
                'Skedwoo помогает бизнесу принимать записи прямо в Telegram.'
              )}
            </p>
          </div>

          <div
            className={
              hasStaffHint
                ? 'personal-role-grid has-staff'
                : 'personal-role-grid'
            }
          >
            {loading ? (
              <div className="personal-business-skeleton">
                <div className="skeleton-line skeleton-small" />
                <div className="skeleton-line skeleton-title" />
                <div className="skeleton-line skeleton-text" />
                <div className="skeleton-button" />
              </div>
            ) : (
              <div className="personal-business-card personal-role-card">
                <span className="personal-eyebrow light">
                  {t(
                    'nav.admin',
                    'ДЛЯ БИЗНЕСА'
                  )}
                </span>

                <h2>
                  {t(
                    'nav.businesses',
                    'Мои бизнесы'
                  )}
                </h2>

                <p>
                  {businesses.length
                    ? t(
                        'home.manageBusiness',
                        'Управляйте своими бизнесами в Skedwoo'
                      )
                    : t(
                        'home.createBusinessWebsiteHint',
                        'Создайте аккаунт и бизнес на сайте Skedwoo'
                      )}
                </p>

                <button
                  className="personal-white-button"
                  onClick={onAdmin}
                >
                  {t(
                    'common.open',
                    'Открыть'
                  )}
                </button>
              </div>
            )}

            {!loading &&
              hasStaffHint && (
                <div className="personal-business-card personal-role-card">
                  <span className="personal-eyebrow light">
                    {t(
                      'staff.workspaceEyebrow',
                      'МОЯ РАБОТА'
                    )}
                  </span>

                  <h2>
                    {t(
                      'staff.workspaceTitle',
                      'Рабочий кабинет'
                    )}
                  </h2>

                  <p>
                    {staffMemberships.length === 1
                      ? `${staffMemberships[0].business_name} · ${staffMemberships[0].specialist_name}`
                      : t(
                          'staff.multipleBusinesses',
                          'Ваши записи и график'
                        )}
                  </p>

                  <button
                    className="personal-white-button"
                    onClick={() =>
                      setPage('staff')
                    }
                  >
                    {t(
                      'staff.openWorkspace',
                      'Открыть'
                    )}
                  </button>
                </div>
              )}
          </div>

          <div className="personal-card personal-open-business-card">
            <div
              className="personal-open-decor"
              aria-hidden="true"
            >
              <span />
              <span />
              <span />
              <span />
            </div>

            <span className="personal-eyebrow">
              {t(
                'home.openBusiness',
                'Найти место'
              )}
            </span>

            <h2>
              {t(
                'home.openBusiness',
                'Найти место'
              )}
            </h2>

            <div className="personal-search">
              <input
                value={slug}
                onChange={e =>
                  setSlug(e.target.value)
                }
                placeholder={t(
                  'home.slugPlaceholder',
                  'Ссылка или slug бизнеса'
                )}
              />

              <button
                className="personal-black-button"
                onClick={() => open()}
              >
                {t(
                  'common.open',
                  'Открыть'
                )}
              </button>
            </div>
          </div>
        </div>
      )}

      {page === 'bookings' && (
        <div className="personal-page">
          <div className="personal-home-hero personal-compact">
            <span className="personal-eyebrow">
              SKEDWOO
            </span>

            <h1>
              {t(
                'nav.bookings',
                'Записи'
              )}
            </h1>
          </div>

          <MyBookings t={t} />
        </div>
      )}

      {page === 'saved' && (
        <SavedBusinessesPage
          t={t}
          open={open}
        />
      )}

      {page === 'staff' && (
        <StaffWorkspace
          memberships={staffMemberships}
          t={t}
          onBack={() =>
            setPage('home')
          }
        />
      )}

      {page !== 'staff' && (
        <nav className="personal-bottom-nav">
          <button
            className={
              page === 'home'
                ? 'active'
                : ''
            }
            onClick={() =>
              setPage('home')
            }
          >
            <span>⌂</span>
            <small>
              {t(
                'nav.home',
                'Главная'
              )}
            </small>
          </button>

          <button
            className={
              page === 'bookings'
                ? 'active'
                : ''
            }
            onClick={() =>
              setPage('bookings')
            }
          >
            <span>◷</span>
            <small>
              {t(
                'nav.bookings',
                'Записи'
              )}
            </small>
          </button>

          <button
            className={
              page === 'saved'
                ? 'active'
                : ''
            }
            onClick={() =>
              setPage('saved')
            }
          >
            <span>♡</span>
            <small>
              {t(
                'nav.saved',
                'Сохранённые'
              )}
            </small>
          </button>
        </nav>
      )}
    </section>
  );
}
