"use client";
import { expensesBetween, ordersBetween } from "./store";
import { itemsSold, totals } from "./sales-sheets";
import { DAY, HOUR, TZ_OFFSET_MS, addMonths, startOfDay, startOfMonth, startOfWeek } from "./time";
import type { PaymentMethod } from "./types";

export type Period = "today" | "week" | "month";
export const PERIODS: Period[] = ["today", "week", "month"];

type Range = { start: number; end: number; prevStart: number; prevEnd: number; bucket: "hour" | "day"; slots: number };

export function periodRange(period: Period, now = Date.now()): Range {
  let start: number, prevStart: number, slots: number, bucket: Range["bucket"];
  if (period === "today") {
    start = startOfDay(now);
    prevStart = start - DAY;
    bucket = "hour";
    slots = 24;
  } else if (period === "week") {
    start = startOfWeek(now);
    prevStart = start - 7 * DAY;
    bucket = "day";
    slots = 7;
  } else {
    start = startOfMonth(now);
    prevStart = addMonths(start, -1);
    bucket = "day";
    slots = Math.round((addMonths(start, 1) - start) / DAY);
  }
  // Compare like with like: the same elapsed time in the previous period
  const elapsed = now - start;
  return { start, end: now + 1, prevStart, prevEnd: Math.min(prevStart + elapsed + 1, start), bucket, slots };
}

export type Report = Awaited<ReturnType<typeof getReport>>;

export async function getReport(period: Period, now = Date.now()) {
  const r = periodRange(period, now);
  const [allOrders, allExpenses] = await Promise.all([ordersBetween(r.prevStart, r.end), expensesBetween(r.prevStart, r.end)]);
  const inCur = (t: number) => t >= r.start && t < r.end;
  const inPrev = (t: number) => t >= r.prevStart && t < r.prevEnd;
  const orders = allOrders.filter((o) => inCur(o.createdAt));
  const paid = orders.filter((o) => o.status === "paid");
  const expenses = allExpenses.filter((e) => inCur(e.date));

  const current = totals(orders, expenses);
  const previous = totals(allOrders.filter((o) => inPrev(o.createdAt)), allExpenses.filter((e) => inPrev(e.date)));

  // Sales over time in local (UTC+7) buckets
  const size = r.bucket === "hour" ? HOUR : DAY;
  const first = Math.floor((r.start + TZ_OFFSET_MS) / size);
  const nowIdx = Math.floor((now + TZ_OFFSET_MS) / size) - first;
  const series = Array.from({ length: r.slots }, (_, i) => ({ t: r.start + i * size, total: i <= nowIdx ? 0 : (null as number | null), bills: 0 }));
  for (const o of paid) {
    const i = Math.floor((o.createdAt + TZ_OFFSET_MS) / size) - first;
    if (series[i]) {
      series[i].total = (series[i].total ?? 0) + o.total;
      series[i].bills++;
    }
  }

  const methods = (["cash", "qr", "card"] as PaymentMethod[]).map((m) => {
    const list = paid.filter((o) => o.paymentMethod === m);
    return { method: m, total: list.reduce((s, o) => s + o.total, 0), fee: list.reduce((s, o) => s + o.fee, 0), bills: list.length };
  });

  const topItems = itemsSold(orders).sort((a, b) => b.qty - a.qty).slice(0, 8);

  const byCat = new Map<string, number>();
  for (const e of expenses) byCat.set(e.category, (byCat.get(e.category) ?? 0) + e.amount);
  const expenseByCategory = [...byCat].map(([category, amount]) => ({ category, amount })).sort((a, b) => b.amount - a.amount);

  const recent = [...allOrders]
    .sort((a, b) => b.createdAt - a.createdAt)
    .slice(0, 6)
    .map(({ id, billNo, createdAt, total, paymentMethod, status }) => ({ id, billNo, createdAt, total, paymentMethod, status }));

  return { period, range: r, current, previous, series, methods, topItems, expenseByCategory, recent };
}
