// Types partagés avec le serveur (importés sans code) et types propres à l'interface.

export type { CourrielEnvoye, EtatReponse, ModeSuivi, Reunion, StatutReunion } from "../../src/modele";
export type { Calendriers, CourrielRecu, Evenement, Preferences, Utilisateur } from "../../src/types";
import type { CourrielRecu, Utilisateur } from "../../src/types";
import type { Reunion } from "../../src/modele";

export interface Fournisseur {
  id: string;
  nom: string;
  description: string;
  disponible: boolean;
  raison: string;
}

export interface Session {
  connecte: boolean;
  mode: "demo" | null;
  utilisateur: Utilisateur | null;
  entreprise: string | null;
  ia: string;
  iaReelle: boolean;
  fournisseurs: Fournisseur[];
}

export interface Progression {
  enCours: boolean;
  total: number;
  traites: number;
  erreurs: { courriel: string; message: string }[];
  dernierResultat: { reunionsDetectees: string[]; courrielsSansRapport: number; reponsesTraitees: number } | null;
}

export interface Etat {
  ia: string;
  proprietaire: string;
  utilisateurs: Utilisateur[];
  reunions: Reunion[];
  progression: Progression;
}

export interface CourrielBoite extends CourrielRecu {
  traite: boolean;
  reunionId: string | null;
}

export interface ReponseDemo {
  id: string;
  demande: string;
  de: string;
  corps: string;
  reunionId: string | null;
  disponible: boolean;
  dejaEnvoyee: boolean;
}
