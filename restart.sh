#!/bin/bash

echo "🛑 Stoppe alle Node-Prozesse..."
pkill -9 node

echo "🧹 Warte 2 Sekunden..."
sleep 2

echo "🚀 Starte Frontend-Server..."
cd /Users/karldumser/Documents/monteur-website
npm run dev > /tmp/frontend.log 2>&1 &

echo "✅ Fertig! Frontend läuft unter http://localhost:5173"
echo ""
echo "Hinweis: Backend-Server wurde NICHT gestartet (benötigt MongoDB)"
echo "Um das Backend zu starten, brauchen wir MongoDB Atlas:"
echo "1. Gehe zu https://www.mongodb.com/cloud/atlas"
echo "2. Erstelle kostenlosen Account"
echo "3. Kopiere die Connection String"
echo "4. Füge sie in .env ein als MONGODB_URI=..."
