# Mehrsprachige Website - Implementierungsleitfaden

## 🌐 Verfügbare Sprachen

Die Website unterstützt jetzt 6 Sprachen:

1. 🇩🇪 **Deutsch** (de) - Standard
2. 🇵🇱 **Polnisch** (pl)
3. 🇷🇴 **Rumänisch** (ro)
4. 🇭🇺 **Ungarisch** (hu)
5. 🇸🇰 **Slowakisch** (sk)
6. 🇨🇿 **Tschechisch** (cs)
7. 🇧🇬 **Bulgarisch** (bg)

## ✅ Was wurde implementiert

### 1. i18n Konfiguration
- `src/i18n.js` - Zentrale i18next-Konfiguration
- Automatische Spracherkennung basierend auf:
  - Gespeicherte Sprache in localStorage
  - Browser-Spracheinstellung
  - Fallback auf Deutsch

### 2. Sprachdateien
- `src/locales/de.json`, `pl.json`, `ro.json`, `hu.json`, `sk.json`, `cs.json`, `bg.json`
- Strukturierte Übersetzungen nach Themenbereich:
  - `nav.*` - Navigation
  - `header.*` - Kopfzeile
  - `home.*` - Startseite
  - `booking.*` - Buchung
  - `footer.*` - Fußzeile
  - `common.*` - Allgemeine Begriffe

### 3. Language Switcher
- Integriert in `Header.jsx`
- Dropdown-Menü mit allen 7 Sprachen
- Speichert die Sprachauswahl in localStorage
- Mit Länderflaggen-Emojis

### 4. Übersetzte Komponenten
- ✅ Header.jsx - Navigation mit Language Switcher
- ✅ Footer.jsx - Fußzeile
- ⏳ Home.jsx - Noch zu aktualisieren
- ⏳ Weitere Seiten

## 🔧 Wie man Übersetzungen verwendet

### In React-Komponenten:

```jsx
import { useTranslation } from 'react-i18next';

export default function Component() {
  const { t, i18n } = useTranslation();

  return (
    <div>
      {/* Einfache Übersetzung */}
      <h1>{t('nav.home')}</h1>

      {/* Sprache ändern */}
      <button onClick={() => i18n.changeLanguage('pl')}>
        Wechsel zu Polnisch
      </button>

      {/* Aktuelle Sprache abrufen */}
      <p>Aktuelle Sprache: {i18n.language}</p>
    </div>
  );
}
```

## 📝 Neue Übersetzungsschlüssel hinzufügen

1. Öffne alle Dateien in `src/locales/`
2. Füge neue Schlüssel in der gleichen Struktur hinzu:

```json
{
  "mySection": {
    "myKey": "German translation"
  }
}
```

3. Wiederhole für alle 7 Sprachen
4. Verwende in der Komponente:
```jsx
{t('mySection.myKey')}
```

## 🚀 Nächste Schritte

1. **Home.jsx** - Aktualisiere Wohnungsdetails, Preise und Beschreibungen
2. **BookingPage** - Übersetze Buchungsformular
3. **Admin-Panel** - Übersetze Admin-Seiten
4. **Fehlermeldungen** - Übersetze API Fehlerausgaben

## 🔄 Sprachauswahl speichern

Die gewählte Sprache wird automatisch in `localStorage` unter dem Schlüssel `language` gespeichert und beim nächsten Besuch geladen.

## 💡 Tipps

- Verwende immer `useTranslation()` Hook für neue Text-Ausgaben
- Halte Übersetzungsschlüssel konsistent und aussagekräftig
- Benutze Namenskonventionen: `section.key` (z.B. `nav.home`)
- Teste alle Sprachen, um sicherzustellen, dass die UI korrekt aussieht

## 📊 Übersetzungsabdeckung

| Komponente | Status | Übersetzungstext |
|-----------|--------|------------------|
| Header    | ✅ Fertig | Navigation, Language Switcher |
| Footer    | ✅ Fertig | Unternehmen, Links |
| Home      | ⏳ In Bearbeitung | Seiten Navigation |
| Booking   | ⏳ Ausstehend | Formular, Bestätigung |
| Admin     | ⏳ Ausstehend | Admin Interface |

---

**Hinweis:** Die Bot-Console 502 Fehler wurde auch behoben durch bessere Fehlerbehandlung in `server/routes/admin.js`.
