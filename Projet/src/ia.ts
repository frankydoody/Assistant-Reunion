// Interface commune des analyseurs IA, et choix de l'analyseur selon la configuration.
//
// Un analyseur retourne une valeur brute (unknown) : elle n'est jamais utilisée
// sans passer par validation.ts.

import { config } from "./config";
import type { Creneau } from "./creneaux";
import { chargerBoiteReception, chargerReponses } from "./donnees";
import { AnalyseurGemini } from "./ia-gemini";
import { AnalyseurSimule } from "./ia-simulee";
import type { CourrielRecu, Utilisateur } from "./types";

export interface ContexteAnalyse {
  entreprise: string;
  utilisateurs: Utilisateur[];
  proprietaire: string;
  heuresBureau: { debut: string; fin: string };
}

export interface ContexteReponse {
  sujet: string;
  creneau: Creneau;
}

export interface AnalyseurIA {
  readonly nom: string;
  analyserCourriel(courriel: CourrielRecu, contexte: ContexteAnalyse): Promise<unknown>;
  interpreterReponse(courriel: CourrielRecu, contexte: ContexteReponse): Promise<unknown>;
}

// IA simulée : renvoie les résultats attendus des données fictives. Elle sert à
// tester tout le reste de l'application sans clé d'API; elle ne mesure rien de
// la qualité de Gemini.
export function creerAnalyseurSimule(): AnalyseurSimule {
  const boite = chargerBoiteReception();
  return new AnalyseurSimule(
    new Map(boite.courriels.map((c) => [c.id, c.attendu])),
    new Map(chargerReponses().map((r) => [r.id, r.attendu])),
  );
}

export function creerAnalyseur(): AnalyseurIA {
  const mode = config.modeIA || (config.cleGemini ? "gemini" : "simulee");
  if (mode === "simulee") return creerAnalyseurSimule();
  if (!config.cleGemini) throw new Error("IA_MODE=gemini, mais GEMINI_API_KEY est vide dans Projet/.env.");
  return new AnalyseurGemini(config.cleGemini, config.modeleGemini, config.urlApiGemini);
}
