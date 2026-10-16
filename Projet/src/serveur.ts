// Serveur de l'application : sert le tableau de bord (dossier public/) et l'API REST.
// Démarrage : npm run demarrer  (http://localhost:3100)

import express, { type NextFunction, type Request, type Response } from "express";
import { spawn } from "node:child_process";
import { existsSync } from "node:fs";
import { join } from "node:path";
import { Assistant } from "./assistant";
import { config, RACINE_PROJET } from "./config";
import { ConnecteurFictif } from "./connecteur-fictif";
import { chargerBoiteReception, chargerCalendriers, chargerReponses } from "./donnees";
import { ErreurMetier } from "./erreurs";
import { creerAnalyseur } from "./ia";
import { courrielDeReponse } from "./simulation";

// --- Session -------------------------------------------------------------
// Une seule session à la fois (application locale, un utilisateur). Le mode
// démo travaille sur l'entreprise fictive; les connecteurs Google et
// Microsoft sont prévus mais pas encore réalisés.

const FOURNISSEURS = [
  {
    id: "google",
    nom: "Google",
    description: "Gmail et Google Agenda",
    disponible: false,
    raison: "Connecteur prévu, pas encore réalisé : il demande un identifiant OAuth créé dans Google Cloud.",
  },
  {
    id: "microsoft",
    nom: "Microsoft",
    description: "Outlook et Calendrier Microsoft 365",
    disponible: false,
    raison: "Connecteur prévu, pas encore réalisé : il demande une application inscrite dans Microsoft Entra.",
  },
];

let session: { mode: "demo" } | null = null;
let connecteur: ConnecteurFictif;
let assistant: Assistant;

function nouvelAssistant(): void {
  connecteur = new ConnecteurFictif(chargerCalendriers(), chargerBoiteReception());
  assistant = new Assistant(connecteur, creerAnalyseur());
}
nouvelAssistant();

// Lance la lecture de la boîte en arrière-plan; le tableau de bord suit la progression.
function lancerLecture(): void {
  if (assistant.progression.enCours) return;
  assistant.traiterNouveauxCourriels().catch((e) => console.error("Lecture de la boîte :", e));
}

// --- Application Express ---------------------------------------------------

const app = express();
app.use(express.json());
app.use(express.static(join(RACINE_PROJET, "public")));

type Gestionnaire = (req: Request) => Promise<unknown>;
const route = (gestionnaire: Gestionnaire) => (req: Request, res: Response, next: NextFunction) => {
  gestionnaire(req).then((donnees) => res.json(donnees)).catch(next);
};
// Action qui modifie l'état : exécutée une à la fois.
const action = (gestionnaire: Gestionnaire) => route((req) => assistant.executer(() => gestionnaire(req)));

function exigerSession(): void {
  if (!session) throw new ErreurMetier("Aucun service connecté.", 401);
}
function exigerDemo(): void {
  if (session?.mode !== "demo") throw new ErreurMetier("Action offerte seulement en mode démo.", 403);
}

app.get("/api/sante", route(async () => ({ ok: true, ia: assistant.nomIA })));

app.get(
  "/api/session",
  route(async () => {
    const cal = await connecteur.lireCalendriers();
    return {
      connecte: session !== null,
      mode: session?.mode ?? null,
      utilisateur: session ? cal.utilisateurs.find((u) => u.courriel === connecteur.proprietaire()) ?? null : null,
      entreprise: session ? cal.entreprise : null,
      ia: assistant.nomIA,
      iaReelle: assistant.nomIA.startsWith("gemini"),
      fournisseurs: FOURNISSEURS,
    };
  }),
);

app.post(
  "/api/session/demo",
  route(async () => {
    if (assistant.progression.enCours) throw new ErreurMetier("Une lecture est en cours; réessayer dans un instant.", 409);
    nouvelAssistant();
    session = { mode: "demo" };
    lancerLecture();
    return { ok: true };
  }),
);

app.post(
  "/api/session/deconnexion",
  route(async () => {
    session = null;
    return { ok: true };
  }),
);

app.post(
  "/api/session/:fournisseur",
  route(async (req) => {
    const f = FOURNISSEURS.find((x) => x.id === req.params.fournisseur);
    if (!f) throw new ErreurMetier(`Service inconnu : ${req.params.fournisseur}`, 404);
    throw new ErreurMetier(`${f.nom} : ${f.raison}`, 501);
  }),
);

// Toutes les routes suivantes exigent une session.
app.use("/api", (_req, _res, next) => {
  try {
    exigerSession();
    next();
  } catch (e) {
    next(e);
  }
});

app.get(
  "/api/etat",
  route(async () => ({
    ia: assistant.nomIA,
    proprietaire: connecteur.proprietaire(),
    utilisateurs: (await connecteur.lireCalendriers()).utilisateurs,
    reunions: assistant.listerReunions(),
    progression: assistant.progression,
  })),
);

app.post(
  "/api/courriels/traiter",
  route(async () => {
    lancerLecture();
    return assistant.progression;
  }),
);

app.get(
  "/api/courriels",
  route(async () => {
    const parSource = new Map(assistant.listerReunions().map((r) => [r.courrielSource, r.id]));
    const envois = await connecteur.envois();
    return (await connecteur.courriels()).map(({ courriel, traite }) => ({
      ...courriel,
      traite,
      reunionId: courriel.enReponseA
        ? envois.find((e) => e.id === courriel.enReponseA)?.reunionId ?? null
        : parSource.get(courriel.id) ?? null,
    }));
  }),
);

app.get("/api/reunions/:id", route(async (req) => assistant.obtenir(req.params.id)));
app.post("/api/reunions/:id/prioritaire", action(async (req) => assistant.choisirPrioritaire(req.params.id)));
app.post(
  "/api/reunions/:id/confirmer",
  action(async (req) => assistant.confirmer(req.params.id, req.body?.modeSuivi, req.body?.debut)),
);
app.post("/api/reunions/:id/ignorer", action(async (req) => assistant.ignorer(req.params.id)));
app.post("/api/reunions/:id/mode", action(async (req) => assistant.changerMode(req.params.id, req.body?.modeSuivi)));
app.post("/api/reunions/:id/creneau", action(async (req) => assistant.choisirCreneau(req.params.id, req.body?.debut)));

app.put(
  "/api/utilisateurs/:courriel/preferences",
  action(async (req) => assistant.modifierPreferences(req.params.courriel, req.body ?? {})),
);

app.get("/api/calendriers", route(async () => connecteur.lireCalendriers()));
app.get("/api/envois", route(async () => connecteur.envois()));

// --- Mode démo : réponses fictives des participants -------------------------

app.get(
  "/api/demo/reponses",
  route(async () => {
    exigerDemo();
    const recus = new Set((await connecteur.courriels()).map((c) => c.courriel.id));
    return chargerReponses().map((r) => {
      const reunion = assistant.listerReunions().find((x) => x.id === `R-${r.demande}`) ?? null;
      return {
        id: r.id,
        demande: r.demande,
        de: r.de,
        corps: r.corps,
        reunionId: reunion?.id ?? null,
        disponible: reunion !== null && reunion.version > 0 && !recus.has(`${r.id}@v${reunion.version}`),
        dejaEnvoyee: [...recus].some((id) => id.startsWith(`${r.id}@`)),
      };
    });
  }),
);

// Dépose dans la boîte la réponse fictive d'un participant, puis la traite.
app.post(
  "/api/demo/reponses/:id",
  route(async (req) => {
    exigerDemo();
    const test = chargerReponses().find((r) => r.id === req.params.id);
    if (!test) throw new ErreurMetier(`Réponse fictive inconnue : ${req.params.id}`, 404);
    const reunion = assistant.obtenir(`R-${test.demande}`);
    connecteur.recevoir(courrielDeReponse(test, reunion, connecteur.proprietaire()));
    return { traitement: await assistant.traiterNouveauxCourriels(), reunion };
  }),
);

app.post(
  "/api/demo/reinitialiser",
  route(async () => {
    exigerDemo();
    if (assistant.progression.enCours) throw new ErreurMetier("Une lecture est en cours; réessayer dans un instant.", 409);
    nouvelAssistant();
    lancerLecture();
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

function ouvrirNavigateur(url: string): void {
  const commande =
    process.platform === "win32"
      ? ["cmd", ["/c", "start", "", url]]
      : process.platform === "darwin"
        ? ["open", [url]]
        : ["xdg-open", [url]];
  try {
    spawn(commande[0] as string, commande[1] as string[], { detached: true, stdio: "ignore" }).on("error", () => {}).unref();
  } catch {
    // Pas de navigateur disponible : l'adresse est affichée dans la console.
  }
}

app.listen(config.port, () => {
  const url = `http://localhost:${config.port}`;
  console.log(`Assistant de planification : ${url}`);
  console.log(`IA : ${assistant.nomIA}`);
  if (!existsSync(join(RACINE_PROJET, "public", "index.html"))) {
    console.log("Tableau de bord absent : lancer « npm run construire » (ou « npm run demarrer »).");
  }
  if (process.env.OUVRIR_NAVIGATEUR !== "non") ouvrirNavigateur(url);
});
