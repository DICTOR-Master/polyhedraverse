'use client';

/**
 * The running assembly-name description, moved out of the header
 * (direct user report, 2026-09-17: even truncated with max-w-xs, it was
 * "way too long... taking up useful space across UI") into a tap-to-open
 * popover anchored over the 3D object itself, closeable rather than a
 * permanent fixture. Small floating panel, not a full-screen modal like
 * ChangelogOverlay/WelcomeOverlay -- same green identity/colors for
 * visual consistency, but positioned near a given screen point instead
 * of centered with a backdrop, since this is a lightweight, dismissible
 * annotation about a specific on-screen object, not a standalone view.
 */

import { useEffect, useRef } from 'react';

export interface AssemblyDescriptionPopoverProps {
  open: boolean;
  text: string;
  /** Viewport pixel coordinates to anchor near -- a one-off snapshot from ShapeViewerHandle.getRootScreenPosition(), not live-tracked. */
  anchor: { x: number; y: number } | null;
  onClose: () => void;
}

const GREEN = '#47cc24';
const GREEN_BRIGHT = '#5ee233';
const GREEN_PALE = '#a9f795';
const PANEL_BG = 'rgba(10, 12, 20, 0.97)';
const PANEL_BORDER = 'rgba(71,204,36,.3)';

const PANEL_WIDTH = 280;
const MARGIN = 12;

export default function AssemblyDescriptionPopover({ open, text, anchor, onClose }: AssemblyDescriptionPopoverProps) {
  const panelRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        e.preventDefault();
        onClose();
      }
    };
    // Click-outside-to-close, same discoverability as Esc -- this is a
    // lightweight annotation popover, not a modal requiring an explicit
    // dismiss action.
    const onPointerDown = (e: PointerEvent) => {
      if (panelRef.current && !panelRef.current.contains(e.target as Node)) onClose();
    };
    window.addEventListener('keydown', onKeyDown);
    window.addEventListener('pointerdown', onPointerDown);
    return () => {
      window.removeEventListener('keydown', onKeyDown);
      window.removeEventListener('pointerdown', onPointerDown);
    };
  }, [open, onClose]);

  if (!open) return null;

  // Anchor near the object's own screen position, clamped so the panel
  // never overflows the viewport regardless of where on screen the
  // object currently sits (a corner, an edge, etc.).
  const fallbackX = typeof window !== 'undefined' ? window.innerWidth / 2 : 0;
  const fallbackY = typeof window !== 'undefined' ? window.innerHeight / 2 : 0;
  const rawX = anchor?.x ?? fallbackX;
  const rawY = anchor?.y ?? fallbackY;
  const viewportWidth = typeof window !== 'undefined' ? window.innerWidth : PANEL_WIDTH + MARGIN * 2;
  const viewportHeight = typeof window !== 'undefined' ? window.innerHeight : 400;
  const left = Math.min(Math.max(rawX - PANEL_WIDTH / 2, MARGIN), viewportWidth - PANEL_WIDTH - MARGIN);
  // Prefer sitting just above the anchor point (the object itself), so
  // the panel doesn't cover what it's describing; flip below if there's
  // not enough room above.
  const estimatedHeight = 140;
  const above = rawY - estimatedHeight - 16;
  const top = above > MARGIN ? above : Math.min(rawY + 16, viewportHeight - estimatedHeight - MARGIN);

  return (
    <div
      ref={panelRef}
      role="dialog"
      aria-label="Assembly description"
      style={{
        position: 'fixed',
        left,
        top,
        width: PANEL_WIDTH,
        zIndex: 950,
        display: 'flex',
        flexDirection: 'column',
        gap: 8,
        padding: '12px 14px',
        background: PANEL_BG,
        border: `1px solid ${PANEL_BORDER}`,
        borderRadius: 12,
        boxShadow: '0 8px 24px rgba(0,0,0,0.5)',
      }}
    >
      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 8 }}>
        <span style={{ fontSize: 11, fontWeight: 700, color: GREEN, textTransform: 'uppercase', letterSpacing: '0.04em' }}>Assembly</span>
        <button
          type="button"
          onClick={onClose}
          aria-label="Close"
          style={{
            background: 'none',
            border: 'none',
            color: GREEN_BRIGHT,
            cursor: 'pointer',
            fontSize: 16,
            lineHeight: 1,
            padding: 0,
          }}
        >
          ×
        </button>
      </div>
      <p style={{ margin: 0, fontSize: 13, lineHeight: 1.4, color: GREEN_PALE, wordBreak: 'break-word' }}>{text}</p>
    </div>
  );
}
