
import { useState, useEffect } from "react";
import { format, addMonths, addDays, isAfter } from "date-fns";
import { APP_VERSION } from "../config";
import { DateRange } from "react-date-range";
import "react-date-range/dist/styles.css";
import "react-date-range/dist/theme/default.css";
import { apiCall } from "../utils/api";

export default function BookingPage() {
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
    return periods.some(period => {
      const pStart = new Date(period.start);
      const pEnd = new Date(period.end);
      return start <= pEnd && end >= pStart;
    });
  }

  // Hilfsfunktion: Finde das nächste freie Datum nach dem gewünschten Zeitraum
  function getNextFreeDate(dateRange, periods) {
    // Sortiere nach Startdatum
    const sorted = [...periods].sort((a, b) => a.start.localeCompare(b.start));
    let next = addDays(new Date(dateRange[1]), 1);
    for (const period of sorted) {
      if (isAfter(new Date(period.start), next)) {
        // Lücke gefunden
        return next;
      }
      if (next <= new Date(period.end)) {
        next = addDays(new Date(period.end), 1);
      }
    }
    return next;
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
    const ergebnis = checkAvailability();
    setAvailability(ergebnis);
    setStep("select");
  };

  const handleSelectWohnung = (wohnungKey) => {
    // Redirect to payment page with booking details
    const nights = Math.max(0, Math.ceil((range[0].endDate - range[0].startDate) / (1000 * 60 * 60 * 24)));
    const pricePerNight = getPricePerNight(wohnungKey);
    const cleaningFee = wohnungKey === "kombi" ? 180 : 90;
    const subtotal = Number((nights * pricePerNight + cleaningFee).toFixed(2));
    const discount = getEarlyBookingDiscount();
    const subtotalAfterDiscount = Number((subtotal * (1 - discount)).toFixed(2));
    const vat = Number((subtotalAfterDiscount * 0.07).toFixed(2));
    const total = Number((subtotalAfterDiscount + vat).toFixed(2));
    const wohnungLabel = wohnungen[wohnungKey]?.titel || wohnungKey;
    
    // Store booking info and redirect to payment
    const bookingInfo = {
      wohnung: wohnungKey,
      startDate: format(range[0].startDate, "dd.MM.yyyy"),
      endDate: format(range[0].endDate, "dd.MM.yyyy"),
      nights,
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
      total
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
      internet: "WLAN 150 Mbit/s",
      extras: "Garten, Grill, ruhige Lage",
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
      internet: "WLAN 100 Mbit/s",
      extras: "Großer Balkon, Panoramablick, ruhige Lage",
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
                  onChange={(item) => setRange([item.selection])}
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
                        {!isAvailable && (
                          <>
                            <span className="inline-block mb-2 rounded-full bg-red-100 px-3 py-1 text-xs font-semibold text-red-700">
                              Ausgebucht
                            </span>
                            <div className="text-sm text-gray-700 mb-2">
                              Nächster freier Zeitraum ab: <strong>{(() => {
                                const periods = key === "hackerberg" ? blockedDates.hackerberg : blockedDates.neubau;
                                const start = format(range[0].startDate, "yyyy-MM-dd");
                                const end = format(range[0].endDate, "yyyy-MM-dd");
                                const next = getNextFreeDate([start, end], periods || []);
                                return next ? format(new Date(next), "dd.MM.yyyy") : "unbekannt";
                              })()}</strong>
                            </div>
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
                      </div>

                      {/* Image Gallery */}
                      <div className="mb-6">
                        <h3 className="text-lg font-semibold mb-3 text-gray-800">📸 Bildergalerie</h3>
                        {wohnung.galleries ? (
                          <div className="space-y-4">
                            {wohnung.galleries.map((gallery) => (
                              <div key={gallery.titel}>
                                <p className="text-sm font-semibold text-gray-700 mb-2">{gallery.titel}</p>
                                <div className="grid grid-cols-4 md:grid-cols-5 gap-2">
                                  {gallery.images.map((image, index) => (
                                    <div
                                      key={`${gallery.titel}-${index}`}
                                      className="bg-gray-200 rounded-lg overflow-hidden h-24 hover:opacity-75 transition cursor-pointer"
                                      onClick={() =>
                                        setSelectedImage({
                                          image,
                                          folder: gallery.folder,
                                          titel: `${wohnung.titel} – ${gallery.titel}`
                                        })
                                      }
                                    >
                                      <img
                                        src={`/${gallery.folder}/${image}?v=${APP_VERSION}`}
                                        alt={`${gallery.titel} ${index + 1}`}
                                        className="w-full h-full object-cover"
                                      />
                                    </div>
                                  ))}
                                </div>
                              </div>
                            ))}
                          </div>
                        ) : (
                          <div className="grid grid-cols-4 md:grid-cols-5 gap-2">
                            {wohnung.images.map((image, index) => (
                              <div
                                key={index}
                                className="bg-gray-200 rounded-lg overflow-hidden h-24 hover:opacity-75 transition cursor-pointer"
                                onClick={() => setSelectedImage({ image, folder: wohnung.folder, titel: wohnung.titel })}
                              >
                                <img
                                  src={`/${wohnung.folder}/${image}?v=${APP_VERSION}`}
                                  alt={`${wohnung.titel} ${index + 1}`}
                                  className="w-full h-full object-cover"
                                />
                              </div>
                            ))}
                          </div>
                        )}
                      </div>

                      {/* Price Box */}
                      <div className="bg-gradient-to-br from-blue-50 to-blue-100 rounded-xl p-6">
                        <div>
                          <p className="text-gray-600 text-sm mb-2">Preis pro Nacht</p>
                          <p className="text-4xl font-bold text-blue-600 mb-4">{pricePerNight}€</p>
                          <p className="text-xs text-gray-500 mb-4">(für {people} {parseInt(people) === 1 ? 'Person' : 'Personen'})</p>
                          <div className="space-y-2 text-sm text-gray-700">
                            <p>+ {cleaningFee}€ Endreinigung</p>
                            
                            {getEarlyBookingDiscount() > 0 ? (
                              <>
                                <div className="pt-2 border-t border-blue-200">
                                  <p className="font-semibold">Nettosumme: {baseSum.toFixed(2).replace('.', ',')} €</p>
                                  <p className="text-green-700">- 10% Rabatt: {(baseSum * 0.10).toFixed(2).replace('.', ',')} €</p>
                                  <p className="font-semibold">Zwischensumme: {(baseSum * 0.90).toFixed(2).replace('.', ',')} €</p>
                                  <p>+ 7% MwSt.: {(baseSum * 0.90 * 0.07).toFixed(2).replace('.', ',')} €</p>
                                  <p className="pt-2 border-t border-green-300">
                                    <strong className="text-green-800 text-lg">
                                      Rechnungsbetrag: {(baseSum * 0.90 * 1.07).toFixed(2).replace('.', ',')} €
                                    </strong>
                                  </p>
                                </div>
                              </>
                            ) : (
                              <>
                                <p className="pt-2 border-t border-blue-200 font-semibold">Summe: {baseSum}€</p>
                                <p className="pt-2 border-t border-blue-200 font-semibold">Nettosumme: {baseSum.toFixed(2).replace('.', ',')} €</p>
                                <p>+ 7% MwSt.: {(baseSum * 0.07).toFixed(2).replace('.', ',')} €</p>
                                <p className="pt-2 border-t border-blue-300">
                                  <strong className="text-lg">
                                    Rechnungsbetrag: {(baseSum * 1.07).toFixed(2).replace('.', ',')} €
                                  </strong>
                                </p>
                              </>
                            )}
                          </div>
                        </div>

                        <button 
                          onClick={() => handleSelectWohnung(key)}
                          disabled={!isAvailable}
                          className={`mt-6 w-full font-bold py-3 px-4 rounded-xl transition shadow-lg ${
                            isAvailable
                              ? "bg-green-600 text-white hover:bg-green-700"
                              : "bg-gray-200 text-gray-500 cursor-not-allowed"
                          }`}
                        >
                          {isAvailable ? "✓ Diese Wohnung buchen" : "Ausgebucht"}
                        </button>
                      </div>
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
          className="fixed inset-0 bg-black bg-opacity-90 flex items-center justify-center p-4 z-50"
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
                className="absolute left-0 top-1/2 transform -translate-y-1/2 bg-white bg-opacity-50 hover:bg-opacity-75 text-black p-2 rounded-full"
                onClick={() => {
                  const currentIndex = wohnung.images.findIndex(
                    (img) => img === selectedImage.image
                  );
                  const prevIndex =
                    (currentIndex - 1 + wohnung.images.length) % wohnung.images.length;
                  setSelectedImage({
                    image: wohnung.images[prevIndex],
                    folder: selectedImage.folder,
                    titel: selectedImage.titel,
                  });
                }}
              >
                ◀
              </button>
              <img
                src={`/${selectedImage.folder}/${selectedImage.image}?v=${APP_VERSION}`}
                alt={selectedImage.titel}
                className="w-full h-auto max-h-[80vh] object-contain rounded-lg"
              />
              <button
                className="absolute right-0 top-1/2 transform -translate-y-1/2 bg-white bg-opacity-50 hover:bg-opacity-75 text-black p-2 rounded-full"
                onClick={() => {
                  const currentIndex = wohnung.images.findIndex(
                    (img) => img === selectedImage.image
                  );
                  const nextIndex = (currentIndex + 1) % wohnung.images.length;
                  setSelectedImage({
                    image: wohnung.images[nextIndex],
                    folder: selectedImage.folder,
                    titel: selectedImage.titel,
                  });
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
