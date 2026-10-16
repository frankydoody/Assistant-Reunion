// Boîte de réception et courriels envoyés par l'assistant.

import { useEffect, useState } from "react";
import { api } from "../api";
import { EnTete, EtatVide, Puce } from "../composants/communs";
import { useApp } from "../contexte";
import { dateCourte } from "../format";
import { lien } from "../routeur";
import type { CourrielBoite, CourrielEnvoye } from "../types";

function EtatCourriel({ c }: { c: CourrielBoite }) {
  if (!c.traite) return <Puce ton="bleu">Pas encore lu</Puce>;
  if (c.enReponseA) return <Puce ton="neutre">Réponse à une invitation</Puce>;
  if (c.reunionId) return <Puce ton="vert">Demande de réunion</Puce>;
  return <Puce ton="neutre">Sans rapport</Puce>;
}

export function Boite() {
  const { versionDonnees, personnes, notifier } = useApp();
  const [onglet, setOnglet] = useState<"recus" | "envoyes">("recus");
  const [recus, setRecus] = useState<CourrielBoite[] | null>(null);
  const [envoyes, setEnvoyes] = useState<CourrielEnvoye[] | null>(null);
  const [ouvert, setOuvert] = useState<string | null>(null);

  useEffect(() => {
    Promise.all([api.courriels(), api.envois()])
      .then(([r, e]) => {
        setRecus(r);
        setEnvoyes([...e].reverse());
      })
      .catch((e) => notifier(e.message, "erreur"));
  }, [versionDonnees, notifier]);

  if (!recus || !envoyes) return <p className="secondaire">Chargement…</p>;
  const basculer = (id: string) => setOuvert(ouvert === id ? null : id);

  return (
    <>
      <EnTete titre="Boîte de réception" sousTitre="Ce que l'assistant a lu et ce qu'il a envoyé en votre nom." />
      <div className="onglets" role="tablist">
        <button role="tab" aria-selected={onglet === "recus"} className={onglet === "recus" ? "onglet actif" : "onglet"} onClick={() => setOnglet("recus")}>
          Reçus <span className="compte">{recus.length}</span>
        </button>
        <button role="tab" aria-selected={onglet === "envoyes"} className={onglet === "envoyes" ? "onglet actif" : "onglet"} onClick={() => setOnglet("envoyes")}>
          Envoyés par l'assistant <span className="compte">{envoyes.length}</span>
        </button>
      </div>

      {onglet === "recus" ? (
        <ul className="liste-courriels">
          {recus.map((c) => (
            <li key={c.id} className={ouvert === c.id ? "courriel ouvert" : "courriel"}>
              <button className="courriel-entete" aria-expanded={ouvert === c.id} onClick={() => basculer(c.id)}>
                <span className="courriel-de">{personnes.nom(c.de)}</span>
                <span className="courriel-objet">{c.objet}</span>
                <EtatCourriel c={c} />
                <span className="courriel-date secondaire">{dateCourte(c.date)}</span>
              </button>
              {ouvert === c.id && (
                <div className="courriel-corps">
                  <p className="secondaire petit">De : {c.de} · À : {c.a.join(", ")}</p>
                  <pre>{c.corps}</pre>
                  {c.reunionId && <a href={lien(`reunions/${c.reunionId}`)}>Voir la réunion →</a>}
                </div>
              )}
            </li>
          ))}
        </ul>
      ) : envoyes.length === 0 ? (
        <EtatVide titre="Aucun courriel envoyé">Les invitations partent quand vous confirmez une réunion.</EtatVide>
      ) : (
        <ul className="liste-courriels">
          {envoyes.map((c) => (
            <li key={c.id} className={ouvert === c.id ? "courriel ouvert" : "courriel"}>
              <button className="courriel-entete" aria-expanded={ouvert === c.id} onClick={() => basculer(c.id)}>
                <span className="courriel-de">À : {c.a.map((a) => personnes.prenom(a)).join(", ")}</span>
                <span className="courriel-objet">{c.objet}</span>
                <Puce ton={c.type === "invitation" ? "bleu" : "jaune"}>{c.type === "invitation" ? "Invitation" : "Mise à jour"}</Puce>
                <span className="courriel-date secondaire">v{c.version}</span>
              </button>
              {ouvert === c.id && (
                <div className="courriel-corps">
                  <pre>{c.corps}</pre>
                  <a href={lien(`reunions/${c.reunionId}`)}>Voir la réunion →</a>
                </div>
              )}
            </li>
          ))}
        </ul>
      )}
    </>
  );
}
