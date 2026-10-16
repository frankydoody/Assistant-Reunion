// Navigation par l'adresse (#/page) : le bouton Précédent du navigateur, les
// favoris et le rechargement de la page fonctionnent sur chaque écran.

import { useEffect, useState } from "react";

export const PAGE_ACCUEIL = "traiter";

function lire(): string[] {
  const chemin = decodeURIComponent(window.location.hash.replace(/^#\/?/, ""));
  const parties = chemin.split("/").filter(Boolean);
  return parties.length ? parties : [PAGE_ACCUEIL];
}

export function useRoute(): string[] {
  const [route, setRoute] = useState(lire);
  useEffect(() => {
    const surChangement = () => {
      setRoute(lire());
      document.querySelector("main")?.focus({ preventScroll: true });
      window.scrollTo(0, 0);
    };
    window.addEventListener("hashchange", surChangement);
    return () => window.removeEventListener("hashchange", surChangement);
  }, []);
  return route;
}

export function naviguer(chemin: string): void {
  window.location.hash = `#/${chemin}`;
}

export const lien = (chemin: string) => `#/${chemin}`;
