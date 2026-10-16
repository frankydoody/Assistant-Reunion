// Mode démo : faire répondre les participants fictifs aux invitations.

import { useEffect, useState } from "react";
import { api } from "../api";
import { EnTete, Personne } from "../composants/communs";
import { useApp } from "../contexte";
import { lien } from "../routeur";
import type { ReponseDemo } from "../types";

export function Demo() {
  const { agir, occupe, versionDonnees, notifier, etat } = useApp();
  const [reponses, setReponses] = useState<ReponseDemo[] | null>(null);

  useEffect(() => {
    api.reponsesDemo().then(setReponses).catch((e) => notifier(e.message, "erreur"));
  }, [versionDonnees, notifier]);

  if (!reponses || !etat) return <p className="secondaire">Chargement…</p>;

  return (
    <>
      <EnTete
        titre="Démo : réponses des participants"
        sousTitre="Dans la vraie vie, les participants répondent par courriel. Ici, vous déclenchez leurs réponses pour voir l'assistant réagir."
        actions={
          <button className="bouton bouton-secondaire" disabled={occupe !== null} onClick={() => void agir("reinit", () => api.reinitialiserDemo(), "Démo remise à zéro : relecture de la boîte.")}>
            Recommencer la démo
          </button>
        }
      />

      <ol className="etapes-demo">
        <li>Dans <a href={lien("traiter")}>À traiter</a>, réglez les créneaux en double et confirmez des réunions (choisissez le suivi manuel ou automatique).</li>
        <li>Revenez ici et envoyez des réponses. Un refus ou une demande de déplacement en suivi automatique déclenche une replanification; en suivi manuel, une décision apparaît dans À traiter.</li>
        <li>Suivez le résultat dans <a href={lien("reunions")}>Réunions</a>, le <a href={lien("calendrier")}>Calendrier</a> et la <a href={lien("boite")}>Boîte de réception</a>.</li>
      </ol>

      <div className="liste-demo">
        {reponses.map((r) => {
          const reunion = etat.reunions.find((x) => x.id === r.reunionId);
          return (
            <article key={r.id} className="carte carte-demo">
              <div className="carte-demo-entete">
                <Personne courriel={r.de} />
                <span className="secondaire petit">
                  répond à {reunion ? <a href={lien(`reunions/${reunion.id}`)}>« {reunion.sujet} »</a> : `la demande ${r.demande}`}
                </span>
              </div>
              <blockquote>{r.corps.split("\n\n")[0]}</blockquote>
              <div className="rangee-boutons">
                <button
                  className="bouton bouton-principal"
                  disabled={!r.disponible || occupe !== null}
                  onClick={() => void agir(r.id, () => api.envoyerReponseDemo(r.id), "Réponse reçue et traitée par l'assistant.")}
                >
                  {occupe === r.id ? "Traitement…" : "Envoyer cette réponse"}
                </button>
                {!r.disponible && (
                  <span className="secondaire petit">
                    {r.dejaEnvoyee && reunion?.version && !r.disponible
                      ? "Déjà envoyée pour cette version de l'invitation."
                      : "Confirmez d'abord cette réunion pour pouvoir y répondre."}
                  </span>
                )}
              </div>
            </article>
          );
        })}
      </div>
    </>
  );
}
