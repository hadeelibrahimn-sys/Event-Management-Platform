/* Occasional tables (reference sheet #8: fluted-plaster / marble /
   wood / brass table grid). Extracted from Designworkspace.jsx.
   Every silhouette on that sheet reduces to a tabletop (round, oval, or
   rectangular) sitting on one of a handful of base "kinds": a single
   turned pedestal column, two pedestal columns under an oval top, flat
   slab legs (a tripod of three, a waterfall pair flush with the short
   ends, or plain corner legs), a solid or fluted drum, three angled
   tripod legs, a crossed X-frame, a thin ring-and-post frame, a four-post
   cage frame, or a stack of shrinking spheres. TABLE_STYLES picks a
   `kind` plus that kind's own params for each catalog variant, and
   reuses the vase section's profileTapered/profileBottleNeck silhouette
   helpers for the turned-column kinds rather than re-deriving that math.
   Every mesh is tagged userData.part = "top" or "base" (never both), so
   Advanced Edit can recolor/re-material the tabletop and the base
   independently, whatever shape either one takes. */

import * as THREE from "three";
import { profileTapered, profileBottleNeck } from "./vases";

export function buildTableRevolve(profile, opts = {}) {
  const { radialSegments = 32, ribCount = 0, ribDepth = 0, color = 0xf2ede0, roughness = 0.55, metalness = 0 } = opts;
  const positions = [];
  const ringCount = profile.length;
  for (let ri = 0; ri < ringCount; ri++) {
    const { r, y } = profile[ri];
    const isBottom = ri === 0;
    for (let s = 0; s <= radialSegments; s++) {
      const theta = (s / radialSegments) * Math.PI * 2;
      let rad = r;
      if (!isBottom && ribCount) rad += Math.cos(theta * ribCount) * ribDepth;
      positions.push(Math.cos(theta) * rad, y, Math.sin(theta) * rad);
    }
  }
  const indices = [];
  for (let ri = 0; ri < ringCount - 1; ri++) {
    for (let s = 0; s < radialSegments; s++) {
      const a = ri * (radialSegments + 1) + s;
      const b = a + radialSegments + 1;
      const c = a + 1;
      const d = b + 1;
      indices.push(a, b, c, c, b, d);
    }
  }
  const geo = new THREE.BufferGeometry();
  geo.setAttribute("position", new THREE.Float32BufferAttribute(positions, 3));
  geo.setIndex(indices);
  geo.computeVertexNormals();
  const mesh = new THREE.Mesh(geo, new THREE.MeshStandardMaterial({ color, roughness, metalness, side: THREE.DoubleSide }));
  mesh.userData.part = "base";
  return mesh;
}

// The wood/black-metal/gold/glass tones below already read as visibly
// colored and are left alone. Only the cream/"marble" family (which used
// to make a third of this table blur together in the list) gets shifted
// to a richer, mutually-distinct tint per entry: a colored-lacquer or
// tinted-stone finish instead of plain white/cream.
export const TABLE_STYLES = {
  "pedestal-fluted-cream":  { kind: "pedestal", topShape: "round", topR: 0.68, height: 0.75, pedBaseR: 0.1, pedTopR: 0.095, ribCount: 16, ribDepth: 0.012, topColor: 0xb98a6f, baseColor: 0xb98a6f },
  "pedestal-hourglass":     { kind: "pedestal", topShape: "round", topR: 0.65, height: 0.74, profileFn: h => profileBottleNeck(h, 0.15, 0.2, 0.05, 0.09, 0.6), topColor: 0xcbb99e, baseColor: 0xcbb99e },
  "pedestal-fluted-white":  { kind: "pedestal", topShape: "round", topR: 0.6,  height: 0.74, pedBaseR: 0.085, pedTopR: 0.08, ribCount: 20, ribDepth: 0.008, topColor: 0x7c93a8, baseColor: 0x7c93a8 },
  "slab-tripod-cream":      { kind: "slab-legs", legCount: 3, topShape: "round", topR: 0.7, height: 0.75, topColor: 0x8a9b7a, baseColor: 0x8a9b7a },
  "pedestal-cone-stone":    { kind: "pedestal", topShape: "round", topR: 0.66, height: 0.75, pedBaseR: 0.16, pedTopR: 0.05, topColor: 0xd9cdb8, baseColor: 0xd9cdb8 },
  "pedestal-fluted-marble": { kind: "pedestal", topShape: "round", topR: 0.68, height: 0.75, pedBaseR: 0.1, pedTopR: 0.095, ribCount: 18, ribDepth: 0.01, topColor: 0xa8788a, baseColor: 0xa8788a, topRoughness: 0.15 },

  "oval-double-pedestal-fluted": { kind: "double-pedestal", topShape: "oval", topW: 1.7, topD: 0.95, height: 0.75, pedBaseR: 0.09, pedTopR: 0.08, ribCount: 14, ribDepth: 0.01, pedOffsetX: 0.55, topColor: 0xc97b5f, baseColor: 0xc97b5f },
  "oval-wood-legs":              { kind: "slab-legs", legCount: 2, topShape: "oval", topW: 1.7, topD: 0.95, height: 0.75, topColor: 0xa9754a, baseColor: 0x8B5E3C },
  "oval-stone-legs":             { kind: "slab-legs", legCount: 2, topShape: "oval", topW: 1.7, topD: 0.95, height: 0.75, topColor: 0x6f8a7c, baseColor: 0x6f8a7c },
  "oval-double-pedestal-round":  { kind: "double-pedestal", topShape: "oval", topW: 1.6, topD: 1.0, height: 0.75, pedBaseR: 0.09, pedTopR: 0.08, ribCount: 14, ribDepth: 0.01, pedOffsetX: 0.5, topColor: 0x8a6f9b, baseColor: 0x8a6f9b },

  "rect-waterfall-stone":  { kind: "slab-legs", legCount: 2, waterfall: true, topShape: "rect", topW: 1.8, topD: 0.9, height: 0.75, topColor: 0x7a8a9b, baseColor: 0x7a8a9b },
  "rect-waterfall-marble": { kind: "slab-legs", legCount: 2, waterfall: true, topShape: "rect", topW: 1.8, topD: 0.9, height: 0.75, topColor: 0x9b6f7a, baseColor: 0x9b6f7a, topRoughness: 0.15 },
  "rect-wood-legs":        { kind: "slab-legs", legCount: 4, topShape: "rect", topW: 1.6, topD: 0.85, height: 0.75, topColor: 0xa9754a, baseColor: 0x8B5E3C },
  "rect-glass-stone-legs": { kind: "slab-legs", legCount: 2, waterfall: true, topShape: "rect", topW: 1.7, topD: 0.85, height: 0.75, topGlass: true, topColor: 0xd9e8ea, baseColor: 0x6f8a7c },
  "rect-double-pedestal-fluted": { kind: "double-pedestal", topShape: "rect", topW: 1.8, topD: 0.9, height: 0.75, pedBaseR: 0.09, pedTopR: 0.08, ribCount: 14, ribDepth: 0.01, pedOffsetX: 0.62, topColor: 0x6f7a9b, baseColor: 0x6f7a9b },
  "rect-end-drums-stone":  { kind: "end-drums", topShape: "rect", topW: 1.7, topD: 0.85, height: 0.75, drumR: 0.22, topColor: 0xa87c5f, baseColor: 0xa87c5f },
  "rect-black-metal-legs": { kind: "slab-legs", legCount: 4, legThickness: 0.035, topShape: "rect", topW: 1.6, topD: 0.85, height: 0.75, topColor: 0xa9754a, baseColor: 0x1a1a1a, baseMetalness: 0.75, baseRoughness: 0.3 },
  "rect-hairpin-legs":     { kind: "hairpin-legs", topShape: "rect", topW: 1.65, topD: 0.85, height: 0.75, topColor: 0xc9a877, baseColor: 0x1a1a1a, baseMetalness: 0.75, baseRoughness: 0.3 },
  "rect-x-legs-wood":      { kind: "x-legs-ends", topShape: "rect", topW: 1.7, topD: 0.9, height: 0.75, topColor: 0x8B5E3C, baseColor: 0x6f4a2e },
  "rect-black-frame-legs": { kind: "frame-legs-ends", topShape: "rect", topW: 1.75, topD: 0.9, height: 0.75, topColor: 0x8a7a9b, topRoughness: 0.15, baseColor: 0x1a1a1a, baseMetalness: 0.75, baseRoughness: 0.3 },
  "rect-dark-walnut-legs": { kind: "slab-legs", legCount: 4, topShape: "rect", topW: 1.6, topD: 0.85, height: 0.75, topColor: 0x4a3728, baseColor: 0x3d2817 },
  "rect-concrete-waterfall": { kind: "slab-legs", legCount: 2, waterfall: true, topShape: "rect", topW: 1.8, topD: 0.9, height: 0.75, topColor: 0xb9b6b0, baseColor: 0xb9b6b0, topRoughness: 0.85, baseRoughness: 0.85 },
  "rect-two-tone-oak-black": { kind: "slab-legs", legCount: 4, legThickness: 0.035, topShape: "rect", topW: 1.65, topD: 0.85, height: 0.75, topColor: 0xd9bc8f, baseColor: 0x1a1a1a, baseMetalness: 0.7, baseRoughness: 0.3 },
  "rect-marble-black-legs": { kind: "slab-legs", legCount: 4, legThickness: 0.04, topShape: "rect", topW: 1.7, topD: 0.88, height: 0.75, topColor: 0x7a6f9b, topRoughness: 0.15, baseColor: 0x1a1a1a, baseMetalness: 0.7, baseRoughness: 0.3 },

  "round-cross-glass":      { kind: "cross", topShape: "round", topR: 0.65, height: 0.74, topGlass: true, topColor: 0xd9e8ea, baseColor: 0xdcd3c2 },
  "round-fluted-gold-ring": { kind: "pedestal", topShape: "round", topR: 0.62, height: 0.74, pedBaseR: 0.095, pedTopR: 0.09, ribCount: 16, ribDepth: 0.01, topColor: 0x6f8a9b, baseColor: 0xC9A44C, baseMetalness: 0.6, baseRoughness: 0.3, topRoughness: 0.15 },
  "round-cone-marble":      { kind: "pedestal", topShape: "round", topR: 0.62, height: 0.74, pedBaseR: 0.15, pedTopR: 0.05, topColor: 0x9b6f8a, baseColor: 0x9b6f8a, topRoughness: 0.15 },
  "round-drum-stone":       { kind: "drum", topShape: "round", topR: 0.6, height: 0.74, drumR: 0.5, topColor: 0x8a9b6f, baseColor: 0x8a9b6f },
  "round-cage-glass-gold":  { kind: "cage", topShape: "round", topR: 0.6, height: 0.74, cageSize: 0.42, topGlass: true, topColor: 0xd9e8ea, baseColor: 0xC9A44C, baseMetalness: 0.75, baseRoughness: 0.25 },
  "round-ring-gold-marble": { kind: "ring", topShape: "round", topR: 0.62, height: 0.74, ringR: 0.3, tubeR: 0.02, topColor: 0x7a9b8a, baseColor: 0xC9A44C, baseMetalness: 0.75, baseRoughness: 0.25, topRoughness: 0.15 },

  "side-ring-gold":      { kind: "ring", topShape: "round", topR: 0.28, height: 0.55, ringR: 0.16, tubeR: 0.016, topColor: 0x9b7a6f, baseColor: 0xC9A44C, baseMetalness: 0.7, baseRoughness: 0.3 },
  "side-fluted-cream":   { kind: "pedestal", topShape: "round", topR: 0.26, height: 0.55, pedBaseR: 0.07, pedTopR: 0.06, ribCount: 14, ribDepth: 0.008, topColor: 0x6f9b8a, baseColor: 0x6f9b8a },
  "side-stacked-sphere": { kind: "stacked-sphere", topShape: "round", topR: 0.24, height: 0.55, sphereCount: 3, pedTopR: 0.11, topColor: 0x9b6f9b, baseColor: 0x9b6f9b },
  "side-cone-cream":     { kind: "pedestal", topShape: "round", topR: 0.27, height: 0.55, pedBaseR: 0.12, pedTopR: 0.035, topColor: 0x7a8a6f, baseColor: 0x7a8a6f },
  "side-tripod-wood":    { kind: "tripod", topShape: "round", topR: 0.26, height: 0.5, topColor: 0x8B5E3C, baseColor: 0x8B5E3C },
  "side-drum-wood":      { kind: "drum", topShape: "round", topR: 0.27, height: 0.52, drumR: 0.2, topColor: 0xa9754a, baseColor: 0xa9754a },
  "side-cone-white":     { kind: "pedestal", topShape: "round", topR: 0.25, height: 0.55, pedBaseR: 0.11, pedTopR: 0.03, topColor: 0x9b7a9b, baseColor: 0x9b7a9b },

  "coffee-stone-tripod-slab": { kind: "slab-legs", legCount: 3, topShape: "round", topR: 0.6, height: 0.4, topColor: 0x6f8a9b, baseColor: 0x6f8a9b },
  "coffee-fluted-drum-cream": { kind: "drum", topShape: "round", topR: 0.58, height: 0.4, drumR: 0.48, ribCount: 18, ribDepth: 0.012, topColor: 0x9b8a6f, baseColor: 0x9b8a6f },
  "coffee-marble-brass-drum": { kind: "drum", topShape: "round", topR: 0.6, height: 0.4, drumR: 0.42, drumTaper: 0.9, topColor: 0x8a6f7a, baseColor: 0xC9A44C, baseMetalness: 0.7, baseRoughness: 0.3, topRoughness: 0.15 },
  "coffee-fluted-drum-wood":  { kind: "drum", topShape: "round", topR: 0.58, height: 0.4, drumR: 0.46, ribCount: 16, ribDepth: 0.012, topColor: 0xa9754a, baseColor: 0xa9754a },
  "coffee-marble-gold-ring":  { kind: "ring", topShape: "round", topR: 0.62, height: 0.38, ringR: 0.32, tubeR: 0.022, topColor: 0x6f9b7a, baseColor: 0xC9A44C, baseMetalness: 0.7, baseRoughness: 0.3, topRoughness: 0.15 },
};

/* Assembles a full table (tabletop plus base) from the TABLE_STYLES table
   for a given variant id. The tabletop is always tagged "top" and every
   base component (however many meshes it takes) is tagged "base", so
   Advanced Edit's per-part color/material controls always resolve to
   exactly those two independently-editable pieces regardless of kind. */
export function buildTable(variant) {
  const style = TABLE_STYLES[variant] || TABLE_STYLES["pedestal-fluted-cream"];
  const g = new THREE.Group();
  const {
    kind, topShape = "round", topR = 0.65, topW = 1.4, topD = 0.8,
    topThickness = 0.05, height = 0.75,
    topColor = 0xf2ede0, baseColor = 0xf2ede0,
  } = style;

  const topMat = new THREE.MeshStandardMaterial({
    color: topColor, roughness: style.topRoughness ?? 0.4, metalness: style.topMetalness ?? 0,
    transparent: !!style.topGlass, opacity: style.topGlass ? 0.4 : 1, side: THREE.DoubleSide,
  });
  let topMesh;
  if (topShape === "rect") {
    topMesh = new THREE.Mesh(new THREE.BoxGeometry(topW, topThickness, topD), topMat);
  } else if (topShape === "oval") {
    topMesh = new THREE.Mesh(new THREE.CylinderGeometry(0.5, 0.5, topThickness, 48), topMat);
    topMesh.scale.set(topW, 1, topD);
  } else {
    topMesh = new THREE.Mesh(new THREE.CylinderGeometry(topR, topR, topThickness, 48), topMat);
  }
  topMesh.position.y = height - topThickness / 2;
  topMesh.userData.part = "top";
  g.add(topMesh);

  const baseTopY = height - topThickness; // How tall the base structure needs to reach
  const baseMat = () => new THREE.MeshStandardMaterial({ color: baseColor, roughness: style.baseRoughness ?? 0.5, metalness: style.baseMetalness ?? 0 });

  if (kind === "pedestal") {
    const rTop = style.pedTopR ?? 0.09, rBase = style.pedBaseR ?? 0.1;
    const profile = style.profileFn ? style.profileFn(baseTopY) : profileTapered(baseTopY, rBase, rTop);
    g.add(buildTableRevolve(profile, { color: baseColor, ribCount: style.ribCount || 0, ribDepth: style.ribDepth || 0, roughness: style.baseRoughness ?? 0.55, metalness: style.baseMetalness ?? 0 }));
    const foot = new THREE.Mesh(new THREE.CylinderGeometry(rBase * 1.7, rBase * 1.9, 0.03, 32), baseMat());
    foot.position.y = 0.015; foot.userData.part = "base";
    g.add(foot);
  } else if (kind === "double-pedestal") {
    const rTop = style.pedTopR ?? 0.08, rBase = style.pedBaseR ?? 0.09;
    const offsetX = style.pedOffsetX ?? topW * 0.28;
    [-1, 1].forEach(side => {
      const profile = profileTapered(baseTopY, rBase, rTop);
      const col = buildTableRevolve(profile, { color: baseColor, ribCount: style.ribCount || 0, ribDepth: style.ribDepth || 0, roughness: style.baseRoughness ?? 0.55 });
      col.position.x = side * offsetX;
      g.add(col);
      const foot = new THREE.Mesh(new THREE.CylinderGeometry(rBase * 1.8, rBase * 2.0, 0.03, 28), baseMat());
      foot.position.set(side * offsetX, 0.015, 0); foot.userData.part = "base";
      g.add(foot);
    });
  } else if (kind === "slab-legs") {
    const legCount = style.legCount ?? 4;
    const legT = style.legThickness ?? 0.05;
    const legH = baseTopY;
    if (legCount === 3) {
      for (let i = 0; i < 3; i++) {
        const ang = (i / 3) * Math.PI * 2;
        const leg = new THREE.Mesh(new THREE.BoxGeometry(legT, legH, topR * 0.9), baseMat());
        leg.position.set(Math.cos(ang) * topR * 0.55, legH / 2, Math.sin(ang) * topR * 0.55);
        leg.rotation.y = ang; leg.userData.part = "base";
        g.add(leg);
      }
    } else if (style.waterfall) {
      // Two full-width slabs flush with the top's short ends, running straight to the floor.
      [-1, 1].forEach(side => {
        const leg = new THREE.Mesh(new THREE.BoxGeometry(legT, legH, topD * 0.94), baseMat());
        leg.position.set(side * (topW / 2 - legT / 2), legH / 2, 0); leg.userData.part = "base";
        g.add(leg);
      });
    } else if (legCount === 2) {
      // Two flat slab legs inset from each end: oval/rect dining tables.
      const spanX = (topShape === "oval" ? topW : topW) * 0.36;
      const depth = (topShape === "oval" ? topD : topD) * 0.85;
      [-1, 1].forEach(side => {
        const leg = new THREE.Mesh(new THREE.BoxGeometry(legT, legH, depth), baseMat());
        leg.position.set(side * spanX, legH / 2, 0); leg.userData.part = "base";
        g.add(leg);
      });
    } else {
      const lx = (topShape === "rect" ? topW : topR * 1.4) / 2 - 0.08;
      const lz = (topShape === "rect" ? topD : topR * 1.4) / 2 - 0.08;
      [[-lx, -lz], [lx, -lz], [-lx, lz], [lx, lz]].forEach(([x, z]) => {
        const leg = new THREE.Mesh(new THREE.BoxGeometry(legT, legH, legT), baseMat());
        leg.position.set(x, legH / 2, z); leg.userData.part = "base";
        g.add(leg);
      });
    }
  } else if (kind === "drum") {
    const drumR = style.drumR ?? topR * 0.85;
    if (style.ribCount) {
      const profile = [{ r: drumR, y: 0 }, { r: drumR * (style.drumTaper ?? 1), y: baseTopY }];
      g.add(buildTableRevolve(profile, { color: baseColor, ribCount: style.ribCount, ribDepth: style.ribDepth || 0.012, roughness: style.baseRoughness ?? 0.55 }));
    } else {
      const mesh = new THREE.Mesh(new THREE.CylinderGeometry(drumR, drumR * (style.drumTaper ?? 1), baseTopY, 40), baseMat());
      mesh.position.y = baseTopY / 2; mesh.userData.part = "base";
      g.add(mesh);
    }
  } else if (kind === "tripod") {
    const legLen = baseTopY * 1.05;
    for (let i = 0; i < 3; i++) {
      const ang = (i / 3) * Math.PI * 2;
      const leg = new THREE.Mesh(new THREE.CylinderGeometry(0.018, 0.026, legLen, 10), baseMat());
      leg.position.set(Math.cos(ang) * topR * 0.4, legLen / 2 * 0.94, Math.sin(ang) * topR * 0.4);
      leg.rotation.z = Math.cos(ang) * 0.22; leg.rotation.x = -Math.sin(ang) * 0.22;
      leg.userData.part = "base";
      g.add(leg);
    }
  } else if (kind === "cross") {
    const span = topR * 1.3;
    [45, -45].forEach(deg => {
      const slab = new THREE.Mesh(new THREE.BoxGeometry(0.06, baseTopY, span), baseMat());
      slab.rotation.y = THREE.MathUtils.degToRad(deg);
      slab.position.y = baseTopY / 2; slab.userData.part = "base";
      g.add(slab);
    });
  } else if (kind === "ring") {
    const ringR = style.ringR ?? topR * 0.55, tubeR = style.tubeR ?? 0.018;
    const ring = new THREE.Mesh(new THREE.TorusGeometry(ringR, tubeR, 12, 36), baseMat());
    ring.rotation.x = Math.PI / 2; ring.position.y = tubeR; ring.userData.part = "base";
    g.add(ring);
    const post = new THREE.Mesh(new THREE.CylinderGeometry(tubeR, tubeR, baseTopY - tubeR, 16), baseMat());
    post.position.y = (baseTopY + tubeR) / 2; post.userData.part = "base";
    g.add(post);
  } else if (kind === "cage") {
    const half = style.cageSize ?? topR * 0.75, barR = 0.012;
    [[-half, -half], [half, -half], [-half, half], [half, half]].forEach(([x, z]) => {
      const post = new THREE.Mesh(new THREE.CylinderGeometry(barR, barR, baseTopY, 8), baseMat());
      post.position.set(x, baseTopY / 2, z); post.userData.part = "base";
      g.add(post);
    });
    const braceLen = Math.sqrt((half * 2) ** 2 + baseTopY ** 2);
    const braceAngle = Math.atan2(half * 2, baseTopY);
    [-half, half].forEach(z => {
      [1, -1].forEach(sign => {
        const brace = new THREE.Mesh(new THREE.CylinderGeometry(barR, barR, braceLen, 8), baseMat());
        brace.position.set(0, baseTopY / 2, z);
        brace.rotation.z = sign * braceAngle; brace.userData.part = "base";
        g.add(brace);
      });
    });
  } else if (kind === "stacked-sphere") {
    const count = style.sphereCount ?? 3;
    const segH = baseTopY / count;
    for (let i = 0; i < count; i++) {
      const rad = Math.max((style.pedTopR ?? 0.11) * (1 - i * 0.14), 0.04);
      const sphere = new THREE.Mesh(new THREE.SphereGeometry(rad, 16, 16), baseMat());
      sphere.position.y = segH * (i + 0.5); sphere.userData.part = "base";
      g.add(sphere);
    }
    const foot = new THREE.Mesh(new THREE.CylinderGeometry(0.1, 0.11, 0.02, 24), baseMat());
    foot.position.y = 0.01; foot.userData.part = "base";
    g.add(foot);
  } else if (kind === "end-drums") {
    // Two chunky solid cylinder "parson" legs flush with the short ends.
    // A rectangular-table counterpart to the round tables' drum base.
    const drumR = style.drumR ?? Math.min(topD, topW) * 0.3;
    const legH = baseTopY;
    const offsetX = style.pedOffsetX ?? (topW / 2 - drumR * 1.15);
    [-1, 1].forEach(side => {
      const leg = new THREE.Mesh(new THREE.CylinderGeometry(drumR, drumR, legH, 28), baseMat());
      leg.position.set(side * offsetX, legH / 2, 0); leg.userData.part = "base";
      g.add(leg);
    });
  } else if (kind === "hairpin-legs") {
    // Each corner is a pair of thin rods splayed into a narrow V: the
    // mid-century "hairpin" silhouette, distinct from a single straight bar.
    const legH = baseTopY;
    const lx = topW / 2 - 0.09, lz = topD / 2 - 0.09;
    const barR = style.legBarR ?? 0.012;
    [[-lx, -lz], [lx, -lz], [-lx, lz], [lx, lz]].forEach(([x, z]) => {
      [-1, 1].forEach(dir => {
        const rod = new THREE.Mesh(new THREE.CylinderGeometry(barR, barR, legH * 1.02, 8), baseMat());
        rod.position.set(x + dir * 0.045, legH / 2, z);
        rod.rotation.z = -dir * 0.12;
        rod.userData.part = "base";
        g.add(rod);
      });
    });
  } else if (kind === "x-legs-ends") {
    // A crossed X trestle at each short end, rather than the round tables'
    // single X spanning the whole underside.
    const legH = baseTopY;
    const span = topD * 0.8;
    const barT = style.legBarR ?? 0.045;
    [-1, 1].forEach(side => {
      [45, -45].forEach(deg => {
        const slab = new THREE.Mesh(new THREE.BoxGeometry(barT, legH, span), baseMat());
        slab.rotation.y = THREE.MathUtils.degToRad(deg);
        slab.position.set(side * (topW / 2 - 0.12), legH / 2, 0);
        slab.userData.part = "base";
        g.add(slab);
      });
    });
  } else if (kind === "frame-legs-ends") {
    // An open rectangular trestle frame (two posts plus a top bar) at each
    // short end: an industrial/architectural alternative to solid slabs.
    const legH = baseTopY;
    const barT = 0.035;
    const span = topD * 0.82;
    [-1, 1].forEach(side => {
      const x = side * (topW / 2 - 0.1);
      [-1, 1].forEach(zDir => {
        const post = new THREE.Mesh(new THREE.BoxGeometry(barT, legH, barT), baseMat());
        post.position.set(x, legH / 2, zDir * span / 2);
        post.userData.part = "base";
        g.add(post);
      });
      const bar = new THREE.Mesh(new THREE.BoxGeometry(barT, barT, span), baseMat());
      bar.position.set(x, legH - barT / 2, 0);
      bar.userData.part = "base";
      g.add(bar);
    });
  }

  return g;
}
