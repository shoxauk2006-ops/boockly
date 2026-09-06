(function () {
  'use strict';

  // Disable the older DOM decorator from paddle-env-bridge.ts.
  // This file is the single UI implementation for choosing month/year.
  try {
    window.__booklyBillingPeriodUiInstalled = true;
  } catch (_) {}

  var STORAGE_KEY = 'bookly_billing_period';
  var LIMITS = [20, 30, 50, 100];
  var monthlyFallback = {
    10: 7.99,
    20: 12.98,
    30: 15.98,
    50: 19.98,
    100: 27.98
  };

  var state = {
    prices: {
      month: {},
      year: {}
    },
    token: '',
    loadingToken: false,
    loading: {
      month: false,
      year: false
    }
  };

  function getLanguage() {
    try {
      var selector = document.querySelector('.language-select');
      var value = selector && selector.value;
      if (value && ['ru', 'en', 'uz', 'tr', 'ar'].indexOf(value) !== -1) {
        return value;
      }
    } catch (_) {}

    var browser = String(navigator.language || 'en').slice(0, 2).toLowerCase();
    return ['ru', 'en', 'uz', 'tr', 'ar'].indexOf(browser) !== -1 ? browser : 'en';
  }

  function tr() {
    var maps = {
      ru: { month: 'Месяц', year: 'Год', unitMonth: '/ месяц', unitYear: '/ год' },
      en: { month: 'Monthly', year: 'Yearly', unitMonth: '/ month', unitYear: '/ year' },
      uz: { month: 'Oylik', year: 'Yillik', unitMonth: '/ oy', unitYear: '/ yil' },
      tr: { month: 'Aylık', year: 'Yıllık', unitMonth: '/ ay', unitYear: '/ yıl' },
      ar: { month: 'شهري', year: 'سنوي', unitMonth: '/ شهر', unitYear: '/ سنة' }
    };
    return maps[getLanguage()] || maps.en;
  }

  function getBilling() {
    try {
      return localStorage.getItem(STORAGE_KEY) === 'year' ? 'year' : 'month';
    } catch (_) {
      return 'month';
    }
  }

  function setBilling(value) {
    try {
      localStorage.setItem(STORAGE_KEY, value);
    } catch (_) {}
    try {
      window.__booklyBillingPeriod = value;
    } catch (_) {}
  }

  function getApi() {
    try {
      var meta = document.querySelector('meta[name="bookly-api-url"]');
      return String((meta && meta.content) || '').replace(/\/$/, '');
    } catch (_) {
      return '';
    }
  }

  function getInitData() {
    try {
      return String(
        window.Telegram &&
        window.Telegram.WebApp &&
        window.Telegram.WebApp.initData ||
        ''
      );
    } catch (_) {
      return '';
    }
  }

  function getBusinessId() {
    try {
      return String(localStorage.getItem('bookly_active_business_id') || '');
    } catch (_) {
      return '';
    }
  }

  function fetchJson(url, options) {
    return fetch(url, options).then(function (response) {
      return response.json().catch(function () { return null; }).then(function (data) {
        if (!response.ok) {
          throw new Error((data && data.detail) || 'Request failed');
        }
        return data;
      });
    });
  }

  function ensureToken() {
    if (state.token) return Promise.resolve(state.token);
    if (state.loadingToken) {
      return new Promise(function (resolve, reject) {
        var started = Date.now();
        var timer = setInterval(function () {
          if (state.token) {
            clearInterval(timer);
            resolve(state.token);
            return;
          }
          if (!state.loadingToken && Date.now() - started > 15000) {
            clearInterval(timer);
            reject(new Error('Checkout token unavailable'));
          }
        }, 100);
      });
    }

    var api = getApi();
    var initData = getInitData();
    var businessId = getBusinessId();

    if (!api || !initData || !businessId) {
      return Promise.reject(new Error('Bookly billing context unavailable'));
    }

    state.loadingToken = true;
    return fetchJson(api + '/admin/subscription/checkout-token', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-Telegram-Init-Data': initData,
        'X-Bookly-Business-Id': businessId
      }
    }).then(function (data) {
      if (!data || !data.token) throw new Error('Checkout token unavailable');
      state.token = String(data.token);
      return state.token;
    }).finally(function () {
      state.loadingToken = false;
    });
  }

  function loadBasePrices() {
    return ensureToken().then(function (token) {
      var api = getApi();
      return Promise.all([
        fetchJson(api + '/payments/external/price?token=' + encodeURIComponent(token) + '&billing=month&limit=10'),
        fetchJson(api + '/payments/external/price?token=' + encodeURIComponent(token) + '&billing=year&limit=10')
      ]).then(function (rows) {
        if (rows[0] && Number.isFinite(Number(rows[0].amount))) {
          state.prices.month[10] = Number(rows[0].amount) / 100;
        }
        if (rows[1] && Number.isFinite(Number(rows[1].amount))) {
          state.prices.year[10] = Number(rows[1].amount) / 100;
        }
      });
    });
  }

  function loadPeriodPrices(period) {
    if (state.loading[period]) return state.loading[period];

    state.loading[period] = ensureToken().then(function (token) {
      var api = getApi();
      var all = [10].concat(LIMITS);
      var chain = Promise.resolve();

      all.forEach(function (limit) {
        if (Number.isFinite(state.prices[period][limit])) return;
        chain = chain.then(function () {
          return fetchJson(
            api + '/payments/external/price?token=' + encodeURIComponent(token) +
            '&billing=' + encodeURIComponent(period) + '&limit=' + limit
          ).then(function (data) {
            if (data && Number.isFinite(Number(data.amount))) {
              state.prices[period][limit] = Number(data.amount) / 100;
            }
          });
        });
      });

      return chain;
    }).finally(function () {
      state.loading[period] = false;
    });

    return state.loading[period];
  }

  function findCard() {
    var cards = Array.prototype.slice.call(
      document.querySelectorAll('.card.subscription')
    );

    return cards.find(function (card) {
      var pill = card.querySelector('.pill');
      return pill && !pill.classList.contains('ok');
    }) || null;
  }

  function findIncreaseButton(card) {
    var buttons = Array.prototype.slice.call(card.querySelectorAll('button'));
    return buttons.find(function (button) {
      var text = String(button.textContent || '').toLowerCase();
      return (
        text.indexOf('увеличить лимит') !== -1 ||
        text.indexOf('increase service') !== -1 ||
        text.indexOf('hizmet limit') !== -1 ||
        text.indexOf('xizmatlar limit') !== -1 ||
        text.indexOf('زيادة حد') !== -1
      );
    }) || null;
  }

  function styleButton(button, active) {
    button.style.border = '0';
    button.style.borderRadius = '10px';
    button.style.padding = '10px 8px';
    button.style.font = 'inherit';
    button.style.fontWeight = '700';
    button.style.cursor = 'pointer';
    button.style.background = active ? '#111' : 'transparent';
    button.style.color = active ? '#fff' : '#4b5563';
  }

  function updateHeader(card, period) {
    var value = state.prices[period][10];
    if (!Number.isFinite(value)) value = monthlyFallback[10];
    var unit = period === 'year' ? tr().unitYear : tr().unitMonth;
    var target = card.querySelector('.subscription-head p b');
    if (target) target.textContent = '$' + value.toFixed(2) + ' ' + unit;
  }

  function updatePackageRows(card, period) {
    var periodPrices = state.prices[period];
    var base = periodPrices[10];
    if (!Number.isFinite(base)) base = monthlyFallback[10];
    var unit = period === 'year' ? tr().unitYear : tr().unitMonth;

    var sectionButton = findIncreaseButton(card);
    if (!sectionButton || !sectionButton.parentElement) return;
    var section = sectionButton.parentElement;
    var buttons = Array.prototype.slice.call(section.querySelectorAll('button'));

    buttons.forEach(function (button) {
      var match = String(button.textContent || '').match(/(?:^|\D)(20|30|50|100)(?:\D|$)/);
      if (!match || button === sectionButton) return;

      var limit = Number(match[1]);
      var total = periodPrices[limit];
      if (!Number.isFinite(total)) total = monthlyFallback[limit];
      var addon = Math.max(0, total - base);

      var children = Array.prototype.slice.call(button.children).filter(function (node) {
        return node && node.nodeType === 1;
      });

      if (children.length >= 3) {
        children[1].textContent = '+$' + addon.toFixed(2) + ' ' + unit;
        children[2].textContent = 'Итого: $' + total.toFixed(2) + ' ' + unit;
      }
    });
  }

  function hideTrial(card, period) {
    var root = card.querySelector('.subscription') || card;
    var candidates = Array.prototype.slice.call(root.querySelectorAll('div'));
    candidates.forEach(function (el) {
      var text = String(el.textContent || '').toLowerCase();
      if (
        text.indexOf('7 дней бесплатно') !== -1 ||
        text.indexOf('7 days free') !== -1 ||
        text.indexOf('7 kun') !== -1 ||
        text.indexOf('7 gün ücretsiz') !== -1 ||
        text.indexOf('7 أيام') !== -1
      ) {
        el.style.display = period === 'year' ? 'none' : '';
      }
    });
  }

  function render(card) {
    var old = card.querySelector('[data-bookly-billing-toggle-v2]');
    if (old) {
      var oldBilling = old.getAttribute('data-billing-current') || getBilling();
      updateHeader(card, oldBilling);
      updatePackageRows(card, oldBilling);
      hideTrial(card, oldBilling);
      return;
    }

    var increase = findIncreaseButton(card);
    if (!increase || !increase.parentElement) return;

    var host = document.createElement('div');
    host.setAttribute('data-bookly-billing-toggle-v2', '1');
    host.setAttribute('data-billing-current', getBilling());
    host.style.margin = '18px 0 14px';
    host.style.padding = '4px';
    host.style.borderRadius = '14px';
    host.style.background = '#f1f3f5';
    host.style.display = 'grid';
    host.style.gridTemplateColumns = '1fr 1fr';
    host.style.gap = '4px';

    var monthButton = document.createElement('button');
    var yearButton = document.createElement('button');
    monthButton.type = 'button';
    yearButton.type = 'button';

    styleButton(monthButton, getBilling() === 'month');
    styleButton(yearButton, getBilling() === 'year');

    function apply(period) {
      setBilling(period);
      host.setAttribute('data-billing-current', period);
      var labels = tr();
      monthButton.textContent = labels.month;
      yearButton.textContent = labels.year;
      styleButton(monthButton, period === 'month');
      styleButton(yearButton, period === 'year');
      updateHeader(card, period);
      updatePackageRows(card, period);
      hideTrial(card, period);

      if (period === 'year') {
        loadPeriodPrices('year').then(function () {
          updateHeader(card, 'year');
          updatePackageRows(card, 'year');
          hideTrial(card, 'year');
        }).catch(function () {});
      }
    }

    monthButton.addEventListener('click', function () {
      apply('month');
    });

    yearButton.addEventListener('click', function () {
      apply('year');
    });

    host.appendChild(monthButton);
    host.appendChild(yearButton);
    increase.parentElement.insertBefore(host, increase);

    var current = getBilling();
    apply(current);
  }

  function decorate() {
    var card = findCard();
    if (!card) return;

    // Remove the legacy decorator if it managed to render before this script.
    var legacy = card.querySelector('[data-bookly-billing-toggle]');
    if (legacy && legacy.parentElement) {
      legacy.parentElement.removeChild(legacy);
    }

    render(card);
  }

  function boot() {
    try {
      ensureToken().then(function () {
        return loadBasePrices();
      }).then(function () {
        decorate();
      }).catch(function () {
        // Keep the UI usable even when the price lookup is temporarily unavailable.
        decorate();
      });
    } catch (_) {
      decorate();
    }

    decorate();
  }

  var observer = new MutationObserver(function () {
    decorate();
  });

  observer.observe(document.documentElement, {
    childList: true,
    subtree: true
  });

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', boot, { once: true });
  } else {
    boot();
  }

  setTimeout(decorate, 500);
  setTimeout(decorate, 1500);
  setTimeout(decorate, 3000);
})();
