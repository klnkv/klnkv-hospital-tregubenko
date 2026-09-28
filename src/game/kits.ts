import type { RoomType } from "./types";

export type RoomKit =
  | "boiler"
  | "switchgear"
  | "vent"
  | "water"
  | "workshop"
  | "laundry"
  | "pharmacy"
  | "server"
  | "procedure"
  | "sterile"
  | "preop"
  | "or"
  | "ct"
  | "morgue"
  | "coldstore"
  | "psych-group"
  | "psych-bed"
  | "isolation"
  | "chief"
  | "deskrow"
  | "reception"
  | "guard"
  | "linen"
  | "waste"
  | "samples"
  | "locker"
  | "icu"
  | "lab";

export type WallTone = "clinic" | "cold" | "plant" | "psych";

export function roomKit(name: string): RoomKit | null {
  const n = name.toLowerCase();
  if (n.includes("котель")) return "boiler";
  if (n.includes("электро")) return "switchgear";
  if (n.includes("вент")) return "vent";
  if (n.includes("водоузел")) return "water";
  if (n.includes("мастерск")) return "workshop";
  if (n.includes("прачеч")) return "laundry";
  if (n.includes("аптек")) return "pharmacy";
  if (n.includes("сервер")) return "server";
  if (n.includes("экт") || n.includes("процедур") || n.includes("перевязоч") || n.includes("манипуляц")) {
    return "procedure";
  }
  if (n.includes("стерилиз")) return "sterile";
  if (n.includes("предоперац")) return "preop";
  if (n.includes("послеоперац") || n.includes("реанима") || n.includes("противошок")) return "icu";
  if (n.includes("операцион")) return "or";
  if (/(^|[\s/])кт($|[\s/])/.test(n) || n.includes("рентген") || n.includes("диагност")) return "ct";
  if (n.includes("морг")) return "morgue";
  if (n.includes("холодиль")) return "coldstore";
  if (n.includes("группов") || n.includes("терапи")) return "psych-group";
  if (n.includes("изоляц")) return "isolation";
  if (n.includes("психиатр") || n.includes("наблюден")) return "psych-bed";
  if (n.includes("главн") || n.includes("заместител") || n.includes("руковод")) return "chief";
  if (
    n.includes("бухгалтер") ||
    n.includes("кадр") ||
    n.includes("канцеляр") ||
    n.includes("юридич") ||
    n.includes("закуп")
  ) {
    return "deskrow";
  }
  if (
    n.includes("приёмн") ||
    n.includes("приемн") ||
    n.includes("регистрат") ||
    n.includes("ожидан") ||
    n.includes("сортировк")
  ) {
    return "reception";
  }
  if (n.includes("охран")) return "guard";
  if (n.includes("бель")) return "linen";
  if (n.includes("отход") || n.includes("убороч")) return "waste";
  if (n.includes("образц") || n.includes("медикамент")) return "samples";
  if (n.includes("раздеваль") || n.includes("шлюз")) return "locker";
  if (n.includes("лаборат") || n.includes("биохим") || n.includes("аналитич") || n.includes("проб")) return "lab";
  return null;
}

export function wallTone(name: string, type: RoomType): WallTone | null {
  const n = name.toLowerCase();
  if (n.includes("психиатр") || n.includes("изоляц") || n.includes("наблюден") || n.includes("терапи") || n.includes("психолог")) {
    return "psych";
  }
  if (type === "MORGUE" || n.includes("морг") || n.includes("холодиль")) return "cold";
  if (n.includes("котель") || n.includes("электро") || n.includes("вент") || n.includes("водо") || n.includes("мастер")) {
    return "plant";
  }
  if (type === "OR" || n.includes("стерилиз") || n.includes("шлюз") || n.includes("операцион") || n.includes("процедур")) {
    return "clinic";
  }
  return null;
}
