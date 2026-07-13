# לוח תשפ"ז - Drawn Together (גרסת Next.js)

## מדריך התקנה ופריסה - מהמחשב שלך ועד vercel.app

הפרויקט: לוח שנה דיגיטלי + טופס הגשה להורים + מסך ניהול לצוות.
הורה מגיש → ההגשה נשמרת → הצוות מאשר במסך הניהול → הציור עולה ללוח אוטומטית.

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

### סיסמת מסך הניהול (חובה! פעם אחת):

5. Settings → Environment Variables → מוסיפים:
   Name: ADMIN_PASSWORD
   Value: סיסמה חזקה שתבחרו (זו הכניסה של הצוות ל-/admin)
6. Deployments → ⋯ על הפריסה האחרונה → Redeploy
   (משתני סביבה נטענים רק בפריסה חדשה).

### מרגע זה:

- הלוח: https://<שם-הפרויקט>.vercel.app
- טופס הורים: https://<שם-הפרויקט>.vercel.app/submit
- מסך ניהול: https://<שם-הפרויקט>.vercel.app/admin

כל עדכון עתידי = git push, ו-Vercel פורס אוטומטית לאותה כתובת.
עם Claude Code: "תעדכן את האתר" → הוא עושה commit+push וזה באוויר.

---

## בדיקת קצה-לקצה לפני פרסום להורים (חובה!)

1. גשו ל-/submit, מלאו הגשת בדיקה עם ציור והקלטה אמיתיים.
2. גשו ל-/admin, התחברו עם ADMIN_PASSWORD - ההגשה צריכה להופיע בבנק הממתינות (📥).
3. גררו את הכרטיס על יום בלוח (או לחצו על יום ריק ובחרו "שיבוץ לכאן").
4. חזרו ללוח הציבורי - הציור צריך להופיע באותו יום, כולל הקול.
5. בדקו גם את /print - הציור אמור להופיע בדף החודש עם QR.
6. רק אם כל זה עבד - מפיצים את הקישור להורים.

---

## איך זה עובד מבפנים (למי שמתחזק)

- app/page.js הלוח הציבורי (שער עם מוזאיקת חודשים + תצוגת חודש, שיבוץ פר-יום)
- app/submit/page.js טופס ההורים (המרה ל-WebP/Opus בדפדפן + העלאה ישירה ל-Blob)
- app/admin/page.js מסך הניהול (שיבוץ ליום בגרירה/קליק, וידאו מונפש, בנק ממתינות)
- app/print/page.js גרסת הדפסה / PDF עם QR לכל חודש
- app/api/… צד השרת (קליטה, שיבוץ/העברה/הסרה, הרשאות)
- lib/months.js מטא-נתונים של 13 החודשים (חגים, גוונים, מהות)
- lib/server.js קריאה/כתיבה ל-Blob + אימות מנהל
- lib/media-client.js המרות מדיה בדפדפן (WebP / Opus / WebM)

מודל הנתונים: השיבוץ הוא פר-יום - כל יום בחודש יכול לשאת ציור אחד.
מקור אמת יחיד: קבצי ההגשות; /api/months נגזר מהם בכל קריאה.

הנתונים נשמרים ב-Vercel Blob:

- data/index.json רשימת מזהי ההגשות
- data/submissions/<id>.json כל הגשה (סטטוס, חודש+יום, videoUrl, פרטי הורה)
- submissions/<id>/… קבצי הציור וההקלטה (מההורים)
- published/<id>/… וידאו מונפש שהועלה ע"י הצוות (מוגן בהרשאת ניהול)

חיסכון בעלויות: קריאות Blob נעשות ב-fetch ישיר על URL דטרמיניסטי,
בלי list() שנחשב Advanced Operation (מכסה של 2,000/חודש בחינמי).

וידאו מונפש: במסך הניהול, בפאנל עריכת יום משובץ, מצרפים mp4/webm -
הוא מומר ל-WebM חסכוני בדפדפן ומחליף את התמונה הסטטית בלוח.

---

## הרצה מקומית מלאה (אופציונלי, למפתחים)

כדי שהטופס והניהול יעבדו גם ב-localhost:
צרו קובץ .env.local בתיקיית הפרויקט עם:

```
BLOB_READ_WRITE_TOKEN=<מעתיקים מ-Vercel: Storage → Blob → .env.local>
ADMIN_PASSWORD=<אותה סיסמה>
NEXT_PUBLIC_SITE_URL=<כתובת הפרודקשן, למשל https://drawn-together-henna.vercel.app>
```

חשוב: את NEXT_PUBLIC_SITE_URL צריך להגדיר גם ב-Vercel
(Settings → Environment Variables) - קודי ה-QR והשיתוף מצביעים אליו.

הקובץ הזה לא עולה ל-git (מוגן ב-.gitignore).
הערה: העלאה ישירה מהדפדפן ל-Blob בסביבת localhost עשויה לדרוש
tunnel (למשל ngrok) בגלל callback - בפועל הכי פשוט לבדוק על Vercel.

---

## חשוב לפני השקה

1. תאריכי החגים ב-lib/months.js סומנו ידנית - לאמת מול לוח עברי רשמי!
2. ההגשות כוללות פרטים אישיים של קטינים והורים. הקבצים נשמרים
   ב-Vercel Blob עם כתובות אקראיות (לא ניתנות לניחוש), אבל מי שיש
   לו קישור יכול לצפות. מומלץ: לא להעביר קישורי הגשות הלאה,
   ולמחוק הגשות שנדחו. את נוסח האישורים כדאי להעביר ליועץ משפטי.
3. תשפ"ז שנה מעוברת - 13 חודשים (אדר א' + אדר ב').

בהצלחה! 🧡
