import { useState, useEffect } from 'react';
import { getApiUrl } from '../utils/api';

export default function NewBookingForm({ auth, onClose, onSuccess }) {
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    phone: '',
    company: '',
    street: '',
    zip: '',
    city: '',
    wohnung: 'hackerberg',
    wohnungLabel: 'Wohnung Hackerberg',
    startDate: '',
    endDate: '',
    nights: 0,
    people: 1,
    pricePerNight: 0,
    cleaningFee: 0,
    subtotal: 0,
    discount: 0,
    vat: 0,
    total: 0,
    bookingStatus: 'confirmed',
    paymentStatus: 'pending',
    checkInTime: '15:00',
    checkOutTime: '10:00'
  });
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [discountPercent, setDiscountPercent] = useState(0);

  const wohnungen = {
    hackerberg: 'Wohnung Hackerberg',
    neubau: 'Wohnung Frühlingstraße',
    kombi: 'Kombi (beide)'
  };

  // Recalculate totals whenever relevant fields change
  useEffect(() => {
    const nights = formData.nights || 0;
    const pricePerNight = formData.pricePerNight || 0;
    const cleaningFee = formData.cleaningFee || 0;
    const vat = formData.vat || 0;

    // Berechne Zwischensumme
    const subtotal = nights * pricePerNight + cleaningFee;
    
    // Berechne Rabatt basierend auf Prozentsatz
    const discountAmount = subtotal * (discountPercent / 100);
    
    // Berechne Gesamtsumme
    const total = subtotal - discountAmount + vat;

    setFormData(prev => ({
      ...prev,
      subtotal: Math.round(subtotal * 100) / 100,
      discount: Math.round(discountAmount * 100) / 100,
      total: Math.round(total * 100) / 100
    }));
  }, [formData.startDate, formData.endDate, formData.nights, formData.pricePerNight, formData.cleaningFee, formData.vat, discountPercent]);

  const handleChange = (e) => {
    const { name, value } = e.target;
    const newData = { ...formData };
    
    if (name === 'wohnung') {
      newData.wohnung = value;
      newData.wohnungLabel = wohnungen[value];
    } else if (name === 'startDate' || name === 'endDate') {
      newData[name] = value;
      
      // Berechne Nächte wenn beide Daten gesetzt sind
      if (newData.startDate && newData.endDate) {
        const start = new Date(newData.startDate);
        const end = new Date(newData.endDate);
        newData.nights = Math.ceil((end - start) / (1000 * 60 * 60 * 24));
      }
    } else if (['people', 'pricePerNight', 'cleaningFee', 'vat'].includes(name)) {
      newData[name] = Number(value);
    } else {
      newData[name] = value;
    }
    
    setFormData(newData);
  };

  const handleDiscountPercentChange = (e) => {
    const percent = e.target.value === '' ? 0 : Math.max(0, Math.min(100, Number(e.target.value)));
    setDiscountPercent(percent);
  };

  const handleSave = async () => {
    setSaving(true);
    setError('');

    if (!formData.name || !formData.email || !formData.startDate || !formData.endDate) {
      setError('Bitte füllen Sie alle erforderlichen Felder aus');
      setSaving(false);
      return;
    }

    try {
      const apiUrl = getApiUrl();
      const response = await fetch(`${apiUrl}/bookings`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Basic ${auth}`
        },
        body: JSON.stringify(formData)
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

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
      <div className="bg-white rounded-lg max-w-2xl w-full max-h-[90vh] overflow-y-auto">
        <div className="sticky top-0 bg-white border-b p-6 flex justify-between items-center">
          <h2 className="text-2xl font-bold">Neue Buchung erstellen</h2>
          <button onClick={onClose} className="text-gray-500 hover:text-gray-700 text-2xl">✕</button>
        </div>

        <div className="p-6 space-y-4">
          {error && (
            <div className="bg-red-50 border border-red-200 text-red-700 p-3 rounded">
              {error}
            </div>
          )}

          <div className="grid grid-cols-2 gap-4">
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
              <label className="block text-sm font-medium mb-1">Personen *</label>
              <input
                type="number"
                name="people"
                value={formData.people}
                onChange={handleChange}
                min="1"
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
                name="vat"
                value={formData.vat}
                onChange={handleChange}
                step="0.01"
                min="0"
                className="w-full border rounded px-3 py-2"
              />
            </div>

            <div className="col-span-2 bg-green-50 p-4 rounded border-2 border-green-400">
              <div className="text-lg font-bold text-green-900">
                Gesamtbetrag: €{formData.total.toFixed(2)}
              </div>
              <div className="text-sm text-green-700 mt-2">
                = (€{formData.subtotal.toFixed(2)} - {discountPercent}% Rabatt) + MwSt €{formData.vat.toFixed(2)}
              </div>
            </div>
          </div>
        </div>

        <div className="sticky bottom-0 bg-gray-50 border-t p-6 flex gap-3 justify-end">
          <button
            onClick={onClose}
            className="bg-gray-200 hover:bg-gray-300 text-gray-800 font-semibold py-2 px-4 rounded"
            disabled={saving}
          >
            Abbrechen
          </button>
          <button
            onClick={handleSave}
            className="bg-green-600 hover:bg-green-700 text-white font-semibold py-2 px-4 rounded"
            disabled={saving}
          >
            {saving ? 'Erstellt...' : 'Buchung erstellen'}
          </button>
        </div>
      </div>
    </div>
  );
}
