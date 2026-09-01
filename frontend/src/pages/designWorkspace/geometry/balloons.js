/* Balloons. Extracted from Designworkspace.jsx.
   There are two tiers of fidelity on purpose. The 8 standalone "hero"
   balloons (row 1 of the reference sheet) get a real lathe-revolved or
   puffed-panel body since they're viewed up close. Every garland, cluster,
   arch, column, and wall composition (rows 2-4) is built from plain
   SphereGeometry units instead. This matches the existing balloon-arch-bow
   precedent above and performs better once counts run into the dozens per
   object.
   Every mesh is tagged with one of three generic parts (balloons/accent/trim)
   so PART_LABELS.balloon covers all 29 variants with one shared dict. This is
   the same convention used by table's top/base or rug's rug/pattern. */

import * as THREE from "three";
import { buildFlatPolygonPanel } from "./panelsSignsArt";

export const BALLOON_STRING = "#d4a373"; // Warm tan ribbon. A plain white string
// would be invisible, so every string/ribbon/knot defaults to this.
export const BALLOON_STAND = "#4a4e69";  // Charcoal-slate. Default stand/frame/pole color.

export function balloonHash(i) {
  const x = Math.sin(i * 12.9898 + 78.233) * 43758.5453;
  return x - Math.floor(x);
}

// Classic round-balloon silhouette: wide round belly, pinched neck at the
// top where the knot/string attaches. Uses the same {r,y} revolve technique
// as the vase profiles above. LatheGeometry closes both poles automatically.
export function profileBalloon(r, h, neckR = r * 0.12) {
  return [
    new THREE.Vector2(0, 0),
    new THREE.Vector2(r * 0.55, h * 0.05),
    new THREE.Vector2(r * 0.92, h * 0.22),
    new THREE.Vector2(r, h * 0.44),
    new THREE.Vector2(r * 0.94, h * 0.64),
    new THREE.Vector2(r * 0.68, h * 0.84),
    new THREE.Vector2(r * 0.32, h * 0.94),
    new THREE.Vector2(neckR, h * 0.98),
    new THREE.Vector2(neckR * 0.8, h),
  ];
}

export function buildBalloonBody(r, h, color) {
  const mesh = new THREE.Mesh(new THREE.LatheGeometry(profileBalloon(r, h), 16), new THREE.MeshStandardMaterial({ color, roughness: 0.35 }));
  mesh.userData.part = "balloons";
  return mesh;
}

// A single string/ribbon hanging from a shape's underside down to the
// floor. The returned group is anchored so positioning it at y=len puts
// its bottom exactly at the floor (y=0).
export function buildBalloonString(len, color) {
  const g = new THREE.Group();
  const s = new THREE.Mesh(new THREE.CylinderGeometry(0.006, 0.006, len, 6), new THREE.MeshStandardMaterial({ color }));
  s.position.y = -len / 2;
  s.userData.part = "trim";
  g.add(s);
  return g;
}

// A single spherical "garland unit". This is the reusable building block for
// every cluster/arch/ring/column/wall composition below.
export function buildBalloonGarlandUnit(x, y, z, r, color, part) {
  const m = new THREE.Mesh(new THREE.SphereGeometry(r, 12, 10), new THREE.MeshStandardMaterial({ color, roughness: 0.35 }));
  m.position.set(x, y, z);
  m.userData.part = part;
  return m;
}

// Outline generators for the puffed-panel foil balloons. These are consumed
// by the existing buildFlatPolygonPanel, which has safe, pre-verified
// winding, so no new custom BufferGeometry winding needs to be derived here.
export function outlineHeart(scale, segs = 24) {
  const pts = [];
  for (let i = 0; i < segs; i++) {
    const t = (i / segs) * Math.PI * 2;
    const rx = 16 * Math.pow(Math.sin(t), 3);
    const ry = 13 * Math.cos(t) - 5 * Math.cos(2 * t) - 2 * Math.cos(3 * t) - Math.cos(4 * t);
    pts.push({ x: (rx / 32) * scale, y: ((ry + 17) / 30) * scale });
  }
  return pts;
}

export function outlineStar(outerR, innerR, points = 5) {
  const pts = [];
  const n = points * 2;
  for (let i = 0; i < n; i++) {
    const r = i % 2 === 0 ? outerR : innerR;
    const angle = (i / n) * Math.PI * 2 - Math.PI / 2;
    pts.push({ x: Math.cos(angle) * r, y: Math.sin(angle) * r + outerR });
  }
  return pts;
}

export function outlineDiamond(w, h) {
  const hw = w / 2;
  return [{ x: 0, y: h }, { x: hw, y: h / 2 }, { x: 0, y: 0 }, { x: -hw, y: h / 2 }];
}

export const BALLOON_STYLES = {
  // Row 1: standalone balloons
  "round-tassel":  { kind: "single", shape: "round",      r: 0.32, h: 0.42, stringLen: 0.55, color: "#ef476f" },
  "round-small":   { kind: "single", shape: "round",      r: 0.2,  h: 0.26, stringLen: 0.4,  color: "#f78c6b" },
  "heart-foil":    { kind: "single", shape: "heart",      size: 0.5,  thickness: 0.14, stringLen: 0.5, color: "#ff5d8f" },
  "star-foil":     { kind: "single", shape: "star",       outerR: 0.28, innerR: 0.12, thickness: 0.14, stringLen: 0.5, color: "#ffd166" },
  "round-foil":    { kind: "single", shape: "round-foil", r: 0.34, thickness: 0.14, stringLen: 0.5, color: "#06d6a0" },
  "oval-classic":  { kind: "single", shape: "round",      r: 0.26, h: 0.5,  stringLen: 0.55, color: "#7b2cbf" },
  "pillow-foil":   { kind: "single", shape: "pillow",     w: 0.5, h: 0.5, thickness: 0.16, stringLen: 0.5, color: "#4361ee" },
  "diamond-foil":  { kind: "single", shape: "diamond",    w: 0.5, h: 0.62, thickness: 0.14, stringLen: 0.5, color: "#f15bb5" },
  // Row 2: clusters, bubble, confetti, tower
  "cluster-tassel":    { kind: "bunch", count: 7,  baseR: 0.15, centerY: 1.05, spread: 0.24, accentEvery: 4, color: "#ff6b6b", accentColor: "#ffd166" },
  "cluster-mixed":     { kind: "bunch", count: 8,  baseR: 0.15, centerY: 1.05, spread: 0.26, accentEvery: 3, color: "#f4a261", accentColor: "#2ec4b6" },
  "cluster-hearts":    { kind: "bunch", count: 7,  baseR: 0.13, centerY: 1.0,  spread: 0.24, accentEvery: 3, color: "#ff8fab", accentColor: "#d00000", foilShape: "heart" },
  "cluster-stars":     { kind: "bunch", count: 7,  baseR: 0.13, centerY: 1.0,  spread: 0.24, accentEvery: 3, color: "#ffbe0b", accentColor: "#fb5607", foilShape: "star" },
  "cluster-large":     { kind: "bunch", count: 11, baseR: 0.16, centerY: 1.15, spread: 0.32, accentEvery: 4, color: "#4cc9f0", accentColor: "#4361ee" },
  "bubble-tassel":     { kind: "bubble", shellR: 0.4, shellColor: "#90e0ef", innerCount: 6, color: "#ffd60a", accentColor: "#ff006e" },
  "confetti-cluster":  { kind: "bunch", count: 9,  baseR: 0.15, centerY: 1.05, spread: 0.26, accentEvery: 2, color: "#80ed99", accentColor: "#ff006e" },
  "tower-boxes":       { kind: "tower", boxes: 4, boxSize: 0.4, color: "#b298dc", accentColor: "#ff006e", frameColor: "#a2d2ff" },
  // Row 3: arches, rings
  "arch-full":   { kind: "arch", count: 16, rx: 0.55, ry: 1.5, startDeg: 180, endDeg: 0,  cx: 0,     cy: 0.35, accentEvery: 3, color: "#ef476f", accentColor: "#ffd166" },
  "arch-half":   { kind: "arch", count: 12, rx: 0.5,  ry: 1.4, startDeg: 195, endDeg: 75, cx: -0.15, cy: 0.15, accentEvery: 3, color: "#fb8500", accentColor: "#219ebc" },
  "ring-open":   { kind: "ring", count: 20, r: 0.55, cy: 0.75, accentEvery: 4, stand: true,  color: "#9d4edd", accentColor: "#3a0ca3" },
  "ring-wreath": { kind: "ring", count: 26, r: 0.5,  cy: 0.65, accentEvery: 5, stand: false, color: "#38b000", accentColor: "#ffd60a" },
  "arc-partial": { kind: "arc-partial", count: 16, r: 0.5, cy: 0.55, accentEvery: 3, color: "#f72585", accentColor: "#7209b7" },
  // Row 4: columns, walls
  "column-round":            { kind: "column",         count: 5,  baseR: 0.24, height: 1.5, color: "#1b998b" },
  "column-tapered":          { kind: "column",         count: 6,  baseR: 0.26, height: 1.6, color: "#3f37c9" },
  "column-heart":            { kind: "column-foil",    count: 5,  size: 0.32, height: 1.5, shape: "heart", color: "#d00000" },
  "column-star":             { kind: "column-foil",    count: 5,  size: 0.3,  height: 1.5, shape: "star",  color: "#ffb703" },
  "column-cluster-organic":  { kind: "column-cluster", count: 22, height: 1.6, baseR: 0.14, jitter: 0.09, accentEvery: 4, color: "#ff9f1c", accentColor: "#2ec4b6" },
  "column-cluster-dense":    { kind: "column-cluster", count: 32, height: 1.7, baseR: 0.13, jitter: 0.07, accentEvery: 3, color: "#00b4d8", accentColor: "#ef476f" },
  "wall-grid":               { kind: "wall", cols: 6, rows: 5, spacing: 0.24, baseR: 0.11, organic: false, color: "#ff006e", accentColor: "#ffd166" },
  "wall-organic":            { kind: "wall", cols: 7, rows: 6, spacing: 0.2,  baseR: 0.1,  organic: true,  color: "#7209b7", accentColor: "#f72585" },
};

export function buildBalloon(variant) {
  const s = BALLOON_STYLES[variant] || BALLOON_STYLES["round-tassel"];
  const g = new THREE.Group();
  const mainColor = s.color;
  const accentColor = s.accentColor || s.color;

  if (s.kind === "single") {
    let body;
    if (s.shape === "round") {
      body = buildBalloonBody(s.r, s.h, mainColor);
    } else if (s.shape === "heart") {
      body = buildFlatPolygonPanel(outlineHeart(s.size), s.thickness, mainColor, "balloons");
    } else if (s.shape === "star") {
      body = buildFlatPolygonPanel(outlineStar(s.outerR, s.innerR), s.thickness, mainColor, "balloons");
    } else if (s.shape === "round-foil") {
      body = new THREE.Mesh(new THREE.SphereGeometry(s.r, 22, 16), new THREE.MeshStandardMaterial({ color: mainColor, roughness: 0.3 }));
      body.scale.set(1, 1, s.thickness / s.r);
      body.userData.part = "balloons";
    } else if (s.shape === "pillow") {
      body = new THREE.Mesh(new THREE.BoxGeometry(s.w, s.h, s.thickness), new THREE.MeshStandardMaterial({ color: mainColor, roughness: 0.3 }));
      body.userData.part = "balloons";
    } else if (s.shape === "diamond") {
      body = buildFlatPolygonPanel(outlineDiamond(s.w, s.h), s.thickness, mainColor, "balloons");
    }
    // Centered geometries (round-foil, pillow) anchor at their own middle.
    // Base-at-y=0 geometries (lathe body, heart/star/diamond panels) anchor
    // at their bottom. Normalize both so the shape floats above the string.
    body.position.y = (s.shape === "round-foil" || s.shape === "pillow")
      ? s.stringLen + (s.shape === "round-foil" ? s.r : s.h / 2)
      : s.stringLen;
    g.add(body);
    const str = buildBalloonString(s.stringLen, BALLOON_STRING);
    str.position.y = s.stringLen;
    g.add(str);

  } else if (s.kind === "bunch") {
    const { count, baseR, accentEvery = 3, centerY, spread, foilShape } = s;
    for (let i = 0; i < count; i++) {
      const theta = (i / count) * Math.PI * 2 + balloonHash(i) * 0.5;
      const rad = spread * (0.35 + balloonHash(i + 60) * 0.65);
      const x = Math.cos(theta) * rad;
      const z = Math.sin(theta) * rad * 0.6;
      const y = centerY + (spread - rad) * 0.9 + balloonHash(i + 90) * 0.05;
      const size = baseR * (0.85 + balloonHash(i + 120) * 0.3);
      const isAccent = accentEvery > 0 && i % accentEvery === accentEvery - 1;
      const color = isAccent ? accentColor : mainColor;
      if (foilShape && isAccent) {
        const pts = foilShape === "heart" ? outlineHeart(size * 2) : outlineStar(size * 1.3, size * 0.55);
        const panel = buildFlatPolygonPanel(pts, size * 0.4, color, "accent");
        panel.position.set(x, y - size * 0.4, z);
        g.add(panel);
      } else {
        g.add(buildBalloonGarlandUnit(x, y, z, size, color, isAccent ? "accent" : "balloons"));
      }
    }
    const ribbonLen = centerY - spread * 0.3;
    const ribbon = buildBalloonString(ribbonLen, BALLOON_STRING);
    ribbon.position.y = ribbonLen;
    g.add(ribbon);
    const knot = new THREE.Mesh(new THREE.SphereGeometry(0.03, 8, 8), new THREE.MeshStandardMaterial({ color: BALLOON_STRING }));
    knot.position.y = ribbonLen; knot.userData.part = "trim";
    g.add(knot);

  } else if (s.kind === "bubble") {
    const shellY = s.shellR + 0.5;
    const shell = new THREE.Mesh(new THREE.SphereGeometry(s.shellR, 24, 18), new THREE.MeshStandardMaterial({ color: s.shellColor, roughness: 0.15 }));
    shell.position.y = shellY; shell.userData.part = "trim";
    g.add(shell);
    for (let i = 0; i < s.innerCount; i++) {
      const theta = balloonHash(i + 10) * Math.PI * 2;
      const rad = s.shellR * 0.55 * (0.4 + balloonHash(i + 70) * 0.6);
      const x = Math.cos(theta) * rad, z = Math.sin(theta) * rad;
      const y = shellY - s.shellR * 0.35 + balloonHash(i + 130) * 0.15;
      const size = s.shellR * 0.22 * (0.8 + balloonHash(i + 160) * 0.4);
      const isAccent = i % 3 === 2;
      g.add(buildBalloonGarlandUnit(x, y, z, size, isAccent ? accentColor : mainColor, isAccent ? "accent" : "balloons"));
    }
    const strLen = shellY - s.shellR;
    const str = buildBalloonString(strLen, BALLOON_STRING);
    str.position.y = strLen;
    g.add(str);

  } else if (s.kind === "tower") {
    const { boxes, boxSize, frameColor } = s;
    for (let i = 0; i < boxes; i++) {
      const y = i * boxSize + boxSize / 2;
      const box = new THREE.Mesh(new THREE.BoxGeometry(boxSize, boxSize, boxSize), new THREE.MeshStandardMaterial({ color: frameColor, roughness: 0.2, metalness: 0.1 }));
      box.position.y = y; box.userData.part = "trim";
      g.add(box);
      for (let j = 0; j < 3; j++) {
        const x = (balloonHash(i * 3 + j) - 0.5) * boxSize * 0.5;
        const z = (balloonHash(i * 3 + j + 40) - 0.5) * boxSize * 0.5;
        const size = boxSize * 0.22;
        const isAccent = j === 1;
        g.add(buildBalloonGarlandUnit(x, y, z, size, isAccent ? accentColor : mainColor, isAccent ? "accent" : "balloons"));
      }
    }

  } else if (s.kind === "arch") {
    const { count, rx, ry, startDeg, endDeg, cx, cy, accentEvery = 3 } = s;
    for (let i = 0; i < count; i++) {
      const t = count > 1 ? i / (count - 1) : 0;
      const ang = THREE.MathUtils.degToRad(startDeg + (endDeg - startDeg) * t);
      const x = Math.cos(ang) * rx + cx;
      const y = Math.sin(ang) * ry + cy;
      const z = (balloonHash(i + 400) - 0.5) * 0.12;
      const size = 0.14 + balloonHash(i + 420) * 0.05;
      const isAccent = accentEvery > 0 && i % accentEvery === accentEvery - 1;
      g.add(buildBalloonGarlandUnit(x, y, z, size, isAccent ? accentColor : mainColor, isAccent ? "accent" : "balloons"));
    }

  } else if (s.kind === "ring") {
    const { count, r, cy, accentEvery = 4, stand } = s;
    for (let i = 0; i < count; i++) {
      const ang = (i / count) * Math.PI * 2;
      const x = Math.cos(ang) * r;
      const y = Math.sin(ang) * r + cy;
      const z = (balloonHash(i + 500) - 0.5) * 0.1;
      const size = 0.13 + balloonHash(i + 520) * 0.04;
      const isAccent = accentEvery > 0 && i % accentEvery === accentEvery - 1;
      g.add(buildBalloonGarlandUnit(x, y, z, size, isAccent ? accentColor : mainColor, isAccent ? "accent" : "balloons"));
    }
    if (stand) {
      const poleLen = cy - r * 0.15;
      const pole = new THREE.Mesh(new THREE.CylinderGeometry(0.02, 0.02, poleLen, 8), new THREE.MeshStandardMaterial({ color: BALLOON_STAND }));
      pole.position.y = poleLen / 2; pole.userData.part = "trim";
      g.add(pole);
      const base = new THREE.Mesh(new THREE.CylinderGeometry(0.18, 0.2, 0.05, 20), new THREE.MeshStandardMaterial({ color: BALLOON_STAND }));
      base.position.y = 0.025; base.userData.part = "trim";
      g.add(base);
    }

  } else if (s.kind === "arc-partial") {
    const { count, r, cy, accentEvery = 3 } = s;
    const startDeg = -50, endDeg = 250;
    for (let i = 0; i < count; i++) {
      const t = count > 1 ? i / (count - 1) : 0;
      const ang = THREE.MathUtils.degToRad(startDeg + (endDeg - startDeg) * t);
      const x = Math.cos(ang) * r;
      const y = Math.sin(ang) * r + cy;
      const z = (balloonHash(i + 600) - 0.5) * 0.1;
      const size = 0.13 + balloonHash(i + 620) * 0.05;
      const isAccent = accentEvery > 0 && i % accentEvery === accentEvery - 1;
      g.add(buildBalloonGarlandUnit(x, y, z, size, isAccent ? accentColor : mainColor, isAccent ? "accent" : "balloons"));
    }

  } else if (s.kind === "column") {
    const { count, baseR, height } = s;
    for (let i = 0; i < count; i++) {
      const t = count > 1 ? i / (count - 1) : 0;
      const y = t * height * 0.94 + baseR * 0.9;
      const size = baseR * (1 - t * 0.35);
      const x = (balloonHash(i + 700) - 0.5) * 0.03;
      const z = (balloonHash(i + 720) - 0.5) * 0.03;
      g.add(buildBalloonGarlandUnit(x, y, z, size, mainColor, "balloons"));
    }
    const base = new THREE.Mesh(new THREE.CylinderGeometry(baseR * 0.9, baseR * 1.0, 0.06, 20), new THREE.MeshStandardMaterial({ color: BALLOON_STAND }));
    base.position.y = 0.03; base.userData.part = "trim";
    g.add(base);

  } else if (s.kind === "column-foil") {
    const { count, size, height, shape } = s;
    for (let i = 0; i < count; i++) {
      const t = count > 1 ? i / (count - 1) : 0;
      const y = t * height * 0.9 + size * 0.6;
      const pts = shape === "heart" ? outlineHeart(size) : outlineStar(size * 0.55, size * 0.24);
      const panel = buildFlatPolygonPanel(pts, size * 0.3, mainColor, "balloons");
      panel.position.set(0, y - size * 0.5, 0);
      panel.rotation.y = (i % 2) * 0.35;
      g.add(panel);
    }
    const pole = new THREE.Mesh(new THREE.CylinderGeometry(0.02, 0.02, height * 0.15, 8), new THREE.MeshStandardMaterial({ color: BALLOON_STAND }));
    pole.position.y = height * 0.075; pole.userData.part = "trim";
    g.add(pole);

  } else if (s.kind === "column-cluster") {
    const { count, height, baseR, jitter, accentEvery = 4 } = s;
    for (let i = 0; i < count; i++) {
      const t = i / count;
      const y = t * height + baseR;
      const ang = balloonHash(i + 800) * Math.PI * 2;
      const rad = jitter * (0.4 + balloonHash(i + 820) * 0.6);
      const x = Math.cos(ang) * rad, z = Math.sin(ang) * rad;
      const size = baseR * (0.8 + balloonHash(i + 840) * 0.4);
      const isAccent = accentEvery > 0 && i % accentEvery === accentEvery - 1;
      g.add(buildBalloonGarlandUnit(x, y, z, size, isAccent ? accentColor : mainColor, isAccent ? "accent" : "balloons"));
    }
    const base = new THREE.Mesh(new THREE.CylinderGeometry(baseR * 1.1, baseR * 1.3, 0.05, 16), new THREE.MeshStandardMaterial({ color: BALLOON_STAND }));
    base.position.y = 0.025; base.userData.part = "trim";
    g.add(base);

  } else if (s.kind === "wall") {
    const { cols, rows, spacing, baseR, organic } = s;
    const w = cols * spacing, h = rows * spacing;
    const frame = new THREE.Mesh(new THREE.BoxGeometry(w + 0.06, h + 0.06, 0.04), new THREE.MeshStandardMaterial({ color: BALLOON_STAND }));
    frame.position.set(0, h / 2, -0.06); frame.userData.part = "trim";
    g.add(frame);
    for (let row = 0; row < rows; row++) {
      for (let col = 0; col < cols; col++) {
        const idx = row * cols + col;
        const jx = organic ? (balloonHash(idx + 900) - 0.5) * spacing * 0.5 : 0;
        const jy = organic ? (balloonHash(idx + 920) - 0.5) * spacing * 0.5 : 0;
        const x = (col - (cols - 1) / 2) * spacing + jx;
        const y = row * spacing + spacing / 2 + jy;
        const size = organic ? baseR * (0.75 + balloonHash(idx + 940) * 0.5) : baseR;
        const isAccent = organic ? balloonHash(idx + 960) > 0.78 : ((row + col) % 3 === 0);
        g.add(buildBalloonGarlandUnit(x, y, 0.02, size, isAccent ? accentColor : mainColor, isAccent ? "accent" : "balloons"));
      }
    }
  }

  return g;
}
