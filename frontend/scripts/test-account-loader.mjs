import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import vm from 'node:vm';

const readAsset = (name) => readFile(new URL('../public/' + name, import.meta.url), 'utf8');
const [source, html, css] = await Promise.all([
  readAsset('account-loader.js'), readAsset('account.html'), readAsset('account-loader.css')
]);

assert.match(html, /<main\b[^>]*id="wakeShell"[^>]*\bhidden[\s>]/,
  'the loader must be hidden before JavaScript or the first paint');
assert.match(css, /\.wake-shell\[hidden\]\s*\{\s*display:\s*none;/,
  'the grid display must not override the hidden attribute');

class FakeClock {
  now = 0;
  nextId = 0;
  timers = new Map();

  setTimeout = (handler, delay = 0) => {
    const id = ++this.nextId;
    this.timers.set(id, { at: this.now + delay, handler });
    return id;
  };

  clearTimeout = (id) => this.timers.delete(id);

  async flush() {
    // Drain nested fetch/JSON/Promise.all continuations without real-time sleeps.
    for (let i = 0; i < 30; i += 1) await Promise.resolve();
  }

  async advanceTo(target) {
    assert.ok(target >= this.now);
    await this.flush();
    for (;;) {
      const next = [...this.timers].sort((a, b) => a[1].at - b[1].at)[0];
      if (!next || next[1].at > target) break;
      const [id, timer] = next;
      this.now = timer.at;
      this.timers.delete(id);
      timer.handler();
      await this.flush();
    }
    this.now = target;
    await this.flush();
  }
}

function element(textContent = '', hidden = false, onHidden = () => {}) {
  const values = new Set();
  return {
    textContent,
    get hidden() { return hidden; },
    set hidden(value) { hidden = value; onHidden(value); },
    classList: {
      add: (value) => values.add(value),
      remove: (value) => values.delete(value),
      contains: (value) => values.has(value)
    },
    listeners: {},
    addEventListener(name, handler) { this.listeners[name] = handler; }
  };
}

const response = (body, contentType = 'application/json', ok = true) => ({
  ok,
  headers: { get: () => contentType },
  async json() { return body; },
  async text() { return String(body); }
});
const workspace = () => response(
  '<html lang="en"><head></head><body><span id="accountBootText">Loading</span><main>Account</main></body></html>', 'text/html'
);

function createHarness({ health = () => response({ ok: true }), core = workspace } = {}) {
  const clock = new FakeClock();
  const shownAt = [];
  const ids = new Map([
    ['wakeRetry', element('Try again', true)],
    ['wakeShell', element('', true, (hidden) => { if (!hidden) shownAt.push(clock.now); })],
    ['wakeStatus', element('Connecting to the server…')]
  ]);
  const state = { html: '', openedAt: null, healthAttempts: 0 };
  const document = {
    documentElement: { lang: 'en', dir: 'ltr' },
    getElementById: (id) => ids.get(id) || null,
    open() {},
    write(value) { state.html += value; state.openedAt = clock.now; },
    close() {}
  };
  const window = {
    location: { search: '?api=https%3A%2F%2Fapi.example.test' },
    setTimeout: clock.setTimeout,
    clearTimeout: clock.clearTimeout,
    document
  };
  const after = (ms, value, signal) => new Promise((resolve, reject) => {
    const timer = clock.setTimeout(() => resolve(value), ms);
    signal?.addEventListener('abort', () => {
      clock.clearTimeout(timer);
      reject(new Error('Request aborted'));
    }, { once: true });
  });
  vm.runInNewContext(source, {
    AbortController,
    Date: class extends Date { static now() { return clock.now; } },
    URLSearchParams,
    document,
    fetch: (url, options) => {
      if (url === '/account-core.html') return core({ after, clock });
      assert.match(String(url), /^https:\/\/api\.example\.test\/health\?/);
      assert.equal(options.cache, 'no-store');
      assert.equal(options.headers.Accept, 'application/json');
      state.healthAttempts += 1;
      return health({ attempt: state.healthAttempts, after, clock, signal: options.signal });
    },
    localStorage: { getItem: () => 'ru' },
    navigator: { language: 'en-US' },
    window
  }, { filename: 'account-loader.js' });
  return {
    clock, state, shownAt, document,
    shell: ids.get('wakeShell'), retry: ids.get('wakeRetry'), status: ids.get('wakeStatus')
  };
}

function assertWorkspace(test) {
  assert.match(test.state.html, /<main>Account<\/main>/);
  assert.match(test.state.html, /<html lang="ru" dir="ltr">/,
    'the selected language must be set before the workspace is rendered');
  assert.match(test.state.html, /<span id="accountBootText">Загрузка<\/span>/,
    'the boot label must be localized before the first rendered frame');
  assert.doesNotMatch(test.state.html, /<span id="accountBootText">Loading<\/span>/);
  for (const asset of ['account-workspace-polish.css', 'account-page-i18n.js',
    'account-guest-i18n.js', 'account-workspace.js']) {
    assert.ok(test.state.html.includes(asset), asset + ' must still be injected');
  }
}

// Warm responses never reveal the loader, even just before its grace period ends.
for (const latency of [0, 500, 1499]) {
  const test = createHarness({
    health: ({ after, signal }) => after(latency, response({ ok: true }), signal)
  });
  await test.clock.advanceTo(latency);
  assertWorkspace(test);
  assert.equal(test.state.openedAt, latency, 'no artificial minimum or exit animation on warm entry');
  await test.clock.advanceTo(3000);
  assert.deepEqual(test.shownAt, [], 'a cleared timer must not reveal the loader later');
  assert.equal(test.document.documentElement.lang, 'ru');
  assert.equal(test.state.healthAttempts, 1);
}

// A single slow health request shows the animation only after 1.5 seconds.
{
  const test = createHarness({
    health: ({ after, signal }) => after(5000, response({ ok: true }), signal)
  });
  await test.clock.advanceTo(1499);
  assert.equal(test.shell.hidden, true);
  await test.clock.advanceTo(1500);
  assert.equal(test.shell.hidden, false);
  assert.equal(test.state.html, '');
  await test.clock.advanceTo(5460);
  assertWorkspace(test);
  assert.deepEqual(test.shownAt, [1500]);
}

// Render's HTML waking page, even with HTTP 200, is not a healthy JSON response.
{
  const test = createHarness({
    health: ({ attempt }) => attempt < 3
      ? response('Application loading', 'text/html') : response({ ok: true })
  });
  await test.clock.advanceTo(5060);
  assert.equal(test.state.healthAttempts, 3);
  assertWorkspace(test);
  assert.deepEqual(test.shownAt, [1500]);
}

// Do not show a server wake-up animation just because the static HTML is slow.
{
  const test = createHarness({ core: ({ after }) => after(4000, workspace()) });
  await test.clock.advanceTo(3000);
  assert.deepEqual(test.shownAt, []);
  assert.equal(test.state.html, '');
  await test.clock.advanceTo(4000);
  assertWorkspace(test);
  assert.equal(test.state.openedAt, 4000);
  assert.deepEqual(test.shownAt, []);
}

// A stalled request times out; subsequent health checks can recover.
{
  const test = createHarness({
    health: ({ attempt, after, signal }) => attempt === 1
      ? after(20000, response({ ok: true }), signal) : response({ ok: true })
  });
  await test.clock.advanceTo(14760);
  assert.equal(test.state.healthAttempts, 2);
  assertWorkspace(test);
}

// An unavailable server keeps the retry action visible and can recover on click.
{
  let ready = false;
  const test = createHarness({ health: () => response({ ok: ready }) });
  await test.clock.advanceTo(92500);
  assert.equal(test.retry.hidden, false);
  assert.equal(test.shell.hidden, false);
  assert.equal(test.status.textContent, 'Не удалось подключиться к серверу.');
  assert.equal(test.state.html, '');
  ready = true;
  const retry = test.retry.listeners.click();
  await test.clock.advanceTo(93000);
  await retry;
  assertWorkspace(test);
}

// A failed HTML request reveals an error, cancels the pending reveal, and stops polling.
{
  const test = createHarness({
    core: () => response('', 'text/html', false),
    health: ({ after, signal }) => after(5000, response({ ok: false }), signal)
  });
  await test.clock.advanceTo(10000);
  assert.equal(test.shell.hidden, false);
  assert.equal(test.retry.hidden, false);
  assert.equal(test.state.healthAttempts, 1, 'failed runs must stop polling');
  assert.deepEqual(test.shownAt, [0], 'the old reveal timer must be cleared');
  assert.equal(test.status.textContent, 'Не удалось подключиться к серверу.');
}

console.log('Account loader: 9 scenarios passed (warm, cold, HTML response, slow assets, timeout, retry, failure)');
