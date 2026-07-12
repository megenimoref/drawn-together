/* מטא-נתונים קבועים של 13 חודשי תשפ"ז (שנה מעוברת).
   שימו לב: תאריכי החגים סומנו ידנית - לאמת מול לוח עברי רשמי לפני פרסום! */

export const MONTHS_META = [
  { id: '01-tishrei', name: 'תשרי',  greg: 'ספטמבר–אוקטובר 2026', calTitle: 'ספטמבר 2026', startDow: 2, days: 30,
    holidays: { 11: 'ערב ראש השנה', 12: 'ראש השנה', 13: 'ראש השנה', 21: 'יום כיפור', 26: 'סוכות' } },
  { id: '02-heshvan', name: 'חשוון', greg: 'אוקטובר–נובמבר 2026', calTitle: 'אוקטובר 2026', startDow: 4, days: 31,
    holidays: { 2: 'הושענא רבה', 3: 'שמחת תורה' } },
  { id: '03-kislev', name: 'כסלו',  greg: 'נובמבר–דצמבר 2026', calTitle: 'נובמבר 2026', startDow: 0, days: 30, holidays: {} },
  { id: '04-tevet', name: 'טבת',   greg: 'דצמבר 2026 – ינואר 2027', calTitle: 'דצמבר 2026', startDow: 2, days: 31,
    holidays: { 5: 'חנוכה', 6: 'חנוכה', 7: 'חנוכה', 8: 'חנוכה', 9: 'חנוכה', 10: 'חנוכה', 11: 'חנוכה', 12: 'חנוכה' } },
  { id: '05-shvat', name: 'שבט',   greg: 'ינואר–פברואר 2027', calTitle: 'ינואר 2027', startDow: 5, days: 31,
    holidays: { 23: 'ט״ו בשבט' } },
  { id: '06-adar-a', name: 'אדר א׳', greg: 'פברואר–מרץ 2027', calTitle: 'פברואר 2027', startDow: 1, days: 28,
    holidays: { 21: 'פורים קטן' } },
  { id: '07-adar-b', name: 'אדר ב׳', greg: 'מרץ–אפריל 2027', calTitle: 'מרץ 2027', startDow: 1, days: 31,
    holidays: { 23: 'פורים', 24: 'שושן פורים' } },
  { id: '08-nisan', name: 'ניסן',  greg: 'אפריל–מאי 2027', calTitle: 'אפריל 2027', startDow: 4, days: 30,
    holidays: { 22: 'פסח', 28: 'שביעי של פסח' } },
  { id: '09-iyar', name: 'אייר',   greg: 'מאי–יוני 2027', calTitle: 'מאי 2027', startDow: 6, days: 31,
    holidays: { 11: 'יום הזיכרון', 12: 'יום העצמאות', 25: 'ל״ג בעומר' } },
  { id: '10-sivan', name: 'סיוון', greg: 'יוני–יולי 2027', calTitle: 'יוני 2027', startDow: 2, days: 30,
    holidays: { 11: 'שבועות' } },
  { id: '11-tamuz', name: 'תמוז',  greg: 'יולי–אוגוסט 2027', calTitle: 'יולי 2027', startDow: 4, days: 31, holidays: {} },
  { id: '12-av', name: 'אב',      greg: 'אוגוסט–ספטמבר 2027', calTitle: 'אוגוסט 2027', startDow: 0, days: 31,
    holidays: { 12: 'תשעה באב' } },
  { id: '13-elul', name: 'אלול',  greg: 'ספטמבר 2027', calTitle: 'ספטמבר 2027', startDow: 3, days: 30, holidays: {} }
];

/* תוכן דמו מובנה לתשרי - מוצג כל עוד לא פורסם תוכן אמיתי לחודש זה.
   מבנה: { monthId: { dayNumber: art } } */
export const DEMO_PUBLISHED = {
  '01-tishrei': {
    12: {
      title: '״שמיים ורודים״',
      child: 'אנדי, בת 6',
      dedication: 'מוקדש לאבא שלי, אלון, שמשרת בלבנון - כי אין גבול לאהבה.',
      mediaType: 'video',
      artUrl: '/demo/art.mp4',
      thumbUrl: '/demo/thumb.jpg',
      voiceUrl: '/demo/voice.mp3',
      demo: true
    }
  }
};

export const CONTACT_EMAIL = 'megenim.oref@gmail.com';
export const DEADLINE = '15.8.2026';
