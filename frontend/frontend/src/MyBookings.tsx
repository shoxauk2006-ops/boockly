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

export function MyBookings({t}:{t:(key:string,fallback?:string)=>string}) {
  const myBookingsTimeZone = getClientTimeZone();

  const formatBookingDate = (item: any) => {
    if (!item?.start_at_utc) return item?.day || '';
    const formatted = formatUtcForTimeZone(
      item.start_at_utc,
      myBookingsTimeZone,
      { year: 'numeric', month: '2-digit', day: '2-digit' }
    );
    return formatted || item?.day || '';
  };

  const formatBookingTime = (item: any) => {
    if (!item?.start_at_utc || !item?.end_at_utc) {
      return `${item?.start?.slice(0, 5) || ''} – ${item?.end?.slice(0, 5) || ''}`;
    }
    const opts: Intl.DateTimeFormatOptions = { hour: '2-digit', minute: '2-digit', hour12: false };
    const start = formatUtcForTimeZone(item.start_at_utc, myBookingsTimeZone, opts);
    const end = formatUtcForTimeZone(item.end_at_utc, myBookingsTimeZone, opts);
    return `${start} – ${end}`;
  };

  const [items, setItems] =
    useState<any[]>([]);

  const [loading, setLoading] =
    useState(true);

  useEffect(() => {
    setLoading(true);

    fetch(
      API + '/my/bookings',
      {
        headers: headers()
      }
    )
      .then(r =>
        r.ok ? r.json() : []
      )
      .then(data => {
        setItems(
          Array.isArray(data)
            ? data
            : []
        );
      })
      .catch(() => {
        setItems([]);
      })
      .finally(() => {
        setLoading(false);
      });
  }, []);

  const cancelBooking =
    async (id: number) => {
      const ok =
        await confirmAsync(
          t(
            'client.cancelBookingConfirm'
          )
        );

      if (!ok) return;

      try {
        const response =
          await fetch(
            API +
              `/my/bookings/${id}/cancel`,
            {
              method: 'POST',
              headers: {
                ...headers(),
                'Content-Type':
                  'application/json'
              }
            }
          );

        if (!response.ok) {
          alert(
            t(
              'client.cancelBookingError'
            )
          );
          return;
        }

        setItems(prev =>
          prev.map(item =>
            item.id === id
              ? {
                  ...item,
                  status:
                    'cancelled'
                }
              : item
          )
        );

      } catch {
        alert(
          t(
            'client.connectionError'
          )
        );
      }
    };

  return (
    <div className="page">

      <h1>
        {t(
          'client.myBookings'
        )}
      </h1>

      {loading ? (
        <div className="card">
          <p>
            {t(
              'common.loading'
            )}
          </p>
        </div>
      ) : items.length === 0 ? (
        <div className="card">
          <p>
            {t(
              'client.noBookings'
            )}
          </p>
        </div>
      ) : (
        <div>
          {items.map(item => (
            <div
              className="card"
              key={item.id}
            >
              <h3>
                {item.business_name ||
                  t('app.name')}
              </h3>

              <p>
                {item.service_name ||
                  t(
                    'nav.services'
                  )}
              </p>

              <p>
                📅 {formatBookingDate(item)}
              </p>

              <p>
                🕐 {formatBookingTime(item)}
              </p>

              {item.status ===
              'cancelled' ? (
                <p
                  className="muted"
                >
                  {t(
                    'client.bookingCancelled'
                  )}
                </p>
              ) : (
                <button
                  onClick={() =>
                    cancelBooking(
                      item.id
                    )
                  }
                  style={{
                    marginTop: 10,
                    width: '100%',
                    padding: '12px',
                    borderRadius: 12,
                    border: 'none',
                    background:
                      '#e53935',
                    color: 'white',
                    fontWeight: 600
                  }}
                >
                  {t(
                    'client.cancelBooking'
                  )}
                </button>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
