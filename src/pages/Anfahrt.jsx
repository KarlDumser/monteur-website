import CommuteCalculator from '../components/CommuteCalculator';
import { useTranslation } from 'react-i18next';

export default function Anfahrt() {
  const { t } = useTranslation();

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="container mx-auto px-4 py-12">
        <h1 className="text-4xl font-bold mb-8">{t('directions.title')}</h1>

        <div className="mb-8">
          <CommuteCalculator title={t('directions.calculatorTitle')} />
        </div>

        <div className="grid grid-cols-1 gap-8">
          {/* Wohnung Frühlingstrasse */}
          <div className="bg-white rounded-lg shadow-lg p-8">
            <h2 className="text-2xl font-bold text-gray-800 mb-4">{t('directions.apartmentTitle')}</h2>
            
            <div className="space-y-4 mb-6">
              <div>
                <h3 className="font-semibold text-gray-700">{t('directions.addressLabel')}</h3>
                <p className="text-gray-600">Frühlingstraße 8</p>
                <p className="text-gray-600">82152 Krailling</p>
                <p className="text-gray-600">{t('directions.country')}</p>
              </div>

              <div>
                <h3 className="font-semibold text-gray-700">{t('directions.byCarLabel')}</h3>
                <p className="text-gray-600">{t('directions.byCarText')}</p>
              </div>

              <div>
                <h3 className="font-semibold text-gray-700">{t('directions.publicTransportLabel')}</h3>
                <p className="text-gray-600">{t('directions.publicTransportText')}</p>
              </div>

              <div>
                <h3 className="font-semibold text-gray-700">{t('directions.parkingLabel')}</h3>
                <p className="text-gray-600">{t('directions.parkingText')}</p>
              </div>

              <div>
                <h3 className="font-semibold text-gray-700">{t('directions.keyHandoverLabel')}</h3>
                <p className="text-gray-600">{t('directions.keyHandoverText')}</p>
              </div>
            </div>

            <a
              className="block w-full text-center bg-blue-600 hover:bg-blue-700 text-white font-semibold py-3 px-4 rounded-lg transition"
              href="https://www.google.com/maps/search/?api=1&query=Fr%C3%BChlingstra%C3%9Fe%208%2C%2082152%20Krailling"
              target="_blank"
              rel="noopener noreferrer"
            >
              {t('directions.openMaps')}
            </a>
          </div>
        </div>
      </div>
    </div>
  )
}
