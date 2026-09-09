/* Bookly Mini App policy layer.
   Telegram is the operating interface; account/business creation and
   Bookly billing remain on the standalone website. */
(function () {
  'use strict';

  var telegram = window.Telegram && window.Telegram.WebApp;
  if (!telegram || !telegram.initData) return;

  var WEBSITE_URL = 'https://boockly.vercel.app/landing.html';
  var CREATE_RE = /создать\s+бизнес|создание\s+бизнеса|добавить\s+бизнес|add\s+business|create\s+business|biznes\s+yaratish|işletme\s+oluştur|إنشاء\s+نشاط/i;
  var BILLING_RE = /подписк|subscription|тариф|tariff|trial|оплат|payment|billing|checkout|bookly\s*pro|telegram\s*stars|\bXTR\b|период\s+оплаты/i;
  var ADD_BUSINESS_RE = /^(добавить\s+бизнес|add\s+business|biznes\s+yaratish|işletme\s+oluştur)$/i;

  var LABELS = {
    ru: { title: 'Создать бизнес через Bookly', text: 'Создание бизнеса доступно на сайте Bookly. Там же проходит регистрация и подключение сервиса.', button: 'Открыть сайт Bookly' },
    en: { title: 'Create your business on Bookly', text: 'Business creation is available on the Bookly website. Registration and setup are completed there.', button: 'Open Bookly website' },
    uz: { title: 'Bookly orqali biznes yaratish', text: 'Biznes yaratish Bookly saytida mavjud. Ro‘yxatdan o‘tish va sozlash ham shu yerda bajariladi.', button: 'Bookly saytini ochish' },
    tr: { title: 'Bookly üzerinden işletme oluştur', text: 'İşletme oluşturma Bookly web sitesinde yapılır. Kayıt ve kurulum da orada tamamlanır.', button: 'Bookly sitesini aç' },
    ar: { title: 'إنشاء نشاط عبر Bookly', text: 'إنشاء النشاط متاح على موقع Bookly. يتم التسجيل والإعداد هناك أيضًا.', button: 'فتح موقع Bookly' }
  };

  function language() {
    try { return (localStorage.getItem('bookly_language') || 'en').slice(0, 2); } catch (_) { return 'en'; }
  }
  function labels() { return LABELS[language()] || LABELS.en; }

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

  function replaceLegacyActivationCopy() {
    var replacements = [
      [/Чтобы начать принимать записи от клиентов, активируйте подписку Bookly Pro\. После активации вы получите клиентскую ссылку и сможете начать принимать записи\./g, 'После настройки бизнеса клиенты смогут находить его по клиентской ссылке и самостоятельно записываться на услуги.'],
      [/Чтобы клиентов? могли найти ваш бизнес и самостоятельно записываться на услуги, активируйте Bookly Pro\./g, 'Клиенты смогут найти ваш бизнес по клиентской ссылке и самостоятельно записываться на услуги.'],
      [/Активируйте подписку, чтобы открыть доступ к функциям Bookly Pro/g, 'Управляйте функциями Bookly прямо здесь'],
      [/Активируйте подписку, чтобы получить клиентскую ссылку/g, 'Используйте клиентскую ссылку, чтобы делиться страницей бизнеса'],
      [/Активируйте подписку, чтобы получить QR-код/g, 'QR-код страницы бизнеса'],
      [/Активируйте Bookly Pro, чтобы получить QR-код/g, 'QR-код страницы бизнеса'],
      [/Активируйте подписку, чтобы получить полный доступ/g, 'Полный доступ к функциям Bookly'],
      [/Активировать Bookly Pro/g, 'Открыть Bookly'],
      [/Оплатите подписку, чтобы активировать Bookly\./g, 'Настройте бизнес, чтобы начать работу с Bookly.'],
      [/Функции Bookly Pro/g, 'Функции Bookly'],
      [/Bookly Pro открывает клиентскую часть Bookly:/g, 'Клиентская часть Bookly включает:'],
      [/Без подписки вы можете создать и настраивать бизнес, добавлять услуги, управлять графиком, блокировками и записями в админке\. Подписка нужна для подключения клиентов и начала приёма онлайн-записей\./g, 'В Bookly вы настраиваете бизнес, добавляете услуги, управляете графиком, блокировками и записями. Клиенты записываются через клиентскую страницу бизнеса.'],
      [/До 10 услуг в базовом тарифе/gi, 'Добавляйте услуги и устанавливайте цены'],
      [/Activate your subscription to get the client link/gi, 'Use the client link to share your business page'],
      [/Activate your subscription to get the QR code/gi, 'Business page QR code'],
      [/Activate your subscription to get full access/gi, 'Full access to Bookly features'],
      [/Activate Bookly Pro/gi, 'Open Bookly'],
      [/Activate your subscription/gi, 'Use Bookly'],
      [/Bookly Pro opens the client side of Bookly:/gi, 'The Bookly client side includes:'],
      [/activate your subscription/gi, 'use Bookly'],
      [/Bookly Pro/gi, 'Bookly']
    ];
    var walker = document.createTreeWalker(document.body, NodeFilter.SHOW_TEXT);
    var nodes = [], node;
    while ((node = walker.nextNode())) nodes.push(node);
    nodes.forEach(function (textNode) {
      var value = textNode.nodeValue || '', next = value;
      replacements.forEach(function (entry) { next = next.replace(entry[0], entry[1]); });
      if (next !== value) textNode.nodeValue = next;
    });
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
    var copy = labels();
    var card = document.createElement('div');
    card.className = 'bookly-web-create';
    card.innerHTML = '<strong>' + copy.title + '</strong><span>' + copy.text + '</span><button type="button">' + copy.button + '</button>';
    card.querySelector('button').addEventListener('click', openWebsite);
    if (anchor.parentNode) anchor.parentNode.insertBefore(card, anchor);
  }

  function hideSubscriptions() {
    document.querySelectorAll('.subscription, .subscription-head, .subscription-page, [data-tab="subscription"]').forEach(function (node) {
      if (!node.classList.contains('subscription-modal')) node.classList.add('bookly-policy-hidden');
    });
    document.querySelectorAll('button,a,[role="button"],[role="tab"]').forEach(function (node) {
      var text = normalized(node);
      if (text && BILLING_RE.test(text)) node.classList.add('bookly-policy-hidden');
    });
  }

  function restoreAdminLanding() {
    var bodyText = normalized(document.body);
    if (!/мои\s+бизнесы|my\s+businesses|bizneslarim|işletmelerim/i.test(bodyText)) return;
    try {
      if (sessionStorage.getItem('bookly_admin_landing_v2') === '1') return;
      var homeButton = document.querySelector('.admin-bottom-nav button:first-child');
      if (!homeButton) return;
      sessionStorage.setItem('bookly_admin_landing_v2', '1');
      window.setTimeout(function () {
        try { homeButton.click(); } catch (_) {}
      }, 80);
    } catch (_) {}
  }

  function protectCreation() {
    document.querySelectorAll('button,a,[role="button"]').forEach(function (node) {
      var text = normalized(node), cleanText = text.replace(/^\+\s*/, '').trim();
      if (ADD_BUSINESS_RE.test(cleanText)) {
        if (node.dataset.booklyAddBusinessBound !== '1') {
          node.dataset.booklyAddBusinessBound = '1';
          node.addEventListener('click', function (event) {
            event.preventDefault();
            event.stopImmediatePropagation();
            openWebsite();
          }, true);
        }
        return;
      }
      if (!CREATE_RE.test(text) || node.dataset.booklyPolicyBound === '1') return;
      node.dataset.booklyPolicyBound = '1';
      var personalBusinessCard = node.closest('.personal-business-card');
      if (personalBusinessCard && personalBusinessCard.querySelector('h2')) {
        node.textContent = labels().button;
        node.addEventListener('click', function (event) {
          event.preventDefault();
          event.stopImmediatePropagation();
          openWebsite();
        }, true);
        return;
      }
      var container = node.closest('form, .card, section, article, div');
      if (container) {
        container.classList.add('bookly-policy-hidden');
        addWebsiteCard(container.parentElement || container);
      }
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

  // Capture the action before React's onClick can change businessPanel to the
  // obsolete create state. This removes the race that exposed createBusiness.
  document.addEventListener('click', function (event) {
    var target = event.target;
    var node = target && target.closest ? target.closest('button,a,[role="button"]') : null;
    if (!node) return;
    var text = normalized(node).replace(/^\+\s*/, '').trim();
    if (!ADD_BUSINESS_RE.test(text)) return;
    event.preventDefault();
    event.stopImmediatePropagation();
    openWebsite();
  }, true);

  function scan() {
    addStyle();
    hideSubscriptions();
    restoreAdminLanding();
    protectCreation();
    replaceLegacyActivationCopy();
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