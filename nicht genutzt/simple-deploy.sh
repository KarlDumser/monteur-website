#!/bin/bash
cd /Users/karldumser/Documents/monteur-website

# Add essential files
git add -f src/
git add -f public/
git add -f server/
git add -f package.json
git add -f vite.config.js
git add -f tailwind.config.js
git add -f postcss.config.js
git add -f index.html
git add -f .gitignore
git add -f railway.json
git add -f Procfile
git add -f start.sh

# Commit if there are changes
if git diff --cached --quiet; then
  echo "No changes to commit"
else
  git commit -m "Add all source files for Railway deployment"
  git push origin galerie-fix-neu
  echo "✅ Pushed to GitHub!"
fi
