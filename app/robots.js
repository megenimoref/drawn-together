/* חוסם אינדוקס של הלוחות הפרטיים ומסכי הניהול במנועי חיפוש.
   הלוחות תחת /c/<space> הם פרטיים (הקישור הוא המפתח) — אין לאנדקס אותם.
   Next.js מגיש את זה אוטומטית כ-/robots.txt */
export default function robots() {
  return {
    rules: {
      userAgent: '*',
      allow: '/',
      disallow: ['/c/']
    }
  };
}
