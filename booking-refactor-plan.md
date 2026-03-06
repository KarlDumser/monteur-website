# Buchungsprozess Refactoring Plan

## Neue Struktur (4 Schritte):

### Schritt 1: dateselect
- Zeitraum wählen (DateRange)
- Anzahl Mitarbeiter
- Button: "Verfügbarkeit prüfen" → checkAvailability() → step = "select"

### Schritt 2: select  
- Wohnung(en) anzeigen basierend auf Verfügbarkeit
- Bei Auswahl: selectedWohnung speichern → step = "form"
- **NEU**: Wenn 7+ Personen und Kombi nicht verfügbar → trotzdem Einzelwohnungen anbieten mit Disclaimer

### Schritt 3: form
- Alle Kundendaten eingeben (Firma, Adresse, Kontakt)
- Button: "Weiter zur Buchung" → handleCustomerDataSubmit() → Payment Page

### Schritt 4: payment (separate Page, wie bisher)
- Verbindliche Buchung

## State Changes:
- step: "dateselect" | "select" | "form" (statt nur "form" | "select")
- selectedWohnung: string (neue State Variable)

## Step Progress UI:
- 4 Kreise statt 2
