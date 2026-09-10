import * as THREE from "three";

const cache = new Map<string, THREE.Texture>();

function canvasTex(
  key: string,
  size: number,
  draw: (ctx: CanvasRenderingContext2D, size: number) => void,
  repeat = 4,
  colorSpace: typeof THREE.SRGBColorSpace | typeof THREE.NoColorSpace = THREE.SRGBColorSpace,
): THREE.Texture {
  const hit = cache.get(key);
  if (hit) return hit;
  const c = document.createElement("canvas");
  c.width = c.height = size;
  const ctx = c.getContext("2d")!;
  draw(ctx, size);
  const t = new THREE.CanvasTexture(c);
  t.wrapS = t.wrapT = THREE.RepeatWrapping;
  t.repeat.set(repeat, repeat);
  t.colorSpace = colorSpace;
  t.anisotropy = 16;
  t.generateMipmaps = true;
  t.minFilter = THREE.LinearMipmapLinearFilter;
  t.magFilter = THREE.LinearFilter;
  t.needsUpdate = true;
  cache.set(key, t);
  return t;
}

function noise(ctx: CanvasRenderingContext2D, size: number, alpha: number) {
  const img = ctx.getImageData(0, 0, size, size);
  const d = img.data;
  for (let i = 0; i < d.length; i += 4) {
    const n = (Math.random() - 0.5) * alpha;
    d[i] = Math.max(0, Math.min(255, d[i]! + n));
    d[i + 1] = Math.max(0, Math.min(255, d[i + 1]! + n));
    d[i + 2] = Math.max(0, Math.min(255, d[i + 2]! + n));
  }
  ctx.putImageData(img, 0, 0);
}

export function plaster(hex: string, stain = 18) {
  return canvasTex(
    "plaster-" + hex,
    1024,
    (ctx, s) => {
      ctx.fillStyle = hex;
      ctx.fillRect(0, 0, s, s);
      // large water-stain blooms
      for (let i = 0; i < 90; i++) {
        ctx.fillStyle = `rgba(36,34,28,${0.02 + Math.random() * 0.08})`;
        ctx.beginPath();
        ctx.ellipse(
          Math.random() * s,
          Math.random() * s,
          14 + Math.random() * 90,
          8 + Math.random() * 36,
          Math.random() * Math.PI,
          0,
          Math.PI * 2,
        );
        ctx.fill();
      }
      // window-column drips (regular, so the tile reads as a wet facade)
      const cols = 8;
      for (let c = 0; c < cols; c++) {
        const x = ((c + 0.5) / cols) * s + (Math.random() - 0.5) * 8;
        const g = ctx.createLinearGradient(x, 0, x, s);
        g.addColorStop(0, "rgba(22,24,26,0)");
        g.addColorStop(0.18, `rgba(18,20,22,${0.04 + Math.random() * 0.06})`);
        g.addColorStop(0.72, `rgba(14,16,18,${0.1 + Math.random() * 0.12})`);
        g.addColorStop(1, `rgba(10,12,14,${0.16 + Math.random() * 0.1})`);
        ctx.fillStyle = g;
        ctx.fillRect(x - 1, 0, 2 + Math.random() * 3.5, s);
        // satellite hairline streaks
        ctx.fillStyle = `rgba(16,18,20,${0.05 + Math.random() * 0.07})`;
        ctx.fillRect(x + 6 + Math.random() * 10, s * 0.1, 1, s * 0.7);
      }
      // capillary wet band at the base of the tile
      const base = ctx.createLinearGradient(0, s * 0.62, 0, s);
      base.addColorStop(0, "rgba(16,18,20,0)");
      base.addColorStop(1, "rgba(10,12,14,0.22)");
      ctx.fillStyle = base;
      ctx.fillRect(0, s * 0.62, s, s * 0.38);
      // hairline cracks
      ctx.strokeStyle = "rgba(28,26,22,0.16)";
      ctx.lineWidth = 1;
      for (let i = 0; i < 18; i++) {
        ctx.beginPath();
        ctx.moveTo(Math.random() * s, Math.random() * s);
        ctx.lineTo(Math.random() * s, Math.random() * s);
        ctx.stroke();
      }
      // pale salt / efflorescence
      ctx.fillStyle = "rgba(220,214,200,0.05)";
      for (let i = 0; i < 40; i++) {
        ctx.fillRect(Math.random() * s, Math.random() * s, 8 + Math.random() * 28, 2 + Math.random() * 6);
      }
      noise(ctx, s, stain);
    },
    6,
  );
}

/** Transparent overlay of window-grid drips for the south facade. */
export function stainOverlay() {
  return canvasTex(
    "stain-overlay",
    1024,
    (ctx, s) => {
      ctx.clearRect(0, 0, s, s);
      for (let col = 0; col < 12; col++) {
        const x = 40 + col * 82 + (Math.random() - 0.5) * 10;
        const g = ctx.createLinearGradient(x, 0, x, s);
        g.addColorStop(0, "rgba(8,10,12,0)");
        g.addColorStop(0.12, "rgba(8,10,12,0.18)");
        g.addColorStop(1, "rgba(6,8,10,0.55)");
        ctx.fillStyle = g;
        ctx.fillRect(x, 30, 3 + Math.random() * 4, s - 40);
        ctx.fillStyle = "rgba(8,10,12,0.28)";
        ctx.fillRect(x + 10, 80, 1.5, s * 0.6);
      }
      ctx.fillStyle = "rgba(8,10,12,0.22)";
      ctx.fillRect(0, s * 0.78, s, s * 0.22);
    },
    1,
  );
}

export function linoleum(hex: string) {
  return canvasTex(
    "lino-" + hex,
    128,
    (ctx, s) => {
      ctx.fillStyle = hex;
      ctx.fillRect(0, 0, s, s);
      const tile = 32;
      ctx.strokeStyle = "rgba(0,0,0,0.08)";
      ctx.lineWidth = 1;
      for (let x = 0; x <= s; x += tile) {
        ctx.beginPath();
        ctx.moveTo(x, 0);
        ctx.lineTo(x, s);
        ctx.stroke();
      }
      for (let y = 0; y <= s; y += tile) {
        ctx.beginPath();
        ctx.moveTo(0, y);
        ctx.lineTo(s, y);
        ctx.stroke();
      }
      noise(ctx, s, 12);
    },
    12,
  );
}

export function asphalt() {
  return canvasTex(
    "asphalt-wet-v2",
    1024,
    (ctx, s) => {
      ctx.fillStyle = "#141618";
      ctx.fillRect(0, 0, s, s);
      noise(ctx, s, 42);
      // aggregate grit
      for (let i = 0; i < 2200; i++) {
        const v = 70 + Math.random() * 50;
        ctx.fillStyle = `rgba(${v},${v + 2},${v - 4},0.14)`;
        ctx.fillRect(Math.random() * s, Math.random() * s, 1, 1);
      }
      // oil / puddle patches — darker, slightly cooler
      for (let i = 0; i < 22; i++) {
        const g = ctx.createRadialGradient(0, 0, 4, 0, 0, 80);
        // drawn via ellipse fill instead
        ctx.fillStyle = `rgba(4,6,8,${0.28 + Math.random() * 0.4})`;
        ctx.beginPath();
        ctx.ellipse(
          Math.random() * s,
          Math.random() * s,
          22 + Math.random() * 90,
          10 + Math.random() * 36,
          Math.random() * Math.PI,
          0,
          Math.PI * 2,
        );
        ctx.fill();
      }
      // faint wet specular streaks (light catching rain-slick)
      ctx.strokeStyle = "rgba(160,170,180,0.06)";
      ctx.lineWidth = 1.2;
      for (let i = 0; i < 24; i++) {
        ctx.beginPath();
        const x = Math.random() * s;
        ctx.moveTo(x, Math.random() * s);
        ctx.quadraticCurveTo(x + 40, Math.random() * s, x + 8, Math.random() * s);
        ctx.stroke();
      }
      // hairline cracks
      ctx.strokeStyle = "rgba(8,8,8,0.35)";
      ctx.lineWidth = 1;
      for (let i = 0; i < 10; i++) {
        ctx.beginPath();
        ctx.moveTo(Math.random() * s, Math.random() * s);
        ctx.lineTo(Math.random() * s, Math.random() * s);
        ctx.stroke();
      }
    },
    10,
  );
}

/** Linear roughness: dark = wet/smooth. */
export function asphaltRough() {
  return canvasTex(
    "asphalt-rough-v2",
    1024,
    (ctx, s) => {
      ctx.fillStyle = "#8a8a8a";
      ctx.fillRect(0, 0, s, s);
      noise(ctx, s, 28);
      for (let i = 0; i < 22; i++) {
        ctx.fillStyle = `rgba(18,18,18,${0.45 + Math.random() * 0.5})`;
        ctx.beginPath();
        ctx.ellipse(
          Math.random() * s,
          Math.random() * s,
          22 + Math.random() * 90,
          10 + Math.random() * 36,
          Math.random() * Math.PI,
          0,
          Math.PI * 2,
        );
        ctx.fill();
      }
    },
    10,
    THREE.NoColorSpace,
  );
}

export function zebra() {
  return canvasTex(
    "zebra-v2",
    256,
    (ctx, s) => {
      ctx.fillStyle = "#16181a";
      ctx.fillRect(0, 0, s, s);
      ctx.fillStyle = "#d4cfc2";
      for (let y = 0; y < s; y += 36) {
        ctx.fillRect(0, y, s, 16);
      }
      // worn edges
      ctx.fillStyle = "rgba(20,22,24,0.35)";
      for (let i = 0; i < 40; i++) {
        ctx.fillRect(Math.random() * s, Math.random() * s, 6, 2);
      }
      noise(ctx, s, 20);
    },
    1,
  );
}

export function sidewalk() {
  return canvasTex(
    "sidewalk",
    512,
    (ctx, s) => {
      ctx.fillStyle = "#5a5854";
      ctx.fillRect(0, 0, s, s);
      const tile = 128;
      ctx.strokeStyle = "rgba(20,18,16,0.35)";
      ctx.lineWidth = 3;
      for (let x = 0; x <= s; x += tile) {
        ctx.beginPath();
        ctx.moveTo(x, 0);
        ctx.lineTo(x, s);
        ctx.stroke();
      }
      for (let y = 0; y <= s; y += tile) {
        ctx.beginPath();
        ctx.moveTo(0, y);
        ctx.lineTo(s, y);
        ctx.stroke();
      }
      ctx.fillStyle = "rgba(12,12,12,0.12)";
      ctx.fillRect(0, s * 0.7, s, s * 0.3);
      noise(ctx, s, 24);
    },
    4,
  );
}

export function concrete() {
  return canvasTex(
    "concrete-v2",
    512,
    (ctx, s) => {
      ctx.fillStyle = "#6a6862";
      ctx.fillRect(0, 0, s, s);
      noise(ctx, s, 26);
      ctx.strokeStyle = "rgba(30,28,24,0.12)";
      ctx.lineWidth = 1;
      for (let i = 0; i < 8; i++) {
        ctx.beginPath();
        ctx.moveTo(Math.random() * s, 0);
        ctx.lineTo(Math.random() * s, s);
        ctx.stroke();
      }
      ctx.fillStyle = "rgba(16,16,16,0.08)";
      ctx.fillRect(0, s * 0.75, s, s * 0.25);
    },
    8,
  );
}

export function wood() {
  return canvasTex(
    "wood",
    128,
    (ctx, s) => {
      ctx.fillStyle = "#4a3828";
      ctx.fillRect(0, 0, s, s);
      for (let y = 0; y < s; y++) {
        ctx.fillStyle = `rgba(20,12,8,${0.04 + Math.sin(y * 0.4) * 0.04})`;
        ctx.fillRect(0, y, s, 1);
      }
      noise(ctx, s, 10);
    },
    2,
  );
}

export function metal() {
  return canvasTex(
    "metal",
    64,
    (ctx, s) => {
      ctx.fillStyle = "#8a9094";
      ctx.fillRect(0, 0, s, s);
      noise(ctx, s, 16);
    },
    2,
  );
}

export function rainSheetTex() {
  return canvasTex(
    "rain-sheet",
    256,
    (ctx, s) => {
      ctx.clearRect(0, 0, s, s);
      for (let i = 0; i < 80; i++) {
        const x = Math.random() * s;
        const a = 0.14 + Math.random() * 0.42;
        const g = ctx.createLinearGradient(x, 0, x, s);
        g.addColorStop(0, "rgba(214,226,238,0)");
        g.addColorStop(0.22, `rgba(214,226,238,${a})`);
        g.addColorStop(1, "rgba(214,226,238,0)");
        ctx.fillStyle = g;
        ctx.fillRect(x, 0, 0.7 + Math.random() * 1.6, s);
      }
    },
    1,
  );
}

export function rustMetal() {
  return canvasTex(
    "rust-metal",
    256,
    (ctx, s) => {
      ctx.fillStyle = "#2c2e2c";
      ctx.fillRect(0, 0, s, s);
      for (let i = 0; i < 50; i++) {
        ctx.fillStyle = `rgba(${90 + Math.random() * 50},${40 + Math.random() * 20},20,${0.08 + Math.random() * 0.18})`;
        ctx.beginPath();
        ctx.ellipse(
          Math.random() * s,
          Math.random() * s,
          4 + Math.random() * 18,
          3 + Math.random() * 10,
          Math.random(),
          0,
          Math.PI * 2,
        );
        ctx.fill();
      }
      noise(ctx, s, 18);
    },
    2,
  );
}

export function grass() {
  return canvasTex(
    "grass-wet",
    256,
    (ctx, s) => {
      ctx.fillStyle = "#12180e";
      ctx.fillRect(0, 0, s, s);
      for (let i = 0; i < 1400; i++) {
        ctx.fillStyle = `rgba(${14 + Math.random() * 28},${28 + Math.random() * 40},${12},0.6)`;
        ctx.fillRect(Math.random() * s, Math.random() * s, 1, 2 + Math.random() * 5);
      }
      // wet darker patches
      ctx.fillStyle = "rgba(6,10,6,0.28)";
      for (let i = 0; i < 10; i++) {
        ctx.beginPath();
        ctx.ellipse(Math.random() * s, Math.random() * s, 20 + Math.random() * 40, 12, 0, 0, Math.PI * 2);
        ctx.fill();
      }
      noise(ctx, s, 10);
    },
    8,
  );
}

export function brick() {
  return canvasTex(
    "brick-v2",
    512,
    (ctx, s) => {
      ctx.fillStyle = "#2e2c28";
      ctx.fillRect(0, 0, s, s);
      const bw = 48;
      const bh = 20;
      for (let y = 0, row = 0; y < s; y += bh + 3, row++) {
        const off = row % 2 ? bw / 2 : 0;
        for (let x = -bw; x < s; x += bw + 3) {
          const r = 78 + Math.random() * 28;
          const g = 50 + Math.random() * 16;
          const b = 42 + Math.random() * 12;
          ctx.fillStyle = `rgb(${r},${g},${b})`;
          ctx.fillRect(x + off, y, bw, bh);
          ctx.fillStyle = "rgba(0,0,0,0.18)";
          ctx.fillRect(x + off, y + bh - 4, bw, 4);
        }
      }
      noise(ctx, s, 16);
    },
    3,
  );
}

export function nightEnv(): THREE.CanvasTexture {
  const w = 1024;
  const h = 512;
  const c = document.createElement("canvas");
  c.width = w;
  c.height = h;
  const ctx = c.getContext("2d")!;
  const g = ctx.createLinearGradient(0, 0, 0, h);
  g.addColorStop(0, "#05060a");
  g.addColorStop(0.4, "#0a121c");
  g.addColorStop(0.48, "#3a3224");
  g.addColorStop(0.52, "#241c14");
  g.addColorStop(0.62, "#101214");
  g.addColorStop(1, "#07080c");
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, w, h);
  for (let i = 0; i < 500; i++) {
    ctx.fillStyle = `rgba(220,230,255,${0.12 + Math.random() * 0.55})`;
    ctx.fillRect(Math.random() * w, Math.random() * h * 0.44, 1, 1);
  }
  // moon
  ctx.fillStyle = "rgba(230,236,245,0.95)";
  ctx.beginPath();
  ctx.arc(w * 0.72, h * 0.18, 10, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = "rgba(210,220,240,0.18)";
  ctx.beginPath();
  ctx.arc(w * 0.72, h * 0.18, 28, 0, Math.PI * 2);
  ctx.fill();
  // city window belt on the horizon
  for (let i = 0; i < 280; i++) {
    const x = Math.random() * w;
    const y = h * 0.49 + (Math.random() - 0.5) * 16;
    ctx.fillStyle = `rgba(${220 + Math.random() * 30},${170 + Math.random() * 40},${90},${0.2 + Math.random() * 0.6})`;
    ctx.fillRect(x, y, 1 + Math.random() * 2, 1 + Math.random() * 4);
  }
  const t = new THREE.CanvasTexture(c);
  t.mapping = THREE.EquirectangularReflectionMapping;
  t.colorSpace = THREE.SRGBColorSpace;
  t.needsUpdate = true;
  return t;
}

export function makeSign(text: string, w = 1024, h = 256): THREE.CanvasTexture {
  const c = document.createElement("canvas");
  c.width = w;
  c.height = h;
  const ctx = c.getContext("2d")!;
  ctx.fillStyle = "#2a2c28";
  ctx.fillRect(0, 0, w, h);
  ctx.fillStyle = "#e8e0d0";
  ctx.font = `600 ${Math.floor(h * 0.42)}px "IBM Plex Sans", sans-serif`;
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  ctx.fillText(text, w / 2, h / 2);
  const t = new THREE.CanvasTexture(c);
  t.colorSpace = THREE.SRGBColorSpace;
  return t;
}

export function makeDoorPlate(num: string, title: string, extra = ""): THREE.CanvasTexture {
  const w = 256;
  const h = 176;
  const c = document.createElement("canvas");
  c.width = w;
  c.height = h;
  const ctx = c.getContext("2d")!;
  ctx.fillStyle = "#8a8070";
  ctx.fillRect(0, 0, w, h);
  ctx.fillStyle = "#ece6da";
  ctx.fillRect(4, 4, w - 8, h - 8);
  ctx.strokeStyle = "#6a5e4e";
  ctx.lineWidth = 2;
  ctx.strokeRect(8, 8, w - 16, h - 16);

  ctx.fillStyle = "#1c1814";
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  const numSize = num.length > 3 ? 36 : 42;
  ctx.font = `700 ${numSize}px "IBM Plex Sans", "Noto Sans", sans-serif`;
  ctx.fillText(num, w / 2, 42);

  ctx.strokeStyle = "#b0a494";
  ctx.lineWidth = 1;
  ctx.beginPath();
  ctx.moveTo(20, 68);
  ctx.lineTo(w - 20, 68);
  ctx.stroke();

  let size = 16;
  ctx.font = `500 ${size}px "IBM Plex Sans", "Noto Sans", sans-serif`;
  const maxW = w - 28;
  while (size > 11 && ctx.measureText(title).width > maxW) {
    size -= 1;
    ctx.font = `500 ${size}px "IBM Plex Sans", "Noto Sans", sans-serif`;
  }
  ctx.fillStyle = "#2a241c";
  ctx.fillText(title, w / 2, 88);

  ctx.fillStyle = "#f7f2ea";
  ctx.fillRect(18, 108, w - 36, 44);
  ctx.strokeStyle = "#c4b8a8";
  ctx.setLineDash([5, 4]);
  ctx.lineWidth = 1;
  ctx.strokeRect(18, 108, w - 36, 44);
  ctx.setLineDash([]);
  if (extra) {
    let eSize = 14;
    ctx.font = `400 ${eSize}px "IBM Plex Sans", "Noto Sans", sans-serif`;
    while (eSize > 10 && ctx.measureText(extra).width > maxW) {
      eSize -= 1;
      ctx.font = `400 ${eSize}px "IBM Plex Sans", "Noto Sans", sans-serif`;
    }
    ctx.fillStyle = "#1c1814";
    ctx.fillText(extra, w / 2, 130);
  }

  const plate = new THREE.CanvasTexture(c);
  plate.colorSpace = THREE.SRGBColorSpace;
  plate.anisotropy = 4;
  return plate;
}

export function makeLetterB(): THREE.CanvasTexture {
  const c = document.createElement("canvas");
  c.width = c.height = 512;
  const ctx = c.getContext("2d")!;
  ctx.clearRect(0, 0, 512, 512);
  ctx.fillStyle = "rgba(28, 32, 30, 0.55)";
  ctx.font = '700 380px "IBM Plex Serif", serif';
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  ctx.fillText("б", 256, 280);
  const t = new THREE.CanvasTexture(c);
  t.colorSpace = THREE.SRGBColorSpace;
  t.premultiplyAlpha = true;
  return t;
}

export function parquet() {
  return canvasTex(
    "parquet-hb",
    1024,
    (ctx, s) => {
      ctx.fillStyle = "#24180f";
      ctx.fillRect(0, 0, s, s);
      const pl = 72;
      const pw = 14;
      for (let row = 0; row < s / (pw * 0.7) + 4; row++) {
        for (let col = 0; col < s / (pl * 0.45) + 4; col++) {
          const even = (row + col) % 2 === 0;
          const x = col * (pl * 0.46);
          const y = row * (pw * 1.05);
          ctx.save();
          ctx.translate(x + 8, y + 8);
          ctx.rotate(even ? Math.PI / 4 : -Math.PI / 4);
          const v = 88 + ((row * 17 + col * 31) % 48);
          ctx.fillStyle = `rgb(${v},${(v * 0.64) | 0},${(v * 0.34) | 0})`;
          ctx.fillRect(-pl / 2, -pw / 2, pl, pw - 1);
          ctx.fillStyle = "rgba(28,16,8,0.32)";
          ctx.fillRect(-pl / 2, pw / 2 - 2, pl, 1.4);
          ctx.fillStyle = `rgba(210,170,100,${0.05 + ((row + col) % 3) * 0.02})`;
          ctx.fillRect(-pl / 2 + 4, -pw / 2 + 2, pl * 0.4, 2);
          ctx.restore();
        }
      }
      noise(ctx, s, 14);
    },
    4,
  );
}

export function walnut() {
  return canvasTex(
    "walnut-512",
    512,
    (ctx, s) => {
      ctx.fillStyle = "#4a301c";
      ctx.fillRect(0, 0, s, s);
      for (let y = 0; y < s; y++) {
        const wiggle = Math.sin(y * 0.07) * 6 + Math.sin(y * 0.019) * 14;
        const v = 0.04 + Math.sin(y * 0.11) * 0.03;
        ctx.fillStyle = `rgba(22,10,4,${v})`;
        ctx.fillRect(0, y, s, 1);
        ctx.fillStyle = `rgba(140,90,40,${0.03 + (y % 7 === 0 ? 0.04 : 0)})`;
        ctx.fillRect(wiggle, y, s, 1);
      }
      for (let i = 0; i < 28; i++) {
        ctx.strokeStyle = `rgba(30,16,8,${0.12 + Math.random() * 0.12})`;
        ctx.lineWidth = 0.8;
        ctx.beginPath();
        const x = Math.random() * s;
        ctx.moveTo(x, 0);
        ctx.bezierCurveTo(x + 8, s * 0.3, x - 10, s * 0.7, x + 4, s);
        ctx.stroke();
      }
      noise(ctx, s, 12);
    },
    3,
  );
}

export function damask() {
  return canvasTex(
    "damask-v2",
    512,
    (ctx, s) => {
      ctx.fillStyle = "#efe6d2";
      ctx.fillRect(0, 0, s, s);
      for (let y = 0; y < s; y++) {
        ctx.fillStyle = `rgba(180,160,120,${0.03 + (y % 2) * 0.02})`;
        ctx.fillRect(0, y, s, 1);
      }
      const cell = 64;
      for (let gy = -cell; gy < s + cell; gy += cell) {
        for (let gx = -cell; gx < s + cell; gx += cell) {
          const cx = gx + cell / 2;
          const cy = gy + cell / 2;
          ctx.strokeStyle = "rgba(160,138,96,0.22)";
          ctx.lineWidth = 1.2;
          ctx.beginPath();
          ctx.moveTo(cx, gy + 8);
          ctx.lineTo(gx + cell - 8, cy);
          ctx.lineTo(cx, gy + cell - 8);
          ctx.lineTo(gx + 8, cy);
          ctx.closePath();
          ctx.stroke();
          ctx.fillStyle = "rgba(168,142,98,0.1)";
          ctx.beginPath();
          ctx.ellipse(cx, cy, 7, 11, 0, 0, Math.PI * 2);
          ctx.fill();
          ctx.beginPath();
          ctx.ellipse(cx, cy, 11, 5, 0, 0, Math.PI * 2);
          ctx.fill();
        }
      }
      noise(ctx, s, 8);
    },
    2,
  );
}

export function tablecloth() {
  return damask();
}

export function napkin() {
  return canvasTex(
    "napkin-weave",
    256,
    (ctx, s) => {
      ctx.fillStyle = "#f4eee4";
      ctx.fillRect(0, 0, s, s);
      for (let i = 0; i < s; i += 2) {
        ctx.fillStyle = "rgba(190,178,158,0.18)";
        ctx.fillRect(i, 0, 1, s);
        ctx.fillRect(0, i, s, 1);
      }
      ctx.strokeStyle = "rgba(170,150,120,0.35)";
      ctx.lineWidth = 4;
      ctx.strokeRect(10, 10, s - 20, s - 20);
      ctx.strokeStyle = "rgba(170,150,120,0.18)";
      ctx.lineWidth = 1;
      ctx.strokeRect(16, 16, s - 32, s - 32);
      noise(ctx, s, 7);
    },
    1,
  );
}

export function velvet() {
  return canvasTex(
    "velvet-pile",
    512,
    (ctx, s) => {
      ctx.fillStyle = "#1e241e";
      ctx.fillRect(0, 0, s, s);
      for (let i = 0; i < 2800; i++) {
        const g = 38 + Math.random() * 36;
        ctx.fillStyle = `rgba(${g * 0.7},${g},${g * 0.72},0.18)`;
        ctx.fillRect(Math.random() * s, Math.random() * s, 1.5, 3 + Math.random() * 3);
      }
      const rad = ctx.createRadialGradient(s * 0.45, s * 0.35, 8, s * 0.5, s * 0.45, s * 0.7);
      rad.addColorStop(0, "rgba(90,110,80,0.16)");
      rad.addColorStop(0.55, "rgba(20,28,20,0.05)");
      rad.addColorStop(1, "rgba(6,8,6,0.28)");
      ctx.fillStyle = rad;
      ctx.fillRect(0, 0, s, s);
      noise(ctx, s, 10);
    },
    2,
  );
}

export function rug() {
  return canvasTex(
    "rug-pilot",
    512,
    (ctx, s) => {
      ctx.fillStyle = "#2a1814";
      ctx.fillRect(0, 0, s, s);
      ctx.fillStyle = "#3a2820";
      ctx.fillRect(28, 28, s - 56, s - 56);
      ctx.strokeStyle = "#6a5038";
      ctx.lineWidth = 8;
      ctx.strokeRect(36, 36, s - 72, s - 72);
      ctx.strokeStyle = "#4a3428";
      ctx.lineWidth = 3;
      ctx.strokeRect(48, 48, s - 96, s - 96);
      ctx.fillStyle = "rgba(90,60,40,0.35)";
      ctx.beginPath();
      ctx.ellipse(s / 2, s / 2, 70, 48, 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.strokeStyle = "rgba(140,100,60,0.4)";
      ctx.lineWidth = 2;
      ctx.stroke();
      for (let i = 0; i < 40; i++) {
        ctx.fillStyle = `rgba(20,10,8,${0.08 + Math.random() * 0.1})`;
        ctx.fillRect(Math.random() * s, Math.random() * s, 18, 3);
      }
      noise(ctx, s, 14);
    },
    1,
  );
}

export function china() {
  return canvasTex(
    "china-gold",
    256,
    (ctx, s) => {
      ctx.fillStyle = "#f6f1e8";
      ctx.fillRect(0, 0, s, s);
      const g = ctx.createRadialGradient(s / 2, s / 2, 20, s / 2, s / 2, s * 0.48);
      g.addColorStop(0, "#fffaf2");
      g.addColorStop(0.72, "#f0ebe2");
      g.addColorStop(0.86, "#c4a056");
      g.addColorStop(0.9, "#f4efe6");
      g.addColorStop(1, "#d8c8a0");
      ctx.fillStyle = g;
      ctx.beginPath();
      ctx.arc(s / 2, s / 2, s * 0.48, 0, Math.PI * 2);
      ctx.fill();
      ctx.strokeStyle = "rgba(180,140,70,0.55)";
      ctx.lineWidth = 3;
      ctx.beginPath();
      ctx.arc(s / 2, s / 2, s * 0.42, 0, Math.PI * 2);
      ctx.stroke();
      noise(ctx, s, 6);
    },
    1,
  );
}

export function silver() {
  return canvasTex(
    "silver-brushed",
    256,
    (ctx, s) => {
      ctx.fillStyle = "#b8bec4";
      ctx.fillRect(0, 0, s, s);
      for (let y = 0; y < s; y++) {
        const a = 0.04 + Math.sin(y * 0.4) * 0.04;
        ctx.fillStyle = `rgba(255,255,255,${a})`;
        ctx.fillRect(0, y, s, 1);
        ctx.fillStyle = `rgba(40,48,56,${a * 0.7})`;
        ctx.fillRect(0, y + 0.5, s, 0.5);
      }
      ctx.fillStyle = "rgba(220,230,240,0.12)";
      ctx.fillRect(s * 0.3, 0, 10, s);
      noise(ctx, s, 10);
    },
    2,
  );
}

export function tomato() {
  return canvasTex(
    "tomato-skin",
    256,
    (ctx, s) => {
      const g = ctx.createRadialGradient(s * 0.42, s * 0.38, 8, s * 0.5, s * 0.5, s * 0.6);
      g.addColorStop(0, "#e86040");
      g.addColorStop(0.35, "#c43824");
      g.addColorStop(0.75, "#9a2418");
      g.addColorStop(1, "#6a1810");
      ctx.fillStyle = g;
      ctx.fillRect(0, 0, s, s);
      ctx.strokeStyle = "rgba(80,16,10,0.25)";
      ctx.lineWidth = 2;
      for (let i = 0; i < 6; i++) {
        ctx.beginPath();
        ctx.moveTo(s / 2, s / 2);
        ctx.quadraticCurveTo(s * (0.2 + i * 0.12), s * 0.15, s / 2 + Math.cos(i) * 20, 4);
        ctx.stroke();
      }
      ctx.fillStyle = "rgba(255,180,120,0.12)";
      ctx.beginPath();
      ctx.ellipse(s * 0.38, s * 0.32, 28, 16, -0.4, 0, Math.PI * 2);
      ctx.fill();
      noise(ctx, s, 10);
    },
    1,
  );
}

export function kitchenTile() {
  return canvasTex(
    "kitchen-tile",
    512,
    (ctx, s) => {
      ctx.fillStyle = "#5c5a56";
      ctx.fillRect(0, 0, s, s);
      const t = 64;
      for (let y = 0, row = 0; y < s; y += t, row++) {
        for (let x = 0, col = 0; x < s; x += t, col++) {
          const cream = 208 + Math.random() * 18;
          const sage = (row + col) % 5 === 0;
          ctx.fillStyle = sage
            ? `rgb(${140 + Math.random() * 12},${148 + Math.random() * 10},${132})`
            : `rgb(${cream},${cream - 10},${cream - 22})`;
          ctx.fillRect(x + 2, y + 2, t - 4, t - 4);
          ctx.fillStyle = "rgba(255,255,255,0.1)";
          ctx.fillRect(x + 4, y + 4, t * 0.4, 3);
        }
      }
      noise(ctx, s, 10);
    },
    4,
  );
}

export function copper() {
  return canvasTex(
    "copper",
    128,
    (ctx, s) => {
      ctx.fillStyle = "#b56a32";
      ctx.fillRect(0, 0, s, s);
      for (let y = 0; y < s; y++) {
        ctx.fillStyle = `rgba(80,28,8,${0.05 + Math.sin(y * 0.35) * 0.05})`;
        ctx.fillRect(0, y, s, 1);
      }
      ctx.fillStyle = "rgba(230,180,90,0.12)";
      ctx.fillRect(s * 0.2, 0, 6, s);
      noise(ctx, s, 14);
    },
    2,
  );
}

export function disposeTextures() {
  for (const t of cache.values()) t.dispose();
  cache.clear();
}
