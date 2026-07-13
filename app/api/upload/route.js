import { handleUpload } from '@vercel/blob/client';
import { isAdmin } from '../../../lib/server';

/* מנפיק אישור העלאה ישירה מהדפדפן ל-Vercel Blob -
   כך קבצים עד 15MB עוקפים את מגבלת גוף הבקשה של הפונקציות.

   הרשאות לפי נתיב:
   - submissions/  פתוח לציבור (טופס ההורים)
   - published/    מנהלים בלבד (וידאו מונפש)                     */
export async function POST(request) {
  const body = await request.json();
  const admin = isAdmin(request);
  try {
    const json = await handleUpload({
      body,
      request,
      onBeforeGenerateToken: async (pathname) => {
        const isSubmission = pathname.startsWith('submissions/');
        const isPublished = pathname.startsWith('published/');
        if (!isSubmission && !isPublished) {
          throw new Error('נתיב העלאה לא מורשה');
        }
        if (isPublished && !admin) {
          throw new Error('העלאה לאזור הפרסום דורשת הרשאת ניהול');
        }
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
