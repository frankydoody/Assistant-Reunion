// Calendrier de la semaine de l'équipe : événements existants, réunions de
// l'assistant et créneaux proposés pas encore confirmés.

import { useEffect, useMemo, useState } from "react";
import { api } from "../api";
import { EnTete } from "../composants/communs";
import { useApp } from "../contexte";
import { ajouterMinutes, formaterHeure, formaterJour, versMinutes, versTexte } from "../format";
import { naviguer } from "../routeur";
import type { Calendriers } from "../types";

const HEURE_DEBUT = 7;
const HEURE_FIN = 20;
const HAUTEUR_HEURE = 44;

interface Bloc {
  cle: string;
  titre: string;
  debut: string;
  fin: string;
  couleur: string;
  sorte: "evenement" | "reunion" | "proposition";
  personnes: string[];
  reunionId?: string;
}

function lundi(texte: string): string {
  const m = versMinutes(`${texte.slice(0, 10)}T00:00`);
  const jour = new Date(m * 60000).getUTCDay();
  return versTexte(m - ((jour + 6) % 7) * 24 * 60).slice(0, 10);
}

// Place les blocs qui se chevauchent côte à côte.
function disposer(blocs: Bloc[]): (Bloc & { voie: number; voies: number })[] {
  const tries = [...blocs].sort((a, b) => a.debut.localeCompare(b.debut) || b.fin.localeCompare(a.fin));
  const resultat: (Bloc & { voie: number; voies: number })[] = [];
  let groupe: (Bloc & { voie: number; voies: number })[] = [];
  let finsVoies: string[] = [];
  let finGroupe = "";
  const fermer = () => {
    for (const b of groupe) b.voies = finsVoies.length;
    resultat.push(...groupe);
    groupe = [];
    finsVoies = [];
  };
  for (const b of tries) {
    if (groupe.length && b.debut >= finGroupe) fermer();
    let voie = finsVoies.findIndex((f) => f <= b.debut);
    if (voie === -1) voie = finsVoies.push(b.fin) - 1;
    else finsVoies[voie] = b.fin;
    groupe.push({ ...b, voie, voies: 1 });
    finGroupe = groupe.length === 1 || b.fin > finGroupe ? b.fin : finGroupe;
  }
  fermer();
  return resultat;
}

export function Calendrier() {
  const { etat, personnes, versionDonnees, notifier } = useApp();
  const [cal, setCal] = useState<Calendriers | null>(null);
  const [semaine, setSemaine] = useState<string | null>(null);
  const [choisis, setChoisis] = useState<string[] | null>(null);

  useEffect(() => {
    api.calendriers().then(setCal).catch((e) => notifier(e.message, "erreur"));
  }, [versionDonnees, notifier]);

  // Semaine initiale : celle du premier événement des calendriers.
  const premiereSemaine = useMemo(() => {
    const premier = cal?.evenements.map((e) => e.debut).sort()[0];
    return premier ? lundi(premier) : null;
  }, [cal]);
  const lundiCourant = semaine ?? premiereSemaine;
  const visibles = choisis ?? (etat ? [etat.proprietaire] : []);

  const jours = useMemo(
    () => (lundiCourant ? [0, 1, 2, 3, 4].map((i) => ajouterMinutes(`${lundiCourant}T00:00`, i * 24 * 60).slice(0, 10)) : []),
    [lundiCourant],
  );

  const blocs = useMemo(() => {
    if (!cal || !etat) return [];
    const liste: Bloc[] = [];
    const reunionsVues = new Set<string>();
    for (const e of cal.evenements) {
      if (!visibles.includes(e.proprietaire)) continue;
      if (e.reunionId) {
        if (reunionsVues.has(e.reunionId)) continue;
        reunionsVues.add(e.reunionId);
        const r = etat.reunions.find((x) => x.id === e.reunionId);
        liste.push({ cle: e.reunionId, titre: e.titre, debut: e.debut, fin: e.fin, couleur: "#1a73e8", sorte: "reunion", personnes: r?.participants ?? [], reunionId: e.reunionId });
      } else {
        liste.push({ cle: `${e.proprietaire}-${e.debut}-${e.titre}`, titre: e.titre, debut: e.debut, fin: e.fin, couleur: personnes.couleur(e.proprietaire), sorte: "evenement", personnes: [e.proprietaire] });
      }
    }
    for (const r of etat.reunions) {
      if (r.statut === "a_confirmer" && r.creneau && r.participants.some((p) => visibles.includes(p))) {
        liste.push({ cle: `p-${r.id}`, titre: r.sujet, debut: r.creneau.debut, fin: r.creneau.fin, couleur: "#1a73e8", sorte: "proposition", personnes: r.participants, reunionId: r.id });
      }
    }
    return liste;
  }, [cal, etat, visibles, personnes]);

  if (!cal || !etat || !lundiCourant) return <p className="secondaire">Chargement du calendrier…</p>;

  const basculer = (courriel: string) => {
    const actuels = visibles.includes(courriel) ? visibles.filter((c) => c !== courriel) : [...visibles, courriel];
    setChoisis(actuels);
  };
  const decaler = (semaines: number) => setSemaine(ajouterMinutes(`${lundiCourant}T00:00`, semaines * 7 * 24 * 60).slice(0, 10));
  const heures = Array.from({ length: HEURE_FIN - HEURE_DEBUT }, (_, i) => HEURE_DEBUT + i);

  return (
    <>
      <EnTete
        titre="Calendrier"
        sousTitre={`Semaine du ${formaterJour(`${lundiCourant}T00:00`)}`}
        actions={
          <div className="rangee-boutons">
            <button className="bouton bouton-secondaire" onClick={() => decaler(-1)} aria-label="Semaine précédente">
              ‹ Précédente
            </button>
            <button className="bouton bouton-discret" onClick={() => setSemaine(null)} disabled={semaine === null}>
              Première semaine
            </button>
            <button className="bouton bouton-secondaire" onClick={() => decaler(1)} aria-label="Semaine suivante">
              Suivante ›
            </button>
          </div>
        }
      />

      <div className="filtres-personnes" role="group" aria-label="Calendriers affichés">
        {cal.utilisateurs.map((u) => {
          const actif = visibles.includes(u.courriel);
          return (
            <button key={u.courriel} className={actif ? "filtre-personne actif" : "filtre-personne"} aria-pressed={actif} onClick={() => basculer(u.courriel)}>
              <span className="pastille" style={{ background: personnes.couleur(u.courriel) }} aria-hidden="true" />
              {u.nom}
            </button>
          );
        })}
        <span className="legende">
          <span className="legende-reunion" aria-hidden="true" /> Réunion de l'assistant
          <span className="legende-proposition" aria-hidden="true" /> Proposition à confirmer
        </span>
      </div>

      <div className="calendrier" style={{ ["--hauteur-heure" as string]: `${HAUTEUR_HEURE}px` }}>
        <div className="calendrier-heures" aria-hidden="true">
          <div className="calendrier-coin" />
          {heures.map((h) => (
            <div key={h} className="calendrier-heure">
              {h} h
            </div>
          ))}
        </div>
        {jours.map((jour) => {
          const duJour = disposer(blocs.filter((b) => b.debut.startsWith(jour)));
          return (
            <div key={jour} className="calendrier-jour">
              <div className="calendrier-jour-titre">{formaterJour(`${jour}T00:00`).replace(/ \d{4}$/, "")}</div>
              <div className="calendrier-grille" style={{ height: heures.length * HAUTEUR_HEURE }}>
                {heures.map((h) => (
                  <div key={h} className="calendrier-ligne" style={{ top: (h - HEURE_DEBUT) * HAUTEUR_HEURE }} />
                ))}
                {duJour.map((b) => {
                  const debutMin = versMinutes(b.debut) - versMinutes(`${jour}T${String(HEURE_DEBUT).padStart(2, "0")}:00`);
                  const longueur = versMinutes(b.fin) - versMinutes(b.debut);
                  const style = {
                    top: (debutMin / 60) * HAUTEUR_HEURE,
                    height: Math.max((longueur / 60) * HAUTEUR_HEURE - 2, 16),
                    left: `calc(${(100 * b.voie) / b.voies}% + 2px)`,
                    width: `calc(${100 / b.voies}% - 4px)`,
                    ["--couleur" as string]: b.couleur,
                  };
                  const texte = `${b.titre}, ${formaterHeure(b.debut)} à ${formaterHeure(b.fin)}`;
                  const contenu = (
                    <>
                      <strong>{b.titre}</strong>
                      <span>
                        {formaterHeure(b.debut)}–{formaterHeure(b.fin)}
                        {visibles.length > 1 && b.sorte === "evenement" ? ` · ${personnes.prenom(b.personnes[0])}` : ""}
                      </span>
                    </>
                  );
                  return b.reunionId ? (
                    <button
                      key={b.cle}
                      className={`bloc bloc-${b.sorte}${longueur <= 30 ? " bloc-court" : ""}`}
                      style={style}
                      title={texte}
                      onClick={() => naviguer(b.sorte === "proposition" ? "traiter" : `reunions/${b.reunionId}`)}
                    >
                      {contenu}
                    </button>
                  ) : (
                    <div key={b.cle} className={`bloc bloc-evenement${longueur <= 30 ? " bloc-court" : ""}`} style={style} title={texte}>
                      {contenu}
                    </div>
                  );
                })}
              </div>
            </div>
          );
        })}
      </div>
    </>
  );
}
