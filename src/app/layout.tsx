import type { Metadata, Viewport } from "next";
import "@fontsource-variable/noto-sans-lao";
import "./globals.css";
import { SwRegister } from "@/components/SwRegister";
import { BASE } from "@/lib/base";

export const metadata: Metadata = {
  title: "Dalin POS",
  description: "ລະບົບຂາຍໜ້າຮ້ານ ສຳລັບ iPad",
  applicationName: "Dalin POS",
  appleWebApp: { capable: true, title: "Dalin POS", statusBarStyle: "default" },
  icons: {
    icon: [{ url: `${BASE}/icons/icon-192.png`, sizes: "192x192", type: "image/png" }],
    apple: [{ url: `${BASE}/icons/apple-touch-icon.png`, sizes: "180x180" }],
  },
  formatDetection: { telephone: false },
  manifest: `${BASE}/manifest.webmanifest`,
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
  userScalable: false, // POS: no accidental pinch/double-tap zoom
  viewportFit: "cover",
  themeColor: "#1e2a5a",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="lo">
      <body className="font-sans antialiased">
        {children}
        <SwRegister />
      </body>
    </html>
  );
}
