import { readJson } from './server';
import { dataMeta } from './paths';

/* ---------- הרשאת עריכה (מפתח סודי) ----------
   בעל הלוח מזוהה ע"י editToken ששמור ב-meta של ה-space.
   הצפייה בלוח (‎/api/months‎) פתוחה לכל מי שיש לו את הקישור;
   רק פעולות עריכה וקריאת פרטי הורה (PII) דורשות את הטוקן —
   כך הקישור הרגיל ‎/c/<space>‎ בטוח לשיתוף כ"צפייה בלבד". */
export async function isEditor(space, token) {
  if (!space || !token) return false;
  const meta = await readJson(dataMeta(space), null);
  return !!(meta && meta.editToken && meta.editToken === token);
}
