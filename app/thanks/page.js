import Link from 'next/link';

export const metadata = { title: 'תודה! - לוח תשפ״ז, מחוז חיפה' };

export default function ThanksPage() {
  return (
    <main className="thanks-card">
      <div className="big" aria-hidden="true">🎨🧡</div>
      <h1>הציור בדרך אלינו!</h1>
      <p>
        תודה רבה! קיבלנו את הציור, ההקדשה וההקלטה.<br />
        הצוות שלנו יעבור על ההגשה, ואם יש צורך בהשלמות - ניצור קשר בפרטים שהשארתם.<br />
        טופס הסכמה רשמי לפרסום יישלח אליכם בהמשך.
      </p>
      <Link className="cta" href="/">חזרה ללוח השנה</Link>
    </main>
  );
}
