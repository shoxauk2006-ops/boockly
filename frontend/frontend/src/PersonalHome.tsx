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
import { MyBookings } from './MyBookings';
import { SavedBusinessesPage } from './SavedBusinessesPage';

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
  const [page, setPage] = useState<'home' | 'bookings' | 'saved'>('home');
  const [loading, setLoading] = useState(true);
  const [emailCopied, setEmailCopied] = useState(false);

  useEffect(() => {
    let cancelled = false;

    const load = async () => {
      try {
        const response = await fetch(
          API + '/admin/businesses',
          { headers: headers() }
        );

        const data = response.ok
          ? await response.json()
          : [];

        if (!cancelled) {
          setBusinesses(
            Array.isArray(data) ? data : []
          );
        }
      } catch {
        if (!cancelled) {
          setBusinesses([]);
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

  return (
    <section className="personal-home">
      

      {page === 'home' && (
        <>
          <div className="personal-home-hero">
            <span className="personal-eyebrow">
              BOOKLY
            </span>

            <h1>
              {firstName
                ? `${t('home.greeting', 'С возвращением')}, ${firstName}`
                : t('home.greeting', 'С возвращением')}
            </h1>

            <p>
              {t(
                'home.description',
                'Bookly помогает бизнесу принимать записи прямо в Telegram.'
              )}
            </p>
          </div>

<div className="personal-card personal-open-business-card">
  <div className="personal-open-decor" aria-hidden="true">
    <span />
    <span />
    <span />
    <span />
  </div>

  <span className="personal-eyebrow">
              {t('home.openBusiness', 'Найти место')}
            </span>

            <h2>
              {t('home.openBusiness', 'Найти место')}
            </h2>

            <div className="personal-search">
              <input
                value={slug}
                onChange={(e) =>
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
                {t('common.open', 'Открыть')}
              </button>
            </div>
          </div>

          {loading ? (
  <div className="personal-business-skeleton">
    <div className="skeleton-line skeleton-small" />
    <div className="skeleton-line skeleton-title" />
    <div className="skeleton-line skeleton-text" />
    <div className="skeleton-button" />
  </div>
) : (
  <div className="personal-business-card">
    <span className="personal-eyebrow light">
      {t('nav.admin', 'ДЛЯ БИЗНЕСА')}
    </span>

    <h2>
      {t('nav.businesses', 'Мои бизнесы')}
    </h2>

    <p>
      {businesses.length
        ? t(
            'home.manageBusiness',
            'Управляйте своими бизнесами в Bookly'
          )
        : t(
            'home.createBusinessHint',
            'Добавьте свой бизнес в Bookly'
          )}
    </p>

    <button
      className="personal-white-button"
      onClick={onAdmin}
    >
      {t('common.open', 'Открыть')}
    </button>
  </div>
)}

          
        </>
      )}

      {page === 'bookings' && (
        <div className="personal-page">
          <div className="personal-home-hero personal-compact">
            <span className="personal-eyebrow">
              BOOKLY
            </span>

            <h1>
              {t('nav.bookings', 'Записи')}
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

      <nav className="personal-bottom-nav">
        <button
          className={page === 'home' ? 'active' : ''}
          onClick={() => setPage('home')}
        >
          <span>⌂</span>
          <small>
            {t('nav.home', 'Главная')}
          </small>
        </button>

        <button
          className={page === 'bookings' ? 'active' : ''}
          onClick={() => setPage('bookings')}
        >
          <span>◷</span>
          <small>
            {t('nav.bookings', 'Записи')}
          </small>
        </button>

        <button
          className={page === 'saved' ? 'active' : ''}
          onClick={() => setPage('saved')}
        >
          <span>♡</span>
          <small>
            {t('nav.saved', 'Сохранённые')}
          </small>
        </button>
      </nav>

    </section>
  );
}

