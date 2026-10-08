'use client';

/**
 * Full Catalog -- a single scrollable page showing every shape in the
 * registry, grouped into real family SECTIONS (not the wheel's one-
 * face-at-a-time pagination). Real user feedback: selecting "Full
 * Catalog" from the wheel used to just page through all 137 shapes one
 * wheel-face at a time ("not just go round the wheel itself almost
 * anonymously") -- this is the actual "full page of all images in
 * sections" that was expected instead. The wheel's Full Catalog face
 * now triggers this screen directly (see PolyhedralWheel's onSelectAll)
 * rather than drilling into its own pagination.
 *
 * A shape belonging to more than one family (e.g. D4: Deltahedra AND
 * Platonic) legitimately appears in more than one section here -- same
 * "intended, not a bug to dedupe" convention every other family view in
 * this app already follows.
 */

import { useEffect } from 'react';
import { FAMILY_ORDER, FAMILY_META, familyIds, SPACE_FILLING_PAIR_LIST, FEDOROV_FIVE, PARALLELOHEDRON_VARIANTS, KALEIDOHEDRA_VERIFIED, REGULAR_NINE, type FamilyKey } from '../../../krp-core/src/polyhedra/families.js';
import { STAR_POLYHEDRON_IDS } from '../../../krp-core/src/polyhedra/starPolyhedra.js';
import { BRIDGE_SECTIONS } from '../../../krp-core/src/polyhedra/bridges.js';
import { STELLATION_IDS, stellationInfo, stellatedSolidName } from '../../../krp-core/src/polyhedra/stellations/index.js';
import { t, type LangCode } from '../../lib/i18n';
import ShapePreviewCard from './ShapePreviewCard';
import PolytopeCard from './PolytopeCard';
import { POLYTOPES_4D, SYMMETRIES_4D } from '../../../krp-core/src/polyhedra/polytopes4d.js';

/** DOM id for a given section's own heading, used by focusSection's
 *  scroll-into-view -- 'STAR' for the trailing star-polyhedra section,
 *  otherwise a real FamilyKey. */
function sectionDomId(section: FamilyKey | 'STAR'): string {
  return `fc-section-${section}`;
}

export interface FullCatalogScreenProps {
  lang: LangCode;
  /** Mirrors every other screen's filterIds -- incompatible shapes are
   *  left out of each section entirely, same convention SearchScreen
   *  already uses (rather than the wheel's own newer "show but dim"
   *  convention), so a family with zero compatible members here just
   *  shows an empty section rather than a jarring dimmed grid. */
  filterIds?: string[];
  /** Face-attach: the selected shape's complementary pieces (Space-
   *  Filling Pairs partners, Aperiodic Set mates) that fit the face,
   *  listed first above every family (direct request 2026-09-30). */
  partnerIds?: string[];
  /**
   * Real user request ("group by group summoning from wheel"): a
   * family's own "View all" wheel face, or the wheel's dedicated Star
   * Polyhedra face, opens THIS screen already scrolled to that one
   * section rather than landing at the top and making the user scroll
   * down themselves. This screen remounts fresh every time it's opened
   * (see ShapeBrowser's own `showFullCatalog` conditional render), so a
   * plain mount-time scroll (no request-id bumping needed) is enough --
   * unlike fullCatalogRequestId, which exists specifically because THAT
   * component stays mounted across requests.
   */
  focusSection?: FamilyKey | 'STAR';
  isFavorite: (specId: string) => boolean;
  isInCompare: (specId: string) => boolean;
  onOpenShape: (specId: string) => void;
  onToggleFavorite: (specId: string) => void;
  onToggleCompare: (specId: string) => void;
}

export default function FullCatalogScreen({
  lang,
  filterIds,
  partnerIds,
  focusSection,
  isFavorite,
  isInCompare,
  onOpenShape,
  onToggleFavorite,
  onToggleCompare,
}: FullCatalogScreenProps) {
  useEffect(() => {
    if (!focusSection) return;
    document.getElementById(sectionDomId(focusSection))?.scrollIntoView({ block: 'start' });
    // Mount-once: this screen is remounted fresh every time it opens (see
    // this prop's own doc comment above), so there's no later focusSection
    // change to react to within one mount.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <div style={{ overflowY: 'auto', flex: 1, padding: '16px 18px', display: 'flex', flexDirection: 'column', gap: 24 }}>
      {partnerIds && partnerIds.length > 0 && (
        <div data-testid="pair-partners">
          <div style={{ display: 'flex', alignItems: 'baseline', gap: 8, marginBottom: 10 }}>
            <span style={{ fontSize: 18, color: '#47cc24' }}>⇄</span>
            <span style={{ fontSize: 13, fontWeight: 700, color: '#a9f795', letterSpacing: '.02em' }}>{t('catalog.pairsWith', lang)}</span>
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(120px, 1fr))', gap: 10 }}>
            {partnerIds.map((id) => (
              <ShapePreviewCard
                key={id}
                specId={id}
                lang={lang}
                hidePartners
                isFavorite={isFavorite(id)}
                inCompare={isInCompare(id)}
                onOpen={onOpenShape}
                onToggleFavorite={onToggleFavorite}
                onToggleCompare={onToggleCompare}
              />
            ))}
          </div>
        </div>
      )}
      {FAMILY_ORDER.map((fam) => {
        const meta = FAMILY_META[fam];
        const ids = filterIds ? familyIds(fam).filter((id) => filterIds.includes(id)) : familyIds(fam);
        if (ids.length === 0) return null;
        if (fam === 'SPACE_FILLING_PAIRS') {
          // One row per pair (direct decision): the honeycomb's own name,
          // then both shapes side by side. Under filterIds (attach flow)
          // only compatible shapes are shown, and a pair with none left
          // is dropped -- same "leave incompatible out" convention as
          // every other section here.
          const pairs = SPACE_FILLING_PAIR_LIST.map((p) => ({ ...p, shown: filterIds ? p.ids.filter((id) => filterIds.includes(id)) : p.ids })).filter((p) => p.shown.length > 0);
          return (
            <div key={fam} id={sectionDomId(fam)}>
              <div style={{ display: 'flex', alignItems: 'baseline', gap: 8, marginBottom: 10 }}>
                <span style={{ fontSize: 18, color: '#47cc24' }}>{meta.symbol}</span>
                <span style={{ fontSize: 13, fontWeight: 700, color: '#a9f795', letterSpacing: '.02em' }}>{meta.label}</span>
                <span style={{ fontFamily: 'monospace', fontSize: 11, color: '#3a9e1f' }}>{pairs.length}</span>
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
                {pairs.map((p) => (
                  <div key={p.ids.join('+')} data-testid="space-filling-pair">
                    <div style={{ fontSize: 12, color: '#5ee233', marginBottom: 6 }}>{p.honeycomb}</div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
                      {p.shown.map((id, i) => (
                        <div key={id} style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                          {i > 0 && <span style={{ fontSize: 18, color: '#3a9e1f' }}>+</span>}
                          <div style={{ width: 120 }}>
                            <ShapePreviewCard
                              specId={id}
                              lang={lang}
                              activeFamilies={[fam]}
                              hidePartners
                              isFavorite={isFavorite(id)}
                              inCompare={isInCompare(id)}
                              onOpen={onOpenShape}
                              onToggleFavorite={onToggleFavorite}
                              onToggleCompare={onToggleCompare}
                            />
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          );
        }
        if (fam === 'POLYTOPES_4D') {
          // The six regular 4-polytopes by symmetry group: A4, B4 (dual
          // pair), F4, H4 (dual pair). Their cards are polytopes, not shapes.
          return (
            <div key={fam} id={sectionDomId(fam)}>
              <div style={{ display: 'flex', alignItems: 'baseline', gap: 8, marginBottom: 10 }}>
                <span style={{ fontSize: 18, color: '#47cc24' }}>{meta.symbol}</span>
                <span style={{ fontSize: 13, fontWeight: 700, color: '#a9f795', letterSpacing: '.02em' }}>{meta.label}</span>
                <span style={{ fontFamily: 'monospace', fontSize: 11, color: '#3a9e1f' }}>{ids.length}</span>
              </div>
              {SYMMETRIES_4D.map((group) => {
                const shown = POLYTOPES_4D.filter((p) => p.symmetry === group && ids.includes(p.id));
                if (shown.length === 0) return null;
                return (
                  <div key={group} data-testid={`polytope-section-${group}`} style={{ marginBottom: 14 }}>
                    <div style={{ fontSize: 13, fontWeight: 700, color: '#bfe3f0', letterSpacing: '.03em', borderBottom: '1px solid rgba(191,227,240,.35)', paddingBottom: 4, marginBottom: 8 }}>{t('polytope.symmetry', lang, { group })}</div>
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(120px, 1fr))', gap: 10 }}>
                      {shown.map((p) => <PolytopeCard key={p.id} id={p.id} lang={lang} onOpen={onOpenShape} />)}
                    </div>
                  </div>
                );
              })}
            </div>
          );
        }
        if (fam === 'PARALLELOHEDRA') {
          // Fedorov's five, then their notable variants (direct decision
          // 2026-09-30), then the cells verified in Kaleidohedra and the regular nine (2026-10-01),
          // the same section style as 3D+ Bridges.
          const sections = [
            { id: 'fedorov', ids: FEDOROV_FIVE },
            { id: 'variants', ids: PARALLELOHEDRON_VARIANTS },
            { id: 'kaleidohedra', ids: KALEIDOHEDRA_VERIFIED },
            { id: 'regularNine', ids: REGULAR_NINE },
          ];
          return (
            <div key={fam} id={sectionDomId(fam)}>
              <div style={{ display: 'flex', alignItems: 'baseline', gap: 8, marginBottom: 10 }}>
                <span style={{ fontSize: 18, color: '#47cc24' }}>{meta.symbol}</span>
                <span style={{ fontSize: 13, fontWeight: 700, color: '#a9f795', letterSpacing: '.02em' }}>{meta.label}</span>
                <span style={{ fontFamily: 'monospace', fontSize: 11, color: '#3a9e1f' }}>{ids.length}</span>
              </div>
              {sections.map((sec) => {
                const shown = sec.ids.filter((id) => ids.includes(id));
                if (shown.length === 0) return null;
                return (
                  <div key={sec.id} data-testid={`parallelohedra-section-${sec.id}`} style={{ marginBottom: 14 }}>
                    <div style={{ fontSize: 13, fontWeight: 700, color: '#50c878', letterSpacing: '.03em', borderBottom: '1px solid rgba(80,200,120,.35)', paddingBottom: 4, marginBottom: 8 }}>{t(`parallelohedra.section.${sec.id}`, lang)}</div>
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(120px, 1fr))', gap: 10 }}>
                      {shown.map((id) => (
                        <ShapePreviewCard
                          key={id}
                          specId={id}
                          lang={lang}
                          activeFamilies={[fam]}
                          isFavorite={isFavorite(id)}
                          inCompare={isInCompare(id)}
                          onOpen={onOpenShape}
                          onToggleFavorite={onToggleFavorite}
                          onToggleCompare={onToggleCompare}
                        />
                      ))}
                    </div>
                  </div>
                );
              })}
            </div>
          );
        }
        if (fam === 'STELLATIONS') {
          // One section per stellated solid, Platonic then Catalan, its
          // pieces in size order (flat, then each stellation; left before right).
          return (
            <div key={fam} id={sectionDomId(fam)}>
              <div style={{ display: 'flex', alignItems: 'baseline', gap: 8, marginBottom: 10 }}>
                <span style={{ fontSize: 18, color: '#47cc24' }}>{meta.symbol}</span>
                <span style={{ fontSize: 13, fontWeight: 700, color: '#a9f795', letterSpacing: '.02em' }}>{meta.label}</span>
                <span style={{ fontFamily: 'monospace', fontSize: 11, color: '#3a9e1f' }}>{ids.length}</span>
              </div>
              {[...new Set(STELLATION_IDS.map((id) => stellationInfo(id)!.solid))].map((solid) => {
                const shown = ids.filter((id) => stellationInfo(id)?.solid === solid);
                if (shown.length === 0) return null;
                return (
                  <div key={solid} data-testid={`stellation-section-${solid}`} style={{ marginBottom: 14 }}>
                    <div style={{ fontSize: 13, fontWeight: 700, color: '#8b82ff', letterSpacing: '.03em', borderBottom: '1px solid rgba(139,130,255,.35)', paddingBottom: 4, marginBottom: 8 }}>{stellatedSolidName(solid)}</div>
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(120px, 1fr))', gap: 10 }}>
                      {shown.map((id) => (
                        <ShapePreviewCard
                          key={id}
                          specId={id}
                          lang={lang}
                          activeFamilies={[fam]}
                          isFavorite={isFavorite(id)}
                          inCompare={isInCompare(id)}
                          onOpen={onOpenShape}
                          onToggleFavorite={onToggleFavorite}
                          onToggleCompare={onToggleCompare}
                        />
                      ))}
                    </div>
                  </div>
                );
              })}
            </div>
          );
        }
        if (fam === 'BRIDGES_3D') {
          // In sections by bridge type (direct decision 2026-09-30): Cells,
          // Shadows, Slices, Corners -- see bridges.ts.
          return (
            <div key={fam} id={sectionDomId(fam)}>
              <div style={{ display: 'flex', alignItems: 'baseline', gap: 8, marginBottom: 10 }}>
                <span style={{ fontSize: 18, color: '#47cc24' }}>{meta.symbol}</span>
                <span style={{ fontSize: 13, fontWeight: 700, color: '#a9f795', letterSpacing: '.02em' }}>{meta.label}</span>
                <span style={{ fontFamily: 'monospace', fontSize: 11, color: '#3a9e1f' }}>{ids.length}</span>
              </div>
              {BRIDGE_SECTIONS.map((sec) => {
                const shown = sec.ids.filter((id) => ids.includes(id));
                if (shown.length === 0) return null;
                return (
                  <div key={sec.id} data-testid={`bridge-section-${sec.id}`} style={{ marginBottom: 14 }}>
                    <div style={{ fontSize: 13, fontWeight: 700, color: '#d946a8', letterSpacing: '.03em', borderBottom: '1px solid rgba(217,70,168,.35)', paddingBottom: 4, marginBottom: 8 }}>{t(`bridges.section.${sec.id}`, lang)}</div>
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(120px, 1fr))', gap: 10 }}>
                      {shown.map((id) => (
                        <ShapePreviewCard
                          key={id}
                          specId={id}
                          lang={lang}
                          activeFamilies={[fam]}
                          isFavorite={isFavorite(id)}
                          inCompare={isInCompare(id)}
                          onOpen={onOpenShape}
                          onToggleFavorite={onToggleFavorite}
                          onToggleCompare={onToggleCompare}
                        />
                      ))}
                    </div>
                  </div>
                );
              })}
            </div>
          );
        }
        return (
          <div key={fam} id={sectionDomId(fam)}>
            <div style={{ display: 'flex', alignItems: 'baseline', gap: 8, marginBottom: 10 }}>
              <span style={{ fontSize: 18, color: '#47cc24' }}>{meta.symbol}</span>
              <span style={{ fontSize: 13, fontWeight: 700, color: '#a9f795', letterSpacing: '.02em' }}>{meta.label}</span>
              <span style={{ fontFamily: 'monospace', fontSize: 11, color: '#3a9e1f' }}>{ids.length}</span>
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(120px, 1fr))', gap: 10 }}>
              {ids.map((id) => (
                <ShapePreviewCard
                  key={`${fam}:${id}`}
                  specId={id}
                  lang={lang}
                  activeFamilies={[fam]}
                  isFavorite={isFavorite(id)}
                  inCompare={isInCompare(id)}
                  onOpen={onOpenShape}
                  onToggleFavorite={onToggleFavorite}
                  onToggleCompare={onToggleCompare}
                />
              ))}
            </div>
          </div>
        );
      })}
      {/* Star polyhedra (Kepler-Poinsot solids): never attachable (their
          faces cross; see starPolyhedra.ts), so this section is skipped
          whenever Full Catalog is an attach-flow picker (filterIds set).
          Three of them can be built from Stellations pieces on a
          dodecahedron; their details say how. */}
      {!filterIds && STAR_POLYHEDRON_IDS.length > 0 && (
        <div id={sectionDomId('STAR')}>
          <div style={{ display: 'flex', alignItems: 'baseline', gap: 8, marginBottom: 10 }}>
            <span style={{ fontSize: 18, color: '#47cc24' }}>★</span>
            <span style={{ fontSize: 13, fontWeight: 700, color: '#a9f795', letterSpacing: '.02em' }}>Star Polyhedra</span>
            <span style={{ fontFamily: 'monospace', fontSize: 11, color: '#3a9e1f' }}>{STAR_POLYHEDRON_IDS.length}</span>
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(120px, 1fr))', gap: 10 }}>
            {STAR_POLYHEDRON_IDS.map((id) => (
              <ShapePreviewCard
                key={`star:${id}`}
                specId={id}
                lang={lang}
                activeFamilies={[]}
                isFavorite={isFavorite(id)}
                inCompare={isInCompare(id)}
                onOpen={onOpenShape}
                onToggleFavorite={onToggleFavorite}
                onToggleCompare={onToggleCompare}
              />
            ))}
          </div>
        </div>
      )}
      {filterIds && FAMILY_ORDER.every((fam) => familyIds(fam).filter((id) => filterIds.includes(id)).length === 0) && (
        <div style={{ color: '#3a9e1f', fontSize: 12, textAlign: 'center', padding: '48px 0' }}>
          {t('search.noResults', lang)}
        </div>
      )}
    </div>
  );
}
