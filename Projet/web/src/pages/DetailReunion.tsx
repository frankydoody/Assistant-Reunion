// Détail d'une réunion : informations, réponses, actions et historique.

import { useState } from "react";
import { api } from "../api";
import { EnTete, EtatVide, Personne, Puce, PuceStatut, SelecteurMode } from "../composants/communs";
import { ActionsSelonStatut } from "../composants/Decisions";
import { useApp } from "../contexte";
import { dateCourte, duree, formaterCreneau, formaterFenetre, LIBELLE_REPONSE, TON_REPONSE } from "../format";
import { lien } from "../routeur";

export function DetailReunion({ id }: { id: string }) {
  const { etat, agir, occupe, personnes } = useApp();
  const [deplacer, setDeplacer] = useState(false);
  const [debut, setDebut] = useState("");
  const r = etat?.reunions.find((x) => x.id === id);

  if (!r) {
    return (
      <EtatVide titre="Réunion introuvable">
        <a href={lien("reunions")}>Retour aux réunions</a>
      </EtatVide>
    );
  }
  const envoyee = r.version > 0;
  const peutDeplacer = ["en_attente_reponses", "intervention_requise", "planifiee"].includes(r.statut);

  return (
    <>
      <a className="retour" href={lien("reunions")}>
        ← Réunions
      </a>
      <EnTete titre={r.sujet} sousTitre={`Demandée par ${personnes.nom(r.demandeur)}, reçue ${dateCourte(r.recueLe)}`} actions={<PuceStatut statut={r.statut} />} />

      <div className="grille-detail">
        <div className="colonne">
          <section className="carte">
            <h2>Réunion</h2>
            <dl className="definitions">
              <dt>Quand</dt>
              <dd>{r.creneau ? formaterCreneau(r.creneau) : "Pas encore fixé"}</dd>
              <dt>Durée</dt>
              <dd>
                {duree(r.dureeMinutes)} {r.dureeParDefaut && <Puce ton="jaune">par défaut</Puce>}
              </dd>
              <dt>Dates demandées</dt>
              <dd>{r.fenetre ? formaterFenetre(r.fenetre) : "Aucune précision dans le courriel"}</dd>
              <dt>Courriel d'origine</dt>
              <dd>
                <a href={lien("boite")}>« {r.objetCourriel} »</a>
              </dd>
              {envoyee && (
                <>
                  <dt>Invitation</dt>
                  <dd>
                    Version {r.version}
                    {r.replanifications > 0 && ` · ${r.replanifications} replanification(s) automatique(s)`}
                  </dd>
                </>
              )}
            </dl>
            {r.motif && <p className="motif">{r.motif}</p>}
          </section>

          <section className="carte">
            <h2>Participants</h2>
            <ul className="liste-reponses">
              {r.participants.map((p) => {
                const reponse = r.reponses[p];
                return (
                  <li key={p}>
                    <Personne courriel={p} details={p === etat!.proprietaire ? <span className="secondaire petit">(vous)</span> : null} />
                    {reponse && p !== etat!.proprietaire && <Puce ton={TON_REPONSE[reponse]}>{LIBELLE_REPONSE[reponse]}</Puce>}
                  </li>
                );
              })}
            </ul>
          </section>

          {(!envoyee || r.statut === "intervention_requise") && (
            <section className="carte">
              <h2>Décision</h2>
              <div className="carte-actions">
                <ActionsSelonStatut r={r} />
              </div>
            </section>
          )}

          {envoyee && r.statut !== "intervention_requise" && (
            <section className="carte">
              <h2>Suivi</h2>
              {(r.statut === "en_attente_reponses") && (
                <SelecteurMode
                  valeur={r.modeSuivi ?? "manuel"}
                  desactive={occupe !== null}
                  surChangement={(m) => void agir(r.id, () => api.changerMode(r.id, m), `Suivi ${m} activé.`)}
                />
              )}
              {peutDeplacer &&
                (deplacer ? (
                  <div className="choix-moment">
                    <label>
                      <span className="etiquette">Nouveau début</span>
                      <input type="datetime-local" step={900} value={debut} onChange={(e) => setDebut(e.target.value.slice(0, 16))} />
                    </label>
                    <button
                      className="bouton bouton-principal"
                      disabled={!debut || occupe !== null}
                      onClick={async () => {
                        if (await agir(r.id, () => api.choisirCreneau(r.id, debut), "Réunion déplacée : nouvelle invitation envoyée.")) setDeplacer(false);
                      }}
                    >
                      Déplacer
                    </button>
                    <button className="bouton bouton-discret" onClick={() => setDeplacer(false)}>
                      Annuler
                    </button>
                  </div>
                ) : (
                  <button
                    className="bouton bouton-secondaire"
                    onClick={() => {
                      setDebut(r.creneau?.debut ?? "");
                      setDeplacer(true);
                    }}
                  >
                    Déplacer la réunion
                  </button>
                ))}
            </section>
          )}
        </div>

        <section className="carte colonne-historique" aria-labelledby="titre-historique">
          <h2 id="titre-historique">Historique</h2>
          <ol className="historique">
            {[...r.historique].reverse().map((h, i) => (
              <li key={i}>
                <span className="historique-point" aria-hidden="true" />
                <p>{h.evenement}</p>
                <time className="secondaire petit">{new Date(h.quand).toLocaleString("fr-CA", { dateStyle: "medium", timeStyle: "short" })}</time>
              </li>
            ))}
          </ol>
        </section>
      </div>
    </>
  );
}
