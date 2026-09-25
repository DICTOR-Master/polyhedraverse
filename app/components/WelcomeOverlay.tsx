'use client';

/**
 * First-run welcome overlay -- rotating dodecahedron logo (reuses
 * ShapePreview, the SAME 2D-canvas wireframe renderer the ShapeBrowser's
 * own detail drawer/Compare use, rather than a second hand-rolled
 * projection -- both less code and automatic visual parity with the
 * browser, not a coincidence), a static always-clickable ENTER label
 * overlaid on top, a cross-link to Rhombiverse (this project's twin --
 * see docs/vercel-deployment-plan.md and both repos' own descriptions),
 * and the same legal-doc links every page in this family of projects
 * carries. Modeled directly on Rhombiverse's src/app/welcome.js (rotating
 * RD logo, static ENTER, "don't show again", persistent "About" reopen),
 * adapted to this project's green/black identity and React conventions
 * instead of ported wholesale -- see [[polyhedraverse-wheel]] memory for
 * why a straight port isn't always the right call, and this component for
 * where it genuinely is (the mechanic, not the RD-specific visuals).
 */

import { useCallback, useEffect } from 'react';
import ShapePreview from './browser/ShapePreview';
import { usePrefs } from '../lib/prefs';
import { POLYHEDRON_IDS } from '../lib/polyhedra';
import { STAR_POLYHEDRON_IDS } from '../lib/polyhedra/starPolyhedra';
import { t } from '../lib/i18n';
import LanguagePicker from './LanguagePicker';

export interface WelcomeOverlayProps {
  open: boolean;
  /** Hides the overlay for the current session -- always fired on ENTER,
   *  regardless of the "don't show again" checkbox below (that checkbox
   *  only controls whether it comes back on a FUTURE visit, handled
   *  internally here via usePrefs(), not by the caller). */
  onClose: () => void;
  onOpenGuide: () => void;
}

const GREEN = '#47cc24';
const GREEN_BRIGHT = '#5ee233';
const GREEN_PALE = '#a9f795';
const PANEL_BG = '#0e1209';
const PANEL_BORDER = 'rgba(71,204,36,.3)';

export default function WelcomeOverlay({ open, onClose, onOpenGuide }: WelcomeOverlayProps) {
  const { language } = usePrefs();

  const enter = useCallback(() => onClose(), [onClose]);

  useEffect(() => {
    if (!open) return;
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Enter') {
        e.preventDefault();
        enter();
      }
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [open, enter]);

  if (!open) return null;

  return (
    <div
      style={{
        position: 'fixed',
        inset: 0,
        zIndex: 995,
        background: '#000',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
      }}
      role="dialog"
      aria-label="Welcome to Polyhedraverse"
    >
      <div
        style={{
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          gap: 14,
          padding: '32px 36px',
          background: PANEL_BG,
          border: `1px solid ${PANEL_BORDER}`,
          borderRadius: 14,
          maxWidth: 420,
          textAlign: 'center',
        }}
      >
        <LanguagePicker />
        <h1 style={{ margin: 0, fontSize: 26, fontWeight: 800, color: GREEN_PALE, letterSpacing: 0.5 }}>
          Polyhedra<span style={{ color: GREEN }}>verse</span>
        </h1>
        <p style={{ margin: 0, fontSize: 13, opacity: 0.8, fontStyle: 'italic', color: GREEN_BRIGHT }}>
          {/* Real bug, direct report ("Entry page is stale... many more
              shapes than 137"): this hand-typed count went stale the
              moment new shapes shipped after it was last updated --
              derived from POLYHEDRON_IDS.length now (the star solids
              below are a genuinely separate registry, never included in
              this count in the first place, so no extra subtraction is
              needed here). */}
          {t('welcome.overview', language, { n: POLYHEDRON_IDS.length })}
        </p>
        {/* Real user catch: the welcome page never mentioned the 4 Kepler-
            Poinsot star solids at all, undersizing what the app actually
            has. Deliberately its own smaller, dimmer line rather than
            folded into the count above -- these 4 are look-only
            (self-intersecting faces, no well-defined flush attach), so
            stating them as part of the same "connect them" claim would be
            wrong, not just imprecise. */}
        <p style={{ margin: 0, fontSize: 11, opacity: 0.6, color: GREEN_BRIGHT }}>
          {t('welcome.stars', language, { n: STAR_POLYHEDRON_IDS.length })}
        </p>

        <button
          type="button"
          onClick={onOpenGuide}
          style={{
            minHeight: 36,
            padding: '4px 14px',
            background: 'none',
            border: `1px solid ${PANEL_BORDER}`,
            borderRadius: 18,
            color: GREEN_BRIGHT,
            fontSize: 13,
            cursor: 'pointer',
          }}
        >
          {t('welcome.howTo', language)}
        </button>

        <div style={{ position: 'relative', width: 180, height: 180 }}>
          <ShapePreview specId="DODECAHEDRON" size={180} spin />
          {/* Static ENTER label, fixed at center regardless of the logo's
              rotation phase -- same mechanic as Rhombiverse's own welcome
              screen (see its module header for why: a swinging/rotating
              hit target read as unreliable, a fixed one doesn't). */}
          <button
            type="button"
            onClick={enter}
            style={{
              position: 'absolute',
              inset: 0,
              margin: 'auto',
              width: 76,
              height: 32,
              background: 'none',
              border: 'none',
              color: GREEN_PALE,
              fontWeight: 800,
              fontSize: 17,
              letterSpacing: 2,
              cursor: 'pointer',
              textShadow: '0 0 6px #04140c, 0 0 6px #04140c',
            }}
          >
            ENTER
          </button>
        </div>

        <div style={{ display: 'flex', alignItems: 'flex-start', gap: 8, fontSize: 12 }}>
          {/* Rhombiverse's own real favicon (copied from its repo root
              favicon.svg, not the separate RHOMBIS sub-puzzle's icon --
              this links to Rhombiverse itself), same small-square-icon-
              next-to-cross-link pattern as its own welcome screen's
              "Try RHOMBIS" row. alignItems:flex-start (not center) on
              the row -- real bug found live: on a narrow screen this
              link text wraps to multiple lines, and center-aligning
              against the WHOLE wrapped block visually drops the icon
              down to the paragraph's middle instead of anchoring it to
              the first line, reading as misaligned. flexShrink:0 stops
              a narrow flex container from squeezing the icon down from
              its real 28x28. */}
          {/* eslint-disable-next-line @next/next/no-img-element -- a
              small static public/ SVG, not a candidate for next/image's
              optimization pipeline. */}
          <img
            src="/brand/rhombiverse-icon.svg"
            alt=""
            width={28}
            height={28}
            style={{ borderRadius: 6, flexShrink: 0 }}
          />
          <a href="https://rhombiverse.vercel.app" target="_blank" rel="noopener" style={{ color: GREEN_BRIGHT }}>
            {t('welcome.rhombiverseLink', language)}
          </a>
        </div>

        <div style={{ display: 'flex', gap: 8, fontSize: 11, opacity: 0.7, color: GREEN_BRIGHT }}>
          {/* Rendered on-site from the repo-root .md files (app/terms,
              app/privacy, app/security), like Rhombiverse's own. */}
          <a
            href="/terms"
            target="_blank"
            rel="noopener"
            style={{ color: 'inherit' }}
          >
            Terms
          </a>
          ·
          <a
            href="/privacy"
            target="_blank"
            rel="noopener"
            style={{ color: 'inherit' }}
          >
            Privacy
          </a>
          ·
          <a
            href="/security"
            target="_blank"
            rel="noopener"
            style={{ color: 'inherit' }}
          >
            Security
          </a>
          ·
          <a href="https://github.com/DICTOR-Master/polyhedraverse" target="_blank" rel="noopener" style={{ color: 'inherit' }}>
            Source
          </a>
        </div>
      </div>
    </div>
  );
}
