"use client";
import { useEffect, useState } from "react";
import Link from "next/link";
import { ArrowDownRight, ArrowUpRight, Banknote, CreditCard, HardDriveDownload, QrCode } from "lucide-react";
import { getReport, PERIODS, type Period, type Report } from "@/lib/report";
import { getMeta, getReceipt, getSettings } from "@/lib/store";
import { fmt } from "@/lib/money";
import { DAY, fmtDate, fmtTime } from "@/lib/time";
import { METHOD_LABEL, type PaymentMethod, type ReceiptData, type ShopSettings } from "@/lib/types";
import { PageHeader, Panel } from "@/components/ui/form";
import { Sheet } from "@/components/ui/Sheet";
import { ReceiptSlip } from "@/components/ReceiptSlip";
import { SalesChart } from "@/components/admin/SalesChart";

const PERIOD_LABEL: Record<Period, string> = { today: "ມື້ນີ້", week: "ອາທິດນີ້", month: "ເດືອນນີ້" };
const PREV_LABEL: Record<Period, string> = { today: "ມື້ວານ", week: "ອາທິດກ່ອນ", month: "ເດືອນກ່ອນ" };
const METHOD_ICON: Record<PaymentMethod, typeof Banknote> = { cash: Banknote, qr: QrCode, card: CreditCard };
const METHOD_COLOR: Record<PaymentMethod, string> = { cash: "var(--color-leaf)", qr: "var(--color-qr)", card: "var(--color-card)" };

export default function DashboardPage() {
  const [period, setPeriod] = useState<Period>("today");
  const [r, setR] = useState<Report | null>(null);
  const [settings, setSettings] = useState<ShopSettings | null>(null);
  const [bill, setBill] = useState<ReceiptData | null>(null);
  const [needBackup, setNeedBackup] = useState(false);

  useEffect(() => {
    getReport(period).then(setR);
  }, [period]);
  useEffect(() => {
    getSettings().then(setSettings);
    getMeta<number>("lastBackupAt").then((t) => setNeedBackup(!t || Date.now() - t > 7 * DAY));
  }, []);

  if (!r) return <p className="p-8 text-muted">ກຳລັງໂຫຼດ…</p>;
  const c = r.current;
  const rangeText =
    period === "today" ? fmtDate(r.range.start) : `${fmtDate(r.range.start)} – ${fmtDate(Math.min(r.range.end - 1, r.range.start + r.range.slots * DAY - 1))}`;

  return (
    <main className="pb-10">
      <PageHeader title={`ພາບລວມ${PERIOD_LABEL[period]}`} sub={rangeText}>
        <div className="flex rounded-2xl bg-white p-1 ring-1 ring-line" role="tablist">
          {PERIODS.map((p) => (
            <button
              key={p}
              onClick={() => setPeriod(p)}
              role="tab"
              aria-selected={p === period}
              className={`grid h-11 place-items-center rounded-xl px-5 font-medium ${p === period ? "bg-ink text-white" : "text-muted active:bg-ink-faint"}`}
            >
              {PERIOD_LABEL[p]}
            </button>
          ))}
        </div>
      </PageHeader>

      <div className="grid gap-5 px-6 lg:px-8">
        {needBackup && c.bills + r.previous.bills > 0 && (
          <Link href="/settings/#backup" className="flex items-center gap-3 rounded-2xl bg-marigold-faint px-5 py-4 text-ink ring-1 ring-marigold">
            <HardDriveDownload className="size-6 shrink-0 text-marigold-deep" />
            <span className="flex-1">
              <b>ຄວນສຳຮອງຂໍ້ມູນ</b> — ຂໍ້ມູນທັງໝົດຢູ່ໃນ iPad ເຄື່ອງນີ້ເທົ່ານັ້ນ. ແຕະເພື່ອສຳຮອງ ແລ້ວສົ່ງໄຟລ໌ເກັບໄວ້ໃນ LINE ຫຼື Google Drive.
            </span>
          </Link>
        )}
        {/* KPI band — one panel, four readings */}
        <section className="grid grid-cols-2 overflow-hidden rounded-2xl bg-white ring-1 ring-line lg:grid-cols-4">
          <Kpi label="ຍອດຂາຍ" value={`${fmt(c.total)} ₭`} now={c.total} before={r.previous.total} prevLabel={PREV_LABEL[period]} />
          <Kpi label="ຈຳນວນບິນ" value={fmt(c.bills)} now={c.bills} before={r.previous.bills} prevLabel={PREV_LABEL[period]} />
          <Kpi
            label="ສະເລ່ຍຕໍ່ບິນ"
            value={`${fmt(c.bills ? c.total / c.bills : 0)} ₭`}
            now={c.bills ? c.total / c.bills : 0}
            before={r.previous.bills ? r.previous.total / r.previous.bills : 0}
            prevLabel={PREV_LABEL[period]}
          />
          <Kpi
            label="ກຳໄລສຸດທິ"
            value={`${fmt(c.netProfit)} ₭`}
            now={c.netProfit}
            before={r.previous.netProfit}
            prevLabel={PREV_LABEL[period]}
            tone={c.netProfit >= 0 ? "text-leaf" : "text-chili"}
          />
        </section>

        <div className="grid gap-5 lg:grid-cols-[1.55fr_1fr]">
          <Panel title={period === "today" ? "ຍອດຂາຍລາຍຊົ່ວໂມງ" : "ຍອດຂາຍລາຍວັນ"} className="flex flex-col">
            <SalesChart series={r.series} bucket={r.range.bucket} />
          </Panel>
          <ProfitLedger r={r} />
        </div>

        <div className="grid gap-5 lg:grid-cols-2">
          <TopItems items={r.topItems} />
          <div className="grid gap-5">
            <PaymentSplit methods={r.methods} total={c.total} />
            <Panel title="ຄ່າໃຊ້ຈ່າຍຈິປາຖະໜາ" action={<Link href="/expenses/" className="text-sm font-medium text-ink-soft underline underline-offset-4">ບັນທຶກຄ່າໃຊ້ຈ່າຍ</Link>}>
              {r.expenseByCategory.length === 0 ? (
                <p className="px-5 pb-5 text-muted">ຍັງບໍ່ມີຄ່າໃຊ້ຈ່າຍໃນຊ່ວງນີ້</p>
              ) : (
                <ul className="px-5 pb-4">
                  {r.expenseByCategory.map((e) => (
                    <li key={e.category} className="flex justify-between border-b border-line py-2 last:border-0">
                      <span>{e.category}</span>
                      <span className="num">{fmt(e.amount)}</span>
                    </li>
                  ))}
                </ul>
              )}
            </Panel>
          </div>
        </div>

        <Panel title="ບິນລ່າສຸດ" action={<Link href="/sales/" className="text-sm font-medium text-ink-soft underline underline-offset-4">ເບິ່ງທັງໝົດ</Link>}>
          <table className="w-full text-left">
            <thead className="text-sm text-muted">
              <tr className="border-b border-line">
                <th className="px-5 py-2 font-medium">ເວລາ</th>
                <th className="py-2 font-medium">ເລກບິນ</th>
                <th className="py-2 font-medium">ຊຳລະດ້ວຍ</th>
                <th className="px-5 py-2 text-right font-medium">ຍອດ</th>
              </tr>
            </thead>
            <tbody>
              {r.recent.map((o) => (
                <tr key={o.id} className="border-b border-line last:border-0">
                  <td className="num px-5 py-3 text-muted">{fmtTime(o.createdAt)}</td>
                  <td className="py-3">
                    <button onClick={() => getReceipt(o.id).then(setBill)} className="num font-medium underline-offset-4 active:underline">
                      {o.billNo}
                    </button>
                    {o.status === "void" && <span className="ml-2 rounded-md bg-chili-faint px-2 py-0.5 text-xs text-chili">ຍົກເລີກ</span>}
                  </td>
                  <td className="py-3">{METHOD_LABEL[o.paymentMethod]}</td>
                  <td className={`num px-5 py-3 text-right font-medium ${o.status === "void" ? "text-muted line-through" : ""}`}>{fmt(o.total)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </Panel>
      </div>

      <Sheet open={!!bill} onClose={() => setBill(null)} title={bill?.billNo} width="max-w-md">
        {bill && settings && (
          <div className="p-5">
            <ReceiptSlip r={bill} s={settings} className="mx-auto max-w-[340px] torn-edge shadow-md" />
          </div>
        )}
      </Sheet>
    </main>
  );
}

function Kpi({ label, value, now, before, prevLabel, tone = "" }: { label: string; value: string; now: number; before: number; prevLabel: string; tone?: string }) {
  const pct = before ? ((now - before) / Math.abs(before)) * 100 : null;
  const up = (pct ?? 0) >= 0;
  return (
    <div className="border-line p-5 [&:nth-child(odd)]:border-r lg:border-r lg:last:border-r-0 max-lg:[&:nth-child(-n+2)]:border-b">
      <p className="text-muted">{label}</p>
      <p className={`num mt-1 text-[28px] font-semibold leading-tight tracking-tight ${tone}`}>{value}</p>
      <p className="mt-1.5 flex items-center gap-1 text-sm text-muted" title={`ທຽບກັບ${prevLabel} ໃນຊ່ວງເວລາດຽວກັນ`}>
        {pct === null ? (
          `ບໍ່ມີຂໍ້ມູນ${prevLabel}`
        ) : (
          <>
            <span className={`num inline-flex items-center font-medium ${up ? "text-leaf" : "text-chili"}`}>
              {up ? <ArrowUpRight className="size-4" /> : <ArrowDownRight className="size-4" />}
              {Math.abs(pct).toFixed(1)}%
            </span>
            ທຽບ{prevLabel}
          </>
        )}
      </p>
    </div>
  );
}

/** Gross sales down to net profit, one deduction per line */
function ProfitLedger({ r }: { r: Report }) {
  const c = r.current;
  const base = Math.max(c.gross, 1);
  const fees = r.methods.filter((m) => m.fee > 0).map((m) => `${METHOD_LABEL[m.method]} ${fmt(m.fee)}`).join(", ");
  type Row = { label: string; value: number; kind: "start" | "minus" | "sum" | "result"; note?: string };
  const rows: Row[] = [
    { label: "ຍອດຂາຍກ່ອນສ່ວນຫຼຸດ", value: c.gross, kind: "start" },
    { label: "ສ່ວນຫຼຸດ", value: c.discount, kind: "minus" },
    { label: "ເງິນຮັບຈາກລູກຄ້າ", value: c.total, kind: "sum" },
    { label: "ພາສີມູນຄ່າເພີ່ມ (VAT)", value: c.tax, kind: "minus", note: "ຕ້ອງນຳສົ່ງລັດ" },
    { label: "ຄ່າທຳມະນຽມການຊຳລະ", value: c.fee, kind: "minus", note: fees || undefined },
    { label: "ລາຍຮັບສຸດທິ", value: c.netRevenue, kind: "sum" },
    { label: "ຕົ້ນທຶນສິນຄ້າ", value: c.cost, kind: "minus" },
    { label: "ຄ່າໃຊ້ຈ່າຍຈິປາຖະໜາ", value: c.expenses, kind: "minus" },
  ];
  const margin = c.total ? (c.netProfit / c.total) * 100 : 0;
  return (
    <Panel title="ຈາກຍອດຂາຍ ຫາ ກຳໄລສຸດທິ">
      <ul className="px-5">
        {rows.map((row) => (
          <li key={row.label} className={`py-2 ${row.kind === "sum" ? "border-t border-line" : ""}`}>
            <div className="flex items-baseline justify-between gap-3">
              <span className={row.kind === "minus" ? "pl-4 text-muted" : "font-medium"}>
                {row.kind === "minus" && <span className="-ml-4 inline-block w-4">−</span>}
                {row.label}
              </span>
              <span className={`num ${row.kind === "minus" ? "text-muted" : "font-semibold"}`}>{fmt(row.value)}</span>
            </div>
            {row.note && <p className="pl-4 text-xs text-muted">{row.note}</p>}
            <div className="mt-1 h-1.5 rounded-full bg-paper">
              <div
                className="h-full rounded-full"
                style={{
                  width: `${Math.min(100, (Math.abs(row.value) / base) * 100)}%`,
                  background: row.kind === "minus" ? "var(--color-chili)" : "var(--color-ink)",
                  opacity: row.kind === "minus" ? 0.45 : 1,
                }}
              />
            </div>
          </li>
        ))}
      </ul>
      <div className="mx-5 mb-5 mt-3 flex items-end justify-between rounded-xl bg-paper px-4 py-4">
        <div>
          <p className="font-semibold">ກຳໄລສຸດທິ</p>
          <p className="num text-sm text-muted">{margin.toFixed(1)}% ຂອງຍອດຂາຍ</p>
        </div>
        <p className={`num text-3xl font-bold tracking-tight ${c.netProfit >= 0 ? "text-leaf" : "text-chili"}`}>{fmt(c.netProfit)} ₭</p>
      </div>
    </Panel>
  );
}

function TopItems({ items }: { items: Report["topItems"] }) {
  const max = Math.max(1, ...items.map((i) => i.qty));
  return (
    <Panel title="ສິນຄ້າຂາຍດີ">
      {items.length === 0 ? (
        <p className="px-5 pb-5 text-muted">ຍັງບໍ່ມີການຂາຍໃນຊ່ວງນີ້</p>
      ) : (
        <ol className="px-5 pb-4">
          {items.map((it, i) => (
            <li key={it.productId ?? it.name} className="grid grid-cols-[1.75rem_1fr_auto] items-center gap-x-3 py-2">
              <span className="num text-sm text-muted">{i + 1}</span>
              <div className="min-w-0">
                <div className="flex justify-between gap-3">
                  <span className="truncate font-medium">{it.name}</span>
                  <span className="num shrink-0 text-muted">{fmt(it.qty)} ອັນ</span>
                </div>
                <div className="mt-1 h-2 rounded-full bg-paper">
                  <div className="h-full rounded-full bg-ink-soft" style={{ width: `${(it.qty / max) * 100}%` }} />
                </div>
              </div>
              <span className="num w-28 text-right font-semibold">{fmt(it.revenue)}</span>
            </li>
          ))}
        </ol>
      )}
    </Panel>
  );
}

function PaymentSplit({ methods, total }: { methods: Report["methods"]; total: number }) {
  return (
    <Panel title="ແຍກຕາມວິທີຊຳລະ">
      <div className="px-5 pb-5">
        <div className="flex h-4 gap-0.5 overflow-hidden rounded-md bg-paper" role="img" aria-label="ສັດສ່ວນວິທີຊຳລະ">
          {methods.filter((m) => m.total > 0).map((m) => (
            <div key={m.method} style={{ width: `${(m.total / Math.max(total, 1)) * 100}%`, background: METHOD_COLOR[m.method] }} title={`${METHOD_LABEL[m.method]} ${fmt(m.total)}`} />
          ))}
        </div>
        <ul className="mt-4 grid gap-2">
          {methods.map((m) => {
            const Icon = METHOD_ICON[m.method];
            return (
              <li key={m.method} className="grid grid-cols-[auto_1fr_auto] items-center gap-3">
                <span className="grid size-9 place-items-center rounded-lg" style={{ background: `color-mix(in srgb, ${METHOD_COLOR[m.method]} 14%, white)` }}>
                  <Icon className="size-5" style={{ color: METHOD_COLOR[m.method] }} />
                </span>
                <span>
                  {METHOD_LABEL[m.method]}
                  <span className="num ml-2 text-sm text-muted">
                    {fmt(m.bills)} ບິນ{m.fee > 0 ? `, ຄ່າທຳມະນຽມ ${fmt(m.fee)}` : ""}
                  </span>
                </span>
                <span className="num text-right">
                  <span className="font-semibold">{fmt(m.total)}</span>
                  <span className="ml-2 inline-block w-12 text-sm text-muted">{total ? Math.round((m.total / total) * 100) : 0}%</span>
                </span>
              </li>
            );
          })}
        </ul>
      </div>
    </Panel>
  );
}
