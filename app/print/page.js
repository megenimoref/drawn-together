'use client';

import { useEffect, useMemo, useState } from 'react';
import { QRCodeSVG } from 'qrcode.react';
import { MONTHS_META, DEMO_PUBLISHED, CONTACT_EMAIL } from '../../lib/months';

const DOWS = ['א׳', 'ב׳', 'ג׳', 'ד׳', 'ה׳', 'ו׳', 'ש׳'];

function daysWithArt(monthPublished) {
  if (!monthPublished) return [];
  return Object.keys(monthPublished).map(Number).filter((d) => Number.isInteger(d)).sort((a, b) => a - b);
}

function firstArtDay(monthPublished) {
  const list = daysWithArt(monthPublished);
  return list.length ? list[0] : null;
}

export default function PrintCalendar() {
  const [published, setPublished] = useState(DEMO_PUBLISHED);
  const [origin, setOrigin] = useState('');

  useEffect(() => {
    /* בעדיפות: NEXT_PUBLIC_SITE_URL (הפרודקשן), fallback ל-window.location.
       ככה גם PDF שנוצר מקומית מייצר QR-ים שמובילים לאתר החי. */
    const envUrl = process.env.NEXT_PUBLIC_SITE_URL;
    setOrigin((envUrl && envUrl.replace(/\/$/, '')) || window.location.origin);
    fetch('/api/months', { cache: 'no-store' })
      .then((r) => (r.ok ? r.json() : {}))
      .then((data) => setPublished({ ...DEMO_PUBLISHED, ...data }))
      .catch(() => {});
  }, []);

  const totalAssigned = useMemo(
    () => MONTHS_META.reduce((n, m) => n + daysWithArt(published[m.id]).length, 0),
    [published]
  );

  function urlFor(monthId, day) {
    if (!origin) return '';
    return origin + '/?m=' + monthId + (day ? '&d=' + day : '');
  }

  return (
    <div className="print-doc">
      {/* פס פעולות — לא נדפס */}
      <div className="print-toolbar no-print">
        <button className="submit-btn" onClick={() => window.print()}>
          📄 שמירה כ-PDF / הדפסה
        </button>
        <a className="back-link" href="/">← חזרה ללוח</a>
        <p className="admin-note" style={{ marginTop: 10 }}>
          לחיצה תפתח את חלונית ההדפסה. שם בוחרים "שמור כ-PDF" (או "Save as PDF"),
          A4 לרוחב, מרווחים מינימליים, וגם רקעים ("Background graphics") כדי לשמור על העיצוב.
        </p>
      </div>

      {/* דף שער */}
      <section className="print-page cover-page">
        <div className="cover-inner">
          <div className="cover-eyebrow-print">מרכז ״מגנים על העורף״ · מחוז חיפה</div>
          <h1 className="cover-title-print">לוח <em>תשפ״ז</em></h1>
          <p className="cover-sub-print">הסיפור של משפחות המילואים — דרך העיניים של הילדים והילדות</p>
          <p className="cover-sub2-print">13 חודשים · געגוע, גאווה, אהבה, תקווה וחוסן</p>

          <div className="cover-qr-block">
            <QRCodeSVG value={origin || 'https://example.com'} size={140} level="M"
                       bgColor="#FFFDFB" fgColor="#33405C" />
            <div className="qr-caption">
              <strong>לוח דיגיטלי מלא</strong>
              <span>סרקו כדי להאזין לקולות של הילדים והילדות בכל אחד מהציורים.</span>
            </div>
          </div>

          <div className="cover-stats">
            <span>{totalAssigned} ציורים מוצגים</span>
            <span aria-hidden="true">·</span>
            <span>13 חודשים</span>
          </div>
        </div>
      </section>

      {/* דף לכל חודש */}
      {MONTHS_META.map((m) => {
        const monthPub = published[m.id];
        const days = daysWithArt(monthPub);
        const heroDay = firstArtDay(monthPub);
        const hero = heroDay != null ? monthPub[heroDay] : null;

        return (
          <section key={m.id} className="print-page month-page">
            <header className="mp-head">
              <div>
                <h2 className="mp-title">{m.name} <em>תשפ״ז</em></h2>
                <div className="mp-greg">{m.greg}</div>
              </div>
              <div className="mp-count">
                {days.length > 0 ? days.length + ' ציורים בחודש הזה' : 'עדיין ממתין לציורים'}
              </div>
            </header>

            <div className="mp-body">
              {/* צד ימין: הציור הראשי */}
              <div className="mp-hero">
                {hero ? (
                  <>
                    <div className="mp-frame">
                      <img src={hero.thumbUrl} alt={hero.title} crossOrigin="anonymous" />
                    </div>
                    <div className="mp-meta">
                      <div className="mp-hero-title">{hero.title}</div>
                      <div className="mp-hero-child">{hero.child}</div>
                      <p className="mp-hero-ded">{hero.dedication}</p>
                    </div>
                  </>
                ) : (
                  <div className="mp-empty">
                    <span className="emoji">🖍️</span>
                    <span>הציורים של החודש הזה יפורסמו בקרוב</span>
                  </div>
                )}
              </div>

              {/* צד שמאל: הלוח + QR */}
              <div className="mp-side">
                <div className="mp-cal">
                  <div className="mp-cal-head">{m.calTitle}</div>
                  <div className="mp-grid">
                    {DOWS.map((d) => <div key={d} className="mp-dow">{d}</div>)}
                    {Array.from({ length: m.startDow }).map((_, i) =>
                      <div key={'e' + i} className="mp-day mp-day-empty" />
                    )}
                    {Array.from({ length: m.days }).map((_, i) => {
                      const d = i + 1;
                      const h = m.holidays[d];
                      const dayArt = monthPub ? monthPub[d] : null;
                      const cls = 'mp-day' + (h ? ' mp-holiday' : '') + (dayArt ? ' mp-hasart' : '');
                      return (
                        <div key={d} className={cls} title={h || undefined}>
                          {dayArt && <img src={dayArt.thumbUrl} alt="" crossOrigin="anonymous" />}
                          <span className="mp-num">{d}</span>
                        </div>
                      );
                    })}
                  </div>
                </div>

                <div className="mp-holidays">
                  {Object.entries(m.holidays).map(([d, n]) => (
                    <div key={d}><strong>{d}</strong> — {n}</div>
                  ))}
                </div>

                {hero && (
                  <div className="mp-qr">
                    <QRCodeSVG value={urlFor(m.id, heroDay)} size={80} level="M"
                               bgColor="#FFFDFB" fgColor="#33405C" />
                    <div className="qr-caption small">
                      <strong>לשמוע את הקול של {hero.child.split(',')[0]}</strong>
                      <span>סרקו לפתיחת הציור באתר</span>
                    </div>
                  </div>
                )}
              </div>
            </div>

            <footer className="mp-foot">
              <span>לוח תשפ״ז · משפחות המילואים · מחוז חיפה</span>
              <span>{m.name}</span>
            </footer>
          </section>
        );
      })}

      {/* דף תודות */}
      <section className="print-page credits-page">
        <div className="credits-inner">
          <h2 className="credits-title">תודה מיוחדת</h2>
          <p className="credits-lead">
            לילדות ולילדים שציירו את הלוח הזה, ולמשפחותיהם ששלחו אותנו למקום העמוק והאמיתי הזה.
            הציורים בלוח הם עדות לחוסן, לאהבה ולתקווה שהילדות והילדים נושאים בתוכם בשגרה שאינה שגרה.
          </p>

          <div className="credits-block">
            <strong>מרכז ״מגנים על העורף״ · מחוז חיפה</strong>
            <span>יצירת קשר: <a href={'mailto:' + CONTACT_EMAIL}>{CONTACT_EMAIL}</a></span>
          </div>

          <div className="credits-qr">
            <QRCodeSVG value={origin || 'https://example.com'} size={120} level="M"
                       bgColor="#FFFDFB" fgColor="#33405C" />
            <div className="qr-caption">
              <strong>לצפייה בלוח הדיגיטלי</strong>
              <span>סריקה של הקוד פותחת את האתר עם כל הציורים, הקולות והוידאו.</span>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}
