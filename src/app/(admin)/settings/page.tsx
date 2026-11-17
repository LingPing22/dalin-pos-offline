"use client";
import { useEffect, useState } from "react";
import { getSettings, listUsers, type UserRow } from "@/lib/store";
import type { ShopSettings } from "@/lib/types";
import { SettingsForm } from "@/components/admin/SettingsForm";
import { DataPanel } from "@/components/admin/DataPanel";

export default function SettingsPage() {
  const [data, setData] = useState<{ s: ShopSettings; u: UserRow[] } | null>(null);
  useEffect(() => {
    Promise.all([getSettings(), listUsers()]).then(([s, u]) => setData({ s, u }));
  }, []);
  return data ? <SettingsForm initial={data.s} initialUsers={data.u} extra={<DataPanel />} /> : null;
}
