"use client";
import { useEffect, useState } from "react";
import { getSettings } from "@/lib/store";
import type { ShopSettings } from "@/lib/types";
import { SalesHistory } from "@/components/admin/SalesHistory";

export default function SalesPage() {
  const [s, setS] = useState<ShopSettings | null>(null);
  useEffect(() => {
    getSettings().then(setS);
  }, []);
  return s ? <SalesHistory settings={s} /> : null;
}
