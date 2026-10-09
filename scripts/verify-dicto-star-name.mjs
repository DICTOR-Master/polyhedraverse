// The running build name recognises DICTO-Star (DISCOVERIES #14) exactly: an icosidodecahedron with
// a dodecahedron on every pentagon and a J63 on every triangle by its all-pentagon-bordered triangle.
import test from 'node:test';
import assert from 'node:assert/strict';
import { POLYHEDRA } from '../krp-core/src/polyhedra/index.js';
import { describeAssembly } from '../krp-core/src/assembly/assemblyNaming.js';

const J63 = 'J63_TRIDIMINISHED_ICOSAHEDRON';
const jf = POLYHEDRA[J63].faces;
const top = jf.findIndex((f) => f.length === 3 && jf.filter((g) => g !== f && f.filter((v) => g.includes(v)).length === 2).every((g) => g.length === 5));
const other = jf.findIndex((f, i) => f.length === 3 && i !== top);
const T = { position: [0, 0, 0], quaternion: [0, 0, 0, 1] };
function build(j63Face, skip = -1) {
  const nodes = [{ id: 'c', shape: 'ICOSIDODECAHEDRON', transform: T }];
  const connections = [];
  POLYHEDRA.ICOSIDODECAHEDRON.faces.forEach((f, i) => {
    if (i === skip) return;
    const id = `k${i}`;
    nodes.push({ id, shape: f.length === 5 ? 'DODECAHEDRON' : J63, transform: T });
    connections.push({ nodeA: 'c', vertexA: i, nodeB: id, vertexB: f.length === 5 ? 0 : j63Face, kind: 'face' });
  });
  return describeAssembly(nodes, connections);
}
test('DICTO-Star is named', () => assert.equal(build(top), 'DICTO-Star'));
test('a J63 on the wrong triangle is not DICTO-Star', () => assert.notEqual(build(other), 'DICTO-Star'));
test('a missing piece is not DICTO-Star', () => assert.notEqual(build(top, 0), 'DICTO-Star'));
