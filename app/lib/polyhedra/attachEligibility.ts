import { type PolyhedronSpec, isRegularFace } from './core';
import { MISCELLANEOUS_ADDITION_IDS } from './miscellaneous';

/**
 * The Miscellaneous family's face-attach eligibility policy, in one
 * place rather than duplicated at each call site -- shared by
 * ShapeViewer.tsx and scripts/verify-face-attach.ts, so the check covers
 * exactly the faces the app offers. `spec.attachableFaceIndices`
 * (set only by RVCMG connector pieces, see rvcmg-connectors/index.ts)
 * takes priority when present -- exactly those faces are eligible,
 * regardless of `isRegularFace` (a wall/side triangle can coincidentally
 * BE a genuine regular polygon, and the golden-rhombus/kite pieces' own
 * real target faces are deliberately NOT regular polygons -- both wrong
 * under a pure regularity rule, direct user report 2026-09-15: wall
 * faces "look confusingly attachable to squares etc"). Everything else
 * in the Miscellaneous family (graded pyramids) falls back to
 * `isRegularFace`, unchanged from before. Every other family is fully
 * unrestricted, exactly as already shipped.
 */
export function isFaceEligibleForAttach(spec: PolyhedronSpec, faceIndex: number): boolean {
  if (spec.attachableFaceIndices) return spec.attachableFaceIndices.includes(faceIndex);
  if (!MISCELLANEOUS_ADDITION_IDS.includes(spec.id)) return true;
  return isRegularFace(spec.vertices, spec.faces[faceIndex]);
}
