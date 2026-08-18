(() => {
  const NAV_ID = 'bookly-client-bottom-nav';
  const PROFILE_ID = 'bookly-client-profile-runtime';

  const getLang = () => {
    try {
      return localStorage.getItem('bookly_language') || localStorage.getItem('bookly-language') || 'en';
    } catch {
      return 'en';
    }
  };

  const translations = {
    ru: { home: 'Главная', bookings: 'Записи', saved: 'Сохранённые', profile: 'Профиль', language: 'Язык', myBookings: 'Мои записи', savedBusinesses: 'Сохранённые бизнесы' },
    en: { home: 'Home', bookings: 'Bookings', saved: 'Saved', profile: 'Profile', language: 'Language', myBookings: 'My bookings', savedBusinesses: 'Saved businesses' },
    uz: { home: 'Bosh sahifa', bookings: 'Bronlar', saved: 'Saqlanganlar', profile: 'Profil', language: 'Til', myBookings: 'Mening bronlarim', savedBusinesses: 'Saqlangan bizneslar' },
    tr: { home: 'Ana sayfa', bookings: 'Rezervasyonlar', saved: 'Kaydedilenler', profile: 'Profil', language: 'Dil', myBookings: 'Rezervasyonlarım', savedBusinesses: 'Kaydedilen işletmeler' },
    ar: { home: 'الرئيسية', bookings: 'الحجوزات', saved: 'المحفوظة', profile: 'الملف الشخصي', language: 'اللغة', myBookings: 'حجوزاتي', savedBusinesses: 'الأنشطة المحفوظة' }
  };

  const t = (key) => (translations[getLang()] || translations.en)[key];

  const isClientView = () => document.querySelectorAll('#root details').length >= 2;

  const findDetails = (kind) => {
    const wanted = kind === 'bookings' ? t('myBookings') : t('savedBusinesses');
    return [...document.querySelectorAll('#root details')].find((el) => {
      const text = (el.querySelector('summary')?.textContent || '').trim().toLowerCase();
      return text === wanted.toLowerCase() || (kind === 'bookings' ? /booking|брон|запис|rezerv|حجز/i.test(text) : /saved|сохран|saql|kaydet|محفوظ/i.test(text));
    }) || null;
  };

  const scrollToDetails = (kind) => {
    const el = findDetails(kind);
    if (!el) return;
    el.open = true;
    el.scrollIntoView({ behavior: 'smooth', block: 'start' });
  };

  const buildProfile = () => {
    let profile = document.getElementById(PROFILE_ID);
    if (profile) return profile;

    const user = window.Telegram?.WebApp?.initDataUnsafe?.user || {};
    const fullName = [user.first_name, user.last_name].filter(Boolean).join(' ') || 'Bookly';
    const letter = fullName.charAt(0).toUpperCase();

    profile = document.createElement('section');
    profile.id = PROFILE_ID;
    profile.className = 'bookly-runtime-profile card';
    profile.innerHTML = `
      <div class="bookly-runtime-profile-head">
        <div class="bookly-runtime-avatar">${letter}</div>
        <div>
          <h2>${t('profile')}</h2>
          <p class="muted">${fullName}</p>
        </div>
      </div>
      <div class="bookly-runtime-profile-row">
        <span>${t('language')}</span>
        <strong>${document.querySelector('select.language-select')?.selectedOptions?.[0]?.textContent?.trim() || getLang()}</strong>
      </div>
    `;

    document.querySelector('#root > .app')?.appendChild(profile);
    return profile;
  };

  const scrollHome = () => {
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const setActive = (key) => {
    document.querySelectorAll(`#${NAV_ID} button`).forEach((button) => {
      button.classList.toggle('active', button.dataset.tab === key);
    });
  };

  const buildNav = () => {
    let nav = document.getElementById(NAV_ID);
    if (nav) return nav;

    nav = document.createElement('nav');
    nav.id = NAV_ID;
    nav.className = 'bookly-runtime-bottom-nav';
    nav.setAttribute('aria-label', 'Bookly navigation');

    const items = [
      ['home', '⌂', 'home', scrollHome],
      ['bookings', '◷', 'bookings', () => scrollToDetails('bookings')],
      ['saved', '♡', 'saved', () => scrollToDetails('saved')],
      ['profile', '◎', 'profile', () => {
        setActive('profile');
        buildProfile()?.scrollIntoView({ behavior: 'smooth', block: 'start' });
      }]
    ];

    items.forEach(([key, icon, labelKey, action]) => {
      const button = document.createElement('button');
      button.type = 'button';
      button.dataset.tab = key;
      button.innerHTML = `<span aria-hidden="true">${icon}</span><small>${t(labelKey)}</small>`;
      button.addEventListener('click', () => {
        setActive(key);
        action();
      });
      nav.appendChild(button);
    });

    document.body.appendChild(nav);
    setActive('home');
    return nav;
  };

  const removeRuntime = () => {
    document.getElementById(NAV_ID)?.remove();
    document.getElementById(PROFILE_ID)?.remove();
  };

  let lastClient = false;
  let lastLang = getLang();

  const sync = () => {
    const client = isClientView();
    const lang = getLang();

    if (client) {
      buildNav();
      if (lang !== lastLang) {
        document.getElementById(NAV_ID)?.remove();
        document.getElementById(PROFILE_ID)?.remove();
        buildNav();
      }
    } else if (lastClient && !client) {
      removeRuntime();
    }

    lastClient = client;
    lastLang = lang;
  };

  const observer = new MutationObserver(sync);
  observer.observe(document.getElementById('root') || document.body, { childList: true, subtree: true });
  setInterval(sync, 700);
  setTimeout(sync, 300);
})();
