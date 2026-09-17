/**
 * Stages 3-5 driver/report for the Composite-Seed RCP investigation:
 * angular residual sweep + analytic-derivation cross-check (Stage 3),
 * single-pair Coxeter compatibility (Stage 4), and the tetrahedral
 * experiment (Stage 5) -- all measured, not assumed from
 * docs/composite-seed-rcp/hypothesis.md's own reported numbers.
 */
import { sweepAngularResidual, THETA_CUBE_DEG, THETA_OCT_DEG } from '../app/lib/polyhedra/composite-seed-rcp/angularResidual';
import { checkCoxeterCompatibility } from '../app/lib/polyhedra/composite-seed-rcp/coxeterCheck';
import { sweepTetrahedralExperiment } from '../app/lib/polyhedra/composite-seed-rcp/tetrahedralExperiment';

let failures = 0;
function check(label: string, cond: boolean) {
  console.log(`${cond ? 'ok' : 'FAIL'}: ${label}`);
  if (!cond) failures++;
}

const MAX_L = 12;
const TOL_DEG = 1e-6;

// ---------------------------------------------------------------------
// Stage 3: angular residual sweep, cross-checked against the closed-form
// derivation in angularDerivation.md -- not just "is it constant" but
// "does the constant equal the derived value."
// ---------------------------------------------------------------------
console.log(`\n=== STAGE 3: angular residual, cube (theta_cube derived = ${THETA_CUBE_DEG}deg) ===`);
const cubeSweep = sweepAngularResidual('cube', MAX_L);
for (const r of cubeSweep) {
  console.log(`  L=${r.L}: epsAng=${r.epsAngDeg.toFixed(6)}deg  allConstant=${r.allConstant}`);
}
check('cube: epsAng(L) == 45deg exactly at every tested L', cubeSweep.every((r) => Math.abs(r.epsAngDeg - THETA_CUBE_DEG) < TOL_DEG));
check('cube: every boundary class individually constant at every L', cubeSweep.every((r) => r.allConstant));

console.log(`\n=== STAGE 3: angular residual, octahedron (theta_oct derived = ${THETA_OCT_DEG.toFixed(6)}deg) ===`);
const octSweep = sweepAngularResidual('oct', MAX_L);
for (const r of octSweep) {
  console.log(`  L=${r.L}: epsAng=${r.epsAngDeg.toFixed(6)}deg  allConstant=${r.allConstant}`);
}
check('oct: epsAng(L) == arcsin(1/sqrt(3)) exactly at every tested L', octSweep.every((r) => Math.abs(r.epsAngDeg - THETA_OCT_DEG) < TOL_DEG));
check('oct: every boundary class individually constant at every L', octSweep.every((r) => r.allConstant));

// ---------------------------------------------------------------------
// Stage 4: single-pair Coxeter compatibility.
// ---------------------------------------------------------------------
console.log('\n=== STAGE 4: Coxeter single-pair compatibility ===');
const cubeCox = checkCoxeterCompatibility(THETA_CUBE_DEG);
console.log(`  cube: theta=${cubeCox.thetaDeg}deg, pi/theta=${cubeCox.piOverTheta.toFixed(6)}, compatible=${cubeCox.compatible}, m=${cubeCox.m}`);
check('cube theta is Coxeter-compatible with m=4 (pi/4)', cubeCox.compatible && cubeCox.m === 4);

const octCox = checkCoxeterCompatibility(THETA_OCT_DEG);
console.log(`  oct: theta=${octCox.thetaDeg.toFixed(6)}deg, pi/theta=${octCox.piOverTheta.toFixed(6)}, compatible=${octCox.compatible}`);
check('oct theta is NOT Coxeter-compatible with any integer m (matches hypothesis.md S10.3)', !octCox.compatible);

// ---------------------------------------------------------------------
// Stage 5: tetrahedral experiment.
// ---------------------------------------------------------------------
console.log('\n=== STAGE 5: tetrahedral experiment ===');
const tetSweep = sweepTetrahedralExperiment(10);
for (const r of tetSweep) {
  console.log(
    `  L=${r.L}: maxEpsPos=${r.maxEpsPos.toExponential(3)}  classification=${r.classification}  angles=[${r.distinctAngles.map((a) => `${a.angleDeg.toFixed(4)}deg x${a.count}`).join(', ')}]`,
  );
}
check('tet: positional residual is exact (< 1e-9) at every tested L', tetSweep.every((r) => r.maxEpsPos < 1e-9));
check('tet: angular spectrum classifies as single-constant-angle at every tested L (hypothesis.md S13 outcome 1)', tetSweep.every((r) => r.classification === 'single-constant-angle'));
check(
  'tet: that single constant equals theta_oct exactly (a genuine finding, not assumed)',
  tetSweep.every((r) => r.distinctAngles.length === 1 && Math.abs(r.distinctAngles[0].angleDeg - THETA_OCT_DEG) < TOL_DEG),
);
const tetCox = checkCoxeterCompatibility(tetSweep[0].distinctAngles[0].angleDeg);
console.log(`  tet: theta_tet Coxeter check: compatible=${tetCox.compatible} (expected false, same as oct)`);
check('tet theta is NOT Coxeter-compatible either (same structural class as oct)', !tetCox.compatible);

console.log(failures === 0 ? '\nAll Stage 3-5 checks passed.' : `\n${failures} check(s) FAILED.`);
process.exit(failures === 0 ? 0 : 1);
