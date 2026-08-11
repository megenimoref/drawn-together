# לוח תשפ"ז - Drawn Together (גרסת Next.js)

## מדריך התקנה ופריסה - מהמחשב שלך ועד vercel.app

הפרויקט: לוחות שנה דיגיטליים **אישיים** — לוח פרטי לכל משפחה.

### מודל הלוחות האישיים (multi-tenant)
- אין עוד לוח ציבורי אחד וצוות מאשר. במקום זה: **קוד אחד מגיש אינסוף לוחות פרטיים**,
  כשכל לוח מזוהה ב-URL: `‎/c/<space>‎`, וכל הנתונים ב-Blob מקבלים קידומת של אותו `space`.
- **יצירה:** בעמוד הבית (`/`) לוחצים "יצירת לוח חדש" → נוצר `space` אקראי (crypto.randomUUID) →
  מקבלים קישור פרטי. **הקישור הוא המפתח היחיד — אין סיסמה ואין התחברות.**
- **שימוש עצמי:** המשפחה מוסיפה ציור (`/c/<space>/submit`) ומשבצת אותו ליום בעצמה
  במסך הניהול שלה (`/c/<space>/manage`) — בלי אישור צוות.
- **שחזור קישור אבוד:** רשימת הלוחות נשמרת ב-localStorage של המכשיר (עמוד הבית),
  ובנוסף מי שהשאיר מייל ביצירה יכול לקבל את הקישור שוב דרך `/recover` (דורש הגדרת מייל, ראו למטה).
- **פרטיות:** כל מי שמחזיק בקישור רואה **וגם עורך** את הלוח (כמו קישור-עריכה ב-Google Docs).
  לכן הקישורים אקראיים וארוכים, ו-`/c/` חסום לאינדוקס ב-robots.txt.

---

## שלב 1 - התקנה מקומית ב-C:\projects\drawn-together

דרישה חד-פעמית: Node.js מותקן (https://nodejs.org, גרסת LTS).

חלצו את ה-zip אל C:\projects כך שתיווצר C:\projects\drawn-together, ואז:

```
cd C:\projects\drawn-together
npm install
npm run dev
```

פתחו בדפדפן: http://localhost:3000 - הלוח רץ!
הערה: הטופס ומסך הניהול צריכים Vercel Blob, ולכן יעבדו במלואם
רק אחרי שלב 3 (או אחרי הגדרת משתני סביבה מקומיים - ראו בסוף).

---

## שלב 2 - העלאה ל-GitHub

בפעם הראשונה (אם אין עדיין git מוגדר):

```
git init
git add .
git commit -m "Drawn Together - loach tashpaz v2"
```

צרו ריפוזיטורי חדש ב-github.com (למשל: drawn-together, מומלץ Private), ואז:

```
git remote add origin https://github.com/<שם-המשתמש-שלכם>/drawn-together.git
git branch -M main
git push -u origin main
```

טיפ: אם עובדים עם Claude Code - אפשר פשוט לבקש ממנו
"תעלה את הפרויקט ל-GitHub" והוא יריץ את הפקודות (כולל gh auth login
עם אישור חד-פעמי בדפדפן).

---

## שלב 3 - פריסה ל-Vercel (האתר יקבל כתובת xxx.vercel.app)

1. נכנסים ל-vercel.com ומתחברים (הכי נוח: Continue with GitHub).
2. Add New → Project → Import → בוחרים את drawn-together.
3. לוחצים Deploy (אין צורך לשנות שום הגדרה - Vercel מזהה Next.js לבד).

### חיבור אחסון קבצים (חובה! פעם אחת):

4. בפרויקט ב-Vercel: לשונית Storage → Create Database → Blob → Create.
   זה מחבר אוטומטית את משתנה הסביבה BLOB_READ_WRITE_TOKEN.

### כתובת האתר (חובה! פעם אחת):

5. Settings → Environment Variables → מוסיפים:
   Name: NEXT_PUBLIC_SITE_URL
   Value: כתובת הפרודקשן (למשל https://drawn-together.vercel.app) — קודי ה-QR והשיתוף מצביעים אליה.
6. (אופציונלי) שחזור-קישור-במייל — ראו "שחזור במייל" בהמשך.
7. Deployments → ⋯ על הפריסה האחרונה → Redeploy
   (משתני סביבה נטענים רק בפריסה חדשה).

הערה: **אין יותר ADMIN_PASSWORD** — במודל האישי אין סיסמת צוות, הקישור הוא ההרשאה.

### מרגע זה:

- עמוד הבית (יצירת/מציאת לוח): https://<שם-הפרויקט>.vercel.app
- לוח פרטי: https://<שם-הפרויקט>.vercel.app/c/<space>
- הוספת ציור: https://<שם-הפרויקט>.vercel.app/c/<space>/submit
- ניהול הלוח: https://<שם-הפרויקט>.vercel.app/c/<space>/manage
- שחזור קישור: https://<שם-הפרויקט>.vercel.app/recover

כל עדכון עתידי = git push, ו-Vercel פורס אוטומטית לאותה כתובת.
עם Claude Code: "תעדכן את האתר" → הוא עושה commit+push וזה באוויר.

---

## בדיקת קצה-לקצה לפני פרסום (חובה!)

1. בעמוד הבית לחצו "יצירת לוח חדש" (אפשר להשאיר מייל לגיבוי) — תקבלו קישור פרטי. **שמרו אותו!**
2. היכנסו ל-`/c/<space>/submit`, מלאו הגשת בדיקה עם ציור והקלטה אמיתיים.
3. תועברו ל-`/c/<space>/manage` — ההגשה צריכה להופיע בבנק הממתינות (📥).
4. גררו את הכרטיס על יום בלוח (או לחצו על יום ריק ובחרו "שיבוץ לכאן").
5. חזרו ללוח (`/c/<space>`) — הציור צריך להופיע באותו יום, כולל הקול.
6. בדקו גם את `/c/<space>/print` — הציור אמור להופיע בדף החודש עם QR שמצביע ללוח הזה.

---

## איך זה עובד מבפנים (למי שמתחזק)

- app/page.js עמוד הבית — יצירת לוח חדש, רשימת הלוחות במכשיר (localStorage), קישור לשחזור
- app/recover/page.js שחזור קישור אבוד במייל
- app/c/[space]/page.js הלוח הפרטי (שער + תצוגת חודש, שיבוץ פר-יום)
- app/c/[space]/submit/page.js הוספת ציור (המרה ל-WebP/Opus בדפדפן + העלאה ישירה ל-Blob)
- app/c/[space]/manage/page.js ניהול הלוח (שיבוץ בגרירה/קליק, וידאו מונפש, בנק ממתינות) — בלי סיסמה
- app/c/[space]/print/page.js גרסת הדפסה / PDF עם QR לכל חודש
- app/api/space/route.js יצירת לוח (space) חדש + אינדקס שחזור לפי מייל
- app/api/recover/route.js שליחת הקישורים למייל (דרך Resend, אופציונלי)
- app/api/months, submit, upload, board/* צד השרת (קליטה, שיבוץ/העברה/הסרה) — פר-space
- lib/paths.js בניית נתיבי ה-Blob הפר-מרחביים + sanitizeSpace (מונע path-traversal)
- lib/server.js קריאה/כתיבה ל-Blob + hash למייל השחזור
- lib/email.js שליחת מייל שחזור (Resend REST, בלי SDK)
- lib/months.js מטא-נתונים של 13 החודשים (חגים, גוונים, מהות)
- lib/media-client.js המרות מדיה בדפדפן (WebP / Opus / WebM)

מודל הנתונים: השיבוץ הוא פר-יום - כל יום בחודש יכול לשאת ציור אחד.
מקור אמת יחיד: קבצי ההגשות; /api/months נגזר מהם בכל קריאה. **הכול פר-space.**

הנתונים נשמרים ב-Vercel Blob (‎<space>‎ = מזהה הלוח):

- data/<space>/meta.json פרטי הלוח (שם, מייל גיבוי, תאריך יצירה)
- data/<space>/index.json רשימת מזהי ההגשות של הלוח
- data/<space>/submissions/<id>.json כל הגשה (סטטוס, חודש+יום, videoUrl, פרטי הורה)
- submissions/<space>/<id>/… קבצי הציור וההקלטה
- published/<space>/<id>/… וידאו מונפש
- data/recovery/<emailHash>.json אינדקס שחזור: מייל (hash) → רשימת המרחבים שלו

חיסכון בעלויות: קריאות Blob נעשות ב-fetch ישיר על URL דטרמיניסטי,
בלי list() שנחשב Advanced Operation (מכסה של 2,000/חודש בחינמי).

---

## שחזור קישור במייל (אופציונלי)

כדי לאפשר למשפחה שאיבדה קישור לקבל אותו שוב דרך `/recover`, מגדירים ב-Vercel:

```
RESEND_API_KEY=<מפתח מ-resend.com>
RECOVERY_EMAIL_FROM=<כתובת שולח מאומתת בדומיין שלכם>
```

בלי המשתנים האלה — עמוד `/recover` פשוט יגיד "שחזור-במייל לא מופעל", והמשפחות
מסתמכות על הקישור השמור / רשימת הלוחות שבמכשיר. הרשמה ל-Resend חינמית לנפחים קטנים.

---

## הרצה מקומית מלאה (אופציונלי, למפתחים)

כדי שההגשה והניהול יעבדו גם ב-localhost:
צרו קובץ .env.local בתיקיית הפרויקט עם:

```
BLOB_READ_WRITE_TOKEN=<מעתיקים מ-Vercel: Storage → Blob → .env.local>
NEXT_PUBLIC_SITE_URL=<כתובת הפרודקשן, למשל https://drawn-together.vercel.app>
# אופציונלי לשחזור-במייל:
RESEND_API_KEY=<...>
RECOVERY_EMAIL_FROM=<...>
```

חשוב: את NEXT_PUBLIC_SITE_URL צריך להגדיר גם ב-Vercel
(Settings → Environment Variables) - קודי ה-QR והשיתוף מצביעים אליו.

הערה: **העלאה ישירה מהדפדפן ל-Blob בסביבת localhost עשויה לדרוש tunnel**
(למשל ngrok) בגלל callback - בפועל הכי פשוט לבדוק על פריסת Preview ב-Vercel
(כל PR מקבל preview משלו, ואם מחברים אליו Blob הכול עובד מקצה לקצה).

---

## חשוב לפני השקה

1. תאריכי החגים ב-lib/months.js סומנו ידנית - לאמת מול לוח עברי רשמי!
2. ההגשות כוללות פרטים אישיים של קטינים והורים. הקבצים נשמרים
   ב-Vercel Blob עם כתובות אקראיות (לא ניתנות לניחוש), אבל מי שיש
   לו קישור יכול לצפות. מומלץ: לא להעביר קישורי הגשות הלאה,
   ולמחוק הגשות שנדחו. את נוסח האישורים כדאי להעביר ליועץ משפטי.
3. תשפ"ז שנה מעוברת - 13 חודשים (אדר א' + אדר ב').

בהצלחה! 🧡
