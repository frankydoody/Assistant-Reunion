// Validation des sorties de l'IA. Rien de ce que retourne le modèle n'est
// utilisé sans passer par ici : les champs invalides sont corrigés ou retirés,
// et chaque correction est notée comme avertissement.

import { estDateValide } from "./dates";
import { ErreurIA } from "./erreurs";
import type { ContexteAnalyse } from "./ia";
import type { AnalyseCourriel, InterpretationReponse } from "./modele";
import type { CourrielRecu, Fenetre, TypeReponse } from "./types";

const DUREE_MIN = 5;
const DUREE_MAX = 8 * 60;
const TYPES_REPONSE: TypeReponse[] = ["acceptation", "refus", "deplacement"];

function estObjet(v: unknown): v is Record<string, unknown> {
  return typeof v === "object" && v !== null && !Array.isArray(v);
}

function validerFenetre(brut: unknown, plusTot: string, avertissements: string[]): Fenetre | null {
  if (brut === null || brut === undefined) return null;
  if (!estObjet(brut) || !estDateValide(brut.debut) || !estDateValide(brut.fin) || brut.debut >= brut.fin) {
    avertissements.push("Contrainte de date illisible : ignorée.");
    return null;
  }
  if (brut.fin <= plusTot) {
    avertissements.push("Contrainte de date déjà passée : ignorée.");
    return null;
  }
  return { debut: brut.debut, fin: brut.fin };
}

function nettoyerObjet(objet: string): string {
  return objet.replace(/^\s*((re|tr|fwd?)\s*:\s*)+/i, "").trim() || "Réunion";
}

export function validerAnalyse(
  brut: unknown,
  courriel: CourrielRecu,
  ctx: ContexteAnalyse,
): { analyse: AnalyseCourriel; avertissements: string[] } {
  if (!estObjet(brut) || typeof brut.estReunion !== "boolean") {
    throw new ErreurIA("Réponse de l'IA invalide : le champ estReunion est manquant.");
  }
  const avertissements: string[] = [];
  if (!brut.estReunion) {
    return {
      analyse: { estReunion: false, sujet: null, participants: [], dureeMinutes: null, fenetre: null },
      avertissements,
    };
  }

  // Participants : seulement des employés connus, sans doublon; l'expéditeur
  // (s'il est employé) et le propriétaire de la boîte sont toujours inclus.
  const connus = new Set(ctx.utilisateurs.map((u) => u.courriel));
  const proposes = Array.isArray(brut.participants) ? brut.participants : [];
  const participants: string[] = [];
  for (const p of proposes) {
    const adresse = typeof p === "string" ? p.trim().toLowerCase() : "";
    if (!connus.has(adresse)) {
      avertissements.push(`Participant inconnu retiré : ${String(p)}.`);
    } else if (!participants.includes(adresse)) {
      participants.push(adresse);
    }
  }
  for (const obligatoire of [ctx.proprietaire, courriel.de.toLowerCase()]) {
    if (connus.has(obligatoire) && !participants.includes(obligatoire)) {
      participants.push(obligatoire);
      avertissements.push(`Participant ajouté : ${obligatoire}.`);
    }
  }

  const sujetBrut = typeof brut.sujet === "string" ? brut.sujet.trim() : "";
  const sujet = sujetBrut ? sujetBrut.slice(0, 80) : nettoyerObjet(courriel.objet);
  if (!sujetBrut) avertissements.push("Sujet manquant : objet du courriel utilisé.");

  let dureeMinutes: number | null = null;
  if (brut.dureeMinutes !== null && brut.dureeMinutes !== undefined) {
    const d = brut.dureeMinutes;
    if (typeof d === "number" && Number.isInteger(d) && d >= DUREE_MIN && d <= DUREE_MAX) dureeMinutes = d;
    else avertissements.push(`Durée invalide ignorée : ${String(d)}.`);
  }

  const fenetre = validerFenetre(brut.fenetre, courriel.date, avertissements);

  return { analyse: { estReunion: true, sujet, participants, dureeMinutes, fenetre }, avertissements };
}

export function validerInterpretation(brut: unknown, courriel: CourrielRecu): InterpretationReponse {
  if (!estObjet(brut) || !TYPES_REPONSE.includes(brut.type as TypeReponse)) {
    throw new ErreurIA("Réponse de l'IA invalide : type de réponse inconnu.");
  }
  const type = brut.type as TypeReponse;
  const fenetre = type === "deplacement" ? validerFenetre(brut.fenetre, courriel.date, []) : null;
  return { type, fenetre };
}
