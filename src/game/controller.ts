import { CC_MAX_BOUNCES, CC_MIN_MOVE, CC_SKIN, PLAYER_RADIUS } from "./constants";
import { inVolume, solidsOn } from "./layout";
import type { FloorId, Rect } from "./types";

/**
 * Kinematic character move, Unity CharacterController.Move canon:
 * capsule (2D slice), skin width, depenetrate, swept hit, slide, bounce cap.
 * Default layer = solids. Portals are triggers (volume), not colliders.
 */
export const CollisionFlags = {
  None: 0,
  Sides: 1,
} as const;

type Hit = { t: number; nx: number; ny: number };

function closest(px: number, py: number, r: Rect) {
  return {
    x: Math.max(r.x0, Math.min(px, r.x1)),
    y: Math.max(r.y0, Math.min(py, r.y1)),
  };
}

function overlap(px: number, py: number, rad: number, r: Rect): { nx: number; ny: number; depth: number } | null {
  const q = closest(px, py, r);
  const dx = px - q.x;
  const dy = py - q.y;
  const d2 = dx * dx + dy * dy;
  if (d2 > 1e-10) {
    const d = Math.sqrt(d2);
    if (d >= rad) return null;
    return { nx: dx / d, ny: dy / d, depth: rad - d };
  }
  const left = px - r.x0;
  const right = r.x1 - px;
  const down = py - r.y0;
  const up = r.y1 - py;
  const m = Math.min(left, right, down, up);
  if (m === left) return { nx: -1, ny: 0, depth: rad + left };
  if (m === right) return { nx: 1, ny: 0, depth: rad + right };
  if (m === down) return { nx: 0, ny: -1, depth: rad + down };
  return { nx: 0, ny: 1, depth: rad + up };
}

function sweep(ox: number, oy: number, dx: number, dy: number, rad: number, r: Rect): Hit | null {
  const x0 = r.x0 - rad;
  const x1 = r.x1 + rad;
  const y0 = r.y0 - rad;
  const y1 = r.y1 + rad;
  if (ox > x0 && ox < x1 && oy > y0 && oy < y1) return { t: 0, nx: 0, ny: 0 };

  let tmin = 0;
  let tmax = 1;
  let nx = 0;
  let ny = 0;

  if (Math.abs(dx) < 1e-9) {
    if (ox <= x0 || ox >= x1) return null;
  } else {
    const t1 = (x0 - ox) / dx;
    const t2 = (x1 - ox) / dx;
    const enter = Math.min(t1, t2);
    const exit = Math.max(t1, t2);
    if (enter > tmin) {
      tmin = enter;
      nx = t1 < t2 ? -1 : 1;
      ny = 0;
    }
    tmax = Math.min(tmax, exit);
    if (tmax < tmin) return null;
  }

  if (Math.abs(dy) < 1e-9) {
    if (oy <= y0 || oy >= y1) return null;
  } else {
    const t1 = (y0 - oy) / dy;
    const t2 = (y1 - oy) / dy;
    const enter = Math.min(t1, t2);
    const exit = Math.max(t1, t2);
    if (enter > tmin) {
      tmin = enter;
      nx = 0;
      ny = t1 < t2 ? -1 : 1;
    }
    tmax = Math.min(tmax, exit);
    if (tmax < tmin) return null;
  }

  if (tmin < 0 || tmin > 1) return null;
  return { t: tmin, nx, ny };
}

function firstHit(ox: number, oy: number, dx: number, dy: number, rad: number, solids: Rect[]): Hit | null {
  let best: Hit | null = null;
  for (const s of solids) {
    const h = sweep(ox, oy, dx, dy, rad, s);
    if (!h || h.t < 1e-6) continue;
    if (!best || h.t < best.t) best = h;
  }
  return best;
}

function depenetrate(px: number, py: number, rad: number, solids: Rect[]) {
  let x = px;
  let y = py;
  for (let i = 0; i < 4; i++) {
    let pushed = false;
    for (const s of solids) {
      const o = overlap(x, y, rad, s);
      if (!o) continue;
      x += o.nx * (o.depth + 1e-4);
      y += o.ny * (o.depth + 1e-4);
      pushed = true;
    }
    if (!pushed) break;
  }
  return { x, y };
}

export function moveCharacter(
  floor: FloorId,
  x: number,
  y: number,
  dx: number,
  dy: number,
): { x: number; y: number; flags: number } {
  const testR = Math.max(0.08, PLAYER_RADIUS - CC_SKIN);
  const solids = solidsOn(floor);
  const start = depenetrate(x, y, testR, solids);
  let px = start.x;
  let py = start.y;
  if (!inVolume(floor, px, py) && inVolume(floor, x, y)) {
    px = x;
    py = y;
  }

  let remx = dx;
  let remy = dy;
  let flags = CollisionFlags.None;
  const min2 = CC_MIN_MOVE * CC_MIN_MOVE;

  for (let b = 0; b < CC_MAX_BOUNCES; b++) {
    if (remx * remx + remy * remy < min2) break;
    const hit = firstHit(px, py, remx, remy, testR, solids);
    if (!hit) {
      const nx = px + remx;
      const ny = py + remy;
      if (inVolume(floor, nx, ny)) {
        px = nx;
        py = ny;
      }
      break;
    }
    const t = Math.max(0, hit.t - 1e-4);
    const mx = px + remx * t;
    const my = py + remy * t;
    if (inVolume(floor, mx, my)) {
      px = mx;
      py = my;
    }
    flags |= CollisionFlags.Sides;
    const rest = 1 - t;
    remx *= rest;
    remy *= rest;
    const d = remx * hit.nx + remy * hit.ny;
    remx -= hit.nx * d;
    remy -= hit.ny * d;
  }

  if (!inVolume(floor, px, py) && inVolume(floor, x, y)) return { x, y, flags };
  return { x: px, y: py, flags };
}
