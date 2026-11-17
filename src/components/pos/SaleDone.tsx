"use client";
import { useState } from "react";
import { Bluetooth, CloudOff, Printer, Share2 } from "lucide-react";
import { ReceiptSlip } from "@/components/ReceiptSlip";
import { fmt } from "@/lib/money";
import { canBluetooth, printBluetooth, shareReceipt } from "@/lib/receipt-raster";
import { METHOD_LABEL, type ReceiptData, type ShopSettings } from "@/lib/types";

export function SaleDone({ r, settings, onNext }: { r: ReceiptData; settings: ShopSettings; onNext: () => void }) {
  const [msg, setMsg] = useState("");
  const [busy, setBusy] = useState<"" | "bt" | "share">("");

  async function run(kind: "bt" | "share") {
    setBusy(kind);
    setMsg("");
    try {
      if (kind === "bt") {
        await printBluetooth(r, settings);
        setMsg("ສົ່ງໄປເຄື່ອງພິມແລ້ວ");
      } else await shareReceipt(r, settings);
    } catch (e) {
      const m = (e as Error)?.message ?? "";
      if (!/cancel|abort/i.test(m)) setMsg(m || "ບໍ່ສຳເລັດ");
    } finally {
      setBusy("");
    }
  }

  const btn = "flex h-14 items-center gap-3 rounded-2xl bg-white px-5 text-lg font-medium text-ink ring-1 ring-line active:bg-ink-faint disabled:opacity-50";

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-ink/95 backdrop-blur-sm" role="dialog" aria-modal="true" aria-label="ຊຳລະສຳເລັດ">
      <div className="mx-auto grid min-h-full max-w-5xl items-center gap-8 px-6 pt-[max(2rem,env(safe-area-inset-top))] pb-[max(2rem,env(safe-area-inset-bottom))] md:grid-cols-[1fr_minmax(300px,380px)]">
        <div className="text-white md:order-1">
          <p className="text-lg text-white/70">ຊຳລະດ້ວຍ{METHOD_LABEL[r.paymentMethod]} ສຳເລັດ</p>
          {r.paymentMethod === "cash" ? (
            <>
              <p className="mt-6 text-xl text-white/80">ທອນເງິນລູກຄ້າ</p>
              <p className="num text-8xl font-bold leading-none tracking-tight text-marigold">
                {fmt(r.change)}
                <span className="ml-3 text-4xl font-medium text-white/70">₭</span>
              </p>
              <p className="num mt-4 text-white/70">
                ຮັບມາ {fmt(r.received)} ₭, ຍອດບິນ {fmt(r.total)} ₭
              </p>
            </>
          ) : (
            <p className="num mt-6 text-7xl font-bold leading-none tracking-tight text-marigold">
              {fmt(r.total)}
              <span className="ml-3 text-4xl font-medium text-white/70">₭</span>
            </p>
          )}

          {r.pending && (
            <p className="mt-6 flex items-center gap-3 rounded-2xl bg-white/10 px-4 py-3 text-white/90">
              <CloudOff className="size-5 shrink-0" />
              ບິນຖືກບັນທຶກໄວ້ໃນເຄື່ອງແລ້ວ
            </p>
          )}

          <div className="no-print mt-8 grid max-w-md gap-3">
            <button onClick={() => window.print()} className={btn}>
              <Printer className="size-6" /> ພິມໃບບິນ
            </button>
            {canBluetooth() && (
              <button onClick={() => run("bt")} disabled={!!busy} className={btn}>
                <Bluetooth className="size-6" /> {busy === "bt" ? "ກຳລັງພິມ…" : "ພິມຜ່ານ Bluetooth"}
              </button>
            )}
            <button onClick={() => run("share")} disabled={!!busy} className={btn}>
              <Share2 className="size-6" /> ສົ່ງໃບບິນເປັນຮູບ
            </button>
            {msg && <p className="text-white/80">{msg}</p>}
            <button
              autoFocus
              onClick={onNext}
              className="mt-3 h-18 rounded-2xl bg-marigold text-xl font-semibold text-ink shadow-[inset_0_-3px_0_var(--color-marigold-deep)] active:translate-y-px"
            >
              ເລີ່ມບິນໃໝ່
            </button>
          </div>
        </div>

        {/* The slip "prints out" once — the one animated moment in the app */}
        <div className="mx-auto w-full max-w-[340px] md:order-2">
          <div className="h-3 rounded-full bg-black/40" />
          <div className="-mt-1.5 px-2">
            <ReceiptSlip r={r} s={settings} className="torn-edge animate-print shadow-xl" />
          </div>
        </div>
      </div>
    </div>
  );
}
