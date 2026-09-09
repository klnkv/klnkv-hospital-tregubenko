export type FloorId = "B1" | "F1" | "F2" | "F3" | "F4" | "F5" | "F6" | "R";

export type RoomType =
  | "WARD"
  | "OR"
  | "ICU"
  | "OFFICE"
  | "LOBBY"
  | "TECH"
  | "LAB"
  | "CT"
  | "WC"
  | "ARCHIVE"
  | "CONF"
  | "POST"
  | "KITCHEN"
  | "DINING"
  | "MORGUE"
  | "CORE";

export type Rect = {
  x0: number;
  x1: number;
  y0: number;
  y1: number;
};

export type RoomDef = {
  id: string;
  floor: FloorId;
  name: string;
  type: RoomType;
  x0: number;
  x1: number;
  y0: number;
  y1: number;
};

export type CorridorDef = {
  id: string;
  floor: FloorId;
  name: string;
  x0: number;
  x1: number;
  y0: number;
  y1: number;
};

export type GameMode = "title" | "walk" | "orbit" | "plan" | "shot";

export type GameSnapshot = {
  mode: GameMode;
  floor: FloorId;
  roomId: string | null;
  roomName: string;
  x: number;
  y: number;
  z: number;
  yaw: number;
  speed: number;
  locked: boolean;
  labels: boolean;
  shotId: string | null;
};

export type ControlsProbe = {
  getYaw: () => number;
  getSpeed: () => number;
  setKeys: (codes: string[]) => void;
  getPosition: () => { x: number; y: number; z: number };
  setYaw?: (v: number) => void;
};

declare global {
  interface Window {
    __controlsTest?: ControlsProbe;
    __hospital?: {
      teleport: (floor: FloorId, x: number, z: number) => void;
      setFloor: (floor: FloorId) => void;
      setMode: (mode: GameMode) => void;
      setShot?: (id: string) => void;
    };
  }
}
