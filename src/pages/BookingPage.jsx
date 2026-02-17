import { useState } from "react";
import { format, addMonths } from "date-fns";
import { DateRange } from "react-date-range";
import "react-date-range/dist/styles.css";
import "react-date-range/dist/theme/default.css";

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
  const [available, setAvailable] = useState([]);
  const [selectedImage, setSelectedImage] = useState(null);

  const belegteZeiten = {
    neubau: ["2025-06-01", "2025-06-30"],
    hackerberg: ["2025-07-01", "2025-07-28"],
  };

  // Berechne Preis basierend auf Anzahl der Mitarbeiter
  const getPricePerNight = () => {
    const numPeople = parseInt(people);
    if (numPeople <= 4) return 100;
    if (numPeople === 5) return 105;
    return 110;
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

  const checkAvailability = () => {
    const start = format(range[0].startDate, "yyyy-MM-dd");
    const end = format(range[0].endDate, "yyyy-MM-dd");
    const dateRange = [start, end];

    const isBelegt = (range, belegung) =>
      range[0] <= belegung[1] && range[1] >= belegung[0];

    const frei = [];
    if (!isBelegt(dateRange, belegteZeiten.neubau)) frei.push("neubau");
    if (!isBelegt(dateRange, belegteZeiten.hackerberg)) frei.push("hackerberg");

    return frei;
  };

  const handleBooking = (e) => {
    e.preventDefault();
    const verfügbar = checkAvailability();
    setAvailable(verfügbar);
    setStep("select");
  };

  const handleSelectWohnung = (wohnungKey) => {
    // Redirect to payment page with booking details
    const nights = Math.max(0, Math.ceil((range[0].endDate - range[0].startDate) / (1000 * 60 * 60 * 24)));
    const pricePerNight = getPricePerNight();
    const subtotal = nights * pricePerNight + 90;
    const discount = getEarlyBookingDiscount();
    const subtotalAfterDiscount = subtotal * (1 - discount);
    const vat = subtotalAfterDiscount * 0.19;
    const total = Math.round(subtotalAfterDiscount + vat);
    
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
      subtotal,
      discount,
      vat: Math.round(vat),
      total
    };
    
    // Save to localStorage for payment page
    localStorage.setItem('bookingInfo', JSON.stringify(bookingInfo));
    
    // Redirect to payment (we'll create this page next)
    window.location.href = '/payment';
  };

  const wohnungen = {
    neubau: {
      titel: "Neubau – Frühligstraße",
      beschreibung:
        "2-Zimmerwohnung mit moderner Ausstattung, Küche, Bad, Garten mit Grillplatz. Ideal für handwerkliche Fachkräfte und Monteure.",
      internet: "WLAN 150 Mbit/s",
      extras: "Garten, Grill, ruhige Lage",
      preis: "110 EUR/Nacht + 90 EUR Endreinigung",
      galerie:
        "https://www.monteurzimmer.de/gaestezimmer/82152-krailling-1422811f39",
      images: [
        ".Zimmer-1.JPG",
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
        ".Wohnzimmer.JPG",
        "Bad.JPG",
        "Balkon.JPG",
        "Eingangsbereich.JPG",
        "Kueche.JPG",
        "Zimmer-1.JPG",
        "Zimmer-2.JPG"
      ],
      folder: "Wohnung-Hackerberg"
    },
  };

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
                max={8}
                value={people}
                onChange={(e) => setPeople(e.target.value)}
                className="w-full border-2 border-gray-300 rounded-xl px-4 py-3 focus:outline-none focus:border-blue-500 transition"
                required
              />
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
                      placeholder="z.B. MSB ebau GmbH"
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
                      placeholder="z.B. Oskar-Messter-Str. 15"
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
                      placeholder="z.B. 85737"
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
                      placeholder="z.B. Ismaning"
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

          {available.length > 0 ? (
            <div className="space-y-6">
              {available.map((key) => {
                const wohnung = wohnungen[key];
                return (
                  <div
                    key={key}
                    className="border-2 border-blue-200 rounded-2xl p-8 shadow-lg bg-white hover:shadow-xl transition"
                  >
                    <div className="grid grid-cols-1 gap-8">
                      {/* Title and Description */}
                      <div>
                        <h2 className="text-3xl font-bold mb-3 text-gray-800">{wohnung.titel}</h2>
                        <p className="text-gray-700 mb-4 leading-relaxed">{wohnung.beschreibung}</p>
                        
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
                        <div className="grid grid-cols-4 md:grid-cols-5 gap-2">
                          {wohnung.images.map((image, index) => (
                            <div
                              key={index}
                              className="bg-gray-200 rounded-lg overflow-hidden h-24 hover:opacity-75 transition cursor-pointer"
                              onClick={() => setSelectedImage({ image, folder: wohnung.folder, titel: wohnung.titel })}
                            >
                              <img
                                src={`/${wohnung.folder}/${image}`}
                                alt={`${wohnung.titel} ${index + 1}`}
                                className="w-full h-full object-cover"
                              />
                            </div>
                          ))}
                        </div>
                      </div>

                      {/* Price Box */}
                      <div className="bg-gradient-to-br from-blue-50 to-blue-100 rounded-xl p-6">
                        <div>
                          <p className="text-gray-600 text-sm mb-2">Preis pro Nacht</p>
                          <p className="text-4xl font-bold text-blue-600 mb-4">{getPricePerNight()}€</p>
                          <p className="text-xs text-gray-500 mb-4">(für {people} {parseInt(people) === 1 ? 'Person' : 'Personen'})</p>
                          <div className="space-y-2 text-sm text-gray-700">
                            <p>+ 90€ Endreinigung</p>
                            
                            {getEarlyBookingDiscount() > 0 ? (
                              <>
                                <div className="pt-2 border-t border-blue-200">
                                  <p className="font-semibold">Summe: {Math.max(0, Math.ceil((range[0].endDate - range[0].startDate) / (1000 * 60 * 60 * 24))) * getPricePerNight() + 90}€</p>
                                  <p className="text-green-700">- 10% Rabatt: {Math.round((Math.max(0, Math.ceil((range[0].endDate - range[0].startDate) / (1000 * 60 * 60 * 24))) * getPricePerNight() + 90) * 0.10)}€</p>
                                  <p className="font-semibold">Zwischensumme: {Math.round((Math.max(0, Math.ceil((range[0].endDate - range[0].startDate) / (1000 * 60 * 60 * 24))) * getPricePerNight() + 90) * 0.90)}€</p>
                                  <p>+ 19% MwSt.: {Math.round((Math.max(0, Math.ceil((range[0].endDate - range[0].startDate) / (1000 * 60 * 60 * 24))) * getPricePerNight() + 90) * 0.90 * 0.19)}€</p>
                                  <p className="pt-2 border-t border-green-300">
                                    <strong className="text-green-800 text-lg">
                                      Total: {Math.round((Math.max(0, Math.ceil((range[0].endDate - range[0].startDate) / (1000 * 60 * 60 * 24))) * getPricePerNight() + 90) * 0.90 * 1.19)}€
                                    </strong>
                                  </p>
                                </div>
                              </>
                            ) : (
                              <>
                                <p className="pt-2 border-t border-blue-200 font-semibold">
                                  Summe: {Math.max(0, Math.ceil((range[0].endDate - range[0].startDate) / (1000 * 60 * 60 * 24))) * getPricePerNight() + 90}€
                                </p>
                                <p>
                                  + 19% MwSt.: {Math.round((Math.max(0, Math.ceil((range[0].endDate - range[0].startDate) / (1000 * 60 * 60 * 24))) * getPricePerNight() + 90) * 0.19)}€
                                </p>
                                <p className="pt-2 border-t border-blue-300">
                                  <strong className="text-lg">
                                    Total: {Math.round((Math.max(0, Math.ceil((range[0].endDate - range[0].startDate) / (1000 * 60 * 60 * 24))) * getPricePerNight() + 90) * 1.19)}€
                                  </strong>
                                </p>
                              </>
                            )}
                          </div>
                        </div>

                        <button 
                          onClick={() => handleSelectWohnung(key)}
                          className="mt-6 w-full bg-green-600 text-white font-bold py-3 px-4 rounded-xl hover:bg-green-700 transition shadow-lg"
                        >
                          ✓ Diese Wohnung buchen
                        </button>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          ) : (
            <div className="bg-red-50 border-2 border-red-200 rounded-2xl p-8 text-center">
              <svg className="w-16 h-16 text-red-400 mx-auto mb-4" fill="currentColor" viewBox="0 0 24 24">
                <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm1 15h-2v-2h2v2zm0-4h-2V7h2v6z" />
              </svg>
              <h3 className="text-2xl font-bold text-red-800 mb-2">Keine Verfügbarkeit</h3>
              <p className="text-red-700 mb-4">
                Leider ist für den gewählten Zeitraum keine Wohnung verfügbar. Bitte wählen Sie einen anderen Zeitraum.
              </p>
              <button
                onClick={() => setStep("form")}
                className="inline-block bg-blue-600 text-white font-semibold py-2 px-6 rounded-lg hover:bg-blue-700 transition"
              >
                ← Zurück zur Datumsauswahl
              </button>
            </div>
          )}
        </div>
      )}

      {/* Image Modal */}
      {selectedImage && (
        <div 
          className="fixed inset-0 bg-black bg-opacity-90 flex items-center justify-center p-4 z-50"
          onClick={() => setSelectedImage(null)}
        >
          <div className="max-w-5xl w-full" onClick={(e) => e.stopPropagation()}>
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-xl font-bold text-white">{selectedImage.titel}</h3>
              <button
                onClick={() => setSelectedImage(null)}
                className="text-white hover:text-gray-300 text-3xl"
              >
                ✕
              </button>
            </div>
            <img
              src={`/${selectedImage.folder}/${selectedImage.image}`}
              alt={selectedImage.titel}
              className="w-full h-auto max-h-[80vh] object-contain rounded-lg"
            />
          </div>
        </div>
      )}
    </div>
  );
}
