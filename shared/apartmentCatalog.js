export const APARTMENT_OPTIONS = {
  hackerberg: {
    key: 'hackerberg',
    label: 'Hackerberg - Penthouse',
    address: 'Hackerberg 4, D-82152 Krailling',
    rooms: '2,5 Zimmer',
    area: '65 m2',
    description: '2-Zimmer-Penthouse mit grossem Balkon, Kueche, Bad und Panoramablick.',
    details: 'Eigener Zugang, voll ausgestattete Kueche sowie Bad mit Wanne und Dusche.',
    features: [
      'Waschmaschine mit Trockner im Keller',
      '2 Einzelbetten im 1. Zimmer, 2 Einzelbetten im 2. Zimmer (eines Queen-Size)',
      'WLAN 150 Mbit/s',
      'Sat-TV',
      'Parkplaetze direkt vor dem Haus',
      'Ruhige Wohnlage',
      'Naehe zu Biergarten, Naturbadesee, Geschaeften und Banken'
    ],
    folder: 'Wohnung-Hackerberg',
    images: [
      'Wohnzimmer.JPG',
      'Bad.JPG',
      'Balkon.JPG',
      'Eingangsbereich.JPG',
      'Kueche.JPG',
      'Zimmer-1.JPG',
      'Zimmer-2.JPG'
    ]
  },
  neubau: {
    key: 'neubau',
    label: 'Fruehlingstrasse - Neubau',
    address: 'Fruehlingstrasse 8, D-82152 Krailling',
    rooms: '2 Zimmer',
    area: '58 m2',
    description: '2-Zimmerwohnung mit Kueche, Bad und Garten mit Grillplatz.',
    details: 'Eigener Zugang, voll ausgestattete Kueche sowie Bad mit Wanne und Dusche.',
    features: [
      'Waschmaschine mit Trockner',
      '3 Einzelbetten in jedem Zimmer (je eines Queen-Size)',
      'WLAN 150 Mbit/s',
      'Sat-TV',
      'Parkplaetze fuer PKW und LKW mit Haenger vor dem Haus',
      'Gartenbenutzung mit Grillmoeglichkeit',
      'Ruhige Wohnlage',
      'Naehe zu Biergarten, Naturbadesee, Geschaeften und Banken'
    ],
    folder: 'Wohnung-Fruehlingstrasse',
    images: [
      'Zimmer-1.JPG',
      'Bad.JPG',
      'Balkonfenster-Zimmer-1.JPG',
      'Flur-Treppe.JPG',
      'Kueche-Fenster.JPG',
      'Kueche.JPG',
      'Zimmer-2.JPG'
    ]
  },
  kombi: {
    key: 'kombi',
    label: 'Kombi-Paket: Hackerberg + Fruehlingstrasse',
    address: 'Hackerberg 4 und Fruehlingstrasse 8, D-82152 Krailling',
    rooms: '4,5 Zimmer gesamt',
    area: '123 m2 gesamt',
    description: 'Beide Wohnungen zusammen, ideal fuer groessere Teams (7-11 Personen).',
    details: 'Zwei Wohnungen, zwei Kuechen, zwei Baeder und flexible Team-Aufteilung.',
    features: [
      'Beide Wohnungen im Paket',
      'Zwei getrennte Kuechen und Baeder',
      'Gesamtkapazitaet fuer groessere Teams',
      'WLAN in beiden Wohnungen',
      'Parken an beiden Standorten'
    ],
    comboFolders: ['Wohnung-Hackerberg', 'Wohnung-Fruehlingstrasse']
  }
};

const OFFER_PRIORITY = ['hackerberg', 'neubau', 'kombi'];

export function getOfferOptionLabel(option) {
  return APARTMENT_OPTIONS[option]?.label || option;
}

export function getBookedApartmentKeysForOption(option) {
  if (option === 'kombi') {
    return ['hackerberg', 'neubau'];
  }
  if (option === 'hackerberg' || option === 'neubau') {
    return [option];
  }
  return [];
}

export function normalizeOfferOptions(options, fallbackOption) {
  const source = Array.isArray(options) ? options : [];
  const unique = [...new Set(source
    .map((entry) => String(entry || '').trim().toLowerCase())
    .filter((entry) => OFFER_PRIORITY.includes(entry)))];

  if (unique.length > 0) {
    return OFFER_PRIORITY.filter((entry) => unique.includes(entry));
  }

  const fallback = String(fallbackOption || '').trim().toLowerCase();
  if (OFFER_PRIORITY.includes(fallback)) {
    return [fallback];
  }

  return ['hackerberg'];
}

export function getDiscountRateFromBooking(booking) {
  const subtotal = Number(booking?.subtotal || 0);
  const discount = Number(booking?.discount || 0);
  if (!subtotal || subtotal <= 0 || !Number.isFinite(discount) || discount <= 0) {
    return 0;
  }
  return Math.max(0, Math.min(0.95, discount / subtotal));
}

function roundToTwo(value) {
  return Math.round((Number(value) || 0) * 100) / 100;
}

function getPricePerNightForOption(option, people) {
  const numPeople = Number(people) || 0;

  if (option === 'kombi') {
    if (numPeople <= 8) return 200;
    if (numPeople <= 10) return 210;
    return 215;
  }

  if (numPeople <= 4) return 100;
  if (numPeople === 5) return 105;
  return 110;
}

function getCleaningFeeForOption(option) {
  return option === 'kombi' ? 180 : 100;
}

export function buildOfferVariantFromBooking(booking, option) {
  const nights = Number(booking?.totalNights || booking?.nights || 0);
  const people = Number(booking?.people || 0);
  const discountRate = getDiscountRateFromBooking(booking);

  const pricePerNight = getPricePerNightForOption(option, people);
  const cleaningFee = getCleaningFeeForOption(option);
  const subtotal = roundToTwo(nights * pricePerNight + cleaningFee);
  const discount = roundToTwo(subtotal * discountRate);
  const vat = roundToTwo((subtotal - discount) * 0.07);
  const total = roundToTwo(subtotal - discount + vat);

  return {
    option,
    label: getOfferOptionLabel(option),
    pricePerNight,
    cleaningFee,
    nights,
    subtotal,
    discount,
    vat,
    total
  };
}

export function buildOfferVariantsFromBooking(booking, options) {
  return normalizeOfferOptions(options, booking?.wohnung).map((option) => buildOfferVariantFromBooking(booking, option));
}

export function getApartmentInfoForOption(option) {
  return APARTMENT_OPTIONS[option] || null;
}

export function getApartmentPreviewImages(option, maxImagesPerApartment = 4) {
  const info = APARTMENT_OPTIONS[option];
  if (!info) return [];

  if (option === 'kombi') {
    return ['hackerberg', 'neubau'].flatMap((subOption) => {
      const subInfo = APARTMENT_OPTIONS[subOption];
      if (!subInfo) return [];
      return (subInfo.images || []).slice(0, maxImagesPerApartment).map((image) => ({
        folder: subInfo.folder,
        image,
        apartmentLabel: subInfo.label
      }));
    });
  }

  return (info.images || []).slice(0, maxImagesPerApartment).map((image) => ({
    folder: info.folder,
    image,
    apartmentLabel: info.label
  }));
}
