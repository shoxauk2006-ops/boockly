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
          'X-Telegram-Init-Data': initData()
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

          <h3>
  {t(
    'info.termsOfUse',
    'Правила использования'
  )}
</h3>

          <div
            className="muted"
            style={{
              lineHeight: '1.6'
            }}
          >
            <p>
  {t(
    'info.rule1',
    '1. Bookly предназначен для законного использования и предоставления обычных товаров и услуг.'
  )}
</p>

            <p>
  {t(
    'info.rule2',
    '2. Запрещено использовать Bookly для незаконных товаров или услуг, наркотиков, оружия, мошенничества, порнографии, азартных игр и другой запрещённой деятельности.'
  )}
</p>

            <p>
  {t(
    'info.rule3',
    '3. Пользователь самостоятельно отвечает за законность своего бизнеса, товаров, услуг, рекламы и контента.'
  )}
</p>

            <p>
  {t(
    'info.rule4',
    '4. Запрещено использовать Bookly для обмана клиентов, спама, фиктивных записей и другого злоупотребления сервисом.'
  )}
</p>

            <p>
  {t(
    'info.rule5',
    '5. Пользователь обязан соблюдать применимое законодательство и требования по защите персональных данных.'
  )}
</p>

            <p>
  {t(
    'info.rule6',
    '6. Мы вправе временно ограничить или полностью заблокировать бизнес при нарушении настоящих правил.'
  )}
</p>

            <p>
  {t(
    'info.rule7',
    '7. Запрещено создавать новый бизнес или аккаунт для обхода ранее применённой блокировки.'
  )}
</p>

            <p>
  {t(
    'info.rule8',
    '8. Мы можем изменять функции Bookly, временно ограничивать работу сервиса или прекращать предоставление сервиса.'
  )}
</p>

            <p>
  {t(
    'info.rule9',
    '9. Мы не обещаем бесперебойную или безошибочную работу Bookly. Возможны технические сбои, обслуживание и недоступность сторонних сервисов.'
  )}
</p>

            <p>
  {t(
    'info.rule10',
    '10. Используя Bookly, пользователь подтверждает согласие соблюдать эти правила.'
  )}
</p>

            <hr />

            <h3>
  {t(
    'info.contacts',
    'Контакты'
  )}
</h3>

            <p>
  {t(
    'info.contactDescription',
    'По вопросам работы Bookly и для сообщений о нарушениях:'
  )}
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
          </div>
        </>
      )}
    </div>
  </div>
)}

</div>
}

