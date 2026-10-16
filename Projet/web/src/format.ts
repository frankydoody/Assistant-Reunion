// Formatage pour l'affichage (les fonctions de dates viennent du serveur).

import type { EtatReponse, StatutReunion, Utilisateur } from "./types";
export { ajouterMinutes, formaterCreneau, formaterFenetre, formaterHeure, formaterJour, versMinutes, versTexte } from "../../src/dates";
import { formaterHeure, formaterJour } from "../../src/dates";

export const LIBELLE_STATUT: Record<StatutReunion, string> = {
  a_confirmer: "À confirmer",
  conflit: "Créneau en double",
  date_a_confirmer: "Date à confirmer",
  en_attente_reponses: "En attente des réponses",
  intervention_requise: "Décision requise",
  planifiee: "Planifiée",
  ignoree: "Écartée",
};

export const TON_STATUT: Record<StatutReunion, string> = {
  a_confirmer: "bleu",
  conflit: "jaune",
  date_a_confirmer: "jaune",
  en_attente_reponses: "neutre",
  intervention_requise: "rouge",
  planifiee: "vert",
  ignoree: "neutre",
};

export const LIBELLE_REPONSE: Record<EtatReponse, string> = {
  en_attente: "En attente",
  acceptation: "Accepte",
  refus: "Refuse",
  deplacement: "Autre moment",
};

export const TON_REPONSE: Record<EtatReponse, string> = {
  en_attente: "neutre",
  acceptation: "vert",
  refus: "rouge",
  deplacement: "jaune",
};

const COULEURS = ["#1a73e8", "#1e8e3e", "#e37400", "#d93025", "#8430ce", "#007b83"];

export function annuaire(utilisateurs: Utilisateur[]) {
  const index = new Map(utilisateurs.map((u, i) => [u.courriel, i]));
  return {
    nom: (courriel: string) => utilisateurs[index.get(courriel) ?? -1]?.nom ?? courriel,
    prenom: (courriel: string) => (utilisateurs[index.get(courriel) ?? -1]?.nom ?? courriel).split(" ")[0],
    couleur: (courriel: string) => COULEURS[(index.get(courriel) ?? 5) % COULEURS.length],
  };
}

export function initiales(nom: string): string {
  return nom
    .split(/[\s.@]+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((m) => m[0].toUpperCase())
    .join("");
}

export function dateCourte(texte: string): string {
  return `${formaterJour(texte).replace(/ \d{4}$/, "")}, ${formaterHeure(texte)}`;
}

export function duree(minutes: number): string {
  if (minutes < 60) return `${minutes} min`;
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  return m ? `${h} h ${String(m).padStart(2, "0")}` : `${h} h`;
}
