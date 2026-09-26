'use client';

/**
 * The golden-rhombohedra helper bar, shown while the build is all golden
 * rhombohedra: how many pieces fit the true 3D Penrose tiling, "Next safe
 * piece" (adds one that keeps the build inside it -- such a build never
 * dead-ends), and step-by-step recipes for the golden zonohedra. Each step
 * goes through importAssembly, so Undo takes it back.
 */
import { useEffect, useState, type RefObject } from 'react';
import type { ShapeViewerHandle } from './ShapeViewer';
import { goldenStatus, isGoldenBuild, withNextSafePiece, type GoldenStatus } from '../lib/golden/goldenHelper';
import { GOLDEN_BUILDS, withNextRecipePiece } from '../lib/goldenBuilds';

interface Props {
  handleRef: RefObject<ShapeViewerHandle | null>;
  // Changes whenever the build does (the running assembly name).
  assemblyName: string;
  showNote: (text: string) => void;
}

export default function GoldenHelperBar({ handleRef, assemblyName, showNote }: Props) {
  const [status, setStatus] = useState<GoldenStatus | null>(null);
  const [recipe, setRecipe] = useState<number>(GOLDEN_BUILDS[2].axes);

  useEffect(() => {
    const a = handleRef.current?.getAssembly();
    setStatus(a && isGoldenBuild(a) ? goldenStatus(a) : null);
  }, [assemblyName, handleRef]);

  if (!status) return null;
  const apply = (next: ReturnType<typeof withNextSafePiece>) => (next ? handleRef.current?.importAssembly(next) ?? false : false);
  const nextSafe = () => {
    const a = handleRef.current?.getAssembly();
    if (!a || !apply(withNextSafePiece(a))) showNote('No safe spot next to a piece that fits the tiling.');
  };
  const nextStep = () => {
    const a = handleRef.current?.getAssembly();
    if (!a) return;
    const r = withNextRecipePiece(a, recipe);
    if (apply(r.assembly)) showNote(`${GOLDEN_BUILDS.find((b) => b.axes === recipe)!.name}: piece ${r.step} of ${r.total}.`);
  };
  const button = 'min-h-9 rounded-lg px-3 text-xs';
  const buttonStyle = { background: 'rgba(0,0,0,.45)', border: '1px solid rgba(71,204,36,.45)', color: '#5ee233' };
  return (
    <div
      className="fixed bottom-24 left-1/2 z-20 flex -translate-x-1/2 flex-wrap items-center justify-center gap-2 rounded-xl px-3 py-2 text-xs"
      style={{ background: 'rgba(14,18,9,.85)', border: '1px solid rgba(71,204,36,.3)', color: '#bfe6b0', maxWidth: 'calc(100vw - 32px)' }}
      role="group"
      aria-label="Golden rhombohedra helper"
    >
      <span title="Pieces that belong to the true 3D Penrose tiling. A build inside it can always be continued.">
        Penrose tiling: {status.inTiling} of {status.total} fit
      </span>
      <button type="button" className={button} style={buttonStyle} onClick={nextSafe} title="Add a piece that keeps the build inside the Penrose tiling">
        Next safe piece
      </button>
      <select
        value={recipe}
        onChange={(e) => setRecipe(Number(e.target.value))}
        className="min-h-9 rounded-lg px-2 text-xs"
        style={buttonStyle}
        aria-label="Step-by-step recipe"
      >
        {GOLDEN_BUILDS.map((b) => <option key={b.axes} value={b.axes}>{b.name}</option>)}
      </select>
      <button type="button" className={button} style={buttonStyle} onClick={nextStep} title="Add the next piece of the chosen golden build">
        Next step
      </button>
    </div>
  );
}
