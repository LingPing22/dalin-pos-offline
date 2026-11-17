"use client";
import { useEffect, useState } from "react";
import { getCategories, listProducts, type AdminProduct } from "@/lib/store";
import type { PosCategory } from "@/lib/types";
import { ProductManager } from "@/components/admin/ProductManager";

export default function ProductsPage() {
  const [data, setData] = useState<{ p: AdminProduct[]; c: PosCategory[] } | null>(null);
  useEffect(() => {
    Promise.all([listProducts(), getCategories()]).then(([p, c]) => setData({ p, c }));
  }, []);
  return data ? <ProductManager initialProducts={data.p} initialCategories={data.c} /> : null;
}
