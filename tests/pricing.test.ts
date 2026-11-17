import { test } from "node:test";
import assert from "node:assert/strict";
import { computeTotals, cashSuggestions } from "../src/lib/pricing";
import { startOfDay, startOfWeek, startOfMonth, toDateKey } from "../src/lib/time";

const vat = (inclusive: boolean) => ({ enabled: true, rate: 10, inclusive });

test("VAT included in price: total unchanged, VAT portion extracted", () => {
  const t = computeTotals({ lines: [{ price: 25000, qty: 2, cost: 8000 }, { price: 5000, qty: 1 }], discount: 5000, tax: vat(true), feeRate: 0 });
  assert.equal(t.subtotal, 55000);
  assert.equal(t.total, 50000);
  assert.equal(t.tax, 4545); // 50,000 × 10/110
  assert.equal(t.cost, 16000);
});

test("VAT added on top", () => {
  const t = computeTotals({ lines: [{ price: 100000, qty: 1 }], discount: 0, tax: vat(false), feeRate: 2.5 });
  assert.equal(t.tax, 10000);
  assert.equal(t.total, 110000);
  assert.equal(t.fee, 2750);
});

test("discount can never exceed the bill", () => {
  const t = computeTotals({ lines: [{ price: 5000, qty: 1 }], discount: 99999, tax: vat(true), feeRate: 0 });
  assert.equal(t.discount, 5000);
  assert.equal(t.total, 0);
  assert.deepEqual(cashSuggestions(0), [0]);
});

test("cash suggestions start with the exact amount", () => {
  assert.deepEqual(cashSuggestions(90000), [90000, 100000]);
  assert.equal(cashSuggestions(42000)[0], 42000);
});

test("periods follow Vientiane time (UTC+7)", () => {
  const t = Date.parse("2026-11-17T18:30:00Z"); // 18 Nov 01:30 in Vientiane
  assert.equal(toDateKey(t), "2026-11-18");
  assert.equal(new Date(startOfDay(t)).toISOString(), "2026-11-17T17:00:00.000Z");
  assert.equal(toDateKey(startOfWeek(t)), "2026-11-16"); // Monday
  assert.equal(toDateKey(startOfMonth(t)), "2026-11-01");
});
