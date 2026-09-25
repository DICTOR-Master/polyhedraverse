import Link from 'next/link';
import { readRepoDoc } from '../lib/guideSource';
import { renderMarkdown, GUIDE_CSS } from '../lib/markdown';

/** Server component: a repo Markdown file as a standalone page (/guide, /terms, /privacy, /security). */
export default async function DocPage({ file }: { file: string }) {
  const html = renderMarkdown(await readRepoDoc(file));
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
