import { LANG_ORDER } from '../../../lib/i18n';
import { readGuide } from '../../../lib/guideSource';

export const dynamic = 'force-static';
export const dynamicParams = false;

// Raw Markdown for the in-app guide overlay: /guide/ja/guide.md etc.
// (English stays at /guide.md).
export function generateStaticParams() {
  return LANG_ORDER.filter((lang) => lang !== 'en').map((lang) => ({ lang }));
}

export async function GET(_req: Request, { params }: { params: Promise<{ lang: string }> }) {
  const { lang } = await params;
  return new Response(await readGuide(lang), { headers: { 'Content-Type': 'text/markdown; charset=utf-8' } });
}
