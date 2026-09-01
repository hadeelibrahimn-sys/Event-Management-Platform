/* Carpets and rugs (reference sheet #9, the numbered rug grid).
   Extracted from Designworkspace.jsx.
   Every rug reduces to a floor-hugging surface (rectangular, round, oval,
   or an irregular animal-hide silhouette for faux fur/sheepskin) with a
   deterministic per-vertex height "pile" ripple standing in for shag/
   fluffy/high-pile/bouclé/jute/sisal texture. This is the same
   displaced-grid trick buildCurtainPanel uses for fabric folds, just
   applied to a horizontal surface instead of a vertical one. Patterned
   rugs (border, striped, diamond, chevron, trellis, moroccan, geometric,
   vintage/oriental, modern abstract) get a second thin layer of small flat
   accent shapes sitting just above the pile surface, built from a small
   set of reusable motif generators rather than one bespoke shape per
   variant. Base pile is always tagged "rug". Any accent layer is tagged
   "pattern": two independently colorable parts regardless of shape. */

import * as THREE from "three";

export function pileNoise(x, z, freq) {
  return (Math.sin(x * freq * 3.1 + 0.4) + Math.cos(z * freq * 2.6 + 1.1) + Math.sin((x + z) * freq * 1.7 + 0.9)) / 3;
}

export function buildRugSurface(shape, opts = {}) {
  const {
    w = 1.6, d = 1.0, thickness = 0.02, segs = 22,
    pileAmp = 0, pileFreq = 8, hideLobes = false,
    color = 0xf1ede4, roughness = 0.9,
  } = opts;
  const positions = [];
  const indices = [];
  if (shape === "round" || shape === "oval" || shape === "hide") {
    const ringCount = Math.round(segs * 0.6);
    const radialSegments = segs;
    positions.push(0, thickness + (pileAmp ? pileNoise(0, 0, pileFreq) * pileAmp : 0), 0);
    for (let ri = 1; ri <= ringCount; ri++) {
      const rt = ri / ringCount;
      for (let s = 0; s < radialSegments; s++) {
        const theta = (s / radialSegments) * Math.PI * 2;
        let rad = rt;
        if (shape === "hide") {
          rad *= 1 + 0.1 * Math.cos(theta * 3) + 0.06 * Math.sin(theta * 5 + 0.6) + (hideLobes ? 0.12 * Math.max(0, Math.cos(theta * 4)) : 0);
        }
        const x = Math.cos(theta) * rad, z = Math.sin(theta) * rad;
        const y = thickness + (pileAmp ? pileNoise(x, z, pileFreq) * pileAmp : 0);
        positions.push(x, y, z);
      }
    }
    for (let s = 0; s < radialSegments; s++) {
      const b = 1 + s, c = 1 + ((s + 1) % radialSegments);
      indices.push(0, c, b);
    }
    for (let ri = 1; ri < ringCount; ri++) {
      const base0 = 1 + (ri - 1) * radialSegments;
      const base1 = 1 + ri * radialSegments;
      for (let s = 0; s < radialSegments; s++) {
        const s2 = (s + 1) % radialSegments;
        const a = base0 + s, b = base1 + s, c = base0 + s2, e = base1 + s2;
        indices.push(a, c, b, b, c, e);
      }
    }
    const geo = new THREE.BufferGeometry();
    geo.setAttribute("position", new THREE.Float32BufferAttribute(positions, 3));
    geo.setIndex(indices);
    geo.computeVertexNormals();
    const mesh = new THREE.Mesh(geo, new THREE.MeshStandardMaterial({ color, roughness, side: THREE.DoubleSide }));
    mesh.scale.set(w / 2, 1, d / 2);
    mesh.userData.part = "rug";
    return mesh;
  }
  // Rectangular grid, also used for square, runner, and extra-long-runner (just different w/d).
  const cols = segs, rows = Math.max(6, Math.round(segs * (d / w)));
  const idx = (i, j) => j * (cols + 1) + i;
  for (let j = 0; j <= rows; j++) {
    const vz = (j / rows - 0.5) * d;
    for (let i = 0; i <= cols; i++) {
      const vx = (i / cols - 0.5) * w;
      const y = thickness + (pileAmp ? pileNoise(vx, vz, pileFreq) * pileAmp : 0);
      positions.push(vx, y, vz);
    }
  }
  for (let j = 0; j < rows; j++) {
    for (let i = 0; i < cols; i++) {
      const a = idx(i, j), b = idx(i + 1, j), c = idx(i, j + 1), e = idx(i + 1, j + 1);
      indices.push(a, c, b, b, c, e);
    }
  }
  const geo = new THREE.BufferGeometry();
  geo.setAttribute("position", new THREE.Float32BufferAttribute(positions, 3));
  geo.setIndex(indices);
  geo.computeVertexNormals();
  const mesh = new THREE.Mesh(geo, new THREE.MeshStandardMaterial({ color, roughness, side: THREE.DoubleSide }));
  mesh.userData.part = "rug";
  return mesh;
}

/* Rug pattern-accent motif generators.
   Small flat shapes tagged "pattern", sitting a hair above the pile
   surface. Reused across several catalog variants with different spacing/
   scale rather than one-off per pattern, same reasoning as VASE_STYLES. */
export function patMat(color) { return new THREE.MeshStandardMaterial({ color, roughness: 0.85 }); }

export function buildBorderFrame(w, d, inset, lineW, color, y) {
  const g = new THREE.Group();
  const iw = w - inset * 2, id = d - inset * 2;
  const mk = (bw, bd, x, z) => {
    const m = new THREE.Mesh(new THREE.BoxGeometry(bw, 0.004, bd), patMat(color));
    m.position.set(x, y, z); m.userData.part = "pattern"; g.add(m);
  };
  mk(iw, lineW, 0, -id / 2); mk(iw, lineW, 0, id / 2);
  mk(lineW, id, -iw / 2, 0); mk(lineW, id, iw / 2, 0);
  return g;
}

export function buildStripes(w, d, count, stripeW, color, y) {
  const g = new THREE.Group();
  const spacing = w / (count + 1);
  for (let i = 1; i <= count; i++) {
    const m = new THREE.Mesh(new THREE.BoxGeometry(stripeW, 0.004, d * 0.94), patMat(color));
    m.position.set(-w / 2 + spacing * i, y, 0); m.userData.part = "pattern";
    g.add(m);
  }
  return g;
}

export function buildDiamondLattice(w, d, cellSize, lineW, color, y) {
  const g = new THREE.Group();
  const half = cellSize * 0.42;
  const cols = Math.round(w / cellSize), rows = Math.round(d / cellSize);
  for (let i = -cols; i <= cols; i++) {
    for (let j = -rows; j <= rows; j++) {
      const cx = i * cellSize, cz = j * cellSize;
      if (Math.abs(cx) > w / 2 - cellSize * 0.3 || Math.abs(cz) > d / 2 - cellSize * 0.3) continue;
      [{ dx: half / 2, dz: -half / 2, rot: 45 }, { dx: half / 2, dz: half / 2, rot: -45 },
       { dx: -half / 2, dz: half / 2, rot: 45 }, { dx: -half / 2, dz: -half / 2, rot: -45 }].forEach(o => {
        const seg = new THREE.Mesh(new THREE.BoxGeometry(lineW, 0.004, half), patMat(color));
        seg.rotation.y = THREE.MathUtils.degToRad(o.rot);
        seg.position.set(cx + o.dx, y, cz + o.dz);
        seg.userData.part = "pattern";
        g.add(seg);
      });
    }
  }
  return g;
}

export function buildChevronPattern(w, d, rowH, lineW, color, y) {
  const g = new THREE.Group();
  const rows = Math.round(d / rowH);
  const zigW = 0.16;
  const legLen = Math.sqrt(zigW * zigW + (rowH * 0.4) ** 2);
  const ang = Math.atan2(zigW, rowH * 0.4);
  for (let r = -rows; r <= rows; r++) {
    const rz = r * rowH;
    if (Math.abs(rz) > d / 2 - rowH * 0.4) continue;
    for (let cx = -w / 2 + zigW; cx < w / 2 - zigW; cx += zigW * 2) {
      const left = new THREE.Mesh(new THREE.BoxGeometry(lineW, 0.004, legLen), patMat(color));
      left.rotation.y = ang; left.position.set(cx, y, rz); left.userData.part = "pattern";
      g.add(left);
      const right = new THREE.Mesh(new THREE.BoxGeometry(lineW, 0.004, legLen), patMat(color));
      right.rotation.y = -ang; right.position.set(cx + zigW, y, rz); right.userData.part = "pattern";
      g.add(right);
    }
  }
  return g;
}

export function buildArcBands(w, d, count, color, y, offsetX, offsetZ) {
  const g = new THREE.Group();
  const maxR = Math.min(w, d) * 0.48;
  for (let i = 0; i < count; i++) {
    const r = maxR * (0.28 + 0.72 * i / Math.max(1, count - 1));
    const arc = new THREE.Mesh(new THREE.TorusGeometry(r, 0.006, 6, 28, Math.PI * (0.5 + 0.15 * (i % 2))), patMat(color));
    arc.rotation.x = Math.PI / 2;
    arc.rotation.z = i % 2 === 0 ? 0 : Math.PI * 0.5;
    arc.position.set(offsetX, y, offsetZ);
    arc.userData.part = "pattern";
    g.add(arc);
  }
  return g;
}

export function buildMedallionPattern(w, d, color, y, dense) {
  const g = new THREE.Group();
  g.add(buildBorderFrame(w, d, Math.min(w, d) * 0.08, 0.012, color, y));
  if (dense) g.add(buildBorderFrame(w, d, Math.min(w, d) * 0.16, 0.008, color, y));
  const ring1 = new THREE.Mesh(new THREE.RingGeometry(0.09, 0.11, 28), new THREE.MeshStandardMaterial({ color, roughness: 0.85, side: THREE.DoubleSide }));
  ring1.rotation.x = -Math.PI / 2; ring1.position.y = y; ring1.userData.part = "pattern";
  g.add(ring1);
  if (dense) {
    const ring2 = new THREE.Mesh(new THREE.RingGeometry(0.16, 0.175, 28), new THREE.MeshStandardMaterial({ color, roughness: 0.85, side: THREE.DoubleSide }));
    ring2.rotation.x = -Math.PI / 2; ring2.position.y = y; ring2.userData.part = "pattern";
    g.add(ring2);
  }
  [[1, 1], [1, -1], [-1, 1], [-1, -1]].forEach(([sx, sz]) => {
    const corner = new THREE.Mesh(new THREE.RingGeometry(0.06, 0.075, 16, 1, 0, Math.PI / 2), new THREE.MeshStandardMaterial({ color, roughness: 0.85, side: THREE.DoubleSide }));
    corner.rotation.x = -Math.PI / 2;
    corner.rotation.z = sx * sz > 0 ? Math.PI : Math.PI / 2 * (sx > 0 ? -1 : 3);
    corner.position.set(sx * (w / 2 - 0.16), y, sz * (d / 2 - 0.16));
    corner.userData.part = "pattern";
    g.add(corner);
  });
  return g;
}

// Every rug gets its own saturated, clearly-distinct default color. The
// original cream/ivory family read almost identically across all 25 in the
// catalog list, so each one now carries a real hue instead.
export const RUG_STYLES = {
  "plain-rectangular": { shape: "rect", w: 1.6, d: 1.0, color: 0xc1666b },
  shaggy:              { shape: "rect", w: 1.6, d: 1.0, pileAmp: 0.02,  pileFreq: 14, color: 0xd4a373, roughness: 0.98 },
  fluffy:               { shape: "rect", w: 1.6, d: 1.0, pileAmp: 0.014, pileFreq: 8,  color: 0xe8b4bc, roughness: 0.95 },
  "low-pile":           { shape: "rect", w: 1.6, d: 1.0, pileAmp: 0.004, pileFreq: 20, color: 0x7d8f69, roughness: 0.85 },
  "high-pile":          { shape: "rect", w: 1.6, d: 1.0, pileAmp: 0.028, pileFreq: 10, color: 0x6b8ba4, roughness: 0.98 },
  round:                { shape: "round", w: 1.6, d: 1.6, pileAmp: 0.005, pileFreq: 12, color: 0xb56576 },
  oval:                 { shape: "oval",  w: 1.7, d: 1.1, pileAmp: 0.005, pileFreq: 12, color: 0x588157 },
  runner:               { shape: "rect", w: 0.85, d: 2.6, pileAmp: 0.005, pileFreq: 14, color: 0xbc6c25 },
  "extra-long-runner":  { shape: "rect", w: 0.8,  d: 3.6, pileAmp: 0.006, pileFreq: 12, color: 0x6d597a },
  square:               { shape: "rect", w: 1.3,  d: 1.3, pileAmp: 0.004, pileFreq: 16, color: 0x457b9d },
  "faux-fur":           { shape: "hide", w: 1.1,  d: 1.6, pileAmp: 0.03,  pileFreq: 22, color: 0xe0a458, roughness: 0.98 },
  sheepskin:            { shape: "hide", w: 0.9,  d: 1.2, pileAmp: 0.024, pileFreq: 18, hideLobes: true, color: 0xc08497, roughness: 0.98 },
  boucle:                { shape: "rect", w: 1.5, d: 1.0, pileAmp: 0.012, pileFreq: 26, color: 0x9c8aa5, roughness: 0.92 },
  "woven-jute-style":   { shape: "rect", w: 1.5, d: 1.0, pileAmp: 0.006, pileFreq: 30, color: 0x9c6b3f, roughness: 0.95 },
  "sisal-style":        { shape: "rect", w: 1.5, d: 1.0, pileAmp: 0.005, pileFreq: 34, color: 0xba9455, roughness: 0.95 },
  "vintage-pattern":    { shape: "rect", w: 1.5, d: 1.0, pileAmp: 0.003, pileFreq: 16, color: 0x8d5b4c, pattern: "medallion", patternColor: 0x6b4238 },
  "oriental-pattern":   { shape: "rect", w: 1.5, d: 1.0, pileAmp: 0.003, pileFreq: 16, color: 0x4a5859, pattern: "medallion-dense", patternColor: 0x33403f },
  "modern-abstract":    { shape: "rect", w: 1.5, d: 1.0, pileAmp: 0.002, pileFreq: 16, color: 0x3d5a80, pattern: "arc-abstract", patternColor: 0x293e58 },
  geometric:             { shape: "rect", w: 1.5, d: 1.0, pileAmp: 0.002, pileFreq: 16, color: 0xee6c4d, pattern: "arc-geometric", patternColor: 0xc94f34 },
  "moroccan-style":     { shape: "rect", w: 1.5, d: 1.0, pileAmp: 0.003, pileFreq: 16, color: 0x7b2d43, pattern: "lattice-moroccan", patternColor: 0x5c1f31 },
  "trellis-pattern":    { shape: "rect", w: 1.5, d: 1.0, pileAmp: 0.003, pileFreq: 16, color: 0x386641, pattern: "lattice-trellis", patternColor: 0x274a2d },
  striped:               { shape: "rect", w: 1.5, d: 1.0, pileAmp: 0.003, pileFreq: 16, color: 0x2a6f77, pattern: "stripe", patternColor: 0xeae2b7 },
  "diamond-pattern":    { shape: "rect", w: 1.5, d: 1.0, pileAmp: 0.003, pileFreq: 16, color: 0x6a4c93, pattern: "lattice-diamond", patternColor: 0x4a3569 },
  chevron:               { shape: "rect", w: 1.5, d: 1.0, pileAmp: 0.002, pileFreq: 16, color: 0x2b9348, pattern: "chevron", patternColor: 0x1f6b34 },
  "border-design":      { shape: "rect", w: 1.5, d: 1.0, pileAmp: 0.002, pileFreq: 16, color: 0x8b2635, pattern: "border", patternColor: 0x641a26 },
};

/* Assembles a full rug (pile surface plus optional pattern accent layer)
   from the RUG_STYLES table for a given variant id. */
export function buildRug(variant) {
  const style = RUG_STYLES[variant] || RUG_STYLES["plain-rectangular"];
  const g = new THREE.Group();
  const { shape, w, d, pileAmp, pileFreq, hideLobes, color, roughness } = style;
  const surface = buildRugSurface(shape, { w, d, pileAmp, pileFreq, hideLobes, color, roughness: roughness ?? 0.9 });
  g.add(surface);
  if (style.pattern) {
    const y = 0.021;
    const pc = style.patternColor ?? 0xd8cfbb;
    if (style.pattern === "border") g.add(buildBorderFrame(w, d, Math.min(w, d) * 0.1, 0.012, pc, y));
    else if (style.pattern === "stripe") g.add(buildStripes(w, d, 7, 0.03, pc, y));
    else if (style.pattern === "lattice-diamond") g.add(buildDiamondLattice(w, d, 0.28, 0.012, pc, y));
    else if (style.pattern === "lattice-trellis") g.add(buildDiamondLattice(w, d, 0.4, 0.018, pc, y));
    else if (style.pattern === "lattice-moroccan") g.add(buildDiamondLattice(w, d, 0.2, 0.01, pc, y));
    else if (style.pattern === "chevron") g.add(buildChevronPattern(w, d, 0.18, 0.014, pc, y));
    else if (style.pattern === "arc-geometric") g.add(buildArcBands(w, d, 6, pc, y, -w * 0.12, -d * 0.08));
    else if (style.pattern === "arc-abstract") g.add(buildArcBands(w, d, 4, pc, y, w * 0.1, d * 0.05));
    else if (style.pattern === "medallion") g.add(buildMedallionPattern(w, d, pc, y, false));
    else if (style.pattern === "medallion-dense") g.add(buildMedallionPattern(w, d, pc, y, true));
  }
  return g;
}
