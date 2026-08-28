declare global {
  interface Window {
    Paddle?: any;
    __booklyPaddleEnvBridge?: boolean;
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

  if (!paddle.__booklyInitializeWrapped && typeof paddle.Initialize === 'function') {
    const originalInitialize = paddle.Initialize.bind(paddle);

    paddle.Initialize = (options: any) => {
      const nextOptions = {
        ...(options || {}),
        token: clientToken,
      };

            return originalInitialize(nextOptions);
    };

    paddle.__booklyInitializeWrapped = true;
  }

  if (typeof paddle.Environment?.set === 'function') {
    paddle.Environment.set(isLive ? 'production' : 'sandbox');
  }

    return true;
}

if (!window.__booklyPaddleEnvBridge) {
  window.__booklyPaddleEnvBridge = true;

  let attempts = 0;
  const timer = window.setInterval(() => {
    attempts += 1;

    try {
      if (patchPaddle() || attempts >= 200) {
        window.clearInterval(timer);
      }
    } catch (error) {
      console.error('[Bookly] Paddle configuration error:', error);
      window.clearInterval(timer);
    }
  }, 50);
}

export {};
