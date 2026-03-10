import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { APP_VERSION } from '../config';

export default function Header() {
  const { i18n, t } = useTranslation();
  const [isAdminAuthed, setIsAdminAuthed] = useState(() => Boolean(sessionStorage.getItem('adminAuth')));
  const [isLanguageMenuOpen, setIsLanguageMenuOpen] = useState(false);

  const languages = [
    { code: 'de', name: '🇩🇪 Deutsch' },
    { code: 'pl', name: '🇵🇱 Polski' },
    { code: 'ro', name: '🇷🇴 Română' },
    { code: 'hu', name: '🇭🇺 Magyar' },
    { code: 'sk', name: '🇸🇰 Slovenčina' },
    { code: 'cs', name: '🇨🇿 Čeština' },
    { code: 'bg', name: '🇧🇬 Български' }
  ];

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

  const handleLanguageChange = (langCode) => {
    i18n.changeLanguage(langCode);
    localStorage.setItem('language', langCode);
    setIsLanguageMenuOpen(false);
  };

  const currentLangName = languages.find(l => l.code === i18n.language)?.name || 'Language';

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
          <div className="flex gap-4 items-center flex-nowrap overflow-x-auto scrollbar-hide py-2" style={{ WebkitOverflowScrolling: 'touch' }}>
            <Link to="/" className="text-white hover:bg-blue-500 px-3 py-2 rounded-lg transition">
              {t('nav.home')}
            </Link>
            <Link to="/booking" className="text-white hover:bg-blue-500 px-3 py-2 rounded-lg transition">
              {t('nav.booking')}
            </Link>
            <Link to="/anfahrt" className="text-white hover:bg-blue-500 px-3 py-2 rounded-lg transition">
              {t('nav.anfahrt')}
            </Link>
            <Link to="/impressum" className="text-white hover:bg-blue-500 px-3 py-2 rounded-lg transition">
              {t('nav.impressum')}
            </Link>
            
            {/* Language Switcher */}
            <div className="relative">
              <button
                onClick={() => setIsLanguageMenuOpen(!isLanguageMenuOpen)}
                className="text-white hover:bg-blue-500 px-3 py-2 rounded-lg transition text-sm"
              >
                🌐 {currentLangName.split(' ')[0]}
              </button>
              {isLanguageMenuOpen && (
                <div className="absolute right-0 mt-2 w-48 bg-white rounded-lg shadow-lg z-10">
                  {languages.map(lang => (
                    <button
                      key={lang.code}
                      onClick={() => handleLanguageChange(lang.code)}
                      className={`w-full text-left px-4 py-2 hover:bg-blue-100 ${i18n.language === lang.code ? 'bg-blue-50 font-bold text-blue-700' : 'text-gray-800'}`}
                    >
                      {lang.name}
                    </button>
                  ))}
                </div>
              )}
            </div>

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
                  {t('nav.logout')}
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
          </div>
        </div>
      </nav>
    </header>
  );
}
