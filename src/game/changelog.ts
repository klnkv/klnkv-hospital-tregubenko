import { LOOKDEV_RELEASE } from "@/game/version";

/** Look-dev лента для Кристины. Этот чат ей не нужен — только прогулка. */

export const LOOKDEV_VIEWER = "Кристина";
export { LOOKDEV_RELEASE };

export type LookDevEdit = {
  at: string;
  where: string;
  title: string;
};

export const LOOKDEV_EDITS: LookDevEdit[] = [
  {
    at: "2026-09-09T21:22:00+03:00",
    where: "карта города + планы этажей",
    title: "Слои навигации: районы, дороги, река, скрытые переходы, коридоры, лестницы",
  },
  {
    at: "2026-09-09T21:05:00+03:00",
    where: "карта города + планы этажей",
    title: "Карты прорисованы вектором: город 31 объект, этажи с комнатами, зум острый",
  },
  {
    at: "2026-09-09T20:56:00+03:00",
    where: "версии",
    title: "Git: прогулка Кристины = тег lookdev/r2, продакшен — этот чат",
  },
  {
    at: "2026-09-09T20:02:00+03:00",
    where: "весь кадр",
    title: "На прогулке видны номер сборки и время правок",
  },
  {
    at: "2026-09-09T19:30:00+03:00",
    where: "iPad / ссылка",
    title: "Актуальная прогулка на https://klnkv.github.io/",
  },
  {
    at: "2026-09-09T16:40:00+03:00",
    where: "F1 столовая / кухня",
    title: "Пилот «Завтрак»: дамаск, колпаки, повар, трое гостей",
  },
  {
    at: "2026-09-09T15:10:00+03:00",
    where: "ворота / аллея",
    title: "Дождь, лужи, три плана с пола, машины у КПП",
  },
  {
    at: "2026-09-09T14:20:00+03:00",
    where: "B1–F6",
    title: "Стены непрозрачные, коридоры проходимы",
  },
];

export function formatKyiv(iso: string): string {
  return new Date(iso).toLocaleString("ru-UA", {
    timeZone: "Europe/Kyiv",
    day: "2-digit",
    month: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  });
}
