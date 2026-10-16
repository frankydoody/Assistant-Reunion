// IA simulée : retourne les résultats attendus inscrits dans les données
// fictives, au même format que l'analyseur Gemini. Elle permet de tester
// l'assistant de bout en bout sans clé d'API.

import type { AnalyseurIA } from "./ia";
import type { Attendu, CourrielRecu, ReponseTest } from "./types";

export class AnalyseurSimule implements AnalyseurIA {
  readonly nom = "simulée (résultats attendus des données fictives)";

  constructor(
    private readonly courriels: Map<string, Attendu>,
    private readonly reponses: Map<string, ReponseTest["attendu"]>,
  ) {}

  async analyserCourriel(courriel: CourrielRecu): Promise<unknown> {
    const a = this.courriels.get(courriel.id);
    if (!a?.estReunion) {
      return { estReunion: false, sujet: null, participants: [], dureeMinutes: null, fenetre: null };
    }
    return {
      estReunion: true,
      sujet: a.sujet ?? null,
      participants: a.participants ?? [],
      dureeMinutes: a.dureeMinutes ?? null,
      fenetre: a.fenetre ?? null,
    };
  }

  // Les réponses injectées ont un identifiant « R03@v2 » : on retrouve R03.
  async interpreterReponse(courriel: CourrielRecu): Promise<unknown> {
    const a = this.reponses.get(courriel.id.split("@")[0]);
    if (!a) throw new Error(`Réponse fictive inconnue : ${courriel.id}`);
    return structuredClone(a);
  }
}
