'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import { useParams } from 'next/navigation';
import Link from 'next/link';
import { MONTHS_META, DEADLINE, groupHolidays, HOLIDAY_LEGEND } from '../../../lib/months';
import { readEditToken } from '../../../lib/space-client';

const DOWS = ['א׳', 'ב׳', 'ג׳', 'ד׳', 'ה׳', 'ו׳', 'ש׳'];

function daysWithArt(monthPublished) {
  if (!monthPublished) return [];
  return Object.keys(monthPublished).map(Number).filter((d) => Number.isInteger(d)).sort((a, b) => a - b);
}

function firstArtDay(monthPublished) {
  const list = daysWithArt(monthPublished);
  return list.length ? list[0] : null;
}

/* כל ה-thumbs של החודש בסדר כרונולוגי — לקרוסלה במוזאיקת השער */
function allThumbs(monthPublished) {
  if (!monthPublished) return [];
  return daysWithArt(monthPublished)
    .map((d) => monthPublished[d]?.thumbUrl)
    .filter(Boolean);
}

function readUrl() {
  if (typeof window === 'undefined') return { m: null, d: null };
  const p = new URLSearchParams(window.location.search);
  return { m: p.get('m'), d: p.get('d') };
}

export default function Home() {
  /* ה-space נגזר מה-URL (‎/c/<space>‎) — הלוח הפרטי של המשפחה. */
  const { space } = useParams();
  const spaceBase = '/c/' + space;

  /* editToken (מפתח עריכה) — מגיע ב-‎?edit=‎ בקישור הפרטי ונשמר במכשיר.
     בלעדיו: מצב צפייה בלבד (קישור שיתוף). מתחילים ריק כדי למנוע hydration mismatch. */
  const [editToken, setEditToken] = useState('');
  useEffect(() => { setEditToken(readEditToken(space)); }, [space]);
  const canEdit = !!editToken;
  const editHref = (p) => spaceBase + p + '?edit=' + editToken;

  /* מצב התחלתי אחיד לשרת וללקוח (מונע hydration mismatch).
     הקריאה מ-URL קורית ב-useEffect אחרי mount. */
  const [view, setView] = useState('cover');
  const [cur, setCur] = useState(0);
  const [published, setPublished] = useState({});
  const [publishedLoaded, setPublishedLoaded] = useState(false);
  /* selectedDay = בחירה מפורשת של המשתמש (לחיצה או URL). אם null, ה-render נופל ל-firstArtDay של החודש. */
  const [selectedDay, setSelectedDay] = useState(null);
  const [playing, setPlaying] = useState(false);
  const [shareToast, setShareToast] = useState('');
  const [mediaLoading, setMediaLoading] = useState(true);
  const [mediaError, setMediaError] = useState(false);
  const [voiceTime, setVoiceTime] = useState({ current: 0, duration: 0 });
  const audioRef = useRef(null);

  /* אתחול מ-URL אחרי mount - כך שלא נגרם hydration mismatch.
     אם הקישור כולל ?m= (וגם ?d=) - נכנסים ישירות לתצוגת החודש/יום. */
  useEffect(() => {
    const { m, d } = readUrl();
    if (m) {
      const idx = MONTHS_META.findIndex((x) => x.id === m);
      if (idx >= 0) {
        setCur(idx);
        setView('cal');
        if (d) setSelectedDay(Number(d));
      }
    }
  }, []);

  useEffect(() => {
    let cancelled = false;

    /* טעינה מיידית מ-localStorage אם יש cache — המשתמש רואה את הלוח בלי המתנה.
       הנתונים הטריים מגיעים ברקע ומעדכנים אם משהו השתנה. */
    try {
      const cached = localStorage.getItem(('drawn-together:published:' + space));
      if (cached) {
        const data = JSON.parse(cached);
        setPublished(data);
        setPublishedLoaded(true);
      }
    } catch { /* localStorage לא זמין (מצב פרטי/גלישה מוגבלת) — נופלים לפניה רגילה */ }

    async function refresh() {
      try {
        /* קווסטרינג _t חוסם cache של דפדפן במקרה שכותרות Cache-Control לא כובדו */
        const r = await fetch('/api/months?space=' + space + '&_t=' + Date.now(), { cache: 'no-store' });
        if (!r.ok || cancelled) return;
        const data = await r.json();
        if (!cancelled) {
          setPublished(data);
          setPublishedLoaded(true);
          try { localStorage.setItem(('drawn-together:published:' + space), JSON.stringify(data)); } catch {}
        }
      } catch { if (!cancelled) setPublishedLoaded(true); }
    }
    refresh();

    /* רענון כשחוזרים לטאב אחרי שהיינו עליו במקום אחר */
    const onVis = () => { if (document.visibilityState === 'visible') refresh(); };
    document.addEventListener('visibilitychange', onVis);

    /* עדכון מיידי מטאב הניהול באותו דפדפן.
       ההודעה נושאת את הנתונים עצמם — מחילים ישירות, בלי fetch,
       כי fetch מיד אחרי כתיבה עלול לקבל גרסה ישנה מ-Blob CDN. */
    let bc = null;
    if (typeof BroadcastChannel !== 'undefined') {
      bc = new BroadcastChannel('drawn-together:' + space);
      bc.onmessage = (e) => {
        const msg = e.data;
        if (msg && typeof msg === 'object' && msg.type === 'published-changed' && msg.published) {
          setPublished(msg.published);
          setPublishedLoaded(true);
          try { localStorage.setItem(('drawn-together:published:' + space), JSON.stringify(msg.published)); } catch {}
          return;
        }
        if (msg === 'published-changed') refresh(); /* תאימות לפורמט הישן */
      };
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
     אין תלות ב-monthPub - כדי לא לדרוס בחירת URL כשהנתונים מגיעים אחרי mount. */
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

  /* היום שמוצג בפועל: מה שהמשתמש בחר, ואם לא בחר - היום המוקדם ביותר עם ציור בחודש. */
  const effectiveDay = selectedDay != null ? selectedDay : firstArtDay(monthPub);
  const pub = effectiveDay != null && monthPub ? monthPub[effectiveDay] : null;

  /* רשימת הימים עם ציור, לניווט בין ציורי אותו חודש */
  const artDaysList = daysWithArt(monthPub);
  const artIdx = pub ? artDaysList.indexOf(effectiveDay) : -1;
  const artTotal = artDaysList.length;
  const prevArtDay = artTotal > 1 ? artDaysList[(artIdx - 1 + artTotal) % artTotal] : null;
  const nextArtDay = artTotal > 1 ? artDaysList[(artIdx + 1) % artTotal] : null;

  /* בכל פעם שהמדיה מתחלפת - מאתחלים את מצב הטעינה. */
  useEffect(() => {
    setMediaLoading(true);
    setMediaError(false);
  }, [pub && pub.artUrl]); // eslint-disable-line react-hooks/exhaustive-deps

  /* סנכרון URL עם המצב - כדי שגם ניווט "חופשי" ייצור קישור שאפשר להעתיק ולשתף. */
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
    /* עדיפות ל-NEXT_PUBLIC_SITE_URL (הפרודקשן), fallback ל-URL הנוכחי.
       ככה שיתוף מטאב-פיתוח לא ישלח קישור לlocalhost. */
    const envUrl = process.env.NEXT_PUBLIC_SITE_URL;
    const root = (envUrl && envUrl.replace(/\/$/, '')) || window.location.origin;
    const base = root + '/c/' + space + '/';
    let shareUrl, title, text;
    if (kind === 'day' && pub) {
      const u = new URL(base);
      u.searchParams.set('m', meta.id);
      u.searchParams.set('d', String(effectiveDay));
      shareUrl = u.toString();
      title = 'לוח תשפ״ז - ' + meta.name;
      text = pub.title + ' · ' + pub.child + ' · לוח תשפ״ז';
    } else {
      shareUrl = base;
      title = 'לוח תשפ״ז';
      text = 'לוח תשפ״ז של משפחות המילואים - מחוז חיפה';
    }
    try {
      if (navigator.share) {
        await navigator.share({ title, text, url: shareUrl });
        return;
      }
    } catch { /* המשתמש ביטל את התפריט - נופלים ל-clipboard */ }
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
    setVoiceTime({ current: 0, duration: 0 });
  }

  function toggleVoice() {
    const a = audioRef.current;
    if (!a) return;
    if (playing) { stopVoice(); return; }
    /* ה-src כבר מוגדר כפרופ; מספיק להפעיל. */
    a.play().then(() => setPlaying(true)).catch(() => setPlaying(false));
  }

  function fmtTime(sec) {
    if (!Number.isFinite(sec) || sec < 0) return '0:00';
    const m = Math.floor(sec / 60);
    const s = Math.floor(sec % 60);
    return m + ':' + (s < 10 ? '0' : '') + s;
  }

  return (
    <>
      {/* src נקבע כפרופ ו-preload=metadata גורם לדפדפן להוריד את החלק הקטן
          עם ה-duration בלי לחכות לקליק — כך רואים את "0:07" מיד. */}
      <audio ref={audioRef}
             src={pub && pub.voiceUrl ? pub.voiceUrl : undefined}
             preload={pub && pub.voiceUrl ? 'metadata' : 'none'}
             onEnded={stopVoice}
             onLoadedMetadata={() => {
               const a = audioRef.current;
               if (a) setVoiceTime((t) => ({ ...t, duration: Number.isFinite(a.duration) ? a.duration : 0 }));
             }}
             onTimeUpdate={() => {
               const a = audioRef.current;
               if (a) setVoiceTime((t) => ({ ...t, current: a.currentTime || 0 }));
             }} />

      {view === 'cover' && (
        <section id="cover" aria-label="שער הלוח">
          <span className="cover-eyebrow"><span className="dot"></span> מרכז ״מגנים על העורף״ · מחוז חיפה</span>
          <h1 className="cover-title">לוח <em>תשפ״ז</em></h1>
          <p className="cover-sub">הסיפור של משפחות המילואים - דרך העיניים של הילדים והילדות</p>
          <p className="cover-sub2">13 חודשים · געגוע, גאווה, אהבה, תקווה וחוסן 🧡</p>

          <div className="mosaic">
            {MONTHS_META.map((m, i) => {
              const monthPub = published[m.id];
              const thumbs = allThumbs(monthPub);
              const count = thumbs.length;
              /* מציין את החודש הראשון (תשרי) כ-featured כדי להעביר את העין אליו. */
              const isFeatured = i === 0;
              return (
                <button key={m.id}
                        className={'tile' + (isFeatured ? ' featured' : '')}
                        style={{ '--tile-hue': m.hue }}
                        aria-label={'פתיחת חודש ' + m.name}
                        onClick={() => { setCur(i); setView('cal'); window.scrollTo(0, 0); }}>
                  {count > 0 && (
                    <span className="tile-count" aria-label={count + ' ציורים בחודש'}>
                      {count} {count === 1 ? 'ציור' : 'ציורים'}
                    </span>
                  )}
                  <TileMedia month={m} thumbs={thumbs} isFeatured={isFeatured} isFirst={i < 3} />
                  <span className="mname">{m.name}</span>
                  {m.essence && <span className="tile-chip">{m.essence}</span>}
                </button>
              );
            })}
          </div>

          <button className="cover-cta" onClick={() => { setCur(0); setView('cal'); }}>פתיחת הלוח 🎨</button>
          <div className="cover-actions">
            {canEdit && (
              <>
                <Link className="cover-share" href={editHref('/submit')}>
                  🎨 הוספת ציור
                </Link>
                <Link className="cover-share" href={editHref('/manage')}>
                  🧩 ניהול הלוח שלי
                </Link>
              </>
            )}
            <button className="cover-share" onClick={() => share('cover')}
                    aria-label="שיתוף הלוח לצפייה בלבד">
              🔗 שיתוף (צפייה בלבד)
            </button>
            <Link className="cover-share" href={spaceBase + '/print'}>
              📄 הורדת הלוח לPDF / הדפסה
            </Link>
          </div>
        </section>
      )}

      {view === 'cal' && (
        <section aria-label="לוח החודש">
          <header className="month-head">
            <div className="month-title-block">
              <h1 className="month">{meta.name} תשפ״ז</h1>
              <div className="greg">{meta.greg}</div>
            </div>
            <div className="month-head-side">
              {/* צ'יפ המותג הפך לקליקבילי - כמו לוגו שמחזיר הביתה */}
              <button className="eyebrow eyebrow-home"
                      onClick={() => setView('cover')}
                      aria-label="חזרה לעמוד הבית">
                <span className="dot"></span> מגנים על העורף · מחוז חיפה · לוח שנה דיגיטלי תשפ״ז
              </button>
            </div>
          </header>

          <nav className="month-tabs" aria-label="ניווט בין חודשים">
            {/* כפתור בית — ראשון בשורה, מובלט בכהה, עם מפריד לפני החודשים */}
            <button className="month-tab month-tab-home"
                    onClick={() => setView('cover')}
                    aria-label="חזרה ללוח תשפ״ז">
              <span aria-hidden="true">⌂</span> לוח תשפ״ז
            </button>
            <span className="month-tabs-divider" aria-hidden="true"></span>
            {MONTHS_META.map((m, i) => (
              <button key={m.id}
                      className={'month-tab' + (i === cur ? ' active' : '')}
                      aria-label={'מעבר לחודש ' + m.name}
                      aria-current={i === cur ? 'page' : undefined}
                      onClick={() => setCur(i)}>
                {m.name}
              </button>
            ))}
          </nav>

          <main className="month-grid">
            <section className="cal-card" aria-label="ימי החודש">
              <div className="cal-head">
                <button className="cal-nav-btn" onClick={() => setCur((cur - 1 + 13) % 13)}
                        aria-label="החודש הקודם"><span aria-hidden="true">→</span> החודש הקודם</button>
                <span className="cal-head-title">
                  {meta.calTitle}
                  {!publishedLoaded && <span className="cal-loading" aria-live="polite"> · טוענים ציורים…</span>}
                </span>
                <button className="cal-nav-btn" onClick={() => setCur((cur + 1) % 13)}
                        aria-label="החודש הבא">החודש הבא <span aria-hidden="true">←</span></button>
              </div>
              <div className={'grid' + (!publishedLoaded ? ' grid-loading' : '')}>
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
                      {h && !dayArt && <span className="day-holiday-name">{h}</span>}
                    </button>
                  );
                })}
              </div>
              <div className="legend">
                <span className="legend-item"><span className="legend-swatch holiday-swatch"></span> חג ומועד</span>
                <span className="legend-item"><span className="legend-swatch art-swatch"></span> ציור של ילד/ה</span>
                <span className="legend-item"><span className="legend-swatch selected-swatch"></span> יום נבחר</span>
                <span className="legend-item legend-note">שאר הימים - פנויים לציור חדש <span className="legend-heart" aria-hidden="true">💗</span></span>
              </div>
            </section>

            <div className="art-column">
            <section className="art-card" aria-label="ציור היום">
              <div className="frame">
                {pub ? (
                  <>
                    {mediaLoading && !mediaError && (
                      <div className="media-loading" aria-live="polite">
                        <div className="media-skeleton" aria-hidden="true"></div>
                        <div className="media-hint">
                          <span className="loading-dot"></span>
                          <span className="loading-dot"></span>
                          <span className="loading-dot"></span>
                          <span>טוענים את הציור…</span>
                        </div>
                      </div>
                    )}
                    {pub.mediaType === 'video' ? (
                      <>
                        {!mediaLoading && <div className="live-badge"><span className="pulse"></span> הציור מתעורר לחיים</div>}
                        {/* poster = תמונת הציור הסטטית. הדפדפן מציג אותה עד שהוידאו מתחיל,
                            וגם אם הוידאו נכשל (או פגום ומציג שחור) — לפחות רואים את הציור. */}
                        <video key={pub.artUrl} autoPlay muted loop playsInline
                               src={pub.artUrl}
                               poster={pub.thumbUrl}
                               aria-label={'הציור ' + pub.title + ' מתעורר לחיים'}
                               style={{ opacity: mediaLoading ? 0 : 1, transition: 'opacity .25s ease', background: '#fff' }}
                               ref={(el) => {
                                 /* וידאו שכבר buffered מה-cache — האירוע נורה לפני שהחיבור קרה */
                                 if (el && el.readyState >= 3 && mediaLoading) setMediaLoading(false);
                               }}
                               onCanPlay={() => setMediaLoading(false)}
                               onError={() => { setMediaLoading(false); setMediaError(true); }} />
                      </>
                    ) : (
                      <img src={pub.artUrl} alt={'הציור ' + pub.title + ' מאת ' + pub.child}
                           style={{ opacity: mediaLoading ? 0 : 1, transition: 'opacity .25s ease' }}
                           ref={(el) => {
                             /* תמונה מ-cache מסיימת להיטען לפני ש-React חיבר את onLoad —
                                בדיקת complete מנקה את מצב הטעינה שהיה נתקע לנצח */
                             if (el && el.complete && el.naturalWidth > 0 && mediaLoading) setMediaLoading(false);
                           }}
                           onLoad={() => setMediaLoading(false)}
                           onError={() => { setMediaLoading(false); setMediaError(true); }} />
                    )}
                  </>
                ) : null}
                {pub && mediaError && (
                  <div className="media-error">
                    <span className="emoji">📡</span>
                    <span>לא הצלחנו לטעון את הציור כרגע</span>
                    <button className="link-btn" onClick={() => { setMediaError(false); setMediaLoading(true); }}>
                      ניסיון נוסף
                    </button>
                  </div>
                )}
                {!pub && (
                  <div className="waiting">
                    <span className="emoji">✏️</span>
                    <span>רוצים ציור שלכם על הלוח?</span>
                    <small>
                      {effectiveDay
                        ? <>יום {effectiveDay} ב{meta.name} עדיין פנוי. שלחו לנו ציור, שם פרטי, גיל והקדשה קצרה - ואם הצוות יאשר, הציור יופיע כאן על הלוח לכל השכונה.</>
                        : <>ב{meta.name} עדיין יש ימים פנויים. שלחו לנו ציור, שם פרטי, גיל והקדשה קצרה - ואם הצוות יאשר, הציור יופיע כאן על הלוח לכל השכונה.</>}
                    </small>
                    {canEdit && <Link className="cta waiting-cta" href={editHref('/submit')}>שליחת ציור והקלטה</Link>}
                    <small>מועד אחרון למשלוח: <b>{DEADLINE}</b> · <b>נדרשת הסכמת ההורה</b></small>
                  </div>
                )}
              </div>

              {pub && artTotal > 1 && (
                <div className="art-nav" aria-label="ניווט בין הציורים בחודש">
                  <button className="art-nav-btn" onClick={() => setSelectedDay(prevArtDay)}
                          aria-label="הציור הקודם">
                    <span aria-hidden="true">→</span> הקודם
                  </button>
                  <span className="art-nav-count">
                    ציור <b>{artIdx + 1}</b> מתוך <b>{artTotal}</b> ב{meta.name}
                  </span>
                  <button className="art-nav-btn" onClick={() => setSelectedDay(nextArtDay)}
                          aria-label="הציור הבא">
                    הבא <span aria-hidden="true">←</span>
                  </button>
                </div>
              )}

              {pub && (
                <div className="art-meta">
                  <div className="art-title">{pub.title}</div>
                  <span className="art-child">{pub.child}</span>
                  <p className="art-dedication">{pub.dedication}</p>
                  {pub.voiceUrl && (
                    <div className={'voice' + (playing ? ' playing' : '')}>
                      <button className="play-btn" onClick={toggleVoice}>
                        <span className="tri" aria-hidden="true"></span>
                        <span>{playing ? 'עצירה' : 'להשמיע את הקול של ' + pub.child.split(',')[0]}</span>
                      </button>
                      <div className="voice-progress" aria-hidden="true">
                        <div className="voice-bar">
                          <div className="voice-bar-fill"
                               style={{ width: voiceTime.duration > 0
                                 ? Math.min(100, (voiceTime.current / voiceTime.duration) * 100) + '%'
                                 : '0%' }} />
                        </div>
                        <span className="voice-time">
                          {fmtTime(voiceTime.current)} / {fmtTime(voiceTime.duration)}
                        </span>
                      </div>
                    </div>
                  )}
                  <button className="share-btn" onClick={() => share('day')}
                          aria-label={'שיתוף הציור של ' + pub.child.split(',')[0]}>
                    <span aria-hidden="true">↗</span> שיתוף הציור של {pub.child.split(',')[0]}
                  </button>
                </div>
              )}
            </section>

            {Object.keys(meta.holidays).length > 0 && (
              <section className="holiday-card" aria-label="חגי החודש">
                <div className="holiday-card-title"><b>🧡</b> חגי החודש</div>
                <div className="holiday-card-list">
                  {groupHolidays(meta.holidays).map((g, i) => (
                    <div key={i}><span>{g.range}</span> - {g.name}</div>
                  ))}
                </div>
                <div className="holiday-legend">{HOLIDAY_LEGEND}</div>
              </section>
            )}
            </div>
          </main>
        </section>
      )}

      {shareToast && <div className="share-toast">{shareToast}</div>}
    </>
  );
}

/* מדיה של אריח חודש: קרוסלה של כל הציורים בחודש עם cross-fade וסקלטון טעינה.
   thumbs = מערך של URLs, ריק = מציג את מצב "הציור בדרך". */
function TileMedia({ month, thumbs, isFeatured, isFirst }) {
  const [idx, setIdx] = useState(0);
  const [loadedSet, setLoadedSet] = useState(() => new Set());

  /* רוטציה אוטומטית — כל 2.5 שניות, רק אם יש יותר מציור אחד */
  useEffect(() => {
    if (thumbs.length <= 1) return;
    const t = setInterval(() => setIdx((i) => (i + 1) % thumbs.length), 2500);
    return () => clearInterval(t);
  }, [thumbs.length]);

  /* אם רשימת ה-thumbs השתנתה (עדכון מהשרת) — מאפס את האינדקס */
  useEffect(() => { setIdx(0); }, [thumbs.join('|')]); // eslint-disable-line react-hooks/exhaustive-deps

  if (thumbs.length === 0) {
    return (
      <div className="tile-media empty">
        <span className="tile-pencil-circle" aria-hidden="true">
          <span className="tile-pencil">✏️</span>
        </span>
        <span className="tile-hint">הציור בדרך</span>
      </div>
    );
  }

  const currentThumb = thumbs[idx];
  const isCurrentLoaded = loadedSet.has(currentThumb);

  return (
    <div className="tile-media has-art">
      {/* סקלטון עד שהתמונה הראשונה טעונה */}
      {!isCurrentLoaded && <div className="tile-skeleton" aria-hidden="true" />}

      {/* כל התמונות מצולמות מעל, רק הנוכחית עם opacity 1 → cross-fade */}
      {thumbs.map((thumb, i) => {
        const isCurrent = i === idx;
        return (
          <img key={thumb}
               className={'tile-thumb' + (isCurrent ? ' show' : '')}
               src={thumb}
               alt={i === 0 ? 'ציור בחודש ' + month.name : ''}
               loading={(isFeatured && i === 0) || (isFirst && i === 0) ? 'eager' : 'lazy'}
               fetchPriority={isFeatured && i === 0 ? 'high' : 'auto'}
               decoding="async"
               ref={(el) => {
                 /* תמונה מ-cache — load עלול להישרף לפני חיבור ה-handler */
                 if (el && el.complete && el.naturalWidth > 0 && !loadedSet.has(thumb)) {
                   setLoadedSet((prev) => {
                     if (prev.has(thumb)) return prev;
                     const next = new Set(prev); next.add(thumb); return next;
                   });
                 }
               }}
               onLoad={() => setLoadedSet((prev) => {
                 if (prev.has(thumb)) return prev;
                 const next = new Set(prev); next.add(thumb); return next;
               })} />
        );
      })}

      {/* נקודות אינדיקציה בתחתית אם יש כמה ציורים */}
      {thumbs.length > 1 && (
        <div className="tile-dots" aria-hidden="true">
          {thumbs.map((_, i) => (
            <span key={i} className={'tile-dot' + (i === idx ? ' on' : '')} />
          ))}
        </div>
      )}
    </div>
  );
}
