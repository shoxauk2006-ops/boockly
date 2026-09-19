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

export function BookingRow({
  x,
  t,
  business
}: {
  x: any;
  t: (key: string, fallback?: string) => string;
  business: any;
}) {
  const [cancelling, setCancelling] =
    useState(false);

  const [cancelled, setCancelled] =
    useState(x.status === 'cancelled');

  const [now, setNow] = useState(
  new Date()
);

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
  new Intl.DateTimeFormat(
    'sv-SE',
    {
      timeZone: businessTimezone,
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
      hour12: false
    }
  ).format(now).slice(0, 16);

  const bookingDateTime =
    `${x.day} ${x.start}`;

  const canCancel =
    !cancelled &&
    x.status ===
      'confirmed' &&
    bookingDateTime >
      nowDateTime;

  const bookingEndDateTime =
  `${x.day} ${x.end}`;

const isInProgress =
  !cancelled &&
  x.status === 'confirmed' &&
  bookingDateTime <= nowDateTime &&
  bookingEndDateTime > nowDateTime;

const isCompleted =
  !cancelled &&
  x.status === 'confirmed' &&
  bookingEndDateTime <= nowDateTime;

  const cancelBooking =
    async () => {
      if (!canCancel) {
        return;
      }

      const confirmed =
        await confirmAsync(
          `${t(
            'owner.cancelBookingConfirm'
          )} ${x.client_name}?`
        );

      if (!confirmed) {
        return;
      }

      setCancelling(
        true
      );

      try {
        const response =
          await fetch(
            API +
              `/admin/bookings/${x.id}/cancel`,
            {
              method:
                'POST',
              headers:
                headers()
            }
          );

        const data =
          await response
            .json()
            .catch(
              () => null
            );

        if (!response.ok) {
          throw new Error(
            data?.detail ||
            t(
              'owner.cancelBookingError'
            )
          );
        }

        setCancelled(true);

        alert(
          t(
            'owner.bookingCancelled'
          )
        );

      } catch (e: any) {
        console.error(
          'ADMIN CANCEL BOOKING ERROR:',
          e
        );

        alert(
          e?.message ||
          t(
            'owner.cancelBookingError'
          )
        );

      } finally {
        setCancelling(
          false
        );
      }
    };

  return (
    <div className="booking">

      <div>
        <b>
          {x.client_name}
        </b>

        <span>
          📅 {x.day}
        </span>

        <span>
          🕐{' '}
          {x.start.slice(
            0,
            5
          )}
          –
          {x.end.slice(
            0,
            5
          )}
        </span>

        <span>
          📞{' '}
          {
            x.client_phone ||
            t(
              'owner.phoneMissing'
            )
          }
        </span>

        {x.service_name && (
          <span>
            💈{' '}
            {
              x.service_name
            }
          </span>
        )}

        {x.specialist_name && (
          <span>
            👤{' '}
            {t(
              'owner.specialist',
              'Специалист'
            )}
            : {x.specialist_name}
          </span>
        )}
      </div>

      <div
        style={{
          display:
            'flex',
          flexDirection:
            'column',
          alignItems:
            'flex-end',
          gap: 8
        }}
      >

        <em>
  {cancelled
    ? t(
        'owner.cancelled'
      )
    : x.status === 'confirmed'
      ? isInProgress
        ? t(
            'owner.inProgress',
            'В процессе'
          )
        : isCompleted
          ? t(
              'owner.completed',
              'Завершено'
            )
          : t(
              'owner.confirmed',
              'Подтверждено'
            )
      : x.status}
</em>

        {canCancel && (
          <button
            className="danger"
            disabled={
              cancelling
            }
            onClick={
              cancelBooking
            }
          >
            {cancelling ? (
              <>
                <span
                  style={{
                    display: 'inline-block',
                    width: 14,
                    height: 14,
                    border: '2px solid rgba(255,255,255,0.35)',
                    borderTopColor: '#fff',
                    borderRadius: '50%',
                    animation: 'bookly-spin .8s linear infinite',
                    marginRight: 8,
                    verticalAlign: '-2px'
                  }}
                />
                {t(
                  'owner.cancelling'
                )}
              </>
            ) : t(
                'owner.cancel'
              )}
          </button>
        )}

      </div>

    </div>
  );
}
