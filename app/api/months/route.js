import { readJson } from '../../../lib/server';
import { dataIndex, dataSub, sanitizeSpace } from '../../../lib/paths';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

/* מחזיר את מה שפורסם ללוח של space מסוים (ציבורי — ללא פרטי הורים).
   מקור אמת יחיד: קבצי ההגשות של אותו space. מבנה: { monthId: { dayNumber: art } }. */
export async function GET(request) {
  const space = sanitizeSpace(new URL(request.url).searchParams.get('space'));
  if (!space) return Response.json({ error: 'מזהה לוח לא תקין' }, { status: 400 });

  const index = await readJson(dataIndex(space), []);
  /* קריאה מקבילה של כל ההגשות במקום סדרתית — משדרג ~N*500ms → ~500ms כולל. */
  const subs = await Promise.all(
    index.map((id) => readJson(dataSub(space, id), null))
  );

  const published = {};
  for (const s of subs) {
    if (!s) continue;
    if (s.status !== 'approved' || !s.month || !s.day) continue;
    const day = Number(s.day);
    if (!Number.isInteger(day)) continue;
    if (!published[s.month]) published[s.month] = {};
    const videoUrl = s.videoUrl || null;
    published[s.month][day] = {
      title: '״' + s.artTitle + '״',
      child: s.childName + ', גיל ' + s.age,
      dedication: s.dedication,
      mediaType: videoUrl ? 'video' : 'image',
      artUrl: videoUrl || s.artUrl,
      thumbUrl: s.artUrl,
      voiceUrl: s.voiceUrl || null
    };
  }
  const res = Response.json(published);
  res.headers.set('Cache-Control', 'no-store, no-cache, must-revalidate, max-age=0');
  return res;
}
