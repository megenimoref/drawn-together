import './globals.css';

export const metadata = {
  title: 'לוח תשפ״ז - משפחות המילואים, מחוז חיפה',
  description: 'לוח שנה דיגיטלי המספר את סיפורן של משפחות המילואים במחוז חיפה דרך ציורי הילדים והילדות'
};

export default function RootLayout({ children }) {
  return (
    <html lang="he" dir="rtl">
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link
          href="https://fonts.googleapis.com/css2?family=Amatica+SC:wght@400;700&family=Assistant:wght@400;600;700&family=Solitreo&display=swap"
          rel="stylesheet"
        />
      </head>
      <body>
        <div className="wrap">{children}</div>
        <footer>
          בשבילכן ולמענכן · צוות מרכז <b>״מגנים על העורף״</b> · מחוז חיפה 🧡
        </footer>
      </body>
    </html>
  );
}
