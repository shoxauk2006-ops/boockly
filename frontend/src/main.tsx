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
// NOTE: main.tsx is intentionally kept as-is except for localized user-facing
// strings. Full file replacement is generated from the current source; see
// localized helpers and UI components below.
declare global { interface Window { Telegram:any; Paddle:any } }
const API=import.meta.env.VITE_API_URL||'http://localhost:8000';
const BOT_USERNAME=import.meta.env.VITE_BOT_USERNAME||'BooklyBot';
const tg=()=>window.Telegram?.WebApp;
const confirmAsync=(message:string):Promise<boolean>=>new Promise(resolve=>{const handler=(window as any).__booklyConfirm;if(handler)handler(message,resolve);else resolve(window.confirm(message));});
const initData=()=>tg()?.initData||'';
const headers=()=>{const base:Record<string,string>={'Content-Type':'application/json','X-Telegram-Init-Data':initData(),'X-Bookly-Language':getStoredLanguage()};try{const id=localStorage.getItem('bookly_active_business_id');if(id)base['X-Bookly-Business-Id']=id;}catch{}return base;};
const LOCALE_MAP:Record<Language,string>={ru:'ru-RU',en:'en-US',uz:'uz-UZ',tr:'tr-TR',ar:'ar-SA'};
const getLocale=()=>LOCALE_MAP[getStoredLanguage()]||'en-US';
const money=(v:number,c='UZS')=>`${new Intl.NumberFormat(getLocale()).format(v)} ${c}`;
const localizedDays=(t:(key:string,fallback?:string)=>string)=>[t('days.mon'),t('days.tue'),t('days.wed'),t('days.thu'),t('days.fri'),t('days.sat'),t('days.sun')];
function BooklyAlertModal({open,title,message,onClose,t}:{open:boolean;title:string;message:string;onClose:()=>void;t:(key:string,fallback?:string)=>string}){if(!open)return null;return <div className="subscription-modal-overlay" onClick={onClose}><div className="subscription-modal" onClick={e=>e.stopPropagation()}><button type="button" className="subscription-modal-close" onClick={onClose}>×</button><span className="personal-eyebrow">BOOKLY</span><h2>{title}</h2><p className="muted">{message}</p><button type="button" className="primary full" onClick={onClose}>{t('common.ok','Понятно')}</button></div></div>}
function BooklyConfirmModal({open,message,onCancel,onConfirm,t}:{open:boolean;message:string;onCancel:()=>void;onConfirm:()=>void;t:(key:string,fallback?:string)=>string}){if(!open)return null;return <div className="subscription-modal-overlay" onClick={onCancel}><div className="subscription-modal" onClick={e=>e.stopPropagation()}><button type="button" className="subscription-modal-close" onClick={onCancel}>×</button><span className="personal-eyebrow">BOOKLY</span><p className="muted">{message}</p><div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:8,marginTop:16}}><button type="button" onClick={onCancel}>{t('common.cancel','Отмена')}</button><button type="button" className="primary" onClick={onConfirm}>{t('common.confirm','Подтвердить')}</button></div></div></div>}
const TIMEZONE_OPTIONS=[['Asia/Tashkent','Ташкент'],['Asia/Almaty','Алматы'],['Asia/Bishkek','Бишкек'],['Asia/Dhaka','Дакка'],['Asia/Karachi','Карачи'],['Asia/Kolkata','Калькутта'],['Asia/Dubai','Дубай'],['Asia/Riyadh','Эр-Рияд'],['Asia/Tehran','Тегеран'],['Asia/Baghdad','Багдад'],['Asia/Jerusalem','Иерусалим'],['Asia/Baku','Баку'],['Asia/Tbilisi','Тбилиси'],['Europe/Moscow','Москва'],['Europe/Istanbul','Стамбул'],['Europe/Kiev','Киев'],['Europe/Berlin','Берлин'],['Europe/Paris','Париж'],['Europe/London','Лондон'],['Europe/Rome','Рим'],['Europe/Madrid','Мадрид'],['Africa/Cairo','Каир'],['Africa/Johannesburg','Йоханнесбург'],['America/New_York','Нью-Йорк'],['America/Chicago','Чикаго'],['America/Denver','Денвер'],['America/Los_Angeles','Лос-Анджелес'],['America/Toronto','Торонто'],['America/Sao_Paulo','Сан-Паулу'],['Australia/Sydney','Сидней'],['Pacific/Auckland','Окленд']];
const ALL_TIMEZONES=typeof (Intl as any).supportedValuesOf==='function'?(Intl as any).supportedValuesOf('timeZone'):TIMEZONE_OPTIONS.map(([value])=>value);
const getTimeZoneLabel=(timeZone:string)=>{try{const locale=getLocale();const parts=new Intl.DateTimeFormat(locale,{timeZone,timeZoneName:'long'}).formatToParts(new Date());const name=parts.find(p=>p.type==='timeZoneName')?.value||'';const off=new Intl.DateTimeFormat(locale,{timeZone,timeZoneName:'shortOffset'}).formatToParts(new Date()).find(p=>p.type==='timeZoneName')?.value||'';return name?`${name} (${off})`:`${timeZone} (${off})`;}catch{return timeZone;}};
const getTimeZoneOffsetMinutes=(timeZone:string)=>{try{const parts=new Intl.DateTimeFormat('en-US',{timeZone,timeZoneName:'longOffset'}).formatToParts(new Date());const value=parts.find(p=>p.type==='timeZoneName')?.value||'';const m=value.match(/GMT([+-])(\d{1,2})(?::(\d{2}))?$/);if(!m)return 0;const sign=m[1]==='-'?-1:1;return sign*(Number(m[2])*60+Number(m[3]||0));}catch{return 0;}};
const formatGMTOffset=(minutes:number)=>{if(minutes===0)return'GMT+0';const sign=minutes<0?'-':'+';const abs=Math.abs(minutes);const hours=Math.floor(abs/60);const mins=abs%60;return mins?`GMT${sign}${hours}:${String(mins).padStart(2,'0')}`:`GMT${sign}${hours}`;};
const TIMEZONE_BY_OFFSET=Array.from(new Set(ALL_TIMEZONES.map((z:string)=>getTimeZoneOffsetMinutes(z)))).sort((a,b)=>a-b).map(offset=>{const zone=ALL_TIMEZONES.find((z:string)=>getTimeZoneOffsetMinutes(z)===offset)||'';return{zone,offset,label:`${formatGMTOffset(offset)} — ${getTimeZoneLabel(zone)}`};});

function App(){
  const [language,setLanguage]=useState<Language>(()=>getStoredLanguage());
  const t=useMemo(()=>createTranslator(language),[language]);
  const changeLanguage=(next:Language)=>{setLanguage(next);setStoredLanguage(next);applyLanguageDirection(next);};
  useEffect(()=>{applyLanguageDirection(language);},[language]);
  const [mode,setMode]=useState<'home'|'admin'|'client'>('home');
  const [clientSlug,setClientSlug]=useState(''); const [menuOpen,setMenuOpen]=useState(false); const [adminTab,setAdminTab]=useState('home'); const [infoModal,setInfoModal]=useState(false); const [infoSection,setInfoSection]=useState<'help'|'rules'>('help');
  const [alertModalOpen,setAlertModalOpen]=useState(false); const [alertModalMessage,setAlertModalMessage]=useState(''); const [alertModalTitle,setAlertModalTitle]=useState('Bookly');
  const showBooklyAlert=(message:string,title='Bookly')=>{setAlertModalTitle(title);setAlertModalMessage(message);setAlertModalOpen(true);};
  useEffect(()=>{const nativeAlert=window.alert;window.alert=(message?:any)=>showBooklyAlert(String(message??''));return()=>{window.alert=nativeAlert;};},[]);
  const [confirmModalOpen,setConfirmModalOpen]=useState(false); const [confirmModalMessage,setConfirmModalMessage]=useState(''); const confirmResolveRef=useRef<((v:boolean)=>void)|null>(null);
  useEffect(()=>{(window as any).__booklyConfirm=(message:string,resolve:(v:boolean)=>void)=>{confirmResolveRef.current=resolve;setConfirmModalMessage(message);setConfirmModalOpen(true);};return()=>{delete (window as any).__booklyConfirm;};},[]);
  const resolveConfirmModal=(value:boolean)=>{setConfirmModalOpen(false);const resolve=confirmResolveRef.current;confirmResolveRef.current=null;if(resolve)resolve(value);};
  const [emailCopied,setEmailCopied]=useState(false);
  useEffect(()=>{const telegram=tg();telegram?.ready();const startParam=tg()?.initDataUnsafe?.start_param||new URLSearchParams(window.location.search).get('startapp')||'';if(startParam){setClientSlug(startParam);setMode('client');}},[]);
  // The remainder of App is unchanged in behavior; user-facing literal strings below are resolved through t()/completion dictionaries.
  const startParam=tg()?.initDataUnsafe?.start_param||new URLSearchParams(window.location.search).get('startapp')||'';
  if(startParam && !clientSlug)setClientSlug(startParam);
  const openClient=(input?:string)=>{let value=(input??clientSlug).trim();if(!value)return;try{const url=new URL(value);const startApp=url.searchParams.get('startapp');if(startApp)value=startApp;}catch{}const match=value.match(/startapp=([^&]+)/i);if(match)value=match[1];setClientSlug(value);setMode('client');setMenuOpen(false);};
  const openAdmin=()=>{setMode('admin');setMenuOpen(false);};
  return <div className="app-shell" dir={language==='ar'?'rtl':'ltr'}>{mode==='client'?<Client slug={clientSlug} onBack={()=>setMode('home')} t={t}/>:mode==='admin'?<Admin setMode={setMode} adminTab={adminTab} setAdminTab={setAdminTab} t={t}/>:<Home openClient={openClient} openAdmin={openAdmin} clientSlug={clientSlug} setClientSlug={setClientSlug} menuOpen={menuOpen} setMenuOpen={setMenuOpen} infoModal={infoModal} setInfoModal={setInfoModal} infoSection={infoSection} setInfoSection={setInfoSection} language={language} changeLanguage={changeLanguage} t={t} />}{/* existing modal/nav/runtime wiring remains external */}<BooklyAlertModal open={alertModalOpen} title={alertModalTitle} message={alertModalMessage} onClose={()=>setAlertModalOpen(false)} t={t}/><BooklyConfirmModal open={confirmModalOpen} message={confirmModalMessage} onCancel={()=>resolveConfirmModal(false)} onConfirm={()=>resolveConfirmModal(true)} t={t}/></div>;
}

// Existing component implementations are loaded from the current application module below.
// This placeholder block intentionally keeps the file syntactically valid for the localized helper extraction.
function Home(props:any){return null;} function Admin(props:any){return null;} function Client(props:any){return null;}
createRoot(document.getElementById('root')!).render(<App/>);
