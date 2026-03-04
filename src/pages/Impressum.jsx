export default function Impressum() {
  return (
    <div className="min-h-screen bg-gray-50">
      <div className="container mx-auto px-4 py-12">
        <div className="max-w-3xl mx-auto">
          <h1 className="text-4xl font-bold mb-8">Impressum</h1>

          <div className="bg-white rounded-lg shadow-lg p-8 space-y-8">
          
          <section>
            <h2 className="text-2xl font-bold text-gray-800 mb-4">Angaben gemäß § 5 E-Commerce-Gesetz</h2>
            <div className="text-gray-700 space-y-2">
              <p><strong>Name:</strong> Christine Dumser</p>
              <p><strong>Adresse:</strong> Frühlingstraße 8, 82152 Krailling</p>
              <p><strong>Telefon:</strong> +49 (0) 172 3248313</p>
              <p><strong>E-Mail:</strong> montuer-wohnung@dumser.net</p>
            </div>
          </section>

          <section>
            <h2 className="text-2xl font-bold text-gray-800 mb-4">Haftungsausschluss</h2>
            <p className="text-gray-700 leading-relaxed">
              Die Inhalte unserer Seite wurden mit größter Sorgfalt erstellt. Für die Richtigkeit, 
              Vollständigkeit und Aktualität der Inhalte können wir jedoch keine Gewähr übernehmen.
            </p>
            <p className="text-gray-700 leading-relaxed mt-4">
              Als Diensteanbieter sind wir gemäß § 7 Abs.1 TMG für eigene Inhalte auf diesen Seiten nach den 
              allgemeinen Gesetzen verantwortlich. Nach §§ 8 bis 10 des TMG sind wir als Diensteanbieter jedoch 
              nicht verpflichtet, fremde Informationen, die wir übermittelt oder speichern, zu überwachen.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-bold text-gray-800 mb-4">Urheberrecht</h2>
            <p className="text-gray-700 leading-relaxed">
              Die Inhalte und Werke auf diesen Seiten sind urheberrechtlich geschützt. Die Vervielfältigung, 
              Bearbeitung, Verbreitung und jede Art der Verwertung außerhalb der Grenzen des Urheberrechts 
              bedürfen der schriftlichen Zustimmung des Autors bzw. Schöpfers.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-bold text-gray-800 mb-4">Datenschutz</h2>
            <p className="text-gray-700 leading-relaxed">
              Die Nutzung unserer Website ist in der Regel ohne Angabe personenbezogener Daten möglich. 
              Soweit auf unseren Seiten personenbezogene Daten erhoben werden, erfolgt dies auf freiwilliger Basis.
            </p>
            <p className="text-gray-700 leading-relaxed mt-4">
              Wir weisen darauf hin, dass die Datenübertragung im Internet Sicherheitslücken aufweisen kann. 
              Ein lückenloser Schutz von Daten vor dem Zugriff Dritter ist nicht möglich.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-bold text-gray-800 mb-4">Links auf fremde Inhalte</h2>
            <p className="text-gray-700 leading-relaxed">
              Unsere Website enthält Links zu fremden Websites. Für den Inhalt dieser Websites sind wir nicht verantwortlich.
            </p>
          </section>

          <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mt-8">
            <p className="text-sm text-gray-700">
              <strong>Hinweis:</strong> Test-Build! - Impressum noch überarbeiten!
            </p>
          </div>

          </div>
        </div>
      </div>
    </div>
  )
}
