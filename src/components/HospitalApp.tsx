import { useEffect, useRef, useState } from "react";
import { FLOOR_LABEL, FLOOR_ORDER, FLOOR_PLAN_IMG, TYPE_COLOR, TYPE_LABEL } from "@/game/constants";
import { mountEngine, type Engine } from "@/game/engine";
import { allRooms, cx, cy, roomsOn } from "@/game/layout";
import { findPassage, locById } from "@/game/town";
import { SHOTS, type ShotId } from "@/game/shots";
import type { FloorId, GameMode, GameSnapshot } from "@/game/types";
import { TownAtlas } from "@/components/TownAtlas";
import { FloorDrawnPlan, FLOOR_LAYER_ITEMS, FLOOR_LAYER_VIS } from "@/components/FloorDrawnPlan";
import { LayerVisibility, useLayerVis } from "@/components/LayerStrip";
import { usePanZoom } from "@/components/usePanZoom";
import { LookDevDock } from "@/components/LookDevDock";

const emptySnap: GameSnapshot = {
  mode: "title",
  floor: "F1",
  roomId: null,
  roomName: "",
  x: 0,
  y: 0,
  z: 0,
  yaw: 0,
  speed: 0,
  locked: false,
  labels: true,
  shotId: null,
};

export function HospitalApp() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const engineRef = useRef<Engine | null>(null);
  const [snap, setSnap] = useState<GameSnapshot>(emptySnap);
  const [catalogOpen, setCatalogOpen] = useState(false);
  const [planOpen, setPlanOpen] = useState(false);
  const [townOpen, setTownOpen] = useState(false);
  const [townFocus, setTownFocus] = useState<number | null>(null);
  const [query, setQuery] = useState("");
  const [filterFloor, setFilterFloor] = useState<FloorId | "ALL">("F1");
  const [bootError, setBootError] = useState<string | null>(null);
  const returnMode = useRef<GameMode>("walk");

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    try {
      const eng = mountEngine(canvas, () => {
        setSnap(eng.snapshot());
      });
      engineRef.current = eng;
      setSnap(eng.snapshot());
      return () => eng.dispose();
    } catch (err) {
      setBootError(err instanceof Error ? err.message : String(err));
    }
  }, []);

  const passage = findPassage(snap.roomId, snap.floor, snap.x, snap.y);

  const openTown = (id?: number) => {
    returnMode.current = snap.mode === "title" ? "title" : snap.mode === "walk" ? "walk" : snap.mode;
    if (snap.mode === "walk") engineRef.current?.setMode("orbit");
    setTownFocus(id ?? null);
    setPlanOpen(false);
    setCatalogOpen(false);
    setTownOpen(true);
  };

  const closeTown = () => {
    setTownOpen(false);
    if (returnMode.current === "walk") engineRef.current?.setMode("walk");
    else if (returnMode.current === "title") engineRef.current?.setMode("title");
  };

  const enter = () => {
    engineRef.current?.setMode("walk");
    setTownOpen(false);
    setSnap((s) => ({ ...s, mode: "walk" }));
  };

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.repeat) return;
      const t = e.target as HTMLElement | null;
      if (t && (t.tagName === "INPUT" || t.tagName === "TEXTAREA" || t.tagName === "SELECT")) return;
      if (e.code === "KeyG") {
        if (townOpen) closeTown();
        else openTown(1);
      }
      if (e.code === "KeyF" && passage && !townOpen) {
        openTown(passage.townId);
      }
      if (e.code === "Escape" && townOpen) closeTown();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  });

  const rooms = allRooms();
  const filtered = rooms.filter((r) => {
    if (filterFloor !== "ALL" && r.floor !== filterFloor) return false;
    if (!query.trim()) return true;
    const q = query.toLowerCase();
    return r.id.toLowerCase().includes(q) || r.name.toLowerCase().includes(q);
  });

  return (
    <div className="relative h-dvh w-full overflow-hidden bg-bg text-fg">
      <canvas
        ref={canvasRef}
        className="absolute inset-0 h-full w-full touch-none"
        onContextMenu={(e) => e.preventDefault()}
      />
      <LookDevDock placement={snap.mode === "title" && !townOpen ? "title" : "hud"} />

      {bootError && (
        <div className="absolute inset-0 z-30 flex items-center justify-center bg-bg p-6 text-fg">
          <p className="max-w-md text-sm">{bootError}</p>
        </div>
      )}

      {snap.mode === "title" && !townOpen && (
        <TitleScreen
          onEnter={enter}
          onOrbit={() => {
            engineRef.current?.setMode("orbit");
            setSnap((s) => ({ ...s, mode: "orbit" }));
          }}
          onShot={() => {
            engineRef.current?.setShot("gate");
            setSnap((s) => ({ ...s, mode: "shot", shotId: "gate" }));
          }}
          onTown={() => openTown(1)}
        />
      )}
      {snap.mode !== "title" && !townOpen && (
        <>
          <TopBar
            snap={snap}
            onFloor={(f) => engineRef.current?.setFloor(f)}
            onMode={(m) => {
              if (m === "plan") {
                setPlanOpen(true);
                return;
              }
              engineRef.current?.setMode(m);
            }}
            onShot={(id) => engineRef.current?.setShot(id)}
            onCatalog={() => setCatalogOpen((v) => !v)}
            onPlan={() => setPlanOpen(true)}
            onTown={() => openTown(1)}
          />
          {snap.mode === "shot" && (
            <ShotStrip
              current={snap.shotId}
              onPick={(id) => engineRef.current?.setShot(id)}
            />
          )}
          <FloorStack
            current={snap.floor}
            onPick={(f) => engineRef.current?.setFloor(f)}
          />
          <Minimap floor={snap.floor} x={snap.x} y={snap.y} yaw={snap.yaw} />
          <BottomHint snap={snap} />
          {passage && snap.mode === "walk" && (
            <button
              onClick={() => openTown(passage.townId)}
              className="absolute bottom-24 left-1/2 z-10 h-11 -translate-x-1/2 rounded-md border border-accent/50 bg-surface/90 px-4 text-sm text-fg md:bottom-8"
            >
              Скрытый переход · F · {locById(passage.townId)?.name}
            </button>
          )}
          {!snap.locked && snap.mode === "walk" && !passage && (
            <div className="pointer-events-none absolute inset-x-0 bottom-24 z-10 flex justify-center md:bottom-8">
              <p className="rounded-md border border-border bg-surface/80 px-4 py-2 text-sm text-muted">
                Нажмите, чтобы осмотреться
              </p>
            </div>
          )}
          <MobileStick active={snap.mode === "walk"} />
        </>
      )}

      {planOpen && snap.mode !== "title" && !townOpen && (
        <PlanSheet
          floor={snap.floor}
          x={snap.x}
          y={snap.y}
          yaw={snap.yaw}
          onClose={() => {
            setPlanOpen(false);
            if (engineRef.current?.snapshot().mode === "plan") engineRef.current.setMode("walk");
          }}
          onFloor={(f) => engineRef.current?.setFloor(f)}
        />
      )}

      {townOpen && (
        <TownAtlas
          focusId={townFocus}
          fromTitle={returnMode.current === "title"}
          onClose={closeTown}
          onEnterHospital={enter}
          onOpenPassage={(roomId) => {
            const r = rooms.find((x) => x.id === roomId);
            if (!r) return;
            engineRef.current?.teleportTo(r.floor, cx(r), cy(r));
            engineRef.current?.setMode("walk");
            setTownOpen(false);
          }}
        />
      )}

      {catalogOpen && snap.mode !== "title" && !townOpen && (
        <aside className="absolute bottom-0 right-0 top-14 z-20 flex w-full max-w-md flex-col border-l border-border bg-surface/95 md:top-16">
          <div className="flex items-center gap-2 border-b border-border px-4 py-3">
            <div>
              <p className="font-display text-lg text-fg">Объекты</p>
              <p className="text-xs text-muted">{rooms.length} помещений · библия V6</p>
            </div>
            <button
              className="ml-auto h-10 rounded-sm border border-border px-3 text-sm text-muted"
              onClick={() => setCatalogOpen(false)}
            >
              Закрыть
            </button>
          </div>
          <div className="flex gap-2 px-4 py-3">
            <input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Поиск по ID или имени"
              className="h-10 flex-1 rounded-md border border-border bg-bg px-3 text-sm text-fg outline-none"
            />
          </div>
          <div className="flex gap-1 overflow-x-auto px-4 pb-2">
            {(["ALL", ...FLOOR_ORDER] as const).map((f) => (
              <button
                key={f}
                onClick={() => setFilterFloor(f)}
                className={
                  "h-10 shrink-0 rounded-sm px-2.5 text-xs " +
                  (filterFloor === f ? "bg-accent text-accent-fg" : "bg-surface-2 text-muted")
                }
              >
                {f === "ALL" ? "Все" : f}
              </button>
            ))}
          </div>
          <div className="min-h-0 flex-1 overflow-y-auto px-2 pb-4">
            {filtered.slice(0, 200).map((r) => (
              <button
                key={r.id}
                className="flex w-full items-center gap-3 rounded-md px-3 py-2 text-left hover:bg-surface-2"
                onClick={() => {
                  engineRef.current?.teleportTo(r.floor, cx(r), cy(r));
                  engineRef.current?.setMode("walk");
                  setCatalogOpen(false);
                }}
              >
                <span
                  className="h-2.5 w-2.5 shrink-0 rounded-full"
                  style={{ background: TYPE_COLOR[r.type] }}
                />
                <span className="min-w-0 flex-1">
                  <span className="block truncate font-mono text-xs text-accent">{r.id}</span>
                  <span className="block truncate text-sm">{r.name}</span>
                </span>
                <span className="text-[10px] uppercase tracking-wide text-subtle">
                  {TYPE_LABEL[r.type]}
                </span>
              </button>
            ))}
          </div>
        </aside>
      )}
    </div>
  );
}

function TitleScreen({
  onEnter,
  onOrbit,
  onShot,
  onTown,
}: {
  onEnter: () => void;
  onOrbit: () => void;
  onShot: () => void;
  onTown: () => void;
}) {
  return (
    <div className="absolute inset-0 z-10 flex flex-col justify-end bg-gradient-to-t from-bg via-bg/50 to-transparent p-6 md:p-12">
      <p className="text-xs tracking-[0.28em] text-accent uppercase">Last Resort Town · Season 1 · 60 серий</p>
      <h1 className="mt-2 font-display text-4xl leading-tight text-fg md:text-6xl">Больница №6</h1>
      <p className="mt-3 max-w-xl text-sm text-muted md:text-base">
        Один город. Одна геометрия. 31 точка на карте, корпус B1–F6, скрытые двери из палат в улицы.
        Город, который помнит.
      </p>
      <p className="mt-2 font-display text-sm italic text-fg/80">Здесь всё связано. Даже то, что не может быть связано.</p>
      <p className="mt-2 text-xs text-muted">Look-dev · Кристина</p>
      <div className="mt-6 flex flex-wrap gap-3">
        <button
          onClick={onTown}
          className="h-12 rounded-md bg-fg px-6 text-sm font-medium text-accent-fg"
        >
          Карта города
        </button>
        <button
          onClick={onEnter}
          className="h-12 rounded-md border border-border px-6 text-sm text-fg"
        >
          От ворот к дверям
        </button>
        <button
          onClick={onShot}
          className="h-12 rounded-md border border-border px-6 text-sm text-fg"
        >
          Планы у ворот
        </button>
        <button
          onClick={onOrbit}
          className="h-12 rounded-md border border-border px-6 text-sm text-fg"
        >
          Орбита
        </button>
      </div>
      <p className="mt-4 text-xs text-subtle">WASD · 1–3 планы у ворот · P пол · G город · M план · E/Q этаж</p>
    </div>
  );
}

function TopBar({
  snap,
  onFloor,
  onMode,
  onShot,
  onCatalog,
  onPlan,
  onTown,
}: {
  snap: GameSnapshot;
  onFloor: (f: FloorId) => void;
  onMode: (m: "walk" | "orbit" | "plan" | "shot") => void;
  onShot: (id: ShotId) => void;
  onCatalog: () => void;
  onPlan: () => void;
  onTown: () => void;
}) {
  return (
    <header className="absolute left-0 right-0 top-0 z-10 flex items-center gap-2 border-b border-border/80 bg-bg/70 px-3 py-2 backdrop-blur-sm md:px-4">
      <div className="min-w-0">
        <p className="truncate font-display text-sm md:text-base">Больница №6</p>
        <p className="truncate font-mono text-[10px] text-muted md:text-xs">
          {snap.mode === "shot"
            ? SHOTS.find((s) => s.id === snap.shotId)?.hint ?? "Пол"
            : `${snap.roomId ?? "EXT"} · ${snap.roomName}`}
        </p>
      </div>
      <div className="ml-auto flex items-center gap-1.5">
        {(["walk", "orbit", "plan"] as const).map((m) => (
          <button
            key={m}
            onClick={() => onMode(m)}
            className={
              "hidden h-10 rounded-sm px-3 text-xs md:inline-flex md:items-center " +
              (snap.mode === m ? "bg-accent text-accent-fg" : "bg-surface-2 text-muted")
            }
          >
            {m === "walk" ? "Ход" : m === "orbit" ? "Орбита" : "План"}
          </button>
        ))}
        <button
          onClick={() => onShot("gate")}
          className={
            "hidden h-10 rounded-sm px-3 text-xs md:inline-flex md:items-center " +
            (snap.mode === "shot" ? "bg-accent text-accent-fg" : "bg-surface-2 text-muted")
          }
        >
          Пол
        </button>
        <select
          className="h-10 rounded-sm border border-border bg-surface px-2 text-xs text-fg md:hidden"
          value={snap.floor}
          onChange={(e) => onFloor(e.target.value as FloorId)}
        >
          {FLOOR_ORDER.map((f) => (
            <option key={f} value={f}>
              {FLOOR_LABEL[f]}
            </option>
          ))}
        </select>
        <button onClick={onTown} className="h-10 rounded-sm bg-fg px-3 text-xs font-medium text-accent-fg">
          Город
        </button>
        <button onClick={onPlan} className="h-10 rounded-sm bg-surface-2 px-3 text-xs text-fg">
          Карта
        </button>
        <button onClick={onCatalog} className="h-10 rounded-sm bg-surface-2 px-3 text-xs text-fg">
          Объекты
        </button>
      </div>
    </header>
  );
}

function ShotStrip({
  current,
  onPick,
}: {
  current: string | null;
  onPick: (id: ShotId) => void;
}) {
  return (
    <div className="absolute bottom-20 left-1/2 z-10 flex -translate-x-1/2 gap-1 rounded-md border border-border bg-bg/85 p-1">
      {SHOTS.map((s, i) => (
        <button
          key={s.id}
          onClick={() => onPick(s.id)}
          className={
            "h-11 rounded-sm px-3 text-xs " +
            (current === s.id ? "bg-accent text-accent-fg" : "text-fg")
          }
        >
          {i + 1} · {s.name}
        </button>
      ))}
    </div>
  );
}

function FloorStack({
  current,
  onPick,
}: {
  current: FloorId;
  onPick: (f: FloorId) => void;
}) {
  return (
    <nav className="absolute left-3 top-16 z-10 hidden flex-col gap-1 md:flex">
      {FLOOR_ORDER.map((f) => (
        <button
          key={f}
          onClick={() => onPick(f)}
          className={
            "h-10 rounded-sm px-3 text-left text-xs " +
            (current === f ? "bg-accent text-accent-fg" : "bg-bg/70 text-muted")
          }
        >
          {FLOOR_LABEL[f]}
        </button>
      ))}
    </nav>
  );
}

function Minimap({
  floor,
  x,
  y,
  yaw,
}: {
  floor: FloorId;
  x: number;
  y: number;
  yaw: number;
}) {
  const ref = useRef<HTMLCanvasElement>(null);
  useEffect(() => {
    const c = ref.current;
    if (!c) return;
    const ctx = c.getContext("2d");
    if (!ctx) return;
    const w = c.width;
    const h = c.height;
    ctx.fillStyle = "#0b0c0a";
    ctx.fillRect(0, 0, w, h);
    const sx = w / 140;
    const sy = h / 100;
    const tx = (bx: number) => (bx + 70) * sx;
    const ty = (by: number) => (50 - by) * sy;
    ctx.fillStyle = "#1c2418";
    ctx.fillRect(tx(-18), ty(14), 36 * sx, 28 * sy);
    for (const r of roomsOn(floor)) {
      ctx.fillStyle = TYPE_COLOR[r.type] + "cc";
      ctx.fillRect(tx(r.x0), ty(r.y1), (r.x1 - r.x0) * sx, (r.y1 - r.y0) * sy);
    }
    ctx.fillStyle = "#e6e2d6";
    ctx.beginPath();
    ctx.arc(tx(x), ty(y), 3.5, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = "#9aaa90";
    ctx.beginPath();
    ctx.moveTo(tx(x), ty(y));
    ctx.lineTo(tx(x - Math.sin(yaw) * 6), ty(y + Math.cos(yaw) * 6));
    ctx.stroke();
  }, [floor, x, y, yaw]);

  const img = FLOOR_PLAN_IMG[floor];
  return (
    <div className="absolute bottom-16 right-3 z-10 hidden overflow-hidden rounded-md border border-border bg-bg/80 md:block">
      {img && (
        <img src={img} alt="" className="absolute inset-0 h-full w-full object-cover opacity-25" />
      )}
      <canvas ref={ref} width={220} height={160} className="relative block" />
      <p className="relative px-2 py-1 font-mono text-[10px] text-muted">
        {x.toFixed(1)} · {y.toFixed(1)} · {floor}
      </p>
    </div>
  );
}

function PlanSheet({
  floor,
  x,
  y,
  yaw,
  onClose,
  onFloor,
}: {
  floor: FloorId;
  x: number;
  y: number;
  yaw: number;
  onClose: () => void;
  onFloor: (f: FloorId) => void;
}) {
  const PLAN_W = 1400;
  const PLAN_H = 1050;
  const map = usePanZoom({
    contentW: PLAN_W,
    contentH: PLAN_H,
    minZoom: 0.9,
    maxZoom: 18,
    initialZoom: 1,
  });
  const fitted = useRef(false);
  const vis = useLayerVis("h6-layers-floor", FLOOR_LAYER_VIS);
  const layers = vis.layers;

  useEffect(() => {
    fitted.current = false;
  }, [floor]);

  useEffect(() => {
    if (fitted.current || map.view.w < 40) return;
    fitted.current = true;
    map.centerNorm(0.5, 0.5, 1);
  }, [map.view.w, map.view.h, map]);

  return (
    <div className="absolute inset-0 z-30 flex flex-col bg-bg">
      <div className="flex items-center gap-2 border-b border-border px-4 py-3">
        <p className="font-display text-lg">План · {FLOOR_LABEL[floor]}</p>
        <button
          className="ml-auto h-10 rounded-sm border border-border px-3 text-sm text-muted"
          onClick={onClose}
        >
          Закрыть
        </button>
      </div>
      <div className="flex gap-1 overflow-x-auto px-4 py-2">
        {FLOOR_ORDER.map((f) => (
          <button
            key={f}
            onClick={() => onFloor(f)}
            className={
              "h-10 shrink-0 rounded-sm px-3 text-xs " +
              (floor === f ? "bg-accent text-accent-fg" : "bg-surface-2 text-muted")
            }
          >
            {f}
          </button>
        ))}
      </div>
      <div className="relative min-h-0 flex-1">
        <div
          ref={map.ref}
          className="absolute inset-0 cursor-grab touch-none overflow-hidden overscroll-none active:cursor-grabbing"
          onPointerDown={map.onPointerDown}
          onPointerMove={map.onPointerMove}
          onPointerUp={map.onPointerUp}
          onPointerCancel={map.onPointerUp}
        >
          <div className="absolute left-0 top-0 origin-top-left" style={map.contentStyle}>
            <FloorDrawnPlan floor={floor} marker={{ x, y, yaw }} layers={layers} />
          </div>
        </div>
        <LayerVisibility items={FLOOR_LAYER_ITEMS} vis={vis} />
        <ZoomHud zoom={map.zoom} onMinus={() => map.bump(0.82)} onPlus={() => map.bump(1.22)} />
      </div>
    </div>
  );
}

function ZoomHud({
  zoom,
  onMinus,
  onPlus,
}: {
  zoom: number;
  onMinus: () => void;
  onPlus: () => void;
}) {
  return (
    <div className="pointer-events-none absolute bottom-3 right-3 z-10 flex items-center gap-1">
      <p className="mr-1 rounded-sm border border-border bg-bg/80 px-2 py-1 font-mono text-[10px] text-muted">
        щипок · {zoom.toFixed(1)}×
      </p>
      <button
        type="button"
        onClick={onMinus}
        className="pointer-events-auto h-10 w-10 rounded-sm border border-border bg-surface text-lg text-fg"
        aria-label="Отдалить"
      >
        −
      </button>
      <button
        type="button"
        onClick={onPlus}
        className="pointer-events-auto h-10 w-10 rounded-sm border border-border bg-surface text-lg text-fg"
        aria-label="Приблизить"
      >
        +
      </button>
    </div>
  );
}

function BottomHint({ snap }: { snap: GameSnapshot }) {
  return (
    <div className="absolute bottom-32 left-3 right-3 z-10 flex items-end justify-between gap-3 md:bottom-3 md:right-auto">
      <div className="rounded-md border border-border bg-bg/75 px-3 py-2">
        <p className="font-mono text-[10px] text-accent">{snap.floor}</p>
        <p className="text-sm text-fg">{snap.roomName}</p>
        <p className="hidden text-[11px] text-subtle md:block">
          {snap.mode === "shot"
            ? "1 ворота · 2 машина · 3 такси · P / Ход — идти"
            : "WASD ход · Shift бег · E/Q лестница · 1–3 пол · G город"}
        </p>
      </div>
    </div>
  );
}

function MobileStick({ active }: { active: boolean }) {
  const svgRef = useRef<SVGSVGElement>(null);
  const [gone, setGone] = useState<Record<string, boolean>>({});

  useEffect(() => {
    try {
      const raw = sessionStorage.getItem("hospital6-guides-v5");
      if (raw) setGone(JSON.parse(raw) as Record<string, boolean>);
    } catch {
      /* ignore */
    }
  }, []);

  const dismiss = (id: string) => {
    setGone((g) => {
      if (g[id]) return g;
      const next = { ...g, [id]: true };
      try {
        sessionStorage.setItem("hospital6-guides-v5", JSON.stringify(next));
      } catch {
        /* ignore */
      }
      return next;
    });
  };

  useEffect(() => {
    if (!active) return;
    const hitId = (clientX: number, clientY: number): string | null => {
      const svg = svgRef.current;
      if (!svg) return null;
      const ctm = svg.getScreenCTM();
      if (!ctm) return null;
      const pt = svg.createSVGPoint();
      pt.x = clientX;
      pt.y = clientY;
      const p = pt.matrixTransform(ctm.inverse());
      const rings: Array<{ id: string; x: number; y: number }> = [
        { id: "ringL", x: 64, y: 59 },
        { id: "ringR", x: 296, y: 59 },
      ];
      let best: { id: string; dist: number } | null = null;
      for (const r of rings) {
        const dist = Math.hypot(p.x - r.x, p.y - r.y);
        if (dist > 54) continue;
        const ticks =
          r.id === "ringL"
            ? [
                { id: "n", ang: -90 },
                { id: "e", ang: 0 },
                { id: "s", ang: 90 },
                { id: "w", ang: 180 },
              ]
            : [
                { id: "ne", ang: -45 },
                { id: "se", ang: 45 },
                { id: "sw", ang: 135 },
                { id: "nw", ang: 225 },
              ];
        if (dist < 20) return r.id;
        const ang = (Math.atan2(p.y - r.y, p.x - r.x) * 180) / Math.PI;
        let nearest = ticks[0]!;
        let gap = 999;
        for (const t of ticks) {
          let d = Math.abs(ang - t.ang);
          if (d > 180) d = 360 - d;
          if (d < gap) {
            gap = d;
            nearest = t;
          }
        }
        if (dist > 24 && gap < 32) return nearest.id;
        if (!best || dist < best.dist) best = { id: r.id, dist };
      }
      return best && best.dist < 50 ? best.id : null;
    };

    const onStart = (e: TouchEvent) => {
      const t = e.changedTouches[0];
      if (!t) return;
      const id = hitId(t.clientX, t.clientY);
      if (id) dismiss(id);
    };
    window.addEventListener("touchstart", onStart, { passive: true });
    return () => window.removeEventListener("touchstart", onStart);
  }, [active]);

  if (!active) return null;
  const allGone =
    gone.ringL &&
    gone.ringR &&
    gone.n &&
    gone.e &&
    gone.s &&
    gone.w &&
    gone.ne &&
    gone.se &&
    gone.sw &&
    gone.nw;
  if (allGone) return null;

  const vis = (id: string) => (gone[id] ? 0 : 1);
  const bothRings = vis("ringL") && vis("ringR");

  return (
    <div className="pointer-events-none absolute inset-x-0 bottom-3 z-20 px-2 md:hidden">
      <svg
        ref={svgRef}
        viewBox="0 0 360 118"
        className="guide-svg mx-auto h-28 w-full max-w-md overflow-visible text-fg"
        fill="none"
        stroke="currentColor"
        aria-hidden
      >
        <g stroke="currentColor" fill="none" strokeLinecap="round" strokeLinejoin="round">
          <g opacity={bothRings ? 1 : 0} style={{ transition: "opacity 280ms ease" }}>
            <path d="M64 17 H296" stroke="var(--color-bg)" strokeWidth="5" />
            <path d="M64 101 H296" stroke="var(--color-bg)" strokeWidth="5" />
            <path d="M64 17 H296" strokeWidth="2.2" strokeDasharray="6 7" />
            <path d="M64 101 H296" strokeWidth="2.2" strokeDasharray="6 7" />
          </g>

          <g style={{ opacity: vis("ringL"), transition: "opacity 280ms ease" }}>
            <path d="M64 17 A 42 42 0 0 0 64 101" stroke="var(--color-bg)" strokeWidth="5" />
            <path d="M64 17 A 42 42 0 0 0 64 101" strokeWidth="2.3" />
            <circle cx="64" cy="59" r="14" strokeWidth="1.4" strokeDasharray="3 5" />
          </g>
          <Tick cx={64} cy={59} deg={-90} hidden={!!gone.n} />
          <Tick cx={64} cy={59} deg={0} hidden={!!gone.e} />
          <Tick cx={64} cy={59} deg={90} hidden={!!gone.s} />
          <Tick cx={64} cy={59} deg={180} hidden={!!gone.w} />

          <g style={{ opacity: vis("ringR"), transition: "opacity 280ms ease" }}>
            <path d="M296 17 A 42 42 0 0 1 296 101" stroke="var(--color-bg)" strokeWidth="5" />
            <path d="M296 17 A 42 42 0 0 1 296 101" strokeWidth="2.3" strokeDasharray="6 7" />
            <circle cx="296" cy="59" r="14" strokeWidth="1.4" strokeDasharray="2 4" />
          </g>
          <Tick cx={296} cy={59} deg={-45} hidden={!!gone.ne} short />
          <Tick cx={296} cy={59} deg={45} hidden={!!gone.se} short />
          <Tick cx={296} cy={59} deg={135} hidden={!!gone.sw} short />
          <Tick cx={296} cy={59} deg={225} hidden={!!gone.nw} short />
        </g>
      </svg>
    </div>
  );
}

function Tick({
  cx,
  cy,
  deg,
  hidden,
  short,
}: {
  cx: number;
  cy: number;
  deg: number;
  hidden?: boolean;
  short?: boolean;
}) {
  const a = (deg * Math.PI) / 180;
  const r1 = 24;
  const r2 = short ? 38 : 42;
  return (
    <g style={{ opacity: hidden ? 0 : 0.95, transition: "opacity 220ms ease" }}>
      <line
        x1={cx + Math.cos(a) * r1}
        y1={cy + Math.sin(a) * r1}
        x2={cx + Math.cos(a) * r2}
        y2={cy + Math.sin(a) * r2}
        stroke="var(--color-bg)"
        strokeWidth="4.4"
        strokeLinecap="round"
      />
      <line
        x1={cx + Math.cos(a) * r1}
        y1={cy + Math.sin(a) * r1}
        x2={cx + Math.cos(a) * r2}
        y2={cy + Math.sin(a) * r2}
        stroke="currentColor"
        strokeWidth="2.1"
        strokeDasharray="3 5"
        strokeLinecap="round"
      />
    </g>
  );
}
