# Customization System — Design Specification

This document defines the target design for Eventify's 3D Simulation Tool
customization system. It supersedes the ad-hoc approach used in the first
working version (fixed single-color walls, no object editing beyond
rotate/delete, no material system) and is the reference to build against
going forward.

The system is guided by three principles:

1. **Freedom** — the user should never feel limited to one version of an
   object. Every object should be movable, rotatable, resizable,
   duplicable, deletable, and re-colorable/re-materialed.
2. **Realism** — objects and structural elements should behave the way
   their real-world counterparts do (doors and windows attach to walls,
   floors can expand, materials respond to light, furniture sits on the
   floor).
3. **Simplicity** — every object, regardless of category, is edited the
   same way. The user learns the system once.

## 1. Unified object model

Every placed thing in the scene — wall, door, window, chair, table,
decoration, light — is an instance of the same underlying shape:

```
{
  id,
  category,     // structural | furniture | equipment | decoration | catering | lighting
  type,         // e.g. "chair", "wall-segment", "door", "round-table"
  variant,      // which style/geometry variant of this type, e.g. "wedding-chair"
  position: { x, y, z },
  rotation,     // radians, y-axis
  scale,        // uniform or {x,y,z}, clamped to sensible min/max per type
  color,        // hex
  material,     // "wood" | "marble" | "glass" | "metal" | "fabric" | "plastic" | "concrete" | "stone"
}
```

Structural elements (walls, doors, windows, partitions) are created
differently from furniture (derived from the floor-tile grid rather than
drag-and-dropped), but once they exist they are edited through the exact
same data shape and the exact same UI.

Doors and windows are not free-floating objects — they always reference
the wall segment they belong to and are positioned/constrained relative
to it, never placed independently in open space.

## 2. Unified selection & editing

- **Selection**: click any object (structural or not) to select it. The
  selected object gets a clear visual highlight (outline or emissive
  glow, consistent across all categories).
- **Editing surface**: a single properties popover/panel appears for the
  selected object, regardless of category. It exposes only the controls
  relevant to that object, but the *pattern* is identical everywhere:
  - Move (drag in-scene)
  - Rotate
  - Scale (numeric/slider control with sensible min/max clamps per
    object type — not free-form gizmo dragging, to avoid unrealistic
    results and keep the interaction fast to build and predictable)
  - Duplicate
  - Delete
  - Color (swatches + custom picker)
  - Material (preset swatches: wood, marble, glass, metal, fabric,
    plastic, concrete, stone)
- **Snap-to-grid** applies to movement of both structural elements and
  furniture, so alignment is easy without precision dragging.
- **Undo / redo** across all edit actions (place, move, rotate, scale,
  recolor, rematerial, delete) — users will iterate a lot while
  designing, so this is core, not a nice-to-have.

## 3. Materials & realism

- Move from `MeshLambertMaterial` to `MeshStandardMaterial` so surfaces
  respond to the existing lighting presets (Soft / Natural / Bright)
  with proper roughness/metalness behavior instead of flat shading.
- A fixed set of material presets (wood, marble, glass, metal, fabric,
  plastic, concrete, stone) is shared across all object types — a table
  and a floor both draw from the same "wood" preset, for consistency and
  to keep the system learnable.
- Floors and walls get realistic tiled textures (procedural or
  canvas-generated, consistent with the existing texture-generation
  approach already used for wall patterns) rather than flat color fills.

## 4. Object library

Reorganized into six categories:

- **Structural** — Floor, Wall, Door, Window, Partition, Stairs
- **Furniture** — Chairs, Tables, Sofas, Benches, Podiums
- **Event Equipment** — Stage, DJ Booth, Projector Screen, Dance Floor,
  Speakers
- **Decorations** — Balloon Arch, Flower Wall, Centrepieces, Banners,
  Curtains
- **Catering** — Buffet Tables, Drinks Station, Cake Table, Coffee
  Station
- **Lighting** — Ceiling Lights, Spotlights, Chandeliers, LED Bars,
  Fairy Lights

**Variant strategy**: quality over quantity. Each object type gets 2–3
genuinely distinct shapes/styles (e.g. Chair → Modern / Wedding /
Banquet), and each style is then multiplied by color, material, and size
choices. Target is roughly 40–50 well-built base objects producing
dozens of realistic combinations each — not hundreds of static,
single-purpose meshes. This is achievable because objects are built
procedurally in code rather than imported as fixed models, so variation
by parameter is close to free once the base shape exists.

Once the library grows large enough to need it: an object search bar,
and a Recently Used / Favorites section. These are explicitly deferred
to the polish phase — not needed while the library is still small.

## 5. Context-aware asset library

- **Event Type** is captured earlier in the simulation flow (at the
  Event Info step, alongside event name and guest count) — options such
  as Wedding, Birthday, Conference, Exhibition, Corporate.
- The object library uses Event Type to **rank** relevant items first
  (e.g. Conference surfaces podiums/screens/conference chairs; Wedding
  surfaces round tables/florals/wedding chairs/dance floor). Nothing is
  hidden — every object remains reachable, only the ordering changes.
- **Guest count remains scoped to capacity guidance only** ("Comfortably
  fits 80 guests" / "This layout may be too small for 150 guests") and
  never drives automatic placement of furniture or decorations. An
  optional "Generate Suggested Seating" auto-layout feature is
  explicitly out of scope for now and may be considered later as a
  separate, opt-in feature.

## 6. Predefined vs. Custom modes

- **Predefined**: the user picks a ready-made room shape (Indoor Hall,
  Enclosed Room, L-Shaped Room, Garden). Structural editing (adding/
  removing walls) is not available in this mode — the shape is fixed.
  Materials, furniture, colors, and decoration remain fully editable
  after loading, using the same unified editing system as Custom.
- **Custom**: the user starts from a blank, expandable floor grid with
  full structural freedom — add/remove floor tiles, walls, doors,
  windows, partitions — in addition to the same furniture/material/color
  editing available in Predefined mode.

## 7. Camera

Existing camera behavior is retained as-is: full orbit/pan/zoom, plus
3D / Top / Front / Side view presets for quick inspection from any
angle. No changes planned here — it already satisfies the "inspect from
every angle" requirement.

## 8. Build order

The system is built foundation-first, then widened with content, per
this sequence:

1. Unified object data model
2. Unified selection & editing interaction (click-to-select, highlight,
   properties popover)
3. Move / scale / duplicate / delete
4. Materials & colors (incl. `MeshStandardMaterial` migration)
5. Variants (2–3 shapes per object type)
6. Richer asset library (full category buildout toward 40–50 objects)
7. Context-aware recommendations (Event Type + ranking)
8. Final polish (search, Recently Used/Favorites, textures pass)

Each phase should be usable and demoable on its own before moving to the
next — this keeps the project in a working state throughout development
rather than requiring one large rewrite before anything is testable
again.
