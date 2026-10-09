// Teste la recherche de créneaux sur toutes les demandes de réunion de la boîte
// fictive, à partir des résultats attendus (sans Gemini) : npm run tester-creneaux

import { trouverCreneau } from "./creneaux";
import { chargerBoiteReception, chargerCalendriers } from "./donnees";

const calendriers = chargerCalendriers();
const boite = chargerBoiteReception();
const demandes = boite.courriels.filter((c) => c.attendu.estReunion);

let trouves = 0;
let conflits = 0;

for (const c of demandes) {
  const participants = c.attendu.participants ?? [];
  const creneau = trouverCreneau(calendriers, {
    participants,
    dureeMinutes: c.attendu.dureeMinutes ?? null,
    fenetre: c.attendu.fenetre ?? null,
    plusTot: c.date,
  });

  if (!creneau) {
    console.log(`${c.id}  aucun créneau commun        ${c.objet}`);
    continue;
  }
  trouves++;

  // Vérification indépendante : aucun événement d'un participant ne chevauche le créneau.
  const enConflit = calendriers.evenements.some(
    (e) => participants.includes(e.proprietaire) && e.debut < creneau.fin && e.fin > creneau.debut,
  );
  if (enConflit) conflits++;

  const heureFin = creneau.fin.slice(11);
  console.log(`${c.id}  ${creneau.debut.replace("T", " ")} à ${heureFin}  ${enConflit ? "CONFLIT  " : ""}${c.objet}`);
}

console.log(`\nCréneaux trouvés : ${trouves}/${demandes.length}`);
console.log(`Conflits         : ${conflits}`);
if (conflits > 0) process.exit(1);
