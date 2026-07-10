export default function OfflinePage() {
  return (
    <main
      style={{
        minHeight: "100dvh",
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        gap: "12px",
        padding: "24px",
        textAlign: "center",
        background: "#0d1b2a",
        color: "white",
      }}
    >
      <h1 style={{ fontSize: "1.5rem", fontWeight: 700 }}>Geen verbinding</h1>
      <p style={{ maxWidth: "320px", opacity: 0.85 }}>
        Deze pagina is nog niet eerder geopend en kan niet geladen worden
        zonder internet.
      </p>
      <p style={{ maxWidth: "320px", opacity: 0.85 }}>
        Zodra je weer verbinding hebt, werkt de app weer met actuele gegevens
        — betaalstatussen en trekkingsuitslagen worden nooit uit het geheugen
        getoond.
      </p>
    </main>
  );
} 
