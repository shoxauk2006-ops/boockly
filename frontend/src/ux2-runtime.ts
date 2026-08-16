import './ux2.css';
import { Language, SUPPORTED_LANGUAGES, detectLanguage, setStoredLanguage, applyLanguageDirection } from './i18n';

type TextSet = Record<Language, string>;
const T: Record<string, TextSet> = {
  'Booking inside Telegram': {ru:'Бронирование в Telegram',en:'Booking inside Telegram',uz:'Telegram ichida bron qilish',tr:'Telegram içinde rezervasyon',ar:'الحجز داخل تيليجرام'},
  'Бронирование без звонков': {ru:'Бронирование без звонков',en:'Booking without calls',uz:'Qo‘ng‘iroqlarsiz bron qilish',tr:'Arama yapmadan rezervasyon',ar:'حجز بدون مكالمات'},
  'Bookly помогает бизнесу принимать записи прямо в Telegram.': {ru:'Bookly помогает бизнесу принимать записи прямо в Telegram.',en:'Bookly helps businesses accept appointments directly in Telegram.',uz:'Bookly bizneslarga Telegram ichida to‘g‘ridan-to‘g‘ri bron qabul qilishga yordam beradi.',tr:'Bookly işletmelerin doğrudan Telegram üzerinden randevu almasını sağlar.',ar:'يساعد Bookly الأنشطة التجارية على استقبال الحجوزات مباشرةً داخل تيليجرام.'},
  'Открыть админ-панель': {ru:'Открыть админ-панель',en:'Open admin panel',uz:'Admin panelni ochish',tr:'Yönetim panelini aç',ar:'فتح لوحة الإدارة'},
  'Открыть страницу бизнеса': {ru:'Открыть страницу бизнеса',en:'Open business page',uz:'Biznes sahifasini ochish',tr:'İşletme sayfasını aç',ar:'فتح صفحة النشاط'},
  'Ссылка или slug бизнеса': {ru:'Ссылка или slug бизнеса',en:'Business link or slug',uz:'Biznes havolasi yoki slug',tr:'İşletme bağlantısı veya slug',ar:'رابط النشاط أو slug'},
  'Открыть': {ru:'Открыть',en:'Open',uz:'Ochish',tr:'Aç',ar:'فتح'},
  'Сохранённые бизнесы': {ru:'Сохранённые бизнесы',en:'Saved businesses',uz:'Saqlangan bizneslar',tr:'Kaydedilen işletmeler',ar:'الأنشطة المحفوظة'},
  'Здесь появятся бизнесы, которые вы сохраните.': {ru:'Здесь появятся бизнесы, которые вы сохраните.',en:'Businesses you save will appear here.',uz:'Siz saqlagan bizneslar shu yerda ko‘rinadi.',tr:'Kaydettiğiniz işletmeler burada görünür.',ar:'ستظهر هنا الأنشطة التي تحفظها.'},
  'Мои записи': {ru:'Мои записи',en:'My bookings',uz:'Mening bronlarim',tr:'Randevularım',ar:'حجوزاتي'},
  'Добавить услугу': {ru:'Добавить услугу',en:'Add service',uz:'Xizmat qo‘shish',tr:'Hizmet ekle',ar:'إضافة خدمة'},
  'Добавить бизнес': {ru:'Добавить бизнес',en:'Add business',uz:'Biznes qo‘shish',tr:'İşletme ekle',ar:'إضافة نشاط'},
  'Создать новый бизнес': {ru:'Создать новый бизнес',en:'Create new business',uz:'Yangi biznes yaratish',tr:'Yeni işletme oluştur',ar:'إنشاء نشاط جديد'},
  'Название бизнеса': {ru:'Название бизнеса',en:'Business name',uz:'Biznes nomi',tr:'İşletme adı',ar:'اسم النشاط'},
  'Описание бизнеса': {ru:'Описание бизнеса',en:'Business description',uz:'Biznes tavsifi',tr:'İşletme açıklaması',ar:'وصف النشاط'},
  'Телефон бизнеса': {ru:'Телефон бизнеса',en:'Business phone',uz:'Biznes telefoni',tr:'İşletme telefonu',ar:'هاتف النشاط'},
  'Номер телефона бизнеса': {ru:'Номер телефона бизнеса',en:'Business phone number',uz:'Biznes telefon raqami',tr:'İşletme telefon numarası',ar:'رقم هاتف النشاط'},
  'Адрес бизнеса': {ru:'Адрес бизнеса',en:'Business address',uz:'Biznes manzili',tr:'İşletme adresi',ar:'عنوان النشاط'},
  'Адрес не указан': {ru:'Адрес не указан',en:'Address not provided',uz:'Manzil ko‘rsatilmagan',tr:'Adres belirtilmedi',ar:'العنوان غير مذكور'},
  'Контакты бизнеса': {ru:'Контакты бизнеса',en:'Business contacts',uz:'Biznes kontaktlari',tr:'İşletme iletişim bilgileri',ar:'بيانات اتصال النشاط'},
  'Сохранить настройки': {ru:'Сохранить настройки',en:'Save settings',uz:'Sozlamalarni saqlash',tr:'Ayarları kaydet',ar:'حفظ الإعدادات'},
  'Сохранить контакты': {ru:'Сохранить контакты',en:'Save contacts',uz:'Kontaktlarni saqlash',tr:'İletişim bilgilerini kaydet',ar:'حفظ بيانات الاتصال'},
  'Название': {ru:'Название',en:'Name',uz:'Nomi',tr:'Ad',ar:'الاسم'},
  'Описание': {ru:'Описание',en:'Description',uz:'Tavsif',tr:'Açıklama',ar:'الوصف'},
  'Цена': {ru:'Цена',en:'Price',uz:'Narx',tr:'Fiyat',ar:'السعر'},
  'Поиск валюты': {ru:'Поиск валюты',en:'Search currency',uz:'Valyutani qidirish',tr:'Para birimi ara',ar:'بحث عن العملة'},
  'Длительность': {ru:'Длительность',en:'Duration',uz:'Davomiyligi',tr:'Süre',ar:'المدة'},
  'мин': {ru:'мин',en:'min',uz:'daq',tr:'dk',ar:'دقيقة'},
  'Активен': {ru:'Активен',en:'Active',uz:'Faol',tr:'Aktif',ar:'نشط'},
  'Подписка': {ru:'Подписка',en:'Subscription',uz:'Obuna',tr:'Abonelik',ar:'الاشتراك'},
  'Всего записей': {ru:'Всего записей',en:'Total bookings',uz:'Jami bronlar',tr:'Toplam randevu',ar:'إجمالي الحجوزات'},
  'Записи': {ru:'Записи',en:'Bookings',uz:'Bronlar',tr:'Randevular',ar:'الحجوزات'},
  'Услуги': {ru:'Услуги',en:'Services',uz:'Xizmatlar',tr:'Hizmetler',ar:'الخدمات'},
  'График': {ru:'График',en:'Schedule',uz:'Jadval',tr:'Çalışma saatleri',ar:'الجدول'},
  'Блокировки': {ru:'Блокировки',en:'Blocked times',uz:'Bloklangan vaqtlar',tr:'Engellenen saatler',ar:'الأوقات المحجوزة'},
  'Настройки': {ru:'Настройки',en:'Settings',uz:'Sozlamalar',tr:'Ayarlar',ar:'الإعدادات'},
  'Сегодня': {ru:'Сегодня',en:'Today',uz:'Bugun',tr:'Bugün',ar:'اليوم'},
  'Предстоящие': {ru:'Предстоящие',en:'Upcoming',uz:'Kelgusi',tr:'Yaklaşan',ar:'القادمة'},
  'Прошедшие': {ru:'Прошедшие',en:'Past',uz:'O‘tgan',tr:'Geçmiş',ar:'السابقة'},
  'Дата': {ru:'Дата',en:'Date',uz:'Sana',tr:'Tarih',ar:'التاريخ'},
  'Все': {ru:'Все',en:'All',uz:'Barchasi',tr:'Tümü',ar:'الكل'},
  'Сохранено': {ru:'Сохранено',en:'Saved',uz:'Saqlandi',tr:'Kaydedildi',ar:'تم الحفظ'},
  'Выберите услугу ниже, чтобы записаться.': {ru:'Выберите услугу ниже, чтобы записаться.',en:'Choose a service below to book.',uz:'Bron qilish uchun quyidagi xizmatni tanlang.',tr:'Rezervasyon yapmak için aşağıdan bir hizmet seçin.',ar:'اختر خدمة أدناه للحجز.'},
  'У этого бизнеса пока нет доступных услуг.': {ru:'У этого бизнеса пока нет доступных услуг.',en:'This business has no available services yet.',uz:'Bu biznesda hozircha mavjud xizmatlar yo‘q.',tr:'Bu işletmede henüz uygun hizmet yok.',ar:'لا توجد خدمات متاحة لهذا النشاط بعد.'},
  'Сохранить бизнес': {ru:'Сохранить бизнес',en:'Save business',uz:'Biznesni saqlash',tr:'İşletmeyi kaydet',ar:'حفظ النشاط'},
  'Поделиться': {ru:'Поделиться',en:'Share',uz:'Ulashish',tr:'Paylaş',ar:'مشاركة'},
  'Копировать': {ru:'Копировать',en:'Copy',uz:'Nusxalash',tr:'Kopyala',ar:'نسخ'},
  'Копировать ссылку': {ru:'Копировать ссылку',en:'Copy link',uz:'Havolani nusxalash',tr:'Bağlantıyı kopyala',ar:'نسخ الرابط'},
  'QR-код': {ru:'QR-код',en:'QR code',uz:'QR-kod',tr:'QR kodu',ar:'رمز QR'},
  'Сохранить QR-код': {ru:'Сохранить QR-код',en:'Save QR code',uz:'QR-kodni saqlash',tr:'QR kodunu kaydet',ar:'حفظ رمز QR'},
  'Выбрать': {ru:'Выбрать',en:'Choose',uz:'Tanlash',tr:'Seç',ar:'اختيار'},
  'Выберите дату': {ru:'Выберите дату',en:'Choose a date',uz:'Sanani tanlang',tr:'Tarih seçin',ar:'اختر التاريخ'},
  'Выберите время': {ru:'Выберите время',en:'Choose a time',uz:'Vaqtni tanlang',tr:'Saat seçin',ar:'اختر الوقت'},
  'Ваше имя': {ru:'Ваше имя',en:'Your name',uz:'Ismingiz',tr:'Adınız',ar:'اسمك'},
  'Номер телефона': {ru:'Номер телефона',en:'Phone number',uz:'Telefon raqami',tr:'Telefon numarası',ar:'رقم الهاتف'},
  'Номер не передан': {ru:'Номер не передан',en:'Phone not provided',uz:'Telefon raqami berilmagan',tr:'Telefon numarası verilmedi',ar:'لم يتم توفير رقم الهاتف'},
  'Подтвердить запись': {ru:'Подтвердить запись',en:'Confirm booking',uz:'Bronni tasdiqlash',tr:'Randevuyu onayla',ar:'تأكيد الحجز'},
  'Выбрать услугу': {ru:'Выбрать услугу',en:'Choose service',uz:'Xizmatni tanlash',tr:'Hizmet seç',ar:'اختيار الخدمة'},
  'Добавить запись': {ru:'Добавить запись',en:'Add booking',uz:'Bron qo‘shish',tr:'Randevu ekle',ar:'إضافة حجز'},
  'Новая запись': {ru:'Новая запись',en:'New booking',uz:'Yangi bron',tr:'Yeni randevu',ar:'حجز جديد'},
  'Отменить': {ru:'Отменить',en:'Cancel',uz:'Bekor qilish',tr:'İptal',ar:'إلغاء'},
  'Удалить': {ru:'Удалить',en:'Delete',uz:'O‘chirish',tr:'Sil',ar:'حذف'},
  'Изменить': {ru:'Изменить',en:'Edit',uz:'Tahrirlash',tr:'Düzenle',ar:'تعديل'},
  'Завершено': {ru:'Завершено',en:'Completed',uz:'Yakunlangan',tr:'Tamamlandı',ar:'مكتمل'},
  'Подтверждено': {ru:'Подтверждено',en:'Confirmed',uz:'Tasdiqlangan',tr:'Onaylandı',ar:'مؤكد'},
  'Отменено': {ru:'Отменено',en:'Cancelled',uz:'Bekor qilingan',tr:'İptal edildi',ar:'ملغى'},
  'Загрузка...': {ru:'Загрузка...',en:'Loading...',uz:'Yuklanmoqda...',tr:'Yükleniyor...',ar:'جارٍ التحميل...'},
  'Сохранение...': {ru:'Сохранение...',en:'Saving...',uz:'Saqlanmoqda...',tr:'Kaydediliyor...',ar:'جارٍ الحفظ...'},
  'Сохранить': {ru:'Сохранить',en:'Save',uz:'Saqlash',tr:'Kaydet',ar:'حفظ'},
  'Закрыть': {ru:'Закрыть',en:'Close',uz:'Yopish',tr:'Kapat',ar:'إغلاق'},
  'Текущий бизнес': {ru:'Текущий бизнес',en:'Current business',uz:'Joriy biznes',tr:'Mevcut işletme',ar:'النشاط الحالي'},
  'Мои бизнесы': {ru:'Мои бизнесы',en:'My businesses',uz:'Mening bizneslarim',tr:'İşletmelerim',ar:'أعمالي'},
};

const normalize=(v:string)=>v.replace(/\s+/g,' ').trim();
const reverse=new Map<string,string>();
Object.entries(T).forEach(([source,values])=>Object.entries(values).forEach(([lang,value])=>reverse.set(`${lang}|${normalize(value)}`,source)));
const localized=(source:string)=>T[source]?.[language]||source;
const translateText=(value:string)=>{const n=normalize(value);if(!n)return value;const source=reverse.get(`${language}|${n}`)||(T[n]?n:'');return source?localized(source):value;};

const translateDom=()=>{
  const walker=document.createTreeWalker(document.body,NodeFilter.SHOW_TEXT);const nodes:Node[]=[];let node:Node|null;
  while((node=walker.nextNode()))nodes.push(node);
  nodes.forEach((textNode)=>{const parent=textNode.parentElement;if(!parent||parent.closest('[data-bookly-ignore-i18n]'))return;if(parent.tagName==='SCRIPT'||parent.tagName==='STYLE')return;const raw=textNode.nodeValue||'';const value=normalize(raw);if(!value)return;const next=translateText(value);if(next===value)return;const i=raw.indexOf(value);textNode.nodeValue=i>=0?`${raw.slice(0,i)}${next}${raw.slice(i+value.length)}`:next;});
  document.querySelectorAll('input,textarea,select,option,[title],[aria-label]').forEach((node)=>{const el=node as HTMLElement;if(el.closest('[data-bookly-ignore-i18n]'))return;const field=el as HTMLInputElement|HTMLTextAreaElement;const p=field.getAttribute('placeholder');if(p)field.setAttribute('placeholder',translateText(p));const title=el.getAttribute('title');if(title)el.setAttribute('title',translateText(title));const aria=el.getAttribute('aria-label');if(aria)el.setAttribute('aria-label',translateText(aria));});
  document.documentElement.lang=language;document.documentElement.dir=language==='ar'?'rtl':'ltr';document.body.dir=language==='ar'?'rtl':'ltr';
};

type Mode='client'|'owner'|'home';
const getMode=():Mode=>{if(document.querySelector('.business-head'))return'owner';const start=window.Telegram?.WebApp?.initDataUnsafe?.start_param||new URLSearchParams(location.search).get('startapp')||'';if(start||document.querySelector('#booking-form')||Array.from(document.querySelectorAll('summary')).some((x)=>/Мои записи|My bookings|Mening bronlarim|Randevularım|حجوزاتي/.test(x.textContent||'')))return'client';return'home';};
const candidates=(source:string)=>Object.values(T[source]||{});
const findTab=(source:string)=>{const c=candidates(source);return(Array.from(document.querySelectorAll('.tabs button'))as HTMLButtonElement[]).find((b)=>c.includes(normalize(b.textContent||'')));};
const openDetails=(source:string)=>{const c=candidates(source);const s=Array.from(document.querySelectorAll('summary')).find((x)=>c.some((v)=>String(x.textContent||'').includes(v)))as HTMLElement|undefined;if(!s)return;const d=s.parentElement as HTMLDetailsElement|null;if(d)d.open=true;s.scrollIntoView({behavior:'smooth',block:'start'});};

const createProfile=()=>{document.getElementById('bookly-ux2-profile')?.remove();const mode=getMode();const overlay=document.createElement('div');overlay.id='bookly-ux2-profile';overlay.className='ux2-overlay';overlay.dataset.booklyIgnoreI18n='true';const card=document.createElement('div');card.className='ux2-profile-card ux2-profile-card-full';card.dir=language==='ar'?'rtl':'ltr';const title=document.createElement('h2');title.textContent=mode==='owner'?localized('Настройки'):localized('Мои записи');card.appendChild(title);const rows:Array<[string,string,()=>void]>=mode==='owner'?[['Записи','Предстоящие',()=>findTab('Записи')?.click()],['Услуги','Управление услугами',()=>findTab('Услуги')?.click()],['График','Рабочие часы',()=>findTab('График')?.click()],['Блокировки','Закрытые интервалы',()=>findTab('Блокировки')?.click()],['Настройки','Информация и контакты',()=>findTab('Настройки')?.click()],['Подписка','Bookly Pro',()=>openDetails('Подписка')]]:[['Мои записи','Ваши бронирования',()=>openDetails('Мои записи')],['Сохранённые бизнесы','Ваши сохранённые места',()=>openDetails('Сохранённые бизнесы')]];rows.forEach(([key,sub,onClick])=>{const r=document.createElement('button');r.type='button';r.className='ux2-profile-row';r.innerHTML=`<span class="ux2-profile-row-copy"><strong>${localized(key)}</strong><small>${sub}</small></span><span class="ux2-profile-row-arrow">›</span>`;r.onclick=()=>{overlay.remove();onClick();};card.appendChild(r);});const close=document.createElement('button');close.type='button';close.className='ux2-close';close.textContent='×';close.onclick=()=>overlay.remove();card.appendChild(close);overlay.appendChild(card);overlay.onclick=(e)=>{if(e.target===overlay)overlay.remove();};document.body.appendChild(overlay);};

let pickerOpen=false;
const renderPicker=()=>{document.getElementById('bookly-ux2-language-picker')?.remove();const root=document.createElement('div');root.id='bookly-ux2-language-picker';root.className='ux2-topbar';root.dataset.booklyIgnoreI18n='true';const wrap=document.createElement('div');wrap.className='ux2-language-picker-wrap';const trigger=document.createElement('button');trigger.type='button';trigger.className='ux2-language-trigger';trigger.innerHTML=`<span class="ux2-language-globe">◎</span><span>${SUPPORTED_LANGUAGES.find((x)=>x.code===language)?.nativeLabel||language}</span><span class="ux2-language-chevron">⌄</span>`;trigger.onclick=()=>{pickerOpen=!pickerOpen;renderPicker();};wrap.appendChild(trigger);if(pickerOpen){const panel=document.createElement('div');panel.className='ux2-language-picker-card';panel.dir=language==='ar'?'rtl':'ltr';SUPPORTED_LANGUAGES.forEach((item)=>{const b=document.createElement('button');b.type='button';b.className=`ux2-language-option${item.code===language?' active':''}`;b.dir=item.dir;b.innerHTML=`<span>${item.nativeLabel}</span><span>${item.code===language?'✓':''}</span>`;b.onclick=()=>{language=item.code;setStoredLanguage(language);applyLanguageDirection(language);pickerOpen=false;translateDom();renderPicker();renderRuntime(true);};panel.appendChild(b);});wrap.appendChild(panel);}root.appendChild(wrap);document.body.appendChild(root);};

const navigate=(action:string)=>{const mode=getMode();if(action==='profile'){createProfile();return;}if(mode==='client'){if(action==='bookings'){openDetails('Мои записи');return;}if(action==='saved'){openDetails('Сохранённые бизнесы');return;}if(action==='home'){scrollTo({top:0,behavior:'smooth'});return;}}if(mode==='owner'){if(action==='bookings'){findTab('Записи')?.click();return;}if(action==='services'){findTab('Услуги')?.click();return;}if(action==='home'){scrollTo({top:0,behavior:'smooth'});return;}}};

let lastMode:Mode='home';let signature='';let navBound=false;let queued=false;
const renderRuntime=(force=false)=>{translateDom();renderPicker();const mode=getMode();if(mode==='home'){document.getElementById('bookly-ux2-nav')?.remove();signature='home';return;}let nav=document.getElementById('bookly-ux2-nav')as HTMLElement|null;if(!nav){nav=document.createElement('nav');nav.id='bookly-ux2-nav';nav.className='bookly-bottom-nav ux2-bottom-nav';nav.dataset.booklyIgnoreI18n='true';nav.setAttribute('aria-label','Bookly navigation');document.body.appendChild(nav);}const items:Array<[string,string,string]>=mode==='client'?[['home','⌂','Главная'],['saved','♡','Сохранённые'],['bookings','◷','Записи'],['profile','◯','Профиль']]:[['home','⌂','Главная'],['bookings','◷','Записи'],['services','✦','Услуги'],['profile','◯','Профиль']];const sig=`${mode}|${language}|${items.map(([a,,s])=>a+':'+localized(s)).join('|')}`;if(force||sig!==signature){nav.innerHTML='';items.forEach(([action,icon,source])=>{const b=document.createElement('button');b.type='button';b.dataset.action=action;b.setAttribute('aria-label',localized(source));b.innerHTML=`<span aria-hidden="true">${icon}</span><strong>${localized(source)}</strong>`;nav!.appendChild(b);});signature=sig;}if(!navBound){nav.addEventListener('click',(e)=>{const target=e.target as HTMLElement|null;const b=target?.closest('button[data-action]')as HTMLButtonElement|null;if(!b)return;e.preventDefault();e.stopPropagation();navigate(b.dataset.action||'');});navBound=true;}if(mode!==lastMode){scrollTo({top:0,behavior:'auto'});lastMode=mode;}};
const schedule=()=>{if(queued)return;queued=true;requestAnimationFrame(()=>{queued=false;renderRuntime(false);});};
new MutationObserver(schedule).observe(document.body,{childList:true,subtree:true,characterData:true,attributes:true,attributeFilter:['placeholder','title','aria-label']});
setTimeout(()=>renderRuntime(true),100);setInterval(()=>renderRuntime(false),1000);
