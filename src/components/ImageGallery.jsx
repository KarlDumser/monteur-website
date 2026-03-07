import { useEffect, useState } from 'react';
import { APP_VERSION } from '../config';

export default function ImageGallery({ images, folder, titel }) {
  const [selectedIndex, setSelectedIndex] = useState(null);

  const closeGallery = () => setSelectedIndex(null);

  const navigateGallery = (direction) => {
    if (selectedIndex === null) return;
    if (direction === 'next') {
      setSelectedIndex((selectedIndex + 1) % images.length);
    } else {
      setSelectedIndex((selectedIndex - 1 + images.length) % images.length);
    }
  };

  // Tastatur-Navigation analog zur Homepage-Galerie
  useEffect(() => {
    const handleKeyPress = (e) => {
      if (selectedIndex === null) return;

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
  }, [selectedIndex, images.length]);

  if (!images || images.length === 0) return null;

  return (
    <>
      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3">
        {images.map((image, idx) => (
          <div
            key={idx}
            className="bg-gray-200 rounded-lg overflow-hidden h-36 w-36 sm:h-48 sm:w-48 hover:opacity-80 transition cursor-pointer flex items-center justify-center"
            onClick={() => setSelectedIndex(idx)}
          >
            <img
              src={`/${folder}/${image}?v=${APP_VERSION}`}
              alt={`${titel} ${idx + 1}`}
              className="w-full h-full object-cover"
              style={{ aspectRatio: '1/1', objectFit: 'cover' }}
            />
          </div>
        ))}
      </div>
      {selectedIndex !== null && (
          <div
            className="fixed inset-0 bg-black bg-opacity-95 flex items-center justify-center z-50"
            onClick={closeGallery}
        >
            <div className="relative w-full h-full flex items-center justify-center p-4" onClick={e => e.stopPropagation()}>
              <button
                onClick={closeGallery}
                className="absolute top-4 right-4 text-white hover:text-gray-300 text-4xl z-10 bg-black bg-opacity-50 rounded-full w-12 h-12 flex items-center justify-center"
              >
                ✕
              </button>

              <div className="absolute top-4 left-1/2 transform -translate-x-1/2 text-white text-lg bg-black bg-opacity-50 px-4 py-2 rounded-lg">
                {selectedIndex + 1} / {images.length}
              </div>

              <button
                onClick={(e) => {
                  e.stopPropagation();
                  navigateGallery('prev');
                }}
                className="absolute left-4 text-white hover:text-gray-300 text-5xl z-10 bg-black bg-opacity-50 rounded-full w-14 h-14 flex items-center justify-center hover:bg-opacity-70 transition"
                style={{ top: '50%', transform: 'translateY(-50%)' }}
                type="button"
              >
                ←
              </button>

              <div className="max-w-6xl max-h-[90vh] flex items-center justify-center">
                <img
                  src={`/${folder}/${images[selectedIndex]}?v=${APP_VERSION}`}
                  alt={`${titel} ${selectedIndex + 1}`}
                  className="max-w-full max-h-[90vh] object-contain rounded-lg shadow-2xl"
                />
              </div>

              <button
                onClick={(e) => {
                  e.stopPropagation();
                  navigateGallery('next');
                }}
                className="absolute right-4 text-white hover:text-gray-300 text-5xl z-10 bg-black bg-opacity-50 rounded-full w-14 h-14 flex items-center justify-center hover:bg-opacity-70 transition"
                style={{ top: '50%', transform: 'translateY(-50%)' }}
                type="button"
              >
                →
              </button>

              <div className="absolute bottom-4 left-1/2 transform -translate-x-1/2 flex gap-2 overflow-x-auto max-w-[90vw] px-4 py-2 bg-black bg-opacity-50 rounded-lg">
                {images.map((image, index) => (
                  <img
                    key={index}
                    src={`/${folder}/${image}?v=${APP_VERSION}`}
                    alt={`Thumbnail ${index + 1}`}
                    className={`h-16 w-16 object-cover rounded cursor-pointer transition ${
                      index === selectedIndex ? 'ring-4 ring-blue-500' : 'opacity-60 hover:opacity-100'
                    }`}
                    onClick={(e) => {
                      e.stopPropagation();
                      setSelectedIndex(index);
                    }}
                  />
                ))}
              </div>
            </div>
          </div>
        )}
      </>
    );
  }
