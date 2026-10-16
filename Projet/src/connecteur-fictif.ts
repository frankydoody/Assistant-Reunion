// Connecteur fictif : boîte de réception et calendriers chargés des fichiers
// JSON, puis gardés en mémoire. Rien n'est écrit sur le disque : un
// redémarrage remet les données fictives à leur état initial.

import type { Connecteur } from "./connecteur";
import type { Creneau } from "./creneaux";
import { ErreurMetier } from "./erreurs";
import type { CourrielEnvoye } from "./modele";
import type { BoiteReception, Calendriers, CourrielRecu, Preferences } from "./types";

export class ConnecteurFictif implements Connecteur {
  readonly nom = "fictif (fichiers JSON en mémoire)";
  private readonly calendriers: Calendriers;
  private readonly boite: CourrielRecu[];
  private readonly adresse: string;
  private readonly traites = new Set<string>();
  private readonly boiteEnvoi: CourrielEnvoye[] = [];

  constructor(calendriers: Calendriers, boite: BoiteReception) {
    this.calendriers = structuredClone(calendriers);
    // On retire les résultats attendus : l'assistant ne doit pas les voir.
    this.boite = boite.courriels.map(({ attendu: _attendu, ...courriel }) => courriel);
    this.adresse = boite.proprietaire;
  }

  proprietaire(): string {
    return this.adresse;
  }

  // Simulation : dépose un courriel dans la boîte (par exemple une réponse de participant).
  recevoir(courriel: CourrielRecu): void {
    if (this.boite.some((c) => c.id === courriel.id)) {
      throw new ErreurMetier(`Le courriel ${courriel.id} a déjà été reçu.`, 409);
    }
    this.boite.push(structuredClone(courriel));
  }

  async nouveauxCourriels(): Promise<CourrielRecu[]> {
    return this.boite
      .filter((c) => !this.traites.has(c.id))
      .sort((a, b) => a.date.localeCompare(b.date))
      .map((c) => structuredClone(c));
  }

  async courriels(): Promise<{ courriel: CourrielRecu; traite: boolean }[]> {
    return this.boite
      .map((c) => ({ courriel: structuredClone(c), traite: this.traites.has(c.id) }))
      .sort((a, b) => b.courriel.date.localeCompare(a.courriel.date));
  }

  async marquerTraite(id: string): Promise<void> {
    this.traites.add(id);
  }

  async envoyer(courriel: CourrielEnvoye): Promise<void> {
    this.boiteEnvoi.push(structuredClone(courriel));
  }

  async envois(): Promise<CourrielEnvoye[]> {
    return structuredClone(this.boiteEnvoi);
  }

  async lireCalendriers(): Promise<Calendriers> {
    return structuredClone(this.calendriers);
  }

  async creerEvenements(reunionId: string, titre: string, participants: string[], creneau: Creneau): Promise<void> {
    for (const proprietaire of participants) {
      this.calendriers.evenements.push({ proprietaire, titre, debut: creneau.debut, fin: creneau.fin, reunionId });
    }
  }

  async deplacerEvenements(reunionId: string, creneau: Creneau): Promise<void> {
    for (const e of this.calendriers.evenements) {
      if (e.reunionId === reunionId) {
        e.debut = creneau.debut;
        e.fin = creneau.fin;
      }
    }
  }

  async enregistrerPreferences(courriel: string, preferences: Preferences): Promise<void> {
    const u = this.calendriers.utilisateurs.find((x) => x.courriel === courriel);
    if (!u) throw new ErreurMetier(`Utilisateur inconnu : ${courriel}`, 404);
    u.preferences = { ...preferences };
  }
}
