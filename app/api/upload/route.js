import { promises as fs } from 'fs';
import path from 'path';
import { isAllowedUploadPath } from '../../../lib/paths';
import { isEditor } from '../../../lib/auth';

export const dynamic = 'force-dynamic';

const DATA_DIR = process.env.DATA_DIR || path.join(process.cwd(), '.data');
const MAX_BYTES = 15 * 1024 * 1024; /* 15MB — תואם למגבלת nginx client_max_body_size */

/* מקבל קובץ (multipart/form-data) מהדפדפן וכותב אותו לדיסק תחת $DATA_DIR/media/<pathname>.
   nginx מגיש את media/ ישירות (מהיר, בלי לעבור דרך Node). מחזיר { url }.

   הרשאות: העלאה היא פעולת עריכה — דורשת editToken תקין של אותו space.
   הנתיב חייב להיות submissions/<space>/… או published/<space>/…  (isAllowedUploadPath). */
export async function POST(request) {
  try {
    const form = await request.formData();
    const pathname = String(form.get('pathname') || '');
    const token = String(form.get('token') || '');
    const file = form.get('file');

    if (!isAllowedUploadPath(pathname)) {
      return Response.json({ error: 'נתיב העלאה לא מורשה' }, { status: 400 });
    }
    const space = (pathname.match(/^(?:submissions|published)\/([a-z0-9-]{6,64})\//) || [])[1];
    if (!(await isEditor(space, token))) {
      return Response.json({ error: 'נדרשת הרשאת עריכה' }, { status: 401 });
    }
    if (!file || typeof file.arrayBuffer !== 'function') {
      return Response.json({ error: 'לא צורף קובץ' }, { status: 400 });
    }

    const buf = Buffer.from(await file.arrayBuffer());
    if (buf.length === 0) return Response.json({ error: 'הקובץ ריק' }, { status: 400 });
    if (buf.length > MAX_BYTES) return Response.json({ error: 'הקובץ גדול מדי (מקסימום 15MB)' }, { status: 413 });

    /* שכבת הגנה שנייה מפני path-traversal, מעבר ל-isAllowedUploadPath */
    const base = path.resolve(DATA_DIR, 'media');
    const full = path.resolve(base, pathname);
    if (full !== base && !full.startsWith(base + path.sep)) {
      return Response.json({ error: 'נתיב לא חוקי' }, { status: 400 });
    }

    await fs.mkdir(path.dirname(full), { recursive: true });
    await fs.writeFile(full, buf);

    return Response.json({ url: '/media/' + pathname });
  } catch (err) {
    return Response.json({ error: String(err?.message || err) }, { status: 500 });
  }
}
