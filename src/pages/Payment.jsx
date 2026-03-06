import { useEffect, useState } from 'react';
import { getApiUrl } from '../utils/api.js';

export default function Payment() {
  const [bookingInfo, setBookingInfo] = useState(null);
  const [loading, setLoading] = useState(true);
  const [invoiceLoading, setInvoiceLoading] = useState(false);
  const [invoiceError, setInvoiceError] = useState(null);

  useEffect(() => {
    const info = localStorage.getItem('bookingInfo');
    if (!info) {
      window.location.href = '/booking';
      return;
    }

    const booking = JSON.parse(info);
    setBookingInfo(booking);
    setLoading(false);
  }, []);

  if (loading) {
    return (
      <div className="container mx-auto px-4 py-12 text-center">
        <p className="text-gray-600">Zahlung wird vorbereitet...</p>
      </div>
    );
  }

  if (!bookingInfo) {
    return (
      <div className="container mx-auto px-4 py-12 text-center">
        <p className="text-gray-600">Fehler: Buchungsdaten nicht gefunden</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="container mx-auto px-4 py-12">
        <div className="max-w-2xl mx-auto">
          <h1 className="text-2xl sm:text-4xl font-bold text-gray-800 mb-8 break-words text-center">Buchungsbestätigung</h1>

          <div className="bg-white rounded-lg shadow-lg p-8 space-y-6">
            
            {/* Booking Summary */}
            <div className="border-2 border-blue-200 rounded-lg p-6">
              <h2 className="text-2xl font-bold text-gray-800 mb-4">Buchungsdetails</h2>
              
              {bookingInfo.isPartialBooking && (
                <div className="mb-4 bg-yellow-50 border-l-4 border-yellow-400 p-4">
                  <div className="flex">
                    <div className="flex-shrink-0">
                      <svg className="h-5 w-5 text-yellow-400" viewBox="0 0 20 20" fill="currentColor">
                        <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
                      </svg>
                    </div>
                    <div className="ml-3">
                      <p className="text-sm text-yellow-700">
                        <strong>Teilbuchung:</strong> Sie reservieren den gesamten Zeitraum <strong>{bookingInfo.originalStartDate} – {bookingInfo.originalEndDate}</strong> ({bookingInfo.totalNights} Nächte).
                        <br/>
                        Die erste Rechnung ist für die <strong>ersten 4 Wochen (28 Nächte)</strong>. Für den restlichen Zeitraum erhalten Sie rechtzeitig eine Folgerechnung.
                      </p>
                    </div>
                  </div>
                </div>
              )}
              
              <div className="space-y-3 text-gray-700">
                <div className="flex justify-between">
                  <span>Wohnung:</span>
                  <strong>{bookingInfo.wohnungLabel || bookingInfo.wohnung}</strong>
                </div>
                <div className="flex justify-between">
                  <span>Reservierungszeitraum:</span>
                  <strong>
                    {bookingInfo.isPartialBooking
                      ? `${bookingInfo.originalStartDate} – ${bookingInfo.originalEndDate} (${bookingInfo.totalNights} Nächte)`
                      : `${bookingInfo.startDate} – ${bookingInfo.endDate} (${bookingInfo.nights} Nächte)`}
                  </strong>
                </div>
                <div className="flex justify-between">
                  <span>{bookingInfo.isPartialBooking ? 'Jetzt zu zahlen (Erste 4 Wochen):' : 'Zeitraum:'}</span>
                  <strong>{bookingInfo.startDate} – {bookingInfo.endDate}</strong>
                </div>
                <div className="flex justify-between">
                  <span>{bookingInfo.isPartialBooking ? 'Nächte (dieser Rechnung):' : 'Anzahl Nächte:'}</span>
                  <strong>{bookingInfo.nights}</strong>
                </div>
                <div className="flex justify-between">
                  <span>Personen:</span>
                  <strong>{bookingInfo.people}</strong>
                </div>
              </div>
            </div>

            {/* Guest Info */}
            <div className="border-2 border-gray-300 rounded-lg p-6">
              <h2 className="text-2xl font-bold text-gray-800 mb-4">Gästendaten</h2>
              
              <div className="space-y-3 text-gray-700">
                <div className="flex justify-between">
                  <span>Name:</span>
                  <strong>{bookingInfo.name}</strong>
                </div>
                <div className="flex justify-between">
                  <span>E-Mail:</span>
                  <strong>{bookingInfo.email}</strong>
                </div>
                <div className="flex justify-between">
                  <span>Telefon:</span>
                  <strong>{bookingInfo.phone}</strong>
                </div>
              </div>
            </div>

            {/* Price Summary */}
            <div className="bg-gradient-to-r from-blue-50 to-blue-100 rounded-lg p-6">
              <div className="space-y-3 text-gray-700">
                <div className="flex justify-between">
                  <span>Unterkunft ({bookingInfo.nights} Nächte × {Number(bookingInfo.pricePerNight).toFixed(0)}€):</span>
                  <span>{(bookingInfo.nights * bookingInfo.pricePerNight).toFixed(2).replace('.', ',')}€</span>
                </div>
                <div className="flex justify-between">
                  <span>{bookingInfo.isPartialBooking ? 'monatliche Reinigung' : 'Endreinigung'}:</span>
                  <span>{Number(bookingInfo.cleaningFee ?? 90).toFixed(2).replace('.', ',')}€</span>
                </div>
                
                <div className="border-t pt-3 flex justify-between text-lg">
                  <span>Nettosumme:</span>
                    <strong>{Number(bookingInfo.subtotal).toFixed(2).replace('.', ',')} €</strong>
                </div>

                {bookingInfo.discount > 0 && (
                  <div className="flex justify-between text-green-700">
                    <span>Frühbucherabatt (-10%):</span>
                      <span>-{(bookingInfo.subtotal * bookingInfo.discount).toFixed(2).replace('.', ',')} €</span>
                  </div>
                )}

                <div className="flex justify-between">
                  <span>zzgl. 7% MwSt.:</span>
                    <span>{Number(bookingInfo.vat).toFixed(2).replace('.', ',')} €</span>
                </div>
                
                <div className="border-t pt-3 flex flex-col sm:flex-row justify-between text-2xl font-bold text-blue-800">
                  <span>Rechnungsbetrag:</span>
                  <span className="sm:text-right mt-2 sm:mt-0 block w-full sm:w-auto break-all">{Number(bookingInfo.total).toFixed(2).replace('.', ',')} €</span>
                </div>
              </div>
            </div>

            {/* Payment Form */}
            <div>
              <h2 className="text-xl font-bold text-gray-800 mb-4">Zahlungsmethode</h2>
              <div className="mb-4 rounded-lg border border-blue-200 bg-blue-50 p-3 text-sm text-blue-800">
                Zahlungsart: <strong>Auf Rechnung</strong>
              </div>
              <form
                onSubmit={async (e) => {
                  e.preventDefault();
                  setInvoiceLoading(true);
                  setInvoiceError(null);
                  try {
                    const apiUrl = getApiUrl();
                    function parseGermanDate(str) {
                      if (typeof str === 'string' && str.match(/^\d{2}\.\d{2}\.\d{4}$/)) {
                        const [d, m, y] = str.split('.');
                        return new Date(`${y}-${m}-${d}T00:00:00Z`).toISOString();
                      }
                      return str;
                    }
                    const payload = {
                      ...bookingInfo,
                      paymentStatus: 'pending',
                      paymentMethod: 'invoice',
                      startDate: parseGermanDate(bookingInfo.startDate),
                      endDate: parseGermanDate(bookingInfo.endDate),
                      ...(bookingInfo.isPartialBooking && {
                        originalStartDate: parseGermanDate(bookingInfo.originalStartDate),
                        originalEndDate: parseGermanDate(bookingInfo.originalEndDate),
                        paidThroughDate: parseGermanDate(bookingInfo.paidThroughDate)
                      })
                    };
                    const response = await fetch(`${apiUrl}/bookings`, {
                      method: 'POST',
                      headers: { 'Content-Type': 'application/json' },
                      body: JSON.stringify(payload)
                    });
                    const data = await response.json();
                    if (response.ok && data._id) {
                      localStorage.setItem('bookingInfo', JSON.stringify({ ...bookingInfo, _id: data._id }));
                      window.location.href = '/erfolg';
                    } else {
                      // Show specific error message from API
                      const errorMsg = data.error || data.message || 'Buchung konnte nicht erstellt werden. Bitte versuchen Sie es erneut.';
                      setInvoiceError(errorMsg);
                    }
                  } catch (err) {
                    // Network or parsing error
                    setInvoiceError('Verbindungsfehler. Bitte überprüfen Sie Ihre Internetverbindung und versuchen Sie es erneut.');
                  } finally {
                    setInvoiceLoading(false);
                  }
                }}
                className="space-y-6"
              >
                <button
                  type="submit"
                  disabled={invoiceLoading}
                  className="w-full bg-blue-600 hover:bg-blue-700 disabled:bg-blue-400 text-white font-bold py-4 px-6 rounded-lg transition shadow-lg text-lg"
                >
                  {invoiceLoading ? 'Buchung wird verarbeitet...' : 'Jetzt verbindlich buchen'}
                </button>
                {invoiceError && (
                  <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded">
                    {invoiceError}
                  </div>
                )}
              </form>
            </div>

            <p className="text-xs text-gray-500 bg-gray-50 p-4 rounded-lg text-center">
              Nach Buchung erhalten Sie Ihre Rechnung per E-Mail.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
