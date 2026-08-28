declare global {
  interface Window {
    Paddle?: any;
    __booklyPaddleEnvBridge?: boolean;
  }
}

const env = (import.meta.env.VITE_PADDLE_ENV || 'sandbox').trim().toLowerCase();
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
      existing.addEventListener('error', () => reject(new Error('Failed to load Paddle.js')), { once: true });
      return;
    }

    const script = document.createElement('script');
    script.src = 'https://cdn.paddle.com/paddle/v2/paddle.js';
    script.async = true;
    script.onload = () => resolve();
    script.onerror = () => reject(new Error('Failed to load Paddle.js'));

    document.head.appendChild(script);
  });
}

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


function patchPaddle() {
  const paddle = window.Paddle;

  if (!paddle) {
    return false;
  }

  if (!clientToken) {
    throw new Error(
      `Paddle ${env} client token is not configured`
    );
  }

  if (typeof paddle.Environment?.set === 'function') {
    paddle.Environment.set(
      isLive ? 'production' : 'sandbox'
    );
  }

  if (
    !paddle.__booklyInitializeWrapped &&
    typeof paddle.Initialize === 'function'
  ) {
    const originalInitialize =
      paddle.Initialize.bind(paddle);

    paddle.Initialize = (options: any) => {
      const nextOptions = {
        ...(options || {}),
        token: clientToken,
      };

      return originalInitialize(nextOptions);
    };

    paddle.__booklyInitializeWrapped = true;
  }

  return true;
}

if (!window.__booklyPaddleEnvBridge) {
  window.__booklyPaddleEnvBridge = true;

  loadPaddleScript()
    .then(() => {
      patchPaddle();
    })
    .catch((error) => {
      console.error('[Bookly] Paddle script loading error:', error);
    });
}

export {};
