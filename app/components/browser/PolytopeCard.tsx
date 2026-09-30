'use client';
/**
 * A 4D Polytopes card (direct decisions 2026-09-30): the finished
 * polytope as a turning wireframe (the same projection View 4D shows),
 * its name by cell count with the common name, its Schläfli symbol and
 * its cells. Opens the polytope's details, where Build starts it.
 */
import { useMemo } from 'react';
import { polytope4D, polytopeWireframe, type Polytope4D } from '../../lib/polyhedra/polytopes4d';
import { t, type LangCode } from '../../lib/i18n';
import ShapePreview from './ShapePreview';

export function polytopeLabel(p: Polytope4D, lang: LangCode): string {
  return p.common ? `${p.name} (${t(`polytope.common.${p.common}`, lang)})` : p.name;
}

export default function PolytopeCard({ id, lang, onOpen }: { id: string; lang: LangCode; onOpen: (id: string) => void }) {
  const p = polytope4D(id)!;
  const wire = useMemo(() => polytopeWireframe(id), [id]);
  return (
    <div
      data-testid={`polytope-card-${id}`}
      role="button"
      tabIndex={0}
      onClick={() => onOpen(id)}
      onKeyDown={(e) => {
        if (e.key === 'Enter' || e.key === ' ') onOpen(id);
      }}
      style={{
        background: 'rgba(191,227,240,.05)',
        border: '1px solid rgba(191,227,240,.3)',
        borderRadius: 12,
        padding: 8,
        cursor: 'pointer',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        gap: 4,
      }}
    >
      <ShapePreview specId={id} wire={wire} size={104} spin colors={['#bfe3f0', 'rgba(191,227,240,.3)']} />
      <div style={{ fontSize: 12, fontWeight: 700, color: '#d8f0ff', textAlign: 'center' }}>{polytopeLabel(p, lang)}</div>
      <div style={{ fontSize: 11, color: '#bfe3f0', fontFamily: 'monospace' }}>{p.schlafli}</div>
      <div style={{ fontSize: 10, color: '#8fb8c8', textAlign: 'center' }}>{t('polytope.cells', lang, { n: p.cells, cell: t(`polytope.cell.${p.seed}`, lang) })}</div>
    </div>
  );
}
