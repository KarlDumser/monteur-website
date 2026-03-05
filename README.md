# Monteuerwohnung Buchungssystem

Modernebuchungsseite für zwei Monteuerwohnungen mit Stripe-Zahlungen, MongoDB-Datenbank und Admin-Dashboard.

## Features

- ✅ React 19 Frontend mit Vite
- ✅ Express.js Backend mit MongoDB
- ✅ Striped Zahlungsintegration (Sandbox)
- ✅ Dynamische Preisberechnung
- ✅ Frühbucherabatt (10%)
- ✅ 19% Mehrwertsteuer
- ✅ Admin-Dashboard mit Buchungsverwaltung
- ✅ Email-Bestätigungen mit PDF-Rechnungen
- ✅ Responsive Design mit Tailwind CSS

## Tech Stack

- **Frontend**: React 19, Vite, React Router, Tailwind CSS
- **Backend**: Express.js, Node.js
- **Database**: MongoDB Atlas
- **Payment**: Stripe
- **Email**: Nodemailer
- **PDF**: PDFKit

## Installation

### Voraussetzungen
- Node.js 18+
- npm oder yarn

### Setup

```bash
# Dependencies installieren
npm install

# Kopiere .env.example zu .env und .env.local.example zu .env.local
cp .env.example .env
cp .env.local.example .env.local

# Trage deine Werte in .env und .env.local ein:
# - MONGODB_URI (MongoDB Atlas Connection String)
# - STRIPE_SECRET_KEY (von Stripe Dashboard)
# - VITE_STRIPE_PUBLISHABLE_KEY (von Stripe Dashboard)

# Development-Server starten (Frontend + Backend)
npm run dev:full

# Oder einzeln:
npm run dev        # Frontend auf http://localhost:5173
npm run server     # Backend auf http://localhost:3001
```

## Umgebungsvariablen

Siehe [.env.example](.env.example) und [.env.local.example](.env.local.example)

### Wichtige Keys

- **MongoDB**: Kostenlosen M0 Cluster bei https://www.mongodb.com/cloud/atlas erstellen
- **Stripe**: Sandbox-Account bei https://stripe.com (kostenlos)
  - Test-Kartennummer: `4242 4242 4242 4242`

## Struktur

```
monteur-website/
├── src/
│   ├── pages/           # React Seiten (Home, Booking, Payment, Admin)
│   ├── components/      # React Komponenten
│   └── utils/          # Hilfsfunktionen (API-Calls)
├── server/
│   ├── routes/         # Express API-Routen
│   ├── models/         # MongoDB Schemas
│   ├── utils/          # Server-Utilities (Email, PDF)
│   └── server.js       # Haupt-Server-Datei
├── public/             # Bilder und Assets
└── dist/               # Build-Output
```

## API Endpoints

### Bookings
- `POST /api/bookings/check-availability` - Verfügbarkeit prüfen
- `POST /api/bookings` - Buchung erstellen
- `GET /api/bookings/:id` - Buchung abrufen

### Payment
- `POST /api/payment/create-payment-intent` - Stripe Payment Intent erstellen
- `POST /api/payment/confirm-payment` - Zahlung bestätigen

### Admin
- `GET /api/admin/bookings` - Alle Buchungen
- `GET /api/admin/statistics` - Statistiken
- `POST /api/admin/block-dates` - Zeiträume sperren
- `GET /api/admin/blocked-dates` - Gesperrte Zeiträume
- `DELETE /api/admin/blocked-dates/:id` - Sperrung löschen
- `GET /api/admin/bot-console/status` - Bot Status (Raspberry Pi)
- `POST /api/admin/bot-console/start` - Bot starten
- `POST /api/admin/bot-console/stop` - Bot stoppen
- `GET /api/admin/bot-console/logs` - Bot Logs anzeigen

### Bot Live Konsole Setup

Folgende ENV-Variablen in der Server-Umgebung setzen:

- `BOT_SSH_HOST` (z. B. `raspberrypi.tailccc131.ts.net`)
- `BOT_SSH_USER` (z. B. `pi`)
- `BOT_SSH_PORT` (Standard: `22`)
- `BOT_SSH_KEY_PATH` (Pfad zum Private Key auf dem Server)
- `BOT_PROJECT_DIR` (z. B. `/home/pi/Projekt-Automatisierung-Kunden`)
- `BOT_SYSTEMD_SERVICE` (z. B. `projekt-automatisierung-kunden.service`)

Der SSH-User muss `systemctl start/stop <service>` ausführen dürfen (ggf. via `sudoers` ohne Passwort).

## Deployment auf Railway

0. Dieses Repository zu GitHub pushen
1. Account bei https://railway.app erstellen
2. Neues Projekt erstellen und GitHub-Repo verbinden
3. Umgebungsvariablen hinzufügen (aus .env Datei)
4. Deploy starten!

Die App wird automatisch:
- Gebaut: `npm run build`
- Gestartet: `npm run start:prod`

## Entwicklung

### Test-Daten

**Admin-Zugang**: http://localhost:5173/admin

**Test-Zahlungen mit Stripe**:
- Kartennummer: `4242 4242 4242 4242`
- Ablaufdatum: `12/26`
- CVC: `123`
- Postleitzahl: `12345`

### Logs

```bash
# MongoDB Status
curl http://localhost:3001/api/health

# Server-Logs
npm run server | tail -100
```

## Troubleshooting

### Localhost lädt nicht / Port 5173 ist bereits belegt

Falls der Dev-Server nicht startet oder localhost nicht lädt, liegt das meist an "Zombie"-Prozessen von vorherigen Starts:

```bash
# Automatische Bereinigung mit integriertem Script
npm run cleanup

# Oder direkt:
./cleanup-dev.sh

# Danach normal starten:
npm run dev

# Oder alles in einem:
npm run dev:clean
```

Das cleanup-Script prüft die Ports 5173 und 3001 und beendet alle alten Vite/Node-Prozesse dieses Projekts.

### Email-Versand funktioniert nicht

1. Prüfe die SMTP-Konfiguration in `.env`:
   - `SMTP_HOST=in-v3.mailjet.com`
   - `SMTP_PORT=587`
   - `SMTP_USER=<deine-mailjet-api-key>`
   - `SMTP_PASSWORD=<dein-mailjet-secret>`

2. Server-Logs überprüfen - ausführliches Debugging ist aktiviert
3. Timeouts: 10s für Verbindung, 15s für Versand

### MongoDB Connection Errors

Stelle sicher, dass:
- MongoDB Atlas IP-Whitelist korrekt ist (0.0.0.0/0 für alle IPs)
- Connection String in `.env` korrekt ist
- Cluster aktiv ist

## Lizenz

Private - Nur für Monteuerwohnungen Dumser

## Support

Kontakt: support@monteuerwohnungen.de
