(function () {
  'use strict';

  var labels = {
    ru: 'Открыть доступ',
    en: 'Continue to payment',
    uz: 'To‘lovga o‘tish',
    tr: 'Ödemeye devam et',
    ar: 'المتابعة إلى الدفع'
  };

  function getLanguage() {
    try {
      var selector = document.querySelector('.language-select');
      var value = selector && selector.value;
      if (labels[value]) return value;
    } catch (_) {}

    var browser = String(navigator.language || 'en')
      .slice(0, 2)
      .toLowerCase();

    return labels[browser] ? browser : 'en';
  }

  function restoreCheckoutButton() {
    var cards = Array.prototype.slice.call(
      document.querySelectorAll('.card.subscription')
    );

    cards.forEach(function (card) {
      var pill = card.querySelector('.pill');
      if (!pill || pill.classList.contains('ok')) return;

      var buttons = Array.prototype.slice.call(
        card.querySelectorAll('button.primary.full')
      );

      buttons.forEach(function (button) {
        var text = String(button.textContent || '').trim().toLowerCase();
        if (text !== 'загрузка...' && text !== 'loading...') return;

        button.disabled = false;
        button.textContent = labels[getLanguage()];
        button.dataset.booklyCheckoutFallback = '1';
      });
    });
  }

  function boot() {
    restoreCheckoutButton();

    var attempts = 0;
    var timer = window.setInterval(function () {
      restoreCheckoutButton();
      attempts += 1;
      if (attempts >= 30) {
        window.clearInterval(timer);
      }
    }, 500);

    var observer = new MutationObserver(function () {
      restoreCheckoutButton();
    });

    observer.observe(document.documentElement, {
      childList: true,
      subtree: true
    });
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', boot, { once: true });
  } else {
    boot();
  }
})();
