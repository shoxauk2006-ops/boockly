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

export function MapPicker({
  latitude,
  longitude,
  onSelect,
  onClose,
  t
}: {
  latitude: number | null;
  longitude: number | null;
  onSelect: (
    lat: number,
    lng: number,
    address?: string
  ) => void;
  onClose: () => void;
  t: (
    key: string,
    fallback?: string
  ) => string;
}) {
  const mapRef =
    useRef<HTMLDivElement | null>(null);

  const mapInstanceRef =
    useRef<any>(null);

  const markerRef =
    useRef<any>(null);

  const selectedRef =
    useRef<{
      lat: number;
      lng: number;
      address?: string;
    } | null>(
      latitude != null &&
        longitude != null
        ? {
            lat: latitude,
            lng: longitude
          }
        : null
    );

  const [selected, setSelected] =
    useState<{
      lat: number;
      lng: number;
      address?: string;
    } | null>(
      selectedRef.current
    );

  const [loading, setLoading] =
    useState(true);

  const locateMe = () => {
  if (!navigator.geolocation) {
    alert(
      t(
        'settings.locationUnavailable',
        'Геолокация недоступна на этом устройстве.'
      )
    );
    return;
  }

  navigator.geolocation.getCurrentPosition(
    async position => {
      const lat = position.coords.latitude;
      const lng = position.coords.longitude;

      const map = mapInstanceRef.current;
      const L = (window as any).L;

      if (!map || !L) {
        return;
      }

      if (!markerRef.current) {
        markerRef.current = L.marker(
          [lat, lng],
          {
            draggable: true
          }
        ).addTo(map);
      } else {
        markerRef.current.setLatLng([
          lat,
          lng
        ]);
      }

      map.setView(
        [lat, lng],
        18
      );

      const next = {
        lat,
        lng
      };

      selectedRef.current = next;
      setSelected(next);

      try {
        const response = await fetch(
          `https://nominatim.openstreetmap.org/reverse?format=jsonv2&lat=${encodeURIComponent(lat)}&lon=${encodeURIComponent(lng)}&accept-language=${encodeURIComponent(getStoredLanguage())}`
        );

        const data =
          await response.json();

        if (data?.display_name) {
          const withAddress = {
            lat,
            lng,
            address:
              data.display_name
          };

          selectedRef.current =
            withAddress;

          setSelected(
            withAddress
          );
        }
      } catch {}
    },
    error => {
      console.error(
        'BOOKLY GEOLOCATION ERROR:',
        error
      );

      alert(
        t(
          'settings.locationPermissionError',
          'Не удалось определить местоположение. Разрешите доступ к геолокации и попробуйте снова.'
        )
      );
    },
    {
      enableHighAccuracy: true,
      timeout: 10000,
      maximumAge: 30000
    }
  );
};

  useEffect(() => {
    let cancelled = false;

    const loadLeaflet = () =>
      new Promise<void>(
        (resolve, reject) => {
          if ((window as any).L) {
            resolve();
            return;
          }

          const existing =
            document.querySelector(
              'script[data-bookly-leaflet]'
            ) as
              | HTMLScriptElement
              | null;

          if (existing) {
            existing.addEventListener(
              'load',
              () => resolve(),
              { once: true }
            );

            existing.addEventListener(
              'error',
              () =>
                reject(
                  new Error(
                    'Leaflet failed'
                  )
                ),
              { once: true }
            );

            return;
          }

          const link =
            document.createElement(
              'link'
            );

          link.rel = 'stylesheet';
          link.href =
            'https://unpkg.com/leaflet@1.9.4/dist/leaflet.css';
          link.dataset.booklyLeaflet =
            '1';

          document.head.appendChild(link);

          const script =
            document.createElement(
              'script'
            );

          script.src =
            'https://unpkg.com/leaflet@1.9.4/dist/leaflet.js';
          script.async = true;
          script.dataset.booklyLeaflet =
            '1';

          script.onload = () =>
            resolve();

          script.onerror = () =>
            reject(
              new Error(
                'Leaflet failed'
              )
            );

          document.body.appendChild(
            script
          );
        }
      );

    const init = async () => {
      try {
        await loadLeaflet();

        if (
          cancelled ||
          !mapRef.current
        ) {
          return;
        }

        const L = (window as any).L;

        const defaultLat =
          latitude ?? 41.3111;

        const defaultLng =
          longitude ?? 69.2797;

        const map = L.map(
          mapRef.current
        ).setView(
          [
            defaultLat,
            defaultLng
          ],
          latitude != null &&
            longitude != null
            ? 16
            : 12
        );

        mapInstanceRef.current =
          map;

        L.tileLayer(
          'https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png',
          {
            attribution:
              '&copy; OpenStreetMap contributors'
          }
        ).addTo(map);

                const updatePoint = async (
          lat: number,
          lng: number
        ) => {
          if (!markerRef.current) {
            markerRef.current =
              L.marker(
                [lat, lng],
                {
                  draggable: true
                }
              ).addTo(map);

            markerRef.current.on(
              'dragend',
              () => {
                const point =
                  markerRef.current.getLatLng();

                void updatePoint(
                  point.lat,
                  point.lng
                );
              }
            );
          } else {
            markerRef.current.setLatLng(
              [lat, lng]
            );
          }

          map.panTo([
            lat,
            lng
          ]);

          const next = {
            lat,
            lng
          };

          selectedRef.current =
            next;

          setSelected(next);

          try {
            const response =
              await fetch(
                `https://nominatim.openstreetmap.org/reverse?format=jsonv2&lat=${encodeURIComponent(lat)}&lon=${encodeURIComponent(lng)}&accept-language=${encodeURIComponent(getStoredLanguage())}`
              );

            const data =
              await response.json();

            if (
              data?.display_name &&
              !cancelled
            ) {
              const withAddress = {
                lat,
                lng,
                address:
                  data.display_name
              };

              selectedRef.current =
                withAddress;

              setSelected(
                withAddress
              );
            }
          } catch {}
        };

        const locateMe = () => {
          if (!navigator.geolocation) {
            alert(
              t(
                'settings.locationUnavailable',
                'Геолокация недоступна на этом устройстве.'
              )
            );
            return;
          }

          navigator.geolocation.getCurrentPosition(
            position => {
              void updatePoint(
                position.coords.latitude,
                position.coords.longitude
              );

              map.setZoom(18);
            },
            error => {
              console.error(
                'BOOKLY GEOLOCATION ERROR:',
                error
              );

              alert(
                t(
                  'settings.locationPermissionError',
                  'Не удалось определить местоположение. Разрешите доступ к геолокации и попробуйте снова.'
                )
              );
            },
            {
              enableHighAccuracy: true,
              timeout: 10000,
              maximumAge: 30000
            }
          );
        };

        if (
          latitude != null &&
          longitude != null
        ) {
          markerRef.current =
            L.marker(
              [
                latitude,
                longitude
              ],
              {
                draggable: true
              }
            ).addTo(map);

          markerRef.current.on(
            'dragend',
            () => {
              const point =
                markerRef.current.getLatLng();

              void updatePoint(
                point.lat,
                point.lng
              );
            }
          );
        }

        map.on(
          'click',
          (event: any) =>
            void updatePoint(
              event.latlng.lat,
              event.latlng.lng
            )
        );

        setLoading(false);

        setTimeout(() => {
          map.invalidateSize();
        }, 100);
      } catch (error) {
        console.error(
          'MAP PICKER ERROR:',
          error
        );

        setLoading(false);
      }
    };

    void init();

    return () => {
      cancelled = true;

      if (
        mapInstanceRef.current
      ) {
        mapInstanceRef.current.remove();
        mapInstanceRef.current =
          null;
      }

      markerRef.current = null;
    };
  }, []);

  const confirm = () => {
    if (
      selectedRef.current
    ) {
      onSelect(
        selectedRef.current.lat,
        selectedRef.current.lng,
        selectedRef.current
          .address
      );
    }

    onClose();
  };

  return (
    <div
      className="subscription-modal-overlay"
      onClick={onClose}
    >
      <div
        className="subscription-modal"
        onClick={e =>
          e.stopPropagation()
        }
        style={{
          maxWidth: 620
        }}
      >
        <button
          type="button"
          className="subscription-modal-close"
          onClick={onClose}
        >
          ×
        </button>

        <span className="personal-eyebrow">
          BOOKLY
        </span>

        <h2>
          {t(
            'owner.mapSelectAddress',
            'Выберите адрес на карте'
          )}
        </h2>

        <p className="muted">
          {t(
            'owner.mapSelectAddressHint',
            'Нажмите на карту или перетащите метку в нужное место.'
          )}
        </p>
        <button
  type="button"
  className="ghost full"
  onClick={locateMe}
  style={{
    marginTop: 12,
    marginBottom: 4
  }}
>
  ◎ {t(
    'owner.detectLocation',
    'Определить моё местоположение'
  )}
</button>

        <div
          ref={mapRef}
          style={{
            width: '100%',
            height: 360,
            borderRadius: 14,
            overflow: 'hidden',
            marginTop: 12,
            background: '#eee'
          }}
        />

        {loading && (
          <p
            className="muted"
            style={{
              marginTop: 10
            }}
          >
            {t(
              'common.loading',
              'Загрузка…'
            )}
          </p>
        )}

        {selected && (
          <p
            className="muted"
            style={{
              marginTop: 10
            }}
          >
            {selected.address ||
              `${selected.lat.toFixed(
                6
              )}, ${selected.lng.toFixed(
                6
              )}`}
          </p>
        )}

        <div
          style={{
            display: 'grid',
            gridTemplateColumns:
              '1fr 1fr',
            gap: 8,
            marginTop: 14
          }}
        >
          <button
            type="button"
            onClick={onClose}
          >
            {t(
              'common.cancel',
              'Отмена'
            )}
          </button>

          <button
            type="button"
            className="primary"
            disabled={!selected}
            onClick={confirm}
          >
            {t(
              'common.confirm',
              'Готово'
            )}
          </button>
        </div>
      </div>
    </div>
  );
}
