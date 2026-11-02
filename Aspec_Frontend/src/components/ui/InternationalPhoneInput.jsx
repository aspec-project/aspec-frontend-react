import { useState } from 'react'
import {
  AsYouType,
  getCountries,
  getCountryCallingCode,
  parsePhoneNumberFromString,
  validatePhoneNumberLength,
} from 'libphonenumber-js/min'

const regionNames = typeof Intl.DisplayNames === 'function'
  ? new Intl.DisplayNames(['pt-PT'], { type: 'region' })
  : null

const countries = getCountries()
  .map((country) => ({
    country,
    callingCode: `+${getCountryCallingCode(country)}`,
    label: `${regionNames?.of(country) ?? country} (+${getCountryCallingCode(country)})`,
  }))
  .sort((first, second) => first.label.localeCompare(second.label, 'pt-PT'))

function normaliseDigits(value) {
  return String(value ?? '').replace(/[^\d]/g, '')
}

function getInitialCountry(value) {
  const phone = parsePhoneNumberFromString(String(value ?? '').trim())
  return phone?.country && countries.some(({ country }) => country === phone.country)
    ? phone.country
    : 'PT'
}

function getNationalNumber(value, country) {
  const digits = normaliseDigits(value)
  const callingCode = getCountryCallingCode(country)
  return digits.startsWith(callingCode)
    ? digits.slice(callingCode.length)
    : digits
}

/* Impede algarismos a mais sem bloquear a escrita de um número ainda incompleto. */
function limitNationalNumber(value, country) {
  return [...normaliseDigits(value)].reduce((acceptedDigits, digit) => {
    const candidate = `${acceptedDigits}${digit}`
    return validatePhoneNumberLength(candidate, country) === 'TOO_LONG'
      ? acceptedDigits
      : candidate
  }, '')
}

function formatNationalNumber(value, country) {
  return new AsYouType(country).input(value)
}

/*
 * Mantém o valor enviado à API no formato internacional E.164, mas separa
 * visualmente o indicativo para que o membro não tenha de o escrever.
 */
export default function InternationalPhoneInput({
  id,
  name,
  value,
  onChange,
  className,
  style,
  placeholder = '912 345 678',
  autoComplete = 'tel',
}) {
  const [country, setCountry] = useState(() => getInitialCountry(value))
  const nationalNumber = getNationalNumber(value, country)
  const formattedNationalNumber = formatNationalNumber(nationalNumber, country)

  function emitValue(nextCountry, nextNationalNumber) {
    const limitedNationalNumber = limitNationalNumber(nextNationalNumber, nextCountry)

    onChange({
      target: {
        name,
        value: `+${getCountryCallingCode(nextCountry)}${limitedNationalNumber}`,
        type: 'tel',
      },
    })
  }

  return (
    <div className="mt-2 flex gap-2">
      <select
        aria-label="Indicativo telefónico"
        value={country}
        onChange={(event) => {
          setCountry(event.target.value)
          emitValue(event.target.value, nationalNumber)
        }}
        className="w-40 shrink-0 rounded-xl border border-slate-300 bg-white px-3 py-2.5 text-sm text-slate-900 outline-none transition focus:border-[#9b7b45] focus:ring-2 focus:ring-[#9b7b45]/20"
      >
        {countries.map((countryOption) => (
          <option key={countryOption.country} value={countryOption.country}>
            {countryOption.label}
          </option>
        ))}
      </select>

      <input
        id={id}
        name={name}
        type="tel"
        value={formattedNationalNumber}
        onChange={(event) => emitValue(country, event.target.value)}
        maxLength={20}
        autoComplete={autoComplete}
        placeholder={placeholder}
        className={className}
        style={style}
      />
    </div>
  )
}
