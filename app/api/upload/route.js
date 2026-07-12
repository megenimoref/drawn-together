import { handleUpload } from '@vercel/blob/client';

/* מנפיק אישור העלאה ישירה מהדפדפן ל-Vercel Blob -
   כך קבצים עד 15MB עוקפים את מגבלת גוף הבקשה של הפונקציות. */
export async function POST(request) {
  const body = await request.json();
  try {
    const json = await handleUpload({
      body,
      request,
      onBeforeGenerateToken: async () => ({
        allowedContentTypes: [
          'image/jpeg', 'image/png', 'image/webp',
          'audio/mpeg', 'audio/mp4', 'audio/webm', 'audio/wav', 'audio/ogg', 'audio/aac', 'audio/x-m4a',
          'video/mp4', 'video/webm'
        ],
        maximumSizeInBytes: 15 * 1024 * 1024,
        addRandomSuffix: true
      }),
      onUploadCompleted: async () => {}
    });
    return Response.json(json);
  } catch (err) {
    return Response.json({ error: String(err?.message || err) }, { status: 400 });
  }
}
