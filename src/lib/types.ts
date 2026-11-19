export type PaymentMethod = "cash" | "qr" | "card";
export type Role = "owner" | "cashier";

export type ShopSettings = {
  shop: { name: string; address: string; phone: string; taxId: string; footer: string };
  tax: { enabled: boolean; rate: number; inclusive: boolean };
  /** Percent fee the shop pays per payment method, e.g. card 2.5 */
  fees: Record<PaymentMethod, number>;
  receipt: { width: 58 | 80 };
  billPrefix: string;
  /** Static shop QR (e.g. from the bank app) shown on the QR payment screen */
  qrImage: string | null;
  /** Lock the screen after this many idle minutes (0 = never) */
  security: { lockMinutes: number };
};

export const LOCK_MINUTES = [0, 5, 10, 15, 30] as const;

export const DEFAULT_SETTINGS: ShopSettings = {
  shop: {
    name: "Dalin Café",
    address: "ບ້ານ ສີສະຫວາດ, ເມືອງ ຈັນທະບູລີ, ນະຄອນຫຼວງວຽງຈັນ",
    phone: "020 1234 5678",
    taxId: "",
    footer: "ຂອບໃຈທີ່ອຸດໜູນ, ແລ້ວພົບກັນໃໝ່",
  },
  tax: { enabled: true, rate: 10, inclusive: true },
  fees: { cash: 0, qr: 0, card: 2.5 },
  receipt: { width: 80 },
  billPrefix: "DL",
  qrImage: null,
  security: { lockMinutes: 10 },
};

/** Hot / iced / blended versions of one product, each with its own price */
export type Variant = { name: string; price: number; cost: number };
export const VARIANT_NAMES = ["ຮ້ອນ", "ເຢັນ", "ປັ່ນ"] as const;
export const VARIANT_ICON: Record<string, string> = { ຮ້ອນ: "☕", ເຢັນ: "🧊", ປັ່ນ: "🥤" };

/** "ກາເຟນົມເຢັນ" → "ເຢັນ": a plain product whose name says exactly one of hot / iced / blended */
export function typeFromName(name: string): string | null {
  const hit = VARIANT_NAMES.filter((n) => name.includes(n));
  return hit.length === 1 ? hit[0] : null;
}

/** One tile on the till: a product as one of hot / iced / blended (type null = not a drink type) */
export type Choice = { type: string | null; variant: string | null; price: number };

/** A product with variants gets a tile per variant; a plain one is grouped by what its name says */
export function choicesOf(p: { name: string; price: number; variants?: Variant[] | null }): Choice[] {
  if (p.variants?.length) return p.variants.map((v) => ({ type: v.name, variant: v.name, price: v.price }));
  return [{ type: typeFromName(p.name), variant: null, price: p.price }];
}

/** Bill / receipt line: "ກາເຟລາວ (ເຢັນ)", but not "ກາເຟນົມເຢັນ (ເຢັນ)" */
export const lineName = (name: string, variant: string | null | undefined) => (variant && !name.includes(variant) ? `${name} (${variant})` : name);

export type PosProduct = {
  id: number;
  categoryId: number | null;
  name: string;
  sku: string | null;
  price: number;
  emoji: string | null;
  color: string | null;
  imageUrl: string | null;
  /** null = one price; otherwise the cashier picks one of these */
  variants: Variant[] | null;
};

export type PosCategory = { id: number; name: string; icon: string };

export type ReceiptData = {
  id: string;
  billNo: string;
  createdAt: number;
  cashierName: string | null;
  items: { name: string; price: number; qty: number; lineTotal: number }[];
  subtotal: number;
  discount: number;
  tax: number;
  taxRate: number;
  taxInclusive: boolean;
  total: number;
  paymentMethod: PaymentMethod;
  received: number;
  change: number;
  paymentRef: string | null;
  status: "paid" | "void";
  pending?: boolean; // saved on the device, waiting to sync
};

export const METHOD_LABEL: Record<PaymentMethod, string> = {
  cash: "ເງິນສົດ",
  qr: "ໂອນ QR",
  card: "ບັດ",
};
