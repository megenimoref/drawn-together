/* ---------- העלאת מדיה מהדפדפן ----------
   מחליף את ההעלאה הישירה ל-Vercel Blob: שולח את הקובץ (Blob) ל-/api/upload
   כ-multipart, השרת כותב אותו לדיסק ומחזיר { url } (נתיב יחסי תחת /media).
   token = editToken של הלוח (פעולת עריכה). */
export async function uploadFile(pathname, blob, token, filename) {
  const fd = new FormData();
  fd.append('pathname', pathname);
  fd.append('token', token || '');
  fd.append('file', blob, filename || pathname.split('/').pop());
  const r = await fetch('/api/upload', { method: 'POST', body: fd });
  if (!r.ok) {
    const j = await r.json().catch(() => ({}));
    throw new Error(j.error || 'ההעלאה נכשלה');
  }
  return await r.json(); /* { url } */
}
