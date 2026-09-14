/**
 * RVCMG (Reversible Vertex-Coalescence Morphing Geometry) public export
 * surface. Filled in incrementally, one stage at a time, per the RVCMG
 * implementation plan — do not export anything here before its owning
 * stage has landed and passed its own acceptance checks.
 */
export { HEMI_RD_INTERFACE, validateHemiRdInterface } from './hemiRdInterface';
export type { HemiRdInterfaceReport } from './hemiRdInterface';
export type { RvcmgVertex, RvcmgState, CoalescenceOp } from './types';
export { coalesce } from './coalesce';
