(function () {
  'use strict';

  // The Mini App must not open a digital-goods Paddle checkout inside
  // Telegram. The existing React checkout() function is intentionally kept
  // intact; this lightweight bridge redirects its final Checkout.open call
  // to the external Bookly pricing page.
  var redirected = false;

  function getLimit(options) {
    try {
      var items = Array.isArray(options && options.items)
        ? options.items
        : [];

      var prices = window.__booklyPaddlePrices || {};

      var matches = [10, 20, 30, 50, 100];

      for (var i = 0; i < items.length; i += 1) {
        var item = items[i] || {};
        var priceId = String(item.priceId || '');

        for (var j = 0; j < matches.length; j += 1) {
          var limit = matches[j];
          if (String(prices[limit] || '') === priceId) {
            return limit;
          }
        }
      }
    } catch (_) {}

    return 10;
  }

  function redirectToExternalCheckout(options) {
    if (redirected) {
      return;
    }

    var customData = (options && options.customData) || {};
    var token = String(customData.checkout_token || '').trim();

    if (!token) {
      return;
    }

    redirected = true;

    var limit = getLimit(options);
    var url = '/pricing.html?token=' + encodeURIComponent(token)
      + '&limit=' + encodeURIComponent(String(limit));

    try {
      var webApp = window.Telegram && window.Telegram.WebApp;
      if (webApp && typeof webApp.openLink === 'function') {
        webApp.openLink(new URL(url, window.location.origin).toString());
        return;
      }
    } catch (_) {}

    window.location.href = url;
  }

  // Make Paddle look initialized to the existing checkout() code while
  // replacing only the payment-opening method with our external redirect.
  // No Paddle client token is needed inside the Mini App after this bridge.
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
