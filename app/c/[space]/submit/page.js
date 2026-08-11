'use client';

import { useEffect, useRef, useState } from 'react';
import { useRouter, useParams } from 'next/navigation';
import Link from 'next/link';
import { CONTACT_EMAIL, DEADLINE } from '../../../../lib/months';
import { toWebp, toCompressedVoice, pickRecordingMime, extForMime } from '../../../../lib/media-client';
import { readEditToken } from '../../../../lib/space-client';
import { uploadFile } from '../../../../lib/upload-client';

const MAX_IMG_MB = 12;
const MAX_REC_SECONDS = 20;

export default function SubmitPage() {
  const router = useRouter();
  const { space } = useParams();
  const spaceBase = '/c/' + space;

  /* editToken (מפתח עריכה) — הוספת ציור דורשת אותו (הקישור הפרטי). */
  const [editToken, setEditToken] = useState('');
  const [tokenLoaded, setTokenLoaded] = useState(false);
  useEffect(() => { setEditToken(readEditToken(space)); setTokenLoaded(true); }, [space]);
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  const [progress, setProgress] = useState('');
  const [artPreview, setArtPreview] = useState('');
  const [artFile, setArtFile] = useState(null);
  const [voiceBlob, setVoiceBlob] = useState(null);
  const [voiceUrlLocal, setVoiceUrlLocal] = useState('');
  const [recording, setRecording] = useState(false);
  const [recSecs, setRecSecs] = useState(0);

  const recRef = useRef(null);
  const timerRef = useRef(null);
  const chunksRef = useRef([]);

  function onArtChange(e) {
    const f = e.target.files[0];
    if (!f) return;
    if (f.size > MAX_IMG_MB * 1024 * 1024) {
      setError('קובץ הציור גדול מ-' + MAX_IMG_MB + 'MB. אפשר לצלם באיכות מעט נמוכה יותר.');
      e.target.value = '';
      return;
    }
    setError('');
    setArtFile(f);
    const reader = new FileReader();
    reader.onload = (ev) => setArtPreview(ev.target.result);
    reader.readAsDataURL(f);
  }

  function stopRecording() {
    if (recRef.current && recRef.current.state !== 'inactive') recRef.current.stop();
    clearInterval(timerRef.current);
    setRecording(false);
  }

  async function startRecording() {
    if (recording) { stopRecording(); return; }
    if (!navigator.mediaDevices || !window.MediaRecorder) {
      setError('הדפדפן לא תומך בהקלטה - אפשר להקליט בווטסאפ ולהעלות כקובץ.');
      return;
    }
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      setError('');
      chunksRef.current = [];
      /* מעדיפים Opus/WebM בקצב נמוך - קול צלול בקובץ זעיר (~80KB ל-20 שניות). */
      const mime = pickRecordingMime();
      const rec = mime
        ? new MediaRecorder(stream, { mimeType: mime, audioBitsPerSecond: 32000 })
        : new MediaRecorder(stream);
      recRef.current = rec;
      rec.ondataavailable = (e) => { if (e.data.size) chunksRef.current.push(e.data); };
      rec.onstop = () => {
        stream.getTracks().forEach((t) => t.stop());
        const type = rec.mimeType || 'audio/webm';
        const blob = new Blob(chunksRef.current, { type });
        setVoiceBlob(blob);
        setVoiceUrlLocal(URL.createObjectURL(blob));
      };
      rec.start();
      setRecording(true);
      setRecSecs(0);
      timerRef.current = setInterval(() => {
        setRecSecs((s) => {
          if (s + 1 >= MAX_REC_SECONDS) stopRecording();
          return s + 1;
        });
      }, 1000);
    } catch {
      setError('אין גישה למיקרופון. אפשר לאשר בהגדרות הדפדפן, או להעלות הקלטת ווטסאפ כקובץ.');
    }
  }

  function onVoiceFile(e) {
    const f = e.target.files[0];
    if (!f) return;
    setVoiceBlob(f);
    setVoiceUrlLocal(URL.createObjectURL(f));
  }

  async function onSubmit(e) {
    e.preventDefault();
    const form = e.target;
    if (!form.checkValidity()) { form.reportValidity(); return; }
    if (!artFile) { setError('לא נבחר קובץ ציור.'); return; }
    setError('');
    setBusy(true);
    try {
      const id = crypto.randomUUID();

      /* ממירים את הציור ל-WebP לפני העלאה - חוסך משמעותית במקום ובזמן. */
      setProgress('מכינים את הציור… 🎨');
      let artUpload = artFile;
      try {
        artUpload = await toWebp(artFile, { maxDim: 2048, quality: 0.85 });
      } catch { /* fallback: מעלים את הקובץ המקורי */ }

      setProgress('מעלים את הציור… 🎨');
      const artBlob = await uploadFile(`submissions/${space}/${id}/art.webp`, artUpload, editToken);

      let voiceUrl = null;
      if (voiceBlob) {
        /* מקודדים את ההקלטה מחדש ל-Opus/WebM חסכוני - לא משנה אם מ-מיקרופון או מקובץ. */
        setProgress('מכינים את ההקלטה… 🎧');
        let voiceUpload = voiceBlob;
        try {
          voiceUpload = await toCompressedVoice(voiceBlob, { bitrate: 32000 });
        } catch { /* fallback: מעלים את הבלוב המקורי */ }

        setProgress('מעלים את ההקלטה… 🎧');
        const vExt = extForMime(voiceUpload.type || 'audio/webm');
        const vb = await uploadFile(`submissions/${space}/${id}/voice.${vExt}`, voiceUpload, editToken);
        voiceUrl = vb.url;
      }

      setProgress('שולחים את הפרטים… 🧡');
      const fd = new FormData(form);
      const res = await fetch('/api/submit', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          id,
          space,
          editToken,
          childName: fd.get('childName'),
          age: fd.get('age'),
          artTitle: fd.get('artTitle'),
          dedication: fd.get('dedication'),
          parentName: fd.get('parentName'),
          phone: fd.get('phone'),
          email: fd.get('email'),
          consentStore: !!fd.get('consentStore'),
          consentPublish: !!fd.get('consentPublish'),
          artUrl: artBlob.url,
          voiceUrl
        })
      });
      if (!res.ok) {
        const j = await res.json().catch(() => ({}));
        throw new Error(j.error || 'השליחה נכשלה');
      }
      router.push(spaceBase + '/manage?added=1');
    } catch (err) {
      setBusy(false);
      setProgress('');
      setError('משהו השתבש בשליחה: ' + (err?.message || err) + ' - נסו שוב, או שלחו במייל ' + CONTACT_EMAIL);
    }
  }

  if (tokenLoaded && !editToken) {
    return (
      <div className="form-wrap" style={{ margin: '0 auto' }}>
        <Link className="back-link" href={spaceBase}>← חזרה ללוח</Link>
        <main className="form-card">
          <h1>הוספת ציור 🧡</h1>
          <p className="admin-note">
            כדי להוסיף ציור צריך להיכנס דרך <b>הקישור הפרטי</b> של הלוח
            (הקישור שכולל <code>?edit=</code>). הקישור הרגיל הוא לצפייה בלבד.
          </p>
        </main>
      </div>
    );
  }

  return (
    <div className="form-wrap" style={{ margin: '0 auto' }}>
      <Link className="back-link" href={spaceBase}>← חזרה ללוח השנה</Link>

      <main className="form-card">
        <header className="form-head">
          <span className="form-eyebrow">הציור מתעורר לחיים</span>
          <h1>שליחת ציור והקדשה <span aria-hidden="true">🧡</span></h1>
          <p className="form-sub">הפרטים והקבצים יישמרו באופן פרטי וייבדקו לפני פרסום.</p>
        </header>

        <form onSubmit={onSubmit} noValidate>
          <fieldset>
            <legend>1. פרטי הילד/ה</legend>
            <div className="row">
              <div className="field grow">
                <label htmlFor="childName">שם פרטי בלבד</label>
                <input type="text" id="childName" name="childName" required autoComplete="off" />
              </div>
              <div className="field small">
                <label htmlFor="age">גיל</label>
                <input type="number" id="age" name="age" min="2" max="17" required />
              </div>
            </div>
            <div className="field">
              <label htmlFor="artTitle">שם הציור</label>
              <input type="text" id="artTitle" name="artTitle" placeholder="למשל: שמיים ורודים" required />
            </div>
            <div className="field">
              <label htmlFor="dedication">משפט ההקדשה</label>
              <textarea id="dedication" name="dedication" rows={3} required
                placeholder="למשל: מוקדש לאבא שלי אלון, כי אין גבול לאהבה." />
            </div>
          </fieldset>

          <fieldset>
            <legend>2. הציור</legend>
            <label className="dropzone" htmlFor="artFile">
              <input type="file" id="artFile" accept="image/jpeg,image/png,image/webp" onChange={onArtChange} required />
              <span className="dz-icon" aria-hidden="true">🖼️</span>
              <span className="dz-title">צילום או העלאת הציור</span>
              <span className="dz-hint">JPG, PNG או WEBP · עד {MAX_IMG_MB}MB</span>
              {artFile && <span className="dz-file">✓ {artFile.name}</span>}
              {artPreview && <img className="dz-preview" src={artPreview} alt="תצוגה מקדימה של הציור" />}
            </label>
            <p className="tip">💡 טיפ: צלמו ישר מלמעלה, באור יום, בלי צל של יד - זה מה שיופיע בלוח!</p>
          </fieldset>

          <fieldset>
            <legend>3. הקול של הילד/ה</legend>
            <p className="tip" style={{ marginTop: 0 }}>מומלץ להקליט במקום שקט, עד {MAX_REC_SECONDS} שניות: הילד/ה מקריאים את משפט ההקדשה.</p>
            <div className="rec-row">
              <button type="button" className={'rec-btn' + (recording ? ' recording' : '')} onClick={startRecording}>
                <span className="rec-dot" aria-hidden="true"></span>
                <span>{recording ? 'עצירת הקלטה' : 'התחלת הקלטה'}</span>
              </button>
              {recording && <span className="rec-timer">{Math.floor(recSecs / 60)}:{('0' + (recSecs % 60)).slice(-2)}</span>}
              <span className="rec-or">או</span>
              <label className="rec-upload">
                העלאת קובץ<input type="file" accept="audio/*" hidden onChange={onVoiceFile} />
              </label>
            </div>
            {voiceUrlLocal && (
              <div className="rec-result">
                <audio controls src={voiceUrlLocal} />
                <button type="button" className="rec-redo"
                        onClick={() => { setVoiceBlob(null); setVoiceUrlLocal(''); }}>
                  הקלטה מחדש
                </button>
              </div>
            )}
            <p className="tip">ההקלטה לא חובה - אבל היא מה שהופך את הלוח לקסום 🧡</p>
          </fieldset>

          <fieldset>
            <legend>4. פרטי ההורה</legend>
            <div className="row">
              <div className="field grow">
                <label htmlFor="parentName">שם מלא</label>
                <input type="text" id="parentName" name="parentName" required autoComplete="name" />
              </div>
              <div className="field small">
                <label htmlFor="phone">טלפון</label>
                <input type="tel" id="phone" name="phone" required autoComplete="tel" />
              </div>
            </div>
            <div className="field">
              <label htmlFor="email">אימייל</label>
              <input type="email" id="email" name="email" required autoComplete="email" />
            </div>
          </fieldset>

          <fieldset>
            <legend>5. אישור הורה</legend>
            <label className="check">
              <input type="checkbox" name="consentStore" required />
              <span>אני מאשר/ת לשמור את הפרטים, הציור וההקלטה לצורך בחינת ההשתתפות במיזם.</span>
            </label>
            <label className="check">
              <input type="checkbox" name="consentPublish" required />
              <span>אני מאשר/ת לפרסם את הציור, השם הפרטי, הגיל וההקלטה בלוח השנה הדיגיטלי ובפרסומי המיזם. ידוע לי שאוכל לבקש הסרה בכל עת.</span>
            </label>
            <p className="privacy-note">פרטי ההורה לא יוצגו לציבור. כל הגשה נבדקת ידנית לפני פרסום.</p>
          </fieldset>

          {error && <div className="form-error">{error}</div>}
          {progress && <div className="progress-msg">{progress}</div>}

          <button type="submit" className="submit-btn" disabled={busy}>
            {busy ? 'שולחים… רגע אחד 🧡' : 'שליחת הציור וההקלטה 🧡'}
          </button>
          <p className="deadline-note">📅 מועד אחרון למשלוח: {DEADLINE} · שאלות? <a href={'mailto:' + CONTACT_EMAIL}>{CONTACT_EMAIL}</a></p>
        </form>
      </main>
    </div>
  );
}
