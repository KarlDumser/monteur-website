export const EU_COUNTRIES = [
  'AT', 'BE', 'BG', 'HR', 'CY', 'CZ', 'DK', 'EE', 'FI', 'FR', 'DE', 'GR', 'HU',
  'IE', 'IT', 'LV', 'LT', 'LU', 'MT', 'NL', 'PL', 'PT', 'RO', 'SK', 'SI', 'ES', 'SE'
];

const COUNTRY_NAME_FALLBACKS = {
  AT: 'Austria',
  BE: 'Belgium',
  BG: 'Bulgaria',
  HR: 'Croatia',
  CY: 'Cyprus',
  CZ: 'Czechia',
  DK: 'Denmark',
  EE: 'Estonia',
  FI: 'Finland',
  FR: 'France',
  DE: 'Germany',
  GR: 'Greece',
  HU: 'Hungary',
  IE: 'Ireland',
  IT: 'Italy',
  LV: 'Latvia',
  LT: 'Lithuania',
  LU: 'Luxembourg',
  MT: 'Malta',
  NL: 'Netherlands',
  PL: 'Poland',
  PT: 'Portugal',
  RO: 'Romania',
  SK: 'Slovakia',
  SI: 'Slovenia',
  ES: 'Spain',
  SE: 'Sweden'
};

export function getCountryDisplayName(countryCode, language = 'en') {
  try {
    const locale = String(language || 'en').split('-')[0];
    const displayNames = new Intl.DisplayNames([locale], { type: 'region' });
    return displayNames.of(countryCode) || COUNTRY_NAME_FALLBACKS[countryCode] || countryCode;
  } catch {
    return COUNTRY_NAME_FALLBACKS[countryCode] || countryCode;
  }
}

export const COUNTRY_ADDRESS_TEMPLATES = {
  DE: {
    streetLabel: 'Strasse & Hausnummer',
    streetPlaceholder: 'z.B. Ottostrasse 8',
    zipLabel: 'PLZ',
    zipPlaceholder: 'z.B. 80331',
    cityLabel: 'Ort',
    cityPlaceholder: 'z.B. Muenchen',
    showStreet2: false,
    showRegion: false
  },
  IE: {
    streetLabel: 'Address Line 1',
    streetPlaceholder: 'e.g. 12 Main Street',
    street2Label: 'Address Line 2 (optional)',
    street2Placeholder: 'e.g. Business Park',
    zipLabel: 'Eircode / Postal Code',
    zipPlaceholder: 'e.g. D02 X285',
    cityLabel: 'Town / City',
    cityPlaceholder: 'e.g. Dublin',
    regionLabel: 'County (optional)',
    regionPlaceholder: 'e.g. County Dublin',
    showStreet2: true,
    showRegion: true
  },
  DEFAULT: {
    streetLabel: 'Street and Number',
    streetPlaceholder: 'e.g. Main Street 12',
    street2Label: 'Address line 2 (optional)',
    street2Placeholder: 'e.g. Building, floor, unit',
    zipLabel: 'Postal Code',
    zipPlaceholder: 'e.g. 1000',
    cityLabel: 'City',
    cityPlaceholder: 'e.g. Brussels',
    regionLabel: 'Region / State (optional)',
    regionPlaceholder: 'e.g. North Holland',
    showStreet2: true,
    showRegion: true
  }
};

const POSTAL_CODE_PATTERNS = {
  AT: /^\d{4}$/,
  BE: /^\d{4}$/,
  BG: /^\d{4}$/,
  HR: /^\d{5}$/,
  CY: /^\d{4}$/,
  CZ: /^\d{3}\s?\d{2}$/,
  DK: /^\d{4}$/,
  EE: /^\d{5}$/,
  FI: /^\d{5}$/,
  FR: /^\d{2}\s?\d{3}$/,
  DE: /^\d{5}$/,
  GR: /^\d{3}\s?\d{2}$/,
  HU: /^\d{4}$/,
  IE: /^(?:[AC-FHKNPRTV-Y]\d{2}|D6W)\s?[0-9AC-FHKNPRTV-Y]{4}$/i,
  IT: /^\d{5}$/,
  LV: /^LV-?\d{4}$/i,
  LT: /^LT-?\d{5}$/i,
  LU: /^L-?\d{4}$/i,
  MT: /^[A-Z]{3}\s?\d{4}$/i,
  NL: /^\d{4}\s?[A-Z]{2}$/i,
  PL: /^\d{2}-?\d{3}$/,
  PT: /^\d{4}-?\d{3}$/,
  RO: /^\d{6}$/,
  SK: /^\d{3}\s?\d{2}$/,
  SI: /^\d{4}$/,
  ES: /^\d{5}$/,
  SE: /^\d{3}\s?\d{2}$/
};

export function getAddressTemplate(countryCode) {
  return COUNTRY_ADDRESS_TEMPLATES[countryCode] || COUNTRY_ADDRESS_TEMPLATES.DEFAULT;
}

export function isPostalCodeValid(countryCode, postalCode) {
  const value = String(postalCode || '').trim();
  const pattern = POSTAL_CODE_PATTERNS[countryCode];

  if (!pattern) {
    return value.length >= 3;
  }

  return pattern.test(value);
}
