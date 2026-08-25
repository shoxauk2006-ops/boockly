import React,{useEffect,useMemo,useRef,useState} from 'react';
import {
  Language,
  SUPPORTED_LANGUAGES,
  createTranslator,
  getStoredLanguage,
  setStoredLanguage,
  applyLanguageDirection,
} from './i18n';
import {createRoot} from 'react-dom/client';
import QRCode from 'qrcode';
import './style.css';
declare global {
  interface Window {
    Telegram:any;
    Paddle:any;
  }
}
declare global { interface Window { Telegram:any } }
const API=import.meta.env.VITE_API_URL||'http://localhost:8000';
const BOT_USERNAME=import.meta.env.VITE_BOT_USERNAME||'BooklyBot';
const tg=()=>window.Telegram?.WebApp;
// Свой диалог подтверждения на React (не зависит от Telegram/браузера —
// работает одинаково везде, в отличие от Telegram.WebApp.showConfirm
// или window.confirm, которые ненадёжны внутри Mini App).
const confirmAsync = (message: string): Promise<boolean> =>
  new Promise((resolve) => {
    const handler = (window as any).__booklyConfirm;
    if (handler) {
      handler(message, resolve);
    } else {
      // на случай если модалка ещё не смонтировалась — редкий случай
      resolve(window.confirm(message));
    }
  });
const initData=()=>tg()?.initData||'';
const headers = () => {
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
const LOCALE_MAP: Record<Language, string> = {
  ru: 'ru-RU',
  en: 'en-US',
  uz: 'uz-UZ',
  tr: 'tr-TR',
  ar: 'ar-SA'
};

const getLocale = () =>
  LOCALE_MAP[getStoredLanguage()] || 'en-US';

const money = (v: number, c = 'UZS') =>
  `${new Intl.NumberFormat(getLocale()).format(v)} ${c}`;

const localizedDays = (
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
function BooklyAlertModal({
  open,
  title,
  message,
  onClose
}: {
  open: boolean;
  title: string;
  message: string;
  onClose: () => void;
}) {
  if (!open) {
    return null;
  }

  return (
    <div
      className="subscription-modal-overlay"
      onClick={onClose}
    >
      <div
        className="subscription-modal"
        onClick={(e) => e.stopPropagation()}
      >
        <button
          type="button"
          className="subscription-modal-close"
          onClick={onClose}
        >
          ×
        </button>

        <span className="personal-eyebrow">
          BOOKLY
        </span>

        <h2>{title}</h2>

        <p className="muted">
          {message}
        </p>

        <button
          type="button"
          className="primary full"
          onClick={onClose}
          style={{ marginTop: 16 }}
        >
          Понятно
        </button>
      </div>
    </div>
  );
}
function BooklyConfirmModal({
  open,
  message,
  onCancel,
  onConfirm
}: {
  open: boolean;
  message: string;
  onCancel: () => void;
  onConfirm: () => void;
}) {
  if (!open) {
    return null;
  }

  return (
    <div
      className="subscription-modal-overlay"
      onClick={onCancel}
    >
      <div
        className="subscription-modal"
        onClick={(e) => e.stopPropagation()}
      >
        <button
          type="button"
          className="subscription-modal-close"
          onClick={onCancel}
        >
          ×
        </button>

        <span className="personal-eyebrow">
          BOOKLY
        </span>

        <p className="muted">
          {message}
        </p>

        <div
          style={{
            display: 'grid',
            gridTemplateColumns: '1fr 1fr',
            gap: 8,
            marginTop: 16
          }}
        >
          <button
            type="button"
            onClick={onCancel}
          >
            Отмена
          </button>

          <button
            type="button"
            className="primary"
            onClick={onConfirm}
          >
            Подтвердить
          </button>
        </div>
      </div>
    </div>
  );
}
const TIMEZONE_OPTIONS = [
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
const ALL_TIMEZONES =
  typeof (Intl as any).supportedValuesOf ===
  'function'
    ? (Intl as any).supportedValuesOf('timeZone')
    : TIMEZONE_OPTIONS.map(
        ([value]) => value
      );

const getTimeZoneLabel = (
  timeZone: string
) => {
  try {
    const city = timeZone
      .split('/')
      .pop()
      ?.replace(/_/g, ' ');

    const parts =
      new Intl.DateTimeFormat(
        'en-US',
        {
          timeZone,
          timeZoneName:
            'shortOffset'
        }
      ).formatToParts(
        new Date()
      );

    const offset =
      parts.find(
        part =>
          part.type ===
          'timeZoneName'
      )?.value || '';

    return `${city || timeZone} (${offset})`;
  } catch {
    return timeZone;
  }
};
const getTimeZoneOffsetMinutes = (
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

const formatGMTOffset = (
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

const TIMEZONE_BY_OFFSET =
  Array.from(
    new Set(
      ALL_TIMEZONES.map(
        (zone: string) =>
          getTimeZoneOffsetMinutes(zone)
      )
    )
  )
    .sort(
      (a, b) => a - b
    )
    .map(offset => {
      const zone =
        ALL_TIMEZONES.find(
          (item: string) =>
            getTimeZoneOffsetMinutes(
              item
            ) === offset
        ) || '';
      
              return {
        zone,
        offset,
        label: `${formatGMTOffset(
          offset
        )} — ${
          getTimeZoneLabel(zone)
        }`
      };
    });

function App(){
    const [language, setLanguage] = useState<Language>(() => getStoredLanguage());
  const t = useMemo(() => createTranslator(language), [language]);

  const changeLanguage = (nextLanguage: Language) => {
    setLanguage(nextLanguage);
    setStoredLanguage(nextLanguage);
    applyLanguageDirection(nextLanguage);
  };

  useEffect(() => {
    applyLanguageDirection(language);
  }, [language]);
  const [mode,setMode]=useState<'home'|'admin'|'client'>('home');
  const [clientSlug,setClientSlug]=useState('');
  const [menuOpen,setMenuOpen]=useState(false);
  const [adminTab,setAdminTab]=useState('home');
  const [infoModal,setInfoModal]=useState(false);
  const [infoSection, setInfoSection] =
  useState<'help' | 'rules'>('help');
  const [alertModalOpen, setAlertModalOpen] = useState(false);
  const [alertModalMessage, setAlertModalMessage] = useState('');
  const [alertModalTitle, setAlertModalTitle] =
  useState('Bookly');

  const showBooklyAlert = (
  message: string,
  title = 'Bookly'
) => {
  setAlertModalTitle(title);
  setAlertModalMessage(message);
  setAlertModalOpen(true);
};
  useEffect(() => {
  const nativeAlert = window.alert;

  window.alert = (message?: any) => {
    showBooklyAlert(String(message ?? ''));
  };

  return () => {
    window.alert = nativeAlert;
  };
}, []);
  const [confirmModalOpen, setConfirmModalOpen] = useState(false);
  const [confirmModalMessage, setConfirmModalMessage] = useState('');
  const confirmResolveRef = useRef<((value: boolean) => void) | null>(null);

  useEffect(() => {
    (window as any).__booklyConfirm = (
      message: string,
      resolve: (value: boolean) => void
    ) => {
      confirmResolveRef.current = resolve;
      setConfirmModalMessage(message);
      setConfirmModalOpen(true);
    };

    return () => {
      delete (window as any).__booklyConfirm;
    };
  }, []);

  const resolveConfirmModal = (value: boolean) => {
    setConfirmModalOpen(false);
    const resolve = confirmResolveRef.current;
    confirmResolveRef.current = null;
    if (resolve) {
      resolve(value);
    }
  };
  const [emailCopied,setEmailCopied]=useState(false);
  useEffect(()=>{
    const telegram = tg();

telegram?.ready();

    const startParam =
      tg()?.initDataUnsafe?.start_param ||
      new URLSearchParams(window.location.search).get('startapp') ||
      '';

    if(startParam){
      setClientSlug(startParam);
      setMode('client');
    }
  },[]);

  useEffect(() => {
   const token = import.meta.env.VITE_PADDLE_CLIENT_TOKEN;

   if (!token) {
     console.error('Paddle client token is missing');
     return;
   }

   const initializePaddle = () => {
     if (!window.Paddle) return;

     window.Paddle.Environment.set('sandbox');

window.Paddle.Initialize({
  token,
  eventCallback: (event: any) => {
    if (event?.name === 'checkout.completed') {
      window.setTimeout(() => {
        window.dispatchEvent(
          new CustomEvent('bookly:subscription-updated')
        );
      }, 1500);
    }
  }
});
   };

   if (window.Paddle) {
     initializePaddle();
     return;
   }

   const script = document.createElement('script');
   script.src = 'https://cdn.paddle.com/paddle/v2/paddle.js';
   script.async = true;
   script.onload = initializePaddle;

   document.head.appendChild(script);
 },[]);

const openClient = (
  input?: string
) => {
  let value =
    (
      input ??
      clientSlug
    ).trim();

  if (!value) {
    return;
  }

  try {
    const url =
      new URL(value);

    const startApp =
      url.searchParams.get(
        'startapp'
      );

    if (startApp) {
      value = startApp;
    }
  } catch {
    // Если это уже slug,
    // оставляем его как есть.
  }

  const match =
    value.match(
      /startapp=([^&]+)/i
    );

  if (match) {
    value = match[1];
  }

  value =
    decodeURIComponent(value)
      .trim();

  setClientSlug(value);
  setMode('client');
};
 return <div className="app">
 <header>
  <div>
    <b>Bookly</b>
    <small>{t('app.tagline')}</small>
  </div>

  <select
    value={language}
    onChange={(e) =>
      changeLanguage(e.target.value as Language)
    }
    className="language-select"
  >
    {SUPPORTED_LANGUAGES.map((item) => (
      <option key={item.code} value={item.code}>
        {item.nativeLabel}
      </option>
    ))}
  </select>
</header>

  {menuOpen && (
    <>
      <div
        className="menu-overlay"
        onClick={()=>setMenuOpen(false)}
      />

      <aside className="side-menu">

        <div className="side-menu-head">
          <div>
            <b>Bookly</b>
         <small>{t('nav.more')}</small>
          </div>

          <button
            className="menu-close"
            onClick={()=>setMenuOpen(false)}
          >
            ×
          </button>
        </div>

        {mode==='admin' ? (
          <nav className="side-menu-nav">

            <button onClick={()=>{
              setAdminTab('home');
              setMenuOpen(false);
            }}>
              🏠 {t('nav.home')}
            </button>
            <button
  onClick={() => {
    setInfoSection('help');
    setInfoModal(true);
    setMenuOpen(false);
  }}
>
  ℹ️ Как работает Bookly
</button>

<button
  onClick={() => {
    setInfoSection('rules');
    setInfoModal(true);
    setMenuOpen(false);
  }}
>
  📄 Правила и контакты
</button>

            <button onClick={()=>{
              setAdminTab('services');
              setMenuOpen(false);
            }}>
              🛠 {t('nav.services')}
            </button>

            <button onClick={()=>{
              setAdminTab('hours');
              setMenuOpen(false);
            }}>
              {t('nav.schedule')}
            </button>

            <button onClick={()=>{
              setAdminTab('blocks');
              setMenuOpen(false);
            }}>
              {t('nav.blocks')}
            </button>

            <button onClick={()=>{
              setAdminTab('bookings');
              setMenuOpen(false);
            }}>
            {t('nav.bookings')}
            
            </button>

            <button onClick={()=>{
              setAdminTab('settings');
              setMenuOpen(false);
            }}>
              {t('nav.settings')}
            </button>

          </nav>
        ) : (
          <nav className="side-menu-nav">

            <button onClick={()=>{
              setMode('admin');
              setAdminTab('home');
              setMenuOpen(false);
            }}>
              👨‍💼 {t('nav.admin')}
            </button>

            <button onClick={()=>{
              setMode('home');
              setMenuOpen(false);
            }}>
              🏠 {t('nav.home')}
            </button>
            <button
  onClick={() => {
    setInfoSection('help');
    setInfoModal(true);
    setMenuOpen(false);
  }}
>
  ℹ️ Как работает Bookly
</button>

<button
  onClick={() => {
    setInfoSection('rules');
    setInfoModal(true);
    setMenuOpen(false);
  }}
>
  📄 Правила и контакты
</button>

          </nav>
        )}

      </aside>
    </>
  )}

 {mode==='home' && (
  <PersonalHome
  onAdmin={() => {
    setAdminTab('home');
    setMode('admin');
  }}
  slug={clientSlug}
  setSlug={setClientSlug}
  open={openClient}
  t={t}
  setInfoModal={() => setInfoModal(true)}
setInfoSection={setInfoSection}
/>
)}

  {mode === 'admin' && (
  <>
    <button
      type="button"
      className="admin-info-button"
      onClick={() => setInfoModal(true)}
    >
      ⓘ
    </button>

    <Admin
      onBack={() => setMode('home')}
      initialTab={adminTab}
      t={t}
      setInfoModal={() => setInfoModal(true)}
    />
  </>
)}

  {mode==='client' && (
  <>
    <button
      type="button"
      className="client-info-button"
      onClick={() => setInfoModal(true)}
    >
      ⓘ
    </button>

    <Client
      slug={clientSlug}
      onBack={() => setMode('home')}
      t={t}
    />
  </>
)}
<BooklyAlertModal
  open={alertModalOpen}
  title={alertModalTitle}
  message={alertModalMessage}
  onClose={() => {
    setAlertModalOpen(false);
    setAlertModalMessage('');
  }}
/>
<BooklyConfirmModal
  open={confirmModalOpen}
  message={confirmModalMessage}
  onCancel={() => resolveConfirmModal(false)}
  onConfirm={() => resolveConfirmModal(true)}
/>
{infoModal && (
  <div
    className="subscription-modal-overlay"
    onClick={() => setInfoModal(false)}
  >
    <div
      className="subscription-modal"
      onClick={(e) => e.stopPropagation()}
    >
      <button
        type="button"
        className="subscription-modal-close"
        onClick={() => setInfoModal(false)}
      >
        ×
      </button>

      <div
        style={{
          display: 'grid',
          gridTemplateColumns: '1fr 1fr',
          gap: 8,
          marginBottom: 20
        }}
      >
        <button
          type="button"
          className={
            infoSection === 'help'
              ? 'primary'
              : 'ghost'
          }
          onClick={() =>
            setInfoSection('help')
          }
        >
          Как работает Bookly
        </button>

        <button
          type="button"
          className={
            infoSection === 'rules'
              ? 'primary'
              : 'ghost'
          }
          onClick={() =>
            setInfoSection('rules')
          }
        >
          Правила и контакты
        </button>
      </div>

      {infoSection === 'help' ? (
        <>
          <span className="personal-eyebrow">
            BOOKLY
          </span>

          <h2>
            Как работает Bookly
          </h2>

          <h3>
  {t(
    'owner.forBusinessOwner',
    'Для владельца бизнеса'
  )}
</h3>

          <p className="muted">
            1. Создайте бизнес.
          </p>

          <p className="muted">
            2. Добавьте информацию и фотографию.
          </p>

          <p className="muted">
            3. Добавьте услуги и цены.
          </p>

          <p className="muted">
            4. Настройте график работы.
          </p>

          <p className="muted">
            5. При необходимости создайте блокировки.
          </p>

          <p className="muted">
            6. Управляйте записями.
          </p>

          <p className="muted">
            Чтобы начать принимать записи от клиентов,
            активируйте подписку Bookly Pro.
            После активации вы получите клиентскую
            ссылку и сможете начать принимать записи.
          </p>

          <h3>
            Bookly Pro
          </h3>

          <p className="muted">
            Bookly Pro открывает клиентскую часть Bookly:
          </p>

          <ul>
            <li>
              Клиентская страница
            </li>

            <li>
              Персональная ссылка для клиентов
            </li>

            <li>
              QR-код для клиентов
            </li>

            <li>
              Онлайн-записи
            </li>

            <li>
              Уведомления о новых записях
            </li>
            <li>
               До 10 услуг в базовом тарифе
           </li>
          </ul>

          <p className="muted">
            Без подписки вы можете создавать и
            настраивать бизнес, добавлять услуги,
            управлять графиком, блокировками и
            записями в админке.
            Подписка нужна для подключения клиентов
            и начала приёма онлайн-записей.
          </p>
        </>
      ) : (
        <>
          <span className="personal-eyebrow">
            BOOKLY
          </span>

          <h3>
            Правила использования
          </h3>

          <div
            className="muted"
            style={{
              lineHeight: '1.6'
            }}
          >
            <p>
              1. Bookly предназначен для законного
              использования и предоставления обычных
              товаров и услуг.
            </p>

            <p>
              2. Запрещено использовать Bookly для
              незаконных товаров или услуг, наркотиков,
              оружия, мошенничества, порнографии,
              азартных игр и другой запрещённой
              деятельности.
            </p>

            <p>
              3. Пользователь самостоятельно отвечает
              за законность своего бизнеса, товаров,
              услуг, рекламы и контента.
            </p>

            <p>
              4. Запрещено использовать Bookly для
              обмана клиентов, спама, фиктивных записей
              и другого злоупотребления сервисом.
            </p>

            <p>
              5. Пользователь обязан соблюдать
              применимое законодательство и требования
              по защите персональных данных.
            </p>

            <p>
              6. Мы вправе временно ограничить или
              полностью заблокировать бизнес при
              нарушении настоящих правил.
            </p>

            <p>
              7. Запрещено создавать новый бизнес или
              аккаунт для обхода ранее применённой
              блокировки.
            </p>

            <p>
              8. Мы можем изменять функции Bookly,
              временно ограничивать работу сервиса
              или прекращать предоставление сервиса.
            </p>

            <p>
              9. Мы не обещаем бесперебойную или
              безошибочную работу Bookly. Возможны
              технические сбои, обслуживание и
              недоступность сторонних сервисов.
            </p>

            <p>
              10. Используя Bookly, пользователь
              подтверждает согласие соблюдать эти
              правила.
            </p>

            <hr />

            <h3>
              Контакты
            </h3>

            <p>
              По вопросам работы Bookly и для сообщений
              о нарушениях:
            </p>

            <div className="contact-email-row">
              <a
                href="mailto:boocklyapp@gmail.com"
                className="contact-email"
              >
                boocklyapp@gmail.com
              </a>

              <button
                type="button"
                className="ghost"
                onClick={async () => {
                  try {
                    await navigator.clipboard.writeText(
                      'boocklyapp@gmail.com'
                    );

                    setEmailCopied(true);

                    setTimeout(() => {
                      setEmailCopied(false);
                    }, 1500);
                  } catch {}
                }}
              >
                {emailCopied
                  ? '✓ Скопировано'
                  : 'Скопировать'}
              </button>
            </div>
          </div>
        </>
      )}
    </div>
  </div>
)}

</div>
}

function PersonalHome({
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
  const [infoMenuOpen, setInfoMenuOpen] = useState(false);
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
      <div className="personal-home-menu">
  <button
    type="button"
    className="personal-menu-button"
    onClick={() => setInfoMenuOpen(!infoMenuOpen)}
  >
    ⓘ
  </button>

  {infoMenuOpen && (
    <div className="personal-info-menu">
     <button
  type="button"
  onClick={() => {
    setInfoMenuOpen(false);
    setInfoSection('help');
    setInfoModal();
  }}
>
  ℹ️ Как работает Bookly
</button>

<button
  type="button"
  onClick={() => {
    setInfoMenuOpen(false);
    setInfoSection('rules');
    setInfoModal();
  }}
>
  📄 Правила и контакты
</button>
    </div>
  )}
</div>

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

          <div className="personal-card">
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
      {businesses.length
        ? businesses.length === 1
          ? businesses[0].name
          : t('nav.businesses', 'Мои бизнесы')
        : t('owner.addBusiness', 'Создать бизнес')}
    </h2>

    <p>
      {businesses.length
        ? t(
            'home.manageBusiness',
            'Управляйте своим бизнесом в Bookly'
          )
        : t(
            'home.createBusinessHint',
            'Создайте свой бизнес в Bookly'
          )}
    </p>

    <button
      className="personal-white-button"
      onClick={onAdmin}
    >
      {businesses.length
        ? t('home.manage', 'Управлять')
        : t('owner.createBusiness', 'Создать бизнес')}
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

function SavedBusinessesPage({
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
function Home(p: any) {
  const [savedBusinesses, setSavedBusinesses] =
    useState<any[]>([]);

  const [savedLoading, setSavedLoading] =
    useState(true);

  useEffect(() => {
    const loadSaved =
      async () => {
        if (!initData()) {
          setSavedLoading(false);
          return;
        }

        try {
          const response =
            await fetch(
              API +
                '/my/saved-businesses',
              {
                headers:
                  headers()
              }
            );

          if (!response.ok) {
            setSavedBusinesses([]);
            return;
          }

          const data =
            await response.json();

          setSavedBusinesses(
            Array.isArray(data)
              ? data
              : []
          );

        } catch {
          setSavedBusinesses([]);
        } finally {
          setSavedLoading(false);
        }
      };

    loadSaved();
  }, []);

  return (
    <section>

      <div className="hero">
        <div className="logo">
          B
        </div>

        <h1>
  {p.t('home.title')}
</h1>

        <p>
   {p.t('home.description')}
</p>
      </div>

      <button
  className="primary full"
  onClick={p.onAdmin}
>
  {p.t('home.openAdmin')}
</button>

      <div className="card">

        <h3>
  {p.t('home.openBusiness')}
</h3>

        <input
          placeholder={p.t('home.slugPlaceholder')}
          value={p.slug}
          onChange={e =>
            p.setSlug(
              e.target.value
            )
          }
        />

        <button
  className="full"
  onClick={() =>
    p.open()
  }
>
  {p.t('common.open')}
</button>

      </div>

      <div className="card">

        <h2>
  ❤️ {p.t('client.savedBusinesses')}
</h2>

        {savedLoading ? (
          <p className="muted">
  {p.t('common.loading')}
</p>
        ) : savedBusinesses.length === 0 ? (
          <p className="muted">
  {p.t('home.emptySaved')}
</p>
        ) : (
          <div>
            {savedBusinesses.map(
              business => (
                <div
                  key={business.id}
                  className="card row"
                  style={{
                    marginBottom: 10
                  }}
                >

                  <div>
                    <b>
                      {business.name}
                    </b>

                    {business.address && (
                      <p
                        className="muted"
                        style={{
                          margin:
                            '5px 0 0'
                        }}
                      >
                        📍{' '}
                        {
                          business.address
                        }
                      </p>
                    )}

                    {business.phone && (
                      <p
                        className="muted"
                        style={{
                          margin:
                            '4px 0 0'
                        }}
                      >
                        ☎️{' '}
                        {business.phone}
                      </p>
                    )}
                  </div>

                  <button
  className="primary"
  onClick={() =>
    p.open(
      business.slug
    )
  }
>
  {p.t('common.open')}
</button>

                </div>
              )
            )}
          </div>
        )}

      </div>

    </section>
  );
}
function Admin({
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
  const [serviceLimit, setServiceLimit] = useState(10);
  const [newServiceLimit, setNewServiceLimit] = useState(10);
  const [savingServiceLimit, setSavingServiceLimit] = useState(false);
  const [limitModalOpen, setLimitModalOpen] = useState(false);
  const [limitPreview, setLimitPreview] = useState<any>(null);
  const [limitSaving, setLimitSaving] = useState(false);
  

  const [loading, setLoading] = useState(true);

  const [businessPanel, setBusinessPanel] =
    useState<'closed' | 'list' | 'create'>('closed');

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
      name: 'Понедельник',
      enabled: true,
      start: '09:00',
      end: '18:00'
    },
    {
      weekday: 1,
      name: 'Вторник',
      enabled: true,
      start: '09:00',
      end: '18:00'
    },
    {
      weekday: 2,
      name: 'Среда',
      enabled: true,
      start: '09:00',
      end: '18:00'
    },
    {
      weekday: 3,
      name: 'Четверг',
      enabled: true,
      start: '09:00',
      end: '18:00'
    },
    {
      weekday: 4,
      name: 'Пятница',
      enabled: true,
      start: '09:00',
      end: '18:00'
    },
    {
      weekday: 5,
      name: 'Суббота',
      enabled: false,
      start: '09:00',
      end: '18:00'
    },
    {
      weekday: 6,
      name: 'Воскресенье',
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

      

      // Загружаем актуальный лимит подписки с сервера.
      try {
        const businessResponse = await fetch(
          API + '/admin/business',
          { headers: headers() }
        );

        if (businessResponse.ok) {
          const businessData =
            await businessResponse.json();

          const savedLimit = Number(
            businessData?.services_limit
          );

          if (
            Number.isInteger(savedLimit) &&
            savedLimit >= 10
          ) {
            setServiceLimit(savedLimit);
            setNewServiceLimit(savedLimit);
          }
        }
      } catch (error) {
        console.error(
          'LOAD SERVICE LIMIT ERROR:',
          error
        );
      }

      setBusiness(selected);
      return selected;
    }

    setBusiness(null);
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
        )
      ]);

    const [
      servicesResult,
      hoursResult,
      blocksResult,
      bookingsResult
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
  };
  const changeServiceLimit = async () => {
  const limit = Number(newServiceLimit);

  if (!Number.isInteger(limit) || limit < 10) {
    alert(
      t(
        'owner.invalidServiceLimit',
        'Введите корректный лимит услуг'
       )
     );
    return;
  }

  if (limit === serviceLimit) {
    alert('Лимит уже установлен на этом уровне');
    return;
  }

  const priceByLimit: Record<number, number> = {
    10: 7.99,
    20: 12.98,
    30: 15.98,
    50: 19.98,
    100: 27.98
  };
 
    
  const nextPrice = priceByLimit[limit];

  const newPrice = priceByLimit[limit];

  if (!newPrice) {
    alert(
  t(
    'owner.invalidServiceLimitValue',
    'Недопустимый лимит'
  )
);
    return;
  }

  const isUpgrade = limit > serviceLimit;

  const message = isUpgrade
    ? `Изменить лимит с ${serviceLimit} на ${limit} услуг?\n\n` +
      `Новая цена: $${newPrice.toFixed(2)}/мес.\n\n` +
      `Paddle сразу рассчитает доплату за оставшуюся часть текущего периода и попросит подтвердить списание.`
    : `Уменьшить лимит с ${serviceLimit} до ${limit} услуг?\n\n` +
      `Возврата за текущий оплаченный период не будет.\n` +
      `Новый лимит и цена вступят в силу с следующего периода.\n\n` +
      `Новая цена: $${newPrice.toFixed(2)}/мес.`;




if (isUpgrade) {
  try {
    const previewResponse = await fetch(
      API + '/admin/subscription/preview-limit',
      {
        method: 'POST',
        headers: headers(),
        body: JSON.stringify({
          services_limit: limit
        })
      }
    );

    const preview = await previewResponse
      .json()
      .catch(() => null);

    if (!previewResponse.ok) {
      throw new Error(
        preview?.detail ||
        'Не удалось рассчитать стоимость'
      );
    }

    const immediateAmount =
      preview?.data?.update_summary?.immediate_transaction
        ?.details?.totals?.total
      ??
      preview?.data?.immediate_transaction
        ?.details?.totals?.total
      ??
      preview?.update_summary?.immediate_transaction
        ?.details?.totals?.total
      ??
      0;

    const currency =
      preview?.data?.currency_code ||
      preview?.currency_code ||
      'USD';

    const amountNumber =
      Number(immediateAmount) / 100;

   setLimitPreview({
  limit,
  currentLimit: serviceLimit,
  amount: amountNumber,
  currency,
  nextPrice
});

setLimitModalOpen(true);

return;

  } catch (error: any) {
    console.error(
      'SUBSCRIPTION PREVIEW ERROR:',
      error
    );

    alert(
  error?.message ||
  t(
    'owner.limitPreviewError',
    'Не удалось рассчитать сумму'
  )
);

    return;
  }
}
setSavingServiceLimit(true);
  setSavingServiceLimit(true);

  try {
    const response = await fetch(
      API + '/admin/subscription/change-limit',
      {
        method: 'POST',
        headers: headers(),
        body: JSON.stringify({
          services_limit: limit
        })
      }
    );

    const data = await response.json().catch(() => null);

    if (!response.ok) {
      throw new Error(
        data?.detail ||
        'Не удалось изменить лимит услуг'
      );
    }

    setServiceLimit(limit);
    setNewServiceLimit(limit);

    alert(
  t(
    'owner.serviceLimitChanged',
    'Лимит услуг изменён'
  )
);
  } catch (error: any) {
    console.error(
      'CHANGE SERVICE LIMIT ERROR:',
      error
    );

    alert(
  error?.message ||
  t(
    'owner.changeServiceLimitError',
    'Не удалось изменить лимит услуг'
  )
);
  } finally {
    setSavingServiceLimit(false);
  }
};
const confirmServiceLimitChange = async () => {
  if (!limitPreview) {
    return;
  }

  const limit = Number(limitPreview.limit);

  setLimitSaving(true);

  try {
    const response = await fetch(
      API + '/admin/subscription/change-limit',
      {
        method: 'POST',
        headers: headers(),
        body: JSON.stringify({
          services_limit: limit
        })
      }
    );

    const data = await response
      .json()
      .catch(() => null);

    if (!response.ok) {
      throw new Error(
        data?.detail ||
        'Не удалось изменить лимит услуг'
      );
    }

    setServiceLimit(limit);
    setNewServiceLimit(limit);
    setLimitModalOpen(false);
    setLimitPreview(null);
  } catch (error: any) {
  console.error(
    'CHANGE SERVICE LIMIT ERROR:',
    error
  );

  setLimitModalOpen(false);
  setLimitPreview(null);

  const rawMessage =
    error?.message || '';

  let paymentMessage =
    'Не удалось выполнить оплату.';

  if (
    rawMessage.includes(
      'subscription_payment_declined'
    )
  ) {
    paymentMessage =
      'Платёж отклонён.';
  } else if (
    rawMessage.includes(
      'not_enough_balance'
    )
  ) {
    paymentMessage =
      'Недостаточно средств на карте.';
  } else if (
    rawMessage.includes(
      'expired_card'
    )
  ) {
    paymentMessage =
      'Срок действия карты истёк.';
  } else if (
    rawMessage.includes(
      'authentication_failed'
    )
  ) {
    paymentMessage =
      'Не удалось пройти проверку платежа.';
  } else if (
    rawMessage.includes(
      'blocked_card'
    )
  ) {
    paymentMessage =
      'Эта карта заблокирована или недоступна для оплаты.';
  } else if (
    rawMessage.includes(
      'declined_not_retryable'
    )
  ) {
    paymentMessage =
      'Банк отклонил платёж, и повторная попытка невозможна.';
  } else if (rawMessage) {
    paymentMessage = rawMessage;
  }

  alert(paymentMessage);
} finally {
    setLimitSaving(false);
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

      setLoading(false);
    }
  };

  useEffect(() => {
    load();

    const refresh = () => {
      load();
    };

    const refreshSubscription = () => {
      window.setTimeout(() => {
        load();
      }, 1200);
    };

    window.addEventListener('focus', refresh);
    document.addEventListener('visibilitychange', refresh);
    window.addEventListener(
      'bookly:subscription-updated',
      refreshSubscription
    );

    return () => {
      window.removeEventListener('focus', refresh);
      document.removeEventListener('visibilitychange', refresh);
      window.removeEventListener(
        'bookly:subscription-updated',
        refreshSubscription
      );
    };
  }, []);

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

    const createBusiness = async () => {
  const name = newBusinessName.trim();

  if (!name) {
    alert(
      t(
        'owner.enterBusinessName',
        'Введите название бизнеса'
      )
    );
    return;
  }

  setCreatingBusiness(true);

  try {
    const response = await fetch(
      API + '/admin/businesses',
      {
        method: 'POST',
        headers: headers(),
        body: JSON.stringify({
          name,
          description: newBusinessDescription.trim(),
          phone: newBusinessPhone.trim(),
          address: newBusinessAddress.trim(),
          latitude: newBusinessLatitude,
          longitude: newBusinessLongitude,
          timezone: newBusinessTimezone,
          business_image: newBusinessImage,
          hours: newBusinessHours.map(day => ({
            weekday: day.weekday,
            start: day.start,
            end: day.end,
            active: day.enabled
          }))
        })
      }
    );

    const data = await response
      .json()
      .catch(() => null);

    if (!response.ok) {
      throw new Error(
        data?.detail ||
        t(
          'owner.createBusinessError',
          'Не удалось создать бизнес'
        )
      );
    }

    try {
      localStorage.setItem(
        'bookly_active_business_id',
        String(data.id)
      );
    } catch {}

    setNewBusinessName('');
    setNewBusinessDescription('');
    setNewBusinessPhone('');
    setNewBusinessAddress('');
    setNewBusinessLatitude(null);
    setNewBusinessLongitude(null);
    setNewBusinessImage('');

    setBusiness(data);
    setBusinessPanel('closed');
    setBusinessCreatedNotice(true);

    const updated = await fetch(
      API + '/admin/businesses',
      {
        headers: headers()
      }
    ).then(r =>
      r.ok ? r.json() : []
    );

    setBusinesses(
      Array.isArray(updated)
        ? updated
        : []
    );

    await loadBusinessData(data);

    setTab('home');

  } catch (e: any) {
    alert(
      e?.message ||
      t(
        'owner.createBusinessError',
        'Не удалось создать бизнес'
      )
    );
  } finally {
    setCreatingBusiness(false);
  }
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
              'owner.addBusiness',
              'Добавить бизнес'
            )}
          </h2>

          <p className="muted">
            Заполните информацию о бизнесе,
            чтобы клиенты могли его найти
            и записаться.
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

          <input
            type="tel"
            placeholder={t(
              'owner.businessPhone',
              'Номер телефона'
            )}
            value={newBusinessPhone}
            onChange={e =>
              setNewBusinessPhone(
                e.target.value
              )
            }
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
            📍 Определить местоположение
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
                  📍 Местоположение выбрано
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
                  Открыть на карте
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
              Укажите часы работы бизнеса.
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
                        {day.name}
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
                            Открытие
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
                            Закрытие
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
    Часовой пояс бизнеса
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
      {getTimeZoneLabel(
        newBusinessTimezone
      )}

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
        ? 'Скрыть'
        : 'Изменить'}
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
        Выберите часовой пояс
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
      placeholder="Найти город или часовой пояс..."
      value={timezoneSearch}
      onChange={e =>
        setTimezoneSearch(
          e.target.value
        )
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
      {filteredTimezones.map(
  item => (
          <button
            key={item.zone}
            type="button"
            onClick={() => {
              setNewBusinessTimezone(
                item.zone
              );
              setTimezonePickerOpen(
                false
              );
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
        )
      )}

      {filteredTimezones.length === 0 && (
        <p
          className="muted"
          style={{
            margin: 0,
            padding: 14
          }}
        >
          Часовой пояс не найден
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
    По умолчанию выбран часовой пояс
    вашего устройства. Вы можете изменить
    его вручную.
  </p>
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
    Часовой пояс бизнеса
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
      {getTimeZoneLabel(
        newBusinessTimezone
      )}

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
    >
      {timezonePickerOpen
        ? 'Скрыть'
        : 'Изменить'}
    </button>
  </div>

  {timezonePickerOpen && (
    <div
      style={{
        marginTop: 10,
        padding: 12,
        border: '1px solid #e5e7eb',
        borderRadius: 16,
        background: '#fff'
      }}
    >
      <input
        type="text"
        placeholder="Найти город или часовой пояс..."
        value={timezoneSearch}
        onChange={e =>
          setTimezoneSearch(
            e.target.value
          )
        }
      />

      <div
        style={{
          maxHeight: 320,
          overflowY: 'auto',
          marginTop: 8,
          border: '1px solid #e5e7eb',
          borderRadius: 12
        }}
      >
        {filteredTimezones.map(
          item => (
            <button
              key={item.zone}
              type="button"
              onClick={() => {
                setNewBusinessTimezone(
                  item.zone
                );
                setTimezonePickerOpen(
                  false
                );
                setTimezoneSearch('');
              }}
              style={{
                width: '100%',
                display: 'flex',
                alignItems: 'center',
                justifyContent:
                  'space-between',
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
                color: '#111'
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
          )
        )}
      </div>
    </div>
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
    Часовой пояс бизнеса
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
      {getTimeZoneLabel(
        newBusinessTimezone
      )}
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
    >
      {timezonePickerOpen
        ? 'Скрыть'
        : 'Изменить'}
    </button>
  </div>

  {timezonePickerOpen && (
    <div
      style={{
        marginTop: 10,
        padding: 12,
        border: '1px solid #e5e7eb',
        borderRadius: 16,
        background: '#fff'
      }}
    >
      <strong
        style={{
          display: 'block',
          marginBottom: 10
        }}
      >
        Выберите часовой пояс
      </strong>

      <input
        type="text"
        placeholder="Найти город или часовой пояс..."
        value={timezoneSearch}
        onChange={e =>
          setTimezoneSearch(
            e.target.value
          )
        }
      />

      <div
        style={{
          maxHeight: 320,
          overflowY: 'auto',
          marginTop: 8,
          border: '1px solid #e5e7eb',
          borderRadius: 12
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
              setTimezonePickerOpen(
                false
              );
              setTimezoneSearch('');
            }}
            style={{
              width: '100%',
              display: 'flex',
              justifyContent:
                'space-between',
              alignItems: 'center',
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
              color: '#111'
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
    По умолчанию выбран часовой пояс
    вашего устройства. Вы можете изменить
    его вручную.
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
              Фото бизнеса
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
              alt="Фото бизнеса"
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

      <div className="card">
        {business.business_image && (
  <img
  src={business.business_image}
  alt={business.name}
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
            onClick={() =>
              setBusinessPanel(
                'create'
              )
            }
          >
            + {t('owner.addBusiness')}
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

            <input
              type="tel"
              placeholder={t(
                'owner.businessPhone',
                'Номер телефона'
              )}
              value={newBusinessPhone}
              onChange={e =>
                setNewBusinessPhone(
                  e.target.value
                )
              }
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
        const latitude = position.coords.latitude;
        const longitude = position.coords.longitude;

        setNewBusinessLatitude(latitude);
        setNewBusinessLongitude(longitude);

        `Местоположение получено
      },
      error => {
        console.error('Geolocation error:', error);

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
  📍 Определить местоположение
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
        📍 Местоположение выбрано
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
        Открыть на карте
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
    Укажите часы работы бизнеса.
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
              {day.name}
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
                  Открытие
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
                  Закрытие
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
    Часовой пояс бизнеса
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
      {getTimeZoneLabel(
        newBusinessTimezone
      )}
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
    >
      {timezonePickerOpen
        ? 'Скрыть'
        : 'Изменить'}
    </button>
  </div>

  {timezonePickerOpen && (
    <div
      style={{
        marginTop: 10,
        padding: 12,
        border: '1px solid #e5e7eb',
        borderRadius: 16,
        background: '#fff'
      }}
    >
      <strong
        style={{
          display: 'block',
          marginBottom: 10
        }}
      >
        Выберите часовой пояс
      </strong>

      <input
        type="text"
        placeholder="Найти город или часовой пояс..."
        value={timezoneSearch}
        onChange={e =>
          setTimezoneSearch(
            e.target.value
          )
        }
      />

      <div
        style={{
          maxHeight: 320,
          overflowY: 'auto',
          marginTop: 8,
          border: '1px solid #e5e7eb',
          borderRadius: 12
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
              setTimezonePickerOpen(
                false
              );
              setTimezoneSearch('');
            }}
            style={{
              width: '100%',
              display: 'flex',
              justifyContent:
                'space-between',
              alignItems: 'center',
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
              color: '#111'
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
    По умолчанию выбран часовой пояс
    вашего устройства. Вы можете изменить
    его вручную.
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
                Фото бизнеса
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
                alt="Фото бизнеса"
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

      <div className="business-head">
        <div>
          <h1>
            {business.name}
          </h1>

          <p>
            {business.address ||
              t(
                'settings.address'
              )}
          </p>
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
      aria-label="Закрыть инструкцию"
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
        Бизнес создан
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
          <strong>
            1. Основная информация
          </strong>

          <p
            className="muted"
            style={{ margin: '5px 0 0' }}
          >
            Проверьте название, описание, телефон,
            адрес и фотографию бизнеса.
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
          <strong>
            2. Фотография
          </strong>

          <p
            className="muted"
            style={{ margin: '5px 0 0' }}
          >
            Добавьте красивую фотографию,
            чтобы клиентам было проще узнать ваш бизнес.
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
          <strong>
            3. Услуги
          </strong>

          <p
            className="muted"
            style={{ margin: '5px 0 0' }}
          >
            Добавьте услуги, цены и
            продолжительность записи.
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
          <strong>
            4. График работы
          </strong>

          <p
            className="muted"
            style={{ margin: '5px 0 0' }}
          >
            Укажите рабочие дни и часы,
            когда клиенты могут записываться.
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
          <strong>
            5. Блокировки
          </strong>

          <p
            className="muted"
            style={{ margin: '5px 0 0' }}
          >
            Если нужно временно прекратить приём
            записей, создайте блокировку.
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
        Сначала полностью настройте бизнес:
        информацию, фотографию, услуги, цены,
        график работы и блокировки.
      </p>

      <p className="muted">
        После этого бизнес будет готов к работе
        внутри Bookly. Вы сможете управлять услугами,
        расписанием и записями.
      </p>

      <p className="muted">
        Чтобы клиенты могли найти ваш бизнес
        и самостоятельно записываться на услуги,
        активируйте Bookly Pro.
      </p>

      <p className="muted">
        После активации вы получите клиентскую
        страницу, персональную ссылку и QR-код,
        которыми сможете делиться с клиентами.
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
        После активации вы сможете открыть бизнес
        для клиентов и начать принимать онлайн-записи.
      </p>

      <ul
        style={{
          paddingLeft: 20,
          marginBottom: 0
        }}
      >
        <li>Клиентская страница</li>
        <li>Персональная ссылка</li>
        <li>QR-код бизнеса</li>
        <li>Онлайн-записи</li>
        <li>Уведомления о новых записях</li>
      </ul>
    </div>

    <button
      type="button"
      className="primary full"
      style={{
        marginTop: 14
      }}
      onClick={() => {
        checkout(
          'paddle',
          business.id
        );
      }}
    >
      Активировать Bookly Pro
    </button>
  </div>
)}

      {tab === 'home' && !businessCreatedNotice && (
        <Dashboard
          bookings={bookings}
          business={business}
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
        />
      )}

      {tab === 'bookings' && (
        <Bookings
          bookings={bookings}
          reload={load}
          t={t}
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

function BusinessForm({onSaved, t}:{onSaved:()=>void; t:(key:string,fallback?:string)=>string}) {
  const [name,setName] = useState('');
  const [loading,setLoading] = useState(false);
  const [error,setError] = useState('');

  const save = async () => {
    setError('');

    const businessName = name.trim();

    if (!businessName) {
      setError(t('owner.enterBusinessName'));
      return;
    }

    setLoading(true);

    try {
      const initData = tg()?.initData || '';

      if (!initData) {
        throw new Error(
          t('owner.telegramInitDataMissing')
        );
      }

      const response = await fetch(API + '/admin/business', {
        method: 'POST',
        headers: {
          ...headers(),
          'Content-Type': 'application/json',
          'X-Telegram-Init-Data': initData
        },
        body: JSON.stringify({
          name: businessName
        })
      });

      const text = await response.text();

      let data:any = null;

      try {
        data = text ? JSON.parse(text) : null;
      } catch {
        data = null;
      }

      if (!response.ok) {
        throw new Error(
          data?.detail ||
          data?.message ||
          `${t('owner.serverError')} ${response.status}`
        );
      }

      onSaved();
    } catch (e:any) {
      console.error('CREATE BUSINESS ERROR:', e);
      setError(e?.message || t('owner.createBusinessError'));
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="card">
      <h2>{t('owner.createBusiness')}</h2>

      <input
        placeholder={t('owner.enterBusinessName')}
        value={name}
        disabled={loading}
        onChange={e=>{
          setName(e.target.value);
          setError('');
        }}
      />

      {error && (
        <div className="error" style={{marginTop:10}}>
          ❌ {error}
        </div>
      )}

      <button
        className="primary full"
        disabled={loading}
        onClick={save}
      >
        {loading ? t('owner.creatingBusiness') : t('owner.createBusiness')}
      </button>
    </div>
  );
}

function QrPrintCard({
  business,
  qrDataUrl,
  open,
  onClose
}: {
  business: any;
  qrDataUrl: string;
  open: boolean;
  onClose: () => void;
}) {
  if (!open || !qrDataUrl) {
    return null;
  }

  const downloadPrintableQr = async () => {
  if (!qrDataUrl) {
    return;
  }

  try {
    const canvas =
      document.createElement('canvas');

    const width = 1600;
    const height = 2200;

    canvas.width = width;
    canvas.height = height;

    const ctx =
      canvas.getContext('2d');

    if (!ctx) {
      return;
    }

    ctx.fillStyle = '#ffffff';

    ctx.fillRect(
      0,
      0,
      width,
      height
    );

    const qrImage =
      new Image();

    qrImage.onload = async () => {
      const businessName =
        String(
          business?.name ||
          'Ваш бизнес'
        );

      // BOOKLY
      ctx.fillStyle = '#111';

      ctx.textAlign = 'center';

      ctx.font =
        '900 72px Arial';

      ctx.fillText(
        'BOOKLY',
        width / 2,
        180
      );

      // Название бизнеса
      ctx.font =
        '800 62px Arial';

      ctx.fillText(
        businessName,
        width / 2,
        320
      );

      // Подзаголовок
      ctx.fillStyle = '#777';

      ctx.font =
        '500 34px Arial';

      ctx.fillText(
        'Онлайн-запись',
        width / 2,
        385
      );

      // Карточка QR
      const cardX = 150;
      const cardY = 500;
      const cardW = 1300;
      const cardH = 1300;

      ctx.fillStyle = '#fff';
      ctx.strokeStyle = '#e5e7eb';
      ctx.lineWidth = 4;

      ctx.beginPath();

      ctx.roundRect(
        cardX,
        cardY,
        cardW,
        cardH,
        45
      );

      ctx.fill();
      ctx.stroke();

      // QR
      const qrSize = 1050;

      const qrX =
        (width - qrSize) / 2;

      const qrY =
        cardY + 125;

      ctx.drawImage(
        qrImage,
        qrX,
        qrY,
        qrSize,
        qrSize
      );

      // Заголовок
      ctx.fillStyle = '#111';

      ctx.font =
        '800 58px Arial';

      ctx.fillText(
        'Запишитесь онлайн',
        width / 2,
        1910
      );

      // Инструкция
      ctx.fillStyle = '#707780';

      ctx.font =
        '500 34px Arial';

      ctx.fillText(
        'Отсканируйте QR-код',
        width / 2,
        1970
      );

      ctx.fillText(
        'камерой телефона',
        width / 2,
        2025
      );

      // Footer
      ctx.fillStyle = '#a0a5ab';

      ctx.font =
        '700 24px Arial';

      ctx.fillText(
        'POWERED BY BOOKLY',
        width / 2,
        2135
      );

      const dataUrl =
        canvas.toDataURL(
          'image/png',
          1
        );

      const response =
        await fetch(dataUrl);

      const blob =
        await response.blob();

      const file =
        new File(
          [blob],
          `${business?.slug || 'bookly'}-qr-print.png`,
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
          title:
            'Bookly — QR для печати'
        });

        return;
      }

      const url =
        URL.createObjectURL(blob);

      const link =
        document.createElement('a');

      link.href = url;

      link.download =
        `${business?.slug || 'bookly'}-qr-print.png`;

      document.body.appendChild(link);

      link.click();

      document.body.removeChild(link);

      setTimeout(() => {
        URL.revokeObjectURL(url);
      }, 1000);
    };

    qrImage.src = qrDataUrl;

  } catch (error) {
    console.error(
      'QR PRINT DOWNLOAD ERROR:',
      error
    );
  }
};

  return (
    <div
      className="qr-print-overlay"
      onClick={onClose}
    >
      <div
        className="qr-print-modal"
        onClick={(e) =>
          e.stopPropagation()
        }
      >
        <button
          type="button"
          className="subscription-modal-close"
          onClick={onClose}
        >
          ×
        </button>

        <div className="qr-print-sheet">
          <div className="qr-print-brand">
            BOOKLY
          </div>

          <h2>
            {business?.name || 'Ваш бизнес'}
          </h2>

          <p>
            Онлайн-запись
          </p>

          <div className="qr-print-code">
            <img
              src={qrDataUrl}
              alt="QR-код для записи"
            />
          </div>

          <h3>
            Запишитесь онлайн
          </h3>

          <span>
            Отсканируйте QR-код
            камерой телефона
          </span>

          <small>
            powered by Bookly
          </small>
        </div>

        <button
          type="button"
          className="primary full"
          onClick={downloadPrintableQr}
        >
          Скачать макет
        </button>
      </div>
    </div>
  );
}

function Dashboard({
  bookings,
  business,
  t
}: {
  bookings: any[];
  business: any;
  t: (key: string, fallback?: string) => string;
}) {
  const today = new Date()
    .toISOString()
    .slice(0, 10);

  const todayBookings = bookings.filter(
    x =>
      x.day === today &&
      x.status === 'confirmed'
  );

  const clientLink =
    `https://t.me/${BOT_USERNAME}?startapp=${business.slug}`;

  const [qrDataUrl, setQrDataUrl] =
    useState('');

  const [qrPrintOpen, setQrPrintOpen] =
  useState(false);

  useEffect(() => {
    if (!business.subscription_active) {
      setQrDataUrl('');
      return;
    }

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
    }, [
    clientLink,
    business.subscription_active
  ]);

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
          title: 'Bookly QR-код'
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

      alert(
        t(
          'settings.copyLink',
          'Ссылка скопирована'
        )
      );
    } catch {
      alert(clientLink);
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

  const subscriptionLocked =
    !business.subscription_active;

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

      <div className="card">
        <h3>
          {t('owner.today')}
        </h3>

        {todayBookings.length ? (
          todayBookings.map(x => (
            <BookingRow
              x={x}
              key={x.id}
              t={t}
            />
          ))
        ) : (
          <p>
            {t('owner.noBookings')}
          </p>
        )}
      </div>

      <div
        className={
          subscriptionLocked
            ? 'card admin-quick-actions subscription-locked'
            : 'card admin-quick-actions'
        }
      >
        <div className="admin-section-title">
          <h3>
            {t(
              'owner.quickActions',
              'Быстрые действия'
            )}
          </h3>

          <p className="muted">
            {subscriptionLocked
              ? t(
                  'owner.activateToAccessFeatures',
                  'Активируйте подписку, чтобы открыть доступ к функциям Bookly Pro'
                )
              : t(
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
              disabled={subscriptionLocked}
              onClick={copyLink}
            >
              {subscriptionLocked
                ? '🔒'
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
              disabled={subscriptionLocked}
              onClick={
                openBusinessPage
              }
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
          'Активируйте подписку, чтобы получить QR-код'
        )
      : 'Клиенты могут сканировать и сразу перейти к записи'}
  </small>

  {subscriptionLocked ? (
    <span className="admin-lock-badge">
      🔒
    </span>
  ) : (
    qrDataUrl && (
      <>
        <img
          src={qrDataUrl}
          alt="QR-код"
          className="admin-home-qr"
        />

        <button
  type="button"
  className="admin-action-button admin-download-button"
  onClick={downloadQr}
>
  Скачать QR-код
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

        {subscriptionLocked && (
          <div className="subscription-lock-overlay">
            <div className="subscription-lock-content">
              <div className="subscription-lock-icon">
                🔒
              </div>

              <strong>
                {t(
                  'owner.booklyProRequired',
                  'Функции Bookly Pro'
                )}
              </strong>

              <p>
                {t(
                  'owner.activateToUnlock',
                  'Активируйте подписку, чтобы получить полный доступ'
                )}
              </p>

              <button
                className="primary"
                onClick={() =>
                  checkout(
                    'paddle',
                    business.id
                  )
                }
              >
                {t(
                  'owner.openAccess',
                  'Открыть доступ'
                )}
              </button>
            </div>
          </div>
        )}
      </div>

<Subscription
  business={business}
  t={t}
  onUpdated={async () => {
    window.dispatchEvent(
      new CustomEvent('bookly:subscription-updated')
    );
  }}
/>
        <QrPrintCard
  business={business}
  qrDataUrl={qrDataUrl}
  open={qrPrintOpen}
  onClose={() => setQrPrintOpen(false)}
/>
    </>
  );
}
function Stat({n,t}:{n:any,t:string}){return <div className="stat"><strong>{n}</strong><span>{t}</span></div>}
function Subscription({
  business,
  t,
  onUpdated
}: {
  business: any;
  t: (key: string, fallback?: string) => string;
  onUpdated: (
  patch?: Record<string, any>
) => Promise<void>;
}) {
  const status = business?.subscription_status || 'inactive';
  const active = Boolean(business?.subscription_active);
  const currentServicesLimit = Number(
    business?.services_limit || 10
  );
  const pendingServicesLimit = Number(
    business?.pending_services_limit || 0
  );
  const currentPrice = Number(
    business?.current_price || 7.99
  );

  const addonPrices: Record<number, number> = {
    20: 4.99,
    30: 7.99,
    50: 11.99,
    100: 19.99
  };

  const currentAddonPrice =
    addonPrices[currentServicesLimit] || 0;

  const paymentFailed =
    status === 'past_due' || status === 'unpaid';

  const cancelledButActive =
    (status === 'cancelled' || status === 'canceled') && active;

  const packageCancellationPending =
    currentServicesLimit > 10 &&
    pendingServicesLimit === 10;

  const displayedMonthlyPrice =
  packageCancellationPending
    ? 7.99
    : currentPrice;

  const [subscriptionModal, setSubscriptionModal] =
    useState(false);
  const [changingServiceLimit, setChangingServiceLimit] =
    useState(false);
  const [subscriptionActionLoading, setSubscriptionActionLoading] =
    useState(false);

  const expiresAt =
    business?.subscription_expires_at
      ? new Date(business.subscription_expires_at)
      : null;

  const refreshAfterChange = async (
  patch?: Record<string, any>
) => {
  await onUpdated(patch);
  setSubscriptionModal(false);
};

  const changeServiceLimit = async (
    newLimit: number
  ) => {
    if (changingServiceLimit) return;

    setChangingServiceLimit(true);

    try {
      const previewResponse = await fetch(
        API + '/admin/subscription/preview-limit',
        {
          method: 'POST',
          headers: headers(),
          body: JSON.stringify({
            services_limit: newLimit
          })
        }
      );

      const preview = await previewResponse
        .json()
        .catch(() => null);

      if (!previewResponse.ok) {
        throw new Error(
          preview?.detail ||
          'Не удалось рассчитать стоимость изменения лимита'
        );
      }

      const immediateAmount =
        preview?.data?.update_summary?.result?.amount ??
        preview?.data?.immediate_transaction?.details?.totals?.total ??
        preview?.data?.update_summary?.immediate_transaction?.details?.totals?.total ??
        0;

      const recurringTotal =
        preview?.data?.recurring_transaction_details?.totals?.total ??
        preview?.data?.next_transaction?.details?.totals?.total ??
        null;

      const nextPrice =
        newLimit === 20 ? 12.98 :
        newLimit === 30 ? 15.98 :
        newLimit === 50 ? 19.98 :
        27.98;

      const confirmed = await confirmAsync(
        `Увеличить лимит до ${newLimit} услуг?\n\n` +
        `Сейчас к оплате: $${
          (Number(immediateAmount) / 100).toFixed(2)
        }\n` +
        `Со следующего продления: $${
          recurringTotal !== null
            ? (Number(recurringTotal) / 100).toFixed(2)
            : nextPrice.toFixed(2)
        }/мес.`
      );

      if (!confirmed) return;

      const response = await fetch(
        API + '/admin/subscription/change-limit',
        {
          method: 'POST',
          headers: headers(),
          body: JSON.stringify({
            services_limit: newLimit
          })
        }
      );

      const data = await response.json().catch(() => null);

      if (!response.ok) {
        throw new Error(
          data?.detail ||
          'Не удалось изменить лимит услуг'
        );
      }

      await refreshAfterChange({
  services_limit:
    data?.current_services_limit ?? newLimit,
  current_price:
    data?.current_price ?? nextPrice,
  pending_services_limit:
    data?.pending_services_limit ?? null,
  pending_price:
    data?.pending_price ?? null
});
    } catch (e: any) {
      alert(
        e?.message ||
        'Не удалось изменить лимит услуг'
      );
    } finally {
      setChangingServiceLimit(false);
    }
  };

  const cancelPackage = async () => {
    if (changingServiceLimit) return;

    const confirmed = await confirmAsync(
      'Отменить дополнительный пакет?\n\n' +
      'Пакет останется доступен до конца оплаченного периода.\n' +
      'Со следующего продления останется базовый лимит 10 услуг.'
    );

    if (!confirmed) return;

    setChangingServiceLimit(true);

    try {
      const response = await fetch(
        API + '/admin/subscription/change-limit',
        {
          method: 'POST',
          headers: headers(),
          body: JSON.stringify({
            services_limit: 10
          })
        }
      );

      const data = await response.json().catch(() => null);

      if (!response.ok) {
        throw new Error(
          data?.detail ||
          'Не удалось запланировать отмену пакета'
        );
      }

      await refreshAfterChange({
  services_limit:
    data?.current_services_limit ??
    currentServicesLimit,
  current_price:
    data?.current_price ??
    currentPrice,
  pending_services_limit:
    data?.pending_services_limit ?? 10,
  pending_price:
    data?.pending_price ?? 7.99
});
    } catch (e: any) {
      alert(
        e?.message ||
        'Не удалось отменить пакет'
      );
    } finally {
      setChangingServiceLimit(false);
    }
  };

  const resumePackage = async () => {
    if (changingServiceLimit) return;

    const confirmed = await confirmAsync(
      'Возобновить дополнительный пакет?\n\n' +
      'Пакет продолжит действовать и останется в подписке со следующего продления.'
    );

    if (!confirmed) return;

    setChangingServiceLimit(true);

    try {
      const response = await fetch(
        API + '/admin/subscription/resume-package',
        {
          method: 'POST',
          headers: headers()
        }
      );

      const data = await response.json().catch(() => null);

      if (!response.ok) {
        throw new Error(
          data?.detail ||
          'Не удалось возобновить пакет'
        );
      }

await refreshAfterChange({
  pending_services_limit: null,
  pending_price: null
});
    } catch (e: any) {
      alert(
        e?.message ||
        'Не удалось возобновить пакет'
      );
    } finally {
      setChangingServiceLimit(false);
    }
  };

  const cancelSubscription = async () => {
    const confirmed = await confirmAsync(
      t(
        'owner.confirmCancelSubscription',
        'Отменить автоматическое продление подписки? Доступ сохранится до конца оплаченного периода.'
      )
    );

    if (!confirmed) return;

    setSubscriptionActionLoading(true);

    try {
      const response = await fetch(
        API + '/admin/subscription/cancel',
        {
          method: 'POST',
          headers: headers()
        }
      );

      const data = await response.json().catch(() => null);

      if (!response.ok) {
        throw new Error(
          data?.detail ||
          t(
            'owner.cancelSubscriptionError',
            'Не удалось отменить подписку'
          )
        );
      }

await refreshAfterChange({
  subscription_status: 'cancelled',
  subscription_active: true,
  subscription_expires_at:
    data?.access_until ||
    business?.subscription_expires_at
});
    } catch (e: any) {
      alert(
        e?.message ||
        t(
          'owner.cancelSubscriptionError',
          'Не удалось отменить подписку'
        )
      );
    } finally {
      setSubscriptionActionLoading(false);
    }
  };

  const resumeSubscription = async () => {
    const confirmed = await confirmAsync(
      t(
        'owner.confirmResumeSubscription',
        'Возобновить автоматическое продление подписки?'
      )
    );

    if (!confirmed) return;

    setSubscriptionActionLoading(true);

    try {
      const response = await fetch(
        API + '/admin/subscription/resume',
        {
          method: 'POST',
          headers: headers()
        }
      );

      const data = await response.json().catch(() => null);

      if (!response.ok) {
        throw new Error(
          data?.detail ||
          t(
            'owner.resumeSubscriptionError',
            'Не удалось возобновить подписку'
          )
        );
      }

      await refreshAfterChange({
        subscription_status: 'active',
        subscription_active: true
      });
    } catch (e: any) {
      alert(
        e?.message ||
        t(
          'owner.resumeSubscriptionError',
          'Не удалось возобновить подписку'
        )
      );
    } finally {
      setSubscriptionActionLoading(false);
    }
  };

  if (active && !paymentFailed) {
    return (
      <div className="card subscription">
        <div className="subscription-head">
          <div>
            <h3>Bookly Pro</h3>
            <p>
              <b>${displayedMonthlyPrice.toFixed(2)} / месяц</b>
            </p>
            <div>
              <span>Лимит услуг</span>
              <strong>
                {currentServicesLimit} услуг
              </strong>
            </div>
          </div>

          <span className="pill ok">
            {t('owner.active', 'Активна')}
          </span>
        </div>

        <p>
          {cancelledButActive
            ? 'Автопродление отменено. Доступ сохраняется до конца оплаченного периода.'
            : t(
                'owner.subscribeAccessText',
                'Полный доступ к возможностям Bookly Pro'
              )}
        </p>

        <ul>
          <li>{t('owner.clientLink', 'Клиентская страница и ссылка')}</li>
          <li>{t('owner.qrCode', 'QR-код бизнеса')}</li>
          <li>До {currentServicesLimit} услуг</li>
          <li>{t('owner.telegramNotifications', 'Уведомления в Telegram')}</li>
        </ul>

        <div className="success">
          <strong>
            {cancelledButActive
              ? t(
                  'owner.subscriptionCancelledTitle',
                  'Автопродление отменено'
                )
              : t(
                  'owner.booklyActivated',
                  'Bookly Pro активирован'
                )}
          </strong>

          {expiresAt && (
            <p className="muted">
              {cancelledButActive
                ? 'Доступ до:'
                : t('owner.nextPayment', 'Следующее списание')}
              {' '}
              {expiresAt.toLocaleDateString(getLocale())}
            </p>
          )}
        </div>

        {packageCancellationPending && (
          <div
            className="success"
            style={{ marginTop: 12 }}
          >
            <strong>Пакет отменён на следующее продление</strong>
            <p className="muted">
              Сейчас у вас {currentServicesLimit} услуг. До конца оплаченного периода пакет продолжает действовать.
            </p>
          </div>
        )}

        <button
          type="button"
          className="subscription-manage-button"
          onClick={() => setSubscriptionModal(true)}
        >
          {t(
            'owner.manageSubscription',
            'Управление подпиской'
          )}
        </button>

        {subscriptionModal && (
          <div
            className="subscription-modal-overlay"
            onClick={() => setSubscriptionModal(false)}
          >
            <div
              className="subscription-modal"
              onClick={(e) => e.stopPropagation()}
            >
              <button
                type="button"
                className="subscription-modal-close"
                onClick={() => setSubscriptionModal(false)}
              >
                ×
              </button>

              <span className="personal-eyebrow">BOOKLY PRO</span>

              <h3>
                {t(
                  'owner.manageSubscription',
                  'Управление подпиской'
                )}
              </h3>

              <div className="subscription-modal-info">
                <div>
                  <span>
                    {t('owner.price', 'Стоимость')}
                  </span>
                  <strong>
                    ${displayedMonthlyPrice.toFixed(2)} / месяц
                  </strong>
                </div>

                <div>
                  <span>
                    {cancelledButActive
                      ? 'Доступ до'
                      : t('owner.nextPayment', 'Следующее списание')}
                  </span>
                  <strong>
                    {expiresAt
                      ? expiresAt.toLocaleDateString(getLocale())
                      : '—'}
                  </strong>
                </div>
              </div>

              {currentServicesLimit > 10 && (
                <div
                  style={{
                    marginTop: 12,
                    padding: 12,
                    borderRadius: 12,
                    background: '#f8f9fa',
                    fontSize: 14,
                    lineHeight: 1.6
                  }}
                >
                  <div>Bookly Pro — $7.99 / месяц</div>
                  <div>
                    Пакет до {currentServicesLimit} услуг — $
                    {currentAddonPrice.toFixed(2)} / месяц
                  </div>
                </div>
              )}

              {!cancelledButActive && !packageCancellationPending && (
                <div
                  style={{
                    marginTop: 20,
                    paddingTop: 20,
                    borderTop: '1px solid #eee'
                  }}
                >
                  <strong>Увеличить лимит услуг</strong>
                  <p className="muted" style={{ marginTop: 6 }}>
                    Выберите новый лимит услуг.
                  </p>

                  <div
                    style={{
                      display: 'grid',
                      gap: 10,
                      marginTop: 12
                    }}
                  >
                    {[
                      { limit: 20, price: '$4.99 / месяц' },
                      { limit: 30, price: '$7.99 / месяц' },
                      { limit: 50, price: '$11.99 / месяц' },
                      { limit: 100, price: '$19.99 / месяц' }
                    ]
                      .filter(option => option.limit > currentServicesLimit)
                      .map(option => (
                        <button
                          key={option.limit}
                          type="button"
                          className="subscription-manage-button"
                          disabled={changingServiceLimit || subscriptionActionLoading}
                          onClick={() => changeServiceLimit(option.limit)}
                          style={{
                            display: 'flex',
                            justifyContent: 'space-between',
                            alignItems: 'center',
                            width: '100%'
                          }}
                        >
                          {changingServiceLimit ? (
                            <span className="btn-spinner" />
                          ) : (
                            <>
                              <span>До {option.limit} услуг</span>
                              <strong>{option.price}</strong>
                            </>
                          )}
                        </button>
                      ))}
                  </div>
                </div>
              )}

              {currentServicesLimit > 10 && !cancelledButActive && (
                packageCancellationPending ? (
                  <button
                    type="button"
                    className="subscription-manage-button"
                    disabled={changingServiceLimit || subscriptionActionLoading}
                    onClick={resumePackage}
                    style={{ marginTop: 12 }}
                  >
                    {changingServiceLimit ? (
                      <>
                        <span className="btn-spinner" />
                        Возобновляем…
                      </>
                    ) : (
                      'Возобновить пакет'
                    )}
                  </button>
                ) : (
                  <button
                    type="button"
                    className="subscription-danger-button"
                    disabled={changingServiceLimit || subscriptionActionLoading}
                    onClick={cancelPackage}
                    style={{ marginTop: 12 }}
                  >
                    {changingServiceLimit ? (
                      <>
                        <span className="btn-spinner" />
                        Отменяем…
                      </>
                    ) : (
                      'Отменить пакет'
                    )}
                  </button>
                )
              )}

              {cancelledButActive ? (
                <button
                  type="button"
                  className="subscription-manage-button"
                  disabled={subscriptionActionLoading || changingServiceLimit}
                  onClick={resumeSubscription}
                >
                  {subscriptionActionLoading ? (
                    <>
                      <span className="btn-spinner" />
                      Возобновляем…
                    </>
                  ) : (
                    t(
                      'owner.resumeSubscription',
                      'Возобновить подписку'
                    )
                  )}
                </button>
              ) : (
                <button
                  type="button"
                  className="subscription-danger-button"
                  disabled={subscriptionActionLoading || changingServiceLimit}
                  onClick={cancelSubscription}
                >
                  {subscriptionActionLoading ? (
                    <>
                      <span className="btn-spinner" />
                      Отменяем…
                    </>
                  ) : (
                    t(
                      'owner.cancelSubscription',
                      'Отменить автопродление'
                    )
                  )}
                </button>
              )}
            </div>
          </div>
        )}
      </div>
    );
  }

  if (paymentFailed) {
    return (
      <div className="card subscription">
        <div className="subscription-head">
          <div>
            <h3>Bookly Pro</h3>
            <p>
              <b>{t('owner.monthlyPrice')}</b>
            </p>
          </div>
          <span className="pill">
            {t('owner.paymentFailed', 'Платёж не прошёл')}
          </span>
        </div>

        <p>
          {t(
            'owner.subscribeAccessText',
            'Активируйте подписку, чтобы открыть полный доступ к Bookly Pro'
          )}
        </p>

        <button
          className="primary full"
          onClick={() => checkout('paddle', business.id)}
        >
          {t('owner.openAccess', 'Открыть доступ')}
        </button>
      </div>
    );
  }

  return (
    <div className="card subscription">
      <div className="subscription-head">
        <div>
          <h3>Bookly Pro</h3>
          <p><b>{t('owner.monthlyPrice')}</b></p>
        </div>
        <span className="pill">
          {t('owner.inactive', 'Неактивна')}
        </span>
      </div>

      <p>
        {t(
          'owner.payToUnlock',
          'Оплатите подписку, чтобы открыть доступ к функциям Bookly Pro.'
        )}
      </p>

      <button
        className="primary full"
        onClick={() => checkout('paddle', business.id)}
      >
        {t('owner.openAccess', 'Открыть доступ')}
      </button>
    </div>
  );
}

function checkout(
  provider: string,
  businessId?: number,
  servicesLimit: number = 10
) {
  const t = createTranslator(getStoredLanguage());
  if (provider !== 'paddle') {
    return;
  }

  if (!window.Paddle) {
    alert(t('owner.paddleLoading'));
    return;
  }

  const ownerId =
    tg()?.initDataUnsafe?.user?.id;

  if (!ownerId) {
    alert(t('owner.telegramUserError'));
    return;
  }

  let selectedBusinessId =
    businessId;

  if (!selectedBusinessId) {
    try {
      const saved =
        localStorage.getItem(
          'bookly_active_business_id'
        );

      if (saved) {
        selectedBusinessId =
          Number(saved);
      }
    } catch {}
  }

  if (!selectedBusinessId) {
    alert(t('owner.selectedBusinessError'));
    return;
  }
const items = [
  {
    priceId:
      'pri_01m0vqh7n3x8h7da02fpjm3wkd',
    quantity: 1
  }
];

const addonPriceIds: Record<number, string> = {
  20: 'pri_01m0sy8kj4zw2ag1qe907zhdns',
  30: 'pri_01m0mhf9rdee684tyd3mg3xp8p',
  50: 'pri_01m0mhhh2k5cts13j9h3agt7bj',
  100: 'pri_01m0mhk1wq5brdkew92q3gvk9r'
};

if (
  servicesLimit > 10 &&
  addonPriceIds[servicesLimit]
) {
  items.push({
    priceId:
      addonPriceIds[servicesLimit],
    quantity: 1
  });
}

window.Paddle.Checkout.open({
    items,
    customData: {
      telegram_user_id:
        String(ownerId),

      business_id:
        String(selectedBusinessId)
    }
  });
}

function Services({
  services,
  reload,
  business,
  t
}: {
  services: any[];
  reload: () => Promise<void>;
  business: any;
  t: (key: string, fallback?: string) => string;
}) {
  const [editingId, setEditingId] =
    useState<number | null>(null);

  const [currencySearch, setCurrencySearch] =
    useState('');

  const [businessPhone, setBusinessPhone] =
    useState(business?.phone || '');

  const [businessAddress, setBusinessAddress] =
    useState(business?.address || '');

  const [savingBusiness, setSavingBusiness] =
    useState(false);
  const [savingService, setSavingService] =
  useState(false);

  const serviceFormRef =
  useRef<HTMLDivElement | null>(null);

  const [deletingServiceId, setDeletingServiceId] =
  useState<number | null>(null);

const [f, setF] = useState({
  name: '',
  description: '',
  price: '',
  currency: 'UZS',
  duration_min: ''
});

const durationHours =
  Math.floor(
    Number(f.duration_min || 0) / 60
  );

const durationMinutes =
  Number(f.duration_min || 0) % 60;

  useEffect(() => {
    setBusinessPhone(
      business?.phone || ''
    );

    setBusinessAddress(
      business?.address || ''
    );
  }, [business]);

  const getCurrencyCodes = () => {
    const intlAny = Intl as any;

    if (
      typeof intlAny.supportedValuesOf ===
      'function'
    ) {
      return intlAny.supportedValuesOf(
        'currency'
      );
    }

    return [
      'AED','AFN','ALL','AMD','ARS','AUD',
      'AZN','BAM','BDT','BGN','BHD','BND',
      'BOB','BRL','BYN','CAD','CHF','CLP',
      'CNY','COP','CRC','CZK','DKK','DZD',
      'EGP','EUR','GBP','GEL','GHS','HKD',
      'HUF','IDR','ILS','INR','IQD','ISK',
      'JOD','JPY','KES','KGS','KHR','KRW',
      'KWD','KZT','LAK','LBP','LKR','MAD',
      'MDL','MGA','MKD','MMK','MNT','MOP',
      'MRU','MUR','MXN','MYR','MZN','NAD',
      'NGN','NIO','NOK','NPR','NZD','OMR',
      'PAB','PEN','PHP','PKR','PLN','PYG',
      'QAR','RON','RSD','RUB','SAR','SEK',
      'SGD','SOS','SRD','STN','THB','TJS',
      'TMT','TND','TOP','TRY','TTD','TWD',
      'TZS','UAH','UGX','USD','UYU','UZS',
      'VES','VND','XAF','XCD','XOF','XPF',
      'YER','ZAR','ZMW'
    ];
  };

  const getCurrencyName = (
    code: string
  ) => {
    try {
      const DisplayNames =
        (Intl as any).DisplayNames;

      if (DisplayNames) {
        const names =
          new DisplayNames(
            [getStoredLanguage()],
            {
              type: 'currency'
            }
          );

        return (
          names.of(code) ||
          code
        );
      }
    } catch {}

    return code;
  };

  const getCurrencySymbol = (
    code: string
  ) => {
    try {
      const locale =
        getStoredLanguage() === 'ar'
          ? 'ar'
          : 'en';

      const parts =
        new Intl.NumberFormat(
          locale,
          {
            style: 'currency',
            currency: code,
            currencyDisplay:
              'narrowSymbol'
          }
        ).formatToParts(1);

      return (
        parts.find(
          part =>
            part.type === 'currency'
        )?.value ||
        code
      );
    } catch {
      return code;
    }
  };

  const currencyOptions =
    getCurrencyCodes()
      .map(code => ({
        code,
        name:
          getCurrencyName(code),
        symbol:
          getCurrencySymbol(code)
      }))
      .filter(currency => {
        const q =
          currencySearch
            .trim()
            .toLowerCase();

        if (!q) return true;

        return (
          currency.code
            .toLowerCase()
            .includes(q) ||
          currency.name
            .toLowerCase()
            .includes(q) ||
          currency.symbol
            .toLowerCase()
            .includes(q)
        );
      })
      .sort((a, b) =>
        a.name.localeCompare(
          b.name
        )
      );

  useEffect(() => {
    if (
      currencySearch.trim()
    ) {
      const exactCode =
        currencyOptions.find(
          x =>
            x.code.toLowerCase() ===
            currencySearch
              .trim()
              .toLowerCase()
        );

      if (exactCode) {
        setF(prev => ({
          ...prev,
          currency:
            exactCode.code
        }));
      }
    }
  }, [currencySearch]);

  const resetForm = () => {
    setF({
      name: '',
      description: '',
      price: '',
      currency: 'UZS',
      duration_min: ''
    });

    setCurrencySearch('');
    setEditingId(null);
  };

  const saveBusinessContacts =
    async () => {
      setSavingBusiness(true);

      try {
        const response =
          await fetch(
            API +
              '/admin/business',
            {
              method: 'PUT',
              headers: headers(),
              body: JSON.stringify({
                name:
                  business?.name || '',
                description:
                  business?.description ||
                  '',
                address:
                  businessAddress.trim(),
                phone:
                  businessPhone.trim(),
                latitude:
                  business?.latitude ??
                  null,
                longitude:
                  business?.longitude ??
                  null
              })
            }
          );

        const data =
          await response
            .json()
            .catch(() => null);

        if (!response.ok) {
          throw new Error(
            data?.detail ||
            t(
              'owner.saveContactsError',
              'Не удалось сохранить контакты'
            )
          );
        }

        alert(
          t(
            'owner.contactsSaved',
            '✅ Настройки сохранены'
          )
        );

        reload();
      } catch (e: any) {
        alert(
          e?.message ||
          t(
            'owner.saveContactsError',
            'Не удалось сохранить настройки'
          )
        );
      } finally {
        setSavingBusiness(false);
      }
    };

  const saveService =
    async () => {
          setSavingService(true);
      const name =
        f.name.trim();

      const price =
        Number(f.price);

      const duration =
        Number(f.duration_min);

      if (!name) {
        alert(
          t(
            'owner.invalidServiceName',
            'Введите название услуги'
          )
        );
        return;
      }

      if (
        !Number.isFinite(price) ||
        price < 0
      ) {
        alert(
          t(
            'owner.invalidPrice',
            'Введите корректную цену'
          )
        );
        return;
      }

      if (
        !Number.isInteger(
          duration
        ) ||
        duration <= 0 ||
        duration > 480
      ) {
        alert(
          t(
            'owner.invalidDuration',
            'Длительность должна быть от 1 до 480 минут'
          )
        );
        return;
      }

      const url =
        editingId
          ? API +
            `/admin/services/${editingId}`
          : API +
            '/admin/services';

      try {
        const response =
          await fetch(
            url,
            {
              method:
                editingId
                  ? 'PATCH'
                  : 'POST',
              headers:
                headers(),
              body:
                JSON.stringify({
                  name,
                  description:
                    f.description.trim(),
                  price,
                  currency:
                    f.currency,
                  duration_min:
                    duration,
                  active: true
                })
            }
          );

        const data =
          await response
            .json()
            .catch(() => null);

        if (!response.ok) {
          alert(
            data?.detail ||
            t(
              'owner.saveServiceError',
              'Не удалось сохранить услугу'
            )
          );
          return;
        }

        resetForm();

await reload();

alert(
  editingId
    ? t(
        'owner.serviceUpdated',
        '✅ Услуга изменена'
      )
    : t(
        'owner.serviceAdded',
        '✅ Услуга добавлена'
      )
);
            } catch (e: any) {
        alert(
          e?.message ||
          t(
            'owner.saveServiceError',
            'Не удалось сохранить услугу'
          )
        );
      } finally {
        setSavingService(false);
      }
    };

  const editService = (
    service: any
  ) => {
    setEditingId(
      service.id
    );

    setF({
      name:
        service.name || '',
      description:
        service.description ||
        '',
      price:
        String(
          service.price
        ),
      currency:
        service.currency ||
        'UZS',
      duration_min:
        String(
          service.duration_min ||
          30
        )
    });

    setCurrencySearch(
      service.currency ||
      'UZS'
    );

    requestAnimationFrame(() => {
  const element =
    serviceFormRef.current;

  if (!element) {
    return;
  }

  const top =
    element.getBoundingClientRect().top +
    window.scrollY -
    16;

  window.scrollTo({
    top,
    behavior: 'smooth'
  });
});
  };

  const remove = async (
  id: number
) => {
  const confirmed =
    await confirmAsync(
      t(
        'owner.confirmDeleteService',
        'Удалить эту услугу?'
      )
    );

  if (!confirmed) {
    return;
  }

  setDeletingServiceId(id);

  try {
    const response =
      await fetch(
        API +
          `/admin/services/${id}`,
        {
          method: 'DELETE',
          headers: headers()
        }
      );

    const data =
      await response
        .json()
        .catch(() => null);

    if (!response.ok) {
      throw new Error(
        data?.detail ||
          t(
            'owner.deleteServiceError',
            'Не удалось удалить услугу'
          )
      );
    }

    await reload();

    alert(
      t(
        'owner.serviceDeleted',
        '✅ Услуга удалена'
      )
    );
  } catch (e: any) {
    alert(
      e?.message ||
        t(
          'owner.deleteServiceError',
          'Не удалось удалить услугу'
        )
    );
  } finally {
    setDeletingServiceId(null);
  }
};

  return (
    <div>

      <div className="card">
        <h2>
          {t('owner.businessContacts')}
        </h2>

        <input
          type="tel"
          placeholder={
            t(
              'owner.phonePlaceholder'
            )
          }
          value={businessPhone}
          onChange={e =>
            setBusinessPhone(
              e.target.value
            )
          }
        />

        <input
          placeholder={
            t(
              'owner.addressPlaceholder'
            )
          }
          value={businessAddress}
          onChange={e =>
            setBusinessAddress(
              e.target.value
            )
          }
        />

        <button
  className="primary full"
  disabled={savingBusiness}
  onClick={saveBusinessContacts}
>
  {savingBusiness ? (
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
      Сохранение...
    </>
  ) : (
    t(
      'owner.saveContacts',
      'Сохранить'
    )
  )}
</button>
      </div>

      <div
  className="card"
  ref={serviceFormRef}
>
  <h2>
    {editingId
      ? t('owner.editService')
      : t('owner.addService')}
        </h2>

        <input
          placeholder={
            t('owner.serviceName')
          }
          value={f.name}
          onChange={e =>
            setF({
              ...f,
              name:
                e.target.value
            })
          }
        />

        <input
          placeholder={
            t(
              'owner.serviceDescription'
            )
          }
          value={
            f.description
          }
          onChange={e =>
            setF({
              ...f,
              description:
                e.target.value
            })
          }
        />

        <div className="two">
          <input
            type="number"
            min="0"
            step="0.001"
            placeholder={
              t('owner.price')
            }
            value={f.price}
            onChange={e =>
              setF({
                ...f,
                price:
                  e.target.value
              })
            }
          />

          <input
            placeholder={
              t(
                'owner.searchCurrency'
              )
            }
            value={
              currencySearch
            }
            onChange={e =>
              setCurrencySearch(
                e.target.value
              )
            }
          />
        </div>

        <select
          value={f.currency}
          onChange={e =>
            setF({
              ...f,
              currency:
                e.target.value
            })
          }
        >
          {currencyOptions.map(
            currency => (
              <option
                key={
                  currency.code
                }
                value={
                  currency.code
                }
              >
                {currency.code} —{' '}
                {currency.name}{' '}
                ({currency.symbol})
              </option>
            )
          )}
        </select>

<label
  style={{
    display: 'block',
    marginBottom: 8,
    fontWeight: 600
  }}
>
  Длительность услуги
</label>
        
        <div
  style={{
    display: 'grid',
    gridTemplateColumns: '1fr 1fr',
    gap: 9
  }}
>
  <select
    value={durationHours}
    onChange={e => {
      const hours = Number(
        e.target.value
      );

      setF({
        ...f,
        duration_min: String(
          hours * 60 +
            durationMinutes
        )
      });
    }}
  >
    <option value="0">
      0 часов
    </option>

    {Array.from(
      { length: 24 },
      (_, i) => i + 1
    ).map(hour => (
      <option
        key={hour}
        value={hour}
      >
        {hour}{' '}
        {hour === 1
          ? 'час'
          : hour < 5
            ? 'часа'
            : 'часов'}
      </option>
    ))}
  </select>

  <select
    value={durationMinutes}
    onChange={e => {
      const minutes =
        Number(e.target.value);

      setF({
        ...f,
        duration_min: String(
          durationHours * 60 +
            minutes
        )
      });
    }}
  >
    {Array.from(
      { length: 60 },
      (_, i) => i
    ).map(minute => (
      <option
        key={minute}
        value={minute}
      >
        {minute} минут
      </option>
    ))}
  </select>
</div>

        <div className="two">
          <button
  className="primary full"
  disabled={savingService}
  onClick={saveService}
>
  {savingService ? (
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
      Сохранение...
    </>
  ) : (
    editingId
      ? t(
          'owner.saveChanges',
          'Сохранить изменения'
        )
      : t(
          'owner.addServiceButton',
          'Добавить услугу'
        )
  )}
</button>

          {editingId && (
            <button
              className="full"
              onClick={
                resetForm
              }
            >
              {t('common.cancel')}
            </button>
          )}
        </div>
      </div>

      {services.map(
        service => (
          <div
            className="card row"
            key={service.id}
          >
            <div>
              <b>
                {service.name}
              </b>

              {service.description && (
                <p>
                  {
                    service.description
                  }
                </p>
              )}

              <p>
                {money(
                  service.price,
                  service.currency
                )}{' '}
                ·{' '}
                {
                  service.duration_min
                }{' '}
                {t(
                  'owner.minutes'
                )}
              </p>
            </div>

            <div
              style={{
                display: 'flex',
                gap: 8
              }}
            >
              <button
                onClick={() =>
                  editService(
                    service
                  )
                }
              >
                {t(
                  'owner.edit'
                )}
              </button>

              <button
  className="danger"
  disabled={
    deletingServiceId ===
    service.id
  }
  onClick={() =>
    remove(
      service.id
    )
  }
>
  {deletingServiceId ===
  service.id ? (
    <>
      <span
        style={{
          display: 'inline-block',
          width: 14,
          height: 14,
          border:
            '2px solid rgba(176,0,32,0.25)',
          borderTopColor:
            '#b00020',
          borderRadius: '50%',
          animation:
            'bookly-spin .8s linear infinite',
          marginRight: 8,
          verticalAlign: '-2px'
        }}
      />
      Удаление...
    </>
  ) : (
    t(
      'owner.delete'
    )
  )}
</button>
    
            </div>
          </div>
        )
      )}
    </div>
  );
}
function Hours({
  hours,
  reload,
  t
}: {
  hours: any[];
  reload: () => void;
  t: (key: string, fallback?: string) => string;
}) {
  const days = localizedDays(t);

  const [f, setF] = useState({
    weekday: '0',
    start: '09:00',
    end: '18:00'
  });

  const [savingHours, setSavingHours] =
  useState(false);

  const add = async () => {
  const weekday = Number(f.weekday);

  const existingHours = hours.filter(
    h => h.weekday === weekday
  );

  if (existingHours.length > 0) {
    const dayName =
      days[weekday] || 'Этот день';

    const currentSchedule =
      existingHours
        .map(
          h =>
            `${h.start.slice(0, 5)}–${h.end.slice(0, 5)}`
        )
        .join(', ');

    alert(
      `График уже добавлен\n\n` +
      `${dayName}: ${currentSchedule}\n\n` +
      `Чтобы изменить график этого дня, ` +
      `сначала удалите существующий интервал ` +
      `кнопкой ×.`
    );

    return;
  }

  setSavingHours(true);

  try {
    const response = await fetch(
      API + '/admin/hours',
      {
        method: 'POST',
        headers: headers(),
        body: JSON.stringify({
          ...f,
          weekday
        })
      }
    );

    if (!response.ok) {
      throw new Error(
        'Не удалось добавить график'
      );
    }

    await reload();

    alert(
      `График добавлен\n\n` +
      `${days[weekday]}: ${f.start}–${f.end}`
    );
  } catch (e: any) {
    alert(
      e?.message ||
        'Не удалось добавить график'
    );
  } finally {
    setSavingHours(false);
  }
};
  return (
    <div className="card">
      <h2>
        {t('owner.workSchedule')}
      </h2>

      <p>
        {t('owner.scheduleDescription')}
      </p>

      <div className="two">
        <select
          value={f.weekday}
          onChange={e =>
            setF({
              ...f,
              weekday: e.target.value
            })
          }
        >
          {days.map(
            (x, i) => (
              <option
                value={i}
                key={x}
              >
                {x}
              </option>
            )
          )}
        </select>

        <span />
      </div>

      <div className="two">
        <input
          type="time"
          value={f.start}
          onChange={e =>
            setF({
              ...f,
              start: e.target.value
            })
          }
        />

        <input
          type="time"
          value={f.end}
          onChange={e =>
            setF({
              ...f,
              end: e.target.value
            })
          }
        />
      </div>

      <button
  className="primary full"
  disabled={savingHours}
  onClick={add}
>
  {savingHours ? (
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
      Сохранение...
    </>
  ) : (
    t('owner.addInterval')
  )}
</button>

      {days.map(
        (d, i) => {
          const hs =
            hours.filter(
              h =>
                h.weekday === i
            );

          return (
            <div
              className="dayrow"
              key={d}
            >
              <b>{d}</b>

              <div>
                {hs.length ? (
                  hs.map(
                    h => (
                      <span
                        className="tag"
                        key={h.id}
                      >
                        {h.start.slice(0, 5)}
                        –
                        {h.end.slice(0, 5)}

                        <button
                          onClick={async () => {
                            await fetch(
                              API +
                                `/admin/hours/${h.id}`,
                              {
                                method:
                                  'DELETE',
                                headers:
                                  headers()
                              }
                            );

                            reload();
                          }}
                        >
                          ×
                        </button>
                      </span>
                    )
                  )
                ) : (
                  <span className="muted">
                    {t('owner.dayOff')}
                  </span>
                )}
              </div>
            </div>
          );
        }
      )}
    </div>
  );
}

function Blocks({
  blocks,
  reload,
  t
}: {
  blocks: any[];
  reload: () => Promise<void>;
  t: (key: string, fallback?: string) => string;
}) {
  const [f, setF] = useState({
    day: new Date()
      .toISOString()
      .slice(0, 10),
    start: '13:00',
    end: '15:00',
    reason: ''
  });
  
const [savingBlock, setSavingBlock] =
  useState(false);

  const [deletingBlockId, setDeletingBlockId] =
  useState<number | null>(null);
  
  const [currentTime, setCurrentTime] =
  useState(new Date());

useEffect(() => {
  const timer = window.setInterval(() => {
    setCurrentTime(new Date());
  }, 30000);

  return () => {
    window.clearInterval(timer);
  };
}, []);
  
  const isBlockPast = (block: any) => {
  const endTime = new Date(
    `${block.day}T${block.end.slice(0, 8)}`
  );

  return endTime < currentTime;
};
  
  const add = async () => {
  setSavingBlock(true);

  try {
    await fetch(
      API + '/admin/blocks',
      {
        method: 'POST',
        headers: headers(),
       body: JSON.stringify({
  day: f.day,
  start: f.start,
  end: f.end,
  reason: f.reason
})
      }
    );

    await reload();
    
    alert('Блокировка добавлена');
  } finally {
    setSavingBlock(false);
  }
};

  return (
    <div className="card">
      <h2>
        {t('owner.timeBlocks')}
      </h2>

      <p>
        {t('owner.blocksDescription')}
      </p>

      <input
        type="date"
        value={f.day}
        onChange={e =>
          setF({
            ...f,
            day: e.target.value
          })
        }
      />

      <div className="two">
        <input
          type="time"
          value={f.start}
          onChange={e =>
            setF({
              ...f,
              start: e.target.value
            })
          }
        />

        <input
          type="time"
          value={f.end}
          onChange={e =>
            setF({
              ...f,
              end: e.target.value
            })
          }
        />
      </div>

      <input
        placeholder={t('owner.reasonOptional')}
        value={f.reason}
        onChange={e =>
          setF({
            ...f,
            reason: e.target.value
          })
        }
      />

      <button
  className="primary full"
  disabled={savingBlock}
  onClick={add}
>
  {savingBlock ? (
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
      Сохранение...
    </>
  ) : (
    t('owner.blockTime')
  )}
</button>

      {blocks.map(
        b => (
          <div
  className="row line"
  key={b.id}
  style={{
    opacity: isBlockPast(b) ? 0.55 : 1
  }}
>
            <div>
              <b>
                {b.day}
              </b>

              <p>
  {b.start.slice(0, 5)}
  –
  {b.end.slice(0, 5)}

  {b.reason &&
    ` · ${b.reason}`}

  {isBlockPast(b) && (
    <span
      style={{
        marginLeft: 8,
        fontSize: 12,
        fontWeight: 600,
        opacity: 0.8
      }}
    >
      ✓ Прошедшее
    </span>
  )}
</p>
            </div>

            <button
  className="danger"
  disabled={deletingBlockId === b.id}
  onClick={async () => {
    setDeletingBlockId(b.id);

    try {
      const response =
        await fetch(
          API +
            `/admin/blocks/${b.id}`,
          {
            method: 'DELETE',
            headers: headers()
          }
        );

      if (!response.ok) {
        throw new Error(
          'Не удалось удалить блокировку'
        );
      }

      await reload();

      alert('Блокировка удалена');
    } catch (e: any) {
      alert(
        e?.message ||
          'Не удалось удалить блокировку'
      );
    } finally {
      setDeletingBlockId(null);
    }
  }}
>
  {deletingBlockId === b.id ? (
    <span
      style={{
        display: 'inline-block',
        width: 14,
        height: 14,
        border: '2px solid rgba(211,47,47,0.25)',
        borderTopColor: '#d32f2f',
        borderRadius: '50%',
        animation:
          'bookly-spin .8s linear infinite'
      }}
    />
  ) : (
    '×'
  )}
</button>
          </div>
        )
      )}
    </div>
  );
}

function Bookings({
  bookings,
  reload,
  t
}: {
  bookings: any[];
  reload: () => Promise<void>;
  t: (key: string, fallback?: string) => string;
}) {
  const [showForm, setShowForm] =
    useState(false);

  const [services, setServices] =
    useState<any[]>([]);

  const [businessId, setBusinessId] =
  useState<number | null>(null);

  const [serviceId, setServiceId] =
    useState('');

  const [day, setDay] =
    useState(
      new Date()
        .toISOString()
        .slice(0, 10)
    );

  const [slots, setSlots] =
    useState<string[]>([]);
  
  const [selectedSlot, setSelectedSlot] =
  useState('');

  const [slotsLoading, setSlotsLoading] =
    useState(false);

  const [clientName, setClientName] =
    useState('');

  const [clientPhone, setClientPhone] =
    useState('');

  const [saving, setSaving] =
    useState(false);

  const [deletingBusiness, setDeletingBusiness] =
  useState(false);
  
  const [error, setError] =
    useState('');

  const [filter, setFilter] =
    useState<
      'today' |
      'upcoming' |
      'date' |
      'all'
    >('today');

  const [selectedDate, setSelectedDate] =
    useState(
      new Date()
        .toISOString()
        .slice(0, 10)
    );

  useEffect(() => {
  if (!showForm) {
    return;
  }

  const loadBookingData =
    async () => {
      try {
        const [
          servicesResponse,
          businessResponse
        ] = await Promise.all([
          fetch(
            API + '/admin/services',
            {
              headers: headers()
            }
          ),
          fetch(
            API + '/admin/business',
            {
              headers: headers()
            }
          )
        ]);

        const servicesData =
          servicesResponse.ok
            ? await servicesResponse.json()
            : [];

        const businessData =
          businessResponse.ok
            ? await businessResponse.json()
            : null;

        const nextServices =
          Array.isArray(
            servicesData
          )
            ? servicesData
            : [];

        setServices(
          nextServices
        );

        if (businessData?.id) {
          setBusinessId(
            Number(businessData.id)
          );
        }

        if (
          nextServices.length &&
          !serviceId
        ) {
          setServiceId(
            String(
              nextServices[0].id
            )
          );
        }
      } catch {
        setServices([]);
        setBusinessId(null);
      }
    };

  loadBookingData();
}, [showForm]);

  const loadSlots = async (
  selectedServiceId: string,
  selectedDay: string
) => {
  setSelectedSlot('');
    if (!selectedServiceId) {
      return;
    }

    setSlots([]);
    setSlotsLoading(true);
    setError('');

    try {
      
if (!businessId) {
  return;
}
      const availabilityResponse =
        await fetch(
          API +
            `/businesses/${businessId}/availability?service_id=${selectedServiceId}&day=${selectedDay}`
        );

      const data =
        await availabilityResponse.json();

      if (!availabilityResponse.ok) {
        throw new Error(
          data?.detail ||
          t(
            'owner.availabilityError'
          )
        );
      }

      setSlots(
        data?.slots || []
      );

    } catch (e: any) {
      console.error(
        'ADMIN AVAILABILITY ERROR:',
        e
      );

      setSlots([]);

      setError(
        e?.message ||
        t(
          'owner.availabilityError'
        )
      );

    } finally {
      setSlotsLoading(false);
    }
  };

  useEffect(() => {
    if (
      showForm &&
      serviceId &&
      day
    ) {
      loadSlots(
        serviceId,
        day
      );
    }
  }, [
  serviceId,
  day,
  showForm,
  businessId
]);

  const createBooking =
    async (
      start: string
    ) => {
      if (!serviceId) {
        setError(
          t(
            'owner.chooseServiceError'
          )
        );
        return;
      }

      if (!clientName.trim()) {
        setError(
          t(
            'owner.enterClientName'
          )
        );
        return;
      }

      setSaving(true);
      setError('');

      try {
        const response =
          await fetch(
            API +
              '/admin/bookings',
            {
              method: 'POST',
              headers:
                headers(),
              body:
                JSON.stringify({
                  service_id:
                    Number(
                      serviceId
                    ),
                  client_name:
                    clientName.trim(),
                  client_phone:
                    clientPhone.trim(),
                  day,
                  start
                })
            }
          );

        const data =
          await response.json();

        if (!response.ok) {
          throw new Error(
            data?.detail ||
            t(
              'owner.createBookingError'
            )
          );
        }

        await reload();

alert(
  t(
    'owner.bookingAdded'
  )
);

setClientName('');
setClientPhone('');
setSelectedSlot('');
setShowForm(false);
setSlots([]);

      } catch (e: any) {
        console.error(
          'ADMIN CREATE BOOKING ERROR:',
          e
        );

        setError(
          e?.message ||
          t(
            'owner.createBookingError'
          )
        );

      } finally {
        setSaving(false);
      }
    };

  const getTodayTashkent =
    () => {
      return new Intl.DateTimeFormat(
        'en-CA',
        {
          timeZone:
            'Asia/Tashkent',
          year: 'numeric',
          month: '2-digit',
          day: '2-digit'
        }
      ).format(
        new Date()
      );
    };

  const getNowTashkent =
    () => {
      return new Intl.DateTimeFormat(
        'sv-SE',
        {
          timeZone:
            'Asia/Tashkent',
          year: 'numeric',
          month: '2-digit',
          day: '2-digit',
          hour: '2-digit',
          minute: '2-digit',
          second: '2-digit',
          hour12: false
        }
      ).format(
        new Date()
      );
    };

  const todayTashkent =
    getTodayTashkent();

  const nowTashkent =
    getNowTashkent();

  const filteredBookings =
    bookings
      .filter(
        booking => {
          const bookingDateTime =
            `${booking.day} ${booking.start}`;

          if (
            filter === 'today'
          ) {
            return (
              booking.day ===
              todayTashkent
            );
          }

          if (
            filter === 'upcoming'
          ) {
            return (
              bookingDateTime >=
              nowTashkent.slice(
                0,
                16
              )
            );
          }

          if (
            filter === 'date'
          ) {
            return (
              booking.day ===
              selectedDate
            );
          }

          return true;
        }
      )
      .sort(
        (a, b) => {
          const first =
            `${a.day} ${a.start}`;

          const second =
            `${b.day} ${b.start}`;

          return first.localeCompare(
            second
          );
        }
      );

  return (
    <div>

      <div className="card">
        <div
          style={{
            display:
              'flex',
            justifyContent:
              'space-between',
            alignItems:
              'center',
            gap: 10
          }}
        >
          <h2
            style={{
              margin: 0
            }}
          >
            {t(
              'owner.bookings'
            )}
          </h2>

          <button
            className="primary"
            onClick={() =>
              setShowForm(
                !showForm
              )
            }
          >
            {showForm
              ? t(
                  'owner.close'
                )
              : `+ ${t(
                  'owner.addBooking'
                )}`}
          </button>
        </div>
      </div>

      <div className="card">

        <div
          style={{
            display:
              'flex',
            gap: 8,
            overflowX:
              'auto',
            paddingBottom: 5
          }}
        >

          <button
            style={{
              background:
                filter === 'today'
                  ? '#111'
                  : '#eee',
              color:
                filter === 'today'
                  ? '#fff'
                  : '#222',
              fontWeight:
                filter === 'today'
                  ? 700
                  : 500,
              border:
                filter === 'today'
                  ? '2px solid #111'
                  : '2px solid transparent'
            }}
            onClick={() =>
              setFilter(
                'today'
              )
            }
          >
            {t(
              'owner.today'
            )}
          </button>

          <button
            style={{
              background:
                filter === 'upcoming'
                  ? '#111'
                  : '#eee',
              color:
                filter === 'upcoming'
                  ? '#fff'
                  : '#222',
              fontWeight:
                filter === 'upcoming'
                  ? 700
                  : 500,
              border:
                filter === 'upcoming'
                  ? '2px solid #111'
                  : '2px solid transparent'
            }}
            onClick={() =>
              setFilter(
                'upcoming'
              )
            }
          >
            {t(
              'owner.upcomingBookings'
            )}
          </button>

          <button
            style={{
              background:
                filter === 'date'
                  ? '#111'
                  : '#eee',
              color:
                filter === 'date'
                  ? '#fff'
                  : '#222',
              fontWeight:
                filter === 'date'
                  ? 700
                  : 500,
              border:
                filter === 'date'
                  ? '2px solid #111'
                  : '2px solid transparent'
            }}
            onClick={() =>
              setFilter(
                'date'
              )
            }
          >
            {t(
              'owner.date'
            )}
          </button>

          <button
            style={{
              background:
                filter === 'all'
                  ? '#111'
                  : '#eee',
              color:
                filter === 'all'
                  ? '#fff'
                  : '#222',
              fontWeight:
                filter === 'all'
                  ? 700
                  : 500,
              border:
                filter === 'all'
                  ? '2px solid #111'
                  : '2px solid transparent'
            }}
            onClick={() =>
              setFilter(
                'all'
              )
            }
          >
            {t(
              'owner.all'
            )}
          </button>
        </div>

        {filter === 'date' && (
          <input
            type="date"
            value={
              selectedDate
            }
            onChange={e =>
              setSelectedDate(
                e.target.value
              )
            }
            style={{
              marginTop: 12
            }}
          />
        )}
      </div>

      {showForm && (
        <div className="card">

          <h2>
            {t(
              'owner.newBooking'
            )}
          </h2>

          <select
            value={serviceId}
            onChange={e =>
              setServiceId(
                e.target.value
              )
            }
          >
            <option value="">
              {t(
                'owner.chooseService'
              )}
            </option>

            {services.map(
              service => (
                <option
                  key={
                    service.id
                  }
                  value={
                    service.id
                  }
                >
                  {service.name}
                  {' · '}
                  {
                    service.duration_min
                  }{' '}
                  {t(
                    'owner.minutes'
                  )}
                </option>
              )
            )}
          </select>

          <input
            type="date"
            min={
              new Date()
                .toISOString()
                .slice(
                  0,
                  10
                )
            }
            value={day}
            onChange={e =>
              setDay(
                e.target.value
              )
            }
          />

          <h3>
            {t(
              'owner.chooseTime'
            )}
          </h3>

          {slotsLoading && (
  <p
    className="muted"
    style={{
      display: 'flex',
      alignItems: 'center',
      gap: 8
    }}
  >
    <span
      style={{
        display: 'inline-block',
        width: 14,
        height: 14,
        border: '2px solid #ddd',
        borderTopColor: '#111',
        borderRadius: '50%',
        animation:
          'bookly-spin .8s linear infinite'
      }}
    />
    {t(
      'owner.loadingSlots',
      'Загружаем свободное время...'
    )}
  </p>
)}

          {!slotsLoading &&
  serviceId &&
  !slots.length && (
    <p className="muted">
      {t(
        'owner.noAvailableTime'
      )}
    </p>
  )}

<div className="slots">
  {slots.map(
    time => (
      <button
  key={time}
  type="button"
  disabled={saving}
  onClick={() =>
    setSelectedSlot(time)
  }
  style={{
    background:
      selectedSlot === time
        ? '#111'
        : '#fff',
    color:
      selectedSlot === time
        ? '#fff'
        : '#111',
    border:
      selectedSlot === time
        ? '2px solid #111'
        : '1px solid #ddd',
    fontWeight:
      selectedSlot === time
        ? 700
        : 500,
    transition:
      'all .15s ease'
  }}
>
  {selectedSlot === time
    ? `✓ ${time}`
    : time}
</button>
    )
  )}
</div>
  

          <h3>
            {t(
              'owner.clientData'
            )}
          </h3>

          <input
            type="text"
            placeholder={
              t(
                'owner.clientName'
              )
            }
            value={
              clientName
            }
            onChange={e =>
              setClientName(
                e.target.value
              )
            }
          />

          <input
            type="tel"
            placeholder={
              t(
                'owner.clientPhone'
              )
            }
            value={
              clientPhone
            }
            onChange={e =>
              setClientPhone(
                e.target.value
              )
            }
          />
          <button
  type="button"
  className="primary full"
  disabled={
    saving ||
    !selectedSlot ||
    !serviceId ||
    !clientName.trim()
  }
  onClick={() =>
    createBooking(
      selectedSlot
    )
  }
>
  {saving
    ? t(
        'common.loading',
        'Загрузка...'
      )
    : t(
        'owner.addBooking',
        'Добавить запись'
      )}
</button>

          {error && (
            <div
              className="error"
              style={{
                marginTop: 10
              }}
            >
              ❌ {error}
            </div>
          )}

          <p className="muted">
            {t(
              'owner.bookingHint'
            )}
          </p>

        </div>
      )}

      <div className="card">
        {filteredBookings.length ? (
          filteredBookings.map(
            booking => (
              <BookingRow
                x={booking}
                key={booking.id}
                t={t}
              />
            )
          )
        ) : (
          <p>
            {t(
              'owner.noBookingsInSection'
            )}
          </p>
        )}
      </div>

    </div>
  );
}
function BookingRow({
  x,
  t
}: {
  x: any;
  t: (key: string, fallback?: string) => string;
}) {
  const [cancelling, setCancelling] =
    useState(false);

  const getNowTashkent = () => {
    return new Intl.DateTimeFormat(
      'sv-SE',
      {
        timeZone:
          'Asia/Tashkent',
        year: 'numeric',
        month: '2-digit',
        day: '2-digit',
        hour: '2-digit',
        minute: '2-digit',
        second: '2-digit',
        hour12: false
      }
    ).format(
      new Date()
    );
  };

  const nowTashkent =
    getNowTashkent()
      .slice(
        0,
        16
      );

  const bookingDateTime =
    `${x.day} ${x.start}`;

  const canCancel =
    x.status ===
      'confirmed' &&
    bookingDateTime >
      nowTashkent;

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

        alert(
          t(
            'owner.bookingCancelled'
          )
        );

        window.location.reload();

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
          {x.status ===
            'confirmed'
            ? (
              canCancel
                ? t(
                    'owner.confirmed'
                  )
                : t(
                    'owner.completed'
                  )
            )
            : x.status ===
                'cancelled'
              ? t(
                  'owner.cancelled'
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
            {cancelling
              ? t(
                  'owner.cancelling'
                )
              : t(
                  'owner.cancel'
                )}
          </button>
        )}

      </div>

    </div>
  );
}
function Settings({
  business,
  reload,
  t
}: {
  business: any;
  reload: () => void;
  t: (key: string, fallback?: string) => string;
}) {
  const [name, setName] = useState(
    business?.name || ''
  );

  const [description, setDescription] =
    useState(
      business?.description || ''
    );

  const [address, setAddress] =
    useState(
      business?.address || ''
    );

  const [phone, setPhone] =
    useState(
      business?.phone || ''
    );

  const [latitude, setLatitude] =
    useState(
      business?.latitude ?? ''
    );

  const [longitude, setLongitude] =
    useState(
      business?.longitude ?? ''
    );

  const [settingsTimezone, setSettingsTimezone] =
  useState(
    business?.timezone ||
      Intl.DateTimeFormat()
        .resolvedOptions()
        .timeZone ||
      'Asia/Tashkent'
  );

const [settingsTimezoneSearch, setSettingsTimezoneSearch] =
  useState('');

const [settingsTimezonePickerOpen, setSettingsTimezonePickerOpen] =
  useState(false);

const filteredSettingsTimezones =
  useMemo(() => {
    const search =
      settingsTimezoneSearch
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
  }, [settingsTimezoneSearch]);

    
  const [businessImage, setBusinessImage] =
    useState(
      business?.business_image || ''
    );
  

  const [saving, setSaving] =
    useState(false);

  const [deletingBusiness, setDeletingBusiness] =
  useState(false);

  const [qrDataUrl, setQrDataUrl] =
    useState('');

  const clientLink =
    `https://t.me/${BOT_USERNAME}?startapp=${business.slug}`;

  useEffect(() => {
    const generateQR = async () => {
      try {
        const url =
          await QRCode.toDataURL(
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
          'QR ERROR:',
          e
        );
      }
    };

    generateQR();
  }, [clientLink]);

  useEffect(() => {
  setName(
    business?.name || ''
  );

  setDescription(
    business?.description || ''
  );

  setAddress(
    business?.address || ''
  );

  setPhone(
    business?.phone || ''
  );

  setLatitude(
    business?.latitude ?? ''
  );

  setLongitude(
  business?.longitude ?? ''
);

    setSettingsTimezone(
  business?.timezone ||
    Intl.DateTimeFormat()
      .resolvedOptions()
      .timeZone ||
    'Asia/Tashkent'
);

setSettingsTimezoneSearch('');
setSettingsTimezonePickerOpen(false);
}, [business]);
  
    const handleBusinessImage = (
    file?: File
  ) => {
    if (!file) {
      return;
    }

    if (!file.type.startsWith('image/')) {
      alert(
        t(
          'settings.invalidImage',
          'Выберите изображение'
        )
      );
      return;
    }

    if (file.size > 5 * 1024 * 1024) {
      alert(
        t(
          'settings.imageTooLarge',
          'Размер изображения не должен превышать 5 МБ'
        )
      );
      return;
    }

    const objectUrl =
      URL.createObjectURL(file);

    const image =
      new Image();

    image.onload = () => {
      const maxWidth = 1200;
      const maxHeight = 800;

      const scale = Math.min(
        maxWidth / image.width,
        maxHeight / image.height,
        1
      );

      const canvas =
        document.createElement('canvas');

      canvas.width =
        Math.round(
          image.width * scale
        );

      canvas.height =
        Math.round(
          image.height * scale
        );

      const ctx =
        canvas.getContext('2d');

      if (!ctx) {
        URL.revokeObjectURL(
          objectUrl
        );
        return;
      }

      ctx.drawImage(
        image,
        0,
        0,
        canvas.width,
        canvas.height
      );

      const compressed =
        canvas.toDataURL(
          'image/jpeg',
          0.82
        );

      setBusinessImage(
        compressed
      );

      URL.revokeObjectURL(
        objectUrl
      );
    };

    image.src =
      objectUrl;
  };
  const save = async () => {
    setSaving(true);

    try {
      const response =
        await fetch(
          API + '/admin/business',
          {
            method: 'PUT',
            headers: headers(),
            body: JSON.stringify({
  name: name.trim(),
  business_image:
    businessImage || '',
  description:
    description.trim(),
  address:
    address.trim(),
  phone:
    phone.trim(),
  latitude:
    latitude === ''
      ? null
      : Number(latitude),
  longitude:
    longitude === ''
      ? null
      : Number(longitude),
              
    timezone: settingsTimezone,
})
          }
        );

      const data =
        await response
          .json()
          .catch(() => null);

      if (!response.ok) {
        throw new Error(
          data?.detail ||
          t(
            'owner.saveContactsError'
          )
        );
      }

      alert(
        t(
          'owner.contactsSaved'
        )
      );

      reload();

    } catch (e: any) {
      alert(
        e?.message ||
        t(
          'owner.saveContactsError'
        )
      );
    } finally {
      setSaving(false);
    }
  };
  const downloadQr = async () => {
  if (!qrDataUrl) {
    return;
  }

  try {
    const response =
      await fetch(qrDataUrl);

    const blob =
      await response.blob();

    const url =
      URL.createObjectURL(blob);

    const link =
      document.createElement('a');

    link.href = url;
    link.download =
      `${business.slug}-bookly-qr.png`;

    document.body.appendChild(link);
    link.click();
    link.remove();

    setTimeout(() => {
      URL.revokeObjectURL(url);
    }, 1000);
  } catch (e) {
    console.error(
      'QR DOWNLOAD ERROR:',
      e
    );
  }
};

  
  const copyLink = async () => {
    try {
      await navigator.clipboard.writeText(
        clientLink
      );

      alert(
        t(
          'settings.copyLink'
        )
      );
    } catch {
      alert(clientLink);
    }
  };

  const shareTelegram = () => {
    const shareUrl =
      `https://t.me/share/url?url=${encodeURIComponent(
        clientLink
      )}&text=${encodeURIComponent(
        business.name
      )}`;

    if (tg()?.openTelegramLink) {
      tg().openTelegramLink(
        shareUrl
      );
    } else {
      window.open(
        shareUrl,
        '_blank'
      );
    }
  };

  const downloadQR = () => {
    if (!qrDataUrl) {
      return;
    }

    const link =
      document.createElement('a');

    link.href = qrDataUrl;

    link.download =
      `${business.slug}-bookly-qr.png`;

    link.click();
  };
  const deleteBusiness = async () => { 
     const confirmed = await confirmAsync(
      'Вы действительно хотите удалить этот бизнес?\n\n' +
      'Все данные бизнеса, включая услуги, график работы, блокировки и записи, будут удалены без возможности восстановления.\n\n' +
      'Подписка при этом НЕ отменяется. Вы сможете создать новый бизнес и продолжить пользоваться активной подпиской.'
    );

    if (!confirmed) {
      return;
    }

    setDeletingBusiness(true);

    try {
      const response = await fetch(
        API + `/admin/business/${business.id}`,
        {
          method: 'DELETE',
          headers: headers()
        }
      );

      const data =
        await response
          .json()
          .catch(() => null);

      if (!response.ok) {
        throw new Error(
          data?.detail ||
          'Не удалось удалить бизнес'
        );
      }

      alert(
        'Бизнес успешно удалён.'
      );

      reload();

        } catch (e: any) {
      alert(
        e?.message ||
        'Не удалось удалить бизнес'
      );
    } finally {
      setDeletingBusiness(false);
    }
  };
  return (
    <div>

      <div className="card">
        <h2>
          {t(
            'settings.businessInfo'
          )}
        </h2>
        <div className="business-photo-settings">
  <strong>
  {t(
    'owner.businessPhoto',
    'Фото бизнеса'
  )}
</strong>

  <p className="muted">
  {t(
    'owner.businessPhotoHint',
    'Добавьте фотографию, которая будет отображаться у клиентов.'
  )}
</p>

  {businessImage ? (
    <img
      src={businessImage}
      className="business-photo-preview"
      alt="Business"
    />
  ) : (
    <div className="business-photo-empty">
      Фото пока не добавлено
    </div>
  )}

  <div className="business-photo-actions">

  <label className="admin-action-button">
  {businessImage
    ? 'Заменить фото'
    : 'Добавить фото'}

  <input
    type="file"
    accept="image/*"
    hidden
    onChange={(e) => {
      const file =
        e.target.files?.[0];

      if (file) {
        handleBusinessImage(file);
      }

      e.target.value = '';
    }}
  />
</label>

  

  {businessImage && (
    <button
      type="button"
      className="ghost"
      onClick={() => {
        setBusinessImage('');
      }}
    >
      Удалить
    </button>
  )}

</div>
</div>

        <input
          placeholder={t(
            'owner.serviceName'
          )}
          value={name}
          onChange={e =>
            setName(
              e.target.value
            )
          }
        />

        <textarea
          placeholder={t(
            'settings.description'
          )}
          value={description}
          onChange={e =>
            setDescription(
              e.target.value
            )
          }
        />

        <input
          type="tel"
          placeholder={t(
            'settings.phone'
          )}
          value={phone}
          onChange={e =>
            setPhone(
              e.target.value
            )
          }
        />

        <input
          placeholder={t(
            'settings.address'
          )}
          value={address}
          onChange={e =>
            setAddress(
              e.target.value
            )
          }
        />
        
        <div className="two">
          <input
            placeholder={t('settings.latitudeOptional')}
            value={latitude}
            onChange={e =>
              setLatitude(
                e.target.value
              )
            }
          />

          <input
            placeholder={t('settings.longitudeOptional')}
            value={longitude}
            onChange={e =>
              setLongitude(
                e.target.value
              )
            }
          />
        </div>

        <div
  style={{
    marginTop: 14
  }}
>
  <label
    style={{
      display: 'block',
      marginBottom: 8,
      fontWeight: 600
    }}
  >
    Часовой пояс бизнеса
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
      {getTimeZoneLabel(
        settingsTimezone
      )}

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
        setSettingsTimezonePickerOpen(
          !settingsTimezonePickerOpen
        );

        if (!settingsTimezonePickerOpen) {
          setSettingsTimezoneSearch('');
        }
      }}
    >
      {settingsTimezonePickerOpen
        ? 'Скрыть'
        : 'Изменить'}
    </button>
  </div>

  {settingsTimezonePickerOpen && (
    <div
      style={{
        marginTop: 10,
        padding: 12,
        border: '1px solid #e5e7eb',
        borderRadius: 16,
        background: '#fff'
      }}
    >
      <input
        type="text"
        placeholder="Найти город или часовой пояс..."
        value={settingsTimezoneSearch}
        onChange={e =>
          setSettingsTimezoneSearch(
            e.target.value
          )
        }
      />

      <div
        style={{
          maxHeight: 320,
          overflowY: 'auto',
          marginTop: 8,
          border: '1px solid #e5e7eb',
          borderRadius: 12
        }}
      >
        {filteredSettingsTimezones.map(
          item => (
            <button
              key={item.zone}
              type="button"
              onClick={() => {
                setSettingsTimezone(
                  item.zone
                );
                setSettingsTimezonePickerOpen(
                  false
                );
                setSettingsTimezoneSearch('');
              }}
              style={{
                width: '100%',
                display: 'flex',
                alignItems: 'center',
                justifyContent:
                  'space-between',
                textAlign: 'left',
                padding: '11px 12px',
                border: 0,
                borderBottom:
                  '1px solid #f1f1f1',
                background:
                  item.zone ===
                  settingsTimezone
                    ? '#f5f5f5'
                    : '#fff',
                color: '#111'
              }}
            >
              <span>
                {item.label}
              </span>

              {item.zone ===
                settingsTimezone && (
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
          )
        )}
      </div>
    </div>
  )}
</div>

                <button
          className="primary full"
          disabled={saving}
          onClick={save}
        >
          {saving
            ? t('owner.saving')
            : t('common.save')}
        </button>

        <div
          style={{
            marginTop: '24px',
            paddingTop: '20px',
            borderTop: '1px solid rgba(0,0,0,0.08)'
          }}
        >
          <button
  type="button"
  className="ghost full"
  disabled={deletingBusiness}
  onClick={deleteBusiness}
  style={{
    color: '#d32f2f',
    borderColor: '#d32f2f'
  }}
>
  {deletingBusiness ? (
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
      Удаление...
    </>
  ) : (
    'Удалить бизнес'
  )}
</button>
        </div>

      </div>
    </div>
  );
}

function MyBookings({t}:{t:(key:string,fallback?:string)=>string}) {
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
                📅 {item.day}
              </p>

              <p>
                🕐{' '}
                {item.start?.slice(
                  0,
                  5
                )}
                {' – '}
                {item.end?.slice(
                  0,
                  5
                )}
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
function Client({
  slug,
  onBack,
  t
}: {
  slug: string;
  onBack: () => void;
  t: (key: string, fallback?: string) => string;
}) {
  const [business, setBusiness] =
    useState<any>(null);

  const [services, setServices] =
    useState<any[]>([]);

  const [businessId, setBusinessId] =
  useState<number | null>(null);

  const [selected, setSelected] =
    useState<any>(null);

  const [day, setDay] = useState(
    new Date()
      .toISOString()
      .slice(0, 10)
  );

  const [slots, setSlots] =
    useState<string[]>([]);

  const [selectedTime, setSelectedTime] =
    useState('');

  const [slotsLoading, setSlotsLoading] =
    useState(false);

  const [clientName, setClientName] =
    useState(
      tg()?.initDataUnsafe?.user
        ?.first_name || ''
    );

  const [phone, setPhone] =
    useState('');

  const [loading, setLoading] =
    useState(true);

  const [error, setError] =
    useState('');

  const [bookingLoading, setBookingLoading] =
    useState(false);

  const [isSaved, setIsSaved] =
    useState(false);

  const [savingBusiness, setSavingBusiness] =
    useState(false);

  const [savedBusinesses, setSavedBusinesses] =
    useState<any[]>([]);

  useEffect(() => {
    let cancelled = false;

    const load = async () => {
      setLoading(true);
      setError('');

      try {
        if (!slug) {
          throw new Error(
            t('client.slugError')
          );
        }

        const response = await fetch(
          API +
            `/businesses/${encodeURIComponent(slug)}`
        );

        const text =
          await response.text();

        let data: any = null;

        try {
          data = text
            ? JSON.parse(text)
            : null;
        } catch {
          data = null;
        }

        if (!response.ok) {
          if (response.status === 403) {
            throw new Error(
              t('client.businessInactive')
            );
          }

          if (response.status === 404) {
            throw new Error(
              t('client.businessNotFound')
            );
          }

          throw new Error(
            data?.detail ||
            data?.message ||
            `${t('client.serverError')} ${response.status}`
          );
        }

        if (!data?.business) {
          throw new Error(
            t('client.businessDataError')
          );
        }

        if (!cancelled) {
          setBusiness(
            data.business
          );

          setServices(
            data.services || []
          );
        }
      } catch (e: any) {
        console.error(
          'CLIENT LOAD ERROR:',
          e
        );

        if (!cancelled) {
          setBusiness(null);
          setServices([]);
          setError(
            e?.message ||
            t('client.businessLoadError')
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
  }, [slug, t]);

  useEffect(() => {
    const loadSaved = async () => {
      if (
        !initData() ||
        !business
      ) {
        return;
      }

      try {
        const response =
          await fetch(
            API +
              '/my/saved-businesses',
            {
              headers: headers()
            }
          );

        if (!response.ok) {
          return;
        }

        const data =
          await response.json();

        const list =
          Array.isArray(data)
            ? data
            : [];

        setSavedBusinesses(list);

        setIsSaved(
          list.some(
            (item: any) =>
              item.id === business.id
          )
        );
      } catch {
        setSavedBusinesses([]);
      }
    };

    loadSaved();
  }, [business]);

  const toggleSave = async () => {
    if (!business) {
      return;
    }

    if (!initData()) {
      alert(
        t('client.saveLoginRequired')
      );
      return;
    }

    setSavingBusiness(true);

    try {
      const response =
        await fetch(
          API +
            `/my/saved-businesses/${business.id}`,
          {
            method:
              isSaved
                ? 'DELETE'
                : 'POST',
            headers: headers()
          }
        );

      const data =
        await response
          .json()
          .catch(() => null);

      if (!response.ok) {
        throw new Error(
          data?.detail ||
          t('client.saveBusinessError')
        );
      }

      setIsSaved(!isSaved);
    } catch (e: any) {
      alert(
        e?.message ||
        t('client.saveBusinessError')
      );
    } finally {
      setSavingBusiness(false);
    }
  };

  const loadSlots = async (
    service: any,
    selectedDay: string
  ) => {
    if (!business) {
      return;
    }

    setSlots([]);
    setSelectedTime('');
    setSlotsLoading(true);

    try {
      const response =
        await fetch(
          API +
            `/businesses/${business.id}/availability?service_id=${service.id}&day=${selectedDay}`
        );

      const data =
        await response.json();

      if (!response.ok) {
        throw new Error(
          data?.detail ||
          t('client.availabilityError')
        );
      }

      setSlots(
        data?.slots || []
      );
    } catch (e) {
      console.error(
        'AVAILABILITY ERROR:',
        e
      );

      setSlots([]);
    } finally {
      setSlotsLoading(false);
    }
  };

  const chooseService = async (
    service: any
  ) => {
    setSelected(service);
    setSelectedTime('');

    await loadSlots(
      service,
      day
    );
  };

  const chooseTime = (
    time: string
  ) => {
    setSelectedTime(time);

    setTimeout(() => {
      document
        .getElementById(
          'booking-form'
        )
        ?.scrollIntoView({
          behavior: 'smooth',
          block: 'start'
        });
    }, 50);
  };

  const submitBooking = async () => {
    if (
      !business ||
      !selected ||
      !selectedTime
    ) {
      return;
    }

    const name =
      clientName.trim();

    const clientPhone =
      phone.trim();

    if (!name) {
      alert(
        t('client.enterName')
      );
      return;
    }

    if (!clientPhone) {
      alert(
        t('client.enterPhone')
      );
      return;
    }

    setBookingLoading(true);

    try {
      const response =
        await fetch(
          API + '/bookings',
          {
            method: 'POST',
            headers: headers(),
            body: JSON.stringify({
              business_id:
                business.id,
              service_id:
                selected.id,
              client_name: name,
              client_phone:
                clientPhone,
              day,
              start:
                selectedTime
            })
          }
        );

      const data =
        await response.json();

      if (!response.ok) {
        alert(
          data?.detail ||
          t('client.bookingError')
        );
        return;
      }

      alert(
        t('client.bookingSuccess')
      );

      setSelectedTime('');

      await loadSlots(
        selected,
        day
      );
    } catch (e) {
      console.error(
        'BOOKING ERROR:',
        e
      );

      alert(
        t('client.bookingRetry')
      );
    } finally {
      setBookingLoading(false);
    }
  };

  const mapUrl =
    business &&
    business.latitude != null &&
    business.longitude != null
      ? `https://www.google.com/maps/search/?api=1&query=${business.latitude},${business.longitude}`
      : business?.address
        ? `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(
            business.address
          )}`
        : '';

  if (loading) {
    return (
      <div className="loading-screen">
        <div className="loading-logo">
          B
        </div>

        <h2>
          Bookly
        </h2>

        <div className="loading-spinner"></div>

        <p>
          {t('client.loadingBusiness')}
        </p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="card">
        <button
          className="back"
          onClick={onBack}
        >
          ← {t('common.back')}
        </button>

        <h2>
          {t('client.openError')}
        </h2>

        <p className="error">
          ❌ {error}
        </p>

        <button
          className="primary full"
          onClick={() =>
            window.location.reload()
          }
        >
          {t('client.retry')}
        </button>
      </div>
    );
  }

  if (!business) {
    return (
      <div className="card">
        <button
          className="back"
          onClick={onBack}
        >
          ← {t('common.back')}
        </button>

        <p>
          {t('client.businessNotFound')}
        </p>
      </div>
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

      <div className="card">

  <div className="client-business-header">

    {business?.business_image && (
      <img
        src={business.business_image}
        alt={business.name}
        className="client-business-thumb"
      />
    )}

    <div className="client-business-header-info">
      <h1>
        {business.name}
      </h1>

      {business.description && (
        <p>
          {business.description}
        </p>
      )}
    
  </div>

</div>

<div className="client-contact-actions">

    {business.phone && (
      <div className="client-phone-row">
        <span className="client-phone-number">
          {business.phone}
        </span>

        <button
          type="button"
          className="client-copy-button"
          onClick={async () => {
            try {
              await navigator.clipboard.writeText(
                business.phone
              );

              tg()?.showAlert?.(
                t(
                  'client.phoneCopied',
                  'Номер скопирован'
                )
              );
            } catch {
              const input =
                document.createElement('input');

              input.value = business.phone;
              document.body.appendChild(input);
              input.select();
              document.execCommand('copy');
              input.remove();

              tg()?.showAlert?.(
                t(
                  'client.phoneCopied',
                  'Номер скопирован'
                )
              );
            }
          }}
        >
          {t('client.copy', 'Скопировать')}
        </button>
      </div>
    )}

    {mapUrl && (
      <button
        type="button"
        className="client-contact-button"
        onClick={() => {
          if (tg()?.openLink) {
            tg().openLink(mapUrl);
          } else {
            window.open(
              mapUrl,
              '_blank'
            );
          }
        }}
      >
        <span className="client-contact-label">
          {business.address ||
            t('client.location')}
        </span>

        <span className="client-contact-arrow">
          →
        </span>
      </button>
    )}

  </div>
  <button
    className={
      isSaved
        ? 'client-save-button saved'
        : 'client-save-button'
    }
    disabled={savingBusiness}
    onClick={toggleSave}
  >
    {isSaved
      ? t('client.savedBusiness')
      : t('client.saveBusiness')}
  </button>
        <p
  className="muted"
  style={{
    marginTop: 10,
    marginBottom: 8,
    fontSize: 13
  }}
>
  Часовой пояс:{' '}
  {business.timezone
    ? formatGMTOffset(
        getTimeZoneOffsetMinutes(
          business.timezone
        )
      )
    : 'GMT+0'}
</p>
  <p
    className="muted"
    style={{
      marginBottom: 0
    }}
  >
    {t('client.chooseServiceHint')}
  </p>

</div>

<details className="card">
        <summary
          style={{
            cursor: 'pointer',
            fontWeight: 600,
            fontSize: 18
          }}
        >
          📅 {t('client.myBookings')}
        </summary>

        <div
          style={{
            marginTop: 15
          }}
        >
          <MyBookings t={t} />
        </div>
      </details>

      

      <h2>
        {t('client.services')}
      </h2>

      {services.length === 0 ? (
        <div className="card">
          <p>
            {t('client.noServices')}
          </p>
        </div>
      ) : (
        services.map(
  service => (
    <div
      className={
        selected?.id === service.id
          ? 'client-service-card selected'
          : 'client-service-card'
      }
      key={service.id}
    >
      <div className="client-service-info">
        <strong>
          {service.name}
        </strong>

        <div className="client-service-meta">
          {money(
            service.price,
            service.currency
          )}

          <span>·</span>

          {service.duration_min}{' '}
          {t('owner.minutes')}
        </div>

        {service.description && (
          <p>
            {service.description}
          </p>
        )}
      </div>

      <button
        className="client-service-button"
        onClick={() =>
          chooseService(service)
        }
      >
        {t('client.chooseService')}
      </button>
    </div>
  )
)
      )}

      {selected && (
        <>

          <div className="card">
            <h2>
              {t('client.chooseDate')}
            </h2>

            <input
              type="date"
              min={
                new Date()
                  .toISOString()
                  .slice(0, 10)
              }
              value={day}
              onChange={async e => {
                const newDay =
                  e.target.value;

                setDay(newDay);
                setSelectedTime('');

                await loadSlots(
                  selected,
                  newDay
                );
              }}
            />
          </div>

          <div className="card">
            <h2>
              {t('client.chooseTime')}
            </h2>

            {slotsLoading ? (
              <p className="muted">
                {t('owner.loadingSlots')}
              </p>
            ) : slots.length > 0 ? (
              <div className="slots">
                {slots.map(
                  time => (
                    <button
                      key={time}
                      className={
                        selectedTime ===
                        time
                          ? 'selected'
                          : ''
                      }
                      onClick={() =>
                        chooseTime(
                          time
                        )
                      }
                    >
                      {time}
                    </button>
                  )
                )}
              </div>
            ) : (
              <p>
                {t('client.noSlots')}
              </p>
            )}
          </div>

          {selectedTime && (
            <div
              id="booking-form"
              className="card"
            >
              <h2>
                {t('client.yourData')}
              </h2>

              <div className="success">
                <b>
                  {selected.name}
                </b>

                <br />

                {day}
                {' · '}
                {selectedTime}
              </div>

              <input
                type="text"
                placeholder={
                  t('client.name')
                }
                value={clientName}
                onChange={e =>
                  setClientName(
                    e.target.value
                  )
                }
              />

              <input
                type="tel"
                placeholder={
                  t('client.phone')
                }
                value={phone}
                onChange={e =>
                  setPhone(
                    e.target.value
                  )
                }
              />

              <button
                className="primary full"
                disabled={
                  bookingLoading
                }
                onClick={
                  submitBooking
                }
              >
                {bookingLoading
                  ? t('client.bookingLoading')
                  : t('client.confirmBooking')}
              </button>
            </div>
          )}

        </>
      )}

    </section>
  );
}

createRoot(
  document.getElementById('root')!
).render(
  <App />
);

