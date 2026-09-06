(function () {
  'use strict';

  var labels = {
    ru: 'Открыть доступ',
    en: 'Continue to payment',
    uz: 'To‘lovga o‘tish',
    tr: 'Ödemeye devam et',
    ar: 'المتابعة إلى الدفع'
  };

  var loadingLabels = {
    ru: 'Загрузка...',
    en: 'Loading...',
    uz: 'Yuklanmoqda...',
    tr: 'Yükleniyor...',
    ar: 'جارٍ التحميل...'
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

  function isCheckoutButton(button) {
    return button && button.classList.contains('primary') && button.classList.contains('full');
  }

  function restoreInitialCheckoutButton() {
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
        if (!isCheckoutButton(button)) return;
        if (button.dataset.booklyClickLoading === '1') return;

        var text = String(button.textContent || '').trim().toLowerCase();
        if (text === 'загрузка...' || text === 'loading...' || text === 'yuklanmoqda...' || text === 'yükleniyor...' || text === 'جارٍ التحميل...') {
          button.disabled = false;
          button.textContent = labels[getLanguage()];
          button.dataset.booklyCheckoutFallback = '1';
        }
      });
    });
  }

  document.addEventListener('click', function (event) {
    var target = event.target;
    if (!(target instanceof Element)) return;

    var button = target.closest('.card.subscription button.primary.full');
    if (!button || !isCheckoutButton(button)) return;

    button.dataset.booklyClickLoading = '1';
    button.disabled = true;
    button.textContent = loadingLabels[getLanguage()];

    window.setTimeout(function () {
      button.dataset.booklyClickLoading = '0';
    }, 8000);
  }, true);

  function boot() {
    restoreInitialCheckoutButton();

    var attempts = 0;
    var timer = window.setInterval(function () {
      restoreInitialCheckoutButton();
      attempts += 1;
      if (attempts >= 12) window.clearInterval(timer);
    }, 500);
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', boot, { once: true });
  } else {
    boot();
  }

  try {
    window.addEventListener('pageshow', function () {
      var buttons = document.querySelectorAll('.card.subscription button.primary.full');
      buttons.forEach(function (button) {
        button.dataset.booklyClickLoading = '0';
      });
      restoreInitialCheckoutButton();
    });
  } catch (_) {}
})();
