import { randomUUID } from 'crypto';
import { readJson, writeJson, sha256hex } from '../../../lib/server';
import { dataMeta, dataIndex, recoveryPath, sanitizeSpace } from '../../../lib/paths';

export const dynamic = 'force-dynamic';

/* יוצר לוח (space) חדש. ה-id נוצר בצד הלקוח (crypto.randomUUID) — אקראי ולא ניתן לניחוש.
   מייל אופציונלי נשמר לאינדקס שחזור, כדי שאפשר יהיה לשלוח את הקישור שוב אם אבד. */
export async function POST(request) {
  try {
    const b = await request.json();
    const space = sanitizeSpace(b.space);
    if (!space) return Response.json({ error: 'מזהה לוח לא תקין' }, { status: 400 });

    const name = String(b.name || 'הלוח שלי').slice(0, 80).trim() || 'הלוח שלי';
    const email = b.email ? String(b.email).slice(0, 120).trim().toLowerCase() : null;

    /* אם כבר קיים — לא דורסים (idempotent), מחזירים את הטוקן הקיים */
    const existing = await readJson(dataMeta(space), null);
    if (existing) return Response.json({ ok: true, already: true, editToken: existing.editToken });

    /* editToken = מפתח העריכה הסודי. נשמר ב-meta, מוחזר ללקוח לבניית הקישור הפרטי. */
    const editToken = randomUUID();
    const createdAt = new Date().toISOString();
    await writeJson(dataMeta(space), { space, name, email, editToken, createdAt });
    await writeJson(dataIndex(space), []);

    /* אינדקס שחזור לפי מייל (hash של המייל — לא שומרים מייל גולמי בשם הקובץ) */
    if (email && email.includes('@')) {
      const h = sha256hex(email);
      const rec = await readJson(recoveryPath(h), { spaces: [] });
      if (!Array.isArray(rec.spaces)) rec.spaces = [];
      if (!rec.spaces.some((s) => s.space === space)) {
        rec.spaces.unshift({ space, name, createdAt });
      }
      await writeJson(recoveryPath(h), rec);
    }

    return Response.json({ ok: true, editToken });
  } catch (err) {
    return Response.json({ error: String(err?.message || err) }, { status: 500 });
  }
}
