"use client";
import { useEffect, useRef, useState } from "react";
import { Expand, RotateCw, Shrink, ZoomIn, ZoomOut } from "lucide-react";
import { Sheet } from "@/components/ui/Sheet";
import { btnGhost, btnPrimary } from "@/components/ui/form";
import { tw } from "@/lib/tw";
import { MAX_ZOOM, START, clampCrop, coverScale, loadImage, minZoom, renderCrop, turn, zoomAt, type Crop } from "@/lib/photo-crop";

type Pt = { x: number; y: number };
const tool = tw(btnGhost, "h-11 px-3.5 text-[15px]");

/**
 * Drag / pinch / zoom a product photo inside the till tile's 4:3 frame. What is inside the
 * frame is exactly what the till shows; the rest is dimmed so you can see what gets cut.
 */
export function PhotoCropper({ src, crop: initial, onCancel, onDone }: { src: string | null; crop?: Crop; onCancel: () => void; onDone: (image: string, crop: Crop) => void }) {
  const [img, setImg] = useState<HTMLImageElement | null>(null);
  const [crop, setCropState] = useState<Crop>(START);
  const [fw, setFw] = useState(0); // frame width on screen, px
  const [dragging, setDragging] = useState(false);
  const [err, setErr] = useState("");
  const cropRef = useRef(crop);
  const frameRef = useRef<HTMLDivElement>(null);
  const stageRef = useRef<HTMLDivElement>(null);
  const pts = useRef(new Map<number, Pt>());
  const gesture = useRef<{ c: Crop; mid: Pt; dist: number } | null>(null);

  const w = img?.naturalWidth ?? 1;
  const h = img?.naturalHeight ?? 1;
  const set = (c: Crop) => {
    cropRef.current = c;
    setCropState(c);
  };

  useEffect(() => {
    if (!src) return;
    let live = true;
    setImg(null);
    setErr("");
    loadImage(src)
      .then((i) => {
        if (!live) return;
        setImg(i);
        set(clampCrop(initial ?? START, i.naturalWidth, i.naturalHeight));
      })
      .catch((e) => live && setErr((e as Error).message));
    return () => {
      live = false;
    };
    // `initial` only matters when a photo is opened
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [src]);

  useEffect(() => {
    const el = frameRef.current;
    if (!src || !el) return;
    const ro = new ResizeObserver(() => setFw(el.clientWidth));
    ro.observe(el);
    setFw(el.clientWidth);
    return () => ro.disconnect();
  }, [src]);

  /** A screen point → frame units from the frame's centre */
  const rel = (p: Pt): Pt => {
    const r = frameRef.current!.getBoundingClientRect();
    return { x: (p.x - r.left - r.width / 2) / r.width, y: (p.y - r.top - r.height / 2) / r.width };
  };

  // Mouse wheel / trackpad zoom (computer); must be non-passive to stop the sheet scrolling
  useEffect(() => {
    const el = stageRef.current;
    if (!el || !img) return;
    const onWheel = (e: WheelEvent) => {
      e.preventDefault();
      const p = rel({ x: e.clientX, y: e.clientY });
      const c = cropRef.current;
      set(zoomAt(c, c.z * Math.exp(-e.deltaY * 0.0015), p.x, p.y, img.naturalWidth, img.naturalHeight));
    };
    el.addEventListener("wheel", onWheel, { passive: false });
    return () => el.removeEventListener("wheel", onWheel);
  }, [img]);

  /** One finger drags; two fingers pinch (and drag) — restarted whenever a finger lands or lifts */
  function begin() {
    const list = [...pts.current.values()].map(rel);
    if (!list.length) return void (gesture.current = null);
    const [a, b] = list;
    gesture.current = b
      ? { c: cropRef.current, mid: { x: (a.x + b.x) / 2, y: (a.y + b.y) / 2 }, dist: Math.hypot(a.x - b.x, a.y - b.y) }
      : { c: cropRef.current, mid: a, dist: 0 };
  }

  function onDown(e: React.PointerEvent) {
    if (!img || pts.current.size >= 2) return;
    try {
      e.currentTarget.setPointerCapture(e.pointerId); // keep following a finger that slides off the stage
    } catch {}
    pts.current.set(e.pointerId, { x: e.clientX, y: e.clientY });
    begin();
    setDragging(true);
  }

  function onMove(e: React.PointerEvent) {
    const g = gesture.current;
    if (!img || !g || !pts.current.has(e.pointerId)) return;
    pts.current.set(e.pointerId, { x: e.clientX, y: e.clientY });
    const [a, b] = [...pts.current.values()].map(rel);
    if (!b || !g.dist) {
      set(clampCrop({ ...g.c, x: g.c.x + a.x - g.mid.x, y: g.c.y + a.y - g.mid.y }, w, h));
      return;
    }
    const mid = { x: (a.x + b.x) / 2, y: (a.y + b.y) / 2 };
    const zoomed = zoomAt(g.c, (g.c.z * Math.hypot(a.x - b.x, a.y - b.y)) / g.dist, g.mid.x, g.mid.y, w, h);
    set(clampCrop({ ...zoomed, x: zoomed.x + mid.x - g.mid.x, y: zoomed.y + mid.y - g.mid.y }, w, h));
  }

  function onUp(e: React.PointerEvent) {
    if (!pts.current.delete(e.pointerId)) return;
    begin();
    if (!pts.current.size) setDragging(false);
  }

  const zoomBy = (k: number) => set(zoomAt(crop, crop.z * k, 0, 0, w, h));
  const zMin = minZoom(w, h, crop.r);
  const s = coverScale(w, h, crop.r) * crop.z * fw;

  return (
    <Sheet open={!!src} onClose={onCancel} title="ຕັດຮູບໃຫ້ພໍດີກອບ" width="max-w-2xl">
      <div
        ref={stageRef}
        onPointerDown={onDown}
        onPointerMove={onMove}
        onPointerUp={onUp}
        onPointerCancel={onUp}
        className={`relative touch-none select-none overflow-hidden bg-[#26221e] px-10 pb-10 pt-6 ${img ? (dragging ? "cursor-grabbing" : "cursor-grab") : ""}`}
      >
        <div ref={frameRef} className="relative mx-auto aspect-[4/3] w-full max-w-[calc((92dvh_-_19rem)*4/3)] bg-white">
          {img && fw > 0 && (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={img.src}
              alt=""
              draggable={false}
              className="absolute left-1/2 top-1/2 max-w-none"
              style={{
                width: w * s,
                height: h * s,
                transform: `translate(-50%, -50%) translate(${crop.x * fw}px, ${crop.y * fw}px) rotate(${crop.r}deg)`,
              }}
            />
          )}
          {!img && <p className="absolute inset-0 grid place-items-center text-muted">{err || "ກຳລັງເປີດຮູບ…"}</p>}
          {/* Dims everything outside the frame; thirds help centre the product while dragging */}
          <div className="pointer-events-none absolute inset-0 shadow-[0_0_0_100vmax_rgb(20_17_14/0.62)] ring-2 ring-white">
            <div className={`absolute inset-0 transition-opacity ${dragging ? "opacity-100" : "opacity-0"}`}>
              <span className="absolute inset-y-0 left-1/3 w-px bg-white/60" />
              <span className="absolute inset-y-0 left-2/3 w-px bg-white/60" />
              <span className="absolute inset-x-0 top-1/3 h-px bg-white/60" />
              <span className="absolute inset-x-0 top-2/3 h-px bg-white/60" />
            </div>
          </div>
        </div>
        <p className="pointer-events-none absolute inset-x-0 bottom-2.5 text-center text-sm text-white/80">
          ລາກເພື່ອເລື່ອນ · ຖ່າງສອງນິ້ວເພື່ອຂະຫຍາຍ — ສ່ວນໃນກອບ ຄືສິ່ງທີ່ເຫັນໃນໜ້າຂາຍ
        </p>
      </div>

      <div className="grid gap-3 p-5">
        <div className="flex items-center gap-2">
          <button type="button" onClick={() => zoomBy(1 / 1.25)} disabled={!img || crop.z <= zMin + 0.001} aria-label="ຫຍໍ້" className={tw(tool, "w-11 px-0")}>
            <ZoomOut className="size-5" />
          </button>
          <input
            type="range"
            min={zMin}
            max={MAX_ZOOM}
            step={0.01}
            value={crop.z}
            disabled={!img}
            onChange={(e) => set(zoomAt(crop, Number(e.target.value), 0, 0, w, h))}
            aria-label="ຂະໜາດຮູບ"
            className="h-11 min-w-0 flex-1 accent-[var(--color-ink)]"
          />
          <button type="button" onClick={() => zoomBy(1.25)} disabled={!img || crop.z >= MAX_ZOOM - 0.001} aria-label="ຂະຫຍາຍ" className={tw(tool, "w-11 px-0")}>
            <ZoomIn className="size-5" />
          </button>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <button type="button" onClick={() => set(clampCrop(turn(crop), w, h))} disabled={!img} className={tool}>
            <RotateCw className="size-5" /> ໝຸນ
          </button>
          <button type="button" onClick={() => set(clampCrop({ ...START, r: crop.r }, w, h))} disabled={!img} className={tool}>
            <Expand className="size-5" /> ເຕັມກອບ
          </button>
          <button type="button" onClick={() => set(clampCrop({ ...START, z: zMin, r: crop.r }, w, h))} disabled={!img || zMin >= 0.999} className={tool}>
            <Shrink className="size-5" /> ເຫັນທັງຮູບ
          </button>
          <div className="ml-auto flex gap-2">
            <button type="button" onClick={onCancel} className={tw(btnGhost, "h-11")}>
              ຍົກເລີກ
            </button>
            <button type="button" onClick={() => img && onDone(renderCrop(img, crop), crop)} disabled={!img} className={tw(btnPrimary, "h-11 min-w-32")}>
              ໃຊ້ຮູບນີ້
            </button>
          </div>
        </div>
      </div>
    </Sheet>
  );
}
