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

const originalPriceIds: Record<string, number> = {
  'pri_01m0vqh7n3x8h7da02fpjm3wkd': 10,
  'pri_01m0sy8kj4zw2ag1qe907zhdns': 20,
  'pri_01m11k03qwkt7wygs6w2c1w8bs': 30,
  'pri_01m0mhhh2k5cts13j9h3agt7bj': 50,
  'pri_01m0mhk1wq5brdkew92q3gvk9r': 100,
};

function getConfiguredPrice(limit: number) {
  const priceId = prices[limit];
  if (!priceId) {
    throw new Error(
      `Paddle ${env} Price ID for ${limit} services is not configured`
    );
  }
  return priceId;
}

function patchCheckout() {
  const paddle = window.Paddle;
  if (!paddle?.Checkout?.open || paddle.Checkout.open.__booklyWrapped) {
    return;
  }

  const originalOpen = paddle.Checkout.open.bind(paddle.Checkout);

  const wrappedOpen = (options: any) => {
    if (Array.isArray(options?.items)) {
      const items = options.items.map((item: any) => {
        const limit = originalPriceIds[String(item?.priceId || '')];
        if (!limit) {
          return item;
        }

        return {
          ...item,
          priceId: getConfiguredPrice(limit),
        };
      });

      options = {
        ...options,
        items,
      };
    }

    return originalOpen(options);
  };

  wrappedOpen.__booklyWrapped = true;
  paddle.Checkout.open = wrappedOpen;
}

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

      const result = originalInitialize(nextOptions);
      window.setTimeout(patchCheckout, 0);
      window.setTimeout(patchCheckout, 250);
      return result;
    };

    paddle.__booklyInitializeWrapped = true;
  }

  if (typeof paddle.Environment?.set === 'function') {
    paddle.Environment.set(isLive ? 'production' : 'sandbox');
  }

  patchCheckout();
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
