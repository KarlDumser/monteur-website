#!/usr/bin/env bash
set -euo pipefail

SRC_REPO="/home/karldumser/monteur-website-sparse"
SRC_DIR="$SRC_REPO/email-Bot/"
DST_DIR="/home/karldumser/email-Bot/"

mkdir -p "$DST_DIR" "$DST_DIR/logs"

cd "$SRC_REPO"
git fetch origin main
git reset --hard origin/main

rsync -a --delete \
  --exclude '.env' \
  --exclude '.venv/' \
  --exclude '__pycache__/' \
  --exclude 'logs/' \
  "$SRC_DIR" "$DST_DIR"
