"use client";
import { useEffect, useState } from "react";
import { PageHeader, Panel } from "@/components/ui/form";
import { Sheet } from "@/components/ui/Sheet";
import { DiffBadge, ShiftReport, cashDiff, shiftTimes } from "@/components/ShiftReport";
import { listShifts, shiftSummary } from "@/lib/store";
import type { Shift, ShiftSummary } from "@/lib/db";
import { fmt } from "@/lib/money";
import { startOfMonth } from "@/lib/time";

type Row = { shift: Shift; summary: ShiftSummary };

/** Owner-only: every shift with its drawer count, plus this month per person. */
export function ShiftHistory() {
  const [rows, setRows] = useState<Row[] | null>(null);
  const [open, setOpen] = useState<Row | null>(null);

  useEffect(() => {
    listShifts().then(async (shifts) => setRows(await Promise.all(shifts.map(async (shift) => ({ shift, summary: await shiftSummary(shift) })))));
  }, []);

  const monthStart = startOfMonth(Date.now());
  const people = new Map<string, { shifts: number; sales: number; diff: number; short: number }>();
  for (const { shift, summary } of rows ?? []) {
    if (shift.openedAt < monthStart) continue;
    const p = people.get(shift.userName) ?? { shifts: 0, sales: 0, diff: 0, short: 0 };
    const d = cashDiff(shift) ?? 0;
    people.set(shift.userName, { shifts: p.shifts + 1, sales: p.sales + summary.total, diff: p.diff + d, short: p.short + (d < 0 ? 1 : 0) });
  }

  return (
    <main className="pb-10">
      <PageHeader title="ກະພະນັກງານ" sub="ໃຜເຂົ້າກະ, ຂາຍໄດ້ເທົ່າໃດ, ເງິນໃນລິ້ນຊັກຂາດ ຫຼື ເກີນ" />
      <div className="grid gap-5 px-6 lg:px-8">
        {people.size > 0 && (
          <Panel title="ເດືອນນີ້ ແຍກຕາມພະນັກງານ">
            <table className="w-full text-left">
              <thead className="text-sm text-muted">
                <tr className="border-b border-line">
                  <th className="px-5 py-3 font-medium">ພະນັກງານ</th>
                  <th className="py-3 text-right font-medium">ກະ</th>
                  <th className="py-3 text-right font-medium">ຍອດຂາຍ</th>
                  <th className="hidden py-3 text-right font-medium md:table-cell">ກະທີ່ເງິນຂາດ</th>
                  <th className="px-5 py-3 text-right font-medium">ເງິນຂາດ/ເກີນ ລວມ</th>
                </tr>
              </thead>
              <tbody>
                {[...people].map(([name, p]) => (
                  <tr key={name} className="border-b border-line last:border-0">
                    <td className="px-5 py-3.5 font-medium">{name}</td>
                    <td className="num py-3.5 text-right">{fmt(p.shifts)}</td>
                    <td className="num py-3.5 text-right">{fmt(p.sales)}</td>
                    <td className={`num hidden py-3.5 text-right md:table-cell ${p.short ? "font-semibold text-chili" : "text-muted"}`}>{fmt(p.short)}</td>
                    <td className="px-5 py-3.5 text-right">
                      <DiffBadge diff={p.diff} />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </Panel>
        )}

        <Panel title="ກະທັງໝົດ">
          {rows === null ? (
            <p className="p-6 text-muted">ກຳລັງໂຫຼດ…</p>
          ) : rows.length === 0 ? (
            <p className="p-6 text-muted">ຍັງບໍ່ມີກະ — ພະນັກງານເປີດກະໄດ້ໃນໜ້າຂາຍ</p>
          ) : (
            <table className="w-full text-left">
              <thead className="text-sm text-muted">
                <tr className="border-b border-line">
                  <th className="px-5 py-3 font-medium">ພະນັກງານ</th>
                  <th className="py-3 font-medium">ເວລາ</th>
                  <th className="hidden py-3 text-right font-medium md:table-cell">ບິນ</th>
                  <th className="py-3 text-right font-medium">ຍອດຂາຍ</th>
                  <th className="px-5 py-3 text-right font-medium">ເງິນສົດ</th>
                </tr>
              </thead>
              <tbody>
                {rows.map((r) => (
                  <tr key={r.shift.id} onClick={() => setOpen(r)} className="cursor-pointer border-b border-line last:border-0 active:bg-ink-faint">
                    <td className="px-5 py-3.5 font-medium">{r.shift.userName}</td>
                    <td className="num py-3.5 text-muted">{shiftTimes(r.shift)}</td>
                    <td className="num hidden py-3.5 text-right md:table-cell">{fmt(r.summary.bills)}</td>
                    <td className="num py-3.5 text-right font-semibold">{fmt(r.summary.total)}</td>
                    <td className="px-5 py-3.5 text-right">
                      <DiffBadge diff={cashDiff(r.shift)} />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </Panel>
      </div>

      <Sheet open={!!open} onClose={() => setOpen(null)} title="ລາຍລະອຽດກະ" width="max-w-md">
        {open && (
          <div className="p-5">
            <ShiftReport shift={open.shift} summary={open.summary} />
          </div>
        )}
      </Sheet>
    </main>
  );
}
