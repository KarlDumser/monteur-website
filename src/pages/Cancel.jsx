import { Link } from 'react-router-dom';

export default function Cancel() {
  return (
    <div className="flex items-center justify-center min-h-[60vh]">
      <div className="bg-white rounded-2xl shadow-lg p-12 text-center max-w-md">
        <div className="bg-red-100 w-20 h-20 rounded-full flex items-center justify-center mx-auto mb-6">
          <svg className="w-12 h-12 text-red-600" fill="currentColor" viewBox="0 0 24 24">
            <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm1 15h-2v-2h2v2zm0-4h-2V7h2v6z" />
          </svg>
        </div>
        
        <h1 className="text-4xl font-bold text-red-600 mb-4">Zahlung abgebrochen</h1>
        
        <p className="text-gray-600 text-lg mb-6">
          Ihre Buchung wurde nicht abgeschlossen. Kein Betrag wurde belastet.
        </p>
        
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-6 text-left">
          <p className="text-sm text-gray-700">
            <strong>Möchten Sie es erneut versuchen?</strong><br/>
            Klicken Sie unten auf &quot;Neue Buchung&quot;, um den Buchungsprozess erneut zu starten.
          </p>
        </div>

        <div className="flex gap-3">
          <Link
            to="/booking"
            className="flex-1 bg-blue-600 hover:bg-blue-700 text-white font-bold py-3 px-4 rounded-lg transition"
          >
            Neue Buchung
          </Link>
          <Link
            to="/"
            className="flex-1 bg-gray-200 hover:bg-gray-300 text-gray-800 font-bold py-3 px-4 rounded-lg transition"
          >
            Zurück
          </Link>
        </div>
      </div>
    </div>
  );
}
