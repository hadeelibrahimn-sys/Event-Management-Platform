/* Handles the custom floor layout and wall object placement. */

import * as THREE from "three";
import * as CFP from "../../customFloorPlan";
import { disposeObject3D } from "./room";
import { generateFloorTexture } from "./textures";
import { buildDoorGroup, buildWindowGroup } from "./doorsWindows";

/* Handles wall mounted items such as artwork and paintings.

   These items can still be moved, colored and deleted normally.

   They stay attached to the nearest wall at a fixed height and face into the room.
*/
export const WALL_MOUNT_TYPES = new Set(["wall-art"]);
export const WALL_ART_HANG_Y = 1.0;   // Meters, bottom edge of the frame. Combined with each style's ~0.9-0.95m height, this centers most pieces close to real-gallery eye level.
export const WALL_MOUNT_GAP = 0.04;   // Clearance off the wall surface so the frame never z-fights/clips into it

export function nearestPointOnSegment(x, z, x1, z1, x2, z2) {
  const dx = x2 - x1, dz = z2 - z1;
  const lenSq = dx * dx + dz * dz;
  let t = lenSq > 0 ? ((x - x1) * dx + (z - z1) * dz) / lenSq : 0;
  t = Math.max(0, Math.min(1, t));
  return { x: x1 + t * dx, z: z1 + t * dz };
}

/* Finds the nearest wall position for a wall mounted item.

   The item is rotated to face into the room.

   Door and window sections are avoided when another wall section is available.
*/
export function computeWallSnap(x, z, opts) {
  const { isCustom, floorTiles, doors, windows, RW, RD, wallThickness = 0.15 } = opts;
  let best = null, bestD = Infinity;
  const consider = (x1, z1, x2, z2) => {
    const p = nearestPointOnSegment(x, z, x1, z1, x2, z2);
    const d = Math.hypot(x - p.x, z - p.z);
    if (d < bestD) { bestD = d; best = p; }
  };

  if (isCustom) {
    const rawEdges = CFP.computeBoundaryEdges(new Set(floorTiles));
    const doorEdgeKeys = new Set(Object.keys(doors || {}).filter(k => doors[k]));
    const windowEdgeKeys = new Set(Object.keys(windows || {}).filter(k => windows[k]));
    const segments = CFP.mergeEdgesIntoSegments(rawEdges, doorEdgeKeys, windowEdgeKeys);
    const plain = segments.filter(s => !s.isDoor && !s.isWindow);
    (plain.length ? plain : segments).forEach(s => consider(s.x1, s.z1, s.x2, s.z2));
  } else {
    consider(-RW / 2, -RD / 2,  RW / 2, -RD / 2); // back
    consider(-RW / 2, -RD / 2, -RW / 2,  RD / 2); // left
    consider( RW / 2, -RD / 2,  RW / 2,  RD / 2); // right
    consider(-RW / 2,  RD / 2,  RW / 2,  RD / 2); // front
  }
  if (!best) return null;

  let nx = x - best.x, nz = z - best.z;
  const len = Math.hypot(nx, nz);
  if (len < 0.001) { nx = 0; nz = 1; } else { nx /= len; nz /= len; }
  const inset = wallThickness / 2 + WALL_MOUNT_GAP;
  return { x: best.x + nx * inset, z: best.z + nz * inset, rotation: Math.atan2(nx, nz) };
}

/* Custom layout: tile-based floor plan geometry, built directly in 3D. */
export function clearGroup(group) {
  while (group.children.length) {
    const obj = group.children.pop();
    group.remove(obj);
    disposeObject3D(obj);
  }
}

export function buildFloorPlanGeometry(group, tileSet, wallStyles, doors, windows, wallHeight, floorColor, selectedSegmentId, floorTexture, selectedTileKey) {
  const wallThickness = 0.15;
  const doorEdgeKeys = new Set(Object.keys(doors).filter(k => doors[k]));
  const windowEdgeKeys = new Set(Object.keys(windows || {}).filter(k => windows[k]));

// Reuses the same texture across all floor tiles.

// Each tile shows the full pattern separately.
  const floorTex = floorTexture ? generateFloorTexture(floorTexture) : null;

  // Occupied floor tiles
  tileSet.forEach(key => {
    const { i, j } = CFP.parseTileKey(key);
    const { x, z } = CFP.tileWorldCenter(i, j);

    const geo = new THREE.PlaneGeometry(CFP.TILE_SIZE, CFP.TILE_SIZE);
    const mat = new THREE.MeshStandardMaterial({ color: floorTex ? 0xffffff : (floorColor || "#f0ece8") });
    if (floorTex) mat.map = floorTex;
    // Same red-flag tint language as the wall/door "danger" popover button.
    // This makes the one tile about to be deleted unambiguous before confirming.
    if (key === selectedTileKey) { mat.emissive = new THREE.Color(0xdc2626); mat.emissiveIntensity = 0.25; }
    const mesh = new THREE.Mesh(geo, mat);
    mesh.rotation.x = -Math.PI / 2;
    mesh.position.set(x, 0, z);
    mesh.receiveShadow = true;
    mesh.userData = { kind: "floor", key };
    group.add(mesh);

    const seam = new THREE.LineSegments(
      new THREE.EdgesGeometry(geo),
      new THREE.LineBasicMaterial({ color: 0xe0dcf0, transparent: true, opacity: 0.5 })
    );
    seam.raycast = () => {}; // Never intercepts clicks meant for the tile/wall below
    seam.rotation.x = -Math.PI / 2;
    seam.position.set(x, 0.005, z);
    group.add(seam);
  });

  // Ghost tiles: click to expand the floor
  CFP.frontierTiles(tileSet).forEach(key => {
    const { i, j } = CFP.parseTileKey(key);
    const { x, z } = CFP.tileWorldCenter(i, j);

    const geo = new THREE.PlaneGeometry(CFP.TILE_SIZE * 0.9, CFP.TILE_SIZE * 0.9);
    const mesh = new THREE.Mesh(geo, new THREE.MeshBasicMaterial({
      color: 0x9b7ff0, transparent: true, opacity: 0.22, side: THREE.DoubleSide
    }));
    mesh.rotation.x = -Math.PI / 2;
    mesh.position.set(x, 0.02, z);
    mesh.userData = { kind: "ghost", key };
    group.add(mesh);

    const outline = new THREE.LineSegments(
      new THREE.EdgesGeometry(geo),
      new THREE.LineBasicMaterial({ color: 0x7c3aed, transparent: true, opacity: 0.7 })
    );
    outline.raycast = () => {};
    outline.rotation.x = -Math.PI / 2;
    outline.position.set(x, 0.025, z);
    group.add(outline);
  });

  // Walls: auto-derived from the tile boundary, merged, split at doors/windows
  const rawEdges = CFP.computeBoundaryEdges(tileSet);
  const segments = CFP.mergeEdgesIntoSegments(rawEdges, doorEdgeKeys, windowEdgeKeys);

  segments.forEach(seg => {
    const dx = seg.x2 - seg.x1, dz = seg.z2 - seg.z1;
    const len = Math.hypot(dx, dz);
    if (len < 0.01) return;
    const rotY = -Math.atan2(dz, dx);
    const midX = (seg.x1 + seg.x2) / 2, midZ = (seg.z1 + seg.z2) / 2;
    const isSelected = seg.id === selectedSegmentId;
    const tint = (mat) => {
      if (isSelected) { mat.emissive = new THREE.Color(0x7c3aed); mat.emissiveIntensity = 0.35; }
      return mat;
    };

    if (seg.isDoor) {
      const doorGroup = buildDoorGroup(len, wallHeight, wallThickness, doors[seg.edgeKeys[0]]);
      doorGroup.position.set(midX, 0, midZ);
      doorGroup.rotation.y = rotY;
      doorGroup.userData = { kind: "wall", segment: seg };
      doorGroup.traverse(c => { if (c.isMesh && c.material && c.userData.part === "body") tint(c.material); });
      group.add(doorGroup);
    } else if (seg.isWindow) {
      const wallColor = wallStyles[seg.edgeKeys[0]] || "#ffffff";
      const windowGroup = buildWindowGroup(len, wallHeight, wallThickness, wallColor, windows[seg.edgeKeys[0]]);
      windowGroup.position.set(midX, 0, midZ);
      windowGroup.rotation.y = rotY;
      windowGroup.userData = { kind: "wall", segment: seg };
      windowGroup.traverse(c => { if (c.isMesh && c.material && c.userData.part === "body") tint(c.material); });
      group.add(windowGroup);
    } else {
      const geo = new THREE.BoxGeometry(len, wallHeight, wallThickness);
      const mesh = new THREE.Mesh(geo, tint(new THREE.MeshStandardMaterial({
        color: wallStyles[seg.edgeKeys[0]] || "#ffffff"
      })));
      mesh.position.set(midX, wallHeight / 2, midZ);
      mesh.rotation.y = rotY;
      mesh.castShadow = true;
      mesh.receiveShadow = true;
      mesh.userData = { kind: "wall", segment: seg };
      group.add(mesh);
    }
  });
}
