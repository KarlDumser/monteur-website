#!/bin/bash
set -e

cd /Users/karldumser/Documents/monteur-website

echo "Cleaning git locks..."
rm -f .git/index.lock .git/*.lock 2>/dev/null || true

echo "Adding files..."
git add -f index.html
git add -f package.json  
git add -f vite.config.js
git add -f tailwind.config.js
git add -f postcss.config.js
git add -f .gitignore
git add -f .npmrc
git add -f railway.json
git add -f Procfile
git add -f start.sh
git add -f src/
git add -f public/
git add -f server/

echo "Committing..."
git commit -m "Add all source files and configuration for Railway deployment"

echo "Pushing..."
git push origin galerie-fix-neu

echo "✅ Done!"
