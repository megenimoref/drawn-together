import { handleUpload } from '@vercel/blob/client';
import { isAllowedUploadPath } from '../../../lib/paths';

/* מנפיק אישור העלאה ישירה מהדפדפן ל-Vercel Blob -
   כך קבצים עד 15MB עוקפים את מגבלת גוף הבקשה של הפונקציות.

   במודל האישי אין סיסמת ניהול — המפתח הוא הקישור (ה-space) עצמו.
   לכן כאן רק מוודאים שהנתיב תקין ומתחיל ב-submissions/<space>/ או published/<space>/,
   ומגבילים סוגי קבצים וגודל. */
export async function POST(request) {
  const body = await request.json();
  try {
    const json = await handleUpload({
      body,
      request,
      onBeforeGenerateToken: async (pathname) => {
        if (!isAllowedUploadPath(pathname)) {
          throw new Error('נתיב העלאה לא מורשה');
        }
        const isPublished = pathname.startsWith('published/');
        return {
          allowedContentTypes: isPublished
            ? ['video/mp4', 'video/webm']
            : [
                'image/jpeg', 'image/png', 'image/webp',
                'audio/mpeg', 'audio/mp4', 'audio/webm', 'audio/wav', 'audio/ogg', 'audio/aac', 'audio/x-m4a'
              ],
          maximumSizeInBytes: 15 * 1024 * 1024,
          addRandomSuffix: true
        };
      },
      onUploadCompleted: async () => {}
    });
    return Response.json(json);
  } catch (err) {
    return Response.json({ error: String(err?.message || err) }, { status: 400 });
  }
}
