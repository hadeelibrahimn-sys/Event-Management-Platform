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

const LAYOUT_IMAGES = {
  indoor:   thumbIndoor,
  enclosed: thumbEnclosed,
  lshaped:  thumbLshaped,
  garden:   thumbGarden,
  custom:   null,
};

/* ── sessionStorage helpers ── */
const read = (key, fallback = "") => {
  try { return sessionStorage.getItem(key) ?? fallback; } catch(e) { return fallback; }
};
const readJSON = (key, fallback) => {
  try { const v = sessionStorage.getItem(key); return v ? JSON.parse(v) : fallback; } catch(e) { return fallback; }
};
const writeJSON = (key, val) => {
  try { sessionStorage.setItem(key, JSON.stringify(val)); } catch(e) {}
};

/* ── Category taxonomy ──
   Stable ids are what gets stored on each placed object; labels are what
   the UI shows. Keeps the two independent so labels can be reworded later
   (or localized) without touching any saved data. "structural" isn't a
   drag-and-drop category — walls/doors/windows come from the tile floor
   plan, not this catalog — but it's listed here per the design doc for
   completeness and future reference. */
const CATEGORY_META = [
  { id: "furniture",     label: "Furniture" },
  { id: "chairs",        label: "Chairs" },
  { id: "stages",        label: "Stages" },
  { id: "tables",        label: "Tables" },
  { id: "carpets",       label: "Carpets" },
  { id: "balloons",      label: "Balloons" },
  { id: "catering",      label: "Catering" },
  { id: "plants",        label: "Plants" },
  { id: "vases",         label: "Vases" },
  { id: "curtains",      label: "Curtains" },
  { id: "panels",        label: "Panels / Backdrops" },
  { id: "welcome-signs", label: "Welcome Signs" },
  { id: "wall-art",      label: "Paintings / Wall Art" },
  { id: "lighting",      label: "Lighting" },
];
const CATEGORY_LABELS = Object.fromEntries(CATEGORY_META.map(c => [c.id, c.label]));
const CATEGORIES = ["All", ...CATEGORY_META.map(c => c.id)];

/* Resize is deliberately +/- steps rather than a free-drag gizmo — fast to
   use and the clamp keeps people from creating an unrealistically tiny or
   giant chair by accident. */
const SCALE_STEP = 0.1;
const SCALE_MIN = 0.5;
const SCALE_MAX = 4.0;

/* ── Advanced Edit Phase 3: per-component position/rotation/size ──
   Deliberately a tighter range than the whole-object Size control above —
   these nudge one piece (a shelf, a canopy) relative to where it was
   already built, not resize an entire object, so a runaway value is more
   likely to clip through its neighbors than look intentional. */
const PART_POS_STEP   = 0.05;
const PART_POS_MIN    = -0.6;
const PART_POS_MAX    = 0.6;
const PART_ROT_STEP   = Math.PI / 12; // 15°
const PART_SCALE_STEP = 0.1;
const PART_SCALE_MIN  = 0.5;
const PART_SCALE_MAX  = 2.0;

/* ── Element catalog ──
   `id` is the unique catalog/drag key. `type` is the base shape passed to
   build3DObject's switch — several catalog entries can share one `type`
   while differing only in `variant` (Phase 5: quality-over-quantity —
   2-3 genuinely different shapes per type rather than one each, see
   docs/customization-system-design.md §4). Types without multiple
   variants yet just use their own id as both id and type; Phase 6 widens
   coverage as the catalog grows toward 40-50 objects. */
const ELEMENTS = [
  { id: "round-table",         label: "Round Table",           category: "furniture", type: "round-table", variant: "default" },
  { id: "round-table-banquet", label: "Round Table (Banquet)", category: "furniture", type: "round-table", variant: "banquet" },
  { id: "rect-table",          label: "Rectangle Table",       category: "furniture", type: "rect-table",  variant: "default" },
  { id: "rect-table-banquet",  label: "Rect. Table (Banquet)", category: "furniture", type: "rect-table",  variant: "banquet" },
  { id: "chair-modern",        label: "Chair (Modern)",        category: "furniture", type: "chair",       variant: "modern"  },
  { id: "chair-wedding",       label: "Chair (Wedding)",       category: "furniture", type: "chair",       variant: "wedding" },
  { id: "chair-banquet",       label: "Chair (Banquet)",       category: "furniture", type: "chair",       variant: "banquet" },
  { id: "sofa-modern",         label: "Sofa (Modern)",         category: "furniture", type: "sofa",        variant: "modern"  },
  { id: "sofa-classic",        label: "Sofa (Classic)",        category: "furniture", type: "sofa",        variant: "classic" },
  { id: "bench",          label: "Bench",            category: "furniture", type: "bench",         variant: "default" },
  { id: "buffet-table",  label: "Buffet Table",     category: "catering",  type: "buffet-table",  variant: "default" },
  { id: "cake-table",    label: "Cake Table",       category: "catering",  type: "cake-table",    variant: "default" },
  { id: "coffee-corner", label: "Coffee Corner",    category: "catering",  type: "coffee-corner", variant: "default" },
  { id: "drinks-station", label: "Drinks Station",  category: "catering",  type: "drinks-station", variant: "default" },
  { id: "coffee-booth-modern", label: "Coffee Booth (Modern Minimal)",       category: "catering", type: "coffee-booth", variant: "modern-minimal" },
  { id: "coffee-booth-marble", label: "Coffee Booth (Luxury Marble)",        category: "catering", type: "coffee-booth", variant: "luxury-marble" },
  { id: "coffee-booth-rustic", label: "Coffee Booth (Wooden Rustic)",        category: "catering", type: "coffee-booth", variant: "wooden-rustic" },
  { id: "coffee-booth-curved", label: "Coffee Booth (Contemporary Curved)",  category: "catering", type: "coffee-booth", variant: "contemporary-curved" },
  { id: "coffee-booth-cart",   label: "Coffee Booth (Outdoor Cart)",         category: "catering", type: "coffee-booth", variant: "outdoor-cart" },
  { id: "coffee-booth-black",  label: "Coffee Booth (Modern Black)",         category: "catering", type: "coffee-booth", variant: "modern-black" },
  { id: "mini-plant",       label: "Mini Plant",       category: "plants", type: "mini-plant",       variant: "default" },
  { id: "flower-arrangement", label: "Flower Arrangement", category: "plants", type: "flower-arrangement", variant: "default" },
  { id: "umbrella-cart",         label: "Umbrella Cart",          category: "catering", type: "umbrella-cart",         variant: "default" },
  { id: "kiosk-booth",           label: "Kiosk Booth",            category: "catering", type: "kiosk-booth",           variant: "default" },
  { id: "umbrella-table",        label: "Umbrella Table",         category: "catering", type: "umbrella-table",        variant: "default" },
  { id: "display-pedestals",     label: "Display Pedestals",      category: "catering", type: "display-pedestals",     variant: "default" },
  { id: "mini-umbrella-cart",    label: "Mini Umbrella Cart",     category: "catering", type: "mini-umbrella-cart",    variant: "default" },
  { id: "umbrella-cart-wheeled", label: "Umbrella Cart (Wheeled)", category: "catering", type: "umbrella-cart-wheeled", variant: "default" },
  { id: "curtain-photo-booth",   label: "Curtain Photo Booth",    category: "catering", type: "curtain-photo-booth",   variant: "default" },
  { id: "backdrop-wall",         label: "Backdrop Wall",          category: "catering", type: "backdrop-wall",         variant: "default" },
  { id: "floral-arch-backdrop",  label: "Floral Arch Backdrop",   category: "catering", type: "floral-arch-backdrop",  variant: "default" },
  { id: "drape-arch-backdrop",   label: "Drape Arch Backdrop",    category: "catering", type: "drape-arch-backdrop",   variant: "default" },
  { id: "balloon-arch-bow",      label: "Balloon Arch (with Bow)", category: "catering", type: "balloon-arch-bow",     variant: "default" },
  { id: "name-arch-backdrop",    label: "Name Arch Backdrop",     category: "catering", type: "name-arch-backdrop",    variant: "default" },
  { id: "window-counter-booth",  label: "Window Counter Booth",   category: "catering", type: "window-counter-booth",  variant: "default" },
  { id: "panel-sconce-stand",    label: "Panel & Sconce Stand",   category: "catering", type: "panel-sconce-stand",    variant: "default" },
  { id: "arch-bookshelf",        label: "Arch Bookshelf",         category: "catering", type: "arch-bookshelf",        variant: "default" },
  { id: "curtain-backdrop-bow",  label: "Curtain Backdrop",       category: "catering", type: "curtain-backdrop-bow",  variant: "default" },
  { id: "storefront-facade",     label: "Storefront Facade",      category: "catering", type: "storefront-facade",     variant: "default" },
  { id: "paneled-counter",       label: "Paneled Counter",        category: "catering", type: "paneled-counter",       variant: "default" },
  { id: "round-reception-desk",  label: "Round Reception Desk",   category: "catering", type: "round-reception-desk",  variant: "default" },
  { id: "arch-panel-plain",      label: "Arch Panel (Plain)",     category: "catering", type: "arch-panel-plain",      variant: "default" },
  { id: "arch-panel-fluted",     label: "Arch Panel (Fluted)",    category: "catering", type: "arch-panel-fluted",     variant: "default" },
  { id: "dual-arch-mixed",       label: "Dual Arch (Mixed)",      category: "catering", type: "dual-arch-mixed",       variant: "default" },
  { id: "pedestal-duo-plain",    label: "Pedestal Duo (Plain)",   category: "catering", type: "pedestal-duo-plain",    variant: "default" },
  { id: "pedestal-duo-fluted",   label: "Pedestal Duo (Fluted)",  category: "catering", type: "pedestal-duo-fluted",   variant: "default" },
  { id: "pedestal-single-plain", label: "Pedestal (Plain)",       category: "catering", type: "pedestal-single-plain", variant: "default" },
  { id: "pedestal-single-fluted",label: "Pedestal (Fluted)",      category: "catering", type: "pedestal-single-fluted",variant: "default" },
  { id: "fluted-panel-wall",     label: "Fluted Wall Panel",      category: "catering", type: "fluted-panel-wall",     variant: "default" },
  { id: "tiered-stand-fluted",   label: "Tiered Stand (Fluted)",  category: "catering", type: "tiered-stand-fluted",   variant: "default" },
  { id: "tiered-stand-acrylic",  label: "Tiered Stand (Acrylic)", category: "catering", type: "tiered-stand-acrylic",  variant: "default" },
  { id: "card-box",              label: "Card Box",               category: "catering", type: "card-box",              variant: "default" },
  { id: "guest-book",            label: "Guest Book",             category: "catering", type: "guest-book",            variant: "default" },
  { id: "fluted-bowl-duo",       label: "Fluted Bowl Duo",        category: "catering", type: "fluted-bowl-duo",       variant: "default" },
  { id: "fluted-vase",           label: "Fluted Vase",            category: "catering", type: "fluted-vase",           variant: "default" },
  { id: "flower-cluster-spray",   label: "Flower Cluster (Spray)",   category: "plants", type: "flower-cluster-spray",   variant: "default" },
  { id: "flower-cluster-bouquet", label: "Flower Cluster (Bouquet)", category: "plants", type: "flower-cluster-bouquet", variant: "default" },
  { id: "candle-cluster",         label: "Candle Cluster",           category: "lighting",   type: "candle-cluster",         variant: "default" },
  { id: "floral-swag-horizontal", label: "Floral Swag (Horizontal)", category: "plants", type: "floral-swag-horizontal", variant: "default" },
  { id: "floral-swag-corner",     label: "Floral Corner Drape",      category: "plants", type: "floral-swag-corner",     variant: "default" },
  { id: "floral-cascade-teardrop",label: "Floral Cascade (Teardrop)",category: "plants", type: "floral-cascade-teardrop",variant: "default" },
  { id: "floral-arch-garland",    label: "Floral Arch Garland",      category: "plants", type: "floral-arch-garland",    variant: "default" },
  { id: "floral-swag-crescent",   label: "Floral Table Runner",      category: "plants", type: "floral-swag-crescent",   variant: "default" },
  { id: "bouquet-round-rose", label: "Bouquet (Round Rose)",   category: "plants", type: "bouquet-round-rose", variant: "default" },
  { id: "bouquet-cascade",    label: "Bouquet (Cascade)",      category: "plants", type: "bouquet-cascade",    variant: "default" },
  { id: "bouquet-wildflower", label: "Bouquet (Wildflower)",   category: "plants", type: "bouquet-wildflower", variant: "default" },
  { id: "bouquet-lily",       label: "Bouquet (Lily)",         category: "plants", type: "bouquet-lily",       variant: "default" },
  { id: "bouquet-tulip",      label: "Bouquet (Tulip)",        category: "plants", type: "bouquet-tulip",      variant: "default" },
  { id: "bouquet-calla",      label: "Bouquet (Calla Lily)",   category: "plants", type: "bouquet-calla",      variant: "default" },
  { id: "flower-stem-orchid",        label: "Flower Stem (Orchid)",       category: "plants", type: "flower-stem", variant: "orchid"        },
  { id: "flower-stem-lisianthus",    label: "Flower Stem (Lisianthus)",   category: "plants", type: "flower-stem", variant: "lisianthus"    },
  { id: "flower-stem-carnation",     label: "Flower Stem (Carnation)",    category: "plants", type: "flower-stem", variant: "carnation"     },
  { id: "flower-stem-babys-breath",  label: "Flower Stem (Baby's Breath)",category: "plants", type: "flower-stem", variant: "babys-breath"  },
  { id: "flower-stem-delphinium",    label: "Flower Stem (Delphinium)",   category: "plants", type: "flower-stem", variant: "delphinium"    },
  { id: "flower-stem-rose",          label: "Flower Stem (Rose)",         category: "plants", type: "flower-stem", variant: "rose"          },
  { id: "greenery-stem-fern",             label: "Greenery Stem (Fern)",             category: "plants", type: "greenery-stem", variant: "fern"              },
  { id: "greenery-stem-eucalyptus-silver",label: "Greenery Stem (Silver Eucalyptus)",category: "plants", type: "greenery-stem", variant: "eucalyptus-silver" },
  { id: "greenery-stem-olive",            label: "Greenery Stem (Olive)",            category: "plants", type: "greenery-stem", variant: "olive"             },
  { id: "greenery-stem-asparagus-fern",   label: "Greenery Stem (Asparagus Fern)",   category: "plants", type: "greenery-stem", variant: "asparagus-fern"    },
  { id: "greenery-stem-eucalyptus-round", label: "Greenery Stem (Round Eucalyptus)", category: "plants", type: "greenery-stem", variant: "eucalyptus-round"  },
  { id: "greenery-stem-ruscus",           label: "Greenery Stem (Ruscus)",           category: "plants", type: "greenery-stem", variant: "ruscus"            },
  { id: "greenery-stem-dusty-miller",     label: "Greenery Stem (Dusty Miller)",     category: "plants", type: "greenery-stem", variant: "dusty-miller"      },
  { id: "potted-olive",           label: "Potted Olive Tree",       category: "plants", type: "potted-plant", variant: "olive" },
  { id: "potted-bird-of-paradise",label: "Bird of Paradise",        category: "plants", type: "potted-plant", variant: "bird-of-paradise" },
  { id: "potted-fiddle-leaf-fig", label: "Fiddle Leaf Fig",         category: "plants", type: "potted-plant", variant: "fiddle-leaf-fig" },
  { id: "potted-areca-palm",      label: "Areca Palm",              category: "plants", type: "potted-plant", variant: "areca-palm" },
  { id: "potted-rubber-plant",    label: "Rubber Plant",            category: "plants", type: "potted-plant", variant: "rubber-plant" },
  { id: "potted-monstera",        label: "Monstera",                category: "plants", type: "potted-plant", variant: "monstera" },
  { id: "potted-bird-of-paradise-tall", label: "Bird of Paradise (Tall)", category: "plants", type: "potted-plant", variant: "bird-of-paradise-tall" },
  { id: "potted-dracaena-marginata",    label: "Dracaena Marginata",      category: "plants", type: "potted-plant", variant: "dracaena-marginata" },
  { id: "potted-peace-lily",      label: "Peace Lily",              category: "plants", type: "peace-lily",   variant: "default" },
  { id: "potted-snake-plant-yellow", label: "Snake Plant (Yellow Edge)", category: "plants", type: "potted-plant", variant: "snake-plant-yellow" },
  { id: "potted-zz-plant",        label: "ZZ Plant",                category: "plants", type: "potted-plant", variant: "zz-plant" },
  { id: "potted-asparagus-fern",  label: "Potted Asparagus Fern",   category: "plants", type: "potted-plant", variant: "asparagus-fern" },
  { id: "potted-dieffenbachia",   label: "Dieffenbachia",           category: "plants", type: "potted-plant", variant: "dieffenbachia" },
  { id: "potted-kentia-palm",     label: "Kentia Palm",             category: "plants", type: "potted-plant", variant: "kentia-palm" },
  { id: "potted-pothos-trailing", label: "Trailing Pothos",         category: "plants", type: "potted-plant", variant: "pothos-trailing" },
  { id: "potted-snake-plant-green", label: "Snake Plant (Green)",   category: "plants", type: "potted-plant", variant: "snake-plant-green" },
  { id: "potted-boston-fern",     label: "Boston Fern",             category: "plants", type: "potted-plant", variant: "boston-fern" },
  { id: "potted-alocasia",        label: "Alocasia",                category: "plants", type: "potted-plant", variant: "alocasia" },
  { id: "vase-spiral-twist",         label: "Spiral Twist Vase",         category: "vases", type: "vase", variant: "spiral-twist" },
  { id: "vase-fluted-tapered",       label: "Fluted Tapered Vase",       category: "vases", type: "vase", variant: "fluted-tapered" },
  { id: "vase-stacked-bubble",       label: "Stacked Bubble Vase",       category: "vases", type: "vase", variant: "stacked-bubble" },
  { id: "vase-fluted-bulbous",       label: "Fluted Bulbous Vase",       category: "vases", type: "vase", variant: "fluted-bulbous" },
  { id: "vase-ruffled-wavy-tall",    label: "Ruffled Wavy Vase (Tall)",  category: "vases", type: "vase", variant: "ruffled-wavy-tall" },
  { id: "vase-textured-cylinder",    label: "Textured Cylinder Vase",    category: "vases", type: "vase", variant: "textured-cylinder" },
  { id: "vase-ring",                 label: "Ring Vase",                 category: "vases", type: "vase", variant: "ring" },
  { id: "vase-textured-cylinder-tall", label: "Tall Textured Cylinder Vase", category: "vases", type: "vase", variant: "textured-cylinder-tall" },
  { id: "vase-faceted-hex",          label: "Faceted Hexagon Vase",      category: "vases", type: "vase", variant: "faceted-hex" },
  { id: "vase-wavy-stack",           label: "Wavy Stack Vase",           category: "vases", type: "vase", variant: "wavy-stack" },
  { id: "vase-amphora-handles",      label: "Amphora Vase (Handles)",    category: "vases", type: "vase", variant: "amphora-handles" },
  { id: "vase-bud-simple",           label: "Bud Vase (Simple)",         category: "vases", type: "vase", variant: "bud-simple" },
  { id: "vase-fluted-narrow",        label: "Fluted Narrow Vase",        category: "vases", type: "vase", variant: "fluted-narrow" },
  { id: "vase-bulbous-round",        label: "Bulbous Round Vase",        category: "vases", type: "vase", variant: "bulbous-round" },
  { id: "vase-wavy-simple",          label: "Wavy Vase (Simple)",        category: "vases", type: "vase", variant: "wavy-simple" },
  { id: "vase-tapered-cone",         label: "Tapered Cone Vase",         category: "vases", type: "vase", variant: "tapered-cone" },
  { id: "vase-ruffled-trumpet",      label: "Ruffled Trumpet Vase",      category: "vases", type: "vase", variant: "ruffled-trumpet" },
  { id: "vase-wavy-organic-tall",    label: "Wavy Organic Vase (Tall)",  category: "vases", type: "vase", variant: "wavy-organic-tall" },
  { id: "vase-ribbed-vertical-tall", label: "Ribbed Vertical Vase",      category: "vases", type: "vase", variant: "ribbed-vertical-tall" },
  { id: "vase-gourd-round",          label: "Gourd Vase",                category: "vases", type: "vase", variant: "gourd-round" },
  { id: "vase-goblet",               label: "Goblet Vase",               category: "vases", type: "vase", variant: "goblet" },
  { id: "vase-spherical-round",      label: "Spherical Vase",            category: "vases", type: "vase", variant: "spherical-round" },
  { id: "vase-jug-single-handle",    label: "Single-Handle Jug Vase",    category: "vases", type: "vase", variant: "jug-single-handle" },
  { id: "vase-faceted-gem",          label: "Faceted Gem Vase",          category: "vases", type: "vase", variant: "faceted-gem" },
  { id: "vase-gourd-stack",          label: "Gourd Stack Vase",          category: "vases", type: "vase", variant: "gourd-stack" },
  { id: "vase-ring-textured-cylinder", label: "Ring-Textured Cylinder Vase", category: "vases", type: "vase", variant: "ring-textured-cylinder" },
  { id: "vase-organic-lumpy",        label: "Organic Lumpy Vase",        category: "vases", type: "vase", variant: "organic-lumpy" },
  { id: "vase-rough-organic",        label: "Rough Organic Vase",        category: "vases", type: "vase", variant: "rough-organic" },
  { id: "vase-fluted-cylinder",      label: "Fluted Cylinder Vase",      category: "vases", type: "vase", variant: "fluted-cylinder" },
  { id: "vase-bud-curvy",            label: "Curvy Bud Vase",            category: "vases", type: "vase", variant: "bud-curvy" },
  { id: "vase-wavy-tall2",           label: "Wavy Vase (Tall)",          category: "vases", type: "vase", variant: "wavy-tall2" },
  { id: "vase-bud-round-simple",     label: "Round Bud Vase",            category: "vases", type: "vase", variant: "bud-round-simple" },
  { id: "vase-fluted-trumpet-flare", label: "Fluted Trumpet Vase",       category: "vases", type: "vase", variant: "fluted-trumpet-flare" },
  { id: "vase-handled-pitcher",      label: "Handled Pitcher Vase",      category: "vases", type: "vase", variant: "handled-pitcher" },
  { id: "vase-wavy-ribbed-tall",     label: "Wavy Ribbed Vase (Tall)",   category: "vases", type: "vase", variant: "wavy-ribbed-tall" },
  { id: "vase-terrazzo-speckle",     label: "Terrazzo Speckle Vase",     category: "vases", type: "vase", variant: "terrazzo-speckle" },
  { id: "table-pedestal-fluted-cream", label: "Fluted Pedestal Dining Table",  category: "tables", type: "table", variant: "pedestal-fluted-cream" },
  { id: "table-pedestal-hourglass",    label: "Hourglass Pedestal Dining Table", category: "tables", type: "table", variant: "pedestal-hourglass" },
  { id: "table-pedestal-fluted-white", label: "Fluted Pedestal Table (White)", category: "tables", type: "table", variant: "pedestal-fluted-white" },
  { id: "table-slab-tripod-cream",     label: "Slab Tripod Dining Table",      category: "tables", type: "table", variant: "slab-tripod-cream" },
  { id: "table-pedestal-cone-stone",   label: "Cone Pedestal Dining Table",    category: "tables", type: "table", variant: "pedestal-cone-stone" },
  { id: "table-pedestal-fluted-marble",label: "Fluted Pedestal Table (Marble)",category: "tables", type: "table", variant: "pedestal-fluted-marble" },
  { id: "table-oval-double-pedestal-fluted", label: "Oval Double-Pedestal Table", category: "tables", type: "table", variant: "oval-double-pedestal-fluted" },
  { id: "table-oval-wood-legs",        label: "Oval Dining Table (Wood Legs)", category: "tables", type: "table", variant: "oval-wood-legs" },
  { id: "table-oval-stone-legs",       label: "Oval Dining Table (Stone Legs)",category: "tables", type: "table", variant: "oval-stone-legs" },
  { id: "table-oval-double-pedestal-round", label: "Oval Double-Pedestal Table (Round End)", category: "tables", type: "table", variant: "oval-double-pedestal-round" },
  { id: "table-rect-waterfall-stone",  label: "Rectangular Table (Waterfall Stone)", category: "tables", type: "table", variant: "rect-waterfall-stone" },
  { id: "table-rect-waterfall-marble", label: "Rectangular Table (Waterfall Marble)", category: "tables", type: "table", variant: "rect-waterfall-marble" },
  { id: "table-rect-wood-legs",        label: "Rectangular Dining Table (Wood)", category: "tables", type: "table", variant: "rect-wood-legs" },
  { id: "table-rect-glass-stone-legs", label: "Rectangular Table (Glass Top)", category: "tables", type: "table", variant: "rect-glass-stone-legs" },
  { id: "table-rect-double-pedestal-fluted", label: "Rectangular Table (Double Fluted Pedestal)", category: "tables", type: "table", variant: "rect-double-pedestal-fluted" },
  { id: "table-rect-end-drums-stone",  label: "Rectangular Table (End Drums, Stone)", category: "tables", type: "table", variant: "rect-end-drums-stone" },
  { id: "table-rect-black-metal-legs", label: "Rectangular Table (Black Metal Legs)", category: "tables", type: "table", variant: "rect-black-metal-legs" },
  { id: "table-rect-hairpin-legs",     label: "Rectangular Table (Hairpin Legs)", category: "tables", type: "table", variant: "rect-hairpin-legs" },
  { id: "table-rect-x-legs-wood",      label: "Rectangular Table (X-Trestle Legs)", category: "tables", type: "table", variant: "rect-x-legs-wood" },
  { id: "table-rect-black-frame-legs", label: "Rectangular Table (Black Frame Legs)", category: "tables", type: "table", variant: "rect-black-frame-legs" },
  { id: "table-rect-dark-walnut-legs", label: "Rectangular Table (Dark Walnut)", category: "tables", type: "table", variant: "rect-dark-walnut-legs" },
  { id: "table-rect-concrete-waterfall", label: "Rectangular Table (Concrete Waterfall)", category: "tables", type: "table", variant: "rect-concrete-waterfall" },
  { id: "table-rect-two-tone-oak-black", label: "Rectangular Table (Two-Tone Oak & Black)", category: "tables", type: "table", variant: "rect-two-tone-oak-black" },
  { id: "table-rect-marble-black-legs", label: "Rectangular Table (Marble, Black Legs)", category: "tables", type: "table", variant: "rect-marble-black-legs" },
  { id: "table-round-cross-glass",     label: "Round Table (Cross Base, Glass)", category: "tables", type: "table", variant: "round-cross-glass" },
  { id: "table-round-fluted-gold-ring",label: "Round Table (Fluted, Gold Ring)", category: "tables", type: "table", variant: "round-fluted-gold-ring" },
  { id: "table-round-cone-marble",     label: "Round Table (Cone, Marble)",    category: "tables", type: "table", variant: "round-cone-marble" },
  { id: "table-round-drum-stone",      label: "Round Table (Drum, Stone)",     category: "tables", type: "table", variant: "round-drum-stone" },
  { id: "table-round-cage-glass-gold", label: "Round Table (Cage Frame, Gold)",category: "tables", type: "table", variant: "round-cage-glass-gold" },
  { id: "table-round-ring-gold-marble",label: "Round Table (Gold Ring, Marble)",category: "tables", type: "table", variant: "round-ring-gold-marble" },
  { id: "table-side-ring-gold",        label: "Side Table (Gold Ring)",        category: "tables", type: "table", variant: "side-ring-gold" },
  { id: "table-side-fluted-cream",     label: "Side Table (Fluted Cream)",     category: "tables", type: "table", variant: "side-fluted-cream" },
  { id: "table-side-stacked-sphere",   label: "Side Table (Stacked Sphere)",   category: "tables", type: "table", variant: "side-stacked-sphere" },
  { id: "table-side-cone-cream",       label: "Side Table (Cone, Cream)",      category: "tables", type: "table", variant: "side-cone-cream" },
  { id: "table-side-tripod-wood",      label: "Side Table (Tripod, Wood)",     category: "tables", type: "table", variant: "side-tripod-wood" },
  { id: "table-side-drum-wood",        label: "Side Table (Drum, Wood)",       category: "tables", type: "table", variant: "side-drum-wood" },
  { id: "table-side-cone-white",       label: "Side Table (Cone, White)",      category: "tables", type: "table", variant: "side-cone-white" },
  { id: "table-coffee-stone-tripod-slab", label: "Coffee Table (Stone Tripod)", category: "tables", type: "table", variant: "coffee-stone-tripod-slab" },
  { id: "table-coffee-fluted-drum-cream", label: "Coffee Table (Fluted Drum, Cream)", category: "tables", type: "table", variant: "coffee-fluted-drum-cream" },
  { id: "table-coffee-marble-brass-drum", label: "Coffee Table (Marble, Brass Drum)", category: "tables", type: "table", variant: "coffee-marble-brass-drum" },
  { id: "table-coffee-fluted-drum-wood",  label: "Coffee Table (Fluted Drum, Wood)",  category: "tables", type: "table", variant: "coffee-fluted-drum-wood" },
  { id: "table-coffee-marble-gold-ring",  label: "Coffee Table (Marble, Gold Ring)",  category: "tables", type: "table", variant: "coffee-marble-gold-ring" },
  { id: "rug-plain-rectangular",   label: "Plain Rectangular Rug",  category: "carpets", type: "rug", variant: "plain-rectangular" },
  { id: "rug-shaggy",              label: "Shaggy Rug",             category: "carpets", type: "rug", variant: "shaggy" },
  { id: "rug-fluffy",              label: "Fluffy Rug",             category: "carpets", type: "rug", variant: "fluffy" },
  { id: "rug-low-pile",            label: "Low Pile Rug",           category: "carpets", type: "rug", variant: "low-pile" },
  { id: "rug-high-pile",           label: "High Pile Rug",          category: "carpets", type: "rug", variant: "high-pile" },
  { id: "rug-round",               label: "Round Rug",              category: "carpets", type: "rug", variant: "round" },
  { id: "rug-oval",                label: "Oval Rug",               category: "carpets", type: "rug", variant: "oval" },
  { id: "rug-runner",              label: "Runner Rug",             category: "carpets", type: "rug", variant: "runner" },
  { id: "rug-extra-long-runner",   label: "Extra Long Runner Rug",  category: "carpets", type: "rug", variant: "extra-long-runner" },
  { id: "rug-square",              label: "Square Rug",             category: "carpets", type: "rug", variant: "square" },
  { id: "rug-faux-fur",            label: "Faux Fur Rug",           category: "carpets", type: "rug", variant: "faux-fur" },
  { id: "rug-sheepskin",           label: "Sheepskin Rug",          category: "carpets", type: "rug", variant: "sheepskin" },
  { id: "rug-boucle",              label: "Bouclé Rug",             category: "carpets", type: "rug", variant: "boucle" },
  { id: "rug-woven-jute-style",    label: "Woven Jute-Style Rug",   category: "carpets", type: "rug", variant: "woven-jute-style" },
  { id: "rug-sisal-style",         label: "Sisal-Style Rug",        category: "carpets", type: "rug", variant: "sisal-style" },
  { id: "rug-vintage-pattern",     label: "Vintage Pattern Rug",    category: "carpets", type: "rug", variant: "vintage-pattern" },
  { id: "rug-oriental-pattern",    label: "Oriental Pattern Rug",   category: "carpets", type: "rug", variant: "oriental-pattern" },
  { id: "rug-modern-abstract",     label: "Modern Abstract Rug",    category: "carpets", type: "rug", variant: "modern-abstract" },
  { id: "rug-geometric",           label: "Geometric Rug",          category: "carpets", type: "rug", variant: "geometric" },
  { id: "rug-moroccan-style",      label: "Moroccan Style Rug",     category: "carpets", type: "rug", variant: "moroccan-style" },
  { id: "rug-trellis-pattern",     label: "Trellis Pattern Rug",    category: "carpets", type: "rug", variant: "trellis-pattern" },
  { id: "rug-striped",             label: "Striped Rug",            category: "carpets", type: "rug", variant: "striped" },
  { id: "rug-diamond-pattern",     label: "Diamond Pattern Rug",    category: "carpets", type: "rug", variant: "diamond-pattern" },
  { id: "rug-chevron",             label: "Chevron Rug",            category: "carpets", type: "rug", variant: "chevron" },
  { id: "rug-border-design",       label: "Border Design Rug",      category: "carpets", type: "rug", variant: "border-design" },
  { id: "panel-arch",           label: "Arch Panel",           category: "panels", type: "backdrop-panel", variant: "arch" },
  { id: "panel-double-arch",    label: "Double Arch Panel",    category: "panels", type: "backdrop-panel", variant: "double-arch" },
  { id: "panel-wave",           label: "Wave Panel",           category: "panels", type: "backdrop-panel", variant: "wave" },
  { id: "panel-circle",         label: "Circle Panel",         category: "panels", type: "backdrop-panel", variant: "circle" },
  { id: "panel-tall-rounded",   label: "Tall Rounded Panel",   category: "panels", type: "backdrop-panel", variant: "tall-rounded" },
  { id: "panel-layered",        label: "Layered Panel",        category: "panels", type: "backdrop-panel", variant: "layered" },
  { id: "panel-fan",            label: "Fan Panel",            category: "panels", type: "backdrop-panel", variant: "fan" },
  { id: "panel-scallop",        label: "Scallop Panel",        category: "panels", type: "backdrop-panel", variant: "scallop" },
  { id: "panel-square",         label: "Square Panel",         category: "panels", type: "backdrop-panel", variant: "square" },
  { id: "panel-classic-wall",   label: "Classic Wall Panel",   category: "panels", type: "backdrop-panel", variant: "classic-wall" },
  { id: "panel-slatted",        label: "Slatted Panel",        category: "panels", type: "backdrop-panel", variant: "slatted" },
  { id: "panel-grid",           label: "Grid Panel",           category: "panels", type: "backdrop-panel", variant: "grid" },
  { id: "panel-acrylic",        label: "Acrylic Panel",        category: "panels", type: "backdrop-panel", variant: "acrylic" },
  { id: "panel-half-arch",      label: "Half Arch Panel",      category: "panels", type: "backdrop-panel", variant: "half-arch" },
  { id: "panel-curved-corner",  label: "Curved Corner Panel",  category: "panels", type: "backdrop-panel", variant: "curved-corner" },
  { id: "panel-angled",         label: "Angled Panel",         category: "panels", type: "backdrop-panel", variant: "angled" },
  { id: "sign-acrylic-arch",    label: "Acrylic Arch Sign",    category: "welcome-signs", type: "welcome-sign", variant: "acrylic-arch" },
  { id: "sign-mirror",          label: "Mirror Sign",          category: "welcome-signs", type: "welcome-sign", variant: "mirror" },
  { id: "sign-minimal-arch",    label: "Minimal Arch Sign",    category: "welcome-signs", type: "welcome-sign", variant: "minimal-arch" },
  { id: "sign-round",           label: "Round Sign",           category: "welcome-signs", type: "welcome-sign", variant: "round" },
  { id: "sign-modern-wave",     label: "Modern Wave Sign",     category: "welcome-signs", type: "welcome-sign", variant: "modern-wave" },
  { id: "sign-hanging-fabric",  label: "Hanging Fabric Sign",  category: "welcome-signs", type: "welcome-sign", variant: "hanging-fabric" },
  { id: "sign-wooden-arch",     label: "Wooden Arch Sign",     category: "welcome-signs", type: "welcome-sign", variant: "wooden-arch" },
  { id: "sign-clear-frame",     label: "Clear Frame Sign",     category: "welcome-signs", type: "welcome-sign", variant: "clear-frame" },
  { id: "art-abstract-textured",     label: "Abstract Textured",     category: "wall-art", type: "wall-art", variant: "abstract-textured" },
  { id: "art-minimal-abstract",      label: "Minimal Abstract",      category: "wall-art", type: "wall-art", variant: "minimal-abstract" },
  { id: "art-neutral-brush-strokes", label: "Neutral Brush Strokes", category: "wall-art", type: "wall-art", variant: "neutral-brush-strokes" },
  { id: "art-botanical-leaves",      label: "Botanical Leaves",      category: "wall-art", type: "wall-art", variant: "botanical-leaves" },
  { id: "art-line-art",              label: "Line Art",              category: "wall-art", type: "wall-art", variant: "line-art" },
  { id: "art-landscape",             label: "Landscape",             category: "wall-art", type: "wall-art", variant: "landscape" },
  { id: "art-floral-painting",       label: "Floral Painting",       category: "wall-art", type: "wall-art", variant: "floral-painting" },
  { id: "art-gold-texture",          label: "Gold Texture",          category: "wall-art", type: "wall-art", variant: "gold-texture" },
  { id: "stage-flat-backdrop",           label: "Flat Backdrop Stage",           category: "stages", type: "stage", variant: "flat-backdrop" },
  { id: "stage-round-tiered-podium",     label: "Round Tiered Podium",           category: "stages", type: "stage", variant: "round-tiered-podium" },
  { id: "stage-inset-top-platform",      label: "Inset-Top Platform Stage",      category: "stages", type: "stage", variant: "inset-top-platform" },
  { id: "stage-wave-backdrop",           label: "Wave Backdrop Stage",           category: "stages", type: "stage", variant: "wave-backdrop" },
  { id: "stage-side-wall-panels",        label: "Side Wall Panels Stage",        category: "stages", type: "stage", variant: "side-wall-panels" },
  { id: "stage-round-arch",              label: "Round Arch Stage",              category: "stages", type: "stage", variant: "round-arch" },
  { id: "stage-tall-flat-backdrop",      label: "Tall Flat Backdrop Stage",      category: "stages", type: "stage", variant: "tall-flat-backdrop" },
  { id: "stage-arch-dome-backdrop",      label: "Arch Dome Backdrop Stage",      category: "stages", type: "stage", variant: "arch-dome-backdrop" },
  { id: "stage-tall-arch-dome-backdrop", label: "Tall Arch Dome Backdrop Stage", category: "stages", type: "stage", variant: "tall-arch-dome-backdrop" },
  { id: "stage-octagon-platform",        label: "Octagon Platform Stage",        category: "stages", type: "stage", variant: "octagon-platform" },
  { id: "stage-curved-s-tiered",         label: "Curved-S Backdrop Tiered Stage",category: "stages", type: "stage", variant: "curved-s-tiered" },
  { id: "stage-open-frame-backdrop",     label: "Open Frame Backdrop Stage",     category: "stages", type: "stage", variant: "open-frame-backdrop" },
  { id: "stage-multi-panel-backdrop",    label: "Multi-Panel Backdrop Stage",    category: "stages", type: "stage", variant: "multi-panel-backdrop" },
  { id: "stage-round-drum",              label: "Round Drum Stage",              category: "stages", type: "stage", variant: "round-drum" },
  { id: "stage-tiered-pyramid",          label: "Tiered Pyramid Stage",          category: "stages", type: "stage", variant: "tiered-pyramid" },
  { id: "stage-curtain-backdrop",        label: "Curtain Backdrop Stage",        category: "stages", type: "stage", variant: "curtain-backdrop" },
  { id: "stage-organic-platform",        label: "Organic Platform Stage",        category: "stages", type: "stage", variant: "organic-platform" },
  { id: "stage-hexagon-platform",        label: "Hexagon Platform Stage",        category: "stages", type: "stage", variant: "hexagon-platform" },
  { id: "stage-triple-arch-backdrop",    label: "Triple Arch Backdrop Stage",    category: "stages", type: "stage", variant: "triple-arch-backdrop" },
  { id: "stage-corner-backdrop",         label: "Corner Backdrop Stage",         category: "stages", type: "stage", variant: "corner-backdrop" },

  // Balloons — every variant defaults to a distinct vivid color (never
  // white) specifically so the catalog list reads clearly at a glance, per
  // request, even though the reference sheet itself was shot all-white.
  { id: "bln-round-tassel",          label: "Round Balloon (Tassel)",          category: "balloons", type: "balloon", variant: "round-tassel" },
  { id: "bln-round-small",           label: "Small Round Balloon",             category: "balloons", type: "balloon", variant: "round-small" },
  { id: "bln-heart-foil",            label: "Heart Foil Balloon",              category: "balloons", type: "balloon", variant: "heart-foil" },
  { id: "bln-star-foil",             label: "Star Foil Balloon",               category: "balloons", type: "balloon", variant: "star-foil" },
  { id: "bln-round-foil",            label: "Round Foil Balloon",              category: "balloons", type: "balloon", variant: "round-foil" },
  { id: "bln-oval-classic",          label: "Oval Balloon",                    category: "balloons", type: "balloon", variant: "oval-classic" },
  { id: "bln-pillow-foil",           label: "Pillow Foil Balloon",             category: "balloons", type: "balloon", variant: "pillow-foil" },
  { id: "bln-diamond-foil",          label: "Diamond Foil Balloon",            category: "balloons", type: "balloon", variant: "diamond-foil" },
  { id: "bln-cluster-tassel",        label: "Balloon Cluster (Tasseled)",      category: "balloons", type: "balloon", variant: "cluster-tassel" },
  { id: "bln-cluster-mixed",         label: "Balloon Cluster (Mixed)",         category: "balloons", type: "balloon", variant: "cluster-mixed" },
  { id: "bln-cluster-hearts",        label: "Balloon Cluster (Hearts)",        category: "balloons", type: "balloon", variant: "cluster-hearts" },
  { id: "bln-cluster-stars",         label: "Balloon Cluster (Stars)",         category: "balloons", type: "balloon", variant: "cluster-stars" },
  { id: "bln-cluster-large",         label: "Large Balloon Cluster",           category: "balloons", type: "balloon", variant: "cluster-large" },
  { id: "bln-bubble-tassel",         label: "Bubble Balloon (Tasseled)",       category: "balloons", type: "balloon", variant: "bubble-tassel" },
  { id: "bln-confetti-cluster",      label: "Confetti Balloon Cluster",        category: "balloons", type: "balloon", variant: "confetti-cluster" },
  { id: "bln-tower-boxes",           label: "Balloon Tower (Boxes)",           category: "balloons", type: "balloon", variant: "tower-boxes" },
  { id: "bln-arch-full",             label: "Balloon Arch (Full)",             category: "balloons", type: "balloon", variant: "arch-full" },
  { id: "bln-arch-half",             label: "Balloon Arch (Half)",             category: "balloons", type: "balloon", variant: "arch-half" },
  { id: "bln-ring-open",             label: "Balloon Ring (On Stand)",         category: "balloons", type: "balloon", variant: "ring-open" },
  { id: "bln-ring-wreath",           label: "Balloon Wreath",                  category: "balloons", type: "balloon", variant: "ring-wreath" },
  { id: "bln-arc-partial",           label: "Balloon Arc (Partial)",           category: "balloons", type: "balloon", variant: "arc-partial" },
  { id: "bln-column-round",          label: "Balloon Column (Round)",          category: "balloons", type: "balloon", variant: "column-round" },
  { id: "bln-column-tapered",        label: "Balloon Column (Tapered)",        category: "balloons", type: "balloon", variant: "column-tapered" },
  { id: "bln-column-heart",          label: "Balloon Column (Hearts)",         category: "balloons", type: "balloon", variant: "column-heart" },
  { id: "bln-column-star",           label: "Balloon Column (Stars)",          category: "balloons", type: "balloon", variant: "column-star" },
  { id: "bln-column-cluster-organic",label: "Balloon Garland Column (Organic)",category: "balloons", type: "balloon", variant: "column-cluster-organic" },
  { id: "bln-column-cluster-dense",  label: "Balloon Garland Column (Dense)",  category: "balloons", type: "balloon", variant: "column-cluster-dense" },
  { id: "bln-wall-grid",             label: "Balloon Wall (Grid)",             category: "balloons", type: "balloon", variant: "wall-grid" },
  { id: "bln-wall-organic",          label: "Balloon Wall (Organic)",          category: "balloons", type: "balloon", variant: "wall-organic" },
  { id: "curtain-sheer-straight-double", label: "Sheer Straight Curtain",       category: "curtains", type: "sheer-curtain", variant: "sheer-straight-double" },
  { id: "curtain-tieback-classic",       label: "Curtain with Tiebacks (Classic)", category: "curtains", type: "sheer-curtain", variant: "tieback-classic" },
  { id: "curtain-straight-heavy",        label: "Straight Curtain (Heavy Panel)", category: "curtains", type: "sheer-curtain", variant: "straight-heavy" },
  { id: "curtain-tieback-elegant",       label: "Curtain with Tiebacks (Elegant)", category: "curtains", type: "sheer-curtain", variant: "tieback-elegant" },
  { id: "curtain-swag-arch-full",        label: "Full Arch Swag Curtain",       category: "curtains", type: "sheer-curtain", variant: "swag-arch-full" },
  { id: "curtain-single-flat",           label: "Single Flat Curtain",          category: "curtains", type: "sheer-curtain", variant: "single-flat" },
  { id: "curtain-center-swoop-valance",  label: "Center Swoop Valance",         category: "curtains", type: "sheer-curtain", variant: "center-swoop-valance" },
  { id: "curtain-sheer-voile",           label: "Sheer Voile Curtain",          category: "curtains", type: "sheer-curtain", variant: "sheer-voile" },
  { id: "curtain-wide-backdrop",         label: "Wide Flat Backdrop Curtain",   category: "curtains", type: "sheer-curtain", variant: "wide-backdrop" },
  { id: "curtain-center-gathered",       label: "Center-Gathered Curtain",      category: "curtains", type: "sheer-curtain", variant: "center-gathered" },
  { id: "curtain-tieback-simple",        label: "Curtain with Tiebacks (Simple)", category: "curtains", type: "sheer-curtain", variant: "tieback-simple" },
  { id: "curtain-eyelet-plain",          label: "Eyelet Curtain",               category: "curtains", type: "sheer-curtain", variant: "eyelet-plain" },
  { id: "curtain-twin-tieback-arch",     label: "Twin Tieback Arch Curtain",    category: "curtains", type: "sheer-curtain", variant: "twin-tieback-arch" },
  { id: "curtain-straight-simple",       label: "Straight Curtain (Simple)",    category: "curtains", type: "sheer-curtain", variant: "straight-simple" },
  { id: "curtain-swag-with-tails",       label: "Swag Curtain with Tails",      category: "curtains", type: "sheer-curtain", variant: "swag-with-tails" },
  { id: "curtain-eyelet-tieback",        label: "Eyelet Curtain with Tieback",  category: "curtains", type: "sheer-curtain", variant: "eyelet-tieback" },
  { id: "curtain-tieback-rope",          label: "Curtain with Rope Tie",        category: "curtains", type: "sheer-curtain", variant: "tieback-rope" },
  { id: "curtain-wide-flat-pooled",      label: "Wide Flat Curtain (Pooled)",   category: "curtains", type: "sheer-curtain", variant: "wide-flat-pooled" },
  { id: "curtain-tieback-bow",           label: "Curtain with Bow Tie",         category: "curtains", type: "sheer-curtain", variant: "tieback-bow" },
  { id: "curtain-tieback-buckle",        label: "Curtain with Buckle Tie",      category: "curtains", type: "sheer-curtain", variant: "tieback-buckle" },
  { id: "curtain-wide-no-rod",           label: "Wide Flat Curtain (No Rod)",   category: "curtains", type: "sheer-curtain", variant: "wide-no-rod" },
  { id: "curtain-single-no-rod",         label: "Single Flat Curtain (No Rod)", category: "curtains", type: "sheer-curtain", variant: "single-no-rod" },
  { id: "curtain-rod-holder",            label: "Curtain Rod",                 category: "curtains", type: "curtain-rod",   variant: "default" },
  { id: "curtain-tie-band",              label: "Curtain Tie (Band)",           category: "curtains", type: "curtain-tie",  variant: "band" },
  { id: "curtain-tie-rope",              label: "Curtain Tie (Rope)",           category: "curtains", type: "curtain-tie",  variant: "rope" },
  { id: "curtain-tie-bow",               label: "Curtain Tie (Bow)",            category: "curtains", type: "curtain-tie",  variant: "bow" },
  { id: "curtain-tie-buckle",            label: "Curtain Tie (Buckle)",         category: "curtains", type: "curtain-tie",  variant: "buckle" },
  { id: "flower-wall",   label: "Flower Wall",      category: "plants", type: "flower-wall",   variant: "default" },
  { id: "plant",         label: "Plant",            category: "plants", type: "plant",         variant: "default" },
  { id: "led-wall",      label: "LED Wall",         category: "lighting",  type: "led-wall",      variant: "default" },
  { id: "spotlight",     label: "Spotlight",        category: "lighting",  type: "spotlight",     variant: "default" },
  { id: "ceiling-light", label: "Ceiling Light",    category: "lighting",  type: "ceiling-light", variant: "default" },
  { id: "chandelier",    label: "Chandelier",       category: "lighting",  type: "chandelier",    variant: "default" },
  { id: "led-bar",       label: "LED Bar",          category: "lighting",  type: "led-bar",       variant: "default" },
  { id: "fairy-lights",  label: "Fairy Lights",     category: "lighting",  type: "fairy-lights",  variant: "default" },

  // Chairs & Sofas (reference sheets: chiavari/cross-back/bentwood/tub
  // chair grid + curved/tufted/sectional sofa grid) — every variant gets
  // its own saturated color rather than the all-white/ivory tones shown in
  // the reference photos, per the catalog-wide visible-color rule.
  { id: "chair-chiavari-rose",       label: "Chiavari Chair (Rose, Silver Frame)", category: "chairs", type: "chair-item", variant: "chiavari-rose" },
  { id: "chair-chiavari-navy-gold",  label: "Chiavari Chair (Navy, Gold Frame)",   category: "chairs", type: "chair-item", variant: "chiavari-navy-gold" },
  { id: "chair-crossback-rustic",    label: "Cross-Back Chair (Rustic Terracotta)",category: "chairs", type: "chair-item", variant: "crossback-rustic" },
  { id: "chair-crossback-charcoal",  label: "Cross-Back Chair (Charcoal)",         category: "chairs", type: "chair-item", variant: "crossback-charcoal" },
  { id: "chair-bentwood-tan",        label: "Bentwood Café Chair (Tan)",           category: "chairs", type: "chair-item", variant: "bentwood-tan" },
  { id: "chair-bentwood-slate",      label: "Bentwood Café Chair (Slate Blue)",    category: "chairs", type: "chair-item", variant: "bentwood-slate" },
  { id: "chair-cane-oval-natural",   label: "Cane Oval-Back Chair (Natural)",      category: "chairs", type: "chair-item", variant: "cane-oval-natural" },
  { id: "chair-cane-oval-blue",      label: "Cane Oval-Back Chair (Blue)",         category: "chairs", type: "chair-item", variant: "cane-oval-blue" },
  { id: "chair-cane-oval-green",     label: "Cane Oval-Back Chair (Green)",        category: "chairs", type: "chair-item", variant: "cane-oval-green" },
  { id: "chair-shell-channel-purple",label: "Shell Channel-Back Chair (Purple Velvet)", category: "chairs", type: "chair-item", variant: "shell-channel-purple" },
  { id: "chair-shell-channel-teal",  label: "Shell Channel-Back Chair (Teal)",     category: "chairs", type: "chair-item", variant: "shell-channel-teal" },
  { id: "chair-shell-channel-mustard",label:"Shell Channel-Back Chair (Mustard)",  category: "chairs", type: "chair-item", variant: "shell-channel-mustard" },
  { id: "chair-tub-barrel-tan",      label: "Tub Barrel Chair (Tan Bouclé)",       category: "chairs", type: "chair-item", variant: "tub-barrel-tan" },
  { id: "chair-tub-barrel-rose",     label: "Tub Barrel Chair (Rose)",             category: "chairs", type: "chair-item", variant: "tub-barrel-rose" },
  { id: "chair-tub-barrel-navy",     label: "Tub Barrel Chair (Navy, Metal Legs)", category: "chairs", type: "chair-item", variant: "tub-barrel-navy" },
  { id: "chair-wire-frame-black",    label: "Wire Frame Chair (Black)",            category: "chairs", type: "chair-item", variant: "wire-frame-black" },
  { id: "chair-wire-frame-copper",   label: "Wire Frame Chair (Copper)",           category: "chairs", type: "chair-item", variant: "wire-frame-copper" },
  { id: "chair-molded-shell-mustard",label: "Molded Shell Chair (Mustard)",        category: "chairs", type: "chair-item", variant: "molded-shell-mustard" },
  { id: "chair-molded-shell-teal",   label: "Molded Shell Chair (Teal)",           category: "chairs", type: "chair-item", variant: "molded-shell-teal" },
  { id: "chair-open-arm-rose-gold",  label: "Open-Arm Chair (Rose, Gold)",         category: "chairs", type: "chair-item", variant: "open-arm-rose-gold" },
  { id: "chair-open-arm-forest-black",label:"Open-Arm Chair (Forest, Black)",      category: "chairs", type: "chair-item", variant: "open-arm-forest-black" },
  { id: "chair-open-arm-terracotta-gold", label: "Open-Arm Chair (Terracotta, Gold)", category: "chairs", type: "chair-item", variant: "open-arm-terracotta-gold" },
  { id: "chair-diamond-tufted-burgundy", label: "Diamond-Tufted Chair (Burgundy)", category: "chairs", type: "chair-item", variant: "diamond-tufted-burgundy" },
  { id: "chair-diamond-tufted-navy", label: "Diamond-Tufted Chair (Navy)",         category: "chairs", type: "chair-item", variant: "diamond-tufted-navy" },
  { id: "chair-channel-back-sage",   label: "Channel-Back Chair (Sage)",           category: "chairs", type: "chair-item", variant: "channel-back-sage" },
  { id: "chair-channel-back-plum",   label: "Channel-Back Chair (Plum)",           category: "chairs", type: "chair-item", variant: "channel-back-plum" },
  { id: "chair-sled-base-charcoal",  label: "Sled-Base Chair (Charcoal)",          category: "chairs", type: "chair-item", variant: "sled-base-charcoal" },
  { id: "chair-sled-base-rust",      label: "Sled-Base Chair (Rust)",              category: "chairs", type: "chair-item", variant: "sled-base-rust" },

  { id: "sofa-track-arm-navy",       label: "Track-Arm Sofa (Navy)",               category: "chairs", type: "sofa-item", variant: "track-arm-navy" },
  { id: "sofa-track-arm-olive",      label: "Track-Arm Loveseat (Olive)",          category: "chairs", type: "sofa-item", variant: "track-arm-olive" },
  { id: "sofa-track-arm-rust",       label: "Track-Arm Sofa (Rust)",               category: "chairs", type: "sofa-item", variant: "track-arm-rust" },
  { id: "sofa-rolled-arm-burgundy",  label: "Rolled-Arm Sofa (Burgundy, Tufted)",  category: "chairs", type: "sofa-item", variant: "rolled-arm-burgundy" },
  { id: "sofa-rolled-arm-teal",      label: "Rolled-Arm Sofa (Teal, Tufted)",      category: "chairs", type: "sofa-item", variant: "rolled-arm-teal" },
  { id: "sofa-rolled-arm-mustard",   label: "Rolled-Arm Loveseat (Mustard)",       category: "chairs", type: "sofa-item", variant: "rolled-arm-mustard" },
  { id: "sofa-channel-curved-terracotta", label: "Curved Channel-Tufted Sofa (Terracotta)", category: "chairs", type: "sofa-item", variant: "channel-curved-terracotta" },
  { id: "sofa-channel-curved-forest",label: "Curved Channel-Tufted Sofa (Forest)", category: "chairs", type: "sofa-item", variant: "channel-curved-forest" },
  { id: "sofa-channel-curved-plum",  label: "Curved Channel-Tufted Sofa (Plum)",   category: "chairs", type: "sofa-item", variant: "channel-curved-plum" },
  { id: "sofa-chesterfield-cognac",  label: "Chesterfield Sofa (Cognac)",          category: "chairs", type: "sofa-item", variant: "chesterfield-cognac" },
  { id: "sofa-chesterfield-emerald", label: "Chesterfield Sofa (Emerald)",         category: "chairs", type: "sofa-item", variant: "chesterfield-emerald" },
  { id: "sofa-chesterfield-charcoal",label: "Chesterfield Sofa (Charcoal, Silver)",category: "chairs", type: "sofa-item", variant: "chesterfield-charcoal" },
  { id: "sofa-sectional-navy",       label: "Sectional Sofa w/ Chaise (Navy, Right)", category: "chairs", type: "sofa-item", variant: "sectional-navy" },
  { id: "sofa-sectional-sage",       label: "Sectional Sofa w/ Chaise (Sage, Left)",  category: "chairs", type: "sofa-item", variant: "sectional-sage" },
  { id: "sofa-sectional-charcoal",   label: "Sectional Sofa w/ Chaise (Charcoal, Right)", category: "chairs", type: "sofa-item", variant: "sectional-charcoal" },
  { id: "sofa-scroll-arm-burgundy",  label: "Scroll-Arm Sofa (Burgundy, Gold Legs)",  category: "chairs", type: "sofa-item", variant: "scroll-arm-burgundy" },
  { id: "sofa-scroll-arm-navy",      label: "Scroll-Arm Sofa (Navy, Wood Legs)",   category: "chairs", type: "sofa-item", variant: "scroll-arm-navy" },
  { id: "sofa-scroll-arm-forest",    label: "Scroll-Arm Sofa (Forest)",            category: "chairs", type: "sofa-item", variant: "scroll-arm-forest" },
  { id: "sofa-pillow-back-rust",     label: "Pillow-Back Sofa (Rust)",             category: "chairs", type: "sofa-item", variant: "pillow-back-rust" },
  { id: "sofa-pillow-back-plum",     label: "Pillow-Back Loveseat (Plum)",         category: "chairs", type: "sofa-item", variant: "pillow-back-plum" },
  { id: "sofa-pillow-back-teal",     label: "Pillow-Back Sofa (Teal)",             category: "chairs", type: "sofa-item", variant: "pillow-back-teal" },
  { id: "sofa-cocoon-blush",         label: "Curved Cocoon Sofa (Blush)",          category: "chairs", type: "sofa-item", variant: "cocoon-blush" },
  { id: "sofa-cocoon-mustard",       label: "Curved Cocoon Sofa (Mustard, Gold Legs)", category: "chairs", type: "sofa-item", variant: "cocoon-mustard" },
  { id: "sofa-cocoon-charcoal",      label: "Curved Cocoon Sofa (Charcoal)",       category: "chairs", type: "sofa-item", variant: "cocoon-charcoal" },
  { id: "sofa-tuxedo-navy",          label: "Tuxedo Sofa (Navy, Gold Trim)",       category: "chairs", type: "sofa-item", variant: "tuxedo-navy" },
  { id: "sofa-tuxedo-olive",         label: "Tuxedo Sofa (Olive, Gold Trim)",      category: "chairs", type: "sofa-item", variant: "tuxedo-olive" },
  { id: "sofa-shell-scallop-purple", label: "Shell Scallop-Back Sofa (Purple)",    category: "chairs", type: "sofa-item", variant: "shell-scallop-purple" },
  { id: "sofa-shell-scallop-teal",   label: "Shell Scallop-Back Sofa (Teal)",      category: "chairs", type: "sofa-item", variant: "shell-scallop-teal" },
  { id: "sofa-shell-scallop-rose",   label: "Shell Scallop-Back Sofa (Rose)",      category: "chairs", type: "sofa-item", variant: "shell-scallop-rose" },
];

/* Generic per-type label for the popover title — decoupled from ELEMENTS
   since several catalog entries (variants) now share one base type. */
const TYPE_LABELS = {
  "round-table": "Round Table", "rect-table": "Rectangle Table", chair: "Chair", sofa: "Sofa",
  bench: "Bench",
  "buffet-table": "Buffet Table", "cake-table": "Cake Table", "coffee-corner": "Coffee Corner",
  "drinks-station": "Drinks Station", "coffee-booth": "Coffee Booth",
  "mini-plant": "Mini Plant", "flower-arrangement": "Flower Arrangement",
  "umbrella-cart": "Umbrella Cart", "kiosk-booth": "Kiosk Booth", "umbrella-table": "Umbrella Table",
  "display-pedestals": "Display Pedestals", "mini-umbrella-cart": "Mini Umbrella Cart",
  "umbrella-cart-wheeled": "Umbrella Cart (Wheeled)", "curtain-photo-booth": "Curtain Photo Booth",
  "backdrop-wall": "Backdrop Wall",
  "floral-arch-backdrop": "Floral Arch Backdrop", "drape-arch-backdrop": "Drape Arch Backdrop",
  "balloon-arch-bow": "Balloon Arch (with Bow)", "name-arch-backdrop": "Name Arch Backdrop",
  "window-counter-booth": "Window Counter Booth", "panel-sconce-stand": "Panel & Sconce Stand",
  "arch-bookshelf": "Arch Bookshelf", "curtain-backdrop-bow": "Curtain Backdrop",
  "storefront-facade": "Storefront Facade", "paneled-counter": "Paneled Counter",
  "round-reception-desk": "Round Reception Desk",
  "arch-panel-plain": "Arch Panel (Plain)", "arch-panel-fluted": "Arch Panel (Fluted)",
  "dual-arch-mixed": "Dual Arch (Mixed)", "pedestal-duo-plain": "Pedestal Duo (Plain)",
  "pedestal-duo-fluted": "Pedestal Duo (Fluted)", "pedestal-single-plain": "Pedestal (Plain)",
  "pedestal-single-fluted": "Pedestal (Fluted)", "fluted-panel-wall": "Fluted Wall Panel",
  "tiered-stand-fluted": "Tiered Stand (Fluted)", "tiered-stand-acrylic": "Tiered Stand (Acrylic)",
  "card-box": "Card Box", "guest-book": "Guest Book", "fluted-bowl-duo": "Fluted Bowl Duo",
  "fluted-vase": "Fluted Vase",
  "flower-cluster-spray": "Flower Cluster (Spray)", "flower-cluster-bouquet": "Flower Cluster (Bouquet)",
  "candle-cluster": "Candle Cluster",
  "floral-swag-horizontal": "Floral Swag (Horizontal)", "floral-swag-corner": "Floral Corner Drape",
  "floral-cascade-teardrop": "Floral Cascade (Teardrop)", "floral-arch-garland": "Floral Arch Garland",
  "floral-swag-crescent": "Floral Table Runner",
  "bouquet-round-rose": "Bouquet (Round Rose)", "bouquet-cascade": "Bouquet (Cascade)",
  "bouquet-wildflower": "Bouquet (Wildflower)", "bouquet-lily": "Bouquet (Lily)",
  "bouquet-tulip": "Bouquet (Tulip)", "bouquet-calla": "Bouquet (Calla Lily)",
  "flower-stem": "Flower Stem", "greenery-stem": "Greenery Stem",
  "potted-plant": "Potted Plant", "peace-lily": "Peace Lily", vase: "Vase",
  table: "Table", rug: "Rug", stage: "Stage", balloon: "Balloon",
  "backdrop-panel": "Backdrop Panel", "welcome-sign": "Welcome Sign", "wall-art": "Wall Art",
  "sheer-curtain": "Curtain", "curtain-rod": "Curtain Rod", "curtain-tie": "Curtain Tie",
  "flower-wall": "Flower Wall",
  plant: "Plant",
  "led-wall": "LED Wall", spotlight: "Spotlight", "ceiling-light": "Ceiling Light",
  chandelier: "Chandelier", "led-bar": "LED Bar", "fairy-lights": "Fairy Lights",
  "chair-item": "Chair", "sofa-item": "Sofa",
};

/* ── Per-part coloring for multi-piece event stations ──
   Only types listed here get a per-part color section in the popover —
   everything else keeps the single overall Color swatch row. Keys must
   match the userData.part tags set on the meshes in build3DObject. */
const PART_LABELS = {
  "umbrella-cart":         { canopy: "Umbrella Canopy", pole: "Pole", counter: "Counter Body", shelf: "Corner Shelf" },
  "kiosk-booth":           { roof: "Roof", body: "Booth Body", curtain: "Curtain", trim: "Ribbon Trim" },
  "umbrella-table":        { canopy: "Umbrella Canopy", pole: "Pole", table: "Table Top" },
  "display-pedestals":     { pedestalA: "Tall Pedestal", pedestalB: "Wide Pedestal", pedestalC: "Short Pedestal" },
  "mini-umbrella-cart":    { canopy: "Umbrella Canopy", pole: "Pole", counter: "Counter Body" },
  "umbrella-cart-wheeled": { canopy: "Umbrella Canopy", pole: "Pole", counter: "Counter Body", cooler: "Side Cooler", wheel: "Wheel" },
  "curtain-photo-booth":   { shell: "Outer Shell", curtain: "Curtain", sign: "Header Sign" },
  "backdrop-wall":         { panel: "Wall Panels", lamp: "Lamps", planter: "Planter Boxes" },
  "floral-arch-backdrop":  { panel: "Arch Panels", flowers: "Flowers", pedestal: "Pedestals" },
  "drape-arch-backdrop":   { panel: "Arch Panel", drape: "Drape", candle: "Candle Stands", urn: "Flower Urns" },
  "balloon-arch-bow":      { balloons: "Balloon Garland", bow: "Bow" },
  "name-arch-backdrop":    { panel: "Arch Panels", flowers: "Flowers", pedestal: "Pedestal" },
  "window-counter-booth":  { counter: "Counter", window: "Window Frame", sconce: "Sconces" },
  "panel-sconce-stand":    { panel: "Panels", sconce: "Sconce" },
  "arch-bookshelf":        { frame: "Arch Frame", shelf: "Shelves" },
  "curtain-backdrop-bow":  { rod: "Rod", curtain: "Curtains", bow: "Bows" },
  "storefront-facade":     { wall: "Wall", window: "Window Arches", awning: "Awnings" },
  "paneled-counter":       { body: "Counter Body", trim: "Panel Trim" },
  "round-reception-desk":  { body: "Desk Body", sign: "Arch Sign", sconce: "Sconce" },
  "arch-panel-plain":      { panel: "Arch Panel" },
  "arch-panel-fluted":     { panel: "Arch Panel" },
  "dual-arch-mixed":       { panelPlain: "Plain Arch", panelFluted: "Fluted Arch" },
  "pedestal-duo-plain":    { pedestalShort: "Short Pedestal", pedestalTall: "Tall Pedestal" },
  "pedestal-duo-fluted":   { pedestalShort: "Short Pedestal", pedestalTall: "Tall Pedestal" },
  "pedestal-single-plain": { pedestal: "Pedestal" },
  "pedestal-single-fluted":{ pedestal: "Pedestal" },
  "fluted-panel-wall":     { panel: "Wall Panel" },
  "tiered-stand-fluted":   { base: "Base", tiers: "Tiers" },
  "tiered-stand-acrylic":  { stem: "Stem", tiers: "Tiers" },
  "card-box":              { box: "Box", slot: "Slot" },
  "guest-book":            { cover: "Cover" },
  "fluted-bowl-duo":       { bowlA: "Large Bowl", bowlB: "Small Bowl" },
  "fluted-vase":           { vase: "Vase" },
  "flower-cluster-spray":   { blooms: "Flowers", stems: "Stems" },
  "flower-cluster-bouquet": { blooms: "Flowers" },
  "candle-cluster":         { jar: "Glass Jars", candle: "Candles" },
  "floral-swag-horizontal":  { blooms: "Flowers", leaves: "Leaves" },
  "floral-swag-corner":      { blooms: "Flowers", leaves: "Leaves" },
  "floral-cascade-teardrop": { blooms: "Flowers", leaves: "Leaves" },
  "floral-arch-garland":     { blooms: "Flowers", leaves: "Leaves" },
  "floral-swag-crescent":    { blooms: "Flowers", leaves: "Leaves" },
  "bouquet-round-rose": { blooms: "Flowers", leaves: "Leaves", stems: "Stems & Wrap" },
  "bouquet-cascade":    { blooms: "Flowers", leaves: "Leaves", stems: "Stems & Wrap" },
  "bouquet-wildflower": { blooms: "Flowers", leaves: "Leaves", stems: "Stems & Wrap" },
  "bouquet-lily":       { blooms: "Flowers", leaves: "Leaves", stems: "Stems & Wrap" },
  "bouquet-tulip":      { blooms: "Flowers", leaves: "Leaves", stems: "Stems & Wrap" },
  "bouquet-calla":      { blooms: "Flowers", leaves: "Leaves", stems: "Stems & Wrap" },
  "flower-stem":   { blooms: "Flowers", leaves: "Leaves" },
  "greenery-stem": { leaves: "Leaves" },
  "potted-plant": { pot: "Pot", trunk: "Stems/Trunk", leaves: "Leaves" },
  "peace-lily":   { pot: "Pot", leaves: "Leaves", blooms: "Flowers" },
  vase: { body: "Vase" },
  table: { top: "Tabletop", base: "Base" },
  rug: { rug: "Rug", pattern: "Pattern Accent" },
  stage: { platform: "Platform & Steps", backdrop: "Backdrop" },
  balloon: { balloons: "Balloons", accent: "Accent Balloons", trim: "Stand / String / Frame" },
  "backdrop-panel": { panel: "Panel" },
  "welcome-sign": { panel: "Sign Panel", stand: "Stand", blooms: "Flowers", leaves: "Leaves" },
  "wall-art": { frame: "Frame", canvas: "Canvas" },
  "sheer-curtain": { rod: "Rod", curtain: "Curtain Fabric" },
  "curtain-rod": { rod: "Rod" },
  "curtain-tie": { curtain: "Tie Color" },
  "chair-item": { body: "Chair" },
  "sofa-item": { body: "Sofa" },
};

/* Advanced Edit's sentinel for "no tagged sub-parts, edit the whole thing"
   — used for the majority of the catalog (chairs, tables, most equipment)
   that's a single unified mesh rather than a named-part station. Selecting
   it in the component panel reuses the item's existing whole-object color/
   material/scale/position/rotation fields instead of the partColors/
   partMaterials/partTransforms dictionaries, so there's no separate empty
   per-part system to keep in sync for objects that only ever have one part. */
const WHOLE_PART = "__whole__";
const getPartLabel = (item, part) =>
  part === WHOLE_PART ? (TYPE_LABELS[item.type] || "Object") : ((PART_LABELS[item.type] || {})[part] || part);

/* ── Context-aware ranking (docs/customization-system-design.md §5) ──
   Ordered lists of catalog ids to float to the top of the library for a
   given Event Type. Nothing is ever hidden — every object stays reachable,
   only the order changes — and guest count never factors in here at all,
   it's kept scoped purely to capacity guidance elsewhere. */
const EVENT_TYPE_PRIORITY = {
  education: [
    "rect-table", "chair-banquet", "led-wall", "stage-flat-backdrop",
  ],
  celebration: [
    "chair-wedding", "round-table-banquet", "round-table", "flower-wall",
    "cake-table", "chandelier", "fairy-lights", "chair-modern", "led-wall",
  ],
  business: [
    "rect-table", "chair-banquet", "rect-table-banquet", "led-wall",
    "buffet-table", "drinks-station",
  ],
  entertainment: [
    "stage-flat-backdrop", "led-wall", "spotlight", "fairy-lights", "chair-modern",
  ],
  culture: [
    "led-wall", "spotlight", "flower-wall", "arch-bookshelf",
  ],
  sports: [
    "chair-banquet", "chair-modern",
  ],
  wellness: [
    "mini-plant", "potted-rubber-plant", "plant", "sofa-modern",
  ],
  technology: [
    "led-wall", "kiosk-booth", "rect-table", "chair-modern",
  ],
  "food-drink": [
    "buffet-table", "drinks-station", "coffee-booth-modern", "kiosk-booth",
  ],
  community: [
    "round-table", "chair-modern", "sofa-modern", "mini-plant",
  ],
  other: [],
};
const RECOMMENDED_COUNT = 6; // how many top-ranked items get the badge

const wallColorPresets  = ["#ffffff","#f5f0ff","#fdf6ec","#ecf0f1","#d6eaf8","#eafaf1","#2c3e50","#1a1a2e"];
const floorColorPresets = ["#f5f5f5","#f0e6d3","#d5b896","#c8b89a","#95a5a6","#5d4037","#263238","#e8e0f0"];
const itemColorPresets  = ["#8B5E3C","#c4b5fd","#7c3aed","#ffffff","#1e1b4b","#d97706","#16a34a","#ef4444","#374151","#f9a8d4"];
// A dedicated set of white shades — a single flat "#ffffff" swatch reads as
// dull grey once it's lit in the 3D scene, so white items get their own row
// of real whites to pick from (pure, warm, cool, ivory) instead of one
// washed-out option.
const whiteShadePresets = ["#ffffff","#fffdf7","#fdf6e3","#f5f5f0","#eef1f5","#faf3e8"];

/* ── Material presets (docs/customization-system-design.md §3) ──
   One shared vocabulary across every object type, structural or not, so a
   table and a floor can both be "wood" and mean the same thing. Values are
   roughness/metalness for MeshStandardMaterial; glass additionally goes
   transparent. Applied uniformly across an object's sub-meshes — good
   enough fidelity for this project's scope without needing per-part
   material slots. */
const MATERIAL_PRESETS = {
  wood:     { label: "Wood",     roughness: 0.75, metalness: 0.0  },
  marble:   { label: "Marble",   roughness: 0.15, metalness: 0.05 },
  glass:    { label: "Glass",    roughness: 0.05, metalness: 0.1, transparent: true, opacity: 0.4 },
  metal:    { label: "Metal",    roughness: 0.3,  metalness: 0.85 },
  fabric:   { label: "Fabric",   roughness: 0.95, metalness: 0.0  },
  plastic:  { label: "Plastic",  roughness: 0.5,  metalness: 0.05 },
  concrete: { label: "Concrete", roughness: 0.9,  metalness: 0.0  },
  stone:    { label: "Stone",    roughness: 0.8,  metalness: 0.05 },
};
const MATERIAL_LIST = Object.keys(MATERIAL_PRESETS);
const DEFAULT_MATERIAL = "plastic";

/* ── Booth branding (docs/coffee-corner-design.md §5) ──
   A small curated font list rather than exposing every system font — kept
   short and reliably renderable across platforms via canvas. */
const BRANDING_FONTS = ["Poppins", "Georgia", "Courier New", "Brush Script MT", "Verdana"];
const DEFAULT_BRANDING_FONT = BRANDING_FONTS[0];
const BRANDING_SIZE_MIN = 24, BRANDING_SIZE_MAX = 88, BRANDING_SIZE_STEP = 4;
const BRANDING_OFFSET_MIN = -0.5, BRANDING_OFFSET_MAX = 0.5, BRANDING_OFFSET_STEP = 0.1;
const BRANDABLE_TYPES = new Set([
  "coffee-booth", "umbrella-cart", "kiosk-booth", "umbrella-table", "display-pedestals",
  "mini-umbrella-cart", "umbrella-cart-wheeled", "curtain-photo-booth", "backdrop-wall",
  "floral-arch-backdrop", "drape-arch-backdrop", "balloon-arch-bow", "name-arch-backdrop",
  "window-counter-booth", "panel-sconce-stand", "arch-bookshelf", "curtain-backdrop-bow",
  "storefront-facade", "paneled-counter", "round-reception-desk",
  "backdrop-panel", "welcome-sign",
]);

/* The shared branding panel defaults to y=0.5/z=0.311, tuned for
   coffee-booth counter height. Every other station shape below is a
   different height/depth, so each gets its own placement here rather than
   the text floating inside the object or off its face. */
const BRANDING_PANEL_POS = {
  "floral-arch-backdrop": { y: 1.3,  z: 0.08 },
  "drape-arch-backdrop":  { y: 1.3,  z: 0.1  },
  "balloon-arch-bow":     { y: 1.6,  z: 0.15 },
  "name-arch-backdrop":   { y: 1.25, z: 0.18 },
  "window-counter-booth": { y: 0.5,  z: 0.32 },
  "panel-sconce-stand":   { y: 1.05, z: 0.09 },
  "arch-bookshelf":       { y: 1.7,  z: 0.2  },
  "curtain-backdrop-bow": { y: 1.95, z: 0.05 },
  "storefront-facade":    { y: 1.6,  z: 0.1  },
  "paneled-counter":      { y: 0.45, z: 0.31 },
  "round-reception-desk": { y: 0.98, z: 0.5  },
  "backdrop-panel:arch":            { y: 0.95, z: 0.06 },
  "backdrop-panel:double-arch":     { y: 0.85, z: 0.06 },
  "backdrop-panel:wave":            { y: 0.9,  z: 0.08 },
  "backdrop-panel:circle":          { y: 0.55, z: 0.06 },
  "backdrop-panel:tall-rounded":    { y: 1.05, z: 0.07 },
  "backdrop-panel:layered":         { y: 0.75, z: 0.08 },
  "backdrop-panel:fan":             { y: 0.85, z: 0.1  },
  "backdrop-panel:scallop":         { y: 0.7,  z: 0.07 },
  "backdrop-panel:square":          { y: 0.65, z: 0.06 },
  "backdrop-panel:classic-wall":    { y: 0.8,  z: 0.05 },
  "backdrop-panel:slatted":         { y: 0.85, z: 0.08 },
  "backdrop-panel:grid":            { y: 0.8,  z: 0.04 },
  "backdrop-panel:acrylic":         { y: 0.75, z: 0.04 },
  "backdrop-panel:half-arch":       { y: 0.7,  z: 0.07 },
  "backdrop-panel:curved-corner":   { y: 0.75, z: 0.06 },
  "backdrop-panel:angled":          { y: 0.8,  z: 0.06 },
  "welcome-sign:acrylic-arch":      { y: 1.1,  z: 0.05 },
  "welcome-sign:mirror":            { y: 1.2,  z: 0.05 },
  "welcome-sign:minimal-arch":      { y: 0.85, z: 0.08 },
  "welcome-sign:round":             { y: 0.97, z: 0.08 },
  "welcome-sign:modern-wave":       { y: 0.85, z: 0.07 },
  "welcome-sign:hanging-fabric":    { y: 1.1,  z: 0.04 },
  "welcome-sign:wooden-arch":       { y: 1.1,  z: 0.08 },
  "welcome-sign:clear-frame":       { y: 1.1,  z: 0.05 },
};

/* Dropping anything within this radius of a coffee booth auto-attaches it
   as that station's child (docs/coffee-corner-design.md §6) — no separate
   "accessories panel" needed, dragging normally just works. Items in this
   set additionally default to sitting at counter height rather than the
   floor when attached this way. */
const STATION_ATTACH_RADIUS = 1.3;
const COUNTER_TOP_TYPES = new Set([
  "flower-arrangement",
]);

/* Same auto-attach idea as the coffee-corner set above, generalized to
   "any decorated element" for the floral swags/garlands below — every
   structural backdrop, arch, pedestal, and table-style piece in the
   catalog someone might actually want to drape flowers over. A wider
   radius than STATION_ATTACH_RADIUS since these hosts (a 2.2m arch vs a
   0.5m pedestal) are physically bigger than a coffee booth. */
const DECOR_ATTACH_RADIUS = 1.8;
const DECOR_ATTACH_TYPES = new Set([
  ...BRANDABLE_TYPES,
  "arch-panel-plain", "arch-panel-fluted", "dual-arch-mixed",
  "pedestal-duo-plain", "pedestal-duo-fluted", "pedestal-single-plain", "pedestal-single-fluted",
  "fluted-panel-wall", "tiered-stand-fluted", "tiered-stand-acrylic",
  "card-box", "guest-book", "fluted-bowl-duo", "fluted-vase",
  "cake-table", "buffet-table",
]);
const FLORAL_SWAG_TYPES = new Set([
  "floral-swag-horizontal", "floral-swag-corner", "floral-cascade-teardrop",
  "floral-arch-garland", "floral-swag-crescent",
]);
const STATION_COUNTER_Y = 1.0;

function generateBrandingTexture(text, font, fontSize, color) {
  const canvas = document.createElement("canvas");
  canvas.width = 512; canvas.height = 160;
  const ctx = canvas.getContext("2d");
  ctx.clearRect(0, 0, 512, 160);
  ctx.fillStyle = color || "#1a0a3d";
  ctx.font = `${fontSize || 48}px "${font || DEFAULT_BRANDING_FONT}", sans-serif`;
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  ctx.fillText(text, 256, 80);
  const tex = new THREE.CanvasTexture(canvas);
  tex.needsUpdate = true;
  return tex;
}

/* A thin transparent plane with the booth's name painted on — like vinyl
   lettering directly on the front face, matching the reference photos,
   rather than a separate raised sign panel. Returns null when there's no
   text yet so a blank white rectangle doesn't float on every fresh booth.
   Position is looked up by "type:variant" first (for type+variant families
   like backdrop-panel/welcome-sign, where each variant is a genuinely
   different height/depth), falling back to plain `type` for the older
   one-shape-per-type stations that predate variants. */
function buildBrandingPanel(branding, type, variant) {
  if (!branding || !branding.text || !branding.text.trim()) return null;
  const tex = generateBrandingTexture(branding.text, branding.font, branding.fontSize, branding.color);
  const mat = new THREE.MeshStandardMaterial({ map: tex, transparent: true, roughness: 0.7 });
  const panelW = 1.0, panelH = panelW * (160 / 512);
  const mesh = new THREE.Mesh(new THREE.PlaneGeometry(panelW, panelH), mat);
  const pos = BRANDING_PANEL_POS[`${type}:${variant}`] || BRANDING_PANEL_POS[type] || { y: 0.5, z: 0.311 };
  mesh.position.set(branding.offsetX || 0, pos.y, pos.z);
  mesh.userData.keepOwnMaterial = true; // the item's material/color picker shouldn't touch painted-on text
  return mesh;
}

/* A stylized rounded-top arch — a rectangular body capped with a squashed
   dome — reused by every arch-shaped backdrop/booth/storefront type below
   instead of hand-building the same silhouette repeatedly. Returns a Group
   positioned so its base sits at y=0, with every mesh inside tagged with
   the given part name for per-part coloring. */
function buildArchPanel(width, height, depth, color, part) {
  const g = new THREE.Group();
  const capH = width / 2;
  const bodyH = Math.max(0.05, height - capH);
  const body = new THREE.Mesh(
    new THREE.BoxGeometry(width, bodyH, depth),
    new THREE.MeshStandardMaterial({ color })
  );
  body.position.y = bodyH / 2;
  body.userData.part = part;
  const cap = new THREE.Mesh(
    new THREE.SphereGeometry(0.5, 24, 12, 0, Math.PI * 2, 0, Math.PI / 2),
    new THREE.MeshStandardMaterial({ color, side: THREE.DoubleSide })
  );
  cap.scale.set(width, width, depth);
  cap.position.y = bodyH;
  cap.userData.part = part;
  g.add(body, cap);
  return g;
}

/* A single cylinder with reduced radial segments + flat shading instead of
   the usual smooth 20-24 segment cylinder — the visible facets read as
   fluted/reeded ribbing (pedestals, vases, bowls in the reference sheet)
   without hand-building individual grooves. Cheap, and the faceting
   survives applyItemMaterial's material.clone() since flatShading is a
   material property. */
function buildFlutedCylinder(radiusTop, radiusBottom, height, color, part, segments = 16) {
  const mesh = new THREE.Mesh(
    new THREE.CylinderGeometry(radiusTop, radiusBottom, height, segments, 1),
    new THREE.MeshStandardMaterial({ color, flatShading: true })
  );
  mesh.userData.part = part;
  return mesh;
}

/* A flat panel built from a row of thin vertical dowels rather than a solid
   slab — reads as reeded/fluted wood paneling (the ribbed arches and wall
   panel in the reference sheet). Returns a Group centered on X, base at
   y=0, bulging toward +z (the object's front). */
function buildFlutedPanel(width, height, color, part, ribCount = 12) {
  const g = new THREE.Group();
  const ribR = (width / ribCount) / 2;
  for (let i = 0; i < ribCount; i++) {
    const rib = new THREE.Mesh(
      new THREE.CylinderGeometry(ribR, ribR, height, 10),
      new THREE.MeshStandardMaterial({ color })
    );
    rib.position.set(-width / 2 + ribR + i * (ribR * 2), height / 2, 0);
    rib.userData.part = part;
    g.add(rib);
  }
  return g;
}

/* ── Flower geometry (shared by every flower-cluster and floral-swag
   catalog entry, see below) ──
   A single faceted low-poly sphere (the original approach here) reads as
   a chunk of gravel, not a flower — there's no petal structure at all, so
   any color still looks like a rock. buildFlowerHead instead builds a
   small rounded, layered bloom: a ring of overlapping smooth-shaded
   "petal" spheres around the base, a smaller inner ring, and a slightly
   raised center — cheap (9 small spheres, low segment counts) but reads
   as an actual rose/peony head at the scale these are used, especially
   once several are packed together into a cluster or garland. Cycles
   through a small palette of near-white shades by index rather than one
   fixed color, so a freshly-placed arrangement reads as a natural mixed
   white/ivory/cream blend by default; applyItemMaterial's per-part color
   override (Advanced Edit → "Flowers") still recolors every petal to one
   uniform shade the instant the user picks one — same mechanism as every
   other multi-mesh part in this file. Note that picking a color from the
   *standard* (whole-object) popover instead of Advanced Edit's per-part
   swatches will flatten blooms and leaves to the same single color, same
   as it does for every other multi-part item — Advanced Edit is what
   keeps them independently white/green. */
const FLORAL_BLOOM_PALETTE = [0xffffff, 0xfdf6e9, 0xf7f0e3, 0xfffdf8, 0xf3ead9];

function buildFlowerHead(size, index, part) {
  const g = new THREE.Group();
  const color = FLORAL_BLOOM_PALETTE[index % FLORAL_BLOOM_PALETTE.length];
  const petalMat = () => new THREE.MeshStandardMaterial({ color, roughness: 0.7 });
  // A per-bloom rotation offset derived from `index` (not Math.random(), for
  // the same rebuild-stability reasons as elsewhere in this file) so
  // neighboring blooms don't all point their petals the same way.
  const spin = (index * 2.399963) % (Math.PI * 2); // irrational-ish step avoids any visible repeating pattern
  const outer = 5;
  for (let j = 0; j < outer; j++) {
    const a = spin + (j / outer) * Math.PI * 2;
    const petal = new THREE.Mesh(new THREE.SphereGeometry(size * 0.62, 7, 5), petalMat());
    petal.position.set(Math.cos(a) * size * 0.5, size * 0.08, Math.sin(a) * size * 0.5);
    petal.scale.set(1, 0.6, 1);
    petal.userData.part = part;
    g.add(petal);
  }
  const inner = 3;
  for (let j = 0; j < inner; j++) {
    const a = spin * 1.6 + (j / inner) * Math.PI * 2;
    const petal = new THREE.Mesh(new THREE.SphereGeometry(size * 0.44, 6, 5), petalMat());
    petal.position.set(Math.cos(a) * size * 0.24, size * 0.34, Math.sin(a) * size * 0.24);
    petal.scale.set(1, 0.65, 1);
    petal.userData.part = part;
    g.add(petal);
  }
  const center = new THREE.Mesh(new THREE.SphereGeometry(size * 0.32, 6, 5), petalMat());
  center.position.y = size * 0.52;
  center.userData.part = part;
  g.add(center);
  return g;
}

/* A mounded cluster of buildFlowerHead blooms — reused by both
   flower-cluster catalog variants below. Laid out along an
   upper-hemisphere-biased Fibonacci spiral rather than Math.random() —
   build3DObject can re-run on every color/material tweak or Advanced Edit
   part-selection pass, and a randomized cluster would visibly reshuffle on
   each one, so the layout has to be deterministic. `stemCount` pokes a few
   thin twigs (tagged `stemPart`, default same as `part`) up through the
   mass for the looser "spray" variant; the denser "bouquet" variant passes
   0 since none are visible in the reference sheet. Returns a Group with
   base resting at y=0. */
function buildFlowerCluster(part, opts = {}) {
  const {
    count = 24, radiusX = 0.3, radiusY = 0.24, radiusZ = 0.26,
    domeBias = 0.55, bloomMin = 0.05, bloomMax = 0.09,
    stemCount = 0, stemHeight = 0.3, stemPart = part,
  } = opts;
  const g = new THREE.Group();
  const golden = Math.PI * (3 - Math.sqrt(5)); // golden angle — even, deterministic spiral spacing
  for (let i = 0; i < count; i++) {
    const t = i / Math.max(1, count - 1);
    const yFrac = domeBias + t * (1 - domeBias); // bias toward the upper hemisphere so it mounds up, not floats as a full sphere
    const radial = Math.sqrt(Math.max(0, 1 - yFrac * yFrac));
    const theta = i * golden;
    const x = Math.cos(theta) * radial * radiusX;
    const z = Math.sin(theta) * radial * radiusZ;
    const y = yFrac * radiusY;
    const size = bloomMin + ((i * 7) % 5) / 4 * (bloomMax - bloomMin); // deterministic pseudo-variety in bloom size
    const bloom = buildFlowerHead(size, i, part);
    bloom.position.set(x, y + size * 0.55, z);
    bloom.rotation.y = theta;
    g.add(bloom);
  }
  for (let i = 0; i < stemCount; i++) {
    const theta = i * golden * 1.7 + 1;
    const dist = 0.05 + ((i * 11) % 4) / 4 * radiusX * 0.4;
    const h = stemHeight * (0.75 + ((i * 5) % 4) / 4 * 0.5);
    const x = Math.cos(theta) * dist, z = Math.sin(theta) * dist;
    const stem = new THREE.Mesh(
      new THREE.CylinderGeometry(0.004, 0.006, h, 5),
      new THREE.MeshStandardMaterial({ color: 0xe8e2d5 })
    );
    stem.position.set(x, radiusY * 0.85 + h / 2, z);
    stem.rotation.set((theta % 1) * 0.25 - 0.1, 0, (theta % 1.3) * 0.25 - 0.1);
    stem.userData.part = stemPart;
    g.add(stem);
    // A tight unopened bud — small enough that one plain smooth sphere
    // (rather than the full layered buildFlowerHead) reads correctly.
    const bud = new THREE.Mesh(
      new THREE.SphereGeometry(0.032, 8, 6),
      new THREE.MeshStandardMaterial({ color: 0xfffdf8, roughness: 0.7 })
    );
    bud.position.set(x, radiusY * 0.85 + h, z);
    bud.userData.part = stemPart;
    g.add(bud);
  }
  return g;
}

/* A thin stem with a few flattened, flat-shaded leaflets standing in for
   the ferny foliage threaded through every arrangement on the reference
   sheet — cheap enough to scatter dozens of per garland. */
function buildLeafSprig(length, part, color = 0x4d7c3f) {
  const g = new THREE.Group();
  const stem = new THREE.Mesh(
    new THREE.CylinderGeometry(0.003, 0.005, length, 5),
    new THREE.MeshStandardMaterial({ color })
  );
  stem.position.y = length / 2;
  stem.userData.part = part;
  g.add(stem);
  const leafletCount = 4;
  for (let i = 0; i < leafletCount; i++) {
    const t = (i + 1) / (leafletCount + 1);
    const side = i % 2 === 0 ? 1 : -1;
    const leaf = new THREE.Mesh(
      new THREE.ConeGeometry(length * 0.11, length * 0.32, 4),
      new THREE.MeshStandardMaterial({ color, flatShading: true, side: THREE.DoubleSide })
    );
    leaf.rotation.z = side * (Math.PI / 2.6);
    leaf.rotation.y = i * 0.6;
    leaf.position.set(side * length * 0.14 * t, length * t, 0);
    leaf.userData.part = part;
    g.add(leaf);
  }
  return g;
}

/* Threads blooms + leaf sprigs along an explicit list of world-space
   points — the shared placer behind every garland/swag/cascade shape
   below. Each shape's own path math (a shallow drape for a horizontal
   swag, a semicircle for the arch garland, a straight drop for the
   cascade...) lives in its own switch case; this just decorates whatever
   points it's handed. `sizeAt(t)`/`bloomChance(t)` are functions of
   position-along-path (t: 0..1) so a garland can taper into sparse
   trailing foliage at its ends instead of blooms stopping abruptly.
   Everything is index-derived rather than Math.random() — same reasoning
   as buildFlowerCluster above: this can rebuild on every color/material
   tweak, and a randomized layout would visibly reshuffle each time. */
function buildFloralSwag(points, opts = {}) {
  const {
    bloomPart = "blooms", leafPart = "leaves",
    sizeAt = () => 0.075,
    bloomChance = () => 1,
    leafEvery = 2,
    leafLength = 0.16,
    leafColor = 0x4d7c3f,
  } = opts;
  const g = new THREE.Group();
  points.forEach((p, i) => {
    const t = points.length > 1 ? i / (points.length - 1) : 0;
    // A repeatable pseudo-threshold from the index instead of Math.random()
    // — tapering ends read as organically sparse but never reshuffle
    // between rebuilds.
    const roll = ((i * 37) % 11) / 10;
    if (roll < bloomChance(t)) {
      const size = sizeAt(t) * (0.85 + ((i * 13) % 5) / 4 * 0.3);
      const bloom = buildFlowerHead(size, i, bloomPart);
      bloom.position.set(p.x, p.y, p.z);
      // Yaw only — buildFlowerHead's petals splay outward from a raised
      // center, so tipping it onto its side (a full X/Z tumble, which is
      // harmless for a faceted ball but not for a bloom with a defined
      // "up") would read as broken rather than just varied.
      bloom.rotation.y = (i * 1.3) % (Math.PI * 2);
      g.add(bloom);
    }
    if (i % leafEvery === 0) {
      const leaf = buildLeafSprig(leafLength * (0.7 + ((i * 5) % 4) / 4 * 0.6), leafPart, leafColor);
      leaf.position.set(p.x, p.y, p.z);
      // Points the sprig outward/downward at a per-index angle rather than
      // always straight up, so it reads as tucked into the arrangement
      // instead of a row of identical upright sprigs.
      leaf.rotation.y = (i * 0.9) % (Math.PI * 2);
      leaf.rotation.z = (((i * 3) % 5) / 4 - 0.5) * 0.6;
      g.add(leaf);
    }
  });
  return g;
}

/* ── Single greenery stems (reference sheet #5, foliage row) ──
   One flexible builder driven by a per-variant style table instead of a
   bespoke case per species — these are all "a stem with N small leaves
   alternating up it," differing only in leaf shape/size/count/color, which
   is exactly the kind of variation the catalog's type+variant system
   (see the ELEMENTS comment near the top of this file) is meant for. */
const GREENERY_STEM_STYLES = {
  fern:               { leafShape: "frond",  color: 0x6fae5c, leafCount: 20, leafSize: 0.05,  height: 0.55 },
  "eucalyptus-silver": { leafShape: "disc",  color: 0xb9c9ad, leafCount: 10, leafSize: 0.045, height: 0.5  },
  olive:              { leafShape: "blade",  color: 0x7f9a6b, leafCount: 12, leafSize: 0.06,  height: 0.5  },
  "asparagus-fern":   { leafShape: "needle", color: 0x5f9e57, leafCount: 28, leafSize: 0.02,  height: 0.45 },
  "eucalyptus-round": { leafShape: "disc",   color: 0x6f9a5c, leafCount: 10, leafSize: 0.05,  height: 0.5  },
  ruscus:             { leafShape: "blade",  color: 0x3f6b34, leafCount: 8,  leafSize: 0.09,  height: 0.45 },
  "dusty-miller":     { leafShape: "frond",  color: 0xaebfa4, leafCount: 20, leafSize: 0.045, height: 0.4  },
};
function buildGreeneryStem(variant, part = "leaves") {
  const style = GREENERY_STEM_STYLES[variant] || GREENERY_STEM_STYLES.fern;
  const g = new THREE.Group();
  const stemMat = () => new THREE.MeshStandardMaterial({ color: style.color });
  const stem = new THREE.Mesh(new THREE.CylinderGeometry(0.004, 0.007, style.height, 5), stemMat());
  stem.position.y = style.height / 2;
  stem.userData.part = part;
  g.add(stem);
  for (let i = 0; i < style.leafCount; i++) {
    const t = (i + 1) / (style.leafCount + 1);
    const side = i % 2 === 0 ? 1 : -1;
    const y = t * style.height;
    let leaf;
    if (style.leafShape === "disc") {
      leaf = new THREE.Mesh(new THREE.SphereGeometry(style.leafSize, 6, 5), new THREE.MeshStandardMaterial({ color: style.color, flatShading: true }));
      leaf.scale.set(1, 1, 0.3);
    } else if (style.leafShape === "blade") {
      leaf = new THREE.Mesh(new THREE.ConeGeometry(style.leafSize * 0.35, style.leafSize * 2.2, 4), new THREE.MeshStandardMaterial({ color: style.color, flatShading: true, side: THREE.DoubleSide }));
    } else if (style.leafShape === "needle") {
      leaf = new THREE.Mesh(new THREE.ConeGeometry(style.leafSize * 0.3, style.leafSize * 1.6, 3), stemMat());
    } else {
      // "frond" — a few tiny leaflets fanned from one point, for the
      // ferny/lacy foliage (maidenhair fern, dusty miller).
      leaf = new THREE.Group();
      for (let k = 0; k < 3; k++) {
        const leaflet = new THREE.Mesh(new THREE.ConeGeometry(style.leafSize * 0.22, style.leafSize * 1.0, 3), new THREE.MeshStandardMaterial({ color: style.color, flatShading: true }));
        leaflet.rotation.z = (k - 1) * 0.5;
        leaflet.position.x = (k - 1) * style.leafSize * 0.3;
        leaflet.userData.part = part;
        leaf.add(leaflet);
      }
    }
    leaf.position.set(side * style.leafSize * 1.1, y, 0);
    leaf.rotation.z = side * 0.9;
    leaf.rotation.y = i * 0.7;
    if (leaf.isMesh) leaf.userData.part = part; // Groups (the "frond" case) tag their own leaflet meshes above instead — applyItemMaterial only ever looks at userData.part on actual meshes
    g.add(leaf);
  }
  return g;
}

/* ── Single flower stems (reference sheet #5, bloom row) ──
   Same type+variant idea as buildGreeneryStem, one level up: a style table
   picks a bloom language (a flat 5-petal "star" for orchids, tiny "pin"
   florets scattered along fine twigs for baby's breath, a dense floret
   spike for delphinium, or buildFlowerHead's layered rose head reused
   as-is for lisianthus/carnation/rose) rather than one case per species. */
const FLOWER_STEM_STYLES = {
  orchid:         { bloom: "star",    count: 5,  size: 0.05,  height: 0.55, spread: 0.12 },
  lisianthus:     { bloom: "cluster", count: 4,  size: 0.045, height: 0.45, spread: 0.09 },
  carnation:      { bloom: "cluster", count: 3,  size: 0.05,  height: 0.4,  spread: 0.07 },
  "babys-breath": { bloom: "pin",     count: 24, size: 0.012, height: 0.4,  spread: 0.16 },
  delphinium:     { bloom: "spike",   count: 28, size: 0.022, height: 0.65, spread: 0.05 },
  rose:           { bloom: "cluster", count: 3,  size: 0.06,  height: 0.5,  spread: 0.08 },
};
function buildFlowerStem(variant, bloomPart = "blooms", leafPart = "leaves") {
  const style = FLOWER_STEM_STYLES[variant] || FLOWER_STEM_STYLES.rose;
  const g = new THREE.Group();
  const stem = new THREE.Mesh(new THREE.CylinderGeometry(0.005, 0.008, style.height, 6), new THREE.MeshStandardMaterial({ color: 0x4d7c3f }));
  stem.position.y = style.height / 2;
  stem.userData.part = leafPart;
  g.add(stem);
  [0.35, 0.6].forEach((frac, i) => {
    const leaf = buildLeafSprig(0.13, leafPart, 0x4d7c3f);
    leaf.position.y = style.height * frac;
    leaf.rotation.y = i * Math.PI;
    g.add(leaf);
  });
  if (style.bloom === "spike") {
    // Delphinium/larkspur — small florets packed the entire length of the
    // upper spike, not clustered only at the tip like the other variants.
    for (let i = 0; i < style.count; i++) {
      const t = i / Math.max(1, style.count - 1);
      const y = style.height * (0.4 + t * 0.6);
      const a = i * 2.399963;
      const r = style.spread * (1 - t * 0.5);
      const floret = new THREE.Mesh(new THREE.SphereGeometry(style.size, 6, 5), new THREE.MeshStandardMaterial({ color: FLORAL_BLOOM_PALETTE[i % FLORAL_BLOOM_PALETTE.length], roughness: 0.7 }));
      floret.position.set(Math.cos(a) * r, y, Math.sin(a) * r);
      floret.userData.part = bloomPart;
      g.add(floret);
    }
    return g;
  }
  if (style.bloom === "pin") {
    // Baby's breath — many tiny blooms scattered on fine branching twigs
    // near the top rather than one dense head.
    for (let i = 0; i < style.count; i++) {
      const a = i * 2.399963;
      const r = style.spread * (((i * 7) % 5) / 4);
      const y = style.height * (0.65 + ((i * 11) % 5) / 4 * 0.35);
      const twig = new THREE.Mesh(new THREE.CylinderGeometry(0.0015, 0.002, 0.05, 3), new THREE.MeshStandardMaterial({ color: 0x6fae5c }));
      twig.position.set(Math.cos(a) * r, y, Math.sin(a) * r);
      twig.rotation.z = Math.cos(a) * 0.6;
      twig.userData.part = leafPart;
      g.add(twig);
      const bud = new THREE.Mesh(new THREE.SphereGeometry(style.size, 5, 4), new THREE.MeshStandardMaterial({ color: 0xfffdf8, roughness: 0.7 }));
      bud.position.set(Math.cos(a) * r, y + 0.03, Math.sin(a) * r);
      bud.userData.part = bloomPart;
      g.add(bud);
    }
    return g;
  }
  if (style.bloom === "star") {
    // Orchid — a few flat 5-petal blooms alternating down a gently
    // arching stem, rather than one rounded head.
    for (let i = 0; i < style.count; i++) {
      const t = i / Math.max(1, style.count - 1);
      const y = style.height * (0.5 + t * 0.45);
      const side = i % 2 === 0 ? 1 : -1;
      const bloom = new THREE.Group();
      for (let p = 0; p < 5; p++) {
        const a = (p / 5) * Math.PI * 2;
        const petal = new THREE.Mesh(new THREE.SphereGeometry(style.size * 0.55, 6, 4), new THREE.MeshStandardMaterial({ color: FLORAL_BLOOM_PALETTE[(i + p) % FLORAL_BLOOM_PALETTE.length], roughness: 0.6 }));
        petal.position.set(Math.cos(a) * style.size * 0.6, 0, Math.sin(a) * style.size * 0.6);
        petal.scale.set(1.3, 0.35, 0.8);
        petal.userData.part = bloomPart;
        bloom.add(petal);
      }
      bloom.position.set(side * style.spread, y, 0);
      bloom.rotation.y = i * 0.8;
      g.add(bloom);
    }
    return g;
  }
  // "cluster" — lisianthus/carnation/rose all reuse buildFlowerHead's
  // layered head directly, just at different sizes/counts.
  for (let i = 0; i < style.count; i++) {
    const t = i / Math.max(1, style.count - 1);
    const y = style.height * (0.55 + t * 0.4);
    const side = i % 2 === 0 ? 1 : -1;
    const bloom = buildFlowerHead(style.size, i, bloomPart);
    bloom.position.set(side * style.spread * t, y, 0);
    bloom.rotation.y = i * 1.1;
    g.add(bloom);
  }
  return g;
}

/* ── Tied bouquets (reference sheet #5, top row) ──
   A bundle of stems converging at a ribbon-wrapped tie point, topped with
   whatever bloom composition the specific bouquet case builds. Shared
   across all six bouquet catalog entries below so only the top (the part
   that actually varies — cascade vs. round vs. tulip cups vs. calla
   trumpets) needs its own code. */
function buildBouquetStemBundle(count, height, part = "stems") {
  const g = new THREE.Group();
  for (let i = 0; i < count; i++) {
    const a = i * 2.399963;
    const r = 0.02 + ((i * 7) % 5) / 4 * 0.05;
    const stem = new THREE.Mesh(new THREE.CylinderGeometry(0.006, 0.008, height, 5), new THREE.MeshStandardMaterial({ color: 0x4d7c3f }));
    stem.position.set(Math.cos(a) * r, height / 2, Math.sin(a) * r);
    stem.rotation.z = Math.cos(a) * 0.08;
    stem.rotation.x = Math.sin(a) * 0.08;
    stem.userData.part = part;
    g.add(stem);
  }
  const wrap = new THREE.Mesh(new THREE.CylinderGeometry(0.09, 0.085, height * 0.22, 12), new THREE.MeshStandardMaterial({ color: 0xf7f3ea }));
  wrap.position.y = height * 0.12;
  wrap.userData.part = part;
  g.add(wrap);
  return g;
}

/* A simple closed cup — a smooth sphere stretched taller than it is wide —
   standing in for a tulip bloom, which (unlike a rose) never opens into
   layered petals. */
function buildTulipBloom(size, index, part) {
  const color = FLORAL_BLOOM_PALETTE[index % FLORAL_BLOOM_PALETTE.length];
  const bloom = new THREE.Mesh(new THREE.SphereGeometry(size, 8, 6), new THREE.MeshStandardMaterial({ color, roughness: 0.6 }));
  bloom.scale.set(0.8, 1.3, 0.8);
  bloom.userData.part = part;
  return bloom;
}

/* A lathe-revolved trumpet profile standing in for a calla lily's curled
   single petal — not radially accurate (a real calla is open on one side,
   not a full surface of revolution) but reads correctly as "an elegant
   white trumpet flower" at this scale, with a small yellow spadix spike
   poking out the center the way the real flower's is the signature detail. */
function buildCallaBloom(size, part) {
  const profile = [
    new THREE.Vector2(0, 0),
    new THREE.Vector2(size * 0.08, size * 0.1),
    new THREE.Vector2(size * 0.12, size * 0.4),
    new THREE.Vector2(size * 0.3, size * 0.75),
    new THREE.Vector2(size * 0.42, size * 0.95),
    new THREE.Vector2(size * 0.35, size * 1.05),
  ];
  const g = new THREE.Group();
  const petal = new THREE.Mesh(
    new THREE.LatheGeometry(profile, 10),
    new THREE.MeshStandardMaterial({ color: 0xfffdf8, side: THREE.DoubleSide, roughness: 0.55 })
  );
  petal.userData.part = part;
  g.add(petal);
  const spadix = new THREE.Mesh(
    new THREE.CylinderGeometry(size * 0.03, size * 0.05, size * 0.5, 6),
    new THREE.MeshStandardMaterial({ color: 0xf3c94d })
  );
  spadix.position.y = size * 0.5;
  spadix.userData.part = part;
  g.add(spadix);
  return g;
}

/* ── Potted floor/foliage plants (reference sheet #4 — houseplant grid) ──
   Every entry is "a ceramic pot + a foliage composition," so like the
   flower/greenery stems above, one flexible builder driven by a per-variant
   style table stands in for a bespoke case per species. `leafShape` picks
   which of the composition branches in buildPottedFoliage runs — species
   that share a growth habit (e.g. rubber plant/fiddle-leaf fig/dieffenbachia
   all being "big glossy oval leaves alternating up a central trunk") share
   a branch and differ only by color/count/size. Peace lily is intentionally
   its own top-level type below (buildPeaceLily), not a variant here, since
   it needs a `blooms` part the others don't. */
function buildPlantPot(r, h, potStyle, color) {
  const g = new THREE.Group();
  const mat = new THREE.MeshStandardMaterial({ color, roughness: 0.85 });
  if (potStyle === "cylinder-tall" || potStyle === "ribbed") {
    const segs = potStyle === "ribbed" ? 16 : 24;
    const body = new THREE.Mesh(new THREE.CylinderGeometry(r * (potStyle === "ribbed" ? 0.92 : 1), r, h, segs), mat);
    body.position.y = h / 2;
    body.userData.part = "pot";
    g.add(body);
  } else {
    // "round" — a bulbous lathe-revolved profile matching the rounded
    // ceramic planters throughout the reference sheet.
    const profile = [
      new THREE.Vector2(0, 0),
      new THREE.Vector2(r * 0.5, 0),
      new THREE.Vector2(r * 0.52, h * 0.05),
      new THREE.Vector2(r, h * 0.35),
      new THREE.Vector2(r * 0.95, h * 0.65),
      new THREE.Vector2(r * 0.8, h * 0.92),
      new THREE.Vector2(r * 0.85, h * 0.98),
      new THREE.Vector2(r * 0.78, h),
    ];
    const body = new THREE.Mesh(new THREE.LatheGeometry(profile, 18), mat);
    body.userData.part = "pot";
    g.add(body);
  }
  const soil = new THREE.Mesh(
    new THREE.CylinderGeometry(r * 0.7, r * 0.7, h * 0.04, 16),
    new THREE.MeshStandardMaterial({ color: 0x3d2b1f })
  );
  soil.position.y = h * 0.92;
  soil.userData.part = "pot";
  g.add(soil);
  return g;
}

/* A small cluster of tapered canes/trunks rising from the pot rim, each
   leaning a per-index amount rather than standing perfectly straight —
   real nursery trunks are never perfectly vertical. */
function buildPlantTrunks(count, height, color, potR, part = "trunk") {
  const g = new THREE.Group();
  for (let i = 0; i < count; i++) {
    const a = i * 2.399963;
    const r = potR * 0.35 * (((i * 5) % 4) / 4);
    const h = height * (0.82 + ((i * 7) % 5) / 4 * 0.36);
    const lean = (((i * 3) % 5) / 4 - 0.5) * 0.18;
    const trunk = new THREE.Mesh(new THREE.CylinderGeometry(0.012, 0.02, h, 6), new THREE.MeshStandardMaterial({ color }));
    trunk.position.set(Math.cos(a) * r, h / 2, Math.sin(a) * r);
    trunk.rotation.set(Math.sin(a) * lean, 0, Math.cos(a) * lean);
    trunk.userData.part = part;
    g.add(trunk);
    g.userData[`trunkTop${i}`] = { x: Math.cos(a) * r + Math.sin(trunk.rotation.z) * h, y: h, z: Math.sin(a) * r };
  }
  return g;
}

/* A single flattened, smooth-shaded oval "leaf" mesh, base at local origin
   (y=0) so callers can position/rotate it at a petiole tip and have it
   read as growing outward from that point. */
function buildOvalLeafMesh(length, width, color, part, flat = false) {
  const leaf = new THREE.Mesh(
    new THREE.SphereGeometry(length * 0.5, 8, 6),
    new THREE.MeshStandardMaterial({ color, roughness: 0.4, flatShading: flat, side: THREE.DoubleSide })
  );
  leaf.scale.set(width / length, 1, 0.12);
  leaf.position.y = length * 0.5;
  leaf.userData.part = part;
  return leaf;
}

/* A stiff, flat blade — the shared shape behind snake-plant leaves, palm
   fronds, and fern fronds, which all read as "a thin tapered blade," just
   at different lengths/angles/densities. */
function buildBladeMesh(length, width, color, part) {
  const blade = new THREE.Mesh(
    new THREE.ConeGeometry(width * 0.5, length, 4),
    new THREE.MeshStandardMaterial({ color, flatShading: true, side: THREE.DoubleSide })
  );
  blade.position.y = length * 0.5;
  blade.userData.part = part;
  return blade;
}

const POTTED_PLANT_STYLES = {
  olive: {
    potStyle: "round", potColor: 0xf3efe4, potR: 0.24, potH: 0.26,
    trunkCount: 3, trunkHeight: 0.52, trunkColor: 0x8a7256,
    leafShape: "small-branch", leafColor: 0x8a9b6e, leafCount: 46, height: 0.55,
  },
  "bird-of-paradise": {
    potStyle: "round", potColor: 0xf3efe4, potR: 0.22, potH: 0.24,
    leafShape: "paddle", leafColor: 0x2f6b3c, leafCount: 6, height: 0.95, leafSize: 0.34,
  },
  "fiddle-leaf-fig": {
    potStyle: "round", potColor: 0xece6d6, potR: 0.2, potH: 0.22,
    trunkCount: 1, trunkHeight: 0.5, trunkColor: 0x6b4a34,
    leafShape: "oval-glossy", leafColor: 0x2e5c2a, leafCount: 14, height: 0.85, leafSize: 0.13,
  },
  "areca-palm": {
    potStyle: "round", potColor: 0xf3efe4, potR: 0.22, potH: 0.24,
    trunkCount: 4, trunkHeight: 0.5, trunkColor: 0x8a9b5c,
    leafShape: "palm-frond", leafColor: 0x5a8a3f, leafCount: 5, height: 0.85,
  },
  "rubber-plant": {
    potStyle: "round", potColor: 0xece6d6, potR: 0.2, potH: 0.22,
    trunkCount: 1, trunkHeight: 0.5, trunkColor: 0x7a4a2e,
    leafShape: "oval-glossy", leafColor: 0x1f4a20, leafCount: 12, height: 0.8, leafSize: 0.13,
  },
  monstera: {
    potStyle: "round", potColor: 0xf3efe4, potR: 0.2, potH: 0.22,
    trunkCount: 3, trunkHeight: 0.15, trunkColor: 0x3a5c33,
    leafShape: "split-leaf", leafColor: 0x2c5e2c, leafCount: 6, height: 0.75, leafSize: 0.22,
  },
  "bird-of-paradise-tall": {
    potStyle: "ribbed", potColor: 0xece6d6, potR: 0.2, potH: 0.28,
    leafShape: "paddle", leafColor: 0x336b3f, leafCount: 7, height: 1.05, leafSize: 0.4,
  },
  "dracaena-marginata": {
    potStyle: "round", potColor: 0xf3efe4, potR: 0.19, potH: 0.22,
    trunkCount: 3, trunkHeight: 0.48, trunkColor: 0x8a6a4a,
    leafShape: "cane-tuft", leafColor: 0x3f6b3f, leafCount: 12, height: 0.65,
  },
  "snake-plant-yellow": {
    potStyle: "round", potColor: 0x6b6558, potR: 0.17, potH: 0.2,
    leafShape: "spike", leafColor: 0x1f4a2e, edgeColor: 0xd9c94a, leafCount: 7, height: 0.5,
  },
  "zz-plant": {
    potStyle: "round", potColor: 0xf3efe4, potR: 0.2, potH: 0.22,
    leafShape: "pinnate-arch", leafColor: 0x1e5c2e, leafCount: 6, height: 0.55,
  },
  "asparagus-fern": {
    potStyle: "ribbed", potColor: 0xece6d6, potR: 0.17, potH: 0.2,
    leafShape: "frond-full", leafColor: 0x6fae5c, leafCount: 20, height: 0.45,
  },
  dieffenbachia: {
    potStyle: "round", potColor: 0xf3efe4, potR: 0.19, potH: 0.22,
    trunkCount: 1, trunkHeight: 0.32, trunkColor: 0x6b8a4a,
    leafShape: "oval-glossy", leafColor: 0x2e5c2a, leafColor2: 0xd7e3a0, leafCount: 10, height: 0.6, leafSize: 0.15,
  },
  "kentia-palm": {
    potStyle: "round", potColor: 0xf3efe4, potR: 0.16, potH: 0.19,
    trunkCount: 3, trunkHeight: 0.36, trunkColor: 0x8a9b5c,
    leafShape: "palm-frond", leafColor: 0x4a7a3f, leafCount: 5, height: 0.58,
  },
  "pothos-trailing": {
    potStyle: "cylinder-tall", potColor: 0xd9d3c4, potR: 0.15, potH: 0.55,
    leafShape: "trailing-vine", leafColor: 0x2f6b2f, leafCount: 5, height: 0.5,
  },
  "snake-plant-green": {
    potStyle: "round", potColor: 0xf3efe4, potR: 0.17, potH: 0.2,
    leafShape: "spike", leafColor: 0x1f4a2e, leafCount: 6, height: 0.55,
  },
  "boston-fern": {
    potStyle: "round", potColor: 0xf0ece0, potR: 0.2, potH: 0.22,
    leafShape: "frond-full", leafColor: 0x4d8a3f, leafCount: 26, height: 0.42,
  },
  alocasia: {
    potStyle: "round", potColor: 0xf3efe4, potR: 0.2, potH: 0.22,
    trunkCount: 4, trunkHeight: 0.4, trunkColor: 0x4a6b3f,
    leafShape: "paddle", leafColor: 0x1f4a2e, leafCount: 5, height: 0.8, leafSize: 0.3,
  },
};

function buildPottedFoliage(style, part = "leaves") {
  const g = new THREE.Group();
  const golden = Math.PI * (3 - Math.sqrt(5));
  const shape = style.leafShape;
  const count = style.leafCount;

  if (shape === "small-branch") {
    // Tiny olive leaves scattered over a loose conical envelope above the
    // trunk tops rather than growing from one clear stem-and-leaf pattern.
    for (let i = 0; i < count; i++) {
      const yFrac = 0.55 + ((i * 11) % 9) / 8 * 0.45;
      const theta = i * golden;
      const rad = (1 - yFrac) * 0.22 + 0.06;
      const y = style.trunkHeight * 0.55 + yFrac * style.height * 0.5;
      const leaf = buildBladeMesh(0.05, 0.014, style.leafColor, part);
      leaf.position.set(Math.cos(theta) * rad, y, Math.sin(theta) * rad);
      leaf.rotation.z = Math.cos(theta) * 0.9;
      leaf.rotation.x = Math.sin(theta) * 0.9;
      g.add(leaf);
    }
  } else if (shape === "paddle" || shape === "split-leaf") {
    // Long petiole + one big leaf at the tip, fanned around the pot at the
    // golden angle so no two leaves line up directly behind one another.
    for (let i = 0; i < count; i++) {
      const theta = i * golden;
      const petioleH = style.height * (0.55 + ((i * 5) % 4) / 4 * 0.35);
      const lean = 0.35 + ((i * 3) % 4) / 4 * 0.25;
      const petiole = new THREE.Mesh(new THREE.CylinderGeometry(0.006, 0.01, petioleH, 5), new THREE.MeshStandardMaterial({ color: 0x3a5c2e }));
      petiole.position.set(Math.cos(theta) * 0.05, petioleH / 2, Math.sin(theta) * 0.05);
      petiole.rotation.set(Math.sin(theta) * lean, 0, -Math.cos(theta) * lean);
      petiole.userData.part = "trunk";
      g.add(petiole);
      const leafLen = style.leafSize * (shape === "split-leaf" ? 1.4 : 2.2);
      const leaf = buildOvalLeafMesh(leafLen, style.leafSize * (shape === "split-leaf" ? 1.1 : 0.6), style.leafColor, part);
      leaf.position.copy(petiole.position);
      leaf.position.y += petioleH * 0.42;
      leaf.rotation.copy(petiole.rotation);
      leaf.position.x += Math.sin(theta) * lean * petioleH * 0.3;
      leaf.position.z -= Math.cos(theta) * lean * petioleH * 0.3;
      g.add(leaf);
    }
  } else if (shape === "oval-glossy") {
    // Big glossy leaves alternating up a single central trunk — fiddle-leaf
    // fig, rubber plant, dieffenbachia all share this growth habit.
    for (let i = 0; i < count; i++) {
      const t = (i + 1) / (count + 1);
      const side = i % 2 === 0 ? 1 : -1;
      const y = style.trunkHeight * (0.3 + t * 0.75);
      const color = style.leafColor2 && i % 3 === 0 ? style.leafColor2 : style.leafColor;
      const leaf = buildOvalLeafMesh(style.leafSize * 1.8, style.leafSize, color, part);
      leaf.position.set(side * 0.02, y, 0);
      leaf.rotation.z = side * 0.55;
      leaf.rotation.y = i * 0.9;
      g.add(leaf);
    }
  } else if (shape === "palm-frond") {
    // A handful of thin drooping blade fronds bursting from each cane top.
    const trunkCount = style.trunkCount || 1;
    for (let c = 0; c < trunkCount; c++) {
      const ca = c * 2.399963;
      const cr = 0.22 * 0.35 * (((c * 5) % 4) / 4);
      const cy = style.trunkHeight * (0.82 + ((c * 7) % 5) / 4 * 0.36);
      for (let i = 0; i < count; i++) {
        const a = (i / count) * Math.PI * 2 + ca;
        const frond = buildBladeMesh(style.height * 0.55, 0.05, style.leafColor, part);
        frond.position.set(Math.cos(ca) * cr, cy, Math.sin(ca) * cr);
        frond.rotation.z = Math.cos(a) * 1.15;
        frond.rotation.x = Math.sin(a) * 1.15 + 0.3;
        frond.rotation.y = a;
        g.add(frond);
      }
    }
  } else if (shape === "cane-tuft") {
    // A spiky tuft of thin blades at each cane top, standing in for
    // dracaena's strappy leaf rosettes.
    const trunkCount = style.trunkCount || 1;
    const perCane = Math.max(3, Math.round(count / trunkCount));
    for (let c = 0; c < trunkCount; c++) {
      const ca = c * 2.399963;
      const cr = 0.19 * 0.35 * (((c * 5) % 4) / 4);
      const cy = style.trunkHeight * (0.82 + ((c * 7) % 5) / 4 * 0.36);
      for (let i = 0; i < perCane; i++) {
        const a = (i / perCane) * Math.PI * 2;
        const blade = buildBladeMesh(0.22, 0.02, style.leafColor, part);
        blade.position.set(Math.cos(ca) * cr, cy, Math.sin(ca) * cr);
        blade.rotation.z = Math.cos(a) * 0.7;
        blade.rotation.x = Math.sin(a) * 0.7;
        g.add(blade);
      }
    }
  } else if (shape === "spike") {
    // Stiff upright blades straight from the pot — two stacked blades
    // (slightly larger yellow one behind a slightly smaller green one)
    // fake a yellow leaf edge without needing per-vertex color.
    for (let i = 0; i < count; i++) {
      const a = (i / count) * Math.PI * 2 + (i % 2) * 0.15;
      const r = 0.05 + ((i * 5) % 3) / 2 * 0.04;
      const h = style.height * (0.75 + ((i * 7) % 5) / 4 * 0.35);
      const lean = 0.12 + ((i * 3) % 4) / 4 * 0.1;
      if (style.edgeColor) {
        const back = buildBladeMesh(h, 0.075, style.edgeColor, part);
        back.position.set(Math.cos(a) * r, 0, Math.sin(a) * r);
        back.rotation.set(Math.sin(a) * lean, a, Math.cos(a) * lean);
        g.add(back);
      }
      const blade = buildBladeMesh(h * 0.94, 0.055, style.leafColor, part);
      blade.position.set(Math.cos(a) * r, 0.01, Math.sin(a) * r);
      blade.rotation.set(Math.sin(a) * lean, a, Math.cos(a) * lean);
      g.add(blade);
    }
  } else if (shape === "pinnate-arch") {
    // ZZ plant — stems fanned outward from vertical at increasing angles,
    // each with small oval leaflets alternating up its length.
    for (let i = 0; i < count; i++) {
      const a = (i / count) * Math.PI * 2;
      const tilt = 0.25 + ((i * 5) % 4) / 4 * 0.25;
      const h = style.height * (0.8 + ((i * 7) % 5) / 4 * 0.3);
      const stem = new THREE.Mesh(new THREE.CylinderGeometry(0.006, 0.009, h, 5), new THREE.MeshStandardMaterial({ color: style.leafColor }));
      stem.position.set(Math.cos(a) * 0.03, h / 2, Math.sin(a) * 0.03);
      stem.rotation.set(Math.sin(a) * tilt, 0, -Math.cos(a) * tilt);
      stem.userData.part = "trunk";
      g.add(stem);
      for (let k = 0; k < 6; k++) {
        const t = (k + 1) / 7;
        const side = k % 2 === 0 ? 1 : -1;
        const leaflet = buildOvalLeafMesh(0.05, 0.028, style.leafColor, part);
        leaflet.position.set(Math.cos(a) * 0.03 + Math.sin(a) * tilt * h * t, h * t, Math.sin(a) * 0.03 - Math.cos(a) * tilt * h * t);
        leaflet.rotation.z = side * 0.6;
        g.add(leaflet);
      }
    }
  } else if (shape === "frond-full") {
    // A full bushy cluster of thin fronds radiating straight from the pot
    // in every direction — fuller/denser than the single greenery-stem fern.
    for (let i = 0; i < count; i++) {
      const theta = i * golden;
      const yFrac = 0.3 + ((i * 11) % 9) / 8 * 0.7;
      const outward = 0.15 + yFrac * 0.35;
      const frond = buildBladeMesh(style.height * (0.6 + yFrac * 0.5), 0.045, style.leafColor, part);
      frond.position.set(Math.cos(theta) * 0.03, 0.02, Math.sin(theta) * 0.03);
      frond.rotation.z = Math.cos(theta) * outward + 0.15;
      frond.rotation.x = Math.sin(theta) * outward + 0.15;
      frond.rotation.y = theta;
      g.add(frond);
    }
  } else if (shape === "trailing-vine") {
    // Vines draping down over the pot rim and along its sides, each with
    // small heart-ish leaflets spaced along the drop.
    for (let i = 0; i < count; i++) {
      const a = (i / count) * Math.PI * 2 + 0.4;
      const leafletCount = 5;
      for (let k = 0; k < leafletCount; k++) {
        const t = k / (leafletCount - 1);
        const drop = t * style.height;
        const outward = 0.14 + t * 0.1;
        const leaflet = buildOvalLeafMesh(0.045, 0.03, style.leafColor, part);
        leaflet.position.set(Math.cos(a) * outward, style.height * 0.15 - drop, Math.sin(a) * outward);
        leaflet.rotation.x = Math.PI * 0.9;
        leaflet.rotation.y = a;
        g.add(leaflet);
      }
      const vine = new THREE.Mesh(new THREE.CylinderGeometry(0.003, 0.004, style.height * 1.05, 4), new THREE.MeshStandardMaterial({ color: 0x3a5c2e }));
      vine.position.set(Math.cos(a) * 0.16, style.height * 0.15 - style.height * 0.5, Math.sin(a) * 0.16);
      vine.rotation.x = 0.12;
      vine.userData.part = "trunk";
      g.add(vine);
    }
  }
  return g;
}

/* Assembles a full potted plant — pot + optional trunks/canes + foliage —
   from the POTTED_PLANT_STYLES table for a given variant id. */
function buildPottedPlant(variant) {
  const style = POTTED_PLANT_STYLES[variant] || POTTED_PLANT_STYLES.olive;
  const g = new THREE.Group();
  const pot = buildPlantPot(style.potR, style.potH, style.potStyle, style.potColor);
  g.add(pot);
  if (style.trunkCount) {
    const trunks = buildPlantTrunks(style.trunkCount, style.trunkHeight, style.trunkColor || 0x6b4a34, style.potR);
    trunks.position.y = style.potH * 0.9;
    g.add(trunks);
  }
  const foliage = buildPottedFoliage(style);
  foliage.position.y = style.potH * 0.9 + (style.trunkHeight || 0);
  g.add(foliage);
  return g;
}

/* Peace lily gets its own top-level type (rather than a potted-plant
   variant) because it needs a fourth `blooms` part the others don't —
   broad dark leaves plus a few white spathe blooms on thin stems above
   the foliage. The spathe reuses buildCallaBloom's trumpet shape at a
   smaller size since a peace lily's white spathe reads almost identically
   to a calla lily's. */
function buildPeaceLily() {
  const g = new THREE.Group();
  const potR = 0.19, potH = 0.22;
  g.add(buildPlantPot(potR, potH, "round", 0xf3efe4));
  const style = { trunkHeight: 0.3, leafColor: 0x1e4a24, leafSize: 0.14, leafCount: 11, leafShape: "oval-glossy" };
  const foliage = buildPottedFoliage(style);
  foliage.position.y = potH * 0.9;
  g.add(foliage);
  for (let i = 0; i < 4; i++) {
    const a = i * 1.9;
    const h = 0.42 + ((i * 5) % 3) / 2 * 0.12;
    const stem = new THREE.Mesh(new THREE.CylinderGeometry(0.004, 0.006, h, 5), new THREE.MeshStandardMaterial({ color: 0x2e5c2a }));
    stem.position.set(Math.cos(a) * 0.05, potH * 0.9 + h / 2, Math.sin(a) * 0.05);
    stem.userData.part = "leaves";
    g.add(stem);
    const bloom = buildCallaBloom(0.06, "blooms");
    bloom.position.set(Math.cos(a) * 0.05, potH * 0.9 + h, Math.sin(a) * 0.05);
    bloom.rotation.y = a;
    g.add(bloom);
  }
  return g;
}

/* ── Ceramic vases (reference sheet #6 — plain-ceramic vase grid) ──
   One unified ring-lofting mesh builder covers essentially every silhouette
   on that sheet, driven entirely by the VASE_STYLES table below:
     • `profile` (an array of {r, y} rings, bottom to top) is the vase's
       vertical silhouette — a simple taper, a bulbous belly, a stacked-
       bubble "snowman," a sine-wave undulation, a goblet's cup-on-a-stem...
     • `ribCount`/`ribDepth` ripple the radius *around* the circumference
       at every height (a cosine wave in theta) for fluted/ribbed grooves —
       independent of the vertical silhouette, so any profile can be plain
       or fluted.
     • `radialSegments` + `flatShading` control facet resolution: high
       segments + smooth shading reads as round ceramic; low segments
       (6-8) + flat shading reads as a cut-gem/hexagonal facet instead.
     • `twist` rotates each ring by an increasing angle with height, for
       the spiral-twist column.
     • `ruffleTop` perturbs only the rim ring's radius sinusoidally around
       theta, for a wavy/ruffled opening.
   Handles, the open-ring "donut" vase, and terrazzo speckling are the only
   shapes that don't fit this single silhouette+ripple model, so those are
   handled as small additions on top rather than forcing them into it. */
function buildVaseMesh(profile, opts = {}) {
  const {
    radialSegments = 32, ribCount = 0, ribDepth = 0,
    twist = 0, ruffleTop = 0, ruffleWaves = 6,
    flatShading = false, color = 0xf2efe8, roughness = 0.55,
  } = opts;
  const positions = [];
  const ringCount = profile.length;
  const topY = profile[ringCount - 1].y || 1;
  for (let ri = 0; ri < ringCount; ri++) {
    const { r, y } = profile[ri];
    const isTop = ri === ringCount - 1;
    const isBottom = ri === 0;
    const twistAngle = twist * (y / topY);
    for (let s = 0; s <= radialSegments; s++) {
      const theta = (s / radialSegments) * Math.PI * 2 + twistAngle;
      let rad = r;
      if (!isBottom && ribCount) rad += Math.cos(theta * ribCount) * ribDepth;
      if (isTop && ruffleTop) rad += Math.sin(theta * ruffleWaves) * ruffleTop;
      positions.push(Math.cos(theta) * rad, y, Math.sin(theta) * rad);
    }
  }
  const indices = [];
  for (let ri = 0; ri < ringCount - 1; ri++) {
    for (let s = 0; s < radialSegments; s++) {
      const a = ri * (radialSegments + 1) + s;
      const b = a + radialSegments + 1;
      const c = a + 1;
      const d = b + 1;
      indices.push(a, b, c, c, b, d);
    }
  }
  const geo = new THREE.BufferGeometry();
  geo.setAttribute("position", new THREE.Float32BufferAttribute(positions, 3));
  geo.setIndex(indices);
  geo.computeVertexNormals();
  const mesh = new THREE.Mesh(geo, new THREE.MeshStandardMaterial({ color, roughness, flatShading, side: THREE.DoubleSide }));
  mesh.userData.part = "body";
  return mesh;
}

/* Straight taper (or flare, if rTop > rBase) from a small foot to the rim,
   with an optional extra flare right at the lip. */
function profileTapered(h, rBase, rTop, opts = {}) {
  const { flareTop = 0 } = opts;
  const pts = [{ r: rBase * 0.55, y: 0 }];
  const n = 12;
  for (let i = 0; i <= n; i++) {
    const t = i / n;
    let r = rBase + (rTop - rBase) * Math.pow(t, 0.9);
    if (t > 0.9 && flareTop) r += (flareTop * (t - 0.9)) / 0.1;
    pts.push({ r, y: h * t });
  }
  return pts;
}

/* Classic vase silhouette — foot, wide belly, narrowing neck, flared rim. */
function profileBulbous(h, rBase, rBelly, rNeck, rRim, bellyYFrac = 0.42) {
  return [
    { r: rBase * 0.55, y: 0 },
    { r: rBase, y: h * 0.03 },
    { r: rBelly, y: h * bellyYFrac },
    { r: (rBelly + rNeck) / 2, y: h * 0.7 },
    { r: rNeck, y: h * 0.88 },
    { r: rRim, y: h },
  ];
}

/* Round bottom tapering into a thin tall neck — the bud-vase shape. */
function profileBottleNeck(h, rBase, rBelly, neckR, rimR, neckStartFrac = 0.55) {
  return [
    { r: rBase * 0.6, y: 0 },
    { r: rBase, y: h * 0.04 },
    { r: rBelly, y: h * 0.28 },
    { r: rBelly * 0.85, y: h * neckStartFrac },
    { r: neckR, y: h * (neckStartFrac + 0.06) },
    { r: neckR, y: h * 0.94 },
    { r: rimR, y: h },
  ];
}

/* N stacked bulges narrowing slightly toward the top — the "snowman" shape. */
function profileStackedBubbles(h, r, count) {
  const pts = [{ r: r * 0.35, y: 0 }];
  const segH = h / count;
  for (let i = 0; i < count; i++) {
    const y0 = i * segH, yMid = y0 + segH * 0.5, y1 = y0 + segH;
    const rTop = r * (1 - i * 0.1);
    pts.push({ r: rTop * 0.55, y: y0 + segH * 0.08 });
    pts.push({ r: rTop, y: yMid });
    pts.push({ r: rTop * 0.55, y: y1 - segH * 0.05 });
  }
  pts.push({ r: r * 0.3, y: h });
  return pts;
}

/* A gentle vertical sine undulation in the belly radius — reads as an
   organic wavy/lumpy body without needing true angular asymmetry. */
function profileWavy(h, rBase, waves, amp) {
  const pts = [{ r: rBase * 0.6, y: 0 }];
  const n = 24;
  for (let i = 0; i <= n; i++) {
    const t = i / n;
    const taper = Math.sin(t * Math.PI); // tapers the wave amplitude toward both ends
    const r = rBase + Math.sin(t * Math.PI * waves) * amp * taper;
    pts.push({ r: Math.max(r, rBase * 0.3), y: h * t });
  }
  return pts;
}

/* Foot → thin stem → wide shallow cup — the goblet/coupe shape. */
function profileGoblet(h, cupR, stemR, footR, cupDepthFrac = 0.55) {
  const cupH = h * cupDepthFrac, stemH = h * 0.3, footH = h - cupH - stemH;
  return [
    { r: footR, y: 0 },
    { r: footR, y: footH * 0.15 },
    { r: stemR, y: footH + stemH * 0.1 },
    { r: stemR, y: footH + stemH * 0.9 },
    { r: cupR * 0.5, y: footH + stemH },
    { r: cupR, y: footH + stemH + cupH * 0.85 },
    { r: cupR * 1.05, y: h },
  ];
}

/* A wide double bulge narrowing at the waist between them — the gourd shape. */
function profileGourdDouble(h, rBase, rWaist, rTop) {
  return [
    { r: rBase * 0.4, y: 0 },
    { r: rBase, y: h * 0.22 },
    { r: rWaist, y: h * 0.45 },
    { r: rTop, y: h * 0.8 },
    { r: rTop * 0.6, y: h * 0.95 },
    { r: rTop * 0.5, y: h },
  ];
}

/* A half-torus handle arcing from shoulder height down to belly height on
   one side. */
function buildVaseHandle(radius, yTop, yBottom, side, color) {
  const handle = new THREE.Mesh(
    new THREE.TorusGeometry((yTop - yBottom) / 2, radius * 0.05, 6, 12, Math.PI),
    new THREE.MeshStandardMaterial({ color, roughness: 0.55 })
  );
  handle.rotation.z = Math.PI / 2;
  handle.rotation.y = side > 0 ? 0 : Math.PI;
  handle.position.set(side * radius * 0.92, (yTop + yBottom) / 2, 0);
  handle.userData.part = "body";
  return handle;
}

/* A handful of tiny embedded pebble flecks scattered up the surface —
   stands in for a speckled terrazzo glaze without needing a texture map. */
function buildVaseSpeckle(profile, color1, color2) {
  const g = new THREE.Group();
  const golden = Math.PI * (3 - Math.sqrt(5));
  const topY = profile[profile.length - 1].y;
  const count = 22;
  for (let i = 0; i < count; i++) {
    const t = ((i * 7) % count) / count;
    const y = topY * (0.08 + t * 0.86);
    // Interpolate the profile radius at this height for a fleck that sits on the surface, not floating off it.
    let r = profile[0].r;
    for (let k = 0; k < profile.length - 1; k++) {
      if (y >= profile[k].y && y <= profile[k + 1].y) {
        const span = profile[k + 1].y - profile[k].y || 1;
        const lt = (y - profile[k].y) / span;
        r = profile[k].r + (profile[k + 1].r - profile[k].r) * lt;
        break;
      }
    }
    const theta = i * golden;
    const fleck = new THREE.Mesh(
      new THREE.SphereGeometry(0.006 + ((i * 5) % 3) * 0.003, 4, 4),
      new THREE.MeshStandardMaterial({ color: i % 2 === 0 ? color1 : color2, roughness: 0.8 })
    );
    fleck.position.set(Math.cos(theta) * r * 0.98, y, Math.sin(theta) * r * 0.98);
    fleck.userData.part = "body";
    g.add(fleck);
  }
  return g;
}

// Previously none of these 36 set their own `color`, so every vase fell
// back to buildVase's one shared off-white and the whole category read as
// identical in the list — each now carries its own ceramic-glaze tone.
const VASE_STYLES = {
  "spiral-twist": { profile: profileTapered(0.5, 0.09, 0.075, { flareTop: 0.01 }), ribCount: 10, ribDepth: 0.018, radialSegments: 32, twist: Math.PI * 1.3, color: 0xc1666b },
  "fluted-tapered": { profile: profileTapered(0.48, 0.085, 0.07), ribCount: 14, ribDepth: 0.012, radialSegments: 40, color: 0x4a7c6f },
  "stacked-bubble": { profile: profileStackedBubbles(0.4, 0.11, 3), radialSegments: 28, color: 0xd4a373 },
  "fluted-bulbous": { profile: profileBulbous(0.42, 0.07, 0.13, 0.08, 0.09), ribCount: 16, ribDepth: 0.012, radialSegments: 40, color: 0x6a4c93 },
  "ruffled-wavy-tall": { profile: profileWavy(0.5, 0.09, 3, 0.025), ruffleTop: 0.02, radialSegments: 32, color: 0x457b9d },
  "textured-cylinder": { profile: profileTapered(0.32, 0.06, 0.055), roughness: 0.95, radialSegments: 24, color: 0xb56576 },
  ring: { ring: true, ringR: 0.16, tubeR: 0.045, color: 0xc9a44c },
  "textured-cylinder-tall": { profile: profileTapered(0.42, 0.05, 0.045), roughness: 0.9, radialSegments: 24, color: 0x588157 },
  "faceted-hex": { profile: profileTapered(0.45, 0.09, 0.075), radialSegments: 6, flatShading: true, color: 0x7c4a6b },
  "wavy-stack": { profile: profileWavy(0.4, 0.11, 4, 0.03), radialSegments: 32, color: 0xbc6c25 },
  "amphora-handles": { profile: profileBulbous(0.4, 0.08, 0.14, 0.07, 0.08), handles: 2, radialSegments: 32, color: 0x386641 },
  "bud-simple": { profile: profileBottleNeck(0.34, 0.07, 0.1, 0.02, 0.025), radialSegments: 24, color: 0x8a5a44 },
  "fluted-narrow": { profile: profileTapered(0.5, 0.06, 0.05), ribCount: 18, ribDepth: 0.008, radialSegments: 36, color: 0x5c6e8a },
  "bulbous-round": { profile: profileBulbous(0.32, 0.09, 0.15, 0.1, 0.12, 0.5), radialSegments: 32, color: 0xa13d5c },
  "wavy-simple": { profile: profileWavy(0.38, 0.09, 2, 0.02), radialSegments: 32, color: 0x6b8f71 },
  "tapered-cone": { profile: profileTapered(0.36, 0.045, 0.09), radialSegments: 28, color: 0x9c6b3f },
  "ruffled-trumpet": { profile: profileTapered(0.4, 0.05, 0.1), ruffleTop: 0.025, radialSegments: 32, color: 0x4f6b4f },
  "wavy-organic-tall": { profile: profileWavy(0.48, 0.09, 5, 0.02), radialSegments: 32, color: 0x8e7cc3 },
  "ribbed-vertical-tall": { profile: profileTapered(0.46, 0.075, 0.065), ribCount: 20, ribDepth: 0.01, radialSegments: 40, color: 0xb5654f },
  "gourd-round": { profile: profileGourdDouble(0.34, 0.1, 0.09, 0.13), radialSegments: 32, color: 0x2a6f77 },
  goblet: { profile: profileGoblet(0.34, 0.13, 0.03, 0.09), radialSegments: 32, color: 0x6a4c7a },
  "spherical-round": { profile: profileBulbous(0.28, 0.04, 0.14, 0.05, 0.055, 0.55), radialSegments: 32, color: 0xd98e73 },
  "jug-single-handle": { profile: profileBottleNeck(0.34, 0.09, 0.12, 0.045, 0.05), handles: 1, radialSegments: 32, color: 0x3f6b6f },
  "faceted-gem": { profile: profileBulbous(0.32, 0.06, 0.12, 0.07, 0.075), radialSegments: 7, flatShading: true, color: 0xee6c4d },
  "gourd-stack": { profile: profileStackedBubbles(0.36, 0.1, 2), radialSegments: 28, color: 0x7b2d43 },
  "ring-textured-cylinder": { profile: profileTapered(0.34, 0.075, 0.07), ribCount: 6, ribDepth: 0.006, radialSegments: 32, color: 0x4a5859 },
  "organic-lumpy": { profile: profileWavy(0.3, 0.12, 3, 0.035), radialSegments: 28, color: 0xa3773f },
  "rough-organic": { profile: profileTapered(0.32, 0.08, 0.075), ribCount: 5, ribDepth: 0.02, roughness: 0.95, radialSegments: 28, color: 0x6f8a7c },
  "fluted-cylinder": { profile: profileTapered(0.4, 0.07, 0.065), ribCount: 16, ribDepth: 0.01, radialSegments: 36, color: 0x8b2e3f },
  "bud-curvy": { profile: profileBottleNeck(0.32, 0.075, 0.1, 0.025, 0.03, 0.5), radialSegments: 24, color: 0x5c4a7c },
  "wavy-tall2": { profile: profileWavy(0.44, 0.08, 4, 0.022), radialSegments: 32, color: 0xc2703f },
  "bud-round-simple": { profile: profileBottleNeck(0.3, 0.09, 0.1, 0.018, 0.02), radialSegments: 24, color: 0x2f4858 },
  "fluted-trumpet-flare": { profile: profileTapered(0.38, 0.045, 0.1), ribCount: 14, ribDepth: 0.01, radialSegments: 32, color: 0x9b6f9b },
  "handled-pitcher": { profile: profileBulbous(0.36, 0.08, 0.11, 0.06, 0.08), handles: 1, radialSegments: 32, color: 0xa15c3e },
  "wavy-ribbed-tall": { profile: profileWavy(0.46, 0.075, 6, 0.015), ribCount: 8, ribDepth: 0.008, radialSegments: 32, color: 0x4c6b81 },
  "terrazzo-speckle": { profile: profileTapered(0.36, 0.075, 0.07), roughness: 0.9, speckle: true, radialSegments: 24, color: 0x8a6a2e },
};

/* Assembles a full vase — body mesh (+handles/speckle, or an open ring in
   place of a body) — from the VASE_STYLES table for a given variant id.
   Each variant now carries its own default ceramic-glaze color (see note
   above); Advanced Edit / the standard color picker can still override it
   via the `body` part like any other item. */
function buildVase(variant) {
  const style = VASE_STYLES[variant] || VASE_STYLES["bulbous-round"];
  const g = new THREE.Group();
  const baseColor = style.color || 0xf2efe8;
  if (style.ring) {
    const ring = new THREE.Mesh(
      new THREE.TorusGeometry(style.ringR, style.tubeR, 16, 32),
      new THREE.MeshStandardMaterial({ color: baseColor, roughness: 0.55 })
    );
    ring.rotation.x = Math.PI / 2;
    ring.position.y = style.ringR + style.tubeR;
    ring.userData.part = "body";
    g.add(ring);
    return g;
  }
  const body = buildVaseMesh(style.profile, { ...style, color: baseColor });
  g.add(body);
  if (style.handles) {
    const rMax = style.profile.reduce((m, p) => Math.max(m, p.r), 0);
    const yTop = style.profile[style.profile.length - 1].y * 0.78;
    const yBottom = style.profile[style.profile.length - 1].y * 0.42;
    if (style.handles === 2) {
      g.add(buildVaseHandle(rMax, yTop, yBottom, 1, baseColor));
      g.add(buildVaseHandle(rMax, yTop, yBottom, -1, baseColor));
    } else {
      g.add(buildVaseHandle(rMax, yTop, yBottom, 1, baseColor));
    }
  }
  if (style.speckle) {
    g.add(buildVaseSpeckle(style.profile, 0x3a3630, 0xc9bea8));
  }
  return g;
}

/* ── Sheer drape curtains (reference sheet #7 — ivory curtain grid) ──
   A single cloth-panel mesh builder plus a small "kind" dispatcher covers
   every drape style on that sheet: plain hanging panels, panels pinched
   into a tieback partway down, a wide panel with a curved (rather than
   flat) bottom edge for swags/valances, and panels rotated around their
   rod-attachment point for diagonal/crossed drapes. Nothing here is a
   flat plane — every panel is a grid mesh with a sine-wave ripple baked
   into its X position at build time, which is what reads as hanging
   fabric folds rather than a stiff flat sheet. */
function buildCurtainPanel(width, height, opts = {}) {
  const {
    segsX = 14, segsY = 16,
    foldAmp = 0.03, foldFreq = 3,
    topCurve = null, bottomCurve = null,
    tiebackAt = null, tiebackPull = 0.35,
    color = 0xf7f1e4, opacity = 0.85, roughness = 0.75,
  } = opts;
  const positions = [];
  for (let iy = 0; iy <= segsY; iy++) {
    const v = iy / segsY; // 0 at the rod, 1 at the floor
    for (let ix = 0; ix <= segsX; ix++) {
      const u = ix / segsX; // 0..1 across the panel width
      const topY = topCurve ? topCurve(u) : height;
      const botY = bottomCurve ? bottomCurve(u) : 0;
      let y = topY - (topY - botY) * v;
      let x = (u - 0.5) * width;
      // A deterministic per-column ripple (not Math.random() — this can
      // rebuild on every color/material tweak) standing in for hanging folds.
      // Driven only by `u` (not also by the raw segment index) so the wave
      // stays smooth at low segment counts instead of aliasing into a
      // jagged zigzag — a stray extra `ix`-based term here previously made
      // every panel's edge look chewed-up rather than gently rippled.
      const fold = Math.sin(u * Math.PI * foldFreq) * foldAmp * (0.55 + 0.45 * Math.sin(v * Math.PI * 0.9 + 0.2));
      x += fold;
      if (tiebackAt != null) {
        // Pulls this ring's x toward the panel's own centerline, tapering
        // off with vertical distance from the tieback height — the pinch
        // that gives a tied-back curtain its hourglass silhouette.
        const dist = Math.abs(v - tiebackAt);
        const pinch = Math.max(0, 1 - dist * 5);
        x *= 1 - tiebackPull * pinch;
      }
      positions.push(x, y, 0);
    }
  }
  const indices = [];
  for (let iy = 0; iy < segsY; iy++) {
    for (let ix = 0; ix < segsX; ix++) {
      const a = iy * (segsX + 1) + ix;
      const b = a + segsX + 1;
      const c = a + 1;
      const d = b + 1;
      indices.push(a, b, c, c, b, d);
    }
  }
  const geo = new THREE.BufferGeometry();
  geo.setAttribute("position", new THREE.Float32BufferAttribute(positions, 3));
  geo.setIndex(indices);
  geo.computeVertexNormals();
  // Only actually enable alpha blending for the noticeably-sheer variants.
  // Marking every panel `transparent` (even at opacity 0.95+) forces WebGL
  // to depth-sort and alpha-blend every triangle instead of just depth-
  // testing them — with several overlapping panels/rod/tieback meshes in
  // one curtain, that sorting is unstable and reads as broken/blobby
  // geometry rather than soft fabric, which is what made these look odd.
  const isSheer = opacity < 0.97;
  const mesh = new THREE.Mesh(geo, new THREE.MeshStandardMaterial({
    color, roughness, side: THREE.DoubleSide,
    transparent: isSheer, opacity: isSheer ? opacity : 1,
  }));
  mesh.userData.part = "curtain";
  return mesh;
}

/* Bottom-edge curve generators (absolute Y, not an offset) for the swag/
   valance kind — the panel's top edge stays flat at the rod; only the
   bottom edge's shape changes. */
function archLegsCurve(height, archFrac) {
  // 0 (touches the floor) at both edges, rising to archFrac*height at the
  // center — reads as an open arch with the fabric draping down each side.
  return u => height * archFrac * Math.sin(Math.max(0, Math.min(1, u)) * Math.PI);
}
function smileValanceCurve(height, dipFrac, shallowFrac) {
  // Stays near the rod (shallowFrac) at the edges and droops down to
  // dipFrac at the center — the classic swag "smile" below a rod.
  return u => height * (shallowFrac - (shallowFrac - dipFrac) * Math.sin(Math.max(0, Math.min(1, u)) * Math.PI));
}
function tailsSmileCurve(height, dipFrac, shallowFrac, tailFrac = 0.15) {
  // Like smileValanceCurve in the middle span, but the outermost sliver at
  // each edge drops all the way to the floor — long hanging "tails."
  const mid = smileValanceCurve(height, dipFrac, shallowFrac);
  return u => {
    if (u < tailFrac) return height * shallowFrac * (u / tailFrac);
    if (u > 1 - tailFrac) return height * shallowFrac * ((1 - u) / tailFrac);
    return mid((u - tailFrac) / (1 - 2 * tailFrac));
  };
}

function buildCurtainRod(width, y, color = 0xb8a888) {
  const g = new THREE.Group();
  const rod = new THREE.Mesh(new THREE.CylinderGeometry(0.016, 0.016, width, 10), new THREE.MeshStandardMaterial({ color, metalness: 0.4, roughness: 0.4 }));
  rod.rotation.z = Math.PI / 2;
  rod.position.y = y;
  rod.userData.part = "rod";
  g.add(rod);
  [-width / 2 - 0.03, width / 2 + 0.03].forEach(x => {
    const finial = new THREE.Mesh(new THREE.SphereGeometry(0.026, 8, 6), new THREE.MeshStandardMaterial({ color, metalness: 0.4, roughness: 0.4 }));
    finial.position.set(x, y, 0);
    finial.userData.part = "rod";
    g.add(finial);
  });
  return g;
}

function buildTiebackBand(x, y, color) {
  const band = new THREE.Mesh(
    new THREE.TorusGeometry(0.045, 0.011, 6, 12),
    new THREE.MeshStandardMaterial({ color, roughness: 0.6 })
  );
  band.rotation.x = Math.PI / 2;
  band.position.set(x, y, 0.01);
  band.userData.part = "curtain";
  return band;
}

/* Builds the tieback gather decoration in one of several real curtain-tie
   styles instead of always the same plain band — `style` selects which. */
function buildTieDecoration(tieStyle, x, y, color) {
  if (tieStyle === "rope") {
    const g = new THREE.Group();
    const cord = new THREE.Mesh(
      new THREE.TorusGeometry(0.05, 0.017, 8, 16),
      new THREE.MeshStandardMaterial({ color: 0xc9a54a, roughness: 0.55 })
    );
    cord.rotation.x = Math.PI / 2;
    cord.position.set(x, y, 0.015);
    cord.userData.part = "curtain";
    g.add(cord);
    // Two small tassels hanging from the knot, the classic rope-tieback finish.
    [-1, 1].forEach(side => {
      const tassel = new THREE.Mesh(
        new THREE.ConeGeometry(0.014, 0.055, 6),
        new THREE.MeshStandardMaterial({ color: 0xc9a54a, roughness: 0.55 })
      );
      tassel.position.set(x + side * 0.035, y - 0.045, 0.02);
      tassel.rotation.x = Math.PI;
      tassel.userData.part = "curtain";
      g.add(tassel);
    });
    return g;
  }
  if (tieStyle === "bow") {
    const g = new THREE.Group();
    const knot = new THREE.Mesh(new THREE.SphereGeometry(0.022, 8, 6), new THREE.MeshStandardMaterial({ color, roughness: 0.7 }));
    knot.position.set(x, y, 0.02);
    knot.userData.part = "curtain";
    g.add(knot);
    // Two fabric loops flanking the knot, each with a short tail hanging
    // below — reads as a soft bow rather than a cinched band.
    [-1, 1].forEach(side => {
      const loop = new THREE.Mesh(
        new THREE.TorusGeometry(0.032, 0.011, 6, 12, Math.PI * 1.5),
        new THREE.MeshStandardMaterial({ color, roughness: 0.7, side: THREE.DoubleSide })
      );
      loop.position.set(x + side * 0.032, y, 0.02);
      loop.rotation.z = side > 0 ? -0.35 : Math.PI + 0.35;
      loop.userData.part = "curtain";
      g.add(loop);
      const tail = new THREE.Mesh(new THREE.PlaneGeometry(0.022, 0.06), new THREE.MeshStandardMaterial({ color, roughness: 0.7, side: THREE.DoubleSide }));
      tail.position.set(x + side * 0.018, y - 0.045, 0.018);
      tail.rotation.z = side * 0.2;
      tail.userData.part = "curtain";
      g.add(tail);
    });
    return g;
  }
  if (tieStyle === "buckle") {
    const g = new THREE.Group();
    const strap = new THREE.Mesh(
      new THREE.TorusGeometry(0.05, 0.02, 6, 16),
      new THREE.MeshStandardMaterial({ color, roughness: 0.75 })
    );
    strap.rotation.x = Math.PI / 2;
    strap.position.set(x, y, 0.015);
    strap.userData.part = "curtain";
    g.add(strap);
    const buckle = new THREE.Mesh(
      new THREE.BoxGeometry(0.022, 0.032, 0.008),
      new THREE.MeshStandardMaterial({ color: 0xb8a888, metalness: 0.5, roughness: 0.4 })
    );
    buckle.position.set(x, y, 0.032);
    buckle.userData.part = "curtain";
    g.add(buckle);
    return g;
  }
  return buildTiebackBand(x, y, color);
}

/* Top-edge curve for eyelet/grommet curtains — the fabric is threaded
   through evenly spaced rings rather than gathered onto the rod, so the
   header dips into a smooth scallop between each ring instead of hanging
   flat. Peaks (at the rod) fall exactly at each grommet position. */
function eyeletTopCurve(height, grommetCount, dipDepth) {
  const gaps = Math.max(1, grommetCount - 1);
  return u => height - dipDepth * (0.5 - 0.5 * Math.cos(u * Math.PI * 2 * gaps));
}

/* One eyelet panel plus its ring of grommets threaded on the rod — shared
   by both eyelet variants so only the panel count/tieback differs between them. */
function buildEyeletPanelWithRings(panelW, height, grommetCount, dipDepth, opts) {
  const g = new THREE.Group();
  const topCurve = eyeletTopCurve(height, grommetCount, dipDepth);
  g.add(buildCurtainPanel(panelW, height, { ...opts, topCurve }));
  const gaps = Math.max(1, grommetCount - 1);
  for (let i = 0; i < grommetCount; i++) {
    const u = i / gaps;
    const ring = new THREE.Mesh(
      new THREE.TorusGeometry(0.024, 0.007, 6, 12),
      new THREE.MeshStandardMaterial({ color: 0xc8bfa8, metalness: 0.3, roughness: 0.5 })
    );
    ring.rotation.y = Math.PI / 2;
    ring.position.set((u - 0.5) * panelW, height, 0);
    ring.userData.part = "curtain";
    g.add(ring);
  }
  return g;
}

/* Opacity is tuned per `kind`, not just per "how sheer should this look":
   a kind whose panels can overlap in screen space (crossed/tieback-band-
   over-fabric) is pushed close to 1 regardless, since alpha-blending stacked
   transparent triangles is what actually caused the broken/blobby look —
   only kinds where panels never overlap each other (a single swag mesh, or
   two side-by-side straight panels with a gap between them) are given real
   transparency. Swag/valance curve depths are also capped well short of
   the panel's full height so the fabric never thins to a near-zero-height
   sliver at its shallowest point, which read as a torn/broken membrane. */
// Previously every curtain fell back to buildCurtain's one shared cream
// default (none of these set their own `color`) — all 22 rendered
// identically. Each now carries its own rich, clearly-distinct fabric tone.
const CURTAIN_STYLES = {
  "sheer-straight-double": { kind: "double-straight", width: 1.9, height: 2.0, opacity: 0.65, foldAmp: 0.022, foldFreq: 3, color: 0xc97b84 },
  "tieback-classic": { kind: "double-tieback", width: 1.9, height: 2.0, opacity: 0.98, foldAmp: 0.03, tiebackAt: 0.55, tiebackPull: 0.4, color: 0x8b2e3f },
  "straight-heavy": { kind: "double-straight", width: 1.9, height: 2.0, opacity: 1, foldAmp: 0.045, foldFreq: 4, color: 0x2f4858 },
  "tieback-elegant": { kind: "double-tieback", width: 1.9, height: 2.05, opacity: 0.98, foldAmp: 0.04, tiebackAt: 0.42, tiebackPull: 0.45, color: 0x6b4e8c },
  "swag-arch-full": { kind: "swag", width: 1.95, height: 2.0, opacity: 0.92, foldAmp: 0.02, curve: "arch", archFrac: 0.55, color: 0xc9a44c },
  "single-flat": { kind: "single-panel", width: 1.6, height: 2.0, opacity: 1, foldAmp: 0.006, panelWFrac: 0.5, anchorFrac: 0, color: 0x4a7c6f },
  "center-swoop-valance": { kind: "swag", width: 1.9, height: 2.0, opacity: 0.9, foldAmp: 0.02, curve: "smile", dipFrac: 0.62, shallowFrac: 0.92, color: 0xb5654f },
  "sheer-voile": { kind: "double-straight", width: 1.9, height: 2.0, opacity: 0.4, foldAmp: 0.016, foldFreq: 4, color: 0x7a9cc6 },
  "wide-backdrop": { kind: "single-wide", width: 2.1, height: 2.0, opacity: 0.95, foldAmp: 0.03, foldFreq: 6, color: 0x5c6e8a },
  "center-gathered": { kind: "double-tieback", width: 1.9, height: 2.0, opacity: 0.98, foldAmp: 0.032, tiebackAt: 0.5, tiebackPull: 0.5, gatherKnot: true, color: 0xa13d5c },
  "tieback-simple": { kind: "double-tieback", width: 1.9, height: 2.0, opacity: 0.98, foldAmp: 0.025, tiebackAt: 0.7, tiebackPull: 0.3, color: 0x6b8f71 },
  "eyelet-plain": { kind: "eyelet", width: 1.9, height: 2.0, opacity: 1, foldAmp: 0.02, grommetCount: 6, dipDepth: 0.05, color: 0x8a5a44 },
  "twin-tieback-arch": { kind: "double-tieback", width: 1.9, height: 2.0, opacity: 0.98, foldAmp: 0.028, tiebackAt: 0.78, tiebackPull: 0.55, color: 0x4f6b4f },
  "straight-simple": { kind: "double-straight", width: 1.9, height: 2.0, opacity: 0.75, foldAmp: 0.018, foldFreq: 2, color: 0x9c6b3f },
  "swag-with-tails": { kind: "swag", width: 1.95, height: 2.05, opacity: 0.92, foldAmp: 0.022, curve: "tails", dipFrac: 0.6, shallowFrac: 0.9, tailFrac: 0.14, color: 0x7c4a6b },
  "eyelet-tieback": { kind: "eyelet", width: 1.9, height: 2.0, opacity: 1, foldAmp: 0.02, grommetCount: 6, dipDepth: 0.045, tiebackAt: 0.65, tiebackPull: 0.3, color: 0x3f6b6f },
  "tieback-rope": { kind: "double-tieback", width: 1.9, height: 2.0, opacity: 0.98, foldAmp: 0.028, tiebackAt: 0.6, tiebackPull: 0.38, tieStyle: "rope", color: 0xa3773f },
  "wide-flat-pooled": { kind: "single-wide", width: 2.1, height: 2.12, opacity: 0.97, foldAmp: 0.035, foldFreq: 5, color: 0x5c4a7c },
  "tieback-bow": { kind: "double-tieback", width: 1.9, height: 2.0, opacity: 0.98, foldAmp: 0.03, tiebackAt: 0.5, tiebackPull: 0.4, tieStyle: "bow", color: 0xc2703f },
  "tieback-buckle": { kind: "double-tieback", width: 1.9, height: 2.0, opacity: 0.98, foldAmp: 0.026, tiebackAt: 0.58, tiebackPull: 0.35, tieStyle: "buckle", color: 0x4a5859 },
  "wide-no-rod": { kind: "single-wide", width: 2.1, height: 2.0, opacity: 0.95, foldAmp: 0.03, foldFreq: 5, noRod: true, color: 0x8e7cc3 },
  "single-no-rod": { kind: "single-panel", width: 1.6, height: 2.0, opacity: 1, foldAmp: 0.008, panelWFrac: 0.55, anchorFrac: 0, noRod: true, color: 0xb56576 },
};

/* Assembles a full curtain — rod + one or more cloth panels arranged per
   the variant's `kind` — from the CURTAIN_STYLES table. */
function buildCurtain(variant) {
  const style = CURTAIN_STYLES[variant] || CURTAIN_STYLES["sheer-straight-double"];
  const g = new THREE.Group();
  const { width, height, color = 0xf7f1e4, opacity, foldAmp, foldFreq = 3 } = style;
  // noRod variants are fabric-only — meant to be paired with a separately
  // placed "Curtain Rod" holder item so the rod/finial style can be picked
  // independently of the drape style.
  if (!style.noRod) g.add(buildCurtainRod(width, height + 0.02));
  const baseOpts = { color, opacity, foldAmp, foldFreq };

  if (style.kind === "double-straight") {
    const gap = style.gap ?? 0.1;
    const panelW = (width - gap) / 2 - 0.02;
    const left = buildCurtainPanel(panelW, height, baseOpts);
    left.position.x = -(gap / 2 + panelW / 2);
    const right = buildCurtainPanel(panelW, height, baseOpts);
    right.position.x = gap / 2 + panelW / 2;
    g.add(left, right);
  } else if (style.kind === "double-tieback") {
    const gap = style.gap ?? 0.1;
    const panelW = (width - gap) / 2 - 0.02;
    const tieOpts = { ...baseOpts, tiebackAt: style.tiebackAt, tiebackPull: style.tiebackPull };
    const left = buildCurtainPanel(panelW, height, tieOpts);
    left.position.x = -(gap / 2 + panelW / 2);
    const right = buildCurtainPanel(panelW, height, tieOpts);
    right.position.x = gap / 2 + panelW / 2;
    g.add(left, right);
    const bandY = height * style.tiebackAt;
    g.add(buildTieDecoration(style.tieStyle, left.position.x * (1 - style.tiebackPull * 0.7), bandY, color));
    g.add(buildTieDecoration(style.tieStyle, right.position.x * (1 - style.tiebackPull * 0.7), bandY, color));
    if (style.gatherKnot) {
      const knot = new THREE.Mesh(new THREE.SphereGeometry(0.05, 8, 6), new THREE.MeshStandardMaterial({ color, roughness: 0.7 }));
      knot.position.set(0, bandY, 0.02);
      knot.userData.part = "curtain";
      g.add(knot);
    }
  } else if (style.kind === "single-wide") {
    g.add(buildCurtainPanel(width - 0.04, height, baseOpts));
  } else if (style.kind === "single-panel") {
    // One flat panel, deliberately low fold amplitude — a minimalist single
    // drop rather than a full pleated pair.
    const panel = buildCurtainPanel(width * (style.panelWFrac ?? 0.55), height, baseOpts);
    panel.position.x = (style.anchorFrac ?? 0) * width;
    g.add(panel);
  } else if (style.kind === "swag") {
    let bottomCurve;
    if (style.curve === "arch") bottomCurve = archLegsCurve(height, style.archFrac);
    else if (style.curve === "smile") bottomCurve = smileValanceCurve(height, style.dipFrac, style.shallowFrac);
    else bottomCurve = tailsSmileCurve(height, style.dipFrac, style.shallowFrac, style.tailFrac);
    g.add(buildCurtainPanel(width - 0.04, height, { ...baseOpts, bottomCurve }));
  } else if (style.kind === "eyelet") {
    const gap = style.gap ?? 0.1;
    const panelW = (width - gap) / 2 - 0.02;
    const grommetCount = style.grommetCount ?? 6;
    const dipDepth = style.dipDepth ?? 0.05;
    const tieOpts = style.tiebackAt != null ? { tiebackAt: style.tiebackAt, tiebackPull: style.tiebackPull } : {};
    const left = buildEyeletPanelWithRings(panelW, height, grommetCount, dipDepth, { ...baseOpts, ...tieOpts });
    left.position.x = -(gap / 2 + panelW / 2);
    const right = buildEyeletPanelWithRings(panelW, height, grommetCount, dipDepth, { ...baseOpts, ...tieOpts });
    right.position.x = gap / 2 + panelW / 2;
    g.add(left, right);
    if (style.tiebackAt != null) {
      const bandY = height * style.tiebackAt;
      g.add(buildTiebackBand(left.position.x * (1 - style.tiebackPull * 0.7), bandY, color));
      g.add(buildTiebackBand(right.position.x * (1 - style.tiebackPull * 0.7), bandY, color));
    }
  }
  return g;
}

/* ── Occasional tables (reference sheet #8 — fluted-plaster / marble /
   wood / brass table grid) ──
   Every silhouette on that sheet reduces to a tabletop (round, oval, or
   rectangular) sitting on one of a handful of base "kinds": a single
   turned pedestal column, two pedestal columns under an oval top, flat
   slab legs (a tripod of three, a waterfall pair flush with the short
   ends, or plain corner legs), a solid or fluted drum, three angled
   tripod legs, a crossed X-frame, a thin ring-and-post frame, a four-post
   cage frame, or a stack of shrinking spheres. TABLE_STYLES picks a
   `kind` plus that kind's own params for each catalog variant, and
   reuses the vase section's profileTapered/profileBottleNeck silhouette
   helpers for the turned-column kinds rather than re-deriving that math.
   Every mesh is tagged userData.part = "top" or "base" (never both) so
   Advanced Edit can recolor/re-material the tabletop and the base
   independently, whatever shape either one takes. */
function buildTableRevolve(profile, opts = {}) {
  const { radialSegments = 32, ribCount = 0, ribDepth = 0, color = 0xf2ede0, roughness = 0.55, metalness = 0 } = opts;
  const positions = [];
  const ringCount = profile.length;
  for (let ri = 0; ri < ringCount; ri++) {
    const { r, y } = profile[ri];
    const isBottom = ri === 0;
    for (let s = 0; s <= radialSegments; s++) {
      const theta = (s / radialSegments) * Math.PI * 2;
      let rad = r;
      if (!isBottom && ribCount) rad += Math.cos(theta * ribCount) * ribDepth;
      positions.push(Math.cos(theta) * rad, y, Math.sin(theta) * rad);
    }
  }
  const indices = [];
  for (let ri = 0; ri < ringCount - 1; ri++) {
    for (let s = 0; s < radialSegments; s++) {
      const a = ri * (radialSegments + 1) + s;
      const b = a + radialSegments + 1;
      const c = a + 1;
      const d = b + 1;
      indices.push(a, b, c, c, b, d);
    }
  }
  const geo = new THREE.BufferGeometry();
  geo.setAttribute("position", new THREE.Float32BufferAttribute(positions, 3));
  geo.setIndex(indices);
  geo.computeVertexNormals();
  const mesh = new THREE.Mesh(geo, new THREE.MeshStandardMaterial({ color, roughness, metalness, side: THREE.DoubleSide }));
  mesh.userData.part = "base";
  return mesh;
}

// The wood/black-metal/gold/glass tones below already read as visibly
// colored and are left alone; only the cream/"marble" family (which used
// to make a third of this table blur together in the list) gets shifted
// to a richer, mutually-distinct tint per entry — a colored-lacquer or
// tinted-stone finish instead of plain white/cream.
const TABLE_STYLES = {
  "pedestal-fluted-cream":  { kind: "pedestal", topShape: "round", topR: 0.68, height: 0.75, pedBaseR: 0.1, pedTopR: 0.095, ribCount: 16, ribDepth: 0.012, topColor: 0xb98a6f, baseColor: 0xb98a6f },
  "pedestal-hourglass":     { kind: "pedestal", topShape: "round", topR: 0.65, height: 0.74, profileFn: h => profileBottleNeck(h, 0.15, 0.2, 0.05, 0.09, 0.6), topColor: 0xcbb99e, baseColor: 0xcbb99e },
  "pedestal-fluted-white":  { kind: "pedestal", topShape: "round", topR: 0.6,  height: 0.74, pedBaseR: 0.085, pedTopR: 0.08, ribCount: 20, ribDepth: 0.008, topColor: 0x7c93a8, baseColor: 0x7c93a8 },
  "slab-tripod-cream":      { kind: "slab-legs", legCount: 3, topShape: "round", topR: 0.7, height: 0.75, topColor: 0x8a9b7a, baseColor: 0x8a9b7a },
  "pedestal-cone-stone":    { kind: "pedestal", topShape: "round", topR: 0.66, height: 0.75, pedBaseR: 0.16, pedTopR: 0.05, topColor: 0xd9cdb8, baseColor: 0xd9cdb8 },
  "pedestal-fluted-marble": { kind: "pedestal", topShape: "round", topR: 0.68, height: 0.75, pedBaseR: 0.1, pedTopR: 0.095, ribCount: 18, ribDepth: 0.01, topColor: 0xa8788a, baseColor: 0xa8788a, topRoughness: 0.15 },

  "oval-double-pedestal-fluted": { kind: "double-pedestal", topShape: "oval", topW: 1.7, topD: 0.95, height: 0.75, pedBaseR: 0.09, pedTopR: 0.08, ribCount: 14, ribDepth: 0.01, pedOffsetX: 0.55, topColor: 0xc97b5f, baseColor: 0xc97b5f },
  "oval-wood-legs":              { kind: "slab-legs", legCount: 2, topShape: "oval", topW: 1.7, topD: 0.95, height: 0.75, topColor: 0xa9754a, baseColor: 0x8B5E3C },
  "oval-stone-legs":             { kind: "slab-legs", legCount: 2, topShape: "oval", topW: 1.7, topD: 0.95, height: 0.75, topColor: 0x6f8a7c, baseColor: 0x6f8a7c },
  "oval-double-pedestal-round":  { kind: "double-pedestal", topShape: "oval", topW: 1.6, topD: 1.0, height: 0.75, pedBaseR: 0.09, pedTopR: 0.08, ribCount: 14, ribDepth: 0.01, pedOffsetX: 0.5, topColor: 0x8a6f9b, baseColor: 0x8a6f9b },

  "rect-waterfall-stone":  { kind: "slab-legs", legCount: 2, waterfall: true, topShape: "rect", topW: 1.8, topD: 0.9, height: 0.75, topColor: 0x7a8a9b, baseColor: 0x7a8a9b },
  "rect-waterfall-marble": { kind: "slab-legs", legCount: 2, waterfall: true, topShape: "rect", topW: 1.8, topD: 0.9, height: 0.75, topColor: 0x9b6f7a, baseColor: 0x9b6f7a, topRoughness: 0.15 },
  "rect-wood-legs":        { kind: "slab-legs", legCount: 4, topShape: "rect", topW: 1.6, topD: 0.85, height: 0.75, topColor: 0xa9754a, baseColor: 0x8B5E3C },
  "rect-glass-stone-legs": { kind: "slab-legs", legCount: 2, waterfall: true, topShape: "rect", topW: 1.7, topD: 0.85, height: 0.75, topGlass: true, topColor: 0xd9e8ea, baseColor: 0x6f8a7c },
  "rect-double-pedestal-fluted": { kind: "double-pedestal", topShape: "rect", topW: 1.8, topD: 0.9, height: 0.75, pedBaseR: 0.09, pedTopR: 0.08, ribCount: 14, ribDepth: 0.01, pedOffsetX: 0.62, topColor: 0x6f7a9b, baseColor: 0x6f7a9b },
  "rect-end-drums-stone":  { kind: "end-drums", topShape: "rect", topW: 1.7, topD: 0.85, height: 0.75, drumR: 0.22, topColor: 0xa87c5f, baseColor: 0xa87c5f },
  "rect-black-metal-legs": { kind: "slab-legs", legCount: 4, legThickness: 0.035, topShape: "rect", topW: 1.6, topD: 0.85, height: 0.75, topColor: 0xa9754a, baseColor: 0x1a1a1a, baseMetalness: 0.75, baseRoughness: 0.3 },
  "rect-hairpin-legs":     { kind: "hairpin-legs", topShape: "rect", topW: 1.65, topD: 0.85, height: 0.75, topColor: 0xc9a877, baseColor: 0x1a1a1a, baseMetalness: 0.75, baseRoughness: 0.3 },
  "rect-x-legs-wood":      { kind: "x-legs-ends", topShape: "rect", topW: 1.7, topD: 0.9, height: 0.75, topColor: 0x8B5E3C, baseColor: 0x6f4a2e },
  "rect-black-frame-legs": { kind: "frame-legs-ends", topShape: "rect", topW: 1.75, topD: 0.9, height: 0.75, topColor: 0x8a7a9b, topRoughness: 0.15, baseColor: 0x1a1a1a, baseMetalness: 0.75, baseRoughness: 0.3 },
  "rect-dark-walnut-legs": { kind: "slab-legs", legCount: 4, topShape: "rect", topW: 1.6, topD: 0.85, height: 0.75, topColor: 0x4a3728, baseColor: 0x3d2817 },
  "rect-concrete-waterfall": { kind: "slab-legs", legCount: 2, waterfall: true, topShape: "rect", topW: 1.8, topD: 0.9, height: 0.75, topColor: 0xb9b6b0, baseColor: 0xb9b6b0, topRoughness: 0.85, baseRoughness: 0.85 },
  "rect-two-tone-oak-black": { kind: "slab-legs", legCount: 4, legThickness: 0.035, topShape: "rect", topW: 1.65, topD: 0.85, height: 0.75, topColor: 0xd9bc8f, baseColor: 0x1a1a1a, baseMetalness: 0.7, baseRoughness: 0.3 },
  "rect-marble-black-legs": { kind: "slab-legs", legCount: 4, legThickness: 0.04, topShape: "rect", topW: 1.7, topD: 0.88, height: 0.75, topColor: 0x7a6f9b, topRoughness: 0.15, baseColor: 0x1a1a1a, baseMetalness: 0.7, baseRoughness: 0.3 },

  "round-cross-glass":      { kind: "cross", topShape: "round", topR: 0.65, height: 0.74, topGlass: true, topColor: 0xd9e8ea, baseColor: 0xdcd3c2 },
  "round-fluted-gold-ring": { kind: "pedestal", topShape: "round", topR: 0.62, height: 0.74, pedBaseR: 0.095, pedTopR: 0.09, ribCount: 16, ribDepth: 0.01, topColor: 0x6f8a9b, baseColor: 0xC9A44C, baseMetalness: 0.6, baseRoughness: 0.3, topRoughness: 0.15 },
  "round-cone-marble":      { kind: "pedestal", topShape: "round", topR: 0.62, height: 0.74, pedBaseR: 0.15, pedTopR: 0.05, topColor: 0x9b6f8a, baseColor: 0x9b6f8a, topRoughness: 0.15 },
  "round-drum-stone":       { kind: "drum", topShape: "round", topR: 0.6, height: 0.74, drumR: 0.5, topColor: 0x8a9b6f, baseColor: 0x8a9b6f },
  "round-cage-glass-gold":  { kind: "cage", topShape: "round", topR: 0.6, height: 0.74, cageSize: 0.42, topGlass: true, topColor: 0xd9e8ea, baseColor: 0xC9A44C, baseMetalness: 0.75, baseRoughness: 0.25 },
  "round-ring-gold-marble": { kind: "ring", topShape: "round", topR: 0.62, height: 0.74, ringR: 0.3, tubeR: 0.02, topColor: 0x7a9b8a, baseColor: 0xC9A44C, baseMetalness: 0.75, baseRoughness: 0.25, topRoughness: 0.15 },

  "side-ring-gold":      { kind: "ring", topShape: "round", topR: 0.28, height: 0.55, ringR: 0.16, tubeR: 0.016, topColor: 0x9b7a6f, baseColor: 0xC9A44C, baseMetalness: 0.7, baseRoughness: 0.3 },
  "side-fluted-cream":   { kind: "pedestal", topShape: "round", topR: 0.26, height: 0.55, pedBaseR: 0.07, pedTopR: 0.06, ribCount: 14, ribDepth: 0.008, topColor: 0x6f9b8a, baseColor: 0x6f9b8a },
  "side-stacked-sphere": { kind: "stacked-sphere", topShape: "round", topR: 0.24, height: 0.55, sphereCount: 3, pedTopR: 0.11, topColor: 0x9b6f9b, baseColor: 0x9b6f9b },
  "side-cone-cream":     { kind: "pedestal", topShape: "round", topR: 0.27, height: 0.55, pedBaseR: 0.12, pedTopR: 0.035, topColor: 0x7a8a6f, baseColor: 0x7a8a6f },
  "side-tripod-wood":    { kind: "tripod", topShape: "round", topR: 0.26, height: 0.5, topColor: 0x8B5E3C, baseColor: 0x8B5E3C },
  "side-drum-wood":      { kind: "drum", topShape: "round", topR: 0.27, height: 0.52, drumR: 0.2, topColor: 0xa9754a, baseColor: 0xa9754a },
  "side-cone-white":     { kind: "pedestal", topShape: "round", topR: 0.25, height: 0.55, pedBaseR: 0.11, pedTopR: 0.03, topColor: 0x9b7a9b, baseColor: 0x9b7a9b },

  "coffee-stone-tripod-slab": { kind: "slab-legs", legCount: 3, topShape: "round", topR: 0.6, height: 0.4, topColor: 0x6f8a9b, baseColor: 0x6f8a9b },
  "coffee-fluted-drum-cream": { kind: "drum", topShape: "round", topR: 0.58, height: 0.4, drumR: 0.48, ribCount: 18, ribDepth: 0.012, topColor: 0x9b8a6f, baseColor: 0x9b8a6f },
  "coffee-marble-brass-drum": { kind: "drum", topShape: "round", topR: 0.6, height: 0.4, drumR: 0.42, drumTaper: 0.9, topColor: 0x8a6f7a, baseColor: 0xC9A44C, baseMetalness: 0.7, baseRoughness: 0.3, topRoughness: 0.15 },
  "coffee-fluted-drum-wood":  { kind: "drum", topShape: "round", topR: 0.58, height: 0.4, drumR: 0.46, ribCount: 16, ribDepth: 0.012, topColor: 0xa9754a, baseColor: 0xa9754a },
  "coffee-marble-gold-ring":  { kind: "ring", topShape: "round", topR: 0.62, height: 0.38, ringR: 0.32, tubeR: 0.022, topColor: 0x6f9b7a, baseColor: 0xC9A44C, baseMetalness: 0.7, baseRoughness: 0.3, topRoughness: 0.15 },
};

/* Assembles a full table — tabletop + base — from the TABLE_STYLES table
   for a given variant id. The tabletop is always tagged "top" and every
   base component (however many meshes it takes) is tagged "base", so
   Advanced Edit's per-part color/material controls always resolve to
   exactly those two independently-editable pieces regardless of kind. */
function buildTable(variant) {
  const style = TABLE_STYLES[variant] || TABLE_STYLES["pedestal-fluted-cream"];
  const g = new THREE.Group();
  const {
    kind, topShape = "round", topR = 0.65, topW = 1.4, topD = 0.8,
    topThickness = 0.05, height = 0.75,
    topColor = 0xf2ede0, baseColor = 0xf2ede0,
  } = style;

  const topMat = new THREE.MeshStandardMaterial({
    color: topColor, roughness: style.topRoughness ?? 0.4, metalness: style.topMetalness ?? 0,
    transparent: !!style.topGlass, opacity: style.topGlass ? 0.4 : 1, side: THREE.DoubleSide,
  });
  let topMesh;
  if (topShape === "rect") {
    topMesh = new THREE.Mesh(new THREE.BoxGeometry(topW, topThickness, topD), topMat);
  } else if (topShape === "oval") {
    topMesh = new THREE.Mesh(new THREE.CylinderGeometry(0.5, 0.5, topThickness, 48), topMat);
    topMesh.scale.set(topW, 1, topD);
  } else {
    topMesh = new THREE.Mesh(new THREE.CylinderGeometry(topR, topR, topThickness, 48), topMat);
  }
  topMesh.position.y = height - topThickness / 2;
  topMesh.userData.part = "top";
  g.add(topMesh);

  const baseTopY = height - topThickness; // how tall the base structure needs to reach
  const baseMat = () => new THREE.MeshStandardMaterial({ color: baseColor, roughness: style.baseRoughness ?? 0.5, metalness: style.baseMetalness ?? 0 });

  if (kind === "pedestal") {
    const rTop = style.pedTopR ?? 0.09, rBase = style.pedBaseR ?? 0.1;
    const profile = style.profileFn ? style.profileFn(baseTopY) : profileTapered(baseTopY, rBase, rTop);
    g.add(buildTableRevolve(profile, { color: baseColor, ribCount: style.ribCount || 0, ribDepth: style.ribDepth || 0, roughness: style.baseRoughness ?? 0.55, metalness: style.baseMetalness ?? 0 }));
    const foot = new THREE.Mesh(new THREE.CylinderGeometry(rBase * 1.7, rBase * 1.9, 0.03, 32), baseMat());
    foot.position.y = 0.015; foot.userData.part = "base";
    g.add(foot);
  } else if (kind === "double-pedestal") {
    const rTop = style.pedTopR ?? 0.08, rBase = style.pedBaseR ?? 0.09;
    const offsetX = style.pedOffsetX ?? topW * 0.28;
    [-1, 1].forEach(side => {
      const profile = profileTapered(baseTopY, rBase, rTop);
      const col = buildTableRevolve(profile, { color: baseColor, ribCount: style.ribCount || 0, ribDepth: style.ribDepth || 0, roughness: style.baseRoughness ?? 0.55 });
      col.position.x = side * offsetX;
      g.add(col);
      const foot = new THREE.Mesh(new THREE.CylinderGeometry(rBase * 1.8, rBase * 2.0, 0.03, 28), baseMat());
      foot.position.set(side * offsetX, 0.015, 0); foot.userData.part = "base";
      g.add(foot);
    });
  } else if (kind === "slab-legs") {
    const legCount = style.legCount ?? 4;
    const legT = style.legThickness ?? 0.05;
    const legH = baseTopY;
    if (legCount === 3) {
      for (let i = 0; i < 3; i++) {
        const ang = (i / 3) * Math.PI * 2;
        const leg = new THREE.Mesh(new THREE.BoxGeometry(legT, legH, topR * 0.9), baseMat());
        leg.position.set(Math.cos(ang) * topR * 0.55, legH / 2, Math.sin(ang) * topR * 0.55);
        leg.rotation.y = ang; leg.userData.part = "base";
        g.add(leg);
      }
    } else if (style.waterfall) {
      // Two full-width slabs flush with the top's short ends, running straight to the floor.
      [-1, 1].forEach(side => {
        const leg = new THREE.Mesh(new THREE.BoxGeometry(legT, legH, topD * 0.94), baseMat());
        leg.position.set(side * (topW / 2 - legT / 2), legH / 2, 0); leg.userData.part = "base";
        g.add(leg);
      });
    } else if (legCount === 2) {
      // Two flat slab legs inset from each end — oval/rect dining tables.
      const spanX = (topShape === "oval" ? topW : topW) * 0.36;
      const depth = (topShape === "oval" ? topD : topD) * 0.85;
      [-1, 1].forEach(side => {
        const leg = new THREE.Mesh(new THREE.BoxGeometry(legT, legH, depth), baseMat());
        leg.position.set(side * spanX, legH / 2, 0); leg.userData.part = "base";
        g.add(leg);
      });
    } else {
      const lx = (topShape === "rect" ? topW : topR * 1.4) / 2 - 0.08;
      const lz = (topShape === "rect" ? topD : topR * 1.4) / 2 - 0.08;
      [[-lx, -lz], [lx, -lz], [-lx, lz], [lx, lz]].forEach(([x, z]) => {
        const leg = new THREE.Mesh(new THREE.BoxGeometry(legT, legH, legT), baseMat());
        leg.position.set(x, legH / 2, z); leg.userData.part = "base";
        g.add(leg);
      });
    }
  } else if (kind === "drum") {
    const drumR = style.drumR ?? topR * 0.85;
    if (style.ribCount) {
      const profile = [{ r: drumR, y: 0 }, { r: drumR * (style.drumTaper ?? 1), y: baseTopY }];
      g.add(buildTableRevolve(profile, { color: baseColor, ribCount: style.ribCount, ribDepth: style.ribDepth || 0.012, roughness: style.baseRoughness ?? 0.55 }));
    } else {
      const mesh = new THREE.Mesh(new THREE.CylinderGeometry(drumR, drumR * (style.drumTaper ?? 1), baseTopY, 40), baseMat());
      mesh.position.y = baseTopY / 2; mesh.userData.part = "base";
      g.add(mesh);
    }
  } else if (kind === "tripod") {
    const legLen = baseTopY * 1.05;
    for (let i = 0; i < 3; i++) {
      const ang = (i / 3) * Math.PI * 2;
      const leg = new THREE.Mesh(new THREE.CylinderGeometry(0.018, 0.026, legLen, 10), baseMat());
      leg.position.set(Math.cos(ang) * topR * 0.4, legLen / 2 * 0.94, Math.sin(ang) * topR * 0.4);
      leg.rotation.z = Math.cos(ang) * 0.22; leg.rotation.x = -Math.sin(ang) * 0.22;
      leg.userData.part = "base";
      g.add(leg);
    }
  } else if (kind === "cross") {
    const span = topR * 1.3;
    [45, -45].forEach(deg => {
      const slab = new THREE.Mesh(new THREE.BoxGeometry(0.06, baseTopY, span), baseMat());
      slab.rotation.y = THREE.MathUtils.degToRad(deg);
      slab.position.y = baseTopY / 2; slab.userData.part = "base";
      g.add(slab);
    });
  } else if (kind === "ring") {
    const ringR = style.ringR ?? topR * 0.55, tubeR = style.tubeR ?? 0.018;
    const ring = new THREE.Mesh(new THREE.TorusGeometry(ringR, tubeR, 12, 36), baseMat());
    ring.rotation.x = Math.PI / 2; ring.position.y = tubeR; ring.userData.part = "base";
    g.add(ring);
    const post = new THREE.Mesh(new THREE.CylinderGeometry(tubeR, tubeR, baseTopY - tubeR, 16), baseMat());
    post.position.y = (baseTopY + tubeR) / 2; post.userData.part = "base";
    g.add(post);
  } else if (kind === "cage") {
    const half = style.cageSize ?? topR * 0.75, barR = 0.012;
    [[-half, -half], [half, -half], [-half, half], [half, half]].forEach(([x, z]) => {
      const post = new THREE.Mesh(new THREE.CylinderGeometry(barR, barR, baseTopY, 8), baseMat());
      post.position.set(x, baseTopY / 2, z); post.userData.part = "base";
      g.add(post);
    });
    const braceLen = Math.sqrt((half * 2) ** 2 + baseTopY ** 2);
    const braceAngle = Math.atan2(half * 2, baseTopY);
    [-half, half].forEach(z => {
      [1, -1].forEach(sign => {
        const brace = new THREE.Mesh(new THREE.CylinderGeometry(barR, barR, braceLen, 8), baseMat());
        brace.position.set(0, baseTopY / 2, z);
        brace.rotation.z = sign * braceAngle; brace.userData.part = "base";
        g.add(brace);
      });
    });
  } else if (kind === "stacked-sphere") {
    const count = style.sphereCount ?? 3;
    const segH = baseTopY / count;
    for (let i = 0; i < count; i++) {
      const rad = Math.max((style.pedTopR ?? 0.11) * (1 - i * 0.14), 0.04);
      const sphere = new THREE.Mesh(new THREE.SphereGeometry(rad, 16, 16), baseMat());
      sphere.position.y = segH * (i + 0.5); sphere.userData.part = "base";
      g.add(sphere);
    }
    const foot = new THREE.Mesh(new THREE.CylinderGeometry(0.1, 0.11, 0.02, 24), baseMat());
    foot.position.y = 0.01; foot.userData.part = "base";
    g.add(foot);
  } else if (kind === "end-drums") {
    // Two chunky solid cylinder "parson" legs flush with the short ends —
    // a rectangular-table counterpart to the round tables' drum base.
    const drumR = style.drumR ?? Math.min(topD, topW) * 0.3;
    const legH = baseTopY;
    const offsetX = style.pedOffsetX ?? (topW / 2 - drumR * 1.15);
    [-1, 1].forEach(side => {
      const leg = new THREE.Mesh(new THREE.CylinderGeometry(drumR, drumR, legH, 28), baseMat());
      leg.position.set(side * offsetX, legH / 2, 0); leg.userData.part = "base";
      g.add(leg);
    });
  } else if (kind === "hairpin-legs") {
    // Each corner is a pair of thin rods splayed into a narrow V — the
    // mid-century "hairpin" silhouette, distinct from a single straight bar.
    const legH = baseTopY;
    const lx = topW / 2 - 0.09, lz = topD / 2 - 0.09;
    const barR = style.legBarR ?? 0.012;
    [[-lx, -lz], [lx, -lz], [-lx, lz], [lx, lz]].forEach(([x, z]) => {
      [-1, 1].forEach(dir => {
        const rod = new THREE.Mesh(new THREE.CylinderGeometry(barR, barR, legH * 1.02, 8), baseMat());
        rod.position.set(x + dir * 0.045, legH / 2, z);
        rod.rotation.z = -dir * 0.12;
        rod.userData.part = "base";
        g.add(rod);
      });
    });
  } else if (kind === "x-legs-ends") {
    // A crossed X trestle at each short end, rather than the round tables'
    // single X spanning the whole underside.
    const legH = baseTopY;
    const span = topD * 0.8;
    const barT = style.legBarR ?? 0.045;
    [-1, 1].forEach(side => {
      [45, -45].forEach(deg => {
        const slab = new THREE.Mesh(new THREE.BoxGeometry(barT, legH, span), baseMat());
        slab.rotation.y = THREE.MathUtils.degToRad(deg);
        slab.position.set(side * (topW / 2 - 0.12), legH / 2, 0);
        slab.userData.part = "base";
        g.add(slab);
      });
    });
  } else if (kind === "frame-legs-ends") {
    // An open rectangular trestle frame (two posts + a top bar) at each
    // short end — an industrial/architectural alternative to solid slabs.
    const legH = baseTopY;
    const barT = 0.035;
    const span = topD * 0.82;
    [-1, 1].forEach(side => {
      const x = side * (topW / 2 - 0.1);
      [-1, 1].forEach(zDir => {
        const post = new THREE.Mesh(new THREE.BoxGeometry(barT, legH, barT), baseMat());
        post.position.set(x, legH / 2, zDir * span / 2);
        post.userData.part = "base";
        g.add(post);
      });
      const bar = new THREE.Mesh(new THREE.BoxGeometry(barT, barT, span), baseMat());
      bar.position.set(x, legH - barT / 2, 0);
      bar.userData.part = "base";
      g.add(bar);
    });
  }

  return g;
}

/* ── Carpets & rugs (reference sheet #9 — the numbered rug grid) ──
   Every rug reduces to a floor-hugging surface (rectangular, round, oval,
   or an irregular animal-hide silhouette for faux fur/sheepskin) with a
   deterministic per-vertex height "pile" ripple standing in for shag/
   fluffy/high-pile/bouclé/jute/sisal texture — the same displaced-grid
   trick buildCurtainPanel uses for fabric folds, just applied to a
   horizontal surface instead of a vertical one. Patterned rugs (border,
   striped, diamond, chevron, trellis, moroccan, geometric, vintage/
   oriental, modern abstract) get a second thin layer of small flat
   accent shapes sitting just above the pile surface, built from a small
   set of reusable motif generators rather than one bespoke shape per
   variant. Base pile is always tagged "rug"; any accent layer is tagged
   "pattern" — two independently colorable parts regardless of shape. */
function pileNoise(x, z, freq) {
  return (Math.sin(x * freq * 3.1 + 0.4) + Math.cos(z * freq * 2.6 + 1.1) + Math.sin((x + z) * freq * 1.7 + 0.9)) / 3;
}

function buildRugSurface(shape, opts = {}) {
  const {
    w = 1.6, d = 1.0, thickness = 0.02, segs = 22,
    pileAmp = 0, pileFreq = 8, hideLobes = false,
    color = 0xf1ede4, roughness = 0.9,
  } = opts;
  const positions = [];
  const indices = [];
  if (shape === "round" || shape === "oval" || shape === "hide") {
    const ringCount = Math.round(segs * 0.6);
    const radialSegments = segs;
    positions.push(0, thickness + (pileAmp ? pileNoise(0, 0, pileFreq) * pileAmp : 0), 0);
    for (let ri = 1; ri <= ringCount; ri++) {
      const rt = ri / ringCount;
      for (let s = 0; s < radialSegments; s++) {
        const theta = (s / radialSegments) * Math.PI * 2;
        let rad = rt;
        if (shape === "hide") {
          rad *= 1 + 0.1 * Math.cos(theta * 3) + 0.06 * Math.sin(theta * 5 + 0.6) + (hideLobes ? 0.12 * Math.max(0, Math.cos(theta * 4)) : 0);
        }
        const x = Math.cos(theta) * rad, z = Math.sin(theta) * rad;
        const y = thickness + (pileAmp ? pileNoise(x, z, pileFreq) * pileAmp : 0);
        positions.push(x, y, z);
      }
    }
    for (let s = 0; s < radialSegments; s++) {
      const b = 1 + s, c = 1 + ((s + 1) % radialSegments);
      indices.push(0, c, b);
    }
    for (let ri = 1; ri < ringCount; ri++) {
      const base0 = 1 + (ri - 1) * radialSegments;
      const base1 = 1 + ri * radialSegments;
      for (let s = 0; s < radialSegments; s++) {
        const s2 = (s + 1) % radialSegments;
        const a = base0 + s, b = base1 + s, c = base0 + s2, e = base1 + s2;
        indices.push(a, c, b, b, c, e);
      }
    }
    const geo = new THREE.BufferGeometry();
    geo.setAttribute("position", new THREE.Float32BufferAttribute(positions, 3));
    geo.setIndex(indices);
    geo.computeVertexNormals();
    const mesh = new THREE.Mesh(geo, new THREE.MeshStandardMaterial({ color, roughness, side: THREE.DoubleSide }));
    mesh.scale.set(w / 2, 1, d / 2);
    mesh.userData.part = "rug";
    return mesh;
  }
  // Rectangular grid — also used for square, runner, and extra-long-runner (just different w/d).
  const cols = segs, rows = Math.max(6, Math.round(segs * (d / w)));
  const idx = (i, j) => j * (cols + 1) + i;
  for (let j = 0; j <= rows; j++) {
    const vz = (j / rows - 0.5) * d;
    for (let i = 0; i <= cols; i++) {
      const vx = (i / cols - 0.5) * w;
      const y = thickness + (pileAmp ? pileNoise(vx, vz, pileFreq) * pileAmp : 0);
      positions.push(vx, y, vz);
    }
  }
  for (let j = 0; j < rows; j++) {
    for (let i = 0; i < cols; i++) {
      const a = idx(i, j), b = idx(i + 1, j), c = idx(i, j + 1), e = idx(i + 1, j + 1);
      indices.push(a, c, b, b, c, e);
    }
  }
  const geo = new THREE.BufferGeometry();
  geo.setAttribute("position", new THREE.Float32BufferAttribute(positions, 3));
  geo.setIndex(indices);
  geo.computeVertexNormals();
  const mesh = new THREE.Mesh(geo, new THREE.MeshStandardMaterial({ color, roughness, side: THREE.DoubleSide }));
  mesh.userData.part = "rug";
  return mesh;
}

/* ── Rug pattern-accent motif generators ──
   Small flat shapes tagged "pattern", sitting a hair above the pile
   surface. Reused across several catalog variants with different spacing/
   scale rather than one-off per pattern, same reasoning as VASE_STYLES. */
function patMat(color) { return new THREE.MeshStandardMaterial({ color, roughness: 0.85 }); }

function buildBorderFrame(w, d, inset, lineW, color, y) {
  const g = new THREE.Group();
  const iw = w - inset * 2, id = d - inset * 2;
  const mk = (bw, bd, x, z) => {
    const m = new THREE.Mesh(new THREE.BoxGeometry(bw, 0.004, bd), patMat(color));
    m.position.set(x, y, z); m.userData.part = "pattern"; g.add(m);
  };
  mk(iw, lineW, 0, -id / 2); mk(iw, lineW, 0, id / 2);
  mk(lineW, id, -iw / 2, 0); mk(lineW, id, iw / 2, 0);
  return g;
}

function buildStripes(w, d, count, stripeW, color, y) {
  const g = new THREE.Group();
  const spacing = w / (count + 1);
  for (let i = 1; i <= count; i++) {
    const m = new THREE.Mesh(new THREE.BoxGeometry(stripeW, 0.004, d * 0.94), patMat(color));
    m.position.set(-w / 2 + spacing * i, y, 0); m.userData.part = "pattern";
    g.add(m);
  }
  return g;
}

function buildDiamondLattice(w, d, cellSize, lineW, color, y) {
  const g = new THREE.Group();
  const half = cellSize * 0.42;
  const cols = Math.round(w / cellSize), rows = Math.round(d / cellSize);
  for (let i = -cols; i <= cols; i++) {
    for (let j = -rows; j <= rows; j++) {
      const cx = i * cellSize, cz = j * cellSize;
      if (Math.abs(cx) > w / 2 - cellSize * 0.3 || Math.abs(cz) > d / 2 - cellSize * 0.3) continue;
      [{ dx: half / 2, dz: -half / 2, rot: 45 }, { dx: half / 2, dz: half / 2, rot: -45 },
       { dx: -half / 2, dz: half / 2, rot: 45 }, { dx: -half / 2, dz: -half / 2, rot: -45 }].forEach(o => {
        const seg = new THREE.Mesh(new THREE.BoxGeometry(lineW, 0.004, half), patMat(color));
        seg.rotation.y = THREE.MathUtils.degToRad(o.rot);
        seg.position.set(cx + o.dx, y, cz + o.dz);
        seg.userData.part = "pattern";
        g.add(seg);
      });
    }
  }
  return g;
}

function buildChevronPattern(w, d, rowH, lineW, color, y) {
  const g = new THREE.Group();
  const rows = Math.round(d / rowH);
  const zigW = 0.16;
  const legLen = Math.sqrt(zigW * zigW + (rowH * 0.4) ** 2);
  const ang = Math.atan2(zigW, rowH * 0.4);
  for (let r = -rows; r <= rows; r++) {
    const rz = r * rowH;
    if (Math.abs(rz) > d / 2 - rowH * 0.4) continue;
    for (let cx = -w / 2 + zigW; cx < w / 2 - zigW; cx += zigW * 2) {
      const left = new THREE.Mesh(new THREE.BoxGeometry(lineW, 0.004, legLen), patMat(color));
      left.rotation.y = ang; left.position.set(cx, y, rz); left.userData.part = "pattern";
      g.add(left);
      const right = new THREE.Mesh(new THREE.BoxGeometry(lineW, 0.004, legLen), patMat(color));
      right.rotation.y = -ang; right.position.set(cx + zigW, y, rz); right.userData.part = "pattern";
      g.add(right);
    }
  }
  return g;
}

function buildArcBands(w, d, count, color, y, offsetX, offsetZ) {
  const g = new THREE.Group();
  const maxR = Math.min(w, d) * 0.48;
  for (let i = 0; i < count; i++) {
    const r = maxR * (0.28 + 0.72 * i / Math.max(1, count - 1));
    const arc = new THREE.Mesh(new THREE.TorusGeometry(r, 0.006, 6, 28, Math.PI * (0.5 + 0.15 * (i % 2))), patMat(color));
    arc.rotation.x = Math.PI / 2;
    arc.rotation.z = i % 2 === 0 ? 0 : Math.PI * 0.5;
    arc.position.set(offsetX, y, offsetZ);
    arc.userData.part = "pattern";
    g.add(arc);
  }
  return g;
}

function buildMedallionPattern(w, d, color, y, dense) {
  const g = new THREE.Group();
  g.add(buildBorderFrame(w, d, Math.min(w, d) * 0.08, 0.012, color, y));
  if (dense) g.add(buildBorderFrame(w, d, Math.min(w, d) * 0.16, 0.008, color, y));
  const ring1 = new THREE.Mesh(new THREE.RingGeometry(0.09, 0.11, 28), new THREE.MeshStandardMaterial({ color, roughness: 0.85, side: THREE.DoubleSide }));
  ring1.rotation.x = -Math.PI / 2; ring1.position.y = y; ring1.userData.part = "pattern";
  g.add(ring1);
  if (dense) {
    const ring2 = new THREE.Mesh(new THREE.RingGeometry(0.16, 0.175, 28), new THREE.MeshStandardMaterial({ color, roughness: 0.85, side: THREE.DoubleSide }));
    ring2.rotation.x = -Math.PI / 2; ring2.position.y = y; ring2.userData.part = "pattern";
    g.add(ring2);
  }
  [[1, 1], [1, -1], [-1, 1], [-1, -1]].forEach(([sx, sz]) => {
    const corner = new THREE.Mesh(new THREE.RingGeometry(0.06, 0.075, 16, 1, 0, Math.PI / 2), new THREE.MeshStandardMaterial({ color, roughness: 0.85, side: THREE.DoubleSide }));
    corner.rotation.x = -Math.PI / 2;
    corner.rotation.z = sx * sz > 0 ? Math.PI : Math.PI / 2 * (sx > 0 ? -1 : 3);
    corner.position.set(sx * (w / 2 - 0.16), y, sz * (d / 2 - 0.16));
    corner.userData.part = "pattern";
    g.add(corner);
  });
  return g;
}

// Every rug gets its own saturated, clearly-distinct default color — the
// original cream/ivory family read almost identically across all 25 in the
// catalog list, so each one now carries a real hue instead.
const RUG_STYLES = {
  "plain-rectangular": { shape: "rect", w: 1.6, d: 1.0, color: 0xc1666b },
  shaggy:              { shape: "rect", w: 1.6, d: 1.0, pileAmp: 0.02,  pileFreq: 14, color: 0xd4a373, roughness: 0.98 },
  fluffy:               { shape: "rect", w: 1.6, d: 1.0, pileAmp: 0.014, pileFreq: 8,  color: 0xe8b4bc, roughness: 0.95 },
  "low-pile":           { shape: "rect", w: 1.6, d: 1.0, pileAmp: 0.004, pileFreq: 20, color: 0x7d8f69, roughness: 0.85 },
  "high-pile":          { shape: "rect", w: 1.6, d: 1.0, pileAmp: 0.028, pileFreq: 10, color: 0x6b8ba4, roughness: 0.98 },
  round:                { shape: "round", w: 1.6, d: 1.6, pileAmp: 0.005, pileFreq: 12, color: 0xb56576 },
  oval:                 { shape: "oval",  w: 1.7, d: 1.1, pileAmp: 0.005, pileFreq: 12, color: 0x588157 },
  runner:               { shape: "rect", w: 0.85, d: 2.6, pileAmp: 0.005, pileFreq: 14, color: 0xbc6c25 },
  "extra-long-runner":  { shape: "rect", w: 0.8,  d: 3.6, pileAmp: 0.006, pileFreq: 12, color: 0x6d597a },
  square:               { shape: "rect", w: 1.3,  d: 1.3, pileAmp: 0.004, pileFreq: 16, color: 0x457b9d },
  "faux-fur":           { shape: "hide", w: 1.1,  d: 1.6, pileAmp: 0.03,  pileFreq: 22, color: 0xe0a458, roughness: 0.98 },
  sheepskin:            { shape: "hide", w: 0.9,  d: 1.2, pileAmp: 0.024, pileFreq: 18, hideLobes: true, color: 0xc08497, roughness: 0.98 },
  boucle:                { shape: "rect", w: 1.5, d: 1.0, pileAmp: 0.012, pileFreq: 26, color: 0x9c8aa5, roughness: 0.92 },
  "woven-jute-style":   { shape: "rect", w: 1.5, d: 1.0, pileAmp: 0.006, pileFreq: 30, color: 0x9c6b3f, roughness: 0.95 },
  "sisal-style":        { shape: "rect", w: 1.5, d: 1.0, pileAmp: 0.005, pileFreq: 34, color: 0xba9455, roughness: 0.95 },
  "vintage-pattern":    { shape: "rect", w: 1.5, d: 1.0, pileAmp: 0.003, pileFreq: 16, color: 0x8d5b4c, pattern: "medallion", patternColor: 0x6b4238 },
  "oriental-pattern":   { shape: "rect", w: 1.5, d: 1.0, pileAmp: 0.003, pileFreq: 16, color: 0x4a5859, pattern: "medallion-dense", patternColor: 0x33403f },
  "modern-abstract":    { shape: "rect", w: 1.5, d: 1.0, pileAmp: 0.002, pileFreq: 16, color: 0x3d5a80, pattern: "arc-abstract", patternColor: 0x293e58 },
  geometric:             { shape: "rect", w: 1.5, d: 1.0, pileAmp: 0.002, pileFreq: 16, color: 0xee6c4d, pattern: "arc-geometric", patternColor: 0xc94f34 },
  "moroccan-style":     { shape: "rect", w: 1.5, d: 1.0, pileAmp: 0.003, pileFreq: 16, color: 0x7b2d43, pattern: "lattice-moroccan", patternColor: 0x5c1f31 },
  "trellis-pattern":    { shape: "rect", w: 1.5, d: 1.0, pileAmp: 0.003, pileFreq: 16, color: 0x386641, pattern: "lattice-trellis", patternColor: 0x274a2d },
  striped:               { shape: "rect", w: 1.5, d: 1.0, pileAmp: 0.003, pileFreq: 16, color: 0x2a6f77, pattern: "stripe", patternColor: 0xeae2b7 },
  "diamond-pattern":    { shape: "rect", w: 1.5, d: 1.0, pileAmp: 0.003, pileFreq: 16, color: 0x6a4c93, pattern: "lattice-diamond", patternColor: 0x4a3569 },
  chevron:               { shape: "rect", w: 1.5, d: 1.0, pileAmp: 0.002, pileFreq: 16, color: 0x2b9348, pattern: "chevron", patternColor: 0x1f6b34 },
  "border-design":      { shape: "rect", w: 1.5, d: 1.0, pileAmp: 0.002, pileFreq: 16, color: 0x8b2635, pattern: "border", patternColor: 0x641a26 },
};

/* Assembles a full rug — pile surface + optional pattern accent layer —
   from the RUG_STYLES table for a given variant id. */
function buildRug(variant) {
  const style = RUG_STYLES[variant] || RUG_STYLES["plain-rectangular"];
  const g = new THREE.Group();
  const { shape, w, d, pileAmp, pileFreq, hideLobes, color, roughness } = style;
  const surface = buildRugSurface(shape, { w, d, pileAmp, pileFreq, hideLobes, color, roughness: roughness ?? 0.9 });
  g.add(surface);
  if (style.pattern) {
    const y = 0.021;
    const pc = style.patternColor ?? 0xd8cfbb;
    if (style.pattern === "border") g.add(buildBorderFrame(w, d, Math.min(w, d) * 0.1, 0.012, pc, y));
    else if (style.pattern === "stripe") g.add(buildStripes(w, d, 7, 0.03, pc, y));
    else if (style.pattern === "lattice-diamond") g.add(buildDiamondLattice(w, d, 0.28, 0.012, pc, y));
    else if (style.pattern === "lattice-trellis") g.add(buildDiamondLattice(w, d, 0.4, 0.018, pc, y));
    else if (style.pattern === "lattice-moroccan") g.add(buildDiamondLattice(w, d, 0.2, 0.01, pc, y));
    else if (style.pattern === "chevron") g.add(buildChevronPattern(w, d, 0.18, 0.014, pc, y));
    else if (style.pattern === "arc-geometric") g.add(buildArcBands(w, d, 6, pc, y, -w * 0.12, -d * 0.08));
    else if (style.pattern === "arc-abstract") g.add(buildArcBands(w, d, 4, pc, y, w * 0.1, d * 0.05));
    else if (style.pattern === "medallion") g.add(buildMedallionPattern(w, d, pc, y, false));
    else if (style.pattern === "medallion-dense") g.add(buildMedallionPattern(w, d, pc, y, true));
  }
  return g;
}

/* ── Chairs & Sofas (chiavari/cross-back/bentwood/tub chair grid + the
   curved/tufted/sectional sofa grid) ──
   Same family-based approach as vases/rugs above: a handful of shared
   part-builder helpers (legs, channel ribs, tuft buttons) plus one
   dispatcher per broad shape family, driven by a small CHAIR_STYLES/
   SOFA_STYLES params table, rather than 57 fully bespoke one-off meshes.
   Every entry carries its own saturated color (never white/ivory) per the
   catalog-wide visible-color rule, even though both reference sheets were
   shot entirely in white/cream fabric. */
function addLegSet(group, positions, opts = {}) {
  const { legH = 0.42, rTop = 0.02, rBottom = 0.02, color = 0x3d2817, metalness = 0.1, roughness = 0.5, box = false } = opts;
  const mat = new THREE.MeshStandardMaterial({ color, metalness, roughness });
  positions.forEach(([lx, lz]) => {
    const leg = box
      ? new THREE.Mesh(new THREE.BoxGeometry(rTop * 2, legH, rTop * 2), mat)
      : new THREE.Mesh(new THREE.CylinderGeometry(rTop, rBottom, legH, 10), mat);
    leg.position.set(lx, legH / 2, lz);
    leg.userData.part = "body";
    group.add(leg);
  });
}
function addChannelRibs(group, w, h, depth, count, color, centerX, centerY, centerZ) {
  const mat = new THREE.MeshStandardMaterial({ color, roughness: 0.65 });
  const ribW = w / count;
  for (let i = 0; i < count; i++) {
    const rib = new THREE.Mesh(new THREE.BoxGeometry(ribW * 0.82, h, depth), mat);
    rib.position.set(centerX - w / 2 + ribW * (i + 0.5), centerY, centerZ);
    rib.userData.part = "body";
    group.add(rib);
  }
}
function addTuftButtons(group, w, h, cols, rows, color, centerX, centerY, centerZ) {
  const mat = new THREE.MeshStandardMaterial({ color, roughness: 0.5 });
  for (let r = 0; r < rows; r++) {
    for (let c = 0; c < cols; c++) {
      const btn = new THREE.Mesh(new THREE.SphereGeometry(0.014, 6, 6), mat);
      btn.position.set(
        centerX - w / 2 + (w / (cols + 1)) * (c + 1),
        centerY - h / 2 + (h / (rows + 1)) * (r + 1),
        centerZ
      );
      btn.userData.part = "body";
      group.add(btn);
    }
  }
}

function buildChairMesh(style) {
  const g = new THREE.Group();
  const {
    family, color = 0xc9a44c, legColor = 0x3d2817, accent = 0xC9A44C,
    seatR = 0.22, seatW = 0.44, seatD = 0.44, seatH = 0.46, backH = 0.48,
    metalLegs = false, ribs = 5, tuftCols = 3, tuftRows = 3,
  } = style;
  const seatMat = new THREE.MeshStandardMaterial({ color, roughness: 0.65 });
  const legMetalness = metalLegs ? 0.6 : 0.08;
  const legRoughness = metalLegs ? 0.32 : 0.55;

  switch (family) {
    case "chiavari": {
      const seat = new THREE.Mesh(new THREE.CylinderGeometry(seatR, seatR, 0.05, 24), seatMat);
      seat.position.y = seatH; seat.userData.part = "body";
      const frameMat = new THREE.MeshStandardMaterial({ color: accent, metalness: 0.55, roughness: 0.35 });
      const railL = new THREE.Mesh(new THREE.CylinderGeometry(0.016, 0.016, backH, 8), frameMat);
      railL.position.set(-seatR * 0.75, seatH + backH / 2, -seatR * 0.8);
      const railR = railL.clone(); railR.position.x = seatR * 0.75;
      const topBar = new THREE.Mesh(new THREE.BoxGeometry(seatR * 1.6, 0.03, 0.03), frameMat);
      topBar.position.set(0, seatH + backH, -seatR * 0.8);
      const ring = new THREE.Mesh(new THREE.TorusGeometry(seatR * 0.5, 0.013, 8, 20), frameMat);
      ring.position.set(0, seatH + backH * 0.58, -seatR * 0.8);
      [railL, railR, topBar, ring].forEach(m => (m.userData.part = "body"));
      addLegSet(g, [[-seatR * 0.78, -seatR * 0.78], [seatR * 0.78, -seatR * 0.78], [-seatR * 0.78, seatR * 0.78], [seatR * 0.78, seatR * 0.78]], { legH: seatH, rTop: 0.017, rBottom: 0.013, color: accent, metalness: 0.55, roughness: 0.35 });
      g.add(seat, railL, railR, topBar, ring);
      break;
    }
    case "crossback": {
      const seat = new THREE.Mesh(new THREE.BoxGeometry(seatW, 0.05, seatD), seatMat);
      seat.position.y = seatH; seat.userData.part = "body";
      const frameMat = new THREE.MeshStandardMaterial({ color: legColor, roughness: 0.6 });
      const postL = new THREE.Mesh(new THREE.CylinderGeometry(0.02, 0.02, backH, 8), frameMat);
      postL.position.set(-seatW * 0.42, seatH + backH / 2, -seatD * 0.44);
      const postR = postL.clone(); postR.position.x = seatW * 0.42;
      const topRail = new THREE.Mesh(new THREE.BoxGeometry(seatW * 0.9, 0.03, 0.03), frameMat);
      topRail.position.set(0, seatH + backH, -seatD * 0.44);
      const diag = Math.sqrt(Math.pow(seatW * 0.8, 2) + Math.pow(backH * 0.75, 2));
      const ang = Math.atan2(seatW * 0.8, backH * 0.75);
      const xBar1 = new THREE.Mesh(new THREE.BoxGeometry(0.025, diag, 0.025), frameMat);
      xBar1.position.set(0, seatH + backH * 0.5, -seatD * 0.44);
      xBar1.rotation.z = ang;
      const xBar2 = xBar1.clone(); xBar2.rotation.z = -ang;
      [postL, postR, topRail, xBar1, xBar2].forEach(m => (m.userData.part = "body"));
      addLegSet(g, [[-seatW * 0.4, -seatD * 0.4], [seatW * 0.4, -seatD * 0.4], [-seatW * 0.4, seatD * 0.4], [seatW * 0.4, seatD * 0.4]], { legH: seatH, rTop: 0.022, rBottom: 0.017, color: legColor });
      g.add(seat, postL, postR, topRail, xBar1, xBar2);
      break;
    }
    case "bentwood": {
      const seat = new THREE.Mesh(new THREE.CylinderGeometry(seatR, seatR, 0.05, 24), seatMat);
      seat.position.y = seatH; seat.userData.part = "body";
      const frameMat = new THREE.MeshStandardMaterial({ color: legColor, roughness: 0.55 });
      const hoop = new THREE.Mesh(new THREE.TorusGeometry(seatR * 0.72, 0.017, 8, 20, Math.PI), frameMat);
      hoop.rotation.x = Math.PI / 2;
      hoop.position.set(0, seatH + backH * 0.62, -seatR * 0.6);
      const supL = new THREE.Mesh(new THREE.CylinderGeometry(0.014, 0.014, backH, 8), frameMat);
      supL.position.set(-seatR * 0.55, seatH + backH / 2, -seatR * 0.85);
      const supR = supL.clone(); supR.position.x = seatR * 0.55;
      [hoop, supL, supR].forEach(m => (m.userData.part = "body"));
      addLegSet(g, [[-seatR * 0.78, -seatR * 0.78], [seatR * 0.78, -seatR * 0.78], [-seatR * 0.78, seatR * 0.78], [seatR * 0.78, seatR * 0.78]], { legH: seatH, rTop: 0.018, rBottom: 0.014, color: legColor });
      g.add(seat, hoop, supL, supR);
      break;
    }
    case "cane-oval": {
      const seat = new THREE.Mesh(new THREE.CylinderGeometry(seatR, seatR, 0.05, 24), seatMat);
      seat.position.y = seatH; seat.userData.part = "body";
      const frameMat = new THREE.MeshStandardMaterial({ color: legColor, roughness: 0.55 });
      const ringOuter = new THREE.Mesh(new THREE.TorusGeometry(seatR * 0.85, 0.02, 10, 24), frameMat);
      ringOuter.scale.set(1, 1.25, 1);
      ringOuter.position.set(0, seatH + backH * 0.62, -seatR * 0.55);
      const inner = new THREE.Mesh(
        new THREE.CylinderGeometry(seatR * 0.8, seatR * 0.8, 0.015, 24),
        new THREE.MeshStandardMaterial({ color: accent, roughness: 0.85, transparent: true, opacity: 0.9 })
      );
      inner.rotation.x = Math.PI / 2; inner.scale.set(1, 1.25, 1);
      inner.position.set(0, seatH + backH * 0.62, -seatR * 0.55);
      [ringOuter, inner].forEach(m => (m.userData.part = "body"));
      addLegSet(g, [[-seatR * 0.78, -seatR * 0.78], [seatR * 0.78, -seatR * 0.78], [-seatR * 0.78, seatR * 0.78], [seatR * 0.78, seatR * 0.78]], { legH: seatH, rTop: 0.019, rBottom: 0.019, color: legColor });
      g.add(seat, ringOuter, inner);
      break;
    }
    case "shell-channel": {
      const seat = new THREE.Mesh(new THREE.CylinderGeometry(seatR, seatR, 0.06, 24), seatMat);
      seat.position.y = seatH; seat.userData.part = "body";
      for (let i = 0; i < ribs; i++) {
        const t = ribs > 1 ? i / (ribs - 1) - 0.5 : 0;
        const rib = new THREE.Mesh(new THREE.BoxGeometry((seatR * 1.9) / ribs, backH, 0.05), seatMat);
        rib.position.set(t * seatR * 1.7, seatH + backH / 2, -seatR * 0.75 + Math.abs(t) * 0.06);
        rib.rotation.y = -t * 0.5;
        rib.userData.part = "body";
        g.add(rib);
      }
      addLegSet(g, [[-seatR * 0.7, -seatR * 0.7], [seatR * 0.7, -seatR * 0.7], [-seatR * 0.7, seatR * 0.7], [seatR * 0.7, seatR * 0.7]], { legH: seatH, rTop: 0.02, rBottom: 0.014, color: accent, metalness: 0.6, roughness: 0.35 });
      g.add(seat);
      break;
    }
    case "tub-barrel": {
      const seat = new THREE.Mesh(new THREE.CylinderGeometry(seatR, seatR, 0.06, 24), seatMat);
      seat.position.y = seatH; seat.userData.part = "body";
      const shellH = backH * 1.15;
      const shell = new THREE.Mesh(
        new THREE.CylinderGeometry(seatR * 1.05, seatR * 1.05, shellH, 24, 1, true, Math.PI * 0.35, Math.PI * 1.3),
        new THREE.MeshStandardMaterial({ color, roughness: 0.6, side: THREE.DoubleSide })
      );
      shell.position.y = seatH + shellH / 2 - 0.04;
      shell.userData.part = "body";
      addLegSet(g, [[-seatR * 0.62, -seatR * 0.55], [seatR * 0.62, -seatR * 0.55], [-seatR * 0.62, seatR * 0.55], [seatR * 0.62, seatR * 0.55]], { legH: seatH, rTop: 0.02, rBottom: 0.015, color: legColor, metalness: legMetalness, roughness: legRoughness });
      g.add(seat, shell);
      break;
    }
    case "wire-frame": {
      const shellH = backH * 1.3;
      const shell = new THREE.Mesh(
        new THREE.CylinderGeometry(seatR * 1.05, seatR * 1.05, shellH, 10, 1, true, Math.PI * 0.4, Math.PI * 1.2),
        new THREE.MeshStandardMaterial({ color, roughness: 0.4, metalness: 0.3, side: THREE.DoubleSide })
      );
      shell.position.y = seatH * 0.55 + shellH / 2 - 0.05;
      shell.userData.part = "body";
      const legMat = new THREE.MeshStandardMaterial({ color: legColor, metalness: 0.7, roughness: 0.3 });
      [-1, 1].forEach(side => {
        const rod1 = new THREE.Mesh(new THREE.CylinderGeometry(0.012, 0.012, seatH * 1.15, 8), legMat);
        rod1.position.set(side * seatR * 0.55, seatH / 2, -seatR * 0.3);
        rod1.rotation.z = side * 0.35;
        rod1.userData.part = "body";
        const rod2 = rod1.clone();
        rod2.position.z = seatR * 0.5;
        rod2.rotation.z = -side * 0.35;
        rod2.userData.part = "body";
        g.add(rod1, rod2);
      });
      g.add(shell);
      break;
    }
    case "molded-shell": {
      const shellH = backH * 0.95;
      const shell = new THREE.Mesh(
        new THREE.CylinderGeometry(seatR * 1.1, seatR * 1.1, shellH, 20, 1, true, Math.PI * 0.5, Math.PI),
        new THREE.MeshStandardMaterial({ color, roughness: 0.5, side: THREE.DoubleSide })
      );
      shell.position.y = seatH + shellH / 2 - 0.06;
      shell.rotation.x = -0.1;
      shell.userData.part = "body";
      const seatDisc = new THREE.Mesh(new THREE.CylinderGeometry(seatR, seatR, 0.04, 20), seatMat);
      seatDisc.position.y = seatH;
      seatDisc.userData.part = "body";
      const legMat = new THREE.MeshStandardMaterial({ color: legColor, roughness: 0.5 });
      [[-1, -1], [1, -1], [-1, 1], [1, 1]].forEach(([sx, sz]) => {
        const leg = new THREE.Mesh(new THREE.CylinderGeometry(0.014, 0.014, seatH, 8), legMat);
        leg.position.set(sx * seatR * 0.95, seatH / 2, sz * seatR * 0.95);
        leg.rotation.x = sz * 0.15;
        leg.rotation.z = -sx * 0.15;
        leg.userData.part = "body";
        g.add(leg);
      });
      g.add(shell, seatDisc);
      break;
    }
    case "armchair-open": {
      const seat = new THREE.Mesh(new THREE.BoxGeometry(seatW, 0.06, seatD), seatMat);
      seat.position.y = seatH; seat.userData.part = "body";
      const back = new THREE.Mesh(new THREE.BoxGeometry(seatW, backH, 0.06), seatMat);
      back.position.set(0, seatH + backH / 2, -seatD * 0.45);
      back.userData.part = "body";
      const armMat = new THREE.MeshStandardMaterial({ color: accent, roughness: 0.5, metalness: metalLegs ? 0.5 : 0.1 });
      [-1, 1].forEach(side => {
        const arm = new THREE.Mesh(new THREE.TorusGeometry(seatD * 0.28, 0.018, 8, 16, Math.PI), armMat);
        arm.rotation.x = Math.PI / 2; arm.rotation.z = Math.PI / 2;
        arm.position.set(side * seatW * 0.52, seatH + 0.14, 0);
        arm.userData.part = "body";
        g.add(arm);
      });
      addLegSet(g, [[-seatW * 0.4, -seatD * 0.4], [seatW * 0.4, -seatD * 0.4], [-seatW * 0.4, seatD * 0.4], [seatW * 0.4, seatD * 0.4]], { legH: seatH, rTop: 0.02, rBottom: 0.015, color: legColor, metalness: legMetalness, roughness: legRoughness });
      g.add(seat, back);
      break;
    }
    case "diamond-tufted": {
      const seat = new THREE.Mesh(new THREE.BoxGeometry(seatW, 0.08, seatD), seatMat);
      seat.position.y = seatH; seat.userData.part = "body";
      const back = new THREE.Mesh(new THREE.BoxGeometry(seatW, backH, 0.08), seatMat);
      back.position.set(0, seatH + backH / 2, -seatD * 0.45);
      back.userData.part = "body";
      addTuftButtons(g, seatW * 0.85, backH * 0.8, tuftCols, tuftRows, accent, 0, seatH + backH / 2, -seatD * 0.41);
      addLegSet(g, [[-seatW * 0.42, -seatD * 0.42], [seatW * 0.42, -seatD * 0.42], [-seatW * 0.42, seatD * 0.42], [seatW * 0.42, seatD * 0.42]], { legH: seatH, rTop: 0.02, rBottom: 0.016, color: legColor, box: true });
      g.add(seat, back);
      break;
    }
    case "channel-back": {
      const seat = new THREE.Mesh(new THREE.BoxGeometry(seatW, 0.08, seatD), seatMat);
      seat.position.y = seatH; seat.userData.part = "body";
      addChannelRibs(g, seatW * 0.9, backH * 0.94, 0.06, ribs, color, 0, seatH + backH / 2, -seatD * 0.44);
      addLegSet(g, [[-seatW * 0.42, -seatD * 0.42], [seatW * 0.42, -seatD * 0.42], [-seatW * 0.42, seatD * 0.42], [seatW * 0.42, seatD * 0.42]], { legH: seatH, rTop: 0.019, rBottom: 0.014, color: legColor });
      g.add(seat);
      break;
    }
    case "sled-base": {
      const seat = new THREE.Mesh(new THREE.BoxGeometry(seatW, 0.08, seatD), seatMat);
      seat.position.y = seatH; seat.userData.part = "body";
      const back = new THREE.Mesh(new THREE.BoxGeometry(seatW, backH, 0.08), seatMat);
      back.position.set(0, seatH + backH / 2, -seatD * 0.45);
      back.userData.part = "body";
      const sledMat = new THREE.MeshStandardMaterial({ color: legColor, metalness: legMetalness, roughness: legRoughness });
      [-1, 1].forEach(side => {
        const sled = new THREE.Mesh(new THREE.TorusGeometry(seatD * 0.55, 0.018, 8, 16, Math.PI * 0.9), sledMat);
        sled.rotation.y = Math.PI / 2;
        sled.position.set(side * seatW * 0.42, seatH * 0.5, -seatD * 0.05);
        sled.userData.part = "body";
        g.add(sled);
      });
      g.add(seat, back);
      break;
    }
    default: {
      const seat = new THREE.Mesh(new THREE.BoxGeometry(seatW, 0.06, seatD), seatMat);
      seat.position.y = seatH; seat.userData.part = "body";
      const back = new THREE.Mesh(new THREE.BoxGeometry(seatW, backH, 0.06), seatMat);
      back.position.set(0, seatH + backH / 2, -seatD * 0.45); back.userData.part = "body";
      addLegSet(g, [[-seatW * 0.4, -seatD * 0.4], [seatW * 0.4, -seatD * 0.4], [-seatW * 0.4, seatD * 0.4], [seatW * 0.4, seatD * 0.4]], { legH: seatH, rTop: 0.02, rBottom: 0.015, color: legColor });
      g.add(seat, back);
    }
  }
  return g;
}

function buildChairStyle(variant) {
  const style = CHAIR_STYLES[variant] || CHAIR_STYLES["chiavari-rose"];
  return buildChairMesh(style);
}

const CHAIR_STYLES = {
  "chiavari-rose":            { family: "chiavari",      color: 0xc1666b, accent: 0xc7c7c7 },
  "chiavari-navy-gold":       { family: "chiavari",      color: 0x3d5a80, accent: 0xC9A44C },
  "crossback-rustic":         { family: "crossback",     color: 0xb98a6f, legColor: 0x3d2817 },
  "crossback-charcoal":       { family: "crossback",     color: 0x2f4858, legColor: 0x1a1a1a },
  "bentwood-tan":             { family: "bentwood",      color: 0xd4a373, legColor: 0x8a5a44 },
  "bentwood-slate":           { family: "bentwood",      color: 0x5c6e8a, legColor: 0x1a1a1a },
  "cane-oval-natural":        { family: "cane-oval",     color: 0xc9a44c, legColor: 0x8a6a4a, accent: 0xd4a373 },
  "cane-oval-blue":           { family: "cane-oval",     color: 0x457b9d, legColor: 0x3d2817, accent: 0x9c7c33 },
  "cane-oval-green":          { family: "cane-oval",     color: 0x588157, legColor: 0x4a3728, accent: 0x386641 },
  "shell-channel-purple":     { family: "shell-channel", color: 0x6a4c93, accent: 0xC9A44C, ribs: 6 },
  "shell-channel-teal":       { family: "shell-channel", color: 0x2f6f6a, accent: 0x2c2c2c, ribs: 5 },
  "shell-channel-mustard":    { family: "shell-channel", color: 0xbc6c25, accent: 0xC9A44C, ribs: 7 },
  "tub-barrel-tan":           { family: "tub-barrel",    color: 0xc9a98a, legColor: 0x8a6a4a },
  "tub-barrel-rose":          { family: "tub-barrel",    color: 0xb56576, legColor: 0x3d2817 },
  "tub-barrel-navy":          { family: "tub-barrel",    color: 0x3d5a80, legColor: 0x2c2c2c, metalLegs: true },
  "wire-frame-black":         { family: "wire-frame",    color: 0x2c2c2c, legColor: 0x2c2c2c },
  "wire-frame-copper":        { family: "wire-frame",    color: 0xb5651d, legColor: 0x8a4a2a },
  "molded-shell-mustard":     { family: "molded-shell",  color: 0xbc6c25, legColor: 0x8a6a4a },
  "molded-shell-teal":        { family: "molded-shell",  color: 0x2f6f6a, legColor: 0x3d2817 },
  "open-arm-rose-gold":       { family: "armchair-open", color: 0xc1666b, accent: 0xC9A44C, legColor: 0xC9A44C, metalLegs: true },
  "open-arm-forest-black":    { family: "armchair-open", color: 0x386641, accent: 0x2c2c2c, legColor: 0x2c2c2c, metalLegs: true },
  "open-arm-terracotta-gold": { family: "armchair-open", color: 0xb98a6f, accent: 0xC9A44C, legColor: 0xC9A44C, metalLegs: true },
  "diamond-tufted-burgundy":  { family: "diamond-tufted",color: 0x8b2635, accent: 0xC9A44C, legColor: 0x1a1a1a },
  "diamond-tufted-navy":      { family: "diamond-tufted",color: 0x3d5a80, accent: 0xc7c7c7, legColor: 0x2c2c2c },
  "channel-back-sage":        { family: "channel-back",  color: 0x6f9b7a, legColor: 0x8a6a4a, ribs: 5 },
  "channel-back-plum":        { family: "channel-back",  color: 0x7c4a6b, legColor: 0x3d2817, ribs: 6 },
  "sled-base-charcoal":       { family: "sled-base",     color: 0x2f4858, legColor: 0x2c2c2c, metalLegs: true },
  "sled-base-rust":           { family: "sled-base",     color: 0xc97b5f, legColor: 0x8a6a4a },
};

function buildSofaMesh(style) {
  const g = new THREE.Group();
  const {
    family, color = 0x7c3aed, legColor = 0x3d2817, accent = 0xC9A44C,
    width = 1.6, depth = 0.75, seatH = 0.42, backH = 0.5, armW = 0.16,
    metalLegs = false, ribs = 6, tuftCols = 4, tuftRows = 2, cushions = 2,
    chaiseSide = 1, legH: legHIn,
  } = style;
  const legH = legHIn ?? 0.1;
  const baseH = Math.max(seatH - legH, 0.08);
  const bodyMat = new THREE.MeshStandardMaterial({ color, roughness: 0.68 });
  const legMetalness = metalLegs ? 0.6 : 0.08;
  const legRoughness = metalLegs ? 0.32 : 0.55;

  switch (family) {
    case "track-arm-boxy": {
      const base = new THREE.Mesh(new THREE.BoxGeometry(width, baseH, depth), bodyMat);
      base.position.y = legH + baseH / 2; base.userData.part = "body";
      const back = new THREE.Mesh(new THREE.BoxGeometry(width, backH, 0.16), bodyMat);
      back.position.set(0, seatH + backH / 2 - 0.04, -depth / 2 + 0.08); back.userData.part = "body";
      const armL = new THREE.Mesh(new THREE.BoxGeometry(armW, backH * 0.85, depth), bodyMat);
      armL.position.set(-width / 2 + armW / 2, legH + (backH * 0.85) / 2, 0); armL.userData.part = "body";
      const armR = armL.clone(); armR.position.x = width / 2 - armW / 2; armR.userData.part = "body";
      const innerW = width - armW * 2 - 0.06;
      const cushW = innerW / cushions;
      for (let i = 0; i < cushions; i++) {
        const c = new THREE.Mesh(new THREE.BoxGeometry(cushW * 0.92, 0.16, depth * 0.78), new THREE.MeshStandardMaterial({ color, roughness: 0.72 }));
        c.position.set(-innerW / 2 + cushW * (i + 0.5), seatH + 0.08, 0.02);
        c.userData.part = "body";
        g.add(c);
      }
      addLegSet(g, [[-width * 0.44, -depth * 0.42], [width * 0.44, -depth * 0.42], [-width * 0.44, depth * 0.42], [width * 0.44, depth * 0.42]], { legH, rTop: 0.028, rBottom: 0.022, color: legColor, box: true, metalness: legMetalness, roughness: legRoughness });
      g.add(base, back, armL, armR);
      break;
    }
    case "rolled-bolster-arm": {
      const base = new THREE.Mesh(new THREE.BoxGeometry(width, baseH, depth), bodyMat);
      base.position.y = legH + baseH / 2; base.userData.part = "body";
      const back = new THREE.Mesh(new THREE.BoxGeometry(width, backH * 0.7, 0.16), bodyMat);
      back.position.set(0, seatH + backH * 0.35, -depth / 2 + 0.08); back.userData.part = "body";
      const armL = new THREE.Mesh(new THREE.CylinderGeometry(depth * 0.24, depth * 0.24, depth, 16), bodyMat);
      armL.rotation.z = Math.PI / 2; armL.position.set(-width / 2 + depth * 0.24, legH + baseH * 0.85, 0);
      armL.userData.part = "body";
      const armR = armL.clone(); armR.position.x = width / 2 - depth * 0.24; armR.userData.part = "body";
      if (tuftCols > 0) addTuftButtons(g, width * 0.7, backH * 0.5, tuftCols, 1, accent, 0, seatH + backH * 0.35, -depth / 2 + 0.16);
      addLegSet(g, [[-width * 0.4, -depth * 0.35], [width * 0.4, -depth * 0.35], [-width * 0.4, depth * 0.35], [width * 0.4, depth * 0.35]], { legH, rTop: 0.018, rBottom: 0.026, color: legColor });
      g.add(base, back, armL, armR);
      break;
    }
    case "channel-tufted-curved": {
      const arc = Math.PI * 0.55, curveSegs = 20;
      const shellH = backH;
      const shell = new THREE.Mesh(
        new THREE.CylinderGeometry(width * 0.55, width * 0.55, shellH, curveSegs, 1, true, Math.PI / 2 - arc / 2, arc),
        new THREE.MeshStandardMaterial({ color, roughness: 0.55, side: THREE.DoubleSide })
      );
      shell.position.y = legH + shellH / 2;
      shell.userData.part = "body";
      const seatPad = new THREE.Mesh(new THREE.CylinderGeometry(width * 0.5, width * 0.5, 0.1, curveSegs, 1, true, Math.PI / 2 - arc / 2, arc), new THREE.MeshStandardMaterial({ color, roughness: 0.7, side: THREE.DoubleSide }));
      seatPad.position.y = seatH;
      seatPad.userData.part = "body";
      addLegSet(g, [[-width * 0.35, -depth * 0.3], [width * 0.35, -depth * 0.3], [-width * 0.35, depth * 0.3], [width * 0.35, depth * 0.3]], { legH, rTop: 0.02, rBottom: 0.016, color: accent, metalness: 0.6, roughness: 0.35 });
      g.add(shell, seatPad);
      break;
    }
    case "chesterfield-tufted": {
      const base = new THREE.Mesh(new THREE.BoxGeometry(width, baseH, depth), bodyMat);
      base.position.y = legH + baseH / 2; base.userData.part = "body";
      const back = new THREE.Mesh(new THREE.BoxGeometry(width, backH, 0.16), bodyMat);
      back.position.set(0, seatH + backH / 2 - 0.02, -depth / 2 + 0.08); back.userData.part = "body";
      const armL = new THREE.Mesh(new THREE.BoxGeometry(armW * 1.4, backH * 0.7, depth), bodyMat);
      armL.position.set(-width / 2 + armW * 0.7, legH + (backH * 0.7) / 2, 0); armL.userData.part = "body";
      const armR = armL.clone(); armR.position.x = width / 2 - armW * 0.7; armR.userData.part = "body";
      addTuftButtons(g, width * 0.8, backH * 0.7, tuftCols, tuftRows, accent, 0, seatH + backH / 2 - 0.02, -depth / 2 + 0.17);
      addLegSet(g, [[-width * 0.42, -depth * 0.4], [width * 0.42, -depth * 0.4], [-width * 0.42, depth * 0.4], [width * 0.42, depth * 0.4]], { legH, rTop: 0.02, rBottom: 0.024, color: accent, metalness: 0.6, roughness: 0.3 });
      g.add(base, back, armL, armR);
      break;
    }
    case "sectional-chaise": {
      const base = new THREE.Mesh(new THREE.BoxGeometry(width, baseH, depth), bodyMat);
      base.position.y = legH + baseH / 2; base.userData.part = "body";
      const back = new THREE.Mesh(new THREE.BoxGeometry(width, backH, 0.16), bodyMat);
      back.position.set(0, seatH + backH / 2 - 0.04, -depth / 2 + 0.08); back.userData.part = "body";
      const armL = new THREE.Mesh(new THREE.BoxGeometry(armW, backH * 0.85, depth), bodyMat);
      armL.position.set(-width / 2 + armW / 2, legH + (backH * 0.85) / 2, 0); armL.userData.part = "body";
      const chaiseDepth = depth * 1.7;
      const chaise = new THREE.Mesh(new THREE.BoxGeometry(depth * 1.05, baseH, chaiseDepth), bodyMat);
      chaise.position.set(chaiseSide * (width / 2 + depth * 0.45), legH + baseH / 2, depth * 0.1);
      chaise.userData.part = "body";
      const chaiseCush = new THREE.Mesh(new THREE.BoxGeometry(depth * 0.95, 0.14, chaiseDepth * 0.9), new THREE.MeshStandardMaterial({ color, roughness: 0.72 }));
      chaiseCush.position.set(chaiseSide * (width / 2 + depth * 0.45), seatH + 0.07, depth * 0.1);
      chaiseCush.userData.part = "body";
      addLegSet(g, [[-width * 0.42, -depth * 0.4], [width * 0.42 - 0.02, -depth * 0.4], [-width * 0.42, depth * 0.4]], { legH, rTop: 0.026, rBottom: 0.02, color: legColor, box: true });
      addLegSet(g, [[chaiseSide * (width / 2 + depth * 0.75), -chaiseDepth * 0.35], [chaiseSide * (width / 2 + depth * 0.75), chaiseDepth * 0.35]], { legH, rTop: 0.026, rBottom: 0.02, color: legColor, box: true });
      g.add(base, back, armL, chaise, chaiseCush);
      break;
    }
    case "scroll-arm-sleigh": {
      const base = new THREE.Mesh(new THREE.BoxGeometry(width, baseH, depth), bodyMat);
      base.position.y = legH + baseH / 2; base.userData.part = "body";
      const back = new THREE.Mesh(new THREE.BoxGeometry(width * 0.92, backH * 0.75, 0.14), bodyMat);
      back.position.set(0, seatH + backH * 0.375 - 0.02, -depth / 2 + 0.1); back.userData.part = "body";
      [-1, 1].forEach(side => {
        const scroll = new THREE.Mesh(new THREE.TorusGeometry(depth * 0.32, 0.06, 10, 20, Math.PI * 1.1), bodyMat);
        scroll.rotation.y = Math.PI / 2;
        scroll.rotation.z = side > 0 ? 0.3 : Math.PI - 0.3;
        scroll.position.set(side * (width / 2 - depth * 0.3), legH + backH * 0.55, -depth * 0.05);
        scroll.userData.part = "body";
        g.add(scroll);
      });
      addLegSet(g, [[-width * 0.4, -depth * 0.4], [width * 0.4, -depth * 0.4], [-width * 0.4, depth * 0.4], [width * 0.4, depth * 0.4]], { legH, rTop: 0.02, rBottom: 0.026, color: legColor, metalness: legMetalness, roughness: legRoughness });
      g.add(base, back);
      break;
    }
    case "pillow-back-loose": {
      const base = new THREE.Mesh(new THREE.BoxGeometry(width, baseH, depth), bodyMat);
      base.position.y = legH + baseH / 2; base.userData.part = "body";
      const armL = new THREE.Mesh(new THREE.BoxGeometry(armW, backH * 0.75, depth), bodyMat);
      armL.position.set(-width / 2 + armW / 2, legH + (backH * 0.75) / 2, 0); armL.userData.part = "body";
      const armR = armL.clone(); armR.position.x = width / 2 - armW / 2; armR.userData.part = "body";
      const innerW = width - armW * 2 - 0.08;
      const pillowW = innerW / cushions;
      for (let i = 0; i < cushions; i++) {
        const p = new THREE.Mesh(new THREE.BoxGeometry(pillowW * 0.9, backH * 0.62, 0.18), new THREE.MeshStandardMaterial({ color, roughness: 0.75 }));
        p.position.set(-innerW / 2 + pillowW * (i + 0.5), seatH + backH * 0.31, -depth / 2 + 0.14);
        p.userData.part = "body";
        g.add(p);
        const c = new THREE.Mesh(new THREE.BoxGeometry(pillowW * 0.92, 0.15, depth * 0.75), new THREE.MeshStandardMaterial({ color, roughness: 0.72 }));
        c.position.set(-innerW / 2 + pillowW * (i + 0.5), seatH + 0.08, 0.02);
        c.userData.part = "body";
        g.add(c);
      }
      addLegSet(g, [[-width * 0.42, -depth * 0.4], [width * 0.42, -depth * 0.4], [-width * 0.42, depth * 0.4], [width * 0.42, depth * 0.4]], { legH, rTop: 0.02, rBottom: 0.015, color: legColor });
      g.add(base, armL, armR);
      break;
    }
    case "curved-cocoon": {
      const arc = Math.PI * 1.5;
      const shellH = seatH + backH * 0.9;
      const shell = new THREE.Mesh(
        new THREE.CylinderGeometry(width * 0.42, width * 0.42, shellH, 24, 1, true, Math.PI / 2 - arc / 2, arc),
        new THREE.MeshStandardMaterial({ color, roughness: 0.55, side: THREE.DoubleSide })
      );
      shell.rotation.x = 0.06;
      shell.position.y = shellH / 2;
      shell.userData.part = "body";
      const seatPad = new THREE.Mesh(new THREE.CylinderGeometry(width * 0.4, width * 0.4, 0.1, 24), new THREE.MeshStandardMaterial({ color, roughness: 0.7 }));
      seatPad.position.y = seatH;
      seatPad.userData.part = "body";
      if (legH > 0.02) {
        addLegSet(g, [[-width * 0.25, -depth * 0.2], [width * 0.25, -depth * 0.2], [-width * 0.25, depth * 0.2], [width * 0.25, depth * 0.2]], { legH, rTop: 0.02, rBottom: 0.02, color: legColor, metalness: legMetalness, roughness: legRoughness });
      } else {
        const plinth = new THREE.Mesh(new THREE.CylinderGeometry(width * 0.3, width * 0.34, 0.06, 24), new THREE.MeshStandardMaterial({ color: legColor, roughness: 0.6 }));
        plinth.position.y = 0.03; plinth.userData.part = "body";
        g.add(plinth);
      }
      g.add(shell, seatPad);
      break;
    }
    case "tuxedo-track": {
      const base = new THREE.Mesh(new THREE.BoxGeometry(width, baseH, depth), bodyMat);
      base.position.y = legH + baseH / 2; base.userData.part = "body";
      const back = new THREE.Mesh(new THREE.BoxGeometry(width, backH, 0.14), bodyMat);
      back.position.set(0, seatH + backH / 2 - 0.03, -depth / 2 + 0.07); back.userData.part = "body";
      const armL = new THREE.Mesh(new THREE.BoxGeometry(armW, backH, depth), bodyMat);
      armL.position.set(-width / 2 + armW / 2, seatH + backH / 2 - 0.03, 0); armL.userData.part = "body";
      const armR = armL.clone(); armR.position.x = width / 2 - armW / 2; armR.userData.part = "body";
      const trim = new THREE.Mesh(new THREE.BoxGeometry(width, 0.02, 0.02), new THREE.MeshStandardMaterial({ color: accent, roughness: 0.4 }));
      trim.position.set(0, seatH + 0.01, depth / 2 - 0.02); trim.userData.part = "body";
      addLegSet(g, [[-width * 0.44, -depth * 0.42], [width * 0.44, -depth * 0.42], [-width * 0.44, depth * 0.42], [width * 0.44, depth * 0.42]], { legH, rTop: 0.024, rBottom: 0.024, color: legColor, box: true });
      g.add(base, back, armL, armR, trim);
      break;
    }
    case "shell-scallop-back": {
      const base = new THREE.Mesh(new THREE.BoxGeometry(width, baseH, depth), bodyMat);
      base.position.y = legH + baseH / 2; base.userData.part = "body";
      const arc = Math.PI * 0.85;
      const shell = new THREE.Mesh(
        new THREE.CylinderGeometry(width * 0.52, width * 0.52, backH, 24, 1, true, Math.PI / 2 - arc / 2, arc),
        new THREE.MeshStandardMaterial({ color, roughness: 0.55, side: THREE.DoubleSide })
      );
      shell.position.y = seatH + backH / 2 - 0.05;
      shell.userData.part = "body";
      for (let i = 0; i < ribs; i++) {
        const t = ribs > 1 ? i / (ribs - 1) : 0;
        const ang = (Math.PI / 2 - arc / 2) + t * arc;
        const rib = new THREE.Mesh(new THREE.BoxGeometry(0.035, backH * 0.9, 0.02), bodyMat);
        rib.position.set(Math.cos(ang) * width * 0.54, seatH + backH / 2 - 0.05, Math.sin(ang) * width * 0.54);
        rib.rotation.y = -ang;
        rib.userData.part = "body";
        g.add(rib);
      }
      addLegSet(g, [[-width * 0.4, -depth * 0.38], [width * 0.4, -depth * 0.38], [-width * 0.4, depth * 0.38], [width * 0.4, depth * 0.38]], { legH, rTop: 0.02, rBottom: 0.015, color: legColor });
      g.add(base, shell);
      break;
    }
    default: {
      const base = new THREE.Mesh(new THREE.BoxGeometry(width, baseH, depth), bodyMat);
      base.position.y = legH + baseH / 2; base.userData.part = "body";
      const back = new THREE.Mesh(new THREE.BoxGeometry(width, backH, 0.15), bodyMat);
      back.position.set(0, seatH + backH / 2, -depth / 2 + 0.08); back.userData.part = "body";
      addLegSet(g, [[-width * 0.4, -depth * 0.4], [width * 0.4, -depth * 0.4], [-width * 0.4, depth * 0.4], [width * 0.4, depth * 0.4]], { legH, rTop: 0.02, rBottom: 0.02, color: legColor });
      g.add(base, back);
    }
  }
  return g;
}

function buildSofaStyle(variant) {
  const style = SOFA_STYLES[variant] || SOFA_STYLES["track-arm-navy"];
  return buildSofaMesh(style);
}

const SOFA_STYLES = {
  "track-arm-navy":            { family: "track-arm-boxy",       color: 0x3d5a80, legColor: 0x2c2c2c, cushions: 3, width: 2.0 },
  "track-arm-olive":           { family: "track-arm-boxy",       color: 0x588157, legColor: 0x8a6a4a, cushions: 2, width: 1.4 },
  "track-arm-rust":            { family: "track-arm-boxy",       color: 0xc97b5f, legColor: 0x3d2817, cushions: 3, width: 1.9 },
  "rolled-arm-burgundy":       { family: "rolled-bolster-arm",    color: 0x8b2635, legColor: 0x3d2817, tuftCols: 3, width: 1.8 },
  "rolled-arm-teal":           { family: "rolled-bolster-arm",    color: 0x2f6f6a, legColor: 0x8a6a4a, tuftCols: 4, width: 2.0 },
  "rolled-arm-mustard":        { family: "rolled-bolster-arm",    color: 0xbc6c25, legColor: 0x3d2817, tuftCols: 2, width: 1.3 },
  "channel-curved-terracotta": { family: "channel-tufted-curved", color: 0xb98a6f, accent: 0xC9A44C, width: 1.8 },
  "channel-curved-forest":     { family: "channel-tufted-curved", color: 0x386641, accent: 0x2c2c2c, width: 2.0 },
  "channel-curved-plum":       { family: "channel-tufted-curved", color: 0x7c4a6b, accent: 0xC9A44C, width: 1.6 },
  "chesterfield-cognac":       { family: "chesterfield-tufted",   color: 0x9c6b3f, accent: 0xC9A44C, tuftCols: 5, tuftRows: 2, width: 2.0 },
  "chesterfield-emerald":      { family: "chesterfield-tufted",   color: 0x2f6f4a, accent: 0xC9A44C, tuftCols: 4, tuftRows: 2, width: 1.8 },
  "chesterfield-charcoal":     { family: "chesterfield-tufted",   color: 0x33383d, accent: 0xc7c7c7, legColor: 0x1a1a1a, tuftCols: 4, tuftRows: 2, width: 1.7 },
  "sectional-navy":            { family: "sectional-chaise",      color: 0x3d5a80, legColor: 0x2c2c2c, chaiseSide: 1, width: 1.8, depth: 0.8 },
  "sectional-sage":            { family: "sectional-chaise",      color: 0x6f9b7a, legColor: 0x8a6a4a, chaiseSide: -1, width: 1.8, depth: 0.8 },
  "sectional-charcoal":        { family: "sectional-chaise",      color: 0x2f4858, legColor: 0x1a1a1a, chaiseSide: 1, width: 2.0, depth: 0.8 },
  "scroll-arm-burgundy":       { family: "scroll-arm-sleigh",     color: 0x8b2635, legColor: 0xC9A44C, metalLegs: true, width: 1.9 },
  "scroll-arm-navy":           { family: "scroll-arm-sleigh",     color: 0x3d5a80, legColor: 0x8a6a4a, width: 1.8 },
  "scroll-arm-forest":         { family: "scroll-arm-sleigh",     color: 0x386641, legColor: 0x3d2817, width: 2.0 },
  "pillow-back-rust":          { family: "pillow-back-loose",     color: 0xc97b5f, legColor: 0x8a6a4a, cushions: 3, width: 2.0 },
  "pillow-back-plum":          { family: "pillow-back-loose",     color: 0x7c4a6b, legColor: 0x3d2817, cushions: 2, width: 1.5 },
  "pillow-back-teal":          { family: "pillow-back-loose",     color: 0x2f6f6a, legColor: 0x8a6a4a, cushions: 3, width: 1.9 },
  "cocoon-blush":              { family: "curved-cocoon",         color: 0xb56576, legColor: 0x3d2817, legH: 0, width: 1.6 },
  "cocoon-mustard":            { family: "curved-cocoon",         color: 0xbc6c25, legColor: 0xC9A44C, metalLegs: true, legH: 0.1, width: 1.7 },
  "cocoon-charcoal":           { family: "curved-cocoon",         color: 0x2f4858, legColor: 0x1a1a1a, legH: 0, width: 1.8 },
  "tuxedo-navy":               { family: "tuxedo-track",          color: 0x3d5a80, accent: 0xC9A44C, legColor: 0x1a1a1a, width: 1.9 },
  "tuxedo-olive":               { family: "tuxedo-track",          color: 0x588157, accent: 0xC9A44C, legColor: 0x3d2817, width: 1.7 },
  "shell-scallop-purple":      { family: "shell-scallop-back",    color: 0x6a4c93, legColor: 0xC9A44C, metalLegs: true, ribs: 7, width: 1.9 },
  "shell-scallop-teal":        { family: "shell-scallop-back",    color: 0x2f6f6a, legColor: 0x8a6a4a, ribs: 6, width: 1.8 },
  "shell-scallop-rose":        { family: "shell-scallop-back",    color: 0xc1666b, legColor: 0x3d2817, ribs: 8, width: 2.0 },
};

/* ── Backdrop panels, welcome signs & wall art (reference sheet #10) ──
   Panels/signs reuse the arch/fluted-panel builders already defined above
   for the coffee-corner backdrops. The handful of silhouettes those don't
   cover (a corner-rounded or diagonally-cut panel, a wavy top edge) go
   through buildFlatPolygonPanel: an explicit list of {x,y} outline points
   I placed by hand and extrude front/back/sides myself, rather than
   guessing a THREE.Shape arc's sweep direction — same reasoning as the
   verified winding used for the rug/table grids above, with DoubleSide
   left on as a safety net either way. Every panel/sign/art piece stands
   with its base at y=0, matching every other floor-placed catalog item.
   Welcome signs (and panels) additionally hook into the existing
   BRANDABLE_TYPES/BRANDING_PANEL_POS text system — "written on" is the
   same vinyl-lettering-texture mechanism the coffee booth's signage
   already uses, just keyed per "type:variant" here since panel heights
   vary so much across the family (see buildBrandingPanel above). */
function buildFlatPolygonPanel(points, depth, color, part) {
  const n = points.length;
  const positions = [];
  const indices = [];
  const hz = depth / 2;
  points.forEach(p => positions.push(p.x, p.y, hz));
  points.forEach(p => positions.push(p.x, p.y, -hz));
  for (let i = 1; i < n - 1; i++) {
    indices.push(0, i, i + 1);
    indices.push(n, n + i + 1, n + i);
  }
  for (let i = 0; i < n; i++) {
    const j = (i + 1) % n;
    const a = i, b = j, c = n + i, e = n + j;
    indices.push(a, c, b, b, c, e);
  }
  const geo = new THREE.BufferGeometry();
  geo.setAttribute("position", new THREE.Float32BufferAttribute(positions, 3));
  geo.setIndex(indices);
  geo.computeVertexNormals();
  const mesh = new THREE.Mesh(geo, new THREE.MeshStandardMaterial({ color, side: THREE.DoubleSide }));
  mesh.userData.part = part;
  return mesh;
}

function outlineAngled(w, h, cut) {
  const hw = w / 2;
  return [{ x: -hw, y: 0 }, { x: hw, y: 0 }, { x: hw, y: h - cut }, { x: hw - cut, y: h }, { x: -hw, y: h }];
}

// A quarter-circle-rounded corner (top-right) — a small r reads as a
// gently curved corner, an r close to min(w,h) reads as a full "half
// arch" rainbow silhouette, so this one generator covers both variants.
function outlineCurvedCorner(w, h, r, segs = 10) {
  const hw = w / 2;
  const rc = Math.min(r, h, w);
  const pts = [{ x: -hw, y: 0 }, { x: hw, y: 0 }, { x: hw, y: h - rc }];
  for (let i = 0; i <= segs; i++) {
    const t = (i / segs) * (Math.PI / 2);
    pts.push({ x: hw - rc + Math.cos(t) * rc, y: (h - rc) + Math.sin(t) * rc });
  }
  pts.push({ x: -hw, y: h });
  return pts;
}

function outlineWavyTop(w, h, amp, waves, segs = 16) {
  const hw = w / 2;
  const pts = [{ x: -hw, y: 0 }, { x: hw, y: 0 }];
  for (let i = segs; i >= 0; i--) {
    const t = i / segs;
    pts.push({ x: -hw + t * w, y: h + Math.sin(t * Math.PI * waves) * amp });
  }
  return pts;
}

// N thin blades all pivoting from a shared bottom-center hinge, fanned out
// across `spreadDeg` — the standard "spread around a shared axis" rotation
// technique (wheel spokes, hand fans), not a custom shape, so no winding
// risk at all.
function buildFanPanel(bladeW, bladeH, thickness, count, spreadDeg, offset, color, part) {
  const g = new THREE.Group();
  const startAngle = -THREE.MathUtils.degToRad(spreadDeg) / 2;
  const step = count > 1 ? THREE.MathUtils.degToRad(spreadDeg) / (count - 1) : 0;
  for (let i = 0; i < count; i++) {
    const pivot = new THREE.Group();
    pivot.rotation.y = startAngle + step * i;
    const blade = new THREE.Mesh(new THREE.BoxGeometry(bladeW, bladeH, thickness), new THREE.MeshStandardMaterial({ color }));
    blade.position.set(0, bladeH / 2, offset);
    blade.userData.part = part;
    pivot.add(blade);
    g.add(pivot);
  }
  return g;
}

// Each panel/backdrop shape gets its own visible default hue instead of
// the shared cream family, same rationale as the rug and stage tables above.
const PANEL_STYLES = {
  arch:            { kind: "arch", w: 0.9, h: 1.85, d: 0.09, color: 0xb5654f },
  "double-arch":   { kind: "double-arch", w: 1.3, h: 1.75, d: 0.09, color: 0x4f7c8c, footW: 1.3 },
  wave:            { kind: "wave", w: 1.0, h: 1.9, d: 0.09, ribs: 16, color: 0x6b4e71 },
  circle:          { kind: "circle", r: 0.55, d: 0.08, color: 0x4a7c59, footW: 1.15 },
  "tall-rounded":  { kind: "tall-rounded", w: 0.85, h: 2.3, d: 0.09, color: 0xa15c3e, footW: 1.0 },
  layered:         { kind: "layered", w: 1.1, h: 1.6, d: 0.09, color: 0x3d6b8a },
  fan:             { kind: "fan", bladeW: 0.16, h: 1.7, bladeD: 0.03, count: 9, color: 0x8c5a8e, footW: 1.3 },
  scallop:         { kind: "scallop", w: 1.2, h: 1.5, d: 0.08, color: 0xc2703f },
  square:          { kind: "flat", w: 1.0, h: 1.3, d: 0.08, color: 0x567a4e },
  "classic-wall":  { kind: "classic-wall", w: 1.0, h: 1.6, d: 0.06, color: 0x7a4f3d },
  slatted:         { kind: "slatted", w: 1.0, h: 1.7, d: 0.1, ribs: 14, color: 0x4e6b5e },
  grid:            { kind: "grid", w: 1.0, h: 1.6, d: 0.03, cols: 5, rows: 6, color: 0x6e4a5c },
  acrylic:         { kind: "acrylic", w: 0.9, h: 1.5, d: 0.04, color: 0x7fb3bd },
  "half-arch":     { kind: "curved-corner", w: 1.0, h: 1.8, d: 0.09, r: 1.7, color: 0xa3773f },
  "curved-corner": { kind: "curved-corner", w: 1.0, h: 1.5, d: 0.08, r: 0.22, color: 0x5c6e8a },
  angled:          { kind: "angled", w: 1.0, h: 1.6, d: 0.08, cut: 0.4, color: 0x8a4e4e },
};

function buildBackdropPanel(variant) {
  const style = PANEL_STYLES[variant] || PANEL_STYLES.arch;
  const g = new THREE.Group();
  const color = style.color ?? 0xf1ede4;
  const footW = style.footW ?? style.w ?? (style.r ? style.r * 2 : 1.0);
  const base = new THREE.Mesh(new THREE.BoxGeometry(Math.max(0.3, footW * 0.55), 0.04, (style.d || 0.08) * 3), new THREE.MeshStandardMaterial({ color: 0x4a4a4a }));
  base.position.y = 0.02; base.userData.part = "panel";
  g.add(base);
  const wrap = new THREE.Group(); wrap.position.y = 0.04; g.add(wrap);

  if (style.kind === "arch") {
    wrap.add(buildArchPanel(style.w, style.h, style.d, color, "panel"));
  } else if (style.kind === "double-arch") {
    const widths = [style.w * 0.34, style.w * 0.34, style.w * 0.34];
    const heights = [style.h * 0.82, style.h, style.h * 0.82];
    const xs = [-style.w * 0.34, 0, style.w * 0.34];
    widths.forEach((ww, i) => {
      const arch = buildArchPanel(ww, heights[i], style.d, color, "panel");
      arch.position.set(xs[i], 0, i % 2 === 0 ? -0.01 : 0.01);
      wrap.add(arch);
    });
  } else if (style.kind === "wave") {
    const ribCount = style.ribs || 16;
    const ribR = (style.w / ribCount) / 2;
    for (let i = 0; i < ribCount; i++) {
      const t = i / (ribCount - 1);
      const ribH = style.h * (0.75 + 0.25 * Math.sin(t * Math.PI));
      const rib = new THREE.Mesh(new THREE.CylinderGeometry(ribR, ribR, ribH, 8), new THREE.MeshStandardMaterial({ color }));
      rib.position.set(-style.w / 2 + ribR + i * ribR * 2, ribH / 2, Math.sin(t * Math.PI * 1.4) * style.d * 1.8);
      rib.userData.part = "panel";
      wrap.add(rib);
    }
  } else if (style.kind === "circle") {
    const disc = new THREE.Mesh(new THREE.CylinderGeometry(style.r, style.r, style.d, 40), new THREE.MeshStandardMaterial({ color }));
    disc.rotation.x = Math.PI / 2; disc.position.y = style.r; disc.userData.part = "panel";
    wrap.add(disc);
  } else if (style.kind === "tall-rounded") {
    const back = buildArchPanel(style.w * 0.9, style.h * 0.88, style.d, color, "panel");
    back.position.set(-0.18, 0, -0.03);
    wrap.add(back);
    const front = buildArchPanel(style.w, style.h, style.d, color, "panel");
    front.position.set(0.1, 0, 0.02);
    wrap.add(front);
  } else if (style.kind === "layered") {
    for (let i = 0; i < 3; i++) {
      const ww = style.w * (0.4 - i * 0.02);
      const hh = style.h * (0.6 + i * 0.2);
      const panel = new THREE.Mesh(new THREE.BoxGeometry(ww, hh, style.d), new THREE.MeshStandardMaterial({ color }));
      panel.position.set(-style.w * 0.32 + i * style.w * 0.32, hh / 2, -i * 0.025);
      panel.userData.part = "panel";
      wrap.add(panel);
    }
  } else if (style.kind === "fan") {
    wrap.add(buildFanPanel(style.bladeW, style.h, style.bladeD, style.count, 110, style.h * 0.4, color, "panel"));
  } else if (style.kind === "scallop") {
    const n = 5;
    for (let i = 0; i < n; i++) {
      const t = i / (n - 1);
      const ww = style.w / n * 0.92;
      const hh = style.h * (0.72 + 0.28 * Math.sin(t * Math.PI));
      const arch = buildArchPanel(ww, hh, style.d, color, "panel");
      arch.position.x = -style.w / 2 + ww / 2 + i * (style.w / n);
      wrap.add(arch);
    }
  } else if (style.kind === "flat") {
    const panel = new THREE.Mesh(new THREE.BoxGeometry(style.w, style.h, style.d), new THREE.MeshStandardMaterial({ color }));
    panel.position.y = style.h / 2; panel.userData.part = "panel";
    wrap.add(panel);
  } else if (style.kind === "classic-wall") {
    const back = new THREE.Mesh(new THREE.BoxGeometry(style.w, style.h, style.d * 0.5), new THREE.MeshStandardMaterial({ color }));
    back.position.y = style.h / 2; back.userData.part = "panel";
    wrap.add(back);
    const inset = new THREE.Mesh(new THREE.BoxGeometry(style.w * 0.7, style.h * 0.34, style.d), new THREE.MeshStandardMaterial({ color }));
    inset.position.set(0, style.h * 0.52, style.d * 0.25); inset.userData.part = "panel";
    wrap.add(inset);
  } else if (style.kind === "slatted") {
    wrap.add(buildFlutedPanel(style.w, style.h, color, "panel", style.ribs || 14));
  } else if (style.kind === "grid") {
    const cols = style.cols || 5, rows = style.rows || 6, barT = 0.025;
    for (let i = 0; i <= cols; i++) {
      const bar = new THREE.Mesh(new THREE.BoxGeometry(barT, style.h, style.d), new THREE.MeshStandardMaterial({ color }));
      bar.position.set(-style.w / 2 + i * (style.w / cols), style.h / 2, 0); bar.userData.part = "panel";
      wrap.add(bar);
    }
    for (let j = 0; j <= rows; j++) {
      const bar = new THREE.Mesh(new THREE.BoxGeometry(style.w, barT, style.d), new THREE.MeshStandardMaterial({ color }));
      bar.position.set(0, j * (style.h / rows), 0); bar.userData.part = "panel";
      wrap.add(bar);
    }
  } else if (style.kind === "acrylic") {
    const panel = new THREE.Mesh(new THREE.BoxGeometry(style.w, style.h, style.d), new THREE.MeshStandardMaterial({ color, transparent: true, opacity: 0.35, roughness: 0.05 }));
    panel.position.y = style.h / 2; panel.userData.part = "panel";
    wrap.add(panel);
  } else if (style.kind === "curved-corner") {
    wrap.add(buildFlatPolygonPanel(outlineCurvedCorner(style.w, style.h, style.r), style.d, color, "panel"));
  } else if (style.kind === "angled") {
    wrap.add(buildFlatPolygonPanel(outlineAngled(style.w, style.h, style.cut || 0.35), style.d, color, "panel"));
  }
  return g;
}

function buildStandLeg(h, tiltDeg, side, color) {
  const leg = new THREE.Mesh(new THREE.CylinderGeometry(0.014, 0.018, h, 8), new THREE.MeshStandardMaterial({ color, metalness: 0.3, roughness: 0.4 }));
  leg.position.set(side * h * 0.12, h / 2, h * 0.06);
  leg.rotation.z = -side * THREE.MathUtils.degToRad(tiltDeg);
  leg.userData.part = "stand";
  return leg;
}

const SIGN_STYLES = {
  "acrylic-arch":   { kind: "arch-stand", w: 0.75, h: 1.55, d: 0.03, legH: 0.35, color: 0x6fa8b5, opacity: 0.4, floral: { side: -1, size: 1 } },
  mirror:           { kind: "arch-stand", w: 0.8,  h: 1.7,  d: 0.03, legH: 0.35, color: 0x8fae9e, metal: true, floral: { side: -1, size: 1.5 } },
  "minimal-arch":   { kind: "arch-stand", w: 0.7,  h: 1.5,  d: 0.06, legH: 0,    color: 0xb0724f, floral: { side: 1, size: 0.9 } },
  round:            { kind: "round-stand", r: 0.42, d: 0.05, legH: 0.55, color: 0x6a4c7a, floral: { side: -1, size: 1 } },
  "modern-wave":    { kind: "wave-stand", w: 0.72, h: 1.5, d: 0.05, amp: 0.09, waves: 1, color: 0x4a7d6e, floral: { side: 0, size: 0.9 } },
  "hanging-fabric": { kind: "hanging", w: 0.7, dropH: 1.3, rodY: 1.85, color: 0xb0567a },
  "wooden-arch":    { kind: "arch-stand", w: 0.75, h: 1.55, d: 0.06, legH: 0.4, tripod: true, color: 0xa9754a, floral: { side: -1, size: 1 } },
  "clear-frame":    { kind: "frame-stand", w: 0.75, h: 1.5, legH: 0.35, color: 0x7a93b8, opacity: 0.35, frameColor: 0xC9A44C },
};

function buildWelcomeSign(variant) {
  const style = SIGN_STYLES[variant] || SIGN_STYLES["minimal-arch"];
  const g = new THREE.Group();
  const color = style.color ?? 0xf1ede4;

  if (style.kind === "arch-stand") {
    const legH = style.legH || 0;
    const face = buildArchPanel(style.w, style.h, style.d, color, "panel");
    face.position.y = legH;
    // buildArchPanel always builds plain opaque material — the mirror/
    // acrylic variants need their look layered on top here.
    face.traverse(c => {
      if (!c.isMesh) return;
      c.material.transparent = !!style.opacity;
      c.material.opacity = style.opacity ?? 1;
      c.material.metalness = style.metal ? 0.6 : 0;
      c.material.roughness = style.metal ? 0.2 : 0.6;
    });
    g.add(face);
    if (legH > 0) {
      if (style.tripod) {
        const back = new THREE.Mesh(new THREE.CylinderGeometry(0.016, 0.02, legH, 8), new THREE.MeshStandardMaterial({ color: 0x6f4a2e }));
        back.position.set(0, legH / 2, -style.d * 4); back.rotation.x = 0.35; back.userData.part = "stand";
        g.add(back);
        g.add(buildStandLeg(legH, 12, -1, 0x6f4a2e));
        g.add(buildStandLeg(legH, 12, 1, 0x6f4a2e));
      } else {
        g.add(buildStandLeg(legH, 8, -1, 0xC9A44C));
        g.add(buildStandLeg(legH, 8, 1, 0xC9A44C));
      }
    }
  } else if (style.kind === "round-stand") {
    const legH = style.legH;
    const disc = new THREE.Mesh(new THREE.CylinderGeometry(style.r, style.r, style.d, 40), new THREE.MeshStandardMaterial({ color }));
    disc.rotation.x = Math.PI / 2; disc.position.y = legH + style.r; disc.userData.part = "panel";
    g.add(disc);
    g.add(buildStandLeg(legH + style.r * 0.9, 16, -1, 0xC9A44C));
    g.add(buildStandLeg(legH + style.r * 0.9, 16, 1, 0xC9A44C));
  } else if (style.kind === "wave-stand") {
    const outline = outlineWavyTop(style.w, style.h, style.amp, style.waves);
    g.add(buildFlatPolygonPanel(outline, style.d, color, "panel"));
  } else if (style.kind === "hanging") {
    g.add(buildCurtainRod(style.w, style.rodY, 0xC9A44C));
    const panel = buildCurtainPanel(style.w - 0.04, style.dropH, { color: style.color, opacity: 1, foldAmp: 0.012, foldFreq: 2 });
    panel.position.y = style.rodY - style.dropH - 0.02;
    panel.userData.part = "panel";
    g.add(panel);
  } else if (style.kind === "frame-stand") {
    const legH = style.legH, barT = 0.03;
    const mk = (bw, bh, x, y) => {
      const m = new THREE.Mesh(new THREE.BoxGeometry(bw, bh, barT), new THREE.MeshStandardMaterial({ color: style.frameColor, metalness: 0.6, roughness: 0.3 }));
      m.position.set(x, y, 0); m.userData.part = "stand"; g.add(m);
    };
    mk(style.w, barT, 0, legH + style.h);
    mk(style.w, barT, 0, legH);
    mk(barT, style.h, -style.w / 2, legH + style.h / 2);
    mk(barT, style.h, style.w / 2, legH + style.h / 2);
    const pane = new THREE.Mesh(new THREE.BoxGeometry(style.w - barT * 2, style.h - barT * 2, 0.015), new THREE.MeshStandardMaterial({ color: style.color, transparent: true, opacity: style.opacity, roughness: 0.05 }));
    pane.position.set(0, legH + style.h / 2, 0); pane.userData.part = "panel";
    g.add(pane);
    g.add(buildStandLeg(legH, 8, -1, style.frameColor));
    g.add(buildStandLeg(legH, 8, 1, style.frameColor));
  }

  if (style.floral) {
    const sz = style.floral.size ?? 1;
    const cluster = buildFlowerCluster("blooms", {
      count: Math.round(12 * sz), radiusX: 0.13 * sz, radiusY: 0.11 * sz, radiusZ: 0.12 * sz,
      bloomMin: 0.03, bloomMax: 0.05 * sz, stemCount: 3, stemHeight: 0.1, stemPart: "leaves",
    });
    const fx = (style.floral.side || 0) * ((style.w || style.r * 2 || 0.7) * 0.42);
    cluster.position.set(fx, 0.02, (style.d || 0.05) + 0.06);
    g.add(cluster);
  }
  return g;
}

const ART_STYLES = {
  "abstract-textured":     { kind: "textured", w: 0.7,  h: 0.95, color: 0xa85c4a },
  "minimal-abstract":      { kind: "blobs", w: 0.7,  h: 0.95, color: 0x4a6b8a, blobColor: 0x2f4d6b, count: 2 },
  "neutral-brush-strokes": { kind: "blobs", w: 0.7,  h: 0.95, color: 0x6b8f6b, blobColor: 0x4a6b4a, count: 3 },
  "botanical-leaves":      { kind: "botanical", w: 0.65, h: 0.9,  color: 0x5c7a5c },
  "line-art":              { kind: "line-art", w: 0.65, h: 0.9,  color: 0x7a5c6b },
  landscape:                { kind: "landscape", w: 0.75, h: 0.95, color: 0x7a9cae },
  "floral-painting":       { kind: "floral", w: 0.65, h: 0.9,  color: 0xb06a7e },
  "gold-texture":          { kind: "speckle", w: 0.7,  h: 0.95, color: 0xc9a44c },
};

/* Every painting hangs flush against a wall — computeWallSnap (defined
   further down, near the tile floor plan code) keeps item.position pinned
   to the nearest wall on drop/drag, and
   item.position.y is the frame's BOTTOM edge (local y=0 here), not the
   floor, so a small hanging-wire loop at the top is all the "mount" this
   needs — no foot, no floor contact. "Content" is a few simple procedural
   marks — bands, blobs, a leaf sprig, a speckle scatter — rather than an
   imported picture, consistent with the rest of this file staying
   model-free. */
function buildWallArt(variant) {
  const style = ART_STYLES[variant] || ART_STYLES["abstract-textured"];
  const g = new THREE.Group();
  const { w, h, color } = style;
  const depth = 0.03;
  const cy = h / 2;
  const frame = new THREE.Mesh(new THREE.BoxGeometry(w + 0.05, h + 0.05, depth), new THREE.MeshStandardMaterial({ color: 0xC9A44C, metalness: 0.5, roughness: 0.35 }));
  frame.position.y = cy; frame.userData.part = "frame";
  g.add(frame);
  const hook = new THREE.Mesh(new THREE.TorusGeometry(0.025, 0.006, 6, 12), new THREE.MeshStandardMaterial({ color: 0x8a8378, metalness: 0.6, roughness: 0.3 }));
  hook.position.set(0, h + 0.04, -depth / 2 - 0.005); hook.userData.part = "frame";
  g.add(hook);
  const canvas = new THREE.Mesh(new THREE.BoxGeometry(w, h, 0.012), new THREE.MeshStandardMaterial({ color, roughness: 0.85 }));
  canvas.position.set(0, cy, depth / 2 + 0.006); canvas.userData.part = "canvas";
  g.add(canvas);
  const cz = depth / 2 + 0.013;

  if (style.kind === "textured") {
    for (let i = 0; i < 10; i++) {
      const t = i / 9;
      const bump = new THREE.Mesh(new THREE.BoxGeometry(w * 0.9, 0.01, 0.006), new THREE.MeshStandardMaterial({ color: 0xe6ded0, roughness: 0.9 }));
      bump.position.set(0, cy - h * 0.4 + t * h * 0.8, cz); bump.rotation.z = (t - 0.5) * 0.1; bump.userData.part = "canvas";
      g.add(bump);
    }
  } else if (style.kind === "blobs") {
    const n = style.count || 2;
    for (let i = 0; i < n; i++) {
      const r = w * (0.28 - i * 0.05);
      const blob = new THREE.Mesh(new THREE.CircleGeometry(r, 24), new THREE.MeshStandardMaterial({ color: style.blobColor, roughness: 0.85, side: THREE.DoubleSide }));
      blob.position.set(-w * 0.15 + i * w * 0.2, cy + h * 0.1 - i * h * 0.12, cz + i * 0.002); blob.userData.part = "canvas";
      g.add(blob);
    }
  } else if (style.kind === "botanical") {
    const sprig = buildLeafSprig(h * 0.55, "canvas", 0x6b7a5c);
    sprig.rotation.z = 0.15;
    sprig.position.set(-w * 0.05, cy - h * 0.35, cz);
    g.add(sprig);
  } else if (style.kind === "line-art") {
    for (let i = 0; i < 10; i++) {
      const t = i / 9;
      const seg = new THREE.Mesh(new THREE.BoxGeometry(0.006, 0.006, 0.004), new THREE.MeshStandardMaterial({ color: 0x8a8378 }));
      seg.position.set(Math.sin(t * Math.PI * 1.4) * w * 0.14, cy - h * 0.3 + t * h * 0.6, cz); seg.userData.part = "canvas";
      g.add(seg);
    }
  } else if (style.kind === "landscape") {
    const bands = [{ frac: 0.15, color: 0xd7cdb0 }, { frac: 0.35, color: 0xc9c0a2 }, { frac: 0.5, color: 0xb7c2a8 }];
    let acc = 0;
    bands.forEach(b => {
      const bh = h * b.frac;
      const band = new THREE.Mesh(new THREE.BoxGeometry(w * 0.94, bh, 0.006), new THREE.MeshStandardMaterial({ color: b.color, roughness: 0.85 }));
      band.position.set(0, cy - h / 2 + acc + bh / 2, cz); band.userData.part = "canvas";
      g.add(band);
      acc += bh;
    });
  } else if (style.kind === "floral") {
    const cluster = buildFlowerCluster("canvas", { count: 10, radiusX: w * 0.16, radiusY: h * 0.12, radiusZ: 0.02, bloomMin: 0.025, bloomMax: 0.04, stemCount: 0 });
    cluster.position.set(0, cy - h * 0.28, cz);
    g.add(cluster);
  } else if (style.kind === "speckle") {
    for (let i = 0; i < 26; i++) {
      const fleck = new THREE.Mesh(new THREE.CircleGeometry(0.01 + ((i * 3) % 3) * 0.006, 6), new THREE.MeshStandardMaterial({ color: 0xC9A44C, metalness: 0.6, roughness: 0.3, side: THREE.DoubleSide }));
      fleck.position.set(Math.sin(i * 2.3) * 0.42 * w, cy + Math.cos(i * 1.7) * 0.42 * h, cz); fleck.userData.part = "canvas";
      g.add(fleck);
    }
  }
  return g;
}

/* ── Stages (reference sheet #11 — the numbered stage/plinth grid) ──
   Every stage is a platform (optionally with a front step riser) plus an
   optional freestanding backdrop wall behind it — reusing buildArchPanel/
   buildFlatPolygonPanel/buildCurtainPanel from the panels/signs section
   above for the backdrop shapes, plus one new extrusion helper
   (buildPlatformSlab) for the handful of platform footprints that aren't
   a plain box or cylinder (the wavy-front and organic-blob platforms).
   buildPlatformSlab extrudes a hand-placed, verified-CCW {x,z} outline
   *upward* (into a horizontal slab) the same way buildFlatPolygonPanel
   extrudes a {x,y} outline *outward* (into a vertical panel) — same
   winding-safety reasoning, just the other axis. Every platform/step mesh
   is tagged "platform", every backdrop mesh "backdrop", so Advanced Edit
   can recolor the plinth and the backdrop wall independently. +Z is the
   audience-facing front (where steps extend); -Z is the back (where the
   backdrop stands). */
function buildPlatformSlab(outline, thickness, color, part) {
  const n = outline.length;
  const positions = [];
  const indices = [];
  outline.forEach(p => positions.push(p.x, thickness, p.z)); // 0..n-1 top ring
  outline.forEach(p => positions.push(p.x, 0, p.z));         // n..2n-1 bottom ring
  for (let i = 1; i < n - 1; i++) {
    indices.push(0, i + 1, i);         // top face (+Y)
    indices.push(n, n + i, n + i + 1); // bottom face (-Y)
  }
  for (let i = 0; i < n; i++) {
    const j = (i + 1) % n;
    const a = i, b = j, c = n + i, e = n + j;
    indices.push(a, b, c, b, e, c); // outward-facing side wall
  }
  const geo = new THREE.BufferGeometry();
  geo.setAttribute("position", new THREE.Float32BufferAttribute(positions, 3));
  geo.setIndex(indices);
  geo.computeVertexNormals();
  const mesh = new THREE.Mesh(geo, new THREE.MeshStandardMaterial({ color, roughness: 0.6, side: THREE.DoubleSide }));
  mesh.userData.part = part;
  return mesh;
}

function outlinePlatformWavyFront(w, d, amp, waves, segs = 16) {
  const hw = w / 2, hd = d / 2;
  const pts = [{ x: -hw, z: -hd }, { x: hw, z: -hd }];
  for (let i = 0; i <= segs; i++) {
    const t = i / segs;
    pts.push({ x: hw - t * w, z: hd + Math.sin(t * Math.PI * waves) * amp });
  }
  return pts;
}

function outlinePlatformOrganic(rBase, segs = 28) {
  const pts = [];
  for (let s = 0; s < segs; s++) {
    const theta = (s / segs) * Math.PI * 2;
    const r = rBase * (1 + 0.22 * Math.cos(theta * 2 + 0.4) + 0.14 * Math.sin(theta * 3 + 1.1));
    pts.push({ x: Math.cos(theta) * r, z: Math.sin(theta) * r });
  }
  return pts;
}

function buildStagePlatform(kind, opts = {}) {
  const { w = 2.6, d = 1.9, height = 0.36, color = 0xf2efe9, r = 1.1, sides = 8, tiers = 2, tierShrink = 0.85 } = opts;
  const g = new THREE.Group();
  const mat = () => new THREE.MeshStandardMaterial({ color, roughness: 0.6 });

  if (kind === "rect") {
    const box = new THREE.Mesh(new THREE.BoxGeometry(w, height, d), mat());
    box.position.y = height / 2; box.userData.part = "platform";
    g.add(box);
  } else if (kind === "round" || kind === "polygon") {
    const cyl = new THREE.Mesh(new THREE.CylinderGeometry(r, r, height, kind === "polygon" ? sides : 40), mat());
    cyl.position.y = height / 2; cyl.userData.part = "platform";
    g.add(cyl);
  } else if (kind === "round-tiered") {
    let y = 0, rr = r;
    const tierH = height / tiers;
    for (let i = 0; i < tiers; i++) {
      const tier = new THREE.Mesh(new THREE.CylinderGeometry(rr, rr, tierH, 40), mat());
      tier.position.y = y + tierH / 2; tier.userData.part = "platform";
      g.add(tier);
      y += tierH; rr *= tierShrink;
    }
  } else if (kind === "inset-top") {
    const base = new THREE.Mesh(new THREE.BoxGeometry(w, height * 0.55, d), mat());
    base.position.y = height * 0.275; base.userData.part = "platform";
    g.add(base);
    const top = new THREE.Mesh(new THREE.BoxGeometry(w * 0.6, height * 0.45, d * 0.6), mat());
    top.position.y = height * 0.55 + height * 0.225; top.userData.part = "platform";
    g.add(top);
  } else if (kind === "wavy") {
    g.add(buildPlatformSlab(outlinePlatformWavyFront(w, d, opts.waveAmp ?? 0.1, opts.waves ?? 2), height, color, "platform"));
  } else if (kind === "organic") {
    g.add(buildPlatformSlab(outlinePlatformOrganic(r), height, color, "platform"));
  } else if (kind === "drum") {
    const drum = new THREE.Mesh(new THREE.CylinderGeometry(r, r * 1.06, height, 44), mat());
    drum.position.y = height / 2; drum.userData.part = "platform";
    g.add(drum);
    const foot = new THREE.Mesh(new THREE.CylinderGeometry(r * 1.1, r * 1.16, height * 0.08, 44), mat());
    foot.position.y = height * 0.04; foot.userData.part = "platform";
    g.add(foot);
  } else if (kind === "pyramid") {
    let y = 0;
    const tierH = height / tiers;
    for (let i = 0; i < tiers; i++) {
      const ww = w * (1 - i * (1 - tierShrink));
      const dd = d * (1 - i * (1 - tierShrink));
      const tier = new THREE.Mesh(new THREE.BoxGeometry(ww, tierH, dd), mat());
      tier.position.y = y + tierH / 2; tier.userData.part = "platform";
      g.add(tier);
      y += tierH;
    }
  }
  return g;
}

function buildStageSteps(kind, w, d, height, color) {
  const g = new THREE.Group();
  const mat = () => new THREE.MeshStandardMaterial({ color, roughness: 0.6 });
  if (kind === "single") {
    const stepH = height * 0.4, stepD = d * 0.16;
    const step = new THREE.Mesh(new THREE.BoxGeometry(w * 0.44, stepH, stepD), mat());
    step.position.set(0, stepH / 2, d / 2 + stepD / 2); step.userData.part = "platform";
    g.add(step);
  } else if (kind === "multi") {
    const n = 2, stepD = d * 0.14;
    for (let i = 0; i < n; i++) {
      const stepH = height * (0.75 - i * 0.3);
      const stepW = w * (0.5 - i * 0.06);
      const step = new THREE.Mesh(new THREE.BoxGeometry(stepW, stepH, stepD), mat());
      step.position.set(0, stepH / 2, d / 2 + stepD * (i + 1) - stepD * 0.5); step.userData.part = "platform";
      g.add(step);
    }
  }
  return g;
}

function buildStageBackdrop(kind, w, h, d, color) {
  const g = new THREE.Group();
  const mat = () => new THREE.MeshStandardMaterial({ color, roughness: 0.6 });
  const bz = -d * 0.42;
  if (kind === "flat" || kind === "tall-flat") {
    const p = new THREE.Mesh(new THREE.BoxGeometry(w, h, 0.08), mat());
    p.position.set(0, h / 2, bz); p.userData.part = "backdrop";
    g.add(p);
  } else if (kind === "wave") {
    const panel = buildFlatPolygonPanel(outlineWavyTop(w, h, 0.2, 2), 0.09, color, "backdrop");
    panel.position.z = bz; g.add(panel);
  } else if (kind === "curved-s") {
    const panel = buildFlatPolygonPanel(outlineWavyTop(w, h, 0.16, 1.4), 0.08, color, "backdrop");
    panel.position.z = bz; g.add(panel);
  } else if (kind === "round-arch") {
    const ringR = w * 0.42;
    const ring = new THREE.Mesh(new THREE.TorusGeometry(ringR, ringR * 0.13, 12, 32, Math.PI), mat());
    ring.position.set(0, 0, bz); ring.userData.part = "backdrop";
    g.add(ring);
  } else if (kind === "arch-dome") {
    const panel = buildArchPanel(w * 0.85, h, 0.09, color, "backdrop");
    panel.position.z = bz; g.add(panel);
  } else if (kind === "tall-arch-dome") {
    const panel = buildArchPanel(w * 0.55, h, 0.09, color, "backdrop");
    panel.position.z = bz; g.add(panel);
  } else if (kind === "open-frame") {
    const barT = 0.06;
    const mk = (bw, bh, x, y) => { const m = new THREE.Mesh(new THREE.BoxGeometry(bw, bh, barT), mat()); m.position.set(x, y, bz); m.userData.part = "backdrop"; g.add(m); };
    mk(w, barT, 0, h);
    mk(w, barT, 0, 0.02);
    mk(barT, h, -w / 2, h / 2);
    mk(barT, h, w / 2, h / 2);
  } else if (kind === "multi-panel") {
    const heights = [h * 0.8, h, h * 0.85];
    const xs = [-w * 0.32, 0, w * 0.32];
    const zs = [bz + 0.04, bz, bz + 0.04];
    heights.forEach((hh, i) => {
      const p = new THREE.Mesh(new THREE.BoxGeometry(w * 0.34, hh, 0.07), mat());
      p.position.set(xs[i], hh / 2, zs[i]); p.userData.part = "backdrop";
      g.add(p);
    });
  } else if (kind === "curtain-flat") {
    const p = new THREE.Mesh(new THREE.BoxGeometry(w, h, 0.08), mat());
    p.position.set(0, h / 2, bz); p.userData.part = "backdrop";
    g.add(p);
    [-1, 1].forEach(side => {
      const curtain = buildCurtainPanel(w * 0.22, h * 0.9, { color: 0xf7f1e4, opacity: 0.95, foldAmp: 0.02, foldFreq: 3 });
      curtain.position.set(side * w * 0.44, 0, bz + 0.06);
      curtain.userData.part = "backdrop";
      g.add(curtain);
    });
  } else if (kind === "triple-arch") {
    const heights = [h * 0.75, h, h * 0.75];
    const xs = [-w * 0.32, 0, w * 0.32];
    heights.forEach((hh, i) => {
      const arch = buildArchPanel(w * 0.3, hh, 0.08, color, "backdrop");
      arch.position.set(xs[i], 0, bz + (i % 2 === 0 ? 0.02 : -0.02));
      g.add(arch);
    });
  } else if (kind === "corner") {
    const p1 = new THREE.Mesh(new THREE.BoxGeometry(w * 0.55, h, 0.08), mat());
    p1.position.set(-w * 0.24, h / 2, bz); p1.userData.part = "backdrop";
    g.add(p1);
    const p2 = new THREE.Mesh(new THREE.BoxGeometry(d * 0.7, h, 0.08), mat());
    p2.rotation.y = Math.PI / 2;
    p2.position.set(w * 0.02, h / 2, bz + d * 0.28); p2.userData.part = "backdrop";
    g.add(p2);
  } else if (kind === "side-walls") {
    [-1, 1].forEach(side => {
      const p = new THREE.Mesh(new THREE.BoxGeometry(0.08, h, d * 0.7), mat());
      p.position.set(side * w * 0.46, h / 2, bz + d * 0.2); p.userData.part = "backdrop";
      g.add(p);
    });
  }
  return g;
}

// Every variant gets its own distinct, clearly-saturated default color
// (rather than the one shared cream) so each stage reads apart from its
// neighbors in the catalog list, not just in the 3D scene.
const STAGE_STYLES = {
  "flat-backdrop":           { platform: "rect", w: 2.6, d: 1.9, height: 0.36, step: "single", backdrop: "flat", backdropH: 1.5, color: "#d98e73" },
  "round-tiered-podium":     { platform: "round-tiered", r: 1.15, height: 0.34, tiers: 2, step: "none", backdrop: "none", color: "#6b8f71" },
  "inset-top-platform":      { platform: "inset-top", w: 2.5, d: 1.8, height: 0.4, step: "single", backdrop: "none", color: "#c9a44c" },
  "wave-backdrop":           { platform: "wavy", w: 2.6, d: 1.9, height: 0.36, waveAmp: 0.1, waves: 2, step: "single", backdrop: "wave", backdropH: 1.5, color: "#7a9cc6" },
  "side-wall-panels":        { platform: "rect", w: 2.5, d: 1.85, height: 0.36, step: "multi", backdrop: "side-walls", backdropH: 1.5, color: "#a65d57" },
  "round-arch":              { platform: "round", r: 1.05, height: 0.3, step: "none", backdrop: "round-arch", backdropH: 1.55, color: "#8e7cc3" },
  "tall-flat-backdrop":      { platform: "rect", w: 2.6, d: 1.9, height: 0.36, step: "single", backdrop: "tall-flat", backdropH: 1.85, color: "#2f4858" },
  "arch-dome-backdrop":      { platform: "rect", w: 2.6, d: 1.9, height: 0.36, step: "single", backdrop: "arch-dome", backdropH: 1.4, color: "#d4a5a5" },
  "tall-arch-dome-backdrop": { platform: "rect", w: 2.6, d: 1.9, height: 0.36, step: "single", backdrop: "tall-arch-dome", backdropH: 1.7, color: "#4a7c6f" },
  "octagon-platform":        { platform: "polygon", sides: 8, r: 1.15, height: 0.36, step: "single", backdrop: "none", color: "#b08968" },
  "curved-s-tiered":         { platform: "round-tiered", r: 1.2, height: 0.4, tiers: 3, step: "none", backdrop: "curved-s", backdropH: 1.7, color: "#6f4e7c" },
  "open-frame-backdrop":     { platform: "rect", w: 2.6, d: 1.9, height: 0.36, step: "single", backdrop: "open-frame", backdropH: 1.75, color: "#7c8471" },
  "multi-panel-backdrop":    { platform: "rect", w: 2.6, d: 1.9, height: 0.36, step: "single", backdrop: "multi-panel", backdropH: 1.5, color: "#9c4f4f" },
  "round-drum":              { platform: "drum", r: 1.0, height: 0.85, step: "none", backdrop: "none", color: "#3f6b6f" },
  "tiered-pyramid":          { platform: "pyramid", w: 2.6, d: 1.9, height: 0.55, tiers: 4, tierShrink: 0.78, step: "none", backdrop: "none", color: "#c17c3f" },
  "curtain-backdrop":        { platform: "rect", w: 2.6, d: 1.9, height: 0.36, step: "single", backdrop: "curtain-flat", backdropH: 1.5, color: "#b5647a" },
  "organic-platform":        { platform: "organic", r: 1.15, height: 0.28, step: "none", backdrop: "none", color: "#6a8caf" },
  "hexagon-platform":        { platform: "polygon", sides: 6, r: 1.15, height: 0.36, step: "single", backdrop: "none", color: "#4f6b4f" },
  "triple-arch-backdrop":    { platform: "rect", w: 2.6, d: 1.9, height: 0.36, step: "single", backdrop: "triple-arch", backdropH: 1.55, color: "#a3785f" },
  "corner-backdrop":         { platform: "rect", w: 2.6, d: 1.9, height: 0.36, step: "multi", backdrop: "corner", backdropH: 1.6, color: "#5c5470" },
};

/* Assembles a full stage — platform (+ optional step riser) + optional
   backdrop wall, positioned on top of the platform — from STAGE_STYLES
   for a given variant id. */
function buildStage(variant) {
  const style = STAGE_STYLES[variant] || STAGE_STYLES["flat-backdrop"];
  const g = new THREE.Group();
  const color = style.color ?? 0xf2efe9;
  const footprintW = style.w ?? style.r * 2;
  const footprintD = style.d ?? style.r * 2;
  g.add(buildStagePlatform(style.platform, { ...style, color }));
  if (style.step && style.step !== "none") {
    g.add(buildStageSteps(style.step, footprintW, footprintD, style.height, color));
  }
  if (style.backdrop && style.backdrop !== "none") {
    const backdrop = buildStageBackdrop(style.backdrop, footprintW, style.backdropH ?? 1.5, footprintD, color);
    backdrop.position.y = style.height;
    g.add(backdrop);
  }
  return g;
}

/* ── Balloons ──
   Deliberately two tiers of fidelity: the 8 standalone "hero" balloons
   (row 1 of the reference sheet) get a real lathe-revolved or puffed-panel
   body since they're viewed up close, while every garland/cluster/arch/
   column/wall composition (rows 2-4) is built from plain SphereGeometry
   units — matching the existing balloon-arch-bow precedent above, and the
   right call performance-wise once counts run into the dozens per object.
   Every mesh is tagged one of three generic parts (balloons/accent/trim)
   so PART_LABELS.balloon covers all 29 variants with one shared dict,
   same convention as table's top/base or rug's rug/pattern. */
const BALLOON_STRING = "#d4a373"; // warm tan ribbon — a plain white string
// would vanish visually, so every string/ribbon/knot defaults to this.
const BALLOON_STAND = "#4a4e69";  // charcoal-slate — default stand/frame/pole color.

function balloonHash(i) {
  const x = Math.sin(i * 12.9898 + 78.233) * 43758.5453;
  return x - Math.floor(x);
}

// Classic round-balloon silhouette: wide round belly, pinched neck at the
// top where the knot/string attaches. Same {r,y} revolve technique as the
// vase profiles above — LatheGeometry closes both poles automatically.
function profileBalloon(r, h, neckR = r * 0.12) {
  return [
    new THREE.Vector2(0, 0),
    new THREE.Vector2(r * 0.55, h * 0.05),
    new THREE.Vector2(r * 0.92, h * 0.22),
    new THREE.Vector2(r, h * 0.44),
    new THREE.Vector2(r * 0.94, h * 0.64),
    new THREE.Vector2(r * 0.68, h * 0.84),
    new THREE.Vector2(r * 0.32, h * 0.94),
    new THREE.Vector2(neckR, h * 0.98),
    new THREE.Vector2(neckR * 0.8, h),
  ];
}

function buildBalloonBody(r, h, color) {
  const mesh = new THREE.Mesh(new THREE.LatheGeometry(profileBalloon(r, h), 16), new THREE.MeshStandardMaterial({ color, roughness: 0.35 }));
  mesh.userData.part = "balloons";
  return mesh;
}

// A single string/ribbon hanging from a shape's underside down to the
// floor — the returned group is anchored so positioning it at y=len puts
// its bottom exactly at the floor (y=0).
function buildBalloonString(len, color) {
  const g = new THREE.Group();
  const s = new THREE.Mesh(new THREE.CylinderGeometry(0.006, 0.006, len, 6), new THREE.MeshStandardMaterial({ color }));
  s.position.y = -len / 2;
  s.userData.part = "trim";
  g.add(s);
  return g;
}

// A single spherical "garland unit" — the reusable building block for
// every cluster/arch/ring/column/wall composition below.
function buildBalloonGarlandUnit(x, y, z, r, color, part) {
  const m = new THREE.Mesh(new THREE.SphereGeometry(r, 12, 10), new THREE.MeshStandardMaterial({ color, roughness: 0.35 }));
  m.position.set(x, y, z);
  m.userData.part = part;
  return m;
}

// Outline generators for the puffed-panel foil balloons — consumed by the
// existing buildFlatPolygonPanel (safe, pre-verified winding), so no new
// custom BufferGeometry winding needs deriving here.
function outlineHeart(scale, segs = 24) {
  const pts = [];
  for (let i = 0; i < segs; i++) {
    const t = (i / segs) * Math.PI * 2;
    const rx = 16 * Math.pow(Math.sin(t), 3);
    const ry = 13 * Math.cos(t) - 5 * Math.cos(2 * t) - 2 * Math.cos(3 * t) - Math.cos(4 * t);
    pts.push({ x: (rx / 32) * scale, y: ((ry + 17) / 30) * scale });
  }
  return pts;
}

function outlineStar(outerR, innerR, points = 5) {
  const pts = [];
  const n = points * 2;
  for (let i = 0; i < n; i++) {
    const r = i % 2 === 0 ? outerR : innerR;
    const angle = (i / n) * Math.PI * 2 - Math.PI / 2;
    pts.push({ x: Math.cos(angle) * r, y: Math.sin(angle) * r + outerR });
  }
  return pts;
}

function outlineDiamond(w, h) {
  const hw = w / 2;
  return [{ x: 0, y: h }, { x: hw, y: h / 2 }, { x: 0, y: 0 }, { x: -hw, y: h / 2 }];
}

const BALLOON_STYLES = {
  // Row 1 — standalone balloons
  "round-tassel":  { kind: "single", shape: "round",      r: 0.32, h: 0.42, stringLen: 0.55, color: "#ef476f" },
  "round-small":   { kind: "single", shape: "round",      r: 0.2,  h: 0.26, stringLen: 0.4,  color: "#f78c6b" },
  "heart-foil":    { kind: "single", shape: "heart",      size: 0.5,  thickness: 0.14, stringLen: 0.5, color: "#ff5d8f" },
  "star-foil":     { kind: "single", shape: "star",       outerR: 0.28, innerR: 0.12, thickness: 0.14, stringLen: 0.5, color: "#ffd166" },
  "round-foil":    { kind: "single", shape: "round-foil", r: 0.34, thickness: 0.14, stringLen: 0.5, color: "#06d6a0" },
  "oval-classic":  { kind: "single", shape: "round",      r: 0.26, h: 0.5,  stringLen: 0.55, color: "#7b2cbf" },
  "pillow-foil":   { kind: "single", shape: "pillow",     w: 0.5, h: 0.5, thickness: 0.16, stringLen: 0.5, color: "#4361ee" },
  "diamond-foil":  { kind: "single", shape: "diamond",    w: 0.5, h: 0.62, thickness: 0.14, stringLen: 0.5, color: "#f15bb5" },
  // Row 2 — clusters, bubble, confetti, tower
  "cluster-tassel":    { kind: "bunch", count: 7,  baseR: 0.15, centerY: 1.05, spread: 0.24, accentEvery: 4, color: "#ff6b6b", accentColor: "#ffd166" },
  "cluster-mixed":     { kind: "bunch", count: 8,  baseR: 0.15, centerY: 1.05, spread: 0.26, accentEvery: 3, color: "#f4a261", accentColor: "#2ec4b6" },
  "cluster-hearts":    { kind: "bunch", count: 7,  baseR: 0.13, centerY: 1.0,  spread: 0.24, accentEvery: 3, color: "#ff8fab", accentColor: "#d00000", foilShape: "heart" },
  "cluster-stars":     { kind: "bunch", count: 7,  baseR: 0.13, centerY: 1.0,  spread: 0.24, accentEvery: 3, color: "#ffbe0b", accentColor: "#fb5607", foilShape: "star" },
  "cluster-large":     { kind: "bunch", count: 11, baseR: 0.16, centerY: 1.15, spread: 0.32, accentEvery: 4, color: "#4cc9f0", accentColor: "#4361ee" },
  "bubble-tassel":     { kind: "bubble", shellR: 0.4, shellColor: "#90e0ef", innerCount: 6, color: "#ffd60a", accentColor: "#ff006e" },
  "confetti-cluster":  { kind: "bunch", count: 9,  baseR: 0.15, centerY: 1.05, spread: 0.26, accentEvery: 2, color: "#80ed99", accentColor: "#ff006e" },
  "tower-boxes":       { kind: "tower", boxes: 4, boxSize: 0.4, color: "#b298dc", accentColor: "#ff006e", frameColor: "#a2d2ff" },
  // Row 3 — arches, rings
  "arch-full":   { kind: "arch", count: 16, rx: 0.55, ry: 1.5, startDeg: 180, endDeg: 0,  cx: 0,     cy: 0.35, accentEvery: 3, color: "#ef476f", accentColor: "#ffd166" },
  "arch-half":   { kind: "arch", count: 12, rx: 0.5,  ry: 1.4, startDeg: 195, endDeg: 75, cx: -0.15, cy: 0.15, accentEvery: 3, color: "#fb8500", accentColor: "#219ebc" },
  "ring-open":   { kind: "ring", count: 20, r: 0.55, cy: 0.75, accentEvery: 4, stand: true,  color: "#9d4edd", accentColor: "#3a0ca3" },
  "ring-wreath": { kind: "ring", count: 26, r: 0.5,  cy: 0.65, accentEvery: 5, stand: false, color: "#38b000", accentColor: "#ffd60a" },
  "arc-partial": { kind: "arc-partial", count: 16, r: 0.5, cy: 0.55, accentEvery: 3, color: "#f72585", accentColor: "#7209b7" },
  // Row 4 — columns, walls
  "column-round":            { kind: "column",         count: 5,  baseR: 0.24, height: 1.5, color: "#1b998b" },
  "column-tapered":          { kind: "column",         count: 6,  baseR: 0.26, height: 1.6, color: "#3f37c9" },
  "column-heart":            { kind: "column-foil",    count: 5,  size: 0.32, height: 1.5, shape: "heart", color: "#d00000" },
  "column-star":             { kind: "column-foil",    count: 5,  size: 0.3,  height: 1.5, shape: "star",  color: "#ffb703" },
  "column-cluster-organic":  { kind: "column-cluster", count: 22, height: 1.6, baseR: 0.14, jitter: 0.09, accentEvery: 4, color: "#ff9f1c", accentColor: "#2ec4b6" },
  "column-cluster-dense":    { kind: "column-cluster", count: 32, height: 1.7, baseR: 0.13, jitter: 0.07, accentEvery: 3, color: "#00b4d8", accentColor: "#ef476f" },
  "wall-grid":               { kind: "wall", cols: 6, rows: 5, spacing: 0.24, baseR: 0.11, organic: false, color: "#ff006e", accentColor: "#ffd166" },
  "wall-organic":            { kind: "wall", cols: 7, rows: 6, spacing: 0.2,  baseR: 0.1,  organic: true,  color: "#7209b7", accentColor: "#f72585" },
};

function buildBalloon(variant) {
  const s = BALLOON_STYLES[variant] || BALLOON_STYLES["round-tassel"];
  const g = new THREE.Group();
  const mainColor = s.color;
  const accentColor = s.accentColor || s.color;

  if (s.kind === "single") {
    let body;
    if (s.shape === "round") {
      body = buildBalloonBody(s.r, s.h, mainColor);
    } else if (s.shape === "heart") {
      body = buildFlatPolygonPanel(outlineHeart(s.size), s.thickness, mainColor, "balloons");
    } else if (s.shape === "star") {
      body = buildFlatPolygonPanel(outlineStar(s.outerR, s.innerR), s.thickness, mainColor, "balloons");
    } else if (s.shape === "round-foil") {
      body = new THREE.Mesh(new THREE.SphereGeometry(s.r, 22, 16), new THREE.MeshStandardMaterial({ color: mainColor, roughness: 0.3 }));
      body.scale.set(1, 1, s.thickness / s.r);
      body.userData.part = "balloons";
    } else if (s.shape === "pillow") {
      body = new THREE.Mesh(new THREE.BoxGeometry(s.w, s.h, s.thickness), new THREE.MeshStandardMaterial({ color: mainColor, roughness: 0.3 }));
      body.userData.part = "balloons";
    } else if (s.shape === "diamond") {
      body = buildFlatPolygonPanel(outlineDiamond(s.w, s.h), s.thickness, mainColor, "balloons");
    }
    // Centered geometries (round-foil, pillow) anchor at their own middle;
    // base-at-y=0 geometries (lathe body, heart/star/diamond panels) anchor
    // at their bottom — normalize both so the shape floats above the string.
    body.position.y = (s.shape === "round-foil" || s.shape === "pillow")
      ? s.stringLen + (s.shape === "round-foil" ? s.r : s.h / 2)
      : s.stringLen;
    g.add(body);
    const str = buildBalloonString(s.stringLen, BALLOON_STRING);
    str.position.y = s.stringLen;
    g.add(str);

  } else if (s.kind === "bunch") {
    const { count, baseR, accentEvery = 3, centerY, spread, foilShape } = s;
    for (let i = 0; i < count; i++) {
      const theta = (i / count) * Math.PI * 2 + balloonHash(i) * 0.5;
      const rad = spread * (0.35 + balloonHash(i + 60) * 0.65);
      const x = Math.cos(theta) * rad;
      const z = Math.sin(theta) * rad * 0.6;
      const y = centerY + (spread - rad) * 0.9 + balloonHash(i + 90) * 0.05;
      const size = baseR * (0.85 + balloonHash(i + 120) * 0.3);
      const isAccent = accentEvery > 0 && i % accentEvery === accentEvery - 1;
      const color = isAccent ? accentColor : mainColor;
      if (foilShape && isAccent) {
        const pts = foilShape === "heart" ? outlineHeart(size * 2) : outlineStar(size * 1.3, size * 0.55);
        const panel = buildFlatPolygonPanel(pts, size * 0.4, color, "accent");
        panel.position.set(x, y - size * 0.4, z);
        g.add(panel);
      } else {
        g.add(buildBalloonGarlandUnit(x, y, z, size, color, isAccent ? "accent" : "balloons"));
      }
    }
    const ribbonLen = centerY - spread * 0.3;
    const ribbon = buildBalloonString(ribbonLen, BALLOON_STRING);
    ribbon.position.y = ribbonLen;
    g.add(ribbon);
    const knot = new THREE.Mesh(new THREE.SphereGeometry(0.03, 8, 8), new THREE.MeshStandardMaterial({ color: BALLOON_STRING }));
    knot.position.y = ribbonLen; knot.userData.part = "trim";
    g.add(knot);

  } else if (s.kind === "bubble") {
    const shellY = s.shellR + 0.5;
    const shell = new THREE.Mesh(new THREE.SphereGeometry(s.shellR, 24, 18), new THREE.MeshStandardMaterial({ color: s.shellColor, roughness: 0.15 }));
    shell.position.y = shellY; shell.userData.part = "trim";
    g.add(shell);
    for (let i = 0; i < s.innerCount; i++) {
      const theta = balloonHash(i + 10) * Math.PI * 2;
      const rad = s.shellR * 0.55 * (0.4 + balloonHash(i + 70) * 0.6);
      const x = Math.cos(theta) * rad, z = Math.sin(theta) * rad;
      const y = shellY - s.shellR * 0.35 + balloonHash(i + 130) * 0.15;
      const size = s.shellR * 0.22 * (0.8 + balloonHash(i + 160) * 0.4);
      const isAccent = i % 3 === 2;
      g.add(buildBalloonGarlandUnit(x, y, z, size, isAccent ? accentColor : mainColor, isAccent ? "accent" : "balloons"));
    }
    const strLen = shellY - s.shellR;
    const str = buildBalloonString(strLen, BALLOON_STRING);
    str.position.y = strLen;
    g.add(str);

  } else if (s.kind === "tower") {
    const { boxes, boxSize, frameColor } = s;
    for (let i = 0; i < boxes; i++) {
      const y = i * boxSize + boxSize / 2;
      const box = new THREE.Mesh(new THREE.BoxGeometry(boxSize, boxSize, boxSize), new THREE.MeshStandardMaterial({ color: frameColor, roughness: 0.2, metalness: 0.1 }));
      box.position.y = y; box.userData.part = "trim";
      g.add(box);
      for (let j = 0; j < 3; j++) {
        const x = (balloonHash(i * 3 + j) - 0.5) * boxSize * 0.5;
        const z = (balloonHash(i * 3 + j + 40) - 0.5) * boxSize * 0.5;
        const size = boxSize * 0.22;
        const isAccent = j === 1;
        g.add(buildBalloonGarlandUnit(x, y, z, size, isAccent ? accentColor : mainColor, isAccent ? "accent" : "balloons"));
      }
    }

  } else if (s.kind === "arch") {
    const { count, rx, ry, startDeg, endDeg, cx, cy, accentEvery = 3 } = s;
    for (let i = 0; i < count; i++) {
      const t = count > 1 ? i / (count - 1) : 0;
      const ang = THREE.MathUtils.degToRad(startDeg + (endDeg - startDeg) * t);
      const x = Math.cos(ang) * rx + cx;
      const y = Math.sin(ang) * ry + cy;
      const z = (balloonHash(i + 400) - 0.5) * 0.12;
      const size = 0.14 + balloonHash(i + 420) * 0.05;
      const isAccent = accentEvery > 0 && i % accentEvery === accentEvery - 1;
      g.add(buildBalloonGarlandUnit(x, y, z, size, isAccent ? accentColor : mainColor, isAccent ? "accent" : "balloons"));
    }

  } else if (s.kind === "ring") {
    const { count, r, cy, accentEvery = 4, stand } = s;
    for (let i = 0; i < count; i++) {
      const ang = (i / count) * Math.PI * 2;
      const x = Math.cos(ang) * r;
      const y = Math.sin(ang) * r + cy;
      const z = (balloonHash(i + 500) - 0.5) * 0.1;
      const size = 0.13 + balloonHash(i + 520) * 0.04;
      const isAccent = accentEvery > 0 && i % accentEvery === accentEvery - 1;
      g.add(buildBalloonGarlandUnit(x, y, z, size, isAccent ? accentColor : mainColor, isAccent ? "accent" : "balloons"));
    }
    if (stand) {
      const poleLen = cy - r * 0.15;
      const pole = new THREE.Mesh(new THREE.CylinderGeometry(0.02, 0.02, poleLen, 8), new THREE.MeshStandardMaterial({ color: BALLOON_STAND }));
      pole.position.y = poleLen / 2; pole.userData.part = "trim";
      g.add(pole);
      const base = new THREE.Mesh(new THREE.CylinderGeometry(0.18, 0.2, 0.05, 20), new THREE.MeshStandardMaterial({ color: BALLOON_STAND }));
      base.position.y = 0.025; base.userData.part = "trim";
      g.add(base);
    }

  } else if (s.kind === "arc-partial") {
    const { count, r, cy, accentEvery = 3 } = s;
    const startDeg = -50, endDeg = 250;
    for (let i = 0; i < count; i++) {
      const t = count > 1 ? i / (count - 1) : 0;
      const ang = THREE.MathUtils.degToRad(startDeg + (endDeg - startDeg) * t);
      const x = Math.cos(ang) * r;
      const y = Math.sin(ang) * r + cy;
      const z = (balloonHash(i + 600) - 0.5) * 0.1;
      const size = 0.13 + balloonHash(i + 620) * 0.05;
      const isAccent = accentEvery > 0 && i % accentEvery === accentEvery - 1;
      g.add(buildBalloonGarlandUnit(x, y, z, size, isAccent ? accentColor : mainColor, isAccent ? "accent" : "balloons"));
    }

  } else if (s.kind === "column") {
    const { count, baseR, height } = s;
    for (let i = 0; i < count; i++) {
      const t = count > 1 ? i / (count - 1) : 0;
      const y = t * height * 0.94 + baseR * 0.9;
      const size = baseR * (1 - t * 0.35);
      const x = (balloonHash(i + 700) - 0.5) * 0.03;
      const z = (balloonHash(i + 720) - 0.5) * 0.03;
      g.add(buildBalloonGarlandUnit(x, y, z, size, mainColor, "balloons"));
    }
    const base = new THREE.Mesh(new THREE.CylinderGeometry(baseR * 0.9, baseR * 1.0, 0.06, 20), new THREE.MeshStandardMaterial({ color: BALLOON_STAND }));
    base.position.y = 0.03; base.userData.part = "trim";
    g.add(base);

  } else if (s.kind === "column-foil") {
    const { count, size, height, shape } = s;
    for (let i = 0; i < count; i++) {
      const t = count > 1 ? i / (count - 1) : 0;
      const y = t * height * 0.9 + size * 0.6;
      const pts = shape === "heart" ? outlineHeart(size) : outlineStar(size * 0.55, size * 0.24);
      const panel = buildFlatPolygonPanel(pts, size * 0.3, mainColor, "balloons");
      panel.position.set(0, y - size * 0.5, 0);
      panel.rotation.y = (i % 2) * 0.35;
      g.add(panel);
    }
    const pole = new THREE.Mesh(new THREE.CylinderGeometry(0.02, 0.02, height * 0.15, 8), new THREE.MeshStandardMaterial({ color: BALLOON_STAND }));
    pole.position.y = height * 0.075; pole.userData.part = "trim";
    g.add(pole);

  } else if (s.kind === "column-cluster") {
    const { count, height, baseR, jitter, accentEvery = 4 } = s;
    for (let i = 0; i < count; i++) {
      const t = i / count;
      const y = t * height + baseR;
      const ang = balloonHash(i + 800) * Math.PI * 2;
      const rad = jitter * (0.4 + balloonHash(i + 820) * 0.6);
      const x = Math.cos(ang) * rad, z = Math.sin(ang) * rad;
      const size = baseR * (0.8 + balloonHash(i + 840) * 0.4);
      const isAccent = accentEvery > 0 && i % accentEvery === accentEvery - 1;
      g.add(buildBalloonGarlandUnit(x, y, z, size, isAccent ? accentColor : mainColor, isAccent ? "accent" : "balloons"));
    }
    const base = new THREE.Mesh(new THREE.CylinderGeometry(baseR * 1.1, baseR * 1.3, 0.05, 16), new THREE.MeshStandardMaterial({ color: BALLOON_STAND }));
    base.position.y = 0.025; base.userData.part = "trim";
    g.add(base);

  } else if (s.kind === "wall") {
    const { cols, rows, spacing, baseR, organic } = s;
    const w = cols * spacing, h = rows * spacing;
    const frame = new THREE.Mesh(new THREE.BoxGeometry(w + 0.06, h + 0.06, 0.04), new THREE.MeshStandardMaterial({ color: BALLOON_STAND }));
    frame.position.set(0, h / 2, -0.06); frame.userData.part = "trim";
    g.add(frame);
    for (let row = 0; row < rows; row++) {
      for (let col = 0; col < cols; col++) {
        const idx = row * cols + col;
        const jx = organic ? (balloonHash(idx + 900) - 0.5) * spacing * 0.5 : 0;
        const jy = organic ? (balloonHash(idx + 920) - 0.5) * spacing * 0.5 : 0;
        const x = (col - (cols - 1) / 2) * spacing + jx;
        const y = row * spacing + spacing / 2 + jy;
        const size = organic ? baseR * (0.75 + balloonHash(idx + 940) * 0.5) : baseR;
        const isAccent = organic ? balloonHash(idx + 960) > 0.78 : ((row + col) % 3 === 0);
        g.add(buildBalloonGarlandUnit(x, y, 0.02, size, isAccent ? accentColor : mainColor, isAccent ? "accent" : "balloons"));
      }
    }
  }

  return g;
}

/* Re-materials (and optionally recolors) every mesh in a built object.
   Meshes tagged keepEmissive (glowing screens/bulbs) are left alone so
   customizing a whole object's material doesn't kill its light source. */
function applyItemMaterial(obj, item) {
  const defaultPreset = MATERIAL_PRESETS[item.material] || MATERIAL_PRESETS[DEFAULT_MATERIAL];
  obj.traverse(c => {
    // keepEmissive = glowing bulbs/screens; keepOwnMaterial = bespoke trim
    // (e.g. a booth's gold accents) that should stay metallic regardless of
    // the item's overall material choice, same reasoning either way.
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
      // A user-picked color is a deliberate choice — give it a self-lit
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

/* Advanced Edit Phase 3 — applies a per-part position/rotation/scale offset
   on top of whatever build3DObject already built. Every mesh sharing a
   part tag gets re-parented into a fresh pivot Group (added at identity, so
   nothing visually moves yet); the stored offset is then applied to that
   pivot as a whole. That way a component's move/rotate/resize is relative
   to where it was already built rather than needing every part's own
   hand-authored origin hardcoded here.

   A part tag can be reused across more than one physical instance of the
   same component — both arches of a dual-arch backdrop are tagged "panel",
   and all three window arches on the storefront are tagged "window" — each
   living under its own separate wrapper group. Meshes are therefore grouped
   by (part, immediate parent) rather than by part alone, and each distinct
   instance gets its own pivot carrying the same offset, so "nudge the
   panel" moves every instance together instead of merging them into one. */
function applyPartTransforms(obj, item) {
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
      meshes.forEach(m => pivot.add(m)); // re-parenting onto an identity pivot preserves each mesh's existing local transform
      pivot.position.set(t.position?.x || 0, t.position?.y || 0, t.position?.z || 0);
      pivot.rotation.y = t.rotation || 0;
      const s = t.scale || 1;
      pivot.scale.set(s, s, s);
    });
  });
}

/* These were previously too dim for MeshStandardMaterial's physically-based
   shading model — a "white" object under ambient ~1.0-1.4 and a weak
   directional light rendered as flat mid-grey rather than actual white.
   Bumped up across the board so real whites read as white, with the tone
   mapping/exposure set on the renderer below to keep colors from blowing
   out. */
const lightingPresets = {
  Soft:    { ambient: 1.8,  dir: 1.0,  color: 0xffffff },
  Natural: { ambient: 1.6,  dir: 1.6,  color: 0xffffff },
  Bright:  { ambient: 2.1,  dir: 2.3,  color: 0xffffff },
};

const viewPresets = {
  "3D View":    { theta: 0.5,  phi: 0.4,  radius: 18 },
  "Top View":   { theta: 0,    phi: 1.55, radius: 22 },
  "Front View": { theta: 0,    phi: 0.06, radius: 14 },
  "Side View":  { theta: 1.57, phi: 0.2,  radius: 14 },
};

/* ── Event Editing Mode (first-person walkthrough) ──
   A second, independent camera system alongside the orbit camera above.
   updateCamera() always looks at a ground-level point (px, 0, pz) from a
   spherical offset — there's no way to coax that model into a free-look
   "stand here, face any direction" camera, so first-person gets its own
   state (eye position + yaw/pitch) and its own per-frame driving code in
   the render loop, entirely separate from orbitRef/updateCamera. */
const EYE_HEIGHT       = 1.65; // meters — roughly average human eye height
const FP_WALK_SPEED     = 2.2;  // m/s
const FP_RUN_SPEED      = 4.6;  // m/s, Shift held
const FP_MOUSE_SENS     = 0.0022; // radians per pixel of pointer-lock movementX/Y
const FP_PITCH_MIN      = -1.2; // ~-68°, stops short of looking straight down
const FP_PITCH_MAX      = 1.2;  // ~68°, stops short of looking straight up
const FP_FOV_DEFAULT    = 55;   // matches the PerspectiveCamera's initial fov
const FP_FOV_MIN        = 32;
const FP_FOV_MAX        = 80;
const FP_ENTER_DURATION = 900;
const FP_EXIT_DURATION  = 800;

/* Pure pose conversions — given an orbit state or a first-person state,
   compute the raw {position, quaternion} the camera would have. Used only
   to compute the start/end points of a camera transition (beginPoseTween,
   defined below in the component); neither function touches any live
   camera or ref, so they're safe to call from anywhere. */
function orbitPoseFor(o) {
  const pos = new THREE.Vector3(
    o.px + o.radius * Math.sin(o.theta) * Math.cos(o.phi),
    o.radius * Math.sin(o.phi),
    o.pz + o.radius * Math.cos(o.theta) * Math.cos(o.phi)
  );
  const m = new THREE.Matrix4().lookAt(pos, new THREE.Vector3(o.px, 0, o.pz), new THREE.Vector3(0, 1, 0));
  return { pos, quat: new THREE.Quaternion().setFromRotationMatrix(m) };
}
function fpPoseFor(fp) {
  const pos = new THREE.Vector3(fp.x, EYE_HEIGHT, fp.z);
  const quat = new THREE.Quaternion().setFromEuler(new THREE.Euler(fp.pitch, fp.yaw, 0, "YXZ"));
  return { pos, quat };
}

/* ── Capacity guidance ── */
function getCapacityForArea(area, guests) {
  if (!area || !guests) return null;
  const recommended = Math.floor(area * 0.7 / 2);
  const ratio = guests / recommended;
  if (ratio <= 1)   return { level: "good",    text: `✓ Comfortable for ${guests} guests`, rec: recommended };
  if (ratio <= 1.2) return { level: "warning",  text: `⚠ Near capacity for ${guests} guests`, rec: recommended };
  return               { level: "danger",   text: `✗ Too small for ${guests} guests`, rec: recommended };
}

/* ── Build 3D furniture ──
   `variant` (docs/customization-system-design.md §4) picks a genuinely
   different shape, not just a different color — e.g. a wedding chair is a
   different silhouette from a modern chair, not a recolored one. Types
   without variant branches just ignore the argument and always build their
   one shape (Phase 6 broadens coverage as the catalog grows). */
function build3DObject(type, variant) {
  const group = new THREE.Group();
  switch(type) {
    case "round-table": {
      if (variant === "banquet") {
        // Floor-length tablecloth skirt instead of a bare pole+base — reads
        // instantly as a banquet/event table rather than a cafe table.
        const top = new THREE.Mesh(new THREE.CylinderGeometry(0.85,0.85,0.06,32), new THREE.MeshStandardMaterial({color:0xb5654f}));
        top.position.y = 0.76;
        const skirt = new THREE.Mesh(new THREE.CylinderGeometry(0.83,0.83,0.74,32,1,true), new THREE.MeshStandardMaterial({color:0xb5654f, side:THREE.DoubleSide}));
        skirt.position.y = 0.39;
        group.add(top,skirt); break;
      }
      const top = new THREE.Mesh(new THREE.CylinderGeometry(0.7,0.7,0.06,32), new THREE.MeshStandardMaterial({color:0x8B5E3C}));
      top.position.y = 0.76;
      const pole = new THREE.Mesh(new THREE.CylinderGeometry(0.05,0.05,0.76,12), new THREE.MeshStandardMaterial({color:0x5C4033}));
      pole.position.y = 0.38;
      const base = new THREE.Mesh(new THREE.CylinderGeometry(0.3,0.3,0.04,16), new THREE.MeshStandardMaterial({color:0x5C4033}));
      base.position.y = 0.02;
      group.add(top,pole,base); break;
    }
    case "rect-table": {
      if (variant === "banquet") {
        const top = new THREE.Mesh(new THREE.BoxGeometry(1.8,0.06,0.9), new THREE.MeshStandardMaterial({color:0x5c6e8a}));
        top.position.y = 0.76;
        const skirt = new THREE.Mesh(new THREE.BoxGeometry(1.76,0.74,0.86), new THREE.MeshStandardMaterial({color:0x5c6e8a, side:THREE.DoubleSide}));
        skirt.position.y = 0.39;
        group.add(top,skirt); break;
      }
      const top = new THREE.Mesh(new THREE.BoxGeometry(1.4,0.06,0.8), new THREE.MeshStandardMaterial({color:0x8B5E3C}));
      top.position.y = 0.76;
      [[-0.6,-0.3],[0.6,-0.3],[-0.6,0.3],[0.6,0.3]].forEach(([lx,lz])=>{
        const leg = new THREE.Mesh(new THREE.BoxGeometry(0.06,0.76,0.06), new THREE.MeshStandardMaterial({color:0x5C4033}));
        leg.position.set(lx,0.38,lz); group.add(leg);
      });
      group.add(top); break;
    }
    case "chair": {
      if (variant === "wedding") {
        // Chiavari-style: round cushion, thin gold frame, oval back accent.
        const gold = 0xC9A44C, cream = 0xF7EFDD;
        const seat = new THREE.Mesh(new THREE.CylinderGeometry(0.22,0.22,0.05,24), new THREE.MeshStandardMaterial({color:cream}));
        seat.position.y = 0.46;
        const backL = new THREE.Mesh(new THREE.CylinderGeometry(0.018,0.018,0.55,8), new THREE.MeshStandardMaterial({color:gold}));
        backL.position.set(-0.19,0.73,-0.19);
        const backR = backL.clone(); backR.position.set(0.19,0.73,-0.19);
        const topBar = new THREE.Mesh(new THREE.BoxGeometry(0.42,0.035,0.035), new THREE.MeshStandardMaterial({color:gold}));
        topBar.position.set(0,1.0,-0.19);
        const accent = new THREE.Mesh(new THREE.TorusGeometry(0.12,0.015,8,20), new THREE.MeshStandardMaterial({color:gold}));
        accent.position.set(0,0.85,-0.19);
        [[-0.17,-0.17],[0.17,-0.17],[-0.17,0.17],[0.17,0.17]].forEach(([lx,lz])=>{
          const leg = new THREE.Mesh(new THREE.CylinderGeometry(0.018,0.014,0.45,10), new THREE.MeshStandardMaterial({color:gold}));
          leg.position.set(lx,0.225,lz); group.add(leg);
        });
        group.add(seat,backL,backR,topBar,accent); break;
      }
      if (variant === "banquet") {
        // Wide padded box seat/back on plain wood-block legs — sturdy
        // banquet-hall silhouette, no arms.
        const navy = 0x2c3e50, wood = 0x4a3728;
        const seat = new THREE.Mesh(new THREE.BoxGeometry(0.5,0.09,0.5), new THREE.MeshStandardMaterial({color:navy}));
        seat.position.y = 0.46;
        const back = new THREE.Mesh(new THREE.BoxGeometry(0.5,0.55,0.09), new THREE.MeshStandardMaterial({color:navy}));
        back.position.set(0,0.78,-0.205);
        [[-0.2,-0.2],[0.2,-0.2],[-0.2,0.2],[0.2,0.2]].forEach(([lx,lz])=>{
          const l = new THREE.Mesh(new THREE.BoxGeometry(0.05,0.46,0.05), new THREE.MeshStandardMaterial({color:wood}));
          l.position.set(lx,0.23,lz); group.add(l);
        });
        group.add(seat,back); break;
      }
      const seat = new THREE.Mesh(new THREE.BoxGeometry(0.45,0.05,0.45), new THREE.MeshStandardMaterial({color:0xc4b5fd}));
      seat.position.y = 0.45;
      const back = new THREE.Mesh(new THREE.BoxGeometry(0.45,0.5,0.05), new THREE.MeshStandardMaterial({color:0xc4b5fd}));
      back.position.set(0,0.72,-0.2);
      [[-0.18,-0.18],[0.18,-0.18],[-0.18,0.18],[0.18,0.18]].forEach(([lx,lz])=>{
        const l = new THREE.Mesh(new THREE.BoxGeometry(0.04,0.45,0.04), new THREE.MeshStandardMaterial({color:0x5C4033}));
        l.position.set(lx,0.225,lz); group.add(l);
      });
      group.add(seat,back); break;
    }
    case "sofa": {
      if (variant === "classic") {
        // Rolled cylindrical arms, tufted button back, turned wood feet.
        const burgundy = 0x7c2d3a, gold = 0xC9A44C, wood = 0x3d2817;
        const base = new THREE.Mesh(new THREE.BoxGeometry(1.6,0.3,0.7), new THREE.MeshStandardMaterial({color:burgundy}));
        base.position.y = 0.2;
        const back = new THREE.Mesh(new THREE.BoxGeometry(1.6,0.55,0.18), new THREE.MeshStandardMaterial({color:burgundy}));
        back.position.set(0,0.62,-0.27);
        const armL = new THREE.Mesh(new THREE.CylinderGeometry(0.16,0.16,0.7,16), new THREE.MeshStandardMaterial({color:burgundy}));
        armL.rotation.z = Math.PI/2; armL.position.set(-0.75,0.42,0);
        const armR = armL.clone(); armR.position.set(0.75,0.42,0);
        for (let i=0;i<3;i++){
          const b = new THREE.Mesh(new THREE.SphereGeometry(0.03,8,8), new THREE.MeshStandardMaterial({color:gold}));
          b.position.set(-0.5+i*0.5,0.62,-0.19); group.add(b);
        }
        [[-0.68,-0.3],[0.68,-0.3],[-0.68,0.3],[0.68,0.3]].forEach(([lx,lz])=>{
          const foot = new THREE.Mesh(new THREE.CylinderGeometry(0.03,0.05,0.18,10), new THREE.MeshStandardMaterial({color:wood}));
          foot.position.set(lx,0.09,lz); group.add(foot);
        });
        group.add(base,back,armL,armR); break;
      }
      const base = new THREE.Mesh(new THREE.BoxGeometry(1.6,0.3,0.7), new THREE.MeshStandardMaterial({color:0x7c3aed}));
      base.position.y = 0.15;
      const back = new THREE.Mesh(new THREE.BoxGeometry(1.6,0.5,0.15), new THREE.MeshStandardMaterial({color:0x6d28d9}));
      back.position.set(0,0.55,-0.27);
      const armL = new THREE.Mesh(new THREE.BoxGeometry(0.15,0.4,0.7), new THREE.MeshStandardMaterial({color:0x6d28d9}));
      armL.position.set(-0.72,0.35,0);
      const armR = armL.clone(); armR.position.set(0.72,0.35,0);
      const c1 = new THREE.Mesh(new THREE.BoxGeometry(0.6,0.15,0.55), new THREE.MeshStandardMaterial({color:0xa78bfa}));
      c1.position.set(-0.38,0.37,0.05);
      const c2 = c1.clone(); c2.position.set(0.38,0.37,0.05);
      group.add(base,back,armL,armR,c1,c2); break;
    }
    case "buffet-table": {
      const t = new THREE.Mesh(new THREE.BoxGeometry(2.0,0.06,0.7), new THREE.MeshStandardMaterial({color:0xd97706}));
      t.position.y = 0.9;
      [[-0.85,-0.28],[0.85,-0.28],[-0.85,0.28],[0.85,0.28]].forEach(([lx,lz])=>{
        const leg = new THREE.Mesh(new THREE.BoxGeometry(0.05,0.9,0.05), new THREE.MeshStandardMaterial({color:0x92400e}));
        leg.position.set(lx,0.45,lz); group.add(leg);
      });
      [[-0.6,0],[0,0],[0.6,0]].forEach(([dx])=>{
        const d = new THREE.Mesh(new THREE.CylinderGeometry(0.15,0.15,0.06,16), new THREE.MeshStandardMaterial({color:0x4a7c6f}));
        d.position.set(dx,0.96,0); group.add(d);
      });
      group.add(t); break;
    }
    case "cake-table": {
      const t = new THREE.Mesh(new THREE.CylinderGeometry(0.55,0.55,0.06,32), new THREE.MeshStandardMaterial({color:0xfde68a}));
      t.position.y = 0.8;
      const po = new THREE.Mesh(new THREE.CylinderGeometry(0.04,0.04,0.8,12), new THREE.MeshStandardMaterial({color:0xd97706}));
      po.position.y = 0.4;
      const l1 = new THREE.Mesh(new THREE.CylinderGeometry(0.3,0.3,0.2,24), new THREE.MeshStandardMaterial({color:0xfbbf24}));
      l1.position.y = 0.96;
      const l2 = new THREE.Mesh(new THREE.CylinderGeometry(0.2,0.2,0.18,24), new THREE.MeshStandardMaterial({color:0xf9a8d4}));
      l2.position.y = 1.17;
      const l3 = new THREE.Mesh(new THREE.CylinderGeometry(0.1,0.1,0.15,24), new THREE.MeshStandardMaterial({color:0xfde68a}));
      l3.position.y = 1.345;
      group.add(t,po,l1,l2,l3); break;
    }
    case "coffee-corner": {
      const c = new THREE.Mesh(new THREE.BoxGeometry(1.2,0.9,0.6), new THREE.MeshStandardMaterial({color:0x78350f}));
      c.position.y = 0.45;
      const tp = new THREE.Mesh(new THREE.BoxGeometry(1.3,0.05,0.7), new THREE.MeshStandardMaterial({color:0x92400e}));
      tp.position.y = 0.92;
      const mc = new THREE.Mesh(new THREE.BoxGeometry(0.3,0.4,0.25), new THREE.MeshStandardMaterial({color:0x1c1c1c}));
      mc.position.set(-0.3,1.12,0.1);
      const cup1 = new THREE.Mesh(new THREE.CylinderGeometry(0.04,0.035,0.1,12), new THREE.MeshStandardMaterial({color:0xc2703f}));
      cup1.position.set(0.2,0.97,0.1);
      const cup2 = cup1.clone(); cup2.position.set(0.35,0.97,0.1);
      group.add(c,tp,mc,cup1,cup2); break;
    }
    case "flower-wall": {
      const wall=new THREE.Mesh(new THREE.BoxGeometry(2.0,2.0,0.15),new THREE.MeshStandardMaterial({color:0xfce7f3}));
      wall.position.y=1.0;
      const fc=[0xfbbf24,0xec4899,0xf9a8d4,0xfde68a,0xff6b6b];
      for(let r=0;r<4;r++) for(let c=0;c<5;c++){
        const f=new THREE.Mesh(new THREE.SphereGeometry(0.16,8,8),new THREE.MeshStandardMaterial({color:fc[(r+c)%fc.length]}));
        f.position.set(-0.75+c*0.38,0.25+r*0.48,0.1); group.add(f);
      }
      group.add(wall); break;
    }
    case "plant": {
      const pot=new THREE.Mesh(new THREE.CylinderGeometry(0.18,0.14,0.3,16),new THREE.MeshStandardMaterial({color:0xd97706}));
      pot.position.y=0.15;
      const soil=new THREE.Mesh(new THREE.CylinderGeometry(0.17,0.17,0.05,16),new THREE.MeshStandardMaterial({color:0x3d2b1f}));
      soil.position.y=0.3;
      const trunk=new THREE.Mesh(new THREE.CylinderGeometry(0.03,0.04,0.6,8),new THREE.MeshStandardMaterial({color:0x5C4033}));
      trunk.position.y=0.65;
      const f1=new THREE.Mesh(new THREE.SphereGeometry(0.35,12,12),new THREE.MeshStandardMaterial({color:0x16a34a}));
      f1.position.y=1.1;
      const f2=new THREE.Mesh(new THREE.SphereGeometry(0.25,12,12),new THREE.MeshStandardMaterial({color:0x15803d}));
      f2.position.set(0.2,1.2,0.1);
      const f3=f2.clone(); f3.position.set(-0.2,1.15,-0.1);
      group.add(pot,soil,trunk,f1,f2,f3); break;
    }
    case "led-wall": {
      const bk=new THREE.Mesh(new THREE.BoxGeometry(2.5,1.5,0.08),new THREE.MeshStandardMaterial({color:0x0f172a}));
      bk.position.y=1.5;
      const sc=new THREE.Mesh(new THREE.BoxGeometry(2.4,1.4,0.04),new THREE.MeshStandardMaterial({color:0x0ea5e9,emissive:new THREE.Color(0x0ea5e9),emissiveIntensity:0.3}));
      sc.position.set(0,1.5,0.06);
      sc.userData.keepEmissive = true;
      const s1=new THREE.Mesh(new THREE.BoxGeometry(0.06,0.76,0.06),new THREE.MeshStandardMaterial({color:0x374151}));
      s1.position.set(-0.8,0.38,0);
      const s2=s1.clone(); s2.position.set(0.8,0.38,0);
      group.add(bk,sc,s1,s2); break;
    }
    case "spotlight": {
      const po=new THREE.Mesh(new THREE.CylinderGeometry(0.03,0.03,2.5,8),new THREE.MeshStandardMaterial({color:0x374151}));
      po.position.y=1.25;
      const hd=new THREE.Mesh(new THREE.CylinderGeometry(0.12,0.08,0.2,16),new THREE.MeshStandardMaterial({color:0x1f2937}));
      hd.position.y=2.55; hd.rotation.x=0.4;
      const ln=new THREE.Mesh(new THREE.CylinderGeometry(0.08,0.08,0.04,16),new THREE.MeshStandardMaterial({color:0xfbbf24,emissive:new THREE.Color(0xfbbf24),emissiveIntensity:0.5}));
      ln.position.y=2.65; ln.rotation.x=0.4;
      ln.userData.keepEmissive = true;
      const ba=new THREE.Mesh(new THREE.CylinderGeometry(0.15,0.18,0.06,16),new THREE.MeshStandardMaterial({color:0x374151}));
      ba.position.y=0.03;
      group.add(po,hd,ln,ba); break;
    }
    case "bench": {
      const seat = new THREE.Mesh(new THREE.BoxGeometry(1.6,0.08,0.4), new THREE.MeshStandardMaterial({color:0x8B5E3C}));
      seat.position.y = 0.45;
      const legL = new THREE.Mesh(new THREE.BoxGeometry(0.4,0.45,0.35), new THREE.MeshStandardMaterial({color:0x5C4033}));
      legL.position.set(-0.65,0.225,0);
      const legR = legL.clone(); legR.position.set(0.65,0.225,0);
      group.add(seat,legL,legR); break;
    }
    case "drinks-station": {
      const cart = new THREE.Mesh(new THREE.BoxGeometry(1.0,0.9,0.5), new THREE.MeshStandardMaterial({color:0x1e1b4b}));
      cart.position.y = 0.45;
      const counter = new THREE.Mesh(new THREE.BoxGeometry(1.05,0.06,0.55), new THREE.MeshStandardMaterial({color:0x9c6b3f}));
      counter.position.y = 0.93;
      const bottleColors = [0x0ea5e9,0x10b981,0xef4444];
      bottleColors.forEach((c,i) => {
        const bottle = new THREE.Mesh(new THREE.CylinderGeometry(0.035,0.035,0.28,10), new THREE.MeshStandardMaterial({color:c}));
        bottle.position.set(-0.3+i*0.3, 1.1, 0);
        group.add(bottle);
      });
      group.add(cart,counter); break;
    }
    case "ceiling-light": {
      const cord = new THREE.Mesh(new THREE.CylinderGeometry(0.015,0.015,2.6,6), new THREE.MeshStandardMaterial({color:0x374151}));
      cord.position.y = 1.3;
      const shade = new THREE.Mesh(new THREE.CylinderGeometry(0.05,0.22,0.22,16,1,true), new THREE.MeshStandardMaterial({color:0xfbbf24, side:THREE.DoubleSide}));
      shade.position.y = 2.55;
      const bulb = new THREE.Mesh(new THREE.SphereGeometry(0.07,10,10), new THREE.MeshStandardMaterial({color:0xfff2c8, emissive:new THREE.Color(0xfff2c8), emissiveIntensity:0.6}));
      bulb.position.y = 2.5;
      bulb.userData.keepEmissive = true;
      group.add(cord,shade,bulb); break;
    }
    case "chandelier": {
      const chain = new THREE.Mesh(new THREE.CylinderGeometry(0.012,0.012,2.4,6), new THREE.MeshStandardMaterial({color:0x374151}));
      chain.position.y = 1.2;
      const ring = new THREE.Mesh(new THREE.TorusGeometry(0.35,0.03,8,24), new THREE.MeshStandardMaterial({color:0xC9A44C, metalness:0.7, roughness:0.3}));
      ring.rotation.x = Math.PI/2; ring.position.y = 2.5;
      group.add(chain,ring);
      for (let i=0;i<6;i++) {
        const angle = (i/6)*Math.PI*2;
        const bx = Math.cos(angle)*0.35, bz = Math.sin(angle)*0.35;
        const arm = new THREE.Mesh(new THREE.CylinderGeometry(0.01,0.01,0.35,6), new THREE.MeshStandardMaterial({color:0xC9A44C}));
        arm.position.set(bx*0.5, 2.5, bz*0.5);
        arm.rotation.z = Math.PI/2; arm.rotation.y = -angle;
        const bulb = new THREE.Mesh(new THREE.SphereGeometry(0.05,10,10), new THREE.MeshStandardMaterial({color:0xfff2c8, emissive:new THREE.Color(0xfff2c8), emissiveIntensity:0.6}));
        bulb.position.set(bx,2.58,bz);
        bulb.userData.keepEmissive = true;
        group.add(arm,bulb);
      }
      break;
    }
    case "led-bar": {
      const standL = new THREE.Mesh(new THREE.CylinderGeometry(0.03,0.03,1.8,8), new THREE.MeshStandardMaterial({color:0x1f2937}));
      standL.position.set(-0.75,0.9,0);
      const standR = standL.clone(); standR.position.set(0.75,0.9,0);
      const bar = new THREE.Mesh(new THREE.BoxGeometry(1.6,0.1,0.1), new THREE.MeshStandardMaterial({color:0x0f172a}));
      bar.position.y = 1.85;
      const strip = new THREE.Mesh(new THREE.BoxGeometry(1.5,0.04,0.04), new THREE.MeshStandardMaterial({color:0xec4899, emissive:new THREE.Color(0xec4899), emissiveIntensity:0.5}));
      strip.position.set(0,1.85,0.06);
      strip.userData.keepEmissive = true;
      group.add(standL,standR,bar,strip); break;
    }
    case "fairy-lights": {
      const poleL = new THREE.Mesh(new THREE.CylinderGeometry(0.025,0.025,2.2,8), new THREE.MeshStandardMaterial({color:0x374151}));
      poleL.position.set(-1.1,1.1,0);
      const poleR = poleL.clone(); poleR.position.set(1.1,1.1,0);
      group.add(poleL,poleR);
      for (let i=0;i<=8;i++) {
        const t = i/8;
        const x = -1.1 + 2.2*t;
        const sag = 0.35 * 4 * t * (1-t);
        const bulb = new THREE.Mesh(new THREE.SphereGeometry(0.025,8,8), new THREE.MeshStandardMaterial({color:0xfff2c8, emissive:new THREE.Color(0xfff2c8), emissiveIntensity:0.6}));
        bulb.position.set(x, 2.15-sag, 0);
        bulb.userData.keepEmissive = true;
        group.add(bulb);
      }
      break;
    }
    case "coffee-booth": {
      // ~1.0m tall counter, top surface around y=1.0-1.03 across every
      // variant so Phase 4's equipment sits at a consistent height
      // regardless of which booth style it's placed on.
      if (variant === "luxury-marble") {
        const marble = 0xc9a8b0, marbleTop = 0xa8788a, gold = 0xC9A44C;
        const base = new THREE.Mesh(new THREE.BoxGeometry(1.6,1.0,0.6), new THREE.MeshStandardMaterial({color:marble}));
        base.position.y = 0.5;
        const top = new THREE.Mesh(new THREE.BoxGeometry(1.7,0.06,0.65), new THREE.MeshStandardMaterial({color:marbleTop}));
        top.position.y = 1.03;
        const trimTop = new THREE.Mesh(new THREE.BoxGeometry(1.62,0.02,0.02), new THREE.MeshStandardMaterial({color:gold, metalness:0.8, roughness:0.25}));
        trimTop.position.set(0, 0.98, 0.31);
        trimTop.userData.keepOwnMaterial = true;
        const trimBottom = trimTop.clone(); trimBottom.position.set(0, 0.02, 0.31);
        [-0.79, 0.79].forEach(lx => {
          const post = new THREE.Mesh(new THREE.BoxGeometry(0.02,0.96,0.02), new THREE.MeshStandardMaterial({color:gold, metalness:0.8, roughness:0.25}));
          post.position.set(lx, 0.5, 0.31);
          post.userData.keepOwnMaterial = true;
          group.add(post);
        });
        group.add(base, top, trimTop, trimBottom); break;
      }
      if (variant === "wooden-rustic") {
        const woodA = 0x8a5a2f, woodB = 0x74471f;
        for (let i = 0; i < 8; i++) {
          const plank = new THREE.Mesh(new THREE.BoxGeometry(0.2,1.0,0.06), new THREE.MeshStandardMaterial({color: i%2===0 ? woodA : woodB}));
          plank.position.set(-0.7 + i*0.2, 0.5, 0.27);
          group.add(plank);
        }
        const sideL = new THREE.Mesh(new THREE.BoxGeometry(0.06,1.0,0.6), new THREE.MeshStandardMaterial({color:woodB}));
        sideL.position.set(-0.8, 0.5, 0);
        const sideR = sideL.clone(); sideR.position.set(0.8, 0.5, 0);
        const top = new THREE.Mesh(new THREE.BoxGeometry(1.72,0.07,0.62), new THREE.MeshStandardMaterial({color:0x9c6b3d}));
        top.position.y = 1.035;
        group.add(sideL, sideR, top); break;
      }
      if (variant === "contemporary-curved") {
        const white = 0x5c8aa6;
        const mid = new THREE.Mesh(new THREE.BoxGeometry(1.0,1.0,0.6), new THREE.MeshStandardMaterial({color:white}));
        mid.position.y = 0.5;
        const capL = new THREE.Mesh(new THREE.CylinderGeometry(0.3,0.3,1.0,24), new THREE.MeshStandardMaterial({color:white}));
        capL.rotation.x = Math.PI/2; capL.position.set(-0.5, 0.5, 0);
        const capR = capL.clone(); capR.position.set(0.5, 0.5, 0);
        const topSlab = new THREE.Mesh(new THREE.BoxGeometry(1.72,0.05,0.64), new THREE.MeshStandardMaterial({color:0x3f6b81}));
        topSlab.position.y = 1.025;
        group.add(mid, capL, capR, topSlab); break;
      }
      if (variant === "outdoor-cart") {
        const wood = 0x8a5a2f, dark = 0x2c2c2c, gold = 0xC9A44C;
        const body = new THREE.Mesh(new THREE.BoxGeometry(1.3,0.75,0.55), new THREE.MeshStandardMaterial({color:wood}));
        body.position.y = 0.55;
        const top = new THREE.Mesh(new THREE.BoxGeometry(1.4,0.06,0.6), new THREE.MeshStandardMaterial({color:0x6f4423}));
        top.position.y = 0.95;
        [-0.55, 0.55].forEach(lx => {
          const wheel = new THREE.Mesh(new THREE.CylinderGeometry(0.22,0.22,0.06,20), new THREE.MeshStandardMaterial({color:dark}));
          wheel.rotation.z = Math.PI/2; wheel.position.set(lx, 0.22, 0.32);
          const hub = new THREE.Mesh(new THREE.CylinderGeometry(0.05,0.05,0.08,10), new THREE.MeshStandardMaterial({color:gold}));
          hub.rotation.z = Math.PI/2; hub.position.set(lx, 0.22, 0.32);
          group.add(wheel, hub);
        });
        const handle = new THREE.Mesh(new THREE.CylinderGeometry(0.02,0.02,0.5,8), new THREE.MeshStandardMaterial({color:dark}));
        handle.rotation.x = 0.3; handle.position.set(0, 0.9, -0.35);
        group.add(body, top, handle); break;
      }
      if (variant === "modern-black") {
        const black = 0x1a1a1a, accent = 0xC9A44C;
        const base = new THREE.Mesh(new THREE.BoxGeometry(1.6,1.0,0.6), new THREE.MeshStandardMaterial({color:black, roughness:0.4}));
        base.position.y = 0.5;
        const top = new THREE.Mesh(new THREE.BoxGeometry(1.7,0.05,0.65), new THREE.MeshStandardMaterial({color:0x0d0d0d}));
        top.position.y = 1.025;
        const line = new THREE.Mesh(new THREE.BoxGeometry(1.6,0.015,0.02), new THREE.MeshStandardMaterial({color:accent}));
        line.position.set(0, 0.5, 0.31);
        group.add(base, top, line); break;
      }
      // modern-minimal (default)
      const white = 0xb08968, grey = 0xe5e5e5;
      const base = new THREE.Mesh(new THREE.BoxGeometry(1.6,1.0,0.6), new THREE.MeshStandardMaterial({color:white}));
      base.position.y = 0.5;
      const top = new THREE.Mesh(new THREE.BoxGeometry(1.7,0.05,0.65), new THREE.MeshStandardMaterial({color:white}));
      top.position.y = 1.025;
      const kick = new THREE.Mesh(new THREE.BoxGeometry(1.5,0.08,0.5), new THREE.MeshStandardMaterial({color:grey}));
      kick.position.y = 0.04;
      group.add(base, top, kick); break;
    }
    /* ── Coffee Corner accessories & decorations (docs/coffee-corner-design.md §6) ──
       Station-scale — sized to sit on a booth counter or right beside one,
       not the room-scale equivalents from the earlier general catalog. */
    case "mini-plant": {
      const pot = new THREE.Mesh(new THREE.CylinderGeometry(0.09,0.07,0.14,14), new THREE.MeshStandardMaterial({color:0xd97706}));
      pot.position.y = 0.07;
      const trunk = new THREE.Mesh(new THREE.CylinderGeometry(0.015,0.02,0.22,8), new THREE.MeshStandardMaterial({color:0x5C4033}));
      trunk.position.y = 0.25;
      const foliage = new THREE.Mesh(new THREE.SphereGeometry(0.14,10,10), new THREE.MeshStandardMaterial({color:0x16a34a}));
      foliage.position.y = 0.42;
      group.add(pot, trunk, foliage); break;
    }
    case "flower-arrangement": {
      const vase = new THREE.Mesh(new THREE.CylinderGeometry(0.05,0.04,0.14,12), new THREE.MeshStandardMaterial({color:0x457b9d}));
      vase.position.y = 0.07;
      const fc = [0xfbbf24, 0xec4899, 0xf9a8d4, 0x7c3aed];
      fc.forEach((c,i) => {
        const angle = (i/fc.length) * Math.PI * 2;
        const f = new THREE.Mesh(new THREE.SphereGeometry(0.045,8,8), new THREE.MeshStandardMaterial({color:c}));
        f.position.set(Math.cos(angle)*0.04, 0.17, Math.sin(angle)*0.04); group.add(f);
      });
      group.add(vase); break;
    }
    /* ── Event stations (docs/coffee-corner-design.md follow-up — reference
       market-stall sheet). Every named sub-mesh is tagged with
       userData.part so each piece can be recolored independently
       (see PART_LABELS / applyItemMaterial). */
    case "umbrella-cart": {
      const white = 0xc2703f;
      const pole = new THREE.Mesh(new THREE.CylinderGeometry(0.025,0.025,2.0,10), new THREE.MeshStandardMaterial({color:white}));
      pole.position.y = 1.9; pole.userData.part = "pole";
      const canopy = new THREE.Mesh(new THREE.ConeGeometry(0.9,0.35,16), new THREE.MeshStandardMaterial({color:white, side:THREE.DoubleSide}));
      canopy.position.y = 2.75; canopy.userData.part = "canopy";
      const fringe = new THREE.Mesh(new THREE.TorusGeometry(0.86,0.05,8,24), new THREE.MeshStandardMaterial({color:white}));
      fringe.rotation.x = Math.PI/2; fringe.position.y = 2.58; fringe.userData.part = "canopy";
      const counter = new THREE.Mesh(new THREE.BoxGeometry(1.4,1.0,0.55), new THREE.MeshStandardMaterial({color:white}));
      counter.position.y = 0.5; counter.userData.part = "counter";
      const shelf = new THREE.Mesh(new THREE.BoxGeometry(0.5,0.02,0.3), new THREE.MeshStandardMaterial({color:white}));
      shelf.position.set(-0.4, 1.02, -0.05); shelf.userData.part = "shelf";
      const railL = new THREE.Mesh(new THREE.CylinderGeometry(0.01,0.01,0.15,6), new THREE.MeshStandardMaterial({color:white}));
      railL.position.set(-0.6, 1.1, -0.15); railL.userData.part = "shelf";
      const railR = railL.clone(); railR.position.set(-0.2, 1.1, -0.15);
      group.add(pole, canopy, fringe, counter, shelf, railL, railR); break;
    }
    case "kiosk-booth": {
      const white = 0x6b8f71, cream = 0xf7f3ea;
      const body = new THREE.Mesh(new THREE.BoxGeometry(1.0,1.8,0.7), new THREE.MeshStandardMaterial({color:white}));
      body.position.y = 0.9; body.userData.part = "body";
      const roof = new THREE.Mesh(new THREE.ConeGeometry(0.85,0.5,4), new THREE.MeshStandardMaterial({color:white}));
      roof.position.y = 2.05; roof.rotation.y = Math.PI/4; roof.scale.set(1,0.7,1.4); roof.userData.part = "roof";
      const win = new THREE.Mesh(new THREE.BoxGeometry(0.7,0.9,0.05), new THREE.MeshStandardMaterial({color:0xeeeeee}));
      win.position.set(0, 1.0, 0.36); win.userData.part = "body";
      const curtainL = new THREE.Mesh(new THREE.BoxGeometry(0.15,0.9,0.04), new THREE.MeshStandardMaterial({color:cream}));
      curtainL.position.set(-0.25, 1.0, 0.4); curtainL.userData.part = "curtain";
      const curtainR = curtainL.clone(); curtainR.position.set(0.25, 1.0, 0.4);
      const sill = new THREE.Mesh(new THREE.BoxGeometry(0.8,0.05,0.1), new THREE.MeshStandardMaterial({color:white}));
      sill.position.set(0, 0.55, 0.38); sill.userData.part = "body";
      const trim = new THREE.Mesh(new THREE.TorusGeometry(0.08,0.015,6,12), new THREE.MeshStandardMaterial({color:cream}));
      trim.position.set(0, 1.85, 0.35); trim.userData.part = "trim";
      group.add(body, roof, win, curtainL, curtainR, sill, trim); break;
    }
    case "umbrella-table": {
      const white = 0x5c8aa6;
      const pole = new THREE.Mesh(new THREE.CylinderGeometry(0.02,0.02,1.6,10), new THREE.MeshStandardMaterial({color:white}));
      pole.position.y = 1.5; pole.userData.part = "pole";
      const canopy = new THREE.Mesh(new THREE.ConeGeometry(0.8,0.3,20), new THREE.MeshStandardMaterial({color:white, side:THREE.DoubleSide}));
      canopy.position.y = 2.15; canopy.userData.part = "canopy";
      const fringe = new THREE.Mesh(new THREE.TorusGeometry(0.77,0.04,8,24), new THREE.MeshStandardMaterial({color:white}));
      fringe.rotation.x = Math.PI/2; fringe.position.y = 2.0; fringe.userData.part = "canopy";
      const table = new THREE.Mesh(new THREE.CylinderGeometry(0.7,0.7,0.7,24), new THREE.MeshStandardMaterial({color:white}));
      table.position.y = 0.35; table.userData.part = "table";
      const legA = new THREE.Mesh(new THREE.CylinderGeometry(0.03,0.03,0.15,10), new THREE.MeshStandardMaterial({color:white}));
      legA.position.set(0.55, 0.075, 0); legA.userData.part = "table";
      const legB = legA.clone(); legB.position.set(-0.55, 0.075, 0);
      group.add(pole, canopy, fringe, table, legA, legB); break;
    }
    case "display-pedestals": {
      const white = 0x6b4e8c;
      const pA = new THREE.Mesh(new THREE.CylinderGeometry(0.22,0.24,1.1,20), new THREE.MeshStandardMaterial({color:white}));
      pA.position.set(-0.5, 0.55, 0); pA.userData.part = "pedestalA";
      const pB = new THREE.Mesh(new THREE.BoxGeometry(0.55,0.85,0.35), new THREE.MeshStandardMaterial({color:white}));
      pB.position.set(0.15, 0.425, 0); pB.userData.part = "pedestalB";
      const pC = new THREE.Mesh(new THREE.CylinderGeometry(0.18,0.2,0.65,20), new THREE.MeshStandardMaterial({color:white}));
      pC.position.set(0.85, 0.325, 0); pC.userData.part = "pedestalC";
      group.add(pA, pB, pC); break;
    }
    case "mini-umbrella-cart": {
      const white = 0xc2604f;
      const pole = new THREE.Mesh(new THREE.CylinderGeometry(0.02,0.02,1.7,10), new THREE.MeshStandardMaterial({color:white}));
      pole.position.y = 1.6; pole.userData.part = "pole";
      const canopy = new THREE.Mesh(new THREE.ConeGeometry(0.65,0.28,16), new THREE.MeshStandardMaterial({color:white, side:THREE.DoubleSide}));
      canopy.position.y = 2.3; canopy.userData.part = "canopy";
      const fringe = new THREE.Mesh(new THREE.TorusGeometry(0.62,0.035,8,20), new THREE.MeshStandardMaterial({color:white}));
      fringe.rotation.x = Math.PI/2; fringe.position.y = 2.16; fringe.userData.part = "canopy";
      const counter = new THREE.Mesh(new THREE.BoxGeometry(1.0,0.8,0.5), new THREE.MeshStandardMaterial({color:white}));
      counter.position.y = 0.4; counter.userData.part = "counter";
      group.add(pole, canopy, fringe, counter); break;
    }
    case "umbrella-cart-wheeled": {
      const white = 0x7c8471, dark = 0x2c2c2c;
      const pole = new THREE.Mesh(new THREE.CylinderGeometry(0.02,0.02,1.7,10), new THREE.MeshStandardMaterial({color:white}));
      pole.position.y = 1.6; pole.userData.part = "pole";
      const canopy = new THREE.Mesh(new THREE.ConeGeometry(0.65,0.28,16), new THREE.MeshStandardMaterial({color:white, side:THREE.DoubleSide}));
      canopy.position.y = 2.3; canopy.userData.part = "canopy";
      const fringe = new THREE.Mesh(new THREE.TorusGeometry(0.62,0.035,8,20), new THREE.MeshStandardMaterial({color:white}));
      fringe.rotation.x = Math.PI/2; fringe.position.y = 2.16; fringe.userData.part = "canopy";
      const counter = new THREE.Mesh(new THREE.BoxGeometry(1.0,0.8,0.5), new THREE.MeshStandardMaterial({color:white}));
      counter.position.set(-0.1, 0.4, 0); counter.userData.part = "counter";
      const cooler = new THREE.Mesh(new THREE.BoxGeometry(0.35,0.5,0.45), new THREE.MeshStandardMaterial({color:white}));
      cooler.position.set(0.55, 0.25, 0); cooler.userData.part = "cooler";
      const wheel = new THREE.Mesh(new THREE.CylinderGeometry(0.18,0.18,0.05,20), new THREE.MeshStandardMaterial({color:dark}));
      wheel.rotation.z = Math.PI/2; wheel.position.set(0.55, 0.18, 0.26); wheel.userData.part = "wheel";
      group.add(pole, canopy, fringe, counter, cooler, wheel); break;
    }
    case "curtain-photo-booth": {
      const white = 0xb5647a, cream = 0xf7f3ea;
      const shell = new THREE.Mesh(new THREE.CylinderGeometry(0.75,0.8,2.0,24,1,true), new THREE.MeshStandardMaterial({color:white, side:THREE.DoubleSide}));
      shell.position.y = 1.0; shell.userData.part = "shell";
      const sign = new THREE.Mesh(new THREE.BoxGeometry(0.6,0.3,0.08), new THREE.MeshStandardMaterial({color:white}));
      sign.position.y = 2.15; sign.userData.part = "sign";
      const curtainL = new THREE.Mesh(new THREE.BoxGeometry(0.32,1.85,0.05), new THREE.MeshStandardMaterial({color:cream}));
      curtainL.position.set(-0.2, 1.0, 0.72); curtainL.userData.part = "curtain";
      const curtainR = curtainL.clone(); curtainR.position.set(0.2, 1.0, 0.72);
      group.add(shell, sign, curtainL, curtainR); break;
    }
    case "backdrop-wall": {
      const white = 0x4f6b8a;
      [-0.9, 0, 0.9].forEach((px, i) => {
        const panel = new THREE.Mesh(new THREE.BoxGeometry(0.85,2.2,0.08), new THREE.MeshStandardMaterial({color:white}));
        panel.position.set(px, 1.1, 0); panel.userData.part = "panel";
        group.add(panel);
        if (i !== 1) {
          const hole = new THREE.Mesh(new THREE.TorusGeometry(0.22,0.04,10,24), new THREE.MeshStandardMaterial({color:white}));
          hole.position.set(px, 1.3, 0.05); hole.userData.part = "panel";
          group.add(hole);
          const lamp = new THREE.Mesh(new THREE.ConeGeometry(0.08,0.1,10,1,true), new THREE.MeshStandardMaterial({color:white, side:THREE.DoubleSide}));
          lamp.position.set(px, 1.95, 0.1); lamp.rotation.x = Math.PI; lamp.userData.part = "lamp";
          group.add(lamp);
          const planter = new THREE.Mesh(new THREE.BoxGeometry(0.4,0.25,0.25), new THREE.MeshStandardMaterial({color:white}));
          planter.position.set(px, 0.125, 0.15); planter.userData.part = "planter";
          group.add(planter);
        }
      });
      break;
    }
    /* ── Wedding/reception backdrop & booth set (reference sheet #2) —
       arches all reuse buildArchPanel; a few keep the same silhouette
       and lean on the branding panel (see BRANDABLE_TYPES) instead of
       hard-coding text. */
    case "floral-arch-backdrop": {
      const white = 0x8a9b7a, pink = 0xf7d9e3;
      const archL = buildArchPanel(0.9, 2.3, 0.06, white, "panel"); archL.position.set(-0.5, 0, 0);
      const archR = buildArchPanel(0.85, 2.15, 0.06, white, "panel"); archR.position.set(0.45, 0, -0.03);
      group.add(archL, archR);
      [[-0.75,2.15,0.05],[-0.6,2.3,0.08],[-0.85,1.95,0.03],[-0.55,2.05,0.1],[-0.7,1.8,0.05]].forEach(([x,y,z],i) => {
        const bloom = new THREE.Mesh(new THREE.SphereGeometry(0.11,10,10), new THREE.MeshStandardMaterial({color: i%2 ? pink : white}));
        bloom.position.set(x,y,z); bloom.userData.part = "flowers";
        group.add(bloom);
      });
      const pedH = [0.9,0.65,0.5];
      [-0.75,-0.45,-0.15].forEach((x,i) => {
        const ped = new THREE.Mesh(new THREE.CylinderGeometry(0.12,0.13,pedH[i],16), new THREE.MeshStandardMaterial({color:white}));
        ped.position.set(x, pedH[i]/2, 0.4); ped.userData.part = "pedestal";
        group.add(ped);
      });
      break;
    }
    case "drape-arch-backdrop": {
      const white = 0x5c6e8a, cream = 0xf7f3ea, flame = 0xfff2c8;
      group.add(buildArchPanel(1.6, 2.2, 0.06, white, "panel"));
      const drape = new THREE.Mesh(new THREE.PlaneGeometry(0.5,1.9,1,12), new THREE.MeshStandardMaterial({color:cream, side:THREE.DoubleSide}));
      drape.position.set(-0.15,1.05,0.05); drape.userData.part = "drape";
      group.add(drape);
      [-0.85, 0.85].forEach((x) => {
        const stand = new THREE.Mesh(new THREE.CylinderGeometry(0.02,0.02,1.0,8), new THREE.MeshStandardMaterial({color:white}));
        stand.position.set(x,0.5,0.3); stand.userData.part = "candle";
        const flameMesh = new THREE.Mesh(new THREE.ConeGeometry(0.05,0.12,8), new THREE.MeshStandardMaterial({color:flame, emissive:new THREE.Color(flame), emissiveIntensity:0.6}));
        flameMesh.position.set(x,1.05,0.3); flameMesh.userData.keepEmissive = true;
        group.add(stand, flameMesh);
      });
      [-0.55, 0.55].forEach((x) => {
        const urnStand = new THREE.Mesh(new THREE.CylinderGeometry(0.15,0.18,0.75,16), new THREE.MeshStandardMaterial({color:white}));
        urnStand.position.set(x,0.375,0.35); urnStand.userData.part = "urn";
        const vase = new THREE.Mesh(new THREE.CylinderGeometry(0.12,0.08,0.35,12), new THREE.MeshStandardMaterial({color:white}));
        vase.position.set(x,0.925,0.35); vase.userData.part = "urn";
        const bloomA = new THREE.Mesh(new THREE.SphereGeometry(0.13,10,10), new THREE.MeshStandardMaterial({color:white}));
        bloomA.position.set(x-0.05,1.15,0.35); bloomA.userData.part = "urn";
        const bloomB = bloomA.clone(); bloomB.position.set(x+0.05,1.2,0.35);
        group.add(urnStand, vase, bloomA, bloomB);
      });
      break;
    }
    case "balloon-arch-bow": {
      const white = 0xef476f;
      for (let i=0;i<16;i++) {
        const t = i/15, angle = Math.PI*(1-t);
        const x = Math.cos(angle)*0.45 - 0.1, y = Math.sin(angle)*1.45 + 0.3;
        const size = 0.12 + (i%3)*0.03;
        const b = new THREE.Mesh(new THREE.SphereGeometry(size,10,10), new THREE.MeshStandardMaterial({color:white}));
        b.position.set(x, y, (i%2)*0.06-0.03); b.userData.part = "balloons";
        group.add(b);
      }
      const bowL = new THREE.Mesh(new THREE.ConeGeometry(0.18,0.12,3), new THREE.MeshStandardMaterial({color:white}));
      bowL.rotation.z = Math.PI/2; bowL.position.set(-0.55,1.55,0.1); bowL.userData.part = "bow";
      const bowR = bowL.clone(); bowR.rotation.z = -Math.PI/2; bowR.position.set(-0.35,1.55,0.1);
      const bowKnot = new THREE.Mesh(new THREE.SphereGeometry(0.07,10,10), new THREE.MeshStandardMaterial({color:white}));
      bowKnot.position.set(-0.45,1.55,0.1); bowKnot.userData.part = "bow";
      group.add(bowL, bowR, bowKnot);
      break;
    }
    case "name-arch-backdrop": {
      const white = 0xc9a44c, pink = 0xf7d9e3;
      const archL = buildArchPanel(0.95, 2.3, 0.06, white, "panel"); archL.position.set(-0.5, 0, 0);
      const archR = buildArchPanel(0.95, 2.3, 0.06, white, "panel"); archR.position.set(0.5, 0, 0);
      group.add(archL, archR);
      [[-0.85,2.2,0.05],[-0.65,2.35,0.08],[-0.95,2.0,0.03],[0.85,2.2,0.05],[0.65,2.3,0.03]].forEach(([x,y,z],i) => {
        const bloom = new THREE.Mesh(new THREE.SphereGeometry(0.1,10,10), new THREE.MeshStandardMaterial({color: i%2 ? pink : white}));
        bloom.position.set(x,y,z); bloom.userData.part = "flowers";
        group.add(bloom);
      });
      const ped = new THREE.Mesh(new THREE.CylinderGeometry(0.15,0.17,0.85,16), new THREE.MeshStandardMaterial({color:white}));
      ped.position.set(0,0.425,0.5); ped.userData.part = "pedestal";
      group.add(ped);
      break;
    }
    case "window-counter-booth": {
      const white = 0x3f6b6f, glow = 0xfff2c8;
      const counter = new THREE.Mesh(new THREE.BoxGeometry(1.6,0.95,0.55), new THREE.MeshStandardMaterial({color:white}));
      counter.position.y = 0.475; counter.userData.part = "counter";
      const counterTop = new THREE.Mesh(new THREE.BoxGeometry(1.7,0.06,0.62), new THREE.MeshStandardMaterial({color:white}));
      counterTop.position.y = 0.98; counterTop.userData.part = "counter";
      const windowFrame = new THREE.Mesh(new THREE.BoxGeometry(1.5,0.85,0.08), new THREE.MeshStandardMaterial({color:white}));
      windowFrame.position.set(0,1.55,-0.2); windowFrame.userData.part = "window";
      const pillarL = new THREE.Mesh(new THREE.BoxGeometry(0.12,1.9,0.12), new THREE.MeshStandardMaterial({color:white}));
      pillarL.position.set(-0.85,0.95,-0.2); pillarL.userData.part = "counter";
      const pillarR = pillarL.clone(); pillarR.position.set(0.85,0.95,-0.2);
      const sconceL = new THREE.Mesh(new THREE.CylinderGeometry(0.05,0.05,0.12,10), new THREE.MeshStandardMaterial({color:glow, emissive:new THREE.Color(glow), emissiveIntensity:0.5}));
      sconceL.rotation.z = Math.PI/2; sconceL.position.set(-0.85,1.5,-0.1); sconceL.userData.keepEmissive = true;
      const sconceR = sconceL.clone(); sconceR.position.set(0.85,1.5,-0.1);
      group.add(counter, counterTop, windowFrame, pillarL, pillarR, sconceL, sconceR);
      for (let i=-2;i<=2;i++) {
        const bar = new THREE.Mesh(new THREE.BoxGeometry(0.02,0.85,0.09), new THREE.MeshStandardMaterial({color:0xdddddd}));
        bar.position.set(i*0.3,1.55,-0.19); bar.userData.part = "window";
        group.add(bar);
      }
      break;
    }
    case "panel-sconce-stand": {
      const white = 0x6b4e71, glow = 0xfff2c8;
      const tall = new THREE.Mesh(new THREE.BoxGeometry(0.7,2.1,0.1), new THREE.MeshStandardMaterial({color:white}));
      tall.position.set(-0.25,1.05,0); tall.userData.part = "panel";
      const short = new THREE.Mesh(new THREE.BoxGeometry(0.45,1.15,0.1), new THREE.MeshStandardMaterial({color:white}));
      short.position.set(0.45,0.575,0.02); short.userData.part = "panel";
      const sconce = new THREE.Mesh(new THREE.CylinderGeometry(0.05,0.05,0.12,10), new THREE.MeshStandardMaterial({color:glow, emissive:new THREE.Color(glow), emissiveIntensity:0.5}));
      sconce.rotation.z = Math.PI/2; sconce.position.set(-0.25,1.55,0.08); sconce.userData.keepEmissive = true;
      group.add(tall, short, sconce);
      break;
    }
    case "arch-bookshelf": {
      const white = 0x8a5a44;
      group.add(buildArchPanel(0.75, 1.9, 0.32, white, "frame"));
      [0.35,0.75,1.15,1.5].forEach(y => {
        const shelf = new THREE.Mesh(new THREE.BoxGeometry(0.62,0.03,0.28), new THREE.MeshStandardMaterial({color:white}));
        shelf.position.set(0,y,0); shelf.userData.part = "shelf";
        group.add(shelf);
      });
      break;
    }
    case "curtain-backdrop-bow": {
      const white = 0x8b2e3f;
      const rod = new THREE.Mesh(new THREE.CylinderGeometry(0.02,0.02,1.8,10), new THREE.MeshStandardMaterial({color:white}));
      rod.rotation.z = Math.PI/2; rod.position.y = 2.05; rod.userData.part = "rod";
      const curtainL = new THREE.Mesh(new THREE.PlaneGeometry(0.55,2.0,1,12), new THREE.MeshStandardMaterial({color:white, side:THREE.DoubleSide}));
      curtainL.position.set(-0.45,1.0,0); curtainL.userData.part = "curtain";
      const curtainR = curtainL.clone(); curtainR.position.set(0.45,1.0,0);
      const bowL = new THREE.Mesh(new THREE.TorusGeometry(0.08,0.025,8,16), new THREE.MeshStandardMaterial({color:white}));
      bowL.position.set(-0.45,1.35,0.06); bowL.userData.part = "bow";
      const bowR = bowL.clone(); bowR.position.set(0.45,1.35,0.06);
      group.add(rod, curtainL, curtainR, bowL, bowR);
      break;
    }
    case "storefront-facade": {
      const white = 0x2f4858, red = 0xd97676;
      const wall = new THREE.Mesh(new THREE.BoxGeometry(1.9,1.6,0.15), new THREE.MeshStandardMaterial({color:white}));
      wall.position.y = 0.8; wall.userData.part = "wall";
      group.add(wall);
      [-0.65,0,0.65].forEach((x,i) => {
        const archH = i===1 ? 1.15 : 0.9;
        const win = buildArchPanel(0.5, archH, 0.05, 0xeaeaea, "window");
        win.position.set(x, 0.05, 0.09);
        group.add(win);
        const awning = new THREE.Mesh(new THREE.ConeGeometry(0.3,0.15,4,1,true), new THREE.MeshStandardMaterial({color:red, side:THREE.DoubleSide}));
        awning.rotation.x = Math.PI/2.2; awning.scale.set(1.7,1,0.7);
        awning.position.set(x, archH+0.05, 0.22); awning.userData.part = "awning";
        group.add(awning);
      });
      break;
    }
    case "paneled-counter": {
      const white = 0x6b7a4e;
      const body = new THREE.Mesh(new THREE.BoxGeometry(1.5,0.95,0.55), new THREE.MeshStandardMaterial({color:white}));
      body.position.y = 0.475; body.userData.part = "body";
      const top = new THREE.Mesh(new THREE.BoxGeometry(1.6,0.06,0.62), new THREE.MeshStandardMaterial({color:white}));
      top.position.y = 0.98; top.userData.part = "body";
      const panel = new THREE.Mesh(new THREE.BoxGeometry(1.2,0.55,0.03), new THREE.MeshStandardMaterial({color:0xf2f2f2}));
      panel.position.set(0,0.45,0.29); panel.userData.part = "trim";
      const baseTrim = new THREE.Mesh(new THREE.BoxGeometry(1.55,0.06,0.58), new THREE.MeshStandardMaterial({color:white}));
      baseTrim.position.y = 0.03; baseTrim.userData.part = "trim";
      group.add(body, top, panel, baseTrim);
      break;
    }
    case "round-reception-desk": {
      const white = 0x4a5859, glow = 0xfff2c8;
      const body = new THREE.Mesh(new THREE.CylinderGeometry(0.75,0.8,0.95,24,1,false,0,Math.PI), new THREE.MeshStandardMaterial({color:white, side:THREE.DoubleSide}));
      body.position.y = 0.475; body.userData.part = "body";
      const top = new THREE.Mesh(new THREE.CylinderGeometry(0.82,0.82,0.06,24,1,false,0,Math.PI), new THREE.MeshStandardMaterial({color:white, side:THREE.DoubleSide}));
      top.position.y = 0.98; top.userData.part = "body";
      const sign = buildArchPanel(0.4, 0.7, 0.06, white, "sign");
      sign.position.set(0, 0.98, -0.4);
      const sconce = new THREE.Mesh(new THREE.CylinderGeometry(0.05,0.05,0.12,10), new THREE.MeshStandardMaterial({color:glow, emissive:new THREE.Color(glow), emissiveIntensity:0.5}));
      sconce.rotation.z = Math.PI/2; sconce.position.set(0.55,1.15,-0.35); sconce.userData.keepEmissive = true;
      group.add(body, top, sign, sconce);
      break;
    }
    /* ── Wedding decor/rental set (reference sheet #3) — plain vs. fluted
       silhouettes reused across arches, pedestals and vases via
       buildFlutedCylinder/buildFlutedPanel. The two flower clusters and the
       candle cluster from the same sheet were deliberately held back until
       the rest of this set was done — see flower-cluster-spray/-bouquet and
       candle-cluster further down, filed under Decorations/Lighting. */
    case "arch-panel-plain": {
      group.add(buildArchPanel(1.0, 2.2, 0.08, 0xb5654f, "panel"));
      break;
    }
    case "arch-panel-fluted": {
      // Same total-height math buildArchPanel uses internally (cap rise =
      // width/2, body = height - that) so this matches the plain arch's
      // proportions exactly instead of drifting at larger scales — see the
      // dual-arch-mixed fix just below for why that matters.
      const white = 0x5c4a7c;
      const width = 1.0, totalHeight = 2.2;
      const capH = width / 2, bodyH = totalHeight - capH;
      const body = buildFlutedPanel(width, bodyH, white, "panel", 11);
      group.add(body);
      const cap = new THREE.Mesh(new THREE.SphereGeometry(0.5, 24, 12, 0, Math.PI*2, 0, Math.PI/2), new THREE.MeshStandardMaterial({color:white, side:THREE.DoubleSide}));
      cap.scale.set(width, width, 0.1); cap.position.y = bodyH; cap.userData.part = "panel";
      // Parented to `body` (not `group`) so the cap shares the exact same
      // parent as the ribs it tops — Advanced Edit's per-part resize groups
      // meshes by (part tag, immediate parent), so if this lived as a
      // sibling under `group` instead, resizing "panel" would scale the
      // ribs and cap around two different pivot points and they'd drift
      // apart instead of moving as one rigid piece.
      body.add(cap);
      break;
    }
    case "dual-arch-mixed": {
      // The plain arch (buildArchPanel) computes cap-rise = width/2 and
      // subtracts it from the given height to get the body height. The
      // fluted arch is hand-built here instead of through buildArchPanel,
      // so it has to repeat that exact same math — otherwise the two arches
      // silently end up different total heights, which reads as "barely
      // off" at 1x scale but gets dramatically more obvious the bigger the
      // whole object is scaled, since the gap between them scales up too.
      const white = 0xc97b5f;
      const archWidth = 0.85, archHeight = 2.1;
      const capH = archWidth / 2, bodyH = archHeight - capH;
      const plain = buildArchPanel(archWidth, archHeight, 0.07, white, "panelPlain");
      plain.position.set(-0.48, 0, 0);
      group.add(plain);
      const fluted = buildFlutedPanel(archWidth, bodyH, white, "panelFluted", 9);
      fluted.position.set(0.48, 0, -0.02);
      group.add(fluted);
      const flutedCap = new THREE.Mesh(new THREE.SphereGeometry(0.5, 24, 12, 0, Math.PI*2, 0, Math.PI/2), new THREE.MeshStandardMaterial({color:white, side:THREE.DoubleSide}));
      flutedCap.scale.set(archWidth, archWidth, 0.1);
      // Local to `fluted`'s own origin (not group's), since it's now parented
      // there instead of being a sibling positioned in absolute/group space —
      // the (0.48, -0.02) offset is already supplied by fluted.position above.
      flutedCap.position.set(0, bodyH, 0); flutedCap.userData.part = "panelFluted";
      // Same reasoning as arch-panel-fluted just above: parent the cap inside
      // `fluted` (the ribs' own wrapper group) rather than adding it as a
      // sibling under `group`. Advanced Edit's per-part resize/move groups
      // meshes by (part tag, immediate parent) into one pivot — if the cap
      // and ribs don't share a parent, resizing "Fluted Arch" scales them
      // around two different points and the cap detaches from the body.
      fluted.add(flutedCap);
      break;
    }
    case "pedestal-duo-plain": {
      const white = 0x6b8f71;
      const short = new THREE.Mesh(new THREE.CylinderGeometry(0.22,0.24,0.7,24), new THREE.MeshStandardMaterial({color:white}));
      short.position.set(-0.35, 0.35, 0); short.userData.part = "pedestalShort";
      const tall = new THREE.Mesh(new THREE.CylinderGeometry(0.22,0.24,1.15,24), new THREE.MeshStandardMaterial({color:white}));
      tall.position.set(0.35, 0.575, 0); tall.userData.part = "pedestalTall";
      group.add(short, tall);
      break;
    }
    case "pedestal-duo-fluted": {
      const white = 0x9b6f7a;
      const short = buildFlutedCylinder(0.22, 0.24, 0.7, white, "pedestalShort");
      short.position.set(-0.35, 0.35, 0);
      const tall = buildFlutedCylinder(0.22, 0.24, 1.15, white, "pedestalTall");
      tall.position.set(0.35, 0.575, 0);
      group.add(short, tall);
      break;
    }
    case "pedestal-single-plain": {
      const p = new THREE.Mesh(new THREE.CylinderGeometry(0.24,0.26,0.9,24), new THREE.MeshStandardMaterial({color:0x4f6b4f}));
      p.position.y = 0.45; p.userData.part = "pedestal";
      group.add(p);
      break;
    }
    case "pedestal-single-fluted": {
      const p = buildFlutedCylinder(0.24, 0.26, 0.9, 0xa3773f, "pedestal");
      p.position.y = 0.45;
      group.add(p);
      break;
    }
    case "fluted-panel-wall": {
      group.add(buildFlutedPanel(0.9, 2.0, 0x4a5859, "panel", 14));
      break;
    }
    case "tiered-stand-fluted": {
      const white = 0xc9a44c;
      const base = buildFlutedCylinder(0.4, 0.42, 0.55, white, "base");
      base.position.y = 0.275;
      group.add(base);
      [[0.62, 0.03, 0.58], [0.42, 0.03, 0.88], [0.24, 0.03, 1.1]].forEach(([r, h, y]) => {
        const tier = new THREE.Mesh(new THREE.CylinderGeometry(r, r, h, 28), new THREE.MeshStandardMaterial({color:white}));
        tier.position.y = y; tier.userData.part = "tiers";
        group.add(tier);
      });
      break;
    }
    case "tiered-stand-acrylic": {
      const glass = 0x8fb8c9;
      const base = new THREE.Mesh(new THREE.CylinderGeometry(0.22,0.24,0.06,24), new THREE.MeshStandardMaterial({color:glass, transparent:true, opacity:0.55}));
      base.position.y = 0.03; base.userData.part = "stem";
      group.add(base);
      let prevY = 0.06;
      [[0.35, 0.22], [0.65, 0.16], [0.95, 0.11]].forEach(([y, tierR]) => {
        const stemH = y - prevY;
        const stem = new THREE.Mesh(new THREE.CylinderGeometry(0.035,0.035,stemH,10), new THREE.MeshStandardMaterial({color:glass, transparent:true, opacity:0.55}));
        stem.position.y = prevY + stemH/2; stem.userData.part = "stem";
        const tier = new THREE.Mesh(new THREE.CylinderGeometry(tierR, tierR, 0.025, 24), new THREE.MeshStandardMaterial({color:glass, transparent:true, opacity:0.55}));
        tier.position.y = y; tier.userData.part = "tiers";
        group.add(stem, tier);
        prevY = y;
      });
      break;
    }
    case "card-box": {
      const white = 0xa13d5c, dark = 0x2c2c2c;
      const box = new THREE.Mesh(new THREE.BoxGeometry(0.7,0.7,0.55), new THREE.MeshStandardMaterial({color:white}));
      box.position.y = 0.35; box.userData.part = "box";
      const slot = new THREE.Mesh(new THREE.BoxGeometry(0.28,0.02,0.05), new THREE.MeshStandardMaterial({color:dark}));
      slot.position.set(0, 0.72, 0); slot.userData.part = "slot";
      group.add(box, slot);
      break;
    }
    case "guest-book": {
      const white = 0x3d5a80, spine = 0xe8e8e8;
      const cover = new THREE.Mesh(new THREE.BoxGeometry(0.55,0.7,0.08), new THREE.MeshStandardMaterial({color:white}));
      cover.position.y = 0.35; cover.rotation.z = 0.05; cover.userData.part = "cover";
      const spineMesh = new THREE.Mesh(new THREE.BoxGeometry(0.03,0.7,0.09), new THREE.MeshStandardMaterial({color:spine}));
      spineMesh.position.set(-0.26, 0.35, 0); spineMesh.rotation.z = 0.05; spineMesh.userData.part = "cover";
      group.add(cover, spineMesh);
      break;
    }
    case "fluted-bowl-duo": {
      const white = 0x6f9b7a;
      const bowlA = buildFlutedCylinder(0.35, 0.32, 0.28, white, "bowlA");
      bowlA.position.set(-0.32, 0.14, 0);
      const bowlB = buildFlutedCylinder(0.26, 0.24, 0.22, white, "bowlB");
      bowlB.position.set(0.36, 0.11, 0.05);
      group.add(bowlA, bowlB);
      break;
    }
    case "fluted-vase": {
      const v = buildFlutedCylinder(0.22, 0.18, 1.05, 0x8a5a44, "vase");
      v.position.y = 0.525;
      group.add(v);
      break;
    }
    /* The two flower clusters deferred from the wedding decor set above,
       now picked back up. "Spray" is the looser, taller arrangement with a
       few stems escaping the top; "bouquet" is the denser, wider dome with
       none — matches the two flower photos on the reference sheet. */
    case "flower-cluster-spray": {
      group.add(buildFlowerCluster("blooms", {
        count: 26, radiusX: 0.32, radiusY: 0.24, radiusZ: 0.28, domeBias: 0.45,
        bloomMin: 0.05, bloomMax: 0.095, stemCount: 6, stemHeight: 0.4, stemPart: "stems",
      }));
      break;
    }
    case "flower-cluster-bouquet": {
      group.add(buildFlowerCluster("blooms", {
        count: 30, radiusX: 0.36, radiusY: 0.22, radiusZ: 0.34, domeBias: 0.6,
        bloomMin: 0.065, bloomMax: 0.11,
      }));
      break;
    }
    /* The candle cluster from the same sheet — three glass cylinder jars at
       different heights, each with a pillar candle burned down to a
       different level inside, plus a faint warm glow at the wick so it
       still earns its spot under the Lighting category rather than reading
       as pure decoration. Jars are tagged keepOwnMaterial (same reasoning
       as bespoke gold trim elsewhere) since a "wood" or "metal" glass jar
       wouldn't make sense — they stay glass regardless of the item's
       overall material choice; the candles themselves are a normal tagged
       part ("candle") and stay fully customizable. */
    case "candle-cluster": {
      const glass = 0xeaf4f5, wax = 0xfaf6ee, flame = 0xfff2c8;
      const jars = [
        { x: -0.22, z:  0.06, r: 0.11, h: 0.34, cr: 0.07,  ch: 0.20 }, // short, front-left
        { x:  0.06, z: -0.10, r: 0.13, h: 0.60, cr: 0.085, ch: 0.52 }, // tall, back
        { x:  0.24, z:  0.09, r: 0.10, h: 0.46, cr: 0.065, ch: 0.24 }, // medium, front-right, burned low
      ];
      jars.forEach(({ x, z, r, h, cr, ch }) => {
        const jar = new THREE.Mesh(
          new THREE.CylinderGeometry(r, r * 0.94, h, 20, 1, true),
          new THREE.MeshStandardMaterial({ color: glass, transparent: true, opacity: 0.32, roughness: 0.05, metalness: 0.1, side: THREE.DoubleSide })
        );
        jar.position.set(x, h / 2, z);
        jar.userData.part = "jar";
        jar.userData.keepOwnMaterial = true;
        const candle = new THREE.Mesh(
          new THREE.CylinderGeometry(cr, cr, ch, 16),
          new THREE.MeshStandardMaterial({ color: wax })
        );
        candle.position.set(x, ch / 2 + 0.01, z);
        candle.userData.part = "candle";
        const wick = new THREE.Mesh(
          new THREE.SphereGeometry(0.012, 8, 8),
          new THREE.MeshStandardMaterial({ color: flame, emissive: new THREE.Color(flame), emissiveIntensity: 0.5 })
        );
        wick.position.set(x, ch + 0.02, z);
        wick.userData.keepEmissive = true;
        group.add(jar, candle, wick);
      });
      break;
    }
    /* ── Floral swags/garlands (reference sheet #4) — strung along a path
       via buildFloralSwag rather than mounded like the flower clusters
       above. Meant to be dropped near an arch/backdrop/pedestal/table so
       DECOR_ATTACH_TYPES auto-parents them to it (see handleDrop) — sizes
       and default positions below assume they're being hand-positioned
       with Advanced Edit's Position controls afterward (host heights vary
       far too much, 0.5m pedestal to 2.3m arch, for one auto-placement to
       ever look right on all of them), not standing alone on the floor. */
    case "floral-swag-horizontal": {
      const count = 34;
      const points = [];
      for (let i = 0; i < count; i++) {
        const t = i / (count - 1);
        points.push({ x: (t - 0.5) * 1.7, y: 0.05 + Math.sin(t * Math.PI) * 0.09, z: 0 });
      }
      group.add(buildFloralSwag(points, {
        sizeAt: t => 0.055 + Math.sin(t * Math.PI) * 0.05,
        bloomChance: t => (t < 0.12 || t > 0.88) ? 0.25 : 1,
        leafEvery: 2, leafLength: 0.15,
      }));
      break;
    }
    case "floral-swag-corner": {
      // Runs diagonally from a dense top-left mass down into a thinning
      // trailing cascade — designed to sit in the corner of a backdrop or
      // atop one side of an arch; rotate the placed item to mirror it for
      // the opposite corner.
      const count = 30;
      const points = [];
      for (let i = 0; i < count; i++) {
        const t = i / (count - 1);
        let x, y;
        if (t < 0.55) {
          const u = t / 0.55;
          x = -0.55 + u * 0.75;
          y = 0.75 - u * 0.55;
        } else {
          const u = (t - 0.55) / 0.45;
          x = 0.2 + u * 0.12;
          y = 0.2 - u * 0.55;
        }
        points.push({ x, y, z: 0 });
      }
      group.add(buildFloralSwag(points, {
        sizeAt: t => 0.075 - t * 0.035,
        bloomChance: t => t > 0.65 ? 0.35 : 1,
        leafEvery: 2, leafLength: 0.14,
      }));
      break;
    }
    case "floral-cascade-teardrop": {
      // A mounded head (reusing buildFlowerCluster's dome, the same look
      // as the standalone flower clusters) with a single trailing vine of
      // sparse blooms/foliage hanging beneath it — for a chair back,
      // pew end, or shepherd hook rather than a wide backdrop.
      const mound = buildFlowerCluster("blooms", {
        count: 20, radiusX: 0.22, radiusY: 0.16, radiusZ: 0.2, domeBias: 0.35,
        bloomMin: 0.045, bloomMax: 0.08,
      });
      mound.position.y = 0.75;
      group.add(mound);
      const trailCount = 16;
      const points = [];
      for (let i = 0; i < trailCount; i++) {
        const t = i / (trailCount - 1);
        points.push({ x: Math.sin(i * 0.8) * 0.03 * (1 - t), y: 0.7 - t * 0.7, z: Math.cos(i * 0.8) * 0.03 * (1 - t) });
      }
      group.add(buildFloralSwag(points, {
        sizeAt: t => 0.05 - t * 0.03,
        bloomChance: t => 0.6 - t * 0.4,
        leafEvery: 1, leafLength: 0.1,
      }));
      break;
    }
    case "floral-arch-garland": {
      // A full semicircle, meant to sit on top of / wrap around one of the
      // arch-panel or arch-backdrop types — the "complete arch" piece from
      // the reference sheet, distinct from the corner drape above.
      const count = 40, R = 0.95;
      const points = [];
      for (let i = 0; i < count; i++) {
        const t = i / (count - 1);
        const theta = t * Math.PI;
        points.push({ x: -Math.cos(theta) * R, y: Math.sin(theta) * R, z: 0 });
      }
      group.add(buildFloralSwag(points, {
        sizeAt: t => 0.06 + Math.sin(t * Math.PI) * 0.02,
        bloomChance: () => 1,
        leafEvery: 2, leafLength: 0.15,
      }));
      break;
    }
    case "floral-swag-crescent": {
      // Flatter and shallower than the arch garland, and open rather than
      // a full semicircle — lies along a table as a runner/centerpiece
      // rather than standing upright on a backdrop.
      const count = 30;
      const points = [];
      for (let i = 0; i < count; i++) {
        const t = i / (count - 1);
        const theta = (t - 0.5) * Math.PI * 0.85;
        const x = Math.sin(theta) * 0.9;
        const z = (-Math.cos(theta) * 0.9 + 0.9) * 0.35;
        points.push({ x, y: 0.04, z });
      }
      group.add(buildFloralSwag(points, {
        sizeAt: t => 0.05 + Math.sin(t * Math.PI) * 0.045,
        bloomChance: t => (t < 0.1 || t > 0.9) ? 0.3 : 1,
        leafEvery: 2, leafLength: 0.13,
      }));
      break;
    }
    case "flower-stem": {
      group.add(buildFlowerStem(variant));
      break;
    }
    case "greenery-stem": {
      group.add(buildGreeneryStem(variant));
      break;
    }
    case "bouquet-round-rose": {
      // Tight rounded dome of roses — the classic hand-tied bridal shape.
      const height = 0.38;
      group.add(buildBouquetStemBundle(10, height, "stems"));
      const top = buildFlowerCluster("blooms", {
        count: 22, radiusX: 0.16, radiusY: 0.13, radiusZ: 0.16,
        domeBias: 0.15, bloomMin: 0.045, bloomMax: 0.07,
      });
      top.position.y = height;
      group.add(top);
      break;
    }
    case "bouquet-cascade": {
      // A smaller round top with a trail of blooms spilling down the front,
      // tapering in size as it falls.
      const height = 0.4;
      group.add(buildBouquetStemBundle(10, height, "stems"));
      const top = buildFlowerCluster("blooms", {
        count: 14, radiusX: 0.13, radiusY: 0.1, radiusZ: 0.13,
        domeBias: 0.2, bloomMin: 0.04, bloomMax: 0.06,
      });
      top.position.y = height;
      group.add(top);
      const trailCount = 16;
      const trailPoints = [];
      for (let i = 0; i < trailCount; i++) {
        const t = i / (trailCount - 1);
        trailPoints.push({ x: 0, y: height - t * height * 0.9, z: 0.07 + t * 0.22 });
      }
      group.add(buildFloralSwag(trailPoints, {
        bloomPart: "blooms", leafPart: "leaves",
        sizeAt: t => 0.06 - t * 0.035,
        bloomChance: () => 0.85,
        leafEvery: 3, leafLength: 0.09,
      }));
      break;
    }
    case "bouquet-wildflower": {
      // Looser, asymmetric mound with sprigs poking out past the silhouette
      // rather than a tight uniform dome.
      const height = 0.4;
      group.add(buildBouquetStemBundle(9, height, "stems"));
      const top = buildFlowerCluster("blooms", {
        count: 16, radiusX: 0.17, radiusY: 0.15, radiusZ: 0.17,
        domeBias: 0.1, bloomMin: 0.035, bloomMax: 0.065,
        stemCount: 6, stemHeight: 0.12, stemPart: "leaves",
      });
      top.position.y = height;
      group.add(top);
      [0, 1, 2, 3].forEach(i => {
        const sprig = buildLeafSprig(0.14 + (i % 2) * 0.03, "leaves", 0x5f9e57);
        const a = i * 1.7;
        sprig.position.set(Math.cos(a) * 0.1, height - 0.02, Math.sin(a) * 0.1);
        sprig.rotation.z = Math.cos(a) * 0.4;
        sprig.rotation.y = a;
        group.add(sprig);
      });
      break;
    }
    case "bouquet-lily": {
      // A handful of large blooms fanned outward from the tie point rather
      // than mounded — lilies are too large/architectural to dome like roses.
      const height = 0.42;
      group.add(buildBouquetStemBundle(8, height, "stems"));
      const count = 6;
      for (let i = 0; i < count; i++) {
        const a = i * (Math.PI * 2 / count) + 0.3;
        const bloom = buildFlowerHead(0.09, i, "blooms");
        bloom.position.set(Math.cos(a) * 0.09, height + 0.02, Math.sin(a) * 0.09);
        bloom.rotation.y = a;
        bloom.rotation.x = 0.25;
        group.add(bloom);
      }
      [0, 1].forEach(i => {
        const leaf = buildLeafSprig(0.15, "leaves", 0x4d7c3f);
        leaf.position.y = height * 0.6;
        leaf.rotation.y = i * Math.PI;
        group.add(leaf);
      });
      break;
    }
    case "bouquet-tulip": {
      // A tight bunch of closed tulip cups, golden-spiral packed like a
      // hand-gathered tulip bunch rather than a rounded dome.
      const height = 0.36;
      group.add(buildBouquetStemBundle(14, height, "stems"));
      const count = 14;
      const golden = Math.PI * (3 - Math.sqrt(5));
      for (let i = 0; i < count; i++) {
        const theta = i * golden;
        const r = Math.sqrt(i / count) * 0.09;
        const y = height + ((i * 7) % 4) * 0.01;
        const bloom = buildTulipBloom(0.045, i, "blooms");
        bloom.position.set(Math.cos(theta) * r, y, Math.sin(theta) * r);
        group.add(bloom);
      }
      break;
    }
    case "bouquet-calla": {
      // A small fan of calla trumpets splaying outward — the airy, minimal
      // "calla bouquet" style rather than a dense head.
      const height = 0.42;
      group.add(buildBouquetStemBundle(7, height, "stems"));
      const count = 7;
      for (let i = 0; i < count; i++) {
        const a = i * (Math.PI * 2 / count);
        const bloom = buildCallaBloom(0.11, "blooms");
        bloom.position.set(Math.cos(a) * 0.05, height, Math.sin(a) * 0.05);
        bloom.rotation.y = a;
        bloom.rotation.z = Math.cos(a) * 0.15;
        group.add(bloom);
      }
      break;
    }
    case "potted-plant": {
      group.add(buildPottedPlant(variant));
      break;
    }
    case "peace-lily": {
      group.add(buildPeaceLily());
      break;
    }
    case "vase": {
      group.add(buildVase(variant));
      break;
    }
    case "chair-item": {
      group.add(buildChairStyle(variant));
      break;
    }
    case "sofa-item": {
      group.add(buildSofaStyle(variant));
      break;
    }
    case "sheer-curtain": {
      group.add(buildCurtain(variant));
      break;
    }
    case "curtain-rod": {
      // A standalone holder, meant to be paired with a noRod curtain
      // (or placed above any curtain) so the rod/finial style is a
      // separate, independently customizable choice from the drape itself.
      group.add(buildCurtainRod(1.9, 2.02));
      break;
    }
    case "curtain-tie": {
      // A standalone tie/gather accessory — same tie-decoration builders
      // used inside a curtain's own double-tieback kind, just placeable
      // and colorable on its own rather than baked into one curtain.
      const tieStyle = variant === "band" ? null : variant;
      group.add(buildTieDecoration(tieStyle, 0, 0.95, 0xa3773f));
      break;
    }
    case "table": {
      group.add(buildTable(variant));
      break;
    }
    case "rug": {
      group.add(buildRug(variant));
      break;
    }
    case "backdrop-panel": {
      group.add(buildBackdropPanel(variant));
      break;
    }
    case "welcome-sign": {
      group.add(buildWelcomeSign(variant));
      break;
    }
    case "wall-art": {
      group.add(buildWallArt(variant));
      break;
    }
    case "stage": {
      group.add(buildStage(variant));
      break;
    }
    case "balloon": {
      group.add(buildBalloon(variant));
      break;
    }
    default: {
      const m=new THREE.Mesh(new THREE.BoxGeometry(0.6,0.6,0.6),new THREE.MeshStandardMaterial({color:0xa78bfa}));
      m.position.y=0.3; group.add(m);
    }
  }
  group.traverse(c=>{ if(c.isMesh){c.castShadow=true;c.receiveShadow=true;} });
  return group;
}

/* ── Room geometry builders ── */
function buildRoom(layoutId, RW, RD, RH, wallColor, floorColor, wallMatsRef, floorMatRef, scene, isGarden) {

  // Floor — skip for lshaped (custom floors below) and custom (tile-based floor built separately)
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

  // Grid (not for garden or custom — custom's tile floor has its own visual grid)
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
    return; // no walls for garden
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
    // All 4 walls — front wall stored separately for toggle
    addWall(RW, RH, 0,       RH/2, -RD/2,  0          ); // back
    addWall(RD, RH, -RW/2,   RH/2,  0,      Math.PI/2  ); // left
    addWall(RD, RH,  RW/2,   RH/2,  0,     -Math.PI/2  ); // right
    // Front wall — starts hidden, toggle shows it
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

    // Single shared floor material — tracked by ref so color updates work
    const fMat = new THREE.MeshStandardMaterial({ color: 0xf0ece8 });
    floorMatRef.current = fMat;

    // Floor top section
    const f1 = new THREE.Mesh(new THREE.PlaneGeometry(W1, D1), fMat);
    f1.rotation.x = -Math.PI/2;
    f1.position.set(0, 0, -D2/2);
    f1.receiveShadow = true;
    scene.add(f1);

    // Floor bottom section — same material reference
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

    // Back wall — full width
    mkWall(W1, RH, t, 0, RH/2, -(D1+D2)/2);
    // Left wall — full depth
    mkWall(t, RH, D1+D2, -W1/2, RH/2, 0);
    // Right wall — top section only
    mkWall(t, RH, D1, W1/2, RH/2, -D2/2);
  }

  else if (layoutId === "custom") {
    // Blank — just floor, no walls
  }
}


/* Frees the GPU-side resources (geometry, material(s), any texture maps —
   branding panels and floor/wall texture presets both use one) under a
   mesh/group before it's dropped from the scene. Without this, every
   rebuild (color pick, part edit, adding an item, editing the floor) piles
   up more undisposed geometries/materials/textures on top of the last —
   harmless-looking at first, but it compounds with every interaction and
   eventually exhausts the WebGL context. Shared by clearGroup (the tile
   floor plan) and the furniture sync effect (placedItems → scene) below,
   which used to each roll their own (or, in the furniture case, skip
   disposal entirely). */
function disposeObject3D(obj) {
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

/* ── Doors & windows — structural, wall-mounted catalog of their own ──
   Deliberately NOT part of ELEMENTS/build3DObject: a door or window only
   ever exists embedded in one specific wall edge (see customFloorPlan.js),
   so it's addressed by edgeKey in the `doors`/`windows` state maps rather
   than being a free-draggable placedItems entry. Each style is still built
   from the same primitive boxes/cylinders/toruses as everything else —
   an "opening" is just wall geometry that isn't drawn there, exactly like
   the original single door style already did. */
const DOOR_STYLES = {
  "modern-single": { leaves: 1, glass: false, arched: false, sliding: false, paneled: false },
  "double-door":   { leaves: 2, glass: false, arched: false, sliding: false, paneled: false },
  "glass-door":    { leaves: 1, glass: true,  arched: false, sliding: false, paneled: false },
  "wooden-door":   { leaves: 1, glass: false, arched: false, sliding: false, paneled: true  },
  "arched-door":   { leaves: 1, glass: false, arched: true,  sliding: false, paneled: false },
  "sliding-door":  { leaves: 1, glass: false, arched: false, sliding: true,  paneled: false },
};
const DOOR_STYLE_LABELS = {
  "modern-single": "Modern Single Door",
  "double-door":   "Double Door",
  "glass-door":    "Glass Door",
  "wooden-door":   "Wooden Door",
  "arched-door":   "Arched Door",
  "sliding-door":  "Sliding Door",
};
const DOOR_STYLE_LIST = Object.keys(DOOR_STYLES);
const DOOR_COLOR_PRESETS  = ["#8B5E3C", "#5C4033", "#2c2c2c", "#3d5a80", "#588157", "#8b2635"];
const DOOR_FRAME_PRESETS  = ["#3d2817", "#8a6a4a", "#C9A44C", "#c7c7c7", "#1a1a1a", "#2f4858"];
const DOOR_HANDLE_STYLES  = ["sphere", "bar", "ring"];
const DOOR_HANDLE_LABELS  = { sphere: "Knob", bar: "Bar", ring: "Ring" };

const WINDOW_STYLES = {
  "standard":          { sillFrac: 0.45, headerFrac: 0.88, panes: 1, arched: false },
  "wide":              { sillFrac: 0.32, headerFrac: 0.88, panes: 1, arched: false },
  "floor-to-ceiling":  { sillFrac: 0.04, headerFrac: 0.97, panes: 1, arched: false },
  "arched":            { sillFrac: 0.45, headerFrac: 0.82, panes: 1, arched: true  },
  "double-window":     { sillFrac: 0.45, headerFrac: 0.88, panes: 2, arched: false },
  "modern-glass":      { sillFrac: 0.35, headerFrac: 0.95, panes: 1, arched: false },
};
const WINDOW_STYLE_LABELS = {
  "standard":         "Standard Window",
  "wide":             "Wide Window",
  "floor-to-ceiling": "Floor-to-Ceiling Window",
  "arched":           "Arched Window",
  "double-window":    "Double Window",
  "modern-glass":     "Modern Glass Window",
};
const WINDOW_STYLE_LIST = Object.keys(WINDOW_STYLES);
const WINDOW_FRAME_PRESETS   = ["#3d2817", "#8a6a4a", "#C9A44C", "#c7c7c7", "#1a1a1a", "#2f4858"];
const WINDOW_FRAME_MATERIALS = ["wood", "metal", "plastic"];
const GLASS_TINT_LIST = ["clear", "frosted", "blue", "bronze", "green", "smoke"];
const GLASS_TINT_LABELS = { clear: "Clear", frosted: "Frosted", blue: "Blue", bronze: "Bronze", green: "Green", smoke: "Smoke" };
const GLASS_TINT_PRESETS = {
  clear:   { color: 0xdcebef, opacity: 0.28, roughness: 0.08 },
  frosted: { color: 0xeef2f0, opacity: 0.62, roughness: 0.6  },
  blue:    { color: 0x5c8aa6, opacity: 0.55, roughness: 0.1  },
  bronze:  { color: 0x8a6a3a, opacity: 0.6,  roughness: 0.15 },
  green:   { color: 0x4a7c6f, opacity: 0.55, roughness: 0.1  },
  smoke:   { color: 0x3a3a3a, opacity: 0.6,  roughness: 0.15 },
};

function buildDoorHandle(kind, color) {
  const mat = new THREE.MeshStandardMaterial({ color, metalness: 0.6, roughness: 0.3 });
  if (kind === "bar") return new THREE.Mesh(new THREE.BoxGeometry(0.02, 0.22, 0.02), mat);
  if (kind === "ring") {
    const ring = new THREE.Mesh(new THREE.TorusGeometry(0.035, 0.008, 8, 16), mat);
    ring.rotation.y = Math.PI / 2;
    return ring;
  }
  return new THREE.Mesh(new THREE.SphereGeometry(0.025, 8, 8), mat);
}

/* A single leaf, centered on its own local origin (so the caller can place
   it at any offset from its hinge/track pivot) — plain slab, a glass pane
   in a thin frame, or a slab with two raised panel insets. */
function buildDoorLeaf(leafW, leafH, opts) {
  const { color, glass, paneled } = opts;
  const group = new THREE.Group();
  if (glass) {
    const frame = new THREE.Mesh(new THREE.BoxGeometry(leafW, leafH, 0.05), new THREE.MeshStandardMaterial({ color, roughness: 0.5 }));
    const pane = new THREE.Mesh(
      new THREE.BoxGeometry(leafW * 0.78, leafH * 0.82, 0.02),
      new THREE.MeshStandardMaterial({ color: 0xbcd8e0, transparent: true, opacity: 0.4, roughness: 0.1, metalness: 0.1 })
    );
    pane.position.z = 0.025;
    frame.userData.part = "body"; pane.userData.part = "body";
    group.add(frame, pane);
  } else {
    const leaf = new THREE.Mesh(new THREE.BoxGeometry(leafW, leafH, 0.05), new THREE.MeshStandardMaterial({ color, roughness: 0.6 }));
    leaf.userData.part = "body";
    group.add(leaf);
    if (paneled) {
      const panelMat = new THREE.MeshStandardMaterial({ color, roughness: 0.75 });
      [-0.24, 0.22].forEach(fy => {
        const p = new THREE.Mesh(new THREE.BoxGeometry(leafW * 0.62, leafH * 0.32, 0.012), panelMat);
        p.position.set(0, fy * leafH, 0.031);
        p.userData.part = "body";
        group.add(p);
      });
    }
  }
  return group;
}

/* Builds one door, already positioned/rotated by the caller onto its wall
   segment (same "skip the solid wall box, add a lintel + leaf" trick the
   original single-style door used — no CSG cutting anywhere). */
function buildDoorGroup(len, wallHeight, wallThickness, doorData = {}) {
  const style = DOOR_STYLES[doorData.style] || DOOR_STYLES["modern-single"];
  const color = doorData.color || 0x8B5E3C;
  const frameColor = doorData.frameColor || 0x3d2817;
  const handle = doorData.handle || "sphere";
  const openDir = doorData.openDir === -1 ? -1 : 1;
  const tall = !!doorData.tall;
  const group = new THREE.Group();

  const leafH = wallHeight * (tall ? 0.95 : 0.85);
  const lintelY = leafH;

  if (style.arched) {
    const archR = len / 2 + 0.05;
    const arch = new THREE.Mesh(
      new THREE.TorusGeometry(archR, 0.06, 8, 20, Math.PI),
      new THREE.MeshStandardMaterial({ color: frameColor, roughness: 0.55 })
    );
    arch.position.set(0, lintelY, 0);
    arch.userData.part = "body";
    const fan = new THREE.Mesh(
      new THREE.CylinderGeometry(archR * 0.85, archR * 0.85, wallThickness, 20, 1, true, 0, Math.PI),
      new THREE.MeshStandardMaterial({ color: 0xbcd8e0, transparent: true, opacity: 0.4, side: THREE.DoubleSide })
    );
    fan.rotation.x = Math.PI / 2; fan.rotation.z = Math.PI;
    fan.position.set(0, lintelY, 0);
    fan.userData.part = "body";
    group.add(arch, fan);
  } else {
    const lintel = new THREE.Mesh(
      new THREE.BoxGeometry(len + 0.1, 0.12, wallThickness + 0.02),
      new THREE.MeshStandardMaterial({ color: frameColor, roughness: 0.55 })
    );
    lintel.position.set(0, lintelY + 0.06, 0);
    lintel.castShadow = true;
    lintel.userData.part = "body";
    group.add(lintel);
  }

  if (style.sliding) {
    const leafW = len * 0.94;
    const leafGroup = buildDoorLeaf(leafW, leafH, { color, glass: style.glass, paneled: style.paneled });
    const h = buildDoorHandle(handle, frameColor);
    h.position.set(-openDir * (leafW / 2 - 0.06), 0, 0.035);
    leafGroup.add(h);
    leafGroup.position.set(openDir * leafW * 0.42, leafH / 2, wallThickness * 0.55);
    group.add(leafGroup);
    const track = new THREE.Mesh(new THREE.BoxGeometry(len * 1.08, 0.03, 0.06), new THREE.MeshStandardMaterial({ color: frameColor, metalness: 0.4, roughness: 0.4 }));
    track.position.set(0, leafH + 0.03, wallThickness * 0.55);
    track.userData.part = "body";
    group.add(track);
  } else if (style.leaves === 2) {
    const leafW = len * 0.46;
    [-1, 1].forEach(side => {
      const leafGroup = buildDoorLeaf(leafW, leafH, { color, glass: style.glass, paneled: style.paneled });
      const h = buildDoorHandle(handle, frameColor);
      h.position.set(-side * (leafW / 2 - 0.06), 0, 0.035);
      leafGroup.add(h);
      leafGroup.position.x = -side * leafW / 2;
      const pivot = new THREE.Group();
      pivot.position.set(side * len / 2, leafH / 2, 0);
      pivot.rotation.y = side > 0 ? 0.55 : -0.55;
      pivot.add(leafGroup);
      group.add(pivot);
    });
  } else {
    const leafW = len * 0.92;
    const leafGroup = buildDoorLeaf(leafW, leafH, { color, glass: style.glass, paneled: style.paneled });
    const h = buildDoorHandle(handle, frameColor);
    h.position.set(leafW / 2 - 0.06, 0, 0.035);
    leafGroup.add(h);
    leafGroup.position.x = openDir * leafW / 2;
    const pivot = new THREE.Group();
    pivot.position.set(-openDir * len / 2, leafH / 2, 0);
    pivot.rotation.y = openDir * -0.9;
    pivot.add(leafGroup);
    group.add(pivot);
  }

  // Generous invisible hit area so the doorway is easy to click, same as
  // the original single-style door.
  const hit = new THREE.Mesh(
    new THREE.BoxGeometry(len, wallHeight, wallThickness + 0.3),
    new THREE.MeshBasicMaterial({ transparent: true, opacity: 0, depthWrite: false })
  );
  hit.position.set(0, wallHeight / 2, 0);
  group.add(hit);

  return group;
}

/* Builds one window: solid wall below the sill and above the header (both
   plain boxes, same material/color the rest of that wall run would have
   used), a frame, and a tinted glass pane filling the gap — never a CSG
   cutout, same "just don't draw wall there" approach as the door. */
function buildWindowGroup(len, wallHeight, wallThickness, wallColor, windowData = {}) {
  const style = WINDOW_STYLES[windowData.style] || WINDOW_STYLES["standard"];
  const frameColor = windowData.frameColor || 0x3d2817;
  const frameMaterialKey = windowData.frameMaterial || "wood";
  const framePreset = MATERIAL_PRESETS[frameMaterialKey] || MATERIAL_PRESETS.wood;
  const tint = GLASS_TINT_PRESETS[windowData.glassTint] || GLASS_TINT_PRESETS.clear;
  const big = !!windowData.big;
  const group = new THREE.Group();

  const sillFrac = big ? Math.max(0.04, style.sillFrac - 0.15) : style.sillFrac;
  const headerFrac = big ? Math.min(0.98, style.headerFrac + 0.06) : style.headerFrac;
  const sillY = wallHeight * sillFrac;
  const headerY = wallHeight * headerFrac;
  const openingH = Math.max(headerY - sillY, 0.2);

  const wallMat = new THREE.MeshStandardMaterial({ color: wallColor || "#ffffff" });
  if (sillY > 0.02) {
    const below = new THREE.Mesh(new THREE.BoxGeometry(len, sillY, wallThickness), wallMat);
    below.position.set(0, sillY / 2, 0);
    below.castShadow = true; below.receiveShadow = true;
    below.userData.part = "body";
    group.add(below);
  }
  if (wallHeight - headerY > 0.02) {
    const above = new THREE.Mesh(new THREE.BoxGeometry(len, wallHeight - headerY, wallThickness), wallMat.clone());
    above.position.set(0, headerY + (wallHeight - headerY) / 2, 0);
    above.castShadow = true; above.receiveShadow = true;
    above.userData.part = "body";
    group.add(above);
  }

  const frameMat = new THREE.MeshStandardMaterial({ color: frameColor, roughness: framePreset.roughness, metalness: framePreset.metalness });
  const frameW = 0.05;
  [-1, 1].forEach(side => {
    const jamb = new THREE.Mesh(new THREE.BoxGeometry(frameW, openingH, wallThickness + 0.01), frameMat);
    jamb.position.set(side * (len / 2 - frameW / 2), sillY + openingH / 2, 0);
    jamb.userData.part = "body";
    group.add(jamb);
  });
  const sillBar = new THREE.Mesh(new THREE.BoxGeometry(len + 0.06, frameW, wallThickness + 0.04), frameMat);
  sillBar.position.set(0, sillY, 0);
  sillBar.userData.part = "body";
  group.add(sillBar);

  if (style.arched) {
    const straightH = openingH * 0.72;
    const archR = len / 2 - frameW;
    const headBar = new THREE.Mesh(new THREE.BoxGeometry(len - frameW * 2, frameW, wallThickness + 0.01), frameMat);
    headBar.position.set(0, sillY + straightH, 0);
    headBar.userData.part = "body";
    const arch = new THREE.Mesh(new THREE.TorusGeometry(archR, frameW / 2, 8, 20, Math.PI), frameMat);
    arch.position.set(0, sillY + straightH, 0);
    arch.userData.part = "body";
    const paneLower = new THREE.Mesh(
      new THREE.BoxGeometry(len - frameW * 2.4, straightH - frameW, 0.02),
      new THREE.MeshStandardMaterial({ color: tint.color, transparent: true, opacity: tint.opacity, roughness: tint.roughness })
    );
    paneLower.position.set(0, sillY + straightH / 2 + frameW / 2, 0);
    paneLower.userData.part = "glass";
    const paneArch = new THREE.Mesh(
      new THREE.CylinderGeometry(archR * 0.9, archR * 0.9, wallThickness * 0.7, 20, 1, true, 0, Math.PI),
      new THREE.MeshStandardMaterial({ color: tint.color, transparent: true, opacity: tint.opacity, roughness: tint.roughness, side: THREE.DoubleSide })
    );
    paneArch.rotation.x = Math.PI / 2; paneArch.rotation.z = Math.PI;
    paneArch.position.set(0, sillY + straightH, 0);
    paneArch.userData.part = "glass";
    group.add(headBar, arch, paneLower, paneArch);
  } else if (style.panes === 2) {
    const mullion = new THREE.Mesh(new THREE.BoxGeometry(frameW * 0.8, openingH, wallThickness + 0.01), frameMat);
    mullion.position.set(0, sillY + openingH / 2, 0);
    mullion.userData.part = "body";
    const paneW = (len - frameW * 3) / 2;
    [-1, 1].forEach(side => {
      const pane = new THREE.Mesh(
        new THREE.BoxGeometry(paneW, openingH - frameW, 0.02),
        new THREE.MeshStandardMaterial({ color: tint.color, transparent: true, opacity: tint.opacity, roughness: tint.roughness })
      );
      pane.position.set(side * (paneW / 2 + frameW * 0.6), sillY + openingH / 2, 0);
      pane.userData.part = "glass";
      group.add(pane);
    });
    const headBar = new THREE.Mesh(new THREE.BoxGeometry(len - frameW * 2, frameW, wallThickness + 0.01), frameMat);
    headBar.position.set(0, sillY + openingH, 0);
    headBar.userData.part = "body";
    group.add(mullion, headBar);
  } else {
    const headBar = new THREE.Mesh(new THREE.BoxGeometry(len - frameW * 2, frameW, wallThickness + 0.01), frameMat);
    headBar.position.set(0, sillY + openingH, 0);
    headBar.userData.part = "body";
    const pane = new THREE.Mesh(
      new THREE.BoxGeometry(len - frameW * 2.4, openingH - frameW * 2, 0.02),
      new THREE.MeshStandardMaterial({ color: tint.color, transparent: true, opacity: tint.opacity, roughness: tint.roughness })
    );
    pane.position.set(0, sillY + openingH / 2, 0);
    pane.userData.part = "glass";
    group.add(headBar, pane);
  }

  const hit = new THREE.Mesh(
    new THREE.BoxGeometry(len, wallHeight, wallThickness + 0.3),
    new THREE.MeshBasicMaterial({ transparent: true, opacity: 0, depthWrite: false })
  );
  hit.position.set(0, wallHeight / 2, 0);
  group.add(hit);

  return group;
}

/* ── Wall-mounted catalog items (wall art / paintings) ──
   Unlike doors/windows, these stay regular placedItems (draggable,
   colorable, deletable through the normal furniture popover) — the only
   difference is where they're allowed to sit: always flush against the
   nearest wall at a fixed hang height, facing into the room, rather than
   free-standing on the floor. computeWallSnap works against either wall
   model in this file: the auto-derived tile-plan walls (Custom Layout) or
   the fixed rectangular room's four walls. */
const WALL_MOUNT_TYPES = new Set(["wall-art"]);
const WALL_ART_HANG_Y = 1.0;   // meters — bottom edge of the frame; combined with each style's ~0.9-0.95m height this centers most pieces close to real-gallery eye level
const WALL_MOUNT_GAP = 0.04;   // clearance off the wall surface so the frame never z-fights/clips into it

function nearestPointOnSegment(x, z, x1, z1, x2, z2) {
  const dx = x2 - x1, dz = z2 - z1;
  const lenSq = dx * dx + dz * dz;
  let t = lenSq > 0 ? ((x - x1) * dx + (z - z1) * dz) / lenSq : 0;
  t = Math.max(0, Math.min(1, t));
  return { x: x1 + t * dx, z: z1 + t * dz };
}

/* Closest point on any wall to (x, z), plus the rotation that makes a
   wall-mounted item's front face (local +z — the same convention every
   frame/canvas mesh in this file already uses) point back into the room.
   The "into the room" direction is simply wall-point → (x, z): whichever
   side the item is being dropped/dragged from is, by definition, the
   room side, so no tile-occupancy analysis is needed. Door/window edges
   are skipped as mount surfaces whenever a plain wall edge also exists —
   hanging a painting across an open doorway doesn't make sense. */
function computeWallSnap(x, z, opts) {
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

/* ── Custom layout: tile-based floor plan geometry, built directly in 3D ── */
function clearGroup(group) {
  while (group.children.length) {
    const obj = group.children.pop();
    group.remove(obj);
    disposeObject3D(obj);
  }
}

function buildFloorPlanGeometry(group, tileSet, wallStyles, doors, windows, wallHeight, floorColor, selectedSegmentId, floorTexture, selectedTileKey) {
  const wallThickness = 0.15;
  const doorEdgeKeys = new Set(Object.keys(doors).filter(k => doors[k]));
  const windowEdgeKeys = new Set(Object.keys(windows || {}).filter(k => windows[k]));

  // One shared texture (if any) reused across every tile's material —
  // each tile shows one full repeat of the pattern rather than a
  // continuous grain across tile seams, which is a fine simplification
  // for a final-polish texture pass.
  const floorTex = floorTexture ? generateFloorTexture(floorTexture) : null;

  // Occupied floor tiles
  tileSet.forEach(key => {
    const { i, j } = CFP.parseTileKey(key);
    const { x, z } = CFP.tileWorldCenter(i, j);

    const geo = new THREE.PlaneGeometry(CFP.TILE_SIZE, CFP.TILE_SIZE);
    const mat = new THREE.MeshStandardMaterial({ color: floorTex ? 0xffffff : (floorColor || "#f0ece8") });
    if (floorTex) mat.map = floorTex;
    // Same red-flag tint language as the wall/door "danger" popover button,
    // so the one tile about to be deleted is unambiguous before confirming.
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
    seam.raycast = () => {}; // never intercepts clicks meant for the tile/wall below
    seam.rotation.x = -Math.PI / 2;
    seam.position.set(x, 0.005, z);
    group.add(seam);
  });

  // Ghost tiles — click to expand the floor
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

  // Walls — auto-derived from the tile boundary, merged, split at doors/windows
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

/* ── Generate procedural wall textures using canvas ── */
function generateTexture(type) {
  const canvas = document.createElement("canvas");
  canvas.width = 512;
  canvas.height = 512;
  const ctx = canvas.getContext("2d");

  if (type === 0) {
    // Plain — solid white
    ctx.fillStyle = "#ffffff";
    ctx.fillRect(0, 0, 512, 512);

  } else if (type === 1) {
    // Subtle — light pattern
    ctx.fillStyle = "#f8f6ff";
    ctx.fillRect(0, 0, 512, 512);
    ctx.strokeStyle = "#ede9fe";
    ctx.lineWidth = 1;
    for (let i = 0; i < 512; i += 32) {
      ctx.beginPath(); ctx.moveTo(i, 0); ctx.lineTo(i, 512); ctx.stroke();
      ctx.beginPath(); ctx.moveTo(0, i); ctx.lineTo(512, i); ctx.stroke();
    }

  } else if (type === 2) {
    // Brick
    ctx.fillStyle = "#e8d5c0";
    ctx.fillRect(0, 0, 512, 512);
    ctx.fillStyle = "#c9a882";
    ctx.strokeStyle = "#b08060";
    ctx.lineWidth = 3;
    const bW = 80, bH = 32;
    for (let row = 0; row < 512 / bH + 1; row++) {
      const offset = (row % 2) * (bW / 2);
      for (let col = -1; col < 512 / bW + 1; col++) {
        const x = col * bW + offset;
        const y = row * bH;
        ctx.fillRect(x + 2, y + 2, bW - 4, bH - 4);
        ctx.strokeRect(x + 2, y + 2, bW - 4, bH - 4);
      }
    }

  } else if (type === 3) {
    // Marble — white with grey veins
    ctx.fillStyle = "#f5f5f5";
    ctx.fillRect(0, 0, 512, 512);
    ctx.strokeStyle = "rgba(180,180,180,0.5)";
    ctx.lineWidth = 2;
    for (let i = 0; i < 8; i++) {
      ctx.beginPath();
      ctx.moveTo(Math.random() * 512, 0);
      ctx.bezierCurveTo(
        Math.random() * 512, Math.random() * 200,
        Math.random() * 512, Math.random() * 400,
        Math.random() * 512, 512
      );
      ctx.stroke();
    }
  }

  return new THREE.CanvasTexture(canvas);
}

/* ── Generate procedural floor textures using canvas ──
   1 = Wood (planks with grain streaks), 2 = Tile (grout-lined squares).
   0/Plain is handled by callers by simply not applying a map. */
function generateFloorTexture(type) {
  const canvas = document.createElement("canvas");
  canvas.width = 256; canvas.height = 256;
  const ctx = canvas.getContext("2d");

  if (type === 1) {
    const plankH = 32;
    for (let y = 0; y < 256; y += plankH) {
      const shade = 38 + Math.random() * 14;
      ctx.fillStyle = `hsl(28, 35%, ${shade}%)`;
      ctx.fillRect(0, y, 256, plankH);
      ctx.strokeStyle = "rgba(0,0,0,0.18)";
      ctx.lineWidth = 1.5;
      ctx.beginPath(); ctx.moveTo(0, y); ctx.lineTo(256, y); ctx.stroke();
      for (let i = 0; i < 4; i++) {
        ctx.strokeStyle = `rgba(60,35,15,${0.08 + Math.random() * 0.08})`;
        ctx.lineWidth = 1;
        const gy = y + Math.random() * plankH;
        ctx.beginPath();
        ctx.moveTo(0, gy);
        ctx.bezierCurveTo(80, gy + Math.random()*4-2, 180, gy + Math.random()*4-2, 256, gy);
        ctx.stroke();
      }
    }
  } else if (type === 2) {
    ctx.fillStyle = "#e8e6ee";
    ctx.fillRect(0, 0, 256, 256);
    const tile = 64;
    for (let y = 0; y < 256; y += tile) for (let x = 0; x < 256; x += tile) {
      const shade = 88 + Math.random() * 8;
      ctx.fillStyle = `hsl(250, 8%, ${shade}%)`;
      ctx.fillRect(x + 2, y + 2, tile - 4, tile - 4);
    }
    ctx.strokeStyle = "#c9c5da";
    ctx.lineWidth = 3;
    for (let i = 0; i <= 256; i += tile) {
      ctx.beginPath(); ctx.moveTo(i, 0); ctx.lineTo(i, 256); ctx.stroke();
      ctx.beginPath(); ctx.moveTo(0, i); ctx.lineTo(256, i); ctx.stroke();
    }
  }

  return new THREE.CanvasTexture(canvas);
}

/* ── Element icon ── */
function ElementIcon({ type }) {
  const icons = {
    "round-table":   <svg viewBox="0 0 40 40" width="26" height="26"><circle cx="20" cy="20" r="14" fill="#ede9fe" stroke="#7c3aed" strokeWidth="2"/><circle cx="20" cy="20" r="6" fill="white" stroke="#a78bfa" strokeWidth="1.5"/></svg>,
    "round-table-banquet": <svg viewBox="0 0 40 40" width="26" height="26"><circle cx="20" cy="20" r="16" fill="#fff" stroke="#f5deb3" strokeWidth="3"/><circle cx="20" cy="20" r="10" fill="#faf6ee" stroke="#e5d3a6" strokeWidth="1.5"/></svg>,
    "rect-table":    <svg viewBox="0 0 40 40" width="26" height="26"><rect x="4" y="13" width="32" height="14" rx="3" fill="#ede9fe" stroke="#7c3aed" strokeWidth="2"/></svg>,
    "rect-table-banquet": <svg viewBox="0 0 40 40" width="26" height="26"><rect x="2" y="10" width="36" height="20" rx="2" fill="#fff" stroke="#f5deb3" strokeWidth="3"/><rect x="7" y="13" width="26" height="7" rx="1" fill="#faf6ee" stroke="#e5d3a6" strokeWidth="1"/></svg>,
    "chair-modern":  <svg viewBox="0 0 40 40" width="26" height="26"><rect x="11" y="8" width="18" height="12" rx="3" fill="#c4b5fd" stroke="#7c3aed" strokeWidth="1.5"/><rect x="11" y="20" width="18" height="5" rx="2" fill="#ede9fe" stroke="#7c3aed" strokeWidth="1.5"/><line x1="13" y1="25" x2="13" y2="34" stroke="#7c3aed" strokeWidth="2"/><line x1="27" y1="25" x2="27" y2="34" stroke="#7c3aed" strokeWidth="2"/></svg>,
    "chair-wedding": <svg viewBox="0 0 40 40" width="26" height="26"><circle cx="20" cy="18" r="9" fill="#f7efdd" stroke="#c9a44c" strokeWidth="1.5"/><path d="M13 10 Q20 4 27 10" fill="none" stroke="#c9a44c" strokeWidth="2"/><line x1="14" y1="27" x2="12" y2="35" stroke="#c9a44c" strokeWidth="2"/><line x1="26" y1="27" x2="28" y2="35" stroke="#c9a44c" strokeWidth="2"/></svg>,
    "chair-banquet": <svg viewBox="0 0 40 40" width="26" height="26"><rect x="9" y="7" width="22" height="14" rx="2" fill="#2c3e50"/><rect x="9" y="21" width="22" height="6" rx="1" fill="#34495e"/><rect x="11" y="27" width="4" height="8" fill="#4a3728"/><rect x="25" y="27" width="4" height="8" fill="#4a3728"/></svg>,
    "sofa-modern":   <svg viewBox="0 0 40 40" width="26" height="26"><rect x="4" y="18" width="32" height="12" rx="4" fill="#7c3aed" opacity="0.8"/><rect x="4" y="12" width="32" height="8" rx="3" fill="#a78bfa"/><rect x="4" y="18" width="6" height="12" rx="2" fill="#6d28d9"/><rect x="30" y="18" width="6" height="12" rx="2" fill="#6d28d9"/></svg>,
    "sofa-classic":  <svg viewBox="0 0 40 40" width="26" height="26"><rect x="6" y="16" width="28" height="12" rx="2" fill="#7c2d3a"/><circle cx="6" cy="20" r="6" fill="#7c2d3a"/><circle cx="34" cy="20" r="6" fill="#7c2d3a"/><circle cx="15" cy="17" r="1.5" fill="#c9a44c"/><circle cx="20" cy="17" r="1.5" fill="#c9a44c"/><circle cx="25" cy="17" r="1.5" fill="#c9a44c"/></svg>,
    "buffet-table":  <svg viewBox="0 0 40 40" width="26" height="26"><rect x="3" y="17" width="34" height="10" rx="2" fill="#fef3c7" stroke="#f59e0b" strokeWidth="1.5"/><circle cx="11" cy="16" r="4" fill="#fde68a" stroke="#f59e0b" strokeWidth="1"/><circle cx="20" cy="16" r="4" fill="#fde68a" stroke="#f59e0b" strokeWidth="1"/><circle cx="29" cy="16" r="4" fill="#fde68a" stroke="#f59e0b" strokeWidth="1"/></svg>,
    "cake-table":    <svg viewBox="0 0 40 40" width="26" height="26"><ellipse cx="20" cy="28" rx="14" ry="4" fill="#fef3c7" stroke="#f59e0b" strokeWidth="1.5"/><rect x="13" y="18" width="14" height="10" rx="2" fill="#fde68a" stroke="#f59e0b" strokeWidth="1.5"/><rect x="16" y="10" width="8" height="10" rx="2" fill="#fbcfe8" stroke="#ec4899" strokeWidth="1"/></svg>,
    "coffee-corner": <svg viewBox="0 0 40 40" width="26" height="26"><rect x="8" y="18" width="24" height="16" rx="3" fill="#78350f"/><rect x="8" y="14" width="24" height="6" rx="2" fill="#92400e"/><circle cx="26" cy="20" r="4" fill="white" stroke="#d97706" strokeWidth="1"/></svg>,
    "flower-wall":   <svg viewBox="0 0 40 40" width="26" height="26"><rect x="4" y="4" width="32" height="32" rx="3" fill="#fce7f3" stroke="#ec4899" strokeWidth="1.5"/><circle cx="12" cy="12" r="5" fill="#fbbf24"/><circle cx="20" cy="12" r="5" fill="#ec4899"/><circle cx="28" cy="12" r="5" fill="#f9a8d4"/><circle cx="12" cy="22" r="5" fill="#f9a8d4"/><circle cx="20" cy="22" r="5" fill="#fbbf24"/><circle cx="28" cy="22" r="5" fill="#ec4899"/></svg>,
    "plant":         <svg viewBox="0 0 40 40" width="26" height="26"><rect x="15" y="28" width="10" height="10" rx="3" fill="#d97706"/><ellipse cx="20" cy="22" rx="10" ry="10" fill="#16a34a"/></svg>,
    "led-wall":      <svg viewBox="0 0 40 40" width="26" height="26"><rect x="3" y="8" width="34" height="22" rx="3" fill="#0f172a" stroke="#0ea5e9" strokeWidth="1.5"/><rect x="6" y="11" width="28" height="16" rx="2" fill="#0ea5e9" opacity="0.7"/></svg>,
    "spotlight":     <svg viewBox="0 0 40 40" width="26" height="26"><line x1="20" y1="4" x2="20" y2="30" stroke="#374151" strokeWidth="3"/><path d="M12 30 L28 30 L24 38 L16 38 Z" fill="#1f2937"/><circle cx="20" cy="28" r="5" fill="#fbbf24" opacity="0.9"/></svg>,
    "bench":         <svg viewBox="0 0 40 40" width="26" height="26"><rect x="3" y="16" width="34" height="6" rx="2" fill="#8B5E3C"/><rect x="6" y="22" width="6" height="10" fill="#5C4033"/><rect x="28" y="22" width="6" height="10" fill="#5C4033"/></svg>,
    "drinks-station": <svg viewBox="0 0 40 40" width="26" height="26"><rect x="7" y="16" width="26" height="16" rx="2" fill="#1e1b4b"/><rect x="5" y="13" width="30" height="5" rx="1" fill="#fff"/><rect x="13" y="4" width="4" height="9" fill="#0ea5e9"/><rect x="19" y="4" width="4" height="9" fill="#10b981"/><rect x="25" y="4" width="4" height="9" fill="#ef4444"/></svg>,
    "ceiling-light": <svg viewBox="0 0 40 40" width="26" height="26"><line x1="20" y1="2" x2="20" y2="22" stroke="#374151" strokeWidth="2"/><path d="M10 22 L30 22 L24 32 L16 32 Z" fill="#fbbf24" opacity="0.9"/><circle cx="20" cy="24" r="3" fill="#fff2c8"/></svg>,
    "chandelier":    <svg viewBox="0 0 40 40" width="26" height="26"><line x1="20" y1="2" x2="20" y2="16" stroke="#374151" strokeWidth="1.5"/><circle cx="20" cy="20" r="10" fill="none" stroke="#C9A44C" strokeWidth="2.5"/><circle cx="20" cy="10" r="2.5" fill="#fff2c8"/><circle cx="28" cy="16" r="2.5" fill="#fff2c8"/><circle cx="28" cy="24" r="2.5" fill="#fff2c8"/><circle cx="20" cy="30" r="2.5" fill="#fff2c8"/><circle cx="12" cy="24" r="2.5" fill="#fff2c8"/><circle cx="12" cy="16" r="2.5" fill="#fff2c8"/></svg>,
    "led-bar":       <svg viewBox="0 0 40 40" width="26" height="26"><line x1="8" y1="34" x2="8" y2="18" stroke="#1f2937" strokeWidth="2.5"/><line x1="32" y1="34" x2="32" y2="18" stroke="#1f2937" strokeWidth="2.5"/><rect x="5" y="14" width="30" height="6" rx="1" fill="#0f172a"/><rect x="7" y="16" width="26" height="2.5" fill="#ec4899"/></svg>,
    "fairy-lights":  <svg viewBox="0 0 40 40" width="26" height="26"><line x1="5" y1="8" x2="5" y2="30" stroke="#374151" strokeWidth="2"/><line x1="35" y1="8" x2="35" y2="30" stroke="#374151" strokeWidth="2"/><path d="M5 12 Q20 26 35 12" fill="none" stroke="#fff2c8" strokeWidth="1" opacity="0.6"/><circle cx="9" cy="14" r="2" fill="#fff2c8"/><circle cx="15" cy="19" r="2" fill="#fff2c8"/><circle cx="20" cy="21" r="2" fill="#fff2c8"/><circle cx="25" cy="19" r="2" fill="#fff2c8"/><circle cx="31" cy="14" r="2" fill="#fff2c8"/></svg>,
    "coffee-booth-modern": <svg viewBox="0 0 40 40" width="26" height="26"><rect x="4" y="14" width="32" height="18" rx="2" fill="#b08968" stroke="#83614c" strokeWidth="1.5"/><rect x="3" y="11" width="34" height="4" rx="1" fill="#8a6f56" stroke="#83614c" strokeWidth="1"/><rect x="6" y="28" width="28" height="3" fill="#e5e5e5"/></svg>,
    "coffee-booth-marble":  <svg viewBox="0 0 40 40" width="26" height="26"><rect x="4" y="14" width="32" height="18" rx="2" fill="#c9a8b0" stroke="#C9A44C" strokeWidth="1.5"/><rect x="3" y="11" width="34" height="4" rx="1" fill="#a8788a"/><line x1="6" y1="16" x2="6" y2="30" stroke="#C9A44C" strokeWidth="1.5"/><line x1="34" y1="16" x2="34" y2="30" stroke="#C9A44C" strokeWidth="1.5"/></svg>,
    "coffee-booth-rustic":  <svg viewBox="0 0 40 40" width="26" height="26"><rect x="3" y="11" width="34" height="4" rx="1" fill="#9c6b3d"/><rect x="4" y="15" width="4" height="17" fill="#8a5a2f"/><rect x="8" y="15" width="4" height="17" fill="#74471f"/><rect x="12" y="15" width="4" height="17" fill="#8a5a2f"/><rect x="16" y="15" width="4" height="17" fill="#74471f"/><rect x="20" y="15" width="4" height="17" fill="#8a5a2f"/><rect x="24" y="15" width="4" height="17" fill="#74471f"/><rect x="28" y="15" width="4" height="17" fill="#8a5a2f"/><rect x="32" y="15" width="4" height="17" fill="#74471f"/></svg>,
    "coffee-booth-curved":  <svg viewBox="0 0 40 40" width="26" height="26"><rect x="8" y="14" width="24" height="18" fill="#5c8aa6" stroke="#3f5f70" strokeWidth="1.5"/><circle cx="8" cy="23" r="9" fill="#5c8aa6" stroke="#3f5f70" strokeWidth="1.5"/><circle cx="32" cy="23" r="9" fill="#5c8aa6" stroke="#3f5f70" strokeWidth="1.5"/><rect x="3" y="11" width="34" height="4" rx="2" fill="#3f6b81"/></svg>,
    "coffee-booth-cart":    <svg viewBox="0 0 40 40" width="26" height="26"><rect x="8" y="10" width="24" height="14" fill="#8a5a2f"/><rect x="6" y="7" width="28" height="4" rx="1" fill="#6f4423"/><circle cx="12" cy="30" r="6" fill="none" stroke="#2c2c2c" strokeWidth="2.5"/><circle cx="28" cy="30" r="6" fill="none" stroke="#2c2c2c" strokeWidth="2.5"/><circle cx="12" cy="30" r="1.5" fill="#C9A44C"/><circle cx="28" cy="30" r="1.5" fill="#C9A44C"/></svg>,
    "coffee-booth-black":   <svg viewBox="0 0 40 40" width="26" height="26"><rect x="4" y="14" width="32" height="18" rx="2" fill="#1a1a1a"/><rect x="3" y="11" width="34" height="4" rx="1" fill="#0d0d0d"/><line x1="6" y1="23" x2="34" y2="23" stroke="#C9A44C" strokeWidth="1"/></svg>,
    "mini-plant":       <svg viewBox="0 0 40 40" width="26" height="26"><rect x="15" y="27" width="10" height="8" rx="2" fill="#d97706"/><circle cx="20" cy="20" r="9" fill="#16a34a"/></svg>,
    "flower-arrangement": <svg viewBox="0 0 40 40" width="26" height="26"><rect x="17" y="22" width="6" height="12" fill="#457b9d" stroke="#305773" strokeWidth="1"/><circle cx="16" cy="16" r="4" fill="#fbbf24"/><circle cx="24" cy="16" r="4" fill="#ec4899"/><circle cx="20" cy="12" r="4" fill="#7c3aed"/></svg>,
    "umbrella-cart":         <svg viewBox="0 0 40 40" width="26" height="26"><path d="M4 12 Q20 2 36 12 Z" fill="#c2703f" stroke="#93532f" strokeWidth="1"/><line x1="20" y1="12" x2="20" y2="24" stroke="#93532f" strokeWidth="1.5"/><rect x="9" y="24" width="22" height="10" rx="1" fill="#c2703f" stroke="#93532f" strokeWidth="1.5"/></svg>,
    "kiosk-booth":           <svg viewBox="0 0 40 40" width="26" height="26"><rect x="10" y="14" width="20" height="20" fill="#6b8f71" stroke="#4a6b50" strokeWidth="1.5"/><path d="M8 14 L20 5 L32 14 Z" fill="#527060" stroke="#4a6b50" strokeWidth="1"/><rect x="15" y="19" width="10" height="12" fill="#f7f3ea" stroke="#4a6b50" strokeWidth="1"/></svg>,
    "umbrella-table":        <svg viewBox="0 0 40 40" width="26" height="26"><path d="M5 14 Q20 4 35 14 Z" fill="#5c8aa6" stroke="#3f5f70" strokeWidth="1"/><line x1="20" y1="14" x2="20" y2="24" stroke="#3f5f70" strokeWidth="1.5"/><ellipse cx="20" cy="30" rx="13" ry="5" fill="#5c8aa6" stroke="#3f5f70" strokeWidth="1.5"/></svg>,
    "display-pedestals":     <svg viewBox="0 0 40 40" width="26" height="26"><rect x="6" y="18" width="8" height="16" fill="#6b4e8c" stroke="#4a3663" strokeWidth="1.5"/><rect x="17" y="10" width="8" height="24" fill="#54397a" stroke="#4a3663" strokeWidth="1.5"/><rect x="28" y="22" width="7" height="12" fill="#6b4e8c" stroke="#4a3663" strokeWidth="1.5"/></svg>,
    "mini-umbrella-cart":    <svg viewBox="0 0 40 40" width="26" height="26"><path d="M7 13 Q20 5 33 13 Z" fill="#c2604f" stroke="#8f4638" strokeWidth="1"/><line x1="20" y1="13" x2="20" y2="24" stroke="#8f4638" strokeWidth="1.5"/><rect x="11" y="24" width="18" height="9" rx="1" fill="#c2604f" stroke="#8f4638" strokeWidth="1.5"/></svg>,
    "umbrella-cart-wheeled": <svg viewBox="0 0 40 40" width="26" height="26"><path d="M6 13 Q19 5 32 13 Z" fill="#7c8471" stroke="#576050" strokeWidth="1"/><line x1="19" y1="13" x2="19" y2="24" stroke="#576050" strokeWidth="1.5"/><rect x="9" y="24" width="18" height="8" rx="1" fill="#7c8471" stroke="#576050" strokeWidth="1.5"/><circle cx="29" cy="32" r="4" fill="none" stroke="#2c2c2c" strokeWidth="2"/></svg>,
    "curtain-photo-booth":   <svg viewBox="0 0 40 40" width="26" height="26"><path d="M9 12 Q20 6 31 12 L31 32 Q20 36 9 32 Z" fill="#b5647a" stroke="#874a5b" strokeWidth="1.5"/><rect x="15" y="4" width="10" height="5" rx="1" fill="#874a5b" stroke="#874a5b" strokeWidth="1"/><path d="M17 14 L17 32" stroke="#f7f3ea" strokeWidth="4"/><path d="M23 14 L23 32" stroke="#f7f3ea" strokeWidth="4"/></svg>,
    "backdrop-wall":         <svg viewBox="0 0 40 40" width="26" height="26"><rect x="4" y="6" width="10" height="28" fill="#4f6b8a" stroke="#365068" strokeWidth="1.5"/><rect x="15" y="6" width="10" height="28" fill="#3a516b" stroke="#365068" strokeWidth="1.5"/><rect x="26" y="6" width="10" height="28" fill="#4f6b8a" stroke="#365068" strokeWidth="1.5"/><circle cx="9" cy="16" r="3" fill="none" stroke="#365068" strokeWidth="1.2"/><circle cx="31" cy="16" r="3" fill="none" stroke="#365068" strokeWidth="1.2"/></svg>,
    "floral-arch-backdrop": <svg viewBox="0 0 40 40" width="26" height="26"><path d="M9 34 L9 16 Q9 8 17 8 Q17 16 17 34 Z" fill="#8a9b7a" stroke="#5f7052" strokeWidth="1.5"/><path d="M22 34 L22 17 Q22 10 29 10 Q29 17 29 34 Z" fill="#6f7d62" stroke="#5f7052" strokeWidth="1.5"/><circle cx="11" cy="10" r="3" fill="#f7d9e3"/><circle cx="15" cy="8" r="2.5" fill="#ffffff" stroke="#ddd" strokeWidth="1"/></svg>,
    "drape-arch-backdrop": <svg viewBox="0 0 40 40" width="26" height="26"><path d="M6 34 L6 16 Q20 4 34 16 L34 34 Z" fill="#5c6e8a" stroke="#405068" strokeWidth="1.5"/><path d="M15 34 L15 12 Q20 10 25 12 L25 34 Z" fill="#f7f3ea" stroke="#ddd" strokeWidth="1"/></svg>,
    "balloon-arch-bow": <svg viewBox="0 0 40 40" width="26" height="26"><circle cx="10" cy="30" r="4" fill="#ef476f" stroke="#b8283f" strokeWidth="1.2"/><circle cx="9" cy="21" r="4.5" fill="#ef476f" stroke="#b8283f" strokeWidth="1.2"/><circle cx="13" cy="12" r="5" fill="#ef476f" stroke="#b8283f" strokeWidth="1.2"/><circle cx="21" cy="8" r="5" fill="#ef476f" stroke="#b8283f" strokeWidth="1.2"/><circle cx="29" cy="12" r="5" fill="#ef476f" stroke="#b8283f" strokeWidth="1.2"/><circle cx="33" cy="21" r="4.5" fill="#ef476f" stroke="#b8283f" strokeWidth="1.2"/><circle cx="16" cy="26" r="2.5" fill="#ef476f" stroke="#b8283f" strokeWidth="1"/></svg>,
    "name-arch-backdrop": <svg viewBox="0 0 40 40" width="26" height="26"><path d="M9 34 L9 16 Q9 8 17 8 Q17 16 17 34 Z" fill="#c9a44c" stroke="#9c7c33" strokeWidth="1.5"/><path d="M22 34 L22 16 Q22 8 30 8 Q30 16 30 34 Z" fill="#c9a44c" stroke="#9c7c33" strokeWidth="1.5"/><line x1="12" y1="24" x2="27" y2="24" stroke="#7c3aed" strokeWidth="1.2" opacity="0.5"/><circle cx="12" cy="10" r="2.5" fill="#f7d9e3"/></svg>,
    "window-counter-booth": <svg viewBox="0 0 40 40" width="26" height="26"><rect x="6" y="18" width="28" height="14" fill="#3f6b6f" stroke="#294a4d" strokeWidth="1.5"/><rect x="8" y="8" width="24" height="10" fill="#2c4f52" stroke="#294a4d" strokeWidth="1.5"/><line x1="14" y1="8" x2="14" y2="18" stroke="#294a4d" strokeWidth="1"/><line x1="20" y1="8" x2="20" y2="18" stroke="#294a4d" strokeWidth="1"/><line x1="26" y1="8" x2="26" y2="18" stroke="#294a4d" strokeWidth="1"/></svg>,
    "panel-sconce-stand": <svg viewBox="0 0 40 40" width="26" height="26"><rect x="8" y="4" width="12" height="32" fill="#6b4e71" stroke="#4a3550" strokeWidth="1.5"/><rect x="23" y="14" width="9" height="22" fill="#523a57" stroke="#4a3550" strokeWidth="1.5"/><circle cx="14" cy="12" r="2.5" fill="#fff2c8" stroke="#ddd" strokeWidth="1"/></svg>,
    "arch-bookshelf": <svg viewBox="0 0 40 40" width="26" height="26"><path d="M10 34 L10 16 Q10 6 20 6 Q30 6 30 16 L30 34 Z" fill="#8a5a44" stroke="#684230" strokeWidth="1.5"/><line x1="10" y1="16" x2="30" y2="16" stroke="#684230" strokeWidth="1"/><line x1="10" y1="22" x2="30" y2="22" stroke="#684230" strokeWidth="1"/><line x1="10" y1="28" x2="30" y2="28" stroke="#684230" strokeWidth="1"/></svg>,
    "curtain-backdrop-bow": <svg viewBox="0 0 40 40" width="26" height="26"><line x1="4" y1="7" x2="36" y2="7" stroke="#999" strokeWidth="1.5"/><path d="M6 8 L16 8 L16 34 L6 34 Q10 20 6 8 Z" fill="#8b2e3f" stroke="#6b212f" strokeWidth="1.2"/><path d="M34 8 L24 8 L24 34 L34 34 Q30 20 34 8 Z" fill="#8b2e3f" stroke="#6b212f" strokeWidth="1.2"/><circle cx="16" cy="13" r="2" fill="none" stroke="#6b212f" strokeWidth="1"/><circle cx="24" cy="13" r="2" fill="none" stroke="#6b212f" strokeWidth="1"/></svg>,
    "storefront-facade": <svg viewBox="0 0 40 40" width="26" height="26"><rect x="4" y="10" width="32" height="24" fill="#2f4858" stroke="#1c2c37" strokeWidth="1.5"/><path d="M6 10 Q11 5 16 10 Z" fill="#d97676"/><path d="M16 10 Q20 4 24 10 Z" fill="#d97676"/><path d="M24 10 Q29 5 34 10 Z" fill="#d97676"/><rect x="7" y="14" width="7" height="10" fill="#1c2c37" stroke="#1c2c37" strokeWidth="1"/><rect x="17" y="12" width="6" height="12" fill="#1c2c37" stroke="#1c2c37" strokeWidth="1"/><rect x="26" y="14" width="7" height="10" fill="#1c2c37" stroke="#1c2c37" strokeWidth="1"/></svg>,
    "paneled-counter": <svg viewBox="0 0 40 40" width="26" height="26"><rect x="4" y="16" width="32" height="4" fill="#6b7a4e" stroke="#4e5a38" strokeWidth="1.2"/><rect x="6" y="20" width="28" height="14" fill="#6b7a4e" stroke="#4e5a38" strokeWidth="1.5"/><rect x="12" y="23" width="16" height="8" fill="#4e5a38" stroke="#4e5a38" strokeWidth="1"/></svg>,
    "round-reception-desk": <svg viewBox="0 0 40 40" width="26" height="26"><path d="M8 32 Q8 18 20 18 Q32 18 32 32 Z" fill="#4a5859" stroke="#333e3f" strokeWidth="1.5"/><path d="M14 18 L14 8 Q20 4 26 8 L26 18" fill="none" stroke="#333e3f" strokeWidth="1.5"/><circle cx="24" cy="12" r="1.8" fill="#fff2c8" stroke="#ddd" strokeWidth="0.8"/></svg>,
    "arch-panel-plain": <svg viewBox="0 0 40 40" width="26" height="26"><path d="M10 34 L10 14 Q10 6 20 6 Q30 6 30 14 L30 34 Z" fill="#b5654f" stroke="#8a4a39" strokeWidth="1.5"/></svg>,
    "arch-panel-fluted": <svg viewBox="0 0 40 40" width="26" height="26"><path d="M10 34 L10 14 Q10 6 20 6 Q30 6 30 14 L30 34 Z" fill="#5c4a7c" stroke="#43365c" strokeWidth="1.5"/><line x1="14" y1="12" x2="14" y2="34" stroke="#43365c" strokeWidth="1"/><line x1="18" y1="8" x2="18" y2="34" stroke="#43365c" strokeWidth="1"/><line x1="22" y1="8" x2="22" y2="34" stroke="#43365c" strokeWidth="1"/><line x1="26" y1="12" x2="26" y2="34" stroke="#43365c" strokeWidth="1"/></svg>,
    "dual-arch-mixed": <svg viewBox="0 0 40 40" width="26" height="26"><path d="M4 34 L4 16 Q4 9 11 9 Q18 9 18 16 L18 34 Z" fill="#c97b5f" stroke="#9c5a42" strokeWidth="1.5"/><path d="M22 34 L22 16 Q22 9 29 9 Q36 9 36 16 L36 34 Z" fill="#c97b5f" stroke="#9c5a42" strokeWidth="1.5"/><line x1="25" y1="14" x2="25" y2="34" stroke="#9c5a42" strokeWidth="1"/><line x1="29" y1="10" x2="29" y2="34" stroke="#9c5a42" strokeWidth="1"/><line x1="33" y1="14" x2="33" y2="34" stroke="#9c5a42" strokeWidth="1"/></svg>,
    "pedestal-duo-plain": <svg viewBox="0 0 40 40" width="26" height="26"><rect x="6" y="20" width="10" height="14" rx="2" fill="#6b8f71" stroke="#4a6b50" strokeWidth="1.5"/><rect x="22" y="10" width="10" height="24" rx="2" fill="#527060" stroke="#4a6b50" strokeWidth="1.5"/></svg>,
    "pedestal-duo-fluted": <svg viewBox="0 0 40 40" width="26" height="26"><rect x="6" y="20" width="10" height="14" rx="2" fill="#9b6f7a" stroke="#714f57" strokeWidth="1.5"/><line x1="9" y1="20" x2="9" y2="34" stroke="#714f57" strokeWidth="0.8"/><line x1="13" y1="20" x2="13" y2="34" stroke="#714f57" strokeWidth="0.8"/><rect x="22" y="10" width="10" height="24" rx="2" fill="#78525c" stroke="#714f57" strokeWidth="1.5"/><line x1="25" y1="10" x2="25" y2="34" stroke="#714f57" strokeWidth="0.8"/><line x1="29" y1="10" x2="29" y2="34" stroke="#714f57" strokeWidth="0.8"/></svg>,
    "pedestal-single-plain": <svg viewBox="0 0 40 40" width="26" height="26"><rect x="13" y="10" width="14" height="24" rx="2" fill="#4f6b4f" stroke="#374a37" strokeWidth="1.5"/></svg>,
    "pedestal-single-fluted": <svg viewBox="0 0 40 40" width="26" height="26"><rect x="13" y="10" width="14" height="24" rx="2" fill="#a3773f" stroke="#785a2e" strokeWidth="1.5"/><line x1="17" y1="10" x2="17" y2="34" stroke="#785a2e" strokeWidth="0.8"/><line x1="20" y1="10" x2="20" y2="34" stroke="#785a2e" strokeWidth="0.8"/><line x1="23" y1="10" x2="23" y2="34" stroke="#785a2e" strokeWidth="0.8"/></svg>,
    "fluted-panel-wall": <svg viewBox="0 0 40 40" width="26" height="26"><rect x="8" y="6" width="24" height="28" fill="#4a5859" stroke="#333e3f" strokeWidth="1.5"/><line x1="12" y1="6" x2="12" y2="34" stroke="#333e3f" strokeWidth="0.8"/><line x1="16" y1="6" x2="16" y2="34" stroke="#333e3f" strokeWidth="0.8"/><line x1="20" y1="6" x2="20" y2="34" stroke="#333e3f" strokeWidth="0.8"/><line x1="24" y1="6" x2="24" y2="34" stroke="#333e3f" strokeWidth="0.8"/><line x1="28" y1="6" x2="28" y2="34" stroke="#333e3f" strokeWidth="0.8"/></svg>,
    "tiered-stand-fluted": <svg viewBox="0 0 40 40" width="26" height="26"><rect x="14" y="24" width="12" height="10" rx="1" fill="#c9a44c" stroke="#9c7c33" strokeWidth="1.5"/><ellipse cx="20" cy="22" rx="13" ry="3" fill="#9c7c33" stroke="#9c7c33" strokeWidth="1"/><ellipse cx="20" cy="15" rx="9" ry="2.5" fill="#9c7c33" stroke="#9c7c33" strokeWidth="1"/><ellipse cx="20" cy="9" rx="5" ry="2" fill="#9c7c33" stroke="#9c7c33" strokeWidth="1"/></svg>,
    "tiered-stand-acrylic": <svg viewBox="0 0 40 40" width="26" height="26"><line x1="20" y1="34" x2="20" y2="6" stroke="#5c8aa6" strokeWidth="1"/><ellipse cx="20" cy="30" rx="10" ry="2.5" fill="#8fb8c9" stroke="#5c8aa6" strokeWidth="1"/><ellipse cx="20" cy="20" rx="7" ry="2" fill="#8fb8c9" stroke="#5c8aa6" strokeWidth="1"/><ellipse cx="20" cy="11" rx="4.5" ry="1.5" fill="#8fb8c9" stroke="#5c8aa6" strokeWidth="1"/></svg>,
    "card-box": <svg viewBox="0 0 40 40" width="26" height="26"><rect x="9" y="14" width="22" height="20" fill="#a13d5c" stroke="#7a2d44" strokeWidth="1.5"/><rect x="16" y="9" width="8" height="3" rx="1" fill="#2c2c2c"/></svg>,
    "guest-book": <svg viewBox="0 0 40 40" width="26" height="26"><rect x="11" y="7" width="18" height="26" rx="1" fill="#3d5a80" stroke="#293e58" strokeWidth="1.5" transform="rotate(3 20 20)"/><rect x="10" y="7" width="3" height="26" fill="#e8e8e8" transform="rotate(3 20 20)"/></svg>,
    "fluted-bowl-duo": <svg viewBox="0 0 40 40" width="26" height="26"><ellipse cx="14" cy="26" rx="10" ry="7" fill="#6f9b7a" stroke="#4c7156" strokeWidth="1.5"/><ellipse cx="28" cy="29" rx="7" ry="5" fill="#557a5f" stroke="#4c7156" strokeWidth="1.5"/></svg>,
    "fluted-vase": <svg viewBox="0 0 40 40" width="26" height="26"><path d="M15 34 L14 12 Q14 6 20 6 Q26 6 26 12 L25 34 Z" fill="#8a5a44" stroke="#684230" strokeWidth="1.5"/><line x1="17" y1="10" x2="16.3" y2="34" stroke="#684230" strokeWidth="0.8"/><line x1="23" y1="10" x2="23.7" y2="34" stroke="#684230" strokeWidth="0.8"/></svg>,
    "flower-cluster-spray": <svg viewBox="0 0 40 40" width="26" height="26"><circle cx="14" cy="18" r="3" fill="#ffffff" stroke="#ccc" strokeWidth="1"/><circle cx="20" cy="12" r="3.5" fill="#ffffff" stroke="#ccc" strokeWidth="1"/><circle cx="26" cy="17" r="3" fill="#ffffff" stroke="#ccc" strokeWidth="1"/><circle cx="17" cy="24" r="3.2" fill="#f5f5f5" stroke="#ccc" strokeWidth="1"/><circle cx="24" cy="25" r="3" fill="#f5f5f5" stroke="#ccc" strokeWidth="1"/><line x1="22" y1="10" x2="24" y2="4" stroke="#ddd" strokeWidth="1"/><line x1="26" y1="14" x2="30" y2="9" stroke="#ddd" strokeWidth="1"/></svg>,
    "flower-cluster-bouquet": <svg viewBox="0 0 40 40" width="26" height="26"><circle cx="13" cy="22" r="4" fill="#ffffff" stroke="#ccc" strokeWidth="1"/><circle cx="20" cy="16" r="4.5" fill="#ffffff" stroke="#ccc" strokeWidth="1"/><circle cx="27" cy="22" r="4" fill="#ffffff" stroke="#ccc" strokeWidth="1"/><circle cx="16" cy="27" r="3.5" fill="#f5f5f5" stroke="#ccc" strokeWidth="1"/><circle cx="24" cy="27" r="3.5" fill="#f5f5f5" stroke="#ccc" strokeWidth="1"/><circle cx="20" cy="24" r="3.8" fill="#f0f0f0" stroke="#ccc" strokeWidth="1"/></svg>,
    "candle-cluster": <svg viewBox="0 0 40 40" width="26" height="26"><rect x="8" y="20" width="7" height="14" rx="1" fill="#eaf4f5" stroke="#ccc" strokeWidth="1"/><rect x="17" y="8" width="8" height="26" rx="1" fill="#eaf4f5" stroke="#ccc" strokeWidth="1"/><rect x="27" y="16" width="6" height="18" rx="1" fill="#eaf4f5" stroke="#ccc" strokeWidth="1"/><rect x="9.5" y="26" width="4" height="7" fill="#faf6ee"/><rect x="18.5" y="14" width="5" height="18" fill="#faf6ee"/><rect x="28" y="22" width="3.5" height="10" fill="#faf6ee"/><circle cx="21" cy="12" r="1.3" fill="#fff2c8"/></svg>,
    "floral-swag-horizontal": <svg viewBox="0 0 40 40" width="26" height="26"><path d="M4 22 Q20 30 36 22" fill="none" stroke="#8bab7a" strokeWidth="2"/><circle cx="9" cy="21" r="2.6" fill="#ffffff" stroke="#ccc" strokeWidth="1"/><circle cx="16" cy="25.5" r="3" fill="#ffffff" stroke="#ccc" strokeWidth="1"/><circle cx="24" cy="25.5" r="3" fill="#f7f0e3" stroke="#ccc" strokeWidth="1"/><circle cx="31" cy="21" r="2.6" fill="#ffffff" stroke="#ccc" strokeWidth="1"/></svg>,
    "floral-swag-corner": <svg viewBox="0 0 40 40" width="26" height="26"><path d="M8 8 Q20 12 24 26 T28 34" fill="none" stroke="#8bab7a" strokeWidth="2"/><circle cx="10" cy="9" r="3.4" fill="#ffffff" stroke="#ccc" strokeWidth="1"/><circle cx="16" cy="12" r="3" fill="#f7f0e3" stroke="#ccc" strokeWidth="1"/><circle cx="21" cy="18" r="2.4" fill="#ffffff" stroke="#ccc" strokeWidth="1"/><circle cx="24" cy="26" r="1.8" fill="#f7f0e3" stroke="#ccc" strokeWidth="1"/></svg>,
    "floral-cascade-teardrop": <svg viewBox="0 0 40 40" width="26" height="26"><circle cx="18" cy="10" r="3.6" fill="#ffffff" stroke="#ccc" strokeWidth="1"/><circle cx="23" cy="9" r="3" fill="#f7f0e3" stroke="#ccc" strokeWidth="1"/><circle cx="20" cy="14" r="2.6" fill="#ffffff" stroke="#ccc" strokeWidth="1"/><path d="M20 16 Q19 24 20 34" fill="none" stroke="#8bab7a" strokeWidth="1.6"/><circle cx="20" cy="27" r="1.4" fill="#ffffff" stroke="#ccc" strokeWidth="0.8"/></svg>,
    "floral-arch-garland": <svg viewBox="0 0 40 40" width="26" height="26"><path d="M6 30 Q6 8 20 8 Q34 8 34 30" fill="none" stroke="#8bab7a" strokeWidth="2"/><circle cx="7" cy="24" r="2.6" fill="#ffffff" stroke="#ccc" strokeWidth="1"/><circle cx="12" cy="12" r="2.8" fill="#f7f0e3" stroke="#ccc" strokeWidth="1"/><circle cx="20" cy="8" r="3" fill="#ffffff" stroke="#ccc" strokeWidth="1"/><circle cx="28" cy="12" r="2.8" fill="#f7f0e3" stroke="#ccc" strokeWidth="1"/><circle cx="33" cy="24" r="2.6" fill="#ffffff" stroke="#ccc" strokeWidth="1"/></svg>,
    "floral-swag-crescent": <svg viewBox="0 0 40 40" width="26" height="26"><path d="M6 14 Q20 26 34 14" fill="none" stroke="#8bab7a" strokeWidth="2"/><circle cx="10" cy="16" r="2.6" fill="#ffffff" stroke="#ccc" strokeWidth="1"/><circle cx="17" cy="21" r="3" fill="#f7f0e3" stroke="#ccc" strokeWidth="1"/><circle cx="24" cy="21" r="3" fill="#ffffff" stroke="#ccc" strokeWidth="1"/><circle cx="30" cy="16" r="2.6" fill="#f7f0e3" stroke="#ccc" strokeWidth="1"/></svg>,
    "bouquet-round-rose": <svg viewBox="0 0 40 40" width="26" height="26"><path d="M14 34 L20 23 L26 34 Z" fill="#f7f3ea" stroke="#ccc" strokeWidth="1"/><circle cx="14" cy="16" r="3" fill="#ffffff" stroke="#ccc" strokeWidth="1"/><circle cx="20" cy="12" r="3.4" fill="#ffffff" stroke="#ccc" strokeWidth="1"/><circle cx="26" cy="16" r="3" fill="#f7f0e3" stroke="#ccc" strokeWidth="1"/><circle cx="17" cy="20" r="2.8" fill="#f7f0e3" stroke="#ccc" strokeWidth="1"/><circle cx="23" cy="20" r="2.8" fill="#ffffff" stroke="#ccc" strokeWidth="1"/></svg>,
    "bouquet-cascade": <svg viewBox="0 0 40 40" width="26" height="26"><path d="M14 26 L20 18 L26 26 Z" fill="#f7f3ea" stroke="#ccc" strokeWidth="1"/><circle cx="16" cy="13" r="2.6" fill="#ffffff" stroke="#ccc" strokeWidth="1"/><circle cx="22" cy="11" r="2.8" fill="#f7f0e3" stroke="#ccc" strokeWidth="1"/><circle cx="20" cy="16" r="2.4" fill="#ffffff" stroke="#ccc" strokeWidth="1"/><path d="M20 20 Q19 28 20 36" fill="none" stroke="#8bab7a" strokeWidth="1.4"/><circle cx="20" cy="29" r="1.6" fill="#ffffff" stroke="#ccc" strokeWidth="0.8"/><circle cx="19" cy="35" r="1.2" fill="#f7f0e3" stroke="#ccc" strokeWidth="0.8"/></svg>,
    "bouquet-wildflower": <svg viewBox="0 0 40 40" width="26" height="26"><path d="M14 34 L20 24 L26 34 Z" fill="#f7f3ea" stroke="#ccc" strokeWidth="1"/><circle cx="13" cy="17" r="2.6" fill="#ffffff" stroke="#ccc" strokeWidth="1"/><circle cx="20" cy="12" r="3" fill="#f7f0e3" stroke="#ccc" strokeWidth="1"/><circle cx="27" cy="17" r="2.6" fill="#ffffff" stroke="#ccc" strokeWidth="1"/><circle cx="17" cy="21" r="2.2" fill="#f0eee0" stroke="#ccc" strokeWidth="1"/><line x1="10" y1="20" x2="6" y2="12" stroke="#7f9a6b" strokeWidth="1.4"/><line x1="30" y1="20" x2="34" y2="13" stroke="#7f9a6b" strokeWidth="1.4"/></svg>,
    "bouquet-lily": <svg viewBox="0 0 40 40" width="26" height="26"><path d="M15 34 L20 24 L25 34 Z" fill="#f7f3ea" stroke="#ccc" strokeWidth="1"/><ellipse cx="12" cy="16" rx="4" ry="2.4" fill="#ffffff" stroke="#ccc" strokeWidth="1" transform="rotate(-25 12 16)"/><ellipse cx="20" cy="11" rx="4.2" ry="2.4" fill="#f7f0e3" stroke="#ccc" strokeWidth="1"/><ellipse cx="28" cy="16" rx="4" ry="2.4" fill="#ffffff" stroke="#ccc" strokeWidth="1" transform="rotate(25 28 16)"/></svg>,
    "bouquet-tulip": <svg viewBox="0 0 40 40" width="26" height="26"><path d="M14 34 L20 25 L26 34 Z" fill="#f7f3ea" stroke="#ccc" strokeWidth="1"/><ellipse cx="14" cy="18" rx="2.6" ry="4" fill="#ffffff" stroke="#ccc" strokeWidth="1"/><ellipse cx="20" cy="14" rx="2.8" ry="4.4" fill="#f7f0e3" stroke="#ccc" strokeWidth="1"/><ellipse cx="26" cy="18" rx="2.6" ry="4" fill="#ffffff" stroke="#ccc" strokeWidth="1"/><ellipse cx="20" cy="20" rx="2.6" ry="4" fill="#fffdf8" stroke="#ccc" strokeWidth="1"/></svg>,
    "bouquet-calla": <svg viewBox="0 0 40 40" width="26" height="26"><path d="M15 34 L20 26 L25 34 Z" fill="#f7f3ea" stroke="#ccc" strokeWidth="1"/><path d="M20 24 Q14 20 15 12 Q19 15 20 24 Z" fill="#fffdf8" stroke="#ccc" strokeWidth="1"/><path d="M20 24 Q26 20 25 12 Q21 15 20 24 Z" fill="#ffffff" stroke="#ccc" strokeWidth="1"/><path d="M20 24 Q20 15 20 9" fill="none" stroke="#ccc" strokeWidth="1"/><circle cx="20" cy="10" r="1.2" fill="#f3c94d"/></svg>,
    "flower-stem-orchid": <svg viewBox="0 0 40 40" width="26" height="26"><path d="M20 36 Q17 22 22 10" fill="none" stroke="#6fae5c" strokeWidth="1.6"/><ellipse cx="22" cy="9" rx="2.6" ry="1.4" fill="#f7f0e3" stroke="#ccc" strokeWidth="0.8"/><ellipse cx="18.5" cy="10.5" rx="2.6" ry="1.4" fill="#ffffff" stroke="#ccc" strokeWidth="0.8" transform="rotate(60 18.5 10.5)"/><ellipse cx="19" cy="7.5" rx="2.6" ry="1.4" fill="#ffffff" stroke="#ccc" strokeWidth="0.8" transform="rotate(-60 19 7.5)"/><circle cx="21" cy="9.5" r="1.3" fill="#f3c94d"/></svg>,
    "flower-stem-lisianthus": <svg viewBox="0 0 40 40" width="26" height="26"><path d="M20 36 L20 16" fill="none" stroke="#4d7c3f" strokeWidth="1.6"/><circle cx="20" cy="10" r="4" fill="#ffffff" stroke="#ccc" strokeWidth="1"/><circle cx="14" cy="17" r="3" fill="#f7f0e3" stroke="#ccc" strokeWidth="1"/><circle cx="26" cy="20" r="3" fill="#ffffff" stroke="#ccc" strokeWidth="1"/></svg>,
    "flower-stem-carnation": <svg viewBox="0 0 40 40" width="26" height="26"><path d="M20 36 L20 18" fill="none" stroke="#4d7c3f" strokeWidth="1.6"/><circle cx="20" cy="11" r="5" fill="#fdf6e9" stroke="#ccc" strokeWidth="1"/><circle cx="17" cy="9" r="2" fill="#ffffff" stroke="#ccc" strokeWidth="0.7"/><circle cx="23" cy="9" r="2" fill="#ffffff" stroke="#ccc" strokeWidth="0.7"/><circle cx="20" cy="13" r="2" fill="#ffffff" stroke="#ccc" strokeWidth="0.7"/></svg>,
    "flower-stem-babys-breath": <svg viewBox="0 0 40 40" width="26" height="26"><path d="M20 36 Q19 24 20 16 M20 24 Q14 20 12 12 M20 22 Q26 18 28 10 M20 18 Q16 14 15 8" fill="none" stroke="#6fae5c" strokeWidth="1"/><circle cx="20" cy="16" r="1.3" fill="#fffdf8" stroke="#ccc" strokeWidth="0.6"/><circle cx="12" cy="12" r="1.1" fill="#fffdf8" stroke="#ccc" strokeWidth="0.6"/><circle cx="28" cy="10" r="1.1" fill="#fffdf8" stroke="#ccc" strokeWidth="0.6"/><circle cx="15" cy="8" r="1.1" fill="#fffdf8" stroke="#ccc" strokeWidth="0.6"/><circle cx="24" cy="14" r="1" fill="#fffdf8" stroke="#ccc" strokeWidth="0.6"/></svg>,
    "flower-stem-delphinium": <svg viewBox="0 0 40 40" width="26" height="26"><path d="M20 36 L20 8" fill="none" stroke="#4d7c3f" strokeWidth="1.6"/><circle cx="20" cy="9" r="1.6" fill="#ffffff" stroke="#ccc" strokeWidth="0.6"/><circle cx="18" cy="13" r="1.6" fill="#f7f0e3" stroke="#ccc" strokeWidth="0.6"/><circle cx="22" cy="13" r="1.6" fill="#ffffff" stroke="#ccc" strokeWidth="0.6"/><circle cx="18" cy="17" r="1.6" fill="#ffffff" stroke="#ccc" strokeWidth="0.6"/><circle cx="22" cy="17" r="1.6" fill="#f7f0e3" stroke="#ccc" strokeWidth="0.6"/><circle cx="18" cy="21" r="1.6" fill="#f7f0e3" stroke="#ccc" strokeWidth="0.6"/><circle cx="22" cy="21" r="1.6" fill="#ffffff" stroke="#ccc" strokeWidth="0.6"/></svg>,
    "flower-stem-rose": <svg viewBox="0 0 40 40" width="26" height="26"><path d="M20 36 L20 18" fill="none" stroke="#4d7c3f" strokeWidth="1.6"/><circle cx="20" cy="11" r="5.2" fill="#ffffff" stroke="#ccc" strokeWidth="1"/><circle cx="20" cy="11" r="2.6" fill="#f7f0e3" stroke="#ccc" strokeWidth="0.8"/></svg>,
    "greenery-stem-fern": <svg viewBox="0 0 40 40" width="26" height="26"><path d="M20 36 L20 8" fill="none" stroke="#6fae5c" strokeWidth="1.4"/><path d="M20 12 L14 9 M20 12 L26 9 M20 17 L13 14 M20 17 L27 14 M20 22 L14 20 M20 22 L26 20" fill="none" stroke="#6fae5c" strokeWidth="1.2"/></svg>,
    "greenery-stem-eucalyptus-silver": <svg viewBox="0 0 40 40" width="26" height="26"><path d="M20 36 L20 8" fill="none" stroke="#b9c9ad" strokeWidth="1.4"/><circle cx="15" cy="12" r="2.4" fill="#b9c9ad" stroke="#ccc" strokeWidth="0.6"/><circle cx="25" cy="16" r="2.4" fill="#b9c9ad" stroke="#ccc" strokeWidth="0.6"/><circle cx="15" cy="20" r="2.4" fill="#b9c9ad" stroke="#ccc" strokeWidth="0.6"/><circle cx="25" cy="24" r="2.4" fill="#b9c9ad" stroke="#ccc" strokeWidth="0.6"/></svg>,
    "greenery-stem-olive": <svg viewBox="0 0 40 40" width="26" height="26"><path d="M20 36 L20 8" fill="none" stroke="#7f9a6b" strokeWidth="1.4"/><ellipse cx="14" cy="13" rx="3.6" ry="1.4" fill="#7f9a6b" transform="rotate(-20 14 13)"/><ellipse cx="26" cy="17" rx="3.6" ry="1.4" fill="#7f9a6b" transform="rotate(20 26 17)"/><ellipse cx="14" cy="21" rx="3.6" ry="1.4" fill="#7f9a6b" transform="rotate(-20 14 21)"/><ellipse cx="26" cy="25" rx="3.6" ry="1.4" fill="#7f9a6b" transform="rotate(20 26 25)"/></svg>,
    "greenery-stem-asparagus-fern": <svg viewBox="0 0 40 40" width="26" height="26"><path d="M20 36 L20 8" fill="none" stroke="#5f9e57" strokeWidth="1.2"/><path d="M20 10 L12 8 M20 12 L28 10 M20 15 L11 13 M20 17 L29 15 M20 20 L12 18 M20 22 L28 20 M20 25 L13 23 M20 27 L27 25" fill="none" stroke="#5f9e57" strokeWidth="0.9"/></svg>,
    "greenery-stem-eucalyptus-round": <svg viewBox="0 0 40 40" width="26" height="26"><path d="M20 36 L20 8" fill="none" stroke="#6f9a5c" strokeWidth="1.4"/><circle cx="15" cy="12" r="2.4" fill="#6f9a5c" stroke="#ccc" strokeWidth="0.6"/><circle cx="25" cy="16" r="2.4" fill="#6f9a5c" stroke="#ccc" strokeWidth="0.6"/><circle cx="15" cy="20" r="2.4" fill="#6f9a5c" stroke="#ccc" strokeWidth="0.6"/><circle cx="25" cy="24" r="2.4" fill="#6f9a5c" stroke="#ccc" strokeWidth="0.6"/></svg>,
    "greenery-stem-ruscus": <svg viewBox="0 0 40 40" width="26" height="26"><path d="M20 36 L20 8" fill="none" stroke="#3f6b34" strokeWidth="1.4"/><ellipse cx="13" cy="14" rx="4" ry="2.2" fill="#3f6b34" transform="rotate(-25 13 14)"/><ellipse cx="27" cy="18" rx="4" ry="2.2" fill="#3f6b34" transform="rotate(25 27 18)"/><ellipse cx="13" cy="24" rx="4" ry="2.2" fill="#3f6b34" transform="rotate(-25 13 24)"/></svg>,
    "greenery-stem-dusty-miller": <svg viewBox="0 0 40 40" width="26" height="26"><path d="M20 36 L20 8" fill="none" stroke="#aebfa4" strokeWidth="1.4"/><path d="M20 10 L14 8 M20 12 L26 10 M20 15 L13 13 M20 17 L27 15 M20 20 L14 18 M20 22 L26 20" fill="none" stroke="#aebfa4" strokeWidth="1.1"/></svg>,
    "potted-olive": <svg viewBox="0 0 40 40" width="26" height="26"><path d="M14 36 L15 26 Q20 22 25 26 L26 36 Z" fill="#f3efe4" stroke="#ccc" strokeWidth="1"/><line x1="18" y1="26" x2="17" y2="10" stroke="#8a7256" strokeWidth="1.2"/><line x1="22" y1="26" x2="23" y2="12" stroke="#8a7256" strokeWidth="1.2"/><circle cx="16" cy="12" r="1.3" fill="#8a9b6e"/><circle cx="19" cy="8" r="1.3" fill="#8a9b6e"/><circle cx="23" cy="9" r="1.3" fill="#8a9b6e"/><circle cx="14" cy="16" r="1.1" fill="#8a9b6e"/><circle cx="26" cy="14" r="1.1" fill="#8a9b6e"/><circle cx="20" cy="14" r="1.1" fill="#8a9b6e"/></svg>,
    "potted-bird-of-paradise": <svg viewBox="0 0 40 40" width="26" height="26"><path d="M14 36 L15 27 Q20 23 25 27 L26 36 Z" fill="#f3efe4" stroke="#ccc" strokeWidth="1"/><path d="M20 27 Q19 16 20 6 Q23 10 22 20 Q21 24 20 27 Z" fill="#2f6b3c" stroke="#1f4a28" strokeWidth="0.6"/><path d="M20 27 Q15 18 12 9 Q17 12 19 21 Q20 24 20 27 Z" fill="#3a7a47" stroke="#1f4a28" strokeWidth="0.6"/><path d="M20 27 Q25 19 28 11 Q23 14 21 22 Q20 25 20 27 Z" fill="#3a7a47" stroke="#1f4a28" strokeWidth="0.6"/></svg>,
    "potted-fiddle-leaf-fig": <svg viewBox="0 0 40 40" width="26" height="26"><path d="M15 36 L16 27 Q20 24 24 27 L25 36 Z" fill="#ece6d6" stroke="#ccc" strokeWidth="1"/><line x1="20" y1="27" x2="20" y2="12" stroke="#6b4a34" strokeWidth="1.4"/><ellipse cx="14" cy="16" rx="4.5" ry="3" fill="#2e5c2a" stroke="#1f4a20" strokeWidth="0.6" transform="rotate(-20 14 16)"/><ellipse cx="26" cy="12" rx="4.5" ry="3" fill="#2e5c2a" stroke="#1f4a20" strokeWidth="0.6" transform="rotate(20 26 12)"/><ellipse cx="15" cy="8" rx="4" ry="2.8" fill="#2e5c2a" stroke="#1f4a20" strokeWidth="0.6" transform="rotate(-15 15 8)"/></svg>,
    "potted-areca-palm": <svg viewBox="0 0 40 40" width="26" height="26"><path d="M14 36 L15 27 Q20 24 25 27 L26 36 Z" fill="#f3efe4" stroke="#ccc" strokeWidth="1"/><line x1="20" y1="27" x2="20" y2="14" stroke="#8a9b5c" strokeWidth="1.2"/><path d="M20 14 Q10 12 6 18 M20 14 Q14 6 12 2 M20 14 Q26 6 28 2 M20 14 Q30 12 34 18 M20 14 Q20 4 20 0" fill="none" stroke="#5a8a3f" strokeWidth="1.4"/></svg>,
    "potted-rubber-plant": <svg viewBox="0 0 40 40" width="26" height="26"><path d="M15 36 L16 27 Q20 24 24 27 L25 36 Z" fill="#ece6d6" stroke="#ccc" strokeWidth="1"/><line x1="20" y1="27" x2="20" y2="10" stroke="#7a4a2e" strokeWidth="1.4"/><ellipse cx="15" cy="14" rx="4.3" ry="3" fill="#1f4a20" stroke="#123016" strokeWidth="0.6" transform="rotate(-25 15 14)"/><ellipse cx="25" cy="18" rx="4.3" ry="3" fill="#1f4a20" stroke="#123016" strokeWidth="0.6" transform="rotate(25 25 18)"/><ellipse cx="20" cy="9" rx="3.6" ry="2.6" fill="#245524" stroke="#123016" strokeWidth="0.6"/></svg>,
    "potted-monstera": <svg viewBox="0 0 40 40" width="26" height="26"><path d="M15 36 L16 28 Q20 25 24 28 L25 36 Z" fill="#f3efe4" stroke="#ccc" strokeWidth="1"/><line x1="20" y1="28" x2="20" y2="18" stroke="#3a5c33" strokeWidth="1.2"/><path d="M20 18 C12 16 10 8 15 4 C16 9 18 10 19 8 C18 12 21 12 20 8 C22 11 24 9 23 5 C28 9 26 16 20 18 Z" fill="#2c5e2c" stroke="#1a3a1a" strokeWidth="0.6" fillRule="evenodd"/></svg>,
    "potted-bird-of-paradise-tall": <svg viewBox="0 0 40 40" width="26" height="26"><path d="M14 36 L15 27 Q20 24 25 27 L26 36 Z" fill="#ece6d6" stroke="#ccc" strokeWidth="1"/><line x1="16" y1="35" x2="16" y2="28" stroke="#d8d0bd" strokeWidth="0.8"/><line x1="24" y1="35" x2="24" y2="28" stroke="#d8d0bd" strokeWidth="0.8"/><path d="M20 27 Q19 14 20 2 Q24 8 23 18 Q22 23 20 27 Z" fill="#336b3f" stroke="#1f4a28" strokeWidth="0.6"/><path d="M20 27 Q14 17 10 6 Q17 10 19 20 Q20 24 20 27 Z" fill="#3f7a4b" stroke="#1f4a28" strokeWidth="0.6"/><path d="M20 27 Q26 18 30 8 Q24 12 21 21 Q20 25 20 27 Z" fill="#3f7a4b" stroke="#1f4a28" strokeWidth="0.6"/></svg>,
    "potted-dracaena-marginata": <svg viewBox="0 0 40 40" width="26" height="26"><path d="M14 36 L15 27 Q20 24 25 27 L26 36 Z" fill="#f3efe4" stroke="#ccc" strokeWidth="1"/><line x1="16" y1="27" x2="15" y2="12" stroke="#8a6a4a" strokeWidth="1.2"/><line x1="24" y1="27" x2="25" y2="16" stroke="#8a6a4a" strokeWidth="1.2"/><line x1="20" y1="27" x2="20" y2="9" stroke="#8a6a4a" strokeWidth="1.2"/><path d="M15 12 L10 8 M15 12 L20 7 M15 12 L12 15 M25 16 L20 12 M25 16 L30 12 M25 16 L28 19 M20 9 L15 5 M20 9 L25 5 M20 9 L20 3" fill="none" stroke="#3f6b3f" strokeWidth="1"/></svg>,
    "potted-peace-lily": <svg viewBox="0 0 40 40" width="26" height="26"><path d="M15 36 L16 27 Q20 24 24 27 L25 36 Z" fill="#f3efe4" stroke="#ccc" strokeWidth="1"/><ellipse cx="14" cy="20" rx="4.5" ry="3" fill="#1e4a24" stroke="#123016" strokeWidth="0.6" transform="rotate(-25 14 20)"/><ellipse cx="26" cy="20" rx="4.5" ry="3" fill="#1e4a24" stroke="#123016" strokeWidth="0.6" transform="rotate(25 26 20)"/><ellipse cx="20" cy="18" rx="4" ry="3" fill="#245524" stroke="#123016" strokeWidth="0.6"/><path d="M17 20 Q16 10 18 6 Q21 10 19 16 Q18 19 17 20 Z" fill="#fffdf8" stroke="#ccc" strokeWidth="0.7"/><path d="M23 20 Q25 12 23 8 Q20 12 22 17 Q23 19 23 20 Z" fill="#ffffff" stroke="#ccc" strokeWidth="0.7"/><circle cx="18" cy="7" r="1" fill="#f3c94d"/></svg>,
    "potted-snake-plant-yellow": <svg viewBox="0 0 40 40" width="26" height="26"><path d="M14 36 L15 28 Q20 25 25 28 L26 36 Z" fill="#6b6558" stroke="#ccc" strokeWidth="1"/><path d="M16 28 L14 8" fill="none" stroke="#d9c94a" strokeWidth="2.6"/><path d="M16 28 L14.5 8.5" fill="none" stroke="#1f4a2e" strokeWidth="1.6"/><path d="M20 28 L20 4" fill="none" stroke="#d9c94a" strokeWidth="2.6"/><path d="M20 28 L20 4.5" fill="none" stroke="#1f4a2e" strokeWidth="1.6"/><path d="M24 28 L26 9" fill="none" stroke="#d9c94a" strokeWidth="2.6"/><path d="M24 28 L25.6 9.5" fill="none" stroke="#1f4a2e" strokeWidth="1.6"/></svg>,
    "potted-zz-plant": <svg viewBox="0 0 40 40" width="26" height="26"><path d="M15 36 L16 27 Q20 24 24 27 L25 36 Z" fill="#f3efe4" stroke="#ccc" strokeWidth="1"/><path d="M20 27 Q13 20 11 9 M20 27 Q27 19 29 8 M20 27 Q20 15 20 4" fill="none" stroke="#1e5c2e" strokeWidth="1.3"/><path d="M17 20 L14 18 M15 15 L12 14 M27 18 L30 17 M25 14 L28 12 M20 18 L17 17 M20 12 L23 11" fill="none" stroke="#1e5c2e" strokeWidth="1"/></svg>,
    "potted-asparagus-fern": <svg viewBox="0 0 40 40" width="26" height="26"><path d="M15 36 L16 28 Q20 26 24 28 L25 36 Z" fill="#ece6d6" stroke="#ccc" strokeWidth="1"/><path d="M20 28 Q12 22 8 12 M20 28 Q10 20 12 8 M20 28 Q20 16 18 6 M20 28 Q20 16 22 6 M20 28 Q30 20 28 8 M20 28 Q28 22 32 12" fill="none" stroke="#6fae5c" strokeWidth="1.1"/></svg>,
    "potted-dieffenbachia": <svg viewBox="0 0 40 40" width="26" height="26"><path d="M15 36 L16 27 Q20 24 24 27 L25 36 Z" fill="#f3efe4" stroke="#ccc" strokeWidth="1"/><line x1="20" y1="27" x2="20" y2="14" stroke="#6b8a4a" strokeWidth="1.2"/><ellipse cx="14" cy="17" rx="4.3" ry="3" fill="#2e5c2a" stroke="#1f4a20" strokeWidth="0.6" transform="rotate(-22 14 17)"/><ellipse cx="14" cy="17" rx="2" ry="1.3" fill="#d7e3a0" transform="rotate(-22 14 17)"/><ellipse cx="26" cy="13" rx="4.3" ry="3" fill="#2e5c2a" stroke="#1f4a20" strokeWidth="0.6" transform="rotate(22 26 13)"/><ellipse cx="26" cy="13" rx="2" ry="1.3" fill="#d7e3a0" transform="rotate(22 26 13)"/></svg>,
    "potted-kentia-palm": <svg viewBox="0 0 40 40" width="26" height="26"><path d="M15 36 L16 29 Q20 27 24 29 L25 36 Z" fill="#f3efe4" stroke="#ccc" strokeWidth="1"/><line x1="20" y1="29" x2="20" y2="18" stroke="#8a9b5c" strokeWidth="1.1"/><path d="M20 18 Q13 16 10 21 M20 18 Q15 10 14 5 M20 18 Q25 10 26 5 M20 18 Q27 16 30 21" fill="none" stroke="#4a7a3f" strokeWidth="1.2"/></svg>,
    "potted-pothos-trailing": <svg viewBox="0 0 40 40" width="26" height="26"><rect x="14" y="16" width="12" height="20" rx="1" fill="#d9d3c4" stroke="#ccc" strokeWidth="1"/><path d="M16 16 Q12 22 14 30 M20 16 Q17 24 19 34 M24 16 Q21 23 23 30" fill="none" stroke="#3a5c2e" strokeWidth="1.1"/><circle cx="14" cy="24" r="1.4" fill="#2f6b2f"/><circle cx="19" cy="28" r="1.4" fill="#2f6b2f"/><circle cx="23" cy="23" r="1.4" fill="#2f6b2f"/><ellipse cx="17" cy="12" rx="4.5" ry="3" fill="#2f6b2f" stroke="#1f4a1f" strokeWidth="0.6" transform="rotate(-15 17 12)"/><ellipse cx="24" cy="11" rx="4" ry="2.8" fill="#3a7a3a" stroke="#1f4a1f" strokeWidth="0.6" transform="rotate(15 24 11)"/></svg>,
    "potted-snake-plant-green": <svg viewBox="0 0 40 40" width="26" height="26"><path d="M14 36 L15 28 Q20 25 25 28 L26 36 Z" fill="#f3efe4" stroke="#ccc" strokeWidth="1"/><path d="M16 28 L14 8" fill="none" stroke="#1f4a2e" strokeWidth="2.2"/><path d="M20 28 L20 4" fill="none" stroke="#1f4a2e" strokeWidth="2.2"/><path d="M24 28 L26 9" fill="none" stroke="#1f4a2e" strokeWidth="2.2"/></svg>,
    "potted-boston-fern": <svg viewBox="0 0 40 40" width="26" height="26"><path d="M14 36 L15 29 Q20 27 25 29 L26 36 Z" fill="#f0ece0" stroke="#ccc" strokeWidth="1"/><path d="M20 29 Q10 26 7 18 M20 29 Q9 24 9 14 M20 29 Q15 18 15 8 M20 29 Q25 18 25 8 M20 29 Q31 24 31 14 M20 29 Q30 26 33 18" fill="none" stroke="#4d8a3f" strokeWidth="1.3"/></svg>,
    "potted-alocasia": <svg viewBox="0 0 40 40" width="26" height="26"><path d="M15 36 L16 27 Q20 24 24 27 L25 36 Z" fill="#f3efe4" stroke="#ccc" strokeWidth="1"/><line x1="18" y1="27" x2="17" y2="13" stroke="#4a6b3f" strokeWidth="1.2"/><line x1="24" y1="27" x2="26" y2="16" stroke="#4a6b3f" strokeWidth="1.2"/><path d="M17 13 Q11 11 10 5 Q17 6 19 12 Q18 13 17 13 Z" fill="#1f4a2e" stroke="#123016" strokeWidth="0.6"/><path d="M26 16 Q32 13 32 7 Q26 9 24 15 Q25 16 26 16 Z" fill="#255530" stroke="#123016" strokeWidth="0.6"/></svg>,
    "vase-spiral-twist": <svg viewBox="0 0 40 40" width="26" height="26"><path d="M14 34 L13 12 Q13 6 20 6 Q27 6 27 12 L26 34 Z" fill="#c1666b" stroke="#8f4147" strokeWidth="1"/><path d="M15 30 L23 10 M15 20 L25 8 M17 32 L27 12" fill="none" stroke="#8f4147" strokeWidth="0.8"/></svg>,
    "vase-fluted-tapered": <svg viewBox="0 0 40 40" width="26" height="26"><path d="M15 34 L14 10 Q14 6 20 6 Q26 6 26 10 L25 34 Z" fill="#4a7c6f" stroke="#325650" strokeWidth="1"/><line x1="17" y1="8" x2="16.5" y2="34" stroke="#325650" strokeWidth="0.8"/><line x1="20" y1="7" x2="20" y2="34" stroke="#325650" strokeWidth="0.8"/><line x1="23" y1="8" x2="23.5" y2="34" stroke="#325650" strokeWidth="0.8"/></svg>,
    "vase-stacked-bubble": <svg viewBox="0 0 40 40" width="26" height="26"><ellipse cx="20" cy="30" rx="8" ry="6" fill="#d4a373" stroke="#a8794f" strokeWidth="1"/><ellipse cx="20" cy="20" rx="7" ry="5.5" fill="#d4a373" stroke="#a8794f" strokeWidth="1"/><ellipse cx="20" cy="11" rx="6" ry="5" fill="#d4a373" stroke="#a8794f" strokeWidth="1"/></svg>,
    "vase-fluted-bulbous": <svg viewBox="0 0 40 40" width="26" height="26"><path d="M16 34 L14 20 Q13 8 20 8 Q27 8 26 20 L24 34 Z" fill="#6a4c93" stroke="#4a3569" strokeWidth="1"/><line x1="16" y1="14" x2="16.5" y2="32" stroke="#4a3569" strokeWidth="0.8"/><line x1="20" y1="10" x2="20" y2="34" stroke="#4a3569" strokeWidth="0.8"/><line x1="24" y1="14" x2="23.5" y2="32" stroke="#4a3569" strokeWidth="0.8"/></svg>,
    "vase-ruffled-wavy-tall": <svg viewBox="0 0 40 40" width="26" height="26"><path d="M15 34 L15 10 Q13 8 15 6 Q18 4 20 7 Q22 4 25 6 Q27 8 25 10 L25 34 Z" fill="#457b9d" stroke="#305773" strokeWidth="1"/></svg>,
    "vase-textured-cylinder": <svg viewBox="0 0 40 40" width="26" height="26"><rect x="15" y="10" width="10" height="24" rx="1" fill="#b56576" stroke="#874a56" strokeWidth="1"/><circle cx="18" cy="16" r="0.7" fill="#874a56"/><circle cx="22" cy="20" r="0.7" fill="#874a56"/><circle cx="17" cy="26" r="0.7" fill="#874a56"/><circle cx="23" cy="14" r="0.7" fill="#874a56"/><circle cx="21" cy="29" r="0.7" fill="#874a56"/></svg>,
    "vase-ring": <svg viewBox="0 0 40 40" width="26" height="26"><circle cx="20" cy="20" r="11" fill="none" stroke="#c9a44c" strokeWidth="7"/><circle cx="20" cy="20" r="11" fill="none" stroke="#9c7c33" strokeWidth="1"/><circle cx="20" cy="20" r="7.5" fill="none" stroke="#9c7c33" strokeWidth="1"/></svg>,
    "vase-textured-cylinder-tall": <svg viewBox="0 0 40 40" width="26" height="26"><rect x="16" y="6" width="8" height="28" rx="1" fill="#588157" stroke="#3f5f3f" strokeWidth="1"/><circle cx="18.5" cy="12" r="0.6" fill="#3f5f3f"/><circle cx="21.5" cy="18" r="0.6" fill="#3f5f3f"/><circle cx="18" cy="24" r="0.6" fill="#3f5f3f"/><circle cx="22" cy="29" r="0.6" fill="#3f5f3f"/></svg>,
    "vase-faceted-hex": <svg viewBox="0 0 40 40" width="26" height="26"><polygon points="20,7 27,11 27,29 20,34 13,29 13,11" fill="#7c4a6b" stroke="#593550" strokeWidth="1"/><line x1="20" y1="7" x2="20" y2="34" stroke="#593550" strokeWidth="0.7"/></svg>,
    "vase-wavy-stack": <svg viewBox="0 0 40 40" width="26" height="26"><path d="M16 34 Q12 28 17 24 Q22 20 16 16 Q12 12 18 8 L22 8 Q28 12 24 16 Q18 20 23 24 Q28 28 24 34 Z" fill="#bc6c25" stroke="#8f501a" strokeWidth="1"/></svg>,
    "vase-amphora-handles": <svg viewBox="0 0 40 40" width="26" height="26"><path d="M16 34 L14 18 Q13 9 20 9 Q27 9 26 18 L24 34 Z" fill="#386641" stroke="#274a2d" strokeWidth="1"/><path d="M13 14 Q8 14 8 20 Q8 25 13 24" fill="none" stroke="#274a2d" strokeWidth="1.4"/><path d="M27 14 Q32 14 32 20 Q32 25 27 24" fill="none" stroke="#274a2d" strokeWidth="1.4"/></svg>,
    "vase-bud-simple": <svg viewBox="0 0 40 40" width="26" height="26"><path d="M15 34 Q13 26 18 24 Q19 20 19 10 L21 10 Q21 20 22 24 Q27 26 25 34 Z" fill="#8a5a44" stroke="#684230" strokeWidth="1"/></svg>,
    "vase-fluted-narrow": <svg viewBox="0 0 40 40" width="26" height="26"><path d="M17 34 L16 8 Q16 5 20 5 Q24 5 24 8 L23 34 Z" fill="#5c6e8a" stroke="#43506a" strokeWidth="1"/><line x1="18" y1="7" x2="17.7" y2="34" stroke="#43506a" strokeWidth="0.7"/><line x1="22" y1="7" x2="22.3" y2="34" stroke="#43506a" strokeWidth="0.7"/></svg>,
    "vase-bulbous-round": <svg viewBox="0 0 40 40" width="26" height="26"><path d="M15 34 L13 20 Q12 10 20 10 Q28 10 27 20 L25 34 Z" fill="#a13d5c" stroke="#7a2d44" strokeWidth="1"/></svg>,
    "vase-wavy-simple": <svg viewBox="0 0 40 40" width="26" height="26"><path d="M16 34 Q13 22 17 20 Q21 18 17 12 Q15 8 18 6 L22 6 Q25 8 23 12 Q19 18 23 20 Q27 22 24 34 Z" fill="#6b8f71" stroke="#4a6b50" strokeWidth="1"/></svg>,
    "vase-tapered-cone": <svg viewBox="0 0 40 40" width="26" height="26"><path d="M18 8 L22 8 L28 34 L12 34 Z" fill="#9c6b3f" stroke="#78522f" strokeWidth="1"/></svg>,
    "vase-ruffled-trumpet": <svg viewBox="0 0 40 40" width="26" height="26"><path d="M19 26 L18 34 L22 34 L21 26 Z" fill="#4f6b4f" stroke="#374a37" strokeWidth="1"/><path d="M18 26 Q10 22 8 12 Q11 10 13 14 Q16 8 19 14 Q20 8 21 14 Q24 8 27 14 Q29 10 32 12 Q30 22 22 26 Z" fill="#4f6b4f" stroke="#374a37" strokeWidth="1"/></svg>,
    "vase-wavy-organic-tall": <svg viewBox="0 0 40 40" width="26" height="26"><path d="M16 34 Q13 28 17 25 Q20 22 17 19 Q13 16 17 13 Q20 10 17 7 Q15 5 18 4 L22 4 Q25 5 23 7 Q20 10 23 13 Q27 16 23 19 Q20 22 23 25 Q27 28 24 34 Z" fill="#8e7cc3" stroke="#64548f" strokeWidth="1"/></svg>,
    "vase-ribbed-vertical-tall": <svg viewBox="0 0 40 40" width="26" height="26"><path d="M16 34 L15 8 Q15 5 20 5 Q25 5 25 8 L24 34 Z" fill="#b5654f" stroke="#8a4a39" strokeWidth="1"/><line x1="17" y1="7" x2="16.7" y2="34" stroke="#8a4a39" strokeWidth="0.6"/><line x1="19" y1="6" x2="18.8" y2="34" stroke="#8a4a39" strokeWidth="0.6"/><line x1="21" y1="6" x2="21.2" y2="34" stroke="#8a4a39" strokeWidth="0.6"/><line x1="23" y1="7" x2="23.3" y2="34" stroke="#8a4a39" strokeWidth="0.6"/></svg>,
    "vase-gourd-round": <svg viewBox="0 0 40 40" width="26" height="26"><path d="M17 34 L15 24 Q13 18 17 15 Q13 12 16 8 Q18 6 20 6 Q22 6 24 8 Q27 12 23 15 Q27 18 25 24 L23 34 Z" fill="#2a6f77" stroke="#1d4e54" strokeWidth="1"/></svg>,
    "vase-goblet": <svg viewBox="0 0 40 40" width="26" height="26"><path d="M11 12 Q11 20 20 20 Q29 20 29 12" fill="none" stroke="#4a3358" strokeWidth="1"/><path d="M11 10 Q11 20 20 20 Q29 20 29 10 L29 8 L11 8 Z" fill="#6a4c7a" stroke="#4a3358" strokeWidth="1"/><line x1="20" y1="20" x2="20" y2="30" stroke="#4a3358" strokeWidth="1.6"/><rect x="13" y="30" width="14" height="4" rx="1" fill="#6a4c7a" stroke="#4a3358" strokeWidth="1"/></svg>,
    "vase-spherical-round": <svg viewBox="0 0 40 40" width="26" height="26"><circle cx="20" cy="22" r="12" fill="#d98e73" stroke="#a8654a" strokeWidth="1"/><rect x="17" y="8" width="6" height="6" fill="#d98e73" stroke="#a8654a" strokeWidth="1"/></svg>,
    "vase-jug-single-handle": <svg viewBox="0 0 40 40" width="26" height="26"><path d="M16 34 L15 20 Q14 10 20 10 Q26 10 25 20 L24 34 Z" fill="#3f6b6f" stroke="#294a4d" strokeWidth="1"/><path d="M25 15 Q31 15 31 21 Q31 26 25 25" fill="none" stroke="#294a4d" strokeWidth="1.4"/></svg>,
    "vase-faceted-gem": <svg viewBox="0 0 40 40" width="26" height="26"><polygon points="20,10 26,14 27,24 22,34 18,34 13,24 14,14" fill="#ee6c4d" stroke="#c94f34" strokeWidth="1"/><line x1="20" y1="10" x2="20" y2="34" stroke="#c94f34" strokeWidth="0.6"/></svg>,
    "vase-gourd-stack": <svg viewBox="0 0 40 40" width="26" height="26"><ellipse cx="20" cy="27" rx="9" ry="7" fill="#7b2d43" stroke="#5c1f31" strokeWidth="1"/><ellipse cx="20" cy="13" rx="6.5" ry="6" fill="#7b2d43" stroke="#5c1f31" strokeWidth="1"/></svg>,
    "vase-ring-textured-cylinder": <svg viewBox="0 0 40 40" width="26" height="26"><rect x="15" y="9" width="10" height="25" rx="1" fill="#4a5859" stroke="#333e3f" strokeWidth="1"/><line x1="15" y1="15" x2="25" y2="15" stroke="#333e3f" strokeWidth="0.8"/><line x1="15" y1="21" x2="25" y2="21" stroke="#333e3f" strokeWidth="0.8"/><line x1="15" y1="27" x2="25" y2="27" stroke="#333e3f" strokeWidth="0.8"/></svg>,
    "vase-organic-lumpy": <svg viewBox="0 0 40 40" width="26" height="26"><path d="M15 34 Q10 30 13 24 Q9 20 14 15 Q13 10 19 9 Q25 8 27 14 Q31 18 27 23 Q30 29 25 34 Z" fill="#a3773f" stroke="#785a2e" strokeWidth="1"/></svg>,
    "vase-rough-organic": <svg viewBox="0 0 40 40" width="26" height="26"><path d="M15 34 L14 12 Q13 8 20 8 Q27 8 26 12 L25 34 Z" fill="#6f8a7c" stroke="#4c6155" strokeWidth="1"/><circle cx="17" cy="16" r="0.9" fill="#4c6155"/><circle cx="22" cy="12" r="0.9" fill="#4c6155"/><circle cx="24" cy="22" r="0.9" fill="#4c6155"/><circle cx="16" cy="27" r="0.9" fill="#4c6155"/><circle cx="21" cy="30" r="0.9" fill="#4c6155"/></svg>,
    "vase-fluted-cylinder": <svg viewBox="0 0 40 40" width="26" height="26"><rect x="15" y="8" width="10" height="26" rx="1" fill="#8b2e3f" stroke="#6b212f" strokeWidth="1"/><line x1="17" y1="8" x2="17" y2="34" stroke="#6b212f" strokeWidth="0.7"/><line x1="20" y1="8" x2="20" y2="34" stroke="#6b212f" strokeWidth="0.7"/><line x1="23" y1="8" x2="23" y2="34" stroke="#6b212f" strokeWidth="0.7"/></svg>,
    "vase-bud-curvy": <svg viewBox="0 0 40 40" width="26" height="26"><path d="M15 34 Q12 24 17 22 Q13 18 16 13 Q17 10 19 9 L19 8 L21 8 L21 9 Q23 10 20 14 Q18 18 22 21 Q28 24 25 34 Z" fill="#5c4a7c" stroke="#43365c" strokeWidth="1"/></svg>,
    "vase-wavy-tall2": <svg viewBox="0 0 40 40" width="26" height="26"><path d="M16 34 Q13 27 17 24 Q20 21 17 17 Q14 13 18 9 Q20 7 18 5 L22 5 Q20 7 22 9 Q26 13 23 17 Q20 21 23 24 Q27 27 24 34 Z" fill="#c2703f" stroke="#93532f" strokeWidth="1"/></svg>,
    "vase-bud-round-simple": <svg viewBox="0 0 40 40" width="26" height="26"><circle cx="20" cy="27" r="8" fill="#2f4858" stroke="#1c2c37" strokeWidth="1"/><line x1="20" y1="19" x2="20" y2="7" stroke="#1c2c37" strokeWidth="2"/></svg>,
    "vase-fluted-trumpet-flare": <svg viewBox="0 0 40 40" width="26" height="26"><path d="M18 34 L17 30 L14 8 L26 8 L23 30 L22 34 Z" fill="#9b6f9b" stroke="#70506f" strokeWidth="1"/><line x1="16" y1="9" x2="18" y2="30" stroke="#70506f" strokeWidth="0.7"/><line x1="24" y1="9" x2="22" y2="30" stroke="#70506f" strokeWidth="0.7"/></svg>,
    "vase-handled-pitcher": <svg viewBox="0 0 40 40" width="26" height="26"><path d="M16 34 L14 18 Q13 9 20 9 Q26 9 26 15 L25 18 L24 34 Z" fill="#a15c3e" stroke="#7a452e" strokeWidth="1"/><path d="M25 8 L29 9 L26 13" fill="#a15c3e" stroke="#7a452e" strokeWidth="1"/><path d="M13 15 Q7 15 7 21 Q7 26 13 25" fill="none" stroke="#7a452e" strokeWidth="1.4"/></svg>,
    "vase-wavy-ribbed-tall": <svg viewBox="0 0 40 40" width="26" height="26"><path d="M16 34 Q13 27 17 24 Q20 21 17 17 Q14 13 18 9 L22 9 Q26 13 23 17 Q20 21 23 24 Q27 27 24 34 Z" fill="#4c6b81" stroke="#34495c" strokeWidth="1"/><line x1="20" y1="9" x2="20" y2="34" stroke="#34495c" strokeWidth="0.6"/></svg>,
    "vase-terrazzo-speckle": <svg viewBox="0 0 40 40" width="26" height="26"><rect x="15" y="9" width="10" height="25" rx="1" fill="#8a6a2e" stroke="#684f21" strokeWidth="1"/><circle cx="18" cy="14" r="0.8" fill="#d9c48f"/><circle cx="22" cy="17" r="0.6" fill="#3a2c14"/><circle cx="17" cy="22" r="0.6" fill="#3a2c14"/><circle cx="23" cy="26" r="0.8" fill="#d9c48f"/><circle cx="19" cy="29" r="0.6" fill="#3a2c14"/></svg>,
    "table-pedestal-fluted-cream":  <svg viewBox="0 0 40 40" width="26" height="26"><ellipse cx="20" cy="11" rx="15" ry="5" fill="#b98a6f" stroke="#8a5c46" strokeWidth="1"/><path d="M15 13 L17 32 L23 32 L25 13 Z" fill="#b98a6f" stroke="#8a5c46" strokeWidth="1"/><ellipse cx="20" cy="33" rx="7" ry="2" fill="#8a5c46"/></svg>,
    "table-pedestal-hourglass":     <svg viewBox="0 0 40 40" width="26" height="26"><ellipse cx="20" cy="10" rx="14" ry="5" fill="#cbb99e" stroke="#b8a483" strokeWidth="1"/><path d="M13 12 Q20 20 16 27 Q20 33 24 27 Q20 20 27 12 Z" fill="#cbb99e" stroke="#b8a483" strokeWidth="1"/></svg>,
    "table-pedestal-fluted-white":  <svg viewBox="0 0 40 40" width="26" height="26"><ellipse cx="20" cy="10" rx="13" ry="4.5" fill="#7c93a8" stroke="#4f6b80" strokeWidth="1"/><path d="M17 12 L18 32 L22 32 L23 12 Z" fill="#7c93a8" stroke="#4f6b80" strokeWidth="1"/><ellipse cx="20" cy="33" rx="6" ry="1.8" fill="#4f6b80"/></svg>,
    "table-slab-tripod-cream":      <svg viewBox="0 0 40 40" width="26" height="26"><ellipse cx="20" cy="11" rx="15" ry="5" fill="#8a9b7a" stroke="#5f7052" strokeWidth="1"/><rect x="10" y="13" width="4" height="20" fill="#5f7052"/><rect x="18" y="14" width="4" height="20" fill="#5f7052"/><rect x="26" y="13" width="4" height="20" fill="#5f7052"/></svg>,
    "table-pedestal-cone-stone":    <svg viewBox="0 0 40 40" width="26" height="26"><ellipse cx="20" cy="10" rx="14" ry="5" fill="#d9cdb8" stroke="#c3b498" strokeWidth="1"/><path d="M11 32 L29 32 L21 12 L19 12 Z" fill="#d9cdb8" stroke="#c3b498" strokeWidth="1"/></svg>,
    "table-pedestal-fluted-marble": <svg viewBox="0 0 40 40" width="26" height="26"><ellipse cx="20" cy="11" rx="15" ry="5" fill="#a8788a" stroke="#7a5261" strokeWidth="1"/><path d="M15 13 L17 32 L23 32 L25 13 Z" fill="#a8788a" stroke="#7a5261" strokeWidth="1"/><ellipse cx="20" cy="33" rx="7" ry="2" fill="#7a5261"/></svg>,
    "table-oval-double-pedestal-fluted": <svg viewBox="0 0 40 40" width="26" height="26"><ellipse cx="20" cy="12" rx="17" ry="5.5" fill="#c97b5f" stroke="#9c5a42" strokeWidth="1"/><rect x="9" y="14" width="4" height="19" fill="#c97b5f" stroke="#9c5a42" strokeWidth="0.5"/><rect x="27" y="14" width="4" height="19" fill="#c97b5f" stroke="#9c5a42" strokeWidth="0.5"/></svg>,
    "table-oval-wood-legs":         <svg viewBox="0 0 40 40" width="26" height="26"><ellipse cx="20" cy="12" rx="17" ry="5.5" fill="#a9754a" stroke="#8B5E3C" strokeWidth="1"/><rect x="9" y="14" width="4" height="19" fill="#8B5E3C"/><rect x="27" y="14" width="4" height="19" fill="#8B5E3C"/></svg>,
    "table-oval-stone-legs":        <svg viewBox="0 0 40 40" width="26" height="26"><ellipse cx="20" cy="12" rx="17" ry="5.5" fill="#6f8a7c" stroke="#4c6155" strokeWidth="1"/><rect x="9" y="14" width="4" height="19" fill="#4c6155"/><rect x="27" y="14" width="4" height="19" fill="#4c6155"/></svg>,
    "table-oval-double-pedestal-round": <svg viewBox="0 0 40 40" width="26" height="26"><ellipse cx="20" cy="12" rx="16" ry="6" fill="#8a6f9b" stroke="#644f70" strokeWidth="1"/><rect x="10" y="15" width="4" height="18" fill="#8a6f9b" stroke="#644f70" strokeWidth="0.5"/><rect x="26" y="15" width="4" height="18" fill="#8a6f9b" stroke="#644f70" strokeWidth="0.5"/></svg>,
    "table-rect-waterfall-stone":   <svg viewBox="0 0 40 40" width="26" height="26"><rect x="4" y="8" width="32" height="6" rx="1" fill="#7a8a9b" stroke="#566171" strokeWidth="1"/><rect x="4" y="14" width="4" height="19" fill="#7a8a9b" stroke="#566171" strokeWidth="0.5"/><rect x="32" y="14" width="4" height="19" fill="#7a8a9b" stroke="#566171" strokeWidth="0.5"/></svg>,
    "table-rect-waterfall-marble":  <svg viewBox="0 0 40 40" width="26" height="26"><rect x="4" y="8" width="32" height="6" rx="1" fill="#9b6f7a" stroke="#714f57" strokeWidth="1"/><rect x="4" y="14" width="4" height="19" fill="#9b6f7a" stroke="#714f57" strokeWidth="0.5"/><rect x="32" y="14" width="4" height="19" fill="#9b6f7a" stroke="#714f57" strokeWidth="0.5"/></svg>,
    "table-rect-wood-legs":         <svg viewBox="0 0 40 40" width="26" height="26"><rect x="5" y="9" width="30" height="6" rx="1" fill="#a9754a" stroke="#8B5E3C" strokeWidth="1"/><rect x="7" y="15" width="3" height="18" fill="#8B5E3C"/><rect x="30" y="15" width="3" height="18" fill="#8B5E3C"/></svg>,
    "table-rect-glass-stone-legs":  <svg viewBox="0 0 40 40" width="26" height="26"><rect x="4" y="9" width="32" height="6" rx="1" fill="#d9e8ea" opacity="0.6" stroke="#b7cdd0" strokeWidth="1"/><rect x="4" y="15" width="4" height="18" fill="#6f8a7c" stroke="#4c6155" strokeWidth="0.5"/><rect x="32" y="15" width="4" height="18" fill="#6f8a7c" stroke="#4c6155" strokeWidth="0.5"/></svg>,
    "table-rect-double-pedestal-fluted": <svg viewBox="0 0 40 40" width="26" height="26"><rect x="4" y="9" width="32" height="6" rx="1" fill="#6f7a9b" stroke="#4c5470" strokeWidth="1"/><rect x="9" y="15" width="4" height="18" fill="#6f7a9b" stroke="#4c5470" strokeWidth="0.5"/><rect x="27" y="15" width="4" height="18" fill="#6f7a9b" stroke="#4c5470" strokeWidth="0.5"/></svg>,
    "table-rect-end-drums-stone":  <svg viewBox="0 0 40 40" width="26" height="26"><rect x="4" y="9" width="32" height="6" rx="1" fill="#a87c5f" stroke="#7c5b46" strokeWidth="1"/><rect x="6" y="15" width="7" height="18" rx="3" fill="#a87c5f" stroke="#7c5b46" strokeWidth="1"/><rect x="27" y="15" width="7" height="18" rx="3" fill="#a87c5f" stroke="#7c5b46" strokeWidth="1"/></svg>,
    "table-rect-black-metal-legs": <svg viewBox="0 0 40 40" width="26" height="26"><rect x="4" y="9" width="32" height="6" rx="1" fill="#a9754a" stroke="#8B5E3C" strokeWidth="1"/><rect x="6" y="15" width="2" height="18" fill="#1a1a1a"/><rect x="32" y="15" width="2" height="18" fill="#1a1a1a"/><rect x="6" y="15" width="2" height="18" fill="#1a1a1a" transform="translate(18,0)"/></svg>,
    "table-rect-hairpin-legs":     <svg viewBox="0 0 40 40" width="26" height="26"><rect x="4" y="9" width="32" height="6" rx="1" fill="#c9a877" stroke="#b5946a" strokeWidth="1"/><path d="M6 15 L4 33 M6 15 L8 33" stroke="#1a1a1a" strokeWidth="1.5" fill="none"/><path d="M34 15 L32 33 M34 15 L36 33" stroke="#1a1a1a" strokeWidth="1.5" fill="none"/></svg>,
    "table-rect-x-legs-wood":      <svg viewBox="0 0 40 40" width="26" height="26"><rect x="4" y="9" width="32" height="6" rx="1" fill="#8B5E3C" stroke="#6f4a2e" strokeWidth="1"/><line x1="5" y1="15" x2="12" y2="33" stroke="#6f4a2e" strokeWidth="2.5"/><line x1="12" y1="15" x2="5" y2="33" stroke="#6f4a2e" strokeWidth="2.5"/><line x1="28" y1="15" x2="35" y2="33" stroke="#6f4a2e" strokeWidth="2.5"/><line x1="35" y1="15" x2="28" y2="33" stroke="#6f4a2e" strokeWidth="2.5"/></svg>,
    "table-rect-black-frame-legs": <svg viewBox="0 0 40 40" width="26" height="26"><rect x="4" y="9" width="32" height="6" rx="1" fill="#8a7a9b" stroke="#644f70" strokeWidth="1"/><rect x="6" y="15" width="6" height="18" fill="none" stroke="#1a1a1a" strokeWidth="1.5"/><rect x="28" y="15" width="6" height="18" fill="none" stroke="#1a1a1a" strokeWidth="1.5"/></svg>,
    "table-rect-dark-walnut-legs": <svg viewBox="0 0 40 40" width="26" height="26"><rect x="4" y="9" width="32" height="6" rx="1" fill="#4a3728" stroke="#3d2817" strokeWidth="1"/><rect x="7" y="15" width="3" height="18" fill="#3d2817"/><rect x="30" y="15" width="3" height="18" fill="#3d2817"/></svg>,
    "table-rect-concrete-waterfall": <svg viewBox="0 0 40 40" width="26" height="26"><rect x="4" y="8" width="32" height="6" rx="1" fill="#b9b6b0" stroke="#a19d95" strokeWidth="1"/><rect x="4" y="14" width="4" height="19" fill="#b9b6b0" stroke="#a19d95" strokeWidth="0.5"/><rect x="32" y="14" width="4" height="19" fill="#b9b6b0" stroke="#a19d95" strokeWidth="0.5"/></svg>,
    "table-rect-two-tone-oak-black": <svg viewBox="0 0 40 40" width="26" height="26"><rect x="4" y="9" width="32" height="6" rx="1" fill="#d9bc8f" stroke="#c2a578" strokeWidth="1"/><rect x="6" y="15" width="2" height="18" fill="#1a1a1a"/><rect x="32" y="15" width="2" height="18" fill="#1a1a1a"/></svg>,
    "table-rect-marble-black-legs": <svg viewBox="0 0 40 40" width="26" height="26"><rect x="4" y="9" width="32" height="6" rx="1" fill="#7a6f9b" stroke="#564f70" strokeWidth="1"/><rect x="6" y="15" width="2.5" height="18" fill="#1a1a1a"/><rect x="31.5" y="15" width="2.5" height="18" fill="#1a1a1a"/></svg>,
    "table-round-cross-glass":      <svg viewBox="0 0 40 40" width="26" height="26"><ellipse cx="20" cy="11" rx="15" ry="5" fill="#d9e8ea" opacity="0.6" stroke="#b7cdd0" strokeWidth="1"/><line x1="10" y1="13" x2="30" y2="33" stroke="#dcd3c2" strokeWidth="3"/><line x1="30" y1="13" x2="10" y2="33" stroke="#dcd3c2" strokeWidth="3"/></svg>,
    "table-round-fluted-gold-ring": <svg viewBox="0 0 40 40" width="26" height="26"><ellipse cx="20" cy="10" rx="13" ry="4.5" fill="#6f8a9b" stroke="#4c6171" strokeWidth="1"/><path d="M17 12 L18 30 L22 30 L23 12 Z" fill="#6f8a9b" stroke="#C9A44C" strokeWidth="1"/><ellipse cx="20" cy="32" rx="8" ry="2.2" fill="none" stroke="#C9A44C" strokeWidth="1.5"/></svg>,
    "table-round-cone-marble":      <svg viewBox="0 0 40 40" width="26" height="26"><ellipse cx="20" cy="10" rx="13" ry="4.5" fill="#9b6f8a" stroke="#714f5f" strokeWidth="1"/><path d="M12 32 L28 32 L21 12 L19 12 Z" fill="#9b6f8a" stroke="#714f5f" strokeWidth="1"/></svg>,
    "table-round-drum-stone":       <svg viewBox="0 0 40 40" width="26" height="26"><ellipse cx="20" cy="10" rx="13" ry="4.5" fill="#8a9b6f" stroke="#5f7048" strokeWidth="1"/><rect x="10" y="12" width="20" height="20" fill="#8a9b6f" stroke="#5f7048" strokeWidth="1"/></svg>,
    "table-round-cage-glass-gold":  <svg viewBox="0 0 40 40" width="26" height="26"><ellipse cx="20" cy="10" rx="13" ry="4.5" fill="#d9e8ea" opacity="0.6" stroke="#b7cdd0" strokeWidth="1"/><line x1="9" y1="12" x2="9" y2="32" stroke="#C9A44C" strokeWidth="1.5"/><line x1="31" y1="12" x2="31" y2="32" stroke="#C9A44C" strokeWidth="1.5"/><line x1="9" y1="12" x2="31" y2="32" stroke="#C9A44C" strokeWidth="1"/><line x1="31" y1="12" x2="9" y2="32" stroke="#C9A44C" strokeWidth="1"/></svg>,
    "table-round-ring-gold-marble": <svg viewBox="0 0 40 40" width="26" height="26"><ellipse cx="20" cy="10" rx="13" ry="4.5" fill="#7a9b8a" stroke="#567166" strokeWidth="1"/><line x1="20" y1="12" x2="20" y2="27" stroke="#C9A44C" strokeWidth="1.5"/><ellipse cx="20" cy="31" rx="10" ry="3" fill="none" stroke="#C9A44C" strokeWidth="1.5"/></svg>,
    "table-side-ring-gold":         <svg viewBox="0 0 40 40" width="26" height="26"><ellipse cx="20" cy="14" rx="10" ry="4" fill="#9b7a6f" stroke="#70584c" strokeWidth="1"/><line x1="20" y1="16" x2="20" y2="27" stroke="#C9A44C" strokeWidth="1.5"/><ellipse cx="20" cy="30" rx="8" ry="2.5" fill="none" stroke="#C9A44C" strokeWidth="1.5"/></svg>,
    "table-side-fluted-cream":      <svg viewBox="0 0 40 40" width="26" height="26"><ellipse cx="20" cy="12" rx="9" ry="3.5" fill="#6f9b8a" stroke="#4c6f60" strokeWidth="1"/><path d="M17 14 L18 32 L22 32 L23 14 Z" fill="#6f9b8a" stroke="#4c6f60" strokeWidth="1"/></svg>,
    "table-side-stacked-sphere":    <svg viewBox="0 0 40 40" width="26" height="26"><ellipse cx="20" cy="10" rx="9" ry="3.5" fill="#9b6f9b" stroke="#70506f" strokeWidth="1"/><circle cx="20" cy="17" r="6" fill="#9b6f9b" stroke="#70506f" strokeWidth="1"/><circle cx="20" cy="25" r="5" fill="#9b6f9b" stroke="#70506f" strokeWidth="1"/><circle cx="20" cy="31" r="4" fill="#9b6f9b" stroke="#70506f" strokeWidth="1"/></svg>,
    "table-side-cone-cream":        <svg viewBox="0 0 40 40" width="26" height="26"><ellipse cx="20" cy="11" rx="9.5" ry="3.5" fill="#7a8a6f" stroke="#56624c" strokeWidth="1"/><path d="M14 32 L26 32 L21 13 L19 13 Z" fill="#7a8a6f" stroke="#56624c" strokeWidth="1"/></svg>,
    "table-side-tripod-wood":       <svg viewBox="0 0 40 40" width="26" height="26"><ellipse cx="20" cy="11" rx="9.5" ry="3.5" fill="#8B5E3C" stroke="#6f4a2e" strokeWidth="1"/><line x1="20" y1="13" x2="12" y2="33" stroke="#6f4a2e" strokeWidth="2"/><line x1="20" y1="13" x2="28" y2="33" stroke="#6f4a2e" strokeWidth="2"/><line x1="20" y1="13" x2="20" y2="34" stroke="#6f4a2e" strokeWidth="2"/></svg>,
    "table-side-drum-wood":         <svg viewBox="0 0 40 40" width="26" height="26"><ellipse cx="20" cy="10" rx="9.5" ry="3.5" fill="#a9754a" stroke="#8B5E3C" strokeWidth="1"/><rect x="12" y="12" width="16" height="20" fill="#a9754a" stroke="#8B5E3C" strokeWidth="1"/></svg>,
    "table-side-cone-white":        <svg viewBox="0 0 40 40" width="26" height="26"><ellipse cx="20" cy="11" rx="9" ry="3.5" fill="#9b7a9b" stroke="#70506f" strokeWidth="1"/><path d="M15 32 L25 32 L21 13 L19 13 Z" fill="#9b7a9b" stroke="#70506f" strokeWidth="1"/></svg>,
    "table-coffee-stone-tripod-slab": <svg viewBox="0 0 40 40" width="26" height="26"><ellipse cx="20" cy="16" rx="16" ry="5.5" fill="#6f8a9b" stroke="#4c6171" strokeWidth="1"/><rect x="10" y="18" width="4" height="14" fill="#6f8a9b" stroke="#4c6171" strokeWidth="0.5"/><rect x="18" y="19" width="4" height="14" fill="#6f8a9b" stroke="#4c6171" strokeWidth="0.5"/><rect x="26" y="18" width="4" height="14" fill="#6f8a9b" stroke="#4c6171" strokeWidth="0.5"/></svg>,
    "table-coffee-fluted-drum-cream": <svg viewBox="0 0 40 40" width="26" height="26"><ellipse cx="20" cy="15" rx="15" ry="5" fill="#9b8a6f" stroke="#70604c" strokeWidth="1"/><path d="M8 17 L9 32 L31 32 L32 17 Z" fill="#9b8a6f" stroke="#70604c" strokeWidth="1"/></svg>,
    "table-coffee-marble-brass-drum": <svg viewBox="0 0 40 40" width="26" height="26"><ellipse cx="20" cy="15" rx="15" ry="5" fill="#8a6f7a" stroke="#614f57" strokeWidth="1"/><rect x="9" y="17" width="22" height="15" fill="#C9A44C" opacity="0.85"/></svg>,
    "table-coffee-fluted-drum-wood": <svg viewBox="0 0 40 40" width="26" height="26"><ellipse cx="20" cy="15" rx="15" ry="5" fill="#a9754a" stroke="#8B5E3C" strokeWidth="1"/><path d="M8 17 L9 32 L31 32 L32 17 Z" fill="#a9754a" stroke="#8B5E3C" strokeWidth="1"/></svg>,
    "table-coffee-marble-gold-ring": <svg viewBox="0 0 40 40" width="26" height="26"><ellipse cx="20" cy="14" rx="15" ry="5" fill="#6f9b7a" stroke="#4c7156" strokeWidth="1"/><line x1="20" y1="16" x2="20" y2="27" stroke="#C9A44C" strokeWidth="1.5"/><ellipse cx="20" cy="30" rx="11" ry="3" fill="none" stroke="#C9A44C" strokeWidth="1.5"/></svg>,
    "rug-plain-rectangular": <svg viewBox="0 0 40 40" width="26" height="26"><rect x="5" y="9" width="30" height="22" rx="1" fill="#c1666b" stroke="#8f4147" strokeWidth="1"/></svg>,
    "rug-shaggy":            <svg viewBox="0 0 40 40" width="26" height="26"><rect x="5" y="9" width="30" height="22" rx="1" fill="#d4a373" stroke="#a8794f" strokeWidth="1"/><circle cx="11" cy="14" r="1" fill="#a8794f"/><circle cx="17" cy="18" r="1" fill="#a8794f"/><circle cx="23" cy="13" r="1" fill="#a8794f"/><circle cx="29" cy="19" r="1" fill="#a8794f"/><circle cx="14" cy="24" r="1" fill="#a8794f"/><circle cx="26" cy="26" r="1" fill="#a8794f"/><circle cx="20" cy="21" r="1" fill="#a8794f"/></svg>,
    "rug-fluffy":            <svg viewBox="0 0 40 40" width="26" height="26"><rect x="5" y="9" width="30" height="22" rx="2" fill="#e8b4bc" stroke="#c98a95" strokeWidth="1"/><path d="M8 13 Q12 10 16 13 Q20 10 24 13 Q28 10 32 13" stroke="#c98a95" strokeWidth="1" fill="none"/><path d="M8 20 Q12 17 16 20 Q20 17 24 20 Q28 17 32 20" stroke="#c98a95" strokeWidth="1" fill="none"/><path d="M8 27 Q12 24 16 27 Q20 24 24 27 Q28 24 32 27" stroke="#c98a95" strokeWidth="1" fill="none"/></svg>,
    "rug-low-pile":          <svg viewBox="0 0 40 40" width="26" height="26"><rect x="5" y="9" width="30" height="22" rx="1" fill="#7d8f69" stroke="#57654a" strokeWidth="1"/></svg>,
    "rug-high-pile":         <svg viewBox="0 0 40 40" width="26" height="26"><rect x="5" y="9" width="30" height="22" rx="2" fill="#6b8ba4" stroke="#4c6b81" strokeWidth="1"/><circle cx="10" cy="13" r="1.2" fill="#4c6b81"/><circle cx="15" cy="17" r="1.2" fill="#4c6b81"/><circle cx="20" cy="12" r="1.2" fill="#4c6b81"/><circle cx="25" cy="16" r="1.2" fill="#4c6b81"/><circle cx="30" cy="20" r="1.2" fill="#4c6b81"/><circle cx="12" cy="22" r="1.2" fill="#4c6b81"/><circle cx="18" cy="26" r="1.2" fill="#4c6b81"/><circle cx="24" cy="23" r="1.2" fill="#4c6b81"/><circle cx="29" cy="27" r="1.2" fill="#4c6b81"/></svg>,
    "rug-round":             <svg viewBox="0 0 40 40" width="26" height="26"><circle cx="20" cy="20" r="14" fill="#b56576" stroke="#874a56" strokeWidth="1"/></svg>,
    "rug-oval":              <svg viewBox="0 0 40 40" width="26" height="26"><ellipse cx="20" cy="20" rx="15" ry="10" fill="#588157" stroke="#3f5f3f" strokeWidth="1"/></svg>,
    "rug-runner":            <svg viewBox="0 0 40 40" width="26" height="26"><rect x="13" y="4" width="14" height="32" rx="1" fill="#bc6c25" stroke="#8f501a" strokeWidth="1"/></svg>,
    "rug-extra-long-runner": <svg viewBox="0 0 40 40" width="26" height="26"><rect x="15" y="2" width="10" height="36" rx="1" fill="#6d597a" stroke="#4d3f57" strokeWidth="1"/></svg>,
    "rug-square":            <svg viewBox="0 0 40 40" width="26" height="26"><rect x="7" y="7" width="26" height="26" rx="1" fill="#457b9d" stroke="#305773" strokeWidth="1"/></svg>,
    "rug-faux-fur":          <svg viewBox="0 0 40 40" width="26" height="26"><path d="M12 6 Q6 12 8 20 Q5 28 12 34 Q20 37 28 33 Q35 28 32 19 Q35 11 27 7 Q20 4 12 6 Z" fill="#e0a458" stroke="#b47e3e" strokeWidth="1"/></svg>,
    "rug-sheepskin":         <svg viewBox="0 0 40 40" width="26" height="26"><path d="M14 8 Q8 10 9 16 Q4 18 6 23 Q9 24 11 22 Q9 28 13 31 Q12 35 16 35 Q18 32 20 33 Q22 32 24 35 Q28 35 27 31 Q31 28 29 22 Q31 24 34 23 Q36 18 31 16 Q32 10 26 8 Q20 5 14 8 Z" fill="#c08497" stroke="#93606f" strokeWidth="1"/></svg>,
    "rug-boucle":            <svg viewBox="0 0 40 40" width="26" height="26"><rect x="5" y="9" width="30" height="22" rx="1" fill="#9c8aa5" stroke="#756380" strokeWidth="1"/><circle cx="10" cy="13" r="0.9" fill="none" stroke="#756380"/><circle cx="15" cy="16" r="0.9" fill="none" stroke="#756380"/><circle cx="20" cy="13" r="0.9" fill="none" stroke="#756380"/><circle cx="25" cy="17" r="0.9" fill="none" stroke="#756380"/><circle cx="30" cy="14" r="0.9" fill="none" stroke="#756380"/><circle cx="12" cy="22" r="0.9" fill="none" stroke="#756380"/><circle cx="18" cy="25" r="0.9" fill="none" stroke="#756380"/><circle cx="24" cy="22" r="0.9" fill="none" stroke="#756380"/><circle cx="29" cy="26" r="0.9" fill="none" stroke="#756380"/></svg>,
    "rug-woven-jute-style":  <svg viewBox="0 0 40 40" width="26" height="26"><rect x="5" y="9" width="30" height="22" rx="1" fill="#9c6b3f" stroke="#78522f" strokeWidth="1"/><path d="M5 13 H35 M5 17 H35 M5 21 H35 M5 25 H35 M5 29 H35" stroke="#78522f" strokeWidth="0.8"/><path d="M10 9 V31 M17 9 V31 M24 9 V31 M31 9 V31" stroke="#78522f" strokeWidth="0.8"/></svg>,
    "rug-sisal-style":       <svg viewBox="0 0 40 40" width="26" height="26"><rect x="5" y="9" width="30" height="22" rx="1" fill="#ba9455" stroke="#937339" strokeWidth="1"/><path d="M5 14 H35 M5 20 H35 M5 26 H35" stroke="#937339" strokeWidth="0.7"/></svg>,
    "rug-vintage-pattern":   <svg viewBox="0 0 40 40" width="26" height="26"><rect x="5" y="9" width="30" height="22" rx="1" fill="#8d5b4c" stroke="#6b4238" strokeWidth="1"/><rect x="9" y="12" width="22" height="16" fill="none" stroke="#6b4238" strokeWidth="1"/><circle cx="20" cy="20" r="3.5" fill="none" stroke="#6b4238" strokeWidth="1"/></svg>,
    "rug-oriental-pattern":  <svg viewBox="0 0 40 40" width="26" height="26"><rect x="5" y="9" width="30" height="22" rx="1" fill="#4a5859" stroke="#33403f" strokeWidth="1"/><rect x="8" y="11" width="24" height="18" fill="none" stroke="#33403f" strokeWidth="1"/><rect x="11" y="13" width="18" height="14" fill="none" stroke="#33403f" strokeWidth="0.7"/><circle cx="20" cy="20" r="4" fill="none" stroke="#33403f" strokeWidth="1"/></svg>,
    "rug-modern-abstract":   <svg viewBox="0 0 40 40" width="26" height="26"><rect x="5" y="9" width="30" height="22" rx="1" fill="#3d5a80" stroke="#293e58" strokeWidth="1"/><path d="M10 28 A9 9 0 0 1 19 19" fill="none" stroke="#293e58" strokeWidth="1.2"/><path d="M16 28 A7 7 0 0 1 23 21" fill="none" stroke="#293e58" strokeWidth="1.2"/><path d="M22 28 A6 6 0 0 1 28 22" fill="none" stroke="#293e58" strokeWidth="1.2"/></svg>,
    "rug-geometric":         <svg viewBox="0 0 40 40" width="26" height="26"><rect x="5" y="9" width="30" height="22" rx="1" fill="#ee6c4d" stroke="#c94f34" strokeWidth="1"/><path d="M8 20 A8 8 0 0 1 20 12" fill="none" stroke="#c94f34" strokeWidth="1"/><path d="M12 24 A11 11 0 0 1 27 13" fill="none" stroke="#c94f34" strokeWidth="1"/><path d="M16 27 A14 14 0 0 1 33 15" fill="none" stroke="#c94f34" strokeWidth="1"/></svg>,
    "rug-moroccan-style":    <svg viewBox="0 0 40 40" width="26" height="26"><rect x="5" y="9" width="30" height="22" rx="1" fill="#7b2d43" stroke="#5c1f31" strokeWidth="1"/><path d="M11 13 L15 17 L11 21 L7 17 Z M20 13 L24 17 L20 21 L16 17 Z M29 13 L33 17 L29 21 L25 17 Z M11 21 L15 25 L11 29 L7 25 Z M20 21 L24 25 L20 29 L16 25 Z M29 21 L33 25 L29 29 L25 25 Z" fill="none" stroke="#5c1f31" strokeWidth="0.8"/></svg>,
    "rug-trellis-pattern":   <svg viewBox="0 0 40 40" width="26" height="26"><rect x="5" y="9" width="30" height="22" rx="1" fill="#386641" stroke="#274a2d" strokeWidth="1"/><path d="M12 9 L26 20 L12 31 M28 9 L14 20 L28 31" fill="none" stroke="#274a2d" strokeWidth="1"/></svg>,
    "rug-striped":           <svg viewBox="0 0 40 40" width="26" height="26"><rect x="5" y="9" width="30" height="22" rx="1" fill="#2a6f77" stroke="#1d4e54" strokeWidth="1"/><rect x="9" y="9" width="2" height="22" fill="#eae2b7"/><rect x="14" y="9" width="2" height="22" fill="#eae2b7"/><rect x="19" y="9" width="2" height="22" fill="#eae2b7"/><rect x="24" y="9" width="2" height="22" fill="#eae2b7"/><rect x="29" y="9" width="2" height="22" fill="#eae2b7"/></svg>,
    "rug-diamond-pattern":   <svg viewBox="0 0 40 40" width="26" height="26"><rect x="5" y="9" width="30" height="22" rx="1" fill="#6a4c93" stroke="#4a3569" strokeWidth="1"/><path d="M20 11 L28 20 L20 29 L12 20 Z" fill="none" stroke="#4a3569" strokeWidth="1"/><path d="M20 15 L24 20 L20 25 L16 20 Z" fill="none" stroke="#4a3569" strokeWidth="0.8"/></svg>,
    "rug-chevron":           <svg viewBox="0 0 40 40" width="26" height="26"><rect x="5" y="9" width="30" height="22" rx="1" fill="#2b9348" stroke="#1f6b34" strokeWidth="1"/><path d="M7 14 L14 20 L7 26 M15 14 L22 20 L15 26 M23 14 L30 20 L23 26" fill="none" stroke="#1f6b34" strokeWidth="1.2"/></svg>,
    "rug-border-design":     <svg viewBox="0 0 40 40" width="26" height="26"><rect x="5" y="9" width="30" height="22" rx="1" fill="#8b2635" stroke="#641a26" strokeWidth="1"/><rect x="9" y="12" width="22" height="16" fill="none" stroke="#641a26" strokeWidth="1.3"/></svg>,
    "panel-arch":          <svg viewBox="0 0 40 40" width="26" height="26"><path d="M12 34 L12 18 Q12 8 20 8 Q28 8 28 18 L28 34 Z" fill="#b5654f" stroke="#8a4a39" strokeWidth="1"/><rect x="9" y="34" width="22" height="3" fill="#4a4a4a"/></svg>,
    "panel-double-arch":   <svg viewBox="0 0 40 40" width="26" height="26"><path d="M5 34 L5 22 Q5 15 10 15 Q15 15 15 22 L15 34 Z" fill="#4f7c8c" stroke="#375968" strokeWidth="1"/><path d="M14 34 L14 15 Q14 6 20 6 Q26 6 26 15 L26 34 Z" fill="#4f7c8c" stroke="#375968" strokeWidth="1"/><path d="M25 34 L25 22 Q25 15 30 15 Q35 15 35 22 L35 34 Z" fill="#4f7c8c" stroke="#375968" strokeWidth="1"/></svg>,
    "panel-wave":          <svg viewBox="0 0 40 40" width="26" height="26"><path d="M8 34 Q8 20 12 20 Q16 20 16 8 L20 8 Q20 20 24 20 Q28 20 28 34 Z" fill="#6b4e71" stroke="#4c3752" strokeWidth="1"/><rect x="9" y="34" width="22" height="3" fill="#4a4a4a"/></svg>,
    "panel-circle":        <svg viewBox="0 0 40 40" width="26" height="26"><circle cx="20" cy="19" r="13" fill="#4a7c59" stroke="#34593f" strokeWidth="1"/><rect x="14" y="34" width="12" height="3" fill="#4a4a4a"/></svg>,
    "panel-tall-rounded":  <svg viewBox="0 0 40 40" width="26" height="26"><path d="M9 36 L9 20 Q9 10 15 10 Q21 10 21 20 L21 36 Z" fill="#a15c3e" opacity="0.7" stroke="#7a452e" strokeWidth="1"/><path d="M18 36 L18 15 Q18 4 25 4 Q32 4 32 15 L32 36 Z" fill="#a15c3e" stroke="#7a452e" strokeWidth="1"/></svg>,
    "panel-layered":       <svg viewBox="0 0 40 40" width="26" height="26"><rect x="6" y="24" width="10" height="12" fill="#3d6b8a" opacity="0.6" stroke="#2b4d63" strokeWidth="1"/><rect x="15" y="14" width="10" height="22" fill="#3d6b8a" opacity="0.8" stroke="#2b4d63" strokeWidth="1"/><rect x="24" y="19" width="10" height="17" fill="#3d6b8a" stroke="#2b4d63" strokeWidth="1"/></svg>,
    "panel-fan":           <svg viewBox="0 0 40 40" width="26" height="26"><g stroke="#6b436d" strokeWidth="0.8"><rect x="19" y="10" width="2" height="26" fill="#8c5a8e" transform="rotate(-40 20 36)"/><rect x="19" y="10" width="2" height="26" fill="#8c5a8e" transform="rotate(-20 20 36)"/><rect x="19" y="8" width="2" height="28" fill="#8c5a8e"/><rect x="19" y="10" width="2" height="26" fill="#8c5a8e" transform="rotate(20 20 36)"/><rect x="19" y="10" width="2" height="26" fill="#8c5a8e" transform="rotate(40 20 36)"/></g></svg>,
    "panel-scallop":       <svg viewBox="0 0 40 40" width="26" height="26"><path d="M4 34 L4 24 Q4 19 8 19 Q12 19 12 24 L12 34 Z" fill="#c2703f" stroke="#93532f" strokeWidth="0.8"/><path d="M11 34 L11 20 Q11 14 16 14 Q21 14 21 20 L21 34 Z" fill="#c2703f" stroke="#93532f" strokeWidth="0.8"/><path d="M20 34 L20 22 Q20 17 24 17 Q28 17 28 22 L28 34 Z" fill="#c2703f" stroke="#93532f" strokeWidth="0.8"/><path d="M27 34 L27 25 Q27 21 31 21 Q35 21 35 25 L35 34 Z" fill="#c2703f" stroke="#93532f" strokeWidth="0.8"/></svg>,
    "panel-square":        <svg viewBox="0 0 40 40" width="26" height="26"><rect x="9" y="9" width="22" height="27" fill="#567a4e" stroke="#3d5837" strokeWidth="1"/></svg>,
    "panel-classic-wall":  <svg viewBox="0 0 40 40" width="26" height="26"><rect x="8" y="8" width="24" height="28" fill="#7a4f3d" stroke="#5c3b2d" strokeWidth="1"/><rect x="13" y="13" width="14" height="18" fill="none" stroke="#5c3b2d" strokeWidth="1"/></svg>,
    "panel-slatted":       <svg viewBox="0 0 40 40" width="26" height="26"><rect x="8" y="7" width="24" height="29" fill="#4e6b5e" stroke="#384d44" strokeWidth="0.5"/><path d="M11 7 V36 M14.5 7 V36 M18 7 V36 M21.5 7 V36 M25 7 V36 M28.5 7 V36" stroke="#384d44" strokeWidth="1"/></svg>,
    "panel-grid":          <svg viewBox="0 0 40 40" width="26" height="26"><path d="M8 8 H32 M8 15 H32 M8 22 H32 M8 29 H32 M8 36 H32 M8 8 V36 M16 8 V36 M24 8 V36 M32 8 V36" fill="none" stroke="#6e4a5c" strokeWidth="1.3"/></svg>,
    "panel-acrylic":       <svg viewBox="0 0 40 40" width="26" height="26"><rect x="9" y="9" width="22" height="27" fill="#7fb3bd" opacity="0.5" stroke="#5c8891" strokeWidth="1"/></svg>,
    "panel-half-arch":     <svg viewBox="0 0 40 40" width="26" height="26"><path d="M9 36 L9 8 L20 8 Q31 8 31 24 L31 36 Z" fill="#a3773f" stroke="#7a5a2e" strokeWidth="1"/></svg>,
    "panel-curved-corner": <svg viewBox="0 0 40 40" width="26" height="26"><path d="M9 36 L9 9 L25 9 Q31 9 31 15 L31 36 Z" fill="#5c6e8a" stroke="#43506a" strokeWidth="1"/></svg>,
    "panel-angled":        <svg viewBox="0 0 40 40" width="26" height="26"><path d="M9 36 L9 9 L26 9 L31 15 L31 36 Z" fill="#8a4e4e" stroke="#683939" strokeWidth="1"/></svg>,
    "sign-acrylic-arch":   <svg viewBox="0 0 40 40" width="26" height="26"><path d="M14 34 L14 20 Q14 12 20 12 Q26 12 26 20 L26 34 Z" fill="#6fa8b5" opacity="0.55" stroke="#4e7d88" strokeWidth="1"/><line x1="14" y1="34" x2="12" y2="38" stroke="#C9A44C" strokeWidth="1.3"/><line x1="26" y1="34" x2="28" y2="38" stroke="#C9A44C" strokeWidth="1.3"/><circle cx="11" cy="33" r="2.5" fill="#f0a8c0"/></svg>,
    "sign-mirror":         <svg viewBox="0 0 40 40" width="26" height="26"><path d="M13 34 L13 18 Q13 9 20 9 Q27 9 27 18 L27 34 Z" fill="#8fae9e" opacity="0.7" stroke="#C9A44C" strokeWidth="1.2"/><line x1="13" y1="34" x2="11" y2="38" stroke="#C9A44C" strokeWidth="1.3"/><line x1="27" y1="34" x2="29" y2="38" stroke="#C9A44C" strokeWidth="1.3"/><circle cx="10" cy="30" r="3.5" fill="#f0a8c0"/></svg>,
    "sign-minimal-arch":   <svg viewBox="0 0 40 40" width="26" height="26"><path d="M15 36 L15 22 Q15 13 20 13 Q25 13 25 22 L25 36 Z" fill="#b0724f" stroke="#855636" strokeWidth="1"/><circle cx="28" cy="34" r="2.5" fill="#f0a8c0"/></svg>,
    "sign-round":          <svg viewBox="0 0 40 40" width="26" height="26"><circle cx="20" cy="17" r="9" fill="#6a4c7a" stroke="#4c3659" strokeWidth="1"/><line x1="20" y1="26" x2="14" y2="38" stroke="#C9A44C" strokeWidth="1.3"/><line x1="20" y1="26" x2="26" y2="38" stroke="#C9A44C" strokeWidth="1.3"/><circle cx="12" cy="30" r="2.5" fill="#f0a8c0"/></svg>,
    "sign-modern-wave":    <svg viewBox="0 0 40 40" width="26" height="26"><path d="M15 36 L15 16 Q17 12 20 16 Q23 20 25 16 L25 36 Z" fill="#4a7d6e" stroke="#345a4e" strokeWidth="1"/><circle cx="20" cy="35" r="2.3" fill="#f0a8c0"/></svg>,
    "sign-hanging-fabric": <svg viewBox="0 0 40 40" width="26" height="26"><rect x="6" y="6" width="28" height="2.5" fill="#C9A44C"/><path d="M11 9 Q10 22 12 35 L28 35 Q30 22 29 9 Z" fill="#b0567a" stroke="#8a3f5c" strokeWidth="1"/></svg>,
    "sign-wooden-arch":    <svg viewBox="0 0 40 40" width="26" height="26"><path d="M14 34 L14 20 Q14 12 20 12 Q26 12 26 20 L26 34 Z" fill="#a9754a" stroke="#8B5E3C" strokeWidth="1"/><line x1="16" y1="34" x2="10" y2="38" stroke="#6f4a2e" strokeWidth="1.3"/><line x1="24" y1="34" x2="30" y2="38" stroke="#6f4a2e" strokeWidth="1.3"/><line x1="20" y1="34" x2="20" y2="38" stroke="#6f4a2e" strokeWidth="1.3"/><circle cx="11" cy="33" r="2.5" fill="#f0a8c0"/></svg>,
    "sign-clear-frame":    <svg viewBox="0 0 40 40" width="26" height="26"><rect x="10" y="9" width="20" height="26" fill="none" stroke="#C9A44C" strokeWidth="1.6"/><rect x="13" y="12" width="14" height="20" fill="#7a93b8" opacity="0.4"/><line x1="12" y1="35" x2="10" y2="39" stroke="#C9A44C" strokeWidth="1.3"/><line x1="28" y1="35" x2="30" y2="39" stroke="#C9A44C" strokeWidth="1.3"/></svg>,
    "art-abstract-textured":     <svg viewBox="0 0 40 40" width="26" height="26"><rect x="6" y="6" width="28" height="28" fill="none" stroke="#C9A44C" strokeWidth="1.5"/><rect x="9" y="9" width="22" height="22" fill="#a85c4a"/><path d="M11 14 H29 M11 20 H29 M11 26 H29" stroke="#7a4536" strokeWidth="1.2"/></svg>,
    "art-minimal-abstract":      <svg viewBox="0 0 40 40" width="26" height="26"><rect x="6" y="6" width="28" height="28" fill="none" stroke="#C9A44C" strokeWidth="1.5"/><rect x="9" y="9" width="22" height="22" fill="#4a6b8a"/><circle cx="16" cy="17" r="6" fill="#2f4d6b"/><circle cx="24" cy="23" r="5" fill="#2f4d6b" opacity="0.8"/></svg>,
    "art-neutral-brush-strokes": <svg viewBox="0 0 40 40" width="26" height="26"><rect x="6" y="6" width="28" height="28" fill="none" stroke="#C9A44C" strokeWidth="1.5"/><rect x="9" y="9" width="22" height="22" fill="#6b8f6b"/><circle cx="15" cy="16" r="5.5" fill="#4a6b4a"/><circle cx="21" cy="21" r="5" fill="#4a6b4a" opacity="0.75"/><circle cx="26" cy="14" r="3.5" fill="#4a6b4a" opacity="0.6"/></svg>,
    "art-botanical-leaves":      <svg viewBox="0 0 40 40" width="26" height="26"><rect x="6" y="6" width="28" height="28" fill="none" stroke="#C9A44C" strokeWidth="1.5"/><rect x="9" y="9" width="22" height="22" fill="#5c7a5c"/><line x1="20" y1="12" x2="20" y2="28" stroke="#2e4a2e" strokeWidth="1.2"/><path d="M20 16 Q25 15 24 19 Q20 19 20 16 M20 22 Q15 21 16 25 Q20 25 20 22" fill="#2e4a2e"/></svg>,
    "art-line-art":              <svg viewBox="0 0 40 40" width="26" height="26"><rect x="6" y="6" width="28" height="28" fill="none" stroke="#C9A44C" strokeWidth="1.5"/><rect x="9" y="9" width="22" height="22" fill="#7a5c6b"/><path d="M18 12 Q23 16 18 20 Q14 24 20 28" fill="none" stroke="#4a3646" strokeWidth="1.2"/></svg>,
    "art-landscape":              <svg viewBox="0 0 40 40" width="26" height="26"><rect x="6" y="6" width="28" height="28" fill="none" stroke="#C9A44C" strokeWidth="1.5"/><rect x="9" y="9" width="22" height="10" fill="#7a9cae"/><rect x="9" y="19" width="22" height="7" fill="#5c7a6e"/><rect x="9" y="26" width="22" height="5" fill="#3d5c4a"/></svg>,
    "art-floral-painting":       <svg viewBox="0 0 40 40" width="26" height="26"><rect x="6" y="6" width="28" height="28" fill="none" stroke="#C9A44C" strokeWidth="1.5"/><rect x="9" y="9" width="22" height="22" fill="#b06a7e"/><circle cx="15" cy="22" r="3" fill="#f4c2d1" stroke="#d69cb0" strokeWidth="0.6"/><circle cx="20" cy="18" r="3.3" fill="#f4c2d1" stroke="#d69cb0" strokeWidth="0.6"/><circle cx="25" cy="22" r="3" fill="#f4c2d1" stroke="#d69cb0" strokeWidth="0.6"/><line x1="20" y1="21" x2="20" y2="29" stroke="#3d5837" strokeWidth="1"/></svg>,
    "art-gold-texture":          <svg viewBox="0 0 40 40" width="26" height="26"><rect x="6" y="6" width="28" height="28" fill="none" stroke="#C9A44C" strokeWidth="1.5"/><rect x="9" y="9" width="22" height="22" fill="#c9a44c"/><circle cx="14" cy="14" r="1" fill="#8a6a2e"/><circle cx="19" cy="12" r="1.3" fill="#8a6a2e"/><circle cx="24" cy="16" r="0.8" fill="#8a6a2e"/><circle cx="16" cy="20" r="1.1" fill="#8a6a2e"/><circle cx="22" cy="23" r="1" fill="#8a6a2e"/><circle cx="27" cy="19" r="1.2" fill="#8a6a2e"/><circle cx="12" cy="26" r="0.9" fill="#8a6a2e"/><circle cx="25" cy="27" r="1" fill="#8a6a2e"/></svg>,
    "stage-flat-backdrop":           <svg viewBox="0 0 40 40" width="26" height="26"><rect x="7" y="6" width="26" height="18" fill="#d98e73" stroke="#a8654a" strokeWidth="1"/><rect x="4" y="24" width="32" height="8" fill="#d98e73" stroke="#a8654a" strokeWidth="1"/><rect x="15" y="32" width="10" height="3" fill="#c47a5f"/></svg>,
    "stage-round-tiered-podium":     <svg viewBox="0 0 40 40" width="26" height="26"><ellipse cx="20" cy="27" rx="17" ry="6" fill="#6b8f71" stroke="#4a6b50" strokeWidth="1"/><ellipse cx="20" cy="21" rx="12" ry="4.5" fill="#82a688" stroke="#4a6b50" strokeWidth="1"/></svg>,
    "stage-inset-top-platform":      <svg viewBox="0 0 40 40" width="26" height="26"><rect x="4" y="24" width="32" height="8" fill="#c9a44c" stroke="#9c7c33" strokeWidth="1"/><rect x="13" y="16" width="14" height="8" fill="#c9a44c" stroke="#9c7c33" strokeWidth="1"/><rect x="15" y="32" width="10" height="3" fill="#b8923f"/></svg>,
    "stage-wave-backdrop":           <svg viewBox="0 0 40 40" width="26" height="26"><path d="M7 24 L7 12 Q11 6 16 12 Q20 17 24 12 Q29 6 33 12 L33 24 Z" fill="#7a9cc6" stroke="#5678a0" strokeWidth="1"/><rect x="4" y="24" width="32" height="8" fill="#7a9cc6" stroke="#5678a0" strokeWidth="1"/><rect x="15" y="32" width="10" height="3" fill="#6a8ab3"/></svg>,
    "stage-side-wall-panels":        <svg viewBox="0 0 40 40" width="26" height="26"><rect x="6" y="8" width="6" height="18" fill="#a65d57" stroke="#7c413c" strokeWidth="1"/><rect x="28" y="8" width="6" height="18" fill="#a65d57" stroke="#7c413c" strokeWidth="1"/><rect x="4" y="24" width="32" height="6" fill="#a65d57" stroke="#7c413c" strokeWidth="1"/><rect x="6" y="30" width="28" height="4" fill="#935049" stroke="#7c413c" strokeWidth="1"/></svg>,
    "stage-round-arch":              <svg viewBox="0 0 40 40" width="26" height="26"><path d="M9 24 Q9 8 20 8 Q31 8 31 24" fill="none" stroke="#64548f" strokeWidth="3.5"/><ellipse cx="20" cy="27" rx="14" ry="5" fill="#8e7cc3" stroke="#64548f" strokeWidth="1"/></svg>,
    "stage-tall-flat-backdrop":      <svg viewBox="0 0 40 40" width="26" height="26"><rect x="8" y="3" width="24" height="21" fill="#2f4858" stroke="#1c2c37" strokeWidth="1"/><rect x="4" y="24" width="32" height="8" fill="#2f4858" stroke="#1c2c37" strokeWidth="1"/><rect x="15" y="32" width="10" height="3" fill="#263d4a"/></svg>,
    "stage-arch-dome-backdrop":      <svg viewBox="0 0 40 40" width="26" height="26"><path d="M11 24 L11 15 Q11 7 20 7 Q29 7 29 15 L29 24 Z" fill="#d4a5a5" stroke="#a97575" strokeWidth="1"/><rect x="4" y="24" width="32" height="8" fill="#d4a5a5" stroke="#a97575" strokeWidth="1"/><rect x="15" y="32" width="10" height="3" fill="#c48f8f"/></svg>,
    "stage-tall-arch-dome-backdrop": <svg viewBox="0 0 40 40" width="26" height="26"><path d="M14 24 L14 11 Q14 3 20 3 Q26 3 26 11 L26 24 Z" fill="#4a7c6f" stroke="#325650" strokeWidth="1"/><rect x="4" y="24" width="32" height="8" fill="#4a7c6f" stroke="#325650" strokeWidth="1"/><rect x="15" y="32" width="10" height="3" fill="#3f6c60"/></svg>,
    "stage-octagon-platform":        <svg viewBox="0 0 40 40" width="26" height="26"><path d="M12 24 L9 27 L9 31 L12 34 L28 34 L31 31 L31 27 L28 24 Z" fill="#b08968" stroke="#86644a" strokeWidth="1"/><rect x="15" y="34" width="10" height="2.5" fill="#9c7355"/></svg>,
    "stage-curved-s-tiered":         <svg viewBox="0 0 40 40" width="26" height="26"><path d="M9 22 Q13 12 20 17 Q27 22 31 12 L31 22 L9 22 Z" fill="#6f4e7c" stroke="#4d3557" strokeWidth="1"/><ellipse cx="20" cy="27" rx="15" ry="5.5" fill="#6f4e7c" stroke="#4d3557" strokeWidth="1"/><ellipse cx="20" cy="22" rx="10" ry="4" fill="#5f4269" stroke="#4d3557" strokeWidth="1"/></svg>,
    "stage-open-frame-backdrop":     <svg viewBox="0 0 40 40" width="26" height="26"><rect x="9" y="4" width="22" height="20" fill="none" stroke="#576050" strokeWidth="2"/><rect x="4" y="24" width="32" height="8" fill="#7c8471" stroke="#576050" strokeWidth="1"/><rect x="15" y="32" width="10" height="3" fill="#6d7461"/></svg>,
    "stage-multi-panel-backdrop":    <svg viewBox="0 0 40 40" width="26" height="26"><rect x="8" y="10" width="7" height="14" fill="#9c4f4f" opacity="0.7" stroke="#723939" strokeWidth="1"/><rect x="16" y="5" width="8" height="19" fill="#9c4f4f" stroke="#723939" strokeWidth="1"/><rect x="25" y="9" width="7" height="15" fill="#9c4f4f" opacity="0.85" stroke="#723939" strokeWidth="1"/><rect x="4" y="24" width="32" height="8" fill="#9c4f4f" stroke="#723939" strokeWidth="1"/></svg>,
    "stage-round-drum":              <svg viewBox="0 0 40 40" width="26" height="26"><rect x="10" y="8" width="20" height="24" rx="1" fill="#3f6b6f" stroke="#294a4d" strokeWidth="1"/><ellipse cx="20" cy="8" rx="10" ry="3" fill="#5a8b8f" stroke="#294a4d" strokeWidth="1"/><ellipse cx="20" cy="32" rx="11" ry="2.5" fill="#2d4d50" stroke="#294a4d" strokeWidth="1"/></svg>,
    "stage-tiered-pyramid":          <svg viewBox="0 0 40 40" width="26" height="26"><rect x="4" y="28" width="32" height="6" fill="#c17c3f" stroke="#93602f" strokeWidth="1"/><rect x="8" y="22" width="24" height="6" fill="#c17c3f" stroke="#93602f" strokeWidth="1"/><rect x="12" y="16" width="16" height="6" fill="#c17c3f" stroke="#93602f" strokeWidth="1"/><rect x="16" y="10" width="8" height="6" fill="#c17c3f" stroke="#93602f" strokeWidth="1"/></svg>,
    "stage-curtain-backdrop":        <svg viewBox="0 0 40 40" width="26" height="26"><rect x="11" y="8" width="18" height="16" fill="#b5647a" stroke="#874a5b" strokeWidth="1"/><path d="M6 9 Q5 17 7 24 L11 24 Q9 17 10 9 Z" fill="#e6b8c4" stroke="#c98fa0" strokeWidth="0.8"/><path d="M34 9 Q35 17 33 24 L29 24 Q31 17 30 9 Z" fill="#e6b8c4" stroke="#c98fa0" strokeWidth="0.8"/><rect x="4" y="24" width="32" height="8" fill="#b5647a" stroke="#874a5b" strokeWidth="1"/></svg>,
    "stage-organic-platform":        <svg viewBox="0 0 40 40" width="26" height="26"><path d="M10 22 Q4 24 6 28 Q4 33 12 33 Q16 36 22 33 Q30 35 32 29 Q37 26 31 22 Q33 17 26 18 Q20 14 14 18 Q7 17 10 22 Z" fill="#6a8caf" stroke="#4a6580" strokeWidth="1"/></svg>,
    "stage-hexagon-platform":        <svg viewBox="0 0 40 40" width="26" height="26"><path d="M14 24 L26 24 L31 29 L26 34 L14 34 L9 29 Z" fill="#4f6b4f" stroke="#374a37" strokeWidth="1"/></svg>,
    "stage-triple-arch-backdrop":    <svg viewBox="0 0 40 40" width="26" height="26"><path d="M5 24 L5 16 Q5 11 9 11 Q13 11 13 16 L13 24 Z" fill="#a3785f" opacity="0.8" stroke="#785942" strokeWidth="0.8"/><path d="M15 24 L15 12 Q15 6 20 6 Q25 6 25 12 L25 24 Z" fill="#a3785f" stroke="#785942" strokeWidth="0.8"/><path d="M27 24 L27 16 Q27 11 31 11 Q35 11 35 16 L35 24 Z" fill="#a3785f" opacity="0.8" stroke="#785942" strokeWidth="0.8"/><rect x="4" y="24" width="32" height="8" fill="#a3785f" stroke="#785942" strokeWidth="1"/></svg>,
    "stage-corner-backdrop":         <svg viewBox="0 0 40 40" width="26" height="26"><rect x="7" y="6" width="16" height="18" fill="#5c5470" stroke="#423c52" strokeWidth="1"/><rect x="23" y="10" width="10" height="14" fill="#4d475f" stroke="#423c52" strokeWidth="1"/><rect x="4" y="24" width="32" height="6" fill="#5c5470" stroke="#423c52" strokeWidth="1"/><rect x="6" y="30" width="28" height="4" fill="#4d475f" stroke="#423c52" strokeWidth="1"/></svg>,

    // Balloons — every icon fills with the item's own vivid default color
    // (never white) so the catalog list stays legible at a glance.
    "bln-round-tassel":     <svg viewBox="0 0 40 40" width="26" height="26"><ellipse cx="20" cy="15" rx="10" ry="12" fill="#ef476f" stroke="#b8283f" strokeWidth="1"/><line x1="20" y1="27" x2="20" y2="35" stroke="#b8283f" strokeWidth="1"/><path d="M17 35 L23 35 L20 39 Z" fill="#b8283f"/></svg>,
    "bln-round-small":      <svg viewBox="0 0 40 40" width="26" height="26"><ellipse cx="20" cy="17" rx="7" ry="8" fill="#f78c6b" stroke="#c65f42" strokeWidth="1"/><line x1="20" y1="25" x2="20" y2="35" stroke="#c65f42" strokeWidth="1"/></svg>,
    "bln-heart-foil":       <svg viewBox="0 0 40 40" width="26" height="26"><path d="M20 28 C10 20 8 12 14 9 C18 7 20 11 20 13 C20 11 22 7 26 9 C32 12 30 20 20 28 Z" fill="#ff5d8f" stroke="#c23663" strokeWidth="1"/><line x1="20" y1="28" x2="20" y2="35" stroke="#c23663" strokeWidth="1"/></svg>,
    "bln-star-foil":        <svg viewBox="0 0 40 40" width="26" height="26"><polygon points="20,6 23,14 32,14 25,19 28,28 20,22 12,28 15,19 8,14 17,14" fill="#ffd166" stroke="#cc9f2e" strokeWidth="1"/><line x1="20" y1="28" x2="20" y2="35" stroke="#cc9f2e" strokeWidth="1"/></svg>,
    "bln-round-foil":       <svg viewBox="0 0 40 40" width="26" height="26"><ellipse cx="20" cy="16" rx="11" ry="10" fill="#06d6a0" stroke="#049a73" strokeWidth="1"/><ellipse cx="20" cy="16" rx="11" ry="3" fill="none" stroke="#049a73" strokeWidth="1"/><line x1="20" y1="26" x2="20" y2="35" stroke="#049a73" strokeWidth="1"/></svg>,
    "bln-oval-classic":     <svg viewBox="0 0 40 40" width="26" height="26"><ellipse cx="20" cy="15" rx="8" ry="13" fill="#7b2cbf" stroke="#5a1c8f" strokeWidth="1"/><line x1="20" y1="28" x2="20" y2="35" stroke="#5a1c8f" strokeWidth="1"/></svg>,
    "bln-pillow-foil":      <svg viewBox="0 0 40 40" width="26" height="26"><rect x="9" y="6" width="22" height="20" rx="5" fill="#4361ee" stroke="#2a41b8" strokeWidth="1"/><line x1="20" y1="26" x2="20" y2="35" stroke="#2a41b8" strokeWidth="1"/></svg>,
    "bln-diamond-foil":     <svg viewBox="0 0 40 40" width="26" height="26"><polygon points="20,4 30,16 20,28 10,16" fill="#f15bb5" stroke="#b93688" strokeWidth="1"/><line x1="20" y1="28" x2="20" y2="35" stroke="#b93688" strokeWidth="1"/></svg>,
    "bln-cluster-tassel":   <svg viewBox="0 0 40 40" width="26" height="26"><circle cx="14" cy="14" r="7" fill="#ff6b6b" stroke="#c94444" strokeWidth="1"/><circle cx="26" cy="12" r="6" fill="#ffd166" stroke="#c94444" strokeWidth="1"/><circle cx="20" cy="22" r="6.5" fill="#ff6b6b" stroke="#c94444" strokeWidth="1"/><line x1="20" y1="28" x2="20" y2="36" stroke="#c94444" strokeWidth="1"/></svg>,
    "bln-cluster-mixed":    <svg viewBox="0 0 40 40" width="26" height="26"><circle cx="14" cy="15" r="7" fill="#f4a261" stroke="#c17a3d" strokeWidth="1"/><circle cx="27" cy="13" r="6" fill="#2ec4b6" stroke="#c17a3d" strokeWidth="1"/><circle cx="20" cy="23" r="6.5" fill="#f4a261" stroke="#c17a3d" strokeWidth="1"/><line x1="20" y1="29" x2="20" y2="36" stroke="#c17a3d" strokeWidth="1"/></svg>,
    "bln-cluster-hearts":   <svg viewBox="0 0 40 40" width="26" height="26"><circle cx="14" cy="15" r="6.5" fill="#ff8fab" stroke="#c65f7d" strokeWidth="1"/><circle cx="26" cy="15" r="6.5" fill="#ff8fab" stroke="#c65f7d" strokeWidth="1"/><path d="M20 26 C16 22 15 18 18 17 C20 16 20 18 20 19 C20 18 20 16 22 17 C25 18 24 22 20 26 Z" fill="#d00000" stroke="#c65f7d" strokeWidth="0.5"/><line x1="20" y1="26" x2="20" y2="35" stroke="#c65f7d" strokeWidth="1"/></svg>,
    "bln-cluster-stars":    <svg viewBox="0 0 40 40" width="26" height="26"><circle cx="14" cy="15" r="6.5" fill="#ffbe0b" stroke="#cc960a" strokeWidth="1"/><circle cx="26" cy="15" r="6.5" fill="#ffbe0b" stroke="#cc960a" strokeWidth="1"/><polygon points="20,18 21.5,22 26,22 22.5,24.5 24,29 20,26.3 16,29 17.5,24.5 14,22 18.5,22" fill="#fb5607" stroke="#cc960a" strokeWidth="0.5"/><line x1="20" y1="29" x2="20" y2="35" stroke="#cc960a" strokeWidth="1"/></svg>,
    "bln-cluster-large":    <svg viewBox="0 0 40 40" width="26" height="26"><circle cx="12" cy="16" r="6" fill="#4cc9f0" stroke="#2f96b8" strokeWidth="1"/><circle cx="20" cy="10" r="6.5" fill="#4361ee" stroke="#2f96b8" strokeWidth="1"/><circle cx="28" cy="16" r="6" fill="#4cc9f0" stroke="#2f96b8" strokeWidth="1"/><circle cx="16" cy="23" r="5.5" fill="#4cc9f0" stroke="#2f96b8" strokeWidth="1"/><circle cx="24" cy="23" r="5.5" fill="#4cc9f0" stroke="#2f96b8" strokeWidth="1"/><line x1="20" y1="29" x2="20" y2="36" stroke="#2f96b8" strokeWidth="1"/></svg>,
    "bln-bubble-tassel":    <svg viewBox="0 0 40 40" width="26" height="26"><circle cx="20" cy="16" r="12" fill="#90e0ef" stroke="#5fb0c0" strokeWidth="1"/><circle cx="16" cy="20" r="3" fill="#ffd60a"/><circle cx="23" cy="21" r="2.5" fill="#ff006e"/><circle cx="20" cy="16" r="2.5" fill="#ffd60a"/><line x1="20" y1="28" x2="20" y2="36" stroke="#5fb0c0" strokeWidth="1"/></svg>,
    "bln-confetti-cluster": <svg viewBox="0 0 40 40" width="26" height="26"><circle cx="15" cy="15" r="7" fill="#80ed99" stroke="#4fbf6a" strokeWidth="1"/><circle cx="26" cy="14" r="6" fill="#80ed99" stroke="#4fbf6a" strokeWidth="1"/><circle cx="20" cy="23" r="6" fill="#80ed99" stroke="#4fbf6a" strokeWidth="1"/><circle cx="15" cy="15" r="1.3" fill="#ff006e"/><circle cx="26" cy="14" r="1.3" fill="#3a86ff"/><circle cx="20" cy="23" r="1.3" fill="#ffbe0b"/><line x1="20" y1="29" x2="20" y2="36" stroke="#4fbf6a" strokeWidth="1"/></svg>,
    "bln-tower-boxes":      <svg viewBox="0 0 40 40" width="26" height="26"><rect x="12" y="4" width="16" height="8" fill="#a2d2ff" stroke="#7391c9" strokeWidth="1"/><rect x="12" y="13" width="16" height="8" fill="#a2d2ff" stroke="#7391c9" strokeWidth="1"/><rect x="12" y="22" width="16" height="8" fill="#a2d2ff" stroke="#7391c9" strokeWidth="1"/><circle cx="17" cy="8" r="2.2" fill="#b298dc"/><circle cx="23" cy="17" r="2.2" fill="#ff006e"/><circle cx="17" cy="26" r="2.2" fill="#b298dc"/></svg>,
    "bln-arch-full":        <svg viewBox="0 0 40 40" width="26" height="26"><circle cx="4" cy="30" r="3" fill="#ef476f" stroke="#b8283f" strokeWidth="0.5"/><circle cx="7" cy="18" r="3" fill="#ef476f" stroke="#b8283f" strokeWidth="0.5"/><circle cx="13" cy="9" r="3" fill="#ffd166" stroke="#b8283f" strokeWidth="0.5"/><circle cx="20" cy="6" r="3" fill="#ef476f" stroke="#b8283f" strokeWidth="0.5"/><circle cx="27" cy="9" r="3" fill="#ffd166" stroke="#b8283f" strokeWidth="0.5"/><circle cx="33" cy="18" r="3" fill="#ef476f" stroke="#b8283f" strokeWidth="0.5"/><circle cx="36" cy="30" r="3" fill="#ef476f" stroke="#b8283f" strokeWidth="0.5"/></svg>,
    "bln-arch-half":        <svg viewBox="0 0 40 40" width="26" height="26"><circle cx="6" cy="34" r="3" fill="#fb8500" stroke="#c46600" strokeWidth="0.5"/><circle cx="6" cy="24" r="3" fill="#fb8500" stroke="#c46600" strokeWidth="0.5"/><circle cx="9" cy="14" r="3" fill="#219ebc" stroke="#c46600" strokeWidth="0.5"/><circle cx="16" cy="7" r="3" fill="#fb8500" stroke="#c46600" strokeWidth="0.5"/><circle cx="25" cy="6" r="3" fill="#fb8500" stroke="#c46600" strokeWidth="0.5"/><circle cx="32" cy="11" r="3" fill="#219ebc" stroke="#c46600" strokeWidth="0.5"/></svg>,
    "bln-ring-open":        <svg viewBox="0 0 40 40" width="26" height="26"><circle cx="20" cy="8" r="3" fill="#9d4edd" stroke="#6a2ca3" strokeWidth="0.5"/><circle cx="28" cy="12" r="3" fill="#9d4edd" stroke="#6a2ca3" strokeWidth="0.5"/><circle cx="31" cy="20" r="3" fill="#3a0ca3" stroke="#6a2ca3" strokeWidth="0.5"/><circle cx="28" cy="28" r="3" fill="#9d4edd" stroke="#6a2ca3" strokeWidth="0.5"/><circle cx="20" cy="32" r="3" fill="#9d4edd" stroke="#6a2ca3" strokeWidth="0.5"/><circle cx="12" cy="28" r="3" fill="#3a0ca3" stroke="#6a2ca3" strokeWidth="0.5"/><circle cx="9" cy="20" r="3" fill="#9d4edd" stroke="#6a2ca3" strokeWidth="0.5"/><circle cx="12" cy="12" r="3" fill="#9d4edd" stroke="#6a2ca3" strokeWidth="0.5"/><line x1="20" y1="32" x2="20" y2="38" stroke="#4a4e69" strokeWidth="1.5"/></svg>,
    "bln-ring-wreath":      <svg viewBox="0 0 40 40" width="26" height="26"><circle cx="20" cy="7" r="3" fill="#38b000" stroke="#28800a" strokeWidth="0.5"/><circle cx="27" cy="9" r="3" fill="#38b000" stroke="#28800a" strokeWidth="0.5"/><circle cx="32" cy="15" r="3" fill="#ffd60a" stroke="#28800a" strokeWidth="0.5"/><circle cx="33" cy="22" r="3" fill="#38b000" stroke="#28800a" strokeWidth="0.5"/><circle cx="29" cy="28" r="3" fill="#38b000" stroke="#28800a" strokeWidth="0.5"/><circle cx="22" cy="32" r="3" fill="#ffd60a" stroke="#28800a" strokeWidth="0.5"/><circle cx="14" cy="31" r="3" fill="#38b000" stroke="#28800a" strokeWidth="0.5"/><circle cx="8" cy="26" r="3" fill="#38b000" stroke="#28800a" strokeWidth="0.5"/><circle cx="7" cy="18" r="3" fill="#ffd60a" stroke="#28800a" strokeWidth="0.5"/><circle cx="12" cy="11" r="3" fill="#38b000" stroke="#28800a" strokeWidth="0.5"/></svg>,
    "bln-arc-partial":      <svg viewBox="0 0 40 40" width="26" height="26"><circle cx="10" cy="8" r="3" fill="#f72585" stroke="#a5175f" strokeWidth="0.5"/><circle cx="18" cy="6" r="3" fill="#7209b7" stroke="#a5175f" strokeWidth="0.5"/><circle cx="26" cy="8" r="3" fill="#f72585" stroke="#a5175f" strokeWidth="0.5"/><circle cx="32" cy="15" r="3" fill="#f72585" stroke="#a5175f" strokeWidth="0.5"/><circle cx="32" cy="24" r="3" fill="#7209b7" stroke="#a5175f" strokeWidth="0.5"/><circle cx="27" cy="31" r="3" fill="#f72585" stroke="#a5175f" strokeWidth="0.5"/></svg>,
    "bln-column-round":     <svg viewBox="0 0 40 40" width="26" height="26"><circle cx="20" cy="30" r="7" fill="#1b998b" stroke="#116b62" strokeWidth="1"/><circle cx="20" cy="18" r="6" fill="#1b998b" stroke="#116b62" strokeWidth="1"/><circle cx="20" cy="8" r="5" fill="#1b998b" stroke="#116b62" strokeWidth="1"/><rect x="14" y="36" width="12" height="3" fill="#4a4e69"/></svg>,
    "bln-column-tapered":   <svg viewBox="0 0 40 40" width="26" height="26"><circle cx="20" cy="31" r="7.5" fill="#3f37c9" stroke="#2a2694" strokeWidth="1"/><circle cx="20" cy="19" r="6.2" fill="#3f37c9" stroke="#2a2694" strokeWidth="1"/><circle cx="20" cy="9" r="5" fill="#3f37c9" stroke="#2a2694" strokeWidth="1"/><rect x="14" y="36" width="12" height="3" fill="#4a4e69"/></svg>,
    "bln-column-heart":     <svg viewBox="0 0 40 40" width="26" height="26"><path d="M20 20 C13 14 12 8 17 6 C19 5 20 8 20 9 C20 8 21 5 23 6 C28 8 27 14 20 20 Z" fill="#d00000" stroke="#8f0000" strokeWidth="0.7"/><path d="M20 34 C13 28 12 22 17 20 C19 19 20 22 20 23 C20 22 21 19 23 20 C28 22 27 28 20 34 Z" fill="#d00000" stroke="#8f0000" strokeWidth="0.7"/><line x1="20" y1="34" x2="20" y2="38" stroke="#4a4e69" strokeWidth="1"/></svg>,
    "bln-column-star":      <svg viewBox="0 0 40 40" width="26" height="26"><polygon points="20,4 22,10 28,10 23,14 25,20 20,16 15,20 17,14 12,10 18,10" fill="#ffb703" stroke="#cc8f00" strokeWidth="0.7"/><polygon points="20,18 22,24 28,24 23,28 25,34 20,30 15,34 17,28 12,24 18,24" fill="#ffb703" stroke="#cc8f00" strokeWidth="0.7"/></svg>,
    "bln-column-cluster-organic": <svg viewBox="0 0 40 40" width="26" height="26"><circle cx="18" cy="34" r="4" fill="#ff9f1c" stroke="#c67811" strokeWidth="0.5"/><circle cx="23" cy="28" r="3.5" fill="#2ec4b6" stroke="#c67811" strokeWidth="0.5"/><circle cx="17" cy="22" r="4" fill="#ff9f1c" stroke="#c67811" strokeWidth="0.5"/><circle cx="23" cy="16" r="3.5" fill="#ff9f1c" stroke="#c67811" strokeWidth="0.5"/><circle cx="18" cy="10" r="3.5" fill="#2ec4b6" stroke="#c67811" strokeWidth="0.5"/><circle cx="22" cy="5" r="3" fill="#ff9f1c" stroke="#c67811" strokeWidth="0.5"/></svg>,
    "bln-column-cluster-dense":   <svg viewBox="0 0 40 40" width="26" height="26"><circle cx="18" cy="35" r="3.5" fill="#00b4d8" stroke="#0081a3" strokeWidth="0.5"/><circle cx="23" cy="31" r="3" fill="#ef476f" stroke="#0081a3" strokeWidth="0.5"/><circle cx="17" cy="26" r="3.5" fill="#00b4d8" stroke="#0081a3" strokeWidth="0.5"/><circle cx="22" cy="21" r="3" fill="#00b4d8" stroke="#0081a3" strokeWidth="0.5"/><circle cx="18" cy="16" r="3.5" fill="#ef476f" stroke="#0081a3" strokeWidth="0.5"/><circle cx="22" cy="11" r="3" fill="#00b4d8" stroke="#0081a3" strokeWidth="0.5"/><circle cx="19" cy="6" r="3" fill="#00b4d8" stroke="#0081a3" strokeWidth="0.5"/></svg>,
    "bln-wall-grid":        <svg viewBox="0 0 40 40" width="26" height="26"><rect x="4" y="4" width="32" height="28" fill="none" stroke="#4a4e69" strokeWidth="1"/><circle cx="9" cy="10" r="2.6" fill="#ff006e"/><circle cx="16" cy="10" r="2.6" fill="#ffd166"/><circle cx="23" cy="10" r="2.6" fill="#ff006e"/><circle cx="30" cy="10" r="2.6" fill="#ff006e"/><circle cx="9" cy="18" r="2.6" fill="#ffd166"/><circle cx="16" cy="18" r="2.6" fill="#ff006e"/><circle cx="23" cy="18" r="2.6" fill="#ff006e"/><circle cx="30" cy="18" r="2.6" fill="#ffd166"/><circle cx="9" cy="26" r="2.6" fill="#ff006e"/><circle cx="16" cy="26" r="2.6" fill="#ff006e"/><circle cx="23" cy="26" r="2.6" fill="#ffd166"/><circle cx="30" cy="26" r="2.6" fill="#ff006e"/></svg>,
    "bln-wall-organic":     <svg viewBox="0 0 40 40" width="26" height="26"><rect x="4" y="4" width="32" height="28" fill="none" stroke="#4a4e69" strokeWidth="1"/><circle cx="8" cy="9" r="2.8" fill="#7209b7"/><circle cx="15" cy="11" r="2.2" fill="#f72585"/><circle cx="22" cy="8" r="3" fill="#7209b7"/><circle cx="30" cy="10" r="2.4" fill="#7209b7"/><circle cx="10" cy="18" r="2.4" fill="#7209b7"/><circle cx="18" cy="19" r="3" fill="#7209b7"/><circle cx="26" cy="17" r="2.2" fill="#f72585"/><circle cx="32" cy="20" r="2.6" fill="#7209b7"/><circle cx="8" cy="27" r="2.6" fill="#f72585"/><circle cx="16" cy="28" r="2.4" fill="#7209b7"/><circle cx="24" cy="26" r="2.8" fill="#7209b7"/><circle cx="31" cy="28" r="2.2" fill="#7209b7"/></svg>,
    "curtain-sheer-straight-double": <svg viewBox="0 0 40 40" width="26" height="26"><line x1="4" y1="6" x2="36" y2="6" stroke="#b8a888" strokeWidth="1.4"/><path d="M7 7 L15 7 L15 34 L7 34 Q10 20 7 7 Z" fill="#c97b84" opacity="0.85" stroke="#a15864" strokeWidth="1"/><path d="M25 7 L33 7 L33 34 L25 34 Q28 20 25 7 Z" fill="#c97b84" opacity="0.85" stroke="#a15864" strokeWidth="1"/></svg>,
    "curtain-tieback-classic": <svg viewBox="0 0 40 40" width="26" height="26"><line x1="4" y1="6" x2="36" y2="6" stroke="#b8a888" strokeWidth="1.4"/><path d="M7 7 L15 7 L14 20 Q10 20 9 21 Q13 26 15 34 L7 34 Q10 20 7 7 Z" fill="#8b2e3f" stroke="#6b212f" strokeWidth="1"/><path d="M25 7 L33 7 L33 34 L25 34 Q27 26 31 21 Q30 20 26 20 Z" fill="#8b2e3f" stroke="#6b212f" strokeWidth="1"/><circle cx="10" cy="21" r="1.4" fill="none" stroke="#b8a888" strokeWidth="1"/><circle cx="30" cy="21" r="1.4" fill="none" stroke="#b8a888" strokeWidth="1"/></svg>,
    "curtain-straight-heavy": <svg viewBox="0 0 40 40" width="26" height="26"><line x1="4" y1="6" x2="36" y2="6" stroke="#b8a888" strokeWidth="1.4"/><path d="M7 7 L16 7 L15 34 L7 34 Q9 24 6 15 Q10 12 7 7 Z" fill="#2f4858" stroke="#1c2c37" strokeWidth="1"/><path d="M24 7 L33 7 L34 15 Q31 12 35 15 Q32 24 33 34 L25 34 Z" fill="#2f4858" stroke="#1c2c37" strokeWidth="1"/></svg>,
    "curtain-tieback-elegant": <svg viewBox="0 0 40 40" width="26" height="26"><line x1="4" y1="6" x2="36" y2="6" stroke="#b8a888" strokeWidth="1.4"/><path d="M7 7 L15 7 L13 16 Q9 16 8 17 Q14 24 16 34 L7 34 Q10 20 7 7 Z" fill="#6b4e8c" stroke="#4d3868" strokeWidth="1"/><path d="M25 7 L33 7 L33 34 L24 34 Q26 24 32 17 Q31 16 27 16 Z" fill="#6b4e8c" stroke="#4d3868" strokeWidth="1"/><circle cx="9" cy="17" r="1.4" fill="none" stroke="#b8a888" strokeWidth="1"/><circle cx="31" cy="17" r="1.4" fill="none" stroke="#b8a888" strokeWidth="1"/></svg>,
    "curtain-swag-arch-full": <svg viewBox="0 0 40 40" width="26" height="26"><line x1="4" y1="6" x2="36" y2="6" stroke="#b8a888" strokeWidth="1.4"/><path d="M6 7 Q6 20 8 34 L14 34 Q10 20 12 8 Q9 6 6 7 Z" fill="#c9a44c" stroke="#9c7c33" strokeWidth="1"/><path d="M34 7 Q34 20 32 34 L26 34 Q30 20 28 8 Q31 6 34 7 Z" fill="#c9a44c" stroke="#9c7c33" strokeWidth="1"/><path d="M12 8 Q20 16 28 8" fill="none" stroke="#9c7c33" strokeWidth="1"/></svg>,
    "curtain-single-flat": <svg viewBox="0 0 40 40" width="26" height="26"><line x1="4" y1="6" x2="36" y2="6" stroke="#b8a888" strokeWidth="1.4"/><rect x="14" y="7" width="12" height="27" fill="#4a7c6f" stroke="#325650" strokeWidth="1"/></svg>,
    "curtain-center-swoop-valance": <svg viewBox="0 0 40 40" width="26" height="26"><line x1="4" y1="6" x2="36" y2="6" stroke="#b8a888" strokeWidth="1.4"/><path d="M6 7 Q10 7 12 8 Q16 20 20 22 Q24 20 28 8 Q30 7 34 7 Q32 7 30 8 Q26 22 20 26 Q14 22 10 8 Q8 7 6 7 Z" fill="#b5654f" stroke="#8a4a39" strokeWidth="1"/></svg>,
    "curtain-sheer-voile": <svg viewBox="0 0 40 40" width="26" height="26"><line x1="4" y1="6" x2="36" y2="6" stroke="#b8a888" strokeWidth="1.4"/><path d="M8 7 L16 7 L16 34 L8 34 Q10 20 8 7 Z" fill="#7a9cc6" opacity="0.55" stroke="#5678a0" strokeWidth="0.8"/><path d="M24 7 L32 7 L32 34 L24 34 Q26 20 24 7 Z" fill="#7a9cc6" opacity="0.55" stroke="#5678a0" strokeWidth="0.8"/></svg>,
    "curtain-wide-backdrop": <svg viewBox="0 0 40 40" width="26" height="26"><line x1="3" y1="6" x2="37" y2="6" stroke="#b8a888" strokeWidth="1.4"/><path d="M5 7 L35 7 L34 34 L6 34 Z" fill="#5c6e8a" stroke="#43506a" strokeWidth="1"/><line x1="12" y1="8" x2="11.5" y2="33" stroke="#43506a" strokeWidth="0.6"/><line x1="20" y1="7" x2="20" y2="34" stroke="#43506a" strokeWidth="0.6"/><line x1="28" y1="8" x2="28.5" y2="33" stroke="#43506a" strokeWidth="0.6"/></svg>,
    "curtain-center-gathered": <svg viewBox="0 0 40 40" width="26" height="26"><line x1="4" y1="6" x2="36" y2="6" stroke="#b8a888" strokeWidth="1.4"/><path d="M7 7 L15 7 L20 20 Q17 21 15 21 Q17 27 16 34 L7 34 Q10 20 7 7 Z" fill="#a13d5c" stroke="#7a2d44" strokeWidth="1"/><path d="M33 7 L25 7 L20 20 Q23 21 25 21 Q23 27 24 34 L33 34 Q30 20 33 7 Z" fill="#a13d5c" stroke="#7a2d44" strokeWidth="1"/><circle cx="20" cy="21" r="1.6" fill="none" stroke="#b8a888" strokeWidth="1"/></svg>,
    "curtain-tieback-simple": <svg viewBox="0 0 40 40" width="26" height="26"><line x1="4" y1="6" x2="36" y2="6" stroke="#b8a888" strokeWidth="1.4"/><path d="M7 7 L15 7 L14 27 Q10 27 9 28 Q12 30 14 34 L7 34 Q10 20 7 7 Z" fill="#6b8f71" stroke="#4a6b50" strokeWidth="1"/><path d="M25 7 L33 7 L33 34 L26 34 Q28 30 31 28 Q30 27 26 27 Z" fill="#6b8f71" stroke="#4a6b50" strokeWidth="1"/><circle cx="10" cy="28" r="1.2" fill="none" stroke="#b8a888" strokeWidth="1"/><circle cx="30" cy="28" r="1.2" fill="none" stroke="#b8a888" strokeWidth="1"/></svg>,
    "curtain-eyelet-plain": <svg viewBox="0 0 40 40" width="26" height="26"><line x1="4" y1="6" x2="36" y2="6" stroke="#b8a888" strokeWidth="1.4"/><path d="M8 7 Q9 10 11 7 Q12 10 14 7 Q15 10 17 7 L17 34 L8 34 Z" fill="#8a5a44" stroke="#684230" strokeWidth="1"/><path d="M23 7 Q24 10 26 7 Q27 10 29 7 Q30 10 32 7 L32 34 L23 34 Z" fill="#8a5a44" stroke="#684230" strokeWidth="1"/><circle cx="9" cy="7" r="1.3" fill="none" stroke="#b8a888" strokeWidth="1"/><circle cx="14" cy="7" r="1.3" fill="none" stroke="#b8a888" strokeWidth="1"/><circle cx="26" cy="7" r="1.3" fill="none" stroke="#b8a888" strokeWidth="1"/><circle cx="31" cy="7" r="1.3" fill="none" stroke="#b8a888" strokeWidth="1"/></svg>,
    "curtain-twin-tieback-arch": <svg viewBox="0 0 40 40" width="26" height="26"><line x1="4" y1="6" x2="36" y2="6" stroke="#b8a888" strokeWidth="1.4"/><path d="M7 7 L15 7 L12 28 Q8 29 6 32 Q12 32 16 34 L14 20 Z" fill="#4f6b4f" stroke="#374a37" strokeWidth="1"/><path d="M33 7 L25 7 L28 20 L26 34 Q30 32 34 32 Q32 29 28 28 Z" fill="#4f6b4f" stroke="#374a37" strokeWidth="1"/><circle cx="8" cy="29" r="1.3" fill="none" stroke="#b8a888" strokeWidth="1"/><circle cx="32" cy="29" r="1.3" fill="none" stroke="#b8a888" strokeWidth="1"/></svg>,
    "curtain-straight-simple": <svg viewBox="0 0 40 40" width="26" height="26"><line x1="4" y1="6" x2="36" y2="6" stroke="#b8a888" strokeWidth="1.4"/><path d="M8 7 L15 7 L15 34 L8 34 Q10 20 8 7 Z" fill="#9c6b3f" opacity="0.8" stroke="#78522f" strokeWidth="1"/><path d="M25 7 L32 7 L32 34 L25 34 Q27 20 25 7 Z" fill="#9c6b3f" opacity="0.8" stroke="#78522f" strokeWidth="1"/></svg>,
    "curtain-swag-with-tails": <svg viewBox="0 0 40 40" width="26" height="26"><line x1="4" y1="6" x2="36" y2="6" stroke="#b8a888" strokeWidth="1.4"/><path d="M6 7 Q6 20 8 34 L13 34 Q11 22 12 9 Q14 18 20 20 Q26 18 28 9 Q29 22 27 34 L32 34 Q34 20 34 7 Q31 6 28 8 Q24 18 20 18 Q16 18 12 8 Q9 6 6 7 Z" fill="#7c4a6b" stroke="#5c364e" strokeWidth="1"/></svg>,
    "curtain-eyelet-tieback": <svg viewBox="0 0 40 40" width="26" height="26"><line x1="4" y1="6" x2="36" y2="6" stroke="#b8a888" strokeWidth="1.4"/><path d="M8 7 Q9 10 11 7 Q12 10 14 7 L13 20 Q10 20 9 21 Q11 26 13 34 L8 34 Z" fill="#3f6b6f" stroke="#294a4d" strokeWidth="1"/><path d="M23 7 Q24 10 26 7 Q27 10 29 7 L29 34 L24 34 Q26 26 28 21 Q27 20 25 20 Z" fill="#3f6b6f" stroke="#294a4d" strokeWidth="1"/><circle cx="9" cy="7" r="1.2" fill="none" stroke="#b8a888" strokeWidth="1"/><circle cx="26" cy="7" r="1.2" fill="none" stroke="#b8a888" strokeWidth="1"/><circle cx="10" cy="21" r="1.2" fill="none" stroke="#c9a54a" strokeWidth="1"/></svg>,
    "curtain-tieback-rope": <svg viewBox="0 0 40 40" width="26" height="26"><line x1="4" y1="6" x2="36" y2="6" stroke="#b8a888" strokeWidth="1.4"/><path d="M7 7 L15 7 L14 21 Q10 21 9 22 Q13 27 15 34 L7 34 Q10 20 7 7 Z" fill="#a3773f" stroke="#785a2e" strokeWidth="1"/><path d="M25 7 L33 7 L33 34 L25 34 Q27 27 31 22 Q30 21 26 21 Z" fill="#a3773f" stroke="#785a2e" strokeWidth="1"/><circle cx="10" cy="22" r="1.6" fill="none" stroke="#c9a54a" strokeWidth="1.4"/><circle cx="30" cy="22" r="1.6" fill="none" stroke="#c9a54a" strokeWidth="1.4"/><path d="M8 24 L7 28 M12 24 L13 28" stroke="#c9a54a" strokeWidth="1"/><path d="M32 24 L33 28 M28 24 L27 28" stroke="#c9a54a" strokeWidth="1"/></svg>,
    "curtain-wide-flat-pooled": <svg viewBox="0 0 40 40" width="26" height="26"><line x1="3" y1="6" x2="37" y2="6" stroke="#b8a888" strokeWidth="1.4"/><path d="M5 7 L35 7 L34 32 Q30 34 26 32 Q20 34 14 32 Q10 34 6 32 Z" fill="#5c4a7c" stroke="#43365c" strokeWidth="1"/><line x1="14" y1="8" x2="13.5" y2="31" stroke="#43365c" strokeWidth="0.6"/><line x1="26" y1="8" x2="26.5" y2="31" stroke="#43365c" strokeWidth="0.6"/></svg>,
    "curtain-tieback-bow": <svg viewBox="0 0 40 40" width="26" height="26"><line x1="4" y1="6" x2="36" y2="6" stroke="#b8a888" strokeWidth="1.4"/><path d="M7 7 L15 7 L14 19 Q10 19 9 20 Q13 26 15 34 L7 34 Q10 20 7 7 Z" fill="#c2703f" stroke="#93532f" strokeWidth="1"/><path d="M25 7 L33 7 L33 34 L25 34 Q27 26 31 20 Q30 19 26 19 Z" fill="#c2703f" stroke="#93532f" strokeWidth="1"/><circle cx="10" cy="20" r="1" fill="#c2703f" stroke="#93532f" strokeWidth="0.8"/><path d="M7 18 Q10 16 10 20 Q10 24 7 22" fill="none" stroke="#93532f" strokeWidth="1"/><path d="M13 18 Q10 16 10 20 Q10 24 13 22" fill="none" stroke="#93532f" strokeWidth="1"/><circle cx="30" cy="20" r="1" fill="#c2703f" stroke="#93532f" strokeWidth="0.8"/><path d="M27 18 Q30 16 30 20 Q30 24 27 22" fill="none" stroke="#93532f" strokeWidth="1"/><path d="M33 18 Q30 16 30 20 Q30 24 33 22" fill="none" stroke="#93532f" strokeWidth="1"/></svg>,
    "curtain-tieback-buckle": <svg viewBox="0 0 40 40" width="26" height="26"><line x1="4" y1="6" x2="36" y2="6" stroke="#b8a888" strokeWidth="1.4"/><path d="M7 7 L15 7 L14 20 Q10 20 9 21 Q13 26 15 34 L7 34 Q10 20 7 7 Z" fill="#4a5859" stroke="#333e3f" strokeWidth="1"/><path d="M25 7 L33 7 L33 34 L25 34 Q27 26 31 21 Q30 20 26 20 Z" fill="#4a5859" stroke="#333e3f" strokeWidth="1"/><rect x="9" y="19" width="4" height="4" fill="none" stroke="#b8a888" strokeWidth="1.2"/><rect x="29" y="19" width="4" height="4" fill="none" stroke="#b8a888" strokeWidth="1.2"/></svg>,
    "curtain-wide-no-rod": <svg viewBox="0 0 40 40" width="26" height="26"><path d="M5 8 L35 8 L34 34 L6 34 Z" fill="#8e7cc3" stroke="#64548f" strokeWidth="1"/><line x1="12" y1="9" x2="11.5" y2="33" stroke="#64548f" strokeWidth="0.6"/><line x1="20" y1="8" x2="20" y2="34" stroke="#64548f" strokeWidth="0.6"/><line x1="28" y1="9" x2="28.5" y2="33" stroke="#64548f" strokeWidth="0.6"/></svg>,
    "curtain-single-no-rod": <svg viewBox="0 0 40 40" width="26" height="26"><rect x="14" y="8" width="12" height="27" fill="#b56576" stroke="#874a56" strokeWidth="1"/></svg>,
    "curtain-rod-holder": <svg viewBox="0 0 40 40" width="26" height="26"><line x1="6" y1="20" x2="34" y2="20" stroke="#b8a888" strokeWidth="2"/><circle cx="5" cy="20" r="3" fill="#b8a888"/><circle cx="35" cy="20" r="3" fill="#b8a888"/></svg>,
    "curtain-tie-band": <svg viewBox="0 0 40 40" width="26" height="26"><circle cx="20" cy="20" r="8" fill="none" stroke="#b8a888" strokeWidth="4"/></svg>,
    "curtain-tie-rope": <svg viewBox="0 0 40 40" width="26" height="26"><circle cx="20" cy="17" r="7" fill="none" stroke="#c9a54a" strokeWidth="3.5"/><path d="M15 22 L13 30 M17 23 L16 31" stroke="#c9a54a" strokeWidth="2"/><path d="M25 22 L27 30 M23 23 L24 31" stroke="#c9a54a" strokeWidth="2"/></svg>,
    "curtain-tie-bow": <svg viewBox="0 0 40 40" width="26" height="26"><circle cx="20" cy="20" r="2.2" fill="#c2703f" stroke="#93532f" strokeWidth="1"/><path d="M14 14 Q20 12 20 20 Q20 28 14 26" fill="none" stroke="#c2703f" strokeWidth="2"/><path d="M26 14 Q20 12 20 20 Q20 28 26 26" fill="none" stroke="#c2703f" strokeWidth="2"/><path d="M13 26 L11 33 M15 27 L14 33" stroke="#c2703f" strokeWidth="1.4"/><path d="M27 26 L29 33 M25 27 L26 33" stroke="#c2703f" strokeWidth="1.4"/></svg>,
    "curtain-tie-buckle": <svg viewBox="0 0 40 40" width="26" height="26"><circle cx="20" cy="20" r="8" fill="none" stroke="#b8a888" strokeWidth="4"/><rect x="16" y="16" width="8" height="8" fill="none" stroke="#8a7a5a" strokeWidth="2"/></svg>,

    // Chairs & Sofas — icons deliberately reuse a small set of family
    // silhouette templates (varying only color per item), same approach
    // as the vase/rug icon sets above.
    "chair-chiavari-rose": <svg viewBox="0 0 40 40" width="26" height="26"><ellipse cx="20" cy="24" rx="9" ry="4" fill="#c1666b" stroke="#8f4a52" strokeWidth="1"/><line x1="13" y1="10" x2="13" y2="24" stroke="#c7c7c7" strokeWidth="2"/><line x1="27" y1="10" x2="27" y2="24" stroke="#c7c7c7" strokeWidth="2"/><line x1="13" y1="10" x2="27" y2="10" stroke="#c7c7c7" strokeWidth="2"/><circle cx="20" cy="16" r="4" fill="none" stroke="#c7c7c7" strokeWidth="1.5"/><line x1="14" y1="28" x2="12" y2="34" stroke="#c7c7c7" strokeWidth="1.5"/><line x1="26" y1="28" x2="28" y2="34" stroke="#c7c7c7" strokeWidth="1.5"/></svg>,
    "chair-chiavari-navy-gold": <svg viewBox="0 0 40 40" width="26" height="26"><ellipse cx="20" cy="24" rx="9" ry="4" fill="#3d5a80" stroke="#2a3f5c" strokeWidth="1"/><line x1="13" y1="10" x2="13" y2="24" stroke="#C9A44C" strokeWidth="2"/><line x1="27" y1="10" x2="27" y2="24" stroke="#C9A44C" strokeWidth="2"/><line x1="13" y1="10" x2="27" y2="10" stroke="#C9A44C" strokeWidth="2"/><circle cx="20" cy="16" r="4" fill="none" stroke="#C9A44C" strokeWidth="1.5"/><line x1="14" y1="28" x2="12" y2="34" stroke="#C9A44C" strokeWidth="1.5"/><line x1="26" y1="28" x2="28" y2="34" stroke="#C9A44C" strokeWidth="1.5"/></svg>,
    "chair-crossback-rustic": <svg viewBox="0 0 40 40" width="26" height="26"><rect x="12" y="22" width="16" height="4" fill="#b98a6f" stroke="#8f6650" strokeWidth="1"/><line x1="13" y1="8" x2="13" y2="22" stroke="#3d2817" strokeWidth="2"/><line x1="27" y1="8" x2="27" y2="22" stroke="#3d2817" strokeWidth="2"/><line x1="13" y1="8" x2="27" y2="8" stroke="#3d2817" strokeWidth="2"/><line x1="13" y1="9" x2="27" y2="21" stroke="#3d2817" strokeWidth="1.6"/><line x1="27" y1="9" x2="13" y2="21" stroke="#3d2817" strokeWidth="1.6"/><line x1="14" y1="26" x2="13" y2="34" stroke="#3d2817" strokeWidth="1.5"/><line x1="26" y1="26" x2="27" y2="34" stroke="#3d2817" strokeWidth="1.5"/></svg>,
    "chair-crossback-charcoal": <svg viewBox="0 0 40 40" width="26" height="26"><rect x="12" y="22" width="16" height="4" fill="#2f4858" stroke="#1c2c37" strokeWidth="1"/><line x1="13" y1="8" x2="13" y2="22" stroke="#1a1a1a" strokeWidth="2"/><line x1="27" y1="8" x2="27" y2="22" stroke="#1a1a1a" strokeWidth="2"/><line x1="13" y1="8" x2="27" y2="8" stroke="#1a1a1a" strokeWidth="2"/><line x1="13" y1="9" x2="27" y2="21" stroke="#1a1a1a" strokeWidth="1.6"/><line x1="27" y1="9" x2="13" y2="21" stroke="#1a1a1a" strokeWidth="1.6"/><line x1="14" y1="26" x2="13" y2="34" stroke="#1a1a1a" strokeWidth="1.5"/><line x1="26" y1="26" x2="27" y2="34" stroke="#1a1a1a" strokeWidth="1.5"/></svg>,
    "chair-bentwood-tan": <svg viewBox="0 0 40 40" width="26" height="26"><ellipse cx="20" cy="24" rx="9" ry="4" fill="#d4a373" stroke="#a67a4f" strokeWidth="1"/><path d="M13 22 Q13 8 20 8 Q27 8 27 22" fill="none" stroke="#8a5a44" strokeWidth="2"/><line x1="14" y1="28" x2="12" y2="34" stroke="#8a5a44" strokeWidth="1.5"/><line x1="26" y1="28" x2="28" y2="34" stroke="#8a5a44" strokeWidth="1.5"/></svg>,
    "chair-bentwood-slate": <svg viewBox="0 0 40 40" width="26" height="26"><ellipse cx="20" cy="24" rx="9" ry="4" fill="#5c6e8a" stroke="#405068" strokeWidth="1"/><path d="M13 22 Q13 8 20 8 Q27 8 27 22" fill="none" stroke="#1a1a1a" strokeWidth="2"/><line x1="14" y1="28" x2="12" y2="34" stroke="#1a1a1a" strokeWidth="1.5"/><line x1="26" y1="28" x2="28" y2="34" stroke="#1a1a1a" strokeWidth="1.5"/></svg>,
    "chair-cane-oval-natural": <svg viewBox="0 0 40 40" width="26" height="26"><ellipse cx="20" cy="24" rx="9" ry="4" fill="#c9a44c" stroke="#9c7c33" strokeWidth="1"/><ellipse cx="20" cy="14" rx="8" ry="10" fill="#d4a373" fillOpacity="0.55" stroke="#8a6a4a" strokeWidth="2"/><line x1="14" y1="28" x2="12" y2="34" stroke="#8a6a4a" strokeWidth="1.5"/><line x1="26" y1="28" x2="28" y2="34" stroke="#8a6a4a" strokeWidth="1.5"/></svg>,
    "chair-cane-oval-blue": <svg viewBox="0 0 40 40" width="26" height="26"><ellipse cx="20" cy="24" rx="9" ry="4" fill="#457b9d" stroke="#305773" strokeWidth="1"/><ellipse cx="20" cy="14" rx="8" ry="10" fill="#9c7c33" fillOpacity="0.55" stroke="#3d2817" strokeWidth="2"/><line x1="14" y1="28" x2="12" y2="34" stroke="#3d2817" strokeWidth="1.5"/><line x1="26" y1="28" x2="28" y2="34" stroke="#3d2817" strokeWidth="1.5"/></svg>,
    "chair-cane-oval-green": <svg viewBox="0 0 40 40" width="26" height="26"><ellipse cx="20" cy="24" rx="9" ry="4" fill="#588157" stroke="#3f5c3f" strokeWidth="1"/><ellipse cx="20" cy="14" rx="8" ry="10" fill="#386641" fillOpacity="0.55" stroke="#4a3728" strokeWidth="2"/><line x1="14" y1="28" x2="12" y2="34" stroke="#4a3728" strokeWidth="1.5"/><line x1="26" y1="28" x2="28" y2="34" stroke="#4a3728" strokeWidth="1.5"/></svg>,
    "chair-shell-channel-purple": <svg viewBox="0 0 40 40" width="26" height="26"><ellipse cx="20" cy="26" rx="9" ry="4" fill="#6a4c93" stroke="#4a3568" strokeWidth="1"/><path d="M11 22 Q11 8 20 6 Q29 8 29 22" fill="#6a4c93" stroke="#4a3568" strokeWidth="1"/><line x1="15" y1="9" x2="15" y2="21" stroke="#C9A44C" strokeWidth="1"/><line x1="20" y1="7" x2="20" y2="22" stroke="#C9A44C" strokeWidth="1"/><line x1="25" y1="9" x2="25" y2="21" stroke="#C9A44C" strokeWidth="1"/><line x1="14" y1="28" x2="12" y2="34" stroke="#C9A44C" strokeWidth="1.5"/><line x1="26" y1="28" x2="28" y2="34" stroke="#C9A44C" strokeWidth="1.5"/></svg>,
    "chair-shell-channel-teal": <svg viewBox="0 0 40 40" width="26" height="26"><ellipse cx="20" cy="26" rx="9" ry="4" fill="#2f6f6a" stroke="#1e4a46" strokeWidth="1"/><path d="M11 22 Q11 8 20 6 Q29 8 29 22" fill="#2f6f6a" stroke="#1e4a46" strokeWidth="1"/><line x1="15" y1="9" x2="15" y2="21" stroke="#2c2c2c" strokeWidth="1"/><line x1="20" y1="7" x2="20" y2="22" stroke="#2c2c2c" strokeWidth="1"/><line x1="25" y1="9" x2="25" y2="21" stroke="#2c2c2c" strokeWidth="1"/><line x1="14" y1="28" x2="12" y2="34" stroke="#2c2c2c" strokeWidth="1.5"/><line x1="26" y1="28" x2="28" y2="34" stroke="#2c2c2c" strokeWidth="1.5"/></svg>,
    "chair-shell-channel-mustard": <svg viewBox="0 0 40 40" width="26" height="26"><ellipse cx="20" cy="26" rx="9" ry="4" fill="#bc6c25" stroke="#8f501a" strokeWidth="1"/><path d="M11 22 Q11 8 20 6 Q29 8 29 22" fill="#bc6c25" stroke="#8f501a" strokeWidth="1"/><line x1="15" y1="9" x2="15" y2="21" stroke="#C9A44C" strokeWidth="1"/><line x1="20" y1="7" x2="20" y2="22" stroke="#C9A44C" strokeWidth="1"/><line x1="25" y1="9" x2="25" y2="21" stroke="#C9A44C" strokeWidth="1"/><line x1="14" y1="28" x2="12" y2="34" stroke="#C9A44C" strokeWidth="1.5"/><line x1="26" y1="28" x2="28" y2="34" stroke="#C9A44C" strokeWidth="1.5"/></svg>,
    "chair-tub-barrel-tan": <svg viewBox="0 0 40 40" width="26" height="26"><ellipse cx="20" cy="26" rx="9" ry="4" fill="#c9a98a" stroke="#a6825f" strokeWidth="1"/><path d="M10 24 Q8 8 20 6 Q32 8 30 24" fill="#c9a98a" stroke="#a6825f" strokeWidth="1.4"/><line x1="14" y1="29" x2="13" y2="34" stroke="#8a6a4a" strokeWidth="1.5"/><line x1="26" y1="29" x2="27" y2="34" stroke="#8a6a4a" strokeWidth="1.5"/></svg>,
    "chair-tub-barrel-rose": <svg viewBox="0 0 40 40" width="26" height="26"><ellipse cx="20" cy="26" rx="9" ry="4" fill="#b56576" stroke="#8a4a58" strokeWidth="1"/><path d="M10 24 Q8 8 20 6 Q32 8 30 24" fill="#b56576" stroke="#8a4a58" strokeWidth="1.4"/><line x1="14" y1="29" x2="13" y2="34" stroke="#3d2817" strokeWidth="1.5"/><line x1="26" y1="29" x2="27" y2="34" stroke="#3d2817" strokeWidth="1.5"/></svg>,
    "chair-tub-barrel-navy": <svg viewBox="0 0 40 40" width="26" height="26"><ellipse cx="20" cy="26" rx="9" ry="4" fill="#3d5a80" stroke="#2a3f5c" strokeWidth="1"/><path d="M10 24 Q8 8 20 6 Q32 8 30 24" fill="#3d5a80" stroke="#2a3f5c" strokeWidth="1.4"/><line x1="14" y1="29" x2="13" y2="34" stroke="#2c2c2c" strokeWidth="1.5"/><line x1="26" y1="29" x2="27" y2="34" stroke="#2c2c2c" strokeWidth="1.5"/></svg>,
    "chair-wire-frame-black": <svg viewBox="0 0 40 40" width="26" height="26"><path d="M11 26 Q9 8 20 7 Q31 8 29 26" fill="none" stroke="#2c2c2c" strokeWidth="2.2"/><path d="M9 34 L18 20 M31 34 L22 20 M9 20 L18 34 M31 20 L22 34" stroke="#2c2c2c" strokeWidth="1.4"/></svg>,
    "chair-wire-frame-copper": <svg viewBox="0 0 40 40" width="26" height="26"><path d="M11 26 Q9 8 20 7 Q31 8 29 26" fill="none" stroke="#b5651d" strokeWidth="2.2"/><path d="M9 34 L18 20 M31 34 L22 20 M9 20 L18 34 M31 20 L22 34" stroke="#8a4a2a" strokeWidth="1.4"/></svg>,
    "chair-molded-shell-mustard": <svg viewBox="0 0 40 40" width="26" height="26"><path d="M11 24 Q9 8 20 7 Q31 8 29 24 Q20 27 11 24 Z" fill="#bc6c25" stroke="#8f501a" strokeWidth="1.2"/><line x1="14" y1="25" x2="10" y2="34" stroke="#8a6a4a" strokeWidth="1.5"/><line x1="26" y1="25" x2="30" y2="34" stroke="#8a6a4a" strokeWidth="1.5"/><line x1="17" y1="26" x2="15" y2="34" stroke="#8a6a4a" strokeWidth="1.5"/><line x1="23" y1="26" x2="25" y2="34" stroke="#8a6a4a" strokeWidth="1.5"/></svg>,
    "chair-molded-shell-teal": <svg viewBox="0 0 40 40" width="26" height="26"><path d="M11 24 Q9 8 20 7 Q31 8 29 24 Q20 27 11 24 Z" fill="#2f6f6a" stroke="#1e4a46" strokeWidth="1.2"/><line x1="14" y1="25" x2="10" y2="34" stroke="#3d2817" strokeWidth="1.5"/><line x1="26" y1="25" x2="30" y2="34" stroke="#3d2817" strokeWidth="1.5"/><line x1="17" y1="26" x2="15" y2="34" stroke="#3d2817" strokeWidth="1.5"/><line x1="23" y1="26" x2="25" y2="34" stroke="#3d2817" strokeWidth="1.5"/></svg>,
    "chair-open-arm-rose-gold": <svg viewBox="0 0 40 40" width="26" height="26"><rect x="12" y="22" width="16" height="4" fill="#c1666b" stroke="#8f4a52" strokeWidth="1"/><rect x="12" y="8" width="16" height="14" fill="#c1666b" stroke="#8f4a52" strokeWidth="1"/><path d="M9 26 Q6 20 9 12" fill="none" stroke="#C9A44C" strokeWidth="2.4"/><path d="M31 26 Q34 20 31 12" fill="none" stroke="#C9A44C" strokeWidth="2.4"/><line x1="14" y1="26" x2="13" y2="34" stroke="#C9A44C" strokeWidth="1.5"/><line x1="26" y1="26" x2="27" y2="34" stroke="#C9A44C" strokeWidth="1.5"/></svg>,
    "chair-open-arm-forest-black": <svg viewBox="0 0 40 40" width="26" height="26"><rect x="12" y="22" width="16" height="4" fill="#386641" stroke="#253f27" strokeWidth="1"/><rect x="12" y="8" width="16" height="14" fill="#386641" stroke="#253f27" strokeWidth="1"/><path d="M9 26 Q6 20 9 12" fill="none" stroke="#2c2c2c" strokeWidth="2.4"/><path d="M31 26 Q34 20 31 12" fill="none" stroke="#2c2c2c" strokeWidth="2.4"/><line x1="14" y1="26" x2="13" y2="34" stroke="#2c2c2c" strokeWidth="1.5"/><line x1="26" y1="26" x2="27" y2="34" stroke="#2c2c2c" strokeWidth="1.5"/></svg>,
    "chair-open-arm-terracotta-gold": <svg viewBox="0 0 40 40" width="26" height="26"><rect x="12" y="22" width="16" height="4" fill="#b98a6f" stroke="#8f6650" strokeWidth="1"/><rect x="12" y="8" width="16" height="14" fill="#b98a6f" stroke="#8f6650" strokeWidth="1"/><path d="M9 26 Q6 20 9 12" fill="none" stroke="#C9A44C" strokeWidth="2.4"/><path d="M31 26 Q34 20 31 12" fill="none" stroke="#C9A44C" strokeWidth="2.4"/><line x1="14" y1="26" x2="13" y2="34" stroke="#C9A44C" strokeWidth="1.5"/><line x1="26" y1="26" x2="27" y2="34" stroke="#C9A44C" strokeWidth="1.5"/></svg>,
    "chair-diamond-tufted-burgundy": <svg viewBox="0 0 40 40" width="26" height="26"><rect x="11" y="22" width="18" height="5" fill="#8b2635" stroke="#641c26" strokeWidth="1"/><rect x="11" y="6" width="18" height="16" fill="#8b2635" stroke="#641c26" strokeWidth="1"/><circle cx="16" cy="11" r="1" fill="#C9A44C"/><circle cx="20" cy="11" r="1" fill="#C9A44C"/><circle cx="24" cy="11" r="1" fill="#C9A44C"/><circle cx="16" cy="16" r="1" fill="#C9A44C"/><circle cx="20" cy="16" r="1" fill="#C9A44C"/><circle cx="24" cy="16" r="1" fill="#C9A44C"/><line x1="13" y1="27" x2="12" y2="34" stroke="#1a1a1a" strokeWidth="1.5"/><line x1="27" y1="27" x2="28" y2="34" stroke="#1a1a1a" strokeWidth="1.5"/></svg>,
    "chair-diamond-tufted-navy": <svg viewBox="0 0 40 40" width="26" height="26"><rect x="11" y="22" width="18" height="5" fill="#3d5a80" stroke="#2a3f5c" strokeWidth="1"/><rect x="11" y="6" width="18" height="16" fill="#3d5a80" stroke="#2a3f5c" strokeWidth="1"/><circle cx="16" cy="11" r="1" fill="#c7c7c7"/><circle cx="20" cy="11" r="1" fill="#c7c7c7"/><circle cx="24" cy="11" r="1" fill="#c7c7c7"/><circle cx="16" cy="16" r="1" fill="#c7c7c7"/><circle cx="20" cy="16" r="1" fill="#c7c7c7"/><circle cx="24" cy="16" r="1" fill="#c7c7c7"/><line x1="13" y1="27" x2="12" y2="34" stroke="#2c2c2c" strokeWidth="1.5"/><line x1="27" y1="27" x2="28" y2="34" stroke="#2c2c2c" strokeWidth="1.5"/></svg>,
    "chair-channel-back-sage": <svg viewBox="0 0 40 40" width="26" height="26"><rect x="11" y="22" width="18" height="5" fill="#6f9b7a" stroke="#4c7156" strokeWidth="1"/><rect x="11" y="6" width="18" height="16" fill="#6f9b7a" stroke="#4c7156" strokeWidth="1"/><line x1="15" y1="7" x2="15" y2="21" stroke="#4c7156" strokeWidth="1"/><line x1="20" y1="7" x2="20" y2="21" stroke="#4c7156" strokeWidth="1"/><line x1="25" y1="7" x2="25" y2="21" stroke="#4c7156" strokeWidth="1"/><line x1="13" y1="27" x2="12" y2="34" stroke="#8a6a4a" strokeWidth="1.5"/><line x1="27" y1="27" x2="28" y2="34" stroke="#8a6a4a" strokeWidth="1.5"/></svg>,
    "chair-channel-back-plum": <svg viewBox="0 0 40 40" width="26" height="26"><rect x="11" y="22" width="18" height="5" fill="#7c4a6b" stroke="#5a3550" strokeWidth="1"/><rect x="11" y="6" width="18" height="16" fill="#7c4a6b" stroke="#5a3550" strokeWidth="1"/><line x1="15" y1="7" x2="15" y2="21" stroke="#5a3550" strokeWidth="1"/><line x1="20" y1="7" x2="20" y2="21" stroke="#5a3550" strokeWidth="1"/><line x1="25" y1="7" x2="25" y2="21" stroke="#5a3550" strokeWidth="1"/><line x1="13" y1="27" x2="12" y2="34" stroke="#3d2817" strokeWidth="1.5"/><line x1="27" y1="27" x2="28" y2="34" stroke="#3d2817" strokeWidth="1.5"/></svg>,
    "chair-sled-base-charcoal": <svg viewBox="0 0 40 40" width="26" height="26"><rect x="11" y="22" width="18" height="5" fill="#2f4858" stroke="#1c2c37" strokeWidth="1"/><rect x="11" y="6" width="18" height="16" fill="#2f4858" stroke="#1c2c37" strokeWidth="1"/><path d="M9 34 Q9 12 16 8" fill="none" stroke="#2c2c2c" strokeWidth="2"/><path d="M31 34 Q31 12 24 8" fill="none" stroke="#2c2c2c" strokeWidth="2"/></svg>,
    "chair-sled-base-rust": <svg viewBox="0 0 40 40" width="26" height="26"><rect x="11" y="22" width="18" height="5" fill="#c97b5f" stroke="#9c5a42" strokeWidth="1"/><rect x="11" y="6" width="18" height="16" fill="#c97b5f" stroke="#9c5a42" strokeWidth="1"/><path d="M9 34 Q9 12 16 8" fill="none" stroke="#8a6a4a" strokeWidth="2"/><path d="M31 34 Q31 12 24 8" fill="none" stroke="#8a6a4a" strokeWidth="2"/></svg>,

    "sofa-track-arm-navy": <svg viewBox="0 0 40 40" width="26" height="26"><rect x="6" y="20" width="28" height="10" fill="#3d5a80" stroke="#2a3f5c" strokeWidth="1"/><rect x="6" y="10" width="28" height="10" fill="#3d5a80" stroke="#2a3f5c" strokeWidth="1"/><rect x="4" y="12" width="5" height="18" fill="#3d5a80" stroke="#2a3f5c" strokeWidth="1"/><rect x="31" y="12" width="5" height="18" fill="#3d5a80" stroke="#2a3f5c" strokeWidth="1"/><line x1="20" y1="20" x2="20" y2="30" stroke="#2a3f5c" strokeWidth="1"/></svg>,
    "sofa-track-arm-olive": <svg viewBox="0 0 40 40" width="26" height="26"><rect x="6" y="20" width="28" height="10" fill="#588157" stroke="#3f5c3f" strokeWidth="1"/><rect x="6" y="10" width="28" height="10" fill="#588157" stroke="#3f5c3f" strokeWidth="1"/><rect x="4" y="12" width="5" height="18" fill="#588157" stroke="#3f5c3f" strokeWidth="1"/><rect x="31" y="12" width="5" height="18" fill="#588157" stroke="#3f5c3f" strokeWidth="1"/><line x1="20" y1="20" x2="20" y2="30" stroke="#3f5c3f" strokeWidth="1"/></svg>,
    "sofa-track-arm-rust": <svg viewBox="0 0 40 40" width="26" height="26"><rect x="6" y="20" width="28" height="10" fill="#c97b5f" stroke="#9c5a42" strokeWidth="1"/><rect x="6" y="10" width="28" height="10" fill="#c97b5f" stroke="#9c5a42" strokeWidth="1"/><rect x="4" y="12" width="5" height="18" fill="#c97b5f" stroke="#9c5a42" strokeWidth="1"/><rect x="31" y="12" width="5" height="18" fill="#c97b5f" stroke="#9c5a42" strokeWidth="1"/><line x1="20" y1="20" x2="20" y2="30" stroke="#9c5a42" strokeWidth="1"/></svg>,
    "sofa-rolled-arm-burgundy": <svg viewBox="0 0 40 40" width="26" height="26"><rect x="8" y="20" width="24" height="10" fill="#8b2635" stroke="#641c26" strokeWidth="1"/><rect x="8" y="13" width="24" height="8" fill="#8b2635" stroke="#641c26" strokeWidth="1"/><circle cx="7" cy="22" r="6" fill="#8b2635" stroke="#641c26" strokeWidth="1"/><circle cx="33" cy="22" r="6" fill="#8b2635" stroke="#641c26" strokeWidth="1"/><circle cx="16" cy="17" r="1" fill="#C9A44C"/><circle cx="20" cy="17" r="1" fill="#C9A44C"/><circle cx="24" cy="17" r="1" fill="#C9A44C"/></svg>,
    "sofa-rolled-arm-teal": <svg viewBox="0 0 40 40" width="26" height="26"><rect x="8" y="20" width="24" height="10" fill="#2f6f6a" stroke="#1e4a46" strokeWidth="1"/><rect x="8" y="13" width="24" height="8" fill="#2f6f6a" stroke="#1e4a46" strokeWidth="1"/><circle cx="7" cy="22" r="6" fill="#2f6f6a" stroke="#1e4a46" strokeWidth="1"/><circle cx="33" cy="22" r="6" fill="#2f6f6a" stroke="#1e4a46" strokeWidth="1"/><circle cx="16" cy="17" r="1" fill="#C9A44C"/><circle cx="20" cy="17" r="1" fill="#C9A44C"/><circle cx="24" cy="17" r="1" fill="#C9A44C"/></svg>,
    "sofa-rolled-arm-mustard": <svg viewBox="0 0 40 40" width="26" height="26"><rect x="8" y="20" width="24" height="10" fill="#bc6c25" stroke="#8f501a" strokeWidth="1"/><rect x="8" y="13" width="24" height="8" fill="#bc6c25" stroke="#8f501a" strokeWidth="1"/><circle cx="7" cy="22" r="6" fill="#bc6c25" stroke="#8f501a" strokeWidth="1"/><circle cx="33" cy="22" r="6" fill="#bc6c25" stroke="#8f501a" strokeWidth="1"/><circle cx="16" cy="17" r="1" fill="#C9A44C"/><circle cx="20" cy="17" r="1" fill="#C9A44C"/><circle cx="24" cy="17" r="1" fill="#C9A44C"/></svg>,
    "sofa-channel-curved-terracotta": <svg viewBox="0 0 40 40" width="26" height="26"><path d="M4 30 Q4 10 20 10 Q36 10 36 30 Z" fill="#b98a6f" stroke="#8f6650" strokeWidth="1"/><line x1="12" y1="12" x2="12" y2="28" stroke="#8f6650" strokeWidth="1"/><line x1="20" y1="10" x2="20" y2="28" stroke="#8f6650" strokeWidth="1"/><line x1="28" y1="12" x2="28" y2="28" stroke="#8f6650" strokeWidth="1"/></svg>,
    "sofa-channel-curved-forest": <svg viewBox="0 0 40 40" width="26" height="26"><path d="M4 30 Q4 10 20 10 Q36 10 36 30 Z" fill="#386641" stroke="#253f27" strokeWidth="1"/><line x1="12" y1="12" x2="12" y2="28" stroke="#253f27" strokeWidth="1"/><line x1="20" y1="10" x2="20" y2="28" stroke="#253f27" strokeWidth="1"/><line x1="28" y1="12" x2="28" y2="28" stroke="#253f27" strokeWidth="1"/></svg>,
    "sofa-channel-curved-plum": <svg viewBox="0 0 40 40" width="26" height="26"><path d="M4 30 Q4 10 20 10 Q36 10 36 30 Z" fill="#7c4a6b" stroke="#5a3550" strokeWidth="1"/><line x1="12" y1="12" x2="12" y2="28" stroke="#5a3550" strokeWidth="1"/><line x1="20" y1="10" x2="20" y2="28" stroke="#5a3550" strokeWidth="1"/><line x1="28" y1="12" x2="28" y2="28" stroke="#5a3550" strokeWidth="1"/></svg>,
    "sofa-chesterfield-cognac": <svg viewBox="0 0 40 40" width="26" height="26"><rect x="8" y="20" width="24" height="10" fill="#9c6b3f" stroke="#74502e" strokeWidth="1"/><rect x="8" y="11" width="24" height="9" fill="#9c6b3f" stroke="#74502e" strokeWidth="1"/><rect x="5" y="14" width="5" height="16" fill="#9c6b3f" stroke="#74502e" strokeWidth="1"/><rect x="30" y="14" width="5" height="16" fill="#9c6b3f" stroke="#74502e" strokeWidth="1"/><circle cx="14" cy="15" r="1" fill="#C9A44C"/><circle cx="20" cy="15" r="1" fill="#C9A44C"/><circle cx="26" cy="15" r="1" fill="#C9A44C"/></svg>,
    "sofa-chesterfield-emerald": <svg viewBox="0 0 40 40" width="26" height="26"><rect x="8" y="20" width="24" height="10" fill="#2f6f4a" stroke="#1e4a30" strokeWidth="1"/><rect x="8" y="11" width="24" height="9" fill="#2f6f4a" stroke="#1e4a30" strokeWidth="1"/><rect x="5" y="14" width="5" height="16" fill="#2f6f4a" stroke="#1e4a30" strokeWidth="1"/><rect x="30" y="14" width="5" height="16" fill="#2f6f4a" stroke="#1e4a30" strokeWidth="1"/><circle cx="14" cy="15" r="1" fill="#C9A44C"/><circle cx="20" cy="15" r="1" fill="#C9A44C"/><circle cx="26" cy="15" r="1" fill="#C9A44C"/></svg>,
    "sofa-chesterfield-charcoal": <svg viewBox="0 0 40 40" width="26" height="26"><rect x="8" y="20" width="24" height="10" fill="#33383d" stroke="#202327" strokeWidth="1"/><rect x="8" y="11" width="24" height="9" fill="#33383d" stroke="#202327" strokeWidth="1"/><rect x="5" y="14" width="5" height="16" fill="#33383d" stroke="#202327" strokeWidth="1"/><rect x="30" y="14" width="5" height="16" fill="#33383d" stroke="#202327" strokeWidth="1"/><circle cx="14" cy="15" r="1" fill="#c7c7c7"/><circle cx="20" cy="15" r="1" fill="#c7c7c7"/><circle cx="26" cy="15" r="1" fill="#c7c7c7"/></svg>,
    "sofa-sectional-navy": <svg viewBox="0 0 40 40" width="26" height="26"><rect x="4" y="18" width="22" height="12" fill="#3d5a80" stroke="#2a3f5c" strokeWidth="1"/><rect x="4" y="9" width="22" height="9" fill="#3d5a80" stroke="#2a3f5c" strokeWidth="1"/><rect x="26" y="8" width="10" height="22" fill="#3d5a80" stroke="#2a3f5c" strokeWidth="1"/></svg>,
    "sofa-sectional-sage": <svg viewBox="0 0 40 40" width="26" height="26"><rect x="4" y="18" width="22" height="12" fill="#6f9b7a" stroke="#4c7156" strokeWidth="1"/><rect x="4" y="9" width="22" height="9" fill="#6f9b7a" stroke="#4c7156" strokeWidth="1"/><rect x="26" y="8" width="10" height="22" fill="#6f9b7a" stroke="#4c7156" strokeWidth="1"/></svg>,
    "sofa-sectional-charcoal": <svg viewBox="0 0 40 40" width="26" height="26"><rect x="4" y="18" width="22" height="12" fill="#2f4858" stroke="#1c2c37" strokeWidth="1"/><rect x="4" y="9" width="22" height="9" fill="#2f4858" stroke="#1c2c37" strokeWidth="1"/><rect x="26" y="8" width="10" height="22" fill="#2f4858" stroke="#1c2c37" strokeWidth="1"/></svg>,
    "sofa-scroll-arm-burgundy": <svg viewBox="0 0 40 40" width="26" height="26"><rect x="8" y="20" width="24" height="10" fill="#8b2635" stroke="#641c26" strokeWidth="1"/><path d="M8 20 Q8 8 16 8 L24 8 Q32 8 32 20 Z" fill="#8b2635" stroke="#641c26" strokeWidth="1"/><circle cx="8" cy="18" r="4" fill="none" stroke="#641c26" strokeWidth="1.4"/><circle cx="32" cy="18" r="4" fill="none" stroke="#641c26" strokeWidth="1.4"/></svg>,
    "sofa-scroll-arm-navy": <svg viewBox="0 0 40 40" width="26" height="26"><rect x="8" y="20" width="24" height="10" fill="#3d5a80" stroke="#2a3f5c" strokeWidth="1"/><path d="M8 20 Q8 8 16 8 L24 8 Q32 8 32 20 Z" fill="#3d5a80" stroke="#2a3f5c" strokeWidth="1"/><circle cx="8" cy="18" r="4" fill="none" stroke="#2a3f5c" strokeWidth="1.4"/><circle cx="32" cy="18" r="4" fill="none" stroke="#2a3f5c" strokeWidth="1.4"/></svg>,
    "sofa-scroll-arm-forest": <svg viewBox="0 0 40 40" width="26" height="26"><rect x="8" y="20" width="24" height="10" fill="#386641" stroke="#253f27" strokeWidth="1"/><path d="M8 20 Q8 8 16 8 L24 8 Q32 8 32 20 Z" fill="#386641" stroke="#253f27" strokeWidth="1"/><circle cx="8" cy="18" r="4" fill="none" stroke="#253f27" strokeWidth="1.4"/><circle cx="32" cy="18" r="4" fill="none" stroke="#253f27" strokeWidth="1.4"/></svg>,
    "sofa-pillow-back-rust": <svg viewBox="0 0 40 40" width="26" height="26"><rect x="8" y="20" width="24" height="10" fill="#c97b5f" stroke="#9c5a42" strokeWidth="1"/><rect x="5" y="13" width="5" height="17" fill="#c97b5f" stroke="#9c5a42" strokeWidth="1"/><rect x="30" y="13" width="5" height="17" fill="#c97b5f" stroke="#9c5a42" strokeWidth="1"/><rect x="11" y="10" width="8" height="10" rx="1" fill="#c97b5f" stroke="#9c5a42" strokeWidth="1"/><rect x="21" y="10" width="8" height="10" rx="1" fill="#c97b5f" stroke="#9c5a42" strokeWidth="1"/></svg>,
    "sofa-pillow-back-plum": <svg viewBox="0 0 40 40" width="26" height="26"><rect x="8" y="20" width="24" height="10" fill="#7c4a6b" stroke="#5a3550" strokeWidth="1"/><rect x="5" y="13" width="5" height="17" fill="#7c4a6b" stroke="#5a3550" strokeWidth="1"/><rect x="30" y="13" width="5" height="17" fill="#7c4a6b" stroke="#5a3550" strokeWidth="1"/><rect x="11" y="10" width="8" height="10" rx="1" fill="#7c4a6b" stroke="#5a3550" strokeWidth="1"/><rect x="21" y="10" width="8" height="10" rx="1" fill="#7c4a6b" stroke="#5a3550" strokeWidth="1"/></svg>,
    "sofa-pillow-back-teal": <svg viewBox="0 0 40 40" width="26" height="26"><rect x="8" y="20" width="24" height="10" fill="#2f6f6a" stroke="#1e4a46" strokeWidth="1"/><rect x="5" y="13" width="5" height="17" fill="#2f6f6a" stroke="#1e4a46" strokeWidth="1"/><rect x="30" y="13" width="5" height="17" fill="#2f6f6a" stroke="#1e4a46" strokeWidth="1"/><rect x="11" y="10" width="8" height="10" rx="1" fill="#2f6f6a" stroke="#1e4a46" strokeWidth="1"/><rect x="21" y="10" width="8" height="10" rx="1" fill="#2f6f6a" stroke="#1e4a46" strokeWidth="1"/></svg>,
    "sofa-cocoon-blush": <svg viewBox="0 0 40 40" width="26" height="26"><path d="M5 28 Q3 10 20 8 Q37 10 35 28 Q20 34 5 28 Z" fill="#b56576" stroke="#8a4a58" strokeWidth="1.2"/></svg>,
    "sofa-cocoon-mustard": <svg viewBox="0 0 40 40" width="26" height="26"><path d="M5 28 Q3 10 20 8 Q37 10 35 28 Q20 34 5 28 Z" fill="#bc6c25" stroke="#8f501a" strokeWidth="1.2"/></svg>,
    "sofa-cocoon-charcoal": <svg viewBox="0 0 40 40" width="26" height="26"><path d="M5 28 Q3 10 20 8 Q37 10 35 28 Q20 34 5 28 Z" fill="#2f4858" stroke="#1c2c37" strokeWidth="1.2"/></svg>,
    "sofa-tuxedo-navy": <svg viewBox="0 0 40 40" width="26" height="26"><rect x="6" y="19" width="28" height="11" fill="#3d5a80" stroke="#2a3f5c" strokeWidth="1"/><rect x="6" y="8" width="28" height="11" fill="#3d5a80" stroke="#2a3f5c" strokeWidth="1"/><line x1="6" y1="19" x2="34" y2="19" stroke="#C9A44C" strokeWidth="1.4"/></svg>,
    "sofa-tuxedo-olive": <svg viewBox="0 0 40 40" width="26" height="26"><rect x="6" y="19" width="28" height="11" fill="#588157" stroke="#3f5c3f" strokeWidth="1"/><rect x="6" y="8" width="28" height="11" fill="#588157" stroke="#3f5c3f" strokeWidth="1"/><line x1="6" y1="19" x2="34" y2="19" stroke="#C9A44C" strokeWidth="1.4"/></svg>,
    "sofa-shell-scallop-purple": <svg viewBox="0 0 40 40" width="26" height="26"><rect x="7" y="21" width="26" height="9" fill="#6a4c93" stroke="#4a3568" strokeWidth="1"/><path d="M6 21 Q6 7 20 6 Q34 7 34 21 Z" fill="#6a4c93" stroke="#4a3568" strokeWidth="1"/><line x1="12" y1="9" x2="12" y2="20" stroke="#4a3568" strokeWidth="1"/><line x1="20" y1="7" x2="20" y2="20" stroke="#4a3568" strokeWidth="1"/><line x1="28" y1="9" x2="28" y2="20" stroke="#4a3568" strokeWidth="1"/></svg>,
    "sofa-shell-scallop-teal": <svg viewBox="0 0 40 40" width="26" height="26"><rect x="7" y="21" width="26" height="9" fill="#2f6f6a" stroke="#1e4a46" strokeWidth="1"/><path d="M6 21 Q6 7 20 6 Q34 7 34 21 Z" fill="#2f6f6a" stroke="#1e4a46" strokeWidth="1"/><line x1="12" y1="9" x2="12" y2="20" stroke="#1e4a46" strokeWidth="1"/><line x1="20" y1="7" x2="20" y2="20" stroke="#1e4a46" strokeWidth="1"/><line x1="28" y1="9" x2="28" y2="20" stroke="#1e4a46" strokeWidth="1"/></svg>,
    "sofa-shell-scallop-rose": <svg viewBox="0 0 40 40" width="26" height="26"><rect x="7" y="21" width="26" height="9" fill="#c1666b" stroke="#8f4a52" strokeWidth="1"/><path d="M6 21 Q6 7 20 6 Q34 7 34 21 Z" fill="#c1666b" stroke="#8f4a52" strokeWidth="1"/><line x1="12" y1="9" x2="12" y2="20" stroke="#8f4a52" strokeWidth="1"/><line x1="20" y1="7" x2="20" y2="20" stroke="#8f4a52" strokeWidth="1"/><line x1="28" y1="9" x2="28" y2="20" stroke="#8f4a52" strokeWidth="1"/></svg>,
  };
  return icons[type] || <svg viewBox="0 0 40 40" width="26" height="26"><rect x="8" y="8" width="24" height="24" rx="4" fill="#ede9fe" stroke="#7c3aed" strokeWidth="2"/></svg>;
}

/* ══════════════════════════════════════════
   Main Component
══════════════════════════════════════════ */
export default function DesignWorkspace() {
  const navigate  = useNavigate();
  const location  = useLocation();

  /* ── Read setup from location.state or sessionStorage ── */
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

  /* ── State ── */
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
  /* `doors` used to be a plain {edgeKey: true} flag map — now each entry is
     a customizable instance {style, color, frameColor, handle, openDir,
     tall}. Old saved projects still have the boolean form, so migrate any
     `true` entry to a default-styled door object on load rather than
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

  /* ── Unified selection — one shape covers every selectable object,
     structural or not (see docs/customization-system-design.md §2):
       { kind: "furniture", id, screenX, screenY }
       { kind: "wall", segment, nearestEdgeKey, color, doorData, windowData, uiMode, screenX, screenY }
     A single popover reads this and renders the right controls. ── */
  const [selection, setSelection]             = useState(null);
  const [advancedMode, setAdvancedMode]       = useState(false);
  const [selectedPart, setSelectedPart]       = useState(null); // e.g. "canopy" — which tagged sub-mesh is active in Advanced Edit
  const advancedModeRef = useRef(advancedMode); advancedModeRef.current = advancedMode; // read inside the Three.js init effect's closures, which don't re-run on every state change
  const selectionRef = useRef(selection); selectionRef.current = selection; // same reason — Escape/click handling inside the init effect needs the current selection, not the one from mount time

  /* ── Event Editing Mode — "overview" (orbit camera, today's default) or
     "firstPerson" (walkthrough). A separate axis from advancedMode: you can
     enter Advanced Edit on an object from either view, see the bridging
     logic around handleEnterAdvancedMode/handleExitAdvancedMode below. */
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

  /* ── Refs ── */
  const mountRef     = useRef(null);
  const popoverRef   = useRef(null);
  /* Manual drag state for the settings popover — null means "no manual
     override yet, use the automatic beside-the-object placement";
     once the user drags the handle it holds a {x,y} pixel offset (from
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
  /* ── Advanced Edit Mode (camera zoom + per-component editing) ──
     cameraTweenRef drives a smooth interpolation of orbitRef from the render
     loop (see the animate() function below) rather than snapping the camera
     instantly — keeps theta/phi (the user's current viewing angle) fixed
     and only tweens px/pz/radius so it reads as "zooming into" the object
     rather than a disorienting cut. preAdvancedOrbitRef remembers where the
     camera was so "Done" can animate back to it. */
  const cameraTweenRef      = useRef(null);
  const preAdvancedOrbitRef = useRef(null);
  const advancedItemIdRef   = useRef(null);

  /* ── Event Editing Mode (first-person walkthrough) refs ──
     canvasRef: the renderer's DOM element, needed outside the init effect
       for requestPointerLock/exitPointerLock.
     fpStateRef: the authoritative eye position + look angles once settled
       (i.e. not mid-transition) — written by WASD/mouse-look each frame,
       read by the render loop to place the camera.
     poseTweenRef: a generic raw position+quaternion tween (see
       beginPoseTween below), used for every First Person transition —
       entering/exiting the mode, and the two bridges to/from Advanced Edit.
       Deliberately separate from cameraTweenRef (which only ever tweens
       orbitRef fields) rather than trying to force the two camera models
       through one interpolator.
     preFirstPersonOrbitRef: the orbit state to animate back to on Exit.
     preAdvancedViewModeRef / preAdvancedFpStateRef: which mode Advanced
       Edit was entered from, and — if it was First Person — the exact eye
       pose to hand back once Advanced Edit's own Done tween finishes.
     keysRef: currently-held WASD/Shift state, polled once per frame rather
       than acted on per keydown event, so diagonal movement etc. reads
       smoothly rather than as a burst per keystroke.
     pointerLockedRef: mirrors document.pointerLockElement — gates whether
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

  /* ── Live updates ── */
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

  /* ── Apply wall texture ── */
  useEffect(() => {
    if (!wallMatsRef.current || wallMatsRef.current.length === 0) return;
    if (wallTexture === 0) {
      // Plain — remove texture, restore color
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

  /* ── Apply floor texture (non-custom layouts — floorMatRef is a single,
       stable material reused across floorColor changes, same as walls) ── */
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

  /* ── Front wall toggle (enclosed room) ── */
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

  /* ── Camera ── */
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
     render loop below rather than jumped to instantly. `target` only needs
     to include the fields that should change — anything omitted holds at
     its current value (e.g. entering Advanced Edit only tweens
     px/pz/radius, leaving theta/phi — the user's viewing angle — alone). */
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

  /* ── Camera-pose tween (Event Editing Mode) ──
     A generic raw position+quaternion interpolation, unlike animateCameraTo
     above which only ever tweens orbitRef fields. Used for every First
     Person transition, since those need to move the camera continuously
     from wherever it visually is right now (which might be orbit-driven,
     first-person-driven, or mid-zoom into Advanced Edit) to an arbitrary
     target pose that isn't expressible as an orbit state (a free-look eye
     position isn't "a distance and two angles from a ground point"). The
     render loop (animate(), in the init effect below) consumes this the
     same way it already consumes cameraTweenRef: read it every frame,
     lerp/slerp toward the target, clear it at t>=1. `onComplete` hands off
     to whichever system should drive the camera next — writing into
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
  // the browser silently rejects it — every call site here is either a
  // direct click handler or a callback chained off one, but browsers are
  // still inconsistent enough about it (and about the ~1.25s cooldown after
  // an Escape-triggered unlock) that every call is wrapped defensively
  // rather than assumed to succeed.
  const requestPointerLockSafely = () => {
    try { canvasRef.current?.requestPointerLock?.()?.catch?.(() => {}); } catch (e) {}
  };
  const exitPointerLockSafely = () => {
    try { if (document.pointerLockElement) document.exitPointerLock?.(); } catch (e) {}
  };

  /* ── Event Editing Mode: entry/exit ──
     Mirrors the Advanced Edit entry/exit pattern (flip the mode state
     immediately, animate the camera after) rather than waiting for the
     tween to finish before updating viewMode — that way the top banner and
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
    // CFP.initialTiles, also centered on (0,0)) — so unlike the per-frame
    // walking clamp below, this one fixed starting point never needs
    // getRoomBounds(), which isn't reachable from here anyway (it's local
    // to the init effect's closure).
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
    // shared camera Overview uses — reset it here, or a scroll mid-walk
    // would silently carry over as a permanently wider/narrower Overview
    // view until the page reloads.
    if (cameraRef.current) { cameraRef.current.fov = FP_FOV_DEFAULT; cameraRef.current.updateProjectionMatrix(); }
    // Fallback shouldn't be reachable in practice (this ref is always set
    // by handleEnterFirstPerson before the Exit button can even render),
    // but viewPresets entries only carry theta/phi/radius — pair it with
    // px/pz explicitly so orbitPoseFor never divides into NaN territory.
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

  /* ── Init Three.js ── */
  useEffect(() => {
    const timer = setTimeout(() => {
      const mount = mountRef.current;
      if (!mount) return;

      const W = mount.clientWidth  || 900;
      const H = mount.clientHeight || 550;

      const scene = new THREE.Scene();
      /* ── Background ── */
      scene.background = new THREE.Color(isGarden ? "#d4edda" : "#f0eefa");
      sceneRef.current = scene;

      const camera = new THREE.PerspectiveCamera(55, W/H, 0.1, 200);
      cameraRef.current = camera;

      const renderer = new THREE.WebGLRenderer({ antialias: true });
      renderer.setSize(W, H);
      renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
      renderer.shadowMap.enabled = true;
      renderer.shadowMap.type = THREE.PCFSoftShadowMap;
      // Explicit color space + a filmic tone curve so brighter lighting
      // (below) renders true whites instead of blowing out to flat grey
      // or clipping highlights.
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

      /* ── Room — always use 3D geometry for full rotation support ── */
      wallMatsRef.current = [];
      buildRoom(layoutId, RW, RD, RH, wallColor, floorColor, wallMatsRef, floorMatRef, scene, isGarden);

      /* ── Custom layout: tile floor + auto walls, built directly in 3D ── */
      const customGroup = new THREE.Group();
      customGroup.name = "customGeometry";
      scene.add(customGroup);
      customGroupRef.current = customGroup;
      if (isCustom) {
        buildFloorPlanGeometry(customGroup, new Set(floorTilesRef.current), wallStylesRef.current, doorsRef.current, windowsRef.current, RH, floorColor, null, floorTexture);
      }

      /* ── Camera ── */
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
      let moveDrag = null; // { id, x, z } — active furniture drag-to-move
      let dragFollowTarget = null; // { x, z } — where the Advanced Edit camera is easing toward while dragging (see animate() below)
      // Advanced Edit zooms the camera in tight on the object, and at that
      // close framing the object's previous 1:1 ground-raycast tracking read
      // as way too fast/twitchy for precise placement — a small cursor
      // nudge covered a large chunk of the now-small visible area. Scaling
      // the per-move delta down (instead of snapping straight to the raw
      // raycast point) slows the object's own movement without touching
      // Standard Mode's drag, which isn't zoomed in and felt fine as-is.
      const ADVANCED_DRAG_SENSITIVITY = 0.4;
      const raycaster = new THREE.Raycaster();
      const groundPlane = new THREE.Plane(new THREE.Vector3(0, 1, 0), 0);
      const DRAG_WALL_MARGIN = 0.4; // keep a dragged item's center from clipping into a wall

      /* Where a drag is allowed to land — the room's actual floor extent,
         not an arbitrary generous number, so dragging (Standard Mode or
         Advanced Edit) can't push something outside the walls. Custom
         layouts are tile-built and not necessarily rectangular, so their
         bound comes from the placed tiles' own bounding box instead of
         RW/RD (which only describe the room's original footprint before
         any custom editing). */
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
         nearest ancestor mesh carrying a userData.part tag — that's the
         individually-selectable component. Objects with no tagged parts
         (a plain chair, a table — most of the catalog) still get Advanced
         Edit; any hit on them resolves to the WHOLE_PART sentinel, which
         the component panel treats as "edit the whole object" using the
         same fields the standard popover already uses. Only a total miss
         (the click didn't land on the object at all) returns null. Also
         returns the 3D intersection point so onDown can grab the object at
         that exact spot for drag-to-move, same as Standard Mode. */
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

      /* Where the ray from the pointer meets the floor (y=0) — used while
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
          // active component rather than exiting the mode — Done is the
          // only way out. (The hit-and-drag case is handled in onDown/onUp
          // instead — this only fires for a plain click-without-drag.)
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

        // Event Editing Mode: no orbit-drag/pan here at all — WASD+mouse-look
        // owns movement (see onMove/animate()), so a click is purely a
        // select action, resolved via performRaycastClick exactly like
        // every other mode (reusing its ghost/floor/wall/furniture
        // handling rather than re-implementing it). While pointer-locked
        // the cursor is hidden and reports no meaningful position, so the
        // click is resolved from screen center ("look at it and click")
        // instead of the (frozen) last cursor coordinates; once the lock
        // has been released — Esc, or a popover already open — there's a
        // real free cursor again and clicks behave exactly like Standard
        // Mode, including clicking empty space to re-engage the lock and
        // resume walking.
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
            // anywhere in the room without leaving Advanced Edit. A miss
            // (the click landed off the object entirely) still orbits the
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
        // pointer-locked (movementX/Y are the relevant fields then — the
        // absolute clientX/Y a locked pointer reports aren't a real cursor
        // position). Suspended during Advanced Edit too, same as the
        // per-frame walking in animate() below — that zoom uses its own
        // orbit-drag-style camera follow instead.
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
              // travel is applied, rather than snapping straight to the
              // raycast point — see ADVANCED_DRAG_SENSITIVITY above.
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
            // floor — re-snapped every move event, live, so the drag
            // preview already shows the correct flush position/rotation.
            if (moveDrag.type && WALL_MOUNT_TYPES.has(moveDrag.type)) {
              const snap = computeWallSnap(nx, nz, {
                isCustom, floorTiles: floorTilesRef.current, doors: doorsRef.current, windows: windowsRef.current, RW, RD,
              });
              if (snap) { nx = snap.x; nz = snap.z; moveDrag.rotation = snap.rotation; }
            }
            moveDrag.lastPoint = { x: g.x, z: g.z };
            const mesh = meshMapRef.current[moveDrag.id]; // looked up fresh — avoids a stale ref if the scene rebuilt mid-drag
            if (mesh) {
              mesh.position.x = nx; mesh.position.z = nz;
              if (moveDrag.rotation !== undefined) mesh.rotation.y = moveDrag.rotation;
            }
            moveDrag.x = nx; moveDrag.z = nz;
            // Advanced Edit keeps the camera tightly zoomed in on the
            // object — without some kind of follow it'd drag itself
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
            // accessory, say) travels with it by the same world-space delta.
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
          // No "distance from target" concept in a free-look camera, so the
          // wheel does the closest first-person equivalent of zoom: narrows
          // the field of view instead of dollying the camera through walls.
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
      // animate() rather than acted on per keydown — smoother diagonal
      // movement than reacting to individual key events. Escape closes
      // whatever's selected (if anything) rather than fully exiting the
      // mode — pressing Esc while nothing is selected is already handled
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
        // Advanced Edit's camera-follow-while-dragging, eased rather than
        // snapped 1:1 to the cursor — at this zoom level a direct 1:1
        // follow made the whole view whip around on every small mouse
        // movement. Converges within a handful of frames (~0.1s), not
        // noticeable as lag but no longer feels like it's racing to keep up.
        if (dragFollowTarget) {
          const o = orbitRef.current;
          o.px += (dragFollowTarget.x - o.px) * 0.15;
          o.pz += (dragFollowTarget.z - o.pz) * 0.15;
          updateCamera();
        }

        // ── Event Editing Mode ──
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
          // Movement only while actively locked with nothing selected
          // (paused otherwise, per the design brief) — but the camera is
          // still written from fpStateRef every single frame regardless,
          // so it holds perfectly still while paused instead of drifting
          // or snapping anywhere.
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

  /* ── Rebuild the tile floor plan whenever it changes ── */
  useEffect(() => {
    const group = customGroupRef.current;
    if (!group) return;
    clearGroup(group);
    const selectedSegmentId = selection?.kind === "wall" ? selection.segment.id : null;
    const selectedTileKey = selection?.kind === "floor" ? selection.key : null;
    if (isCustom) buildFloorPlanGeometry(group, new Set(floorTiles), wallStyles, doors, windows, RH, floorColor, selectedSegmentId, floorTexture, selectedTileKey);
  }, [floorTiles, wallStyles, doors, windows, floorColor, selection, floorTexture]);

  /* ── Keep the object popover fully on-screen ──
     It's normally anchored above the click point (translate(-50%,-110%)),
     but a tall popover (a booth with Package/Dimensions/Branding sections)
     or a click near the top of the viewport can push its top edge above
     y=0, clipping the upper controls entirely — exactly what was reported.
     Runs after every render: reset to the natural CSS position, measure
     it, then nudge it back within a margin if any edge is out of bounds.
     Imperative (not React state) so there's no measure->setState->
     re-measure feedback loop to worry about. */
  useLayoutEffect(() => {
    const el = popoverRef.current;
    if (!el || !selection) return;

    // A new object/wall was selected — drop any manual drag position from
    // whatever was previously selected and go back to auto-placement.
    const selId = selection.kind === "wall" ? selection.nearestEdgeKey
      : selection.kind === "floor" ? selection.key
      : selection.id;
    if (popoverSelIdRef.current !== selId) {
      popoverSelIdRef.current = selId;
      popoverDragOffsetRef.current = null;
    }

    // If the user has manually dragged this popover, respect that exact
    // position — no auto side-picking, no viewport clamping.
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

  /* ── Drag-to-reposition the settings popover — grab the handle and drop
     it anywhere on screen. Position is stored as a pixel offset from the
     selection's screen anchor (not raw page coords), so it survives
     re-renders without fighting the effect above. ── */
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

  /* ── Close the object popover on any click outside it, or on Escape ── */
  useEffect(() => {
    if (!selection) return;
    const onDocClick = (e) => {
      if (e.target.closest?.(".dw-object-popover, .dw-advanced-banner, .dw-part-panel")) return;
      // Clicks inside the 3D viewport are already handled by the canvas's
      // own mousedown/mouseup logic (select-on-down, deselect-on-empty-click
      // in performRaycastClick). Without this guard, this document-level
      // listener fires *after* onDown on every click once something is
      // already selected and immediately nulls out the selection it just
      // set — breaking re-selecting a new object and losing the popover
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

  /* ── Sync placed items to scene ──
     Rebuilds every item's mesh from scratch on every pass (fresh geometry,
     freshly cloned material for the selection glow, a fresh branding
     texture) — this effect re-runs on nearly every Advanced Edit
     interaction (color pick, part click, nudge), not just when an item is
     added, so the previous batch has to be disposed here or it leaks a
     little more GPU memory every single time, eventually crashing the tab.
     This is what was actually behind "crashes after a few adds" — the
     crash point was never really about which item was selected, it was
     just whichever rebuild finally exhausted the leak. */
  useEffect(() => {
    const scene = sceneRef.current;
    if (!scene) return;
    Object.values(meshMapRef.current).forEach(m => { scene.remove(m); disposeObject3D(m); });
    meshMapRef.current = {};
    placedItems.forEach(item => {
      // Building/materializing one item is wrapped per-item rather than
      // trusting every geometry builder in this ever-growing catalog to
      // never throw — before this, one bad build (a stray typo in a new
      // catalog family, a part lookup that assumes a mesh that isn't there
      // for a particular variant, etc.) would throw partway through this
      // forEach and abort the whole effect: every item *after* the bad one
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
            // Counter-scale against the parent's non-uniform dimensions (only
            // booths currently have per-axis dimensions) so resizing doesn't
            // stretch the painted-on text.
            const d = item.dimensions || { width: 1, height: 1, depth: 1 };
            panel.scale.set(1 / (d.width || 1), 1 / (d.height || 1), 1 / (d.depth || 1));
            obj.add(panel);
          }
        }
        if (selection?.kind === "furniture" && selection.id === item.id) {
          if (advancedMode) {
            // In Advanced Edit, glow only the exact tagged component that's
            // selected — a faint whole-object glow otherwise, just enough to
            // confirm which object is being edited without hiding the seams
            // between parts the user is meant to pick between.
            obj.traverse(c => {
              if (!c.isMesh) return;
              c.material = c.material.clone();
              // WHOLE_PART selected means "the whole object is the
              // component" — light up every mesh, not just tagged ones.
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

  /* ── Drop handler ──
     Every placed item uses the unified object shape shared across
     furniture, equipment, decoration, catering and lighting (see
     docs/customization-system-design.md). Structural elements (walls/
     doors/windows) still come from the tile floor plan, not this list. */
  const handleDrop = e => {
    e.preventDefault();
    const catalogId = e.dataTransfer.getData("elementId");
    if (!catalogId) return;
    // Dropping a new item while deep in Advanced Edit on a different object
    // used to leave a broken in-between render: advancedMode was still
    // true (so the component panel/banner kept rendering) while selection
    // and selectedPart suddenly pointed at the just-added item instead of
    // whatever was actually being edited — a mismatch the panel below
    // isn't built to survive. Exit cleanly first, in this same handler,
    // so React batches the exit and the new selection into one consistent
    // update instead of a transient bad one.
    if (advancedMode) handleExitAdvancedMode();
    const catalogEntry = ELEMENTS.find(el => el.id === catalogId);
    const rect = mountRef.current.getBoundingClientRect();
    const nx = (e.clientX - rect.left) / rect.width;
    const ny = (e.clientY - rect.top)  / rect.height;
    const x = (nx - 0.5) * RW * 0.8;
    const z = (ny - 0.5) * RD * 0.8;
    const type = catalogEntry?.type || catalogId;

    // Auto-attach to the nearest coffee booth if the drop lands within its
    // footprint — this is what makes an item "belong" to a station, no
    // separate attach UI required. Floral swags/garlands get the same
    // treatment against a much broader set of hosts (DECOR_ATTACH_TYPES —
    // any arch, backdrop, pedestal, or table-style piece), since "attach
    // to any decorated element" is the whole point of that catalog family;
    // everything else keeps the original coffee-corner-only behavior
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
    // room — never wherever they happened to be dropped on the floor.
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
      // market-stall reference sheet) — {} so individual parts can be
      // recolored independently of the item's single overall color.
      partColors: PART_LABELS[type] ? {} : null,
      // Advanced Edit Phase 3: per-part material override and per-part
      // position/rotation/scale offset, keyed the same way as partColors.
      // Both stay {} until a specific part is adjusted — untouched parts
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
    // Cascade: a station's accessories go with it rather than being left
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
    // floor — re-snap the offset point back to the nearest wall.
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

  /* ── Advanced Edit Mode — Phase 1: entry/exit + camera zoom.
     Keeps the user's current viewing angle (theta/phi) and only tweens
     px/pz/radius so the camera visibly "zooms into" the selected object
     rather than cutting to a new angle.

     Bridged with Event Editing Mode: Advanced Edit itself always ends up
     driven by orbitRef/updateCamera regardless of which mode it was
     entered from (that's the existing, tested zoom-and-edit machinery, and
     it doesn't need to change) — the only First-Person-aware part is at
     the two doorways. Entering from First Person tweens the raw camera
     pose (via beginPoseTween, which reads wherever the camera actually is
     right now) into the same orbit-derived target the Overview path uses,
     then hands control to orbitRef once it arrives. Exiting back into
     First Person does the mirror image: tween from the current
     (orbit-driven) pose back to the exact eye position/angle that was
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
        // Overview path — the standard popover reappears), which needs a
        // free cursor. Only re-lock here if nothing ended up selected;
        // otherwise the reactive effect above owns the lock from here.
        if (!selectionRef.current) requestPointerLockSafely();
      });
      // viewMode stayed "firstPerson" the entire time we were in Advanced
      // Edit (see handleEnterAdvancedMode) — nothing to flip back here.
    } else if (preAdvancedOrbitRef.current) {
      animateCameraTo(preAdvancedOrbitRef.current, 700);
      preAdvancedOrbitRef.current = null;
    }
  };

  // Leaving the object being edited — deselecting, or selecting something
  // else entirely — should back the camera out too, not strand it
  // zoomed in on whatever used to be there.
  useEffect(() => {
    if (advancedMode && (selection?.kind !== "furniture" || selection.id !== advancedItemIdRef.current)) {
      handleExitAdvancedMode();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selection]);

  /* While walking around in Event Editing Mode, selecting anything releases
     pointer lock so a real, free-moving cursor appears for the popover
     (its buttons/swatches/drag-handle need one — pointer lock only reports
     movement deltas, not a position, so it can't drive normal UI at all).
     Deselecting — Close, Esc, or clicking elsewhere — re-engages the lock
     and resumes walking, matching "movement pauses on selection, returns
     immediately to navigation on deselect" from the design brief. Skipped
     entirely while Advanced Edit is active — that transition manages the
     lock itself (see handleEnterAdvancedMode/handleExitAdvancedMode). */
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

  /* ── Advanced Edit Phase 3: per-component material + position/rotation/size ── */
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
  // no tagged sub-parts, selected as "the whole thing" in Advanced Edit) —
  // same interaction as the per-part nudges above, but writing straight to
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
     stood on its outer edges (they're auto-derived from tile occupancy —
     see customFloorPlan.js). The "redo" side of that is already free: the
     removed cell immediately reappears as a clickable ghost tile, so adding
     it back is the same single click used to grow the floor in the first
     place. Any door/wall-color entries keyed to that tile's edges are left
     in place rather than pruned — they simply stop being read once the edge
     no longer appears in computeBoundaryEdges, and spring back correctly if
     the tile (and thus that exact edge) is re-added later. */
  const handleRemoveTile = () => {
    if (selection?.kind !== "floor" || !selection.canRemove) return;
    setFloorTiles(prev => prev.filter(k => k !== selection.key));
    setSelection(null);
  };

  /* ── Recently Used / Favorites (docs/customization-system-design.md §4) ──
     Recently used is per-session scratch (sessionStorage, like the rest of
     the workspace's transient state); favorites are a lasting preference
     so they live in localStorage instead and survive across sessions. */
  useEffect(() => { writeJSON("eventify_recent_items", recentIds); }, [recentIds]);
  useEffect(() => {
    try { localStorage.setItem("eventify_favorite_items", JSON.stringify(favoriteIds)); } catch (e) {}
  }, [favoriteIds]);

  const toggleFavorite = (id) => {
    setFavoriteIds(prev => prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]);
  };

  /* ── Save layout to backend ── */
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

      {/* ── Unified object popover — one editing surface for every selectable
           thing, structural or not (docs/customization-system-design.md §2) ── */}
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
                  wall they're on — a manual 45° rotate would just knock
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

      {/* ── Event Editing Mode banner — persistent while walking through the
           venue, hidden during Advanced Edit so it doesn't stack with that
           banner (both are fixed, top-centered pills). The hint line swaps
           to a "click to resume" message while something's selected, since
           movement is paused and the cursor is free for the popover then. ── */}
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

      {/* ── Advanced Edit Mode banner — replaces the standard popover while
           zoomed in. Shows a breadcrumb ("Coffee Booth › Countertop") once
           a component is selected, so it's always clear both what object
           and what part of it you're editing. ── */}
      {advancedMode && selection?.kind === "furniture" && (() => {
        const item = placedItems.find(i => i.id === selection.id);
        if (!item) return null;
        const label = TYPE_LABELS[item.type] || "Item";
        // Skip the breadcrumb when the whole object itself is the
        // selected "component" — "Coffee Booth › Coffee Booth" is just noise.
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

      {/* ── Advanced Edit component panel — appears once a tagged part has
           been clicked. Color reuses the same partColors system as the
           standard popover; Material/Size/Position/Rotation (Phase 3) are
           the per-component equivalents of the whole-object controls,
           applied via applyPartTransforms. ── */}
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
        // partMaterials dictionaries — there's only one "component" to edit,
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
                    panel per item, positioned by BRANDING_PANEL_POS) rather
                    than something scoped to whichever sub-part is currently
                    selected — but it still needs to be reachable without
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
              // Whole-object actions — duplicating or deleting "just one
              // part" doesn't mean anything, so these only surface on the
              // WHOLE_PART selection, same scoping as Position/Rotation
              // above. Previously these only lived in the basic popover,
              // meaning Advanced Edit couldn't do them without backing out
              // first; both handlers already tolerate being called mid
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

      {/* ── Top bar ── */}
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

      {/* ── Workspace ── */}
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
