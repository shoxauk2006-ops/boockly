import React,{useEffect,useMemo,useRef,useState} from 'react';
import {
  Language,
  SUPPORTED_LANGUAGES,
  createTranslator,
  getStoredLanguage,
  setStoredLanguage,
  applyLanguageDirection,
} from './i18n';
import PhoneInput, {
  isPhoneValid
} from './PhoneInput';
import QRCode from 'qrcode';
import Specialists from './Specialists';
import { BooklyAlertModal, BooklyConfirmModal } from './modals';
import {
  API,
  BOT_USERNAME,
  tg,
  confirmAsync,
  initData,
  getClientTimeZone,
  getClientLocalDateKey,
  getDateKeyForTimeZone,
  formatUtcForTimeZone,
  headers,
  LOCALE_MAP,
  getLocale,
  money,
  localizedDays,
  TIMEZONE_OPTIONS,
  ALL_TIMEZONES,
  getTimeZoneLabel,
  getTimeZoneOffsetMinutes,
  formatGMTOffset,
  TIMEZONE_BY_OFFSET
} from './shared';

export function QrPrintCard({
  business,
  qrDataUrl,
  open,
  onClose,
  t
}: {
  business: any;
  qrDataUrl: string;
  open: boolean;
  onClose: () => void;
  t: (key: string, fallback?: string) => string;
}) {
  if (!open || !qrDataUrl) {
    return null;
  }

  const downloadPrintableQr = async () => {
  if (!qrDataUrl) {
    return;
  }

  try {
    const canvas =
      document.createElement('canvas');

    const width = 1600;
    const height = 2200;

    canvas.width = width;
    canvas.height = height;

    const ctx =
      canvas.getContext('2d');

    if (!ctx) {
      return;
    }

    ctx.fillStyle = '#ffffff';

    ctx.fillRect(
      0,
      0,
      width,
      height
    );

    const qrImage =
      new Image();

    await new Promise<void>(
      (resolve, reject) => {
        qrImage.onload = () => {
          resolve();
        };

        qrImage.onerror = () => {
          reject(
            new Error(
              'QR image failed to load'
            )
          );
        };

        qrImage.src =
          qrDataUrl;
      }
    );

    const businessName =
      String(
        business?.name ||
        t(
          'owner.businessNameFallback',
          'Ваш бизнес'
        )
      );

    ctx.textAlign =
      'center';

    ctx.fillStyle = '#111';

    ctx.font =
      '900 72px Arial';

    ctx.fillText(
      'BOOKLY',
      width / 2,
      180
    );

    ctx.font =
      '800 62px Arial';

    ctx.fillText(
      businessName,
      width / 2,
      320
    );

    ctx.fillStyle = '#777';

    ctx.font =
      '500 34px Arial';

    ctx.fillText(
      t(
        'owner.onlineBooking',
        'Онлайн-запись'
      ),
      width / 2,
      385
    );

    const cardX = 150;
    const cardY = 500;
    const cardW = 1300;
    const cardH = 1300;

    ctx.fillStyle = '#fff';
    ctx.strokeStyle = '#e5e7eb';
    ctx.lineWidth = 4;

    ctx.beginPath();

    ctx.roundRect(
      cardX,
      cardY,
      cardW,
      cardH,
      45
    );

    ctx.fill();
    ctx.stroke();

    const qrSize = 1050;

    const qrX =
      (width - qrSize) / 2;

    const qrY =
      cardY + 125;

    ctx.drawImage(
      qrImage,
      qrX,
      qrY,
      qrSize,
      qrSize
    );

    ctx.fillStyle = '#111';

    ctx.font =
      '800 58px Arial';

    ctx.fillText(
      t(
        'owner.bookOnline',
        'Запишитесь онлайн'
      ),
      width / 2,
      1910
    );

    ctx.fillStyle = '#707780';

    ctx.font =
      '500 34px Arial';

    ctx.fillText(
      t(
        'owner.scanQr',
        'Отсканируйте QR-код'
      ),
      width / 2,
      1970
    );

    ctx.fillText(
      t(
        'owner.phoneCamera',
        'камерой телефона'
      ),
      width / 2,
      2025
    );

    ctx.fillStyle =
      '#a0a5ab';

    ctx.font =
      '700 24px Arial';

    ctx.fillText(
      'POWERED BY BOOKLY',
      width / 2,
      2135
    );

    const blob =
      await new Promise<Blob>(
        (resolve, reject) => {
          canvas.toBlob(
            value => {
              if (value) {
                resolve(value);
              } else {
                reject(
                  new Error(
                    'Failed to create printable QR image'
                  )
                );
              }
            },
            'image/png',
            1
          );
        }
      );

    const file =
      new File(
        [blob],
        `${business?.slug || 'bookly'}-qr-print.png`,
        {
          type: 'image/png'
        }
      );

    if (
      navigator.share &&
      navigator.canShare &&
      navigator.canShare({
        files: [file]
      })
    ) {
      await navigator.share({
        files: [file],
        title: t(
          'owner.printQrTitle',
          'Bookly — QR для печати'
        )
      });

      return;
    }

    const url =
      URL.createObjectURL(blob);

    const link =
      document.createElement('a');

    link.href = url;

    link.download =
      `${business?.slug || 'bookly'}-qr-print.png`;

    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);

    setTimeout(() => {
      URL.revokeObjectURL(url);
    }, 1000);

  } catch (error) {
    console.error(
      'QR PRINT DOWNLOAD ERROR:',
      error
    );

    alert(
      t(
        'owner.qrPrintError',
        'Не удалось скачать макет'
      )
    );
  }
};

  return (
    <div
      className="qr-print-overlay"
      onClick={onClose}
    >
      <div
        className="qr-print-modal"
        onClick={(e) =>
          e.stopPropagation()
        }
      >
        <button
          type="button"
          className="subscription-modal-close"
          onClick={onClose}
        >
          ×
        </button>

        <div className="qr-print-sheet">
          <div className="qr-print-brand">
            BOOKLY
          </div>

          <h2>
            {business?.name || t('owner.businessNameFallback', 'Ваш бизнес')}
          </h2>

          <p>
  {t(
    'owner.onlineBooking',
    'Онлайн-запись'
  )}
</p>

          <div className="qr-print-code">
            <img
              src={qrDataUrl}
              alt="QR-код для записи"
            />
          </div>

          <h3>
  {t(
    'owner.bookOnline',
    'Запишитесь онлайн'
  )}
</h3>

          <span>
  {t(
    'owner.scanQr',
    'Отсканируйте QR-код'
  )}
  {' '}
  {t(
    'owner.phoneCamera',
    'камерой телефона'
  )}
</span>

          <small>
            powered by Bookly
          </small>
        </div>

        <button
  type="button"
  className="primary full"
  onClick={downloadPrintableQr}
>
  {t(
    'owner.saveLayout',
    'Скачать макет'
  )}
</button>
      </div>
    </div>
  );
}

