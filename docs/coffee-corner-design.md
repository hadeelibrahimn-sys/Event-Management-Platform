# Coffee Corner — Design Specification

This document defines the target design for the first "modular catering
station" — the Coffee Corner. It supersedes the idea of catering as loose
individual furniture (a table here, a machine there) in favor of complete,
highly-customizable *stations* that a user places, personalizes, and
decorates as one attraction. If this works well, the same pattern repeats
for Dessert, Beverage, Buffet, and Snack stations later — but only Coffee
is being built now (see "Future scope" below).

## 1. Core idea

> Users don't place a random coffee machine first — they start with a
> complete station, then personalize it.

A station is a **parent object** with things that belong to it:

```
Coffee Station
      │
      ├── Booth (the base structure — style, dimensions, color, material)
      ├── Branding (name text, font, size, color, placement)
      ├── Accessories (machine, grinder, cups, syrups, menu board, ...)
      └── Decorations (flowers, plants, LED sign, rug, balloons, ...)
```

Moving, rotating, or deleting the station moves, rotates, or deletes
everything that belongs to it. Individual accessories can still be
selected and repositioned *within* the station's footprint for fine
arrangement, using the exact same move/rotate/scale/duplicate/delete/
color/material controls every other object in the app already has — no
new interaction pattern to learn.

## 2. Data model — extending, not replacing, `placedItems`

Everything stays in the existing flat `placedItems` array (no separate
nested tree). Grouping is expressed with two additive fields:

```js
{
  id, category, type, variant,      // unchanged — same shape as today
  position, rotation, scale,
  color, material,

  parentId,      // null for ordinary furniture. Set to a station's id for
                 // anything that belongs to that station.
  branding,      // only present on station booths:
                 // { text, font, fontSize, color, offset:{x,y,z} }
}
```

This is deliberately additive so every existing system — selection,
`hitTest`, `meshMap`, drag-to-move, scale, duplicate, delete, color,
material — keeps working on stations and their children with zero
changes. The only new behavior needed is **cascading**:

- **Move**: dragging a station also translates every item whose
  `parentId` matches it, by the same delta.
- **Rotate**: rotating a station also rotates each child's position
  around the station's origin by the same delta angle, and adds the
  same delta to the child's own rotation (so accessories turn with the
  booth, not just orbit it).
- **Duplicate**: duplicating a station duplicates its children too,
  re-parented to the new station id, preserving relative placement.
- **Delete**: deleting a station cascades to delete its children (no
  orphaned accessories floating in the room).
- **Scale**: applies to the station's own mesh only — accessories keep
  their own independent scale, matching how a real flower vase doesn't
  grow just because the counter it sits on got wider.

A station's popover becomes the "parent" surface: alongside the usual
controls it also lists what's attached and lets you jump into
Accessories/Decorations/Branding, per the Steps below.

## 3. Booth: dimensions vs. scale

Ordinary furniture uses a single uniform `scale` (0.5–2.0×). Booths are
richer — the spec asks for independent width/height/depth. Booths get an
additional `dimensions: { width, height, depth }` field (each with its
own sensible min/max) alongside the existing `scale`/`rotation`/
`position`/`color`/`material` controls already built for every object.

## 4. Booth catalog (Step 1 + Step 6 merged)

The spec's Step 1 list and Step 6 "station variations" list describe
overlapping styles. Consolidated into six genuinely distinct booths so
there's no redundant catalog to maintain:

1. Modern Minimal (white, clean lines)
2. Luxury Marble (marble-clad, gold trim)
3. Wooden Rustic (warm wood, visible grain)
4. Contemporary Curved (rounded front, matches the reference photos)
5. Elegant Outdoor Cart (wheels, umbrella-ready, weather-appropriate)
6. Modern Black (matte black, minimal — fills the "Modern Black Station"
   / Scandinavian-adjacent look from Step 6)

Each is a real distinct shape (not a recolor), same principle as the
chair/sofa/table variants already in the app.

## 5. Branding panel (Step 3)

A text panel attached to the booth face. Rendered as a canvas-generated
texture on a thin plane (same technique already used for wall/floor
textures), so font, size, and color changes are cheap to regenerate.
Editable: text content, font choice (a small curated set, not every
system font), font size, font color, and panel position along the booth
face.

## 6. Accessories & decorations catalog (Steps 4 + 5)

New placeable types, all attachable to a station via `parentId`, all
using the existing unified controls:

**Equipment** — espresso machine, grinder, cup stack, cup holder, syrup
bottles, bean container, serving tray.
**Decorations** — menu board, LED sign, rug, indoor plant, flower
arrangement, decorative vase, balloon cluster, decorative lighting.

These reuse the existing category taxonomy (equipment/decoration) rather
than inventing a new one — they just gain a `parentId` when placed via a
station's Accessories panel (dragging them normally, without a station
selected, still works exactly as before — nothing is locked behind
stations).

## 7. Packages (the "I'd definitely add this" feature)

When placing a booth, offer a package choice:

- **Empty** — booth only, user builds it up manually.
- **Standard** — machine, grinder, cups, flowers.
- **Premium** — Standard + menu board, plant, rug, LED sign.
- **Luxury** — Premium + upgraded/premium-variant flowers, decorative
  lighting, extra accessories.

Packages just batch-create the listed accessory items with sensible
default placement around the booth, all `parentId`-linked to it.
Everything remains individually removable/editable afterward — packages
are a starting point, not a lock-in.

## 8. Future scope (explicitly not now)

Dessert / Beverage / Buffet / Snack stations follow the identical
pattern once Coffee is proven out: pick a station → customize → brand →
accessorize → decorate → arrange. No new architecture needed then, just
new catalog content — which is the point of building the grouping
infrastructure generically now instead of hard-coding it to coffee.

## 9. Build order

1. **Grouping infrastructure** — `parentId`, cascading move/rotate/
   duplicate/delete, station popover shell.
2. **Booth catalog** — 6 variants, full customization incl. dimensions.
3. **Branding panel** — editable text plane on the booth.
4. **Accessories & decorations catalog** — ~15 new attachable types.
5. **Packages** — Empty/Standard/Premium/Luxury presets.

Each phase is usable/demoable on its own, same rhythm as the first
8-phase build.
