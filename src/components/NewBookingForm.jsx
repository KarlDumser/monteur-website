import { useState, useEffect, useRef } from 'react';
import { getApiUrl } from '../utils/api';
import { EU_COUNTRIES, getCountryDisplayName } from '../utils/addressSchemas';

export default function NewBookingForm({ auth, customers = [], onClose, onSuccess }) {
  const [formData, setFormData] = useState({
    customerId: '',
    name: '',
    email: '',
    phone: '',
    company: '',
    street: '',
    addressLine2: '',
    zip: '',
    city: '',
    country: 'DE',
    countryLabel: getCountryDisplayName('DE', 'de'),
    wohnung: 'hackerberg',
    wohnungLabel: 'Wohnung Hackerberg',
    startDate: '',
    endDate: '',
    nights: 0,
    people: 1,
    pricePerNight: 0,
    cleaningFee: 0,
    cleaningBufferDays: 3,
    subtotal: 0,
    discount: 0,
    vat: 0,
    total: 0,
    bookingStatus: 'confirmed',
    paymentStatus: 'pending',
    sendConfirmationEmail: true,
    checkInTime: '15:00',
    checkOutTime: '10:00'
  });
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [discountPercent, setDiscountPercent] = useState(0);
  const [countdownOpen, setCountdownOpen] = useState(false);
  const [countdown, setCountdown] = useState(20);
  const countdownIntervalRef = useRef(null);
  const countdownTimeoutRef = useRef(null);

  const wohnungen = {
    hackerberg: 'Wohnung Hackerberg',
    neubau: 'Wohnung Frühlingstraße',
    kombi: 'Kombi (beide)'
  };

  useEffect(() => {
    return () => {
      if (countdownIntervalRef.current) {
        clearInterval(countdownIntervalRef.current);
      }
      if (countdownTimeoutRef.current) {
        clearTimeout(countdownTimeoutRef.current);
      }
    };
  }, []);

  // Recalculate totals whenever relevant fields change
  useEffect(() => {
    const nights = Number(formData.nights) || 0;
    const pricePerNight = Number(formData.pricePerNight) || 0;
    const cleaningFee = Number(formData.cleaningFee) || 0;
    const discountRate = discountPercent === '' ? 0 : Number(discountPercent) || 0;

    // Berechne Zwischensumme
    const subtotal = nights * pricePerNight + cleaningFee;
    
    // Berechne Rabatt basierend auf Prozentsatz
    const discountAmount = subtotal * (discountRate / 100);

    // Berechne MwSt (immer 7%)
    const vat = (subtotal - discountAmount) * 0.07;
    
    // Berechne Gesamtsumme
    const total = subtotal - discountAmount + vat;

    setFormData(prev => ({
      ...prev,
      subtotal: Math.round(subtotal * 100) / 100,
      discount: Math.round(discountAmount * 100) / 100,
      vat: Math.round(vat * 100) / 100,
      total: Math.round(total * 100) / 100
    }));
  }, [formData.startDate, formData.endDate, formData.nights, formData.pricePerNight, formData.cleaningFee, discountPercent]);

  const handleChange = (e) => {
    const { name, value, type, checked } = e.target;
    const newData = { ...formData };

    if (type === 'checkbox') {
      newData[name] = checked;
      setFormData(newData);
      return;
    }
    
    if (name === 'wohnung') {
      newData.wohnung = value;
      newData.wohnungLabel = wohnungen[value];
    } else if (name === 'country') {
      newData.country = value;
      newData.countryLabel = getCountryDisplayName(value, 'de');
    } else if (name === 'startDate' || name === 'endDate') {
      newData[name] = value;
      
      // Berechne Nächte wenn beide Daten gesetzt sind
      if (newData.startDate && newData.endDate) {
        const start = new Date(newData.startDate);
        const end = new Date(newData.endDate);
        newData.nights = Math.ceil((end - start) / (1000 * 60 * 60 * 24));
      }
    } else if (['people', 'pricePerNight', 'cleaningFee', 'cleaningBufferDays'].includes(name)) {
      if (value === '') {
        newData[name] = '';
      } else {
        const numberValue = Number(value);
        if (name === 'people') {
          newData[name] = Math.max(1, Math.min(11, Math.floor(numberValue || 0)));
        } else if (name === 'cleaningBufferDays') {
          newData[name] = Math.max(1, Math.min(30, Math.floor(numberValue || 0)));
        } else {
          newData[name] = Math.max(0, numberValue || 0);
        }
      }
    } else {
      newData[name] = value;
    }
    
    setFormData(newData);
  };

  const handleDiscountPercentChange = (e) => {
    const percent = e.target.value === '' ? '' : Math.max(0, Math.min(100, Number(e.target.value)));
    setDiscountPercent(percent);
  };

  const formatDateForInput = (date) => {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  };

  const fillExampleData = () => {
    const start = new Date();
    start.setDate(start.getDate() + 7);

    const end = new Date(start);
    end.setDate(end.getDate() + 14);

    const startDate = formatDateForInput(start);
    const endDate = formatDateForInput(end);
    const nights = Math.ceil((new Date(endDate) - new Date(startDate)) / (1000 * 60 * 60 * 24));

    setFormData((prev) => ({
      ...prev,
      customerId: '',
      name: 'Max Mustermann',
      email: 'max.mustermann@example.com',
      phone: '015221557400',
      company: 'Musterbau GmbH',
      street: 'Musterstraße 12',
      addressLine2: '2. OG links',
      zip: '82152',
      city: 'Krailling',
      country: 'DE',
      countryLabel: getCountryDisplayName('DE', 'de'),
      wohnung: 'hackerberg',
      wohnungLabel: wohnungen.hackerberg,
      startDate,
      endDate,
      nights,
      people: 4,
      pricePerNight: 100,
      cleaningFee: 100,
      cleaningBufferDays: 3,
      bookingStatus: 'confirmed',
      paymentStatus: 'pending',
      checkInTime: '15:00',
      checkOutTime: '10:00'
    }));

    setDiscountPercent(0);
    setError('');
  };

  const clearCountdown = () => {
    if (countdownIntervalRef.current) {
      clearInterval(countdownIntervalRef.current);
      countdownIntervalRef.current = null;
    }
    if (countdownTimeoutRef.current) {
      clearTimeout(countdownTimeoutRef.current);
      countdownTimeoutRef.current = null;
    }
  };

  const applyCustomerToForm = (customerId) => {
    const selectedCustomer = customers.find((customer) => String(customer._id) === String(customerId));

    if (!selectedCustomer) {
      setFormData((prev) => ({
        ...prev,
        customerId: ''
      }));
      return;
    }

    setFormData((prev) => ({
      ...prev,
      customerId: String(selectedCustomer._id),
      name: selectedCustomer.contactPerson || selectedCustomer.name || prev.name,
      email: selectedCustomer.email || prev.email,
      phone: selectedCustomer.phone || selectedCustomer.mobile || prev.phone,
      company: selectedCustomer.name || prev.company
    }));
  };

  const executeSave = async () => {
    clearCountdown();
    setCountdownOpen(false);
    setSaving(true);
    setError('');

    if (!formData.name || !formData.email || !formData.startDate || !formData.endDate) {
      setError('Bitte füllen Sie alle erforderlichen Felder aus');
      setSaving(false);
      return;
    }

    const people = Number(formData.people);
    if (!Number.isInteger(people) || people < 1 || people > 11) {
      setError('Personenanzahl muss zwischen 1 und 11 liegen');
      setSaving(false);
      return;
    }

    const payload = {
      ...formData,
      customerId: formData.customerId || null,
      people,
      nights: Number(formData.nights) || 0,
      pricePerNight: Number(formData.pricePerNight) || 0,
      cleaningFee: Number(formData.cleaningFee) || 0,
      cleaningBufferDays: Number(formData.cleaningBufferDays) || 3,
      subtotal: Number(formData.subtotal) || 0,
      discount: Number(formData.discount) || 0,
      vat: Number(formData.vat) || 0,
      total: Number(formData.total) || 0
    };

    try {
      const apiUrl = getApiUrl();
      const response = await fetch(`${apiUrl}/admin/bookings`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Basic ${auth}`
        },
        body: JSON.stringify(payload)
      });

      if (!response.ok) {
        const errData = await response.json();
        throw new Error(errData.error || 'Fehler beim Erstellen der Buchung');
      }

      const newBooking = await response.json();
      onSuccess(newBooking);
      onClose();
    } catch (err) {
      setError(err.message);
    } finally {
      setSaving(false);
    }
  };

  const startSaveCountdown = () => {
    setError('');

    if (!formData.name || !formData.email || !formData.startDate || !formData.endDate) {
      setError('Bitte füllen Sie alle erforderlichen Felder aus');
      return;
    }

    const people = Number(formData.people);
    if (!Number.isInteger(people) || people < 1 || people > 11) {
      setError('Personenanzahl muss zwischen 1 und 11 liegen');
      return;
    }

    setCountdown(20);
    setCountdownOpen(true);
    clearCountdown();

    countdownIntervalRef.current = setInterval(() => {
      setCountdown((prev) => (prev > 0 ? prev - 1 : 0));
    }, 1000);

    countdownTimeoutRef.current = setTimeout(() => {
      clearCountdown();
      executeSave();
    }, 20000);
  };

  const cancelSaveCountdown = () => {
    clearCountdown();
    setCountdownOpen(false);
    setCountdown(20);
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
      <div className="bg-white rounded-lg max-w-2xl w-full max-h-[90vh] overflow-y-auto">
        <div className="sticky top-0 bg-white border-b p-6 flex justify-between items-center">
          <h2 className="text-2xl font-bold">Neue Buchung erstellen</h2>
          <button onClick={() => { cancelSaveCountdown(); onClose(); }} className="text-gray-500 hover:text-gray-700 text-2xl">✕</button>
        </div>

        <div className="p-6 space-y-4">
          {error && (
            <div className="bg-red-50 border border-red-200 text-red-700 p-3 rounded">
              {error}
            </div>
          )}

          <div className="grid grid-cols-2 gap-4">
            <div className="col-span-2">
              <label className="block text-sm font-medium mb-1">Kunde aus Datenbank wählen</label>
              <select
                name="customerId"
                value={formData.customerId}
                onChange={(e) => applyCustomerToForm(e.target.value)}
                className="w-full border rounded px-3 py-2"
              >
                <option value="">- Kein Kunde vorauswählen -</option>
                {customers.map((customer) => (
                  <option key={customer._id} value={customer._id}>
                    {(customer.customerNumber || '---')} · {customer.name} ({customer.email})
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium mb-1">Name *</label>
              <input
                type="text"
                name="name"
                placeholder="Kundenname"
                value={formData.name}
                onChange={handleChange}
                className="w-full border rounded px-3 py-2"
              />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">Email *</label>
              <input
                type="email"
                name="email"
                placeholder="kunde@example.com"
                value={formData.email}
                onChange={handleChange}
                className="w-full border rounded px-3 py-2"
              />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">Telefon</label>
              <input
                type="tel"
                name="phone"
                placeholder="+49 123 456789"
                value={formData.phone}
                onChange={handleChange}
                className="w-full border rounded px-3 py-2"
              />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">Firma</label>
              <input
                type="text"
                name="company"
                placeholder="Firmenname"
                value={formData.company}
                onChange={handleChange}
                className="w-full border rounded px-3 py-2"
              />
            </div>
            <div className="col-span-2">
              <label className="block text-sm font-medium mb-1">Straße</label>
              <input
                type="text"
                name="street"
                placeholder="Straße Hausnummer"
                value={formData.street}
                onChange={handleChange}
                className="w-full border rounded px-3 py-2"
              />
            </div>
            <div className="col-span-2">
              <label className="block text-sm font-medium mb-1">Adresszeile 2 (optional)</label>
              <input
                type="text"
                name="addressLine2"
                placeholder="z.B. Firma, Stockwerk, Einheit"
                value={formData.addressLine2 || ''}
                onChange={handleChange}
                className="w-full border rounded px-3 py-2"
              />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">PLZ</label>
              <input
                type="text"
                name="zip"
                placeholder="12345"
                value={formData.zip}
                onChange={handleChange}
                className="w-full border rounded px-3 py-2"
              />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">Land</label>
              <select
                name="country"
                value={formData.country || 'DE'}
                onChange={handleChange}
                className="w-full border rounded px-3 py-2"
              >
                {EU_COUNTRIES.map((code) => (
                  <option key={code} value={code}>
                    {getCountryDisplayName(code, 'de')}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">Stadt</label>
              <input
                type="text"
                name="city"
                placeholder="Stadt"
                value={formData.city}
                onChange={handleChange}
                className="w-full border rounded px-3 py-2"
              />
            </div>

            <div>
              <label className="block text-sm font-medium mb-1">Wohnung *</label>
              <select
                name="wohnung"
                value={formData.wohnung}
                onChange={handleChange}
                className="w-full border rounded px-3 py-2"
              >
                <option value="hackerberg">Wohnung Hackerberg</option>
                <option value="neubau">Wohnung Frühlingstraße</option>
                <option value="kombi">Kombi (beide)</option>
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">Check-in</label>
              <input
                type="time"
                name="checkInTime"
                value={formData.checkInTime}
                onChange={handleChange}
                className="w-full border rounded px-3 py-2"
              />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">Check-out</label>
              <input
                type="time"
                name="checkOutTime"
                value={formData.checkOutTime}
                onChange={handleChange}
                className="w-full border rounded px-3 py-2"
              />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">Personen *</label>
              <input
                type="number"
                name="people"
                value={formData.people}
                onChange={handleChange}
                min="1"
                max="11"
                className="w-full border rounded px-3 py-2"
              />
            </div>

            <div>
              <label className="block text-sm font-medium mb-1">Startdatum *</label>
              <input
                type="date"
                name="startDate"
                value={formData.startDate}
                onChange={handleChange}
                className="w-full border rounded px-3 py-2"
              />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">Enddatum *</label>
              <input
                type="date"
                name="endDate"
                value={formData.endDate}
                onChange={handleChange}
                className="w-full border rounded px-3 py-2"
              />
            </div>

            <div className="text-sm text-gray-600 col-span-2">
              Nächte: {formData.nights} | Zwischensumme: €{formData.subtotal.toFixed(2)}
            </div>

            <div>
              <label className="block text-sm font-medium mb-1">Preis pro Nacht (€)</label>
              <input
                type="number"
                name="pricePerNight"
                value={formData.pricePerNight}
                onChange={handleChange}
                step="0.01"
                min="0"
                className="w-full border rounded px-3 py-2"
              />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">Reinigungsgebühr (€)</label>
              <input
                type="number"
                name="cleaningFee"
                value={formData.cleaningFee}
                onChange={handleChange}
                step="0.01"
                min="0"
                className="w-full border rounded px-3 py-2"
              />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">Reinigungs-Sperrtage nach Abreise</label>
              <input
                type="number"
                name="cleaningBufferDays"
                value={formData.cleaningBufferDays}
                onChange={handleChange}
                min="1"
                max="30"
                className="w-full border rounded px-3 py-2"
              />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">Rabatt (%)</label>
              <input
                type="number"
                value={discountPercent}
                onChange={handleDiscountPercentChange}
                min="0"
                max="100"
                step="0.1"
                className="w-full border rounded px-3 py-2"
              />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">Rabatt (€) - Berechnet</label>
              <input
                type="number"
                value={formData.discount}
                disabled
                className="w-full border rounded px-3 py-2 bg-gray-100 text-gray-600 cursor-not-allowed"
              />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">MwSt (€)</label>
              <input
                type="number"
                value={formData.vat}
                step="0.01"
                disabled
                className="w-full border rounded px-3 py-2 bg-gray-100 text-gray-600 cursor-not-allowed"
              />
            </div>

            <div className="col-span-2 bg-green-50 p-4 rounded border-2 border-green-400">
              <div className="text-lg font-bold text-green-900">
                Gesamtbetrag: €{formData.total.toFixed(2)}
              </div>
              <div className="text-sm text-green-700 mt-2">
                = (€{formData.subtotal.toFixed(2)} - {discountPercent === '' ? 0 : discountPercent}% Rabatt) + MwSt (7%) €{formData.vat.toFixed(2)}
              </div>
            </div>

            <div className="col-span-2 bg-gray-50 border border-gray-200 rounded p-3">
              <label className="flex items-start gap-3 text-sm text-gray-700 cursor-pointer">
                <input
                  type="checkbox"
                  name="sendConfirmationEmail"
                  checked={!!formData.sendConfirmationEmail}
                  onChange={handleChange}
                  className="mt-1"
                />
                <span>
                  Buchungsbestätigung per E-Mail automatisch versenden
                </span>
              </label>
            </div>
          </div>
        </div>

        <div className="sticky bottom-0 bg-gray-50 border-t p-6 flex gap-3 justify-end">
          <button
            onClick={fillExampleData}
            className="bg-blue-100 hover:bg-blue-200 text-blue-800 font-semibold py-2 px-4 rounded"
            disabled={saving}
            type="button"
          >
            Beispieldaten
          </button>
          <button
            onClick={() => {
              cancelSaveCountdown();
              onClose();
            }}
            className="bg-gray-200 hover:bg-gray-300 text-gray-800 font-semibold py-2 px-4 rounded"
            disabled={saving}
          >
            Abbrechen
          </button>
          <button
            onClick={startSaveCountdown}
            className="bg-green-600 hover:bg-green-700 text-white font-semibold py-2 px-4 rounded"
            disabled={saving}
          >
            {saving
              ? 'Erstellt...'
              : formData.sendConfirmationEmail
                ? 'Jetzt Buchung speichern und E-Mail versenden'
                : 'Jetzt Buchung ohne E-Mail speichern'}
          </button>
        </div>
      </div>

      {countdownOpen && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black bg-opacity-50">
          <div className="bg-white rounded-2xl shadow-xl p-6 max-w-md w-full">
            <h3 className="text-xl font-bold mb-2">Sicherheits-Countdown</h3>
            <p className="text-gray-700 mb-3">
              Die Buchung wird in <strong>{countdown} Sekunden</strong> gespeichert
              {formData.sendConfirmationEmail ? ' und die Buchungsbestätigung per E-Mail versendet.' : ', ohne E-Mail-Versand.'}
            </p>
            <p className="text-sm text-amber-700 bg-amber-50 border border-amber-200 rounded p-3 mb-4">
              Falls ein Fehler vorliegt, jetzt abbrechen. Nach Ausführung wird die Buchung sofort erstellt
              {formData.sendConfirmationEmail ? ' und die E-Mail gesendet.' : '.'}
            </p>
            <div className="flex gap-3">
              <button
                type="button"
                onClick={cancelSaveCountdown}
                className="flex-1 bg-gray-300 hover:bg-gray-400 text-gray-800 font-bold py-2 px-4 rounded-lg"
              >
                Abbrechen
              </button>
              <button
                type="button"
                disabled={saving}
                onClick={() => {
                  clearCountdown();
                  executeSave();
                }}
                className="flex-1 bg-red-600 hover:bg-red-700 disabled:bg-red-300 text-white font-bold py-2 px-4 rounded-lg"
              >
                Jetzt sofort ausführen
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
