"use client";
/**
 * The whole "backend" of Dalin POS Offline. Same jobs the server API did in the
 * online version, but everything is stored in this device's IndexedDB.
 */
import { getDb, type Category, type Expense, type Order, type Product, type Shift, type ShiftSummary, type User } from "./db";
import { computeTotals } from "./pricing";
import { DAY, HOUR, addMonths, fromDateKey, startOfDay, startOfMonth, toDateKey } from "./time";
import { DEFAULT_SETTINGS, LOCK_MINUTES, VARIANT_NAMES, type Variant, type PaymentMethod, type PosCategory, type PosProduct, type ReceiptData, type Role, type ShopSettings } from "./types";
import { STARTER_CATEGORIES, STARTER_MENU, generateDemo } from "./demo";
import { DEFAULT_PINS, isWeakPin } from "./pin";
import type { Session } from "./session";

export class StoreError extends Error {}
const fail = (msg: string): never => {
  throw new StoreError(msg);
};

// ---------------------------------------------------------------- PIN hashing
const hex = (buf: ArrayBuffer) => [...new Uint8Array(buf)].map((b) => b.toString(16).padStart(2, "0")).join("");

async function digest(salt: string, pin: string) {
  return hex(await crypto.subtle.digest("SHA-256", new TextEncoder().encode(`${salt}:${pin}:dalin`)));
}
export async function hashPin(pin: string) {
  const salt = hex(crypto.getRandomValues(new Uint8Array(16)).buffer);
  return `${salt}:${await digest(salt, pin)}`;
}
async function verifyPin(pin: string, stored: string) {
  const [salt, h] = stored.split(":");
  return !!salt && (await digest(salt, pin)) === h;
}

export function newId(): string {
  if (typeof crypto !== "undefined" && "randomUUID" in crypto) return crypto.randomUUID();
  return `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 12)}`;
}

// ---------------------------------------------------------------- first run
let ready: Promise<void> | null = null;

/** Creates the two starter users, starter menu and settings the very first time. */
export function ensureReady(): Promise<void> {
  if (!ready) {
    ready = (async () => {
      const db = getDb();
      if ((await db.users.count()) === 0) {
        // Hash PINs BEFORE the transaction: Safari closes an IndexedDB transaction
        // as soon as it waits on anything that is not the database itself.
        const ownerPin = await hashPin(DEFAULT_PINS.owner);
        const cashierPin = await hashPin(DEFAULT_PINS.cashier);
        await db.transaction("rw", [db.users, db.categories, db.products, db.kv], async () => {
          await db.users.bulkAdd([
            { name: "ເຈົ້າຂອງຮ້ານ", role: "owner", pinHash: ownerPin, active: true },
            { name: "ພະນັກງານ", role: "cashier", pinHash: cashierPin, active: true },
          ]);
          await seedMenu();
          await db.kv.put({ key: "settings", value: DEFAULT_SETTINGS });
        });
      }
      // Ask the browser not to clear our data when storage runs low
      navigator.storage?.persist?.().catch(() => {});
    })().catch((e) => {
      ready = null; // allow a retry
      throw e;
    });
  }
  return ready;
}

async function seedMenu() {
  const db = getDb();
  const catIds = (await db.categories.bulkAdd(
    STARTER_CATEGORIES.map((c, i) => ({ ...c, sort: i })),
    { allKeys: true },
  )) as number[];
  const now = Date.now();
  await db.products.bulkAdd(
    STARTER_MENU.map(([ci, name, price, cost, emoji, color], i) => ({
      categoryId: catIds[ci],
      name,
      sku: `P${String(i + 1).padStart(3, "0")}`,
      price,
      cost,
      emoji,
      color,
      image: null,
      active: true,
      sort: i,
      updatedAt: now,
    })),
  );
}

// ---------------------------------------------------------------- settings
export async function getSettings(): Promise<ShopSettings> {
  await ensureReady();
  const row = await getDb().kv.get("settings");
  const v = (row?.value ?? {}) as Partial<ShopSettings>;
  const d = structuredClone(DEFAULT_SETTINGS);
  return {
    shop: { ...d.shop, ...v.shop },
    tax: { ...d.tax, ...v.tax },
    fees: { ...d.fees, ...v.fees },
    receipt: { ...d.receipt, ...v.receipt },
    billPrefix: v.billPrefix || d.billPrefix,
    qrImage: v.qrImage ?? null,
    security: { ...d.security, ...v.security },
  };
}

export async function saveSettings(s: ShopSettings): Promise<ShopSettings> {
  const rate = Number(s.tax.rate);
  if (!(rate >= 0 && rate <= 30)) fail("ອັດຕາພາສີບໍ່ຖືກຕ້ອງ");
  const f = (v: unknown) => Math.min(10, Math.max(0, Number(v) || 0));
  const clean: ShopSettings = {
    shop: s.shop,
    tax: { enabled: !!s.tax.enabled, rate, inclusive: !!s.tax.inclusive },
    fees: { cash: f(s.fees.cash), qr: f(s.fees.qr), card: f(s.fees.card) },
    receipt: { width: s.receipt.width === 58 ? 58 : 80 },
    billPrefix: (s.billPrefix || "DL").replace(/[^A-Za-z0-9]/g, "").slice(0, 6) || "DL",
    qrImage: s.qrImage,
    security: { lockMinutes: (LOCK_MINUTES as readonly number[]).includes(s.security.lockMinutes) ? s.security.lockMinutes : DEFAULT_SETTINGS.security.lockMinutes },
  };
  await getDb().kv.put({ key: "settings", value: clean });
  return clean;
}

export async function getMeta<T>(key: string): Promise<T | undefined> {
  return (await getDb().kv.get(`meta:${key}`))?.value as T | undefined;
}
export async function setMeta(key: string, value: unknown) {
  await getDb().kv.put({ key: `meta:${key}`, value });
}

// ---------------------------------------------------------------- users & login
export type UserRow = { id: number; name: string; role: Role; active: boolean };

export async function listUsers(activeOnly = false): Promise<UserRow[]> {
  await ensureReady();
  const all = await getDb().users.toArray();
  return all.filter((u) => !activeOnly || u.active).map(({ id, name, role, active }) => ({ id: id!, name, role, active }));
}

/** 5 wrong PINs in a row locks that key (a user, or manager approval) for 1 minute */
const attempts = new Map<string, { n: number; until: number }>();
function checkAttempts(key: string) {
  const a = attempts.get(key);
  if (a && a.until > Date.now()) fail("ລອງຜິດຫຼາຍເທື່ອ, ລໍຖ້າ 1 ນາທີ");
}
function wrongPin(key: string, msg = "PIN ບໍ່ຖືກຕ້ອງ"): never {
  const n = (attempts.get(key)?.n ?? 0) + 1;
  attempts.set(key, { n: n >= 5 ? 0 : n, until: n >= 5 ? Date.now() + 60_000 : 0 });
  return fail(msg);
}

/** Format + strength rules for any new PIN */
function checkNewPin(pin: string) {
  if (!/^\d{4,6}$/.test(pin)) fail("PIN ຕ້ອງເປັນຕົວເລກ 4-6 ໂຕ");
  if (isWeakPin(pin)) fail("PIN ນີ້ເດົາງ່າຍເກີນໄປ (ເຊັ່ນ 1234, 0000) — ກະລຸນາເລືອກ PIN ອື່ນ");
}

async function checkPin(userId: number, pin: string): Promise<User> {
  const key = `user:${userId}`;
  checkAttempts(key);
  const u = await getDb().users.get(userId);
  if (!u || !u.active || !(await verifyPin(pin, u.pinHash))) wrongPin(key);
  attempts.delete(key);
  return u!;
}

/** mustChangePin: the PIN is a factory default or too easy to guess — no session until it is changed. */
export async function login(userId: number, pin: string): Promise<{ session: Session; mustChangePin: boolean }> {
  const u = await checkPin(userId, pin);
  return { session: { uid: u.id!, name: u.name, role: u.role }, mustChangePin: isWeakPin(pin) };
}

export async function changeOwnPin(userId: number, oldPin: string, newPin: string): Promise<Session> {
  const u = await checkPin(userId, oldPin);
  checkNewPin(newPin);
  if (newPin === oldPin) fail("PIN ໃໝ່ຕ້ອງບໍ່ຊ້ຳກັບ PIN ເກົ່າ");
  await getDb().users.update(u.id!, { pinHash: await hashPin(newPin) });
  return { uid: u.id!, name: u.name, role: u.role };
}

export async function addUser(name: string, role: Role, pin: string) {
  if (!name.trim()) fail("ກະລຸນາໃສ່ຊື່");
  checkNewPin(pin);
  await getDb().users.add({ name: name.trim().slice(0, 40), role, pinHash: await hashPin(pin), active: true });
}

export async function updateUser(id: number, me: Session, patch: { name?: string; pin?: string; active?: boolean }) {
  const db = getDb();
  const set: Partial<User> = {};
  if (patch.name?.trim()) set.name = patch.name.trim().slice(0, 40);
  if (patch.pin !== undefined) {
    checkNewPin(patch.pin);
    set.pinHash = await hashPin(patch.pin);
  }
  if (patch.active !== undefined) {
    if (id === me.uid && !patch.active) fail("ປິດບັນຊີຂອງຕົນເອງບໍ່ໄດ້");
    if (!patch.active) {
      const owners = (await db.users.toArray()).filter((u) => u.role === "owner" && u.active && u.id !== id);
      const target = await db.users.get(id);
      if (target?.role === "owner" && owners.length === 0) fail("ຕ້ອງມີຜູ້ຈັດການຢ່າງໜ້ອຍ 1 ຄົນ");
    }
    set.active = patch.active;
  }
  await db.users.update(id, set);
}

// ---------------------------------------------------------------- catalog
const bySort = <T extends { sort: number; id?: number }>(a: T, b: T) => a.sort - b.sort || (a.id ?? 0) - (b.id ?? 0);

export async function getCategories(): Promise<PosCategory[]> {
  await ensureReady();
  return (await getDb().categories.toArray()).sort(bySort).map((c) => ({ id: c.id!, name: c.name, icon: c.icon }));
}

export async function getCatalog(): Promise<{ categories: PosCategory[]; products: PosProduct[] }> {
  const [categories, rows] = await Promise.all([getCategories(), getDb().products.toArray()]);
  return {
    categories,
    products: rows
      .filter((p) => p.active)
      .sort(bySort)
      .map((p) => ({
        id: p.id!,
        categoryId: p.categoryId,
        name: p.name,
        sku: p.sku,
        price: p.price,
        emoji: p.emoji,
        color: p.color,
        imageUrl: p.image,
        variants: p.variants?.length ? p.variants : null,
      })),
  };
}

export type AdminProduct = Omit<Product, "image"> & { id: number; imageUrl: string | null };

export async function listProducts(): Promise<AdminProduct[]> {
  await ensureReady();
  return (await getDb().products.toArray()).sort(bySort).map(({ image, ...p }) => ({ ...p, id: p.id!, imageUrl: image }));
}

export type ProductInput = {
  id?: number;
  name: string;
  categoryId: number | null;
  price: number | string;
  cost: number | string;
  sku: string;
  emoji: string;
  color: string;
  active: boolean;
  image?: string | null; // undefined = unchanged
  /** Empty / null = single price */
  variants?: { name: string; price: number | string; cost: number | string }[] | null;
};

export async function saveProduct(d: ProductInput) {
  const db = getDb();
  const name = d.name.trim().slice(0, 80);
  if (!name) fail("ກະລຸນາໃສ່ຊື່ສິນຄ້າ");
  const variants: Variant[] = VARIANT_NAMES.flatMap((n) => {
    const v = d.variants?.find((x) => x.name === n);
    return v ? [{ name: n, price: Math.round(Number(v.price)), cost: Math.max(0, Math.round(Number(v.cost) || 0)) }] : [];
  });
  if (variants.some((v) => !(v.price > 0))) fail("ກະລຸນາໃສ່ລາຄາໃຫ້ທຸກແບບ");
  // Lists and margins use the cheapest version
  const cheapest = variants.reduce<Variant | null>((m, v) => (!m || v.price < m.price ? v : m), null);
  const price = cheapest ? cheapest.price : Math.round(Number(d.price));
  if (!(price >= 0)) fail("ລາຄາບໍ່ຖືກຕ້ອງ");
  const data: Partial<Product> = {
    name,
    price,
    cost: cheapest ? cheapest.cost : Math.max(0, Math.round(Number(d.cost) || 0)),
    variants: variants.length ? variants : null,
    categoryId: d.categoryId,
    sku: d.sku.trim().slice(0, 40) || null,
    emoji: d.emoji.trim().slice(0, 8) || null,
    color: /^#[0-9a-fA-F]{6}$/.test(d.color) ? d.color : null,
    active: d.active,
    updatedAt: Date.now(),
  };
  if (d.image !== undefined) data.image = d.image;
  if (d.id) await db.products.update(d.id, data);
  else {
    const max = (await db.products.toArray()).reduce((m, p) => Math.max(m, p.sort), 0);
    await db.products.add({ image: null, ...data, sort: max + 1 } as Product);
  }
}

/** Products already on bills are hidden instead of deleted, so history stays intact. */
export async function deleteProduct(id: number): Promise<"deleted" | "hidden"> {
  const db = getDb();
  const used = await db.orders.filter((o) => o.items.some((i) => i.productId === id)).count();
  if (used) {
    await db.products.update(id, { active: false, updatedAt: Date.now() });
    return "hidden";
  }
  await db.products.delete(id);
  return "deleted";
}

export async function addCategory(name: string, icon: string) {
  if (!name.trim()) fail("ກະລຸນາໃສ່ຊື່ໝວດ");
  const db = getDb();
  const max = (await db.categories.toArray()).reduce((m, c) => Math.max(m, c.sort), 0);
  await db.categories.add({ name: name.trim().slice(0, 40), icon: icon.trim().slice(0, 8) || "🛍️", sort: max + 1 });
}
export async function updateCategory(id: number, patch: Partial<Category>) {
  const set: Partial<Category> = {};
  if (patch.name?.trim()) set.name = patch.name.trim().slice(0, 40);
  if (patch.icon?.trim()) set.icon = patch.icon.trim().slice(0, 8);
  await getDb().categories.update(id, set);
}
export async function deleteCategory(id: number) {
  const db = getDb();
  await db.transaction("rw", db.products, db.categories, async () => {
    await db.products.where("categoryId").equals(id).modify({ categoryId: null });
    await db.categories.delete(id);
  });
}

// ---------------------------------------------------------------- orders
export type OrderInput = {
  items: { productId: number; variant?: string | null; qty: number }[];
  discount: number;
  paymentMethod: PaymentMethod;
  received: number;
  paymentRef?: string;
};

export function toReceipt(o: Order): ReceiptData {
  return {
    id: o.id,
    billNo: o.billNo,
    createdAt: o.createdAt,
    cashierName: o.cashierName,
    items: o.items.map(({ name, price, qty, lineTotal }) => ({ name, price, qty, lineTotal })),
    subtotal: o.subtotal,
    discount: o.discount,
    tax: o.tax,
    taxRate: o.taxRate,
    taxInclusive: o.taxInclusive,
    total: o.total,
    paymentMethod: o.paymentMethod,
    received: o.received,
    change: o.change,
    paymentRef: o.paymentRef,
    status: o.status,
  };
}

export async function createOrder(input: OrderInput, session: Session): Promise<ReceiptData> {
  const db = getDb();
  // One line per product + variant (hot and iced coffee are separate lines)
  const wanted = new Map<string, { productId: number; variant: string | null; qty: number }>();
  for (const it of input.items) {
    const q = Math.floor(it.qty);
    if (!it.productId || q <= 0) continue;
    const variant = it.variant || null;
    const key = `${it.productId}:${variant ?? ""}`;
    const row = wanted.get(key) ?? { productId: it.productId, variant, qty: 0 };
    row.qty = Math.min(9999, row.qty + q);
    wanted.set(key, row);
  }
  if (!wanted.size) fail("ບໍ່ມີສິນຄ້າໃນບິນ");
  const shift = await getOpenShift();
  if (!shift) fail("ກະລຸນາເປີດກະກ່ອນຂາຍ");
  const rows = [...wanted.values()];
  const products = await db.products.bulkGet(rows.map((r) => r.productId));
  if (products.some((p) => !p)) fail("ບາງສິນຄ້າບໍ່ມີໃນລະບົບແລ້ວ");

  const s = await getSettings();
  const lines = rows.map((r, i) => {
    const p = products[i]!;
    // Prices always come from the database, never from the cart
    const v = p.variants?.length ? p.variants.find((x) => x.name === r.variant) : undefined;
    if (p.variants?.length && !v) fail(`ກະລຸນາເລືອກແບບຂອງ ${p.name} (ຮ້ອນ / ເຢັນ / ປັ່ນ)`);
    return { p, variant: v?.name ?? null, qty: r.qty, price: v ? v.price : p.price, cost: v ? v.cost : p.cost };
  });
  const feeRate = s.fees[input.paymentMethod] ?? 0;
  const t = computeTotals({ lines, discount: input.discount, tax: s.tax, feeRate });

  let received = t.total;
  let change = 0;
  if (input.paymentMethod === "cash") {
    received = Math.round(input.received);
    if (received < t.total) fail("ເງິນທີ່ຮັບມາບໍ່ພໍ");
    change = received - t.total;
  }

  const createdAt = Date.now();
  const day = startOfDay(createdAt);
  const stem = `${s.billPrefix}-${toDateKey(createdAt).slice(2).replace(/-/g, "")}-`;
  const order: Order = await db.transaction("rw", db.orders, async () => {
    const todays = await db.orders.where("createdAt").between(day, day + DAY, true, false).toArray();
    const last = todays.reduce((m, o) => (o.billNo.startsWith(stem) ? Math.max(m, parseInt(o.billNo.slice(stem.length), 10) || 0) : m), 0);
    const o: Order = {
      id: newId(),
      billNo: `${stem}${String(last + 1).padStart(4, "0")}`,
      createdAt,
      cashierId: session.uid,
      cashierName: session.name,
      subtotal: t.subtotal,
      discount: t.discount,
      taxRate: s.tax.enabled ? s.tax.rate : 0,
      taxInclusive: s.tax.inclusive,
      tax: t.tax,
      total: t.total,
      paymentMethod: input.paymentMethod,
      feeRate,
      fee: t.fee,
      cost: t.cost,
      received,
      change,
      paymentRef: input.paymentRef?.slice(0, 60) || null,
      note: null,
      status: "paid",
      voidedAt: null,
      voidReason: null,
      shiftId: shift!.id,
      items: lines.map((l) => ({
        productId: l.p.id!,
        variant: l.variant,
        name: l.variant ? `${l.p.name} (${l.variant})` : l.p.name,
        price: l.price,
        cost: l.cost,
        qty: l.qty,
        lineTotal: l.price * l.qty,
      })),
    };
    await db.orders.add(o);
    return o;
  });
  return toReceipt(order);
}

export async function getReceipt(id: string) {
  const o = await getDb().orders.get(id);
  return o ? toReceipt(o) : null;
}

/** Voiding needs a manager's PIN, and the bill keeps who approved it and why. */
export async function voidOrder(id: string, reason: string, managerPin: string): Promise<string> {
  const db = getDb();
  const why = reason.trim().slice(0, 200);
  if (!why) fail("ກະລຸນາໃສ່ເຫດຜົນ");
  checkAttempts("void");
  const owners = (await db.users.toArray()).filter((u) => u.role === "owner" && u.active);
  let approver: User | undefined;
  for (const u of owners) if (await verifyPin(managerPin, u.pinHash)) approver = u;
  if (!approver) wrongPin("void", "PIN ຜູ້ຈັດການບໍ່ຖືກຕ້ອງ");
  attempts.delete("void");
  const o = await db.orders.get(id);
  if (!o || o.status !== "paid") fail("ບໍ່ພົບບິນ ຫຼື ຖືກຍົກເລີກແລ້ວ");
  await db.orders.update(id, {
    status: "void",
    voidedAt: Date.now(),
    voidReason: why,
    voidedById: approver!.id!,
    voidedByName: approver!.name,
  });
  return approver!.name;
}

export async function listOrdersForDay(dateKey: string): Promise<Order[]> {
  const from = fromDateKey(dateKey) ?? startOfDay(Date.now());
  const rows = await getDb().orders.where("createdAt").between(from, from + DAY, true, false).toArray();
  return rows.sort((a, b) => b.createdAt - a.createdAt);
}

export async function ordersBetween(from: number, to: number) {
  return getDb().orders.where("createdAt").between(from, to, true, false).toArray();
}

// ---------------------------------------------------------------- shifts
/** The drawer's current shift, whoever opened it (one drawer, one iPad: at most one is open). */
export async function getOpenShift(): Promise<Shift | null> {
  const last = await getDb().shifts.orderBy("openedAt").last();
  return last && last.closedAt === null ? last : null;
}

export async function lastClosedShift(): Promise<Shift | null> {
  const rows = await getDb().shifts.orderBy("openedAt").reverse().limit(5).toArray();
  return rows.find((s) => s.closedAt !== null) ?? null;
}

export async function openShift(session: Session, openingCash: number): Promise<Shift> {
  const cash = Math.round(openingCash);
  if (!(cash >= 0)) fail("ຈຳນວນເງິນບໍ່ຖືກຕ້ອງ");
  if (await getOpenShift()) fail("ມີກະທີ່ຍັງເປີດຢູ່ — ປິດກະນັ້ນກ່ອນ");
  const shift: Shift = {
    id: newId(),
    userId: session.uid,
    userName: session.name,
    openedAt: Date.now(),
    openingCash: cash,
    closedAt: null,
    closedById: null,
    closedByName: null,
    expectedCash: null,
    countedCash: null,
    summary: null,
  };
  await getDb().shifts.add(shift);
  return shift;
}

/** Live totals for an open shift; the frozen copy for a closed one. */
export async function shiftSummary(shift: Shift): Promise<ShiftSummary> {
  if (shift.summary) return shift.summary;
  const rows = (await ordersBetween(shift.openedAt, (shift.closedAt ?? Date.now()) + 1)).filter((o) => o.shiftId === shift.id);
  const paid = rows.filter((o) => o.status === "paid");
  const voided = rows.filter((o) => o.status === "void");
  const byMethod: Record<PaymentMethod, number> = { cash: 0, qr: 0, card: 0 };
  for (const o of paid) byMethod[o.paymentMethod] += o.total;
  return {
    bills: paid.length,
    total: paid.reduce((n, o) => n + o.total, 0),
    byMethod,
    discount: paid.reduce((n, o) => n + o.discount, 0),
    discountBills: paid.filter((o) => o.discount > 0).length,
    voids: voided.length,
    voidTotal: voided.reduce((n, o) => n + o.total, 0),
  };
}

export async function closeShift(id: string, countedCash: number, by: Session): Promise<Shift> {
  const db = getDb();
  const counted = Math.round(countedCash);
  if (!(counted >= 0)) fail("ຈຳນວນເງິນບໍ່ຖືກຕ້ອງ");
  const shift = await db.shifts.get(id);
  if (!shift || shift.closedAt !== null) fail("ກະນີ້ຖືກປິດແລ້ວ");
  const summary = await shiftSummary(shift!);
  const closed: Shift = {
    ...shift!,
    closedAt: Date.now(),
    closedById: by.uid,
    closedByName: by.name,
    expectedCash: shift!.openingCash + summary.byMethod.cash,
    countedCash: counted,
    summary,
  };
  await db.shifts.put(closed);
  return closed;
}

export async function listShifts(limit = 100): Promise<Shift[]> {
  return getDb().shifts.orderBy("openedAt").reverse().limit(limit).toArray();
}

// ---------------------------------------------------------------- expenses
export async function listExpenses(monthKey: string): Promise<Expense[]> {
  const start = fromDateKey(`${monthKey}-01`) ?? startOfMonth(Date.now());
  const rows = await getDb().expenses.where("date").between(start, addMonths(start, 1), true, false).toArray();
  return rows.sort((a, b) => b.date - a.date || (b.id ?? 0) - (a.id ?? 0));
}

export async function expensesBetween(from: number, to: number) {
  return getDb().expenses.where("date").between(from, to, true, false).toArray();
}

export async function addExpense(e: { date: string; category: string; amount: number | string; note: string }) {
  const amount = Math.round(Number(e.amount));
  const day = fromDateKey(e.date);
  if (!(amount > 0)) fail("ຈຳນວນເງິນບໍ່ຖືກຕ້ອງ");
  if (!e.category.trim()) fail("ກະລຸນາເລືອກປະເພດ");
  if (day === null) fail("ວັນທີບໍ່ຖືກຕ້ອງ");
  const now = Date.now();
  const date = now >= day! && now < day! + DAY ? now : day! + 12 * HOUR;
  await getDb().expenses.add({ amount, category: e.category.trim().slice(0, 40), note: e.note.trim().slice(0, 120) || null, date, createdAt: now });
}

export async function deleteExpense(id: number) {
  await getDb().expenses.delete(id);
}

// ---------------------------------------------------------------- backup / restore / reset
export const BACKUP_APP = "dalin-pos-offline";

export async function exportBackup() {
  const db = getDb();
  const [categories, products, users, orders, expenses, kv, shifts] = await Promise.all([
    db.categories.toArray(),
    db.products.toArray(),
    db.users.toArray(),
    db.orders.toArray(),
    db.expenses.toArray(),
    db.kv.toArray(),
    db.shifts.toArray(),
  ]);
  return { app: BACKUP_APP, version: 2, exportedAt: Date.now(), data: { categories, products, users, orders, expenses, kv, shifts } };
}

/** Called only once the file was really handed off (not when the share sheet was cancelled). */
export async function markBackedUp() {
  await setMeta("lastBackupAt", Date.now());
}

/** Bills made since the last backup — the ones that would be lost with this iPad. */
export async function backupStatus(): Promise<{ lastBackupAt: number | null; unsavedBills: number }> {
  const last = (await getMeta<number>("lastBackupAt")) ?? null;
  const unsavedBills = await getDb().orders.where("createdAt").above(last ?? 0).count();
  return { lastBackupAt: last, unsavedBills };
}

export async function importBackup(json: unknown) {
  const b = json as { app?: string; data?: Record<string, unknown[]> };
  if (b?.app !== BACKUP_APP || !b.data) fail("ໄຟລ໌ນີ້ບໍ່ແມ່ນໄຟລ໌ສຳຮອງຂອງ Dalin POS");
  const d = b.data!;
  for (const k of ["categories", "products", "users", "orders", "expenses", "kv"]) {
    if (!Array.isArray(d[k])) fail("ໄຟລ໌ສຳຮອງບໍ່ຄົບ");
  }
  if (!(d.users as User[]).some((u) => u.role === "owner" && u.active)) fail("ໄຟລ໌ສຳຮອງບໍ່ມີບັນຊີຜູ້ຈັດການ");
  const db = getDb();
  const shifts = Array.isArray(d.shifts) ? (d.shifts as Shift[]) : []; // backups from before shifts existed
  await db.transaction("rw", [db.categories, db.products, db.users, db.orders, db.expenses, db.kv, db.shifts], async () => {
    await Promise.all([db.categories.clear(), db.products.clear(), db.users.clear(), db.orders.clear(), db.expenses.clear(), db.kv.clear(), db.shifts.clear()]);
    await db.categories.bulkAdd(d.categories as Category[]);
    await db.products.bulkAdd(d.products as Product[]);
    await db.users.bulkAdd(d.users as User[]);
    await db.orders.bulkAdd(d.orders as Order[]);
    await db.expenses.bulkAdd(d.expenses as Expense[]);
    await db.kv.bulkAdd(d.kv as { key: string; value: unknown }[]);
    await db.shifts.bulkAdd(shifts);
  });
}

/** Wipes everything and starts fresh with the starter menu (PINs back to the factory defaults). */
export async function resetAll() {
  const db = getDb();
  await db.delete();
  await db.open();
  ready = null;
  await ensureReady();
}

/** Clears sales, shifts + expenses only (keeps menu, users, settings). */
export async function clearSales() {
  const db = getDb();
  await db.transaction("rw", db.orders, db.expenses, db.shifts, async () => {
    await db.orders.clear();
    await db.expenses.clear();
    await db.shifts.clear();
  });
}

export async function loadDemo(session: Session) {
  const db = getDb();
  if ((await db.orders.count()) > 0) fail("ມີບິນຂາຍແລ້ວ — ໃສ່ຂໍ້ມູນຕົວຢ່າງໄດ້ສະເພາະຕອນທີ່ຍັງບໍ່ມີບິນ");
  const products = await db.products.toArray();
  const { orders, expenses } = generateDemo(products, { id: session.uid, name: session.name });
  await db.transaction("rw", db.orders, db.expenses, async () => {
    await db.orders.bulkAdd(orders);
    await db.expenses.bulkAdd(expenses);
  });
  return orders.length;
}