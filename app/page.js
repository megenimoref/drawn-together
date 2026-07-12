'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import Link from 'next/link';
import { MONTHS_META, DEMO_PUBLISHED, DEADLINE } from '../lib/months';

const DOWS = ['א׳', 'ב׳', 'ג׳', 'ד׳', 'ה׳', 'ו׳', 'ש׳'];

function daysWithArt(monthPublished) {
  if (!monthPublished) return [];
  return Object.keys(monthPublished).map(Number).filter((d) => Number.isInteger(d)).sort((a, b) => a - b);
}

function firstArtDay(monthPublished) {
  const list = daysWithArt(monthPublished);
  return list.length ? list[0] : null;
}

function coverThumb(monthPublished) {
  const d = firstArtDay(monthPublished);
  return d != null ? monthPublished[d].thumbUrl : null;
}

function readUrl() {
  if (typeof window === 'undefined') return { m: null, d: null };
  const p = new URLSearchParams(window.location.search);
  return { m: p.get('m'), d: p.get('d') };
}

export default function Home() {
  /* אתחול מ-URL — קישור משותף נוחת ישירות על החודש/יום המתאימים. */
  const initial = typeof window !== 'undefined' ? readUrl() : { m: null, d: null };
  const initIdx = initial.m ? MONTHS_META.findIndex((x) => x.id === initial.m) : -1;

  const [view, setView] = useState(initIdx >= 0 ? 'cal' : 'cover');
  const [cur, setCur] = useState(initIdx >= 0 ? initIdx : 0);
  const [published, setPublished] = useState(DEMO_PUBLISHED);
  /* selectedDay = בחירה מפורשת של המשתמש (לחיצה או URL). אם null, ה-render נופל ל-firstArtDay של החודש. */
  const [selectedDay, setSelectedDay] = useState(initial.d ? Number(initial.d) : null);
  const [playing, setPlaying] = useState(false);
  const [shareToast, setShareToast] = useState('');
  const audioRef = useRef(null);

  useEffect(() => {
    let cancelled = false;
    async function refresh() {
      try {
        const r = await fetch('/api/months', { cache: 'no-store' });
        if (!r.ok || cancelled) return;
        const data = await r.json();
        if (!cancelled) setPublished({ ...DEMO_PUBLISHED, ...data });
      } catch {}
    }
    refresh();

    /* רענון כשחוזרים לטאב אחרי שהיינו עליו במקום אחר */
    const onVis = () => { if (document.visibilityState === 'visible') refresh(); };
    document.addEventListener('visibilitychange', onVis);

    /* עדכון מיידי מטאב הניהול באותו דפדפן */
    let bc = null;
    if (typeof BroadcastChannel !== 'undefined') {
      bc = new BroadcastChannel('drawn-together');
      bc.onmessage = (e) => { if (e.data === 'published-changed') refresh(); };
    }

    return () => {
      cancelled = true;
      document.removeEventListener('visibilitychange', onVis);
      if (bc) bc.close();
    };
  }, []);

  const meta = MONTHS_META[cur];
  const monthPub = published[meta.id];

  /* מעבר חודש/שינוי view = מנקה את הבחירה, כך שה-render יראה firstArtDay של החודש החדש.
     אין תלות ב-monthPub — כדי לא לדרוס בחירת URL כשהנתונים מגיעים אחרי mount. */
  const firstRunRef = useRef(true);
  useEffect(() => {
    if (firstRunRef.current) {
      firstRunRef.current = false;
      stopVoice();
      return;
    }
    setSelectedDay(null);
    stopVoice();
  }, [cur, view]);

  useEffect(() => { stopVoice(); }, [selectedDay]);

  /* היום שמוצג בפועל: מה שהמשתמש בחר, ואם לא בחר — היום המוקדם ביותר עם ציור בחודש. */
  const effectiveDay = selectedDay != null ? selectedDay : firstArtDay(monthPub);
  const pub = effectiveDay != null && monthPub ? monthPub[effectiveDay] : null;

  /* סנכרון URL עם המצב — כדי שגם ניווט "חופשי" ייצור קישור שאפשר להעתיק ולשתף. */
  useEffect(() => {
    if (typeof window === 'undefined') return;
    const url = new URL(window.location.href);
    if (view === 'cal') {
      url.searchParams.set('m', meta.id);
      if (selectedDay) url.searchParams.set('d', String(selectedDay));
      else url.searchParams.delete('d');
    } else {
      url.searchParams.delete('m');
      url.searchParams.delete('d');
    }
    window.history.replaceState({}, '', url.toString());
  }, [cur, selectedDay, view, meta.id]);

  async function share(kind) {
    const base = window.location.origin + window.location.pathname;
    let shareUrl, title, text;
    if (kind === 'day' && pub) {
      const u = new URL(base);
      u.searchParams.set('m', meta.id);
      u.searchParams.set('d', String(effectiveDay));
      shareUrl = u.toString();
      title = 'לוח תשפ״ז — ' + meta.name;
      text = pub.title + ' · ' + pub.child + ' · לוח תשפ״ז';
    } else {
      shareUrl = base;
      title = 'לוח תשפ״ז';
      text = 'לוח תשפ״ז של משפחות המילואים — מחוז חיפה';
    }
    try {
      if (navigator.share) {
        await navigator.share({ title, text, url: shareUrl });
        return;
      }
    } catch { /* המשתמש ביטל את התפריט — נופלים ל-clipboard */ }
    try {
      await navigator.clipboard.writeText(shareUrl);
      setShareToast('הקישור הועתק ✓');
    } catch {
      setShareToast('העתיקו את הקישור מהכתובת');
    }
    setTimeout(() => setShareToast(''), 2400);
  }

  function stopVoice() {
    const a = audioRef.current;
    if (a) { a.pause(); a.currentTime = 0; }
    setPlaying(false);
  }

  function toggleVoice(url) {
    const a = audioRef.current;
    if (!a) return;
    if (playing) { stopVoice(); return; }
    a.src = url;
    a.play().then(() => setPlaying(true)).catch(() => setPlaying(false));
  }

  return (
    <>
      <audio ref={audioRef} onEnded={stopVoice} />

      {view === 'cover' && (
        <section id="cover" aria-label="שער הלוח">
          <span className="cover-eyebrow"><span className="dot"></span> מרכז ״מגנים על העורף״ · מחוז חיפה</span>
          <h1 className="cover-title">לוח <em>תשפ״ז</em></h1>
          <p className="cover-sub">הסיפור של משפחות המילואים - דרך העיניים של הילדים והילדות</p>
          <p className="cover-sub2">13 חודשים · געגוע, גאווה, אהבה, תקווה וחוסן 🧡</p>

          <div className="mosaic">
            {MONTHS_META.map((m, i) => {
              const thumb = coverThumb(published[m.id]);
              const count = daysWithArt(published[m.id]).length;
              return (
                <button key={m.id} className="tile" aria-label={'פתיחת חודש ' + m.name}
                        onClick={() => { setCur(i); setView('cal'); window.scrollTo(0, 0); }}>
                  {thumb ? (
                    <div className="art"><img src={thumb} alt={'הציור של חודש ' + m.name} loading="lazy" /></div>
                  ) : (
                    <div className="art placeholder">🖍️<small>הציור בדרך</small></div>
                  )}
                  <span className="mname">{m.name}</span>
                  {count > 1 && <span className="cover-count">{count} ציורים</span>}
                </button>
              );
            })}
          </div>

          <button className="cover-cta" onClick={() => { setCur(0); setView('cal'); }}>פתיחת הלוח 🎨</button>
          <div>
            <button className="cover-share" onClick={() => share('cover')}
                    aria-label="שיתוף לוח השנה">
              🔗 שיתוף הלוח
            </button>
          </div>
        </section>
      )}

      {view === 'cal' && (
        <section aria-label="לוח החודש">
          <header className="month-head">
            <div>
              <span className="eyebrow"><span className="dot"></span> מגנים על העורף · מחוז חיפה · לוח שנה דיגיטלי תשפ״ז</span>
              <h1 className="month">{meta.name} תשפ״ז</h1>
              <div className="greg">{meta.greg}</div>
            </div>
            <div className="nav" aria-label="ניווט בין חודשים">
              <button onClick={() => setCur((cur - 1 + 13) % 13)} aria-label="החודש הקודם">›</button>
              <div className="dots">
                {MONTHS_META.map((m, i) => (
                  <button key={m.id} className={i === cur ? 'on' : ''}
                          aria-label={'מעבר לחודש ' + m.name} onClick={() => setCur(i)} />
                ))}
              </div>
              <button onClick={() => setCur((cur + 1) % 13)} aria-label="החודש הבא">‹</button>
              <button className="back-cover" onClick={() => setView('cover')}>חזרה לשער</button>
            </div>
          </header>

          <main className="month-grid">
            <section className="art-card" aria-label="ציור היום">
              <div className="frame">
                {pub ? (
                  pub.mediaType === 'video' ? (
                    <>
                      <div className="live-badge"><span className="pulse"></span> הציור מתעורר לחיים</div>
                      <video key={pub.artUrl} autoPlay muted loop playsInline
                             src={pub.artUrl} aria-label={'הציור ' + pub.title + ' מתעורר לחיים'} />
                    </>
                  ) : (
                    <img src={pub.artUrl} alt={'הציור ' + pub.title + ' מאת ' + pub.child} />
                  )
                ) : effectiveDay ? (
                  <div className="waiting">
                    <span className="emoji">✏️</span>
                    <span>{effectiveDay} ב{meta.name} עדיין פנוי</span>
                    <small>אולי היום הזה יהיה של הילד/ה שלכם? שלחו לנו ציור, שם פרטי, גיל והקדשה קצרה בקול הילד/ה - ואם הצוות יאשר, הציור יופיע כאן.</small>
                    <Link className="cta waiting-cta" href="/submit">שליחת ציור והקלטה</Link>
                    <small>מועד אחרון למשלוח: {DEADLINE} · נדרשת הסכמת הורה</small>
                  </div>
                ) : (
                  <div className="waiting">
                    <span className="emoji">🖍️</span>
                    <span>הציור שלך יכול להיות כאן</span>
                    <small>ילדות וילדי משפחות המילואים במחוז חיפה - שלחו לנו ציור, שם פרטי, גיל והקדשה קצרה בקול הילד/ה. לחיצה על יום ריק תראה איך זה יראה שם.</small>
                    <Link className="cta waiting-cta" href="/submit">שליחת ציור והקלטה</Link>
                    <small>מועד אחרון למשלוח: {DEADLINE} · נדרשת הסכמת הורה</small>
                  </div>
                )}
              </div>

              {pub && (
                <div className="art-meta">
                  <div className="art-title">{pub.title}</div>
                  <span className="art-child">{pub.child}</span>
                  <p className="art-dedication">{pub.dedication}</p>
                  {pub.voiceUrl && (
                    <div className={'voice' + (playing ? ' playing' : '')}>
                      <button className="play-btn" onClick={() => toggleVoice(pub.voiceUrl)}>
                        <span className="tri" aria-hidden="true"></span>
                        <span>{playing ? 'עצירה' : 'להשמיע את הקול של ' + pub.child.split(',')[0]}</span>
                      </button>
                      <div className="wave" aria-hidden="true"><i></i><i></i><i></i><i></i><i></i><i></i><i></i></div>
                    </div>
                  )}
                  <button className="share-btn" onClick={() => share('day')}
                          aria-label={'שיתוף הציור של ' + pub.child.split(',')[0]}>
                    <span aria-hidden="true">↗</span> שיתוף הציור של {pub.child.split(',')[0]}
                  </button>
                </div>
              )}
            </section>

            <section className="cal-card" aria-label="ימי החודש">
              <div className="cal-head"><span>{meta.calTitle}</span><small>מחוז חיפה 🧡</small></div>
              <div className="grid">
                {DOWS.map((d) => <div key={d} className="dow">{d}</div>)}
                {Array.from({ length: meta.startDow }).map((_, i) => <div key={'e' + i} className="day empty" />)}
                {Array.from({ length: meta.days }).map((_, i) => {
                  const d = i + 1;
                  const h = meta.holidays[d];
                  const dayArt = monthPub ? monthPub[d] : null;
                  const isSelected = d === effectiveDay;
                  const cls = 'day clickable'
                    + (h ? ' holiday' : '')
                    + (dayArt ? ' has-art' : ' vacant')
                    + (isSelected ? ' selected' : '');
                  return (
                    <button key={d} type="button" className={cls}
                            title={h || undefined}
                            onClick={() => setSelectedDay(d)}
                            aria-label={dayArt ? 'הצגת הציור של יום ' + d : 'יום ' + d + ' - פנוי לשליחה'}>
                      {dayArt && <img className="day-thumb" src={dayArt.thumbUrl} alt="" />}
                      <span className="day-num">{d}</span>
                    </button>
                  );
                })}
              </div>
              <div className="legend">
                <span><b>🧡</b> חג / מועד</span>
                <span> · לחיצה על יום עם ציור מציגה אותו</span>
              </div>
              <div className="holiday-list">
                {Object.keys(meta.holidays).length
                  ? Object.entries(meta.holidays).map(([d, n]) => (
                      <div key={d}><span>{d}</span> - {n}</div>
                    ))
                  : 'אין מועדים מיוחדים החודש'}
              </div>
            </section>
          </main>
        </section>
      )}

      {shareToast && <div className="share-toast">{shareToast}</div>}
    </>
  );
}
