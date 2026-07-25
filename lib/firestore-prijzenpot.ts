import { collection, query, where, getDocs, getDoc, doc } from 'firebase/firestore';
import { db } from './firebase';
import { huidigTrekkingWeek } from './firestore-payments';

/**
 * Berekent de daadwerkelijke prijzenpot van de HUIDIGE speelreeks —
 * dit is NIET hetzelfde als kasSaldo (het totale, cumulatieve
 * clubsaldo all-time).
 *
 * Het verschil is sinds LottoSaldo vooral belangrijk geworden: een
 * storting telt namelijk direct mee in kasSaldo, ook al is dat geld
 * nog niet "verdiend" als prijzengeld voor deze speelreeks — het is
 * vooruitbetaling voor toekomstige weken. Zonder deze aparte
 * berekening zou een lid dus een te hoog, misleidend bedrag zien als
 * "wat kun je winnen".
 *
 * Telt mee: alle bevestigde ('betaald') wekelijkse inleg voor weken
 * binnen de huidige speelreeks — sinds de laatste winnaar, of vanaf
 * het begin als nog nooit gewonnen — inclusief al-bevestigde
 * toekomstige weken die nog niet getrokken zijn.
 *
 * Telt NIET mee: LottoSaldo-stortingen zelf (isSaldoStorting: true)
 * — dat is nog niet-verbruikt vooruitbetaald geld, geen bevestigde
 * deelname aan een specifieke week van déze speelreeks. Zodra zo'n
 * storting automatisch als wekelijkse inleg wordt "verbruikt", komt
 * er wél een eigen 'betaald'-Betaling-document voor die week bij, en
 * telt het via die weg gewoon mee.
 */
export async function berekenActuelePrijzenpot(): Promise<number> {
  // Stap 1: bepaal de speelreeks-grens — vind de meest recente
  // trekking met een winnaar (indien die er is).
  const winnendeResultatenSnap = await getDocs(query(
    collection(db, 'resultaten'),
    where('isWinnaar', '==', true)
  ));

  let vanafWeek: string | null = null;

  if (!winnendeResultatenSnap.empty) {
    const trekkingIds = [...new Set(winnendeResultatenSnap.docs.map(d => d.data().trekkingId as string))];
    let laatsteWinDatum: Date | null = null;

    for (const trekkingId of trekkingIds) {
      const trekkingSnap = await getDoc(doc(db, 'trekkingen', trekkingId));
      const datum = trekkingSnap.exists() ? trekkingSnap.data().datum?.toDate() : null;
      if (datum && (!laatsteWinDatum || datum > laatsteWinDatum)) {
        laatsteWinDatum = datum;
      }
    }

    if (laatsteWinDatum) {
      // Speelreeks begint de week ná de winnende trekking.
      const naWinst = new Date(laatsteWinDatum);
      naWinst.setDate(naWinst.getDate() + 7);
      vanafWeek = huidigTrekkingWeek(naWinst);
    }
  }

  // Stap 2: alle bevestigde betalingen ophalen, filteren op de
  // speelreeks-grens en op stortingen.
  const betalingenSnap = await getDocs(query(
    collection(db, 'betalingen'),
    where('status', '==', 'betaald')
  ));

  let pot = 0;
  betalingenSnap.forEach(d => {
    const data = d.data();
    if (data.isSaldoStorting === true) return;
    const week = data.trekkingWeek as string | undefined;
    if (!week) return;
    if (vanafWeek && week < vanafWeek) return;
    pot += (data.bedrag as number | undefined) ?? 0;
  });

  return pot;
}
