// Cadre du tableau de bord : barre du haut, menu de navigation et écran courant.

import { useApp } from "../contexte";
import { Calendrier } from "../pages/Calendrier";
import { ATraiter } from "../pages/ATraiter";
import { Boite } from "../pages/Boite";
import { Demo } from "../pages/Demo";
import { DetailReunion } from "../pages/DetailReunion";
import { Parametres } from "../pages/Parametres";
import { Reunions } from "../pages/Reunions";
import { lien, useRoute } from "../routeur";
import { Avatar, Logo, Puce } from "./communs";

const DECISIONS = new Set(["a_confirmer", "conflit", "date_a_confirmer", "intervention_requise"]);

function Icone({ nom }: { nom: string }) {
  const chemins: Record<string, string> = {
    traiter: "M4 6h16M4 12h16M4 18h10",
    reunions: "M8 4v3M16 4v3M4 9h16M5 6h14a1 1 0 011 1v12a1 1 0 01-1 1H5a1 1 0 01-1-1V7a1 1 0 011-1z",
    calendrier: "M4 9h16M8 4v3M16 4v3M5 6h14a1 1 0 011 1v12a1 1 0 01-1 1H5a1 1 0 01-1-1V7a1 1 0 011-1zM8 13h3v3H8z",
    boite: "M4 6h16v12H4zM4 7l8 6 8-6",
    parametres: "M12 9a3 3 0 100 6 3 3 0 000-6zM4 12h2M18 12h2M12 4v2M12 18v2M6.3 6.3l1.4 1.4M16.3 16.3l1.4 1.4M6.3 17.7l1.4-1.4M16.3 7.7l1.4-1.4",
    demo: "M8 5l11 7-11 7z",
  };
  return (
    <svg className="icone" width="20" height="20" viewBox="0 0 24 24" aria-hidden="true">
      <path d={chemins[nom]} fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

export function Cadre() {
  const { session, etat, personnes, deconnecter } = useApp();
  const route = useRoute();
  const page = route[0];
  const aTraiter = etat?.reunions.filter((r) => DECISIONS.has(r.statut)).length ?? 0;
  const utilisateur = session.utilisateur;

  const menu = [
    { id: "traiter", libelle: "À traiter", compteur: aTraiter },
    { id: "reunions", libelle: "Réunions" },
    { id: "calendrier", libelle: "Calendrier" },
    { id: "boite", libelle: "Boîte de réception" },
    ...(session.mode === "demo" ? [{ id: "demo", libelle: "Démo : réponses" }] : []),
    { id: "parametres", libelle: "Paramètres" },
  ];

  let ecran;
  if (page === "reunions" && route[1]) ecran = <DetailReunion id={route[1]} />;
  else if (page === "reunions") ecran = <Reunions />;
  else if (page === "calendrier") ecran = <Calendrier />;
  else if (page === "boite") ecran = <Boite />;
  else if (page === "parametres") ecran = <Parametres />;
  else if (page === "demo" && session.mode === "demo") ecran = <Demo />;
  else ecran = <ATraiter />;

  return (
    <div className="application">
      <a className="aller-au-contenu" href="#contenu" onClick={(e) => { e.preventDefault(); document.getElementById("contenu")?.focus(); }}>
        Aller au contenu
      </a>
      <header className="barre-haut">
        <a className="marque" href={lien("traiter")}>
          <Logo />
          <span>
            <strong>Assistant de planification</strong>
            {session.entreprise && <span className="marque-entreprise">{session.entreprise.replace(/\s*\(.*\)$/, "")}</span>}
          </span>
        </a>
        <div className="barre-droite">
          {session.mode === "demo" && <Puce ton="jaune">Mode démo</Puce>}
          <Puce ton={session.iaReelle ? "vert" : "neutre"} titre={session.ia}>
            {session.iaReelle ? "IA : Gemini" : "IA simulée"}
          </Puce>
          {utilisateur && (
            <span className="utilisateur">
              <Avatar courriel={utilisateur.courriel} />
              <span className="utilisateur-nom">{personnes.nom(utilisateur.courriel)}</span>
            </span>
          )}
          <button className="bouton bouton-discret" onClick={() => void deconnecter()}>
            Déconnexion
          </button>
        </div>
      </header>

      <nav className="menu" aria-label="Navigation principale">
        {menu.map((m) => (
          <a key={m.id} href={lien(m.id)} className={page === m.id ? "menu-lien actif" : "menu-lien"} aria-current={page === m.id ? "page" : undefined}>
            <Icone nom={m.id} />
            <span>{m.libelle}</span>
            {m.compteur ? <span className="compteur" aria-label={`${m.compteur} à traiter`}>{m.compteur}</span> : null}
          </a>
        ))}
      </nav>

      <main id="contenu" className="contenu" tabIndex={-1}>
        {etat ? ecran : <p className="secondaire">Chargement…</p>}
      </main>
    </div>
  );
}
