'use client';
/**
 * A 4D polytope's details (direct decisions 2026-09-30): the finished
 * polytope under View 4D's projection, what it is (Schläfli symbol,
 * cells, symmetry, dual), and Build, which places its seed cell and starts
 * RCP-C2B with this polytope already chosen. The 600-cell can also be
 * built from a vertex (its 20-tetrahedron icosahedral cluster first).
 */
import { polytope4D } from '../../lib/polyhedra/polytopes4d';
import { t, type LangCode } from '../../lib/i18n';
import RadialProjectionViewer from './RadialProjectionViewer';
import { polytopeLabel } from './PolytopeCard';

export interface PolytopeDetailDrawerProps {
  id: string;
  lang: LangCode;
  onClose: () => void;
  /** Start building: the seed cell's id and the RCP target. */
  onBuild: (seed: string, target: string) => void;
}

export default function PolytopeDetailDrawer({ id, lang, onClose, onBuild }: PolytopeDetailDrawerProps) {
  const p = polytope4D(id);
  if (!p) return null;
  const dual = polytope4D(p.dual)!;
  const title = polytopeLabel(p, lang);
  const buttonStyle = { background: '#bfe3f0', border: 'none', color: '#04121a', borderRadius: 999, padding: '8px 18px', fontWeight: 600, cursor: 'pointer' } as const;
  return (
    <div
      style={{ position: 'absolute', inset: 0, background: 'rgba(0,0,0,0.92)', zIndex: 20, display: 'flex', flexDirection: 'column', overflowY: 'auto' }}
      role="dialog"
      aria-label={title}
    >
      <div style={{ display: 'flex', justifyContent: 'flex-end', padding: '10px 14px' }}>
        <button
          type="button"
          onClick={onClose}
          style={{ background: 'none', border: '1px solid rgba(191,227,240,.3)', color: '#bfe3f0', borderRadius: 6, padding: '4px 12px', cursor: 'pointer', fontSize: 12 }}
        >
          {t('action.close', lang)}
        </button>
      </div>
      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', padding: '0 20px 20px', gap: 12 }}>
        <div style={{ width: '100%', maxWidth: 720 }}>
          <RadialProjectionViewer specId={p.seed} closure={p.target} height={420} />
        </div>
        <h2 style={{ color: '#d8f0ff', fontSize: 18, textAlign: 'center', margin: 0 }}>{title}</h2>
        <div data-testid="polytope-facts" style={{ fontSize: 13, color: '#bfe3f0', textAlign: 'center', lineHeight: 1.6 }}>
          <span style={{ fontFamily: 'monospace' }}>{p.schlafli}</span>
          {' · '}
          {t('polytope.cells', lang, { n: p.cells, cell: t(`polytope.cell.${p.seed}`, lang) })}
          <br />
          {t('polytope.symmetry', lang, { group: p.symmetry })}
          {' · '}
          {dual.id === p.id ? t('polytope.selfDual', lang) : t('polytope.dualOf', lang, { name: polytopeLabel(dual, lang) })}
        </div>
        <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap', justifyContent: 'center' }}>
          <button type="button" style={buttonStyle} onClick={() => onBuild(p.seed, p.target)}>
            {t('polytope.build', lang)}
          </button>
          {p.vertexFirstTarget && (
            <button type="button" style={{ ...buttonStyle, background: 'none', border: '1px solid #bfe3f0', color: '#bfe3f0' }} onClick={() => onBuild(p.seed, p.vertexFirstTarget!)}>
              {t('polytope.buildVertexFirst', lang)}
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
