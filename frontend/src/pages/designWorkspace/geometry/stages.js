/* Creates different stage and platform styles for the 3D workspace.

   Stages can include steps and different backdrop shapes.

   The platform and backdrop can be edited and colored separately.
*/

import * as THREE from "three";
import { buildArchPanel } from "./branding";
import { buildFlatPolygonPanel, outlineWavyTop } from "./panelsSignsArt";
import { buildCurtainPanel } from "./curtains";

export function buildPlatformSlab(outline, thickness, color, part) {
  const n = outline.length;
  const positions = [];
  const indices = [];
  outline.forEach(p => positions.push(p.x, thickness, p.z)); // 0..n-1 top ring
  outline.forEach(p => positions.push(p.x, 0, p.z));         // n..2n-1 bottom ring
  for (let i = 1; i < n - 1; i++) {
    indices.push(0, i + 1, i);         // top face (+Y)
    indices.push(n, n + i, n + i + 1); // bottom face (-Y)
  }
  for (let i = 0; i < n; i++) {
    const j = (i + 1) % n;
    const a = i, b = j, c = n + i, e = n + j;
    indices.push(a, b, c, b, e, c); // outward-facing side wall
  }
  const geo = new THREE.BufferGeometry();
  geo.setAttribute("position", new THREE.Float32BufferAttribute(positions, 3));
  geo.setIndex(indices);
  geo.computeVertexNormals();
  const mesh = new THREE.Mesh(geo, new THREE.MeshStandardMaterial({ color, roughness: 0.6, side: THREE.DoubleSide }));
  mesh.userData.part = part;
  return mesh;
}

export function outlinePlatformWavyFront(w, d, amp, waves, segs = 16) {
  const hw = w / 2, hd = d / 2;
  const pts = [{ x: -hw, z: -hd }, { x: hw, z: -hd }];
  for (let i = 0; i <= segs; i++) {
    const t = i / segs;
    pts.push({ x: hw - t * w, z: hd + Math.sin(t * Math.PI * waves) * amp });
  }
  return pts;
}

export function outlinePlatformOrganic(rBase, segs = 28) {
  const pts = [];
  for (let s = 0; s < segs; s++) {
    const theta = (s / segs) * Math.PI * 2;
    const r = rBase * (1 + 0.22 * Math.cos(theta * 2 + 0.4) + 0.14 * Math.sin(theta * 3 + 1.1));
    pts.push({ x: Math.cos(theta) * r, z: Math.sin(theta) * r });
  }
  return pts;
}

export function buildStagePlatform(kind, opts = {}) {
  const { w = 2.6, d = 1.9, height = 0.36, color = 0xf2efe9, r = 1.1, sides = 8, tiers = 2, tierShrink = 0.85 } = opts;
  const g = new THREE.Group();
  const mat = () => new THREE.MeshStandardMaterial({ color, roughness: 0.6 });

  if (kind === "rect") {
    const box = new THREE.Mesh(new THREE.BoxGeometry(w, height, d), mat());
    box.position.y = height / 2; box.userData.part = "platform";
    g.add(box);
  } else if (kind === "round" || kind === "polygon") {
    const cyl = new THREE.Mesh(new THREE.CylinderGeometry(r, r, height, kind === "polygon" ? sides : 40), mat());
    cyl.position.y = height / 2; cyl.userData.part = "platform";
    g.add(cyl);
  } else if (kind === "round-tiered") {
    let y = 0, rr = r;
    const tierH = height / tiers;
    for (let i = 0; i < tiers; i++) {
      const tier = new THREE.Mesh(new THREE.CylinderGeometry(rr, rr, tierH, 40), mat());
      tier.position.y = y + tierH / 2; tier.userData.part = "platform";
      g.add(tier);
      y += tierH; rr *= tierShrink;
    }
  } else if (kind === "inset-top") {
    const base = new THREE.Mesh(new THREE.BoxGeometry(w, height * 0.55, d), mat());
    base.position.y = height * 0.275; base.userData.part = "platform";
    g.add(base);
    const top = new THREE.Mesh(new THREE.BoxGeometry(w * 0.6, height * 0.45, d * 0.6), mat());
    top.position.y = height * 0.55 + height * 0.225; top.userData.part = "platform";
    g.add(top);
  } else if (kind === "wavy") {
    g.add(buildPlatformSlab(outlinePlatformWavyFront(w, d, opts.waveAmp ?? 0.1, opts.waves ?? 2), height, color, "platform"));
  } else if (kind === "organic") {
    g.add(buildPlatformSlab(outlinePlatformOrganic(r), height, color, "platform"));
  } else if (kind === "drum") {
    const drum = new THREE.Mesh(new THREE.CylinderGeometry(r, r * 1.06, height, 44), mat());
    drum.position.y = height / 2; drum.userData.part = "platform";
    g.add(drum);
    const foot = new THREE.Mesh(new THREE.CylinderGeometry(r * 1.1, r * 1.16, height * 0.08, 44), mat());
    foot.position.y = height * 0.04; foot.userData.part = "platform";
    g.add(foot);
  } else if (kind === "pyramid") {
    let y = 0;
    const tierH = height / tiers;
    for (let i = 0; i < tiers; i++) {
      const ww = w * (1 - i * (1 - tierShrink));
      const dd = d * (1 - i * (1 - tierShrink));
      const tier = new THREE.Mesh(new THREE.BoxGeometry(ww, tierH, dd), mat());
      tier.position.y = y + tierH / 2; tier.userData.part = "platform";
      g.add(tier);
      y += tierH;
    }
  }
  return g;
}

export function buildStageSteps(kind, w, d, height, color) {
  const g = new THREE.Group();
  const mat = () => new THREE.MeshStandardMaterial({ color, roughness: 0.6 });
  if (kind === "single") {
    const stepH = height * 0.4, stepD = d * 0.16;
    const step = new THREE.Mesh(new THREE.BoxGeometry(w * 0.44, stepH, stepD), mat());
    step.position.set(0, stepH / 2, d / 2 + stepD / 2); step.userData.part = "platform";
    g.add(step);
  } else if (kind === "multi") {
    const n = 2, stepD = d * 0.14;
    for (let i = 0; i < n; i++) {
      const stepH = height * (0.75 - i * 0.3);
      const stepW = w * (0.5 - i * 0.06);
      const step = new THREE.Mesh(new THREE.BoxGeometry(stepW, stepH, stepD), mat());
      step.position.set(0, stepH / 2, d / 2 + stepD * (i + 1) - stepD * 0.5); step.userData.part = "platform";
      g.add(step);
    }
  }
  return g;
}

export function buildStageBackdrop(kind, w, h, d, color) {
  const g = new THREE.Group();
  const mat = () => new THREE.MeshStandardMaterial({ color, roughness: 0.6 });
  const bz = -d * 0.42;
  if (kind === "flat" || kind === "tall-flat") {
    const p = new THREE.Mesh(new THREE.BoxGeometry(w, h, 0.08), mat());
    p.position.set(0, h / 2, bz); p.userData.part = "backdrop";
    g.add(p);
  } else if (kind === "wave") {
    const panel = buildFlatPolygonPanel(outlineWavyTop(w, h, 0.2, 2), 0.09, color, "backdrop");
    panel.position.z = bz; g.add(panel);
  } else if (kind === "curved-s") {
    const panel = buildFlatPolygonPanel(outlineWavyTop(w, h, 0.16, 1.4), 0.08, color, "backdrop");
    panel.position.z = bz; g.add(panel);
  } else if (kind === "round-arch") {
    const ringR = w * 0.42;
    const ring = new THREE.Mesh(new THREE.TorusGeometry(ringR, ringR * 0.13, 12, 32, Math.PI), mat());
    ring.position.set(0, 0, bz); ring.userData.part = "backdrop";
    g.add(ring);
  } else if (kind === "arch-dome") {
    const panel = buildArchPanel(w * 0.85, h, 0.09, color, "backdrop");
    panel.position.z = bz; g.add(panel);
  } else if (kind === "tall-arch-dome") {
    const panel = buildArchPanel(w * 0.55, h, 0.09, color, "backdrop");
    panel.position.z = bz; g.add(panel);
  } else if (kind === "open-frame") {
    const barT = 0.06;
    const mk = (bw, bh, x, y) => { const m = new THREE.Mesh(new THREE.BoxGeometry(bw, bh, barT), mat()); m.position.set(x, y, bz); m.userData.part = "backdrop"; g.add(m); };
    mk(w, barT, 0, h);
    mk(w, barT, 0, 0.02);
    mk(barT, h, -w / 2, h / 2);
    mk(barT, h, w / 2, h / 2);
  } else if (kind === "multi-panel") {
    const heights = [h * 0.8, h, h * 0.85];
    const xs = [-w * 0.32, 0, w * 0.32];
    const zs = [bz + 0.04, bz, bz + 0.04];
    heights.forEach((hh, i) => {
      const p = new THREE.Mesh(new THREE.BoxGeometry(w * 0.34, hh, 0.07), mat());
      p.position.set(xs[i], hh / 2, zs[i]); p.userData.part = "backdrop";
      g.add(p);
    });
  } else if (kind === "curtain-flat") {
    const p = new THREE.Mesh(new THREE.BoxGeometry(w, h, 0.08), mat());
    p.position.set(0, h / 2, bz); p.userData.part = "backdrop";
    g.add(p);
    [-1, 1].forEach(side => {
      const curtain = buildCurtainPanel(w * 0.22, h * 0.9, { color: 0xf7f1e4, opacity: 0.95, foldAmp: 0.02, foldFreq: 3 });
      curtain.position.set(side * w * 0.44, 0, bz + 0.06);
      curtain.userData.part = "backdrop";
      g.add(curtain);
    });
  } else if (kind === "triple-arch") {
    const heights = [h * 0.75, h, h * 0.75];
    const xs = [-w * 0.32, 0, w * 0.32];
    heights.forEach((hh, i) => {
      const arch = buildArchPanel(w * 0.3, hh, 0.08, color, "backdrop");
      arch.position.set(xs[i], 0, bz + (i % 2 === 0 ? 0.02 : -0.02));
      g.add(arch);
    });
  } else if (kind === "corner") {
    const p1 = new THREE.Mesh(new THREE.BoxGeometry(w * 0.55, h, 0.08), mat());
    p1.position.set(-w * 0.24, h / 2, bz); p1.userData.part = "backdrop";
    g.add(p1);
    const p2 = new THREE.Mesh(new THREE.BoxGeometry(d * 0.7, h, 0.08), mat());
    p2.rotation.y = Math.PI / 2;
    p2.position.set(w * 0.02, h / 2, bz + d * 0.28); p2.userData.part = "backdrop";
    g.add(p2);
  } else if (kind === "side-walls") {
    [-1, 1].forEach(side => {
      const p = new THREE.Mesh(new THREE.BoxGeometry(0.08, h, d * 0.7), mat());
      p.position.set(side * w * 0.46, h / 2, bz + d * 0.2); p.userData.part = "backdrop";
      g.add(p);
    });
  }
  return g;
}

// Every variant gets its own distinct, clearly-saturated default color
// (rather than the one shared cream), so each stage reads apart from its
// neighbors in the catalog list, not just in the 3D scene.
export const STAGE_STYLES = {
  "flat-backdrop":           { platform: "rect", w: 2.6, d: 1.9, height: 0.36, step: "single", backdrop: "flat", backdropH: 1.5, color: "#d98e73" },
  "round-tiered-podium":     { platform: "round-tiered", r: 1.15, height: 0.34, tiers: 2, step: "none", backdrop: "none", color: "#6b8f71" },
  "inset-top-platform":      { platform: "inset-top", w: 2.5, d: 1.8, height: 0.4, step: "single", backdrop: "none", color: "#c9a44c" },
  "wave-backdrop":           { platform: "wavy", w: 2.6, d: 1.9, height: 0.36, waveAmp: 0.1, waves: 2, step: "single", backdrop: "wave", backdropH: 1.5, color: "#7a9cc6" },
  "side-wall-panels":        { platform: "rect", w: 2.5, d: 1.85, height: 0.36, step: "multi", backdrop: "side-walls", backdropH: 1.5, color: "#a65d57" },
  "round-arch":              { platform: "round", r: 1.05, height: 0.3, step: "none", backdrop: "round-arch", backdropH: 1.55, color: "#8e7cc3" },
  "tall-flat-backdrop":      { platform: "rect", w: 2.6, d: 1.9, height: 0.36, step: "single", backdrop: "tall-flat", backdropH: 1.85, color: "#2f4858" },
  "arch-dome-backdrop":      { platform: "rect", w: 2.6, d: 1.9, height: 0.36, step: "single", backdrop: "arch-dome", backdropH: 1.4, color: "#d4a5a5" },
  "tall-arch-dome-backdrop": { platform: "rect", w: 2.6, d: 1.9, height: 0.36, step: "single", backdrop: "tall-arch-dome", backdropH: 1.7, color: "#4a7c6f" },
  "octagon-platform":        { platform: "polygon", sides: 8, r: 1.15, height: 0.36, step: "single", backdrop: "none", color: "#b08968" },
  "curved-s-tiered":         { platform: "round-tiered", r: 1.2, height: 0.4, tiers: 3, step: "none", backdrop: "curved-s", backdropH: 1.7, color: "#6f4e7c" },
  "open-frame-backdrop":     { platform: "rect", w: 2.6, d: 1.9, height: 0.36, step: "single", backdrop: "open-frame", backdropH: 1.75, color: "#7c8471" },
  "multi-panel-backdrop":    { platform: "rect", w: 2.6, d: 1.9, height: 0.36, step: "single", backdrop: "multi-panel", backdropH: 1.5, color: "#9c4f4f" },
  "round-drum":              { platform: "drum", r: 1.0, height: 0.85, step: "none", backdrop: "none", color: "#3f6b6f" },
  "tiered-pyramid":          { platform: "pyramid", w: 2.6, d: 1.9, height: 0.55, tiers: 4, tierShrink: 0.78, step: "none", backdrop: "none", color: "#c17c3f" },
  "curtain-backdrop":        { platform: "rect", w: 2.6, d: 1.9, height: 0.36, step: "single", backdrop: "curtain-flat", backdropH: 1.5, color: "#b5647a" },
  "organic-platform":        { platform: "organic", r: 1.15, height: 0.28, step: "none", backdrop: "none", color: "#6a8caf" },
  "hexagon-platform":        { platform: "polygon", sides: 6, r: 1.15, height: 0.36, step: "single", backdrop: "none", color: "#4f6b4f" },
  "triple-arch-backdrop":    { platform: "rect", w: 2.6, d: 1.9, height: 0.36, step: "single", backdrop: "triple-arch", backdropH: 1.55, color: "#a3785f" },
  "corner-backdrop":         { platform: "rect", w: 2.6, d: 1.9, height: 0.36, step: "multi", backdrop: "corner", backdropH: 1.6, color: "#5c5470" },
};

/* Assembles a full stage: a platform (plus optional step riser) plus an
   optional backdrop wall, positioned on top of the platform, from
   STAGE_STYLES for a given variant id. */
export function buildStage(variant) {
  const style = STAGE_STYLES[variant] || STAGE_STYLES["flat-backdrop"];
  const g = new THREE.Group();
  const color = style.color ?? 0xf2efe9;
  const footprintW = style.w ?? style.r * 2;
  const footprintD = style.d ?? style.r * 2;
  g.add(buildStagePlatform(style.platform, { ...style, color }));
  if (style.step && style.step !== "none") {
    g.add(buildStageSteps(style.step, footprintW, footprintD, style.height, color));
  }
  if (style.backdrop && style.backdrop !== "none") {
    const backdrop = buildStageBackdrop(style.backdrop, footprintW, style.backdropH ?? 1.5, footprintD, color);
    backdrop.position.y = style.height;
    g.add(backdrop);
  }
  return g;
}
