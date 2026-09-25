import type { Metadata } from 'next';
import DocPage from '../components/DocPage';

export const dynamic = 'force-static';

export const metadata: Metadata = { title: 'Terms of Service · Polyhedraverse' };

export default function TermsPage() {
  return <DocPage file="TERMS.md" />;
}
