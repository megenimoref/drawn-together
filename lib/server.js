import { promises as fs } from 'fs';
import path from 'path';
import { createHash } from 'crypto';

/* ---------- "מסד נתונים" מבוסס קבצים על דיסק מקומי ----------
   הנתונים נשמרים תחת DATA_DIR (ווליום של Docker, נשמר בין הפעלות).
   כל הנתיבים מקבלים קידומת של space (ראו lib/paths.js), כך שאותו קוד
   מגיש אינסוף לוחות בלי DB ובלי שירות אחסון חיצוני.
   מבנה על הדיסק:
     $DATA_DIR/data/<space>/…      — קבצי ה-JSON (הגשות, meta, אינדקס)
     $DATA_DIR/media/…             — הציורים/הקלטות/וידאו (מוגש ע"י nginx תחת /media) */

const DATA_DIR = process.env.DATA_DIR || path.join(process.cwd(), '.data');

/* מונע path-traversal אל מחוץ ל-DATA_DIR (space מסונן ב-sanitizeSpace, זו שכבה שנייה). */
function resolveInside(pathname) {
  const base = path.resolve(DATA_DIR);
  const full = path.resolve(base, pathname);
  if (full !== base && !full.startsWith(base + path.sep)) {
    throw new Error('נתיב לא חוקי');
  }
  return full;
}

export async function readJson(pathname, fallback) {
  try {
    const raw = await fs.readFile(resolveInside(pathname), 'utf8');
    return JSON.parse(raw);
  } catch {
    return fallback; /* הקובץ עוד לא נוצר, או JSON פגום → ברירת מחדל */
  }
}

export async function writeJson(pathname, data) {
  const full = resolveInside(pathname);
  await fs.mkdir(path.dirname(full), { recursive: true });
  /* כתיבה אטומית: קובץ זמני ואז rename, כדי שקריאה מקבילה לא תיתקל בקובץ חצי-כתוב. */
  const tmp = full + '.tmp-' + process.pid + '-' + Date.now();
  await fs.writeFile(tmp, JSON.stringify(data, null, 2), 'utf8');
  await fs.rename(tmp, full);
}

/* hash לצורך אינדקס שחזור לפי מייל — לא שומרים מייל גולמי בשם הקובץ */
export function sha256hex(s) {
  return createHash('sha256').update(String(s)).digest('hex');
}
