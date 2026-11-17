"use client";
import { useEffect } from "react";
import { X } from "lucide-react";

type Props = {
  open: boolean;
  onClose: () => void;
  title?: React.ReactNode;
  children: React.ReactNode;
  /** "center" dialog (default) or "right" side panel */
  side?: "center" | "right";
  width?: string;
  dismissable?: boolean;
};

export function Sheet({ open, onClose, title, children, side = "center", width = "max-w-lg", dismissable = true }: Props) {
  useEffect(() => {
    if (!open) return;
    const onEsc = (e: KeyboardEvent) => e.key === "Escape" && dismissable && onClose();
    window.addEventListener("keydown", onEsc);
    return () => window.removeEventListener("keydown", onEsc);
  }, [open, onClose, dismissable]);
  if (!open) return null;
  return (
    <div className="fixed inset-0 z-50 flex bg-ink/45" onPointerDown={(e) => e.target === e.currentTarget && dismissable && onClose()} role="dialog" aria-modal="true">
      <div
        className={
          side === "right"
            ? `pt-safe pb-safe ml-auto flex h-full w-full ${width} flex-col bg-paper shadow-2xl animate-sheet`
            : `m-auto flex max-h-[92dvh] w-[calc(100%-2rem)] ${width} flex-col overflow-hidden rounded-3xl bg-paper shadow-2xl animate-sheet`
        }
      >
        {title !== undefined && (
          <div className="flex items-center justify-between gap-4 border-b border-line bg-white px-6 py-4">
            <div className="text-xl font-semibold">{title}</div>
            {dismissable && (
              <button onClick={onClose} aria-label="ປິດ" className="-mr-2 grid size-11 place-items-center rounded-full text-muted active:bg-ink-faint">
                <X className="size-6" />
              </button>
            )}
          </div>
        )}
        <div className="scroll-touch min-h-0 flex-1 overflow-y-auto">{children}</div>
      </div>
    </div>
  );
}
