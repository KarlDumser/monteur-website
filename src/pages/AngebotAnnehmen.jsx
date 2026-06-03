import { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { APP_VERSION } from '../config';
import {
  buildOfferVariantFromBooking,
  getApartmentInfoForOption,
  getApartmentPreviewImages,
  normalizeOfferOptions
} from '../../shared/apartmentCatalog.js';

const getApiBaseUrl = () => {
  if (typeof window !== 'undefined') {
    const host = window.location.hostname;
    if (host === 'monteurwohnung-dumser.de' || host === 'www.monteurwohnung-dumser.de') {
      return `${window.location.origin}/api`;
    }
  }

  const configured = String(import.meta.env.VITE_API_URL || '').trim();
  if (configured) return configured.replace(/\/+$/, '');
  return 'https://monteurwohnung-dumser.up.railway.app/api';
};

export default function AngebotAnnehmen() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [booking, setBooking] = useState(null);
  const [processing, setProcessing] = useState(false);
  const [successMessage, setSuccessMessage] = useState('');
  const [selectedApartment, setSelectedApartment] = useState('');
  const [selectedImageIndex, setSelectedImageIndex] = useState(null);
  const offerOptions = normalizeOfferOptions(booking?.offerApartmentOptions, booking?.wohnung);
  const activeOption = selectedApartment || offerOptions[0] || booking?.wohnung;
  const activeVariant = booking ? buildOfferVariantFromBooking(booking, activeOption) : null;
  const activeApartmentInfo = getApartmentInfoForOption(activeOption);
  const activeImages = getApartmentPreviewImages(activeOption, 6);

  useEffect(() => {
    const fetchBooking = async () => {
      try {
        const response = await fetch(`${getApiBaseUrl()}/bookings/${id}`);
        const data = await response.json().catch(() => ({}));
        if (!response.ok) {
          throw new Error(data.error || 'Angebot konnte nicht geladen werden.');
        }
        setBooking(data);

        const url = new URL(window.location.href);
        const requestedOption = String(url.searchParams.get('option') || '').trim().toLowerCase();
        const availableOptions = normalizeOfferOptions(data.offerApartmentOptions, data.wohnung);
        const fallbackOption = availableOptions[0] || data.wohnung || '';
        setSelectedApartment(availableOptions.includes(requestedOption) ? requestedOption : fallbackOption);
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
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ selectedApartment })
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

  useEffect(() => {
    if (selectedImageIndex === null || activeImages.length === 0) return;

    const handleKeyDown = (event) => {
      if (event.key === 'Escape') {
        setSelectedImageIndex(null);
        return;
      }
      if (event.key === 'ArrowRight') {
        setSelectedImageIndex((prev) => ((prev ?? 0) + 1) % activeImages.length);
      }
      if (event.key === 'ArrowLeft') {
        setSelectedImageIndex((prev) => ((prev ?? 0) - 1 + activeImages.length) % activeImages.length);
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [selectedImageIndex, activeImages]);

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
            <div><span className="font-semibold">Gewaehlte Option:</span> {activeApartmentInfo?.label || booking.wohnungLabel || booking.wohnung}</div>
            <div><span className="font-semibold">Personen:</span> {booking.people}</div>
            <div><span className="font-semibold">Zeitraum:</span> {new Date(booking.startDate).toLocaleDateString('de-DE')} - {new Date(booking.endDate).toLocaleDateString('de-DE')}</div>
            <div><span className="font-semibold">Naechte:</span> {booking.totalNights || booking.nights}</div>
          </div>

          {offerOptions.length > 1 && (
            <div className="rounded-xl border border-blue-200 bg-blue-50 p-5 space-y-3">
              <h2 className="text-lg font-bold text-blue-900">Wohnungsoption waehlen</h2>
              <p className="text-sm text-blue-800">Sie koennen zwischen den angebotenen Wohnungen waehlen. Ihre Auswahl wird mit der Annahme verbindlich gespeichert.</p>
              <div className="space-y-2">
                {offerOptions.map((option) => {
                  const variant = buildOfferVariantFromBooking(booking, option);
                  const info = getApartmentInfoForOption(option);
                  return (
                    <label key={option} className="flex items-start gap-3 rounded-lg border border-blue-200 bg-white px-3 py-2 cursor-pointer">
                      <input
                        type="radio"
                        name="selectedApartment"
                        value={option}
                        checked={selectedApartment === option}
                        onChange={(e) => setSelectedApartment(e.target.value)}
                        className="mt-1"
                      />
                      <span>
                        <span className="block font-semibold text-slate-900">{info?.label || option}</span>
                        <span className="block text-xs text-slate-600">{info?.address || '-'}</span>
                        <span className="block text-sm text-blue-800 mt-1">Gesamtpreis: {Number(variant.total || 0).toFixed(2)} EUR</span>
                      </span>
                    </label>
                  );
                })}
              </div>
            </div>
          )}

          <div className="rounded-xl border border-slate-200 bg-slate-50 p-5 space-y-2">
            <h2 className="text-lg font-bold text-slate-900">Details zur Wohnung</h2>
            <p className="text-sm"><span className="font-semibold">Adresse:</span> {activeApartmentInfo?.address || '-'}</p>
            <p className="text-sm"><span className="font-semibold">Zimmer / Flaeche:</span> {activeApartmentInfo?.rooms || '-'}{activeApartmentInfo?.area ? `, ${activeApartmentInfo.area}` : ''}</p>
            <p className="text-sm"><span className="font-semibold">Beschreibung:</span> {activeApartmentInfo?.description || '-'}</p>
            <p className="text-sm"><span className="font-semibold">Ausstattung:</span> {activeApartmentInfo?.details || '-'}</p>
            {Array.isArray(activeApartmentInfo?.features) && activeApartmentInfo.features.length > 0 && (
              <ul className="list-disc pl-5 text-sm text-slate-700 space-y-1">
                {activeApartmentInfo.features.map((feature) => (
                  <li key={feature}>{feature}</li>
                ))}
              </ul>
            )}
          </div>

          {activeImages.length > 0 && (
            <div className="rounded-xl border border-slate-200 bg-white p-5">
              <h2 className="text-lg font-bold text-slate-900 mb-3">Bildergalerie</h2>
              <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                {activeImages.map((entry, index) => (
                  <img
                    key={`${entry.folder}-${entry.image}`}
                    src={`/${entry.folder}/${entry.image}?v=${APP_VERSION}`}
                    alt={entry.apartmentLabel}
                    className="h-28 md:h-32 w-full object-cover rounded-lg border border-slate-200 cursor-zoom-in"
                    loading="lazy"
                    onClick={() => setSelectedImageIndex(index)}
                  />
                ))}
              </div>
              <p className="text-xs text-slate-500 mt-2">Bild anklicken zum Vergroessern</p>
              <p className="text-xs text-slate-500 mt-1">
                Fuer weitere Fotos und alle Details: <a href="https://monteurwohnung-dumser.de/" target="_blank" rel="noreferrer" className="text-blue-600 underline">https://monteurwohnung-dumser.de/</a>
              </p>
            </div>
          )}

          {selectedImageIndex !== null && activeImages[selectedImageIndex] && (
            <div
              className="fixed inset-0 z-50 bg-black/90 flex items-center justify-center p-4"
              onClick={() => setSelectedImageIndex(null)}
            >
              <div className="relative max-w-6xl w-full max-h-[92vh] flex items-center justify-center" onClick={(event) => event.stopPropagation()}>
                <button
                  type="button"
                  onClick={() => setSelectedImageIndex(null)}
                  className="absolute top-3 right-3 z-10 bg-black/60 text-white rounded-full w-10 h-10 text-xl"
                >
                  ×
                </button>
                <button
                  type="button"
                  onClick={() => setSelectedImageIndex((prev) => ((prev ?? 0) - 1 + activeImages.length) % activeImages.length)}
                  className="absolute left-3 z-10 bg-black/60 text-white rounded-full w-10 h-10 text-xl"
                >
                  ←
                </button>
                <img
                  src={`/${activeImages[selectedImageIndex].folder}/${activeImages[selectedImageIndex].image}?v=${APP_VERSION}`}
                  alt={activeImages[selectedImageIndex].apartmentLabel}
                  className="max-h-[88vh] max-w-full object-contain rounded-lg"
                />
                <button
                  type="button"
                  onClick={() => setSelectedImageIndex((prev) => ((prev ?? 0) + 1) % activeImages.length)}
                  className="absolute right-3 z-10 bg-black/60 text-white rounded-full w-10 h-10 text-xl"
                >
                  →
                </button>
              </div>
            </div>
          )}

          <div className="rounded-xl bg-gray-50 border border-gray-200 p-5">
            <div className="flex justify-between items-center text-lg font-semibold">
              <span>Gesamtpreis</span>
              <span>{Number(activeVariant?.total || 0).toFixed(2)} EUR</span>
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
