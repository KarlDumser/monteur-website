import { Link } from 'react-router-dom';

export default function PropertyCard({ property }) {
  return (
    <div className="bg-white rounded-xl shadow-lg overflow-hidden hover:shadow-xl transition-shadow duration-300">
      <div className="bg-gradient-to-r from-blue-500 to-blue-600 h-48 flex items-center justify-center">
        <svg className="w-20 h-20 text-white" fill="currentColor" viewBox="0 0 24 24">
          <path d="M10 20v-6h4v6h5v-8h3L12 3 2 12h3v8z" />
        </svg>
      </div>
      
      <div className="p-6">
        <h3 className="text-2xl font-bold text-gray-800 mb-2">{property.titel}</h3>
        
        <p className="text-gray-600 mb-4">{property.beschreibung}</p>
        
        <div className="space-y-2 mb-4 text-sm text-gray-700">
          <div className="flex items-center gap-2">
            <svg className="w-4 h-4 text-blue-600" fill="currentColor" viewBox="0 0 24 24">
              <path d="M1 9l2 2c4.97-4.97 13.03-4.97 18 0l2-2C16.93 2.93 7.08 2.93 1 9zm8 8l3 3 3-3c-1.65-1.66-4.34-1.66-6 0zm-4-4l2 2c2.76-2.76 7.24-2.76 10 0l2-2C15.14 9.14 8.87 9.14 5 13z" />
            </svg>
            <span>{property.internet}</span>
          </div>
          <div className="flex items-center gap-2">
            <svg className="w-4 h-4 text-blue-600" fill="currentColor" viewBox="0 0 24 24">
              <path d="M17 10.5V7c0-.55-.45-1-1-1H4c-.55 0-1 .45-1 1v10c0 .55.45 1 1 1h12c.55 0 1-.45 1-1v-3.5l4 4v-11l-4 4z" />
            </svg>
            <span>{property.extras}</span>
          </div>
        </div>
        
        <div className="bg-blue-50 rounded-lg p-3 mb-4">
          <p className="text-lg font-semibold text-blue-900">{property.preis}</p>
        </div>
        
        <div className="flex gap-2">
          <a
            href={property.galerie}
            target="_blank"
            rel="noreferrer"
            className="flex-1 bg-gray-100 hover:bg-gray-200 text-gray-800 font-semibold py-2 px-4 rounded-lg text-center transition"
          >
            Galerie
          </a>
          <Link
            to="/booking"
            className="flex-1 bg-blue-600 hover:bg-blue-700 text-white font-semibold py-2 px-4 rounded-lg text-center transition"
          >
            Buchen
          </Link>
        </div>
      </div>
    </div>
  );
}
