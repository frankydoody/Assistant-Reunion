// Teste la recherche de créneaux sur toutes les demandes de réunion de la boîte
// fictive, à partir des résultats attendus (sans Gemini) : npm run tester-creneaux
//
// Étape 1 : un créneau par demande, chacune traitée seule.
// Étape 2 : détection des créneaux en double (même moment, participant commun).
// Étape 3 : pour chaque groupe, une réunion prioritaire est choisie, puis les
//           autres sont replacées. Ici le choix de l'utilisateur est simulé :
//           la première demande reçue du groupe est prioritaire.

import {
  detecterGroupesEnConflit,
  planifierLot,
  trouverCreneau,
  type Creneau,
  type DemandeCreneau,
} from "./creneaux";
import { chargerBoiteReception, chargerCalendriers } from "./donnees";

const calendriers = chargerCalendriers();
const boite = chargerBoiteReception();
const courriels = boite.courriels.filter((c) => c.attendu.estReunion);
const objet = new Map(courriels.map((c) => [c.id, c.objet]));

const demandes: DemandeCreneau[] = courriels.map((c) => ({
  id: c.id,
  participants: c.attendu.participants ?? [],
  dureeMinutes: c.attendu.dureeMinutes ?? null,
  fenetre: c.attendu.fenetre ?? null,
  plusTot: c.date,
}));

const texte = (c: Creneau | null | undefined): string =>
  c ? `${c.debut.replace("T", " ")} à ${c.fin.slice(11)}` : "aucun créneau commun     ";

// Étape 1
const propositions = new Map(demandes.map((d) => [d.id, trouverCreneau(calendriers, d)]));

// Étape 2
const groupes = detecterGroupesEnConflit(demandes, propositions);
console.log(`Créneaux en double : ${groupes.length} groupe(s) à soumettre à l'utilisateur`);
const prioritaires = groupes.map((g) => g[0]); // choix simulé
groupes.forEach((g, i) => console.log(`  Groupe ${i + 1} : ${g.join(", ")}  (prioritaire simulée : ${g[0]})`));

// Étape 3
const final = planifierLot(calendriers, demandes, groupes, prioritaires);

console.log("\nHoraire final");
for (const d of demandes) {
  const avant = propositions.get(d.id);
  const apres = final.get(d.id);
  const deplacee = avant && apres && avant.debut !== apres.debut ? "  (replacée)" : "";
  console.log(`${d.id}  ${texte(apres)}  ${objet.get(d.id)}${deplacee}`);
}

// Vérifications indépendantes de la recherche.
let conflitsCalendrier = 0;
let conflitsEntreReunions = 0;
let horsPreferences = 0;
const diner = calendriers.heureDiner;

for (const d of demandes) {
  const c = final.get(d.id);
  if (!c) continue;
  if (calendriers.evenements.some((e) => d.participants.includes(e.proprietaire) && e.debut < c.fin && e.fin > c.debut)) {
    conflitsCalendrier++;
  }
  for (const autre of demandes) {
    const c2 = final.get(autre.id);
    if (autre.id <= d.id || !c2) continue;
    if (c.debut < c2.fin && c2.debut < c.fin && d.participants.some((p) => autre.participants.includes(p))) {
      conflitsEntreReunions++;
    }
  }
  const heureDebut = c.debut.slice(11);
  const heureFin = c.fin.slice(11);
  for (const u of calendriers.utilisateurs.filter((x) => d.participants.includes(x.courriel))) {
    const surDiner = heureDebut < diner.fin && heureFin > diner.debut;
    const horsBureau = heureDebut < calendriers.heuresBureau.debut || heureFin > calendriers.heuresBureau.fin;
    if ((surDiner && !u.preferences.reunionsSurHeureDiner) || (horsBureau && !u.preferences.reunionsHorsBureau)) {
      horsPreferences++;
    }
  }
}

const places = demandes.filter((d) => final.get(d.id)).length;
console.log(`\nRéunions placées                 : ${places}/${demandes.length}`);
console.log(`Conflits avec les calendriers    : ${conflitsCalendrier}`);
console.log(`Conflits entre réunions          : ${conflitsEntreReunions}`);
console.log(`Préférences non respectées       : ${horsPreferences}`);
if (conflitsCalendrier + conflitsEntreReunions + horsPreferences > 0) process.exit(1);
