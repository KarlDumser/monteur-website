
import { useState, useEffect, useRef } from "react";
import { format, addMonths, addDays, isAfter } from "date-fns";
import { APP_VERSION } from "../config";
import { DateRange } from "react-date-range";
import "react-date-range/dist/styles.css";
import "react-date-range/dist/theme/default.css";
import { apiCall } from "../utils/api";
import ImageGallery from '../components/ImageGallery';

export default function BookingPage() {
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
  const [company, setCompany] = useState("");
  const [street, setStreet] = useState("");
  const [zip, setZip] = useState("");
  const [city, setCity] = useState("");
  const [step, setStep] = useState("form");
  const [availability, setAvailability] = useState({ keys: [], status: {} });
  const [selectedImage, setSelectedImage] = useState(null);

  const MAX_PEOPLE_HACKERBERG = 5;
  const MAX_PEOPLE_FRUEHLING = 6;
  const MAX_PEOPLE = 11;

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
      keys = ["kombi"];
    } else if (numPeople === MAX_PEOPLE_FRUEHLING) {
      keys = ["neubau"];
    } else {
      keys = ["hackerberg", "neubau"];
    }
    return { keys, status };
  };

  const handleBooking = (e) => {
    e.preventDefault();
    const nights = Math.max(0, Math.ceil((range[0].endDate - range[0].startDate) / (1000 * 60 * 60 * 24)));
    if (nights < 27) {
      setMinNightsError("Mindestbuchungsdauer 28 Tage (27 Nächte). Für kürzere Aufenthalte kontaktieren Sie uns bitte telefonisch.");
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

  const handleSelectWohnung = (wohnungKey) => {
    // Redirect to payment page with booking details
    const totalNights = Math.max(0, Math.ceil((range[0].endDate - range[0].startDate) / (1000 * 60 * 60 * 24)));
    const isPartialBooking = totalNights > 28;
    const nightsForInvoice = isPartialBooking ? 28 : totalNights;
    
    const pricePerNight = getPricePerNight(wohnungKey);
    const cleaningFee = wohnungKey === "kombi" ? 180 : 90;
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
    const bookingInfo = {
      wohnung: wohnungKey,
      startDate: format(range[0].startDate, "dd.MM.yyyy"),
      endDate: isPartialBooking ? format(paidThroughDate, "dd.MM.yyyy") : format(range[0].endDate, "dd.MM.yyyy"),
      nights: nightsForInvoice,
      people,
      name,
      email,
      phone,
      company,
      street,
      zip,
      city,
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
      paidThroughDate: isPartialBooking ? format(paidThroughDate, "dd.MM.yyyy") : null
    };
    
    // Save to localStorage for payment page
    localStorage.setItem('bookingInfo', JSON.stringify(bookingInfo));
    
    // Redirect to payment (we'll create this page next)
    window.location.href = '/payment';
  };

  const wohnungen = {
    neubau: {
      titel: "Frühlingstraße – Neubau",
      beschreibung:
        "2-Zimmerwohnung mit moderner Ausstattung, Küche, Bad, Garten mit Grillplatz. Ideal für handwerkliche Fachkräfte und Monteure.",
      details: "Eigenem Zugang, voll ausgestattete Küche und Bad (mit Wanne und Dusche)",
      zimmer: "2 Zimmer",
      flaeche: "58 m²",
      internet: "WLAN 150 Mbit/s",
      extras: "Garten, Grill, ruhige Lage",
      features: [
        "Waschmaschine mit Trockner",
        "2 Einzelbetten in jedem Zimmer (je eines Queen size)",
        "WLAN 150 Mbit/s frei",
        "Sat-TV",
        "Parkplätze für PKW & LKW mit Hänger vor dem Haus",
        "Gartenbenutzung mit Grillmöglichkeit",
        "Ruhige Wohnlage",
        "Nahe: Biergarten, Naturbadesee, Geschäfte & Banken"
      ],
      preis: "110 EUR/Nacht + 90 EUR Endreinigung",
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
      titel: "Hackerberg – Penthouse",
      beschreibung:
        "2-Zimmer-Penthouse mit großzügigem 35m² Balkon, Küche, Bad und Panoramablick. 2 Einzelbetten in jedem Zimmer.",
      details: "Eigenem Zugang, voll ausgestattete Küche und Bad (mit Wanne und Dusche)",
      zimmer: "2,5 Zimmer",
      flaeche: "65 m²",
      internet: "WLAN 150 Mbit/s",
      extras: "Großer Balkon, Panoramablick, ruhige Lage",
      features: [
        "Waschmaschine mit Trockner im Keller",
        "2 Einzelbetten im 1. Zimmer, 2 Einzelbetten im 2. Zimmer (eines davon Queen size)",
        "WLAN 150 Mbit/s frei",
        "Sat-TV",
        "Parkplätze direkt vor dem Haus",
        "Ruhige Wohnlage",
        "Nahe: Biergarten, Naturbadesee, Geschäfte & Banken"
      ],
      preis: "110 EUR/Nacht + 90 EUR Endreinigung",
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
      titel: "Kombi-Paket: Hackerberg + Frühlingstraße",
      beschreibung:
        "Beide Wohnungen zusammen. Ideal für größere Teams mit 7–11 Personen.",
      internet: "WLAN 100–150 Mbit/s",
      extras: "Zwei Wohnungen, zwei Küchen, zwei Bäder",
      preis: "Kombi-Paket",
      galleries: [
        {
          titel: "Frühlingstraße",
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
          titel: "Hackerberg",
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
        <div className={`flex items-center justify-center w-10 h-10 rounded-full font-bold text-white ${step === 'form' ? 'bg-blue-600' : 'bg-green-600'}`}>
          ✓
        </div>
        <div className="w-12 h-1 bg-gray-300 mt-5"></div>
        <div className={`flex items-center justify-center w-10 h-10 rounded-full font-bold text-white ${step === 'select' ? 'bg-blue-600' : 'bg-gray-300'}`}>
          2
        </div>
      </div>

      {step === "form" && (
        <div>
          <h1 className="text-4xl font-bold text-gray-800 mb-2">Wohnung buchen</h1>
          <p className="text-gray-600 mb-8">Schritt 1: Wählen Sie Ihre Anreisedaten</p>

          <form
            onSubmit={handleBooking}
            className="bg-white shadow-xl rounded-2xl p-8 space-y-6 border border-gray-100"
          >
            <div>
              <label className="block text-sm font-semibold mb-3 text-gray-700">
                📅 Zeitraum wählen
              </label>
              <div className="bg-gray-50 p-4 rounded-xl">
                <DateRange
                  editableDateInputs={true}
                  onChange={(item) => {
                    setRange([item.selection]);
                    const nights = Math.max(0, Math.ceil((item.selection.endDate - item.selection.startDate) / (1000 * 60 * 60 * 24)));
                    if (nights > 0 && nights < 27) {
                      setMinNightsError("Mindestbuchungsdauer 28 Tage (27 Nächte). Für kürzere Aufenthalte kontaktieren Sie uns bitte telefonisch.");
                      setMinNightsErrorAnim(false); // Reset for retrigger
                      setTimeout(() => setMinNightsErrorAnim(true), 10);
                    } else {
                      setMinNightsError("");
                    }
                  }}
                  moveRangeOnFirstSelection={false}
                  ranges={range}
                  minDate={new Date()}
                />
              </div>
              <p className="text-sm text-gray-600 mt-4 bg-blue-50 p-3 rounded-lg">
                <strong>Gewählt:</strong> {format(range[0].startDate, "dd.MM.yyyy")} – {format(
                  range[0].endDate,
                  "dd.MM.yyyy"
                )} ({Math.max(0, Math.ceil((range[0].endDate - range[0].startDate) / (1000 * 60 * 60 * 24)))} Nächte)
              </p>
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
                  <p className="text-green-800 font-semibold">🎉 Frühbucherabatt: -10%</p>
                  <p className="text-sm text-green-700">Sie buchen mindestens 2 Monate im Voraus!</p>
                </div>
              )}
            </div>

            <div>
              <label className="block text-sm font-semibold mb-3 text-gray-700">
                👥 Anzahl der Mitarbeiter
              </label>
              <input
                type="number"
                min={1}
                max={MAX_PEOPLE}
                value={people}
                onChange={(e) => setPeople(e.target.value)}
                className="w-full border-2 border-gray-300 rounded-xl px-4 py-3 focus:outline-none focus:border-blue-500 transition"
                required
              />
              <p className="mt-2 text-xs text-gray-500">
                Hackerberg bis {MAX_PEOPLE_HACKERBERG} Personen, Frühlingstraße bis {MAX_PEOPLE_FRUEHLING} Personen,
                Kombi-Paket für 7–{MAX_PEOPLE} Personen.
              </p>
            </div>

            <div className="space-y-4">
              <div className="bg-blue-50 p-4 rounded-xl">
                <h3 className="text-sm font-bold text-gray-800 mb-3">🏢 Firmendaten (für Rechnung)</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="md:col-span-2">
                    <label className="block text-sm font-semibold mb-2 text-gray-700">Firmenname</label>
                    <input
                      type="text"
                      value={company}
                      onChange={(e) => setCompany(e.target.value)}
                      className="w-full border-2 border-gray-300 rounded-xl px-4 py-3 focus:outline-none focus:border-blue-500 transition"
                      placeholder="z.B. Müller Haustechnik GmbH"
                      required
                    />
                  </div>
                  <div className="md:col-span-2">
                    <label className="block text-sm font-semibold mb-2 text-gray-700">Straße & Hausnummer</label>
                    <input
                      type="text"
                      value={street}
                      onChange={(e) => setStreet(e.target.value)}
                      className="w-full border-2 border-gray-300 rounded-xl px-4 py-3 focus:outline-none focus:border-blue-500 transition"
                      placeholder="z.B. Ottostraße 8"
                      required
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-semibold mb-2 text-gray-700">PLZ</label>
                    <input
                      type="text"
                      value={zip}
                      onChange={(e) => setZip(e.target.value)}
                      className="w-full border-2 border-gray-300 rounded-xl px-4 py-3 focus:outline-none focus:border-blue-500 transition"
                      placeholder="z.B. 83521"
                      required
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-semibold mb-2 text-gray-700">Ort</label>
                    <input
                      type="text"
                      value={city}
                      onChange={(e) => setCity(e.target.value)}
                      className="w-full border-2 border-gray-300 rounded-xl px-4 py-3 focus:outline-none focus:border-blue-500 transition"
                      placeholder="z.B. Berghausen"
                      required
                    />
                  </div>
                </div>
              </div>

              <div className="bg-gray-50 p-4 rounded-xl">
                <h3 className="text-sm font-bold text-gray-800 mb-3">👤 Kontaktdaten</h3>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div>
                    <label className="block text-sm font-semibold mb-2 text-gray-700">Ansprechpartner</label>
                    <input
                      type="text"
                      value={name}
                      onChange={(e) => setName(e.target.value)}
                      className="w-full border-2 border-gray-300 rounded-xl px-4 py-3 focus:outline-none focus:border-blue-500 transition"
                      required
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-semibold mb-2 text-gray-700">E-Mail</label>
                    <input
                      type="email"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      className="w-full border-2 border-gray-300 rounded-xl px-4 py-3 focus:outline-none focus:border-blue-500 transition"
                      required
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-semibold mb-2 text-gray-700">Telefon</label>
                    <input
                      type="tel"
                      value={phone}
                      onChange={(e) => setPhone(e.target.value)}
                      className="w-full border-2 border-gray-300 rounded-xl px-4 py-3 focus:outline-none focus:border-blue-500 transition"
                      required
                    />
                  </div>
                </div>
              </div>
            </div>

            <button
              type="submit"
              className="w-full bg-blue-600 text-white font-semibold py-4 rounded-xl hover:bg-blue-700 transition shadow-lg hover:shadow-xl"
            >
              Verfügbarkeit prüfen →
            </button>

            <p className="text-xs text-gray-500 bg-gray-50 p-3 rounded-lg">
              ℹ️ Nach dem Absenden sehen Sie die verfügbaren Wohnungen. Danach erfolgt die Weiterleitung zur Bezahlung (Kreditkarte oder PayPal).
            </p>
          </form>
        </div>
      )}

      {step === "select" && (
        <div>
          <h1 className="text-4xl font-bold text-gray-800 mb-2">Verfügbare Wohnungen</h1>
          <p className="text-gray-600 mb-8">Schritt 2: Wählen Sie eine Wohnung</p>

          {(() => {
            const numPeople = parseInt(people, 10);
            const displayKeys = numPeople >= 7
              ? ["kombi"]
              : numPeople === MAX_PEOPLE_FRUEHLING
                ? ["neubau"]
                : ["hackerberg", "neubau"];
            const hasAnyAvailable = displayKeys.some((key) => availability.status?.[key]);

            return (
            <div className="space-y-6">
              {!hasAnyAvailable && (
                <div className="bg-red-50 border-2 border-red-200 rounded-2xl p-6 text-center">
                  <h3 className="text-xl font-bold text-red-800 mb-2">Keine Verfuegbarkeit</h3>
                  <p className="text-red-700">Fuer den gewaehlten Zeitraum ist aktuell keine passende Wohnung verfuegbar.</p>
                </div>
              )}
              {displayKeys.map((key) => {
                const wohnung = wohnungen[key];
                const nights = Math.max(
                  0,
                  Math.ceil((range[0].endDate - range[0].startDate) / (1000 * 60 * 60 * 24))
                );
                const pricePerNight = getPricePerNight(key);
                const cleaningFee = key === "kombi" ? 180 : 90;
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
                                <span><strong>Zimmer:</strong> {wohnung.zimmer}</span>
                              </div>
                            )}
                            {wohnung.flaeche && (
                              <div className="flex items-center gap-2">
                                <span className="text-lg">📐</span>
                                <span><strong>Fläche:</strong> {wohnung.flaeche}</span>
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
                                Ausgebucht
                              </span>
                            </div>
                            <div className="text-lg text-red-700 font-semibold mb-2">
                              <span>Nächster freier Zeitraum ab:</span>
                              <span className="ml-2 bg-yellow-100 px-3 py-1 rounded-full text-yellow-800 font-bold">
                                {(() => {
                                  const periods = key === "hackerberg" ? blockedDates.hackerberg : blockedDates.neubau;
                                  const start = format(range[0].startDate, "yyyy-MM-dd");
                                  const end = format(range[0].endDate, "yyyy-MM-dd");
                                  const next = getNextFreeDate([start, end], periods || []);
                                  return next ? format(new Date(next), "dd.MM.yyyy") : "unbekannt";
                                })()}
                              </span>
                            </div>

                            <button
                              disabled
                              className="mt-4 w-full font-bold py-3 px-4 rounded-xl bg-gray-200 text-gray-500 cursor-not-allowed"
                            >
                              Ausgebucht
                            </button>
                          </>
                        )}
                        <div className="space-y-2 text-sm text-gray-700 mb-4">
                          <div className="flex items-center gap-2">
                            <span className="text-lg">📡</span>
                            <span><strong>Internet:</strong> {wohnung.internet}</span>
                          </div>
                          <div className="flex items-center gap-2">
                            <span className="text-lg">✨</span>
                            <span><strong>Ausstattung:</strong> {wohnung.extras}</span>
                          </div>
                        </div>

                        {isAvailable && wohnung.features && wohnung.features.length > 0 && (
                          <div className="mb-6 bg-blue-50 rounded-lg p-4 border border-blue-100">
                            <h4 className="font-semibold text-gray-800 mb-3 text-sm">Ausstattung & Services:</h4>
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
                            <h3 className="text-lg font-semibold mb-3 text-gray-800">📸 Bildergalerie</h3>
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
                              <p className="text-gray-600 text-sm mb-2">Preis pro Nacht</p>
                              <p className="text-4xl font-bold text-blue-600 mb-4">{pricePerNight.toFixed(2).replace('.', ',')}€</p>
                              <p className="text-xs text-gray-500 mb-4">(für {people} {parseInt(people) === 1 ? 'Person' : 'Personen'})</p>
                              <hr className="my-2 border-blue-200" />
                              <div className="text-lg font-semibold text-gray-800 mb-1">
                                {nights} Nächte x {pricePerNight.toFixed(0)} € = {(nights * pricePerNight).toFixed(2).replace('.', ',')} €
                              </div>
                              <div className="text-lg text-gray-700 mb-1">+ {cleaningFee.toFixed(2).replace('.', ',')} € Endreinigung</div>
                              <div className="font-semibold text-gray-800 mb-1">Nettosumme = {baseSum.toFixed(2).replace('.', ',')} €</div>
                              <div className="text-gray-700 mb-1">+ 7% MwSt: {((baseSum * 0.07).toFixed(2)).replace('.', ',')} €</div>
                              <div className="font-bold text-2xl text-blue-800 mb-2">Bruttosumme = {(baseSum * 1.07).toFixed(2).replace('.', ',')} €</div>
                              <div className="bg-blue-50 rounded-lg p-3 mt-3 text-gray-700 text-sm">
                                <strong>Gewählt:</strong> {format(range[0].startDate, "dd.MM.yyyy")} – {format(range[0].endDate, "dd.MM.yyyy")} ({nights} Nächte)
                              </div>
                              <button
                                onClick={() => handleSelectWohnung(key)}
                                className="mt-6 w-full font-bold py-3 px-4 rounded-xl transition shadow-lg bg-green-600 text-white hover:bg-green-700"
                              >
                                ✓ Diese Wohnung buchen
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
                onClick={() => setStep("form")}
                className="inline-block bg-blue-600 text-white font-semibold py-2 px-6 rounded-lg hover:bg-blue-700 transition"
              >
                ← Zurück zur Datumsauswahl
              </button>
            </div>
          );
          })()}
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
