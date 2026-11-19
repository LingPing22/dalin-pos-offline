"use client";
import { Sheet } from "@/components/ui/Sheet";
import { fmt } from "@/lib/money";
import { VARIANT_ICON, type PosProduct } from "@/lib/types";
import { variantStyle } from "@/components/VariantTag";

/** Tapping a product that comes hot / iced / blended: one tap picks and adds it. */
export function VariantSheet({ product, onClose, onPick }: { product: PosProduct | null; onClose: () => void; onPick: (variant: string) => void }) {
  return (
    <Sheet open={!!product} onClose={onClose} title={product?.name} width="max-w-lg">
      {product?.variants && (
        <div className="grid gap-3 p-5" style={{ gridTemplateColumns: `repeat(${product.variants.length}, minmax(0, 1fr))` }}>
          {product.variants.map((v) => (
            <button
              key={v.name}
              onClick={() => {
                onPick(v.name);
                onClose();
              }}
              className={`flex flex-col items-center gap-1 rounded-2xl px-2 py-5 ring-2 transition active:scale-[0.97] ${variantStyle(v.name).soft} ${variantStyle(v.name).ring}`}
            >
              <span className="text-4xl" aria-hidden>{VARIANT_ICON[v.name] ?? "🥤"}</span>
              <span className="text-xl font-semibold">{v.name}</span>
              <span className="num text-lg text-ink">{fmt(v.price)} ₭</span>
            </button>
          ))}
        </div>
      )}
    </Sheet>
  );
}
