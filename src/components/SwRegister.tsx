"use client";
import { useEffect, useState } from "react";
import { RefreshCw } from "lucide-react";
import { BASE } from "@/lib/base";

/**
 * Installs the service worker that stores the whole app on the iPad, so it opens
 * with no internet at all. When a newer version is published, offers a reload.
 */
export function SwRegister() {
  const [update, setUpdate] = useState(false);

  useEffect(() => {
    if (!("serviceWorker" in navigator) || process.env.NODE_ENV !== "production") return;
    const hadController = !!navigator.serviceWorker.controller;
    navigator.serviceWorker.register(`${BASE}/sw.js`, { scope: `${BASE}/` }).catch(() => {});
    const onChange = () => hadController && setUpdate(true);
    navigator.serviceWorker.addEventListener("controllerchange", onChange);
    return () => navigator.serviceWorker.removeEventListener("controllerchange", onChange);
  }, []);

  if (!update) return null;
  return (
    <button
      onClick={() => location.reload()}
      className="fixed bottom-4 left-1/2 z-[60] flex h-12 -translate-x-1/2 items-center gap-2 rounded-full bg-ink px-5 font-medium text-white shadow-xl"
    >
      <RefreshCw className="size-5 text-marigold" /> ມີເວີຊັນໃໝ່ — ແຕະເພື່ອອັບເດດ
    </button>
  );
}
