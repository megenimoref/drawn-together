import { readJson, writeJson } from '../../../../lib/server';
import { dataSub, sanitizeSpace } from '../../../../lib/paths';

export const dynamic = 'force-dynamic';

/* דחיית/הסרת הגשה מתוך space. שיבוץ ואישור מטופלים ב-/api/board/move
   כדי שההחלפה בין הגשה חדשה ליום תפוס לא תשאיר את הישן יתום. */
export async function POST(request) {
  try {
    const { space: rawSpace, id, action } = await request.json();
    const space = sanitizeSpace(rawSpace);
    if (!space) return Response.json({ error: 'מזהה לוח לא תקין' }, { status: 400 });
    if (action !== 'reject') {
      return Response.json({ error: 'פעולה לא נתמכת - יש להשתמש ב-/api/board/move' }, { status: 400 });
    }
    const path = dataSub(space, id);
    const sub = await readJson(path, null);
    if (!sub) return Response.json({ error: 'הגשה לא נמצאה' }, { status: 404 });
    sub.status = 'rejected';
    await writeJson(path, sub);
    return Response.json({ ok: true });
  } catch (err) {
    return Response.json({ error: String(err?.message || err) }, { status: 500 });
  }
}
