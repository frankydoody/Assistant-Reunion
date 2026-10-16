// Outils de simulation : transformer une réponse fictive de participant en
// courriel qui répond à la dernière invitation envoyée.

import { ErreurMetier } from "./erreurs";
import type { Reunion } from "./modele";
import type { CourrielRecu, ReponseTest } from "./types";

export function courrielDeReponse(test: ReponseTest, reunion: Reunion, proprietaire: string): CourrielRecu {
  if (reunion.version === 0) {
    throw new ErreurMetier(`La réunion ${reunion.id} n'a encore envoyé aucune invitation.`, 409);
  }
  return {
    id: `${test.id}@v${reunion.version}`,
    de: test.de,
    a: [proprietaire],
    date: test.date,
    objet: `Re: ${reunion.version > 1 ? "Mise à jour" : "Invitation"} : ${reunion.sujet}`,
    corps: test.corps,
    enReponseA: `INV-${reunion.id}-v${reunion.version}`,
  };
}
