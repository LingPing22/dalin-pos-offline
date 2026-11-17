/**
 * Laos (Asia/Vientiane) is UTC+7 all year with no daylight saving,
 * so a fixed offset keeps period maths simple and identical on any server.
 */
export const TZ = "Asia/Vientiane";
export const TZ_OFFSET_MS = 7 * 60 * 60 * 1000;
export const HOUR = 60 * 60 * 1000;
export const DAY = 24 * HOUR;

export function startOfDay(t: number): number {
  return Math.floor((t + TZ_OFFSET_MS) / DAY) * DAY - TZ_OFFSET_MS;
}

/** Week starts on Monday */
export function startOfWeek(t: number): number {
  const dow = new Date(t + TZ_OFFSET_MS).getUTCDay(); // 0 = Sunday
  return startOfDay(t) - ((dow + 6) % 7) * DAY;
}

export function startOfMonth(t: number): number {
  const d = new Date(t + TZ_OFFSET_MS);
  return Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), 1) - TZ_OFFSET_MS;
}

export function addMonths(monthStart: number, n: number): number {
  const d = new Date(monthStart + TZ_OFFSET_MS);
  return Date.UTC(d.getUTCFullYear(), d.getUTCMonth() + n, 1) - TZ_OFFSET_MS;
}

/** "2026-11-17" in local time */
export function toDateKey(t: number): string {
  return new Date(t + TZ_OFFSET_MS).toISOString().slice(0, 10);
}

/** Parse "2026-11-17" as local midnight */
export function fromDateKey(key: string): number | null {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(key)) return null;
  const t = Date.parse(`${key}T00:00:00Z`);
  return Number.isNaN(t) ? null : t - TZ_OFFSET_MS;
}

// Own Lao names: identical output on the server (Node) and on the iPad (Safari)
export const LAO_MONTHS = ["ມັງກອນ", "ກຸມພາ", "ມີນາ", "ເມສາ", "ພຶດສະພາ", "ມິຖຸນາ", "ກໍລະກົດ", "ສິງຫາ", "ກັນຍາ", "ຕຸລາ", "ພະຈິກ", "ທັນວາ"];
export const LAO_DAYS = ["ວັນອາທິດ", "ວັນຈັນ", "ວັນອັງຄານ", "ວັນພຸດ", "ວັນພະຫັດ", "ວັນສຸກ", "ວັນເສົາ"];
const timeFmt = new Intl.DateTimeFormat("en-GB", { timeZone: TZ, hour: "2-digit", minute: "2-digit" });
const dmyFmt = new Intl.DateTimeFormat("en-GB", { timeZone: TZ, day: "2-digit", month: "2-digit", year: "numeric" });

/** 17 ພະຈິກ 2026 */
export const fmtDate = (t: number) => {
  const d = new Date(t + TZ_OFFSET_MS);
  return `${d.getUTCDate()} ${LAO_MONTHS[d.getUTCMonth()]} ${d.getUTCFullYear()}`;
};
/** ວັນອັງຄານ 17 ພະຈິກ */
export const fmtDayLong = (t: number) => {
  const d = new Date(t + TZ_OFFSET_MS);
  return `${LAO_DAYS[d.getUTCDay()]} ${d.getUTCDate()} ${LAO_MONTHS[d.getUTCMonth()]}`;
};
/** "2026-11" -> ພະຈິກ 2026 */
export const fmtMonthKey = (m: string) => {
  const [y, mo] = m.split("-").map(Number);
  return `${LAO_MONTHS[mo - 1]} ${y}`;
};
export const fmtTime = (t: number) => timeFmt.format(t);
/** 17/11/2026 14:05 — used on receipts (numeric, prints well on any printer) */
export const fmtDateTime = (t: number) => `${dmyFmt.format(t)} ${timeFmt.format(t)}`;
