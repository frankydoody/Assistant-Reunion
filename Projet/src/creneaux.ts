// Recherche du premier créneau commun libre. Code déterministe : aucune IA ici.
// Les dates sont des chaînes locales AAAA-MM-JJTHH:MM; les calculs se font en
// minutes pour ne dépendre d'aucun fuseau horaire.

import type { Calendriers, Fenetre } from "./types";

export const DUREE_PAR_DEFAUT_MINUTES = 30; // si le courriel ne précise pas la durée
export const FENETRE_PAR_DEFAUT_JOURS = 7; // si le courriel ne précise aucune date
const PAS_MINUTES = 15; // les réunions commencent à l'heure, au quart ou à la demie

export interface Creneau {
  debut: string;
  fin: string;
}

export interface DemandeCreneau {
  participants: string[]; // courriels
  dureeMinutes: number | null;
  fenetre: Fenetre | null;
  plusTot: string; // jamais avant ce moment (date de réception du courriel)
}

function versMinutes(texte: string): number {
  const [date, heure] = texte.split("T");
  const [annee, mois, jour] = date.split("-").map(Number);
  const [h, m] = heure.split(":").map(Number);
  return Date.UTC(annee, mois - 1, jour, h, m) / 60000;
}

function versTexte(minutes: number): string {
  return new Date(minutes * 60000).toISOString().slice(0, 16);
}

function minutesDuJour(heure: string): number {
  const [h, m] = heure.split(":").map(Number);
  return h * 60 + m;
}

// Retourne le premier créneau où tous les participants sont libres, ou null.
export function trouverCreneau(calendriers: Calendriers, demande: DemandeCreneau): Creneau | null {
  const duree = demande.dureeMinutes ?? DUREE_PAR_DEFAUT_MINUTES;
  const plusTot = versMinutes(demande.plusTot);
  const debutFenetre = demande.fenetre ? versMinutes(demande.fenetre.debut) : plusTot;
  const finFenetre = demande.fenetre
    ? versMinutes(demande.fenetre.fin)
    : plusTot + FENETRE_PAR_DEFAUT_JOURS * 24 * 60;

  const ouverture = minutesDuJour(calendriers.heuresBureau.debut);
  const fermeture = minutesDuJour(calendriers.heuresBureau.fin);

  const occupes = calendriers.evenements
    .filter((e) => demande.participants.includes(e.proprietaire))
    .map((e) => ({ debut: versMinutes(e.debut), fin: versMinutes(e.fin) }));

  const depart = Math.ceil(Math.max(debutFenetre, plusTot) / PAS_MINUTES) * PAS_MINUTES;

  for (let debut = depart; debut + duree <= finFenetre; debut += PAS_MINUTES) {
    const fin = debut + duree;
    const jourSemaine = new Date(debut * 60000).getUTCDay(); // 0 = dimanche, 6 = samedi
    if (jourSemaine === 0 || jourSemaine === 6) continue;

    const minuteDebut = debut % (24 * 60);
    if (minuteDebut < ouverture || minuteDebut + duree > fermeture) continue;

    const conflit = occupes.some((o) => o.debut < fin && o.fin > debut);
    if (!conflit) return { debut: versTexte(debut), fin: versTexte(fin) };
  }
  return null;
}
