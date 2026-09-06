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
        billing_period: getBillingPeriod()
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
