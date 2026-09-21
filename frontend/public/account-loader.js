(function () {
  'use strict';

  var DEFAULT_API = 'https://boockly-3.onrender.com';
  var query = new URLSearchParams(window.location.search);
  var api = (query.get('api') || DEFAULT_API).replace(/\/$/, '');
  var retryButton = document.getElementById('wakeRetry');
  var wakeShell = document.getElementById('wakeShell');
  var statusElement = document.getElementById('wakeStatus');
  var activeRun = 0;
  var statusTimer;
  var SHOW_LOADER_AFTER_MS = 1500;

  function hasAccountSession() {
    if (query.has('oauth_code') || query.has('oauth_error') || query.has('terms_required')) {
      return false;
    }

    try {
      return Boolean(localStorage.getItem('bookly_session'));
    } catch (_) {
      return false;
    }
  }

  var sessionLoading = hasAccountSession();

  var COPY = {
    en: {
      kicker: 'BOOKLY WORKSPACE', title: 'Preparing Bookly', connecting: 'Loading Bookly…',
      ready: 'Everything is ready', failed: 'Could not load Bookly.', retry: 'Try again', live: 'Loading',
      serviceLabel: 'SERVICE', service: 'Choose a service', duration: '45 min',
      specialistLabel: 'SPECIALIST', specialist: 'Available specialist', available: 'Available today',
      dateLabel: 'DATE', date: 'Choose a date', timeLabel: 'AVAILABLE TIME', time: 'Choose a time',
      confirmed: 'Booking confirmed', allReady: 'Everything is ready'
    },
    ru: {
      kicker: 'РАБОЧЕЕ ПРОСТРАНСТВО', title: 'Готовим Bookly', connecting: 'Загружаем Bookly…',
      ready: 'Всё готово', failed: 'Не удалось загрузить Bookly.', retry: 'Повторить', live: 'Загрузка',
      serviceLabel: 'УСЛУГА', service: 'Выберите услугу', duration: '45 мин',
      specialistLabel: 'СПЕЦИАЛИСТ', specialist: 'Доступный специалист', available: 'Свободен сегодня',
      dateLabel: 'ДАТА', date: 'Выберите дату', timeLabel: 'СВОБОДНОЕ ВРЕМЯ', time: 'Выберите время',
      confirmed: 'Запись подтверждена', allReady: 'Всё готово'
    },
    uz: {
      kicker: 'BOOKLY ISH MAYDONI', title: 'Bookly tayyorlanmoqda', connecting: 'Bookly yuklanmoqda…',
      ready: 'Hammasi tayyor', failed: 'Bookly yuklanmadi.', retry: 'Qayta urinish', live: 'Yuklanmoqda',
      serviceLabel: 'XIZMAT', service: 'Xizmatni tanlang', duration: '45 daq',
      specialistLabel: 'MUTAXASSIS', specialist: 'Mavjud mutaxassis', available: 'Bugun bo‘sh',
      dateLabel: 'SANA', date: 'Sanani tanlang', timeLabel: 'BO‘SH VAQT', time: 'Vaqtni tanlang',
      confirmed: 'Bron tasdiqlandi', allReady: 'Hammasi tayyor'
    },
    tr: {
      kicker: 'BOOKLY ÇALIŞMA ALANI', title: 'Bookly hazırlanıyor', connecting: 'Bookly yükleniyor…',
      ready: 'Her şey hazır', failed: 'Bookly yüklenemedi.', retry: 'Tekrar dene', live: 'Yükleniyor',
      serviceLabel: 'HİZMET', service: 'Hizmet seçin', duration: '45 dk',
      specialistLabel: 'UZMAN', specialist: 'Uygun uzman', available: 'Bugün uygun',
      dateLabel: 'TARİH', date: 'Tarih seçin', timeLabel: 'UYGUN SAAT', time: 'Saat seçin',
      confirmed: 'Rezervasyon onaylandı', allReady: 'Her şey hazır'
    },
    ar: {
      kicker: 'مساحة عمل BOOKLY', title: 'جارٍ تجهيز Bookly', connecting: 'جارٍ تحميل Bookly…',
      ready: 'كل شيء جاهز', failed: 'تعذر تحميل Bookly.', retry: 'إعادة المحاولة', live: 'جارٍ التحميل',
      serviceLabel: 'الخدمة', service: 'اختر الخدمة', duration: '45 دقيقة',
      specialistLabel: 'المختص', specialist: 'مختص متاح', available: 'متاح اليوم',
      dateLabel: 'التاريخ', date: 'اختر التاريخ', timeLabel: 'الوقت المتاح', time: 'اختر الوقت',
      confirmed: 'تم تأكيد الحجز', allReady: 'كل شيء جاهز'
    }
  };

  function language() {
    try {
      var stored = String(localStorage.getItem('bookly_language') || '').toLowerCase();
      if (COPY[stored]) return stored;
    } catch (_) {}

    var browser = String(navigator.language || 'en').toLowerCase();
    if (/^ru/.test(browser)) return 'ru';
    if (/^uz/.test(browser)) return 'uz';
    if (/^tr/.test(browser)) return 'tr';
    if (/^ar/.test(browser)) return 'ar';
    return 'en';
  }

  var copy = COPY[language()] || COPY.en;

  function text(id, value) {
    var element = document.getElementById(id);
    if (element) element.textContent = value;
  }

  function applyCopy() {
    var lang = language();
    document.documentElement.lang = lang;
    document.documentElement.dir = lang === 'ar' ? 'rtl' : 'ltr';
    text('wakeKicker', copy.kicker);
    text('wakeTitle', copy.title);
    text('wakeStatus', copy.connecting);
    text('wakeRetry', copy.retry);
    text('demoLive', copy.live);
    text('demoServiceLabel', copy.serviceLabel);
    text('demoService', copy.service);
    text('demoDuration', copy.duration);
    text('demoSpecialistLabel', copy.specialistLabel);
    text('demoSpecialist', copy.specialist);
    text('demoAvailable', copy.available);
    text('demoDateLabel', copy.dateLabel);
    text('demoDate', copy.date);
    text('demoTimeLabel', copy.timeLabel);
    text('demoTime', copy.time);
    text('demoConfirmed', copy.confirmed);
    text('demoReady', copy.allReady);
  }

  function setStatus(key) {
    if (!statusElement) return;
    window.clearTimeout(statusTimer);
    statusElement.classList.remove('is-changing');
    if (statusElement.textContent === copy[key]) return;
    statusElement.classList.add('is-changing');
    statusTimer = window.setTimeout(function () {
      statusElement.textContent = copy[key] || copy.connecting;
      statusElement.classList.remove('is-changing');
    }, 170);
  }

  function delay(ms) {
    return new Promise(function (resolve) {
      window.setTimeout(resolve, ms);
    });
  }

  async function fetchWithTimeout(url, options, timeout) {
    var controller = new AbortController();
    var timer = window.setTimeout(function () { controller.abort(); }, timeout);

    try {
      return await fetch(url, Object.assign({}, options, { signal: controller.signal }));
    } finally {
      window.clearTimeout(timer);
    }
  }

  async function serverIsReady() {
    try {
      var response = await fetchWithTimeout(
        api + '/health?source=bookly-account-wakeup&t=' + Date.now(),
        { cache: 'no-store', headers: { Accept: 'application/json' } },
        12000
      );

      if (!response.ok) return false;
      var type = String(response.headers.get('content-type') || '').toLowerCase();
      if (type.indexOf('application/json') === -1) return false;
      var data = await response.json();
      return data && data.ok === true;
    } catch (_) {
      return false;
    }
  }

  async function waitForServer(runId) {
    var started = Date.now();

    while (runId === activeRun && Date.now() - started < 90000) {
      if (await serverIsReady()) return true;
      if (runId !== activeRun) return false;
      await delay(2300);
    }

    return false;
  }

  async function loadWorkspaceHtml() {
    var response = await fetch('/account-core.html', { cache: 'no-store' });
    if (!response.ok) throw new Error('Unable to load account workspace');
    return response.text();
  }

  function openWorkspace(html) {
    var lang = language();
    var styles = '<link rel="stylesheet" href="/account-workspace-polish.css">';
    var scripts = [
      '<script src="/account-page-i18n.js"><\/script>',
      '<script src="/account-guest-i18n.js"><\/script>',
      '<script src="/account-workspace.js"><\/script>'
    ].join('');

    html = html.replace(
      '<html lang="en">',
      '<html lang="' + lang + '" dir="' + (lang === 'ar' ? 'rtl' : 'ltr') + '">'
    );
    html = html.replace('</head>', styles + '</head>');
    html = html.replace('</body>', scripts + '</body>');
    document.open();
    document.write(html);
    document.close();
  }

  async function start() {
    var runId = ++activeRun;
    retryButton.hidden = true;
    wakeShell.classList.remove('is-ready');
    wakeShell.classList.remove('is-leaving');
    setStatus('connecting');

    // Returning users see the branded loader from the first frame. Guests
    // still skip it when both the static page and API are already warm.
    if (sessionLoading) wakeShell.hidden = false;
    var revealTimer = sessionLoading ? null : window.setTimeout(function () {
      if (runId === activeRun) wakeShell.hidden = false;
    }, SHOW_LOADER_AFTER_MS);

    try {
      var readiness = waitForServer(runId).then(function (ready) {
        // Slow static HTML is not evidence that the API needs to wake up.
        if (ready && revealTimer !== null) window.clearTimeout(revealTimer);
        return ready;
      });
      var results = await Promise.all([loadWorkspaceHtml(), readiness]);

      if (runId !== activeRun) return;
      if (!results[1]) throw new Error('Server wake-up timed out');

      if (!wakeShell.hidden && !sessionLoading) {
        wakeShell.classList.add('is-ready');
        setStatus('ready');
        await delay(260);
        wakeShell.classList.add('is-leaving');
        await delay(200);
      }
      openWorkspace(results[0]);
    } catch (_) {
      if (runId !== activeRun) return;
      // Stop this run's polling before allowing a retry.
      activeRun += 1;
      wakeShell.hidden = false;
      setStatus('failed');
      retryButton.hidden = false;
    } finally {
      if (revealTimer !== null) window.clearTimeout(revealTimer);
    }
  }

  retryButton.addEventListener('click', start);
  applyCopy();
  start();
})();
