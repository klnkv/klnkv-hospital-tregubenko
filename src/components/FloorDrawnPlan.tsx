import { FLOOR_LABEL, MAIN_D, MAIN_W, TYPE_COLOR } from "@/game/constants";
import { corridorsOn, roomsOn } from "@/game/layout";
import { PASSAGES } from "@/game/town";
import type { FloorId, RoomDef } from "@/game/types";
import { fullVis, type LayerVis } from "@/components/LayerStrip";

const PAD = 8;
const VB_W = MAIN_W + PAD * 2;
const VB_H = MAIN_D + PAD * 2;

export type FloorLayer = "rooms" | "corridors" | "core" | "labels" | "doors";

export const FLOOR_LAYER_ITEMS: { id: FloorLayer; label: string }[] = [
  { id: "rooms", label: "Комнаты" },
  { id: "corridors", label: "Коридоры" },
  { id: "core", label: "Лестницы" },
  { id: "labels", label: "Подписи" },
  { id: "doors", label: "Скрытые" },
];

export const FLOOR_LAYER_VIS: Record<FloorLayer, LayerVis> = fullVis(
  FLOOR_LAYER_ITEMS.map((l) => l.id),
);

function sx(x: number) {
  return x + MAIN_W / 2 + PAD;
}
function sy(y: number) {
  return MAIN_D / 2 - y + PAD;
}

export function FloorDrawnPlan({
  floor,
  marker,
  layers = FLOOR_LAYER_VIS,
}: {
  floor: FloorId;
  marker?: { x: number; y: number; yaw: number };
  layers?: Record<FloorLayer, LayerVis>;
}) {
  const rooms = roomsOn(floor);
  const corridors = corridorsOn(floor);
  const core = rooms.filter((r) => r.type === "CORE");
  const rest = rooms.filter((r) => r.type !== "CORE");
  const doorRooms = rooms.filter((r) => PASSAGES.some((p) => p.roomId === r.id));
  const roofDoor = PASSAGES.filter((p) => p.floor === floor && p.hx != null && p.hy != null);

  return (
    <svg
      viewBox={`0 0 ${VB_W} ${VB_H}`}
      width="100%"
      height="100%"
      className="absolute inset-0 h-full w-full"
      aria-label={`План ${FLOOR_LABEL[floor]}`}
      preserveAspectRatio="xMidYMid meet"
    >
      <rect width={VB_W} height={VB_H} fill="#0b0c0a" />
      <rect
        x={PAD}
        y={PAD}
        width={MAIN_W}
        height={MAIN_D}
        fill="#141613"
        stroke="#2a2d28"
        strokeWidth="0.35"
      />
      <rect x={sx(-18)} y={sy(14)} width={36} height={28} fill="#1c2418" stroke="#2a2d28" strokeWidth="0.2" />

      {layers.corridors.on && (
        <g opacity={layers.corridors.opacity}>
        {corridors.map((c) => (
          <rect
            key={c.id}
            x={sx(c.x0)}
            y={sy(c.y1)}
            width={Math.max(0.2, c.x1 - c.x0)}
            height={Math.max(0.2, c.y1 - c.y0)}
            fill="#1b1d19"
            stroke="#9aaa90"
            strokeOpacity="0.35"
            strokeWidth="0.18"
          />
        ))}
        </g>
      )}

      {layers.rooms.on && (
        <g opacity={layers.rooms.opacity}>
          {rest.map((r) => (
            <RoomGlyph key={r.id} r={r} floor={floor} labels={layers.labels.on} />
          ))}
        </g>
      )}

      {layers.core.on && (
        <g opacity={layers.core.opacity}>
        {core.map((r) => (
          <g key={r.id}>
            <RoomGlyph r={r} floor={floor} labels={layers.labels.on} />
            <text
              x={sx((r.x0 + r.x1) / 2)}
              y={sy((r.y0 + r.y1) / 2) + 1.6}
              textAnchor="middle"
              fill="#9aaa90"
              fontSize="1.1"
              fontFamily="IBM Plex Sans, sans-serif"
            >
              E / Q
            </text>
          </g>
        ))}
        </g>
      )}

      {layers.doors.on && (
        <g opacity={layers.doors.opacity}>
        {doorRooms.map((r) => (
          <rect
            key={`door-${r.id}`}
            x={sx(r.x0)}
            y={sy(r.y1)}
            width={Math.max(0.2, r.x1 - r.x0)}
            height={Math.max(0.2, r.y1 - r.y0)}
            fill="none"
            stroke="#b07060"
            strokeWidth="0.28"
            strokeDasharray="0.7 0.5"
          />
        ))}
        {roofDoor.map((p, i) => (
          <circle
            key={`roof-${i}`}
            cx={sx(p.hx!)}
            cy={sy(p.hy!)}
            r={p.radius ?? 8}
            fill="none"
            stroke="#b07060"
            strokeWidth="0.28"
            strokeDasharray="0.8 0.5"
          />
        ))}
        </g>
      )}

      {marker && (
        <g transform={`translate(${sx(marker.x)},${sy(marker.y)}) rotate(${(-marker.yaw * 180) / Math.PI})`}>
          <circle r="1.1" fill="#e6e2d6" />
          <polygon points="0,-3.2 1.1,1.4 -1.1,1.4" fill="#9aaa90" />
        </g>
      )}

      <text x={PAD + 1} y={PAD - 1.6} fill="#9aaa90" fontSize="2.2" fontFamily="IBM Plex Sans, sans-serif">
        {FLOOR_LABEL[floor]} · слои навигации
      </text>
    </svg>
  );
}

function RoomGlyph({ r, floor, labels }: { r: RoomDef; floor: FloorId; labels: boolean }) {
  const w = Math.max(0.2, r.x1 - r.x0);
  const h = Math.max(0.2, r.y1 - r.y0);
  const cx = sx((r.x0 + r.x1) / 2);
  const cy = sy((r.y0 + r.y1) / 2);
  return (
    <g>
      <rect
        x={sx(r.x0)}
        y={sy(r.y1)}
        width={w}
        height={h}
        fill={TYPE_COLOR[r.type]}
        fillOpacity="0.72"
        stroke="#e6e2d6"
        strokeOpacity="0.35"
        strokeWidth="0.12"
      />
      {labels && w > 5 && h > 2.4 && (
        <text
          x={cx}
          y={cy + 0.35}
          textAnchor="middle"
          fill="#e6e2d6"
          fontSize={Math.min(1.6, w * 0.22)}
          fontFamily="IBM Plex Sans, sans-serif"
        >
          {r.name.length > 18 ? r.id.replace(`${floor}-`, "") : r.name}
        </text>
      )}
      {labels && w > 3 && h > 1.6 && w <= 5 && (
        <text
          x={cx}
          y={cy + 0.3}
          textAnchor="middle"
          fill="#e6e2d6"
          fontSize="1.1"
          fontFamily="IBM Plex Sans, sans-serif"
        >
          {r.id.replace(`${floor}-`, "")}
        </text>
      )}
    </g>
  );
}
