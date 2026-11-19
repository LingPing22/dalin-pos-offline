"use client";
import { useCallback, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { ChevronRight, LayoutDashboard, Lock, LogOut, Search, Store, Wallet, X } from "lucide-react";
import { CartPanel, type Line } from "./CartPanel";
import { PaymentSheet } from "./PaymentSheet";
import { SaleDone } from "./SaleDone";
import { DiscountSheet, QtySheet } from "./AmountSheet";
import { CloseShiftSheet } from "./ShiftGate";
import { VariantSheet } from "./VariantSheet";
import { Sheet } from "@/components/ui/Sheet";
import { BackupReminder } from "@/components/BackupReminder";
import { fmt } from "@/lib/money";
import { computeTotals } from "@/lib/pricing";
import { createOrder } from "@/lib/store";
import { clearSession, setLocked, type Session } from "@/lib/session";
import type { PaymentMethod, PosCategory, PosProduct, ReceiptData, ShopSettings } from "@/lib/types";
import type { Shift } from "@/lib/db";
import { fmtTime } from "@/lib/time";

const keyOf = (id: number, variant: string | null) => `${id}:${variant ?? ""}`;

type Props = {
  catalog: { categories: PosCategory[]; products: PosProduct[] };
  settings: ShopSettings;
  user: Session;
  shift: Shift;
};

export function PosScreen({ catalog, settings, user, shift }: Props) {
  const router = useRouter();
  const { products, categories } = catalog;
  const byId = useMemo(() => new Map(products.map((p) => [p.id, p])), [products]);

  const [cat, setCat] = useState<number | "all">("all");
  const [q, setQ] = useState("");
  const [cart, setCart] = useState<{ id: number; variant: string | null; qty: number }[]>([]);
  const [discount, setDiscount] = useState(0);
  const [sheet, setSheet] = useState<"" | "pay" | "discount" | "cart" | "menu" | "close">("");
  const [qtyFor, setQtyFor] = useState<string | null>(null);
  const [pick, setPick] = useState<PosProduct | null>(null);
  const [bump, setBump] = useState<{ id: number; n: number } | null>(null);
  const [done, setDone] = useState<ReceiptData | null>(null);
  const [busy, setBusy] = useState(false);
  const [payError, setPayError] = useState("");
  const searchRef = useRef<HTMLInputElement>(null);

  // ---------- cart ----------
  const lines: Line[] = cart.flatMap((c) => {
    const product = byId.get(c.id);
    if (!product) return [];
    const v = c.variant ? product.variants?.find((x) => x.name === c.variant) : null;
    if (c.variant && !v) return [];
    return [{ key: keyOf(c.id, c.variant), product, variant: c.variant, price: v ? v.price : product.price, qty: c.qty }];
  });
  const totals = computeTotals({
    lines: lines.map((l) => ({ price: l.price, qty: l.qty })),
    discount,
    tax: settings.tax,
    feeRate: 0,
  });
  const count = lines.reduce((s, l) => s + l.qty, 0);
  /** All variants together, for the badge on the product tile */
  const qtyIn = (id: number) => cart.reduce((n, c) => (c.id === id ? n + c.qty : n), 0);
  const qtyOf = (key: string) => lines.find((l) => l.key === key)?.qty ?? 0;

  const add = useCallback((id: number, variant: string | null = null, n = 1) => {
    const key = keyOf(id, variant);
    setCart((c) =>
      c.some((x) => keyOf(x.id, x.variant) === key)
        ? c.map((x) => (keyOf(x.id, x.variant) === key ? { ...x, qty: Math.min(9999, x.qty + n) } : x))
        : [...c, { id, variant, qty: n }],
    );
    setBump((b) => ({ id, n: (b?.n ?? 0) + 1 }));
  }, []);
  /** Products that come hot / iced / blended ask which one first */
  const tap = (p: PosProduct) => (p.variants ? setPick(p) : add(p.id));
  const setQty = (key: string, qty: number) =>
    setCart((c) => (qty <= 0 ? c.filter((x) => keyOf(x.id, x.variant) !== key) : c.map((x) => (keyOf(x.id, x.variant) === key ? { ...x, qty } : x))));
  const inc = (key: string) => setQty(key, Math.min(9999, qtyOf(key) + 1));
  const dec = (key: string) => setQty(key, qtyOf(key) - 1);
  const clear = () => {
    setCart([]);
    setDiscount(0);
  };

  // ---------- browsing ----------
  const query = q.trim().toLowerCase();
  const visible = products.filter(
    (p) =>
      (cat === "all" || p.categoryId === cat) &&
      (!query || p.name.toLowerCase().includes(query) || p.sku?.toLowerCase() === query),
  );
  const counts = useMemo(() => {
    const m = new Map<number, number>();
    for (const p of products) if (p.categoryId) m.set(p.categoryId, (m.get(p.categoryId) ?? 0) + 1);
    return m;
  }, [products]);

  /** Barcode scanners type the code and press Enter */
  function onSearchEnter() {
    const exact = products.find((p) => p.sku && p.sku.toLowerCase() === query);
    const only = visible.length === 1 ? visible[0] : null;
    const hit = exact ?? only;
    if (hit) {
      tap(hit);
      setQ("");
    }
  }

  // ---------- payment ----------
  async function pay({ method, received, ref }: { method: PaymentMethod; received: number; ref: string }) {
    setBusy(true);
    setPayError("");
    try {
      const r = await createOrder(
        { items: cart.map((c) => ({ productId: c.id, variant: c.variant, qty: c.qty })), discount: totals.discount, paymentMethod: method, received, paymentRef: ref || undefined },
        user,
      );
      finish(r);
    } catch (e) {
      setPayError((e as Error).message || "ບັນທຶກບິນບໍ່ສຳເລັດ");
    } finally {
      setBusy(false);
    }
  }
  function finish(r: ReceiptData) {
    setSheet("");
    setDone(r);
    clear();
  }

  function logout() {
    clearSession();
    router.replace("/login/");
  }

  const qtyLine = qtyFor ? lines.find((l) => l.key === qtyFor) : null;
  const cartPanel = (
    <CartPanel
      lines={lines}
      totals={totals}
      settings={settings}
      onInc={inc}
      onDec={dec}
      onQty={setQtyFor}
      onClear={clear}
      onDiscount={() => setSheet("discount")}
      onPay={() => {
        setPayError("");
        setSheet("pay");
      }}
    />
  );

  return (
    <div className="pt-safe flex h-dvh flex-col overflow-hidden">
      {/* ---------- Top bar ---------- */}
      <header className="flex h-16 shrink-0 items-center gap-3 border-b border-line bg-white px-4">
        <div className="flex items-center gap-2.5 pr-1">
          <div className="grid size-10 place-items-center rounded-xl bg-ink text-marigold">
            <Store className="size-5" strokeWidth={2.25} />
          </div>
          <span className="hidden text-[17px] font-semibold xl:block">{settings.shop.name}</span>
        </div>

        <label className="relative flex h-12 max-w-xl flex-1 items-center">
          <Search className="pointer-events-none absolute left-4 size-5 text-muted" />
          <input
            ref={searchRef}
            value={q}
            onChange={(e) => setQ(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && onSearchEnter()}
            placeholder="ຄົ້ນຫາສິນຄ້າ ຫຼື ສະແກນບາໂຄດ"
            enterKeyHint="search"
            autoComplete="off"
            className="h-full w-full rounded-xl bg-paper pl-12 pr-12 outline-none ring-1 ring-transparent placeholder:text-muted/70 focus:bg-white focus:ring-ink-soft"
          />
          {q && (
            <button onClick={() => { setQ(""); searchRef.current?.focus(); }} aria-label="ລ້າງການຄົ້ນຫາ" className="absolute right-1 grid size-10 place-items-center rounded-lg text-muted active:bg-ink-faint">
              <X className="size-5" />
            </button>
          )}
        </label>

        <div className="ml-auto flex items-center gap-2">
          <button onClick={() => setSheet("menu")} className="flex h-12 items-center gap-2 rounded-xl px-3 active:bg-ink-faint">
            <span className="grid size-9 place-items-center rounded-full bg-ink-faint font-semibold">{user.name.slice(0, 1)}</span>
            <span className="hidden max-w-32 truncate font-medium md:block">{user.name}</span>
          </button>
        </div>
      </header>

      {user.role === "owner" && <BackupReminder className="shrink-0 py-2 ring-0 border-b border-marigold" />}

      {/* ---------- Body ---------- */}
      <div className="flex min-h-0 flex-1 flex-col lg:grid lg:grid-cols-[120px_1fr_minmax(340px,380px)]">
        {/* Categories: vertical rail in landscape, scrolling chips in portrait */}
        <nav aria-label="ໝວດສິນຄ້າ" className="no-scrollbar flex shrink-0 gap-2 overflow-x-auto border-b border-line bg-white px-3 py-2.5 lg:flex-col lg:overflow-y-auto lg:border-b-0 lg:border-r lg:px-2.5 lg:py-3">
          {[{ id: "all" as const, name: "ທັງໝົດ", icon: "🗂️" }, ...categories].map((c) => {
            const active = cat === c.id;
            const n = c.id === "all" ? products.length : counts.get(c.id) ?? 0;
            return (
              <button
                key={c.id}
                onClick={() => setCat(c.id)}
                aria-pressed={active}
                className={`flex shrink-0 items-center gap-2 rounded-2xl px-4 transition max-lg:h-12 lg:flex-col lg:gap-1 lg:px-1 lg:py-3 ${
                  active ? "bg-ink text-white" : "text-ink active:bg-ink-faint"
                }`}
              >
                <span className="text-xl lg:text-3xl" aria-hidden>{c.icon}</span>
                <span className="whitespace-nowrap text-[15px] font-medium lg:whitespace-normal lg:text-center lg:text-sm lg:leading-tight">{c.name}</span>
                <span className={`num text-xs ${active ? "text-white/60" : "text-muted"}`}>{n}</span>
              </button>
            );
          })}
        </nav>

        {/* Products */}
        <main className="scroll-touch @container min-h-0 flex-1 overflow-y-auto p-3 max-lg:pb-28 lg:p-4">
          {visible.length === 0 ? (
            <div className="grid h-full place-items-center text-center text-muted">
              <div>
                <p className="text-lg">ບໍ່ພົບສິນຄ້າ “{q}”</p>
                <button onClick={() => { setQ(""); setCat("all"); }} className="mt-3 h-11 rounded-xl px-4 font-medium text-ink-soft underline underline-offset-4">
                  ສະແດງສິນຄ້າທັງໝົດ
                </button>
              </div>
            </div>
          ) : (
            <ul className="grid grid-cols-2 gap-3 @[440px]:grid-cols-3 @[600px]:grid-cols-4 @[800px]:grid-cols-5 @[1000px]:grid-cols-6">
              {visible.map((p) => {
                const inCart = qtyIn(p.id);
                return (
                  <li key={p.id}>
                    <button
                      onClick={() => tap(p)}
                      key={bump?.id === p.id ? bump.n : 0}
                      className={`group relative flex w-full flex-col overflow-hidden rounded-2xl bg-white text-left ring-1 transition active:scale-[0.97] ${
                        inCart ? "ring-2 ring-ink" : "ring-line"
                      } ${bump?.id === p.id ? "animate-pop" : ""}`}
                    >
                      <div className="grid aspect-[4/3] w-full place-items-center overflow-hidden" style={{ background: p.color ?? "var(--color-ink-faint)" }}>
                        {p.imageUrl ? (
                          // eslint-disable-next-line @next/next/no-img-element
                          <img src={p.imageUrl} alt="" loading="lazy" className="size-full object-cover" draggable={false} />
                        ) : (
                          <span className="text-5xl drop-shadow-sm" aria-hidden>{p.emoji ?? "🛍️"}</span>
                        )}
                      </div>
                      {p.variants && (
                        <span className="absolute left-2 top-2 rounded-full bg-white/90 px-2 py-0.5 text-xs font-semibold shadow-sm">
                          {p.variants.map((v) => v.name).join(" · ")}
                        </span>
                      )}
                      <div className="flex flex-1 flex-col px-3 pb-3 pt-2">
                        <span className="line-clamp-2 min-h-[2.6em] text-[15px] font-medium leading-snug">{p.name}</span>
                        <span className="num mt-1 text-[17px] font-semibold">
                          {p.variants && <span className="text-sm font-normal text-muted">ເລີ່ມ </span>}
                          {fmt(p.price)} ₭
                        </span>
                      </div>
                      {inCart > 0 && (
                        <span className="num absolute right-2 top-2 grid h-8 min-w-8 place-items-center rounded-full bg-ink px-2 text-base font-bold text-white shadow-md">
                          {inCart}
                        </span>
                      )}
                    </button>
                  </li>
                );
              })}
            </ul>
          )}
        </main>

        {/* Cart: right column in landscape */}
        <aside className="hidden min-h-0 border-l border-line lg:block">{cartPanel}</aside>
      </div>

      {/* Portrait: bottom bar opens the bill */}
      <div className="pb-safe fixed inset-x-0 bottom-0 z-40 border-t border-line bg-white px-4 pt-3 lg:hidden">
        <div className="mb-3 flex gap-3">
          <button onClick={() => setSheet("cart")} className="flex h-16 flex-1 items-center justify-between rounded-2xl bg-paper px-5 ring-1 ring-line active:bg-ink-faint">
            <span className="text-left">
              <span className="block text-sm text-muted">ບິນປັດຈຸບັນ</span>
              <span className="num block font-semibold">{count} ລາຍການ</span>
            </span>
            <ChevronRight className="size-5 text-muted" />
          </button>
          <button
            onClick={() => { setPayError(""); setSheet("pay"); }}
            disabled={!lines.length}
            className="flex h-16 flex-[1.4] items-center justify-between rounded-2xl bg-marigold px-5 text-ink shadow-[inset_0_-3px_0_var(--color-marigold-deep)] disabled:bg-line disabled:text-muted disabled:shadow-none"
          >
            <span className="text-lg font-semibold">ຊຳລະ</span>
            <span className="num text-xl font-bold">{fmt(totals.total)} ₭</span>
          </button>
        </div>
      </div>

      {/* ---------- Sheets ---------- */}
      <Sheet open={sheet === "cart"} onClose={() => setSheet("")} side="right" width="max-w-md">
        {cartPanel}
      </Sheet>
      <Sheet open={sheet === "menu"} onClose={() => setSheet("")} title={user.name} width="max-w-sm">
        <div className="grid gap-2 p-4">
          <p className="px-1 pb-1 text-sm text-muted">
            ເປີດກະເວລາ <span className="num">{fmtTime(shift.openedAt)}</span>
          </p>
          {user.role === "owner" && (
            <button onClick={() => router.push("/dashboard/")} className="flex h-14 items-center gap-3 rounded-2xl bg-white px-4 text-lg ring-1 ring-line active:bg-ink-faint">
              <LayoutDashboard className="size-6" /> ໜ້າຜູ້ຈັດການ
            </button>
          )}
          <button onClick={() => { setSheet(""); setLocked(true); }} className="flex h-14 items-center gap-3 rounded-2xl bg-white px-4 text-lg ring-1 ring-line active:bg-ink-faint">
            <Lock className="size-6" /> ລັອກໜ້າຈໍ
          </button>
          <button onClick={() => setSheet("close")} disabled={lines.length > 0} className="flex h-14 items-center gap-3 rounded-2xl bg-white px-4 text-lg ring-1 ring-line active:bg-ink-faint disabled:opacity-40">
            <Wallet className="size-6" /> ນັບເງິນ ແລະ ປິດກະ
          </button>
          {lines.length > 0 && <p className="px-1 text-sm text-muted">ມີລາຍການຄ້າງໃນບິນ — ຂາຍ ຫຼື ລ້າງບິນກ່ອນປິດກະ</p>}
          <button onClick={logout} className="flex h-14 items-center gap-3 rounded-2xl bg-white px-4 text-lg text-chili ring-1 ring-line active:bg-chili-faint">
            <LogOut className="size-6" /> ອອກຈາກລະບົບ (ກະຍັງເປີດ)
          </button>
        </div>
      </Sheet>
      <CloseShiftSheet open={sheet === "close"} shift={shift} by={user} shopName={settings.shop.name} onClose={() => setSheet("")} onDone={logout} />
      <PaymentSheet open={sheet === "pay"} total={totals.total} settings={settings} busy={busy} error={payError} onClose={() => setSheet("")} onConfirm={pay} />
      <DiscountSheet open={sheet === "discount"} subtotal={totals.subtotal} current={discount} onClose={() => setSheet("")} onSave={setDiscount} />
      <QtySheet
        open={!!qtyLine}
        name={qtyLine ? `${qtyLine.product.name}${qtyLine.variant ? ` (${qtyLine.variant})` : ""}` : ""}
        qty={qtyLine?.qty ?? 0}
        onClose={() => setQtyFor(null)}
        onSave={(n) => qtyFor && setQty(qtyFor, n)}
      />
      <VariantSheet product={pick} onClose={() => setPick(null)} onPick={(v) => pick && add(pick.id, v)} />
      {done && <SaleDone r={done} settings={settings} onNext={() => setDone(null)} />}
    </div>
  );
}
