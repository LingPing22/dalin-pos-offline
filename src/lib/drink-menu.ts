/**
 * Which drinks come hot / iced / blended, and turning an old one-type menu into that.
 * Pure (no database) so the starter menu, the "tidy my menu" tool and the tests share it.
 */
import { VARIANT_NAMES, typeFromName, type Variant } from "./types";

type T = (typeof VARIANT_NAMES)[number];
const ALL: T[] = ["ຮ້ອນ", "ເຢັນ", "ປັ່ນ"];

/** Hot is 5,000 less than iced, blended 5,000 more (cost moves 2,000) — the owner can change them */
export const PRICE_STEP: Record<string, number> = { ຮ້ອນ: -5000, ເຢັນ: 0, ປັ່ນ: 5000 };
const COST_STEP: Record<string, number> = { ຮ້ອນ: -2000, ເຢັນ: 0, ປັ່ນ: 2000 };

/** A price for `type` when the price for `known` is `price` */
export const stepPrice = (price: number, known: string, type: string) => Math.max(1000, price + PRICE_STEP[type] - PRICE_STEP[known]);
const stepCost = (cost: number, known: string, type: string) => (cost ? Math.max(0, cost + COST_STEP[type] - COST_STEP[known]) : 0);

/**
 * The starter drinks: old one-type name → the drink and the types it is sold as.
 * `base` = which type the old price was for.
 */
export const DRINKS: Record<string, { name: string; base: T; types: T[]; icon?: [from: string, to: string] }> = {
  "ກາເຟລາວ ຮ້ອນ": { name: "ກາເຟລາວ", base: "ຮ້ອນ", types: ALL },
  "ກາເຟນົມເຢັນ": { name: "ກາເຟນົມ", base: "ເຢັນ", types: ALL, icon: ["🧊", "☕"] },
  "ເອສເປຣສໂຊ": { name: "ເອສເປຣສໂຊ", base: "ຮ້ອນ", types: ["ຮ້ອນ", "ເຢັນ"] },
  "ອາເມຣິກາໂນ່ ເຢັນ": { name: "ອາເມຣິກາໂນ່", base: "ເຢັນ", types: ["ຮ້ອນ", "ເຢັນ"] },
  "ລາເຕ້ ເຢັນ": { name: "ລາເຕ້", base: "ເຢັນ", types: ALL },
  "ຄາປູຊີໂນ່": { name: "ຄາປູຊີໂນ່", base: "ຮ້ອນ", types: ALL },
  "ມອກຄ່າ ເຢັນ": { name: "ມອກຄ່າ", base: "ເຢັນ", types: ALL },
  "ຊາໄທ ເຢັນ": { name: "ຊາໄທ", base: "ເຢັນ", types: ALL },
  "ຊາຂຽວນົມ": { name: "ຊາຂຽວນົມ", base: "ເຢັນ", types: ALL },
  "ຊາມະນາວ": { name: "ຊາມະນາວ", base: "ເຢັນ", types: ALL },
  "ໂກໂກ້ ເຢັນ": { name: "ໂກໂກ້", base: "ເຢັນ", types: ALL },
  "ນົມສົດ ເຢັນ": { name: "ນົມສົດ", base: "ເຢັນ", types: ALL },
  "ນ້ຳໝາກພ້າວ": { name: "ນ້ຳໝາກພ້າວ", base: "ເຢັນ", types: ["ເຢັນ", "ປັ່ນ"] },
  "ນ້ຳໝາກກ້ຽງ": { name: "ນ້ຳໝາກກ້ຽງ", base: "ເຢັນ", types: ["ເຢັນ", "ປັ່ນ"] },
};

const variantsFrom = (price: number, cost: number, known: string, types: readonly string[]): Variant[] =>
  VARIANT_NAMES.filter((t) => types.includes(t)).map((t) => ({ name: t, price: stepPrice(price, known, t), cost: stepCost(cost, known, t) }));

/** Product fields for a variant product: price / cost hold the cheapest one (as saveProduct does) */
export function withVariants(name: string, variants: Variant[]) {
  const cheapest = variants.reduce((m, v) => (v.price < m.price ? v : m), variants[0]);
  return { name, variants, price: cheapest.price, cost: cheapest.cost };
}

/** How a starter-menu row is created in a new shop */
export function starterDrink(name: string, price: number, cost: number) {
  const d = DRINKS[name];
  return d ? withVariants(d.name, variantsFrom(price, cost, d.base, d.types)) : { name, variants: null, price, cost };
}

type P = { id: number; name: string; categoryId: number | null; price: number; cost: number; emoji?: string | null; variants?: Variant[] | null; active: boolean };
export type DrinkChange = { id: number; before: { name: string; price: number }[]; name: string; variants: Variant[]; remove: number[]; emoji?: string };

/** "ລາເຕ້ ເຢັນ" → "ລາເຕ້" */
const stripType = (name: string, type: string) => name.replace(type, " ").replace(/\s+/g, " ").trim();

/**
 * What the "tidy drinks" tool would change, without changing anything:
 *  1. starter drinks still sold as one type get their hot / iced / blended prices, worked out
 *     from the price the shop sells them at now;
 *  2. the shop's own pairs like "ຊາຂຽວ ຮ້ອນ" + "ຊາຂຽວ ເຢັນ" become one "ຊາຂຽວ" (the extra one is
 *     removed, or only hidden if it has sales, so history stays).
 * Skips anything that would clash with a drink that already has the new name.
 */
export function planDrinkMenu(products: P[]): DrinkChange[] {
  const live = products.filter((p) => p.active && !p.variants?.length);
  const taken = new Set(products.filter((p) => p.active).map((p) => `${p.categoryId}:${p.name}`));
  const changes: DrinkChange[] = [];
  const used = new Set<number>();
  const claim = (categoryId: number | null, name: string, ids: number[]) => {
    const key = `${categoryId}:${name}`;
    const self = ids.some((id) => products.find((p) => p.id === id)?.name === name);
    if (taken.has(key) && !self) return false;
    taken.add(key);
    ids.forEach((id) => used.add(id));
    return true;
  };

  // 2 first: the shop's own hot + iced pairs
  const groups = new Map<string, { p: P; type: string }[]>();
  for (const p of live) {
    const type = typeFromName(p.name);
    if (!type) continue;
    const key = `${p.categoryId}:${stripType(p.name, type)}`;
    groups.set(key, [...(groups.get(key) ?? []), { p, type }]);
  }
  for (const g of groups.values()) {
    if (g.length < 2 || new Set(g.map((x) => x.type)).size !== g.length) continue;
    const keep = g[0].p;
    const name = stripType(keep.name, g[0].type);
    if (!name || !claim(keep.categoryId, name, g.map((x) => x.p.id))) continue;
    const variants = VARIANT_NAMES.flatMap((t) => g.filter((x) => x.type === t).map((x) => ({ name: t, price: x.p.price, cost: x.p.cost })));
    changes.push({ id: keep.id, before: g.map((x) => ({ name: x.p.name, price: x.p.price })), name, variants, remove: g.slice(1).map((x) => x.p.id) });
  }

  // 1: starter drinks
  for (const p of live) {
    const d = DRINKS[p.name];
    if (!d || used.has(p.id) || !claim(p.categoryId, d.name, [p.id])) continue;
    // An ice-cube picture no longer fits a drink that is also sold hot
    const emoji = d.icon && p.emoji === d.icon[0] ? d.icon[1] : undefined;
    changes.push({ id: p.id, before: [{ name: p.name, price: p.price }], name: d.name, variants: variantsFrom(p.price, p.cost, d.base, d.types), remove: [], ...(emoji && { emoji }) });
  }
  return changes;
}
