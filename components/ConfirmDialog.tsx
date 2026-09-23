'use client';

/**
 * Vervangt window.confirm() overal in de app — dat systeem-dialoogje
 * kan op een als PWA geïnstalleerde iPhone-app onzichtbaar blijven
 * hangen, terwijl het script er wel op wacht. Voelt dan aan als
 * "vastlopen": geen foutmelding, gewoon niets. Zie docs/changelog.md
 * (het Emma-Verreken-incident) voor de aanleiding.
 *
 * Zelfde stijl als de rest van de app — geen systeem-UI, onze eigen.
 */
interface ConfirmDialogProps {
  titel?: string;
  bericht: string;
  bevestigTekst?: string;
  annuleerTekst?: string;
  destructief?: boolean;
  onBevestig: () => void;
  onAnnuleer: () => void;
}

export default function ConfirmDialog({
  titel = 'Weet je het zeker?',
  bericht,
  bevestigTekst = 'Bevestigen',
  annuleerTekst = 'Annuleren',
  destructief = false,
  onBevestig,
  onAnnuleer,
}: ConfirmDialogProps) {
  return (
    <div
      onClick={onAnnuleer}
      style={{
        position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.6)',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        zIndex: 300, padding: 24,
      }}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        style={{
          background: 'var(--surface)', border: '1px solid var(--border)',
          borderRadius: 18, padding: 22, maxWidth: 340, width: '100%',
          boxShadow: '0 12px 32px rgba(0,0,0,0.4)',
        }}
      >
        <div style={{ fontSize: 16, fontWeight: 700, marginBottom: 10, color: 'var(--white)' }}>{titel}</div>
        <div style={{ fontSize: 13.5, color: 'var(--muted)', lineHeight: 1.6, marginBottom: 20 }}>{bericht}</div>
        <div style={{ display: 'flex', gap: 10 }}>
          <button
            onClick={onAnnuleer}
            style={{ flex: 1, background: 'var(--surface2)', border: '1px solid var(--border)', color: 'var(--white)', borderRadius: 12, padding: 12, fontSize: 14, fontWeight: 600, fontFamily: "'DM Sans',sans-serif", cursor: 'pointer' }}
          >
            {annuleerTekst}
          </button>
          <button
            onClick={onBevestig}
            style={{ flex: 1, background: destructief ? 'var(--error)' : 'var(--accent)', border: 'none', color: 'white', borderRadius: 12, padding: 12, fontSize: 14, fontWeight: 700, fontFamily: "'DM Sans',sans-serif", cursor: 'pointer' }}
          >
            {bevestigTekst}
          </button>
        </div>
      </div>
    </div>
  );
}
