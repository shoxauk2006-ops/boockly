import React from 'react';
import {
  getCountries,
  getCountryCallingCode,
  parsePhoneNumberFromString,
  type Country
} from 'libphonenumber-js';

type PhoneInputProps = {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
};

const countries = getCountries();

function detectCountry(value: string): Country {
  const phone = parsePhoneNumberFromString(value);

  if (phone?.country) {
    return phone.country;
  }

  return 'US';
}

export default function PhoneInput({
  value,
  onChange,
  placeholder
}: PhoneInputProps) {
  const country = detectCountry(value);

  const handleCountryChange = (
    e: React.ChangeEvent<HTMLSelectElement>
  ) => {
    const newCountry =
      e.target.value as Country;

    const code =
      getCountryCallingCode(newCountry);

    onChange(`+${code}`);
  };

  const handleChange = (
    e: React.ChangeEvent<HTMLInputElement>
  ) => {
    let input = e.target.value;

    if (!input.startsWith('+')) {
      input =
        '+' +
        input.replace(/\D/g, '');
    } else {
      input =
        '+' +
        input
          .slice(1)
          .replace(/\D/g, '');
    }

    onChange(input);
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
        value={country}
        onChange={handleCountryChange}
        style={{
          width: 110,
          flexShrink: 0
        }}
      >
        {countries.map(
          (countryCode) => (
            <option
              key={countryCode}
              value={countryCode}
            >
              +{getCountryCallingCode(
                countryCode
              )}{' '}
              {countryCode}
            </option>
          )
        )}
      </select>

      <input
        type="tel"
        value={value}
        onChange={handleChange}
        placeholder={
          placeholder ||
          '+998 90 123 45 67'
        }
        style={{
          flex: 1
        }}
      />
    </div>
  );
}
