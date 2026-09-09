import { FLOOR_LABEL, MAIN_D, MAIN_W, TYPE_COLOR } from "@/game/constants";
import { corridorsOn, doorEdge, portalsOn, roomsOn, wallsOn } from "@/game/layout";
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
  const walls = wallsOn(floor);
  const ports = portalsOn(floor);

  const grid: number[] = [];
  for (let i = -48; i <= 48; i += 6) grid.push(i);

  return (
    <svg
      viewBox={`0 0 ${VB_W} ${VB_H}`}
      width="100%"
      height="100%"
      className="absolute inset-0 h-full w-full"
      aria-label={`План ${FLOOR_LABEL[floor]}`}
      preserveAspectRatio="xMidYMid meet"
      shapeRendering="geometricPrecision"
    >
      <defs>
        <pattern id="plan-hatch" width="1.2" height="1.2" patternUnits="userSpaceOnUse" patternTransform="rotate(45)">
          <line x1="0" y1="0" x2="0" y2="1.2" stroke="#2a3a28" strokeWidth="0.18" />
        </pattern>
        <filter id="plan-halo">
          <feMorphology in="SourceAlpha" operator="dilate" radius="0.18" result="d" />
          <feFlood floodColor="#0b0c0a" result="c" />
          <feComposite in="c" in2="d" operator="in" result="o" />
          <feMerge>
            <feMergeNode in="o" />
            <feMergeNode in="SourceGraphic" />
          </feMerge>
        </filter>
      </defs>
      <rect width={VB_W} height={VB_H} fill="#0b0c0a" />
      <rect x={PAD} y={PAD} width={MAIN_W} height={MAIN_D} fill="#10120f" stroke="#2a2d28" strokeWidth="0.35" />

      <g opacity="0.35">
        {grid.map((g) => (
          <g key={g}>
            <line x1={sx(g)} y1={PAD} x2={sx(g)} y2={PAD + MAIN_D} stroke="#2a2d28" strokeWidth={g % 12 === 0 ? 0.12 : 0.05} />
            <line x1={PAD} y1={sy(g)} x2={PAD + MAIN_W} y2={sy(g)} stroke="#2a2d28" strokeWidth={g % 12 === 0 ? 0.12 : 0.05} />
          </g>
        ))}
      </g>

      <rect x={sx(-18)} y={sy(14)} width={36} height={28} fill="#162016" />
      <rect x={sx(-18)} y={sy(14)} width={36} height={28} fill="url(#plan-hatch)" />
      <rect x={sx(-18)} y={sy(14)} width={36} height={28} fill="none" stroke="#3a4a38" strokeWidth="0.12" />

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
              strokeOpacity="0.28"
              strokeWidth="0.08"
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
              <StairMark x={sx((r.x0 + r.x1) / 2)} y={sy((r.y0 + r.y1) / 2)} />
            </g>
          ))}
        </g>
      )}

      <g fill="#c8c4b8">
        {walls.map((w, i) => (
          <rect
            key={i}
            x={sx(w.x0)}
            y={sy(w.y1)}
            width={Math.max(0.08, w.x1 - w.x0)}
            height={Math.max(0.08, w.y1 - w.y0)}
          />
        ))}
      </g>

      {rooms.map((r, i) => {
        const p = ports[i];
        if (!p) return null;
        return <DoorSwing key={`swing-${r.id}`} p={p} edge={doorEdge(r)} />;
      })}

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
              strokeWidth="0.22"
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
              strokeWidth="0.22"
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

      <g transform={`translate(${PAD + 4},${PAD + MAIN_D - 6})`}>
        <circle r="2.6" fill="none" stroke="#8b8f84" strokeWidth="0.12" />
        <polygon points="0,-2.4 0.55,1.1 -0.55,1.1" fill="#9aaa90" />
        <text y="4.2" textAnchor="middle" fill="#8b8f84" fontSize="1.3" fontFamily="IBM Plex Sans, sans-serif">
          С
        </text>
      </g>
      <text
        x={PAD + 1}
        y={PAD - 1.4}
        fill="#9aaa90"
        fontSize="2.1"
        fontFamily="IBM Plex Sans, sans-serif"
        filter="url(#plan-halo)"
      >
        {FLOOR_LABEL[floor]} · 1 : 200 · стены сплошные · двери 1.2 м
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
      <rect x={sx(r.x0)} y={sy(r.y1)} width={w} height={h} fill={TYPE_COLOR[r.type]} fillOpacity="0.55" />
      {labels && w > 5 && h > 2.4 && (
        <text
          x={cx}
          y={cy + 0.35}
          textAnchor="middle"
          fill="#e6e2d6"
          fontSize={Math.min(1.45, w * 0.18)}
          fontFamily="IBM Plex Sans, sans-serif"
          paintOrder="stroke"
          stroke="#0b0c0a"
          strokeWidth="0.28"
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
          fontSize="1.05"
          fontFamily="IBM Plex Sans, sans-serif"
          paintOrder="stroke"
          stroke="#0b0c0a"
          strokeWidth="0.24"
        >
          {r.id.replace(`${floor}-`, "")}
        </text>
      )}
    </g>
  );
}

function StairMark({ x, y }: { x: number; y: number }) {
  return (
    <g transform={`translate(${x},${y})`} fill="none" stroke="#9aaa90" strokeWidth="0.14">
      <rect x="-1.4" y="-1.6" width="2.8" height="3.2" />
      {[-1.2, -0.6, 0, 0.6, 1.2].map((yy) => (
        <line key={yy} x1="-1.4" y1={yy} x2="1.4" y2={yy} />
      ))}
    </g>
  );
}

function DoorSwing({
  p,
  edge,
}: {
  p: { x0: number; x1: number; y0: number; y1: number };
  edge: "N" | "S" | "E" | "W";
}) {
  const cx = sx((p.x0 + p.x1) / 2);
  const cy = sy((p.y0 + p.y1) / 2);
  const r = 0.9;
  let d = `M ${cx} ${cy} L ${cx + r} ${cy} A ${r} ${r} 0 0 1 ${cx} ${cy + r}`;
  if (edge === "N") d = `M ${cx} ${cy} L ${cx + r} ${cy} A ${r} ${r} 0 0 0 ${cx} ${cy - r}`;
  if (edge === "W") d = `M ${cx} ${cy} L ${cx} ${cy + r} A ${r} ${r} 0 0 0 ${cx - r} ${cy}`;
  if (edge === "E") d = `M ${cx} ${cy} L ${cx} ${cy + r} A ${r} ${r} 0 0 1 ${cx + r} ${cy}`;
  return <path d={d} fill="none" stroke="#8b8f84" strokeWidth="0.1" />;
}
