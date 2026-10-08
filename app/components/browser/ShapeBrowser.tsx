'use client';

/**
 * ShapeBrowser -- the karaoke-box-style ("Joysound"-inspired) home/picker
 * for choosing a shape, replacing the flat "Start over with…" button row
 * and becoming the default entry point (Tab/Space, "Start over with…",
 * "Attach via face…", the tools column's ◈).
 *
 * Progressive disclosure by construction: exactly one of four tab screens
 * (Home/Search/Scene/Favorites) is mounted at a time, plus at most one
 * overlay-within-overlay (the shape detail drawer or Compare) -- never a single dashboard showing everything at once.
 */

import { useState } from 'react';
import { usePrefs } from '../../lib/prefs';
import { t, LANG_ORDER, LANG_META, type LangCode } from '../../lib/i18n';
import { type FamilyKey } from '../../../krp-core/src/polyhedra/families.js';
import type { Filters } from '../../../krp-core/src/polyhedra/search.js';
import HomeScreen from './HomeScreen';
import SearchScreen from './SearchScreen';
import FavoritesScreen from './FavoritesScreen';
import SceneScreen from './SceneScreen';
import ShapeDetailDrawer from './ShapeDetailDrawer';
import PolytopeDetailDrawer from './PolytopeDetailDrawer';
import { polytope4D } from '../../../krp-core/src/polyhedra/polytopes4d.js';
import CompareScreen from './CompareScreen';
import FullCatalogScreen from './FullCatalogScreen';
import type { AssemblySummary } from './types';

export type BrowserTab = 'home' | 'search' | 'scene' | 'favorites';

export interface ShapeBrowserProps {
  open: boolean;
  onClose: () => void;
  /** When set, only
   *  these ids are selectable anywhere in the browser (e.g. face-attach). */
  filterIds?: string[];
  /** Face-attach: the selected shape's pair partners that fit, shown
   *  first in the Full Catalog. */
  partnerIds?: string[];
  /** Fired once a shape is chosen for the current intent. */
  onSelect: (shapeId: string) => void;
  /** A 4D polytope's Build: start RCP-C2B from this seed cell towards this target. */
  onBuildPolytope?: (seed: string, target: string) => void;
  /** Phase 2: live scene summary. Undefined in Phase 1 (Scene tab shows
   *  an empty-state placeholder). */
  assemblySummary?: AssemblySummary;
}

const TABS: BrowserTab[] = ['home', 'search', 'scene', 'favorites'];
const TAB_LABEL_KEY: Record<BrowserTab, string> = {
  home: 'tab.home',
  search: 'tab.search',
  scene: 'tab.scene',
  favorites: 'tab.favorites',
};

export default function ShapeBrowser({
  open,
  onClose,
  filterIds,
  partnerIds,
  onSelect,
  onBuildPolytope,
  assemblySummary,
}: ShapeBrowserProps) {
  const { favorites, recents, language, toggleFavorite, recordViewed, setLanguage } = usePrefs();
  const [tab, setTab] = useState<BrowserTab>('home');
  const [searchSeed, setSearchSeed] = useState<Partial<Filters> | undefined>(undefined);
  const [selectedShapeId, setSelectedShapeId] = useState<string | null>(null);
  const [compareIds, setCompareIds] = useState<string[]>([]);
  const [showCompare, setShowCompare] = useState(false);
  const [showFullCatalog, setShowFullCatalog] = useState(false);
  const [focusSection, setFocusSection] = useState<FamilyKey | 'STAR' | undefined>(undefined);
  const [langMenuOpen, setLangMenuOpen] = useState(false);

  // Real user complaint (2026-09-15): opening the browser in face-attach
  // mode (filterIds set) used to always land on the plain Home screen --
  // family CARDS with counts, not the actual compatible shapes -- so
  // seeing what could actually attach meant an extra manual step into
  // Full Catalog ("sometimes no shapes are offered and you have to go
  // looking"). This component stays mounted across open/close (`if
  // (!open) return null` below, not an unmount), so a plain `useState`
  // initializer only ever runs once and can't react to a later re-open
  // with filterIds active -- detect the open-transition during render
  // instead, the same pattern fullCatalogRequestId/searchRequestId above
  // already use. Scoped to when filterIds is ACTUALLY present, so a
  // normal (unfiltered) re-open keeps whichever screen it already had.
  const [prevOpenForFilter, setPrevOpenForFilter] = useState(open);
  if (open !== prevOpenForFilter) {
    setPrevOpenForFilter(open);
    if (open && filterIds) {
      setShowFullCatalog(true);
      setFocusSection(undefined);
    }
  }

  if (!open) return null;
  const lang: LangCode = language;

  const isFavorite = (id: string) => favorites.includes(id);
  const isInCompare = (id: string) => compareIds.includes(id);

  const openShape = (id: string) => {
    setSelectedShapeId(id);
    // Recents hold shapes; a 4D polytope isn't one.
    if (!polytope4D(id)) recordViewed(id);
  };

  const toggleCompare = (id: string) => {
    setCompareIds((prev) => {
      if (prev.includes(id)) return prev.filter((x) => x !== id);
      if (prev.length >= 4) return [...prev.slice(1), id]; // FIFO eviction at the cap
      return [...prev, id];
    });
  };

  const selectFamily = (family: FamilyKey) => {
    // Space-Filling Pairs is about PAIRS, not a flat shape list (direct
    // decision: pair rows) -- open Full Catalog at its own section, which
    // renders it as one row per pair, instead of a flat filtered search.
    // 3D+ Bridges likewise, for its Cells/Shadows/Slices/Corners sections
    // (direct report 2026-09-30: "cant make out four sections"), and
    // Stellations for its one section per solid, Parallelohedra for
    // Fedorov's five and their variants, and 4D Polytopes for its
    // symmetry sections.
    if (family === 'SPACE_FILLING_PAIRS' || family === 'BRIDGES_3D' || family === 'STELLATIONS' || family === 'PARALLELOHEDRA' || family === 'POLYTOPES_4D') {
      setFocusSection(family);
      setShowFullCatalog(true);
      return;
    }
    setSearchSeed({ families: [family] });
    setTab('search');
  };

  const commitSelection = (id: string) => {
    setSelectedShapeId(null);
    onSelect(id);
  };

  return (
    <div style={{ position: 'fixed', inset: 0, zIndex: 985, background: '#000', display: 'flex', flexDirection: 'column' }} role="dialog" aria-label="Shape browser">
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '12px 16px', borderBottom: '1px solid rgba(71,204,36,.16)' }}>
        <div style={{ display: 'flex', alignItems: 'baseline', gap: 8 }}>
          <span style={{ color: '#47cc24', fontSize: 18 }}>◈</span>
          <span style={{ color: '#a9f795', fontWeight: 800, fontSize: 15 }}>
            Shape<b style={{ color: '#47cc24' }}>Browser</b>
          </span>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, position: 'relative' }}>
          <button
            type="button"
            onClick={() => setLangMenuOpen((v) => !v)}
            aria-haspopup="true"
            aria-expanded={langMenuOpen}
            style={{ display: 'flex', alignItems: 'center', gap: 6, background: '#0e1209', border: '1px solid rgba(71,204,36,.16)', color: '#5ee233', borderRadius: 7, padding: '5px 10px', fontSize: 11, cursor: 'pointer' }}
          >
            {lang.toUpperCase()}
          </button>
          {langMenuOpen && (
            <div style={{ position: 'absolute', top: '100%', right: 0, marginTop: 6, background: '#0e1209', border: '1px solid rgba(71,204,36,.3)', borderRadius: 9, padding: 5, zIndex: 10, minWidth: 130 }}>
              {LANG_ORDER.map((code) => (
                <button
                  key={code}
                  type="button"
                  onClick={() => {
                    setLanguage(code);
                    setLangMenuOpen(false);
                  }}
                  style={{ display: 'flex', justifyContent: 'space-between', width: '100%', gap: 10, background: 'none', border: 'none', color: code === lang ? '#47cc24' : '#5ee233', fontSize: 12, textAlign: 'left', padding: '7px 8px', borderRadius: 6, cursor: 'pointer' }}
                >
                  <span>{LANG_META[code].native}</span>
                  <span style={{ fontFamily: 'monospace', fontSize: 9, opacity: 0.7 }}>{code.toUpperCase()}</span>
                </button>
              ))}
            </div>
          )}
          <button
            type="button"
            onClick={() => {
              setFocusSection(undefined);
              setShowFullCatalog(true);
            }}
            aria-pressed={showFullCatalog}
            style={{ background: showFullCatalog ? 'rgba(71,204,36,.18)' : 'none', border: '1px solid rgba(71,204,36,.3)', color: '#5ee233', borderRadius: 7, padding: '5px 12px', fontSize: 11, cursor: 'pointer' }}
          >
            {t('catalog.full', lang)}
          </button>
          <button
            type="button"
            onClick={onClose}
            style={{ background: 'none', border: '1px solid rgba(71,204,36,.3)', color: '#5ee233', borderRadius: 7, padding: '5px 12px', fontSize: 11, cursor: 'pointer' }}
          >
            {t('action.close', lang)}
          </button>
        </div>
      </div>

      <div style={{ position: 'relative', flex: 1, minHeight: 0, display: 'flex', flexDirection: 'column' }}>
        {showFullCatalog ? (
          <>
            <div style={{ padding: '10px 18px', borderBottom: '1px solid rgba(71,204,36,.16)' }}>
              <button
                type="button"
                onClick={() => {
                  setShowFullCatalog(false);
                  setFocusSection(undefined);
                }}
                style={{ background: 'none', border: '1px solid rgba(71,204,36,.3)', color: '#5ee233', borderRadius: 6, padding: '4px 10px', fontSize: 11, cursor: 'pointer' }}
              >
                {t('action.back', lang)}
              </button>
            </div>
            <FullCatalogScreen
              lang={lang}
              filterIds={filterIds}
              partnerIds={partnerIds}
              focusSection={focusSection}
              isFavorite={isFavorite}
              isInCompare={isInCompare}
              onOpenShape={openShape}
              onToggleFavorite={toggleFavorite}
              onToggleCompare={toggleCompare}
            />
          </>
        ) : (
          <>
            {tab === 'home' && (
              <HomeScreen
                lang={lang}
                recents={recents}
                favorites={favorites}
                filterIds={filterIds}
                onSelectFamily={selectFamily}
                onOpenShape={openShape}
                onSeeAllRecent={() => {
                  setSearchSeed(undefined);
                  setTab('search');
                }}
                onSeeAllFavorites={() => setTab('favorites')}
                isFavorite={isFavorite}
                isInCompare={isInCompare}
                onToggleFavorite={toggleFavorite}
                onToggleCompare={toggleCompare}
              />
            )}
            {tab === 'search' && (
              <SearchScreen
                key={JSON.stringify(searchSeed)}
                lang={lang}
                filterIds={filterIds}
                initialFilters={searchSeed}
                isFavorite={isFavorite}
                isInCompare={isInCompare}
                onOpenShape={openShape}
                onToggleFavorite={toggleFavorite}
                onToggleCompare={toggleCompare}
              />
            )}
            {tab === 'scene' && <SceneScreen lang={lang} assemblySummary={assemblySummary} />}
            {tab === 'favorites' && (
              <FavoritesScreen
                lang={lang}
                favorites={favorites}
                filterIds={filterIds}
                isInCompare={isInCompare}
                onOpenShape={openShape}
                onToggleFavorite={toggleFavorite}
                onToggleCompare={toggleCompare}
              />
            )}
          </>
        )}

        {selectedShapeId && polytope4D(selectedShapeId) && (
          <PolytopeDetailDrawer
            id={selectedShapeId}
            lang={lang}
            onClose={() => setSelectedShapeId(null)}
            onBuild={(seed, target) => {
              setSelectedShapeId(null);
              onBuildPolytope?.(seed, target);
            }}
          />
        )}
        {selectedShapeId && !polytope4D(selectedShapeId) && (
          <ShapeDetailDrawer
            specId={selectedShapeId}
            lang={lang}
            isFavorite={isFavorite(selectedShapeId)}
            inCompare={isInCompare(selectedShapeId)}
            onClose={() => setSelectedShapeId(null)}
            onSelectShape={commitSelection}
            onToggleFavorite={toggleFavorite}
            onToggleCompare={toggleCompare}
          />
        )}

        {showCompare && (
          <CompareScreen lang={lang} ids={compareIds} onRemove={toggleCompare} onClose={() => setShowCompare(false)} />
        )}
      </div>

      {compareIds.length > 0 && !showCompare && (
        <button
          type="button"
          onClick={() => setShowCompare(true)}
          style={{
            position: 'absolute',
            bottom: 70,
            left: '50%',
            transform: 'translateX(-50%)',
            background: '#2e8a17',
            border: 'none',
            color: '#04140a',
            borderRadius: 999,
            padding: '8px 18px',
            fontWeight: 600,
            fontSize: 12,
            cursor: 'pointer',
            zIndex: 15,
          }}
        >
          {t('compare.selectedMax', lang, { n: compareIds.length })}
        </button>
      )}

      <nav
        style={{
          display: 'flex',
          borderTop: '1px solid rgba(71,204,36,.16)',
        }}
      >
        {TABS.map((tb) => (
          <button
            key={tb}
            type="button"
            onClick={() => {
              setShowFullCatalog(false);
              setFocusSection(undefined);
              setTab(tb);
            }}
            style={{
              flex: 1,
              background: 'none',
              border: 'none',
              color: tab === tb ? '#47cc24' : '#3a9e1f',
              padding: '12px 0',
              fontSize: 12,
              fontWeight: tab === tb ? 700 : 400,
              cursor: 'pointer',
            }}
          >
            {t(TAB_LABEL_KEY[tb], lang)}
          </button>
        ))}
      </nav>

    </div>
  );
}
