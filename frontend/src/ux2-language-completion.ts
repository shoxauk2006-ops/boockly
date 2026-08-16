import { Language, SUPPORTED_LANGUAGES, translations, detectLanguage, setStoredLanguage, applyLanguageDirection } from './i18n';

type Row = Record<Language,string>;

const EXTRA: Record<string,Row> = {
  'Главная': {ru:'Главная',en:'Home',uz:'Bosh sahifa',tr:'Ana sayfa',ar:'الرئيسية'},
  'Сохранённые': {ru:'Сохранённые',en:'Saved',uz:'Saqlanganlar',tr:'Kaydedilenler',ar:'المحفوظات'},
  'Профиль': {ru:'Профиль',en:'Profile',uz:'Profil',tr:'Profil',ar:'الملف الشخصي'},
  'Админ-панель': {ru:'Админ-панель',en:'Admin panel',uz:'Admin panel',tr:'Yönetim paneli',ar:'لوحة الإدارة'},
  'Ещё': {ru:'Ещё',en:'More',uz:'Yana',tr:'Daha fazla',ar:'المزيد'},
  'Меню': {ru:'Меню',en:'Menu',uz:'Menyu',tr:'Menü',ar:'القائمة'},
  'Назад': {ru:'Назад',en:'Back',uz:'Orqaga',tr:'Geri',ar:'رجوع'},
  'Текущий бизнес': {ru:'Текущий бизнес',en:'Current business',uz:'Joriy biznes',tr:'Mevcut işletme',ar:'النشاط الحالي'},
  'Управление услугами': {ru:'Управление услугами',en:'Manage services',uz:'Xizmatlarni boshqarish',tr:'Hizmetleri yönet',ar:'إدارة الخدمات'},
  'Рабочие часы': {ru:'Рабочие часы',en:'Working hours',uz:'Ish vaqti',tr:'Çalışma saatleri',ar:'ساعات العمل'},
  'Закрытые интервалы': {ru:'Закрытые интервалы',en:'Blocked intervals',uz:'Bloklangan vaqtlar',tr:'Engellenen aralıklar',ar:'الفترات المغلقة'},
  'Информация и контакты': {ru:'Информация и контакты',en:'Information and contacts',uz:'Ma’lumot va kontaktlar',tr:'Bilgi ve iletişim',ar:'المعلومات وبيانات الاتصال'},
  'Ваши бронирования': {ru:'Ваши бронирования',en:'Your bookings',uz:'Bronlaringiz',tr:'Randevularınız',ar:'حجozatlaringiz'},
  'Ваши сохранённые места': {ru:'Ваши сохранённые места',en:'Your saved places',uz:'Saqlangan joylaringiz',tr:'Kaydettiğiniz yerler',ar:'أماكنك المحفوظة'},
  'Bookly Pro': {ru:'Bookly Pro',en:'Bookly Pro',uz:'Bookly Pro',tr:'Bookly Pro',ar:'Bookly Pro'},
  'Название': {ru:'Название',en:'Name',uz:'Nomi',tr:'Ad',ar:'الاسم'},
  'Описание': {ru:'Описание',en:'Description',uz:'Tavsif',tr:'Açıklama',ar:'الوصف'},
  'Цена': {ru:'Цена',en:'Price',uz:'Narx',tr:'Fiyat',ar:'السعر'},
  'Поиск валюты': {ru:'Поиск валюты',en:'Search currency',uz:'Valyutani qidirish',tr:'Para birimi ara',ar:'بحث عن العملة'},
  'Длительность': {ru:'Длительность',en:'Duration',uz:'Davomiyligi',tr:'Süre',ar:'المدة'},
  'Сохранить контакты': {ru:'Сохранить контакты',en:'Save contacts',uz:'Kontaktlarni saqlash',tr:'İletişim bilgilerini kaydet',ar:'حفظ بيانات الاتصال'},
  'Контакты бизнеса': {ru:'Контакты бизнеса',en:'Business contacts',uz:'Biznes kontaktlari',tr:'İşletme iletişim bilgileri',ar:'بيانات اتصال النشاط'},
  'Номер телефона бизнеса': {ru:'Номер телефона бизнеса',en:'Business phone number',uz:'Biznes telefon raqami',tr:'İşletme telefon numarası',ar:'رقم هاتف النشاط'},
  'Адрес бизнеса': {ru:'Адрес бизнеса',en:'Business address',uz:'Biznes manzili',tr:'İşletme adresi',ar:'عنوان النشاط'},
  'Номер не передан': {ru:'Номер не передан',en:'Phone not provided',uz:'Telefon raqami berilmagan',tr:'Telefon numarası verilmedi',ar:'لم يتم توفير رقم الهاتف'},
  'Сохранить': {ru:'Сохранить',en:'Save',uz:'Saqlash',tr:'Kaydet',ar:'حفظ'},
  'Удалить': {ru:'Удалить',en:'Delete',uz:'O‘chirish',tr:'Sil',ar:'حذف'},
  'Изменить': {ru:'Изменить',en:'Edit',uz:'Tahrirlash',tr:'Düzenle',ar:'تعديل'},
  'Закрыть': {ru:'Закрыть',en:'Close',uz:'Yopish',tr:'Kapat',ar:'إغلاق'},
};

const sourceMap: Record<string, string> = {
  'Главная':'nav.home','Сохранённые':'nav.saved','Профиль':'nav.profile','Услуги':'nav.services','Записи':'nav.bookings','График':'nav.schedule','Блокировки':'nav.blocks','Мои бизнесы':'nav.businesses','Настройки':'nav.settings','Подписка':'nav.subscription','Админ-панель':'nav.admin','Ещё':'nav.more','Назад':'common.back','Открыть':'common.open','Сохранить':'common.save','Удалить':'common.delete','Изменить':'common.edit','Закрыть':'common.close','Загрузка...':'common.loading','Язык':'language.title','Русский':'language.russian','English':'language.english','O‘zbek':'language.uzbek','Türkçe':'language.turkish','العربية':'language.arabic','Сохранить бизнес':'client.saveBusiness','Услуги':'client.services','Выбрать':'client.chooseService','Выберите дату':'client.chooseDate','Выберите время':'client.chooseTime','Ваше имя':'client.name','Номер телефона':'client.phone','Подтвердить запись':'client.confirmBooking','Мои записи':'client.myBookings','Сохранённые бизнесы':'client.savedBusinesses'};

let language:Language=detectLanguage();
const allSourceValues = new Map<string,string>();
Object.keys(sourceMap).forEach((source)=>{
  const key=sourceMap[source];
  (Object.entries(translations) as Array<[Language,Record<string,string>]>).forEach(([lang,map])=>{const value=map[key]; if(value) allSourceValues.set(`${lang}|${value.replace(/\s+/g,' ').trim()}`,source);});
});
Object.entries(EXTRA).forEach(([source,row])=>Object.entries(row).forEach(([lang,value])=>allSourceValues.set(`${lang}|${value.replace(/\s+/g,' ').trim()}`,source)));

const translate=(text:string)=>{
  const normalized=text.replace(/\s+/g,' ').trim();
  if(!normalized)return text;
  const source=allSourceValues.get(`${language}|${normalized}`) || (sourceMap[normalized] ? normalized : (EXTRA[normalized] ? normalized : ''));
  if(!source)return text;
  if(EXTRA[source])return EXTRA[source][language];
  const key=sourceMap[source];
  return translations[language]?.[key] || translations.en?.[key] || EXTRA[source]?.[language] || text;
};

const run=()=>{
  applyLanguageDirection(language);
  document.documentElement.lang=language;
  document.documentElement.dir=language==='ar'?'rtl':'ltr';
  document.body.dir=language==='ar'?'rtl':'ltr';

  const walker=document.createTreeWalker(document.body,NodeFilter.SHOW_TEXT); const nodes:Node[]=[]; let n:Node|null;
  while((n=walker.nextNode()))nodes.push(n);
  nodes.forEach((node)=>{
    const parent=node.parentElement;
    if(!parent||parent.closest('[data-bookly-ignore-i18n]'))return;
    if(parent.tagName==='SCRIPT'||parent.tagName==='STYLE')return;
    const raw=node.nodeValue||''; const value=raw.replace(/\s+/g,' ').trim(); if(!value)return;
    const next=translate(value); if(next===value)return;
    const i=raw.indexOf(value); node.nodeValue=i>=0?`${raw.slice(0,i)}${next}${raw.slice(i+value.length)}`:next;
  });

  document.querySelectorAll('input,textarea,select,option,[title],[aria-label]').forEach((node)=>{
    const el=node as HTMLElement; if(el.closest('[data-bookly-ignore-i18n]'))return;
    const field=el as HTMLInputElement|HTMLTextAreaElement;
    const p=field.getAttribute('placeholder'); if(p)field.setAttribute('placeholder',translate(p));
    const title=el.getAttribute('title'); if(title)el.setAttribute('title',translate(title));
    const aria=el.getAttribute('aria-label'); if(aria)el.setAttribute('aria-label',translate(aria));
  });
};

let open=false;
const renderLanguageButton=()=>{
  const root=document.getElementById('bookly-language-completion');
  if(!root)return;
  const label=SUPPORTED_LANGUAGES.find(x=>x.code===language)?.nativeLabel||language;
  root.innerHTML=`<button type="button" class="ux2-completion-language-trigger"><span>◎</span><strong>${label}</strong><span>⌄</span></button>`;
  const button=root.querySelector('button') as HTMLButtonElement;
  button.onclick=()=>{open=!open;renderLanguageMenu();};
};
const renderLanguageMenu=()=>{
  const root=document.getElementById('bookly-language-completion'); if(!root)return;
  renderLanguageButton();
  if(!open)return;
  const menu=document.createElement('div'); menu.className='ux2-completion-language-menu'; menu.dataset.booklyIgnoreI18n='true'; menu.dir=language==='ar'?'rtl':'ltr';
  SUPPORTED_LANGUAGES.forEach((item)=>{const b=document.createElement('button');b.type='button';b.className=item.code===language?'active':'';b.textContent=item.nativeLabel;b.onclick=()=>{language=item.code;setStoredLanguage(language);open=false;run();renderLanguageMenu();window.setTimeout(run,50);};menu.appendChild(b);});
  root.appendChild(menu);
};

const ensureButton=()=>{
  let root=document.getElementById('bookly-language-completion');
  if(!root){root=document.createElement('div');root.id='bookly-language-completion';root.dataset.booklyIgnoreI18n='true';root.className='ux2-completion-language';document.body.appendChild(root);}
  renderLanguageButton(); if(open)renderLanguageMenu();
};

let queued=false;
const schedule=()=>{if(queued)return;queued=true;requestAnimationFrame(()=>{queued=false;ensureButton();run();});};
new MutationObserver(schedule).observe(document.body,{childList:true,subtree:true,characterData:true,attributes:true,attributeFilter:['placeholder','title','aria-label']});
ensureButton();run();setInterval(schedule,1000);
