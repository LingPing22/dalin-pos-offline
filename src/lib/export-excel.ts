"use client";
import { expensesBetween, getSettings, ordersBetween } from "./store";
import { salesSheets, totals } from "./sales-sheets";
import { buildXlsx } from "./xlsx";
import { DAY, addMonths, fmtDate, startOfDay, startOfMonth, toDateKey } from "./time";

export type ExportRange = "today" | "yesterday" | "month" | "lastMonth";
export const EXPORT_RANGES: ExportRange[] = ["today", "yesterday", "month", "lastMonth"];
export const EXPORT_LABEL: Record<ExportRange, string> = { today: "ມື້ນີ້", yesterday: "ມື້ວານ", month: "ເດືອນນີ້", lastMonth: "ເດືອນກ່ອນ" };

export function exportRange(range: ExportRange, now = Date.now()) {
  const today = startOfDay(now);
  const month = startOfMonth(now);
  if (range === "today") return { start: today, end: today + DAY, key: toDateKey(today) };
  if (range === "yesterday") return { start: today - DAY, end: today, key: toDateKey(today - DAY) };
  if (range === "month") return { start: month, end: today + DAY, key: toDateKey(month).slice(0, 7) };
  const prev = addMonths(month, -1);
  return { start: prev, end: month, key: toDateKey(prev).slice(0, 7) };
}

/** Builds the .xlsx for a range plus its totals for the screen. Share the file from a separate tap. */
export async function prepareSalesExcel(range: ExportRange, now = Date.now()) {
  const { start, end, key } = exportRange(range, now);
  const [orders, expenses, settings] = await Promise.all([ordersBetween(start, end), expensesBetween(start, end), getSettings()]);
  const sheets = salesSheets({ orders, expenses, start, end, shopName: settings.shop.name, title: `ລາຍງານຍອດຂາຍ ${EXPORT_LABEL[range]}` });
  const name = `dalin-sales-${key}.xlsx`;
  const file = new File([buildXlsx(sheets) as BlobPart], name, { type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet" });
  const last = startOfDay(end - 1);
  return { file, totals: totals(orders, expenses), label: start === last ? fmtDate(start) : `${fmtDate(start)} – ${fmtDate(last)}` };
}
