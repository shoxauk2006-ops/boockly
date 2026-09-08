/* Bookly Mini App policy layer.
   The Telegram Mini App is an operating interface only:
   business creation and Bookly billing stay on the standalone website. */
(function () {
  'use strict';

  var telegram = window.Telegram && window.Telegram.WebApp;
  if (!telegram || !telegram.initData) return;

  var WEBSITE_URL = 'https://boockly.vercel.app/landing.html';
  var CREATE_RE = /создать\s+бизнес|create\s+business|biznes\s+yaratish|işletme\s+oluştur|إنشاء\s+نشاط/i;
  var BILLING_RE = /подписк|subscription|тариф|tariff|plan|trial|оплат|payment|billing|checkout|bookly\s*pro|telegram\s*stars|\bXTR\b|период\s+оплаты/i;

  function openWebsite() {
    try {
      if (typeof telegram.openLink === 'function') {
        telegram.openLink(WEBSITE_URL);
        return;
      }
    } catch (_) {}

    window.open(WEBSITE_URL, '_blank', 'noopener,noreferrer');
  }

  function normalized(node) {
    return ((node && (node.innerText || node.textContent)) || '').replace(/\s+/g, ' ').trim();
  }

  function addStyle() {
    if (document.getElementById('bookly-miniapp-policy-style')) return;
    var style = document.createElement('style');
    style.id = 'bookly-miniapp-policy-style';
    style.textContent = [
      '.bookly-policy-hidden{display:none!important}',
      '.bookly-web-create{margin:0 0 12px!important;padding:14px 16px!important;border:1px solid #e4e7eb!important;border-radius:18px!important;background:#fff!important;color:#111!important;box-shadow:0 10px 28px rgba(15,23,42,.05)!important}',
      '.bookly-web-create strong{display:block!important;font-size:14px!important;letter-spacing:-.25px!important}',
      '.bookly-web-create span{display:block!important;margin-top:4px!important;color:#7b838d!important;font-size:12px!important;line-height:1.45!important}',
      '.bookly-web-create button{margin-top:11px!important;min-height:42px!important;width:100%!important;border:0!important;border-radius:13px!important;background:#111!important;color:#fff!important;font-weight:800!important;cursor:pointer!important}'
    ].join('');
    document.head.appendChild(style);
  }

  function addWebsiteCard(anchor) {
    if (!anchor || document.querySelector('.bookly-web-create')) return;
    var card = document.createElement('div');
    card.className = 'bookly-web-create';
    card.innerHTML = '<strong>Создать бизнес через Bookly</strong>' +
      '<span>Создание бизнеса доступно на сайте Bookly. Там же проходит регистрация и подключение сервиса.</span>' +
      '<button type="button">Открыть сайт Bookly</button>';
    card.querySelector('button').addEventListener('click', openWebsite);
    anchor.parentNode.insertBefore(card, anchor);
  }

  function hideSubscriptions() {
    var classTargets = document.querySelectorAll(
      '.subscription, .subscription-feature-list, .subscription-head, .subscription-page, [data-tab="subscription"]'
    );
    classTargets.forEach(function (node) {
      if (!node.classList.contains('subscription-modal')) {
        node.classList.add('bookly-policy-hidden');
      }
    });

    document.querySelectorAll('button,a,[role="button"],[role="tab"]').forEach(function (node) {
      var text = normalized(node);
      if (!text || !BILLING_RE.test(text)) return;

      node.classList.add('bookly-policy-hidden');
    });

    document.querySelectorAll('div,section,article').forEach(function (node) {
      if (node.classList.contains('subscription-modal') || node.closest('.subscription-modal')) return;
      var text = normalized(node);
      if (!text || text.length > 220) return;
      if (!BILLING_RE.test(text)) return;
      if (node.querySelector('input,textarea,select')) return;
      if (node.children.length > 8) return;
      if (/без\s+подписки|activate\s+subscription|активируйте\s+подписку|bookly\s+pro/i.test(text)) {
        node.classList.add('bookly-policy-hidden');
      }
    });
  }

  function protectCreation() {
    var createButtons = [];
    document.querySelectorAll('button,a,[role="button"]').forEach(function (node) {
      if (CREATE_RE.test(normalized(node))) createButtons.push(node);
    });

    createButtons.forEach(function (button) {
      if (button.dataset.booklyPolicyBound === '1') return;
      button.dataset.booklyPolicyBound = '1';

      var personalBusinessCard = button.closest('.personal-business-card');
      if (personalBusinessCard && personalBusinessCard.querySelector('h2')) {
        button.textContent = 'Открыть сайт Bookly';
        button.addEventListener('click', function (event) {
          event.preventDefault();
          event.stopImmediatePropagation();
          openWebsite();
        }, true);
        return;
      }

      var container = button.closest('form, .card, section, article, div');
      if (container) container.classList.add('bookly-policy-hidden');
      addWebsiteCard(container || button.parentElement);
    });

    document.querySelectorAll('input,textarea').forEach(function (field) {
      var placeholder = String(field.getAttribute('placeholder') || '');
      if (!CREATE_RE.test(placeholder)) return;
      var container = field.closest('form, .card, section, article, div');
      if (container) {
        container.classList.add('bookly-policy-hidden');
        addWebsiteCard(container.parentElement || container);
      }
    });
  }

  function scan() {
    addStyle();
    hideSubscriptions();
    protectCreation();
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', scan, { once: true });
  } else {
    scan();
  }

  var observer = new MutationObserver(function () {
    window.clearTimeout(observer._timer);
    observer._timer = window.setTimeout(scan, 80);
  });
  observer.observe(document.documentElement, { childList: true, subtree: true });
})();
