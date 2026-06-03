import { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';

const getApiBaseUrl = () => import.meta.env.VITE_API_URL || 'https://monteurwohnung-dumser.up.railway.app/api';

export default function DatenVervollstaendigen() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);
  const [saving, setSaving] = useState(false);
  const [formData, setFormData] = useState({
    company: '',
    street: '',
    zip: '',
    city: '',
    phone: '',
    addressLine2: ''
  });

  useEffect(() => {
    const fetchBooking = async () => {
      try {
        const response = await fetch(`${getApiBaseUrl()}/bookings/${id}`);
        const data = await response.json().catch(() => ({}));
        if (!response.ok) {
          throw new Error(data.error || 'Buchung konnte nicht geladen werden.');
        }

        setFormData({
          company: data.company || '',
          street: data.street || '',
          zip: data.zip || '',
          city: data.city || '',
          phone: data.phone || '',
          addressLine2: data.addressLine2 || ''
        });
      } catch (err) {
        setError(err.message || 'Buchung konnte nicht geladen werden.');
      } finally {
        setLoading(false);
      }
    };

    fetchBooking();
  }, [id]);

  const handleChange = (event) => {
    const { name, value } = event.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  const handleSubmit = async (event) => {
    event.preventDefault();

    if (!formData.company || !formData.street || !formData.zip || !formData.city || !formData.phone) {
      setError('Bitte fuellen Sie Firmenname, Strasse, PLZ, Ort und Telefonnummer aus.');
      return;
    }

    try {
      setSaving(true);
      setError('');

      const response = await fetch(`${getApiBaseUrl()}/bookings/${id}/complete-data`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData)
      });

      const data = await response.json().catch(() => ({}));
      if (!response.ok) {
        throw new Error(data.error || 'Daten konnten nicht gespeichert werden.');
      }

      setSuccess(true);
      setTimeout(() => navigate('/'), 2000);
    } catch (err) {
      setError(err.message || 'Daten konnten nicht gespeichert werden.');
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return <div className="container mx-auto px-4 py-12 text-center">Daten werden geladen...</div>;
  }

  if (success) {
    return (
      <div className="container mx-auto px-4 py-12 max-w-2xl">
        <div className="bg-green-50 border border-green-200 text-green-800 rounded-xl p-6 text-center">
          <h1 className="text-2xl font-bold mb-3">Vielen Dank</h1>
          <p>Ihre Daten wurden gespeichert. Die Buchung wurde bestaetigt und Rechnung sowie Buchungsbestaetigung wurden versendet.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto px-4 py-12 max-w-2xl">
      <div className="bg-white shadow-xl rounded-2xl border border-gray-100 p-6">
        <h1 className="text-3xl font-bold mb-2 text-center">Daten vervollstaendigen</h1>
        <p className="text-center text-gray-600 mb-8">
          Bitte ergaenzen Sie Ihre Rechnungsdaten. Danach wird Ihre Anfrage sofort als Buchung bestaetigt.
        </p>

        {error && (
          <div className="bg-red-50 border border-red-200 text-red-700 rounded-lg p-4 mb-6">
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-5">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Firma *</label>
            <input type="text" name="company" value={formData.company} onChange={handleChange} className="w-full p-3 border border-gray-300 rounded-lg" />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Strasse und Hausnummer *</label>
            <input type="text" name="street" value={formData.street} onChange={handleChange} className="w-full p-3 border border-gray-300 rounded-lg" />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Adresszusatz</label>
            <input type="text" name="addressLine2" value={formData.addressLine2} onChange={handleChange} className="w-full p-3 border border-gray-300 rounded-lg" />
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">PLZ *</label>
              <input type="text" name="zip" value={formData.zip} onChange={handleChange} className="w-full p-3 border border-gray-300 rounded-lg" />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Ort *</label>
              <input type="text" name="city" value={formData.city} onChange={handleChange} className="w-full p-3 border border-gray-300 rounded-lg" />
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Telefon / Mobil *</label>
            <input type="tel" name="phone" value={formData.phone} onChange={handleChange} className="w-full p-3 border border-gray-300 rounded-lg" />
          </div>

          <button
            type="submit"
            disabled={saving}
            className="w-full bg-blue-600 hover:bg-blue-700 text-white font-bold py-3 px-4 rounded-lg transition disabled:opacity-60"
          >
            {saving ? 'Speichert...' : 'Daten speichern und Buchung bestaetigen'}
          </button>
        </form>
      </div>
    </div>
  );
}
