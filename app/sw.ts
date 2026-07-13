/// <reference lib="esnext" />
/// <reference lib="webworker" />
import { defaultCache } from "@serwist/turbopack/worker";
import type { PrecacheEntry, SerwistGlobalConfig } from "serwist";
import { NetworkOnly, Serwist } from "serwist";

declare global {
  interface WorkerGlobalScope extends SerwistGlobalConfig {
    __SW_MANIFEST: (PrecacheEntry | string)[] | undefined;
  }
}

declare const self: ServiceWorkerGlobalScope;

const serwist = new Serwist({
  precacheEntries: self.__SW_MANIFEST,
  skipWaiting: true,
  clientsClaim: true,
  navigationPreload: true,
  runtimeCaching: [
    // KRITIEK: routes onder /api/ mogen NOOIT uit cache komen.
    // Serwist's defaultCache bevat standaard een NetworkFirst-regel
    // voor /api/, wat stilletjes verouderde data zou kunnen tonen
    // (bijv. betaalstatus). Deze regel staat vóór defaultCache — bij
    // Serwist wint de eerst geregistreerde matchende route altijd.
    // Firebase/Firestore-verkeer (cross-origin naar googleapis.com via
    // websockets/long-polling) wordt hierdoor sowieso niet geraakt en
    // blijft altijd live.
    {
      matcher: ({ url }) => url.pathname.startsWith("/api/"),
      handler: new NetworkOnly(),
    },
    // KRITIEK: financieel-gevoelige pagina's mogen nooit (ook niet heel
    // even bij het opstarten) een gecachete/verouderde versie tonen —
    // zoals een oude kassaldo. Next.js' RSC-navigatiepayloads worden
    // door defaultCache standaard met NetworkFirst gecached (probeert
    // eerst live, valt terug op cache), wat in de praktijk soms toch
    // een korte flits van oude content kan geven. Voor deze specifieke
    // pagina's forceren we daarom altijd live, net als bij /api/.
    {
      matcher: ({ url }) => {
        const gevoeligePaden = ["/dashboard", "/beheerder", "/kashouder", "/kas"];
        return gevoeligePaden.some(p => url.pathname === p || url.pathname.startsWith(`${p}/`));
      },
      handler: new NetworkOnly(),
    },
    // defaultCache bevat verstandige runtime-caching regels voor overige
    // Next.js assets (JS/CSS, afbeeldingen, fonts, paginashells) —
    // precies wat nodig is zodat de app laadt vanuit cache bij een
    // slechte verbinding.
    ...defaultCache,
  ],
  // Voor het (zeldzame) geval dat een lid een pagina opent die nog
  // nooit is bezocht én er geen verbinding is: nette fallback in
  // plaats van "This page couldn't load".
  fallbacks: {
    entries: [
      {
        url: "/offline",
        matcher({ request }) {
          return request.destination === "document";
        },
      },
    ],
  },
});

serwist.addEventListeners();
