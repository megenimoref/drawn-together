import { readJson } from '../../../../lib/server';
import { dataIndex, dataSub, sanitizeSpace } from '../../../../lib/paths';
import { isEditor } from '../../../../lib/auth';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

/* כל ההגשות של space מסוים (כולל פרטי הורה) — לשימוש מסך הניהול של אותו לוח.
   מכיל PII, ולכן דורש את מפתח העריכה (editToken) — לא נגיש למי שיש לו רק קישור צפייה. */
export async function GET(request) {
  const url = new URL(request.url);
  const space = sanitizeSpace(url.searchParams.get('space'));
  if (!space) return Response.json({ error: 'מזהה לוח לא תקין' }, { status: 400 });
  if (!(await isEditor(space, url.searchParams.get('edit')))) {
    return Response.json({ error: 'נדרשת הרשאת עריכה' }, { status: 401 });
  }

  const index = await readJson(dataIndex(space), []);
  /* קריאה מקבילה של כל ההגשות במקום סדרתית — משדרג ~N*500ms → ~500ms כולל. */
  const raw = await Promise.all(
    index.slice(0, 200).map((id) => readJson(dataSub(space, id), null))
  );
  const subs = raw.filter(Boolean);
  const res = Response.json(subs);
  res.headers.set('Cache-Control', 'no-store, no-cache, must-revalidate, max-age=0');
  return res;
}
