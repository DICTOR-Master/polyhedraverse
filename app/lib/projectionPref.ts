// The projection (3D / ∥ / ISO), remembered on this device like the joined app's (DICTO 2026-10-09).
import type { ProjectionMode } from '../components/ShapeViewer';

const KEY = 'polyhedraverse:projection';
const MODES: ProjectionMode[] = ['perspective', 'orthographic', 'isometric'];

export function loadProjection(): ProjectionMode {
  try {
    const v = localStorage.getItem(KEY);
    return MODES.includes(v as ProjectionMode) ? (v as ProjectionMode) : 'perspective';
  } catch {
    return 'perspective';
  }
}

export function saveProjection(mode: ProjectionMode) {
  try { localStorage.setItem(KEY, mode); } catch { /* best-effort */ }
}
