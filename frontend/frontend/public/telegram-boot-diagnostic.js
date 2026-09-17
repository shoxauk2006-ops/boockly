/* Temporary Telegram Mini App boot diagnostics. No-op unless the frontend throws. */
(function () {
  'use strict';

  var shown = false;

  function text(value) {
    try {
      if (value instanceof Error) return value.stack || value.message || String(value);
      if (typeof value === 'string') return value;
      return JSON.stringify(value);
    } catch (_) {
      return String(value);
    }
  }

  function show(kind, detail) {
    if (shown) return;
    shown = true;

    var box = document.createElement('pre');
    box.id = 'bookly-boot-diagnostic';
    box.textContent = 'BOOKLY BOOT ERROR\n\n' + kind + '\n\n' + text(detail);
    box.style.cssText = [
      'position:fixed',
      'inset:12px',
      'z-index:2147483647',
      'margin:0',
      'padding:16px',
      'overflow:auto',
      'box-sizing:border-box',
      'border-radius:12px',
      'background:#fff',
      'color:#111',
      'border:2px solid #111',
      'font:14px/1.45 monospace',
      'white-space:pre-wrap'
    ].join(';');

    (document.body || document.documentElement).appendChild(box);
    try { console.error('[Bookly boot diagnostic]', kind, detail); } catch (_) {}
  }

  window.addEventListener('error', function (event) {
    show('window.error', event.error || event.message || 'Unknown error');
  });

  window.addEventListener('unhandledrejection', function (event) {
    show('unhandledrejection', event.reason || 'Unknown rejection');
  });
})();
