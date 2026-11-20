"use client";
import { useEffect, useState } from "react";
import { RefreshCw } from "lucide-react";
import { BASE } from "@/lib/base";

/** The app's stylesheet defines this colour; if it is empty the styles did not load */
const stylesMissing = () => !getComputedStyle(document.documentElement).getPropertyValue("--color-ink").trim();
const HEALED = "dalin.sw-healed";

/**
 * Throws away the saved offline copy of the app (NOT the shop's data — that lives in IndexedDB,
 * which this never touches) and loads the app fresh from the internet. Only once per session, and
 * only when online, so it can't loop or leave the iPad with nothing offline.
 */
async function healOnce() {
  if (!navigator.onLine || sessionStorage.getItem(HEALED)) return false;
  sessionStorage.setItem(HEALED, "1");
  await Promise.all((await navigator.serviceWorker.getRegistrations()).map((r) => r.unregister()));
  await Promise.all((await caches.keys()).filter((k) => k.startsWith("dalin-")).map((k) => caches.delete(k)));
  location.reload();
  return true;
}

/**
 * Installs the service worker that stores the whole app on the iPad, so it opens
 * with no internet at all. When a newer version is published, offers a reload.
 */
export function SwRegister() {
  const [update, setUpdate] = useState(false);

  useEffect(() => {
    if (!("serviceWorker" in navigator) || process.env.NODE_ENV !== "production") return;
    let off = () => {};
    const start = () => {
      const hadController = !!navigator.serviceWorker.controller;
      navigator.serviceWorker.register(`${BASE}/sw.js`, { scope: `${BASE}/` }).catch(() => {});
      const onChange = () => hadController && setUpdate(true);
      navigator.serviceWorker.addEventListener("controllerchange", onChange);
      off = () => navigator.serviceWorker.removeEventListener("controllerchange", onChange);
    };
    // An offline copy that mixed two versions opens the app without styles: repair it
    if (stylesMissing()) healOnce().then((reloading) => !reloading && start(), start);
    else start();
    return () => off();
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
