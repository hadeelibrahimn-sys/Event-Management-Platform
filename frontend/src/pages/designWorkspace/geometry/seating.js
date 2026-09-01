/* Chairs and Sofas (chiavari/cross-back/bentwood/tub chair grid plus the
   curved/tufted/sectional sofa grid). Extracted from Designworkspace.jsx.
   Same family-based approach as vases/rugs above: a handful of shared
   part-builder helpers (legs, channel ribs, tuft buttons) plus one
   dispatcher per broad shape family, driven by a small CHAIR_STYLES/
   SOFA_STYLES params table, rather than 57 fully bespoke one-off meshes.
   Every entry carries its own saturated color (never white/ivory) per the
   catalog-wide visible-color rule, even though both reference sheets were
   shot entirely in white/cream fabric. */

import * as THREE from "three";

export function addLegSet(group, positions, opts = {}) {
  const { legH = 0.42, rTop = 0.02, rBottom = 0.02, color = 0x3d2817, metalness = 0.1, roughness = 0.5, box = false } = opts;
  const mat = new THREE.MeshStandardMaterial({ color, metalness, roughness });
  positions.forEach(([lx, lz]) => {
    const leg = box
      ? new THREE.Mesh(new THREE.BoxGeometry(rTop * 2, legH, rTop * 2), mat)
      : new THREE.Mesh(new THREE.CylinderGeometry(rTop, rBottom, legH, 10), mat);
    leg.position.set(lx, legH / 2, lz);
    leg.userData.part = "body";
    group.add(leg);
  });
}
export function addChannelRibs(group, w, h, depth, count, color, centerX, centerY, centerZ) {
  const mat = new THREE.MeshStandardMaterial({ color, roughness: 0.65 });
  const ribW = w / count;
  for (let i = 0; i < count; i++) {
    const rib = new THREE.Mesh(new THREE.BoxGeometry(ribW * 0.82, h, depth), mat);
    rib.position.set(centerX - w / 2 + ribW * (i + 0.5), centerY, centerZ);
    rib.userData.part = "body";
    group.add(rib);
  }
}
export function addTuftButtons(group, w, h, cols, rows, color, centerX, centerY, centerZ) {
  const mat = new THREE.MeshStandardMaterial({ color, roughness: 0.5 });
  for (let r = 0; r < rows; r++) {
    for (let c = 0; c < cols; c++) {
      const btn = new THREE.Mesh(new THREE.SphereGeometry(0.014, 6, 6), mat);
      btn.position.set(
        centerX - w / 2 + (w / (cols + 1)) * (c + 1),
        centerY - h / 2 + (h / (rows + 1)) * (r + 1),
        centerZ
      );
      btn.userData.part = "body";
      group.add(btn);
    }
  }
}

export function buildChairMesh(style) {
  const g = new THREE.Group();
  const {
    family, color = 0xc9a44c, legColor = 0x3d2817, accent = 0xC9A44C,
    seatR = 0.22, seatW = 0.44, seatD = 0.44, seatH = 0.46, backH = 0.48,
    metalLegs = false, ribs = 5, tuftCols = 3, tuftRows = 3,
  } = style;
  const seatMat = new THREE.MeshStandardMaterial({ color, roughness: 0.65 });
  const legMetalness = metalLegs ? 0.6 : 0.08;
  const legRoughness = metalLegs ? 0.32 : 0.55;

  switch (family) {
    case "chiavari": {
      const seat = new THREE.Mesh(new THREE.CylinderGeometry(seatR, seatR, 0.05, 24), seatMat);
      seat.position.y = seatH; seat.userData.part = "body";
      const frameMat = new THREE.MeshStandardMaterial({ color: accent, metalness: 0.55, roughness: 0.35 });
      const railL = new THREE.Mesh(new THREE.CylinderGeometry(0.016, 0.016, backH, 8), frameMat);
      railL.position.set(-seatR * 0.75, seatH + backH / 2, -seatR * 0.8);
      const railR = railL.clone(); railR.position.x = seatR * 0.75;
      const topBar = new THREE.Mesh(new THREE.BoxGeometry(seatR * 1.6, 0.03, 0.03), frameMat);
      topBar.position.set(0, seatH + backH, -seatR * 0.8);
      const ring = new THREE.Mesh(new THREE.TorusGeometry(seatR * 0.5, 0.013, 8, 20), frameMat);
      ring.position.set(0, seatH + backH * 0.58, -seatR * 0.8);
      [railL, railR, topBar, ring].forEach(m => (m.userData.part = "body"));
      addLegSet(g, [[-seatR * 0.78, -seatR * 0.78], [seatR * 0.78, -seatR * 0.78], [-seatR * 0.78, seatR * 0.78], [seatR * 0.78, seatR * 0.78]], { legH: seatH, rTop: 0.017, rBottom: 0.013, color: accent, metalness: 0.55, roughness: 0.35 });
      g.add(seat, railL, railR, topBar, ring);
      break;
    }
    case "crossback": {
      const seat = new THREE.Mesh(new THREE.BoxGeometry(seatW, 0.05, seatD), seatMat);
      seat.position.y = seatH; seat.userData.part = "body";
      const frameMat = new THREE.MeshStandardMaterial({ color: legColor, roughness: 0.6 });
      const postL = new THREE.Mesh(new THREE.CylinderGeometry(0.02, 0.02, backH, 8), frameMat);
      postL.position.set(-seatW * 0.42, seatH + backH / 2, -seatD * 0.44);
      const postR = postL.clone(); postR.position.x = seatW * 0.42;
      const topRail = new THREE.Mesh(new THREE.BoxGeometry(seatW * 0.9, 0.03, 0.03), frameMat);
      topRail.position.set(0, seatH + backH, -seatD * 0.44);
      const diag = Math.sqrt(Math.pow(seatW * 0.8, 2) + Math.pow(backH * 0.75, 2));
      const ang = Math.atan2(seatW * 0.8, backH * 0.75);
      const xBar1 = new THREE.Mesh(new THREE.BoxGeometry(0.025, diag, 0.025), frameMat);
      xBar1.position.set(0, seatH + backH * 0.5, -seatD * 0.44);
      xBar1.rotation.z = ang;
      const xBar2 = xBar1.clone(); xBar2.rotation.z = -ang;
      [postL, postR, topRail, xBar1, xBar2].forEach(m => (m.userData.part = "body"));
      addLegSet(g, [[-seatW * 0.4, -seatD * 0.4], [seatW * 0.4, -seatD * 0.4], [-seatW * 0.4, seatD * 0.4], [seatW * 0.4, seatD * 0.4]], { legH: seatH, rTop: 0.022, rBottom: 0.017, color: legColor });
      g.add(seat, postL, postR, topRail, xBar1, xBar2);
      break;
    }
    case "bentwood": {
      const seat = new THREE.Mesh(new THREE.CylinderGeometry(seatR, seatR, 0.05, 24), seatMat);
      seat.position.y = seatH; seat.userData.part = "body";
      const frameMat = new THREE.MeshStandardMaterial({ color: legColor, roughness: 0.55 });
      const hoop = new THREE.Mesh(new THREE.TorusGeometry(seatR * 0.72, 0.017, 8, 20, Math.PI), frameMat);
      hoop.rotation.x = Math.PI / 2;
      hoop.position.set(0, seatH + backH * 0.62, -seatR * 0.6);
      const supL = new THREE.Mesh(new THREE.CylinderGeometry(0.014, 0.014, backH, 8), frameMat);
      supL.position.set(-seatR * 0.55, seatH + backH / 2, -seatR * 0.85);
      const supR = supL.clone(); supR.position.x = seatR * 0.55;
      [hoop, supL, supR].forEach(m => (m.userData.part = "body"));
      addLegSet(g, [[-seatR * 0.78, -seatR * 0.78], [seatR * 0.78, -seatR * 0.78], [-seatR * 0.78, seatR * 0.78], [seatR * 0.78, seatR * 0.78]], { legH: seatH, rTop: 0.018, rBottom: 0.014, color: legColor });
      g.add(seat, hoop, supL, supR);
      break;
    }
    case "cane-oval": {
      const seat = new THREE.Mesh(new THREE.CylinderGeometry(seatR, seatR, 0.05, 24), seatMat);
      seat.position.y = seatH; seat.userData.part = "body";
      const frameMat = new THREE.MeshStandardMaterial({ color: legColor, roughness: 0.55 });
      const ringOuter = new THREE.Mesh(new THREE.TorusGeometry(seatR * 0.85, 0.02, 10, 24), frameMat);
      ringOuter.scale.set(1, 1.25, 1);
      ringOuter.position.set(0, seatH + backH * 0.62, -seatR * 0.55);
      const inner = new THREE.Mesh(
        new THREE.CylinderGeometry(seatR * 0.8, seatR * 0.8, 0.015, 24),
        new THREE.MeshStandardMaterial({ color: accent, roughness: 0.85, transparent: true, opacity: 0.9 })
      );
      inner.rotation.x = Math.PI / 2; inner.scale.set(1, 1.25, 1);
      inner.position.set(0, seatH + backH * 0.62, -seatR * 0.55);
      [ringOuter, inner].forEach(m => (m.userData.part = "body"));
      addLegSet(g, [[-seatR * 0.78, -seatR * 0.78], [seatR * 0.78, -seatR * 0.78], [-seatR * 0.78, seatR * 0.78], [seatR * 0.78, seatR * 0.78]], { legH: seatH, rTop: 0.019, rBottom: 0.019, color: legColor });
      g.add(seat, ringOuter, inner);
      break;
    }
    case "shell-channel": {
      const seat = new THREE.Mesh(new THREE.CylinderGeometry(seatR, seatR, 0.06, 24), seatMat);
      seat.position.y = seatH; seat.userData.part = "body";
      for (let i = 0; i < ribs; i++) {
        const t = ribs > 1 ? i / (ribs - 1) - 0.5 : 0;
        const rib = new THREE.Mesh(new THREE.BoxGeometry((seatR * 1.9) / ribs, backH, 0.05), seatMat);
        rib.position.set(t * seatR * 1.7, seatH + backH / 2, -seatR * 0.75 + Math.abs(t) * 0.06);
        rib.rotation.y = -t * 0.5;
        rib.userData.part = "body";
        g.add(rib);
      }
      addLegSet(g, [[-seatR * 0.7, -seatR * 0.7], [seatR * 0.7, -seatR * 0.7], [-seatR * 0.7, seatR * 0.7], [seatR * 0.7, seatR * 0.7]], { legH: seatH, rTop: 0.02, rBottom: 0.014, color: accent, metalness: 0.6, roughness: 0.35 });
      g.add(seat);
      break;
    }
    case "tub-barrel": {
      const seat = new THREE.Mesh(new THREE.CylinderGeometry(seatR, seatR, 0.06, 24), seatMat);
      seat.position.y = seatH; seat.userData.part = "body";
      const shellH = backH * 1.15;
      const shell = new THREE.Mesh(
        new THREE.CylinderGeometry(seatR * 1.05, seatR * 1.05, shellH, 24, 1, true, Math.PI * 0.35, Math.PI * 1.3),
        new THREE.MeshStandardMaterial({ color, roughness: 0.6, side: THREE.DoubleSide })
      );
      shell.position.y = seatH + shellH / 2 - 0.04;
      shell.userData.part = "body";
      addLegSet(g, [[-seatR * 0.62, -seatR * 0.55], [seatR * 0.62, -seatR * 0.55], [-seatR * 0.62, seatR * 0.55], [seatR * 0.62, seatR * 0.55]], { legH: seatH, rTop: 0.02, rBottom: 0.015, color: legColor, metalness: legMetalness, roughness: legRoughness });
      g.add(seat, shell);
      break;
    }
    case "wire-frame": {
      const shellH = backH * 1.3;
      const shell = new THREE.Mesh(
        new THREE.CylinderGeometry(seatR * 1.05, seatR * 1.05, shellH, 10, 1, true, Math.PI * 0.4, Math.PI * 1.2),
        new THREE.MeshStandardMaterial({ color, roughness: 0.4, metalness: 0.3, side: THREE.DoubleSide })
      );
      shell.position.y = seatH * 0.55 + shellH / 2 - 0.05;
      shell.userData.part = "body";
      const legMat = new THREE.MeshStandardMaterial({ color: legColor, metalness: 0.7, roughness: 0.3 });
      [-1, 1].forEach(side => {
        const rod1 = new THREE.Mesh(new THREE.CylinderGeometry(0.012, 0.012, seatH * 1.15, 8), legMat);
        rod1.position.set(side * seatR * 0.55, seatH / 2, -seatR * 0.3);
        rod1.rotation.z = side * 0.35;
        rod1.userData.part = "body";
        const rod2 = rod1.clone();
        rod2.position.z = seatR * 0.5;
        rod2.rotation.z = -side * 0.35;
        rod2.userData.part = "body";
        g.add(rod1, rod2);
      });
      g.add(shell);
      break;
    }
    case "molded-shell": {
      const shellH = backH * 0.95;
      const shell = new THREE.Mesh(
        new THREE.CylinderGeometry(seatR * 1.1, seatR * 1.1, shellH, 20, 1, true, Math.PI * 0.5, Math.PI),
        new THREE.MeshStandardMaterial({ color, roughness: 0.5, side: THREE.DoubleSide })
      );
      shell.position.y = seatH + shellH / 2 - 0.06;
      shell.rotation.x = -0.1;
      shell.userData.part = "body";
      const seatDisc = new THREE.Mesh(new THREE.CylinderGeometry(seatR, seatR, 0.04, 20), seatMat);
      seatDisc.position.y = seatH;
      seatDisc.userData.part = "body";
      const legMat = new THREE.MeshStandardMaterial({ color: legColor, roughness: 0.5 });
      [[-1, -1], [1, -1], [-1, 1], [1, 1]].forEach(([sx, sz]) => {
        const leg = new THREE.Mesh(new THREE.CylinderGeometry(0.014, 0.014, seatH, 8), legMat);
        leg.position.set(sx * seatR * 0.95, seatH / 2, sz * seatR * 0.95);
        leg.rotation.x = sz * 0.15;
        leg.rotation.z = -sx * 0.15;
        leg.userData.part = "body";
        g.add(leg);
      });
      g.add(shell, seatDisc);
      break;
    }
    case "armchair-open": {
      const seat = new THREE.Mesh(new THREE.BoxGeometry(seatW, 0.06, seatD), seatMat);
      seat.position.y = seatH; seat.userData.part = "body";
      const back = new THREE.Mesh(new THREE.BoxGeometry(seatW, backH, 0.06), seatMat);
      back.position.set(0, seatH + backH / 2, -seatD * 0.45);
      back.userData.part = "body";
      const armMat = new THREE.MeshStandardMaterial({ color: accent, roughness: 0.5, metalness: metalLegs ? 0.5 : 0.1 });
      [-1, 1].forEach(side => {
        const arm = new THREE.Mesh(new THREE.TorusGeometry(seatD * 0.28, 0.018, 8, 16, Math.PI), armMat);
        arm.rotation.x = Math.PI / 2; arm.rotation.z = Math.PI / 2;
        arm.position.set(side * seatW * 0.52, seatH + 0.14, 0);
        arm.userData.part = "body";
        g.add(arm);
      });
      addLegSet(g, [[-seatW * 0.4, -seatD * 0.4], [seatW * 0.4, -seatD * 0.4], [-seatW * 0.4, seatD * 0.4], [seatW * 0.4, seatD * 0.4]], { legH: seatH, rTop: 0.02, rBottom: 0.015, color: legColor, metalness: legMetalness, roughness: legRoughness });
      g.add(seat, back);
      break;
    }
    case "diamond-tufted": {
      const seat = new THREE.Mesh(new THREE.BoxGeometry(seatW, 0.08, seatD), seatMat);
      seat.position.y = seatH; seat.userData.part = "body";
      const back = new THREE.Mesh(new THREE.BoxGeometry(seatW, backH, 0.08), seatMat);
      back.position.set(0, seatH + backH / 2, -seatD * 0.45);
      back.userData.part = "body";
      addTuftButtons(g, seatW * 0.85, backH * 0.8, tuftCols, tuftRows, accent, 0, seatH + backH / 2, -seatD * 0.41);
      addLegSet(g, [[-seatW * 0.42, -seatD * 0.42], [seatW * 0.42, -seatD * 0.42], [-seatW * 0.42, seatD * 0.42], [seatW * 0.42, seatD * 0.42]], { legH: seatH, rTop: 0.02, rBottom: 0.016, color: legColor, box: true });
      g.add(seat, back);
      break;
    }
    case "channel-back": {
      const seat = new THREE.Mesh(new THREE.BoxGeometry(seatW, 0.08, seatD), seatMat);
      seat.position.y = seatH; seat.userData.part = "body";
      addChannelRibs(g, seatW * 0.9, backH * 0.94, 0.06, ribs, color, 0, seatH + backH / 2, -seatD * 0.44);
      addLegSet(g, [[-seatW * 0.42, -seatD * 0.42], [seatW * 0.42, -seatD * 0.42], [-seatW * 0.42, seatD * 0.42], [seatW * 0.42, seatD * 0.42]], { legH: seatH, rTop: 0.019, rBottom: 0.014, color: legColor });
      g.add(seat);
      break;
    }
    case "sled-base": {
      const seat = new THREE.Mesh(new THREE.BoxGeometry(seatW, 0.08, seatD), seatMat);
      seat.position.y = seatH; seat.userData.part = "body";
      const back = new THREE.Mesh(new THREE.BoxGeometry(seatW, backH, 0.08), seatMat);
      back.position.set(0, seatH + backH / 2, -seatD * 0.45);
      back.userData.part = "body";
      const sledMat = new THREE.MeshStandardMaterial({ color: legColor, metalness: legMetalness, roughness: legRoughness });
      [-1, 1].forEach(side => {
        const sled = new THREE.Mesh(new THREE.TorusGeometry(seatD * 0.55, 0.018, 8, 16, Math.PI * 0.9), sledMat);
        sled.rotation.y = Math.PI / 2;
        sled.position.set(side * seatW * 0.42, seatH * 0.5, -seatD * 0.05);
        sled.userData.part = "body";
        g.add(sled);
      });
      g.add(seat, back);
      break;
    }
    default: {
      const seat = new THREE.Mesh(new THREE.BoxGeometry(seatW, 0.06, seatD), seatMat);
      seat.position.y = seatH; seat.userData.part = "body";
      const back = new THREE.Mesh(new THREE.BoxGeometry(seatW, backH, 0.06), seatMat);
      back.position.set(0, seatH + backH / 2, -seatD * 0.45); back.userData.part = "body";
      addLegSet(g, [[-seatW * 0.4, -seatD * 0.4], [seatW * 0.4, -seatD * 0.4], [-seatW * 0.4, seatD * 0.4], [seatW * 0.4, seatD * 0.4]], { legH: seatH, rTop: 0.02, rBottom: 0.015, color: legColor });
      g.add(seat, back);
    }
  }
  return g;
}

export function buildChairStyle(variant) {
  const style = CHAIR_STYLES[variant] || CHAIR_STYLES["chiavari-rose"];
  return buildChairMesh(style);
}

export const CHAIR_STYLES = {
  "chiavari-rose":            { family: "chiavari",      color: 0xc1666b, accent: 0xc7c7c7 },
  "chiavari-navy-gold":       { family: "chiavari",      color: 0x3d5a80, accent: 0xC9A44C },
  "crossback-rustic":         { family: "crossback",     color: 0xb98a6f, legColor: 0x3d2817 },
  "crossback-charcoal":       { family: "crossback",     color: 0x2f4858, legColor: 0x1a1a1a },
  "bentwood-tan":             { family: "bentwood",      color: 0xd4a373, legColor: 0x8a5a44 },
  "bentwood-slate":           { family: "bentwood",      color: 0x5c6e8a, legColor: 0x1a1a1a },
  "cane-oval-natural":        { family: "cane-oval",     color: 0xc9a44c, legColor: 0x8a6a4a, accent: 0xd4a373 },
  "cane-oval-blue":           { family: "cane-oval",     color: 0x457b9d, legColor: 0x3d2817, accent: 0x9c7c33 },
  "cane-oval-green":          { family: "cane-oval",     color: 0x588157, legColor: 0x4a3728, accent: 0x386641 },
  "shell-channel-purple":     { family: "shell-channel", color: 0x6a4c93, accent: 0xC9A44C, ribs: 6 },
  "shell-channel-teal":       { family: "shell-channel", color: 0x2f6f6a, accent: 0x2c2c2c, ribs: 5 },
  "shell-channel-mustard":    { family: "shell-channel", color: 0xbc6c25, accent: 0xC9A44C, ribs: 7 },
  "tub-barrel-tan":           { family: "tub-barrel",    color: 0xc9a98a, legColor: 0x8a6a4a },
  "tub-barrel-rose":          { family: "tub-barrel",    color: 0xb56576, legColor: 0x3d2817 },
  "tub-barrel-navy":          { family: "tub-barrel",    color: 0x3d5a80, legColor: 0x2c2c2c, metalLegs: true },
  "wire-frame-black":         { family: "wire-frame",    color: 0x2c2c2c, legColor: 0x2c2c2c },
  "wire-frame-copper":        { family: "wire-frame",    color: 0xb5651d, legColor: 0x8a4a2a },
  "molded-shell-mustard":     { family: "molded-shell",  color: 0xbc6c25, legColor: 0x8a6a4a },
  "molded-shell-teal":        { family: "molded-shell",  color: 0x2f6f6a, legColor: 0x3d2817 },
  "open-arm-rose-gold":       { family: "armchair-open", color: 0xc1666b, accent: 0xC9A44C, legColor: 0xC9A44C, metalLegs: true },
  "open-arm-forest-black":    { family: "armchair-open", color: 0x386641, accent: 0x2c2c2c, legColor: 0x2c2c2c, metalLegs: true },
  "open-arm-terracotta-gold": { family: "armchair-open", color: 0xb98a6f, accent: 0xC9A44C, legColor: 0xC9A44C, metalLegs: true },
  "diamond-tufted-burgundy":  { family: "diamond-tufted",color: 0x8b2635, accent: 0xC9A44C, legColor: 0x1a1a1a },
  "diamond-tufted-navy":      { family: "diamond-tufted",color: 0x3d5a80, accent: 0xc7c7c7, legColor: 0x2c2c2c },
  "channel-back-sage":        { family: "channel-back",  color: 0x6f9b7a, legColor: 0x8a6a4a, ribs: 5 },
  "channel-back-plum":        { family: "channel-back",  color: 0x7c4a6b, legColor: 0x3d2817, ribs: 6 },
  "sled-base-charcoal":       { family: "sled-base",     color: 0x2f4858, legColor: 0x2c2c2c, metalLegs: true },
  "sled-base-rust":           { family: "sled-base",     color: 0xc97b5f, legColor: 0x8a6a4a },
};

export function buildSofaMesh(style) {
  const g = new THREE.Group();
  const {
    family, color = 0x7c3aed, legColor = 0x3d2817, accent = 0xC9A44C,
    width = 1.6, depth = 0.75, seatH = 0.42, backH = 0.5, armW = 0.16,
    metalLegs = false, ribs = 6, tuftCols = 4, tuftRows = 2, cushions = 2,
    chaiseSide = 1, legH: legHIn,
  } = style;
  const legH = legHIn ?? 0.1;
  const baseH = Math.max(seatH - legH, 0.08);
  const bodyMat = new THREE.MeshStandardMaterial({ color, roughness: 0.68 });
  const legMetalness = metalLegs ? 0.6 : 0.08;
  const legRoughness = metalLegs ? 0.32 : 0.55;

  switch (family) {
    case "track-arm-boxy": {
      const base = new THREE.Mesh(new THREE.BoxGeometry(width, baseH, depth), bodyMat);
      base.position.y = legH + baseH / 2; base.userData.part = "body";
      const back = new THREE.Mesh(new THREE.BoxGeometry(width, backH, 0.16), bodyMat);
      back.position.set(0, seatH + backH / 2 - 0.04, -depth / 2 + 0.08); back.userData.part = "body";
      const armL = new THREE.Mesh(new THREE.BoxGeometry(armW, backH * 0.85, depth), bodyMat);
      armL.position.set(-width / 2 + armW / 2, legH + (backH * 0.85) / 2, 0); armL.userData.part = "body";
      const armR = armL.clone(); armR.position.x = width / 2 - armW / 2; armR.userData.part = "body";
      const innerW = width - armW * 2 - 0.06;
      const cushW = innerW / cushions;
      for (let i = 0; i < cushions; i++) {
        const c = new THREE.Mesh(new THREE.BoxGeometry(cushW * 0.92, 0.16, depth * 0.78), new THREE.MeshStandardMaterial({ color, roughness: 0.72 }));
        c.position.set(-innerW / 2 + cushW * (i + 0.5), seatH + 0.08, 0.02);
        c.userData.part = "body";
        g.add(c);
      }
      addLegSet(g, [[-width * 0.44, -depth * 0.42], [width * 0.44, -depth * 0.42], [-width * 0.44, depth * 0.42], [width * 0.44, depth * 0.42]], { legH, rTop: 0.028, rBottom: 0.022, color: legColor, box: true, metalness: legMetalness, roughness: legRoughness });
      g.add(base, back, armL, armR);
      break;
    }
    case "rolled-bolster-arm": {
      const base = new THREE.Mesh(new THREE.BoxGeometry(width, baseH, depth), bodyMat);
      base.position.y = legH + baseH / 2; base.userData.part = "body";
      const back = new THREE.Mesh(new THREE.BoxGeometry(width, backH * 0.7, 0.16), bodyMat);
      back.position.set(0, seatH + backH * 0.35, -depth / 2 + 0.08); back.userData.part = "body";
      const armL = new THREE.Mesh(new THREE.CylinderGeometry(depth * 0.24, depth * 0.24, depth, 16), bodyMat);
      armL.rotation.z = Math.PI / 2; armL.position.set(-width / 2 + depth * 0.24, legH + baseH * 0.85, 0);
      armL.userData.part = "body";
      const armR = armL.clone(); armR.position.x = width / 2 - depth * 0.24; armR.userData.part = "body";
      if (tuftCols > 0) addTuftButtons(g, width * 0.7, backH * 0.5, tuftCols, 1, accent, 0, seatH + backH * 0.35, -depth / 2 + 0.16);
      addLegSet(g, [[-width * 0.4, -depth * 0.35], [width * 0.4, -depth * 0.35], [-width * 0.4, depth * 0.35], [width * 0.4, depth * 0.35]], { legH, rTop: 0.018, rBottom: 0.026, color: legColor });
      g.add(base, back, armL, armR);
      break;
    }
    case "channel-tufted-curved": {
      const arc = Math.PI * 0.55, curveSegs = 20;
      const shellH = backH;
      const shell = new THREE.Mesh(
        new THREE.CylinderGeometry(width * 0.55, width * 0.55, shellH, curveSegs, 1, true, Math.PI / 2 - arc / 2, arc),
        new THREE.MeshStandardMaterial({ color, roughness: 0.55, side: THREE.DoubleSide })
      );
      shell.position.y = legH + shellH / 2;
      shell.userData.part = "body";
      const seatPad = new THREE.Mesh(new THREE.CylinderGeometry(width * 0.5, width * 0.5, 0.1, curveSegs, 1, true, Math.PI / 2 - arc / 2, arc), new THREE.MeshStandardMaterial({ color, roughness: 0.7, side: THREE.DoubleSide }));
      seatPad.position.y = seatH;
      seatPad.userData.part = "body";
      addLegSet(g, [[-width * 0.35, -depth * 0.3], [width * 0.35, -depth * 0.3], [-width * 0.35, depth * 0.3], [width * 0.35, depth * 0.3]], { legH, rTop: 0.02, rBottom: 0.016, color: accent, metalness: 0.6, roughness: 0.35 });
      g.add(shell, seatPad);
      break;
    }
    case "chesterfield-tufted": {
      const base = new THREE.Mesh(new THREE.BoxGeometry(width, baseH, depth), bodyMat);
      base.position.y = legH + baseH / 2; base.userData.part = "body";
      const back = new THREE.Mesh(new THREE.BoxGeometry(width, backH, 0.16), bodyMat);
      back.position.set(0, seatH + backH / 2 - 0.02, -depth / 2 + 0.08); back.userData.part = "body";
      const armL = new THREE.Mesh(new THREE.BoxGeometry(armW * 1.4, backH * 0.7, depth), bodyMat);
      armL.position.set(-width / 2 + armW * 0.7, legH + (backH * 0.7) / 2, 0); armL.userData.part = "body";
      const armR = armL.clone(); armR.position.x = width / 2 - armW * 0.7; armR.userData.part = "body";
      addTuftButtons(g, width * 0.8, backH * 0.7, tuftCols, tuftRows, accent, 0, seatH + backH / 2 - 0.02, -depth / 2 + 0.17);
      addLegSet(g, [[-width * 0.42, -depth * 0.4], [width * 0.42, -depth * 0.4], [-width * 0.42, depth * 0.4], [width * 0.42, depth * 0.4]], { legH, rTop: 0.02, rBottom: 0.024, color: accent, metalness: 0.6, roughness: 0.3 });
      g.add(base, back, armL, armR);
      break;
    }
    case "sectional-chaise": {
      const base = new THREE.Mesh(new THREE.BoxGeometry(width, baseH, depth), bodyMat);
      base.position.y = legH + baseH / 2; base.userData.part = "body";
      const back = new THREE.Mesh(new THREE.BoxGeometry(width, backH, 0.16), bodyMat);
      back.position.set(0, seatH + backH / 2 - 0.04, -depth / 2 + 0.08); back.userData.part = "body";
      const armL = new THREE.Mesh(new THREE.BoxGeometry(armW, backH * 0.85, depth), bodyMat);
      armL.position.set(-width / 2 + armW / 2, legH + (backH * 0.85) / 2, 0); armL.userData.part = "body";
      const chaiseDepth = depth * 1.7;
      const chaise = new THREE.Mesh(new THREE.BoxGeometry(depth * 1.05, baseH, chaiseDepth), bodyMat);
      chaise.position.set(chaiseSide * (width / 2 + depth * 0.45), legH + baseH / 2, depth * 0.1);
      chaise.userData.part = "body";
      const chaiseCush = new THREE.Mesh(new THREE.BoxGeometry(depth * 0.95, 0.14, chaiseDepth * 0.9), new THREE.MeshStandardMaterial({ color, roughness: 0.72 }));
      chaiseCush.position.set(chaiseSide * (width / 2 + depth * 0.45), seatH + 0.07, depth * 0.1);
      chaiseCush.userData.part = "body";
      addLegSet(g, [[-width * 0.42, -depth * 0.4], [width * 0.42 - 0.02, -depth * 0.4], [-width * 0.42, depth * 0.4]], { legH, rTop: 0.026, rBottom: 0.02, color: legColor, box: true });
      addLegSet(g, [[chaiseSide * (width / 2 + depth * 0.75), -chaiseDepth * 0.35], [chaiseSide * (width / 2 + depth * 0.75), chaiseDepth * 0.35]], { legH, rTop: 0.026, rBottom: 0.02, color: legColor, box: true });
      g.add(base, back, armL, chaise, chaiseCush);
      break;
    }
    case "scroll-arm-sleigh": {
      const base = new THREE.Mesh(new THREE.BoxGeometry(width, baseH, depth), bodyMat);
      base.position.y = legH + baseH / 2; base.userData.part = "body";
      const back = new THREE.Mesh(new THREE.BoxGeometry(width * 0.92, backH * 0.75, 0.14), bodyMat);
      back.position.set(0, seatH + backH * 0.375 - 0.02, -depth / 2 + 0.1); back.userData.part = "body";
      [-1, 1].forEach(side => {
        const scroll = new THREE.Mesh(new THREE.TorusGeometry(depth * 0.32, 0.06, 10, 20, Math.PI * 1.1), bodyMat);
        scroll.rotation.y = Math.PI / 2;
        scroll.rotation.z = side > 0 ? 0.3 : Math.PI - 0.3;
        scroll.position.set(side * (width / 2 - depth * 0.3), legH + backH * 0.55, -depth * 0.05);
        scroll.userData.part = "body";
        g.add(scroll);
      });
      addLegSet(g, [[-width * 0.4, -depth * 0.4], [width * 0.4, -depth * 0.4], [-width * 0.4, depth * 0.4], [width * 0.4, depth * 0.4]], { legH, rTop: 0.02, rBottom: 0.026, color: legColor, metalness: legMetalness, roughness: legRoughness });
      g.add(base, back);
      break;
    }
    case "pillow-back-loose": {
      const base = new THREE.Mesh(new THREE.BoxGeometry(width, baseH, depth), bodyMat);
      base.position.y = legH + baseH / 2; base.userData.part = "body";
      const armL = new THREE.Mesh(new THREE.BoxGeometry(armW, backH * 0.75, depth), bodyMat);
      armL.position.set(-width / 2 + armW / 2, legH + (backH * 0.75) / 2, 0); armL.userData.part = "body";
      const armR = armL.clone(); armR.position.x = width / 2 - armW / 2; armR.userData.part = "body";
      const innerW = width - armW * 2 - 0.08;
      const pillowW = innerW / cushions;
      for (let i = 0; i < cushions; i++) {
        const p = new THREE.Mesh(new THREE.BoxGeometry(pillowW * 0.9, backH * 0.62, 0.18), new THREE.MeshStandardMaterial({ color, roughness: 0.75 }));
        p.position.set(-innerW / 2 + pillowW * (i + 0.5), seatH + backH * 0.31, -depth / 2 + 0.14);
        p.userData.part = "body";
        g.add(p);
        const c = new THREE.Mesh(new THREE.BoxGeometry(pillowW * 0.92, 0.15, depth * 0.75), new THREE.MeshStandardMaterial({ color, roughness: 0.72 }));
        c.position.set(-innerW / 2 + pillowW * (i + 0.5), seatH + 0.08, 0.02);
        c.userData.part = "body";
        g.add(c);
      }
      addLegSet(g, [[-width * 0.42, -depth * 0.4], [width * 0.42, -depth * 0.4], [-width * 0.42, depth * 0.4], [width * 0.42, depth * 0.4]], { legH, rTop: 0.02, rBottom: 0.015, color: legColor });
      g.add(base, armL, armR);
      break;
    }
    case "curved-cocoon": {
      const arc = Math.PI * 1.5;
      const shellH = seatH + backH * 0.9;
      const shell = new THREE.Mesh(
        new THREE.CylinderGeometry(width * 0.42, width * 0.42, shellH, 24, 1, true, Math.PI / 2 - arc / 2, arc),
        new THREE.MeshStandardMaterial({ color, roughness: 0.55, side: THREE.DoubleSide })
      );
      shell.rotation.x = 0.06;
      shell.position.y = shellH / 2;
      shell.userData.part = "body";
      const seatPad = new THREE.Mesh(new THREE.CylinderGeometry(width * 0.4, width * 0.4, 0.1, 24), new THREE.MeshStandardMaterial({ color, roughness: 0.7 }));
      seatPad.position.y = seatH;
      seatPad.userData.part = "body";
      if (legH > 0.02) {
        addLegSet(g, [[-width * 0.25, -depth * 0.2], [width * 0.25, -depth * 0.2], [-width * 0.25, depth * 0.2], [width * 0.25, depth * 0.2]], { legH, rTop: 0.02, rBottom: 0.02, color: legColor, metalness: legMetalness, roughness: legRoughness });
      } else {
        const plinth = new THREE.Mesh(new THREE.CylinderGeometry(width * 0.3, width * 0.34, 0.06, 24), new THREE.MeshStandardMaterial({ color: legColor, roughness: 0.6 }));
        plinth.position.y = 0.03; plinth.userData.part = "body";
        g.add(plinth);
      }
      g.add(shell, seatPad);
      break;
    }
    case "tuxedo-track": {
      const base = new THREE.Mesh(new THREE.BoxGeometry(width, baseH, depth), bodyMat);
      base.position.y = legH + baseH / 2; base.userData.part = "body";
      const back = new THREE.Mesh(new THREE.BoxGeometry(width, backH, 0.14), bodyMat);
      back.position.set(0, seatH + backH / 2 - 0.03, -depth / 2 + 0.07); back.userData.part = "body";
      const armL = new THREE.Mesh(new THREE.BoxGeometry(armW, backH, depth), bodyMat);
      armL.position.set(-width / 2 + armW / 2, seatH + backH / 2 - 0.03, 0); armL.userData.part = "body";
      const armR = armL.clone(); armR.position.x = width / 2 - armW / 2; armR.userData.part = "body";
      const trim = new THREE.Mesh(new THREE.BoxGeometry(width, 0.02, 0.02), new THREE.MeshStandardMaterial({ color: accent, roughness: 0.4 }));
      trim.position.set(0, seatH + 0.01, depth / 2 - 0.02); trim.userData.part = "body";
      addLegSet(g, [[-width * 0.44, -depth * 0.42], [width * 0.44, -depth * 0.42], [-width * 0.44, depth * 0.42], [width * 0.44, depth * 0.42]], { legH, rTop: 0.024, rBottom: 0.024, color: legColor, box: true });
      g.add(base, back, armL, armR, trim);
      break;
    }
    case "shell-scallop-back": {
      const base = new THREE.Mesh(new THREE.BoxGeometry(width, baseH, depth), bodyMat);
      base.position.y = legH + baseH / 2; base.userData.part = "body";
      const arc = Math.PI * 0.85;
      const shell = new THREE.Mesh(
        new THREE.CylinderGeometry(width * 0.52, width * 0.52, backH, 24, 1, true, Math.PI / 2 - arc / 2, arc),
        new THREE.MeshStandardMaterial({ color, roughness: 0.55, side: THREE.DoubleSide })
      );
      shell.position.y = seatH + backH / 2 - 0.05;
      shell.userData.part = "body";
      for (let i = 0; i < ribs; i++) {
        const t = ribs > 1 ? i / (ribs - 1) : 0;
        const ang = (Math.PI / 2 - arc / 2) + t * arc;
        const rib = new THREE.Mesh(new THREE.BoxGeometry(0.035, backH * 0.9, 0.02), bodyMat);
        rib.position.set(Math.cos(ang) * width * 0.54, seatH + backH / 2 - 0.05, Math.sin(ang) * width * 0.54);
        rib.rotation.y = -ang;
        rib.userData.part = "body";
        g.add(rib);
      }
      addLegSet(g, [[-width * 0.4, -depth * 0.38], [width * 0.4, -depth * 0.38], [-width * 0.4, depth * 0.38], [width * 0.4, depth * 0.38]], { legH, rTop: 0.02, rBottom: 0.015, color: legColor });
      g.add(base, shell);
      break;
    }
    default: {
      const base = new THREE.Mesh(new THREE.BoxGeometry(width, baseH, depth), bodyMat);
      base.position.y = legH + baseH / 2; base.userData.part = "body";
      const back = new THREE.Mesh(new THREE.BoxGeometry(width, backH, 0.15), bodyMat);
      back.position.set(0, seatH + backH / 2, -depth / 2 + 0.08); back.userData.part = "body";
      addLegSet(g, [[-width * 0.4, -depth * 0.4], [width * 0.4, -depth * 0.4], [-width * 0.4, depth * 0.4], [width * 0.4, depth * 0.4]], { legH, rTop: 0.02, rBottom: 0.02, color: legColor });
      g.add(base, back);
    }
  }
  return g;
}

export function buildSofaStyle(variant) {
  const style = SOFA_STYLES[variant] || SOFA_STYLES["track-arm-navy"];
  return buildSofaMesh(style);
}

export const SOFA_STYLES = {
  "track-arm-navy":            { family: "track-arm-boxy",       color: 0x3d5a80, legColor: 0x2c2c2c, cushions: 3, width: 2.0 },
  "track-arm-olive":           { family: "track-arm-boxy",       color: 0x588157, legColor: 0x8a6a4a, cushions: 2, width: 1.4 },
  "track-arm-rust":            { family: "track-arm-boxy",       color: 0xc97b5f, legColor: 0x3d2817, cushions: 3, width: 1.9 },
  "rolled-arm-burgundy":       { family: "rolled-bolster-arm",    color: 0x8b2635, legColor: 0x3d2817, tuftCols: 3, width: 1.8 },
  "rolled-arm-teal":           { family: "rolled-bolster-arm",    color: 0x2f6f6a, legColor: 0x8a6a4a, tuftCols: 4, width: 2.0 },
  "rolled-arm-mustard":        { family: "rolled-bolster-arm",    color: 0xbc6c25, legColor: 0x3d2817, tuftCols: 2, width: 1.3 },
  "channel-curved-terracotta": { family: "channel-tufted-curved", color: 0xb98a6f, accent: 0xC9A44C, width: 1.8 },
  "channel-curved-forest":     { family: "channel-tufted-curved", color: 0x386641, accent: 0x2c2c2c, width: 2.0 },
  "channel-curved-plum":       { family: "channel-tufted-curved", color: 0x7c4a6b, accent: 0xC9A44C, width: 1.6 },
  "chesterfield-cognac":       { family: "chesterfield-tufted",   color: 0x9c6b3f, accent: 0xC9A44C, tuftCols: 5, tuftRows: 2, width: 2.0 },
  "chesterfield-emerald":      { family: "chesterfield-tufted",   color: 0x2f6f4a, accent: 0xC9A44C, tuftCols: 4, tuftRows: 2, width: 1.8 },
  "chesterfield-charcoal":     { family: "chesterfield-tufted",   color: 0x33383d, accent: 0xc7c7c7, legColor: 0x1a1a1a, tuftCols: 4, tuftRows: 2, width: 1.7 },
  "sectional-navy":            { family: "sectional-chaise",      color: 0x3d5a80, legColor: 0x2c2c2c, chaiseSide: 1, width: 1.8, depth: 0.8 },
  "sectional-sage":            { family: "sectional-chaise",      color: 0x6f9b7a, legColor: 0x8a6a4a, chaiseSide: -1, width: 1.8, depth: 0.8 },
  "sectional-charcoal":        { family: "sectional-chaise",      color: 0x2f4858, legColor: 0x1a1a1a, chaiseSide: 1, width: 2.0, depth: 0.8 },
  "scroll-arm-burgundy":       { family: "scroll-arm-sleigh",     color: 0x8b2635, legColor: 0xC9A44C, metalLegs: true, width: 1.9 },
  "scroll-arm-navy":           { family: "scroll-arm-sleigh",     color: 0x3d5a80, legColor: 0x8a6a4a, width: 1.8 },
  "scroll-arm-forest":         { family: "scroll-arm-sleigh",     color: 0x386641, legColor: 0x3d2817, width: 2.0 },
  "pillow-back-rust":          { family: "pillow-back-loose",     color: 0xc97b5f, legColor: 0x8a6a4a, cushions: 3, width: 2.0 },
  "pillow-back-plum":          { family: "pillow-back-loose",     color: 0x7c4a6b, legColor: 0x3d2817, cushions: 2, width: 1.5 },
  "pillow-back-teal":          { family: "pillow-back-loose",     color: 0x2f6f6a, legColor: 0x8a6a4a, cushions: 3, width: 1.9 },
  "cocoon-blush":              { family: "curved-cocoon",         color: 0xb56576, legColor: 0x3d2817, legH: 0, width: 1.6 },
  "cocoon-mustard":            { family: "curved-cocoon",         color: 0xbc6c25, legColor: 0xC9A44C, metalLegs: true, legH: 0.1, width: 1.7 },
  "cocoon-charcoal":           { family: "curved-cocoon",         color: 0x2f4858, legColor: 0x1a1a1a, legH: 0, width: 1.8 },
  "tuxedo-navy":               { family: "tuxedo-track",          color: 0x3d5a80, accent: 0xC9A44C, legColor: 0x1a1a1a, width: 1.9 },
  "tuxedo-olive":               { family: "tuxedo-track",          color: 0x588157, accent: 0xC9A44C, legColor: 0x3d2817, width: 1.7 },
  "shell-scallop-purple":      { family: "shell-scallop-back",    color: 0x6a4c93, legColor: 0xC9A44C, metalLegs: true, ribs: 7, width: 1.9 },
  "shell-scallop-teal":        { family: "shell-scallop-back",    color: 0x2f6f6a, legColor: 0x8a6a4a, ribs: 6, width: 1.8 },
  "shell-scallop-rose":        { family: "shell-scallop-back",    color: 0xc1666b, legColor: 0x3d2817, ribs: 8, width: 2.0 },
};
