import { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';

const getApiBaseUrl = () => import.meta.env.VITE_API_URL || 'https://monteurwohnung-dumser.up.railway.app/api';

export default function AngebotAnnehmen() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [booking, setBooking] = useState(null);
  const [processing, setProcessing] = useState(false);
  const [successMessage, setSuccessMessage] = useState('');

  useEffect(() => {
    const fetchBooking = async () => {
      try {
        const response = await fetch(`${getApiBaseUrl()}/bookings/${id}`);
        const data = await response.json().catch(() => ({}));
        if (!response.ok) {
          throw new Error(data.error || 'Angebot konnte nicht geladen werden.');
        }
        setBooking(data);
      } catch (err) {
        setError(err.message || 'Angebot konnte nicht geladen werden.');
      } finally {
        setLoading(false);
      }
    };

    fetchBooking();
  }, [id]);

  const handleAcceptOffer = async () => {
    if (!confirm('Moechten Sie dieses Angebot jetzt verbindlich annehmen?')) return;

    try {
      setProcessing(true);
      setError('');

      const response = await fetch(`${getApiBaseUrl()}/bookings/${id}/accept-offer`, {
        method: 'POST'
      });
      const data = await response.json().catch(() => ({}));

      if (!response.ok) {
        throw new Error(data.error || 'Angebot konnte nicht angenommen werden.');
      }

      if (data.redirectUrl) {
        setSuccessMessage('Angebot angenommen. Bitte vervollstaendigen Sie jetzt noch Ihre Daten.');
        setTimeout(() => navigate(data.redirectUrl), 900);
        return;
      }

      setSuccessMessage(data.message || 'Ihr Angebot wurde erfolgreich angenommen. Wir melden uns in Kuerze.');
    } catch (err) {
      setError(err.message || 'Angebot konnte nicht angenommen werden.');
    } finally {
      setProcessing(false);
    }
  };

  if (loading) {
    return <div className="container mx-auto px-4 py-12 text-center">Angebot wird geladen...</div>;
  }

  if (error) {
    return (
      <div className="container mx-auto px-4 py-12 max-w-2xl">
        <div className="bg-red-50 border border-red-200 text-red-700 rounded-xl p-6 text-center">
          <h1 className="text-2xl font-bold mb-3">Fehler</h1>
          <p>{error}</p>
        </div>
      </div>
    );
  }

  if (!booking) {
    return null;
  }

  return (
    <div className="container mx-auto px-4 py-12 max-w-3xl">
      <div className="bg-white shadow-xl rounded-2xl border border-gray-100 overflow-hidden">
        <div className="bg-blue-600 text-white p-6">
          <h1 className="text-3xl font-bold">Angebot annehmen</h1>
          <p className="mt-2 text-blue-100">Pruefen Sie Ihre Daten und bestaetigen Sie das Angebot verbindlich.</p>
        </div>

        <div className="p-6 space-y-6">
          {successMessage && (
            <div className="bg-green-50 border border-green-200 text-green-800 rounded-lg p-4">
              {successMessage}
            </div>
          )}

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm md:text-base">
            <div><span className="font-semibold">Firma:</span> {booking.company}</div>
            <div><span className="font-semibold">Kontaktperson:</span> {booking.name}</div>
            <div><span className="font-semibold">E-Mail:</span> {booking.email}</div>
            <div><span className="font-semibold">Telefon:</span> {booking.phone || '-'}</div>
            <div><span className="font-semibold">Wohnung:</span> {booking.wohnungLabel || booking.wohnung}</div>
            <div><span className="font-semibold">Personen:</span> {booking.people}</div>
            <div><span className="font-semibold">Zeitraum:</span> {new Date(booking.startDate).toLocaleDateString('de-DE')} - {new Date(booking.endDate).toLocaleDateString('de-DE')}</div>
            <div><span className="font-semibold">Naechte:</span> {booking.totalNights || booking.nights}</div>
          </div>

          <div className="rounded-xl bg-gray-50 border border-gray-200 p-5">
            <div className="flex justify-between items-center text-lg font-semibold">
              <span>Gesamtpreis</span>
              <span>{Number(booking.total || 0).toFixed(2)} €</span>
            </div>
            <p className="text-xs text-gray-500 mt-2">Die detaillierte Preisaufstellung finden Sie im uebermittelten PDF-Angebot.</p>
          </div>

          <div className="pt-2">
            <button
              type="button"
              onClick={handleAcceptOffer}
              disabled={processing || Boolean(successMessage)}
              className="w-full bg-green-600 hover:bg-green-700 text-white font-bold py-3 px-4 rounded-lg transition disabled:opacity-60"
            >
              {processing ? 'Angebot wird angenommen...' : 'Angebot jetzt verbindlich annehmen'}
            </button>
            <p className="text-xs text-gray-500 mt-3 text-center">
              Nach der Annahme pruefen wir die finale Verfuegbarkeit und bestaetigen Ihre Buchung schnellstmoeglich.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
