"use client";
import { Check } from "lucide-react";
import { Numpad } from "./Numpad";

/** PIN dots + error line + numpad, used by login and the lock screen */
export function PinEntry({ pin, error, busy, onKey, onSubmit }: { pin: string; error: string; busy: boolean; onKey: (k: string) => void; onSubmit: () => void }) {
  return (
    <>
      <div className="my-7 flex justify-center gap-4" aria-live="polite">
        {Array.from({ length: Math.max(4, pin.length) }, (_, i) => (
          <span key={i} className={`size-4 rounded-full transition ${i < pin.length ? "bg-ink" : "bg-line"} ${error ? "bg-chili!" : ""}`} />
        ))}
      </div>
      <p className="mb-4 min-h-6 text-center text-chili">{error}</p>
      <Numpad onKey={onKey} extra="C" confirm={<Check className="mx-auto size-7" />} confirmDisabled={pin.length < 4 || busy} onConfirm={onSubmit} />
    </>
  );
}
