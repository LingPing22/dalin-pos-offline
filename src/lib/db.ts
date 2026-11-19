"use client";
import Dexie, { type Table } from "dexie";
import type { PaymentMethod, Role, Variant } from "./types";

/** Everything lives in the iPad's own database (IndexedDB). Money = integer kip, time = ms. */
export type Category = { id?: number; name: string; icon: string; sort: number };
export type Product = {
  id?: number;
  categoryId: number | null;
  name: string;
  sku: string | null;
  price: number;
  cost: number;
  emoji: string | null;
  color: string | null;
  image: string | null; // small JPEG data URL
  /** Hot / iced / blended prices. When set, price/cost hold the cheapest one (for lists). */
  variants?: Variant[] | null;
  active: boolean;
  sort: number;
  updatedAt: number;
};
export type User = { id?: number; name: string; role: Role; pinHash: string; active: boolean };
/** name already includes the variant, e.g. "ກາເຟລາວ (ເຢັນ)", so receipts need nothing special */
export type OrderItem = { productId: number | null; variant?: string | null; name: string; price: number; cost: number; qty: number; lineTotal: number };
export type Order = {
  id: string;
  billNo: string;
  createdAt: number;
  cashierId: number | null;
  cashierName: string | null;
  subtotal: number;
  discount: number;
  taxRate: number;
  taxInclusive: boolean;
  tax: number;
  total: number;
  paymentMethod: PaymentMethod;
  feeRate: number;
  fee: number;
  cost: number;
  received: number;
  change: number;
  paymentRef: string | null;
  note: string | null;
  status: "paid" | "void";
  voidedAt: number | null;
  voidReason: string | null;
  /** Manager who approved the void (missing on bills voided before this was recorded) */
  voidedById?: number | null;
  voidedByName?: string | null;
  /** Shift the bill was rung up in (missing on bills from before shifts existed) */
  shiftId?: string | null;
  items: OrderItem[];
};
export type ShiftSummary = {
  bills: number;
  total: number;
  byMethod: Record<PaymentMethod, number>;
  discount: number;
  discountBills: number;
  voids: number;
  voidTotal: number;
};
/** One person's turn at the (single) cash drawer. Only one shift is open at a time. */
export type Shift = {
  id: string;
  userId: number;
  userName: string;
  openedAt: number;
  openingCash: number;
  closedAt: number | null;
  closedById: number | null;
  closedByName: string | null;
  /** What the drawer should hold: opening cash + cash sales */
  expectedCash: number | null;
  /** What was really counted, entered without seeing expectedCash */
  countedCash: number | null;
  /** Frozen at closing so later voids don't rewrite a finished shift */
  summary: ShiftSummary | null;
};
export type Expense = { id?: number; date: number; category: string; note: string | null; amount: number; createdAt: number };
export type KV = { key: string; value: unknown };

export class DalinDB extends Dexie {
  categories!: Table<Category, number>;
  products!: Table<Product, number>;
  users!: Table<User, number>;
  orders!: Table<Order, string>;
  expenses!: Table<Expense, number>;
  kv!: Table<KV, string>;
  shifts!: Table<Shift, string>;

  constructor() {
    super("dalin-pos");
    this.version(1).stores({
      categories: "++id, sort",
      products: "++id, categoryId, sku, sort",
      users: "++id",
      orders: "id, &billNo, createdAt, status",
      expenses: "++id, date",
      kv: "key",
    });
    this.version(2).stores({ shifts: "id, openedAt" });
  }
}

let instance: DalinDB | null = null;
/** Created lazily so nothing touches IndexedDB during the static build */
export function getDb(): DalinDB {
  if (!instance) instance = new DalinDB();
  return instance;
}
