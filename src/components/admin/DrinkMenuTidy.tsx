"use client";
import { useEffect, useState } from "react";
import { ArrowRight, Sparkles } from "lucide-react";
import { Sheet } from "@/components/ui/Sheet";
import { btnPrimary } from "@/components/ui/form";
import { VariantTag } from "@/components/VariantTag";
import { tw } from "@/lib/tw";
import { fmt } from "@/lib/money";
import { applyDrinkMenu, previewDrinkMenu } from "@/lib/store";
import type { DrinkChange } from "@/lib/drink-menu";

/**
 * Offers to give drinks their hot / iced / blended prices. Shows every change first and only
 * saves when the owner confirms; disappears once there is nothing left to tidy.
 */
export function DrinkMenuTidy({ products, onDone }: { products: unknown; onDone: () => Promise<void> | void }) {
  const [changes, setChanges] = useState<DrinkChange[]>([]);
  const [open, setOpen] = useState(false);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState("");

  useEffect(() => {
    previewDrinkMenu().then(setChanges).catch(() => setChanges([]));
  }, [products]);

  async function confirm() {
    setBusy(true);
    setErr("");
    try {
      await applyDrinkMenu();
      setOpen(false);
      await onDone();
    } catch (e) {
      setErr((e as Error).message || "ບໍ່ສຳເລັດ");
    } finally {
      setBusy(false);
    }
  }

  if (!changes.length) return null;
  return (
    <>
      <div className="mb-4 flex flex-wrap items-center gap-3 rounded-2xl bg-ice-faint px-5 py-4 ring-1 ring-ice/30">
        <Sparkles className="size-6 shrink-0 text-ice" />
        <p className="min-w-0 flex-1">
          <span className="block font-semibold">ມີເຄື່ອງດື່ມ {fmt(changes.length)} ລາຍການ ທີ່ຄວນແຍກ ຮ້ອນ / ເຢັນ / ປັ່ນ</span>
          <span className="block text-sm text-muted">ເຊັ່ນ ລາເຕ້ ຂາຍໄດ້ທັງຮ້ອນ ເຢັນ ແລະ ປັ່ນ — ເບິ່ງກ່ອນ ແລ້ວຈຶ່ງຢືນຢັນ</span>
        </p>
        <button onClick={() => setOpen(true)} className={tw(btnPrimary, "bg-ice active:bg-ice")}>
          ເບິ່ງ ແລະ ຈັດໃຫ້
        </button>
      </div>

      <Sheet open={open} onClose={() => !busy && setOpen(false)} title="ຈັດເມນູເຄື່ອງດື່ມ" width="max-w-xl" dismissable={!busy}>
        <div className="grid gap-4 p-5">
          <ul className="grid gap-2">
            {changes.map((c) => (
              <li key={c.id} className="rounded-2xl bg-white px-4 py-3 ring-1 ring-line">
                <div className="flex flex-wrap items-center gap-x-2 gap-y-1 text-sm text-muted">
                  {c.before.map((b, i) => (
                    <span key={i} className="line-through decoration-muted/60">
                      {b.name} <span className="num">{fmt(b.price)}</span>
                    </span>
                  ))}
                  <ArrowRight className="size-4" />
                  {c.remove.length > 0 && <span className="rounded-md bg-ink-faint px-1.5 text-xs text-ink">ລວມເປັນອັນດຽວ</span>}
                </div>
                <p className="mt-1 text-lg font-semibold">{c.name}</p>
                <div className="mt-1.5 flex flex-wrap gap-2">
                  {c.variants.map((v) => (
                    <span key={v.name} className="inline-flex items-center gap-1.5">
                      <VariantTag name={v.name} className="text-sm" />
                      <span className="num font-medium">{fmt(v.price)} ₭</span>
                    </span>
                  ))}
                </div>
              </li>
            ))}
          </ul>
          <p className="text-sm text-muted">
            ລາຄາແບບໃໝ່ຄິດຈາກລາຄາທີ່ຂາຍຢູ່ຕອນນີ້ (ຮ້ອນ −5,000 · ປັ່ນ +5,000) — ແກ້ໄດ້ທຸກເວລາໃນໜ້າສິນຄ້າ. ບິນ ແລະ ລາຍງານເກົ່າບໍ່ປ່ຽນ.
          </p>
          {err && <p className="text-chili">{err}</p>}
          <button onClick={confirm} disabled={busy} className={tw(btnPrimary, "h-14 text-lg")}>
            ຢືນຢັນ ປ່ຽນ {fmt(changes.length)} ລາຍການ
          </button>
        </div>
      </Sheet>
    </>
  );
}
