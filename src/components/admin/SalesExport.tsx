"use client";
import { useEffect, useState } from "react";
import { FileSpreadsheet } from "lucide-react";
import { Sheet } from "@/components/ui/Sheet";
import { btnGhost, btnPrimary } from "@/components/ui/form";
import { tw } from "@/lib/tw";
import { fmt } from "@/lib/money";
import { METHOD_LABEL, type PaymentMethod } from "@/lib/types";
import { isCancel, shareFile } from "@/lib/backup";
import { EXPORT_LABEL, EXPORT_RANGES, prepareSalesExcel, type ExportRange } from "@/lib/export-excel";

type Ready = Awaited<ReturnType<typeof prepareSalesExcel>>;
const METHODS: PaymentMethod[] = ["cash", "qr", "card"];

function Row({ label, value, strong = false, tone = "" }: { label: string; value: string; strong?: boolean; tone?: string }) {
  return (
    <div className={`flex items-baseline justify-between gap-4 py-1.5 ${strong ? "font-semibold" : ""}`}>
      <span className={strong ? "" : "text-muted"}>{label}</span>
      <span className={`num text-right ${tone}`}>{value}</span>
    </div>
  );
}

/**
 * End of day: tap a range and the totals are right there; one more tap saves them as an
 * Excel file (opens in Excel, Numbers or Google Sheets — unlike the .json backup).
 */
export function SalesExport({ className = "" }: { className?: string }) {
  const [open, setOpen] = useState(false);
  const [range, setRange] = useState<ExportRange>("today");
  const [ready, setReady] = useState<Ready | null>(null);
  const [msg, setMsg] = useState("");
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (!open) return;
    let live = true;
    setReady(null);
    setMsg("");
    prepareSalesExcel(range)
      .then((r) => live && setReady(r))
      .catch((e) => live && setMsg((e as Error).message || "ໂຫຼດຂໍ້ມູນບໍ່ສຳເລັດ"));
    return () => {
      live = false;
    };
  }, [open, range]);

  async function save() {
    if (!ready) return;
    setBusy(true);
    setMsg("");
    try {
      await shareFile(ready.file);
      setMsg(`ສ້າງໄຟລ໌ ${ready.file.name} ແລ້ວ — ເປີດດ້ວຍ Excel, Numbers ຫຼື ສົ່ງເຂົ້າ LINE ໄດ້`);
    } catch (e) {
      if (!isCancel(e)) setMsg((e as Error).message || "ບໍ່ສຳເລັດ");
    } finally {
      setBusy(false);
    }
  }

  const t = ready?.totals;
  return (
    <>
      <button onClick={() => setOpen(true)} className={tw(btnGhost, "h-[52px]", className)}>
        <FileSpreadsheet className="size-5 text-leaf" /> ສະຫຼຸບຍອດ / Excel
      </button>

      <Sheet open={open} onClose={() => setOpen(false)} title="ສະຫຼຸບຍອດຂາຍ" width="max-w-md">
        <div className="grid gap-4 p-5">
          <div className="grid grid-cols-4 gap-1 rounded-2xl bg-paper p-1 ring-1 ring-line" role="tablist">
            {EXPORT_RANGES.map((r) => (
              <button
                key={r}
                role="tab"
                aria-selected={r === range}
                onClick={() => setRange(r)}
                className={`h-11 rounded-xl text-[15px] font-medium ${r === range ? "bg-ink text-white" : "text-muted active:bg-ink-faint"}`}
              >
                {EXPORT_LABEL[r]}
              </button>
            ))}
          </div>

          {!t ? (
            <p className="py-10 text-center text-muted">{msg || "ກຳລັງຄິດໄລ່…"}</p>
          ) : (
            <>
              <div className="text-center">
                <p className="text-muted">{ready.label}</p>
                <p className="num mt-1 text-5xl font-semibold">
                  {fmt(t.total)} <span className="text-2xl text-muted">₭</span>
                </p>
                <p className="mt-1 text-muted">
                  ຍອດຂາຍ · <span className="num">{fmt(t.bills)}</span> ບິນ
                </p>
              </div>

              <section className="rounded-2xl bg-white px-4 py-2 ring-1 ring-line">
                {METHODS.map((m) => (
                  <Row key={m} label={METHOD_LABEL[m]} value={`${fmt(t.byMethod[m])} ₭`} />
                ))}
                <Row label="ສ່ວນຫຼຸດ" value={`${fmt(t.discount)} ₭`} />
                <Row label="ບິນຍົກເລີກ" value={`${fmt(t.voids)} ບິນ`} />
              </section>

              <section className="rounded-2xl bg-white px-4 py-2 ring-1 ring-line">
                <Row label="ຕົ້ນທຶນສິນຄ້າ" value={`${fmt(t.cost)} ₭`} />
                {t.tax + t.fee > 0 && <Row label="ອາກອນ ແລະ ຄ່າທຳນຽມ" value={`${fmt(t.tax + t.fee)} ₭`} />}
                <Row label="ຄ່າໃຊ້ຈ່າຍ" value={`${fmt(t.expenses)} ₭`} />
                <div className="border-t border-line">
                  <Row label="ກຳໄລສຸດທິ" value={`${fmt(t.netProfit)} ₭`} strong tone={t.netProfit >= 0 ? "text-leaf" : "text-chili"} />
                </div>
              </section>

              <button onClick={save} disabled={busy} className={tw(btnPrimary, "h-14 text-lg")}>
                <FileSpreadsheet className="size-5" /> ບັນທຶກເປັນ Excel
              </button>
              <p className="-mt-2 text-center text-sm text-muted">ໃນໄຟລ໌ມີ: ສະຫຼຸບ · ລາຍວັນ · ທຸກບິນ · ສິນຄ້າທີ່ຂາຍ · ຄ່າໃຊ້ຈ່າຍ</p>
              {msg && <p className="rounded-xl bg-paper px-4 py-3 text-[15px]">{msg}</p>}
            </>
          )}
        </div>
      </Sheet>
    </>
  );
}
