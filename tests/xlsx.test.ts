import { test } from "node:test";
import assert from "node:assert/strict";
import { buildXlsx, crc32, excelDate } from "../src/lib/xlsx";
import { salesSheets, totals } from "../src/lib/sales-sheets";
import type { Order } from "../src/lib/db";

const bill = (over: Partial<Order>): Order => ({
  id: "x", billNo: "DL-1", createdAt: Date.UTC(2026, 10, 20, 3), cashierId: 2, cashierName: "ພະນັກງານ",
  subtotal: 0, discount: 0, taxRate: 0, taxInclusive: true, tax: 0, total: 0, paymentMethod: "cash", feeRate: 0, fee: 0, cost: 0,
  received: 0, change: 0, paymentRef: null, note: null, status: "paid", voidedAt: null, voidReason: null, items: [], ...over,
});

test("crc32 matches the standard check value", () => {
  assert.equal(crc32(new TextEncoder().encode("123456789")), 0xcbf43926);
});

test("dates land on the right day in Laos time", () => {
  // 2026-11-20 00:30 in Vientiane is still the 19th in UTC
  const t = Date.UTC(2026, 10, 19, 17, 30);
  assert.equal(Math.floor(excelDate(t)), 46346); // 20/11/2026
});

test("workbook is a zip with every sheet and Lao text intact", () => {
  const bytes = buildXlsx([{ name: "ສະຫຼຸບ", columns: [{ header: "ກາເຟ & ຊາ" }, { header: "ຍອດ", type: "money" }], rows: [["ກາເຟລາວ (ເຢັນ)", 25000]], totals: ["ລວມ", 25000] }]);
  assert.equal(String.fromCharCode(bytes[0], bytes[1]), "PK");
  const text = new TextDecoder().decode(bytes);
  for (const part of ["[Content_Types].xml", "xl/workbook.xml", "xl/worksheets/sheet1.xml", "xl/sharedStrings.xml", "ກາເຟລາວ (ເຢັນ)", "ກາເຟ &amp; ຊາ"]) assert.ok(text.includes(part), part);
});

test("void bills are counted apart, not in the takings", () => {
  const orders = [
    bill({ id: "a", total: 20000, cost: 6000, paymentMethod: "cash" }),
    bill({ id: "b", total: 25000, cost: 8000, paymentMethod: "qr", fee: 0 }),
    bill({ id: "c", total: 30000, status: "void" }),
  ];
  const t = totals(orders, [{ date: orders[0].createdAt, category: "ວັດຖຸດິບ", note: null, amount: 5000, createdAt: 0 }]);
  assert.equal(t.total, 45000);
  assert.equal(t.byMethod.cash, 20000);
  assert.equal(t.byMethod.qr, 25000);
  assert.equal(t.voids, 1);
  assert.equal(t.netProfit, 45000 - 14000 - 5000);

  const day = Date.UTC(2026, 10, 19, 17); // 20/11/2026 00:00 Vientiane
  const sheets = salesSheets({ orders, expenses: [], start: day, end: day + 86_400_000, shopName: "Dalin", title: "t" });
  assert.deepEqual(sheets.map((s) => s.name), ["ສະຫຼຸບ", "ລາຍວັນ", "ບິນ", "ສິນຄ້າທີ່ຂາຍ", "ຄ່າໃຊ້ຈ່າຍ"]);
  assert.equal(sheets[1].rows.length, 1, "one row per day");
  assert.equal(sheets[2].rows.length, 3, "every bill, voids included");
});
