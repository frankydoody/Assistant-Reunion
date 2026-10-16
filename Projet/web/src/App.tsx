// Racine : écran de connexion, ou tableau de bord une fois un service connecté.

import { useCallback, useEffect, useState } from "react";
import { api } from "./api";
import { Logo } from "./composants/communs";
import { Cadre } from "./composants/Cadre";
import { FournisseurApp } from "./contexte";
import { Connexion } from "./pages/Connexion";
import type { Session } from "./types";

export default function App() {
  const [session, setSession] = useState<Session | null>(null);
  const [erreur, setErreur] = useState<string | null>(null);

  const charger = useCallback(async () => {
    try {
      setSession(await api.session());
      setErreur(null);
    } catch (e) {
      setErreur(e instanceof Error ? e.message : String(e));
    }
  }, []);

  useEffect(() => {
    void charger();
  }, [charger]);

  if (erreur) {
    return (
      <div className="ecran-centre">
        <Logo taille={48} />
        <p>{erreur}</p>
        <button className="bouton bouton-principal" onClick={() => void charger()}>
          Réessayer
        </button>
      </div>
    );
  }
  if (!session) {
    return (
      <div className="ecran-centre" aria-busy="true">
        <Logo taille={48} />
        <p className="secondaire">Chargement…</p>
      </div>
    );
  }
  if (!session.connecte) return <Connexion session={session} surConnexion={charger} />;

  return (
    <FournisseurApp session={session} surDeconnexion={charger}>
      <Cadre />
    </FournisseurApp>
  );
}
