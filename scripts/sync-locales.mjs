import fs from 'fs';
import path from 'path';

const localeDir = path.resolve('src/locales');

const readLocale = (name) => JSON.parse(fs.readFileSync(path.join(localeDir, name), 'utf8'));
const writeLocale = (name, value) => {
  fs.writeFileSync(path.join(localeDir, name), `${JSON.stringify(value, null, 2)}\n`);
};

const deepMergeMissing = (target, source) => {
  for (const [key, value] of Object.entries(source)) {
    if (!(key in target)) {
      target[key] = value;
      continue;
    }

    if (
      value &&
      typeof value === 'object' &&
      !Array.isArray(value) &&
      target[key] &&
      typeof target[key] === 'object' &&
      !Array.isArray(target[key])
    ) {
      deepMergeMissing(target[key], value);
    }
  }

  return target;
};

const applyPatchObject = (target, patch) => {
  for (const [key, value] of Object.entries(patch)) {
    if (value && typeof value === 'object' && !Array.isArray(value)) {
      if (!target[key] || typeof target[key] !== 'object' || Array.isArray(target[key])) {
        target[key] = {};
      }
      applyPatchObject(target[key], value);
      continue;
    }

    target[key] = value;
  }
};

const germanAdditions = {
  nav: {
    widerruf: 'Widerrufsrecht',
  },
  footer: {
    description: 'Komfortable und praktische Monteurwohnungen in bester Lage.',
    mobileLabel: 'Mobil',
    landlineLabel: 'Festnetz',
    country: 'Deutschland',
  },
  calendar: {
    available: 'Verfuegbar',
    booked: 'Gebucht',
  },
  commute: {
    title: 'Entfernung zur Baustelle',
    intro: 'Geben Sie die Adresse Ihrer Baustelle ein. Wir berechnen automatisch Fahrzeit und Entfernung zu beiden Wohnungen.',
    placeholder: 'z.B. Landsberger Strasse 312, 80687 Muenchen',
    submit: 'Route berechnen',
    calculating: 'Berechne...',
    siteLabel: 'Baustelle',
    note: 'Hinweis: Fahrzeiten basieren auf aktueller Routenschaetzung (Auto) und koennen je nach Verkehr variieren.',
    distanceDuration: '{{distance}} km - ca. {{duration}} Min.',
    apartments: {
      fruehling: {
        name: 'Fruehlingstrasse - Neubau',
        address: 'Fruehlingstrasse 8, 82152 Krailling, Deutschland',
      },
      hackerberg: {
        name: 'Hackerberg - Penthouse',
        address: 'Hackerberg 4, 82152 Krailling, Deutschland',
      },
    },
    errors: {
      addressSearchFailed: 'Adresssuche fehlgeschlagen',
      addressNotFound: 'Adresse nicht gefunden. Bitte genauer eingeben.',
      routeFailed: 'Routenberechnung fehlgeschlagen',
      noRoute: 'Keine Route gefunden',
      emptyAddress: 'Bitte geben Sie eine Baustellenadresse ein.',
      generic: 'Die Berechnung konnte nicht durchgefuehrt werden.',
    },
  },
  properties: {
    home: {
      hackerberg: {
        titel: 'Wohnung Krailling, Hackerberg - Penthouse',
        beschreibung: '2,5-Zimmer Penthousewohnung im 5. Stock mit Aufzug und Panorama Balkon',
        preis: 'ab 18EUR pro Person/Nacht!',
        zimmer: '2,5 Zimmer',
        flaeche: '65 m²',
        details: 'Eigenem Zugang, voll ausgestattete Kueche und Bad (mit Wanne und Dusche)',
        features: [
          'Waschmaschine mit Trockner im Keller',
          '2 Einzelbetten im 1. Zimmer, 2 Einzelbetten im 2. Zimmer (eines davon Queen size)',
          'WLAN 150 Mbit/s frei',
          'Sat-TV',
          'Parkplaetze direkt vor dem Haus',
          'Ruhige Wohnlage',
          'Nahe: Biergarten, Naturbadesee, Geschaefte & Banken',
        ],
      },
      neubau: {
        titel: 'Wohnung Krailling, Fruehlingstrasse - Neubau',
        beschreibung: '2-Zimmerwohnung mit eigenem Zugang, Garten mit Grillplatz',
        preis: 'ab 16EUR pro Person/Nacht!',
        zimmer: '2 Zimmer',
        flaeche: '58 m²',
        details: 'Eigenem Zugang, voll ausgestattete Kueche und Bad (mit Wanne und Dusche)',
        features: [
          'Waschmaschine mit Trockner',
          '2 Einzelbetten in jedem Zimmer (je eines Queen size)',
          'WLAN 150 Mbit/s frei',
          'Sat-TV',
          'Parkplaetze fuer PKW & LKW mit Haenger vor dem Haus',
          'Gartenbenutzung mit Grillmoeglichkeit',
          'Ruhige Wohnlage',
          'Nahe: Biergarten, Naturbadesee, Geschaefte & Banken',
        ],
      },
    },
    booking: {
      neubau: {
        titel: 'Fruehlingstrasse - Neubau',
        beschreibung: '2-Zimmerwohnung mit vollausgestatteter Kueche, Bad, Garten mit Grillplatz. Ideal fuer handwerkliche Fachkraefte und Monteure.',
        details: 'Eigenem Zugang, voll ausgestattete Kueche und Bad (mit Wanne und Dusche)',
        zimmer: '2 Zimmer',
        flaeche: '58 m²',
        internet: 'WLAN 150 Mbit/s',
        extras: 'Garten, Grill, ruhige Lage',
        features: [
          'Waschmaschine mit Trockner',
          '3 Einzelbetten in jedem Zimmer (je eines Queen size)',
          'WLAN 150 Mbit/s frei',
          'Sat-TV',
          'Parkplaetze fuer PKW & LKW mit Haenger vor dem Haus',
          'Gartenbenutzung mit Grillmoeglichkeit',
          'Ruhige Wohnlage',
          'Nahe: Biergarten, Naturbadesee, Geschaefte & Banken',
        ],
        preis: '110 EUR/Nacht + 100 EUR Endreinigung',
      },
      hackerberg: {
        titel: 'Hackerberg - Penthouse',
        beschreibung: '2-Zimmer-Penthouse mit grosszuegigem 35m² Balkon, Kueche, Bad und Panoramablick. 2 Einzelbetten in jedem Zimmer.',
        details: 'Eigenem Zugang, voll ausgestattete Kueche und Bad (mit Wanne und Dusche)',
        zimmer: '2,5 Zimmer',
        flaeche: '65 m²',
        internet: 'WLAN 150 Mbit/s',
        extras: 'Grosser Balkon, Panoramablick, ruhige Lage',
        features: [
          'Waschmaschine mit Trockner im Keller',
          '2 Einzelbetten im 1. Zimmer, 2 Einzelbetten im 2. Zimmer (eines davon Queen size)',
          'WLAN 150 Mbit/s frei',
          'Sat-TV',
          'Parkplaetze direkt vor dem Haus',
          'Ruhige Wohnlage',
          'Nahe: Biergarten, Naturbadesee, Geschaefte & Banken',
        ],
        preis: '110 EUR/Nacht + 100 EUR Endreinigung',
      },
      kombi: {
        titel: 'Kombi-Paket: Hackerberg + Fruehlingstrasse',
        beschreibung: 'Beide Wohnungen zusammen. Ideal fuer groessere Teams mit 7-11 Personen.',
        internet: 'WLAN 100-150 Mbit/s',
        extras: 'Zwei Wohnungen, zwei Kuechen, zwei Baeder',
        preis: 'Kombi-Paket',
        galleries: {
          fruehling: 'Fruehlingstrasse',
          hackerberg: 'Hackerberg',
        },
      },
    },
  },
  bookingPage: {
    steps: {
      bookApartment: 'Wohnung buchen',
      chooseDates: 'Schritt 1: Waehlen Sie Ihre Anreisedaten',
      availableApartments: 'Verfuegbare Wohnungen',
      chooseApartment: 'Schritt 2: Waehlen Sie eine Wohnung',
      yourData: 'Ihre Daten',
      companyAndContact: 'Schritt 3: Firmendaten und Kontaktinformationen',
    },
  },
  impressumPage: {
    title: 'Impressum',
  },
  datenschutzPage: {
    title: 'Datenschutzerklaerung',
  },
  agbPage: {
    title: 'Allgemeine Geschaeftsbedingungen (AGB)',
  },
  widerrufPage: {
    title: 'Widerrufsrecht und Widerrufsformular',
  },
};

const visibleTranslations = {
  'pl.json': {
    nav: { widerruf: 'Prawo odstapienia' },
    footer: { description: 'Wygodne i praktyczne mieszkania dla monterow w bardzo dobrej lokalizacji.', mobileLabel: 'Komorka', landlineLabel: 'Stacjonarny', country: 'Niemcy' },
    calendar: { available: 'Dostepne', booked: 'Zarezerwowane' },
    commute: { title: 'Odleglosc do placu budowy', intro: 'Podaj adres placu budowy. Automatycznie obliczymy czas dojazdu i odleglosc do obu mieszkan.', placeholder: 'np. Landsberger Strasse 312, 80687 Muenchen', submit: 'Oblicz trase', calculating: 'Obliczanie...', siteLabel: 'Plac budowy', note: 'Uwaga: czasy przejazdu opieraja sie na aktualnym szacunku trasy samochodem i moga sie roznic w zaleznosci od ruchu.', distanceDuration: '{{distance}} km - ok. {{duration}} min.', apartments: { fruehling: { name: 'Fruehlingstrasse - Nowy budynek', address: 'Fruehlingstrasse 8, 82152 Krailling, Niemcy' }, hackerberg: { name: 'Hackerberg - Penthouse', address: 'Hackerberg 4, 82152 Krailling, Niemcy' } }, errors: { addressSearchFailed: 'Wyszukiwanie adresu nie powiodlo sie', addressNotFound: 'Nie znaleziono adresu. Podaj go dokladniej.', routeFailed: 'Obliczenie trasy nie powiodlo sie', noRoute: 'Nie znaleziono trasy', emptyAddress: 'Podaj adres placu budowy.', generic: 'Nie udalo sie wykonac obliczenia.' } },
    properties: { home: { hackerberg: { titel: 'Mieszkanie Krailling, Hackerberg - Penthouse', beschreibung: 'Penthouse 2,5-pokojowy na 5. pietrze z winda i balkonem panoramicznym', preis: 'od 18EUR za osobe/noc!', zimmer: '2,5 pokoju', flaeche: '65 m²', details: 'Wlasne wejscie, w pelni wyposazona kuchnia i lazienka (z wanna i prysznicem)', features: ['Pralka z suszarka w piwnicy', '2 lozka pojedyncze w 1. pokoju, 2 lozka pojedyncze w 2. pokoju (jedno Queen Size)', 'Bezplatne WiFi 150 Mbit/s', 'Telewizja satelitarna', 'Parking bezposrednio przed domem', 'Spokojna okolica mieszkalna', 'W poblizu: ogrodek piwny, jezioro kapielowe, sklepy i banki'] }, neubau: { titel: 'Mieszkanie Krailling, Fruehlingstrasse - Nowy budynek', beschreibung: 'Mieszkanie 2-pokojowe z wlasnym wejsciem i ogrodem z miejscem do grillowania', preis: 'od 16EUR za osobe/noc!', zimmer: '2 pokoje', flaeche: '58 m²', details: 'Wlasne wejscie, w pelni wyposazona kuchnia i lazienka (z wanna i prysznicem)', features: ['Pralka z suszarka', '2 lozka pojedyncze w kazdym pokoju (po jednym Queen Size)', 'Bezplatne WiFi 150 Mbit/s', 'Telewizja satelitarna', 'Parking dla aut osobowych i ciezarowych z przyczepa przed domem', 'Mozliwosc korzystania z ogrodu i grilla', 'Spokojna okolica mieszkalna', 'W poblizu: ogrodek piwny, jezioro kapielowe, sklepy i banki'] } }, booking: { neubau: { titel: 'Fruehlingstrasse - Nowy budynek', beschreibung: 'Mieszkanie 2-pokojowe z w pelni wyposazona kuchnia, lazienka i ogrodem z grillem. Idealne dla fachowcow i monterow.', details: 'Wlasne wejscie, w pelni wyposazona kuchnia i lazienka (z wanna i prysznicem)', zimmer: '2 pokoje', flaeche: '58 m²', internet: 'WiFi 150 Mbit/s', extras: 'Ogrod, grill, spokojna lokalizacja', features: ['Pralka z suszarka', '3 lozka pojedyncze w kazdym pokoju (po jednym Queen Size)', 'Bezplatne WiFi 150 Mbit/s', 'Telewizja satelitarna', 'Parking dla aut osobowych i ciezarowych z przyczepa przed domem', 'Mozliwosc korzystania z ogrodu i grilla', 'Spokojna okolica mieszkalna', 'W poblizu: ogrodek piwny, jezioro kapielowe, sklepy i banki'], preis: '110 EUR/noc + 100 EUR sprzatanie koncowe' }, hackerberg: { titel: 'Hackerberg - Penthouse', beschreibung: 'Penthouse 2-pokojowy z duzym balkonem 35 m², kuchnia, lazienka i panoramicznym widokiem. 2 lozka pojedyncze w kazdym pokoju.', details: 'Wlasne wejscie, w pelni wyposazona kuchnia i lazienka (z wanna i prysznicem)', zimmer: '2,5 pokoju', flaeche: '65 m²', internet: 'WiFi 150 Mbit/s', extras: 'Duzy balkon, panoramiczny widok, spokojna lokalizacja', features: ['Pralka z suszarka w piwnicy', '2 lozka pojedyncze w 1. pokoju, 2 lozka pojedyncze w 2. pokoju (jedno Queen Size)', 'Bezplatne WiFi 150 Mbit/s', 'Telewizja satelitarna', 'Parking bezposrednio przed domem', 'Spokojna okolica mieszkalna', 'W poblizu: ogrodek piwny, jezioro kapielowe, sklepy i banki'], preis: '110 EUR/noc + 100 EUR sprzatanie koncowe' }, kombi: { titel: 'Pakiet laczony: Hackerberg + Fruehlingstrasse', beschreibung: 'Oba mieszkania razem. Idealne dla wiekszych zespolow od 7 do 11 osob.', internet: 'WiFi 100-150 Mbit/s', extras: 'Dwa mieszkania, dwie kuchnie, dwie lazienki', preis: 'Pakiet laczony', galleries: { fruehling: 'Fruehlingstrasse', hackerberg: 'Hackerberg' } } } },
  },
  'ro.json': { nav: { widerruf: 'Drept de retragere' }, footer: { description: 'Apartamente confortabile si practice pentru muncitori, intr-o locatie foarte buna.', mobileLabel: 'Mobil', landlineLabel: 'Telefon fix', country: 'Germania' }, calendar: { available: 'Disponibil', booked: 'Rezervat' }, commute: { title: 'Distanta pana la santier', intro: 'Introdu adresa santierului. Calculam automat timpul de drum si distanta pana la ambele apartamente.', placeholder: 'de ex. Landsberger Strasse 312, 80687 Muenchen', submit: 'Calculeaza ruta', calculating: 'Se calculeaza...', siteLabel: 'Santier', note: 'Nota: timpii de deplasare se bazeaza pe estimarea actuala a rutei cu masina si pot varia in functie de trafic.', distanceDuration: '{{distance}} km - aprox. {{duration}} min.', apartments: { fruehling: { name: 'Fruehlingstrasse - Cladire noua', address: 'Fruehlingstrasse 8, 82152 Krailling, Germania' }, hackerberg: { name: 'Hackerberg - Penthouse', address: 'Hackerberg 4, 82152 Krailling, Germania' } }, errors: { addressSearchFailed: 'Cautarea adresei a esuat', addressNotFound: 'Adresa nu a fost gasita. Introduceti-o mai exact.', routeFailed: 'Calcularea rutei a esuat', noRoute: 'Nu a fost gasita nicio ruta', emptyAddress: 'Introduceti adresa santierului.', generic: 'Calculul nu a putut fi efectuat.' } } },
  'hu.json': { nav: { widerruf: 'Elallasi jog' }, footer: { description: 'Kenyelmes es praktikus szerelolakasok nagyon jo elhelyezkedessel.', mobileLabel: 'Mobil', landlineLabel: 'Vezetekes', country: 'Nemetorszag' }, calendar: { available: 'Elerheto', booked: 'Foglalt' }, commute: { title: 'Tavolsag az epitkezesig', intro: 'Add meg az epitkezes cimet. Automatikusan kiszamoljuk a menetidot es a tavolsagot mindket lakashoz.', placeholder: 'pl. Landsberger Strasse 312, 80687 Muenchen', submit: 'Utvonal szamitasa', calculating: 'Szamitas...', siteLabel: 'Epitkezes', note: 'Megjegyzes: a menetidok az aktualis autos utvonalbecslesen alapulnak, es a forgalomtol fuggoen valtozhatnak.', distanceDuration: '{{distance}} km - kb. {{duration}} perc', apartments: { fruehling: { name: 'Fruehlingstrasse - Uj epites', address: 'Fruehlingstrasse 8, 82152 Krailling, Nemetorszag' }, hackerberg: { name: 'Hackerberg - Penthouse', address: 'Hackerberg 4, 82152 Krailling, Nemetorszag' } }, errors: { addressSearchFailed: 'A cimkereses sikertelen volt', addressNotFound: 'A cim nem talalhato. Kerjuk, add meg pontosabban.', routeFailed: 'Az utvonal-szamitas sikertelen volt', noRoute: 'Nem talalhato utvonal', emptyAddress: 'Kerjuk, add meg az epitkezes cimet.', generic: 'A szamitas nem hajthato vegre.' } } },
  'sk.json': { nav: { widerruf: 'Pravo na odstupenie' }, footer: { description: 'Pohodlne a prakticke byty pre monterov vo velmi dobrej polohe.', mobileLabel: 'Mobil', landlineLabel: 'Pevna linka', country: 'Nemecko' }, calendar: { available: 'Dostupne', booked: 'Obsadene' }, commute: { title: 'Vzdialenost od stavby', intro: 'Zadajte adresu vasej stavby. Automaticky vypocitame cas jazdy a vzdialenost k obom bytom.', placeholder: 'napr. Landsberger Strasse 312, 80687 Muenchen', submit: 'Vypocitat trasu', calculating: 'Pocita sa...', siteLabel: 'Stavba', note: 'Poznamka: casy jazdy vychadzaju z aktualneho odhadu trasy autom a mozu sa lisit podla premavky.', distanceDuration: '{{distance}} km - cca {{duration}} min.', apartments: { fruehling: { name: 'Fruehlingstrasse - Novostavba', address: 'Fruehlingstrasse 8, 82152 Krailling, Nemecko' }, hackerberg: { name: 'Hackerberg - Penthouse', address: 'Hackerberg 4, 82152 Krailling, Nemecko' } }, errors: { addressSearchFailed: 'Vyhladavanie adresy zlyhalo', addressNotFound: 'Adresa nebola najdena. Zadajte ju presnejsie.', routeFailed: 'Vypocet trasy zlyhal', noRoute: 'Nebola najdena ziadna trasa', emptyAddress: 'Zadajte adresu stavby.', generic: 'Vypocet sa nepodarilo vykonat.' } } },
  'cs.json': { nav: { widerruf: 'Pravo na odstoupeni' }, footer: { description: 'Pohodlne a prakticke byty pro montery ve velmi dobre lokalite.', mobileLabel: 'Mobil', landlineLabel: 'Pevna linka', country: 'Nemecko' }, calendar: { available: 'Dostupne', booked: 'Obsazeno' }, commute: { title: 'Vzdalenost od stavby', intro: 'Zadejte adresu stavby. Automaticky spocitame cas jizdy a vzdalenost ke obema bytum.', placeholder: 'napr. Landsberger Strasse 312, 80687 Muenchen', submit: 'Vypocitat trasu', calculating: 'Pocita se...', siteLabel: 'Stavba', note: 'Poznamka: casy jizdy vychazeji z aktualniho odhadu trasy autem a mohou se lisit podle provozu.', distanceDuration: '{{distance}} km - cca {{duration}} min.', apartments: { fruehling: { name: 'Fruehlingstrasse - Novostavba', address: 'Fruehlingstrasse 8, 82152 Krailling, Nemecko' }, hackerberg: { name: 'Hackerberg - Penthouse', address: 'Hackerberg 4, 82152 Krailling, Nemecko' } }, errors: { addressSearchFailed: 'Vyhledani adresy selhalo', addressNotFound: 'Adresa nebyla nalezena. Zadejte ji presneji.', routeFailed: 'Vypocet trasy selhal', noRoute: 'Nebyla nalezena zadna trasa', emptyAddress: 'Zadejte adresu stavby.', generic: 'Vypocet se nepodarilo provest.' } } },
  'bg.json': { nav: { widerruf: 'Право на отказ' }, footer: { description: 'Удобни и практични жилища за монтьори на много добро място.', mobileLabel: 'Мобилен', landlineLabel: 'Стационарен', country: 'Германия' }, calendar: { available: 'Свободно', booked: 'Заето' }, commute: { title: 'Разстояние до строежа', intro: 'Въведете адреса на строежа. Автоматично изчисляваме времето за пътуване и разстоянието до двата апартамента.', placeholder: 'напр. Landsberger Strasse 312, 80687 Muenchen', submit: 'Изчисли маршрут', calculating: 'Изчисляване...', siteLabel: 'Строеж', note: 'Бележка: времената за пътуване се базират на текуща автомобилна оценка на маршрута и могат да варират според трафика.', distanceDuration: '{{distance}} km - ок. {{duration}} мин.', apartments: { fruehling: { name: 'Fruehlingstrasse - Нова сграда', address: 'Fruehlingstrasse 8, 82152 Krailling, Германия' }, hackerberg: { name: 'Hackerberg - Пентхаус', address: 'Hackerberg 4, 82152 Krailling, Германия' } }, errors: { addressSearchFailed: 'Търсенето на адрес е неуспешно', addressNotFound: 'Адресът не е намерен. Моля, въведете по-точно.', routeFailed: 'Изчисляването на маршрута е неуспешно', noRoute: 'Не е намерен маршрут', emptyAddress: 'Моля, въведете адрес на строежа.', generic: 'Изчислението не можа да бъде изпълнено.' } } },
};

const de = readLocale('de.json');
applyPatchObject(de, germanAdditions);
writeLocale('de.json', de);

for (const [fileName, patch] of Object.entries(visibleTranslations)) {
  const locale = readLocale(fileName);
  applyPatchObject(locale, patch);
  deepMergeMissing(locale, de);
  writeLocale(fileName, locale);
}

for (const fileName of fs.readdirSync(localeDir).filter((file) => file.endsWith('.json') && file !== 'de.json')) {
  const locale = readLocale(fileName);
  deepMergeMissing(locale, de);
  writeLocale(fileName, locale);
}

console.log('Locale synchronization complete.');