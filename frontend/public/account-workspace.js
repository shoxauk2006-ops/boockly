(function () {
  'use strict';

  function addLanguageSelector() {
    if (document.getElementById('bookly-account-language')) return;
    var nav = document.querySelector('.nav');
    if (!nav) return;

    var back = nav.querySelector('.nav-link');
    var wrapper = document.createElement('div');
    wrapper.id = 'bookly-account-language';
    wrapper.style.cssText = 'display:flex;align-items:center;margin-left:auto;margin-right:12px;position:relative;z-index:200';

    var select = document.createElement('select');
    select.setAttribute('aria-label', 'Language');
    select.style.cssText = 'height:40px;border:1px solid #e1e5ea;border-radius:11px;background:#fff;color:#202329;padding:0 28px 0 11px;font:inherit;font-size:12px;font-weight:750;cursor:pointer';

    [
      { code: 'en', label: 'English' },
      { code: 'ru', label: 'Русский' },
      { code: 'uz', label: 'O‘zbek' },
      { code: 'tr', label: 'Türkçe' },
      { code: 'ar', label: 'العربية' }
    ].forEach(function (language) {
      var option = document.createElement('option');
      option.value = language.code;
      option.textContent = language.label;
      select.appendChild(option);
    });

    try { select.value = localStorage.getItem('bookly_language') || 'en'; } catch (_) {}

    select.addEventListener('change', function () {
      try { localStorage.setItem('bookly_language', this.value); } catch (_) {}
      window.location.reload();
    });

    wrapper.appendChild(select);
    if (back) nav.insertBefore(wrapper, back);
    else nav.appendChild(wrapper);
  }

  function wireCheckout() {
    var session = window.booklySession;
    var call = window.booklyCall;
    if (!session || typeof call !== 'function') return;

    var button = document.getElementById('billingCheckout');
    if (!button) return;

    button.onclick = function () {
      button.disabled = true;
      call('/account/paddle/checkout-token', {
        headers: { Authorization: 'Bearer ' + session }
      })
        .then(function (data) {
          if (!data || !data.checkout_token) throw new Error('Missing checkout token');
          var api = new URLSearchParams(window.location.search).get('api') || 'https://boockly-3.onrender.com';
          window.location.href = 'pricing-v2.html?token=' + encodeURIComponent(data.checkout_token) + '&api=' + encodeURIComponent(api);
        })
        .catch(function () { button.disabled = false; });
    };
  }

  function start() {
    addLanguageSelector();
    window.setTimeout(addLanguageSelector, 300);
    window.setTimeout(wireCheckout, 300);
    window.setTimeout(wireCheckout, 1000);
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', start);
  else start();
})();
