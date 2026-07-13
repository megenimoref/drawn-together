/* עוזרים ללקוח בלבד — משתמשים ב-Canvas, AudioContext ו-MediaRecorder של הדפדפן.
   שימוש אך ורק בקומפוננטות 'use client'. */

/* המרה של תמונה ל-WebP + הקטנה עד גודל מקסימלי, כדי לחסוך בשטח אחסון ובפס הרשת.
   opts: { maxDim=2048, quality=0.85 } */
export async function toWebp(file, opts = {}) {
  const { maxDim = 2048, quality = 0.85 } = opts;
  const img = await loadImage(file);

  let { naturalWidth: w, naturalHeight: h } = img;
  const longEdge = Math.max(w, h);
  if (longEdge > maxDim) {
    const ratio = maxDim / longEdge;
    w = Math.round(w * ratio);
    h = Math.round(h * ratio);
  }

  const canvas = document.createElement('canvas');
  canvas.width = w;
  canvas.height = h;
  const ctx = canvas.getContext('2d');
  ctx.drawImage(img, 0, 0, w, h);

  const blob = await new Promise((resolve) => {
    canvas.toBlob(resolve, 'image/webp', quality);
  });
  if (!blob) throw new Error('המרת התמונה ל-WebP נכשלה');
  return blob;
}

function loadImage(file) {
  return new Promise((resolve, reject) => {
    const img = new Image();
    const url = URL.createObjectURL(file);
    img.onload = () => { URL.revokeObjectURL(url); resolve(img); };
    img.onerror = (e) => { URL.revokeObjectURL(url); reject(e || new Error('נכשלה טעינת התמונה')); };
    img.src = url;
  });
}

/* בוחר את ה-MIME הטוב ביותר להקלטה: Opus/WebM חסכוני מאוד לדיבור.
   נופל אחורה ל-mp4 (Safari). */
export function pickRecordingMime() {
  if (typeof MediaRecorder === 'undefined') return '';
  const candidates = [
    'audio/webm;codecs=opus',
    'audio/ogg;codecs=opus',
    'audio/webm',
    'audio/mp4;codecs=mp4a.40.2',
    'audio/mp4'
  ];
  for (const c of candidates) {
    if (MediaRecorder.isTypeSupported(c)) return c;
  }
  return '';
}

/* מיפוי MIME לסיומת קובץ שנאחסן ב-Blob. */
export function extForMime(mime) {
  if (!mime) return 'bin';
  if (mime.includes('webp')) return 'webp';
  if (mime.includes('webm')) return 'webm';
  if (mime.includes('ogg')) return 'ogg';
  if (mime.includes('mp4') || mime.includes('m4a')) return 'm4a';
  if (mime.includes('mpeg')) return 'mp3';
  if (mime.includes('wav')) return 'wav';
  return 'bin';
}

/* בוחר את הקידוד הטוב ביותר לוידאו-webm.
   VP9 חסכוני יותר מ-VP8, אבל לא נתמך בכל דפדפן. נופל אחורה. */
function pickVideoMime() {
  if (typeof MediaRecorder === 'undefined') return '';
  const candidates = [
    'video/webm;codecs=vp9',
    'video/webm;codecs=vp8',
    'video/webm'
  ];
  for (const c of candidates) {
    if (MediaRecorder.isTypeSupported(c)) return c;
  }
  return '';
}

/* המרה של וידאו ל-WebM על ידי ציור פריים-אחר-פריים על קנבס והקלטה חוזרת.
   הפלט: video/webm (ללא שמע — הוידאו בלוח מוצג בשקט ממילא).
   real-time: המרה לוקחת בערך את משך הוידאו. */
export async function toWebmVideo(file, opts = {}) {
  const { maxWidth = 1280, fps = 24, videoBitrate = 1200000 } = opts;
  const outMime = pickVideoMime();
  if (!outMime || typeof HTMLVideoElement === 'undefined') {
    console.warn('[toWebmVideo] דפדפן לא תומך; מעלים את הקובץ המקורי', { outMime });
    return file;
  }

  const url = URL.createObjectURL(file);
  const video = document.createElement('video');
  video.muted = true;
  video.playsInline = true;
  video.preload = 'auto';
  video.src = url;

  try {
    await new Promise((resolve, reject) => {
      video.onloadedmetadata = () => resolve();
      video.onerror = () => reject(new Error('נכשלה טעינת הוידאו'));
      /* בטיחות: אם onloadedmetadata לא נורה — timeout */
      setTimeout(() => reject(new Error('טעינת הוידאו לקחה יותר מדי זמן')), 10000);
    });

    let w = video.videoWidth || 640;
    let h = video.videoHeight || 480;
    if (w > maxWidth) {
      const ratio = maxWidth / w;
      w = maxWidth;
      h = Math.round(h * ratio);
    }
    if (w % 2) w -= 1;
    if (h % 2) h -= 1;

    const canvas = document.createElement('canvas');
    canvas.width = w;
    canvas.height = h;
    const ctx = canvas.getContext('2d');

    /* ציור פריים ראשוני כדי ש-captureStream יתחיל בזרימה תקינה */
    ctx.fillStyle = '#000';
    ctx.fillRect(0, 0, w, h);

    const stream = canvas.captureStream(fps);
    const rec = new MediaRecorder(stream, { mimeType: outMime, videoBitsPerSecond: videoBitrate });
    const chunks = [];
    rec.ondataavailable = (e) => { if (e.data.size) chunks.push(e.data); };

    const done = new Promise((resolve) => {
      rec.onstop = () => {
        URL.revokeObjectURL(url);
        const outBlob = new Blob(chunks, { type: 'video/webm' });
        console.log('[toWebmVideo] סיום', {
          inputSize: file.size, outputSize: outBlob.size,
          chunks: chunks.length, duration: video.duration
        });
        resolve(outBlob);
      };
    });

    /* חשוב: מתחילים לצייר לפני שמפעילים את הקלטת, כדי ש-captureStream יראה מיד תוכן */
    await video.play();
    let stopped = false;
    const drawLoop = () => {
      if (stopped) return;
      if (video.ended || video.paused) return;
      ctx.drawImage(video, 0, 0, w, h);
      requestAnimationFrame(drawLoop);
    };
    drawLoop();

    /* timeslice=250ms — מבטיח שהחתיכות נאספות בזמן, לא רק ב-stop */
    rec.start(250);

    await new Promise((resolve) => {
      video.onended = resolve;
      /* בטיחות: אם onended לא נורה, עוצרים אחרי משך הוידאו + מרווח קטן */
      const dur = isFinite(video.duration) && video.duration > 0 ? video.duration : 60;
      setTimeout(resolve, (dur + 1.5) * 1000);
    });
    stopped = true;

    /* חשוב לתת ל-MediaRecorder לתפוס את השאריות לפני stop */
    await new Promise((r) => setTimeout(r, 300));
    if (rec.state !== 'inactive') rec.stop();

    const outBlob = await done;
    if (!outBlob || outBlob.size < 1024) {
      console.warn('[toWebmVideo] הפלט קטן/ריק — נופלים לקובץ המקורי', { size: outBlob && outBlob.size });
      return file;
    }
    return outBlob;
  } catch (err) {
    console.warn('[toWebmVideo] נכשל, מעלים את הקובץ המקורי', err);
    URL.revokeObjectURL(url);
    return file;
  }
}

/* מקודד מחדש כל בלוב אודיו בפורמט הצפוף (Opus/WebM @ ~32kbps).
   כל 20 שניות של דיבור יוצאות בערך ~80KB.
   אם משהו נכשל (דפדפן ישן/Safari עתיק) — מחזיר את הבלוב המקורי כפול-fallback. */
export async function toCompressedVoice(blob, opts = {}) {
  const { bitrate = 32000 } = opts;
  const outMime = pickRecordingMime();
  if (!outMime || typeof AudioContext === 'undefined') return blob;

  try {
    const arrayBuffer = await blob.arrayBuffer();
    const audioCtx = new AudioContext();
    const decoded = await audioCtx.decodeAudioData(arrayBuffer);

    const dest = audioCtx.createMediaStreamDestination();
    const src = audioCtx.createBufferSource();
    src.buffer = decoded;
    src.connect(dest);

    const rec = new MediaRecorder(dest.stream, { mimeType: outMime, audioBitsPerSecond: bitrate });
    const chunks = [];
    rec.ondataavailable = (e) => { if (e.data.size) chunks.push(e.data); };

    const done = new Promise((resolve) => {
      rec.onstop = () => resolve(new Blob(chunks, { type: outMime }));
    });

    rec.start();
    src.start(0);
    src.onended = () => { rec.stop(); audioCtx.close(); };

    /* בטיחות: לפעמים onended לא נורה, אז עוצרים אחרי משך הבאפר + מרווח קטן. */
    setTimeout(() => {
      if (rec.state !== 'inactive') rec.stop();
      if (audioCtx.state !== 'closed') audioCtx.close().catch(() => {});
    }, (decoded.duration + 0.5) * 1000);

    return await done;
  } catch {
    return blob;
  }
}
