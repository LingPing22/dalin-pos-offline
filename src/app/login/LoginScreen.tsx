"use client";
import { useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { Check, Store, UserRound } from "lucide-react";
import { Numpad, applyKey } from "@/components/ui/Numpad";
import { fmtDayLong } from "@/lib/time";
import { listUsers, login } from "@/lib/store";
import { writeSession } from "@/lib/session";

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

  useEffect(() => {
    listUsers(true)
      .then((list) => {
        setUsers(list);
        if (list.length === 1) setUser(list[0]);
      })
      .catch(() => setError("ເປີດຖານຂໍ້ມູນໃນເຄື່ອງບໍ່ໄດ້ — ກວດວ່າບໍ່ໄດ້ເປີດແບບ Private Browsing"));
    setNow(new Date());
    const t = setInterval(() => setNow(new Date()), 30_000);
    return () => clearInterval(t);
  }, []);

  async function submit(p = pin) {
    if (!user || p.length < 4 || busy) return;
    setBusy(true);
    setError("");
    try {
      writeSession(await login(user.id, p));
    } catch (e) {
      setBusy(false);
      setPin("");
      setError((e as Error).message || "ເຂົ້າສູ່ລະບົບບໍ່ສຳເລັດ");
      return;
    }
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
              <button onClick={() => { setUser(null); setPin(""); setError(""); }} className="text-muted underline-offset-4 active:underline">
                ປ່ຽນຜູ້ໃຊ້
              </button>
              <h1 className="mt-2 text-2xl font-semibold">{user.name}</h1>
              <p className="mt-1 text-muted">ໃສ່ລະຫັດ PIN</p>
              <div className="my-7 flex justify-center gap-4" aria-live="polite">
                {Array.from({ length: Math.max(4, pin.length) }, (_, i) => (
                  <span
                    key={i}
                    className={`size-4 rounded-full transition ${i < pin.length ? "bg-ink" : "bg-line"} ${error ? "bg-chili!" : ""}`}
                  />
                ))}
              </div>
              <p className="mb-4 h-6 text-center text-chili">{error}</p>
              <Numpad
                onKey={onKey}
                extra="C"
                confirm={<Check className="mx-auto size-7" />}
                confirmDisabled={pin.length < 4 || busy}
                onConfirm={() => submit()}
              />
            </>
          )}
        </div>
      </section>
    </main>
  );
}
