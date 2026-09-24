'use client';

import { useEffect, useRef, useState } from 'react';
import dynamic from 'next/dynamic';
import { POLYHEDRON_IDS } from './lib/polyhedra';
import type { NodeSelection, ShapeSelection, ShapeViewerHandle, ViewMode } from './components/ShapeViewer';
import PolyhedralWheel from './components/PolyhedralWheel';
import CornerHudWheel from './components/CornerHudWheel';
import ShapeBrowser from './components/browser/ShapeBrowser';
import WelcomeOverlay from './components/WelcomeOverlay';
import GuideOverlay from './components/GuideOverlay';
import ChangelogOverlay from './components/ChangelogOverlay';
import AssemblyDescriptionPopover from './components/AssemblyDescriptionPopover';
import { usePrefs } from './lib/prefs';
import { FAMILY_ORDER, type FamilyKey } from './lib/polyhedra/families';

const ShapeViewer = dynamic(() => import('./components/ShapeViewer'), {
  ssr: false,
});

interface Pending {
  specId: string;
  fold4?: boolean;
  duoprism?: boolean;
}

type SaveStatus = 'idle' | 'saving' | 'saved' | 'error';

const VIEW_MODES: ViewMode[] = ['normal', 'translucent', 'skeleton'];
const VIEW_MODE_LABELS: Record<ViewMode, string> = {
  normal: 'Solid',
  translucent: 'Translucent',
  skeleton: 'Inside view',
};

export default function Home() {
  const handleRef = useRef<ShapeViewerHandle | null>(null);
  const saveStatusResetRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const [selection, setSelection] = useState<ShapeSelection | null>(null);
  const [pending, setPending] = useState<Pending | null>(null);
  const [nodeSelection, setNodeSelection] = useState<NodeSelection | null>(null);
  const [rewriteNote, setRewriteNote] = useState<string | null>(null);
  const [cageClosed, setCageClosed] = useState(false);
  // A running, always-on description of the current assembly (see
  // app/lib/assemblyNaming.ts) -- direct user request: "a running total
  // name so far" as pieces get attached. Independent of node selection,
  // so it's available even with nothing selected. Shown via a small tap
  // icon + AssemblyDescriptionPopover rather than a permanent header
  // string -- direct user report, 2026-09-17: even truncated, the full
  // text "taking up useful space across UI" was a real complaint, not a
  // cosmetic nitpick.
  const [assemblyName, setAssemblyName] = useState('');
  const [descriptionOpen, setDescriptionOpen] = useState(false);
  const [descriptionAnchor, setDescriptionAnchor] = useState<{ x: number; y: number } | null>(null);
  const [canUndo, setCanUndo] = useState(false);
  // Bumped whenever the DIRECT wheel (below, opened via CornerHudWheel's
  // medallion) picks "Full Catalog" -- see ShapeBrowser's own
  // fullCatalogRequestId doc comment for why a plain boolean/counter
  // seed wouldn't fire on a second request once ShapeBrowser is already
  // mounted. The embedded wheel INSIDE ShapeBrowser needs no such
  // round-trip, it flips its own local state directly.
  const [fullCatalogRequestId, setFullCatalogRequestId] = useState(0);
  // Paired with fullCatalogRequestId -- which section (if any) the
  // direct wheel's Full Catalog/Star Polyhedra/family "View all" face
  // should land scrolled to. See ShapeBrowser's own
  // fullCatalogFocusSection doc comment.
  const [fullCatalogFocusSection, setFullCatalogFocusSection] = useState<FamilyKey | 'STAR' | undefined>(undefined);
  // Bumped whenever the DIRECT wheel picks "Search" -- same pattern as
  // fullCatalogRequestId, see ShapeBrowser's own searchRequestId doc
  // comment.
  const [searchRequestId, setSearchRequestId] = useState(0);
  const [saveStatus, setSaveStatus] = useState<SaveStatus>('idle');
  const [viewMode, setViewModeState] = useState<ViewMode>('normal');
  // wheelOpen now drives ONLY the literal 3D PolyhedralWheel, opened
  // directly via CornerHudWheel's medallion -- a fast, unchanged shortcut
  // for anyone who wants the wheel itself rather than the browser.
  const [wheelOpen, setWheelOpen] = useState(false);
  // browserOpen drives the karaoke-style ShapeBrowser, which is now the
  // DEFAULT entry point for picking a shape (Tab/Space, "Start over
  // with…", "Attach via face…"). The browser has its own internal "Spin
  // the Wheel" affordance that renders this same PolyhedralWheel in
  // place, sharing the identical onSelect contract below.
  const [browserOpen, setBrowserOpen] = useState(false);
  // 'reset': picking a shape to start over with (no filter). 'faceAttach':
  // picking a shape to attach via the currently-selected free face (only
  // shapes with a matching face size are real options). 'vertexAttach':
  // picking a shape to attach via the currently-selected free vertex --
  // unlike face-attach, ANY shape is a valid vertex-attach target (a
  // vertex ball-joint has no congruence requirement the way a flush face
  // does), so this is unfiltered, same as 'reset' -- it only needs its
  // own mode so onSelect below knows to call beginAttach() instead of
  // reset(). Each is set only when opened via that specific trigger, so
  // it's naturally gone the next time the picker opens from anywhere
  // else. Shared by both the wheel and the browser.
  //
  // 4D fold ("Attach via 4D fold…", a 'faceAttachFold4' mode here)
  // removed for now: it's mathematically exact for a single attached
  // pair, but has a real, unsolved limitation once 3+ copies share an
  // edge (see fold4.ts's own header). Direct user decision: pull the
  // entry point rather than let players reach the known-broken case,
  // now that duoprism.ts's own construction offers an always-exact way
  // to build groups instead. The underlying fold4 machinery
  // (ShapeViewer's beginFaceAttach fold4 param, recomputeAllFolds, the
  // slider) is untouched, so any already-saved assembly with a fold4
  // connection keeps loading and scrubbing correctly -- only the UI path
  // to CREATE a new one is gone.
  const [wheelMode, setWheelMode] = useState<'reset' | 'faceAttach' | 'vertexAttach'>('reset');
  // 4D extension, Stage E: the slider itself only ever renders once the
  // assembly has at least one real fold4 connection (contextual, not a
  // permanent control) -- foldPercent is 0-100 for the <input type="range">
  // UI, converted to fold4.ts's own 0..1 `t` before reaching ShapeViewer.
  // 0 (default) is the raw/ordinary-3D end: a freshly confirmed fold4
  // attach looks exactly like a normal flush attach (its real geometric
  // consequences, if any, already visible) until the player drags toward
  // 4D themselves -- matches ShapeViewer's own foldAmountRef default.
  const [hasFoldConnections, setHasFoldConnections] = useState(false);
  const [foldPercent, setFoldPercent] = useState(0);
  // RCP-C2B (Radial Cell Projection, click-to-build), replacing fold4 as
  // the live 4D folding-construction feature: rcpPickerOpen shows the
  // small inline "which closure?" choice for a seed with more than one
  // real target (only D4/PYRAMID_TRI_G2 today) -- reset whenever the
  // selection changes to a different node (below). The 3D/4D view
  // choice itself is NOT separate page-level state (unlike the old
  // superseded open/closed toggle) -- it's a real, persisted fact on
  // the root (`rcpPolytope.view3D`) reported back via
  // `nodeSelection.rcpRoot.view3D`, so the buttons below read directly
  // off that instead of mirroring it in a second place that could drift.
  const [rcpPickerOpen, setRcpPickerOpen] = useState(false);
  const [changelogOpen, setChangelogOpen] = useState(false);
  // Real user request: "a little x in the corner so you can clear the
  // space" -- the default-state instruction pill has no way to dismiss
  // itself otherwise. Plain session-lived state (not persisted) -- a
  // page reload brings it back, same as every other transient UI state
  // here; the request was "clear the space" for the current session,
  // not "never show me this again."
  const [instructionsDismissed, setInstructionsDismissed] = useState(false);

  // First-visit welcome overlay -- shown once (persisted via usePrefs'
  // welcomeSeen, only if the "don't show again" checkbox was checked),
  // reopenable anytime via the "ℹ" button next to the corner HUD.
  // Plain derived state, no effect needed: welcomeOpen is true if either
  // explicitly force-reopened (the ℹ button) OR it's a fresh visit that
  // hasn't been dismissed yet THIS session -- dismissedThisSession is
  // separate from the persisted welcomeSeen so closing it without
  // checking the box still hides it for the rest of the current visit,
  // without permanently marking it seen.
  const { welcomeSeen } = usePrefs();
  const [welcomeForceOpen, setWelcomeForceOpen] = useState(false);
  const [guideOpen, setGuideOpen] = useState(false);
  const [welcomeDismissedThisSession, setWelcomeDismissedThisSession] = useState(false);
  const welcomeOpen = welcomeForceOpen || (!welcomeDismissedThisSession && !welcomeSeen);
  const closeWelcome = () => {
    setWelcomeForceOpen(false);
    setWelcomeDismissedThisSession(true);
  };

  const openPicker = (mode: 'reset' | 'faceAttach' | 'vertexAttach') => {
    setWheelMode(mode);
    setBrowserOpen(true);
  };
  const openWheelDirectly = () => {
    setWheelMode('reset');
    setWheelOpen(true);
  };

  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      if (wheelOpen || browserOpen || welcomeOpen) return;
      const target = e.target as HTMLElement | null;
      if (target && ['INPUT', 'TEXTAREA'].includes(target.tagName)) return;
      if (e.key === 'Tab' || e.key === ' ') {
        e.preventDefault();
        openPicker('reset');
      }
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [wheelOpen, browserOpen, welcomeOpen]);

  // Both are pure page-level UI state scoped to "the current selection" --
  // reset whenever the selection moves to a different node (or away
  // entirely) so neither leaks into an unrelated node's own panel.
  // Adjusted during render (React's own recommended pattern for resetting
  // state when a prop changes), not in an effect -- avoids the extra
  // render-then-effect-then-render cascade a useEffect version would cause.
  const [rcpSelectionTrackedId, setRcpSelectionTrackedId] = useState<string | null>(null);
  // The MAIN 3D/4D mode switch for an RCP-C2B-eligible node: "3D" shows
  // this node's ordinary, ANY-shape controls (Delete stays visible in
  // both modes -- direct user decision); "4D" shows only the RCP-C2B
  // build controls. Direct user feedback: showing both sets of controls
  // together read as "too busy." Defaults to whichever mode the node is
  // actually in (4D once a real build already exists, 3D otherwise) --
  // distinct from `rcpRoot.view3D` (renamed "Open/Closed" in the UI
  // below), which is about how shell-1 cells RENDER, not which controls
  // are visible.
  const [rcpMainMode4D, setRcpMainMode4D] = useState(false);
  if ((nodeSelection?.nodeId ?? null) !== rcpSelectionTrackedId) {
    setRcpSelectionTrackedId(nodeSelection?.nodeId ?? null);
    setRcpPickerOpen(false);
    setRcpMainMode4D(!!nodeSelection?.rcpRoot);
  }

  const handleSave = async () => {
    // A prior save's own "revert to idle after 2s" timer must not fire
    // AFTER this call's own status update -- localStorage-backed save is
    // fast enough that two Save clicks in quick succession (e.g. a real
    // user re-saving right after Undo) could otherwise land inside that
    // 2s window, and the stale timer would wrongly stomp this call's
    // 'saved'/'error' status back to 'idle' out from under it. Caught via
    // a real, reproducible e2e failure once save got fast enough to make
    // this race actually land, not a hypothetical.
    if (saveStatusResetRef.current) clearTimeout(saveStatusResetRef.current);
    setSaveStatus('saving');
    const ok = (await handleRef.current?.save()) ?? false;
    setSaveStatus(ok ? 'saved' : 'error');
    saveStatusResetRef.current = setTimeout(() => setSaveStatus('idle'), 2000);
  };

  const handleRewrite = () => {
    const result = handleRef.current?.rewriteSelectedNode();
    if (!result) return;
    const note =
      result.orphaned > 0
        ? `${result.fromSpecId} → ${result.toSpecId}: ${result.reattached} reattached, ${result.orphaned} orphaned (no compatible vertex found)`
        : `${result.fromSpecId} → ${result.toSpecId}: ${result.reattached} connection(s) reattached`;
    setRewriteNote(note);
    setTimeout(() => setRewriteNote(null), 4000);
  };

  const handleDelete = () => {
    const result = handleRef.current?.deleteSelectedNode();
    if (!result) return;
    setRewriteNote(
      result.deletedCount > 1
        ? `Deleted node and ${result.deletedCount - 1} attached descendant(s)`
        : 'Deleted node',
    );
    setTimeout(() => setRewriteNote(null), 4000);
  };

  const handleUndo = () => {
    const result = handleRef.current?.undo();
    if (!result) return;
    setRewriteNote(
      result.deletedCount > 1
        ? `Undid last attach (and ${result.deletedCount - 1} piece(s) built on top of it)`
        : 'Undid last attach',
    );
    setTimeout(() => setRewriteNote(null), 4000);
  };

  const handleExport = () => {
    const assembly = handleRef.current?.getAssembly();
    if (!assembly) return;
    // Same Assembly JSON shape Save writes to localStorage, just handed to
    // the browser's own download flow instead.
    const blob = new Blob([JSON.stringify(assembly, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `polyhedraverse-${new Date().toISOString().replace(/[:.]/g, '-')}.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  const cycleViewMode = () => {
    const next = VIEW_MODES[(VIEW_MODES.indexOf(viewMode) + 1) % VIEW_MODES.length];
    setViewModeState(next);
    handleRef.current?.setViewMode(next);
  };

  return (
    <div
      className="flex h-screen w-full flex-col"
      // Real user request: "can i have a starry background." A pure-CSS
      // tiled dot field (no image asset, no extra render cost) rather than
      // a DOM/canvas starfield here -- ShapeViewer's own 3D scene (which
      // fills most of the screen most of the time) gets a REAL 3D
      // starfield of its own (see its own scene setup) since this CSS
      // layer only shows through in the header strip and anywhere the
      // 3D canvas or an opaque modal backdrop doesn't cover it.
      style={{
        backgroundColor: '#000',
        backgroundImage: [
          'radial-gradient(1px 1px at 20px 30px, rgba(255,255,255,0.9), transparent)',
          'radial-gradient(1px 1px at 90px 60px, rgba(255,255,255,0.7), transparent)',
          'radial-gradient(1.5px 1.5px at 140px 20px, rgba(255,255,255,0.8), transparent)',
          'radial-gradient(1px 1px at 170px 90px, rgba(255,255,255,0.6), transparent)',
          'radial-gradient(1px 1px at 40px 110px, rgba(255,255,255,0.5), transparent)',
          'radial-gradient(1.5px 1.5px at 110px 140px, rgba(255,255,255,0.7), transparent)',
          'radial-gradient(1px 1px at 180px 150px, rgba(71,204,36,0.45), transparent)',
          'radial-gradient(1px 1px at 60px 170px, rgba(255,255,255,0.55), transparent)',
        ].join(', '),
        backgroundSize: '200px 200px',
        backgroundRepeat: 'repeat',
      }}
    >
      {/* flex-wrap + the left block's max-w-full: on a phone the button
          row drops below the title instead of pushing the page wider than
          the screen (it used to lay out 1010px wide on a 390px iPhone).
          From lg (1024px) up both stay nowrap, exactly the old desktop
          layout -- it only just fits at 1024, so wrapping there would
          needlessly drop the buttons to a second row. */}
      <header className="flex flex-wrap items-start justify-between gap-y-2 px-4 lg:flex-nowrap py-3 sm:px-6 sm:py-4">
        {/* flex-shrink-0: a real regression found live (persistence.spec.ts,
            radial-projection.spec.ts): with no shrink protection, adding
            enough content to the right-side controls div below (e.g. the
            assembly-name label) squeezed this block's own available width
            enough that its subtitle <p> -- ordinary wrapping text, no
            nowrap of its own -- reflowed onto a second line, growing the
            whole header's height and shifting the canvas below it. This
            block's own two lines of text should never depend on how much
            is on the right; it's the right side's job to fit its own
            space (via its own truncation), not this one's job to shrink. */}
        <div className="max-w-full shrink-0">
          {/* Same green-split treatment as WelcomeOverlay's <h1> --
              "Polyhedra" pale, "verse" the brand green -- rather than
              plain zinc-50, matching the identity established there and
              in the wheel/browser instead of a leftover generic default. */}
          <h1 className="text-lg font-semibold tracking-tight" style={{ color: '#a9f795' }}>
            Polyhedra<span style={{ color: '#47cc24' }}>verse</span>
          </h1>
          <p className="text-sm" style={{ color: '#5ee233', opacity: 0.8 }}>
            {/* Real bug, direct report ("Entry page is stale... many more
                shapes than 137"): this used to be a hand-typed "162
                shapes across 8 families" that quietly went stale again
                the moment new shapes/families shipped (matches the
                changelog's own record of fixing this exact class of
                staleness once already, for a previous hardcoded "137").
                Derived straight from the same registry the rest of the
                app already uses (core.ts's own "derive, don't
                duplicate" rule), so it can never drift out of sync
                again. */}
            {POLYHEDRON_IDS.length} shapes across {FAMILY_ORDER.length} families — vertex ball-joints and face-to-face connections
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2 lg:flex-nowrap">
          {assemblyName && (
            // A small fixed-size icon, never text -- keeps the header a
            // fixed single-line height regardless of how elaborate the
            // assembly's own description gets (the real regression a
            // truncated text span still risked, persistence.spec.ts).
            // Tapping snapshots the root shape's current on-screen
            // position (ShapeViewerHandle.getRootScreenPosition()) and
            // opens AssemblyDescriptionPopover anchored there, rather
            // than showing the text in the header itself.
            <button
              type="button"
              onClick={() => {
                setDescriptionAnchor(handleRef.current?.getRootScreenPosition() ?? null);
                setDescriptionOpen(true);
              }}
              title="Assembly description"
              aria-label="Show assembly description"
              className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full text-sm font-semibold"
              style={{ color: '#a9f795', border: '1px solid rgba(71,204,36,.3)' }}
            >
              i
            </button>
          )}
          {cageClosed && (
            <span className="rounded-full bg-fuchsia-900 px-3 py-1 text-xs font-medium text-fuchsia-200">
              Closed cage!
            </span>
          )}
          {saveStatus === 'saved' && <span className="text-xs text-emerald-400">Saved</span>}
          {saveStatus === 'error' && <span className="text-xs text-red-400">Save failed</span>}
          {hasFoldConnections && (
            // 4D extension, Stage E, trigger point 2: this control only
            // ever mounts once the assembly has at least one real fold4
            // connection -- its own presence IS the signal one exists, so
            // it's never a permanent header fixture. Clearly labeled per
            // direct user request ("as long as the slider is clearly
            // labeled") -- both endpoints spelled out, not just a bare 0-
            // 100 range, and the live percentage always visible.
            <div
              className="flex items-center gap-2 rounded-full px-4 py-1.5 text-sm font-medium"
              style={{ background: '#0e1209', border: '1px solid #ffd54a' }}
              title="Fold amount: 0% is ordinary rigid 3D (the real separation gap between neighboring pieces, if any); dragging toward 100% closes it, matching the true 4D structure"
            >
              <span style={{ color: '#ffd54a' }}>4D ⧉ Fold</span>
              <span className="text-xs" style={{ color: '#5ee233', opacity: 0.8 }}>
                3D
              </span>
              <input
                type="range"
                min={0}
                max={100}
                value={foldPercent}
                onChange={(e) => {
                  const value = Number(e.target.value);
                  setFoldPercent(value);
                  handleRef.current?.setFoldAmount(value / 100);
                }}
                className="h-1 w-24 accent-[#ffd54a]"
              />
              <span className="text-xs" style={{ color: '#5ee233', opacity: 0.8 }}>
                4D
              </span>
              <span style={{ color: '#ffd54a' }}>{foldPercent}%</span>
            </div>
          )}
          <button
            type="button"
            onClick={() => setChangelogOpen(true)}
            className="shrink-0 whitespace-nowrap rounded-full px-4 py-1.5 text-sm font-medium transition-colors"
            style={{ background: '#0e1209', border: '1px solid rgba(71,204,36,.3)', color: '#5ee233' }}
          >
            What&apos;s New
          </button>
          <button
            type="button"
            onClick={cycleViewMode}
            className="shrink-0 whitespace-nowrap rounded-full px-4 py-1.5 text-sm font-medium transition-colors"
            style={{ background: '#0e1209', border: '1px solid rgba(71,204,36,.3)', color: '#5ee233' }}
          >
            View: {VIEW_MODE_LABELS[viewMode]}
          </button>
          <button
            type="button"
            onClick={handleUndo}
            disabled={!canUndo || pending !== null}
            title="Undo the last confirmed attach (single-level -- undoing again does nothing until you attach something new)"
            className="shrink-0 whitespace-nowrap rounded-full px-4 py-1.5 text-sm font-medium transition-colors disabled:opacity-50"
            style={{ background: '#0e1209', border: '1px solid rgba(71,204,36,.3)', color: '#5ee233' }}
          >
            Undo
          </button>
          <button
            type="button"
            onClick={handleSave}
            disabled={saveStatus === 'saving' || pending !== null}
            className="shrink-0 whitespace-nowrap rounded-full px-4 py-1.5 text-sm font-medium transition-colors disabled:opacity-50"
            style={{ background: '#0e1209', border: '1px solid rgba(71,204,36,.3)', color: '#5ee233' }}
          >
            {saveStatus === 'saving' ? 'Saving…' : 'Save'}
          </button>
          <button
            type="button"
            onClick={handleExport}
            title="Download the current assembly as a JSON file"
            className="shrink-0 whitespace-nowrap rounded-full px-4 py-1.5 text-sm font-medium transition-colors"
            style={{ background: '#0e1209', border: '1px solid rgba(71,204,36,.3)', color: '#5ee233' }}
          >
            Export JSON
          </button>
        </div>
      </header>

      <nav className="flex flex-wrap items-center gap-2 px-4 pb-2 sm:px-6">
        <button
          type="button"
          onClick={() => openPicker('reset')}
          className="rounded-full px-4 py-1.5 text-sm font-medium transition-colors"
          style={{ background: '#0e1209', border: '1px solid rgba(71,204,36,.3)', color: '#5ee233' }}
        >
          Start over with… <span className="ml-1 text-xs opacity-70">(Tab / Space)</span>
        </button>
      </nav>

      <nav className="flex min-h-11 flex-wrap items-center gap-2 px-4 pb-2 sm:px-6">
        {pending ? (
          <>
            <span className="text-xs uppercase tracking-wide text-pink-400">
              Placing {pending.specId}
              {pending.fold4 ? ' via 4D fold' : pending.duoprism ? ' via Duoprism' : ''}
              {pending.duoprism ? ' — then:' : ' — drag to rotate it, then:'}
            </span>
            <button
              type="button"
              onClick={() => handleRef.current?.confirmAttach()}
              className="rounded-full bg-emerald-500 px-4 py-1.5 text-sm font-medium text-white transition-colors hover:bg-emerald-400"
            >
              Confirm
            </button>
            <button
              type="button"
              onClick={() => handleRef.current?.cancelAttach()}
              className="rounded-full bg-zinc-800 px-4 py-1.5 text-sm font-medium text-zinc-300 transition-colors hover:bg-zinc-700"
            >
              Cancel (Esc)
            </button>
          </>
        ) : nodeSelection ? (
          <>
            <span className="text-xs uppercase tracking-wide text-amber-400">
              Selected {nodeSelection.specId} node
              {nodeSelection.faceIndex !== null ? ` (face ${nodeSelection.faceIndex}, ${nodeSelection.faceSize}-gon${nodeSelection.faceOccupied ? ', occupied' : ''})` : ''}:
            </span>
            {nodeSelection.rewriteTarget && (
              <button
                type="button"
                onClick={handleRewrite}
                className="rounded-full bg-amber-500 px-4 py-1.5 text-sm font-medium text-black transition-colors hover:bg-amber-400"
              >
                Transform to {nodeSelection.rewriteTarget}
              </button>
            )}
            <button
              type="button"
              onClick={handleDelete}
              className="rounded-full bg-red-600 px-4 py-1.5 text-sm font-medium text-white transition-colors hover:bg-red-500"
            >
              Delete
            </button>
            {/* Ordinary, single-shape controls -- hidden while an
                RCP-C2B-eligible node is in "4D" mode (direct user
                feedback: showing these alongside the build controls was
                "too busy"). Delete itself (above) stays visible in both
                modes by direct user decision -- you can always remove
                the whole structure without switching back to 3D first. */}
            {!(nodeSelection.rcpBuildEligible && rcpMainMode4D) && nodeSelection.faceAttachOptions.length > 0 && (
              <button
                type="button"
                onClick={() => openPicker('faceAttach')}
                // Yellow/amber, not blue -- matches COLOR_FREE (the same
                // "you can interact here" color already used for free
                // vertices and the new per-face hover highlight in
                // ShapeViewer.tsx), so this button reads as part of the
                // same visual language instead of an unrelated blue.
                className="rounded-full bg-amber-400 px-4 py-1.5 text-sm font-medium text-black transition-colors hover:bg-amber-300"
              >
                Attach via face…
              </button>
            )}
            {!(nodeSelection.rcpBuildEligible && rcpMainMode4D) && nodeSelection.faceDuoprismEligible && (
              // 4D Prism (duoprism) construction: same eligibility as
              // 4D fold, but a structurally different, always-exact
              // attach (a flat extrusion, no angular defect to close —
              // see duoprism.ts's own header comment). Distinct teal
              // accent so it reads as a third, visually separate attach
              // mode, not a variant of either amber (ordinary) or gold
              // (4D fold). No wheel/browser picker: there's no shape or
              // registration choice to make, so this calls straight
              // through to beginDuoprismAttach.
              <button
                type="button"
                onClick={() => handleRef.current?.beginDuoprismAttach()}
                title="Attach an identical, translated copy connected by a real 3D wall-prism cell — the 4D Prism (duoprism) construction, always exact"
                className="rounded-full px-4 py-1.5 text-sm font-medium text-black transition-colors"
                style={{ background: '#2ad6c9' }}
              >
                Attach via Duoprism…
              </button>
            )}
            {/* RCP-C2B (Radial Cell Projection, click-to-build): replaces
                fold4 as the live 4D folding-construction feature (fold4's
                own slider above stays only for already-saved fold4
                connections — no new UI path creates one). Violet accent,
                distinct from amber (ordinary)/gold (4D-capable badge)/
                teal (duoprism)/red (delete) — a genuinely new family so
                it reads as its own construction mode, not a variant of
                an existing one.

                The MAIN 3D/4D mode switch: "3D" shows the ordinary
                controls above; "4D" starts a build (if none exists yet
                for this root) and shows only the RCP-C2B controls below.
                Not the same toggle as "Open/Closed" further down, which
                is about how shell-1 cells RENDER once a build exists. */}
            {nodeSelection.rcpBuildEligible && (
              <div
                className="flex items-center gap-1 rounded-full px-3 py-1 text-xs font-medium"
                style={{ background: '#0e1209', border: '1px solid #8a3ffc' }}
                title="3D: this node's ordinary controls (delete, attach via face/duoprism). 4D: build the real 4-polytope this shape closes into, one cell at a time — the Radial Cell Projection click-to-build (RCP-C2B) construction."
              >
                <button
                  type="button"
                  onClick={() => setRcpMainMode4D(false)}
                  className="rounded-full px-2 py-0.5 transition-colors"
                  style={{ background: !rcpMainMode4D ? '#8a3ffc' : 'transparent', color: !rcpMainMode4D ? '#fff' : '#b388ff' }}
                >
                  3D
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setRcpMainMode4D(true);
                    if (nodeSelection.rcpRoot) return; // already building -- just switch which controls show
                    if (nodeSelection.rcpClosureOptions.length > 1) setRcpPickerOpen(true);
                    else handleRef.current?.beginRcpBuild(nodeSelection.specId, nodeSelection.rcpClosureOptions[0]);
                  }}
                  className="rounded-full px-2 py-0.5 transition-colors"
                  style={{ background: rcpMainMode4D ? '#8a3ffc' : 'transparent', color: rcpMainMode4D ? '#fff' : '#b388ff' }}
                >
                  4D
                </button>
              </div>
            )}
            {nodeSelection.rcpBuildEligible && rcpMainMode4D && !nodeSelection.rcpRoot && (
              rcpPickerOpen && nodeSelection.rcpClosureOptions.length > 1 ? (
                <>
                  <span className="text-xs uppercase tracking-wide" style={{ color: '#b388ff' }}>
                    Build which 4-polytope?
                  </span>
                  {nodeSelection.rcpClosureOptions.map((target) => (
                    <button
                      key={target}
                      type="button"
                      onClick={() => {
                        handleRef.current?.beginRcpBuild(nodeSelection.specId, target);
                        setRcpPickerOpen(false);
                      }}
                      className="rounded-full px-4 py-1.5 text-sm font-medium text-white transition-colors"
                      style={{ background: '#8a3ffc' }}
                    >
                      {target}
                    </button>
                  ))}
                  <button
                    type="button"
                    onClick={() => {
                      setRcpPickerOpen(false);
                      setRcpMainMode4D(false);
                    }}
                    className="rounded-full bg-zinc-800 px-4 py-1.5 text-sm font-medium text-zinc-300 transition-colors hover:bg-zinc-700"
                  >
                    Cancel
                  </button>
                </>
              ) : null
            )}
            {nodeSelection.rcpRoot && rcpMainMode4D && (
              // Running cell count, always visible across the whole build
              // (shell 1's one-at-a-time phase and every shell-batch
              // phase after it) -- direct user feedback: without this the
              // only way to tell progress was counting cells by eye.
              // +1 for the root/seed cell itself, which `builtCount` (an
              // rcp4d CONNECTION count) never includes.
              <span className="text-xs font-medium" style={{ color: '#b388ff' }}>
                Cells: {nodeSelection.rcpRoot.builtCount + 1} / {nodeSelection.rcpRoot.totalCells}
              </span>
            )}
            {nodeSelection.rcpRoot && rcpMainMode4D && !nodeSelection.rcpRoot.shell1Complete && (
              <button
                type="button"
                onClick={() => handleRef.current?.buildNextRcpCell()}
                title="Add one more shell-1 cell (a direct face-neighbor of the seed) — click through all of them one at a time"
                className="rounded-full px-4 py-1.5 text-sm font-medium text-white transition-colors"
                style={{ background: '#8a3ffc' }}
              >
                Add next cell ({nodeSelection.rcpRoot.builtCount} / {nodeSelection.rcpRoot.shell1Size})
              </button>
            )}
            {nodeSelection.rcpRoot && rcpMainMode4D && nodeSelection.rcpRoot.builtCount > 0 && !nodeSelection.rcpRoot.shell1Complete && (
              <button
                type="button"
                onClick={() => handleRef.current?.removeLastRcpCell()}
                title="Remove the most recently added shell-1 cell"
                className="rounded-full px-4 py-1.5 text-sm font-medium transition-colors"
                style={{ background: 'none', border: '1px solid #b388ff', color: '#b388ff' }}
              >
                Remove last cell
              </button>
            )}
            {nodeSelection.rcpRoot?.shell1Complete && rcpMainMode4D && (
              <>
                <button
                  type="button"
                  onClick={() => handleRef.current?.buildNextRcpShell()}
                  disabled={nodeSelection.rcpRoot.maxBuiltShell >= nodeSelection.rcpRoot.complexMaxShell}
                  className="rounded-full px-4 py-1.5 text-sm font-medium text-white transition-colors disabled:opacity-50"
                  style={{ background: '#8a3ffc' }}
                >
                  Build next shell
                </button>
                <button
                  type="button"
                  onClick={() => handleRef.current?.removeLastRcpShell()}
                  disabled={nodeSelection.rcpRoot.maxBuiltShell <= 1}
                  className="rounded-full px-4 py-1.5 text-sm font-medium transition-colors disabled:opacity-50"
                  style={{ background: 'none', border: '1px solid #b388ff', color: '#b388ff' }}
                >
                  Remove last shell
                </button>
              </>
            )}
            {nodeSelection.rcpRoot?.viewToggleAvailable && rcpMainMode4D && (
              <div
                className="flex items-center gap-1 rounded-full px-3 py-1 text-xs font-medium"
                style={{ background: '#0e1209', border: '1px solid #b388ff', opacity: nodeSelection.rcpRoot.viewToggleLocked ? 0.5 : 1 }}
                title={
                  nodeSelection.rcpRoot.viewToggleLocked
                    ? 'Locked closed: shell 2+ is permanently anchored to shell 1’s real 4D position, so opening shell 1 here would disconnect the two. Remove shell 2 to unlock.'
                    : 'Open: every built cell shown as an ordinary, undistorted copy of the seed, flush-attached, with the real angular gap visible. Closed: the same cells at their real, warped position in the closed 4-polytope — the same look shell 2+ already uses.'
                }
              >
                <button
                  type="button"
                  onClick={() => handleRef.current?.setRcpView3D(true)}
                  disabled={nodeSelection.rcpRoot.viewToggleLocked}
                  className="rounded-full px-2 py-0.5 transition-colors disabled:cursor-not-allowed"
                  style={{ background: nodeSelection.rcpRoot.view3D ? '#8a3ffc' : 'transparent', color: nodeSelection.rcpRoot.view3D ? '#fff' : '#b388ff' }}
                >
                  Open
                </button>
                <button
                  type="button"
                  onClick={() => handleRef.current?.setRcpView3D(false)}
                  disabled={nodeSelection.rcpRoot.viewToggleLocked}
                  className="rounded-full px-2 py-0.5 transition-colors disabled:cursor-not-allowed"
                  style={{ background: !nodeSelection.rcpRoot.view3D ? '#8a3ffc' : 'transparent', color: !nodeSelection.rcpRoot.view3D ? '#fff' : '#b388ff' }}
                >
                  Closed
                </button>
              </div>
            )}
            {nodeSelection.rcpRoot && rcpMainMode4D && (
              // "Show coordinates": purple lines from the root's own
              // center out to each built cell's real generating
              // coordinate (RcpComplex.cells[].coordPoint3D's own doc
              // comment), plus -- 600-cell only -- a second color
              // marking its cells' own vertices -- the dual points (each
              // in the direction of a dodecahedral cell centre of the
              // dual 120-cell). Works
              // identically Open/Closed (coordPoint3D doesn't depend on
              // that toggle), and is never persisted.
              <button
                type="button"
                onClick={() => handleRef.current?.setRcpCoordinatesVisible(!nodeSelection.rcpRoot!.coordinatesVisible)}
                title="Show each built cell's own real generating coordinate as a purple point, joined to the root's center by a line -- plus, for the 600-cell, its dual points (each vertex lines up with a dodecahedral cell centre of the dual 120-cell)"
                className="rounded-full px-3 py-1 text-xs font-medium transition-colors"
                style={
                  nodeSelection.rcpRoot.coordinatesVisible
                    ? { background: '#aa33ff', color: '#fff' }
                    : { background: 'none', border: '1px solid #aa33ff', color: '#aa33ff' }
                }
              >
                RCP-Coordinates
              </button>
            )}
            {nodeSelection.rcpRoot && rcpMainMode4D && (
              // "Shell colours": tints every built cell by its shell
              // (ShapeViewer's rcpShellColor), seed staying yellow.
              // Session-only, like RCP-Coordinates.
              <button
                type="button"
                onClick={() => handleRef.current?.setRcpShellColorsVisible(!nodeSelection.rcpRoot!.shellColorsVisible)}
                title="Colour each built cell by its shell, from a repeating set of 6 contrasting colours, so neighbouring shells always stand apart"
                className="rounded-full px-3 py-1 text-xs font-medium transition-colors"
                style={
                  nodeSelection.rcpRoot.shellColorsVisible
                    ? { background: 'linear-gradient(90deg, #f28c28, #22c3e6, #e0409a, #3d6be0, #9be03a, #9b3dde)', color: '#fff' }
                    : { background: 'none', border: '1px solid #f28c28', color: '#f28c28' }
                }
              >
                Shell colours
              </button>
            )}
          </>
        ) : selection ? (
          <>
            <span className="text-xs uppercase tracking-wide text-zinc-500">
              Attach to {selection.specId} vertex {selection.vertexId} (capacity{' '}
              {selection.degree}):
            </span>
            {/* Real leftover found live: this used to render a flat button
                for all 137 POLYHEDRON_IDS directly (predating the wheel/
                browser system entirely) -- "the huge amorphous list
                format," in the user's own words, never migrated to the
                same family-grouped picker face-attach already uses below.
                Vertex-attach has no compatibility constraint (a ball-joint
                vertex, unlike a flush face, accepts any shape), so this
                opens the SAME picker unfiltered ('vertexAttach' mode,
                distinct from 'reset' only so onSelect knows to call
                beginAttach() instead of starting over). */}
            <button
              type="button"
              onClick={() => openPicker('vertexAttach')}
              className="rounded-full bg-amber-400 px-4 py-1.5 text-sm font-medium text-black transition-colors hover:bg-amber-300"
            >
              Attach via vertex…
            </button>
          </>
        ) : null}
      </nav>

      {rewriteNote && (
        <div className="px-4 pb-2 sm:px-6">
          <span className="text-xs text-amber-300">{rewriteNote}</span>
        </div>
      )}

      <main className="flex-1">
        <ShapeViewer
          initialShapeId={POLYHEDRON_IDS[0]}
          onSelectionChange={setSelection}
          onPendingChange={setPending}
          onNodeSelectionChange={setNodeSelection}
          onCageClosedChange={setCageClosed}
          onAssemblyNameChange={setAssemblyName}
          onCanUndoChange={setCanUndo}
          onFoldConnectionsChange={(has) => {
            setHasFoldConnections(has);
            if (!has) setFoldPercent(0); // matches ShapeViewer's own foldAmountRef reset
          }}
          onReady={(handle) => {
            handleRef.current = handle;
          }}
        />
      </main>

      <PolyhedralWheel
        open={wheelOpen}
        onClose={() => setWheelOpen(false)}
        filterIds={wheelMode === 'faceAttach' ? nodeSelection?.faceAttachOptions : undefined}
        onSelect={(id) => {
          if (wheelMode === 'faceAttach') handleRef.current?.beginFaceAttach(id);
          else if (wheelMode === 'vertexAttach') handleRef.current?.beginAttach(id);
          else handleRef.current?.reset(id);
        }}
        onSelectAll={() => {
          setWheelOpen(false);
          setFullCatalogFocusSection(undefined);
          setFullCatalogRequestId((n) => n + 1);
          setBrowserOpen(true);
        }}
        onSelectStarPolyhedra={() => {
          setWheelOpen(false);
          setFullCatalogFocusSection('STAR');
          setFullCatalogRequestId((n) => n + 1);
          setBrowserOpen(true);
        }}
        onSelectFamilyGrid={(familyKey) => {
          setWheelOpen(false);
          setFullCatalogFocusSection(familyKey);
          setFullCatalogRequestId((n) => n + 1);
          setBrowserOpen(true);
        }}
        onSelectSearch={() => {
          setWheelOpen(false);
          setSearchRequestId((n) => n + 1);
          setBrowserOpen(true);
        }}
      />
      <ShapeBrowser
        open={browserOpen}
        onClose={() => setBrowserOpen(false)}
        filterIds={wheelMode === 'faceAttach' ? nodeSelection?.faceAttachOptions : undefined}
        fullCatalogRequestId={fullCatalogRequestId}
        fullCatalogFocusSection={fullCatalogFocusSection}
        searchRequestId={searchRequestId}
        onSelect={(id) => {
          setBrowserOpen(false);
          if (wheelMode === 'faceAttach') handleRef.current?.beginFaceAttach(id);
          else if (wheelMode === 'vertexAttach') handleRef.current?.beginAttach(id);
          else handleRef.current?.reset(id);
        }}
      />
      {/* Default instructional text, moved off the top nav to a fixed
          bottom-center pill sitting below/over the shape itself --
          matches Rhombiverse's own RHOMBIS puzzle's #rhombis-hud exactly
          (position: fixed, centered, pill-shaped, translucent dark
          background), which shows this same kind of "what to do right
          now" status text in the same spot regardless of game state.
          Only shown in the true default state -- an active
          pending/nodeSelection/selection already has its own action
          buttons in the top nav, so this would be redundant there. */}
      {!pending && !nodeSelection && !selection && !instructionsDismissed && (
        <div
          style={{
            position: 'fixed',
            left: '50%',
            transform: 'translateX(-50%)',
            bottom: 'calc(1.5rem + env(safe-area-inset-bottom))',
            zIndex: 10,
            background: 'rgba(5,5,10,.6)',
            border: '1px solid rgba(71,204,36,.2)',
            borderRadius: 999,
            padding: '0.5rem 2.25rem 0.5rem 1rem',
            // Leaves clearance for CornerHudWheel, now also bottom-right
            // (160px + margin) -- the pill body itself still has
            // pointerEvents:'none' so it can never block a click either
            // way, but a narrower cap avoids a purely visual overlap in
            // the common case where both are showing at once.
            maxWidth: 'calc(100vw - 220px)',
            textAlign: 'center',
            color: '#5ee233',
            fontSize: 13,
            pointerEvents: 'none',
          }}
        >
          Click a highlighted, free vertex to attach a shape, or click a node&apos;s body to
          select it — a free face offers face-to-face attach for shapes with a matching face
          size (glowing nodes still have room to build from).
          <button
            type="button"
            onClick={() => setInstructionsDismissed(true)}
            aria-label="Dismiss instructions"
            title="Dismiss instructions"
            style={{
              position: 'absolute',
              top: '50%',
              right: 8,
              transform: 'translateY(-50%)',
              // The pill itself is pointerEvents:'none' so it never
              // blocks a click through to whatever's underneath -- this
              // button opts back in on its own, the only truly
              // interactive part of the pill.
              pointerEvents: 'auto',
              background: 'none',
              border: 'none',
              color: '#5ee233',
              opacity: 0.7,
              fontSize: 14,
              lineHeight: 1,
              cursor: 'pointer',
              padding: 4,
            }}
          >
            ✕
          </button>
        </div>
      )}
      <WelcomeOverlay open={welcomeOpen} onClose={closeWelcome} onOpenGuide={() => setGuideOpen(true)} />
      <GuideOverlay open={guideOpen} onClose={() => setGuideOpen(false)} />
      <ChangelogOverlay open={changelogOpen} onClose={() => setChangelogOpen(false)} />
      <AssemblyDescriptionPopover
        open={descriptionOpen && !!assemblyName}
        text={assemblyName}
        anchor={descriptionAnchor}
        onClose={() => setDescriptionOpen(false)}
      />
      {!welcomeOpen && (
        <CornerHudWheel
          wheelOpen={wheelOpen}
          browserOpen={browserOpen}
          onToggleWheel={() => (wheelOpen ? setWheelOpen(false) : openWheelDirectly())}
          onToggleBrowser={() => (browserOpen ? setBrowserOpen(false) : openPicker('reset'))}
          viewMode={viewMode}
          onCycleView={cycleViewMode}
          onSave={handleSave}
          onAbout={() => setWelcomeForceOpen(true)}
        />
      )}
      {/* Real user request: "a little bottom left hand 'menu' button that
          summons wheel from anywhere" -- a second, always-visible trigger
          for the direct wheel, deliberately alongside (not replacing)
          CornerHudWheel's own medallion (bottom-right, see its own
          right:16/bottom:16) rather than unifying them into one -- this
          project has already decided against collapsing the wheel and
          browser's separate entry points into a single toggle, and the
          same reasoning applies here: more doors in, not fewer.
          bottom:72 (not 16) -- real bug caught by e2e: Next.js's own dev-
          mode indicator badge lives in the literal bottom-left corner and
          its portal intercepts clicks there, so a plain bottom:16 button
          was unclickable under `next dev` (this doesn't exist in a
          production build, but local dev/test needs to work too). */}
      {!welcomeOpen && (
        <button
          type="button"
          onClick={() => (wheelOpen ? setWheelOpen(false) : openWheelDirectly())}
          aria-label="Open shape wheel"
          title="Open shape wheel"
          style={{
            position: 'fixed',
            left: 16,
            bottom: 72,
            zIndex: 60,
            width: 44,
            height: 44,
            borderRadius: '50%',
            background: 'rgba(5,5,10,.75)',
            border: '1px solid rgba(71,204,36,.4)',
            color: '#5ee233',
            fontSize: 18,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            cursor: 'pointer',
          }}
        >
          ☰
        </button>
      )}
    </div>
  );
}
