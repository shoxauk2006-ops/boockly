(function () {
  'use strict';

  function isV2Target(target) {
    return target instanceof Element && !!target.closest('#bookly-dashboard-v2 [data-v2-action]');
  }

  function findLegacyButton(needles) {
    const root = document.getElementById('bookly-dashboard-v2');
    const list = Array.isArray(needles) ? needles : [needles];
    return Array.from(document.querySelectorAll('button')).find((button) => {
      if (root && root.contains(button)) return false;
      const text = (button.innerText || '').trim().toLowerCase();
      return list.some((needle) => text.includes(String(needle).toLowerCase()));
    }) || null;
  }

  function clickLegacy(needles) {
    const button = findLegacyButton(needles);
    if (!button) {
      console.warn('Bookly V2: legacy action not found', needles);
      return false;
    }
    button.click();
    return true;
  }

  function getClientLink() {
    return document.querySelector('#bookly-dashboard-v2 .bookly-v2-share-link')?.textContent?.trim() || '';
  }

  function copyText(text) {
    if (navigator.clipboard?.writeText) return navigator.clipboard.writeText(text);
    return new Promise((resolve, reject) => {
      const area = document.createElement('textarea');
      area.value = text;
      area.style.position = 'fixed';
      area.style.opacity = '0';
      document.body.appendChild(area);
      area.select();
      try {
        document.execCommand('copy');
        area.remove();
        resolve();
      } catch (error) {
        area.remove();
        reject(error);
      }
    });
  }

  document.addEventListener('click', (event) => {
    const target = event.target;
    if (!isV2Target(target)) return;

    const button = target.closest('[data-v2-action]');
    const action = button?.getAttribute('data-v2-action');
    if (!action) return;

    event.preventDefault();
    event.stopPropagation();
    event.stopImmediatePropagation();

    if (action === 'bookings') {
      clickLegacy(['записи', 'bookings']);
    } else if (action === 'services') {
      clickLegacy(['услуги', 'services']);
    } else if (action === 'schedule') {
      clickLegacy(['график', 'schedule']);
    } else if (action === 'settings') {
      clickLegacy(['настройки', 'settings']);
    } else if (action === 'new-booking') {
      clickLegacy(['добавить запись', 'new booking', 'add booking']);
    } else if (action === 'subscription') {
      clickLegacy(['управление подпиской', 'оплатить подписку', 'активировать pro', 'subscription']);
    } else if (action === 'open-client') {
      const status = document.querySelector('#bookly-dashboard-v2 .bookly-v2-status');
      const link = getClientLink();
      if (!status || status.classList.contains('live')) {
        if (link) {
          const telegram = window.Telegram?.WebApp;
          telegram?.openTelegramLink ? telegram.openTelegramLink(link) : window.open(link, '_blank');
        }
      } else {
        clickLegacy(['оплатить подписку', 'активировать pro']);
      }
    } else if (action === 'copy-link') {
      const link = getClientLink();
      if (link) {
        copyText(link).then(() => {
          const strong = button.querySelector('strong');
          if (strong) {
            const previous = strong.textContent;
            strong.textContent = 'Скопировано';
            window.setTimeout(() => { strong.textContent = previous; }, 1400);
          }
        }).catch((error) => console.error('Bookly V2 copy failed:', error));
      }
    } else if (action === 'share-link') {
      const link = getClientLink();
      if (link) {
        const name = document.querySelector('#bookly-dashboard-v2 .bookly-v2-business-title')?.textContent?.trim() || 'Bookly';
        const shareUrl = `https://t.me/share/url?url=${encodeURIComponent(link)}&text=${encodeURIComponent(name)}`;
        const telegram = window.Telegram?.WebApp;
        telegram?.openTelegramLink ? telegram.openTelegramLink(shareUrl) : window.open(shareUrl, '_blank');
      }
    }
  }, true);
})();
