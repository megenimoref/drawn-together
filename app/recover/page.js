'use client';

import { useState } from 'react';
import Link from 'next/link';

export default function RecoverPage() {
  const [email, setEmail] = useState('');
  const [busy, setBusy] = useState(false);
  const [result, setResult] = useState(null); /* { sent, reason } */
  const [error, setError] = useState('');

  async function submit(e) {
    e.preventDefault();
    setError('');
    setBusy(true);
    setResult(null);
    try {
      const r = await fetch('/api/recover', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: email.trim() })
      });
      const j = await r.json().catch(() => ({}));
      if (!r.ok) throw new Error(j.error || 'הבקשה נכשלה');
      setResult(j);
    } catch (err) {
      setError(String(err?.message || err));
    } finally {
      setBusy(false);
    }
  }

  return (
    <main className="landing">
      <span className="cover-eyebrow"><span className="dot"></span> שחזור קישור</span>
      <h1 className="cover-title">שחזור <em>קישור</em></h1>
      <p className="cover-sub">אם יצרתם לוח והשארתם מייל לגיבוי — נשלח אליכם את הקישור שוב.</p>

      <section className="landing-card">
        {result ? (
          result.reason === 'not-configured' ? (
            <div>
              <div className="big" aria-hidden="true">📭</div>
              <h2>שחזור במייל עדיין לא מופעל</h2>
              <p className="admin-note">
                בסביבה הזו שליחת מייל לא הוגדרה עדיין. אם שמרתם את הקישור — היכנסו איתו ישירות.
                אם פתחתם את הלוח במכשיר הזה, הוא מופיע ברשימה בעמוד הבית.
              </p>
              <Link className="submit-btn" href="/" style={{ display: 'inline-block', marginTop: 14 }}>
                חזרה לעמוד הבית
              </Link>
            </div>
          ) : (
            <div>
              <div className="big" aria-hidden="true">✉️</div>
              <h2>נשלח!</h2>
              <p className="admin-note">
                אם המייל <b>{email}</b> רשום אצלנו, שלחנו אליו את הקישורים ללוחות שלך.
                בדקו את תיבת הדואר (וגם את הספאם).
              </p>
              <Link className="submit-btn" href="/" style={{ display: 'inline-block', marginTop: 14 }}>
                חזרה לעמוד הבית
              </Link>
            </div>
          )
        ) : (
          <form onSubmit={submit}>
            <h2>איזה מייל השארתם?</h2>
            <div className="field">
              <label htmlFor="remail">כתובת מייל</label>
              <input id="remail" type="email" required value={email}
                     onChange={(e) => setEmail(e.target.value)} placeholder="you@example.com"
                     autoComplete="email" autoFocus />
            </div>
            {error && <div className="form-error">{error}</div>}
            <button className="submit-btn" type="submit" disabled={busy}>
              {busy ? 'שולחים…' : 'שליחת הקישור למייל'}
            </button>
          </form>
        )}
      </section>

      <p className="landing-recover">
        <Link href="/">← חזרה לעמוד הבית</Link>
      </p>
    </main>
  );
}
