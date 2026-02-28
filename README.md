# מעגל בטוח

אפליקציה לבדיקה שכל החברים במעגל סימנו "בטוח" – עם אפשרות להתריע ולחייג למי שעדיין לא סימן.

## מה האפליקציה עושה

1. **התחברות** – התחברות עם אימייל וסיסמה (אימות עצמי). במצב דמו הנתונים נשמרים במכשיר.
2. **רשימת מעגלים** – כל משתמש יכול להחזיק כמה מעגלים: משפחה, חברים, עבודה, שכנים או שם מותאם.
3. **צור מעגל** – בחירת סוג המעגל (משפחה/חברים/עבודה/שכנים/אחר) ויצירת מעגל עם קוד הזמנה.
4. **הזמנת חברים** – שיתוף קישור או קוד; חברים מתחברים ומצטרפים למעגל.
5. **סימון "אני בטוח/ה"** – כל אחד סימן את עצמו במרחב מוגן.
6. **רואים מי סימן ומי לא** – רשימה מעודכנת: ירוק = בטוח (+ "לפני X דקות"), אדום = עדיין לא.
7. **עדכונים** – פיד עדכונים: מי סימן בטוח ומתי.
8. **התראה** – אם מישהו לא סימן, מופיעה התראה ברורה.
9. **חיוג** – לחברים עם טלפון יש כפתור "חייג".
10. **הוספה לפי טלפון** – להוסיף חבר עם שם וטלפון (בלי שיצטרף לאפליקציה).

## הרצה בלי Firebase (מצב דמו)

האפליקציה עובדת מיד **בלי הגדרות** – הנתונים נשמרים ב־localStorage במכשיר (מצב דמו).

```bash
npm install
npm run dev
```

פותחים בדפדפן את הכתובת שמופיעה (בדרך כלל http://localhost:5173).

## הרצה עם Firebase (שיתוף אמיתי בין מכשירים)

כדי שהמעגל יעבוד בין כמה אנשים (כולם רואים עדכונים באותו מעגל):

1. צור פרויקט ב־[Firebase Console](https://console.firebase.google.com/).
2. הפעל **Authentication** → Sign-in method → **Email/Password** (הפעל).
3. צור **Firestore Database** (במצב בדיקה או production עם כללים מתאימים).
4. הוסף אפליקציית Web והעתק את ה־config.
5. צור קובץ `.env` בתיקיית הפרויקט (בדומה ל־`.env.example`):

```env
VITE_FIREBASE_API_KEY=...
VITE_FIREBASE_AUTH_DOMAIN=...firebaseapp.com
VITE_FIREBASE_PROJECT_ID=...
VITE_FIREBASE_STORAGE_BUCKET=...appspot.com
VITE_FIREBASE_MESSAGING_SENDER_ID=...
VITE_FIREBASE_APP_ID=...
```

6. הרץ שוב: `npm run dev` או `npm run build` ואז הגש את תיקיית `dist`.

במצב הזה המעגל משותף בין כל מי שמצטרף עם אותו קוד.

## העלאה לאוויר (אוטומטית)

הפרויקט מוכן לפריסה אוטומטית ל-**GitHub Pages** – דחיפה ל־GitHub מעלה את האתר.

### 3 צעדים

1. **צור ריפו ב-GitHub**  
   [github.com/new](https://github.com/new) – שם למשל `situaition-war` (או כל שם).

2. **חבר ודחוף** (מתיקיית הפרויקט):
   ```bash
   git init
   git add .
   git commit -m "Initial: מעגל בטוח"
   git branch -M main
   git remote add origin https://github.com/YOUR_USERNAME/YOUR_REPO.git
   git push -u origin main
   ```
   החלף `YOUR_USERNAME` ו־`YOUR_REPO` בשם המשתמש ובשם הריפו שלך.

3. **הפעל GitHub Pages**  
   בריפו ב-GitHub: **Settings → Pages → Build and deployment → Source** = **GitHub Actions**.  
   אחרי הרצת ה-workflow (אוטומטית אחרי ה-push), האתר יהיה זמין ב:
   `https://YOUR_USERNAME.github.io/YOUR_REPO/`

### התקנה מקומית (פעם אחת)

```bash
npm run setup
```

זה יתקין תלויות, יבנה, ויצור `.env` מ־`.env.example` אם אין `.env`.

## בנייה לפריסה

```bash
npm run build
```

הקבצים ב־`dist/` מוכנים להעלאה לשרת או ל־GitHub Pages.

## התקנה כמען אפליקציה (PWA)

אחרי שתפרסם את האתר ב־HTTPS, בדפדפן במובייל אפשר לבחור "הוסף למסך הבית" – האפליקציה תיפתח במסך מלא כמו אפליקציה.
