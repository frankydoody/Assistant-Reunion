// Premier écran : connecter un service de courriel et de calendrier, ou essayer la démo.

import { useState } from "react";
import { api } from "../api";
import { Logo } from "../composants/communs";
import { useInstallation } from "../installation";
import type { Session } from "../types";

export function Connexion(props: { session: Session; surConnexion: () => Promise<void> }) {
  const [occupe, setOccupe] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const installation = useInstallation();

  async function connecter(id: string) {
    setOccupe(id);
    setMessage(null);
    try {
      if (id === "demo") await api.demarrerDemo();
      else await api.connecter(id);
      await props.surConnexion();
    } catch (e) {
      setMessage(e instanceof Error ? e.message : String(e));
    } finally {
      setOccupe(null);
    }
  }

  return (
    <div className="connexion">
      <div className="connexion-carte">
        <div className="connexion-marque">
          <Logo taille={56} />
          <div>
            <h1>Assistant de planification de réunions</h1>
            <p className="secondaire">Il lit vos courriels, repère les demandes de réunion, trouve un moment libre pour l'équipe et envoie les invitations. Vous gardez toujours le dernier mot.</p>
          </div>
        </div>

        <h2 className="connexion-titre">Connecter votre courriel et votre calendrier</h2>
        <div className="fournisseurs">
          {props.session.fournisseurs.map((f) => (
            <button key={f.id} className="fournisseur" disabled={!f.disponible || occupe !== null} onClick={() => void connecter(f.id)} aria-describedby={`raison-${f.id}`}>
              <span className="fournisseur-nom">{f.nom}</span>
              <span className="fournisseur-description">{f.description}</span>
              {!f.disponible && (
                <span className="fournisseur-raison" id={`raison-${f.id}`}>
                  Bientôt offert
                </span>
              )}
            </button>
          ))}
        </div>

        <div className="separateur"><span>ou</span></div>

        <button className="bouton bouton-principal bouton-large" onClick={() => void connecter("demo")} disabled={occupe !== null}>
          {occupe === "demo" ? "Préparation de la démo…" : "Essayer la démo, sans compte"}
        </button>
        <p className="aide centre">
          La démo utilise une PME fictive de 5 employés : 30 courriels et leurs calendriers. Aucune donnée réelle.
          {props.session.iaReelle ? " Les courriels sont lus par Gemini." : " L'IA est simulée (aucune clé Gemini configurée)."}
        </p>

        {message && <p className="message-erreur" role="alert">{message}</p>}

        {!installation.installee && (
          <div className="installation">
            {installation.possible ? (
              <button className="bouton bouton-secondaire" onClick={() => void installation.installer()}>
                Installer l'application sur cet ordinateur
              </button>
            ) : (
              <p className="aide centre">Pour l'installer comme logiciel : dans Chrome ou Edge, menu ⋮, puis « Installer l'application ».</p>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
