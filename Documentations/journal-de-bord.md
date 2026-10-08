# Journal de bord — INF 5114, assistant de planification de réunions

Ce journal garde la trace de tout ce qui servira au rapport de mi-parcours (semaine 7) et au rapport final (semaine 11) : le besoin, ce que l'application règle, les décisions, les problèmes rencontrés et leurs solutions, les prompts et les résultats de tests.

## 1. Besoin comblé

Dans une PME de 4 à 5 employés sans adjoint administratif, les demandes de réunion arrivent par courriel, mêlées au reste du courrier. Chacun doit les repérer, comparer les agendas à la main et envoyer les invitations. C'est lent et source d'erreurs : demandes oubliées, conflits d'horaire, participants omis.

## 2. Ce que l'application règle

| Problème | Ce que fait l'assistant | État |
|---|---|---|
| Demandes de réunion perdues dans les courriels | Surveille la boîte de réception et détecte les demandes (Gemini) | À faire |
| Relecture manuelle pour trouver qui, quoi, quand | Extrait sujet, participants, durée et contraintes de date (Gemini, JSON) | À faire |
| Comparaison manuelle des agendas | Trouve le premier créneau commun libre (code déterministe) | À faire |
| Envoi manuel des invitations | Ajoute le rendez-vous et envoie l'invitation après confirmation | À faire |
| Suivi des réponses et replanification | Suivi automatique facultatif, choisi à la confirmation | À faire |

## 3. Décisions

| Date | Décision | Raison |
|---|---|---|
| 2026-10-08 | Projet 100 % autonome, sans lien avec le projet d'INF1430 | Autre cours, autre projet; évite le chevauchement signalé par le professeur |
| 2026-10-08 | Données entièrement fictives (PME « Atelier Boréal ») | Confidentialité; aucune donnée réelle envoyée à Gemini |
| 2026-10-08 | Gemini, niveau gratuit | Suffisant pour le projet, sans coût |
| 2026-10-08 | Gemini fait la compréhension, le code fait la recherche de créneau | Résultat vérifiable et testable |
| 2026-10-08 | Confirmation de l'utilisateur avant tout envoi | Une erreur du modèle ne doit pas partir sans contrôle |
| 2026-10-08 | Suivi automatique des réponses choisi réunion par réunion | L'utilisateur garde le contrôle; jamais activé par défaut |
| 2026-10-08 | Node.js avec TypeScript, version légère | Même type de codage que mes projets précédents |
| 2026-10-08 | Dépôt Git public, une seule branche | Garder le projet simple |

## 4. Problèmes rencontrés et solutions

| Date | Problème | Solution | État |
|---|---|---|---|
| 2026-10-08 | Portée initiale trop large (« assistant de planification ») | Portée réduite à 6 fonctionnalités précises, avec une liste de limites | Réglé |
| 2026-10-08 | Risque de chevauchement avec INF1430 | Projet limité à l'avant-réunion; aucune transcription ni historique | Réglé |
| 2026-10-08 | Le suivi automatique alourdit le projet | Borné à 3 types de réponse et 2 replanifications; développé en dernier (semaines 8-9) | Réglé |

## 5. Prompts

À remplir à partir de la semaine 6 : chaque version de prompt, ce qui a changé et pourquoi.

## 6. Résultats de tests

| Date | Test | Résultat |
|---|---|---|
| 2026-10-08 | Validation des données fictives (`npm run verifier-donnees`) | 5 utilisateurs, 40 événements, 30 courriels (20 demandes, 10 sans rapport) : données valides |

À ajouter : pour chaque essai avec Gemini, la version du prompt et les métriques (détection, extraction, créneaux, temps).

## 7. Séances de travail

### 2026-10-08

- Plan de projet rédigé (Travail 1).
- Squelette Node.js/TypeScript créé dans `Projet/`.
- Données fictives créées : 5 utilisateurs, 40 événements de calendrier, 30 courriels, chacun avec son résultat attendu.
- Script de validation des données écrit et exécuté sans erreur.
- À faire ensuite : créer les 10 réponses fictives de participants, écrire la recherche de créneaux, puis le premier prompt Gemini.
