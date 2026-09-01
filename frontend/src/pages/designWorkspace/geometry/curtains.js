/* Sheer drape curtains (reference sheet #7, ivory curtain grid).
   Extracted from Designworkspace.jsx.
   A single cloth-panel mesh builder plus a small "kind" dispatcher covers
   every drape style on that sheet: plain hanging panels, panels pinched
   into a tieback partway down, a wide panel with a curved (rather than
   flat) bottom edge for swags/valances, and panels rotated around their
   rod-attachment point for diagonal/crossed drapes. Nothing here is a
   flat plane. Every panel is a grid mesh with a sine-wave ripple baked
   into its X position at build time, which is what reads as hanging
   fabric folds rather than a stiff flat sheet. */

import * as THREE from "three";

export function buildCurtainPanel(width, height, opts = {}) {
  const {
    segsX = 14, segsY = 16,
    foldAmp = 0.03, foldFreq = 3,
    topCurve = null, bottomCurve = null,
    tiebackAt = null, tiebackPull = 0.35,
    color = 0xf7f1e4, opacity = 0.85, roughness = 0.75,
  } = opts;
  const positions = [];
  for (let iy = 0; iy <= segsY; iy++) {
    const v = iy / segsY; // 0 at the rod, 1 at the floor
    for (let ix = 0; ix <= segsX; ix++) {
      const u = ix / segsX; // 0..1 across the panel width
      const topY = topCurve ? topCurve(u) : height;
      const botY = bottomCurve ? bottomCurve(u) : 0;
      let y = topY - (topY - botY) * v;
      let x = (u - 0.5) * width;
      // A deterministic per-column ripple, not Math.random(), since this can
      // rebuild on every color/material tweak. It stands in for hanging folds.
      // Driven only by `u` (not also by the raw segment index) so the wave
      // stays smooth at low segment counts instead of aliasing into a
      // jagged zigzag. A stray extra `ix`-based term here previously made
      // every panel's edge look chewed-up rather than gently rippled.
      const fold = Math.sin(u * Math.PI * foldFreq) * foldAmp * (0.55 + 0.45 * Math.sin(v * Math.PI * 0.9 + 0.2));
      x += fold;
      if (tiebackAt != null) {
        // Pulls this ring's x toward the panel's own centerline, tapering
        // off with vertical distance from the tieback height. This is the
        // pinch that gives a tied-back curtain its hourglass silhouette.
        const dist = Math.abs(v - tiebackAt);
        const pinch = Math.max(0, 1 - dist * 5);
        x *= 1 - tiebackPull * pinch;
      }
      positions.push(x, y, 0);
    }
  }
  const indices = [];
  for (let iy = 0; iy < segsY; iy++) {
    for (let ix = 0; ix < segsX; ix++) {
      const a = iy * (segsX + 1) + ix;
      const b = a + segsX + 1;
      const c = a + 1;
      const d = b + 1;
      indices.push(a, b, c, c, b, d);
    }
  }
  const geo = new THREE.BufferGeometry();
  geo.setAttribute("position", new THREE.Float32BufferAttribute(positions, 3));
  geo.setIndex(indices);
  geo.computeVertexNormals();
  // Only actually enable alpha blending for the noticeably-sheer variants.
  // Marking every panel `transparent` (even at opacity 0.95+) forces WebGL
  // to depth-sort and alpha-blend every triangle instead of just depth-
  // testing them. With several overlapping panels/rod/tieback meshes in
  // one curtain, that sorting is unstable and reads as broken/blobby
  // geometry rather than soft fabric, which is what made these look odd.
  const isSheer = opacity < 0.97;
  const mesh = new THREE.Mesh(geo, new THREE.MeshStandardMaterial({
    color, roughness, side: THREE.DoubleSide,
    transparent: isSheer, opacity: isSheer ? opacity : 1,
  }));
  mesh.userData.part = "curtain";
  return mesh;
}

/* Bottom-edge curve generators (absolute Y, not an offset) for the swag/
   valance kind. The panel's top edge stays flat at the rod; only the
   bottom edge's shape changes. */
export function archLegsCurve(height, archFrac) {
  // 0 (touches the floor) at both edges, rising to archFrac*height at the
  // center. Reads as an open arch with the fabric draping down each side.
  return u => height * archFrac * Math.sin(Math.max(0, Math.min(1, u)) * Math.PI);
}
export function smileValanceCurve(height, dipFrac, shallowFrac) {
  // Stays near the rod (shallowFrac) at the edges and droops down to
  // dipFrac at the center. The classic swag "smile" below a rod.
  return u => height * (shallowFrac - (shallowFrac - dipFrac) * Math.sin(Math.max(0, Math.min(1, u)) * Math.PI));
}
export function tailsSmileCurve(height, dipFrac, shallowFrac, tailFrac = 0.15) {
  // Like smileValanceCurve in the middle span, but the outermost sliver at
  // each edge drops all the way to the floor: long hanging "tails."
  const mid = smileValanceCurve(height, dipFrac, shallowFrac);
  return u => {
    if (u < tailFrac) return height * shallowFrac * (u / tailFrac);
    if (u > 1 - tailFrac) return height * shallowFrac * ((1 - u) / tailFrac);
    return mid((u - tailFrac) / (1 - 2 * tailFrac));
  };
}

export function buildCurtainRod(width, y, color = 0xb8a888) {
  const g = new THREE.Group();
  const rod = new THREE.Mesh(new THREE.CylinderGeometry(0.016, 0.016, width, 10), new THREE.MeshStandardMaterial({ color, metalness: 0.4, roughness: 0.4 }));
  rod.rotation.z = Math.PI / 2;
  rod.position.y = y;
  rod.userData.part = "rod";
  g.add(rod);
  [-width / 2 - 0.03, width / 2 + 0.03].forEach(x => {
    const finial = new THREE.Mesh(new THREE.SphereGeometry(0.026, 8, 6), new THREE.MeshStandardMaterial({ color, metalness: 0.4, roughness: 0.4 }));
    finial.position.set(x, y, 0);
    finial.userData.part = "rod";
    g.add(finial);
  });
  return g;
}

export function buildTiebackBand(x, y, color) {
  const band = new THREE.Mesh(
    new THREE.TorusGeometry(0.045, 0.011, 6, 12),
    new THREE.MeshStandardMaterial({ color, roughness: 0.6 })
  );
  band.rotation.x = Math.PI / 2;
  band.position.set(x, y, 0.01);
  band.userData.part = "curtain";
  return band;
}

/* Builds the tieback gather decoration in one of several real curtain-tie
   styles instead of always the same plain band. `style` selects which. */
export function buildTieDecoration(tieStyle, x, y, color) {
  if (tieStyle === "rope") {
    const g = new THREE.Group();
    const cord = new THREE.Mesh(
      new THREE.TorusGeometry(0.05, 0.017, 8, 16),
      new THREE.MeshStandardMaterial({ color: 0xc9a54a, roughness: 0.55 })
    );
    cord.rotation.x = Math.PI / 2;
    cord.position.set(x, y, 0.015);
    cord.userData.part = "curtain";
    g.add(cord);
    // Two small tassels hanging from the knot: the classic rope-tieback finish.
    [-1, 1].forEach(side => {
      const tassel = new THREE.Mesh(
        new THREE.ConeGeometry(0.014, 0.055, 6),
        new THREE.MeshStandardMaterial({ color: 0xc9a54a, roughness: 0.55 })
      );
      tassel.position.set(x + side * 0.035, y - 0.045, 0.02);
      tassel.rotation.x = Math.PI;
      tassel.userData.part = "curtain";
      g.add(tassel);
    });
    return g;
  }
  if (tieStyle === "bow") {
    const g = new THREE.Group();
    const knot = new THREE.Mesh(new THREE.SphereGeometry(0.022, 8, 6), new THREE.MeshStandardMaterial({ color, roughness: 0.7 }));
    knot.position.set(x, y, 0.02);
    knot.userData.part = "curtain";
    g.add(knot);
    // Two fabric loops flanking the knot, each with a short tail hanging
    // below. Reads as a soft bow rather than a cinched band.
    [-1, 1].forEach(side => {
      const loop = new THREE.Mesh(
        new THREE.TorusGeometry(0.032, 0.011, 6, 12, Math.PI * 1.5),
        new THREE.MeshStandardMaterial({ color, roughness: 0.7, side: THREE.DoubleSide })
      );
      loop.position.set(x + side * 0.032, y, 0.02);
      loop.rotation.z = side > 0 ? -0.35 : Math.PI + 0.35;
      loop.userData.part = "curtain";
      g.add(loop);
      const tail = new THREE.Mesh(new THREE.PlaneGeometry(0.022, 0.06), new THREE.MeshStandardMaterial({ color, roughness: 0.7, side: THREE.DoubleSide }));
      tail.position.set(x + side * 0.018, y - 0.045, 0.018);
      tail.rotation.z = side * 0.2;
      tail.userData.part = "curtain";
      g.add(tail);
    });
    return g;
  }
  if (tieStyle === "buckle") {
    const g = new THREE.Group();
    const strap = new THREE.Mesh(
      new THREE.TorusGeometry(0.05, 0.02, 6, 16),
      new THREE.MeshStandardMaterial({ color, roughness: 0.75 })
    );
    strap.rotation.x = Math.PI / 2;
    strap.position.set(x, y, 0.015);
    strap.userData.part = "curtain";
    g.add(strap);
    const buckle = new THREE.Mesh(
      new THREE.BoxGeometry(0.022, 0.032, 0.008),
      new THREE.MeshStandardMaterial({ color: 0xb8a888, metalness: 0.5, roughness: 0.4 })
    );
    buckle.position.set(x, y, 0.032);
    buckle.userData.part = "curtain";
    g.add(buckle);
    return g;
  }
  return buildTiebackBand(x, y, color);
}

/* Top-edge curve for eyelet/grommet curtains. The fabric is threaded
   through evenly spaced rings rather than gathered onto the rod, so the
   header dips into a smooth scallop between each ring instead of hanging
   flat. Peaks (at the rod) fall exactly at each grommet position. */
export function eyeletTopCurve(height, grommetCount, dipDepth) {
  const gaps = Math.max(1, grommetCount - 1);
  return u => height - dipDepth * (0.5 - 0.5 * Math.cos(u * Math.PI * 2 * gaps));
}

/* One eyelet panel plus its ring of grommets threaded on the rod. Shared
   by both eyelet variants so only the panel count/tieback differs between them. */
export function buildEyeletPanelWithRings(panelW, height, grommetCount, dipDepth, opts) {
  const g = new THREE.Group();
  const topCurve = eyeletTopCurve(height, grommetCount, dipDepth);
  g.add(buildCurtainPanel(panelW, height, { ...opts, topCurve }));
  const gaps = Math.max(1, grommetCount - 1);
  for (let i = 0; i < grommetCount; i++) {
    const u = i / gaps;
    const ring = new THREE.Mesh(
      new THREE.TorusGeometry(0.024, 0.007, 6, 12),
      new THREE.MeshStandardMaterial({ color: 0xc8bfa8, metalness: 0.3, roughness: 0.5 })
    );
    ring.rotation.y = Math.PI / 2;
    ring.position.set((u - 0.5) * panelW, height, 0);
    ring.userData.part = "curtain";
    g.add(ring);
  }
  return g;
}

/* Opacity is tuned per `kind`, not just per "how sheer should this look".
   A kind whose panels can overlap in screen space (crossed/tieback-band-
   over-fabric) is pushed close to 1 regardless, since alpha-blending stacked
   transparent triangles is what actually caused the broken/blobby look.
   Only kinds where panels never overlap each other (a single swag mesh, or
   two side-by-side straight panels with a gap between them) are given real
   transparency. Swag/valance curve depths are also capped well short of
   the panel's full height so the fabric never thins to a near-zero-height
   sliver at its shallowest point, which read as a torn/broken membrane. */
// Previously every curtain fell back to buildCurtain's one shared cream
// default, since none of these set their own `color`, so all 22 rendered
// identically. Each now carries its own rich, clearly-distinct fabric tone.
export const CURTAIN_STYLES = {
  "sheer-straight-double": { kind: "double-straight", width: 1.9, height: 2.0, opacity: 0.65, foldAmp: 0.022, foldFreq: 3, color: 0xc97b84 },
  "tieback-classic": { kind: "double-tieback", width: 1.9, height: 2.0, opacity: 0.98, foldAmp: 0.03, tiebackAt: 0.55, tiebackPull: 0.4, color: 0x8b2e3f },
  "straight-heavy": { kind: "double-straight", width: 1.9, height: 2.0, opacity: 1, foldAmp: 0.045, foldFreq: 4, color: 0x2f4858 },
  "tieback-elegant": { kind: "double-tieback", width: 1.9, height: 2.05, opacity: 0.98, foldAmp: 0.04, tiebackAt: 0.42, tiebackPull: 0.45, color: 0x6b4e8c },
  "swag-arch-full": { kind: "swag", width: 1.95, height: 2.0, opacity: 0.92, foldAmp: 0.02, curve: "arch", archFrac: 0.55, color: 0xc9a44c },
  "single-flat": { kind: "single-panel", width: 1.6, height: 2.0, opacity: 1, foldAmp: 0.006, panelWFrac: 0.5, anchorFrac: 0, color: 0x4a7c6f },
  "center-swoop-valance": { kind: "swag", width: 1.9, height: 2.0, opacity: 0.9, foldAmp: 0.02, curve: "smile", dipFrac: 0.62, shallowFrac: 0.92, color: 0xb5654f },
  "sheer-voile": { kind: "double-straight", width: 1.9, height: 2.0, opacity: 0.4, foldAmp: 0.016, foldFreq: 4, color: 0x7a9cc6 },
  "wide-backdrop": { kind: "single-wide", width: 2.1, height: 2.0, opacity: 0.95, foldAmp: 0.03, foldFreq: 6, color: 0x5c6e8a },
  "center-gathered": { kind: "double-tieback", width: 1.9, height: 2.0, opacity: 0.98, foldAmp: 0.032, tiebackAt: 0.5, tiebackPull: 0.5, gatherKnot: true, color: 0xa13d5c },
  "tieback-simple": { kind: "double-tieback", width: 1.9, height: 2.0, opacity: 0.98, foldAmp: 0.025, tiebackAt: 0.7, tiebackPull: 0.3, color: 0x6b8f71 },
  "eyelet-plain": { kind: "eyelet", width: 1.9, height: 2.0, opacity: 1, foldAmp: 0.02, grommetCount: 6, dipDepth: 0.05, color: 0x8a5a44 },
  "twin-tieback-arch": { kind: "double-tieback", width: 1.9, height: 2.0, opacity: 0.98, foldAmp: 0.028, tiebackAt: 0.78, tiebackPull: 0.55, color: 0x4f6b4f },
  "straight-simple": { kind: "double-straight", width: 1.9, height: 2.0, opacity: 0.75, foldAmp: 0.018, foldFreq: 2, color: 0x9c6b3f },
  "swag-with-tails": { kind: "swag", width: 1.95, height: 2.05, opacity: 0.92, foldAmp: 0.022, curve: "tails", dipFrac: 0.6, shallowFrac: 0.9, tailFrac: 0.14, color: 0x7c4a6b },
  "eyelet-tieback": { kind: "eyelet", width: 1.9, height: 2.0, opacity: 1, foldAmp: 0.02, grommetCount: 6, dipDepth: 0.045, tiebackAt: 0.65, tiebackPull: 0.3, color: 0x3f6b6f },
  "tieback-rope": { kind: "double-tieback", width: 1.9, height: 2.0, opacity: 0.98, foldAmp: 0.028, tiebackAt: 0.6, tiebackPull: 0.38, tieStyle: "rope", color: 0xa3773f },
  "wide-flat-pooled": { kind: "single-wide", width: 2.1, height: 2.12, opacity: 0.97, foldAmp: 0.035, foldFreq: 5, color: 0x5c4a7c },
  "tieback-bow": { kind: "double-tieback", width: 1.9, height: 2.0, opacity: 0.98, foldAmp: 0.03, tiebackAt: 0.5, tiebackPull: 0.4, tieStyle: "bow", color: 0xc2703f },
  "tieback-buckle": { kind: "double-tieback", width: 1.9, height: 2.0, opacity: 0.98, foldAmp: 0.026, tiebackAt: 0.58, tiebackPull: 0.35, tieStyle: "buckle", color: 0x4a5859 },
  "wide-no-rod": { kind: "single-wide", width: 2.1, height: 2.0, opacity: 0.95, foldAmp: 0.03, foldFreq: 5, noRod: true, color: 0x8e7cc3 },
  "single-no-rod": { kind: "single-panel", width: 1.6, height: 2.0, opacity: 1, foldAmp: 0.008, panelWFrac: 0.55, anchorFrac: 0, noRod: true, color: 0xb56576 },
};

/* Assembles a full curtain: rod plus one or more cloth panels arranged per
   the variant's `kind`, from the CURTAIN_STYLES table. */
export function buildCurtain(variant) {
  const style = CURTAIN_STYLES[variant] || CURTAIN_STYLES["sheer-straight-double"];
  const g = new THREE.Group();
  const { width, height, color = 0xf7f1e4, opacity, foldAmp, foldFreq = 3 } = style;
  // noRod variants are fabric-only. Meant to be paired with a separately
  // placed "Curtain Rod" holder item so the rod/finial style can be picked
  // independently of the drape style.
  if (!style.noRod) g.add(buildCurtainRod(width, height + 0.02));
  const baseOpts = { color, opacity, foldAmp, foldFreq };

  if (style.kind === "double-straight") {
    const gap = style.gap ?? 0.1;
    const panelW = (width - gap) / 2 - 0.02;
    const left = buildCurtainPanel(panelW, height, baseOpts);
    left.position.x = -(gap / 2 + panelW / 2);
    const right = buildCurtainPanel(panelW, height, baseOpts);
    right.position.x = gap / 2 + panelW / 2;
    g.add(left, right);
  } else if (style.kind === "double-tieback") {
    const gap = style.gap ?? 0.1;
    const panelW = (width - gap) / 2 - 0.02;
    const tieOpts = { ...baseOpts, tiebackAt: style.tiebackAt, tiebackPull: style.tiebackPull };
    const left = buildCurtainPanel(panelW, height, tieOpts);
    left.position.x = -(gap / 2 + panelW / 2);
    const right = buildCurtainPanel(panelW, height, tieOpts);
    right.position.x = gap / 2 + panelW / 2;
    g.add(left, right);
    const bandY = height * style.tiebackAt;
    g.add(buildTieDecoration(style.tieStyle, left.position.x * (1 - style.tiebackPull * 0.7), bandY, color));
    g.add(buildTieDecoration(style.tieStyle, right.position.x * (1 - style.tiebackPull * 0.7), bandY, color));
    if (style.gatherKnot) {
      const knot = new THREE.Mesh(new THREE.SphereGeometry(0.05, 8, 6), new THREE.MeshStandardMaterial({ color, roughness: 0.7 }));
      knot.position.set(0, bandY, 0.02);
      knot.userData.part = "curtain";
      g.add(knot);
    }
  } else if (style.kind === "single-wide") {
    g.add(buildCurtainPanel(width - 0.04, height, baseOpts));
  } else if (style.kind === "single-panel") {
    // One flat panel, deliberately low fold amplitude. A minimalist single
    // drop rather than a full pleated pair.
    const panel = buildCurtainPanel(width * (style.panelWFrac ?? 0.55), height, baseOpts);
    panel.position.x = (style.anchorFrac ?? 0) * width;
    g.add(panel);
  } else if (style.kind === "swag") {
    let bottomCurve;
    if (style.curve === "arch") bottomCurve = archLegsCurve(height, style.archFrac);
    else if (style.curve === "smile") bottomCurve = smileValanceCurve(height, style.dipFrac, style.shallowFrac);
    else bottomCurve = tailsSmileCurve(height, style.dipFrac, style.shallowFrac, style.tailFrac);
    g.add(buildCurtainPanel(width - 0.04, height, { ...baseOpts, bottomCurve }));
  } else if (style.kind === "eyelet") {
    const gap = style.gap ?? 0.1;
    const panelW = (width - gap) / 2 - 0.02;
    const grommetCount = style.grommetCount ?? 6;
    const dipDepth = style.dipDepth ?? 0.05;
    const tieOpts = style.tiebackAt != null ? { tiebackAt: style.tiebackAt, tiebackPull: style.tiebackPull } : {};
    const left = buildEyeletPanelWithRings(panelW, height, grommetCount, dipDepth, { ...baseOpts, ...tieOpts });
    left.position.x = -(gap / 2 + panelW / 2);
    const right = buildEyeletPanelWithRings(panelW, height, grommetCount, dipDepth, { ...baseOpts, ...tieOpts });
    right.position.x = gap / 2 + panelW / 2;
    g.add(left, right);
    if (style.tiebackAt != null) {
      const bandY = height * style.tiebackAt;
      g.add(buildTiebackBand(left.position.x * (1 - style.tiebackPull * 0.7), bandY, color));
      g.add(buildTiebackBand(right.position.x * (1 - style.tiebackPull * 0.7), bandY, color));
    }
  }
  return g;
}
