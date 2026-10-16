// Installation de l'application (application web installable : Chrome, Edge).

import { useEffect, useState } from "react";

interface EvenementInstallation extends Event {
  prompt(): Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed" }>;
}

let invitation: EvenementInstallation | null = null;
const abonnes = new Set<() => void>();

window.addEventListener("beforeinstallprompt", (e) => {
  e.preventDefault();
  invitation = e as EvenementInstallation;
  abonnes.forEach((f) => f());
});
window.addEventListener("appinstalled", () => {
  invitation = null;
  abonnes.forEach((f) => f());
});

export const estInstallee = () => window.matchMedia("(display-mode: standalone)").matches;

export function useInstallation(): { possible: boolean; installee: boolean; installer: () => Promise<void> } {
  const [, forcer] = useState(0);
  useEffect(() => {
    const f = () => forcer((n) => n + 1);
    abonnes.add(f);
    return () => {
      abonnes.delete(f);
    };
  }, []);
  return {
    possible: invitation !== null,
    installee: estInstallee(),
    installer: async () => {
      if (!invitation) return;
      await invitation.prompt();
      await invitation.userChoice;
      invitation = null;
      forcer((n) => n + 1);
    },
  };
}
