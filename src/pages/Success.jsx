import { Link, useEffect, useState } from 'react-router-dom';

export default function Success() {
  const [email, setEmail] = useState('');

  useEffect(() => {
    // Hole die Email aus der Buchungs-Info (wurde vom Payment-Prozess gespeichert)
    const bookingInfo = localStorage.getItem('bookingInfo');
    if (bookingInfo) {
      const booking = JSON.parse(bookingInfo);
      setEmail(booking.email);
    }
  }, []);
  return (
    <div className="flex items-center justify-center min-h-[60vh]">
      <div className="bg-white rounded-2xl shadow-lg p-12 text-center max-w-md">
        <div className="bg-green-100 w-20 h-20 rounded-full flex items-center justify-center mx-auto mb-6">
          <svg className="w-12 h-12 text-green-600" fill="currentColor" viewBox="0 0 24 24">
            <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-2 15l-5-5 1.41-1.41L10 14.17l7.59-7.59L19 8l-9 9z" />
          </svg>
        </div>
        
        <h1 className="text-4xl font-bold text-green-600 mb-4">Zahlung erfolgreich!</h1>
        
        <p className="text-gray-600 text-lg mb-6">
          Vielen Dank für Ihre Buchung. Wir haben eine Bestätigungsemail an <span className="font-semibold text-gray-800">{email || 'Ihre E-Mail-Adresse'}</span> gesendet.
        </p>
        
        <div className="bg-green-50 border border-green-200 rounded-lg p-4 mb-6 text-left">
          <p className="text-sm text-gray-700">
            <strong>Nächste Schritte:</strong><br/>
            Sie erhalten in Kürze eine E-Mail mit allen weiteren Informationen und der bezahlten Rechnung zu Ihrer Buchung.
          </p>
        </div>

        <Link
          to="/"
          className="inline-block bg-blue-600 hover:bg-blue-700 text-white font-bold py-3 px-6 rounded-lg transition"
        >
          Zurück zur Startseite
        </Link>
      </div>
    </div>
  );
}
