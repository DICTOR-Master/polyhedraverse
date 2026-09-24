import { readGuide } from '../lib/guideSource';

export const dynamic = 'force-static';

export async function GET() {
  return new Response(await readGuide(), { headers: { 'Content-Type': 'text/markdown; charset=utf-8' } });
}
