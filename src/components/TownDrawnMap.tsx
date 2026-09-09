import { KIND_COLOR, PASSAGES, TOWN, TOWN_MAP_H, TOWN_MAP_W, locById, type TownLocation } from "@/game/town";
import { fullVis, type LayerVis } from "@/components/LayerStrip";

const RIVER = "M680 0 C690 50 712 78 704 118 C738 186 808 214 828 268 C858 348 808 398 758 432 C792 508 858 558 834 628 C812 708 824 768 798 824 C752 888 698 946 638 1000";
const RIVER_BANK = "M640 -10 C650 50 672 78 664 118 C698 186 768 214 788 268 C818 348 768 398 718 432 C752 508 818 558 794 628 C772 708 784 768 758 824 C712 888 658 946 598 1010 L678 1010 C738 946 792 888 838 824 C864 768 852 708 874 628 C898 558 832 508 798 432 C848 398 898 348 868 268 C848 214 778 186 744 118 C752 78 730 50 720 -10 Z";

export type TownLayer = "districts" | "river" | "roads" | "rail" | "links" | "sites" | "hidden";

export const TOWN_LAYER_ITEMS: { id: TownLayer; label: string }[] = [
  { id: "districts", label: "Районы" },
  { id: "river", label: "Река" },
  { id: "roads", label: "Дороги" },
  { id: "rail", label: "Ж/Д" },
  { id: "links", label: "Маршруты" },
  { id: "sites", label: "Объекты" },
  { id: "hidden", label: "Скрытые" },
];

export const TOWN_LAYER_VIS: Record<TownLayer, LayerVis> = fullVis(
  TOWN_LAYER_ITEMS.map((l) => l.id),
);

export function TownDrawnMap({ layers = TOWN_LAYER_VIS }: { layers?: Record<TownLayer, LayerVis> }) {
  const hospital = locById(1);

  return (
    <svg
      viewBox={`0 0 ${TOWN_MAP_W} ${TOWN_MAP_H}`}
      width={TOWN_MAP_W}
      height={TOWN_MAP_H}
      className="absolute left-0 top-0"
      aria-label="Last Resort Town — карта города"
    >
      <defs>
        <pattern id="hatch" width="18" height="18" patternUnits="userSpaceOnUse" patternTransform="rotate(38)">
          <line x1="0" y1="0" x2="0" y2="18" stroke="#2a2d28" strokeWidth="1" />
        </pattern>
        <linearGradient id="paper" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#161814" />
          <stop offset="1" stopColor="#0e100d" />
        </linearGradient>
        <filter id="soft">
          <feGaussianBlur stdDeviation="6" />
        </filter>
      </defs>

      <rect width={TOWN_MAP_W} height={TOWN_MAP_H} fill="url(#paper)" />
      <rect width={TOWN_MAP_W} height={TOWN_MAP_H} fill="url(#hatch)" opacity="0.35" />

      {layers.districts.on && (
        <g opacity={layers.districts.opacity}>
          <ellipse cx="510" cy="220" rx="210" ry="150" fill="#3a3e42" opacity="0.45" />
          <ellipse cx="400" cy="500" rx="200" ry="170" fill="#2c382c" opacity="0.4" />
          <ellipse cx="680" cy="440" rx="160" ry="130" fill="#3a4034" opacity="0.55" />
          <ellipse cx="800" cy="640" rx="170" ry="120" fill="#3a3228" opacity="0.42" />
          <ellipse cx="1040" cy="430" rx="190" ry="160" fill="#2a322c" opacity="0.35" />
          <ellipse cx="700" cy="900" rx="240" ry="110" fill="#243028" opacity="0.4" />
          <ellipse cx="900" cy="90" rx="180" ry="90" fill="#2a3424" opacity="0.35" />
          <ellipse cx="1220" cy="180" rx="220" ry="150" fill="#1c2818" opacity="0.5" />
          <ellipse cx="1280" cy="380" rx="160" ry="100" fill="#241818" opacity="0.35" />
          <rect
            x="90"
            y="40"
            width="1280"
            height="920"
            rx="18"
            fill="none"
            stroke="#b07060"
            strokeWidth="2"
            strokeDasharray="10 8"
            opacity="0.7"
          />
          <DistrictLabel x={510} y={168} text="Промзона" />
          <DistrictLabel x={360} y={448} text="Западный" />
          <DistrictLabel x={640} y={360} text="Центр" />
          <DistrictLabel x={820} y={690} text="Старый город" />
          <DistrictLabel x={1080} y={390} text="Восток" />
          <DistrictLabel x={620} y={940} text="Юг / пляж" />
          <DistrictLabel x={920} y={48} text="Дачи" />
          <DistrictLabel x={1200} y={110} text="Лес" />
        </g>
      )}

      {layers.rail.on && (
        <g opacity={layers.rail.opacity}>
          <path d="M248 20 L268 380 L318 640 L292 980" fill="none" stroke="#8b8f84" strokeWidth="5" />
          <path
            d="M248 20 L268 380 L318 640 L292 980"
            fill="none"
            stroke="#0b0c0a"
            strokeWidth="2"
            strokeDasharray="12 10"
          />
        </g>
      )}

      {layers.roads.on && (
        <g opacity={layers.roads.opacity}>
          <path
            d="M180 430 L1320 430 M684 40 L684 960 M400 640 L1100 760 M520 200 L1100 200"
            fill="none"
            stroke="#c4b89a"
            strokeWidth="3.2"
            opacity="0.28"
          />
          {layers.river.on && (
            <>
              <rect x="668" y="78" width="74" height="18" rx="2" fill="#8a7a62" />
              <rect x="762" y="790" width="78" height="18" rx="2" fill="#8a7a62" />
            </>
          )}
        </g>
      )}

      {layers.links.on && (
        <g opacity={layers.links.opacity}>
        {TOWN.filter((l) => !l.hidden).map((l) =>
          l.links.slice(0, 3).map((id) => {
            const o = locById(id);
            if (!o) return null;
            return (
              <line
                key={`${l.id}-${id}`}
                x1={l.x * TOWN_MAP_W}
                y1={l.y * TOWN_MAP_H}
                x2={o.x * TOWN_MAP_W}
                y2={o.y * TOWN_MAP_H}
                stroke="#9aaa90"
                strokeWidth="1.1"
                opacity="0.22"
              />
            );
          }),
        )}
        </g>
      )}

      {layers.river.on && (
        <g opacity={layers.river.opacity}>
          <path d={RIVER_BANK} fill="#1a3a42" opacity="0.95" filter="url(#soft)" />
          <path d={RIVER} fill="none" stroke="#3f5c68" strokeWidth="28" strokeLinecap="round" />
          <path d={RIVER} fill="none" stroke="#7aa0aa" strokeWidth="6" opacity="0.35" />
        </g>
      )}

      {layers.sites.on && (
        <g opacity={layers.sites.opacity}>
          <rect x="662" y="396" width="44" height="34" fill="#9aaa90" stroke="#e6e2d6" strokeWidth="1.4" />
          <rect x="672" y="404" width="16" height="12" fill="#141613" opacity="0.5" />
          {TOWN.flatMap((l) => {
            const pts = [{ x: l.x, y: l.y, primary: true }, ...(l.sites ?? []).map((s) => ({ ...s, primary: false }))];
            return pts.map((pt, i) => (
              <SiteMark key={`${l.id}-${i}`} loc={l} x={pt.x * TOWN_MAP_W} y={pt.y * TOWN_MAP_H} primary={pt.primary} />
            ));
          })}
        </g>
      )}

      {layers.hidden.on && hospital && (
        <g opacity={layers.hidden.opacity}>
        {PASSAGES.map((p) => {
          const o = locById(p.townId);
          if (!o || o.id === 1) return null;
          return (
            <line
              key={`${p.townId}-${p.roomId ?? p.door}`}
              x1={hospital.x * TOWN_MAP_W}
              y1={hospital.y * TOWN_MAP_H}
              x2={o.x * TOWN_MAP_W}
              y2={o.y * TOWN_MAP_H}
              stroke="#b07060"
              strokeWidth="1.6"
              strokeDasharray="7 6"
              opacity="0.7"
            />
          );
        })}
        </g>
      )}

      <text x="80" y="56" fill="#9aaa90" fontFamily="IBM Plex Sans, sans-serif" fontSize="13" letterSpacing="4">
        LAST RESORT TOWN
      </text>
      <text x="80" y="86" fill="#e6e2d6" fontFamily="IBM Plex Serif, serif" fontSize="28">
        Карта города
      </text>
      <text x="80" y="112" fill="#8b8f84" fontFamily="IBM Plex Sans, sans-serif" fontSize="12">
        1 : 10 000 · север сверху · слои навигации
      </text>

      <g transform="translate(1400,90)">
        <circle r="28" fill="#141613" stroke="#2a2d28" />
        <polygon points="0,-22 7,8 -7,8" fill="#9aaa90" />
        <text y="38" textAnchor="middle" fill="#8b8f84" fontSize="11" fontFamily="IBM Plex Sans, sans-serif">
          С
        </text>
      </g>
      <g transform="translate(80,940)">
        <line x1="0" y1="0" x2="150" y2="0" stroke="#e6e2d6" strokeWidth="2" />
        <line x1="0" y1="-6" x2="0" y2="6" stroke="#e6e2d6" />
        <line x1="150" y1="-6" x2="150" y2="6" stroke="#e6e2d6" />
        <text y="22" fill="#8b8f84" fontSize="11" fontFamily="IBM Plex Sans, sans-serif">
          0 — 1 км
        </text>
      </g>
    </svg>
  );
}

function DistrictLabel({ x, y, text }: { x: number; y: number; text: string }) {
  return (
    <text
      x={x}
      y={y}
      textAnchor="middle"
      fill="#8b8f84"
      fontSize="13"
      letterSpacing="2"
      fontFamily="IBM Plex Sans, sans-serif"
      opacity="0.85"
    >
      {text.toUpperCase()}
    </text>
  );
}

function SiteMark({
  loc,
  x,
  y,
  primary,
}: {
  loc: TownLocation;
  x: number;
  y: number;
  primary: boolean;
}) {
  const r = primary ? 11 : 7;
  const fill = loc.hidden ? "#141613" : "#e6e2d6";
  const stroke = KIND_COLOR[loc.kind];
  return (
    <g transform={`translate(${x},${y})`}>
      <circle r={r + 2} fill={stroke} opacity="0.35" />
      <circle r={r} fill={fill} stroke={stroke} strokeWidth="1.6" />
    </g>
  );
}
