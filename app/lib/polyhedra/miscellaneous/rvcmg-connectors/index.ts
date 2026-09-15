/**
 * The "rvcmg-connectors" sub-group of the "Miscellaneous" family (see
 * the family's own index.ts one level up, which combines this
 * sub-group with the sibling "pyramids" one).
 *
 * Reserved for the 7 RVCMG physical adapter pieces (see
 * docs/rvcmg-adapter-pieces-spec.md) once they have real, closed 3D
 * solid geometry (vertices + faces both cross-sections — the hemi-RD
 * hex interface and the shape-specific target polygon — AND a real
 * tapered side wall connecting them, matching Rhombiverse's "derive
 * geometry, never hand-declare" standard).
 *
 * Today `app/lib/rvcmg/adapters/*.ts` only derive the flat
 * cross-section states and the coalesce()/verifyTransition() morph
 * between them (Stages 0-7 of RVCMG-implementation-plan.md, all done
 * and verified) — there is deliberately no side wall yet, so there is
 * no closed solid, so there is nothing here yet to register as a real,
 * placeable `PolyhedronSpec`. This file is the empty scaffold that
 * `index.ts` already expects to import from, kept in its own
 * directory-per-sub-source so adding the real pieces later is a
 * same-shape change to this one file, not a restructure.
 */

import type { PolyhedronSpec } from '../../core';

export const RVCMG_CONNECTOR_ADDITIONS: Record<string, PolyhedronSpec> = {};

export const RVCMG_CONNECTOR_ADDITION_IDS: string[] = [];
