# Eventify — 3D Simulation Tool: Project Status

Handoff reference for continuing work in a new session. Main file: `frontend/src/pages/Designworkspace.jsx` (React + Vite + Three.js, procedural geometry — no imported 3D models), styled by `frontend/src/pages/DesignWorkspace.css`.

## What the tool does

A room-layout simulator for event planning. Users build/select a room (standard dimensions or a custom tile-based floor plan), then drag objects from a categorized catalog (tables, chairs, catering, lighting, plants, coffee-corner, backdrops/booths, etc.) onto the floor, position/rotate/scale them, recolor and re-material them, and save the resulting layout to the backend.

## Backend

- `visual_simulations` table + `VisualSimulation` model, simulation controller/routes wired into `server.js`.
- Save Layout button persists `placedItems` + custom geometry (walls/tiles) + event type to the backend.
- Custom (non-standard) room layouts store `custom_geometry`; capacity calc accounts for both standard and tile-built rooms.

## Room / floor building

- Original 2D top-down Wall Editor was replaced with an in-3D tile/wall builder (click-to-place tiles and edges directly in the 3D view via raycasting), with its own popover UI, persistent hint banner, first-time intro overlay, and apply-confirmation flow.
- `getRoomBounds()` computes real room bounds — from `RW`/`RD` for standard rectangular rooms, or from the placed tiles' bounding box (`CFP` helpers: `parseTileKey`, `tileWorldCenter`, `TILE_SIZE`) for custom tile-built layouts. Used to clamp all object dragging (`DRAG_WALL_MARGIN = 0.4` clearance from walls).

## Object data model

Every placed object is a flat entry in the `placedItems` array with a unified shape:

```
{ id, category, type, variant, position, rotation, scale, color, material,
  parentId, dimensions, branding, partColors, partMaterials, partTransforms }
```

- `parentId` — supports cascading move/rotate/duplicate/delete for grouped items (e.g. Coffee Corner accessories attached to a booth).
- `dimensions` — non-uniform width/height/depth scaling, currently only used by coffee booths.
- `material` / `MATERIAL_PRESETS` (wood, marble, glass, metal, fabric, plastic, concrete, stone) applied via `applyItemMaterial(obj, item)`, also usable on walls/floor.
- `color` + `whiteShadePresets` (6 curated true-white shades) — color picker includes a native picker for arbitrary shades plus curated swatches.
- `partColors` / `partMaterials` / `partTransforms` — per-component overrides, keyed by each mesh's `userData.part` tag (see Advanced Edit below).
- `branding` — canvas-texture-generated logo/text panel, works on coffee booths and all "backdrop/booth" station types (`BRANDABLE_TYPES`), with per-type placement offsets (`BRANDING_PANEL_POS`).

## Interaction system

- One shared object popover for any selection (furniture or wall), built from a shared `hitTest` raycasting helper.
- Drag-to-move, Scale, Duplicate, Delete on furniture; wall selection highlight + wall-specific popover controls.
- Popover auto-positions beside the clicked object (right-preferred, left-fallback, vertical clamp so it never covers the object or runs off-screen) and can be freely dragged anywhere on screen via a grip handle (position persists per-selection, resets on new selection).
- Whole-object Size range: 50%–400% (`SCALE_MIN=0.5, SCALE_MAX=4.0, SCALE_STEP=0.1`).

## Lighting / rendering fixes

- `lightingPresets` (Soft/Natural/Bright) intensities substantially increased; renderer given `outputColorSpace = SRGBColorSpace`, `toneMapping = ACESFilmicToneMapping`, `toneMappingExposure = 1.1`; fill lights bumped.
- Every user-picked color also gets a matching emissive "self-lit" boost (`emissiveIntensity = 0.4`) in `applyItemMaterial` so chosen colors (especially white) don't wash out grey under scene shading/shadows.

## Advanced Edit Mode (major feature, 4 phases + follow-ups — all complete)

Dual editing modes on every placed object:

- **Standard Mode** — the normal popover (whole-object color/material/scale/position/rotation).
- **Advanced Edit** — entered via a "✦ Advanced Edit" button in the popover. Camera tweens (`animateCameraTo`, eased) to zoom in on the object; user clicks individual tagged sub-components (raycast via `hitTestPart`, using each mesh's `userData.part`) to select and edit them individually: Color, Material, Size, Position, Rotation, with breadcrumb UI and a Reset-to-default button per part.
- Extended to work on **every** catalog object, not just multi-part ones, via a `WHOLE_PART` sentinel — objects with no tagged sub-parts fall back to editing "the whole thing" through the same panel, reusing the object's normal color/material/scale/position/rotation fields.
- **Free drag-to-move while in Advanced Edit**: click-drag the object anywhere within the actual room bounds (shares `getRoomBounds()`/clamping with Standard Mode). Camera follows smoothly via a separate per-frame lerp (`dragFollowTarget`, 0.15 factor) decoupled from the object's own precise 1:1 cursor tracking — this was tuned after initial versions felt too fast/disorienting.
- `applyPartTransforms(obj, item)` — re-parents same-tagged meshes into a fresh pivot Group and applies the stored offset/rotation/scale. Groups meshes by **(part tag, immediate parent)**, not part tag alone — necessary because some objects reuse one tag across multiple separate physical instances (e.g. both arches of a dual-arch object, or all three window arches of a storefront facade) that must not be merged into a single pivot.

### Bug fixed this session: per-part resize desync

Some fluted/arch objects (`arch-panel-fluted`, `dual-arch-mixed`) had their decorative dome "cap" mesh added as a *sibling* under the top-level group while the fluted ribs it sits on lived inside their own wrapper group — same part tag, different parent. Two problems resulted:
1. Height mismatch: `buildArchPanel`'s `height` param is *total* height (internally subtracts `capH = width/2`), but the hand-built fluted cap logic didn't do the same subtraction, so the two arch styles were never actually the same height, and the gap grew with the whole-object Size slider.
2. Per-part resize desync: because cap and ribs had different parents, resizing/repositioning the shared part tag in Advanced Edit scaled them around two different pivot points, so the cap would visibly detach from the body instead of moving as one piece.

Both fixed: unified the height/cap math between the plain and fluted arch builders, and re-parented each cap into the same wrapper group as its ribs so Advanced Edit's per-part grouping treats them as one rigid unit.

## Catalog contents (additions this project, by phase)

- Base categories + variant system (round/rect tables, banquet variants, etc.).
- 11 new general object types (multiple categories) — Phase 6.
- Coffee Corner: 6 booth geometries with width/height/depth dimension controls, 15 accessory/decoration geometries with proximity auto-attach + countertop placement, branding system, and package presets (`handleApplyPackage`) for one-click themed setups.
- 8 new event-station geometries from a reference sheet, with per-part color system introduced here (native color picker).
- 11 wedding backdrop/booth station types (floral arch, drape arch, balloon arch, name arch, window counter booth, panel sconce stand, arch bookshelf, curtain backdrop bow, storefront facade, paneled counter, round reception desk) — all brandable.
- 14 catering items: arches (plain/fluted/dual-mixed), pedestals (duo/single, plain/fluted), fluted panel wall, tiered stands (fluted/acrylic), card box, guest book, fluted bowl duo, fluted vase. New helpers `buildFlutedCylinder` (faceted low-poly cylinder for a fluted look) and `buildFlutedPanel` (row of thin dowels for reeded paneling).
- **Deferred by user request**: 2 flower-cluster items and 1 candle-cluster item from the same reference sheet as the 14 catering items above — explicitly held back to be added later under Lighting/Plants once catering is fully done. **This is the next planned piece of work.**

## UX polish

- Search bar, Recently Used tracking, and Favorites toggle in the object library.
- Floor texture presets (Wood/Tile).
- Event Type field on simulation setup, with `EVENT_TYPE_PRIORITY` ranking that sorts the catalog by relevance to the chosen event type.

## Known environment constraint

The sandbox shell (`mcp__workspace__bash`) has been unavailable throughout this project for disk-space reasons, so no code has been live-executed/rendered by the assistant — every change has been verified by careful manual code review and Three.js/React reasoning, then confirmed against user-provided screenshots. Worth keeping in mind if something behaves unexpectedly after a fix: ask for a fresh screenshot/hard-refresh before assuming the code itself is wrong, since stale bundles and saved per-item overrides (`partTransforms`) have both caused false "still broken" reports in this session.

## Immediate next step

Add the deferred flower-cluster (x2) and candle-cluster (x1) items from the second catering reference sheet, filed under Lighting and/or Plants categories as appropriate, per the user's explicit instruction to pick these up after catering was complete.
