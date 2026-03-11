import { useTranslation } from 'react-i18next';

export default function Datenschutz() {
  const { t } = useTranslation();
  const body = t('datenschutzPage.body', { returnObjects: true });

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="container mx-auto px-4 py-12">
        <div className="max-w-3xl mx-auto">
          <h1 className="text-4xl font-bold mb-8">{t('datenschutzPage.title')}</h1>

          <div className="bg-white rounded-lg shadow-lg p-8 space-y-8">
            
            <section>
              <h2 className="text-2xl font-bold text-gray-800 mb-4">{body.s1Title}</h2>
              <div className="text-gray-700 space-y-2">
                <p><strong>{body.s1p1}</strong></p>
                <p>{body.s1p2}<br />{body.s1p2b}<br />{body.s1p2c}</p>
                <p>{body.s1p3}<br />{body.s1p3b}</p>
              </div>
            </section>

            <section>
              <h2 className="text-2xl font-bold text-gray-800 mb-4">{body.s2Title}</h2>
              <p className="text-gray-700 leading-relaxed">{body.s2p1}</p>
            </section>

            <section>
              <h2 className="text-2xl font-bold text-gray-800 mb-4">{body.s3Title}</h2>
              <p className="text-gray-700 leading-relaxed mb-3"><strong>{body.s3p1}</strong></p>
              <ul className="list-disc list-inside text-gray-700 space-y-2 mb-3">
                <li>{body.s3li1}</li>
                <li>{body.s3li2}</li>
                <li>{body.s3li3}</li>
                <li>{body.s3li4}</li>
                <li>{body.s3li5}</li>
                <li>{body.s3li6}</li>
                <li>{body.s3li7}</li>
              </ul>
              <p className="text-gray-700 leading-relaxed">
                <strong>{body.s3p2}</strong> {body.s3p2b}
              </p>
            </section>

            <section>
              <h2 className="text-2xl font-bold text-gray-800 mb-4">{body.s4Title}</h2>
              <p className="text-gray-700 leading-relaxed">{body.s4p1}</p>
            </section>

            <section>
              <h2 className="text-2xl font-bold text-gray-800 mb-4">{body.s5Title}</h2>
              <p className="text-gray-700 leading-relaxed">{body.s5p1}</p>
              <ul className="list-disc list-inside text-gray-700 space-y-2">
                <li>{body.s5li1}</li>
                <li>{body.s5li2}</li>
                <li>{body.s5li3}</li>
              </ul>
              <p className="text-gray-700 leading-relaxed mt-3">
                {body.s5p2}
              </p>
            </section>

            <section>
              <h2 className="text-2xl font-bold text-gray-800 mb-4">{body.s6Title}</h2>
              <p className="text-gray-700 leading-relaxed mb-3"><strong>{body.s6p1}</strong></p>
              <ul className="list-disc list-inside text-gray-700 space-y-2">
                <li>{body.s6li1}</li>
                <li>{body.s6li2}</li>
                <li>{body.s6li3}</li>
                <li>{body.s6li4}</li>
                <li>{body.s6li5}</li>
                <li>{body.s6li6}</li>
              </ul>
              <p className="text-gray-700 leading-relaxed mt-4">
                {body.s6p2}
              </p>
            </section>

            <section>
              <h2 className="text-2xl font-bold text-gray-800 mb-4">{body.s7Title}</h2>
              <p className="text-gray-700 leading-relaxed">
                {body.s7p1}
              </p>
            </section>

            <section>
              <h2 className="text-2xl font-bold text-gray-800 mb-4">{body.s8Title}</h2>
              <p className="text-gray-700 leading-relaxed">
                {body.s8p1}
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
                <strong>{body.s10p1}</strong>
              </p>
              <p className="text-gray-700 leading-relaxed mt-2">
                {body.s10p2}<br />
                {body.s10p2b}<br />
                {body.s10p2c}
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
