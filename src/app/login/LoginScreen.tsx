"use client";
import { useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { ShieldAlert, Store, UserRound } from "lucide-react";
import { applyKey } from "@/components/ui/Numpad";
import { PinEntry } from "@/components/ui/PinEntry";
import { fmtDayLong } from "@/lib/time";
import { changeOwnPin, listUsers, login } from "@/lib/store";
import { isWeakPin } from "@/lib/pin";
import { writeSession, type Session } from "@/lib/session";

type U = { id: number; name: string; role: "owner" | "cashier"; active: boolean };

export function LoginScreen() {
  const router = useRouter();
  const next = useSearchParams().get("next");
  const [users, setUsers] = useState<U[]>([]);
  const [user, setUser] = useState<U | null>(null);
  const [pin, setPin] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const [now, setNow] = useState<Date | null>(null);
  /** Set when the PIN just used is a factory default / too easy: pick a new one before going in */
  const [change, setChange] = useState<{ old: string; first: string } | null>(null);

  useEffect(() => {
    listUsers(true)
      .then((list) => {
        setUsers(list);
        if (list.length === 1) setUser(list[0]);
      })
      .catch((e) => setError(`ເປີດຖານຂໍ້ມູນໃນເຄື່ອງບໍ່ໄດ້ (${(e as Error)?.name ?? ""}: ${(e as Error)?.message ?? e})`));
    setNow(new Date());
    const t = setInterval(() => setNow(new Date()), 30_000);
    return () => clearInterval(t);
  }, []);

  async function submit(p = pin) {
    if (!user || p.length < 4 || busy) return;
    setPin("");
    setError("");
    if (change && !change.first) {
      if (isWeakPin(p)) return setError("PIN ນີ້ເດົາງ່າຍເກີນໄປ — ເລືອກ PIN ອື່ນ");
      if (p === change.old) return setError("PIN ໃໝ່ຕ້ອງບໍ່ຊ້ຳກັບ PIN ເກົ່າ");
      return setChange({ ...change, first: p });
    }
    if (change && p !== change.first) {
      setChange({ ...change, first: "" });
      return setError("PIN ບໍ່ກົງກັນ — ຕັ້ງໃໝ່ອີກຄັ້ງ");
    }
    setBusy(true);
    let session: Session;
    try {
      if (change) session = await changeOwnPin(user.id, change.old, p);
      else {
        const r = await login(user.id, p);
        if (r.mustChangePin) {
          setBusy(false);
          return setChange({ old: p, first: "" });
        }
        session = r.session;
      }
    } catch (e) {
      setBusy(false);
      setError((e as Error).message || "ເຂົ້າສູ່ລະບົບບໍ່ສຳເລັດ");
      return;
    }
    writeSession(session);
    setBusy(false);
    router.replace(next && next.startsWith("/") ? next : "/pos/");
  }

  function onKey(k: string) {
    setError("");
    setPin((v) => applyKey(v, k, 6));
  }

  return (
    <main className="grid min-h-dvh lg:grid-cols-[minmax(320px,0.9fr)_1.1fr]">
      <section className="relative flex flex-col justify-between bg-ink px-10 pb-10 pt-[max(2.5rem,env(safe-area-inset-top))] text-white max-lg:min-h-64">
        <div className="flex items-center gap-3">
          <div className="grid size-11 place-items-center rounded-xl bg-marigold text-ink">
            <Store className="size-6" strokeWidth={2} />
          </div>
          <span className="text-lg font-semibold">Dalin POS</span>
        </div>
        <div>
          <p className="num text-7xl font-light leading-none tracking-tight">
            {now?.toLocaleTimeString("en-GB", { hour: "2-digit", minute: "2-digit", timeZone: "Asia/Vientiane" }) ?? " "}
          </p>
          <p className="mt-3 text-lg text-white/70">
            {now ? fmtDayLong(now.getTime()) : ""}
          </p>
        </div>
      </section>

      <section className="flex items-center justify-center px-6 py-10">
        <div className="w-full max-w-sm">
          {!user ? (
            <>
              <h1 className="text-2xl font-semibold">ໃຜກຳລັງເຂົ້າກະ?</h1>
              <p className="mt-1 text-muted">ແຕະຊື່ຂອງທ່ານ</p>
              <div className="mt-6 grid gap-3">
                {users.map((u) => (
                  <button
                    key={u.id}
                    onClick={() => setUser(u)}
                    className="flex h-18 items-center gap-4 rounded-2xl bg-white px-5 text-left ring-1 ring-line active:bg-ink-faint"
                  >
                    <span className="grid size-11 place-items-center rounded-full bg-ink-faint text-ink">
                      <UserRound className="size-6" />
                    </span>
                    <span>
                      <span className="block text-lg font-semibold">{u.name}</span>
                      <span className="block text-sm text-muted">{u.role === "owner" ? "ຜູ້ຈັດການ" : "ພະນັກງານຂາຍ"}</span>
                    </span>
                  </button>
                ))}
              </div>
              {error && <p className="mt-4 text-chili">{error}</p>}
            </>
          ) : (
            <>
              <button onClick={() => { setUser(null); setPin(""); setError(""); setChange(null); }} className="text-muted underline-offset-4 active:underline">
                ປ່ຽນຜູ້ໃຊ້
              </button>
              <h1 className="mt-2 text-2xl font-semibold">{user.name}</h1>
              {change ? (
                <>
                  <p className="mt-3 flex gap-2.5 rounded-xl bg-marigold-faint px-4 py-3 text-[15px] ring-1 ring-marigold">
                    <ShieldAlert className="size-5 shrink-0 text-marigold-deep" />
                    <span>ເພື່ອຄວາມປອດໄພ ກະລຸນາປ່ຽນ PIN — PIN ນີ້ເປັນ PIN ເລີ່ມຕົ້ນ ຫຼື ເດົາງ່າຍເກີນໄປ.</span>
                  </p>
                  <p className="mt-4 font-medium">{change.first ? "ໃສ່ PIN ໃໝ່ອີກຄັ້ງ ເພື່ອຢືນຢັນ" : "ຕັ້ງ PIN ໃໝ່ (ຕົວເລກ 4-6 ໂຕ)"}</p>
                </>
              ) : (
                <p className="mt-1 text-muted">ໃສ່ລະຫັດ PIN</p>
              )}
              <PinEntry pin={pin} error={error} busy={busy} onKey={onKey} onSubmit={() => submit()} />
            </>
          )}
        </div>
      </section>
    </main>
  );
}