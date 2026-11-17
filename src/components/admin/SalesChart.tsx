"use client";
import { useState } from "react";
import { Bar, BarChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { fmt, kipShort } from "@/lib/money";
import { TZ_OFFSET_MS } from "@/lib/time";

type Point = { t: number; total: number | null; bills: number };

const local = (t: number) => new Date(t + TZ_OFFSET_MS);
const dowLao = ["ອາທິດ", "ຈັນ", "ອັງຄານ", "ພຸດ", "ພະຫັດ", "ສຸກ", "ເສົາ"];

export function SalesChart({ series, bucket }: { series: Point[]; bucket: "hour" | "day" }) {
  const [asTable, setAsTable] = useState(false);

  let data = series;
  if (bucket === "hour") {
    // Show opening hours, widened if there were sales outside them
    const withSales = series.map((p, i) => ((p.total ?? 0) > 0 ? i : -1)).filter((i) => i >= 0);
    const from = Math.min(6, withSales[0] ?? 6);
    const to = Math.max(21, withSales[withSales.length - 1] ?? 21);
    data = series.slice(from, to + 1);
  }
  const label = (t: number) => {
    const d = local(t);
    return bucket === "hour" ? `${String(d.getUTCHours()).padStart(2, "0")}:00` : series.length <= 7 ? dowLao[d.getUTCDay()] : String(d.getUTCDate());
  };
  const full = (t: number) => {
    const d = local(t);
    return bucket === "hour"
      ? `${String(d.getUTCHours()).padStart(2, "0")}:00 – ${String(d.getUTCHours() + 1).padStart(2, "0")}:00`
      : `${d.getUTCDate()}/${d.getUTCMonth() + 1}/${d.getUTCFullYear()}`;
  };
  const rows = data.map((p) => ({ ...p, label: label(p.t) }));

  return (
    <div className="flex flex-1 flex-col px-2 pb-4">
      <div className="flex justify-end px-3">
        <button onClick={() => setAsTable((v) => !v)} className="h-9 rounded-lg px-3 text-sm text-ink-soft underline underline-offset-4">
          {asTable ? "ເບິ່ງເປັນກຣາບ" : "ເບິ່ງເປັນຕາຕະລາງ"}
        </button>
      </div>
      {asTable ? (
        <div className="max-h-72 overflow-y-auto px-3">
          <table className="w-full text-left">
            <thead className="sticky top-0 bg-white text-sm text-muted">
              <tr>
                <th className="py-2 font-medium">{bucket === "hour" ? "ເວລາ" : "ວັນທີ"}</th>
                <th className="py-2 text-right font-medium">ບິນ</th>
                <th className="py-2 text-right font-medium">ຍອດຂາຍ (₭)</th>
              </tr>
            </thead>
            <tbody>
              {rows.filter((r) => r.total !== null).map((r) => (
                <tr key={r.t} className="border-t border-line">
                  <td className="py-2">{full(r.t)}</td>
                  <td className="num py-2 text-right">{r.bills}</td>
                  <td className="num py-2 text-right">{fmt(r.total ?? 0)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : (
        <div className="h-72 lg:h-auto lg:min-h-72 lg:flex-1">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={rows} margin={{ top: 8, right: 12, left: 4, bottom: 0 }} barCategoryGap={2}>
              <CartesianGrid vertical={false} stroke="var(--color-line)" strokeDasharray="0" />
              <XAxis
                dataKey="label"
                tickLine={false}
                axisLine={{ stroke: "var(--color-line)" }}
                tick={{ fill: "var(--color-muted)", fontSize: 12 }}
                interval="preserveStartEnd"
                minTickGap={8}
              />
              <YAxis
                tickFormatter={(v: number) => kipShort(v)}
                tickLine={false}
                axisLine={false}
                width={48}
                tick={{ fill: "var(--color-muted)", fontSize: 12 }}
              />
              <Tooltip
                cursor={{ fill: "var(--color-ink-faint)" }}
                content={({ active, payload }) => {
                  const p = active && payload?.[0]?.payload as (Point & { label: string }) | undefined;
                  if (!p || p.total === null) return null;
                  return (
                    <div className="rounded-xl bg-white px-4 py-3 shadow-lg ring-1 ring-line">
                      <p className="text-sm text-muted">{full(p.t)}</p>
                      <p className="num text-lg font-semibold">{fmt(p.total)} ₭</p>
                      <p className="num text-sm text-muted">{p.bills} ບິນ</p>
                    </div>
                  );
                }}
              />
              <Bar dataKey="total" fill="var(--color-ink)" radius={[4, 4, 0, 0]} maxBarSize={36} isAnimationActive={false} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      )}
    </div>
  );
}
