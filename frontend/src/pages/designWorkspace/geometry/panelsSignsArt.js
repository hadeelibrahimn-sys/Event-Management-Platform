/* Backdrop panels, welcome signs and wall art (reference sheet #10).
   Extracted from Designworkspace.jsx.
   Panels/signs reuse the arch/fluted-panel builders already defined above
   for the coffee-corner backdrops. The handful of silhouettes those don't
   cover (a corner-rounded or diagonally-cut panel, a wavy top edge) go
   through buildFlatPolygonPanel: an explicit list of {x,y} outline points
   placed by hand, with front/back/sides extruded manually, rather than
   guessing a THREE.Shape arc's sweep direction. Same reasoning as the
   verified winding used for the rug/table grids above, with DoubleSide
   left on as a safety net either way. Every panel/sign/art piece stands
   with its base at y=0, matching every other floor-placed catalog item.
   Welcome signs (and panels) additionally hook into the existing
   BRANDABLE_TYPES/BRANDING_PANEL_POS text system. "Written on" is the
   same vinyl-lettering-texture mechanism the coffee booth's signage
   already uses, just keyed per "type:variant" here since panel heights
   vary so much across the family (see buildBrandingPanel above). */

import * as THREE from "three";
import { buildArchPanel, buildFlutedPanel } from "./branding";
import { buildFlowerCluster, buildLeafSprig } from "./florals";
import { buildCurtainRod, buildCurtainPanel } from "./curtains";

export function buildFlatPolygonPanel(points, depth, color, part) {
  const n = points.length;
  const positions = [];
  const indices = [];
  const hz = depth / 2;
  points.forEach(p => positions.push(p.x, p.y, hz));
  points.forEach(p => positions.push(p.x, p.y, -hz));
  for (let i = 1; i < n - 1; i++) {
    indices.push(0, i, i + 1);
    indices.push(n, n + i + 1, n + i);
  }
  for (let i = 0; i < n; i++) {
    const j = (i + 1) % n;
    const a = i, b = j, c = n + i, e = n + j;
    indices.push(a, c, b, b, c, e);
  }
  const geo = new THREE.BufferGeometry();
  geo.setAttribute("position", new THREE.Float32BufferAttribute(positions, 3));
  geo.setIndex(indices);
  geo.computeVertexNormals();
  const mesh = new THREE.Mesh(geo, new THREE.MeshStandardMaterial({ color, side: THREE.DoubleSide }));
  mesh.userData.part = part;
  return mesh;
}

export function outlineAngled(w, h, cut) {
  const hw = w / 2;
  return [{ x: -hw, y: 0 }, { x: hw, y: 0 }, { x: hw, y: h - cut }, { x: hw - cut, y: h }, { x: -hw, y: h }];
}

// A quarter-circle-rounded corner (top-right). A small r reads as a
// gently curved corner, and an r close to min(w,h) reads as a full "half
// arch" rainbow silhouette, so this one generator covers both variants.
export function outlineCurvedCorner(w, h, r, segs = 10) {
  const hw = w / 2;
  const rc = Math.min(r, h, w);
  const pts = [{ x: -hw, y: 0 }, { x: hw, y: 0 }, { x: hw, y: h - rc }];
  for (let i = 0; i <= segs; i++) {
    const t = (i / segs) * (Math.PI / 2);
    pts.push({ x: hw - rc + Math.cos(t) * rc, y: (h - rc) + Math.sin(t) * rc });
  }
  pts.push({ x: -hw, y: h });
  return pts;
}

export function outlineWavyTop(w, h, amp, waves, segs = 16) {
  const hw = w / 2;
  const pts = [{ x: -hw, y: 0 }, { x: hw, y: 0 }];
  for (let i = segs; i >= 0; i--) {
    const t = i / segs;
    pts.push({ x: -hw + t * w, y: h + Math.sin(t * Math.PI * waves) * amp });
  }
  return pts;
}

// N thin blades all pivoting from a shared bottom-center hinge, fanned out
// across `spreadDeg`. The standard "spread around a shared axis" rotation
// technique (wheel spokes, hand fans), not a custom shape, so no winding
// risk at all.
export function buildFanPanel(bladeW, bladeH, thickness, count, spreadDeg, offset, color, part) {
  const g = new THREE.Group();
  const startAngle = -THREE.MathUtils.degToRad(spreadDeg) / 2;
  const step = count > 1 ? THREE.MathUtils.degToRad(spreadDeg) / (count - 1) : 0;
  for (let i = 0; i < count; i++) {
    const pivot = new THREE.Group();
    pivot.rotation.y = startAngle + step * i;
    const blade = new THREE.Mesh(new THREE.BoxGeometry(bladeW, bladeH, thickness), new THREE.MeshStandardMaterial({ color }));
    blade.position.set(0, bladeH / 2, offset);
    blade.userData.part = part;
    pivot.add(blade);
    g.add(pivot);
  }
  return g;
}

// Each panel/backdrop shape gets its own visible default hue instead of
// the shared cream family, same rationale as the rug and stage tables above.
export const PANEL_STYLES = {
  arch:            { kind: "arch", w: 0.9, h: 1.85, d: 0.09, color: 0xb5654f },
  "double-arch":   { kind: "double-arch", w: 1.3, h: 1.75, d: 0.09, color: 0x4f7c8c, footW: 1.3 },
  wave:            { kind: "wave", w: 1.0, h: 1.9, d: 0.09, ribs: 16, color: 0x6b4e71 },
  circle:          { kind: "circle", r: 0.55, d: 0.08, color: 0x4a7c59, footW: 1.15 },
  "tall-rounded":  { kind: "tall-rounded", w: 0.85, h: 2.3, d: 0.09, color: 0xa15c3e, footW: 1.0 },
  layered:         { kind: "layered", w: 1.1, h: 1.6, d: 0.09, color: 0x3d6b8a },
  fan:             { kind: "fan", bladeW: 0.16, h: 1.7, bladeD: 0.03, count: 9, color: 0x8c5a8e, footW: 1.3 },
  scallop:         { kind: "scallop", w: 1.2, h: 1.5, d: 0.08, color: 0xc2703f },
  square:          { kind: "flat", w: 1.0, h: 1.3, d: 0.08, color: 0x567a4e },
  "classic-wall":  { kind: "classic-wall", w: 1.0, h: 1.6, d: 0.06, color: 0x7a4f3d },
  slatted:         { kind: "slatted", w: 1.0, h: 1.7, d: 0.1, ribs: 14, color: 0x4e6b5e },
  grid:            { kind: "grid", w: 1.0, h: 1.6, d: 0.03, cols: 5, rows: 6, color: 0x6e4a5c },
  acrylic:         { kind: "acrylic", w: 0.9, h: 1.5, d: 0.04, color: 0x7fb3bd },
  "half-arch":     { kind: "curved-corner", w: 1.0, h: 1.8, d: 0.09, r: 1.7, color: 0xa3773f },
  "curved-corner": { kind: "curved-corner", w: 1.0, h: 1.5, d: 0.08, r: 0.22, color: 0x5c6e8a },
  angled:          { kind: "angled", w: 1.0, h: 1.6, d: 0.08, cut: 0.4, color: 0x8a4e4e },
};

export function buildBackdropPanel(variant) {
  const style = PANEL_STYLES[variant] || PANEL_STYLES.arch;
  const g = new THREE.Group();
  const color = style.color ?? 0xf1ede4;
  const footW = style.footW ?? style.w ?? (style.r ? style.r * 2 : 1.0);
  const base = new THREE.Mesh(new THREE.BoxGeometry(Math.max(0.3, footW * 0.55), 0.04, (style.d || 0.08) * 3), new THREE.MeshStandardMaterial({ color: 0x4a4a4a }));
  base.position.y = 0.02; base.userData.part = "panel";
  g.add(base);
  const wrap = new THREE.Group(); wrap.position.y = 0.04; g.add(wrap);

  if (style.kind === "arch") {
    wrap.add(buildArchPanel(style.w, style.h, style.d, color, "panel"));
  } else if (style.kind === "double-arch") {
    const widths = [style.w * 0.34, style.w * 0.34, style.w * 0.34];
    const heights = [style.h * 0.82, style.h, style.h * 0.82];
    const xs = [-style.w * 0.34, 0, style.w * 0.34];
    widths.forEach((ww, i) => {
      const arch = buildArchPanel(ww, heights[i], style.d, color, "panel");
      arch.position.set(xs[i], 0, i % 2 === 0 ? -0.01 : 0.01);
      wrap.add(arch);
    });
  } else if (style.kind === "wave") {
    const ribCount = style.ribs || 16;
    const ribR = (style.w / ribCount) / 2;
    for (let i = 0; i < ribCount; i++) {
      const t = i / (ribCount - 1);
      const ribH = style.h * (0.75 + 0.25 * Math.sin(t * Math.PI));
      const rib = new THREE.Mesh(new THREE.CylinderGeometry(ribR, ribR, ribH, 8), new THREE.MeshStandardMaterial({ color }));
      rib.position.set(-style.w / 2 + ribR + i * ribR * 2, ribH / 2, Math.sin(t * Math.PI * 1.4) * style.d * 1.8);
      rib.userData.part = "panel";
      wrap.add(rib);
    }
  } else if (style.kind === "circle") {
    const disc = new THREE.Mesh(new THREE.CylinderGeometry(style.r, style.r, style.d, 40), new THREE.MeshStandardMaterial({ color }));
    disc.rotation.x = Math.PI / 2; disc.position.y = style.r; disc.userData.part = "panel";
    wrap.add(disc);
  } else if (style.kind === "tall-rounded") {
    const back = buildArchPanel(style.w * 0.9, style.h * 0.88, style.d, color, "panel");
    back.position.set(-0.18, 0, -0.03);
    wrap.add(back);
    const front = buildArchPanel(style.w, style.h, style.d, color, "panel");
    front.position.set(0.1, 0, 0.02);
    wrap.add(front);
  } else if (style.kind === "layered") {
    for (let i = 0; i < 3; i++) {
      const ww = style.w * (0.4 - i * 0.02);
      const hh = style.h * (0.6 + i * 0.2);
      const panel = new THREE.Mesh(new THREE.BoxGeometry(ww, hh, style.d), new THREE.MeshStandardMaterial({ color }));
      panel.position.set(-style.w * 0.32 + i * style.w * 0.32, hh / 2, -i * 0.025);
      panel.userData.part = "panel";
      wrap.add(panel);
    }
  } else if (style.kind === "fan") {
    wrap.add(buildFanPanel(style.bladeW, style.h, style.bladeD, style.count, 110, style.h * 0.4, color, "panel"));
  } else if (style.kind === "scallop") {
    const n = 5;
    for (let i = 0; i < n; i++) {
      const t = i / (n - 1);
      const ww = style.w / n * 0.92;
      const hh = style.h * (0.72 + 0.28 * Math.sin(t * Math.PI));
      const arch = buildArchPanel(ww, hh, style.d, color, "panel");
      arch.position.x = -style.w / 2 + ww / 2 + i * (style.w / n);
      wrap.add(arch);
    }
  } else if (style.kind === "flat") {
    const panel = new THREE.Mesh(new THREE.BoxGeometry(style.w, style.h, style.d), new THREE.MeshStandardMaterial({ color }));
    panel.position.y = style.h / 2; panel.userData.part = "panel";
    wrap.add(panel);
  } else if (style.kind === "classic-wall") {
    const back = new THREE.Mesh(new THREE.BoxGeometry(style.w, style.h, style.d * 0.5), new THREE.MeshStandardMaterial({ color }));
    back.position.y = style.h / 2; back.userData.part = "panel";
    wrap.add(back);
    const inset = new THREE.Mesh(new THREE.BoxGeometry(style.w * 0.7, style.h * 0.34, style.d), new THREE.MeshStandardMaterial({ color }));
    inset.position.set(0, style.h * 0.52, style.d * 0.25); inset.userData.part = "panel";
    wrap.add(inset);
  } else if (style.kind === "slatted") {
    wrap.add(buildFlutedPanel(style.w, style.h, color, "panel", style.ribs || 14));
  } else if (style.kind === "grid") {
    const cols = style.cols || 5, rows = style.rows || 6, barT = 0.025;
    for (let i = 0; i <= cols; i++) {
      const bar = new THREE.Mesh(new THREE.BoxGeometry(barT, style.h, style.d), new THREE.MeshStandardMaterial({ color }));
      bar.position.set(-style.w / 2 + i * (style.w / cols), style.h / 2, 0); bar.userData.part = "panel";
      wrap.add(bar);
    }
    for (let j = 0; j <= rows; j++) {
      const bar = new THREE.Mesh(new THREE.BoxGeometry(style.w, barT, style.d), new THREE.MeshStandardMaterial({ color }));
      bar.position.set(0, j * (style.h / rows), 0); bar.userData.part = "panel";
      wrap.add(bar);
    }
  } else if (style.kind === "acrylic") {
    const panel = new THREE.Mesh(new THREE.BoxGeometry(style.w, style.h, style.d), new THREE.MeshStandardMaterial({ color, transparent: true, opacity: 0.35, roughness: 0.05 }));
    panel.position.y = style.h / 2; panel.userData.part = "panel";
    wrap.add(panel);
  } else if (style.kind === "curved-corner") {
    wrap.add(buildFlatPolygonPanel(outlineCurvedCorner(style.w, style.h, style.r), style.d, color, "panel"));
  } else if (style.kind === "angled") {
    wrap.add(buildFlatPolygonPanel(outlineAngled(style.w, style.h, style.cut || 0.35), style.d, color, "panel"));
  }
  return g;
}

export function buildStandLeg(h, tiltDeg, side, color) {
  const leg = new THREE.Mesh(new THREE.CylinderGeometry(0.014, 0.018, h, 8), new THREE.MeshStandardMaterial({ color, metalness: 0.3, roughness: 0.4 }));
  leg.position.set(side * h * 0.12, h / 2, h * 0.06);
  leg.rotation.z = -side * THREE.MathUtils.degToRad(tiltDeg);
  leg.userData.part = "stand";
  return leg;
}

export const SIGN_STYLES = {
  "acrylic-arch":   { kind: "arch-stand", w: 0.75, h: 1.55, d: 0.03, legH: 0.35, color: 0x6fa8b5, opacity: 0.4, floral: { side: -1, size: 1 } },
  mirror:           { kind: "arch-stand", w: 0.8,  h: 1.7,  d: 0.03, legH: 0.35, color: 0x8fae9e, metal: true, floral: { side: -1, size: 1.5 } },
  "minimal-arch":   { kind: "arch-stand", w: 0.7,  h: 1.5,  d: 0.06, legH: 0,    color: 0xb0724f, floral: { side: 1, size: 0.9 } },
  round:            { kind: "round-stand", r: 0.42, d: 0.05, legH: 0.55, color: 0x6a4c7a, floral: { side: -1, size: 1 } },
  "modern-wave":    { kind: "wave-stand", w: 0.72, h: 1.5, d: 0.05, amp: 0.09, waves: 1, color: 0x4a7d6e, floral: { side: 0, size: 0.9 } },
  "hanging-fabric": { kind: "hanging", w: 0.7, dropH: 1.3, rodY: 1.85, color: 0xb0567a },
  "wooden-arch":    { kind: "arch-stand", w: 0.75, h: 1.55, d: 0.06, legH: 0.4, tripod: true, color: 0xa9754a, floral: { side: -1, size: 1 } },
  "clear-frame":    { kind: "frame-stand", w: 0.75, h: 1.5, legH: 0.35, color: 0x7a93b8, opacity: 0.35, frameColor: 0xC9A44C },
};

export function buildWelcomeSign(variant) {
  const style = SIGN_STYLES[variant] || SIGN_STYLES["minimal-arch"];
  const g = new THREE.Group();
  const color = style.color ?? 0xf1ede4;

  if (style.kind === "arch-stand") {
    const legH = style.legH || 0;
    const face = buildArchPanel(style.w, style.h, style.d, color, "panel");
    face.position.y = legH;
    // buildArchPanel always builds plain opaque material. The mirror/
    // acrylic variants need their look layered on top here.
    face.traverse(c => {
      if (!c.isMesh) return;
      c.material.transparent = !!style.opacity;
      c.material.opacity = style.opacity ?? 1;
      c.material.metalness = style.metal ? 0.6 : 0;
      c.material.roughness = style.metal ? 0.2 : 0.6;
    });
    g.add(face);
    if (legH > 0) {
      if (style.tripod) {
        const back = new THREE.Mesh(new THREE.CylinderGeometry(0.016, 0.02, legH, 8), new THREE.MeshStandardMaterial({ color: 0x6f4a2e }));
        back.position.set(0, legH / 2, -style.d * 4); back.rotation.x = 0.35; back.userData.part = "stand";
        g.add(back);
        g.add(buildStandLeg(legH, 12, -1, 0x6f4a2e));
        g.add(buildStandLeg(legH, 12, 1, 0x6f4a2e));
      } else {
        g.add(buildStandLeg(legH, 8, -1, 0xC9A44C));
        g.add(buildStandLeg(legH, 8, 1, 0xC9A44C));
      }
    }
  } else if (style.kind === "round-stand") {
    const legH = style.legH;
    const disc = new THREE.Mesh(new THREE.CylinderGeometry(style.r, style.r, style.d, 40), new THREE.MeshStandardMaterial({ color }));
    disc.rotation.x = Math.PI / 2; disc.position.y = legH + style.r; disc.userData.part = "panel";
    g.add(disc);
    g.add(buildStandLeg(legH + style.r * 0.9, 16, -1, 0xC9A44C));
    g.add(buildStandLeg(legH + style.r * 0.9, 16, 1, 0xC9A44C));
  } else if (style.kind === "wave-stand") {
    const outline = outlineWavyTop(style.w, style.h, style.amp, style.waves);
    g.add(buildFlatPolygonPanel(outline, style.d, color, "panel"));
  } else if (style.kind === "hanging") {
    g.add(buildCurtainRod(style.w, style.rodY, 0xC9A44C));
    const panel = buildCurtainPanel(style.w - 0.04, style.dropH, { color: style.color, opacity: 1, foldAmp: 0.012, foldFreq: 2 });
    panel.position.y = style.rodY - style.dropH - 0.02;
    panel.userData.part = "panel";
    g.add(panel);
  } else if (style.kind === "frame-stand") {
    const legH = style.legH, barT = 0.03;
    const mk = (bw, bh, x, y) => {
      const m = new THREE.Mesh(new THREE.BoxGeometry(bw, bh, barT), new THREE.MeshStandardMaterial({ color: style.frameColor, metalness: 0.6, roughness: 0.3 }));
      m.position.set(x, y, 0); m.userData.part = "stand"; g.add(m);
    };
    mk(style.w, barT, 0, legH + style.h);
    mk(style.w, barT, 0, legH);
    mk(barT, style.h, -style.w / 2, legH + style.h / 2);
    mk(barT, style.h, style.w / 2, legH + style.h / 2);
    const pane = new THREE.Mesh(new THREE.BoxGeometry(style.w - barT * 2, style.h - barT * 2, 0.015), new THREE.MeshStandardMaterial({ color: style.color, transparent: true, opacity: style.opacity, roughness: 0.05 }));
    pane.position.set(0, legH + style.h / 2, 0); pane.userData.part = "panel";
    g.add(pane);
    g.add(buildStandLeg(legH, 8, -1, style.frameColor));
    g.add(buildStandLeg(legH, 8, 1, style.frameColor));
  }

  if (style.floral) {
    const sz = style.floral.size ?? 1;
    const cluster = buildFlowerCluster("blooms", {
      count: Math.round(12 * sz), radiusX: 0.13 * sz, radiusY: 0.11 * sz, radiusZ: 0.12 * sz,
      bloomMin: 0.03, bloomMax: 0.05 * sz, stemCount: 3, stemHeight: 0.1, stemPart: "leaves",
    });
    const fx = (style.floral.side || 0) * ((style.w || style.r * 2 || 0.7) * 0.42);
    cluster.position.set(fx, 0.02, (style.d || 0.05) + 0.06);
    g.add(cluster);
  }
  return g;
}

export const ART_STYLES = {
  "abstract-textured":     { kind: "textured", w: 0.7,  h: 0.95, color: 0xa85c4a },
  "minimal-abstract":      { kind: "blobs", w: 0.7,  h: 0.95, color: 0x4a6b8a, blobColor: 0x2f4d6b, count: 2 },
  "neutral-brush-strokes": { kind: "blobs", w: 0.7,  h: 0.95, color: 0x6b8f6b, blobColor: 0x4a6b4a, count: 3 },
  "botanical-leaves":      { kind: "botanical", w: 0.65, h: 0.9,  color: 0x5c7a5c },
  "line-art":              { kind: "line-art", w: 0.65, h: 0.9,  color: 0x7a5c6b },
  landscape:                { kind: "landscape", w: 0.75, h: 0.95, color: 0x7a9cae },
  "floral-painting":       { kind: "floral", w: 0.65, h: 0.9,  color: 0xb06a7e },
  "gold-texture":          { kind: "speckle", w: 0.7,  h: 0.95, color: 0xc9a44c },
};

/* Every painting hangs flush against a wall. computeWallSnap (defined
   further down, near the tile floor plan code) keeps item.position pinned
   to the nearest wall on drop/drag, and
   item.position.y is the frame's BOTTOM edge (local y=0 here), not the
   floor, so a small hanging-wire loop at the top is all the "mount" this
   needs. There's no foot and no floor contact. "Content" is a few simple
   procedural marks (bands, blobs, a leaf sprig, a speckle scatter) rather
   than an imported picture, consistent with the rest of this file staying
   model-free. */
export function buildWallArt(variant) {
  const style = ART_STYLES[variant] || ART_STYLES["abstract-textured"];
  const g = new THREE.Group();
  const { w, h, color } = style;
  const depth = 0.03;
  const cy = h / 2;
  const frame = new THREE.Mesh(new THREE.BoxGeometry(w + 0.05, h + 0.05, depth), new THREE.MeshStandardMaterial({ color: 0xC9A44C, metalness: 0.5, roughness: 0.35 }));
  frame.position.y = cy; frame.userData.part = "frame";
  g.add(frame);
  const hook = new THREE.Mesh(new THREE.TorusGeometry(0.025, 0.006, 6, 12), new THREE.MeshStandardMaterial({ color: 0x8a8378, metalness: 0.6, roughness: 0.3 }));
  hook.position.set(0, h + 0.04, -depth / 2 - 0.005); hook.userData.part = "frame";
  g.add(hook);
  const canvas = new THREE.Mesh(new THREE.BoxGeometry(w, h, 0.012), new THREE.MeshStandardMaterial({ color, roughness: 0.85 }));
  canvas.position.set(0, cy, depth / 2 + 0.006); canvas.userData.part = "canvas";
  g.add(canvas);
  const cz = depth / 2 + 0.013;

  if (style.kind === "textured") {
    for (let i = 0; i < 10; i++) {
      const t = i / 9;
      const bump = new THREE.Mesh(new THREE.BoxGeometry(w * 0.9, 0.01, 0.006), new THREE.MeshStandardMaterial({ color: 0xe6ded0, roughness: 0.9 }));
      bump.position.set(0, cy - h * 0.4 + t * h * 0.8, cz); bump.rotation.z = (t - 0.5) * 0.1; bump.userData.part = "canvas";
      g.add(bump);
    }
  } else if (style.kind === "blobs") {
    const n = style.count || 2;
    for (let i = 0; i < n; i++) {
      const r = w * (0.28 - i * 0.05);
      const blob = new THREE.Mesh(new THREE.CircleGeometry(r, 24), new THREE.MeshStandardMaterial({ color: style.blobColor, roughness: 0.85, side: THREE.DoubleSide }));
      blob.position.set(-w * 0.15 + i * w * 0.2, cy + h * 0.1 - i * h * 0.12, cz + i * 0.002); blob.userData.part = "canvas";
      g.add(blob);
    }
  } else if (style.kind === "botanical") {
    const sprig = buildLeafSprig(h * 0.55, "canvas", 0x6b7a5c);
    sprig.rotation.z = 0.15;
    sprig.position.set(-w * 0.05, cy - h * 0.35, cz);
    g.add(sprig);
  } else if (style.kind === "line-art") {
    for (let i = 0; i < 10; i++) {
      const t = i / 9;
      const seg = new THREE.Mesh(new THREE.BoxGeometry(0.006, 0.006, 0.004), new THREE.MeshStandardMaterial({ color: 0x8a8378 }));
      seg.position.set(Math.sin(t * Math.PI * 1.4) * w * 0.14, cy - h * 0.3 + t * h * 0.6, cz); seg.userData.part = "canvas";
      g.add(seg);
    }
  } else if (style.kind === "landscape") {
    const bands = [{ frac: 0.15, color: 0xd7cdb0 }, { frac: 0.35, color: 0xc9c0a2 }, { frac: 0.5, color: 0xb7c2a8 }];
    let acc = 0;
    bands.forEach(b => {
      const bh = h * b.frac;
      const band = new THREE.Mesh(new THREE.BoxGeometry(w * 0.94, bh, 0.006), new THREE.MeshStandardMaterial({ color: b.color, roughness: 0.85 }));
      band.position.set(0, cy - h / 2 + acc + bh / 2, cz); band.userData.part = "canvas";
      g.add(band);
      acc += bh;
    });
  } else if (style.kind === "floral") {
    const cluster = buildFlowerCluster("canvas", { count: 10, radiusX: w * 0.16, radiusY: h * 0.12, radiusZ: 0.02, bloomMin: 0.025, bloomMax: 0.04, stemCount: 0 });
    cluster.position.set(0, cy - h * 0.28, cz);
    g.add(cluster);
  } else if (style.kind === "speckle") {
    for (let i = 0; i < 26; i++) {
      const fleck = new THREE.Mesh(new THREE.CircleGeometry(0.01 + ((i * 3) % 3) * 0.006, 6), new THREE.MeshStandardMaterial({ color: 0xC9A44C, metalness: 0.6, roughness: 0.3, side: THREE.DoubleSide }));
      fleck.position.set(Math.sin(i * 2.3) * 0.42 * w, cy + Math.cos(i * 1.7) * 0.42 * h, cz); fleck.userData.part = "canvas";
      g.add(fleck);
    }
  }
  return g;
}
