import { useState, useEffect, useRef } from 'react';
import { useTranslation } from 'react-i18next';
import BookingCalendar from '../components/BookingCalendar';
import CommuteCalculator from '../components/CommuteCalculator';
import { apiCall } from '../utils/api';
import { Link } from 'react-router-dom';
import { APP_VERSION } from '../config';

const getNavSections = (t) => [
  { id: 'routen-berechnung', label: t('home.routeCalculation') || 'Routen Berechnung' },
  { id: 'wohnungsdetails', label: t('home.apartmentDetails') || 'Wohnungsdetails' },
  { id: 'verfuegbarkeit', label: t('home.availability') || 'Verfügbarkeit' },
  { id: 'jetzt-buchen', label: t('home.bookNow') || 'Jetzt Buchen!' }
];

export default function Home() {
  const { t } = useTranslation();

  const [selectedProperty, setSelectedProperty] = useState(null);
  const [galleryOpen, setGalleryOpen] = useState(false);
  const [currentImageIndex, setCurrentImageIndex] = useState(0);
  const [navSections, setNavSections] = useState(getNavSections(t));
  const [activeSection, setActiveSection] = useState(navSections[0]?.id || 'routen-berechnung');
  const manualScrollTargetRef = useRef(null);
  const manualScrollReleaseTimerRef = useRef(null);

  // Update nav sections when translation changes
  useEffect(() => {
    setNavSections(getNavSections(t));
  }, [t]);
  
  const properties = [
    {
      id: 1,
      ...t('properties.home.hackerberg', { returnObjects: true }),
      flaeche: "65 m²",
      folder: "Wohnung-Hackerberg",
      wohnung: "hackerberg",
    },
    {
      id: 2,
      ...t('properties.home.neubau', { returnObjects: true }),
      flaeche: "58 m²",
      folder: "Wohnung-Fruehlingstrasse",
      wohnung: "neubau",
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

  useEffect(() => {
    const updateActiveSection = () => {
      if (manualScrollTargetRef.current) {
        const targetNode = document.getElementById(manualScrollTargetRef.current);
        if (targetNode) {
          const distance = Math.abs(targetNode.getBoundingClientRect().top - 96);
          if (distance <= 18) {
            setActiveSection(manualScrollTargetRef.current);
            manualScrollTargetRef.current = null;
          }
        }
        return;
      }

      const sectionSwitchLine = window.innerHeight * 0.35;
      let currentSectionId = navSections[0]?.id || 'routen-berechnung';

      navSections.forEach((section) => {
        const node = document.getElementById(section.id);
        if (node && node.getBoundingClientRect().top <= sectionSwitchLine) {
          currentSectionId = section.id;
        }
      });

      setActiveSection((previous) => (previous === currentSectionId ? previous : currentSectionId));
    };

    updateActiveSection();
    window.addEventListener('scroll', updateActiveSection, { passive: true });
    window.addEventListener('resize', updateActiveSection);

    return () => {
      window.removeEventListener('scroll', updateActiveSection);
      window.removeEventListener('resize', updateActiveSection);
      if (manualScrollReleaseTimerRef.current) {
        clearTimeout(manualScrollReleaseTimerRef.current);
      }
    };
  }, [navSections]);

  const jumpToSection = (sectionId) => {
    console.log('Jumping to section:', sectionId);
    const section = document.getElementById(sectionId);
    
    if (!section) {
      console.error('Section not found:', sectionId);
      return;
    }

    console.log('Section found, scrolling...');
    manualScrollTargetRef.current = sectionId;
    if (manualScrollReleaseTimerRef.current) {
      clearTimeout(manualScrollReleaseTimerRef.current);
    }

    // Use native scrollIntoView instead of window.scrollTo for better compatibility
    section.scrollIntoView({ 
      behavior: 'smooth', 
      block: 'start'
    });
    
    setActiveSection(sectionId);

    manualScrollReleaseTimerRef.current = setTimeout(() => {
      manualScrollTargetRef.current = null;
    }, 1100);
  };

  return (
    <div className="min-h-screen bg-gray-50 pb-24 lg:pb-0">
      {/* Desktop dot navigation */}
      <nav
        aria-label="Homepage Bereiche"
        className="fixed right-6 top-1/2 z-50 hidden -translate-y-1/2 lg:flex lg:flex-col lg:gap-4"
      >
        {navSections.map((section) => {
          const isActive = activeSection === section.id;

          return (
            <button
              key={section.id}
              type="button"
              onClick={() => jumpToSection(section.id)}
              aria-current={isActive ? 'true' : undefined}
              aria-label={section.label}
              className="group relative flex items-center justify-end"
            >
              <span
                className={`h-3 w-3 rounded-full border-2 transition-all ${
                  isActive
                    ? 'scale-125 border-blue-700 bg-blue-600'
                    : 'border-blue-300 bg-white hover:border-blue-500 hover:bg-blue-100'
                }`}
              />

              <span
                className="pointer-events-none absolute right-full top-1/2 mr-2 -translate-y-1/2 whitespace-nowrap rounded-md border border-slate-200 bg-white px-3 py-1 text-xs font-semibold text-slate-700 shadow-sm transition opacity-0 translate-x-2 group-hover:translate-x-0 group-hover:opacity-100"
              >
                {section.label}
              </span>
            </button>
          );
        })}
      </nav>

      {/* Hero Section */}
      <div className="bg-gradient-to-r from-blue-600 to-blue-800 text-white py-12 px-4">
        <div className="container mx-auto text-center">
          <h1 className="text-5xl font-bold mb-4">{t('home.welcomeTitle')}</h1>
          <p className="text-xl mb-8">{t('home.welcomeSubtitle')}</p>
          <div className="flex flex-col items-center gap-3 sm:flex-row sm:justify-center">
            <Link
              to="/booking"
              className="inline-block bg-white text-blue-600 font-bold py-4 px-12 rounded-lg hover:bg-gray-100 transition text-lg"
            >
              {t('home.cta')}
            </Link>
          </div>
        </div>
      </div>

      {/* Properties Section */}
      <div className="container mx-auto px-4 py-16">
        <h2 className="text-4xl font-bold text-center mb-12">{t('home.ourApartments')}</h2>

        {/* Early Booking Discount Info */}
        <div className="bg-gradient-to-r from-green-50 to-emerald-50 border-2 border-green-400 rounded-xl p-8 mb-12 text-center">
          <div className="text-4xl mb-3">🎉</div>
          <h3 className="text-2xl font-bold text-green-800 mb-2">{t('home.earlyBookingDiscount')}</h3>
          <p className="text-lg text-green-700 mb-3">{t('home.earlyBookingText')}</p>
          <p className="text-green-600">{t('home.earlyBookingSavings')}</p>
        </div>

        <div id="routen-berechnung" className="mb-12 scroll-mt-24">
          <CommuteCalculator title={t('home.distanceQuestion')} />
        </div>

        <div id="wohnungsdetails" className="scroll-mt-24">
          <h3 className="text-2xl font-bold text-gray-900 mb-3">{t('home.apartmentDetails2')}</h3>
          <p className="text-gray-600 mb-6">
            {t('home.compareApartments')}
          </p>
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
                    {t('home.openGallery')}
                  </span>
                </div>
              </div>

              {/* Content */}
              <div className="p-8">
                <h3 className="text-3xl font-bold text-gray-800 mb-2">{property.titel}</h3>
                <p className="text-gray-600 mb-4">{property.beschreibung}</p>
                
                {/* Wichtiges Merkmal deutlich hervorheben */}
                {property.details && (
                  <div className="mb-5 rounded-lg border-2 border-emerald-300 bg-emerald-50 p-4">
                    <p className="text-xs font-bold uppercase tracking-wide text-emerald-800 mb-1">
                      {t('home.importantNote')}
                    </p>
                    <p className="text-base font-semibold text-emerald-900">
                      {property.details}
                    </p>
                  </div>
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
                    <h4 className="font-semibold text-gray-800 mb-3 text-sm">{t('home.featuresAndServices')}</h4>
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
                    {t('home.earlyBookingPriceHint', { count: property.id === 1 ? '5' : '6' })}
                  </p>
                </div>

                {/* Kalender */}
                <div id={property.id === 1 ? "verfuegbarkeit" : undefined} className="mb-4 scroll-mt-24">
                  <h3 className="text-2xl font-bold text-gray-900 mb-4">{t('home.availabilityHeadline')}</h3>
                  <BookingCalendar periods={periods[property.wohnung] || []} />
                </div>

                {/* Buttons */}
                <div>
                  <button
                    onClick={() => openGallery(property, 0)}
                    className="w-full bg-gray-100 hover:bg-gray-200 text-gray-800 font-semibold py-3 px-4 rounded-lg transition"
                  >
                    {t('home.galleryWithCount', { count: getImages(property.folder).length })}
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>

        {/* Zentraler Buchungsbutton */}
        <div id="jetzt-buchen" className="mt-12 text-center scroll-mt-24">
          <div className="bg-gradient-to-r from-blue-50 to-blue-100 rounded-xl p-8 mb-6">
            <p className="text-gray-700 text-lg mb-6">
              {t('home.bookingStartHint')}
            </p>
            <Link
              to="/booking"
              className="inline-block bg-blue-600 hover:bg-blue-700 text-white font-bold py-4 px-12 rounded-lg transition shadow-lg text-lg"
            >
              {t('home.bookNowArrow')}
            </Link>
          </div>
        </div>
      </div>

      {/* Mobile quick navigation */}
      <nav
        aria-label="Homepage Schnellnavigation"
        className="fixed bottom-3 left-1/2 z-40 w-[calc(100%-1.5rem)] max-w-xl -translate-x-1/2 lg:hidden"
      >
        <div className="grid grid-cols-4 gap-2 rounded-xl border border-slate-200 bg-white/95 p-2 shadow-lg backdrop-blur-sm">
          {navSections.map((section) => {
            const isActive = activeSection === section.id;

            return (
              <button
                key={section.id}
                type="button"
                onClick={() => jumpToSection(section.id)}
                aria-current={isActive ? 'true' : undefined}
                className={`rounded-lg px-3 py-2.5 text-xs sm:text-sm font-semibold leading-snug transition ${
                  isActive
                    ? 'bg-blue-600 text-white'
                    : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
                }`}
              >
                {section.label}
              </button>
            );
          })}
        </div>
      </nav>

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
