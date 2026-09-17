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

export function Hours({
  hours,
  reload,
  t
}: {
  hours: any[];
  reload: () => void;
  t: (key: string, fallback?: string) => string;
}) {
  const days = localizedDays(t);

  const [f, setF] = useState({
    weekday: '0',
    start: '09:00',
    end: '18:00'
  });

  const [savingHours, setSavingHours] =
  useState(false);

  const add = async () => {
  const weekday = Number(f.weekday);

  const existingHours = hours.filter(
    h => h.weekday === weekday
  );

  if (existingHours.length > 0) {
    const dayName =
      days[weekday] || t('owner.thisDay', 'Этот день');

    const currentSchedule =
      existingHours
        .map(
          h =>
            `${h.start.slice(0, 5)}–${h.end.slice(0, 5)}`
        )
        .join(', ');

    alert(
      t('owner.scheduleAlreadyAddedTitle', 'График уже добавлен') + '\n\n' +
      `${dayName}: ${currentSchedule}\n\n` +
      t('owner.scheduleAlreadyAddedHint', 'Чтобы изменить график этого дня, сначала удалите существующий интервал кнопкой ×.')
    );

    return;
  }

  setSavingHours(true);

  try {
    const response = await fetch(
      API + '/admin/hours',
      {
        method: 'POST',
        headers: headers(),
        body: JSON.stringify({
          ...f,
          weekday
        })
      }
    );

    if (!response.ok) {
      throw new Error(
        t('owner.addScheduleError', 'Не удалось добавить график')
      );
    }

    await reload();

    alert(
      t('owner.scheduleAdded', 'График добавлен') + '\n\n' +
      `${days[weekday]}: ${f.start}–${f.end}`
    );
  } catch (e: any) {
    alert(
      e?.message ||
        t('owner.addScheduleError', 'Не удалось добавить график')
    );
  } finally {
    setSavingHours(false);
  }
};
  return (
    <div className="card">
      <h2>
        {t('owner.workSchedule')}
      </h2>

      <p>
        {t('owner.scheduleDescription')}
      </p>

      <div className="two">
        <select
          value={f.weekday}
          onChange={e =>
            setF({
              ...f,
              weekday: e.target.value
            })
          }
        >
          {days.map(
            (x, i) => (
              <option
                value={i}
                key={x}
              >
                {x}
              </option>
            )
          )}
        </select>

        <span />
      </div>

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

      <button
  className="primary full"
  disabled={savingHours}
  onClick={add}
>
  {savingHours ? (
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
    t('owner.addInterval')
  )}
</button>

      {days.map(
        (d, i) => {
          const hs =
            hours.filter(
              h =>
                h.weekday === i
            );

          return (
            <div
              className="dayrow"
              key={d}
            >
              <b>{d}</b>

              <div>
                {hs.length ? (
                  hs.map(
                    h => (
                      <span
                        className="tag"
                        key={h.id}
                      >
                        {h.start.slice(0, 5)}
                        –
                        {h.end.slice(0, 5)}

                        <button
                          onClick={async () => {
                            await fetch(
                              API +
                                `/admin/hours/${h.id}`,
                              {
                                method:
                                  'DELETE',
                                headers:
                                  headers()
                              }
                            );

                            reload();
                          }}
                        >
                          ×
                        </button>
                      </span>
                    )
                  )
                ) : (
                  <span className="muted">
                    {t('owner.dayOff')}
                  </span>
                )}
              </div>
            </div>
          );
        }
      )}
    </div>
  );
}

