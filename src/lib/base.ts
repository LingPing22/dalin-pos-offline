/** "/dalin-pos-offline" on GitHub Pages, "" when served from the domain root */
export const BASE = process.env.NEXT_PUBLIC_BASE_PATH || "";
export const asset = (p: string) => `${BASE}${p}`;
