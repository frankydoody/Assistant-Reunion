// État partagé du tableau de bord : session, réunions, notifications et
// exécution des actions (avec gestion des erreurs).

import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import { api, ErreurApi } from "./api";
import { annuaire } from "./format";
import type { Etat, Session } from "./types";

interface Notification {
  id: number;
  texte: string;
  ton: "succes" | "erreur" | "info";
}

interface Contexte {
  session: Session;
  etat: Etat | null;
  versionDonnees: number; // augmente après chaque changement : les écrans rechargent leurs données
  rafraichir: () => Promise<void>;
  agir: (cle: string, action: () => Promise<unknown>, succes?: string) => Promise<boolean>;
  occupe: string | null;
  notifier: (texte: string, ton?: Notification["ton"]) => void;
  personnes: ReturnType<typeof annuaire>;
  deconnecter: () => Promise<void>;
}

const ContexteApp = createContext<Contexte | null>(null);

export function useApp(): Contexte {
  const c = useContext(ContexteApp);
  if (!c) throw new Error("useApp hors du fournisseur");
  return c;
}

export function FournisseurApp(props: { session: Session; surDeconnexion: () => void; children: ReactNode }) {
  const [etat, setEtat] = useState<Etat | null>(null);
  const [versionDonnees, setVersionDonnees] = useState(0);
  const [occupe, setOccupe] = useState<string | null>(null);
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const prochainId = useRef(1);
  const { surDeconnexion } = props;

  const notifier = useCallback((texte: string, ton: Notification["ton"] = "info") => {
    const id = prochainId.current++;
    setNotifications((n) => [...n.slice(-1), { id, texte, ton }]);
    setTimeout(() => setNotifications((n) => n.filter((x) => x.id !== id)), ton === "erreur" ? 7000 : 3000);
  }, []);

  const rafraichir = useCallback(async () => {
    try {
      setEtat(await api.etat());
      setVersionDonnees((v) => v + 1);
    } catch (e) {
      if (e instanceof ErreurApi && e.statut === 401) surDeconnexion();
      else notifier(e instanceof Error ? e.message : String(e), "erreur");
    }
  }, [notifier, surDeconnexion]);

  const agir = useCallback(
    async (cle: string, action: () => Promise<unknown>, succes?: string) => {
      setOccupe(cle);
      try {
        await action();
        if (succes) notifier(succes, "succes");
        return true;
      } catch (e) {
        if (e instanceof ErreurApi && e.statut === 401) surDeconnexion();
        notifier(e instanceof Error ? e.message : String(e), "erreur");
        return false;
      } finally {
        setOccupe(null);
        await rafraichir();
      }
    },
    [notifier, rafraichir, surDeconnexion],
  );

  // Chargement initial, puis suivi de la lecture de la boîte.
  const enCours = etat?.progression.enCours ?? false;
  useEffect(() => {
    void rafraichir();
  }, [rafraichir]);
  useEffect(() => {
    if (!enCours) return;
    const minuterie = setInterval(() => void rafraichir(), 1200);
    return () => clearInterval(minuterie);
  }, [enCours, rafraichir]);

  const deconnecter = useCallback(async () => {
    await api.deconnecter().catch(() => undefined);
    surDeconnexion();
  }, [surDeconnexion]);

  const valeur = useMemo<Contexte>(
    () => ({
      session: props.session,
      etat,
      versionDonnees,
      rafraichir,
      agir,
      occupe,
      notifier,
      personnes: annuaire(etat?.utilisateurs ?? []),
      deconnecter,
    }),
    [props.session, etat, versionDonnees, rafraichir, agir, occupe, notifier, deconnecter],
  );

  return (
    <ContexteApp.Provider value={valeur}>
      {props.children}
      <div className="notifications" role="status" aria-live="polite">
        {notifications.map((n) => (
          <div key={n.id} className={`notification notification-${n.ton}`}>
            {n.texte}
          </div>
        ))}
      </div>
    </ContexteApp.Provider>
  );
}
