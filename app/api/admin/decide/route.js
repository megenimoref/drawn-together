import { readJson, writeJson, isAdmin, unauthorized } from '../../../../lib/server';

export const dynamic = 'force-dynamic';

/* דחיית הגשה. שיבוץ ואישור מטופלים כעת ב-/api/admin/move כדי שההחלפה
   בין הגשה חדשה לחודש תפוס לא תשאיר את הישן יתום. */
export async function POST(request) {
  if (!isAdmin(request)) return unauthorized();
  try {
    const { id, action } = await request.json();
    if (action !== 'reject') {
      return Response.json({ error: 'פעולה לא נתמכת - יש להשתמש ב-/api/admin/move' }, { status: 400 });
    }
    const path = 'data/submissions/' + id + '.json';
    const sub = await readJson(path, null);
    if (!sub) return Response.json({ error: 'הגשה לא נמצאה' }, { status: 404 });
    sub.status = 'rejected';
    await writeJson(path, sub);
    return Response.json({ ok: true });
  } catch (err) {
    return Response.json({ error: String(err?.message || err) }, { status: 500 });
  }
}
