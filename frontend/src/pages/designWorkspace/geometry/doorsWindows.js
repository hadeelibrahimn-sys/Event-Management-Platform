/* Doors and windows: a structural, wall-mounted catalog of their own.
   Deliberately NOT part of ELEMENTS/build3DObject. A door or window only
   ever exists embedded in one specific wall edge (see customFloorPlan.js),
   so it's addressed by edgeKey in the `doors`/`windows` state maps rather
   than being a free-draggable placedItems entry. Each style is still built
   from the same primitive boxes/cylinders/toruses as everything else.
   An "opening" is just wall geometry that isn't drawn there, exactly like
   the original single door style already did.
   Extracted from Designworkspace.jsx. */

import * as THREE from "three";
import { MATERIAL_PRESETS } from "../catalog";

export const DOOR_STYLES = {
  "modern-single": { leaves: 1, glass: false, arched: false, sliding: false, paneled: false },
  "double-door":   { leaves: 2, glass: false, arched: false, sliding: false, paneled: false },
  "glass-door":    { leaves: 1, glass: true,  arched: false, sliding: false, paneled: false },
  "wooden-door":   { leaves: 1, glass: false, arched: false, sliding: false, paneled: true  },
  "arched-door":   { leaves: 1, glass: false, arched: true,  sliding: false, paneled: false },
  "sliding-door":  { leaves: 1, glass: false, arched: false, sliding: true,  paneled: false },
};
export const DOOR_STYLE_LABELS = {
  "modern-single": "Modern Single Door",
  "double-door":   "Double Door",
  "glass-door":    "Glass Door",
  "wooden-door":   "Wooden Door",
  "arched-door":   "Arched Door",
  "sliding-door":  "Sliding Door",
};
export const DOOR_STYLE_LIST = Object.keys(DOOR_STYLES);
export const DOOR_COLOR_PRESETS  = ["#8B5E3C", "#5C4033", "#2c2c2c", "#3d5a80", "#588157", "#8b2635"];
export const DOOR_FRAME_PRESETS  = ["#3d2817", "#8a6a4a", "#C9A44C", "#c7c7c7", "#1a1a1a", "#2f4858"];
export const DOOR_HANDLE_STYLES  = ["sphere", "bar", "ring"];
export const DOOR_HANDLE_LABELS  = { sphere: "Knob", bar: "Bar", ring: "Ring" };

export const WINDOW_STYLES = {
  "standard":          { sillFrac: 0.45, headerFrac: 0.88, panes: 1, arched: false },
  "wide":              { sillFrac: 0.32, headerFrac: 0.88, panes: 1, arched: false },
  "floor-to-ceiling":  { sillFrac: 0.04, headerFrac: 0.97, panes: 1, arched: false },
  "arched":            { sillFrac: 0.45, headerFrac: 0.82, panes: 1, arched: true  },
  "double-window":     { sillFrac: 0.45, headerFrac: 0.88, panes: 2, arched: false },
  "modern-glass":      { sillFrac: 0.35, headerFrac: 0.95, panes: 1, arched: false },
};
export const WINDOW_STYLE_LABELS = {
  "standard":         "Standard Window",
  "wide":             "Wide Window",
  "floor-to-ceiling": "Floor-to-Ceiling Window",
  "arched":           "Arched Window",
  "double-window":    "Double Window",
  "modern-glass":     "Modern Glass Window",
};
export const WINDOW_STYLE_LIST = Object.keys(WINDOW_STYLES);
export const WINDOW_FRAME_PRESETS   = ["#3d2817", "#8a6a4a", "#C9A44C", "#c7c7c7", "#1a1a1a", "#2f4858"];
export const WINDOW_FRAME_MATERIALS = ["wood", "metal", "plastic"];
export const GLASS_TINT_LIST = ["clear", "frosted", "blue", "bronze", "green", "smoke"];
export const GLASS_TINT_LABELS = { clear: "Clear", frosted: "Frosted", blue: "Blue", bronze: "Bronze", green: "Green", smoke: "Smoke" };
export const GLASS_TINT_PRESETS = {
  clear:   { color: 0xdcebef, opacity: 0.28, roughness: 0.08 },
  frosted: { color: 0xeef2f0, opacity: 0.62, roughness: 0.6  },
  blue:    { color: 0x5c8aa6, opacity: 0.55, roughness: 0.1  },
  bronze:  { color: 0x8a6a3a, opacity: 0.6,  roughness: 0.15 },
  green:   { color: 0x4a7c6f, opacity: 0.55, roughness: 0.1  },
  smoke:   { color: 0x3a3a3a, opacity: 0.6,  roughness: 0.15 },
};

export function buildDoorHandle(kind, color) {
  const mat = new THREE.MeshStandardMaterial({ color, metalness: 0.6, roughness: 0.3 });
  if (kind === "bar") return new THREE.Mesh(new THREE.BoxGeometry(0.02, 0.22, 0.02), mat);
  if (kind === "ring") {
    const ring = new THREE.Mesh(new THREE.TorusGeometry(0.035, 0.008, 8, 16), mat);
    ring.rotation.y = Math.PI / 2;
    return ring;
  }
  return new THREE.Mesh(new THREE.SphereGeometry(0.025, 8, 8), mat);
}

/* A single leaf, centered on its own local origin so the caller can place
   it at any offset from its hinge/track pivot. Can be a plain slab, a glass
   pane in a thin frame, or a slab with two raised panel insets. */
export function buildDoorLeaf(leafW, leafH, opts) {
  const { color, glass, paneled } = opts;
  const group = new THREE.Group();
  if (glass) {
    const frame = new THREE.Mesh(new THREE.BoxGeometry(leafW, leafH, 0.05), new THREE.MeshStandardMaterial({ color, roughness: 0.5 }));
    const pane = new THREE.Mesh(
      new THREE.BoxGeometry(leafW * 0.78, leafH * 0.82, 0.02),
      new THREE.MeshStandardMaterial({ color: 0xbcd8e0, transparent: true, opacity: 0.4, roughness: 0.1, metalness: 0.1 })
    );
    pane.position.z = 0.025;
    frame.userData.part = "body"; pane.userData.part = "body";
    group.add(frame, pane);
  } else {
    const leaf = new THREE.Mesh(new THREE.BoxGeometry(leafW, leafH, 0.05), new THREE.MeshStandardMaterial({ color, roughness: 0.6 }));
    leaf.userData.part = "body";
    group.add(leaf);
    if (paneled) {
      const panelMat = new THREE.MeshStandardMaterial({ color, roughness: 0.75 });
      [-0.24, 0.22].forEach(fy => {
        const p = new THREE.Mesh(new THREE.BoxGeometry(leafW * 0.62, leafH * 0.32, 0.012), panelMat);
        p.position.set(0, fy * leafH, 0.031);
        p.userData.part = "body";
        group.add(p);
      });
    }
  }
  return group;
}

/* Builds one door, already positioned/rotated by the caller onto its wall
   segment. Uses the same "skip the solid wall box, add a lintel + leaf"
   trick the original single-style door used, with no CSG cutting anywhere. */
export function buildDoorGroup(len, wallHeight, wallThickness, doorData = {}) {
  const style = DOOR_STYLES[doorData.style] || DOOR_STYLES["modern-single"];
  const color = doorData.color || 0x8B5E3C;
  const frameColor = doorData.frameColor || 0x3d2817;
  const handle = doorData.handle || "sphere";
  const openDir = doorData.openDir === -1 ? -1 : 1;
  const tall = !!doorData.tall;
  const group = new THREE.Group();

  const leafH = wallHeight * (tall ? 0.95 : 0.85);
  const lintelY = leafH;

  if (style.arched) {
    const archR = len / 2 + 0.05;
    const arch = new THREE.Mesh(
      new THREE.TorusGeometry(archR, 0.06, 8, 20, Math.PI),
      new THREE.MeshStandardMaterial({ color: frameColor, roughness: 0.55 })
    );
    arch.position.set(0, lintelY, 0);
    arch.userData.part = "body";
    const fan = new THREE.Mesh(
      new THREE.CylinderGeometry(archR * 0.85, archR * 0.85, wallThickness, 20, 1, true, 0, Math.PI),
      new THREE.MeshStandardMaterial({ color: 0xbcd8e0, transparent: true, opacity: 0.4, side: THREE.DoubleSide })
    );
    fan.rotation.x = Math.PI / 2; fan.rotation.z = Math.PI;
    fan.position.set(0, lintelY, 0);
    fan.userData.part = "body";
    group.add(arch, fan);
  } else {
    const lintel = new THREE.Mesh(
      new THREE.BoxGeometry(len + 0.1, 0.12, wallThickness + 0.02),
      new THREE.MeshStandardMaterial({ color: frameColor, roughness: 0.55 })
    );
    lintel.position.set(0, lintelY + 0.06, 0);
    lintel.castShadow = true;
    lintel.userData.part = "body";
    group.add(lintel);
  }

  if (style.sliding) {
    const leafW = len * 0.94;
    const leafGroup = buildDoorLeaf(leafW, leafH, { color, glass: style.glass, paneled: style.paneled });
    const h = buildDoorHandle(handle, frameColor);
    h.position.set(-openDir * (leafW / 2 - 0.06), 0, 0.035);
    leafGroup.add(h);
    leafGroup.position.set(openDir * leafW * 0.42, leafH / 2, wallThickness * 0.55);
    group.add(leafGroup);
    const track = new THREE.Mesh(new THREE.BoxGeometry(len * 1.08, 0.03, 0.06), new THREE.MeshStandardMaterial({ color: frameColor, metalness: 0.4, roughness: 0.4 }));
    track.position.set(0, leafH + 0.03, wallThickness * 0.55);
    track.userData.part = "body";
    group.add(track);
  } else if (style.leaves === 2) {
    const leafW = len * 0.46;
    [-1, 1].forEach(side => {
      const leafGroup = buildDoorLeaf(leafW, leafH, { color, glass: style.glass, paneled: style.paneled });
      const h = buildDoorHandle(handle, frameColor);
      h.position.set(-side * (leafW / 2 - 0.06), 0, 0.035);
      leafGroup.add(h);
      leafGroup.position.x = -side * leafW / 2;
      const pivot = new THREE.Group();
      pivot.position.set(side * len / 2, leafH / 2, 0);
      pivot.rotation.y = side > 0 ? 0.55 : -0.55;
      pivot.add(leafGroup);
      group.add(pivot);
    });
  } else {
    const leafW = len * 0.92;
    const leafGroup = buildDoorLeaf(leafW, leafH, { color, glass: style.glass, paneled: style.paneled });
    const h = buildDoorHandle(handle, frameColor);
    h.position.set(leafW / 2 - 0.06, 0, 0.035);
    leafGroup.add(h);
    leafGroup.position.x = openDir * leafW / 2;
    const pivot = new THREE.Group();
    pivot.position.set(-openDir * len / 2, leafH / 2, 0);
    pivot.rotation.y = openDir * -0.9;
    pivot.add(leafGroup);
    group.add(pivot);
  }

  // Generous invisible hit area so the doorway is easy to click, same as
  // the original single-style door.
  const hit = new THREE.Mesh(
    new THREE.BoxGeometry(len, wallHeight, wallThickness + 0.3),
    new THREE.MeshBasicMaterial({ transparent: true, opacity: 0, depthWrite: false })
  );
  hit.position.set(0, wallHeight / 2, 0);
  group.add(hit);

  return group;
}

/* Builds one window: solid wall below the sill and above the header (both
   plain boxes, same material/color the rest of that wall run would have
   used), a frame, and a tinted glass pane filling the gap. Never a CSG
   cutout; uses the same "just don't draw wall there" approach as the door. */
export function buildWindowGroup(len, wallHeight, wallThickness, wallColor, windowData = {}) {
  const style = WINDOW_STYLES[windowData.style] || WINDOW_STYLES["standard"];
  const frameColor = windowData.frameColor || 0x3d2817;
  const frameMaterialKey = windowData.frameMaterial || "wood";
  const framePreset = MATERIAL_PRESETS[frameMaterialKey] || MATERIAL_PRESETS.wood;
  const tint = GLASS_TINT_PRESETS[windowData.glassTint] || GLASS_TINT_PRESETS.clear;
  const big = !!windowData.big;
  const group = new THREE.Group();

  const sillFrac = big ? Math.max(0.04, style.sillFrac - 0.15) : style.sillFrac;
  const headerFrac = big ? Math.min(0.98, style.headerFrac + 0.06) : style.headerFrac;
  const sillY = wallHeight * sillFrac;
  const headerY = wallHeight * headerFrac;
  const openingH = Math.max(headerY - sillY, 0.2);

  const wallMat = new THREE.MeshStandardMaterial({ color: wallColor || "#ffffff" });
  if (sillY > 0.02) {
    const below = new THREE.Mesh(new THREE.BoxGeometry(len, sillY, wallThickness), wallMat);
    below.position.set(0, sillY / 2, 0);
    below.castShadow = true; below.receiveShadow = true;
    below.userData.part = "body";
    group.add(below);
  }
  if (wallHeight - headerY > 0.02) {
    const above = new THREE.Mesh(new THREE.BoxGeometry(len, wallHeight - headerY, wallThickness), wallMat.clone());
    above.position.set(0, headerY + (wallHeight - headerY) / 2, 0);
    above.castShadow = true; above.receiveShadow = true;
    above.userData.part = "body";
    group.add(above);
  }

  const frameMat = new THREE.MeshStandardMaterial({ color: frameColor, roughness: framePreset.roughness, metalness: framePreset.metalness });
  const frameW = 0.05;
  [-1, 1].forEach(side => {
    const jamb = new THREE.Mesh(new THREE.BoxGeometry(frameW, openingH, wallThickness + 0.01), frameMat);
    jamb.position.set(side * (len / 2 - frameW / 2), sillY + openingH / 2, 0);
    jamb.userData.part = "body";
    group.add(jamb);
  });
  const sillBar = new THREE.Mesh(new THREE.BoxGeometry(len + 0.06, frameW, wallThickness + 0.04), frameMat);
  sillBar.position.set(0, sillY, 0);
  sillBar.userData.part = "body";
  group.add(sillBar);

  if (style.arched) {
    const straightH = openingH * 0.72;
    const archR = len / 2 - frameW;
    const headBar = new THREE.Mesh(new THREE.BoxGeometry(len - frameW * 2, frameW, wallThickness + 0.01), frameMat);
    headBar.position.set(0, sillY + straightH, 0);
    headBar.userData.part = "body";
    const arch = new THREE.Mesh(new THREE.TorusGeometry(archR, frameW / 2, 8, 20, Math.PI), frameMat);
    arch.position.set(0, sillY + straightH, 0);
    arch.userData.part = "body";
    const paneLower = new THREE.Mesh(
      new THREE.BoxGeometry(len - frameW * 2.4, straightH - frameW, 0.02),
      new THREE.MeshStandardMaterial({ color: tint.color, transparent: true, opacity: tint.opacity, roughness: tint.roughness })
    );
    paneLower.position.set(0, sillY + straightH / 2 + frameW / 2, 0);
    paneLower.userData.part = "glass";
    const paneArch = new THREE.Mesh(
      new THREE.CylinderGeometry(archR * 0.9, archR * 0.9, wallThickness * 0.7, 20, 1, true, 0, Math.PI),
      new THREE.MeshStandardMaterial({ color: tint.color, transparent: true, opacity: tint.opacity, roughness: tint.roughness, side: THREE.DoubleSide })
    );
    paneArch.rotation.x = Math.PI / 2; paneArch.rotation.z = Math.PI;
    paneArch.position.set(0, sillY + straightH, 0);
    paneArch.userData.part = "glass";
    group.add(headBar, arch, paneLower, paneArch);
  } else if (style.panes === 2) {
    const mullion = new THREE.Mesh(new THREE.BoxGeometry(frameW * 0.8, openingH, wallThickness + 0.01), frameMat);
    mullion.position.set(0, sillY + openingH / 2, 0);
    mullion.userData.part = "body";
    const paneW = (len - frameW * 3) / 2;
    [-1, 1].forEach(side => {
      const pane = new THREE.Mesh(
        new THREE.BoxGeometry(paneW, openingH - frameW, 0.02),
        new THREE.MeshStandardMaterial({ color: tint.color, transparent: true, opacity: tint.opacity, roughness: tint.roughness })
      );
      pane.position.set(side * (paneW / 2 + frameW * 0.6), sillY + openingH / 2, 0);
      pane.userData.part = "glass";
      group.add(pane);
    });
    const headBar = new THREE.Mesh(new THREE.BoxGeometry(len - frameW * 2, frameW, wallThickness + 0.01), frameMat);
    headBar.position.set(0, sillY + openingH, 0);
    headBar.userData.part = "body";
    group.add(mullion, headBar);
  } else {
    const headBar = new THREE.Mesh(new THREE.BoxGeometry(len - frameW * 2, frameW, wallThickness + 0.01), frameMat);
    headBar.position.set(0, sillY + openingH, 0);
    headBar.userData.part = "body";
    const pane = new THREE.Mesh(
      new THREE.BoxGeometry(len - frameW * 2.4, openingH - frameW * 2, 0.02),
      new THREE.MeshStandardMaterial({ color: tint.color, transparent: true, opacity: tint.opacity, roughness: tint.roughness })
    );
    pane.position.set(0, sillY + openingH / 2, 0);
    pane.userData.part = "glass";
    group.add(headBar, pane);
  }

  const hit = new THREE.Mesh(
    new THREE.BoxGeometry(len, wallHeight, wallThickness + 0.3),
    new THREE.MeshBasicMaterial({ transparent: true, opacity: 0, depthWrite: false })
  );
  hit.position.set(0, wallHeight / 2, 0);
  group.add(hit);

  return group;
}
