#!/usr/bin/env bash
set -euo pipefail

mkdir -p /home/karldumser/bin /home/karldumser/monteur-website-sparse /home/karldumser/email-Bot/logs

if [ ! -d /home/karldumser/monteur-website-sparse/.git ]; then
  git clone --filter=blob:none --no-checkout https://github.com/KarlDumser/monteur-website.git /home/karldumser/monteur-website-sparse
fi

cd /home/karldumser/monteur-website-sparse
git sparse-checkout init --cone
git sparse-checkout set email-Bot
git fetch origin main
git checkout -B main origin/main

install -m 755 /tmp/update-projekt-automatisierung.sh /home/karldumser/bin/update-projekt-automatisierung.sh

( crontab -l 2>/dev/null | grep -v 'update-projekt-automatisierung.sh' ; echo '*/5 * * * * /usr/bin/flock -n /tmp/update-projekt.lock /home/karldumser/bin/update-projekt-automatisierung.sh >> /home/karldumser/email-Bot/logs/deploy-sync.log 2>&1' ) | crontab -

/home/karldumser/bin/update-projekt-automatisierung.sh

echo "SETUP_OK"
