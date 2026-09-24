export const PHASES = [
  { id: "dawn", label: "Утро" },
  { id: "day", label: "День" },
  { id: "sunset", label: "Закат" },
  { id: "dusk", label: "Вечер" },
  { id: "night", label: "Ночь" },
] as const;

export const SEASONS = [
  { id: "spring", label: "Весна" },
  { id: "summer", label: "Лето" },
  { id: "autumn", label: "Осень" },
  { id: "winter", label: "Зима" },
] as const;

export const WEATHERS = [
  { id: "clear", label: "Солнце" },
  { id: "rain", label: "Дождь" },
  { id: "snow", label: "Снег" },
  { id: "fog", label: "Туман" },
] as const;

export type DayPhase = (typeof PHASES)[number]["id"];
export type SeasonId = (typeof SEASONS)[number]["id"];
export type WeatherId = (typeof WEATHERS)[number]["id"];
export type Precip = "none" | "rain" | "snow";

export type SkyLook = {
  sky: number;
  fog: number;
  fogDensity: number;
  hemiSky: number;
  hemiGround: number;
  hemi: number;
  sun: number;
  sunIntensity: number;
  sunPos: [number, number, number];
  fill: number;
  fillIntensity: number;
  exposure: number;
  env: number;
  lamps: number;
  windows: number;
  windowColor: number;
};

const PHASE_SKY: Record<DayPhase, SkyLook> = {
  dawn: {
    sky: 0xc9846a,
    fog: 0xd7b59a,
    fogDensity: 0.008,
    hemiSky: 0xf0c2a0,
    hemiGround: 0x6a5040,
    hemi: 0.72,
    sun: 0xffc08a,
    sunIntensity: 0.9,
    sunPos: [48, 16, 18],
    fill: 0xffe0c0,
    fillIntensity: 0.28,
    exposure: 1.02,
    env: 0.7,
    lamps: 0.35,
    windows: 0.18,
    windowColor: 0x6a5848,
  },
  day: {
    sky: 0x8eb4d4,
    fog: 0xb7cbe0,
    fogDensity: 0.0045,
    hemiSky: 0xd6e6f4,
    hemiGround: 0x6a7058,
    hemi: 1.05,
    sun: 0xfff4dd,
    sunIntensity: 1.35,
    sunPos: [28, 78, 12],
    fill: 0xeef4ff,
    fillIntensity: 0.22,
    exposure: 1.12,
    env: 0.85,
    lamps: 0.06,
    windows: 0.02,
    windowColor: 0x8aa4b8,
  },
  sunset: {
    sky: 0xc45a3a,
    fog: 0xe09060,
    fogDensity: 0.009,
    hemiSky: 0xffb080,
    hemiGround: 0x4a3020,
    hemi: 0.78,
    sun: 0xff7a3c,
    sunIntensity: 1.15,
    sunPos: [-62, 10, 28],
    fill: 0xffc090,
    fillIntensity: 0.32,
    exposure: 1.04,
    env: 0.72,
    lamps: 0.55,
    windows: 0.42,
    windowColor: 0x4a3020,
  },
  dusk: {
    sky: 0x2a3148,
    fog: 0x3a3a55,
    fogDensity: 0.012,
    hemiSky: 0x6a7090,
    hemiGround: 0x1a1410,
    hemi: 0.42,
    sun: 0xffb070,
    sunIntensity: 0.22,
    sunPos: [-24, 6, 36],
    fill: 0xc8b090,
    fillIntensity: 0.12,
    exposure: 0.84,
    env: 0.48,
    lamps: 0.9,
    windows: 0.62,
    windowColor: 0x241c16,
  },
  night: {
    sky: 0x07080c,
    fog: 0x07080c,
    fogDensity: 0.011,
    hemiSky: 0x8aa0b8,
    hemiGround: 0x1a120c,
    hemi: 0.45,
    sun: 0xc8d4e8,
    sunIntensity: 0.55,
    sunPos: [-40, 80, 30],
    fill: 0xf0d4a0,
    fillIntensity: 0.18,
    exposure: 0.88,
    env: 0.55,
    lamps: 1,
    windows: 0.7,
    windowColor: 0x1a1810,
  },
};

function shade(hex: number, mul: number): number {
  const r = Math.min(255, ((hex >> 16) & 255) * mul);
  const g = Math.min(255, ((hex >> 8) & 255) * mul);
  const b = Math.min(255, (hex & 255) * mul);
  return ((r | 0) << 16) | ((g | 0) << 8) | (b | 0);
}

export function skyLook(phase: DayPhase, weather: WeatherId): SkyLook {
  const base = { ...PHASE_SKY[phase] };
  if (weather === "clear") {
    base.fogDensity *= 0.72;
    base.exposure += 0.04;
    return base;
  }
  if (weather === "rain") {
    base.sky = shade(base.sky, 0.62);
    base.fog = shade(base.fog, 0.7);
    base.fogDensity *= 1.45;
    base.sunIntensity *= 0.42;
    base.hemi *= 0.72;
    base.exposure -= 0.06;
    return base;
  }
  if (weather === "snow") {
    base.sky = shade(base.sky, 0.86) | 0x101820;
    base.fog = 0xd5dde6;
    if (phase === "night" || phase === "dusk") base.fog = 0x1a222c;
    base.fogDensity *= 1.2;
    base.sunIntensity *= 0.62;
    base.hemiSky = phase === "night" ? 0xa8b8c8 : 0xe4eef6;
    return base;
  }
  base.fogDensity *= phase === "night" ? 3.2 : 4.4;
  base.sunIntensity *= 0.28;
  base.hemi *= 0.62;
  base.exposure -= 0.08;
  if (phase !== "night" && phase !== "dusk") base.fog = 0xc5c9cc;
  return base;
}

export function precipOf(weather: WeatherId): Precip {
  if (weather === "rain") return "rain";
  if (weather === "snow") return "snow";
  return "none";
}

export function foliage(season: SeasonId) {
  if (season === "spring") {
    return { canopy: "#3d6a32", bloom: "#d06a86", bloomY: "#f0d060", grass: "#3d5c2c" };
  }
  if (season === "summer") {
    return { canopy: "#1c4a22", bloom: "#c4586a", bloomY: "#e8c84a", grass: "#2a4a1c" };
  }
  if (season === "autumn") {
    return { canopy: "#8a4a18", bloom: "#a84838", bloomY: "#d4a04a", grass: "#6a5524" };
  }
  return { canopy: "#d5dbe2", bloom: "#eef2f4", bloomY: "#d8dee4", grass: "#9aa098" };
}

export function snowCover(season: SeasonId, weather: WeatherId): number {
  if (weather === "snow") return 0.88;
  if (season === "winter" && weather !== "rain") return 0.5;
  if (season === "winter") return 0.22;
  return 0;
}
