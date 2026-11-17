"use client";
import { useEffect, useState } from "react";
import { Banknote, CreditCard, Loader2, QrCode } from "lucide-react";
import { Sheet } from "@/components/ui/Sheet";
import { Numpad, applyKey } from "@/components/ui/Numpad";
import { fmt } from "@/lib/money";
import { cashSuggestions } from "@/lib/pricing";
import type { PaymentMethod, ShopSettings } from "@/lib/types";

type Props = {
  open: boolean;
  total: number;
  settings: ShopSettings;
  busy: boolean;
  error: string;
  onClose: () => void;
  onConfirm: (p: { method: PaymentMethod; received: number; ref: string }) => void;
};

const METHODS: { id: PaymentMethod; label: string; Icon: typeof Banknote; tone: string }[] = [
  { id: "cash", label: "ເງິນສົດ", Icon: Banknote, tone: "text-leaf" },
  { id: "qr", label: "ໂອນ QR", Icon: QrCode, tone: "text-qr" },
  { id: "card", label: "ບັດ", Icon: CreditCard, tone: "text-card" },
];

export function PaymentSheet({ open, total, settings, busy, error, onClose, onConfirm }: Props) {
  const [method, setMethod] = useState<PaymentMethod>("cash");
  const [cash, setCash] = useState("");
  const [ref, setRef] = useState("");

  useEffect(() => {
    if (open) {
      setCash("");
      setRef("");
    }
  }, [open]);

  const received = method === "cash" ? Number(cash || 0) : total;
  const change = received - total;
  const ready = method !== "cash" || received >= total;

  const confirmLabel =
    method === "cash" ? (received >= total ? `ຮັບເງິນ, ທອນ ${fmt(change)} ₭` : "ໃສ່ຈຳນວນເງິນທີ່ຮັບ") : method === "qr" ? "ໄດ້ຮັບເງິນໂອນແລ້ວ" : "ບັດຜ່ານແລ້ວ";

  return (
    <Sheet open={open} onClose={onClose} title="ຊຳລະເງິນ" width="max-w-4xl" dismissable={!busy}>
      <div className="grid gap-6 p-6 md:grid-cols-[1fr_1.05fr]">
        {/* Left: what is owed, how it's paid */}
        <div className="flex flex-col">
          <p className="text-muted">ຍອດຕ້ອງຊຳລະ</p>
          <p className="num text-6xl font-bold tracking-tight">
            {fmt(total)}
            <span className="ml-2 text-3xl font-medium text-muted">₭</span>
          </p>

          <div className="mt-6 grid grid-cols-3 gap-2.5" role="radiogroup" aria-label="ວິທີຊຳລະ">
            {METHODS.map(({ id, label, Icon, tone }) => (
              <button
                key={id}
                role="radio"
                aria-checked={method === id}
                onClick={() => setMethod(id)}
                className={`flex h-22 flex-col items-center justify-center gap-1.5 rounded-2xl text-base font-medium transition ${
                  method === id ? "bg-ink text-white" : "bg-white ring-1 ring-line active:bg-ink-faint"
                }`}
              >
                <Icon className={`size-7 ${method === id ? "text-marigold" : tone}`} strokeWidth={1.75} />
                {label}
              </button>
            ))}
          </div>

          {method === "cash" && (
            <div className="mt-6 rounded-2xl bg-white p-5 ring-1 ring-line">
              <div className="flex items-baseline justify-between">
                <span className="text-muted">ຮັບເງິນມາ</span>
                <span className={`num text-3xl font-semibold ${cash ? "" : "text-muted/50"}`}>{fmt(received)}</span>
              </div>
              <div className="mt-3 flex items-baseline justify-between border-t border-dashed border-line pt-3">
                <span className="text-muted">ເງິນທອນ</span>
                <span className={`num text-4xl font-bold ${change >= 0 && cash ? "text-leaf" : "text-muted/50"}`}>
                  {change >= 0 && cash ? fmt(change) : "—"}
                </span>
              </div>
            </div>
          )}

          {method === "card" && (
            <div className="mt-6 rounded-2xl bg-white p-5 ring-1 ring-line">
              <p className="font-medium">ໃຫ້ລູກຄ້າແຕະ ຫຼື ສຽບບັດທີ່ເຄື່ອງຮູດບັດ (EDC) ຈຳນວນ {fmt(total)} ₭</p>
              <p className="mt-1 text-sm text-muted">ເມື່ອເຄື່ອງຂຶ້ນວ່າສຳເລັດ, ໃສ່ເລກອະນຸມັດ (ຖ້າມີ) ແລ້ວກົດຢືນຢັນ</p>
              <p className="mt-4 text-sm text-muted">ເລກອະນຸມັດ / 4 ໂຕທ້າຍບັດ</p>
              <p className="num h-10 text-3xl font-semibold tracking-widest">{ref || <span className="text-muted/40">——</span>}</p>
            </div>
          )}

          {method === "qr" && (
            <p className="mt-6 rounded-2xl bg-white p-5 text-[15px] ring-1 ring-line">
              ໃຫ້ລູກຄ້າສະແກນ QR ແລະ ໂອນ <b className="num">{fmt(total)} ₭</b>. ກວດເບິ່ງແຈ້ງເຕືອນເງິນເຂົ້າໃນແອັບທະນາຄານ ກ່ອນກົດຢືນຢັນ.
            </p>
          )}
        </div>

        {/* Right: input for the chosen method */}
        <div className="flex flex-col">
          {method === "cash" && (
            <>
              <div className="mb-3 grid grid-cols-3 gap-2.5">
                {cashSuggestions(total).map((v, i) => (
                  <button
                    key={v}
                    onClick={() => setCash(String(v))}
                    className={`num h-14 rounded-2xl text-lg font-semibold ring-1 transition active:scale-[0.97] ${
                      Number(cash) === v ? "bg-leaf-faint text-leaf ring-leaf" : "bg-white ring-line"
                    }`}
                  >
                    {i === 0 ? "ພໍດີ" : fmt(v)}
                  </button>
                ))}
              </div>
              <Numpad onKey={(k) => setCash((x) => applyKey(x, k, 9))} />
            </>
          )}
          {method === "qr" && (
            <div className="grid flex-1 place-items-center rounded-2xl bg-white p-5 ring-1 ring-line">
              {settings.qrImage ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={settings.qrImage} alt="QR ຂອງຮ້ານ" className="max-h-80 w-auto rounded-xl" />
              ) : (
                <div className="max-w-xs text-center text-muted">
                  <QrCode className="mx-auto mb-3 size-16 text-line" strokeWidth={1.25} />
                  ຍັງບໍ່ໄດ້ອັບໂຫຼດ QR ຂອງຮ້ານ. ຜູ້ຈັດການເພີ່ມໄດ້ທີ່ ຕັ້ງຄ່າ → QR ຮັບເງິນ.
                </div>
              )}
            </div>
          )}
          {method === "card" && <Numpad onKey={(k) => setRef((x) => applyKey(x, k, 8))} extra="C" />}

          {error && <p className="mt-4 rounded-xl bg-chili-faint px-4 py-3 text-chili">{error}</p>}

          <button
            disabled={!ready || busy}
            onClick={() => onConfirm({ method, received, ref })}
            className="mt-4 flex h-18 items-center justify-center gap-3 rounded-2xl bg-marigold text-xl font-semibold text-ink shadow-[inset_0_-3px_0_var(--color-marigold-deep)] active:translate-y-px active:shadow-none disabled:bg-line disabled:text-muted disabled:shadow-none"
          >
            {busy && <Loader2 className="size-6 animate-spin" />}
            {confirmLabel}
          </button>
        </div>
      </div>
    </Sheet>
  );
}
