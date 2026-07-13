import { list, put } from '@vercel/blob';
import { createHash } from 'crypto';

/* ---------- "מסד נתונים" מבוסס Vercel Blob ----------
   בהיקף של הפרויקט (עשרות הגשות, מנהל אחד) זה פתרון פשוט ואמין
   שלא דורש הקמת מסד נתונים. */

export async function readJson(pathname, fallback) {
  try {
    const { blobs } = await list({ prefix: pathname });
    const b = blobs.find((x) => x.pathname === pathname);
    if (!b) return fallback;
    /* cache-buster: משתמשים ב-Date.now() בלבד (לא ב-uploadedAt) - כי list() עצמו עלול
       להחזיר מטא-דאטה ישן, מה שיגרום ל-fetch לפגוע ב-cache של CDN. */
    const sep = b.url.includes('?') ? '&' : '?';
    const res = await fetch(b.url + sep + '_ts=' + Date.now(), {
      cache: 'no-store',
      headers: { 'Cache-Control': 'no-cache' }
    });
    if (!res.ok) return fallback;
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
