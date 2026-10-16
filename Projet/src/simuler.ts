// Scénario complet avec l'IA simulée : npm run simuler
//
// 1. lecture des 30 courriels; 2. choix des réunions prioritaires (simulé);
// 3. confirmation de toutes les réunions; 4. réponses des participants;
// 5. décisions de l'utilisateur quand il doit intervenir; 6. vérifications.
// Les choix de l'utilisateur sont simulés par des règles fixes, indiquées à
// chaque étape.

import { Assistant } from "./assistant";
import { ConnecteurFictif } from "./connecteur-fictif";
import { formaterCreneau } from "./dates";
import { chargerBoiteReception, chargerCalendriers, chargerReponses } from "./donnees";
import { creerAnalyseurSimule } from "./ia";
import type { Reunion } from "./modele";
import { courrielDeReponse } from "./simulation";

// Réunions confirmées en suivi automatique; les autres sont en suivi manuel.
const SUIVI_AUTOMATIQUE = new Set(["R-M02", "R-M08", "R-M20"]);
// En intervention, l'utilisateur passe ces réunions en automatique; pour les
// autres, il choisit lui-même la suggestion de l'assistant.
const BASCULE_AUTOMATIQUE = new Set(["R-M04"]);

const calendriersInitiaux = chargerCalendriers();
const connecteur = new ConnecteurFictif(calendriersInitiaux, chargerBoiteReception());
const assistant = new Assistant(connecteur, creerAnalyseurSimule());
const nom = (courriel: string) => calendriersInitiaux.utilisateurs.find((u) => u.courriel === courriel)?.nom ?? courriel;
const quand = (r: Reunion) => (r.creneau ? formaterCreneau(r.creneau) : "aucun créneau");
const titre = (t: string) => console.log(`\n=== ${t} ===`);

function compterStatuts(): string {
  const n = new Map<string, number>();
  for (const r of assistant.listerReunions()) n.set(r.statut, (n.get(r.statut) ?? 0) + 1);
  return [...n].map(([s, k]) => `${s} : ${k}`).join(", ");
}

titre("1. Lecture de la boîte de réception");
const lecture = await assistant.traiterNouveauxCourriels();
console.log(
  `${lecture.courrielsTraites} courriels lus : ${lecture.reunionsDetectees.length} demandes de réunion, ${lecture.courrielsSansRapport} sans rapport, ${lecture.erreurs.length} erreur(s).`,
);
console.log(`Statuts : ${compterStatuts()}`);

titre("2. Créneaux en double (choix simulé : la première demande reçue est prioritaire)");
for (let r = assistant.listerReunions().find((x) => x.statut === "conflit"); r; r = assistant.listerReunions().find((x) => x.statut === "conflit")) {
  const membres = assistant.listerReunions().filter((x) => x.groupeConflit === r!.groupeConflit);
  console.log(`Groupe ${r.groupeConflit} : ${membres.map((m) => m.id).join(", ")}  →  prioritaire : ${membres[0].id}`);
  await assistant.choisirPrioritaire(membres[0].id);
}
console.log(`Statuts : ${compterStatuts()}`);

titre("3. Confirmation par l'utilisateur");
for (
  let r = assistant.listerReunions().find((x) => x.statut === "a_confirmer" || x.statut === "date_a_confirmer");
  r;
  r = assistant.listerReunions().find((x) => x.statut === "a_confirmer" || x.statut === "date_a_confirmer")
) {
  const mode = SUIVI_AUTOMATIQUE.has(r.id) ? "automatique" : "manuel";
  if (r.statut === "date_a_confirmer") {
    if (!r.suggestion) {
      await assistant.ignorer(r.id);
      console.log(`${r.id}  écartée : aucune date possible`);
      continue;
    }
    await assistant.confirmer(r.id, mode, r.suggestion.debut);
    console.log(`${r.id}  ${mode.padEnd(11)}  ${quand(r)}  (date vérifiée et confirmée par l'utilisateur)`);
  } else {
    await assistant.confirmer(r.id, mode);
    console.log(`${r.id}  ${mode.padEnd(11)}  ${quand(r)}`);
  }
}

titre("4. Réponses des participants");
for (const test of chargerReponses()) {
  const r = assistant.obtenir(`R-${test.demande}`);
  connecteur.recevoir(courrielDeReponse(test, r, connecteur.proprietaire()));
  const resultat = await assistant.traiterNouveauxCourriels();
  if (resultat.erreurs.length) console.log(`${test.id}  ERREUR : ${resultat.erreurs[0].message}`);
  const dernier = r.historique.slice(-1)[0]?.evenement ?? "";
  console.log(`${test.id}  ${nom(test.de).padEnd(16)} ${r.id}  ${r.statut.padEnd(20)}  ${dernier}`);
}

titre("5. Décisions de l'utilisateur après un refus ou une demande de déplacement");
for (const r of assistant.listerReunions().filter((x) => x.statut === "intervention_requise")) {
  console.log(`${r.id}  motif : ${r.motif}`);
  if (BASCULE_AUTOMATIQUE.has(r.id)) {
    await assistant.changerMode(r.id, "automatique");
    console.log(`        → l'utilisateur passe en suivi automatique : ${quand(r)}`);
  } else if (r.suggestion) {
    await assistant.choisirCreneau(r.id, r.suggestion.debut);
    console.log(`        → l'utilisateur choisit lui-même la suggestion : ${quand(r)}`);
  }
}

titre("6. Bilan");
for (const r of assistant.listerReunions()) {
  const attente = Object.entries(r.reponses).filter(([, e]) => e === "en_attente").map(([p]) => nom(p).split(" ")[0]);
  console.log(
    `${r.id.padEnd(6)} ${r.statut.padEnd(20)} v${r.version}  ${quand(r).padEnd(44)} ${attente.length ? `attend : ${attente.join(", ")}` : ""}`,
  );
}

// Vérifications indépendantes de l'assistant.
const cal = await connecteur.lireCalendriers();
const envois = await connecteur.envois();
const erreurs: string[] = [];

for (const u of cal.utilisateurs) {
  const evs = cal.evenements.filter((e) => e.proprietaire === u.courriel).sort((a, b) => a.debut.localeCompare(b.debut));
  for (let i = 1; i < evs.length; i++) {
    if (evs[i].debut < evs[i - 1].fin) erreurs.push(`Chevauchement pour ${u.nom} : « ${evs[i - 1].titre} » et « ${evs[i].titre} »`);
  }
}
for (const r of assistant.listerReunions().filter((x) => x.version > 0)) {
  const evs = cal.evenements.filter((e) => e.reunionId === r.id);
  if (evs.length !== r.participants.length || evs.some((e) => e.debut !== r.creneau?.debut)) {
    erreurs.push(`${r.id} : les calendriers ne correspondent pas au créneau de la réunion`);
  }
  if (!envois.some((e) => e.id === `INV-${r.id}-v${r.version}`) && r.participants.length > 1) {
    erreurs.push(`${r.id} : invitation de la version ${r.version} introuvable`);
  }
  if (r.replanifications > 2) erreurs.push(`${r.id} : plus de 2 replanifications automatiques`);
}

console.log(`\nStatuts finaux       : ${compterStatuts()}`);
console.log(`Courriels envoyés    : ${envois.filter((e) => e.type === "invitation").length} invitations, ${envois.filter((e) => e.type === "mise_a_jour").length} mises à jour`);
console.log(`Vérifications        : ${erreurs.length === 0 ? "aucun chevauchement dans les calendriers, calendriers et invitations cohérents" : ""}`);
for (const e of erreurs) console.log(`  ERREUR : ${e}`);
if (erreurs.length > 0) process.exit(1);
