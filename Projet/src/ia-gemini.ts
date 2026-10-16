// Analyseur Gemini : appelle l'API REST generateContent avec une sortie JSON
// imposée par un schéma. Température 0 pour des résultats reproductibles.

import { ErreurIA } from "./erreurs";
import type { AnalyseurIA, ContexteAnalyse, ContexteReponse } from "./ia";
import { promptAnalyse, promptReponse, SCHEMA_ANALYSE, SCHEMA_REPONSE } from "./prompts";
import type { CourrielRecu } from "./types";

const ESSAIS_MAX = 3;
const DELAI_EXPIRATION_MS = 30_000;
const CODES_A_REESSAYER = new Set([429, 500, 503]);

const attendre = (ms: number) => new Promise((resoudre) => setTimeout(resoudre, ms));

// Gemini retourne la fenêtre en deux champs à plat; on la regroupe pour la validation.
function regrouperFenetre(brut: unknown): unknown {
  if (typeof brut !== "object" || brut === null) return brut;
  const { fenetreDebut, fenetreFin, ...reste } = brut as Record<string, unknown>;
  const fenetre = fenetreDebut || fenetreFin ? { debut: fenetreDebut, fin: fenetreFin } : null;
  return { ...reste, fenetre };
}

export class AnalyseurGemini implements AnalyseurIA {
  readonly nom: string;

  constructor(
    private readonly cle: string,
    private readonly modele: string,
    private readonly urlApi: string,
  ) {
    this.nom = `gemini (${modele})`;
  }

  async analyserCourriel(courriel: CourrielRecu, contexte: ContexteAnalyse): Promise<unknown> {
    const { systeme, message } = promptAnalyse(courriel, contexte);
    return regrouperFenetre(await this.appeler(systeme, message, SCHEMA_ANALYSE));
  }

  async interpreterReponse(courriel: CourrielRecu, contexte: ContexteReponse): Promise<unknown> {
    const { systeme, message } = promptReponse(courriel, contexte);
    return regrouperFenetre(await this.appeler(systeme, message, SCHEMA_REPONSE));
  }

  private async appeler(systeme: string, message: string, schema: object): Promise<unknown> {
    const corps = JSON.stringify({
      systemInstruction: { parts: [{ text: systeme }] },
      contents: [{ role: "user", parts: [{ text: message }] }],
      generationConfig: { temperature: 0, responseMimeType: "application/json", responseSchema: schema },
    });

    for (let essai = 1; ; essai++) {
      const reponse = await fetch(`${this.urlApi}/models/${this.modele}:generateContent`, {
        method: "POST",
        headers: { "Content-Type": "application/json", "x-goog-api-key": this.cle },
        body: corps,
        signal: AbortSignal.timeout(DELAI_EXPIRATION_MS),
      });

      if (!reponse.ok) {
        if (CODES_A_REESSAYER.has(reponse.status) && essai < ESSAIS_MAX) {
          await attendre(2000 * 2 ** (essai - 1)); // 2 s, puis 4 s
          continue;
        }
        const detail = (await reponse.text()).slice(0, 300);
        throw new ErreurIA(`Gemini a répondu ${reponse.status} : ${detail}`);
      }

      const json = (await reponse.json()) as {
        candidates?: { content?: { parts?: { text?: string }[] }; finishReason?: string }[];
      };
      const texte = json.candidates?.[0]?.content?.parts?.map((p) => p.text ?? "").join("") ?? "";
      if (!texte) {
        throw new ErreurIA(`Réponse vide de Gemini (raison : ${json.candidates?.[0]?.finishReason ?? "inconnue"}).`);
      }
      try {
        return JSON.parse(texte);
      } catch {
        throw new ErreurIA(`Gemini n'a pas retourné du JSON valide : ${texte.slice(0, 200)}`);
      }
    }
  }
}
