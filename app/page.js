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
  const [created, setCreated] = useState(null); /* { space, name, editToken, viewUrl, editUrl } */
  const [copied, setCopied] = useState(''); /* '' | 'edit' | 'view' */

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
      const editToken = j.editToken || '';

      const entry = { space, name: cleanName, editToken, createdAt: new Date().toISOString() };
      const next = [entry, ...loadMine().filter((m) => m.space !== space)];
      saveMine(next);
      setMine(next);
      const viewUrl = siteRoot() + '/c/' + space;
      setCreated({ space, name: cleanName, editToken, viewUrl, editUrl: viewUrl + '?edit=' + editToken });
    } catch (err) {
      setError(String(err?.message || err));
    } finally {
      setBusy(false);
    }
  }

  async function copyLink(url, which) {
    try {
      await navigator.clipboard.writeText(url);
      setCopied(which);
      setTimeout(() => setCopied(''), 2000);
    } catch { /* ignore */ }
  }

  function mailtoLink(c) {
    const subject = encodeURIComponent('הקישור הפרטי ללוח שלי — לוח תשפ״ז');
    const body = encodeURIComponent(
      'שמרו את הקישור הפרטי הזה — הוא המפתח היחיד לעריכת הלוח:\n\n' + c.editUrl +
      '\n\nקישור לשיתוף (צפייה בלבד):\n' + c.viewUrl +
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
            <b>שמרו את הקישור הפרטי!</b> הוא המפתח היחיד לעריכת הלוח. אין סיסמה ואין שחזור אוטומטי.
          </p>

          <div className="link-label">🔒 הקישור הפרטי שלך — לעריכה (לא לשתף!):</div>
          <div className="link-box"><code>{created.editUrl}</code></div>
          <div className="cover-actions" style={{ justifyContent: 'center' }}>
            <button className="cover-share" onClick={() => copyLink(created.editUrl, 'edit')}>
              {copied === 'edit' ? '✓ הועתק' : '📋 העתקת הקישור הפרטי'}
            </button>
            <a className="cover-share" href={mailtoLink(created)}>✉️ שליחה למייל שלי</a>
          </div>

          <div className="link-label" style={{ marginTop: 18 }}>🔗 קישור לשיתוף — צפייה בלבד:</div>
          <div className="link-box"><code>{created.viewUrl}</code></div>
          <div className="cover-actions" style={{ justifyContent: 'center' }}>
            <button className="cover-share" onClick={() => copyLink(created.viewUrl, 'view')}>
              {copied === 'view' ? '✓ הועתק' : '📋 העתקת קישור הצפייה'}
            </button>
          </div>

          <Link className="submit-btn" href={'/c/' + created.space + '?edit=' + created.editToken}
                style={{ display: 'inline-block', marginTop: 18 }}>
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
                <Link href={'/c/' + m.space + (m.editToken ? '?edit=' + m.editToken : '')}>🧡 {m.name}</Link>
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
