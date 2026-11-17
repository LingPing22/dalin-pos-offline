"use client";
import { useEffect, useState } from "react";
import { AuthGuard } from "@/components/AuthGuard";
import { PosScreen } from "@/components/pos/PosScreen";
import { getCatalog, getSettings } from "@/lib/store";
import type { PosCategory, PosProduct, ShopSettings } from "@/lib/types";
import type { Session } from "@/lib/session";

function PosLoader({ user }: { user: Session }) {
  const [data, setData] = useState<{ catalog: { categories: PosCategory[]; products: PosProduct[] }; settings: ShopSettings } | null>(null);
  useEffect(() => {
    Promise.all([getCatalog(), getSettings()]).then(([catalog, settings]) => setData({ catalog, settings }));
  }, []);
  if (!data) return <div className="grid h-dvh place-items-center text-muted">ກຳລັງໂຫຼດ…</div>;
  return <PosScreen catalog={data.catalog} settings={data.settings} user={user} />;
}

export default function PosPage() {
  return <AuthGuard>{(s) => <PosLoader user={s} />}</AuthGuard>;
}
