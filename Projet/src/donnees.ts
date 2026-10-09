// Chargement et validation des données fictives (dossier donnees/).

import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import type { BoiteReception, Calendriers } from "./types";

const DOSSIER_DONNEES = join(dirname(fileURLToPath(import.meta.url)), "..", "donnees");

function lireJson<T>(nomFichier: string): T {
  return JSON.parse(readFileSync(join(DOSSIER_DONNEES, nomFichier), "utf8")) as T;
}

export function chargerCalendriers(): Calendriers {
  return lireJson<Calendriers>("calendriers.json");
}

export function chargerBoiteReception(): BoiteReception {
  return lireJson<BoiteReception>("boite-reception.json");
}

const FORMAT_DATE = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}$/;

function dateValide(valeur: string): boolean {
  return FORMAT_DATE.test(valeur) && !Number.isNaN(new Date(valeur).getTime());
}

// Retourne la liste des erreurs trouvées dans les données (vide si tout est correct).
export function validerDonnees(calendriers: Calendriers, boite: BoiteReception): string[] {
  const erreurs: string[] = [];
  const connus = new Set(calendriers.utilisateurs.map((u) => u.courriel));

  for (const u of calendriers.utilisateurs) {
    const p = u.preferences;
    if (!p || typeof p.reunionsSurHeureDiner !== "boolean" || typeof p.reunionsHorsBureau !== "boolean") {
      erreurs.push(`Utilisateur ${u.courriel} : préférences manquantes ou invalides`);
    }
  }

  for (const e of calendriers.evenements) {
    const nom = `Événement « ${e.titre} » (${e.debut})`;
    if (!connus.has(e.proprietaire)) erreurs.push(`${nom} : propriétaire inconnu ${e.proprietaire}`);
    if (!dateValide(e.debut) || !dateValide(e.fin)) erreurs.push(`${nom} : date invalide`);
    else if (e.debut >= e.fin) erreurs.push(`${nom} : le début doit précéder la fin`);
  }

  // Deux événements d'un même utilisateur ne doivent pas se chevaucher.
  for (const courriel of connus) {
    const tries = calendriers.evenements
      .filter((e) => e.proprietaire === courriel)
      .sort((a, b) => a.debut.localeCompare(b.debut));
    for (let i = 1; i < tries.length; i++) {
      if (tries[i].debut < tries[i - 1].fin) {
        erreurs.push(`Chevauchement pour ${courriel} : « ${tries[i - 1].titre} » et « ${tries[i].titre} »`);
      }
    }
  }

  if (!connus.has(boite.proprietaire)) erreurs.push(`Propriétaire de la boîte inconnu : ${boite.proprietaire}`);

  const ids = new Set<string>();
  for (const c of boite.courriels) {
    if (ids.has(c.id)) erreurs.push(`Courriel ${c.id} : identifiant en double`);
    ids.add(c.id);
    if (!dateValide(c.date)) erreurs.push(`Courriel ${c.id} : date invalide`);
    if (!c.attendu.estReunion) continue;

    const participants = c.attendu.participants ?? [];
    if (participants.length < 2) erreurs.push(`Courriel ${c.id} : au moins 2 participants attendus`);
    for (const p of participants) {
      if (!connus.has(p)) erreurs.push(`Courriel ${c.id} : participant inconnu ${p}`);
    }
    const f = c.attendu.fenetre;
    if (f) {
      if (!dateValide(f.debut) || !dateValide(f.fin)) erreurs.push(`Courriel ${c.id} : fenêtre invalide`);
      else if (f.debut >= f.fin) erreurs.push(`Courriel ${c.id} : fenêtre inversée`);
    }
  }

  return erreurs;
}
