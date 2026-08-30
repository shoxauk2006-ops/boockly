import React, { useEffect, useMemo, useRef, useState } from 'react';
import {
  getCountries,
  getCountryCallingCode,
  formatIncompletePhoneNumber,
  type Country
} from 'libphonenumber-js';
import { isValidPhoneNumber } from 'libphonenumber-js/max';

type PhoneInputProps = {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  onValidityChange?: (valid: boolean) => void;
};

const countries = getCountries();

const TIMEZONE_COUNTRY: Record<string, Country> = {
  'Asia/Tashkent': 'UZ',
  'Asia/Almaty': 'KZ',
  'Asia/Bishkek': 'KG',
  'Asia/Dhaka': 'BD',
  'Asia/Karachi': 'PK',
  'Asia/Kolkata': 'IN',
  'Asia/Dubai': 'AE',
  'Asia/Riyadh': 'SA',
  'Asia/Tehran': 'IR',
  'Asia/Baghdad': 'IQ',
  'Asia/Jerusalem': 'IL',
  'Asia/Baku': 'AZ',
  'Asia/Tbilisi': 'GE',
  'Europe/Moscow': 'RU',
  'Europe/Istanbul': 'TR',
  'Europe/Kyiv': 'UA',
  'Europe/Kiev': 'UA',
  'Europe/Berlin': 'DE',
  'Europe/Paris': 'FR',
  'Europe/London': 'GB',
  'Europe/Rome': 'IT',
  'Europe/Madrid': 'ES',
  'Africa/Cairo': 'EG',
  'Africa/Johannesburg': 'ZA',
  'America/New_York': 'US',
  'America/Chicago': 'US',
  'America/Denver': 'US',
  'America/Los_Angeles': 'US',
  'America/Toronto': 'CA',
  'America/Sao_Paulo': 'BR',
  'Australia/Sydney': 'AU',
  'Pacific/Auckland': 'NZ'
};

function detectDeviceCountry(): Country {
  try {
    const language =
      typeof navigator !== 'undefined'
        ? navigator.language || ''
        : '';

    const region =
      language.match(/[-_]([A-Z]{2})$/i)?.[1]?.toUpperCase();

    if (
      region &&
      countries.includes(region as Country)
    ) {
      return region as Country;
    }

    const timezone =
      Intl.DateTimeFormat().resolvedOptions().timeZone;

    const timezoneCountry =
      TIMEZONE_COUNTRY[timezone];

    if (timezoneCountry) {
      return timezoneCountry;
    }
  } catch {
    // Fall through to a neutral fallback.
  }

  return 'US';
}

function detectCountry(value: string): Country {
  if (value) {
    const digits = value.replace(/\D/g, '');

    for (const country of countries) {
      const code = getCountryCallingCode(country);
      if (digits.startsWith(code)) {
        return country;
      }
    }
  }

  return detectDeviceCountry();
}

function getCountryName(country: Country): string {
  try {
    const locale =
      typeof navigator !== 'undefined'
        ? navigator.language || 'en-US'
        : 'en-US';

    const DisplayNamesCtor =
      (Intl as any).DisplayNames;

    if (DisplayNamesCtor) {
      return (
        new DisplayNamesCtor([locale], {
          type: 'region'
        }).of(country) || country
      );
    }
  } catch {
    // Use ISO code as fallback.
  }

  return country;
}

function flag(country: Country): string {
  return country
    .split('')
    .map(
      char =>
        String.fromCodePoint(
          127397 + char.charCodeAt(0)
        )
    )
    .join('');
}

export function isPhoneValid(value: string): boolean {
  if (!value) {
    return false;
  }

  try {
    return isValidPhoneNumber(value);
  } catch {
    return false;
  }
}

export default function PhoneInput({
  value,
  onChange,
  placeholder,
  onValidityChange
}: PhoneInputProps) {
  const [selectedCountry, setSelectedCountry] =
    useState<Country>(() => detectCountry(value));

  const countryChangedByUser = useRef(false);
  const lastEmittedValue = useRef(value);

  useEffect(() => {
    if (
      countryChangedByUser.current ||
      value === lastEmittedValue.current
    ) {
      return;
    }

    if (value) {
      setSelectedCountry(detectCountry(value));
    }
  }, [value]);

  const countryCode =
    getCountryCallingCode(selectedCountry);

  const nationalValue = useMemo(() => {
    if (!value) {
      return '';
    }

    const digits = value.replace(/\D/g, '');
    const codeDigits = String(countryCode);

    let nationalDigits = digits;

    if (digits.startsWith(codeDigits)) {
      nationalDigits = digits.slice(codeDigits.length);
    }

    return formatIncompletePhoneNumber(
      nationalDigits,
      selectedCountry
    );
  }, [value, selectedCountry, countryCode]);

  const valid = isPhoneValid(value);

  useEffect(() => {
    onValidityChange?.(valid);
  }, [valid, onValidityChange]);

  const handleCountryChange = (
    e: React.ChangeEvent<HTMLSelectElement>
  ) => {
    const newCountry =
      e.target.value as Country;

    const nationalDigits =
      nationalValue.replace(/\D/g, '');

    countryChangedByUser.current = true;
    setSelectedCountry(newCountry);

    const newCountryCode =
      getCountryCallingCode(newCountry);

    const nextValue = nationalDigits
      ? `+${newCountryCode}${nationalDigits}`
      : '';

    lastEmittedValue.current = nextValue;
    onChange(nextValue);
  };

  const handleChange = (
    e: React.ChangeEvent<HTMLInputElement>
  ) => {
    const digits =
      e.target.value.replace(/\D/g, '');

    const nextValue = digits
      ? `+${countryCode}${digits}`
      : '';

    lastEmittedValue.current = nextValue;
    onChange(nextValue);
  };

  return (
    <div
      style={{
        display: 'flex',
        gap: 8,
        width: '100%'
      }}
    >
      <select
        value={selectedCountry}
        onChange={handleCountryChange}
        aria-label="Country"
        style={{
          width: 150,
          flexShrink: 0
        }}
      >
        {countries.map(country => (
          <option
            key={country}
            value={country}
          >
            {flag(country)} {getCountryName(country)}
          </option>
        ))}
      </select>

      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          flex: 1,
          minWidth: 0,
          border: '1px solid #ddd',
          borderRadius: 12,
          background: '#fff'
        }}
      >
        <span
          style={{
            paddingLeft: 12,
            color: '#666',
            fontWeight: 600,
            whiteSpace: 'nowrap'
          }}
        >
          +{countryCode}
        </span>

        <input
          type="tel"
          inputMode="tel"
          value={nationalValue}
          onChange={handleChange}
          placeholder={
            placeholder ||
            'Номер телефона'
          }
          autoComplete="tel"
          aria-invalid={value.length > 0 && !valid}
          style={{
            flex: 1,
            minWidth: 0,
            border: 'none',
            outline: 'none',
            background: 'transparent',
            paddingLeft: 6
          }}
        />
      </div>
    </div>
  );
}
