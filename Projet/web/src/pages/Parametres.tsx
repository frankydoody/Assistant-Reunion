// Configuration de l'assistant pour chaque utilisateur, et informations.

import { api } from "../api";
import { EnTete } from "../composants/communs";
import { Personne } from "../composants/communs";
import { useApp } from "../contexte";
import { useInstallation } from "../installation";
import type { Preferences } from "../types";

export function Parametres() {
  const { etat, session, agir, occupe, deconnecter } = useApp();
  const installation = useInstallation();
  if (!etat) return null;

  const modifier = (courriel: string, p: Partial<Preferences>) =>
    void agir(`pref-${courriel}`, () => api.preferences(courriel, p), "Préférence enregistrée.");

  return (
    <>
      <EnTete titre="Paramètres" sousTitre="Chaque personne a sa propre configuration de l'assistant." />

      <section className="carte">
        <h2>Configuration par utilisateur</h2>
        <p className="secondaire">Un créneau doit respecter les préférences de tous les participants. Les changements s'appliquent aux prochaines propositions.</p>
        <div className="tableau-conteneur">
          <table className="tableau">
            <thead>
              <tr>
                <th>Personne</th>
                <th>Réunions sur l'heure du dîner</th>
                <th>Réunions hors des heures de bureau</th>
                <th>Chercher un créneau sur</th>
              </tr>
            </thead>
            <tbody>
              {etat.utilisateurs.map((u) => (
                <tr key={u.courriel}>
                  <td>
                    <Personne courriel={u.courriel} />
                    <div className="secondaire petit">{u.role}</div>
                  </td>
                  <td>
                    <label className="interrupteur">
                      <input
                        type="checkbox"
                        checked={u.preferences.reunionsSurHeureDiner}
                        disabled={occupe !== null}
                        onChange={(e) => modifier(u.courriel, { reunionsSurHeureDiner: e.target.checked })}
                      />
                      <span>{u.preferences.reunionsSurHeureDiner ? "Acceptées" : "Refusées"}</span>
                    </label>
                  </td>
                  <td>
                    <label className="interrupteur">
                      <input
                        type="checkbox"
                        checked={u.preferences.reunionsHorsBureau}
                        disabled={occupe !== null}
                        onChange={(e) => modifier(u.courriel, { reunionsHorsBureau: e.target.checked })}
                      />
                      <span>{u.preferences.reunionsHorsBureau ? "Acceptées" : "Refusées"}</span>
                    </label>
                  </td>
                  <td>
                    <label className="champ-jours">
                      <input
                        type="number"
                        min={1}
                        max={60}
                        defaultValue={u.preferences.plageRechercheJours}
                        aria-label={`Plage de recherche de ${u.nom}, en jours`}
                        disabled={occupe !== null}
                        onBlur={(e) => {
                          const v = Number(e.target.value);
                          if (v !== u.preferences.plageRechercheJours) modifier(u.courriel, { plageRechercheJours: v });
                        }}
                      />
                      jours
                    </label>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      <section className="carte">
        <h2>Assistant</h2>
        <dl className="definitions">
          <dt>Intelligence artificielle</dt>
          <dd>{session.ia}</dd>
          <dt>Connexion</dt>
          <dd>{session.mode === "demo" ? "Mode démo : entreprise fictive, aucune donnée réelle" : "Service connecté"}</dd>
          <dt>Application</dt>
          <dd>
            {installation.installee
              ? "Installée sur cet ordinateur."
              : installation.possible
                ? <button className="bouton bouton-secondaire" onClick={() => void installation.installer()}>Installer l'application</button>
                : "Pour l'installer : dans Chrome ou Edge, menu ⋮, puis « Installer l'application »."}
          </dd>
        </dl>
        <div className="rangee-boutons">
          {session.mode === "demo" && (
            <button className="bouton bouton-secondaire" disabled={occupe !== null} onClick={() => void agir("reinit", () => api.reinitialiserDemo(), "Démo remise à zéro : relecture de la boîte.")}>
              Recommencer la démo
            </button>
          )}
          <button className="bouton bouton-discret" onClick={() => void deconnecter()}>
            Se déconnecter
          </button>
        </div>
      </section>
    </>
  );
}
