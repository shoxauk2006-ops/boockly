import './ux2.css';
import {
  Language,
  SUPPORTED_LANGUAGES,
  translations,
  createTranslator,
  detectLanguage,
  setStoredLanguage,
  applyLanguageDirection,
} from './i18n';

let language: Language = detectLanguage();
applyLanguageDirection(language);

type Mode = 'client' | 'owner' | 'home';

const legacyText: Record<string, Record<Language, string>> = {
  'Адрес не указан': { ru: 'Адрес не указан', en: 'Address not provided', uz: 'Manzil ko‘rsatilmagan', tr: 'Adres belirtilmedi', ar: 'العنوان غير مذكور' },
  'Booking inside Telegram': { ru: 'Бронирование в Telegram', en: 'Booking inside Telegram', uz: 'Telegram ichida bron qilish', tr: 'Telegram içinde rezervasyon', ar: 'الحجز داخل تيليجرام' },
  'Бронирование без звонков': { ru: 'Бронирование без звонков', en: 'Booking without calls', uz: 'Qo‘ng‘iroqlarsiz bron qilish', tr: 'Arama yapmadan rezervasyon', ar: 'حجز بدون مكالمات' },
  'Bookly помогает бизнесу принимать записи прямо в Telegram.': { ru: 'Bookly помогает бизнесу принимать записи прямо в Telegram.', en: 'Bookly helps businesses accept appointments directly in Telegram.', uz: 'Bookly bizneslarga Telegram ichida to‘g‘ridan-to‘g‘ri bron qabul qilishga yordam beradi.', tr: 'Bookly işletmelerin doğrudan Telegram üzerinden randevu almasını sağlar.', ar: 'يساعد Bookly الأنشطة التجارية على استقبال الحجوزات مباشرةً داخل تيليجرام.' },
  'Открыть админ-панель': { ru: 'Открыть админ-панель', en: 'Open admin panel', uz: 'Admin panelni ochish', tr: 'Yönetim panelini aç', ar: 'فتح لوحة الإدارة' },
  'Открыть страницу бизнеса': { ru: 'Открыть страницу бизнеса', en: 'Open business page', uz: 'Biznes sahifasini ochish', tr: 'İşletme sayfasını aç', ar: 'فتح صفحة النشاط' },
  'Ссылка или slug бизнеса': { ru: 'Ссылка или slug бизнеса', en: 'Business link or slug', uz: 'Biznes havolasi yoki slug', tr: 'İşletme bağlantısı veya slug', ar: 'رابط النشاط أو slug' },
  'Открыть': { ru: 'Открыть', en: 'Open', uz: 'Ochish', tr: 'Aç', ar: 'فتح' },
  'Сохранённые бизнесы': { ru: 'Сохранённые бизнесы', en: 'Saved businesses', uz: 'Saqlangan bizneslar', tr: 'Kaydedilen işletmeler', ar: 'الأنشطة المحفوظة' },
  'Здесь появятся бизнесы, которые вы сохраните.': { ru: 'Здесь появятся бизнесы, которые вы сохраните.', en: 'Businesses you save will appear here.', uz: 'Siz saqlagan bizneslar shu yerda ko‘rinadi.', tr: 'Kaydettiğiniz işletmeler burada görünür.', ar: 'ستظهر هنا الأنشطة التي تحفظها.' },
  'Мои записи': { ru: 'Мои записи', en: 'My bookings', uz: 'Mening bronlarim', tr: 'Randevularım', ar: 'حجوزاتي' },
  'Добавить услугу': { ru: 'Добавить услугу', en: 'Add service', uz: 'Xizmat qo‘shish', tr: 'Hizmet ekle', ar: 'إضافة خدمة' },
  'Добавить бизнес': { ru: 'Добавить бизнес', en: 'Add business', uz: 'Biznes qo‘shish', tr: 'İşletme ekle', ar: 'إضافة نشاط' },
  'Создать новый бизнес': { ru: 'Создать новый бизнес', en: 'Create new business', uz: 'Yangi biznes yaratish', tr: 'Yeni işletme oluştur', ar: 'إنشاء نشاط جديد' },
  'Название бизнеса': { ru: 'Название бизнеса', en: 'Business name', uz: 'Biznes nomi', tr: 'İşletme adı', ar: 'اسم النشاط' },
  'Описание бизнеса': { ru: 'Описание бизнеса', en: 'Business description', uz: 'Biznes tavsifi', tr: 'İşletme açıklaması', ar: 'وصف النشاط' },
  'Телефон бизнеса': { ru: 'Телефон бизнеса', en: 'Business phone', uz: 'Biznes telefoni', tr: 'İşletme telefonu', ar: 'هاتف النشاط' },
  'Номер телефона бизнеса': { ru: 'Номер телефона бизнеса', en: 'Business phone number', uz: 'Biznes telefon raqami', tr: 'İşletme telefon numarası', ar: 'رقم هاتف النشاط' },
  'Адрес бизнеса': { ru: 'Адрес бизнеса', en: 'Business address', uz: 'Biznes manzili', tr: 'İşletme adresi', ar: 'عنوان النشاط' },
  'Сохранить настройки': { ru: 'Сохранить настройки', en: 'Save settings', uz: 'Sozlamalarni saqlash', tr: 'Ayarları kaydet', ar: 'حفظ الإعدادات' },
  'Сохранить контакты': { ru: 'Сохранить контакты', en: 'Save contacts', uz: 'Kontaktlarni saqlash', tr: 'İletişim bilgilerini kaydet', ar: 'حفظ بيانات الاتصال' },
  'Настройки бизнеса': { ru: 'Настройки бизнеса', en: 'Business settings', uz: 'Biznes sozlamalari', tr: 'İşletme ayarları', ar: 'إعدادات النشاط' },
  'Активен': { ru: 'Активен', en: 'Active', uz: 'Faol', tr: 'Aktif', ar: 'نشط' },
  'Подписка': { ru: 'Подписка', en: 'Subscription', uz: 'Obuna', tr: 'Abonelik', ar: 'الاشتراك' },
  'Всего записей': { ru: 'Всего записей', en: 'Total bookings', uz: 'Jami bronlar', tr: 'Toplam randevu', ar: 'إجمالي الحجوزات' },
  'Записи': { ru: 'Записи', en: 'Bookings', uz: 'Bronlar', tr: 'Randevular', ar: 'الحجوزات' },
  'Услуги': { ru: 'Услуги', en: 'Services', uz: 'Xizmatlar', tr: 'Hizmetler', ar: 'الخدمات' },
  'График': { ru: 'График', en: 'Schedule', uz: 'Jadval', tr: 'Çalışma saatleri', ar: 'الجدول' },
  'Блокировки': { ru: 'Блокировки', en: 'Blocked times', uz: 'Bloklangan vaqtlar', tr: 'Engellenen saatler', ar: 'الأوقات المحجوزة' },
  'Настройки': { ru: 'Настройки', en: 'Settings', uz: 'Sozlamalar', tr: 'Ayarlar', ar: 'الإعدادات' },
  'Сегодня': { ru: 'Сегодня', en: 'Today', uz: 'Bugun', tr: 'Bugün', ar: 'اليوم' },
  'Предстоящие': { ru: 'Предстоящие', en: 'Upcoming', uz: 'Kelgusi', tr: 'Yaklaşan', ar: 'القادمة' },
  'Прошедшие': { ru: 'Прошедшие', en: 'Past', uz: 'O‘tgan', tr: 'Geçmiş', ar: 'السابقة' },
  'Дата': { ru: 'Дата', en: 'Date', uz: 'Sana', tr: 'Tarih', ar: 'التاريخ' },
  'Все': { ru: 'Все', en: 'All', uz: 'Barchasi', tr: 'Tümü', ar: 'الكل' },
  'Сохранено': { ru: 'Сохранено', en: 'Saved', uz: 'Saqlandi', tr: 'Kaydedildi', ar: 'تم الحفظ' },
  'Выберите услугу ниже, чтобы записаться.': { ru: 'Выберите услугу ниже, чтобы записаться.', en: 'Choose a service below to book.', uz: 'Bron qilish uchun quyidagi xizmatni tanlang.', tr: 'Rezervasyon yapmak için aşağıdan bir hizmet seçin.', ar: 'اختر خدمة أدناه للحجز.' },
  'У этого бизнеса пока нет доступных услуг.': { ru: 'У этого бизнеса пока нет доступных услуг.', en: 'This business has no available services yet.', uz: 'Bu biznesda hozircha mavjud xizmatlar yo‘q.', tr: 'Bu işletmede henüz uygun hizmet yok.', ar: 'لا توجد خدمات متاحة لهذا النشاط بعد.' },
  'Сохранить бизнес': { ru: 'Сохранить бизнес', en: 'Save business', uz: 'Biznesni saqlash', tr: 'İşletmeyi kaydet', ar: 'حفظ النشاط' },
  'Поделиться': { ru: 'Поделиться', en: 'Share', uz: 'Ulashish', tr: 'Paylaş', ar: 'مشاركة' },
  'Копировать': { ru: 'Копировать', en: 'Copy', uz: 'Nusxalash', tr: 'Kopyala', ar: 'نسخ' },
  'Копировать ссылку': { ru: 'Копировать ссылку', en: 'Copy link', uz: 'Havolani nusxalash', tr: 'Bağlantıyı kopyala', ar: 'نسخ الرابط' },
  'QR-код': { ru: 'QR-код', en: 'QR code', uz: 'QR-kod', tr: 'QR kodu', ar: 'رمز QR' },
  'Сохранить QR-код': { ru: 'Сохранить QR-код', en: 'Save QR code', uz: 'QR-kodni saqlash', tr: 'QR kodunu kaydet', ar: 'حفظ رمز QR' },
  'Выбрать': { ru: 'Выбрать', en: 'Choose', uz: 'Tanlash', tr: 'Seç', ar: 'اختيار' },
  'Выберите дату': { ru: 'Выберите дату', en: 'Choose a date', uz: 'Sanani tanlang', tr: 'Tarih seçin', ar: 'اختر التاريخ' },
  'Выберите время': { ru: 'Выберите время', en: 'Choose a time', uz: 'Vaqtni tanlang', tr: 'Saat seçin', ar: 'اختر الوقت' },
  'Ваше имя': { ru: 'Ваше имя', en: 'Your name', uz: 'Ismingiz', tr: 'Adınız', ar: 'اسمك' },
  'Номер телефона': { ru: 'Номер телефона', en: 'Phone number', uz: 'Telefon raqami', tr: 'Telefon numarası', ar: 'رقم الهاتف' },
  'Подтвердить запись': { ru: 'Подтвердить запись', en: 'Confirm booking', uz: 'Bronni tasdiqlash', tr: 'Randevuyu onayla', ar: 'تأكيد الحجز' },
  'Выбрать услугу': { ru: 'Выбрать услугу', en: 'Choose service', uz: 'Xizmatni tanlash', tr: 'Hizmet seç', ar: 'اختيار الخدمة' },
  'Добавить запись': { ru: 'Добавить запись', en: 'Add booking', uz: 'Bron qo‘shish', tr: 'Randevu ekle', ar: 'إضافة حجز' },
  'Новая запись': { ru: 'Новая запись', en: 'New booking', uz: 'Yangi bron', tr: 'Yeni randevu', ar: 'حجز جديد' },
  'Отменить': { ru: 'Отменить', en: 'Cancel', uz: 'Bekor qilish', tr: 'İptal', ar: 'إلغاء' },
  'Завершено': { ru: 'Завершено', en: 'Completed', uz: 'Yakunlangan', tr: 'Tamamlandı', ar: 'مكتمل' },
  'Подтверждено': { ru: 'Подтверждено', en: 'Confirmed', uz: 'Tasdiqlangan', tr: 'Onaylandı', ar: 'مؤكد' },
  'Отменено': { ru: 'Отменено', en: 'Cancelled', uz: 'Bekor qilingan', tr: 'İptal edildi', ar: 'ملغى' },
  'Загрузка...': { ru: 'Загрузка...', en: 'Loading...', uz: 'Yuklanmoqda...', tr: 'Yükleniyor...', ar: 'جارٍ التحميل...' },
  'Сохранение...': { ru: 'Сохранение...', en: 'Saving...', uz: 'Saqlanmoqda...', tr: 'Kaydediliyor...', ar: 'جارٍ الحفظ...' },
};

const normalize = (value: string) => value.replace(/\s+/g, ' ').trim();
const localizedValueToKey = new Map<string, string>();
Object.entries(translations).forEach(([lang, map]) => {
  Object.entries(map).forEach(([key, value]) => localizedValueToKey.set(`${lang}|${normalize(value)}`, key));
});
Object.entries(legacyText).forEach(([source, values]) => {
  Object.entries(values).forEach(([lang, value]) => localizedValueToKey.set(`${lang}|${normalize(value)}`, `legacy:${source}`));
});

const translateKnown = (value: string, to: Language) => {
  const original = value;
  const clean = normalize(value);
  if (!clean) return original;

  let key: string | undefined;
  for (const lang of Object.keys(translations) as Language[]) {
    key = localizedValueToKey.get(`${lang}|${clean}`);
    if (key) break;
  }

  if (!key) return original;
  if (key.startsWith('legacy:')) return legacyText[key.slice(7)]?.[to] || original;
  return translations[to]?.[key] || translations.en?.[key] || original;
};

let translating = false;
const translatePage = () => {
  if (translating) return;
  translating = true;
  try {
    const walker = document.createTreeWalker(document.body, NodeFilter.SHOW_TEXT);
    const nodes: Text[] = [];
    let node: Node | null;
    while ((node = walker.nextNode())) nodes.push(node as Text);

    nodes.forEach((textNode) => {
      const parent = textNode.parentElement;
      if (!parent) return;
      if (['SCRIPT', 'STYLE', 'NOSCRIPT'].includes(parent.tagName)) return;
      if (parent.closest('#bookly-ux2-nav, #bookly-ux2-topbar, #bookly-ux2-profile, #bookly-ux2-language-picker')) return;
      const next = translateKnown(textNode.nodeValue || '', language);
      if (next !== textNode.nodeValue) textNode.nodeValue = next;
    });

    document.querySelectorAll('input[placeholder], textarea[placeholder]').forEach((element) => {
      const input = element as HTMLInputElement | HTMLTextAreaElement;
      input.placeholder = translateKnown(input.placeholder, language);
    });

    document.querySelectorAll('[aria-label]').forEach((element) => {
      const value = element.getAttribute('aria-label');
      if (value) element.setAttribute('aria-label', translateKnown(value, language));
    });
  } finally {
    translating = false;
  }
};

const getMode = (): Mode => {
  if (document.querySelector('.business-head')) return 'owner';
  const startParam = window.Telegram?.WebApp?.initDataUnsafe?.start_param || new URLSearchParams(window.location.search).get('startapp') || '';
  if (startParam || document.querySelector('#booking-form') || Array.from(document.querySelectorAll('summary')).some((item) => /Мои записи|My bookings|Mening bronlarim|Randevularım|حجوزاتي/.test(item.textContent || ''))) return 'client';
  return 'home';
};

const findTabButton = (labels: string[]) => {
  const buttons = Array.from(document.querySelectorAll('.tabs button')) as HTMLButtonElement[];
  return buttons.find((button) => labels.includes(normalize(button.textContent || '')));
};

const openDetailsByText = (labels: string[]) => {
  const summary = Array.from(document.querySelectorAll('summary')).find((item) => labels.some((label) => (item.textContent || '').includes(label))) as HTMLElement | undefined;
  if (!summary) return;
  const details = summary.parentElement as HTMLDetailsElement | null;
  if (details) details.open = true;
  summary.scrollIntoView({ behavior: 'smooth', block: 'start' });
};

const currentLanguageName = () => SUPPORTED_LANGUAGES.find((item) => item.code === language)?.nativeLabel || 'English';

const createLanguagePicker = () => {
  const existing = document.getElementById('bookly-ux2-language-picker');
  if (existing) existing.remove();

  const t = createTranslator(language);
  const overlay = document.createElement('div');
  overlay.id = 'bookly-ux2-language-picker';
  overlay.className = 'ux2-overlay';

  const card = document.createElement('div');
  card.className = 'ux2-profile-card ux2-language-picker-card';
  card.dir = language === 'ar' ? 'rtl' : 'ltr';

  const header = document.createElement('div');
  header.className = 'ux2-profile-header';
  const title = document.createElement('h2');
  title.textContent = t('language.title');
  const close = document.createElement('button');
  close.type = 'button';
  close.className = 'ux2-close';
  close.textContent = '×';
  close.onclick = () => overlay.remove();
  header.append(title, close);

  const list = document.createElement('div');
  list.className = 'ux2-language-list';
  SUPPORTED_LANGUAGES.forEach((item) => {
    const option = document.createElement('button');
    option.type = 'button';
    option.className = `ux2-language-option${item.code === language ? ' active' : ''}`;
    option.dir = item.dir;
    option.innerHTML = `<span>${item.nativeLabel}</span><span>${item.code === language ? '✓' : ''}</span>`;
    option.onclick = () => {
      language = item.code;
      setStoredLanguage(language);
      applyLanguageDirection(language);
      overlay.remove();
      renderRuntime(true);
    };
    list.appendChild(option);
  });

  card.append(header, list);
  overlay.appendChild(card);
  overlay.onclick = (event) => { if (event.target === overlay) overlay.remove(); };
  document.body.appendChild(overlay);
};

const renderLanguageBar = () => {
  let bar = document.getElementById('bookly-ux2-topbar') as HTMLElement | null;
  if (!bar) {
    bar = document.createElement('div');
    bar.id = 'bookly-ux2-topbar';
    bar.className = 'ux2-topbar';
    document.body.appendChild(bar);
  }

  bar.setAttribute('dir', language === 'ar' ? 'rtl' : 'ltr');
  bar.innerHTML = '';
  const button = document.createElement('button');
  button.type = 'button';
  button.className = 'ux2-language-trigger';
  button.setAttribute('aria-label', `${createTranslator(language)('language.title')}: ${currentLanguageName()}`);
  button.innerHTML = `<span class="ux2-language-globe">◎</span><span>${currentLanguageName()}</span><span class="ux2-language-chevron">⌄</span>`;
  button.onclick = createLanguagePicker;
  bar.appendChild(button);
};

const createProfileOverlay = () => {
  const existing = document.getElementById('bookly-ux2-profile');
  if (existing) existing.remove();
  const t = createTranslator(language);
  const mode = getMode();
  const user = window.Telegram?.WebApp?.initDataUnsafe?.user || {};
  const displayName = [user.first_name, user.last_name].filter(Boolean).join(' ') || 'Bookly';
  const username = user.username ? `@${user.username}` : 'Telegram';

  const overlay = document.createElement('div');
  overlay.id = 'bookly-ux2-profile';
  overlay.className = 'ux2-overlay';
  const card = document.createElement('div');
  card.className = 'ux2-profile-card ux2-profile-card-full';
  card.dir = language === 'ar' ? 'rtl' : 'ltr';

  const header = document.createElement('div');
  header.className = 'ux2-profile-header';
  header.innerHTML = `<div class="ux2-profile-head-copy"><div class="ux2-profile-avatar">${displayName.charAt(0).toUpperCase()}</div><div><h2>${t('nav.profile')}</h2><p>${username}</p></div></div>`;
  const close = document.createElement('button');
  close.type = 'button'; close.className = 'ux2-close'; close.textContent = '×'; close.onclick = () => overlay.remove();
  header.appendChild(close);
  card.appendChild(header);

  const list = document.createElement('div');
  list.className = 'ux2-profile-list';
  const addRow = (title: string, subtitle: string, action: string) => {
    const row = document.createElement('button');
    row.type = 'button'; row.className = 'ux2-profile-row';
    row.innerHTML = `<span class="ux2-profile-row-copy"><strong>${title}</strong><small>${subtitle}</small></span><span class="ux2-profile-row-arrow">›</span>`;
    row.onclick = () => { overlay.remove(); navigateBottom(action); };
    list.appendChild(row);
  };

  if (mode === 'owner') {
    addRow(t('nav.bookings'), t('owner.upcoming'), 'bookings');
    addRow(t('nav.services'), t('client.services'), 'services');
    addRow(t('nav.schedule'), t('nav.schedule'), 'schedule');
    addRow(t('nav.blocks'), t('nav.blocks'), 'blocks');
    addRow(t('nav.businesses'), t('owner.currentBusiness'), 'businesses');
    addRow(t('nav.settings'), t('settings.businessInfo'), 'settings');
    addRow(t('nav.subscription'), 'Bookly Pro', 'subscription');
  } else {
    addRow(t('client.myBookings'), t('owner.upcoming'), 'bookings');
    addRow(t('client.savedBusinesses'), '❤️', 'saved');
    addRow(t('nav.admin'), 'For business owners', 'admin');
  }

  card.appendChild(list);
  const languageHint = document.createElement('p');
  languageHint.className = 'muted ux2-language-note';
  languageHint.textContent = `${t('language.title')}: ${currentLanguageName()}`;
  card.appendChild(languageHint);
  overlay.appendChild(card);
  overlay.onclick = (event) => { if (event.target === overlay) overlay.remove(); };
  document.body.appendChild(overlay);
};

const navigateBottom = (action: string) => {
  const mode = getMode();
  if (action === 'profile') { createProfileOverlay(); return; }

  if (mode === 'client') {
    if (action === 'bookings') { openDetailsByText(['📅 Мои записи', 'Мои записи', 'My bookings', 'Mening bronlarim', 'Randevularım', 'حجوزاتي']); return; }
    if (action === 'saved') { openDetailsByText(['❤️ Сохранённые бизнесы', 'Сохранённые бизнесы', 'Saved businesses', 'Saqlangan bizneslar', 'Kaydedilen işletmeler', 'الأنشطة المحفوظة']); return; }
    if (action === 'home') { window.scrollTo({ top: 0, behavior: 'smooth' }); return; }
    if (action === 'admin') {
      const button = Array.from(document.querySelectorAll('button')).find((item) => /Админ-панель|Admin panel|Yönetim paneli|Admin paneli|لوحة الإدارة/.test(item.textContent || '')) as HTMLButtonElement | undefined;
      button?.click(); return;
    }
  }

  if (mode === 'owner') {
    const allLabels = [
      'Главная','Home','Ana sayfa','Bosh sahifa','الرئيسية',
      'Услуги','Services','Hizmetler','Xizmatlar','الخدمات',
      'Записи','Bookings','Randevular','Bronlar','الحجوزات',
    ];
    if (action === 'bookings') { findTabButton(allLabels)?.click(); const btn = findTabButton(['Записи','Bookings','Randevular','Bronlar','الحجوزات']); btn?.click(); return; }
    if (action === 'services') { findTabButton(['Услуги','Services','Hizmetler','Xizmatlar','الخدمات'])?.click(); return; }
    if (action === 'home') { findTabButton(['Главная','Home','Ana sayfa','Bosh sahifa','الرئيسية'])?.click(); return; }
    if (action === 'schedule') { findTabButton(['График','Schedule','Jadval','Çalışma saatleri','الجدول'])?.click(); return; }
    if (action === 'blocks') { findTabButton(['Блокировки','Blocked times','Bloklangan vaqtlar','Engellenen saatler','الأوقات المحجوزة'])?.click(); return; }
    if (action === 'settings') { findTabButton(['Настройки','Settings','Sozlamalar','Ayarlar','الإعدادات'])?.click(); return; }
    if (action === 'subscription') { openDetailsByText(['Подписка','Subscription','Obuna','Abonelik','الاشتراك']); return; }
    if (action === 'businesses') {
      const text = Array.from(document.querySelectorAll('*')).find((node) => normalize(node.textContent || '') === 'Текущий бизнес') as HTMLElement | undefined;
      const card = text?.closest('.card') || text?.parentElement;
      (card?.querySelector('button') as HTMLButtonElement | null)?.click(); return;
    }
  }
};

let lastMode: Mode = 'home';
let lastRenderSignature = '';
let navClickBound = false;
let translating = false;

const renderRuntime = (force = false) => {
  const mode = getMode();
  renderLanguageBar();
  translatePage();

  if (mode === 'home') {
    document.getElementById('bookly-ux2-nav')?.remove();
    lastRenderSignature = 'home';
    return;
  }

  const t = createTranslator(language);
  const items = mode === 'client'
    ? [['home','⌂',t('nav.home')],['saved','♡',t('nav.saved')],['bookings','◷',t('nav.bookings')],['profile','◯',t('nav.profile')]]
    : [['home','⌂',t('nav.home')],['bookings','◷',t('nav.bookings')],['services','✦',t('nav.services')],['profile','◯',t('nav.profile')]];

  const signature = `${mode}|${language}|${items.map((item) => `${item[0]}:${item[2]}`).join('|')}`;
  let nav = document.getElementById('bookly-ux2-nav') as HTMLElement | null;
  if (!nav) {
    nav = document.createElement('nav');
    nav.id = 'bookly-ux2-nav';
    nav.className = 'bookly-bottom-nav ux2-bottom-nav';
    nav.setAttribute('aria-label', t('app.name'));
    document.body.appendChild(nav);
  }

  if (force || lastRenderSignature !== signature) {
    nav.innerHTML = '';
    items.forEach(([action, icon, label]) => {
      const button = document.createElement('button');
      button.type = 'button'; button.dataset.action = action; button.setAttribute('aria-label', label);
      button.innerHTML = `<span aria-hidden="true">${icon}</span><strong>${label}</strong>`;
      nav!.appendChild(button);
    });
    lastRenderSignature = signature;
  }

  if (!navClickBound) {
    nav.addEventListener('click', (event) => {
      const target = event.target as HTMLElement | null;
      const button = target?.closest('button[data-action]') as HTMLButtonElement | null;
      if (!button) return;
      event.preventDefault(); event.stopPropagation(); navigateBottom(button.dataset.action || '');
    });
    navClickBound = true;
  }

  if (mode !== lastMode) { window.scrollTo({ top: 0, behavior: 'auto' }); lastMode = mode; }
};

const observer = new MutationObserver(() => {
  if (translating) return;
  window.requestAnimationFrame(() => renderRuntime(false));
});
observer.observe(document.body, { childList: true, subtree: true });
window.setTimeout(() => renderRuntime(true), 150);
window.setInterval(() => renderRuntime(false), 1000);
