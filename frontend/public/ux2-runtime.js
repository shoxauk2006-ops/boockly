(() => {
  const SHELL_ID = 'bookly-personal-shell';
  const ROOT = () => document.getElementById('root');
  const tg = () => window.Telegram?.WebApp;
  const initData = () => tg()?.initData || '';

  const languages = [
    { code: 'ru', label: 'Русский' },
    { code: 'en', label: 'English' },
    { code: 'uz', label: 'O‘zbekcha' },
    { code: 'tr', label: 'Türkçe' },
    { code: 'ar', label: 'العربية' }
  ];

  const tr = {
    ru: {
      home: 'Главная', bookings: 'Записи', saved: 'Сохранённые', profile: 'Профиль',
      greeting: 'С возвращением', subtitle: 'Ваш Bookly — всё важное в одном месте.',
      nextBooking: 'Ближайшая запись', noBookings: 'У вас пока нет записей',
      openBooking: 'Открыть запись', savedTitle: 'Сохранённые места', emptySaved: 'Сохранённых бизнесов пока нет',
      open: 'Открыть', explore: 'Найти место', exploreHint: 'Введите ссылку или slug бизнеса',
      manageBusiness: 'Для бизнеса', manageBusinessHint: 'Управляйте своими записями, услугами и расписанием',
      manage: 'Управлять', yourBusinesses: 'Ваши бизнесы', addBusiness: 'Создать бизнес',
      profileTitle: 'Профиль', account: 'Аккаунт', language: 'Язык', name: 'Имя', username: 'Username',
      support: 'Поддержка', help: 'Помощь', about: 'О Bookly', version: 'Версия',
      allBookings: 'Все записи', upcoming: 'Предстоящие', past: 'Прошедшие',
      loading: 'Загрузка…', retry: 'Повторить', noBusiness: 'У вас пока нет бизнеса',
      close: 'Закрыть', search: 'Открыть', timezone: 'Часовой пояс'
    },
    en: {
      home: 'Home', bookings: 'Bookings', saved: 'Saved', profile: 'Profile',
      greeting: 'Welcome back', subtitle: 'Your Bookly space — everything important in one place.',
      nextBooking: 'Next booking', noBookings: 'You have no bookings yet',
      openBooking: 'Open booking', savedTitle: 'Saved places', emptySaved: 'No saved businesses yet',
      open: 'Open', explore: 'Find a place', exploreHint: 'Enter a business link or slug',
      manageBusiness: 'For business', manageBusinessHint: 'Manage bookings, services and schedule',
      manage: 'Manage', yourBusinesses: 'Your businesses', addBusiness: 'Create business',
      profileTitle: 'Profile', account: 'Account', language: 'Language', name: 'Name', username: 'Username',
      support: 'Support', help: 'Help', about: 'About Bookly', version: 'Version',
      allBookings: 'All bookings', upcoming: 'Upcoming', past: 'Past',
      loading: 'Loading…', retry: 'Retry', noBusiness: 'You do not have a business yet',
      close: 'Close', search: 'Open', timezone: 'Time zone'
    },
    uz: {
      home: 'Bosh sahifa', bookings: 'Bronlar', saved: 'Saqlanganlar', profile: 'Profil',
      greeting: 'Xush kelibsiz', subtitle: 'Bookly — barcha muhim narsalar bir joyda.',
      nextBooking: 'Keyingi bron', noBookings: 'Hozircha bronlaringiz yo‘q',
      openBooking: 'Bronni ochish', savedTitle: 'Saqlangan joylar', emptySaved: 'Saqlangan bizneslar yo‘q',
      open: 'Ochish', explore: 'Joy topish', exploreHint: 'Biznes havolasi yoki slugini kiriting',
      manageBusiness: 'Biznes uchun', manageBusinessHint: 'Bronlar, xizmatlar va jadvalni boshqaring',
      manage: 'Boshqarish', yourBusinesses: 'Bizneslaringiz', addBusiness: 'Biznes yaratish',
      profileTitle: 'Profil', account: 'Hisob', language: 'Til', name: 'Ism', username: 'Username',
      support: 'Yordam', help: 'Yordam', about: 'Bookly haqida', version: 'Versiya',
      allBookings: 'Barcha bronlar', upcoming: 'Kelgusi', past: 'O‘tgan',
      loading: 'Yuklanmoqda…', retry: 'Qayta urinish', noBusiness: 'Hali biznesingiz yo‘q',
      close: 'Yopish', search: 'Ochish', timezone: 'Vaqt mintaqasi'
    },
    tr: {
      home: 'Ana sayfa', bookings: 'Rezervasyonlar', saved: 'Kaydedilenler', profile: 'Profil',
      greeting: 'Tekrar hoş geldiniz', subtitle: 'Bookly alanınız — önemli olan her şey tek yerde.',
      nextBooking: 'Sonraki rezervasyon', noBookings: 'Henüz rezervasyonunuz yok',
      openBooking: 'Rezervasyonu aç', savedTitle: 'Kaydedilen yerler', emptySaved: 'Henüz kaydedilen işletme yok',
      open: 'Aç', explore: 'Bir yer bul', exploreHint: 'İşletme bağlantısı veya slug girin',
      manageBusiness: 'İşletmeler için', manageBusinessHint: 'Rezervasyonları, hizmetleri ve programı yönetin',
      manage: 'Yönet', yourBusinesses: 'İşletmeleriniz', addBusiness: 'İşletme oluştur',
      profileTitle: 'Profil', account: 'Hesap', language: 'Dil', name: 'Ad', username: 'Kullanıcı adı',
      support: 'Destek', help: 'Yardım', about: 'Bookly hakkında', version: 'Sürüm',
      allBookings: 'Tüm rezervasyonlar', upcoming: 'Yaklaşan', past: 'Geçmiş',
      loading: 'Yükleniyor…', retry: 'Tekrar dene', noBusiness: 'Henüz işletmeniz yok',
      close: 'Kapat', search: 'Aç', timezone: 'Saat dilimi'
    },
    ar: {
      home: 'الرئيسية', bookings: 'الحجوزات', saved: 'المحفوظة', profile: 'الملف الشخصي',
      greeting: 'مرحباً بعودتك', subtitle: 'Bookly — كل ما يهمك في مكان واحد.',
      nextBooking: 'الحجز القادم', noBookings: 'لا توجد حجوزات بعد',
      openBooking: 'فتح الحجز', savedTitle: 'الأماكن المحفوظة', emptySaved: 'لا توجد أعمال محفوظة بعد',
      open: 'فتح', explore: 'ابحث عن مكان', exploreHint: 'أدخل رابط النشاط أو الـ slug',
      manageBusiness: 'لأصحاب الأعمال', manageBusinessHint: 'إدارة الحجوزات والخدمات والجدول',
      manage: 'إدارة', yourBusinesses: 'أعمالك', addBusiness: 'إنشاء نشاط',
      profileTitle: 'الملف الشخصي', account: 'الحساب', language: 'اللغة', name: 'الاسم', username: 'اسم المستخدم',
      support: 'الدعم', help: 'المساعدة', about: 'عن Bookly', version: 'الإصدار',
      allBookings: 'كل الحجوزات', upcoming: 'القادمة', past: 'السابقة',
      loading: 'جارٍ التحميل…', retry: 'إعادة المحاولة', noBusiness: 'لا يوجد لديك نشاط بعد',
      close: 'إغلاق', search: 'فتح', timezone: 'المنطقة الزمنية'
    }
  };

  const api = () => {
    const base = import.meta?.env?.VITE_API_URL || document.querySelector('meta[name="bookly-api"]')?.content || '';
    return base || 'https://boockly-3.onrender.com';
  };

  const getLang = () => {
    try { return localStorage.getItem('bookly_language') || 'en'; } catch { return 'en'; }
  };

  const setLang = (lang) => {
    try { localStorage.setItem('bookly_language', lang); } catch {}
    document.documentElement.lang = lang;
    document.documentElement.dir = lang === 'ar' ? 'rtl' : 'ltr';
    const root = ROOT();
    if (root) root.style.display = 'none';
    window.location.reload();
  };

  const text = (key) => (tr[getLang()] || tr.en)[key] || tr.en[key] || key;

  const headers = () => ({
    'Content-Type': 'application/json',
    'X-Telegram-Init-Data': initData(),
    'X-Bookly-Language': getLang()
  });

  const hasStartParam = () => {
    const tgParam = tg()?.initDataUnsafe?.start_param || '';
    const urlParam = new URLSearchParams(window.location.search).get('startapp') || '';
    return Boolean(tgParam || urlParam);
  };

  const rootIsHome = () => {
    const root = ROOT();
    if (!root) return false;
    return !hasStartParam() && root.querySelector('.hero') && root.querySelector('input');
  };

  let data = { bookings: [], saved: [], businesses: [] };
  let nav = 'home';

  const clearRoot = () => {
    const root = ROOT();
    if (root) root.style.display = 'none';
  };

  const shell = () => document.getElementById(SHELL_ID);

  const el = (tag, cls, content) => {
    const n = document.createElement(tag);
    if (cls) n.className = cls;
    if (content != null) n.textContent = content;
    return n;
  };

  const button = (label, cls = 'bookly-primary', onClick) => {
    const b = el('button', cls, label);
    b.type = 'button';
    b.addEventListener('click', onClick);
    return b;
  };

  const formatDate = (day, time) => {
    if (!day) return '';
    try {
      const locale = getLang() === 'ar' ? 'ar-SA' : getLang() === 'tr' ? 'tr-TR' : getLang() === 'uz' ? 'uz-UZ' : getLang() === 'ru' ? 'ru-RU' : 'en-US';
      const d = new Date(`${day}T${(time || '00:00').slice(0,5)}:00`);
      return new Intl.DateTimeFormat(locale, { day:'numeric', month:'short', hour: time ? '2-digit' : undefined, minute: time ? '2-digit' : undefined }).format(d);
    } catch { return `${day}${time ? ` · ${time.slice(0,5)}` : ''}`; }
  };

  const fetchAll = async () => {
    const [bookingsRes, savedRes, businessesRes] = await Promise.allSettled([
      fetch(api() + '/my/bookings', { headers: headers() }),
      fetch(api() + '/my/saved-businesses', { headers: headers() }),
      fetch(api() + '/admin/businesses', { headers: headers() })
    ]);
    data.bookings = bookingsRes.status === 'fulfilled' && bookingsRes.value.ok ? await bookingsRes.value.json().catch(() => []) : [];
    data.saved = savedRes.status === 'fulfilled' && savedRes.value.ok ? await savedRes.value.json().catch(() => []) : [];
    data.businesses = businessesRes.status === 'fulfilled' && businessesRes.value.ok ? await businessesRes.value.json().catch(() => []) : [];
    if (!Array.isArray(data.bookings)) data.bookings = [];
    if (!Array.isArray(data.saved)) data.saved = [];
    if (!Array.isArray(data.businesses)) data.businesses = [];
  };

  const goBusiness = (slug) => {
    if (!slug) return;
    const u = new URL(window.location.href);
    u.searchParams.set('startapp', slug);
    window.location.href = u.toString();
  };

  const enterAdmin = (businessId) => {
    if (businessId) {
      try { localStorage.setItem('bookly_active_business_id', String(businessId)); } catch {}
    }
    const root = ROOT();
    if (root) root.style.display = '';
    shell()?.remove();
    setTimeout(() => {
      const buttons = [...document.querySelectorAll('#root button')];
      const target = buttons.find(b => /admin|бизнес|business|бошқар|управ/i.test(b.textContent || ''));
      if (target) target.click();
    }, 120);
  };

  const renderHome = (body) => {
    const wrap = el('div', 'bookly-screen');
    const heading = el('div', 'bookly-screen-heading');
    heading.append(el('div', 'bookly-eyebrow', 'Bookly'));
    heading.append(el('h1', '', `${text('greeting')}${tg()?.initDataUnsafe?.user?.first_name ? `, ${tg().initDataUnsafe.user.first_name}` : ''}`));
    heading.append(el('p', 'bookly-muted', text('subtitle')));
    wrap.append(heading);

    if (data.bookings.length) {
      const upcoming = data.bookings.find(x => x.status === 'confirmed') || data.bookings[0];
      const card = el('section', 'bookly-feature-card');
      card.append(el('span', 'bookly-card-label', text('nextBooking')));
      card.append(el('h2', '', upcoming.business_name || 'Bookly'));
      card.append(el('p', 'bookly-booking-service', upcoming.service_name || ''));
      card.append(el('div', 'bookly-booking-meta', `📅 ${formatDate(upcoming.day, upcoming.start)}`));
      card.append(button(text('openBooking'), 'bookly-secondary', () => { nav = 'bookings'; render(); }));
      wrap.append(card);
    } else {
      const card = el('section', 'bookly-empty-card');
      card.append(el('div', 'bookly-empty-icon', '◷'));
      card.append(el('h3', '', text('noBookings')));
      card.append(el('p', 'bookly-muted', text('exploreHint')));
      wrap.append(card);
    }

    const searchCard = el('section', 'bookly-panel');
    searchCard.append(el('h3', '', text('explore')));
    searchCard.append(el('p', 'bookly-muted', text('exploreHint')));
    const row = el('div', 'bookly-search-row');
    const input = el('input', 'bookly-search-input');
    input.placeholder = text('exploreHint');
    row.append(input);
    row.append(button(text('search'), 'bookly-primary bookly-search-button', () => goBusiness(input.value.trim())));
    searchCard.append(row);
    wrap.append(searchCard);

    const savedCard = el('section', 'bookly-panel');
    const savedHead = el('div', 'bookly-panel-head');
    savedHead.append(el('h3', '', text('savedTitle')));
    savedHead.append(button(String(data.saved.length), 'bookly-count-button', () => { nav = 'saved'; render(); }));
    savedCard.append(savedHead);
    if (data.saved.length) {
      data.saved.slice(0,2).forEach(item => {
        const row = el('button', 'bookly-list-item');
        row.append(el('span', 'bookly-list-icon', '♡'));
        const info = el('span', 'bookly-list-info');
        info.append(el('strong', '', item.name || ''));
        info.append(el('small', '', item.address || ''));
        row.append(info);
        row.addEventListener('click', () => goBusiness(item.slug));
        savedCard.append(row);
      });
    } else {
      savedCard.append(el('p', 'bookly-muted', text('emptySaved')));
    }
    wrap.append(savedCard);

    if (data.businesses.length) {
      const owner = el('section', 'bookly-business-banner');
      owner.append(el('span', 'bookly-card-label', text('manageBusiness')));
      owner.append(el('h3', '', data.businesses.length === 1 ? data.businesses[0].name : text('yourBusinesses')));
      owner.append(el('p', 'bookly-muted', text('manageBusinessHint')));
      owner.append(button(text('manage'), 'bookly-primary', () => enterAdmin(data.businesses[0]?.id)));
      wrap.append(owner);
    }

    body.replaceChildren(wrap);
  };

  const renderBookings = (body) => {
    const wrap = el('div', 'bookly-screen');
    const heading = el('div', 'bookly-screen-heading');
    heading.append(el('h1', '', text('allBookings')));
    heading.append(el('p', 'bookly-muted', `${data.bookings.length}`));
    wrap.append(heading);
    if (!data.bookings.length) {
      const empty = el('section', 'bookly-empty-card');
      empty.append(el('div', 'bookly-empty-icon', '◷'));
      empty.append(el('h3', '', text('noBookings')));
      wrap.append(empty);
    } else {
      data.bookings.forEach(item => {
        const card = el('section', 'bookly-booking-card');
        card.append(el('span', 'bookly-card-label', item.status === 'cancelled' ? text('past') : text('upcoming')));
        card.append(el('h3', '', item.business_name || 'Bookly'));
        card.append(el('p', '', item.service_name || ''));
        card.append(el('strong', '', formatDate(item.day, item.start)));
        wrap.append(card);
      });
    }
    body.replaceChildren(wrap);
  };

  const renderSaved = (body) => {
    const wrap = el('div', 'bookly-screen');
    const heading = el('div', 'bookly-screen-heading');
    heading.append(el('h1', '', text('savedTitle')));
    heading.append(el('p', 'bookly-muted', String(data.saved.length)));
    wrap.append(heading);
    if (!data.saved.length) {
      const empty = el('section', 'bookly-empty-card');
      empty.append(el('div', 'bookly-empty-icon', '♡'));
      empty.append(el('h3', '', text('emptySaved')));
      wrap.append(empty);
    } else {
      data.saved.forEach(item => {
        const card = el('button', 'bookly-saved-card');
        card.append(el('div', 'bookly-list-icon', '♡'));
        const info = el('div', 'bookly-saved-info');
        info.append(el('h3', '', item.name || ''));
        info.append(el('p', 'bookly-muted', item.address || ''));
        card.append(info);
        card.append(el('span', 'bookly-arrow', '›'));
        card.addEventListener('click', () => goBusiness(item.slug));
        wrap.append(card);
      });
    }
    body.replaceChildren(wrap);
  };

  const renderProfile = (body) => {
    const user = tg()?.initDataUnsafe?.user || {};
    const fullName = [user.first_name, user.last_name].filter(Boolean).join(' ') || 'Bookly';
    const wrap = el('div', 'bookly-screen');
    const heading = el('div', 'bookly-screen-heading');
    heading.append(el('h1', '', text('profileTitle')));
    wrap.append(heading);

    const identity = el('section', 'bookly-profile-hero');
    identity.append(el('div', 'bookly-profile-avatar', fullName.charAt(0).toUpperCase()));
    const info = el('div');
    info.append(el('h2', '', fullName));
    info.append(el('p', 'bookly-muted', user.username ? `@${user.username}` : ''));
    identity.append(info);
    wrap.append(identity);

    const account = el('section', 'bookly-panel');
    account.append(el('h3', '', text('account')));
    const nameRow = el('div', 'bookly-profile-row');
    nameRow.append(el('span', '', text('name'))); nameRow.append(el('strong', '', fullName));
    account.append(nameRow);
    const usernameRow = el('div', 'bookly-profile-row');
    usernameRow.append(el('span', '', text('username'))); usernameRow.append(el('strong', '', user.username ? `@${user.username}` : '—'));
    account.append(usernameRow);
    wrap.append(account);

    const prefs = el('section', 'bookly-panel');
    prefs.append(el('h3', '', 'Preferences'));
    const langRow = el('div', 'bookly-profile-row');
    langRow.append(el('span', '', text('language')));
    const select = document.createElement('select');
    select.className = 'bookly-profile-select';
    languages.forEach(l => { const o = document.createElement('option'); o.value = l.code; o.textContent = l.label; select.append(o); });
    select.value = getLang();
    select.addEventListener('change', e => setLang(e.target.value));
    langRow.append(select);
    prefs.append(langRow);
    const tzRow = el('div', 'bookly-profile-row');
    tzRow.append(el('span', '', text('timezone')));
    tzRow.append(el('strong', '', Intl.DateTimeFormat().resolvedOptions().timeZone || 'Asia/Tashkent'));
    prefs.append(tzRow);
    wrap.append(prefs);

    const actions = el('section', 'bookly-panel');
    actions.append(el('h3', '', text('support')));
    actions.append(button(text('help'), 'bookly-list-button', () => tg()?.showPopup?.({ title: 'Bookly', message: 'Bookly support', buttons:[{type:'ok'}] })));
    actions.append(el('div', 'bookly-about-row', `${text('about')} · ${text('version')} 1.0`));
    wrap.append(actions);

    if (data.businesses.length) {
      const owner = el('section', 'bookly-business-banner');
      owner.append(el('span', 'bookly-card-label', text('manageBusiness')));
      owner.append(el('h3', '', data.businesses.length === 1 ? data.businesses[0].name : text('yourBusinesses')));
      owner.append(button(text('manage'), 'bookly-primary', () => enterAdmin(data.businesses[0]?.id)));
      wrap.append(owner);
    } else {
      const owner = el('section', 'bookly-panel');
      owner.append(el('h3', '', text('manageBusiness')));
      owner.append(el('p', 'bookly-muted', text('manageBusinessHint')));
      owner.append(button(text('addBusiness'), 'bookly-secondary', () => { const root = ROOT(); if (root) root.style.display=''; shell()?.remove(); setTimeout(() => { const b=[...document.querySelectorAll('#root button')].find(x=>/admin|бизнес|business/i.test(x.textContent||'')); b?.click(); },120); }));
      wrap.append(owner);
    }

    body.replaceChildren(wrap);
  };

  const render = () => {
    const s = shell();
    if (!s) return;
    const body = s.querySelector('.bookly-shell-body');
    const active = s.querySelectorAll('.bookly-shell-nav button');
    active.forEach(b => b.classList.toggle('active', b.dataset.tab === nav));
    if (nav === 'home') renderHome(body);
    if (nav === 'bookings') renderBookings(body);
    if (nav === 'saved') renderSaved(body);
    if (nav === 'profile') renderProfile(body);
  };

  const createShell = async () => {
    if (!rootIsHome() || shell()) return;
    clearRoot();

    const host = document.createElement('div');
    host.id = SHELL_ID;
    host.dir = getLang() === 'ar' ? 'rtl' : 'ltr';
    host.innerHTML = `
      <header class="bookly-shell-header">
        <div class="bookly-brand">Bookly</div>
        <select class="bookly-shell-lang"></select>
      </header>
      <main class="bookly-shell-body"></main>
      <nav class="bookly-shell-nav"></nav>
    `;
    document.body.appendChild(host);

    const langSelect = host.querySelector('.bookly-shell-lang');
    languages.forEach(l => { const o=document.createElement('option'); o.value=l.code; o.textContent=l.label; langSelect.append(o); });
    langSelect.value = getLang();
    langSelect.addEventListener('change', e => setLang(e.target.value));

    const navItems = [['home','⌂'],['bookings','◷'],['saved','♡'],['profile','◎']];
    const navEl = host.querySelector('.bookly-shell-nav');
    navItems.forEach(([key, icon]) => {
      const b = document.createElement('button'); b.type='button'; b.dataset.tab=key;
      b.innerHTML = `<span>${icon}</span><small>${text(key)}</small>`;
      b.addEventListener('click', () => { nav=key; render(); });
      navEl.append(b);
    });

    await fetchAll();
    render();
  };

  let busy = false;
  const sync = async () => {
    if (hasStartParam()) {
      document.getElementById(SHELL_ID)?.remove();
      const root = ROOT(); if (root) root.style.display='';
      return;
    }
    if (!busy && rootIsHome() && !shell()) {
      busy = true;
      try { await createShell(); } finally { busy = false; }
    }
  };

  tg()?.ready();
  tg()?.expand();
  const observer = new MutationObserver(() => sync());
  observer.observe(ROOT() || document.body, { childList:true, subtree:true });
  setTimeout(sync, 500);
  setInterval(sync, 1200);
})();
