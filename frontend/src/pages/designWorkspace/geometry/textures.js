/* Procedural canvas-based wall/floor textures.
   Extracted from Designworkspace.jsx. */

import * as THREE from "three";

/* Generate procedural wall textures using canvas. */
export function generateTexture(type) {
  const canvas = document.createElement("canvas");
  canvas.width = 512;
  canvas.height = 512;
  const ctx = canvas.getContext("2d");

  if (type === 0) {
    // Plain: solid white
    ctx.fillStyle = "#ffffff";
    ctx.fillRect(0, 0, 512, 512);

  } else if (type === 1) {
    // Subtle: light pattern
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
    // Marble: white with grey veins
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
/* Creates simple floor textures for wood and tile.

   Plain floors do not use a texture.
*/
export function generateFloorTexture(type) {
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
