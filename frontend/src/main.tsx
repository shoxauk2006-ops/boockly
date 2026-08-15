import React,{useEffect,useMemo,useState} from 'react';
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
const initData=()=>tg()?.initData||'';
const headers = () => {
  const base: Record<string, string> = {
    'Content-Type': 'application/json',
    'X-Telegram-Init-Data': initData()
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
const money=(v:number,c='UZS')=>`${new Intl.NumberFormat('ru-RU').format(v)} ${c}`;
const days=['Пн','Вт','Ср','Чт','Пт','Сб','Вс'];

function App(){
  const [mode,setMode]=useState<'home'|'admin'|'client'>('home');
  const [clientSlug,setClientSlug]=useState('');
  const [menuOpen,setMenuOpen]=useState(false);
  const [adminTab,setAdminTab]=useState('home');

  useEffect(()=>{
    tg()?.ready();
    tg()?.expand();

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

     window.Paddle.Initialize({
     token
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
      <small>Booking inside Telegram</small>
    </div>

   
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
            <small>Меню</small>
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
              🏠 Главная
            </button>

            <button onClick={()=>{
              setAdminTab('services');
              setMenuOpen(false);
            }}>
              🛠 Услуги
            </button>

            <button onClick={()=>{
              setAdminTab('hours');
              setMenuOpen(false);
            }}>
              🕐 График
            </button>

            <button onClick={()=>{
              setAdminTab('blocks');
              setMenuOpen(false);
            }}>
              🚫 Блокировки
            </button>

            <button onClick={()=>{
              setAdminTab('bookings');
              setMenuOpen(false);
            }}>
              📅 Записи
            </button>

            <button onClick={()=>{
              setAdminTab('settings');
              setMenuOpen(false);
            }}>
              ⚙️ Настройки
            </button>

          </nav>
        ) : (
          <nav className="side-menu-nav">

            <button onClick={()=>{
              setMode('admin');
              setAdminTab('home');
              setMenuOpen(false);
            }}>
              👨‍💼 Админ-панель
            </button>

            <button onClick={()=>{
              setMode('home');
              setMenuOpen(false);
            }}>
              🏠 Главная
            </button>

          </nav>
        )}

      </aside>
    </>
  )}

  {mode==='home' &&
    <Home
      onAdmin={()=>{
        setAdminTab('home');
        setMode('admin');
      }}
      slug={clientSlug}
      setSlug={setClientSlug}
      open={openClient}
    />
  }

  {mode==='admin' &&
    <Admin
      onBack={()=>setMode('home')}
      initialTab={adminTab}
    />
  }

  {mode==='client' &&
    <Client
      slug={clientSlug}
      onBack={()=>setMode('home')}
    />
  }

</div>
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
          Бронирование без звонков
        </h1>

        <p>
          Bookly помогает бизнесу
          принимать записи прямо
          в Telegram.
        </p>
      </div>

      <button
        className="primary full"
        onClick={p.onAdmin}
      >
        Открыть админ-панель
      </button>

      <div className="card">

        <h3>
          Открыть страницу бизнеса
        </h3>

        <input
          placeholder="Ссылка или slug бизнеса"
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
          Открыть
        </button>

      </div>

      <div className="card">

        <h2>
          ❤️ Сохранённые бизнесы
        </h2>

        {savedLoading ? (
          <p className="muted">
            Загрузка...
          </p>
        ) : savedBusinesses.length === 0 ? (
          <p className="muted">
            Здесь появятся бизнесы,
            которые вы сохраните.
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
                    Открыть
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
  initialTab
}: {
  onBack: () => void;
  initialTab: string;
}) {
  const [tab, setTab] =
    useState(initialTab);

  const [businesses, setBusinesses] =
    useState<any[]>([]);

  const [business, setBusiness] =
    useState<any>(null);

  const [services, setServices] =
    useState<any[]>([]);

  const [hours, setHours] =
    useState<any[]>([]);

  const [blocks, setBlocks] =
    useState<any[]>([]);

  const [bookings, setBookings] =
    useState<any[]>([]);

  const [loading, setLoading] =
    useState(true);

  const [businessPanel, setBusinessPanel] =
    useState<'closed' | 'list' | 'create'>(
      'closed'
    );

  const [newBusinessName, setNewBusinessName] =
    useState('');

  const [creatingBusiness, setCreatingBusiness] =
    useState(false);

  const loadBusinesses = async () => {
    const response = await fetch(
      API + '/admin/businesses',
      {
        headers: headers()
      }
    );

    if (!response.ok) {
      throw new Error(
        'Не удалось загрузить бизнесы'
      );
    }

    const list =
      await response.json();

    const normalized =
      Array.isArray(list)
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

    let selected =
      normalized.find(
        (item: any) =>
          String(item.id) ===
          String(selectedId)
      );

    if (!selected) {
      selected =
        normalized[0] || null;
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
    return null;
  };

  const loadBusinessData =
    async (
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

  const load = async () => {
    if (!initData()) {
      setLoading(false);
      return;
    }

    try {
      const selected =
        await loadBusinesses();

      if (selected) {
        await loadBusinessData(
          selected
        );
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

    window.addEventListener(
      'focus',
      refresh
    );

    document.addEventListener(
      'visibilitychange',
      refresh
    );

    return () => {
      window.removeEventListener(
        'focus',
        refresh
      );

      document.removeEventListener(
        'visibilitychange',
        refresh
      );
    };
  }, []);

  const selectBusiness =
    async (
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

      await loadBusinessData(
        selected
      );

      setLoading(false);
    };

  const createBusiness =
    async () => {
      const name =
        newBusinessName.trim();

      if (!name) {
        alert(
          'Введите название бизнеса'
        );
        return;
      }

      setCreatingBusiness(true);

      try {
        const response =
          await fetch(
            API + '/admin/businesses',
            {
              method: 'POST',
              headers: headers(),
              body: JSON.stringify({
                name
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
            'Не удалось создать бизнес'
          );
        }

        try {
          localStorage.setItem(
            'bookly_active_business_id',
            String(data.id)
          );
        } catch {}

        setNewBusinessName('');
        setBusiness(data);
        setBusinessPanel('closed');

        const updated =
          await fetch(
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

        await loadBusinessData(
          data
        );

        setTab('home');

        alert(
          '✅ Новый бизнес создан'
        );

      } catch (e: any) {
        alert(
          e?.message ||
          'Не удалось создать бизнес'
        );
      } finally {
        setCreatingBusiness(
          false
        );
      }
    };

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
          Загрузка...
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
          ← Назад
        </button>

        <h2>
          Откройте Bookly из Telegram
        </h2>

        <p>
          Админ-панель работает
          внутри Telegram Mini App.
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
          ← Назад
        </button>

        <div className="card">
          <h2>
            Мои бизнесы
          </h2>

          <p>
            У вас пока нет бизнеса.
          </p>

          <button
            className="primary full"
            onClick={() =>
              setBusinessPanel('create')
            }
          >
            + Добавить бизнес
          </button>
        </div>

        {businessPanel === 'create' && (
          <div className="card">
            <h2>
              Новый бизнес
            </h2>

            <input
              placeholder="Название бизнеса"
              value={newBusinessName}
              onChange={e =>
                setNewBusinessName(
                  e.target.value
                )
              }
            />

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
                ? 'Создание...'
                : 'Создать бизнес'}
            </button>
          </div>
        )}
      </section>
    );
  }

  return (
    <section>
      <button
        className="back"
        onClick={onBack}
      >
        ← Назад
      </button>

      <div className="card">
        <div
          style={{
            display: 'flex',
            justifyContent:
              'space-between',
            alignItems:
              'center',
            gap: 12
          }}
        >
          <div>
            <small className="muted">
              Текущий бизнес
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
                'Адрес не указан'}
            </p>
          </div>

          <button
            onClick={() =>
              setBusinessPanel(
                businessPanel === 'list'
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
            Мои бизнесы
          </h3>

          {businesses.map(item => (
            <div
              key={item.id}
              style={{
                display: 'flex',
                justifyContent:
                  'space-between',
                alignItems:
                  'center',
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
                    'Адрес не указан'}
                </p>
              </div>

              <button
                className={
                  business.id === item.id
                    ? 'primary'
                    : ''
                }
                onClick={() =>
                  selectBusiness(item)
                }
              >
                {business.id === item.id
                  ? 'Открыт'
                  : 'Открыть'}
              </button>
            </div>
          ))}

          <button
            className="primary full"
            style={{
              marginTop: 12
            }}
            onClick={() =>
              setBusinessPanel('create')
            }
          >
            + Добавить бизнес
          </button>
        </div>
      )}

      {businessPanel === 'create' && (
        <div className="card">
          <h3>
            Создать новый бизнес
          </h3>

          <input
            placeholder="Название бизнеса"
            value={newBusinessName}
            onChange={e =>
              setNewBusinessName(
                e.target.value
              )
            }
          />

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
              ? 'Создание...'
              : 'Создать бизнес'}
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
              'Адрес не указан'}
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
            ? 'Активен'
            : 'Не активирован'}
        </span>
      </div>

      <nav className="tabs">
        {[
          ['home', 'Главная'],
          ['services', 'Услуги'],
          ['hours', 'График'],
          ['blocks', 'Блокировки'],
          ['bookings', 'Записи'],
          ['settings', 'Настройки']
        ].map(
          ([key, label]) => (
            <button
              className={
                tab === key
                  ? 'active'
                  : ''
              }
              onClick={() =>
                setTab(key)
              }
              key={key}
            >
              {label}
            </button>
          )
        )}
      </nav>

      {tab === 'home' && (
        <Dashboard
          bookings={bookings}
          business={business}
        />
      )}

      {tab === 'services' && (
        <Services
          services={services}
          reload={load}
          business={business}
        />
      )}

      {tab === 'hours' && (
        <Hours
          hours={hours}
          reload={load}
        />
      )}

      {tab === 'blocks' && (
        <Blocks
          blocks={blocks}
          reload={load}
        />
      )}

      {tab === 'bookings' && (
        <Bookings
          bookings={bookings}
        />
      )}

      {tab === 'settings' && (
        <Settings
          business={business}
          reload={load}
        />
      )}
    </section>
  );
}

function BusinessForm({onSaved}:{onSaved:()=>void}) {
  const [name,setName] = useState('');
  const [loading,setLoading] = useState(false);
  const [error,setError] = useState('');

  const save = async () => {
    setError('');

    const businessName = name.trim();

    if (!businessName) {
      setError('Введите название бизнеса');
      return;
    }

    setLoading(true);

    try {
      const initData = tg()?.initData || '';

      if (!initData) {
        throw new Error(
          'Telegram initData отсутствует. Откройте Bookly именно внутри Telegram Mini App.'
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
          `Ошибка сервера: ${response.status}`
        );
      }

      onSaved();
    } catch (e:any) {
      console.error('CREATE BUSINESS ERROR:', e);
      setError(e?.message || 'Не удалось создать бизнес');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="card">
      <h2>Создайте бизнес</h2>

      <input
        placeholder="Название бизнеса"
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
        {loading ? 'Создание...' : 'Создать бизнес'}
      </button>
    </div>
  );
}

function Dashboard({bookings,business}:{bookings:any[],business:any}){const today=new Date().toISOString().slice(0,10);const b=bookings.filter(x=>x.day===today&&x.status==='confirmed');return <><div className="grid3"><Stat n={b.length} t="Сегодня"/><Stat n={bookings.filter(x=>x.status==='confirmed').length} t="Всего записей"/><Stat n={business.subscription_active?'✓':'—'} t="Подписка"/></div><div className="card"><h3>Сегодня</h3>{b.length?b.map(x=><BookingRow x={x} key={x.id}/>):<p>Записей пока нет.</p>}</div><Subscription business={business}/></>}
function Stat({n,t}:{n:any,t:string}){return <div className="stat"><strong>{n}</strong><span>{t}</span></div>}
function Subscription({business}:{business:any}){
  const status = business?.subscription_status || "inactive";
 const active = business?.subscription_active || false;

  const paymentFailed = status === "past_due" || status === "unpaid";
  const cancelledButActive = status === "cancelled" && active;

  if (active && !paymentFailed) {
    return (
      <div className="card subscription">
        <div className="subscription-head">
          <div>
            <h3>Bookly Pro</h3>
            <p><b>$9.99 / месяц</b></p>
          </div>

          <span className="pill ok">
            Активна
          </span>
        </div>

        <ul>
          <li>Неограниченные записи</li>
          <li>Ссылка для клиентов</li>
          <li>Уведомления в Telegram</li>
          <li>Расписание и блокировки</li>
        </ul>

        <div className="success">
          ✅ Bookly активирован

          {business.subscription_expires_at && (
            <p className="muted">
              Следующее списание:{" "}
              {new Date(
                business.subscription_expires_at
              ).toLocaleDateString("ru-RU")}
            </p>
          )}

          {cancelledButActive && (
            <p className="muted">
              Подписка отменена и действует до конца оплаченного периода.
            </p>
          )}
        </div>
      </div>
    );
  }

  if (paymentFailed) {
    return (
      <div className="card subscription">
        <div className="subscription-head">
          <div>
            <h3>Bookly Pro</h3>
            <p><b>$9.99 / месяц</b></p>
          </div>

          <span className="pill">
            Оплата не прошла
          </span>
        </div>

        <p className="muted">
          Оплатите подписку, чтобы активировать Bookly.
        </p>
<button
  className="primary full"
 onClick={() =>
  checkout(
    'paddle',
    business.id
  )
}
>
  Оплатить $9.99 / месяц
</button>
      </div>
    );
  }

  return (
    <div className="card subscription">
      <div className="subscription-head">
        <div>
          <h3>Bookly Pro</h3>
          <p><b>$9.99 / месяц</b></p>
        </div>

        <span className="pill">
          Не активирована
        </span>
      </div>

      <p className="muted">
        Оплатите подписку, чтобы активировать Bookly.
      </p>

      <button
        className="primary full"
       onClick={()=>checkout('paddle')}
      >
        Оплатить $9.99 / месяц
      </button>
    </div>
  );
}
function checkout(
  provider: string,
  businessId?: number
) {
  if (provider !== 'paddle') {
    return;
  }

  if (!window.Paddle) {
    alert(
      'Paddle ещё загружается. Попробуйте ещё раз.'
    );
    return;
  }

  const ownerId =
    tg()?.initDataUnsafe?.user?.id;

  if (!ownerId) {
    alert(
      'Не удалось определить пользователя Telegram.'
    );
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
    alert(
      'Не удалось определить выбранный бизнес.'
    );
    return;
  }

  window.Paddle.Checkout.open({
    items: [
      {
        priceId:
          'pri_01kzxgbt08rm3pk2p5eaywgbsy',
        quantity: 1
      }
    ],
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
  business
}: {
  services: any[];
  reload: () => void;
  business: any;
}) {
  const [f, setF] = useState({
    name: '',
    description: '',
    price: '',
    currency: 'UZS',
    duration_min: '30'
  });

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
            ['en'],
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
      const parts =
        new Intl.NumberFormat(
          'en',
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
      duration_min: '30'
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
                name: business.name,
                description:
                  business.description ||
                  '',
                address:
                  businessAddress.trim(),
                phone:
                  businessPhone.trim(),
                latitude:
                  business.latitude ??
                  null,
                longitude:
                  business.longitude ??
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
            'Не удалось сохранить контакты'
          );
        }

        alert(
          '✅ Настройки сохранены'
        );

        reload();

      } catch (e: any) {
        alert(
          e?.message ||
          'Не удалось сохранить настройки'
        );
      } finally {
        setSavingBusiness(
          false
        );
      }
    };

  const saveService =
    async () => {
      const name =
        f.name.trim();

      const price =
        Number(f.price);

      const duration =
        Number(f.duration_min);

      if (!name) {
        alert(
          'Введите название услуги'
        );
        return;
      }

      if (
        !Number.isFinite(price) ||
        price < 0
      ) {
        alert(
          'Введите корректную цену'
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
          'Длительность должна быть от 1 до 480 минут'
        );
        return;
      }

      const url = editingId
        ? API +
          `/admin/services/${editingId}`
        : API +
          '/admin/services';

      const response =
        await fetch(
          url,
          {
            method: editingId
              ? 'PATCH'
              : 'POST',
            headers: headers(),
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
          'Не удалось сохранить услугу'
        );
        return;
      }

      alert(
        editingId
          ? '✅ Услуга изменена'
          : '✅ Услуга добавлена'
      );

      resetForm();
      reload();
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

    window.scrollTo({
      top: 0,
      behavior: 'smooth'
    });
  };

  const remove = async (
    id: number
  ) => {
    if (
      !window.confirm(
        'Удалить эту услугу?'
      )
    ) {
      return;
    }

    const response =
      await fetch(
        API +
          `/admin/services/${id}`,
        {
          method: 'DELETE',
          headers: headers()
        }
      );

    if (!response.ok) {
      alert(
        'Не удалось удалить услугу'
      );
      return;
    }

    reload();
  };

  return (
    <div>

      <div className="card">
        <h2>
          Контакты бизнеса
        </h2>

        <input
          type="tel"
          placeholder="Номер телефона бизнеса"
          value={businessPhone}
          onChange={e =>
            setBusinessPhone(
              e.target.value
            )
          }
        />

        <input
          placeholder="Адрес бизнеса"
          value={businessAddress}
          onChange={e =>
            setBusinessAddress(
              e.target.value
            )
          }
        />

        <button
          className="primary full"
          disabled={
            savingBusiness
          }
          onClick={
            saveBusinessContacts
          }
        >
          {savingBusiness
            ? 'Сохранение...'
            : 'Сохранить контакты'}
        </button>
      </div>

      <div className="card">
        <h2>
          {editingId
            ? 'Изменить услугу'
            : 'Добавить услугу'}
        </h2>

        <input
          placeholder="Название"
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
          placeholder="Описание"
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
            placeholder="Цена"
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
            placeholder="Поиск валюты"
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

        <input
          type="number"
          min="1"
          max="480"
          placeholder="Длительность в минутах"
          value={
            f.duration_min
          }
          onChange={e =>
            setF({
              ...f,
              duration_min:
                e.target.value
            })
          }
        />

        <div className="two">

          <button
            className="primary full"
            onClick={
              saveService
            }
          >
            {editingId
              ? 'Сохранить изменения'
              : '+ Добавить услугу'}
          </button>

          {editingId && (
            <button
              className="full"
              onClick={
                resetForm
              }
            >
              Отмена
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
                мин
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
                Изменить
              </button>

              <button
                className="danger"
                onClick={() =>
                  remove(
                    service.id
                  )
                }
              >
                Удалить
              </button>
            </div>

          </div>
        )
      )}

    </div>
  );
}
function Hours({hours,reload}:{hours:any[],reload:()=>void}){const [f,setF]=useState({weekday:'0',start:'09:00',end:'18:00'});const add=async()=>{await fetch(API+'/admin/hours',{method:'POST',headers:headers(),body:JSON.stringify({...f,weekday:Number(f.weekday)})});reload()};return <div className="card"><h2>Рабочий график</h2><p>Настройте обычные рабочие часы. Потом отдельные часы можно блокировать.</p><div className="two"><select value={f.weekday} onChange={e=>setF({...f,weekday:e.target.value})}>{days.map((x,i)=><option value={i} key={x}>{x}</option>)}</select><span></span></div><div className="two"><input type="time" value={f.start} onChange={e=>setF({...f,start:e.target.value})}/><input type="time" value={f.end} onChange={e=>setF({...f,end:e.target.value})}/></div><button className="primary full" onClick={add}>Добавить интервал</button>{days.map((d,i)=>{const hs=hours.filter(h=>h.weekday===i);return <div className="dayrow" key={d}><b>{d}</b><div>{hs.length?hs.map(h=><span className="tag" key={h.id}>{h.start.slice(0,5)}–{h.end.slice(0,5)} <button onClick={async()=>{await fetch(API+`/admin/hours/${h.id}`,{method:'DELETE',headers:headers()});reload()}}>×</button></span>):<span className="muted">Выходной</span>}</div></div>})}</div>}

function Blocks({blocks,reload}:{blocks:any[],reload:()=>void}){const [f,setF]=useState({day:new Date().toISOString().slice(0,10),start:'13:00',end:'15:00',reason:''});const add=async()=>{await fetch(API+'/admin/blocks',{method:'POST',headers:headers(),body:JSON.stringify(f)});reload()};return <div className="card"><h2>Временные блокировки</h2><p>Если нужно отойти, просто заблокируйте часы — клиент их не увидит.</p><input type="date" value={f.day} onChange={e=>setF({...f,day:e.target.value})}/><div className="two"><input type="time" value={f.start} onChange={e=>setF({...f,start:e.target.value})}/><input type="time" value={f.end} onChange={e=>setF({...f,end:e.target.value})}/></div><input placeholder="Причина (необязательно)" value={f.reason} onChange={e=>setF({...f,reason:e.target.value})}/><button className="primary full" onClick={add}>Заблокировать время</button>{blocks.map(b=><div className="row line" key={b.id}><div><b>{b.day}</b><p>{b.start.slice(0,5)}–{b.end.slice(0,5)} {b.reason&&`· ${b.reason}`}</p></div><button className="danger" onClick={async()=>{await fetch(API+`/admin/blocks/${b.id}`,{method:'DELETE',headers:headers()});reload()}}>×</button></div>)}</div>}

function Bookings({
  bookings
}: {
  bookings: any[];
}) {
  const [showForm, setShowForm] = useState(false);

  const [services, setServices] = useState<any[]>([]);
  const [serviceId, setServiceId] = useState('');

  const [day, setDay] = useState(
    new Date().toISOString().slice(0, 10)
  );

  const [slots, setSlots] = useState<string[]>([]);
  const [slotsLoading, setSlotsLoading] = useState(false);

  const [clientName, setClientName] = useState('');
  const [clientPhone, setClientPhone] = useState('');

  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  const [filter, setFilter] = useState<
    'today' | 'upcoming' | 'date' | 'all'
  >('today');

  const [selectedDate, setSelectedDate] = useState(
    new Date().toISOString().slice(0, 10)
  );

  useEffect(() => {
    if (!showForm) return;

    fetch(API + '/admin/services', {
      headers: headers()
    })
      .then(r => r.ok ? r.json() : [])
      .then(data => {
        setServices(data || []);

        if (data?.length && !serviceId) {
          setServiceId(String(data[0].id));
        }
      });
  }, [showForm]);

  const loadSlots = async (
    selectedServiceId: string,
    selectedDay: string
  ) => {
    if (!selectedServiceId) return;

    setSlots([]);
    setSlotsLoading(true);
    setError('');

    try {
      const businessResponse = await fetch(
        API + '/admin/business',
        {
          headers: headers()
        }
      );

      if (!businessResponse.ok) {
        throw new Error(
          'Не удалось получить бизнес'
        );
      }

      const business =
        await businessResponse.json();

      const availabilityResponse = await fetch(
        API +
          `/businesses/${business.id}/availability?service_id=${selectedServiceId}&day=${selectedDay}`
      );

      const data =
        await availabilityResponse.json();

      if (!availabilityResponse.ok) {
        throw new Error(
          data?.detail ||
          'Не удалось загрузить свободное время'
        );
      }

      setSlots(data?.slots || []);

    } catch (e: any) {
      console.error(
        'ADMIN AVAILABILITY ERROR:',
        e
      );

      setSlots([]);

      setError(
        e?.message ||
        'Не удалось загрузить свободное время'
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
    showForm
  ]);

  const createBooking = async (
    start: string
  ) => {
    if (!serviceId) {
      setError('Выберите услугу');
      return;
    }

    if (!clientName.trim()) {
      setError('Введите имя клиента');
      return;
    }

    setSaving(true);
    setError('');

    try {
      const response = await fetch(
        API + '/admin/bookings',
        {
          method: 'POST',
          headers: headers(),
          body: JSON.stringify({
            service_id: Number(serviceId),
            client_name: clientName.trim(),
            client_phone: clientPhone.trim(),
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
          'Не удалось создать запись'
        );
      }

      alert(
        '✅ Запись успешно добавлена'
      );

      setClientName('');
      setClientPhone('');
      setShowForm(false);
      setSlots([]);

      window.location.reload();

    } catch (e: any) {
      console.error(
        'ADMIN CREATE BOOKING ERROR:',
        e
      );

      setError(
        e?.message ||
        'Не удалось создать запись'
      );
    } finally {
      setSaving(false);
    }
  };

  const getTodayTashkent = () => {
    return new Intl.DateTimeFormat(
      'en-CA',
      {
        timeZone: 'Asia/Tashkent',
        year: 'numeric',
        month: '2-digit',
        day: '2-digit'
      }
    ).format(new Date());
  };

  const getNowTashkent = () => {
    return new Intl.DateTimeFormat(
      'sv-SE',
      {
        timeZone: 'Asia/Tashkent',
        year: 'numeric',
        month: '2-digit',
        day: '2-digit',
        hour: '2-digit',
        minute: '2-digit',
        second: '2-digit',
        hour12: false
      }
    ).format(new Date());
  };

  const todayTashkent =
    getTodayTashkent();

  const nowTashkent =
    getNowTashkent();

  const filteredBookings =
    bookings
      .filter(booking => {
        const bookingDateTime =
          `${booking.day} ${booking.start}`;

        if (filter === 'today') {
          return (
            booking.day ===
            todayTashkent
          );
        }

        if (filter === 'upcoming') {
          return (
            bookingDateTime >=
            nowTashkent.slice(0, 16)
          );
        }

        if (filter === 'date') {
          return (
            booking.day ===
            selectedDate
          );
        }

        return true;
      })
      .sort((a, b) => {
        const first =
          `${a.day} ${a.start}`;

        const second =
          `${b.day} ${b.start}`;

        return first.localeCompare(
          second
        );
      });

  return (
    <div>

      <div className="card">
        <div
          style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            gap: 10
          }}
        >
          <h2
            style={{
              margin: 0
            }}
          >
            Записи
          </h2>

          <button
            className="primary"
            onClick={() =>
              setShowForm(!showForm)
            }
          >
            {showForm
              ? 'Закрыть'
              : '+ Добавить запись'}
          </button>
        </div>
      </div>

      <div className="card">

        <div
          style={{
            display: 'flex',
            gap: 8,
            overflowX: 'auto',
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
              setFilter('today')
            }
          >
            Сегодня
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
              setFilter('upcoming')
            }
          >
            Предстоящие
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
              setFilter('date')
            }
          >
            Дата
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
              setFilter('all')
            }
          >
            Все
          </button>
        </div>

        {filter === 'date' && (
          <input
            type="date"
            value={selectedDate}
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
            Новая запись
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
              Выберите услугу
            </option>

            {services.map(service => (
              <option
                key={service.id}
                value={service.id}
              >
                {service.name} ·{' '}
                {service.duration_min} мин
              </option>
            ))}
          </select>

          <input
            type="date"
            min={
              new Date()
                .toISOString()
                .slice(0, 10)
            }
            value={day}
            onChange={e =>
              setDay(
                e.target.value
              )
            }
          />

          <h3>
            Выберите время
          </h3>

          {slotsLoading && (
            <p className="muted">
              Загружаем свободное время...
            </p>
          )}

          {!slotsLoading &&
            !slots.length && (
              <p className="muted">
                Свободного времени нет.
              </p>
            )}

          <div className="slots">
            {slots.map(time => (
              <button
                key={time}
                disabled={saving}
                onClick={() =>
                  createBooking(time)
                }
              >
                {time}
              </button>
            ))}
          </div>

          <h3>
            Данные клиента
          </h3>

          <input
            type="text"
            placeholder="Имя клиента"
            value={clientName}
            onChange={e =>
              setClientName(
                e.target.value
              )
            }
          />

          <input
            type="tel"
            placeholder="Номер телефона"
            value={clientPhone}
            onChange={e =>
              setClientPhone(
                e.target.value
              )
            }
          />

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
            Выберите время выше —
            после этого запись будет создана.
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
              />
            )
          )
        ) : (
          <p>
            Записей в выбранном разделе нет.
          </p>
        )}
      </div>

    </div>
  );
}
function BookingRow({ x }: { x: any }) {
  const [cancelling, setCancelling] = useState(false);

  const getNowTashkent = () => {
    return new Intl.DateTimeFormat(
      'sv-SE',
      {
        timeZone: 'Asia/Tashkent',
        year: 'numeric',
        month: '2-digit',
        day: '2-digit',
        hour: '2-digit',
        minute: '2-digit',
        second: '2-digit',
        hour12: false
      }
    ).format(new Date());
  };

  const nowTashkent =
    getNowTashkent().slice(0, 16);

  const bookingDateTime =
    `${x.day} ${x.start}`;

  const canCancel =
    x.status === 'confirmed' &&
    bookingDateTime > nowTashkent;

  const cancelBooking = async () => {
    if (!canCancel) {
      return;
    }

    const confirmed = window.confirm(
      `Отменить запись клиента ${x.client_name}?`
    );

    if (!confirmed) {
      return;
    }

    setCancelling(true);

    try {
      const response = await fetch(
        API + `/admin/bookings/${x.id}/cancel`,
        {
          method: 'POST',
          headers: headers()
        }
      );

      const data =
        await response.json().catch(() => null);

      if (!response.ok) {
        throw new Error(
          data?.detail ||
          'Не удалось отменить запись'
        );
      }

      alert('✅ Запись отменена');

      window.location.reload();

    } catch (e: any) {
      console.error(
        'ADMIN CANCEL BOOKING ERROR:',
        e
      );

      alert(
        e?.message ||
        'Не удалось отменить запись'
      );
    } finally {
      setCancelling(false);
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
          🕐 {x.start.slice(0, 5)}–
          {x.end.slice(0, 5)}
        </span>

        <span>
          📞 {
            x.client_phone ||
            'номер не передан'
          }
        </span>

        {x.service_name && (
          <span>
            💈 {x.service_name}
          </span>
        )}
      </div>

      <div
        style={{
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'flex-end',
          gap: 8
        }}
      >

        <em>
          {x.status === 'confirmed'
            ? (
              canCancel
                ? 'Подтверждено'
                : 'Завершено'
            )
            : x.status === 'cancelled'
              ? 'Отменено'
              : x.status}
        </em>

        {canCancel && (
          <button
            className="danger"
            disabled={cancelling}
            onClick={cancelBooking}
          >
            {cancelling
              ? 'Отмена...'
              : 'Отменить'}
          </button>
        )}

      </div>

    </div>
  );
}
function Settings({
  business,
  reload
}: {
  business: any;
  reload: () => void;
}) {
  const [name, setName] =
    useState(
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

  const [saving, setSaving] =
    useState(false);

  const [qrDataUrl, setQrDataUrl] =
    useState('');

  const clientLink =
    `https://t.me/${BOT_USERNAME}?startapp=${business.slug}`;

  useEffect(() => {
    const generateQR =
      async () => {
        try {
          const url =
            await QRCode.toDataURL(
              clientLink,
              {
                width: 500,
                margin: 3,
                errorCorrectionLevel:
                  'H'
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
      business?.description ||
      ''
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
  }, [business]);

  const save = async () => {
    setSaving(true);

    try {
      const response =
        await fetch(
          API +
            '/admin/business',
          {
            method: 'PUT',
            headers: headers(),
            body:
              JSON.stringify({
                name:
                  name.trim(),
                description:
                  description.trim(),
                address:
                  address.trim(),
                phone:
                  phone.trim(),
                latitude:
                  latitude === ''
                    ? null
                    : Number(
                        latitude
                      ),
                longitude:
                  longitude === ''
                    ? null
                    : Number(
                        longitude
                      )
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
          'Не удалось сохранить настройки'
        );
      }

      alert(
        '✅ Настройки сохранены'
      );

      reload();

    } catch (e: any) {
      alert(
        e?.message ||
        'Ошибка сохранения'
      );
    } finally {
      setSaving(false);
    }
  };

  const copyLink =
    async () => {
      try {
        await navigator.clipboard.writeText(
          clientLink
        );

        alert(
          '✅ Ссылка скопирована'
        );
      } catch {
        alert(
          clientLink
        );
      }
    };

  const shareTelegram =
    () => {
      const shareUrl =
        `https://t.me/share/url?url=${encodeURIComponent(
          clientLink
        )}&text=${encodeURIComponent(
          business.name
        )}`;

      if (
        tg()?.openTelegramLink
      ) {
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

  const downloadQR =
    () => {
      if (!qrDataUrl) {
        return;
      }

      const link =
        document.createElement(
          'a'
        );

      link.href =
        qrDataUrl;

      link.download =
        `${business.slug}-bookly-qr.png`;

      link.click();
    };

  return (
    <div>

      <div className="card">
        <h2>
          Основная информация
        </h2>

        <input
          placeholder="Название бизнеса"
          value={name}
          onChange={e =>
            setName(
              e.target.value
            )
          }
        />

        <textarea
          placeholder="Описание бизнеса"
          value={description}
          onChange={e =>
            setDescription(
              e.target.value
            )
          }
        />

        <input
          type="tel"
          placeholder="Телефон бизнеса"
          value={phone}
          onChange={e =>
            setPhone(
              e.target.value
            )
          }
        />

        <input
          placeholder="Адрес бизнеса"
          value={address}
          onChange={e =>
            setAddress(
              e.target.value
            )
          }
        />

        <div className="two">
          <input
            placeholder="Широта — необязательно"
            value={latitude}
            onChange={e =>
              setLatitude(
                e.target.value
              )
            }
          />

          <input
            placeholder="Долгота — необязательно"
            value={longitude}
            onChange={e =>
              setLongitude(
                e.target.value
              )
            }
          />
        </div>

        <button
          className="primary full"
          disabled={saving}
          onClick={save}
        >
          {saving
            ? 'Сохранение...'
            : 'Сохранить настройки'}
        </button>
      </div>

      <div className="card">
        <h2>
          Ссылка для клиентов
        </h2>

        <p className="muted">
          Клиенты открывают эту
          ссылку и сразу попадают
          на страницу вашего бизнеса.
        </p>

        <code
          style={{
            display: 'block',
            padding: 12,
            borderRadius: 12,
            wordBreak: 'break-all',
            background: '#f4f4f4'
          }}
        >
          {clientLink}
        </code>

        <div
          style={{
            display: 'flex',
            gap: 8,
            marginTop: 12,
            flexWrap: 'wrap'
          }}
        >
          <button
            onClick={
              copyLink
            }
          >
            Копировать
          </button>

          <button
            className="primary"
            onClick={
              shareTelegram
            }
          >
            Поделиться в Telegram
          </button>
        </div>
      </div>

      <div className="card">
        <h2>
          QR-код
        </h2>

        <p className="muted">
          Клиент может
          отсканировать QR-код
          камерой телефона и
          открыть страницу бизнеса.
        </p>

        {qrDataUrl && (
          <div
            style={{
              display: 'flex',
              justifyContent:
                'center',
              margin:
                '18px 0'
            }}
          >
            <img
              src={qrDataUrl}
              alt="QR код Bookly"
              style={{
                width: 260,
                height: 260,
                borderRadius: 12
              }}
            />
          </div>
        )}

        <button
          className="primary full"
          disabled={!qrDataUrl}
          onClick={
            downloadQR
          }
        >
          Сохранить QR-код
        </button>
      </div>

    </div>
  );
}

function MyBookings() {
  const [items, setItems] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    setLoading(true);

    fetch(API + "/my/bookings", {
      headers: headers(),
    })
      .then((r) => (r.ok ? r.json() : []))
      .then((data) => {
        setItems(Array.isArray(data) ? data : []);
      })
      .catch(() => {
        setItems([]);
      })
      .finally(() => {
        setLoading(false);
      });
  }, []);

  const cancelBooking = async (id: number) => {
    const ok = window.confirm("Отменить эту запись?");

    if (!ok) return;

    try {
      const response = await fetch(API + `/my/bookings/${id}/cancel`, {
        method: "POST",
        headers: {
          ...headers(),
          "Content-Type": "application/json",
        },
      });

      if (!response.ok) {
        alert("Не удалось отменить запись");
        return;
      }

      setItems((prev) =>
        prev.map((item) =>
          item.id === id
            ? { ...item, status: "cancelled" }
            : item
        )
      );
    } catch {
      alert("Ошибка соединения");
    }
  };

  return (
    <div className="page">
      <h1>Мои записи</h1>

      {loading ? (
        <div className="card">
          <p>Загрузка...</p>
        </div>
      ) : items.length === 0 ? (
        <div className="card">
          <p>У вас пока нет записей.</p>
        </div>
      ) : (
        <div>
          {items.map((item) => (
            <div className="card" key={item.id}>
              <h3>{item.business_name || "Запись"}</h3>

              <p>
                {item.service_name || "Услуга"}
              </p>

              <p>
                📅 {item.day}
              </p>

              <p>
                🕐 {item.start?.slice(0, 5)} –{" "}
                {item.end?.slice(0, 5)}
              </p>

              {item.status === "cancelled" ? (
                <p style={{ color: "#888" }}>
                  Запись отменена
                </p>
              ) : (
                <button
                  onClick={() => cancelBooking(item.id)}
                  style={{
                    marginTop: 10,
                    width: "100%",
                    padding: "12px",
                    borderRadius: 12,
                    border: "none",
                    background: "#e53935",
                    color: "white",
                    fontWeight: 600,
                  }}
                >
                  Отменить запись
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
  onBack
}: {
  slug: string;
  onBack: () => void;
}) {
  const [business, setBusiness] =
    useState<any>(null);

  const [services, setServices] =
    useState<any[]>([]);

  const [selected, setSelected] =
    useState<any>(null);

  const [day, setDay] =
    useState(
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

    const load =
      async () => {
        setLoading(true);
        setError('');

        try {
          if (!slug) {
            throw new Error(
              'Ссылка на бизнес не содержит slug.'
            );
          }

          const response =
            await fetch(
              API +
                `/businesses/${encodeURIComponent(
                  slug
                )}`
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
            if (
              response.status ===
              403
            ) {
              throw new Error(
                'Этот бизнес сейчас не активен.'
              );
            }

            if (
              response.status ===
              404
            ) {
              throw new Error(
                'Бизнес не найден. Возможно, ссылка устарела или содержит неправильный slug.'
              );
            }

            throw new Error(
              data?.detail ||
              data?.message ||
              `Ошибка сервера: ${response.status}`
            );
          }

          if (
            !data?.business
          ) {
            throw new Error(
              'Сервер не вернул данные бизнеса.'
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

        } catch (
          e: any
        ) {
          console.error(
            'CLIENT LOAD ERROR:',
            e
          );

          if (!cancelled) {
            setBusiness(null);
            setServices([]);
            setError(
              e?.message ||
              'Не удалось загрузить бизнес'
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
  }, [slug]);

  useEffect(() => {
    const loadSaved =
      async () => {
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
                headers:
                  headers()
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

          setSavedBusinesses(
            list
          );

          setIsSaved(
            list.some(
              (item: any) =>
                item.id ===
                business.id
            )
          );

        } catch {
          setSavedBusinesses([]);
        }
      };

    loadSaved();
  }, [business]);

  const toggleSave =
    async () => {
      if (!business) {
        return;
      }

      if (!initData()) {
        alert(
          'Откройте Bookly через Telegram, чтобы сохранять бизнесы.'
        );
        return;
      }

      setSavingBusiness(
        true
      );

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
            'Не удалось изменить сохранённые бизнесы'
          );
        }

        setIsSaved(
          !isSaved
        );

      } catch (
        e: any
      ) {
        alert(
          e?.message ||
          'Ошибка сохранения'
        );
      } finally {
        setSavingBusiness(
          false
        );
      }
    };

  const loadSlots =
    async (
      service: any,
      selectedDay: string
    ) => {
      if (!business) {
        return;
      }

      setSlots([]);
      setSelectedTime('');
      setSlotsLoading(
        true
      );

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
            'Не удалось загрузить свободное время'
          );
        }

        setSlots(
          data?.slots || []
        );

      } catch (
        e
      ) {
        console.error(
          'AVAILABILITY ERROR:',
          e
        );

        setSlots([]);

      } finally {
        setSlotsLoading(
          false
        );
      }
    };

  const chooseService =
    async (
      service: any
    ) => {
      setSelected(
        service
      );

      setSelectedTime(
        ''
      );

      await loadSlots(
        service,
        day
      );
    };

  const chooseTime =
    (
      time: string
    ) => {
      setSelectedTime(
        time
      );

      setTimeout(
        () => {
          document
            .getElementById(
              'booking-form'
            )
            ?.scrollIntoView({
              behavior:
                'smooth',
              block:
                'start'
            });
        },
        50
      );
    };

  const submitBooking =
    async () => {
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
          'Введите ваше имя.'
        );
        return;
      }

      if (!clientPhone) {
        alert(
          'Введите номер телефона.'
        );
        return;
      }

      setBookingLoading(
        true
      );

      try {
        const response =
          await fetch(
            API + '/bookings',
            {
              method:
                'POST',
              headers:
                headers(),
              body:
                JSON.stringify({
                  business_id:
                    business.id,
                  service_id:
                    selected.id,
                  client_name:
                    name,
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
            'Не удалось забронировать время.'
          );
          return;
        }

        alert(
          '✅ Запись успешно создана!'
        );

        setSelectedTime(
          ''
        );

        await loadSlots(
          selected,
          day
        );

      } catch (
        e
      ) {
        console.error(
          'BOOKING ERROR:',
          e
        );

        alert(
          'Не удалось выполнить бронирование. Попробуйте ещё раз.'
        );

      } finally {
        setBookingLoading(
          false
        );
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
          Загрузка бизнеса...
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
          ← Назад
        </button>

        <h2>
          Не удалось открыть страницу
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
          Повторить
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
          ← Назад
        </button>

        <p>
          Бизнес не найден.
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
        ← Назад
      </button>

      <div className="card">

        <div
          style={{
            display:
              'flex',
            justifyContent:
              'space-between',
            alignItems:
              'flex-start',
            gap: 12
          }}
        >

          <div>
            <h1
              style={{
                marginTop: 0,
                marginBottom: 8
              }}
            >
              {business.name}
            </h1>

            {business.description && (
              <p>
                {
                  business.description
                }
              </p>
            )}
          </div>

          <button
            disabled={
              savingBusiness
            }
            onClick={
              toggleSave
            }
            style={{
              fontSize: 24,
              background:
                'transparent',
              border:
                'none',
              padding: 4
            }}
            title={
              isSaved
                ? 'Удалить из сохранённых'
                : 'Сохранить бизнес'
            }
          >
            {isSaved
              ? '❤️'
              : '🤍'}
          </button>

        </div>

        {business.phone && (
          <p>
            ☎️{' '}
            <a
              href={
                `tel:${business.phone}`
              }
            >
              {
                business.phone
              }
            </a>
          </p>
        )}

        {business.address && (
          <p>
            📍{' '}
            {mapUrl ? (
              <a
                href={mapUrl}
                target="_blank"
                rel="noreferrer"
              >
                {
                  business.address
                }
              </a>
            ) : (
              business.address
            )}
          </p>
        )}

        {mapUrl && (
          <button
            className="full"
            onClick={() => {
              if (
                tg()?.openLink
              ) {
                tg().openLink(
                  mapUrl
                );
              } else {
                window.open(
                  mapUrl,
                  '_blank'
                );
              }
            }}
          >
            📍 Открыть локацию
          </button>
        )}

        <p
          className="muted"
          style={{
            marginBottom: 0
          }}
        >
          Выберите услугу
          ниже, чтобы записаться.
        </p>

      </div>

      <details className="card">
        <summary
          style={{
            cursor:
              'pointer',
            fontWeight:
              600,
            fontSize:
              18
          }}
        >
          📅 Мои записи
        </summary>

        <div
          style={{
            marginTop: 15
          }}
        >
          <MyBookings />
        </div>
      </details>

      <details className="card">
        <summary
          style={{
            cursor:
              'pointer',
            fontWeight:
              600,
            fontSize:
              18
          }}
        >
          ❤️ Сохранённые бизнесы
        </summary>

        <div
          style={{
            marginTop: 15
          }}
        >
          {savedBusinesses.length ===
          0 ? (
            <p className="muted">
              Пока нет сохранённых
              бизнесов.
            </p>
          ) : (
            savedBusinesses.map(
              item => (
                <div
                  key={
                    item.id
                  }
                  className="card row"
                >
                  <div>
                    <b>
                      {
                        item.name
                      }
                    </b>

                    {item.address && (
                      <p
                        className="muted"
                        style={{
                          margin:
                            '4px 0 0'
                        }}
                      >
                        📍{' '}
                        {
                          item.address
                        }
                      </p>
                    )}
                  </div>

                  <button
                    className="primary"
                    onClick={() =>
                      window.location.href =
                        `?startapp=${encodeURIComponent(
                          item.slug
                        )}`
                    }
                  >
                    Открыть
                  </button>
                </div>
              )
            )
          )}
        </div>
      </details>

      <h2>
        Услуги
      </h2>

      {services.length ===
      0 ? (
        <div className="card">
          <p>
            У этого бизнеса
            пока нет доступных
            услуг.
          </p>
        </div>
      ) : (
        services.map(
          service => (
            <div
              className={
                `card row ${
                  selected?.id ===
                  service.id
                    ? 'selected'
                    : ''
                }`
              }
              key={
                service.id
              }
            >

              <div>
                <b>
                  {
                    service.name
                  }
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
                  мин
                </p>
              </div>

              <button
                onClick={() =>
                  chooseService(
                    service
                  )
                }
              >
                Выбрать
              </button>

            </div>
          )
        )
      )}

      {selected && (
        <>

          <div className="card">
            <h2>
              Дата
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

                setDay(
                  newDay
                );

                setSelectedTime(
                  ''
                );

                await loadSlots(
                  selected,
                  newDay
                );
              }}
            />
          </div>

          <div className="card">
            <h2>
              Время
            </h2>

            {slotsLoading ? (
              <p className="muted">
                ⏳ Загружаем свободное время...
              </p>
            ) : slots.length >
              0 ? (
              <div className="slots">
                {slots.map(
                  time => (
                    <button
                      key={
                        time
                      }
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
                На эту дату
                свободных мест нет.
              </p>
            )}
          </div>

          {selectedTime && (
            <div
              id="booking-form"
              className="card"
            >

              <h2>
                Ваши данные
              </h2>

              <div className="success">
                <b>
                  {
                    selected.name
                  }
                </b>

                <br />

                {day}
                {' · '}
                {
                  selectedTime
                }
              </div>

              <input
                type="text"
                placeholder="Ваше имя"
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
                placeholder="Номер телефона"
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
                  ? 'Бронируем...'
                  : 'Подтвердить запись'}
              </button>

            </div>
          )}

        </>
      )}

    </section>
  );
}

createRoot(document.getElementById('root')!).render(<App/>);
