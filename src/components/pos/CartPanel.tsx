"use client";
import { useEffect, useState } from "react";
import { Minus, Plus, Trash2, Tag } from "lucide-react";
import { fmt } from "@/lib/money";
import type { PricingResult } from "@/lib/pricing";
import type { PosProduct, ShopSettings } from "@/lib/types";
import { VariantTag } from "@/components/VariantTag";

/** key = product id + variant, so hot and iced coffee are separate lines; type = hot / iced / blended for the colour tag */
export type Line = { key: string; product: PosProduct; variant: string | null; type: string | null; price: number; qty: number };

type Props = {
  lines: Line[];
  totals: PricingResult;
  settings: ShopSettings;
  onInc: (key: string) => void;
  onDec: (key: string) => void;
  onQty: (key: string) => void;
  onClear: () => void;
  onDiscount: () => void;
  onPay: () => void;
};

export function CartPanel({ lines, totals, settings, onInc, onDec, onQty, onClear, onDiscount, onPay }: Props) {
  const [armed, setArmed] = useState(false);
  useEffect(() => {
    if (!armed) return;
    const t = setTimeout(() => setArmed(false), 3000);
    return () => clearTimeout(t);
  }, [armed]);
  const count = lines.reduce((s, l) => s + l.qty, 0);

  return (
    <div className="flex h-full min-h-0 flex-col bg-white">
      <div className="flex h-16 shrink-0 items-center justify-between border-b border-line px-5">
        <p className="text-lg font-semibold">
          ບິນປັດຈຸບັນ {count > 0 && <span className="num font-normal text-muted">({count})</span>}
        </p>
        {lines.length > 0 && (
          <button
            onClick={() => (armed ? (onClear(), setArmed(false)) : setArmed(true))}
            className={`h-10 rounded-full px-4 text-sm font-medium transition ${armed ? "bg-chili text-white" : "text-chili active:bg-chili-faint"}`}
          >
            {armed ? "ແຕະອີກເທື່ອເພື່ອລ້າງ" : "ລ້າງບິນ"}
          </button>
        )}
      </div>

      <div className="scroll-touch min-h-0 flex-1 overflow-y-auto">
        {lines.length === 0 ? (
          <div className="grid h-full place-items-center px-8 text-center text-muted">
            <p>
              ແຕະສິນຄ້າທາງຊ້າຍ
              <br />
              ເພື່ອເພີ່ມໃສ່ບິນ
            </p>
          </div>
        ) : (
          <ul className="divide-y divide-line">
            {lines.map(({ key, product: p, type, price, qty }) => (
              <li key={key} className="flex items-center gap-3 px-5 py-3">
                <div className="min-w-0 flex-1">
                  <p className="flex items-center gap-1.5 font-medium">
                    <span className="truncate">{p.name}</span>
                    {type && <VariantTag name={type} className="shrink-0 text-sm" />}
                  </p>
                  <p className="num text-sm text-muted">
                    {fmt(price)} <span className="text-ink">= {fmt(price * qty)}</span>
                  </p>
                </div>
                <div className="flex items-center rounded-full bg-paper ring-1 ring-line">
                  <button
                    onClick={() => onDec(key)}
                    aria-label={qty === 1 ? "ລຶບລາຍການ" : "ຫຼຸດຈຳນວນ"}
                    className={`grid size-11 place-items-center rounded-full ${qty === 1 ? "text-chili" : "text-ink"} active:bg-ink-faint`}
                  >
                    {qty === 1 ? <Trash2 className="size-5" /> : <Minus className="size-5" />}
                  </button>
                  <button onClick={() => onQty(key)} className="num h-11 min-w-10 px-1 text-lg font-semibold" aria-label="ແກ້ຈຳນວນ">
                    {qty}
                  </button>
                  <button onClick={() => onInc(key)} aria-label="ເພີ່ມຈຳນວນ" className="grid size-11 place-items-center rounded-full active:bg-ink-faint">
                    <Plus className="size-5" />
                  </button>
                </div>
              </li>
            ))}
          </ul>
        )}
      </div>

      <div className="pb-safe shrink-0 border-t border-line bg-white px-5 pt-3">
        <dl className="space-y-1.5 text-[15px]">
          <div className="flex justify-between">
            <dt className="text-muted">ລວມ</dt>
            <dd className="num">{fmt(totals.subtotal)}</dd>
          </div>
          <div className="flex items-center justify-between">
            <dt>
              <button onClick={onDiscount} disabled={!lines.length} className="-ml-1 flex h-9 items-center gap-1.5 rounded-lg px-1 text-ink-soft active:bg-ink-faint disabled:opacity-40">
                <Tag className="size-4" />
                {totals.discount ? "ສ່ວນຫຼຸດ" : "ເພີ່ມສ່ວນຫຼຸດ"}
              </button>
            </dt>
            <dd className="num text-chili">{totals.discount ? `-${fmt(totals.discount)}` : ""}</dd>
          </div>
          {settings.tax.enabled && totals.tax > 0 && (
            <div className="flex justify-between text-sm text-muted">
              <dt>{settings.tax.inclusive ? `ລວມ VAT ${settings.tax.rate}% ແລ້ວ` : `VAT ${settings.tax.rate}%`}</dt>
              <dd className="num">{fmt(totals.tax)}</dd>
            </div>
          )}
        </dl>
        <button
          onClick={onPay}
          disabled={!lines.length}
          className="my-4 flex h-18 w-full items-center justify-between rounded-2xl bg-marigold px-6 text-ink shadow-[inset_0_-3px_0_var(--color-marigold-deep)] active:translate-y-px active:shadow-none disabled:bg-line disabled:text-muted disabled:shadow-none"
        >
          <span className="text-xl font-semibold">ຊຳລະເງິນ</span>
          <span className="num text-2xl font-bold">{fmt(totals.total)} ₭</span>
        </button>
      </div>
    </div>
  );
}
