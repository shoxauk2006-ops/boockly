import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import vm from 'node:vm';

const source = await readFile(
  new URL('../public/account-loader.js', import.meta.url),
  'utf8'
);

class FakeClassList {
  values = new Set();

  add(value) {
    this.values.add(value);
  }

  remove(value) {
    this.values.delete(value);
  }
}

function element(textContent = '') {
  return {
    textContent,
    hidden: false,
    classList: new FakeClassList(),
    listeners: {},
    addEventListener(name, handler) {
      this.listeners[name] = handler;
    }
  };
}

const ids = new Map([
  ['wakeRetry', element('Try again')],
  ['wakeShell', element()],
  ['wakeStatus', element('Connecting to the server…')]
]);

[
  'wakeKicker', 'wakeTitle', 'wakeHint', 'demoLive', 'demoServiceLabel',
  'demoService', 'demoDuration', 'demoSpecialistLabel', 'demoSpecialist',
  'demoAvailable', 'demoDateLabel', 'demoDate', 'demoTimeLabel', 'demoTime',
  'demoConfirmed', 'demoReady'
].forEach((id) => ids.set(id, element()));

let writtenHtml = '';
let healthAttempts = 0;

const document = {
  documentElement: { lang: 'en', dir: 'ltr' },
  getElementById(id) {
    return ids.get(id) || null;
  },
  open() {},
  write(html) {
    writtenHtml += html;
  },
  close() {}
};

const fastSetTimeout = (handler, timeout, ...args) =>
  setTimeout(handler, Math.min(timeout, 5), ...args);

const window = {
  location: { search: '?api=https%3A%2F%2Fapi.example.test' },
  setTimeout: fastSetTimeout,
  clearTimeout,
  document
};

const response = (body, contentType = 'application/json', ok = true) => ({
  ok,
  headers: { get: () => contentType },
  async json() { return body; },
  async text() { return String(body); }
});

const context = {
  AbortController,
  Date,
  Object,
  Promise,
  URLSearchParams,
  document,
  fetch: async (url) => {
    if (url === '/account-core.html') {
      return response('<html><head></head><body><main>Account</main></body></html>', 'text/html');
    }

    if (String(url).includes('/health')) {
      healthAttempts += 1;
      if (healthAttempts < 3) return response('waking', 'text/html', true);
      return response({ ok: true });
    }

    throw new Error(`Unexpected URL: ${url}`);
  },
  localStorage: {
    getItem(key) {
      return key === 'bookly_language' ? 'ru' : null;
    }
  },
  navigator: { language: 'en-US' },
  window
};

vm.runInNewContext(source, context, { filename: 'account-loader.js' });
await new Promise((resolve) => setTimeout(resolve, 120));

assert.equal(healthAttempts, 3, 'loader should retry until the API returns JSON health');
assert.equal(document.documentElement.lang, 'ru', 'loader should use the stored language');
assert.match(writtenHtml, /account-workspace-polish\.css/);
assert.match(writtenHtml, /account-page-i18n\.js/);
assert.match(writtenHtml, /account-workspace\.js/);
assert.match(writtenHtml, /<main>Account<\/main>/);

console.log('Account wake-up loader test passed');
