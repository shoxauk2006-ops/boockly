declare global {
  interface Window {
    Paddle?: any;
    Telegram?: any;
    __booklyPaddleEnvBridge?: boolean;
    __booklyPaddleReady?: Promise<void>;
    __booklyBillingPeriodUiInstalled?: boolean;
  }
}

const env = (import.meta.env.VITE_PADDLE_ENV || 'sandbox').trim().toLowerCase();

if (env !== 'sandbox' && env !== 'live') {
  throw new Error(`Invalid VITE_PADDLE_ENV: ${env}`);
}

const isLive = env === 'live';

const clientToken = isLive
  ? import.meta.env.VITE_PADDLE_LIVE_CLIENT_TOKEN
  : import.meta.env.VITE_PADDLE_SANDBOX_CLIENT_TOKEN;

const prices: Record<number | 'noTrialBase', string> = {
  10: isLive
    ? import.meta.env.VITE_PADDLE_LIVE_BOOKLY_BASE_PRICE_ID
    : import.meta.env.VITE_PADDLE_SANDBOX_BOOKLY_BASE_PRICE_ID,
  noTrialBase: isLive
    ? import.meta.env.VITE_PADDLE_LIVE_BOOKLY_BASE_NO_TRIAL_PRICE_ID
    : import.meta.env.VITE_PADDLE_SANDBOX_BOOKLY_BASE_NO_TRIAL_PRICE_ID,
  20: isLive
    ? import.meta.env.VITE_PADDLE_LIVE_SERVICE_ADDON_20_PRICE_ID
    : import.meta.env.VITE_PADDLE_SANDBOX_SERVICE_ADDON_20_PRICE_ID,
  30: isLive
    ? import.meta.env.VITE_PADDLE_LIVE_SERVICE_ADDON_30_PRICE_ID
    : import.meta.env.VITE_PADDLE_SANDBOX_SERVICE_ADDON_30_PRICE_ID,
  50: isLive
    ? import.meta.env.VITE_PADDLE_LIVE_SERVICE_ADDON_50_PRICE_ID
    : import.meta.env.VITE_PADDLE_SANDBOX_SERVICE_ADDON_50_PRICE_ID,
  100: isLive
    ? import.meta.env.VITE_PADDLE_LIVE_SERVICE_ADDON_100_PRICE_ID
    : import.meta.env.VITE_PADDLE_SANDBOX_SERVICE_ADDON_100_PRICE_ID,
};

(window as any).__booklyPaddlePrices = prices;

async function getProfileTrialAvailable(): Promise<boolean | null> {
  const api = String(
    import.meta.env.VITE_API_URL || ''
  ).replace(/\/$/, '');

  const initData =
    window.Telegram?.WebApp?.initData || '';

  if (!api || !initData) {
    return null;
  }

  try {
    const response = await fetch(
      api + '/admin/subscription/trial-status',
      {
        headers: {
          'X-Telegram-Init-Data': initData,
        },
      }
    );

    if (!response.ok) {
      return null;
    }

    const data = await response.json().catch(
      () => null
    );

    return typeof data?.trial_available === 'boolean'
      ? data.trial_available
      : null;
  } catch (error) {
    console.error(
      '[Bookly] Trial status lookup failed:',
      error
    );
    return null;
  }
}

function installProfileTrialPriceGuard(): void {
  if (
    !window.Paddle?.Checkout ||
    typeof window.Paddle.Checkout.open !== 'function' ||
    (window.Paddle.Checkout.open as any).__booklyProfileTrialGuard
  ) {
    return;
  }

  const originalOpen = window.Paddle.Checkout.open.bind(
    window.Paddle.Checkout
  );

  const guardedOpen = async (options: any = {}) => {
    const trialAvailable =
      await getProfileTrialAvailable();

    if (
      trialAvailable === false &&
      prices.noTrialBase
    ) {
      const items = Array.isArray(options.items)
        ? options.items.map((item: any, index: number) =>
            index === 0
              ? {
                  ...item,
                  priceId: prices.noTrialBase,
                }
              : item
          )
        : options.items;

      return originalOpen({
        ...options,
        items,
      });
    }

    return originalOpen(options);
  };

  (guardedOpen as any).__booklyProfileTrialGuard = true;
  window.Paddle.Checkout.open = guardedOpen;
}

function loadPaddleScript(): Promise<void> {
  return new Promise((resolve, reject) => {
    if (window.Paddle) {
      resolve();
      return;
    }

    const existing = document.querySelector(
      'script[src="https://cdn.paddle.com/paddle/v2/paddle.js"]'
    ) as HTMLScriptElement | null;

    if (existing) {
      existing.addEventListener('load', () => resolve(), { once: true });
      existing.addEventListener(
        'error',
        () => reject(new Error('Failed to load Paddle.js')),
        { once: true }
      );
      return;
    }

    const script = document.createElement('script');
    script.src = 'https://cdn.paddle.com/paddle/v2/paddle.js';
    script.async = true;
    script.onload = () => resolve();
    script.onerror = () =>
      reject(new Error('Failed to load Paddle.js'));

    document.head.appendChild(script);
  });
}

async function initializePaddle(): Promise<void> {
  if (!window.Paddle) {
    throw new Error('Paddle.js is not available');
  }

  if (!clientToken) {
    throw new Error(`Paddle ${env} client token is not configured`);
  }

  if (window.Paddle.__booklyInitialized) {
    installProfileTrialPriceGuard();
    return;
  }

  if (!isLive && typeof window.Paddle.Environment?.set === 'function') {
    window.Paddle.Environment.set('sandbox');
  }

  if (typeof window.Paddle.Initialize !== 'function') {
    throw new Error('Paddle.Initialize is not available');
  }

  window.Paddle.Initialize({
    token: clientToken,
  });

  window.Paddle.__booklyInitialized = true;
  installProfileTrialPriceGuard();
}

type BooklyPlanPrices = {
  month: Record<number, number>;
  year: Record<number, number>;
};

const BILLING_STORAGE_KEY = 'bookly_billing_period';
const PLAN_LIMITS = [10, 20, 30, 50, 100];

function billingTranslations(lang: string) {
  const map: Record<string, any> = {
    ru: { month: 'Месяц', year: 'Год', unitMonth: '/ месяц', unitYear: '/ год', total: 'Итого:', pay: 'Перейти к оплате', trial: 'Начать 7-дневный бесплатный период', increase: 'Увеличить лимит услуг', services: 'услуг' },
    en: { month: 'Monthly', year: 'Yearly', unitMonth: '/ month', unitYear: '/ year', total: 'Total:', pay: 'Continue to payment', trial: 'Start 7-day free trial', increase: 'Increase service limit', services: 'services' },
    uz: { month: 'Oylik', year: 'Yillik', unitMonth: '/ oy', unitYear: '/ yil', total: 'Jami:', pay: 'To‘lovga o‘tish', trial: '7 kunlik bepul sinovni boshlash', increase: 'Xizmatlar limitini oshirish', services: 'xizmat' },
    tr: { month: 'Aylık', year: 'Yıllık', unitMonth: '/ ay', unitYear: '/ yıl', total: 'Toplam:', pay: 'Ödemeye devam et', trial: '7 günlük ücretsiz denemeyi başlat', increase: 'Hizmet limitini artır', services: 'hizmet' },
    ar: { month: 'شهري', year: 'سنوي', unitMonth: '/ شهر', unitYear: '/ سنة', total: 'الإجمالي:', pay: 'المتابعة إلى الدفع', trial: 'بدء الفترة التجريبية المجانية لمدة 7 أيام', increase: 'زيادة حد الخدمات', services: 'خدمات' },
  };
  return map[lang] || map.en;
}

function getUiLanguage(): string {
  const selector = document.querySelector('.language-select') as HTMLSelectElement | null;
  const value = selector?.value;
  if (value && ['ru', 'en', 'uz', 'tr', 'ar'].includes(value)) {
    return value;
  }
  const browser = (navigator.language || 'en').slice(0, 2).toLowerCase();
  return ['ru', 'en', 'uz', 'tr', 'ar'].includes(browser) ? browser : 'en';
}

async function loadBooklyPlanPrices(): Promise<BooklyPlanPrices | null> {
  const api = String(import.meta.env.VITE_API_URL || '').replace(/\/$/, '');
  const initData = window.Telegram?.WebApp?.initData || '';
  let businessId = '';

  try {
    businessId = localStorage.getItem('bookly_active_business_id') || '';
  } catch {}

  if (!api || !initData || !businessId) {
    return null;
  }

  try {
    const tokenResponse = await fetch(
      api + '/admin/subscription/checkout-token',
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-Telegram-Init-Data': initData,
          'X-Bookly-Business-Id': businessId,
        },
      }
    );

    const tokenData = await tokenResponse.json().catch(() => null);
    if (!tokenResponse.ok || !tokenData?.token) {
      return null;
    }

    const token = encodeURIComponent(String(tokenData.token));
    const result: BooklyPlanPrices = {
      month: {},
      year: {},
    };

    await Promise.all(
      (['month', 'year'] as const).flatMap((billing) =>
        PLAN_LIMITS.map(async (limit) => {
          const response = await fetch(
            `${api}/payments/external/price?token=${token}&billing=${billing}&limit=${limit}`
          );
          if (!response.ok) return;
          const data = await response.json().catch(() => null);
          if (data && Number.isFinite(Number(data.amount))) {
            result[billing][limit] = Number(data.amount) / 100;
          }
        })
      )
    );

    if (!result.month[10] && !result.year[10]) {
      return null;
    }

    return result;
  } catch (error) {
    console.error('[Bookly] Billing prices lookup failed:', error);
    return null;
  }
}

function installBillingPeriodUi(): void {
  if (window.__booklyBillingPeriodUiInstalled) return;
  window.__booklyBillingPeriodUiInstalled = true;

  let planPrices: BooklyPlanPrices | null = null;
  let priceLoading = false;

  const findInactiveSubscriptionCard = (): HTMLElement | null => {
    const cards = Array.from(
      document.querySelectorAll('.card.subscription')
    ) as HTMLElement[];

    return cards.find((card) => {
      const pill = card.querySelector('.pill');
      return Boolean(pill) && !pill.classList.contains('ok');
    }) || null;
  };

  const getSelectedBilling = (): 'month' | 'year' => {
    try {
      return localStorage.getItem(BILLING_STORAGE_KEY) === 'year'
        ? 'year'
        : 'month';
    } catch {
      return 'month';
    }
  };

  const setSelectedBilling = (billing: 'month' | 'year') => {
    try {
      localStorage.setItem(BILLING_STORAGE_KEY, billing);
    } catch {}
    (window as any).__booklyBillingPeriod = billing;
  };

  const setHeaderPrice = (card: HTMLElement, billing: 'month' | 'year') => {
    if (!planPrices) return;
    const value = planPrices[billing][10];
    if (!Number.isFinite(value)) return;
    const unit = billingTranslations(getUiLanguage())[billing === 'year' ? 'unitYear' : 'unitMonth'];
    const target = card.querySelector('.subscription-head p b');
    if (target) target.textContent = `$${value.toFixed(2)} ${unit}`;
  };

  const updatePackageButtons = (card: HTMLElement, billing: 'month' | 'year') => {
    if (!planPrices) return;

    const tr = billingTranslations(getUiLanguage());
    const unit = billing === 'year' ? tr.unitYear : tr.unitMonth;
    const pricesForPeriod = planPrices[billing];
    const increaseButton = Array.from(card.querySelectorAll('button')).find((button) => {
      const text = (button.textContent || '').toLowerCase();
      return text.includes('лимит') || text.includes('limit') || text.includes('limiti') || text.includes('limite') || text.includes('حد');
    }) as HTMLButtonElement | undefined;

    const section = increaseButton?.parentElement;
    if (!section) return;

    const optionButtons = Array.from(section.querySelectorAll('button')).filter((button) => {
      const text = button.textContent || '';
      return /(?:^|\D)(20|30|50|100)(?:\D|$)/.test(text) && button !== increaseButton;
    });

    for (const button of optionButtons) {
      const match = (button.textContent || '').match(/(?:^|\D)(20|30|50|100)(?:\D|$)/);
      if (!match) continue;
      const limit = Number(match[1]);
      const total = pricesForPeriod[limit];
      const base = pricesForPeriod[10];
      if (!Number.isFinite(total) || !Number.isFinite(base)) continue;

      const addOn = Math.max(0, total - base);
      const divs = Array.from(button.children).filter((node) => node instanceof HTMLElement) as HTMLElement[];
      if (divs.length >= 3) {
        divs[1].textContent = `+$${addOn.toFixed(2)} ${unit}`;
        divs[2].textContent = `${tr.total} $${total.toFixed(2)} ${unit}`;
      }
    }

    const trialCandidates = Array.from(section.querySelectorAll('div')).filter((el) => {
      const text = (el.textContent || '').toLowerCase();
      return text.includes('7') && (text.includes('бесплат') || text.includes('free') || text.includes('bepul') || text.includes('ücretsiz') || text.includes('مجاني'));
    });

    for (const el of trialCandidates) {
      el.style.display = billing === 'year' ? 'none' : '';
    }

    const checkoutButton = Array.from(section.querySelectorAll('button.primary.full'))[0] as HTMLButtonElement | undefined;
    if (checkoutButton) {
      if (!checkoutButton.dataset.booklyMonthLabel) {
        checkoutButton.dataset.booklyMonthLabel = checkoutButton.textContent?.trim() || tr.trial;
      }
      checkoutButton.textContent = billing === 'year'
        ? tr.pay
        : checkoutButton.dataset.booklyMonthLabel;
    }
  };

  const renderToggle = (card: HTMLElement) => {
    if (!planPrices || !planPrices.year[10] || !planPrices.month[10]) return;

    let host = card.querySelector('[data-bookly-billing-toggle]') as HTMLElement | null;
    const increaseButton = Array.from(card.querySelectorAll('button')).find((button) => {
      const text = (button.textContent || '').toLowerCase();
      return text.includes('лимит') || text.includes('limit') || text.includes('limiti') || text.includes('limite') || text.includes('حد');
    }) as HTMLButtonElement | undefined;

    if (!increaseButton?.parentElement) return;

    if (!host) {
      host = document.createElement('div');
      host.dataset.booklyBillingToggle = '1';
      host.style.margin = '18px 0 14px';
      host.style.padding = '4px';
      host.style.borderRadius = '14px';
      host.style.background = '#f1f3f5';
      host.style.display = 'grid';
      host.style.gridTemplateColumns = '1fr 1fr';
      host.style.gap = '4px';

      const monthButton = document.createElement('button');
      const yearButton = document.createElement('button');
      monthButton.type = 'button';
      yearButton.type = 'button';
      monthButton.dataset.billing = 'month';
      yearButton.dataset.billing = 'year';
      monthButton.style.border = '0';
      yearButton.style.border = '0';
      monthButton.style.borderRadius = '10px';
      yearButton.style.borderRadius = '10px';
      monthButton.style.padding = '10px 8px';
      yearButton.style.padding = '10px 8px';
      monthButton.style.fontWeight = '700';
      yearButton.style.fontSize = '14px';
      monthButton.style.font = 'inherit';
      yearButton.style.font = 'inherit';
      monthButton.style.cursor = 'pointer';
      yearButton.style.cursor = 'pointer';

      const applyToggle = (billing: 'month' | 'year') => {
        setSelectedBilling(billing);
        const tr = billingTranslations(getUiLanguage());
        monthButton.textContent = tr.month;
        yearButton.textContent = tr.year;
        monthButton.style.background = billing === 'month' ? '#111' : 'transparent';
        yearButton.style.background = billing === 'year' ? '#111' : 'transparent';
        monthButton.style.color = billing === 'month' ? '#fff' : '#4b5563';
        yearButton.style.color = billing === 'year' ? '#fff' : '#4b5563';
        setHeaderPrice(card, billing);
        updatePackageButtons(card, billing);
      };

      monthButton.onclick = () => applyToggle('month');
      yearButton.onclick = () => applyToggle('year');

      host.appendChild(monthButton);
      host.appendChild(yearButton);
      increaseButton.parentElement.insertBefore(host, increaseButton);
    }

    const monthButton = host.querySelector('[data-billing="month"]') as HTMLButtonElement | null;
    const yearButton = host.querySelector('[data-billing="year"]') as HTMLButtonElement | null;
    if (!monthButton || !yearButton) return;

    const billing = getSelectedBilling();
    const tr = billingTranslations(getUiLanguage());
    monthButton.textContent = tr.month;
    yearButton.textContent = tr.year;
    monthButton.style.background = billing === 'month' ? '#111' : 'transparent';
    yearButton.style.background = billing === 'year' ? '#111' : 'transparent';
    monthButton.style.color = billing === 'month' ? '#fff' : '#4b5563';
    yearButton.style.color = billing === 'year' ? '#fff' : '#4b5563';
    setHeaderPrice(card, billing);
    updatePackageButtons(card, billing);
  };

  const decorate = () => {
    const card = findInactiveSubscriptionCard();
    if (!card) return;

    if (!priceLoading && !planPrices) {
      priceLoading = true;
      loadBooklyPlanPrices().then((data) => {
        planPrices = data;
        priceLoading = false;
        if (planPrices) renderToggle(card);
      }).catch(() => {
        priceLoading = false;
      });
    }

    if (planPrices) renderToggle(card);
  };

  const observer = new MutationObserver(() => decorate());
  observer.observe(document.body, { childList: true, subtree: true });

  const languageSelector = document.querySelector('.language-select') as HTMLSelectElement | null;
  languageSelector?.addEventListener('change', () => {
    const card = findInactiveSubscriptionCard();
    if (card && planPrices) renderToggle(card);
  });

  setTimeout(decorate, 1000);
  setTimeout(decorate, 2500);
}

if (!window.__booklyPaddleEnvBridge) {
  window.__booklyPaddleEnvBridge = true;

  window.__booklyPaddleReady = loadPaddleScript()
    .then(initializePaddle)
    .catch((error) => {
      console.error('[Bookly] Paddle initialization error:', error);
      throw error;
    });
}

setTimeout(installBillingPeriodUi, 1200);

export {};
