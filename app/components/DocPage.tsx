import Link from 'next/link';
import { readRepoDoc } from '../lib/guideSource';
import { renderMarkdown, GUIDE_CSS } from '../lib/markdown';
import GuidePageLanguage from './GuidePageLanguage';
import type { LangCode } from '../lib/i18n';

/**
 * Server component: a repo Markdown file as a standalone page (/guide,
 * /guide/<lang>, /terms, /privacy, /security). `guideLang` adds the
 * guide's language picker.
 */
export default async function DocPage({ file, guideLang }: { file: string; guideLang?: string }) {
  const html = renderMarkdown(await readRepoDoc(file));
  return (
    <div style={{ background: '#000', minHeight: '100vh', padding: '24px 16px 64px' }}>
      <style>{GUIDE_CSS}</style>
      <div style={{ maxWidth: 760, margin: '0 auto 20px', fontSize: 14, display: 'flex', flexWrap: 'wrap', alignItems: 'center', justifyContent: 'space-between', gap: 12 }}>
        <Link href="/" style={{ color: '#5ee233' }}>
          &larr; Open Polyhedraverse
        </Link>
        {guideLang && <GuidePageLanguage lang={guideLang as LangCode} />}
      </div>
      <main lang={guideLang} className="md-guide" dangerouslySetInnerHTML={{ __html: html }} />
    </div>
  );
}
