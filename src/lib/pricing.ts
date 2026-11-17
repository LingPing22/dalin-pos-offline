/**
 * One pricing function used by both the iPad (to show totals instantly)
 * and the server (to recompute from database prices — the client is never trusted).
 */
export type PricingInput = {
  lines: { price: number; qty: number; cost?: number }[];
  discount: number;
  tax: { enabled: boolean; rate: number; inclusive: boolean };
  feeRate: number; // percent
};

export type PricingResult = {
  subtotal: number;
  discount: number;
  tax: number;
  total: number;
  fee: number;
  cost: number;
};

export function computeTotals({ lines, discount, tax, feeRate }: PricingInput): PricingResult {
  const subtotal = lines.reduce((s, l) => s + Math.round(l.price) * Math.max(0, Math.floor(l.qty)), 0);
  const cost = lines.reduce((s, l) => s + Math.round(l.cost ?? 0) * Math.max(0, Math.floor(l.qty)), 0);
  const d = Math.min(Math.max(0, Math.round(discount || 0)), subtotal);
  const base = subtotal - d;

  let taxAmount = 0;
  let total = base;
  if (tax.enabled && tax.rate > 0) {
    if (tax.inclusive) {
      taxAmount = Math.round((base * tax.rate) / (100 + tax.rate));
    } else {
      taxAmount = Math.round((base * tax.rate) / 100);
      total = base + taxAmount;
    }
  }
  const fee = Math.round((total * Math.max(0, feeRate)) / 100);
  return { subtotal, discount: d, tax: taxAmount, total, fee, cost };
}

/** Banknote-aware quick amounts for the cash screen */
export function cashSuggestions(total: number): number[] {
  if (total <= 0) return [0];
  const notes = [1_000, 2_000, 5_000, 10_000, 20_000, 50_000, 100_000];
  const out = new Set<number>([total]);
  for (const step of [5_000, 10_000, 50_000, 100_000]) {
    const v = Math.ceil(total / step) * step;
    if (v > total) out.add(v);
  }
  for (const n of notes) if (n > total) out.add(n);
  return [...out].sort((a, b) => a - b).slice(0, 5);
}
