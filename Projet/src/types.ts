// Types partagés par toute l'application.
// Les dates sont des chaînes locales au format AAAA-MM-JJTHH:MM (sans fuseau).

export interface Utilisateur {
  courriel: string;
  nom: string;
  role: string;
}

export interface Evenement {
  proprietaire: string; // courriel de l'utilisateur
  titre: string;
  debut: string;
  fin: string;
}

export interface Calendriers {
  entreprise: string;
  heuresBureau: { debut: string; fin: string }; // HH:MM
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

export interface Courriel {
  id: string;
  de: string;
  a: string[];
  date: string;
  objet: string;
  corps: string;
  attendu: Attendu;
}

export interface BoiteReception {
  proprietaire: string;
  courriels: Courriel[];
}
