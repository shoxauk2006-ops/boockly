(function () {
  'use strict';

  var API = 'https://boockly-3.onrender.com';
  var PREFIX = 'bookly_';
  var started = false;
  var clicked = false;

  function telegram() {
    return window.Telegram && window.Telegram.WebApp;
  }

  function getStartParam() {
    try {
      var webApp = telegram();
      return String(
        (webApp && webApp.initDataUnsafe && webApp.initDataUnsafe.start_param) ||
        new URLSearchParams(window.location.search).get('startapp') ||
        ''
      ).trim();
    } catch (_) {
      return '';
    }
  }

  function connect() {
    if (started) return;
    var startParam = getStartParam();
    if (!startParam || startParam.indexOf(PREFIX) !== 0) return;

    var token = startParam.slice(PREFIX.length);
    if (!token) return;
    started = true;

    var webApp = telegram();
    try { webApp && webApp.ready(); } catch (_) {}

    var initData = String((webApp && webApp.initData) || '');
    if (!initData) return;

    fetch(API + '/account/connect-telegram-link?token=' + encodeURIComponent(token), {
      method: 'POST',
      headers: { 'X-Telegram-Init-Data': initData }
    })
      .then(function (response) {
        return response.json().catch(function () { return {}; }).then(function (data) {
          if (!response.ok) throw new Error(data.detail || 'Telegram connection failed');
          return data;
        });
      })
      .then(function (data) {
        try {
          localStorage.setItem('bookly_active_business_id', String(data.business_id));
          sessionStorage.setItem('bookly_telegram_connected', '1');
        } catch (_) {}

        // The current React workspace already has an Admin action in the
        // personal business card. Click that action once the card is mounted.
        var timer = setInterval(function () {
          if (clicked) {
            clearInterval(timer);
            return;
          }
          var button = document.querySelector('.personal-business-card .personal-primary-button');
          if (button) {
            clicked = true;
            clearInterval(timer);
            try { button.click(); } catch (_) {}
          }
        }, 100);

        setTimeout(function () { clearInterval(timer); }, 15000);
      })
      .catch(function (error) {
        console.error('Bookly Telegram connection:', error);
        started = false;
      });
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', connect, { once: true });
  } else {
    connect();
  }
})();
