"use client";
import { tw } from "@/lib/tw";
import { useCallback, useEffect, useState } from "react";
import { ChevronLeft, ChevronRight, Printer, Ban } from "lucide-react";
import { PageHeader, Panel, btnDanger, btnGhost, btnPrimary, inputCls } from "@/components/ui/form";
import { Sheet } from "@/components/ui/Sheet";
import { ReceiptSlip } from "@/components/ReceiptSlip";
import { fmt } from "@/lib/money";
import { DAY, fmtTime, fromDateKey, toDateKey } from "@/lib/time";
import { METHOD_LABEL, type ReceiptData, type ShopSettings } from "@/lib/types";
import type { Order } from "@/lib/db";
import { getReceipt, listOrdersForDay, voidOrder } from "@/lib/store";

export function SalesHistory({ settings }: { settings: ShopSettings }) {
  const [date, setDate] = useState(() => toDateKey(Date.now()));
  const [rows, setRows] = useState<Order[] | null>(null);
  const [open, setOpen] = useState<ReceiptData | null>(null);
  const [reason, setReason] = useState("");
  const [voiding, setVoiding] = useState(false);
  const [err, setErr] = useState("");

  const load = useCallback(async () => {
    setRows(null);
    setRows(await listOrdersForDay(date));
  }, [date]);
  useEffect(() => {
    load();
  }, [load]);

  const shift = (days: number) => setDate(toDateKey((fromDateKey(date) ?? Date.now()) + days * DAY + 1));
  const paid = rows?.filter((r) => r.status === "paid") ?? [];
  const total = paid.reduce((s, r) => s + r.total, 0);
  const voided = (rows?.length ?? 0) - paid.length;
  const isToday = date === toDateKey(Date.now());

  async function openBill(id: string) {
    setErr("");
    setReason("");
    setVoiding(false);
    setOpen(await getReceipt(id));
  }
  async function voidBill() {
    if (!open) return;
    try {
      await voidOrder(open.id, reason);
    } catch (e) {
      return setErr((e as Error).message);
    }
    setOpen({ ...open, status: "void" });
    setVoiding(false);
    load();
  }

  return (
    <main className="pb-10">
      <PageHeader title="ບິນຂາຍ" sub="ເບິ່ງ, ພິມຊ້ຳ ຫຼື ຍົກເລີກບິນ">
        <button onClick={() => shift(-1)} aria-label="ມື້ກ່ອນ" className={tw(btnGhost, "w-12 px-0")}>
          <ChevronLeft className="size-5" />
        </button>
        <input type="date" value={date} max={toDateKey(Date.now())} onChange={(e) => e.target.value && setDate(e.target.value)} className={tw(inputCls, "w-auto")} />
        <button onClick={() => shift(1)} disabled={isToday} aria-label="ມື້ຕໍ່ໄປ" className={tw(btnGhost, "w-12 px-0")}>
          <ChevronRight className="size-5" />
        </button>
      </PageHeader>

      <div className="grid gap-5 px-6 lg:px-8">
        <section className="grid grid-cols-3 rounded-2xl bg-white ring-1 ring-line">
          {[
            ["ຍອດຂາຍ", `${fmt(total)} ₭`],
            ["ບິນສຳເລັດ", fmt(paid.length)],
            ["ບິນຍົກເລີກ", fmt(voided)],
          ].map(([l, v], i) => (
            <div key={l} className={`p-5 ${i < 2 ? "border-r border-line" : ""}`}>
              <p className="text-muted">{l}</p>
              <p className="num mt-1 text-2xl font-semibold">{v}</p>
            </div>
          ))}
        </section>

        <Panel>
          {rows === null ? (
            <p className="p-6 text-muted">ກຳລັງໂຫຼດ…</p>
          ) : rows.length === 0 ? (
            <p className="p-6 text-muted">ບໍ່ມີບິນໃນມື້ນີ້</p>
          ) : (
            <table className="w-full text-left">
              <thead className="text-sm text-muted">
                <tr className="border-b border-line">
                  <th className="px-5 py-3 font-medium">ເວລາ</th>
                  <th className="py-3 font-medium">ເລກບິນ</th>
                  <th className="py-3 font-medium">ຊຳລະດ້ວຍ</th>
                  <th className="hidden py-3 font-medium md:table-cell">ພະນັກງານ</th>
                  <th className="px-5 py-3 text-right font-medium">ຍອດ</th>
                </tr>
              </thead>
              <tbody>
                {rows.map((o) => (
                  <tr key={o.id} onClick={() => openBill(o.id)} className="cursor-pointer border-b border-line last:border-0 active:bg-ink-faint">
                    <td className="num px-5 py-3.5 text-muted">{fmtTime(o.createdAt)}</td>
                    <td className="num py-3.5 font-medium">
                      {o.billNo}
                      {o.status === "void" && <span className="ml-2 rounded-md bg-chili-faint px-2 py-0.5 text-xs text-chili">ຍົກເລີກ</span>}
                    </td>
                    <td className="py-3.5">{METHOD_LABEL[o.paymentMethod]}</td>
                    <td className="hidden py-3.5 text-muted md:table-cell">{o.cashierName}</td>
                    <td className={`num px-5 py-3.5 text-right font-semibold ${o.status === "void" ? "text-muted line-through" : ""}`}>{fmt(o.total)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </Panel>
      </div>

      <Sheet open={!!open} onClose={() => setOpen(null)} title={open?.billNo} width="max-w-md">
        {open && (
          <div className="p-5">
            <ReceiptSlip r={open} s={settings} className="mx-auto max-w-[340px] torn-edge shadow-md" />
            <div className="no-print mt-5 grid gap-3">
              <button onClick={() => window.print()} className={btnPrimary}>
                <Printer className="size-5" /> ພິມອີກຄັ້ງ
              </button>
              {open.status === "paid" &&
                (voiding ? (
                  <div className="rounded-2xl bg-chili-faint p-4">
                    <p className="font-medium text-chili">ຍົກເລີກບິນນີ້? ຍອດຈະຖືກຫັກອອກຈາກລາຍງານ.</p>
                    <input value={reason} onChange={(e) => setReason(e.target.value)} placeholder="ເຫດຜົນ (ເຊັ່ນ: ລູກຄ້າປ່ຽນໃຈ)" className={tw(inputCls, "mt-3")} />
                    {err && <p className="mt-2 text-chili">{err}</p>}
                    <div className="mt-3 grid grid-cols-2 gap-2">
                      <button onClick={() => setVoiding(false)} className={btnGhost}>ບໍ່ຍົກເລີກ</button>
                      <button onClick={voidBill} className={tw(btnPrimary, "bg-chili active:bg-chili")}>ຍົກເລີກບິນ</button>
                    </div>
                  </div>
                ) : (
                  <button onClick={() => setVoiding(true)} className={btnDanger}>
                    <Ban className="size-5" /> ຍົກເລີກບິນ
                  </button>
                ))}
            </div>
          </div>
        )}
      </Sheet>
    </main>
  );
}
