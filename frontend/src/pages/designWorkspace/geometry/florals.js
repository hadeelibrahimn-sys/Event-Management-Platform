/* Creates flowers, bouquets, greenery and potted plants for the 3D workspace. */

import * as THREE from "three";

/* Creates flower heads used in floral arrangements.

   Each flower is built from small layered shapes to give it a more natural look.

   Different light shades are used by default, while Advanced Edit can recolor the flower parts.
*/
export const FLORAL_BLOOM_PALETTE = [0xffffff, 0xfdf6e9, 0xf7f0e3, 0xfffdf8, 0xf3ead9];

export function buildFlowerHead(size, index, part) {
  const g = new THREE.Group();
  const color = FLORAL_BLOOM_PALETTE[index % FLORAL_BLOOM_PALETTE.length];
  const petalMat = () => new THREE.MeshStandardMaterial({ color, roughness: 0.7 });
// Gives each flower a slightly different rotation.

// The rotation stays consistent whenever the model is rebuilt.
  const spin = (index * 2.399963) % (Math.PI * 2); // Irrational-ish step avoids any visible repeating pattern
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

/* Creates a rounded cluster of flowers for bouquet and spray designs.

   Flower positions stay consistent when the model is rebuilt.

   Some variants can also include visible stems.
*/
export function buildFlowerCluster(part, opts = {}) {
  const {
    count = 24, radiusX = 0.3, radiusY = 0.24, radiusZ = 0.26,
    domeBias = 0.55, bloomMin = 0.05, bloomMax = 0.09,
    stemCount = 0, stemHeight = 0.3, stemPart = part,
  } = opts;
  const g = new THREE.Group();
  const golden = Math.PI * (3 - Math.sqrt(5)); // Golden angle: even, deterministic spiral spacing
  for (let i = 0; i < count; i++) {
    const t = i / Math.max(1, count - 1);
    const yFrac = domeBias + t * (1 - domeBias); // Biases toward the upper hemisphere so it mounds up, not floats as a full sphere
    const radial = Math.sqrt(Math.max(0, 1 - yFrac * yFrac));
    const theta = i * golden;
    const x = Math.cos(theta) * radial * radiusX;
    const z = Math.sin(theta) * radial * radiusZ;
    const y = yFrac * radiusY;
    const size = bloomMin + ((i * 7) % 5) / 4 * (bloomMax - bloomMin); // Deterministic pseudo-variety in bloom size
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
    // A tight unopened bud, small enough that one plain smooth sphere
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

/* Creates a simple leafy stem used in floral arrangements.

   The lightweight design makes it suitable for larger garlands and decorations.
*/
export function buildLeafSprig(length, part, color = 0x4d7c3f) {
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

/* Places flowers and leaves along a defined path.

   Different paths are used to create garlands, swags and cascading arrangements.

   Flower size and spacing can change along the path while staying consistent when rebuilt.
*/
export function buildFloralSwag(points, opts = {}) {
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
    // A repeatable pseudo-threshold from the index instead of Math.random().
    // Tapering ends read as organically sparse but never reshuffle
    // between rebuilds.
    const roll = ((i * 37) % 11) / 10;
    if (roll < bloomChance(t)) {
      const size = sizeAt(t) * (0.85 + ((i * 13) % 5) / 4 * 0.3);
      const bloom = buildFlowerHead(size, i, bloomPart);
      bloom.position.set(p.x, p.y, p.z);
// Rotates the flower only around the vertical axis.

// This keeps the bloom upright while still giving each flower some variation.
      bloom.rotation.y = (i * 1.3) % (Math.PI * 2);
      g.add(bloom);
    }
    if (i % leafEvery === 0) {
      const leaf = buildLeafSprig(leafLength * (0.7 + ((i * 5) % 4) / 4 * 0.6), leafPart, leafColor);
      leaf.position.set(p.x, p.y, p.z);
      // Points the sprig outward and downward at a per-index angle rather
      // than always straight up, so it reads as tucked into the arrangement
      // instead of a row of identical upright sprigs.
      leaf.rotation.y = (i * 0.9) % (Math.PI * 2);
      leaf.rotation.z = (((i * 3) % 5) / 4 - 0.5) * 0.6;
      g.add(leaf);
    }
  });
  return g;
}

// Creates different greenery stem styles.

// Each variant changes details such as leaf shape, size, amount and color.
export const GREENERY_STEM_STYLES = {
  fern:               { leafShape: "frond",  color: 0x6fae5c, leafCount: 20, leafSize: 0.05,  height: 0.55 },
  "eucalyptus-silver": { leafShape: "disc",  color: 0xb9c9ad, leafCount: 10, leafSize: 0.045, height: 0.5  },
  olive:              { leafShape: "blade",  color: 0x7f9a6b, leafCount: 12, leafSize: 0.06,  height: 0.5  },
  "asparagus-fern":   { leafShape: "needle", color: 0x5f9e57, leafCount: 28, leafSize: 0.02,  height: 0.45 },
  "eucalyptus-round": { leafShape: "disc",   color: 0x6f9a5c, leafCount: 10, leafSize: 0.05,  height: 0.5  },
  ruscus:             { leafShape: "blade",  color: 0x3f6b34, leafCount: 8,  leafSize: 0.09,  height: 0.45 },
  "dusty-miller":     { leafShape: "frond",  color: 0xaebfa4, leafCount: 20, leafSize: 0.045, height: 0.4  },
};
export function buildGreeneryStem(variant, part = "leaves") {
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
      // "frond": a few tiny leaflets fanned from one point, for the
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
    if (leaf.isMesh) leaf.userData.part = part; // Groups (the "frond" case) tag their own leaflet meshes above instead, since applyItemMaterial only ever looks at userData.part on actual meshes
    g.add(leaf);
  }
  return g;
}

/* Creates different single flower stem styles.

   Each variant changes the flower shape and arrangement to match the selected type.
*/
export const FLOWER_STEM_STYLES = {
  orchid:         { bloom: "star",    count: 5,  size: 0.05,  height: 0.55, spread: 0.12 },
  lisianthus:     { bloom: "cluster", count: 4,  size: 0.045, height: 0.45, spread: 0.09 },
  carnation:      { bloom: "cluster", count: 3,  size: 0.05,  height: 0.4,  spread: 0.07 },
  "babys-breath": { bloom: "pin",     count: 24, size: 0.012, height: 0.4,  spread: 0.16 },
  delphinium:     { bloom: "spike",   count: 28, size: 0.022, height: 0.65, spread: 0.05 },
  rose:           { bloom: "cluster", count: 3,  size: 0.06,  height: 0.5,  spread: 0.08 },
};
export function buildFlowerStem(variant, bloomPart = "blooms", leafPart = "leaves") {
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
    // Delphinium/larkspur: small florets packed the entire length of the
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
    // Baby's breath: many tiny blooms scattered on fine branching twigs
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
    // Orchid: a few flat 5-petal blooms alternating down a gently
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
  // "cluster": lisianthus/carnation/rose all reuse buildFlowerHead's
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

/* Creates tied bouquet designs with stems and a ribbon.

   Each bouquet can use a different flower arrangement on top.
*/
export function buildBouquetStemBundle(count, height, part = "stems") {
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

/* A simple closed cup: a smooth sphere stretched taller than it is wide,
   standing in for a tulip bloom, which (unlike a rose) never opens into
   layered petals. */
export function buildTulipBloom(size, index, part) {
  const color = FLORAL_BLOOM_PALETTE[index % FLORAL_BLOOM_PALETTE.length];
  const bloom = new THREE.Mesh(new THREE.SphereGeometry(size, 8, 6), new THREE.MeshStandardMaterial({ color, roughness: 0.6 }));
  bloom.scale.set(0.8, 1.3, 0.8);
  bloom.userData.part = part;
  return bloom;
}

/* Creates a simple trumpet shaped calla lily.

   A small yellow center is added to make the flower easier to recognize.
*/
export function buildCallaBloom(size, part) {
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

/* Creates different potted plant styles.

   Each variant changes details such as leaf shape, size, amount and color.

   Plants with different structures, such as the peace lily, use their own builder.
*/
export function buildPlantPot(r, h, potStyle, color) {
  const g = new THREE.Group();
  const mat = new THREE.MeshStandardMaterial({ color, roughness: 0.85 });
  if (potStyle === "cylinder-tall" || potStyle === "ribbed") {
    const segs = potStyle === "ribbed" ? 16 : 24;
    const body = new THREE.Mesh(new THREE.CylinderGeometry(r * (potStyle === "ribbed" ? 0.92 : 1), r, h, segs), mat);
    body.position.y = h / 2;
    body.userData.part = "pot";
    g.add(body);
  } else {
    // "round": a bulbous lathe-revolved profile matching the rounded
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
   leaning a per-index amount rather than standing perfectly straight,
   since real nursery trunks are never perfectly vertical. */
export function buildPlantTrunks(count, height, color, potR, part = "trunk") {
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
export function buildOvalLeafMesh(length, width, color, part, flat = false) {
  const leaf = new THREE.Mesh(
    new THREE.SphereGeometry(length * 0.5, 8, 6),
    new THREE.MeshStandardMaterial({ color, roughness: 0.4, flatShading: flat, side: THREE.DoubleSide })
  );
  leaf.scale.set(width / length, 1, 0.12);
  leaf.position.y = length * 0.5;
  leaf.userData.part = part;
  return leaf;
}

/* A stiff, flat blade: the shared shape behind snake-plant leaves, palm
   fronds, and fern fronds, which all read as "a thin tapered blade," just
   at different lengths/angles/densities. */
export function buildBladeMesh(length, width, color, part) {
  const blade = new THREE.Mesh(
    new THREE.ConeGeometry(width * 0.5, length, 4),
    new THREE.MeshStandardMaterial({ color, flatShading: true, side: THREE.DoubleSide })
  );
  blade.position.y = length * 0.5;
  blade.userData.part = part;
  return blade;
}

export const POTTED_PLANT_STYLES = {
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

export function buildPottedFoliage(style, part = "leaves") {
  const g = new THREE.Group();
  const golden = Math.PI * (3 - Math.sqrt(5));
  const shape = style.leafShape;
  const count = style.leafCount;

  if (shape === "small-branch") {
    // Tiny olive leaves scattered over a loose conical envelope above the
    // trunk tops, rather than growing from one clear stem-and-leaf pattern.
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
    // Long petiole plus one big leaf at the tip, fanned around the pot at
    // the golden angle so no two leaves line up directly behind one another.
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
    // Big glossy leaves alternating up a single central trunk. Fiddle-leaf
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
    // Stiff upright blades straight from the pot. Two stacked blades
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
    // ZZ plant: stems fanned outward from vertical at increasing angles,
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
    // in every direction. Fuller and denser than the single greenery-stem fern.
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

/* Assembles a full potted plant (pot plus optional trunks/canes plus
   foliage) from the POTTED_PLANT_STYLES table for a given variant id. */
export function buildPottedPlant(variant) {
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

/* Creates a peace lily with leaves, stems and white flowers.

   It uses its own builder because the flower parts are different from other potted plants.
*/
export function buildPeaceLily() {
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
