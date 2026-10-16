// Erreur prévue par les règles de l'assistant (requête invalide, action
// impossible dans l'état actuel). Le serveur la renvoie avec son code HTTP.
export class ErreurMetier extends Error {
  constructor(message: string, readonly statut = 400) {
    super(message);
    this.name = "ErreurMetier";
  }
}

// La réponse de l'IA est inutilisable (format invalide, champ manquant).
export class ErreurIA extends Error {
  constructor(message: string) {
    super(message);
    this.name = "ErreurIA";
  }
}
