// Appels à l'API du serveur.

import type { Calendriers, CourrielBoite, CourrielEnvoye, Etat, ModeSuivi, Preferences, ReponseDemo, Reunion, Session } from "./types";

export class ErreurApi extends Error {
  constructor(message: string, readonly statut: number) {
    super(message);
  }
}

async function requete<T>(methode: string, chemin: string, corps?: unknown): Promise<T> {
  let reponse: Response;
  try {
    reponse = await fetch(`/api${chemin}`, {
      method: methode,
      headers: corps === undefined ? undefined : { "Content-Type": "application/json" },
      body: corps === undefined ? undefined : JSON.stringify(corps),
    });
  } catch {
    throw new ErreurApi("Le serveur ne répond pas. Vérifiez qu'il est démarré (npm run demarrer).", 0);
  }
  const donnees = await reponse.json().catch(() => ({}));
  if (!reponse.ok) throw new ErreurApi(donnees.erreur ?? `Erreur ${reponse.status}`, reponse.status);
  return donnees as T;
}

const id = (x: string) => encodeURIComponent(x);

export const api = {
  session: () => requete<Session>("GET", "/session"),
  demarrerDemo: () => requete("POST", "/session/demo"),
  connecter: (fournisseur: string) => requete("POST", `/session/${id(fournisseur)}`),
  deconnecter: () => requete("POST", "/session/deconnexion"),

  etat: () => requete<Etat>("GET", "/etat"),
  lireCourriels: () => requete("POST", "/courriels/traiter"),
  courriels: () => requete<CourrielBoite[]>("GET", "/courriels"),
  envois: () => requete<CourrielEnvoye[]>("GET", "/envois"),
  calendriers: () => requete<Calendriers>("GET", "/calendriers"),

  prioritaire: (r: string) => requete<Reunion>("POST", `/reunions/${id(r)}/prioritaire`),
  confirmer: (r: string, modeSuivi: ModeSuivi, debut?: string) =>
    requete<Reunion>("POST", `/reunions/${id(r)}/confirmer`, { modeSuivi, debut }),
  ignorer: (r: string) => requete<Reunion>("POST", `/reunions/${id(r)}/ignorer`),
  changerMode: (r: string, modeSuivi: ModeSuivi) => requete<Reunion>("POST", `/reunions/${id(r)}/mode`, { modeSuivi }),
  choisirCreneau: (r: string, debut: string) => requete<Reunion>("POST", `/reunions/${id(r)}/creneau`, { debut }),
  preferences: (courriel: string, p: Partial<Preferences>) =>
    requete<Preferences>("PUT", `/utilisateurs/${id(courriel)}/preferences`, p),

  reponsesDemo: () => requete<ReponseDemo[]>("GET", "/demo/reponses"),
  envoyerReponseDemo: (r: string) => requete<{ reunion: Reunion }>("POST", `/demo/reponses/${id(r)}`),
  reinitialiserDemo: () => requete("POST", "/demo/reinitialiser"),
};
