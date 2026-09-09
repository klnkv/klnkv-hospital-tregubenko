export type LayerItem<K extends string> = { id: K; label: string };

export function LayerStrip<K extends string>({
  layers,
  active,
  onToggle,
}: {
  layers: LayerItem<K>[];
  active: Record<K, boolean>;
  onToggle: (id: K) => void;
}) {
  return (
    <div className="pointer-events-none absolute left-3 top-3 z-20 flex max-w-[min(100%-5rem,40rem)] flex-wrap gap-1">
      <p className="pointer-events-none mr-1 flex h-10 items-center font-mono text-[10px] uppercase tracking-[0.16em] text-subtle">
        Слои
      </p>
      {layers.map((l) => (
        <button
          key={l.id}
          type="button"
          onClick={() => onToggle(l.id)}
          className={
            "pointer-events-auto h-10 shrink-0 rounded-sm px-3 text-xs " +
            (active[l.id] ? "bg-accent text-accent-fg" : "border border-border bg-surface/90 text-muted")
          }
        >
          {l.label}
        </button>
      ))}
    </div>
  );
}

export function toggleLayer<K extends string>(
  prev: Record<K, boolean>,
  id: K,
): Record<K, boolean> {
  return { ...prev, [id]: !prev[id] };
}
