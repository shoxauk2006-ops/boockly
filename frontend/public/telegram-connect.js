(function () {
  'use strict';

  var API = 'https://boockly-3.onrender.com';
  var LEGACY_PREFIX = 'bookly_';
  var ACCOUNT_PREFIX = 'bookly-connect-';
  var STAFF_PREFIX = 'staff-connect-';
  var started = false;
  var clicked = false;

  function telegram() {
    return window.Telegram && window.Telegram.WebApp;
  }

  function getStartParam() {
    try {
      var webApp = telegram();
      return String(
        (webApp && webApp.initDataUnsafe && webApp.initDataUnsafe.start_param) ||
        new URLSearchParams(window.location.search).get('startapp') ||
        ''
      ).trim();
    } catch (_) {
      return '';
    }
  }

  function language() {
    try {
      return localStorage.getItem('bookly_language') || 'ru';
    } catch (_) {
      return 'ru';
    }
  }

  function connectStaff(startParam, initData) {
    try {
      if (
        sessionStorage.getItem('bookly_staff_connect_handled') === startParam
      ) {
        return;
      }
    } catch (_) {}

    fetch(
      API + '/staff/connect?token=' + encodeURIComponent(startParam),
      {
        method: 'POST',
        headers: {
          'X-Telegram-Init-Data': initData,
          'X-Bookly-Language': language()
        }
      }
    )
      .then(function (response) {
        return response.json().catch(function () {
          return {};
        }).then(function (data) {
          if (!response.ok) {
            throw new Error(
              data.detail ||
              'Staff Telegram connection failed'
            );
          }
          return data;
        });
      })
      .then(function (data) {
        try {
          sessionStorage.setItem(
            'bookly_staff_connect_handled',
            startParam
          );
          sessionStorage.setItem(
            'bookly_open_staff',
            '1'
          );
          localStorage.setItem(
            'bookly_staff_specialist_id',
            String(data.specialist_id || '')
          );
        } catch (_) {}

        // Reload once so the React home loads the newly connected
        // staff membership and opens the personal staff workspace.
        window.location.reload();
      })
      .catch(function (error) {
        console.error(
          'Bookly staff Telegram connection:',
          error
        );
        started = false;
      });
  }

  function connectAccount(startParam, initData) {
    // Current account connection format.
    if (startParam.indexOf(ACCOUNT_PREFIX) === 0) {
      fetch(API + '/account/connect-telegram-from-web', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-Telegram-Init-Data': initData,
          'X-Bookly-Language': language()
        },
        body: JSON.stringify({ token: startParam })
      })
        .then(function (response) {
          return response.json().catch(function () {
            return {};
          }).then(function (data) {
            if (!response.ok) {
              throw new Error(
                data.detail ||
                'Telegram connection failed'
              );
            }
            return data;
          });
        })
        .then(openAdmin)
        .catch(function (error) {
          console.error(
            'Bookly Telegram connection:',
            error
          );
          started = false;
        });

      return;
    }

    // Legacy connection format kept for older links.
    if (startParam.indexOf(LEGACY_PREFIX) === 0) {
      var token =
        startParam.slice(
          LEGACY_PREFIX.length
        );

      if (!token) {
        started = false;
        return;
      }

      fetch(
        API +
          '/account/connect-telegram-link?token=' +
          encodeURIComponent(token),
        {
          method: 'POST',
          headers: {
            'X-Telegram-Init-Data':
              initData,
            'X-Bookly-Language':
              language()
          }
        }
      )
        .then(function (response) {
          return response.json().catch(function () {
            return {};
          }).then(function (data) {
            if (!response.ok) {
              throw new Error(
                data.detail ||
                'Telegram connection failed'
              );
            }
            return data;
          });
        })
        .then(openAdmin)
        .catch(function (error) {
          console.error(
            'Bookly Telegram connection:',
            error
          );
          started = false;
        });
    }
  }

  function openAdmin(data) {
    try {
      localStorage.setItem(
        'bookly_active_business_id',
        String(data.business_id)
      );
      sessionStorage.setItem(
        'bookly_telegram_connected',
        '1'
      );
    } catch (_) {}

    var timer = setInterval(function () {
      if (clicked) {
        clearInterval(timer);
        return;
      }

      var button =
        document.querySelector(
          '.personal-business-card .personal-white-button'
        );

      if (button) {
        clicked = true;
        clearInterval(timer);

        try {
          button.click();
        } catch (_) {}
      }
    }, 100);

    setTimeout(function () {
      clearInterval(timer);
    }, 15000);
  }

  function connect() {
    if (started) return;

    var startParam = getStartParam();

    if (!startParam) return;

    var isStaff =
      startParam.indexOf(STAFF_PREFIX) === 0;

    var isAccount =
      startParam.indexOf(ACCOUNT_PREFIX) === 0 ||
      startParam.indexOf(LEGACY_PREFIX) === 0;

    if (!isStaff && !isAccount) {
      return;
    }

    started = true;

    var webApp = telegram();

    try {
      webApp && webApp.ready();
    } catch (_) {}

    var initData =
      String(
        (webApp && webApp.initData) || ''
      );

    if (!initData) {
      started = false;
      return;
    }

    if (isStaff) {
      connectStaff(
        startParam,
        initData
      );
      return;
    }

    connectAccount(
      startParam,
      initData
    );
  }

  if (
    document.readyState ===
    'loading'
  ) {
    document.addEventListener(
      'DOMContentLoaded',
      connect,
      { once: true }
    );
  } else {
    connect();
  }
})();
