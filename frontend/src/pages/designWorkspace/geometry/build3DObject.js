/* build3DObject dispatcher: builds a THREE.Group for every catalog item
   type/variant combination. Extracted from Designworkspace.jsx. */

import * as THREE from "three";
import { buildArchPanel, buildFlutedPanel, buildFlutedCylinder } from "./branding";
import {
  buildFlowerCluster, buildFloralSwag, buildFlowerStem, buildGreeneryStem,
  buildBouquetStemBundle, buildTulipBloom, buildCallaBloom, buildFlowerHead,
  buildLeafSprig, buildPottedPlant, buildPeaceLily,
} from "./florals";
import { buildVase } from "./vases";
import { buildChairStyle, buildSofaStyle } from "./seating";
import { buildCurtain, buildCurtainRod, buildTieDecoration } from "./curtains";
import { buildTable } from "./tables";
import { buildRug } from "./rugs";
import { buildBackdropPanel, buildWelcomeSign, buildWallArt } from "./panelsSignsArt";
import { buildStage } from "./stages";
import { buildBalloon } from "./balloons";

/* Build 3D furniture.
   `variant` (docs/customization-system-design.md §4) picks a genuinely
   different shape, not just a different color. For example, a wedding chair
   is a different silhouette from a modern chair, not a recolored one. Types
   without variant branches just ignore the argument and always build their
   one shape (Phase 6 broadens coverage as the catalog grows). */
export function build3DObject(type, variant) {
  const group = new THREE.Group();
  switch(type) {
    case "round-table": {
      if (variant === "banquet") {
        // Floor-length tablecloth skirt instead of a bare pole+base. Reads
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
        // Wide padded box seat/back on plain wood-block legs. Sturdy
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
      // The counter is ~1.0m tall, with its top surface around y=1.0-1.03
      // across every variant, so Phase 4's equipment sits at a consistent
      // height regardless of which booth style it's placed on.
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
    /* Coffee Corner accessories and decorations (docs/coffee-corner-design.md §6).
       Station-scale: sized to sit on a booth counter or right beside one,
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
    /* Event stations (docs/coffee-corner-design.md follow-up, reference
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
    /* Wedding/reception backdrop and booth set (reference sheet #2).
       Arches all reuse buildArchPanel. A few keep the same silhouette
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
    /* Wedding decor/rental set (reference sheet #3). Plain vs. fluted
       silhouettes reused across arches, pedestals and vases via
       buildFlutedCylinder/buildFlutedPanel. The two flower clusters and the
       candle cluster from the same sheet were deliberately held back until
       the rest of this set was done. See flower-cluster-spray/-bouquet and
       candle-cluster further down, filed under Decorations/Lighting. */
    case "arch-panel-plain": {
      group.add(buildArchPanel(1.0, 2.2, 0.08, 0xb5654f, "panel"));
      break;
    }
    case "arch-panel-fluted": {
      // Uses the same total-height math buildArchPanel uses internally
      // (cap rise = width/2, body = height - that), so this matches the
      // plain arch's proportions exactly instead of drifting at larger
      // scales. See the dual-arch-mixed fix just below for why that matters.
      const white = 0x5c4a7c;
      const width = 1.0, totalHeight = 2.2;
      const capH = width / 2, bodyH = totalHeight - capH;
      const body = buildFlutedPanel(width, bodyH, white, "panel", 11);
      group.add(body);
      const cap = new THREE.Mesh(new THREE.SphereGeometry(0.5, 24, 12, 0, Math.PI*2, 0, Math.PI/2), new THREE.MeshStandardMaterial({color:white, side:THREE.DoubleSide}));
      cap.scale.set(width, width, 0.1); cap.position.y = bodyH; cap.userData.part = "panel";
      // Parented to `body` (not `group`) so the cap shares the exact same
      // parent as the ribs it tops. Advanced Edit's per-part resize groups
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
      // so it has to repeat that exact same math. Otherwise the two arches
      // silently end up different total heights. This reads as "barely
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
      // there instead of being a sibling positioned in absolute/group space.
      // The (0.48, -0.02) offset is already supplied by fluted.position above.
      flutedCap.position.set(0, bodyH, 0); flutedCap.userData.part = "panelFluted";
      // Same reasoning as arch-panel-fluted just above: parent the cap inside
      // `fluted` (the ribs' own wrapper group) rather than adding it as a
      // sibling under `group`. Advanced Edit's per-part resize/move groups
      // meshes by (part tag, immediate parent) into one pivot. If the cap
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
       few stems escaping the top. "Bouquet" is the denser, wider dome with
       none. This matches the two flower photos on the reference sheet. */
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
    /* The candle cluster from the same sheet: three glass cylinder jars at
       different heights, each with a pillar candle burned down to a
       different level inside, plus a faint warm glow at the wick so it
       still earns its spot under the Lighting category rather than reading
       as pure decoration. Jars are tagged keepOwnMaterial (same reasoning
       as bespoke gold trim elsewhere) since a "wood" or "metal" glass jar
       wouldn't make sense. They stay glass regardless of the item's
       overall material choice. The candles themselves are a normal tagged
       part ("candle") and stay fully customizable. */
    case "candle-cluster": {
      const glass = 0xeaf4f5, wax = 0xfaf6ee, flame = 0xfff2c8;
      const jars = [
        { x: -0.22, z:  0.06, r: 0.11, h: 0.34, cr: 0.07,  ch: 0.20 }, // Short, front-left
        { x:  0.06, z: -0.10, r: 0.13, h: 0.60, cr: 0.085, ch: 0.52 }, // Tall, back
        { x:  0.24, z:  0.09, r: 0.10, h: 0.46, cr: 0.065, ch: 0.24 }, // Medium, front-right, burned low
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
    /* Floral swags/garlands (reference sheet #4), strung along a path
       via buildFloralSwag rather than mounded like the flower clusters
       above. Meant to be dropped near an arch/backdrop/pedestal/table so
       DECOR_ATTACH_TYPES auto-parents them to it (see handleDrop). The sizes
       and default positions below assume they're being hand-positioned
       with Advanced Edit's Position controls afterward, not standing alone
       on the floor. Host heights vary far too much, from a 0.5m pedestal to
       a 2.3m arch, for one auto-placement to ever look right on all of them. */
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
      // trailing cascade. Designed to sit in the corner of a backdrop or
      // atop one side of an arch. Rotate the placed item to mirror it for
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
      // sparse blooms/foliage hanging beneath it. For a chair back,
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
      // arch-panel or arch-backdrop types. The "complete arch" piece from
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
      // a full semicircle. Lies along a table as a runner/centerpiece
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
      // Tight rounded dome of roses. The classic hand-tied bridal shape.
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
      // than mounded. Lilies are too large and architectural to dome like roses.
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
      // A small fan of calla trumpets splaying outward. The airy, minimal
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
      // A standalone tie/gather accessory. Same tie-decoration builders
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
