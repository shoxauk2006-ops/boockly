import React,{useEffect,useMemo,useState} from 'react';
import {createRoot} from 'react-dom/client';
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
const headers=()=>({'Content-Type':'application/json','X-Telegram-Init-Data':initData()});
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

     window.Paddle.Environment.set('sandbox');

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

 const openClient=()=>{
   const slug=clientSlug.trim();
   if(slug) setMode('client');
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

function Home(p:any){return <section>
 <div className="hero"><div className="logo">B</div><h1>Бронирование без звонков</h1><p>Bookly помогает бизнесу принимать записи прямо в Telegram.</p></div>
 <button className="primary full" onClick={p.onAdmin}>Открыть админ-панель</button>
 <div className="card"><h3>Открыть страницу бизнеса</h3><input placeholder="Ссылка / slug бизнеса" value={p.slug} onChange={e=>p.setSlug(e.target.value)}/><button className="full" onClick={p.open}>Открыть</button></div>
 </section>}

function Admin({
  onBack,
  initialTab
}:{
  onBack:()=>void;
  initialTab:string;
}){
 const [tab,setTab]=useState('home'); 
 useEffect(()=>{
  setTab(initialTab);
},[initialTab]);
 const [business,setBusiness]=useState<any>(null);
 const [services,setServices]=useState<any[]>([]);const [hours,setHours]=useState<any[]>([]);const [blocks,setBlocks]=useState<any[]>([]);const [bookings,setBookings]=useState<any[]>([]); const [loading,setLoading]=useState(true);

const load = async () => {
  if (!initData()) {
    setLoading(false);
    return;
  }

  try {
    // Сначала получаем существующий бизнес
    const businessResponse = await fetch(API + '/admin/business', {
      headers: headers()
    });

    if (!businessResponse.ok) {
      throw new Error(`Business request failed: ${businessResponse.status}`);
    }

    const b = await businessResponse.json();

    // Сразу сохраняем бизнес и убираем экран загрузки
    setBusiness(b);
    setLoading(false);

    // Остальные данные загружаем отдельно
    const results = await Promise.allSettled([
      fetch(API + '/admin/services', {
        headers: headers()
      }).then(r => r.ok ? r.json() : []),

      fetch(API + '/admin/hours', {
        headers: headers()
      }).then(r => r.ok ? r.json() : []),

      fetch(API + '/admin/blocks', {
        headers: headers()
      }).then(r => r.ok ? r.json() : []),

      fetch(API + '/admin/bookings', {
        headers: headers()
      }).then(r => r.ok ? r.json() : [])
    ]);

    const [servicesResult, hoursResult, blocksResult, bookingsResult] = results;

    if (servicesResult.status === 'fulfilled') {
      setServices(servicesResult.value || []);
    }

    if (hoursResult.status === 'fulfilled') {
      setHours(hoursResult.value || []);
    }

    if (blocksResult.status === 'fulfilled') {
      setBlocks(blocksResult.value || []);
    }

    if (bookingsResult.status === 'fulfilled') {
      setBookings(bookingsResult.value || []);
    }

  } catch (e) {
    console.error('Bookly load error:', e);
    setLoading(false);
  }
};

useEffect(() => {
  load();

  const refreshOnReturn = () => {
    load();
  };

  window.addEventListener('focus', refreshOnReturn);
  document.addEventListener('visibilitychange', refreshOnReturn);

  return () => {
    window.removeEventListener('focus', refreshOnReturn);
    document.removeEventListener('visibilitychange', refreshOnReturn);
  };
}, []);

if(loading){
  return <div className="loading-screen">
    <div className="loading-logo">B</div>
    <h2>Bookly</h2>
    <div className="loading-spinner"></div>
    <p>Загрузка...</p>
  </div>;
}

if(!initData())return <div className="card"><button className="back" onClick={onBack}>← Назад</button><h2>Откройте Bookly из Telegram</h2><p>Админ-панель работает внутри Telegram Mini App.</p></div>;
 return <section><button className="back" onClick={onBack}>← Назад</button>
  {!business&&<BusinessForm onSaved={load}/>} 
  {business&&<>
   <div className="business-head"><div><h1>{business.name}</h1><p>{business.address||'Адрес не указан'}</p></div><span className={business.subscription_active?'pill ok':'pill'}>{business.subscription_active?'Активен':'Не активирован'}</span></div>
   <nav className="tabs">{[['home','Главная'],['services','Услуги'],['hours','График'],['blocks','Блокировки'],['bookings','Записи'],['settings','Настройки']].map(([k,v])=><button className={tab===k?'active':''} onClick={()=>setTab(k)} key={k}>{v}</button>)}</nav>
   {tab==='home'&&<Dashboard bookings={bookings} business={business}/>} 
   {tab==='services'&&<Services services={services} reload={load}/>} 
   {tab==='hours'&&<Hours hours={hours} reload={load}/>} 
   {tab==='blocks'&&<Blocks blocks={blocks} reload={load}/>} 
   {tab==='bookings'&&<Bookings bookings={bookings}/>} 
   {tab==='settings'&&<Settings business={business} reload={load}/>} 
  </>}
 </section>
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
  onClick={()=>checkout('paddle')}
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
function checkout(provider:string){
  if(provider !== 'paddle'){
    return;
  }
  if(!window.Paddle){
    alert('Paddle ещё загружается. Попробуйте ещё раз.');
    return;
  }
  const ownerId = tg()?.initDataUnsafe?.user?.id;
  if(!ownerId){
    alert('Не удалось определить пользователя Telegram.');
    return;
  }
  window.Paddle.Checkout.open({
    items: [
      { priceId: 'pri_01kzwxx7zeytn8sqxfvpt0a8ys', quantity: 1 }
    ],
    customData: {
      telegram_user_id: String(ownerId)
    }
  });
}

function Services({
  services,
  reload
}: {
  services: any[];
  reload: () => void;
}) {
  const [f, setF] = useState({
    name: '',
    description: '',
    price: '',
    currency: 'UZS',
    duration_min: '30'
  });

  const [currencySearch, setCurrencySearch] =
    useState('');

  const getCurrencyCodes = () => {
    const intlAny = Intl as any;

    if (
      typeof intlAny.supportedValuesOf === 'function'
    ) {
      return intlAny.supportedValuesOf(
        'currency'
      );
    }

    return [
      'AED',
      'AFN',
      'ALL',
      'AMD',
      'ARS',
      'AUD',
      'AZN',
      'BAM',
      'BDT',
      'BGN',
      'BHD',
      'BND',
      'BOB',
      'BRL',
      'BYN',
      'CAD',
      'CHF',
      'CLP',
      'CNY',
      'COP',
      'CRC',
      'CZK',
      'DKK',
      'DOP',
      'DZD',
      'EGP',
      'EUR',
      'GBP',
      'GEL',
      'GHS',
      'HKD',
      'HNL',
      'HRK',
      'HUF',
      'IDR',
      'ILS',
      'INR',
      'IQD',
      'ISK',
      'JOD',
      'JPY',
      'KES',
      'KGS',
      'KHR',
      'KRW',
      'KWD',
      'KZT',
      'LAK',
      'LBP',
      'LKR',
      'MAD',
      'MDL',
      'MGA',
      'MKD',
      'MMK',
      'MNT',
      'MOP',
      'MRU',
      'MUR',
      'MXN',
      'MYR',
      'MZN',
      'NAD',
      'NGN',
      'NIO',
      'NOK',
      'NPR',
      'NZD',
      'OMR',
      'PAB',
      'PEN',
      'PHP',
      'PKR',
      'PLN',
      'PYG',
      'QAR',
      'RON',
      'RSD',
      'RUB',
      'SAR',
      'SEK',
      'SGD',
      'SLL',
      'SOS',
      'SRD',
      'STN',
      'SYP',
      'THB',
      'TJS',
      'TMT',
      'TND',
      'TOP',
      'TRY',
      'TTD',
      'TWD',
      'TZS',
      'UAH',
      'UGX',
      'USD',
      'UYU',
      'UZS',
      'VES',
      'VND',
      'XAF',
      'XCD',
      'XOF',
      'XPF',
      'YER',
      'ZAR',
      'ZMW'
    ];
  };

  const currencyCodes = getCurrencyCodes();

  const getCurrencyName = (
    code: string
  ) => {
    try {
      const DisplayNames =
        (Intl as any).DisplayNames;

      if (DisplayNames) {
        const names = new DisplayNames(
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
    } catch {
      // fallback below
    }

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
            currencyDisplay: 'narrowSymbol'
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
    currencyCodes
      .map(code => ({
        code,
        name: getCurrencyName(code),
        symbol:
          getCurrencySymbol(code)
      }))
      .filter(currency => {
        const q =
          currencySearch
            .trim()
            .toLowerCase();

        if (!q) {
          return true;
        }

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

  const add = async () => {
    const serviceName =
      f.name.trim();

    if (!serviceName) {
      alert(
        'Введите название услуги'
      );
      return;
    }

    const price =
      Number(f.price);

    if (
      !Number.isFinite(price) ||
      price < 0
    ) {
      alert(
        'Введите корректную цену'
      );
      return;
    }

    const duration =
      Number(f.duration_min);

    if (
      !Number.isInteger(duration) ||
      duration <= 0 ||
      duration > 480
    ) {
      alert(
        'Длительность должна быть от 1 до 480 минут'
      );
      return;
    }

    const response =
      await fetch(
        API +
          '/admin/services',
        {
          method: 'POST',
          headers: headers(),
          body: JSON.stringify({
            name: serviceName,
            description:
              f.description.trim(),
            price,
            currency:
              f.currency,
            duration_min:
              duration
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
        'Не удалось добавить услугу'
      );
      return;
    }

    setF({
      name: '',
      description: '',
      price: '',
      currency: 'UZS',
      duration_min: '30'
    });

    setCurrencySearch('');

    reload();
  };

  const remove = async (
    id: number
  ) => {
    const confirmed =
      window.confirm(
        'Удалить эту услугу?'
      );

    if (!confirmed) {
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
          Добавить услугу
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
          {currencyOptions.length ? (
            currencyOptions.map(
              currency => (
                <option
                  key={
                    currency.code
                  }
                  value={
                    currency.code
                  }
                >
                  {currency.code}{' '}
                  —{' '}
                  {currency.name}{' '}
                  ({currency.symbol})
                </option>
              )
            )
          ) : (
            <option value="UZS">
              UZS — Uzbekistani so'm
            </option>
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

        <button
          className="primary full"
          onClick={add}
        >
          + Добавить услугу
        </button>

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
function Settings({business,reload}:{business:any,reload:()=>void}){const [f,setF]=useState({name:business.name,description:business.description||'',address:business.address||'',latitude:business.latitude||'',longitude:business.longitude||''});const save=async()=>{await fetch(API+'/admin/business',{method:'PUT',headers:headers(),body:JSON.stringify({...f,latitude:f.latitude?Number(f.latitude):null,longitude:f.longitude?Number(f.longitude):null})});reload()};return <div className="card"><h2>Настройки бизнеса</h2><input value={f.name} onChange={e=>setF({...f,name:e.target.value})}/><textarea value={f.description} onChange={e=>setF({...f,description:e.target.value})}/><input value={f.address} onChange={e=>setF({...f,address:e.target.value})}/><div className="two"><input placeholder="Широта" value={f.latitude} onChange={e=>setF({...f,latitude:e.target.value})}/><input placeholder="Долгота" value={f.longitude} onChange={e=>setF({...f,longitude:e.target.value})}/></div><button className="primary full" onClick={save}>Сохранить</button><div className="share"><b>Ссылка клиента</b><code>{`https://t.me/${BOT_USERNAME}?startapp=${business.slug}`}</code><button onClick={()=>navigator.clipboard?.writeText(`https://t.me/${BOT_USERNAME}?startapp=${business.slug}`)}>Копировать</button></div></div>}

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
  const [business, setBusiness] = useState<any>(null);
  const [services, setServices] = useState<any[]>([]);
  const [selected, setSelected] = useState<any>(null);

  const [day, setDay] = useState(
    new Date().toISOString().slice(0, 10)
  );

  const [slots, setSlots] = useState<string[]>([]);
  const [selectedTime, setSelectedTime] = useState('');
  const [slotsLoading, setSlotsLoading] = useState(false);

  const [clientName, setClientName] = useState(
    tg()?.initDataUnsafe?.user?.first_name || ''
  );
  const [phone, setPhone] = useState('');

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [bookingLoading, setBookingLoading] = useState(false);

  useEffect(() => {
    let cancelled = false;

    const load = async () => {
      setLoading(true);
      setError('');

      try {
        if (!slug) {
          throw new Error('Ссылка на бизнес не содержит slug.');
        }

        const response = await fetch(
          API + `/businesses/${encodeURIComponent(slug)}`
        );

        const text = await response.text();

        let data: any = null;

        try {
          data = text ? JSON.parse(text) : null;
        } catch {
          data = null;
        }

        if (!response.ok) {
          if (response.status === 403) {
            throw new Error(
              'Этот бизнес сейчас не активен. Владелец должен активировать подписку Bookly.'
            );
          }

          if (response.status === 404) {
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

        if (!data?.business) {
          throw new Error('Сервер не вернул данные бизнеса.');
        }

        if (!cancelled) {
          setBusiness(data.business);
          setServices(data.services || []);
        }
      } catch (e: any) {
        console.error('CLIENT LOAD ERROR:', e);

        if (!cancelled) {
          setBusiness(null);
          setServices([]);
          setError(e?.message || 'Не удалось загрузить бизнес');
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

 const loadSlots = async (
  service: any,
  selectedDay: string
) => {
  if (!business) return;

  setSlots([]);
  setSelectedTime('');
  setSlotsLoading(true);

  try {
    const response = await fetch(
      API +
        `/businesses/${business.id}/availability?service_id=${service.id}&day=${selectedDay}`
    );

    const data = await response.json();

    if (!response.ok) {
      throw new Error(
        data?.detail || 'Не удалось загрузить свободное время'
      );
    }

    setSlots(data?.slots || []);
  } catch (e) {
    console.error('AVAILABILITY ERROR:', e);
    setSlots([]);
  } finally {
    setSlotsLoading(false);
  }
};
  const chooseService = async (service: any) => {
    setSelected(service);
    setSelectedTime('');
    await loadSlots(service, day);
  };

  const chooseTime = (time: string) => {
    setSelectedTime(time);

    // Прокручиваем к форме данных клиента
    setTimeout(() => {
      document
        .getElementById('booking-form')
        ?.scrollIntoView({
          behavior: 'smooth',
          block: 'start'
        });
    }, 50);
  };

  const submitBooking = async () => {
    if (!business || !selected || !selectedTime) {
      return;
    }

    const name = clientName.trim();
    const clientPhone = phone.trim();

    if (!name) {
      alert('Введите ваше имя.');
      return;
    }

    if (!clientPhone) {
      alert('Введите номер телефона.');
      return;
    }

    setBookingLoading(true);

    try {
      const response = await fetch(API + '/bookings', {
        method: 'POST',
        headers: headers(),
        body: JSON.stringify({
          business_id: business.id,
          service_id: selected.id,
          client_name: name,
          client_phone: clientPhone,
          day,
          start: selectedTime
        })
      });

      const data = await response.json();

      if (!response.ok) {
        alert(
          data?.detail ||
          'Не удалось забронировать время.'
        );
        return;
      }

      alert('✅ Запись успешно создана!');

      // Сбрасываем выбранное время и обновляем свободные слоты
      setSelectedTime('');

      await loadSlots(selected, day);

    } catch (e) {
      console.error('BOOKING ERROR:', e);

      alert(
        'Не удалось выполнить бронирование. Попробуйте ещё раз.'
      );
    } finally {
      setBookingLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="loading-screen">
        <div className="loading-logo">B</div>
        <h2>Bookly</h2>
        <div className="loading-spinner"></div>
        <p>Загрузка бизнеса...</p>
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

        <h2>Не удалось открыть страницу</h2>

        <p className="error">
          ❌ {error}
        </p>

        <button
          className="primary full"
          onClick={() => window.location.reload()}
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

        <p>Бизнес не найден.</p>
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

      <div className="client-hero">
        <h1>{business.name}</h1>

        {business.description && (
          <p>{business.description}</p>
        )}

        {business.address && (
          <p>📍 {business.address}</p>
        )}
     
      </div>
      <details className="card">
     <summary
    style={{
      cursor: 'pointer',
      fontWeight: 600,
      fontSize: 18
    }}
  >
    📅 Мои записи
  </summary>

  <div style={{ marginTop: 15 }}>
    <MyBookings />
  </div>
</details>

      <h2>1. Выберите услугу</h2>

      {services.length === 0 ? (
        <div className="card">
          <p>
            У этого бизнеса пока нет доступных услуг.
          </p>
        </div>
      ) : (
        services.map(service => (
          <div
            className={`card row ${
              selected?.id === service.id
                ? 'selected'
                : ''
            }`}
            key={service.id}
          >
            <div>
              <b>{service.name}</b>

              {service.description && (
                <p>{service.description}</p>
              )}

              <p>
                {money(
                  service.price,
                  service.currency
                )}{' '}
                · {service.duration_min} мин
              </p>
            </div>

            <button
              onClick={() =>
                chooseService(service)
              }
            >
              Выбрать
            </button>
          </div>
        ))
      )}

      {selected && (
        <>
          <div className="card">
            <h2>2. Выберите дату</h2>

            <input
              type="date"
              min={
                new Date()
                  .toISOString()
                  .slice(0, 10)
              }
              value={day}
              onChange={async e => {
                const newDay = e.target.value;

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
            <h2>3. Выберите время</h2>

          {slotsLoading ? (
  <p className="muted">
    ⏳ Загружаем свободное время...
  </p>
) : slots.length > 0 ? (
  <div className="slots">
    {slots.map(time => (
      <button
        key={time}
        className={
          selectedTime === time
            ? 'selected'
            : ''
        }
        onClick={() => chooseTime(time)}
      >
        {time}
      </button>
    ))}
  </div>
) : (
  <p>
    На эту дату свободных мест нет.
  </p>
)}
          </div>

          {selectedTime && (
            <div
              id="booking-form"
              className="card"
            >
              <h2>4. Ваши данные</h2>

              <p className="muted">
                Вы выбрали:
              </p>

              <div className="success">
                <b>{selected.name}</b>
                <br />
                {day} · {selectedTime}
              </div>

              <input
                type="text"
                placeholder="Ваше имя"
                value={clientName}
                onChange={e =>
                  setClientName(e.target.value)
                }
              />

              <input
                type="tel"
                placeholder="Номер телефона"
                value={phone}
                onChange={e =>
                  setPhone(e.target.value)
                }
              />


              <button
                className="primary full"
                disabled={bookingLoading}
                onClick={submitBooking}
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
