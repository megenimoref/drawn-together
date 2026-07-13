/* חוסם אינדוקס של מסך הניהול במנועי חיפוש.
   Next.js מגיש את זה אוטומטית כ-/robots.txt */
export default function robots() {
  return {
    rules: {
      userAgent: '*',
      allow: '/',
      disallow: ['/admin']
    }
  };
}
