(function () {
  'use strict';

  var redirected = false;

  function getLimit(options) {
    try {
      var items = Array.isArray(options && options.items)
        ? options.items
        : [];
      var prices = window.__booklyPaddlePrices || {};
      var limits = [10, 20, 30, 50, 100];

      for (var i = 0; i < items.length; i += 1) {
        var priceId = String((items[i] || {}).priceId || '');
        for (var j = 0; j < limits.length; j += 1) {
          var limit = limits[j];
          if (String(prices[limit] || '') === priceId) {
            return limit;
          }
        }
      }
    } catch (_) {}

    return 10;
  }

  function getApiUrl() {
    try {
      var meta = document.querySelector('meta[name="bookly-api-url"]');
      return String((meta && meta.content) || '').replace(/\/$/, '');
    } catch (_) {
      return '';
    }
  }

  function redirectToExternalCheckout(options) {
    if (redirected) return;

    var customData = (options && options.customData) || {};
    var token = String(customData.checkout_token || '').trim();
    if (!token) return;

    redirected = true;

    var url = new URL('/pricing.html', window.location.origin);
    url.searchParams.set('token', token);
    url.searchParams.set('limit', String(getLimit(options)));

    var apiUrl = getApiUrl();
    if (apiUrl) {
      url.searchParams.set('api', apiUrl);
    }

    try {
      var webApp = window.Telegram && window.Telegram.WebApp;
      if (webApp && typeof webApp.openLink === 'function') {
        webApp.openLink(url.toString());
        return;
      }
    } catch (_) {}

    window.location.href = url.toString();
  }

  // The Mini App uses this compatibility stub instead of loading Paddle.js.
  // Checkout therefore always continues on the external Bookly pricing page.
  try {
    window.Paddle = {
      __booklyInitialized: true,
      Checkout: {
        open: redirectToExternalCheckout
      }
    };
    window.__booklyPaddleReady = Promise.resolve();
  } catch (_) {}
})();
