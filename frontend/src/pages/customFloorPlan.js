/* Tile-based floor plan model for the in-3D Custom Layout builder.
   Pure logic, no Three.js/React dependency — easy to reason about and test.

   A room is a set of occupied 1-tile cells on an integer grid (i, j).
   Walls are derived automatically from tile occupancy: any edge between an
   occupied tile and an unoccupied (or out-of-bounds) neighbor becomes a
   boundary wall. Consecutive collinear boundary edges are merged into a
   single wall segment for rendering/editing, splitting at any door. */

export const TILE_SIZE = 2; // meters

export const tileKey = (i, j) => `${i},${j}`;
export const parseTileKey = (k) => {
  const [i, j] = k.split(",").map(Number);
  return { i, j };
};

/* Default starting footprint — a rectangle roughly matching the width/length
   chosen on the Layout step, centered on the origin. */
export function initialTiles(width, length) {
  const halfI = Math.max(1, Math.round(width / TILE_SIZE / 2));
  const halfJ = Math.max(1, Math.round(length / TILE_SIZE / 2));
  const tiles = [];
  for (let i = -halfI; i < halfI; i++) {
    for (let j = -halfJ; j < halfJ; j++) {
      tiles.push(tileKey(i, j));
    }
  }
  return tiles;
}

export function tileWorldCenter(i, j) {
  return { x: (i + 0.5) * TILE_SIZE, z: (j + 0.5) * TILE_SIZE };
}

const DIRS = [
  { dir: "N", di: 0, dj: -1 },
  { dir: "S", di: 0, dj: 1 },
  { dir: "E", di: 1, dj: 0 },
  { dir: "W", di: -1, dj: 0 },
];

function edgeForSide(i, j, dir) {
  const x0 = i * TILE_SIZE, x1 = (i + 1) * TILE_SIZE;
  const z0 = j * TILE_SIZE, z1 = (j + 1) * TILE_SIZE;
  let x1p, z1p, x2p, z2p;
  if (dir === "N")      { x1p = x0; z1p = z0; x2p = x1; z2p = z0; }
  else if (dir === "S") { x1p = x0; z1p = z1; x2p = x1; z2p = z1; }
  else if (dir === "W") { x1p = x0; z1p = z0; x2p = x0; z2p = z1; }
  else /* E */          { x1p = x1; z1p = z0; x2p = x1; z2p = z1; }
  return { key: `${i},${j},${dir}`, i, j, dir, x1: x1p, z1: z1p, x2: x2p, z2: z2p };
}

/* All boundary edges (unmerged, one per exposed tile side) */
export function computeBoundaryEdges(tileSet) {
  const edges = [];
  tileSet.forEach(key => {
    const { i, j } = parseTileKey(key);
    DIRS.forEach(({ dir, di, dj }) => {
      if (!tileSet.has(tileKey(i + di, j + dj))) edges.push(edgeForSide(i, j, dir));
    });
  });
  return edges;
}

/* Tiles adjacent to the current footprint that could be added next */
export function frontierTiles(tileSet) {
  const frontier = new Set();
  tileSet.forEach(key => {
    const { i, j } = parseTileKey(key);
    DIRS.forEach(({ di, dj }) => {
      const nKey = tileKey(i + di, j + dj);
      if (!tileSet.has(nKey)) frontier.add(nKey);
    });
  });
  return Array.from(frontier);
}

/* BFS reachability — true if every tile in the set can be reached from
   every other tile through 4-directional neighbors. Used to block removing
   a tile that would split the room into two disconnected pieces; walls
   render fine either way (computeBoundaryEdges/mergeEdgesIntoSegments don't
   care about connectivity), but a floating second room isn't a shape anyone
   building this actually wants, so it's stopped at the removal step rather
   than allowed to render and confuse people. */
export function isConnected(tileKeys) {
  const keys = Array.isArray(tileKeys) ? tileKeys : Array.from(tileKeys);
  if (keys.length <= 1) return true;
  const set = new Set(keys);
  const seen = new Set([keys[0]]);
  const stack = [keys[0]];
  while (stack.length) {
    const k = stack.pop();
    const { i, j } = parseTileKey(k);
    DIRS.forEach(({ di, dj }) => {
      const nk = tileKey(i + di, j + dj);
      if (set.has(nk) && !seen.has(nk)) { seen.add(nk); stack.push(nk); }
    });
  }
  return seen.size === keys.length;
}

/* Merge collinear, contiguous boundary edges into wall segments.
   A run breaks wherever an edge has a door or a window — that edge becomes
   its own single-edge "door"/"window" segment instead of merging with its
   neighbors (an edge is never both — callers are expected to keep the two
   key sets disjoint). */
export function mergeEdgesIntoSegments(edges, doorEdgeKeys, windowEdgeKeys) {
  const isDoor = (key) => doorEdgeKeys && doorEdgeKeys.has(key);
  const isWindow = (key) => windowEdgeKeys && windowEdgeKeys.has(key);
  const segments = [];

  const pushRun = (run) => { if (run) segments.push(run); };

  // Horizontal edges (N/S sides) run along x at a fixed z
  const byZ = {};
  edges.filter(e => e.z1 === e.z2).forEach(e => (byZ[e.z1] = byZ[e.z1] || []).push(e));
  Object.values(byZ).forEach(group => {
    group.sort((a, b) => a.x1 - b.x1);
    let run = null;
    group.forEach(e => {
      if (isDoor(e.key) || isWindow(e.key)) {
        pushRun(run); run = null;
        segments.push({
          x1: e.x1, z1: e.z1, x2: e.x2, z2: e.z1, edgeKeys: [e.key], orientation: "h",
          isDoor: isDoor(e.key), isWindow: isWindow(e.key),
        });
        return;
      }
      if (run && e.x1 === run.x2) { run.x2 = e.x2; run.edgeKeys.push(e.key); }
      else { pushRun(run); run = { x1: e.x1, z1: e.z1, x2: e.x2, z2: e.z1, edgeKeys: [e.key], orientation: "h" }; }
    });
    pushRun(run);
  });

  // Vertical edges (E/W sides) run along z at a fixed x
  const byX = {};
  edges.filter(e => e.x1 === e.x2).forEach(e => (byX[e.x1] = byX[e.x1] || []).push(e));
  Object.values(byX).forEach(group => {
    group.sort((a, b) => a.z1 - b.z1);
    let run = null;
    group.forEach(e => {
      if (isDoor(e.key) || isWindow(e.key)) {
        pushRun(run); run = null;
        segments.push({
          x1: e.x1, z1: e.z1, x2: e.x1, z2: e.z2, edgeKeys: [e.key], orientation: "v",
          isDoor: isDoor(e.key), isWindow: isWindow(e.key),
        });
        return;
      }
      if (run && e.z1 === run.z2) { run.z2 = e.z2; run.edgeKeys.push(e.key); }
      else { pushRun(run); run = { x1: e.x1, z1: e.z1, x2: e.x1, z2: e.z2, edgeKeys: [e.key], orientation: "v" }; }
    });
    pushRun(run);
  });

  return segments.map(s => ({ ...s, id: `${s.orientation}-${s.edgeKeys[0]}` }));
}

/* Nearest edge key within a segment to a given world point — used to know
   which specific 1-tile edge a door/window toggle should apply to. */
export function nearestEdgeInSegment(segment, x, z) {
  if (segment.isDoor || segment.isWindow) return segment.edgeKeys[0];
  const edges = [];
  const len = segment.orientation === "h" ? segment.x2 - segment.x1 : segment.z2 - segment.z1;
  const count = Math.round(len / TILE_SIZE);
  for (let k = 0; k < count; k++) {
    if (segment.orientation === "h") {
      edges.push({ key: segment.edgeKeys[k], cx: segment.x1 + (k + 0.5) * TILE_SIZE, cz: segment.z1 });
    } else {
      edges.push({ key: segment.edgeKeys[k], cx: segment.x1, cz: segment.z1 + (k + 0.5) * TILE_SIZE });
    }
  }
  let best = edges[0];
  let bestD = Infinity;
  edges.forEach(e => {
    const d = Math.hypot(e.cx - x, e.cz - z);
    if (d < bestD) { bestD = d; best = e; }
  });
  return best?.key;
}
