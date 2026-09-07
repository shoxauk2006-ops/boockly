/* Bookly Home — live admin snapshot. */
(function () {
  var API = (function () {
    try {
      var meta = document.querySelector('meta[name="bookly-api-url"]');
      var value = meta && meta.getAttribute('content');
      return value && !value.includes('%VITE_API_URL%')
        ? value
        : '';
    } catch (_) {
      return '';
    }
  })();

  if (!API) {
    API = 'http://localhost:8000';
  }

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
      if (businessId) {
        result['X-Bookly-Business-Id'] = businessId;
      }
    } catch (_) {}

    return result;
  }

  function dateKeyInZone(date, timeZone) {
    try {
      var parts = new Intl.DateTimeFormat('en-CA', {
        timeZone: timeZone || 'UTC',
        year: 'numeric',
        month: '2-digit',
        day: '2-digit'
      }).formatToParts(date);

      var get = function (type) {
        var found = parts.find(function (part) { return part.type === type; });
        return found ? found.value : '';
      };

      return get('year') + '-' + get('month') + '-' + get('day');
    } catch (_) {
      var d = new Date(date);
      return [
        d.getFullYear(),
        String(d.getMonth() + 1).padStart(2, '0'),
        String(d.getDate()).padStart(2, '0')
      ].join('-');
    }
  }

  function localDateTimeKey(day, start) {
    return String(day || '') + ' ' + String(start || '');
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

  function mount(bookings, business) {
    var card = document.querySelector('.personal-business-card');
    if (!card || !business || !card.querySelector('.personal-white-button')) {
      return;
    }

    var existing = card.querySelector('.home-admin-stats');
    if (existing) existing.remove();

    var today = dateKeyInZone(new Date(), business.timezone || 'UTC');
    var now = new Date();

    var todayCount = 0;
    var upcomingCount = 0;

    (Array.isArray(bookings) ? bookings : []).forEach(function (booking) {
      if (booking && booking.status !== 'confirmed') return;

      if (booking && booking.day === today) {
        todayCount += 1;
      }

      var candidate = localDateTimeKey(booking && booking.day, booking && booking.start);
      if (!candidate) return;

      var currentKey = dateKeyInZone(now, business.timezone || 'UTC') + ' ' +
        new Intl.DateTimeFormat('en-GB', {
          timeZone: business.timezone || 'UTC',
          hour: '2-digit',
          minute: '2-digit',
          hour12: false
        }).format(now);

      if (candidate >= currentKey) {
        upcomingCount += 1;
      }
    });

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
  }

  async function refresh() {
    var home = document.querySelector('.personal-home');
    var card = home && home.querySelector('.personal-business-card');
    if (!card || !card.querySelector('.personal-white-button')) return;
    if ((card.querySelector('h2') || {}).textContent && /создать|create|yarat|oluştur|إنشاء/i.test(card.querySelector('h2').textContent)) return;

    try {
      var responses = await Promise.all([
        fetch(API + '/admin/business', { headers: headers() }),
        fetch(API + '/admin/bookings', { headers: headers() })
      ]);

      var business = responses[0].ok ? await responses[0].json() : null;
      var bookings = responses[1].ok ? await responses[1].json() : [];

      if (business) mount(bookings, business);
    } catch (error) {
      console.warn('Bookly Home admin stats error:', error);
    }
  }

  function scan() {
    refresh();
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', scan, { once: true });
  } else {
    scan();
  }

  var observer = new MutationObserver(function () {
    if (document.querySelector('.personal-business-card')) {
      window.clearTimeout(observer._timer);
      observer._timer = window.setTimeout(scan, 180);
    }
  });

  observer.observe(document.documentElement, { childList: true, subtree: true });

  window.setInterval(function () {
    if (document.visibilityState !== 'hidden') refresh();
  }, 60000);
})();
