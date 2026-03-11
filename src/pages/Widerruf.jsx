import { useTranslation } from 'react-i18next';

export default function Widerruf() {
  const { t } = useTranslation();
  const body = t('widerrufPage.body', { returnObjects: true });

  const renderMultiline = (text) => {
    if (!text) return '';
    return text.split('\n').map((line, idx) => (
      <div key={idx}>{line}</div>
    ));
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="container mx-auto px-4 py-12">
        <div className="max-w-3xl mx-auto">
          <h1 className="text-4xl font-bold mb-8">{t('widerrufPage.title')}</h1>

          <div className="bg-white rounded-lg shadow-lg p-8 space-y-8">
            
            <section>
              <h2 className="text-2xl font-bold text-gray-800 mb-4">{body.sectionTitle || t('widerrufPage.title')}</h2>
              <div className="bg-blue-50 border-l-4 border-blue-500 p-4 mb-4">
                <p className="text-gray-700 leading-relaxed">
                  <strong>{body.headerText}</strong>
                </p>
              </div>
            </section>

            <section>
              <h2 className="text-2xl font-bold text-gray-800 mb-4">{body.s1Title}</h2>
              <p className="text-gray-700 leading-relaxed mb-3">
                <strong>{body.s1p1}</strong>
              </p>
              <p className="text-gray-700 leading-relaxed">
                {body.s1p2}
              </p>
            </section>

            <section>
              <h2 className="text-2xl font-bold text-gray-800 mb-4">{body.s2Title}</h2>
              <div className="bg-red-50 border-l-4 border-red-500 p-4">
                <p className="text-gray-700 leading-relaxed">
                  <strong>{body.s2p1}</strong>
                </p>
              </div>
            </section>

            <section>
              <h2 className="text-2xl font-bold text-gray-800 mb-4">{body.s3Title}</h2>
              <p className="text-gray-700 leading-relaxed mb-3">
                <strong>{body.s3p1}</strong>
              </p>
              <div className="bg-gray-100 p-4 rounded-lg">
                <p className="text-gray-700 font-semibold mb-2">{body.s3p2}</p>
                <p className="text-gray-700 mb-4">{body.s3p2b}</p>
                
                <p className="text-gray-700 font-semibold mb-2">{body.s3p3}</p>
                <p className="text-gray-700">
                  {renderMultiline(body.s3p3b)}
                </p>
              </div>
            </section>

            <section>
              <h2 className="text-2xl font-bold text-gray-800 mb-4">{body.s4Title}</h2>
              <p className="text-gray-700 leading-relaxed mb-4">
                {body.s4p1}
              </p>
              
              <div className="bg-gray-50 border border-gray-300 p-6 rounded-lg">
                <div className="mb-6 pb-6 border-b border-gray-300">
                  <p className="text-gray-700 font-bold">{body.s4FormTitle}</p>
                </div>

                <div className="space-y-6 text-gray-700">
                  <div>
                    <p className="font-semibold mb-2">Betreff: {body.s4f1}</p>
                  </div>

                  <div>
                    <p>{body.s4f2}</p>
                    <p className="mt-2">_________________________________________</p>
                    <p className="text-sm text-gray-600">{body.s4f2h}</p>
                  </div>

                  <div>
                    <p><strong>{body.s4f3}</strong></p>
                    <p>Von: ________________ Bis: ________________</p>
                    <p className="text-sm text-gray-600">{body.s4f3h}</p>
                  </div>

                  <div>
                    <p><strong>{body.s4f4}</strong></p>
                    <p>_________________________________________</p>
                  </div>

                  <div>
                    <p><strong>{body.s4f5}</strong></p>
                    <p>_________________________________________</p>
                  </div>

                  <div>
                    <p><strong>{body.s4f6}</strong></p>
                    <p>_________________________________________</p>
                  </div>

                  <div>
                    <p><strong>{body.s4f7}</strong></p>
                    <p>_________________________________________</p>
                  </div>

                  <div className="pt-4 border-t border-gray-300">
                    <p>{body.s4f8}</p>
                  </div>

                  <div>
                    <p><strong>{body.s4f9}</strong></p>
                    <p>_________________________________________</p>
                  </div>

                  <div>
                    <p><strong>{body.s4f10}</strong></p>
                    <p>_________________________________________</p>
                  </div>
                </div>
              </div>
            </section>

            <section>
              <h2 className="text-2xl font-bold text-gray-800 mb-4">{body.s5Title}</h2>
              <p className="text-gray-700 leading-relaxed mb-3">
                <strong>{body.s5p1}</strong><br />
                {body.s5p1b}
              </p>
              <p className="text-gray-700 leading-relaxed">
                <strong>{body.s5p2}</strong><br />
                {body.s5p2b}
              </p>
            </section>

            <section>
              <h2 className="text-2xl font-bold text-gray-800 mb-4">{body.s6Title}</h2>
              <p className="text-gray-700 leading-relaxed">
                <strong>{body.s6p1}</strong>
              </p>
              <p className="text-gray-700 leading-relaxed mt-3">
                {body.s6p2}<br />
                {body.s6p2b}
              </p>
            </section>

            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mt-8">
              <p className="text-sm text-gray-700">
                <strong>{body.lastUpdate}</strong>
              </p>
            </div>

          </div>
        </div>
      </div>
    </div>
  )
}
