'use client';

import { getAnySpec } from '../../lib/polyhedra/lookup';
import { FAMILY_META, familiesFor, catalogByFamily, pairPartners, type FamilyKey } from '../../lib/polyhedra/families';
import { t, type LangCode } from '../../lib/i18n';
import ShapePreview from './ShapePreview';
import { FOURD_CAPABLE_IDS } from '../../lib/polyhedra/fourD';

const CARD_PREVIEW_SIZE = 88;
const PAIR_MINI_SIZE = 22;
const PAIR_GOLD = '#ffd54a';
const PAIR_GOLD_DIM = 'rgba(255, 213, 74, 0.4)';

/** Family to show as the card's badge when a shape has more than one --
 * prefer whichever family the user is currently browsing by, otherwise
 * the shape's first (canonical FAMILY_ORDER) family. Star polyhedra
 * belong to no FamilyKey at all (deliberately, see starPolyhedra.ts's own
 * header) -- undefined here means "show no family badge," not a bug. */
function primaryFamilyFor(specId: string, activeFamilies: FamilyKey[]): FamilyKey | undefined {
  const families = familiesFor(specId);
  const hit = families.find((f) => activeFamilies.includes(f));
  return hit ?? families[0];
}

export interface ShapePreviewCardProps {
  specId: string;
  lang: LangCode;
  activeFamilies?: FamilyKey[];
  isFavorite: boolean;
  inCompare: boolean;
  onOpen: (specId: string) => void;
  onToggleFavorite: (specId: string) => void;
  onToggleCompare: (specId: string) => void;
  /** Hide the pair-partner minis where the partner already sits beside
   *  this card (the Space-Filling Pairs rows, the ⇄ Pairs with list). */
  hidePartners?: boolean;
}

export default function ShapePreviewCard({
  specId,
  lang,
  activeFamilies = [],
  isFavorite,
  inCompare,
  onOpen,
  onToggleFavorite,
  onToggleCompare,
  hidePartners = false,
}: ShapePreviewCardProps) {
  const spec = getAnySpec(specId);
  if (!spec) return null;
  const families = familiesFor(specId);
  const fam = primaryFamilyFor(specId, activeFamilies);
  const catalogNumber = fam ? catalogByFamily(fam)[specId] : undefined;
  const displayName = spec.name.replaceAll('_', ' ');
  // 4D extension: a real, distinct badge for the 4D seed cells, not
  // just the generic "+N also in..." cross-family indicator below --
  // direct user request for a "clear 4D additional highlighted label for
  // clarity," separate from and more prominent than the plain count.
  // The gold 4D badge: this shape is the cell of a regular 4-polytope.
  const isFourD = FOURD_CAPABLE_IDS.includes(specId);
  // Pair partners as small, still, gold wireframes down the right edge,
  // under the 4D badge when there is one (direct decisions 2026-09-30:
  // they name the partner outright, so no colour can imply a wrong match;
  // all partners shown, three at most, for the octahedron).
  const partners = hidePartners ? [] : pairPartners(specId);

  return (
    <div
      style={{
        background: 'var(--ph-surface, #080a06)',
        border: '1px solid var(--ph-line, rgba(71,204,36,.16))',
        borderRadius: 10,
        padding: 10,
        cursor: 'pointer',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        gap: 6,
        position: 'relative',
      }}
      onClick={() => onOpen(specId)}
      role="button"
      tabIndex={0}
      onKeyDown={(e) => {
        if (e.key === 'Enter' || e.key === ' ') onOpen(specId);
      }}
    >
      <div style={{ display: 'flex', width: '100%', justifyContent: 'space-between', alignItems: 'center', fontSize: 11, color: '#47cc24' }}>
        <span
          style={{ display: 'flex', alignItems: 'center', gap: 4 }}
          title={families.length > 1 ? t('alsoIn', lang, { list: families.filter((f) => f !== fam).map((f) => FAMILY_META[f].label).join(', ') }) : undefined}
        >
          {fam ? FAMILY_META[fam].symbol : '★'}
          {/* Real user catch: this cross-family hint used to live ONLY in
              the title attribute above -- a hover-only browser tooltip,
              invisible on touch devices and easy to miss even with a
              mouse. A small always-visible "+N" badge (N = how many
              OTHER families this shape also belongs to) makes it
              discoverable at a glance; the full family list is still one
              hover/tap away via the same title attribute. */}
          {families.length > 1 && (
            <span
              style={{
                fontSize: 9,
                fontWeight: 700,
                color: '#04140a',
                background: '#5ee233',
                borderRadius: 999,
                padding: '1px 5px',
                lineHeight: 1.4,
              }}
            >
              +{families.length - 1}
            </span>
          )}
        </span>
        {catalogNumber !== undefined && <span style={{ fontFamily: 'monospace', opacity: 0.7 }}>[{catalogNumber}]</span>}
      </div>
      {/* 4D extension: a distinct, highlighted corner badge -- deliberately
          NOT the same green pill as the generic "+N also in..." indicator
          above, so a 4D-capable shape reads as a clearly different, more
          significant fact at a glance, not just another cross-family
          overlap. Direct user request. */}
      {isFourD && (
        <span
          style={{
            position: 'absolute',
            top: 6,
            right: 6,
            fontSize: 9,
            fontWeight: 800,
            letterSpacing: '.03em',
            color: '#1a1400',
            background: '#ffd54a',
            border: '1px solid #04140a',
            borderRadius: 999,
            padding: '2px 6px',
            boxShadow: '0 0 4px rgba(255,213,74,.6)',
          }}
          title={t('fourD.badgeTitle', lang)}
        >
          4D
        </span>
      )}
      {partners.length > 0 && (
        <span
          data-testid="pair-minis"
          title={t('catalog.pairsWith', lang) + ': ' + partners.map((id) => (getAnySpec(id)?.name ?? id).replaceAll('_', ' ')).join(', ')}
          style={{ position: 'absolute', top: isFourD ? 26 : 6, right: 6, display: 'flex', flexDirection: 'column', gap: 2 }}
        >
          {partners.map((id) => (
            <ShapePreview key={id} specId={id} size={PAIR_MINI_SIZE} colors={[PAIR_GOLD, PAIR_GOLD_DIM]} />
          ))}
        </span>
      )}
      <ShapePreview specId={specId} size={CARD_PREVIEW_SIZE} />
      <div style={{ fontSize: 11, textAlign: 'center', color: '#a9f795', lineHeight: 1.25 }}>{displayName}</div>
      <div style={{ display: 'flex', gap: 8, marginTop: 2 }}>
        <button
          type="button"
          aria-label={t('action.favorite', lang)}
          aria-pressed={isFavorite}
          onClick={(e) => {
            e.stopPropagation();
            onToggleFavorite(specId);
          }}
          style={{
            background: 'none',
            border: 'none',
            color: isFavorite ? '#47cc24' : '#3a9e1f',
            cursor: 'pointer',
            fontSize: 14,
          }}
        >
          {isFavorite ? '★' : '☆'}
        </button>
        <button
          type="button"
          aria-label={t('action.compare', lang)}
          aria-pressed={inCompare}
          onClick={(e) => {
            e.stopPropagation();
            onToggleCompare(specId);
          }}
          style={{
            background: 'none',
            border: 'none',
            color: inCompare ? '#47cc24' : '#3a9e1f',
            cursor: 'pointer',
            fontSize: 14,
          }}
        >
          {inCompare ? '✓' : '+'}
        </button>
      </div>
    </div>
  );
}
