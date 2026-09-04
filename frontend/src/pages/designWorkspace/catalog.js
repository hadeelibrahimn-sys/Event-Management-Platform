/* Stores the DesignWorkspace catalog and related settings.

   This includes layouts, categories, object details, ranking, materials, colors and branding options.

   The file contains configuration data only and does not directly use React or Three.js.
*/

import thumbIndoor   from "../../assets/layouts/thumb-indoor.png";
import thumbEnclosed from "../../assets/layouts/thumb-enclosed.png";
import thumbLshaped  from "../../assets/layouts/thumb-lshaped.png";
import thumbGarden   from "../../assets/layouts/thumb-garden.png";

export const LAYOUT_IMAGES = {
  indoor:   thumbIndoor,
  enclosed: thumbEnclosed,
  lshaped:  thumbLshaped,
  garden:   thumbGarden,
  custom:   null,
};

/* Defines the object categories used in the workspace.

   Category ids are stored with objects while labels are shown in the interface.

   This allows labels to change later without affecting saved data.

   Structural items are listed for reference even though they are not added from the catalog.
*/
export const CATEGORY_META = [
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
export const CATEGORY_LABELS = Object.fromEntries(CATEGORY_META.map(c => [c.id, c.label]));
export const CATEGORIES = ["All", ...CATEGORY_META.map(c => c.id)];

/* Resizes objects in small steps.

   The limits prevent objects from becoming too small or too large.
*/
export const SCALE_STEP = 0.1;
export const SCALE_MIN = 0.5;
export const SCALE_MAX = 4.0;

/* Controls position, rotation and size changes for individual object parts.

   The limits are smaller to help prevent parts from moving or resizing too far.
*/
export const PART_POS_STEP   = 0.05;
export const PART_POS_MIN    = -0.6;
export const PART_POS_MAX    = 0.6;
export const PART_ROT_STEP   = Math.PI / 12; // 15°
export const PART_SCALE_STEP = 0.1;
export const PART_SCALE_MIN  = 0.5;
export const PART_SCALE_MAX  = 2.0;

/* Defines the objects available in the catalog.

   Each item has a unique id, type and optional variant.

   Multiple items can share the same type while using different shapes.
*/
export const ELEMENTS = [
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

  // Balloons: every variant defaults to a distinct vivid color, never white.
  // This is so the catalog list reads clearly at a glance, per request, even
  // though the reference sheet itself was shot all-white.
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
  // chair grid + curved/tufted/sectional sofa grid). Every variant gets
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

/* Generic per-type label for the popover title. Decoupled from ELEMENTS
   since several catalog entries (variants) now share one base type. */
export const TYPE_LABELS = {
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

/* Per-part coloring for multi-piece event stations.
   Only types listed here get a per-part color section in the popover.
   Everything else keeps the single overall Color swatch row. Keys must
   match the userData.part tags set on the meshes in build3DObject. */
export const PART_LABELS = {
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

/* Used when an object does not have separate editable parts.

   In this case, the normal object editing controls are used instead.
*/
export const WHOLE_PART = "__whole__";
export const getPartLabel = (item, part) =>
  part === WHOLE_PART ? (TYPE_LABELS[item.type] || "Object") : ((PART_LABELS[item.type] || {})[part] || part);

/* Ranks catalog items based on the selected event type.

   Relevant items appear first, but all objects remain available.

   Guest count does not affect this ranking.
*/
export const EVENT_TYPE_PRIORITY = {
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
export const RECOMMENDED_COUNT = 6; // How many top-ranked items get the badge

export const wallColorPresets  = ["#ffffff","#f5f0ff","#fdf6ec","#ecf0f1","#d6eaf8","#eafaf1","#2c3e50","#1a1a2e"];
export const floorColorPresets = ["#f5f5f5","#f0e6d3","#d5b896","#c8b89a","#95a5a6","#5d4037","#263238","#e8e0f0"];
export const itemColorPresets  = ["#8B5E3C","#c4b5fd","#7c3aed","#ffffff","#1e1b4b","#d97706","#16a34a","#ef4444","#374151","#f9a8d4"];
// Provides different white color options for 3D objects.

// This helps white materials look more natural under scene lighting.
export const whiteShadePresets = ["#ffffff","#fffdf7","#fdf6e3","#f5f5f0","#eef1f5","#faf3e8"];

/* Defines the material styles used across workspace objects.

   The same presets are shared by different object types.

   Each material uses simple surface settings such as roughness, metalness and transparency.
*/
export const MATERIAL_PRESETS = {
  wood:     { label: "Wood",     roughness: 0.75, metalness: 0.0  },
  marble:   { label: "Marble",   roughness: 0.15, metalness: 0.05 },
  glass:    { label: "Glass",    roughness: 0.05, metalness: 0.1, transparent: true, opacity: 0.4 },
  metal:    { label: "Metal",    roughness: 0.3,  metalness: 0.85 },
  fabric:   { label: "Fabric",   roughness: 0.95, metalness: 0.0  },
  plastic:  { label: "Plastic",  roughness: 0.5,  metalness: 0.05 },
  concrete: { label: "Concrete", roughness: 0.9,  metalness: 0.0  },
  stone:    { label: "Stone",    roughness: 0.8,  metalness: 0.05 },
};
export const MATERIAL_LIST = Object.keys(MATERIAL_PRESETS);
export const DEFAULT_MATERIAL = "plastic";

/* Booth branding (docs/coffee-corner-design.md §5).
   A small curated font list rather than exposing every system font. Kept
   short and reliably renderable across platforms via canvas. */
export const BRANDING_FONTS = ["Poppins", "Georgia", "Courier New", "Brush Script MT", "Verdana"];
export const DEFAULT_BRANDING_FONT = BRANDING_FONTS[0];
export const BRANDING_SIZE_MIN = 24, BRANDING_SIZE_MAX = 88, BRANDING_SIZE_STEP = 4;
export const BRANDING_OFFSET_MIN = -0.5, BRANDING_OFFSET_MAX = 0.5, BRANDING_OFFSET_STEP = 0.1;
export const BRANDABLE_TYPES = new Set([
  "coffee-booth", "umbrella-cart", "kiosk-booth", "umbrella-table", "display-pedestals",
  "mini-umbrella-cart", "umbrella-cart-wheeled", "curtain-photo-booth", "backdrop-wall",
  "floral-arch-backdrop", "drape-arch-backdrop", "balloon-arch-bow", "name-arch-backdrop",
  "window-counter-booth", "panel-sconce-stand", "arch-bookshelf", "curtain-backdrop-bow",
  "storefront-facade", "paneled-counter", "round-reception-desk",
  "backdrop-panel", "welcome-sign",
]);

/* Sets the text position for different booth and station shapes.

   Each object uses its own placement so the text stays correctly aligned on its front surface.
*/
export const BRANDING_PANEL_POS = {
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

/* Automatically attaches nearby accessories to a coffee booth.

   Attached items are placed at counter height instead of on the floor.
*/
export const STATION_ATTACH_RADIUS = 1.3;
export const COUNTER_TOP_TYPES = new Set([
  "flower-arrangement",
]);

/* Automatically attaches nearby floral decorations to suitable objects.

   A wider range is used because these objects can be larger than coffee booths.
*/
export const DECOR_ATTACH_RADIUS = 1.8;
export const DECOR_ATTACH_TYPES = new Set([
  ...BRANDABLE_TYPES,
  "arch-panel-plain", "arch-panel-fluted", "dual-arch-mixed",
  "pedestal-duo-plain", "pedestal-duo-fluted", "pedestal-single-plain", "pedestal-single-fluted",
  "fluted-panel-wall", "tiered-stand-fluted", "tiered-stand-acrylic",
  "card-box", "guest-book", "fluted-bowl-duo", "fluted-vase",
  "cake-table", "buffet-table",
]);
export const FLORAL_SWAG_TYPES = new Set([
  "floral-swag-horizontal", "floral-swag-corner", "floral-cascade-teardrop",
  "floral-arch-garland", "floral-swag-crescent",
]);
export const STATION_COUNTER_Y = 1.0;
