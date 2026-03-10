import { APP_VERSION } from '../config';
import { Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';

export default function Footer() {
  const { t } = useTranslation();

  return (
    <footer className="bg-gray-800 text-white mt-16">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8 mb-8 text-center">
          <div className="flex flex-col items-center">
            <h3 className="text-lg font-bold mb-4">{t('footer.company')}</h3>
            <p className="text-gray-400">Komfortable und praktische Monteurwohnungen in bester Lage.</p>
          </div>
          <div className="flex flex-col items-center">
            <h3 className="text-lg font-bold mb-4">{t('footer.phone')}</h3>
            <p className="text-gray-400"> 
              Mobil: +49 (0)172 3248313<br />
              Festnetz: +49 (0)89 8571174 <br />
              Email: monteur-wohnung@dumser.net
            </p>
          </div>
          <div className="flex flex-col items-center">
            <h3 className="text-lg font-bold mb-4">{t('footer.address')}</h3>
            <p className="text-gray-400">
              Frühlingstraße 8<br />
              82152 Krailling<br />
              Deutschland
            </p>
          </div>
        </div>

        {/* Legal Links */}
        <div className="border-t border-gray-700 pt-6 mb-6 text-center">
          <div className="flex flex-wrap justify-center gap-4 text-sm text-gray-300">
            <Link to="/impressum" className="hover:text-white transition">{t('nav.impressum')}</Link>
            <span className="text-gray-600">•</span>
            <Link to="/datenschutz" className="hover:text-white transition">{t('nav.datenschutz')}</Link>
            <span className="text-gray-600">•</span>
            <Link to="/agb" className="hover:text-white transition">{t('nav.agb')}</Link>
            <span className="text-gray-600">•</span>
            <Link to="/widerruf" className="hover:text-white transition">Widerrufsrecht</Link>
          </div>
        </div>

        <div className="border-t border-gray-700 pt-6 text-center text-gray-400">
          <p>&copy; 2026 {t('footer.company')}. {t('footer.rights')}</p>
          <p className="text-xs text-gray-500 mt-2">v{APP_VERSION}</p>
        </div>
      </div>
    </footer>
  );
}
