import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';

const AngebotAnnehmen = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [booking, setBooking] = useState(null);
  const [actionSuccess, setActionSuccess] = useState(false);
  const [processing, setProcessing] = useState(false);

  useEffect(() => {
    const fetchBooking = async () => {
      try {
        const apiUrl = import.meta.env.VITE_API_URL || 'https://monteurwohnung-dumser.up.railway.app/api';
        const response = await fetch(`${apiUrl}/bookings/${id}`);
        if (!response.ok) {
          throw new Error('Angebot konnte nicht geladen werden oder es existiert nicht.');
        }
        const data = await response.json();
        setBooking(data);
      } catch (err) {
        setError(err.message);
      } finally {
        setLoading(false);
      }
    };
    fetchBooking();
  }, [id]);

  const handleAccept = async () => {
    if (!confirm('Möchten Sie dieses Angebot verbindlich annehmen?')) return;
    
    setProcessing(true);
    try {
      const apiUrl = import.meta.env.VITE_API_URL || 'https://monteurwohnung-dumser.up.railway.app/api';
      const response = await fetch(`${apiUrl}/bookings/${id}/accept-offer`, {
        method: 'POST',
      });
      
      const data = await response.json();
      
      if (!response.ok) {
        throw new Error(data.error || 'Fehler beim Annehmen des Angebots');
      }

      setActionSuccess(true);
      
      if (data.redirectUrl) {
        // e.g. for missing data
        setTimeout(() => {
          navigate(data.redirectUrl);
        }, 1500);
      }
    } catch (err) {
      setError(err.message);
    } finally {
      setProcessing(false);
    }
  };

  if (loading) {
    return (
      <div className="container mx-auto px-4 py-8 text-center min-h-[50vh] flex items-center justify-center">
        <p className="text-xl">Angebot wird geladen...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="container mx-auto px-4 py-8 text-center min-h-[50vh] flex flex-col items-center justify-center">
        <h1 className="text-2xl font-bold text-red-600 mb-4">Fehler</h1>
        <p className="text-gray-700">{error}</p>
        <button 
          onClick={() => navigate('/')}
          className="mt-6 px-6 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 transition"
        >
          Zur Startseite
        </button>
      </div>
    );
  }

  if (actionSuccess) {
    return (
      <div className="container mx-auto px-4 py-8 text-center min-h-[50vh] flex flex-col items-center justify-center">
        <h1 className="text-3xl font-bold text-green-600 mb-4">Vielen Dank!</h1>
        <p className="text-xl text-gray-700 mb-2">Sie haben das Angebot erfolgreich angenommen.</p>
        <p className="text-gray-500">Wir bearbeiten Ihre Bestätigung.</p>
      </div>
    );
  }

  return (
    <div className="container mx-auto px-4 py-12 max-w-2xl">
      <h1 className="text-3xl font-bold mb-6 text-center">Angebot Annehmen</h1>
      
      <div className="bg-white shadow-xl rounded-lg overflow-hidden border border-gray-100">
        <div className="bg-blue-600 p-4 text-white">
          <h2 className="text-xl font-semibold">Ihre Buchungsdetails</h2>
        </div>
        
        <div className="p-6 space-y-4">
          <div className="grid grid-cols-2 gap-4 text-sm md:text-base">
            <div className="text-gray-600 font-medium">Name:</div>
            <div className="font-semibold text-right">{booking.name}</div>
            
            <div className="text-gray-600 font-medium">Zeitraum:</div>
            <div className="font-semibold text-right">
              {new Date(booking.startDate).toLocaleDateString('de-DE')} - {new Date(booking.endDate).toLocaleDateString('de-DE')}
            </div>
            
            <div className="text-gray-600 font-medium">Wohnung:</div>
            <div className="font-semibold text-right">{booking.wohnung}</div>

            <div className="text-gray-600 font-medium">Nächte:</div>
            <div className="font-semibold text-right">{booking.nights}</div>

            <div className="text-gray-600 font-medium">Gäste:</div>
            <div className="font-semibold text-right">{booking.guests}</div>
          </div>

          <hr className="my-4" />
          
          <div className="flex justify-between items-center text-lg md:text-xl font-bold">
            <span>Gesamtpreis:</span>
            <span>{booking.total} €</span>
          </div>

          <div className="mt-8">
            <button
              onClick={handleAccept}
              disabled={processing}
              className="w-full bg-green-600 hover:bg-green-700 text-white font-bold py-3 px-4 rounded-lg transition text-lg flex items-center justify-center gap-2"
            >
              {processing ? 'Verarbeite...' : '✅ Angebot zahlungspflichtig annehmen'}
            </button>
            <p className="text-xs text-gray-500 mt-3 text-center">
              Durch Klick auf diesen Button nehmen Sie das Angebot rechtsverbindlich an.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default AngebotAnnehmen;