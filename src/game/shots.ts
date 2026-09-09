/** Static pole-cam establishing shots. Positions are three.js (x, y-up, z). */
export type ShotId = "gate" | "gate-car" | "gate-taxi";

export type ShotDef = {
  id: ShotId;
  name: string;
  hint: string;
  /** Pole base on the ground (visible in the set). */
  pole: [number, number, number];
  poleH: number;
  pos: [number, number, number];
  look: [number, number, number];
  fov: number;
  /** Which vehicles stay in this frame. */
  cars: "none" | "car" | "taxi" | "all";
};

export const SHOTS: ShotDef[] = [
  {
    id: "gate",
    name: "Ворота",
    hint: "Пол · пустые ворота, ось аллеи",
    // Pole just south of the east palisade — high 3/4 through the empty opening.
    pole: [9.6, 0, 97.4],
    poleH: 10.8,
    pos: [8.15, 10.55, 96.2],
    look: [0.15, 0.85, 78.4],
    fov: 32,
    cars: "none",
  },
  {
    id: "gate-car",
    name: "Машина",
    hint: "Пол · седан у шлагбаума",
    // Pole west of KPP, looking down 3/4 onto the dark sedan.
    pole: [-15.6, 0, 81.8],
    poleH: 7.4,
    pos: [-14.2, 7.15, 82.9],
    look: [-3.05, 0.38, 74.1],
    fov: 31,
    cars: "car",
  },
  {
    id: "gate-taxi",
    name: "Такси",
    hint: "Пол · такси на въезде",
    // Pole east of the zebra, looking down onto the Volga at the barrier.
    pole: [14.8, 0, 89.6],
    poleH: 7.9,
    pos: [13.35, 7.65, 88.2],
    look: [3.55, 0.42, 78.6],
    fov: 30,
    cars: "taxi",
  },
];

export const SHOT_BY_ID = Object.fromEntries(SHOTS.map((s) => [s.id, s])) as Record<ShotId, ShotDef>;
