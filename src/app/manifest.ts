import type { MetadataRoute } from "next";

export const dynamic = "force-static";

const BASE = process.env.NEXT_PUBLIC_BASE_PATH || "";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "Dalin POS",
    short_name: "Dalin POS",
    description: "ລະບົບຂາຍໜ້າຮ້ານ ສຳລັບ iPad (ໃຊ້ໄດ້ບໍ່ຕ້ອງມີອິນເຕີເນັດ)",
    id: `${BASE}/pos/`,
    start_url: `${BASE}/pos/`,
    scope: `${BASE}/`,
    display: "standalone",
    orientation: "any",
    background_color: "#f3f4f8",
    theme_color: "#1e2a5a",
    lang: "lo",
    icons: [
      { src: `${BASE}/icons/icon-192.png`, sizes: "192x192", type: "image/png" },
      { src: `${BASE}/icons/icon-512.png`, sizes: "512x512", type: "image/png" },
      { src: `${BASE}/icons/icon-maskable-512.png`, sizes: "512x512", type: "image/png", purpose: "maskable" },
    ],
  };
}
