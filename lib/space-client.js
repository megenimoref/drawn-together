/* ---------- עוזרי לקוח ל-editToken (מפתח העריכה של הלוח) ----------
   הטוקן מגיע בפרמטר ‎?edit=‎ שבקישור הפרטי, ונשמר ב-localStorage למכשיר,
   כך שאחרי כניסה ראשונה הבעלים ממשיך לערוך גם בלי הטוקן ב-URL.
   מי שפותח את ‎/c/<space>‎ בלי הטוקן (קישור שיתוף) — במצב צפייה בלבד. */
export function readEditToken(space) {
  if (typeof window === 'undefined' || !space) return '';
  const key = 'dt:edit:' + space;
  try {
    const fromUrl = new URLSearchParams(window.location.search).get('edit');
    if (fromUrl) {
      try { localStorage.setItem(key, fromUrl); } catch {}
      return fromUrl;
    }
    return localStorage.getItem(key) || '';
  } catch {
    return '';
  }
}
