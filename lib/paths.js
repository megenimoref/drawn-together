/* ---------- הפרדת נתונים לכל "מרחב" (space) — לוח פרטי אחד לכל משפחה ----------
   כל הנתיבים ב-Blob מקבלים קידומת של ה-space, כך שאותו קוד מגיש אינסוף לוחות
   בלי לשכפל קוד ובלי deploy נפרד. ה-space נגזר מה-URL (‎/c/<space>‎). */

/* space id בטוח: אותיות קטנות, ספרות ומקף בלבד, 6–64 תווים.
   מונע path-traversal ל-Blob (אין '/', '..'). מחזיר null אם לא תקין.
   crypto.randomUUID() עומד בתבנית הזו (הקסה + מקפים, 36 תווים). */
export function sanitizeSpace(raw) {
  const s = String(raw || '').trim().toLowerCase();
  return /^[a-z0-9-]{6,64}$/.test(s) ? s : null;
}

/* נתיבי ה"מסד" הפר-מרחביים */
export const dataIndex = (space) => `data/${space}/index.json`;
export const dataSub = (space, id) => `data/${space}/submissions/${id}.json`;
export const dataMeta = (space) => `data/${space}/meta.json`;

/* אינדקס שחזור לפי מייל (hash) — ממפה מייל → רשימת המרחבים שלו */
export const recoveryPath = (emailHash) => `data/recovery/${emailHash}.json`;

/* קידומות של קבצי מדיה (הלקוח בונה מהן את נתיב ההעלאה הישירה ל-Blob) */
export const submissionMediaPrefix = (space, id) => `submissions/${space}/${id}`;
export const publishedMediaPrefix = (space, id) => `published/${space}/${id}`;

/* בדיקת חוקיות של נתיב העלאה שהגיע מהלקוח (ב-/api/upload).
   מוודא שהוא מתחיל ב-submissions/<space>/ או published/<space>/ עם space תקין. */
export function isAllowedUploadPath(pathname) {
  const m = String(pathname || '').match(/^(submissions|published)\/([a-z0-9-]{6,64})\//);
  return !!m;
}
