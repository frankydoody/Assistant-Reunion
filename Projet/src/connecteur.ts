// Accès aux courriels et aux calendriers des utilisateurs.
//
// L'assistant ne parle qu'à cette interface. Pour le cours, la seule
// implémentation est le connecteur fictif (fichiers JSON en mémoire). Un
// connecteur Google (Gmail API + Google Agenda API, par OAuth) ou Microsoft
// (Microsoft Graph) pourrait l'implémenter plus tard sans changer l'assistant.

import type { Creneau } from "./creneaux";
import type { CourrielEnvoye } from "./modele";
import type { Calendriers, CourrielRecu, Preferences } from "./types";

export interface Connecteur {
  readonly nom: string;

  // Courriels
  proprietaire(): string; // adresse de la boîte surveillée
  nouveauxCourriels(): Promise<CourrielRecu[]>; // pas encore traités, du plus ancien au plus récent
  courriels(): Promise<{ courriel: CourrielRecu; traite: boolean }[]>; // toute la boîte, du plus récent au plus ancien
  marquerTraite(id: string): Promise<void>;
  envoyer(courriel: CourrielEnvoye): Promise<void>;
  envois(): Promise<CourrielEnvoye[]>;

  // Calendriers et configuration des utilisateurs
  lireCalendriers(): Promise<Calendriers>;
  creerEvenements(reunionId: string, titre: string, participants: string[], creneau: Creneau): Promise<void>;
  deplacerEvenements(reunionId: string, creneau: Creneau): Promise<void>;
  enregistrerPreferences(courriel: string, preferences: Preferences): Promise<void>;
}
