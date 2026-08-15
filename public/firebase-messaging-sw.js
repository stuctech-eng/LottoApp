// Dit bestand wordt sinds 15 augustus 2026 NIET meer gebruikt.
// Firebase Messaging is samengevoegd met de PWA-caching-worker in
// app/sw.ts (gecompileerd naar /serwist/sw.js) — twee losse actieve
// service workers op hetzelfde origin verdrongen elkaar, waardoor
// pushmeldingen nooit werden getoond ondanks een "geslaagde" server-
// verzending. Dit bestand mag veilig verwijderd worden uit de repo;
// blijft het onverhoopt staan, dan doet het niets schadelijks (geen
// registratie meer ernaartoe vanuit lib/firebase-messaging.ts).
