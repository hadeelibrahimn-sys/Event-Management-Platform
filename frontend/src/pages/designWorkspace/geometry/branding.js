/* Booth branding and shared arch/fluted geometry helpers.
   Extracted from Designworkspace.jsx. */

import * as THREE from "three";
import { DEFAULT_BRANDING_FONT, BRANDING_PANEL_POS } from "../catalog";

export function generateBrandingTexture(text, font, fontSize, color) {
  const canvas = document.createElement("canvas");
  canvas.width = 512; canvas.height = 160;
  const ctx = canvas.getContext("2d");
  ctx.clearRect(0, 0, 512, 160);
  ctx.fillStyle = color || "#1a0a3d";
  ctx.font = `${fontSize || 48}px "${font || DEFAULT_BRANDING_FONT}", sans-serif`;
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  ctx.fillText(text, 256, 80);
  const tex = new THREE.CanvasTexture(canvas);
  tex.needsUpdate = true;
  return tex;
}

/* A thin transparent plane with the booth's name painted on, like vinyl
   lettering directly on the front face, matching the reference photos.
   This is used instead of a separate raised sign panel. Returns null when
   there's no text yet so a blank white rectangle doesn't float on every
   fresh booth.
   Position is looked up by "type:variant" first (for type+variant families
   like backdrop-panel/welcome-sign, where each variant is a genuinely
   different height/depth), falling back to plain `type` for the older
   one-shape-per-type stations that predate variants. */
export function buildBrandingPanel(branding, type, variant) {
  if (!branding || !branding.text || !branding.text.trim()) return null;
  const tex = generateBrandingTexture(branding.text, branding.font, branding.fontSize, branding.color);
  const mat = new THREE.MeshStandardMaterial({ map: tex, transparent: true, roughness: 0.7 });
  const panelW = 1.0, panelH = panelW * (160 / 512);
  const mesh = new THREE.Mesh(new THREE.PlaneGeometry(panelW, panelH), mat);
  const pos = BRANDING_PANEL_POS[`${type}:${variant}`] || BRANDING_PANEL_POS[type] || { y: 0.5, z: 0.311 };
  mesh.position.set(branding.offsetX || 0, pos.y, pos.z);
  mesh.userData.keepOwnMaterial = true; // The item's material/color picker shouldn't touch painted-on text
  return mesh;
}

/* A stylized rounded-top arch: a rectangular body capped with a squashed
   dome. Reused by every arch-shaped backdrop/booth/storefront type below
   instead of hand-building the same silhouette repeatedly. Returns a Group
   positioned so its base sits at y=0, with every mesh inside tagged with
   the given part name for per-part coloring. */
export function buildArchPanel(width, height, depth, color, part) {
  const g = new THREE.Group();
  const capH = width / 2;
  const bodyH = Math.max(0.05, height - capH);
  const body = new THREE.Mesh(
    new THREE.BoxGeometry(width, bodyH, depth),
    new THREE.MeshStandardMaterial({ color })
  );
  body.position.y = bodyH / 2;
  body.userData.part = part;
  const cap = new THREE.Mesh(
    new THREE.SphereGeometry(0.5, 24, 12, 0, Math.PI * 2, 0, Math.PI / 2),
    new THREE.MeshStandardMaterial({ color, side: THREE.DoubleSide })
  );
  cap.scale.set(width, width, depth);
  cap.position.y = bodyH;
  cap.userData.part = part;
  g.add(body, cap);
  return g;
}

/* A single cylinder with reduced radial segments and flat shading instead of
   the usual smooth 20-24 segment cylinder. The visible facets read as
   fluted/reeded ribbing (pedestals, vases, bowls in the reference sheet)
   without hand-building individual grooves. This is cheap, and the faceting
   survives applyItemMaterial's material.clone() since flatShading is a
   material property. */
export function buildFlutedCylinder(radiusTop, radiusBottom, height, color, part, segments = 16) {
  const mesh = new THREE.Mesh(
    new THREE.CylinderGeometry(radiusTop, radiusBottom, height, segments, 1),
    new THREE.MeshStandardMaterial({ color, flatShading: true })
  );
  mesh.userData.part = part;
  return mesh;
}

/* A flat panel built from a row of thin vertical dowels rather than a solid
   slab. Reads as reeded/fluted wood paneling (the ribbed arches and wall
   panel in the reference sheet). Returns a Group centered on X, base at
   y=0, bulging toward +z (the object's front). */
export function buildFlutedPanel(width, height, color, part, ribCount = 12) {
  const g = new THREE.Group();
  const ribR = (width / ribCount) / 2;
  for (let i = 0; i < ribCount; i++) {
    const rib = new THREE.Mesh(
      new THREE.CylinderGeometry(ribR, ribR, height, 10),
      new THREE.MeshStandardMaterial({ color })
    );
    rib.position.set(-width / 2 + ribR + i * (ribR * 2), height / 2, 0);
    rib.userData.part = part;
    g.add(rib);
  }
  return g;
}
