import { PLAYER_RADIUS } from "./constants";
import { canStand } from "./layout";
import type { FloorId } from "./types";

/**
 * Occupancy move: never accept a pose inside a wall.
 * Thin-wall depenetrate was teleporting the capsule through partitions.
 */
export const CollisionFlags = {
  None: 0,
  Sides: 1,
} as const;

const STEP = 0.04;
const NUDGE = [
  [1, 0],
  [-1, 0],
  [0, 1],
  [0, -1],
  [1, 1],
  [-1, 1],
  [1, -1],
  [-1, -1],
] as const;

function nudge(floor: FloorId, x: number, y: number) {
  if (canStand(floor, x, y, PLAYER_RADIUS)) return { x, y };
  for (let d = 0.08; d <= 1.4; d += 0.08) {
    for (const [ax, ay] of NUDGE) {
      const nx = x + ax * d;
      const ny = y + ay * d;
      if (canStand(floor, nx, ny, PLAYER_RADIUS)) return { x: nx, y: ny };
    }
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
  const start = nudge(floor, x, y);
  let px = start.x;
  let py = start.y;
  const dist = Math.hypot(dx, dy);
  const n = Math.max(1, Math.ceil(dist / STEP));
  const sx = dx / n;
  const sy = dy / n;
  let flags = CollisionFlags.None;
  for (let i = 0; i < n; i++) {
    const nx = px + sx;
    const ny = py + sy;
    if (canStand(floor, nx, ny, PLAYER_RADIUS)) {
      px = nx;
      py = ny;
      continue;
    }
    flags |= CollisionFlags.Sides;
    const xOk = canStand(floor, nx, py, PLAYER_RADIUS);
    const yOk = canStand(floor, px, ny, PLAYER_RADIUS);
    if (xOk) px = nx;
    if (yOk) py = ny;
  }
  return { x: px, y: py, flags };
}
