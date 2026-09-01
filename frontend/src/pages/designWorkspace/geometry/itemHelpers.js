/* Shared item helpers: material/color application, per-part transforms,
   lighting/camera presets, first-person pose math, capacity guidance.
   Extracted from Designworkspace.jsx. */

import * as THREE from "three";
import { MATERIAL_PRESETS, DEFAULT_MATERIAL } from "../catalog";

/* Re-materials (and optionally recolors) every mesh in a built object.
   Meshes tagged keepEmissive (glowing screens/bulbs) are left alone so
   customizing a whole object's material doesn't kill its light source. */
export function applyItemMaterial(obj, item) {
  const defaultPreset = MATERIAL_PRESETS[item.material] || MATERIAL_PRESETS[DEFAULT_MATERIAL];
  obj.traverse(c => {
    // keepEmissive = glowing bulbs/screens. keepOwnMaterial = bespoke trim
    // (e.g. a booth's gold accents) that should stay metallic regardless of
    // the item's overall material choice. Same reasoning either way.
    if (!c.isMesh || c.userData?.keepEmissive || c.userData?.keepOwnMaterial) return;
    // A per-part material (Advanced Edit Phase 3) wins over the item's
    // single overall material, same precedence as per-part color below.
    const partMaterialKey = c.userData?.part && item.partMaterials?.[c.userData.part];
    const preset = (partMaterialKey && MATERIAL_PRESETS[partMaterialKey]) || defaultPreset;
    const mat = c.material.clone();
    mat.roughness = preset.roughness;
    mat.metalness = preset.metalness;
    mat.transparent = !!preset.transparent;
    mat.opacity = preset.transparent ? preset.opacity : 1;
    // A per-part color (event stations with named sub-meshes, see
    // PART_LABELS) wins over the item's single overall color.
    const partColor = c.userData?.part && item.partColors?.[c.userData.part];
    const resolvedColor = partColor || item.color;
    if (resolvedColor) {
      mat.color = new THREE.Color(resolvedColor);
      // A user-picked color is a deliberate choice. Give it a self-lit
      // floor so scene shading/shadows can't grey it out. Without this, a
      // "pure white" pick still renders as flat mid-grey wherever the
      // directional light doesn't hit it dead-on, since MeshStandardMaterial
      // is fully at the mercy of scene lighting otherwise.
      mat.emissive = new THREE.Color(resolvedColor);
      mat.emissiveIntensity = 0.4;
    }
    c.material = mat;
  });
}

/* Advanced Edit Phase 3. Applies a per-part position/rotation/scale offset
   on top of whatever build3DObject already built. Every mesh sharing a
   part tag gets re-parented into a fresh pivot Group (added at identity, so
   nothing visually moves yet). The stored offset is then applied to that
   pivot as a whole. That way a component's move/rotate/resize is relative
   to where it was already built rather than needing every part's own
   hand-authored origin hardcoded here.

   A part tag can be reused across more than one physical instance of the
   same component. Both arches of a dual-arch backdrop are tagged "panel",
   and all three window arches on the storefront are tagged "window", each
   living under its own separate wrapper group. Meshes are therefore grouped
   by (part, immediate parent) rather than by part alone, and each distinct
   instance gets its own pivot carrying the same offset, so "nudge the
   panel" moves every instance together instead of merging them into one. */
export function applyPartTransforms(obj, item) {
  if (!item.partTransforms) return;
  const groups = new Map(); // part -> Map(parent -> meshes[])
  obj.traverse(c => {
    if (!c.isMesh || !c.userData?.part) return;
    const part = c.userData.part;
    if (!groups.has(part)) groups.set(part, new Map());
    const byParent = groups.get(part);
    if (!byParent.has(c.parent)) byParent.set(c.parent, []);
    byParent.get(c.parent).push(c);
  });
  Object.entries(item.partTransforms).forEach(([part, t]) => {
    const byParent = groups.get(part);
    if (!byParent || !t) return;
    byParent.forEach((meshes, parent) => {
      const pivot = new THREE.Group();
      parent.add(pivot);
      meshes.forEach(m => pivot.add(m)); // Re-parenting onto an identity pivot preserves each mesh's existing local transform
      pivot.position.set(t.position?.x || 0, t.position?.y || 0, t.position?.z || 0);
      pivot.rotation.y = t.rotation || 0;
      const s = t.scale || 1;
      pivot.scale.set(s, s, s);
    });
  });
}

/* These were previously too dim for MeshStandardMaterial's physically-based
   shading model. A "white" object under ambient ~1.0-1.4 and a weak
   directional light rendered as flat mid-grey rather than actual white.
   Bumped up across the board so real whites read as white, with the tone
   mapping/exposure set on the renderer below to keep colors from blowing
   out. */
export const lightingPresets = {
  Soft:    { ambient: 1.8,  dir: 1.0,  color: 0xffffff },
  Natural: { ambient: 1.6,  dir: 1.6,  color: 0xffffff },
  Bright:  { ambient: 2.1,  dir: 2.3,  color: 0xffffff },
};

export const viewPresets = {
  "3D View":    { theta: 0.5,  phi: 0.4,  radius: 18 },
  "Top View":   { theta: 0,    phi: 1.55, radius: 22 },
  "Front View": { theta: 0,    phi: 0.06, radius: 14 },
  "Side View":  { theta: 1.57, phi: 0.2,  radius: 14 },
};

/* Event Editing Mode (first-person walkthrough).
   A second, independent camera system alongside the orbit camera above.
   updateCamera() always looks at a ground-level point (px, 0, pz) from a
   spherical offset. There's no way to coax that model into a free-look
   "stand here, face any direction" camera, so first-person gets its own
   state (eye position + yaw/pitch) and its own per-frame driving code in
   the render loop, entirely separate from orbitRef/updateCamera. */
export const EYE_HEIGHT       = 1.65; // Meters, roughly average human eye height
export const FP_WALK_SPEED     = 2.2;  // m/s
export const FP_RUN_SPEED      = 4.6;  // m/s, Shift held
export const FP_MOUSE_SENS     = 0.0022; // Radians per pixel of pointer-lock movementX/Y
export const FP_PITCH_MIN      = -1.2; // ~-68°, stops short of looking straight down
export const FP_PITCH_MAX      = 1.2;  // ~68°, stops short of looking straight up
export const FP_FOV_DEFAULT    = 55;   // Matches the PerspectiveCamera's initial fov
export const FP_FOV_MIN        = 32;
export const FP_FOV_MAX        = 80;
export const FP_ENTER_DURATION = 900;
export const FP_EXIT_DURATION  = 800;

/* Pure pose conversions. Given an orbit state or a first-person state,
   compute the raw {position, quaternion} the camera would have. Used only
   to compute the start/end points of a camera transition (beginPoseTween,
   defined below in the component). Neither function touches any live
   camera or ref, so they're safe to call from anywhere. */
export function orbitPoseFor(o) {
  const pos = new THREE.Vector3(
    o.px + o.radius * Math.sin(o.theta) * Math.cos(o.phi),
    o.radius * Math.sin(o.phi),
    o.pz + o.radius * Math.cos(o.theta) * Math.cos(o.phi)
  );
  const m = new THREE.Matrix4().lookAt(pos, new THREE.Vector3(o.px, 0, o.pz), new THREE.Vector3(0, 1, 0));
  return { pos, quat: new THREE.Quaternion().setFromRotationMatrix(m) };
}
export function fpPoseFor(fp) {
  const pos = new THREE.Vector3(fp.x, EYE_HEIGHT, fp.z);
  const quat = new THREE.Quaternion().setFromEuler(new THREE.Euler(fp.pitch, fp.yaw, 0, "YXZ"));
  return { pos, quat };
}

/* Capacity guidance */
export function getCapacityForArea(area, guests) {
  if (!area || !guests) return null;
  const recommended = Math.floor(area * 0.7 / 2);
  const ratio = guests / recommended;
  if (ratio <= 1)   return { level: "good",    text: `✓ Comfortable for ${guests} guests`, rec: recommended };
  if (ratio <= 1.2) return { level: "warning",  text: `⚠ Near capacity for ${guests} guests`, rec: recommended };
  return               { level: "danger",   text: `✗ Too small for ${guests} guests`, rec: recommended };
}
