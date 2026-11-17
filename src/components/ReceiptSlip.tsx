import { fmt } from "@/lib/money";
import { fmtDateTime } from "@/lib/time";
import { METHOD_LABEL, type ReceiptData, type ShopSettings } from "@/lib/types";

/**
 * Screen + print version of the receipt. Printable width follows the
 * printer setting (58 mm paper ≈ 48 mm print, 80 mm paper ≈ 72 mm print).
 */
export function ReceiptSlip({ r, s, className = "" }: { r: ReceiptData; s: ShopSettings; className?: string }) {
  const printW = s.receipt.width === 58 ? "48mm" : "72mm";
  const Row = ({ l, v, strong }: { l: React.ReactNode; v: React.ReactNode; strong?: boolean }) => (
    <div className={`flex justify-between gap-3 ${strong ? "font-bold" : ""}`}>
      <span>{l}</span>
      <span className="num text-right">{v}</span>
    </div>
  );
  return (
    <div
      className={`print-area relative bg-white px-5 pb-8 pt-6 text-[13px] leading-relaxed text-black ${className}`}
      style={{ ["--print-w" as string]: printW }}
    >
      <style>{`@media print { @page { size: ${s.receipt.width}mm auto; margin: 0; } .print-area { width: ${printW} !important; padding: 2mm 0 !important; font-size: 11px !important; } }`}</style>
      {r.status === "void" && (
        <div className="pointer-events-none absolute inset-0 grid place-items-center">
          <span className="-rotate-12 rounded-md border-4 border-chili px-4 py-1 text-2xl font-bold text-chili opacity-80">ຍົກເລີກ</span>
        </div>
      )}
      <div className="text-center">
        <p className="text-base font-bold">{s.shop.name}</p>
        {s.shop.address && <p className="text-[11px]">{s.shop.address}</p>}
        {s.shop.phone && <p className="text-[11px]">ໂທ {s.shop.phone}</p>}
        {s.shop.taxId && <p className="text-[11px]">ເລກປະຈຳຕົວຜູ້ເສຍອາກອນ {s.shop.taxId}</p>}
      </div>
      <hr className="my-2 border-dashed border-black/60" />
      <Row l="ເລກບິນ" v={r.pending ? "ລໍຖ້າສົ່ງ" : r.billNo} />
      <Row l="ວັນທີ" v={fmtDateTime(r.createdAt)} />
      {r.cashierName && <Row l="ພະນັກງານ" v={r.cashierName} />}
      <hr className="my-2 border-dashed border-black/60" />
      {r.items.map((it, i) => (
        <div key={i} className="mb-1">
          <p className="font-semibold">{it.name}</p>
          <Row l={<span className="num pl-3">{it.qty} × {fmt(it.price)}</span>} v={fmt(it.lineTotal)} />
        </div>
      ))}
      <hr className="my-2 border-dashed border-black/60" />
      <Row l="ລວມ" v={fmt(r.subtotal)} />
      {r.discount > 0 && <Row l="ສ່ວນຫຼຸດ" v={`-${fmt(r.discount)}`} />}
      {r.tax > 0 && !r.taxInclusive && <Row l={`VAT ${r.taxRate}%`} v={fmt(r.tax)} />}
      <div className="mt-1 flex items-baseline justify-between text-lg font-bold">
        <span>ຍອດຊຳລະ</span>
        <span className="num">{fmt(r.total)} ₭</span>
      </div>
      {r.tax > 0 && r.taxInclusive && (
        <p className="text-[11px]">
          ລວມ VAT {r.taxRate}% = <span className="num">{fmt(r.tax)}</span> ແລ້ວ
        </p>
      )}
      <div className="mt-2">
        <Row l={METHOD_LABEL[r.paymentMethod]} v={fmt(r.received)} />
        {r.paymentMethod === "cash" && <Row l="ເງິນທອນ" v={fmt(r.change)} strong />}
        {r.paymentRef && <Row l="ອ້າງອີງ" v={r.paymentRef} />}
      </div>
      <hr className="my-2 border-dashed border-black/60" />
      {s.shop.footer && <p className="text-center">{s.shop.footer}</p>}
    </div>
  );
}
