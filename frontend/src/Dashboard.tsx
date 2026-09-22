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
import { QrPrintCard } from './QrPrintCard';
import { Stat } from './Stat';

export function Dashboard({
  bookings,
  business,
  t,
  setBusiness,
  statistics,
  statisticsLoading,
  statisticsPeriod,
  setStatisticsPeriod,
  teamMembers
}: {
  bookings: any[];
  business: any;
  t: (key: string, fallback?: string) => string;
  setBusiness: React.Dispatch<React.SetStateAction<any>>;
  statistics: any;
  statisticsLoading: boolean;
  statisticsPeriod: '7' | '30';
  setStatisticsPeriod: React.Dispatch<
    React.SetStateAction<'7' | '30'>
  >;
  teamMembers: any[];
}) {
  // Legacy subscription UI was removed from the Mini App.
  // Keep these values only as compatibility guards for stale JSX while the website owns billing.
  const subscriptionLocked = false;
  const showProModal = (_reason: string) => {};

  const today = getDateKeyForTimeZone(business?.timezone || 'Asia/Tashkent');

  const todayBookings = bookings.filter(
    x =>
      x.day === today &&
      x.status === 'confirmed'
  );

  const [showStatistics, setShowStatistics] =
  useState(false);

  const [statisticsStaffId, setStatisticsStaffId] =
    useState('all');

  const [dashboardStatistics, setDashboardStatistics] =
  useState<any>(null);

const [dashboardStatisticsLoading, setDashboardStatisticsLoading] =
  useState(false);

useEffect(() => {
  setStatisticsStaffId('all');
}, [business?.id]);

useEffect(() => {
  let cancelled = false;

  const loadStatistics = async () => {
    if (!business?.id) {
      return;
    }

    setDashboardStatisticsLoading(true);

    try {
      const statisticsUrl =
        API +
        '/admin/statistics' +
        (
          statisticsStaffId !== 'all'
            ? '?specialist_id=' +
              encodeURIComponent(
                statisticsStaffId
              )
            : ''
        );

      const response = await fetch(
        statisticsUrl,
        {
          headers: headers()
        }
      );

      if (!response.ok) {
        throw new Error(
          `Statistics request failed: ${response.status}`
        );
      }

      const data = await response.json();

      if (!cancelled) {
        setDashboardStatistics(data);
      }
    } catch (error) {
      console.error(
        'DASHBOARD STATISTICS ERROR:',
        error
      );
    } finally {
      if (!cancelled) {
        setDashboardStatisticsLoading(false);
      }
    }
  };

  loadStatistics();

  return () => {
    cancelled = true;
  };
}, [business?.id, statisticsStaffId]);

    const statisticsDaily =
  Array.isArray(dashboardStatistics?.daily)
    ? dashboardStatistics.daily
    : [];

  const visibleDaily =
    statisticsDaily.slice(
      statisticsPeriod === '7'
        ? -7
        : -30
    );

  const formatRevenueByCurrency = (
  revenue: Record<string, number> | undefined
) => {
  if (
    !revenue ||
    Object.keys(revenue).length === 0
  ) {
    return '0';
  }

  return Object.entries(revenue)
    .map(
      ([currency, amount]) =>
        money(
          Number(amount || 0),
          currency
        )
    )
    .join('\n');
};

  const clientLink =
    `https://t.me/${BOT_USERNAME}?startapp=${business.slug}`;

  const [qrDataUrl, setQrDataUrl] =
    useState('');

  const [qrPrintOpen, setQrPrintOpen] =
  useState(false);

  const [businessLinkCopied, setBusinessLinkCopied] =
    useState(false);

  const businessLinkCopiedTimer =
    useRef<number | null>(null);

  useEffect(() => {
    return () => {
      if (businessLinkCopiedTimer.current !== null) {
        window.clearTimeout(
          businessLinkCopiedTimer.current
        );
      }
    };
  }, []);

  useEffect(() => {
    const generateQR = async () => {
      try {
        const url = await QRCode.toDataURL(
          clientLink,
          {
            width: 500,
            margin: 3,
            errorCorrectionLevel: 'H'
          }
        );

        setQrDataUrl(url);
      } catch (e) {
        console.error(
          'Dashboard QR ERROR:',
          e
        );
      }
    };

    generateQR();
    }, [clientLink]);

  const downloadQr = async () => {
    if (!business.subscription_active) {
      return;
    }

    if (!qrDataUrl) {
      return;
    }

    try {
      const response =
        await fetch(qrDataUrl);

      const blob =
        await response.blob();

      const file = new File(
        [blob],
        `${business.slug}-bookly-qr.png`,
        {
          type: 'image/png'
        }
      );

      if (
        navigator.share &&
        navigator.canShare &&
        navigator.canShare({
          files: [file]
        })
      ) {
        await navigator.share({
          files: [file],
          title: t('owner.qrTitle', 'Skedwoo QR-код')
        });

        return;
      }

      const telegram = tg();

      if (
        telegram?.downloadFile
      ) {
        const qrUrl =
          `${API}/businesses/${encodeURIComponent(
            business.slug
          )}/qr.png?bot_username=${encodeURIComponent(
            BOT_USERNAME
          )}`;

        telegram.downloadFile(
          {
            url: qrUrl,
            file_name:
              `${business.slug}-bookly-qr.png`
          },
          (accepted: boolean) => {
            console.log(
              'QR download:',
              accepted
            );
          }
        );

        return;
      }

      const link =
        document.createElement('a');

      link.href = qrDataUrl;
      link.download =
        `${business.slug}-bookly-qr.png`;

      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);

    } catch (error) {
      console.error(
        'QR SHARE ERROR:',
        error
      );
    }
  };


  const copyLink = async () => {
    if (!business.subscription_active) {
      return;
    }

    try {
      await navigator.clipboard.writeText(
        clientLink
      );

      setBusinessLinkCopied(true);

      if (
        businessLinkCopiedTimer.current !== null
      ) {
        window.clearTimeout(
          businessLinkCopiedTimer.current
        );
      }

      businessLinkCopiedTimer.current =
        window.setTimeout(() => {
          setBusinessLinkCopied(false);
          businessLinkCopiedTimer.current = null;
        }, 1800);
    } catch (error) {
      console.error(
        'BUSINESS LINK COPY ERROR:',
        error
      );
    }
  };

  const openBusinessPage = () => {
    if (!business.subscription_active) {
      return;
    }

    if (tg()?.openTelegramLink) {
      tg().openTelegramLink(clientLink);
    } else {
      window.open(
        clientLink,
        '_blank'
      );
    }
  };

return (
  <>
      <div className="grid2">
        <Stat
          n={todayBookings.length}
          t={t('owner.today')}
        />

        <Stat
          n={
            business.subscription_active
              ? '✓'
              : '—'
          }
          t={t('owner.subscription')}
        />
      </div>

            {showStatistics && (
  <div className="card">
    <div
      style={{
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'flex-start',
        gap: 12,
        marginBottom: 14
      }}
    >
      <div>
        <h3 style={{ margin: 0 }}>
          {t(
            'owner.statistics',
            'Статистика'
          )}
        </h3>

        <p
          className="muted"
          style={{
            margin: '4px 0 0'
          }}
        >
          {t(
            'owner.statisticsHint',
            'Аналитика записей и выручки'
          )}
        </p>
      </div>

      <button
        type="button"
        onClick={() =>
          setShowStatistics(false)
        }
        aria-label="Закрыть статистику"
        style={{
          width: 36,
          height: 36,
          padding: 0,
          borderRadius: 10,
          background: '#f1f2f4',
          color: '#111',
          fontSize: 24,
          fontWeight: 400,
          lineHeight: 1,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          flexShrink: 0
        }}
      >
        ×
      </button>
    </div>

            {teamMembers.length > 0 && (
              <select
                value={statisticsStaffId}
                onChange={e =>
                  setStatisticsStaffId(
                    e.target.value
                  )
                }
                style={{
                  width: '100%',
                  marginBottom: 10
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

            <div
              style={{
                display: 'flex',
                gap: 6
              }}
            >
              <button
                type="button"
                onClick={() =>
                  setStatisticsPeriod('7')
                }
                style={{
                  padding: '7px 10px',
                  fontSize: 13,
                  background:
                    statisticsPeriod === '7'
                      ? '#111'
                      : '#fff',
                  color:
                    statisticsPeriod === '7'
                      ? '#fff'
                      : '#111',
                  border:
                    statisticsPeriod === '7'
                      ? '1px solid #111'
                      : '1px solid #ddd'
                }}
              >
                7 {t('owner.days', 'дней')}
              </button>

              <button
                type="button"
                onClick={() =>
                  setStatisticsPeriod('30')
                }
                style={{
                  padding: '7px 10px',
                  fontSize: 13,
                  background:
                    statisticsPeriod === '30'
                      ? '#111'
                      : '#fff',
                  color:
                    statisticsPeriod === '30'
                      ? '#fff'
                      : '#111',
                  border:
                    statisticsPeriod === '30'
                      ? '1px solid #111'
                      : '1px solid #ddd'
                }}
              >
                30 {t('owner.days', 'дней')}
              </button>
            </div>


  {dashboardStatisticsLoading ? (
    <p className="muted">
      {t(
        'owner.loadingStatistics',
        'Загружаем статистику...'
      )}
    </p>
  ) : dashboardStatistics ? (
    <>
      <div className="grid2">
        <Stat
          n={
            dashboardStatistics.today?.bookings ??
            0
          }
          t={t(
            'owner.todayBookings',
            'Сегодня'
          )}
        />

        <Stat
          n={
            dashboardStatistics.week?.bookings ??
            0
          }
          t={t(
            'owner.weekBookings',
            'За неделю'
          )}
        />

        <Stat
          n={
            dashboardStatistics.month?.bookings ??
            0
          }
          t={t(
            'owner.monthBookings',
            'За месяц'
          )}
        />

        <Stat
          n={
            dashboardStatistics.total ??
            0
          }
          t={t(
            'owner.totalBookings',
            'Всего'
          )}
        />
      </div>

      <div
        style={{
          display: 'grid',
          gridTemplateColumns:
            '1fr 1fr',
          gap: 10,
          marginTop: 10
        }}
      >
        <div
          style={{
            padding: 12,
            border: '1px solid #eee',
            borderRadius: 12
          }}
        >
          <strong>
            {t(
              'owner.revenueToday',
              'Сегодня'
            )}
          </strong>

          <div
            style={{
              marginTop: 4,
              fontSize: 18,
              fontWeight: 700
            }}
          >
            <div
  style={{
    whiteSpace: 'pre-line'
  }}
>
  {formatRevenueByCurrency(
    dashboardStatistics.today
      ?.revenue_by_currency
  )}
</div>
          </div>
        </div>

        <div
          style={{
            padding: 12,
            border: '1px solid #eee',
            borderRadius: 12
          }}
        >
          <strong>
            {t(
              'owner.revenueMonth',
              'За месяц'
            )}
          </strong>

          <div
            style={{
              marginTop: 4,
              fontSize: 18,
              fontWeight: 700
            }}
          >
            <div
  style={{
    whiteSpace: 'pre-line'
  }}
>
  {formatRevenueByCurrency(
    dashboardStatistics.month
      ?.revenue_by_currency
  )}
</div>
          </div>
        </div>
      </div>

      <div
        style={{
          display: 'grid',
          gridTemplateColumns:
            '1fr 1fr 1fr',
          gap: 8,
          marginTop: 10
        }}
      >
        <div
          style={{
            textAlign: 'center',
            padding: 10,
            border: '1px solid #eee',
            borderRadius: 10
          }}
        >
          <strong>
            {dashboardStatistics.confirmed ??
              0}
          </strong>

          <div className="muted">
            {t(
              'owner.confirmed',
              'Подтверждено'
            )}
          </div>
        </div>

        <div
          style={{
            textAlign: 'center',
            padding: 10,
            border: '1px solid #eee',
            borderRadius: 10
          }}
        >
          <strong>
            {dashboardStatistics.completed ??
              0}
          </strong>

          <div className="muted">
            {t(
              'owner.completed',
              'Завершено'
            )}
          </div>
        </div>

        <div
          style={{
            textAlign: 'center',
            padding: 10,
            border: '1px solid #eee',
            borderRadius: 10
          }}
        >
          <strong>
            {dashboardStatistics.cancelled ??
              0}
          </strong>

          <div className="muted">
            {t(
              'owner.cancelled',
              'Отменено'
            )}
          </div>
        </div>
      </div>

      <div style={{ marginTop: 18 }}>
        <h4 style={{ marginBottom: 10 }}>
          {t(
            'owner.bookingDynamics',
            'Динамика записей'
          )}
        </h4>

        {visibleDaily.length ? (
          <div
            style={{
              display: 'flex',
              alignItems: 'flex-end',
              gap: 6,
              height: 150,
              overflowX: 'auto',
              padding:
                '10px 2px 0'
            }}
          >
            {visibleDaily.map(
              item => {
                const max = Math.max(
                  ...visibleDaily.map(
                    x =>
                      Number(
                        x.bookings || 0
                      )
                  ),
                  1
                );

                const value =
                  Number(
                    item.bookings || 0
                  );

                const height =
                  Math.max(
                    8,
                    Math.round(
                      (value / max) *
                        110
                    )
                  );

                return (
                  <div
                    key={item.date}
                    style={{
                      minWidth:
                        statisticsPeriod ===
                        '7'
                          ? 34
                          : 22,
                      flex: 1,
                      display: 'flex',
                      flexDirection:
                        'column',
                      alignItems:
                        'center',
                      justifyContent:
                        'flex-end',
                      height: '100%'
                    }}
                  >
                    <span
                      style={{
                        fontSize: 11,
                        marginBottom: 4
                      }}
                    >
                      {value}
                    </span>

                    <div
                      style={{
                        width: '100%',
                        maxWidth: 24,
                        height,
                        background:
                          '#111',
                        borderRadius:
                          '6px 6px 2px 2px'
                      }}
                    />

                    <span
                      className="muted"
                      style={{
                        fontSize: 9,
                        marginTop: 5,
                        whiteSpace:
                          'nowrap'
                      }}
                    >
                      {item.date.slice(
                        5
                      )}
                    </span>
                  </div>
                );
              }
            )}
          </div>
        ) : (
          <p className="muted">
            {t(
              'owner.noStatisticsData',
              'Пока нет данных'
            )}
          </p>
        )}
      </div>

      {Array.isArray(
  dashboardStatistics.top_services
) &&
  dashboardStatistics.top_services.length >
    0 && (
          <div
            style={{
              marginTop: 18
            }}
          >
            <h4
              style={{
                marginBottom: 10
              }}
            >
              {t(
                'owner.topServices',
                'Популярные услуги'
              )}
            </h4>

            {dashboardStatistics.top_services.map(
              (
                service: any,
                index: number
              ) => (
                <div
                  key={service.id}
                  style={{
                    display: 'flex',
                    justifyContent:
                      'space-between',
                    alignItems:
                      'center',
                    padding:
                      '10px 0',
                    borderBottom:
                      index <
                      dashboardStatistics
                        .top_services
                        .length -
                        1
                        ? '1px solid #eee'
                        : 'none'
                  }}
                >
                  <div>
                    <strong>
                      {index + 1}.{' '}
                      {service.name}
                    </strong>

                    <div
                      className="muted"
                      style={{
                        marginTop: 2,
                        fontSize: 13
                      }}
                    >
                      {
                        service.bookings
                      }{' '}
                      {t(
                        'owner.bookingsCount',
                        'записей'
                      )}
                    </div>
                  </div>

                  <strong>
                    <div
  style={{
    whiteSpace: 'pre-line',
    textAlign: 'right'
  }}
>
  {formatRevenueByCurrency(
    service.revenue_by_currency
  )}
</div>
                  </strong>
                </div>
              )
            )}
          </div>
        )}
    </>
  ) : (
    <p className="muted">
      {t(
        'owner.statisticsUnavailable',
        'Статистика пока недоступна'
      )}
    </p>
  )}
</div>
)}
      <div className="card">
  <div
    style={{
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'space-between',
      marginBottom: 8
    }}
  >
    <h3 style={{ margin: 0 }}>
      {t('owner.today')}
    </h3>

    {business.subscription_active && (
      <button
        type="button"
        onClick={() =>
          setShowStatistics(
            value => !value
          )
        }
        style={{
          border: 'none',
          background: 'transparent',
          color: '#111',
          padding: 0,
          fontSize: 14,
          fontWeight: 700,
          cursor: 'pointer'
        }}
      >
        {t(
          'owner.statistics',
          'Статистика'
        )}{' '}
        →
      </button>
    )}
  </div>

        {todayBookings.length ? (
          todayBookings.map(x => (
            <BookingRow
              x={x}
              key={x.id}
              t={t}
              business={business}
            />
          ))
        ) : (
          <p>
            {t('owner.noBookings')}
          </p>
        )}
      </div>

        <div className="card admin-quick-actions">
          
        <div className="admin-section-title">
          <h3>
            {t(
              'owner.quickActions',
              'Быстрые действия'
            )}
          </h3>

          <p className="muted">
  {t(
    'owner.shareBusinessHint',
    'Поделитесь страницей бизнеса с клиентами'
  )}
</p>
        </div>

        <div className="subscription-feature-list">

          <div className="admin-action-row">
            <div>
              <strong>
                {t(
                  'owner.businessLink',
                  'Ссылка на бизнес'
                )}
              </strong>

              <small>
                {subscriptionLocked
                  ? t(
                      'owner.activateForClientLink',
                      'Активируйте подписку, чтобы получить клиентскую ссылку'
                    )
                  : clientLink}
              </small>
            </div>

            <button
  className="admin-action-button"
  onClick={() => {


    copyLink();
  }}
>
  {subscriptionLocked
    ? '🔒'
    : businessLinkCopied
      ? `✓ ${t(
          'common.copied',
          'Скопировано'
        )}`
      : t(
          'settings.copyLink',
          'Копировать'
        )}
</button>
          </div>

          <div className="admin-action-row">
            <div>
              <strong>
                {t(
                  'owner.openBusinessPage',
                  'Страница бизнеса'
                )}
              </strong>

              <small>
                {subscriptionLocked
                  ? t(
                      'owner.activateForClientPage',
                      'Функция доступна после активации'
                    )
                  : t(
                      'owner.openBusinessPageHint',
                      'Открыть клиентскую страницу'
                    )}
              </small>
            </div>

            <button
  className="admin-action-button"
  onClick={() => {

    openBusinessPage();
  }}
>
              {subscriptionLocked
                ? '🔒'
                : t(
                    'common.open',
                    'Открыть'
                  )}
            </button>
          </div>

          <div className="admin-qr-box">
  <strong>
    {t(
      'settings.qr',
      'QR-код'
    )}
  </strong>

  <small>
    {subscriptionLocked
  ? t(
      'owner.activateForQR',
      'Активируйте Skedwoo Pro, чтобы получить QR-код'
    )
  : t(
      'owner.clientQrHint',
      'Клиенты могут сканировать и сразу перейти к записи'
    )}
  </small>

  {subscriptionLocked ? (
  <>
    <div
      className="admin-qr-locked"
      onClick={() => showProModal('qr')}
    >
    {qrDataUrl && (
      <img
        src={qrDataUrl}
        alt={t(
          'owner.qrAlt',
          'QR-код'
        )}
        className="admin-home-qr admin-home-qr-blurred"
      />
    )}

    <div className="admin-qr-locked-overlay">
      <strong>
        {t(
          'owner.booklyProRequired',
          'Skedwoo Pro'
        )}
      </strong>

      <span>
        {t(
          'owner.activateToUnlock',
          'Активируйте Skedwoo Pro'
        )}
      </span>
    </div>
  </div>
        <button
  type="button"
  className="admin-action-button admin-download-button"
  onClick={() => showProModal('download')}
>
  🔒 {t(
    'settings.downloadQr',
    'Скачать QR-код'
  )}
</button>

<button
  type="button"
  className="admin-action-button admin-download-button qr-print-open-button"
  onClick={() => showProModal('print')}
>
  🔒 {t(
    'owner.printLayout',
    'Макет для печати'
  )}
    </button>
  </>
) : (
  qrDataUrl && (
    <>
      <img
        src={qrDataUrl}
        alt={t('owner.qrAlt', 'QR-код')}
        className="admin-home-qr"
      />

      <button
        type="button"
        className="admin-action-button admin-download-button"
        onClick={downloadQr}
      >
        {t(
          'settings.downloadQr',
          'Скачать QR-код'
        )}
      </button>

      <button
        type="button"
        className="admin-action-button admin-download-button qr-print-open-button"
        onClick={() => setQrPrintOpen(true)}
      >
        Макет для печати
      </button>
    </>
  )
)}
</div>

            

        </div>
      </div>

        <QrPrintCard
  business={business}
  qrDataUrl={qrDataUrl}
  open={qrPrintOpen}
  onClose={() => setQrPrintOpen(false)}
  t={t}
/>
    </>
  );
}
