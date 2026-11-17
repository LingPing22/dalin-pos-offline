const grouping = new Intl.NumberFormat("en-US", { maximumFractionDigits: 0 });

/** 25000 -> "25,000" */
export function fmt(n: number): string {
  return grouping.format(Math.round(n || 0));
}

/** 25000 -> "25,000 ₭" */
export function kip(n: number): string {
  return `${fmt(n)} ₭`;
}

/** Short form for chart axes: 1,250,000 -> "1.25M" */
export function kipShort(n: number): string {
  const a = Math.abs(n);
  if (a >= 1_000_000_000) return `${+(n / 1_000_000_000).toFixed(2)}B`;
  if (a >= 1_000_000) return `${+(n / 1_000_000).toFixed(2)}M`;
  if (a >= 1_000) return `${+(n / 1_000).toFixed(0)}K`;
  return String(n);
}
