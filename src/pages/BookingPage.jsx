
import { useState, useEffect, useRef } from "react";
import { useTranslation } from "react-i18next";
import { format, addMonths, addDays, isAfter } from "date-fns";
import { APP_VERSION } from "../config";
import { DateRange } from "react-date-range";
import "react-date-range/dist/styles.css";
import "react-date-range/dist/theme/default.css";
import { apiCall } from "../utils/api";
import ImageGallery from '../components/ImageGallery';
import { EU_COUNTRIES, getCountryDisplayName, isPostalCodeValid } from "../utils/addressSchemas";

export default function BookingPage() {
  const { t, i18n } = useTranslation();
  // State für Mindestbuchungsdauer-Fehler
  const [minNightsError, setMinNightsError] = useState("");
  // State für Animation der Fehlermeldung
  const [minNightsErrorAnim, setMinNightsErrorAnim] = useState(false);
  const minNightsErrorRef = useRef(null);
  const [range, setRange] = useState([
    {
      startDate: new Date(),
      endDate: new Date(),
      key: "selection",
    },
  ]);
  const [people, setPeople] = useState(1);
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [landlinePhone, setLandlinePhone] = useState("");
  const [company, setCompany] = useState("");
  const [vatId, setVatId] = useState("");
  const [street, setStreet] = useState("");
  const [addressLine2, setAddressLine2] = useState("");
  const [zip, setZip] = useState("");
  const [city, setCity] = useState("");
  const [region, setRegion] = useState("");
  const [countryCode, setCountryCode] = useState("DE");
  const [step, setStep] = useState("dateselect");
  const [selectedWohnung, setSelectedWohnung] = useState(null);
  const [availability, setAvailability] = useState({ keys: [], status: {} });
  const [selectedImage, setSelectedImage] = useState(null);
  const [dataConsent, setDataConsent] = useState(false);
  const [agbConsent, setAgbConsent] = useState(false);
  
  // Lokale State für Datumseingaben
  const [startDateInput, setStartDateInput] = useState(format(new Date(), "dd.MM.yyyy"));
  const [endDateInput, setEndDateInput] = useState(format(new Date(), "dd.MM.yyyy"));

  const MAX_PEOPLE_HACKERBERG = 5;
  const MAX_PEOPLE_FRUEHLING = 6;
  const MAX_PEOPLE = 11;
  const INQUIRY_MIN_NIGHTS = 10;

  const isGermanAddress = countryCode === 'DE';
  const isIrishAddress = countryCode === 'IE';

  // Dynamisch belegte Zeiten (aus Backend)
  const [blockedDates, setBlockedDates] = useState({ neubau: [], hackerberg: [] });
  const [loadingBlocked, setLoadingBlocked] = useState(true);

  // Lädt alle BlockedDates und Buchungen für beide Wohnungen
  useEffect(() => {
    async function fetchBlocked() {
      setLoadingBlocked(true);
      try {
        const [neubauRes, hackerbergRes] = await Promise.all([
          apiCall("/api/bookings/blocked?wohnung=neubau"),
          apiCall("/api/bookings/blocked?wohnung=hackerberg")
        ]);
        const neubau = await neubauRes.json();
        const hackerberg = await hackerbergRes.json();
        setBlockedDates({
          neubau: neubau.periods || [],
          hackerberg: hackerberg.periods || []
        });
      } catch (e) {
        setBlockedDates({ neubau: [], hackerberg: [] });
      } finally {
        setLoadingBlocked(false);
      }
    }
    fetchBlocked();
  }, []);

  // Berechne Preis basierend auf Anzahl der Mitarbeiter
  const getBasePricePerNight = () => {
    const numPeople = parseInt(people, 10);
    if (numPeople <= 4) return 100;
    if (numPeople === 5) return 105;
    return 110;
  };

  const getPricePerNight = (wohnungKey) => {
    const numPeople = parseInt(people, 10);
    const base = getBasePricePerNight();
    if (wohnungKey !== "kombi") return base;

    if (numPeople <= 8) return 200;
    if (numPeople <= 10) return 210;
    return 215;
  };

  // Prüfe ob Frühbucherabatt aktiv ist (mindestens 2 Monate vorher)
  const getEarlyBookingDiscount = () => {
    const startDate = range[0].startDate;
    const today = new Date();
    const twoMonthsFromNow = addMonths(today, 2);
    
    if (startDate > twoMonthsFromNow) {
      return 0.10; // 10% Rabatt
    }
    return 0;
  };

  // Hilfsfunktion: Prüft, ob ein Zeitraum mit einer Liste von belegten Zeiträumen kollidiert
  function isBlocked(dateRange, periods) {
    // dateRange: [start, end] als yyyy-MM-dd
    // periods: [{start, end}] als yyyy-MM-dd
    const start = new Date(dateRange[0]);
    const end = new Date(dateRange[1]);
    let blocked = false;
    for (const period of periods) {
      const pStart = new Date(period.start);
      const pEnd = new Date(period.end);
      const overlap = start <= pEnd && end >= pStart;
      console.log('[DEBUG isBlocked]', {
        dateRange,
        start,
        end,
        period,
        pStart,
        pEnd,
        overlap
      });
      if (overlap) blocked = true;
    }
    return blocked;
  }

  // Hilfsfunktion: Finde das nächste freie Datum nach dem gewünschten Zeitraum
  function getNextFreeDate(dateRange, periods) {
    // Sortiere nach Enddatum
    const sorted = [...periods].sort((a, b) => a.end.localeCompare(b.end));
    
    // Finde den spätesten blockierten/gebuchten Zeitraum
    if (sorted.length === 0) {
      return new Date(); // Sofort verfügbar
    }
    
    // Nimm das Ende des letzten Zeitraums + 1 Tag
    const lastPeriod = sorted[sorted.length - 1];
    return addDays(new Date(lastPeriod.end), 1);
  }

  const checkAvailability = () => {
    const numPeople = parseInt(people, 10);
    const start = format(range[0].startDate, "yyyy-MM-dd");
    const end = format(range[0].endDate, "yyyy-MM-dd");
    const dateRange = [start, end];

    // Blocked periods: [{start, end}] (yyyy-MM-dd)
    const hackerbergBlocked = blockedDates.hackerberg || [];
    const neubauBlocked = blockedDates.neubau || [];

    // Neue Logik: Immer alle Keys anzeigen, aber Status korrekt setzen
    const status = {
      hackerberg: !isBlocked(dateRange, hackerbergBlocked),
      neubau: !isBlocked(dateRange, neubauBlocked),
      kombi: !isBlocked(dateRange, hackerbergBlocked) && !isBlocked(dateRange, neubauBlocked)
    };

    // Zeige immer alle Keys, aber markiere sie ggf. als ausgebucht
    let keys = [];
    if (numPeople >= 7 && numPeople <= MAX_PEOPLE) {
      // NEU: Zeige Einzelwohnungen wenn Kombi ausgebucht
      if (status.kombi) {
        keys = ["kombi"];
      } else {
        // Fallback: Zeige verfügbare Einzelwohnungen mit Disclaimer
        keys = ["neubau", "hackerberg"];
      }
    } else if (numPeople === MAX_PEOPLE_FRUEHLING) {
      keys = ["neubau"];
    } else {
      keys = ["hackerberg", "neubau"];
    }
    return { keys, status };
  };

  const handleDateSelection = (e) => {
    e.preventDefault();
    
    // Validierung: Personen
    const numPeople = parseInt(people, 10);
    if (isNaN(numPeople) || numPeople < 1 || numPeople > MAX_PEOPLE) {
      alert(t('bookingPage.alerts.invalidPeopleRange', { max: MAX_PEOPLE }));
      return;
    }

    const nights = Math.max(0, Math.ceil((range[0].endDate - range[0].startDate) / (1000 * 60 * 60 * 24)));
    if (nights < INQUIRY_MIN_NIGHTS) {
      setMinNightsError(t('bookingPage.alerts.minNightsError', {
        defaultValue: 'Mindestbuchungszeitraum: 10 Naechte. Direktbuchung ist ab 28 Naechten moeglich.'
      }));
      setMinNightsErrorAnim(false); // Reset for retrigger
      setTimeout(() => setMinNightsErrorAnim(true), 10);
      // Kalenderfeld hervorheben und zum Fehler scrollen
      const calendar = document.querySelector('.rdrCalendarWrapper');
      if (calendar) {
        calendar.scrollIntoView({ behavior: 'smooth', block: 'center' });
        calendar.focus?.();
      }
      return;
    } else {
      setMinNightsError("");
    }
    const ergebnis = checkAvailability();
    setAvailability(ergebnis);
    setStep("select");
  };

  const handleWohnungSelection = (wohnungKey) => {
    const numPeople = parseInt(people, 10);
    
    // Warnung bei 7+ Personen und Einzelwohnung
    if (numPeople >= 7 && wohnungKey !== "kombi") {
      const maxCapacity = wohnungKey === "hackerberg" ? MAX_PEOPLE_HACKERBERG : MAX_PEOPLE_FRUEHLING;
      const wohnungName = wohnungKey === "hackerberg" ? "Hackerberg" : "Frühlingstraße";
      
      const confirmed = window.confirm(
        `${t('bookingPage.alerts.capacityWarningTitle')}\n\n` +
        `${t('bookingPage.alerts.capacityWarningPeople', { count: numPeople })}\n\n` +
        `${t('bookingPage.alerts.capacityWarningApartment', { name: wohnungName, max: maxCapacity })}\n\n` +
        `${t('bookingPage.alerts.capacityWarningContinue')}`
      );
      
      if (!confirmed) {
        return; // Abbruch, bleibe auf Wohnungsauswahl
      }
    }
    
    // Speichere Auswahl und gehe zu Schritt 3 (Kundendaten)
    setSelectedWohnung(wohnungKey);
    setStep("form");
  };

  const handleCustomerDataSubmit = (e) => {
    e.preventDefault();
    const countryLabel = getCountryDisplayName(countryCode, i18n.language);
    
    // Validierung: Consent Checkboxen
    if (!dataConsent) {
      alert(t('bookingPage.alerts.acceptPrivacy'));
      return;
    }
    if (!agbConsent) {
      alert(t('bookingPage.alerts.acceptTerms'));
      return;
    }
    
    // Validierung: Email
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      alert(t('bookingPage.alerts.invalidEmail'));
      return;
    }
    
    // Validierung: Adressfelder
    if (company.trim().length < 2) {
      alert(t('bookingPage.alerts.invalidCompany'));
      return;
    }
    if (street.trim().length < 3) {
      alert(t('bookingPage.alerts.invalidStreet'));
      return;
    }
    if (!isPostalCodeValid(countryCode, zip)) {
      alert(
        t('bookingPage.alerts.invalidPostalCodeByCountry', {
          country: countryLabel,
          defaultValue: `Bitte geben Sie eine gueltige Postleitzahl fuer ${countryLabel} ein.`
        })
      );
      return;
    }
    if (city.trim().length < 2) {
      alert(t('bookingPage.alerts.invalidCity'));
      return;
    }
    if (name.trim().length < 2) {
      alert(t('bookingPage.alerts.invalidName'));
      return;
    }
    if (phone.trim().length < 5) {
      alert(t('bookingPage.alerts.invalidMobile'));
      return;
    }
    
    // Alle Validierungen bestanden - weiter zur Payment
    proceedToPayment(selectedWohnung);
  };

  const proceedToPayment = (wohnungKey) => {
    // Redirect to payment page with booking details
    const totalNights = Math.max(0, Math.ceil((range[0].endDate - range[0].startDate) / (1000 * 60 * 60 * 24)));
    const isInquiryBooking = totalNights >= INQUIRY_MIN_NIGHTS && totalNights < 28;
    const isPartialBooking = !isInquiryBooking && totalNights > 28;
    const nightsForInvoice = isPartialBooking ? 28 : totalNights;
    
    const pricePerNight = getPricePerNight(wohnungKey);
    const cleaningFee = wohnungKey === "kombi" ? 180 : 100;
    const subtotal = Number((nightsForInvoice * pricePerNight + cleaningFee).toFixed(2));
    const discount = getEarlyBookingDiscount();
    const subtotalAfterDiscount = Number((subtotal * (1 - discount)).toFixed(2));
    const vat = Number((subtotalAfterDiscount * 0.07).toFixed(2));
    const total = Number((subtotalAfterDiscount + vat).toFixed(2));
    const wohnungLabel = wohnungen[wohnungKey]?.titel || wohnungKey;
    
    // Berechne Daten für Teilbuchung
    const paidThroughDate = new Date(range[0].startDate);
    paidThroughDate.setDate(paidThroughDate.getDate() + 28);
    
    // Store booking info and redirect to payment
    const normalizedStreet = [street.trim(), addressLine2.trim()].filter(Boolean).join(', ');
    const normalizedCity = region.trim() ? `${city.trim()} (${region.trim()})` : city.trim();
    const countryLabel = getCountryDisplayName(countryCode, i18n.language);

    const bookingInfo = {
      wohnung: wohnungKey,
      startDate: format(range[0].startDate, "dd.MM.yyyy"),
      endDate: isPartialBooking ? format(paidThroughDate, "dd.MM.yyyy") : format(range[0].endDate, "dd.MM.yyyy"),
      nights: nightsForInvoice,
      people,
      name,
      email,
      phone,
      mobilePhone: phone,
      landlinePhone,
      company,
      vatId: vatId.trim(),
      street: normalizedStreet,
      zip: zip.trim(),
      city: normalizedCity,
      country: countryCode,
      countryLabel,
      addressLine2: addressLine2.trim(),
      region: region.trim(),
      pricePerNight,
      cleaningFee,
      wohnungLabel,
      subtotal,
      discount,
      vat,
      total,
      // Teilbuchungs-Daten
      isPartialBooking,
      originalStartDate: isPartialBooking ? format(range[0].startDate, "dd.MM.yyyy") : null,
      originalEndDate: isPartialBooking ? format(range[0].endDate, "dd.MM.yyyy") : null,
      totalNights: isPartialBooking ? totalNights : null,
      paidThroughDate: isPartialBooking ? format(paidThroughDate, "dd.MM.yyyy") : null,
      bookingMode: isInquiryBooking ? 'inquiry' : 'direct',
      isInquiry: isInquiryBooking,
      inquiryStatus: isInquiryBooking ? 'pending' : 'none'
    };
    
    // Save to localStorage for payment page
    localStorage.setItem('bookingInfo', JSON.stringify(bookingInfo));
    
    // Redirect to payment (we'll create this page next)
    window.location.href = '/payment';
  };

  const wohnungen = {
    neubau: {
      ...t('properties.booking.neubau', { returnObjects: true }),
      galerie:
        "https://www.monteurzimmer.de/gaestezimmer/82152-krailling-1422811f39",
      images: [
        "Zimmer-1.JPG",
        "Bad.JPG",
        "Balkonfenster-Zimmer-1.JPG",
        "Flur-Treppe.JPG",
        "Kueche-Fenster.JPG",
        "Kueche.JPG",
        "Zimmer-2.JPG"
      ],
      folder: "Wohnung-Fruehlingstrasse"
    },
    hackerberg: {
      ...t('properties.booking.hackerberg', { returnObjects: true }),
      galerie:
        "https://www.monteurzimmer.de/gaestezimmer/82152-krailling-1422811f39",
      images: [
        "Wohnzimmer.JPG",
        "Bad.JPG",
        "Balkon.JPG",
        "Eingangsbereich.JPG",
        "Kueche.JPG",
        "Zimmer-1.JPG",
        "Zimmer-2.JPG"
      ],
      folder: "Wohnung-Hackerberg"
    },
    kombi: {
      ...t('properties.booking.kombi', { returnObjects: true }),
      galleries: [
        {
          titel: t('properties.booking.kombi.galleries.fruehling'),
          folder: "Wohnung-Fruehlingstrasse",
          images: [
            "Zimmer-1.JPG",
            "Bad.JPG",
            "Balkonfenster-Zimmer-1.JPG",
            "Flur-Treppe.JPG",
            "Kueche-Fenster.JPG",
            "Kueche.JPG",
            "Zimmer-2.JPG"
          ]
        },
        {
          titel: t('properties.booking.kombi.galleries.hackerberg'),
          folder: "Wohnung-Hackerberg",
          images: [
            "Wohnzimmer.JPG",
            "Bad.JPG",
            "Balkon.JPG",
            "Eingangsbereich.JPG",
            "Kueche.JPG",
            "Zimmer-1.JPG",
            "Zimmer-2.JPG"
          ]
        }
      ]
    }
  };

  const handleKeyDown = (e) => {
    if (!selectedImage) return;

    const currentIndex = wohnung.images.findIndex(
      (img) => img === selectedImage.image
    );

    if (e.key === "ArrowRight") {
      const nextIndex = (currentIndex + 1) % wohnung.images.length;
      setSelectedImage({
        image: wohnung.images[nextIndex],
        folder: selectedImage.folder,
        titel: selectedImage.titel,
      });
    } else if (e.key === "ArrowLeft") {
      const prevIndex =
        (currentIndex - 1 + wohnung.images.length) % wohnung.images.length;
      setSelectedImage({
        image: wohnung.images[prevIndex],
        folder: selectedImage.folder,
        titel: selectedImage.titel,
      });
    }
  };

  useEffect(() => {
    if (selectedImage) {
      window.addEventListener("keydown", handleKeyDown);
      return () => window.removeEventListener("keydown", handleKeyDown);
    }
  }, [selectedImage]);

  return (
    <div className="space-y-8">
      <div className="flex justify-center gap-4 mb-8">
        {/* Schritt 1: Datumsauswahl */}
        <div className={`flex items-center justify-center w-10 h-10 rounded-full font-bold text-white ${step === 'dateselect' ? 'bg-blue-600' : 'bg-green-600'}`}>
          {step === 'dateselect' ? '1' : '✓'}
        </div>
        <div className="w-12 h-1 bg-gray-300 mt-5"></div>
        {/* Schritt 2: Wohnungsauswahl */}
        <div className={`flex items-center justify-center w-10 h-10 rounded-full font-bold text-white ${step === 'select' ? 'bg-blue-600' : step === 'form' ? 'bg-green-600' : 'bg-gray-300'}`}>
          {(step === 'dateselect') ? '2' : (step === 'select' ? '2' : '✓')}
        </div>
        <div className="w-12 h-1 bg-gray-300 mt-5"></div>
        {/* Schritt 3: Kundendaten */}
        <div className={`flex items-center justify-center w-10 h-10 rounded-full font-bold text-white ${step === 'form' ? 'bg-blue-600' : 'bg-gray-300'}`}>
          3
        </div>
        <div className="w-12 h-1 bg-gray-300 mt-5"></div>
        {/* Schritt 4: Zahlung (nicht aktiv) */}
        <div className="flex items-center justify-center w-10 h-10 rounded-full font-bold text-gray-400 bg-gray-300">
          4
        </div>
      </div>

      {step === "dateselect" && (
        <div>
          <h1 className="text-4xl font-bold text-gray-800 mb-2">{t('bookingPage.steps.bookApartment')}</h1>
          <p className="text-gray-600 mb-8">{t('bookingPage.steps.chooseDates')}</p>

          <form
            onSubmit={handleDateSelection}
            className="bg-white shadow-xl rounded-2xl p-8 space-y-6 border border-gray-100"
          >
            <div>
              <label className="block text-sm font-semibold mb-4 text-gray-700 text-lg">
                {t('bookingPage.dateSelect.periodLabel')}
              </label>
              
              {/* Manuelle Eingabefelder */}
              <div className="grid grid-cols-2 gap-4 mb-6">
                <div className="bg-white border-2 border-blue-300 rounded-xl p-4 shadow-sm">
                  <label className="block text-xs font-bold text-blue-700 mb-2 uppercase tracking-wide">
                    {t('bookingPage.dateSelect.from')}
                  </label>
                  <input
                    type="text"
                    value={startDateInput}
                    onChange={(e) => setStartDateInput(e.target.value)}
                    onBlur={(e) => {
                      try {
                        const parts = e.target.value.split('.');
                        if (parts.length === 3 && parts[0].length <= 2 && parts[1].length <= 2 && parts[2].length === 4) {
                          const day = parseInt(parts[0], 10);
                          const month = parseInt(parts[1], 10) - 1;
                          const year = parseInt(parts[2], 10);
                          const newDate = new Date(year, month, day);
                          if (!isNaN(newDate.getTime()) && day >= 1 && day <= 31 && month >= 0 && month <= 11) {
                            setRange([{ ...range[0], startDate: newDate }]);
                            setStartDateInput(format(newDate, "dd.MM.yyyy"));
                          } else {
                            // Ungültiges Datum - zurücksetzen
                            setStartDateInput(format(range[0].startDate, "dd.MM.yyyy"));
                          }
                        } else {
                          // Falsches Format - zurücksetzen
                          setStartDateInput(format(range[0].startDate, "dd.MM.yyyy"));
                        }
                      } catch (err) {
                        setStartDateInput(format(range[0].startDate, "dd.MM.yyyy"));
                      }
                    }}
                    placeholder="TT.MM.JJJJ"
                    className="w-full text-lg font-bold text-gray-800 focus:outline-none focus:ring-2 focus:ring-blue-500 rounded px-2 py-1"
                  />
                </div>
                <div className="bg-white border-2 border-blue-300 rounded-xl p-4 shadow-sm">
                  <label className="block text-xs font-bold text-blue-700 mb-2 uppercase tracking-wide">
                    {t('bookingPage.dateSelect.to')}
                  </label>
                  <input
                    type="text"
                    value={endDateInput}
                    onChange={(e) => setEndDateInput(e.target.value)}
                    onBlur={(e) => {
                      try {
                        const parts = e.target.value.split('.');
                        if (parts.length === 3 && parts[0].length <= 2 && parts[1].length <= 2 && parts[2].length === 4) {
                          const day = parseInt(parts[0], 10);
                          const month = parseInt(parts[1], 10) - 1;
                          const year = parseInt(parts[2], 10);
                          const newDate = new Date(year, month, day);
                          if (!isNaN(newDate.getTime()) && day >= 1 && day <= 31 && month >= 0 && month <= 11) {
                            setRange([{ ...range[0], endDate: newDate }]);
                            setEndDateInput(format(newDate, "dd.MM.yyyy"));
                          } else {
                            // Ungültiges Datum - zurücksetzen
                            setEndDateInput(format(range[0].endDate, "dd.MM.yyyy"));
                          }
                        } else {
                          // Falsches Format - zurücksetzen
                          setEndDateInput(format(range[0].endDate, "dd.MM.yyyy"));
                        }
                      } catch (err) {
                        setEndDateInput(format(range[0].endDate, "dd.MM.yyyy"));
                      }
                    }}
                    placeholder="TT.MM.JJJJ"
                    className="w-full text-lg font-bold text-gray-800 focus:outline-none focus:ring-2 focus:ring-blue-500 rounded px-2 py-1"
                  />
                </div>
              </div>

              {/* Kalender */}
              <div className="bg-gray-50 p-6 rounded-xl">
                <style>{`
                  .rdrDateDisplayWrapper {
                    display: none !important;
                  }
                `}</style>
                <DateRange
                  editableDateInputs={false}
                  onChange={(item) => {
                    setRange([item.selection]);
                    // Aktualisiere auch die Input-Felder
                    setStartDateInput(format(item.selection.startDate, "dd.MM.yyyy"));
                    setEndDateInput(format(item.selection.endDate, "dd.MM.yyyy"));
                    const nights = Math.max(0, Math.ceil((item.selection.endDate - item.selection.startDate) / (1000 * 60 * 60 * 24)));
                    if (nights > 0 && nights < INQUIRY_MIN_NIGHTS) {
                      setMinNightsError(t('bookingPage.alerts.minNightsError', {
                        defaultValue: 'Mindestbuchungszeitraum: 10 Naechte. Direktbuchung ist ab 28 Naechten moeglich.'
                      }));
                      setMinNightsErrorAnim(false); // Reset for retrigger
                      setTimeout(() => setMinNightsErrorAnim(true), 10);
                    } else {
                      setMinNightsError("");
                    }
                  }}
                  moveRangeOnFirstSelection={false}
                  ranges={range}
                  minDate={new Date()}
                  className="scale-110"
                />
              </div>
              <p className="text-sm text-gray-600 mt-4 bg-blue-50 p-3 rounded-lg">
                <strong>{t('bookingPage.dateSelect.selectedLabel')}</strong> {format(range[0].startDate, "dd.MM.yyyy")} – {format(
                  range[0].endDate,
                  "dd.MM.yyyy"
                )} ({Math.max(0, Math.ceil((range[0].endDate - range[0].startDate) / (1000 * 60 * 60 * 24)))} {t('bookingPage.common.nights')})
              </p>
              {(() => {
                const selectedNights = Math.max(0, Math.ceil((range[0].endDate - range[0].startDate) / (1000 * 60 * 60 * 24)));
                if (selectedNights >= 10 && selectedNights < 28) {
                  return (
                    <p className="text-sm text-amber-800 mt-2 bg-amber-50 p-3 rounded-lg border border-amber-200">
                      Zeitraum 10-27 Naechte: Es wird eine Buchungsanfrage gesendet, dieser wird jedoch sofort geprüft und mit Ihnen Kontakt aufgenommen. Direkte Buchung ist ab 28 Naechten moeglich.
                    </p>
                  );
                }
                return null;
              })()}
              {minNightsError && (
                <div
                  ref={minNightsErrorRef}
                  className={`bg-red-100 border border-red-400 text-red-700 px-4 py-2 rounded mt-2 text-sm transition-all duration-300 ${minNightsErrorAnim ? 'animate-bounce-grow' : ''}`}
                  style={{ display: 'block', textAlign: 'center' }}
                >
                  {minNightsError}
                </div>
              )}
              
              {getEarlyBookingDiscount() > 0 && (
                <div className="bg-green-50 border-2 border-green-400 p-4 rounded-lg mt-3">
                  <p className="text-green-800 font-semibold">{t('bookingPage.dateSelect.earlyDiscountTitle')}</p>
                  <p className="text-sm text-green-700">{t('bookingPage.dateSelect.earlyDiscountText')}</p>
                </div>
              )}
            </div>

            <div>
              <label className="block text-sm font-semibold mb-3 text-gray-700">
                {t('bookingPage.dateSelect.peopleLabel')}
              </label>
              <input
                type="number"
                min={1}
                max={MAX_PEOPLE}
                value={people}
                onChange={(e) => {
                  const val = parseInt(e.target.value, 10);
                  if (val >= 1 && val <= MAX_PEOPLE) {
                    setPeople(e.target.value);
                  } else if (e.target.value === '') {
                    setPeople('');
                  }
                }}
                onBlur={(e) => {
                  const val = parseInt(e.target.value, 10);
                  if (isNaN(val) || val < 1) setPeople('1');
                  if (val > MAX_PEOPLE) setPeople(String(MAX_PEOPLE));
                }}
                className="w-full border-2 border-gray-300 rounded-xl px-4 py-3 focus:outline-none focus:border-blue-500 transition"
                required
              />
              <p className="mt-2 text-xs text-gray-500">
                {t('bookingPage.dateSelect.peopleHint', {
                  maxHackerberg: MAX_PEOPLE_HACKERBERG,
                  maxFruehling: MAX_PEOPLE_FRUEHLING,
                  maxTotal: MAX_PEOPLE,
                })}
              </p>
            </div>

            <button
              type="submit"
              className="w-full bg-blue-600 text-white font-semibold py-4 rounded-xl hover:bg-blue-700 transition shadow-lg hover:shadow-xl"
            >
              {t('bookingPage.dateSelect.checkAvailabilityButton')}
            </button>

            <p className="text-xs text-gray-500 bg-gray-50 p-3 rounded-lg">
              {t('bookingPage.dateSelect.afterSubmitHint')}
            </p>
          </form>
        </div>
      )}

      {step === "select" && (
        <div>
          <h1 className="text-4xl font-bold text-gray-800 mb-2">{t('bookingPage.steps.availableApartments')}</h1>
          <p className="text-gray-600 mb-8">{t('bookingPage.steps.chooseApartment')}</p>

          {(() => {
            const numPeople = parseInt(people, 10);
            const kombiNotAvailableButNeeded = numPeople >= 7 && !availability.status?.kombi;
            const fallbackKeys = numPeople >= 7
              ? ["kombi"]
              : numPeople === MAX_PEOPLE_FRUEHLING
                ? ["neubau"]
                : ["hackerberg", "neubau"];
            const displayKeys = availability.keys?.length ? availability.keys : fallbackKeys;
            const hasAnyAvailable = displayKeys.some((key) => availability.status?.[key]);

            return (
            <div className="space-y-6">
              {kombiNotAvailableButNeeded && (
                <div className="bg-yellow-50 border-2 border-yellow-300 rounded-xl p-4 text-yellow-900">
                  <p className="font-semibold mb-1">{t('bookingPage.select.capacityNoteTitle')}</p>
                  <p className="text-sm">
                    {t('bookingPage.select.capacityNoteText', { count: numPeople })}
                  </p>
                </div>
              )}
              {/* Frühe Erklärung der Rechnungslogik */}
              <div className="bg-blue-50 border-l-4 border-blue-500 rounded-lg p-5">
                <h3 className="text-lg font-semibold text-blue-900 mb-2">{t('bookingPage.select.billingInfoTitle')}</h3>
                <div className="text-sm text-blue-800 space-y-2">
                  <p><strong>{t('bookingPage.select.billingInfoPoint1Title')}</strong> {t('bookingPage.select.billingInfoPoint1Text')}</p>
                  <p><strong>{t('bookingPage.select.billingInfoPoint2Title')}</strong> {t('bookingPage.select.billingInfoPoint2Text')}</p>
                  <p><strong>{t('bookingPage.select.billingInfoPoint3Title')}</strong> {t('bookingPage.select.billingInfoPoint3Text')}</p>
                </div>
              </div>
              {!hasAnyAvailable && (
                <div className="bg-red-50 border-2 border-red-200 rounded-2xl p-6 text-center">
                  <h3 className="text-xl font-bold text-red-800 mb-2">{t('bookingPage.select.noAvailabilityTitle')}</h3>
                  <p className="text-red-700">{t('bookingPage.select.noAvailabilityText')}</p>
                </div>
              )}
              {displayKeys.map((key) => {
                const wohnung = wohnungen[key];
                const nights = Math.max(
                  0,
                  Math.ceil((range[0].endDate - range[0].startDate) / (1000 * 60 * 60 * 24))
                );
                const pricePerNight = getPricePerNight(key);
                const cleaningFee = key === "kombi" ? 180 : 100;
                const baseSum = nights * pricePerNight + cleaningFee;
                const isAvailable = Boolean(availability.status?.[key]);
                return (
                  <div
                    key={key}
                    className={`border-2 rounded-2xl p-8 shadow-lg bg-white transition ${
                      isAvailable
                        ? "border-blue-200 hover:shadow-xl"
                        : "border-red-200 opacity-70"
                    }`}
                  >
                    <div className="grid grid-cols-1 gap-8">
                      {/* Title and Description */}
                      <div>
                        <h2 className="text-3xl font-bold mb-3 text-gray-800">{wohnung.titel}</h2>
                        <p className="text-gray-700 mb-4 leading-relaxed">{wohnung.beschreibung}</p>
                        {wohnung.details && (
                          <p className="text-sm text-gray-700 mb-4 italic">{wohnung.details}</p>
                        )}

                        {(wohnung.zimmer || wohnung.flaeche) && (
                          <div className="space-y-2 text-sm text-gray-700 mb-4">
                            {wohnung.zimmer && (
                              <div className="flex items-center gap-2">
                                <span className="text-lg">🏠</span>
                                <span><strong>{t('bookingPage.select.roomsLabel')}</strong> {wohnung.zimmer}</span>
                              </div>
                            )}
                            {wohnung.flaeche && (
                              <div className="flex items-center gap-2">
                                <span className="text-lg">📐</span>
                                <span><strong>{t('bookingPage.select.areaLabel')}</strong> {wohnung.flaeche}</span>
                              </div>
                            )}
                          </div>
                        )}

                        {!isAvailable && (
                          <>
                            <div className="flex items-center mb-2">
                              <span className="inline-block rounded-full bg-red-600 text-white px-4 py-2 text-lg font-bold mr-2">
                                <svg className="inline w-6 h-6 mr-2" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                                  <circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="2" fill="white" />
                                  <line x1="8" y1="8" x2="16" y2="16" stroke="currentColor" strokeWidth="2" />
                                  <line x1="16" y1="8" x2="8" y2="16" stroke="currentColor" strokeWidth="2" />
                                </svg>
                                {t('bookingPage.select.soldOut')}
                              </span>
                            </div>
                            <div className="text-lg text-red-700 font-semibold mb-2">
                              <span>{t('bookingPage.select.nextFreeFrom')}</span>
                              <span className="ml-2 bg-yellow-100 px-3 py-1 rounded-full text-yellow-800 font-bold">
                                {(() => {
                                  const periods = key === "hackerberg" ? blockedDates.hackerberg : blockedDates.neubau;
                                  const start = format(range[0].startDate, "yyyy-MM-dd");
                                  const end = format(range[0].endDate, "yyyy-MM-dd");
                                  const next = getNextFreeDate([start, end], periods || []);
                                  return next ? format(new Date(next), "dd.MM.yyyy") : t('bookingPage.select.unknown');
                                })()}
                              </span>
                            </div>

                            <button
                              disabled
                              className="mt-4 w-full font-bold py-3 px-4 rounded-xl bg-gray-200 text-gray-500 cursor-not-allowed"
                            >
                              {t('bookingPage.select.soldOut')}
                            </button>
                          </>
                        )}
                        <div className="space-y-2 text-sm text-gray-700 mb-4">
                          <div className="flex items-center gap-2">
                            <span className="text-lg">📡</span>
                            <span><strong>{t('bookingPage.select.internetLabel')}</strong> {wohnung.internet}</span>
                          </div>
                          <div className="flex items-center gap-2">
                            <span className="text-lg">✨</span>
                            <span><strong>{t('bookingPage.select.equipmentLabel')}</strong> {wohnung.extras}</span>
                          </div>
                        </div>

                        {isAvailable && wohnung.features && wohnung.features.length > 0 && (
                          <div className="mb-6 bg-blue-50 rounded-lg p-4 border border-blue-100">
                            <h4 className="font-semibold text-gray-800 mb-3 text-sm">{t('bookingPage.select.equipmentServicesTitle')}</h4>
                            <ul className="space-y-2 text-sm text-gray-700">
                              {wohnung.features.map((feature, idx) => (
                                <li key={idx} className="flex items-start gap-2">
                                  <span className="text-blue-600 font-bold mt-0.5">•</span>
                                  <span>{feature}</span>
                                </li>
                              ))}
                            </ul>
                          </div>
                        )}
                      </div>

                      {isAvailable && (
                        <>
                          {/* Einheitliche Image Gallery */}
                          <div className="mb-6">
                            <h3 className="text-lg font-semibold mb-3 text-gray-800">{t('bookingPage.select.galleryTitle')}</h3>
                            {wohnung.galleries
                              ? wohnung.galleries.map((gallery) => (
                                  <ImageGallery
                                    key={gallery.titel}
                                    images={gallery.images}
                                    folder={gallery.folder}
                                    titel={`${wohnung.titel} – ${gallery.titel}`}
                                  />
                                ))
                              : (
                                  <ImageGallery
                                    images={wohnung.images}
                                    folder={wohnung.folder}
                                    titel={wohnung.titel}
                                  />
                                )}
                          </div>

                          {/* Price Box */}
                          <div className="bg-gradient-to-br from-blue-50 to-blue-100 rounded-xl p-6">
                            <div>
                              <p className="text-gray-600 text-sm mb-2">{t('bookingPage.select.pricePerNight')}</p>
                              <p className="text-4xl font-bold text-blue-600 mb-4">{pricePerNight.toFixed(2).replace('.', ',')}€</p>
                              <p className="text-xs text-gray-500 mb-4">({t('bookingPage.select.forPeople', { count: parseInt(people, 10), people })})</p>
                              <hr className="my-2 border-blue-200" />
                              <div className="text-lg text-gray-700 mb-2">+ {cleaningFee.toFixed(2).replace('.', ',')} € {nights > 28 ? t('bookingPage.select.monthlyCleaning') : t('bookingPage.select.finalCleaning')}</div>
                              <div className="bg-blue-50 rounded-lg p-3 mt-3 text-gray-700 text-sm">
                                <strong>{t('bookingPage.dateSelect.selectedLabel')}</strong> {format(range[0].startDate, "dd.MM.yyyy")} – {format(range[0].endDate, "dd.MM.yyyy")} ({nights} {t('bookingPage.common.nights')})
                              </div>
                              {nights > 28 && (
                                <div className="bg-sky-50 border-2 border-sky-200 rounded-lg p-4 mt-4">
                                  <div className="flex items-start gap-3">
                                    <span className="text-2xl">ℹ️</span>
                                    <div>
                                      <p className="font-bold text-sky-900 text-sm mb-2">{t('bookingPage.select.invoiceSplitTitle')}</p>
                                      <p className="text-xs text-sky-800 mb-2">
                                        {t('bookingPage.select.invoiceSplitIntro')}
                                      </p>
                                      <ul className="text-xs text-sky-800 space-y-1 ml-4">
                                        <li>• <strong>{t('bookingPage.select.firstInvoiceNow')}</strong> 28 {t('bookingPage.common.nights')} = {(28 * pricePerNight + cleaningFee).toFixed(2).replace('.', ',')} € ({t('bookingPage.select.inclCleaning')})</li>
                                        <li>• <strong>{t('bookingPage.select.followUpInvoices')}</strong> {t('bookingPage.select.followUpInvoicesText', { remainingNights: nights - 28 })}</li>
                                      </ul>
                                    </div>
                                  </div>
                                </div>
                              )}
                              <button
                                onClick={() => handleWohnungSelection(key)}
                                className="mt-6 w-full font-bold py-3 px-4 rounded-xl transition shadow-lg bg-green-600 text-white hover:bg-green-700"
                              >
                                {nights >= 10 && nights < 28 ? t('bookingPage.select.askForApartment') : t('bookingPage.select.bookThisApartment')}
                              </button>
                            </div>
                          </div>
                        </>
                      )}
                    </div>
                  </div>
                );
              })}
              <button
                onClick={() => setStep("dateselect")}
                className="inline-block bg-blue-600 text-white font-semibold py-2 px-6 rounded-lg hover:bg-blue-700 transition"
              >
                {t('bookingPage.select.backToDateSelection')}
              </button>
            </div>
          );
          })()}
        </div>
      )}

      {step === "form" && (
        <div>
          <h1 className="text-4xl font-bold text-gray-800 mb-2">{t('bookingPage.steps.yourData')}</h1>
          <p className="text-gray-600 mb-8">{t('bookingPage.steps.companyAndContact')}</p>

          <div className="bg-blue-50 border border-blue-200 rounded-xl p-4 mb-6 text-sm text-gray-700">
            <h3 className="font-semibold text-gray-800 mb-2">{t('bookingPage.form.selectionSummaryTitle')}</h3>
            <p><strong>{t('bookingPage.form.apartmentLabel')}</strong> {selectedWohnung ? wohnungen[selectedWohnung]?.titel : "-"}</p>
            <p><strong>{t('bookingPage.form.periodLabel')}</strong> {format(range[0].startDate, "dd.MM.yyyy")} – {format(range[0].endDate, "dd.MM.yyyy")}</p>
            <p><strong>{t('bookingPage.form.nightsLabel')}</strong> {Math.max(0, Math.ceil((range[0].endDate - range[0].startDate) / (1000 * 60 * 60 * 24)))}</p>
            <p><strong>{t('bookingPage.form.peopleLabel')}</strong> {people}</p>
            <p><strong>{t('bookingPage.form.country', { defaultValue: 'Land:' })}</strong> {getCountryDisplayName(countryCode, i18n.language)}</p>
          </div>

          <form
            onSubmit={handleCustomerDataSubmit}
            className="bg-white shadow-xl rounded-2xl p-8 space-y-6 border border-gray-100"
          >
            <div className="bg-blue-50 p-4 rounded-xl">
              <h3 className="text-sm font-bold text-gray-800 mb-3">{t('bookingPage.form.companySectionTitle')}</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="md:col-span-2">
                  <label className="block text-sm font-semibold mb-2 text-gray-700">{t('bookingPage.form.country', { defaultValue: 'Land' })}</label>
                  <select
                    value={countryCode}
                    onChange={(e) => setCountryCode(e.target.value)}
                    className="w-full border-2 border-gray-300 rounded-xl px-4 py-3 focus:outline-none focus:border-blue-500 transition"
                    required
                  >
                    {EU_COUNTRIES.map((countryCodeOption) => (
                      <option key={countryCodeOption} value={countryCodeOption}>
                        {getCountryDisplayName(countryCodeOption, i18n.language)}
                      </option>
                    ))}
                  </select>
                </div>
                <div className="md:col-span-2">
                  <label className="block text-sm font-semibold mb-2 text-gray-700">{t('bookingPage.form.companyName')}</label>
                  <input
                    type="text"
                    value={company}
                    onChange={(e) => setCompany(e.target.value)}
                    minLength="2"
                    className="w-full border-2 border-gray-300 rounded-xl px-4 py-3 focus:outline-none focus:border-blue-500 transition"
                    placeholder={t('bookingPage.form.companyPlaceholder')}
                    required
                  />
                </div>
                <div className="md:col-span-2">
                  <label className="block text-sm font-semibold mb-2 text-gray-700">{t('bookingPage.form.vatIdOptional')}</label>
                  <input
                    type="text"
                    value={vatId}
                    onChange={(e) => setVatId(e.target.value)}
                    className="w-full border-2 border-gray-300 rounded-xl px-4 py-3 focus:outline-none focus:border-blue-500 transition"
                    placeholder={t('bookingPage.form.vatIdPlaceholder')}
                  />
                </div>
                <div className="md:col-span-2">
                  <label className="block text-sm font-semibold mb-2 text-gray-700">
                    {isGermanAddress ? t('bookingPage.form.streetAndNumber') : t('bookingPage.form.addressLine1')}
                  </label>
                  <input
                    type="text"
                    value={street}
                    onChange={(e) => setStreet(e.target.value)}
                    minLength="3"
                    className="w-full border-2 border-gray-300 rounded-xl px-4 py-3 focus:outline-none focus:border-blue-500 transition"
                    placeholder={isGermanAddress ? t('bookingPage.form.streetPlaceholder') : t('bookingPage.form.addressLine1Placeholder')}
                    required
                  />
                </div>
                {!isGermanAddress && (
                  <div className="md:col-span-2">
                    <label className="block text-sm font-semibold mb-2 text-gray-700">{t('bookingPage.form.addressLine2Optional')}</label>
                    <input
                      type="text"
                      value={addressLine2}
                      onChange={(e) => setAddressLine2(e.target.value)}
                      className="w-full border-2 border-gray-300 rounded-xl px-4 py-3 focus:outline-none focus:border-blue-500 transition"
                      placeholder={t('bookingPage.form.addressLine2Placeholder')}
                    />
                  </div>
                )}
                <div>
                  <label className="block text-sm font-semibold mb-2 text-gray-700">
                    {isGermanAddress ? t('bookingPage.form.zip') : (isIrishAddress ? t('bookingPage.form.eircodeOrPostalCode') : t('bookingPage.form.postalCode'))}
                  </label>
                  <input
                    type="text"
                    value={zip}
                    onChange={(e) => setZip(e.target.value)}
                    minLength="4"
                    pattern="[0-9A-Za-z\s\-]+"
                    className="w-full border-2 border-gray-300 rounded-xl px-4 py-3 focus:outline-none focus:border-blue-500 transition"
                    placeholder={isGermanAddress ? t('bookingPage.form.zipPlaceholder') : (isIrishAddress ? t('bookingPage.form.eircodePlaceholder') : t('bookingPage.form.postalCodePlaceholder'))}
                    required
                  />
                </div>
                <div>
                  <label className="block text-sm font-semibold mb-2 text-gray-700">
                    {isIrishAddress ? t('bookingPage.form.townOrCity') : t('bookingPage.form.city')}
                  </label>
                  <input
                    type="text"
                    value={city}
                    onChange={(e) => setCity(e.target.value)}
                    minLength="2"
                    className="w-full border-2 border-gray-300 rounded-xl px-4 py-3 focus:outline-none focus:border-blue-500 transition"
                    placeholder={isIrishAddress ? t('bookingPage.form.townOrCityPlaceholder') : t('bookingPage.form.cityPlaceholder')}
                    required
                  />
                </div>
                {!isGermanAddress && (
                  <div className="md:col-span-2">
                    <label className="block text-sm font-semibold mb-2 text-gray-700">
                      {isIrishAddress ? t('bookingPage.form.countyOptional') : t('bookingPage.form.regionOptional')}
                    </label>
                    <input
                      type="text"
                      value={region}
                      onChange={(e) => setRegion(e.target.value)}
                      className="w-full border-2 border-gray-300 rounded-xl px-4 py-3 focus:outline-none focus:border-blue-500 transition"
                      placeholder={isIrishAddress ? t('bookingPage.form.countyPlaceholder') : t('bookingPage.form.regionPlaceholder')}
                    />
                  </div>
                )}
              </div>
            </div>

            <div className="bg-gray-50 p-4 rounded-xl">
              <h3 className="text-sm font-bold text-gray-800 mb-3">{t('bookingPage.form.contactSectionTitle')}</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-semibold mb-2 text-gray-700">{t('bookingPage.form.contactPerson')}</label>
                  <input
                    type="text"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    minLength="2"
                    className="w-full border-2 border-gray-300 rounded-xl px-4 py-3 focus:outline-none focus:border-blue-500 transition"
                    placeholder={t('bookingPage.form.contactPersonPlaceholder')}
                    required
                  />
                </div>
                <div>
                  <label className="block text-sm font-semibold mb-2 text-gray-700">{t('bookingPage.form.email')}</label>
                  <input
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    pattern="[^\s@]+@[^\s@]+\.[^\s@]+"
                    title={t('bookingPage.alerts.invalidEmailTitle')}
                    className="w-full border-2 border-gray-300 rounded-xl px-4 py-3 focus:outline-none focus:border-blue-500 transition"
                    required
                  />
                </div>
                <div>
                  <label className="block text-sm font-semibold mb-2 text-gray-700">{t('bookingPage.form.landlineOptional')}</label>
                  <input
                    type="tel"
                    value={landlinePhone}
                    onChange={(e) => setLandlinePhone(e.target.value)}
                    pattern="[0-9+\s\-\(\)]*"
                    title={t('bookingPage.alerts.invalidPhoneTitle')}
                    className="w-full border-2 border-gray-300 rounded-xl px-4 py-3 focus:outline-none focus:border-blue-500 transition"
                    placeholder={t('bookingPage.form.landlinePlaceholder')}
                  />
                </div>
                <div>
                  <label className="block text-sm font-semibold mb-2 text-gray-700">{t('bookingPage.form.mobile')}</label>
                  <input
                    type="tel"
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                    minLength="5"
                    pattern="[0-9+\s\-\(\)]+"
                    title={t('bookingPage.alerts.invalidMobileTitle')}
                    className="w-full border-2 border-gray-300 rounded-xl px-4 py-3 focus:outline-none focus:border-blue-500 transition"
                    required
                  />
                </div>
              </div>
            </div>

            {/* Legal Consents */}
            <div className="bg-blue-50 border border-blue-200 rounded-xl p-6 space-y-4">
              <div className="flex items-start gap-3">
                <input
                  type="checkbox"
                  id="dataConsent"
                  checked={dataConsent}
                  onChange={(e) => setDataConsent(e.target.checked)}
                  className="w-5 h-5 text-blue-600 rounded border-gray-300 focus:ring-blue-500 mt-1 cursor-pointer"
                  required
                />
                <label htmlFor="dataConsent" className="text-sm text-gray-700 cursor-pointer">
                  <span className="font-semibold">{t('bookingPage.form.acceptPrivacyPrefix')}</span>
                  <a href="/datenschutz" target="_blank" rel="noopener noreferrer" className="text-blue-600 hover:underline">
                    {t('bookingPage.form.privacyPolicyLink')}
                  </a>
                  <span>{t('bookingPage.form.acceptPrivacySuffix')}</span>
                </label>
              </div>

              <div className="flex items-start gap-3">
                <input
                  type="checkbox"
                  id="agbConsent"
                  checked={agbConsent}
                  onChange={(e) => setAgbConsent(e.target.checked)}
                  className="w-5 h-5 text-blue-600 rounded border-gray-300 focus:ring-blue-500 mt-1 cursor-pointer"
                  required
                />
                <label htmlFor="agbConsent" className="text-sm text-gray-700 cursor-pointer">
                  <span className="font-semibold">{t('bookingPage.form.acceptTermsPrefix')}</span>
                  <a href="/agb" target="_blank" rel="noopener noreferrer" className="text-blue-600 hover:underline">
                    {t('bookingPage.form.termsAndWithdrawalLink')}
                  </a>
                  <span>{t('bookingPage.form.acceptTermsSuffix')}</span>
                </label>
              </div>
            </div>

            <div className="flex flex-col sm:flex-row gap-3">
              <button
                type="button"
                onClick={() => setStep("select")}
                className="sm:w-auto bg-gray-200 text-gray-800 font-semibold py-3 px-6 rounded-xl hover:bg-gray-300 transition"
              >
                {t('bookingPage.form.backToApartmentSelection')}
              </button>
              <button
                type="submit"
                className="flex-1 bg-blue-600 text-white font-semibold py-3 px-6 rounded-xl hover:bg-blue-700 transition"
              >
                {(() => {
                  const nights = Math.max(0, Math.ceil((range[0].endDate - range[0].startDate) / (1000 * 60 * 60 * 24)));
                  return nights >= 10 && nights < 28 ? t('bookingPage.form.continueToInquiry') : t('bookingPage.form.continueToBindingBooking');
                })()}
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Image Modal */}
      {selectedImage && (
        <div 
          className="fixed top-0 left-0 w-screen h-screen bg-black bg-opacity-90 flex items-center justify-center p-0 m-0 z-50"
          style={{ position: 'fixed', top: 0, left: 0, width: '100vw', height: '100vh', minHeight: '100vh' }}
          onClick={() => setSelectedImage(null)}
        >
          <div className="max-w-5xl w-full relative" onClick={(e) => e.stopPropagation()}>
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-xl font-bold text-white">{selectedImage.titel}</h3>
              <button
                onClick={() => setSelectedImage(null)}
                className="text-white hover:text-gray-300 text-3xl"
              >
                ✕
              </button>
            </div>
            <div className="relative">
              <button
                className="absolute left-[-60px] top-1/2 transform -translate-y-1/2 bg-white bg-opacity-50 hover:bg-opacity-75 text-black p-2 rounded-full z-50"
                type="button"
                onClick={e => {
                  e.stopPropagation();
                  let imagesArr = [];
                  if (selectedImage.folder && selectedImage.titel && selectedImage.titel.includes('–')) {
                    // Robustere Galerie-Suche: Finde Wohnung anhand folder
                    const wohnungKey = Object.keys(wohnungen).find(key => wohnungen[key].folder === selectedImage.folder);
                    let gallery = null;
                    if (wohnungen[wohnungKey]?.galleries) {
                      gallery = wohnungen[wohnungKey].galleries.find(g => g.folder === selectedImage.folder);
                    }
                    imagesArr = gallery ? gallery.images : [];
                  } else {
                    const wohnungKey = Object.keys(wohnungen).find(key => wohnungen[key].folder === selectedImage.folder);
                    imagesArr = wohnungen[wohnungKey]?.images || [];
                  }
                  console.log('Pfeil links geklickt', { imagesArr, selectedImage });
                  if (imagesArr.length > 0) {
                    const currentIndex = imagesArr.findIndex(img => img === selectedImage.image);
                    const prevIndex = (currentIndex - 1 + imagesArr.length) % imagesArr.length;
                    console.log('Wechsle zu Bild', imagesArr[prevIndex]);
                    setSelectedImage({
                      image: imagesArr[prevIndex],
                      folder: selectedImage.folder,
                      titel: selectedImage.titel,
                    });
                  }
                }}
              >
                ◀
              </button>
              <img
                src={`/${selectedImage.folder}/${selectedImage.image}?v=${APP_VERSION}`}
                alt={selectedImage.titel}
                className="mx-auto object-contain rounded-lg max-h-[80vh] max-w-[90vw]"
                style={{ background: '#fff', boxShadow: '0 2px 16px rgba(0,0,0,0.2)' }}
              />
              <button
                className="absolute right-[-60px] top-1/2 transform -translate-y-1/2 bg-white bg-opacity-50 hover:bg-opacity-75 text-black p-2 rounded-full z-50"
                type="button"
                onClick={e => {
                  e.stopPropagation();
                  let imagesArr = [];
                  if (selectedImage.folder && selectedImage.titel && selectedImage.titel.includes('–')) {
                    const wohnungKey = Object.keys(wohnungen).find(key => selectedImage.titel.startsWith(wohnungen[key].titel));
                    const gallery = wohnungen[wohnungKey]?.galleries?.find(g => g.folder === selectedImage.folder);
                    imagesArr = gallery ? gallery.images : [];
                  } else {
                    const wohnungKey = Object.keys(wohnungen).find(key => wohnungen[key].folder === selectedImage.folder);
                    imagesArr = wohnungen[wohnungKey]?.images || [];
                  }
                  console.log('Pfeil rechts geklickt', { imagesArr, selectedImage });
                  if (imagesArr.length > 0) {
                    const currentIndex = imagesArr.findIndex(img => img === selectedImage.image);
                    const nextIndex = (currentIndex + 1) % imagesArr.length;
                    console.log('Wechsle zu Bild', imagesArr[nextIndex]);
                    setSelectedImage({
                      image: imagesArr[nextIndex],
                      folder: selectedImage.folder,
                      titel: selectedImage.titel,
                    });
                  }
                }}
              >
                ▶
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
