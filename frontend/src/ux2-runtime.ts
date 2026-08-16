import './ux2.css';
import {
  Language,
  SUPPORTED_LANGUAGES,
  createTranslator,
  detectLanguage,
  setStoredLanguage,
  applyLanguageDirection,
} from './i18n';

let language: Language = detectLanguage();
applyLanguageDirection(language);

type Mode = 'client' | 'owner' | 'home';

const getMode = (): Mode => {
  if (document.querySelector('.business-head')) return 'owner';

  const startParam =
    window.Telegram?.WebApp?.initDataUnsafe?.start_param ||
    new URLSearchParams(window.location.search).get('startapp') ||
    '';

  if (
    startParam ||
    document.querySelector('#booking-form') ||
    Array.from(document.querySelectorAll('summary')).some((item) =>
      /Мои записи|My bookings|حجوزاتي|Mening bronlarim|Randevularım/.test(item.textContent || '')
    )
  ) return 'client';

  return 'home';
};

const findTabButton = (labels: string[]) => {
  const buttons = Array.from(document.querySelectorAll('.tabs button')) as HTMLButtonElement[];
  return buttons.find((button) => {
    const text = (button.textContent || '').trim();
    return labels.some((label) => text === label);
  });
};

const openDetailsByText = (labels: string[]) => {
  const summary = Array.from(document.querySelectorAll('summary')).find((item) => {
    const text = item.textContent || '';
    return labels.some((label) => text.includes(label));
  }) as HTMLElement | undefined;

  if (!summary) return;
  const details = summary.parentElement as HTMLDetailsElement | null;
  if (details) details.open = true;
  summary.scrollIntoView({ behavior: 'smooth', block: 'start' });
};

const scrollToText = (labels: string[]) => {
  const nodes = Array.from(document.querySelectorAll('body *')) as HTMLElement[];
  const match = nodes.find((node) => {
    const text = (node.textContent || '').trim();
    return labels.some((label) => text === label);
  });
  match?.scrollIntoView({ behavior: 'smooth', block: 'center' });
};

const clickBusinessSwitcher = () => {
  const current = Array.from(document.querySelectorAll('*')).find((node) =>
    (node.textContent || '').trim() === 'Текущий бизнес'
  ) as HTMLElement | undefined;

  const card = current?.closest('.card') || current?.parentElement;
  const button = card?.querySelector('button') as HTMLButtonElement | null;
  button?.click();
};

const createProfileRow = (
  parent: HTMLElement,
  title: string,
  subtitle: string,
  onClick: () => void,
) => {
  const row = document.createElement('button');
  row.type = 'button';
  row.className = 'ux2-profile-row';
  row.innerHTML = `
    <span class="ux2-profile-row-copy">
      <strong>${title}</strong>
      <small>${subtitle}</small>
    </span>
    <span class="ux2-profile-row-arrow">›</span>
  `;
  row.onclick = onClick;
  parent.appendChild(row);
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
  header.innerHTML = `
    <div class="ux2-profile-head-copy">
      <div class="ux2-profile-avatar">${displayName.charAt(0).toUpperCase()}</div>
      <div>
        <h2>${t('nav.profile')}</h2>
        <p>${username}</p>
      </div>
    </div>
  `;

  const close = document.createElement('button');
  close.type = 'button';
  close.className = 'ux2-close';
  close.textContent = '×';
  close.onclick = () => overlay.remove();
  header.appendChild(close);
  card.appendChild(header);

  const section = document.createElement('h3');
  section.className = 'ux2-profile-section-title';
  section.textContent = mode === 'owner' ? t('nav.settings') : t('nav.profile');
  card.appendChild(section);

  const list = document.createElement('div');
  list.className = 'ux2-profile-list';

  if (mode === 'owner') {
    createProfileRow(list, t('nav.bookings'), t('owner.upcoming'), () => {
      overlay.remove();
      findTabButton(['Записи', 'Bookings', 'Randevular', 'Bronlar', 'الحجوزات'])?.click();
    });

    createProfileRow(list, t('nav.services'), t('client.services'), () => {
      overlay.remove();
      findTabButton(['Услуги', 'Services', 'Hizmetler', 'Xizmatlar', 'الخدمات'])?.click();
    });

    createProfileRow(list, t('nav.schedule'), 'Рабочие часы', () => {
      overlay.remove();
      findTabButton(['График', 'Schedule', 'Çalışma saatleri', 'Jadval', 'الجدول'])?.click();
    });

    createProfileRow(list, t('nav.blocks'), 'Закрытые интервалы', () => {
      overlay.remove();
      findTabButton(['Блокировки', 'Blocked times', 'Engellenen saatler', 'Bloklangan vaqtlar', 'الأوقات المحجوزة'])?.click();
    });

    createProfileRow(list, t('nav.businesses'), t('owner.currentBusiness'), () => {
      overlay.remove();
      clickBusinessSwitcher();
    });

    createProfileRow(list, t('nav.settings'), t('settings.businessInfo'), () => {
      overlay.remove();
      findTabButton(['Настройки', 'Settings', 'Ayarlar', 'Sozlamalar', 'الإعدادات'])?.click();
    });

    createProfileRow(list, t('nav.subscription'), 'Bookly Pro', () => {
      overlay.remove();
      scrollToText(['Подписка', 'Subscription', 'Abonelik', 'Obuna', 'الاشتراك']);
    });
  } else {
    createProfileRow(list, t('client.myBookings'), t('owner.upcoming'), () => {
      overlay.remove();
      openDetailsByText(['Мои записи', 'My bookings', 'Mening bronlarim', 'حجوزاتي']);
    });

    createProfileRow(list, t('client.savedBusinesses'), '❤️', () => {
      overlay.remove();
      openDetailsByText(['Сохранённые бизнесы', 'Saved businesses', 'Saqlangan bizneslar', 'Kaydedilen işletmeler', 'الأنشطة المحفوظة']);
    });

    createProfileRow(list, t('nav.admin'), 'Для владельца бизнеса', () => {
      overlay.remove();
      Array.from(document.querySelectorAll('button'))
        .find((button) => (button.textContent || '').includes('Админ-панель'))
        ?.click();
    });
  }

  card.appendChild(list);

  const languageTitle = document.createElement('h3');
  languageTitle.className = 'ux2-profile-section-title';
  languageTitle.textContent = t('language.title');
  card.appendChild(languageTitle);

  const languageList = document.createElement('div');
  languageList.className = 'ux2-language-list';

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
      window.location.reload();
    };
    languageList.appendChild(option);
  });

  card.appendChild(languageList);
  overlay.appendChild(card);
  overlay.onclick = (event) => {
    if (event.target === overlay) overlay.remove();
  };
  document.body.appendChild(overlay);
};

const navigateBottom = (action: string) => {
  const mode = getMode();

  if (action === 'profile') {
    createProfileOverlay();
    return;
  }

  if (mode === 'client') {
    if (action === 'bookings') {
      openDetailsByText(['📅 Мои записи', 'Мои записи', 'My bookings', 'Mening bronlarim', 'حجوزاتي']);
      return;
    }
    if (action === 'saved') {
      openDetailsByText(['❤️ Сохранённые бизнесы', 'Сохранённые бизнесы', 'Saved businesses', 'Saqlangan bizneslar', 'Kaydedilen işletmeler', 'الأنشطة المحفوظة']);
      return;
    }
    if (action === 'home') {
      window.scrollTo({ top: 0, behavior: 'smooth' });
      return;
    }
  }

  if (mode === 'owner') {
    if (action === 'bookings') {
      findTabButton(['Записи', 'Bookings', 'Randevular', 'Bronlar', 'الحجوزات'])?.click();
      return;
    }
    if (action === 'services') {
      findTabButton(['Услуги', 'Services', 'Hizmetler', 'Xizmatlar', 'الخدمات'])?.click();
      return;
    }
    if (action === 'home') {
      findTabButton(['Главная', 'Home', 'Ana sayfa', 'Bosh sahifa', 'الرئيسية'])?.click();
    }
  }
};

let lastMode: Mode = 'home';
let lastRenderSignature = '';
let navClickBound = false;

const renderRuntime = (force = false) => {
  const mode = getMode();
  if (mode === 'home') {
    document.getElementById('bookly-ux2-nav')?.remove();
    lastRenderSignature = 'home';
    return;
  }

  const t = createTranslator(language);
  const items = mode === 'client'
    ? [
        ['home', '⌂', t('nav.home')],
        ['saved', '♡', t('nav.saved')],
        ['bookings', '◷', t('nav.bookings')],
        ['profile', '◯', t('nav.profile')],
      ]
    : [
        ['home', '⌂', t('nav.home')],
        ['bookings', '◷', t('nav.bookings')],
        ['services', '✦', t('nav.services')],
        ['profile', '◯', t('nav.profile')],
      ];

  const signature = `${mode}|${language}|${items.map((item) => `${item[0]}:${item[2]}`).join('|')}`;
  let nav = document.getElementById('bookly-ux2-nav') as HTMLElement | null;

  if (!nav) {
    nav = document.createElement('nav');
    nav.id = 'bookly-ux2-nav';
    nav.className = 'bookly-bottom-nav ux2-bottom-nav';
    nav.setAttribute('aria-label', 'Bookly navigation');
    document.body.appendChild(nav);
  }

  if (force || lastRenderSignature !== signature) {
    nav.innerHTML = '';
    items.forEach(([action, icon, label]) => {
      const button = document.createElement('button');
      button.type = 'button';
      button.dataset.action = action;
      button.setAttribute('aria-label', label);
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
      event.preventDefault();
      event.stopPropagation();
      navigateBottom(button.dataset.action || '');
    });
    navClickBound = true;
  }

  if (mode !== lastMode) {
    window.scrollTo({ top: 0, behavior: 'auto' });
    lastMode = mode;
  }
};

const observer = new MutationObserver(() => {
  window.requestAnimationFrame(() => renderRuntime(false));
});
observer.observe(document.body, { childList: true, subtree: true });
window.setTimeout(() => renderRuntime(true), 150);
window.setInterval(() => renderRuntime(false), 1000);
