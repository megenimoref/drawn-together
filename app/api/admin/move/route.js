import { readJson, writeJson, isAdmin, unauthorized } from '../../../../lib/server';

export const dynamic = 'force-dynamic';

/* פעולות שיבוץ פר-יום:
   - move:   מעביר הגשה לצירוף (חודש, יום). אם היעד תפוס - מבצע החלפה.
   - unassign: מוריד את השיבוץ ומחזיר את ההגשה למצב "ממתין".
   מקור אמת יחיד: קבצי ההגשות. /api/months מגזר מהם את הלוח הציבורי.
   וידאו מונפש נשמר על ההגשה עצמה (sub.videoUrl) ונע איתה. */

export async function POST(request) {
  if (!isAdmin(request)) return unauthorized();
  try {
    const { action, id, toMonth, toDay, videoUrl, clearVideo } = await request.json();

    if (action === 'unassign') {
      const path = 'data/submissions/' + id + '.json';
      const sub = await readJson(path, null);
      if (!sub) return Response.json({ error: 'הגשה לא נמצאה' }, { status: 404 });
      sub.month = null;
      sub.day = null;
      sub.status = 'pending';
      await writeJson(path, sub);
      return Response.json({ ok: true });
    }

    if (action === 'move') {
      if (!toMonth) return Response.json({ error: 'חסר חודש יעד' }, { status: 400 });
      if (!toDay) return Response.json({ error: 'חסר יום יעד' }, { status: 400 });
      const dayNum = Number(toDay);
      if (!Number.isInteger(dayNum) || dayNum < 1 || dayNum > 30) {
        return Response.json({ error: 'יום לא תקין' }, { status: 400 });
      }

      const path = 'data/submissions/' + id + '.json';
      const sub = await readJson(path, null);
      if (!sub) return Response.json({ error: 'הגשה לא נמצאה' }, { status: 404 });

      const alreadyHere = sub.month === toMonth && Number(sub.day) === dayNum;
      if (alreadyHere && !videoUrl && !clearVideo) return Response.json({ ok: true });

      const fromMonth = sub.month || null;
      const fromDay = sub.day ? Number(sub.day) : null;

      /* מוצאים אם יש הגשה משובצת ליום היעד - כדי להחליף. */
      const index = await readJson('data/index.json', []);
      let occupantId = null;
      for (const otherId of index) {
        if (otherId === id) continue;
        const other = await readJson('data/submissions/' + otherId + '.json', null);
        if (other && other.status === 'approved' && other.month === toMonth && Number(other.day) === dayNum) {
          occupantId = otherId;
          break;
        }
      }

      if (occupantId) {
        const occPath = 'data/submissions/' + occupantId + '.json';
        const occ = await readJson(occPath, null);
        if (occ) {
          if (fromMonth && fromDay) {
            /* החלפה: התופס עובר ל(חודש, יום) שממנו יצאה ההגשה שנגררה. */
            occ.month = fromMonth;
            occ.day = fromDay;
            occ.status = 'approved';
          } else {
            /* המקור בא מהממתינות - התופס חוזר לממתין. */
            occ.month = null;
            occ.day = null;
            occ.status = 'pending';
          }
          await writeJson(occPath, occ);
        }
      }

      sub.month = toMonth;
      sub.day = dayNum;
      sub.status = 'approved';
      if (clearVideo) sub.videoUrl = null;
      else if (videoUrl) sub.videoUrl = videoUrl;
      await writeJson(path, sub);
      return Response.json({ ok: true });
    }

    return Response.json({ error: 'פעולה לא מוכרת' }, { status: 400 });
  } catch (err) {
    return Response.json({ error: String(err?.message || err) }, { status: 500 });
  }
}
