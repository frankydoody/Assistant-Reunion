// Liste des réunions, filtrée par état.

import { useState } from "react";
import { EnTete, EtatVide, PuceStatut } from "../composants/communs";
import { useApp } from "../contexte";
import { dateCourte, formaterHeure } from "../format";
import { lien, naviguer } from "../routeur";
import type { Reunion } from "../types";

const FILTRES: { id: string; libelle: string; garde: (r: Reunion) => boolean }[] = [
  { id: "envoyees", libelle: "Envoyées", garde: (r) => r.version > 0 },
  { id: "attente", libelle: "En attente", garde: (r) => r.statut === "en_attente_reponses" || r.statut === "intervention_requise" },
  { id: "planifiees", libelle: "Planifiées", garde: (r) => r.statut === "planifiee" },
  { id: "toutes", libelle: "Toutes", garde: () => true },
];

export function Reunions() {
  const { etat, personnes } = useApp();
  const [filtre, setFiltre] = useState("envoyees");
  if (!etat) return null;
  const garde = FILTRES.find((f) => f.id === filtre)!.garde;
  const liste = etat.reunions
    .filter(garde)
    .sort((a, b) => (a.creneau?.debut ?? "9999").localeCompare(b.creneau?.debut ?? "9999"));

  return (
    <>
      <EnTete titre="Réunions" sousTitre="Les réunions gérées par l'assistant, avec les réponses des participants." />
      <div className="onglets" role="tablist" aria-label="Filtrer les réunions">
        {FILTRES.map((f) => (
          <button key={f.id} role="tab" aria-selected={filtre === f.id} className={filtre === f.id ? "onglet actif" : "onglet"} onClick={() => setFiltre(f.id)}>
            {f.libelle} <span className="compte">{etat.reunions.filter(f.garde).length}</span>
          </button>
        ))}
      </div>

      {liste.length === 0 ? (
        <EtatVide titre="Aucune réunion ici">
          Confirmez des demandes dans <a href={lien("traiter")}>À traiter</a>.
        </EtatVide>
      ) : (
        <div className="tableau-conteneur">
          <table className="tableau">
            <thead>
              <tr>
                <th>Sujet</th>
                <th>Quand</th>
                <th>Réponses</th>
                <th>Suivi</th>
                <th>Statut</th>
              </tr>
            </thead>
            <tbody>
              {liste.map((r) => {
                const reponses = Object.entries(r.reponses).filter(([p]) => p !== etat.proprietaire);
                const acceptees = reponses.filter(([, e]) => e === "acceptation").length;
                return (
                  <tr key={r.id} className="ligne-cliquable" onClick={() => naviguer(`reunions/${r.id}`)}>
                    <td>
                      <a href={lien(`reunions/${r.id}`)} onClick={(e) => e.stopPropagation()}>
                        {r.sujet}
                      </a>
                      <div className="secondaire petit">{r.participants.map((p) => personnes.prenom(p)).join(", ")}</div>
                    </td>
                    <td>{r.creneau ? `${dateCourte(r.creneau.debut)} à ${formaterHeure(r.creneau.fin)}` : "—"}</td>
                    <td>{reponses.length ? `${acceptees} / ${reponses.length} acceptées` : "—"}</td>
                    <td>{r.modeSuivi ? (r.modeSuivi === "automatique" ? "Automatique" : "Manuel") : "—"}</td>
                    <td>
                      <PuceStatut statut={r.statut} />
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </>
  );
}
