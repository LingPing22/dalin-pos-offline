import { twMerge } from "tailwind-merge";

/** Join class names; later Tailwind classes override earlier ones (e.g. tw(btn, "px-0")) */
export const tw = (...c: (string | false | null | undefined)[]) => twMerge(c.filter(Boolean).join(" "));
