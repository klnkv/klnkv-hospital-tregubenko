import type { FloorId, RoomType } from "./types";

export const APP_NAME = "Больница №6";
export const APP_TAG = "LAST RESORT TOWN";
export const APP_LINE = "Город, который помнит.";

/** Bible metres: X east, Y north, Z up. Three.js: x=X, y=Z, z=-Y. */
export const FLOOR_Z: Record<FloorId, number> = {
  B1: -3.4,
  F1: 0,
  F2: 3.6,
  F3: 7.2,
  F4: 10.8,
  F5: 14.4,
  F6: 18.0,
  R: 21.6,
};

export const FLOOR_ORDER: FloorId[] = ["R", "F6", "F5", "F4", "F3", "F2", "F1", "B1"];

export const FLOOR_LABEL: Record<FloorId, string> = {
  R: "Кровля",
  F6: "F6 · Лаборатории",
  F5: "F5 · Администрация",
  F4: "F4 · Психиатрия",
  F3: "F3 · Хирургия",
  F2: "F2 · Стационар",
  F1: "F1 · Приём",
  B1: "B1 · Подвал",
};

export const FLOOR_STEP = 3.6;
export const CLEAR_H: Record<FloorId, number> = {
  B1: 3.16,
  F1: 3.36,
  F2: 3.36,
  F3: 3.36,
  F4: 3.36,
  F5: 3.36,
  F6: 3.36,
  R: 0.4,
};

export const MAIN_W = 96;
export const MAIN_D = 72;
export const COURT_W = 36;
export const COURT_D = 28;
export const WALL_EXT = 0.6;
export const WALL_INT = 0.2;
export const NEW_WING_X = 18;

export const EYE = 1.6;
export const PLAYER_RADIUS = 0.32;
/** Unity CharacterController: skin ≥ 10% of radius, else the capsule jams in cracks. */
export const CC_SKIN = 0.04;
export const CC_MIN_MOVE = 0.0001;
export const CC_MAX_BOUNCES = 5;
export const CC_FIXED_DT = 1 / 60;
export const WALK_SPEED = 3.4;
export const SPRINT_SPEED = 6.2;

export const TYPE_COLOR: Record<RoomType, string> = {
  WARD: "#6e7d6a",
  OR: "#4d6b73",
  ICU: "#3f5c68",
  OFFICE: "#8a7a62",
  LOBBY: "#9a8a70",
  TECH: "#5a5e62",
  LAB: "#5d7380",
  CT: "#466070",
  WC: "#6a6e68",
  ARCHIVE: "#6b5344",
  CONF: "#7a6a55",
  POST: "#8b6a4e",
  KITCHEN: "#6a6560",
  DINING: "#6e5a42",
  MORGUE: "#3a4548",
  CORE: "#4a4e4c",
};

export const TYPE_LABEL: Record<RoomType, string> = {
  WARD: "Палата",
  OR: "Операционная / процедура",
  ICU: "Интенсивная терапия",
  OFFICE: "Кабинет",
  LOBBY: "Холл / приём",
  TECH: "Техническое",
  LAB: "Лаборатория",
  CT: "КТ / рентген",
  WC: "Санузел",
  ARCHIVE: "Архив",
  CONF: "Конференц / терапия",
  POST: "Пост медсестры",
  KITCHEN: "Пищеблок",
  DINING: "Столовая",
  MORGUE: "Морг",
  CORE: "Лестница / лифт",
};

/** Public files stay correct on `/` (preview) and on GitHub Pages (`/repo/`). */
export function publicUrl(path: string): string {
  const base = import.meta.env.BASE_URL ?? "/";
  const trimmed = path.replace(/^\//, "");
  return `${base}${trimmed}`;
}

export const FLOOR_PLAN_IMG: Partial<Record<FloorId, string>> = {
  B1: publicUrl("maps/F2ACA74B-5834-4A4F-B470-F2A5C29142E1.jpg"),
  F1: publicUrl("maps/790362A7-FB6B-4288-9E3C-325BEC229886.jpg"),
  F2: publicUrl("maps/EDE2C58D-FA73-47AD-9B2D-E135C1E90820.jpg"),
  F3: publicUrl("maps/AB16D0FD-2F27-4BC2-BFC4-10FB4CFB8913.jpg"),
  F4: publicUrl("maps/A9BB413F-F260-4BCD-84E8-D88340D5618B.jpg"),
  F5: publicUrl("maps/AED2E0EC-01EA-4155-A29D-66A446D6AE27.jpg"),
  F6: publicUrl("maps/39A2C3D5-0B3B-435E-B430-D032E89D5FF6.jpg"),
  R: publicUrl("maps/2CFB8CB9-4DFD-45E5-B8F3-7D7BFB4AD7D5.jpg"),
};
