declare global {
  interface Window {
    Paddle?: any;
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

const prices: Record<number, string> = {
  10: isLive
    ? import.meta.env.VITE_PADDLE_LIVE_BOOKLY_BASE_PRICE_ID
    : import.meta.env.VITE_PADDLE_SANDBOX_BOOKLY_BASE_PRICE_ID,
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