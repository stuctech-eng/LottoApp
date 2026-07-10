import type { NextConfig } from "next";
import withSerwistInit from "@serwist/next";

const withSerwist = withSerwistInit({
  swSrc: "app/sw.ts",
  swDest: "public/sw.js",
  // Serwist ondersteunt (nog) geen Turbopack, de standaard dev-bundler
  // in Next.js 16. Daarom staat de service worker in development uit —
  // dit heeft geen invloed op productie (Vercel build gebruikt webpack
  // voor de Serwist-compilatie).
  disable: process.env.NODE_ENV === "development",
  // Voorkomt geforceerde page reload wanneer een gebruiker weer online
  // komt — belangrijk zodat niemand een half ingevuld formulier
  // (bijv. tijdens het betalen) kwijtraakt.
  reloadOnOnline: false,
  // Zorgt dat de /offline fallback-pagina altijd in de precache zit,
  // ongeacht of een lid 'm ooit heeft bezocht. Verhoog de revision
  // handmatig als de inhoud van app/offline/page.tsx wijzigt.
  additionalPrecacheEntries: [{ url: "/offline", revision: "1" }],
});

const nextConfig: NextConfig = {
  output: "standalone",
  experimental: {
    optimizePackageImports: ["lucide-react"],
  },
};

export default withSerwist(nextConfig);
