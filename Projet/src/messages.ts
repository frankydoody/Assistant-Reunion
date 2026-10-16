// Textes des courriels envoyés par l'assistant.

import { formaterCreneau } from "./dates";
import type { Reunion } from "./modele";
import type { Utilisateur } from "./types";

function nom(courriel: string, utilisateurs: Utilisateur[]): string {
  return utilisateurs.find((u) => u.courriel === courriel)?.nom ?? courriel;
}

export function composerInvitation(
  r: Reunion,
  proprietaire: string,
  utilisateurs: Utilisateur[],
): { objet: string; corps: string } {
  if (!r.creneau) throw new Error(`La réunion ${r.id} n'a pas de créneau.`);
  const miseAJour = r.version > 1;
  const objet = `${miseAJour ? "Mise à jour" : "Invitation"} : ${r.sujet}`;
  const participants = r.participants.map((p) => `- ${nom(p, utilisateurs)}`).join("\n");
  const corps = `Bonjour,

${nom(proprietaire, utilisateurs)} vous ${miseAJour ? "informe que la réunion a été déplacée" : "invite à une réunion"}.

Sujet : ${r.sujet}
Quand : ${formaterCreneau(r.creneau)}
Participants :
${participants}

Répondez à ce courriel pour accepter, refuser ou proposer un autre moment.

Ce message a été préparé par l'assistant de planification de réunions.`;
  return { objet, corps };
}
