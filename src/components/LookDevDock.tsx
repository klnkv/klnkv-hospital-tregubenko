import { useEffect, useState } from "react";
import { LOOKDEV_EDITS, LOOKDEV_RELEASE, LOOKDEV_VIEWER, formatKyiv } from "@/game/changelog";
import { publicUrl } from "@/game/constants";

type RemoteStamp = { builtAt: string; release?: string };

const LOCAL_BUILT = import.meta.env.VITE_BUILD_AT ?? LOOKDEV_EDITS[0]?.at ?? "";
const RELOAD_KEY = "lookdev-reloaded";

function kyivClock(iso: string): string {
  if (!iso) return "—";
  return formatKyiv(iso);
}

export function LookDevDock({ placement = "hud" }: { placement?: "title" | "hud" }) {
  const [open, setOpen] = useState(false);
  const [remoteAt, setRemoteAt] = useState<string | null>(null);
  const [remoteRelease, setRemoteRelease] = useState<string | null>(null);

  useEffect(() => {
    let stop = false;
    const tick = async () => {
      try {
        const res = await fetch(`${publicUrl("lookdev.json")}?t=${Date.now()}`, {
          cache: "no-store",
        });
        if (!res.ok) return;
        const data = (await res.json()) as RemoteStamp;
        if (!stop && data.builtAt) {
          setRemoteAt(data.builtAt);
          setRemoteRelease(data.release ?? null);
        }
      } catch {
        /* offline / first paint */
      }
    };
    void tick();
    const id = window.setInterval(tick, 40_000);
    return () => {
      stop = true;
      window.clearInterval(id);
    };
  }, []);

  const alreadyReloaded =
    typeof sessionStorage !== "undefined" && sessionStorage.getItem(RELOAD_KEY) === LOOKDEV_RELEASE;
  const newer = !!remoteRelease && remoteRelease !== LOOKDEV_RELEASE && !alreadyReloaded;

  return (
    <>
      <button
        type="button"
        onClick={() => {
          if (newer) {
            try {
              sessionStorage.setItem(RELOAD_KEY, LOOKDEV_RELEASE);
            } catch {
              /* private mode */
            }
            window.location.reload();
            return;
          }
          setOpen(true);
        }}
        className={
          "absolute z-30 max-w-[min(100%-1.5rem,16rem)] rounded-md border px-3 py-2 text-left shadow-lg " +
          (placement === "title"
            ? "right-3 top-3 md:right-6 md:top-6"
            : "right-3 top-[4.35rem] md:right-4 md:top-auto md:bottom-4") +
          " " +
          (newer
            ? "border-accent bg-accent text-accent-fg"
            : "border-border/80 bg-surface/90 text-fg backdrop-blur-sm")
        }
      >
        <span className="block text-[10px] uppercase tracking-[0.16em] opacity-70">
          {LOOKDEV_VIEWER} · {LOOKDEV_RELEASE}
        </span>
        <span className="block font-mono text-xs">
          {newer ? "Новая сборка · нажми" : kyivClock(LOCAL_BUILT)}
        </span>
      </button>

      {open && !newer && (
        <div className="absolute inset-0 z-40 flex items-end justify-center bg-bg/50 p-4 md:items-center">
          <div className="w-full max-w-md rounded-lg border border-border bg-surface p-4 shadow-2xl">
            <div className="flex items-start gap-3">
              <div>
                <p className="font-display text-lg text-fg">Для {LOOKDEV_VIEWER}</p>
                <p className="text-xs text-muted">
                  {LOOKDEV_RELEASE} · {kyivClock(LOCAL_BUILT)} · Киев
                </p>
              </div>
              <button
                type="button"
                className="ml-auto h-10 rounded-sm border border-border px-3 text-sm text-muted"
                onClick={() => setOpen(false)}
              >
                Закрыть
              </button>
            </div>
            <ol className="mt-4 max-h-[50vh] space-y-3 overflow-y-auto">
              {LOOKDEV_EDITS.map((edit) => (
                <li key={edit.at + edit.title} className="border-b border-border/60 pb-3 last:border-0">
                  <p className="font-mono text-[11px] text-accent">{kyivClock(edit.at)}</p>
                  <p className="text-sm text-fg">{edit.title}</p>
                  <p className="text-xs text-subtle">{edit.where}</p>
                </li>
              ))}
            </ol>
            <p className="mt-3 text-xs text-subtle">
              Правки появляются здесь после обновления. Если горит «новая сборка» — нажми, Safari
              подтянет свежую.
            </p>
          </div>
        </div>
      )}
    </>
  );
}
