import { put } from '@vercel/blob';
import { createHash } from 'crypto';

/* ---------- "מסד נתונים" מבוסס Vercel Blob ----------
   בהיקף של הפרויקט (עשרות הגשות, מנהל אחד) זה פתרון פשוט ואמין
   שלא דורש הקמת מסד נתונים. */

/* גוזר את כתובת הבסיס של ה-Blob store מתוך הטוקן —
   הפורמט: vercel_blob_rw_<STOREID>_<random>, וה-URL הציבורי:
   https://<storeid-lowercase>.public.blob.vercel-storage.com
   אפשר לעקוף עם BLOB_BASE_URL אם הפורמט ישתנה בעתיד. */
let cachedBlobBase = null;
function blobBaseUrl() {
  if (cachedBlobBase) return cachedBlobBase;
  const explicit = process.env.BLOB_BASE_URL;
  if (explicit) { cachedBlobBase = explicit.replace(/\/$/, ''); return cachedBlobBase; }
  const token = process.env.BLOB_READ_WRITE_TOKEN || '';
  const m = token.match(/^vercel_blob_rw_([A-Za-z0-9]+)_/);
  if (m) {
    cachedBlobBase = 'https://' + m[1].toLowerCase() + '.public.blob.vercel-storage.com';
    return cachedBlobBase;
  }
  return null;
}

/* קריאה ב-fetch ישיר על ה-URL הדטרמיניסטי (writeJson משתמש ב-addRandomSuffix:false).
   בלי list() — שנחשב Advanced Operation בתמחור Vercel Blob עם מכסה חודשית קטנה בחינמי.
   GET רגיל על URL ציבורי לא נספר במכסה הזו. */
export async function readJson(pathname, fallback) {
  try {
    const base = blobBaseUrl();
    if (!base) return fallback;
    const res = await fetch(base + '/' + pathname + '?_ts=' + Date.now(), {
      cache: 'no-store',
      headers: { 'Cache-Control': 'no-cache' }
    });
    if (!res.ok) return fallback; /* 404 = הקובץ עוד לא נוצר */
    return await res.json();
  } catch {
    return fallback;
  }
}

export async function writeJson(pathname, data) {
  await put(pathname, JSON.stringify(data, null, 2), {
    access: 'public',
    addRandomSuffix: false,
    allowOverwrite: true,
    contentType: 'application/json'
  });
}

/* ---------- הרשאת מנהל ----------
   סיסמה אחת (משתנה סביבה ADMIN_PASSWORD) → עוגיה עם hash שלה. */

export function hashPassword(pw) {
  return createHash('sha256').update(String(pw)).digest('hex');
}

export function isAdmin(request) {
  const pw = process.env.ADMIN_PASSWORD;
  if (!pw) return false;
  const cookie = request.cookies.get('dt_admin');
  return !!cookie && cookie.value === hashPassword(pw);
}

export function unauthorized() {
  return Response.json({ error: 'לא מורשה' }, { status: 401 });
}
