(function () {
  'use strict';

  const API = (document.querySelector('meta[name="bookly-api-url"]')?.content || 'https://boockly-3.onrender.com').replace(/\/$/, '');
  const BOT_USERNAME = 'BooklyBot';
  const navSelector = '.admin-bottom-nav';
  let observer = null;
  let refreshTimer = null;
  let v2Root = null;
  let lastActive = '';

  const tg = () => window.Telegram?.WebApp;
  const initData = () => tg()?.initData || '';

  function headers() {
    const out = {
      'Content-Type': 'application/json',
      'X-Telegram-Init-Data': initData()
    };
    try {
      const id = localStorage.getItem('bookly_active_business_id');
      if (id) out['X-Bookly-Business-Id'] = id;
    } catch (_) {}
    return out;
  }

  function api(path) {
    return fetch(API + path, { headers: headers() }).then(async (r) => {
      const data = await r.json().catch(() => null);
      if (!r.ok) throw new Error(data?.detail || 'Request failed');
      return data;
    });
  }

  function esc(value) {
    return String(value ?? '')
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#039;');
  }

  function dateKey(timeZone) {
    try {
      const parts = new Intl.DateTimeFormat('en-CA', { timeZone, year: 'numeric', month: '2-digit', day: '2-digit' }).formatToParts(new Date());
      const get = (type) => parts.find((p) => p.type === type)?.value || '';
      return `${get('year')}-${get('month')}-${get('day')}`;
    } catch (_) {
      const d = new Date();
      return [d.getFullYear(), String(d.getMonth() + 1).padStart(2, '0'), String(d.getDate()).padStart(2, '0')].join('-');
    }
  }

  function formatMoneyByCurrency(revenue) {
    if (!revenue || !Object.keys(revenue).length) return '0';
    return Object.entries(revenue).map(([currency, amount]) => {
      try {
        return `${new Intl.NumberFormat(undefined).format(Number(amount || 0))} ${currency}`;
      } catch (_) {
        return `${amount} ${currency}`;
      }
    }).join(' · ');
  }

  function clientLink(business) {
    return `https://t.me/${BOT_USERNAME}?startapp=${encodeURIComponent(business.slug || '')}`;
  }

  function setStyles() {
    if (document.getElementById('bookly-dashboard-v2-style')) return;
    const style = document.createElement('style');
    style.id = 'bookly-dashboard-v2-style';
    style.textContent = `
      .bookly-v2-wrap{max-width:680px;margin:0 auto;padding:10px 2px 118px;color:#101318;font-family:Inter,-apple-system,BlinkMacSystemFont,"Segoe UI",sans-serif}
      .bookly-v2-top{display:flex;justify-content:space-between;align-items:flex-start;gap:14px;padding:8px 4px 20px}
      .bookly-v2-brand{font-size:12px;font-weight:900;letter-spacing:.16em;color:#777f8b;text-transform:uppercase}
      .bookly-v2-greeting{margin:7px 0 0;font-size:34px;line-height:1.02;letter-spacing:-1.5px;font-weight:850}
      .bookly-v2-status{padding:8px 11px;border:1px solid #e2e6eb;border-radius:999px;background:#fff;font-size:11px;font-weight:800;white-space:nowrap}
      .bookly-v2-status.live{background:#ecfbf2;border-color:#cdeedb;color:#197142}
      .bookly-v2-business{position:relative;overflow:hidden;border-radius:26px;padding:22px;background:linear-gradient(135deg,#111318 0%,#242933 55%,#3b4350 100%);color:#fff;box-shadow:0 24px 60px rgba(13,18,27,.18)}
      .bookly-v2-business:after{content:"";position:absolute;width:220px;height:220px;border-radius:50%;right:-80px;top:-100px;background:rgba(255,255,255,.08);filter:blur(2px)}
      .bookly-v2-business-kicker{position:relative;z-index:1;font-size:10px;letter-spacing:.14em;text-transform:uppercase;color:#aeb5bf;font-weight:850}
      .bookly-v2-business-title{position:relative;z-index:1;margin-top:8px;font-size:25px;font-weight:850;letter-spacing:-.7px}
      .bookly-v2-business-meta{position:relative;z-index:1;margin-top:6px;color:#c7ccd3;font-size:13px;line-height:1.45;min-height:18px}
      .bookly-v2-business-actions{position:relative;z-index:1;display:flex;flex-wrap:wrap;gap:8px;margin-top:16px}
      .bookly-v2-action{border:1px solid rgba(255,255,255,.16);background:rgba(255,255,255,.1);color:#fff;border-radius:13px;padding:10px 13px;font-size:12px;font-weight:800;cursor:pointer;backdrop-filter:blur(8px)}
      .bookly-v2-action.primary{background:#fff;color:#111;border-color:#fff}
      .bookly-v2-stats{display:grid;grid-template-columns:repeat(3,1fr);gap:10px;margin-top:12px}
      .bookly-v2-stat{background:#fff;border:1px solid #e8ebef;border-radius:19px;padding:16px;box-shadow:0 8px 24px rgba(15,23,42,.045)}
      .bookly-v2-stat-label{display:block;color:#818994;font-size:11px;font-weight:750}
      .bookly-v2-stat-value{display:block;margin-top:6px;font-size:27px;line-height:1;font-weight:850;letter-spacing:-.8px}
      .bookly-v2-section{margin-top:15px;background:#fff;border:1px solid #e8ebef;border-radius:23px;padding:18px;box-shadow:0 8px 24px rgba(15,23,42,.045)}
      .bookly-v2-section-head{display:flex;align-items:flex-end;justify-content:space-between;gap:12px;margin-bottom:10px}
      .bookly-v2-section-title{margin:0;font-size:17px;font-weight:850;letter-spacing:-.35px}
      .bookly-v2-section-link{border:0;background:transparent;color:#757d88;font-size:11px;font-weight:800;padding:0;cursor:pointer}
      .bookly-v2-row{display:flex;align-items:center;gap:12px;padding:12px 0;border-top:1px solid #f0f2f4}
      .bookly-v2-row:first-child{border-top:0}
      .bookly-v2-time{width:52px;font-size:12px;font-weight:850;color:#515965}
      .bookly-v2-client{min-width:0;flex:1}
      .bookly-v2-client strong{display:block;font-size:13px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
      .bookly-v2-client span{display:block;margin-top:3px;color:#8a919b;font-size:11px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
      .bookly-v2-badge{padding:6px 8px;border-radius:9px;background:#f2f4f6;color:#68707a;font-size:10px;font-weight:800;white-space:nowrap}
      .bookly-v2-empty{padding:24px 6px;text-align:center;color:#9198a1;font-size:12px}
      .bookly-v2-actions{display:grid;grid-template-columns:1fr 1fr;gap:10px}
      .bookly-v2-quick{display:flex;align-items:center;justify-content:space-between;gap:10px;border:1px solid #e7eaee;background:#fafbfc;color:#111;border-radius:16px;padding:15px;text-align:left;cursor:pointer}
      .bookly-v2-quick strong{display:block;font-size:13px}.bookly-v2-quick span{display:block;margin-top:3px;color:#878e97;font-size:10px;line-height:1.35}.bookly-v2-quick b{font-size:18px;color:#8b929c}
      .bookly-v2-share{margin-top:10px;border:1px dashed #dce0e5;border-radius:16px;padding:14px;background:#fbfcfd}
      .bookly-v2-share-label{display:block;font-size:10px;text-transform:uppercase;letter-spacing:.12em;color:#8a919a;font-weight:850}
      .bookly-v2-share-link{margin-top:6px;font-size:11px;color:#4f5661;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
      .bookly-v2-share-actions{display:flex;gap:8px;margin-top:10px}.bookly-v2-share-actions button{flex:1}
      .bookly-v2-loading{padding:34px 10px;text-align:center;color:#8d949d;font-size:12px}
      @media(max-width:460px){.bookly-v2-greeting{font-size:29px}.bookly-v2-stats{gap:7px}.bookly-v2-stat{padding:13px 11px}.bookly-v2-stat-value{font-size:23px}.bookly-v2-actions{grid-template-columns:1fr}.bookly-v2-time{width:46px}}
    `;
    document.head.appendChild(style);
  }

  function findAdminSection() {
    const nav = document.querySelector(navSelector);
    return nav?.closest('section') || nav?.parentElement || null;
  }

  function isHome(nav) {
    const active = nav?.querySelector('button.active');
    return (active?.innerText || '').toLowerCase().includes('глав') || (active?.innerText || '').toLowerCase().includes('home');
  }

  function hideLegacy(section, root) {
    Array.from(section.children).forEach((child) => {
      if (child !== root && !child.matches(navSelector)) child.dataset.booklyV2Hidden = '1';
    });
    section.querySelectorAll('[data-booklyV2Hidden="1"]').forEach((el) => { el.style.display = 'none'; });
  }

  function showLegacy(section) {
    section.querySelectorAll('[data-booklyV2Hidden="1"]').forEach((el) => {
      el.style.display = '';
      delete el.dataset.booklyV2Hidden;
    });
  }

  function triggerExistingAction(textIncludes) {
    const buttons = Array.from(document.querySelectorAll('button'));
    const btn = buttons.find((b) => (b.innerText || '').toLowerCase().includes(textIncludes.toLowerCase()));
    if (btn) btn.click();
  }

  async function loadData() {
    const [business, bookings, statistics, services] = await Promise.all([
      api('/admin/business'),
      api('/admin/bookings'),
      api('/admin/statistics').catch(() => null),
      api('/admin/services')
    ]);
    return {
      business: business || {},
      bookings: Array.isArray(bookings) ? bookings : [],
      statistics: statistics || {},
      services: Array.isArray(services) ? services : []
    };
  }

  function renderLoading(root) {
    root.innerHTML = `<div class="bookly-v2-wrap"><div class="bookly-v2-loading">Загрузка Bookly…</div></div>`;
  }

  function render(root, data) {
    const business = data.business;
    const bookings = data.bookings;
    const statistics = data.statistics || {};
    const services = data.services;
    const tz = business.timezone || 'Asia/Tashkent';
    const today = dateKey(tz);
    const todayBookings = bookings.filter((x) => x.day === today && x.status !== 'cancelled').sort((a,b) => String(a.start).localeCompare(String(b.start)));
    const upcoming = bookings.filter((x) => x.day > today || (x.day === today && String(x.start) >= new Date().toTimeString().slice(0,5))).filter((x) => x.status !== 'cancelled').sort((a,b) => `${a.day} ${a.start}`.localeCompare(`${b.day} ${b.start}`));
    const firstName = tg()?.initDataUnsafe?.user?.first_name || '';
    const live = Boolean(business.subscription_active);
    const link = clientLink(business);
    const monthRevenue = formatMoneyByCurrency(statistics.month?.revenue_by_currency);
    const todayCount = statistics.today?.bookings ?? todayBookings.length;
    const weekCount = statistics.week?.bookings ?? 0;
    const serviceCount = services.length;
    const greeting = firstName ? `С возвращением, ${esc(firstName)}` : 'Ваш бизнес';

    root.innerHTML = `
      <div class="bookly-v2-wrap">
        <div class="bookly-v2-top">
          <div><div class="bookly-v2-brand">BOOKLY</div><h1 class="bookly-v2-greeting">${greeting}</h1></div>
          <span class="bookly-v2-status ${live ? 'live' : ''}">${live ? '● Live' : 'Setup'}</span>
        </div>

        <section class="bookly-v2-business">
          <div class="bookly-v2-business-kicker">Current workspace</div>
          <div class="bookly-v2-business-title">${esc(business.name || 'My Business')}</div>
          <div class="bookly-v2-business-meta">${esc(business.address || 'Добавьте адрес в настройках бизнеса')}</div>
          <div class="bookly-v2-business-actions">
            <button class="bookly-v2-action primary" data-v2-action="open-client">Открыть страницу</button>
            <button class="bookly-v2-action" data-v2-action="settings">Настройки бизнеса</button>
          </div>
        </section>

        <section class="bookly-v2-stats">
          <div class="bookly-v2-stat"><span class="bookly-v2-stat-label">Сегодня</span><strong class="bookly-v2-stat-value">${todayCount}</strong></div>
          <div class="bookly-v2-stat"><span class="bookly-v2-stat-label">На неделе</span><strong class="bookly-v2-stat-value">${weekCount}</strong></div>
          <div class="bookly-v2-stat"><span class="bookly-v2-stat-label">Услуги</span><strong class="bookly-v2-stat-value">${serviceCount}</strong></div>
        </section>

        <section class="bookly-v2-section">
          <div class="bookly-v2-section-head"><h2 class="bookly-v2-section-title">Сегодня</h2><button class="bookly-v2-section-link" data-v2-action="bookings">Все записи →</button></div>
          ${todayBookings.length ? todayBookings.slice(0,6).map((x) => `
            <div class="bookly-v2-row"><div class="bookly-v2-time">${esc(String(x.start || '').slice(0,5))}</div><div class="bookly-v2-client"><strong>${esc(x.client_name || 'Клиент')}</strong><span>${esc(x.service_name || 'Запись')} · ${esc(String(x.client_phone || ''))}</span></div><div class="bookly-v2-badge">${x.status === 'confirmed' ? 'Confirmed' : esc(x.status || '')}</div></div>
          `).join('') : `<div class="bookly-v2-empty">На сегодня записей нет</div>`}
        </section>

        <section class="bookly-v2-section">
          <div class="bookly-v2-section-head"><h2 class="bookly-v2-section-title">Быстрые действия</h2></div>
          <div class="bookly-v2-actions">
            <button class="bookly-v2-quick" data-v2-action="new-booking"><span><strong>Новая запись</strong><span>Добавить клиента вручную</span></span><b>＋</b></button>
            <button class="bookly-v2-quick" data-v2-action="services"><span><strong>Услуги</strong><span>Цены, длительность и список</span></span><b>→</b></button>
            <button class="bookly-v2-quick" data-v2-action="schedule"><span><strong>График</strong><span>Рабочие часы и доступность</span></span><b>→</b></button>
            <button class="bookly-v2-quick" data-v2-action="subscription"><span><strong>Bookly Pro</strong><span>${live ? 'Управление подпиской' : 'Активировать онлайн-записи'}</span></span><b>→</b></button>
          </div>
        </section>

        <section class="bookly-v2-section">
          <div class="bookly-v2-section-head"><h2 class="bookly-v2-section-title">Следующие записи</h2><span class="bookly-v2-section-link">${upcoming.length}</span></div>
          ${upcoming.length ? upcoming.slice(0,4).map((x) => `
            <div class="bookly-v2-row"><div class="bookly-v2-time">${esc(String(x.start || '').slice(0,5))}</div><div class="bookly-v2-client"><strong>${esc(x.client_name || 'Клиент')}</strong><span>${esc(x.day)} · ${esc(x.service_name || 'Запись')}</span></div></div>
          `).join('') : `<div class="bookly-v2-empty">Пока нет будущих записей</div>`}
        </section>

        <section class="bookly-v2-section">
          <div class="bookly-v2-section-head"><h2 class="bookly-v2-section-title">Для клиентов</h2><span class="bookly-v2-section-link">${live ? monthRevenue : 'Pro'}</span></div>
          <div class="bookly-v2-share"><span class="bookly-v2-share-label">Client link</span><div class="bookly-v2-share-link">${esc(link)}</div><div class="bookly-v2-share-actions"><button class="bookly-v2-quick" data-v2-action="copy-link"><span><strong>Скопировать</strong><span>Ссылка на запись</span></span><b>⧉</b></button><button class="bookly-v2-quick" data-v2-action="share-link"><span><strong>Поделиться</strong><span>Отправить в Telegram</span></span><b>↗</b></button></div></div>
        </section>
      </div>`;

    root.querySelectorAll('[data-v2-action]').forEach((button) => {
      button.addEventListener('click', () => {
        const action = button.dataset.v2Action;
        if (action === 'open-client') {
          if (!live) return triggerExistingAction('оплатить подписку');
          tg()?.openTelegramLink ? tg().openTelegramLink(link) : window.open(link, '_blank');
        } else if (action === 'settings') {
          triggerExistingAction('настройки');
        } else if (action === 'bookings') {
          triggerExistingAction('записи');
        } else if (action === 'new-booking') {
          triggerExistingAction('добавить запись');
        } else if (action === 'services') {
          triggerExistingAction('услуги');
        } else if (action === 'schedule') {
          triggerExistingAction('график');
        } else if (action === 'subscription') {
          triggerExistingAction(live ? 'управление подпиской' : 'оплатить подписку');
          if (!live) triggerExistingAction('активировать pro');
        } else if (action === 'copy-link') {
          navigator.clipboard?.writeText(link).then(() => {
            button.querySelector('strong').textContent = 'Скопировано';
            setTimeout(() => { const s = button.querySelector('strong'); if (s) s.textContent = 'Скопировать'; }, 1400);
          });
        } else if (action === 'share-link') {
          const shareUrl = `https://t.me/share/url?url=${encodeURIComponent(link)}&text=${encodeURIComponent(business.name || 'Bookly')}`;
          tg()?.openTelegramLink ? tg().openTelegramLink(shareUrl) : window.open(shareUrl, '_blank');
        }
      });
    });
  }

  async function ensureDashboard() {
    const nav = document.querySelector(navSelector);
    const section = findAdminSection();
    if (!nav || !section || !isHome(nav)) {
      if (section && v2Root) {
        v2Root.remove();
        v2Root = null;
        showLegacy(section);
      }
      return;
    }

    setStyles();
    if (!v2Root || !section.contains(v2Root)) {
      v2Root = document.createElement('div');
      v2Root.id = 'bookly-dashboard-v2';
      section.insertBefore(v2Root, nav);
    }

    hideLegacy(section, v2Root);
    renderLoading(v2Root);

    const currentKey = `${businessKey()}:${initData().slice(0, 32)}`;
    if (currentKey !== lastActive || !v2Root.dataset.loaded) {
      lastActive = currentKey;
      try {
        const data = await loadData();
        if (v2Root && section.contains(v2Root) && isHome(document.querySelector(navSelector))) {
          render(v2Root, data);
          v2Root.dataset.loaded = '1';
        }
      } catch (error) {
        v2Root.innerHTML = `<div class="bookly-v2-wrap"><div class="bookly-v2-section"><div class="bookly-v2-empty">Не удалось загрузить данные Dashboard</div></div></div>`;
        console.error('Bookly Dashboard V2:', error);
      }
    }
  }

  function businessKey() {
    try { return localStorage.getItem('bookly_active_business_id') || ''; } catch (_) { return ''; }
  }

  function boot() {
    setStyles();
    const run = () => {
      if (refreshTimer) clearTimeout(refreshTimer);
      refreshTimer = setTimeout(() => { void ensureDashboard(); }, 80);
    };
    observer = new MutationObserver(run);
    observer.observe(document.body, { childList: true, subtree: true, attributes: true, attributeFilter: ['class'] });
    document.addEventListener('click', (event) => {
      if (event.target.closest(navSelector)) setTimeout(run, 60);
    }, true);
    run();
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', boot);
  else boot();
})();
