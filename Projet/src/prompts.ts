// Prompts envoyés à Gemini. Chaque changement de prompt doit augmenter
// VERSION_PROMPTS et être noté dans Documentations/journal-de-bord.md
// (section « Prompts »), avec les résultats de l'évaluation.
//
// Les exemples cités dans les règles sont volontairement différents des
// courriels de test, pour ne pas fausser l'évaluation.

import { formaterCreneau, nomDuJour } from "./dates";
import type { ContexteAnalyse, ContexteReponse } from "./ia";
import type { CourrielRecu } from "./types";

export const VERSION_PROMPTS = "v1";

function dateAvecJour(date: string): string {
  return `${nomDuJour(date)} ${date.slice(0, 10)}, ${date.slice(11)} (${date})`;
}

function nomDe(courriel: string, ctx: ContexteAnalyse): string {
  const u = ctx.utilisateurs.find((x) => x.courriel === courriel);
  return u ? `${u.nom} <${courriel}>` : courriel;
}

// --- Détection et extraction d'une demande de réunion ---

export function promptAnalyse(c: CourrielRecu, ctx: ContexteAnalyse): { systeme: string; message: string } {
  const proprietaire = ctx.utilisateurs.find((u) => u.courriel === ctx.proprietaire);
  const prenom = proprietaire?.nom.split(" ")[0] ?? "le propriétaire de la boîte";
  const employes = ctx.utilisateurs.map((u) => `- ${u.nom}, ${u.role} : ${u.courriel}`).join("\n");
  const { debut, fin } = ctx.heuresBureau;

  const systeme = `Tu es l'assistant de planification de réunions de l'entreprise ${ctx.entreprise}.
Tu lis un courriel reçu par ${nomDe(ctx.proprietaire, ctx)}. Tu dois déterminer s'il demande d'organiser une NOUVELLE réunion interne, puis en extraire les informations.

Employés de l'entreprise (les seuls participants possibles) :
${employes}

Heures de bureau : du lundi au vendredi, de ${debut} à ${fin}.

Règles :
1. estReunion vaut true seulement si l'expéditeur demande d'organiser une nouvelle rencontre, réunion, discussion, présentation ou formation avec des employés. Il vaut false pour une facture, une infolettre, une publicité, une invitation à un événement externe, un compte rendu, un remerciement, une annulation, un avis d'absence, un rappel ou une simple question.
2. participants : les adresses courriel des personnes à inviter, prises uniquement dans la liste des employés. Inclus toujours l'expéditeur et ${prenom}. « Toute l'équipe » ou « tout le monde » désigne tous les employés. N'invente aucune adresse.
3. sujet : un titre court en français (moins de 10 mots), sans « Re: » ni mention d'urgence.
4. dureeMinutes : la durée en minutes si elle est précisée (par exemple « une heure et quart » = 75, « trois quarts d'heure » = 45). Sinon null : ne devine pas.
5. fenetreDebut et fenetreFin : la période pendant laquelle la réunion doit avoir lieu, au format AAAA-MM-JJTHH:MM, calculée à partir de la date de réception. Utilise ${debut} pour le début d'une journée et ${fin} pour la fin.
   - « aujourd'hui » : le jour de réception; « demain » : le jour ouvrable suivant;
   - « cette semaine » : du jour de réception jusqu'au vendredi de la même semaine;
   - « la semaine prochaine » : du lundi au vendredi de la semaine suivante;
   - un jour nommé seul désigne sa prochaine occurrence; « lundi prochain » : le lundi de la semaine suivante;
   - « d'ici vendredi » inclut le vendredi; « avant vendredi » s'arrête au jeudi; ces deux expressions commencent au jour de réception;
   - « matin » : de 09:00 à 12:00; « après-midi » : de 12:00 à 17:00; « fin de journée » : de 15:00 à 17:00.
   Si le courriel ne donne aucune contrainte de date (par exemple « dès que possible » ou « un de ces jours »), mets null aux deux.
6. Si estReunion vaut false, mets sujet, dureeMinutes, fenetreDebut et fenetreFin à null, et participants à une liste vide.`;

  const message = `Date de réception : ${dateAvecJour(c.date)}
De : ${nomDe(c.de, ctx)}
À : ${c.a.map((a) => nomDe(a, ctx)).join(", ")}
Objet : ${c.objet}

${c.corps}`;

  return { systeme, message };
}

export const SCHEMA_ANALYSE = {
  type: "OBJECT",
  properties: {
    estReunion: { type: "BOOLEAN" },
    sujet: { type: "STRING", nullable: true },
    participants: { type: "ARRAY", items: { type: "STRING" } },
    dureeMinutes: { type: "INTEGER", nullable: true },
    fenetreDebut: { type: "STRING", nullable: true, description: "AAAA-MM-JJTHH:MM" },
    fenetreFin: { type: "STRING", nullable: true, description: "AAAA-MM-JJTHH:MM" },
  },
  required: ["estReunion", "sujet", "participants", "dureeMinutes", "fenetreDebut", "fenetreFin"],
  propertyOrdering: ["estReunion", "sujet", "participants", "dureeMinutes", "fenetreDebut", "fenetreFin"],
};

// --- Interprétation de la réponse d'un participant à une invitation ---

export function promptReponse(c: CourrielRecu, ctx: ContexteReponse): { systeme: string; message: string } {
  const systeme = `Tu lis la réponse d'un participant à une invitation de réunion et tu la classes dans un des trois types suivants :
- acceptation : le participant confirme qu'il sera présent;
- refus : le participant ne pourra pas être présent et ne propose aucun autre moment;
- deplacement : le participant demande un autre moment ou en propose un, même s'il refuse le moment prévu.

Si le type est deplacement et qu'un moment précis est mentionné, donne fenetreDebut et fenetreFin au format AAAA-MM-JJTHH:MM, calculées à partir de la date de la réponse : un jour nommé seul désigne sa prochaine occurrence; « matin » : de 09:00 à 12:00; « après-midi » : de 12:00 à 17:00; « fin de journée » : de 15:00 à 17:00; une journée entière : de 09:00 à 17:00. Sinon, mets null aux deux.`;

  const message = `Réunion : ${ctx.sujet}
Moment prévu : ${formaterCreneau(ctx.creneau)}
Date de la réponse : ${dateAvecJour(c.date)}
De : ${c.de}

${c.corps}`;

  return { systeme, message };
}

export const SCHEMA_REPONSE = {
  type: "OBJECT",
  properties: {
    type: { type: "STRING", format: "enum", enum: ["acceptation", "refus", "deplacement"] },
    fenetreDebut: { type: "STRING", nullable: true, description: "AAAA-MM-JJTHH:MM" },
    fenetreFin: { type: "STRING", nullable: true, description: "AAAA-MM-JJTHH:MM" },
  },
  required: ["type", "fenetreDebut", "fenetreFin"],
  propertyOrdering: ["type", "fenetreDebut", "fenetreFin"],
};
