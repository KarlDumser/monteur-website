import { useTranslation } from 'react-i18next';

export default function AGB() {
  const { t } = useTranslation();
  const body = t('agbPage.body', { returnObjects: true });

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
          <h1 className="text-4xl font-bold mb-8">{t('agbPage.title')}</h1>

          <div className="bg-white rounded-lg shadow-lg p-8 space-y-8">
            
            <section>
              <h2 className="text-2xl font-bold text-gray-800 mb-4">{body.s1Title}</h2>
              <p className="text-gray-700 leading-relaxed">
                {body.s1p1}
              </p>
            </section>

            <section>
              <h2 className="text-2xl font-bold text-gray-800 mb-4">{body.s2Title}</h2>
              <p className="text-gray-700 leading-relaxed mb-3">
                <strong>{body.s2p1}</strong><br />
                {body.s2p1b}
              </p>
              <p className="text-gray-700 leading-relaxed mb-3">
                <strong>{body.s2p2}</strong><br />
                {body.s2p2b}
              </p>
              <p className="text-gray-700 leading-relaxed">
                <strong>{body.s2p3}</strong><br />
                {renderMultiline(body.s2p3b)}
              </p>
            </section>

            <section>
              <h2 className="text-2xl font-bold text-gray-800 mb-4">{body.s3Title}</h2>
              <p className="text-gray-700 leading-relaxed mb-3">
                <strong>{body.s3p1}</strong><br />
                {body.s3p1b}
              </p>
              <p className="text-gray-700 leading-relaxed mb-3">
                <strong>{body.s3p2}</strong><br />
                {body.s3p2b}
              </p>
              <p className="text-gray-700 leading-relaxed">
                {body.s3p3}
              </p>
            </section>

            <section>
              <h2 className="text-2xl font-bold text-gray-800 mb-4">{body.s4Title}</h2>
              <p className="text-gray-700 leading-relaxed mb-3">
                <strong>{body.s4p1}</strong><br />
                {renderMultiline(body.s4p1b)}
              </p>
              <p className="text-gray-700 leading-relaxed mb-3">
                <strong>{body.s4p2}</strong><br />
                {renderMultiline(body.s4p2b)}
              </p>
              <p className="text-gray-700 leading-relaxed">
                <strong>{body.s4p3}</strong><br />
                {body.s4p3b}
              </p>
            </section>

            <section>
              <h2 className="text-2xl font-bold text-gray-800 mb-4">{body.s5Title}</h2>
              <p className="text-gray-700 leading-relaxed mb-3">
                <strong>{body.s5p1}</strong><br />
                {body.s5p1b}
              </p>
              <p className="text-gray-700 leading-relaxed mb-3">
                <strong>{body.s5p2}</strong><br />
                {body.s5p2b}
              </p>
              <p className="text-gray-700 leading-relaxed mb-3">
                <strong>{body.s5p3}</strong><br />
                {renderMultiline(body.s5p3b)}
              </p>
              <p className="text-gray-700 leading-relaxed mb-3">
                <strong>{body.s5p4}</strong><br />
                {body.s5p4b}
              </p>
              <p className="text-gray-700 leading-relaxed">
                <strong>{body.s5p5}</strong><br />
                {body.s5p5b}
              </p>
            </section>

            <section>
              <h2 className="text-2xl font-bold text-gray-800 mb-4">{body.s6Title}</h2>
              <p className="text-gray-700 leading-relaxed mb-3">
                <strong>{body.s6p1}</strong><br />
                {body.s6p1b}
              </p>
              <p className="text-gray-700 leading-relaxed mb-3">
                <strong>{body.s6p2}</strong><br />
                {body.s6p2b}
              </p>
              <p className="text-gray-700 leading-relaxed mb-3">
                <strong>{body.s6p3}</strong><br />
                {body.s6p3b}
              </p>
              <p className="text-gray-700 leading-relaxed">
                <strong>{body.s6p4}</strong><br />
                {renderMultiline(body.s6p4b)}
              </p>
            </section>

            <section>
              <h2 className="text-2xl font-bold text-gray-800 mb-4">{body.s7Title}</h2>
              <p className="text-gray-700 leading-relaxed mb-3">
                <strong>{body.s7p1}</strong><br />
                {renderMultiline(body.s7p1b)}
              </p>
              <p className="text-gray-700 leading-relaxed mb-3">
                <strong>{body.s7p2}</strong><br />
                {renderMultiline(body.s7p2b)}
              </p>
              <p className="text-gray-700 leading-relaxed">
                <strong>{body.s7p3}</strong><br />
                {body.s7p3b}
              </p>
            </section>

            <section>
              <h2 className="text-2xl font-bold text-gray-800 mb-4">{body.s8Title}</h2>
              <p className="text-gray-700 leading-relaxed mb-3">
                <strong>{body.s8p1}</strong><br />
                {body.s8p1b}
              </p>
              <p className="text-gray-700 leading-relaxed">
                <strong>{body.s8p2}</strong><br />
                {body.s8p2b}
              </p>
            </section>

            <section>
              <h2 className="text-2xl font-bold text-gray-800 mb-4">{body.s9Title}</h2>
              <p className="text-gray-700 leading-relaxed">
                {body.s9p1}
              </p>
            </section>

            <section>
              <h2 className="text-2xl font-bold text-gray-800 mb-4">{body.s10Title}</h2>
              <p className="text-gray-700 leading-relaxed">
                {body.s10p1}
              </p>
            </section>

            <section>
              <h2 className="text-2xl font-bold text-gray-800 mb-4">{body.s11Title}</h2>
              <p className="text-gray-700 leading-relaxed mb-2">
                {body.s11p1}
              </p>
              <p className="text-gray-700 leading-relaxed">
                {body.s11p2}
              </p>
            </section>

            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mt-8">
              <p className="text-sm text-gray-700">
                <strong>{body.validFrom}</strong>
              </p>
            </div>

          </div>
        </div>
      </div>
    </div>
  )
}
