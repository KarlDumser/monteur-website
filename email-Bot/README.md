# Email Auto-Reply Bot für Monteurwohnung

Automatisiertes E-Mail-System für Kundenanfragen mit GPT-basierter Antwortgenerierung.

## Features

- **E-Mail Monitoring**: Überwacht IMAP-Postfach auf neue Anfragen
- **Forward-Erkennung**: Erkennt weitergeleitete E-Mails und extrahiert Original-Absender
- **GPT-Antworten**: Generiert personalisierte Antworten mit OpenAI
- **Push-Benachrichtigungen**: Optional manuelle Freigabe vor Versand (Pushover)
- **Kalender-Integration**: Erstellt Google Calendar Events bei Buchungsanfragen
- **Buchungslink**: Fügt automatisch Link zur Online-Buchungsseite ein

## Setup

1. **Dependencies installieren**:
   ```bash
   cd Projekt-Automatisierung-Kunden
   python -m venv venv
   source venv/bin/activate  # macOS/Linux
   # oder: venv\Scripts\activate  # Windows
   pip install -r requirements.txt
   ```

2. **Umgebungsvariablen konfigurieren**:
   ```bash
   cp .env.example .env
   # .env bearbeiten und echte Credentials eintragen
   ```

3. **Google Calendar OAuth** (optional):
   - `credentials.json` von Google Cloud Console herunterladen
   - Beim ersten Start wird Browser-Login gestartet
   - Token wird in `token.json` gespeichert

## Verwendung

### Manueller Start

```bash
# Terminal 1: Flask Confirmation Server (für Push-Freigabe)
source venv/bin/activate
python flask_confirmation_server.py

# Terminal 2: Email Bot
source venv/bin/activate
python main.py
```

### Mit tmux (läuft im Hintergrund)

```bash
tmux new-session -d -s wohnungsbot
tmux send-keys 'cd "$(pwd)" && source venv/bin/activate && python flask_confirmation_server.py' C-m
tmux split-window -h
tmux send-keys 'cd "$(pwd)" && source venv/bin/activate && python main.py' C-m
tmux attach-session -t wohnungsbot
```

**tmux Steuerung**:
- Zwischen Fenstern wechseln: `CTRL+B` dann Pfeiltasten
- Session verlassen (läuft weiter): `CTRL+B` dann `d`
- Wieder verbinden: `tmux attach-session -t wohnungsbot`
- Session beenden: `tmux kill-session -t wohnungsbot`

## Workflow

1. Bot prüft alle 30 Sekunden auf neue ungelesene E-Mails
2. Erkennt weitergeleitete Mails und extrahiert Original-Absender
3. Filtert vermietungsbezogene Anfragen (GPT-basiert)
4. Generiert personalisierte Antwort mit Buchungslink
5. Sendet Push-Benachrichtigung zur Freigabe
6. Nach Bestätigung: Versand + Kalendereintrag

## Konfiguration

### .env Optionen

```env
EMAIL_ADDRESS=monteur-wohnung@dumser.net
EMAIL_PASSWORD=<password>
IMAP_SERVER=secureimap.t-online.de
SMTP_SERVER=securesmtp.t-online.de
SMTP_PORT=587

OPENAI_API_KEY=sk-proj-...
OPENAI_MODEL=gpt-4o-mini
OPENAI_TIMEOUT=30

PUSHOVER_USER_KEY=<key>
PUSHOVER_API_TOKEN=<token>

BOOKING_URL=https://monteur-website-production.up.railway.app/

FLASK_CONFIRM_HOST=0.0.0.0
FLASK_CONFIRM_PORT=5000
```

### Prompts anpassen

- **Rolle**: `promts/prompt_role.txt` (aktuell leer)
- **Format**: `promts/prompt_format.txt` (E-Mail-Template)

## Sicherheit

- ⚠️ `.env` enthält sensible Daten → **nie committen**
- `.gitignore` ist bereits konfiguriert
- Nutze `.env.example` als Template

## Logs

- `log.txt`: Haupt-Logdatei
- `logs/confirmed_replies.log`: Alle versendeten Antworten

## Troubleshooting

**IMAP Login schlägt fehl**:
- IMAP/SMTP bei Provider aktiviert?
- Richtiger Server/Port in `.env`?

**GPT-Antworten fehlerhaft**:
- OpenAI API-Key gültig?
- Prompt in `promts/prompt_format.txt` prüfen

**Push-Benachrichtigungen kommen nicht**:
- Pushover App installiert?
- User Key + API Token korrekt?

**Forward-Erkennung funktioniert nicht**:
- Original-Absender muss in Mail-Body stehen
- Format: "Von: email@example.com" oder "From: ..."
