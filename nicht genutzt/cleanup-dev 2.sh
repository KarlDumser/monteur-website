#!/bin/bash

# Cleanup Script für Zombie-Prozesse
# Behebt das wiederkehrende Localhost-Problem

echo "🧹 Bereinige alte Entwicklungs-Prozesse..."

# Töte alle npm/node/vite Prozesse im Projekt-Verzeichnis
pkill -9 -f "monteur-website.*vite"
pkill -9 -f "monteur-website.*npm"
pkill -9 -f "monteur-website.*node"
sleep 1

# Prüfe ob Ports frei sind
echo ""
echo "🔍 Prüfe Ports..."
PORT_CHECK=$(lsof -i :5173 -i :3001 2>/dev/null)

if [ -z "$PORT_CHECK" ]; then
    echo "✅ Alle Ports sind frei!"
else
    echo "⚠️  Noch blockierte Ports:"
    echo "$PORT_CHECK"
    echo ""
    echo "🔧 Beende blockierende Prozesse..."
    lsof -ti :5173 -i :3001 | xargs kill -9 2>/dev/null
    sleep 1
    echo "✅ Erledigt!"
fi

echo ""
echo "✨ Alles bereinigt! Starte jetzt: npm run dev"
