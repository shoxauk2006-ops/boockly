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
import { Blocks } from './Blocks';
import { Bookings } from './Bookings';
import { Dashboard } from './Dashboard';
import { Hours } from './Hours';
import { Services } from './Services';
import { Settings } from './Settings';

export function Admin({
  onBack,
  initialTab,
  t
}: {
  onBack: () => void;
  initialTab: string;
  t: (key: string, fallback?: string) => string;
}) {
  const [tab, setTab] = useState(initialTab);

  const [businesses, setBusinesses] = useState<any[]>([]);
  const [business, setBusiness] = useState<any>(null);
  const [services, setServices] = useState<any[]>([]);
  const [hours, setHours] = useState<any[]>([]);
  const [blocks, setBlocks] = useState<any[]>([]);
  const [bookings, setBookings] = useState<any[]>([]);
  const [teamMembers, setTeamMembers] = useState<any[]>([]);
  const [statistics, setStatistics] = useState<any>(null);
  const [statisticsLoading, setStatisticsLoading] = useState(false);
  const [statisticsPeriod, setStatisticsPeriod] =
    useState<'7' | '30'>('7');
  
  

  const [loading, setLoading] = useState(true);
  const [businessesLoadFailed, setBusinessesLoadFailed] =
    useState(false);

  const [businessPanel, setBusinessPanel] =
    useState<'closed' | 'list' | 'create'>(
      initialTab === 'businesses' ? 'list' : 'closed'
    );

    const [newBusinessName, setNewBusinessName] =
    useState('');

  const [newBusinessDescription, setNewBusinessDescription] =
    useState('');

  const [newBusinessPhone, setNewBusinessPhone] =
    useState('');

  const [newBusinessAddress, setNewBusinessAddress] =
    useState('');

  const [newBusinessLatitude, setNewBusinessLatitude] =
    useState<number | null>(null);

  const [newBusinessLongitude, setNewBusinessLongitude] =
    useState<number | null>(null);

  const [newBusinessImage, setNewBusinessImage] =
    useState('');
  const [newBusinessTimezone, setNewBusinessTimezone] =
  useState(
    Intl.DateTimeFormat().resolvedOptions().timeZone ||
      'Asia/Tashkent'
  );

  const [timezoneSearch, setTimezoneSearch] =
  useState('');
  
  const [timezonePickerOpen, setTimezonePickerOpen] =
  useState(false);

const filteredTimezones =
  useMemo(() => {
    const search =
      timezoneSearch
        .trim()
        .toLowerCase();

    if (!search) {
      return TIMEZONE_BY_OFFSET;
    }

    return TIMEZONE_BY_OFFSET.filter(
      item =>
        item.label
          .toLowerCase()
          .includes(search) ||
        item.zone
          .toLowerCase()
          .includes(search)
    );
  }, [timezoneSearch]);

const [newBusinessHours, setNewBusinessHours] =
  useState([
    {
      weekday: 0,
      name: t('days.monFull', 'Понедельник'),
      enabled: true,
      start: '09:00',
      end: '18:00'
    },
    {
      weekday: 1,
      name: t('days.tueFull', 'Вторник'),
      enabled: true,
      start: '09:00',
      end: '18:00'
    },
    {
      weekday: 2,
      name: t('days.wedFull', 'Среда'),
      enabled: true,
      start: '09:00',
      end: '18:00'
    },
    {
      weekday: 3,
      name: t('days.thuFull', 'Четверг'),
      enabled: true,
      start: '09:00',
      end: '18:00'
    },
    {
      weekday: 4,
      name: t('days.friFull', 'Пятница'),
      enabled: true,
      start: '09:00',
      end: '18:00'
    },
    {
      weekday: 5,
      name: t('days.satFull', 'Суббота'),
      enabled: false,
      start: '09:00',
      end: '18:00'
    },
    {
      weekday: 6,
      name: t('days.sunFull', 'Воскресенье'),
      enabled: false,
      start: '09:00',
      end: '18:00'
    }
  ]);
  const [creatingBusiness, setCreatingBusiness] =
    useState(false);
  const [businessCreatedNotice, setBusinessCreatedNotice] =
  useState(false);
  useEffect(() => {
  if (!businessCreatedNotice) {
    return;
  }

  const scrollToTop = () => {
    window.scrollTo({
      top: 0,
      left: 0,
      behavior: 'auto'
    });
  };

  scrollToTop();

  const timer = window.setTimeout(() => {
    scrollToTop();
  }, 100);

  return () => {
    window.clearTimeout(timer);
  };
}, [businessCreatedNotice]);
  const loadBusinesses = async () => {
    setBusinessesLoadFailed(false);

    const response = await fetch(
      API + '/admin/businesses',
      {
        headers: headers()
      }
    );

    if (!response.ok) {
      throw new Error(
        t('owner.businessesLoadError')
      );
    }

    const list = await response.json();

    const normalized = Array.isArray(list)
      ? list
      : [];

    setBusinesses(normalized);

    let selectedId = '';

    try {
      selectedId =
        localStorage.getItem(
          'bookly_active_business_id'
        ) || '';
    } catch {}

    let selected = normalized.find(
      (item: any) =>
        String(item.id) ===
        String(selectedId)
    );

    if (!selected) {
      selected = normalized[0] || null;
    }

    if (selected) {
      try {
        localStorage.setItem(
          'bookly_active_business_id',
          String(selected.id)
        );
      } catch {}

      setBusiness(selected);
      return selected;
    }

    setBusiness(null);
    setBusinessPanel('list');
    return null;
  };

  const loadBusinessData = async (
    selectedBusiness: any
  ) => {
    if (!selectedBusiness) {
      setServices([]);
      setHours([]);
      setBlocks([]);
      setBookings([]);
      setTeamMembers([]);
      return;
    }

    const results =
      await Promise.allSettled([
        fetch(
          API + '/admin/services',
          {
            headers: headers()
          }
        ).then(r =>
          r.ok ? r.json() : []
        ),

        fetch(
          API + '/admin/hours',
          {
            headers: headers()
          }
        ).then(r =>
          r.ok ? r.json() : []
        ),

        fetch(
          API + '/admin/blocks',
          {
            headers: headers()
          }
        ).then(r =>
          r.ok ? r.json() : []
        ),

        fetch(
          API + '/admin/bookings',
          {
            headers: headers()
          }
        ).then(r =>
          r.ok ? r.json() : []
        ),

        fetch(
          API + '/admin/specialists',
          {
            headers: headers()
          }
        ).then(r =>
          r.ok ? r.json() : []
        ),

        fetch(
          API + '/admin/statistics',
          {
            headers: headers()
          }
        )
      ]);

    const [
      servicesResult,
      hoursResult,
      blocksResult,
      bookingsResult,
      specialistsResult,
      statisticsResult
    ] = results;

    if (
      servicesResult.status ===
      'fulfilled'
    ) {
      setServices(
        servicesResult.value || []
      );
    }

    if (
      hoursResult.status ===
      'fulfilled'
    ) {
      setHours(
        hoursResult.value || []
      );
    }

    if (
      blocksResult.status ===
      'fulfilled'
    ) {
      setBlocks(
        blocksResult.value || []
      );
    }

    if (
      bookingsResult.status ===
      'fulfilled'
    ) {
      setBookings(
        bookingsResult.value || []
      );
    }

    if (
      specialistsResult.status ===
      'fulfilled'
    ) {
      setTeamMembers(
        Array.isArray(specialistsResult.value)
          ? specialistsResult.value
          : []
      );
    }

    if (
  statisticsResult.status ===
  'fulfilled'
) {
  setStatistics(
    statisticsResult.value || null
  );
}
  };
  const load = async () => {
    if (!initData()) {
      setLoading(false);
      return;
    }

    try {
      const selected =
        await loadBusinesses();

      if (selected) {
        await loadBusinessData(selected);
      }

      setLoading(false);
    } catch (e) {
      console.error(
        'Bookly admin load error:',
        e
      );

      setBusinessesLoadFailed(true);
      setLoading(false);
    }
  };

  useEffect(() => {
    load();

    const refresh = () => {
      load();
    };


    window.addEventListener('focus', refresh);
    document.addEventListener('visibilitychange', refresh);
    

    return () => {
      window.removeEventListener('focus', refresh);
      document.removeEventListener('visibilitychange', refresh);
    };
  }, []);

  const openBooklyWebsite = () => {
    const url =
      'https://boockly.vercel.app/account.html';

    const telegram = tg();

    if (telegram?.openLink) {
      telegram.openLink(url);
      return;
    }

    window.open(
      url,
      '_blank',
      'noopener,noreferrer'
    );
  };

  const selectBusiness = async (
    selected: any
  ) => {
    try {
      localStorage.setItem(
        'bookly_active_business_id',
        String(selected.id)
      );
    } catch {}

    setBusiness(selected);
    setBusinessPanel('closed');
    setTab('home');

    setLoading(true);

    await loadBusinessData(selected);

    setLoading(false);
  };

  if (loading) {
    return (
      <div className="loading-screen">
        <div className="loading-logo">
          B
        </div>

        <h2>Bookly</h2>

        <div className="loading-spinner"></div>

        <p>
          {t('common.loading')}
        </p>
      </div>
    );
  }

  if (!initData()) {
    return (
      <div className="card">
        <button
          className="back"
          onClick={onBack}
        >
          ← {t('common.back')}
        </button>

        <h2>
          {t('owner.telegramOnlyTitle')}
        </h2>

        <p>
          {t(
            'owner.telegramOnlyDescription'
          )}
        </p>
      </div>
    );
  }

   if (businessesLoadFailed) {
    return (
      <section>
        <button
          className="back"
          onClick={onBack}
        >
          ← {t('common.back')}
        </button>

        <div className="card">
          <h2>
            {t(
              'nav.businesses',
              'Мои бизнесы'
            )}
          </h2>

          <p className="muted">
            {t(
              'owner.businessesLoadError',
              'Не удалось загрузить бизнесы'
            )}
          </p>

          <button
            className="primary full"
            style={{ marginTop: 12 }}
            onClick={() => {
              setLoading(true);
              load();
            }}
          >
            {t(
              'common.retry',
              'Повторить'
            )}
          </button>
        </div>
      </section>
    );
  }

   if (!business) {
    return (
      <section>
        <button
          className="back"
          onClick={onBack}
        >
          ← {t('common.back')}
        </button>

        <div className="card">
          <h2>
            {t(
              'nav.businesses',
              'Мои бизнесы'
            )}
          </h2>

          <p className="muted">
            {t(
              'home.createBusinessWebsiteHint',
              'Создайте аккаунт и бизнес на сайте Bookly. После подключения Telegram бизнес появится здесь автоматически.'
            )}
          </p>

          <button
            className="primary full"
            style={{ marginTop: 12 }}
            onClick={openBooklyWebsite}
          >
            {t(
              'home.goToWebsite',
              'Перейти на сайт'
            )}
          </button>
        </div>
      </section>
    );
  }

  if (!business && businessPanel === 'create') {
    return (
      <section>
        <button
          className="back"
          onClick={onBack}
        >
          ← {t('common.back')}
        </button>

        <div className="card">
          <h2>
            {t(
              'owner.addBusiness',
              'Добавить бизнес'
            )}
          </h2>

          <p className="muted">
            {t('owner.businessInfoHint')}
          </p>

          <input
            placeholder={t(
              'owner.serviceName',
              'Название бизнеса'
            )}
            value={newBusinessName}
            onChange={e =>
              setNewBusinessName(
                e.target.value
              )
            }
          />

          <textarea
            placeholder={t(
              'owner.businessDescription',
              'Описание бизнеса'
            )}
            value={newBusinessDescription}
            onChange={e =>
              setNewBusinessDescription(
                e.target.value
              )
            }
            rows={4}
          />

          <PhoneInput
  value={newBusinessPhone}
  onChange={setNewBusinessPhone}
  placeholder={t(
    'owner.businessPhone',
    'Номер телефона'
  )}
/>

          <input
            placeholder={t(
              'owner.businessAddress',
              'Адрес'
            )}
            value={newBusinessAddress}
            onChange={e =>
              setNewBusinessAddress(
                e.target.value
              )
            }
          />

          <button
            type="button"
            className="ghost"
            onClick={() => {
              if (!navigator.geolocation) {
                alert(
  t(
    'owner.geolocationUnavailable',
    'Геолокация недоступна'
  )
);
                return;
              }

              navigator.geolocation.getCurrentPosition(
                position => {
                  const latitude =
                    position.coords.latitude;

                  const longitude =
                    position.coords.longitude;

                  setNewBusinessLatitude(
                    latitude
                  );

                  setNewBusinessLongitude(
                    longitude
                  );
                },
                error => {
                  console.error(
                    'Geolocation error:',
                    error
                  );

                  alert(
  t(
    'owner.geolocationError',
    'Не удалось получить местоположение. Проверьте разрешение геолокации.'
  )
);
                },
                {
                  enableHighAccuracy: true,
                  timeout: 15000,
                  maximumAge: 0
                }
              );
            }}
          >
            📍 {t('owner.detectLocation')}
          </button>

          {newBusinessLatitude !== null &&
            newBusinessLongitude !== null && (
              <div
                className="muted"
                style={{
                  marginTop: 10,
                  padding: 12,
                  borderRadius: 12,
                  background: '#f5f5f5'
                }}
              >
                <strong>
                  📍 {t(
  'owner.locationSelected',
  'Местоположение выбрано'
)}
                </strong>

                <div
                  style={{
                    marginTop: 5
                  }}
                >
                  {newBusinessLatitude.toFixed(6)}
                  {', '}
                  {newBusinessLongitude.toFixed(6)}
                </div>

                <a
                  href={`https://www.google.com/maps?q=${newBusinessLatitude},${newBusinessLongitude}`}
                  target="_blank"
                  rel="noopener noreferrer"
                >
{t(
  'common.openOnMap',
  'Открыть на карте'
)}
                </a>
              </div>
            )}

          <div
            style={{
              marginTop: 20
            }}
          >
            <h3>
  {t(
    'owner.workingHours',
    'График работы'
  )}
</h3>

            <p
              className="muted"
              style={{
                marginTop: 4
              }}
            >
              {t('owner.hoursHint')}
            </p>

            <div
              style={{
                marginTop: 10
              }}
            >
              {newBusinessHours.map(
                (day, index) => (
                  <div
                    key={day.weekday}
                    style={{
                      padding: '12px 0',
                      borderBottom:
                        index <
                        newBusinessHours.length - 1
                          ? '1px solid #eee'
                          : 'none'
                    }}
                  >
                    <div
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent:
                          'space-between',
                        gap: 10
                      }}
                    >
                      <strong>
  {localizedDays(t)[day.weekday]}
</strong>

                      <label
  style={{
    display: 'flex',
    alignItems: 'center',
    cursor: 'pointer'
  }}
>
  <input
    type="checkbox"
    checked={day.enabled}
    onChange={e => {
      const next = [
        ...newBusinessHours
      ];

      next[index] = {
        ...next[index],
        enabled: e.target.checked
      };

      setNewBusinessHours(next);
    }}
  />
</label>
    
                    </div>

                    {day.enabled && (
                      <div
                        style={{
                          display: 'grid',
                          gridTemplateColumns:
                            '1fr 1fr',
                          gap: 10,
                          marginTop: 10
                        }}
                      >
                        <div>
                          <small className="muted">
                            {t('owner.opening')}
                          </small>

                          <input
                            type="time"
                            value={day.start}
                            onChange={e => {
                              const next = [
                                ...newBusinessHours
                              ];

                              next[index] = {
                                ...next[index],
                                start:
                                  e.target.value
                              };

                              setNewBusinessHours(
                                next
                              );
                            }}
                          />
                        </div>

                        <div>
                          <small className="muted">
                            {t('owner.closing')}
                          </small>

                          <input
                            type="time"
                            value={day.end}
                            onChange={e => {
                              const next = [
                                ...newBusinessHours
                              ];

                              next[index] = {
                                ...next[index],
                                end:
                                  e.target.value
                              };

                              setNewBusinessHours(
                                next
                              );
                            }}
                          />
                        </div>
                      </div>
                    )}
                  </div>
                )
              )}
            </div>

            <div
              style={{
                marginTop: 12,
                marginBottom: 0
              }}
            >
              <label
                style={{
                  display: 'block',
                  marginBottom: 8,
                  fontWeight: 600
                }}
              >
                {t('owner.businessTimezone')}
              </label>

              <div
                style={{
                  display: 'flex',
                  gap: 8,
                  alignItems: 'center'
                }}
              >
                <div
                  style={{
                    flex: 1,
                    padding: '11px 12px',
                    border: '1px solid #e5e7eb',
                    borderRadius: 12,
                    background: '#f8f9fa',
                    fontWeight: 600
                  }}
                >
                  {getTimeZoneLabel(newBusinessTimezone)}

                  <span
                    style={{
                      float: 'right',
                      color: '#16a34a'
                    }}
                  >
                    ✓
                  </span>
                </div>

                <button
                  type="button"
                  className="ghost"
                  onClick={() => {
                    setTimezonePickerOpen(
                      !timezonePickerOpen
                    );

                    if (!timezonePickerOpen) {
                      setTimezoneSearch('');
                    }
                  }}
                  style={{
                    whiteSpace: 'nowrap'
                  }}
                >
                  {timezonePickerOpen
                    ? t('owner.hide')
                    : t('owner.change')}
                </button>
              </div>

              {timezonePickerOpen && (
                <div
                  style={{
                    marginTop: 10,
                    padding: 12,
                    border: '1px solid #e5e7eb',
                    borderRadius: 16,
                    background: '#fff',
                    boxShadow:
                      '0 8px 24px rgba(0,0,0,0.08)'
                  }}
                >
                  <div
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      marginBottom: 10,
                      gap: 10
                    }}
                  >
                    <strong>
                      {t('owner.chooseTimezone')}
                    </strong>

                    <button
                      type="button"
                      className="ghost"
                      onClick={() => {
                        setTimezonePickerOpen(false);
                        setTimezoneSearch('');
                      }}
                      style={{
                        padding: '6px 10px'
                      }}
                    >
                      ×
                    </button>
                  </div>

                  <input
                    type="text"
                    placeholder={t('owner.searchTimezone')}
                    value={timezoneSearch}
                    onChange={e =>
                      setTimezoneSearch(e.target.value)
                    }
                  />

                  <div
                    style={{
                      maxHeight: 320,
                      overflowY: 'auto',
                      marginTop: 8,
                      border: '1px solid #e5e7eb',
                      borderRadius: 12,
                      background: '#fff'
                    }}
                  >
                    {filteredTimezones.map(item => (
                      <button
                        key={item.zone}
                        type="button"
                        onClick={() => {
                          setNewBusinessTimezone(
                            item.zone
                          );
                          setTimezonePickerOpen(false);
                          setTimezoneSearch('');
                        }}
                        style={{
                          width: '100%',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'space-between',
                          gap: 10,
                          textAlign: 'left',
                          padding: '11px 12px',
                          border: 0,
                          borderBottom:
                            '1px solid #f1f1f1',
                          background:
                            item.zone ===
                            newBusinessTimezone
                              ? '#f5f5f5'
                              : '#fff',
                          color: '#111',
                          cursor: 'pointer'
                        }}
                      >
                        <span>
                          {item.label}
                        </span>

                        {item.zone ===
                          newBusinessTimezone && (
                          <span
                            style={{
                              fontWeight: 700,
                              color: '#16a34a'
                            }}
                          >
                            ✓
                          </span>
                        )}
                      </button>
                    ))}

                    {filteredTimezones.length === 0 && (
                      <p
                        className="muted"
                        style={{
                          margin: 0,
                          padding: 14
                        }}
                      >
                        {t('owner.timezoneNotFound')}
                      </p>
                    )}
                  </div>
                </div>
              )}

              <p
                className="muted"
                style={{
                  marginTop: 8,
                  marginBottom: 0
                }}
              >
                {t('owner.deviceTimezoneHint')}
              </p>
            </div>

          <label
            style={{
              display: 'block',
              marginTop: 12
            }}
          >
            <span
              className="muted"
              style={{
                display: 'block',
                marginBottom: 8
              }}
            >
              {t('owner.businessPhoto')}
            </span>

            <input
              type="file"
              accept="image/*"
              onChange={e => {
                const file =
                  e.target.files?.[0];

                if (!file) {
                  return;
                }

                const reader =
                  new FileReader();

                reader.onload = () => {
                  setNewBusinessImage(
                    String(
                      reader.result || ''
                    )
                  );
                };

                reader.readAsDataURL(file);
              }}
            />
          </label>

          {newBusinessImage && (
            <img
              src={newBusinessImage}
              alt={t('owner.businessPhotoAlt', 'Фото бизнеса')}
              style={{
                width: '100%',
                maxHeight: 220,
                objectFit: 'cover',
                borderRadius: 16,
                marginTop: 12
              }}
            />
          )}

          <button
  className="primary full"
  disabled={creatingBusiness}
  onClick={createBusiness}
>
  {creatingBusiness ? (
    <>
      <span
        style={{
          display: 'inline-block',
          width: 14,
          height: 14,
          border: '2px solid rgba(211,47,47,0.25)',
borderTopColor: '#d32f2f',
          borderRadius: '50%',
          animation: 'bookly-spin .8s linear infinite',
          marginRight: 8,
          verticalAlign: '-2px'
        }}
      />
      Создание...
    </>
  ) : (
    t(
      'owner.createBusiness',
      'Создать бизнес'
    )
  )}
</button>
        </div>
      </div>
      </section>
        );
  }

  return (
    <section>
      <button
        className="back"
        onClick={onBack}
      >
        ← {t('common.back')}
      </button>

      <div className="business-head">
  <div>
    <h1>
      Обзор
    </h1>
  </div>

  <span
    className={
      business.subscription_active
        ? 'pill ok'
        : 'pill'
    }
  >
    {business.subscription_active
      ? t('owner.active')
      : t('owner.inactive')}
  </span>
</div>

      <div className="card">
        {business.business_image && (
  <img
  src={business.business_image}
  alt={business.name}
  className="bookly-business-avatar"
  style={{
    width: '90px',
    height: '90px',
    minWidth: '90px',
    maxWidth: '90px',
    minHeight: '90px',
    maxHeight: '90px',
    objectFit: 'contain',
    flexShrink: 0,
    display: 'block',
    borderRadius: '16px',
    background: '#f3f4f6',
    border: '1px solid #e7eaee'
  }}
/>
)}
        <div
          style={{
            display: 'flex',
            justifyContent:
              'space-between',
            alignItems: 'center',
            gap: 12
          }}
        >
          <div>
            <small className="muted">
              {t(
                'owner.currentBusiness'
              )}
            </small>

            <h2
              style={{
                margin: '4px 0'
              }}
            >
              {business.name}
            </h2>

            <p
              className="muted"
              style={{
                margin: 0
              }}
            >
              {business.address ||
                t(
                  'settings.address'
                )}
            </p>
          </div>

          <button
            onClick={() =>
              setBusinessPanel(
                businessPanel ===
                  'list'
                  ? 'closed'
                  : 'list'
              )
            }
          >
            ⚙️
          </button>
        </div>
      </div>

      {businessPanel === 'list' && (
        <div className="card">
          <h3>
            {t('nav.businesses')}
          </h3>

          {businesses.map(item => (
            <div
              key={item.id}
              style={{
                display: 'flex',
                justifyContent:
                  'space-between',
                alignItems: 'center',
                gap: 10,
                padding: '12px 0',
                borderBottom:
                  '1px solid #eee'
              }}
            >
              <div>
                <b>
                  {item.name}
                </b>

                <p
                  className="muted"
                  style={{
                    margin:
                      '4px 0 0'
                  }}
                >
                  {item.address ||
                    t(
                      'settings.address'
                    )}
                </p>
              </div>

              <button
                className={
                  business.id ===
                  item.id
                    ? 'primary'
                    : ''
                }
                onClick={() =>
                  selectBusiness(item)
                }
              >
                {business.id ===
                item.id
                  ? t(
                      'owner.opened'
                    )
                  : t(
                      'common.open'
                    )}
              </button>
            
            </div>
          ))}

          <button
            className="primary full"
            style={{
              marginTop: 12
            }}
            onClick={openBooklyWebsite}
          >
            {t(
              'owner.addBusinessOnWebsite',
              'Добавить бизнес на сайте'
            )}
          </button>
        </div>
      )}

              {businessPanel === 'create' && (
          <div className="card">
            <h2>
              {t(
                'owner.addBusiness',
                'Добавить бизнес'
              )}
            </h2>

            <input
              placeholder={t(
                'owner.serviceName',
                'Название бизнеса'
              )}
              value={newBusinessName}
              onChange={e =>
                setNewBusinessName(
                  e.target.value
                )
              }
            />

            <textarea
              placeholder={t(
                'owner.businessDescription',
                'Описание бизнеса'
              )}
              value={newBusinessDescription}
              onChange={e =>
                setNewBusinessDescription(
                  e.target.value
                )
              }
              rows={4}
            />

            <PhoneInput
  value={newBusinessPhone}
  onChange={setNewBusinessPhone}
  placeholder={t(
    'owner.businessPhone',
    'Номер телефона'
  )}
/>

            <input
              placeholder={t(
                'owner.businessAddress',
                'Адрес'
              )}
              value={newBusinessAddress}
              onChange={e =>
                setNewBusinessAddress(
                  e.target.value
                )
              }
            />

            <button
  type="button"
  className="ghost"
  onClick={() => {
    if (!navigator.geolocation) {
      alert(
  t(
    'owner.geolocationUnavailable',
    'Геолокация недоступна'
  )
);
      return;
    }

    navigator.geolocation.getCurrentPosition(
  position => {
    const latitude =
      position.coords.latitude;

    const longitude =
      position.coords.longitude;

    setNewBusinessLatitude(
      latitude
    );

    setNewBusinessLongitude(
      longitude
    );

    alert(
      t(
        'owner.locationDetected',
        'Местоположение получено'
      )
    );
  },
  error => {
    console.error(
      'Geolocation error:',
      error
    );

    alert(
      t(
        'owner.geolocationError',
        'Не удалось получить местоположение. Проверьте разрешение геолокации.'
      )
    );
  },
  {
    enableHighAccuracy: true,
    timeout: 15000,
    maximumAge: 0
  }
);
  }}
>
  📍 {t('owner.detectLocation')}
</button>

            {newBusinessLatitude !== null &&
  newBusinessLongitude !== null && (
    <div
      className="muted"
      style={{
        marginTop: 10,
        padding: 12,
        borderRadius: 12,
        background: '#f5f5f5'
      }}
    >
      <strong>
        📍 {t(
  'owner.locationSelected',
  'Местоположение выбрано'
)}
      </strong>

      <div
        style={{
          marginTop: 5
        }}
      >
        {newBusinessLatitude.toFixed(6)}
        {', '}
        {newBusinessLongitude.toFixed(6)}
      </div>

      <a
        href={`https://www.google.com/maps?q=${newBusinessLatitude},${newBusinessLongitude}`}
        target="_blank"
        rel="noopener noreferrer"
      >
{t(
  'common.openOnMap',
  'Открыть на карте'
)}
      </a>
    </div>
  )}
      <div
  style={{
    marginTop: 20
  }}
>
  <h3>
  {t(
    'owner.workingHours',
    'График работы'
  )}
</h3>

  <p
    className="muted"
    style={{
      marginTop: 4
    }}
  >
    {t('owner.hoursHint')}
  </p>

  <div
    className="card"
    style={{
      padding: 12,
      marginTop: 10
    }}
  >
    {newBusinessHours.map(
      (day, index) => (
        <div
          key={day.weekday}
          style={{
            padding: '12px 0',
            borderBottom:
              index <
              newBusinessHours.length - 1
                ? '1px solid #eee'
                : 'none'
          }}
        >
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent:
                'space-between',
              gap: 10
            }}
          >
            <strong>
  {localizedDays(t)[day.weekday]}
</strong>

            <label
  style={{
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center'
  }}
>
  <input
    type="checkbox"
    checked={day.enabled}
    onChange={e => {
      const next =
        [...newBusinessHours];

      next[index] = {
        ...next[index],
        enabled:
          e.target.checked
      };

      setNewBusinessHours(
        next
      );
    }}
  />
</label>
          </div>

          {day.enabled && (
            <div
              style={{
                display: 'grid',
                gridTemplateColumns:
                  '1fr 1fr',
                gap: 10,
                marginTop: 10
              }}
            >
              <div>
                <small className="muted">
                  {t('owner.opening')}
                </small>

                <input
                  type="time"
                  value={day.start}
                  onChange={e => {
                    const next =
                      [...newBusinessHours];

                    next[index] = {
                      ...next[index],
                      start:
                        e.target.value
                    };

                    setNewBusinessHours(
                      next
                    );
                  }}
                />
              </div>

              <div>
                <small className="muted">
                  {t('owner.closing')}
                </small>

                <input
                  type="time"
                  value={day.end}
                  onChange={e => {
                    const next =
                      [...newBusinessHours];

                    next[index] = {
                      ...next[index],
                      end:
                        e.target.value
                    };

                    setNewBusinessHours(
                      next
                    );
                  }}
                />
              </div>
            </div>
          )}
        </div>
      )
    )}
  </div>
</div>
            <div
  style={{
    marginTop: 12,
    marginBottom: 0
  }}
>
  <label
    style={{
      display: 'block',
      marginBottom: 8,
      fontWeight: 600
    }}
  >
    {t('owner.businessTimezone')}
  </label>

  <div
    style={{
      display: 'flex',
      gap: 8,
      alignItems: 'center'
    }}
  >
    <div
      style={{
        flex: 1,
        padding: '11px 12px',
        border: '1px solid #e5e7eb',
        borderRadius: 12,
        background: '#f8f9fa',
        fontWeight: 600
      }}
    >
      {getTimeZoneLabel(newBusinessTimezone)}

      <span
        style={{
          float: 'right',
          color: '#16a34a'
        }}
      >
        ✓
      </span>
    </div>

    <button
      type="button"
      className="ghost"
      onClick={() => {
        setTimezonePickerOpen(
          !timezonePickerOpen
        );

        if (!timezonePickerOpen) {
          setTimezoneSearch('');
        }
      }}
      style={{
        whiteSpace: 'nowrap'
      }}
    >
      {timezonePickerOpen
        ? t('owner.hide')
        : t('owner.change')}
    </button>
  </div>

  {timezonePickerOpen && (
    <div
      style={{
        marginTop: 10,
        padding: 12,
        border: '1px solid #e5e7eb',
        borderRadius: 16,
        background: '#fff',
        boxShadow:
          '0 8px 24px rgba(0,0,0,0.08)'
      }}
    >
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          marginBottom: 10,
          gap: 10
        }}
      >
        <strong>
          {t('owner.chooseTimezone')}
        </strong>

        <button
          type="button"
          className="ghost"
          onClick={() => {
            setTimezonePickerOpen(false);
            setTimezoneSearch('');
          }}
          style={{
            padding: '6px 10px'
          }}
        >
          ×
        </button>
      </div>

      <input
        type="text"
        placeholder={t('owner.searchTimezone')}
        value={timezoneSearch}
        onChange={e =>
          setTimezoneSearch(e.target.value)
        }
      />

      <div
        style={{
          maxHeight: 320,
          overflowY: 'auto',
          marginTop: 8,
          border: '1px solid #e5e7eb',
          borderRadius: 12,
          background: '#fff'
        }}
      >
        {filteredTimezones.map(item => (
          <button
            key={item.zone}
            type="button"
            onClick={() => {
              setNewBusinessTimezone(
                item.zone
              );
              setTimezonePickerOpen(false);
              setTimezoneSearch('');
            }}
            style={{
              width: '100%',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              gap: 10,
              textAlign: 'left',
              padding: '11px 12px',
              border: 0,
              borderBottom:
                '1px solid #f1f1f1',
              background:
                item.zone ===
                newBusinessTimezone
                  ? '#f5f5f5'
                  : '#fff',
              color: '#111',
              cursor: 'pointer'
            }}
          >
            <span>
              {item.label}
            </span>

            {item.zone ===
              newBusinessTimezone && (
              <span
                style={{
                  fontWeight: 700,
                  color: '#16a34a'
                }}
              >
                ✓
              </span>
            )}
          </button>
        ))}

        {filteredTimezones.length === 0 && (
          <p
            className="muted"
            style={{
              margin: 0,
              padding: 14
            }}
          >
            {t('owner.timezoneNotFound')}
          </p>
        )}
      </div>
    </div>
  )}

  <p
    className="muted"
    style={{
      marginTop: 8,
      marginBottom: 0
    }}
  >
    {t('owner.deviceTimezoneHint')}
  </p>
</div>

            <label
              style={{
                display: 'block',
                marginTop: 12
              }}
            >
              <span
                className="muted"
                style={{
                  display: 'block',
                  marginBottom: 8
                }}
              >
                {t('owner.businessPhoto')}
              </span>

              <input
                type="file"
                accept="image/*"
                onChange={e => {
                  const file =
                    e.target.files?.[0];

                  if (!file) {
                    return;
                  }

                  const reader =
                    new FileReader();

                  reader.onload = () => {
                    setNewBusinessImage(
                      String(
                        reader.result || ''
                      )
                    );
                  };

                  reader.readAsDataURL(file);
                }}
              />
            </label>

            {newBusinessImage && (
              <img
                src={newBusinessImage}
                alt={t(
  'owner.businessPhoto',
  'Фото бизнеса'
)}
                style={{
                  width: '100%',
                  maxHeight: 220,
                  objectFit: 'cover',
                  borderRadius: 16,
                  marginTop: 12
                }}
              />
            )}

            <button
              className="primary full"
              disabled={
                creatingBusiness
              }
              onClick={
                createBusiness
              }
            >
              {creatingBusiness
                ? t(
                    'owner.creatingBusiness',
                    'Создание...'
                  )
                : t(
                    'owner.createBusiness',
                    'Создать бизнес'
                  )}
            </button>
          </div>
        )}

     {businessCreatedNotice && (
  <div
    className="card"
    style={{
      position: 'relative',
      marginBottom: 16
    }}
  >
    <button
      type="button"
      onClick={() => setBusinessCreatedNotice(false)}
      aria-label={t('owner.closeInstruction', 'Закрыть инструкцию')}
      style={{
        position: 'absolute',
        top: 12,
        right: 12,
        width: 34,
        height: 34,
        padding: 0,
        borderRadius: '50%',
        border: '1px solid #e5e5e5',
        background: '#fff',
        fontSize: 22,
        lineHeight: 1,
        color: '#111',
        cursor: 'pointer'
      }}
    >
      ×
    </button>

    <div
      style={{
        textAlign: 'center',
        padding: '6px 36px 4px'
      }}
    >
      <div
        style={{
          width: 56,
          height: 56,
          margin: '0 auto 12px',
          borderRadius: '50%',
          background: '#e8f8ee',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          fontSize: 28
        }}
      >
        ✓
      </div>

      <h2 style={{ marginBottom: 6 }}>
        {t('owner.businessCreatedTitle')}
      </h2>

      <p className="muted">
        {t(
  'owner.setupIntro',
  'Отлично. Теперь подготовьте бизнес к запуску.'
)}
      </p>
    </div>

    <div style={{ marginTop: 18 }}>
      <h3>
  {t(
    'owner.setupChecklist',
    'Что нужно сделать'
  )}
</h3>

      <div
        style={{
          marginTop: 10,
          display: 'grid',
          gap: 8
        }}
      >
        <div
          className="card"
          style={{
            padding: 14,
            margin: 0,
            boxShadow: 'none'
          }}
        >
          <strong>{t('owner.setupStep1Title')}</strong>

          <p
            className="muted"
            style={{ margin: '5px 0 0' }}
          >
            {t(
              'owner.setupStep1Desc',
              'Проверьте название, описание, телефон, адрес и фотографию бизнеса.'
            )}
          </p>
        </div>

        <div
          className="card"
          style={{
            padding: 14,
            margin: 0,
            boxShadow: 'none'
          }}
        >
          <strong>{t('owner.setupStep2Title')}</strong>

          <p
            className="muted"
            style={{ margin: '5px 0 0' }}
          >
            {t(
              'owner.setupStep2Desc',
              'Добавьте красивую фотографию, чтобы клиентам было проще узнать ваш бизнес.'
            )}
          </p>
        </div>

        <div
          className="card"
          style={{
            padding: 14,
            margin: 0,
            boxShadow: 'none'
          }}
        >
          <strong>{t('owner.setupStep3Title')}</strong>

          <p
            className="muted"
            style={{ margin: '5px 0 0' }}
          >
            {t(
              'owner.setupStep3Desc',
              'Добавьте услуги, цены и продолжительность записи.'
            )}
          </p>
        </div>

        <div
          className="card"
          style={{
            padding: 14,
            margin: 0,
            boxShadow: 'none'
          }}
        >
          <strong>{t('owner.setupStep4Title')}</strong>

          <p
            className="muted"
            style={{ margin: '5px 0 0' }}
          >
            {t(
              'owner.setupStep4Desc',
              'Укажите рабочие дни и часы, когда клиенты могут записываться.'
            )}
          </p>
        </div>

        <div
          className="card"
          style={{
            padding: 14,
            margin: 0,
            boxShadow: 'none'
          }}
        >
          <strong>{t('owner.setupStep5Title')}</strong>

          <p
            className="muted"
            style={{ margin: '5px 0 0' }}
          >
            {t(
              'owner.setupStep5Desc',
              'Если нужно временно прекратить приём записей, создайте блокировку.'
            )}
          </p>
        </div>
      </div>
    </div>

    <div
      style={{
        marginTop: 16,
        padding: 14,
        borderRadius: 14,
        background: '#f5f5f5'
      }}
    >
      <strong>
  {t(
    'owner.howItWorks',
    'Как это работает'
  )}
</strong>

      <p className="muted">
  {t(
    'owner.setupBusinessDescription',
    'Сначала полностью настройте бизнес: информацию, фотографию, услуги, цены, график работы и блокировки.'
  )}
</p>

      <p className="muted">
  {t(
    'owner.businessReadyDescription',
    'После этого бизнес будет готов к работе внутри Bookly. Вы сможете управлять услугами и принимать записи от клиентов.'
  )}
</p>

      <p className="muted">
        {t(
          'owner.activateProDescription',
          'Чтобы клиенты могли найти ваш бизнес и самостоятельно записываться на услуги, активируйте Bookly Pro.'
        )}
      </p>

      <p className="muted">
        {t(
          'owner.proClientLinkDescription',
          'После активации вы получите клиентскую страницу, персональную ссылку и QR-код, которыми сможете делиться с клиентами.'
        )}
      </p>
    </div>

    <div
      style={{
        marginTop: 14,
        padding: 14,
        borderRadius: 14,
        border: '1px solid #e5e5e5'
      }}
    >
      <strong>
        Bookly Pro
      </strong>

      <p className="muted">
        {t(
          'owner.proOpenBusinessDescription',
          'После активации вы сможете открыть бизнес для клиентов и начать принимать онлайн-записи.'
        )}
      </p>

      <ul
        style={{
          paddingLeft: 20,
          marginBottom: 0
        }}
      >
        <li>{t('owner.clientPage')}</li>
        <li>{t('owner.personalLink')}</li>
        <li>{t('owner.businessQrCode')}</li>
        <li>{t('owner.onlineBookings')}</li>
        <li>{t('owner.newBookingNotifications')}</li>
      </ul>
    </div>

  </div>
)}

      {tab === 'home' && !businessCreatedNotice && (
<Dashboard
  bookings={bookings}
  business={business}
  t={t}
  setBusiness={setBusiness}
  statistics={statistics}
  statisticsLoading={statisticsLoading}
  statisticsPeriod={statisticsPeriod}
  setStatisticsPeriod={setStatisticsPeriod}
  teamMembers={teamMembers}
/>
      )}

      {tab === 'specialists' && (
        <Specialists
          services={services}
          reload={load}
          t={t}
        />
      )}

      {tab === 'services' && (
        <Services
          services={services}
          reload={load}
          business={business}
          t={t}
        />
      )}

      {tab === 'hours' && (
        <Hours
          hours={hours}
          reload={load}
          t={t}
        />
      )}

      {tab === 'blocks' && (
        <Blocks
          blocks={blocks}
          reload={load}
          t={t}
          business={business}
          teamMembers={teamMembers}
        />
      )}

      {tab === 'bookings' && (
        <Bookings
          bookings={bookings}
          reload={load}
          t={t}
          business={business}
          teamMembers={teamMembers}
        />
      )}

      {tab === 'settings' && (
        <Settings
          business={business}
          reload={load}
          t={t}
        />
      )}
      {tab === 'more' && (
  <div className="admin-more-page">
    <div className="card">
      <h2>{t('nav.more')}</h2>

      <button
        className="admin-more-item"
        onClick={() => setTab('specialists')}
      >
        <span>{t('nav.specialists', 'Специалисты')}</span>
        <b>→</b>
      </button>

      <button
        className="admin-more-item"
        onClick={() => setTab('hours')}
      >
        <span>{t('nav.schedule')}</span>
        <b>→</b>
      </button>

      <button
        className="admin-more-item"
        onClick={() => setTab('blocks')}
      >
        <span>{t('nav.blocks')}</span>
        <b>→</b>
      </button>

      <button
        className="admin-more-item"
        onClick={() => setTab('settings')}
      >
        <span>{t('nav.settings')}</span>
        <b>→</b>
      </button>

  </div>
</div>
)}
<nav className="admin-bottom-nav">

  <button
    className={tab === 'home' ? 'active' : ''}
    onClick={() => setTab('home')}
  >
    <span>⌂</span>
    <small>{t('nav.home')}</small>
  </button>

  <button
    className={tab === 'bookings' ? 'active' : ''}
    onClick={() => setTab('bookings')}
  >
    <span>◷</span>
    <small>{t('nav.bookings')}</small>
  </button>

  <button
    className={tab === 'services' ? 'active' : ''}
    onClick={() => setTab('services')}
  >
    <span>≡</span>
    <small>{t('nav.services')}</small>
  </button>

  <button
    className={tab === 'more' ? 'active' : ''}
    onClick={() => setTab('more')}
  >
    <span>•••</span>
    <small>{t('nav.more')}</small>
  </button>

</nav>

</section>
);
}

