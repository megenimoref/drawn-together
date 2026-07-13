import { readJson, isAdmin, unauthorized } from '../../../../lib/server';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

export async function GET(request) {
  if (!isAdmin(request)) return unauthorized();
  const index = await readJson('data/index.json', []);
  const subs = [];
  for (const id of index.slice(0, 200)) {
    const s = await readJson('data/submissions/' + id + '.json', null);
    if (s) subs.push(s);
  }
  const res = Response.json(subs);
  res.headers.set('Cache-Control', 'no-store, no-cache, must-revalidate, max-age=0');
  return res;
}
