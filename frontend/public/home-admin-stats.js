/* Bookly Home — live admin snapshot with instant cached values. */
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
  var scanTimer = null;

  function tg() {
    return window.Telegram && window.Telegram.WebApp;
  }

  function headers() {
    var result = {
      'Content-Type': 'application/json',
      'X-Telegram-Init-Data': (tg() && tg().initData) || ''
    };

    try {
      var businessId = localStorage.getItem('bookly_active_business_id');
      if (businessId) result['X-Bookly-Business-Id'] = businessId;
    } catch (_) {}

    return result;
  }

  function dateKeyInZone(date, timeZone) {
    try {
      var parts = new Intl.DateTimeFormat('en-CA', {
        timeZone: timeZone || 'UTC',
        year: 'numeric', month: '2-digit', day: '2-digit'
      }).formatToParts(date);
      var get = function (type) {
        var found = parts.find(function (part) { return part.type === type; });
        return found ? found.value : '';
      };
      return get('year') + '-' + get('month') + '-' + get('day');
    } catch (_) {
      var d = new Date(date);
      return [d.getFullYear(), String(d.getMonth() + 1).padStart(2, '0'), String(d.getDate()).padStart(2, '0')].join('-');
    }
  }

  function currentDateTimeKey(timeZone) {
    var now = new Date();
    var day = dateKeyInZone(now, timeZone || 'UTC');
    var time = new Intl.DateTimeFormat('en-GB', {
      timeZone: timeZone || 'UTC', hour: '2-digit', minute: '2-digit', hour12: false
    }).format(now);
    return day + ' ' + time;
  }

  function translate(label) {
    var language = 'en';
    try {
      var stored = localStorage.getItem('bookly_language');
      if (stored) language = stored.slice(0, 2);
    } catch (_) {}
    var map = {
      ru: { today: 'Сегодня', upcoming: 'Предстоящие' },
      en: { today: 'Today', upcoming: 'Upcoming' },
      uz: { today: 'Bugun', upcoming: 'Yaqinda' },
      tr: { today: 'Bugün', upcoming: 'Yaklaşan' },
      ar: { today: 'اليوم', upcoming: 'القادمة' }
    };
    return (map[language] || map.en)[label];
  }

  function cacheRead() {
    try {
      var raw = localStorage.getItem(CACHE_KEY);
      return raw ? JSON.parse(raw) : null;
    } catch (_) {
      return null;
    }
  }

  function cacheWrite(snapshot) {
    try {
      localStorage.setItem(CACHE_KEY, JSON.stringify(snapshot));
    } catch (_) {}
  }

  function getBusinessId() {
    try {
      return localStorage.getItem('bookly_active_business_id') || '';
    } catch (_) {
      return '';
    }
  }

  function getBusinessFromCache() {
    var cached = cacheRead();
    var id = getBusinessId();
    if (!cached || !cached.business || !id) return null;
    if (String(cached.business.id) !== String(id)) return null;
    return cached.business;
  }

  function isRealBusinessCard(card) {
    if (!card) return false;
    var button = card.querySelector('.personal-white-button');
    var heading = card.querySelector('h2');
    if (!button) return false;
    var text = ((button.textContent || '') + ' ' + (heading && heading.textContent || '')).toLowerCase();
    return !/создать|create|yarat|oluştur|إنشاء/.test(text);
  }

  function setStatsValues(todayCount, upcomingCount, business) {
    var card = document.querySelector('.personal-business-card');
    if (!isRealBusinessCard(card)) return;

    var existing = card.querySelector('.home-admin-stats');
    if (existing) existing.remove();

    var stats = document.createElement('div');
    stats.className = 'home-admin-stats';
    stats.innerHTML =
      '<div class="home-admin-stat">' +
        '<span class="home-admin-stat-label">' + translate('today') + '</span>' +
        '<strong class="home-admin-stat-value">' + todayCount + '</strong>' +
      '</div>' +
      '<div class="home-admin-stat">' +
        '<span class="home-admin-stat-label">' + translate('upcoming') + '</span>' +
        '<strong class="home-admin-stat-value">' + upcomingCount + '</strong>' +
      '</div>';
    card.appendChild(stats);

    if (business) {
      card.dataset.booklyStatsReady = '1';
    }
  }

  function calculate(bookings, business) {
    var timeZone = (business && business.timezone) || 'UTC';
    var today = dateKeyInZone(new Date(), timeZone);
    var currentKey = currentDateTimeKey(timeZone);
    var todayCount = 0;
    var upcomingCount = 0;

    (Array.isArray(bookings) ? bookings : []).forEach(function (booking) {
      if (!booking || booking.status !== 'confirmed') return;
      if (booking.day === today) todayCount += 1;
      var candidate = String(booking.day || '') + ' ' + String(booking.start || '');
      if (candidate && candidate >= currentKey) upcomingCount += 1;
    });

    return { today: todayCount, upcoming: upcomingCount };
  }

  function renderCached() {
    var cached = cacheRead();
    if (!cached || !cached.business || !cached.stats) return;
    if (String(cached.business.id) !== String(getBusinessId())) return;
    setStatsValues(cached.stats.today, cached.stats.upcoming, cached.business);
  }

  async function refresh() {
    var home = document.querySelector('.personal-home');
    var card = home && home.querySelector('.personal-business-card');
    if (!isRealBusinessCard(card)) return;

    var cachedBusiness = getBusinessFromCache();
    if (cachedBusiness) renderCached();

    try {
      var responses = await Promise.all([
        fetch(API + '/admin/business', { headers: headers() }),
        fetch(API + '/admin/bookings', { headers: headers() })
      ]);

      var business = responses[0].ok ? await responses[0].json() : cachedBusiness;
      var bookings = responses[1].ok ? await responses[1].json() : [];

      if (!business) return;

      var stats = calculate(bookings, business);
      cacheWrite({
        savedAt: Date.now(),
        business: {
          id: business.id,
          name: business.name,
          timezone: business.timezone || 'UTC'
        },
        stats: stats
      });
      setStatsValues(stats.today, stats.upcoming, business);
    } catch (error) {
      if (cachedBusiness) renderCached();
      console.warn('Bookly Home admin stats error:', error);
    }
  }

  function scan() {
    renderCached();
    window.clearTimeout(scanTimer);
    scanTimer = window.setTimeout(refresh, 80);
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', scan, { once: true });
  } else {
    scan();
  }

  var observer = new MutationObserver(function () {
    if (document.querySelector('.personal-business-card')) scan();
  });

  observer.observe(document.documentElement, { childList: true, subtree: true });

  window.setInterval(function () {
    if (document.visibilityState !== 'hidden') refresh();
  }, 60000);
})();
