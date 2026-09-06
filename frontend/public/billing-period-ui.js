(function () {
  'use strict';

  // Disable the older DOM decorator from paddle-env-bridge.ts.
  try { window.__booklyBillingPeriodUiInstalled = true; } catch (_) {}

  var STORAGE_KEY = 'bookly_billing_period';
  var LIMITS = [20, 30, 50, 100];
  var monthlyFallback = {10: 7.99, 20: 12.98, 30: 15.98, 50: 19.98, 100: 27.98};
  var state = { prices: {month: {}, year: {}}, token: '', loadingToken: false, loading: {month: null, year: null} };

  function getLanguage() {
    try {
      var selector = document.querySelector('.language-select');
      var value = selector && selector.value;
      if (value && ['ru','en','uz','tr','ar'].indexOf(value) !== -1) return value;
    } catch (_) {}
    var browser = String(navigator.language || 'en').slice(0, 2).toLowerCase();
    return ['ru','en','uz','tr','ar'].indexOf(browser) !== -1 ? browser : 'en';
  }
  function labels() {
    var map = {
      ru:{month:'Месяц',year:'Год',unitMonth:'/ месяц',unitYear:'/ год',total:'Итого:'},
      en:{month:'Monthly',year:'Yearly',unitMonth:'/ month',unitYear:'/ year',total:'Total:'},
      uz:{month:'Oylik',year:'Yillik',unitMonth:'/ oy',unitYear:'/ yil',total:'Jami:'},
      tr:{month:'Aylık',year:'Yıllık',unitMonth:'/ ay',unitYear:'/ yıl',total:'Toplam:'},
      ar:{month:'شهري',year:'سنوي',unitMonth:'/ شهر',unitYear:'/ سنة',total:'الإجمالي:'}
    };
    return map[getLanguage()] || map.en;
  }
  function getBilling() {
    try { return localStorage.getItem(STORAGE_KEY) === 'year' ? 'year' : 'month'; } catch (_) { return 'month'; }
  }
  function setBilling(value) {
    try { localStorage.setItem(STORAGE_KEY, value); } catch (_) {}
    try { window.__booklyBillingPeriod = value; } catch (_) {}
  }
  function getApi() {
    try {
      var meta = document.querySelector('meta[name="bookly-api-url"]');
      return String((meta && meta.content) || '').replace(/\/$/, '');
    } catch (_) { return ''; }
  }
  function getInitData() {
    try { return String((window.Telegram && window.Telegram.WebApp && window.Telegram.WebApp.initData) || ''); }
    catch (_) { return ''; }
  }
  function getBusinessId() {
    try { return String(localStorage.getItem('bookly_active_business_id') || ''); } catch (_) { return ''; }
  }
  function fetchJson(url, options) {
    return fetch(url, options).then(function (response) {
      return response.json().catch(function(){ return null; }).then(function (data) {
        if (!response.ok) throw new Error((data && data.detail) || 'Request failed');
        return data;
      });
    });
  }
  function ensureToken() {
    if (state.token) return Promise.resolve(state.token);
    if (state.loadingToken) {
      return new Promise(function(resolve, reject){
        var started = Date.now();
        var timer = setInterval(function(){
          if (state.token) { clearInterval(timer); resolve(state.token); return; }
          if (!state.loadingToken && Date.now() - started > 15000) { clearInterval(timer); reject(new Error('Checkout token unavailable')); }
        }, 100);
      });
    }
    var api = getApi();
    var initData = getInitData();
    var businessId = getBusinessId();
    if (!api || !initData || !businessId) return Promise.reject(new Error('Bookly billing context unavailable'));
    state.loadingToken = true;
    return fetchJson(api + '/admin/subscription/checkout-token', {
      method:'POST',
      headers:{'Content-Type':'application/json','X-Telegram-Init-Data':initData,'X-Bookly-Business-Id':businessId}
    }).then(function(data){
      if (!data || !data.token) throw new Error('Checkout token unavailable');
      state.token = String(data.token);
      return state.token;
    }).finally(function(){ state.loadingToken = false; });
  }
  function loadBase(period) {
    if (Number.isFinite(state.prices[period][10])) return Promise.resolve();
    return ensureToken().then(function(token){
      return fetchJson(getApi() + '/payments/external/price?token=' + encodeURIComponent(token) + '&billing=' + period + '&limit=10')
        .then(function(data){
          if (!data || !Number.isFinite(Number(data.amount))) throw new Error('Price unavailable');
          state.prices[period][10] = Number(data.amount) / 100;
        });
    });
  }
  function loadPackages(period) {
    if (state.loading[period]) return state.loading[period];
    state.loading[period] = loadBase(period).then(function(){
      var token = state.token;
      var api = getApi();
      var chain = Promise.resolve();
      LIMITS.forEach(function(limit){
        if (Number.isFinite(state.prices[period][limit])) return;
        chain = chain.then(function(){
          return fetchJson(api + '/payments/external/price?token=' + encodeURIComponent(token) + '&billing=' + period + '&limit=' + limit)
            .then(function(data){
              if (data && Number.isFinite(Number(data.amount))) state.prices[period][limit] = Number(data.amount) / 100;
            });
        });
      });
      return chain;
    }).finally(function(){ state.loading[period] = null; });
    return state.loading[period];
  }
  function findCard() {
    var cards = Array.prototype.slice.call(document.querySelectorAll('.card.subscription'));
    return cards.find(function(card){
      var pill = card.querySelector('.pill');
      return pill && !pill.classList.contains('ok');
    }) || null;
  }
  function findIncrease(card) {
    var buttons = Array.prototype.slice.call(card.querySelectorAll('button'));
    return buttons.find(function(button){
      var text = String(button.textContent || '').toLowerCase();
      return text.indexOf('увеличить лимит') !== -1 || text.indexOf('increase service') !== -1 || text.indexOf('hizmet limit') !== -1 || text.indexOf('xizmatlar limit') !== -1 || text.indexOf('زيادة حد') !== -1;
    }) || null;
  }
  function styleToggleButton(button, active) {
    button.style.border='0';
    button.style.borderRadius='10px';
    button.style.padding='10px 8px';
    button.style.font='inherit';
    button.style.fontWeight='700';
    button.style.cursor='pointer';
    button.style.background=active ? '#111' : 'transparent';
    button.style.color=active ? '#fff' : '#4b5563';
  }
  function updateHeader(card, period) {
    var value = state.prices[period][10];
    if (!Number.isFinite(value) && period === 'month') value = monthlyFallback[10];
    if (!Number.isFinite(value)) return;
    var unit = period === 'year' ? labels().unitYear : labels().unitMonth;
    var target = card.querySelector('.subscription-head p b');
    if (target) target.textContent = '$' + value.toFixed(2) + ' ' + unit;
  }
  function updatePackages(card, period) {
    var base = state.prices[period][10];
    if (!Number.isFinite(base) && period === 'month') base = monthlyFallback[10];
    if (!Number.isFinite(base)) return;
    var tr = labels();
    var unit = period === 'year' ? tr.unitYear : tr.unitMonth;
    var increase = findIncrease(card);
    if (!increase || !increase.parentElement) return;
    var buttons = Array.prototype.slice.call(increase.parentElement.querySelectorAll('button'));
    buttons.forEach(function(button){
      var match = String(button.textContent || '').match(/(?:^|\D)(20|30|50|100)(?:\D|$)/);
      if (!match || button === increase) return;
      var limit = Number(match[1]);
      var total = state.prices[period][limit];
      if (!Number.isFinite(total) && period === 'month') total = monthlyFallback[limit];
      if (!Number.isFinite(total)) return;
      var addon = Math.max(0, total - base);
      var children = Array.prototype.slice.call(button.children).filter(function(node){ return node && node.nodeType === 1; });
      if (children.length >= 3) {
        children[1].textContent = '+$' + addon.toFixed(2) + ' ' + unit;
        children[2].textContent = tr.total + ' $' + total.toFixed(2) + ' ' + unit;
      }
    });
  }
  function hideTrial(card, period) {
    var elements = Array.prototype.slice.call(card.querySelectorAll('div'));
    elements.forEach(function(el){
      var text = String(el.textContent || '').toLowerCase();
      var isTrial = text.indexOf('7 дней бесплатно') !== -1 || text.indexOf('7 days free') !== -1 || text.indexOf('7 kun') !== -1 || text.indexOf('7 gün ücretsiz') !== -1 || text.indexOf('7 أيام') !== -1;
      if (isTrial) el.style.display = period === 'year' ? 'none' : '';
    });
  }
  function render(card) {
    var host = card.querySelector('[data-bookly-billing-toggle-v2]');
    var increase = findIncrease(card);
    if (!increase || !increase.parentElement) return;

    if (!host) {
      var legacy = card.querySelector('[data-bookly-billing-toggle]');
      if (legacy && legacy.parentElement) legacy.parentElement.removeChild(legacy);

      host = document.createElement('div');
      host.setAttribute('data-bookly-billing-toggle-v2','1');
      host.style.margin='18px 0 14px';
      host.style.padding='4px';
      host.style.borderRadius='14px';
      host.style.background='#f1f3f5';
      host.style.display='grid';
      host.style.gridTemplateColumns='1fr 1fr';
      host.style.gap='4px';

      var monthButton = document.createElement('button');
      var yearButton = document.createElement('button');
      monthButton.type='button';
      yearButton.type='button';
      monthButton.setAttribute('data-billing','month');
      yearButton.setAttribute('data-billing','year');

      monthButton.addEventListener('click', function(){
        setBilling('month');
        host.setAttribute('data-billing-current','month');
        styleToggleButton(monthButton,true);
        styleToggleButton(yearButton,false);
        updateHeader(card,'month');
        updatePackages(card,'month');
        hideTrial(card,'month');
      });

      yearButton.addEventListener('click', function(){
        if (yearButton.disabled) return;
        yearButton.disabled = true;
        loadPackages('year').then(function(){
          setBilling('year');
          host.setAttribute('data-billing-current','year');
          styleToggleButton(monthButton,false);
          styleToggleButton(yearButton,true);
          yearButton.disabled = false;
          updateHeader(card,'year');
          updatePackages(card,'year');
          hideTrial(card,'year');
        }).catch(function(){
          yearButton.disabled = false;
          setBilling('month');
          host.setAttribute('data-billing-current','month');
          styleToggleButton(monthButton,true);
          styleToggleButton(yearButton,false);
        });
      });

      host.appendChild(monthButton);
      host.appendChild(yearButton);
      increase.parentElement.insertBefore(host,increase);
    }

    var current = host.getAttribute('data-billing-current') || getBilling();
    var mb = host.querySelector('[data-billing="month"]');
    var yb = host.querySelector('[data-billing="year"]');
    if (mb) { mb.textContent = labels().month; styleToggleButton(mb,current === 'month'); }
    if (yb) { yb.textContent = labels().year; styleToggleButton(yb,current === 'year'); yb.disabled = !Number.isFinite(state.prices.year[10]); }
    if (current === 'year' && Number.isFinite(state.prices.year[10])) setBilling('year');
    else if (current === 'year' && !Number.isFinite(state.prices.year[10])) current = 'month';
    host.setAttribute('data-billing-current',current);
    updateHeader(card,current);
    updatePackages(card,current);
    hideTrial(card,current);
  }
  function decorate(){
    var card = findCard();
    if (!card) return;

    var existing = card.querySelector('[data-bookly-billing-toggle-v2]');
    if (existing) {
      var yearButton = existing.querySelector('[data-billing="year"]');
      if (yearButton) yearButton.disabled = !Number.isFinite(state.prices.year[10]);
      return;
    }

    render(card);
  }
  function boot(){
    loadBase('month').catch(function(){});
    loadBase('year').then(function(){ decorate(); }).catch(function(){ decorate(); });
    decorate();
  }
  var observer = new MutationObserver(function(){ decorate(); });
  observer.observe(document.documentElement,{childList:true,subtree:true});
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded',boot,{once:true});
  else boot();
  setTimeout(decorate,500);
  setTimeout(decorate,1500);
  setTimeout(decorate,3000);
})();
