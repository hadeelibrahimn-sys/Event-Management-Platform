import { useState, useRef, useEffect } from "react";
import "./WallEditor2D.css";

/* World coordinates are centered on the room, matching the 3D workspace:
   x ∈ [-width/2, width/2],  z ∈ [-length/2, length/2] (z = depth). */

const GRID = 0.5;          // snap size in meters
const MIN_WALL_LEN = 0.4;  // ignore accidental micro-drags
const MIN_ZONE_SIZE = 0.4;
const DOOR_WIDTH = 0.9;
const HIT_TOLERANCE = 0.3;

const PALETTE = [
  "#ffffff", "#f5f0ff", "#e5e0f5", "#c4b5fd",
  "#3f6b7a", "#5c8ba0", "#c1633f", "#d98255",
  "#2c3e50", "#7c3aed", "#95a5a6", "#4a7c3f",
];

const genId = () => `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;

const snap = (v) => Math.round(v / GRID) * GRID;
const dist = (x1, z1, x2, z2) => Math.hypot(x2 - x1, z2 - z1);

/* Distance from point p to segment (a-b), plus the clamped projection t (0..1) */
function pointToSegment(px, pz, x1, z1, x2, z2) {
  const dx = x2 - x1, dz = z2 - z1;
  const lenSq = dx * dx + dz * dz;
  let t = lenSq === 0 ? 0 : ((px - x1) * dx + (pz - z1) * dz) / lenSq;
  t = Math.max(0, Math.min(1, t));
  const cx = x1 + t * dx, cz = z1 + t * dz;
  return { d: dist(px, pz, cx, cz), t };
}

export default function WallEditor2D({ width, length, initialWalls, initialFloorZones, initialDoors, onApply, onClose }) {
  const svgRef = useRef(null);

  const [walls, setWalls]           = useState(() => initialWalls || []);
  const [floorZones, setFloorZones] = useState(() => initialFloorZones || []);
  const [doors, setDoors]           = useState(() => initialDoors || []);

  const [tool, setTool]             = useState("wall"); // wall | floorzone | door | select
  const [activeColor, setActiveColor] = useState("#ffffff");
  const [preview, setPreview]       = useState(null); // {kind:'wall'|'zone', ...}
  const [selection, setSelection]   = useState(null); // {kind, id}
  const [showIntro, setShowIntro]   = useState(() => {
    try { return !localStorage.getItem("eventify_wall_editor_intro_seen"); } catch (e) { return true; }
  });
  const historyRef = useRef([]); // [{kind:'wall'|'zone'|'door', id}]

  const dismissIntro = () => {
    setShowIntro(false);
    try { localStorage.setItem("eventify_wall_editor_intro_seen", "1"); } catch (e) {}
  };

  const TOOL_HINTS = {
    wall:      "Click and drag to draw a wall — it snaps straight, horizontal or vertical, as you drag.",
    floorzone: "Click and drag to paint a colored floor area — use this to mark out separate rooms.",
    door:      "Click on a wall to snap a door onto it (one per wall segment).",
    select:    "Click a wall, door, or floor zone to select it — recolor with the swatches above or press Delete.",
  };

  const dragRef = useRef(null);

  const W = width, D = length;
  const clampX = (x) => Math.max(-W / 2, Math.min(W / 2, x));
  const clampZ = (z) => Math.max(-D / 2, Math.min(D / 2, z));

  const svgPoint = (e) => {
    const svg = svgRef.current;
    if (!svg) return { x: 0, z: 0 };
    const pt = svg.createSVGPoint();
    pt.x = e.clientX; pt.y = e.clientY;
    const p = pt.matrixTransform(svg.getScreenCTM().inverse());
    return { x: p.x, z: p.y };
  };

  /* ── Selection helpers ── */
  const findNearestWall = (x, z) => {
    let best = null;
    walls.forEach(w => {
      const { d } = pointToSegment(x, z, w.x1, w.z1, w.x2, w.z2);
      if (d < HIT_TOLERANCE && (!best || d < best.d)) best = { d, wall: w };
    });
    return best?.wall || null;
  };

  const findZoneAt = (x, z) => {
    return floorZones.find(fz =>
      x >= fz.x - fz.w / 2 && x <= fz.x + fz.w / 2 &&
      z >= fz.z - fz.d / 2 && z <= fz.z + fz.d / 2
    ) || null;
  };

  const doorWorldPos = (door) => {
    const w = walls.find(w => w.id === door.wallId);
    if (!w) return null;
    const dx = w.x2 - w.x1, dz = w.z2 - w.z1;
    const len = Math.hypot(dx, dz) || 1;
    const ux = dx / len, uz = dz / len;
    const distAlong = door.t * len;
    return { x: w.x1 + ux * distAlong, z: w.z1 + uz * distAlong };
  };

  const findNearestDoor = (x, z) => {
    let best = null;
    doors.forEach(d => {
      const p = doorWorldPos(d);
      if (!p) return;
      const dd = dist(x, z, p.x, p.z);
      if (dd < HIT_TOLERANCE && (!best || dd < best.d)) best = { d: dd, door: d };
    });
    return best?.door || null;
  };

  /* ── Tool interactions ── */
  const handleDown = (e) => {
    e.preventDefault();
    const p = svgPoint(e);
    const x = clampX(p.x), z = clampZ(p.z);

    if (tool === "wall") {
      dragRef.current = { kind: "wall", x1: snap(x), z1: snap(z) };
      setPreview({ kind: "wall", x1: snap(x), z1: snap(z), x2: snap(x), z2: snap(z) });
      attachDocListeners();
    } else if (tool === "floorzone") {
      dragRef.current = { kind: "zone", x1: snap(x), z1: snap(z) };
      setPreview({ kind: "zone", x1: snap(x), z1: snap(z), x2: snap(x), z2: snap(z) });
      attachDocListeners();
    } else if (tool === "door") {
      const wall = findNearestWall(x, z);
      if (!wall) return;
      const { t } = pointToSegment(x, z, wall.x1, wall.z1, wall.x2, wall.z2);
      const wallLen = dist(wall.x1, wall.z1, wall.x2, wall.z2);
      if (wallLen < DOOR_WIDTH + 0.2) return; // wall too short for a door
      const clampedT = Math.max(DOOR_WIDTH / (2 * wallLen), Math.min(1 - DOOR_WIDTH / (2 * wallLen), t));
      const newDoor = { id: genId(), wallId: wall.id, t: clampedT, width: DOOR_WIDTH };
      setDoors(prev => [...prev.filter(d => d.wallId !== wall.id), newDoor]);
      historyRef.current.push({ kind: "door", id: newDoor.id });
    } else if (tool === "select") {
      const doorHit = findNearestDoor(x, z);
      if (doorHit) { setSelection({ kind: "door", id: doorHit.id }); return; }
      const wallHit = findNearestWall(x, z);
      if (wallHit) { setSelection({ kind: "wall", id: wallHit.id }); return; }
      const zoneHit = findZoneAt(x, z);
      if (zoneHit) { setSelection({ kind: "zone", id: zoneHit.id }); return; }
      setSelection(null);
    }
  };

  const handleDragMove = (clientX, clientY) => {
    const drag = dragRef.current;
    if (!drag) return;
    const fake = { clientX, clientY };
    const p = svgPoint(fake);
    let x = clampX(p.x), z = clampZ(p.z);

    if (drag.kind === "wall") {
      // axis-lock: whichever delta is larger wins
      const dx = Math.abs(x - drag.x1), dz = Math.abs(z - drag.z1);
      let x2 = drag.x1, z2 = drag.z1;
      if (dx >= dz) x2 = snap(x); else z2 = snap(z);
      setPreview({ kind: "wall", x1: drag.x1, z1: drag.z1, x2, z2 });
    } else if (drag.kind === "zone") {
      setPreview({ kind: "zone", x1: drag.x1, z1: drag.z1, x2: snap(x), z2: snap(z) });
    }
  };

  const commitDrag = () => {
    const drag = dragRef.current;
    if (!drag || !preview) { cleanupDrag(); return; }

    if (preview.kind === "wall") {
      const len = dist(preview.x1, preview.z1, preview.x2, preview.z2);
      if (len >= MIN_WALL_LEN) {
        const newWall = { id: genId(), x1: preview.x1, z1: preview.z1, x2: preview.x2, z2: preview.z2, color: activeColor };
        setWalls(prev => [...prev, newWall]);
        historyRef.current.push({ kind: "wall", id: newWall.id });
      }
    } else if (preview.kind === "zone") {
      const x1 = Math.min(preview.x1, preview.x2), x2 = Math.max(preview.x1, preview.x2);
      const z1 = Math.min(preview.z1, preview.z2), z2 = Math.max(preview.z1, preview.z2);
      const w = x2 - x1, d = z2 - z1;
      if (w >= MIN_ZONE_SIZE && d >= MIN_ZONE_SIZE) {
        const newZone = { id: genId(), x: x1 + w / 2, z: z1 + d / 2, w, d, color: activeColor };
        setFloorZones(prev => [...prev, newZone]);
        historyRef.current.push({ kind: "zone", id: newZone.id });
      }
    }
    cleanupDrag();
  };

  const cleanupDrag = () => {
    dragRef.current = null;
    setPreview(null);
    detachDocListeners();
  };

  /* ── Document-level listeners while dragging (so drags don't break at svg edges) ── */
  const onDocMove = (e) => handleDragMove(e.clientX, e.clientY);
  const onDocUp = () => commitDrag();
  const attachDocListeners = () => {
    document.addEventListener("mousemove", onDocMove);
    document.addEventListener("mouseup", onDocUp);
  };
  const detachDocListeners = () => {
    document.removeEventListener("mousemove", onDocMove);
    document.removeEventListener("mouseup", onDocUp);
  };
  useEffect(() => () => detachDocListeners(), []);

  /* ── Keyboard: Escape cancels drag, Delete removes selection ── */
  useEffect(() => {
    const onKey = (e) => {
      if (e.key === "Escape") cleanupDrag();
      if ((e.key === "Delete" || e.key === "Backspace") && selection) {
        e.preventDefault();
        deleteSelection();
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  });

  const deleteSelection = () => {
    if (!selection) return;
    if (selection.kind === "wall") {
      setWalls(prev => prev.filter(w => w.id !== selection.id));
      setDoors(prev => prev.filter(d => d.wallId !== selection.id));
    } else if (selection.kind === "zone") {
      setFloorZones(prev => prev.filter(z => z.id !== selection.id));
    } else if (selection.kind === "door") {
      setDoors(prev => prev.filter(d => d.id !== selection.id));
    }
    setSelection(null);
  };

  const recolorSelection = (color) => {
    if (!selection) { setActiveColor(color); return; }
    setActiveColor(color);
    if (selection.kind === "wall") {
      setWalls(prev => prev.map(w => w.id === selection.id ? { ...w, color } : w));
    } else if (selection.kind === "zone") {
      setFloorZones(prev => prev.map(z => z.id === selection.id ? { ...z, color } : z));
    }
  };

  const handleUndo = () => {
    const last = historyRef.current.pop();
    if (!last) return;
    if (last.kind === "wall") {
      setWalls(prev => prev.filter(w => w.id !== last.id));
      setDoors(prev => prev.filter(d => d.wallId !== last.id));
    } else if (last.kind === "zone") {
      setFloorZones(prev => prev.filter(z => z.id !== last.id));
    } else if (last.kind === "door") {
      setDoors(prev => prev.filter(d => d.id !== last.id));
    }
  };

  const handleClearAll = () => {
    setWalls([]); setFloorZones([]); setDoors([]);
    setSelection(null);
    historyRef.current = [];
  };

  /* ── Grid lines ── */
  const gridLinesX = [];
  for (let gx = -Math.floor(W / 2); gx <= Math.floor(W / 2); gx += 1) gridLinesX.push(gx);
  const gridLinesZ = [];
  for (let gz = -Math.floor(D / 2); gz <= Math.floor(D / 2); gz += 1) gridLinesZ.push(gz);

  const wallThickness = 0.15;

  const selectedWall = selection?.kind === "wall" ? walls.find(w => w.id === selection.id) : null;
  const selectedZone = selection?.kind === "zone" ? floorZones.find(z => z.id === selection.id) : null;
  const selectedDoor = selection?.kind === "door" ? doors.find(d => d.id === selection.id) : null;

  return (
    <div className="we-overlay">
      <div className="we-panel">

        {showIntro && (
          <div className="we-intro">
            <div className="we-intro-card">
              <p className="we-intro-title">Design your room</p>
              <p className="we-intro-body">This is a top-down view of your room, looking straight down from above. Draw here, then apply it to see the 3D result.</p>
              <ol className="we-intro-steps">
                <li><strong>Wall</strong> — drag to draw a wall (snaps straight)</li>
                <li><strong>Door</strong> — click an existing wall to add one</li>
                <li><strong>Floor Zone</strong> — drag to color a room's floor</li>
                <li><strong>Apply to 3D</strong> — see it built in the workspace</li>
              </ol>
              <button className="we-intro-btn" onClick={dismissIntro}>Got it — let's start</button>
            </div>
          </div>
        )}

        {/* Toolbar */}
        <div className="we-toolbar">
          <div className="we-tools">
            <button className={`we-tool-btn ${tool === "wall" ? "active" : ""}`} onClick={() => { setTool("wall"); setSelection(null); }}>
              <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M3 12h18"/></svg>
              Wall
            </button>
            <button className={`we-tool-btn ${tool === "floorzone" ? "active" : ""}`} onClick={() => { setTool("floorzone"); setSelection(null); }}>
              <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><rect x="4" y="4" width="16" height="16" rx="1.5"/></svg>
              Floor Zone
            </button>
            <button className={`we-tool-btn ${tool === "door" ? "active" : ""}`} onClick={() => { setTool("door"); setSelection(null); }}>
              <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M5 21V4a1 1 0 0 1 1-1h9v18M5 21h13M14 12v.01"/></svg>
              Door
            </button>
            <button className={`we-tool-btn ${tool === "select" ? "active" : ""}`} onClick={() => setTool("select")}>
              <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M3 3l7.07 16.97 2.51-7.39 7.39-2.51z"/></svg>
              Select / Erase
            </button>
          </div>

          <div className="we-palette">
            {PALETTE.map(c => (
              <button key={c} className={`we-swatch ${activeColor === c ? "active" : ""}`}
                style={{ background: c }} onClick={() => recolorSelection(c)} title={c} />
            ))}
          </div>

          <div className="we-toolbar-actions">
            <button className="we-action-btn" onClick={handleUndo}>↩ Undo</button>
            <button className="we-action-btn" onClick={handleClearAll}>🗑 Clear All</button>
          </div>
        </div>

        {/* Always-visible hint for the active tool */}
        <div className="we-hint-bar">
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#7c3aed" strokeWidth="2"><circle cx="12" cy="12" r="10"/><path d="M12 16v-4M12 8h.01"/></svg>
          <span>{TOOL_HINTS[tool]}</span>
        </div>

        <div className="we-body">
          {/* Canvas */}
          <div className="we-canvas-wrap">
            <svg
              ref={svgRef}
              viewBox={`${-W / 2 - 1} ${-D / 2 - 1} ${W + 2} ${D + 2}`}
              className={`we-svg tool-${tool}`}
              onMouseDown={handleDown}
              preserveAspectRatio="xMidYMid meet"
            >
              {/* room bounding box */}
              <rect x={-W / 2} y={-D / 2} width={W} height={D} fill="#faf8ff" stroke="#a78bfa" strokeWidth="0.06" />

              {/* grid */}
              {gridLinesX.map(gx => (
                <line key={`gx${gx}`} x1={gx} y1={-D / 2} x2={gx} y2={D / 2} stroke="#ece7fb" strokeWidth="0.02" />
              ))}
              {gridLinesZ.map(gz => (
                <line key={`gz${gz}`} x1={-W / 2} y1={gz} x2={W / 2} y2={gz} stroke="#ece7fb" strokeWidth="0.02" />
              ))}

              {/* dimension labels */}
              <text x="0" y={-D / 2 - 0.35} textAnchor="middle" fontSize="0.45" fill="#a78bfa" fontFamily="Poppins, sans-serif">
                {W} m
              </text>
              <text x={-W / 2 - 0.35} y="0" textAnchor="middle" fontSize="0.45" fill="#a78bfa" fontFamily="Poppins, sans-serif"
                transform={`rotate(-90 ${-W / 2 - 0.35} 0)`}>
                {D} m
              </text>

              {/* empty-state placeholder */}
              {walls.length === 0 && floorZones.length === 0 && (
                <text x="0" y="0" textAnchor="middle" fontSize="0.55" fill="#d8cff5" fontFamily="Poppins, sans-serif">
                  Draw your room here — {W}m × {D}m
                </text>
              )}

              {/* floor zones */}
              {floorZones.map(fz => (
                <rect
                  key={fz.id}
                  x={fz.x - fz.w / 2} y={fz.z - fz.d / 2} width={fz.w} height={fz.d}
                  fill={fz.color} opacity="0.75"
                  stroke={selection?.kind === "zone" && selection.id === fz.id ? "#7c3aed" : "transparent"}
                  strokeWidth="0.08"
                />
              ))}

              {/* walls */}
              {walls.map(w => (
                <line
                  key={w.id}
                  x1={w.x1} y1={w.z1} x2={w.x2} y2={w.z2}
                  stroke={selection?.kind === "wall" && selection.id === w.id ? "#7c3aed" : w.color}
                  strokeWidth={wallThickness}
                  strokeLinecap="square"
                />
              ))}

              {/* doors */}
              {doors.map(d => {
                const p = doorWorldPos(d);
                if (!p) return null;
                return (
                  <circle
                    key={d.id}
                    cx={p.x} cy={p.z} r={0.18}
                    fill="#8B5E3C"
                    stroke={selection?.kind === "door" && selection.id === d.id ? "#7c3aed" : "#5C4033"}
                    strokeWidth="0.06"
                  />
                );
              })}

              {/* drag preview */}
              {preview?.kind === "wall" && (
                <line x1={preview.x1} y1={preview.z1} x2={preview.x2} y2={preview.z2}
                  stroke="#7c3aed" strokeWidth={wallThickness} strokeDasharray="0.2 0.15" strokeLinecap="square" />
              )}
              {preview?.kind === "zone" && (
                <rect
                  x={Math.min(preview.x1, preview.x2)} y={Math.min(preview.z1, preview.z2)}
                  width={Math.abs(preview.x2 - preview.x1)} height={Math.abs(preview.z2 - preview.z1)}
                  fill={activeColor} opacity="0.4" stroke="#7c3aed" strokeWidth="0.05" strokeDasharray="0.2 0.15"
                />
              )}
            </svg>
          </div>

          {/* Inspector */}
          <div className="we-inspector">
            {!selection && (
              <div className="we-help">
                <p className="we-help-title">Nothing selected</p>
                <p className="we-help-body">Switch to Select / Erase and click a wall, door, or floor zone to edit or delete it.</p>
                <p className="we-help-count">
                  {walls.length} wall{walls.length !== 1 ? "s" : ""} · {floorZones.length} zone{floorZones.length !== 1 ? "s" : ""} · {doors.length} door{doors.length !== 1 ? "s" : ""}
                </p>
              </div>
            )}
            {selectedWall && (
              <div className="we-selected">
                <p className="we-selected-title">Wall selected</p>
                <p className="we-selected-body">Length: {dist(selectedWall.x1, selectedWall.z1, selectedWall.x2, selectedWall.z2).toFixed(1)} m</p>
                <button className="we-delete-btn" onClick={deleteSelection}>Delete Wall</button>
              </div>
            )}
            {selectedZone && (
              <div className="we-selected">
                <p className="we-selected-title">Floor zone selected</p>
                <p className="we-selected-body">{selectedZone.w.toFixed(1)} m × {selectedZone.d.toFixed(1)} m</p>
                <button className="we-delete-btn" onClick={deleteSelection}>Delete Zone</button>
              </div>
            )}
            {selectedDoor && (
              <div className="we-selected">
                <p className="we-selected-title">Door selected</p>
                <button className="we-delete-btn" onClick={deleteSelection}>Delete Door</button>
              </div>
            )}
          </div>
        </div>

        {/* Footer */}
        <div className="we-footer">
          <button className="we-cancel-btn" onClick={onClose}>Cancel</button>
          <button className="we-apply-btn" onClick={() => onApply(walls, floorZones, doors)}>Apply to 3D</button>
        </div>
      </div>
    </div>
  );
}
