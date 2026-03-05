import { useState, useEffect } from 'react';
import BookingCalendar from '../components/BookingCalendar';
import { apiCall } from '../utils/api';
import { Link } from 'react-router-dom';
import { APP_VERSION } from '../config';

export default function Home() {
  const [selectedProperty, setSelectedProperty] = useState(null);
  const [galleryOpen, setGalleryOpen] = useState(false);
  const [currentImageIndex, setCurrentImageIndex] = useState(0);
  
  const properties = [
    {
      id: 1,
      titel: "Wohnung Hackerberg – Penthouse",
      beschreibung: "2,5-Zimmer Penthousewohnung im 5. Stock mit Aufzug und Panorama Balkon",
      preis: "ab 18€ pro Person/Nacht!",
      zimmer: "2,5 Zimmer",
      flaeche: "65 m²",
      folder: "Wohnung-Hackerberg",
      wohnung: "hackerberg",
      details: "Eigenem Zugang, voll ausgestattete Küche und Bad (mit Wanne und Dusche)",
      features: [
        "Waschmaschine mit Trockner im Keller",
        "2 Einzelbetten im 1. Zimmer, 2 Einzelbetten im 2. Zimmer (eines davon Queen size)",
        "WLAN 150 Mbit/s frei",
        "Sat-TV",
        "Parkplätze direkt vor dem Haus",
        "Ruhige Wohnlage",
        "Nahe: Biergarten, Naturbadesee, Geschäfte & Banken"
      ]
    },
    {
      id: 2,
      titel: "Wohnung Frühlingstraße – Neubau",
      beschreibung: "2-Zimmerwohnung mit eigenem Zugang, Garten mit Grillplatz",
      preis: "ab 16€ pro Person/Nacht!",
      zimmer: "2 Zimmer",
      flaeche: "58 m²",
      folder: "Wohnung-Fruehlingstrasse",
      wohnung: "neubau",
      details: "Eigenem Zugang, voll ausgestattete Küche und Bad (mit Wanne und Dusche)",
      features: [
        "Waschmaschine mit Trockner",
        "2 Einzelbetten in jedem Zimmer (je eines Queen size)",
        "WLAN 150 Mbit/s frei",
        "Sat-TV",
        "Parkplätze für PKW & LKW mit Hänger vor dem Haus",
        "Gartenbenutzung mit Grillmöglichkeit",
        "Ruhige Wohnlage",
        "Nahe: Biergarten, Naturbadesee, Geschäfte & Banken"
      ]
    }
  ];

  const [periods, setPeriods] = useState({});
  
  useEffect(() => {
    async function fetchPeriods() {
      const result = {};
      for (const property of properties) {
        try {
          const res = await apiCall(`/bookings/blocked?wohnung=${property.wohnung}`);
          const data = await res.json();
          result[property.wohnung] = data.periods || [];
        } catch (e) {
          result[property.wohnung] = [];
        }
      }
      setPeriods(result);
    }
    fetchPeriods();
  }, []);

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

  const navigateGallery = (direction) => {
    if (!selectedProperty) return;
    const images = getImages(selectedProperty.folder);
    
    if (direction === 'next') {
      setCurrentImageIndex((prev) => (prev + 1) % images.length);
    } else {
      setCurrentImageIndex((prev) => (prev - 1 + images.length) % images.length);
    }
  };

  const openGallery = (property, index = 0) => {
    setSelectedProperty(property);
    setCurrentImageIndex(index);
    setGalleryOpen(true);
  };

  const closeGallery = () => {
    setGalleryOpen(false);
    setSelectedProperty(null);
    setCurrentImageIndex(0);
  };

  // Keyboard navigation for gallery
  useEffect(() => {
    const handleKeyPress = (e) => {
      if (!galleryOpen || !selectedProperty) return;
      
      if (e.key === 'ArrowLeft') {
        navigateGallery('prev');
      } else if (e.key === 'ArrowRight') {
        navigateGallery('next');
      } else if (e.key === 'Escape') {
        closeGallery();
      }
    };

    window.addEventListener('keydown', handleKeyPress);
    return () => window.removeEventListener('keydown', handleKeyPress);
  }, [galleryOpen, selectedProperty, currentImageIndex]);

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
              {/* Image Gallery - Clickable */}
              <div 
                className="bg-gray-200 h-72 overflow-hidden relative cursor-pointer group"
                onClick={() => openGallery(property, 0)}
              >
                <img
                  src={`/${property.folder}/${getImages(property.folder)[0]}?v=${APP_VERSION}`}
                  alt={property.titel}
                  className="w-full h-full object-cover transition-transform group-hover:scale-105"
                />
                <div className="absolute inset-0 flex items-center justify-center bg-black bg-opacity-0 group-hover:bg-opacity-30 transition">
                  <span className="text-white text-lg font-semibold opacity-0 group-hover:opacity-100 transition">
                    📷 Galerie öffnen
                  </span>
                </div>
              </div>

              {/* Content */}
              <div className="p-8">
                <h3 className="text-3xl font-bold text-gray-800 mb-2">{property.titel}</h3>
                <p className="text-gray-600 mb-4">{property.beschreibung}</p>
                
                {/* Details */}
                {property.details && (
                  <p className="text-sm text-gray-700 mb-4 italic">{property.details}</p>
                )}

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

                {/* Features List */}
                {property.features && property.features.length > 0 && (
                  <div className="mb-6 bg-blue-50 rounded-lg p-4 border border-blue-100">
                    <h4 className="font-semibold text-gray-800 mb-3 text-sm">Ausstattung & Services:</h4>
                    <ul className="space-y-2 text-sm text-gray-700">
                      {property.features.map((feature, idx) => (
                        <li key={idx} className="flex items-start gap-2">
                          <span className="text-blue-600 font-bold mt-0.5">•</span>
                          <span>{feature}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                )}

                <div className="bg-blue-50 rounded-lg p-4 mb-6">
                  <p className="text-2xl font-bold text-blue-900">{property.preis}</p>
                  <p className="mt-1 text-xs text-blue-700">
                    *Bei Frühbucher und {property.id === 1 ? '5' : '6'} Personen.
                  </p>
                </div>

                {/* Kalender */}
                <div className="mb-4">
                  <BookingCalendar periods={periods[property.wohnung] || []} />
                </div>

                {/* Buttons */}
                <div className="flex gap-3">
                  <button
                    onClick={() => openGallery(property, 0)}
                    className="flex-1 bg-gray-100 hover:bg-gray-200 text-gray-800 font-semibold py-3 px-4 rounded-lg transition"
                  >
                    Galerie ({getImages(property.folder).length} Bilder)
                  </button>
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

      {/* Full Screen Gallery Modal */}
      {galleryOpen && selectedProperty && (
        <div 
          className="fixed inset-0 bg-black bg-opacity-95 flex items-center justify-center z-50"
          onClick={closeGallery}
        >
          <div className="relative w-full h-full flex items-center justify-center p-4">
            {/* Close Button */}
            <button
              onClick={closeGallery}
              className="absolute top-4 right-4 text-white hover:text-gray-300 text-4xl z-10 bg-black bg-opacity-50 rounded-full w-12 h-12 flex items-center justify-center"
            >
              ✕
            </button>

            {/* Image Counter */}
            <div className="absolute top-4 left-1/2 transform -translate-x-1/2 text-white text-lg bg-black bg-opacity-50 px-4 py-2 rounded-lg">
              {currentImageIndex + 1} / {getImages(selectedProperty.folder).length}
            </div>

            {/* Previous Button */}
            <button
              onClick={(e) => {
                e.stopPropagation();
                navigateGallery('prev');
              }}
              className="absolute left-4 text-white hover:text-gray-300 text-5xl z-10 bg-black bg-opacity-50 rounded-full w-14 h-14 flex items-center justify-center hover:bg-opacity-70 transition"
              style={{ top: '50%', transform: 'translateY(-50%)' }}
            >
              ←
            </button>

            {/* Image Container */}
            <div 
              className="max-w-6xl max-h-[90vh] flex items-center justify-center"
              onClick={(e) => e.stopPropagation()}
            >
              <img
                src={`/${selectedProperty.folder}/${getImages(selectedProperty.folder)[currentImageIndex]}`}
                alt={`${selectedProperty.titel} ${currentImageIndex + 1}`}
                className="max-w-full max-h-[90vh] object-contain rounded-lg shadow-2xl"
              />
            </div>

            {/* Next Button */}
            <button
              onClick={(e) => {
                e.stopPropagation();
                navigateGallery('next');
              }}
              className="absolute right-4 text-white hover:text-gray-300 text-5xl z-10 bg-black bg-opacity-50 rounded-full w-14 h-14 flex items-center justify-center hover:bg-opacity-70 transition"
              style={{ top: '50%', transform: 'translateY(-50%)' }}
            >
              →
            </button>

            {/* Thumbnail Strip */}
            <div className="absolute bottom-4 left-1/2 transform -translate-x-1/2 flex gap-2 overflow-x-auto max-w-[90vw] px-4 py-2 bg-black bg-opacity-50 rounded-lg">
              {getImages(selectedProperty.folder).map((image, index) => (
                <img
                  key={index}
                  src={`/${selectedProperty.folder}/${image}`}
                  alt={`Thumbnail ${index + 1}`}
                  className={`h-16 w-16 object-cover rounded cursor-pointer transition ${
                    index === currentImageIndex ? 'ring-4 ring-blue-500' : 'opacity-60 hover:opacity-100'
                  }`}
                  onClick={(e) => {
                    e.stopPropagation();
                    setCurrentImageIndex(index);
                  }}
                />
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
