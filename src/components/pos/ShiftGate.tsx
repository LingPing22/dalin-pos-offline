"use client";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Banknote, Share2, TriangleAlert } from "lucide-react";
import { Sheet } from "@/components/ui/Sheet";
import { Numpad, applyKey } from "@/components/ui/Numpad";
import { ShiftReport, shiftText } from "@/components/ShiftReport";
import { closeShift, lastClosedShift, openShift, shiftSummary } from "@/lib/store";
import { clearSession, type Session } from "@/lib/session";
import type { Shift, ShiftSummary } from "@/lib/db";
import { fmt } from "@/lib/money";
import { fmtDate, fmtTime } from "@/lib/time";

/** Big number + numpad for typing an amount of kip */
function CashInput({ value, onChange }: { value: string; onChange: (v: string) => void }) {
  return (
    <>
      <p className="num mb-5 text-5xl font-semibold">
        {value === "" ? <span className="text-muted/50">0</span> : fmt(Number(value))}
        <span className="ml-2 text-2xl text-muted">₭</span>
      </p>
      <Numpad onKey={(k) => onChange(applyKey(value, k, 10))} />
    </>
  );
}

/**
 * Shown instead of the till when no shift is open for this user: start one by counting the
 * float, or, if someone else left theirs open, count the drawer and close it first.
 */
export function ShiftGate({
  user,
  open,
  shopName,
  onReady,
  onChanged,
}: {
  user: Session;
  open: Shift | null;
  shopName: string;
  onReady: (s: Shift) => void;
  /** Someone else's shift was closed here: reload the drawer state */
  onChanged: () => void;
}) {
  const router = useRouter();
  const [cash, setCash] = useState("");
  const [hint, setHint] = useState<number | null>(null);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState("");
  const [closing, setClosing] = useState(false);
  const foreign = open && open.userId !== user.uid ? open : null;

  useEffect(() => {
    lastClosedShift().then((s) => setHint(s?.countedCash ?? null));
  }, [foreign]);

  async function start() {
    setBusy(true);
    setErr("");
    try {
      onReady(await openShift(user, Number(cash || 0)));
    } catch (e) {
      setErr((e as Error).message);
    } finally {
      setBusy(false);
    }
  }

  function logout() {
    clearSession();
    router.replace("/login/");
  }

  return (
    <main className="pt-safe pb-safe flex min-h-dvh items-center justify-center bg-paper px-6 py-10">
      <div className="w-full max-w-md">
        {foreign ? (
          <>
            <div className="mx-auto grid size-14 place-items-center rounded-2xl bg-marigold-faint text-marigold-deep ring-1 ring-marigold">
              <TriangleAlert className="size-7" />
            </div>
            <h1 className="mt-4 text-center text-2xl font-semibold">ກະຂອງ {foreign.userName} ຍັງເປີດຢູ່</h1>
            <p className="mt-2 text-center text-muted">
              ເປີດຕັ້ງແຕ່ <span className="num">{fmtDate(foreign.openedAt)} {fmtTime(foreign.openedAt)}</span>. ລິ້ນຊັກມີອັນດຽວ ຈຶ່ງຕ້ອງນັບເງິນ ແລະ ປິດກະນີ້ກ່ອນ ຈຶ່ງເປີດກະຂອງທ່ານໄດ້. ລະບົບຈະບັນທຶກວ່າທ່ານເປັນຜູ້ປິດ.
            </p>
            <button onClick={() => setClosing(true)} className="mt-6 h-14 w-full rounded-2xl bg-ink text-lg font-semibold text-white active:bg-ink-soft">
              ນັບເງິນ ແລະ ປິດກະຂອງ {foreign.userName}
            </button>
            <CloseShiftSheet open={closing} shift={foreign} by={user} shopName={shopName} onClose={() => setClosing(false)} onDone={onChanged} doneLabel="ເປີດກະຂອງຂ້ອຍ" />
          </>
        ) : (
          <>
            <div className="mx-auto grid size-14 place-items-center rounded-2xl bg-ink text-marigold">
              <Banknote className="size-7" />
            </div>
            <h1 className="mt-4 text-center text-2xl font-semibold">ເປີດກະ — {user.name}</h1>
            <p className="mt-1 text-center text-muted">ນັບເງິນທອນໃນລິ້ນຊັກກ່ອນເລີ່ມຂາຍ</p>
            {hint !== null && (
              <button onClick={() => setCash(String(hint))} className="mx-auto mt-3 block rounded-xl bg-white px-4 py-2 text-sm ring-1 ring-line active:bg-ink-faint">
                ກະກ່ອນນັບໄດ້ <span className="num font-semibold">{fmt(hint)} ₭</span> — ແຕະເພື່ອໃຊ້
              </button>
            )}
            <div className="mt-6">
              <CashInput value={cash} onChange={setCash} />
            </div>
            {err && <p className="mt-3 text-center text-chili">{err}</p>}
            <button onClick={start} disabled={busy} className="mt-5 h-14 w-full rounded-2xl bg-marigold text-lg font-semibold text-ink shadow-[inset_0_-3px_0_var(--color-marigold-deep)] disabled:opacity-40">
              ເປີດກະ ແລະ ເລີ່ມຂາຍ
            </button>
          </>
        )}
        {user.role === "owner" && (
          <button onClick={() => router.push("/dashboard/")} className="mt-4 h-12 w-full rounded-xl bg-white font-medium ring-1 ring-line active:bg-ink-faint">
            ໄປໜ້າຜູ້ຈັດການ (ບໍ່ເປີດກະ)
          </button>
        )}
        <button onClick={logout} className="mt-2 h-12 w-full rounded-xl font-medium text-ink-soft underline-offset-4 active:underline">
          ອອກຈາກລະບົບ
        </button>
      </div>
    </main>
  );
}

/**
 * Blind count: the cashier types what is in the drawer before seeing what it should be,
 * then gets the shift summary to send to the owner.
 */
export function CloseShiftSheet({
  open,
  shift,
  by,
  shopName,
  onClose,
  onDone,
  doneLabel = "ອອກຈາກລະບົບ",
}: {
  open: boolean;
  shift: Shift;
  by: Session;
  shopName: string;
  onClose: () => void;
  onDone: () => void;
  doneLabel?: string;
}) {
  const [cash, setCash] = useState("");
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState("");
  const [result, setResult] = useState<{ shift: Shift; summary: ShiftSummary } | null>(null);
  const [shared, setShared] = useState("");

  useEffect(() => {
    if (open) {
      setCash("");
      setErr("");
      setResult(null);
      setShared("");
    }
  }, [open]);

  async function confirm() {
    setBusy(true);
    setErr("");
    try {
      const closed = await closeShift(shift.id, Number(cash || 0), by);
      setResult({ shift: closed, summary: await shiftSummary(closed) });
    } catch (e) {
      setErr((e as Error).message);
    } finally {
      setBusy(false);
    }
  }

  async function share() {
    if (!result) return;
    const text = shiftText(result.shift, result.summary, shopName);
    try {
      if (navigator.share) await navigator.share({ text });
      else {
        await navigator.clipboard.writeText(text);
        setShared("ຄັດລອກແລ້ວ — ວາງໃນ LINE ໄດ້ເລີຍ");
      }
    } catch {
      /* share sheet cancelled */
    }
  }

  return (
    <Sheet open={open} onClose={onClose} title={result ? "ສະຫຼຸບກະ" : "ປິດກະ"} width="max-w-md" dismissable={!busy && !result}>
      {result ? (
        <div className="grid gap-4 p-5">
          <ShiftReport shift={result.shift} summary={result.summary} />
          <button onClick={share} className="flex h-12 items-center justify-center gap-2 rounded-xl bg-white font-medium ring-1 ring-line active:bg-ink-faint">
            <Share2 className="size-5" /> ສົ່ງສະຫຼຸບໃຫ້ເຈົ້າຂອງຮ້ານ
          </button>
          {shared && <p className="text-center text-sm text-leaf">{shared}</p>}
          <button onClick={onDone} className="h-14 rounded-2xl bg-ink text-lg font-semibold text-white active:bg-ink-soft">
            {doneLabel}
          </button>
        </div>
      ) : (
        <div className="p-6">
          <p className="font-medium">ນັບເງິນສົດທັງໝົດໃນລິ້ນຊັກ</p>
          <p className="mb-4 text-sm text-muted">ລວມເງິນທອນຕັ້ງຕົ້ນດ້ວຍ. ນັບໃຫ້ຄົບກ່ອນ ແລ້ວຈຶ່ງໃສ່ຕົວເລກ — ລະບົບຈະສະແດງວ່າຂາດ ຫຼື ເກີນ ຫຼັງຈາກນີ້.</p>
          <CashInput value={cash} onChange={setCash} />
          {err && <p className="mt-3 text-chili">{err}</p>}
          <button onClick={confirm} disabled={busy || cash === ""} className="mt-5 h-14 w-full rounded-2xl bg-ink text-lg font-semibold text-white active:bg-ink-soft disabled:opacity-40">
            ຢືນຢັນຍອດນັບ ແລະ ປິດກະ
          </button>
        </div>
      )}
    </Sheet>
  );
}
