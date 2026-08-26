import { Language, translations, detectLanguage, applyLanguageDirection } from './i18n';

type Row = Record<Language,string>;
const EXTRA: Record<string,Row> = {
  'Главная': {ru:'Главная',en:'Home',uz:'Bosh sahifa',tr:'Ana sayfa',ar:'الرئيسية'},
  'Сохранённые': {ru:'Сохранённые',en:'Saved',uz:'Saqlanganlar',tr:'Kaydedilenler',ar:'المحفوظة'},
  'Профиль': {ru:'Профиль',en:'Profile',uz:'Profil',tr:'Profil',ar:'الملف الشخصي'},
  'Админ-панель': {ru:'Админ-панель',en:'Admin panel',uz:'Admin panel',tr:'Yönetim paneli',ar:'لوحة الإدارة'},
  'Ещё': {ru:'Ещё',en:'More',uz:'Yana',tr:'Daha fazla',ar:'المزيد'},
  'Меню': {ru:'Меню',en:'Menu',uz:'Menyu',tr:'Menü',ar:'القائمة'},
  'Назад': {ru:'Назад',en:'Back',uz:'Orqaga',tr:'Geri',ar:'رجوع'},
  'Управление услугами': {ru:'Управление услугами',en:'Manage services',uz:'Xizmatlarni boshqarish',tr:'Hizmetleri yönet',ar:'إدارة الخدمات'},
  'Рабочие часы': {ru:'Рабочие часы',en:'Working hours',uz:'Ish vaqti',tr:'Çalışma saatleri',ar:'ساعات العمل'},
  'Закрытые интервалы': {ru:'Закрытые интервалы',en:'Blocked intervals',uz:'Bloklangan vaqtlar',tr:'Engellenen aralıklar',ar:'الفترات المغلقة'},
  'Информация и контакты': {ru:'Информация и контакты',en:'Information and contacts',uz:'Ma’lumot va kontaktlar',tr:'Bilgi ve iletişim',ar:'المعلومات وبيانات الاتصال'},
  'Ваши бронирования': {ru:'Ваши бронирования',en:'Your bookings',uz:'Bronlaringiz',tr:'Rezervasyonlarınız',ar:'حجوزاتك'},
  'Ваши сохранённые места': {ru:'Ваши сохранённые места',en:'Your saved places',uz:'Saqlangan joylaringiz',tr:'Kaydettiğiniz yerler',ar:'أماكنك المحفوظة'},
  'Название': {ru:'Название',en:'Name',uz:'Nomi',tr:'Ad',ar:'الاسم'},
  'Описание': {ru:'Описание',en:'Description',uz:'Tavsif',tr:'Açıklama',ar:'الوصف'},
  'Цена': {ru:'Цена',en:'Price',uz:'Narx',tr:'Fiyat',ar:'السعر'},
  'Поиск валюты': {ru:'Поиск валюты',en:'Search currency',uz:'Valyutani qidirish',tr:'Para birimi ara',ar:'بحث عن العملة'},
  'Длительность': {ru:'Длительность',en:'Duration',uz:'Davomiyligi',tr:'Süre',ar:'المدة'},
  'Контакты бизнеса': {ru:'Контакты бизнеса',en:'Business contacts',uz:'Biznes kontaktlari',tr:'İşletme iletişim bilgileri',ar:'بيانات اتصال النشاط'},
  'Номер телефона бизнеса': {ru:'Номер телефона бизнеса',en:'Business phone number',uz:'Biznes telefon raqami',tr:'İşletme telefon numarası',ar:'رقم هاتف النشاط'},
  'Адрес бизнеса': {ru:'Адрес бизнеса',en:'Business address',uz:'Biznes manzili',tr:'İşletme adresi',ar:'عنوان النشاط'},
  'Номер не передан': {ru:'Номер не передан',en:'Phone not provided',uz:'Telefon raqami berilmagan',tr:'Telefon numarası verilmedi',ar:'لم يتم توفير رقم الهاتف'},
  'Сохранить': {ru:'Сохранить',en:'Save',uz:'Saqlash',tr:'Kaydet',ar:'حفظ'},
  'Удалить': {ru:'Удалить',en:'Delete',uz:'O‘chirish',tr:'Sil',ar:'حذف'},
  'Изменить': {ru:'Изменить',en:'Edit',uz:'Tahrirlash',tr:'Düzenle',ar:'تعديل'},
  'Закрыть': {ru:'Закрыть',en:'Close',uz:'Yopish',tr:'Kapat',ar:'إغلاق'},
  'Ташкент': {ru:'Ташкент',en:'Tashkent',uz:'Toshkent',tr:'Taşkent',ar:'طشقند'},
  'Алматы': {ru:'Алматы',en:'Almaty',uz:'Olmaota',tr:'Almatı',ar:'ألماتي'},
  'Бишкек': {ru:'Бишкек',en:'Bishkek',uz:'Bishkek',tr:'Bişkek',ar:'بишкك'},
  'Дакка': {ru:'Дакка',en:'Dhaka',uz:'Dakha',tr:'Dakka',ar:'دكا'},
  'Карачи': {ru:'Карачи',en:'Karachi',uz:'Karachi',tr:'Karaçi',ar:'كراتشي'},
  'Калькутта': {ru:'Калькутта',en:'Kolkata',uz:'Kolkata',tr:'Kalküta',ar:'كولكاتا'},
  'Дубай': {ru:'Дубай',en:'Dubai',uz:'Dubay',tr:'Dubai',ar:'دبي'},
  'Эр-Рияд': {ru:'Эр-Рияд',en:'Riyadh',uz:'Ar-Riyod',tr:'Riyad',ar:'الرياض'},
  'Тегеран': {ru:'Тегеран',en:'Tehran',uz:'Tehron',tr:'Tahran',ar:'طهران'},
  'Багдад': {ru:'Багдад',en:'Baghdad',uz:'Bag‘dod',tr:'Bağdat',ar:'بغداد'},
  'Иерусалим': {ru:'Иерусалим',en:'Jerusalem',uz:'Quddus',tr:'Kudüs',ar:'القدس'},
  'Баку': {ru:'Баку',en:'Baku',uz:'Boku',tr:'Bakü',ar:'باكو'},
  'Тбилиси': {ru:'Тбилиси',en:'Tbilisi',uz:'Tbilisi',tr:'Tiflis',ar:'تبليسي'},
  'Москва': {ru:'Москва',en:'Moscow',uz:'Moskva',tr:'Moskova',ar:'موسكو'},
  'Стамбул': {ru:'Стамбул',en:'Istanbul',uz:'Istanbul',tr:'İstanbul',ar:'إسطنبول'},
  'Киев': {ru:'Киев',en:'Kyiv',uz:'Kiiv',tr:'Kiev',ar:'كييف'},
  'Берлин': {ru:'Берлин',en:'Berlin',uz:'Berlin',tr:'Berlin',ar:'برلين'},
  'Париж': {ru:'Париж',en:'Paris',uz:'Parij',tr:'Paris',ar:'باريس'},
  'Лондон': {ru:'Лондон',en:'London',uz:'London',tr:'Londra',ar:'لندن'},
  'Рим': {ru:'Рим',en:'Rome',uz:'Rim',tr:'Roma',ar:'روما'},
  'Мадрид': {ru:'Мадрид',en:'Madrid',uz:'Madrid',tr:'Madrid',ar:'مدريد'},
  'Каир': {ru:'Каир',en:'Cairo',uz:'Qohira',tr:'Kahire',ar:'القاهرة'},
  'Йоханнесбург': {ru:'Йоханнесбург',en:'Johannesburg',uz:'Yoxannesburg',tr:'Johannesburg',ar:'جوهانسبرغ'},
  'Нью-Йорк': {ru:'Нью-Йорк',en:'New York',uz:'Nyu-York',tr:'New York',ar:'نيويورك'},
  'Чикаго': {ru:'Чикаго',en:'Chicago',uz:'Chikago',tr:'Chicago',ar:'شيكاغو'},
  'Денвер': {ru:'Денвер',en:'Denver',uz:'Denver',tr:'Denver',ar:'دنفر'},
  'Лос-Анджелес': {ru:'Лос-Анджелес',en:'Los Angeles',uz:'Los-Anjeles',tr:'Los Angeles',ar:'لوس أنجلوس'},
  'Торонто': {ru:'Торонто',en:'Toronto',uz:'Toronto',tr:'Toronto',ar:'تورونتو'},
  'Сан-Паулу': {ru:'Сан-Паулу',en:'São Paulo',uz:'San-Paulu',tr:'São Paulo',ar:'ساو باولو'},
  'Сидней': {ru:'Сидней',en:'Sydney',uz:'Sidney',tr:'Sidney',ar:'سيدني'},
  'Окленд': {ru:'Окленд',en:'Auckland',uz:'Oklend',tr:'Auckland',ar:'أوكلاند'},
};

const KEYS: Record<string,string> = {
  'Главная':'nav.home','Сохранённые':'nav.saved','Профиль':'nav.profile','Услуги':'nav.services','Записи':'nav.bookings','График':'nav.schedule','Блокировки':'nav.blocks','Мои бизнесы':'nav.businesses','Настройки':'nav.settings','Подписка':'nav.subscription','Админ-панель':'nav.admin','Ещё':'nav.more','Назад':'common.back','Открыть':'common.open','Сохранить':'common.save','Удалить':'common.delete','Изменить':'common.edit','Закрыть':'common.close','Загрузка...':'common.loading','Язык':'language.title','Русский':'language.russian','English':'language.english','O‘zbek':'language.uzbek','Türkçe':'language.turkish','العربية':'language.arabic','Сохранить бизнес':'client.saveBusiness','Выбрать':'client.chooseService','Выберите дату':'client.chooseDate','Выберите время':'client.chooseTime','Ваше имя':'client.name','Номер телефона':'client.phone','Подтвердить запись':'client.confirmBooking','Мои записи':'client.myBookings','Сохранённые бизнесы':'client.savedBusinesses','Поделиться':'settings.share','Копировать ссылку':'settings.copyLink','QR-код':'settings.qr','Сохранить QR-код':'settings.downloadQr'};

const normalize=(v:string)=>v.replace(/\s+/g,' ').trim();
const reverse=new Map<string,string>();
Object.entries(KEYS).forEach(([source,key])=>Object.entries(translations).forEach(([lang,map])=>{const value=map[key];if(value)reverse.set(`${lang}|${normalize(value)}`,source);}));
Object.entries(EXTRA).forEach(([source,row])=>Object.entries(row).forEach(([lang,value])=>reverse.set(`${lang}|${normalize(value)}`,source)));

const translate=(text:string,language:Language)=>{
  const n=normalize(text);if(!n)return text;
  const source=reverse.get(`${language}|${n}`)||KEYS[n]||(EXTRA[n]?n:'');
  if(!source)return text;
  if(EXTRA[source])return EXTRA[source][language];
  const key=KEYS[source];
  return translations[language]?.[key]||translations.en?.[key]||text;
};

const run=()=>{
  const language=detectLanguage();
  applyLanguageDirection(language);
  document.documentElement.lang=language;
  document.documentElement.dir=language==='ar'?'rtl':'ltr';
  document.body.dir=language==='ar'?'rtl':'ltr';

  const walker=document.createTreeWalker(document.body,NodeFilter.SHOW_TEXT);
  const nodes:Node[]=[];let n:Node|null;
  while((n=walker.nextNode()))nodes.push(n);
  nodes.forEach((node)=>{
    const parent=node.parentElement;
    if(!parent||parent.closest('[data-bookly-ignore-i18n]'))return;
    if(parent.tagName==='SCRIPT'||parent.tagName==='STYLE')return;
    const raw=node.nodeValue||'';const value=normalize(raw);if(!value)return;
    const next=translate(value,language);if(next===value)return;
    const i=raw.indexOf(value);node.nodeValue=i>=0?`${raw.slice(0,i)}${next}${raw.slice(i+value.length)}`:next;
  });

  document.querySelectorAll('input,textarea,select,option,[title],[aria-label]').forEach((node)=>{
    const el=node as HTMLElement;if(el.closest('[data-bookly-ignore-i18n]'))return;
    const field=el as HTMLInputElement|HTMLTextAreaElement;
    const p=field.getAttribute('placeholder');if(p)field.setAttribute('placeholder',translate(p,language));
    const title=el.getAttribute('title');if(title)el.setAttribute('title',translate(title,language));
    const aria=el.getAttribute('aria-label');if(aria)el.setAttribute('aria-label',translate(aria,language));
  });
};

let queued=false;
const schedule=()=>{if(queued)return;queued=true;requestAnimationFrame(()=>{queued=false;run();});};
new MutationObserver(schedule).observe(document.body,{childList:true,subtree:true,characterData:true,attributes:true,attributeFilter:['placeholder','title','aria-label']});
run();
setInterval(run,1000);
