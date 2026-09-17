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

export function Blocks({
  blocks,
  reload,
  t,
  business
}: {
  blocks: any[];
  reload: () => Promise<void>;
  t: (key: string, fallback?: string) => string;
  business: any;
}) {
  const [f, setF] = useState({
    day: getDateKeyForTimeZone(business?.timezone || 'Asia/Tashkent'),
    start: '13:00',
    end: '15:00',
    reason: ''
  });
  
const [savingBlock, setSavingBlock] =
  useState(false);

  const [deletingBlockId, setDeletingBlockId] =
  useState<number | null>(null);
  
  const [currentTime, setCurrentTime] =
  useState(new Date());

useEffect(() => {
  const timer = window.setInterval(() => {
    setCurrentTime(new Date());
  }, 30000);

  return () => {
    window.clearInterval(timer);
  };
}, []);
  
  const isBlockPast = (block: any) => {
    if (block?.end_at_utc) {
      try {
        return new Date(`${block.end_at_utc}Z`) < currentTime;
      } catch {}
    }

    const endTime = new Date(`${block.day}T${block.end.slice(0, 8)}`);
    return endTime < currentTime;
  };
  
  const add = async () => {
  setSavingBlock(true);

  try {
    await fetch(
      API + '/admin/blocks',
      {
        method: 'POST',
        headers: headers(),
       body: JSON.stringify({
  day: f.day,
  start: f.start,
  end: f.end,
  reason: f.reason
})
      }
    );

    await reload();
    
    alert(t('owner.blockAdded', 'Блокировка добавлена'));
  } finally {
    setSavingBlock(false);
  }
};

  return (
    <div className="card">
      <h2>
        {t('owner.timeBlocks')}
      </h2>

      <p>
        {t('owner.blocksDescription')}
      </p>

      <input
        type="date"
        value={f.day}
        onChange={e =>
          setF({
            ...f,
            day: e.target.value
          })
        }
      />

      <div className="two">
        <input
          type="time"
          value={f.start}
          onChange={e =>
            setF({
              ...f,
              start: e.target.value
            })
          }
        />

        <input
          type="time"
          value={f.end}
          onChange={e =>
            setF({
              ...f,
              end: e.target.value
            })
          }
        />
      </div>

      <input
        placeholder={t('owner.reasonOptional')}
        value={f.reason}
        onChange={e =>
          setF({
            ...f,
            reason: e.target.value
          })
        }
      />

      <button
  className="primary full"
  disabled={savingBlock}
  onClick={add}
>
  {savingBlock ? (
    <>
      <span
        style={{
          display: 'inline-block',
          width: 14,
          height: 14,
          border: '2px solid rgba(255,255,255,0.35)',
          borderTopColor: '#fff',
          borderRadius: '50%',
          animation: 'bookly-spin .8s linear infinite',
          marginRight: 8,
          verticalAlign: '-2px'
        }}
      />
      {t('owner.saving', 'Сохранение...')}
    </>
  ) : (
    t('owner.blockTime')
  )}
</button>

      {blocks.map(
        b => (
          <div
  className="row line"
  key={b.id}
  style={{
    opacity: isBlockPast(b) ? 0.55 : 1
  }}
>
            <div>
              <b>
                {b.day}
              </b>

              <p>
  {b.start.slice(0, 5)}
  –
  {b.end.slice(0, 5)}

  {b.reason &&
    ` · ${b.reason}`}

  {isBlockPast(b) && (
    <span
      style={{
        marginLeft: 8,
        fontSize: 12,
        fontWeight: 600,
        opacity: 0.8
      }}
    >
      ✓ Прошедшее
    </span>
  )}
</p>
            </div>

            <button
  className="danger"
  disabled={deletingBlockId === b.id}
  onClick={async () => {
    setDeletingBlockId(b.id);

    try {
      const response =
        await fetch(
          API +
            `/admin/blocks/${b.id}`,
          {
            method: 'DELETE',
            headers: headers()
          }
        );

      if (!response.ok) {
        throw new Error(
  t(
    'owner.deleteBlockError',
    'Не удалось удалить блокировку'
  )
);
      }

      await reload();

      alert(
  t(
    'owner.blockDeleted',
    'Блокировка удалена'
  )
);
    } catch (e: any) {
      alert(
        e?.message ||
  t(
    'owner.deleteBlockError',
    'Не удалось удалить блокировку'
  )
      );
    } finally {
      setDeletingBlockId(null);
    }
  }}
>
  {deletingBlockId === b.id ? (
    <span
      style={{
        display: 'inline-block',
        width: 14,
        height: 14,
        border: '2px solid rgba(211,47,47,0.25)',
        borderTopColor: '#d32f2f',
        borderRadius: '50%',
        animation:
          'bookly-spin .8s linear infinite'
      }}
    />
  ) : (
    '×'
  )}
</button>
          </div>
        )
      )}
    </div>
  );
}

