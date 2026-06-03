import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';

const DatenVervollstaendigen = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [booking, setBooking] = useState(null);
  const [saving, setSaving] = useState(false);
  const [success, setSuccess] = useState(false);

  const [formData, setFormData] = useState({
    companyName: '',
    address: '',
    phone: '',
  });

  useEffect(() => {
    const fetchBooking = async () => {
      try {
        const apiUrl = import.meta.env.VITE_API_URL || 'https://monteurwohnung-dumser.up.railway.app/api';
        const response = await fetch(`${apiUrl}/bookings/${id}`);
        if (!response.ok) {
          throw new Error('Buchung konnte nicht geladen werden oder es existiert nicht.');
        }
        const data = await response.json();
        setBooking(data);
        
        setFormData({
          companyName: data.companyName || '',
          address: data.address || '',
          phone: data.phone || '',
        });
      } catch (err) {
        setError(err.message);
      } finally {
        setLoading(false);
      }
    };
    fetchBooking();
  }, [id]);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!formData.address || !formData.phone) {
      alert('Bitte füllen Sie mindestens die Rechnungsadresse und Telefonnummer aus.');
      return;
    }
    
    setSaving(true);
    try {
      const apiUrl = import.meta.env.VITE_API_URL || 'https://monteurwohnung-dumser.up.railway.app/api';
      const response = await fetch(`${apiUrl}/bookings/${id}/complete-data`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData)
      });
      
      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.error || 'Fehler beim Speichern der Daten');
      }

      setSuccess(true);
    } catch (err) {
      setError(err.message);
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="container mx-auto px-4 py-8 text-center min-h-[50vh] flex items-center justify-center">
        <p className="text-xl">Buchungsdaten werden geladen...</p>
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

  if (success) {
    return (
      <div className="container mx-auto px-4 py-8 text-center min-h-[50vh] flex flex-col items-center justify-center">
        <h1 className="text-3xl font-bold text-green-600 mb-4">Erfolgreich gespeichert!</h1>
        <p className="text-xl text-gray-700 mb-2">Vielen Dank für die Vervollständigung Ihrer Daten.</p>
        <p className="text-gray-500">Sie erhalten in Kürze Ihre endgültige Buchungsbestätigung inkl. Rechnung per E-Mail.</p>
        <button 
          onClick={() => navigate('/')}
          className="mt-6 px-6 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 transition"
        >
          Zur Startseite
        </button>
      </div>
    );
  }

  return (
    <div className="container mx-auto px-4 py-12 max-w-2xl">
      <h1 className="text-3xl font-bold mb-2 text-center">Daten Vervollständigen</h1>
      <p className="text-center text-gray-600 mb-8">
        Um Ihnen eine ordnungsgemäße Rechnung ausstellen zu können, benötigen wir noch Ihre Adresse und Telefonnummer.
      </p>
      
      <div className="bg-white shadow-xl rounded-lg overflow-hidden border border-gray-100 p-6">
        <form onSubmit={handleSubmit} className="space-y-6">
          
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Firmenname <span className="text-gray-400 font-normal">(Optional)</span>
            </label>
            <input
              type="text"
              name="companyName"
              value={formData.companyName}
              onChange={handleChange}
              placeholder="z.B. Muster GmbH"
              className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Rechnungsadresse <span className="text-red-500">*</span>
            </label>
            <textarea
              name="address"
              value={formData.address}
              onChange={handleChange}
              required
              rows="3"
              placeholder="Straße, Hausnummer&#10;PLZ, Ort"
              className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Telefonnummer / Mobil <span className="text-red-500">*</span>
            </label>
            <input
              type="tel"
              name="phone"
              value={formData.phone}
              onChange={handleChange}
              required
              placeholder="+49 123 456789"
              className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition"
            />
          </div>

          <div className="pt-4 border-t border-gray-100">
            <button
              type="submit"
              disabled={saving}
              className="w-full bg-blue-600 hover:bg-blue-700 text-white font-bold py-3 px-4 rounded-lg transition text-lg flex justify-center items-center"
            >
              {saving ? 'Wird gespeichert...' : 'Daten speichern & Rechnung anfordern'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default DatenVervollstaendigen;