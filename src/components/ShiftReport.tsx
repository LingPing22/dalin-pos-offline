"use client";
import type { Shift, ShiftSummary } from "@/lib/db";
import { fmt } from "@/lib/money";
import { fmtDate, fmtTime } from "@/lib/time";
import { METHOD_LABEL, type PaymentMethod } from "@/lib/types";

const METHODS: PaymentMethod[] = ["cash", "qr", "card"];

/** counted − expected: negative = cash missing from the drawer */
export function cashDiff(shift: Shift): number | null {
  return shift.countedCash === null || shift.expectedCash === null ? null : shift.countedCash - shift.expectedCash;
}

export function DiffBadge({ diff, className = "" }: { diff: number | null; className?: string }) {
  if (diff === null) return <span className={`rounded-md bg-ink-faint px-2 py-0.5 text-sm text-muted ${className}`}>ກຳລັງເປີດ</span>;
  if (diff === 0) return <span className={`rounded-md bg-leaf/12 px-2 py-0.5 text-sm font-medium text-leaf ${className}`}>ພໍດີ</span>;
  return diff < 0 ? (
    <span className={`num rounded-md bg-chili-faint px-2 py-0.5 text-sm font-semibold text-chili ${className}`}>ຂາດ {fmt(-diff)} ₭</span>
  ) : (
    <span className={`num rounded-md bg-marigold-faint px-2 py-0.5 text-sm font-semibold text-marigold-deep ${className}`}>ເກີນ {fmt(diff)} ₭</span>
  );
}

function Row({ label, value, strong = false, className = "" }: { label: React.ReactNode; value: React.ReactNode; strong?: boolean; className?: string }) {
  return (
    <div className={`flex items-baseline justify-between gap-4 py-1.5 ${strong ? "font-semibold" : ""} ${className}`}>
      <span className={strong ? "" : "text-muted"}>{label}</span>
      <span className="num text-right">{value}</span>
    </div>
  );
}

export function shiftTimes(s: Shift) {
  return `${fmtDate(s.openedAt)} ${fmtTime(s.openedAt)} – ${s.closedAt ? fmtTime(s.closedAt) : "ດຽວນີ້"}`;
}

/** Full shift sheet: who, when, sales by method, and the drawer count */
export function ShiftReport({ shift, summary }: { shift: Shift; summary: ShiftSummary }) {
  const diff = cashDiff(shift);
  const expected = shift.expectedCash ?? shift.openingCash + summary.byMethod.cash;
  return (
    <div className="grid gap-4">
      <div>
        <p className="text-lg font-semibold">{shift.userName}</p>
        <p className="num text-muted">{shiftTimes(shift)}</p>
        {shift.closedByName && shift.closedById !== shift.userId && (
          <p className="mt-1 text-sm text-marigold-deep">ປິດກະໂດຍ {shift.closedByName} (ບໍ່ແມ່ນເຈົ້າຂອງກະ)</p>
        )}
      </div>

      <section className="rounded-2xl bg-white px-4 py-2 ring-1 ring-line">
        <Row label="ບິນຂາຍ" value={fmt(summary.bills)} />
        {METHODS.map((m) => (
          <Row key={m} label={METHOD_LABEL[m]} value={`${fmt(summary.byMethod[m])} ₭`} />
        ))}
        <Row label="ຍອດຂາຍລວມ" value={`${fmt(summary.total)} ₭`} strong className="border-t border-line" />
      </section>

      <section className="rounded-2xl bg-white px-4 py-2 ring-1 ring-line">
        <Row label="ເງິນຕັ້ງຕົ້ນໃນລິ້ນຊັກ" value={`${fmt(shift.openingCash)} ₭`} />
        <Row label="+ ຂາຍເປັນເງິນສົດ" value={`${fmt(summary.byMethod.cash)} ₭`} />
        <Row label="= ຄວນມີໃນລິ້ນຊັກ" value={`${fmt(expected)} ₭`} strong className="border-t border-line" />
        {shift.countedCash !== null && <Row label="ນັບໄດ້ຈິງ" value={`${fmt(shift.countedCash)} ₭`} strong />}
        <div className="flex justify-end py-1.5">
          <DiffBadge diff={diff} />
        </div>
      </section>

      <section className="rounded-2xl bg-white px-4 py-2 ring-1 ring-line">
        <Row label="ສ່ວນຫຼຸດ" value={`${fmt(summary.discount)} ₭ (${fmt(summary.discountBills)} ບິນ)`} />
        <Row label="ບິນຍົກເລີກ" value={`${fmt(summary.voids)} ບິນ (${fmt(summary.voidTotal)} ₭)`} />
      </section>
    </div>
  );
}

/** Plain text for sending the shift summary to the owner (LINE etc.) */
export function shiftText(shift: Shift, s: ShiftSummary, shopName: string) {
  const diff = cashDiff(shift);
  const diffText = diff === null ? "" : diff === 0 ? "ພໍດີ" : diff < 0 ? `ຂາດ ${fmt(-diff)} ₭` : `ເກີນ ${fmt(diff)} ₭`;
  return [
    `ສະຫຼຸບກະ — ${shopName}`,
    `${shift.userName} · ${shiftTimes(shift)}`,
    `ບິນ: ${fmt(s.bills)} · ຍອດຂາຍ: ${fmt(s.total)} ₭`,
    ...METHODS.map((m) => `  ${METHOD_LABEL[m]}: ${fmt(s.byMethod[m])} ₭`),
    `ເງິນຕັ້ງຕົ້ນ: ${fmt(shift.openingCash)} ₭`,
    `ຄວນມີ: ${fmt(shift.expectedCash ?? 0)} ₭ · ນັບໄດ້: ${fmt(shift.countedCash ?? 0)} ₭ · ${diffText}`,
    `ສ່ວນຫຼຸດ: ${fmt(s.discount)} ₭ · ຍົກເລີກ: ${fmt(s.voids)} ບິນ`,
    shift.closedByName && shift.closedById !== shift.userId ? `ປິດກະໂດຍ: ${shift.closedByName}` : "",
  ]
    .filter(Boolean)
    .join("\n");
}
