(() => {
  const SHELL_ID = 'bookly-personal-shell';
  const ADMIN_FLAG = '__BOOKLY_ADMIN_MODE';
  const ROOT = () => document.getElementById('root');
  const tg = () => window.Telegram?.WebApp;
  const initData = () => tg()?.initData || '';
  const hasStartApp = () => Boolean(
    tg()?.initDataUnsafe?.start_param ||
    new URLSearchParams(window.location.search).get('startapp')
  );

  const languages = [
    { code: 'ru', label: 'Русский' },
    { code: 'en', label: 'English' },
    { code: 'uz', label: 'O‘zbek' },
    { code: 'tr', label: 'Türkçe' },
    { code: 'ar', label: 'العربية' }
  ];

  const tr = {
    ru: {
      home: 'Главная', bookings: 'Записи', saved: 'Сохранённые',
      greeting: 'С возвращением', subtitle: 'Ваш Bookly — всё важное в одном месте.',
      explore: 'Найти место', exploreHint: 'Ссылка или slug бизнеса', search: 'Открыть',
      manageBusiness: 'Для бизнеса', manageBusinessHint: 'Управляйте своим бизнесом в Bookly',
      manage: 'Управлять', addBusiness: 'Создать бизнес', yourBusinesses: 'Ваши бизнесы',
      allBookings: 'Мои записи', noBookings: 'У вас пока нет записей', savedTitle: 'Сохранённые места',
      emptySaved: 'Сохранённых бизнесов пока нет', upcoming: 'Предстоящая', past: 'Завершённая', loading: 'Загрузка...'
    },
    en: {
      home: 'Home', bookings: 'Bookings', saved: 'Saved',
      greeting: 'Welcome back', subtitle: 'Your Bookly space — everything important in one place.',
      explore: 'Find a place', exploreHint: 'Business link or slug', search: 'Open',
      manageBusiness: 'For business', manageBusinessHint: 'Manage your business in Bookly',
      manage: 'Manage', addBusiness: 'Create business', yourBusinesses: 'Your businesses',
      allBookings: 'My bookings', noBookings: 'You have no bookings yet', savedTitle: 'Saved places',
      emptySaved: 'No saved businesses yet', upcoming: 'Upcoming', past: 'Completed', loading: 'Loading...'
    },
    uz: {
      home: 'Bosh sahifa', bookings: 'Bronlar', saved: 'Saqlanganlar',
      greeting: 'Xush kelibsiz', subtitle: 'Bookly — barcha muhim narsalar bir joyda.',
      explore: 'Joy topish', exploreHint: 'Biznes havolasi yoki slugi', search: 'Ochish',
      manageBusiness: 'Biznes uchun', manageBusinessHint: 'Biznesingizni Bookly orqali boshqaring',
      manage: 'Boshqarish', addBusiness: 'Biznes yaratish', yourBusinesses: 'Bizneslaringiz',
      allBookings: 'Bronlarim', noBookings: 'Hozircha bronlaringiz yo‘q', savedTitle: 'Saqlangan joylar',
      emptySaved: 'Saqlangan bizneslar yo‘q', upcoming: 'Kelgusi', past: 'Yakunlangan', loading: 'Yuklanmoqda...'
    },
    tr: {
      home: 'Ana sayfa', bookings: 'Rezervasyonlar', saved: 'Kaydedilenler',
      greeting: 'Tekrar hoş geldiniz', subtitle: 'Bookly — önemli olan her şey tek yerde.',
      explore: 'Bir yer bul', exploreHint: 'İşletme bağlantısı veya slug', search: 'Aç',
      manageBusiness: 'İşletmeler için', manageBusinessHint: 'İşletmenizi Bookly üzerinden yönetin',
      manage: 'Yönet', addBusiness: 'İşletme oluştur', yourBusinesses: 'İşletmeleriniz',
      allBookings: 'Rezervasyonlarım', noBookings: 'Henüz rezervasyonunuz yok', savedTitle: 'Kaydedilen yerler',
      emptySaved: 'Henüz kaydedilen işletme yok', upcoming: 'Yaklaşan', past: 'Tamamlanan', loading: 'Yükleniyor...'
    },
    ar: {
      home: 'الرئيسية', bookings: 'الحجوزات', saved: 'المحفوظة',
      greeting: 'مرحباً بعودتك', subtitle: 'Bookly — كل ما يهمك في مكان واحد.',
      explore: 'ابحث عن مكان', exploreHint: 'رابط النشاط أو الـ slug', search: 'فتح',
      manageBusiness: 'لأصحاب الأعمال', manageBusinessHint: 'أدر نشاطك التجاري عبر Bookly',
      manage: 'إدارة', addBusiness: 'إنشاء نشاط', yourBusinesses: 'أعمالك',
      allBookings: 'حجوزاتي', noBookings: 'لا توجد حجوزات بعد', savedTitle: 'الأماكن المحفوظة',
      emptySaved: 'لا توجد أعمال محفوظة بعد', upcoming: 'القادمة', past: 'المكتملة', loading: 'جارٍ التحميل...'
    }
  };

  const api = () => 'https://boockly-3.onrender.com';
  const getLang = () => {
    try {
      const value = localStorage.getItem('bookly_language');
      return ['ru', 'en', 'uz', 'tr', 'ar'].includes(value) ? value : 'ru';
    } catch {
      return 'ru';
    }
  };
  const text = key => (tr[getLang()] || tr.ru)[key] || tr.ru[key] || key;
  const headers = () => ({
    'Content-Type': 'application/json',
    'X-Telegram-Init-Data': initData(),
    'X-Bookly-Language': getLang()
  });

  let state = { bookings: [], saved: [], businesses: [] };
  let tab = 'home';
  let loading = false;

  const el = (tag, cls, value) => {
    const node = document.createElement(tag);
    if (cls) node.className = cls;
    if (value != null) node.textContent = value;
    return node;
  };

  const button = (label, cls, handler) => {
    const node = el('button', cls, label);
    node.type = 'button';
    node.addEventListener('click', handler);
    return node;
  };

  const isAdmin = () => Boolean(window[ADMIN_FLAG]);
  const isHome = () => {
    const root = ROOT();
    return Boolean(root && root.querySelector('.hero') && !hasStartApp());
  };

  const formatDate = (day, start) => {
    if (!day) return '';
    try {
      const locale = ({ ru: 'ru-RU', en: 'en-US', uz: 'uz-UZ', tr: 'tr-TR', ar: 'ar-SA' })[getLang()] || 'ru-RU';
      return new Intl.DateTimeFormat(locale, {
        day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit'
      }).format(new Date(`${day}T${(start || '00:00').slice(0, 5)}:00`));
    } catch {
      return `${day}${start ? ` · ${start.slice(0, 5)}` : ''}`;
    }
  };

  const openBusiness = slug => {
    const value = String(slug || '').trim();
    if (!value) return;
    const url = new URL(window.location.href);
    url.searchParams.set('startapp', value);
    window.location.href = url.toString();
  };

  const fetchData = async () => {
    const results = await Promise.allSettled([
      fetch(api() + '/my/bookings', { headers: headers() }),
      fetch(api() + '/my/saved-businesses', { headers: headers() }),
      fetch(api() + '/admin/businesses', { headers: headers() })
    ]);

    const read = async result => {
      if (result.status !== 'fulfilled' || !result.value.ok) return [];
      const value = await result.value.json().catch(() => []);
      return Array.isArray(value) ? value : [];
    };

    const [bookings, saved, businesses] = await Promise.all(results.map(read));
    state = { bookings, saved, businesses };
  };

  const showTransition = () => {
    let overlay = document.getElementById('bookly-page-transition');
    if (!overlay) {
      overlay = document.createElement('div');
      overlay.id = 'bookly-page-transition';
      overlay.innerHTML = '<div class="bookly-transition-spinner"></div><strong>Bookly</strong>';
      document.body.appendChild(overlay);
    }
    return overlay;
  };

  const openAdmin = () => {
    if (isAdmin()) return;
    window[ADMIN_FLAG] = true;
    document.getElementById(SHELL_ID)?.remove();
    const overlay = showTransition();
    const root = ROOT();
    const adminButton = root?.querySelector('button.primary.full');

    if (adminButton) {
      adminButton.click();
    } else {
      window[ADMIN_FLAG] = false;
      overlay.remove();
      return;
    }

    const started = Date.now();
    const reveal = () => {
      const adminVisible = Boolean(
        root?.querySelector('.tabs, .business-head, .loading-screen, .back')
      );
      if (adminVisible || Date.now() - started > 2200) {
        overlay.remove();
        return;
      }
      requestAnimationFrame(reveal);
    };
    reveal();
  };

  const render = () => {
    const host = document.getElementById(SHELL_ID);
    if (!host || isAdmin()) return;

    host.dir = getLang() === 'ar' ? 'rtl' : 'ltr';
    const content = host.querySelector('.bookly-content');
    if (!content) return;
    content.replaceChildren();

    host.querySelectorAll('.bookly-nav button').forEach(node => {
      node.classList.toggle('active', node.dataset.tab === tab);
    });

    if (tab === 'home') {
      const firstName = tg()?.initDataUnsafe?.user?.first_name || '';
      const hero = el('section', 'bookly-hero');
      hero.append(el('div', 'bookly-eyebrow', 'BOOKLY'));
      hero.append(el('h1', '', firstName ? `${text('greeting')}, ${firstName}` : text('greeting')));
      hero.append(el('p', 'bookly-muted', text('subtitle')));
      content.append(hero);

      const explore = el('section', 'bookly-section');
      explore.append(el('h2', '', text('explore')));
      const search = el('div', 'bookly-search');
      const input = el('input', 'bookly-input');
      input.placeholder = text('exploreHint');
      search.append(input);
      search.append(button(text('search'), 'bookly-button', () => openBusiness(input.value)));
      explore.append(search);
      content.append(explore);

      const business = el('section', 'bookly-business-card');
      business.append(el('span', 'bookly-kicker', text('manageBusiness')));
      if (state.businesses.length === 1) {
        business.append(el('h2', '', state.businesses[0].name || text('yourBusinesses')));
        business.append(el('p', 'bookly-muted', text('manageBusinessHint')));
        business.append(button(text('manage'), 'bookly-button', openAdmin));
      } else if (state.businesses.length > 1) {
        business.append(el('h2', '', text('yourBusinesses')));
        business.append(el('p', 'bookly-muted', `${state.businesses.length} · ${text('manageBusinessHint')}`));
        business.append(button(text('manage'), 'bookly-button', openAdmin));
      } else {
        business.append(el('h2', '', text('addBusiness')));
        business.append(el('p', 'bookly-muted', text('manageBusinessHint')));
        business.append(button(text('addBusiness'), 'bookly-button', openAdmin));
      }
      content.append(business);
      return;
    }

    if (tab === 'bookings') {
      const hero = el('section', 'bookly-hero bookly-compact-hero');
      hero.append(el('h1', '', text('allBookings')));
      content.append(hero);
      if (loading) {
        const load = el('section', 'bookly-empty');
        load.append(el('div', 'bookly-empty-symbol', '•'));
        load.append(el('h3', '', text('loading')));
        content.append(load);
      } else if (!state.bookings.length) {
        const empty = el('section', 'bookly-empty');
        empty.append(el('div', 'bookly-empty-symbol', '◷'));
        empty.append(el('h3', '', text('noBookings')));
        content.append(empty);
      } else {
        state.bookings.forEach(item => {
          const card = el('section', 'bookly-booking');
          card.append(el('span', 'bookly-kicker', item.status === 'cancelled' ? text('past') : text('upcoming')));
          card.append(el('h2', '', item.business_name || 'Bookly'));
          if (item.service_name) card.append(el('p', 'bookly-service', item.service_name));
          card.append(el('strong', 'bookly-date', `📅 ${formatDate(item.day, item.start)}`));
          content.append(card);
        });
      }
      return;
    }

    if (tab === 'saved') {
      const hero = el('section', 'bookly-hero bookly-compact-hero');
      hero.append(el('h1', '', text('savedTitle')));
      content.append(hero);
      if (loading) {
        const load = el('section', 'bookly-empty');
        load.append(el('div', 'bookly-empty-symbol', '•'));
        load.append(el('h3', '', text('loading')));
        content.append(load);
      } else if (!state.saved.length) {
        const empty = el('section', 'bookly-empty');
        empty.append(el('div', 'bookly-empty-symbol', '♡'));
        empty.append(el('h3', '', text('emptySaved')));
        content.append(empty);
      } else {
        state.saved.forEach(item => {
          const card = el('button', 'bookly-saved-entity');
          card.append(el('span', 'bookly-entity-icon', '♡'));
          const info = el('span');
          info.append(el('strong', '', item.name || 'Bookly'));
          if (item.address) info.append(el('small', 'bookly-muted', item.address));
          card.append(info);
          card.append(el('span', 'bookly-arrow', '›'));
          card.addEventListener('click', () => openBusiness(item.slug));
          content.append(card);
        });
      }
    }
  };

  const createShell = async () => {
    if (isAdmin() || hasStartApp() || !isHome() || document.getElementById(SHELL_ID)) return;

    const host = document.createElement('div');
    host.id = SHELL_ID;
    host.innerHTML = `
      <header class="bookly-header">
        <div class="bookly-wordmark">Bookly</div>
        <select class="bookly-top-language" aria-label="Language"></select>
      </header>
      <main class="bookly-content"></main>
      <nav class="bookly-nav" aria-label="Bookly"></nav>
    `;
    document.body.appendChild(host);

    const select = host.querySelector('.bookly-top-language');
    languages.forEach(language => {
      const option = document.createElement('option');
      option.value = language.code;
      option.textContent = language.label;
      select.appendChild(option);
    });
    select.value = getLang();
    select.addEventListener('change', event => {
      try { localStorage.setItem('bookly_language', event.target.value); } catch {}
      window.location.reload();
    });

    const nav = host.querySelector('.bookly-nav');
    [['home', '⌂'], ['bookings', '◷'], ['saved', '♡']].forEach(([key, icon]) => {
      const node = document.createElement('button');
      node.type = 'button';
      node.dataset.tab = key;
      node.innerHTML = `<span>${icon}</span><small>${text(key)}</small>`;
      node.addEventListener('click', async () => {
        tab = key;
        render();
        if (key === 'bookings' || key === 'saved') {
          loading = true;
          render();
          await fetchData();
          loading = false;
          render();
        }
      });
      nav.appendChild(node);
    });

    host.style.display = 'block';
    render();
    loading = true;
    render();
    await fetchData();
    loading = false;
    render();
  };

  const sync = () => {
    const root = ROOT();
    if (!root) return;

    if (isAdmin()) {
      document.getElementById(SHELL_ID)?.remove();
      if (isHome() && !hasStartApp()) {
        window[ADMIN_FLAG] = false;
        sync();
      }
      return;
    }

    if (hasStartApp()) {
      document.getElementById(SHELL_ID)?.remove();
      return;
    }

    if (isHome() && !document.getElementById(SHELL_ID)) {
      createShell();
    }
  };

  const style = document.createElement('style');
  style.textContent = `
    #${SHELL_ID}{position:fixed;inset:0;z-index:9990;background:#f5f6f8;color:#111;overflow-y:auto;padding-bottom:100px;font-family:inherit}
    #${SHELL_ID},#${SHELL_ID} *{box-sizing:border-box}
    .bookly-header{position:sticky;top:0;z-index:3;display:flex;align-items:center;justify-content:space-between;padding:14px 18px;background:rgba(255,255,255,.96);backdrop-filter:blur(18px);border-bottom:1px solid #e7e9ec}
    .bookly-wordmark{font-size:20px;font-weight:850;letter-spacing:-.4px}.bookly-top-language{border:1px solid #e1e4e8;border-radius:11px;background:#fff;color:#111;padding:8px 10px;font-weight:650}
    .bookly-content{width:min(100%,560px);margin:0 auto;padding:18px 16px 30px}.bookly-hero{padding:16px 2px 18px}.bookly-compact-hero{padding-bottom:14px}.bookly-eyebrow,.bookly-kicker{font-size:10px;letter-spacing:.14em;text-transform:uppercase;font-weight:850;color:#8b929c}.bookly-hero h1{font-size:32px;line-height:1.05;letter-spacing:-1.1px;margin:8px 0}.bookly-hero p{margin:0;color:#6c7480;line-height:1.55}.bookly-section,.bookly-business-card,.bookly-booking,.bookly-empty{background:#fff;border:1px solid #e5e8ec;border-radius:22px;padding:19px;margin:12px 0;box-shadow:0 8px 28px rgba(15,23,42,.05)}.bookly-section h2,.bookly-business-card h2,.bookly-booking h2{margin:5px 0 8px;font-size:19px;letter-spacing:-.2px}.bookly-search{display:grid;grid-template-columns:1fr auto;gap:8px}.bookly-input{width:100%;margin:0!important;border:1px solid #dfe3e7!important;border-radius:14px!important;background:#fff!important}.bookly-button{margin:0!important;background:#111!important;color:#fff!important;border:0!important;border-radius:14px!important;padding:12px 16px!important;font-weight:800!important}.bookly-business-card{background:#111;color:#fff;border-color:#111}.bookly-business-card .bookly-kicker{color:#adb5bf}.bookly-muted{color:#747c86}.bookly-business-card .bookly-muted{color:#cbd0d7}.bookly-business-card .bookly-button{background:#fff!important;color:#111!important}.bookly-list-placeholder{padding:16px}.bookly-empty{text-align:center;padding:42px 20px}.bookly-empty-symbol{width:50px;height:50px;display:grid;place-items:center;margin:0 auto 12px;background:#f0f2f4;border-radius:16px;font-size:22px}.bookly-empty h3{margin:0;font-size:16px}.bookly-booking{padding:17px}.bookly-booking .bookly-service{margin:0 0 10px;color:#707784}.bookly-date{display:block;font-size:14px}.bookly-saved-entity{width:100%;display:flex;align-items:center;gap:12px;padding:16px;border:1px solid #e5e8ec;border-radius:18px;background:#fff;color:#111;text-align:inherit;margin:0 0 10px;box-shadow:0 6px 20px rgba(15,23,42,.04)}.bookly-entity-icon{width:40px;height:40px;border-radius:13px;display:grid;place-items:center;background:#f0f2f4;font-size:18px;flex:0 0 auto}.bookly-saved-entity>span:nth-child(2){flex:1;min-width:0;display:flex;flex-direction:column;gap:3px}.bookly-saved-entity small{display:block;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;text-align:inherit}.bookly-arrow{font-size:24px;color:#98a0ab}.bookly-nav{position:fixed;left:50%;bottom:10px;transform:translateX(-50%);width:286px;display:grid;grid-template-columns:repeat(3,1fr);gap:4px;padding:6px;background:rgba(255,255,255,.98);backdrop-filter:blur(18px);border:1px solid #e2e5e9;border-radius:20px;box-shadow:0 16px 40px rgba(15,23,42,.16)}.bookly-nav button{display:flex;flex-direction:column;align-items:center;justify-content:center;gap:4px;min-width:0;border:0;border-radius:15px;background:transparent;color:#7c838c;padding:9px 4px;font-weight:800}.bookly-nav button span{font-size:18px;line-height:1}.bookly-nav button small{font-size:9px;line-height:1.1}.bookly-nav button.active{background:#111;color:#fff}
    #bookly-page-transition{position:fixed;inset:0;z-index:10001;background:#fff;display:flex;align-items:center;justify-content:center;flex-direction:column;gap:12px;color:#111}.bookly-transition-spinner{width:30px;height:30px;border:3px solid #ddd;border-top-color:#111;border-radius:50%;animation:bookly-spin .8s linear infinite}#bookly-page-transition strong{font-size:18px}@keyframes bookly-spin{to{transform:rotate(360deg)}}
    @media(max-width:520px){.bookly-search{grid-template-columns:1fr}.bookly-search .bookly-button{width:100%}.bookly-content{padding-left:14px;padding-right:14px}.bookly-nav{width:280px;bottom:8px}}
    [dir="rtl"] .bookly-saved-entity,[dir="rtl"] .bookly-booking{text-align:right}[dir="rtl"] .bookly-list-meta,[dir="rtl"] .bookly-saved-entity>span:nth-child(2){text-align:right}
  `;
  document.head.appendChild(style);

  tg()?.ready();
  tg()?.expand();

  const observer = new MutationObserver(() => sync());
  observer.observe(document.body, { childList: true, subtree: true });
  setTimeout(sync, 120);
  setInterval(sync, 1000);
})();