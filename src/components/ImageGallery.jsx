import { useState } from 'react';
import { APP_VERSION } from '../config';

export default function ImageGallery({ images, folder, titel }) {
  const [selectedIndex, setSelectedIndex] = useState(null);

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
          className="fixed top-0 left-0 w-screen h-screen bg-black bg-opacity-90 flex items-center justify-center p-0 m-0 z-50"
          style={{ position: 'fixed', top: 0, left: 0, width: '100vw', height: '100vh', minHeight: '100vh' }}
          onClick={() => setSelectedIndex(null)}
        >
          <div className="max-w-5xl w-full relative" onClick={e => e.stopPropagation()}>
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-xl font-bold text-white">{titel}</h3>
              <button
                onClick={() => setSelectedIndex(null)}
                className="text-white hover:text-gray-300 text-3xl"
              >
                ✕
              </button>
            </div>
            <div className="relative">
              <button
                className="absolute left-[-60px] top-1/2 transform -translate-y-1/2 bg-white bg-opacity-50 hover:bg-opacity-75 text-black p-2 rounded-full z-50"
                type="button"
                onClick={e => {
                  e.stopPropagation();
                  setSelectedIndex((selectedIndex - 1 + images.length) % images.length);
                }}
              >
                ◀
              </button>
              <img
                src={`/${folder}/${images[selectedIndex]}?v=${APP_VERSION}`}
                alt={`${titel} ${selectedIndex + 1}`}
                className="mx-auto object-contain rounded-lg max-h-[80vh] max-w-[90vw]"
                style={{ background: '#fff', boxShadow: '0 2px 16px rgba(0,0,0,0.2)' }}
              />
              <button
                className="absolute right-[-60px] top-1/2 transform -translate-y-1/2 bg-white bg-opacity-50 hover:bg-opacity-75 text-black p-2 rounded-full z-50"
                type="button"
                onClick={e => {
                  e.stopPropagation();
                  setSelectedIndex((selectedIndex + 1) % images.length);
                }}
              >
                ▶
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
