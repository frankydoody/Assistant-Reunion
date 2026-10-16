// L'assistant : lit les nouveaux courriels, propose des créneaux, gère les
// créneaux en double, envoie les invitations après confirmation et suit les
// réponses des participants. Toutes les règles de décision sont ici; l'IA ne
// fait que lire les courriels (voir ia.ts et validation.ts).
//
// Les réunions sont gardées en mémoire pendant que le serveur tourne.

import { MAX_REPLANIFICATIONS_AUTO } from "./config";
import type { Connecteur } from "./connecteur";
import { DUREE_PAR_DEFAUT_MINUTES, trouverCreneau, type Creneau, type DemandeCreneau, type ReunionPlacee } from "./creneaux";
import { ajouterMinutes, estDateValide, formaterCreneau, formaterFenetre } from "./dates";
import { ErreurMetier } from "./erreurs";
import type { AnalyseurIA, ContexteAnalyse } from "./ia";
import { composerInvitation } from "./messages";
import type { ModeSuivi, Reunion, StatutReunion } from "./modele";
import type { Calendriers, CourrielRecu, Fenetre, Preferences } from "./types";
import { validerAnalyse, validerInterpretation } from "./validation";

const DECISION_AVANT_ENVOI = new Set<StatutReunion>(["a_confirmer", "conflit", "date_a_confirmer"]);
const PLAGE_PAR_DEFAUT_JOURS = 14;

function chevauche(a: { debut: string; fin: string }, b: { debut: string; fin: string }): boolean {
  return a.debut < b.fin && b.debut < a.fin;
}

function partagent(a: string[], b: string[]): boolean {
  return a.some((p) => b.includes(p));
}

export interface ResultatTraitement {
  courrielsTraites: number;
  reunionsDetectees: string[];
  courrielsSansRapport: number;
  reponsesTraitees: number;
  erreurs: { courriel: string; message: string }[];
}

export interface Progression {
  enCours: boolean;
  total: number;
  traites: number;
  erreurs: { courriel: string; message: string }[];
  dernierResultat: ResultatTraitement | null;
}

export class Assistant {
  private readonly reunions = new Map<string, Reunion>();
  private prochainGroupe = 1;
  private file: Promise<unknown> = Promise.resolve();
  readonly progression: Progression = { enCours: false, total: 0, traites: 0, erreurs: [], dernierResultat: null };

  constructor(
    private readonly connecteur: Connecteur,
    private readonly ia: AnalyseurIA,
  ) {}

  get nomIA(): string {
    return this.ia.nom;
  }

  listerReunions(): Reunion[] {
    return [...this.reunions.values()].sort((a, b) => a.recueLe.localeCompare(b.recueLe));
  }

  // Exécute les actions une à la fois : une action de l'utilisateur attend la
  // fin du courriel en cours d'analyse, jamais toute la lecture de la boîte.
  executer<T>(action: () => Promise<T>): Promise<T> {
    const resultat = this.file.then(action, action);
    this.file = resultat.catch(() => undefined);
    return resultat;
  }

  obtenir(id: string): Reunion {
    const r = this.reunions.get(id);
    if (!r) throw new ErreurMetier(`Réunion introuvable : ${id}`, 404);
    return r;
  }

  // ---------------------------------------------------------------------
  // Lecture de la boîte de réception
  // ---------------------------------------------------------------------

  // Un courriel en erreur (IA indisponible, réponse invalide) n'est pas marqué
  // comme traité : il sera repris au prochain passage.
  async traiterNouveauxCourriels(): Promise<ResultatTraitement> {
    const resultat: ResultatTraitement = {
      courrielsTraites: 0,
      reunionsDetectees: [],
      courrielsSansRapport: 0,
      reponsesTraitees: 0,
      erreurs: [],
    };
    if (this.progression.enCours) throw new ErreurMetier("La lecture de la boîte de réception est déjà en cours.", 409);
    const nouveaux = await this.connecteur.nouveauxCourriels();
    Object.assign(this.progression, { enCours: true, total: nouveaux.length, traites: 0, erreurs: [] });
    try {
      for (const c of nouveaux) {
        await this.executer(async () => {
          try {
            if (c.enReponseA) {
              await this.traiterReponse(c);
              resultat.reponsesTraitees++;
            } else {
              const r = await this.analyser(c);
              if (r) resultat.reunionsDetectees.push(r.id);
              else resultat.courrielsSansRapport++;
            }
            await this.connecteur.marquerTraite(c.id);
            resultat.courrielsTraites++;
          } catch (e) {
            resultat.erreurs.push({ courriel: c.id, message: e instanceof Error ? e.message : String(e) });
          }
        });
        this.progression.traites++;
        this.progression.erreurs = [...resultat.erreurs];
      }
    } finally {
      this.progression.enCours = false;
      this.progression.dernierResultat = resultat;
    }
    return resultat;
  }

  private async analyser(c: CourrielRecu): Promise<Reunion | null> {
    const cal = await this.connecteur.lireCalendriers();
    const contexte = this.contexte(cal);
    const { analyse, avertissements } = validerAnalyse(await this.ia.analyserCourriel(c, contexte), c, contexte);
    if (!analyse.estReunion || !analyse.sujet) return null;

    const r: Reunion = {
      id: `R-${c.id}`,
      courrielSource: c.id,
      objetCourriel: c.objet,
      demandeur: c.de,
      recueLe: c.date,
      sujet: analyse.sujet,
      participants: analyse.participants,
      dureeMinutes: analyse.dureeMinutes ?? DUREE_PAR_DEFAUT_MINUTES,
      dureeParDefaut: analyse.dureeMinutes === null,
      fenetre: analyse.fenetre,
      avertissements,
      statut: "a_confirmer",
      creneau: null,
      suggestion: null,
      groupeConflit: null,
      motif: null,
      modeSuivi: null,
      version: 0,
      reponses: {},
      replanifications: 0,
      creneauxRefuses: [],
      derniereDemande: null,
      historique: [],
    };
    this.reunions.set(r.id, r);
    this.noter(r, `Demande de réunion détectée dans le courriel ${c.id} (« ${c.objet} »).`);
    this.placerNouvelle(r, cal);
    return r;
  }

  // Une nouvelle demande reçoit le premier créneau libre dans les calendriers.
  // Si ce créneau chevauche celui d'une autre demande non confirmée qui a un
  // participant en commun, les deux forment un groupe de créneaux en double :
  // l'utilisateur choisit la réunion prioritaire.
  private placerNouvelle(r: Reunion, cal: Calendriers): void {
    const proposition = trouverCreneau(cal, this.demande(r, cal));
    if (!proposition) {
      this.marquerDateAConfirmer(r, cal);
      return;
    }
    r.creneau = proposition;

    const concurrentes = this.listerReunions().filter(
      (o) =>
        o.id !== r.id &&
        (o.statut === "a_confirmer" || o.statut === "conflit") &&
        o.creneau !== null &&
        chevauche(o.creneau, proposition) &&
        partagent(o.participants, r.participants),
    );
    if (concurrentes.length === 0) {
      r.statut = "a_confirmer";
      this.noter(r, `Créneau proposé : ${formaterCreneau(proposition)}.`);
      return;
    }

    const groupesExistants = [...new Set(concurrentes.map((o) => o.groupeConflit).filter((g) => g !== null))];
    const groupe = groupesExistants[0] ?? `G${this.prochainGroupe++}`;
    const membres = new Set([
      r,
      ...concurrentes,
      ...this.listerReunions().filter((o) => o.groupeConflit !== null && groupesExistants.includes(o.groupeConflit)),
    ]);
    for (const m of membres) {
      m.statut = "conflit";
      m.groupeConflit = groupe;
      m.motif = "Créneau en double : choisir la réunion prioritaire du groupe.";
    }
    this.noter(r, `Créneau en double avec ${concurrentes.map((o) => o.id).join(", ")} (groupe ${groupe}).`);
  }

  // ---------------------------------------------------------------------
  // Décisions de l'utilisateur avant l'envoi
  // ---------------------------------------------------------------------

  // La réunion prioritaire garde son créneau; les autres réunions du groupe
  // sont replacées autour, dans l'ordre de réception.
  async choisirPrioritaire(id: string): Promise<Reunion> {
    const r = this.obtenir(id);
    if (r.statut !== "conflit" || !r.groupeConflit) {
      throw new ErreurMetier("Cette réunion ne fait pas partie d'un groupe de créneaux en double.", 409);
    }
    const groupe = r.groupeConflit;
    const autres = this.listerReunions().filter((o) => o.groupeConflit === groupe && o.id !== id);
    const cal = await this.connecteur.lireCalendriers();

    // Pendant le replacement, les membres du groupe ne réservent aucun créneau.
    if (r.creneau && this.estLibre(cal, r, r.creneau)) this.reserver(r, r.creneau);
    else this.placerAutour(r, cal);
    this.noter(r, `Choisie comme réunion prioritaire du groupe ${groupe}.`);

    for (const m of autres) {
      this.placerAutour(m, cal);
      this.noter(
        m,
        m.statut === "a_confirmer"
          ? `Replacée après le choix de ${r.id} : ${formaterCreneau(m.creneau!)}.`
          : `Aucune place après le choix de ${r.id} : date à confirmer.`,
      );
    }
    return r;
  }

  // L'utilisateur confirme la réunion et choisit le mode de suivi des réponses.
  // `debut` permet de choisir un autre moment; il est obligatoire quand
  // l'assistant n'a trouvé aucune place (date à confirmer).
  async confirmer(id: string, modeSuivi: ModeSuivi, debut?: string): Promise<Reunion> {
    const r = this.obtenir(id);
    if (r.statut !== "a_confirmer" && r.statut !== "date_a_confirmer") {
      throw new ErreurMetier(`Impossible de confirmer une réunion au statut « ${r.statut} ».`, 409);
    }
    this.verifierMode(modeSuivi);
    const creneau = debut !== undefined ? this.creneauDepuis(r, debut) : r.statut === "a_confirmer" ? r.creneau : null;
    if (!creneau) {
      throw new ErreurMetier("Aucune place trouvée : indiquer la date à confirmer (champ debut).", 400);
    }
    const cal = await this.connecteur.lireCalendriers();
    this.verifierCalendriers(cal, r, creneau);

    const proprietaire = this.connecteur.proprietaire();
    r.creneau = creneau;
    r.modeSuivi = modeSuivi;
    r.version = 1;
    r.statut = "en_attente_reponses";
    r.suggestion = null;
    r.motif = null;
    r.groupeConflit = null;
    r.reponses = Object.fromEntries(r.participants.map((p) => [p, p === proprietaire ? "acceptation" : "en_attente"]));

    await this.connecteur.creerEvenements(r.id, r.sujet, r.participants, creneau);
    await this.envoyerInvitations(r, cal);
    this.noter(r, `Confirmée par l'utilisateur (suivi ${modeSuivi}) : ${formaterCreneau(creneau)}. Invitation envoyée.`);
    this.verifierSiPlanifiee(r);
    await this.revaliderReservations();
    return r;
  }

  async ignorer(id: string): Promise<Reunion> {
    const r = this.obtenir(id);
    if (!DECISION_AVANT_ENVOI.has(r.statut)) {
      throw new ErreurMetier("Seule une demande pas encore confirmée peut être écartée.", 409);
    }
    const groupe = r.groupeConflit;
    Object.assign(r, { statut: "ignoree", creneau: null, groupeConflit: null, suggestion: null, motif: null });
    this.noter(r, "Écartée par l'utilisateur.");

    // Si le groupe n'a plus qu'une réunion, il n'y a plus de conflit.
    const restants = groupe ? this.listerReunions().filter((o) => o.groupeConflit === groupe) : [];
    if (restants.length === 1) {
      const cal = await this.connecteur.lireCalendriers();
      const m = restants[0];
      if (m.creneau && this.estLibre(cal, m, m.creneau)) this.reserver(m, m.creneau);
      else this.placerAutour(m, cal);
    }
    await this.revaliderReservations();
    return r;
  }

  // ---------------------------------------------------------------------
  // Suivi des réponses des participants
  // ---------------------------------------------------------------------

  private async traiterReponse(c: CourrielRecu): Promise<void> {
    const envoi = (await this.connecteur.envois()).find((e) => e.id === c.enReponseA);
    const r = envoi ? this.reunions.get(envoi.reunionId) : undefined;
    if (!envoi || !r || !r.creneau) return; // réponse à un message inconnu : ignorée

    const participant = c.de.trim().toLowerCase();
    const cal = await this.connecteur.lireCalendriers();
    const nom = this.nom(cal, participant);
    if (!r.participants.includes(participant) || participant === this.connecteur.proprietaire()) {
      this.noter(r, `Réponse de ${c.de} ignorée : cette personne n'est pas invitée.`);
      return;
    }
    if (envoi.version !== r.version) {
      this.noter(r, `Réponse de ${nom} à une ancienne invitation (version ${envoi.version}) ignorée.`);
      return;
    }

    const brut = await this.ia.interpreterReponse(c, { sujet: r.sujet, creneau: r.creneau });
    const { type, fenetre } = validerInterpretation(brut, c);
    r.reponses[participant] = type;

    if (type === "acceptation") {
      this.noter(r, `${nom} accepte.`);
      this.verifierSiPlanifiee(r);
      return;
    }

    if (!r.creneauxRefuses.some((x) => x.debut === r.creneau!.debut)) r.creneauxRefuses.push(r.creneau);
    r.derniereDemande = { fenetre, plusTot: c.date > r.recueLe ? c.date : r.recueLe };
    const description =
      type === "refus"
        ? `${nom} refuse le créneau`
        : `${nom} demande un autre moment${fenetre ? ` (${formaterFenetre(fenetre)})` : ""}`;
    this.noter(r, `${description}.`);

    if (r.modeSuivi !== "automatique" || r.statut === "intervention_requise") {
      await this.demanderIntervention(r, `${description}.`);
      return;
    }
    if (r.replanifications >= MAX_REPLANIFICATIONS_AUTO) {
      await this.demanderIntervention(
        r,
        `${description}; limite de ${MAX_REPLANIFICATIONS_AUTO} replanifications automatiques atteinte.`,
      );
      return;
    }
    const nouveau = await this.calculerNouveauCreneau(r);
    if (!nouveau) {
      await this.demanderIntervention(r, `${description}; aucun autre créneau libre trouvé.`);
      return;
    }
    r.replanifications++;
    await this.replanifier(r, nouveau, "automatique");
  }

  // L'utilisateur bascule le suivi. En passant à « automatique » pendant une
  // intervention, il délègue la suite à l'assistant : le compteur de
  // replanifications repart à zéro et l'assistant replanifie tout de suite.
  async changerMode(id: string, modeSuivi: ModeSuivi): Promise<Reunion> {
    const r = this.obtenir(id);
    this.verifierMode(modeSuivi);
    if (r.statut !== "en_attente_reponses" && r.statut !== "intervention_requise") {
      throw new ErreurMetier(`Le mode de suivi ne peut pas changer au statut « ${r.statut} ».`, 409);
    }
    r.modeSuivi = modeSuivi;
    this.noter(r, `Suivi ${modeSuivi} choisi par l'utilisateur.`);

    if (modeSuivi === "automatique" && r.statut === "intervention_requise") {
      r.replanifications = 0;
      const nouveau = await this.calculerNouveauCreneau(r);
      if (!nouveau) {
        r.motif = "Aucun autre créneau libre trouvé : choisir un créneau.";
        return r;
      }
      r.replanifications++;
      await this.replanifier(r, nouveau, "automatique");
    }
    return r;
  }

  // L'utilisateur choisit lui-même un nouveau créneau (par exemple la suggestion).
  async choisirCreneau(id: string, debut: string): Promise<Reunion> {
    const r = this.obtenir(id);
    if (!["en_attente_reponses", "intervention_requise", "planifiee"].includes(r.statut)) {
      throw new ErreurMetier(`Impossible de déplacer une réunion au statut « ${r.statut} ».`, 409);
    }
    const creneau = this.creneauDepuis(r, debut);
    this.verifierCalendriers(await this.connecteur.lireCalendriers(), r, creneau);
    await this.replanifier(r, creneau, "utilisateur");
    return r;
  }

  // ---------------------------------------------------------------------
  // Configuration par utilisateur
  // ---------------------------------------------------------------------

  async modifierPreferences(courriel: string, modifs: Partial<Preferences>): Promise<Preferences> {
    const cal = await this.connecteur.lireCalendriers();
    const u = cal.utilisateurs.find((x) => x.courriel === courriel);
    if (!u) throw new ErreurMetier(`Utilisateur inconnu : ${courriel}`, 404);
    const nouvelles = { ...u.preferences };
    for (const [cle, valeur] of Object.entries(modifs ?? {})) {
      if (cle === "reunionsSurHeureDiner" || cle === "reunionsHorsBureau") {
        if (typeof valeur !== "boolean") throw new ErreurMetier(`${cle} doit être vrai ou faux.`);
        nouvelles[cle] = valeur;
      } else if (cle === "plageRechercheJours") {
        if (typeof valeur !== "number" || !Number.isInteger(valeur) || valeur < 1 || valeur > 60) {
          throw new ErreurMetier("plageRechercheJours doit être un nombre entier de 1 à 60.");
        }
        nouvelles.plageRechercheJours = valeur;
      } else {
        throw new ErreurMetier(`Préférence inconnue : ${cle}`);
      }
    }
    await this.connecteur.enregistrerPreferences(courriel, nouvelles);
    return nouvelles;
  }

  // ---------------------------------------------------------------------
  // Outils internes
  // ---------------------------------------------------------------------

  private contexte(cal: Calendriers): ContexteAnalyse {
    return {
      entreprise: cal.entreprise,
      utilisateurs: cal.utilisateurs,
      proprietaire: this.connecteur.proprietaire(),
      heuresBureau: cal.heuresBureau,
    };
  }

  private plage(cal: Calendriers): number {
    const p = cal.utilisateurs.find((u) => u.courriel === this.connecteur.proprietaire());
    return p?.preferences.plageRechercheJours ?? PLAGE_PAR_DEFAUT_JOURS;
  }

  private demande(r: Reunion, cal: Calendriers, fenetre = r.fenetre, plusTot = r.recueLe): DemandeCreneau {
    return {
      id: r.id,
      participants: r.participants,
      dureeMinutes: r.dureeMinutes,
      fenetre,
      plusTot,
      plageRechercheJours: this.plage(cal),
    };
  }

  // Créneaux proposés mais pas encore confirmés : ils bloquent les autres propositions.
  private reservations(sauf?: string): ReunionPlacee[] {
    return this.listerReunions()
      .filter((o) => o.statut === "a_confirmer" && o.creneau !== null && o.id !== sauf)
      .map((o) => ({ participants: o.participants, creneau: o.creneau! }));
  }

  private reserver(r: Reunion, creneau: Creneau): void {
    Object.assign(r, { statut: "a_confirmer", creneau, groupeConflit: null, motif: null, suggestion: null });
  }

  private estLibre(cal: Calendriers, r: Reunion, creneau: Creneau): boolean {
    const occupeCalendrier = cal.evenements.some(
      (e) => e.reunionId !== r.id && r.participants.includes(e.proprietaire) && chevauche(e, creneau),
    );
    const occupeReservation = this.reservations(r.id).some(
      (o) => partagent(o.participants, r.participants) && chevauche(o.creneau, creneau),
    );
    return !occupeCalendrier && !occupeReservation;
  }

  // Place une demande autour des calendriers et des autres propositions.
  private placerAutour(r: Reunion, cal: Calendriers): void {
    const creneau = trouverCreneau(cal, this.demande(r, cal), this.reservations(r.id));
    if (creneau) this.reserver(r, creneau);
    else this.marquerDateAConfirmer(r, cal);
  }

  // Aucune place dans les dates demandées : l'utilisateur doit vérifier et
  // confirmer une date. Suggestion : premier créneau libre entre le début des
  // dates demandées et la fin de sa plage de recherche.
  private marquerDateAConfirmer(r: Reunion, cal: Calendriers): void {
    const finPlage = ajouterMinutes(r.recueLe, this.plage(cal) * 24 * 60);
    const debut = r.fenetre?.debut ?? r.recueLe;
    Object.assign(r, {
      statut: "date_a_confirmer",
      creneau: null,
      groupeConflit: null,
      motif: "Aucune place dans les dates demandées : vérifier et confirmer une date.",
      suggestion:
        debut < finPlage
          ? trouverCreneau(cal, this.demande(r, cal, { debut, fin: finPlage }), this.reservations(r.id))
          : null,
    });
  }

  // Après un changement dans les calendriers, une proposition peut ne plus
  // être libre : elle est replacée.
  private async revaliderReservations(): Promise<void> {
    const cal = await this.connecteur.lireCalendriers();
    const valides: ReunionPlacee[] = [];
    const aReplacer: Reunion[] = [];
    for (const r of this.listerReunions().filter((o) => o.statut === "a_confirmer" && o.creneau)) {
      const c = r.creneau!;
      const libre =
        !cal.evenements.some((e) => r.participants.includes(e.proprietaire) && chevauche(e, c)) &&
        !valides.some((v) => partagent(v.participants, r.participants) && chevauche(v.creneau, c));
      if (libre) valides.push({ participants: r.participants, creneau: c });
      else aReplacer.push(r);
    }
    for (const r of aReplacer) r.creneau = null;
    for (const r of aReplacer) {
      this.placerAutour(r, cal);
      this.noter(
        r,
        r.creneau ? `Créneau devenu occupé : replacée ${formaterCreneau(r.creneau)}.` : "Créneau devenu occupé : date à confirmer.",
      );
    }
  }

  // Nouveau créneau après un refus ou une demande de déplacement. On essaie,
  // dans l'ordre : le moment proposé par le participant, les dates de la
  // demande d'origine, puis la plage de recherche de l'utilisateur. Les
  // créneaux déjà refusés sont exclus.
  private async calculerNouveauCreneau(r: Reunion): Promise<Creneau | null> {
    const cal = await this.connecteur.lireCalendriers();
    const sansCetteReunion = { ...cal, evenements: cal.evenements.filter((e) => e.reunionId !== r.id) };
    const bloques = [
      ...this.reservations(),
      ...r.creneauxRefuses.map((creneau) => ({ participants: r.participants, creneau })),
    ];
    const plusTot = r.derniereDemande?.plusTot ?? r.recueLe;
    const essais: (Fenetre | null)[] = [];
    if (r.derniereDemande?.fenetre) essais.push(r.derniereDemande.fenetre);
    if (r.fenetre) essais.push(r.fenetre);
    essais.push(null);
    for (const fenetre of essais) {
      const c = trouverCreneau(sansCetteReunion, this.demande(r, cal, fenetre, plusTot), bloques);
      if (c) return c;
    }
    return null;
  }

  private async demanderIntervention(r: Reunion, motif: string): Promise<void> {
    r.statut = "intervention_requise";
    r.motif = `${motif} Choisir : suivi automatique, ou choisir soi-même un créneau.`;
    r.suggestion = await this.calculerNouveauCreneau(r);
    this.noter(r, "Décision de l'utilisateur requise.");
  }

  private async replanifier(r: Reunion, creneau: Creneau, origine: "automatique" | "utilisateur"): Promise<void> {
    await this.connecteur.deplacerEvenements(r.id, creneau);
    const proprietaire = this.connecteur.proprietaire();
    r.creneau = creneau;
    r.version++;
    r.statut = "en_attente_reponses";
    r.motif = null;
    r.suggestion = null;
    r.reponses = Object.fromEntries(r.participants.map((p) => [p, p === proprietaire ? "acceptation" : "en_attente"]));
    await this.envoyerInvitations(r, await this.connecteur.lireCalendriers());
    this.noter(
      r,
      `${origine === "automatique" ? "Replanifiée automatiquement" : "Déplacée par l'utilisateur"} : ${formaterCreneau(creneau)}. Nouvelle invitation envoyée (version ${r.version}).`,
    );
    this.verifierSiPlanifiee(r);
    await this.revaliderReservations();
  }

  private async envoyerInvitations(r: Reunion, cal: Calendriers): Promise<void> {
    const proprietaire = this.connecteur.proprietaire();
    const destinataires = r.participants.filter((p) => p !== proprietaire);
    if (destinataires.length === 0) return;
    const { objet, corps } = composerInvitation(r, proprietaire, cal.utilisateurs);
    await this.connecteur.envoyer({
      id: `INV-${r.id}-v${r.version}`,
      type: r.version === 1 ? "invitation" : "mise_a_jour",
      a: destinataires,
      objet,
      corps,
      reunionId: r.id,
      version: r.version,
    });
  }

  private verifierSiPlanifiee(r: Reunion): void {
    if (r.statut === "en_attente_reponses" && Object.values(r.reponses).every((e) => e === "acceptation")) {
      r.statut = "planifiee";
      this.noter(r, "Tous les participants ont accepté : réunion planifiée.");
    }
  }

  private creneauDepuis(r: Reunion, debut: string): Creneau {
    if (!estDateValide(debut)) throw new ErreurMetier("Date invalide : format attendu AAAA-MM-JJTHH:MM.");
    if (debut < r.recueLe) throw new ErreurMetier("La date choisie est antérieure à la réception de la demande.");
    return { debut, fin: ajouterMinutes(debut, r.dureeMinutes) };
  }

  private verifierCalendriers(cal: Calendriers, r: Reunion, creneau: Creneau): void {
    const conflits = cal.evenements.filter(
      (e) => e.reunionId !== r.id && r.participants.includes(e.proprietaire) && chevauche(e, creneau),
    );
    if (conflits.length > 0) {
      const detail = conflits.map((e) => `${this.nom(cal, e.proprietaire)} (« ${e.titre} »)`).join(", ");
      throw new ErreurMetier(`Créneau occupé pour : ${detail}.`, 409);
    }
  }

  private verifierMode(mode: unknown): asserts mode is ModeSuivi {
    if (mode !== "automatique" && mode !== "manuel") {
      throw new ErreurMetier("modeSuivi doit valoir « automatique » ou « manuel ».");
    }
  }

  private nom(cal: Calendriers, courriel: string): string {
    return cal.utilisateurs.find((u) => u.courriel === courriel)?.nom ?? courriel;
  }

  private noter(r: Reunion, evenement: string): void {
    r.historique.push({ quand: new Date().toISOString(), evenement });
  }
}
