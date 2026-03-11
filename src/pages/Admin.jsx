import { useState, useEffect, useRef } from 'react';
import { format } from 'date-fns';
import { getApiUrl } from '../utils/api.js';
import BookingEditor from '../components/BookingEditor.jsx';
import NewBookingForm from '../components/NewBookingForm.jsx';
import { EU_COUNTRIES, getCountryDisplayName } from '../utils/addressSchemas.js';

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
  const [editingBooking, setEditingBooking] = useState(null);
  const [showNewBookingForm, setShowNewBookingForm] = useState(false);
  const [showFollowUpModal, setShowFollowUpModal] = useState(false);
  const [followUpDraft, setFollowUpDraft] = useState(null);
  const [followUpBusy, setFollowUpBusy] = useState(false);
  const [followUpCountdownOpen, setFollowUpCountdownOpen] = useState(false);
  const [followUpCountdown, setFollowUpCountdown] = useState(20);
  const [paymentProofFile, setPaymentProofFile] = useState(null);
  const [markingPaid, setMarkingPaid] = useState(false);
  const [markingUnpaid, setMarkingUnpaid] = useState(false);
  const [selectedCustomerForBooking, setSelectedCustomerForBooking] = useState('');
  const [assigningCustomer, setAssigningCustomer] = useState(false);

  // Kunden-Management
  const [customers, setCustomers] = useState([]);
  const [selectedCustomer, setSelectedCustomer] = useState(null);
  const [editingCustomer, setEditingCustomer] = useState(null);
  const [showNewCustomerForm, setShowNewCustomerForm] = useState(false);

  const followUpIntervalRef = useRef(null);
  const followUpTimeoutRef = useRef(null);

  // Form für Zeitblockierung
  const [blockForm, setBlockForm] = useState({
    wohnung: 'hackerberg',
    startDate: '',
    endDate: '',
    reason: ''
  });

  const [botStatus, setBotStatus] = useState('unknown');
  const [botLogs, setBotLogs] = useState('');
  const [botInfo, setBotInfo] = useState({ host: '', service: '', projectDir: '' });
  const [botLoading, setBotLoading] = useState(false);
  const [botError, setBotError] = useState('');

  const wohnungen = {
    hackerberg: 'Wohnung Hackerberg',
    neubau: 'Wohnung Frühlingstraße',
    kombi: 'Kombi (beide)'
  };

  useEffect(() => {
    return () => {
      if (messageTimeoutRef.current) {
        clearTimeout(messageTimeoutRef.current);
      }
      if (followUpIntervalRef.current) {
        clearInterval(followUpIntervalRef.current);
      }
      if (followUpTimeoutRef.current) {
        clearTimeout(followUpTimeoutRef.current);
      }
    };
  }, []);

  const calculateNights = (startDate, endDate) => {
    const start = new Date(startDate);
    const end = new Date(endDate);
    const diffDays = Math.ceil((end - start) / (1000 * 60 * 60 * 24));
    return Math.max(1, diffDays || 1);
  };

  const getDateOnlyTimestamp = (value) => {
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) return 0;
    return Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate());
  };

  const sortBookingsByCreatedAndStart = (items) => {
    if (!Array.isArray(items)) return [];

    return [...items].sort((a, b) => {
      const createdDiff = getDateOnlyTimestamp(b.createdAt) - getDateOnlyTimestamp(a.createdAt);
      if (createdDiff !== 0) return createdDiff;

      const startDiff = new Date(b.startDate).getTime() - new Date(a.startDate).getTime();
      if (!Number.isNaN(startDiff) && startDiff !== 0) return startDiff;

      return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
    });
  };

  const buildFollowUpDraftFromCustomer = async (customer) => {
    const apiUrl = getApiUrl();
    const response = await fetch(`${apiUrl}/admin/customers/${customer._id}/bookings`, {
      headers: { Authorization: `Basic ${auth}` }
    });

    if (!response.ok) {
      throw new Error('Fehler beim Laden der Buchungen');
    }

    const { bookings: customerBookings } = await response.json();
    if (!customerBookings || customerBookings.length === 0) {
      throw new Error('Keine Buchungen für diesen Kunden gefunden');
    }

    const lastBooking = customerBookings.sort((a, b) => new Date(b.endDate) - new Date(a.endDate))[0];
    const newStartDate = new Date(lastBooking.endDate);
    const newEndDate = new Date(lastBooking.endDate);
    newEndDate.setDate(newEndDate.getDate() + 28);

    const nights = calculateNights(newStartDate, newEndDate);
    const pricePerNight = Number(lastBooking.pricePerNight || 0);
    const cleaningFee = Number(lastBooking.cleaningFee || 0);
    const cleaningBufferDays = Math.max(1, Math.min(30, Number(lastBooking.cleaningBufferDays || 3)));
    const subtotal = pricePerNight * nights + cleaningFee;
    const discount = 0;
    const vat = (subtotal - discount) * 0.07;

    setFollowUpDraft({
      customerId: customer._id,
      customerName: customer.name,
      name: customer.name || lastBooking.name || '',
      email: customer.email || lastBooking.email || '',
      phone: customer.phone || customer.mobile || lastBooking.phone || '',
      company: customer.name || lastBooking.company || '',
      street: lastBooking.street || '',
      addressLine2: lastBooking.addressLine2 || '',
      zip: lastBooking.zip || '',
      city: lastBooking.city || '',
      country: lastBooking.country || 'DE',
      countryLabel:
        lastBooking.countryLabel || getCountryDisplayName(lastBooking.country || 'DE', 'de'),
      wohnung: lastBooking.wohnung,
      wohnungLabel: lastBooking.wohnungLabel || wohnungen[lastBooking.wohnung] || 'Wohnung Hackerberg',
      startDate: newStartDate.toISOString().slice(0, 10),
      endDate: newEndDate.toISOString().slice(0, 10),
      nights,
      people: Number(lastBooking.people || 1),
      pricePerNight,
      cleaningFee,
      cleaningBufferDays,
      discountPercent: 0,
      checkInTime: lastBooking.checkInTime || '15:00',
      checkOutTime: lastBooking.checkOutTime || '10:00',
      paymentStatus: 'pending',
      bookingStatus: 'confirmed',
      isFollowUpInvoice: true,
      sendConfirmationEmail: true,
      subtotal,
      discount,
      vat,
      total: subtotal - discount + vat
    });
  };

  const recomputeFollowUpTotals = (draft) => {
    const subtotal = (Number(draft.pricePerNight || 0) * Number(draft.nights || 0)) + Number(draft.cleaningFee || 0);
    const discount = subtotal * (Number(draft.discountPercent || 0) / 100);
    const vat = (subtotal - discount) * 0.07;
    const total = subtotal - discount + vat;

    return {
      ...draft,
      wohnungLabel: wohnungen[draft.wohnung] || draft.wohnungLabel,
      subtotal,
      discount,
      vat,
      total
    };
  };

  const updateFollowUpDraft = (field, value) => {
    setFollowUpDraft((prev) => {
      if (!prev) return prev;
      const next = { ...prev };

      // Zahlenfelder so behandeln wie im "Neue Buchung"-Formular:
      // leere Eingaben sind erlaubt und werden erst bei Berechnung/Speichern als 0 behandelt.
      if (['nights', 'people', 'pricePerNight', 'cleaningFee', 'discountPercent', 'cleaningBufferDays'].includes(field)) {
        if (value === '') {
          next[field] = '';
        } else {
          const parsed = Number(value);
          if (field === 'people') {
            next[field] = Math.max(1, Math.min(11, Math.floor(parsed || 0)));
          } else if (field === 'nights') {
            next[field] = Math.max(1, Math.floor(parsed || 0));
          } else if (field === 'cleaningBufferDays') {
            next[field] = Math.max(1, Math.min(30, Math.floor(parsed || 0)));
          } else if (field === 'discountPercent') {
            next[field] = Math.max(0, Math.min(100, parsed || 0));
          } else {
            next[field] = Math.max(0, parsed || 0);
          }
        }
      } else {
        next[field] = value;
      }

      if (field === 'country') {
        next.countryLabel = getCountryDisplayName(value || 'DE', 'de');
      }

      if (field === 'startDate' || field === 'endDate') {
        next.nights = calculateNights(next.startDate, next.endDate);
      }

      if (
        field === 'pricePerNight' ||
        field === 'nights' ||
        field === 'startDate' ||
        field === 'endDate' ||
        field === 'cleaningFee' ||
        field === 'discountPercent' ||
        field === 'wohnung'
      ) {
        return recomputeFollowUpTotals(next);
      }

      return next;
    });
  };

  const clearFollowUpCountdown = () => {
    if (followUpIntervalRef.current) {
      clearInterval(followUpIntervalRef.current);
      followUpIntervalRef.current = null;
    }
    if (followUpTimeoutRef.current) {
      clearTimeout(followUpTimeoutRef.current);
      followUpTimeoutRef.current = null;
    }
  };

  const executeFollowUpBooking = async () => {
    if (!followUpDraft || followUpBusy) return;

    try {
      setFollowUpBusy(true);
      const apiUrl = getApiUrl();
      const payload = {
        ...followUpDraft,
        startDate: new Date(followUpDraft.startDate).toISOString(),
        endDate: new Date(followUpDraft.endDate).toISOString(),
        people: Number(followUpDraft.people) || 1,
        nights: Number(followUpDraft.nights) || 0,
        pricePerNight: Number(followUpDraft.pricePerNight) || 0,
        cleaningFee: Number(followUpDraft.cleaningFee) || 0,
        cleaningBufferDays: Number(followUpDraft.cleaningBufferDays) || 3,
        subtotal: Number(followUpDraft.subtotal) || 0,
        discount: Number(followUpDraft.discount) || 0,
        vat: Number(followUpDraft.vat) || 0,
        total: Number(followUpDraft.total) || 0
      };

      const response = await fetch(`${apiUrl}/admin/bookings`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Basic ${auth}`
        },
        body: JSON.stringify(payload)
      });

      const data = await response.json().catch(() => ({}));
      if (!response.ok) {
        throw new Error(data.error || 'Fehler beim Erstellen der Folgerechnung');
      }

      clearFollowUpCountdown();
      setFollowUpCountdownOpen(false);
      setFollowUpDraft(null);
      setShowFollowUpModal(false);
      loadData();
      showActionMessage(
        'success',
        payload.sendConfirmationEmail
          ? `Folgerechnung für ${payload.name} erstellt und E-Mail versendet`
          : `Folgerechnung für ${payload.name} ohne E-Mail-Versand erstellt`
      );
    } catch (err) {
      showActionMessage('error', err.message || 'Fehler beim Erstellen der Folgerechnung');
    } finally {
      setFollowUpBusy(false);
    }
  };

  const startFollowUpCountdown = () => {
    if (!followUpDraft) return;

    if (!followUpDraft.name || !followUpDraft.email || !followUpDraft.startDate || !followUpDraft.endDate) {
      alert('Bitte prüfen Sie Name, E-Mail und Zeitraum.');
      return;
    }

    setFollowUpCountdown(20);
    setFollowUpCountdownOpen(true);
    clearFollowUpCountdown();

    followUpIntervalRef.current = setInterval(() => {
      setFollowUpCountdown((prev) => (prev > 0 ? prev - 1 : 0));
    }, 1000);

    followUpTimeoutRef.current = setTimeout(() => {
      executeFollowUpBooking();
    }, 20000);
  };

  const cancelFollowUpCountdown = () => {
    clearFollowUpCountdown();
    setFollowUpCountdownOpen(false);
    setFollowUpCountdown(20);
    showActionMessage('success', 'Folgerechnung und E-Mail-Versand wurden abgebrochen');
  };

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

  useEffect(() => {
    if (!auth || activeTab !== 'bot-console') {
      return;
    }

    loadBotConsole();
    const interval = setInterval(() => {
      loadBotLogs();
      loadBotStatus();
    }, 4000);

    return () => clearInterval(interval);
  }, [auth, activeTab]);

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
      setBookings(sortBookingsByCreatedAndStart(bookingsData));

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

      // Kunden laden
      const customersRes = await fetch(`${apiUrl}/admin/customers`, { headers });
      if (customersRes.ok) {
        const customersData = await customersRes.json();
        setCustomers(customersData);
      }

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

  const loadBotStatus = async () => {
    try {
      setBotError(''); // Clear previous errors
      const apiUrl = getApiUrl();
      const response = await fetch(`${apiUrl}/admin/bot-console/status`, {
        headers: { Authorization: `Basic ${auth}` }
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || `Fehler ${response.status}`);

      setBotStatus(data.status || 'unknown');
      setBotInfo({
        host: data.host || '-',
        service: data.service || '-',
        projectDir: data.projectDir || ''
      });
    } catch (error) {
      console.error('Bot Status Error:', error);
      setBotError(`Status: ${error.message}`);
      setBotStatus('unknown');
    }
  };

  const loadBotLogs = async () => {
    try {
      const apiUrl = getApiUrl();
      const response = await fetch(`${apiUrl}/admin/bot-console/logs?lines=200`, {
        headers: { Authorization: `Basic ${auth}` }
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || `Fehler ${response.status}`);
      setBotLogs(data.output || '');
    } catch (error) {
      console.error('Bot Logs Error:', error);
      setBotError(`Logs: ${error.message}`);
      setBotLogs('');
    }
  };

  const loadBotConsole = async () => {
    setBotLoading(true);
    await Promise.all([loadBotStatus(), loadBotLogs()]);
    setBotLoading(false);
  };

  const controlBot = async (action) => {
    try {
      setBotLoading(true);
      setBotError('');
      const apiUrl = getApiUrl();
      const response = await fetch(`${apiUrl}/admin/bot-console/${action}`, {
        method: 'POST',
        headers: { Authorization: `Basic ${auth}` }
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || `Bot konnte nicht ${action} ausgeführt werden`);
      setBotStatus(data.status || 'unknown');
      await loadBotLogs();
    } catch (error) {
      setBotError(error.message);
    } finally {
      setBotLoading(false);
    }
  };

  const clearBotLogs = async () => {
    if (!confirm('Logs wirklich löschen?')) return;
    setBotLogs('');
    showActionMessage('success', 'Logs gelöscht');
  };

  const readFileAsDataUrl = (file) =>
    new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(reader.result);
      reader.onerror = reject;
      reader.readAsDataURL(file);
    });

  const handleMarkAsPaid = async () => {
    if (!selectedBooking) return;
    if (!confirm('Sicher als bezahlt markieren?')) return;

    try {
      setMarkingPaid(true);
      const apiUrl = getApiUrl();

      let paymentProof = null;
      if (paymentProofFile) {
        const dataUrl = await readFileAsDataUrl(paymentProofFile);
        paymentProof = {
          fileName: paymentProofFile.name,
          mimeType: paymentProofFile.type,
          dataUrl
        };
      }

      const response = await fetch(`${apiUrl}/admin/bookings/${selectedBooking._id}/mark-paid`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Basic ${auth}`
        },
        body: JSON.stringify({ paymentProof })
      });

      const data = await response.json();
      if (!response.ok) throw new Error(data.error || 'Fehler beim Markieren als bezahlt');

      setBookings((prev) => sortBookingsByCreatedAndStart(prev.map((b) => (b._id === data._id ? data : b))));
      setSelectedBooking(data);
      setPaymentProofFile(null);
      showActionMessage('success', 'Buchung als bezahlt markiert');
      loadData();
    } catch (error) {
      alert(error.message || 'Fehler beim Markieren als bezahlt');
    } finally {
      setMarkingPaid(false);
    }
  };

  const handleMarkAsUnpaid = async () => {
    if (!selectedBooking) return;

    try {
      setMarkingUnpaid(true);
      const apiUrl = getApiUrl();

      const response = await fetch(`${apiUrl}/admin/bookings/${selectedBooking._id}/mark-unpaid`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Basic ${auth}`
        }
      });

      const data = await response.json();
      if (!response.ok) throw new Error(data.error || 'Fehler beim Rückgängig-Machen des Zahlungsstatus');

      setBookings((prev) => sortBookingsByCreatedAndStart(prev.map((b) => (b._id === data._id ? data : b))));
      setSelectedBooking(data);
      setPaymentProofFile(null);
      showActionMessage('success', 'Bezahlstatus wurde zurückgesetzt');
      loadData();
    } catch (error) {
      alert(error.message || 'Fehler beim Rückgängig-Machen des Zahlungsstatus');
    } finally {
      setMarkingUnpaid(false);
    }
  };

  const handleAssignCustomerToBooking = async () => {
    if (!selectedBooking) return;

    try {
      setAssigningCustomer(true);
      const apiUrl = getApiUrl();

      const response = await fetch(`${apiUrl}/admin/bookings/${selectedBooking._id}/assign-customer`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Basic ${auth}`
        },
        body: JSON.stringify({ customerId: selectedCustomerForBooking || null })
      });

      const data = await response.json();
      if (!response.ok) throw new Error(data.error || 'Fehler bei Kundenzuordnung');

      setBookings((prev) => sortBookingsByCreatedAndStart(prev.map((b) => (b._id === data._id ? data : b))));
      setSelectedBooking(data);
      showActionMessage('success', 'Kunde zur Buchung zugeordnet');
      loadData();
    } catch (error) {
      alert(error.message || 'Fehler bei Kundenzuordnung');
    } finally {
      setAssigningCustomer(false);
    }
  };

  const handleDeleteCustomer = async (customer) => {
    if (!customer?._id) return;
    if (!confirm('Wollen Sie sicher den Kunden löschen? Alle Kundenstamm Daten gehen verloren.')) return;

    try {
      const apiUrl = getApiUrl();
      const response = await fetch(`${apiUrl}/admin/customers/${customer._id}`, {
        method: 'DELETE',
        headers: { Authorization: `Basic ${auth}` }
      });

      const data = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(data.error || 'Löschen fehlgeschlagen');

      if (selectedCustomer?._id === customer._id) {
        setSelectedCustomer(null);
      }
      if (editingCustomer?._id === customer._id) {
        setEditingCustomer(null);
      }

      showActionMessage('success', 'Kunde gelöscht');
      loadData();
    } catch (error) {
      showActionMessage('error', error.message || 'Löschen fehlgeschlagen');
    }
  };

  useEffect(() => {
    if (selectedBooking?.customerId) {
      setSelectedCustomerForBooking(String(selectedBooking.customerId));
    } else {
      setSelectedCustomerForBooking('');
    }
  }, [selectedBooking]);

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
          <p className="text-sm text-gray-600 mb-1">Bitte melden Sie sich an.</p>
          <p className="text-xs text-gray-500 mb-6">Direktzugang: /admin</p>

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
                type="text"
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

  const neubauBlockedDates = blockedDates.filter((entry) => entry.wohnung === 'neubau');
  const hackerbergBlockedDates = blockedDates.filter((entry) => entry.wohnung === 'hackerberg');

  const renderBlockedDatesTable = (entries) => (
    <div className="bg-white rounded-lg shadow overflow-hidden">
      <table className="w-full">
        <thead className="bg-gray-50">
          <tr>
            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Zeitraum</th>
            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Grund</th>
            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Erstellt von</th>
            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Aktion</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-gray-200">
          {entries.map((blocked) => (
            <tr key={blocked._id}>
              <td className="px-6 py-4 whitespace-nowrap text-sm">
                {new Date(blocked.startDate).toLocaleDateString('de-DE')} - {new Date(blocked.endDate).toLocaleDateString('de-DE')}
              </td>
              <td className="px-6 py-4 text-sm">{blocked.reason}</td>
              <td className="px-6 py-4 text-sm">
                <span className={blocked.createdByLabel === 'Privat' ? 'text-gray-600 italic' : 'font-medium'}>
                  {blocked.createdByLabel || 'Privat'}
                </span>
              </td>
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
          {entries.length === 0 && (
            <tr>
              <td colSpan={4} className="px-6 py-6 text-sm text-gray-500">
                Keine blockierten Zeiten vorhanden.
              </td>
            </tr>
          )}
        </tbody>
      </table>
    </div>
  );

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="container mx-auto px-4 py-8">
        {/* Pop-Up für Buchungsdetails */}
        {selectedBooking && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-40">
            <div className="bg-white rounded-2xl shadow-lg p-6 max-w-md w-full relative overflow-y-auto" style={{ maxHeight: '90vh' }}>
              <button
                className="absolute top-4 right-4 text-gray-500 hover:text-gray-800 text-xl"
                onClick={() => {
                  setSelectedBooking(null);
                  setPaymentProofFile(null);
                }}
                aria-label="Schließen"
              >
                ×
              </button>
              <h2 className="text-2xl font-bold mb-4">Buchungsdetails</h2>
              {(() => {
                const linkedCustomer = customers.find((c) => String(c._id) === String(selectedBooking.customerId || ''));
                return (
                  <div className="mb-4 p-3 bg-blue-50 rounded-lg border border-blue-100">
                    <p className="text-sm text-gray-700 mb-2">
                      <strong>Zugeordneter Kunde:</strong>{' '}
                      {linkedCustomer
                        ? `${linkedCustomer.customerNumber || '—'} · ${linkedCustomer.name}`
                        : 'Noch kein Kunde zugeordnet'}
                    </p>
                    <div className="flex flex-col gap-2">
                      <select
                        value={selectedCustomerForBooking}
                        onChange={(e) => setSelectedCustomerForBooking(e.target.value)}
                        className="w-full border rounded px-3 py-2 text-sm"
                      >
                        <option value="">— Keine Zuordnung —</option>
                        {customers.map((customer) => (
                          <option key={customer._id} value={customer._id}>
                            {(customer.customerNumber || '—')} · {customer.name} ({customer.email})
                          </option>
                        ))}
                      </select>
                      <button
                        type="button"
                        onClick={handleAssignCustomerToBooking}
                        disabled={assigningCustomer}
                        className="w-full bg-blue-600 hover:bg-blue-700 text-white font-semibold py-2 px-4 rounded-lg transition disabled:opacity-50"
                      >
                        {assigningCustomer ? 'Speichert...' : 'Kunde manuell zuordnen'}
                      </button>
                    </div>
                  </div>
                );
              })()}
              
              {selectedBooking.isPartialBooking && (
                <div className="mb-4 p-3 bg-yellow-50 rounded-lg border border-yellow-300">
                  <h3 className="text-sm font-bold text-yellow-800 mb-2">⚠️ Teilbuchung</h3>
                  <div className="text-xs text-gray-700 space-y-1">
                    <p><strong>Gesamtzeitraum:</strong> {selectedBooking.originalStartDate ? new Date(selectedBooking.originalStartDate).toLocaleDateString('de-DE') : '-'} - {selectedBooking.originalEndDate ? new Date(selectedBooking.originalEndDate).toLocaleDateString('de-DE') : '-'} ({selectedBooking.totalNights} Nächte)</p>
                    <p><strong>Bezahlt bis:</strong> {selectedBooking.paidThroughDate ? new Date(selectedBooking.paidThroughDate).toLocaleDateString('de-DE') : '-'} ({selectedBooking.nights} Nächte)</p>
                    <p><strong>Verbleibend:</strong> {selectedBooking.totalNights - selectedBooking.nights} Nächte (reserviert)</p>
                  </div>
                </div>
              )}
              
              {selectedBooking.adminNote && (
                <div className="mb-4 p-3 bg-blue-50 rounded-lg border border-blue-300">
                  <h3 className="text-sm font-bold text-blue-800 mb-2">ℹ️ Admin-Hinweis</h3>
                  <p className="text-xs text-gray-700">{selectedBooking.adminNote}</p>
                </div>
              )}
              
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
                <div className="col-span-2 text-sm text-gray-700"><strong>{selectedBooking.isPartialBooking ? 'Bezahlter Zeitraum:' : 'Zeitraum:'}</strong> {selectedBooking.startDate ? new Date(selectedBooking.startDate).toLocaleDateString('de-DE') : '-'} - {selectedBooking.endDate ? new Date(selectedBooking.endDate).toLocaleDateString('de-DE') : '-'}</div>
                <div className="col-span-1 text-sm text-gray-700"><strong>{selectedBooking.isPartialBooking ? 'Bezahlte Nächte:' : 'Nächte:'}</strong> {selectedBooking.nights}</div>
                <div className="col-span-1 text-sm text-gray-700"><strong>Personen:</strong> {selectedBooking.people}</div>
                <div className="col-span-1 text-sm text-gray-700"><strong>Check-In:</strong> {selectedBooking.checkInTime || '-'}</div>
                <div className="col-span-1 text-sm text-gray-700"><strong>Check-Out:</strong> {selectedBooking.checkOutTime || '-'}</div>
                <div className="col-span-2 text-sm text-gray-700"><strong>Status:</strong> {selectedBooking.paymentStatus === 'paid' ? '✓ Bezahlt' : 'Ausstehend'}</div>
                {selectedBooking.paidAt && (
                  <div className="col-span-2 text-sm text-gray-700"><strong>Bezahlt am:</strong> {new Date(selectedBooking.paidAt).toLocaleDateString('de-DE')}</div>
                )}
                {selectedBooking.stripePaymentIntentId && <div className="col-span-2 text-xs text-gray-500"><strong>Stripe Payment Intent:</strong> {selectedBooking.stripePaymentIntentId}</div>}
                {selectedBooking.stripePaymentId && <div className="col-span-2 text-xs text-gray-500"><strong>Stripe Payment ID:</strong> {selectedBooking.stripePaymentId}</div>}
              </div>

              <div className="mt-3 p-3 bg-gray-50 rounded-lg border">
                <div className="flex flex-col gap-3">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Zahlungsnachweis (Screenshot, optional)</label>
                    <input
                      type="file"
                      accept="image/*"
                      onChange={(e) => setPaymentProofFile(e.target.files?.[0] || null)}
                      className="block w-full text-sm text-gray-700"
                    />
                    {paymentProofFile && (
                      <p className="text-xs text-gray-500 mt-1">Ausgewählt: {paymentProofFile.name}</p>
                    )}
                  </div>

                  {selectedBooking.paymentProof?.dataUrl && (
                    <div>
                      <p className="text-sm font-medium text-gray-700 mb-2">Vorhandener Zahlungsnachweis</p>
                      <a
                        href={selectedBooking.paymentProof.dataUrl}
                        target="_blank"
                        rel="noreferrer"
                        className="inline-block text-blue-600 hover:text-blue-800 text-sm font-semibold"
                      >
                        Screenshot öffnen
                      </a>
                    </div>
                  )}

                  <button
                    type="button"
                    onClick={handleMarkAsPaid}
                    disabled={markingPaid || markingUnpaid || selectedBooking.paymentStatus === 'paid'}
                    className={`w-full font-semibold py-2 px-4 rounded-lg transition ${
                      selectedBooking.paymentStatus === 'paid'
                        ? 'bg-gray-200 text-gray-500 cursor-not-allowed'
                        : 'bg-green-600 hover:bg-green-700 text-white'
                    }`}
                  >
                    {selectedBooking.paymentStatus === 'paid'
                      ? 'Bereits als bezahlt markiert'
                      : markingPaid
                        ? 'Wird gespeichert...'
                        : '✓ Als bezahlt markieren'}
                  </button>

                  <button
                    type="button"
                    onClick={handleMarkAsUnpaid}
                    disabled={markingPaid || markingUnpaid || selectedBooking.paymentStatus !== 'paid'}
                    className={`w-full font-semibold py-2 px-4 rounded-lg transition ${
                      selectedBooking.paymentStatus === 'paid'
                        ? 'bg-orange-500 hover:bg-orange-600 text-white'
                        : 'bg-gray-200 text-gray-500 cursor-not-allowed'
                    }`}
                  >
                    {markingUnpaid ? 'Wird zurückgesetzt...' : '↺ Als unbezahlt markieren'}
                  </button>
                </div>
              </div>

              {/* Mini-Rechnung */}
              <div className="bg-gray-50 rounded-lg p-4 mt-2 mb-2">
                <h3 className="text-lg font-semibold mb-2">Rechnungsübersicht</h3>
                <div className="flex flex-col gap-1 text-sm">
                  {selectedBooking.pricePerNight !== undefined && <div><span className="font-medium">Preis/Nacht:</span> {selectedBooking.pricePerNight}€</div>}
                  {selectedBooking.nights !== undefined && <div><span className="font-medium">Nächte:</span> {selectedBooking.nights}</div>}
                  {selectedBooking.cleaningFee !== undefined && <div><span className="font-medium">Reinigungsgebühr:</span> {selectedBooking.cleaningFee}€</div>}
                  {selectedBooking.subtotal !== undefined && <div><span className="font-medium">Zwischensumme:</span> {selectedBooking.subtotal}€</div>}
                  {selectedBooking.discount !== undefined && <div><span className="font-medium">Rabatt:</span> {selectedBooking.discount}€</div>}
                  {selectedBooking.vat !== undefined && <div><span className="font-medium">Mehrwertsteuer:</span> {selectedBooking.vat}€</div>}
                  <div className="border-t border-gray-300 my-2"></div>
                  <div className="font-bold text-base">Gesamtbetrag: {selectedBooking.total}€</div>
                </div>
                {/* Download-Link für Rechnung */}
                <div className="mt-4 flex gap-2 flex-col">
                  <button
                    className="inline-block bg-blue-600 hover:bg-blue-700 text-white font-bold py-2 px-4 rounded-lg transition"
                    onClick={async () => {
                      try {
                        const res = await fetch(`${getApiUrl()}/bookings/${selectedBooking._id}/invoice`);
                        if (!res.ok) throw new Error('Fehler beim Herunterladen der Rechnung');
                        const blob = await res.blob();
                        const contentDisposition = res.headers.get('content-disposition') || '';
                        const headerFileNameMatch = contentDisposition.match(/filename=\"?([^\";]+)\"?/i);
                        const headerFileName = headerFileNameMatch ? headerFileNameMatch[1] : '';
                        const bookingDate = selectedBooking.createdAt ? new Date(selectedBooking.createdAt) : new Date();
                        const datePart = `${bookingDate.getFullYear()}${String(bookingDate.getMonth() + 1).padStart(2, '0')}${String(bookingDate.getDate()).padStart(2, '0')}`;
                        const shortId = String(selectedBooking._id || '').slice(-4).toUpperCase();
                        const fallbackFileName = `Rechnung-FD-${datePart}-${shortId}.pdf`;
                        const url = window.URL.createObjectURL(blob);
                        const a = document.createElement('a');
                        a.href = url;
                        a.download = headerFileName || fallbackFileName;
                        document.body.appendChild(a);
                        a.click();
                        a.remove();
                        window.URL.revokeObjectURL(url);
                      } catch (err) {
                        alert('Fehler beim Herunterladen der Rechnung');
                      }
                    }}
                  >
                    📄 Rechnung herunterladen
                  </button>
                  <button
                    className="inline-block bg-green-600 hover:bg-green-700 text-white font-bold py-2 px-4 rounded-lg transition"
                    onClick={async () => {
                      if (!confirm('Buchungsbestätigung mit Rechnung an ' + selectedBooking.email + ' versenden?')) return;
                      try {
                        const apiUrl = getApiUrl();
                        const response = await fetch(`${apiUrl}/admin/bookings/${selectedBooking._id}/send-confirmation`, {
                          method: 'POST',
                          headers: { Authorization: `Basic ${auth}` }
                        });
                        const data = await response.json();
                        if (!response.ok) {
                          throw new Error(data.error || 'Fehler beim Email-Versand');
                        }
                        showActionMessage('success', data.message);
                        setSelectedBooking(null);
                      } catch (err) {
                        showActionMessage('error', err.message);
                      }
                    }}
                  >
                    ✉️ Buchungsbestätigung per Mail manuell senden
                  </button>
                  <button
                    className="inline-block bg-purple-600 hover:bg-purple-700 text-white font-bold py-2 px-4 rounded-lg transition"
                    onClick={() => {
                      setEditingBooking(selectedBooking);
                      setSelectedBooking(null);
                    }}
                  >
                    ✏️ Buchung bearbeiten
                  </button>
                  {selectedBooking.nights >= 30 && (
                    <button
                      className="inline-block bg-orange-600 hover:bg-orange-700 text-white font-bold py-2 px-4 rounded-lg transition"
                      onClick={() => {
                        setSelectedBooking(null);
                        clearFollowUpCountdown();
                        setFollowUpCountdownOpen(false);
                        setFollowUpDraft(null);
                        setShowFollowUpModal(true);
                      }}
                    >
                      📋 Folgerechnung sicher erstellen
                    </button>
                  )}
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Booking Editor Modal */}
        {editingBooking && (
          <BookingEditor
            booking={editingBooking}
            auth={auth}
            onClose={() => setEditingBooking(null)}
            onSave={(updated) => {
              setBookings((prev) => sortBookingsByCreatedAndStart(prev.map((b) => (b._id === updated._id ? updated : b))));
              setEditingBooking(null);
              showActionMessage('success', 'Buchung erfolgreich aktualisiert');
            }}
          />
        )}

        {/* New Booking Form Modal */}
        {showNewBookingForm && (
          <NewBookingForm
            auth={auth}
            customers={customers}
            onClose={() => setShowNewBookingForm(false)}
            onSuccess={(newBooking) => {
              setBookings((prev) => sortBookingsByCreatedAndStart([newBooking, ...prev]));
              setShowNewBookingForm(false);
              showActionMessage('success', 'Buchung erfolgreich erstellt');
              loadData();
            }}
          />
        )}

        {/* Follow-Up Invoice Modal */}
        {showFollowUpModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-40">
            <div className="bg-white rounded-2xl shadow-lg p-6 max-w-2xl w-full relative max-h-[90vh] overflow-y-auto">
              <button
                className="absolute top-4 right-4 text-gray-500 hover:text-gray-800 text-xl"
                onClick={() => {
                  clearFollowUpCountdown();
                  setFollowUpCountdownOpen(false);
                  setFollowUpDraft(null);
                  setShowFollowUpModal(false);
                }}
                aria-label="Schließen"
              >
                ×
              </button>
              <h2 className="text-2xl font-bold mb-4">Folgerechnung erstellen</h2>
              <p className="text-gray-600 mb-2">
                {followUpDraft
                  ? 'Kunde ausgewählt. Bitte prüfen und bearbeiten Sie nun die Buchungsdetails.'
                  : 'Wählen Sie einen Kunden aus. Danach können Sie alle Buchungsdetails manuell bearbeiten.'}
              </p>
              <p className="text-sm text-amber-700 bg-amber-50 border border-amber-200 rounded-lg p-3 mb-6">
                Hinweis: Nach dem finalen Speichern wird automatisch eine Buchungsbestätigung mit Rechnung an den Kunden versendet.
              </p>

              {!followUpDraft && (
              <div className="space-y-2">
                {customers
                  .filter(c => c.isActive && c.totalBookings > 0)
                  .sort((a, b) => a.name.localeCompare(b.name))
                  .map((customer) => (
                    <div
                      key={customer._id}
                      onClick={async () => {
                        try {
                          setFollowUpBusy(true);
                          await buildFollowUpDraftFromCustomer(customer);
                        } catch (err) {
                          alert(err.message || 'Fehler beim Vorbereiten der Folgerechnung');
                        } finally {
                          setFollowUpBusy(false);
                        }
                      }}
                      className="p-4 border border-gray-200 rounded-lg hover:bg-orange-50 cursor-pointer transition"
                    >
                      <div className="flex justify-between items-start">
                        <div className="flex-1">
                          <h3 className="font-semibold text-gray-800">{customer.name}</h3>
                          <p className="text-sm text-gray-600">{customer.email}</p>
                          {customer.contactPerson && (
                            <p className="text-sm text-gray-500">Kontakt: {customer.contactPerson}</p>
                          )}
                        </div>
                        <div className="text-right">
                          <p className="font-semibold text-gray-800">{customer.totalBookings} Buchungen</p>
                          <p className="text-sm text-gray-600">{customer.totalNights} Nächte</p>
                          <p className="text-sm font-medium">{Number(customer.totalRevenue || 0).toFixed(2)}€</p>
                        </div>
                      </div>
                    </div>
                  ))}
                {customers.filter(c => c.isActive && c.totalBookings > 0).length === 0 && (
                  <p className="text-center text-gray-500 py-8">Keine Kunden mit Buchungen gefunden</p>
                )}
              </div>
              )}
              
              <button
                onClick={() => {
                  clearFollowUpCountdown();
                  setFollowUpCountdownOpen(false);
                  setFollowUpDraft(null);
                  setShowFollowUpModal(false);
                }}
                className="mt-6 w-full bg-gray-300 hover:bg-gray-400 text-gray-800 font-bold py-2 px-4 rounded-lg transition"
              >
                Abbrechen
              </button>

              {followUpDraft && (
                <div className="mt-6 border-t pt-6">
                  <div className="mb-4 flex items-center justify-between gap-3 rounded-lg border border-blue-200 bg-blue-50 px-4 py-3">
                    <p className="text-sm text-blue-900">
                      Ausgewählter Kunde: <strong>{followUpDraft.customerName || followUpDraft.name}</strong>
                    </p>
                    <button
                      type="button"
                      onClick={() => setFollowUpDraft(null)}
                      className="text-sm font-semibold text-blue-700 hover:text-blue-900"
                    >
                      Anderen Kunden wählen
                    </button>
                  </div>
                  <h3 className="text-xl font-bold mb-4">Buchungsdetails manuell prüfen und bearbeiten</h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-semibold mb-1">Name</label>
                      <input className="w-full border rounded-lg px-3 py-2" value={followUpDraft.name} onChange={(e) => updateFollowUpDraft('name', e.target.value)} />
                    </div>
                    <div>
                      <label className="block text-sm font-semibold mb-1">E-Mail</label>
                      <input type="email" className="w-full border rounded-lg px-3 py-2" value={followUpDraft.email} onChange={(e) => updateFollowUpDraft('email', e.target.value)} />
                    </div>
                    <div>
                      <label className="block text-sm font-semibold mb-1">Telefon</label>
                      <input className="w-full border rounded-lg px-3 py-2" value={followUpDraft.phone} onChange={(e) => updateFollowUpDraft('phone', e.target.value)} />
                    </div>
                    <div>
                      <label className="block text-sm font-semibold mb-1">Firma</label>
                      <input className="w-full border rounded-lg px-3 py-2" value={followUpDraft.company} onChange={(e) => updateFollowUpDraft('company', e.target.value)} />
                    </div>
                    <div>
                      <label className="block text-sm font-semibold mb-1">Straße</label>
                      <input className="w-full border rounded-lg px-3 py-2" value={followUpDraft.street} onChange={(e) => updateFollowUpDraft('street', e.target.value)} />
                    </div>
                    <div>
                      <label className="block text-sm font-semibold mb-1">Adresszeile 2 (optional)</label>
                      <input className="w-full border rounded-lg px-3 py-2" value={followUpDraft.addressLine2 || ''} onChange={(e) => updateFollowUpDraft('addressLine2', e.target.value)} />
                    </div>
                    <div className="grid grid-cols-2 gap-2">
                      <div>
                        <label className="block text-sm font-semibold mb-1">PLZ</label>
                        <input className="w-full border rounded-lg px-3 py-2" value={followUpDraft.zip} onChange={(e) => updateFollowUpDraft('zip', e.target.value)} />
                      </div>
                      <div>
                        <label className="block text-sm font-semibold mb-1">Ort</label>
                        <input className="w-full border rounded-lg px-3 py-2" value={followUpDraft.city} onChange={(e) => updateFollowUpDraft('city', e.target.value)} />
                      </div>
                    </div>
                    <div>
                      <label className="block text-sm font-semibold mb-1">Land</label>
                      <select className="w-full border rounded-lg px-3 py-2" value={followUpDraft.country || 'DE'} onChange={(e) => updateFollowUpDraft('country', e.target.value)}>
                        {EU_COUNTRIES.map((code) => (
                          <option key={code} value={code}>
                            {getCountryDisplayName(code, 'de')}
                          </option>
                        ))}
                      </select>
                    </div>
                    <div>
                      <label className="block text-sm font-semibold mb-1">Startdatum</label>
                      <input type="date" className="w-full border rounded-lg px-3 py-2" value={followUpDraft.startDate} onChange={(e) => updateFollowUpDraft('startDate', e.target.value)} />
                    </div>
                    <div>
                      <label className="block text-sm font-semibold mb-1">Enddatum</label>
                      <input type="date" className="w-full border rounded-lg px-3 py-2" value={followUpDraft.endDate} onChange={(e) => updateFollowUpDraft('endDate', e.target.value)} />
                    </div>
                    <div>
                      <label className="block text-sm font-semibold mb-1">Wohnung</label>
                      <select className="w-full border rounded-lg px-3 py-2" value={followUpDraft.wohnung} onChange={(e) => updateFollowUpDraft('wohnung', e.target.value)}>
                        <option value="hackerberg">Wohnung Hackerberg</option>
                        <option value="neubau">Wohnung Frühlingstraße</option>
                        <option value="kombi">Kombi (beide)</option>
                      </select>
                    </div>
                    <div>
                      <label className="block text-sm font-semibold mb-1">Check-in</label>
                      <input type="time" className="w-full border rounded-lg px-3 py-2" value={followUpDraft.checkInTime} onChange={(e) => updateFollowUpDraft('checkInTime', e.target.value)} />
                    </div>
                    <div>
                      <label className="block text-sm font-semibold mb-1">Check-out</label>
                      <input type="time" className="w-full border rounded-lg px-3 py-2" value={followUpDraft.checkOutTime} onChange={(e) => updateFollowUpDraft('checkOutTime', e.target.value)} />
                    </div>
                    <div>
                      <label className="block text-sm font-semibold mb-1">Nächte</label>
                      <input type="number" min="1" className="w-full border rounded-lg px-3 py-2" value={followUpDraft.nights} onChange={(e) => updateFollowUpDraft('nights', e.target.value)} />
                    </div>
                    <div>
                      <label className="block text-sm font-semibold mb-1">Personen</label>
                      <input type="number" min="1" className="w-full border rounded-lg px-3 py-2" value={followUpDraft.people} onChange={(e) => updateFollowUpDraft('people', e.target.value)} />
                    </div>
                    <div>
                      <label className="block text-sm font-semibold mb-1">Preis pro Nacht</label>
                      <input type="number" step="0.01" min="0" className="w-full border rounded-lg px-3 py-2" value={followUpDraft.pricePerNight} onChange={(e) => updateFollowUpDraft('pricePerNight', e.target.value)} />
                    </div>
                    <div>
                      <label className="block text-sm font-semibold mb-1">Reinigungsgebühr</label>
                      <input type="number" step="0.01" min="0" className="w-full border rounded-lg px-3 py-2" value={followUpDraft.cleaningFee} onChange={(e) => updateFollowUpDraft('cleaningFee', e.target.value)} />
                    </div>
                    <div>
                      <label className="block text-sm font-semibold mb-1">Reinigungs-Sperrtage nach Abreise</label>
                      <input type="number" min="1" max="30" className="w-full border rounded-lg px-3 py-2" value={followUpDraft.cleaningBufferDays ?? 3} onChange={(e) => updateFollowUpDraft('cleaningBufferDays', e.target.value)} />
                    </div>
                    <div>
                      <label className="block text-sm font-semibold mb-1">Rabatt (%)</label>
                      <input type="number" step="0.1" min="0" max="100" className="w-full border rounded-lg px-3 py-2" value={followUpDraft.discountPercent === '' ? '' : (followUpDraft.discountPercent ?? 0)} onChange={(e) => updateFollowUpDraft('discountPercent', e.target.value)} />
                    </div>
                    <div>
                      <label className="block text-sm font-semibold mb-1">Rabatt (€) - Berechnet</label>
                      <input type="number" disabled className="w-full border rounded-lg px-3 py-2 bg-gray-100 text-gray-600" value={Number(followUpDraft.discount || 0).toFixed(2)} />
                    </div>
                  </div>

                  <div className="mt-3 text-sm text-gray-600">
                    Nächte: {followUpDraft.nights} | Zwischensumme: €{Number(followUpDraft.subtotal || 0).toFixed(2)}
                  </div>

                  <div className="mt-4 p-3 rounded-lg bg-gray-50 border text-sm">
                    <p><strong>Zwischensumme:</strong> {Number(followUpDraft.subtotal || 0).toFixed(2).replace('.', ',')} €</p>
                    <p><strong>Rabatt:</strong> {Number(followUpDraft.discount || 0).toFixed(2).replace('.', ',')} €</p>
                    <p><strong>MwSt. (7%):</strong> {Number(followUpDraft.vat || 0).toFixed(2).replace('.', ',')} €</p>
                    <p><strong>Gesamt:</strong> {Number(followUpDraft.total || 0).toFixed(2).replace('.', ',')} €</p>
                  </div>

                  <div className="mt-4 bg-gray-50 border border-gray-200 rounded p-3">
                    <label className="flex items-start gap-3 text-sm text-gray-700 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={!!followUpDraft.sendConfirmationEmail}
                        onChange={(e) => updateFollowUpDraft('sendConfirmationEmail', e.target.checked)}
                        className="mt-1"
                      />
                      <span>Buchungsbestätigung per E-Mail automatisch versenden</span>
                    </label>
                  </div>

                  <button
                    type="button"
                    disabled={followUpBusy}
                    onClick={startFollowUpCountdown}
                    className="mt-4 w-full bg-red-600 hover:bg-red-700 disabled:bg-red-300 text-white font-bold py-3 px-4 rounded-lg transition"
                  >
                    {followUpBusy
                      ? 'Bitte warten...'
                      : followUpDraft.sendConfirmationEmail
                        ? 'Jetzt Buchung speichern und E-Mail versenden'
                        : 'Jetzt Buchung ohne E-Mail speichern'}
                  </button>
                </div>
              )}
            </div>
          </div>
        )}

        {/* Follow-Up Sicherheits-Countdown */}
        {followUpCountdownOpen && (
          <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black bg-opacity-50">
            <div className="bg-white rounded-2xl shadow-xl p-6 max-w-md w-full">
              <h3 className="text-xl font-bold mb-2">Sicherheits-Countdown</h3>
              <p className="text-gray-700 mb-3">
                Die Buchung wird in <strong>{followUpCountdown} Sekunden</strong> gespeichert
                {followUpDraft?.sendConfirmationEmail ? ' und die Buchungsbestätigung per E-Mail versendet.' : ', ohne E-Mail-Versand.'}
              </p>
              <p className="text-sm text-amber-700 bg-amber-50 border border-amber-200 rounded p-3 mb-4">
                Falls ein Fehler vorliegt, jetzt abbrechen. Nach Ausführung wird die Buchung sofort erstellt
                {followUpDraft?.sendConfirmationEmail ? ' und die E-Mail gesendet.' : '.'}
              </p>
              <div className="flex gap-3">
                <button
                  type="button"
                  onClick={cancelFollowUpCountdown}
                  className="flex-1 bg-gray-300 hover:bg-gray-400 text-gray-800 font-bold py-2 px-4 rounded-lg"
                >
                  Abbrechen
                </button>
                <button
                  type="button"
                  disabled={followUpBusy}
                  onClick={() => {
                    clearFollowUpCountdown();
                    executeFollowUpBooking();
                  }}
                  className="flex-1 bg-red-600 hover:bg-red-700 disabled:bg-red-300 text-white font-bold py-2 px-4 rounded-lg"
                >
                  Jetzt sofort ausführen
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Customer Details Modal */}
        {selectedCustomer && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-40">
            <div className="bg-white rounded-2xl shadow-lg p-6 max-w-4xl w-full relative overflow-y-auto" style={{ maxHeight: '90vh' }}>
              <button
                className="absolute top-4 right-4 text-gray-500 hover:text-gray-800 text-xl"
                onClick={() => setSelectedCustomer(null)}
                aria-label="Schließen"
              >
                ×
              </button>
              <h2 className="text-2xl font-bold mb-4">Kundendetails</h2>
              <div className="grid grid-cols-2 gap-4 mb-6">
                <div>
                  <p className="text-sm text-gray-600">Kundennummer</p>
                  <p className="font-semibold">{selectedCustomer.customerNumber || '-'}</p>
                </div>
                <div>
                  <p className="text-sm text-gray-600">Name</p>
                  <p className="font-semibold">{selectedCustomer.name}</p>
                </div>
                <div>
                  <p className="text-sm text-gray-600">Email</p>
                  <p className="font-semibold">{selectedCustomer.email}</p>
                </div>
                <div>
                  <p className="text-sm text-gray-600">Telefon</p>
                  <p className="font-semibold">{selectedCustomer.phone || '-'}</p>
                </div>
                <div>
                  <p className="text-sm text-gray-600">Handy</p>
                  <p className="font-semibold">{selectedCustomer.mobile || '-'}</p>
                </div>
                <div className="col-span-2">
                  <p className="text-sm text-gray-600">Adresse</p>
                  <p className="font-semibold">{selectedCustomer.address || '-'}</p>
                </div>
                {selectedCustomer.contactPerson && (
                  <div className="col-span-2">
                    <p className="text-sm text-gray-600">Ansprechpartner</p>
                    <p className="font-semibold">{selectedCustomer.contactPerson}</p>
                  </div>
                )}
                {selectedCustomer.ustId && (
                  <div className="col-span-2">
                    <p className="text-sm text-gray-600">USt-ID</p>
                    <p className="font-semibold">{selectedCustomer.ustId}</p>
                  </div>
                )}
              </div>

              <h3 className="text-xl font-bold mb-3">Buchungshistorie</h3>
              <div className="bg-gray-50 rounded-lg p-4 mb-4">
                <div className="grid grid-cols-3 gap-4 text-center">
                  <div>
                    <p className="text-sm text-gray-600">Buchungen</p>
                    <p className="text-2xl font-bold text-blue-600">{selectedCustomer.totalBookings || 0}</p>
                  </div>
                  <div>
                    <p className="text-sm text-gray-600">Nächte</p>
                    <p className="text-2xl font-bold text-green-600">{selectedCustomer.totalNights || 0}</p>
                  </div>
                  <div>
                    <p className="text-sm text-gray-600">Umsatz</p>
                    <p className="text-2xl font-bold text-purple-600">{Number(selectedCustomer.totalRevenue || 0).toFixed(2)}€</p>
                  </div>
                </div>
              </div>

              <button
                onClick={() => setSelectedCustomer(null)}
                className="mt-4 w-full bg-gray-300 hover:bg-gray-400 text-gray-800 font-bold py-2 px-4 rounded-lg transition"
              >
                Schließen
              </button>
            </div>
          </div>
        )}

        {/* Customer Edit/New Modal */}
        {(editingCustomer || showNewCustomerForm) && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-40">
            <div className="bg-white rounded-2xl shadow-lg p-6 max-w-2xl w-full relative overflow-y-auto" style={{ maxHeight: '90vh' }}>
              <button
                className="absolute top-4 right-4 text-gray-500 hover:text-gray-800 text-xl"
                onClick={() => {
                  setEditingCustomer(null);
                  setShowNewCustomerForm(false);
                }}
                aria-label="Schließen"
              >
                ×
              </button>
              <h2 className="text-2xl font-bold mb-4">
                {editingCustomer ? 'Kunden bearbeiten' : 'Neuen Kunden erstellen'}
              </h2>

              <form
                onSubmit={async (e) => {
                  e.preventDefault();
                  const formData = new FormData(e.target);
                  const customerData = {
                    name: formData.get('name'),
                    email: formData.get('email'),
                    phone: formData.get('phone'),
                    mobile: formData.get('mobile'),
                    address: formData.get('address'),
                    contactPerson: formData.get('contactPerson'),
                    ustId: formData.get('ustId'),
                    notes: formData.get('notes')
                  };

                  try {
                    const apiUrl = getApiUrl();
                    const url = editingCustomer 
                      ? `${apiUrl}/admin/customers/${editingCustomer._id}`
                      : `${apiUrl}/admin/customers`;
                    const method = editingCustomer ? 'PUT' : 'POST';
                    
                    const updateBookings = editingCustomer
                      ? confirm('Bearbeitete Daten auch bei den Buchungen updaten?')
                      : false;

                    const response = await fetch(url, {
                      method,
                      headers: {
                        'Content-Type': 'application/json',
                        Authorization: `Basic ${auth}`
                      },
                      body: JSON.stringify({ ...customerData, updateBookings })
                    });

                    if (response.ok) {
                      const result = await response.json().catch(() => ({}));
                      loadData();
                      setEditingCustomer(null);
                      setShowNewCustomerForm(false);
                      if (editingCustomer && updateBookings) {
                        showActionMessage('success', `Kunde aktualisiert, ${result.updatedBookingsCount || 0} Buchungen übernommen`);
                      } else {
                        showActionMessage('success', editingCustomer ? 'Kunde aktualisiert' : 'Kunde erstellt');
                      }
                    } else {
                      alert('Fehler beim Speichern');
                    }
                  } catch (err) {
                    alert('Fehler beim Speichern');
                  }
                }}
                className="space-y-4"
              >
                <div>
                  <label className="block text-sm font-semibold mb-2">Name *</label>
                  <input
                    type="text"
                    name="name"
                    defaultValue={editingCustomer?.name || ''}
                    className="w-full border-2 border-gray-300 rounded-lg px-4 py-3"
                    required
                  />
                </div>

                <div>
                  <label className="block text-sm font-semibold mb-2">Email *</label>
                  <input
                    type="email"
                    name="email"
                    defaultValue={editingCustomer?.email || ''}
                    className="w-full border-2 border-gray-300 rounded-lg px-4 py-3"
                    required
                  />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-semibold mb-2">Telefon</label>
                    <input
                      type="text"
                      name="phone"
                      defaultValue={editingCustomer?.phone || ''}
                      className="w-full border-2 border-gray-300 rounded-lg px-4 py-3"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-semibold mb-2">Handy</label>
                    <input
                      type="text"
                      name="mobile"
                      defaultValue={editingCustomer?.mobile || ''}
                      className="w-full border-2 border-gray-300 rounded-lg px-4 py-3"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-semibold mb-2">Adresse</label>
                  <textarea
                    name="address"
                    defaultValue={editingCustomer?.address || ''}
                    className="w-full border-2 border-gray-300 rounded-lg px-4 py-3"
                    rows="3"
                  />
                </div>

                <div>
                  <label className="block text-sm font-semibold mb-2">Ansprechpartner</label>
                  <input
                    type="text"
                    name="contactPerson"
                    defaultValue={editingCustomer?.contactPerson || ''}
                    className="w-full border-2 border-gray-300 rounded-lg px-4 py-3"
                  />
                </div>

                <div>
                  <label className="block text-sm font-semibold mb-2">USt-ID</label>
                  <input
                    type="text"
                    name="ustId"
                    defaultValue={editingCustomer?.ustId || ''}
                    className="w-full border-2 border-gray-300 rounded-lg px-4 py-3"
                  />
                </div>

                <div>
                  <label className="block text-sm font-semibold mb-2">Notizen</label>
                  <textarea
                    name="notes"
                    defaultValue={editingCustomer?.notes || ''}
                    className="w-full border-2 border-gray-300 rounded-lg px-4 py-3"
                    rows="3"
                  />
                </div>

                <div className="flex gap-3">
                  <button
                    type="submit"
                    className="flex-1 bg-blue-600 hover:bg-blue-700 text-white font-bold py-3 rounded-lg transition"
                  >
                    {editingCustomer ? 'Speichern' : 'Erstellen'}
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setEditingCustomer(null);
                      setShowNewCustomerForm(false);
                    }}
                    className="flex-1 bg-gray-300 hover:bg-gray-400 text-gray-800 font-bold py-3 rounded-lg transition"
                  >
                    Abbrechen
                  </button>
                </div>
              </form>
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

        {/* KPI Karten - immer sichtbar */}
        {stats && (
          <div className="mb-8 grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-4">
            <div className="bg-white rounded-lg shadow p-5">
              <h3 className="text-gray-600 text-sm font-semibold">Gesamt Buchungen</h3>
              <p className="text-3xl font-bold text-blue-600">{stats.totalBookings}</p>
            </div>
            <div className="bg-white rounded-lg shadow p-5">
              <h3 className="text-gray-600 text-sm font-semibold">Bezahlte Buchungen</h3>
              <p className="text-3xl font-bold text-green-600">{stats.paidBookings ?? 0}</p>
            </div>
            <div className="bg-white rounded-lg shadow p-5">
              <h3 className="text-gray-600 text-sm font-semibold">Offene Buchungen</h3>
              <p className="text-3xl font-bold text-amber-600">{stats.pendingBookings ?? 0}</p>
            </div>
            <div className="bg-white rounded-lg shadow p-5">
              <h3 className="text-gray-600 text-sm font-semibold">Umsatz bezahlt (gesamt)</h3>
              <p className="text-3xl font-bold text-blue-600">
                {Number(stats.totalRevenue || 0).toLocaleString('de-DE', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}€
              </p>
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
          <button
            onClick={() => setActiveTab('customers')}
            className={`px-6 py-3 font-semibold ${activeTab === 'customers' ? 'border-b-2 border-blue-600 text-blue-600' : 'text-gray-600'}`}
          >
            Kunden ({customers.length})
          </button>
          <button
            onClick={() => setActiveTab('statistics')}
            className={`px-6 py-3 font-semibold ${activeTab === 'statistics' ? 'border-b-2 border-blue-600 text-blue-600' : 'text-gray-600'}`}
          >
            Statistik
          </button>
          <button
            onClick={() => setActiveTab('bot-console')}
            className={`px-6 py-3 font-semibold ${activeTab === 'bot-console' ? 'border-b-2 border-blue-600 text-blue-600' : 'text-gray-600'}`}
          >
            Live Konsole Bot
          </button>
        </div>

        {/* Buchungen Tabelle */}
        {activeTab === 'bookings' && (
          <div>
            <div className="mb-4 flex justify-end gap-3">
              <button
                onClick={() => {
                  clearFollowUpCountdown();
                  setFollowUpCountdownOpen(false);
                  setFollowUpDraft(null);
                  setShowFollowUpModal(true);
                }}
                className="bg-orange-600 hover:bg-orange-700 text-white font-bold py-2 px-6 rounded-lg transition"
              >
                📋 Folgerechnung erstellen
              </button>
              <button
                onClick={() => setShowNewBookingForm(true)}
                className="bg-green-600 hover:bg-green-700 text-white font-bold py-2 px-6 rounded-lg transition"
              >
                ➕ Neue Buchung erstellen
              </button>
            </div>
            <div className="bg-white rounded-lg shadow overflow-x-auto">
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
                      <div className="text-gray-500">
                        {booking.isPartialBooking ? (
                          <span>
                            <span className="font-medium">{booking.nights}</span> / {booking.totalNights} Nächte
                            <span className="ml-1 px-1.5 py-0.5 bg-yellow-100 text-yellow-700 text-xs rounded">Teilbuchung</span>
                          </span>
                        ) : (
                          <span>{booking.nights} Nächte</span>
                        )}
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                      {Number(booking.total).toFixed(2).replace('.', ',')}€
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className={`px-2 py-1 text-xs rounded-full ${
                        booking.paymentStatus === 'paid' ? 'bg-green-100 text-green-800' : 'bg-yellow-100 text-yellow-800'
                      }`}>
                        {booking.paymentStatus === 'paid' ? '✓ Bezahlt' : 'Ausstehend'}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm">
                      <div className="flex gap-2 flex-wrap">
                        <button
                          onClick={() => setSelectedBooking(booking)}
                          className="bg-blue-600 hover:bg-blue-700 text-white text-xs font-semibold px-3 py-1.5 rounded-md"
                        >
                          Details
                        </button>
                        <button
                          onClick={async () => {
                            if (!confirm('Buchung wirklich löschen?')) return;
                            try {
                              const apiUrl = getApiUrl();
                              const response = await fetch(`${apiUrl}/admin/bookings/${booking._id}`, {
                                method: 'DELETE',
                                headers: { Authorization: `Basic ${auth}` }
                              });
                              if (response.ok) {
                                loadData();
                              } else {
                                alert('Löschen fehlgeschlagen');
                              }
                            } catch (error) {
                              console.error('Error deleting booking:', error);
                              alert('Löschen fehlgeschlagen');
                            }
                          }}
                          className="text-red-600 hover:text-red-800 px-3 py-1.5 rounded-md"
                        >
                          Buchung löschen
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            </div>
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
                      <div className="text-gray-500">
                        {booking.isPartialBooking ? (
                          <span>
                            <span className="font-medium">{booking.nights}</span> / {booking.totalNights} Naechte
                            <span className="ml-1 px-1.5 py-0.5 bg-yellow-100 text-yellow-700 text-xs rounded">Teilbuchung</span>
                          </span>
                        ) : (
                          <span>{booking.nights} Naechte</span>
                        )}
                      </div>
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
          <div className="space-y-6">
            <div>
              <h2 className="text-lg font-bold mb-3">Hackerberg – Penthouse</h2>
              {renderBlockedDatesTable(hackerbergBlockedDates)}
            </div>
            <div>
              <h2 className="text-lg font-bold mb-3">Neubau – Frühlingstraße</h2>
              {renderBlockedDatesTable(neubauBlockedDates)}
            </div>
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

        {/* Kunden Tab */}
        {activeTab === 'customers' && (
          <div>
            <div className="mb-4 flex justify-end">
              <button
                onClick={() => setShowNewCustomerForm(true)}
                className="bg-green-600 hover:bg-green-700 text-white font-bold py-2 px-6 rounded-lg transition"
              >
                ➕ Neuen Kunden erstellen
              </button>
            </div>
            <div className="bg-white rounded-lg shadow overflow-x-auto">
              <table className="w-full">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Kundennr.</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Name</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Email</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Telefon</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Buchungen</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Umsatz</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Aktion</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200">
                  {customers.map((customer) => (
                    <tr key={customer._id} className="hover:bg-gray-50">
                      <td className="px-4 py-3 whitespace-nowrap text-sm font-medium text-gray-700">
                        {customer.customerNumber || '-'}
                      </td>
                      <td className="px-4 py-3 whitespace-nowrap">
                        <div className="font-medium">{customer.name}</div>
                        {customer.contactPerson && (
                          <div className="text-sm text-gray-500">{customer.contactPerson}</div>
                        )}
                      </td>
                      <td className="px-4 py-3 whitespace-nowrap text-sm">
                        {customer.email}
                      </td>
                      <td className="px-4 py-3 whitespace-nowrap text-sm">
                        {customer.phone || customer.mobile || '-'}
                      </td>
                      <td className="px-4 py-3 whitespace-nowrap text-sm text-center">
                        {customer.totalBookings || 0}
                      </td>
                      <td className="px-4 py-3 whitespace-nowrap text-sm font-medium">
                        {Number(customer.totalRevenue || 0).toFixed(2)}€
                      </td>
                      <td className="px-4 py-3 whitespace-nowrap text-sm">
                        <div className="flex gap-2">
                          <button
                            onClick={() => setSelectedCustomer(customer)}
                            className="bg-blue-600 hover:bg-blue-700 text-white text-xs font-semibold px-3 py-1.5 rounded-md"
                          >
                            Details
                          </button>
                          <button
                            onClick={() => setEditingCustomer(customer)}
                            className="bg-purple-600 hover:bg-purple-700 text-white text-xs font-semibold px-3 py-1.5 rounded-md"
                          >
                            Bearbeiten
                          </button>
                          <button
                            onClick={() => handleDeleteCustomer(customer)}
                            className="bg-red-600 hover:bg-red-700 text-white text-xs font-semibold px-3 py-1.5 rounded-md"
                          >
                            Löschen
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* Statistik Tab */}
        {activeTab === 'statistics' && stats && (
          <div className="space-y-6">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
              <div className="bg-white rounded-lg shadow p-5">
                <h3 className="text-gray-700 font-semibold mb-3">Jahresvergleich ({stats.currentYear} vs {stats.currentYear - 1})</h3>
                <div className="space-y-2 text-sm text-gray-700">
                  <div className="flex items-center justify-between">
                    <span>Buchungen ({stats.currentYear})</span>
                    <span className="font-semibold">{stats.currentYearStats?.bookings ?? 0}</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span>Umsatz bezahlt ({stats.currentYear})</span>
                    <span className="font-semibold">
                      {Number(stats.currentYearStats?.revenuePaid || 0).toLocaleString('de-DE', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}€
                    </span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span>Wachstum Buchungen</span>
                    <span className={`font-semibold ${(stats.growthVsPreviousYear?.bookings ?? 0) >= 0 ? 'text-green-700' : 'text-red-700'}`}>
                      {(stats.growthVsPreviousYear?.bookings ?? 0) >= 0 ? '+' : ''}{stats.growthVsPreviousYear?.bookings ?? 0}%
                    </span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span>Wachstum Umsatz bezahlt</span>
                    <span className={`font-semibold ${(stats.growthVsPreviousYear?.revenuePaid ?? 0) >= 0 ? 'text-green-700' : 'text-red-700'}`}>
                      {(stats.growthVsPreviousYear?.revenuePaid ?? 0) >= 0 ? '+' : ''}{stats.growthVsPreviousYear?.revenuePaid ?? 0}%
                    </span>
                  </div>
                </div>
              </div>

              <div className="bg-white rounded-lg shadow p-5">
                <h3 className="text-gray-700 font-semibold mb-3">Website Besucher</h3>
                <div className="grid grid-cols-2 gap-3 text-sm">
                  <div className="rounded border border-gray-200 p-3">
                    <p className="text-gray-500">Seitenaufrufe gesamt</p>
                    <p className="text-xl font-bold text-blue-700">{stats.visitors?.totalViews ?? 0}</p>
                  </div>
                  <div className="rounded border border-gray-200 p-3">
                    <p className="text-gray-500">Eindeutige Besucher gesamt</p>
                    <p className="text-xl font-bold text-blue-700">{stats.visitors?.uniqueVisitors ?? 0}</p>
                  </div>
                  <div className="rounded border border-gray-200 p-3">
                    <p className="text-gray-500">Letzte 30 Tage Aufrufe</p>
                    <p className="text-xl font-bold text-indigo-700">{stats.visitors?.last30DaysViews ?? 0}</p>
                  </div>
                  <div className="rounded border border-gray-200 p-3">
                    <p className="text-gray-500">Letzte 30 Tage Besucher</p>
                    <p className="text-xl font-bold text-indigo-700">{stats.visitors?.last30DaysUniqueVisitors ?? 0}</p>
                  </div>
                </div>
                <p className="mt-3 text-xs text-gray-500">
                  Tipp: Um sich selbst auszuschließen, auf dem eigenen Gerät einmal `localStorage.setItem('mw_analytics_excluded', '1')` in der Browser-Konsole setzen.
                </p>
              </div>
            </div>

            {Array.isArray(stats.yearly) && stats.yearly.length > 0 && (
              <div className="bg-white rounded-lg shadow overflow-x-auto">
                <div className="px-5 pt-4 pb-2">
                  <h3 className="text-gray-700 font-semibold">Jahresstatistik gesamt</h3>
                </div>
                <table className="w-full text-sm">
                  <thead className="bg-gray-50 text-gray-600">
                    <tr>
                      <th className="px-4 py-2 text-left">Jahr</th>
                      <th className="px-4 py-2 text-left">Buchungen</th>
                      <th className="px-4 py-2 text-left">Bezahlt</th>
                      <th className="px-4 py-2 text-left">Nächte</th>
                      <th className="px-4 py-2 text-left">Umsatz bezahlt</th>
                      <th className="px-4 py-2 text-left">Umsatz gesamt</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-200">
                    {stats.yearly.map((yearRow) => (
                      <tr key={yearRow.year}>
                        <td className="px-4 py-2 font-semibold">{yearRow.year}</td>
                        <td className="px-4 py-2">{yearRow.bookings}</td>
                        <td className="px-4 py-2">{yearRow.paidBookings}</td>
                        <td className="px-4 py-2">{yearRow.nights}</td>
                        <td className="px-4 py-2">{Number(yearRow.revenuePaid || 0).toLocaleString('de-DE', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}€</td>
                        <td className="px-4 py-2">{Number(yearRow.revenueAll || 0).toLocaleString('de-DE', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}€</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}

            {Array.isArray(stats.monthly) && stats.monthly.length > 0 && (
              <div className="bg-white rounded-lg shadow overflow-x-auto">
                <div className="px-5 pt-4 pb-2">
                  <h3 className="text-gray-700 font-semibold">Monatsstatistik {stats.currentYear}</h3>
                </div>
                <table className="w-full text-sm">
                  <thead className="bg-gray-50 text-gray-600">
                    <tr>
                      <th className="px-4 py-2 text-left">Monat</th>
                      <th className="px-4 py-2 text-left">Buchungen</th>
                      <th className="px-4 py-2 text-left">Bezahlt</th>
                      <th className="px-4 py-2 text-left">Nächte</th>
                      <th className="px-4 py-2 text-left">Umsatz bezahlt</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-200">
                    {stats.monthly.map((monthRow) => (
                      <tr key={monthRow.month}>
                        <td className="px-4 py-2 font-semibold">{String(monthRow.month).padStart(2, '0')}</td>
                        <td className="px-4 py-2">{monthRow.bookings}</td>
                        <td className="px-4 py-2">{monthRow.paidBookings}</td>
                        <td className="px-4 py-2">{monthRow.nights}</td>
                        <td className="px-4 py-2">{Number(monthRow.revenuePaid || 0).toLocaleString('de-DE', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}€</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        )}

        {activeTab === 'bot-console' && (
          <div className="bg-white rounded-lg shadow p-6">
            <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 mb-4">
              <div>
                <h2 className="text-2xl font-bold">Bot Live Konsole</h2>
                <p className="text-sm text-gray-600">Nur für Projekt-Automatisierung-Kunden</p>
              </div>
              <div className="flex gap-2">
                <button
                  onClick={() => controlBot('start')}
                  disabled={botLoading}
                  className="bg-green-600 hover:bg-green-700 disabled:bg-green-300 text-white font-semibold px-4 py-2 rounded-lg"
                >
                  Start
                </button>
                <button
                  onClick={() => controlBot('stop')}
                  disabled={botLoading}
                  className="bg-red-600 hover:bg-red-700 disabled:bg-red-300 text-white font-semibold px-4 py-2 rounded-lg"
                >
                  Stop
                </button>
                <button
                  onClick={loadBotConsole}
                  disabled={botLoading}
                  className="bg-gray-700 hover:bg-gray-800 disabled:bg-gray-400 text-white font-semibold px-4 py-2 rounded-lg"
                >
                  Aktualisieren
                </button>
                <button
                  onClick={clearBotLogs}
                  disabled={botLoading}
                  className="bg-yellow-600 hover:bg-yellow-700 disabled:bg-yellow-300 text-white font-semibold px-4 py-2 rounded-lg"
                >
                  Clear Logs
                </button>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-3 mb-4 text-sm">
              <div className="bg-gray-50 border rounded-lg p-3">
                <div className="text-gray-500">Status</div>
                <div className={`font-semibold ${botStatus === 'active' ? 'text-green-700' : 'text-orange-700'}`}>{botStatus}</div>
              </div>
              <div className="bg-gray-50 border rounded-lg p-3">
                <div className="text-gray-500">Host</div>
                <div className="font-medium break-all">{botInfo.host || '-'}</div>
              </div>
              <div className="bg-gray-50 border rounded-lg p-3">
                <div className="text-gray-500">Service</div>
                <div className="font-medium break-all">{botInfo.service || '-'}</div>
              </div>
            </div>

            <div className="mb-3 text-sm text-gray-600">
              <strong>Ordner:</strong> {botInfo.projectDir || '-'}
            </div>

            {botError && (
              <div className="mb-4 bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg text-sm">
                {botError}
              </div>
            )}

            <div className="bg-black text-green-400 rounded-lg p-4 h-[480px] overflow-y-auto font-mono text-xs whitespace-pre-wrap">
              {botLoading && !botLogs ? 'Lade Konsole...' : (botLogs || 'Keine Logs gefunden.')}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
