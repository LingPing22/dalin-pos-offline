/** Starter menu (edit it in ສິນຄ້າ) and an optional demo-sales generator for trying the dashboard. */
import { computeTotals, cashSuggestions } from "./pricing";
import { DAY, HOUR, startOfDay, toDateKey } from "./time";
import { DEFAULT_SETTINGS, type PaymentMethod } from "./types";
import type { Expense, Order, Product } from "./db";
import { DRINKS } from "./drink-menu";
import { lineName } from "./types";

export const STARTER_CATEGORIES = [
  { name: "ກາເຟ", icon: "☕" },
  { name: "ຊາ ແລະ ນົມ", icon: "🧋" },
  { name: "ນ້ຳປັ່ນ", icon: "🥤" },
  { name: "ເບເກີຣີ", icon: "🥐" },
  { name: "ອາຫານ", icon: "🍜" },
  { name: "ເຄື່ອງດື່ມຂວດ", icon: "🧃" },
];

// [category index, name, price, cost, emoji, tile colour, popularity]
export const STARTER_MENU: [number, string, number, number, string, string, number][] = [
  [0, "ກາເຟລາວ ຮ້ອນ", 20000, 6000, "☕", "#F3E6D8", 9],
  [0, "ກາເຟນົມເຢັນ", 25000, 8000, "☕", "#EADBC8", 12],
  [0, "ເອສເປຣສໂຊ", 25000, 7000, "☕", "#E4D3C3", 3],
  [0, "ອາເມຣິກາໂນ່ ເຢັນ", 30000, 8000, "🥃", "#E9DCCB", 8],
  [0, "ລາເຕ້ ເຢັນ", 35000, 11000, "🥛", "#F1E7DA", 9],
  [0, "ຄາປູຊີໂນ່", 35000, 11000, "☕", "#EFE2D2", 5],
  [0, "ມອກຄ່າ ເຢັນ", 40000, 13000, "🍫", "#E6D2C4", 4],
  [1, "ຊາໄທ ເຢັນ", 25000, 7000, "🧋", "#FBE1C8", 9],
  [1, "ຊາຂຽວນົມ", 35000, 11000, "🍵", "#DDEBD3", 6],
  [1, "ຊາມະນາວ", 20000, 5000, "🍋", "#F8F0C6", 5],
  [1, "ໂກໂກ້ ເຢັນ", 30000, 9000, "🍫", "#E8D6CF", 5],
  [1, "ນົມສົດ ເຢັນ", 25000, 8000, "🥛", "#EEF1F6", 3],
  [2, "ໝາກມ່ວງປັ່ນ", 30000, 10000, "🥭", "#FCE6B8", 6],
  [2, "ໝາກໂມປັ່ນ", 25000, 7000, "🍉", "#FADADD", 5],
  [2, "ສະຕໍເບີຣີປັ່ນ", 35000, 12000, "🍓", "#F9D7DC", 3],
  [2, "ນ້ຳໝາກພ້າວ", 25000, 9000, "🥥", "#EEF0E4", 4],
  [2, "ນ້ຳໝາກກ້ຽງ", 25000, 9000, "🍊", "#FDE2C4", 4],
  [3, "ຄົວຊອງ ເນີຍ", 25000, 9000, "🥐", "#F6E7CF", 5],
  [3, "ເຂົ້າຈີ່ປາເຕ້", 30000, 12000, "🥖", "#F2E2C9", 6],
  [3, "ເຄັກຊັອກໂກແລັດ", 35000, 13000, "🍰", "#EBD9D2", 3],
  [3, "ບຣາວນີ້", 20000, 7000, "🟫", "#E7D8CE", 3],
  [3, "ຄຸກກີ້", 10000, 3000, "🍪", "#F3E5D3", 4],
  [4, "ເຝີ ຊີ້ນງົວ", 35000, 15000, "🍜", "#F7E3D4", 6],
  [4, "ເຂົ້າປຽກເສັ້ນ", 30000, 12000, "🍲", "#F4E8DA", 4],
  [4, "ເຂົ້າຜັດ ໄກ່", 35000, 14000, "🍛", "#F8E9CF", 5],
  [4, "ລາບໄກ່", 40000, 16000, "🥗", "#E3EDD8", 3],
  [4, "ເຂົ້າໜຽວ", 5000, 1500, "🍚", "#F2F2EC", 5],
  [5, "ນ້ຳດື່ມ", 5000, 2500, "💧", "#E1EEF8", 7],
  [5, "ນ້ຳອັດລົມ", 12000, 7000, "🥤", "#F8DCDC", 4],
  [5, "ນ້ຳແຮ່", 8000, 4000, "🫗", "#E3F1F1", 2],
  [5, "ນົມກ່ອງ", 10000, 6000, "🧃", "#EDE7F6", 2],
];

/** 30 days of believable sales + running costs, for showing the dashboard. */
export function generateDemo(products: Product[], cashier: { id: number; name: string }, now = Date.now()) {
  let seed = 20261118;
  const rand = () => {
    seed = (seed + 0x6d2b79f5) | 0;
    let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
  const pick = <T,>(items: T[], w: number[]) => {
    let r = rand() * w.reduce((a, b) => a + b, 0);
    for (let i = 0; i < items.length; i++) if ((r -= w[i]) <= 0) return items[i];
    return items[items.length - 1];
  };
  const active = products.filter((p) => p.active && p.id);
  const popularity = active.map((p) => STARTER_MENU.find((m) => m[1] === p.name || DRINKS[m[1]]?.name === p.name)?.[6] ?? 3);
  const hours = [7, 8, 9, 10, 11, 12, 13, 14, 15, 16, 17, 18, 19, 20];
  const hourW = [4, 9, 7, 5, 7, 10, 6, 4, 5, 6, 7, 6, 4, 2];
  const methods: PaymentMethod[] = ["cash", "qr", "card"];
  const s = DEFAULT_SETTINGS;
  const orders: Order[] = [];
  const expenses: Expense[] = [];
  const today = startOfDay(now);

  for (let d = 30; d >= 0; d--) {
    const day = today - d * DAY;
    const dow = new Date(day + 7 * HOUR).getUTCDay();
    const bills = Math.round((38 + rand() * 18) * (dow === 0 || dow === 6 ? 1.25 : 1));
    const ymd = toDateKey(day).slice(2).replace(/-/g, "");
    const times = Array.from({ length: bills }, () => day + pick(hours, hourW) * HOUR + Math.floor(rand() * HOUR)).sort((a, b) => a - b);
    let seq = 0;
    for (const createdAt of times) {
      if (createdAt > now) break;
      seq++;
      const chosen = new Map<string, { p: Product; variant: string | null; price: number; cost: number; qty: number }>();
      const n = pick([1, 2, 3, 4], [45, 35, 15, 5]);
      for (let k = 0; k < n; k++) {
        const p = pick(active, popularity);
        // Iced sells most in Vientiane
        const v = p.variants?.length ? pick(p.variants, p.variants.map((x) => (x.name === "ເຢັນ" ? 5 : x.name === "ຮ້ອນ" ? 3 : 2))) : null;
        const key = `${p.id}:${v?.name ?? ""}`;
        const row = chosen.get(key) ?? { p, variant: v?.name ?? null, price: v?.price ?? p.price, cost: v?.cost ?? p.cost, qty: 0 };
        row.qty += rand() < 0.15 ? 2 : 1;
        chosen.set(key, row);
      }
      const lines = [...chosen.values()];
      const method = pick(methods, [48, 44, 8]);
      const discount = rand() < 0.05 && lines.length > 1 ? 5000 : 0;
      const feeRate = s.fees[method];
      const t = computeTotals({ lines, discount, tax: s.tax, feeRate });
      const received = method === "cash" ? pick(cashSuggestions(t.total).slice(0, 3), [3, 2, 1]) : t.total;
      orders.push({
        id: `demo-${ymd}-${seq}`,
        billNo: `${s.billPrefix}-${ymd}-${String(seq).padStart(4, "0")}`,
        createdAt,
        cashierId: cashier.id,
        cashierName: cashier.name,
        subtotal: t.subtotal,
        discount: t.discount,
        taxRate: s.tax.rate,
        taxInclusive: s.tax.inclusive,
        tax: t.tax,
        total: t.total,
        paymentMethod: method,
        feeRate,
        fee: t.fee,
        cost: t.cost,
        received,
        change: received - t.total,
        paymentRef: null,
        note: null,
        status: "paid",
        voidedAt: null,
        voidReason: null,
        items: lines.map((l) => ({ productId: l.p.id!, variant: l.variant, name: lineName(l.p.name, l.variant), price: l.price, cost: l.cost, qty: l.qty, lineTotal: l.price * l.qty })),
      });
    }
    const at = day + 9 * HOUR;
    if (at > now) continue;
    const add = (category: string, note: string, amount: number) => expenses.push({ date: at, category, note, amount, createdAt: at });
    add("ນ້ຳກ້ອນ", "ນ້ຳກ້ອນປະຈຳວັນ", 30000 + Math.round(rand() * 3) * 5000);
    if (d % 4 === 0) add("ແກັສ", "ແກັສຫຸງຕົ້ມ 1 ຖັງ", 185000);
    if (dow === 1) add("ບັນຈຸພັນ", "ຈອກ, ຝາ, ຫຼອດ, ຖົງ", 260000);
    const dom = new Date(day + 7 * HOUR).getUTCDate();
    if (dom === 1) add("ຄ່າເຊົ່າ", "ຄ່າເຊົ່າຮ້ານ", 4500000);
    if (dom === 5) add("ໄຟຟ້າ-ນ້ຳປະປາ", "ບິນເດືອນກ່ອນ", 1300000);
  }
  return { orders, expenses };
}
