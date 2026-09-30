/**
 * The main light rides with the camera (ported from Rhombiverse ab01ae0,
 * direct report 2026-09-30: "underside of shapes is not lit when they are
 * turned over"). A fixed light left every face pointing away from it with
 * flat ambient only -- one shade, no edges -- even when turned toward the
 * viewer. Here the light keeps the angle it had from the viewer's starting
 * view, so the opening view looks the same, and whatever face you turn
 * toward you is shaded like a top or side.
 */
import * as THREE from 'three';

/** Attach `light` to `camera` at the angle a light at `worldPos` had from
 *  the camera's current (starting) view of the origin. The camera must be
 *  in the scene for its children to render. */
export function attachHeadLight(scene: THREE.Scene, camera: THREE.Camera, light: THREE.DirectionalLight, worldPos: THREE.Vector3Like): void {
  const home = camera.clone();
  home.lookAt(0, 0, 0);
  home.updateMatrixWorld();
  light.position.copy(home.worldToLocal(new THREE.Vector3(worldPos.x, worldPos.y, worldPos.z)));
  light.target.position.copy(home.worldToLocal(new THREE.Vector3(0, 0, 0)));
  camera.add(light, light.target);
  if (!camera.parent) scene.add(camera);
}
