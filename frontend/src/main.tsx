import React,{useEffect,useMemo,useState} from 'react';
import {createRoot} from 'react-dom/client';
import './style.css';

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
   tg()?.ready();tg()?.expand();
   const startParam=tg()?.initDataUnsafe?.start_param || new URLSearchParams(window.location.search).get('startapp') || '';
   if(startParam){setClientSlug(startParam);setMode('client');}
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

const load=async()=>{
  if(!initData()){
    setLoading(false);
    return;
  }

  try {
    const [b,s,h,bl,bo]=await Promise.all(
      ['/admin/business','/admin/services','/admin/hours','/admin/blocks','/admin/bookings']
        .map(x =>
          fetch(API+x,{headers:headers()})
            .then(r=>r.json())
        )
    );

    setBusiness(b);
    setServices(s||[]);
    setHours(h||[]);
    setBlocks(bl||[]);
    setBookings(bo||[]);
  } catch(e) {
    console.error(e);
  } finally {
    setLoading(false);
  }
};

useEffect(()=>{
  load();
},[]);(()=>{load()},[]);

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

function BusinessForm({onSaved}:{onSaved:()=>void}){const [f,setF]=useState({name:'',description:'',address:'',latitude:'',longitude:''});const save=async()=>{const r=await fetch(API+'/admin/business',{method:'PUT',headers:headers(),body:JSON.stringify({...f,latitude:f.latitude?Number(f.latitude):null,longitude:f.longitude?Number(f.longitude):null})});if(r.ok)onSaved();};return <div className="card"><h2>Создайте бизнес</h2><p>Эти данные увидят ваши клиенты.</p><input placeholder="Название компании" value={f.name} onChange={e=>setF({...f,name:e.target.value})}/><textarea placeholder="Описание" value={f.description} onChange={e=>setF({...f,description:e.target.value})}/><input placeholder="Адрес" value={f.address} onChange={e=>setF({...f,address:e.target.value})}/><div className="two"><input placeholder="Широта" value={f.latitude} onChange={e=>setF({...f,latitude:e.target.value})}/><input placeholder="Долгота" value={f.longitude} onChange={e=>setF({...f,longitude:e.target.value})}/></div><button className="primary full" onClick={save} disabled={!f.name}>Создать бизнес</button></div>}

function Dashboard({bookings,business}:{bookings:any[],business:any}){const today=new Date().toISOString().slice(0,10);const b=bookings.filter(x=>x.day===today&&x.status==='confirmed');return <><div className="grid3"><Stat n={b.length} t="Сегодня"/><Stat n={bookings.filter(x=>x.status==='confirmed').length} t="Всего записей"/><Stat n={business.subscription_active?'✓':'—'} t="Подписка"/></div><div className="card"><h3>Сегодня</h3>{b.length?b.map(x=><BookingRow x={x} key={x.id}/>):<p>Записей пока нет.</p>}</div><Subscription/></>}
function Stat({n,t}:{n:any,t:string}){return <div className="stat"><strong>{n}</strong><span>{t}</span></div>}
function Subscription(){return <div className="card subscription"><div className="subscription-head"><div><h3>Bookly Pro</h3><p><b>$9.99 / месяц</b></p></div><span className="pill">Monthly</span></div><ul><li>Неограниченные записи</li><li>Ссылка для клиентов</li><li>Уведомления в Telegram</li><li>Расписание и блокировки</li></ul><p className="muted">Выберите способ оплаты.</p><div className="two"><button onClick={()=>checkout('uzum')}>🇺🇿 Uzum</button><button onClick={()=>checkout('lemonsqueezy')}>🌍 Lemon Squeezy</button></div></div>}
async function checkout(provider:string){const r=await fetch(API+`/payments/checkout/${provider}`,{method:'POST',headers:headers()});const d=await r.json();if(d.url){if(tg()?.openLink) tg().openLink(d.url); else window.open(d.url,'_blank');} else alert(provider==='lemonsqueezy'?'Lemon Squeezy ещё не настроен: нужны API key, Store ID и Variant ID.':'Uzum ещё не настроен: нужны merchant credentials.')}

function Services({services,reload}:{services:any[],reload:()=>void}){const [f,setF]=useState({name:'',description:'',price:'',currency:'UZS',duration_min:'30'});const add=async()=>{const r=await fetch(API+'/admin/services',{method:'POST',headers:headers(),body:JSON.stringify({...f,price:Number(f.price),duration_min:Number(f.duration_min)})});if(r.ok){setF({name:'',description:'',price:'',currency:'UZS',duration_min:'30'});reload()}};return <div><div className="card"><h2>Добавить услугу</h2><input placeholder="Название" value={f.name} onChange={e=>setF({...f,name:e.target.value})}/><input placeholder="Описание" value={f.description} onChange={e=>setF({...f,description:e.target.value})}/><div className="two"><input type="number" placeholder="Цена" value={f.price} onChange={e=>setF({...f,price:e.target.value})}/><input type="number" placeholder="Минуты" value={f.duration_min} onChange={e=>setF({...f,duration_min:e.target.value})}/></div><button className="primary full" onClick={add}>+ Добавить услугу</button></div>{services.map(s=><div className="card row" key={s.id}><div><b>{s.name}</b><p>{money(s.price,s.currency)} · {s.duration_min} мин</p></div><button className="danger" onClick={async()=>{await fetch(API+`/admin/services/${s.id}`,{method:'DELETE',headers:headers()});reload()}}>Удалить</button></div>)}</div>}

function Hours({hours,reload}:{hours:any[],reload:()=>void}){const [f,setF]=useState({weekday:'0',start:'09:00',end:'18:00'});const add=async()=>{await fetch(API+'/admin/hours',{method:'POST',headers:headers(),body:JSON.stringify({...f,weekday:Number(f.weekday)})});reload()};return <div className="card"><h2>Рабочий график</h2><p>Настройте обычные рабочие часы. Потом отдельные часы можно блокировать.</p><div className="two"><select value={f.weekday} onChange={e=>setF({...f,weekday:e.target.value})}>{days.map((x,i)=><option value={i} key={x}>{x}</option>)}</select><span></span></div><div className="two"><input type="time" value={f.start} onChange={e=>setF({...f,start:e.target.value})}/><input type="time" value={f.end} onChange={e=>setF({...f,end:e.target.value})}/></div><button className="primary full" onClick={add}>Добавить интервал</button>{days.map((d,i)=>{const hs=hours.filter(h=>h.weekday===i);return <div className="dayrow" key={d}><b>{d}</b><div>{hs.length?hs.map(h=><span className="tag" key={h.id}>{h.start.slice(0,5)}–{h.end.slice(0,5)} <button onClick={async()=>{await fetch(API+`/admin/hours/${h.id}`,{method:'DELETE',headers:headers()});reload()}}>×</button></span>):<span className="muted">Выходной</span>}</div></div>})}</div>}

function Blocks({blocks,reload}:{blocks:any[],reload:()=>void}){const [f,setF]=useState({day:new Date().toISOString().slice(0,10),start:'13:00',end:'15:00',reason:''});const add=async()=>{await fetch(API+'/admin/blocks',{method:'POST',headers:headers(),body:JSON.stringify(f)});reload()};return <div className="card"><h2>Временные блокировки</h2><p>Если нужно отойти, просто заблокируйте часы — клиент их не увидит.</p><input type="date" value={f.day} onChange={e=>setF({...f,day:e.target.value})}/><div className="two"><input type="time" value={f.start} onChange={e=>setF({...f,start:e.target.value})}/><input type="time" value={f.end} onChange={e=>setF({...f,end:e.target.value})}/></div><input placeholder="Причина (необязательно)" value={f.reason} onChange={e=>setF({...f,reason:e.target.value})}/><button className="primary full" onClick={add}>Заблокировать время</button>{blocks.map(b=><div className="row line" key={b.id}><div><b>{b.day}</b><p>{b.start.slice(0,5)}–{b.end.slice(0,5)} {b.reason&&`· ${b.reason}`}</p></div><button className="danger" onClick={async()=>{await fetch(API+`/admin/blocks/${b.id}`,{method:'DELETE',headers:headers()});reload()}}>×</button></div>)}</div>}

function Bookings({bookings}:{bookings:any[]}){return <div className="card"><h2>Записи</h2>{bookings.length?bookings.map(x=><BookingRow x={x} key={x.id}/>):<p>Пока нет записей.</p>}</div>}
function BookingRow({x}:{x:any}){return <div className="booking"><div><b>{x.client_name}</b><span>{x.day} · {x.start.slice(0,5)}–{x.end.slice(0,5)}</span><span>📞 {x.client_phone||'номер не передан'}</span></div><em>{x.status}</em></div>}
function Settings({business,reload}:{business:any,reload:()=>void}){const [f,setF]=useState({name:business.name,description:business.description||'',address:business.address||'',latitude:business.latitude||'',longitude:business.longitude||''});const save=async()=>{await fetch(API+'/admin/business',{method:'PUT',headers:headers(),body:JSON.stringify({...f,latitude:f.latitude?Number(f.latitude):null,longitude:f.longitude?Number(f.longitude):null})});reload()};return <div className="card"><h2>Настройки бизнеса</h2><input value={f.name} onChange={e=>setF({...f,name:e.target.value})}/><textarea value={f.description} onChange={e=>setF({...f,description:e.target.value})}/><input value={f.address} onChange={e=>setF({...f,address:e.target.value})}/><div className="two"><input placeholder="Широта" value={f.latitude} onChange={e=>setF({...f,latitude:e.target.value})}/><input placeholder="Долгота" value={f.longitude} onChange={e=>setF({...f,longitude:e.target.value})}/></div><button className="primary full" onClick={save}>Сохранить</button><div className="share"><b>Ссылка клиента</b><code>{`https://t.me/${BOT_USERNAME}?startapp=${business.slug}`}</code><button onClick={()=>navigator.clipboard?.writeText(`https://t.me/${BOT_USERNAME}?startapp=${business.slug}`)}>Копировать</button></div></div>}

function MyBookings(){const [items,setItems]=useState<any[]>([]);useEffect(()=>{fetch(API+'/my/bookings',{headers:headers()}).then(r=>r.ok?r.json():[]).then(setItems)},[]);return <div className="card"><h2>Мои записи</h2>{items.length?items.map(x=><div className="booking" key={x.id}><div><b>{x.day}</b><span>{x.start.slice(0,5)}–{x.end.slice(0,5)}</span></div><em>{x.status==='confirmed'?'Подтверждено':'Отменено'}</em></div>):<p>У вас пока нет записей.</p>}</div>}

function Client({slug,onBack}:{slug:string,onBack:()=>void}){const [business,setBusiness]=useState<any>(null);const [services,setServices]=useState<any[]>([]);const [selected,setSelected]=useState<any>(null);const [day,setDay]=useState(new Date().toISOString().slice(0,10));const [slots,setSlots]=useState<string[]>([]);const [phone,setPhone]=useState('');
 useEffect(()=>{fetch(API+`/businesses/${slug}`).then(r=>r.ok?r.json():null).then(d=>{if(d){setBusiness(d.business);setServices(d.services)}})},[slug]);
 const choose=async(s:any)=>{setSelected(s);const r=await fetch(API+`/businesses/${business.id}/availability?service_id=${s.id}&day=${day}`);setSlots((await r.json()).slots||[])};
 const book=async(start:string)=>{const u=tg()?.initDataUnsafe?.user||{};const r=await fetch(API+'/bookings',{method:'POST',headers:headers(),body:JSON.stringify({business_id:business.id,service_id:selected.id,client_phone:phone,day,start})});if(r.ok){alert('✅ Бронирование подтверждено');choose(selected)}else alert((await r.json()).detail||'Не удалось забронировать')};
 if(!business)return <div className="card"><button className="back" onClick={onBack}>← Назад</button><p>Загрузка...</p></div>;
 return <section><button className="back" onClick={onBack}>← Назад</button><div className="client-hero"><h1>{business.name}</h1><p>{business.description}</p><p>📍 {business.address}</p></div><h2>Услуги</h2>{services.map(s=><div className={`card row ${selected?.id===s.id?'selected':''}`} key={s.id}><div><b>{s.name}</b><p>{money(s.price,s.currency)} · {s.duration_min} мин</p></div><button onClick={()=>choose(s)}>Выбрать</button></div>)}{selected&&<div className="card"><h2>{selected.name}</h2><input type="date" min={new Date().toISOString().slice(0,10)} value={day} onChange={e=>{setDay(e.target.value);setTimeout(()=>choose(selected),0)}}/><p>Номер нужен, чтобы администратор мог связаться с вами по записи.</p><button className="ghost full" onClick={()=>tg()?.requestContact?.((contact:any)=>setPhone(contact?.phone_number||''))}>📱 Поделиться номером</button>{phone&&<p className="success">✓ Номер получен</p>}<div className="slots">{slots.map(x=><button key={x} onClick={()=>book(x)}>{x}</button>)}</div>{!slots.length&&<p>На эту дату свободных мест нет.</p>}</div>}</section>}

createRoot(document.getElementById('root')!).render(<App/>);
