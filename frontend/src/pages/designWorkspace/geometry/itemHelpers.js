/* Shared helpers for item materials, colors, transforms, lighting, camera controls and capacity guidance. */

import * as THREE from "three";
import { MATERIAL_PRESETS, DEFAULT_MATERIAL } from "../catalog";
/* Applies material and color changes to all parts of an object.

   Glowing parts keep their original material so their light effect is not removed.
*/
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
// Keeps a user selected color clear and visible even in darker lighting.

// This prevents bright colors such as white from appearing grey.
      mat.emissive = new THREE.Color(resolvedColor);
      mat.emissiveIntensity = 0.4;
    }
    c.material = mat;
  });
}

/* Applies position, rotation and size changes to individual object parts.

   Each part keeps its original placement and receives the new changes from that position.

   Repeated parts are handled separately while sharing the same edit settings.
*/
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

/* Uses stronger lighting so white materials appear brighter and more natural.

   Renderer settings help keep other colors balanced.
*/

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

/* Handles the first person camera used in Event Editing Mode.

   It uses separate position and viewing controls from the normal orbit camera.
*/
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

 /* Calculates camera position and rotation for orbit and first person views.

   These values are used when moving smoothly between camera modes.
*/
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
