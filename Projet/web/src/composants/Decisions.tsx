// Carte d'une réunion qui attend une décision de l'utilisateur, avec les
// actions possibles selon son statut.

import { useState, type ReactNode } from "react";
import { api } from "../api";
import { useApp } from "../contexte";
import { dateCourte, duree, formaterCreneau } from "../format";
import { lien } from "../routeur";
import type { ModeSuivi, Reunion } from "../types";
import { Personne, Puce, PuceStatut, SelecteurMode } from "./communs";

export function CarteReunion(props: { r: Reunion; children?: ReactNode; compacte?: boolean }) {
  const { r } = props;
  const { personnes } = useApp();
  return (
    <article className="carte carte-reunion" aria-labelledby={`titre-${r.id}`}>
      <div className="carte-entete">
        <div>
          <h3 id={`titre-${r.id}`}>
            <a href={lien(`reunions/${r.id}`)}>{r.sujet}</a>
          </h3>
          <p className="secondaire petit">
            Demandée par {personnes.nom(r.demandeur)} · reçue {dateCourte(r.recueLe)} · « {r.objetCourriel} »
          </p>
        </div>
        <PuceStatut statut={r.statut} />
      </div>

      <div className="carte-corps">
        <div className="info-creneau">
          <span className="etiquette">{r.statut === "date_a_confirmer" ? "Aucune place trouvée" : "Créneau proposé"}</span>
          <strong>{r.creneau ? formaterCreneau(r.creneau) : "—"}</strong>
          <span className="secondaire petit">
            Durée : {duree(r.dureeMinutes)}
            {r.dureeParDefaut && <Puce ton="jaune" titre="Le courriel ne précisait pas la durée">par défaut</Puce>}
          </span>
        </div>
        {!props.compacte && (
          <div className="participants">
            <span className="etiquette">Participants</span>
            <div className="liste-personnes">
              {r.participants.map((p) => (
                <Personne key={p} courriel={p} />
              ))}
            </div>
          </div>
        )}
      </div>

      {r.motif && r.statut !== "conflit" && <p className="motif">{r.motif}</p>}
      {r.avertissements.length > 0 && (
        <details className="avertissements">
          <summary>Corrections faites par la validation ({r.avertissements.length})</summary>
          <ul>
            {r.avertissements.map((a) => (
              <li key={a}>{a}</li>
            ))}
          </ul>
        </details>
      )}
      {props.children && <div className="carte-actions">{props.children}</div>}
    </article>
  );
}

function ChoixMoment(props: { initial: string; libelle: string; surValider: (debut: string) => void; desactive: boolean; annuler?: () => void }) {
  const [debut, setDebut] = useState(props.initial);
  return (
    <div className="choix-moment">
      <label>
        <span className="etiquette">Début</span>
        <input type="datetime-local" step={900} value={debut} onChange={(e) => setDebut(e.target.value.slice(0, 16))} />
      </label>
      <button className="bouton bouton-principal" disabled={!debut || props.desactive} onClick={() => props.surValider(debut)}>
        {props.libelle}
      </button>
      {props.annuler && (
        <button className="bouton bouton-discret" onClick={props.annuler}>
          Annuler
        </button>
      )}
    </div>
  );
}

function BoutonEcarter({ r }: { r: Reunion }) {
  const { agir, occupe } = useApp();
  const [confirmation, setConfirmation] = useState(false);
  if (!confirmation) {
    return (
      <button className="bouton bouton-discret" onClick={() => setConfirmation(true)} disabled={occupe !== null}>
        Écarter
      </button>
    );
  }
  return (
    <span className="confirmation-ecart">
      Écarter cette demande ?
      <button className="bouton bouton-danger" onClick={() => void agir(r.id, () => api.ignorer(r.id), "Demande écartée.")}>
        Oui, écarter
      </button>
      <button className="bouton bouton-discret" onClick={() => setConfirmation(false)}>
        Non
      </button>
    </span>
  );
}

export function ActionsConfirmer({ r }: { r: Reunion }) {
  const { agir, occupe } = useApp();
  const [mode, setMode] = useState<ModeSuivi>("manuel");
  const [autre, setAutre] = useState(false);
  const occupeIci = occupe === r.id;
  const confirmer = (debut?: string) =>
    void agir(r.id, () => api.confirmer(r.id, mode, debut), "Réunion confirmée : invitation envoyée aux participants.");

  return (
    <>
      <SelecteurMode valeur={mode} surChangement={setMode} desactive={occupeIci} />
      {autre ? (
        <ChoixMoment initial={r.creneau?.debut ?? r.recueLe} libelle="Confirmer à ce moment" desactive={occupe !== null} surValider={confirmer} annuler={() => setAutre(false)} />
      ) : (
        <div className="rangee-boutons">
          <button className="bouton bouton-principal" onClick={() => confirmer()} disabled={occupe !== null}>
            {occupeIci ? "Envoi…" : "Confirmer et envoyer l'invitation"}
          </button>
          <button className="bouton bouton-secondaire" onClick={() => setAutre(true)} disabled={occupe !== null}>
            Choisir un autre moment
          </button>
          <BoutonEcarter r={r} />
        </div>
      )}
    </>
  );
}

export function ActionsDateAConfirmer({ r }: { r: Reunion }) {
  const { agir, occupe } = useApp();
  const [mode, setMode] = useState<ModeSuivi>("manuel");
  return (
    <>
      <p className="aide">
        {r.suggestion
          ? `Suggestion de l'assistant : ${formaterCreneau(r.suggestion)}. Vérifiez la date, puis confirmez.`
          : "Aucune suggestion dans votre plage de recherche. Choisissez une date."}
      </p>
      <SelecteurMode valeur={mode} surChangement={setMode} />
      <div className="rangee-boutons">
        <ChoixMoment
          initial={r.suggestion?.debut ?? r.recueLe}
          libelle="Confirmer cette date"
          desactive={occupe !== null}
          surValider={(debut) => void agir(r.id, () => api.confirmer(r.id, mode, debut), "Date confirmée : invitation envoyée.")}
        />
        <BoutonEcarter r={r} />
      </div>
    </>
  );
}

export function ActionsConflit({ r }: { r: Reunion }) {
  const { agir, occupe } = useApp();
  return (
    <div className="rangee-boutons">
      <button
        className="bouton bouton-principal"
        disabled={occupe !== null}
        onClick={() => void agir(r.id, () => api.prioritaire(r.id), "Réunion prioritaire choisie : les autres ont été replacées.")}
      >
        Rendre prioritaire
      </button>
      <BoutonEcarter r={r} />
    </div>
  );
}

export function ActionsIntervention({ r }: { r: Reunion }) {
  const { agir, occupe } = useApp();
  const [autre, setAutre] = useState(false);
  return (
    <>
      <div className="rangee-boutons">
        <button
          className="bouton bouton-principal"
          disabled={occupe !== null}
          onClick={() => void agir(r.id, () => api.changerMode(r.id, "automatique"), "Suivi automatique activé : l'assistant replanifie.")}
        >
          Laisser l'assistant replanifier
        </button>
        {r.suggestion && (
          <button
            className="bouton bouton-secondaire"
            disabled={occupe !== null}
            onClick={() => void agir(r.id, () => api.choisirCreneau(r.id, r.suggestion!.debut), "Réunion déplacée : nouvelle invitation envoyée.")}
          >
            Choisir : {dateCourte(r.suggestion.debut)}
          </button>
        )}
        {!autre && (
          <button className="bouton bouton-discret" onClick={() => setAutre(true)} disabled={occupe !== null}>
            Autre moment
          </button>
        )}
      </div>
      {autre && (
        <ChoixMoment
          initial={r.suggestion?.debut ?? r.creneau?.debut ?? r.recueLe}
          libelle="Déplacer à ce moment"
          desactive={occupe !== null}
          surValider={(debut) => void agir(r.id, () => api.choisirCreneau(r.id, debut), "Réunion déplacée : nouvelle invitation envoyée.")}
          annuler={() => setAutre(false)}
        />
      )}
    </>
  );
}

export function ActionsSelonStatut({ r }: { r: Reunion }) {
  if (r.statut === "a_confirmer") return <ActionsConfirmer r={r} />;
  if (r.statut === "date_a_confirmer") return <ActionsDateAConfirmer r={r} />;
  if (r.statut === "conflit") return <ActionsConflit r={r} />;
  if (r.statut === "intervention_requise") return <ActionsIntervention r={r} />;
  return null;
}
