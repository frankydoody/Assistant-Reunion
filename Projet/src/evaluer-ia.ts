// Évaluation de l'IA sur les données fictives : npm run evaluer-ia
//
// Mesure, pour l'analyseur configuré (Gemini si une clé est présente) :
// - la détection des demandes de réunion sur les 30 courriels;
// - l'extraction des champs sur les 20 demandes (sujet, participants, durée, dates);
// - l'interprétation des 10 réponses de participants;
// - le temps de traitement par appel.
// Les résultats détaillés sont enregistrés dans resultats/.
//
// Avec l'IA simulée, tout doit donner 100 % : cela vérifie seulement que la
// mesure elle-même fonctionne.

import { mkdirSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { config, RACINE_PROJET } from "./config";
import { trouverCreneau, type Creneau } from "./creneaux";
import { chargerBoiteReception, chargerCalendriers, chargerReponses } from "./donnees";
import { creerAnalyseur } from "./ia";
import { VERSION_PROMPTS } from "./prompts";
import type { Courriel, Fenetre } from "./types";
import { validerAnalyse, validerInterpretation } from "./validation";

const calendriers = chargerCalendriers();
const boite = chargerBoiteReception();
const reponses = chargerReponses();
const analyseur = creerAnalyseur();
const estGemini = analyseur.nom.startsWith("gemini");
const contexte = {
  entreprise: calendriers.entreprise,
  utilisateurs: calendriers.utilisateurs,
  proprietaire: boite.proprietaire,
  heuresBureau: calendriers.heuresBureau,
};
const plage = calendriers.utilisateurs.find((u) => u.courriel === boite.proprietaire)!.preferences.plageRechercheJours;
const attendre = (ms: number) => new Promise((r) => setTimeout(r, ms));

// Mots significatifs d'un sujet, sans accents ni petits mots.
const MOTS_VIDES = new Set(["avec", "pour", "dans", "sans", "entre", "chez", "cette", "notre", "votre", "leur", "plus", "nouveau", "nouvelle"]);
function mots(texte: string): string[] {
  return texte
    .normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase()
    .split(/[^a-z0-9]+/)
    .filter((m) => m.length >= 4 && !MOTS_VIDES.has(m));
}

// Le sujet est correct si au moins la moitié des mots significatifs attendus s'y trouvent.
function sujetCorrect(attendu: string, obtenu: string | null): boolean {
  if (!obtenu) return false;
  const attendus = mots(attendu);
  const trouves = new Set(mots(obtenu));
  return attendus.filter((m) => trouves.has(m)).length >= Math.ceil(attendus.length / 2);
}

// Les dates sont correctes si elles mènent au même créneau que les dates
// attendues (même participants, même durée). Une différence sans effet sur
// la planification, comme 9 h au lieu de l'heure de réception, n'est pas
// comptée comme une erreur.
function creneauPour(c: Courriel, fenetre: Fenetre | null): Creneau | null {
  return trouverCreneau(calendriers, {
    id: c.id,
    participants: c.attendu.participants ?? [],
    dureeMinutes: c.attendu.dureeMinutes ?? null,
    fenetre,
    plusTot: c.date,
    plageRechercheJours: plage,
  });
}
function fenetreCorrecte(c: Courriel, obtenue: Fenetre | null): boolean {
  return creneauPour(c, c.attendu.fenetre ?? null)?.debut === creneauPour(c, obtenue)?.debut;
}

const memesParticipants = (a: string[], b: string[]) => a.length === b.length && a.every((p) => b.includes(p));

console.log(`IA évaluée : ${analyseur.nom}   (prompts ${VERSION_PROMPTS})`);
if (!estGemini) console.log("Attention : IA simulée. Les résultats vérifient la mesure, pas la qualité de Gemini.\n");

const temps: number[] = [];
const detailsCourriels = [];
let detectionsCorrectes = 0;
const champs = { sujet: 0, participants: 0, duree: 0, dates: 0 };
const demandes = boite.courriels.filter((c) => c.attendu.estReunion).length;

for (const c of boite.courriels) {
  const debut = performance.now();
  let analyse = null;
  let erreur: string | null = null;
  let avertissements: string[] = [];
  try {
    ({ analyse, avertissements } = validerAnalyse(await analyseur.analyserCourriel(c, contexte), c, contexte));
  } catch (e) {
    erreur = e instanceof Error ? e.message : String(e);
  }
  const ms = Math.round(performance.now() - debut);
  temps.push(ms);

  const detection = analyse !== null && analyse.estReunion === c.attendu.estReunion;
  if (detection) detectionsCorrectes++;
  const resultat = { sujet: false, participants: false, duree: false, dates: false };
  if (c.attendu.estReunion && analyse?.estReunion) {
    resultat.sujet = sujetCorrect(c.attendu.sujet ?? "", analyse.sujet);
    resultat.participants = memesParticipants(c.attendu.participants ?? [], analyse.participants);
    resultat.duree = (c.attendu.dureeMinutes ?? null) === analyse.dureeMinutes;
    resultat.dates = fenetreCorrecte(c, analyse.fenetre);
    for (const k of Object.keys(champs) as (keyof typeof champs)[]) if (resultat[k]) champs[k]++;
  }
  const marques = c.attendu.estReunion ? Object.entries(resultat).filter(([, ok]) => !ok).map(([k]) => k) : [];
  console.log(
    `${c.id}  ${detection ? "ok " : "ERR"}  ${erreur ? `erreur : ${erreur}` : marques.length ? `champs incorrects : ${marques.join(", ")}` : ""}  (${ms} ms)`,
  );
  detailsCourriels.push({ id: c.id, attendu: c.attendu, obtenu: analyse, avertissements, erreur, ms, detection, champs: resultat });
  if (estGemini) await attendre(config.delaiEntreAppelsMs);
}

console.log("");
const detailsReponses = [];
let reponsesCorrectes = 0;
for (const test of reponses) {
  const demande = boite.courriels.find((c) => c.id === test.demande)!;
  const creneau = creneauPour(demande, demande.attendu.fenetre ?? null) ?? { debut: test.date, fin: test.date };
  const courriel = { id: test.id, de: test.de, a: [boite.proprietaire], date: test.date, objet: `Re: Invitation : ${demande.attendu.sujet}`, corps: test.corps };
  const debut = performance.now();
  let obtenu = null;
  let erreur: string | null = null;
  try {
    obtenu = validerInterpretation(await analyseur.interpreterReponse(courriel, { sujet: demande.attendu.sujet ?? "", creneau }), courriel);
  } catch (e) {
    erreur = e instanceof Error ? e.message : String(e);
  }
  const ms = Math.round(performance.now() - debut);
  temps.push(ms);
  const correct = obtenu?.type === test.attendu.type;
  if (correct) reponsesCorrectes++;
  console.log(`${test.id}  ${correct ? "ok " : "ERR"}  attendu : ${test.attendu.type}, obtenu : ${obtenu?.type ?? erreur}  (${ms} ms)`);
  detailsReponses.push({ id: test.id, attendu: test.attendu, obtenu, erreur, ms, correct });
  if (estGemini) await attendre(config.delaiEntreAppelsMs);
}

const pct = (n: number, d: number) => `${((100 * n) / d).toFixed(1)} %`;
const totalChamps = champs.sujet + champs.participants + champs.duree + champs.dates;
const moyenne = Math.round(temps.reduce((a, b) => a + b, 0) / temps.length);
const resume = {
  detection: pct(detectionsCorrectes, boite.courriels.length),
  champs: pct(totalChamps, demandes * 4),
  champsDetail: Object.fromEntries(Object.entries(champs).map(([k, v]) => [k, pct(v, demandes)])),
  reponses: pct(reponsesCorrectes, reponses.length),
  tempsMoyenMs: moyenne,
  tempsMaxMs: Math.max(...temps),
};

console.log(`
Détection des demandes      : ${detectionsCorrectes}/${boite.courriels.length}  (${resume.detection}, cible 90 %)
Champs extraits correctement : ${totalChamps}/${demandes * 4}  (${resume.champs}, cible 85 %)
   sujet ${resume.champsDetail.sujet}, participants ${resume.champsDetail.participants}, durée ${resume.champsDetail.duree}, dates ${resume.champsDetail.dates}
Réponses interprétées        : ${reponsesCorrectes}/${reponses.length}  (${resume.reponses}, cible 90 %)
Temps par appel              : moyenne ${moyenne} ms, maximum ${resume.tempsMaxMs} ms  (cible : moins de 30 s)`);

const horodatage = new Date().toISOString().replace(/[:.]/g, "-").slice(0, 19);
const dossier = join(RACINE_PROJET, "resultats");
mkdirSync(dossier, { recursive: true });
const fichier = join(dossier, `evaluation-${estGemini ? "gemini" : "simulee"}-${horodatage}.json`);
writeFileSync(
  fichier,
  JSON.stringify({ date: new Date().toISOString(), ia: analyseur.nom, prompts: VERSION_PROMPTS, resume, courriels: detailsCourriels, reponses: detailsReponses }, null, 2),
);
console.log(`\nRésultats détaillés : resultats/${fichier.split(/[\\/]/).pop()}`);
