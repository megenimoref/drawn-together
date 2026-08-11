'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';

const MINE_KEY = 'drawn-together:mine';

function loadMine() {
  try {
    const raw = localStorage.getItem(MINE_KEY);
    const arr = raw ? JSON.parse(raw) : [];
    return Array.isArray(arr) ? arr : [];
  } catch { return []; }
}
function saveMine(list) {
  try { localStorage.setItem(MINE_KEY, JSON.stringify(list)); } catch {}
}

function siteRoot() {
  const env = process.env.NEXT_PUBLIC_SITE_URL;
  if (env) return env.replace(/\/$/, '');
  if (typeof window !== 'undefined') return window.location.origin;
  return '';
}

export default function Landing() {
  const [mine, setMine] = useState([]);
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [created, setCreated] = useState(null); /* { space, name, url } */
  const [copied, setCopied] = useState(false);

  useEffect(() => { setMine(loadMine()); }, []);

  async function createCalendar(e) {
    e.preventDefault();
    setError('');
    setBusy(true);
    try {
      const space = crypto.randomUUID();
      const cleanName = name.trim() || 'הלוח שלי';
      const r = await fetch('/api/space', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ space, name: cleanName, email: email.trim() || null })
      });
      const j = await r.json().catch(() => ({}));
      if (!r.ok) throw new Error(j.error || 'יצירת הלוח נכשלה');

      const entry = { space, name: cleanName, createdAt: new Date().toISOString() };
      const next = [entry, ...loadMine().filter((m) => m.space !== space)];
      saveMine(next);
      setMine(next);
      setCreated({ space, name: cleanName, url: siteRoot() + '/c/' + space });
    } catch (err) {
      setError(String(err?.message || err));
    } finally {
      setBusy(false);
    }
  }

  async function copyLink(url) {
    try {
      await navigator.clipboard.writeText(url);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch { /* ignore */ }
  }

  function mailtoLink(created) {
    const subject = encodeURIComponent('הקישור ללוח שלי — לוח תשפ״ז');
    const body = encodeURIComponent(
      'שמרו את הקישור הזה — הוא המפתח היחיד ללוח:\n\n' + created.url +
      '\n\nמרכז ״מגנים על העורף״ · מחוז חיפה'
    );
    return 'mailto:?subject=' + subject + '&body=' + body;
  }

  return (
    <main className="landing">
      <span className="cover-eyebrow"><span className="dot"></span> מרכז ״מגנים על העורף״ · מחוז חיפה</span>
      <h1 className="cover-title">לוח <em>תשפ״ז</em></h1>
      <p className="cover-sub">לוח שנה אישי למשפחה — הציורים של הילדים והילדות, יום־יום לאורך השנה 🧡</p>

      {!created ? (
        <section className="landing-card">
          <h2>יצירת לוח חדש</h2>
          <p className="admin-note" style={{ marginTop: 0 }}>
            כל לוח הוא פרטי לחלוטין. תקבלו קישור אישי — רק מי שיש לו את הקישור רואה את הלוח.
          </p>
          <form onSubmit={createCalendar}>
            <div className="field">
              <label htmlFor="cname">שם הלוח (למשל: משפחת כהן)</label>
              <input id="cname" type="text" value={name} maxLength={80}
                     onChange={(e) => setName(e.target.value)} placeholder="הלוח שלי" />
            </div>
            <div className="field">
              <label htmlFor="cemail">מייל לגיבוי הקישור (מומלץ)</label>
              <input id="cemail" type="email" value={email} maxLength={120}
                     onChange={(e) => setEmail(e.target.value)} placeholder="you@example.com" autoComplete="email" />
              <span className="field-hint">אם תאבדו את הקישור — נוכל לשלוח אותו שוב למייל הזה דרך עמוד השחזור.</span>
            </div>
            {error && <div className="form-error">{error}</div>}
            <button className="submit-btn" type="submit" disabled={busy}>
              {busy ? 'יוצרים…' : 'יצירת הלוח שלי 🎨'}
            </button>
          </form>
        </section>
      ) : (
        <section className="landing-card created">
          <div className="big" aria-hidden="true">🎉</div>
          <h2>הלוח מוכן!</h2>
          <p className="save-warn">
            <b>שמרו את הקישור הזה!</b> הוא המפתח היחיד ללוח שלכם. אין סיסמה ואין שחזור אוטומטי —
            בלי הקישור לא ניתן להגיע ללוח.
          </p>
          <div className="link-box">
            <code>{created.url}</code>
          </div>
          <div className="cover-actions" style={{ justifyContent: 'center' }}>
            <button className="cover-share" onClick={() => copyLink(created.url)}>
              {copied ? '✓ הועתק' : '📋 העתקת הקישור'}
            </button>
            <a className="cover-share" href={mailtoLink(created)}>✉️ שליחת הקישור למייל שלי</a>
          </div>
          <Link className="submit-btn" href={'/c/' + created.space} style={{ display: 'inline-block', marginTop: 18 }}>
            כניסה ללוח ←
          </Link>
        </section>
      )}

      {mine.length > 0 && (
        <section className="landing-card mine">
          <h2>הלוחות שלי במכשיר הזה</h2>
          <ul className="mine-list">
            {mine.map((m) => (
              <li key={m.space}>
                <Link href={'/c/' + m.space}>🧡 {m.name}</Link>
              </li>
            ))}
          </ul>
          <p className="field-hint">הרשימה נשמרת בדפדפן הזה בלבד. במכשיר אחר — השתמשו בקישור השמור או בשחזור במייל.</p>
        </section>
      )}

      <p className="landing-recover">
        איבדתם קישור? <Link href="/recover">שחזור קישור במייל →</Link>
      </p>

      <footer className="landing-foot">
        בשבילכן ולמענכן · צוות מרכז <b>״מגנים על העורף״</b> · מחוז חיפה 🧡
      </footer>
    </main>
  );
}
