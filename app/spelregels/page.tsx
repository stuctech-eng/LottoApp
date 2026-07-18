'use client';
import ProtectedRoute from '@/components/ProtectedRoute';
import Link from 'next/link';
import { useState, useEffect } from 'react';
import { subscribeVerenigingConfig, DEFAULT_VERENIGING_CONFIG } from '@/lib/firestore-vereniging';

function SpelregelsContent() {
  const [standaardInleg, setStandaardInleg] = useState(DEFAULT_VERENIGING_CONFIG.standaardInleg);

  useEffect(() => {
    const unsub = subscribeVerenigingConfig(cfg => setStandaardInleg(cfg.standaardInleg));
    return unsub;
  }, []);

  return (
    <>
      <div className="bg-grid" />
      <div className="page">
        {/* Header */}
        <div style={{ padding: 'max(16px, env(safe-area-inset-top, 16px)) 24px 20px' }}>
          <Link href="/profiel" style={{ width: 36, height: 36, borderRadius: 11, background: 'rgba(255,255,255,0.08)', border: '1px solid var(--border)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 18, marginBottom: 16, textDecoration: 'none', color: 'var(--white)' }}>←</Link>
          <div style={{ fontSize: 12, color: 'var(--gold)', fontWeight: 600, marginBottom: 2 }}>📋 Spelregels</div>
          <div style={{ fontFamily: "'DM Serif Display',serif", fontSize: 28, letterSpacing: -0.5, marginBottom: 4 }}>Hoe werkt LottoClub?</div>
          <div style={{ fontSize: 13, color: 'var(--muted)' }}>De regels gelden voor iedereen, altijd</div>
        </div>

        <div style={{ padding: '0 20px', paddingBottom: 40 }}>

          {/* Betaalcyclus */}
          <div style={{ background: 'linear-gradient(135deg,#2a1c00,#0d1b2a)', border: '1px solid rgba(240,192,96,0.18)', borderRadius: 18, padding: '18px 20px', marginBottom: 12 }}>
            <div style={{ fontSize: 13, fontWeight: 700, color: 'var(--gold)', marginBottom: 12, letterSpacing: '0.5px', textTransform: 'uppercase' }}>🔄 Wekelijkse cyclus</div>
            {[
              { icon: '🎱', tekst: 'Zaterdag — trekking verwerkt → nieuwe betalingen automatisch aangemaakt voor volgende week' },
              { icon: '💳', tekst: 'Zondag t/m donderdag — betaal via Tikkie en meld het in de app' },
              { icon: '⏰', tekst: 'Vrijdag 09:00 — automatische herinnering voor wie nog niet betaald heeft' },
              { icon: '✅', tekst: 'Kashouder bevestigt betalingen — je doet mee met de trekking' },
              { icon: '🎯', tekst: 'Zaterdag 19:30 — lotto-trekking, beheerder voert uitslag in' },
            ].map((s, i) => (
              <div key={i} style={{ display: 'flex', gap: 12, alignItems: 'flex-start', marginBottom: 10 }}>
                <span style={{ fontSize: 16, flexShrink: 0, marginTop: 1 }}>{s.icon}</span>
                <div style={{ fontSize: 13, color: 'var(--muted)', lineHeight: 1.6 }}>{s.tekst}</div>
              </div>
            ))}
          </div>

          {/* Regel 1 — Betaling */}
          <div style={{ background: 'linear-gradient(135deg,rgba(74,158,255,0.08),var(--surface))', border: '1px solid rgba(74,158,255,0.2)', borderRadius: 18, padding: '18px 20px', marginBottom: 12 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 10 }}>
              <div style={{ width: 36, height: 36, borderRadius: 11, background: 'var(--accent-soft)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 18, flexShrink: 0 }}>💳</div>
              <div style={{ fontSize: 15, fontWeight: 700, color: 'var(--white)' }}>Betaling = deelname</div>
            </div>
            <div style={{ fontSize: 13, color: 'var(--muted)', lineHeight: 1.7 }}>
              Je doet alleen mee aan een trekking als je de inleg van die week hebt betaald én de kashouder dit heeft bevestigd. Heb je niet betaald? Dan tellen je nummers die week niet mee — automatisch, zonder verdere melding.
            </div>
          </div>

          {/* Regel 2 — Tickets */}
          <div style={{ background: 'linear-gradient(135deg,rgba(240,192,96,0.08),var(--surface))', border: '1px solid rgba(240,192,96,0.2)', borderRadius: 18, padding: '18px 20px', marginBottom: 12 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 10 }}>
              <div style={{ width: 36, height: 36, borderRadius: 11, background: 'var(--gold-soft)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 18, flexShrink: 0 }}>🎱</div>
              <div style={{ fontSize: 15, fontWeight: 700, color: 'var(--white)' }}>1 ticket per persoon</div>
            </div>
            <div style={{ fontSize: 13, color: 'var(--muted)', lineHeight: 1.7 }}>
              Iedereen heeft recht op precies 1 ticket met 6 nummers. Zo heeft iedereen gelijke kansen — ongeacht hoe lang je al meedoet of hoeveel je hebt ingelegd.
            </div>
          </div>

          {/* Regel 3 — Winnen */}
          <div style={{ background: 'linear-gradient(135deg,rgba(52,201,122,0.08),var(--surface))', border: '1px solid rgba(52,201,122,0.2)', borderRadius: 18, padding: '18px 20px', marginBottom: 12 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 10 }}>
              <div style={{ width: 36, height: 36, borderRadius: 11, background: 'var(--success-soft)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 18, flexShrink: 0 }}>🏆</div>
              <div style={{ fontSize: 15, fontWeight: 700, color: 'var(--white)' }}>Alleen alle 6 nummers goed is winnen</div>
            </div>
            <div style={{ fontSize: 13, color: 'var(--muted)', lineHeight: 1.7 }}>
              Je wint alleen als alle 6 nummers op je ticket overeenkomen met de getrokken nummers van de Nederlandse Lotto. Heb je 5 of minder goed? Dan is er deze week geen winnaar.
            </div>
          </div>

          {/* Regel 4 — Rollover */}
          <div style={{ background: 'linear-gradient(135deg,rgba(160,100,255,0.08),var(--surface))', border: '1px solid rgba(160,100,255,0.2)', borderRadius: 18, padding: '18px 20px', marginBottom: 12 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 10 }}>
              <div style={{ width: 36, height: 36, borderRadius: 11, background: 'var(--purple-soft)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 18, flexShrink: 0 }}>🔄</div>
              <div style={{ fontSize: 15, fontWeight: 700, color: 'var(--white)' }}>Geen winnaar? Pot blijft staan</div>
            </div>
            <div style={{ fontSize: 13, color: 'var(--muted)', lineHeight: 1.7 }}>
              Is er geen winnaar? Dan blijft de pot staan en groeit die de volgende week verder. De inleg van die week wordt er gewoon bij opgeteld. Zo kan de pot weken achter elkaar groeien.
            </div>
          </div>

          {/* Regel 5 — Pot opbouw */}
          <div style={{ background: 'linear-gradient(135deg,rgba(52,201,122,0.06),var(--surface))', border: '1px solid rgba(52,201,122,0.15)', borderRadius: 18, padding: '18px 20px', marginBottom: 12 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 10 }}>
              <div style={{ width: 36, height: 36, borderRadius: 11, background: 'var(--success-soft)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 18, flexShrink: 0 }}>💰</div>
              <div style={{ fontSize: 15, fontWeight: 700, color: 'var(--white)' }}>Pot wordt opgebouwd door betalers</div>
            </div>
            <div style={{ fontSize: 13, color: 'var(--muted)', lineHeight: 1.7 }}>
              Alleen de inleg van leden die daadwerkelijk betaald hebben telt mee voor de pot. Wie niet betaalt, legt niet in en doet niet mee — die week. De volgende week kun je gewoon weer instappen.
            </div>
          </div>

          {/* Regel 6 — Meerdere winnaars */}
          <div style={{ background: 'linear-gradient(135deg,rgba(240,192,96,0.06),var(--surface))', border: '1px solid rgba(240,192,96,0.15)', borderRadius: 18, padding: '18px 20px', marginBottom: 12 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 10 }}>
              <div style={{ width: 36, height: 36, borderRadius: 11, background: 'var(--gold-soft)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 18, flexShrink: 0 }}>🎉</div>
              <div style={{ fontSize: 15, fontWeight: 700, color: 'var(--white)' }}>Meerdere winnaars mogelijk</div>
            </div>
            <div style={{ fontSize: 13, color: 'var(--muted)', lineHeight: 1.7 }}>
              Hebben meerdere leden alle 6 nummers goed? Dan zijn er meerdere winnaars en wordt de pot gelijkelijk verdeeld.
            </div>
          </div>

          {/* Samenvatting */}
          <div style={{ background: 'linear-gradient(135deg,#2a1c00,#0d1b2a)', border: '1px solid rgba(240,192,96,0.18)', borderRadius: 18, padding: '18px 20px', marginBottom: 12 }}>
            <div style={{ fontSize: 13, fontWeight: 700, color: 'var(--gold)', marginBottom: 12, letterSpacing: '0.5px', textTransform: 'uppercase' }}>Samenvatting</div>
            {[
              `💳 Betaal elke week €${standaardInleg} via Tikkie of overboeking`,
              '📲 Meld je betaling in de app na het betalen',
              '✅ Kashouder bevestigt → je doet mee deze week',
              '🎱 Zaterdag worden de nummers getrokken',
              '🏆 Alle 6 goed? Jij wint de hele pot',
              '🔄 Niet gewonnen? Pot blijft staan voor volgende week',
              '⏰ Niet betaald? Vrijdag krijg je een herinnering',
            ].map((r, i) => (
              <div key={i} style={{ fontSize: 13, color: 'var(--muted)', lineHeight: 1.7, paddingBottom: 6 }}>{r}</div>
            ))}
          </div>

          {/* Link naar help */}
          <Link href="/help" style={{ display: 'flex', alignItems: 'center', gap: 12, background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 14, padding: '14px 16px', textDecoration: 'none', marginTop: 8 }}>
            <div style={{ width: 36, height: 36, borderRadius: 11, background: 'var(--accent-soft)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 18, flexShrink: 0 }}>❓</div>
            <div style={{ flex: 1 }}>
              <div style={{ fontSize: 14, fontWeight: 600, color: 'var(--white)', marginBottom: 1 }}>Meer uitleg nodig?</div>
              <div style={{ fontSize: 11, color: 'var(--muted)' }}>Bekijk de volledige handleiding</div>
            </div>
            <span style={{ fontSize: 16, color: 'var(--muted)' }}>›</span>
          </Link>

        </div>
      </div>
    </>
  );
}

export default function SpelregelsPage() {
  return (
    <ProtectedRoute>
      <SpelregelsContent />
    </ProtectedRoute>
  );
}
