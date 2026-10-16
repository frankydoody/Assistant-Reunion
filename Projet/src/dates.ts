// Outils de dates. Toutes les dates sont des chaînes locales AAAA-MM-JJTHH:MM,
// sans fuseau horaire : les calculs se font en minutes (UTC interne) pour ne
// dépendre d'aucun fuseau.

const FORMAT_DATE = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}$/;
const JOURS = ["dimanche", "lundi", "mardi", "mercredi", "jeudi", "vendredi", "samedi"];
const MOIS = [
  "janvier", "février", "mars", "avril", "mai", "juin",
  "juillet", "août", "septembre", "octobre", "novembre", "décembre",
];

export function versMinutes(texte: string): number {
  const [date, heure] = texte.split("T");
  const [annee, mois, jour] = date.split("-").map(Number);
  const [h, m] = heure.split(":").map(Number);
  return Date.UTC(annee, mois - 1, jour, h, m) / 60000;
}

export function versTexte(minutes: number): string {
  return new Date(minutes * 60000).toISOString().slice(0, 16);
}

export function ajouterMinutes(texte: string, minutes: number): string {
  return versTexte(versMinutes(texte) + minutes);
}

// Vrai seulement pour une date réelle au bon format (refuse 2026-02-30T10:00).
export function estDateValide(valeur: unknown): valeur is string {
  return typeof valeur === "string" && FORMAT_DATE.test(valeur) && versTexte(versMinutes(valeur)) === valeur;
}

export function nomDuJour(texte: string): string {
  return JOURS[new Date(versMinutes(texte) * 60000).getUTCDay()];
}

export function formaterHeure(texte: string): string {
  const [h, m] = texte.slice(11).split(":");
  return `${Number(h)} h ${m}`;
}

export function formaterJour(texte: string): string {
  const d = new Date(versMinutes(texte) * 60000);
  return `${JOURS[d.getUTCDay()]} ${d.getUTCDate()} ${MOIS[d.getUTCMonth()]} ${d.getUTCFullYear()}`;
}

export function formaterCreneau(c: { debut: string; fin: string }): string {
  return `${formaterJour(c.debut)}, de ${formaterHeure(c.debut)} à ${formaterHeure(c.fin)}`;
}

export function formaterFenetre(f: { debut: string; fin: string }): string {
  if (f.debut.slice(0, 10) === f.fin.slice(0, 10)) return formaterCreneau(f);
  return `du ${formaterJour(f.debut)}, ${formaterHeure(f.debut)}, au ${formaterJour(f.fin)}, ${formaterHeure(f.fin)}`;
}
