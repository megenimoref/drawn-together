import { readJson } from '../../../lib/server';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

/* מחזיר את מה שפורסם ללוח (ציבורי - ללא פרטי הורים).
   מקור אמת יחיד: קבצי ההגשות. מבנה: { monthId: { dayNumber: art } }. */
export async function GET() {
  const index = await readJson('data/index.json', []);
  /* קריאה מקבילה של כל ההגשות במקום סדרתית — משדרג ~N*500ms → ~500ms כולל. */
  const subs = await Promise.all(
    index.map((id) => readJson('data/submissions/' + id + '.json', null))
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
