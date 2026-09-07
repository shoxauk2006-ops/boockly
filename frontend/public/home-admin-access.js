/* Bookly Home — persistent admin quick access for frequent business owners. */
(function () {
  var STORAGE_KEY = 'bookly_last_mode';
  var ADMIN_VALUE = 'admin';
  var AUTO_OPEN_DELAY = 120;
  var CREATE_TEXT_RE = /создать|create|yarat|oluştur|إنشاء|создать бизнес|create business/i;
  var autoOpenAttempted = false;

  function isClientEntry() {
    try {
      var telegram = window.Telegram && window.Telegram.WebApp;
      var startParam =
        (telegram && telegram.initDataUnsafe && telegram.initDataUnsafe.start_param) ||
        new URLSearchParams(window.location.search).get('startapp') ||
        '';
      if (startParam) {
        autoOpenAttempted = true;
      }
      return Boolean(startParam);
    } catch (_) {
      return false;
    }
  }

  function isExistingBusinessCard(card) {
    if (!card) return false;
    var button = card.querySelector('.personal-white-button');
    var heading = card.querySelector('h2');
    if (!button) return false;

    var buttonText = (button.textContent || '').trim();
    var headingText = (heading && heading.textContent || '').trim();

    if (CREATE_TEXT_RE.test(buttonText)) return false;
    if (CREATE_TEXT_RE.test(headingText)) return false;

    return true;
  }

  function rememberAdminClick() {
    var card = document.querySelector('.personal-business-card');
    if (!isExistingBusinessCard(card)) return;

    var button = card.querySelector('.personal-white-button');
    if (!button || button.dataset.booklyAdminBound === '1') return;

    button.dataset.booklyAdminBound = '1';
    button.addEventListener('click', function () {
      try {
        localStorage.setItem(STORAGE_KEY, ADMIN_VALUE);
      } catch (_) {}
    }, true);
  }

  function tryAutoOpenAdmin() {
    if (autoOpenAttempted || isClientEntry()) return;

    try {
      if (localStorage.getItem(STORAGE_KEY) !== ADMIN_VALUE) return;
    } catch (_) {
      return;
    }

    var home = document.querySelector('.personal-home');
    if (!home) return;

    var card = home.querySelector('.personal-business-card');
    if (!isExistingBusinessCard(card)) return;

    var button = card.querySelector('.personal-white-button');
    if (!button || button.dataset.booklyAutoOpened === '1') return;

    autoOpenAttempted = true;
    button.dataset.booklyAutoOpened = '1';
    window.setTimeout(function () {
      try {
        button.click();
      } catch (_) {}
    }, AUTO_OPEN_DELAY);
  }

  function scan() {
    rememberAdminClick();
    tryAutoOpenAdmin();
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', scan, { once: true });
  } else {
    scan();
  }

  var observer = new MutationObserver(function () {
    scan();
  });

  observer.observe(document.documentElement, {
    childList: true,
    subtree: true
  });
})();
