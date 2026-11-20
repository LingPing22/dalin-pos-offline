/** Sales numbers shared by the dashboard and the Excel export, so both always agree. */
import type { Expense, Order } from "./db";
import { excelDate, type SheetDef } from "./xlsx";
import { METHOD_LABEL, type PaymentMethod } from "./types";
import { DAY, LAO_DAYS, TZ_OFFSET_MS, fmtDate, startOfDay } from "./time";

const METHODS: PaymentMethod[] = ["cash", "qr", "card"];

export function totals(orders: Order[], expenses: Expense[]) {
  const paid = orders.filter((o) => o.status === "paid");
  const sum = (f: (o: Order) => number) => paid.reduce((s, o) => s + f(o), 0);
  const total = sum((o) => o.total);
  const discount = sum((o) => o.discount);
  const tax = sum((o) => o.tax);
  const fee = sum((o) => o.fee);
  const cost = sum((o) => o.cost);
  const exp = expenses.reduce((s, e) => s + e.amount, 0);
  const netRevenue = total - tax - fee;
  const byMethod = Object.fromEntries(METHODS.map((m) => [m, paid.filter((o) => o.paymentMethod === m).reduce((s, o) => s + o.total, 0)])) as Record<PaymentMethod, number>;
  const voids = orders.filter((o) => o.status === "void");
  return {
    bills: paid.length,
    gross: total + discount,
    discount,
    total,
    tax,
    fee,
    netRevenue,
    cost,
    expenses: exp,
    netProfit: netRevenue - cost - exp,
    byMethod,
    voids: voids.length,
    voidTotal: voids.reduce((s, o) => s + o.total, 0),
  };
}

/** Items sold, hot / iced / blended kept apart */
export function itemsSold(orders: Order[]) {
  const items = new Map<string, { productId: number | null; name: string; qty: number; revenue: number; cost: number }>();
  for (const o of orders)
    if (o.status === "paid")
      for (const it of o.items) {
        const k = `${it.productId ?? it.name}:${it.variant ?? ""}`;
        const row = items.get(k) ?? { productId: it.productId, name: it.name, qty: 0, revenue: 0, cost: 0 };
        row.qty += it.qty;
        row.revenue += it.lineTotal;
        row.cost += it.cost * it.qty;
        items.set(k, row);
      }
  return [...items.values()];
}

const weekday = (t: number) => LAO_DAYS[new Date(t + TZ_OFFSET_MS).getUTCDay()];

/**
 * The workbook the owner opens in Excel / Numbers: a one-look summary first, then one row per
 * day, every bill, what sold, and expenses.
 */
export function salesSheets({ orders, expenses, start, end, shopName, title }: { orders: Order[]; expenses: Expense[]; start: number; end: number; shopName: string; title: string }): SheetDef[] {
  const sorted = [...orders].sort((a, b) => a.createdAt - b.createdAt);
  const all = totals(sorted, expenses);
  const lastDay = startOfDay(end - 1);

  const summary: SheetDef = {
    name: "ສະຫຼຸບ",
    columns: [
      { header: shopName, width: 30 },
      { header: title, width: 26, type: "money" },
    ],
    rows: [
      ["ຊ່ວງວັນທີ", start === lastDay ? fmtDate(start) : `${fmtDate(start)} – ${fmtDate(lastDay)}`],
      ["ຍອດຂາຍລວມ (₭)", all.total],
      ["ຈຳນວນບິນ", all.bills],
      ...METHODS.map((m): [string, number] => [`  ${METHOD_LABEL[m]} (₭)`, all.byMethod[m]]),
      ["ສ່ວນຫຼຸດ (₭)", all.discount],
      ["ບິນຍົກເລີກ", all.voids],
      ["ຕົ້ນທຶນສິນຄ້າ (₭)", all.cost],
      ["ອາກອນ (₭)", all.tax],
      ["ຄ່າທຳນຽມ QR / ບັດ (₭)", all.fee],
      ["ຄ່າໃຊ້ຈ່າຍ (₭)", all.expenses],
    ],
    totals: ["ກຳໄລສຸດທິ (₭)", all.netProfit],
  };

  const days: SheetDef["rows"] = [];
  for (let d = startOfDay(start); d <= lastDay; d += DAY) {
    const t = totals(
      sorted.filter((o) => o.createdAt >= d && o.createdAt < d + DAY),
      expenses.filter((e) => e.date >= d && e.date < d + DAY),
    );
    days.push([excelDate(d), weekday(d), t.bills, t.total, ...METHODS.map((m) => t.byMethod[m]), t.discount, t.voids, t.cost, t.tax, t.fee, t.expenses, t.netProfit]);
  }
  const daily: SheetDef = {
    name: "ລາຍວັນ",
    columns: [
      { header: "ວັນທີ", width: 12, type: "date" },
      { header: "ມື້", width: 12 },
      { header: "ບິນ", width: 8, type: "int" },
      { header: "ຍອດຂາຍ", type: "money" },
      ...METHODS.map((m): { header: string; type: "money" } => ({ header: METHOD_LABEL[m], type: "money" })),
      { header: "ສ່ວນຫຼຸດ", type: "money" },
      { header: "ບິນຍົກເລີກ", width: 10, type: "int" },
      { header: "ຕົ້ນທຶນສິນຄ້າ", type: "money" },
      { header: "ອາກອນ", type: "money" },
      { header: "ຄ່າທຳນຽມ", type: "money" },
      { header: "ຄ່າໃຊ້ຈ່າຍ", type: "money" },
      { header: "ກຳໄລສຸດທິ", type: "money" },
    ],
    rows: days,
    totals: ["ລວມ", null, all.bills, all.total, ...METHODS.map((m) => all.byMethod[m]), all.discount, all.voids, all.cost, all.tax, all.fee, all.expenses, all.netProfit],
  };

  const bills: SheetDef = {
    name: "ບິນ",
    columns: [
      { header: "ເລກບິນ", width: 18 },
      { header: "ວັນທີ ເວລາ", width: 17, type: "datetime" },
      { header: "ພະນັກງານ", width: 14 },
      { header: "ລາຍການ", width: 46 },
      { header: "ສ່ວນຫຼຸດ", width: 11, type: "money" },
      { header: "ຍອດ", type: "money" },
      { header: "ຊຳລະດ້ວຍ", width: 11 },
      { header: "ສະຖານະ", width: 10 },
      { header: "ເຫດຜົນຍົກເລີກ", width: 24 },
    ],
    rows: sorted.map((o) => [
      o.billNo,
      excelDate(o.createdAt),
      o.cashierName,
      o.items.map((it) => `${it.name} ×${it.qty}`).join(", "),
      o.discount || null,
      o.total,
      METHOD_LABEL[o.paymentMethod],
      o.status === "paid" ? "ຂາຍ" : "ຍົກເລີກ",
      o.status === "void" ? [o.voidReason, o.voidedByName && `ອະນຸມັດໂດຍ ${o.voidedByName}`].filter(Boolean).join(" · ") : null,
    ]),
    totals: ["ລວມ (ບໍ່ນັບບິນຍົກເລີກ)", null, null, null, all.discount, all.total, null, null, null],
  };

  const sold = itemsSold(sorted).sort((a, b) => b.revenue - a.revenue);
  const items: SheetDef = {
    name: "ສິນຄ້າທີ່ຂາຍ",
    columns: [
      { header: "ສິນຄ້າ", width: 30 },
      { header: "ຈຳນວນ", width: 10, type: "int" },
      { header: "ຍອດຂາຍ", type: "money" },
      { header: "ຕົ້ນທຶນ", type: "money" },
      { header: "ກຳໄລຂັ້ນຕົ້ນ", type: "money" },
    ],
    rows: sold.map((i) => [i.name, i.qty, i.revenue, i.cost, i.revenue - i.cost]),
    totals: ["ລວມ", sold.reduce((s, i) => s + i.qty, 0), sold.reduce((s, i) => s + i.revenue, 0), sold.reduce((s, i) => s + i.cost, 0), sold.reduce((s, i) => s + i.revenue - i.cost, 0)],
  };

  const exp: SheetDef = {
    name: "ຄ່າໃຊ້ຈ່າຍ",
    columns: [
      { header: "ວັນທີ", width: 12, type: "date" },
      { header: "ປະເພດ", width: 18 },
      { header: "ລາຍລະອຽດ", width: 30 },
      { header: "ຈຳນວນເງິນ", type: "money" },
    ],
    rows: [...expenses].sort((a, b) => a.date - b.date).map((e) => [excelDate(e.date), e.category, e.note, e.amount]),
    totals: ["ລວມ", null, null, all.expenses],
  };

  return [summary, daily, bills, items, exp];
}
