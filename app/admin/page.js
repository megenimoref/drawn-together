'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import Link from 'next/link';
import { upload } from '@vercel/blob/client';
import { MONTHS_META, groupHolidays, HOLIDAY_LEGEND } from '../../lib/months';
import { toWebmVideo } from '../../lib/media-client';

const DOWS = ['א׳', 'ב׳', 'ג׳', 'ד׳', 'ה׳', 'ו׳', 'ש׳'];

function daysWithArt(monthPublished) {
  if (!monthPublished) return [];
  return Object.keys(monthPublished).map(Number).filter((d) => Number.isInteger(d)).sort((a, b) => a - b);
}

function firstArtDay(monthPublished) {
  const list = daysWithArt(monthPublished);
  return list.length ? list[0] : null;
}

export default function AdminPage() {
  /* auth */
  const [authed, setAuthed] = useState(false);
  const [password, setPassword] = useState('');
  const [loginError, setLoginError] = useState('');

  /* data */
  const [subs, setSubs] = useState([]);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [flash, setFlash] = useState('');

  /* navigation */
  const [cur, setCur] = useState(0);
  const [selectedDay, setSelectedDay] = useState(null);

  /* panels */
  const [editingDay, setEditingDay] = useState(null); /* number | null */
  const [bankOpen, setBankOpen] = useState(false);
  const [showRejected, setShowRejected] = useState(false);

  /* פעולת וידאו פעילה — כדי להראות מצב "מעבד" בתוך פאנל היום */
  const [videoStage, setVideoStage] = useState(''); /* '' | 'transcoding' | 'uploading' */

  /* drag state */
  const [dragOverDay, setDragOverDay] = useState(null);
  const draggingRef = useRef(null);
  const videoInputs = useRef({});

  async function loadSubs() {
    /* קווסטרינג _t חוסם cache של דפדפן במקרה שכותרות Cache-Control לא כובדו */
    const r = await fetch('/api/admin/submissions?_t=' + Date.now(), { cache: 'no-store' });
    if (r.status === 401) { setAuthed(false); return; }
    if (r.ok) { setSubs(await r.json()); setAuthed(true); }
  }

  /* טעינה מאוחרת: לאחר מוטציה, נותנים ל-Vercel Blob זמן להתפשט (~3s)
     לפני שקוראים מחדש — אחרת הקריאה תחזיר תוכן ישן ותדרוס עדכון אופטימי. */
  const reloadTimerRef = useRef(null);
  function scheduleReload(delayMs = 3500) {
    if (reloadTimerRef.current) clearTimeout(reloadTimerRef.current);
    reloadTimerRef.current = setTimeout(() => { loadSubs(); reloadTimerRef.current = null; }, delayMs);
  }

  /* מסמן שצריך לשדר לטאב הציבורי. השידור עצמו קורה ב-useEffect (למטה)
     אחרי שה-published הנגזר התעדכן מהעדכון האופטימי — כך נשלחים הנתונים
     הטריים עצמם, בלי תלות ב-Blob CDN שמחזיר גרסה ישנה מיד אחרי כתיבה. */
  const shouldBroadcastRef = useRef(false);
  function broadcastChange() { shouldBroadcastRef.current = true; }

  useEffect(() => { loadSubs(); }, []);

  async function login(e) {
    e.preventDefault();
    setLoginError('');
    const r = await fetch('/api/admin/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ password })
    });
    if (r.ok) { setPassword(''); await loadSubs(); }
    else {
      const j = await r.json().catch(() => ({}));
      setLoginError(j.error || 'ההתחברות נכשלה');
    }
  }

  /* מייצרים published-view מתוך subs - כדי לראות בדיוק כמו הציבורי */
  const published = useMemo(() => {
    const map = {};
    for (const s of subs) {
      if (s.status !== 'approved' || !s.month || !s.day) continue;
      if (!map[s.month]) map[s.month] = {};
      const videoUrl = s.videoUrl || null;
      map[s.month][s.day] = {
        title: '״' + s.artTitle + '״',
        child: s.childName + ', גיל ' + s.age,
        dedication: s.dedication,
        mediaType: videoUrl ? 'video' : 'image',
        artUrl: videoUrl || s.artUrl,
        thumbUrl: s.artUrl,
        voiceUrl: s.voiceUrl || null,
        subId: s.id
      };
    }
    return map;
  }, [subs]);

  /* שידור הנתונים הטריים לטאב הציבורי — רץ אחרי כל שינוי ב-published,
     אבל רק אם מוטציה סימנה שיש מה לשדר (לא על טעינות רקע). */
  useEffect(() => {
    if (!shouldBroadcastRef.current) return;
    shouldBroadcastRef.current = false;
    try {
      if (typeof BroadcastChannel !== 'undefined') {
        const bc = new BroadcastChannel('drawn-together');
        bc.postMessage({ type: 'published-changed', published });
        bc.close();
      }
    } catch {}
  }, [published]);

  const meta = MONTHS_META[cur];
  const monthPub = published[meta.id];

  useEffect(() => {
    setSelectedDay(firstArtDay(monthPub));
  }, [cur, subs.length]); // eslint-disable-line react-hooks/exhaustive-deps

  /* כולל גם הגשות שאושרו במודל הישן (בלי day) - כדי שיהיה אפשר לשבץ אותן מחדש. */
  const pending = useMemo(() => subs.filter((s) => s.status === 'pending' || (s.status === 'approved' && (!s.month || !s.day))), [subs]);
  const rejected = useMemo(() => subs.filter((s) => s.status === 'rejected'), [subs]);
  const subsById = useMemo(() => {
    const m = {};
    for (const s of subs) m[s.id] = s;
    return m;
  }, [subs]);

  const assignedCount = useMemo(() => subs.filter((s) => s.status === 'approved' && s.month && s.day).length, [subs]);

  function showFlash(msg) {
    setFlash(msg);
    setTimeout(() => setFlash(''), 2400);
  }

  async function assignPending(sub, monthId, dayNum) {
    setError('');
    setBusy(true);
    try {
      let videoUrl = null;
      const vidInput = videoInputs.current[sub.id];
      if (vidInput && vidInput.files && vidInput.files[0]) {
        const f = vidInput.files[0];
        const vb = await upload('published/' + sub.id + '/art.mp4', f, {
          access: 'public',
          handleUploadUrl: '/api/upload'
        });
        videoUrl = vb.url;
      }
      /* עדכון אופטימי - משתקף מיד; אם היעד תפוס, התופס חוזר לממתין */
      setSubs((prev) => {
        const occ = prev.find((s) => s.id !== sub.id && s.status === 'approved' && s.month === monthId && Number(s.day) === Number(dayNum));
        return prev.map((s) => {
          if (s.id === sub.id) return { ...s, month: monthId, day: Number(dayNum), status: 'approved', videoUrl: videoUrl || s.videoUrl };
          if (occ && s.id === occ.id) return { ...s, month: null, day: null, status: 'pending' };
          return s;
        });
      });
      const r = await fetch('/api/admin/move', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'move', id: sub.id, toMonth: monthId, toDay: dayNum, videoUrl })
      });
      if (!r.ok) throw new Error((await r.json().catch(() => ({}))).error || 'הפעולה נכשלה');
      broadcastChange();
      const monthName = (MONTHS_META.find((m) => m.id === monthId) || {}).name;
      showFlash('שובץ ל-' + dayNum + ' ' + monthName + ' ✓');
      setSelectedDay(dayNum);
      setEditingDay(null);
      setBankOpen(false);
      /* לא קוראים ל-loadSubs אחרי הצלחה: העדכון האופטימי מדויק,
         ו-Blob CDN עלול להחזיר גרסה ישנה שתדרוס אותו. */
    } catch (err) {
      setError(String(err?.message || err));
      loadSubs();
    } finally {
      setBusy(false);
    }
  }

  async function moveTo(subId, toMonth, toDay) {
    setError('');
    setBusy(true);
    /* עדכון אופטימי - כולל החלפה (swap): התופס עובר למקום הישן של הנגררת */
    setSubs((prev) => {
      const sub = prev.find((s) => s.id === subId);
      const fromMonth = sub?.month || null;
      const fromDay = sub?.day ? Number(sub.day) : null;
      const occ = prev.find((s) => s.id !== subId && s.status === 'approved' && s.month === toMonth && Number(s.day) === Number(toDay));
      return prev.map((s) => {
        if (s.id === subId) return { ...s, month: toMonth, day: Number(toDay), status: 'approved' };
        if (occ && s.id === occ.id) {
          if (fromMonth && fromDay) return { ...s, month: fromMonth, day: fromDay, status: 'approved' };
          return { ...s, month: null, day: null, status: 'pending' };
        }
        return s;
      });
    });
    try {
      const r = await fetch('/api/admin/move', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'move', id: subId, toMonth, toDay })
      });
      if (!r.ok) throw new Error((await r.json().catch(() => ({}))).error || 'הפעולה נכשלה');
      broadcastChange();
      const monthName = (MONTHS_META.find((m) => m.id === toMonth) || {}).name;
      showFlash('עברה ל-' + toDay + ' ' + monthName + ' ✓');
      /* לא קוראים ל-loadSubs אחרי הצלחה: העדכון האופטימי מדויק,
         ו-Blob CDN עלול להחזיר גרסה ישנה שתדרוס אותו. */
    } catch (err) {
      setError(String(err?.message || err));
      loadSubs();
    } finally {
      setBusy(false);
    }
  }

  async function updateVideo(subId, file) {
    const sub = subsById[subId];
    if (!sub || !sub.month || !sub.day) return;
    setError('');
    setBusy(true);
    setVideoStage('transcoding');
    try {
      /* המרה ל-WebM חסכוני לפני העלאה. */
      let uploadBlob = file;
      try {
        uploadBlob = await toWebmVideo(file, { maxWidth: 1280, fps: 24, videoBitrate: 800000 });
      } catch { /* fallback: מעלים את הקובץ המקורי */ }

      /* בטיחות: אם הבלוב ריק, נעצור מוקדם עם שגיאה ברורה */
      if (!uploadBlob || uploadBlob.size === 0) {
        throw new Error('הקובץ ריק אחרי ההמרה — כנראה שהוידאו לא נטען כראוי');
      }
      console.log('[updateVideo] העלאה', { size: uploadBlob.size, type: uploadBlob.type });

      setVideoStage('uploading');
      const vb = await upload('published/' + subId + '/art.webm', uploadBlob, {
        access: 'public',
        handleUploadUrl: '/api/upload'
      });
      const videoUrl = vb && vb.url;
      if (!videoUrl) {
        throw new Error('לא התקבל URL מהעלאה');
      }
      console.log('[updateVideo] הועלה', videoUrl);
      setSubs((prev) => prev.map((s) => s.id === subId ? { ...s, videoUrl } : s));
      const r = await fetch('/api/admin/move', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'move', id: subId, toMonth: sub.month, toDay: sub.day, videoUrl })
      });
      if (!r.ok) throw new Error((await r.json().catch(() => ({}))).error || 'הפעולה נכשלה');
      broadcastChange();
      showFlash('וידאו מונפש הועלה ✓');
      /* לא קוראים ל-loadSubs אחרי הצלחה — Blob CDN עלול להחזיר גרסה ישנה */
    } catch (err) {
      setError('העלאת הווידאו נכשלה: ' + String(err?.message || err));
      loadSubs();
    } finally {
      setBusy(false);
      setVideoStage('');
    }
  }

  async function clearVideo(subId) {
    const sub = subsById[subId];
    if (!sub || !sub.month || !sub.day) return;
    if (!confirm('להסיר את הווידאו המונפש? התמונה תחזור להיות סטטית.')) return;
    setError('');
    setBusy(true);
    setSubs((prev) => prev.map((s) => s.id === subId ? { ...s, videoUrl: null } : s));
    try {
      const r = await fetch('/api/admin/move', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'move', id: subId, toMonth: sub.month, toDay: sub.day, clearVideo: true })
      });
      if (!r.ok) throw new Error((await r.json().catch(() => ({}))).error || 'הפעולה נכשלה');
      broadcastChange();
      showFlash('הווידאו הוסר ✓');
      /* לא קוראים ל-loadSubs אחרי הצלחה: העדכון האופטימי מדויק,
         ו-Blob CDN עלול להחזיר גרסה ישנה שתדרוס אותו. */
    } catch (err) {
      setError(String(err?.message || err));
      loadSubs();
    } finally {
      setBusy(false);
    }
  }

  async function unassign(subId) {
    if (!confirm('להוריד את הציור מהלוח? ההגשה תחזור לרשימת הממתינות.')) return;
    setError('');
    setBusy(true);
    /* עדכון אופטימי - משתקף מיד ב-UI, גם אם ה-Blob CDN מתעכב */
    setSubs((prev) => prev.map((s) => s.id === subId ? { ...s, month: null, day: null, status: 'pending' } : s));
    try {
      const r = await fetch('/api/admin/move', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'unassign', id: subId })
      });
      if (!r.ok) throw new Error((await r.json().catch(() => ({}))).error || 'הפעולה נכשלה');
      broadcastChange();
      showFlash('הוסר מהלוח ✓');
      setEditingDay(null);
      /* לא קוראים ל-loadSubs אחרי הצלחה: העדכון האופטימי מדויק,
         ו-Blob CDN עלול להחזיר גרסה ישנה שתדרוס אותו. */
    } catch (err) {
      setError(String(err?.message || err));
      loadSubs();
    } finally {
      setBusy(false);
    }
  }

  async function reject(sub) {
    if (!confirm('לדחות את ההגשה של ' + sub.childName + '?')) return;
    setError('');
    setBusy(true);
    try {
      const r = await fetch('/api/admin/decide', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: sub.id, action: 'reject' })
      });
      if (!r.ok) throw new Error((await r.json().catch(() => ({}))).error || 'הפעולה נכשלה');
      /* עדכון אופטימי לדחייה */
      setSubs((prev) => prev.map((s) => s.id === sub.id ? { ...s, status: 'rejected', month: null, day: null } : s));
      showFlash('נדחתה');
      /* לא קוראים ל-loadSubs אחרי הצלחה: העדכון האופטימי מדויק,
         ו-Blob CDN עלול להחזיר גרסה ישנה שתדרוס אותו. */
    } catch (err) {
      setError(String(err?.message || err));
      loadSubs();
    } finally {
      setBusy(false);
    }
  }

  /* --- drag & drop של הגשות ממתינות לימים --- */
  function onDragStart(e, subId, source) {
    draggingRef.current = { subId, source };
    e.dataTransfer.effectAllowed = 'move';
    e.dataTransfer.setData('text/plain', subId);
  }
  function onDragEnd() {
    draggingRef.current = null;
    setDragOverDay(null);
  }
  function onDayDragOver(e, dayNum) {
    if (!draggingRef.current) return;
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
    setDragOverDay(dayNum);
  }
  function onDayDrop(e, dayNum) {
    e.preventDefault();
    const drag = draggingRef.current;
    setDragOverDay(null);
    if (!drag) return;
    const sub = subsById[drag.subId];
    if (!sub) return;
    if (drag.source === 'pending') assignPending(sub, meta.id, dayNum);
    else moveTo(sub.id, meta.id, dayNum);
  }

  if (!authed) {
    return (
      <div className="admin-login">
        <h1>כניסת צוות 🧡</h1>
        <form onSubmit={login}>
          <input type="password" placeholder="סיסמת ניהול" value={password}
                 onChange={(e) => setPassword(e.target.value)} autoFocus />
          <button className="submit-btn" type="submit">כניסה</button>
        </form>
        {loginError && <div className="form-error" style={{ marginTop: 14 }}>{loginError}</div>}
        {/* <p className="admin-note">הסיסמה מוגדרת במשתנה הסביבה ADMIN_PASSWORD.</p> */}
        <p><Link className="back-link" href="/">← חזרה ללוח</Link></p>
      </div>
    );
  }

  const pub = selectedDay != null && monthPub ? monthPub[selectedDay] : null;
  const pubSub = pub ? subsById[pub.subId] : null;

  return (
    <div>
      <header className="month-head admin-mode">
        <div className="month-title-block">
          <h1 className="month">{meta.name} תשפ״ז</h1>
          <div className="greg">{meta.greg}</div>
        </div>
        <div className="month-head-side">
          <span className="eyebrow admin-eyebrow">
            <span className="dot"></span> מצב ניהול · {assignedCount} שיבוצים · {pending.length} ממתינות
          </span>
        </div>
      </header>

      <nav className="month-tabs" aria-label="ניווט בין חודשים">
        {/* בניהול, כפתור הבית מוביל ללוח הציבורי */}
        <Link className="month-tab month-tab-home" href="/"
              aria-label="מעבר ללוח הציבורי">
          <span aria-hidden="true">⌂</span> לוח תשפ״ז
        </Link>
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

      {error && <div className="form-error">{error}</div>}
      {flash && <div className="flash-msg">{flash}</div>}

      <main className="month-grid">
        <section className="cal-card" aria-label="ימי החודש">
          <div className="cal-head">
            <button className="cal-nav-btn" onClick={() => setCur((cur - 1 + 13) % 13)}
                    aria-label="החודש הקודם"><span aria-hidden="true">→</span> החודש הקודם</button>
            <span className="cal-head-title">{meta.calTitle}</span>
            <button className="cal-nav-btn" onClick={() => setCur((cur + 1) % 13)}
                    aria-label="החודש הבא">החודש הבא <span aria-hidden="true">←</span></button>
          </div>
          <div className="grid">
            {DOWS.map((d) => <div key={d} className="dow">{d}</div>)}
            {Array.from({ length: meta.startDow }).map((_, i) => <div key={'e' + i} className="day empty" />)}
            {Array.from({ length: meta.days }).map((_, i) => {
              const d = i + 1;
              const h = meta.holidays[d];
              const dayArt = monthPub ? monthPub[d] : null;
              const isSelected = d === selectedDay;
              const isDragOver = d === dragOverDay;
              const cls = 'day clickable admin-day'
                + (h ? ' holiday' : '')
                + (dayArt ? ' has-art' : ' vacant')
                + (isSelected ? ' selected' : '')
                + (isDragOver ? ' drop-target' : '');
              return (
                <button key={d} type="button" className={cls}
                        title={h || undefined}
                        draggable={!!dayArt}
                        onDragStart={dayArt ? (e) => onDragStart(e, dayArt.subId, 'day') : undefined}
                        onDragEnd={onDragEnd}
                        onDragOver={(e) => onDayDragOver(e, d)}
                        onDragLeave={() => setDragOverDay(null)}
                        onDrop={(e) => onDayDrop(e, d)}
                        onClick={() => { setSelectedDay(d); setEditingDay(d); }}>
                  {dayArt && <img className="day-thumb" src={dayArt.thumbUrl} alt="" draggable={false} />}
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
            <span className="legend-item legend-note">לחיצה על יום — עריכת שיבוץ ✎</span>
          </div>
        </section>

        <div className="art-column">
        <section className="art-card" aria-label="ציור היום">
          <div className="frame">
            {pub ? (
              pub.mediaType === 'video' ? (
                <video key={pub.artUrl} autoPlay muted loop playsInline
                       src={pub.artUrl} poster={pub.thumbUrl}
                       style={{ background: '#fff' }}
                       aria-label={pub.title} />
              ) : (
                <img src={pub.artUrl} alt={pub.title} />
              )
            ) : (
              <div className="waiting">
                <span className="emoji">✏️</span>
                <span>{selectedDay ? 'יום ' + selectedDay + ' עוד ריק' : 'החודש עוד ריק'}</span>
                <small>לחצו על יום כדי לשבץ אליו הגשה ממתינה, או גררו כרטיס מבנק ההגשות.</small>
              </div>
            )}
          </div>

          {pub && pubSub && (
            <div className="art-meta">
              <div className="art-title">{pub.title}</div>
              <span className="art-child">{pub.child}</span>
              <p className="art-dedication">{pub.dedication}</p>
              <p className="admin-note" style={{ fontSize: '.85rem' }}>
                הורה: {pubSub.parentName} · {pubSub.phone} · {pubSub.email}
              </p>
              <div className="sub-actions" style={{ marginTop: 10 }}>
                <button className="btn approve" onClick={() => setEditingDay(selectedDay)}>עריכת שיבוץ</button>
                <button className="btn reject" onClick={() => unassign(pubSub.id)}>הסרה מהיום</button>
              </div>
            </div>
          )}
        </section>

        {Object.keys(meta.holidays).length > 0 && (
          <section className="holiday-card" aria-label="חגי החודש">
            <div className="holiday-card-title"><b>🧡</b> חגי החודש</div>
            <div className="holiday-card-list">
              {groupHolidays(meta.holidays).map((g, i) => (
                <div key={i}><span>{g.range}</span> — {g.name}</div>
              ))}
            </div>
            <div className="holiday-legend">{HOLIDAY_LEGEND}</div>
          </section>
        )}
        </div>
      </main>

      {/* כפתור צף לפתיחת בנק ההגשות הממתינות */}
      <button className="bank-fab" onClick={() => setBankOpen(true)}>
        📥 <b>{pending.length}</b> ממתינות
      </button>

      {/* פאנל צד: הגשות ממתינות - ללא backdrop כדי שהלוח יישאר זמין לגרירה */}
      {bankOpen && (
        <>
          <aside className="bank-drawer" onDragOver={(e) => e.preventDefault()}>
            <button className="detail-close" onClick={() => setBankOpen(false)} aria-label="סגירה">✕</button>
            <div className="ap-eyebrow">הגשות ממתינות · {pending.length}</div>
            <p className="admin-note" style={{ marginTop: 4 }}>
              גררו כרטיס על יום בלוח, או בחרו יעד מתוך הכרטיס.
            </p>
            {pending.length === 0 ? (
              <div className="bank-empty">אין הגשות ממתינות כרגע 🧡</div>
            ) : (
              <ul className="bank-list">
                {pending.map((s) => (
                  <PendingCard key={s.id} sub={s}
                    published={published}
                    busy={busy}
                    onDragStart={(e) => onDragStart(e, s.id, 'pending')}
                    onDragEnd={onDragEnd}
                    onAssign={(monthId, dayNum) => assignPending(s, monthId, dayNum)}
                    onReject={() => reject(s)}
                    videoInputs={videoInputs} />
                ))}
              </ul>
            )}
            {rejected.length > 0 && (
              <div className="rejected-toggle" style={{ marginTop: 22 }}>
                <button className="link-btn" onClick={() => setShowRejected((v) => !v)}>
                  {showRejected ? 'הסתרת נדחות' : 'הצגת ' + rejected.length + ' הגשות שנדחו'}
                </button>
                {showRejected && (
                  <div className="sub-list" style={{ opacity: .7 }}>
                    {rejected.map((s) => (
                      <article key={s.id} className="sub-card">
                        <div><img src={s.artUrl} alt={s.childName} /></div>
                        <div>
                          <span className="status-tag rejected">נדחה</span>
                          <h3>״{s.artTitle}״</h3>
                          <div className="meta">{s.childName}, גיל {s.age}</div>
                        </div>
                      </article>
                    ))}
                  </div>
                )}
              </div>
            )}
          </aside>
        </>
      )}

      {/* פאנל עריכת יום */}
      {editingDay != null && (
        <DayEditPanel
          monthMeta={meta}
          day={editingDay}
          monthPub={monthPub}
          pubSub={monthPub && monthPub[editingDay] ? subsById[monthPub[editingDay].subId] : null}
          pending={pending}
          published={published}
          busy={busy}
          onClose={() => setEditingDay(null)}
          onAssign={(sub, monthId, dayNum) => assignPending(sub, monthId, dayNum)}
          onMove={(subId, toMonth, toDay) => moveTo(subId, toMonth, toDay)}
          onUnassign={(subId) => unassign(subId)}
          onReject={reject}
          onUpdateVideo={updateVideo}
          onClearVideo={clearVideo}
          videoStage={videoStage}
          videoInputs={videoInputs} />
      )}
    </div>
  );
}

function PendingCard({ sub, published, busy, onDragStart, onDragEnd, onAssign, onReject, videoInputs }) {
  const [openTarget, setOpenTarget] = useState(false);
  /* דיפולט: אם ההגשה כבר שויכה בעבר לחודש/יום - נשמור אותו כנקודת מוצא. */
  const [selM, setSelM] = useState(sub.month || '');
  const [selD, setSelD] = useState(sub.day ? String(sub.day) : '');

  const monthMeta = selM ? MONTHS_META.find((m) => m.id === selM) : null;

  return (
    <li className="bank-card"
        draggable
        onDragStart={onDragStart}
        onDragEnd={onDragEnd}>
      <img src={sub.artUrl} alt={sub.childName} draggable={false} />
      <div>
        <div className="bank-name">{sub.childName}, {sub.age}</div>
        <div className="bank-title">״{sub.artTitle}״</div>
        <div className="pending-actions">
          {!openTarget ? (
            <>
              <button className="link-btn" onClick={() => setOpenTarget(true)} disabled={busy}>+ שיבוץ ליום…</button>
              <button className="link-btn danger" onClick={onReject} disabled={busy}>דחייה</button>
            </>
          ) : (
            <div className="target-picker">
              <select value={selM} onChange={(e) => { setSelM(e.target.value); setSelD(''); }}>
                <option value="" disabled>חודש…</option>
                {MONTHS_META.map((m) => <option key={m.id} value={m.id}>{m.name}</option>)}
              </select>
              <select value={selD} onChange={(e) => setSelD(e.target.value)} disabled={!monthMeta}>
                <option value="" disabled>יום…</option>
                {monthMeta && Array.from({ length: monthMeta.days }).map((_, i) => {
                  const d = i + 1;
                  const taken = published[selM] && published[selM][d];
                  return <option key={d} value={d}>{d}{taken ? ' (יחליף)' : ''}</option>;
                })}
              </select>
              <button className="btn approve small" disabled={busy || !selM || !selD}
                      onClick={() => onAssign(selM, Number(selD))}>שיבוץ ✓</button>
              <button className="link-btn" onClick={() => setOpenTarget(false)}>ביטול</button>
            </div>
          )}
        </div>
        <div className="video-opt" style={{ fontSize: '.75rem', marginTop: 6 }}>
          🎬 וידאו:{' '}
          <input type="file" accept="video/mp4,video/webm"
                 ref={(el) => { videoInputs.current[sub.id] = el; }} />
        </div>
      </div>
    </li>
  );
}

function DayEditPanel({ monthMeta, day, monthPub, pubSub, pending, published, busy,
                        onClose, onAssign, onMove, onUnassign, onReject, onUpdateVideo, onClearVideo, videoStage, videoInputs }) {
  const dayArt = monthPub ? monthPub[day] : null;
  /* דיפולט לשדות "העברה" - התאריך הנוכחי של השיבוץ, כך שרואים איפה זה עכשיו וצריך רק לשנות מה שרוצים. */
  const [moveM, setMoveM] = useState(monthMeta.id);
  const [moveD, setMoveD] = useState(String(day));
  const moveMonthMeta = MONTHS_META.find((m) => m.id === moveM);
  const noChange = moveM === monthMeta.id && Number(moveD) === day;
  const videoRef = useRef(null);
  const hasVideo = !!(pubSub && pubSub.videoUrl);

  return (
    <div className="detail-backdrop" onClick={onClose}>
      <aside className="detail-panel" onClick={(e) => e.stopPropagation()}>
        <button className="detail-close" onClick={onClose} aria-label="סגירה">✕</button>
        <div className="ap-eyebrow">
          {monthMeta.name} תשפ״ז · יום {day}
          {monthMeta.holidays[day] && <> · {monthMeta.holidays[day]}</>}
        </div>

        {dayArt && pubSub ? (
          <article className="sub-card">
            <div>
              <img src={dayArt.thumbUrl} alt={pubSub.childName} />
              {pubSub.voiceUrl && <audio controls src={pubSub.voiceUrl} style={{ width: '100%', marginTop: 8 }} />}
            </div>
            <div>
              <span className="status-tag approved">משובץ</span>
              <h3>{dayArt.title}</h3>
              <div className="meta">
                {pubSub.childName}, גיל {pubSub.age}<br />
                הורה: {pubSub.parentName} · {pubSub.phone} · {pubSub.email}
              </div>
              <p className="ded">{dayArt.dedication}</p>

              <div className="edit-block">
                <div className="ap-eyebrow small">🎬 וידאו מונפש</div>
                {videoStage ? (
                  <div className="video-processing">
                    <span className="video-spinner" aria-hidden="true"></span>
                    <div>
                      <strong>
                        {videoStage === 'transcoding' ? 'ממירים את הווידאו ל-WebM חסכוני…' : 'מעלים לענן…'}
                      </strong>
                      <small>
                        {videoStage === 'transcoding'
                          ? 'ההמרה לוקחת בערך את משך הווידאו עצמו. אל תסגרו את החלון.'
                          : 'רגע אחד — כמעט שם.'}
                      </small>
                    </div>
                  </div>
                ) : hasVideo ? (
                  <>
                    <video src={pubSub.videoUrl} controls
                           style={{ width: '100%', maxHeight: 200, borderRadius: 8, marginTop: 6, background:'#000' }} />
                    <div className="sub-actions" style={{ marginTop: 8 }}>
                      <label className={'btn approve small' + (busy ? ' disabled' : '')} style={{ cursor: busy ? 'wait' : 'pointer' }}>
                        החלפה
                        <input type="file" accept="video/mp4,video/webm" hidden ref={videoRef} disabled={busy}
                               onChange={(e) => { const f = e.target.files[0]; if (f) onUpdateVideo(pubSub.id, f); }} />
                      </label>
                      <button className="btn reject" disabled={busy} onClick={() => onClearVideo(pubSub.id)}>
                        הסרת וידאו
                      </button>
                    </div>
                  </>
                ) : (
                  <div className="sub-actions" style={{ marginTop: 6 }}>
                    <label className={'btn approve small' + (busy ? ' disabled' : '')} style={{ cursor: busy ? 'wait' : 'pointer' }}>
                      צירוף קובץ mp4/webm
                      <input type="file" accept="video/mp4,video/webm" hidden ref={videoRef} disabled={busy}
                             onChange={(e) => { const f = e.target.files[0]; if (f) onUpdateVideo(pubSub.id, f); }} />
                    </label>
                    <span className="admin-note" style={{ margin: 0 }}>יחליף את התמונה הסטטית בלוח הציבורי.</span>
                  </div>
                )}
              </div>

              <div className="edit-block">
                <div className="ap-eyebrow small">העברה ליום אחר</div>
                <div className="target-picker">
                  <select value={moveM} onChange={(e) => {
                    const newM = e.target.value;
                    setMoveM(newM);
                    /* אם היום הנוכחי לא קיים בחודש היעד - מנקים; אחרת שומרים אותו. */
                    const newMeta = MONTHS_META.find((m) => m.id === newM);
                    if (newMeta && Number(moveD) > newMeta.days) setMoveD('');
                  }}>
                    {MONTHS_META.map((m) => <option key={m.id} value={m.id}>{m.name}</option>)}
                  </select>
                  <select value={moveD} onChange={(e) => setMoveD(e.target.value)}>
                    <option value="" disabled>יום…</option>
                    {moveMonthMeta && Array.from({ length: moveMonthMeta.days }).map((_, i) => {
                      const d = i + 1;
                      const taken = published[moveM] && published[moveM][d];
                      const isSelf = moveM === monthMeta.id && d === day;
                      return (
                        <option key={d} value={d}>
                          {d}{isSelf ? ' (כאן עכשיו)' : taken ? ' · יחליף' : ''}
                        </option>
                      );
                    })}
                  </select>
                  <button className="btn approve small" disabled={busy || !moveD || noChange}
                          onClick={() => onMove(pubSub.id, moveM, Number(moveD))}>
                    העברה
                  </button>
                </div>
              </div>

              <div className="sub-actions" style={{ marginTop: 14 }}>
                <button className="btn reject" disabled={busy} onClick={() => onUnassign(pubSub.id)}>
                  הסרה מהיום
                </button>
              </div>
            </div>
          </article>
        ) : (
          <div>
            <div className="admin-note" style={{ marginBottom: 12 }}>
              היום הזה ריק. בחרו הגשה ממתינה שתישבץ אליו:
            </div>
            {pending.length === 0 ? (
              <div className="bank-empty">אין הגשות ממתינות כרגע 🧡</div>
            ) : (
              <ul className="pick-list">
                {pending.map((s) => (
                  <li key={s.id}>
                    <img src={s.artUrl} alt={s.childName} />
                    <div>
                      <div className="bank-name">{s.childName}, {s.age}</div>
                      <div className="bank-title">״{s.artTitle}״</div>
                    </div>
                    <button className="btn approve" disabled={busy}
                            onClick={() => onAssign(s, monthMeta.id, day)}>
                      שיבוץ לכאן
                    </button>
                  </li>
                ))}
              </ul>
            )}
          </div>
        )}
      </aside>
    </div>
  );
}
