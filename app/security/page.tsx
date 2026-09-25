import type { Metadata } from 'next';
import DocPage from '../components/DocPage';

export const dynamic = 'force-static';

export const metadata: Metadata = { title: 'Security · Polyhedraverse' };

export default function SecurityPage() {
  return <DocPage file="SECURITY.md" />;
}
