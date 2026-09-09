import { useCallback, useEffect, useRef, useState } from "react";

type Pt = { x: number; y: number };

export function usePanZoom(opts: {
  contentW: number;
  contentH: number;
  minZoom?: number;
  maxZoom?: number;
  initialZoom?: number;
  onTap?: (x: number, y: number) => void;
}) {
  const contentW = Math.max(1, opts.contentW);
  const contentH = Math.max(1, opts.contentH);
  const minZoom = opts.minZoom ?? 0.85;
  const maxZoom = opts.maxZoom ?? 16;
  const initialZoom = opts.initialZoom ?? 1;
  const onTapRef = useRef(opts.onTap);
  onTapRef.current = opts.onTap;

  const ref = useRef<HTMLDivElement>(null);
  const [view, setView] = useState({ w: 0, h: 0 });
  const [zoom, setZoom] = useState(initialZoom);
  const [pan, setPan] = useState<Pt>({ x: 0, y: 0 });
  const zRef = useRef(zoom);
  const pRef = useRef(pan);
  zRef.current = zoom;
  pRef.current = pan;

  const pointers = useRef(new Map<number, Pt>());
  const drag = useRef<{ id: number; x: number; y: number; pan: Pt; t: number } | null>(null);
  const pinch = useRef<{ dist: number; zoom: number; cx: number; cy: number } | null>(null);
  const gesture = useRef<{ zoom: number; cx: number; cy: number } | null>(null);
  const lastTap = useRef(0);
  const moved = useRef(false);

  const fitOf = useCallback(
    (w: number, h: number) => Math.min(w / contentW, h / contentH) || 1,
    [contentW, contentH],
  );

  const zoomAt = useCallback(
    (nextZ: number, cx: number, cy: number) => {
      const el = ref.current;
      if (!el) return;
      const z = Math.min(maxZoom, Math.max(minZoom, nextZ));
      const fitNow = fitOf(el.clientWidth, el.clientHeight);
      const prev = fitNow * zRef.current;
      const next = fitNow * z;
      if (prev < 1e-6) return;
      const p = pRef.current;
      const wx = (cx - p.x) / prev;
      const wy = (cy - p.y) / prev;
      setZoom(z);
      setPan({ x: cx - wx * next, y: cy - wy * next });
    },
    [fitOf, maxZoom, minZoom],
  );

  const centerNorm = useCallback(
    (nx: number, ny: number, z?: number) => {
      const el = ref.current;
      if (!el) return;
      const zz = z ?? zRef.current;
      const sc = fitOf(el.clientWidth, el.clientHeight) * zz;
      setZoom(zz);
      setPan({
        x: el.clientWidth / 2 - nx * contentW * sc,
        y: el.clientHeight / 2 - ny * contentH * sc,
      });
    },
    [contentW, contentH, fitOf],
  );

  const bump = useCallback(
    (factor: number) => {
      const el = ref.current;
      if (!el) return;
      zoomAt(zRef.current * factor, el.clientWidth / 2, el.clientHeight / 2);
    },
    [zoomAt],
  );

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const apply = () => setView({ w: el.clientWidth, h: el.clientHeight });
    apply();
    const ro = new ResizeObserver(apply);
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;

    const onWheel = (e: WheelEvent) => {
      e.preventDefault();
      const rect = el.getBoundingClientRect();
      const factor = Math.exp(-e.deltaY * 0.0022);
      zoomAt(zRef.current * factor, e.clientX - rect.left, e.clientY - rect.top);
    };

    const beginPinch = (a: Touch, b: Touch) => {
      const rect = el.getBoundingClientRect();
      pinch.current = {
        dist: Math.max(8, Math.hypot(b.clientX - a.clientX, b.clientY - a.clientY)),
        zoom: zRef.current,
        cx: (a.clientX + b.clientX) / 2 - rect.left,
        cy: (a.clientY + b.clientY) / 2 - rect.top,
      };
      drag.current = null;
      moved.current = true;
    };

    const onTouchStart = (e: TouchEvent) => {
      if (e.touches.length >= 2) {
        e.preventDefault();
        beginPinch(e.touches[0]!, e.touches[1]!);
        lastTap.current = 0;
        return;
      }
      const t = e.touches[0];
      if (!t) return;
      moved.current = false;
      drag.current = {
        id: t.identifier,
        x: t.clientX,
        y: t.clientY,
        pan: { ...pRef.current },
        t: performance.now(),
      };
      const now = performance.now();
      if (now - lastTap.current < 280) {
        e.preventDefault();
        const rect = el.getBoundingClientRect();
        zoomAt(zRef.current * 1.7, t.clientX - rect.left, t.clientY - rect.top);
        lastTap.current = 0;
        moved.current = true;
      } else {
        lastTap.current = now;
      }
    };

    const onTouchMove = (e: TouchEvent) => {
      if (e.touches.length >= 2) {
        e.preventDefault();
        const a = e.touches[0]!;
        const b = e.touches[1]!;
        const dist = Math.hypot(b.clientX - a.clientX, b.clientY - a.clientY);
        if (!pinch.current || pinch.current.dist < 8) {
          beginPinch(a, b);
          return;
        }
        const rect = el.getBoundingClientRect();
        pinch.current.cx = (a.clientX + b.clientX) / 2 - rect.left;
        pinch.current.cy = (a.clientY + b.clientY) / 2 - rect.top;
        zoomAt((dist / pinch.current.dist) * pinch.current.zoom, pinch.current.cx, pinch.current.cy);
        return;
      }
      const d = drag.current;
      const t = e.touches[0];
      if (!d || !t || t.identifier !== d.id || pinch.current) return;
      if (Math.hypot(t.clientX - d.x, t.clientY - d.y) > 8) moved.current = true;
      e.preventDefault();
      setPan({ x: d.pan.x + (t.clientX - d.x), y: d.pan.y + (t.clientY - d.y) });
    };

    const onTouchEnd = (e: TouchEvent) => {
      if (e.touches.length >= 2) {
        beginPinch(e.touches[0]!, e.touches[1]!);
        return;
      }
      const wasPinch = !!pinch.current;
      pinch.current = null;
      if (e.touches.length === 1) {
        const t = e.touches[0]!;
        drag.current = {
          id: t.identifier,
          x: t.clientX,
          y: t.clientY,
          pan: { ...pRef.current },
          t: performance.now(),
        };
        return;
      }
      const d = drag.current;
      drag.current = null;
      if (!wasPinch && d && !moved.current && performance.now() - d.t < 450) {
        const rect = el.getBoundingClientRect();
        onTapRef.current?.(d.x - rect.left, d.y - rect.top);
      }
    };

    const onGestureStart = (e: Event) => {
      e.preventDefault();
      const ge = e as Event & { clientX?: number; clientY?: number };
      const rect = el.getBoundingClientRect();
      gesture.current = {
        zoom: zRef.current,
        cx: (ge.clientX ?? rect.width / 2) - rect.left,
        cy: (ge.clientY ?? rect.height / 2) - rect.top,
      };
      moved.current = true;
    };
    const onGestureChange = (e: Event) => {
      e.preventDefault();
      const ge = e as Event & { scale?: number; clientX?: number; clientY?: number };
      if (!gesture.current || !ge.scale) return;
      const rect = el.getBoundingClientRect();
      const cx = ge.clientX != null ? ge.clientX - rect.left : gesture.current.cx;
      const cy = ge.clientY != null ? ge.clientY - rect.top : gesture.current.cy;
      zoomAt(gesture.current.zoom * ge.scale, cx, cy);
    };
    const onGestureEnd = (e: Event) => {
      e.preventDefault();
      gesture.current = null;
    };

    const cap = { passive: false, capture: true } as const;
    el.addEventListener("wheel", onWheel, cap);
    el.addEventListener("touchstart", onTouchStart, cap);
    el.addEventListener("touchmove", onTouchMove, cap);
    el.addEventListener("touchend", onTouchEnd, { capture: true });
    el.addEventListener("touchcancel", onTouchEnd, { capture: true });
    el.addEventListener("gesturestart", onGestureStart, cap);
    el.addEventListener("gesturechange", onGestureChange, cap);
    el.addEventListener("gestureend", onGestureEnd, cap);
    return () => {
      el.removeEventListener("wheel", onWheel, true);
      el.removeEventListener("touchstart", onTouchStart, true);
      el.removeEventListener("touchmove", onTouchMove, true);
      el.removeEventListener("touchend", onTouchEnd, true);
      el.removeEventListener("touchcancel", onTouchEnd, true);
      el.removeEventListener("gesturestart", onGestureStart, true);
      el.removeEventListener("gesturechange", onGestureChange, true);
      el.removeEventListener("gestureend", onGestureEnd, true);
    };
  }, [zoomAt]);

  function onPointerDown(e: React.PointerEvent) {
    if (e.pointerType === "touch") return;
    const el = ref.current;
    if (!el) return;
    el.setPointerCapture(e.pointerId);
    pointers.current.set(e.pointerId, { x: e.clientX, y: e.clientY });
    moved.current = false;
    drag.current = {
      id: e.pointerId,
      x: e.clientX,
      y: e.clientY,
      pan: { ...pRef.current },
      t: performance.now(),
    };
    const now = performance.now();
    if (now - lastTap.current < 280) {
      const rect = el.getBoundingClientRect();
      zoomAt(zRef.current * 1.7, e.clientX - rect.left, e.clientY - rect.top);
      lastTap.current = 0;
      moved.current = true;
    } else {
      lastTap.current = now;
    }
  }

  function onPointerMove(e: React.PointerEvent) {
    if (e.pointerType === "touch") return;
    if (!pointers.current.has(e.pointerId)) return;
    pointers.current.set(e.pointerId, { x: e.clientX, y: e.clientY });
    const d = drag.current;
    if (!d || d.id !== e.pointerId) return;
    if (Math.hypot(e.clientX - d.x, e.clientY - d.y) > 8) moved.current = true;
    setPan({ x: d.pan.x + (e.clientX - d.x), y: d.pan.y + (e.clientY - d.y) });
  }

  function onPointerUp(e: React.PointerEvent) {
    if (e.pointerType === "touch") return;
    pointers.current.delete(e.pointerId);
    const d = drag.current;
    if (d?.id === e.pointerId) {
      drag.current = null;
      if (!moved.current && performance.now() - d.t < 450) {
        const el = ref.current;
        if (el) {
          const rect = el.getBoundingClientRect();
          onTapRef.current?.(e.clientX - rect.left, e.clientY - rect.top);
        }
      }
    }
  }

  const fit = view.w ? fitOf(view.w, view.h) : 1;
  const scale = fit * zoom;

  return {
    ref,
    zoom,
    pan,
    scale,
    view,
    centerNorm,
    bump,
    zoomAt,
    onPointerDown,
    onPointerMove,
    onPointerUp,
    contentStyle: {
      width: contentW,
      height: contentH,
      transform: `translate3d(${pan.x}px, ${pan.y}px, 0) scale(${scale})`,
      transformOrigin: "0 0" as const,
      willChange: "transform",
    },
  };
}

/** High-res map layer: CSS-transform the full bitmap so iOS pinch actually moves pixels. */
export function MapBitmap({
  src,
  contentW,
  contentH,
  pan,
  scale,
}: {
  src: string;
  contentW: number;
  contentH: number;
  pan: Pt;
  scale: number;
  viewW?: number;
  viewH?: number;
}) {
  return (
    <img
      src={src}
      alt=""
      draggable={false}
      className="pointer-events-none absolute left-0 top-0 max-w-none origin-top-left touch-none select-none"
      style={{
        width: contentW,
        height: contentH,
        maxWidth: "none",
        maxHeight: "none",
        transform: `translate3d(${pan.x}px, ${pan.y}px, 0) scale(${scale})`,
        transformOrigin: "0 0",
        willChange: "transform",
        WebkitUserSelect: "none",
        objectFit: "fill",
      }}
    />
  );
}
