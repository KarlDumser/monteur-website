import { useState, useEffect } from 'react';
import { getApiUrl } from '../utils/api';

export default function BookingEditor({ booking, auth, onClose, onSave }) {
  const [formData, setFormData] = useState({ ...booking });
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [discountPercent, setDiscountPercent] = useState(
    booking.subtotal && booking.discount ? (booking.discount / booking.subtotal) * 100 : 0
  );

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
  }, [formData.nights, formData.pricePerNight, formData.cleaningFee, formData.vat, discountPercent]);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: name.includes('Date') ? value : (name.includes('people') || name.includes('Price') || name.includes('nights') || name.includes('vat') || name.includes('cleaningFee')) ? (isNaN(value) ? value : Number(value)) : value
    }));
  };

  const handleDiscountPercentChange = (e) => {
    const percent = e.target.value === '' ? 0 : Math.max(0, Math.min(100, Number(e.target.value)));
    setDiscountPercent(percent);
  };

  const handleSave = async () => {
    setSaving(true);
    setError('');
    try {
      const apiUrl = getApiUrl();
      const response = await fetch(`${apiUrl}/bookings/${booking._id}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Basic ${auth}`
        },
        body: JSON.stringify(formData)
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
      const apiUrl = getApiUrl();
      const response = await fetch(`${apiUrl}/bookings/${booking._id}/resend-invoice-data`, {
        headers: { Authorization: `Basic ${auth}` }
      });

      if (!response.ok) throw new Error('Fehler beim Laden der Rechnungsdaten');

      const data = await response.json();
      
      // Outlook mailto Link mit Base64 Anhang öffnen
      const subject = encodeURIComponent(`Aktualisierte Rechnung - Buchung ${booking._id}`);
      const body = encodeURIComponent(data.emailTemplate);
      
      // Öffne Outlook/Mail
      window.location.href = `mailto:${data.recipientEmail}?subject=${subject}&body=${body}`;
      
      // Alternative: Speichere PDF für manuellen Anhang
      const link = document.createElement('a');
      link.href = 'data:application/octet-stream;base64,' + data.base64Invoice;
      link.download = data.fileName;
      link.click();
    } catch (err) {
      setError(err.message);
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
              <label className="block text-sm font-medium mb-1">Personen *</label>
              <input
                type="number"
                name="people"
                value={formData.people}
                onChange={handleChange}
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
                value={formData.cleaningFee || 0}
                onChange={handleChange}
                step="0.01"
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
                name="vat"
                value={formData.vat || 0}
                onChange={handleChange}
                step="0.01"
                className="w-full border rounded px-3 py-2"
              />
            </div>
            <div className="col-span-2 bg-green-50 p-4 rounded border-2 border-green-400">
              <div className="text-lg font-bold text-green-900">
                Gesamtbetrag: €{formData.total?.toFixed(2) || '0.00'}
              </div>
              <div className="text-sm text-green-700 mt-2">
                = (€{formData.subtotal?.toFixed(2) || '0.00'} - {discountPercent}% Rabatt) + MwSt €{(formData.vat || 0).toFixed(2)}
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
            className="bg-purple-600 hover:bg-purple-700 text-white font-semibold py-2 px-4 rounded"
            disabled={saving}
          >
            📨 Rechnung erneut senden
          </button>
          <button
            onClick={onClose}
            className="bg-gray-200 hover:bg-gray-300 text-gray-800 font-semibold py-2 px-4 rounded"
            disabled={saving}
          >
            Abbrechen
          </button>
          <button
            onClick={handleSave}
            className="bg-blue-600 hover:bg-blue-700 text-white font-semibold py-2 px-4 rounded"
            disabled={saving}
          >
            {saving ? 'Speichert...' : 'Speichern'}
          </button>
        </div>
      </div>
    </div>
  );
}

  const handleSave = async () => {
    setSaving(true);
    setError('');
    try {
      const apiUrl = getApiUrl();
      const response = await fetch(`${apiUrl}/bookings/${booking._id}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Basic ${auth}`
        },
        body: JSON.stringify(formData)
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
      const apiUrl = getApiUrl();
      const response = await fetch(`${apiUrl}/bookings/${booking._id}/resend-invoice-data`, {
        headers: { Authorization: `Basic ${auth}` }
      });

      if (!response.ok) throw new Error('Fehler beim Laden der Rechnungsdaten');

      const data = await response.json();
      
      // Outlook mailto Link mit Base64 Anhang öffnen
      const subject = encodeURIComponent(`Aktualisierte Rechnung - Buchung ${booking._id}`);
      const body = encodeURIComponent(data.emailTemplate);
      
      // Öffne Outlook/Mail
      window.location.href = `mailto:${data.recipientEmail}?subject=${subject}&body=${body}`;
      
      // Alternative: Speichere PDF für manuellen Anhang
      const link = document.createElement('a');
      link.href = 'data:application/octet-stream;base64,' + data.base64Invoice;
      link.download = data.fileName;
      link.click();
    } catch (err) {
      setError(err.message);
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
              <label className="block text-sm font-medium mb-1">Personen *</label>
              <input
                type="number"
                name="people"
                value={formData.people}
                onChange={handleChange}
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

            <div>
              <label className="block text-sm font-medium mb-1">Preis pro Nacht (€)</label>
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
                value={formData.cleaningFee || 0}
                onChange={handleChange}
                step="0.01"
                className="w-full border rounded px-3 py-2"
              />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">Rabatt (€)</label>
              <input
                type="number"
                name="discount"
                value={formData.discount || 0}
                onChange={handleChange}
                step="0.01"
                className="w-full border rounded px-3 py-2"
              />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">Summe (€)</label>
              <input
                type="number"
                name="total"
                value={formData.total}
                onChange={handleChange}
                step="0.01"
                className="w-full border rounded px-3 py-2"
              />
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
            className="bg-purple-600 hover:bg-purple-700 text-white font-semibold py-2 px-4 rounded"
            disabled={saving}
          >
            📨 Rechnung erneut senden
          </button>
          <button
            onClick={onClose}
            className="bg-gray-200 hover:bg-gray-300 text-gray-800 font-semibold py-2 px-4 rounded"
            disabled={saving}
          >
            Abbrechen
          </button>
          <button
            onClick={handleSave}
            className="bg-blue-600 hover:bg-blue-700 text-white font-semibold py-2 px-4 rounded"
            disabled={saving}
          >
            {saving ? 'Speichert...' : 'Speichern'}
          </button>
        </div>
      </div>
    </div>
  );
}
