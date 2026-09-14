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
export type { StateGraph } from './stateGraph';
export { createStateGraph, addState, addTransition, findPath, isComposite } from './stateGraph';
export { interpolate, classifyState } from './morph';
export type { VerifyTransitionOptions } from './verify';
export { verifyTransition } from './verify';
export type { AdapterPieceResult } from './adapters/triangleToRdH';
export { deriveTriangleToRdH, hemiRdStartState, RD_EDGE_LENGTH, HEMI_RD_INTERFACE_UNIT } from './adapters/triangleToRdH';
export { deriveSquareToRdH } from './adapters/squareToRdH';
export { assignTargetAngles } from './adapters/shared';
