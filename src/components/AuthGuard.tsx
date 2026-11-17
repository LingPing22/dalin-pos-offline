"use client";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { readSession, type Session } from "@/lib/session";
import { ensureReady } from "@/lib/store";

/** Replaces the server-side login check: renders children only for a logged-in user. */
export function AuthGuard({ owner = false, children }: { owner?: boolean; children: (s: Session) => React.ReactNode }) {
  const router = useRouter();
  const [session, setSession] = useState<Session | null>(null);

  useEffect(() => {
    ensureReady().then(() => {
      const s = readSession();
      if (!s) router.replace("/login/");
      else if (owner && s.role !== "owner") router.replace("/pos/");
      else setSession(s);
    });
  }, [owner, router]);

  if (!session) return <div className="grid h-dvh place-items-center text-muted">ກຳລັງໂຫຼດ…</div>;
  return <>{children(session)}</>;
}
