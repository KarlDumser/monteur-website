import { useState, useEffect } from 'react';
import { format } from 'date-fns';
import { getApiUrl } from '../utils/api.js';

export default function Admin() {
  const [bookings, setBookings] = useState([]);
  const [blockedDates, setBlockedDates] = useState([]);
  const [stats, setStats] = useState(null);
  const [activeTab, setActiveTab] = useState('bookings');
  const [loading, setLoading] = useState(true);
  const [auth, setAuth] = useState(() => sessionStorage.getItem('adminAuth') || '');
  const [authError, setAuthError] = useState('');
  const [credentials, setCredentials] = useState({ username: '', password: '' });
  
  // Form für Zeitblockierung
  const [blockForm, setBlockForm] = useState({
    wohnung: 'hackerberg',
    startDate: '',
    endDate: '',
    reason: ''
  });

  useEffect(() => {
    if (auth) {
      loadData();
    } else {
      setLoading(false);
    }
  }, [auth]);

  const loadData = async () => {
    try {
      const apiUrl = getApiUrl();
      const headers = auth ? { Authorization: `Basic ${auth}` } : {};
      // Buchungen laden
      const bookingsRes = await fetch(`${apiUrl}/admin/bookings`, { headers });
      if (bookingsRes.status === 401) {
        sessionStorage.removeItem('adminAuth');
        setAuth('');
        setAuthError('Zugriff verweigert. Bitte erneut anmelden.');
        setLoading(false);
        return;
      }
      const bookingsData = await bookingsRes.json();
      setBookings(bookingsData);

      // Blockierte Zeiten laden
      const blockedRes = await fetch(`${apiUrl}/admin/blocked-dates`, { headers });
      const blockedData = await blockedRes.json();
      setBlockedDates(blockedData);

      // Statistiken laden
      const statsRes = await fetch(`${apiUrl}/admin/statistics`, { headers });
      const statsData = await statsRes.json();
      setStats(statsData);

      setLoading(false);
    } catch (error) {
      console.error('Error loading data:', error);
      setLoading(false);
    }
  };

  const handleBlockDates = async (e) => {
    e.preventDefault();
    
    try {
      const apiUrl = getApiUrl();
      const response = await fetch(`${apiUrl}/admin/block-dates`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Basic ${auth}`
        },
        body: JSON.stringify(blockForm)
      });

      if (response.ok) {
        alert('Zeitraum erfolgreich blockiert');
        setBlockForm({ wohnung: 'hackerberg', startDate: '', endDate: '', reason: '' });
        loadData();
      } else {
        alert('Fehler beim Blockieren');
      }
    } catch (error) {
      console.error('Error blocking dates:', error);
      alert('Fehler beim Blockieren');
    }
  };

  const handleUnblock = async (id) => {
    if (!confirm('Blockierung wirklich entfernen?')) return;

    try {
      const apiUrl = getApiUrl();
      const response = await fetch(`${apiUrl}/admin/blocked-dates/${id}`, {
        method: 'DELETE',
        headers: { Authorization: `Basic ${auth}` }
      });

      if (response.ok) {
        alert('Blockierung entfernt');
        loadData();
      }
    } catch (error) {
      console.error('Error unblocking:', error);
    }
  };

  if (loading) {
    return (
      <div className="container mx-auto px-4 py-12">
        <p className="text-center text-gray-600">Lade Daten...</p>
      </div>
    );
  }

  if (!auth) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center px-4">
        <div className="bg-white shadow-lg rounded-2xl p-8 w-full max-w-md">
          <h1 className="text-2xl font-bold mb-2">Admin Login</h1>
          <p className="text-sm text-gray-600 mb-6">Bitte melden Sie sich an.</p>

          {authError && (
            <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-2 rounded mb-4">
              {authError}
            </div>
          )}

          <form
            onSubmit={async (e) => {
              e.preventDefault();
              const token = btoa(`${credentials.username}:${credentials.password}`);
              try {
                const apiUrl = getApiUrl();
                const res = await fetch(`${apiUrl}/admin/statistics`, {
                  headers: { Authorization: `Basic ${token}` }
                });
                if (!res.ok) {
                  setAuthError('Benutzername oder Passwort falsch.');
                  return;
                }
                sessionStorage.setItem('adminAuth', token);
                setAuth(token);
                setAuthError('');
              } catch (error) {
                setAuthError('Login fehlgeschlagen.');
              }
            }}
            className="space-y-4"
          >
            <div>
              <label className="block text-sm font-semibold mb-2">Benutzername</label>
              <input
                type="email"
                value={credentials.username}
                onChange={(e) => setCredentials({ ...credentials, username: e.target.value })}
                className="w-full border-2 border-gray-300 rounded-lg px-4 py-3"
                required
              />
            </div>
            <div>
              <label className="block text-sm font-semibold mb-2">Passwort</label>
              <input
                type="password"
                value={credentials.password}
                onChange={(e) => setCredentials({ ...credentials, password: e.target.value })}
                className="w-full border-2 border-gray-300 rounded-lg px-4 py-3"
                required
              />
            </div>
            <button
              type="submit"
              className="w-full bg-blue-600 hover:bg-blue-700 text-white font-semibold py-3 rounded-lg"
            >
              Einloggen
            </button>
          </form>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="container mx-auto px-4 py-8">
        <h1 className="text-4xl font-bold mb-8">Admin Dashboard</h1>

        {/* Statistiken */}
        {stats && (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
            <div className="bg-white rounded-lg shadow p-6">
              <h3 className="text-gray-600 text-sm font-semibold">Gesamt Buchungen</h3>
              <p className="text-3xl font-bold text-blue-600">{stats.totalBookings}</p>
            </div>
            <div className="bg-white rounded-lg shadow p-6">
              <h3 className="text-gray-600 text-sm font-semibold">Bestätigte Buchungen</h3>
              <p className="text-3xl font-bold text-green-600">{stats.confirmedBookings}</p>
            </div>
            <div className="bg-white rounded-lg shadow p-6">
              <h3 className="text-gray-600 text-sm font-semibold">Umsatz (gesamt)</h3>
              <p className="text-3xl font-bold text-blue-600">{stats.totalRevenue}€</p>
            </div>
          </div>
        )}

        {/* Tabs */}
        <div className="mb-6 border-b">
          <button
            onClick={() => setActiveTab('bookings')}
            className={`px-6 py-3 font-semibold ${activeTab === 'bookings' ? 'border-b-2 border-blue-600 text-blue-600' : 'text-gray-600'}`}
          >
            Buchungen ({bookings.length})
          </button>
          <button
            onClick={() => setActiveTab('blocked')}
            className={`px-6 py-3 font-semibold ${activeTab === 'blocked' ? 'border-b-2 border-blue-600 text-blue-600' : 'text-gray-600'}`}
          >
            Blockierte Zeiten ({blockedDates.length})
          </button>
          <button
            onClick={() => setActiveTab('block-new')}
            className={`px-6 py-3 font-semibold ${activeTab === 'block-new' ? 'border-b-2 border-blue-600 text-blue-600' : 'text-gray-600'}`}
          >
            Zeiten blockieren
          </button>
        </div>

        {/* Buchungen Tabelle */}
        {activeTab === 'bookings' && (
          <div className="bg-white rounded-lg shadow overflow-hidden">
            <table className="w-full">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Datum</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Name</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Wohnung</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Zeitraum</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Betrag</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Status</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Aktion</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200">
                {bookings.map((booking) => (
                  <tr key={booking._id} className="hover:bg-gray-50">
                    <td className="px-6 py-4 whitespace-nowrap text-sm">
                      {new Date(booking.createdAt).toLocaleDateString('de-DE')}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="font-medium">{booking.name}</div>
                      <div className="text-sm text-gray-500">{booking.email}</div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm">
                      {booking.wohnungLabel || (booking.wohnung === 'hackerberg' ? 'Hackerberg' : booking.wohnung === 'neubau' ? 'Fruehlingstr.' : 'Kombi')}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm">
                      {new Date(booking.startDate).toLocaleDateString('de-DE')} - {new Date(booking.endDate).toLocaleDateString('de-DE')}
                      <div className="text-gray-500">{booking.nights} Nächte</div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                      {booking.total}€
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className={`px-2 py-1 text-xs rounded-full ${
                        booking.paymentStatus === 'paid' ? 'bg-green-100 text-green-800' : 'bg-yellow-100 text-yellow-800'
                      }`}>
                        {booking.paymentStatus === 'paid' ? '✓ Bezahlt' : 'Ausstehend'}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm">
                      <button
                        onClick={async () => {
                          if (!confirm('Buchung wirklich loeschen?')) return;
                          try {
                            const apiUrl = getApiUrl();
                            const response = await fetch(`${apiUrl}/admin/bookings/${booking._id}`, {
                              method: 'DELETE',
                              headers: { Authorization: `Basic ${auth}` }
                            });
                            if (response.ok) {
                              loadData();
                            } else {
                              alert('Loeschen fehlgeschlagen');
                            }
                          } catch (error) {
                            console.error('Error deleting booking:', error);
                            alert('Loeschen fehlgeschlagen');
                          }
                        }}
                        className="text-red-600 hover:text-red-800"
                      >
                        Loeschen
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {/* Blockierte Zeiten */}
        {activeTab === 'blocked' && (
          <div className="bg-white rounded-lg shadow overflow-hidden">
            <table className="w-full">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Wohnung</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Zeitraum</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Grund</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Aktion</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200">
                {blockedDates.map((blocked) => (
                  <tr key={blocked._id}>
                    <td className="px-6 py-4 whitespace-nowrap text-sm">
                      {blocked.wohnung === 'hackerberg' ? 'Hackerberg' : 'Frühlingstr.'}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm">
                      {new Date(blocked.startDate).toLocaleDateString('de-DE')} - {new Date(blocked.endDate).toLocaleDateString('de-DE')}
                    </td>
                    <td className="px-6 py-4 text-sm">{blocked.reason}</td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm">
                      <button
                        onClick={() => handleUnblock(blocked._id)}
                        className="text-red-600 hover:text-red-800"
                      >
                        Entfernen
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {/* Zeiten blockieren */}
        {activeTab === 'block-new' && (
          <div className="bg-white rounded-lg shadow p-8 max-w-2xl">
            <h2 className="text-2xl font-bold mb-6">Zeitraum blockieren</h2>
            
            <form onSubmit={handleBlockDates} className="space-y-6">
              <div>
                <label className="block text-sm font-semibold mb-2">Wohnung</label>
                <select
                  value={blockForm.wohnung}
                  onChange={(e) => setBlockForm({...blockForm, wohnung: e.target.value})}
                  className="w-full border-2 border-gray-300 rounded-lg px-4 py-3"
                  required
                >
                  <option value="hackerberg">Hackerberg – Penthouse</option>
                  <option value="neubau">Neubau – Frühlingstraße</option>
                </select>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-semibold mb-2">Von</label>
                  <input
                    type="date"
                    value={blockForm.startDate}
                    onChange={(e) => setBlockForm({...blockForm, startDate: e.target.value})}
                    className="w-full border-2 border-gray-300 rounded-lg px-4 py-3"
                    required
                  />
                </div>
                <div>
                  <label className="block text-sm font-semibold mb-2">Bis</label>
                  <input
                    type="date"
                    value={blockForm.endDate}
                    onChange={(e) => setBlockForm({...blockForm, endDate: e.target.value})}
                    className="w-full border-2 border-gray-300 rounded-lg px-4 py-3"
                    required
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-semibold mb-2">Grund (optional)</label>
                <input
                  type="text"
                  value={blockForm.reason}
                  onChange={(e) => setBlockForm({...blockForm, reason: e.target.value})}
                  placeholder="z.B. Renovierung, Familienbesuch..."
                  className="w-full border-2 border-gray-300 rounded-lg px-4 py-3"
                />
              </div>

              <button
                type="submit"
                className="w-full bg-blue-600 hover:bg-blue-700 text-white font-semibold py-3 rounded-lg"
              >
                Zeitraum blockieren
              </button>
            </form>
          </div>
        )}
      </div>
    </div>
  );
}
