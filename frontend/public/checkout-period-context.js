(function () {
  'use strict';

  var installed = false;

  function getBillingPeriod() {
    try {
      var runtime = String(window.__booklyBillingPeriod || '').toLowerCase();
      if (runtime === 'year' || runtime === 'month') return runtime;
    } catch (_) {}

    try {
      return localStorage.getItem('bookly_billing_period') === 'year'
        ? 'year'
        : 'month';
    } catch (_) {
      return 'month';
    }
  }

  function getSelectedServicesLimit() {
    try {
      var card = document.querySelector('.card.subscription');
      if (!card) return 10;

      var buttons = Array.prototype.slice.call(card.querySelectorAll('button'));
      for (var i = 0; i < buttons.length; i += 1) {
        var button = buttons[i];
        var text = String(button.textContent || '');
        var match = text.match(/(?:^|\D)(20|30|50|100)(?:\D|$)/);
        if (!match) continue;

        var style = window.getComputedStyle(button);
        var borderWidth = String(style.borderTopWidth || '').trim();
        var borderStyle = String(style.borderTopStyle || '').trim();
        if (borderStyle === 'solid' && borderWidth === '2px') {
          return Number(match[1]);
        }

        var inlineBorder = String(button.style.border || '');
        if (inlineBorder.indexOf('2px solid') !== -1) {
          return Number(match[1]);
        }
      }
    } catch (_) {}

    return 10;
  }

  function install() {
    if (installed) return true;
    if (!window.Paddle || !window.Paddle.Checkout || typeof window.Paddle.Checkout.open !== 'function') {
      return false;
    }

    var originalOpen = window.Paddle.Checkout.open;
    if (originalOpen.__booklyBillingContext) {
      installed = true;
      return true;
    }

    function wrappedOpen(options) {
      var input = options || {};
      var customData = Object.assign({}, input.customData || {}, {
        billing_period: getBillingPeriod(),
        services_limit: getSelectedServicesLimit()
      });

      return originalOpen.call(window.Paddle.Checkout, Object.assign({}, input, {
        customData: customData
      }));
    }

    wrappedOpen.__booklyBillingContext = true;
    window.Paddle.Checkout.open = wrappedOpen;
    installed = true;
    return true;
  }

  if (!install()) {
    var tries = 0;
    var timer = window.setInterval(function () {
      if (install() || ++tries >= 40) {
        window.clearInterval(timer);
      }
    }, 100);
  }
})();
