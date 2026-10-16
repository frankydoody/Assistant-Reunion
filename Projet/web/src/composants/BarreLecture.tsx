// Lecture de la boîte de réception : bouton et progression.

import { api } from "../api";
import { useApp } from "../contexte";

function resumer(d: { reunionsDetectees: string[]; courrielsSansRapport: number; reponsesTraitees: number }): string {
  const pluriel = (n: number, un: string, plusieurs: string) => `${n} ${n > 1 ? plusieurs : un}`;
  const parties = [
    d.reunionsDetectees.length ? pluriel(d.reunionsDetectees.length, "demande de réunion", "demandes de réunion") : "",
    d.courrielsSansRapport ? pluriel(d.courrielsSansRapport, "courriel sans rapport", "courriels sans rapport") : "",
    d.reponsesTraitees ? pluriel(d.reponsesTraitees, "réponse de participant", "réponses de participants") : "",
  ].filter(Boolean);
  return parties.length ? parties.join(", ") : "aucun nouveau courriel";
}

export function BarreLecture() {
  const { etat, agir, occupe, session } = useApp();
  if (!etat) return null;
  const p = etat.progression;
  const pourcentage = p.total ? Math.round((100 * p.traites) / p.total) : 0;

  if (p.enCours) {
    return (
      <div className="barre-lecture" aria-live="polite">
        <div className="barre-lecture-texte">
          <span className="pulsation" aria-hidden="true" />
          {session.iaReelle ? "Gemini lit" : "L'assistant lit"} vos courriels : {p.traites} sur {p.total}
        </div>
        <div className="progression" role="progressbar" aria-valuemin={0} aria-valuemax={p.total} aria-valuenow={p.traites}>
          <div style={{ width: `${pourcentage}%` }} />
        </div>
      </div>
    );
  }

  const dernier = p.dernierResultat;
  return (
    <div className="barre-lecture">
      <div className="barre-lecture-texte">
        {dernier ? `Dernière lecture : ${resumer(dernier)}.` : "La boîte de réception n'a pas encore été lue."}
        {p.erreurs.length > 0 && <span className="texte-erreur"> {p.erreurs.length} courriel(s) en erreur seront repris à la prochaine lecture.</span>}
      </div>
      <button className="bouton bouton-secondaire" disabled={occupe !== null} onClick={() => void agir("lecture", () => api.lireCourriels())}>
        Lire les nouveaux courriels
      </button>
    </div>
  );
}
