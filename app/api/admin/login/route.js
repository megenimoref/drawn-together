import { hashPassword } from '../../../../lib/server';

export async function POST(request) {
  const { password } = await request.json();
  const expected = process.env.ADMIN_PASSWORD;
  if (!expected) {
    return Response.json({ error: 'ADMIN_PASSWORD לא הוגדר בהגדרות הפרויקט ב-Vercel' }, { status: 500 });
  }
  if (password !== expected) {
    return Response.json({ error: 'סיסמה שגויה' }, { status: 401 });
  }
  const res = Response.json({ ok: true });
  res.headers.set(
    'Set-Cookie',
    'dt_admin=' + hashPassword(expected) + '; Path=/; HttpOnly; SameSite=Lax; Max-Age=604800; Secure'
  );
  return res;
}
