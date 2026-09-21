(function () {
  'use strict';

  var DEFAULT_API = 'https://boockly-3.onrender.com';
  var query = new URLSearchParams(window.location.search);
  var api = (query.get('api') || DEFAULT_API).replace(/\/$/, '');
  var retryButton = document.getElementById('wakeRetry');
  var wakeShell = document.getElementById('wakeShell');
  var statusElement = document.getElementById('wakeStatus');
  var activeRun = 0;

  var COPY = {
    en: {
      kicker: 'BOOKING WORKSPACE', title: 'Starting Bookly', connecting: 'Connecting to the server…',
      waking: 'The server is waking up…', almost: 'Almost ready…', longer: 'Connection is taking a little longer…',
      ready: 'Bookly is ready', failed: 'Could not connect to the server.',
      hint: 'The first start after a pause can take up to a minute.', retry: 'Try again', live: 'Connecting',
      serviceLabel: 'SERVICE', service: 'Choose a service', duration: '45 min',
      specialistLabel: 'SPECIALIST', specialist: 'Available specialist', available: 'Available today',
      dateLabel: 'DATE', date: 'Choose a date', timeLabel: 'AVAILABLE TIME', time: 'Choose a time',
      confirmed: 'Booking confirmed', allReady: 'Everything is ready'
    },
    ru: {
      kicker: 'РАБОЧЕЕ ПРОСТРАНСТВО', title: 'Запускаем Bookly', connecting: 'Подключаемся к серверу…',
      waking: 'Сервер просыпается…', almost: 'Почти готово…', longer: 'Подключение занимает чуть больше времени…',
      ready: 'Bookly готов', failed: 'Не удалось подключиться к серверу.',
      hint: 'Первый запуск после паузы может занять до минуты.', retry: 'Повторить', live: 'Подключение',
      serviceLabel: 'УСЛУГА', service: 'Выберите услугу', duration: '45 мин',
      specialistLabel: 'СПЕЦИАЛИСТ', specialist: 'Доступный специалист', available: 'Свободен сегодня',
      dateLabel: 'ДАТА', date: 'Выберите дату', timeLabel: 'СВОБОДНОЕ ВРЕМЯ', time: 'Выберите время',
      confirmed: 'Запись подтверждена', allReady: 'Всё готово'
    },
    uz: {
      kicker: 'BRON BOSHQARUVI', title: 'Bookly ishga tushmoqda', connecting: 'Serverga ulanmoqda…',
      waking: 'Server ishga tushmoqda…', almost: 'Deyarli tayyor…', longer: 'Ulanish biroz ko‘proq vaqt olmoqda…',
      ready: 'Bookly tayyor', failed: 'Serverga ulanib bo‘lmadi.',
      hint: 'Tanaffusdan keyingi birinchi ishga tushish bir daqiqagacha davom etishi mumkin.', retry: 'Qayta urinish', live: 'Ulanmoqda',
      serviceLabel: 'XIZMAT', service: 'Xizmatni tanlang', duration: '45 daq',
      specialistLabel: 'MUTAXASSIS', specialist: 'Mavjud mutaxassis', available: 'Bugun bo‘sh',
      dateLabel: 'SANA', date: 'Sanani tanlang', timeLabel: 'BO‘SH VAQT', time: 'Vaqtni tanlang',
      confirmed: 'Bron tasdiqlandi', allReady: 'Hammasi tayyor'
    },
    tr: {
      kicker: 'REZERVASYON ALANI', title: 'Bookly başlatılıyor', connecting: 'Sunucuya bağlanılıyor…',
      waking: 'Sunucu uyanıyor…', almost: 'Neredeyse hazır…', longer: 'Bağlantı biraz daha uzun sürüyor…',
      ready: 'Bookly hazır', failed: 'Sunucuya bağlanılamadı.',
      hint: 'Aradan sonraki ilk başlatma bir dakikaya kadar sürebilir.', retry: 'Tekrar dene', live: 'Bağlanıyor',
      serviceLabel: 'HİZMET', service: 'Hizmet seçin', duration: '45 dk',
      specialistLabel: 'UZMAN', specialist: 'Uygun uzman', available: 'Bugün uygun',
      dateLabel: 'TARİH', date: 'Tarih seçin', timeLabel: 'UYGUN SAAT', time: 'Saat seçin',
      confirmed: 'Rezervasyon onaylandı', allReady: 'Her şey hazır'
    },
    ar: {
      kicker: 'مساحة إدارة الحجوزات', title: 'جارٍ تشغيل Bookly', connecting: 'جارٍ الاتصال بالخادم…',
      waking: 'جارٍ تشغيل الخادم…', almost: 'أصبحنا جاهزين تقريبًا…', longer: 'يستغرق الاتصال وقتًا أطول قليلًا…',
      ready: 'Bookly جاهز', failed: 'تعذر الاتصال بالخادم.',
      hint: 'قد يستغرق التشغيل الأول بعد التوقف ما يصل إلى دقيقة.', retry: 'إعادة المحاولة', live: 'جارٍ الاتصال',
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
    text('wakeHint', copy.hint);
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
    if (!statusElement || statusElement.textContent === copy[key]) return;
    statusElement.classList.add('is-changing');
    window.setTimeout(function () {
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
      var elapsed = Date.now() - started;
      if (elapsed >= 35000) setStatus('longer');
      else if (elapsed >= 17000) setStatus('almost');
      else if (elapsed >= 3500) setStatus('waking');

      if (await serverIsReady()) return true;
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
    var styles = '<link rel="stylesheet" href="/account-workspace-polish.css">';
    var scripts = [
      '<script src="/account-page-i18n.js"><\/script>',
      '<script src="/account-guest-i18n.js"><\/script>',
      '<script src="/account-workspace.js"><\/script>'
    ].join('');

    html = html.replace('</head>', styles + '</head>');
    html = html.replace('</body>', scripts + '</body>');
    document.open();
    document.write(html);
    document.close();
  }

  async function start() {
    var runId = ++activeRun;
    var started = Date.now();
    retryButton.hidden = true;
    wakeShell.classList.remove('is-ready');
    setStatus('connecting');

    try {
      var results = await Promise.all([loadWorkspaceHtml(), waitForServer(runId)]);

      if (runId !== activeRun) return;
      if (!results[1]) throw new Error('Server wake-up timed out');

      var minimumDisplay = 900 - (Date.now() - started);
      if (minimumDisplay > 0) await delay(minimumDisplay);

      wakeShell.classList.add('is-ready');
      setStatus('ready');
      await delay(470);
      wakeShell.classList.add('is-leaving');
      await delay(290);
      openWorkspace(results[0]);
    } catch (_) {
      if (runId !== activeRun) return;
      setStatus('failed');
      retryButton.hidden = false;
    }
  }

  retryButton.addEventListener('click', start);
  applyCopy();
  start();
})();
