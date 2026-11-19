import { VARIANT_ICON } from "@/lib/types";
import { tw } from "@/lib/tw";

/** Each drink type has its own colour everywhere: hot = orange, iced = blue, blended = purple */
export const VARIANT_STYLE: Record<string, { soft: string; solid: string; ring: string }> = {
  ຮ້ອນ: { soft: "bg-hot-faint text-hot", solid: "bg-hot text-white", ring: "ring-hot" },
  ເຢັນ: { soft: "bg-ice-faint text-ice", solid: "bg-ice text-white", ring: "ring-ice" },
  ປັ່ນ: { soft: "bg-blend-faint text-blend", solid: "bg-blend text-white", ring: "ring-blend" },
};
const FALLBACK = { soft: "bg-ink-faint text-ink", solid: "bg-ink text-white", ring: "ring-ink" };
export const variantStyle = (name: string) => VARIANT_STYLE[name] ?? FALLBACK;

export function VariantTag({ name, solid = false, className = "" }: { name: string; solid?: boolean; className?: string }) {
  const s = variantStyle(name);
  return (
    <span className={tw("inline-flex items-center gap-1 whitespace-nowrap rounded-full px-2 py-0.5 text-xs font-semibold", solid ? s.solid : s.soft, className)}>
      <span aria-hidden>{VARIANT_ICON[name] ?? "🥤"}</span>
      {name}
    </span>
  );
}
