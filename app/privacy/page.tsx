import type { Metadata } from 'next';
import DocPage from '../components/DocPage';

export const dynamic = 'force-static';

export const metadata: Metadata = { title: 'Privacy · Polyhedraverse' };

export default function PrivacyPage() {
  return <DocPage file="PRIVACY.md" />;
}
