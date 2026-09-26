/**
 * The combined registry across every polyhedron family. Individual family
 * files (deltahedra.ts, platonic.ts, archimedean.ts, johnson.ts, catalan.ts,
 * prisms.ts) stay independently importable for family-specific logic (the
 * D10<->D12 rewrite rule only ever needs DELTAHEDRA, for instance) — this
 * file is for anything that should work across all of them, like the shape
 * picker and the assembly graph's validation.
 */

import type { PolyhedronSpec } from './core';
import { DELTAHEDRA, DELTAHEDRON_IDS } from './deltahedra';
import { PLATONIC_ADDITIONS, PLATONIC_ADDITION_IDS } from './platonic';
import { ARCHIMEDEAN_ADDITIONS, ARCHIMEDEAN_ADDITION_IDS } from './archimedean';
import { JOHNSON_ADDITIONS, JOHNSON_ADDITION_IDS } from './johnson';
import { CATALAN_ADDITIONS, CATALAN_ADDITION_IDS } from './catalan';
import { PRISM_ANTIPRISM_ADDITIONS, PRISM_ANTIPRISM_ADDITION_IDS } from './prisms';
import { MISCELLANEOUS_ADDITIONS, MISCELLANEOUS_ADDITION_IDS } from './miscellaneous';
import { APERIODIC_ADDITIONS, APERIODIC_ADDITION_IDS } from './aperiodic';

export * from './core';
export { DELTAHEDRA, DELTAHEDRON_IDS } from './deltahedra';
export { PLATONIC_ADDITIONS, PLATONIC_ADDITION_IDS } from './platonic';
export { ARCHIMEDEAN_ADDITIONS, ARCHIMEDEAN_ADDITION_IDS } from './archimedean';
export { JOHNSON_ADDITIONS, JOHNSON_ADDITION_IDS } from './johnson';
export { CATALAN_ADDITIONS, CATALAN_ADDITION_IDS } from './catalan';
export { PRISM_ANTIPRISM_ADDITIONS, PRISM_ANTIPRISM_ADDITION_IDS } from './prisms';
export { MISCELLANEOUS_ADDITIONS, MISCELLANEOUS_ADDITION_IDS } from './miscellaneous';
export { APERIODIC_ADDITIONS, APERIODIC_ADDITION_IDS } from './aperiodic';
export { isFaceEligibleForAttach } from './attachEligibility';

export const POLYHEDRA: Record<string, PolyhedronSpec> = {
  ...DELTAHEDRA,
  ...PLATONIC_ADDITIONS,
  ...ARCHIMEDEAN_ADDITIONS,
  ...JOHNSON_ADDITIONS,
  ...CATALAN_ADDITIONS,
  ...PRISM_ANTIPRISM_ADDITIONS,
  ...MISCELLANEOUS_ADDITIONS,
  ...APERIODIC_ADDITIONS,
};

export const POLYHEDRON_IDS: string[] = [
  ...DELTAHEDRON_IDS,
  ...PLATONIC_ADDITION_IDS,
  ...ARCHIMEDEAN_ADDITION_IDS,
  ...JOHNSON_ADDITION_IDS,
  ...CATALAN_ADDITION_IDS,
  ...PRISM_ANTIPRISM_ADDITION_IDS,
  ...MISCELLANEOUS_ADDITION_IDS,
  ...APERIODIC_ADDITION_IDS,
];
