/* Bookly Home — paint the cached/current business access bar before the React list request finishes. */
(function () {
  var API = (function () {
    try {
      var meta = document.querySelector('meta[name="bookly-api-url"]');
      var value = meta && meta.getAttribute('content');
      return value && !value.includes('%VITE_API_URL%') ? value : '';
    } catch (_) {
      return '';
    }
  })();

  if (!API) API = 'http://localhost:8000';

  var CACHE_KEY = 'bookly_home_admin_snapshot_v1';
  var mounted = false;
  var pendingManage = false;

  function tg() {
    return window.Telegram && window.Telegram.WebApp;
  }

  function headers() {
    var result = {
      'Content-Type': 'application/json',
      'X-Telegram-Init-Data': (tg() && tg().initData) || ''
    };

    try {
      var id = localStorage.getItem('bookly_active_business_id');
      if (id) result['X-Bookly-Business-Id'] = id;
    } catch (_) {}

    return result;
  }

  function isClientEntry() {
    try {
      var startParam =
        (tg() && tg().initDataUnsafe && tg().initDataUnsafe.start_param) ||
        new URLSearchParams(window.location.search).get('startapp') ||
        '';
      return Boolean(startParam);
    } catch (_) {
      return false;
    }
  }

  function readCache() {
    try {
      var raw = localStorage.getItem(CACHE_KEY);
      return raw ? JSON.parse(raw) : null;
    } catch (_) {
      return null;
    }
  }

  function saveCache(business) {
    if (!business || !business.id) return;
    try {
      var previous = readCache() || {};
      localStorage.setItem(CACHE_KEY, JSON.stringify({
        savedAt: Date.now(),
        business: {
          id: business.id,
          name: business.name || '',
          timezone: business.timezone || 'UTC'
        },
        stats: previous.stats || null
      }));
    } catch (_) {}
  }

  function language() {
    try {
      return (localStorage.getItem('bookly_language') || 'en').slice(0, 2);
    } catch (_) {
      return 'en';
    }
  }

  function text(key) {
    var map = {
      ru: { panel: 'АДМИН-ПАНЕЛЬ', manage: 'Управлять', create: 'Создать бизнес' },
      en: { panel: 'ADMIN PANEL', manage: 'Manage', create: 'Create business' },
      uz: { panel: 'ADMIN PANEL', manage: 'Boshqarish', create: 'Biznes yaratish' },
      tr: { panel: 'YÖNETİCİ PANELİ', manage: 'Yönet', create: 'İşletme oluştur' },
      ar: { panel: 'لوحة الإدارة', manage: 'إدارة', create: 'إنشاء نشاط' }
    };
    return (map[language()] || map.en)[key];
  }

  function isCreateCard(card) {
    if (!card) return true;
    var button = card.querySelector('.personal-white-button');
    var heading = card.querySelector('h2');
    var value = ((button && button.textContent) || '') + ' ' + ((heading && heading.textContent) || '');
    return /создать|create|yarat|oluştur|إنشاء/i.test(value);
  }

  function realCard() {
    var home = document.querySelector('.personal-home');
    var card = home && home.querySelector('.personal-business-card');
    return card && !isCreateCard(card) ? card : null;
  }

  function removeFastCard() {
    var node = document.querySelector('.home-admin-fast-card');
    if (node) node.remove();
    mounted = false;
  }

  function clickRealManage() {
    var card = realCard();
    var button = card && card.querySelector('.personal-white-button');
    if (button) {
      button.click();
      pendingManage = false;
      return true;
    }
    return false;
  }

  function mount(business) {
    if (!business || !business.name || isClientEntry()) return;
    if (realCard()) {
      removeFastCard();
      return;
    }

    var home = document.querySelector('.personal-home');
    if (!home) return;

    var existing = home.querySelector('.home-admin-fast-card');
    if (existing) existing.remove();

    var card = document.createElement('div');
    card.className = 'personal-business-card home-admin-fast-card';
    card.innerHTML =
      '<span class="personal-eyebrow light">' + text('panel') + '</span>' +
      '<h2>' + escapeHtml(String(business.name)) + '</h2>' +
      '<p style="display:none"></p>' +
      '<button type="button" class="personal-white-button">' + text('manage') + '</button>';

    var hero = home.querySelector('.personal-home-hero');
    if (hero && hero.nextSibling) {
      home.insertBefore(card, hero.nextSibling);
    } else {
      home.appendChild(card);
    }

    card.addEventListener('click', function (event) {
      var target = event.target;
      if (target && target.closest && target.closest('.personal-white-button')) {
        pendingManage = true;
        if (!clickRealManage()) {
          window.setTimeout(clickRealManage, 80);
          window.setTimeout(clickRealManage, 250);
          window.setTimeout(clickRealManage, 700);
        }
      }
    });

    mounted = true;
  }

  function escapeHtml(value) {
    return value
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#039;');
  }

  function tryMount() {
    if (isClientEntry()) return;
    var cached = readCache();
    if (cached && cached.business) mount(cached.business);
    if (pendingManage) clickRealManage();
    if (realCard()) removeFastCard();
  }

  async function fetchFastBusiness() {
    if (isClientEntry()) return;

    try {
      var response = await fetch(API + '/admin/business', { headers: headers() });
      if (!response.ok) return;
      var business = await response.json();
      if (!business || !business.id || !business.name) return;
      saveCache(business);
      mount(business);
    } catch (_) {}
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', tryMount, { once: true });
  } else {
    tryMount();
  }

  // Start the lighter single-business request immediately, without waiting for React.
  void fetchFastBusiness();

  var observer = new MutationObserver(function () {
    if (realCard()) {
      removeFastCard();
      if (pendingManage) clickRealManage();
      return;
    }
    if (!mounted) tryMount();
  });

  observer.observe(document.documentElement, { childList: true, subtree: true });
})();
