"use client";
import { Delete } from "lucide-react";

type Props = {
  onKey: (k: string) => void;
  /** Bottom-left key: "00" for money, "C" for clear */
  extra?: "00" | "C";
  /** Bottom-right key replaces backspace when set (e.g. confirm) */
  confirm?: React.ReactNode;
  onConfirm?: () => void;
  confirmDisabled?: boolean;
  size?: "md" | "lg";
};

export function Numpad({ onKey, extra = "00", confirm, onConfirm, confirmDisabled, size = "lg" }: Props) {
  const h = size === "lg" ? "h-16" : "h-14";
  const key = `${h} rounded-2xl bg-white text-2xl font-medium text-ink shadow-[0_1px_0_var(--color-line)] ring-1 ring-line active:bg-ink-faint active:scale-[0.97] transition num`;
  const keys = ["1", "2", "3", "4", "5", "6", "7", "8", "9"];
  return (
    <div className="grid grid-cols-3 gap-2.5">
      {keys.map((k) => (
        <button key={k} type="button" className={key} onClick={() => onKey(k)}>
          {k}
        </button>
      ))}
      <button type="button" className={`${key} text-xl`} onClick={() => onKey(extra)}>
        {extra === "C" ? "ລ້າງ" : "00"}
      </button>
      <button type="button" className={key} onClick={() => onKey("0")}>
        0
      </button>
      {confirm ? (
        <button
          type="button"
          disabled={confirmDisabled}
          onClick={onConfirm}
          className={`${h} rounded-2xl bg-ink text-lg font-semibold text-white active:scale-[0.97] transition disabled:opacity-40`}
        >
          {confirm}
        </button>
      ) : (
        <button type="button" aria-label="ລຶບ" className={`${key} grid place-items-center`} onClick={() => onKey("back")}>
          <Delete className="size-7" strokeWidth={1.75} />
        </button>
      )}
    </div>
  );
}

/** Apply a numpad key to a numeric string value */
export function applyKey(value: string, k: string, maxLen = 10): string {
  if (k === "back") return value.slice(0, -1);
  if (k === "C") return "";
  const next = (value === "0" ? "" : value) + k;
  return next.replace(/^0+(?=\d)/, "").slice(0, maxLen);
}
