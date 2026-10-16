// Vérifie que les données fictives sont cohérentes : npm run verifier-donnees

import { chargerBoiteReception, chargerCalendriers, chargerReponses, validerDonnees, validerReponses } from "./donnees";

const calendriers = chargerCalendriers();
const boite = chargerBoiteReception();

const demandes = boite.courriels.filter((c) => c.attendu.estReunion).length;

console.log(`Entreprise   : ${calendriers.entreprise}`);
console.log(`Utilisateurs : ${calendriers.utilisateurs.length}`);
console.log(`Événements   : ${calendriers.evenements.length}`);
console.log(`Courriels    : ${boite.courriels.length} (${demandes} demandes de réunion, ${boite.courriels.length - demandes} sans rapport)`);

const reponses = chargerReponses();
console.log(`Réponses      : ${reponses.length} réponses fictives de participants`);

const erreurs = [...validerDonnees(calendriers, boite), ...validerReponses(boite, reponses)];
if (erreurs.length > 0) {
  console.error(`\n${erreurs.length} erreur(s) dans les données :`);
  for (const erreur of erreurs) console.error(` - ${erreur}`);
  process.exit(1);
}
console.log("\nDonnées valides.");
