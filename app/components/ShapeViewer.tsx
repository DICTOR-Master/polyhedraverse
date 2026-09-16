'use client';

import { useEffect, useRef } from 'react';
import * as THREE from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';
import {
  POLYHEDRA,
  POLYHEDRON_IDS,
  type PolyhedronSpec,
  triangulateFace,
  buildFaceConnectors,
  facesCongruent,
  faceRotationalSymmetry,
  isRegularFace,
  MISCELLANEOUS_ADDITION_IDS,
} from '../lib/polyhedra';
import { DELTAHEDRA } from '../lib/polyhedra/deltahedra';
import { emptyAssembly, isValidAssembly, migrateLegacyRcp4d, ASSEMBLY_STORAGE_KEY, type Assembly } from '../lib/assembly';
import { matchRewriteVertices, REWRITE_TARGET } from '../lib/polyhedra/rewrite';
import { collectSubtree, findParentConnection, hasCycle } from '../lib/graph';
import { FOURD_CAPABLE_IDS } from '../lib/polyhedra/fourD';
import { edgeClosingCorrection } from '../lib/polyhedra/fold4';
import { buildWallPrism, duoprismBuildDepth } from '../lib/polyhedra/duoprism';
import { buildRcpComplex, buildSyntheticCellSpec, effectiveSeedSpec, cellsAtShell, maxShell, type RcpComplex } from '../lib/polyhedra/rcpBuild';
import { resolveParamsKey, FOUR_D_SHAPE_PARAMS } from '../lib/polyhedra/radialProjection';

/**
 * The Miscellaneous family's face-attach eligibility policy, in one
 * place rather than duplicated at each call site. `spec.attachableFaceIndices`
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
function isFaceEligibleForAttach(spec: PolyhedronSpec, faceIndex: number): boolean {
  if (spec.attachableFaceIndices) return spec.attachableFaceIndices.includes(faceIndex);
  if (!MISCELLANEOUS_ADDITION_IDS.includes(spec.id)) return true;
  return isRegularFace(spec.vertices, spec.faces[faceIndex]);
}

const VERTEX_RADIUS = 0.06; // relative to unit edge length
const COLOR_FREE = 0xffcc33;
const COLOR_SELECTED = 0x33ff88;
const COLOR_OCCUPIED = 0x777777;
const COLOR_PENDING = 0xff6688;
const NODE_SELECTED_EMISSIVE = 0x663300;
const NODE_HAS_CAPACITY_EMISSIVE = 0x0d2b1a; // subtle: this node still has a free vertex or face to build from
// The RCP-C2B seed/root cell's own highlight color -- direct user
// feedback: against every constructed cell's ordinary green, the one real
// seed shape needs to stay identifiable at a glance throughout the whole
// build. Applied once (beginRcpBuild) and reapplied after every mesh swap
// that would otherwise reset it back to green (applyRootMeshForView's own
// fresh buildPlacedShape call, and loadAssembly's own reconstruction).
const RCP_SEED_COLOR = 0xffd400;
// "Show coordinates" overlay: RCP_COORD_POINT_COLOR marks each built
// cell's own real generating coordinate (RcpComplex.cells[].coordPoint3D
// -- its own doc comment explains why this is the actual generating
// point, not just a convenient stand-in like the vertex centroid),
// joined to the root's own center by a thin line ("lasers from the
// center", direct user request) -- visualizes the literal radial
// structure the whole feature (Radial Cell Projection) is named after.
// RCP_DUAL_POINT_COLOR (600-cell only) marks its cells' own vertices --
// which, by construction, ARE the "dual points": each one is the real
// centroid of a dodecahedral cell from the original 120-cell this
// closure was dualized from (dualize()'s own doc comment) -- a distinct
// concept from the coordinate point above, so a distinct color, with no
// line (they're already the cell's own rendered corners, not a separate
// point out in space).
const RCP_COORD_POINT_COLOR = 0xaa33ff;
const RCP_DUAL_POINT_COLOR = 0xff33cc;
const TWIST_SENSITIVITY = 0.012; // radians per pixel of horizontal drag, vertex-attach
const CLICK_DRAG_THRESHOLD_PX = 6; // beyond this, mousedown-to-mouseup is an orbit drag, not a click
const FACE_REGISTRATION_DRAG_PX = 40; // pixels of drag per discrete face-registration step

// Which vertex of an *incoming* shape serves as its own connection point for
// vertex-attach. Stage 4/5 don't ask the user to choose this — that would
// need its own interaction step, which isn't part of either stage's spec.
// Vertex 0 is an arbitrary but fixed convention for now.
const ATTACH_VERTEX_INDEX = 0;

export type ViewMode = 'normal' | 'translucent' | 'skeleton';

interface VertexUserData {
  vertexId: number;
  degree: number;
  occupied: boolean;
}

interface ShapeObjectUserData {
  specId: string;
  nodeId: string;
}

interface PlacedShape {
  object: THREE.Group; // holds foldGroup + vertexGroup; positioned/oriented directly in world space
  // 4D extension: mesh + edge lines live one level deeper, inside this
  // group, so a fold4-attached node's real closing rotation (see
  // recomputeAllFolds below) can be applied as this group's own local
  // matrix without ever touching `object`'s own position/quaternion
  // (which stays the ordinary flush pose the graph itself stores).
  // vertexGroup deliberately stays a DIRECT child of `object`, a sibling
  // of foldGroup rather than nested inside it -- vertex-attach code
  // elsewhere assumes exactly `sphere.parent.parent === object` (see
  // placedOwningVertexSphere/beginAttach), and a folded node can never be
  // the target of a NEW vertex-attach in this pass anyway (fold4 is
  // face-only). For every node with no fold4 sibling relationship,
  // foldGroup's matrix is simply identity and this is invisible.
  foldGroup: THREE.Group;
  mesh: THREE.Mesh;
  vertexGroup: THREE.Group;
  triangleToFaceIndex: number[]; // maps a raycast hit's mesh triangle index back to the original polygon face index
  faceOccupied: boolean[]; // one per spec.faces entry — face-attach's counterpart to vertex "occupied"
}

interface PendingVertexAttach {
  kind: 'vertex';
  placed: PlacedShape;
  nodeId: string;
  targetSphere: THREE.Mesh;
  baseQuaternion: THREE.Quaternion; // orientation before twist
  attachLocalDir: THREE.Vector3; // the incoming shape's own local connection axis
  twistAngle: number;
}

interface PendingFaceAttach {
  kind: 'face';
  placed: PlacedShape;
  nodeId: string;
  targetPlaced: PlacedShape;
  targetFaceIndex: number;
  incomingFaceIndex: number;
  baseQuaternion: THREE.Quaternion; // the fully-aligned (registration 0) orientation
  axis: THREE.Vector3; // local face-normal axis to register/twist around
  // The face's OWN rotational symmetry order (faceRotationalSymmetry), not
  // its vertex count — only the same for a regular n-gon. A rhombus has 4
  // vertices but only 2 valid registrations (2-fold symmetry: its interior
  // angles alternate); most Catalan-solid faces have just 1 (no rotational
  // symmetry beyond identity). See docs/catalan-solids-spec.md.
  registrationCount: number;
  registration: number; // current discrete rotational registration, 0..registrationCount-1
  dragAccumPx: number;
  // 4D extension, Stage D, trigger point 1: set only when beginFaceAttach
  // was explicitly called with fold4 requested AND actually eligible
  // (self-attach of a FOURD_CAPABLE_IDS shape) -- confirmAttach reads
  // this to decide whether to tag the resulting connection `fold4: true`
  // and register it for the fold slider.
  fold4: boolean;
}

interface PendingDuoprismAttach {
  kind: 'duoprism';
  // The far-copy node -- EITHER a brand-new one (isNewNode: true, the
  // first duoprism attach on this parent) OR an already-placed, already-
  // confirmed one being reused (isNewNode: false). A real duoprism has
  // exactly ONE far copy total (like a tesseract has 2 cubes, not one
  // per face) -- see assembly.ts's own duoprismExtraFaces doc comment
  // for why reuse, not a fresh node, is the correct model for a SECOND+
  // face attached from the same parent.
  placed: PlacedShape;
  nodeId: string;
  isNewNode: boolean;
  targetPlaced: PlacedShape;
  targetFaceIndex: number;
  // The connecting wall-prism cell -- built once at begin time (its own
  // geometry never changes before confirm, since there's no registration/
  // twist step to drag through unlike ordinary/fold4 face-attach) and
  // added to the scene as a plain extra mesh, not part of either node's
  // own PlacedShape. Removed on cancel, kept (and re-derived on load) on
  // confirm -- see duoprismMeshesRef.
  wallMesh: THREE.Mesh;
}

type PendingAttach = PendingVertexAttach | PendingFaceAttach | PendingDuoprismAttach;

export interface RewriteResult {
  fromSpecId: string;
  toSpecId: string;
  reattached: number;
  orphaned: number;
}

export interface DeleteResult {
  deletedCount: number;
}

export interface ShapeViewerHandle {
  /** Clears the scene and places a single instance of `specId` at the origin. */
  reset(specId: string): void;
  /** Places `specId` at the currently selected target vertex as a pending (draggable) attach. */
  beginAttach(specId: string): void;
  /**
   * Places `specId` at the currently selected target face as a pending
   * (draggable) face-to-face attach. `fold4` requests the real 4D fold
   * (see fold4.ts) instead of an ordinary flush join -- silently ignored
   * (falls back to an ordinary attach) unless `specId` matches the
   * target's own shape and that shape is FOURD_CAPABLE_IDS-eligible;
   * `isValidAssembly` is the actual authority this defers to, this is
   * just the UI-facing request.
   */
  beginFaceAttach(specId: string, fold4?: boolean): void;
  /**
   * Places a same-shape, identical-orientation TRANSLATED copy at the
   * currently selected target face, connected by a real 3D wall-prism
   * cell (see duoprism.ts) -- the 4D Prism / duoprism construction.
   * Unlike beginFaceAttach, there is no shape choice and no registration/
   * twist step: the incoming shape and orientation are entirely
   * determined by the target (silently no-ops if nothing selected, or
   * the target isn't FOURD_CAPABLE_IDS-eligible -- `isValidAssembly` is
   * the actual authority this defers to).
   */
  beginDuoprismAttach(): void;
  /** Locks the pending attach (vertex or face) in place. */
  confirmAttach(): void;
  /** Removes the pending attach and frees its target vertex/face again. */
  cancelAttach(): void;
  /** Persists the current assembly graph. Resolves false on failure. */
  save(): Promise<boolean>;
  /** Swaps the currently selected node's shape (D10<->D12 only). Null if nothing eligible is selected. */
  rewriteSelectedNode(): RewriteResult | null;
  /** Removes the currently selected node and its whole subtree. Null if nothing is selected. */
  deleteSelectedNode(): DeleteResult | null;
  /**
   * Removes the single most recently CONFIRMED attach (vertex or face),
   * and whatever's been built on top of it since, if anything. Null if
   * there's nothing to undo (nothing confirmed yet this session, or the
   * last one was already undone/deleted/reset past). Single-level only
   * -- calling it again immediately after a successful undo returns null,
   * not a second step back; a fresh confirmAttach/beginFaceAttach cycle
   * is what re-arms it.
   */
  undo(): DeleteResult | null;
  /** The current assembly graph, exactly as saved -- for client-side export (JSON download), not persistence. */
  getAssembly(): Assembly;
  /** Sets the render mode (opaque / translucent / skeleton-ish) for every placed shape. */
  setViewMode(mode: ViewMode): void;
  /**
   * The 4D fold slider position, 0 (pure 3D projection -- the real
   * geometric separation gap) to 1 (pure 4D -- flush, matching the
   * ordinary stored pose). Only ever visibly affects nodes with an
   * incoming fold4 connection; a no-op otherwise. See
   * onFoldConnectionsChange for when the UI should even show this control.
   */
  setFoldAmount(t: number): void;
  /**
   * RCP-C2B: marks the currently whole-node-selected (see
   * NodeSelection.rcpBuildEligible) node as an RCP-C2B root for
   * `target` (one of its own real closures). No-op if nothing eligible
   * is selected or `target` isn't a real closure of that node's shape.
   */
  beginRcpBuild(seedSpecId: string, target: string): void;
  /** While the selected RCP-C2B root's shell 1 isn't yet complete, adds exactly one more shell-1 cell (its own next not-yet-built face-neighbor, in face-index order). No-op otherwise. */
  buildNextRcpCell(): void;
  /** The inverse of buildNextRcpCell: removes the single most-recently-added shell-1 cell. No-op if no shell-1 cells are built yet. */
  removeLastRcpCell(): void;
  /** Once shell 1 is complete, adds every remaining cell at (current max shell + 1) in one batch. No-op if shell 1 isn't complete yet or the complex is already fully built. */
  buildNextRcpShell(): void;
  /** The inverse of buildNextRcpShell: removes every node at the current max shell in one batch. No-op if only the root (or an incomplete shell 1) remains. */
  removeLastRcpShell(): void;
  /**
   * The 3D/4D view for the selected RCP-C2B root's own shell-1 cells
   * (shell 2+ has no alternative view -- it always shows the real
   * projected geometry). `view3D=true` shows every currently-built
   * shell-1 cell at its ordinary, undistorted flush-attached position
   * (the same real self-attach registration `beginFaceAttach` uses);
   * `view3D=false` (the default once a cell exists) shows them at their
   * real, warped `projectVec4ToVec3` position -- the same technique
   * shell 2+ already uses. Persisted on the root (`rcpPolytope.view3D`),
   * so it survives save/reload. No-op if no shell-1 cells exist yet.
   */
  setRcpView3D(view3D: boolean): void;
  /**
   * Toggles the selected RCP-C2B root's own "show coordinates" overlay:
   * a purple point + line-from-center per built cell, at that cell's
   * real generating coordinate (never its vertex centroid -- see
   * RcpComplex.cells[].coordPoint3D's own doc comment for why those
   * differ), plus (600-cell only) a second marker color at each cell's
   * own vertices -- the real dual points, already rendered as that
   * cell's own corners. Independent of the 3D/4D toggle by construction
   * (coordPoint3D doesn't depend on it) and never persisted (session-only,
   * same as fold4's own foldAmount). No-op if no root is selected.
   */
  setRcpCoordinatesVisible(visible: boolean): void;
}

export interface ShapeSelection {
  specId: string;
  vertexId: number;
  degree: number;
}

export interface NodeSelection {
  nodeId: string;
  specId: string;
  rewriteTarget: string | null;
  faceIndex: number | null;
  faceSize: number | null;
  faceOccupied: boolean;
  /** Spec ids with a matching face size — empty unless faceIndex is set and free. */
  faceAttachOptions: string[];
  /**
   * 4D extension, Stage D, trigger point 1: true iff this node's own
   * shape is FOURD_CAPABLE_IDS-eligible AND the selected face is free --
   * the UI's signal for whether to additionally offer "attach via 4D
   * fold" (self-attach only) alongside the ordinary face-attach picker,
   * never as a separate always-visible control.
   */
  faceFold4Eligible: boolean;
  /**
   * Same eligibility condition as faceFold4Eligible (this node's own
   * shape is FOURD_CAPABLE_IDS-eligible AND the selected face is free) --
   * the UI's signal for whether to additionally offer "Attach via
   * Duoprism…" alongside the ordinary face-attach and 4D-fold options.
   * Always true/false together with faceFold4Eligible for the 4
   * qualifying shapes; kept as its own field (not reusing
   * faceFold4Eligible directly) so the two features can diverge in
   * scope later without an implicit coupling.
   */
  faceDuoprismEligible: boolean;
  /**
   * RCP-C2B (Radial Cell Projection, click-to-build), replacing fold4 as
   * the live 4D folding-construction feature: true iff this NODE (its
   * OWN shape, regardless of which face happens to also be hover/click-
   * selected -- RCP-C2B operates on the whole node, matching Delete's
   * own real, unconditional-on-faceIndex behavior, not gated on a
   * WHOLE-node selection the way face-attach/fold4/duoprism deliberately
   * are) resolves to a real verified 4D closure (`resolveParamsKey` --
   * covers PYRAMID_TRI_G2 resolving to D4's own closures, not just the 4
   * directly-keyed ids), and it has no incoming connection (a real,
   * unattached root -- same "is this a real root" condition duoprism's
   * own far-copy reuse logic already establishes elsewhere).
   * `rcpClosureOptions` is the seed's own real closure names (1 for
   * CUBE/D8/DODECAHEDRON, 3 for D4/PYRAMID_TRI_G2 --
   * '5-cell'/'16-cell'/'600-cell').
   */
  rcpBuildEligible: boolean;
  rcpClosureOptions: string[];
  /**
   * Set once this SPECIFIC node is a real RCP-C2B root (its own
   * `rcpPolytope` field is set) -- null otherwise, including for a node
   * that's merely `rcpBuildEligible` but hasn't started building yet.
   * `shell1Complete`/`totalCells` let page.tsx decide between the
   * one-click-at-a-time shell-1 UI and the batch shell-by-shell UI;
   * `builtCount`/`maxBuiltShell` drive the progress label and the
   * "Remove last shell"/"Build next shell" disabled states.
   */
  rcpRoot: {
    seedSpecId: string;
    target: string;
    shell1Complete: boolean;
    shell1Size: number;
    builtCount: number;
    totalCells: number;
    maxBuiltShell: number;
    complexMaxShell: number;
    /** Whether the 3D/4D view toggle has anything to show yet (at least one shell-1 cell is built). Stays true even once locked (see viewToggleLocked) -- the control should stay visible-but-disabled, never disappear outright (real user frustration: "4D feature buttons just disappear of their own accord"). */
    viewToggleAvailable: boolean;
    /** True once any shell-2+ cell exists: shell 2+ is permanently anchored to shell 1's "4D" position (buildNextRcpShell's own comment), so switching away from it here would only disconnect the two. The toggle stays visible but disabled, with an explanatory title, rather than vanishing. */
    viewToggleLocked: boolean;
    /** The root's own current view choice (`rcpPolytope.view3D`, defaulting to true/3D). */
    view3D: boolean;
    /** Whether the "show coordinates" overlay (purple coordinate-point lasers, plus dual-point markers for the 600-cell) is currently on for this root -- session-only, never persisted, same as fold4's own foldAmount. */
    coordinatesVisible: boolean;
  } | null;
}

function buildFaceGeometry(spec: PolyhedronSpec): { geometry: THREE.BufferGeometry; triangleToFaceIndex: number[] } {
  const positions: number[] = [];
  const triangleToFaceIndex: number[] = [];
  spec.faces.forEach((face, faceIndex) => {
    for (const [i, j, k] of triangulateFace(face)) {
      positions.push(...spec.vertices[i], ...spec.vertices[j], ...spec.vertices[k]);
      triangleToFaceIndex.push(faceIndex);
    }
  });
  const geometry = new THREE.BufferGeometry();
  geometry.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));
  geometry.computeVertexNormals(); // non-indexed: each vertex is unique per face, so this yields flat shading
  return { geometry, triangleToFaceIndex };
}

function buildEdgeGeometry(spec: PolyhedronSpec): THREE.BufferGeometry {
  const positions: number[] = [];
  for (const [i, j] of spec.edges) {
    positions.push(...spec.vertices[i], ...spec.vertices[j]);
  }
  const geometry = new THREE.BufferGeometry();
  geometry.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));
  return geometry;
}

/** Small invisible pickable spheres, one per vertex — raycast targets for hover/select, not for display. */
function buildVertexGroup(spec: PolyhedronSpec): THREE.Group {
  const group = new THREE.Group();
  for (const connector of spec.connectors) {
    const sphere = new THREE.Mesh(
      new THREE.SphereGeometry(VERTEX_RADIUS, 12, 12),
      new THREE.MeshBasicMaterial({
        color: COLOR_FREE,
        transparent: true,
        opacity: 0,
        depthTest: false, // stay visible over the shape's own faces once highlighted
      }),
    );
    sphere.position.set(...connector.pos);
    sphere.renderOrder = 1;
    sphere.userData = {
      vertexId: connector.id,
      degree: connector.degree,
      occupied: false,
    } satisfies VertexUserData;
    group.add(sphere);
  }
  return group;
}

// vertexGroup.children[i] always corresponds to spec.connectors[i] (== spec.vertices[i]),
// since buildVertexGroup iterates spec.connectors in order and PolyhedronSpec's own
// buildConnectors() assigns connector.id === its array index.
function buildPlacedShape(spec: PolyhedronSpec, nodeId: string): PlacedShape {
  const object = new THREE.Group();
  object.userData = { specId: spec.id, nodeId } satisfies ShapeObjectUserData;

  const { geometry, triangleToFaceIndex } = buildFaceGeometry(spec);
  const mesh = new THREE.Mesh(
    geometry,
    // side: FrontSide here matches 'normal' mode's own value (applyViewMode
    // is always called immediately after buildPlacedShape and would
    // overwrite this regardless -- see its own comment for why side is
    // mode-dependent, not a fixed DoubleSide).
    // Matches the brand green used consistently everywhere else (logo,
    // PolyhedralWheel, CornerHudWheel, WelcomeOverlay, header) instead of
    // a leftover generic blue -- applies uniformly across every view
    // mode (Solid/Translucent/Inside) since applyViewMode only ever
    // touches opacity/side/depthWrite, never the base color itself.
    new THREE.MeshStandardMaterial({ color: 0x47cc24, flatShading: true, side: THREE.FrontSide }),
  );

  // See PlacedShape's own doc comment for why mesh + lines live inside
  // this extra group rather than directly under `object`.
  const foldGroup = new THREE.Group();
  foldGroup.add(mesh);

  const lines = new THREE.LineSegments(
    buildEdgeGeometry(spec),
    new THREE.LineBasicMaterial({ color: 0xffffff }),
  );
  foldGroup.add(lines);
  object.add(foldGroup);

  const vertexGroup = buildVertexGroup(spec);
  object.add(vertexGroup);

  return {
    object,
    foldGroup,
    mesh,
    vertexGroup,
    triangleToFaceIndex,
    faceOccupied: new Array(spec.faces.length).fill(false),
  };
}

function disposePlacedShape(placed: PlacedShape) {
  placed.object.traverse((child) => {
    if (child instanceof THREE.Mesh || child instanceof THREE.LineSegments) {
      child.geometry.dispose();
      const material = child.material;
      if (Array.isArray(material)) material.forEach((m) => m.dispose());
      else material.dispose();
    }
  });
}

/** Paints a vertex sphere according to its current state (free/selected/occupied/pending). */
function paintVertex(sphere: THREE.Mesh, opts: { selected?: boolean; hovered?: boolean; pending?: boolean }) {
  const data = sphere.userData as VertexUserData;
  const material = sphere.material as THREE.MeshBasicMaterial;
  if (opts.pending) {
    material.color.setHex(COLOR_PENDING);
    material.opacity = 1;
    sphere.scale.setScalar(1.6);
    return;
  }
  if (data.occupied) {
    material.color.setHex(COLOR_OCCUPIED);
    material.opacity = 0.6;
    sphere.scale.setScalar(1);
    return;
  }
  if (opts.selected) {
    material.color.setHex(COLOR_SELECTED);
    material.opacity = 1;
    sphere.scale.setScalar(1.6);
    return;
  }
  if (opts.hovered) {
    material.color.setHex(COLOR_FREE);
    material.opacity = 1;
    sphere.scale.setScalar(1.6);
    return;
  }
  material.color.setHex(COLOR_FREE);
  material.opacity = 0;
  sphere.scale.setScalar(1);
}

/**
 * A node's body glows faintly while it still has a free vertex or face
 * (pure counting over the same occupied flags the hover tooltip already
 * reports). Selection always wins over the capacity glow.
 */
function applyRcpSeedColor(placed: PlacedShape) {
  (placed.mesh.material as THREE.MeshStandardMaterial).color.setHex(RCP_SEED_COLOR);
}

function applyNodeAppearance(placed: PlacedShape, selected: boolean) {
  const material = placed.mesh.material as THREE.MeshStandardMaterial;
  if (selected) {
    material.emissive.setHex(NODE_SELECTED_EMISSIVE);
    return;
  }
  const hasFreeVertex = placed.vertexGroup.children.some(
    (child) => !((child as THREE.Mesh).userData as VertexUserData).occupied,
  );
  const hasFreeFace = placed.faceOccupied.some((occupied) => !occupied);
  material.emissive.setHex(hasFreeVertex || hasFreeFace ? NODE_HAS_CAPACITY_EMISSIVE : 0x000000);
}

/**
 * Cutaway/inside-view toggle. Skeleton mode keeps the mesh technically
 * visible (opacity near zero) rather than setting `.visible = false` —
 * Three.js's Raycaster skips invisible objects, which would silently break
 * node/face selection while in skeleton mode.
 *
 * side is mode-dependent, not a fixed DoubleSide: real bug found live
 * ("a triangle not quite covering a triangle") -- face-attach glues two
 * faces together facing exactly opposite directions (deliberately, so
 * pieces meet back-to-back rather than overlapping -- see
 * beginFaceAttach's own comment), and once joined those two coincident
 * triangles are now both genuinely INTERNAL to the assembly, never meant
 * to be independently visible from outside. With DoubleSide, both still
 * rendered anyway -- two exactly-coincident, oppositely-wound triangles
 * both competing for the same pixels is a textbook z-fighting setup,
 * confirmed NOT a data/position bug first (a chained multi-attach
 * simulation, including a snub disphenoid specifically, measured
 * coincidence error at machine-epsilon/~1e-16 in every case tried).
 * FrontSide for normal/Solid view fixes this by construction (the
 * internal, away-facing triangle of each piece is simply never
 * rasterized at all, not just less likely to conflict) and is also the
 * geometrically correct choice for an opaque solid regardless. Kept
 * DoubleSide for Translucent/Inside view, where seeing the far/interior
 * surface through the near one is the whole point of those modes, not
 * an oversight to also fix.
 */
function applyViewMode(placed: PlacedShape, mode: ViewMode) {
  const material = placed.mesh.material as THREE.MeshStandardMaterial;
  material.transparent = mode !== 'normal';
  material.depthWrite = mode === 'normal';
  material.opacity = mode === 'normal' ? 1 : mode === 'translucent' ? 0.35 : 0.04;
  material.side = mode === 'normal' ? THREE.FrontSide : THREE.DoubleSide;
  material.needsUpdate = true;
}

// Per-shell falloff for RCP-C2B cells -- direct user feedback: without
// this, several closures (the octahedron -> 24-cell in particular) pile
// shell-1 cells almost exactly on top of the seed and each other under
// "4D"'s real perspective projection, so clicking "Add next cell" reads
// as "nothing is happening" even though it genuinely is. Geometric decay
// per shell (shell 0 = the seed, always fully at the current view mode's
// own opacity) keeps the root visible through however many outer shells
// are built, rather than only helping the specific closures that happen
// to still look separated. Floored so outer shells stay faintly visible
// rather than vanishing.
const RCP_SHELL_OPACITY_FACTOR = 0.75;
const RCP_SHELL_OPACITY_FLOOR = 0.12;

function applyRcpShellOpacity(placed: PlacedShape, shell: number) {
  if (shell <= 0) return;
  const material = placed.mesh.material as THREE.MeshStandardMaterial;
  const scaled = material.opacity * Math.pow(RCP_SHELL_OPACITY_FACTOR, shell);
  material.opacity = Math.max(scaled, RCP_SHELL_OPACITY_FLOOR);
  material.transparent = true;
  material.depthWrite = false;
  material.side = THREE.DoubleSide;
  material.needsUpdate = true;
}

export default function ShapeViewer({
  initialShapeId,
  onSelectionChange,
  onPendingChange,
  onNodeSelectionChange,
  onCageClosedChange,
  onCanUndoChange,
  onFoldConnectionsChange,
  onReady,
}: {
  initialShapeId: string;
  onSelectionChange?: (selection: ShapeSelection | null) => void;
  onPendingChange?: (pending: { specId: string; fold4?: boolean; duoprism?: boolean } | null) => void;
  onNodeSelectionChange?: (selection: NodeSelection | null) => void;
  onCageClosedChange?: (closed: boolean) => void;
  onCanUndoChange?: (canUndo: boolean) => void;
  /**
   * Fires whenever the current assembly's own count of real fold4
   * connections crosses the zero/nonzero boundary -- the UI's own signal
   * for whether the 4D fold slider should be visible at all (trigger
   * point 2 of the contextual design: the slider only ever appears once
   * at least one fold4 attachment genuinely exists, never as a permanent
   * control).
   */
  onFoldConnectionsChange?: (hasFoldConnections: boolean) => void;
  onReady?: (handle: ShapeViewerHandle) => void;
}) {
  const containerRef = useRef<HTMLDivElement>(null);
  const labelRef = useRef<HTMLDivElement>(null);
  const sceneRef = useRef<THREE.Scene | null>(null);
  const placedRef = useRef<PlacedShape[]>([]);
  const graphRef = useRef<Assembly>(emptyAssembly());
  // Which RCP-C2B roots currently show their "coordinate points" overlay
  // -- a pure display aid, deliberately session-only/not persisted (same
  // precedent as fold4's own foldAmount: "never stored, always
  // re-derived"), so this is empty again after every reload.
  const rcpCoordVisibleRef = useRef<Set<string>>(new Set());
  const rcpCoordGroupRef = useRef<Map<string, THREE.Group>>(new Map());
  const hoveredRef = useRef<THREE.Mesh | null>(null);
  const selectedRef = useRef<THREE.Mesh | null>(null);
  const hoveredNodeRef = useRef<PlacedShape | null>(null);
  const selectedNodeRef = useRef<PlacedShape | null>(null);
  const hoveredFaceIndexRef = useRef<number | null>(null);
  const selectedFaceIndexRef = useRef<number | null>(null);
  const pendingRef = useRef<PendingAttach | null>(null);
  const viewModeRef = useRef<ViewMode>('normal');
  // The single most recently CONFIRMED attach's node id -- see undo()'s
  // own doc comment on ShapeViewerHandle for the exact single-level
  // semantics. Cleared on reset, on undo itself, and whenever that
  // specific node gets removed some other way (an explicit delete
  // covering it).
  const lastAddedNodeIdRef = useRef<string | null>(null);
  // 4D extension. foldAmountRef is the slider's own `t`: 0 = raw/ordinary
  // 3D (every fold4-attached sibling sits at its own real, independent
  // flush pose -- the actual geometric gap between siblings sharing an
  // edge is fully visible, matching a rigid physical construction), 1 =
  // fully closed (each sibling rotated to meet its neighbor, matching
  // the true 4D structure where the gap doesn't exist). Starts at 0 so a
  // freshly confirmed fold4 attach looks exactly like an ordinary flush
  // attach (its real geometric consequences visible) until the player
  // drags the slider toward 4D themselves; reset back to 0 whenever the
  // assembly's last fold4 connection is removed. See
  // recomputeAllFolds's own doc comment for how `t` turns into actual
  // per-node rotations, recomputed fresh from the current graph on every
  // change rather than incrementally cached (simpler and correct even
  // when a new sibling's arrival changes an EXISTING node's own
  // correction, which incremental per-node registration got wrong).
  const foldAmountRef = useRef<number>(0);
  const hasFoldConnectionsRef = useRef<boolean>(false);
  // Duoprism wall-prism meshes, keyed by their own CHILD node's id (see
  // confirmAttach's own duoprism branch) -- plain extra scene meshes,
  // never part of either node's own PlacedShape, since a wall-prism
  // isn't itself an assembly node.
  const duoprismMeshesRef = useRef<Map<string, THREE.Mesh>>(new Map());
  // RCP-C2B: buildRcpComplex's own result is fully deterministic given
  // just (seedSpecId, target) -- cached here, keyed by that pair, so
  // switching between "Build next shell"/"Remove last shell" clicks (or
  // multiple independent RCP-C2B roots sharing the same seed+target) never
  // recomputes the whole 4-polytope complex from scratch each time.
  const rcpComplexCacheRef = useRef<Map<string, RcpComplex>>(new Map());
  const onFoldConnectionsChangeRef = useRef(onFoldConnectionsChange);
  const onSelectionChangeRef = useRef(onSelectionChange);
  const onPendingChangeRef = useRef(onPendingChange);
  const onNodeSelectionChangeRef = useRef(onNodeSelectionChange);
  const onCageClosedChangeRef = useRef(onCageClosedChange);
  const onCanUndoChangeRef = useRef(onCanUndoChange);
  const onReadyRef = useRef(onReady);

  useEffect(() => {
    onSelectionChangeRef.current = onSelectionChange;
  }, [onSelectionChange]);

  useEffect(() => {
    onPendingChangeRef.current = onPendingChange;
  }, [onPendingChange]);

  useEffect(() => {
    onNodeSelectionChangeRef.current = onNodeSelectionChange;
  }, [onNodeSelectionChange]);

  useEffect(() => {
    onCageClosedChangeRef.current = onCageClosedChange;
  }, [onCageClosedChange]);

  useEffect(() => {
    onCanUndoChangeRef.current = onCanUndoChange;
  }, [onCanUndoChange]);

  useEffect(() => {
    onFoldConnectionsChangeRef.current = onFoldConnectionsChange;
  }, [onFoldConnectionsChange]);

  useEffect(() => {
    onReadyRef.current = onReady;
  }, [onReady]);

  useEffect(() => {
    const container = containerRef.current;
    const label = labelRef.current;
    if (!container || !label) return;

    const scene = new THREE.Scene();
    scene.background = new THREE.Color(0x0a0a10);
    sceneRef.current = scene;

    // Starry background: a static field of small points scattered on a
    // large sphere shell well outside any shape (shapes stay within a
    // handful of units of the origin; the camera's own far plane is 100).
    // Purely decorative, zero per-frame cost -- one static BufferGeometry
    // added once at scene setup, not touched by the render loop.
    const STAR_COUNT = 800;
    const starPositions = new Float32Array(STAR_COUNT * 3);
    for (let i = 0; i < STAR_COUNT; i++) {
      const theta = Math.random() * Math.PI * 2;
      const phi = Math.acos(2 * Math.random() - 1);
      const r = 40 + Math.random() * 20;
      starPositions[i * 3] = r * Math.sin(phi) * Math.cos(theta);
      starPositions[i * 3 + 1] = r * Math.sin(phi) * Math.sin(theta);
      starPositions[i * 3 + 2] = r * Math.cos(phi);
    }
    const starGeometry = new THREE.BufferGeometry();
    starGeometry.setAttribute('position', new THREE.BufferAttribute(starPositions, 3));
    const starMaterial = new THREE.PointsMaterial({
      color: 0xffffff,
      size: 0.16,
      sizeAttenuation: true,
      transparent: true,
      opacity: 0.85,
      depthWrite: false,
    });
    const starfield = new THREE.Points(starGeometry, starMaterial);
    scene.add(starfield);

    // Face-hover highlight: a single shared overlay mesh showing exactly
    // which triangle is currently targeted, distinct from
    // applyNodeAppearance's own whole-shape emissive glow. Real gap found
    // live -- with only a whole-shape glow (correct for "this node has
    // capacity", never meant to be face-specific) and a text tooltip,
    // there was no way to actually SEE which of a many-faced shape's
    // triangles (e.g. all 12 on a snub disphenoid) was about to be
    // attached to -- it happened to look reasonable on a 4-faced
    // tetrahedron (each face is a large fraction of the whole shape) but
    // read as "the whole shape lighting up"/"attaching randomly" on
    // anything with more, smaller faces. Rebuilt per-hover to match
    // whichever face is targeted (geometry is cheap -- at most a handful
    // of triangles), parented under the hovered node's own object so it
    // inherits that node's transform automatically.
    const faceHighlightMaterial = new THREE.MeshBasicMaterial({
      color: COLOR_FREE,
      transparent: true,
      opacity: 0.55,
      side: THREE.DoubleSide,
      depthTest: false, // always drawn on top, never z-fights the shape's own face underneath
    });
    const faceHighlightMesh = new THREE.Mesh(new THREE.BufferGeometry(), faceHighlightMaterial);
    faceHighlightMesh.renderOrder = 999; // draw after everything else, pairs with depthTest:false above
    faceHighlightMesh.visible = false;
    scene.add(faceHighlightMesh);

    const showFaceHighlight = (node: PlacedShape, faceIndex: number) => {
      const spec = POLYHEDRA[(node.object.userData as ShapeObjectUserData).specId];
      const positions: number[] = [];
      for (const [a, b, c] of triangulateFace(spec.faces[faceIndex])) {
        positions.push(...spec.vertices[a], ...spec.vertices[b], ...spec.vertices[c]);
      }
      faceHighlightMesh.geometry.dispose();
      faceHighlightMesh.geometry = new THREE.BufferGeometry();
      faceHighlightMesh.geometry.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));
      faceHighlightMesh.geometry.computeVertexNormals();
      node.object.updateMatrixWorld(true);
      // Through the node's own foldGroup, not `object` directly -- matches
      // beginFaceAttach's own fix (see its comment): a fold4 node's real
      // rendered position can differ from its outer object's unfolded
      // baseline once the slider is off 0, and the highlight should track
      // whichever one is actually clickable/visible.
      const pos = new THREE.Vector3();
      const quat = new THREE.Quaternion();
      const scl = new THREE.Vector3();
      node.foldGroup.matrixWorld.decompose(pos, quat, scl);
      faceHighlightMesh.position.copy(pos);
      faceHighlightMesh.quaternion.copy(quat);
      faceHighlightMesh.scale.copy(scl);
      faceHighlightMesh.visible = true;
    };
    const hideFaceHighlight = () => {
      faceHighlightMesh.visible = false;
    };

    const camera = new THREE.PerspectiveCamera(
      50,
      container.clientWidth / container.clientHeight,
      0.1,
      100,
    );
    camera.position.set(2.4, 1.9, 2.8);

    const renderer = new THREE.WebGLRenderer({ antialias: true });
    renderer.setSize(container.clientWidth, container.clientHeight);
    renderer.setPixelRatio(window.devicePixelRatio);
    renderer.domElement.style.position = 'absolute';
    renderer.domElement.style.inset = '0';
    container.appendChild(renderer.domElement);

    const controls = new OrbitControls(camera, renderer.domElement);
    controls.enableDamping = true;

    scene.add(new THREE.AmbientLight(0xffffff, 0.7));
    const dirLight = new THREE.DirectionalLight(0xffffff, 1.1);
    dirLight.position.set(3, 4, 5);
    scene.add(dirLight);

    const findPlaced = (nodeId: string) =>
      placedRef.current.find((p) => (p.object.userData as ShapeObjectUserData).nodeId === nodeId);

    /** This node's own RCP-C2B shell (0 = an RCP-C2B root, 1+ = a built rcp4d child at that shell), or null if it isn't part of an RCP-C2B build at all. Derived live from the graph, never cached, so it can't drift as cells are added/removed/undone. */
    const rcpShellOf = (nodeId: string): number | null => {
      const node = graphRef.current.nodes.find((n) => n.id === nodeId);
      if (node?.rcpPolytope) return 0;
      const conn = graphRef.current.connections.find((c) => !c.orphaned && c.kind === 'rcp4d' && c.nodeB === nodeId);
      return conn?.shell ?? null;
    };

    /**
     * True if this node's CURRENT mesh is the warped/nested RCP-C2B "4D"
     * geometry (a synthetic buildSyntheticCellSpec/effectiveSeedSpec
     * shape), not an ordinary registry shape -- direct user feedback:
     * with several such cells piled almost on top of each other, ordinary
     * vertex-attach hover/click was "triggered everywhere across the
     * surface" (any of the overlapping cells' vertex spheres could catch
     * the raycast), and face-attach/fold4/duoprism don't make sense on a
     * mid-build synthetic cell either -- in this mode only the dedicated
     * RCP-C2B build controls (whole-node selection, never a specific
     * vertex/face) are valid interactions. Shell 2+ is unconditionally
     * warped (it has no 3D-open alternative); the root and shell 1 follow
     * the root's own view3D toggle.
     */
    const isRcpWarpedNode = (nodeId: string): boolean => {
      const node = graphRef.current.nodes.find((n) => n.id === nodeId);
      if (node?.rcpPolytope) return node.rcpPolytope.view3D !== true;
      const conn = graphRef.current.connections.find((c) => !c.orphaned && c.kind === 'rcp4d' && c.nodeB === nodeId);
      if (!conn) return false;
      if (conn.shell !== 1) return true;
      const rootNode = graphRef.current.nodes.find((n) => n.id === conn.nodeA);
      return rootNode?.rcpPolytope?.view3D !== true;
    };

    /** applyViewMode plus the RCP-C2B per-shell opacity falloff (applyRcpShellOpacity's own doc comment) for whichever node `placed` belongs to -- the one wrapper every call site below should use instead of calling applyViewMode directly, so no creation/reload path has to remember the extra step. */
    const applyViewModeToPlaced = (placed: PlacedShape, mode: ViewMode) => {
      applyViewMode(placed, mode);
      const { nodeId } = placed.object.userData as ShapeObjectUserData;
      const shell = rcpShellOf(nodeId);
      if (shell !== null) applyRcpShellOpacity(placed, shell);
    };

    const placedOwningVertexSphere = (sphere: THREE.Mesh): PlacedShape | undefined => {
      const object = sphere.parent!.parent as THREE.Group;
      return findPlaced((object.userData as ShapeObjectUserData).nodeId);
    };

    const reportCageStatus = () => {
      onCageClosedChangeRef.current?.(hasCycle(graphRef.current));
    };

    /** The OTHER face of `spec` (besides `faceIndex`) that also borders the edge (vi,vj) of `faceIndex`'s own cycle, or null (shouldn't happen for a valid manifold solid). */
    const otherFaceAcrossEdge = (spec: PolyhedronSpec, faceIndex: number, vi: number, vj: number): number | null => {
      for (let f = 0; f < spec.faces.length; f++) {
        if (f === faceIndex) continue;
        const face = spec.faces[f];
        for (let k = 0; k < face.length; k++) {
          const a = face[k];
          const b = face[(k + 1) % face.length];
          if ((a === vi && b === vj) || (a === vj && b === vi)) return f;
        }
      }
      return null;
    };

    /**
     * Recomputes EVERY fold4 node's own closing rotation from scratch,
     * walking the current graph fresh -- not incrementally cached. That's
     * deliberate: a lone fold4 child (no sibling on the parent's adjacent
     * face yet) needs zero correction, but the MOMENT a second sibling
     * attaches next to it, the FIRST one's own correction changes too
     * (it now has a real edge partner) -- an earlier, incremental
     * per-node registration design got exactly this case wrong. Recomputing
     * fresh is simple, correct, and cheap at this app's real scale
     * (at most a few dozen placed nodes).
     *
     * For each fold4 connection (parent P, child C attached via P's face
     * F_P / C's face F_C): for every edge of F_P, if the OTHER parent face
     * bordering that edge is ALSO occupied by a different fold4 sibling,
     * that's a real "3 cells meet at this edge" situation (P + C + the
     * sibling) -- fold4.ts's edgeClosingCorrection gives the rotation
     * (around that edge, through its midpoint, in P's own local frame)
     * that closes C's half of the real angular defect at `t=1`, none of
     * it at `t=0`. Multiple contributing edges (a child bordering more
     * than one occupied sibling) compose sequentially into one combined
     * rotation. Converted from the parent's local frame to world, then
     * into the CHILD's own local frame, since that's the frame its own
     * `foldGroup` (nested inside its own, never-changing `object`)
     * operates in.
     */
    const recomputeAllFolds = (t: number) => {
      for (const placed of placedRef.current) {
        placed.foldGroup.matrixAutoUpdate = false;
        placed.foldGroup.matrix.identity();
        // vertexGroup stays a separate sibling (see PlacedShape's own doc
        // comment for why), but its own local matrix is kept numerically
        // in sync with foldGroup's -- otherwise a folded node's vertex
        // markers stay at their ORIGINAL unfolded spot while the mesh
        // visually rotates, so hovering near the now-rotated surface can
        // land on a stray, visually-detached vertex sphere instead (real
        // user report: "vertex attachment was triggering during assembly").
        placed.vertexGroup.matrixAutoUpdate = false;
        placed.vertexGroup.matrix.identity();
      }

      const nodeById = new Map(graphRef.current.nodes.map((n) => [n.id, n]));
      const occupiedByParent = new Map<string, Map<number, string>>();
      for (const conn of graphRef.current.connections) {
        if (conn.orphaned || conn.kind !== 'face' || !conn.fold4) continue;
        if (!occupiedByParent.has(conn.nodeA)) occupiedByParent.set(conn.nodeA, new Map());
        occupiedByParent.get(conn.nodeA)!.set(conn.vertexA, conn.nodeB);
      }
      if (occupiedByParent.size === 0) return;

      scene.updateMatrixWorld(true);

      for (const conn of graphRef.current.connections) {
        if (conn.orphaned || conn.kind !== 'face' || !conn.fold4) continue;
        const parentNode = nodeById.get(conn.nodeA);
        const parentPlaced = findPlaced(conn.nodeA);
        const childPlaced = findPlaced(conn.nodeB);
        if (!parentNode || !parentPlaced || !childPlaced) continue;
        const siblingsOnThisParent = occupiedByParent.get(conn.nodeA);
        if (!siblingsOnThisParent) continue;

        const parentSpec = POLYHEDRA[parentNode.shape];
        const parentFaceIndex = conn.vertexA;
        const faceCycle = parentSpec.faces[parentFaceIndex];
        const combined = new THREE.Matrix4();
        let anyContribution = false;

        for (let k = 0; k < faceCycle.length; k++) {
          const vi = faceCycle[k];
          const vj = faceCycle[(k + 1) % faceCycle.length];
          const otherFace = otherFaceAcrossEdge(parentSpec, parentFaceIndex, vi, vj);
          if (otherFace === null || !siblingsOnThisParent.has(otherFace)) continue;

          const corr = edgeClosingCorrection(parentSpec, parentFaceIndex, otherFace);
          if (!corr) continue;

          const pivotWorld = new THREE.Vector3(...corr.pivot).applyMatrix4(parentPlaced.object.matrixWorld);
          const axisWorld = new THREE.Vector3(...corr.axis).transformDirection(parentPlaced.object.matrixWorld).normalize();

          const childInverse = childPlaced.object.matrixWorld.clone().invert();
          const pivotLocal = pivotWorld.clone().applyMatrix4(childInverse);
          const axisLocal = axisWorld.clone().transformDirection(childInverse).normalize();

          const edgeMatrix = new THREE.Matrix4()
            .makeTranslation(pivotLocal.x, pivotLocal.y, pivotLocal.z)
            .multiply(new THREE.Matrix4().makeRotationAxis(axisLocal, corr.angleRad * t))
            .multiply(new THREE.Matrix4().makeTranslation(-pivotLocal.x, -pivotLocal.y, -pivotLocal.z));
          combined.premultiply(edgeMatrix);
          anyContribution = true;
        }

        if (anyContribution) {
          childPlaced.foldGroup.matrix.copy(combined);
          childPlaced.vertexGroup.matrix.copy(combined);
        }
      }

      scene.updateMatrixWorld(true);
    };

    /** Recomputes whether any real fold4 connection currently exists, firing onFoldConnectionsChange only on a real transition. */
    const refreshFoldConnectionsFlag = () => {
      const has = graphRef.current.connections.some((c) => !c.orphaned && c.kind === 'face' && c.fold4);
      if (has === hasFoldConnectionsRef.current) return;
      hasFoldConnectionsRef.current = has;
      if (!has) foldAmountRef.current = 0; // see foldAmountRef's own doc comment
      onFoldConnectionsChangeRef.current?.(has);
    };

    const clearSelection = () => {
      if (selectedRef.current) {
        paintVertex(selectedRef.current, {});
        selectedRef.current = null;
      }
      onSelectionChangeRef.current?.(null);
    };

    const clearNodeSelection = () => {
      if (selectedNodeRef.current) {
        applyNodeAppearance(selectedNodeRef.current, false);
        selectedNodeRef.current = null;
      }
      selectedFaceIndexRef.current = null;
      onNodeSelectionChangeRef.current?.(null);
    };

    /** buildRcpComplex is fully deterministic given (seedSpecId, target) -- cached per that pair for the life of this scene (rcpComplexCacheRef), not recomputed on every click. */
    const getRcpComplex = (seedSpecId: string, target: string): RcpComplex => {
      const key = `${seedSpecId}::${target}`;
      let complex = rcpComplexCacheRef.current.get(key);
      if (!complex) {
        complex = buildRcpComplex(seedSpecId, target);
        rcpComplexCacheRef.current.set(key, complex);
      }
      return complex;
    };

    const disposeRcpCoordOverlay = (nodeId: string) => {
      const group = rcpCoordGroupRef.current.get(nodeId);
      if (!group) return;
      group.parent?.remove(group);
      group.traverse((child) => {
        if (child instanceof THREE.Mesh || child instanceof THREE.LineSegments) {
          child.geometry.dispose();
          const material = child.material;
          if (Array.isArray(material)) material.forEach((m) => m.dispose());
          else material.dispose();
        }
      });
      rcpCoordGroupRef.current.delete(nodeId);
    };

    /**
     * Rebuilds `nodeId`'s own "show coordinates" overlay from scratch
     * (cheap -- markers/lines only, no real geometry) against whichever
     * cells are actually built right now. A no-op if that root isn't
     * currently toggled visible. Called after every RCP-C2B mutation
     * (build/remove a cell or shell, a root mesh swap) rather than
     * trying to patch the previous overlay incrementally -- simpler, and
     * this never needs to be fast. Deliberately independent of the
     * 3D/4D toggle: coordPoint3D is a property of the underlying 4D
     * generation math, not of which rendered form shell 1 currently
     * uses, so the overlay looks identical in both views by construction
     * (the direct "3D and 4D views ok" requirement, satisfied by not
     * needing to do anything special for either).
     */
    const rebuildRcpCoordOverlay = (nodeId: string) => {
      disposeRcpCoordOverlay(nodeId);
      if (!rcpCoordVisibleRef.current.has(nodeId)) return;
      const node = graphRef.current.nodes.find((n) => n.id === nodeId);
      const placed = findPlaced(nodeId);
      if (!node?.rcpPolytope || !placed) return;
      const { seedSpecId, target } = node.rcpPolytope;
      const complex = getRcpComplex(seedSpecId, target);
      const builtCellIds = new Set(
        graphRef.current.connections.filter((c) => !c.orphaned && c.kind === 'rcp4d' && c.nodeA === nodeId).map((c) => c.cellId!),
      );
      builtCellIds.add(0); // the root/seed itself is always "built"

      // X-ray-style: this is a diagnostic overlay, not real geometry --
      // it should read THROUGH the (often opaque, Solid-mode) cells it's
      // annotating rather than being hidden behind their faces, which is
      // what plain depth-tested materials did (real bug found live: the
      // whole overlay was invisible, occluded by the very shape it was
      // meant to explain). depthTest:false always draws it on top;
      // renderOrder just needs to be higher than the shapes' own default
      // (0) so it isn't fought over within the same pass.
      const group = new THREE.Group();
      group.renderOrder = 10;
      const pointGeom = new THREE.SphereGeometry(0.035, 8, 8);
      const coordMat = new THREE.MeshBasicMaterial({ color: RCP_COORD_POINT_COLOR, depthTest: false, transparent: true });
      const dualMat = new THREE.MeshBasicMaterial({ color: RCP_DUAL_POINT_COLOR, depthTest: false, transparent: true });
      const lineMat = new THREE.LineBasicMaterial({ color: RCP_COORD_POINT_COLOR, depthTest: false, transparent: true });
      const origin = new THREE.Vector3(0, 0, 0);

      for (const cell of complex.cells) {
        if (!builtCellIds.has(cell.id)) continue;
        const marker = new THREE.Mesh(pointGeom, coordMat);
        marker.position.set(...cell.coordPoint3D);
        marker.renderOrder = 10;
        group.add(marker);

        const lineGeom = new THREE.BufferGeometry().setFromPoints([origin, new THREE.Vector3(...cell.coordPoint3D)]);
        const line = new THREE.LineSegments(lineGeom, lineMat);
        line.renderOrder = 10;
        group.add(line);

        if (target === '600-cell') {
          for (const v of cell.vertices3D) {
            const dualMarker = new THREE.Mesh(pointGeom, dualMat);
            dualMarker.position.set(...v);
            dualMarker.renderOrder = 10;
            group.add(dualMarker);
          }
        }
      }

      placed.object.add(group);
      rcpCoordGroupRef.current.set(nodeId, group);
    };

    const setRcpCoordinatesVisible = (visible: boolean) => {
      const placed = selectedNodeRef.current;
      if (!placed) return;
      const { nodeId } = placed.object.userData as ShapeObjectUserData;
      if (visible) rcpCoordVisibleRef.current.add(nodeId);
      else rcpCoordVisibleRef.current.delete(nodeId);
      rebuildRcpCoordOverlay(nodeId);
      publishNodeSelection(placed);
    };

    /**
     * RCP-C2B's shell-1 "3D view" placement: the REAL ordinary flush
     * self-attach ShapeViewer.tsx's own beginFaceAttach already computes
     * for any attach (rotation-only -- no mirror/reflection anywhere in
     * this app's real attach mechanic), specialized to a SELF-attach
     * (spec attached to itself at `targetFaceIndex`) against the root's
     * OWN world pose. Takes `rootWorldMatrix` directly (not a live
     * `PlacedShape`) so it can be called during `loadAssembly` too,
     * before every node is necessarily already a placed live object --
     * a live root's `.object.matrixWorld` and a freshly-composed
     * `Matrix4` from its own stored `transform.position/quaternion` are
     * equally valid inputs. Correct to use the root's own matrix
     * directly (never `foldGroup.matrixWorld`) because an RCP-C2B root
     * never has an incoming fold4 connection (fold4 and rcp4d are
     * mutually exclusive connection kinds), so `foldGroup`'s own local
     * matrix is always identity for it.
     */
    const computeSelfAttachTransform = (rootWorldMatrix: THREE.Matrix4, spec: PolyhedronSpec, targetFaceIndex: number): { position: THREE.Vector3; quaternion: THREE.Quaternion } | null => {
      const targetFace = spec.faces[targetFaceIndex];
      // Same congruent-face search beginFaceAttach itself does for a
      // same-shape self-attach -- the FIRST congruent (here: same-size,
      // eligible) face in array order, exactly what a fresh "Attach via
      // face" would default to before any registration cycling.
      const incomingFaceIndex = spec.faces.findIndex(
        (f, fi) => isFaceEligibleForAttach(spec, fi) && facesCongruent(spec.vertices, targetFace, spec.vertices, f),
      );
      if (incomingFaceIndex === -1) return null;

      const faceConnectors = buildFaceConnectors(spec);
      const targetFaceConnector = faceConnectors[targetFaceIndex];
      const incomingFaceConnector = faceConnectors[incomingFaceIndex];

      const targetWorldPos = new THREE.Vector3(...targetFaceConnector.pos).applyMatrix4(rootWorldMatrix);
      const targetWorldQuat = new THREE.Quaternion().setFromRotationMatrix(rootWorldMatrix);
      const targetWorldNormal = new THREE.Vector3(...targetFaceConnector.normal).applyQuaternion(targetWorldQuat).normalize();

      const Cg = new THREE.Vector3(...incomingFaceConnector.pos);
      const Ng = new THREE.Vector3(...incomingFaceConnector.normal);
      const desiredWorldDir = targetWorldNormal.clone().negate();
      const baseQuat = new THREE.Quaternion().setFromUnitVectors(Ng, desiredWorldDir);

      const targetFaceVertexIndices = spec.faces[targetFaceIndex];
      const targetV0World = new THREE.Vector3(...spec.vertices[targetFaceVertexIndices[0]]).applyMatrix4(rootWorldMatrix);
      const dTargetWorld = targetV0World.clone().sub(targetWorldPos).normalize();
      const dTargetLocal = dTargetWorld.clone().applyQuaternion(baseQuat.clone().invert());

      const incomingFaceVertexIndices = spec.faces[incomingFaceIndex];
      const incomingV0 = new THREE.Vector3(...spec.vertices[incomingFaceVertexIndices[0]]);
      const dIncomingLocal = incomingV0.clone().sub(Cg).normalize();

      const u = dIncomingLocal.clone();
      const w = new THREE.Vector3().crossVectors(Ng, u).normalize();
      const theta = Math.atan2(dTargetLocal.dot(w), dTargetLocal.dot(u));

      const registrationBaseQuat = baseQuat.clone().multiply(new THREE.Quaternion().setFromAxisAngle(Ng, theta));
      const rotatedCg = Cg.clone().applyQuaternion(registrationBaseQuat);
      const position = targetWorldPos.clone().sub(rotatedCg);
      return { position, quaternion: registrationBaseQuat };
    };

    /**
     * The one real placement decision for a shell-1 cell -- shared by
     * buildNextRcpCell (first build), setRcpView3D (switching an
     * already-built cell's view), and loadAssembly (re-deriving on load)
     * so all three agree exactly. `view3D=false` (the default) returns
     * the same kind of geometry shell 2+ already uses: a SYNTHETIC,
     * non-registry spec whose vertices are this cell's own real
     * `projectVec4ToVec3`-projected position, placed at the root's own
     * position/quaternion unchanged (the synthetic vertices already
     * encode the cell's full position in the root's own local frame).
     * `view3D=true` returns the ordinary REGISTRY spec (undistorted),
     * positioned via `computeSelfAttachTransform` against the root's own
     * current world matrix -- a real, ordinary flush self-attach,
     * identical in kind to what any other face-attach in this app
     * produces. `null` if the cell/face data doesn't resolve (shouldn't
     * happen for a real, already-verified closure).
     */
    const deriveShell1Cell = (
      seedSpecId: string,
      target: string,
      cellId: number,
      faceIndex: number,
      view3D: boolean,
      rootWorldMatrix: THREE.Matrix4,
      rootPosition: THREE.Vector3,
      rootQuaternion: THREE.Quaternion,
    ): { spec: PolyhedronSpec; position: THREE.Vector3; quaternion: THREE.Quaternion } | null => {
      const complex = getRcpComplex(seedSpecId, target);
      if (view3D) {
        // "3D" is always the real, ordinary, perfectly regular registry
        // seed self-attach -- for every closure including the 600-cell
        // (whose own true tetrahedra are honestly slightly non-regular,
        // and whose 4 faces are therefore NOT all mutually congruent, so
        // self-attaching that shape onto itself would silently fail for
        // some faces). "3D" and "4D" stay fully self-consistent within
        // themselves (3D: real seed root + real seed self-attach; 4D:
        // effectiveSeedSpec root + this complex's own cell data) rather
        // than mixing the two.
        const registrySpec = POLYHEDRA[cellShapeIdFor(seedSpecId, target)];
        const transform = computeSelfAttachTransform(rootWorldMatrix, registrySpec, faceIndex);
        if (!transform) return null;
        return { spec: registrySpec, position: transform.position, quaternion: transform.quaternion };
      }
      const cell = complex.cells.find((c) => c.id === cellId);
      if (!cell) return null;
      const cellSpec = POLYHEDRA[cellShapeIdFor(seedSpecId, target)];
      // buildRcpComplex's own vertices3D are already rescaled (once, for
      // the whole complex) so cell 0 exactly matches the real registry
      // seed -- see its own doc comment. No per-cell adjustment needed
      // here: every cell, including this one, is already correctly
      // registered against the ACTUAL rendered root's real scale/frame.
      const syntheticSpec = buildSyntheticCellSpec(cellSpec, cell.id, cell.vertices3D);
      return { spec: syntheticSpec, position: rootPosition.clone(), quaternion: rootQuaternion.clone() };
    };

    /** The registry id an rcp4d child's own `node.shape` (and, for shell-1, its own placed geometry) must use -- matches assembly.ts's isValidAssembly exactly: always 'D4' for the 600-cell (its cells are tetrahedra regardless of which D4-congruent seed built it), the root's own seedSpecId otherwise. */
    const cellShapeIdFor = (seedSpecId: string, target: string): string => (target === '600-cell' ? 'D4' : seedSpecId);

    /**
     * The 600-cell's own root is the ONE case where the root's own mesh
     * is toggleable at all (every other closure's root always stays the
     * plain, real registry shape, since its own cell 0 already exactly
     * equals it -- see effectiveSeedSpec's own doc comment for why the
     * 600-cell has nothing real to match instead). No-op for every other
     * target. Mirrors setRcpView3D's own mesh-swap pattern, applied to
     * the root instead of a shell-1 child.
     */
    const applyRootMeshForView = (nodeId: string, seedSpecId: string, target: string, view3D: boolean) => {
      if (target !== '600-cell') return;
      const oldPlaced = findPlaced(nodeId);
      const node = graphRef.current.nodes.find((n) => n.id === nodeId);
      if (!oldPlaced || !node) return;
      const complex = getRcpComplex(seedSpecId, target);
      const spec = view3D ? POLYHEDRA[cellShapeIdFor(seedSpecId, target)] : effectiveSeedSpec(complex);

      const oldPosition = oldPlaced.object.position.clone();
      const oldQuaternion = oldPlaced.object.quaternion.clone();
      scene.remove(oldPlaced.object);
      disposePlacedShape(oldPlaced);
      const replacement = buildPlacedShape(spec, nodeId);
      replacement.object.position.copy(oldPosition);
      replacement.object.quaternion.copy(oldQuaternion);
      applyViewModeToPlaced(replacement, viewModeRef.current);
      applyRcpSeedColor(replacement);
      scene.add(replacement.object);

      const index = placedRef.current.indexOf(oldPlaced);
      if (index !== -1) placedRef.current[index] = replacement;
      else placedRef.current.push(replacement);
      if (selectedNodeRef.current === oldPlaced) selectedNodeRef.current = replacement;
      if (hoveredRef.current && (hoveredRef.current.parent as THREE.Group | null)?.parent === oldPlaced.object) {
        hoveredRef.current = null;
      }
      if (selectedRef.current && (selectedRef.current.parent as THREE.Group | null)?.parent === oldPlaced.object) {
        selectedRef.current = null;
      }

      node.transform = {
        position: replacement.object.position.toArray() as [number, number, number],
        quaternion: replacement.object.quaternion.toArray() as [number, number, number, number],
      };
      // The old overlay group (if any) was just disposed along with
      // oldPlaced.object -- rebuild it under the new one so rcpCoordGroupRef
      // doesn't keep pointing at a disposed group, and so it doesn't just vanish.
      rebuildRcpCoordOverlay(nodeId);
    };

    const beginRcpBuild = (seedSpecId: string, target: string) => {
      const placed = selectedNodeRef.current;
      if (!placed || pendingRef.current) return;
      const { specId, nodeId } = placed.object.userData as ShapeObjectUserData;
      if (specId !== seedSpecId) return; // caller must pass the actually-selected node's own shape
      if (findParentConnection(graphRef.current.connections, nodeId)) return; // must be a real, unattached root
      const key = resolveParamsKey(POLYHEDRA[specId]);
      if (!key) return;
      const isRealClosure = target === '600-cell' ? key === 'D4' : (FOUR_D_SHAPE_PARAMS[key]?.some((o) => o.name === target) ?? false);
      if (!isRealClosure) return;

      const node = graphRef.current.nodes.find((n) => n.id === nodeId);
      if (!node) return;
      node.rcpPolytope = { seedSpecId: specId, target, view3D: true };
      // 3D is the default view (direct user feedback: 4D's warped cells
      // are harder to read as a starting point than the ordinary flush
      // fan-out; 4D stays one click away throughout) -- for the 600-cell
      // specifically, "3D" is a no-op here since its root already IS the
      // plain registry shape at this point (applyRootMeshForView only
      // swaps the root's mesh in "4D"). Re-read selectedNodeRef afterward
      // since the swap may have replaced `placed` itself.
      applyRootMeshForView(nodeId, specId, target, true);
      const currentRoot = selectedNodeRef.current ?? placed;
      applyRcpSeedColor(currentRoot);
      publishNodeSelection(currentRoot);
    };

    const buildNextRcpCell = () => {
      const placed = selectedNodeRef.current;
      if (!placed || pendingRef.current) return;
      const { nodeId } = placed.object.userData as ShapeObjectUserData;
      const node = graphRef.current.nodes.find((n) => n.id === nodeId);
      if (!node?.rcpPolytope) return;
      const { seedSpecId, target, view3D } = node.rcpPolytope;
      const spec = POLYHEDRA[seedSpecId];
      const shell1Conns = graphRef.current.connections.filter((c) => !c.orphaned && c.kind === 'rcp4d' && c.nodeA === nodeId && c.shell === 1);
      const builtCount = shell1Conns.length;
      if (builtCount >= spec.faces.length) return; // shell 1 already complete

      const complex = getRcpComplex(seedSpecId, target);
      const shell1Cells = cellsAtShell(complex, 1).slice().sort((a, b) => a.id - b.id);
      const cellId = shell1Cells[builtCount]?.id;
      if (cellId === undefined) return; // shouldn't happen -- shell1Cells.length should equal spec.faces.length

      scene.updateMatrixWorld(true);
      const derived = deriveShell1Cell(seedSpecId, target, cellId, builtCount, view3D === true, placed.object.matrixWorld, placed.object.position, placed.object.quaternion);
      if (!derived) return;

      const childNodeId = crypto.randomUUID();
      const childPlaced = buildPlacedShape(derived.spec, childNodeId);
      childPlaced.object.position.copy(derived.position);
      childPlaced.object.quaternion.copy(derived.quaternion);
      scene.add(childPlaced.object);
      applyNodeAppearance(childPlaced, false);
      placedRef.current.push(childPlaced);

      graphRef.current.nodes.push({
        id: childNodeId,
        shape: cellShapeIdFor(seedSpecId, target),
        transform: {
          position: childPlaced.object.position.toArray() as [number, number, number],
          quaternion: childPlaced.object.quaternion.toArray() as [number, number, number, number],
        },
      });
      graphRef.current.connections.push({
        nodeA: nodeId,
        nodeB: childNodeId,
        vertexA: 0,
        vertexB: 0,
        kind: 'rcp4d',
        cellId,
        shell: 1,
      });
      // Applied AFTER the connection is registered -- rcpShellOf (which
      // applyViewModeToPlaced reads) resolves this cell's own shell from
      // the graph, not a parameter, so the connection must already exist.
      applyViewModeToPlaced(childPlaced, viewModeRef.current);
      rebuildRcpCoordOverlay(nodeId);

      reportCageStatus();
      publishNodeSelection(placed);
    };

    /**
     * Undoes the single most-recently-added shell-1 cell (the one built by
     * the last `buildNextRcpCell` call, identified as the built shell-1
     * connection with the highest `cellId` -- shell 1 is always built in
     * increasing cellId order, so this is exactly the last one added).
     * Shell-1 only, matching `buildNextRcpCell`'s own one-at-a-time scope;
     * shell 2+ is undone a whole shell at a time via `removeLastRcpShell`.
     */
    const removeLastRcpCell = () => {
      const placed = selectedNodeRef.current;
      if (!placed || pendingRef.current) return;
      const { nodeId } = placed.object.userData as ShapeObjectUserData;
      const node = graphRef.current.nodes.find((n) => n.id === nodeId);
      if (!node?.rcpPolytope) return;
      const shell1Conns = graphRef.current.connections.filter((c) => !c.orphaned && c.kind === 'rcp4d' && c.nodeA === nodeId && c.shell === 1);
      if (shell1Conns.length === 0) return;
      const last = shell1Conns.reduce((a, b) => (b.cellId! > a.cellId! ? b : a));
      deleteNodeById(last.nodeB);

      // deleteNodeById clears selection as part of its own per-node
      // cleanup -- re-select the root, matching removeLastRcpShell's own
      // "stay on the root" UX.
      selectedNodeRef.current = placed;
      selectedFaceIndexRef.current = null;
      applyNodeAppearance(placed, true);
      rebuildRcpCoordOverlay(nodeId);
      publishNodeSelection(placed);
    };

    const buildNextRcpShell = () => {
      let placed = selectedNodeRef.current;
      if (!placed || pendingRef.current) return;
      const { nodeId } = placed.object.userData as ShapeObjectUserData;
      const node = graphRef.current.nodes.find((n) => n.id === nodeId);
      if (!node?.rcpPolytope) return;
      const { seedSpecId, target } = node.rcpPolytope;
      const spec = POLYHEDRA[seedSpecId];
      const complex = getRcpComplex(seedSpecId, target);

      const rootConns = graphRef.current.connections.filter((c) => !c.orphaned && c.kind === 'rcp4d' && c.nodeA === nodeId);
      const shell1Count = rootConns.filter((c) => c.shell === 1).length;
      if (shell1Count < spec.faces.length) return; // shell 1 must be complete first

      // Shell 2+ cells' own vertices are baked once against shell 1's real
      // "4D" (warped/projected) position -- built while shell 1 sits in
      // "3D" (the ordinary flush self-attach, a genuinely different
      // position), they'd be anchored to a shell-1 layout that no longer
      // exists, floating disconnected from it (real bug found live: "the
      // dodecahedron generates wrong artifacts... in later cycles"). Force
      // shell 1 back to "4D" first so shell 2 is always built against the
      // one position it can actually stay consistent with; the toggle
      // itself becomes unavailable once shell 2+ exists (see
      // publishNodeSelection's own viewToggleAvailable comment) so this is
      // the only place that still needs to force it.
      if (node.rcpPolytope.view3D === true) {
        setRcpView3D(false);
        placed = findPlaced(nodeId)!;
      }

      const builtCellIds = new Set(rootConns.map((c) => c.cellId!));
      const currentMax = Math.max(0, ...rootConns.map((c) => c.shell!));
      const nextShell = currentMax + 1;
      const targetCells = cellsAtShell(complex, nextShell).filter((c) => !builtCellIds.has(c.id));
      if (targetCells.length === 0) return; // nothing left at the next shell (already fully closed)

      const childShapeId = cellShapeIdFor(seedSpecId, target);
      for (const cell of targetCells) {
        const syntheticSpec = buildSyntheticCellSpec(spec, cell.id, cell.vertices3D);
        const childNodeId = crypto.randomUUID();
        const childPlaced = buildPlacedShape(syntheticSpec, childNodeId);
        // Shell-2+ cells' own vertices already encode their full warped
        // position relative to the root's own local frame (buildRcpComplex's
        // shared perspective projection) -- the node's OWN transform is
        // therefore exactly the root's own, carried along unchanged
        // (matching loadAssembly's own rcp4d re-derivation, which relies
        // on this same "root's transform + synthetic vertices" split).
        childPlaced.object.position.copy(placed.object.position);
        childPlaced.object.quaternion.copy(placed.object.quaternion);
        scene.add(childPlaced.object);
        applyNodeAppearance(childPlaced, false);
        placedRef.current.push(childPlaced);

        graphRef.current.nodes.push({
          id: childNodeId,
          shape: childShapeId,
          transform: {
            position: childPlaced.object.position.toArray() as [number, number, number],
            quaternion: childPlaced.object.quaternion.toArray() as [number, number, number, number],
          },
        });
        graphRef.current.connections.push({
          nodeA: nodeId,
          nodeB: childNodeId,
          vertexA: 0,
          vertexB: 0,
          kind: 'rcp4d',
          cellId: cell.id,
          shell: nextShell,
        });
        // After the connection is registered -- see buildNextRcpCell's own comment.
        applyViewModeToPlaced(childPlaced, viewModeRef.current);
      }
      rebuildRcpCoordOverlay(nodeId);

      reportCageStatus();
      publishNodeSelection(placed);
    };

    const removeLastRcpShell = () => {
      const placed = selectedNodeRef.current;
      if (!placed || pendingRef.current) return;
      const { nodeId } = placed.object.userData as ShapeObjectUserData;
      const node = graphRef.current.nodes.find((n) => n.id === nodeId);
      if (!node?.rcpPolytope) return;
      const conns = graphRef.current.connections.filter((c) => !c.orphaned && c.kind === 'rcp4d' && c.nodeA === nodeId);
      if (conns.length === 0) return;
      const currentMax = Math.max(...conns.map((c) => c.shell!));
      // Shell 1 is built/removed one cell at a time via buildNextRcpCell
      // only -- "Remove last shell" only ever targets shell 2+, matching
      // the plan's own UI gating (the batch buttons only appear once
      // shell 1 is complete).
      if (currentMax <= 1) return;
      const toRemove = conns.filter((c) => c.shell === currentMax).map((c) => c.nodeB);
      for (const id of toRemove) deleteNodeById(id);

      // deleteNodeById clears selection as part of its own per-node
      // cleanup -- re-select the root so the panel doesn't just vanish
      // after removing a shell (matches this function's own "stay on
      // the root, keep building/removing" UX, same as buildNextRcpShell).
      selectedNodeRef.current = placed;
      selectedFaceIndexRef.current = null;
      applyNodeAppearance(placed, true);
      rebuildRcpCoordOverlay(nodeId);
      publishNodeSelection(placed);
    };

    /**
     * Switches EVERY currently-built shell-1 cell of the selected RCP-C2B
     * root between its ordinary flush ("3D") position and its real
     * projected ("4D", the default) position -- a full mesh swap per cell
     * (dispose the old geometry, build the new one via deriveShell1Cell,
     * same in-place-replacement pattern rewriteSelectedNode already uses
     * for an ordinary shape swap), not a position-only tweak, since the
     * two views use genuinely different specs (the ordinary registry
     * shape vs. a synthetic warped one). Persists `view3D` on the root so
     * the choice survives save/reload (loadAssembly re-derives every
     * shell-1 child's geometry from this same flag via deriveShell1Cell).
     */
    const setRcpView3D = (view3D: boolean) => {
      const rootPlaced = selectedNodeRef.current;
      if (!rootPlaced) return;
      const { nodeId: rootId } = rootPlaced.object.userData as ShapeObjectUserData;
      const rootNode = graphRef.current.nodes.find((n) => n.id === rootId);
      if (!rootNode?.rcpPolytope) return;
      const { seedSpecId, target } = rootNode.rcpPolytope;
      const rootConns = graphRef.current.connections.filter((c) => !c.orphaned && c.kind === 'rcp4d' && c.nodeA === rootId);
      const shell1Conns = rootConns.filter((c) => c.shell === 1);
      if (shell1Conns.length === 0) return;
      // Locked once shell 2+ exists (viewToggleLocked's own doc comment)
      // -- defense in depth alongside the UI's own disabled buttons,
      // EXCEPT for buildNextRcpShell's own internal forced switch, which
      // always runs before shell 2 is added (so maxBuiltShell is still
      // <=1 at that call site) and therefore isn't blocked by this.
      const maxBuiltShell = Math.max(0, ...rootConns.map((c) => c.shell!));
      if (maxBuiltShell > 1) return;

      const complex = getRcpComplex(seedSpecId, target);
      const shell1Cells = cellsAtShell(complex, 1).slice().sort((a, b) => a.id - b.id);

      rootNode.rcpPolytope.view3D = view3D;
      // Root mesh swap (600-cell only -- a no-op for every other closure)
      // happens FIRST: it disposes/replaces the root's own placed object,
      // so `rootPlaced` above is stale afterward -- re-fetch the current
      // one before reading its matrixWorld/position/quaternion below.
      applyRootMeshForView(rootId, seedSpecId, target, view3D);
      const currentRootPlaced = findPlaced(rootId)!;
      scene.updateMatrixWorld(true);

      for (const conn of shell1Conns) {
        const oldPlaced = findPlaced(conn.nodeB);
        const childNode = graphRef.current.nodes.find((n) => n.id === conn.nodeB);
        if (!oldPlaced || !childNode || conn.cellId === undefined) continue;
        const faceIndex = shell1Cells.findIndex((c) => c.id === conn.cellId);
        if (faceIndex === -1) continue;

        const derived = deriveShell1Cell(seedSpecId, target, conn.cellId, faceIndex, view3D, currentRootPlaced.object.matrixWorld, currentRootPlaced.object.position, currentRootPlaced.object.quaternion);
        if (!derived) continue;

        scene.remove(oldPlaced.object);
        disposePlacedShape(oldPlaced);
        const replacement = buildPlacedShape(derived.spec, conn.nodeB);
        replacement.object.position.copy(derived.position);
        replacement.object.quaternion.copy(derived.quaternion);
        applyViewModeToPlaced(replacement, viewModeRef.current);
        scene.add(replacement.object);

        const index = placedRef.current.indexOf(oldPlaced);
        if (index !== -1) placedRef.current[index] = replacement;
        else placedRef.current.push(replacement);

        // The selected node throughout this whole operation is always the
        // ROOT, never one of its shell-1 children -- unlike
        // rewriteSelectedNode's own swap (which replaces the SELECTED
        // node itself), so selectedNodeRef never needs reassigning here.
        if (hoveredRef.current && (hoveredRef.current.parent as THREE.Group | null)?.parent === oldPlaced.object) {
          hoveredRef.current = null;
        }
        if (selectedRef.current && (selectedRef.current.parent as THREE.Group | null)?.parent === oldPlaced.object) {
          selectedRef.current = null;
        }

        childNode.shape = cellShapeIdFor(seedSpecId, target); // unchanged in practice, kept explicit for clarity
        childNode.transform = {
          position: replacement.object.position.toArray() as [number, number, number],
          quaternion: replacement.object.quaternion.toArray() as [number, number, number, number],
        };
      }

      scene.updateMatrixWorld(true);
      publishNodeSelection(findPlaced(rootId) ?? rootPlaced);
    };

    /**
     * Recomputes and republishes the full NodeSelection for `placed`
     * (must be the CURRENT selectedNodeRef.current) -- shared by the
     * click handler below (previously duplicated inline).
     */
    const publishNodeSelection = (placed: PlacedShape) => {
      const { specId: meshSpecId, nodeId } = placed.object.userData as ShapeObjectUserData;
      const node = graphRef.current.nodes.find((n) => n.id === nodeId);
      // A synthetic RCP-C2B cell mesh's own `userData.specId` is a non-registry
      // id (e.g. 'D4::rcp:0', from buildSyntheticCellSpec/effectiveSeedSpec
      // -- see their own doc comments), never a valid POLYHEDRA key. Every
      // registry lookup below (face/vertex topology, eligibility, name
      // display) must use the node's own real, always-registry `shape`
      // field instead -- identical to `meshSpecId` for every ordinary node,
      // and exactly the real seed id (e.g. 'D4') for an RCP-C2B root/child,
      // whose topology (faces/edges) is copied unchanged from that real
      // seed regardless of its own warped vertex positions.
      const specId = node?.shape ?? meshSpecId;
      const faceIndex = selectedFaceIndexRef.current;
      const faceSize = faceIndex !== null ? POLYHEDRA[specId].faces[faceIndex].length : null;
      const faceOccupied = faceIndex !== null ? placed.faceOccupied[faceIndex] : true;
      // Vertex count alone isn't enough once irregular-faced families exist
      // (Catalan solids): a rhombus and a kite can both have 4 vertices
      // without being the same shape at all, so gluing one onto the other
      // wouldn't sit flush. facesCongruent checks the real edge-length +
      // angle sequence — reduces to plain vertex-count matching for every
      // regular-faced shape already in this registry (any two same-size
      // faces there already ARE the same regular polygon), so this changes
      // nothing for existing families and only starts mattering once
      // irregular ones are selectable. See docs/catalan-solids-spec.md.
      const targetFace = faceIndex !== null ? POLYHEDRA[specId].faces[faceIndex] : null;
      const targetVertices = POLYHEDRA[specId].vertices;
      // Miscellaneous-family eligibility policy (direct user instruction,
      // scoped to this one family so Catalan solids' own irregular
      // rhombi/kite faces keep face-attaching exactly as already shipped):
      // a graded pyramid's pointed (non-regular lateral) face is never a
      // valid attach surface at all, on either side of the connection —
      // "so pointed pyramids don't stick to each other." RVCMG connector
      // pieces use a different, more precise rule (isFaceEligibleForAttach
      // below): exactly their two real ports, regardless of regularity.
      const targetFaceEligible = faceIndex !== null && targetFace !== null && isFaceEligibleForAttach(POLYHEDRA[specId], faceIndex);
      const faceAttachOptions =
        faceIndex !== null && targetFaceEligible && targetFace !== null && !faceOccupied
          ? POLYHEDRON_IDS.filter((id) =>
              POLYHEDRA[id].faces.some(
                (f, fi) => isFaceEligibleForAttach(POLYHEDRA[id], fi) && facesCongruent(targetVertices, targetFace, POLYHEDRA[id].vertices, f),
              ),
            )
          : [];
      const faceFold4Eligible = faceIndex !== null && !faceOccupied && FOURD_CAPABLE_IDS.includes(specId);
      const faceDuoprismEligible = faceFold4Eligible;

      // RCP-C2B eligibility: this NODE (regardless of which face
      // happens to also be hover/click-selected -- RCP-C2B operates on
      // the whole node, same as Delete's own real, unconditional
      // behavior, not gated on faceIndex) is a real, unattached root
      // whose shape resolves (by congruence, not just id -- covers
      // PYRAMID_TRI_G2 resolving to D4's own closures) to a real
      // verified 4D closure. See NodeSelection.rcpBuildEligible's own
      // doc comment.
      const rcpParamsKey = resolveParamsKey(POLYHEDRA[specId]);
      const hasNoIncoming = !findParentConnection(graphRef.current.connections, nodeId);
      // 600-cell re-enabled (2026-09-16, second fix): its own cell 0 is
      // genuinely, unavoidably non-regular under this projection (the
      // 120-cell's own vertex-transitivity means no cell is any less
      // distorted than any other -- confirmed directly), so it's no
      // longer forced to fake-match the real registry seed. Instead its
      // root uses cell 0's own real, self-consistent geometry in "4D"
      // (effectiveSeedSpec), keeping the whole complex's real shared-face
      // coincidences intact -- see effectiveSeedSpec's own doc comment.
      const rcpClosureOptions = rcpParamsKey ? [...(FOUR_D_SHAPE_PARAMS[rcpParamsKey] ?? []).map((o) => o.name), ...(rcpParamsKey === 'D4' ? ['600-cell'] : [])] : [];
      const rcpBuildEligible = hasNoIncoming && rcpClosureOptions.length > 0;

      let rcpRoot: NodeSelection['rcpRoot'] = null;
      if (node?.rcpPolytope) {
        const { seedSpecId, target } = node.rcpPolytope;
        const seedSpec = POLYHEDRA[seedSpecId];
        const complex = getRcpComplex(seedSpecId, target);
        const rootConns = graphRef.current.connections.filter((c) => !c.orphaned && c.kind === 'rcp4d' && c.nodeA === nodeId);
        const shell1Size = seedSpec.faces.length;
        const shell1BuiltCount = rootConns.filter((c) => c.shell === 1).length;
        const maxBuiltShell = rootConns.length > 0 ? Math.max(...rootConns.map((c) => c.shell!)) : 0;
        rcpRoot = {
          seedSpecId,
          target,
          shell1Complete: shell1BuiltCount >= shell1Size,
          shell1Size,
          builtCount: rootConns.length,
          totalCells: complex.cells.length,
          maxBuiltShell,
          complexMaxShell: maxShell(complex),
          viewToggleAvailable: shell1BuiltCount > 0,
          viewToggleLocked: maxBuiltShell > 1,
          view3D: node.rcpPolytope.view3D === true,
          coordinatesVisible: rcpCoordVisibleRef.current.has(nodeId),
        };
      }

      onNodeSelectionChangeRef.current?.({
        nodeId,
        specId,
        rewriteTarget: REWRITE_TARGET[specId] ?? null,
        faceIndex,
        faceSize,
        faceOccupied,
        faceAttachOptions,
        faceFold4Eligible,
        faceDuoprismEligible,
        rcpBuildEligible,
        rcpClosureOptions,
        rcpRoot,
      });
    };

    const cancelAttach = () => {
      const pending = pendingRef.current;
      if (!pending) return;

      // A duoprism pending attach reusing an EXISTING far copy (see
      // beginDuoprismAttach) must NOT remove/dispose `pending.placed` --
      // that node already existed before this pending attach began.
      const shouldRemovePlaced = pending.kind !== 'duoprism' || pending.isNewNode;
      if (shouldRemovePlaced) {
        scene.remove(pending.placed.object);
        disposePlacedShape(pending.placed);
      } else {
        pending.placed.faceOccupied[pending.targetFaceIndex] = false;
      }

      if (pending.kind === 'vertex') {
        const targetData = pending.targetSphere.userData as VertexUserData;
        targetData.occupied = false;
        paintVertex(pending.targetSphere, {});
        const parentPlaced = placedOwningVertexSphere(pending.targetSphere);
        if (parentPlaced) applyNodeAppearance(parentPlaced, parentPlaced === selectedNodeRef.current);
      } else {
        pending.targetPlaced.faceOccupied[pending.targetFaceIndex] = false;
        applyNodeAppearance(pending.targetPlaced, pending.targetPlaced === selectedNodeRef.current);
        if (pending.kind === 'duoprism') {
          scene.remove(pending.wallMesh);
          pending.wallMesh.geometry.dispose();
          (pending.wallMesh.material as THREE.Material).dispose();
        }
      }

      pendingRef.current = null;
      controls.enabled = true;
      label.style.display = 'none';
      onPendingChangeRef.current?.(null);
    };

    const resetScene = () => {
      cancelAttach();
      for (const placed of placedRef.current) {
        scene.remove(placed.object);
        disposePlacedShape(placed);
      }
      placedRef.current = [];
      for (const mesh of duoprismMeshesRef.current.values()) {
        scene.remove(mesh);
        mesh.geometry.dispose();
        (mesh.material as THREE.Material).dispose();
      }
      duoprismMeshesRef.current.clear();
      rcpCoordVisibleRef.current.clear();
      rcpCoordGroupRef.current.clear();
      graphRef.current = emptyAssembly();
      hoveredRef.current = null;
      selectedRef.current = null;
      hoveredNodeRef.current = null;
      selectedNodeRef.current = null;
      hoveredFaceIndexRef.current = null;
      selectedFaceIndexRef.current = null;
      label.style.display = 'none';
      if (lastAddedNodeIdRef.current !== null) {
        lastAddedNodeIdRef.current = null;
        onCanUndoChangeRef.current?.(false);
      }
      if (hasFoldConnectionsRef.current) {
        hasFoldConnectionsRef.current = false;
        foldAmountRef.current = 0;
        onFoldConnectionsChangeRef.current?.(false);
      }
    };

    const placeRoot = (specId: string) => {
      resetScene();
      const spec = POLYHEDRA[specId];
      if (!spec) return;
      const nodeId = crypto.randomUUID();
      const placed = buildPlacedShape(spec, nodeId);
      applyNodeAppearance(placed, false);
      applyViewModeToPlaced(placed, viewModeRef.current);
      scene.add(placed.object);
      placedRef.current.push(placed);
      graphRef.current = {
        nodes: [
          {
            id: nodeId,
            shape: specId,
            transform: {
              position: placed.object.position.toArray() as [number, number, number],
              quaternion: placed.object.quaternion.toArray() as [number, number, number, number],
            },
          },
        ],
        connections: [],
      };
      onSelectionChangeRef.current?.(null);
      reportCageStatus();
    };

    /** Rebuilds the scene from a previously saved graph — used on load, not on user actions. */
    const loadAssembly = (assembly: Assembly) => {
      resetScene();
      const byNodeId = new Map<string, PlacedShape>();
      const nodeById = new Map(assembly.nodes.map((n) => [n.id, n]));
      // rcp4d children need their own geometry re-derived from the root's
      // rcpPolytope + this connection's own cellId, never the plain
      // registry shape their `shape` field names (see
      // AssemblyNode.rcpPolytope's own doc comment: "fully re-derive
      // geometry from rcpPolytope+cellId on load"). Shell 2+ always uses
      // the real warped/projected geometry; shell-1 cells use it too
      // UNLESS the root's own `view3D` is set, in which case they fall
      // through to an ordinary self-attach instead (deriveShell1Cell
      // handles both cases identically to the live-build/toggle paths).
      // Indexed by child node id before the placement loop below, since
      // connections are otherwise only processed AFTER every node is
      // already placed.
      const rcp4dParentByNode = new Map<string, Assembly['connections'][number]>();
      for (const c of assembly.connections) {
        if (c.orphaned || c.kind !== 'rcp4d') continue;
        if (c.shell === 1) {
          const rootNode = nodeById.get(c.nodeA);
          if (rootNode?.rcpPolytope?.view3D === true) continue; // falls through to the ordinary registry-spec branch below
        }
        rcp4dParentByNode.set(c.nodeB, c);
      }

      for (const node of assembly.nodes) {
        const rcpConn = rcp4dParentByNode.get(node.id);
        let spec: PolyhedronSpec | undefined;
        if (rcpConn) {
          const rootNode = nodeById.get(rcpConn.nodeA);
          if (rootNode?.rcpPolytope && rcpConn.cellId !== undefined) {
            const complex = getRcpComplex(rootNode.rcpPolytope.seedSpecId, rootNode.rcpPolytope.target);
            const cell = complex.cells.find((c) => c.id === rcpConn.cellId);
            const cellSpec = POLYHEDRA[cellShapeIdFor(rootNode.rcpPolytope.seedSpecId, rootNode.rcpPolytope.target)];
            if (cell && cellSpec) spec = buildSyntheticCellSpec(cellSpec, cell.id, cell.vertices3D);
          }
        } else if (node.rcpPolytope?.target === '600-cell') {
          // The 600-cell's own root is the one case where a ROOT node's
          // geometry isn't simply POLYHEDRA[node.shape] -- "4D" (the
          // default) is cell 0's real, self-consistent geometry, since
          // there's no external real seed it actually equals (see
          // effectiveSeedSpec's own doc comment); "3D" is the plain,
          // ordinary registry tetrahedron, same as every other node.
          const complex = getRcpComplex(node.rcpPolytope.seedSpecId, node.rcpPolytope.target);
          spec = node.rcpPolytope.view3D ? POLYHEDRA[cellShapeIdFor(node.rcpPolytope.seedSpecId, node.rcpPolytope.target)] : effectiveSeedSpec(complex);
        } else {
          spec = POLYHEDRA[node.shape];
        }
        if (!spec) continue; // isValidAssembly already guards against this in practice
        const placed = buildPlacedShape(spec, node.id);
        placed.object.position.fromArray(node.transform.position);
        placed.object.quaternion.fromArray(node.transform.quaternion);
        // applyViewModeToPlaced's own graph lookup can't be used here --
        // graphRef.current isn't repopulated with THIS assembly's data
        // until after this whole loop (see graphRef.current = assembly
        // below), so it would see the old/empty graph. The shell is
        // already known locally (node.rcpPolytope for a root, rcpConn's
        // own shell for a child), so apply it directly instead.
        applyViewMode(placed, viewModeRef.current);
        const shell = node.rcpPolytope ? 0 : (rcpConn?.shell ?? null);
        if (shell !== null) applyRcpShellOpacity(placed, shell);
        if (node.rcpPolytope) applyRcpSeedColor(placed);
        scene.add(placed.object);
        placedRef.current.push(placed);
        byNodeId.set(node.id, placed);
      }

      for (const conn of assembly.connections) {
        if (conn.orphaned) continue; // indices are stale by design — nothing to mark
        const a = byNodeId.get(conn.nodeA);
        const b = byNodeId.get(conn.nodeB);
        if (conn.kind === 'face') {
          if (a) a.faceOccupied[conn.vertexA] = true;
          if (b) b.faceOccupied[conn.vertexB] = true;
          continue;
        }
        if (conn.kind === 'rcp4d') {
          // Nothing left to do here -- geometry was already re-derived
          // in the placement loop above, and rcp4d reserves no face/
          // vertex slot on the root the way face/duoprism/vertex attach
          // do (vertexA/vertexB are unused placeholders, always 0 --
          // see AssemblyConnection's own doc comment).
          continue;
        }
        if (conn.kind === 'duoprism') {
          if (a && b) {
            // Re-derive every wall-prism mesh from the two nodes' own
            // baked transforms, never stored -- same "derive, don't
            // duplicate" rule fold4 already follows. The offset is
            // read back from B's actual position relative to A's,
            // rather than recomputing duoprismBuildDepth, so this stays
            // correct even if that formula's own margin ever changes.
            // One wall-prism per face in [vertexA, ...duoprismExtraFaces]
            // -- a real duoprism's single far copy can have several,
            // all sharing this same pair of nodes (see assembly.ts's
            // own duoprismExtraFaces doc comment).
            scene.updateMatrixWorld(true);
            const aSpec = POLYHEDRA[assembly.nodes.find((n) => n.id === conn.nodeA)!.shape];
            const aOriginWorld = new THREE.Vector3(0, 0, 0).applyMatrix4(a.object.matrixWorld);
            const bOriginWorld = new THREE.Vector3(0, 0, 0).applyMatrix4(b.object.matrixWorld);
            const offsetWorld = bOriginWorld.clone().sub(aOriginWorld).toArray() as [number, number, number];
            const allFaces = [conn.vertexA, ...(conn.duoprismExtraFaces ?? [])];
            for (const faceIndex of allFaces) {
              a.faceOccupied[faceIndex] = true;
              b.faceOccupied[faceIndex] = true;
              const faceVertsWorld = aSpec.faces[faceIndex].map((i) =>
                new THREE.Vector3(...aSpec.vertices[i]).applyMatrix4(a.object.matrixWorld).toArray(),
              ) as [number, number, number][];
              const wall = buildWallPrism(faceVertsWorld, offsetWorld);
              const wallMesh = buildWallPrismMesh(wall);
              scene.add(wallMesh);
              duoprismMeshesRef.current.set(`${conn.nodeA}:${faceIndex}`, wallMesh);
            }
          }
          continue;
        }
        const sphereA = a?.vertexGroup.children[conn.vertexA] as THREE.Mesh | undefined;
        const sphereB = b?.vertexGroup.children[conn.vertexB] as THREE.Mesh | undefined;
        if (sphereA) {
          (sphereA.userData as VertexUserData).occupied = true;
          paintVertex(sphereA, {});
        }
        if (sphereB) {
          (sphereB.userData as VertexUserData).occupied = true;
          paintVertex(sphereB, {});
        }
      }

      for (const placed of placedRef.current) applyNodeAppearance(placed, false);

      graphRef.current = assembly;
      refreshFoldConnectionsFlag();
      recomputeAllFolds(foldAmountRef.current);
      onSelectionChangeRef.current?.(null);
      reportCageStatus();
    };

    const beginAttach = (specId: string) => {
      const target = selectedRef.current;
      const spec = POLYHEDRA[specId];
      if (!target || !spec || pendingRef.current) return;

      scene.updateMatrixWorld(true); // ensure target's world matrix reflects any prior attach

      const targetData = target.userData as VertexUserData;
      const parentObject = target.parent!.parent as THREE.Group; // sphere -> vertexGroup -> shape group

      const targetWorldPos = new THREE.Vector3();
      target.getWorldPosition(targetWorldPos);
      const parentWorldQuat = new THREE.Quaternion();
      parentObject.getWorldQuaternion(parentWorldQuat);
      // Shapes are centered at their own centroid, so a vertex's local position
      // doubles as its local outward direction (per PolyhedronSpec's Connector doc).
      const targetWorldNormal = target.position.clone().normalize().applyQuaternion(parentWorldQuat);

      const nodeId = crypto.randomUUID();
      const placed = buildPlacedShape(spec, nodeId);
      const attachVertex = spec.vertices[ATTACH_VERTEX_INDEX];
      const attachLocalDir = new THREE.Vector3(...attachVertex).normalize();

      // Rotate the incoming shape's outward direction to point opposite the
      // target's outward normal, so it continues growing away from the
      // existing structure instead of overlapping it. This leaves exactly
      // one rotational freedom open: twisting around attachLocalDir itself,
      // since that axis maps to itself under any rotation around it.
      const desiredWorldDir = targetWorldNormal.clone().negate();
      const baseQuaternion = new THREE.Quaternion().setFromUnitVectors(attachLocalDir, desiredWorldDir);
      placed.object.quaternion.copy(baseQuaternion);

      const rotatedAttachVertex = new THREE.Vector3(...attachVertex).applyQuaternion(baseQuaternion);
      placed.object.position.copy(targetWorldPos).sub(rotatedAttachVertex);

      applyViewModeToPlaced(placed, viewModeRef.current);
      scene.add(placed.object);
      applyNodeAppearance(placed, false);

      targetData.occupied = true; // reserved while pending; cancelAttach restores this
      paintVertex(target, { pending: true });

      const newAttachSphere = placed.vertexGroup.children[ATTACH_VERTEX_INDEX] as THREE.Mesh;
      (newAttachSphere.userData as VertexUserData).occupied = true;
      paintVertex(newAttachSphere, { pending: true });

      pendingRef.current = {
        kind: 'vertex',
        placed,
        nodeId,
        targetSphere: target,
        baseQuaternion,
        attachLocalDir,
        twistAngle: 0,
      };
      controls.enabled = false;
      clearSelection();
      onPendingChangeRef.current?.({ specId });
    };

    /**
     * Face-to-face attach: unlike vertex-attach, two congruent regular n-gon
     * faces have no continuously-free rotation once aligned — only n
     * discrete "registrations" (which incoming vertex sits at which target
     * vertex), since rotating a regular n-gon by any multiple of 360/n
     * around its own center maps it onto itself. The exact alignment angle
     * is computed analytically (align incoming's own reference vertex
     * direction to target's, in the shared plane) rather than searched —
     * verified in scripts/verify-face-attach.ts across every matching-size
     * face pair; a first attempt assumed "no extra twist" or "a multiple of
     * 360/n from zero" was always already correct, which turned out false
     * for most pairs (confirmed empirically, not assumed).
     */
    const beginFaceAttach = (specId: string, wantFold4 = false) => {
      const targetPlaced = selectedNodeRef.current;
      const targetFaceIndex = selectedFaceIndexRef.current;
      const spec = POLYHEDRA[specId];
      if (!targetPlaced || targetFaceIndex === null || !spec || pendingRef.current) return;
      if (targetPlaced.faceOccupied[targetFaceIndex]) return;

      const { specId: targetSpecId } = targetPlaced.object.userData as ShapeObjectUserData;
      const targetSpec = POLYHEDRA[targetSpecId];
      // See beginFaceAttach's own doc comment on ShapeViewerHandle: a
      // fold4 request only ever takes effect for a same-shape,
      // FOURD_CAPABLE_IDS-eligible self-attach -- silently degrades to an
      // ordinary flush attach otherwise rather than erroring, since the
      // real gate is isValidAssembly at save/load time regardless.
      const fold4 = wantFold4 && specId === targetSpecId && FOURD_CAPABLE_IDS.includes(specId);
      const targetFaceVerts = targetSpec.faces[targetFaceIndex];
      // Real congruence (edge lengths + angles), not just matching vertex
      // count — see the onClick filter above for why this matters once
      // irregular-faced (Catalan) shapes are selectable. For the
      // Miscellaneous family specifically ONLY, restrict to the incoming
      // shape's own ELIGIBLE faces (isFaceEligibleForAttach below) —
      // direct user instruction, scoped deliberately to this one family
      // so Catalan solids' own irregular rhombi/kite faces keep working
      // exactly as already shipped.
      const incomingFaceIndex = spec.faces.findIndex(
        (f, fi) => isFaceEligibleForAttach(spec, fi) && facesCongruent(targetSpec.vertices, targetFaceVerts, spec.vertices, f),
      );
      if (incomingFaceIndex === -1) return; // UI should only ever offer compatible shapes

      scene.updateMatrixWorld(true);

      const targetFaceConnector = buildFaceConnectors(targetSpec)[targetFaceIndex];
      const incomingFaceConnector = buildFaceConnectors(spec)[incomingFaceIndex];

      // Read the target face's CURRENT position/normal through its own
      // foldGroup, not its outer `object` -- if the target itself is a
      // fold4 node with a nonzero closing rotation applied right now
      // (the slider isn't at 0), its rendered face has moved from the
      // outer object's own unfolded baseline. Using `object.matrixWorld`
      // here would compute a flush position for where the face WOULD be
      // at t=0, while the visible mesh sits somewhere else -- a real bug
      // found live (a newly-attached piece rendering detached from the
      // surface it was just attached to, "floating away").
      const targetWorldPos = new THREE.Vector3(...targetFaceConnector.pos).applyMatrix4(targetPlaced.foldGroup.matrixWorld);
      const targetWorldQuat = new THREE.Quaternion();
      targetPlaced.foldGroup.getWorldQuaternion(targetWorldQuat);
      const targetWorldNormal = new THREE.Vector3(...targetFaceConnector.normal).applyQuaternion(targetWorldQuat).normalize();

      const Cg = new THREE.Vector3(...incomingFaceConnector.pos);
      const Ng = new THREE.Vector3(...incomingFaceConnector.normal);

      // Point the incoming face's outward normal opposite the target's, same
      // principle as vertex-attach: incoming grows away from target, faces
      // meeting back-to-back rather than overlapping.
      const desiredWorldDir = targetWorldNormal.clone().negate();
      const baseQuat = new THREE.Quaternion().setFromUnitVectors(Ng, desiredWorldDir);

      // Analytic twist: align incoming's own face-vertex-0 direction to
      // where target's face-vertex-0 needs it, in the shared plane.
      const targetFaceVertexIndices = targetSpec.faces[targetFaceIndex];
      const targetV0World = new THREE.Vector3(...targetSpec.vertices[targetFaceVertexIndices[0]]).applyMatrix4(
        targetPlaced.foldGroup.matrixWorld,
      );
      const dTargetWorld = targetV0World.clone().sub(targetWorldPos).normalize();
      const dTargetLocal = dTargetWorld.clone().applyQuaternion(baseQuat.clone().invert());

      const incomingFaceVertexIndices = spec.faces[incomingFaceIndex];
      const incomingV0 = new THREE.Vector3(...spec.vertices[incomingFaceVertexIndices[0]]);
      const dIncomingLocal = incomingV0.clone().sub(Cg).normalize();

      const u = dIncomingLocal.clone();
      const w = new THREE.Vector3().crossVectors(Ng, u).normalize();
      const theta = Math.atan2(dTargetLocal.dot(w), dTargetLocal.dot(u));

      const registrationBaseQuat = baseQuat.clone().multiply(new THREE.Quaternion().setFromAxisAngle(Ng, theta));
      const rotatedCg = Cg.clone().applyQuaternion(registrationBaseQuat);
      const position = targetWorldPos.clone().sub(rotatedCg);

      const nodeId = crypto.randomUUID();
      const placed = buildPlacedShape(spec, nodeId);
      placed.object.quaternion.copy(registrationBaseQuat);
      placed.object.position.copy(position);
      applyViewModeToPlaced(placed, viewModeRef.current);

      scene.add(placed.object);
      applyNodeAppearance(placed, false);

      targetPlaced.faceOccupied[targetFaceIndex] = true; // reserved while pending; cancelAttach restores this
      applyNodeAppearance(targetPlaced, targetPlaced === selectedNodeRef.current);
      placed.faceOccupied[incomingFaceIndex] = true;

      const registrationCount = faceRotationalSymmetry(targetSpec.vertices, targetFaceVerts);
      pendingRef.current = {
        kind: 'face',
        placed,
        nodeId,
        targetPlaced,
        targetFaceIndex,
        incomingFaceIndex,
        baseQuaternion: registrationBaseQuat,
        axis: Ng,
        registrationCount,
        registration: 0,
        dragAccumPx: 0,
        fold4,
      };
      controls.enabled = false;
      clearNodeSelection();
      onPendingChangeRef.current?.(fold4 ? { specId, fold4: true } : { specId });

      // Show the registration counter immediately, not only once a drag
      // begins — essential once irregular-faced (Catalan) shapes exist:
      // a face with only 1 valid registration gives NO visible feedback
      // during a drag (there's nothing to cycle through), so without this
      // the interaction would look inert rather than correct. Reuses the
      // exact same counter every other face-attach already shows mid-drag
      // (no dedicated new UI affordance) — see docs/catalan-solids-spec.md.
      const initialRect = container.getBoundingClientRect();
      label.textContent = `registration 1/${registrationCount}`;
      label.style.left = `${initialRect.width / 2}px`;
      label.style.top = `${initialRect.height / 2}px`;
      label.style.display = 'block';
    };

    /**
     * Builds a renderable mesh for a raw {verts, faces} structure (a
     * wall-prism, not a full PolyhedronSpec). Renders LATERAL faces
     * only (wallLateralFaces) -- both ends are already real, solid,
     * fully-capped placed nodes, so the wall's own near/far cap
     * triangles would duplicate geometry that's already there (see
     * duoprism.ts's own wallLateralFaces doc comment for the real,
     * reported artifact this caused).
     */
    const buildWallPrismMesh = (wall: { verts: [number, number, number][]; faces: number[][] }): THREE.Mesh => {
      const positions: number[] = [];
      for (const face of wall.faces.slice(2)) {
        for (const [i, j, k] of triangulateFace(face)) {
          positions.push(...wall.verts[i], ...wall.verts[j], ...wall.verts[k]);
        }
      }
      const geometry = new THREE.BufferGeometry();
      geometry.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));
      geometry.computeVertexNormals();
      // Distinct teal accent (matches the "Attach via Duoprism…" button's
      // own color in page.tsx) so a wall-prism cell reads as visually
      // different from an ordinary solid or a fold4 pair, not just an
      // unlabeled extra shape.
      const material = new THREE.MeshStandardMaterial({ color: 0x2ad6c9, flatShading: true, transparent: true, opacity: 0.75, side: THREE.DoubleSide });
      return new THREE.Mesh(geometry, material);
    };

    /**
     * The 4D Prism (duoprism) attach: see beginDuoprismAttach's own doc
     * comment on ShapeViewerHandle. Unlike beginFaceAttach, the incoming
     * node is always the SAME shape as the target, at the SAME
     * orientation (a pure translation, not a mirrored flush join) --
     * see duoprism.ts's own header comment for why that's correct, not
     * a shortcut. No registration/twist step exists to drag through, so
     * this goes straight from "begin" to a ready-to-confirm pending
     * state with its own wall-prism mesh already built.
     */
    const beginDuoprismAttach = () => {
      const targetPlaced = selectedNodeRef.current;
      const targetFaceIndex = selectedFaceIndexRef.current;
      if (!targetPlaced || targetFaceIndex === null || pendingRef.current) return;
      if (targetPlaced.faceOccupied[targetFaceIndex]) return;

      const { specId: targetSpecId, nodeId: targetNodeId } = targetPlaced.object.userData as ShapeObjectUserData;
      if (!FOURD_CAPABLE_IDS.includes(targetSpecId)) return; // UI should only ever offer this for eligible shapes
      const spec = POLYHEDRA[targetSpecId];

      scene.updateMatrixWorld(true);

      const targetOriginWorld = new THREE.Vector3(0, 0, 0).applyMatrix4(targetPlaced.foldGroup.matrixWorld);
      const faceVertsWorld = spec.faces[targetFaceIndex].map((i) =>
        new THREE.Vector3(...spec.vertices[i]).applyMatrix4(targetPlaced.foldGroup.matrixWorld).toArray(),
      ) as [number, number, number][];

      // A real duoprism has exactly ONE far copy total (see
      // assembly.ts's own duoprismExtraFaces doc comment) -- if this
      // parent already has a duoprism far copy (from an earlier attach
      // on a DIFFERENT face), reuse it and just add another wall-prism,
      // rather than creating a second, unrelated copy (which produced a
      // real, confirmed-live bug: independent copies pushed out along
      // different face normals have nothing making them meet, leaving a
      // visible gap between them).
      const existingConn = graphRef.current.connections.find(
        (c) => !c.orphaned && c.kind === 'duoprism' && c.nodeA === targetNodeId,
      );

      let placed: PlacedShape;
      let nodeId: string;
      let isNewNode: boolean;
      let offsetWorld: THREE.Vector3;

      if (existingConn) {
        const existingChild = findPlaced(existingConn.nodeB);
        if (!existingChild) return; // shouldn't happen; defensive
        placed = existingChild;
        nodeId = existingConn.nodeB;
        isNewNode = false;
        offsetWorld = existingChild.object.position.clone().sub(targetOriginWorld);
      } else {
        const targetFaceConnector = buildFaceConnectors(spec)[targetFaceIndex];
        // Same "read through foldGroup, not object" reasoning as
        // beginFaceAttach: the target's CURRENT rendered position/
        // orientation, not its unfolded baseline.
        const targetWorldQuat = new THREE.Quaternion();
        targetPlaced.foldGroup.getWorldQuaternion(targetWorldQuat);
        const targetWorldNormal = new THREE.Vector3(...targetFaceConnector.normal).applyQuaternion(targetWorldQuat).normalize();
        offsetWorld = targetWorldNormal.clone().multiplyScalar(duoprismBuildDepth(spec, targetFaceIndex));

        nodeId = crypto.randomUUID();
        const newPlaced = buildPlacedShape(spec, nodeId);
        // Identical orientation, pure translation -- the defining
        // property of a duoprism's far cap (see duoprism.ts). No
        // setFromUnitVectors mirroring, no twist search: there is no
        // discrete rotational choice to make.
        newPlaced.object.quaternion.copy(targetWorldQuat);
        newPlaced.object.position.copy(targetOriginWorld).add(offsetWorld);
        applyViewModeToPlaced(newPlaced, viewModeRef.current);
        scene.add(newPlaced.object);
        applyNodeAppearance(newPlaced, false);
        placed = newPlaced;
        isNewNode = true;
      }

      const wall = buildWallPrism(faceVertsWorld, offsetWorld.toArray() as [number, number, number]);
      const wallMesh = buildWallPrismMesh(wall);
      scene.add(wallMesh);

      targetPlaced.faceOccupied[targetFaceIndex] = true; // reserved while pending; cancelAttach restores this
      applyNodeAppearance(targetPlaced, targetPlaced === selectedNodeRef.current);
      placed.faceOccupied[targetFaceIndex] = true; // same face role on both sides -- see AssemblyConnection's own doc comment
      applyNodeAppearance(placed, placed === selectedNodeRef.current);

      pendingRef.current = {
        kind: 'duoprism',
        placed,
        nodeId,
        isNewNode,
        targetPlaced,
        targetFaceIndex,
        wallMesh,
      };
      controls.enabled = false;
      clearNodeSelection();
      onPendingChangeRef.current?.({ specId: targetSpecId, duoprism: true });
      label.style.display = 'none'; // no registration counter -- nothing to drag/cycle
    };

    const confirmAttach = () => {
      const pending = pendingRef.current;
      if (!pending) return;

      // A duoprism reuse of an EXISTING far copy (see beginDuoprismAttach)
      // must NOT be pushed again -- it's already in placedRef.current
      // from its own original confirm.
      const isReusedDuoprismNode = pending.kind === 'duoprism' && !pending.isNewNode;
      if (!isReusedDuoprismNode) {
        placedRef.current.push(pending.placed);
        applyNodeAppearance(pending.placed, false);
      }

      if (pending.kind === 'vertex') {
        paintVertex(pending.targetSphere, {});
        const newAttachSphere = pending.placed.vertexGroup.children[ATTACH_VERTEX_INDEX] as THREE.Mesh;
        paintVertex(newAttachSphere, {});

        const parentGroup = pending.targetSphere.parent!.parent as THREE.Group;
        const { nodeId: parentNodeId } = parentGroup.userData as ShapeObjectUserData;
        const { vertexId: targetVertexIndex } = pending.targetSphere.userData as VertexUserData;
        const { specId: newSpecId } = pending.placed.object.userData as ShapeObjectUserData;

        const parentPlaced = findPlaced(parentNodeId);
        if (parentPlaced) applyNodeAppearance(parentPlaced, parentPlaced === selectedNodeRef.current);

        graphRef.current.nodes.push({
          id: pending.nodeId,
          shape: newSpecId,
          transform: {
            position: pending.placed.object.position.toArray() as [number, number, number],
            quaternion: pending.placed.object.quaternion.toArray() as [number, number, number, number],
          },
        });
        graphRef.current.connections.push({
          nodeA: parentNodeId,
          vertexA: targetVertexIndex,
          nodeB: pending.nodeId,
          vertexB: ATTACH_VERTEX_INDEX,
        });
      } else if (pending.kind === 'face') {
        const { nodeId: parentNodeId } = pending.targetPlaced.object.userData as ShapeObjectUserData;
        const { specId: newSpecId } = pending.placed.object.userData as ShapeObjectUserData;
        applyNodeAppearance(pending.targetPlaced, pending.targetPlaced === selectedNodeRef.current);

        graphRef.current.nodes.push({
          id: pending.nodeId,
          shape: newSpecId,
          transform: {
            position: pending.placed.object.position.toArray() as [number, number, number],
            quaternion: pending.placed.object.quaternion.toArray() as [number, number, number, number],
          },
        });
        graphRef.current.connections.push({
          nodeA: parentNodeId,
          vertexA: pending.targetFaceIndex,
          nodeB: pending.nodeId,
          vertexB: pending.incomingFaceIndex,
          kind: 'face',
          ...(pending.fold4 ? { fold4: true as const } : {}),
        });
        if (pending.fold4) {
          refreshFoldConnectionsFlag();
          recomputeAllFolds(foldAmountRef.current);
        }
      } else {
        const { nodeId: parentNodeId } = pending.targetPlaced.object.userData as ShapeObjectUserData;
        applyNodeAppearance(pending.targetPlaced, pending.targetPlaced === selectedNodeRef.current);

        // Wall-prism meshes are keyed by (parent node, face index) --
        // NOT by the child node's id -- since a real duoprism's single
        // far copy can now have several wall-prisms (one per attached
        // face), all sharing the same child. See assembly.ts's own
        // duoprismExtraFaces doc comment.
        duoprismMeshesRef.current.set(`${parentNodeId}:${pending.targetFaceIndex}`, pending.wallMesh);

        if (pending.isNewNode) {
          const { specId: newSpecId } = pending.placed.object.userData as ShapeObjectUserData;
          graphRef.current.nodes.push({
            id: pending.nodeId,
            shape: newSpecId,
            transform: {
              position: pending.placed.object.position.toArray() as [number, number, number],
              quaternion: pending.placed.object.quaternion.toArray() as [number, number, number, number],
            },
          });
          graphRef.current.connections.push({
            nodeA: parentNodeId,
            vertexA: pending.targetFaceIndex,
            nodeB: pending.nodeId,
            vertexB: pending.targetFaceIndex,
            kind: 'duoprism',
          });
        } else {
          // Reusing an already-confirmed far copy: no new node, just
          // record this face on the EXISTING connection's own
          // duoprismExtraFaces (mutated in place, matching how rewrite
          // already mutates `connection.orphaned` elsewhere in this
          // file). Undo intentionally does not target this specific
          // action -- "undo the single most recently confirmed attach"
          // means deleting a whole node/subtree (see undo()'s own doc
          // comment), which would be a bigger, surprising removal here
          // (the entire shared far copy, including every other face
          // attached to it) rather than "just this one extra face" --
          // left as a known, documented gap rather than guessed at.
          const existingConn = graphRef.current.connections.find(
            (c) => !c.orphaned && c.kind === 'duoprism' && c.nodeA === parentNodeId && c.nodeB === pending.nodeId,
          );
          if (existingConn) {
            existingConn.duoprismExtraFaces = [...(existingConn.duoprismExtraFaces ?? []), pending.targetFaceIndex];
          }
        }
      }

      if (pending.kind !== 'duoprism' || pending.isNewNode) {
        lastAddedNodeIdRef.current = pending.nodeId;
        onCanUndoChangeRef.current?.(true);
      }

      pendingRef.current = null;
      controls.enabled = true;
      label.style.display = 'none';
      onPendingChangeRef.current?.(null);
      reportCageStatus();
    };

    /**
     * Stage 7: swap the selected node's mesh between D10 and D12 in place.
     * Existing *vertex* connections to/from this node are re-anchored to
     * the most directionally-similar vertex on the new shape where one
     * exists above the match threshold and isn't already claimed by a
     * better-scoring connection; otherwise the connection is flagged
     * orphaned. Face connections have no analogous re-matching implemented
     * yet, so they're always orphaned on rewrite rather than silently kept
     * with a possibly-wrong face index — surfacing the gap honestly rather
     * than guessing. Crucially, the *other* node in every connection is
     * never touched — its transform, its own occupied state, all untouched
     * — so existing neighbors never move, matched or not.
     */
    const rewriteSelectedNode = (): RewriteResult | null => {
      const node = selectedNodeRef.current;
      if (!node) return null;
      const { specId: oldSpecId, nodeId } = node.object.userData as ShapeObjectUserData;
      const newSpecId = REWRITE_TARGET[oldSpecId];
      if (!newSpecId) return null;
      const newSpec = DELTAHEDRA[newSpecId];

      interface Ref {
        connection: Assembly['connections'][number];
        side: 'A' | 'B';
        oldVertex: number;
      }
      const refs: Ref[] = [];
      let faceOrphaned = 0;
      for (const connection of graphRef.current.connections) {
        if (connection.orphaned) continue;
        const touchesA = connection.nodeA === nodeId;
        const touchesB = connection.nodeB === nodeId;
        if (!touchesA && !touchesB) continue;
        if (connection.kind === 'face') {
          connection.orphaned = true;
          faceOrphaned++;
          continue;
        }
        if (touchesA) refs.push({ connection, side: 'A', oldVertex: connection.vertexA });
        if (touchesB) refs.push({ connection, side: 'B', oldVertex: connection.vertexB });
      }

      const matches = matchRewriteVertices(
        oldSpecId,
        newSpecId,
        refs.map((r) => r.oldVertex),
      );

      // Swap the mesh in place: same node id, same world transform. Nothing
      // else in the scene is touched — no other object's position/quaternion
      // is read or written here.
      const oldPosition = node.object.position.clone();
      const oldQuaternion = node.object.quaternion.clone();
      scene.remove(node.object);
      disposePlacedShape(node);

      const replacement = buildPlacedShape(newSpec, nodeId);
      replacement.object.position.copy(oldPosition);
      replacement.object.quaternion.copy(oldQuaternion);
      applyViewModeToPlaced(replacement, viewModeRef.current);
      scene.add(replacement.object);

      const index = placedRef.current.indexOf(node);
      if (index !== -1) placedRef.current[index] = replacement;
      else placedRef.current.push(replacement);

      if (hoveredRef.current && (hoveredRef.current.parent as THREE.Group | null)?.parent === node.object) {
        hoveredRef.current = null;
      }
      if (selectedRef.current && (selectedRef.current.parent as THREE.Group | null)?.parent === node.object) {
        selectedRef.current = null;
      }

      const nodeRecord = graphRef.current.nodes.find((n) => n.id === nodeId);
      if (nodeRecord) {
        nodeRecord.shape = newSpecId;
        nodeRecord.transform = {
          position: replacement.object.position.toArray() as [number, number, number],
          quaternion: replacement.object.quaternion.toArray() as [number, number, number, number],
        };
      }

      let reattached = 0;
      let orphaned = faceOrphaned;
      refs.forEach((ref, i) => {
        const newVertex = matches[i];
        if (newVertex === undefined) {
          ref.connection.orphaned = true;
          orphaned++;
          return;
        }
        if (ref.side === 'A') ref.connection.vertexA = newVertex;
        else ref.connection.vertexB = newVertex;
        ref.connection.orphaned = false;

        const sphere = replacement.vertexGroup.children[newVertex] as THREE.Mesh;
        (sphere.userData as VertexUserData).occupied = true;
        paintVertex(sphere, {});
        reattached++;
      });

      applyNodeAppearance(replacement, false);
      clearNodeSelection();
      reportCageStatus();
      return { fromSpecId: oldSpecId, toSpecId: newSpecId, reattached, orphaned };
    };

    /**
     * Removes `nodeId` and cascades to its whole subtree (every node
     * reachable by following nodeA -> nodeB edges from it — see
     * collectSubtree in app/lib/graph.ts). The parent's own vertex or
     * face, if any, is freed again so something new can attach there.
     * Shared by deleteSelectedNode (Stage 8) and undo below — the same
     * real removal logic either way, just a different way of arriving
     * at which nodeId to remove.
     */
    const deleteNodeById = (nodeId: string): DeleteResult | null => {
      if (!graphRef.current.nodes.some((n) => n.id === nodeId)) return null;

      const subtreeIds = collectSubtree(graphRef.current.connections, nodeId);
      const parentConn = findParentConnection(graphRef.current.connections, nodeId);

      for (const id of subtreeIds) {
        const placed = findPlaced(id);
        if (!placed) continue;

        scene.remove(placed.object);
        disposePlacedShape(placed);
        const idx = placedRef.current.indexOf(placed);
        if (idx !== -1) placedRef.current.splice(idx, 1);
        // disposePlacedShape already disposed this node's own coordinate
        // overlay group's geometries (it's a child of placed.object) --
        // just drop the now-stale tracking entries.
        rcpCoordVisibleRef.current.delete(id);
        rcpCoordGroupRef.current.delete(id);

        // This node's OWN incoming connection (if duoprism) may own
        // several wall-prism meshes -- one per [vertexA,
        // ...duoprismExtraFaces] -- all keyed by (that connection's own
        // parent id, face index), not by this child's own id (see
        // assembly.ts's own duoprismExtraFaces doc comment for why one
        // shared far copy can have more than one).
        const ownIncomingConn = findParentConnection(graphRef.current.connections, id);
        if (ownIncomingConn && !ownIncomingConn.orphaned && ownIncomingConn.kind === 'duoprism') {
          const facesToClean = [ownIncomingConn.vertexA, ...(ownIncomingConn.duoprismExtraFaces ?? [])];
          for (const faceIndex of facesToClean) {
            const key = `${ownIncomingConn.nodeA}:${faceIndex}`;
            const wallMesh = duoprismMeshesRef.current.get(key);
            if (wallMesh) {
              scene.remove(wallMesh);
              wallMesh.geometry.dispose();
              (wallMesh.material as THREE.Material).dispose();
              duoprismMeshesRef.current.delete(key);
            }
          }
        }

        if (hoveredNodeRef.current === placed) hoveredNodeRef.current = null;
        if (selectedNodeRef.current === placed) selectedNodeRef.current = null;
        if (hoveredRef.current && placedOwningVertexSphere(hoveredRef.current) === placed) hoveredRef.current = null;
        if (selectedRef.current && placedOwningVertexSphere(selectedRef.current) === placed) selectedRef.current = null;
      }

      graphRef.current.nodes = graphRef.current.nodes.filter((n) => !subtreeIds.has(n.id));
      graphRef.current.connections = graphRef.current.connections.filter(
        (c) => !subtreeIds.has(c.nodeA) && !subtreeIds.has(c.nodeB),
      );

      if (parentConn && !parentConn.orphaned) {
        const parentPlaced = findPlaced(parentConn.nodeA);
        if (parentConn.kind === 'duoprism') {
          // Free EVERY face this shared far copy was using on the
          // parent, not just vertexA -- a real duoprism's single far
          // copy can have several wall-prisms (see assembly.ts's own
          // duoprismExtraFaces doc comment).
          if (parentPlaced) {
            for (const faceIndex of [parentConn.vertexA, ...(parentConn.duoprismExtraFaces ?? [])]) {
              parentPlaced.faceOccupied[faceIndex] = false;
            }
          }
        } else if (parentConn.kind === 'face') {
          if (parentPlaced) parentPlaced.faceOccupied[parentConn.vertexA] = false;
        } else if (parentConn.kind === 'rcp4d') {
          // rcp4d children reserve nothing on the root the way a vertex/
          // face/duoprism attach does -- vertexA/vertexB are always 0
          // unused placeholders (see AssemblyConnection's own doc
          // comment), never a real vertex index to free. Falling through
          // to the vertex-kind branch below would wrongly grab the
          // root's own vertex 0 and reset ITS occupied state even when
          // vertex 0 is independently in real use by an unrelated
          // vertex-attach child -- a real bug caught while writing this.
        } else {
          const parentSphere = parentPlaced?.vertexGroup.children[parentConn.vertexA] as THREE.Mesh | undefined;
          if (parentSphere) {
            (parentSphere.userData as VertexUserData).occupied = false;
            paintVertex(parentSphere, {});
          }
        }
        if (parentPlaced) applyNodeAppearance(parentPlaced, parentPlaced === selectedNodeRef.current);
      }

      refreshFoldConnectionsFlag();
      recomputeAllFolds(foldAmountRef.current);

      // If the node being removed (or anything in its subtree) was the
      // tracked "most recently added" node, there's nothing left for
      // undo to target.
      if (lastAddedNodeIdRef.current !== null && subtreeIds.has(lastAddedNodeIdRef.current)) {
        lastAddedNodeIdRef.current = null;
        onCanUndoChangeRef.current?.(false);
      }

      clearNodeSelection();
      label.style.display = 'none';
      reportCageStatus();
      return { deletedCount: subtreeIds.size };
    };

    /** Stage 8: remove the currently selected node (and its subtree). */
    const deleteSelectedNode = (): DeleteResult | null => {
      const node = selectedNodeRef.current;
      if (!node) return null;
      const { nodeId } = node.object.userData as ShapeObjectUserData;
      return deleteNodeById(nodeId);
    };

    /**
     * Removes the single most recently confirmed attach (and whatever's
     * been built on top of it since) -- see undo()'s own doc comment on
     * ShapeViewerHandle for the exact semantics. Single-level: clears
     * the tracked node id either way, so calling this again immediately
     * is a no-op until a fresh confirmAttach/beginFaceAttach re-arms it.
     */
    const undo = (): DeleteResult | null => {
      const nodeId = lastAddedNodeIdRef.current;
      if (!nodeId) return null;
      const result = deleteNodeById(nodeId);
      // deleteNodeById already clears lastAddedNodeIdRef + fires the
      // callback when it finds the target node in the subtree it
      // removed -- but guard here too in case the node had somehow
      // already gone stale (deleted some other way without going
      // through deleteNodeById), so undo is never callable twice.
      if (lastAddedNodeIdRef.current === nodeId) {
        lastAddedNodeIdRef.current = null;
        onCanUndoChangeRef.current?.(false);
      }
      return result;
    };

    // graphRef.current is the SAME object saveAssembly below POSTs to the
    // server -- returned directly (not cloned) since this is read
    // synchronously by the caller (JSON.stringify right after the call),
    // well before anything else in this single-threaded flow could
    // mutate it.
    const getAssembly = (): Assembly => graphRef.current;

    // Async signature kept (matches ShapeViewerHandle's own `save():
    // Promise<boolean>`) even though localStorage itself is synchronous --
    // callers (page.tsx's handleSave) already await this, and keeping the
    // interface unchanged means no caller needed touching for this swap.
    const saveAssembly = async (): Promise<boolean> => {
      try {
        localStorage.setItem(ASSEMBLY_STORAGE_KEY, JSON.stringify(graphRef.current));
        return true;
      } catch {
        return false; // e.g. private-browsing storage rejection, quota exceeded
      }
    };

    const setViewMode = (mode: ViewMode) => {
      viewModeRef.current = mode;
      for (const placed of placedRef.current) applyViewModeToPlaced(placed, mode);
      if (pendingRef.current) applyViewModeToPlaced(pendingRef.current.placed, mode);
    };

    const setFoldAmount = (t: number) => {
      foldAmountRef.current = t;
      recomputeAllFolds(t); // its own trailing updateMatrixWorld(true) covers the immediate-raycast concern too
    };

    onReadyRef.current?.({
      reset: placeRoot,
      beginAttach,
      beginFaceAttach,
      beginDuoprismAttach,
      confirmAttach,
      cancelAttach,
      save: saveAssembly,
      rewriteSelectedNode,
      deleteSelectedNode,
      undo,
      getAssembly,
      setViewMode,
      setFoldAmount,
      beginRcpBuild,
      buildNextRcpCell,
      removeLastRcpCell,
      buildNextRcpShell,
      removeLastRcpShell,
      setRcpView3D,
      setRcpCoordinatesVisible,
    });

    let cancelled = false;
    (() => {
      try {
        const raw = localStorage.getItem(ASSEMBLY_STORAGE_KEY);
        const data: unknown = raw === null ? null : migrateLegacyRcp4d(JSON.parse(raw));
        if (cancelled) return;
        if (isValidAssembly(data) && data.nodes.length > 0) {
          loadAssembly(data);
          return;
        }
      } catch {
        // no saved assembly (or it's corrupted/unreadable) — fall through to the default shape
      }
      if (!cancelled) placeRoot(initialShapeId);
    })();

    const raycaster = new THREE.Raycaster();
    const pointer = new THREE.Vector2();
    let isDragging = false;
    // Tracks the pointer's own down position, independent of OrbitControls
    // (which handles the actual camera rotation itself and has no reason
    // to expose this) -- a plain click-to-select/deselect and an
    // orbit-drag-that-ends-on-the-canvas are indistinguishable to the
    // browser's own native 'click' event (it still fires on mouseup
    // regardless of how far the pointer moved in between), so without
    // this, rotating the camera could silently deselect the current node
    // (real user report: "why do 4D buttons just vanish... when you
    // touch or turn object" -- every RCP-C2B control disappears with the
    // selection). onClick below skips its own selection logic entirely
    // once the pointer moved more than CLICK_DRAG_THRESHOLD_PX.
    let mouseDownClientPos: { x: number; y: number } | null = null;
    // Tracks the most recent real PointerEvent's pointerType -- see
    // positionLabel's own comment for why this is needed (onClick's
    // native 'click' MouseEvent never carries pointerType itself, even
    // for a touch-originated tap).
    let lastPointerType = 'mouse';

    const allVertexSpheres = () =>
      placedRef.current
        .filter((p) => !isRcpWarpedNode((p.object.userData as ShapeObjectUserData).nodeId))
        .flatMap((p) => p.vertexGroup.children);
    const allFaceMeshes = () => placedRef.current.map((p) => p.mesh);

    const clearHover = () => {
      const prev = hoveredRef.current;
      if (prev && prev !== selectedRef.current) {
        paintVertex(prev, {});
      }
      hoveredRef.current = null;
      hoveredNodeRef.current = null;
      hoveredFaceIndexRef.current = null;
      hideFaceHighlight();
      label.style.display = 'none';
    };

    // Positions the hover/status label relative to the pointer. On touch,
    // the lower-right offset that reads fine next to a mouse cursor puts
    // the label directly under the finger that's currently touching --
    // real user report ("text... is hidden under finger, should appear
    // above touch point"). Shifted up (and slightly left, so it doesn't
    // run as far off narrow phone screens) instead.
    //
    // isTouch can't just check event.pointerType here: onClick's own
    // event is a native 'click' MouseEvent, which -- even for a
    // touch-originated tap -- never carries pointerType at all (that's
    // PointerEvent-only), so a plain-tap gesture (pointerdown+pointerup
    // with no real intervening pointermove, the common case) would only
    // ever reach updateHover via onClick and silently fall through to
    // the mouse-style offset regardless of device. lastPointerTypeRef
    // (set from the real PointerEvents onPointerDown/onPointerMove do
    // receive) is the fallback for exactly that gap.
    const positionLabel = (event: MouseEvent, rect: DOMRect) => {
      const x = event.clientX - rect.left;
      const y = event.clientY - rect.top;
      const eventPointerType = 'pointerType' in event ? (event as PointerEvent).pointerType : undefined;
      const isTouch = (eventPointerType ?? lastPointerType) === 'touch';
      if (isTouch) {
        label.style.left = `${x - 60}px`;
        label.style.top = `${y - 70}px`;
      } else {
        label.style.left = `${x + 14}px`;
        label.style.top = `${y + 14}px`;
      }
    };

    // The actual vertex/node-body raycast, shared by onPointerMove (real
    // hover, mouse/pen) AND onClick (called fresh at click time) -- touch
    // devices don't fire a pointermove before the FIRST pointerdown of a
    // fresh tap (nothing to move through before contact begins), so
    // onClick reading only whatever hoveredRef/hoveredNodeRef happened to
    // be set by a prior pointermove left touch taps seeing stale/null
    // hover state and never resolving to anything -- real user report
    // ("haven't been able to attach anything... no support for phone
    // tablet"). Re-raycasting at the exact click/tap position, right
    // before onClick reads the hover refs, makes both paths correct
    // regardless of whether a real hover preceded this interaction.
    const updateHover = (event: MouseEvent, rect: DOMRect) => {
      pointer.x = ((event.clientX - rect.left) / rect.width) * 2 - 1;
      pointer.y = -((event.clientY - rect.top) / rect.height) * 2 + 1;
      raycaster.setFromCamera(pointer, camera);

      const hit = raycaster.intersectObjects(allVertexSpheres())[0]?.object as THREE.Mesh | undefined;

      if (hit !== hoveredRef.current) {
        clearHover();
        if (hit) {
          hoveredRef.current = hit;
          if (hit !== selectedRef.current) paintVertex(hit, { hovered: true });
        }
      }

      if (hit) {
        hoveredNodeRef.current = null;
        hoveredFaceIndexRef.current = null;
        hideFaceHighlight();
        const { vertexId, degree, occupied } = hit.userData as VertexUserData;
        label.textContent = occupied
          ? `vertex ${vertexId} — capacity ${degree} (occupied)`
          : `vertex ${vertexId} — capacity ${degree}`;
        positionLabel(event, rect);
        label.style.display = 'block';
        return;
      }

      // No vertex under the cursor — check for any node body (select for
      // delete, rewrite when D10/D12, or face-attach on the specific
      // triangle's own polygon face).
      const faceHits = raycaster.intersectObjects(allFaceMeshes());
      const faceHit = faceHits[0];
      const node = faceHit ? placedRef.current.find((p) => p.mesh === faceHit.object) : undefined;

      if (node && faceHit) {
        hoveredNodeRef.current = node;
        const { nodeId } = node.object.userData as ShapeObjectUserData;
        // RCP-C2B-warped nodes (isRcpWarpedNode's own doc comment) stay
        // selectable -- the RCP-C2B build buttons need whole-node selection
        // to work -- but never offer a specific face: no face-attach,
        // fold4, or duoprism affordance on a mid-build synthetic cell.
        const faceIndex = isRcpWarpedNode(nodeId)
          ? null
          : typeof faceHit.faceIndex === 'number'
            ? node.triangleToFaceIndex[faceHit.faceIndex]
            : null;
        hoveredFaceIndexRef.current = faceIndex;
        if (faceIndex !== null) showFaceHighlight(node, faceIndex);
        else hideFaceHighlight();

        const { specId } = node.object.userData as ShapeObjectUserData;
        const rewriteTarget = REWRITE_TARGET[specId];
        const actions = ['delete'];
        if (rewriteTarget) actions.push(`transform → ${rewriteTarget}`);
        if (faceIndex !== null && !node.faceOccupied[faceIndex]) {
          const faceSize = POLYHEDRA[specId].faces[faceIndex].length;
          actions.push(`attach via this ${faceSize}-gon face`);
        }
        label.textContent = `click to select ${specId} node (${actions.join(', ')})`;
        positionLabel(event, rect);
        label.style.display = 'block';
      } else {
        hoveredNodeRef.current = null;
        hoveredFaceIndexRef.current = null;
        hideFaceHighlight();
        label.style.display = 'none';
      }
    };

    const onPointerMove = (event: PointerEvent) => {
      lastPointerType = event.pointerType;
      const pending = pendingRef.current;
      const rect = container.getBoundingClientRect();

      if (pending) {
        if (isDragging) {
          const dragDeltaX = event.clientX - lastDragX;
          lastDragX = event.clientX;
          if (pending.kind === 'vertex') {
            pending.twistAngle += dragDeltaX * TWIST_SENSITIVITY;
            const twistQuat = new THREE.Quaternion().setFromAxisAngle(pending.attachLocalDir, pending.twistAngle);
            pending.placed.object.quaternion.copy(pending.baseQuaternion).multiply(twistQuat);

            const degrees = THREE.MathUtils.radToDeg(pending.twistAngle) % 360;
            label.textContent = `twist ${degrees.toFixed(0)}°`;
            positionLabel(event, rect);
            label.style.display = 'block';
          } else if (pending.kind === 'face') {
            pending.dragAccumPx += dragDeltaX;
            while (pending.dragAccumPx >= FACE_REGISTRATION_DRAG_PX) {
              pending.dragAccumPx -= FACE_REGISTRATION_DRAG_PX;
              pending.registration = (pending.registration + 1) % pending.registrationCount;
            }
            while (pending.dragAccumPx <= -FACE_REGISTRATION_DRAG_PX) {
              pending.dragAccumPx += FACE_REGISTRATION_DRAG_PX;
              pending.registration = (pending.registration - 1 + pending.registrationCount) % pending.registrationCount;
            }
            const angle = (pending.registration * 2 * Math.PI) / pending.registrationCount;
            const twistQuat = new THREE.Quaternion().setFromAxisAngle(pending.axis, angle);
            pending.placed.object.quaternion.copy(pending.baseQuaternion).multiply(twistQuat);

            label.textContent = `registration ${pending.registration + 1}/${pending.registrationCount}`;
            positionLabel(event, rect);
            label.style.display = 'block';
          }
          // 'duoprism': no drag/registration behavior at all -- there is
          // no rotational freedom to cycle through (see
          // beginDuoprismAttach's own doc comment), so a drag here is
          // simply inert.
        }
        return; // selection/hover raycasting is locked while a piece is pending
      }

      updateHover(event, rect);
    };

    // Manually-tracked position delta, not event.movementX/movementY --
    // Safari's support for movementX/Y on touch-originated PointerEvents
    // is real but historically unreliable (frequently 0 regardless of
    // actual finger movement), which would make the whole twist-drag
    // gesture below silently do nothing on iOS touch even though the
    // exact same code drives a real mouse drag correctly. clientX/Y
    // deltas computed by hand here have no such platform gap.
    let lastDragX = 0;
    const onPointerDown = (event: PointerEvent) => {
      mouseDownClientPos = { x: event.clientX, y: event.clientY };
      if (!pendingRef.current) return;
      isDragging = true;
      lastDragX = event.clientX;
      container.setPointerCapture(event.pointerId);
    };

    const onPointerUp = (event: PointerEvent) => {
      if (!isDragging) return;
      isDragging = false;
      try {
        container.releasePointerCapture(event.pointerId);
      } catch {
        // pointer capture may already be released (e.g. pointercancel) — harmless
      }
    };

    const onClick = (event: MouseEvent) => {
      if (pendingRef.current) return; // confirm/cancel drive pending state, not clicks

      // An OrbitControls camera-rotate drag still ends in a native
      // 'click' event at wherever the pointer lands (browsers don't
      // suppress it just because the pointer moved) -- without this
      // check, that would run the selection logic below against
      // whatever's now under the cursor, which could silently deselect
      // the current node (mouseDownClientPos's own comment).
      if (mouseDownClientPos) {
        const dx = event.clientX - mouseDownClientPos.x;
        const dy = event.clientY - mouseDownClientPos.y;
        if (Math.hypot(dx, dy) > CLICK_DRAG_THRESHOLD_PX) return;
      }

      // Re-raycast at the click's own position before trusting the hover
      // refs below -- see updateHover's own comment for why: touch never
      // fires a pointermove before a fresh tap's pointerdown, so without
      // this, hoveredRef/hoveredNodeRef could be stale or still null on
      // mobile, and a tap would silently select/attach nothing at all.
      updateHover(event, container.getBoundingClientRect());

      const hit = hoveredRef.current;
      if (hit) {
        clearNodeSelection(); // vertex-select and node-select are mutually exclusive modes

        if (selectedRef.current && selectedRef.current !== hit) {
          paintVertex(selectedRef.current, {});
          selectedRef.current = null;
        }

        if ((hit.userData as VertexUserData).occupied) {
          selectedRef.current = null;
          onSelectionChangeRef.current?.(null);
          return;
        }

        if (selectedRef.current === hit) {
          selectedRef.current = null;
          onSelectionChangeRef.current?.(null);
          return;
        }

        selectedRef.current = hit;
        paintVertex(hit, { selected: true });
        const { specId } = (hit.parent!.parent as THREE.Group).userData as ShapeObjectUserData;
        const { vertexId, degree } = hit.userData as VertexUserData;
        onSelectionChangeRef.current?.({ specId, vertexId, degree });
        return;
      }

      clearSelection();

      const hoveredNode = hoveredNodeRef.current;
      if (selectedNodeRef.current && selectedNodeRef.current !== hoveredNode) {
        clearNodeSelection();
      }

      if (!hoveredNode) {
        clearNodeSelection();
        return;
      }

      if (selectedNodeRef.current === hoveredNode) {
        clearNodeSelection();
        return;
      }

      selectedNodeRef.current = hoveredNode;
      selectedFaceIndexRef.current = hoveredFaceIndexRef.current;
      applyNodeAppearance(hoveredNode, true);
      publishNodeSelection(hoveredNode);
    };

    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') cancelAttach();
    };

    container.addEventListener('pointermove', onPointerMove);
    container.addEventListener('pointerleave', clearHover);
    container.addEventListener('pointerdown', onPointerDown);
    container.addEventListener('pointerup', onPointerUp);
    container.addEventListener('click', onClick);
    window.addEventListener('keydown', onKeyDown);

    let frameId: number;
    const animate = () => {
      controls.update();
      renderer.render(scene, camera);
      frameId = requestAnimationFrame(animate);
    };
    animate();

    const onResize = () => {
      const { clientWidth, clientHeight } = container;
      camera.aspect = clientWidth / clientHeight;
      camera.updateProjectionMatrix();
      renderer.setSize(clientWidth, clientHeight);
    };
    window.addEventListener('resize', onResize);

    return () => {
      cancelled = true;
      cancelAnimationFrame(frameId);
      window.removeEventListener('resize', onResize);
      window.removeEventListener('keydown', onKeyDown);
      container.removeEventListener('pointermove', onPointerMove);
      container.removeEventListener('pointerleave', clearHover);
      container.removeEventListener('pointerdown', onPointerDown);
      container.removeEventListener('pointerup', onPointerUp);
      container.removeEventListener('click', onClick);
      resetScene();
      faceHighlightMesh.geometry.dispose();
      faceHighlightMaterial.dispose();
      starGeometry.dispose();
      starMaterial.dispose();
      controls.dispose();
      container.removeChild(renderer.domElement);
      renderer.dispose();
      sceneRef.current = null;
    };
    // Intentionally mount-once: the handle methods are exposed imperatively
    // via onReady, so this component doesn't need to react to prop changes.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <div
      ref={containerRef}
      className="relative h-full w-full overflow-hidden"
      // Real user report on iPad: a long touch on the scene triggers the
      // OS's native text-selection/magnifier "highlight" UI instead of
      // reaching this component's own pointer handlers -- nothing here
      // told the browser this canvas isn't selectable text/content.
      // touchAction:none also stops the browser from treating a drag as
      // a page-scroll/pinch-zoom attempt, which competes with the
      // custom vertex-select/rotate gestures the same way.
      style={{
        touchAction: 'none',
        WebkitUserSelect: 'none',
        userSelect: 'none',
        WebkitTouchCallout: 'none',
      }}
    >
      <div
        ref={labelRef}
        className="pointer-events-none absolute z-10 hidden rounded bg-black/80 px-2 py-1 text-xs text-white"
      />
    </div>
  );
}
