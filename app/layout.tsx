import type { Metadata, Viewport } from "next";
import "./globals.css";
import { AuthProvider } from "@/lib/auth-context";
import { SerwistProvider } from "@serwist/turbopack/react";

export const metadata: Metadata = {
  title: "LottoClub",
  description: "Jouw digitale lottovereniging",
  manifest: "/manifest.json",
  appleWebApp: {
    capable: true,
    statusBarStyle: "black-translucent",
    title: "LottoClub",
  },
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
  viewportFit: "cover",
  themeColor: "#0d1b2a",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  // Service worker registratie alleen in productie. Dit voorkomt cache-
  // verwarring tijdens lokaal ontwikkelen ("ik heb de code aangepast,
  // waarom verandert er niets?").
  const content = <AuthProvider>{children}</AuthProvider>;

  return (
    <html lang="nl">
      <body>
        {process.env.NODE_ENV === "production" ? (
          <SerwistProvider swUrl="/serwist/sw.js">{content}</SerwistProvider>
        ) : (
          content
        )}
      </body>
    </html>
  );
}
