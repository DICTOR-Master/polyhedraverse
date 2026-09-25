import type { Metadata } from 'next';
import DocPage from '../../components/DocPage';
import { LANG_ORDER } from '../../lib/i18n';
import { guideFile } from '../../lib/guideSource';

export const dynamic = 'force-static';
export const dynamicParams = false;

// /guide is English; /guide/ja, /guide/es ... are the translations.
export function generateStaticParams() {
  return LANG_ORDER.filter((lang) => lang !== 'en').map((lang) => ({ lang }));
}

export const metadata: Metadata = {
  title: 'Polyhedraverse User Guide',
  description:
    'Polyhedraverse User Guide: pick shapes, connect them face to face or vertex to vertex, browse the catalogue and build real 4D polytopes, plus a reference for every control.',
};

export default async function GuideLangPage({ params }: { params: Promise<{ lang: string }> }) {
  const { lang } = await params;
  return <DocPage file={guideFile(lang)} guideLang={lang} />;
}
