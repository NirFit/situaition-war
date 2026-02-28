# פריסה לאוויר – מעגל בטוח

## מה נוצר אוטומטית

- **`.github/workflows/deploy.yml`** – עם דחיפה ל־GitHub (main/master) האתר נבנה ועולה ל־GitHub Pages.
- **`vite.config.ts`** – `base` מותאם ל־GitHub Pages (או ל־`/` locally).
- **`vercel.json`** / **`firebase.json`** – headers אבטחה ופריסה ל־Vercel או Firebase Hosting.
- **`scripts/setup.sh`** – התקנה, בנייה, יצירת `.env` מ־`.env.example`, ואתחול Git.
- **`.gitignore`** – כולל `.env` כדי שמפתחות לא יעלו ל־Git.

הרצת **`npm run setup`** מכינה את הפרויקט (התקנה, build, git init). אחר כך דחיפה ל־GitHub + הפעלת Pages מעלה את האתר.

---

## העלאה מהירה (Vercel)

```bash
npx vercel login    # פעם אחת – פותח דפדפן להתחברות
npm run deploy      # בונה ומעלה לאתר חי (HTTPS)
```

אחרי `npm run deploy` יופיע קישור לאתר (למשל `https://….vercel.app`). שמור אותו.

---

## אבטחה (Security)

- **HTTPS** – כל הפריסות (Vercel / Firebase) מספקות HTTPS אוטומטי.
- **סודות** – קובץ `.env` לא נשמר ב-Git (ב-.gitignore). אל תעלה מפתחות Firebase לרשת.
- **Headers** – הוגדרו ב-`vercel.json` / `firebase.json`:
  - `X-Content-Type-Options: nosniff`
  - `X-Frame-Options: DENY`
  - `X-XSS-Protection: 1; mode=block`
  - `Referrer-Policy: strict-origin-when-cross-origin`
- **Firebase** – אם משתמשים ב-Firebase, להגדיר כללי אבטחה ב-Firestore ו-Authentication ב-Console.

---

## גיבוי (Backup)

### קוד
- **Git** – דחיפה ל-GitHub/GitLab משמשת גיבוי קוד. מומלץ: `git remote add origin <url>` ו-`git push -u origin main`.
- **תיקייה מקומית** – שמירת עותק של הפרויקט (או ארכיון) במקום נוסף.

### נתונים (אם משתמשים ב-Firebase)
- **Firestore** – ב-Firebase Console: Firestore → ⋮ → Export data ל-Google Cloud Storage.
- **הגדרת גיבוי אוטומטי** – ב-Google Cloud Console אפשר להפעיל Scheduled Exports ל-Firestore.

---

## פריסה (Deploy)

### אופציה 1: Vercel (מומלץ – חינם, CDN, HTTPS)

1. הירשם ב-[vercel.com](https://vercel.com) (או התחבר עם GitHub).
2. **פעם אחת** – התחברות מהטרמינל:
   ```bash
   npx vercel login
   ```
3. **העלאה לאוויר** (מתיקיית הפרויקט):
   ```bash
   npm run deploy
   ```
   זה יבנה את האתר ויעלה ל-Vercel. בפעם הראשונה יישאלו שאלות (שם פרויקט וכו') – אפשר לאשר עם Enter. בסוף יופיע קישור לאתר (למשל `https://situaition-war-xxx.vercel.app`).
4. **עדכון גרסה** – אחרי שינויים בקוד:
   ```bash
   npm run deploy
   ```
5. משתני סביבה: אם יש Firebase, הוסף ב-Vercel Dashboard → Project → Settings → Environment Variables את כל ה-`VITE_FIREBASE_*` מ-`.env.example`.

### אופציה 2: Firebase Hosting

1. התקנה:
   ```bash
   npm i -g firebase-tools
   firebase login
   ```
2. קישור לפרויקט (פעם אחת):
   ```bash
   firebase use --add
   ```
   בחר את פרויקט ה-Firebase שלך.
3. בנייה ופריסה:
   ```bash
   npm run build
   firebase deploy --only hosting
   ```
4. כתובת האתר תופיע בטרמינל (במתחם `*.web.app` או `*.firebaseapp.com`).

---

## בדיקה אחרי פריסה

- [ ] נכנסים לכתובת האתר – הדף נטען.
- [ ] התחברות/הרשמה (או מצב דמו) עובדת.
- [ ] יצירת מעגל והצטרפות עם קוד עובדות.
- [ ] סימון "בטוח" / "עדיין לא" / SOS מתעדכן.
- [ ] מוקדי חירום (חיוג) עובדים.
- [ ] בדפדפן: F12 → Console – אין שגיאות אדומות.

---

## שרת גיבוי / זמינות

- **Vercel** – CDN גלובלי, זמינות גבוהה; גיבוי קוד ב-Git.
- **Firebase Hosting** – גם CDN; גיבוי נתונים דרך Firestore Export (כנ"ל).
- מומלץ: קוד ב-Git (גיבוי + היסטוריה), ופעם בכמה זמן Export ל-Firestore אם משתמשים בו.
