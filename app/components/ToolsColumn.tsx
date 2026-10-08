'use client';

/**
 * The tools column, top right of the scene (DICTO 2026-10-08: the wheels are gone, in Polyhedraverse as in
 * Kaleidohedra and Rhombiverse): the shape browser, projection, About and language, one under another
 * in Polyhedraverse's green. View and Save keep their own buttons in the panel (nothing shown twice).
 */
import { usePrefs } from '../lib/prefs';
import { LANG_ORDER, LANG_META, t } from '../lib/i18n';
import type { ProjectionMode } from './ShapeViewer';

const PROJECTIONS: ProjectionMode[] = ['perspective', 'orthographic', 'isometric'];
const PROJECTION_MARK: Record<ProjectionMode, string> = { perspective: '3D', orthographic: '∥', isometric: 'ISO' };

interface Props {
  browserOpen: boolean;
  onToggleBrowser: () => void;
  projection: ProjectionMode;
  onProjection: (mode: ProjectionMode) => void;
  onAbout: () => void;
}

export default function ToolsColumn({ browserOpen, onToggleBrowser, projection, onProjection, onAbout }: Props) {
  const { language, setLanguage } = usePrefs();
  const nextLang = LANG_ORDER[(LANG_ORDER.indexOf(language) + 1) % LANG_ORDER.length];
  const button = (active = false): React.CSSProperties => ({
    width: 44, height: 44, display: 'flex', alignItems: 'center', justifyContent: 'center',
    background: active ? 'rgba(94,226,51,0.35)' : 'rgba(6,10,4,0.72)', color: active ? '#fff' : '#a9f795',
    border: `1px solid ${active ? '#5ee233' : 'rgba(94,226,51,0.45)'}`, borderRadius: 8,
    fontSize: 20, lineHeight: 1, cursor: 'pointer', touchAction: 'manipulation', padding: 0,
  });
  const projectionTitle = `${t('projection.label', language)}: ${t(`projection.${projection}`, language)}`;
  return (
    <div
      data-testid="tools-column"
      style={{ position: 'absolute', top: 12, right: 12, zIndex: 20, display: 'flex', flexDirection: 'column', gap: 6 }}
    >
      <button type="button" style={button(browserOpen)} onClick={onToggleBrowser} title={t('tools.browser', language)} aria-label={t('tools.browser', language)}>◈</button>
      <button
        type="button"
        data-testid="projection-toggle"
        style={{ ...button(projection !== 'perspective'), fontSize: 11, fontWeight: 800, letterSpacing: '0.04em' }}
        onClick={() => onProjection(PROJECTIONS[(PROJECTIONS.indexOf(projection) + 1) % PROJECTIONS.length])}
        title={projectionTitle}
        aria-label={projectionTitle}
      >
        {PROJECTION_MARK[projection]}
      </button>
      <button type="button" style={button()} onClick={onAbout} title={t('tools.about', language)} aria-label={t('tools.about', language)}>ℹ</button>
      <button
        type="button"
        style={{ ...button(), flexDirection: 'column', gap: 1 }}
        onClick={() => setLanguage(nextLang)}
        title={`${t('lang.button', language)}: ${LANG_META[nextLang].native}`}
        aria-label={`${t('lang.button', language)}: ${LANG_META[nextLang].native}`}
      >
        <span style={{ fontSize: 16 }}>🌐</span>
        <span style={{ fontSize: 8, opacity: 0.8 }}>{language.toUpperCase()}</span>
      </button>
    </div>
  );
}
