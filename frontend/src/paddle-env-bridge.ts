declare global {
  interface Window {
    Paddle?: any;
    Telegram?: any;
    __booklyPaddleEnvBridge?: boolean;
    __booklyPaddleReady?: Promise<void>;
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

  // Paddle requires sandbox to be selected before Initialize().
  // Production is the default environment for live accounts.
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

if (!window.__booklyPaddleEnvBridge) {
  window.__booklyPaddleEnvBridge = true;

  window.__booklyPaddleReady = loadPaddleScript()
    .then(initializePaddle)
    .catch((error) => {
      console.error('[Bookly] Paddle initialization error:', error);
      throw error;
    });
}

export {};
