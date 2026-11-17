"use client";
/**
 * Draws a receipt onto a canvas (Lao text included) so it can be
 *  - sent to a Bluetooth thermal printer as an ESC/POS raster image, or
 *  - shared as a picture (WhatsApp, LINE, Messenger…) from the iPad share sheet.
 * Thermal printers have no Lao font built in, which is why we print an image.
 */
import { fmt } from "./money";
import { fmtDateTime } from "./time";
import { METHOD_LABEL, type ReceiptData, type ShopSettings } from "./types";

const FONT = '"Noto Sans Lao Variable", "Phetsarath OT", sans-serif';

export async function drawReceipt(r: ReceiptData, s: ShopSettings): Promise<HTMLCanvasElement> {
  const W = s.receipt.width === 58 ? 384 : 576; // printer dots at 203 dpi
  const base = s.receipt.width === 58 ? 22 : 26;
  await Promise.all([document.fonts.load(`400 ${base}px ${FONT}`), document.fonts.load(`700 ${base}px ${FONT}`)]).catch(() => {});

  const pad = 8;
  const ops: ((ctx: CanvasRenderingContext2D, y: number) => number)[] = [];
  const measure = document.createElement("canvas").getContext("2d")!;
  const font = (size: number, bold = false) => `${bold ? 700 : 400} ${size}px ${FONT}`;

  const wrap = (text: string, size: number, bold: boolean, maxW: number): string[] => {
    measure.font = font(size, bold);
    const Seg = (Intl as unknown as { Segmenter?: new (l: string, o: object) => { segment(t: string): Iterable<{ segment: string }> } }).Segmenter;
    const parts = Seg ? [...new Seg("lo", { granularity: "word" }).segment(text)].map((x) => x.segment) : [...text];
    const lines: string[] = [];
    let cur = "";
    for (const p of parts) {
      if (measure.measureText(cur + p).width > maxW && cur) {
        lines.push(cur.trimEnd());
        cur = p.trimStart();
      } else cur += p;
    }
    if (cur) lines.push(cur);
    return lines;
  };

  const text = (t: string, opts: { size?: number; bold?: boolean; align?: "left" | "center" } = {}) => {
    const size = opts.size ?? base;
    for (const line of wrap(t, size, !!opts.bold, W - pad * 2)) {
      ops.push((ctx, y) => {
        ctx.font = font(size, opts.bold);
        ctx.textAlign = opts.align ?? "left";
        ctx.fillText(line, opts.align === "center" ? W / 2 : pad, y + size);
        return y + Math.round(size * 1.45);
      });
    }
  };
  const row = (left: string, right: string, opts: { size?: number; bold?: boolean } = {}) => {
    const size = opts.size ?? base;
    ops.push((ctx, y) => {
      ctx.font = font(size, opts.bold);
      ctx.textAlign = "left";
      ctx.fillText(left, pad, y + size);
      ctx.textAlign = "right";
      ctx.fillText(right, W - pad, y + size);
      return y + Math.round(size * 1.45);
    });
  };
  const rule = () =>
    ops.push((ctx, y) => {
      ctx.fillRect(pad, y + 8, W - pad * 2, 2);
      return y + 20;
    });
  const gap = (h: number) => ops.push((_c, y) => y + h);

  text(s.shop.name, { size: Math.round(base * 1.35), bold: true, align: "center" });
  if (s.shop.address) text(s.shop.address, { size: base - 4, align: "center" });
  if (s.shop.phone) text(`ໂທ ${s.shop.phone}`, { size: base - 4, align: "center" });
  if (s.shop.taxId) text(`ເລກປະຈຳຕົວຜູ້ເສຍອາກອນ ${s.shop.taxId}`, { size: base - 4, align: "center" });
  rule();
  row("ເລກບິນ", r.pending ? "ລໍຖ້າສົ່ງ" : r.billNo);
  row("ວັນທີ", fmtDateTime(r.createdAt));
  if (r.cashierName) row("ພະນັກງານ", r.cashierName);
  if (r.status === "void") text("*** ບິນນີ້ຖືກຍົກເລີກ ***", { bold: true, align: "center" });
  rule();
  for (const it of r.items) {
    text(it.name, { bold: true });
    row(`  ${it.qty} x ${fmt(it.price)}`, fmt(it.lineTotal));
  }
  rule();
  row("ລວມ", fmt(r.subtotal));
  if (r.discount) row("ສ່ວນຫຼຸດ", `-${fmt(r.discount)}`);
  if (r.tax && !r.taxInclusive) row(`VAT ${r.taxRate}%`, fmt(r.tax));
  gap(4);
  row("ຍອດຊຳລະ", `${fmt(r.total)} ₭`, { size: Math.round(base * 1.3), bold: true });
  if (r.tax && r.taxInclusive) text(`(ລວມ VAT ${r.taxRate}% = ${fmt(r.tax)} ແລ້ວ)`, { size: base - 4 });
  gap(4);
  row(METHOD_LABEL[r.paymentMethod], fmt(r.received));
  if (r.paymentMethod === "cash") row("ເງິນທອນ", fmt(r.change), { bold: true });
  if (r.paymentRef) row("ອ້າງອີງ", r.paymentRef);
  rule();
  if (s.shop.footer) text(s.shop.footer, { align: "center" });
  gap(24);

  // First pass: height. Second pass: draw.
  const dry = document.createElement("canvas").getContext("2d")!;
  const H = ops.reduce((y, op) => op(dry, y), 12);
  const canvas = document.createElement("canvas");
  canvas.width = W;
  canvas.height = Math.ceil(H);
  const ctx = canvas.getContext("2d")!;
  ctx.fillStyle = "#fff";
  ctx.fillRect(0, 0, W, canvas.height);
  ctx.fillStyle = "#000";
  ops.reduce((y, op) => op(ctx, y), 12);
  return canvas;
}

/** Canvas -> ESC/POS "GS v 0" raster commands, sent in bands for small printer buffers */
export function toEscPos(canvas: HTMLCanvasElement): Uint8Array {
  const { width: w, height: h } = canvas;
  const px = canvas.getContext("2d")!.getImageData(0, 0, w, h).data;
  const bytesPerRow = Math.ceil(w / 8);
  const out: number[] = [0x1b, 0x40]; // ESC @ — reset
  const BAND = 128;
  for (let y0 = 0; y0 < h; y0 += BAND) {
    const rows = Math.min(BAND, h - y0);
    out.push(0x1d, 0x76, 0x30, 0x00, bytesPerRow & 0xff, bytesPerRow >> 8, rows & 0xff, rows >> 8);
    for (let y = y0; y < y0 + rows; y++) {
      for (let bx = 0; bx < bytesPerRow; bx++) {
        let byte = 0;
        for (let bit = 0; bit < 8; bit++) {
          const x = bx * 8 + bit;
          if (x >= w) continue;
          const i = (y * w + x) * 4;
          const lum = 0.299 * px[i] + 0.587 * px[i + 1] + 0.114 * px[i + 2];
          if (lum < 150) byte |= 0x80 >> bit;
        }
        out.push(byte);
      }
    }
  }
  out.push(0x1b, 0x64, 0x04); // feed 4 lines
  out.push(0x1d, 0x56, 0x42, 0x00); // partial cut (ignored by printers without a cutter)
  return new Uint8Array(out);
}

// ---- Web Bluetooth (Chrome on Android/desktop, or the Bluefy browser on iPad) ----
type Char = {
  properties: { write: boolean; writeWithoutResponse: boolean };
  writeValueWithoutResponse?: (v: BufferSource) => Promise<void>;
  writeValue: (v: BufferSource) => Promise<void>;
};
type Device = { gatt?: { connected: boolean; connect(): Promise<{ getPrimaryService(u: string): Promise<{ getCharacteristics(): Promise<Char[]> }> }> } };
type Bt = { requestDevice(o: object): Promise<Device> };

const SERVICES = [
  "000018f0-0000-1000-8000-00805f9b34fb",
  "e7810a71-73ae-499d-8c15-faa9aef0c3f2",
  "49535343-fe7d-4ae5-8fa9-9fafd205e455",
  "0000ff00-0000-1000-8000-00805f9b34fb",
  "0000fee7-0000-1000-8000-00805f9b34fb",
];

let device: Device | null = null;
let channel: Char | null = null;

export const canBluetooth = () => typeof navigator !== "undefined" && "bluetooth" in navigator;

async function connect(): Promise<Char> {
  const bt = (navigator as unknown as { bluetooth: Bt }).bluetooth;
  if (!device) device = await bt.requestDevice({ acceptAllDevices: true, optionalServices: SERVICES });
  if (channel && device.gatt?.connected) return channel;
  const server = await device.gatt!.connect();
  for (const uuid of SERVICES) {
    try {
      const chars = await (await server.getPrimaryService(uuid)).getCharacteristics();
      const c = chars.find((x) => x.properties.writeWithoutResponse || x.properties.write);
      if (c) return (channel = c);
    } catch {}
  }
  device = null;
  throw new Error("ເຄື່ອງພິມນີ້ບໍ່ຮອງຮັບການພິມຜ່ານ Bluetooth LE");
}

export async function printBluetooth(r: ReceiptData, s: ShopSettings) {
  const data = toEscPos(await drawReceipt(r, s));
  const c = await connect();
  const CHUNK = 180;
  for (let i = 0; i < data.length; i += CHUNK) {
    const part = data.slice(i, i + CHUNK);
    if (c.properties.writeWithoutResponse && c.writeValueWithoutResponse) {
      await c.writeValueWithoutResponse(part);
      await new Promise((res) => setTimeout(res, 8));
    } else await c.writeValue(part);
  }
}

export async function shareReceipt(r: ReceiptData, s: ShopSettings): Promise<boolean> {
  const canvas = await drawReceipt(r, s);
  const blob = await new Promise<Blob | null>((res) => canvas.toBlob(res, "image/png"));
  if (!blob) return false;
  const file = new File([blob], `${r.billNo}.png`, { type: "image/png" });
  if (navigator.canShare?.({ files: [file] })) {
    await navigator.share({ files: [file], title: `${s.shop.name} ${r.billNo}` });
    return true;
  }
  const a = document.createElement("a");
  a.href = URL.createObjectURL(blob);
  a.download = file.name;
  a.click();
  return true;
}
