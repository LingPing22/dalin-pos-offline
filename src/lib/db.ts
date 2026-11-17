"use client";
import Dexie, { type Table } from "dexie";
import type { PaymentMethod, Role } from "./types";

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
  active: boolean;
  sort: number;
  updatedAt: number;
};
export type User = { id?: number; name: string; role: Role; pinHash: string; active: boolean };
export type OrderItem = { productId: number | null; name: string; price: number; cost: number; qty: number; lineTotal: number };
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
  items: OrderItem[];
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
  }
}

let instance: DalinDB | null = null;
/** Created lazily so nothing touches IndexedDB during the static build */
export function getDb(): DalinDB {
  if (!instance) instance = new DalinDB();
  return instance;
}
