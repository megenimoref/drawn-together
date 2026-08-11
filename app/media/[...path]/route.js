import { promises as fs } from 'fs';
import path from 'path';

export const dynamic = 'force-dynamic';

const DATA_DIR = process.env.DATA_DIR || path.join(process.cwd(), '.data');

/* fallback להגשת מדיה מהדיסק. בפרודקשן nginx מיירט את /media/ ומגיש אותו ישירות
   (מהיר, תומך Range), כך שהמסלול הזה לא נקרא. אבל בפיתוח מקומי (בלי nginx) —
   או אם מריצים את ה-container לבד — האפליקציה עדיין מגישה את הקבצים בעצמה. */
const TYPES = {
  '.webp': 'image/webp', '.jpg': 'image/jpeg', '.jpeg': 'image/jpeg', '.png': 'image/png', '.gif': 'image/gif',
  '.webm': 'video/webm', '.mp4': 'video/mp4',
  '.opus': 'audio/ogg', '.ogg': 'audio/ogg', '.mp3': 'audio/mpeg', '.m4a': 'audio/mp4', '.wav': 'audio/wav', '.aac': 'audio/aac'
};

export async function GET(_req, { params }) {
  const parts = (await params).path || [];
  const base = path.resolve(DATA_DIR, 'media');
  const full = path.resolve(base, parts.join('/'));
  if (full !== base && !full.startsWith(base + path.sep)) {
    return new Response('bad path', { status: 400 });
  }
  try {
    const buf = await fs.readFile(full);
    const ext = path.extname(full).toLowerCase();
    return new Response(new Uint8Array(buf), {
      headers: {
        'Content-Type': TYPES[ext] || 'application/octet-stream',
        'Cache-Control': 'public, max-age=604800'
      }
    });
  } catch {
    return new Response('not found', { status: 404 });
  }
}
