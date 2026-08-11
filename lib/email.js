/* ---------- שליחת מייל שחזור קישורים — אופציונלי ולייט ----------
   מטרה: משפחה שאיבדה את הקישור ללוח שלה תוכל לקבל אותו שוב למייל.

   אם RESEND_API_KEY ו-RECOVERY_EMAIL_FROM מוגדרים — שולח דרך Resend REST API
   (בלי SDK / תלות npm נוספת, רק fetch). אם לא — מחזיר not-configured,
   וה-UI מסביר למשתמש להשתמש בקישור השמור / ברשימה שבמכשיר. */

export function isEmailConfigured() {
  return !!(process.env.RESEND_API_KEY && process.env.RECOVERY_EMAIL_FROM);
}

export async function sendRecoveryEmail(to, links) {
  const key = process.env.RESEND_API_KEY;
  const from = process.env.RECOVERY_EMAIL_FROM;
  if (!key || !from) return { sent: false, reason: 'not-configured' };

  const items = links
    .map((l) => `<li style="margin:8px 0"><a href="${l.url}">${escapeHtml(l.name || l.url)}</a></li>`)
    .join('');
  const html = `<div dir="rtl" style="font-family:Arial,Helvetica,sans-serif;line-height:1.6;color:#222">
    <h2 style="margin:0 0 8px">הקישורים ללוחות שלך 🧡</h2>
    <p>אלה הלוחות שיצרת ב״לוח תשפ״ז״. שמרו את הקישורים במקום בטוח — הם המפתח היחיד ללוח:</p>
    <ul style="padding-inline-start:20px">${items}</ul>
    <p style="color:#666;font-size:.9em">מרכז ״מגנים על העורף״ · מחוז חיפה</p>
  </div>`;

  try {
    const res = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: { Authorization: `Bearer ${key}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({
        from,
        to,
        subject: 'הקישורים ללוחות שלך — לוח תשפ״ז',
        html
      })
    });
    if (!res.ok) return { sent: false, reason: 'send-failed' };
    return { sent: true };
  } catch {
    return { sent: false, reason: 'send-failed' };
  }
}

function escapeHtml(s) {
  return String(s)
    .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;').replace(/'/g, '&#39;');
}
