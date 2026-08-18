(() => {
  const ADMIN_FLAG = '__BOOKLY_ADMIN_MODE';
  const root = () => document.getElementById('root');
  const isClient = () => {
    const r = root();
    return !!(r && r.querySelector('.client-hero'));
  };
  const isAdmin = () => {
    const r = root();
    return !!(r && (
      r.querySelector('.business-head') ||
      r.querySelector('.tabs') ||
      r.querySelector('.loading-screen')
    ));
  };
  const isPersonalHome = () => {
    const r = root();
    return !!(r && r.querySelector('.hero') && !r.querySelector('.client-hero'));
  };

  const syncMode = () => {
    const r = root();
    if (!r) return;

    if (isAdmin()) {
      window[ADMIN_FLAG] = true;
      r.classList.remove('bookly-client-root');
      document.body.classList.remove('bookly-client-body');
      return;
    }

    if (isClient()) {
      r.classList.add('bookly-client-root');
      document.body.classList.add('bookly-client-body');
      return;
    }

    if (isPersonalHome()) {
      window[ADMIN_FLAG] = false;
      r.classList.remove('bookly-client-root');
      document.body.classList.remove('bookly-client-body');
    }
  };

  const captureAdminActions = (event) => {
    const target = event.target instanceof Element
      ? event.target.closest('button')
      : null;
    if (!target) return;

    const text = (target.textContent || '').trim().toLowerCase();
    if (
      /manage|управлять|админ|admin|boshqar|yönet|إدارة/.test(text)
      || /create business|создать бизнес|добавить бизнес|create|создать|добавить/.test(text)
    ) {
      window[ADMIN_FLAG] = true;
    }
  };

  document.addEventListener('click', captureAdminActions, true);

  const observer = new MutationObserver(syncMode);
  observer.observe(document.body, { childList: true, subtree: true });

  syncMode();
  setInterval(syncMode, 500);
})();
