// Chargement et validation des données fictives (dossier donnees/).

import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { estDateValide } from "./dates";
import type { BoiteReception, Calendriers, ReponseTest } from "./types";

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

export function chargerReponses(): ReponseTest[] {
  return lireJson<{ reponses: ReponseTest[] }>("reponses.json").reponses;
}

// Vérifie les réponses fictives de participants : chacune doit répondre à une
// demande de réunion existante, venir d'un de ses participants (autre que le
// propriétaire de la boîte) et avoir un résultat attendu valide.
export function validerReponses(boite: BoiteReception, reponses: ReponseTest[]): string[] {
  const erreurs: string[] = [];
  const demandes = new Map(boite.courriels.filter((c) => c.attendu.estReunion).map((c) => [c.id, c]));
  const ids = new Set<string>();
  for (const r of reponses) {
    if (ids.has(r.id)) erreurs.push(`Réponse ${r.id} : identifiant en double`);
    ids.add(r.id);
    const demande = demandes.get(r.demande);
    if (!demande) {
      erreurs.push(`Réponse ${r.id} : demande de réunion inconnue ${r.demande}`);
      continue;
    }
    if (!(demande.attendu.participants ?? []).includes(r.de) || r.de === boite.proprietaire) {
      erreurs.push(`Réponse ${r.id} : ${r.de} n'est pas un participant invité de ${r.demande}`);
    }
    if (!dateValide(r.date)) erreurs.push(`Réponse ${r.id} : date invalide`);
    if (!["acceptation", "refus", "deplacement"].includes(r.attendu.type)) erreurs.push(`Réponse ${r.id} : type invalide`);
    const f = r.attendu.fenetre;
    if (f && (!dateValide(f.debut) || !dateValide(f.fin) || f.debut >= f.fin)) erreurs.push(`Réponse ${r.id} : fenêtre invalide`);
    if (f && r.attendu.type !== "deplacement") erreurs.push(`Réponse ${r.id} : seule une demande de déplacement a une fenêtre`);
  }
  return erreurs;
}

const dateValide = estDateValide;

// Retourne la liste des erreurs trouvées dans les données (vide si tout est correct).
export function validerDonnees(calendriers: Calendriers, boite: BoiteReception): string[] {
  const erreurs: string[] = [];
  const connus = new Set(calendriers.utilisateurs.map((u) => u.courriel));

  for (const u of calendriers.utilisateurs) {
    const p = u.preferences;
    if (!p || typeof p.reunionsSurHeureDiner !== "boolean" || typeof p.reunionsHorsBureau !== "boolean" ||
      !Number.isInteger(p.plageRechercheJours) || p.plageRechercheJours < 1) {
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
