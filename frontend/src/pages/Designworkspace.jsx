import { useState, useRef, useEffect, useLayoutEffect } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import * as THREE from "three";
import Navbar from "../components/Navbar";
import * as CFP from "./customFloorPlan";
import "./DesignWorkspace.css";

import thumbIndoor   from "../assets/layouts/thumb-indoor.png";
import thumbEnclosed from "../assets/layouts/thumb-enclosed.png";
import thumbLshaped  from "../assets/layouts/thumb-lshaped.png";
import thumbGarden   from "../assets/layouts/thumb-garden.png";

/* The catalog/geometry code below was extracted into designWorkspace/* on
   2026-08-13 to keep this file to just the DesignWorkspace component
   itself (it was about 9,600 lines in one file). Every extracted module
   is a purely mechanical export of what used to live directly in this
   file, so no behavior changed. See designWorkspace/catalog.js and
   designWorkspace/geometry/*.js. */
import {
  LAYOUT_IMAGES, CATEGORY_META, CATEGORY_LABELS, CATEGORIES,
  SCALE_STEP, SCALE_MIN, SCALE_MAX,
  PART_POS_STEP, PART_POS_MIN, PART_POS_MAX, PART_ROT_STEP, PART_SCALE_STEP, PART_SCALE_MIN, PART_SCALE_MAX,
  ELEMENTS, TYPE_LABELS, PART_LABELS, WHOLE_PART, getPartLabel,
  EVENT_TYPE_PRIORITY, RECOMMENDED_COUNT,
  wallColorPresets, floorColorPresets, itemColorPresets, whiteShadePresets,
  MATERIAL_PRESETS, MATERIAL_LIST, DEFAULT_MATERIAL,
  BRANDING_FONTS, DEFAULT_BRANDING_FONT, BRANDING_SIZE_MIN, BRANDING_SIZE_MAX, BRANDING_SIZE_STEP,
  BRANDING_OFFSET_MIN, BRANDING_OFFSET_MAX, BRANDING_OFFSET_STEP,
  BRANDABLE_TYPES, BRANDING_PANEL_POS,
  STATION_ATTACH_RADIUS, COUNTER_TOP_TYPES,
  DECOR_ATTACH_RADIUS, DECOR_ATTACH_TYPES,
  FLORAL_SWAG_TYPES, STATION_COUNTER_Y,
} from "./designWorkspace/catalog";

import {
  generateBrandingTexture, buildBrandingPanel, buildArchPanel, buildFlutedCylinder, buildFlutedPanel,
} from "./designWorkspace/geometry/branding";
import {
  FLORAL_BLOOM_PALETTE, buildFlowerHead, buildFlowerCluster, buildLeafSprig, buildFloralSwag,
  GREENERY_STEM_STYLES, buildGreeneryStem, FLOWER_STEM_STYLES, buildFlowerStem, buildBouquetStemBundle,
  buildTulipBloom, buildCallaBloom, buildPlantPot, buildPlantTrunks, buildOvalLeafMesh, buildBladeMesh,
  POTTED_PLANT_STYLES, buildPottedFoliage, buildPottedPlant, buildPeaceLily,
} from "./designWorkspace/geometry/florals";
import {
  buildVaseMesh, profileTapered, profileBulbous, profileBottleNeck, profileStackedBubbles, profileWavy,
  profileGoblet, profileGourdDouble, buildVaseHandle, buildVaseSpeckle, VASE_STYLES, buildVase,
} from "./designWorkspace/geometry/vases";
import {
  buildCurtainPanel, archLegsCurve, smileValanceCurve, tailsSmileCurve, buildCurtainRod, buildTiebackBand,
  buildTieDecoration, eyeletTopCurve, buildEyeletPanelWithRings, CURTAIN_STYLES, buildCurtain,
} from "./designWorkspace/geometry/curtains";
import { buildTableRevolve, TABLE_STYLES, buildTable } from "./designWorkspace/geometry/tables";
import {
  pileNoise, buildRugSurface, patMat, buildBorderFrame, buildStripes, buildDiamondLattice,
  buildChevronPattern, buildArcBands, buildMedallionPattern, RUG_STYLES, buildRug,
} from "./designWorkspace/geometry/rugs";
import {
  addLegSet, addChannelRibs, addTuftButtons, buildChairMesh, buildChairStyle, CHAIR_STYLES,
  buildSofaMesh, buildSofaStyle, SOFA_STYLES,
} from "./designWorkspace/geometry/seating";
import {
  buildFlatPolygonPanel, outlineAngled, outlineCurvedCorner, outlineWavyTop, buildFanPanel, PANEL_STYLES,
  buildBackdropPanel, buildStandLeg, SIGN_STYLES, buildWelcomeSign, ART_STYLES, buildWallArt,
} from "./designWorkspace/geometry/panelsSignsArt";
import {
  buildPlatformSlab, outlinePlatformWavyFront, outlinePlatformOrganic, buildStagePlatform,
  buildStageSteps, buildStageBackdrop, STAGE_STYLES, buildStage,
} from "./designWorkspace/geometry/stages";
import {
  BALLOON_STRING, BALLOON_STAND, balloonHash, profileBalloon, buildBalloonBody, buildBalloonString,
  buildBalloonGarlandUnit, outlineHeart, outlineStar, outlineDiamond, BALLOON_STYLES, buildBalloon,
} from "./designWorkspace/geometry/balloons";
import {
  applyItemMaterial, applyPartTransforms, lightingPresets, viewPresets,
  EYE_HEIGHT, FP_WALK_SPEED, FP_RUN_SPEED, FP_MOUSE_SENS, FP_PITCH_MIN, FP_PITCH_MAX,
  FP_FOV_DEFAULT, FP_FOV_MIN, FP_FOV_MAX, FP_ENTER_DURATION, FP_EXIT_DURATION,
  orbitPoseFor, fpPoseFor, getCapacityForArea,
} from "./designWorkspace/geometry/itemHelpers";
import { build3DObject } from "./designWorkspace/geometry/build3DObject";
import { buildRoom, disposeObject3D } from "./designWorkspace/geometry/room";
import {
  DOOR_STYLES, DOOR_STYLE_LABELS, DOOR_STYLE_LIST, DOOR_COLOR_PRESETS, DOOR_FRAME_PRESETS,
  DOOR_HANDLE_STYLES, DOOR_HANDLE_LABELS,
  WINDOW_STYLES, WINDOW_STYLE_LABELS, WINDOW_STYLE_LIST, WINDOW_FRAME_PRESETS, WINDOW_FRAME_MATERIALS,
  GLASS_TINT_LIST, GLASS_TINT_LABELS, GLASS_TINT_PRESETS,
  buildDoorHandle, buildDoorLeaf, buildDoorGroup, buildWindowGroup,
} from "./designWorkspace/geometry/doorsWindows";
import {
  WALL_MOUNT_TYPES, WALL_ART_HANG_Y, WALL_MOUNT_GAP,
  nearestPointOnSegment, computeWallSnap, clearGroup, buildFloorPlanGeometry,
} from "./designWorkspace/geometry/floorPlan";
import { generateTexture, generateFloorTexture } from "./designWorkspace/geometry/textures";
import { ElementIcon } from "./designWorkspace/components/ElementIcon";

/* sessionStorage helpers */
const read = (key, fallback = "") => {
  try { return sessionStorage.getItem(key) ?? fallback; } catch(e) { return fallback; }
};
const readJSON = (key, fallback) => {
  try { const v = sessionStorage.getItem(key); return v ? JSON.parse(v) : fallback; } catch(e) { return fallback; }
};
const writeJSON = (key, val) => {
  try { sessionStorage.setItem(key, JSON.stringify(val)); } catch(e) {}
};

/* ══════════════════════════════════════════
   Main Component
══════════════════════════════════════════ */
export default function DesignWorkspace() {
  const navigate  = useNavigate();
  const location  = useLocation();

  /* Read setup from location.state or sessionStorage */
  const setup = (() => {
    if (location.state?.layoutId) return location.state;
    const name  = read("eventify_sim_name");
    const guests = Number(read("eventify_sim_guests") || 0);
    const type  = read("eventify_sim_type")   || "predefined";
    const lid   = type === "custom" ? "custom" : (read("eventify_sim_layout") || "indoor");
    const w     = Number(read("eventify_sim_width")  || 16);
    const l     = Number(read("eventify_sim_length") || 12);
    const h     = Number(read("eventify_sim_height") || 4);
    const eventType = read("eventify_sim_event_type") || "";
    if (!name || !guests) return null;
    return { eventName: name, guests, eventType, workspaceType: type, layoutId: lid, dims: { width: w, length: l, height: h } };
  })();

  /* Redirect if no setup data */
  useEffect(() => {
    if (!setup) navigate("/simulation", { replace: true });
  }, []);

  if (!setup) return null;

  const { eventName, guests, eventType, workspaceType, layoutId, dims } = setup;

  // Clear any cached dark colors from sessionStorage
  useEffect(() => {
    sessionStorage.removeItem("eventify_wall_color");
    sessionStorage.removeItem("eventify_floor_color");
  }, []);
  const isGarden = layoutId === "garden";
  const isCustom = workspaceType === "custom";
  const isEnclosed = layoutId === "enclosed";

  /* State */
  const [activeCategory, setActiveCategory]   = useState("All");
  const [searchTerm, setSearchTerm]           = useState("");
  const [recentIds, setRecentIds]             = useState(() => readJSON("eventify_recent_items", []));
  const [favoriteIds, setFavoriteIds]         = useState(() => {
    try { return JSON.parse(localStorage.getItem("eventify_favorite_items") || "[]"); }
    catch (e) { return []; }
  });
  const [showLayoutPicker, setShowLayoutPicker] = useState(false);
  const [activeView, setActiveView]           = useState("3D View");
  const [wallColor, setWallColor]             = useState("#ffffff");
  const [floorColor, setFloorColor]           = useState(isGarden ? "#4a7c3f" : "#f0ece8");
  const [lighting, setLighting]               = useState("Soft");
  const [wallTexture, setWallTexture]         = useState(0);
  const [floorTexture, setFloorTexture]       = useState(0);
  const [placedItems, setPlacedItems]         = useState([]);
  const [showFrontWall, setShowFrontWall]     = useState(false);
  const [simulationId, setSimulationId]       = useState(() => read("eventify_sim_id", "") || null);
  const [saveStatus, setSaveStatus]           = useState("idle"); // idle | saving | success | error
  const [saveMessage, setSaveMessage]         = useState("");

  /* Custom layout: tile-based floor plan, built directly in the 3D view */
  const [floorTiles, setFloorTiles]           = useState(() => {
    if (!isCustom) return [];
    const stored = readJSON("eventify_tiles", null);
    return Array.isArray(stored) && stored.length > 0 ? stored : CFP.initialTiles(dims.width, dims.length);
  });
  const [wallStyles, setWallStyles]           = useState(() => readJSON("eventify_wallstyles", {}));
  /* `doors` used to be a plain {edgeKey: true} flag map. Now each entry is
     a customizable instance {style, color, frameColor, handle, openDir,
     tall}. Old saved projects still have the boolean form, so on load we
     migrate any `true` entry to a default-styled door object instead of
     breaking existing layouts. */
  const [doors, setDoors]                     = useState(() => {
    const raw = readJSON("eventify_doors", {});
    const migrated = {};
    Object.entries(raw).forEach(([k, v]) => { migrated[k] = v === true ? { style: "modern-single" } : v; });
    return migrated;
  });
  /* Same {edgeKey: {style, ...props}} shape as `doors`, entirely new so no
     migration needed. */
  const [windows, setWindows]                 = useState(() => readJSON("eventify_windows", {}));

  /* Unified selection: one shape covers every selectable object, structural
     or not (see docs/customization-system-design.md §2):
       { kind: "furniture", id, screenX, screenY }
       { kind: "wall", segment, nearestEdgeKey, color, doorData, windowData, uiMode, screenX, screenY }
     A single popover reads this and renders the right controls. */
  const [selection, setSelection]             = useState(null);
  const [advancedMode, setAdvancedMode]       = useState(false);
  const [selectedPart, setSelectedPart]       = useState(null); // e.g. "canopy": which tagged sub-mesh is active in Advanced Edit
  const advancedModeRef = useRef(advancedMode); advancedModeRef.current = advancedMode; // read inside the Three.js init effect's closures, which don't re-run on every state change
  const selectionRef = useRef(selection); selectionRef.current = selection; // same reason: Escape/click handling inside the init effect needs the current selection, not the one from mount time

  /* Event Editing Mode is "overview" (orbit camera, today's default) or
     "firstPerson" (walkthrough). This is a separate axis from advancedMode:
     you can enter Advanced Edit on an object from either view. See the
     bridging logic around handleEnterAdvancedMode/handleExitAdvancedMode
     below. */
  const [viewMode, setViewMode]               = useState("overview");
  const viewModeRef = useRef(viewMode); viewModeRef.current = viewMode;

  const [showHint, setShowHint]               = useState(() => {
    try { return !localStorage.getItem("eventify_floorplan_hint_dismissed"); } catch (e) { return true; }
  });

  /* Persist custom geometry across the session */
  useEffect(() => { writeJSON("eventify_tiles", floorTiles); }, [floorTiles]);
  useEffect(() => { writeJSON("eventify_wallstyles", wallStyles); }, [wallStyles]);
  useEffect(() => { writeJSON("eventify_doors", doors); }, [doors]);
  useEffect(() => { writeJSON("eventify_windows", windows); }, [windows]);

  /* Refs */
  const mountRef     = useRef(null);
  const popoverRef   = useRef(null);
  /* Manual drag state for the settings popover. Null means "no manual
     override yet, use the automatic beside-the-object placement".
     Once the user drags the handle it holds a {x,y} pixel offset (from
     the selection's screenX/screenY anchor) that overrides auto-placement
     until a different object/wall is selected. */
  const popoverDragOffsetRef = useRef(null);
  const popoverDragStateRef  = useRef(null);
  const popoverSelIdRef      = useRef(null);
  const sceneRef     = useRef(null);
  const cameraRef    = useRef(null);
  const wallMatsRef  = useRef([]);
  const floorMatRef  = useRef(null);
  const ambientRef   = useRef(null);
  const dirLightRef  = useRef(null);
  const orbitRef     = useRef({ theta: 0.6, phi: 0.5, radius: 18, px: 0, pz: 0 });
  const meshMapRef   = useRef({});
  const customGroupRef = useRef(null);
  /* Advanced Edit Mode (camera zoom + per-component editing).
     cameraTweenRef drives a smooth interpolation of orbitRef from the render
     loop (see the animate() function below) instead of snapping the camera
     instantly. It keeps theta/phi (the user's current viewing angle) fixed
     and only tweens px/pz/radius, so it reads as "zooming into" the object
     instead of a disorienting cut. preAdvancedOrbitRef remembers where the
     camera was so "Done" can animate back to it. */
  const cameraTweenRef      = useRef(null);
  const preAdvancedOrbitRef = useRef(null);
  const advancedItemIdRef   = useRef(null);

  /* Event Editing Mode (first-person walkthrough) refs.
     canvasRef: the renderer's DOM element, needed outside the init effect
       for requestPointerLock/exitPointerLock.
     fpStateRef: the authoritative eye position and look angles once settled
       (i.e. not mid-transition). Written by WASD/mouse-look each frame,
       read by the render loop to place the camera.
     poseTweenRef: a generic raw position+quaternion tween (see
       beginPoseTween below), used for every First Person transition:
       entering/exiting the mode, and the two bridges to/from Advanced Edit.
       It's deliberately separate from cameraTweenRef (which only ever
       tweens orbitRef fields) instead of forcing the two camera models
       through one interpolator.
     preFirstPersonOrbitRef: the orbit state to animate back to on Exit.
     preAdvancedViewModeRef / preAdvancedFpStateRef: which mode Advanced
       Edit was entered from, and, if it was First Person, the exact eye
       pose to hand back once Advanced Edit's own Done tween finishes.
     keysRef: currently-held WASD/Shift state, polled once per frame instead
       of acted on per keydown event, so diagonal movement etc. reads
       smoothly instead of as a burst per keystroke.
     pointerLockedRef: mirrors document.pointerLockElement. It gates whether
       mouse movement should steer the view (locked) or behave as a normal
       free cursor for clicking the popover UI (not locked). */
  const canvasRef               = useRef(null);
  const fpStateRef              = useRef({ x: 0, z: 0, yaw: 0, pitch: -0.12 });
  const poseTweenRef            = useRef(null);
  const preFirstPersonOrbitRef  = useRef(null);
  const preAdvancedViewModeRef  = useRef("overview");
  const preAdvancedFpStateRef   = useRef(null);
  const keysRef                 = useRef({ forward: false, backward: false, left: false, right: false, run: false });
  const pointerLockedRef        = useRef(false);

  // Always-current copies for use inside the stable Three.js event handlers below
  const floorTilesRef = useRef(floorTiles); floorTilesRef.current = floorTiles;
  const wallStylesRef = useRef(wallStyles); wallStylesRef.current = wallStyles;
  const doorsRef      = useRef(doors);      doorsRef.current = doors;
  const windowsRef    = useRef(windows);    windowsRef.current = windows;
  const placedItemsRef = useRef(placedItems); placedItemsRef.current = placedItems;

  const RW = dims.width;
  const RD = dims.length;
  const RH = isGarden ? 4 : Math.max(dims.height, 5);

  /* Live updates */
  useEffect(() => {
    wallMatsRef.current.forEach(m => {
      if (m && !m.userData?.isFrontWall) m.color.set(wallColor);
    });
  }, [wallColor]);

  useEffect(() => {
    if (floorMatRef.current && !isGarden) {
      floorMatRef.current.color.set(floorColor);
    }
  }, [floorColor]);

  useEffect(() => {
    const p = lightingPresets[lighting];
    if (ambientRef.current)  ambientRef.current.intensity = p.ambient;
    if (dirLightRef.current) { dirLightRef.current.intensity = p.dir; dirLightRef.current.color.set(p.color); }
  }, [lighting]);

  /* Apply wall texture */
  useEffect(() => {
    if (!wallMatsRef.current || wallMatsRef.current.length === 0) return;
    if (wallTexture === 0) {
      // Plain: remove texture, restore color
      wallMatsRef.current.forEach(m => {
        if (!m) return;
        m.map = null;
        m.color.set(wallColor);
        m.needsUpdate = true;
      });
      return;
    }
    // Generate canvas texture
    const canvas = document.createElement("canvas");
    canvas.width = 512; canvas.height = 512;
    const ctx = canvas.getContext("2d");

    if (wallTexture === 1) {
      // Subtle grid
      ctx.fillStyle = "#fafafa";
      ctx.fillRect(0, 0, 512, 512);
      ctx.strokeStyle = "#e0ddf5";
      ctx.lineWidth = 1;
      for (let i = 0; i < 512; i += 40) {
        ctx.beginPath(); ctx.moveTo(i,0); ctx.lineTo(i,512); ctx.stroke();
        ctx.beginPath(); ctx.moveTo(0,i); ctx.lineTo(512,i); ctx.stroke();
      }
    } else if (wallTexture === 2) {
      // Brick
      ctx.fillStyle = "#dcc9b0";
      ctx.fillRect(0, 0, 512, 512);
      const bW = 80, bH = 35;
      for (let row = 0; row < 512/bH+1; row++) {
        const offset = (row % 2) * (bW/2);
        for (let col = -1; col < 512/bW+1; col++) {
          const x = col*bW + offset, y = row*bH;
          ctx.fillStyle = `hsl(${25 + Math.random()*10}, ${35+Math.random()*10}%, ${65+Math.random()*10}%)`;
          ctx.fillRect(x+2, y+2, bW-4, bH-4);
          ctx.strokeStyle = "#b09070";
          ctx.lineWidth = 2;
          ctx.strokeRect(x+2, y+2, bW-4, bH-4);
        }
      }
    } else if (wallTexture === 3) {
      // Marble
      ctx.fillStyle = "#f2f0f5";
      ctx.fillRect(0, 0, 512, 512);
      for (let i = 0; i < 12; i++) {
        ctx.beginPath();
        ctx.moveTo(Math.random()*512, 0);
        ctx.bezierCurveTo(
          Math.random()*512, Math.random()*200,
          Math.random()*512, Math.random()*400,
          Math.random()*512, 512
        );
        ctx.strokeStyle = `rgba(160,150,180,${0.1+Math.random()*0.2})`;
        ctx.lineWidth = 1 + Math.random()*2;
        ctx.stroke();
      }
    }

    const tex = new THREE.CanvasTexture(canvas);
    tex.wrapS = THREE.RepeatWrapping;
    tex.wrapT = THREE.RepeatWrapping;
    tex.repeat.set(3, 2);

    wallMatsRef.current.forEach(m => {
      if (!m) return;
      m.map = tex;
      m.color.set(0xffffff);
      m.needsUpdate = true;
    });
  }, [wallTexture]);

  /* Apply floor texture (non-custom layouts only). floorMatRef is a single,
     stable material reused across floorColor changes, same as walls. */
  useEffect(() => {
    if (isCustom || isGarden || !floorMatRef.current) return;
    const m = floorMatRef.current;
    if (floorTexture === 0) {
      m.map = null;
      m.color.set(floorColor);
      m.needsUpdate = true;
      return;
    }
    const tex = generateFloorTexture(floorTexture);
    tex.wrapS = THREE.RepeatWrapping;
    tex.wrapT = THREE.RepeatWrapping;
    tex.repeat.set(Math.max(1, Math.round(RW / 2)), Math.max(1, Math.round(RD / 2)));
    m.map = tex;
    m.color.set(0xffffff);
    m.needsUpdate = true;
  }, [floorTexture]);

  /* Front wall toggle (enclosed room) */
  useEffect(() => {
    const scene = sceneRef.current;
    if (!scene || !isEnclosed) return;
    scene.traverse(obj => {
      if (obj.userData?.isFrontWall) {
        obj.material.opacity = showFrontWall ? 1 : 0;
        obj.material.transparent = !showFrontWall;
      }
    });
  }, [showFrontWall]);

  /* Camera */
  const updateCamera = () => {
    const { theta, phi, radius, px, pz } = orbitRef.current;
    const cam = cameraRef.current;
    if (!cam) return;
    cam.position.set(
      px + radius * Math.sin(theta) * Math.cos(phi),
      radius * Math.sin(phi),
      pz + radius * Math.cos(theta) * Math.cos(phi)
    );
    cam.lookAt(px, 0, pz);
  };

  /* Kicks off a smooth orbit interpolation, consumed frame-by-frame in the
     render loop below instead of jumped to instantly. `target` only needs
     to include the fields that should change. Anything omitted holds at
     its current value (e.g. entering Advanced Edit only tweens
     px/pz/radius and leaves theta/phi, the user's viewing angle, alone). */
  const animateCameraTo = (target, duration = 700) => {
    cameraTweenRef.current = {
      from: { ...orbitRef.current },
      to: { ...orbitRef.current, ...target },
      start: performance.now(),
      duration,
    };
  };

  const applyViewPreset = (name) => {
    setActiveView(name);
    orbitRef.current = { ...orbitRef.current, ...viewPresets[name] };
    updateCamera();
  };

  /* Camera-pose tween (Event Editing Mode).
     A generic raw position+quaternion interpolation, unlike animateCameraTo
     above which only ever tweens orbitRef fields. It's used for every First
     Person transition, since those need to move the camera continuously
     from wherever it visually is right now (which might be orbit-driven,
     first-person-driven, or mid-zoom into Advanced Edit) to an arbitrary
     target pose that isn't expressible as an orbit state (a free-look eye
     position isn't "a distance and two angles from a ground point"). The
     render loop (animate(), in the init effect below) consumes this the
     same way it already consumes cameraTweenRef: read it every frame,
     lerp/slerp toward the target, and clear it at t>=1. `onComplete` hands
     off to whichever system should drive the camera next: writing into
     orbitRef for Advanced Edit's zoom, or into fpStateRef to resume
     walking. */
  const beginPoseTween = (toPos, toQuat, duration, onComplete) => {
    const cam = cameraRef.current;
    if (!cam) return;
    poseTweenRef.current = {
      fromPos: cam.position.clone(),
      fromQuat: cam.quaternion.clone(),
      toPos: toPos.clone(),
      toQuat: toQuat.clone(),
      start: performance.now(),
      duration,
      onComplete,
    };
  };

  // Pointer Lock must be requested from within a user-gesture call stack or
  // the browser silently rejects it. Every call site here is either a
  // direct click handler or a callback chained off one, but browsers are
  // still inconsistent enough about it (and about the ~1.25s cooldown after
  // an Escape-triggered unlock) that every call is wrapped defensively
  // instead of assumed to succeed.
  const requestPointerLockSafely = () => {
    try { canvasRef.current?.requestPointerLock?.()?.catch?.(() => {}); } catch (e) {}
  };
  const exitPointerLockSafely = () => {
    try { if (document.pointerLockElement) document.exitPointerLock?.(); } catch (e) {}
  };

  /* Event Editing Mode: entry/exit.
     This mirrors the Advanced Edit entry/exit pattern: flip the mode state
     immediately, then animate the camera, instead of waiting for the
     tween to finish before updating viewMode. That way the top banner and
     input gating switch over right away, and any WASD/mouse-look input
     that happens during the ~900ms pan-in is simply ignored (see the
     poseTweenRef guards in the init effect) instead of queuing up and
     causing a jarring snap the instant the tween completes. */
  const handleEnterFirstPerson = () => {
    if (advancedModeRef.current || poseTweenRef.current) return;
    setSelection(null);
    preFirstPersonOrbitRef.current = { ...orbitRef.current };
    // Room footprints are always built centered on the origin (standard
    // rooms are RW/RD around (0,0); custom tile rooms start from
    // CFP.initialTiles, also centered on (0,0)). So unlike the per-frame
    // walking clamp below, this one fixed starting point never needs
    // getRoomBounds(), which isn't reachable from here anyway since it's
    // local to the init effect's closure.
    const startFp = { x: 0, z: 0, yaw: 0, pitch: -0.12 };
    fpStateRef.current = startFp;
    const { pos, quat } = fpPoseFor(startFp);
    beginPoseTween(pos, quat, FP_ENTER_DURATION);
    setViewMode("firstPerson");
    requestPointerLockSafely();
  };

  const handleExitFirstPerson = () => {
    if (poseTweenRef.current) return;
    exitPointerLockSafely();
    // The wheel-as-FOV-zoom in First Person (see onWheel) mutates the same
    // shared camera Overview uses. Reset it here, or a scroll mid-walk
    // would silently carry over as a permanently wider/narrower Overview
    // view until the page reloads.
    if (cameraRef.current) { cameraRef.current.fov = FP_FOV_DEFAULT; cameraRef.current.updateProjectionMatrix(); }
    // This fallback shouldn't be reachable in practice (this ref is always
    // set by handleEnterFirstPerson before the Exit button can even
    // render), but viewPresets entries only carry theta/phi/radius, so we
    // pair it with px/pz explicitly so orbitPoseFor never divides into NaN
    // territory.
    const target = preFirstPersonOrbitRef.current || { ...viewPresets["3D View"], px: 0, pz: 0 };
    preFirstPersonOrbitRef.current = null;
    setSelection(null);
    setViewMode("overview");
    const { pos, quat } = orbitPoseFor(target);
    beginPoseTween(pos, quat, FP_EXIT_DURATION, () => {
      orbitRef.current = target;
      updateCamera();
    });
  };

  /* Init Three.js */
  useEffect(() => {
    const timer = setTimeout(() => {
      const mount = mountRef.current;
      if (!mount) return;

      const W = mount.clientWidth  || 900;
      const H = mount.clientHeight || 550;

      const scene = new THREE.Scene();
      /* Background */
      scene.background = new THREE.Color(isGarden ? "#d4edda" : "#f0eefa");
      sceneRef.current = scene;

      const camera = new THREE.PerspectiveCamera(55, W/H, 0.1, 200);
      cameraRef.current = camera;

      const renderer = new THREE.WebGLRenderer({ antialias: true });
      renderer.setSize(W, H);
      renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
      renderer.shadowMap.enabled = true;
      renderer.shadowMap.type = THREE.PCFSoftShadowMap;
      // Explicit color space and a filmic tone curve so the brighter
      // lighting below renders true whites instead of blowing out to
      // flat grey or clipping highlights.
      renderer.outputColorSpace = THREE.SRGBColorSpace;
      renderer.toneMapping = THREE.ACESFilmicToneMapping;
      renderer.toneMappingExposure = 1.1;
      renderer.domElement.style.display = "block";
      renderer.domElement.style.width  = "100%";
      renderer.domElement.style.height = "100%";
      mount.appendChild(renderer.domElement);

      /* Lights */
      const preset = lightingPresets[lighting];
      const ambient = new THREE.AmbientLight(0xffffff, preset.ambient);
      ambientRef.current = ambient;
      scene.add(ambient);

      const dir = new THREE.DirectionalLight(preset.color, preset.dir);
      dir.position.set(10, 18, 10);
      dir.castShadow = true;
      dir.shadow.mapSize.width  = 2048;
      dir.shadow.mapSize.height = 2048;
      dir.shadow.camera.near = 0.5;
      dir.shadow.camera.far  = 100;
      dir.shadow.camera.left = -30;
      dir.shadow.camera.right = 30;
      dir.shadow.camera.top  = 30;
      dir.shadow.camera.bottom = -30;
      dirLightRef.current = dir;
      scene.add(dir);

      const fill = new THREE.PointLight(0xffffff, 0.5, 50);
      fill.position.set(-8, 10, -5);
      scene.add(fill);

      const fill2 = new THREE.PointLight(0xffffff, 0.5, 50);
      fill2.position.set(8, 10, 8);
      scene.add(fill2);

      const fill3 = new THREE.PointLight(0xffffff, 0.35, 50);
      fill3.position.set(0, 12, 0);
      scene.add(fill3);

      /* Room: always use 3D geometry for full rotation support */
      wallMatsRef.current = [];
      buildRoom(layoutId, RW, RD, RH, wallColor, floorColor, wallMatsRef, floorMatRef, scene, isGarden);

      /* Custom layout: tile floor + auto walls, built directly in 3D */
      const customGroup = new THREE.Group();
      customGroup.name = "customGeometry";
      scene.add(customGroup);
      customGroupRef.current = customGroup;
      if (isCustom) {
        buildFloorPlanGeometry(customGroup, new Set(floorTilesRef.current), wallStylesRef.current, doorsRef.current, windowsRef.current, RH, floorColor, null, floorTexture);
      }

      /* Camera */
      const maxDim = Math.max(RW, RD);
      if (layoutId === "enclosed") {
        // Position camera inside room near front, looking at back wall
        // phi close to 0 = eye level, theta = 0 = looking straight at back wall
        orbitRef.current = { theta: 0, phi: 0.08, radius: maxDim * 0.75, px: 0, pz: RD * 0.3 };
      } else if (layoutId === "indoor") {
        orbitRef.current = { theta: 0.5, phi: 0.35, radius: maxDim * 1.0, px: 0, pz: 0 };
      } else if (layoutId === "lshaped") {
        orbitRef.current = { theta: 0.4, phi: 0.4, radius: maxDim * 1.2, px: 0, pz: 0 };
      } else {
        orbitRef.current = { theta: 0.6, phi: 0.5, radius: maxDim * 1.2, px: 0, pz: 0 };
      }
      updateCamera();

      /* Orbit controls */
      const canvas = renderer.domElement;
      canvasRef.current = canvas;
      let drag = false, pan = false, prevX = 0, prevY = 0;
      let downX = 0, downY = 0, moved = false;
      let moveDrag = null; // { id, x, z }: active furniture drag-to-move
      let dragFollowTarget = null; // { x, z }: where the Advanced Edit camera is easing toward while dragging (see animate() below)
      // Advanced Edit zooms the camera in tight on the object, and at that
      // close framing the object's previous 1:1 ground-raycast tracking read
      // as way too fast and twitchy for precise placement: a small cursor
      // nudge covered a large chunk of the now-small visible area. Scaling
      // the per-move delta down, instead of snapping straight to the raw
      // raycast point, slows the object's own movement without touching
      // Standard Mode's drag, which isn't zoomed in and felt fine as-is.
      const ADVANCED_DRAG_SENSITIVITY = 0.4;
      const raycaster = new THREE.Raycaster();
      const groundPlane = new THREE.Plane(new THREE.Vector3(0, 1, 0), 0);
      const DRAG_WALL_MARGIN = 0.4; // keep a dragged item's center from clipping into a wall

      /* Where a drag is allowed to land: the room's actual floor extent,
         not an arbitrary generous number, so dragging (Standard Mode or
         Advanced Edit) can't push something outside the walls. Custom
         layouts are tile-built and not necessarily rectangular, so their
         bound comes from the placed tiles' own bounding box instead of
         RW/RD, which only describe the room's original footprint before
         any custom editing. */
      const getRoomBounds = () => {
        if (isCustom) {
          const tiles = floorTilesRef.current;
          if (tiles && tiles.length) {
            let minX = Infinity, maxX = -Infinity, minZ = Infinity, maxZ = -Infinity;
            const h = CFP.TILE_SIZE / 2;
            tiles.forEach(key => {
              const { i, j } = CFP.parseTileKey(key);
              const { x, z } = CFP.tileWorldCenter(i, j);
              minX = Math.min(minX, x - h); maxX = Math.max(maxX, x + h);
              minZ = Math.min(minZ, z - h); maxZ = Math.max(maxZ, z + h);
            });
            return { minX: minX + DRAG_WALL_MARGIN, maxX: maxX - DRAG_WALL_MARGIN, minZ: minZ + DRAG_WALL_MARGIN, maxZ: maxZ - DRAG_WALL_MARGIN };
          }
        }
        return {
          minX: -RW / 2 + DRAG_WALL_MARGIN, maxX: RW / 2 - DRAG_WALL_MARGIN,
          minZ: -RD / 2 + DRAG_WALL_MARGIN, maxZ: RD / 2 - DRAG_WALL_MARGIN,
        };
      };

      const ndcFromClient = (clientX, clientY) => {
        const rect = canvas.getBoundingClientRect();
        return new THREE.Vector2(
          ((clientX - rect.left) / rect.width) * 2 - 1,
          -((clientY - rect.top) / rect.height) * 2 + 1
        );
      };

      /* Shared hit-test: furniture is hit-testable in every layout; custom
         walls/doors/ghost-tiles only exist when isCustom. Returns the
         resolved userData plus the intersection point, or null. */
      const hitTest = (clientX, clientY) => {
        raycaster.setFromCamera(ndcFromClient(clientX, clientY), cameraRef.current);
        const targets = Object.values(meshMapRef.current);
        if (isCustom && customGroupRef.current) targets.push(...customGroupRef.current.children);
        if (!targets.length) return null;
        const hits = raycaster.intersectObjects(targets, true);
        if (!hits.length) return null;
        let obj = hits[0].object;
        while (obj && !obj.userData?.kind) obj = obj.parent;
        if (!obj) return null;
        return { ...obj.userData, point: hits[0].point };
      };

      /* Advanced Edit's click target: raycast against only the object
         currently being edited (not the whole scene) and resolve to the
         nearest ancestor mesh carrying a userData.part tag. That's the
         individually-selectable component. Objects with no tagged parts
         (a plain chair, a table, most of the catalog) still get Advanced
         Edit; any hit on them resolves to the WHOLE_PART sentinel, which
         the component panel treats as "edit the whole object" using the
         same fields the standard popover already uses. Only a total miss
         (the click didn't land on the object at all) returns null. This
         also returns the 3D intersection point so onDown can grab the
         object at that exact spot for drag-to-move, same as Standard
         Mode. */
      const hitTestPart = (clientX, clientY) => {
        const obj = meshMapRef.current[advancedItemIdRef.current];
        if (!obj) return null;
        raycaster.setFromCamera(ndcFromClient(clientX, clientY), cameraRef.current);
        const hits = raycaster.intersectObject(obj, true);
        if (!hits.length) return null;
        let m = hits[0].object;
        while (m && m !== obj && !m.userData?.part) m = m.parent;
        return { part: m?.userData?.part || WHOLE_PART, point: hits[0].point };
      };

      /* Where the ray from the pointer meets the floor (y=0). Used while
         dragging a furniture object to follow the cursor. */
      const raycastGround = (clientX, clientY) => {
        raycaster.setFromCamera(ndcFromClient(clientX, clientY), cameraRef.current);
        const pt = new THREE.Vector3();
        const hit = raycaster.ray.intersectPlane(groundPlane, pt);
        if (!hit) return null;
        const b = getRoomBounds();
        return {
          x: Math.max(b.minX, Math.min(b.maxX, pt.x)),
          z: Math.max(b.minZ, Math.min(b.maxZ, pt.z)),
        };
      };

      const performRaycastClick = (clientX, clientY) => {
        if (advancedModeRef.current) {
          // Advanced Edit: clicks pick a component of the object already
          // being edited, not a whole new object. A miss just clears the
          // active component instead of exiting the mode; Done is the
          // only way out. (The hit-and-drag case is handled in onDown/onUp
          // instead. This only fires for a plain click-without-drag.)
          const hit = hitTestPart(clientX, clientY);
          setSelectedPart(hit ? hit.part : null);
          return;
        }
        const result = hitTest(clientX, clientY);
        if (!result) { setSelection(null); return; }
        const { kind, key, segment, id, point } = result;

        if (kind === "ghost") {
          setFloorTiles(prev => (prev.includes(key) ? prev : [...prev, key]));
          setSelection(null);
        } else if (kind === "floor") {
          // Removability is computed at click time (not inside the popover)
          // so the button's disabled/enabled state and tooltip are correct
          // immediately, without a stale read of floorTilesRef.
          const remaining = floorTilesRef.current.filter(k => k !== key);
          const canRemove = remaining.length > 0 && CFP.isConnected(remaining);
          setSelection({ kind: "floor", key, canRemove, screenX: clientX, screenY: clientY });
        } else if (kind === "wall") {
          const nearestEdgeKey = CFP.nearestEdgeInSegment(segment, point.x, point.z);
          const currentColor = wallStylesRef.current[segment.edgeKeys[0]] || "#ffffff";
          const doorData = doorsRef.current[nearestEdgeKey] || null;
          const windowData = windowsRef.current[nearestEdgeKey] || null;
          setSelection({ kind: "wall", segment, nearestEdgeKey, color: currentColor, doorData, windowData, uiMode: "default", screenX: clientX, screenY: clientY });
        } else if (kind === "furniture") {
          setSelection({ kind: "furniture", id, screenX: clientX, screenY: clientY });
        } else {
          setSelection(null);
        }
      };

      const onDown = e => {
        if (poseTweenRef.current) { e.preventDefault(); return; } // ignore input mid camera-transition
        downX = e.clientX; downY = e.clientY; moved = false;
        moveDrag = null;

        // Event Editing Mode: no orbit-drag/pan here at all. WASD+mouse-look
        // owns movement (see onMove/animate()), so a click is purely a
        // select action, resolved via performRaycastClick exactly like
        // every other mode (reusing its ghost/floor/wall/furniture
        // handling instead of re-implementing it). While pointer-locked
        // the cursor is hidden and reports no meaningful position, so the
        // click is resolved from screen center ("look at it and click")
        // instead of the (frozen) last cursor coordinates. Once the lock
        // has been released, by Esc or because a popover is already open,
        // there's a real free cursor again and clicks behave exactly like
        // Standard Mode, including clicking empty space to re-engage the
        // lock and resume walking.
        if (viewModeRef.current === "firstPerson" && !advancedModeRef.current) {
          if (e.button === 0) {
            if (pointerLockedRef.current) {
              const rect = canvas.getBoundingClientRect();
              performRaycastClick(rect.left + rect.width / 2, rect.top + rect.height / 2);
            } else if (hitTest(e.clientX, e.clientY)) {
              performRaycastClick(e.clientX, e.clientY);
            } else {
              requestPointerLockSafely();
            }
          }
          e.preventDefault();
          return;
        }

        if (e.button === 0) {
          if (advancedModeRef.current) {
            // Advanced Edit: grabbing the object being edited selects
            // whichever component was clicked right away (mirroring
            // Standard Mode's select-on-mousedown) and arms the same
            // drag-to-move used there, so the item can be repositioned
            // anywhere in the room without leaving Advanced Edit. If the
            // click landed off the object entirely, it still orbits the
            // camera instead, so the user can look around it.
            const hit = hitTestPart(e.clientX, e.clientY);
            if (hit) {
              setSelectedPart(hit.part);
              const mesh = meshMapRef.current[advancedItemIdRef.current];
              const originX = mesh ? mesh.position.x : hit.point.x;
              const originZ = mesh ? mesh.position.z : hit.point.z;
              moveDrag = {
                id: advancedItemIdRef.current,
                type: placedItemsRef.current.find(i => i.id === advancedItemIdRef.current)?.type,
                x: originX, z: originZ,
                offsetX: originX - hit.point.x,
                offsetZ: originZ - hit.point.z,
                lastPoint: { x: hit.point.x, z: hit.point.z },
              };
              drag = false; pan = false;
            } else {
              drag = true; pan = false;
            }
            prevX = e.clientX; prevY = e.clientY;
            e.preventDefault();
            return;
          }
          const result = hitTest(e.clientX, e.clientY);
          if (result?.kind === "furniture") {
            // Grab the object instead of orbiting the camera. Keep an offset
            // between the grab point and the object's origin so it doesn't
            // visually snap/re-center under the cursor the instant you drag.
            const mesh = meshMapRef.current[result.id];
            const originX = mesh ? mesh.position.x : result.point.x;
            const originZ = mesh ? mesh.position.z : result.point.z;
            moveDrag = {
              id: result.id,
              type: placedItemsRef.current.find(i => i.id === result.id)?.type,
              x: originX, z: originZ,
              offsetX: originX - result.point.x,
              offsetZ: originZ - result.point.z,
            };
            setSelection({ kind: "furniture", id: result.id, screenX: e.clientX, screenY: e.clientY });
            drag = false; pan = false;
          } else {
            drag = true; pan = false;
          }
        }
        if (e.button === 2) { pan = true; drag = false; moveDrag = null; }
        prevX = e.clientX; prevY = e.clientY;
        e.preventDefault();
      };
      const onMove = e => {
        if (poseTweenRef.current) return; // ignore input mid camera-transition

        // Event Editing Mode look: only meaningful while actually
        // pointer-locked (movementX/Y are the relevant fields then; the
        // absolute clientX/Y a locked pointer reports aren't a real cursor
        // position). This is suspended during Advanced Edit too, same as
        // the per-frame walking in animate() below, since that zoom uses
        // its own orbit-drag-style camera follow instead.
        if (viewModeRef.current === "firstPerson" && pointerLockedRef.current && !advancedModeRef.current) {
          const fp = fpStateRef.current;
          fp.yaw   -= e.movementX * FP_MOUSE_SENS;
          fp.pitch -= e.movementY * FP_MOUSE_SENS;
          fp.pitch = Math.max(FP_PITCH_MIN, Math.min(FP_PITCH_MAX, fp.pitch));
          return;
        }

        if (Math.hypot(e.clientX - downX, e.clientY - downY) > 4) moved = true;

        if (moveDrag) {
          const g = raycastGround(e.clientX, e.clientY);
          if (g) {
            let nx, nz;
            if (advancedModeRef.current && moveDrag.id === advancedItemIdRef.current) {
              // Damped: only a fraction of this move event's raw cursor
              // travel is applied, instead of snapping straight to the
              // raycast point. See ADVANCED_DRAG_SENSITIVITY above.
              const dx = g.x - moveDrag.lastPoint.x, dz = g.z - moveDrag.lastPoint.z;
              nx = moveDrag.x + dx * ADVANCED_DRAG_SENSITIVITY;
              nz = moveDrag.z + dz * ADVANCED_DRAG_SENSITIVITY;
              const b = getRoomBounds();
              nx = Math.max(b.minX, Math.min(b.maxX, nx));
              nz = Math.max(b.minZ, Math.min(b.maxZ, nz));
            } else {
              nx = g.x + moveDrag.offsetX;
              nz = g.z + moveDrag.offsetZ;
            }
            // Wall-mounted items (wall art) stay glued to whichever wall
            // is nearest the cursor instead of sliding freely across the
            // floor. This is re-snapped every move event, live, so the
            // drag preview already shows the correct flush position and
            // rotation.
            if (moveDrag.type && WALL_MOUNT_TYPES.has(moveDrag.type)) {
              const snap = computeWallSnap(nx, nz, {
                isCustom, floorTiles: floorTilesRef.current, doors: doorsRef.current, windows: windowsRef.current, RW, RD,
              });
              if (snap) { nx = snap.x; nz = snap.z; moveDrag.rotation = snap.rotation; }
            }
            moveDrag.lastPoint = { x: g.x, z: g.z };
            const mesh = meshMapRef.current[moveDrag.id]; // looked up fresh, to avoid a stale ref if the scene rebuilt mid-drag
            if (mesh) {
              mesh.position.x = nx; mesh.position.z = nz;
              if (moveDrag.rotation !== undefined) mesh.rotation.y = moveDrag.rotation;
            }
            moveDrag.x = nx; moveDrag.z = nz;
            // Advanced Edit keeps the camera tightly zoomed in on the
            // object. Without some kind of follow it'd drag itself
            // straight out of that tight frame within a step or two. Set
            // where the camera should end up here; animate() below eases
            // toward it a little every frame instead of snapping the
            // camera 1:1 with the cursor, which at this zoom level felt
            // like the whole view was whipping around.
            if (advancedModeRef.current && moveDrag.id === advancedItemIdRef.current) {
              dragFollowTarget = { x: nx, z: nz };
            }
          }
          return;
        }

        if (!drag && !pan) return;
        const dx = e.clientX - prevX, dy = e.clientY - prevY;
        prevX = e.clientX; prevY = e.clientY;
        if (drag) {
          orbitRef.current.theta -= dx * 0.008;
          orbitRef.current.phi = Math.max(0.05, Math.min(Math.PI/2 - 0.05, orbitRef.current.phi - dy * 0.008));
        }
        if (pan) { orbitRef.current.px -= dx * 0.02; orbitRef.current.pz -= dy * 0.02; }
        updateCamera();
      };
      const onUp = () => {
        if (moveDrag) {
          if (moved) {
            const { id, x, z, rotation } = moveDrag;
            // Cascade: anything parented to the moved item (a coffee-station
            // accessory, for example) travels with it by the same
            // world-space delta.
            setPlacedItems(prev => {
              const parent = prev.find(i => i.id === id);
              if (!parent) return prev;
              const dx = x - parent.position.x, dz = z - parent.position.z;
              return prev.map(i => {
                if (i.id === id) return { ...i, position: { ...i.position, x, z }, rotation: rotation !== undefined ? rotation : i.rotation };
                if (i.parentId === id) return { ...i, position: { ...i.position, x: i.position.x + dx, z: i.position.z + dz } };
                return i;
              });
            });
          }
          moveDrag = null;
          dragFollowTarget = null;
        } else if (drag && !moved) {
          performRaycastClick(downX, downY);
        }
        drag = false; pan = false;
      };
      const onWheel = e => {
        e.preventDefault();
        if (poseTweenRef.current) return; // ignore input mid camera-transition
        if (viewModeRef.current === "firstPerson") {
          // There's no "distance from target" concept in a free-look camera,
          // so the wheel does the closest first-person equivalent of zoom:
          // it narrows the field of view instead of dollying the camera
          // through walls.
          const cam = cameraRef.current;
          if (!cam) return;
          cam.fov = Math.max(FP_FOV_MIN, Math.min(FP_FOV_MAX, cam.fov + e.deltaY * 0.03));
          cam.updateProjectionMatrix();
          return;
        }
        orbitRef.current.radius = Math.max(3, Math.min(60, orbitRef.current.radius + e.deltaY * 0.03));
        updateCamera();
      };

      // Event Editing Mode: WASD/arrow state, polled once per frame in
      // animate() instead of acted on per keydown, for smoother diagonal
      // movement than reacting to individual key events. Escape closes
      // whatever's selected (if anything) instead of fully exiting the
      // mode. Pressing Esc while nothing is selected is already handled
      // for free by the browser's own pointer-lock release.
      const FP_KEY_MAP = {
        KeyW: "forward", ArrowUp: "forward",
        KeyS: "backward", ArrowDown: "backward",
        KeyA: "left", ArrowLeft: "left",
        KeyD: "right", ArrowRight: "right",
        ShiftLeft: "run", ShiftRight: "run",
      };
      const onKeyDown = e => {
        if (viewModeRef.current !== "firstPerson") return;
        if (e.code === "Escape" || e.key === "Escape") {
          if (selectionRef.current) setSelection(null);
          return;
        }
        const flag = FP_KEY_MAP[e.code];
        if (!flag) return;
        keysRef.current[flag] = true;
        e.preventDefault();
      };
      const onKeyUp = e => {
        const flag = FP_KEY_MAP[e.code];
        if (!flag) return;
        keysRef.current[flag] = false;
      };
      const onPointerLockChange = () => {
        pointerLockedRef.current = document.pointerLockElement === canvas;
      };

      canvas.addEventListener("mousedown", onDown);
      document.addEventListener("mousemove", onMove);
      document.addEventListener("mouseup", onUp);
      canvas.addEventListener("wheel", onWheel, { passive: false });
      canvas.addEventListener("contextmenu", e => e.preventDefault());
      document.addEventListener("keydown", onKeyDown);
      document.addEventListener("keyup", onKeyUp);
      document.addEventListener("pointerlockchange", onPointerLockChange);

      let animId;
      let lastFrameTime = performance.now();
      const animate = () => {
        animId = requestAnimationFrame(animate);
        const now = performance.now();
        // Clamped so a backgrounded/stalled tab resuming after several
        // seconds doesn't teleport the walker across the room in one frame.
        const dt = Math.min(0.1, (now - lastFrameTime) / 1000);
        lastFrameTime = now;

        const tw = cameraTweenRef.current;
        if (tw) {
          const t = Math.min(1, (performance.now() - tw.start) / tw.duration);
          const eased = t < 0.5 ? 2*t*t : 1 - Math.pow(-2*t + 2, 2) / 2; // easeInOutQuad
          orbitRef.current = {
            theta:  tw.from.theta  + (tw.to.theta  - tw.from.theta)  * eased,
            phi:    tw.from.phi    + (tw.to.phi    - tw.from.phi)    * eased,
            radius: tw.from.radius + (tw.to.radius - tw.from.radius) * eased,
            px:     tw.from.px     + (tw.to.px     - tw.from.px)     * eased,
            pz:     tw.from.pz     + (tw.to.pz     - tw.from.pz)     * eased,
          };
          updateCamera();
          if (t >= 1) cameraTweenRef.current = null;
        }
        // Advanced Edit's camera-follow-while-dragging, eased instead of
        // snapped 1:1 to the cursor. At this zoom level a direct 1:1
        // follow made the whole view whip around on every small mouse
        // movement. It converges within a handful of frames (about 0.1s),
        // not noticeable as lag but no longer feels like it's racing to
        // keep up.
        if (dragFollowTarget) {
          const o = orbitRef.current;
          o.px += (dragFollowTarget.x - o.px) * 0.15;
          o.pz += (dragFollowTarget.z - o.pz) * 0.15;
          updateCamera();
        }

        // Event Editing Mode.
        // A raw position+quaternion tween (entering/exiting First Person,
        // or bridging to/from Advanced Edit) takes full control of the
        // camera while active; per-frame walking only resumes once it's
        // done, using whatever fpStateRef it left behind (see
        // beginPoseTween's onComplete callers).
        const pt = poseTweenRef.current;
        if (pt) {
          const t = Math.min(1, (now - pt.start) / pt.duration);
          const eased = t < 0.5 ? 2*t*t : 1 - Math.pow(-2*t + 2, 2) / 2; // easeInOutQuad
          camera.position.lerpVectors(pt.fromPos, pt.toPos, eased);
          camera.quaternion.copy(pt.fromQuat).slerp(pt.toQuat, eased);
          if (t >= 1) {
            poseTweenRef.current = null;
            pt.onComplete?.();
          }
        } else if (viewModeRef.current === "firstPerson" && !advancedModeRef.current) {
          // Movement only happens while actively locked with nothing
          // selected (paused otherwise, per the design brief), but the
          // camera is still written from fpStateRef every single frame
          // regardless, so it holds perfectly still while paused instead
          // of drifting or snapping anywhere.
          const fp = fpStateRef.current;
          if (pointerLockedRef.current && !selectionRef.current) {
            const forward = { x: -Math.sin(fp.yaw), z: -Math.cos(fp.yaw) };
            const right   = { x:  Math.cos(fp.yaw), z: -Math.sin(fp.yaw) };
            const k = keysRef.current;
            let mx = 0, mz = 0;
            if (k.forward)  { mx += forward.x; mz += forward.z; }
            if (k.backward) { mx -= forward.x; mz -= forward.z; }
            if (k.right)    { mx += right.x;   mz += right.z; }
            if (k.left)     { mx -= right.x;   mz -= right.z; }
            const len = Math.hypot(mx, mz);
            if (len > 0.0001) {
              const speed = k.run ? FP_RUN_SPEED : FP_WALK_SPEED;
              const b = getRoomBounds();
              fp.x = Math.max(b.minX, Math.min(b.maxX, fp.x + (mx / len) * speed * dt));
              fp.z = Math.max(b.minZ, Math.min(b.maxZ, fp.z + (mz / len) * speed * dt));
            }
          }
          camera.position.set(fp.x, EYE_HEIGHT, fp.z);
          camera.quaternion.setFromEuler(new THREE.Euler(fp.pitch, fp.yaw, 0, "YXZ"));
        }

        renderer.render(scene, camera);
      };
      animate();

      const onResize = () => {
        const w = mount.clientWidth || 900, h = mount.clientHeight || 550;
        camera.aspect = w/h; camera.updateProjectionMatrix(); renderer.setSize(w, h);
      };
      window.addEventListener("resize", onResize);

      mount._cleanup = () => {
        cancelAnimationFrame(animId);
        window.removeEventListener("resize", onResize);
        canvas.removeEventListener("mousedown", onDown);
        document.removeEventListener("mousemove", onMove);
        document.removeEventListener("mouseup", onUp);
        canvas.removeEventListener("wheel", onWheel);
        document.removeEventListener("keydown", onKeyDown);
        document.removeEventListener("keyup", onKeyUp);
        document.removeEventListener("pointerlockchange", onPointerLockChange);
        if (document.pointerLockElement === canvas) { try { document.exitPointerLock(); } catch (e) {} }
        if (mount.contains(renderer.domElement)) mount.removeChild(renderer.domElement);
        renderer.dispose();
      };
    }, 120);

    return () => {
      clearTimeout(timer);
      const mount = mountRef.current;
      if (mount && mount._cleanup) mount._cleanup();
    };
  }, []);

  /* Rebuild the tile floor plan whenever it changes */
  useEffect(() => {
    const group = customGroupRef.current;
    if (!group) return;
    clearGroup(group);
    const selectedSegmentId = selection?.kind === "wall" ? selection.segment.id : null;
    const selectedTileKey = selection?.kind === "floor" ? selection.key : null;
    if (isCustom) buildFloorPlanGeometry(group, new Set(floorTiles), wallStyles, doors, windows, RH, floorColor, selectedSegmentId, floorTexture, selectedTileKey);
  }, [floorTiles, wallStyles, doors, windows, floorColor, selection, floorTexture]);

  /* Keep the object popover fully on-screen.
     It's normally anchored above the click point (translate(-50%,-110%)),
     but a tall popover (a booth with Package/Dimensions/Branding sections)
     or a click near the top of the viewport can push its top edge above
     y=0, clipping the upper controls entirely. That's exactly what was
     reported. This runs after every render: reset to the natural CSS
     position, measure it, then nudge it back within a margin if any edge
     is out of bounds. It's imperative (not React state) so there's no
     measure->setState->re-measure feedback loop to worry about. */
  useLayoutEffect(() => {
    const el = popoverRef.current;
    if (!el || !selection) return;

    // A new object/wall was selected: drop any manual drag position from
    // whatever was previously selected and go back to auto-placement.
    const selId = selection.kind === "wall" ? selection.nearestEdgeKey
      : selection.kind === "floor" ? selection.key
      : selection.id;
    if (popoverSelIdRef.current !== selId) {
      popoverSelIdRef.current = selId;
      popoverDragOffsetRef.current = null;
    }

    // If the user has manually dragged this popover, respect that exact
    // position: no auto side-picking, no viewport clamping.
    if (popoverDragOffsetRef.current) {
      const { x, y } = popoverDragOffsetRef.current;
      el.style.transform = `translate(${x}px, ${y}px)`;
      return;
    }

    const margin = 10;
    const gap = 18; // clearance from the click point, so the popover sits
                    // beside the object instead of covering it
    // Prefer the right side, vertically centered on the click point.
    el.style.transform = `translate(${gap}px, -50%)`;
    let rect = el.getBoundingClientRect();
    let side = "right";
    // Flip to the left side if the popover would run off the right edge.
    if (rect.right > window.innerWidth - margin) {
      side = "left";
      el.style.transform = `translate(calc(-100% - ${gap}px), -50%)`;
      rect = el.getBoundingClientRect();
    }
    // Clamp vertically within the viewport without changing which side
    // (left/right) was picked above.
    let dy = 0;
    if (rect.top < margin) dy = margin - rect.top;
    else if (rect.bottom > window.innerHeight - margin) dy = (window.innerHeight - margin) - rect.bottom;
    if (dy) {
      const xExpr = side === "right" ? `${gap}px` : `calc(-100% - ${gap}px)`;
      el.style.transform = `translate(${xExpr}, calc(-50% + ${dy}px))`;
    }
  });

  /* Drag-to-reposition the settings popover: grab the handle and drop
     it anywhere on screen. Position is stored as a pixel offset from the
     selection's screen anchor (not raw page coords), so it survives
     re-renders without fighting the effect above. */
  const handlePopoverDragStart = (e) => {
    const el = popoverRef.current;
    if (!el || !selection) return;
    e.preventDefault();
    const rect = el.getBoundingClientRect();
    popoverDragStateRef.current = {
      startMouseX: e.clientX,
      startMouseY: e.clientY,
      startOffsetX: rect.left - selection.screenX,
      startOffsetY: rect.top - selection.screenY,
    };
    const onMove = (ev) => {
      const s = popoverDragStateRef.current;
      if (!s) return;
      const x = s.startOffsetX + (ev.clientX - s.startMouseX);
      const y = s.startOffsetY + (ev.clientY - s.startMouseY);
      popoverDragOffsetRef.current = { x, y };
      if (popoverRef.current) popoverRef.current.style.transform = `translate(${x}px, ${y}px)`;
    };
    const onUp = () => {
      popoverDragStateRef.current = null;
      window.removeEventListener("mousemove", onMove);
      window.removeEventListener("mouseup", onUp);
    };
    window.addEventListener("mousemove", onMove);
    window.addEventListener("mouseup", onUp);
  };

  /* Close the object popover on any click outside it, or on Escape */
  useEffect(() => {
    if (!selection) return;
    const onDocClick = (e) => {
      if (e.target.closest?.(".dw-object-popover, .dw-advanced-banner, .dw-part-panel")) return;
      // Clicks inside the 3D viewport are already handled by the canvas's
      // own mousedown/mouseup logic (select-on-down, deselect-on-empty-click
      // in performRaycastClick). Without this guard, this document-level
      // listener fires *after* onDown on every click once something is
      // already selected, and immediately nulls out the selection it just
      // set. That breaks re-selecting a new object and loses the popover
      // right after a drag-to-move.
      if (mountRef.current && mountRef.current.contains(e.target)) return;
      setSelection(null);
    };
    const onKey = (e) => { if (e.key === "Escape") setSelection(null); };
    document.addEventListener("mousedown", onDocClick);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", onDocClick);
      document.removeEventListener("keydown", onKey);
    };
  }, [selection]);

  /* Sync placed items to scene.
     This rebuilds every item's mesh from scratch on every pass: fresh
     geometry, a freshly cloned material for the selection glow, a fresh
     branding texture. This effect re-runs on nearly every Advanced Edit
     interaction (color pick, part click, nudge), not just when an item is
     added, so the previous batch has to be disposed here. Otherwise it
     leaks a little more GPU memory every single time, eventually crashing
     the tab. This is what was actually behind "crashes after a few adds":
     the crash point was never really about which item was selected, it
     was just whichever rebuild finally exhausted the leak. */
  useEffect(() => {
    const scene = sceneRef.current;
    if (!scene) return;
    Object.values(meshMapRef.current).forEach(m => { scene.remove(m); disposeObject3D(m); });
    meshMapRef.current = {};
    placedItems.forEach(item => {
      // Building/materializing one item is wrapped per-item instead of
      // trusting every geometry builder in this ever-growing catalog to
      // never throw. Before this, one bad build (a stray typo in a new
      // catalog family, a part lookup that assumes a mesh that isn't there
      // for a particular variant, etc.) would throw partway through this
      // forEach and abort the whole effect: every item after the bad one
      // never got added to the scene or meshMapRef this pass, which reads
      // to the user as the app "crashing" the moment they add one more
      // item on top of whatever was already broken. Now a single bad item
      // falls back to a visible placeholder and logs to the console, but
      // every other placed item still renders normally.
      try {
        const obj = build3DObject(item.type, item.variant);
        obj.position.set(item.position.x, item.position.y || 0, item.position.z);
        obj.rotation.y = item.rotation || 0;
        if (item.dimensions) {
          const s = item.scale || 1;
          obj.scale.set(s * item.dimensions.width, s * item.dimensions.height, s * item.dimensions.depth);
        } else {
          obj.scale.setScalar(item.scale || 1);
        }
        obj.userData = { kind: "furniture", id: item.id };
        applyItemMaterial(obj, item);
        applyPartTransforms(obj, item);
        if (BRANDABLE_TYPES.has(item.type)) {
          const panel = buildBrandingPanel(item.branding, item.type, item.variant);
          if (panel) {
            // Counter-scale against the parent's non-uniform dimensions
            // (only booths currently have per-axis dimensions) so resizing
            // doesn't stretch the painted-on text.
            const d = item.dimensions || { width: 1, height: 1, depth: 1 };
            panel.scale.set(1 / (d.width || 1), 1 / (d.height || 1), 1 / (d.depth || 1));
            obj.add(panel);
          }
        }
        if (selection?.kind === "furniture" && selection.id === item.id) {
          if (advancedMode) {
            // In Advanced Edit, glow only the exact tagged component that's
            // selected. Otherwise use a faint whole-object glow, just enough
            // to confirm which object is being edited without hiding the
            // seams between parts the user is meant to pick between.
            obj.traverse(c => {
              if (!c.isMesh) return;
              c.material = c.material.clone();
              // WHOLE_PART selected means "the whole object is the
              // component": light up every mesh, not just tagged ones.
              const isSelectedPart = selectedPart === WHOLE_PART || (selectedPart && c.userData?.part === selectedPart);
              c.material.emissive = new THREE.Color(0x7c3aed);
              c.material.emissiveIntensity = isSelectedPart ? 0.45 : 0.06;
            });
          } else {
            obj.traverse(c => {
              if (c.isMesh) {
                c.material = c.material.clone();
                c.material.emissive = new THREE.Color(0x7c3aed);
                c.material.emissiveIntensity = 0.25;
              }
            });
          }
        }
        scene.add(obj);
        meshMapRef.current[item.id] = obj;
      } catch (err) {
        console.error(`Failed to build placed item "${item.type}"/"${item.variant}" (id ${item.id}):`, err);
        const fallback = new THREE.Mesh(new THREE.BoxGeometry(0.5, 0.5, 0.5), new THREE.MeshStandardMaterial({ color: 0xef4444 }));
        fallback.position.set(item.position.x, (item.position.y || 0) + 0.25, item.position.z);
        fallback.userData = { kind: "furniture", id: item.id };
        scene.add(fallback);
        meshMapRef.current[item.id] = fallback;
      }
    });
  }, [placedItems, selection, advancedMode, selectedPart]);

  /* Drop handler.
     Every placed item uses the unified object shape shared across
     furniture, equipment, decoration, catering and lighting (see
     docs/customization-system-design.md). Structural elements (walls,
     doors, windows) still come from the tile floor plan, not this list. */
  const handleDrop = e => {
    e.preventDefault();
    const catalogId = e.dataTransfer.getData("elementId");
    if (!catalogId) return;
    // Dropping a new item while deep in Advanced Edit on a different object
    // used to leave a broken in-between render: advancedMode was still
    // true (so the component panel/banner kept rendering) while selection
    // and selectedPart suddenly pointed at the just-added item instead of
    // whatever was actually being edited. That's a mismatch the panel
    // below isn't built to survive. So we exit cleanly first, in this same
    // handler, so React batches the exit and the new selection into one
    // consistent update instead of a transient bad one.
    if (advancedMode) handleExitAdvancedMode();
    const catalogEntry = ELEMENTS.find(el => el.id === catalogId);
    const rect = mountRef.current.getBoundingClientRect();
    const nx = (e.clientX - rect.left) / rect.width;
    const ny = (e.clientY - rect.top)  / rect.height;
    const x = (nx - 0.5) * RW * 0.8;
    const z = (ny - 0.5) * RD * 0.8;
    const type = catalogEntry?.type || catalogId;

    // Auto-attach to the nearest coffee booth if the drop lands within its
    // footprint. This is what makes an item "belong" to a station, with no
    // separate attach UI required. Floral swags/garlands get the same
    // treatment against a much broader set of hosts (DECOR_ATTACH_TYPES:
    // any arch, backdrop, pedestal, or table-style piece), since "attach
    // to any decorated element" is the whole point of that catalog family.
    // Everything else keeps the original coffee-corner-only behavior
    // unchanged.
    let parentId = null, bestDist = Infinity;
    if (FLORAL_SWAG_TYPES.has(type)) {
      placedItems.forEach(p => {
        if (!DECOR_ATTACH_TYPES.has(p.type)) return;
        const dist = Math.hypot(p.position.x - x, p.position.z - z);
        if (dist <= DECOR_ATTACH_RADIUS && dist < bestDist) { bestDist = dist; parentId = p.id; }
      });
    } else if (type !== "coffee-booth") { // a booth is itself a station, never someone else's child
      placedItems.forEach(p => {
        if (p.type !== "coffee-booth") return;
        const dist = Math.hypot(p.position.x - x, p.position.z - z);
        if (dist <= STATION_ATTACH_RADIUS && dist < bestDist) { bestDist = dist; parentId = p.id; }
      });
    }
    const y = (parentId && COUNTER_TOP_TYPES.has(type)) ? STATION_COUNTER_Y : 0;

    // Wall-mounted catalog items (wall art / paintings) always land flush
    // against the nearest wall at a fixed hang height, facing into the
    // room, never wherever they happened to be dropped on the floor.
    let finalX = x, finalY = y, finalZ = z, finalRotation = 0;
    if (WALL_MOUNT_TYPES.has(type)) {
      const snap = computeWallSnap(x, z, { isCustom, floorTiles, doors, windows, RW, RD });
      if (snap) { finalX = snap.x; finalZ = snap.z; finalRotation = snap.rotation; finalY = WALL_ART_HANG_Y; }
    }

    const item = {
      id: Date.now(),
      category: catalogEntry?.category || "furniture",
      type,
      variant: catalogEntry?.variant || "default",
      position: { x: finalX, y: finalY, z: finalZ },
      rotation: finalRotation,
      scale: 1,
      color: null,             // null = keep the object's built-in per-part palette until customized
      material: DEFAULT_MATERIAL,
      parentId,                // set when dropped near a station (docs/coffee-corner-design.md)
      // Booths get independent width/height/depth instead of relying on
      // the generic uniform Scale control every other object uses.
      dimensions: (catalogEntry?.type === "coffee-booth") ? { width: 1, height: 1, depth: 1 } : null,
      // Text painted onto the station's front face (docs/coffee-corner-design.md
      // §5). Empty text means no panel is rendered at all. Any station-style
      // item can be branded, not just coffee booths.
      branding: BRANDABLE_TYPES.has(type)
        ? { text: "", font: DEFAULT_BRANDING_FONT, fontSize: 48, color: "#1a0a3d", offsetX: 0 }
        : null,
      // Per-part colors for multi-piece stations (docs follow-up on the
      // market-stall reference sheet). Starts as {} so individual parts
      // can be recolored independently of the item's single overall color.
      partColors: PART_LABELS[type] ? {} : null,
      // Advanced Edit Phase 3: per-part material override and per-part
      // position/rotation/scale offset, keyed the same way as partColors.
      // Both stay {} until a specific part is adjusted. Untouched parts
      // keep using the item's whole-object material and their built-in
      // default layout from build3DObject.
      partMaterials: PART_LABELS[type] ? {} : null,
      partTransforms: PART_LABELS[type] ? {} : null,
    };
    setPlacedItems(prev => [...prev, item]);
    setSelection({ kind: "furniture", id: item.id, screenX: e.clientX, screenY: e.clientY });
    setRecentIds(prev => [catalogId, ...prev.filter(id => id !== catalogId)].slice(0, 8));
  };

  const ROTATE_STEP = Math.PI / 4;

  const handleRotate = () => {
    if (selection?.kind !== "furniture") return;
    const id = selection.id;
    setPlacedItems(prev => {
      const parent = prev.find(i => i.id === id);
      if (!parent) return prev;
      return prev.map(i => {
        if (i.id === id) return { ...i, rotation: (i.rotation||0) + ROTATE_STEP };
        if (i.parentId === id) {
          // Swing the child's position around the parent's origin by the
          // same angle, using THREE's own rotation math so the direction
          // always matches what rotation.y actually does on screen.
          const offset = new THREE.Vector3(i.position.x - parent.position.x, 0, i.position.z - parent.position.z);
          offset.applyAxisAngle(new THREE.Vector3(0, 1, 0), ROTATE_STEP);
          return {
            ...i,
            position: { ...i.position, x: parent.position.x + offset.x, z: parent.position.z + offset.z },
            rotation: (i.rotation||0) + ROTATE_STEP,
          };
        }
        return i;
      });
    });
  };

  const handleDelete = () => {
    if (selection?.kind !== "furniture") return;
    const id = selection.id;
    // Cascade: a station's accessories go with it instead of being left
    // behind as orphaned items nobody can find in the sidebar again.
    setPlacedItems(prev => prev.filter(i => i.id !== id && i.parentId !== id));
    setSelection(null);
  };

  const handleScale = (delta) => {
    if (selection?.kind !== "furniture") return;
    const id = selection.id;
    setPlacedItems(prev => prev.map(i => {
      if (i.id !== id) return i;
      const next = Math.round(((i.scale || 1) + delta) * 100) / 100;
      return { ...i, scale: Math.max(SCALE_MIN, Math.min(SCALE_MAX, next)) };
    }));
  };

  const DIM_MIN = 0.6, DIM_MAX = 1.8, DIM_STEP = 0.1;

  const handleSetDimension = (axis, delta) => {
    if (selection?.kind !== "furniture") return;
    const id = selection.id;
    setPlacedItems(prev => prev.map(i => {
      if (i.id !== id || !i.dimensions) return i;
      const next = Math.round(((i.dimensions[axis] || 1) + delta) * 100) / 100;
      return { ...i, dimensions: { ...i.dimensions, [axis]: Math.max(DIM_MIN, Math.min(DIM_MAX, next)) } };
    }));
  };

  const handleDuplicate = () => {
    if (selection?.kind !== "furniture") return;
    const original = placedItems.find(i => i.id === selection.id);
    if (!original) return;
    const OFFSET = 0.6;
    const newId = Date.now();
    let dupPosition = { ...original.position, x: original.position.x + OFFSET, z: original.position.z + OFFSET };
    let dupRotation = original.rotation;
    // Wall-mounted items duplicate along their wall, not off into open
    // floor. Re-snap the offset point back to the nearest wall.
    if (WALL_MOUNT_TYPES.has(original.type)) {
      const snap = computeWallSnap(dupPosition.x, dupPosition.z, { isCustom, floorTiles, doors, windows, RW, RD });
      if (snap) { dupPosition = { ...dupPosition, x: snap.x, z: snap.z }; dupRotation = snap.rotation; }
    }
    const copy = {
      ...original,
      id: newId,
      position: dupPosition,
      rotation: dupRotation,
    };
    // Cascade: a duplicated station brings its accessories with it,
    // re-parented to the new copy and offset the same way.
    const children = placedItems.filter(i => i.parentId === original.id);
    const childCopies = children.map((c, idx) => ({
      ...c,
      id: newId + idx + 1,
      parentId: newId,
      position: { ...c.position, x: c.position.x + OFFSET, z: c.position.z + OFFSET },
    }));
    setPlacedItems(prev => [...prev, copy, ...childCopies]);
    setSelection(s => ({ ...s, id: copy.id }));
  };

  /* Advanced Edit Mode, Phase 1: entry/exit + camera zoom.
     This keeps the user's current viewing angle (theta/phi) and only
     tweens px/pz/radius so the camera visibly "zooms into" the selected
     object instead of cutting to a new angle.

     Bridged with Event Editing Mode: Advanced Edit itself always ends up
     driven by orbitRef/updateCamera regardless of which mode it was
     entered from. That's the existing, tested zoom-and-edit machinery,
     and it doesn't need to change. The only First-Person-aware part is at
     the two doorways. Entering from First Person tweens the raw camera
     pose (via beginPoseTween, which reads wherever the camera actually is
     right now) into the same orbit-derived target the Overview path uses,
     then hands control to orbitRef once it arrives. Exiting back into
     First Person does the mirror image: tween from the current
     (orbit-driven) pose back to the exact eye position and angle that was
     saved on the way in, then resume WASD/mouse-look from there. */
  const handleEnterAdvancedMode = () => {
    if (selection?.kind !== "furniture") return;
    const item = placedItems.find(i => i.id === selection.id);
    if (!item) return;
    setSelectedPart(null);
    advancedItemIdRef.current = item.id;
    if (viewModeRef.current === "firstPerson") {
      preAdvancedViewModeRef.current = "firstPerson";
      preAdvancedFpStateRef.current = { ...fpStateRef.current };
      exitPointerLockSafely();
      const targetOrbit = { ...orbitRef.current, px: item.position.x, pz: item.position.z, radius: 2.6 };
      const { pos, quat } = orbitPoseFor(targetOrbit);
      beginPoseTween(pos, quat, 750, () => {
        orbitRef.current = targetOrbit;
        updateCamera();
      });
    } else {
      preAdvancedViewModeRef.current = "overview";
      preAdvancedOrbitRef.current = { ...orbitRef.current };
      animateCameraTo({ px: item.position.x, pz: item.position.z, radius: 2.6 }, 750);
    }
    setAdvancedMode(true);
  };

  const handleExitAdvancedMode = () => {
    advancedItemIdRef.current = null;
    setSelectedPart(null);
    setAdvancedMode(false);
    if (preAdvancedViewModeRef.current === "firstPerson") {
      const savedFp = preAdvancedFpStateRef.current || { x: 0, z: 0, yaw: 0, pitch: -0.12 };
      preAdvancedFpStateRef.current = null;
      preAdvancedViewModeRef.current = "overview";
      const { pos, quat } = fpPoseFor(savedFp);
      beginPoseTween(pos, quat, 700, () => {
        fpStateRef.current = { ...savedFp };
        // Exiting Advanced Edit leaves the object selected (same as the
        // Overview path: the standard popover reappears), which needs a
        // free cursor. Only re-lock here if nothing ended up selected;
        // otherwise the reactive effect above owns the lock from here.
        if (!selectionRef.current) requestPointerLockSafely();
      });
      // viewMode stayed "firstPerson" the entire time we were in Advanced
      // Edit (see handleEnterAdvancedMode), so there's nothing to flip
      // back here.
    } else if (preAdvancedOrbitRef.current) {
      animateCameraTo(preAdvancedOrbitRef.current, 700);
      preAdvancedOrbitRef.current = null;
    }
  };

  // Leaving the object being edited, by deselecting or selecting something
  // else entirely, should back the camera out too, instead of stranding
  // it zoomed in on whatever used to be there.
  useEffect(() => {
    if (advancedMode && (selection?.kind !== "furniture" || selection.id !== advancedItemIdRef.current)) {
      handleExitAdvancedMode();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selection]);

  /* While walking around in Event Editing Mode, selecting anything releases
     pointer lock so a real, free-moving cursor appears for the popover.
     Its buttons, swatches, and drag-handle need one, since pointer lock
     only reports movement deltas, not a position, so it can't drive
     normal UI at all. Deselecting (Close, Esc, or clicking elsewhere)
     re-engages the lock and resumes walking, matching "movement pauses on
     selection, returns immediately to navigation on deselect" from the
     design brief. This is skipped entirely while Advanced Edit is active,
     since that transition manages the lock itself (see
     handleEnterAdvancedMode/handleExitAdvancedMode). */
  useEffect(() => {
    if (viewMode !== "firstPerson" || advancedMode) return;
    if (selection) exitPointerLockSafely();
    else requestPointerLockSafely();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selection, viewMode, advancedMode]);

  const handleSetColor = (color) => {
    if (selection?.kind !== "furniture") return;
    const id = selection.id;
    setPlacedItems(prev => prev.map(i => i.id === id ? { ...i, color } : i));
  };

  const handleSetPartColor = (part, color) => {
    if (selection?.kind !== "furniture") return;
    const id = selection.id;
    setPlacedItems(prev => prev.map(i => i.id === id && i.partColors ? { ...i, partColors: { ...i.partColors, [part]: color } } : i));
  };

  /* Advanced Edit Phase 3: per-component material + position/rotation/size */
  const handleSetPartMaterial = (part, material) => {
    if (selection?.kind !== "furniture") return;
    const id = selection.id;
    setPlacedItems(prev => prev.map(i => i.id === id && i.partMaterials ? { ...i, partMaterials: { ...i.partMaterials, [part]: material } } : i));
  };

  const DEFAULT_PART_TRANSFORM = { position: { x: 0, y: 0, z: 0 }, rotation: 0, scale: 1 };

  const handleAdjustPartTransform = (part, field, delta) => {
    if (selection?.kind !== "furniture") return;
    const id = selection.id;
    setPlacedItems(prev => prev.map(i => {
      if (i.id !== id || !i.partTransforms) return i;
      const current = i.partTransforms[part] || DEFAULT_PART_TRANSFORM;
      const next = { ...current, position: { ...current.position } };
      if (field === "posX") next.position.x = Math.max(PART_POS_MIN, Math.min(PART_POS_MAX, current.position.x + delta));
      else if (field === "posY") next.position.y = Math.max(PART_POS_MIN, Math.min(PART_POS_MAX, current.position.y + delta));
      else if (field === "posZ") next.position.z = Math.max(PART_POS_MIN, Math.min(PART_POS_MAX, current.position.z + delta));
      else if (field === "rotation") next.rotation = current.rotation + delta;
      else if (field === "scale") next.scale = Math.max(PART_SCALE_MIN, Math.min(PART_SCALE_MAX, current.scale + delta));
      return { ...i, partTransforms: { ...i.partTransforms, [part]: next } };
    }));
  };

  const handleResetPartTransform = (part) => {
    if (selection?.kind !== "furniture") return;
    const id = selection.id;
    setPlacedItems(prev => prev.map(i => {
      if (i.id !== id || !i.partTransforms) return i;
      const next = { ...i.partTransforms };
      delete next[part];
      return { ...i, partTransforms: next };
    }));
  };

  // Fine position/rotation nudges for the WHOLE_PART case (an object with
  // no tagged sub-parts, selected as "the whole thing" in Advanced Edit).
  // Same interaction as the per-part nudges above, but writing straight to
  // the item's own position/rotation fields instead of partTransforms.
  const handleAdjustWholePosition = (axis, delta) => {
    if (selection?.kind !== "furniture") return;
    const id = selection.id;
    setPlacedItems(prev => prev.map(i => i.id === id ? { ...i, position: { ...i.position, [axis]: (i.position[axis] || 0) + delta } } : i));
  };

  const handleAdjustWholeRotation = (delta) => {
    if (selection?.kind !== "furniture") return;
    const id = selection.id;
    setPlacedItems(prev => prev.map(i => i.id === id ? { ...i, rotation: (i.rotation || 0) + delta } : i));
  };

  const handleSetMaterial = (material) => {
    if (selection?.kind !== "furniture") return;
    const id = selection.id;
    setPlacedItems(prev => prev.map(i => i.id === id ? { ...i, material } : i));
  };

  const handleSetBranding = (field, value) => {
    if (selection?.kind !== "furniture") return;
    const id = selection.id;
    setPlacedItems(prev => prev.map(i => i.id === id && i.branding ? { ...i, branding: { ...i.branding, [field]: value } } : i));
  };

  const handleClearAll = () => { setPlacedItems([]); setSelection(null); };

  /* Removing a tile shrinks the footprint, which deletes whatever wall/door
     stood on its outer edges (they're auto-derived from tile occupancy;
     see customFloorPlan.js). The "redo" side of that is already free: the
     removed cell immediately reappears as a clickable ghost tile, so adding
     it back is the same single click used to grow the floor in the first
     place. Any door/wall-color entries keyed to that tile's edges are left
     in place instead of pruned. They simply stop being read once the edge
     no longer appears in computeBoundaryEdges, and spring back correctly
     if the tile (and thus that exact edge) is re-added later. */
  const handleRemoveTile = () => {
    if (selection?.kind !== "floor" || !selection.canRemove) return;
    setFloorTiles(prev => prev.filter(k => k !== selection.key));
    setSelection(null);
  };

  /* Recently Used / Favorites (docs/customization-system-design.md §4).
     Recently used is per-session scratch (sessionStorage, like the rest of
     the workspace's transient state). Favorites are a lasting preference,
     so they live in localStorage instead and survive across sessions. */
  useEffect(() => { writeJSON("eventify_recent_items", recentIds); }, [recentIds]);
  useEffect(() => {
    try { localStorage.setItem("eventify_favorite_items", JSON.stringify(favoriteIds)); } catch (e) {}
  }, [favoriteIds]);

  const toggleFavorite = (id) => {
    setFavoriteIds(prev => prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]);
  };

  /* Save layout to backend */
  const saveStatusTimerRef = useRef(null);
  useEffect(() => () => { if (saveStatusTimerRef.current) clearTimeout(saveStatusTimerRef.current); }, []);

  const handleSave = async () => {
    const token = localStorage.getItem("token");
    if (!token) {
      navigate("/login", { state: { from: "/workspace" } });
      return;
    }

    setSaveStatus("saving");
    setSaveMessage("");

    const payload = {
      event_name: eventName,
      guests,
      workspace_type: workspaceType,
      layout_type: layoutId,
      width: RW,
      length: RD,
      height: RH,
      wall_color: wallColor,
      floor_color: floorColor,
      wall_texture: wallTexture,
      floor_texture: floorTexture,
      lighting,
      placed_items: placedItems,
      custom_geometry: isCustom
        ? { floorTiles, wallStyles, doors, windows }
        : null,
    };

    try {
      const isUpdate = Boolean(simulationId);
      const url = isUpdate ? `/api/simulation/${simulationId}` : "/api/simulation";
      const response = await fetch(url, {
        method: isUpdate ? "PUT" : "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(payload),
      });

      const data = await response.json();

      if (!response.ok) {
        setSaveStatus("error");
        setSaveMessage(data.message || "Save failed");
        return;
      }

      if (data.simulation_id) {
        setSimulationId(data.simulation_id);
        try { sessionStorage.setItem("eventify_sim_id", String(data.simulation_id)); } catch (e) {}
      }
      setSaveStatus("success");
      setSaveMessage(isUpdate ? "Layout updated" : "Layout saved");
    } catch (err) {
      setSaveStatus("error");
      setSaveMessage("Something went wrong. Please try again.");
    } finally {
      if (saveStatusTimerRef.current) clearTimeout(saveStatusTimerRef.current);
      saveStatusTimerRef.current = setTimeout(() => setSaveStatus("idle"), 3000);
    }
  };

  const categoryElements = activeCategory === "Favorites"
    ? ELEMENTS.filter(e => favoriteIds.includes(e.id))
    : activeCategory === "All"
      ? ELEMENTS
      : ELEMENTS.filter(e => e.category === activeCategory);

  const searchedElements = searchTerm.trim()
    ? categoryElements.filter(e => e.label.toLowerCase().includes(searchTerm.trim().toLowerCase()))
    : categoryElements;

  // Context-aware ranking: relevant items float up, nothing is hidden.
  // A stable sort keeps ties in their original catalog order.
  const priorityList = EVENT_TYPE_PRIORITY[eventType] || [];
  const priorityRank = new Map(priorityList.map((id, i) => [id, i]));
  const recommendedIds = new Set(priorityList.slice(0, RECOMMENDED_COUNT));
  const filteredElements = priorityList.length
    ? searchedElements
        .map((el, i) => ({ el, i, rank: priorityRank.has(el.id) ? priorityRank.get(el.id) : Infinity }))
        .sort((a, b) => (a.rank - b.rank) || (a.i - b.i))
        .map(({ el }) => el)
    : searchedElements;

  const recentElements = searchTerm.trim() ? [] : recentIds.map(id => ELEMENTS.find(e => e.id === id)).filter(Boolean);

  const roomArea = isCustom ? floorTiles.length * CFP.TILE_SIZE * CFP.TILE_SIZE : RW * RD;
  const capacity = getCapacityForArea(roomArea, guests);

  const wallTextures = ["Plain","Subtle","Brick","Marble"];
  const floorTextures = ["Plain","Wood","Tile"];

  return (
    <div className="dw-page">
      <Navbar />

      {isCustom && showHint && (
        <div className="dw-floorplan-hint">
          <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="#7c3aed" strokeWidth="2"><circle cx="12" cy="12" r="10"/><path d="M12 16v-4M12 8h.01"/></svg>
          <span>Click a faint purple tile to grow the floor, an existing tile to remove it, or a wall to recolor it or add/remove a door.</span>
          <button
            className="dw-floorplan-hint-close"
            onClick={() => {
              setShowHint(false);
              try { localStorage.setItem("eventify_floorplan_hint_dismissed", "1"); } catch (e) {}
            }}
          >
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M18 6L6 18M6 6l12 12"/></svg>
          </button>
        </div>
      )}

      {/* Unified object popover: one editing surface for every selectable
           thing, structural or not (docs/customization-system-design.md §2) */}
      {selection?.kind === "floor" && (
        <div ref={popoverRef} className="dw-object-popover" style={{ left: selection.screenX, top: selection.screenY }}>
          <div className="dw-object-popover-draghandle" onMouseDown={handlePopoverDragStart} title="Drag to move">
            <span /><span /><span />
          </div>
          <p className="dw-object-popover-title">Floor Tile</p>
          <button
            className="dw-object-popover-action-btn danger"
            disabled={!selection.canRemove}
            title={selection.canRemove
              ? "Removes this tile and any wall/door on its outer edge — click the purple ghost tile it leaves behind to add it back"
              : "Can't remove this tile — it's the last one left, or removing it would split the room into two disconnected pieces"}
            onClick={handleRemoveTile}
          >
            Remove Tile
          </button>
          <button className="dw-object-popover-close" onClick={() => setSelection(null)}>Close</button>
        </div>
      )}

      {selection?.kind === "wall" && (() => {
        const mode = selection.uiMode || "default";
        const key = selection.nearestEdgeKey;
        const doorData = selection.doorData;
        const windowData = selection.windowData;

        const setDoorProp = (patch) => {
          setDoors(prev => ({ ...prev, [key]: { ...(prev[key] || {}), ...patch } }));
          setSelection(s => s && { ...s, doorData: { ...(s.doorData || {}), ...patch } });
        };
        const setWindowProp = (patch) => {
          setWindows(prev => ({ ...prev, [key]: { ...(prev[key] || {}), ...patch } }));
          setSelection(s => s && { ...s, windowData: { ...(s.windowData || {}), ...patch } });
        };
        const addDoor = (style) => {
          setDoors(prev => ({ ...prev, [key]: { style } }));
          setSelection(s => s && { ...s, doorData: { style }, uiMode: "default" });
        };
        const addWindow = (style) => {
          setWindows(prev => ({ ...prev, [key]: { style } }));
          setSelection(s => s && { ...s, windowData: { style }, uiMode: "default" });
        };
        const removeDoor = () => {
          setDoors(prev => { const next = { ...prev }; delete next[key]; return next; });
          setSelection(null);
        };
        const removeWindow = () => {
          setWindows(prev => { const next = { ...prev }; delete next[key]; return next; });
          setSelection(null);
        };

        return (
          <div ref={popoverRef} className="dw-object-popover" style={{ left: selection.screenX, top: selection.screenY }}>
            <div className="dw-object-popover-draghandle" onMouseDown={handlePopoverDragStart} title="Drag to move">
              <span /><span /><span />
            </div>

            {mode === "door-pick" ? (
              <>
                <p className="dw-object-popover-title">Choose a Door Style</p>
                <div className="dw-object-popover-materials">
                  {DOOR_STYLE_LIST.map(s => (
                    <button key={s} className="dw-object-popover-material-btn" onClick={() => addDoor(s)}>
                      {DOOR_STYLE_LABELS[s]}
                    </button>
                  ))}
                </div>
                <button className="dw-object-popover-action-btn" onClick={() => setSelection(s => s && { ...s, uiMode: "default" })}>← Back</button>
              </>
            ) : mode === "window-pick" ? (
              <>
                <p className="dw-object-popover-title">Choose a Window Style</p>
                <div className="dw-object-popover-materials">
                  {WINDOW_STYLE_LIST.map(s => (
                    <button key={s} className="dw-object-popover-material-btn" onClick={() => addWindow(s)}>
                      {WINDOW_STYLE_LABELS[s]}
                    </button>
                  ))}
                </div>
                <button className="dw-object-popover-action-btn" onClick={() => setSelection(s => s && { ...s, uiMode: "default" })}>← Back</button>
              </>
            ) : (
              <>
                <p className="dw-object-popover-title">{doorData ? "Door" : windowData ? "Window" : "Wall"}</p>

                {!doorData && !windowData && (
                  <>
                    <p className="dw-object-popover-subhead">Wall Color</p>
                    <div className="dw-object-popover-swatches">
                      {wallColorPresets.map(c => (
                        <button
                          key={c}
                          className={`dw-object-popover-swatch ${selection.color === c ? "active" : ""}`}
                          style={{ background: c }}
                          onClick={() => {
                            setWallStyles(prev => {
                              const next = { ...prev };
                              selection.segment.edgeKeys.forEach(k => { next[k] = c; });
                              return next;
                            });
                            setSelection(s => s && { ...s, color: c });
                          }}
                        />
                      ))}
                    </div>
                    <div className="dw-object-popover-actions">
                      <button className="dw-object-popover-action-btn" onClick={() => setSelection(s => s && { ...s, uiMode: "door-pick" })}>+ Add Door</button>
                      <button className="dw-object-popover-action-btn" onClick={() => setSelection(s => s && { ...s, uiMode: "window-pick" })}>+ Add Window</button>
                    </div>
                  </>
                )}

                {doorData && (
                  <>
                    <p className="dw-object-popover-subhead">Style: {DOOR_STYLE_LABELS[doorData.style] || DOOR_STYLE_LABELS["modern-single"]}</p>
                    <p className="dw-object-popover-subhead">Door Color</p>
                    <div className="dw-object-popover-swatches">
                      {DOOR_COLOR_PRESETS.map(c => (
                        <button key={c} className={`dw-object-popover-swatch ${(doorData.color || DOOR_COLOR_PRESETS[0]) === c ? "active" : ""}`} style={{ background: c }} onClick={() => setDoorProp({ color: c })} />
                      ))}
                    </div>
                    <p className="dw-object-popover-subhead">Frame Color</p>
                    <div className="dw-object-popover-swatches">
                      {DOOR_FRAME_PRESETS.map(c => (
                        <button key={c} className={`dw-object-popover-swatch ${(doorData.frameColor || DOOR_FRAME_PRESETS[0]) === c ? "active" : ""}`} style={{ background: c }} onClick={() => setDoorProp({ frameColor: c })} />
                      ))}
                    </div>
                    <p className="dw-object-popover-subhead">Handle</p>
                    <div className="dw-object-popover-materials">
                      {DOOR_HANDLE_STYLES.map(h => (
                        <button key={h} className={`dw-object-popover-material-btn ${(doorData.handle || "sphere") === h ? "active" : ""}`} onClick={() => setDoorProp({ handle: h })}>
                          {DOOR_HANDLE_LABELS[h]}
                        </button>
                      ))}
                    </div>
                    {!DOOR_STYLES[doorData.style]?.sliding && (
                      <div className="dw-object-popover-scale-row">
                        <span className="dw-object-popover-scale-label">Opening Direction</span>
                        <button className="dw-object-popover-material-btn" onClick={() => setDoorProp({ openDir: doorData.openDir === -1 ? 1 : -1 })}>⇄ Flip</button>
                      </div>
                    )}
                    <div className="dw-object-popover-scale-row">
                      <span className="dw-object-popover-scale-label">Size</span>
                      <button className={`dw-object-popover-material-btn ${!doorData.tall ? "active" : ""}`} onClick={() => setDoorProp({ tall: false })}>Standard</button>
                      <button className={`dw-object-popover-material-btn ${doorData.tall ? "active" : ""}`} onClick={() => setDoorProp({ tall: true })}>Tall</button>
                    </div>
                    <button className="dw-object-popover-action-btn" onClick={() => setSelection(s => s && { ...s, uiMode: "door-pick" })}>Change Style</button>
                    <button className="dw-object-popover-action-btn danger" onClick={removeDoor}>Remove Door</button>
                  </>
                )}

                {windowData && (
                  <>
                    <p className="dw-object-popover-subhead">Style: {WINDOW_STYLE_LABELS[windowData.style] || WINDOW_STYLE_LABELS["standard"]}</p>
                    <p className="dw-object-popover-subhead">Frame Color</p>
                    <div className="dw-object-popover-swatches">
                      {WINDOW_FRAME_PRESETS.map(c => (
                        <button key={c} className={`dw-object-popover-swatch ${(windowData.frameColor || WINDOW_FRAME_PRESETS[0]) === c ? "active" : ""}`} style={{ background: c }} onClick={() => setWindowProp({ frameColor: c })} />
                      ))}
                    </div>
                    <p className="dw-object-popover-subhead">Frame Material</p>
                    <div className="dw-object-popover-materials">
                      {WINDOW_FRAME_MATERIALS.map(m => (
                        <button key={m} className={`dw-object-popover-material-btn ${(windowData.frameMaterial || "wood") === m ? "active" : ""}`} onClick={() => setWindowProp({ frameMaterial: m })}>
                          {MATERIAL_PRESETS[m].label}
                        </button>
                      ))}
                    </div>
                    <p className="dw-object-popover-subhead">Glass Tint</p>
                    <div className="dw-object-popover-materials">
                      {GLASS_TINT_LIST.map(t => (
                        <button key={t} className={`dw-object-popover-material-btn ${(windowData.glassTint || "clear") === t ? "active" : ""}`} onClick={() => setWindowProp({ glassTint: t })}>
                          {GLASS_TINT_LABELS[t]}
                        </button>
                      ))}
                    </div>
                    <div className="dw-object-popover-scale-row">
                      <span className="dw-object-popover-scale-label">Size</span>
                      <button className={`dw-object-popover-material-btn ${!windowData.big ? "active" : ""}`} onClick={() => setWindowProp({ big: false })}>Standard</button>
                      <button className={`dw-object-popover-material-btn ${windowData.big ? "active" : ""}`} onClick={() => setWindowProp({ big: true })}>Large</button>
                    </div>
                    <button className="dw-object-popover-action-btn" onClick={() => setSelection(s => s && { ...s, uiMode: "window-pick" })}>Change Style</button>
                    <button className="dw-object-popover-action-btn danger" onClick={removeWindow}>Remove Window</button>
                  </>
                )}
              </>
            )}

            <button className="dw-object-popover-close" onClick={() => setSelection(null)}>Close</button>
          </div>
        );
      })()}

      {selection?.kind === "furniture" && !advancedMode && (() => {
        const item = placedItems.find(i => i.id === selection.id);
        if (!item) return null;
        const label = TYPE_LABELS[item.type] || "Item";
        return (
          <div ref={popoverRef} className="dw-object-popover" style={{ left: selection.screenX, top: selection.screenY }}>
            <div className="dw-object-popover-draghandle" onMouseDown={handlePopoverDragStart} title="Drag to move">
              <span /><span /><span />
            </div>
            <p className="dw-object-popover-title">{label}</p>

            <button
              className="dw-object-popover-advanced-btn"
              onClick={handleEnterAdvancedMode}
              title={PART_LABELS[item.type] ? "Zoom in and edit each part of this object individually" : "Zoom in for a closer, focused editing view"}
            >
              ✦ Advanced Edit
            </button>

            {item.dimensions ? (
              <div className="dw-object-popover-dims">
                {[["width","Width"],["height","Height"],["depth","Depth"]].map(([axis,axisLabel]) => (
                  <div className="dw-object-popover-scale-row" key={axis}>
                    <span className="dw-object-popover-scale-label">{axisLabel}</span>
                    <button
                      className="dw-object-popover-scale-btn"
                      disabled={(item.dimensions[axis] || 1) <= DIM_MIN}
                      onClick={() => handleSetDimension(axis, -DIM_STEP)}
                    >−</button>
                    <span className="dw-object-popover-scale-value">{Math.round((item.dimensions[axis] || 1) * 100)}%</span>
                    <button
                      className="dw-object-popover-scale-btn"
                      disabled={(item.dimensions[axis] || 1) >= DIM_MAX}
                      onClick={() => handleSetDimension(axis, DIM_STEP)}
                    >+</button>
                  </div>
                ))}
              </div>
            ) : (
              <div className="dw-object-popover-scale-row">
                <span className="dw-object-popover-scale-label">Size</span>
                <button
                  className="dw-object-popover-scale-btn"
                  disabled={(item.scale || 1) <= SCALE_MIN}
                  onClick={() => handleScale(-SCALE_STEP)}
                >−</button>
                <span className="dw-object-popover-scale-value">{Math.round((item.scale || 1) * 100)}%</span>
                <button
                  className="dw-object-popover-scale-btn"
                  disabled={(item.scale || 1) >= SCALE_MAX}
                  onClick={() => handleScale(SCALE_STEP)}
                >+</button>
              </div>
            )}

            {item.partColors ? (
              <>
                <p className="dw-object-popover-subhead">Colors (by part)</p>
                {Object.entries(PART_LABELS[item.type] || {}).map(([part, partLabel]) => (
                  <div className="dw-object-popover-part-row" key={part}>
                    <span className="dw-object-popover-part-label">{partLabel}</span>
                    <div className="dw-object-popover-swatches dw-object-popover-swatches-compact">
                      {itemColorPresets.slice(0, 3).map(c => (
                        <button
                          key={c}
                          className={`dw-object-popover-swatch ${item.partColors[part] === c ? "active" : ""}`}
                          style={{ background: c }}
                          onClick={() => handleSetPartColor(part, c)}
                          title={c}
                        />
                      ))}
                      {whiteShadePresets.map(c => (
                        <button
                          key={c}
                          className={`dw-object-popover-swatch dw-object-popover-swatch-white ${item.partColors[part] === c ? "active" : ""}`}
                          style={{ background: c }}
                          onClick={() => handleSetPartColor(part, c)}
                          title={c}
                        />
                      ))}
                      <input
                        type="color"
                        className="dw-object-popover-color-input"
                        value={item.partColors[part] || "#ffffff"}
                        onChange={(e) => handleSetPartColor(part, e.target.value)}
                        title="Pick any shade"
                      />
                    </div>
                  </div>
                ))}
              </>
            ) : (
              <>
                <p className="dw-object-popover-subhead">Color</p>
                <div className="dw-object-popover-swatches">
                  {itemColorPresets.map(c => (
                    <button
                      key={c}
                      className={`dw-object-popover-swatch ${item.color === c ? "active" : ""}`}
                      style={{ background: c }}
                      onClick={() => handleSetColor(item.color === c ? null : c)}
                      title={item.color === c ? "Reset to default color" : c}
                    />
                  ))}
                  <input
                    type="color"
                    className="dw-object-popover-color-input"
                    value={item.color || "#ffffff"}
                    onChange={(e) => handleSetColor(e.target.value)}
                    title="Pick any shade"
                  />
                </div>
                <p className="dw-object-popover-subhead">Whites</p>
                <div className="dw-object-popover-swatches">
                  {whiteShadePresets.map(c => (
                    <button
                      key={c}
                      className={`dw-object-popover-swatch dw-object-popover-swatch-white ${item.color === c ? "active" : ""}`}
                      style={{ background: c }}
                      onClick={() => handleSetColor(item.color === c ? null : c)}
                      title={item.color === c ? "Reset to default color" : c}
                    />
                  ))}
                </div>
              </>
            )}

            <p className="dw-object-popover-subhead">Material</p>
            <div className="dw-object-popover-materials">
              {MATERIAL_LIST.map(m => (
                <button
                  key={m}
                  className={`dw-object-popover-material-btn ${(item.material || DEFAULT_MATERIAL) === m ? "active" : ""}`}
                  onClick={() => handleSetMaterial(m)}
                >
                  {MATERIAL_PRESETS[m].label}
                </button>
              ))}
            </div>

            {item.branding && (
              <>
                <p className="dw-object-popover-subhead">Branding</p>
                <input
                  className="dw-object-popover-text-input"
                  type="text"
                  placeholder="e.g. Fresh Brew"
                  maxLength={24}
                  value={item.branding.text}
                  onChange={(e) => handleSetBranding("text", e.target.value)}
                />
                <select
                  className="dw-object-popover-select"
                  value={item.branding.font}
                  onChange={(e) => handleSetBranding("font", e.target.value)}
                >
                  {BRANDING_FONTS.map(f => <option key={f} value={f} style={{ fontFamily: f }}>{f}</option>)}
                </select>
                <div className="dw-object-popover-scale-row">
                  <span className="dw-object-popover-scale-label">Text Size</span>
                  <button
                    className="dw-object-popover-scale-btn"
                    disabled={item.branding.fontSize <= BRANDING_SIZE_MIN}
                    onClick={() => handleSetBranding("fontSize", Math.max(BRANDING_SIZE_MIN, item.branding.fontSize - BRANDING_SIZE_STEP))}
                  >−</button>
                  <span className="dw-object-popover-scale-value">{item.branding.fontSize}</span>
                  <button
                    className="dw-object-popover-scale-btn"
                    disabled={item.branding.fontSize >= BRANDING_SIZE_MAX}
                    onClick={() => handleSetBranding("fontSize", Math.min(BRANDING_SIZE_MAX, item.branding.fontSize + BRANDING_SIZE_STEP))}
                  >+</button>
                </div>
                <div className="dw-object-popover-scale-row">
                  <span className="dw-object-popover-scale-label">Position</span>
                  <button
                    className="dw-object-popover-scale-btn"
                    disabled={item.branding.offsetX <= BRANDING_OFFSET_MIN}
                    onClick={() => handleSetBranding("offsetX", Math.round((Math.max(BRANDING_OFFSET_MIN, item.branding.offsetX - BRANDING_OFFSET_STEP))*10)/10)}
                  >&#8592;</button>
                  <span className="dw-object-popover-scale-value">&nbsp;</span>
                  <button
                    className="dw-object-popover-scale-btn"
                    disabled={item.branding.offsetX >= BRANDING_OFFSET_MAX}
                    onClick={() => handleSetBranding("offsetX", Math.round((Math.min(BRANDING_OFFSET_MAX, item.branding.offsetX + BRANDING_OFFSET_STEP))*10)/10)}
                  >&#8594;</button>
                </div>
                <div className="dw-object-popover-swatches">
                  {["#1a0a3d","#ffffff","#C9A44C","#7c3aed","#111111"].map(c => (
                    <button
                      key={c}
                      className={`dw-object-popover-swatch ${item.branding.color === c ? "active" : ""}`}
                      style={{ background: c, borderColor: c === "#ffffff" ? "#ccc" : "transparent" }}
                      onClick={() => handleSetBranding("color", c)}
                      title={c}
                    />
                  ))}
                </div>
              </>
            )}

            <div className="dw-object-popover-actions">
              {/* Wall-mounted items take their rotation from whichever
                  wall they're on. A manual 45° rotate would just knock
                  them crooked against it, so the control doesn't apply. */}
              {!WALL_MOUNT_TYPES.has(item.type) && (
                <button className="dw-object-popover-action-btn" onClick={handleRotate}>⟳ Rotate 45°</button>
              )}
              <button className="dw-object-popover-action-btn" onClick={handleDuplicate}>⧉ Duplicate</button>
              <button className="dw-object-popover-action-btn danger" onClick={handleDelete}>🗑 Delete</button>
            </div>
            <button className="dw-object-popover-close" onClick={() => setSelection(null)}>Close</button>
          </div>
        );
      })()}

      {/* Event Editing Mode banner: persistent while walking through the
           venue, hidden during Advanced Edit so it doesn't stack with that
           banner (both are fixed, top-centered pills). The hint line swaps
           to a "click to resume" message while something's selected, since
           movement is paused and the cursor is free for the popover then. */}
      {viewMode === "firstPerson" && !advancedMode && (
        <div className="dw-fp-banner">
          <span className="dw-fp-banner-label">
            🚶 Event Editing Mode — {selection
              ? "click empty space or press Esc to resume walking"
              : "WASD to move • Shift to run • click an object to edit it • Esc to pause"}
          </span>
          <button className="dw-fp-banner-done" onClick={handleExitFirstPerson}>🧊 Exit to Overview</button>
        </div>
      )}

      {/* Advanced Edit Mode banner: replaces the standard popover while
           zoomed in. Shows a breadcrumb ("Coffee Booth › Countertop") once
           a component is selected, so it's always clear both what object
           and what part of it you're editing. */}
      {advancedMode && selection?.kind === "furniture" && (() => {
        const item = placedItems.find(i => i.id === selection.id);
        if (!item) return null;
        const label = TYPE_LABELS[item.type] || "Item";
        // Skip the breadcrumb when the whole object itself is the
        // selected "component": "Coffee Booth › Coffee Booth" is just noise.
        const partLabel = selectedPart && selectedPart !== WHOLE_PART ? getPartLabel(item, selectedPart) : null;
        return (
          <div className="dw-advanced-banner">
            <span className="dw-advanced-banner-label">
              ✦ Advanced Editing — {label}{partLabel && <span className="dw-advanced-banner-crumb"> › {partLabel}</span>}
            </span>
            <button className="dw-advanced-banner-done" onClick={handleExitAdvancedMode}>Done</button>
          </div>
        );
      })()}

      {/* Advanced Edit component panel: appears once a tagged part has
           been clicked. Color reuses the same partColors system as the
           standard popover. Material/Size/Position/Rotation (Phase 3) are
           the per-component equivalents of the whole-object controls,
           applied via applyPartTransforms. */}
      {advancedMode && selectedPart && (() => {
        const item = placedItems.find(i => i.id === selection.id);
        if (!item) return null;
        const isWhole = selectedPart === WHOLE_PART;
        const label = TYPE_LABELS[item.type] || "Item";
        const partLabel = getPartLabel(item, selectedPart);
        const t = !isWhole ? (item.partTransforms?.[selectedPart] || DEFAULT_PART_TRANSFORM) : null;
        const hasCustomTransform = !isWhole && !!item.partTransforms?.[selectedPart];
        // Objects with no tagged parts (most of the catalog) reuse the
        // item's own color/material fields here instead of the partColors/
        // partMaterials dictionaries. There's only one "component" to edit,
        // so it IS the whole-object control, just surfaced in this panel.
        const currentColor = isWhole ? item.color : item.partColors?.[selectedPart];
        const currentMaterial = isWhole ? (item.material || DEFAULT_MATERIAL) : (item.partMaterials?.[selectedPart] || item.material || DEFAULT_MATERIAL);
        const pickColor = (c) => isWhole ? handleSetColor(item.color === c ? null : c) : handleSetPartColor(selectedPart, c);
        const pickMaterial = (m) => isWhole ? handleSetMaterial(m) : handleSetPartMaterial(selectedPart, m);
        return (
          <div className="dw-part-panel">
            {!isWhole && <p className="dw-part-panel-crumb">{label}</p>}
            <p className="dw-part-panel-title">{partLabel}</p>
            <p className="dw-object-popover-subhead">Color</p>
            <div className="dw-object-popover-swatches">
              {itemColorPresets.map(c => (
                <button
                  key={c}
                  className={`dw-object-popover-swatch ${currentColor === c ? "active" : ""}`}
                  style={{ background: c }}
                  onClick={() => pickColor(c)}
                  title={c}
                />
              ))}
              <input
                type="color"
                className="dw-object-popover-color-input"
                value={currentColor || "#ffffff"}
                onChange={(e) => pickColor(e.target.value)}
                title="Pick any shade"
              />
            </div>
            <p className="dw-object-popover-subhead">Whites</p>
            <div className="dw-object-popover-swatches">
              {whiteShadePresets.map(c => (
                <button
                  key={c}
                  className={`dw-object-popover-swatch dw-object-popover-swatch-white ${currentColor === c ? "active" : ""}`}
                  style={{ background: c }}
                  onClick={() => pickColor(c)}
                  title={c}
                />
              ))}
            </div>

            <p className="dw-object-popover-subhead">Material</p>
            <div className="dw-object-popover-materials">
              {MATERIAL_LIST.map(m => (
                <button
                  key={m}
                  className={`dw-object-popover-material-btn ${currentMaterial === m ? "active" : ""}`}
                  onClick={() => pickMaterial(m)}
                >
                  {MATERIAL_PRESETS[m].label}
                </button>
              ))}
            </div>

            {item.branding && (
              <>
                {/* Branding/text is a whole-object property (one painted-on
                    panel per item, positioned by BRANDING_PANEL_POS) instead
                    of something scoped to whichever sub-part is currently
                    selected. It still needs to be reachable without
                    backing out of Advanced Edit entirely, so it's surfaced
                    here regardless of isWhole/selectedPart. */}
                <p className="dw-object-popover-subhead">Written Text</p>
                <input
                  className="dw-object-popover-text-input"
                  type="text"
                  placeholder="e.g. Welcome to our Wedding"
                  maxLength={24}
                  value={item.branding.text}
                  onChange={(e) => handleSetBranding("text", e.target.value)}
                />
                <select
                  className="dw-object-popover-select"
                  value={item.branding.font}
                  onChange={(e) => handleSetBranding("font", e.target.value)}
                >
                  {BRANDING_FONTS.map(f => <option key={f} value={f} style={{ fontFamily: f }}>{f}</option>)}
                </select>
                <div className="dw-object-popover-scale-row">
                  <span className="dw-object-popover-scale-label">Text Size</span>
                  <button
                    className="dw-object-popover-scale-btn"
                    disabled={item.branding.fontSize <= BRANDING_SIZE_MIN}
                    onClick={() => handleSetBranding("fontSize", Math.max(BRANDING_SIZE_MIN, item.branding.fontSize - BRANDING_SIZE_STEP))}
                  >−</button>
                  <span className="dw-object-popover-scale-value">{item.branding.fontSize}</span>
                  <button
                    className="dw-object-popover-scale-btn"
                    disabled={item.branding.fontSize >= BRANDING_SIZE_MAX}
                    onClick={() => handleSetBranding("fontSize", Math.min(BRANDING_SIZE_MAX, item.branding.fontSize + BRANDING_SIZE_STEP))}
                  >+</button>
                </div>
                <div className="dw-object-popover-scale-row">
                  <span className="dw-object-popover-scale-label">Position</span>
                  <button
                    className="dw-object-popover-scale-btn"
                    disabled={item.branding.offsetX <= BRANDING_OFFSET_MIN}
                    onClick={() => handleSetBranding("offsetX", Math.round((Math.max(BRANDING_OFFSET_MIN, item.branding.offsetX - BRANDING_OFFSET_STEP))*10)/10)}
                  >&#8592;</button>
                  <span className="dw-object-popover-scale-value">&nbsp;</span>
                  <button
                    className="dw-object-popover-scale-btn"
                    disabled={item.branding.offsetX >= BRANDING_OFFSET_MAX}
                    onClick={() => handleSetBranding("offsetX", Math.round((Math.min(BRANDING_OFFSET_MAX, item.branding.offsetX + BRANDING_OFFSET_STEP))*10)/10)}
                  >&#8594;</button>
                </div>
                <div className="dw-object-popover-swatches">
                  {["#1a0a3d","#ffffff","#C9A44C","#7c3aed","#111111"].map(c => (
                    <button
                      key={c}
                      className={`dw-object-popover-swatch ${item.branding.color === c ? "active" : ""}`}
                      style={{ background: c, borderColor: c === "#ffffff" ? "#ccc" : "transparent" }}
                      onClick={() => handleSetBranding("color", c)}
                      title={c}
                    />
                  ))}
                </div>
              </>
            )}

            <p className="dw-object-popover-subhead">Size</p>
            <div className="dw-object-popover-scale-row">
              <span className="dw-object-popover-scale-label">Scale</span>
              {isWhole ? (
                <>
                  <button className="dw-object-popover-scale-btn" disabled={(item.scale || 1) <= SCALE_MIN} onClick={() => handleScale(-SCALE_STEP)}>−</button>
                  <span className="dw-object-popover-scale-value">{Math.round((item.scale || 1) * 100)}%</span>
                  <button className="dw-object-popover-scale-btn" disabled={(item.scale || 1) >= SCALE_MAX} onClick={() => handleScale(SCALE_STEP)}>+</button>
                </>
              ) : (
                <>
                  <button className="dw-object-popover-scale-btn" disabled={t.scale <= PART_SCALE_MIN} onClick={() => handleAdjustPartTransform(selectedPart, "scale", -PART_SCALE_STEP)}>−</button>
                  <span className="dw-object-popover-scale-value">{Math.round(t.scale * 100)}%</span>
                  <button className="dw-object-popover-scale-btn" disabled={t.scale >= PART_SCALE_MAX} onClick={() => handleAdjustPartTransform(selectedPart, "scale", PART_SCALE_STEP)}>+</button>
                </>
              )}
            </div>

            <p className="dw-object-popover-subhead">Position</p>
            {isWhole
              ? [["x","X"],["y","Y (height)"],["z","Z"]].map(([axisKey, axisLabel]) => (
                  <div className="dw-object-popover-scale-row" key={axisKey}>
                    <span className="dw-object-popover-scale-label">{axisLabel}</span>
                    <button className="dw-object-popover-scale-btn" onClick={() => handleAdjustWholePosition(axisKey, -PART_POS_STEP)}>−</button>
                    <span className="dw-object-popover-scale-value">{(item.position[axisKey] || 0).toFixed(2)}</span>
                    <button className="dw-object-popover-scale-btn" onClick={() => handleAdjustWholePosition(axisKey, PART_POS_STEP)}>+</button>
                  </div>
                ))
              : [["posX","X","x"],["posY","Y (height)","y"],["posZ","Z","z"]].map(([field,axisLabel,axisKey]) => (
                  <div className="dw-object-popover-scale-row" key={field}>
                    <span className="dw-object-popover-scale-label">{axisLabel}</span>
                    <button className="dw-object-popover-scale-btn" disabled={t.position[axisKey] <= PART_POS_MIN} onClick={() => handleAdjustPartTransform(selectedPart, field, -PART_POS_STEP)}>−</button>
                    <span className="dw-object-popover-scale-value">{t.position[axisKey].toFixed(2)}</span>
                    <button className="dw-object-popover-scale-btn" disabled={t.position[axisKey] >= PART_POS_MAX} onClick={() => handleAdjustPartTransform(selectedPart, field, PART_POS_STEP)}>+</button>
                  </div>
                ))}

            <p className="dw-object-popover-subhead">Rotation</p>
            <div className="dw-object-popover-scale-row">
              <span className="dw-object-popover-scale-label">Turn</span>
              <button
                className="dw-object-popover-scale-btn"
                onClick={() => isWhole ? handleAdjustWholeRotation(-PART_ROT_STEP) : handleAdjustPartTransform(selectedPart, "rotation", -PART_ROT_STEP)}
              >⟲</button>
              <span className="dw-object-popover-scale-value">{Math.round(((isWhole ? (item.rotation || 0) : t.rotation) * 180) / Math.PI)}°</span>
              <button
                className="dw-object-popover-scale-btn"
                onClick={() => isWhole ? handleAdjustWholeRotation(PART_ROT_STEP) : handleAdjustPartTransform(selectedPart, "rotation", PART_ROT_STEP)}
              >⟳</button>
            </div>

            {hasCustomTransform && (
              <button className="dw-object-popover-action-btn" onClick={() => handleResetPartTransform(selectedPart)}>
                Reset Position &amp; Size
              </button>
            )}

            {isWhole && (
              // Whole-object actions: duplicating or deleting "just one
              // part" doesn't mean anything, so these only surface on the
              // WHOLE_PART selection, same scoping as Position/Rotation
              // above. Previously these only lived in the basic popover,
              // meaning Advanced Edit couldn't do them without backing out
              // first. Both handlers already tolerate being called mid
              // Advanced Edit (duplicate re-selects the copy, delete clears
              // the selection), so no extra plumbing was needed here.
              <div className="dw-object-popover-actions">
                {!WALL_MOUNT_TYPES.has(item.type) && (
                  <button className="dw-object-popover-action-btn" onClick={handleRotate}>⟳ Rotate 45°</button>
                )}
                <button className="dw-object-popover-action-btn" onClick={handleDuplicate}>⧉ Duplicate</button>
                <button className="dw-object-popover-action-btn danger" onClick={handleDelete}>🗑 Delete</button>
              </div>
            )}

            <button className="dw-part-panel-deselect" onClick={() => setSelectedPart(null)}>← Back to object</button>
          </div>
        );
      })()}

      {/* Top bar */}
      <div className="dw-topbar">
        <div className="dw-topbar-left">
          <button className="dw-back-btn" onClick={() => navigate("/simulation/layout")}>
            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M19 12H5M12 5l-7 7 7 7"/></svg>
            Back
          </button>
          <div className="dw-event-info">
            <span className="dw-event-name">{eventName}</span>
            <span className="dw-event-guests">{guests} guests</span>
          </div>
          {capacity && (
            <div className={`dw-capacity-badge ${capacity.level}`}>
              {capacity.text}
              <span className="dw-capacity-rec">· Recommended: {capacity.rec}</span>
            </div>
          )}
        </div>

        <div className="dw-view-btns">
          {Object.keys(viewPresets).map(v => (
            <button key={v} className={`dw-view-btn ${activeView===v?"active":""}`} onClick={() => applyViewPreset(v)}>
              {v}
            </button>
          ))}
        </div>

        <div className="dw-topbar-right">
          {isEnclosed && (
            <button
              className={`dw-toggle-wall-btn ${showFrontWall ? "on" : ""}`}
              onClick={() => setShowFrontWall(p => !p)}
            >
              {showFrontWall ? "Hide Front Wall" : "Show Front Wall"}
            </button>
          )}
          <span className="dw-layout-badge">{
            isCustom ? "Custom Layout" :
            layoutId === "indoor"   ? "Indoor Hall" :
            layoutId === "enclosed" ? "Enclosed Room" :
            layoutId === "lshaped"  ? "L-Shaped Room" :
            "Garden / Outdoor"
          }</span>
        </div>
      </div>

      {/* Workspace */}
      <div className="dw-workspace">

        {/* Left: elements */}
        <div className="dw-elements-panel">
          <div className="dw-panel-header">ADD ELEMENTS</div>

          <div className="dw-search-wrap">
            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="#b3aecb" strokeWidth="2.5"><circle cx="11" cy="11" r="7"/><line x1="21" y1="21" x2="16.65" y2="16.65"/></svg>
            <input
              className="dw-search-input"
              type="text"
              placeholder="Search objects..."
              value={searchTerm}
              onChange={e => setSearchTerm(e.target.value)}
            />
            {searchTerm && (
              <button className="dw-search-clear" onClick={() => setSearchTerm("")}>
                <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3"><path d="M18 6L6 18M6 6l12 12"/></svg>
              </button>
            )}
          </div>

          <div className="dw-category-tabs">
            {CATEGORIES.map(c => (
              <button key={c} className={`dw-cat-tab ${activeCategory===c?"active":""}`}
                onClick={() => setActiveCategory(c)}>{c === "All" ? "All" : CATEGORY_LABELS[c]}</button>
            ))}
            <button className={`dw-cat-tab ${activeCategory==="Favorites"?"active":""}`}
              onClick={() => setActiveCategory("Favorites")}>&#9733; Favorites</button>
          </div>

          {recentElements.length > 0 && (
            <div className="dw-recent-row">
              <span className="dw-recent-label">Recently used</span>
              <div className="dw-recent-icons">
                {recentElements.map(el => (
                  <div key={el.id} className="dw-recent-icon" draggable title={el.label}
                    onDragStart={e => e.dataTransfer.setData("elementId", el.id)}>
                    <ElementIcon type={el.id}/>
                  </div>
                ))}
              </div>
            </div>
          )}

          <div className="dw-elements-list">
            {filteredElements.map(el => (
              <div key={el.id} className="dw-element-item" draggable
                onDragStart={e => e.dataTransfer.setData("elementId", el.id)}>
                {recommendedIds.has(el.id) && (
                  <span className="dw-element-badge" title={`Recommended for ${eventType} events`}>&#9733;</span>
                )}
                <div className="dw-element-svg"><ElementIcon type={el.id}/></div>
                <div className="dw-element-info">
                  <span className="dw-element-label">{el.label}</span>
                  <span className="dw-element-cat">{CATEGORY_LABELS[el.category]}</span>
                </div>
                <button
                  className={`dw-element-fav ${favoriteIds.includes(el.id) ? "active" : ""}`}
                  title={favoriteIds.includes(el.id) ? "Remove from favorites" : "Add to favorites"}
                  onClick={(e) => { e.stopPropagation(); toggleFavorite(el.id); }}
                >
                  {favoriteIds.includes(el.id) ? "♥" : "♡"}
                </button>
              </div>
            ))}
            {filteredElements.length === 0 && (
              <p className="dw-elements-empty">
                {activeCategory === "Favorites" ? "No favorites yet — click the heart on any object." : "No objects match your search."}
              </p>
            )}
          </div>
        </div>

        {/* Center: canvas */}
        <div className="dw-canvas-area">
          <div className="dw-tool-strip">
            <button className="dw-strip-btn" title="Reset Camera" onClick={() => applyViewPreset("3D View")}>
              <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M1 4v6h6"/><path d="M3.51 15a9 9 0 1 0 2.13-9.36L1 10"/></svg>
            </button>
          </div>

          <div
            ref={mountRef}
            className={`dw-3d-mount ${viewMode === "firstPerson" ? "fp-mode" : ""}`}
            onDragOver={e => e.preventDefault()}
            onDrop={handleDrop}
          />

          <div className="dw-canvas-bottom">
            <div className="dw-bottom-left">
              <button className="dw-action-btn" onClick={() => setPlacedItems(p => p.slice(0,-1))}>↩ Undo</button>
              <button className="dw-action-btn" onClick={handleClearAll}>🗑 Clear All</button>
              {selection && <span className="dw-selected-hint">✦ {selection.kind === "wall" ? "Wall" : "Item"} selected</span>}
            </div>
            <div className="dw-bottom-right">
              {saveStatus !== "idle" && (
                <span className={`dw-save-status ${saveStatus === "saving" ? "saving" : saveStatus === "success" ? "success" : "error"}`}>
                  {saveStatus === "saving" ? "Saving…" : saveMessage}
                </span>
              )}
              <button className="dw-save-btn" onClick={handleSave} disabled={saveStatus === "saving"}>
                💾 {simulationId ? "Update Layout" : "Save Layout"}
              </button>
              {viewMode === "overview" && (
                <button
                  className="dw-preview-btn"
                  disabled={advancedMode}
                  title={advancedMode ? "Finish Advanced Edit first" : "Walk through the venue at eye level"}
                  onClick={handleEnterFirstPerson}
                >
                  👁 Event Editing Mode
                </button>
              )}
            </div>
          </div>
        </div>

        {/* Right: customize */}
        <div className="dw-right-panel">
          <p className="dw-right-title">CUSTOMIZE SPACE</p>

          {!isGarden && !isCustom && (
            <div className="dw-customize-section">
              <p className="dw-customize-label">WALL COLOR</p>
              <div className="dw-swatches">
                {wallColorPresets.map(c => (
                  <button key={c} className={`dw-swatch ${wallColor===c?"active":""}`}
                    style={{background:c}} onClick={() => setWallColor(c)}>
                    {wallColor===c && <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="#7c3aed" strokeWidth="3"><path d="M20 6L9 17l-5-5"/></svg>}
                  </button>
                ))}
                <input type="color" className="dw-color-picker" value={wallColor} onChange={e => setWallColor(e.target.value)}/>
              </div>
            </div>
          )}

          {isCustom && (
            <div className="dw-customize-section">
              <p className="dw-customize-label">WALL COLOR</p>
              <p className="dw-customize-hint">Click any wall in the 3D view to recolor it or add a door.</p>
            </div>
          )}

          <div className="dw-customize-section">
            <p className="dw-customize-label">FLOOR COLOR</p>
            <div className="dw-swatches">
              {floorColorPresets.map(c => (
                <button key={c} className={`dw-swatch ${floorColor===c?"active":""}`}
                  style={{background:c}} onClick={() => setFloorColor(c)}>
                  {floorColor===c && <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="#7c3aed" strokeWidth="3"><path d="M20 6L9 17l-5-5"/></svg>}
                </button>
              ))}
              <input type="color" className="dw-color-picker" value={floorColor} onChange={e => setFloorColor(e.target.value)}/>
            </div>
          </div>

          {!isGarden && !isCustom && (
            <div className="dw-customize-section">
              <p className="dw-customize-label">WALL TEXTURE</p>
              <div className="dw-texture-grid">
                {wallTextures.map((t,i) => (
                  <button key={t} className={`dw-texture-btn ${wallTexture===i?"active":""}`} onClick={() => setWallTexture(i)}>
                    <div className="dw-texture-preview" style={{
                      background: i===0?"#f5f0ff": i===1?"repeating-linear-gradient(45deg,#e8e0f0 0,#e8e0f0 2px,#f5f0ff 2px,#f5f0ff 10px)": i===2?"repeating-linear-gradient(0deg,#ccc 0,#ccc 2px,#e8e0f0 2px,#e8e0f0 14px),repeating-linear-gradient(90deg,#ccc 0,#ccc 2px,#e8e0f0 2px,#e8e0f0 14px)":"radial-gradient(circle,#e8e0f0 30%,#d8d0e8 70%)"
                    }}/>
                    {wallTexture===i && <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="#7c3aed" strokeWidth="3"><path d="M20 6L9 17l-5-5"/></svg>}
                    <span>{t}</span>
                  </button>
                ))}
              </div>
            </div>
          )}

          {!isGarden && (
            <div className="dw-customize-section">
              <p className="dw-customize-label">FLOOR TEXTURE</p>
              <div className="dw-texture-grid">
                {floorTextures.map((t,i) => (
                  <button key={t} className={`dw-texture-btn ${floorTexture===i?"active":""}`} onClick={() => setFloorTexture(i)}>
                    <div className="dw-texture-preview" style={{
                      background: i===0?"#f0ece8": i===1?"repeating-linear-gradient(0deg,#8a5a2f 0,#8a5a2f 6px,#6f4423 6px,#6f4423 12px)":"repeating-linear-gradient(0deg,#c9c5da 0,#c9c5da 2px,#e8e6ee 2px,#e8e6ee 16px),repeating-linear-gradient(90deg,#c9c5da 0,#c9c5da 2px,#e8e6ee 2px,#e8e6ee 16px)"
                    }}/>
                    {floorTexture===i && <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="#7c3aed" strokeWidth="3"><path d="M20 6L9 17l-5-5"/></svg>}
                    <span>{t}</span>
                  </button>
                ))}
              </div>
            </div>
          )}

          <div className="dw-customize-section">
            <p className="dw-customize-label">LIGHTING</p>
            <div className="dw-lighting-grid">
              {Object.keys(lightingPresets).map(l => (
                <button key={l} className={`dw-lighting-btn ${lighting===l?"active":""}`} onClick={() => setLighting(l)}>
                  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke={lighting===l?"#7c3aed":"#aaa"} strokeWidth="1.8">
                    <circle cx="12" cy="12" r="4"/>
                    <path d="M12 2v2M12 20v2M4.93 4.93l1.41 1.41M17.66 17.66l1.41 1.41M2 12h2M20 12h2M4.93 19.07l1.41-1.41M17.66 6.34l1.41-1.41"/>
                  </svg>
                  <span>{l}</span>
                </button>
              ))}
            </div>
          </div>

          <div className="dw-customize-section">
            <p className="dw-customize-label">VIEW ANGLE PRESETS</p>
            <div className="dw-angle-grid">
              {Object.keys(viewPresets).map(v => (
                <button key={v} className={`dw-angle-btn ${activeView===v?"active":""}`} onClick={() => applyViewPreset(v)}>
                  <div className="dw-angle-preview">
                    <svg width="28" height="28" viewBox="0 0 40 40" fill="none">
                      {v==="3D View"    && <><path d="M5 30 L20 10 L35 30 Z" stroke="#c4b5fd" strokeWidth="1.5" fill="#ede9fe"/><path d="M5 30 L20 38 L35 30" stroke="#a78bfa" strokeWidth="1.5" fill="#ddd6fe"/></>}
                      {v==="Top View"   && <><rect x="8" y="8" width="24" height="24" rx="2" stroke="#c4b5fd" strokeWidth="1.5" fill="#ede9fe"/><line x1="8" y1="20" x2="32" y2="20" stroke="#a78bfa" strokeWidth="1"/><line x1="20" y1="8" x2="20" y2="32" stroke="#a78bfa" strokeWidth="1"/></>}
                      {v==="Front View" && <><rect x="5" y="12" width="30" height="20" rx="2" stroke="#c4b5fd" strokeWidth="1.5" fill="#ede9fe"/></>}
                      {v==="Side View"  && <><path d="M10 10 L30 10 L30 30 L10 30 Z" stroke="#c4b5fd" strokeWidth="1.5" fill="#ede9fe"/><path d="M30 10 L36 16 L36 36 L30 30" stroke="#a78bfa" strokeWidth="1.5" fill="#ddd6fe"/></>}
                    </svg>
                  </div>
                  <span>{v}</span>
                </button>
              ))}
            </div>
          </div>

          <div className="dw-customize-section">
            <p className="dw-customize-label">LAYOUT INFO</p>
            {isCustom ? (
              <div className="dw-info-row"><span className="dw-info-label">Floor Area</span><span className="dw-info-value">{roomArea} m²</span></div>
            ) : (
              <>
                <div className="dw-info-row"><span className="dw-info-label">Width</span><span className="dw-info-value">{RW} m</span></div>
                <div className="dw-info-row"><span className="dw-info-label">Length</span><span className="dw-info-value">{RD} m</span></div>
              </>
            )}
            {!isGarden && <div className="dw-info-row"><span className="dw-info-label">Height</span><span className="dw-info-value">{RH} m</span></div>}
            <div className="dw-info-row"><span className="dw-info-label">Guests</span><span className="dw-info-value">{guests}</span></div>
            <div className="dw-info-row"><span className="dw-info-label">Items</span><span className="dw-info-value">{placedItems.length}</span></div>
          </div>
        </div>
      </div>
    </div>
  );
}
