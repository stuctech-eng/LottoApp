import { defaultCache } from "@serwist/next/worker";
import type { PrecacheEntry, SerwistGlobalConfig } from "serwist";
import { Serwist } from "serwist";

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
  // defaultCache bevat verstandige runtime-caching regels voor Next.js
  // (JS/CSS assets, afbeeldingen, fonts, pagina's) — precies wat nodig
  // is zodat de app laadt vanuit cache bij een slechte verbinding.
  runtimeCaching: defaultCache,
});

serwist.addEventListeners();
