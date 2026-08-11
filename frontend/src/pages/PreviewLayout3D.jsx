import { useEffect, useRef, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import * as THREE from "three";
import "./PreviewLayout3D.css";

function PreviewLayout() {
  const mountRef = useRef(null);
  const navigate = useNavigate();
  const location = useLocation();

  const canvasItems = location.state?.canvasItems || [];
  const layoutName = location.state?.layoutName || "Indoor Hall";

  // Color state — user can customise
  const [wallColor, setWallColor] = useState("#f0ecfa");
  const [floorColor, setFloorColor] = useState("#e8e0f0");
  const [ceilingColor, setCeilingColor] = useState("#faf8ff");

  // Refs to update colors without re-mounting Three.js
  const wallMatRef = useRef(null);
  const floorMatRef = useRef(null);
  const ceilingMatRef = useRef(null);

  // Update wall color live
  useEffect(() => {
    if (wallMatRef.current) wallMatRef.current.color.set(wallColor);
  }, [wallColor]);

  // Update floor color live
  useEffect(() => {
    if (floorMatRef.current) floorMatRef.current.color.set(floorColor);
  }, [floorColor]);

  // Update ceiling color live
  useEffect(() => {
    if (ceilingMatRef.current) ceilingMatRef.current.color.set(ceilingColor);
  }, [ceilingColor]);

  useEffect(() => {
    const mount = mountRef.current;
    const width = mount.clientWidth;
    const height = mount.clientHeight;

    /* ── Scene ── */
    const scene = new THREE.Scene();
    scene.background = new THREE.Color("#f5f0ff");
    scene.fog = new THREE.Fog("#f5f0ff", 25, 60);

    /* ── Camera ── */
    const camera = new THREE.PerspectiveCamera(60, width / height, 0.1, 100);
    camera.position.set(0, 8, 14);
    camera.lookAt(0, 0, 0);

    /* ── Renderer ── */
    const renderer = new THREE.WebGLRenderer({ antialias: true });
    renderer.setSize(width, height);
    renderer.setPixelRatio(window.devicePixelRatio);
    renderer.shadowMap.enabled = true;
    renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    mount.appendChild(renderer.domElement);

    /* ── Lights ── */
    const ambient = new THREE.AmbientLight(0xffffff, 0.7);
    scene.add(ambient);

    const dirLight = new THREE.DirectionalLight(0xffffff, 0.8);
    dirLight.position.set(5, 12, 5);
    dirLight.castShadow = true;
    dirLight.shadow.mapSize.width = 2048;
    dirLight.shadow.mapSize.height = 2048;
    scene.add(dirLight);

    const pointLight1 = new THREE.PointLight(0xa78bfa, 0.3, 30);
    pointLight1.position.set(-6, 8, -4);
    scene.add(pointLight1);

    const pointLight2 = new THREE.PointLight(0xfbbf24, 0.2, 20);
    pointLight2.position.set(6, 6, 4);
    scene.add(pointLight2);

    /* ── Room dimensions ── */
    const W = 16, D = 12, H = 5;

    /* ── Floor ── */
    const floorMat = new THREE.MeshLambertMaterial({ color: floorColor });
    floorMatRef.current = floorMat;
    const floor = new THREE.Mesh(new THREE.PlaneGeometry(W, D, 20, 20), floorMat);
    floor.rotation.x = -Math.PI / 2;
    floor.receiveShadow = true;
    scene.add(floor);

    /* Floor grid */
    const grid = new THREE.GridHelper(W, 16, 0xc4b5fd, 0xddd6fe);
    grid.position.y = 0.01;
    scene.add(grid);

    /* ── Ceiling ── */
    const ceilingMat = new THREE.MeshLambertMaterial({ color: ceilingColor, side: THREE.BackSide });
    ceilingMatRef.current = ceilingMat;
    const ceiling = new THREE.Mesh(new THREE.PlaneGeometry(W, D), ceilingMat);
    ceiling.rotation.x = Math.PI / 2;
    ceiling.position.y = H;
    scene.add(ceiling);

    /* ── Walls ── */
    const wallMat = new THREE.MeshLambertMaterial({ color: wallColor, side: THREE.BackSide });
    wallMatRef.current = wallMat;

    // Back wall
    const backWall = new THREE.Mesh(new THREE.PlaneGeometry(W, H), wallMat);
    backWall.position.set(0, H / 2, -D / 2);
    scene.add(backWall);

    // Left wall
    const leftWall = new THREE.Mesh(new THREE.PlaneGeometry(D, H), wallMat);
    leftWall.position.set(-W / 2, H / 2, 0);
    leftWall.rotation.y = Math.PI / 2;
    scene.add(leftWall);

    // Right wall
    const rightWall = new THREE.Mesh(new THREE.PlaneGeometry(D, H), wallMat);
    rightWall.position.set(W / 2, H / 2, 0);
    rightWall.rotation.y = -Math.PI / 2;
    scene.add(rightWall);

    /* ── Wall trim lines ── */
    const trimMat = new THREE.LineBasicMaterial({ color: 0xc4b5fd });
    const trimPoints = [
      new THREE.Vector3(-W/2, 0, -D/2),
      new THREE.Vector3(W/2, 0, -D/2),
      new THREE.Vector3(W/2, H, -D/2),
      new THREE.Vector3(-W/2, H, -D/2),
      new THREE.Vector3(-W/2, 0, -D/2),
    ];
    scene.add(new THREE.Line(
      new THREE.BufferGeometry().setFromPoints(trimPoints), trimMat
    ));

    /* ── Place furniture ── */
    const scaleX = W / 800;
    const scaleZ = D / 600;

    canvasItems.forEach(item => {
      const x = (item.x - 400) * scaleX;
      const z = (item.y - 300) * scaleZ;
      let mesh;

      switch (item.type) {
        case "round-table": {
          const g = new THREE.Group();
          const top = new THREE.Mesh(
            new THREE.CylinderGeometry(0.6, 0.6, 0.08, 32),
            new THREE.MeshLambertMaterial({ color: 0x7c3aed })
          );
          top.position.y = 0.8;
          top.castShadow = true;
          const leg = new THREE.Mesh(
            new THREE.CylinderGeometry(0.05, 0.05, 0.8, 8),
            new THREE.MeshLambertMaterial({ color: 0xa78bfa })
          );
          leg.position.y = 0.4;
          g.add(top, leg);
          g.position.set(x, 0, z);
          mesh = g; break;
        }
        case "rect-table": {
          const g = new THREE.Group();
          const top = new THREE.Mesh(
            new THREE.BoxGeometry(1.2, 0.08, 0.7),
            new THREE.MeshLambertMaterial({ color: 0x7c3aed })
          );
          top.position.y = 0.8;
          top.castShadow = true;
          [-0.5, 0.5].forEach(sx => [-0.28, 0.28].forEach(sz => {
            const leg = new THREE.Mesh(
              new THREE.CylinderGeometry(0.04, 0.04, 0.8, 8),
              new THREE.MeshLambertMaterial({ color: 0xa78bfa })
            );
            leg.position.set(sx, 0.4, sz);
            g.add(leg);
          }));
          g.add(top);
          g.position.set(x, 0, z);
          mesh = g; break;
        }
        case "chair": {
          const g = new THREE.Group();
          const seat = new THREE.Mesh(
            new THREE.BoxGeometry(0.5, 0.06, 0.5),
            new THREE.MeshLambertMaterial({ color: 0xc4b5fd })
          );
          seat.position.y = 0.5;
          seat.castShadow = true;
          const back = new THREE.Mesh(
            new THREE.BoxGeometry(0.5, 0.5, 0.06),
            new THREE.MeshLambertMaterial({ color: 0xc4b5fd })
          );
          back.position.set(0, 0.78, -0.22);
          back.castShadow = true;
          g.add(seat, back);
          g.position.set(x, 0, z);
          mesh = g; break;
        }
        case "stage": {
          const m = new THREE.Mesh(
            new THREE.BoxGeometry(2, 0.4, 1.5),
            new THREE.MeshLambertMaterial({ color: 0x6d28d9 })
          );
          m.position.set(x, 0.2, z);
          m.castShadow = true;
          mesh = m; break;
        }
        case "plant": {
          const g = new THREE.Group();
          const pot = new THREE.Mesh(
            new THREE.CylinderGeometry(0.15, 0.12, 0.3, 12),
            new THREE.MeshLambertMaterial({ color: 0xd8b4fe })
          );
          pot.position.y = 0.15;
          const plant = new THREE.Mesh(
            new THREE.SphereGeometry(0.3, 12, 12),
            new THREE.MeshLambertMaterial({ color: 0x86efac })
          );
          plant.position.y = 0.6;
          g.add(pot, plant);
          g.position.set(x, 0, z);
          mesh = g; break;
        }
        case "balloon-arch": {
          const g = new THREE.Group();
          const colors = [0x7c3aed, 0xec4899, 0xf59e0b, 0x7c3aed, 0xec4899];
          [-0.8,-0.4,0,0.4,0.8].forEach((bx, i) => {
            const b = new THREE.Mesh(
              new THREE.SphereGeometry(0.25, 12, 12),
              new THREE.MeshLambertMaterial({ color: colors[i] })
            );
            b.position.set(bx, 1.5 - Math.abs(bx) * 0.5, 0);
            g.add(b);
          });
          g.position.set(x, 0, z);
          mesh = g; break;
        }
        case "projector": {
          const g = new THREE.Group();
          const screen = new THREE.Mesh(
            new THREE.BoxGeometry(1.5, 1, 0.05),
            new THREE.MeshLambertMaterial({ color: 0xffffff })
          );
          screen.position.y = 1.5;
          const stand = new THREE.Mesh(
            new THREE.CylinderGeometry(0.03, 0.03, 1.5, 8),
            new THREE.MeshLambertMaterial({ color: 0xa78bfa })
          );
          stand.position.y = 0.75;
          g.add(screen, stand);
          g.position.set(x, 0, z);
          mesh = g; break;
        }
        case "podium": {
          const g = new THREE.Group();
          const body = new THREE.Mesh(
            new THREE.BoxGeometry(0.6, 1.2, 0.5),
            new THREE.MeshLambertMaterial({ color: 0x7c3aed })
          );
          body.position.y = 0.6;
          g.add(body);
          g.position.set(x, 0, z);
          mesh = g; break;
        }
        case "cake-table": {
          const g = new THREE.Group();
          const table = new THREE.Mesh(
            new THREE.CylinderGeometry(0.5, 0.5, 0.08, 32),
            new THREE.MeshLambertMaterial({ color: 0xfde68a })
          );
          table.position.y = 0.8;
          const cake = new THREE.Mesh(
            new THREE.CylinderGeometry(0.25, 0.25, 0.3, 16),
            new THREE.MeshLambertMaterial({ color: 0xfbcfe8 })
          );
          cake.position.y = 1.05;
          g.add(table, cake);
          g.position.set(x, 0, z);
          mesh = g; break;
        }
        default: {
          const m = new THREE.Mesh(
            new THREE.BoxGeometry(0.6, 0.6, 0.6),
            new THREE.MeshLambertMaterial({ color: 0xa78bfa })
          );
          m.position.set(x, 0.3, z);
          mesh = m;
        }
      }

      if (mesh) {
        mesh.rotation.y = (item.rotation * Math.PI) / 180;
        scene.add(mesh);
      }
    });

    /* ── Mouse orbit controls ── */
    let isDragging = false, isPanning = false;
    let prevMouse = { x: 0, y: 0 };
    let theta = 0, phi = Math.PI / 4, radius = 18;
    let panX = 0, panZ = 0;

    const updateCamera = () => {
      camera.position.set(
        panX + radius * Math.sin(theta) * Math.cos(phi),
        radius * Math.sin(phi),
        panZ + radius * Math.cos(theta) * Math.cos(phi)
      );
      camera.lookAt(panX, 0, panZ);
    };
    updateCamera();

    const onMouseDown = (e) => {
      if (e.button === 0) isDragging = true;
      if (e.button === 2) isPanning = true;
      prevMouse = { x: e.clientX, y: e.clientY };
    };
    const onMouseMove = (e) => {
      const dx = e.clientX - prevMouse.x;
      const dy = e.clientY - prevMouse.y;
      prevMouse = { x: e.clientX, y: e.clientY };
      if (isDragging) {
        theta -= dx * 0.01;
        phi = Math.max(0.05, Math.min(Math.PI / 2.1, phi - dy * 0.01));
        updateCamera();
      }
      if (isPanning) {
        panX -= dx * 0.02;
        panZ -= dy * 0.02;
        updateCamera();
      }
    };
    const onMouseUp = () => { isDragging = false; isPanning = false; };
    const onWheel = (e) => {
      radius = Math.max(3, Math.min(30, radius + e.deltaY * 0.02));
      updateCamera();
    };

    mount.addEventListener("mousedown", onMouseDown);
    mount.addEventListener("mousemove", onMouseMove);
    mount.addEventListener("mouseup", onMouseUp);
    mount.addEventListener("wheel", onWheel);
    mount.addEventListener("contextmenu", (e) => e.preventDefault());

    /* ── Animation ── */
    let animId;
    const animate = () => {
      animId = requestAnimationFrame(animate);
      renderer.render(scene, camera);
    };
    animate();

    /* ── Resize ── */
    const onResize = () => {
      const w = mount.clientWidth, h = mount.clientHeight;
      camera.aspect = w / h;
      camera.updateProjectionMatrix();
      renderer.setSize(w, h);
    };
    window.addEventListener("resize", onResize);

    return () => {
      cancelAnimationFrame(animId);
      window.removeEventListener("resize", onResize);
      mount.removeChild(renderer.domElement);
      renderer.dispose();
    };
  }, [canvasItems]);

  return (
    <div className="p3d-page">

      {/* Header */}
      <div className="p3d-header">
        <button className="p3d-back-btn" onClick={() => navigate(-1)}>
          ← Back to Editor
        </button>
        <h2 className="p3d-title">3D Preview — <span>{layoutName}</span></h2>
        <div className="p3d-controls-hint">
          <span>🖱 Left drag: Rotate</span>
          <span>🖱 Right drag: Pan</span>
          <span>🖱 Scroll: Zoom</span>
        </div>
      </div>

      {/* Main area */}
      <div className="p3d-main">

        {/* 3D canvas */}
        <div ref={mountRef} className="p3d-canvas" />

        {/* Color controls panel */}
        <div className="p3d-controls">
          <h3 className="p3d-controls-title">🎨 Customize Room</h3>

          <div className="p3d-color-group">
            <label className="p3d-color-label">Wall Color</label>
            <div className="p3d-color-row">
              {["#f0ecfa","#fef3c7","#d1fae5","#fee2e2","#e0f2fe","#ffffff","#1e1b4b","#4a1942"].map(c => (
                <button
                  key={c}
                  className={`p3d-swatch ${wallColor === c ? "active" : ""}`}
                  style={{ background: c }}
                  onClick={() => setWallColor(c)}
                />
              ))}
              <input type="color" className="p3d-color-picker" value={wallColor} onChange={e => setWallColor(e.target.value)} />
            </div>
          </div>

          <div className="p3d-color-group">
            <label className="p3d-color-label">Floor Color</label>
            <div className="p3d-color-row">
              {["#e8e0f0","#d4c5a9","#c8e6c9","#f5f5f5","#795548","#37474f","#1a1a2e","#fce4ec"].map(c => (
                <button
                  key={c}
                  className={`p3d-swatch ${floorColor === c ? "active" : ""}`}
                  style={{ background: c }}
                  onClick={() => setFloorColor(c)}
                />
              ))}
              <input type="color" className="p3d-color-picker" value={floorColor} onChange={e => setFloorColor(e.target.value)} />
            </div>
          </div>

          <div className="p3d-color-group">
            <label className="p3d-color-label">Ceiling Color</label>
            <div className="p3d-color-row">
              {["#faf8ff","#ffffff","#f0f9ff","#fffbeb","#f0fdf4","#fdf4ff","#e8e0f0","#f5f5f5"].map(c => (
                <button
                  key={c}
                  className={`p3d-swatch ${ceilingColor === c ? "active" : ""}`}
                  style={{ background: c }}
                  onClick={() => setCeilingColor(c)}
                />
              ))}
              <input type="color" className="p3d-color-picker" value={ceilingColor} onChange={e => setCeilingColor(e.target.value)} />
            </div>
          </div>

          {/* Legend */}
          <div className="p3d-legend">
            <p className="p3d-legend-title">Elements</p>
            {[
              { color: "#7c3aed", label: "Tables" },
              { color: "#c4b5fd", label: "Chairs" },
              { color: "#86efac", label: "Plants" },
              { color: "#ec4899", label: "Decorations" },
              { color: "#6d28d9", label: "Stage" },
            ].map(item => (
              <div key={item.label} className="p3d-legend-item">
                <div className="p3d-legend-color" style={{ background: item.color }}/>
                <span>{item.label}</span>
              </div>
            ))}
          </div>

        </div>
      </div>

    </div>
  );
}

export default PreviewLayout;
