#!/bin/bash

echo "Starte Test-Server..."
node server/test-server.js > /tmp/server.log 2>&1 &
SERVER_PID=$!

echo "Warte 3 Sekunden..."
sleep 3

echo "=== Server Log ==="
cat /tmp/server.log

echo ""
echo "=== API Test ==="
curl -s http://localhost:3001/api/health || echo "Fehler: Server nicht erreichbar"

echo ""
echo "Stoppe Server (PID: $SERVER_PID)..."
kill $SERVER_PID 2>/dev/null

# Cleanup
pkill -f "node server/test-server.js" 2>/dev/null
