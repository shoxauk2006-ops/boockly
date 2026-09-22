import { Language, getStoredLanguage } from './i18n';

declare global {
  interface Window {
    Telegram: any;
  }
}

export const API = import.meta.env.VITE_API_URL || 'http://localhost:8000';
export const BOT_USERNAME = import.meta.env.VITE_BOT_USERNAME || 'skedwoo_bot';
export const tg = () => window.Telegram?.WebApp;

// Свой диалог подтверждения на React (не зависит от Telegram/браузера —
// работает одинаково везде, в отличие от Telegram.WebApp.showConfirm
// или window.confirm, которые ненадёжны внутри Mini App).
export const confirmAsync = (message: string): Promise<boolean> =>
  new Promise((resolve) => {
    const handler = (window as any).__booklyConfirm;
    if (handler) {
      handler(message, resolve);
    } else {
      // на случай если модалка ещё не смонтировалась — редкий случай
      resolve(window.confirm(message));
    }
  });

export const initData = () => tg()?.initData || '';

export const getClientTimeZone = () => {
  try {
    return Intl.DateTimeFormat().resolvedOptions().timeZone || 'UTC';
  } catch {
    return 'UTC';
  }
};

export const getClientLocalDateKey = () => {
  const now = new Date();
  return [
    now.getFullYear(),
    String(now.getMonth() + 1).padStart(2, '0'),
    String(now.getDate()).padStart(2, '0')
  ].join('-');
};

export const getDateKeyForTimeZone = (timeZone: string) => {
  try {
    const parts = new Intl.DateTimeFormat('en-CA', { timeZone, year: 'numeric', month: '2-digit', day: '2-digit' }).formatToParts(new Date());
    const get = (type: string) => parts.find(part => part.type === type)?.value || '';
    return `${get('year')}-${get('month')}-${get('day')}`;
  } catch { return getClientLocalDateKey(); }
};

export const formatUtcForTimeZone = (
  value: string | undefined,
  timeZone: string,
  options: Intl.DateTimeFormatOptions
) => {
  if (!value) return '';
  try {
    return new Intl.DateTimeFormat(
      getLocale(),
      { ...options, timeZone }
    ).format(new Date(`${value}Z`));
  } catch {
    return '';
  }
};

export const headers = () => {
  const base: Record<string, string> = {
    'Content-Type': 'application/json',
    'X-Telegram-Init-Data': initData(),
    'X-Bookly-Language': getStoredLanguage()
  };

  try {
    const businessId =
      localStorage.getItem(
        'bookly_active_business_id'
      );

    if (businessId) {
      base['X-Bookly-Business-Id'] =
        businessId;
    }
  } catch {}

  return base;
};

export const LOCALE_MAP: Record<Language, string> = {
  ru: 'ru-RU',
  en: 'en-US',
  uz: 'uz-UZ',
  tr: 'tr-TR',
  ar: 'ar-SA'
};

export const getLocale = () =>
  LOCALE_MAP[getStoredLanguage()] || 'en-US';

export const money = (v: number, c = 'UZS') =>
  `${new Intl.NumberFormat(getLocale()).format(v)} ${c}`;

export const localizedDays = (
  t: (key: string, fallback?: string) => string
) => [
  t('days.mon'),
  t('days.tue'),
  t('days.wed'),
  t('days.thu'),
  t('days.fri'),
  t('days.sat'),
  t('days.sun')
];

export const TIMEZONE_OPTIONS = [
  ['Asia/Tashkent', 'Ташкент'],
  ['Asia/Almaty', 'Алматы'],
  ['Asia/Bishkek', 'Бишкек'],
  ['Asia/Dhaka', 'Дакка'],
  ['Asia/Karachi', 'Карачи'],
  ['Asia/Kolkata', 'Калькутта'],
  ['Asia/Dubai', 'Дубай'],
  ['Asia/Riyadh', 'Эр-Рияд'],
  ['Asia/Tehran', 'Тегеран'],
  ['Asia/Baghdad', 'Багдад'],
  ['Asia/Jerusalem', 'Иерусалим'],
  ['Asia/Baku', 'Баку'],
  ['Asia/Tbilisi', 'Тбилиси'],
  ['Europe/Moscow', 'Москва'],
  ['Europe/Istanbul', 'Стамбул'],
  ['Europe/Kiev', 'Киев'],
  ['Europe/Berlin', 'Берлин'],
  ['Europe/Paris', 'Париж'],
  ['Europe/London', 'Лондон'],
  ['Europe/Rome', 'Рим'],
  ['Europe/Madrid', 'Мадрид'],
  ['Africa/Cairo', 'Каир'],
  ['Africa/Johannesburg', 'Йоханнесбург'],
  ['America/New_York', 'Нью-Йорк'],
  ['America/Chicago', 'Чикаго'],
  ['America/Denver', 'Денвер'],
  ['America/Los_Angeles', 'Лос-Анджелес'],
  ['America/Toronto', 'Торонто'],
  ['America/Sao_Paulo', 'Сан-Паулу'],
  ['Australia/Sydney', 'Сидней'],
  ['Pacific/Auckland', 'Окленд']
];

export const ALL_TIMEZONES =
  typeof (Intl as any).supportedValuesOf ===
  'function'
    ? (Intl as any).supportedValuesOf('timeZone')
    : TIMEZONE_OPTIONS.map(
        ([value]) => value
      );

export const getTimeZoneLabel = (
  timeZone: string
) => {
  try {
    const locale =
      getLocale();

    const parts =
      new Intl.DateTimeFormat(
        locale,
        {
          timeZone,
          timeZoneName: 'long'
        }
      ).formatToParts(
        new Date()
      );

    const timeZoneName =
      parts.find(
        part =>
          part.type ===
          'timeZoneName'
      )?.value || '';

    const offsetParts =
      new Intl.DateTimeFormat(
        locale,
        {
          timeZone,
          timeZoneName: 'shortOffset'
        }
      ).formatToParts(
        new Date()
      );

    const offset =
      offsetParts.find(
        part =>
          part.type ===
          'timeZoneName'
      )?.value || '';

    if (timeZoneName) {
      return `${timeZoneName} (${offset})`;
    }

    return `${timeZone} (${offset})`;

  } catch {
    return timeZone;
  }
};

export const getTimeZoneOffsetMinutes = (
  timeZone: string
) => {
  try {
    const parts =
      new Intl.DateTimeFormat(
        'en-US',
        {
          timeZone,
          timeZoneName: 'longOffset'
        }
      ).formatToParts(
        new Date()
      );

    const value =
      parts.find(
        part =>
          part.type ===
          'timeZoneName'
      )?.value || '';

    const match = value.match(
      /GMT([+-])(\d{1,2})(?::(\d{2}))?$/
    );

    if (!match) {
      return 0;
    }

    const sign =
      match[1] === '-' ? -1 : 1;

    const hours =
      Number(match[2]);

    const minutes =
      Number(match[3] || 0);

    return sign * (
      hours * 60 + minutes
    );
  } catch {
    return 0;
  }
};

export const formatGMTOffset = (
  minutes: number
) => {
  if (minutes === 0) {
    return 'GMT+0';
  }

  const sign =
    minutes < 0 ? '-' : '+';

  const absolute =
    Math.abs(minutes);

  const hours =
    Math.floor(
      absolute / 60
    );

  const mins =
    absolute % 60;

  return mins
    ? `GMT${sign}${hours}:${String(
        mins
      ).padStart(2, '0')}`
    : `GMT${sign}${hours}`;
};

export const TIMEZONE_BY_OFFSET = TIMEZONE_OPTIONS.map(([zone]) => {
  const offset = getTimeZoneOffsetMinutes(zone);
  return {
    zone,
    offset,
    label: `${formatGMTOffset(offset)} — ${getTimeZoneLabel(zone)}`
  };
});
