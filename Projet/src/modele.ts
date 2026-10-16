// Modèle de l'assistant : les réunions qu'il gère et leur cycle de vie.
// Le diagramme des états est dans Documentations/architecture.md.

import type { Creneau } from "./creneaux";
import type { Fenetre, TypeReponse } from "./types";

export type ModeSuivi = "automatique" | "manuel";
export type EtatReponse = "en_attente" | TypeReponse;

export type StatutReunion =
  | "a_confirmer" // créneau proposé, l'utilisateur doit confirmer
  | "conflit" // créneau en double : l'utilisateur doit choisir la réunion prioritaire du groupe
  | "date_a_confirmer" // aucune place dans les dates demandées : l'utilisateur vérifie et confirme une date
  | "en_attente_reponses" // invitation envoyée, réponses des participants attendues
  | "intervention_requise" // refus ou autre moment demandé : l'utilisateur doit décider
  | "planifiee" // tous les participants ont accepté
  | "ignoree"; // l'utilisateur a écarté la demande

// Résultat validé de l'analyse d'un courriel par l'IA.
export interface AnalyseCourriel {
  estReunion: boolean;
  sujet: string | null;
  participants: string[];
  dureeMinutes: number | null; // null : non précisée
  fenetre: Fenetre | null; // null : aucune contrainte de date
}

// Résultat validé de l'interprétation d'une réponse de participant.
export interface InterpretationReponse {
  type: TypeReponse;
  fenetre: Fenetre | null; // moment proposé par le participant, s'il y en a un
}

export interface Reunion {
  id: string; // R-<identifiant du courriel source>
  courrielSource: string;
  objetCourriel: string;
  demandeur: string;
  recueLe: string;

  // Extrait par l'IA, puis validé
  sujet: string;
  participants: string[];
  dureeMinutes: number;
  dureeParDefaut: boolean; // vrai si le courriel ne précisait pas la durée
  fenetre: Fenetre | null;
  avertissements: string[]; // corrections faites par la validation

  // Planification
  statut: StatutReunion;
  creneau: Creneau | null;
  suggestion: Creneau | null; // proposée à l'utilisateur quand il doit décider
  groupeConflit: string | null;
  motif: string | null; // pourquoi l'utilisateur doit intervenir

  // Suivi après l'envoi
  modeSuivi: ModeSuivi | null;
  version: number; // 0 : aucune invitation; augmente à chaque replanification
  reponses: Record<string, EtatReponse>;
  replanifications: number; // replanifications automatiques depuis la dernière décision de l'utilisateur
  creneauxRefuses: Creneau[];
  derniereDemande: { fenetre: Fenetre | null; plusTot: string } | null; // dernier refus ou déplacement

  historique: { quand: string; evenement: string }[];
}

export interface CourrielEnvoye {
  id: string; // INV-<réunion>-v<version>
  type: "invitation" | "mise_a_jour";
  a: string[];
  objet: string;
  corps: string;
  reunionId: string;
  version: number;
}
