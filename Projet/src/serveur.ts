// Serveur de l'application : API REST pour le tableau de bord web.
// Démarrage : npm run demarrer  (http://localhost:3100)

import express, { type NextFunction, type Request, type Response } from "express";
import { join } from "node:path";
import { Assistant } from "./assistant";
import { config, RACINE_PROJET } from "./config";
import { ConnecteurFictif } from "./connecteur-fictif";
import { chargerBoiteReception, chargerCalendriers, chargerReponses } from "./donnees";
import { ErreurMetier } from "./erreurs";
import { creerAnalyseur } from "./ia";
import { courrielDeReponse } from "./simulation";

let connecteur: ConnecteurFictif;
let assistant: Assistant;

function demarrerAssistant(): void {
  connecteur = new ConnecteurFictif(chargerCalendriers(), chargerBoiteReception());
  assistant = new Assistant(connecteur, creerAnalyseur());
}
demarrerAssistant();

const app = express();
app.use(express.json());
app.use(express.static(join(RACINE_PROJET, "public"))); // tableau de bord (à venir)

type Gestionnaire = (req: Request) => Promise<unknown>;
const route = (gestionnaire: Gestionnaire) => (req: Request, res: Response, next: NextFunction) => {
  gestionnaire(req).then((donnees) => res.json(donnees)).catch(next);
};

app.get("/api/sante", route(async () => ({ ok: true, ia: assistant.nomIA, connecteur: connecteur.nom })));

app.get(
  "/api/etat",
  route(async () => ({
    proprietaire: connecteur.proprietaire(),
    ia: assistant.nomIA,
    connecteur: connecteur.nom,
    utilisateurs: (await connecteur.lireCalendriers()).utilisateurs,
    reunions: assistant.listerReunions(),
  })),
);

app.post("/api/courriels/traiter", route(async () => assistant.traiterNouveauxCourriels()));

app.get("/api/reunions/:id", route(async (req) => assistant.obtenir(req.params.id)));
app.post("/api/reunions/:id/prioritaire", route(async (req) => assistant.choisirPrioritaire(req.params.id)));
app.post(
  "/api/reunions/:id/confirmer",
  route(async (req) => assistant.confirmer(req.params.id, req.body?.modeSuivi, req.body?.debut)),
);
app.post("/api/reunions/:id/ignorer", route(async (req) => assistant.ignorer(req.params.id)));
app.post("/api/reunions/:id/mode", route(async (req) => assistant.changerMode(req.params.id, req.body?.modeSuivi)));
app.post("/api/reunions/:id/creneau", route(async (req) => assistant.choisirCreneau(req.params.id, req.body?.debut)));

app.put(
  "/api/utilisateurs/:courriel/preferences",
  route(async (req) => assistant.modifierPreferences(req.params.courriel, req.body ?? {})),
);

app.get("/api/calendriers", route(async () => connecteur.lireCalendriers()));
app.get("/api/envois", route(async () => connecteur.envois()));

// --- Simulation (données fictives seulement) ---

app.get(
  "/api/simulation/reponses",
  route(async () =>
    chargerReponses().map((r) => ({ id: r.id, demande: r.demande, de: r.de, corps: r.corps })),
  ),
);

// Dépose dans la boîte la réponse fictive d'un participant, puis la traite.
app.post(
  "/api/simulation/reponses/:id",
  route(async (req) => {
    const test = chargerReponses().find((r) => r.id === req.params.id);
    if (!test) throw new ErreurMetier(`Réponse fictive inconnue : ${req.params.id}`, 404);
    const reunion = assistant.obtenir(`R-${test.demande}`);
    connecteur.recevoir(courrielDeReponse(test, reunion, connecteur.proprietaire()));
    return { traitement: await assistant.traiterNouveauxCourriels(), reunion };
  }),
);

app.post(
  "/api/simulation/reinitialiser",
  route(async () => {
    demarrerAssistant();
    return { ok: true };
  }),
);

app.use("/api", (_req: Request, res: Response) => res.status(404).json({ erreur: "Route inconnue." }));

app.use((err: unknown, _req: Request, res: Response, _next: NextFunction) => {
  const statut =
    err instanceof ErreurMetier ? err.statut : (err as { status?: number })?.status === 400 ? 400 : 500;
  if (statut === 500) console.error(err);
  const corpsInvalide = (err as { type?: string })?.type === "entity.parse.failed";
  const message =
    statut === 500
      ? "Erreur interne du serveur."
      : corpsInvalide
        ? "Le corps de la requête n'est pas du JSON valide."
        : err instanceof Error
          ? err.message
          : String(err);
  res.status(statut).json({ erreur: message });
});

app.listen(config.port, () => {
  console.log(`Assistant de planification : http://localhost:${config.port}`);
  console.log(`IA         : ${assistant.nomIA}`);
  console.log(`Connecteur : ${connecteur.nom}`);
});
