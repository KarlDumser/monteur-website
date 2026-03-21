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

  useEffect(() => {
    const onKeyDown = (event) => {
      if (event.key === 'Escape') {
        setIsLanguageMenuOpen(false);
      }
    };

    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
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

  const currentLanguage = languages.find((l) => l.code === i18n.language) || languages[0];

  return (
    <>
      <header className="bg-gradient-to-r from-blue-600 to-blue-700 shadow-lg sticky top-0 z-50">
      <nav className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
        <div className="flex justify-between items-center gap-3">
          <Link to="/" className="flex items-center gap-2">
            <div className="bg-white rounded-lg p-2">
              <svg className="w-6 h-6 text-blue-600" fill="currentColor" viewBox="0 0 24 24">
                <path d="M10 20v-6h4v6h5v-8h3L12 3 2 12h3v8z" />
              </svg>
            </div>
            <span className="text-xl font-bold text-white">{t('header.title')}</span>
          </Link>
          <div className="flex gap-3 items-center py-2 overflow-x-auto whitespace-nowrap max-w-[65vw] sm:max-w-none">
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
            
            <button
              type="button"
              onClick={() => setIsLanguageMenuOpen(true)}
              className="text-white hover:bg-blue-500 px-3 py-2 rounded-lg transition text-sm"
              aria-haspopup="dialog"
              aria-expanded={isLanguageMenuOpen ? 'true' : 'false'}
            >
              🌐 {currentLanguage.name}
            </button>

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
            ) : null}
          </div>
        </div>
      </nav>
    </header>

      {isLanguageMenuOpen && (
        <div
          className="fixed inset-0 z-[70] flex items-center justify-center bg-black/45 px-4"
          role="dialog"
          aria-modal="true"
          aria-label={t('common.language')}
          onClick={() => setIsLanguageMenuOpen(false)}
        >
          <div
            className="w-full max-w-sm rounded-2xl bg-white p-5 shadow-2xl"
            onClick={(event) => event.stopPropagation()}
          >
            <div className="mb-4 flex items-center justify-between">
              <h2 className="text-lg font-bold text-slate-900">{t('common.language')}</h2>
              <button
                type="button"
                onClick={() => setIsLanguageMenuOpen(false)}
                className="rounded-lg px-2 py-1 text-slate-500 hover:bg-slate-100 hover:text-slate-700"
                aria-label={t('common.close')}
              >
                x
              </button>
            </div>

            <div className="space-y-2">
              {languages.map((lang) => {
                const isCurrent = i18n.language === lang.code;
                return (
                  <button
                    key={lang.code}
                    type="button"
                    onClick={() => handleLanguageChange(lang.code)}
                    className={`flex w-full items-center justify-between rounded-xl border px-4 py-3 text-left transition ${
                      isCurrent
                        ? 'border-blue-500 bg-blue-50 font-semibold text-blue-700'
                        : 'border-slate-200 bg-white text-slate-700 hover:border-blue-300 hover:bg-blue-50'
                    }`}
                  >
                    <span>{lang.name}</span>
                    {isCurrent && <span className="text-xs">{t('common.selected')}</span>}
                  </button>
                );
              })}
            </div>
          </div>
        </div>
      )}
    </>
  );
}
