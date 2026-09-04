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

/* Adds the booth name to the front of the object.

   No label is shown when there is no text.

   The label position is based on the object type and variant.
*/
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

/* Creates a rounded arch shape used by different backdrops, booths and storefronts.

   The shape starts at floor level and its parts can be colored separately.
*/
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

/* Creates a faceted cylinder used for ribbed objects such as pedestals, vases and bowls.

   The simpler shape gives a fluted look while keeping the model lightweight.
*/
export function buildFlutedCylinder(radiusTop, radiusBottom, height, color, part, segments = 16) {
  const mesh = new THREE.Mesh(
    new THREE.CylinderGeometry(radiusTop, radiusBottom, height, segments, 1),
    new THREE.MeshStandardMaterial({ color, flatShading: true })
  );
  mesh.userData.part = part;
  return mesh;
}

/* Creates a ribbed panel using thin vertical pieces.

   The panel is centered and starts from floor level.
*/
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
