/// <reference lib="esnext" />
/// <reference lib="webworker" />
import { defaultCache } from "@serwist/turbopack/worker";
import type { PrecacheEntry, SerwistGlobalConfig } from "serwist";
import { NetworkOnly, Serwist } from "serwist";
import { initializeApp } from "firebase/app";
import { getMessaging, onBackgroundMessage } from "firebase/messaging/sw";

declare global {
  interface WorkerGlobalScope extends SerwistGlobalConfig {
    __SW_MANIFEST: (PrecacheEntry | string)[] | undefined;
  }
}

declare const self: ServiceWorkerGlobalScope;

// ─────────────────────── Firebase Cloud Messaging ───────────────────────
//
// BUGFIX (15 augustus 2026): stond eerder in een APART bestand
// (public/firebase-messaging-sw.js), met een eigen registratie los van
// deze Serwist-caching-worker. Twee actieve service workers op
// hetzelfde origin streden om de controle over de scope — met
// `skipWaiting: true` + `clientsClaim: true` hieronder verdrong deze
// caching-worker bij elke page-load de messaging-worker als actieve
// controller, waardoor pushberichten wel bij Apple/Firebase aankwamen
// (server meldde "succes"), maar nooit daadwerkelijk werden getoond —
// niemand was er nog om showNotification() aan te roepen. Firebase
// zelf raadt voor precies dit scenario aan: alles in ÉÉN service
// worker. Vandaar deze samenvoeging.
const firebaseApp = initializeApp({
  apiKey: "AIzaSyDGz1nAbH5fxYY5halcrd0Dsu3PaM2j9bU",
  authDomain: "lottoclub.firebaseapp.com",
  projectId: "lottoclub",
  storageBucket: "lottoclub.firebasestorage.app",
  messagingSenderId: "455488693325",
  appId: "1:455488693325:web:25798f2fc9901ec3c4a804",
});
const messaging = getMessaging(firebaseApp);

// Data-only payload — zie functions/src/index.ts's sendToTokens voor
// de reden (voorkomt dubbele meldingen die zouden ontstaan als zowel
// een top-level `notification`-veld als deze handmatige
// showNotification()-aanroep de melding allebei zouden tonen).
onBackgroundMessage(messaging, (payload) => {
  const { title, body, icon, path } = payload.data ?? {};
  const link = path ?? "/";

  self.registration.showNotification(title ?? "LottoClub", {
    body: body ?? "",
    icon: icon ?? "/icons/icon-192x192.png",
    badge: "/icons/badge-72x72.png",
    data: { link },
  });
});

self.addEventListener("notificationclick", (event) => {
  event.notification.close();
  const link = (event.notification.data as { link?: string } | undefined)?.link ?? "/";
  event.waitUntil(
    self.clients.matchAll({ type: "window", includeUncontrolled: true }).then((clientList) => {
      for (const client of clientList) {
        if ("focus" in client) {
          client.focus();
          (client as WindowClient).navigate(link);
          return;
        }
      }
      if (self.clients.openWindow) return self.clients.openWindow(link);
    })
  );
});

// ─────────────────────── PWA-caching (bestaand, ongewijzigd) ───────────────────────

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
