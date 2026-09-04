/* Creates different ceramic vase styles for the 3D workspace.

   Vase shapes are built from reusable profiles and can include details such as ribs, facets, twists and curved rims.

   Special details such as handles and decorative patterns are added separately when needed.
*/

import * as THREE from "three";

export function buildVaseMesh(profile, opts = {}) {
  const {
    radialSegments = 32, ribCount = 0, ribDepth = 0,
    twist = 0, ruffleTop = 0, ruffleWaves = 6,
    flatShading = false, color = 0xf2efe8, roughness = 0.55,
  } = opts;
  const positions = [];
  const ringCount = profile.length;
  const topY = profile[ringCount - 1].y || 1;
  for (let ri = 0; ri < ringCount; ri++) {
    const { r, y } = profile[ri];
    const isTop = ri === ringCount - 1;
    const isBottom = ri === 0;
    const twistAngle = twist * (y / topY);
    for (let s = 0; s <= radialSegments; s++) {
      const theta = (s / radialSegments) * Math.PI * 2 + twistAngle;
      let rad = r;
      if (!isBottom && ribCount) rad += Math.cos(theta * ribCount) * ribDepth;
      if (isTop && ruffleTop) rad += Math.sin(theta * ruffleWaves) * ruffleTop;
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
  const mesh = new THREE.Mesh(geo, new THREE.MeshStandardMaterial({ color, roughness, flatShading, side: THREE.DoubleSide }));
  mesh.userData.part = "body";
  return mesh;
}

/* Straight taper (or flare, if rTop > rBase) from a small foot to the rim,
   with an optional extra flare right at the lip. */
export function profileTapered(h, rBase, rTop, opts = {}) {
  const { flareTop = 0 } = opts;
  const pts = [{ r: rBase * 0.55, y: 0 }];
  const n = 12;
  for (let i = 0; i <= n; i++) {
    const t = i / n;
    let r = rBase + (rTop - rBase) * Math.pow(t, 0.9);
    if (t > 0.9 && flareTop) r += (flareTop * (t - 0.9)) / 0.1;
    pts.push({ r, y: h * t });
  }
  return pts;
}

/* Classic vase silhouette: foot, wide belly, narrowing neck, flared rim. */
export function profileBulbous(h, rBase, rBelly, rNeck, rRim, bellyYFrac = 0.42) {
  return [
    { r: rBase * 0.55, y: 0 },
    { r: rBase, y: h * 0.03 },
    { r: rBelly, y: h * bellyYFrac },
    { r: (rBelly + rNeck) / 2, y: h * 0.7 },
    { r: rNeck, y: h * 0.88 },
    { r: rRim, y: h },
  ];
}

/* Round bottom tapering into a thin tall neck: the bud-vase shape. */
export function profileBottleNeck(h, rBase, rBelly, neckR, rimR, neckStartFrac = 0.55) {
  return [
    { r: rBase * 0.6, y: 0 },
    { r: rBase, y: h * 0.04 },
    { r: rBelly, y: h * 0.28 },
    { r: rBelly * 0.85, y: h * neckStartFrac },
    { r: neckR, y: h * (neckStartFrac + 0.06) },
    { r: neckR, y: h * 0.94 },
    { r: rimR, y: h },
  ];
}

/* N stacked bulges narrowing slightly toward the top: the "snowman" shape. */
export function profileStackedBubbles(h, r, count) {
  const pts = [{ r: r * 0.35, y: 0 }];
  const segH = h / count;
  for (let i = 0; i < count; i++) {
    const y0 = i * segH, yMid = y0 + segH * 0.5, y1 = y0 + segH;
    const rTop = r * (1 - i * 0.1);
    pts.push({ r: rTop * 0.55, y: y0 + segH * 0.08 });
    pts.push({ r: rTop, y: yMid });
    pts.push({ r: rTop * 0.55, y: y1 - segH * 0.05 });
  }
  pts.push({ r: r * 0.3, y: h });
  return pts;
}

/* A gentle vertical sine undulation in the belly radius. Reads as an
   organic wavy/lumpy body without needing true angular asymmetry. */
export function profileWavy(h, rBase, waves, amp) {
  const pts = [{ r: rBase * 0.6, y: 0 }];
  const n = 24;
  for (let i = 0; i <= n; i++) {
    const t = i / n;
    const taper = Math.sin(t * Math.PI); // Tapers the wave amplitude toward both ends
    const r = rBase + Math.sin(t * Math.PI * waves) * amp * taper;
    pts.push({ r: Math.max(r, rBase * 0.3), y: h * t });
  }
  return pts;
}

/* Foot, then thin stem, then wide shallow cup: the goblet/coupe shape. */
export function profileGoblet(h, cupR, stemR, footR, cupDepthFrac = 0.55) {
  const cupH = h * cupDepthFrac, stemH = h * 0.3, footH = h - cupH - stemH;
  return [
    { r: footR, y: 0 },
    { r: footR, y: footH * 0.15 },
    { r: stemR, y: footH + stemH * 0.1 },
    { r: stemR, y: footH + stemH * 0.9 },
    { r: cupR * 0.5, y: footH + stemH },
    { r: cupR, y: footH + stemH + cupH * 0.85 },
    { r: cupR * 1.05, y: h },
  ];
}

/* A wide double bulge narrowing at the waist between them: the gourd shape. */
export function profileGourdDouble(h, rBase, rWaist, rTop) {
  return [
    { r: rBase * 0.4, y: 0 },
    { r: rBase, y: h * 0.22 },
    { r: rWaist, y: h * 0.45 },
    { r: rTop, y: h * 0.8 },
    { r: rTop * 0.6, y: h * 0.95 },
    { r: rTop * 0.5, y: h },
  ];
}

/* A half-torus handle arcing from shoulder height down to belly height on
   one side. */
export function buildVaseHandle(radius, yTop, yBottom, side, color) {
  const handle = new THREE.Mesh(
    new THREE.TorusGeometry((yTop - yBottom) / 2, radius * 0.05, 6, 12, Math.PI),
    new THREE.MeshStandardMaterial({ color, roughness: 0.55 })
  );
  handle.rotation.z = Math.PI / 2;
  handle.rotation.y = side > 0 ? 0 : Math.PI;
  handle.position.set(side * radius * 0.92, (yTop + yBottom) / 2, 0);
  handle.userData.part = "body";
  return handle;
}

/* A handful of tiny embedded pebble flecks scattered up the surface.
   Stands in for a speckled terrazzo glaze without needing a texture map. */
export function buildVaseSpeckle(profile, color1, color2) {
  const g = new THREE.Group();
  const golden = Math.PI * (3 - Math.sqrt(5));
  const topY = profile[profile.length - 1].y;
  const count = 22;
  for (let i = 0; i < count; i++) {
    const t = ((i * 7) % count) / count;
    const y = topY * (0.08 + t * 0.86);
    // Interpolate the profile radius at this height so the fleck sits on the surface instead of floating off it.
    let r = profile[0].r;
    for (let k = 0; k < profile.length - 1; k++) {
      if (y >= profile[k].y && y <= profile[k + 1].y) {
        const span = profile[k + 1].y - profile[k].y || 1;
        const lt = (y - profile[k].y) / span;
        r = profile[k].r + (profile[k + 1].r - profile[k].r) * lt;
        break;
      }
    }
    const theta = i * golden;
    const fleck = new THREE.Mesh(
      new THREE.SphereGeometry(0.006 + ((i * 5) % 3) * 0.003, 4, 4),
      new THREE.MeshStandardMaterial({ color: i % 2 === 0 ? color1 : color2, roughness: 0.8 })
    );
    fleck.position.set(Math.cos(theta) * r * 0.98, y, Math.sin(theta) * r * 0.98);
    fleck.userData.part = "body";
    g.add(fleck);
  }
  return g;
}

// Gives each vase its own ceramic color.

// This makes the different vase styles easier to distinguish in the catalog.
export const VASE_STYLES = {
  "spiral-twist": { profile: profileTapered(0.5, 0.09, 0.075, { flareTop: 0.01 }), ribCount: 10, ribDepth: 0.018, radialSegments: 32, twist: Math.PI * 1.3, color: 0xc1666b },
  "fluted-tapered": { profile: profileTapered(0.48, 0.085, 0.07), ribCount: 14, ribDepth: 0.012, radialSegments: 40, color: 0x4a7c6f },
  "stacked-bubble": { profile: profileStackedBubbles(0.4, 0.11, 3), radialSegments: 28, color: 0xd4a373 },
  "fluted-bulbous": { profile: profileBulbous(0.42, 0.07, 0.13, 0.08, 0.09), ribCount: 16, ribDepth: 0.012, radialSegments: 40, color: 0x6a4c93 },
  "ruffled-wavy-tall": { profile: profileWavy(0.5, 0.09, 3, 0.025), ruffleTop: 0.02, radialSegments: 32, color: 0x457b9d },
  "textured-cylinder": { profile: profileTapered(0.32, 0.06, 0.055), roughness: 0.95, radialSegments: 24, color: 0xb56576 },
  ring: { ring: true, ringR: 0.16, tubeR: 0.045, color: 0xc9a44c },
  "textured-cylinder-tall": { profile: profileTapered(0.42, 0.05, 0.045), roughness: 0.9, radialSegments: 24, color: 0x588157 },
  "faceted-hex": { profile: profileTapered(0.45, 0.09, 0.075), radialSegments: 6, flatShading: true, color: 0x7c4a6b },
  "wavy-stack": { profile: profileWavy(0.4, 0.11, 4, 0.03), radialSegments: 32, color: 0xbc6c25 },
  "amphora-handles": { profile: profileBulbous(0.4, 0.08, 0.14, 0.07, 0.08), handles: 2, radialSegments: 32, color: 0x386641 },
  "bud-simple": { profile: profileBottleNeck(0.34, 0.07, 0.1, 0.02, 0.025), radialSegments: 24, color: 0x8a5a44 },
  "fluted-narrow": { profile: profileTapered(0.5, 0.06, 0.05), ribCount: 18, ribDepth: 0.008, radialSegments: 36, color: 0x5c6e8a },
  "bulbous-round": { profile: profileBulbous(0.32, 0.09, 0.15, 0.1, 0.12, 0.5), radialSegments: 32, color: 0xa13d5c },
  "wavy-simple": { profile: profileWavy(0.38, 0.09, 2, 0.02), radialSegments: 32, color: 0x6b8f71 },
  "tapered-cone": { profile: profileTapered(0.36, 0.045, 0.09), radialSegments: 28, color: 0x9c6b3f },
  "ruffled-trumpet": { profile: profileTapered(0.4, 0.05, 0.1), ruffleTop: 0.025, radialSegments: 32, color: 0x4f6b4f },
  "wavy-organic-tall": { profile: profileWavy(0.48, 0.09, 5, 0.02), radialSegments: 32, color: 0x8e7cc3 },
  "ribbed-vertical-tall": { profile: profileTapered(0.46, 0.075, 0.065), ribCount: 20, ribDepth: 0.01, radialSegments: 40, color: 0xb5654f },
  "gourd-round": { profile: profileGourdDouble(0.34, 0.1, 0.09, 0.13), radialSegments: 32, color: 0x2a6f77 },
  goblet: { profile: profileGoblet(0.34, 0.13, 0.03, 0.09), radialSegments: 32, color: 0x6a4c7a },
  "spherical-round": { profile: profileBulbous(0.28, 0.04, 0.14, 0.05, 0.055, 0.55), radialSegments: 32, color: 0xd98e73 },
  "jug-single-handle": { profile: profileBottleNeck(0.34, 0.09, 0.12, 0.045, 0.05), handles: 1, radialSegments: 32, color: 0x3f6b6f },
  "faceted-gem": { profile: profileBulbous(0.32, 0.06, 0.12, 0.07, 0.075), radialSegments: 7, flatShading: true, color: 0xee6c4d },
  "gourd-stack": { profile: profileStackedBubbles(0.36, 0.1, 2), radialSegments: 28, color: 0x7b2d43 },
  "ring-textured-cylinder": { profile: profileTapered(0.34, 0.075, 0.07), ribCount: 6, ribDepth: 0.006, radialSegments: 32, color: 0x4a5859 },
  "organic-lumpy": { profile: profileWavy(0.3, 0.12, 3, 0.035), radialSegments: 28, color: 0xa3773f },
  "rough-organic": { profile: profileTapered(0.32, 0.08, 0.075), ribCount: 5, ribDepth: 0.02, roughness: 0.95, radialSegments: 28, color: 0x6f8a7c },
  "fluted-cylinder": { profile: profileTapered(0.4, 0.07, 0.065), ribCount: 16, ribDepth: 0.01, radialSegments: 36, color: 0x8b2e3f },
  "bud-curvy": { profile: profileBottleNeck(0.32, 0.075, 0.1, 0.025, 0.03, 0.5), radialSegments: 24, color: 0x5c4a7c },
  "wavy-tall2": { profile: profileWavy(0.44, 0.08, 4, 0.022), radialSegments: 32, color: 0xc2703f },
  "bud-round-simple": { profile: profileBottleNeck(0.3, 0.09, 0.1, 0.018, 0.02), radialSegments: 24, color: 0x2f4858 },
  "fluted-trumpet-flare": { profile: profileTapered(0.38, 0.045, 0.1), ribCount: 14, ribDepth: 0.01, radialSegments: 32, color: 0x9b6f9b },
  "handled-pitcher": { profile: profileBulbous(0.36, 0.08, 0.11, 0.06, 0.08), handles: 1, radialSegments: 32, color: 0xa15c3e },
  "wavy-ribbed-tall": { profile: profileWavy(0.46, 0.075, 6, 0.015), ribCount: 8, ribDepth: 0.008, radialSegments: 32, color: 0x4c6b81 },
  "terrazzo-speckle": { profile: profileTapered(0.36, 0.075, 0.07), roughness: 0.9, speckle: true, radialSegments: 24, color: 0x8a6a2e },
};

/* Builds a complete vase using the selected style.

   Each vase uses its own default color and can still be recolored through the editing controls.
*/
export function buildVase(variant) {
  const style = VASE_STYLES[variant] || VASE_STYLES["bulbous-round"];
  const g = new THREE.Group();
  const baseColor = style.color || 0xf2efe8;
  if (style.ring) {
    const ring = new THREE.Mesh(
      new THREE.TorusGeometry(style.ringR, style.tubeR, 16, 32),
      new THREE.MeshStandardMaterial({ color: baseColor, roughness: 0.55 })
    );
    ring.rotation.x = Math.PI / 2;
    ring.position.y = style.ringR + style.tubeR;
    ring.userData.part = "body";
    g.add(ring);
    return g;
  }
  const body = buildVaseMesh(style.profile, { ...style, color: baseColor });
  g.add(body);
  if (style.handles) {
    const rMax = style.profile.reduce((m, p) => Math.max(m, p.r), 0);
    const yTop = style.profile[style.profile.length - 1].y * 0.78;
    const yBottom = style.profile[style.profile.length - 1].y * 0.42;
    if (style.handles === 2) {
      g.add(buildVaseHandle(rMax, yTop, yBottom, 1, baseColor));
      g.add(buildVaseHandle(rMax, yTop, yBottom, -1, baseColor));
    } else {
      g.add(buildVaseHandle(rMax, yTop, yBottom, 1, baseColor));
    }
  }
  if (style.speckle) {
    g.add(buildVaseSpeckle(style.profile, 0x3a3630, 0xc9bea8));
  }
  return g;
}
