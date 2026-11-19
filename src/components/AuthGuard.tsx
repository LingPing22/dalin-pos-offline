"use client";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { LOCK_EVENT, idleMs, isLocked, readSession, setLocked, touchActivity, type Session } from "@/lib/session";
import { ensureReady, getSettings } from "@/lib/store";
import { LockScreen } from "./LockScreen";

const ACTIVITY = ["pointerdown", "keydown", "wheel"] as const;

/** Replaces the server-side login check: renders children only for a logged-in user. */
export function AuthGuard({ owner = false, children }: { owner?: boolean; children: (s: Session) => React.ReactNode }) {
  const router = useRouter();
  const [session, setSession] = useState<Session | null>(null);
  const [lockMs, setLockMs] = useState(0);
  const [locked, setLockedView] = useState(false);

  useEffect(() => {
    ensureReady().then(async () => {
      const s = readSession();
      if (!s) router.replace("/login/");
      else if (owner && s.role !== "owner") router.replace("/pos/");
      else {
        setLockMs((await getSettings()).security.lockMinutes * 60_000);
        setSession(s);
      }
    });
  }, [owner, router]);

  // Auto-lock: checked on a timer and whenever the iPad wakes / the app comes back
  useEffect(() => {
    if (!session) return;
    let lastTouch = 0;
    const check = () => {
      if (!isLocked() && lockMs > 0 && idleMs() > lockMs) setLocked(true);
      setLockedView(isLocked());
    };
    const onActivity = () => {
      if (lockMs > 0 && idleMs() > lockMs) return check(); // first tap after the idle limit locks, never extends
      const now = Date.now();
      if (now - lastTouch > 5_000 && !isLocked()) {
        lastTouch = now;
        touchActivity();
      }
    };
    check();
    const timer = setInterval(check, 15_000);
    ACTIVITY.forEach((e) => window.addEventListener(e, onActivity, { passive: true, capture: true }));
    window.addEventListener(LOCK_EVENT, check);
    document.addEventListener("visibilitychange", check);
    return () => {
      clearInterval(timer);
      ACTIVITY.forEach((e) => window.removeEventListener(e, onActivity, { capture: true }));
      window.removeEventListener(LOCK_EVENT, check);
      document.removeEventListener("visibilitychange", check);
    };
  }, [session, lockMs]);

  if (!session) return <div className="grid h-dvh place-items-center text-muted">ກຳລັງໂຫຼດ…</div>;
  return (
    <>
      {children(session)}
      {locked && <LockScreen session={session} onUnlock={() => setLockedView(false)} />}
    </>
  );
}
