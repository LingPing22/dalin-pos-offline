"use client";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { clearSession } from "@/lib/session";
import { LayoutDashboard, LogOut, Package, ReceiptText, Settings, ShoppingCart, Wallet } from "lucide-react";

const ITEMS = [
  { href: "/dashboard/", label: "ພາບລວມ", Icon: LayoutDashboard },
  { href: "/sales/", label: "ບິນຂາຍ", Icon: ReceiptText },
  { href: "/products/", label: "ສິນຄ້າ", Icon: Package },
  { href: "/expenses/", label: "ຄ່າໃຊ້ຈ່າຍ", Icon: Wallet },
  { href: "/settings/", label: "ຕັ້ງຄ່າ", Icon: Settings },
];

export function AdminNav({ name }: { name: string }) {
  const path = usePathname();
  const router = useRouter();
  function logout() {
    clearSession();
    router.replace("/login/");
  }
  return (
    <nav className="no-scrollbar flex w-24 shrink-0 flex-col items-stretch gap-1 overflow-y-auto bg-ink px-2 pt-[max(0.75rem,env(safe-area-inset-top))] pb-[max(0.75rem,env(safe-area-inset-bottom))] text-white">
      <Link
        href="/pos/"
        className="mb-3 flex flex-col items-center gap-1 rounded-2xl bg-marigold px-1 py-3 text-ink shadow-[inset_0_-3px_0_var(--color-marigold-deep)] active:translate-y-px"
      >
        <ShoppingCart className="size-6" strokeWidth={2} />
        <span className="text-[13px] font-semibold">ໜ້າຂາຍ</span>
      </Link>
      {ITEMS.map(({ href, label, Icon }) => {
        const active = path.startsWith(href.replace(/\/$/, ""));
        return (
          <Link
            key={href}
            href={href}
            aria-current={active ? "page" : undefined}
            className={`flex flex-col items-center gap-1 rounded-2xl px-1 py-3 transition ${active ? "bg-white/12 text-white" : "text-white/65 active:bg-white/8"}`}
          >
            <Icon className={`size-6 ${active ? "text-marigold" : ""}`} strokeWidth={1.75} />
            <span className="text-[13px] font-medium">{label}</span>
          </Link>
        );
      })}
      <div className="mt-auto flex flex-col items-center gap-1 pt-4 text-center">
        <span className="line-clamp-2 px-1 text-xs text-white/60">{name}</span>
        <button onClick={logout} aria-label="ອອກຈາກລະບົບ" className="grid size-12 place-items-center rounded-2xl text-white/70 active:bg-white/10">
          <LogOut className="size-5" />
        </button>
      </div>
    </nav>
  );
}
