export default function Footer() {
  return (
    <footer className="bg-gray-800 text-white mt-16">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8 mb-8">
          <div>
            <h3 className="text-lg font-bold mb-4">Monteurwohnung Dumser</h3>
            <p className="text-gray-400">Komfortable und praktische Monteurwohnungen in bester Lage.</p>
          </div>
          <div>
            <h3 className="text-lg font-bold mb-4">Kontakt</h3>
            <p className="text-gray-400">
              Tel: +49 (0) 172 3248313<br />
              Email: monteur-wohnung@dumser.net
            </p>
          </div>
          <div>
            <h3 className="text-lg font-bold mb-4">Adresse</h3>
            <p className="text-gray-400">
              Frühligstraße XXX<br />
              82XXX Krailling<br />
              Deutschland
            </p>
          </div>
        </div>
        <div className="border-t border-gray-700 pt-6 text-center text-gray-400">
          <p>&copy; 2026 Monteurwohnung Dumser. Alle Rechte vorbehalten.</p>
        </div>
      </div>
    </footer>
  );
}
