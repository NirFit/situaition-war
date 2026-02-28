#!/usr/bin/env bash
set -e
cd "$(dirname "$0")/.."

echo "=== מעגל בטוח – התקנה והכנה ==="

if [ ! -f .env ] && [ -f .env.example ]; then
  cp .env.example .env
  echo "נוצר .env מ-.env.example (ערוך עם מפתחות Firebase אם צריך)"
fi

npm ci
npm run build

if ! git rev-parse --is-inside-work-tree >/dev/null 2>&1; then
  git init
  echo "אותחל Git. הוסף ריפו מרוחק: git remote add origin <URL>"
fi

echo ""
echo "הכל מוכן."
echo "להעלאה אוטומטית: דחוף ל-GitHub (main/master) – ה-workflow יעלה את האתר ל-GitHub Pages."
echo "או: npm run deploy  (דורש vercel login פעם אחת)"
