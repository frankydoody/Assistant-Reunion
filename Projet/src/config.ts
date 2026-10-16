// Configuration de l'application, lue dans Projet/.env (voir .env.example).

import { existsSync, readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

export const RACINE_PROJET = join(dirname(fileURLToPath(import.meta.url)), "..");

// Charge Projet/.env s'il existe, sans écraser les variables déjà définies.
function chargerFichierEnv(): void {
  const chemin = join(RACINE_PROJET, ".env");
  if (!existsSync(chemin)) return;
  for (const ligne of readFileSync(chemin, "utf8").split(/\r?\n/)) {
    if (ligne.trimStart().startsWith("#")) continue;
    const m = ligne.match(/^\s*([A-Za-z_][A-Za-z0-9_]*)\s*=\s*(.*?)\s*$/);
    if (!m) continue;
    const valeur = m[2].replace(/^(['"])(.*)\1$/, "$2");
    if (process.env[m[1]] === undefined) process.env[m[1]] = valeur;
  }
}
chargerFichierEnv();

const modeIA = process.env.IA_MODE?.trim() ?? "";
if (modeIA !== "" && modeIA !== "gemini" && modeIA !== "simulee") {
  throw new Error(`IA_MODE doit valoir « gemini » ou « simulee » (reçu : « ${modeIA} »).`);
}

export const config = {
  port: Number(process.env.PORT ?? 3100),
  cleGemini: process.env.GEMINI_API_KEY?.trim() || null,
  modeleGemini: process.env.GEMINI_MODELE?.trim() || "gemini-2.5-flash",
  urlApiGemini: process.env.GEMINI_URL_API?.trim() || "https://generativelanguage.googleapis.com/v1beta",
  // Vide : Gemini si une clé est présente, sinon l'IA simulée.
  modeIA: modeIA as "" | "gemini" | "simulee",
  // Pause entre deux appels pendant l'évaluation, pour respecter les limites du niveau gratuit.
  delaiEntreAppelsMs: Number(process.env.GEMINI_DELAI_MS ?? 4000),
};

// Nombre de replanifications automatiques permises par réunion avant de
// redonner la main à l'utilisateur.
export const MAX_REPLANIFICATIONS_AUTO = 2;
