import { readJson, writeJson } from '../../../lib/server';
import { dataIndex, dataSub, dataMeta, sanitizeSpace } from '../../../lib/paths';

export const dynamic = 'force-dynamic';

export async function POST(request) {
  try {
    const b = await request.json();
    const space = sanitizeSpace(b.space);
    if (!space) return Response.json({ error: 'מזהה לוח לא תקין' }, { status: 400 });

    /* הלוח חייב להתקיים (נוצר דרך /api/space). מונע יצירת נתונים תחת space אקראי. */
    const meta = await readJson(dataMeta(space), null);
    if (!meta) return Response.json({ error: 'הלוח לא נמצא' }, { status: 404 });

    const required = ['id', 'childName', 'age', 'artTitle', 'dedication', 'parentName', 'phone', 'email', 'artUrl'];
    for (const k of required) {
      if (!b[k] || !String(b[k]).trim()) {
        return Response.json({ error: 'חסר שדה: ' + k }, { status: 400 });
      }
    }
    if (b.consentStore !== true || b.consentPublish !== true) {
      return Response.json({ error: 'נדרש אישור הורה מלא' }, { status: 400 });
    }
    const sub = {
      id: String(b.id),
      createdAt: new Date().toISOString(),
      childName: String(b.childName).slice(0, 60),
      age: String(b.age).slice(0, 3),
      artTitle: String(b.artTitle).slice(0, 120),
      dedication: String(b.dedication).slice(0, 400),
      parentName: String(b.parentName).slice(0, 80),
      phone: String(b.phone).slice(0, 30),
      email: String(b.email).slice(0, 120),
      artUrl: String(b.artUrl),
      voiceUrl: b.voiceUrl ? String(b.voiceUrl) : null,
      status: 'pending',
      month: null
    };
    await writeJson(dataSub(space, sub.id), sub);

    /* אינדקס הגשות פר-מרחב - רשימת מזהים אחת שקל לקרוא */
    const index = await readJson(dataIndex(space), []);
    if (!index.includes(sub.id)) index.unshift(sub.id);
    await writeJson(dataIndex(space), index);

    return Response.json({ ok: true });
  } catch (err) {
    return Response.json({ error: String(err?.message || err) }, { status: 500 });
  }
}
