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

export function SavedBusinessesPage({
  t,
  open
}: {
  t: (key: string, fallback?: string) => string;
  open: (input?: string) => void;
}) {
  const [items, setItems] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;

    fetch(
      API + '/my/saved-businesses',
      { headers: headers() }
    )
      .then((r) =>
        r.ok ? r.json() : []
      )
      .then((data) => {
        if (!cancelled) {
          setItems(
            Array.isArray(data) ? data : []
          );
        }
      })
      .catch(() => {
        if (!cancelled) {
          setItems([]);
        }
      })
      .finally(() => {
        if (!cancelled) {
          setLoading(false);
        }
      });

    return () => {
      cancelled = true;
    };
  }, []);

  if (loading) {
    return (
      <div className="personal-empty-page">
        <div className="personal-spinner" />
      </div>
    );
  }

  return (
    <div className="personal-page">

      <div className="personal-home-hero personal-compact">
        <span className="personal-eyebrow">
          BOOKLY
        </span>

        <h1>
          {t(
            'nav.saved',
            'Сохранённые'
          )}
        </h1>
      </div>

      {items.length === 0 ? (
        <div className="personal-empty-page">
          <div className="personal-empty-icon">
            ♡
          </div>

          <h2>
            {t(
              'client.noSavedBusinesses',
              'Нет сохранённых бизнесов'
            )}
          </h2>

          <p>
            {t(
              'home.emptySaved',
              'Здесь появятся сохранённые вами места.'
            )}
          </p>
        </div>
      ) : (
        items.map((item) => (
          <button
            key={item.id}
            className="personal-saved-card"
            onClick={() => open(item.slug)}
          >
            <span className="personal-saved-icon">
              B
            </span>

            <span className="personal-saved-info">
              <strong>{item.name}</strong>

              {item.address && (
                <small>
                  {item.address}
                </small>
              )}
            </span>

            <span className="personal-saved-arrow">
              →
            </span>
          </button>
        ))
      )}

    </div>
  );
}
