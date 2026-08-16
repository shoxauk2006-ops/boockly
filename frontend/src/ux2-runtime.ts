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
  if (document.querySelector('.client-hero')) return 'client';
  if (document.querySelector('.business-head')) return 'owner';
  return 'home';
};

const buttonByText = (text: string) => {
  return Array.from(document.querySelectorAll('button')).find(
    (button) => button.textContent?.includes(text)
  ) as HTMLButtonElement | undefined;
};

const openDetailsByText = (text: string) => {
  const summary = Array.from(document.querySelectorAll('summary')).find(
    (item) => item.textContent?.includes(text)
  ) as HTMLElement | undefined;

  if (summary) {
    const details = summary.parentElement as HTMLDetailsElement;
    if (details) details.open = true;
    summary.scrollIntoView({ behavior: 'smooth', block: 'start' });
  }
};

const createProfileOverlay = () => {
  const existing = document.getElementById('bookly-ux2-profile');
  if (existing) existing.remove();

  const t = createTranslator(language);

  const overlay = document.createElement('div');
  overlay.id = 'bookly-ux2-profile';
  overlay.className = 'ux2-overlay';

  const card = document.createElement('div');
  card.className = 'ux2-profile-card';
  card.dir = language === 'ar' ? 'rtl' : 'ltr';

  const title = document.createElement('h2');
  title.textContent = t('nav.profile');

  const close = document.createElement('button');
  close.className = 'ux2-close';
  close.textContent = '×';
  close.onclick = () => overlay.remove();

  const header = document.createElement('div');
  header.className = 'ux2-profile-header';
  header.append(title, close);

  const languageTitle = document.createElement('h3');
  languageTitle.textContent = t('language.title');

  const list = document.createElement('div');
  list.className = 'ux2-language-list';

  SUPPORTED_LANGUAGES.forEach((item) => {
    const option = document.createElement('button');
    option.className = `ux2-language-option${item.code === language ? ' active' : ''}`;
    option.dir = item.dir;
    option.innerHTML = `<span>${item.nativeLabel}</span><span>${item.code === language ? '✓' : ''}</span>`;

    option.onclick = () => {
      language = item.code;
      setStoredLanguage(language);
      applyLanguageDirection(language);
      overlay.remove();
      renderRuntime();
    };

    list.appendChild(option);
  });

  card.append(header, languageTitle, list);
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
      openDetailsByText('📅 Мои записи');
      return;
    }

    if (action === 'saved') {
      openDetailsByText('❤️ Сохранённые бизнесы');
      return;
    }

    if (action === 'home') {
      window.scrollTo({ top: 0, behavior: 'smooth' });
      return;
    }
  }

  if (mode === 'owner') {
    if (action === 'bookings') {
      buttonByText('Записи')?.click();
      return;
    }

    if (action === 'services') {
      buttonByText('Услуги')?.click();
      return;
    }

    if (action === 'home') {
      buttonByText('Главная')?.click();
    }
  }
};

let lastMode: Mode = 'home';

const renderRuntime = () => {
  const mode = getMode();

  if (mode === 'home') {
    document.getElementById('bookly-ux2-nav')?.remove();
    return;
  }

  let nav = document.getElementById('bookly-ux2-nav');
  if (!nav) {
    nav = document.createElement('nav');
    nav.id = 'bookly-ux2-nav';
    nav.className = 'bookly-bottom-nav ux2-bottom-nav';
    document.body.appendChild(nav);
  }

  nav.innerHTML = '';

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

  items.forEach(([action, icon, label]) => {
    const button = document.createElement('button');
    button.type = 'button';
    button.innerHTML = `<span>${icon}</span>${label}`;
    button.onclick = () => navigateBottom(action);
    nav!.appendChild(button);
  });

  if (mode !== lastMode) {
    window.scrollTo({ top: 0, behavior: 'auto' });
    lastMode = mode;
  }
};

const observer = new MutationObserver(() => {
  window.requestAnimationFrame(renderRuntime);
});

observer.observe(document.body, {
  childList: true,
  subtree: true,
});

window.setTimeout(renderRuntime, 150);
window.setInterval(renderRuntime, 1000);
