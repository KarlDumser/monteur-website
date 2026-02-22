import { useState, useEffect, useRef } from 'react';
import { format } from 'date-fns';
import { getApiUrl } from '../utils/api.js';

export default function Admin() {
  const [bookings, setBookings] = useState([]);
  const [deletedBookings, setDeletedBookings] = useState([]);
  const [blockedDates, setBlockedDates] = useState([]);
  const [stats, setStats] = useState(null);
  const [activeTab, setActiveTab] = useState('bookings');
  const [loading, setLoading] = useState(true);
  const [auth, setAuth] = useState(() => sessionStorage.getItem('adminAuth') || '');
  const [authError, setAuthError] = useState('');
  const [credentials, setCredentials] = useState({ username: '', password: '' });
  const [actionMessage, setActionMessage] = useState(null);
  const messageTimeoutRef = useRef(null);

  // Pop-Up für Details
  const [selectedBooking, setSelectedBooking] = useState(null);

  // Form für Zeitblockierung
  const [blockForm, setBlockForm] = useState({
    wohnung: 'hackerberg',
    startDate: '',
    endDate: '',
    reason: ''
  });

  useEffect(() => {
    return () => {
      if (messageTimeoutRef.current) {
        clearTimeout(messageTimeoutRef.current);
      }
    };
  }, []);

  const showActionMessage = (type, text) => {
    if (messageTimeoutRef.current) {
      clearTimeout(messageTimeoutRef.current);
    }
    setActionMessage({ type, text });
    messageTimeoutRef.current = setTimeout(() => setActionMessage(null), 3000);
  };

  useEffect(() => {
    if (auth) {
      loadData();
    } else {
      setLoading(false);
    }
  }, [auth]);

  useEffect(() => {
    const syncAuth = () => {
      setAuth(sessionStorage.getItem('adminAuth') || '');
    };

    window.addEventListener('admin-auth-changed', syncAuth);
    window.addEventListener('storage', syncAuth);

    return () => {
      window.removeEventListener('admin-auth-changed', syncAuth);
      window.removeEventListener('storage', syncAuth);
    };
  }, []);

  const handleLogout = () => {
    sessionStorage.removeItem('adminAuth');
    setAuth('');
    window.dispatchEvent(new Event('admin-auth-changed'));
  };

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
        window.dispatchEvent(new Event('admin-auth-changed'));
        setLoading(false);
        return;
      }
      const bookingsData = await bookingsRes.json();
      setBookings(bookingsData);

      // Archivierte Buchungen laden
      const deletedRes = await fetch(`${apiUrl}/admin/deleted-bookings`, { headers });
      const deletedData = await deletedRes.json();
      setDeletedBookings(deletedData);

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
                window.dispatchEvent(new Event('admin-auth-changed'));
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
        {/* Pop-Up für Buchungsdetails */}
        {selectedBooking && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-40">
            <div className="bg-white rounded-2xl shadow-lg p-6 max-w-md w-full relative overflow-y-auto" style={{ maxHeight: '90vh' }}>
              <button
                className="absolute top-4 right-4 text-gray-500 hover:text-gray-800 text-xl"
                onClick={() => setSelectedBooking(null)}
                aria-label="Schließen"
              >
                ×
              </button>
              <h2 className="text-2xl font-bold mb-4">Buchungsdetails</h2>
              <div className="mb-4 grid grid-cols-2 gap-x-4 gap-y-2">
                <div className="col-span-2 text-sm text-gray-700"><strong>Datum:</strong> {selectedBooking.createdAt ? new Date(selectedBooking.createdAt).toLocaleDateString('de-DE') : '-'}</div>
                <div className="col-span-2 text-sm text-gray-700"><strong>Name:</strong> {selectedBooking.name}</div>
                <div className="col-span-2 text-sm text-gray-700"><strong>Email:</strong> {selectedBooking.email}</div>
                <div className="col-span-1 text-sm text-gray-700"><strong>Telefon:</strong> {selectedBooking.phone}</div>
                <div className="col-span-1 text-sm text-gray-700"><strong>Firma:</strong> {selectedBooking.company}</div>
                <div className="col-span-2 text-sm text-gray-700"><strong>Straße:</strong> {selectedBooking.street}</div>
                <div className="col-span-1 text-sm text-gray-700"><strong>PLZ:</strong> {selectedBooking.zip}</div>
                <div className="col-span-1 text-sm text-gray-700"><strong>Ort:</strong> {selectedBooking.city}</div>
                <div className="col-span-2 text-sm text-gray-700"><strong>Wohnung:</strong> {selectedBooking.wohnungLabel || selectedBooking.wohnung}</div>
                <div className="col-span-2 text-sm text-gray-700"><strong>Zeitraum:</strong> {selectedBooking.startDate ? new Date(selectedBooking.startDate).toLocaleDateString('de-DE') : '-'} - {selectedBooking.endDate ? new Date(selectedBooking.endDate).toLocaleDateString('de-DE') : '-'}</div>
                <div className="col-span-1 text-sm text-gray-700"><strong>Nächte:</strong> {selectedBooking.nights}</div>
                <div className="col-span-1 text-sm text-gray-700"><strong>Personen:</strong> {selectedBooking.people}</div>
                <div className="col-span-1 text-sm text-gray-700"><strong>Check-In:</strong> {selectedBooking.checkInTime || '-'}</div>
                <div className="col-span-1 text-sm text-gray-700"><strong>Check-Out:</strong> {selectedBooking.checkOutTime || '-'}</div>
                <div className="col-span-2 text-sm text-gray-700"><strong>Status:</strong> {selectedBooking.paymentStatus === 'paid' ? '✓ Bezahlt' : 'Ausstehend'}</div>
                {selectedBooking.stripePaymentIntentId && <div className="col-span-2 text-xs text-gray-500"><strong>Stripe Payment Intent:</strong> {selectedBooking.stripePaymentIntentId}</div>}
                {selectedBooking.stripePaymentId && <div className="col-span-2 text-xs text-gray-500"><strong>Stripe Payment ID:</strong> {selectedBooking.stripePaymentId}</div>}
              </div>
              {/* Mini-Rechnung */}
              <div className="bg-gray-50 rounded-lg p-4 mt-2 mb-2">
                <h3 className="text-lg font-semibold mb-2">Rechnungsübersicht</h3>
                <div className="flex flex-col gap-1 text-sm">
                  {selectedBooking.pricePerNight !== undefined && <div><span className="font-medium">Preis/Nacht:</span> {selectedBooking.pricePerNight}€</div>}
                  {selectedBooking.nights !== undefined && <div><span className="font-medium">Nächte:</span> {selectedBooking.nights}</div>}
                  {selectedBooking.subtotal !== undefined && <div><span className="font-medium">Zwischensumme:</span> {selectedBooking.subtotal}€</div>}
                  {selectedBooking.cleaningFee !== undefined && <div><span className="font-medium">Reinigungsgebühr:</span> {selectedBooking.cleaningFee}€</div>}
                  {selectedBooking.discount !== undefined && <div><span className="font-medium">Rabatt:</span> {selectedBooking.discount}€</div>}
                  {selectedBooking.vat !== undefined && <div><span className="font-medium">Mehrwertsteuer:</span> {selectedBooking.vat}€</div>}
                  <div className="border-t border-gray-300 my-2"></div>
                  <div className="font-bold text-base">Gesamtbetrag: {selectedBooking.total}€</div>
                </div>
              </div>
            </div>
          </div>
        )}
        <div className="flex items-center justify-between mb-8">
          <h1 className="text-4xl font-bold">Admin Dashboard</h1>
          <button
            type="button"
            onClick={handleLogout}
            className="text-sm text-gray-600 hover:text-gray-900 border border-gray-200 px-3 py-2 rounded-lg"
          >
            Logout
          </button>
        </div>

        {actionMessage && (
          <div
            className={`mb-6 rounded-lg border px-4 py-3 text-sm ${
              actionMessage.type === 'success'
                ? 'border-green-200 bg-green-50 text-green-800'
                : 'border-red-200 bg-red-50 text-red-800'
            }`}
          >
            {actionMessage.text}
          </div>
        )}

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
            onClick={() => setActiveTab('deleted')}
            className={`px-6 py-3 font-semibold ${activeTab === 'deleted' ? 'border-b-2 border-blue-600 text-blue-600' : 'text-gray-600'}`}
          >
            Geloeschte Buchungen ({deletedBookings.length})
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
                      <div className="flex gap-2">
                        <button
                          onClick={() => setSelectedBooking(booking)}
                          className="bg-blue-600 hover:bg-blue-700 text-white text-xs font-semibold px-3 py-1.5 rounded-md"
                        >
                          Details
                        </button>
                        <button
                          onClick={async () => {
                            if (!confirm('Buchung wirklich archivieren?')) return;
                            try {
                              const apiUrl = getApiUrl();
                              const response = await fetch(`${apiUrl}/admin/bookings/${booking._id}`, {
                                method: 'DELETE',
                                headers: { Authorization: `Basic ${auth}` }
                              });
                              if (response.ok) {
                                loadData();
                              } else {
                                alert('Archivieren fehlgeschlagen');
                              }
                            } catch (error) {
                              console.error('Error deleting booking:', error);
                              alert('Archivieren fehlgeschlagen');
                            }
                          }}
                          className="text-red-600 hover:text-red-800"
                        >
                          Archivieren
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {/* Geloeschte Buchungen */}
        {activeTab === 'deleted' && (
          <div className="bg-white rounded-lg shadow overflow-hidden">
            <table className="w-full">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Geloescht am</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Name</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Wohnung</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Zeitraum</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Betrag</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Aktion</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200">
                {deletedBookings.map((booking) => (
                  <tr key={booking._id} className="hover:bg-gray-50">
                    <td className="px-6 py-4 whitespace-nowrap text-sm">
                      {booking.deletedAt ? new Date(booking.deletedAt).toLocaleDateString('de-DE') : '-'}
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
                      <div className="text-gray-500">{booking.nights} Naechte</div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                      {booking.total}€
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm">
                      <div className="flex items-center gap-2">
                        <button
                          type="button"
                          onClick={async () => {
                            try {
                              const apiUrl = getApiUrl();
                              const response = await fetch(`${apiUrl}/admin/deleted-bookings/${booking._id}/restore`, {
                                method: 'PATCH',
                                headers: { Authorization: `Basic ${auth}` }
                              });
                              if (response.ok) {
                                showActionMessage('success', 'Buchung wiederhergestellt');
                                loadData();
                              } else {
                                showActionMessage('error', 'Wiederherstellen fehlgeschlagen');
                              }
                            } catch (error) {
                              console.error('Error restoring booking:', error);
                              showActionMessage('error', 'Wiederherstellen fehlgeschlagen');
                            }
                          }}
                          className="bg-blue-600 hover:bg-blue-700 text-white text-xs font-semibold px-3 py-1.5 rounded-md"
                        >
                          Wiederherstellen
                        </button>
                        <button
                          type="button"
                          onClick={async () => {
                            try {
                              const apiUrl = getApiUrl();
                              const response = await fetch(`${apiUrl}/admin/deleted-bookings/${booking._id}`, {
                                method: 'DELETE',
                                headers: { Authorization: `Basic ${auth}` }
                              });
                              if (response.ok) {
                                showActionMessage('success', 'Buchung permanent geloescht');
                                loadData();
                              } else {
                                showActionMessage('error', 'Permanent loeschen fehlgeschlagen');
                              }
                            } catch (error) {
                              console.error('Error deleting booking:', error);
                              showActionMessage('error', 'Permanent loeschen fehlgeschlagen');
                            }
                          }}
                          className="bg-red-600 hover:bg-red-700 text-white text-xs font-semibold px-3 py-1.5 rounded-md"
                        >
                          Permanent loeschen
                        </button>
                      </div>
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
