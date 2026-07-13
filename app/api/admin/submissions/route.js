import { readJson, isAdmin, unauthorized } from '../../../../lib/server';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

export async function GET(request) {
  if (!isAdmin(request)) return unauthorized();
  const index = await readJson('data/index.json', []);
  /* קריאה מקבילה של כל ההגשות במקום סדרתית — משדרג ~N*500ms → ~500ms כולל. */
  const raw = await Promise.all(
    index.slice(0, 200).map((id) => readJson('data/submissions/' + id + '.json', null))
  );
  const subs = raw.filter(Boolean);
  const res = Response.json(subs);
  res.headers.set('Cache-Control', 'no-store, no-cache, must-revalidate, max-age=0');
  return res;
}
