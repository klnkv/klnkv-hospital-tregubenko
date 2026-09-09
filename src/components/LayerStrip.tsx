import { useEffect, useState } from "react";

export type LayerItem<K extends string> = { id: K; label: string };

export type LayerVis = { on: boolean; opacity: number };

export function fullVis<K extends string>(ids: readonly K[]): Record<K, LayerVis> {
  return Object.fromEntries(ids.map((id) => [id, { on: true, opacity: 1 }])) as Record<K, LayerVis>;
}

export function useLayerVis<K extends string>(storageKey: string, fallback: Record<K, LayerVis>) {
  const [layers, setLayers] = useState<Record<K, LayerVis>>(() => readVis(storageKey, fallback));

  useEffect(() => {
    try {
      localStorage.setItem(storageKey, JSON.stringify(layers));
    } catch {
      /* private mode */
    }
  }, [storageKey, layers]);

  return {
    layers,
    setOn: (id: K, on: boolean) => setLayers((p) => ({ ...p, [id]: { ...p[id]!, on } })),
    setOpacity: (id: K, opacity: number) =>
      setLayers((p) => ({ ...p, [id]: { ...p[id]!, opacity: clamp01(opacity) } })),
    all: (on: boolean) =>
      setLayers((p) => {
        const next = { ...p };
        for (const k of Object.keys(next) as K[]) next[k] = { ...next[k]!, on };
        return next;
      }),
    reset: () => setLayers(fallback),
  };
}

function clamp01(n: number) {
  return Math.min(1, Math.max(0, n));
}

function readVis<K extends string>(key: string, fallback: Record<K, LayerVis>): Record<K, LayerVis> {
  try {
    const raw = localStorage.getItem(key);
    if (!raw) return fallback;
    const parsed = JSON.parse(raw) as Record<string, Partial<LayerVis>>;
    const next = { ...fallback };
    for (const k of Object.keys(fallback) as K[]) {
      const v = parsed[k];
      if (!v) continue;
      next[k] = {
        on: typeof v.on === "boolean" ? v.on : fallback[k]!.on,
        opacity: typeof v.opacity === "number" ? clamp01(v.opacity) : fallback[k]!.opacity,
      };
    }
    return next;
  } catch {
    return fallback;
  }
}

export function LayerVisibility<K extends string>({
  title = "Видимость слоёв",
  items,
  vis,
}: {
  title?: string;
  items: LayerItem<K>[];
  vis: ReturnType<typeof useLayerVis<K>>;
}) {
  const [open, setOpen] = useState(true);
  const visible = items.filter((l) => vis.layers[l.id]?.on).length;

  return (
    <div
      className="absolute left-3 top-3 z-20 w-[min(100%-1.5rem,17.5rem)] rounded-md border border-border bg-surface/95 shadow-lg"
      onPointerDown={(e) => e.stopPropagation()}
      onTouchStart={(e) => e.stopPropagation()}
    >
      <div className="flex items-center gap-2 border-b border-border px-3 py-2">
        <button
          type="button"
          className="min-w-0 flex-1 text-left"
          onClick={() => setOpen((v) => !v)}
        >
          <p className="font-mono text-[10px] uppercase tracking-[0.16em] text-subtle">{title}</p>
          <p className="text-xs text-muted">
            {visible} / {items.length}
          </p>
        </button>
        <button
          type="button"
          className="h-10 rounded-sm px-2 text-xs text-muted"
          onClick={() => vis.all(true)}
        >
          Все
        </button>
        <button
          type="button"
          className="h-10 rounded-sm px-2 text-xs text-muted"
          onClick={() => vis.reset()}
        >
          Сброс
        </button>
      </div>
      {open && (
        <ul className="max-h-[min(52vh,22rem)] space-y-1 overflow-y-auto px-2 py-2">
          {items.map((l) => {
            const row = vis.layers[l.id] ?? { on: true, opacity: 1 };
            return (
              <li key={l.id} className="rounded-sm px-1 py-1">
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    aria-pressed={row.on}
                    aria-label={row.on ? `Скрыть ${l.label}` : `Показать ${l.label}`}
                    onClick={() => vis.setOn(l.id, !row.on)}
                    className={
                      "flex h-10 w-10 shrink-0 items-center justify-center rounded-sm " +
                      (row.on ? "bg-accent text-accent-fg" : "bg-surface-2 text-subtle")
                    }
                  >
                    <EyeIcon off={!row.on} />
                  </button>
                  <span className={"min-w-0 flex-1 truncate text-sm " + (row.on ? "text-fg" : "text-muted")}>
                    {l.label}
                  </span>
                  <span className="w-8 text-right font-mono text-[10px] text-subtle">
                    {Math.round(row.opacity * 100)}
                  </span>
                </div>
                <input
                  type="range"
                  min={0}
                  max={100}
                  value={Math.round(row.opacity * 100)}
                  disabled={!row.on}
                  aria-label={`Прозрачность: ${l.label}`}
                  onChange={(e) => vis.setOpacity(l.id, Number(e.target.value) / 100)}
                  className="mt-1 h-10 w-full accent-accent disabled:opacity-40"
                />
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}

function EyeIcon({ off }: { off: boolean }) {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" aria-hidden>
      <path d="M2 12s3.6-7 10-7 10 7 10 7-3.6 7-10 7S2 12 2 12Z" />
      <circle cx="12" cy="12" r="3" />
      {off && <path d="M4 20 L20 4" />}
    </svg>
  );
}
