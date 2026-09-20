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
import { Admin } from './Admin';
import { Client } from './Client';
import { PersonalHome } from './PersonalHome';

export function App(){
    const [language, setLanguage] = useState<Language>(() => getStoredLanguage());
  const t = useMemo(() => createTranslator(language), [language]);

  const changeLanguage = (nextLanguage: Language) => {
    setLanguage(nextLanguage);
    setStoredLanguage(nextLanguage);
    applyLanguageDirection(nextLanguage);

    // Keep Telegram notifications in the same language the user selected
    // inside Bookly. Do not wait for some unrelated API request to sync it.
    if (initData()) {
      fetch(API + '/me', {
        headers: {
          ...headers(),
          'X-Bookly-Language': nextLanguage
        }
      }).catch(() => {});
    }
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
  const [infoMenuOpen, setInfoMenuOpen] = useState(false);
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

    const pathMatch = window.location.pathname.match(/^\/connect\/(.+)$/);
    const pathStartParam = pathMatch ? decodeURIComponent(pathMatch[1]) : '';
    const queryStartParam = new URLSearchParams(window.location.search).get('startapp') || '';
    const hashStartParam = window.location.hash.replace(/^#/, '');

    const startParam =
      tg()?.initDataUnsafe?.start_param ||
      pathStartParam ||
      queryStartParam ||
      (hashStartParam.startsWith('bookly-connect-') ? hashStartParam : '') ||
      '';

    if (startParam.startsWith('bookly-connect-')) {
      fetch(API + '/account/connect-telegram-from-web', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-Telegram-Init-Data': initData(),
          'X-Bookly-Language': getStoredLanguage()
        },
        body: JSON.stringify({ token: startParam })
      })
        .then(async (response) => {
          const data = await response.json().catch(() => ({}));
          if (!response.ok) {
            throw new Error(data?.detail || 'Telegram connection failed');
          }
          return data;
        })
        .then((data) => {
          if (data?.business_id) {
            localStorage.setItem('bookly_active_business_id', String(data.business_id));
          }
          setAdminTab('home');
          setMode('admin');
        })
        .catch((error) => {
          console.error('Bookly Telegram connection error:', error);
          alert(error?.message || 'Telegram connection failed');
        });
      return;
    }

    if (startParam.startsWith('staff-connect-')) {
      fetch(
        API +
          '/staff/connect?token=' +
          encodeURIComponent(startParam),
        {
          method: 'POST',
          headers: {
            'X-Telegram-Init-Data': initData(),
            'X-Bookly-Language': getStoredLanguage()
          }
        }
      )
        .then(async (response) => {
          const data = await response.json().catch(() => ({}));
          if (!response.ok) {
            throw new Error(
              data?.detail ||
                'Staff Telegram connection failed'
            );
          }
          return data;
        })
        .then((data) => {
          if (data?.specialist_id) {
            localStorage.setItem(
              'bookly_staff_specialist_id',
              String(data.specialist_id)
            );
          }

          try {
            sessionStorage.setItem(
              'bookly_open_staff',
              '1'
            );
          } catch {}

          setMode('home');
        })
        .catch((error) => {
          console.error(
            'Bookly staff Telegram connection error:',
            error
          );
          alert(
            error?.message ||
              'Staff Telegram connection failed'
          );
        });
      return;
    }

    if(startParam){
      setClientSlug(startParam);
      setMode('client');
    }
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

    <div className="header-actions">
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

      
  </div>
</header>

{mode === 'home' && (
  <button
    type="button"
    className="global-info-button"
    onClick={() => {
      setInfoSection('help');
      setInfoModal(true);
    }}
  >
    ⓘ
  </button>
)}

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
  t={t}
/>
<BooklyConfirmModal
  open={confirmModalOpen}
  message={confirmModalMessage}
  onCancel={() => resolveConfirmModal(false)}
  onConfirm={() => resolveConfirmModal(true)}
  t={t}
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
          {t('info.howBooklyWorks')}
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
          {t('info.rulesAndContacts')}
        </button>
      </div>

      {infoSection === 'help' ? (
        <>
          <span className="personal-eyebrow">
            BOOKLY
          </span>

          <h2>
  {t(
    'info.howBooklyWorks',
    'Как работает Bookly'
  )}
</h2>
          <h3>
  {t(
    'owner.forBusinessOwner',
    'Для владельца бизнеса'
  )}
</h3>

          <p className="muted">
  {t(
    'info.stepCreateBusiness',
    '1. Создайте бизнес.'
  )}
</p>

          <p className="muted">
  {t(
    'info.stepAddInfo',
    '2. Добавьте информацию и фотографию.'
  )}
</p>

          <p className="muted">
  {t(
    'info.stepAddServices',
    '3. Добавьте услуги и цены.'
  )}
</p>

          <p className="muted">
  {t(
    'owner.setupWorkingHours',
    '4. Настройте график работы.'
  )}
</p>

          <p className="muted">
  {t(
    'owner.setupBlocks',
    '5. При необходимости создайте блокировки.'
  )}
</p>

          <p className="muted">
  {t(
    'info.stepBookings',
    '6. Управляйте записями.'
  )}
</p>

          <p className="muted">
  {t(
    'info.activationDescription',
    'Чтобы начать принимать записи от клиентов, активируйте подписку Bookly Pro. После активации вы получите клиентскую ссылку и сможете начать принимать записи.'
  )}
</p>

          <h3>
            Bookly Pro
          </h3>

          <p className="muted">
  {t(
    'info.proUnlocksClientPart',
    'Bookly Pro открывает клиентскую часть Bookly:'
  )}
</p>

          <ul>
            <li>
  {t(
    'info.clientPage',
    'Клиентская страница'
  )}
</li>

            <li>
  {t(
    'info.clientLink',
    'Персональная ссылка для клиентов'
  )}
</li>

            <li>
  {t(
    'info.clientQr',
    'QR-код для клиентов'
  )}
</li>

            <li>
  {t(
    'info.onlineBookings',
    'Онлайн-записи'
  )}
</li>

            <li>
  {t(
    'info.bookingNotifications',
    'Уведомления о новых записях'
  )}
</li>
            <li>
  {t(
    'info.basePlanServices',
    'До 10 услуг в базовом тарифе'
  )}
</li>
          </ul>

          <p className="muted">
  {t(
    'info.withoutSubscription',
    'Без подписки вы можете создавать и настраивать бизнес, добавлять услуги, управлять графиком, блокировками и записями в админке. Подписка нужна для подключения клиентов и начала приёма онлайн-записей.'
  )}
</p>
        </>
      ) : (
        <>
          <span className="personal-eyebrow">
            BOOKLY
          </span>

          <h2>
            {t(
              'info.legalDocuments',
              'Документы и условия'
            )}
          </h2>

          <p className="muted">
            {t(
              'info.legalIntro',
              'Использование Bookly регулируется актуальными Условиями использования и Политикой конфиденциальности. Эти документы применяются к сайту, кабинету аккаунта и Telegram Mini App.'
            )}
          </p>

          <p className="legal-effective-date">
            {t(
              'info.legalEffective',
              'Актуальная версия: 18 сентября 2026'
            )}
          </p>

          <div className="bookly-legal-links">
            <a
              href="/rules.html"
              target="_blank"
              rel="noreferrer"
              className="bookly-legal-card"
            >
              <div>
                <strong>
                  {t(
                    'info.termsOfUse',
                    'Условия использования'
                  )}
                </strong>

                <span>
                  {t(
                    'info.termsSummary',
                    'Аккаунт, бизнес, записи, подписка, платежи, допустимое использование и ответственность.'
                  )}
                </span>
              </div>

              <b>↗</b>
            </a>

            <a
              href="/privacy.html"
              target="_blank"
              rel="noreferrer"
              className="bookly-legal-card"
            >
              <div>
                <strong>
                  {t(
                    'info.privacyPolicy',
                    'Политика конфиденциальности'
                  )}
                </strong>

                <span>
                  {t(
                    'info.privacySummary',
                    'Какие данные обрабатывает Bookly, зачем они нужны, кому передаются и как запросить удаление.'
                  )}
                </span>
              </div>

              <b>↗</b>
            </a>
          </div>

          <p className="muted legal-current-note">
            {t(
              'info.legalCurrentNote',
              'Полный актуальный текст хранится на этих страницах. Если документы будут обновлены, Mini App всегда будет открывать их последнюю опубликованную версию.'
            )}
          </p>

          <hr />

          <h3>
            {t(
              'info.contacts',
              'Контакты'
            )}
          </h3>

          <p className="muted">
            {t(
              'info.contactDescription',
              'По вопросам Bookly, аккаунта, конфиденциальности или для сообщений о нарушениях:'
            )}
          </p>

          <div className="contact-email-row">
            <a
              href="mailto:booklyminiapp@gmail.com"
              className="contact-email"
            >
              booklyminiapp@gmail.com
            </a>

            <button
              type="button"
              className="ghost"
              onClick={async () => {
                try {
                  await navigator.clipboard.writeText(
                    'booklyminiapp@gmail.com'
                  );

                  setEmailCopied(true);

                  setTimeout(() => {
                    setEmailCopied(false);
                  }, 1500);
                } catch {}
              }}
            >
              {emailCopied
                ? `✓ ${t(
                    'common.copied',
                    'Скопировано'
                  )}`
                : t(
                    'common.copy',
                    'Скопировать'
                  )}
            </button>
          </div>
        </>
      )}
    </div>
  </div>
)}

</div>
}

