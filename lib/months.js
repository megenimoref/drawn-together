/* מטא-נתונים קבועים של 13 חודשי תשפ"ז (שנה מעוברת).
   שימו לב: תאריכי החגים סומנו ידנית - לאמת מול לוח עברי רשמי לפני פרסום!
   essence = צ'יפ קצר של אופי החודש (מוצג בשער);
   hue = גוון OKLCH ייחודי לרקע הכרטיס (0-360). */

export const MONTHS_META = [
  { id: '01-tishrei', name: 'תשרי',  greg: 'ספטמבר 2026', calTitle: 'ספטמבר 2026', startDow: 2, days: 30,
    essence: 'ראש השנה · סוכות', hue: 30,
    holidays: { 11: 'ערב ראש השנה', 12: 'ראש השנה', 13: 'ראש השנה', 21: 'יום כיפור', 26: 'סוכות' } },
  { id: '02-heshvan', name: 'חשוון', greg: 'אוקטובר 2026', calTitle: 'אוקטובר 2026', startDow: 4, days: 31,
    essence: 'חודש של התחלות', hue: 190,
    holidays: { 2: 'הושענא רבה', 3: 'שמחת תורה' } },
  { id: '03-kislev', name: 'כסלו',  greg: 'נובמבר 2026', calTitle: 'נובמבר 2026', startDow: 0, days: 30,
    essence: 'חנוכה', hue: 55,
    holidays: {} },
  { id: '04-tevet', name: 'טבת',   greg: 'דצמבר 2026', calTitle: 'דצמבר 2026', startDow: 2, days: 31,
    essence: 'ימי חורף', hue: 215,
    holidays: { 5: 'חנוכה — נר ראשון', 6: 'חנוכה', 7: 'חנוכה', 8: 'חנוכה', 9: 'חנוכה', 10: 'חנוכה', 11: 'חנוכה', 12: 'חנוכה' } },
  { id: '05-shvat', name: 'שבט',   greg: 'ינואר 2027', calTitle: 'ינואר 2027', startDow: 5, days: 31,
    essence: 'ט״ו בשבט', hue: 135,
    holidays: { 23: 'ט״ו בשבט' } },
  { id: '06-adar-a', name: 'אדר א׳', greg: 'פברואר 2027', calTitle: 'פברואר 2027', startDow: 1, days: 28,
    essence: 'חודש של שמחה', hue: 285,
    holidays: { 21: 'פורים קטן' } },
  { id: '07-adar-b', name: 'אדר ב׳', greg: 'מרץ 2027', calTitle: 'מרץ 2027', startDow: 1, days: 31,
    essence: 'פורים', hue: 340,
    holidays: { 23: 'פורים', 24: 'שושן פורים' } },
  { id: '08-nisan', name: 'ניסן',  greg: 'אפריל 2027', calTitle: 'אפריל 2027', startDow: 4, days: 30,
    essence: 'פסח', hue: 95,
    holidays: { 22: 'פסח', 28: 'שביעי של פסח' } },
  { id: '09-iyar', name: 'אייר',   greg: 'מאי 2027', calTitle: 'מאי 2027', startDow: 6, days: 31,
    essence: 'יום העצמאות', hue: 235,
    holidays: { 11: 'יום הזיכרון', 12: 'יום העצמאות', 25: 'ל״ג בעומר' } },
  { id: '10-sivan', name: 'סיוון', greg: 'יוני–יולי 2027', calTitle: 'יוני 2027', startDow: 2, days: 30,
    essence: 'שבועות', hue: 120,
    holidays: { 11: 'שבועות' } },
  { id: '11-tamuz', name: 'תמוז',  greg: 'יולי 2027', calTitle: 'יולי 2027', startDow: 4, days: 31,
    essence: 'ימי קיץ', hue: 45,
    holidays: {} },
  { id: '12-av', name: 'אב',      greg: 'אוגוסט 2027', calTitle: 'אוגוסט 2027', startDow: 0, days: 31,
    essence: 'תשעה באב · ט״ו באב', hue: 355,
    holidays: { 12: 'תשעה באב' } },
  { id: '13-elul', name: 'אלול',  greg: 'ספטמבר 2027', calTitle: 'ספטמבר 2027', startDow: 3, days: 30,
    essence: 'ימי סליחות', hue: 260,
    holidays: {} }
];

export const CONTACT_EMAIL = 'megenim.oref@gmail.com';
export const DEADLINE = '15.8.2026';

/* מקבץ ימי חג רצופים עם אותו שם לטווח יחיד.
   דוגמאות:
   { 12: 'ראש השנה', 13: 'ראש השנה' }        -> [{ range: '12-13', name: 'ראש השנה' }]
   { 5: 'חנוכה - נר ראשון', 6: 'חנוכה', ...,
     12: 'חנוכה' }                            -> [{ range: '5', name: 'חנוכה - נר ראשון' },
                                                  { range: '6-12', name: 'חנוכה' }] */
export function groupHolidays(holidays) {
  const entries = Object.entries(holidays || {})
    .map(([d, name]) => ({ day: Number(d), name }))
    .filter((e) => Number.isInteger(e.day))
    .sort((a, b) => a.day - b.day);

  const groups = [];
  for (const e of entries) {
    const last = groups[groups.length - 1];
    if (last && last.name === e.name && last.end === e.day - 1) {
      last.end = e.day;
    } else {
      groups.push({ start: e.day, end: e.day, name: e.name });
    }
  }
  return groups.map((g) => ({
    range: g.start === g.end ? String(g.start) : g.start + '–' + g.end,
    name: g.name
  }));
}
