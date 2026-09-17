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

export function Home(p: any) {
  const [savedBusinesses, setSavedBusinesses] =
    useState<any[]>([]);

  const [savedLoading, setSavedLoading] =
    useState(true);

  useEffect(() => {
    const loadSaved =
      async () => {
        if (!initData()) {
          setSavedLoading(false);
          return;
        }

        try {
          const response =
            await fetch(
              API +
                '/my/saved-businesses',
              {
                headers:
                  headers()
              }
            );

          if (!response.ok) {
            setSavedBusinesses([]);
            return;
          }

          const data =
            await response.json();

          setSavedBusinesses(
            Array.isArray(data)
              ? data
              : []
          );

        } catch {
          setSavedBusinesses([]);
        } finally {
          setSavedLoading(false);
        }
      };

    loadSaved();
  }, []);

  return (
    <section>

      <div className="hero">
        <div className="logo">
          B
        </div>

        <h1>
  {p.t('home.title')}
</h1>

        <p>
   {p.t('home.description')}
</p>
      </div>

      <button
  className="primary full"
  onClick={p.onAdmin}
>
  {p.t('home.openAdmin')}
</button>

      <div className="card">

        <h3>
  {p.t('home.openBusiness')}
</h3>

        <input
          placeholder={p.t('home.slugPlaceholder')}
          value={p.slug}
          onChange={e =>
            p.setSlug(
              e.target.value
            )
          }
        />

        <button
  className="full"
  onClick={() =>
    p.open()
  }
>
  {p.t('common.open')}
</button>

      </div>

      <div className="card">

        <h2>
  ❤️ {p.t('client.savedBusinesses')}
</h2>

        {savedLoading ? (
          <p className="muted">
  {p.t('common.loading')}
</p>
        ) : savedBusinesses.length === 0 ? (
          <p className="muted">
  {p.t('home.emptySaved')}
</p>
        ) : (
          <div>
            {savedBusinesses.map(
              business => (
                <div
                  key={business.id}
                  className="card row"
                  style={{
                    marginBottom: 10
                  }}
                >

                  <div>
                    <b>
                      {business.name}
                    </b>

                    {business.address && (
                      <p
                        className="muted"
                        style={{
                          margin:
                            '5px 0 0'
                        }}
                      >
                        📍{' '}
                        {
                          business.address
                        }
                      </p>
                    )}

                    {business.phone && (
                      <p
                        className="muted"
                        style={{
                          margin:
                            '4px 0 0'
                        }}
                      >
                        ☎️{' '}
                        {business.phone}
                      </p>
                    )}
                  </div>

                  <button
  className="primary"
  onClick={() =>
    p.open(
      business.slug
    )
  }
>
  {p.t('common.open')}
</button>

                </div>
              )
            )}
          </div>
        )}

      </div>

    </section>
  );
}
