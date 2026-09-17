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

export function BusinessForm({onSaved, t}:{onSaved:()=>void; t:(key:string,fallback?:string)=>string}) {
  const [name,setName] = useState('');
  const [loading,setLoading] = useState(false);
  const [error,setError] = useState('');

  const save = async () => {
    setError('');

    const businessName = name.trim();

    if (!businessName) {
      setError(t('owner.enterBusinessName'));
      return;
    }

    setLoading(true);

    try {
      const initData = tg()?.initData || '';

      if (!initData) {
        throw new Error(
          t('owner.telegramInitDataMissing')
        );
      }

      const response = await fetch(API + '/admin/business', {
        method: 'POST',
        headers: {
          ...headers(),
          'Content-Type': 'application/json',
          'X-Telegram-Init-Data': initData
        },
        body: JSON.stringify({
          name: businessName
        })
      });

      const text = await response.text();

      let data:any = null;

      try {
        data = text ? JSON.parse(text) : null;
      } catch {
        data = null;
      }

      if (!response.ok) {
        throw new Error(
          data?.detail ||
          data?.message ||
          `${t('owner.serverError')} ${response.status}`
        );
      }

      onSaved();
    } catch (e:any) {
      console.error('CREATE BUSINESS ERROR:', e);
      setError(e?.message || t('owner.createBusinessError'));
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="card">
      <h2>{t('owner.createBusiness')}</h2>

      <input
        placeholder={t('owner.enterBusinessName')}
        value={name}
        disabled={loading}
        onChange={e=>{
          setName(e.target.value);
          setError('');
        }}
      />

      {error && (
        <div className="error" style={{marginTop:10}}>
          ❌ {error}
        </div>
      )}

      <button
        className="primary full"
        disabled={loading}
        onClick={save}
      >
        {loading ? t('owner.creatingBusiness') : t('owner.createBusiness')}
      </button>
    </div>
  );
}

