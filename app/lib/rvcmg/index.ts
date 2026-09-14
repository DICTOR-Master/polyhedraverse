/**
 * RVCMG (Reversible Vertex-Coalescence Morphing Geometry) public export
 * surface. Filled in incrementally, one stage at a time, per the RVCMG
 * implementation plan — do not export anything here before its owning
 * stage has landed and passed its own acceptance checks.
 */
export { HEMI_RD_INTERFACE, validateHemiRdInterface, hemiRdInterfaceFrame } from './hemiRdInterface';
export type { HemiRdInterfaceReport, PlanarFrame } from './hemiRdInterface';
export type { RvcmgVertex, RvcmgState, CoalescenceOp } from './types';
export { statesApproximatelyEqual, parseCompoundId } from './types';
export { coalesce } from './coalesce';
export { separate } from './separate';
export { splitVertex } from './splitVertex';
export type { SplitDemoResult } from './split-demos/heptagon';
export { deriveHeptagonBySplitting } from './split-demos/heptagon';
export { deriveOctagonBySplitting } from './split-demos/octagon';
export type { StateGraph } from './stateGraph';
export { createStateGraph, addState, addTransition, findPath, isComposite } from './stateGraph';
export { interpolate, classifyState } from './morph';
export type { VerifyTransitionOptions } from './verify';
export { verifyTransition } from './verify';
export type { AdapterPieceResult } from './adapters/triangleToRdH';
export { deriveTriangleToRdH, hemiRdStartState, RD_EDGE_LENGTH, HEMI_RD_INTERFACE_UNIT } from './adapters/triangleToRdH';
export { deriveSquareToRdH } from './adapters/squareToRdH';
export { derivePentagonToRdH } from './adapters/pentagonToRdH';
export { deriveGoldenRhombusToRdH, GOLDEN_RATIO_MEASURED } from './adapters/goldenRhombusToRdH';
export { deriveDIKiteToRdH } from './adapters/diKiteToRdH';
export { deriveDHKiteToRdH } from './adapters/dhKiteToRdH';
export { deriveRegularHexToRdH } from './adapters/regularHexToRdH';
export { measureKiteFace } from './adapters/kiteToRdH';
export type { KiteFaceMeasured, KitePieceOptions } from './adapters/kiteToRdH';
export { fitTargetPolygon } from './adapters/shared';
export type { AngleFitGroup, TargetCorner } from './adapters/shared';
export { assignTargetAngles } from './adapters/shared';
