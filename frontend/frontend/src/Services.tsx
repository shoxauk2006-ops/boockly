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

export function Services({
  services,
  reload,
  business,
  t
}: {
  services: any[];
  reload: () => Promise<void>;
  business: any;
  t: (key: string, fallback?: string) => string;
}) {
  const [editingId, setEditingId] =
    useState<number | null>(null);

  const [currencySearch, setCurrencySearch] =
    useState('');

  const [businessPhone, setBusinessPhone] =
    useState(business?.phone || '');

  const [businessAddress, setBusinessAddress] =
    useState(business?.address || '');

  const [savingBusiness, setSavingBusiness] =
    useState(false);
  const [savingService, setSavingService] =
  useState(false);

  const serviceFormRef =
  useRef<HTMLDivElement | null>(null);

  const [deletingServiceId, setDeletingServiceId] =
  useState<number | null>(null);

const [f, setF] = useState({
  name: '',
  description: '',
  price: '',
  currency: 'UZS',
  duration_min: ''
});

const durationHours =
  Math.floor(
    Number(f.duration_min || 0) / 60
  );

const durationMinutes =
  Number(f.duration_min || 0) % 60;

  useEffect(() => {
    setBusinessPhone(
      business?.phone || ''
    );

    setBusinessAddress(
      business?.address || ''
    );
  }, [business]);

  const getCurrencyCodes = () => {
    const intlAny = Intl as any;

    if (
      typeof intlAny.supportedValuesOf ===
      'function'
    ) {
      return intlAny.supportedValuesOf(
        'currency'
      );
    }

    return [
      'AED','AFN','ALL','AMD','ARS','AUD',
      'AZN','BAM','BDT','BGN','BHD','BND',
      'BOB','BRL','BYN','CAD','CHF','CLP',
      'CNY','COP','CRC','CZK','DKK','DZD',
      'EGP','EUR','GBP','GEL','GHS','HKD',
      'HUF','IDR','ILS','INR','IQD','ISK',
      'JOD','JPY','KES','KGS','KHR','KRW',
      'KWD','KZT','LAK','LBP','LKR','MAD',
      'MDL','MGA','MKD','MMK','MNT','MOP',
      'MRU','MUR','MXN','MYR','MZN','NAD',
      'NGN','NIO','NOK','NPR','NZD','OMR',
      'PAB','PEN','PHP','PKR','PLN','PYG',
      'QAR','RON','RSD','RUB','SAR','SEK',
      'SGD','SOS','SRD','STN','THB','TJS',
      'TMT','TND','TOP','TRY','TTD','TWD',
      'TZS','UAH','UGX','USD','UYU','UZS',
      'VES','VND','XAF','XCD','XOF','XPF',
      'YER','ZAR','ZMW'
    ];
  };

  const getCurrencyName = (
    code: string
  ) => {
    try {
      const DisplayNames =
        (Intl as any).DisplayNames;

      if (DisplayNames) {
        const names =
          new DisplayNames(
            [getStoredLanguage()],
            {
              type: 'currency'
            }
          );

        return (
          names.of(code) ||
          code
        );
      }
    } catch {}

    return code;
  };

  const getCurrencySymbol = (
    code: string
  ) => {
    try {
      const locale =
        getStoredLanguage() === 'ar'
          ? 'ar'
          : 'en';

      const parts =
        new Intl.NumberFormat(
          locale,
          {
            style: 'currency',
            currency: code,
            currencyDisplay:
              'narrowSymbol'
          }
        ).formatToParts(1);

      return (
        parts.find(
          part =>
            part.type === 'currency'
        )?.value ||
        code
      );
    } catch {
      return code;
    }
  };

  const currencyOptions =
    getCurrencyCodes()
      .map(code => ({
        code,
        name:
          getCurrencyName(code),
        symbol:
          getCurrencySymbol(code)
      }))
      .filter(currency => {
        const q =
          currencySearch
            .trim()
            .toLowerCase();

        if (!q) return true;

        return (
          currency.code
            .toLowerCase()
            .includes(q) ||
          currency.name
            .toLowerCase()
            .includes(q) ||
          currency.symbol
            .toLowerCase()
            .includes(q)
        );
      })
      .sort((a, b) =>
        a.name.localeCompare(
          b.name
        )
      );

  useEffect(() => {
    if (
      currencySearch.trim()
    ) {
      const exactCode =
        currencyOptions.find(
          x =>
            x.code.toLowerCase() ===
            currencySearch
              .trim()
              .toLowerCase()
        );

      if (exactCode) {
        setF(prev => ({
          ...prev,
          currency:
            exactCode.code
        }));
      }
    }
  }, [currencySearch]);

  const resetForm = () => {
    setF({
      name: '',
      description: '',
      price: '',
      currency: 'UZS',
      duration_min: ''
    });

    setCurrencySearch('');
    setEditingId(null);
  };

  const saveBusinessContacts =
    async () => {
      if (!businessPhone.trim()) {
  alert(
    t(
      'owner.enterBusinessPhone',
      'Введите номер телефона бизнеса'
    )
  );
  return;
}

if (!isPhoneValid(businessPhone)) {
  alert(
    t(
      'owner.invalidPhone',
      'Введите корректный номер телефона'
    )
  );
  return;
}
      setSavingBusiness(true);

      try {
        const response =
          await fetch(
            API +
              '/admin/business',
            {
              method: 'PUT',
              headers: headers(),
              body: JSON.stringify({
                name:
                  business?.name || '',
                description:
                  business?.description ||
                  '',
                address:
                  businessAddress.trim(),
                phone:
                  businessPhone.trim(),
                latitude:
                  business?.latitude ??
                  null,
                longitude:
                  business?.longitude ??
                  null
              })
            }
          );

        const data =
          await response
            .json()
            .catch(() => null);

        if (!response.ok) {
          throw new Error(
            data?.detail ||
            t(
              'owner.saveContactsError',
              'Не удалось сохранить контакты'
            )
          );
        }

        alert(
          t(
            'owner.contactsSaved',
            '✅ Настройки сохранены'
          )
        );

        reload();
      } catch (e: any) {
        alert(
          e?.message ||
          t(
            'owner.saveContactsError',
            'Не удалось сохранить настройки'
          )
        );
      } finally {
        setSavingBusiness(false);
      }
    };

  const saveService =
    async () => {
      const name =
        f.name.trim();

      const price =
        Number(f.price);

      const duration =
        Number(f.duration_min);

      if (!name) {
        alert(
          t(
            'owner.invalidServiceName',
            'Введите название услуги'
          )
        );
        return;
      }

      if (
        !Number.isFinite(price) ||
        price < 0
      ) {
        alert(
          t(
            'owner.invalidPrice',
            'Введите корректную цену'
          )
        );
        return;
      }

      if (
        !Number.isInteger(
          duration
        ) ||
        duration <= 0 ||
        duration > 480
      ) {
        alert(
          t(
            'owner.invalidDuration',
            'Длительность должна быть от 1 до 480 минут'
          )
        );
        return;
      }

      setSavingService(true);

      const url =
        editingId
          ? API +
            `/admin/services/${editingId}`
          : API +
            '/admin/services';

      try {
        const response =
          await fetch(
            url,
            {
              method:
                editingId
                  ? 'PATCH'
                  : 'POST',
              headers:
                headers(),
              body:
                JSON.stringify({
                  name,
                  description:
                    f.description.trim(),
                  price,
                  currency:
                    f.currency,
                  duration_min:
                    duration,
                  active: true
                })
            }
          );

        const data =
          await response
            .json()
            .catch(() => null);

        if (!response.ok) {
          alert(
            data?.detail ||
            t(
              'owner.saveServiceError',
              'Не удалось сохранить услугу'
            )
          );
          return;
        }

        resetForm();

await reload();

alert(
  editingId
    ? t(
        'owner.serviceUpdated',
        '✅ Услуга изменена'
      )
    : t(
        'owner.serviceAdded',
        '✅ Услуга добавлена'
      )
);
            } catch (e: any) {
        alert(
          e?.message ||
          t(
            'owner.saveServiceError',
            'Не удалось сохранить услугу'
          )
        );
      } finally {
        setSavingService(false);
      }
    };

  const editService = (
    service: any
  ) => {
    setEditingId(
      service.id
    );

    setF({
      name:
        service.name || '',
      description:
        service.description ||
        '',
      price:
        String(
          service.price
        ),
      currency:
        service.currency ||
        'UZS',
      duration_min:
        String(
          service.duration_min ||
          30
        )
    });

    setCurrencySearch(
      service.currency ||
      'UZS'
    );

    requestAnimationFrame(() => {
  const element =
    serviceFormRef.current;

  if (!element) {
    return;
  }

  const top =
    element.getBoundingClientRect().top +
    window.scrollY -
    16;

  window.scrollTo({
    top,
    behavior: 'smooth'
  });
});
  };

  const remove = async (
  id: number
) => {
  const confirmed =
    await confirmAsync(
      t(
        'owner.confirmDeleteService',
        'Удалить эту услугу?'
      )
    );

  if (!confirmed) {
    return;
  }

  setDeletingServiceId(id);

  try {
    const response =
      await fetch(
        API +
          `/admin/services/${id}`,
        {
          method: 'DELETE',
          headers: headers()
        }
      );

    const data =
      await response
        .json()
        .catch(() => null);

    if (!response.ok) {
      throw new Error(
        data?.detail ||
          t(
            'owner.deleteServiceError',
            'Не удалось удалить услугу'
          )
      );
    }

    await reload();

    alert(
      t(
        'owner.serviceDeleted',
        '✅ Услуга удалена'
      )
    );
  } catch (e: any) {
    alert(
      e?.message ||
        t(
          'owner.deleteServiceError',
          'Не удалось удалить услугу'
        )
    );
  } finally {
    setDeletingServiceId(null);
  }
};

  return (
    <div>

      <div
  className="card"
  ref={serviceFormRef}
>
  <h2>
    {editingId
      ? t('owner.editService')
      : t('owner.addService')}
        </h2>

        <input
          placeholder={
            t('owner.serviceName')
          }
          value={f.name}
          onChange={e =>
            setF({
              ...f,
              name:
                e.target.value
            })
          }
        />

        <input
          placeholder={
            t(
              'owner.serviceDescription'
            )
          }
          value={
            f.description
          }
          onChange={e =>
            setF({
              ...f,
              description:
                e.target.value
            })
          }
        />

        <div className="two">
          <input
            type="number"
            inputMode="decimal"
            min="0"
            step="0.001"
            placeholder={
              t('owner.price')
            }
            value={f.price}
            onChange={e =>
              setF({
                ...f,
                price:
                  e.target.value
              })
            }
          />

          <input
            placeholder={
              t(
                'owner.searchCurrency'
              )
            }
            value={
              currencySearch
            }
            onChange={e =>
              setCurrencySearch(
                e.target.value
              )
            }
          />
        </div>

        <select
          value={f.currency}
          onChange={e =>
            setF({
              ...f,
              currency:
                e.target.value
            })
          }
        >
          {currencyOptions.map(
            currency => (
              <option
                key={
                  currency.code
                }
                value={
                  currency.code
                }
              >
                {currency.code} —{' '}
                {currency.name}{' '}
                ({currency.symbol})
              </option>
            )
          )}
        </select>

<label
  style={{
    display: 'block',
    marginBottom: 8,
    fontWeight: 600
  }}
>
  {t('owner.serviceDuration')}
</label>
        
        <div
  style={{
    display: 'grid',
    gridTemplateColumns: '1fr 1fr',
    gap: 9
  }}
>
  <select
    value={durationHours}
    onChange={e => {
      const hours = Number(
        e.target.value
      );

      setF({
        ...f,
        duration_min: String(
          hours * 60 +
            durationMinutes
        )
      });
    }}
  >
    <option value="0">
      0 {t('owner.hours', 'часов')}
    </option>

    {Array.from(
      { length: 24 },
      (_, i) => i + 1
    ).map(hour => (
      <option
        key={hour}
        value={hour}
      >
        {hour}{' '}
        {hour === 1
          ? t('owner.hourOne', 'час')
          : hour < 5
            ? t('owner.hourFew', 'часа')
            : t('owner.hours', 'часов')}
      </option>
    ))}
  </select>

  <select
    value={durationMinutes}
    onChange={e => {
      const minutes =
        Number(e.target.value);

      setF({
        ...f,
        duration_min: String(
          durationHours * 60 +
            minutes
        )
      });
    }}
  >
    {Array.from(
      { length: 60 },
      (_, i) => i
    ).map(minute => (
      <option
        key={minute}
        value={minute}
      >
        {minute} {t('owner.minutesWord', 'минут')}
      </option>
    ))}
  </select>
</div>

        <div className="two">
          <button
  className="primary full"
  disabled={savingService}
  onClick={saveService}
>
  {savingService ? (
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
    editingId
      ? t(
          'owner.saveChanges',
          'Сохранить изменения'
        )
      : t(
          'owner.addServiceButton',
          'Добавить услугу'
        )
  )}
</button>

          {editingId && (
            <button
              className="full"
              onClick={
                resetForm
              }
            >
              {t('common.cancel')}
            </button>
          )}
        </div>
      </div>

      {services.map(
        service => (
          <div
            className="card row"
            key={service.id}
          >
            <div>
              <b>
                {service.name}
              </b>

              {service.description && (
                <p>
                  {
                    service.description
                  }
                </p>
              )}

              <p>
                {money(
                  service.price,
                  service.currency
                )}{' '}
                ·{' '}
                {
                  service.duration_min
                }{' '}
                {t(
                  'owner.minutes'
                )}
              </p>
            </div>

            <div
              style={{
                display: 'flex',
                gap: 8
              }}
            >
              <button
                onClick={() =>
                  editService(
                    service
                  )
                }
              >
                {t(
                  'owner.edit'
                )}
              </button>

              <button
  className="danger"
  disabled={
    deletingServiceId ===
    service.id
  }
  onClick={() =>
    remove(
      service.id
    )
  }
>
  {deletingServiceId ===
  service.id ? (
    <>
      <span
        style={{
          display: 'inline-block',
          width: 14,
          height: 14,
          border:
            '2px solid rgba(176,0,32,0.25)',
          borderTopColor:
            '#b00020',
          borderRadius: '50%',
          animation:
            'bookly-spin .8s linear infinite',
          marginRight: 8,
          verticalAlign: '-2px'
        }}
      />
      {t('owner.deleting', 'Удаление...')}
    </>
  ) : (
    t(
      'owner.delete'
    )
  )}
</button>
    
            </div>
          </div>
        )
      )}
    </div>
  );
}
