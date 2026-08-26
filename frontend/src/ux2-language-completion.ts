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
  'Настройка бизнеса': {ru:'Настройка бизнеса',en:'Business setup',uz:'Biznesni sozlash',tr:'İşletme kurulumu',ar:'إعداد النشاط'},
  'Выполните основные шаги настройки.': {ru:'Выполните основные шаги настройки.',en:'Complete the main setup steps.',uz:'Asosiy sozlash bosqichlarini bajaring.',tr:'Ana kurulum adımlarını tamamlayın.',ar:'أكمل خطوات الإعداد الأساسية.'},
  'Эта инструкция доступна на всех вкладках.': {ru:'Эта инструкция доступна на всех вкладках.',en:'This guide is available on all tabs.',uz:'Bu yo‘riqnoma barcha bo‘limlarda mavjud.',tr:'Bu rehber tüm sekmelerde kullanılabilir.',ar:'هذا الدليل متاح في جميع علامات التبويب.'},
  '1. Основная информация': {ru:'1. Основная информация',en:'1. Basic information',uz:'1. Asosiy ma’lumotlar',tr:'1. Temel bilgiler',ar:'1. المعلومات الأساسية'},
  'Проверьте название, описание,': {ru:'Проверьте название, описание,',en:'Check the name, description,',uz:'Nom, tavsif,',tr:'Adı, açıklamayı,',ar:'تحقق من الاسم والوصف،'},
  'телефон, адрес и фотографию бизнеса.': {ru:'телефон, адрес и фотографию бизнеса.',en:'phone, address and business photo.',uz:'telefon, manzil va biznes suratini tekshiring.',tr:'telefon, adres ve işletme fotoğrafını kontrol edin.',ar:'الهاتف والعنوان وصورة النشاط.'},
  'Настроить →': {ru:'Настроить →',en:'Set up →',uz:'Sozlash →',tr:'Kur →',ar:'إعداد ←'},
  '2. Фотография': {ru:'2. Фотография',en:'2. Photo',uz:'2. Surat',tr:'2. Fotoğraf',ar:'2. الصورة'},
  'Добавьте фотографию бизнеса,': {ru:'Добавьте фотографию бизнеса,',en:'Add a business photo,',uz:'Biznes suratini qo‘shing,',tr:'İşletme fotoğrafı ekleyin,',ar:'أضف صورة للنشاط،'},
  'чтобы клиентам было проще его узнать.': {ru:'чтобы клиентам было проще его узнать.',en:'so clients can recognize it more easily.',uz:'mijozlar uni osonroq tanishi uchun.',tr:'müşterilerin işletmeyi daha kolay tanıması için.',ar:'حتى يتمكن العملاء من التعرّف عليه بسهولة.'},
  'Добавить фото →': {ru:'Добавить фото →',en:'Add photo →',uz:'Surat qo‘shish →',tr:'Fotoğraf ekle →',ar:'إضافة صورة ←'},
  '3. Услуги': {ru:'3. Услуги',en:'3. Services',uz:'3. Xizmatlar',tr:'3. Hizmetler',ar:'3. الخدمات'},
  'Добавьте услуги, цены и': {ru:'Добавьте услуги, цены и',en:'Add services, prices and',uz:'Xizmatlar, narxlar va',tr:'Hizmetleri, fiyatları ve',ar:'أضف الخدمات والأسعار و'},
  'продолжительность записи.': {ru:'продолжительность записи.',en:'booking duration.',uz:'bron davomiyligini qo‘shing.',tr:'rezervasyon süresini ekleyin.',ar:'مدة الحجز.'},
  'Добавить услуги →': {ru:'Добавить услуги →',en:'Add services →',uz:'Xizmat qo‘shish →',tr:'Hizmet ekle →',ar:'إضافة خدمات ←'},
  '4. График работы': {ru:'4. График работы',en:'4. Work schedule',uz:'4. Ish jadvali',tr:'4. Çalışma programı',ar:'4. جدول العمل'},
  'Укажите рабочие дни и часы,': {ru:'Укажите рабочие дни и часы,',en:'Set the working days and hours',uz:'Ish kunlari va soatlarini belgilang',tr:'Çalışma günlerini ve saatlerini belirtin',ar:'حدد أيام وساعات العمل'},
  'когда клиенты могут записываться.': {ru:'когда клиенты могут записываться.',en:'when clients can book.',uz:'mijozlar bron qilishi mumkin bo‘lgan vaqtni.',tr:'müşterilerin rezervasyon yapabileceği zamanı.',ar:'التي يمكن للعملاء الحجز خلالها.'},
  'Настроить график →': {ru:'Настроить график →',en:'Set schedule →',uz:'Jadvalni sozlash →',tr:'Programı ayarla →',ar:'إعداد الجدول ←'},
  '5. Блокировки': {ru:'5. Блокировки',en:'5. Blocked times',uz:'5. Bloklangan vaqtlar',tr:'5. Engellenen zamanlar',ar:'5. الأوقات المحظورة'},
  'Временно закрывайте время для записей,': {ru:'Временно закрывайте время для записей,',en:'Temporarily block booking times',uz:'Bronlar uchun vaqtni vaqtincha yoping,',tr:'Rezervasyon saatlerini geçici olarak kapatın,',ar:'احظر أوقات الحجز مؤقتًا،'},
  'когда бизнес не принимает клиентов.': {ru:'когда бизнес не принимает клиентов.',en:'when the business is not accepting clients.',uz:'biznes mijozlarni qabul qilmayotganda.',tr:'işletme müşteri kabul etmediğinde.',ar:'عندما لا يستقبل النشاط العملاء.'},
  'Добавить блокировку →': {ru:'Добавить блокировку →',en:'Add blocked time →',uz:'Bloklash qo‘shish →',tr:'Engelleme ekle →',ar:'إضافة حظر ←'},
  'Как это работает': {ru:'Как это работает',en:'How it works',uz:'Bu qanday ishlaydi',tr:'Nasıl çalışır',ar:'كيف يعمل'},
  'Сначала настройте бизнес, услуги и расписание.': {ru:'Сначала настройте бизнес, услуги и расписание.',en:'First set up your business, services and schedule.',uz:'Avval biznes, xizmatlar va jadvalni sozlang.',tr:'Önce işletmenizi, hizmetlerinizi ve programınızı ayarlayın.',ar:'ابدأ بإعداد النشاط والخدمات والجدول.'},
  'После этого Bookly будет готов к работе внутри админки.': {ru:'После этого Bookly будет готов к работе внутри админки.',en:'After that, Bookly will be ready to use in the admin panel.',uz:'Shundan so‘ng Bookly admin panelda ishlashga tayyor bo‘ladi.',tr:'Bundan sonra Bookly yönetim panelinde kullanıma hazır olur.',ar:'بعد ذلك سيكون Bookly جاهزًا للاستخدام داخل لوحة الإدارة.'},
  'Клиенты смогут самостоятельно записываться': {ru:'Клиенты смогут самостоятельно записываться',en:'Clients will be able to book independently',uz:'Mijozlar mustaqil ravishda bron qilishlari mumkin',tr:'Müşteriler bağımsız olarak rezervasyon yapabilecek',ar:'سيتمكن العملاء من الحجز بأنفسهم'},
  'только после активации Bookly Pro.': {ru:'только после активации Bookly Pro.',en:'only after Bookly Pro is activated.',uz:'faqat Bookly Pro faollashtirilgandan keyin.',tr:'yalnızca Bookly Pro etkinleştirildikten sonra.',ar:'فقط بعد تفعيل Bookly Pro.'},
  'Bookly Pro': {ru:'Bookly Pro',en:'Bookly Pro',uz:'Bookly Pro',tr:'Bookly Pro',ar:'Bookly Pro'},
  'Админкой можно пользоваться без подписки.': {ru:'Админкой можно пользоваться без подписки.',en:'You can use the admin panel without a subscription.',uz:'Admin paneldan obunasiz foydalanishingiz mumkin.',tr:'Yönetim panelini abonelik olmadan kullanabilirsiniz.',ar:'يمكنك استخدام لوحة الإدارة بدون اشتراك.'},
  'Bookly Pro нужен для клиентского доступа.': {ru:'Bookly Pro нужен для клиентского доступа.',en:'Bookly Pro is required for client access.',uz:'Mijozlar uchun kirish Bookly Pro talab qiladi.',tr:'Müşteri erişimi için Bookly Pro gereklidir.',ar:'يتطلب وصول العملاء تفعيل Bookly Pro.'},
  'Клиентская страница': {ru:'Клиентская страница',en:'Client page',uz:'Mijoz sahifasi',tr:'Müşteri sayfası',ar:'صفحة العميل'},
  'Персональная ссылка': {ru:'Персональная ссылка',en:'Personal link',uz:'Shaxsiy havola',tr:'Kişisel bağlantı',ar:'رابط شخصي'},
  'QR-код бизнеса': {ru:'QR-код бизнеса',en:'Business QR code',uz:'Biznes QR-kodi',tr:'İşletme QR kodu',ar:'رمز QR للنشاط'},
  'Онлайн-записи': {ru:'Онлайн-записи',en:'Online bookings',uz:'Onlayn bronlar',tr:'Online rezervasyonlar',ar:'الحجوزات عبر الإنترنت'},
  'Уведомления о новых записях': {ru:'Уведомления о новых записях',en:'New booking notifications',uz:'Yangi bron bildirishnomalari',tr:'Yeni rezervasyon bildirimleri',ar:'إشعارات الحجوزات الجديدة'},
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
