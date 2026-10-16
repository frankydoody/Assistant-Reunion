// Petits composants réutilisés dans plusieurs écrans.

import { useId, type ReactNode } from "react";
import { useApp } from "../contexte";
import { initiales, LIBELLE_STATUT, TON_STATUT } from "../format";
import type { ModeSuivi, StatutReunion } from "../types";

export function Puce(props: { ton?: string; children: ReactNode; titre?: string }) {
  return (
    <span className={`puce puce-${props.ton ?? "neutre"}`} title={props.titre}>
      {props.children}
    </span>
  );
}

export function PuceStatut({ statut }: { statut: StatutReunion }) {
  return <Puce ton={TON_STATUT[statut]}>{LIBELLE_STATUT[statut]}</Puce>;
}

export function Avatar({ courriel, taille = "normal" }: { courriel: string; taille?: "petit" | "normal" }) {
  const { personnes } = useApp();
  const nom = personnes.nom(courriel);
  return (
    <span className={`avatar avatar-${taille}`} style={{ background: personnes.couleur(courriel) }} title={nom} aria-hidden="true">
      {initiales(nom)}
    </span>
  );
}

export function Personne({ courriel, details }: { courriel: string; details?: ReactNode }) {
  const { personnes } = useApp();
  return (
    <span className="personne">
      <Avatar courriel={courriel} taille="petit" />
      <span>{personnes.nom(courriel)}</span>
      {details}
    </span>
  );
}

export function SelecteurMode(props: { valeur: ModeSuivi; surChangement: (m: ModeSuivi) => void; desactive?: boolean }) {
  const options: { valeur: ModeSuivi; libelle: string; aide: string }[] = [
    { valeur: "manuel", libelle: "Manuel", aide: "Vous décidez quoi faire si un participant refuse ou propose un autre moment." },
    { valeur: "automatique", libelle: "Automatique", aide: "L'assistant replanifie seul, deux fois au maximum." },
  ];
  const aide = options.find((o) => o.valeur === props.valeur)?.aide;
  const idEtiquette = useId();
  return (
    <div className="selecteur-mode">
      <span className="etiquette" id={idEtiquette}>
        Suivi des réponses
      </span>
      <div className="segments" role="group" aria-labelledby={idEtiquette}>
        {options.map((o) => (
          <button
            key={o.valeur}
            type="button"
            className={props.valeur === o.valeur ? "segment actif" : "segment"}
            aria-pressed={props.valeur === o.valeur}
            disabled={props.desactive}
            onClick={() => props.surChangement(o.valeur)}
          >
            {o.libelle}
          </button>
        ))}
      </div>
      <span className="aide">{aide}</span>
    </div>
  );
}

export function EtatVide(props: { titre: string; children?: ReactNode }) {
  return (
    <div className="etat-vide">
      <svg width="48" height="48" viewBox="0 0 48 48" aria-hidden="true">
        <rect x="8" y="12" width="32" height="28" rx="4" fill="none" stroke="currentColor" strokeWidth="2.5" />
        <path d="M8 20h32M17 8v8M31 8v8" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" />
        <path d="M18 30l4 4 8-8" stroke="currentColor" strokeWidth="2.5" fill="none" strokeLinecap="round" strokeLinejoin="round" />
      </svg>
      <p className="etat-vide-titre">{props.titre}</p>
      {props.children && <p className="secondaire">{props.children}</p>}
    </div>
  );
}

export function EnTete(props: { titre: string; sousTitre?: ReactNode; actions?: ReactNode }) {
  return (
    <header className="entete-page">
      <div>
        <h1>{props.titre}</h1>
        {props.sousTitre && <p className="secondaire">{props.sousTitre}</p>}
      </div>
      {props.actions && <div className="entete-actions">{props.actions}</div>}
    </header>
  );
}

export function Logo({ taille = 32 }: { taille?: number }) {
  return (
    <svg width={taille} height={taille} viewBox="0 0 48 48" aria-hidden="true">
      <rect width="48" height="48" rx="11" fill="#1a73e8" />
      <rect x="9.5" y="12.5" width="29" height="26" rx="3" fill="#fff" />
      <rect x="9.5" y="12.5" width="29" height="6" fill="#e8f0fe" />
      <rect x="16" y="8.5" width="2.6" height="7" rx="1.3" fill="#fff" />
      <rect x="29.4" y="8.5" width="2.6" height="7" rx="1.3" fill="#fff" />
      <circle cx="16" cy="29" r="2.2" fill="#1a73e8" />
      <circle cx="21.4" cy="29" r="2.2" fill="#d93025" />
      <circle cx="26.8" cy="29" r="2.2" fill="#f9ab00" />
      <circle cx="32.2" cy="29" r="2.2" fill="#1e8e3e" />
    </svg>
  );
}
