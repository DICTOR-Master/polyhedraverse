'use client';

/**
 * In-app "How to use" guide: renders docs/guide.md (fetched from the
 * static /guide.md route -- the same file the shareable /guide page
 * renders) in a full-screen overlay. English only for now.
 */

import { useEffect, useRef, useState } from 'react';
import { renderMarkdown, GUIDE_CSS } from '../lib/markdown';

export interface GuideOverlayProps {
  open: boolean;
  onClose: () => void;
}

const GREEN_BRIGHT = '#5ee233';
const PANEL_BORDER = 'rgba(71,204,36,.3)';

export default function GuideOverlay({ open, onClose }: GuideOverlayProps) {
  const [html, setHtml] = useState<string | null>(null);
  const [failed, setFailed] = useState(false);
  const bodyRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open || html !== null) return;
    fetch('/guide.md')
      .then((r) => (r.ok ? r.text() : Promise.reject(new Error(`HTTP ${r.status}`))))
      .then((md) => setHtml(renderMarkdown(md)))
      .catch(() => setFailed(true));
  }, [open, html]);

  useEffect(() => {
    if (!open) return;
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' || e.key === 'Enter') {
        // Capture phase + stop, so Enter doesn't also hit the welcome
        // screen's ENTER underneath.
        e.preventDefault();
        e.stopImmediatePropagation();
        if (e.key === 'Escape') onClose();
      }
    };
    window.addEventListener('keydown', onKeyDown, true);
    return () => window.removeEventListener('keydown', onKeyDown, true);
  }, [open, onClose]);

  if (!open) return null;

  // In-page #anchor links scroll inside the overlay rather than
  // changing the URL.
  const onBodyClick = (e: React.MouseEvent) => {
    const a = (e.target as HTMLElement).closest('a[href^="#"]');
    if (!a) return;
    e.preventDefault();
    bodyRef.current?.querySelector(`[id="${CSS.escape(a.getAttribute('href')!.slice(1))}"]`)?.scrollIntoView({ behavior: 'smooth' });
  };

  return (
    <div
      role="dialog"
      aria-label="How to use Polyhedraverse"
      style={{ position: 'fixed', inset: 0, zIndex: 1000, display: 'flex', flexDirection: 'column', background: '#000' }}
    >
      <style>{GUIDE_CSS}</style>
      <div style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '10px 16px', borderBottom: `1px solid ${PANEL_BORDER}`, fontSize: 13 }}>
        <button
          type="button"
          onClick={onClose}
          title="Close (Esc)"
          aria-label="Close"
          style={{ minWidth: 44, minHeight: 44, background: 'none', border: `1px solid ${PANEL_BORDER}`, borderRadius: 8, color: GREEN_BRIGHT, fontSize: 18, cursor: 'pointer' }}
        >
          ✕
        </button>
        <a href="/guide" target="_blank" rel="noopener" style={{ color: GREEN_BRIGHT, marginLeft: 'auto' }}>
          Open as a page to share &rarr;
        </a>
      </div>
      <div ref={bodyRef} onClick={onBodyClick} style={{ flex: 1, overflowY: 'auto', WebkitOverflowScrolling: 'touch', padding: '20px 16px 48px' }}>
        {html !== null ? (
          <div className="md-guide" dangerouslySetInnerHTML={{ __html: html }} />
        ) : (
          <div className="md-guide">{failed ? 'The guide could not be loaded. Check your connection and try again.' : 'Loading…'}</div>
        )}
      </div>
    </div>
  );
}
