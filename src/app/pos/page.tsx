"use client";
import { useCallback, useEffect, useState } from "react";
import { AuthGuard } from "@/components/AuthGuard";
import { PosScreen } from "@/components/pos/PosScreen";
import { ShiftGate } from "@/components/pos/ShiftGate";
import { getCatalog, getOpenShift, getSettings } from "@/lib/store";
import type { PosCategory, PosProduct, ShopSettings } from "@/lib/types";
import type { Shift } from "@/lib/db";
import type { Session } from "@/lib/session";

function PosLoader({ user }: { user: Session }) {
  const [data, setData] = useState<{ catalog: { categories: PosCategory[]; products: PosProduct[] }; settings: ShopSettings } | null>(null);
  const [shift, setShift] = useState<Shift | null | undefined>(undefined);
  const loadShift = useCallback(() => {
    getOpenShift().then(setShift);
  }, []);
  useEffect(() => {
    Promise.all([getCatalog(), getSettings()]).then(([catalog, settings]) => setData({ catalog, settings }));
    loadShift();
  }, [loadShift]);
  if (!data || shift === undefined) return <div className="grid h-dvh place-items-center text-muted">ກຳລັງໂຫຼດ…</div>;
  if (!shift || shift.userId !== user.uid) {
    return <ShiftGate user={user} open={shift} shopName={data.settings.shop.name} onReady={setShift} onChanged={loadShift} />;
  }
  return <PosScreen catalog={data.catalog} settings={data.settings} user={user} shift={shift} />;
}

export default function PosPage() {
  return <AuthGuard>{(s) => <PosLoader user={s} />}</AuthGuard>;
}
