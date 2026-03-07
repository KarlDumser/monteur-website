export default function Widerruf() {
  return (
    <div className="min-h-screen bg-gray-50">
      <div className="container mx-auto px-4 py-12">
        <div className="max-w-3xl mx-auto">
          <h1 className="text-4xl font-bold mb-8">Widerrufsrecht und Widerrufsformular</h1>

          <div className="bg-white rounded-lg shadow-lg p-8 space-y-8">
            
            <section>
              <h2 className="text-2xl font-bold text-gray-800 mb-4">Widerrufsrecht</h2>
              <div className="bg-blue-50 border-l-4 border-blue-500 p-4 mb-4">
                <p className="text-gray-700 leading-relaxed">
                  <strong>Sie haben das Recht, Ihre Buchung innerhalb von 14 Tagen ohne Angabe 
                  von Gründen zu widerrufen (Widerrufsrecht gemäß § 355 BGB und § 312g BGB).</strong>
                </p>
              </div>
            </section>

            <section>
              <h2 className="text-2xl font-bold text-gray-800 mb-4">1. Widerrufsfrist</h2>
              <p className="text-gray-700 leading-relaxed mb-3">
                <strong>Die Widerrufsfrist beträgt 14 Tage ab Buchungsbestätigung.</strong>
              </p>
              <p className="text-gray-700 leading-relaxed">
                Die Widerrufsfrist endet um Mitternacht (00:00 Uhr) am letzten Tag der Frist. 
                Es genügt, wenn Sie Ihre Mitteilung über den Widerruf vor Ablauf 
                der Widerrufsfrist absenden.
              </p>
            </section>

            <section>
              <h2 className="text-2xl font-bold text-gray-800 mb-4">2. Wichtige Ausnahme</h2>
              <div className="bg-red-50 border-l-4 border-red-500 p-4">
                <p className="text-gray-700 leading-relaxed">
                  <strong>Das Recht zum Widerruf erlischt vorzeitig,</strong> wenn der Aufenthalt 
                  bereits begonnen hat oder die Unterkunft bezogen wurde, während die Widerrufsfrist 
                  noch läuft (Dienstleistung teilweise erbracht).
                </p>
              </div>
            </section>

            <section>
              <h2 className="text-2xl font-bold text-gray-800 mb-4">3. Wie widerrufe ich?</h2>
              <p className="text-gray-700 leading-relaxed mb-3">
                <strong>Schreiben Sie uns eine E-Mail oder einen Brief:</strong>
              </p>
              <div className="bg-gray-100 p-4 rounded-lg">
                <p className="text-gray-700 font-semibold mb-2">Per E-Mail:</p>
                <p className="text-gray-700 mb-4">monteur-wohnung@dumser.net</p>
                
                <p className="text-gray-700 font-semibold mb-2">Per Post:</p>
                <p className="text-gray-700">
                  Christine Dumser<br />
                  Monteurwohnung Dumser<br />
                  Frühlingstraße 8<br />
                  82152 Krailling<br />
                  Deutschland
                </p>
              </div>
            </section>

            <section>
              <h2 className="text-2xl font-bold text-gray-800 mb-4">4. Widerrufsformular</h2>
              <p className="text-gray-700 leading-relaxed mb-4">
                Sie können folgendes Formular für den Widerruf verwenden (erforderlich ist aber nur, 
                dass Sie Ihre Widerrufsentscheidung unmissverständlich mitteilen):
              </p>
              
              <div className="bg-gray-50 border border-gray-300 p-6 rounded-lg">
                <div className="mb-6 pb-6 border-b border-gray-300">
                  <p className="text-gray-700 font-bold">Widerrufsformular</p>
                </div>

                <div className="space-y-6 text-gray-700">
                  <div>
                    <p className="font-semibold mb-2">Betreff: Widerruf meiner Buchung</p>
                  </div>

                  <div>
                    <p>Hiermit widerrufe ich den Vertrag über die Miete der folgenden Unterkunft:</p>
                    <p className="mt-2">_________________________________________</p>
                    <p className="text-sm text-gray-600">(Wohnungsname/Adresse, z.B. „Wohnung Hackerberg")</p>
                  </div>

                  <div>
                    <p><strong>Buchungszeitraum:</strong></p>
                    <p>Von: ________________ Bis: ________________</p>
                    <p className="text-sm text-gray-600">(Anreisedatum bis Abreisedatum)</p>
                  </div>

                  <div>
                    <p><strong>Buchungsreferenz / Buchungsnummer:</strong></p>
                    <p>_________________________________________</p>
                  </div>

                  <div>
                    <p><strong>Mein Name:</strong></p>
                    <p>_________________________________________</p>
                  </div>

                  <div>
                    <p><strong>Meine E-Mail-Adresse:</strong></p>
                    <p>_________________________________________</p>
                  </div>

                  <div>
                    <p><strong>Meine Telefonnummer:</strong></p>
                    <p>_________________________________________</p>
                  </div>

                  <div className="pt-4 border-t border-gray-300">
                    <p>Ich erkläre hiermit, dass ich diese Buchung widerrufe.</p>
                  </div>

                  <div>
                    <p><strong>Ort und Datum:</strong></p>
                    <p>_________________________________________</p>
                  </div>

                  <div>
                    <p><strong>Unterschrift (bei Postversand erforderlich):</strong></p>
                    <p>_________________________________________</p>
                  </div>
                </div>
              </div>
            </section>

            <section>
              <h2 className="text-2xl font-bold text-gray-800 mb-4">5. Folgen des Widerrufs</h2>
              <p className="text-gray-700 leading-relaxed mb-3">
                <strong>Rückzahlung:</strong><br />
                Wenn Sie den Vertrag widerrufen, wird jeglich gezahlte Beträge 
                innerhalb von 14 Tagen auf das Ursprungszahlungsmittel erstattet.
              </p>
              <p className="text-gray-700 leading-relaxed">
                <strong>Kosten für den Widerruf:</strong><br />
                Wir tragen die Kosten der Geldrestitution einschließlich der Rücksendung. 
                Es entstehen keine zusätzlichen Kosten für Sie.
              </p>
            </section>

            <section>
              <h2 className="text-2xl font-bold text-gray-800 mb-4">6. Kontakt</h2>
              <p className="text-gray-700 leading-relaxed">
                <strong>Haben Sie Fragen zum Widerruf?</strong>
              </p>
              <p className="text-gray-700 leading-relaxed mt-3">
                monteur-wohnung@dumser.net<br />
                +49 (0) 172 3248313
              </p>
            </section>

            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mt-8">
              <p className="text-sm text-gray-700">
                <strong>Letzte Aktualisierung:</strong> 7. März 2026
              </p>
            </div>

          </div>
        </div>
      </div>
    </div>
  )
}
