import type { Metadata } from 'next';
import Link from 'next/link';
import { readGuide } from '../lib/guideSource';
import { renderMarkdown, GUIDE_CSS } from '../lib/markdown';

export const dynamic = 'force-static';

export const metadata: Metadata = {
  title: 'How to use Polyhedraverse',
  description:
    'How to use Polyhedraverse: pick shapes, connect them face to face or vertex to vertex, browse the catalogue and build real 4D polytopes, plus a reference for every control.',
};

export default async function GuidePage() {
  const html = renderMarkdown(await readGuide());
  return (
    <div style={{ background: '#000', minHeight: '100vh', padding: '24px 16px 64px' }}>
      <style>{GUIDE_CSS}</style>
      <div style={{ maxWidth: 760, margin: '0 auto 20px', fontSize: 14 }}>
        <Link href="/" style={{ color: '#5ee233' }}>
          &larr; Open Polyhedraverse
        </Link>
      </div>
      <main className="md-guide" dangerouslySetInnerHTML={{ __html: html }} />
    </div>
  );
}
