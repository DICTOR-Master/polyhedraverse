'use client';

/**
 * A shape's net (direct request 2026-09-30, built 2026-10-08): the shape
 * unfolded flat and folded back up, with a slider and a play button, and a
 * printable A4 PDF with optional glue tabs. It lives in the shape's own
 * detail view, apart from the scene, so the build is never touched (direct
 * decision: "own overlay"). The geometry is krp-core/src/polyhedra-nets/unfold.js; the
 * PDF is krp-core/src/polyhedra-nets/printable.ts.
 */

import { useEffect, useRef, useState } from 'react';
import * as THREE from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';
import { attachHeadLight } from '../../lib/headLight';
import { getAnySpec } from '../../../krp-core/src/polyhedra/lookup.js';
import { netOf, triangulate, type Net } from '../../../krp-core/src/polyhedra-nets/unfold.js';
import { printableNetPdf } from '../../../krp-core/src/polyhedra-nets/printable.js';
import { t, type LangCode } from '../../lib/i18n';

const FACE_COLOR = 0x47cc24;
const EDGE_COLOR = 0xa9f795;
const FOLD_SECONDS = 1.6;

export interface NetViewerProps {
  specId: string;
  lang: LangCode;
  height?: number;
}

export default function NetViewer({ specId, lang, height = 340 }: NetViewerProps) {
  const containerRef = useRef<HTMLDivElement | null>(null);
  // The net for the shape on show: undefined while it's still unfolding.
  const [result, setResult] = useState<{ id: string; net: Net | null } | null>(null);
  const net = result?.id === specId ? result.net : undefined;
  const [fold, setFold] = useState(0);
  const [tabs, setTabs] = useState(true);
  const foldRef = useRef(0);
  const placeRef = useRef<(t: number) => void>(() => {});
  const rafRef = useRef(0);

  // Unfold off the first paint: the largest shapes take a second.
  useEffect(() => {
    const id = window.setTimeout(() => {
      const spec = getAnySpec(specId);
      setResult({ id: specId, net: spec ? netOf(spec.vertices, spec.faces) : null });
    }, 30);
    return () => window.clearTimeout(id);
  }, [specId]);

  useEffect(() => {
    const container = containerRef.current;
    if (!container || !net) return undefined;
    const scene = new THREE.Scene();
    scene.background = new THREE.Color(0x0a0a10);
    const camera = new THREE.PerspectiveCamera(45, container.clientWidth / container.clientHeight, 0.01, 100);
    const renderer = new THREE.WebGLRenderer({ antialias: true });
    renderer.setSize(container.clientWidth, container.clientHeight);
    renderer.setPixelRatio(window.devicePixelRatio);
    renderer.domElement.style.display = 'block';
    renderer.domElement.style.touchAction = 'none';
    container.appendChild(renderer.domElement);
    scene.add(new THREE.AmbientLight(0xffffff, 0.75));
    attachHeadLight(scene, camera, new THREE.DirectionalLight(0xffffff, 1.0), { x: 2, y: 3, z: 5 });
    const controls = new OrbitControls(camera, renderer.domElement);
    controls.enableDamping = true;
    controls.enablePan = false;

    // Fit: the flat net and the closed solid, both, into a unit-ish view.
    const box = new THREE.Box3();
    for (const tt of [0, 1]) net.at(tt).forEach((M, i) => net.faces[i].pts.forEach((p) => box.expandByPoint(new THREE.Vector3(...p).applyMatrix4(new THREE.Matrix4().fromArray(M)))));
    const centre = box.getCenter(new THREE.Vector3());
    const r = box.getSize(new THREE.Vector3()).length() / 2 || 1;
    const k = 1 / r;
    const root = new THREE.Group();
    root.scale.setScalar(k);
    root.position.copy(centre).multiplyScalar(-k);
    scene.add(root);
    camera.position.set(0, -0.35, 2.6);
    controls.minDistance = 0.8;
    controls.maxDistance = 8;

    const faceMat = new THREE.MeshStandardMaterial({ color: FACE_COLOR, flatShading: true, side: THREE.DoubleSide, polygonOffset: true, polygonOffsetFactor: 1, polygonOffsetUnits: 1 });
    const lineMat = new THREE.LineBasicMaterial({ color: EDGE_COLOR });
    const disposables: (THREE.BufferGeometry | THREE.Material)[] = [faceMat, lineMat];
    const groups = net.faces.map((f, i) => {
      const g = new THREE.Group();
      g.matrixAutoUpdate = false;
      const pos: number[] = [];
      for (const tri of triangulate(net.flat[i])) for (const j of tri) pos.push(...f.pts[j]);
      const geo = new THREE.BufferGeometry();
      geo.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
      geo.computeVertexNormals();
      const line = new THREE.BufferGeometry().setFromPoints([...f.pts, f.pts[0]].map((p) => new THREE.Vector3(...p)));
      disposables.push(geo, line);
      g.add(new THREE.Mesh(geo, faceMat), new THREE.Line(line, lineMat));
      root.add(g);
      return g;
    });
    const place = (tt: number) => {
      net.at(tt).forEach((M, i) => { groups[i].matrix.fromArray(M); groups[i].matrixWorldNeedsUpdate = true; });
    };
    place(foldRef.current);
    placeRef.current = place;

    let frameId = 0;
    const animate = () => { controls.update(); renderer.render(scene, camera); frameId = requestAnimationFrame(animate); };
    animate();
    const onResize = () => {
      camera.aspect = container.clientWidth / container.clientHeight;
      camera.updateProjectionMatrix();
      renderer.setSize(container.clientWidth, container.clientHeight);
    };
    window.addEventListener('resize', onResize);
    return () => {
      cancelAnimationFrame(frameId);
      window.removeEventListener('resize', onResize);
      controls.dispose();
      disposables.forEach((d) => d.dispose());
      renderer.dispose();
      container.removeChild(renderer.domElement);
      placeRef.current = () => {};
    };
  }, [net]);

  const setFoldTo = (v: number) => { foldRef.current = v; setFold(v); placeRef.current(v); };
  const play = () => {
    cancelAnimationFrame(rafRef.current);
    const from = foldRef.current, to = from < 1 ? 1 : 0, t0 = performance.now();
    const step = (now: number) => {
      const q = Math.min(1, (now - t0) / (FOLD_SECONDS * 1000 * Math.abs(to - from) || 1));
      setFoldTo(from + (to - from) * q * q * (3 - 2 * q));
      if (q < 1) rafRef.current = requestAnimationFrame(step);
    };
    rafRef.current = requestAnimationFrame(step);
  };
  useEffect(() => () => cancelAnimationFrame(rafRef.current), []);

  const download = () => {
    const spec = getAnySpec(specId);
    if (!net || !spec) return;
    const name = spec.name.replaceAll('_', ' ');
    const bytes = printableNetPdf(net, { title: name, tabs, credit: 'Polyhedraverse by DICTO - polyhedraverse.vercel.app' });
    const url = URL.createObjectURL(new Blob([bytes], { type: 'application/pdf' }));
    const a = document.createElement('a');
    a.href = url;
    a.download = `${spec.name.toLowerCase()}-net${tabs ? '-tabs' : ''}.pdf`;
    document.body.appendChild(a);
    a.click();
    a.remove();
    setTimeout(() => URL.revokeObjectURL(url), 2000);
  };

  const btn = { background: 'none', border: '1px solid rgba(71,204,36,.35)', color: '#5ee233', borderRadius: 999, padding: '8px 16px', cursor: 'pointer', minHeight: 36 } as const;
  return (
    <div data-testid="net-viewer" style={{ width: '100%', display: 'flex', flexDirection: 'column', gap: 10, alignItems: 'center' }}>
      <div ref={containerRef} style={{ width: '100%', height, borderRadius: 12, overflow: 'hidden', background: '#0a0a10', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#a9f795', fontSize: 13 }}>
        {net === undefined && t('net.unfolding', lang)}
        {net === null && t('net.none', lang)}
      </div>
      {net && (
        <>
          <div style={{ display: 'flex', gap: 10, alignItems: 'center', width: '100%', maxWidth: 380 }}>
            <button type="button" onClick={play} style={btn}>{fold < 1 ? t('net.foldUp', lang) : t('net.unfold', lang)}</button>
            <input
              type="range"
              min={0}
              max={1000}
              value={Math.round(fold * 1000)}
              onChange={(e) => { cancelAnimationFrame(rafRef.current); setFoldTo(Number(e.target.value) / 1000); }}
              aria-label={t('net.fold', lang)}
              style={{ flex: 1, accentColor: '#47cc24' }}
            />
          </div>
          <div style={{ display: 'flex', gap: 10, alignItems: 'center', flexWrap: 'wrap', justifyContent: 'center' }}>
            <label style={{ color: '#a9f795', fontSize: 13, display: 'flex', alignItems: 'center', gap: 6, minHeight: 36 }}>
              <input type="checkbox" checked={tabs} onChange={(e) => setTabs(e.target.checked)} style={{ width: 18, height: 18, accentColor: '#47cc24' }} />
              {t('net.tabs', lang)}
            </label>
            <button type="button" onClick={download} style={{ ...btn, background: '#2e8a17', color: '#04140a', border: 'none', fontWeight: 600 }}>{t('net.download', lang)}</button>
          </div>
          <div style={{ color: '#a9f795', opacity: 0.8, fontSize: 11, textAlign: 'center', maxWidth: 380 }}>{t('net.note', lang, { n: net.faces.length, pairs: net.pairs.length })}</div>
        </>
      )}
    </div>
  );
}
