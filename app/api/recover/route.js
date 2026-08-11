import { readJson, sha256hex } from '../../../lib/server';
import { recoveryPath } from '../../../lib/paths';
import { sendRecoveryEmail, isEmailConfigured } from '../../../lib/email';

export const dynamic = 'force-dynamic';

/* שחזור קישורים במייל: המשתמש מזין מייל, ואם רשומים לו לוחות — נשלח אליו הקישורים.
   הגנת פרטיות: לעולם לא מחזירים את הקישורים בגוף התשובה (רק למייל עצמו),
   וכשמייל מוגדר — התשובה אחידה בין "נמצא" ל"לא נמצא", כדי לא לחשוף אילו מיילים רשומים. */
export async function POST(request) {
  try {
    const { email } = await request.json();
    const clean = String(email || '').trim().toLowerCase();
    if (!clean || !clean.includes('@')) {
      return Response.json({ error: 'כתובת מייל לא תקינה' }, { status: 400 });
    }

    if (!isEmailConfigured()) {
      /* שחזור-במייל לא הופעל בסביבה הזו — ה-UI יסביר להשתמש בקישור השמור / ברשימת המכשיר. */
      return Response.json({ ok: true, sent: false, reason: 'not-configured' });
    }

    const siteBase = (process.env.NEXT_PUBLIC_SITE_URL || '').replace(/\/$/, '');
    const rec = await readJson(recoveryPath(sha256hex(clean)), null);
    const spaces = (rec && Array.isArray(rec.spaces)) ? rec.spaces : [];
    const links = spaces.map((s) => ({ name: s.name, url: `${siteBase}/c/${s.space}` }));

    if (links.length > 0) {
      await sendRecoveryEmail(clean, links);
    }
    /* תשובה אחידה — לא מסגירים אם נמצאו לוחות או לא */
    return Response.json({ ok: true, sent: true });
  } catch (err) {
    return Response.json({ error: String(err?.message || err) }, { status: 500 });
  }
}
