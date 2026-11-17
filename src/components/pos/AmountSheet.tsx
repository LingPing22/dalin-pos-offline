"use client";
import { useEffect, useState } from "react";
import { Sheet } from "@/components/ui/Sheet";
import { Numpad, applyKey } from "@/components/ui/Numpad";
import { fmt } from "@/lib/money";

/** Edit a line quantity */
export function QtySheet({ open, name, qty, onClose, onSave }: { open: boolean; name: string; qty: number; onClose: () => void; onSave: (q: number) => void }) {
  const [v, setV] = useState("");
  useEffect(() => {
    if (open) setV("");
  }, [open]);
  const value = v === "" ? qty : Number(v);
  return (
    <Sheet open={open} onClose={onClose} title={name} width="max-w-sm">
      <div className="p-6">
        <p className="text-muted">ຈຳນວນ</p>
        <p className={`num mb-5 text-5xl font-semibold ${v === "" ? "text-muted/60" : ""}`}>{value}</p>
        <Numpad
          onKey={(k) => setV((x) => applyKey(x, k, 4))}
          extra="C"
          confirm="ຕົກລົງ"
          onConfirm={() => {
            onSave(value);
            onClose();
          }}
        />
      </div>
    </Sheet>
  );
}

/** Bill discount: by amount (₭) or percent */
export function DiscountSheet({ open, subtotal, current, onClose, onSave }: { open: boolean; subtotal: number; current: number; onClose: () => void; onSave: (amount: number) => void }) {
  const [mode, setMode] = useState<"kip" | "pct">("kip");
  const [v, setV] = useState("");
  useEffect(() => {
    if (open) setV("");
  }, [open]);
  const n = Number(v || 0);
  const amount = Math.min(subtotal, mode === "kip" ? n : Math.round((subtotal * Math.min(n, 100)) / 100 / 500) * 500);
  return (
    <Sheet open={open} onClose={onClose} title="ສ່ວນຫຼຸດທັງບິນ" width="max-w-md">
      <div className="p-6">
        <div className="mb-5 grid grid-cols-2 rounded-2xl bg-white p-1 ring-1 ring-line">
          {(["kip", "pct"] as const).map((m) => (
            <button
              key={m}
              onClick={() => { setMode(m); setV(""); }}
              className={`h-12 rounded-xl text-lg font-medium ${mode === m ? "bg-ink text-white" : "text-muted"}`}
            >
              {m === "kip" ? "ເປັນເງິນ ₭" : "ເປັນ %"}
            </button>
          ))}
        </div>
        <div className="mb-5 flex items-end justify-between">
          <p className="num text-5xl font-semibold">
            {v === "" ? <span className="text-muted/50">0</span> : mode === "kip" ? fmt(n) : n}
            <span className="ml-2 text-2xl text-muted">{mode === "kip" ? "₭" : "%"}</span>
          </p>
          {mode === "pct" && n > 0 && <p className="num text-lg text-muted">= {fmt(amount)} ₭</p>}
        </div>
        <Numpad onKey={(k) => setV((x) => applyKey(x, k, mode === "kip" ? 9 : 3))} extra={mode === "kip" ? "00" : "C"} />
        <div className="mt-5 grid grid-cols-2 gap-3">
          <button
            onClick={() => { onSave(0); onClose(); }}
            disabled={!current}
            className="h-14 rounded-2xl bg-white text-lg font-medium text-chili ring-1 ring-line disabled:opacity-40"
          >
            ລົບສ່ວນຫຼຸດ
          </button>
          <button
            onClick={() => { onSave(amount); onClose(); }}
            disabled={amount <= 0}
            className="h-14 rounded-2xl bg-ink text-lg font-semibold text-white disabled:opacity-40"
          >
            ໃຊ້ສ່ວນຫຼຸດ
          </button>
        </div>
      </div>
    </Sheet>
  );
}
