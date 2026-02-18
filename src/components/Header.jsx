import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { APP_VERSION } from '../config';

export default function Header() {
  const [isAdminAuthed, setIsAdminAuthed] = useState(() => Boolean(sessionStorage.getItem('adminAuth')));

  useEffect(() => {
    const syncAuth = () => {
      setIsAdminAuthed(Boolean(sessionStorage.getItem('adminAuth')));
    };

    window.addEventListener('admin-auth-changed', syncAuth);
    window.addEventListener('storage', syncAuth);

    return () => {
      window.removeEventListener('admin-auth-changed', syncAuth);
      window.removeEventListener('storage', syncAuth);
    };
  }, []);

  const handleLogout = () => {
    sessionStorage.removeItem('adminAuth');
    window.dispatchEvent(new Event('admin-auth-changed'));
  };

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
            {isAdminAuthed ? (
              <>
                <Link
                  to="/admin"
                  className="text-white/70 hover:text-white text-xs px-2 py-1 rounded-md transition"
                >
                  Admin
                </Link>
                <button
                  type="button"
                  onClick={handleLogout}
                  className="text-white/60 hover:text-white text-xs px-2 py-1 rounded-md transition"
                >
                  Logout
                </button>
              </>
            ) : (
              <Link
                to="/admin"
                className="text-white/70 hover:text-white text-xs px-2 py-1 rounded-md transition"
              >
                Admin-Login
              </Link>
            )}
            <span className="text-xs bg-white text-blue-600 px-2 py-1 rounded font-semibold ml-4">
              v{APP_VERSION}
            </span>
          </div>
        </div>
      </nav>
    </header>
  );
}
