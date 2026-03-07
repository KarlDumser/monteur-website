import CommuteCalculator from '../components/CommuteCalculator';

export default function Anfahrt() {
  return (
    <div className="min-h-screen bg-gray-50">
      <div className="container mx-auto px-4 py-12">
        <h1 className="text-4xl font-bold mb-8">Anfahrt</h1>

        <div className="mb-8">
          <CommuteCalculator title="Baustelle eingeben und Route berechnen" />
        </div>

        <div className="grid grid-cols-1 gap-8">
          {/* Wohnung Frühlingstrasse */}
          <div className="bg-white rounded-lg shadow-lg p-8">
            <h2 className="text-2xl font-bold text-gray-800 mb-4">Wohnung Frühlingstraße</h2>
            
            <div className="space-y-4 mb-6">
              <div>
                <h3 className="font-semibold text-gray-700">Adresse</h3>
                <p className="text-gray-600">Frühlingstraße 8</p>
                <p className="text-gray-600">82152 Krailling</p>
                <p className="text-gray-600">Deutschland</p>
              </div>

              <div>
                <h3 className="font-semibold text-gray-700">Anfahrt mit Auto</h3>
                <p className="text-gray-600">Ca. 30 Minuten vom Stadtzentrum entfernt</p>
              </div>

              <div>
                <h3 className="font-semibold text-gray-700">Öffentliche Verkehrsmittel</h3>
                <p className="text-gray-600">S-Bahn-Station Stockdorf mit der S6 in Richtung Stadtzentrum</p>
              </div>

              <div>
                <h3 className="font-semibold text-gray-700">Parkmöglichkeiten</h3>
                <p className="text-gray-600">Kostenlos vor Ort vorhanden</p>
              </div>

              <div>
                <h3 className="font-semibold text-gray-700">Schlüsselübergabe</h3>
                <p className="text-gray-600">Die Schlüsselübergabe findet immer in der Frühlingstraße statt.</p>
              </div>
            </div>

            <a
              className="block w-full text-center bg-blue-600 hover:bg-blue-700 text-white font-semibold py-3 px-4 rounded-lg transition"
              href="https://www.google.com/maps/search/?api=1&query=Fr%C3%BChlingstra%C3%9Fe%208%2C%2082152%20Krailling"
              target="_blank"
              rel="noopener noreferrer"
            >
              Route in Google Maps öffnen
            </a>
          </div>
        </div>
      </div>
    </div>
  )
}
