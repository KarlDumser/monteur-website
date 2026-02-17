# Monteurwohnung Dumser - Backend Setup

## 🚀 Installation

### 1. Dependencies installieren
```bash
npm install
```

### 2. MongoDB installieren und starten

**macOS (mit Homebrew):**
```bash
brew tap mongodb/brew
brew install mongodb-community
brew services start mongodb-community
```

**Oder MongoDB Atlas (Cloud) verwenden:**
- Kostenlosen Account erstellen: https://www.mongodb.com/cloud/atlas
- Cluster erstellen
- Connection String kopieren und in `.env` einfügen

### 3. Umgebungsvariablen konfigurieren

Erstellen Sie eine `.env` Datei im Root-Verzeichnis:

```bash
cp .env.example .env
```

Dann füllen Sie die Werte aus:

```env
# Server
PORT=3001

# MongoDB
MONGODB_URI=mongodb://localhost:27017/monteur-website
# Oder MongoDB Atlas:
# MONGODB_URI=mongodb+srv://username:password@cluster.mongodb.net/monteur-website

# Stripe (Sandbox)
STRIPE_SECRET_KEY=sk_test_IHR_STRIPE_SECRET_KEY
STRIPE_PUBLISHABLE_KEY=pk_test_IHR_STRIPE_PUBLISHABLE_KEY
STRIPE_WEBHOOK_SECRET=whsec_IHR_WEBHOOK_SECRET

# Email (Gmail Beispiel)
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_USER=ihre-email@gmail.com
SMTP_PASS=ihr-app-passwort
```

### 4. Stripe Setup

1. Gehen Sie zu: https://dashboard.stripe.com/test/apikeys
2. Kopieren Sie "Secret key" → `STRIPE_SECRET_KEY`
3. Kopieren Sie "Publishable key" → `STRIPE_PUBLISHABLE_KEY`
4. Für Webhooks: https://dashboard.stripe.com/test/webhooks

### 5. Gmail App-Passwort erstellen

1. Google Konto → Sicherheit
2. 2-Faktor-Authentifizierung aktivieren
3. App-Passwörter → "Mail" auswählen
4. Passwort kopieren → `SMTP_PASS`

## 🏃 Server starten

### Nur Frontend (Vite):
```bash
npm run dev
```

### Nur Backend:
```bash
npm run server
```

### Beide gleichzeitig:
```bash
npm run dev:full
```

## 📡 API Endpoints

### Buchungen
- `POST /api/bookings/check-availability` - Verfügbarkeit prüfen
- `GET /api/bookings/all` - Alle Buchungen
- `POST /api/bookings` - Neue Buchung
- `PATCH /api/bookings/:id/cancel` - Buchung stornieren

### Payment (Stripe)
- `POST /api/payment/create-payment-intent` - Payment Intent erstellen
- `POST /api/payment/confirm-payment` - Zahlung bestätigen
- `POST /api/payment/webhook` - Stripe Webhook

### Admin
- `GET /api/admin/bookings` - Alle Buchungen
- `GET /api/admin/blocked-dates` - Blockierte Zeiten
- `POST /api/admin/block-dates` - Zeiten blockieren
- `DELETE /api/admin/blocked-dates/:id` - Blockierung entfernen
- `GET /api/admin/calendar` - Kalenderansicht
- `GET /api/admin/statistics` - Statistiken

## 🧪 Testing

### API testen mit curl:

**Verfügbarkeit prüfen:**
```bash
curl -X POST http://localhost:3001/api/bookings/check-availability \
  -H "Content-Type: application/json" \
  -d '{"startDate":"2026-03-01","endDate":"2026-03-05","wohnung":"hackerberg"}'
```

**Health Check:**
```bash
curl http://localhost:3001/api/health
```

## 📂 Projektstruktur

```
monteur-website/
├── server/
│   ├── server.js              # Haupt-Server
│   ├── models/
│   │   ├── Booking.js         # Buchungs-Model
│   │   └── BlockedDate.js     # Blockierte Zeiten
│   ├── routes/
│   │   ├── bookings.js        # Buchungs-Routes
│   │   ├── payment.js         # Stripe Payment
│   │   └── admin.js           # Admin-Routes
│   └── utils/
│       ├── emailService.js    # E-Mail Versand
│       └── pdfGenerator.js    # PDF-Rechnung
├── src/                       # React Frontend
├── .env                       # Umgebungsvariablen
└── package.json
```

## 🔒 Sicherheit

- Nie `.env` committen (ist in .gitignore)
- Stripe: Nur Test-Keys verwenden bis Live-Betrieb
- MongoDB: Für Produktion Authentication aktivieren
- CORS: In Produktion nur erlaubte Domains

## 🐛 Häufige Probleme

**MongoDB verbindet nicht:**
- Prüfen ob MongoDB läuft: `brew services list` (macOS)
- Connection String in `.env` korrekt?

**E-Mails werden nicht gesendet:**
- Gmail App-Passwort korrekt?
- 2FA aktiviert bei Google?
- SMTP-Einstellungen korrekt?

**Stripe Fehler:**
- Test-Keys verwendet?
- Webhook-Secret korrekt (falls verwendet)?

## 📞 Support

Bei Fragen zur Einrichtung kontaktieren Sie mich!
