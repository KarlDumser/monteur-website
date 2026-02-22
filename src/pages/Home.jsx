import { useState } from 'react';
import { Link } from 'react-router-dom';
import { APP_VERSION } from '../config';
import ImageGallery from '../components/ImageGallery';

export default function Home() {
  // Galerie-Modal-Logik wird durch ImageGallery übernommen
  
  const properties = [
    {
      id: 1,
      titel: "Wohnung Hackerberg",
      beschreibung: "Gemütliche Wohnung mit modernen Einrichtungen",
      preis: "ab 18€ pro Person/Nacht!*",
      zimmer: "2 Zimmer",
      flaeche: "65 m²",
      folder: "Wohnung-Hackerberg"
    },
    {
      id: 2,
      titel: "Wohnung Frühlingstraße",
      beschreibung: "Schöne Wohnung in zentraler Lage",
      preis: "ab 16€ pro Person/Nacht!*",
      zimmer: "3 Zimmer",
      flaeche: "85 m²",
      folder: "Wohnung-Fruehlingstrasse"
    }
  ];

  const hackerbergImages = [
    "Wohnzimmer.JPG",
    "Bad.JPG",
    "Balkon.JPG",
    "Eingangsbereich.JPG",
    "Kueche.JPG",
    "Zimmer-1.JPG",
    "Zimmer-2.JPG"
  ];

  const fruehlingImages = [
    "Zimmer-1.JPG",
    "Bad.JPG",
    "Balkonfenster-Zimmer-1.JPG",
    "Flur-Treppe.JPG",
    "Kueche-Fenster.JPG",
    "Kueche.JPG",
    "Zimmer-2.JPG"
  ];

  const getImages = (folder) => {
    return folder === "Wohnung-Hackerberg" ? hackerbergImages : fruehlingImages;
  };

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Hero Section */}
      <div className="bg-gradient-to-r from-blue-600 to-blue-800 text-white py-12 px-4">
        <div className="container mx-auto text-center">
          <h1 className="text-5xl font-bold mb-4">Willkommen zu unseren Wohnungen</h1>
          <p className="text-xl mb-8">Finden Sie Ihre Monteurwohnung!</p>
          <div className="flex flex-col items-center gap-3 sm:flex-row sm:justify-center">
            <Link
              to="/booking"
              className="inline-block bg-white text-blue-600 font-bold py-4 px-12 rounded-lg hover:bg-gray-100 transition text-lg"
            >
              Jetzt Buchen
            </Link>
          </div>
        </div>
      </div>

      {/* Properties Section */}
      <div className="container mx-auto px-4 py-16">
        <h2 className="text-4xl font-bold text-center mb-12">Unsere Wohnungen</h2>

        {/* Early Booking Discount Info */}
        <div className="bg-gradient-to-r from-green-50 to-emerald-50 border-2 border-green-400 rounded-xl p-8 mb-12 text-center">
          <div className="text-4xl mb-3">🎉</div>
          <h3 className="text-2xl font-bold text-green-800 mb-2">Frühbucher Sparen!</h3>
          <p className="text-lg text-green-700 mb-3">Buchen Sie mindestens <strong>2 Monate im Voraus</strong> und erhalten Sie <strong>10% Rabatt</strong>!</p>
          <p className="text-green-600">von 100 €/Nacht auf nur 90 €/Nacht</p>
        </div>
        
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          {properties.map((property) => (
            <div key={property.id} className="bg-white rounded-lg shadow-lg overflow-hidden hover:shadow-xl transition-shadow">
              {/* Image Gallery */}
              <ImageGallery images={getImages(property.folder)} folder={property.folder} titel={property.titel} />

              {/* Content */}
              <div className="p-8">
                <h3 className="text-3xl font-bold text-gray-800 mb-2">{property.titel}</h3>
                <p className="text-gray-600 mb-6">{property.beschreibung}</p>

                {/* Property Details */}
                <div className="space-y-3 mb-6 text-gray-700">
                  <div className="flex items-center gap-2">
                    <svg className="w-5 h-5 text-blue-600" fill="currentColor" viewBox="0 0 24 24">
                      <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2z" />
                    </svg>
                    <span className="font-semibold">{property.zimmer}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <svg className="w-5 h-5 text-blue-600" fill="currentColor" viewBox="0 0 24 24">
                      <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2z" />
                    </svg>
                    <span className="font-semibold">{property.flaeche}</span>
                  </div>
                </div>

                <div className="bg-blue-50 rounded-lg p-4 mb-6">
                  <p className="text-2xl font-bold text-blue-900">{property.preis}</p>
                  <p className="mt-1 text-xs text-blue-700">
                    *Bei Frühbucher und {property.id === 1 ? '5' : '6'} Personen.
                  </p>
                </div>

                {/* Buttons */}
                <div className="flex gap-3">
                  <Link
                    to="/booking"
                    className="flex-1 bg-blue-600 hover:bg-blue-700 text-white font-semibold py-3 px-4 rounded-lg text-center transition"
                  >
                    Buchen
                  </Link>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Die Galerie-Modal-Logik ist jetzt in ImageGallery enthalten */}
    </div>
  )
}
