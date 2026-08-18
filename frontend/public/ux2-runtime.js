(() => {
  const NAV_ID = 'bookly-client-bottom-nav';
  const SHELL_ID = 'bookly-client-page-shell';
  const PROFILE_ID = 'bookly-client-profile-page';

  const LANGS = {
    ru: { home: 'Главная', bookings: 'Записи', saved: 'Сохранённые', profile: 'Профиль', myBookings: 'Мои записи', savedBusinesses: 'Сохранённые бизнесы', account: 'Аккаунт', preferences: 'Настройки', language: 'Язык', telegram: 'Telegram', close: 'Закрыть' },
    en: { home: 'Home', bookings: 'Bookings', saved: 'Saved', profile: 'Profile', myBookings: 'My bookings', savedBusinesses: 'Saved businesses', account: 'Account', preferences: 'Preferences', language: 'Language', telegram: 'Telegram', close: 'Close' },
    uz: { home: 'Bosh sahifa', bookings: 'Bronlar', saved: 'Saqlanganlar', profile: 'Profil', myBookings: 'Mening bronlarim', savedBusinesses: 'Saqlangan bizneslar', account: 'Hisob', preferences: 'Sozlamalar', language: 'Til', telegram: 'Telegram', close: 'Yopish' },
    tr: { home: 'Ana sayfa', bookings: 'Rezervasyonlar', saved: 'Kaydedilenler', profile: 'Profil', myBookings: 'Rezervasyonlarım', savedBusinesses: 'Kaydedilen işletmeler', account: 'Hesap', preferences: 'Tercihler', language: 'Dil', telegram: 'Telegram', close: 'Kapat' },
    ar: { home: 'الرئيسية', bookings: 'الحجوزات', saved: 'المحفوظة', profile: 'الملف الشخصي', myBookings: 'حجوزاتي', savedBusinesses: 'الأنشطة المحفوظة', account: 'الحساب', preferences: 'الإعدادات', language: 'اللغة', telegram: 'Telegram', close: 'إغلاق' }
  };

  const getLang = () => {
    try {
      return localStorage.getItem('bookly_language') || localStorage.getItem('bookly-language') || 'en';
    } catch {
      return 'en';
    }
  };

  const t = (key) => (LANGS[getLang()] || LANGS.en)[key];

  const getClientSection = () => {
    const root = document.querySelector('#root > .app');
    if (!root) return null;
    const details = root.querySelectorAll('details');
    return details.length >= 2 ? root : null;
  };

  const getBookingsDetails = () => {
    const root = getClientSection();
    if (!root) return null;
    return [...root.querySelectorAll('details')][0] || null;
  };

  const getSavedDetails = () => {
    const root = getClientSection();
    if (!root) return null;
    return [...root.querySelectorAll('details')][1] || null;
  };

  const getClientRootChildren = () => {
    const root = getClientSection();
    if (!root) return [];
    const section = [...root.querySelectorAll('section')].find((x) => x.querySelector('details'));
    if (!section) return [];
    return [...section.children];
  };

  const restoreClientLayout = () => {
    const children = getClientRootChildren();
    children.forEach((el) => {
      if (el.classList.contains('bookly-runtime-profile-page')) return;
      el.style.removeProperty('display');
    });
    getBookingsDetails()?.removeAttribute('open');
    getSavedDetails()?.removeAttribute('open');
  };

  const hideAllClientContent = () => {
    const children = getClientRootChildren();
    children.forEach((el) => {
      el.style.setProperty('display', 'none', 'important');
    });
  };

  const getLanguageSelect = () => document.querySelector('select.language-select');

  const buildProfile = () => {
    let profile = document.getElementById(PROFILE_ID);
    if (profile) profile.remove();

    const user = window.Telegram?.WebApp?.initDataUnsafe?.user || {};
    const fullName = [user.first_name, user.last_name].filter(Boolean).join(' ') || 'Bookly';
    const username = user.username ? `@${user.username}` : '';
    const letter = fullName.charAt(0).toUpperCase();
    const select = getLanguageSelect();

    profile = document.createElement('section');
    profile.id = PROFILE_ID;
    profile.className = 'bookly-runtime-profile-page';
    profile.innerHTML = `
      <div class="runtime-page-card runtime-profile-hero">
        <div class="runtime-profile-avatar">${letter}</div>
        <div>
          <h1>${t('profile')}</h1>
          <p>${fullName}</p>
          ${username ? `<small>${username}</small>` : ''}
        </div>
      </div>

      <div class="runtime-page-card">
        <div class="runtime-section-label">${t('account')}</div>
        <div class="runtime-profile-item">
          <span>${t('telegram')}</span>
          <strong>${username || '—'}</strong>
        </div>
      </div>

      <div class="runtime-page-card">
        <div class="runtime-section-label">${t('preferences')}</div>
        <div class="runtime-profile-item runtime-language-row">
          <span>${t('language')}</span>
          <div class="runtime-language-control"></div>
        </div>
      </div>
    `;

    const slot = profile.querySelector('.runtime-language-control');
    if (select && slot) {
      const clone = select.cloneNode(true);
      clone.className = 'runtime-language-select';
      clone.value = getLang();
      clone.addEventListener('change', (event) => {
        select.value = event.target.value;
        select.dispatchEvent(new Event('change', { bubbles: true }));
        setTimeout(renderPage, 50);
      });
      slot.appendChild(clone);
    }

    const root = getClientSection();
    if (root) root.appendChild(profile);
    return profile;
  };

  const showHome = () => {
    restoreClientLayout();
    setActive('home');
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const showBookings = () => {
    hideAllClientContent();
    const details = getBookingsDetails();
    if (details) {
      details.style.removeProperty('display');
      details.open = true;
    }
    setActive('bookings');
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const showSaved = () => {
    hideAllClientContent();
    const details = getSavedDetails();
    if (details) {
      details.style.removeProperty('display');
      details.open = true;
    }
    setActive('saved');
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const showProfile = () => {
    hideAllClientContent();
    const profile = buildProfile();
    profile.style.removeProperty('display');
    setActive('profile');
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const setActive = (key) => {
    document.querySelectorAll(`#${NAV_ID} button`).forEach((button) => {
      button.classList.toggle('active', button.dataset.tab === key);
    });
  };

  const go = (key) => {
    if (key === 'home') showHome();
    if (key === 'bookings') showBookings();
    if (key === 'saved') showSaved();
    if (key === 'profile') showProfile();
    try { history.replaceState({}, '', `${location.pathname}${location.search}#${key}`); } catch {}
  };

  const buildNav = () => {
    let nav = document.getElementById(NAV_ID);
    if (nav) {
      nav.querySelectorAll('small').forEach((el, index) => {
        const keys = ['home', 'bookings', 'saved', 'profile'];
        el.textContent = t(keys[index]);
      });
      return nav;
    }

    nav = document.createElement('nav');
    nav.id = NAV_ID;
    nav.className = 'bookly-runtime-bottom-nav';

    const items = [
      ['home', '⌂'],
      ['bookings', '◷'],
      ['saved', '♡'],
      ['profile', '◎']
    ];

    items.forEach(([key, icon]) => {
      const button = document.createElement('button');
      button.type = 'button';
      button.dataset.tab = key;
      button.innerHTML = `<span aria-hidden="true">${icon}</span><small>${t(key)}</small>`;
      button.addEventListener('click', () => go(key));
      nav.appendChild(button);
    });

    document.body.appendChild(nav);
    return nav;
  };

  const renderPage = () => {
    if (!getClientSection()) return;
    buildNav();
    const hash = location.hash.replace('#', '');
    if (hash === 'bookings') showBookings();
    else if (hash === 'saved') showSaved();
    else if (hash === 'profile') showProfile();
    else showHome();
  };

  let previousLang = getLang();
  let previousClient = false;
  let ticking = false;

  const sync = () => {
    if (ticking) return;
    ticking = true;
    requestAnimationFrame(() => {
      ticking = false;
      const client = !!getClientSection();
      const lang = getLang();

      if (client && !previousClient) {
        renderPage();
      } else if (client && lang !== previousLang) {
        renderPage();
      } else if (!client && previousClient) {
        document.getElementById(NAV_ID)?.remove();
        document.getElementById(PROFILE_ID)?.remove();
      }

      previousClient = client;
      previousLang = lang;
    });
  };

  const observer = new MutationObserver(sync);
  observer.observe(document.getElementById('root') || document.body, { childList: true, subtree: true });
  window.addEventListener('hashchange', renderPage);
  setInterval(sync, 800);
  setTimeout(sync, 400);
})();
