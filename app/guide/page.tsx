import type { Metadata } from 'next';
import DocPage from '../components/DocPage';

export const dynamic = 'force-static';

export const metadata: Metadata = {
  title: 'How to use Polyhedraverse',
  description:
    'How to use Polyhedraverse: pick shapes, connect them face to face or vertex to vertex, browse the catalogue and build real 4D polytopes, plus a reference for every control.',
};

export default function GuidePage() {
  return <DocPage file="docs/guide.md" guideLang="en" />;
}
