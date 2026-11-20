/**
 * Cropping a product photo to the till tile's 4:3 frame.
 *
 * Everything is measured in "frame units": the frame is 1 wide and FRAME_H tall, so the same
 * crop works at any screen size (iPad turned, bigger sheet) and for the saved picture.
 * The geometry is pure (tested); only `renderCrop` / `prepareSource` touch the browser.
 */

/** Same shape as the picture on a till tile (aspect-[4/3]) */
export const FRAME_H = 3 / 4;
/** Saved picture size: sharp on a Retina iPad tile, still small in the database (~40–70 KB) */
export const PHOTO_W = 640;
export const PHOTO_H = Math.round(PHOTO_W * FRAME_H);
export const MAX_ZOOM = 5;

/**
 * z: zoom, 1 = the photo just fills the frame (less than 1 shows the whole photo with white edges)
 * x, y: where the photo's centre sits, from the frame's centre
 * r: quarter turns in degrees
 */
export type Crop = { z: number; x: number; y: number; r: 0 | 90 | 180 | 270 };
export const START: Crop = { z: 1, x: 0, y: 0, r: 0 };

/** The photo's size once turned */
const turned = (w: number, h: number, r: number) => (r % 180 ? [h, w] : [w, h]);

/** Frame units per photo pixel when the photo just fills the frame */
export function coverScale(w: number, h: number, r: number) {
  const [rw, rh] = turned(w, h, r);
  return Math.max(1 / rw, FRAME_H / rh);
}

/** Smallest zoom: the whole photo fits inside the frame */
export function minZoom(w: number, h: number, r: number) {
  const [rw, rh] = turned(w, h, r);
  return Math.min(1 / rw, FRAME_H / rh) / coverScale(w, h, r);
}

/**
 * Keep the zoom in range and the photo where it makes sense: a side bigger than the frame
 * must cover it (no gap), a side smaller than the frame must stay inside it.
 */
export function clampCrop(c: Crop, w: number, h: number): Crop {
  const z = Math.min(MAX_ZOOM, Math.max(minZoom(w, h, c.r), c.z));
  const s = coverScale(w, h, c.r) * z;
  const [rw, rh] = turned(w, h, c.r);
  const room = (shown: number, frame: number) => Math.abs(shown - frame) / 2;
  const lim = (v: number, m: number) => Math.min(m, Math.max(-m, v)) || 0;
  return { ...c, z, x: lim(c.x, room(rw * s, 1)), y: lim(c.y, room(rh * s, FRAME_H)) };
}

/** Zoom to `z` keeping the photo point under (px, py) — frame units from the centre — still */
export function zoomAt(c: Crop, z: number, px: number, py: number, w: number, h: number): Crop {
  const k = clampCrop({ ...c, z }, w, h).z / c.z;
  return clampCrop({ ...c, z: c.z * k, x: px - (px - c.x) * k, y: py - (py - c.y) * k }, w, h);
}

/** Turn a quarter clockwise and start again from "fills the frame" */
export const turn = (c: Crop): Crop => ({ ...START, r: (((c.r + 90) % 360) as Crop["r"]) });

/** Where to draw the (unturned) photo, in pixels of an output `outW` wide */
export function placement(c: Crop, w: number, h: number, outW: number) {
  const s = coverScale(w, h, c.r) * c.z * outW;
  return { cx: outW / 2 + c.x * outW, cy: (outW * FRAME_H) / 2 + c.y * outW, w: w * s, h: h * s, rad: (c.r * Math.PI) / 180 };
}

/* ---------- browser only ---------- */

export function loadImage(src: string) {
  return new Promise<HTMLImageElement>((res, rej) => {
    const i = new Image();
    i.onload = () => res(i);
    i.onerror = () => rej(new Error("ເປີດຮູບບໍ່ໄດ້ — ລອງຮູບອື່ນ"));
    i.src = src;
  });
}

/**
 * A camera photo can be 12 MP; shrink it once to a working copy so dragging stays smooth and
 * Safari doesn't run out of memory. Returns an object URL — revoke it when done.
 */
export async function prepareSource(file: File, max = 2000): Promise<string> {
  const raw = URL.createObjectURL(file);
  try {
    const img = await loadImage(raw);
    const scale = Math.min(1, max / Math.max(img.naturalWidth, img.naturalHeight));
    if (scale === 1) return URL.createObjectURL(file);
    const c = document.createElement("canvas");
    c.width = Math.round(img.naturalWidth * scale);
    c.height = Math.round(img.naturalHeight * scale);
    const g = c.getContext("2d")!;
    g.imageSmoothingQuality = "high";
    g.drawImage(img, 0, 0, c.width, c.height);
    const blob = await new Promise<Blob | null>((res) => c.toBlob(res, "image/jpeg", 0.9));
    if (!blob) throw new Error("ເປີດຮູບບໍ່ໄດ້ — ລອງຮູບອື່ນ");
    return URL.createObjectURL(blob);
  } finally {
    URL.revokeObjectURL(raw);
  }
}

/** The part inside the frame, as a small JPEG data URL for the database */
export function renderCrop(img: HTMLImageElement, c: Crop, outW = PHOTO_W, quality = 0.84): string {
  const canvas = document.createElement("canvas");
  canvas.width = outW;
  canvas.height = Math.round(outW * FRAME_H);
  const g = canvas.getContext("2d")!;
  g.fillStyle = "#fff"; // edges when the whole photo is shown smaller than the frame
  g.fillRect(0, 0, canvas.width, canvas.height);
  const p = placement(c, img.naturalWidth, img.naturalHeight, outW);
  g.imageSmoothingQuality = "high";
  g.translate(p.cx, p.cy);
  g.rotate(p.rad);
  g.drawImage(img, -p.w / 2, -p.h / 2, p.w, p.h);
  return canvas.toDataURL("image/jpeg", quality);
}
