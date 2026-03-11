import { useTranslation } from 'react-i18next';

export default function Impressum() {
  const { t } = useTranslation();
  const body = t('impressumPage.body', { returnObjects: true });

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="container mx-auto px-4 py-12">
        <div className="max-w-3xl mx-auto">
          <h1 className="text-4xl font-bold mb-8">{t('impressumPage.title')}</h1>

          <div className="bg-white rounded-lg shadow-lg p-8 space-y-8">
          
          <section>
            <h2 className="text-2xl font-bold text-gray-800 mb-4">{body.s1Title}</h2>
            <div className="text-gray-700 space-y-2">
              <p><strong>{body.s1Name}</strong> Christine Dumser</p>
              <p><strong>{body.s1Address}</strong> Frühlingstraße 8, 82152 Krailling</p>
              <p><strong>{body.s1Phone}</strong> +49 (0) 172 3248313</p>
              <p><strong>{body.s1Email}</strong> monteur-wohnung@dumser.net</p>
            </div>
          </section>

          <section>
            <h2 className="text-2xl font-bold text-gray-800 mb-4">{body.s2Title}</h2>
            <p className="text-gray-700 leading-relaxed">{body.s2p1}</p>
            <p className="text-gray-700 leading-relaxed mt-4">{body.s2p2}</p>
          </section>

          <section>
            <h2 className="text-2xl font-bold text-gray-800 mb-4">{body.s3Title}</h2>
            <p className="text-gray-700 leading-relaxed">{body.s3p1}</p>
          </section>

          <section>
            <h2 className="text-2xl font-bold text-gray-800 mb-4">{body.s4Title}</h2>
            <p className="text-gray-700 leading-relaxed">{body.s4p1}</p>
            <p className="text-gray-700 leading-relaxed mt-4">{body.s4p2}</p>
          </section>

          <section>
            <h2 className="text-2xl font-bold text-gray-800 mb-4">{body.s5Title}</h2>
            <p className="text-gray-700 leading-relaxed">{body.s5p1}</p>
          </section>

          </div>
        </div>
      </div>
    </div>
  )
}
