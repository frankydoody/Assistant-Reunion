// Recherche de créneaux communs libres. Code déterministe : aucune IA ici.
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
  id: string;
  participants: string[]; // courriels
  dureeMinutes: number | null;
  fenetre: Fenetre | null;
  plusTot: string; // jamais avant ce moment (date de réception du courriel)
}

// Une réunion déjà placée, qui occupe ses participants.
export interface ReunionPlacee {
  participants: string[];
  creneau: Creneau;
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

function partagentUnParticipant(a: string[], b: string[]): boolean {
  return a.some((p) => b.includes(p));
}

// Retourne le premier créneau où tous les participants sont libres, ou null.
// Les préférences de chaque participant sont respectées : heure du dîner et
// heures hors bureau. `dejaPlacees` contient les réunions placées par
// l'assistant qui ne sont pas encore dans les calendriers.
export function trouverCreneau(
  calendriers: Calendriers,
  demande: DemandeCreneau,
  dejaPlacees: ReunionPlacee[] = [],
): Creneau | null {
  const duree = demande.dureeMinutes ?? DUREE_PAR_DEFAUT_MINUTES;
  const plusTot = versMinutes(demande.plusTot);
  const debutFenetre = demande.fenetre ? versMinutes(demande.fenetre.debut) : plusTot;
  const finFenetre = demande.fenetre
    ? versMinutes(demande.fenetre.fin)
    : plusTot + FENETRE_PAR_DEFAUT_JOURS * 24 * 60;

  const bureau = {
    debut: minutesDuJour(calendriers.heuresBureau.debut),
    fin: minutesDuJour(calendriers.heuresBureau.fin),
  };
  const etendues = {
    debut: minutesDuJour(calendriers.heuresEtendues.debut),
    fin: minutesDuJour(calendriers.heuresEtendues.fin),
  };
  const diner = {
    debut: minutesDuJour(calendriers.heureDiner.debut),
    fin: minutesDuJour(calendriers.heureDiner.fin),
  };

  const membres = calendriers.utilisateurs.filter((u) => demande.participants.includes(u.courriel));
  // La plage permise est celle du participant le plus restrictif.
  const tousHorsBureau = membres.every((u) => u.preferences.reunionsHorsBureau);
  const plage = tousHorsBureau ? etendues : bureau;
  const dinerBloque = membres.some((u) => !u.preferences.reunionsSurHeureDiner);

  const occupes = [
    ...calendriers.evenements
      .filter((e) => demande.participants.includes(e.proprietaire))
      .map((e) => ({ debut: versMinutes(e.debut), fin: versMinutes(e.fin) })),
    ...dejaPlacees
      .filter((r) => partagentUnParticipant(r.participants, demande.participants))
      .map((r) => ({ debut: versMinutes(r.creneau.debut), fin: versMinutes(r.creneau.fin) })),
  ];

  const depart = Math.ceil(Math.max(debutFenetre, plusTot) / PAS_MINUTES) * PAS_MINUTES;

  for (let debut = depart; debut + duree <= finFenetre; debut += PAS_MINUTES) {
    const fin = debut + duree;
    const jourSemaine = new Date(debut * 60000).getUTCDay(); // 0 = dimanche, 6 = samedi
    if (jourSemaine === 0 || jourSemaine === 6) continue;

    const minuteDebut = debut % (24 * 60);
    const minuteFin = minuteDebut + duree;
    if (minuteDebut < plage.debut || minuteFin > plage.fin) continue;
    if (dinerBloque && minuteDebut < diner.fin && minuteFin > diner.debut) continue;

    const conflit = occupes.some((o) => o.debut < fin && o.fin > debut);
    if (!conflit) return { debut: versTexte(debut), fin: versTexte(fin) };
  }
  return null;
}

function seChevauchent(a: Creneau, b: Creneau): boolean {
  return a.debut < b.fin && b.debut < a.fin;
}

// Regroupe les demandes dont les créneaux proposés se chevauchent alors
// qu'elles ont au moins un participant en commun. Chaque groupe retourné
// (2 demandes ou plus) doit être soumis à l'utilisateur, qui choisit la
// réunion prioritaire.
export function detecterGroupesEnConflit(
  demandes: DemandeCreneau[],
  propositions: Map<string, Creneau | null>,
): string[][] {
  const groupeDe = new Map<string, string>(demandes.map((d) => [d.id, d.id]));
  const racine = (id: string): string => {
    let r = id;
    while (groupeDe.get(r) !== r) r = groupeDe.get(r)!;
    return r;
  };

  for (let i = 0; i < demandes.length; i++) {
    for (let j = i + 1; j < demandes.length; j++) {
      const a = propositions.get(demandes[i].id);
      const b = propositions.get(demandes[j].id);
      if (!a || !b) continue;
      if (seChevauchent(a, b) && partagentUnParticipant(demandes[i].participants, demandes[j].participants)) {
        groupeDe.set(racine(demandes[j].id), racine(demandes[i].id));
      }
    }
  }

  const groupes = new Map<string, string[]>();
  for (const d of demandes) {
    const r = racine(d.id);
    groupes.set(r, [...(groupes.get(r) ?? []), d.id]);
  }
  return [...groupes.values()].filter((g) => g.length > 1);
}

// Place toutes les demandes sans aucun chevauchement. Ordre de placement :
// 1) les demandes sans conflit (elles gardent leur créneau);
// 2) les réunions choisies comme prioritaires par l'utilisateur;
// 3) les autres demandes en conflit, par ordre de réception, replacées
//    autour des réunions déjà placées.
export function planifierLot(
  calendriers: Calendriers,
  demandes: DemandeCreneau[],
  groupes: string[][],
  prioritaires: string[],
): Map<string, Creneau | null> {
  const enConflit = new Set(groupes.flat());
  const rang = (d: DemandeCreneau): number =>
    !enConflit.has(d.id) ? 0 : prioritaires.includes(d.id) ? 1 : 2;
  const ordre = [...demandes].sort((a, b) => rang(a) - rang(b) || a.plusTot.localeCompare(b.plusTot));

  const placees: ReunionPlacee[] = [];
  const resultat = new Map<string, Creneau | null>();
  for (const d of ordre) {
    const creneau = trouverCreneau(calendriers, d, placees);
    resultat.set(d.id, creneau);
    if (creneau) placees.push({ participants: d.participants, creneau });
  }
  return resultat;
}
