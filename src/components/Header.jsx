import { Link } from 'react-router-dom';
import { APP_VERSION } from '../config';

export default function Header() {
  return (
    <header className="bg-gradient-to-r from-blue-600 to-blue-700 shadow-lg sticky top-0 z-50">
      <nav className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
        <div className="flex justify-between items-center">
          <Link to="/" className="flex items-center gap-2">
            <div className="bg-white rounded-lg p-2">
              <svg className="w-6 h-6 text-blue-600" fill="currentColor" viewBox="0 0 24 24">
                <path d="M10 20v-6h4v6h5v-8h3L12 3 2 12h3v8z" />
              </svg>
            </div>
            <span className="text-xl font-bold text-white">Monteurwohnung Dumser</span>
          </Link>
          <div className="flex gap-4 items-center">
            <Link to="/" className="text-white hover:bg-blue-500 px-3 py-2 rounded-lg transition">
              Home
            </Link>
            <Link to="/booking" className="text-white hover:bg-blue-500 px-3 py-2 rounded-lg transition">
              Buchung
            </Link>
            <Link to="/anfahrt" className="text-white hover:bg-blue-500 px-3 py-2 rounded-lg transition">
              Anfahrt
            </Link>
            <Link to="/impressum" className="text-white hover:bg-blue-500 px-3 py-2 rounded-lg transition">
              Impressum
            </Link>
            <span className="text-xs bg-white text-blue-600 px-2 py-1 rounded font-semibold ml-4">
              v{APP_VERSION}
            </span>
          </div>
        </div>
      </nav>
    </header>
  );
}
