import { useState, useEffect } from 'react';
import { getApiUrl } from '../utils/api';
import { EU_COUNTRIES, getCountryDisplayName } from '../utils/addressSchemas';

const getAutoPriceByPeople = (peopleValue) => {
  const people = Number(peopleValue) || 0;
  if (people <= 4) return 100;
  if (people === 5) return 105;
  return 110;
};

export default function BookingEditor({ booking, auth, onClose, onSave }) {
  const [formData, setFormData] = useState({
    ...booking,
    country: booking.country || 'DE',
    countryLabel: booking.countryLabel || getCountryDisplayName(booking.country || 'DE', 'de'),
    addressLine2: booking.addressLine2 || ''
  });
  const [saving, setSaving] = useState(false);
  const [sendingEmail, setSendingEmail] = useState(false);
  const [error, setError] = useState('');
  const [successMessage, setSuccessMessage] = useState('');
  const [discountPercent, setDiscountPercent] = useState(
    booking.subtotal && booking.discount ? (booking.discount / booking.subtotal) * 100 : 0
  );

  // Berechne Nächte wenn Daten sich ändern
  useEffect(() => {
    if (formData.startDate && formData.endDate) {
      const start = new Date(formData.startDate);
      const end = new Date(formData.endDate);
      const nights = Math.ceil((end - start) / (1000 * 60 * 60 * 24));
      
      setFormData(prev => ({
        ...prev,
        nights: Math.max(1, nights) // Minimum 1 Nacht
      }));
    }
  }, [formData.startDate, formData.endDate]);

  // Berechne Summen wenn Preise/Nächte/Rabatt sich ändern
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
  }, [formData.nights, formData.pricePerNight, formData.cleaningFee, discountPercent]);

  const handleChange = (e) => {
    const { name, value } = e.target;

    if (name === 'country') {
      setFormData(prev => ({
        ...prev,
        country: value,
        countryLabel: getCountryDisplayName(value, 'de')
      }));
      return;
    }

    if (['people', 'pricePerNight', 'cleaningFee', 'nights', 'cleaningBufferDays'].includes(name)) {
      if (value === '') {
        setFormData(prev => ({
          ...prev,
          [name]: ''
        }));
        return;
      }

      const numberValue = Number(value);

      if (name === 'people') {
        setFormData(prev => ({
          ...prev,
          [name]: Math.max(1, Math.min(11, Math.floor(numberValue || 0))),
          pricePerNight: getAutoPriceByPeople(numberValue)
        }));
        return;
      }

      if (name === 'cleaningBufferDays') {
        setFormData(prev => ({
          ...prev,
          [name]: Math.max(0, Math.min(30, Math.floor(numberValue || 0)))
        }));
        return;
      }

      setFormData(prev => ({
        ...prev,
        [name]: Math.max(0, numberValue || 0)
      }));
      return;
    }
    
    setFormData(prev => ({
      ...prev,
      [name]: name.includes('Date') ? value : value
    }));
  };

  const handleDiscountPercentChange = (e) => {
    const percent = e.target.value === '' ? '' : Math.max(0, Math.min(100, Number(e.target.value)));
    setDiscountPercent(percent);
  };

  const handleSave = async () => {
    setSaving(true);
    setError('');

    const people = Number(formData.people);
    if (!Number.isInteger(people) || people < 1 || people > 11) {
      setError('Personenanzahl muss zwischen 1 und 11 liegen');
      setSaving(false);
      return;
    }

    const payload = {
      ...formData,
      people,
      nights: Number(formData.nights) || 0,
      pricePerNight: Number(formData.pricePerNight) || 0,
      cleaningFee: Number(formData.cleaningFee) || 0,
      subtotal: Number(formData.subtotal) || 0,
      discount: Number(formData.discount) || 0,
      vat: Number(formData.vat) || 0,
      total: Number(formData.total) || 0
    };

    payload.cleaningBufferDays = Number.isFinite(Number(formData.cleaningBufferDays))
      ? Number(formData.cleaningBufferDays)
      : 3;

    try {
      const apiUrl = getApiUrl();
      const response = await fetch(`${apiUrl}/bookings/${booking._id}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Basic ${auth}`
        },
        body: JSON.stringify(payload)
      });

      if (!response.ok) {
        throw new Error('Fehler beim Speichern');
      }

      const updated = await response.json();
      onSave(updated);
      onClose();
    } catch (err) {
      setError(err.message);
    } finally {
      setSaving(false);
    }
  };

  const handleResendInvoice = async () => {
    try {
      setSendingEmail(true);
      setError('');
      setSuccessMessage('');

      const apiUrl = getApiUrl();
      
      // Mit 30 Sekunden Timeout
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 30000);

      try {
        const response = await fetch(`${apiUrl}/bookings/${booking._id}/send-invoice-email`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Basic ${auth}`
          },
          body: JSON.stringify({}),
          signal: controller.signal
        });

        clearTimeout(timeoutId);

        if (!response.ok) {
          const data = await response.json();
          throw new Error(data.message || data.error || 'Fehler beim Versenden der E-Mail');
        }

        const result = await response.json();
        setSuccessMessage('Rechnung erfolgreich per E-Mail versendet! ✓');

        // Nachricht nach 3 Sekunden ausblenden
        setTimeout(() => setSuccessMessage(''), 3000);
      } catch (fetchError) {
        clearTimeout(timeoutId);
        if (fetchError.name === 'AbortError') {
          throw new Error('Zeitüberschreitung beim Versenden (30s) - Server antwortet nicht. Kontaktieren Sie den Administrator.');
        }
        throw fetchError;
      }
    } catch (err) {
      setError(err.message);
      console.error('Fehler beim Versenden der E-Mail:', err);
    } finally {
      setSendingEmail(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
      <div className="bg-white rounded-lg max-w-2xl w-full max-h-[90vh] overflow-y-auto">
        <div className="sticky top-0 bg-white border-b p-6 flex justify-between items-center">
          <h2 className="text-2xl font-bold">Buchung bearbeiten</h2>
          <button onClick={onClose} className="text-gray-500 hover:text-gray-700 text-2xl">✕</button>
        </div>

        <div className="p-6 space-y-4">
          {error && (
            <div className="bg-red-50 border border-red-200 text-red-700 p-3 rounded">
              {error}
            </div>
          )}

          {successMessage && (
            <div className="bg-green-50 border border-green-200 text-green-700 p-3 rounded">
              {successMessage}
            </div>
          )}

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium mb-1">Name *</label>
              <input
                type="text"
                name="name"
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
                value={formData.email}
                onChange={handleChange}
                className="w-full border rounded px-3 py-2"
              />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">Telefon *</label>
              <input
                type="tel"
                name="phone"
                value={formData.phone}
                onChange={handleChange}
                className="w-full border rounded px-3 py-2"
              />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">Firma *</label>
              <input
                type="text"
                name="company"
                value={formData.company}
                onChange={handleChange}
                className="w-full border rounded px-3 py-2"
              />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">USt-IdNr. (optional)</label>
              <input
                type="text"
                name="vatId"
                value={formData.vatId || ''}
                onChange={handleChange}
                className="w-full border rounded px-3 py-2"
              />
            </div>
            <div className="col-span-2">
              <label className="block text-sm font-medium mb-1">Straße *</label>
              <input
                type="text"
                name="street"
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
                value={formData.addressLine2 || ''}
                onChange={handleChange}
                className="w-full border rounded px-3 py-2"
              />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">PLZ *</label>
              <input
                type="text"
                name="zip"
                value={formData.zip}
                onChange={handleChange}
                className="w-full border rounded px-3 py-2"
              />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">Land *</label>
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
              <label className="block text-sm font-medium mb-1">Stadt *</label>
              <input
                type="text"
                name="city"
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
              <label className="block text-sm font-medium mb-1">Personen * (1-11)</label>
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
              <label className="block text-sm font-medium mb-1">Check-in</label>
              <input
                type="time"
                name="checkInTime"
                value={formData.checkInTime || '16:00'}
                onChange={handleChange}
                className="w-full border rounded px-3 py-2"
              />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">Check-out</label>
              <input
                type="time"
                name="checkOutTime"
                value={formData.checkOutTime || '10:00'}
                onChange={handleChange}
                className="w-full border rounded px-3 py-2"
              />
            </div>

            <div>
              <label className="block text-sm font-medium mb-1">Buchungsdatum *</label>
              <input
                type="date"
                name="createdAt"
                value={formData.createdAt ? new Date(formData.createdAt).toISOString().slice(0, 10) : ''}
                onChange={(e) => {
                  if (e.target.value) {
                    const date = new Date(e.target.value + 'T00:00:00Z');
                    setFormData(prev => ({
                      ...prev,
                      createdAt: date.toISOString()
                    }));
                  }
                }}
                className="w-full border rounded px-3 py-2"
              />
            </div>

            <div>
              <label className="block text-sm font-medium mb-1">Startdatum *</label>
              <input
                type="date"
                name="startDate"
                value={formData.startDate ? new Date(formData.startDate).toISOString().slice(0, 10) : ''}
                onChange={handleChange}
                className="w-full border rounded px-3 py-2"
              />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">Enddatum *</label>
              <input
                type="date"
                name="endDate"
                value={formData.endDate ? new Date(formData.endDate).toISOString().slice(0, 10) : ''}
                onChange={handleChange}
                className="w-full border rounded px-3 py-2"
              />
            </div>

            <div className="col-span-2 bg-blue-50 p-3 rounded text-sm font-medium">
              Nächte: {formData.nights} | Zwischensumme: €{formData.subtotal?.toFixed(2) || '0.00'}
            </div>

            <div>
              <label className="block text-sm font-medium mb-1">Preis pro Nacht (€) *</label>
              <input
                type="number"
                name="pricePerNight"
                value={formData.pricePerNight}
                onChange={handleChange}
                step="0.01"
                className="w-full border rounded px-3 py-2"
              />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">Reinigungsgebühr (€)</label>
              <input
                type="number"
                name="cleaningFee"
                value={formData.cleaningFee ?? ''}
                onChange={handleChange}
                step="0.01"
                className="w-full border rounded px-3 py-2"
              />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">Reinigungs-Sperrtage nach Abreise</label>
              <input
                type="number"
                name="cleaningBufferDays"
                value={formData.cleaningBufferDays ?? ''}
                onChange={handleChange}
                min="0"
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
                value={formData.discount || 0}
                disabled
                className="w-full border rounded px-3 py-2 bg-gray-100 text-gray-600 cursor-not-allowed"
              />
            </div>

            <div>
              <label className="block text-sm font-medium mb-1">MwSt (€)</label>
              <input
                type="number"
                value={formData.vat || 0}
                step="0.01"
                disabled
                className="w-full border rounded px-3 py-2 bg-gray-100 text-gray-600 cursor-not-allowed"
              />
            </div>
            <div className="col-span-2 bg-green-50 p-4 rounded border-2 border-green-400">
              <div className="text-lg font-bold text-green-900">
                Gesamtbetrag: €{formData.total?.toFixed(2) || '0.00'}
              </div>
              <div className="text-sm text-green-700 mt-2">
                = (€{formData.subtotal?.toFixed(2) || '0.00'} - {discountPercent === '' ? 0 : discountPercent}% Rabatt) + MwSt (7%) €{(formData.vat || 0).toFixed(2)}
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium mb-1">Buchungsstatus</label>
              <select
                name="bookingStatus"
                value={formData.bookingStatus}
                onChange={handleChange}
                className="w-full border rounded px-3 py-2"
              >
                <option value="confirmed">Bestätigt</option>
                <option value="cancelled">Storniert</option>
                <option value="completed">Abgeschlossen</option>
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">Zahlungsstatus</label>
              <select
                name="paymentStatus"
                value={formData.paymentStatus}
                onChange={handleChange}
                className="w-full border rounded px-3 py-2"
              >
                <option value="pending">Ausstehend</option>
                <option value="paid">Bezahlt</option>
                <option value="failed">Fehlgeschlagen</option>
                <option value="refunded">Erstattet</option>
              </select>
            </div>
          </div>
        </div>

        <div className="sticky bottom-0 bg-gray-50 border-t p-6 flex gap-3 justify-end">
          <button
            onClick={handleResendInvoice}
            className="bg-purple-600 hover:bg-purple-700 text-white font-semibold py-2 px-4 rounded disabled:opacity-50 disabled:cursor-not-allowed"
            disabled={sendingEmail || saving}
          >
            {sendingEmail ? 'Wird versendet...' : '📨 Rechnung erneut senden'}
          </button>
          <button
            onClick={onClose}
            className="bg-gray-200 hover:bg-gray-300 text-gray-800 font-semibold py-2 px-4 rounded"
            disabled={saving || sendingEmail}
          >
            Abbrechen
          </button>
          <button
            onClick={handleSave}
            className="bg-blue-600 hover:bg-blue-700 text-white font-semibold py-2 px-4 rounded"
            disabled={saving || sendingEmail}
          >
            {saving ? 'Speichert...' : 'Speichern'}
          </button>
        </div>
      </div>
    </div>
  );
}

