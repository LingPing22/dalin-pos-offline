"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { Lock } from "lucide-react";
import { PinEntry } from "@/components/ui/PinEntry";
import { applyKey } from "@/components/ui/Numpad";
import { login } from "@/lib/store";
import { clearSession, setLocked, type Session } from "@/lib/session";

/**
 * Covers the screen after it was idle (or locked from the menu). Drawn on top of the
 * page instead of navigating away, so a bill that was being rung up is still there.
 */
export function LockScreen({ session, onUnlock }: { session: Session; onUnlock: () => void }) {
  const router = useRouter();
  const [pin, setPin] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  function signOut() {
    clearSession();
    router.replace("/login/");
  }

  async function submit() {
    if (pin.length < 4 || busy) return;
    setBusy(true);
    setError("");
    try {
      const r = await login(session.uid, pin);
      // Still on a factory/easy PIN (logged in before PINs had to be changed): go set a new one
      if (r.mustChangePin) return signOut();
      setLocked(false);
      onUnlock();
    } catch (e) {
      setPin("");
      setError((e as Error).message || "PIN ບໍ່ຖືກຕ້ອງ");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="pt-safe pb-safe fixed inset-0 z-[60] flex items-center justify-center overflow-y-auto bg-paper px-6" role="dialog" aria-modal="true" aria-label="ໜ້າຈໍຖືກລັອກ">
      <div className="w-full max-w-sm py-8">
        <div className="mx-auto grid size-16 place-items-center rounded-2xl bg-ink text-marigold">
          <Lock className="size-8" strokeWidth={2} />
        </div>
        <h1 className="mt-4 text-center text-2xl font-semibold">ໜ້າຈໍຖືກລັອກ</h1>
        <p className="mt-1 text-center text-muted">{session.name} — ໃສ່ PIN ເພື່ອປົດລັອກ</p>
        <PinEntry
          pin={pin}
          error={error}
          busy={busy}
          onKey={(k) => {
            setError("");
            setPin((v) => applyKey(v, k, 6));
          }}
          onSubmit={submit}
        />
        <button onClick={signOut} className="mt-6 h-12 w-full rounded-xl font-medium text-ink-soft underline-offset-4 active:underline">
          ປ່ຽນຜູ້ໃຊ້ / ອອກຈາກລະບົບ
        </button>
      </div>
    </div>
  );
}
