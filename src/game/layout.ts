import { CATALOG, SLOT_ID } from "./catalog";
import type { CorridorDef, FloorId, Rect, RoomDef } from "./types";

const FLOORS: Exclude<FloorId, "R">[] = ["B1", "F1", "F2", "F3", "F4", "F5", "F6"];

function rid(floor: FloorId, slot: string): string {
  const mapped = SLOT_ID[slot]?.[floor];
  if (mapped) return `${floor}-${mapped}`;
  return `${floor}-${slot}`;
}

function room(
  floor: FloorId,
  slot: string,
  x0: number,
  x1: number,
  y0: number,
  y1: number,
): RoomDef | null {
  if (floor === "R") return null;
  const meta = CATALOG[floor][slot];
  if (!meta) return null;
  return {
    id: rid(floor, slot),
    floor,
    name: meta.name,
    type: meta.type,
    x0,
    x1,
    y0,
    y1,
  };
}

/** Perimeter 6.8 m rooms, west cluster. */
const WX = [-47.4, -40.6, -40.4, -33.6, -33.4, -26.6, -26.4, -19.6];
/** East cluster. */
const EX = [19.2, 26.0, 26.2, 33.0, 33.2, 40.0, 40.2, 47.0];

function addPerimeter(floor: Exclude<FloorId, "R">, out: RoomDef[]) {
  const ny0 = 25.0;
  const ny1 = 35.2;
  const sy0 = -35.2;
  const sy1 = -25.0;
  const nw = ["NW0", "NW1", "NW2", "NW3"] as const;
  const ne = ["NE0", "NE1", "NE2", "NE3"] as const;
  const sw = ["SW0", "SW1", "SW2", "SW3"] as const;
  const se = ["SE0", "SE1", "SE2", "SE3"] as const;
  for (let i = 0; i < 4; i++) {
    const x0 = WX[i * 2]!;
    const x1 = WX[i * 2 + 1]!;
    const e0 = EX[i * 2]!;
    const e1 = EX[i * 2 + 1]!;
    push(out, room(floor, nw[i]!, x0, x1, ny0, ny1));
    push(out, room(floor, ne[i]!, e0, e1, ny0, ny1));
    push(out, room(floor, sw[i]!, x0, x1, sy0, sy1));
    push(out, room(floor, se[i]!, e0, e1, sy0, sy1));
  }
  push(out, room(floor, "STA", -19.4, -8.2, ny0, ny1));
  push(out, room(floor, "LIFT", -8.0, 7.6, ny0, ny1));
  push(out, room(floor, "STB", 7.8, 19.0, ny0, ny1));
  push(out, room(floor, "S1", -19.4, -2.2, sy0, sy1));
  push(out, room(floor, "S2", 2.2, 19.4, sy0, sy1));
}

function addInner(floor: Exclude<FloorId, "R">, out: RoomDef[]) {
  const iny0 = 14.8;
  const iny1 = 22.0;
  const isy0 = -22.0;
  const isy1 = -14.8;
  push(out, room(floor, "IN01", -47.4, -33.2, iny0, iny1));
  push(out, room(floor, "IN02", -29.4, -18.4, iny0, iny1));
  push(out, room(floor, "IN03", -18.0, -2.2, iny0, iny1));
  push(out, room(floor, "IN04", 2.2, 18.0, iny0, iny1));
  push(out, room(floor, "IN05", 18.4, 29.4, iny0, iny1));
  push(out, room(floor, "IN06", 33.2, 47.4, iny0, iny1));
  push(out, room(floor, "IN07", -47.4, -33.2, isy0, isy1));
  push(out, room(floor, "IN08", -29.4, -18.4, isy0, isy1));
  push(out, room(floor, "IN09", -18.0, -2.2, isy0, isy1));
  push(out, room(floor, "IN10", 2.2, 18.0, isy0, isy1));
  push(out, room(floor, "IN11", 18.4, 29.4, isy0, isy1));
  push(out, room(floor, "IN12", 33.2, 47.4, isy0, isy1));

  // West/east stacks beside courtyard Y -14..14
  const y3: [number, number] = [6.4, 14.0];
  const y2: [number, number] = [-2.0, 6.2];
  const y1: [number, number] = [-10.4, -2.2];
  push(out, room(floor, "WO3", -47.4, -33.0, y3[0], y3[1]));
  push(out, room(floor, "WO2", -47.4, -33.0, y2[0], y2[1]));
  push(out, room(floor, "WO1", -47.4, -33.0, y1[0], y1[1]));
  push(out, room(floor, "WI3", -29.4, -18.8, y3[0], y3[1]));
  push(out, room(floor, "WI2", -29.4, -18.8, y2[0], y2[1]));
  push(out, room(floor, "WI1", -29.4, -18.8, y1[0], y1[1]));
  push(out, room(floor, "EI3", 18.8, 29.4, y3[0], y3[1]));
  push(out, room(floor, "EI2", 18.8, 29.4, y2[0], y2[1]));
  push(out, room(floor, "EI1", 18.8, 29.4, y1[0], y1[1]));
  push(out, room(floor, "EO3", 33.0, 47.4, y3[0], y3[1]));
  push(out, room(floor, "EO2", 33.0, 47.4, y2[0], y2[1]));
  push(out, room(floor, "EO1", 33.0, 47.4, y1[0], y1[1]));
}

function addWings(floor: Exclude<FloorId, "R">, out: RoomDef[]) {
  if (floor === "B1") {
    push(out, room(floor, "WW2", -65.4, -48.6, -6.5, 0.2));
    push(out, room(floor, "WW1", -65.4, -48.6, -16.2, -9.5));
    push(out, room(floor, "C1", -17.8, -2.2, -13.8, 0.0));
    push(out, room(floor, "C2", -17.8, -2.2, 0.2, 13.8));
    push(out, room(floor, "C3", 2.2, 17.8, -13.8, 0.0));
    push(out, room(floor, "C4", 2.2, 17.8, 0.2, 13.8));
    return;
  }
  push(out, room(floor, "WW2", -61.4, -48.6, 6.0, 16.2));
  push(out, room(floor, "WW1", -61.4, -48.6, -6.2, 3.0));
  push(out, room(floor, "EW2", 48.6, 61.4, 6.0, 16.2));
  push(out, room(floor, "EW1", 48.6, 61.4, -6.2, 3.0));
  push(out, room(floor, "STC", -6.2, -1.8, -44.4, -36.2));
  push(out, room(floor, "LFTS", 1.8, 6.2, -44.4, -36.2));
}

function push(out: RoomDef[], r: RoomDef | null) {
  if (r) out.push(r);
}

function corridorsFor(floor: FloorId): CorridorDef[] {
  const ring: CorridorDef[] = [
    { id: `${floor}-CN`, floor, name: "Коридор север", x0: -47.4, x1: 47.4, y0: 22, y1: 25 },
    { id: `${floor}-CS`, floor, name: "Коридор юг", x0: -47.4, x1: 47.4, y0: -25, y1: -22 },
    { id: `${floor}-CW`, floor, name: "Коридор запад", x0: -33.0, x1: -29.4, y0: -22, y1: 22 },
    { id: `${floor}-CE`, floor, name: "Коридор восток", x0: 29.4, x1: 33.0, y0: -22, y1: 22 },
    { id: `${floor}-AN`, floor, name: "Подход к двору С", x0: -2.0, x1: 2.0, y0: 14, y1: 22 },
    { id: `${floor}-AS`, floor, name: "Подход к двору Ю", x0: -2.0, x1: 2.0, y0: -22, y1: -14 },
  ];
  if (floor === "B1") {
    ring.push(
      { id: "B1-BC", floor, name: "Ось подвала", x0: -2, x1: 2, y0: -22, y1: 22 },
      { id: "B1-BS", floor, name: "Сервисный проход", x0: -65.4, x1: -33, y0: -9.5, y1: -6.5 },
    );
  } else if (floor !== "R") {
    ring.push(
      { id: `${floor}-C0`, floor, name: "Главный вход", x0: -1.8, x1: 1.8, y0: -44.4, y1: -25 },
      { id: `${floor}-WX`, floor, name: "Западное крыло", x0: -61.4, x1: -33, y0: 3, y1: 6 },
      { id: `${floor}-EX`, floor, name: "Восточное крыло", x0: 33, x1: 61.4, y0: 3, y1: 6 },
    );
  }
  if (floor === "F1") {
    ring.push({
      id: "F1-COURT",
      floor,
      name: "Световой двор",
      x0: -18,
      x1: 18,
      y0: -14,
      y1: 14,
    });
    ring.push(
      { id: "F1-GATE", floor, name: "Ворота", x0: -14, x1: 14, y0: -88, y1: -74 },
      { id: "F1-KPP", floor, name: "КПП", x0: -18, x1: -6, y0: -82, y1: -74 },
      { id: "F1-DRIVE", floor, name: "Аллея", x0: -7.2, x1: 7.2, y0: -78, y1: -45 },
      { id: "F1-PLAZA", floor, name: "Площадь у входа", x0: -18, x1: 18, y0: -52, y1: -43 },
      { id: "F1-SOUTH", floor, name: "Южный фасад", x0: -46, x1: 46, y0: -48, y1: -35.5 },
      { id: "F1-PARK", floor, name: "Парковка", x0: 18, x1: 48, y0: -72, y1: -46 },
    );
  }
  if (floor === "R") {
    return [
      { id: "R-DECK", floor, name: "Кровля", x0: -48, x1: 48, y0: -36, y1: 36 },
    ];
  }
  return ring;
}

let _rooms: RoomDef[] | null = null;
let _corridors: CorridorDef[] | null = null;

export function allRooms(): RoomDef[] {
  if (_rooms) return _rooms;
  const out: RoomDef[] = [];
  for (const f of FLOORS) {
    addPerimeter(f, out);
    addInner(f, out);
    addWings(f, out);
  }
  _rooms = out;
  return out;
}

export function allCorridors(): CorridorDef[] {
  if (_corridors) return _corridors;
  const out: CorridorDef[] = [];
  for (const f of FLOORS) out.push(...corridorsFor(f));
  out.push(...corridorsFor("R"));
  _corridors = out;
  return out;
}

export function roomsOn(floor: FloorId): RoomDef[] {
  return allRooms().filter((r) => r.floor === floor);
}

export function corridorsOn(floor: FloorId): CorridorDef[] {
  return allCorridors().filter((c) => c.floor === floor);
}

export function walkables(floor: FloorId): Rect[] {
  if (floor === "R") {
    return [
      { x0: -48, x1: -18, y0: -36, y1: 36 },
      { x0: 18, x1: 48, y0: -36, y1: 36 },
      { x0: -18, x1: 18, y0: 14, y1: 36 },
      { x0: -18, x1: 18, y0: -36, y1: -14 },
      { x0: -8, x1: 8, y0: -44, y1: -36 },
    ];
  }
  const list: Rect[] = [];
  for (const r of roomsOn(floor)) list.push(r);
  for (const c of corridorsOn(floor)) list.push(c);
  return list;
}

/** Cars, booth — bible XY. */
const BLOCKERS: Rect[] = [
  { x0: -5.6, x1: -0.7, y0: -76.2, y1: -70.8 },
  { x0: 2.1, x1: 6.3, y0: -82.0, y1: -76.6 },
  { x0: -14.0, x1: -8.4, y0: -80.4, y1: -76.4 },
];

export const DOOR_GAP = 1.2;
export const WALL_TH = 0.28;

type Edge = "N" | "S" | "E" | "W";

export function doorEdge(r: RoomDef): Edge {
  const cors = corridorsOn(r.floor);
  let best: Edge = "S";
  let score = -1;
  const tryEdge = (edge: Edge, x0: number, x1: number, y0: number, y1: number) => {
    let s = 0;
    for (const c of cors) {
      const ox = Math.max(0, Math.min(x1, c.x1) - Math.max(x0, c.x0));
      const oy = Math.max(0, Math.min(y1, c.y1) - Math.max(y0, c.y0));
      s = Math.max(s, ox * oy);
    }
    if (s > score) {
      score = s;
      best = edge;
    }
  };
  tryEdge("N", r.x0, r.x1, r.y1 - 0.2, r.y1 + 1.2);
  tryEdge("S", r.x0, r.x1, r.y0 - 1.2, r.y0 + 0.2);
  tryEdge("E", r.x1 - 0.2, r.x1 + 1.2, r.y0, r.y1);
  tryEdge("W", r.x0 - 1.2, r.x0 + 0.2, r.y0, r.y1);
  return best;
}

function pushSeg(out: Rect[], x0: number, x1: number, y0: number, y1: number) {
  if (x1 - x0 < 0.08 || y1 - y0 < 0.08) return;
  out.push({ x0, x1, y0, y1 });
}

function wallOnEdge(out: Rect[], r: RoomDef, edge: Edge, gapAt: number | null) {
  const h = WALL_TH / 2;
  const g = DOOR_GAP / 2;
  if (edge === "N") {
    const y0 = r.y1 - h;
    const y1 = r.y1 + h;
    if (gapAt == null) pushSeg(out, r.x0, r.x1, y0, y1);
    else {
      pushSeg(out, r.x0, gapAt - g, y0, y1);
      pushSeg(out, gapAt + g, r.x1, y0, y1);
    }
  } else if (edge === "S") {
    const y0 = r.y0 - h;
    const y1 = r.y0 + h;
    if (gapAt == null) pushSeg(out, r.x0, r.x1, y0, y1);
    else {
      pushSeg(out, r.x0, gapAt - g, y0, y1);
      pushSeg(out, gapAt + g, r.x1, y0, y1);
    }
  } else if (edge === "E") {
    const x0 = r.x1 - h;
    const x1 = r.x1 + h;
    if (gapAt == null) pushSeg(out, x0, x1, r.y0, r.y1);
    else {
      pushSeg(out, x0, x1, r.y0, gapAt - g);
      pushSeg(out, x0, x1, gapAt + g, r.y1);
    }
  } else {
    const x0 = r.x0 - h;
    const x1 = r.x0 + h;
    if (gapAt == null) pushSeg(out, x0, x1, r.y0, r.y1);
    else {
      pushSeg(out, x0, x1, r.y0, gapAt - g);
      pushSeg(out, x0, x1, gapAt + g, r.y1);
    }
  }
}

function portalOf(r: RoomDef, edge: Edge): Rect {
  const mx = (r.x0 + r.x1) / 2;
  const my = (r.y0 + r.y1) / 2;
  const g = DOOR_GAP / 2;
  const into = 0.72;
  if (edge === "N") return { x0: mx - g, x1: mx + g, y0: r.y1 - 0.22, y1: r.y1 + into };
  if (edge === "S") return { x0: mx - g, x1: mx + g, y0: r.y0 - into, y1: r.y0 + 0.22 };
  if (edge === "E") return { x0: r.x1 - 0.22, x1: r.x1 + into, y0: my - g, y1: my + g };
  return { x0: r.x0 - into, x1: r.x0 + 0.22, y0: my - g, y1: my + g };
}

const _walls = new Map<FloorId, Rect[]>();
const _ports = new Map<FloorId, Rect[]>();

function colliders(floor: FloorId) {
  if (_walls.has(floor)) return;
  const walls: Rect[] = [];
  const ports: Rect[] = [];
  if (floor !== "R") {
    for (const r of roomsOn(floor)) {
      const d = doorEdge(r);
      const mx = (r.x0 + r.x1) / 2;
      const my = (r.y0 + r.y1) / 2;
      for (const e of ["N", "S", "E", "W"] as const) {
        wallOnEdge(walls, r, e, e === d ? (e === "N" || e === "S" ? mx : my) : null);
      }
      ports.push(portalOf(r, d));
    }
  }
  _walls.set(floor, walls);
  _ports.set(floor, ports);
}

export function wallsOn(floor: FloorId): Rect[] {
  colliders(floor);
  return _walls.get(floor) ?? [];
}

export function portalsOn(floor: FloorId): Rect[] {
  colliders(floor);
  return _ports.get(floor) ?? [];
}

function circleHits(x: number, y: number, rad: number, r: Rect): boolean {
  const qx = Math.max(r.x0, Math.min(x, r.x1));
  const qy = Math.max(r.y0, Math.min(y, r.y1));
  const dx = x - qx;
  const dy = y - qy;
  return dx * dx + dy * dy < rad * rad;
}

export function isOutside(floor: FloorId, x: number, y: number): boolean {
  if (floor !== "F1") return false;
  return y < -36.5;
}

export function contains(rect: Rect, x: number, y: number, pad = 0): boolean {
  return x >= rect.x0 + pad && x <= rect.x1 - pad && y >= rect.y0 + pad && y <= rect.y1 - pad;
}

export function roomAt(floor: FloorId, x: number, y: number): RoomDef | null {
  for (const r of roomsOn(floor)) {
    if (contains(r, x, y, 0.05)) return r;
  }
  return null;
}

export function corridorAt(floor: FloorId, x: number, y: number): CorridorDef | null {
  for (const c of corridorsOn(floor)) {
    if (contains(c, x, y, 0.02)) return c;
  }
  return null;
}

export function solidsOn(floor: FloorId): Rect[] {
  return BLOCKERS.concat(wallsOn(floor));
}

export function inVolume(floor: FloorId, x: number, y: number): boolean {
  for (const r of roomsOn(floor)) {
    if (contains(r, x, y, 0)) return true;
  }
  for (const c of corridorsOn(floor)) {
    if (contains(c, x, y, 0)) return true;
  }
  for (const p of portalsOn(floor)) {
    if (contains(p, x, y, 0)) return true;
  }
  if (floor === "R") {
    const inCourt = x > -18 && x < 18 && y > -14 && y < 14;
    const inDeck = x > -50 && x < 50 && y > -38 && y < 38;
    return inDeck && !inCourt;
  }
  return false;
}

export function hitsSolid(floor: FloorId, x: number, y: number, rad: number): boolean {
  for (const s of solidsOn(floor)) {
    if (circleHits(x, y, rad, s)) return true;
  }
  return false;
}

export function isWalkable(floor: FloorId, x: number, y: number, pad = 0.28): boolean {
  if (hitsSolid(floor, x, y, pad)) return false;
  return inVolume(floor, x, y);
}

export function cx(r: Rect): number {
  return (r.x0 + r.x1) / 2;
}
export function cy(r: Rect): number {
  return (r.y0 + r.y1) / 2;
}
export function rw(r: Rect): number {
  return r.x1 - r.x0;
}
export function rd(r: Rect): number {
  return r.y1 - r.y0;
}

/** Bible (X,Y) → three (x, z). */
export function toThree(x: number, y: number): { x: number; z: number } {
  return { x, z: -y };
}
export function toBible(x: number, z: number): { x: number; y: number } {
  return { x, y: -z };
}

export const SPAWN = { floor: "F1" as FloorId, x: 0, y: -80, yaw: 0 };
export const SPAWN_DOOR = { x: 0, y: -40.5, yaw: 0 };

export function coreRooms(floor: FloorId): RoomDef[] {
  return roomsOn(floor).filter((r) => r.type === "CORE");
}
