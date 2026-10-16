// Types partagés par toute l'application.
// Les dates sont des chaînes locales au format AAAA-MM-JJTHH:MM (sans fuseau).

// Configuration de l'assistant propre à chaque utilisateur.
// D'autres réglages pourront s'ajouter ici plus tard.
export interface Preferences {
  reunionsSurHeureDiner: boolean; // accepte des réunions pendant l'heure du dîner
  reunionsHorsBureau: boolean; // accepte des réunions en dehors des heures de bureau
  plageRechercheJours: number; // jusqu'où l'assistant cherche un créneau après la réception du courriel
}

export interface Utilisateur {
  courriel: string;
  nom: string;
  role: string;
  preferences: Preferences;
}

export interface Evenement {
  proprietaire: string; // courriel de l'utilisateur
  titre: string;
  debut: string;
  fin: string;
  reunionId?: string; // présent si l'événement a été créé par l'assistant
}

export interface Calendriers {
  entreprise: string;
  heuresBureau: { debut: string; fin: string }; // HH:MM
  heureDiner: { debut: string; fin: string }; // HH:MM
  heuresEtendues: { debut: string; fin: string }; // limites pour ceux qui acceptent le hors bureau
  utilisateurs: Utilisateur[];
  evenements: Evenement[];
}

export interface Fenetre {
  debut: string;
  fin: string;
}

// Résultat attendu pour un courriel : sert à mesurer la qualité de l'IA.
export interface Attendu {
  estReunion: boolean;
  sujet?: string;
  participants?: string[];
  dureeMinutes?: number | null; // null : durée non précisée dans le courriel
  fenetre?: Fenetre | null; // null : aucune contrainte de date dans le courriel
}

// Un courriel tel que l'assistant le reçoit.
export interface CourrielRecu {
  id: string;
  de: string;
  a: string[];
  date: string;
  objet: string;
  corps: string;
  enReponseA?: string; // identifiant de l'invitation à laquelle ce courriel répond
}

// Un courriel des données fictives, avec le résultat attendu de l'IA.
export interface Courriel extends CourrielRecu {
  attendu: Attendu;
}

export interface BoiteReception {
  proprietaire: string;
  courriels: Courriel[];
}

export type TypeReponse = "acceptation" | "refus" | "deplacement";

// Réponse fictive d'un participant à une invitation, avec le résultat attendu.
export interface ReponseTest {
  id: string;
  demande: string; // identifiant du courriel de demande de réunion
  de: string;
  date: string;
  corps: string;
  attendu: { type: TypeReponse; fenetre: Fenetre | null };
}
