"use client";
import { tw } from "@/lib/tw";
import { useRef, useState } from "react";
import { ImagePlus, Plus, Search, Trash2 } from "lucide-react";
import { Field, PageHeader, btnDanger, btnGhost, btnPrimary, inputCls, resizeImage } from "@/components/ui/form";
import { Sheet } from "@/components/ui/Sheet";
import { fmt } from "@/lib/money";
import { addCategory, deleteCategory, deleteProduct, getCategories, listProducts, saveProduct, updateCategory, type AdminProduct } from "@/lib/store";
import { VARIANT_NAMES, choicesOf, typeFromName, type PosCategory } from "@/lib/types";
import { VariantTag, variantStyle } from "@/components/VariantTag";
import { stepPrice } from "@/lib/drink-menu";
import { DrinkMenuTidy } from "@/components/admin/DrinkMenuTidy";

const SWATCHES = ["#F3E6D8", "#FBE1C8", "#FCE6B8", "#F8F0C6", "#DDEBD3", "#E1EEF8", "#EDE7F6", "#F9D7DC", "#EEF1F6"];

type Draft = {
  id?: number;
  name: string;
  categoryId: number | null;
  price: string;
  cost: string;
  sku: string;
  emoji: string;
  color: string;
  active: boolean;
  image?: string | null; // undefined = unchanged
  imageUrl: string | null;
  /** Sold as hot / iced / blended, each with its own price */
  multi: boolean;
  variants: Record<string, { on: boolean; price: string; cost: string }>;
};

const noVariants = () => Object.fromEntries(VARIANT_NAMES.map((n) => [n, { on: true, price: "", cost: "" }]));

const empty = (categoryId: number | null): Draft => ({
  name: "", categoryId, price: "", cost: "", sku: "", emoji: "🛍️", color: SWATCHES[0], active: true, imageUrl: null,
  multi: false, variants: noVariants(),
});

/** Typical café mark-ups, only used to pre-fill empty boxes */

export function ProductManager({ initialProducts, initialCategories }: { initialProducts: AdminProduct[]; initialCategories: PosCategory[] }) {
  const [products, setProducts] = useState(initialProducts);
  const [categories, setCategories] = useState(initialCategories);
  const [cat, setCat] = useState<number | "all">("all");
  const [q, setQ] = useState("");
  const [draft, setDraft] = useState<Draft | null>(null);
  const [catsOpen, setCatsOpen] = useState(false);
  const [err, setErr] = useState("");
  const [saving, setSaving] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);

  async function reload() {
    const [p, c] = await Promise.all([listProducts(), getCategories()]);
    setProducts(p);
    setCategories(c);
  }

  const list = products.filter((p) => (cat === "all" || p.categoryId === cat) && (!q || p.name.toLowerCase().includes(q.toLowerCase()) || p.sku?.toLowerCase().includes(q.toLowerCase())));
  const catName = (id: number | null) => categories.find((c) => c.id === id)?.name ?? "ບໍ່ມີໝວດ";

  function edit(p: AdminProduct) {
    setErr("");
    setDraft({
      id: p.id, name: p.name, categoryId: p.categoryId, price: String(p.price), cost: String(p.cost), sku: p.sku ?? "",
      emoji: p.emoji ?? "🛍️", color: p.color ?? SWATCHES[0], active: p.active, imageUrl: p.imageUrl,
      multi: !!p.variants?.length,
      variants: p.variants?.length
        ? Object.fromEntries(VARIANT_NAMES.map((n) => {
            const v = p.variants!.find((x) => x.name === n);
            return [n, v ? { on: true, price: String(v.price), cost: String(v.cost) } : { on: false, price: "", cost: "" }];
          }))
        : noVariants(),
    });
  }

  function setMulti(on: boolean) {
    if (!draft) return;
    const base = Number(draft.price) || 0;
    // "ກາເຟນົມເຢັນ" is already the iced one: tick only that, and price the others around it
    const named = typeFromName(draft.name);
    const fresh = VARIANT_NAMES.every((n) => !draft.variants[n].price);
    const variants = { ...draft.variants };
    if (on)
      for (const n of VARIANT_NAMES) {
        const v = variants[n];
        const suggest = base ? stepPrice(base, named ?? "ຮ້ອນ", n) : 0;
        variants[n] = {
          on: fresh && named ? n === named : v.on,
          price: v.price || (suggest > 0 ? String(suggest) : ""),
          cost: v.cost || draft.cost,
        };
      }
    setDraft({ ...draft, multi: on, variants });
  }
  const setVariant = (n: string, patch: Partial<Draft["variants"][string]>) =>
    draft && setDraft({ ...draft, variants: { ...draft.variants, [n]: { ...draft.variants[n], ...patch } } });

  async function save() {
    if (!draft) return;
    setSaving(true);
    setErr("");
    try {
      await saveProduct({
        id: draft.id, name: draft.name, categoryId: draft.categoryId, price: draft.price, cost: draft.cost || 0,
        sku: draft.sku, emoji: draft.emoji, color: draft.color, active: draft.active, image: draft.image,
        variants: draft.multi ? VARIANT_NAMES.filter((n) => draft.variants[n].on).map((n) => ({ name: n, ...draft.variants[n] })) : null,
      });
    } catch (e) {
      setSaving(false);
      return setErr((e as Error).message || "ບັນທຶກບໍ່ສຳເລັດ");
    }
    setSaving(false);
    setDraft(null);
    reload();
  }

  async function remove() {
    if (!draft?.id) return;
    await deleteProduct(draft.id);
    setDraft(null);
    reload();
  }

  async function onFile(f?: File) {
    if (!f || !draft) return;
    const dataUrl = await resizeImage(f);
    setDraft({ ...draft, image: dataUrl, imageUrl: dataUrl });
  }

  const price = Number(draft?.price || 0);
  const cost = Number(draft?.cost || 0);
  const margin = price > 0 ? Math.round(((price - cost) / price) * 100) : null;

  return (
    <main className="pb-10">
      <PageHeader title="ສິນຄ້າ" sub={`${products.filter((p) => p.active).length} ລາຍການທີ່ຂາຍຢູ່`}>
        <button onClick={() => setCatsOpen(true)} className={btnGhost}>ຈັດການໝວດ</button>
        <button onClick={() => { setErr(""); setDraft(empty(typeof cat === "number" ? cat : categories[0]?.id ?? null)); }} className={btnPrimary}>
          <Plus className="size-5" /> ເພີ່ມສິນຄ້າ
        </button>
      </PageHeader>

      <div className="px-6 lg:px-8">
        <DrinkMenuTidy products={products} onDone={reload} />
        <div className="mb-4 flex flex-wrap items-center gap-3">
          <label className="relative flex-1 basis-60">
            <Search className="pointer-events-none absolute left-4 top-3.5 size-5 text-muted" />
            <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="ຄົ້ນຫາຊື່ ຫຼື ບາໂຄດ" className={tw(inputCls, "pl-12")} />
          </label>
          <div className="no-scrollbar flex gap-1.5 overflow-x-auto">
            {[{ id: "all" as const, name: "ທັງໝົດ" }, ...categories].map((c) => (
              <button key={c.id} onClick={() => setCat(c.id)} className={`h-11 shrink-0 rounded-xl px-4 font-medium ${cat === c.id ? "bg-ink text-white" : "bg-white ring-1 ring-line"}`}>
                {c.name}
              </button>
            ))}
          </div>
        </div>

        <div className="overflow-hidden rounded-2xl bg-white ring-1 ring-line">
          <table className="w-full text-left">
            <thead className="text-sm text-muted">
              <tr className="border-b border-line">
                <th className="px-5 py-3 font-medium">ສິນຄ້າ</th>
                <th className="hidden py-3 font-medium md:table-cell">ໝວດ</th>
                <th className="py-3 text-right font-medium">ລາຄາຂາຍ</th>
                <th className="hidden py-3 text-right font-medium md:table-cell">ຕົ້ນທຶນ</th>
                <th className="py-3 text-right font-medium">ກຳໄລ</th>
                <th className="px-5 py-3 text-right font-medium">ສະຖານະ</th>
              </tr>
            </thead>
            <tbody>
              {list.map((p) => (
                <tr key={p.id} onClick={() => edit(p)} className={`cursor-pointer border-b border-line last:border-0 active:bg-ink-faint ${p.active ? "" : "text-muted"}`}>
                  <td className="px-5 py-2.5">
                    <div className="flex items-center gap-3">
                      <span className="grid size-12 shrink-0 place-items-center overflow-hidden rounded-xl text-2xl" style={{ background: p.color ?? "var(--color-ink-faint)" }}>
                        {/* eslint-disable-next-line @next/next/no-img-element */}
                        {p.imageUrl ? <img src={p.imageUrl} alt="" className="size-full object-cover" /> : p.emoji}
                      </span>
                      <span>
                        <span className="block font-medium">{p.name}</span>
                        {choicesOf(p).some((c) => c.type) ? (
                          <span className="mt-0.5 flex flex-wrap gap-1">
                            {choicesOf(p).map((c) => c.type && <VariantTag key={c.type} name={c.type} />)}
                          </span>
                        ) : (
                          p.sku && <span className="num block text-sm text-muted">{p.sku}</span>
                        )}
                      </span>
                    </div>
                  </td>
                  <td className="hidden py-2.5 md:table-cell">{catName(p.categoryId)}</td>
                  <td className="num py-2.5 text-right font-semibold">
                    {p.variants?.length && p.variants.some((v) => v.price !== p.price)
                      ? `${fmt(p.price)}–${fmt(Math.max(...p.variants.map((v) => v.price)))}`
                      : fmt(p.price)}
                  </td>
                  <td className="num hidden py-2.5 text-right text-muted md:table-cell">{fmt(p.cost)}</td>
                  <td className="num py-2.5 text-right">{p.price ? Math.round(((p.price - p.cost) / p.price) * 100) : 0}%</td>
                  <td className="px-5 py-2.5 text-right">
                    <span className={`rounded-lg px-2.5 py-1 text-sm ${p.active ? "bg-leaf-faint text-leaf" : "bg-paper text-muted"}`}>{p.active ? "ຂາຍຢູ່" : "ປິດຂາຍ"}</span>
                  </td>
                </tr>
              ))}
              {list.length === 0 && (
                <tr>
                  <td colSpan={6} className="p-6 text-muted">ບໍ່ພົບສິນຄ້າ</td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* ---------- Edit / create ---------- */}
      <Sheet open={!!draft} onClose={() => setDraft(null)} title={draft?.id ? "ແກ້ໄຂສິນຄ້າ" : "ເພີ່ມສິນຄ້າ"} width="max-w-2xl">
        {draft && (
          <div className="grid gap-5 p-6 md:grid-cols-[200px_1fr]">
            <div>
              <button
                type="button"
                onClick={() => fileRef.current?.click()}
                className="grid aspect-square w-full place-items-center overflow-hidden rounded-2xl ring-1 ring-line"
                style={{ background: draft.color }}
              >
                {draft.imageUrl ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={draft.imageUrl} alt="" className="size-full object-cover" />
                ) : (
                  <span className="text-6xl">{draft.emoji}</span>
                )}
              </button>
              <input ref={fileRef} type="file" accept="image/*" className="hidden" onChange={(e) => onFile(e.target.files?.[0])} />
              <div className="mt-2 grid gap-2">
                <button type="button" onClick={() => fileRef.current?.click()} className={tw(btnGhost, "h-11")}>
                  <ImagePlus className="size-5" /> {draft.imageUrl ? "ປ່ຽນຮູບ" : "ຖ່າຍ/ເລືອກຮູບ"}
                </button>
                {draft.imageUrl && (
                  <button type="button" onClick={() => setDraft({ ...draft, image: null, imageUrl: null })} className={tw(btnDanger, "h-10")}>
                    ລຶບຮູບ
                  </button>
                )}
              </div>
              {!draft.imageUrl && (
                <div className="mt-3">
                  <Field label="ໄອຄອນ ແລະ ສີພື້ນ (ເມື່ອບໍ່ມີຮູບ)">
                    <input value={draft.emoji} onChange={(e) => setDraft({ ...draft, emoji: e.target.value })} className={tw(inputCls, "text-center text-2xl")} maxLength={4} />
                  </Field>
                  <div className="mt-2 flex flex-wrap gap-1.5">
                    {SWATCHES.map((c) => (
                      <button
                        key={c}
                        type="button"
                        aria-label={c}
                        onClick={() => setDraft({ ...draft, color: c })}
                        className={`size-8 rounded-lg ring-1 ${draft.color === c ? "ring-2 ring-ink" : "ring-line"}`}
                        style={{ background: c }}
                      />
                    ))}
                  </div>
                </div>
              )}
            </div>

            <div className="grid content-start gap-4">
              <Field label="ຊື່ສິນຄ້າ">
                <input value={draft.name} onChange={(e) => setDraft({ ...draft, name: e.target.value })} className={inputCls} autoFocus={!draft.id} />
              </Field>
              <Field label="ໝວດ">
                <select value={draft.categoryId ?? ""} onChange={(e) => setDraft({ ...draft, categoryId: e.target.value ? Number(e.target.value) : null })} className={inputCls}>
                  <option value="">ບໍ່ມີໝວດ</option>
                  {categories.map((c) => (
                    <option key={c.id} value={c.id}>{c.icon} {c.name}</option>
                  ))}
                </select>
              </Field>
              <label className="flex min-h-12 items-center justify-between gap-3 rounded-xl bg-white px-4 py-2 ring-1 ring-line">
                <span>
                  <span className="block">ແຍກແບບ ຮ້ອນ / ເຢັນ / ປັ່ນ</span>
                  <span className="block text-sm text-muted">
                    {!draft.multi && typeFromName(draft.name)
                      ? `ຕອນນີ້ຢູ່ໃນກຸ່ມ “${typeFromName(draft.name)}” ຕາມຊື່ສິນຄ້າ — ເປີດ ຖ້າຂາຍຫຼາຍແບບ`
                      : "ໜ້າຂາຍຈະແຍກເປັນກຸ່ມ ຮ້ອນ / ເຢັນ / ປັ່ນ — ແຕ່ລະແບບມີລາຄາຂອງຕົນເອງ"}
                  </span>
                </span>
                <input type="checkbox" checked={draft.multi} onChange={(e) => setMulti(e.target.checked)} className="size-6 shrink-0 accent-[var(--color-ink)]" />
              </label>
              {draft.multi ? (
                <div className="grid gap-2">
                  <div className="grid grid-cols-[minmax(0,1fr)_minmax(0,1.1fr)_minmax(0,1.1fr)] gap-2 px-1 text-sm font-medium text-muted">
                    <span>ແບບ</span>
                    <span>ລາຄາຂາຍ (₭)</span>
                    <span>ຕົ້ນທຶນ (₭)</span>
                  </div>
                  {VARIANT_NAMES.map((n) => {
                    const v = draft.variants[n];
                    return (
                      <div key={n} className="grid grid-cols-[minmax(0,1fr)_minmax(0,1.1fr)_minmax(0,1.1fr)] items-center gap-2">
                        <label className={`flex h-12 items-center gap-2 rounded-xl px-3 ${v.on ? `ring-2 ${variantStyle(n).soft} ${variantStyle(n).ring}` : "bg-paper text-muted ring-1 ring-line"}`}>
                          <input type="checkbox" checked={v.on} onChange={(e) => setVariant(n, { on: e.target.checked })} className="size-5 shrink-0 accent-[var(--color-ink)]" />
                          <VariantTag name={n} solid={v.on} className="text-sm" />
                        </label>
                        <input inputMode="numeric" disabled={!v.on} value={v.price} onChange={(e) => setVariant(n, { price: e.target.value.replace(/\D/g, "") })} className={tw(inputCls, "num")} aria-label={`ລາຄາ ${n}`} />
                        <input inputMode="numeric" disabled={!v.on} value={v.cost} onChange={(e) => setVariant(n, { cost: e.target.value.replace(/\D/g, "") })} className={tw(inputCls, "num")} aria-label={`ຕົ້ນທຶນ ${n}`} />
                      </div>
                    );
                  })}
                </div>
              ) : (
                <div className="grid grid-cols-2 gap-3">
                  <Field label="ລາຄາຂາຍ (₭)">
                    <input inputMode="numeric" value={draft.price} onChange={(e) => setDraft({ ...draft, price: e.target.value.replace(/\D/g, "") })} className={tw(inputCls, "num")} />
                  </Field>
                  <Field label="ຕົ້ນທຶນ (₭)" hint={margin !== null ? `ກຳໄລຂັ້ນຕົ້ນ ${margin}%` : "ໃຊ້ຄິດໄລ່ກຳໄລສຸດທິ"}>
                    <input inputMode="numeric" value={draft.cost} onChange={(e) => setDraft({ ...draft, cost: e.target.value.replace(/\D/g, "") })} className={tw(inputCls, "num")} />
                  </Field>
                </div>
              )}
              <Field label="ບາໂຄດ / ລະຫັດສິນຄ້າ" hint="ສະແກນບາໂຄດໃສ່ຊ່ອງຄົ້ນຫາໃນໜ້າຂາຍ ເພື່ອເພີ່ມສິນຄ້າໄວ">
                <input value={draft.sku} onChange={(e) => setDraft({ ...draft, sku: e.target.value })} className={tw(inputCls, "num")} />
              </Field>
              <label className="flex h-12 items-center justify-between rounded-xl bg-white px-4 ring-1 ring-line">
                <span>ສະແດງໃນໜ້າຂາຍ</span>
                <input type="checkbox" checked={draft.active} onChange={(e) => setDraft({ ...draft, active: e.target.checked })} className="size-6 accent-[var(--color-ink)]" />
              </label>
              {err && <p className="rounded-xl bg-chili-faint px-4 py-3 text-chili">{err}</p>}
              <div className="flex gap-3 pt-1">
                {draft.id && (
                  <button onClick={remove} className={btnDanger} title="ສິນຄ້າທີ່ເຄີຍຂາຍແລ້ວ ຈະຖືກປິດຂາຍແທນການລຶບ">
                    <Trash2 className="size-5" /> ລຶບ
                  </button>
                )}
                <button onClick={save} disabled={saving || !draft.name || (draft.multi ? !VARIANT_NAMES.some((n) => draft.variants[n].on && draft.variants[n].price) : !draft.price)} className={tw(btnPrimary, "ml-auto min-w-36")}>
                  {saving ? "ກຳລັງບັນທຶກ…" : "ບັນທຶກ"}
                </button>
              </div>
            </div>
          </div>
        )}
      </Sheet>

      <CategorySheet open={catsOpen} onClose={() => setCatsOpen(false)} categories={categories} onChanged={reload} />
    </main>
  );
}

function CategorySheet({ open, onClose, categories, onChanged }: { open: boolean; onClose: () => void; categories: PosCategory[]; onChanged: () => void }) {
  const [name, setName] = useState("");
  const [icon, setIcon] = useState("🛍️");
  const run = async (job: Promise<unknown>) => {
    await job.catch(() => {});
    onChanged();
  };
  return (
    <Sheet open={open} onClose={onClose} title="ໝວດສິນຄ້າ" width="max-w-lg">
      <div className="p-6">
        <ul className="grid gap-2">
          {categories.map((c) => (
            <li key={c.id} className="flex items-center gap-2">
              <input defaultValue={c.icon} onBlur={(e) => e.target.value !== c.icon && run(updateCategory(c.id, { icon: e.target.value }))} className={tw(inputCls, "w-16 text-center text-xl")} aria-label="ໄອຄອນ" />
              <input defaultValue={c.name} onBlur={(e) => e.target.value !== c.name && run(updateCategory(c.id, { name: e.target.value }))} className={inputCls} aria-label="ຊື່ໝວດ" />
              <button onClick={() => run(deleteCategory(c.id))} aria-label="ລຶບໝວດ" className="grid size-12 shrink-0 place-items-center rounded-xl text-chili active:bg-chili-faint">
                <Trash2 className="size-5" />
              </button>
            </li>
          ))}
        </ul>
        <p className="mt-2 text-sm text-muted">ແກ້ຊື່ແລ້ວແຕະບ່ອນອື່ນເພື່ອບັນທຶກ. ລຶບໝວດແລ້ວ ສິນຄ້າຍັງຢູ່ (ກາຍເປັນ “ບໍ່ມີໝວດ”).</p>
        <div className="mt-5 flex gap-2 border-t border-line pt-5">
          <input value={icon} onChange={(e) => setIcon(e.target.value)} className={tw(inputCls, "w-16 text-center text-xl")} aria-label="ໄອຄອນ" />
          <input value={name} onChange={(e) => setName(e.target.value)} placeholder="ຊື່ໝວດໃໝ່" className={inputCls} />
          <button
            disabled={!name.trim()}
            onClick={async () => {
              await run(addCategory(name, icon));
              setName("");
            }}
            className={btnPrimary}
          >
            ເພີ່ມ
          </button>
        </div>
      </div>
    </Sheet>
  );
}
