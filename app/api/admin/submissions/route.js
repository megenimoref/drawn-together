import { readJson, isAdmin, unauthorized } from '../../../../lib/server';

export const dynamic = 'force-dynamic';

export async function GET(request) {
  if (!isAdmin(request)) return unauthorized();
  const index = await readJson('data/index.json', []);
  const subs = [];
  for (const id of index.slice(0, 200)) {
    const s = await readJson('data/submissions/' + id + '.json', null);
    if (s) subs.push(s);
  }
  return Response.json(subs);
}
