/* Room geometry builders (walls, floor, disposal).
   Extracted from Designworkspace.jsx. */

import * as THREE from "three";

export function buildRoom(layoutId, RW, RD, RH, wallColor, floorColor, wallMatsRef, floorMatRef, scene, isGarden) {

  // Floor: skip for lshaped (custom floors below) and custom (tile-based floor built separately)
  if (layoutId !== "lshaped" && layoutId !== "custom") {
    const floorMat = new THREE.MeshStandardMaterial({
      color: isGarden ? 0x4a7c3f : 0xf0ece8
    });
    floorMatRef.current = floorMat;
    const floor = new THREE.Mesh(new THREE.PlaneGeometry(RW, RD), floorMat);
    floor.rotation.x = -Math.PI / 2;
    floor.receiveShadow = true;
    scene.add(floor);
  }

  // Grid (not for garden or custom; custom's tile floor has its own visual grid)
  if (!isGarden && layoutId !== "custom") {
    const grid = new THREE.GridHelper(Math.max(RW,RD), 20, 0xffffff, 0xffffff);
    grid.position.y = 0.001;
    grid.material.opacity = 0.1;
    grid.material.transparent = true;
    grid.material.depthWrite = false;
    scene.add(grid);
  }

  if (isGarden) {
    // Grass texture dots
    for (let i = 0; i < 40; i++) {
      const blade = new THREE.Mesh(
        new THREE.CylinderGeometry(0.03, 0.03, 0.15, 4),
        new THREE.MeshStandardMaterial({ color: 0x3d6e35 })
      );
      blade.position.set(
        (Math.random() - 0.5) * RW * 0.9,
        0.075,
        (Math.random() - 0.5) * RD * 0.9
      );
      scene.add(blade);
    }
    return; // No walls for garden
  }

  const addWall = (w, h, x, y, z, ry) => {
    const mat = new THREE.MeshStandardMaterial({ color: 0xffffff, side: THREE.DoubleSide });
    wallMatsRef.current.push(mat);
    const mesh = new THREE.Mesh(new THREE.PlaneGeometry(w, h), mat);
    mesh.position.set(x, y, z);
    mesh.rotation.y = ry;
    mesh.receiveShadow = true;
    scene.add(mesh);
  };

  if (layoutId === "indoor") {
    // Back + left + right
    addWall(RW, RH, 0,       RH/2, -RD/2,  0          );
    addWall(RD, RH, -RW/2,   RH/2,  0,      Math.PI/2  );
    addWall(RD, RH,  RW/2,   RH/2,  0,     -Math.PI/2  );
  }

  else if (layoutId === "enclosed") {
    // All 4 walls. Front wall stored separately for toggle
    addWall(RW, RH, 0,       RH/2, -RD/2,  0          ); // Back
    addWall(RD, RH, -RW/2,   RH/2,  0,      Math.PI/2  ); // Left
    addWall(RD, RH,  RW/2,   RH/2,  0,     -Math.PI/2  ); // Right
    // Front wall starts hidden, toggle shows it
    const frontMat = new THREE.MeshStandardMaterial({
      color: wallColor, side: THREE.FrontSide, transparent: true, opacity: 0
    });
    wallMatsRef.current.push(frontMat);
    const frontWall = new THREE.Mesh(new THREE.PlaneGeometry(RW, RH), frontMat);
    frontWall.position.set(0, RH/2, RD/2);
    frontWall.rotation.y = Math.PI;
    frontWall.userData.isFrontWall = true;
    scene.add(frontWall);
  }

  else if (layoutId === "lshaped") {
    const t = 0.2;
    const W1 = RW;
    const D1 = RD * 0.6;
    const W2 = RW * 0.5;
    const D2 = RD * 0.4;

    // Single shared floor material, tracked by ref so color updates work
    const fMat = new THREE.MeshStandardMaterial({ color: 0xf0ece8 });
    floorMatRef.current = fMat;

    // Floor top section
    const f1 = new THREE.Mesh(new THREE.PlaneGeometry(W1, D1), fMat);
    f1.rotation.x = -Math.PI/2;
    f1.position.set(0, 0, -D2/2);
    f1.receiveShadow = true;
    scene.add(f1);

    // Floor bottom section, same material reference
    const f2 = new THREE.Mesh(new THREE.PlaneGeometry(W2, D2), fMat);
    f2.rotation.x = -Math.PI/2;
    f2.position.set(-W1/2 + W2/2, 0, D1/2);
    f2.receiveShadow = true;
    scene.add(f2);

    const mkWall = (w, h, d, x, y, z) => {
      const m = new THREE.MeshStandardMaterial({ color: 0xffffff, side: THREE.DoubleSide });
      wallMatsRef.current.push(m);
      const mesh = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), m);
      mesh.position.set(x, y, z);
      mesh.castShadow = true;
      scene.add(mesh);
    };

    // Back wall, full width
    mkWall(W1, RH, t, 0, RH/2, -(D1+D2)/2);
    // Left wall, full depth
    mkWall(t, RH, D1+D2, -W1/2, RH/2, 0);
    // Right wall, top section only
    mkWall(t, RH, D1, W1/2, RH/2, -D2/2);
  }

  else if (layoutId === "custom") {
    // Blank: just floor, no walls
  }
}


/* Removes unused 3D resources when objects are rebuilt or removed.

   This helps prevent memory problems during repeated editing.
*/
export function disposeObject3D(obj) {
  obj.traverse?.(c => {
    if (!c.isMesh) return;
    c.geometry?.dispose?.();
    const mats = Array.isArray(c.material) ? c.material : [c.material];
    mats.forEach(mat => {
      if (!mat) return;
      mat.map?.dispose?.();
      mat.dispose?.();
    });
  });
}
