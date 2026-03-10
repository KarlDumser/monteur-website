# Railway Bot Console Setup

## 🎯 Zusammenfassung
Die Live-Konsole für deinen Raspberry Pi Bot ist fertig implementiert! Du kannst den Bot jetzt direkt im Admin-Panel der Website starten, stoppen und die Logs in Echtzeit anschauen.

## ✅ Was bereits erledigt ist

### Auf dem Raspberry Pi:
- ✅ SSH Key installiert (passwortlose Verbindung)
- ✅ Systemd Service erstellt: `wohnungsbot.service`
- ✅ Sudoers konfiguriert (passwortloses systemctl)
- ✅ Tailscale aktiv (IP: 100.84.86.61)

### Im Code:
- ✅ Backend API mit 4 Endpoints (`server/routes/admin.js`)
- ✅ Admin UI mit Live-Konsole Tab (`src/pages/Admin.jsx`)
- ✅ SSH Key-Support für Railway (ENV-basiert)
- ✅ Auto-Refresh alle 4 Sekunden
- ✅ Branch: `feature/live-konsole-website`

## 🚀 Railway Einrichtung

### 1. Environment Variables in Railway setzen

Gehe zu deinem Railway Project → Variables und füge folgende hinzu:

```bash
BOT_SSH_HOST=100.84.86.61
BOT_SSH_USER=karldumser
BOT_SSH_PORT=22
BOT_PROJECT_DIR=/home/karldumser/email-Bot
BOT_SYSTEMD_SERVICE=wohnungsbot.service
```

### 2. Private SSH Key hinzufügen

**WICHTIG:** Der Private Key muss als **MULTILINE STRING** eingefügt werden!

Variable Name: `BOT_SSH_PRIVATE_KEY`

Wert (kopiere den kompletten Key mit -----BEGIN und -----END):
```
-----BEGIN OPENSSH PRIVATE KEY-----
b3BlbnNzaC1rZXktdjEAAAAABG5vbmUAAAAEbm9uZQAAAAAAAAABAAAAMwAAAAtzc2gtZW
QyNTUxOQAAACBGwiTjxMNAlas6nrm4VELD16iQrRT7Siqtvt+6ZDwFewAAAJgmvkjqJr5I
6gAAAAtzc2gtZWQyNTUxOQAAACBGwiTjxMNAlas6nrm4VELD16iQrRT7Siqtvt+6ZDwFew
AAAEBfCiOpAYEdsjXdxsAoGo3FqsokyJL4ebbhhPekHh25JUbCJOPEw0CVqzqeubhUQsPX
qJCtFPtKKq2+37pkPAV7AAAAE21vbnRldXItcmFpbHdheS1ib3QBAg==
-----END OPENSSH PRIVATE KEY-----
```

### 3. Deploy Branch

Merge `feature/live-konsole-website` in deinen Production Branch oder deploye den Branch direkt:

```bash
git checkout main  # oder deployment-clean
git merge feature/live-konsole-website
git push origin main
```

### 4. Railway Deployment überprüfen

Nach dem Deploy in Railway:
- Build sollte erfolgreich sein
- Server startet ohne Fehler

## 🧪 Testen

### Lokal testen (optional)

1. Erstelle `.env` Datei im Root-Verzeichnis:
```bash
cp .env.example .env
```

2. Füge die Bot-Variablen ein (wie oben)

3. Für lokales Testen kannst du `BOT_SSH_KEY_PATH` statt `BOT_SSH_PRIVATE_KEY` verwenden:
```bash
BOT_SSH_KEY_PATH=~/.ssh/monteur_pi
```

4. Starte den Server:
```bash
npm run dev:server
```

### In Production testen

1. Öffne die Website (Railway URL)
2. Gehe zum Admin Panel
3. Klicke auf "Live Konsole Bot" Tab
4. Du solltest sehen:
   - Status: inactive (rot) oder active (grün)
   - Host: 100.84.86.61
   - Service: wohnungsbot.service
   - Log-Output (schwarz-grünes Terminal)

5. Klicke "Start" → Bot sollte starten
6. Logs aktualisieren sich automatisch alle 4 Sekunden
7. Klicke "Stop" → Bot sollte stoppen

## 🔧 Troubleshooting

### "Network unreachable" oder "Connection timeout"
- **Problem:** Railway kann nicht zum Raspberry Pi verbinden
- **Ursache:** Railway Container sind nicht im Tailscale-Netzwerk
- **Lösung:** 
  - Option 1: Tailscale in Railway Container installieren (kompliziert)
  - Option 2: VPS als SSH-Bridge einrichten
  - Option 3: Port Forwarding auf dem Router (unsicher)
  - **Empfohlen:** Prüfe ob Railway Tailscale-Exit-Nodes unterstützt

### "Permission denied" beim Start/Stop
- Überprüfe sudoers: `sudo cat /etc/sudoers.d/wohnungsbot-control`
- Teste manuell: `ssh -i ~/.ssh/monteur_pi karldumser@100.84.86.61 'sudo systemctl status wohnungsbot.service'`

### Logs werden nicht angezeigt
- Überprüfe ob `log.txt` existiert: 
  ```bash
  ssh -i ~/.ssh/monteur_pi karldumser@100.84.86.61 'ls -la ~/email-Bot/log.txt'
  ```

### Bot startet nicht
- Log auf dem Pi anschauen:
  ```bash
  ssh -i ~/.ssh/monteur_pi karldumser@100.84.86.61 'sudo journalctl -u wohnungsbot.service -n 50'
  ```
- Überprüfe Python-Dependencies:
  ```bash
  ssh -i ~/.ssh/monteur_pi karldumser@100.84.86.61 'cd ~/email-Bot && source .venv/bin/activate && pip list'
  ```

## 📝 Manuelle Befehle (falls Admin Panel nicht funktioniert)

Von deinem Mac aus:

```bash
# Status prüfen
ssh -i ~/.ssh/monteur_pi karldumser@100.84.86.61 'sudo systemctl is-active wohnungsbot.service'

# Bot starten
ssh -i ~/.ssh/monteur_pi karldumser@100.84.86.61 'sudo systemctl start wohnungsbot.service'

# Bot stoppen
ssh -i ~/.ssh/monteur_pi karldumser@100.84.86.61 'sudo systemctl stop wohnungsbot.service'

# Logs anschauen
ssh -i ~/.ssh/monteur_pi karldumser@100.84.86.61 'tail -f ~/email-Bot/log.txt'

# Service Status Details
ssh -i ~/.ssh/monteur_pi karldumser@100.84.86.61 'sudo systemctl status wohnungsbot.service'
```

## 🌐 Railway → Tailscale Verbindung

**WICHTIGER HINWEIS:** Railway Container laufen in einem isolierten Netzwerk. Damit die SSH-Verbindung zum Raspberry Pi funktioniert, gibt es mehrere Optionen:

1. **Tailscale in Railway Container** (experimentell):
   - Tailscale als Dependency installieren
   - Bei Railway Start: `tailscale up --authkey=$TAILSCALE_AUTH_KEY`
   - Erfordert Anpassungen am Dockerfile/Start-Script

2. **Öffentlicher SSH-Port** (unsicher, nicht empfohlen):
   - Port 22 am Router freigeben
   - SSH auf non-standard Port ändern
   - Fail2ban installieren

3. **VPS als Bridge** (empfohlen für Production):
   - Kleiner VPS (5€/Monat) mit Tailscale
   - Railway → VPS → Raspberry Pi
   - Einfacher zu konfigurieren

4. **Direct IP** (falls Tailscale nicht funktioniert):
   - Raspberry Pi über öffentliche IP erreichbar machen
   - SSH-Keys verwenden (bereits eingerichtet)
   - IP in BOT_SSH_HOST eintragen

**Aktueller Status:** Die Tailscale-Verbindung funktioniert von deinem Mac zu Raspberry Pi. Noch unklar ob Railway → Tailscale ohne zusätzliche Konfiguration funktioniert.

## ✨ Features

- **Real-time Status:** Sieht ob der Bot läuft (grün) oder gestoppt ist (rot)
- **Start/Stop Buttons:** Ein-Klick Bot-Kontrolle
- **Live Logs:** Terminal-Style Log-Anzeige mit Auto-Refresh
- **SSH Security:** Ed25519 Key-basierte Authentifizierung
- **No Password:** Vollautomatisch, keine Passworteingabe nötig
- **Systemd Integration:** Stabiler Service mit Auto-Restart bei Crashes

## 📚 Nächste Schritte

1. ✅ ~~SSH einrichten~~
2. ✅ ~~Service erstellen~~
3. ✅ ~~Code implementieren~~
4. ⏳ Railway ENV-Variablen setzen
5. ⏳ Production Build deployen
6. ⏳ Testen ob Railway → Tailscale funktioniert
7. 🔄 Falls nötig: Alternative Verbindungsmethode implementieren

