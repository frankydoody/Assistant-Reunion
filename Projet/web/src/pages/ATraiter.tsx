// Écran principal : tout ce qui attend une décision de l'utilisateur.

import { BarreLecture } from "../composants/BarreLecture";
import { EnTete, EtatVide } from "../composants/communs";
import { ActionsConflit, ActionsConfirmer, ActionsDateAConfirmer, ActionsIntervention, CarteReunion } from "../composants/Decisions";
import { useApp } from "../contexte";
import { lien } from "../routeur";

export function ATraiter() {
  const { etat } = useApp();
  if (!etat) return null;
  const reunions = etat.reunions;
  const interventions = reunions.filter((r) => r.statut === "intervention_requise");
  const enConflit = reunions.filter((r) => r.statut === "conflit");
  const groupes = [...new Set(enConflit.map((r) => r.groupeConflit!))].map((g) => enConflit.filter((r) => r.groupeConflit === g));
  const aConfirmer = reunions.filter((r) => r.statut === "a_confirmer");
  const dates = reunions.filter((r) => r.statut === "date_a_confirmer");
  const total = interventions.length + enConflit.length + aConfirmer.length + dates.length;

  return (
    <>
      <EnTete
        titre="À traiter"
        sousTitre={total === 0 ? "Tout est à jour." : total === 1 ? "1 réunion attend votre décision." : `${total} réunions attendent votre décision.`}
      />
      <BarreLecture />

      {total === 0 && !etat.progression.enCours && (
        <EtatVide titre="Rien à traiter pour l'instant">
          Les réunions envoyées sont dans <a href={lien("reunions")}>Réunions</a>.
        </EtatVide>
      )}

      {interventions.length > 0 && (
        <section className="section" aria-labelledby="titre-interventions">
          <h2 id="titre-interventions">Réponses à régler <span className="compte">{interventions.length}</span></h2>
          <p className="secondaire">Un participant a refusé ou demande un autre moment.</p>
          {interventions.map((r) => (
            <CarteReunion key={r.id} r={r}>
              <ActionsIntervention r={r} />
            </CarteReunion>
          ))}
        </section>
      )}

      {groupes.length > 0 && (
        <section className="section" aria-labelledby="titre-conflits">
          <h2 id="titre-conflits">Créneaux en double <span className="compte">{groupes.length}</span></h2>
          <p className="secondaire">Ces demandes veulent le même moment. Choisissez la plus importante; l'assistant replace les autres.</p>
          {groupes.map((g) => (
            <div key={g[0].groupeConflit} className="groupe-conflit">
              {g.map((r) => (
                <CarteReunion key={r.id} r={r} compacte>
                  <ActionsConflit r={r} />
                </CarteReunion>
              ))}
            </div>
          ))}
        </section>
      )}

      {aConfirmer.length > 0 && (
        <section className="section" aria-labelledby="titre-confirmer">
          <h2 id="titre-confirmer">À confirmer <span className="compte">{aConfirmer.length}</span></h2>
          <p className="secondaire">Rien n'est envoyé avant votre confirmation.</p>
          {aConfirmer.map((r) => (
            <CarteReunion key={r.id} r={r}>
              <ActionsConfirmer r={r} />
            </CarteReunion>
          ))}
        </section>
      )}

      {dates.length > 0 && (
        <section className="section" aria-labelledby="titre-dates">
          <h2 id="titre-dates">Dates à vérifier <span className="compte">{dates.length}</span></h2>
          <p className="secondaire">Aucune place libre dans les dates demandées.</p>
          {dates.map((r) => (
            <CarteReunion key={r.id} r={r}>
              <ActionsDateAConfirmer r={r} />
            </CarteReunion>
          ))}
        </section>
      )}
    </>
  );
}
