import { useEffect, useMemo, useRef, useState } from "react";
import {
  DISTRICT_LABEL,
  KIND_COLOR,
  KIND_LABEL,
  TOWN,
  TOWN_MAP_H,
  TOWN_MAP_W,
  locById,
  passagesForTown,
  type DistrictId,
  type TownLocation,
} from "@/game/town";
import { usePanZoom } from "@/components/usePanZoom";
import { TOWN_LAYER_VIS, TOWN_LAYER_ITEMS, TownDrawnMap } from "@/components/TownDrawnMap";
import { LayerVisibility, useLayerVis } from "@/components/LayerStrip";

type Props = {
  focusId?: number | null;
  fromTitle?: boolean;
  onClose: () => void;
  onEnterHospital: () => void;
  onOpenPassage: (roomId: string) => void;
};

const DISTRICTS: Array<DistrictId | "ALL"> = [
  "ALL",
  "center",
  "west",
  "east",
  "north",
  "south",
  "prom",
  "old",
  "wild",
];

function pinFg(kind: TownLocation["kind"]): string {
  return kind === "nature" || kind === "hidden" || kind === "water" ? "#e6e2d6" : "#0b0c0a";
}

export function TownAtlas({
  focusId,
  fromTitle,
  onClose,
  onEnterHospital,
  onOpenPassage,
}: Props) {
  const tapRef = useRef<(x: number, y: number) => void>(() => {});
  const map = usePanZoom({
    contentW: TOWN_MAP_W,
    contentH: TOWN_MAP_H,
    minZoom: 0.85,
    maxZoom: 16,
    initialZoom: 1.2,
    onTap: (x, y) => tapRef.current(x, y),
  });
  const [sel, setSel] = useState<number>(focusId ?? 1);
  const [query, setQuery] = useState("");
  const [district, setDistrict] = useState<DistrictId | "ALL">("ALL");
  const [listOpen, setListOpen] = useState(false);
  const [ready, setReady] = useState(false);
  const vis = useLayerVis("h6-layers-town", TOWN_LAYER_VIS);
  const layers = vis.layers;

  const loc = locById(sel) ?? TOWN[0]!;
  const passages = passagesForTown(loc.id);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return TOWN.filter((l) => {
      if (district !== "ALL" && l.district !== district) return false;
      if (!q) return true;
      return (
        String(l.id).includes(q) ||
        l.name.toLowerCase().includes(q) ||
        DISTRICT_LABEL[l.district].toLowerCase().includes(q)
      );
    });
  }, [query, district]);

  function centerOn(id: number, z?: number) {
    const l = locById(id);
    if (!l) return;
    setSel(id);
    map.centerNorm(l.x, l.y, z ?? Math.max(map.zoom, 2));
  }

  tapRef.current = (x, y) => {
    const sc = map.scale;
    let best: TownLocation | null = null;
    let bestD = 28;
    for (const l of TOWN) {
      const pts = [{ x: l.x, y: l.y }, ...(l.sites ?? [])];
      for (const pt of pts) {
        const px = map.pan.x + pt.x * TOWN_MAP_W * sc;
        const py = map.pan.y + pt.y * TOWN_MAP_H * sc;
        const d = Math.hypot(px - x, py - y);
        if (d < bestD) {
          bestD = d;
          best = l;
        }
      }
    }
    if (best) centerOn(best.id, Math.max(map.zoom, 2));
  };

  useEffect(() => {
    if (ready || map.view.w < 40) return;
    const id = focusId ?? 1;
    const l = locById(id);
    if (l) map.centerNorm(l.x, l.y, focusId ? 2.15 : 1.2);
    setSel(id);
    setReady(true);
  }, [map.view.w, map.view.h, ready, focusId, map]);

  useEffect(() => {
    if (focusId && ready) setSel(focusId);
  }, [focusId, ready]);

  return (
    <div className="absolute inset-0 z-30 flex flex-col bg-bg">
      <header className="flex items-center gap-2 border-b border-border px-3 py-2 md:px-4">
        <div className="min-w-0">
          <p className="text-[10px] uppercase tracking-[0.22em] text-accent">
            Last Resort Town · Season 1
          </p>
          <p className="truncate font-display text-base md:text-lg">Карта города</p>
        </div>
        <button
          className="ml-2 h-10 rounded-sm bg-surface-2 px-3 text-xs text-fg md:hidden"
          onClick={() => setListOpen((v) => !v)}
        >
          Объекты
        </button>
        <button
          className="ml-auto h-10 rounded-sm border border-border px-3 text-sm text-muted"
          onClick={onClose}
        >
          Закрыть
        </button>
      </header>

      <div className="flex min-h-0 flex-1">
        <aside
          className={
            (listOpen ? "flex" : "hidden") +
            " absolute inset-y-12 left-0 z-20 w-[min(100%,20rem)] flex-col border-r border-border bg-surface/95 md:static md:flex md:w-72"
          }
        >
          <div className="flex gap-2 border-b border-border px-3 py-3">
            <input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Поиск локации"
              className="h-10 flex-1 rounded-md border border-border bg-bg px-3 text-sm text-fg outline-none"
            />
          </div>
          <div className="flex gap-1 overflow-x-auto px-3 py-2">
            {DISTRICTS.map((d) => (
              <button
                key={d}
                onClick={() => setDistrict(d)}
                className={
                  "h-10 shrink-0 rounded-sm px-2.5 text-xs " +
                  (district === d ? "bg-accent text-accent-fg" : "bg-surface-2 text-muted")
                }
              >
                {d === "ALL" ? "Все" : DISTRICT_LABEL[d]}
              </button>
            ))}
          </div>
          <div className="min-h-0 flex-1 overflow-y-auto px-2 pb-3">
            {filtered.map((l) => (
              <LocationRow
                key={l.id}
                loc={l}
                active={l.id === sel}
                onPick={() => {
                  centerOn(l.id, Math.max(map.zoom, 2.05));
                  setListOpen(false);
                }}
              />
            ))}
          </div>
        </aside>

        <div className="relative flex min-w-0 flex-1 flex-col">
          <div
            ref={map.ref}
            className="relative min-h-0 flex-1 cursor-grab touch-none overflow-hidden overscroll-none active:cursor-grabbing"
            onPointerDown={map.onPointerDown}
            onPointerMove={map.onPointerMove}
            onPointerUp={map.onPointerUp}
            onPointerCancel={map.onPointerUp}
          >
            <div
              className="absolute left-0 top-0 origin-top-left touch-none"
              style={map.contentStyle}
            >
              <TownDrawnMap layers={layers} />
              {layers.links.on && (
              <svg
                className="pointer-events-none absolute inset-0"
                viewBox={`0 0 ${TOWN_MAP_W} ${TOWN_MAP_H}`}
                preserveAspectRatio="none"
              >
                {loc.links.map((id) => {
                  const o = locById(id);
                  if (!o) return null;
                  return (
                    <line
                      key={id}
                      x1={loc.x * TOWN_MAP_W}
                      y1={loc.y * TOWN_MAP_H}
                      x2={o.x * TOWN_MAP_W}
                      y2={o.y * TOWN_MAP_H}
                      stroke="rgba(154,170,144,0.55)"
                      strokeWidth={2}
                      strokeDasharray={loc.hidden || o.hidden ? "6 5" : "0"}
                    />
                  );
                })}
              </svg>
              )}
            </div>
            {layers.sites.on && (
            <div className="pointer-events-none absolute inset-0 touch-none" style={{ opacity: layers.sites.opacity }}>
              {TOWN.filter((l) => layers.hidden.on || !l.hidden).flatMap((l) => {
                const pts = [
                  { x: l.x, y: l.y, primary: true },
                  ...(l.sites ?? []).map((site) => ({ ...site, primary: false })),
                ];
                return pts.map((pt, i) => {
                  const left = map.pan.x + pt.x * TOWN_MAP_W * map.scale;
                  const top = map.pan.y + pt.y * TOWN_MAP_H * map.scale;
                  return (
                    <Pin
                      key={`${l.id}-${i}`}
                      loc={l}
                      left={left}
                      top={top}
                      primary={pt.primary}
                      active={l.id === sel}
                    />
                  );
                });
              })}
            </div>
            )}
            <LayerVisibility items={TOWN_LAYER_ITEMS} vis={vis} />
            <div className="pointer-events-none absolute bottom-3 right-3 z-10 flex items-center gap-1">
              <p className="mr-1 rounded-sm border border-border bg-bg/80 px-2 py-1 font-mono text-[10px] text-muted">
                щипок · {map.zoom.toFixed(1)}×
              </p>
              <button
                type="button"
                onClick={() => map.bump(0.82)}
                className="pointer-events-auto h-10 w-10 rounded-sm border border-border bg-surface text-lg text-fg"
                aria-label="Отдалить"
              >
                −
              </button>
              <button
                type="button"
                onClick={() => map.bump(1.22)}
                className="pointer-events-auto h-10 w-10 rounded-sm border border-border bg-surface text-lg text-fg"
                aria-label="Приблизить"
              >
                +
              </button>
            </div>
          </div>

          <Dossier
            loc={loc}
            passages={passages}
            fromTitle={fromTitle}
            onEnterHospital={onEnterHospital}
            onOpenPassage={onOpenPassage}
            onLink={(id) => centerOn(id, Math.max(map.zoom, 2.05))}
          />
        </div>
      </div>
    </div>
  );
}

function LocationRow({
  loc,
  active,
  onPick,
}: {
  loc: TownLocation;
  active: boolean;
  onPick: () => void;
}) {
  return (
    <button
      onClick={onPick}
      className={
        "flex w-full items-center gap-3 rounded-md px-3 py-2 text-left " +
        (active ? "bg-surface-2" : "hover:bg-surface-2")
      }
    >
      <span
        className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full text-[11px] font-medium"
        style={{ background: KIND_COLOR[loc.kind], color: pinFg(loc.kind) }}
      >
        {loc.id}
      </span>
      <span className="min-w-0 flex-1">
        <span className="block truncate text-sm">{loc.name}</span>
        <span className="block truncate text-[11px] text-subtle">
          {DISTRICT_LABEL[loc.district]}
          {loc.hidden ? " · скрыто" : ""}
        </span>
      </span>
    </button>
  );
}

function Pin({
  loc,
  left,
  top,
  primary,
  active,
}: {
  loc: TownLocation;
  left: number;
  top: number;
  primary: boolean;
  active: boolean;
}) {
  return (
    <div
      title={`${loc.id}. ${loc.name}`}
      className="absolute z-10 flex h-11 w-11 -translate-x-1/2 -translate-y-1/2 items-center justify-center"
      style={{ left, top }}
    >
      <span
        className={
          "flex items-center justify-center rounded-full border text-[11px] font-medium " +
          (active ? "h-8 w-8 border-fg bg-fg text-accent-fg" : "h-7 w-7")
        }
        style={
          active
            ? undefined
            : {
                background: loc.hidden ? "#141613" : "#e6e2d6",
                color: loc.hidden ? "#e6e2d6" : "#0b0c0a",
                borderColor: KIND_COLOR[loc.kind],
                opacity: primary ? 1 : 0.72,
              }
        }
      >
        {loc.id}
      </span>
    </div>
  );
}

function Dossier({
  loc,
  passages,
  fromTitle,
  onEnterHospital,
  onOpenPassage,
  onLink,
}: {
  loc: TownLocation;
  passages: ReturnType<typeof passagesForTown>;
  fromTitle?: boolean;
  onEnterHospital: () => void;
  onOpenPassage: (roomId: string) => void;
  onLink: (id: number) => void;
}) {
  return (
    <section className="max-h-[44%] overflow-y-auto border-t border-border bg-surface/95 px-4 py-3 md:max-h-[36%]">
      <div className="flex flex-wrap items-start gap-3">
        <span
          className="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-sm font-medium"
          style={{ background: KIND_COLOR[loc.kind], color: pinFg(loc.kind) }}
        >
          {loc.id}
        </span>
        <div className="min-w-0 flex-1">
          <p className="font-display text-lg leading-tight">{loc.name}</p>
          <p className="text-xs text-muted">
            {DISTRICT_LABEL[loc.district]} · {KIND_LABEL[loc.kind]} · серии {loc.episodes}
          </p>
        </div>
        {loc.id === 1 && (
          <button
            onClick={onEnterHospital}
            className="h-10 rounded-md bg-fg px-4 text-sm font-medium text-accent-fg"
          >
            {fromTitle ? "Войти с юга" : "Вернуться в корпус"}
          </button>
        )}
      </div>
      <p className="mt-3 max-w-3xl text-sm leading-relaxed text-fg/90">{loc.blurb}</p>
      <p className="mt-2 max-w-3xl text-xs leading-relaxed text-muted">{loc.note}</p>
      {loc.links.length > 0 && (
        <div className="mt-3 flex flex-wrap gap-1.5">
          {loc.links.map((id) => {
            const o = locById(id);
            if (!o) return null;
            return (
              <button
                key={id}
                onClick={() => onLink(id)}
                className="h-10 rounded-sm bg-surface-2 px-2.5 text-xs text-fg"
              >
                {id}. {o.name}
              </button>
            );
          })}
        </div>
      )}
      {passages.length > 0 && (
        <div className="mt-3 flex flex-wrap gap-2">
          {passages.map((p, i) =>
            p.roomId ? (
              <button
                key={p.roomId + i}
                onClick={() => onOpenPassage(p.roomId!)}
                className="h-10 rounded-sm border border-border px-3 text-xs text-accent"
              >
                Переход · {p.door}
              </button>
            ) : (
              <span
                key={i}
                className="flex h-10 items-center rounded-sm border border-border px-3 text-xs text-muted"
              >
                {p.door}
              </span>
            ),
          )}
        </div>
      )}
    </section>
  );
}
